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
	var homeDot = svg.append("circle").style("fill", "red").attr("class", "base-dot");
	var workDot = svg.append("circle").style("fill", "green").attr("class", "base-dot");
	var homeArea = svg.append("circle").style("fill", "gray").style("opacity",0.4).attr("class", "base-dot");
	var workArea = svg.append("circle").style("fill", "gray").style("opacity",0.4).attr("class", "base-dot");


	document.querySelector('input[name="change-home"]').addEventListener('click', function(e) {
		homeDot.attr("r", 0);
		homeArea.style("opacity", 0);
		homeSelected = false;
	});

	document.querySelector('input[name="change-work"]').addEventListener('click', function(e) {
		workDot.attr("r", 0);
		workArea.style("opacity", 0);
		workSelected = false;
	});

	document.querySelector('svg').addEventListener('click', function(e) {
		var x = e.offsetX;
		var y = e.offsetY;
		if(!homeSelected) {
			homeLoc = projection.invert([x,y]);
			homeDot.attr("cx", x).attr("cy", y).attr("r", 5);
			homeArea.attr("cx", x).attr("cy", y).style("opacity",0.4);
			homeSelected = true;
			
		} else if(!workSelected) {
			workLoc = projection.invert([x,y]);
			workDot.attr("cx", x).attr("cy", y).attr("r",5);
			workArea.attr("cx", x).attr("cy", y).style("opacity",0.4);			
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
	var changeRadius = function(target, shown, val) {
		target.attr("r", val);
		if(shown) {
			target.style("opacity",0.4);
		}
	}
	var homeRadius = function(evt, value) {
		changeRadius(homeArea, homeSelected, value);
	};
	var workRadius = function(evt, value) {
		changeRadius(workArea, workSelected, value);
	};


	d3.select('#homeSlider').call(d3.slider().on("slide", homeRadius));
	d3.select('#workSlider').call(d3.slider().on("slide", workRadius));


});