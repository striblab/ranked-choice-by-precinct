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

// Sets to make
let sets = [
  { filename: 'minneapolis-precincts-results.geo.json', mcd: '43000' },
  { filename: 'st-paul-precincts-results.geo.json', mcd: '58000' }
];
_.each(sets, makeSet);

// Make a set
function makeSet(set) {
  // Filter and parse to Minneapolis
  let setResults = _.map(
    _.filter(results, r => {
      return r[5] === set.mcd;
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
  let setPrecints = _.map(
    _.filter(precincts.features, f => {
      return f.properties.MCDFIPS === set.mcd;
    }),
    f => {
      // Match with results
      let results = _.filter(setResults, r => {
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
  setPrecints = {
    type: 'FeatureCollection',
    features: setPrecints
  };

  // Output
  console.error('Writing: ' + set.filename);
  fs.ensureDirSync(path.join(__dirname, '..', 'build'));
  fs.writeFileSync(
    path.join(__dirname, '..', 'build', set.filename),
    JSON.stringify(setPrecints)
  );
}

// Find rank from contest name
function findRank(name) {
  let m = name.match(/\s([0-9a-z]*)\schoice/i);
  if (m) {
    return { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6 }[
      m[1]
    ];
  }
}
