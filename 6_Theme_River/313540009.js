// select svg where viz will be rendered
const svg = d3.select("svg");

// tooltip for plot to show price, house and date (set to hidden)
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden")
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "solid 2px")
  .style("border-radius", "5px")
  .style("padding", "5px");
// margins for viz
const margin = {
  top: 60,
  right: 50,
  bottom: 60,
  left: 50,
};
// set with and hight dimensions for viz (take from dom element "svg")
const width = +svg.attr("width");
const height = +svg.attr("height");
// set width and height for plotting area
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
// append g to svg and adjust position
const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
// loading csv and get data from it
d3.csv("data.csv").then(function (data) {
  // new data will save sale date and property types
  let newData = {};
  for (let i = 0; i < data.length; i++) {
    if (!(data[i]["saledate"] in newData)) {
      newData[data[i]["saledate"]] = {
        // organize structure of property category
        "house with 2 bedrooms": 0,
        "house with 3 bedrooms": 0,
        "house with 4 bedrooms": 0,
        "house with 5 bedrooms": 0,
        "unit with 1 bedrooms": 0,
        "unit with 2 bedrooms": 0,
        "unit with 3 bedrooms": 0,
      };
    }
    // assign date to property
    class_str = data[i]["type"] + " with " + data[i]["bedrooms"] + " bedrooms";
    newData[data[i]["saledate"]][class_str] = +data[i]["MA"];
  }
  // newdata2 will have array of data for vizualization
  let newData2 = [];

  const parseDate = d3.timeParse("%d/%m/%Y");
  // parse date from string to object and push to newData2
  for (const [key, value] of Object.entries(newData)) {
    value["date"] = parseDate(key);
    newData2.push(value);
  }
  // sort data by date
  newData2.sort(function (a, b) {
    return a["date"] - b["date"];
  });
  data = newData2;
  // get property types(keys)
  let keys = Object.keys(data[0]).slice(0, -1);
  // get property price for tooltip
  let propertyPrices = {};

  data.forEach((d) => {
    // For each date, store the prices for all property types
    keys.forEach((key) => {
      if (!propertyPrices[key]) {
        propertyPrices[key] = {};
      }
      propertyPrices[key][d.date] = d[key];
    });
  });

  // setting color for different property type
  const colorScale = d3
    .scaleOrdinal()
    .domain(keys)
    .range([
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
    ]);
  //get div from dom
  const propCategory = document.getElementById("property_container");
  // clear html for new sorting
  propCategory.innerHTML = "";
  // set elements to div(propCategory)
  let html = "";
  for (let i = 0; i < keys.length; i++) {
    html += `<div class="item_${i}">${keys[i]}</div>`;
  }
  // add to html
  propCategory.innerHTML = html;
  // set drag and drop functionality for  propCatefgory(div)
  let sortable = new Sortable(propCategory, {
    animation: 150,
    onChange: function (event) {
      let propCategory_divs = propCategory.getElementsByTagName("div");
      let keys = [];
      for (let i = 0; i < propCategory_divs.length; i++) {
        keys.push(propCategory_divs[i].textContent);
      }
      // rerender chart with new sorting keys
      render(keys);
    },
  });
  // first render of the chart
  render(keys);
  // render function of chart based on keys
  function render(keys) {
    // clear previous render for new
    svg.selectAll("*").remove();
    //  reverse keys order for stacked chart
    let new_keys = Array.from(keys).reverse();
    // set xscale (date)
    const xScale = d3
      .scaleLinear()
      .domain(
        d3.extent(data, function (d) {
          return d["date"];
        })
      )
      .range([0, innerWidth]);
    // xaxis where set tick size, number of ticks and format of date
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(8)
      .tickFormat(d3.utcFormat("%B %d, %Y"))
      .tickSize(-innerHeight);
    // append group to x
    const xAxisG = svg
      .append("g")
      .attr("transform", `translate(0, ${height * 0.8})`)
      .call(xAxis)
      .select(".domain")
      .remove();
    // style tickline
    svg.selectAll(".tick line").attr("stroke", "#c0c0bb");
    // add text below date
    const xAxisText = svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", innerWidth / 2)
      .attr("y", height - 80)
      .style("fill", "#635f5d")
      .style("font-size", "20px")
      .text("Date");
    // add yscale for y
    const yScale = d3
      .scaleLinear()
      .domain([-4000000, 4000000])
      .range([innerHeight, 0]);

    // set tooltip(mouseover, mousemove,mouseleave) to display property type,date and price for specific date
    const mouseover = function (event, d) {
      tooltip.style("visibility", "visible");
    };

    const mousemove = function (event, d) {
      const mouseX = d3.pointer(event)[0];
      const dateValue = xScale.invert(mouseX);

      const closestDate = data.reduce((prev, curr) => {
        return Math.abs(curr.date - dateValue) < Math.abs(prev.date - dateValue)
          ? curr
          : prev;
      });

      const price = propertyPrices[d.key][closestDate.date];

      const formattedPrice = `$${price.toLocaleString()}`;

      tooltip.html(
        `<strong>Property:</strong> ${d.key}<br>
     <strong>Date:</strong> ${closestDate.date.toDateString()}<br>
     <strong>Price:</strong> ${formattedPrice}`
      );
      tooltip
        .style("top", event.pageY - 50 + "px")
        .style("left", event.pageX + 10 + "px");
    };
    const mouseleave = function (event, d) {
      tooltip.style("visibility", "hidden");
    };
    // set and render area for chart using a stacked layout (streamgraph)
    const area = d3
      .area()
      .x(function (d) {
        return xScale(d.data["date"]);
      })
      .y0(function (d) {
        const value = d[0] || 0;
        return yScale(value);
      })
      .y1(function (d) {
        const value = d[1] || 0;
        return yScale(value);
      });
    // use stramgraph from d3, stack data based on Property type
    let stackedData = d3
      .stack()
      .offset(d3.stackOffsetSilhouette)
      .keys(new_keys)(data);
    // add paths to svg and tooltip
    svg
      .selectAll("layers")
      .data(stackedData)
      .join("path")
      .style("fill", function (d) {
        return colorScale(d.key);
      })
      .attr("d", area)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
  }
});
