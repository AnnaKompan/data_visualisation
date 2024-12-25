const svg = d3.select("svg");
const margin = {
  top: 80,
  right: 100,
  bottom: 90,
  left: 90,
};

const width = +svg.attr("width");
const height = +svg.attr("height");
const columns = ["sepal length", "sepal width", "petal length", "petal width"];

const colorScale = d3
  .scaleOrdinal()
  .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
  .range(["red", "blue", "green"]);

const transition = (g) => g.transition().duration(300);

const render = (data) => {
  const title = "Parallel coordinates";

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scalePoint().domain(columns).range([0, innerWidth]);

  const yScale = d3.scaleLinear().domain([0, 8]).range([innerHeight, 0]);

  const yAxis = d3.axisLeft().scale(yScale).tickPadding(8).tickSize(5);

  const generatePath = (d) =>
    d3.line()(columns.map((col) => [xScale(col), yScale(d[col])]));

  const generatePathMove = (d) =>
    d3.line()(columns.map((col) => [correctPosition(col), yScale(d[col])]));
  const pathG = g
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("d", (d) => generatePath(d))
    .attr("stroke", (d) => colorScale(d.class))
    .attr("fill", "none")
    .attr("opacity", 0.3)
    .attr("stroke-width", 2);

  const axisG = g
    .selectAll("g.axes")
    .data(columns)
    .enter()
    .append("g")
    .attr("class", "axes")
    .each(function () {
      d3.select(this).call(yAxis);
    })
    .attr("transform", (d) => `translate(${xScale(d)},0)`);

  let position = {};

  const correctPosition = (col) => {
    return position[col] == null ? xScale(col) : position[col];
  };

  const dragged = (col, event) => {
    position[col] = Math.min(innerWidth + 30, Math.max(-30, event.x));
    columns.sort((p, q) => correctPosition(p) - correctPosition(q));

    xScale.domain(columns);
    pathG.attr("d", (d) => generatePathMove(d));
    axisG.attr("transform", (col) => `translate(${correctPosition(col)},0)`);
  };

  const dragended = (col) => {
    delete position[col];
    transition(pathG).attr("d", (d) => generatePath(d));
    transition(axisG).attr(
      "transform",
      (col) => "translate(" + xScale(col) + ",0)"
    );
  };

  axisG.call(
    d3
      .drag()
      .subject(function (d) {
        return { x: xScale(d) };
      })
      .on("drag", (event, d) => dragged(d, event))
      .on("end", (d) => dragended(d))
  );

  axisG
    .on("mouseover", function () {
      d3.select(this).style("cursor", "grab");
    })
    .on("mouseout", function () {
      d3.select(this).style("cursor", "default");
    });

  axisG
    .append("text")
    .attr("fill", "#635f5d")
    .attr("font-size", 23)
    .attr("transform", `translate(0, ${innerHeight})`)
    .attr("class", "axis-label")
    .attr("y", 20)
    .attr("x", 10)
    .attr("text-anchor", "middle")
    .text((d) => d);

  g.append("text")
    .attr("class", "title")
    .attr("y", -20)
    .attr("x", innerWidth / 2)
    .attr("text-anchor", "middle")
    .text(title);
};

d3.csv("./iris.csv").then((data) => {
  data.forEach((d) => {
    d["sepal length"] = +d["sepal length"];
    d["sepal width"] = +d["sepal width"];
    d["petal length"] = +d["petal length"];
    d["petal width"] = +d["petal width"];
  });
  render(data);
});
