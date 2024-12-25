const svg = d3.select("#plot");
const width = window.innerWidth;
const height = window.innerHeight;
const margin = {
  left: 120,
  right: 30,
  top: 10,
  bottom: 50,
};
const innerSize = height - margin.top - margin.bottom;
svg
  .attr("height", innerSize + margin.top + margin.bottom)
  .attr("width", innerSize + margin.left + margin.right);

let selectedData = [];
const render = (data) => {
  const features = [
    "sepal length",
    "sepal width",
    "petal length",
    "petal width",
  ];
  const columnsLength = features.length;

  const padding = 10;
  const plotsSize = innerSize / columnsLength;
  const plotsPosition = d3
    .scalePoint()
    .domain(features)
    .range([0, innerSize - plotsSize]);

  const colorScale = d3
    .scaleOrdinal()
    .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
    .range(["red", "blue", "green"]);

  const xAxisLabel = svg
    .selectAll(".x-axis-label")
    .data(features)
    .enter()
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", (d) => plotsPosition(d) + plotsSize / 2)
    .attr("y", innerSize + margin.top + 10)
    .text((d) => d)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "black");

  for (let i in features) {
    for (let j in features) {
      const featureA = features[i];
      const featureB = features[j];

      const xScale = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d[featureA]))
        .nice()
        .range([0, plotsSize - 2 * padding]);
      const yScale = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d[featureB]))
        .nice()
        .range([plotsSize - 2 * padding, 0]);

      if (featureA === featureB) {
        const histogramG = svg
          .append("g")
          .attr(
            "transform",
            `translate(${plotsPosition(featureA) + padding + 10},${
              plotsPosition(featureB) + padding
            })`
          );

        histogramG
          .append("g")
          .attr("transform", `translate(0,${plotsSize - padding * 2})`)
          .call(d3.axisBottom(xScale).ticks(5));

        const binsNumber = 10;

        const histogram = d3
          .histogram()
          .value((d) => d[featureA])
          .domain(xScale.domain())
          .thresholds(
            d3.range(
              xScale.domain()[0],
              xScale.domain()[1],
              (xScale.domain()[1] - xScale.domain()[0]) / binsNumber
            )
          );

        const bins = histogram(data);

        const yScaleHistogram = d3
          .scaleLinear()
          .domain([0, d3.max(bins, (d) => d.length)])
          .range([plotsSize - 2 * padding, 0]);

        const yScale = d3
          .scaleLinear()
          .range([plotsSize - 2 * padding, 0])
          .domain([0, d3.max(bins, (d) => d.length)]);

        const histogramRect = histogramG
          .append("g")
          .selectAll("rect")
          .data(bins)
          .enter()
          .append("rect")
          .attr("x", 1)
          .attr(
            "transform",
            (d) => `translate(${xScale(d.x0)},${yScale(d.length)})`
          )
          .attr("width", (d) => xScale(d.x1) - xScale(d.x0))
          .attr("height", (d) => plotsSize - 2 * padding - yScale(d.length))
          .style("fill", "grey")
          .attr("stroke", "white");

        histogramG
          .append("g")
          .call(d3.axisLeft(yScaleHistogram).ticks(5))
          .append("text")
          .attr("x", plotsSize / 2)
          .attr("y", padding)
          .attr("dy", "12px")
          .attr("text-anchor", "middle")
          .text(featureA)
          .style("font-size", "13px")
          .style("fill", "black");
      } else {
        const brush = d3
          .brush()
          .on("end", brushed(featureA, featureB, data, xScale, yScale));

        const scatterPlot = svg
          .append("g")
          .attr(
            "transform",
            `translate(${plotsPosition(featureA) + 20},${
              plotsPosition(featureB) + 10
            })`
          );

        scatterPlot
          .append("g")
          .attr("transform", `translate(0,${plotsSize - 20})`)
          .call(d3.axisBottom(xScale).ticks(5));
        scatterPlot.append("g").call(d3.axisLeft(yScale).ticks(7));

        scatterPlot.append("g").attr("class", "brush").call(brush);

        scatterPlot
          .selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("cx", (d) => xScale(d[featureA]))
          .attr("class", "dots")
          .attr("cy", (d) => yScale(d[featureB]))
          .attr("r", 3)
          .attr("fill", (d) => {
            return selectedData.includes(d) ? colorScale(d.class) : "grey";
          });
      }
    }
  }
};
d3.csv("./iris.csv").then((data) => {
  const columnNames = Object.keys(data[0]);
  columnNames.pop();
  data.forEach((d) => {
    columnNames.forEach((col) => {
      d[col] = +d[col];
    });
  });
  data.pop();
  selectedData = data;
  render(data);
});

function brushed(featureA, featureB, data, xScale, yScale) {
  return function () {
    const selection = d3.event.selection;
    selectedData = data.filter((d) => {
      const xValue = xScale(d[featureA]);
      const yValue = yScale(d[featureB]);
      return (
        xValue >= selection[0][0] &&
        xValue <= selection[1][0] &&
        yValue >= selection[0][1] &&
        yValue <= selection[1][1]
      );
    });

    svg.selectAll("*").remove();
    render(data);
  };
}
