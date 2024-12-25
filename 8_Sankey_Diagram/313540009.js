// select svg from DOM
const svg = d3.select("#diagram");
// set with, height and margin
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = {
  top: 50,
  right: 50,
  bottom: 100,
  left: 50,
};
//set width and hight for plot
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
// set colors for each categorical attribute (several for different proportions)
const colorScales = {
  buying: ["#ff4d4d", "#ff1a1a", "#cc0000", "#990000"],
  maintenance: ["#ffcc00", "#ff9900", "#cc6600", "#993300"],
  doors: ["#cce5ff", "#66b3ff", "#0066cc"],
  persons: ["#d5f5e3", "#2ecc71", "#27ae60"],
  "luggage boot": ["#f2d7d5", "#e57373", "#c62828"],
  safety: ["#e8cfcf", "#d48dff", "#6a1b9a"],
};
// sankey function
d3.sankey = function () {
  //   properties and arrays
  let sankey = {},
    nodeWidth = 24,
    nodePadding = 8,
    size = [1, 1],
    nodes = [],
    links = [],
    attributeOrder = [];
  // method nodeWidth defined, it sets nodes width, takes single param(_)
  sankey.nodeWidth = function (_) {
    //   if no arguments, than nodeWidth
    if (!arguments.length) return nodeWidth;
    // set node width by converting val _ to num
    nodeWidth = +_;
    // after setting nodewidth, return sankey obj
    return sankey;
  };
  // same method for nodePadding
  sankey.nodePadding = function (_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };
  // same method for nodes

  sankey.nodes = function (_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };
  // same method for links
  sankey.links = function (_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };
  // same method for size
  sankey.size = function (_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };
  // layout comput functions (for nodes/links positioning)
  sankey.layout = function (iterations) {
    computeNodeLinks();
    computeNodeValues();
    //   horizontal pos of nodes (computeNodeBreadths)
    computeNodeBreadths();
    //   vertical pos of nodes (computeNodeDepths)
    computeNodeDepths(iterations);
    //   paths between nodes(computeLinkDepths)
    computeLinkDepths();
    //   color based on order (computeColorID)
    computeColorID();
    return sankey;
  };
  // determine how links are drawn
  sankey.relayout = function () {
    computeLinkDepths();
    return sankey;
  };
  // link function  for drawing links between nodes
  sankey.link = function () {
    const curvature = 0.5;
    // x0 and x1 - starting/ending x coordinates of links
    //   xi -interpolations between x0 and x1
    //   x2 and x3 - points for curve
    //  y0 and y1 - vertical position for source/target nodes
    function link(d) {
      const x0 = d.source.x + d.source.dx,
        x1 = d.target.x,
        xi = d3.interpolateNumber(x0, x1),
        x2 = xi(curvature),
        x3 = xi(1 - curvature),
        y0 = d.source.y + d.sy + d.dy / 2,
        y1 = d.target.y + d.ty + d.dy / 2;
      // return path string (M is starting point, C is control point)
      return (
        "M" +
        x0 +
        "," +
        y0 +
        "C" +
        x2 +
        "," +
        y0 +
        " " +
        x3 +
        "," +
        y1 +
        " " +
        x1 +
        "," +
        y1
      );
    }
    // shape of links connecting nodes
    link.curvature = function (_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };
  // compute links for each node
  function computeNodeLinks() {
    nodes.forEach(function (node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    //   iterate over each link to determine source and target link
    links.forEach(function (link) {
      const source = link.source,
        target = link.target;
      // if source/target is index "number" - replace with node obj from nodes arr
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      // add to arrayys
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }
  // calc value of each node
  function computeNodeValues() {
    nodes.forEach(function (node) {
      // calc max value and store in node source/target links
      node.value = Math.max(
        d3.sum(node.sourceLinks, value),
        d3.sum(node.targetLinks, value)
      );
    });
  }
  // horizontal position
  function computeNodeBreadths() {
    //   order of categoris
    attributeOrder = [
      "buying",
      "maintenance",
      "doors",
      "persons",
      "luggage boot",
      "safety",
    ];
    // filter nodes that start with that categorie name (attribute)
    attributeOrder.forEach(function (attribute, i) {
      const nodesForAttribute = nodes.filter(function (node) {
        return node.name.startsWith(attribute);
      });
      // x position and dx width
      nodesForAttribute.forEach(function (node) {
        node.x = i;
        node.dx = nodeWidth;
      });
    });
    // scale node position
    scaleNodeBreadths((size[0] - nodeWidth) / (attributeOrder.length - 1));
  }
  // // scale node position function
  function scaleNodeBreadths(kx) {
    //   kx is calculated based on width diagram and num of nodes groups (first at 0. second at 2**kx and so on)
    nodes.forEach(function (node) {
      node.x *= kx;
    });
  }
  // fucntion for vertical position of nodes fucntion
  function computeNodeDepths(iterations) {
    const nodesByBreadth = Array.from(
      d3.group(nodes, (d) => d.x).entries()
    ).map(([, values]) => values);
    initializeNodeDepth();
    resolveCollisions();
    for (let alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft((alpha *= 0.99));
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }
    function initializeNodeDepth() {
      const ky = d3.min(nodesByBreadth, function (nodes) {
        return (
          (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value)
        );
      });
      // set dy -vertical size of each link
      // set y -vertical pos of each node based on its index
      nodesByBreadth.forEach(function (nodes) {
        nodes.forEach(function (node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function (link) {
        link.dy = link.value * ky;
      });
    }
    // set y position of nodex, so that won't overlap
    //   alpha controls how much nodes move
    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function (nodes, breadth) {
        nodes.forEach(function (node) {
          if (node.targetLinks.length) {
            let y = d3.sum(node.targetLinks, weightedSource);
            d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });
      // calculates center pos of source node weighted by link.value
      function weightedSource(link) {
        return center(link.source) * link.value;
      }
    }
    // same to relaxLeftToRight
    function relaxRightToLeft(alpha) {
      nodesByBreadth
        .slice()
        .reverse()
        .forEach(function (nodes) {
          nodes.forEach(function (node) {
            if (node.sourceLinks.length) {
              let y =
                d3.sum(node.sourceLinks, weightedTarget) /
                d3.sum(node.sourceLinks, value);
              node.y += (y - center(node)) * alpha;
            }
          });
        });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }
    // to ensure nodes don't overlap vertically (adjust position by their height and padding)
    function resolveCollisions() {
      nodesByBreadth.forEach(function (nodes) {
        let node = 0;
        let dy = 0;
        let y0 = 0;
        let n = nodes.length;
        let i;

        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }
    // sort nodes based on y position
    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }
  // calculate starting/ending vertical position(sy/ty)
  function computeLinkDepths() {
    nodes.forEach(function (node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function (node) {
      let sy = 0,
        ty = 0;
      node.sourceLinks.forEach(function (link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function (link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }
  // assing colors based on name(attribute)
  function computeColorID() {
    attributeOrder.forEach(function (attribute) {
      const nodesForAttribute = nodes.filter(function (node) {
        return node.name.startsWith(attribute);
      });

      nodesForAttribute.sort((a, b) => a.y - b.y);
      nodesForAttribute.forEach((node, index) => {
        node.cid = index;
      });
    });
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};
// create sankey diagrma
const sankey = d3
  .sankey()
  .nodeWidth(10)
  .nodePadding(2)
  .size([innerWidth, innerHeight]);
// link generator (path)
const path = sankey.link();
// render with graph object(has nodes and links)
const render = (graph) => {
  let nodeMap = {};
  graph.nodes.forEach(function (x) {
    nodeMap[x.name] = x;
  });
  graph.links = graph.links.map(function (x) {
    return {
      source: nodeMap[x.source],
      target: nodeMap[x.target],
      value: x.value,
    };
  });
  // set nodes and links for diagram and compute layout for 32 iterations
  sankey.nodes(graph.nodes).links(graph.links).layout(32);
  const linkGroups = {};
  graph.links.forEach((link) => {
    const key = link.source.name + "-" + link.target.name;
    if (!linkGroups[key]) {
      linkGroups[key] = [];
    }
    linkGroups[key].push(link);
  });
  // const for group of links
  const band = svg
    .append("g")
    .selectAll(".band")
    .data(Object.values(linkGroups))
    .enter()
    .append("g")
    .attr("class", "band");
  // add links to bands
  const link = band
    .selectAll(".link")
    .data((d) => d)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("transform", function () {
      return `translate(${margin.left},${margin.top})`;
    })
    .attr("d", path)
    .style("stroke-width", function (d) {
      return Math.max(1, d.dy);
    })
    .sort(function (a, b) {
      return b.dy - a.dy;
    });
  // tooltip for links to show source/target node with link value (d.value)
  link.append("title").text(function (d) {
    return d.source.name + " → " + d.target.name + ": " + d.value;
  });
  // add titles for attributes
  svg
    .selectAll(".attribute-title")
    .data(graph.nodes.filter((d) => d.cid === 0))
    .enter()
    .append("text")
    .attr("class", "attribute-title")
    .attr("x", function (d) {
      return margin.left + d.x;
    })
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text(function (d) {
      return d.name.split("-")[0];
    });
  // crrate nodes (add group of nodes)
  const node = svg
    .append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function (d) {
      return `translate(${margin.left + d.x},${margin.top + d.y})`;
    })
    .call(
      d3
        .drag()
        .subject(function (d) {
          return d;
        })
        .on("start", function () {
          this.parentNode.appendChild(this);
        })
        .on("drag", dragmove)
    );
  // add rectangle to nodes
  node
    .append("rect")
    .attr("height", function (d) {
      return d.dy;
    })
    .attr("width", sankey.nodeWidth())
    .style("fill", function (d) {
      const colorScale = colorScales[d.name.split("-")[0]];
      return (d.color = colorScale[d.cid]);
    })
    .style("stroke", function (d) {
      return d3.rgb(d.color).darker(2);
    })
    .append("title")
    .text(function (d) {
      return d.name;
    });
  // add text labels to nodes
  node
    .append("text")
    .attr("x", -6)
    .attr("y", function (d) {
      return d.dy / 2;
    })
    .attr("dy", "5.6px")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) {
      return d.label.split("-")[1];
    })
    .filter(function (d) {
      return d.x < width / 2;
    })
    .attr("x", 6 + sankey.nodeWidth())
    .attr("text-anchor", "start");
  // function that enables drag and move functionality to reposition nodes
  function dragmove(event, d) {
    d3.select(this).attr(
      "transform",
      `translate(${margin.left + d.x},${
        margin.top + (d.y = Math.max(0, Math.min(innerHeight, event.y - 80)))
      })`
    );
    // sankey.relayout() to recalculate position of links
    sankey.relayout();
    link.attr("d", path);
  }
};

// load and parse data from link
d3.text("./car.csv").then(function (r) {
  const loadedData =
    "buying,maintenance,doors,persons,luggage boot,safety\n" + r;
  const data = d3.csvParse(loadedData);
  // transform data for diagram
  const transformData = (d) => {
    //   objects for nodes and links
    const nodesById = {};
    const linksMap = {};
    const column = d.columns;
    const columnLength = column.length;
    const n = columnLength;

    d.forEach((row) => {
      for (let i = 0; i < n - 1; i++) {
        const source = column[i] + "-" + row[column[i]];
        const target = column[i + 1] + "-" + row[column[i + 1]];

        if (target === "" || target === "-") {
          break;
        }
        //
        const linkKey = source + "->" + target;

        if (!linksMap[linkKey]) {
          linksMap[linkKey] = {
            source: source,
            target: target,
            value: 0,
          };
        }

        linksMap[linkKey].value += 1;
        nodesById[source] = true;
        nodesById[target] = true;
      }
    });
    const nodes = Object.keys(nodesById).map((id) => ({
      name: id,
      label: id.substr(0, 20),
    }));
    const links = Object.values(linksMap);

    return { nodes: nodes, links: links };
  };
  // render
  const transformedData = transformData(data);

  render(transformedData);
});
