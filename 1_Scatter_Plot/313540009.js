const svg = d3.select("svg");

const width = +svg.attr("width");
const height = +svg.attr("height");

let xAxisValue = (d) => d.sepalLength;
let yAxisValue = (d) => d.petalWidth;
let xAxisLabel = "X Axis";
let yAxisLabel = "Y Axis";

const render = (data, xValue, yValue, xLabel, yLabel) => {
  const title = "Iris Flower";

  svg.selectAll("*").remove();

  const margin = {
    top: 60,
    right: 30,
    bottom: 88,
    left: 180,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xValue))
    .range([0, innerWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, yValue))
    .range([innerHeight, 0])
    .nice();

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xAxis = d3.axisBottom(xScale).tickSize(-innerHeight).tickPadding(15);

  const yAxis = d3.axisLeft(yScale).tickSize(-innerWidth).tickPadding(12);

  g.append("g").call(yAxis).select(".domain").remove();

  const yAxisG = g.append("g").call(yAxis);
  yAxisG.select(".domain").remove();

  yAxisG
    .append("text")
    .attr("class", "axis-label")
    .attr("y", -80)
    .attr("x", -innerHeight / 2)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text(yLabel)
    .attr("transform", `rotate(-90)`);

  const xAxisG = g
    .append("g")
    .call(xAxis)
    .attr("transform", `translate(0, ${innerHeight})`);
  xAxisG.select(".domain").remove();

  xAxisG
    .append("text")
    .attr("class", "axis-label")
    .attr("y", 75)
    .attr("x", innerWidth / 2)
    .attr("fill", "black")
    .text(xLabel);

  const colorScale = d3
    .scaleOrdinal()
    .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
    .range(["rgb(255, 0, 0)", "blue", "green"]);

  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cy", (d) => yScale(yValue(d)))
    .attr("cx", (d) => xScale(xValue(d)))
    .attr("r", 10)
    .attr("fill", (d) => colorScale(d.class));

  g.append("text")
    .attr("class", "title")
    .attr("y", -20)
    .attr("x", innerWidth / 2)
    .attr("text-anchor", "middle")
    .text(title);
};

const csv = d3.csv;
csv("./iris.csv").then((data) => {
  data.forEach((d) => {
    d.sepalLength = +parseFloat(d["sepal length"]);
    d.sepalWidth = +parseFloat(d["sepal width"]);
    d.petalLength = +parseFloat(d["petal length"]);
    d.petalWidth = +parseFloat(d["petal width"]);
    d.class = d["class"];
  });

  const columns = data.columns;

  const updatePlot = () => {
    render(data, xAxisValue, yAxisValue, xAxisLabel, yAxisLabel);
  };
  const dropdownMenu = (selection, props) => {
    const { options, onOptionClicked } = props;

    const filteredOptions = options.filter((option) => option !== "class");

    let select = selection.selectAll("select").data([null]);
    select = select
      .enter()
      .append("select")
      .merge(select)
      .on("change", function () {
        onOptionClicked(this.value);
      });

    const option = select.selectAll("option").data(filteredOptions);
    option
      .enter()
      .append("option")
      .merge(option)
      .attr("value", (d) => d)
      .text((d) => d);
  };

  d3.select("#xmenu").call(dropdownMenu, {
    options: columns,
    onOptionClicked: (column) => {
      if (column) {
        xAxisValue = (d) => d[column];
        xAxisLabel = column;
        updatePlot();
      }
    },
  });

  d3.select("#ymenu").call(dropdownMenu, {
    options: columns,
    onOptionClicked: (column) => {
      if (column) {
        yAxisValue = (d) => d[column];
        yAxisLabel = column;
        updatePlot();
      }
    },
  });

  updatePlot();
});
