/**
 * Main JS file for project.
 */

// Define globals that are added through the config.json file, here like this:
/* global _, d3 */
'use strict';

// Dependencies
import utilsFn from './utils.js';

// Import local ES6 modules like this:
//import utilsFn from './utils.js';

// Or import libraries installed with npm like this:
// import module from 'module';

// Setup utils function
utilsFn({});

let q = d3.queue();
q.defer(d3.json, './assets/data/minneapolis-precincts-results.geo.json');
q.defer(d3.json, './assets/data/st-paul-precincts-results.geo.json');
q.await(function(error, minneapolisPrecincts, stPaulPrecincts) {
  // Scales for mayor
  let minneapolisDomain = [1, 15];
  let minneapolisMayorScales = {
    'Jacob Frey': d3
      .scaleLinear()
      .domain(minneapolisDomain)
      // Pinks
      .range(['#fa9fb5', '#c51b8a']),
    'Betsy Hodges': d3
      .scaleLinear()
      .domain(minneapolisDomain)
      // Greens
      .range(['#a1d99b', '#31a354']),
    'Nekima Levy-Pounds': d3
      .scaleLinear()
      .domain(minneapolisDomain)
      // Oranges
      .range(['#fdae6b', '#e6550d']),
    'Tom Hoch': d3
      .scaleLinear()
      .domain(minneapolisDomain)
      // Purple
      .range(['#bcbddc', '#756bb1']),
    'Raymond Dehn': d3
      .scaleLinear()
      .domain(minneapolisDomain)
      // Greys
      .range(['#bdbdbd', '#636363'])
  };

  // Scales for mayor
  let stPaulDomain = [1, 25];
  let stPaulMayorScales = {
    'Melvin Carter': d3
      .scaleLinear()
      .domain(stPaulDomain)
      // Pinks
      .range(['#fa9fb5', '#c51b8a']),
    'Pat Harris': d3
      .scaleLinear()
      .domain(stPaulDomain)
      // Greens
      .range(['#a1d99b', '#31a354']),
    'Dai Thao': d3
      .scaleLinear()
      .domain(stPaulDomain)
      // Oranges
      .range(['#fdae6b', '#e6550d'])
  };

  drawPrecinctMap(
    minneapolisPrecincts,
    '#minneapolis-mayor-rank-1',
    'MN-27-200-43000',
    0,
    minneapolisMayorScales
  );
  drawPrecinctMap(
    minneapolisPrecincts,
    '#minneapolis-mayor-rank-2',
    'MN-27-200-43000',
    1,
    minneapolisMayorScales
  );
  drawPrecinctMap(
    minneapolisPrecincts,
    '#minneapolis-mayor-rank-3',
    'MN-27-200-43000',
    2,
    minneapolisMayorScales
  );

  drawLegends('.minneapolis-mayor-legends', minneapolisMayorScales);

  drawPrecinctMap(
    stPaulPrecincts,
    '#st-paul-mayor-rank-1',
    'MN-62-200-58000',
    0,
    stPaulMayorScales
  );

  drawLegends('.st-paul-mayor-legends', stPaulMayorScales);
});

// Draw legends
function drawLegends(containerElement, scales) {
  _.each(scales, (scale, title) => {
    var svg = d3.select(containerElement).append('svg');

    svg
      .append('g')
      .attr('class', 'legend-group')
      .attr('transform', 'translate(20,20)');

    let legend = d3
      .legendColor()
      .labelFormat(d3.format('.2f'))
      .title(title)
      .titleWidth(100)
      .scale(scale);

    svg.select('.legend-group').call(legend);
  });
}

// Draw a map
function drawPrecinctMap(geoData, elementSelector, contest, rank, scales) {
  // Container
  let container = d3.select(elementSelector);
  let width = parseFloat(container.style('width'));
  let height = parseFloat(container.style('height'));
  let canvas = container
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Project and path
  let centroid = d3.geoCentroid(geoData);
  let projection = d3
    .geoMercator()
    .scale(1000)
    .translate([width / 2, height / 2]);

  let path = d3.geoPath().projection(projection);

  // Feature group
  let featureGroup = canvas.append('g');

  // Fit bounds to projection
  let bounds = path.bounds(geoData);
  featureGroup.attr(
    'transform',
    'translate(' +
      projection.translate() +
      ') ' +
      'scale(' +
      0.95 /
        Math.max(
          (bounds[1][0] - bounds[0][0]) / width,
          (bounds[1][1] - bounds[0][1]) / height
        ) +
      ') ' +
      'translate(' +
      -(bounds[1][0] + bounds[0][0]) / 2 +
      ',' +
      -(bounds[1][1] + bounds[0][1]) / 2 +
      ')'
  );

  // Tooltip
  let tooltip = d3
    .tip()
    .attr('class', 'tooltip')
    .html(function(d) {
      let p = d.properties;
      let relevantContest = _.find(p.contests, {
        contestID: contest
      });
      let candidates = _.sortBy(
        relevantContest.ranks[rank].candidates,
        'votes'
      ).reverse();

      let output = [
        p.precinctName,
        'Ward: ' + p.wardName,
        relevantContest.contestName + ' (' + (rank + 1) + ' choice)',
        'Total votes: ' + relevantContest.precinctVotes,
        ''
      ];

      _.each(_.take(candidates, 5), c => {
        output.push(c.candidateName + ': ' + c.votes + ' (' + c.percent + '%)');
      });

      return output.join(' <br> ');
    });
  featureGroup.call(tooltip);

  // Put together
  featureGroup
    .selectAll('path')
    .data(geoData.features)
    .enter()
    .append('path')
    .attr('d', path)
    .style('fill', d => {
      let relevantContest = _.find(d.properties.contests, {
        contestID: contest
      });
      let candidates = _.sortBy(
        relevantContest.ranks[rank].candidates,
        'votes'
      ).reverse();

      if (candidates[0].votes > 0 && scales[candidates[0].candidateName]) {
        return scales[candidates[0].candidateName](
          candidates[0].percent - candidates[1].percent
        );
      }
    })
    .classed('precinct', true)
    .on('mouseover', tooltip.show)
    .on('mouseout', tooltip.hide);
}
