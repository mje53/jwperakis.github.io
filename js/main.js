
var w = 1140,
    h = 820,
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]);

var expandval = 3.5

var vis = d3.select("#chart").append("svg")
    .attr("width", w)
    .attr("height", h * expandval + 60)
    .append("g").attr("id", "clipping_g");

vis.append("defs")
  .append("clipPath").attr("id", "clipping")
  .append("rect").attr("id", "clipRect")
  .attr({width: w, height: h, x: 0, y: 0});

d3.select("#clipping_g").attr("clip-path", "url(#clipping)");

var partition = d3.layout.partition().sort(function(a, b) { 
  var x = parseInt(a.name.substring(0, 2)) ? parseInt(a.name.substring(0, 2)) : a.name;
  var y = parseInt(b.name.substring(0, 2)) ? parseInt(b.name.substring(0, 2)) : b.name;
  return x - y; 
});


var change_vals = function(d) {
  if (!("key" in d) && !("values" in d)) {
    return {name: d["Product"], 
    "Recycled Content": d["Recycled Content"], 
    "FSC Content": d["FSC Content"], 
    "Red List Status": d["Red List Status"]}
  }
  else {
    return {name: d.key, children: d.values.map(function(dd) { return change_vals(dd); })}
  }
}

function treeSearch(d, gd) {
  if ((d.name == gd.name) && (d.depth == gd.depth) && (d.children.length == gd.heirs)){
    return d;
  }
  else if (d.children != null) {
    var result = null;
    for (var i=0; result == null && i < d.children.length; i++) {
      result = treeSearch(d.children[i], gd);
    }
    return result
  }
  return null;
}

function changeState(id) {
  var ids = ["btn_product", "btn_manufacturer", "btn_subdivision", "btn_division"]

  ids.forEach(function(d) { $("#" + d).removeClass("active"); });
  
  $("#" + id).addClass("active");

}

var expand = false;
d3.csv("MaterialDatabase_CSV.csv", function(root) {



  var filtered = root.map(function(d) {
    var ks = d3.keys(d).filter(function(x) { return x != ""; });
    var r = {}
    ks.forEach(function(val) {
      return r[val] = d[val];
    });
    return r;
  });

  nested = d3.nest()
    .key(function(d) { return d["CSI Division"]; })
    .key(function(d) { return d["Subdivision Name"]})
    .key(function(d) { return d["Manufacturer"]})
    .entries(filtered);

  nested = {key: "Division", values: nested}
  nested = change_vals(nested);


  var tot = filtered.length;

  partition.value(function(v) { 
        return tot/(v.parent.children.length*v.parent.parent.children.length*v.parent.parent.parent.children.length); });

  
  var gd = {name: "Division", depth: 0, heirs: nested.children.length};


  var btnSort = {
    btnProduct: function(d) {
      changeState("btn_product")
      partition.value(function(v) { return 1; });
      partition.nodes(nested);
      click(treeSearch(nested, gd));
    },
    btnManufacturer: function(d) {
      changeState("btn_manufacturer")
      partition.value(function(v) { return tot/v.parent.children.length; });
      partition.nodes(nested);
      click(treeSearch(nested, gd));
    },
    btnSubdivision: function(d) {
      changeState("btn_subdivision")
      partition.value(function(v) { return tot/(v.parent.children.length*v.parent.parent.children.length); });
      partition.nodes(nested);
      click(treeSearch(nested, gd));
    },
    btnDivision: function(d) {
      changeState("btn_division")
      partition.value(function(v) { 
        return tot/(v.parent.children.length*v.parent.parent.children.length*v.parent.parent.parent.children.length); });
      partition.nodes(nested);
      click(treeSearch(nested, gd));
    }
  }

  function btnExpand() {
    if (expand == true) {
      $("#btn_expand").removeClass("active");
      d3.select("#clipRect").transition().duration(800).attr("height", h);
      console.log("expand");
      expand = false;
    }
    else {
      $("#btn_expand").addClass("active");
      d3.select("#clipRect").transition().duration(800).attr("height", (h * expandval));
      console.log("expand");
      expand = true
    }
    click(treeSearch(nested, gd));
  }

  d3.select("#btn_product").select("a").on("click", btnSort.btnProduct);
  d3.select("#btn_manufacturer").select("a").on("click", btnSort.btnManufacturer);
  d3.select("#btn_subdivision").select("a").on("click", btnSort.btnSubdivision);
  d3.select("#btn_division").select("a").on("click", btnSort.btnDivision);

  d3.select("#btn_expand").select("a").on("click", btnExpand);

  

  var g = vis.selectAll("g")
      .data(partition.nodes(nested))
    .enter().append("svg:g")
      .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
      .on("click", click);

  var kx = w / nested.dx,
      ky = h / 1;

  g.append("svg:rect")
      .attr("width", nested.dy * kx)
      .attr("height", function(d) { return d.dx * ky; })
      .attr("class", function(d) { return d.children ? "parent" : "child"; });

  g.append("svg:text")
      .attr("transform", transform)
      .attr("dy", ".35em")
      .attr("font-size", 10)
      .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; })
      .text(function(d) { return d.name; })

  d3.select("svg")
      .on("click", function() { click(nested); })


  function click(d) {
   
    var ex = expand ? expandval: 1;
    gd.name = d.name; 
    gd.depth = d.depth;
    
    if (!d.children) {
      gd.heirs = 0
      return;
    }
    gd.heirs = d.children.length 


    kx = (d.y ? w - 40 : w) / (1 - d.y);
    ky = h * ex / d.dx;
    x.domain([d.y, 1]).range([d.y ? 40 : 0, w]);
    y.domain([d.x, d.x + d.dx]);

    var t = g.transition()
        .duration(800)
        .attr("transform", function(d) { return "translate(" + x(d.y) + "," + (y(d.x)*ex) + ")"; });

    t.select("rect")
        .attr("width", d.dy * kx)
        .attr("height", function(d) { return d.dx * ky; });

    t.select("text")
        .attr("transform", transform)
        .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; });

    d3.event.stopPropagation();
  }

  function transform(d) {
    return "translate(8," + d.dx * ky / 2 + ")";
  }

});