var data; // a global

d3.json("scpd_incidents.json", function(error, json) {
	if (error) return console.warn(error);

	seenIds = {};
	data = json.data.filter(function(d) {
		alreadySeen = seenIds[d.IncidentNumber];
		seenIds[d.IncidentNumber] = true;
		return !alreadySeen;
	});
  
	// Set up size
	var width = 750,
		height = width;

	// Set up projection that map is using
	var projection = d3.geo.mercator()
		.center([-122.433701, 37.767683]) // San Francisco, roughly
		.scale(225000)
		.translate([width / 2, height / 2]);
	// This is the mapping between <longitude, latitude> position to <x, y> pixel position on the map
	// projection([lon, lat]) returns [x, y]
	// projection.invert([x, y]) returns [lon, lat]

	// Add an svg element to the DOM
	var svg = d3.select("#chart").append("svg")
		.attr("width", width)
		.attr("height", height);

	svg.append("image")
	          .attr("width", width)
	          .attr("height", height)
	          .attr("xlink:href", "sf-map.svg");

	//Variables for home and work locations
	var homeLoc = [0,0];
	var workLoc = [0,0];
	var homeSelected = false;
	var workSelected = false;
	var homeCircle = svg.append("circle").style("fill", "red").attr("class", "base-dot");
	var workCircle = svg.append("circle").style("fill", "green").attr("class", "base-dot");



	document.querySelector('input[name="change-home"]').addEventListener('click', function(e) {
		homeCircle.attr("r", 0);
		homeSelected = false;
	});

	document.querySelector('input[name="change-work"]').addEventListener('click', function(e) {
		workCircle.attr("r", 0);
		workSelected = false;
	});

	document.querySelector('svg').addEventListener('click', function(e) {
		var x = e.offsetX;
		var y = e.offsetY;
		if(!homeSelected) {
			homeLoc = projection.invert([x,y]);
			homeCircle.attr("cx", x).attr("cy", y).attr("r", 5);
			homeSelected = true;
			
		} else if(!workSelected) {
			workLoc = projection.invert([x,y]);
			workCircle.attr("cx", x).attr("cy", y).attr("r",5);
			workSelected = true;
		}
	});
	
	// We don't want complicated booleans being passed into d3's custom
	// filter function, so instead we will just keep subsets of pointArray in memory

	function graphPoints(pointArray) {
		var circles = svg.selectAll("circle").filter(function() {return this.className.baseVal !== "base-dot";}).remove();

		circles = svg.selectAll("circle")
                          .data(pointArray)
                          .enter()
                          .append("circle");

		var circleAttributes = circles
                       .attr("cx", function (d) { return projection(d.Location)[0]; })
                       .attr("cy", function (d) { return projection(d.Location)[1]; })
                       .attr("r", 2)
                       .attr("id", function(d) { return d['IncidentNumber']; })
                       .style("fill", "blue");
	}

	graphPoints(data);


	// Slider Logic for Radius of HOME
	var homeRadius = function(evt, value) {
		// console.log(value);
		// value returns 0 - 100 (real nnumbers, not whole)
	}

	d3.select('#slider').call(d3.slider().on("slide", homeRadius));

});