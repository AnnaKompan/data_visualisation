d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("display", "none")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "2px")
  .style("border-radius", "5px")
  .style("padding", "5px");

const columns = [
  "length",
  "diameter",
  "height",
  "whole_weight",
  "shucked_weight",
  "viscera_weight",
  "shell_weight",
  "rings",
];

const render = (data, svg, title) => {
  const correlations = jz.arr.correlationMatrix(data, columns);
  const extent = d3.extent(correlations.map((d) => d.correlation));
  const grid = data2grid.grid(correlations);
  const rows = columns.length;
  const margin = {
    top: 30,
    bottom: 30,
    left: 120,
    right: 0,
  };
  const dimensions = d3.min([
    window.innerWidth * 0.6,
    window.innerHeight * 0.6,
  ]);
  const width = dimensions * 0.6;
  const height = dimensions * 0.6;

  svg = svg
    .attr("width", dimensions)
    .attr("height", dimensions)
    .append("g")
    .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

  svg
    .append("text")
    .text(title)
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("transform", "translate(" + 150 + ", " + -10 + ")");

  const padding = 0.05;
  const xScale = d3
    .scaleBand()
    .range([0, width])
    .paddingInner(padding)
    .domain(d3.range(1, rows + 1));
  const yScale = d3
    .scaleBand()
    .range([0, height])
    .paddingInner(padding)
    .domain(d3.range(1, rows + 1));

  const xAxis = d3.axisBottom(xScale).tickFormat((d, i) => columns[i]);
  const yAxis = d3.axisLeft(yScale).tickFormat((d, i) => columns[i]);

  const axisXcreated = svg
    .append("g")
    .attr("class", "x axis")
    .call(xAxis)
    .attr("transform", "translate(0, " + height + ")");

  axisXcreated
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-8px")
    .attr("dy", "8px")
    .attr("font-size", "14px")
    .attr("transform", "rotate(-45)");

  const axisYcreated = svg
    .append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .attr("font-size", "14px");

  const colorScale = d3
    .scaleSequential()
    .interpolator(d3.interpolateRainbow)
    .domain([-1, 1]);

  svg
    .selectAll("rect")
    .data(grid, (d) => d.col1 + d.col2)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.column))
    .attr("y", (d) => yScale(d.row))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .style("fill", (d) => colorScale(d.correlation))
    .style("opacity", 10);

  svg
    .selectAll("rect")
    .on("mouseover", function (d) {
      d3.select(this).classed("selected", true);
      const a = d3
        .select(".tooltip")
        .style("display", "block")
        .html(d.column_x + ", " + d.column_y + ": " + d.correlation.toFixed(2));
      const rowPosition = yScale(d.row);
      const colPosition = xScale(d.column);
      const tooltipPosition = d3
        .select(".tooltip")
        .node()
        .getBoundingClientRect();
      const tooltipWidth = tooltipPosition.width;
      const tooltipHeight = tooltipPosition.height;
      const gridPosition = svg.node().getBoundingClientRect();
      const gridLeft = gridPosition.left;
      const gridTop = gridPosition.top;

      const left = gridLeft + colPosition + margin.left;
      const top = gridTop + rowPosition + margin.top - tooltipHeight - 5;

      d3.select(".tooltip")
        .style("left", left + "px")
        .style("top", top + "px");

      svg
        .select(".x.axis .tick:nth-of-type(" + d.column + ") text")
        .classed("selected", true);
      svg
        .select(".y.axis .tick:nth-of-type(" + d.row + ") text")
        .classed("selected", true);
      svg
        .select(".x.axis .tick:nth-of-type(" + d.column + ") line")
        .classed("selected", true);
      svg
        .select(".y.axis .tick:nth-of-type(" + d.row + ") line")
        .classed("selected", true);
    })
    .on("mouseout", function () {
      svg.selectAll("rect").classed("selected", false);
      d3.select(".tooltip").style("display", "none");
      svg.selectAll(".axis .tick text").classed("selected", false);
      svg.selectAll(".axis .tick line").classed("selected", false);
    });
};

d3.text("./abalone.csv", function (text) {
  const data = d3.csvParseRows(text, (d) => {
    return {
      sex: d[0],
      length: +d[1],
      diameter: +d[2],
      height: +d[3],
      whole_weight: +d[4],
      shucked_weight: +d[5],
      viscera_weight: +d[6],
      shell_weight: +d[7],
      rings: +d[8],
    };
  });

  const dataMale = data.filter((d) => d["sex"] === "M");
  const dataFemale = data.filter((d) => d["sex"] === "F");
  const dataInfant = data.filter((d) => d["sex"] === "I");
  const svgMale = d3.select(".svgMale");
  const svgFemale = d3.select(".svgFemale");
  const svgInfant = d3.select(".svgInfant");

  render(dataMale, svgMale, "Male");
  render(dataFemale, svgFemale, "Female");
  render(dataInfant, svgInfant, "Infant");
});
