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

d3.json('./assets/data/minneapolis-precincts-results.geo.json', function(
  error,
  geoData
) {
  // Scales for mayor
  let precentDomain = [1, 15];
  let mayorScales = {
    'Jacob Frey': d3
      .scaleLinear()
      .domain(precentDomain)
      // Pinks
      .range(['#fa9fb5', '#c51b8a']),
    'Betsy Hodges': d3
      .scaleLinear()
      .domain(precentDomain)
      // Greens
      .range(['#a1d99b', '#31a354']),
    'Nekima Levy-Pounds': d3
      .scaleLinear()
      .domain(precentDomain)
      // Oranges
      .range(['#fdae6b', '#e6550d']),
    'Tom Hoch': d3
      .scaleLinear()
      .domain(precentDomain)
      // Purple
      .range(['#bcbddc', '#756bb1']),
    'Raymond Dehn': d3
      .scaleLinear()
      .domain(precentDomain)
      // Greys
      .range(['#bdbdbd', '#636363'])
  };

  drawPrecinctMap(
    geoData,
    '#minneapolis-mayor-rank-1',
    'MN-27-200-43000',
    0,
    mayorScales
  );
  drawPrecinctMap(
    geoData,
    '#minneapolis-mayor-rank-2',
    'MN-27-200-43000',
    1,
    mayorScales
  );
  drawPrecinctMap(
    geoData,
    '#minneapolis-mayor-rank-3',
    'MN-27-200-43000',
    2,
    mayorScales
  );

  drawLegends('.mayor-legends', mayorScales);
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

  featureGroup
    .selectAll('path')
    .data(geoData.features)
    .enter()
    .append('path')
    .attr('d', path)
    .style('fill', d => {
      let mayor = _.find(d.properties.contests, {
        contestID: contest
      });
      let candidates = _.sortBy(
        mayor.ranks[rank].candidates,
        'votes'
      ).reverse();

      if (candidates[0].votes > 0 && scales[candidates[0].candidateName]) {
        console.log(candidates[0].percent - candidates[1].percent);
        return scales[candidates[0].candidateName](
          candidates[0].percent - candidates[1].percent
        );
      }
    })
    .classed('precinct', true);
}
