'use strict';
var data; // a global

d3.json("scpd_incidents.json", function(error, json) {
	if (error) return console.warn(error);

	var typeToColor = {};

	var seenIds = {};
	var types = {};
	data = json.data.filter(function(d) {
		types[d.Category] = true;
		var alreadySeen = seenIds[d.IncidentNumber];
		seenIds[d.IncidentNumber] = true;
		return !alreadySeen;
	});

	//makes all the types into an array with non-repeating elements
	var typesArr = [];
	for (var key in types) {
		typesArr.push(key);
	}
	typesArr.sort();//alphabetically
	var typeIndices = []; 
	// var selecter = $("#selecter");
	// console.log(selecter[0]);
	// for (var i = 0; i < 4; i++) {
	// 	var cur = typesArr[i];
	// 	selecter.append("<option>"+cur+"</option>");
	// }

	// Set up size
	var width = 750,
		height = width;

	// Set up projection that map is using
	var projection = d3.geo.mercator()
		.center([-122.433701, 37.767683]) // San Francisco, roughly 37.767683
		.scale(225000) // 225000
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
	          .attr("xlink:href", "sf-map.svg");
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
	var homeArea = svg.append("circle").style("fill", "gray").style("opacity",0).attr("class", "base-dot").attr("id","homeRad");
	var workArea = svg.append("circle").style("fill", "gray").style("opacity",0).attr("class", "base-dot").attr("id","workRad");
	var homeDot = svg.append("circle").style("fill", "red").attr("class", "base-dot").attr("id","homeLoc");
	var workDot = svg.append("circle").style("fill", "green").attr("class", "base-dot").attr("id","workLoc");
	var homeAreaCrimes = [];
	var workAreaCrimes = [];
	var homeR = 0;
	var workR = 0;

	//Variables for time filtering
	var startTime = 0;
	var endTime = 1439;

	var notDrawing = true;

	$("#homeLoc").draggable
	({
	  drag: function(e, ui) {
	  	var x = e.offsetX;
		var y = e.offsetY;
		homeLoc = projection.invert([x,y]);
		homeDot.attr("cx", x).attr("cy", y).attr("r", 5);
		homeArea.attr("cx", x).attr("cy", y).style("opacity",0.25);
		homeSelected = true;
		if(homeSelected && workSelected) {
			homeAreaCrimes = pointsWithinRadius(data, homeLoc, homeR);
			radChanged(pointsWithinRadius(homeAreaCrimes,workLoc,workR));
		}
	  } //changed
	});

	$("#workLoc").draggable
	({
	  drag: function(e, ui) {
	  	var x = e.offsetX;
		var y = e.offsetY;
		workLoc = projection.invert([x,y]);
		workDot.attr("cx", x).attr("cy", y).attr("r", 5);
		workArea.attr("cx", x).attr("cy", y).style("opacity",0.25);
		workSelected = true;
		if(homeSelected && workSelected) {
			workAreaCrimes = pointsWithinRadius(data, workLoc, workR);
			radChanged(pointsWithinRadius(workAreaCrimes,homeLoc,homeR));
		}
	  } //changed
	});


	//type filtering globals?

	//filter functions which will use global variables
	function radialFilter(input) {
		return pointsWithinRadius(pointsWithinRadius(input, homeLoc, homeR), workLoc, workR);
	}

	function timeFilter(input) {
		// console.log(input.constructor);
		return input.filter(function(d) {
	    	var hourmin = d.Time.split(":");
	    	var res = 60*(+hourmin[0]) + +hourmin[1];
	    	if(startTime < endTime) {
	    		return res >= startTime && res <= endTime;
	    	}
	    	return res >= startTime || res <= endTime;
    	});
	}

	function typeFilter(input) {
		if(typeIndices.length === 0) {
			return input;
		}
		var filtered = input.filter(function(d) {
			return d.Category in typeToColor;
		});
		// console.log(filtered.constructor);
		return filtered;
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

	document.querySelector('svg').addEventListener('click', function(e) {
		$("#instruct").html("Location Radii");
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
                       .attr("date", function(d) { return d['Date']; })
                       .attr("day", function(d) { return d['DayOfWeek']; })
                       .attr("time", function(d) { return d['Time']; })
                       .attr("resolution", function(d) { return d['Resolution']; })
                       .style("fill", "blue")
                       .style("fill", function(d) { return typeToColor[d.Category];});
        addDescrHovers();
	}

	var pointsWithinRadius = function(superset, center, radius) {
		center = projection(center);
		return superset.filter(function(d) {
			var loc = projection(d.Location);
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
		value = 20 + value*3;
		homeR = value;
		changeRadius(homeArea, homeSelected, value);
		if(homeSelected && workSelected) {
			homeAreaCrimes = pointsWithinRadius(data, homeLoc, homeR);
			radChanged(pointsWithinRadius(homeAreaCrimes,workLoc,workR));
		}
	};
	var workRadius = function(evt, value) {
		value = 20 + value*3;
		workR = value;
		changeRadius(workArea, workSelected, value);
		if(homeSelected && workSelected) {
			workAreaCrimes = pointsWithinRadius(data, workLoc, workR);
			radChanged(pointsWithinRadius(workAreaCrimes,homeLoc,homeR));
		}
	};


function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

var effHomeRadius = debounce(homeRadius, 50);


var effWorkRadius = debounce(workRadius, 50);

	d3.select('#homeSlider').call(d3.slider().on("slide", effHomeRadius));
	d3.select('#workSlider').call(d3.slider().on("slide", effWorkRadius));

	// var hovered = false;
	// Hover functionality for Description
	function addDescrHovers() {
		var $des = $("#crime-description");
		$des.text("To see a description of a specific crime, hover over it on the map!");
		$( "circle" ).hover(
			function() {
				
				var enter = $(this);
				if(enter[0].className.animVal === "base-dot") {
					return;
				}
				var des = enter.attr('description');
				var date = enter.attr('date');
				date = date.substring(0, 10);
				date = new Date(date).toString().substring(4, 15);
				
				var day = enter.attr('day');
				var time = enter.attr('time');
				var res = enter.attr('resolution');
				enter.attr("oldcolor", enter.css("fill"));
				enter.css("fill", "red");
				enter.attr("r", 4);
				$des.text(des + " on " + day + ", " + date + " at " + time + ". Resolution: " + res);
			}, function() {
				var exit = $(this);
				if(exit[0].className.animVal === "base-dot") {
					return;
				}
				exit.css("fill", exit.attr("oldcolor"));
				exit.attr("r", 2);
				
				$des.text("No crime selected");
			}
		);
	}
	
	addDescrHovers();

	// Legend for ordinal crime types
	var ordinal = d3.scale.ordinal()
		// .domain(typesArr)
		// .range(["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"]);
		// .range([ "rgb(153, 107, 195)", "rgb(56, 106, 197)", "rgb(93, 199, 76)", "rgb(223, 199, 31)", "rgb(234, 118, 47)"]);

	// var svg = d3.select("svg");
	// var svg = d3.select("#legend");
	// Add an svg element to the DOM
	var svg2 = d3.select("#legend").append("svg")
		.attr("width", width)
		.attr("height", height+100);

	var distX = 0;
	var distY = -50;

	// TODO this is where to set the coordinates for the legend
	svg2.append("g")
		.attr("class", "legendOrdinal")
		.attr("transform", "translate("+distX+","+distY+")");

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



function pieBrush() {
    d3.selectAll("path.pieminutes")
    .style("fill", piebrushIntersect);
    startTime = piebrush.extent()[0];
    endTime = piebrush.extent()[1];
    var newTimeFiltered = timeFilter(data);
    timeChanged(newTimeFiltered);
  }
  
var effPieBrush = debounce(pieBrush, 50);

	var piebrush = d3.svg.circularbrush()
      .range([0,1439])
      .innerRadius(30) // keep them smaller
      .outerRadius(45) // keep smaller
      .handleSize(0.1)
      .extent([0,1439]) //initial range
  	.on("brush", effPieBrush);

    var minutes = Array.apply(null, Array(1440)).map(function (_, i) {return i;});
    var hours = Array.apply(null, Array(24)).map(function (_, i) {return i;});

  	var pie = d3.layout.pie().value(function() {return 1}).sort(d3.ascending);
  	var pieArc = d3.svg.arc().innerRadius(65).outerRadius(80);
  	var svg2 = d3.select("#left-side-bar").append("svg").attr("width",400).attr("height", 400);
  	svg2.append("g")
	  .attr("transform", "translate("+(distX+140)+","+(distY+175)+")")
  	.selectAll("path")
	  .data(pie(minutes))
	  .enter()
	  .append("path")
	  .attr("class", "pieminutes")
	  .attr("d", pieArc);

	  var underPie = d3.layout.pie().value(function() {return 1}).sort(d3.ascending);
  	var underPieArc = d3.svg.arc().innerRadius(65).outerRadius(80);
  	svg2.append("g")
	  .attr("transform", "translate("+(distX+140)+","+(distY+175)+")")
  	.selectAll("path")
	  .data(pie(hours))
	  .enter()
	  .append("path")
	  .attr("class", "piehours")
	  .attr("d", underPieArc);

	svg2.append("text").text("12am").attr("class", "clocklab").attr("transform", "translate("+(distX+130)+","+(distY+90)+")");
	svg2.append("text").text("6am").attr("class", "clocklab").attr("transform", "translate("+(distX+224)+","+(distY+182)+")");
	svg2.append("text").text("12pm").attr("class", "clocklab").attr("transform", "translate("+(distX+127)+","+(distY+270)+")");
	svg2.append("text").text("6pm").attr("class", "clocklab").attr("transform", "translate("+(distX+30)+","+(distY+180)+")");

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
	  .attr("transform", "translate("+(distX+140)+","+(distY+ 175)+")")
	  .call(piebrush);

	// END
	// Autocomplete
	// var $tag = $("#tags");
	// $tag.attr('disabled','disabled');
	// $tag.tagsinput('add', 'Test');

	// var comboplete = new Awesomplete(Awesomplete.$('input.dropdown-input'), {
	// 	minChars: 0,
	// });
	// Awesomplete.$('.dropdown-btn').addEventListener("click", function() {
	// 	if (comboplete.ul.childNodes.length === 0) {
	// 		comboplete.minChars = 0;
	// 		comboplete.evaluate();
	// 	}
	// 	else if (comboplete.ul.hasAttribute('hidden')) {
	// 		comboplete.open();
	// 	}
	// 	else {
	// 		comboplete.close();
	// 	}
	// });

	// 20 different colors
	var colors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
	colors.reverse();
	// var baseColors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
	// baseColors.reverse();
	// var currentColor = -1; // when asked for color for first time, will start at index 0

	var putBackColor = function(color) {
		// var color = baseColors[currentColor];
		// currentColor--;
		colors.push(color);
	}

	var getColor = function() {
		// currentColor++;
		return colors.pop();
	}

	// console.log(typesArr);

	var removeTag = function(tagName) {

	}

	// var types = typesArr;
	

	var tagNum = 0;
	var addTag = function(category) {
		// var html = $("<div id="+tagNum+"><span id='tag"+tagNum+"'>TEST</span><span id='x"+tagNum+"'>x</div></div>");
		tagNum++;
		var indexNum = typesArr.indexOf(category);
		var color = getColor();

		// maps type to color
		typeToColor[category] = color;

		//rest of logic
		$("#tags").append("<div colorTag='"+color+"' i='"+indexNum+"' class='tagtext "+category+"' id="+tagNum+"><span id='tag"+tagNum+"'></span></div>");
		var outer = $("#"+tagNum);
		var text = $("#tag"+tagNum);
		var x = $("#x"+tagNum);
		// <div color='"+color+"' class='exits' id='x"+tagNum+"'>X</div>

		text.html(""+category+"");

		outer.css({"background-color": color});
		var middle = outer.height();
		// x.css("margin", "20px");
		x.css({
			"display": "inline-block",
			"font-weight": "bold"
		});
		
	}

	var removeTag = function(index) {
		var i = typeIndices.indexOf(index);

		//deletes color association 
		var category = typesArr[index];
		delete typeToColor[category];

		// rest of logic
		typeIndices.splice(i, 1); // removes this index from array
		var tag = $("[i='"+index+"'");
		var color = tag.attr("colorTag");
		putBackColor(color);
		tag.remove();
	}

	$('#selecter').on('changed.bs.select', function (e, index) {
		if (typeIndices.indexOf(index) != -1) { // already selected, so trying to deselect
			// get rid of tag
			
			removeTag(index);
			var newset;
			if(typeIndices.length === 0) {
				newset = data;
			} else {
				newset = typeFiltered.filter(function(d) {
					return d.Category !== typesArr[index];
				});
			}
			typeChanged(newset);
			return;
		}
  		var cur = typesArr[index]; //current type selected
  		typeIndices.push(index);
  		addTag(cur);
  		var newset = data.filter(function(d) {
  			return d.Category === typesArr[index];
  		});
  		if(typeIndices.length > 1) {
  			newset = newset.concat(typeFiltered);
  		}
  		typeChanged(newset);
	});

});