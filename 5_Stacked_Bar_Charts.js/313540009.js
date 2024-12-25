// create comment to remind to interact with bar chart
let comment = d3.select(".comment-box").append("h2").attr("class", "comment");
//create text for animation
const dataText = [
  "Hover on the bar chart to see score value for each category.",
];
// typeWriter with text(dataText) and index to start from first letter
function typeWriter(text, i = 0) {
  //update h2 with letters/words i+1
  comment.html(text.substring(0, i + 1));
  //then calling again with next letter
  setTimeout(() => typeWriter(text, i + 1), 100);
}
// }
//start animation function, with start typing functionality(typeWriter)
// and restart of animation after 20 seconds
function startAnimation(i = 0) {
  typeWriter(dataText[i]);
  setTimeout(() => startAnimation(i), 20000);
}
startAnimation();
// adding tooltip and set display none initially
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("display", "none")
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "solid 2px")
  .style("border-radius", "5px")
  .style("padding", "5px");
//create svg for stacked bar charts to be rendered
const svg = d3.select("svg");
//getting width from svg in DOM
const width = +svg.attr("width");
//setting margins needed for right plotting area and better visibility
const margin = {
  top: 60,
  right: 30,
  bottom: 75,
  left: 300,
};
//create score group,an array that has keys for different categories of scores
const score_group = [
  "scores_teaching",
  "scores_research",
  "scores_citations",
  "scores_industry_income",
  "scores_international_outlook",
];
// color scale for stacked bar charts to represent different score category
const colorScale = d3
  .scaleOrdinal()
  .domain(score_group)
  .range(["#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#e91e63"]);
//scoreSumItems is to calculate sum of scores for each university
const scoreSumItems = (item) => {
  //destructure to get each category from item/university
  const {
    scores_teaching,
    scores_research,
    scores_citations,
    scores_industry_income,
    scores_international_outlook,
  } = item;
  // sum up each score for total score sum
  const scoresSum =
    parseFloat(scores_teaching) +
    parseFloat(scores_research) +
    parseFloat(scores_citations) +
    parseFloat(scores_industry_income) +
    parseFloat(scores_international_outlook);
  //return object with sum of scores and all item categories
  return {
    scoresSum,
    ...item,
  };
};
// below is dropdownmenu functionality, with selection where will be dropdown
//and props with options with array of options and callback funtion onOptionClicked
const dropdownMenu = (selection, props) => {
  const { options, onOptionClicked } = props;

  let select = selection.selectAll("select").data([null]);
  //data binding for select
  select = select.on("change", function () {
    onOptionClicked(this.value);
  });
  //data binding for option
  const option = select.selectAll("option").data(options);
  option.attr("value", (d) => d);
};
//render charts functionality using data, sortkey(scoresSum)
//and sortType(ascend/descend)
const render = (data, sortKey, sortType) => {
  // clear previous plot before rendering new
  svg.selectAll(".plot").remove();
  //sort data ascending or descending, by comparing 2 data a and b
  const sortedData = data.sort((a, b) => {
    if (sortType == "ascending") {
      return d3.ascending(a[sortKey], b[sortKey]);
    } else {
      return d3.descending(a[sortKey], b[sortKey]);
    }
  });
  //to get universities names from sortedData
  const sortedNames = sortedData.map((d) => d.name);
  //set width//height for plot
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = sortedNames.length * 25 + margin.top + margin.bottom;
  svg.attr("height", innerHeight);
  //setting x and y scale for axes
  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(sortedData, (d) => d.scoresSum) * 1.1])
    .range([0, innerWidth]);
  const yScale = d3
    .scaleBand()
    .domain(sortedNames)
    .range([0, innerHeight - margin.top - margin.bottom])
    .padding(0.2);
  //define x and y axes based on xScale/yScale
  const yAxis = d3.axisLeft(yScale).tickSizeInner(10);
  const xAxis = d3.axisTop(xScale).ticks(10);
  //adding group of elements to plot
  const g = svg
    .append("g")
    .attr("class", "plot")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  //draw y and x axis
  const yAxisG = g
    .append("g")
    .attr("class", "y-axis-group")
    .call(yAxis)
    .call((g) => g.selectAll(".domain").remove());
  const xAxisG = g.append("g").attr("class", "x-axis-group").call(xAxis);
  // add "Score" title above x axis
  xAxisG
    .append("text")
    .attr("class", "x-axis-label")
    .attr("y", -40)
    .attr("x", innerWidth / 2)
    .attr("fill", "#635f5d")
    .attr("font-size", "19px")
    .text("Score");
  // create stacked charts, with keys(score categories)
  //and values(convert to number)
  const stackGenerator = d3
    .stack()
    .keys(score_group)
    .value((d, key) => +d[key]);
  //define stackedData to be sorted according to ascend/descend
  const stackedData = stackGenerator(sortedData);
  //add tooltip to be displayed on bars
  const mouseover = function () {
    tooltip.style("display", "block");
    d3.select(this).style("opacity", 0.7);
  };
  //format toltip info and to be decimal,add key (category) and value
  const mousemove = function (event, d) {
    const formatter = d3.format(",.2f");
    const key = d3.select(this.parentNode).datum().key;
    const value = d[1] - d[0];
    // add text what should be diplayed and
    //set tooltip position according to mouse cursor position
    tooltip
      .html(`<strong>${d.data.name}</strong><br/>${key}: ${formatter(value)}`)
      .style("top", event.pageY - 50 + "px")
      .style("left", event.pageX + 10 + "px");
  };
  //on leave, set tooltip back to display none
  //and remove highlight from selected category
  const mouseleave = function () {
    tooltip.style("display", "none");
    d3.select(this).style("opacity", 1);
  };
  //render stacked bars based on previously set colorScale, stackedData for each category
  //add rect for bars, render x/y axes, and add eventlistener
  g.append("g")
    .attr("class", "stackedBar")
    .selectAll("g")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("fill", (d) => colorScale(d.key))
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("y", (d) => yScale(d.data.name))
    .attr("x", (d) => xScale(d[0]))
    .attr("width", (d) => xScale(d[1]) - xScale(d[0]))
    .attr("height", yScale.bandwidth())
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
};
//load data from data.csv
d3.csv("data.csv").then((data) => {
  //Remove data where rank is 'Reporter',to show only universities
  let filteredData = data
    .filter((d) => d.rank !== "Reporter")
    .map(scoreSumItems);
  //select menu for sorting, sortKeyEl for categories, sortTypeEl for ascend/descend
  let sortKeyEl = d3.select("#score_criterion_menu");
  let sortTypeEl = d3.select("#ascend_descend_menu");
  //set initial sort category and order
  let sortKey = "scoresSum";
  let sortType = "descending";
  //and draw bars with data, initial categoreand order
  render(filteredData, sortKey, sortType);
  //bind eventlistener for sorting by categiry and ascend/descend
  sortKeyEl.on("change", function () {
    sortKey = this.value;
    render(filteredData, sortKey, sortType);
  });
  sortTypeEl.on("change", function () {
    sortType = this.value;
    render(filteredData, sortKey, sortType);
  });
});
