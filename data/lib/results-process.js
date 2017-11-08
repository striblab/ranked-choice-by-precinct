/**
 * Get results and match up to some geo json
 */

// Dependencies
const scv = require('d3-dsv').dsvFormat(';');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

// Inputs
let results = scv.parseRows(
  fs.readFileSync(
    path.join(__dirname, '..', 'sources', '2017-local-results-precincts.csv'),
    'utf-8'
  )
);

let precincts = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'sources', '2017-voting-preincts.geo.json'),
    'utf-8'
  )
);

// Filter and parse to Minneapolis
let minneapolisResults = _.map(
  _.filter(results, r => {
    return r[5] === '43000';
  }),
  f => {
    return {
      contestID: [f[0], f[1], f[3].substring(0, 3), f[5]].join('-'),
      candidateID: _.kebabCase(_.map(_.pick(f, [6, 7])).join('-')),
      precinctID: f[2],
      municipalID: f[5],
      contestName: f[4].replace(/\s([0-9a-z]*)\schoice/i, ''),
      candidateName: f[7],
      votes: parseInt(f[13], 10),
      percent: parseFloat(f[14]),
      precinctVotes: parseInt(f[15], 10),
      contestSubID: f[3],
      rank: findRank(f[4])
    };
  }
);

// Filter and parse preincts
let minneapolisPrecints = _.map(
  _.filter(precincts.features, f => {
    return f.properties.MCDFIPS === '43000';
  }),
  f => {
    // Match with results
    let results = _.filter(minneapolisResults, r => {
      return r.precinctID === f.properties.PCTCODE;
    });
    if (!results || !results.length) {
      return;
    }

    // Top level parts
    let parsed = {
      precinctName: f.properties.PCTNAME,
      precinctID: f.properties.PCTCODE,
      wardName: f.properties.WARD
    };

    // Group by contest
    parsed.contests = _.map(_.groupBy(results, 'contestID'), g => {
      return {
        contestID: g[0].contestID,
        contestName: g[0].contestName,
        precinctVotes: g[0].precinctVotes,
        ranks: _.map(_.groupBy(g, 'rank'), r => {
          return {
            rank: r[0].rank,
            candidates: _.map(r, c => {
              return {
                candidateName: c.candidateName,
                votes: c.votes,
                percent: c.percent
              };
            })
          };
        })
      };
    });

    f.properties = parsed;
    return f;
  }
);

// Geojson
minneapolisPrecints = {
  type: 'FeatureCollection',
  features: minneapolisPrecints
};

// Output
fs.ensureDirSync(path.join(__dirname, '..', 'build'));
fs.writeFileSync(
  path.join(__dirname, '..', 'build', 'minneapolis-precincts-results.geo.json'),
  JSON.stringify(minneapolisPrecints)
);

// Find rank from contest name
function findRank(name) {
  let m = name.match(/\s([0-9a-z]*)\schoice/i);
  if (m) {
    return { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6 }[
      m[1]
    ];
  }
}
