var data; // a global

d3.json("scpd_incidents.json", function(error, json) {
	if (error) return console.warn(error);

	seenIds = {};
	var types = {};
	data = json.data.filter(function(d) {
		types[d.Category] = true;
		alreadySeen = seenIds[d.IncidentNumber];
		seenIds[d.IncidentNumber] = true;
		return !alreadySeen;
	});

	//makes all the types into an array with non-repeating elements
	var typesArr = [];
	for (var key in types) {
		typesArr.push(key);
	}
	typesArr.sort(); //alphabetically

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

	// svg.append("image")
	//           .attr("width", width)
	//           .attr("height", height)
	//           .attr("xlink:href", "sf-map.svg")
	//           // .attr("transform", "translate(-100,-100)");

	// add another svg for legend
	var svg = d3.select("#chart").append("svg")
		.attr("width", width)
		.attr("height", height);

	svg.append("image")
	          .attr("width", width)
	          .attr("height", height)
	          .attr("xlink:href", "sf-map.svg")
	          // .attr("transform", "translate(-100,-100)");


	//Filtered arrays
	var visiblePoints = data;
	var radialFiltered = data;
	var timeFiltered = data;
	var typeFiltered = data;
	var radAndTimeFiltered = data;
	var radAndTypeFiltered = data;
	var timeAndTypeFiltered = data;
	//Variables for home and work locations
	var homeLoc = [0,0];
	var workLoc = [0,0];
	var homeSelected = false;
	var workSelected = false;
	var homeDot = svg.append("circle").style("fill", "red").attr("class", "base-dot");
	var workDot = svg.append("circle").style("fill", "green").attr("class", "base-dot");
	var homeArea = svg.append("circle").style("fill", "gray").style("opacity",0.25).attr("class", "base-dot");
	var workArea = svg.append("circle").style("fill", "gray").style("opacity",0.25).attr("class", "base-dot");
	var homeAreaCrimes = [];
	var workAreaCrimes = [];
	var homeR = 0;
	var workR = 0;

	//Variables for time filtering
	var startTime = 0;
	var endTime = 1439;

	//type filtering globals?

	//filter functions which will use global variables
	function radialFilter(input) {
		return pointsWithinRadius(pointsWithinRadius(input, homeLoc, homeR), workLoc, workR);
	}

	function timeFilter(input) {
		return input.filter(function(d) {
	    	hourmin = d.Time.split(":");
	    	res = 60*(+hourmin[0]) + +hourmin[1];
	    	if(startTime < endTime) {
	    		return res >= startTime && res <= endTime;
	    	}
	    	return res >= startTime || res <= endTime;
    	});
	}

	function typeFilter(input) {
		// ============ IMPLEMENT ===============
		return input;
	}
	
	//change functions
	function radChanged(newSet) {
		radialFiltered = newSet;
		radAndTimeFiltered = radialFilter(timeFiltered);
		radAndTypeFiltered = radialFilter(typeFiltered);
		visiblePoints = radialFilter(timeAndTypeFiltered);
		if(!homeSelected || !workSelected) {
			visiblePoints = data;
		}
		graphPoints(visiblePoints);
	}

	function timeChanged(newSet) {
		timeFiltered = newSet;
		radAndTimeFiltered = timeFilter(radialFiltered);
		timeAndTypeFiltered = timeFilter(typeFiltered);
		if(homeSelected && workSelected) {
			visiblePoints = timeFilter(radAndTypeFiltered);
		} else {
			visiblePoints = timeFilter(typeFiltered);
		}
		graphPoints(visiblePoints);
	}

	function typeChanged(newSet) {
		typeFiltered = newSet;
		radAndTypeFiltered = typeFilter(radialFiltered);
		timeAndTypeFiltered = typeFilter(timeFiltered);
		if(homeSelected && workSelected) {
			visiblePoints = typeFilter(radAndTimeFiltered);
		} else {
			visiblePoints = typeFilter(timeFiltered);
		}
		graphPoints(visiblePoints);
	}

	document.querySelector('input[name="change-home"]').addEventListener('click', function(e) {
		homeSelected = false;
		homeDot.attr("r", 0);
		homeArea.style("opacity", 0);
		radChanged(data);
	});

	document.querySelector('input[name="change-work"]').addEventListener('click', function(e) {
		workSelected = false;
		workDot.attr("r", 0);
		workArea.style("opacity", 0);
		radChanged(data);
	});

	document.querySelector('svg').addEventListener('click', function(e) {
		var x = e.offsetX;
		var y = e.offsetY;
		if(!homeSelected) {
			homeLoc = projection.invert([x,y]);
			homeDot.attr("cx", x).attr("cy", y).attr("r", 5);
			homeArea.attr("cx", x).attr("cy", y).style("opacity",0.25);
			homeSelected = true;
			if(homeSelected && workSelected) {
				homeAreaCrimes = pointsWithinRadius(data, homeLoc, homeR);
				radChanged(pointsWithinRadius(homeAreaCrimes,workLoc,workR));
			}
			
		} else if(!workSelected) {
			workLoc = projection.invert([x,y]);
			workDot.attr("cx", x).attr("cy", y).attr("r",5);
			workArea.attr("cx", x).attr("cy", y).style("opacity",0.25);
			workSelected = true;
			if(homeSelected && workSelected) {
				workAreaCrimes = pointsWithinRadius(data, workLoc, workR);
				radChanged(pointsWithinRadius(workAreaCrimes,homeLoc,homeR));
			}
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
                       .attr("description", function(d) { return d['Description']; })
                       .attr("type", function(d) { return d['Category']; })
                       .style("fill", "blue");
        addDescrHovers();
	}

	graphPoints(visiblePoints);

	var pointsWithinRadius = function(superset, center, radius) {
		center = projection(center);
		return superset.filter(function(d) {
			loc = projection(d.Location);
			return Math.sqrt((loc[0] - center[0])*(loc[0] - center[0]) + (loc[1] - center[1])*(loc[1] - center[1])) < radius;
		});
	};

	// Slider Logic for Radius of HOME
	var changeRadius = function(target, shown, val) {
		target.attr("r", val);
		if(shown) {
			target.style("opacity",0.25);
		}
	};
	var homeRadius = function(evt, value) {
		value = 20 + value*7;
		homeR = value;
		changeRadius(homeArea, homeSelected, value);
		if(homeSelected && workSelected) {
			homeAreaCrimes = pointsWithinRadius(data, homeLoc, homeR);
			radChanged(pointsWithinRadius(homeAreaCrimes,workLoc,workR));
		}
	};
	var workRadius = function(evt, value) {
		value = 20 + value*7;
		workR = value;
		changeRadius(workArea, workSelected, value);
		if(homeSelected && workSelected) {
			workAreaCrimes = pointsWithinRadius(data, workLoc, workR);
			radChanged(pointsWithinRadius(workAreaCrimes,homeLoc,homeR));
		}
	};

	d3.select('#homeSlider').call(d3.slider().on("slide", homeRadius));
	d3.select('#workSlider').call(d3.slider().on("slide", workRadius));

	// Hover functionality for Description
	function addDescrHovers() {
		var $des = $("#crime-description");
		$des.text("Please hover");
		$( "circle" ).hover(
			function() {
				var enter = $(this);
				if(enter.hasClass("base-dot")) return;
				var des = enter.attr('description');
				enter.css("fill", "red");
				enter.attr("r", 4);
				$des.text(des);
			}, function() {
				var exit = $(this);
				if(exit.hasClass("base-dot")) return;
				exit.css("fill", "blue");
				exit.attr("r", 2);
				$des.text("Please hover");
			}
		);
	}
	
	addDescrHovers();
	

	// Legend for ordinal crime types
	var ordinal = d3.scale.ordinal()
		.domain(typesArr)
		.range(["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"]);
		// .range([ "rgb(153, 107, 195)", "rgb(56, 106, 197)", "rgb(93, 199, 76)", "rgb(223, 199, 31)", "rgb(234, 118, 47)"]);

	// var svg = d3.select("svg");
	// var svg = d3.select("#legend");
	// Add an svg element to the DOM
	var svg2 = d3.select("#legend").append("svg")
		.attr("width", width)
		.attr("height", height+100);

	// TODO this is where to set the coordinates for the legend
	svg2.append("g")
		.attr("class", "legendOrdinal")
		.attr("transform", "translate(10,25)");

	var legendOrdinal = d3.legend.color()
		//d3 symbol creates a path-string, for example
		//"M0,-8.059274488676564L9.306048591020996,
		//8.059274488676564 -9.306048591020996,8.059274488676564Z"
		.shape("path", d3.svg.symbol().type("square").size(140)())
		.shapePadding(10)
		.scale(ordinal);

	svg2.select(".legendOrdinal")
		.call(legendOrdinal);

// ====== Circular brush shizz ===========
	var piebrush = d3.svg.circularbrush()
      .range([0,1439])
      .innerRadius(30)
      .outerRadius(45)
      .handleSize(0.1)
      .extent([0,1439]) //initial range
  	.on("brush", pieBrush);

    var minutes = Array.apply(null, Array(1440)).map(function (_, i) {return i;});;
    var hours = Array.apply(null, Array(24)).map(function (_, i) {return i;});;

  	var pie = d3.layout.pie().value(function() {return 1}).sort(d3.ascending);
  	var pieArc = d3.svg.arc().innerRadius(65).outerRadius(80);
  	svg2.append("g")
	  .attr("transform", "translate(150,400)")
  	.selectAll("path")
	  .data(pie(minutes))
	  .enter()
	  .append("path")
	  .attr("class", "pieminutes")
	  .attr("d", pieArc);

	  var underPie = d3.layout.pie().value(function() {return 1}).sort(d3.ascending);
  	var underPieArc = d3.svg.arc().innerRadius(65).outerRadius(80);
  	svg2.append("g")
	  .attr("transform", "translate(150,400)")
  	.selectAll("path")
	  .data(pie(hours))
	  .enter()
	  .append("path")
	  .attr("class", "piehours")
	  .attr("d", underPieArc);
    
    function pieBrush() {
    d3.selectAll("path.pieminutes")
    .style("fill", piebrushIntersect)
    startTime = piebrush.extent()[0];
    endTime = piebrush.extent()[1];
    var newTimeFiltered = timeFilter(data);
    timeChanged(newTimeFiltered);
  }

  function piebrushIntersect(d,i) {
    var _e = piebrush.extent();
    if (_e[0] < _e[1]) {
      var intersect = (d.data >= _e[0] && d.data <= _e[1]);
    }
    else {
      var intersect = (d.data >= _e[0]) || (d.data <= _e[1]);    
    }
    return intersect ? "rgb(246,139,51)" : "rgb(231,231,231)";
  }

    svg2.append("g")
	  .attr("class", "brush")
	  .attr("transform", "translate(150,400)")
	  .call(piebrush);

	// END
});