/**
	* (C) HERE 2014
	*/

	//object to store route URL info
	var urlConfig;

	//regex to Test if user input is an address or lat/lng pair
	var regexLatLng = /^\s*[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\s*$/;

	//variables store key map information
	var routesOnMap = [];
	var markersOnMap = [];
	var bLongClickUseForStartPoint = true;

	var lastBubble = null;

	var shapeLevel = 1;

	var zIndex = 1;

	//used to generate a random color for the map's routes
	var shapeLevelColorMap = {};

	function arraysEqual(arr1, arr2) {
		if (arr1.length !== arr2.length) {
			return false;
		}
		for (var i = 0; i < arr1.length; i++) {
			if (arr1[i] !== arr2[i]) {
				return false;
			}
		}
		return true;
	}

	//checks if there is already a route of this color on the map
	var checkIfColorUsed = function(colorArray) {
		for (var property in shapeLevelColorMap) {
			if (shapeLevelColorMap.hasOwnProperty(property)) {
				if (arraysEqual(shapeLevelColorMap[property], colorArray)) {
					return true;
				}
			}
		}
		return false;
	}

	var getRandomColor = function() {
		var parts = [];
		for (var i = 0; i < 3; i++) {
			parts.push(Math.floor(Math.random() * 255));
		}
		return parts;
	};

	var getShapeColor = function(shapeLevel, opacity) {
		var colorParts = shapeLevelColorMap[shapeLevel];
		var randomGeneratedArray;
		if (!colorParts) {
			randomGeneratedArray = getRandomColor();
			while (checkIfColorUsed(randomGeneratedArray)) {
				randomGeneratedArray = getRandomColor();
			}
			colorParts = shapeLevelColorMap[shapeLevel] = randomGeneratedArray;
		}
		opacity = opacity || 0.5;
		var allColorParts = colorParts.concat([opacity]);
		return ["rgba(", allColorParts.join(","), ")"].join("");
	};

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs.
	var platform = new H.service.Platform({
		apikey: api_key
	});

	var maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	var geocoder = platform.getGeocodingService();
	var router = platform.getRoutingService();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		zoom: 13,
		pixelRatio: hidpi ? 2 : 1
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	// Store HTML elements in variables.
	var start = {
		input: document.getElementById("input-start"),
		myLocation: document.getElementById("input-start-mylocation")
	};
	var destination = {
		input: document.getElementById("input-destination"),
		myLocation: document.getElementById("input-destination-mylocation")
	};
	var modes = {
		d: document.getElementById("input-mode-d"),
		w: document.getElementById("input-mode-w"),
		pt: document.getElementById("input-mode-pt")
	};
	var eta = {
		baseDiv: document.getElementById("div-base-time"),
		base: document.getElementById("span-base-time"),
		trafficDiv: document.getElementById("div-traffic-time"),
		traffic: document.getElementById("span-traffic-time")
	};
	var directionsLink = document.getElementById("link-directions");

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	/**
	* Kicks off the demo with the default config.
	*/
	var kickoff = function() {
		start.myLocation.checked = true;
		onCheckboxChange(start.myLocation);
		modes.d.checked = true;
		onRadioboxChange(modes.d);
	};

	//adds the route polyline and its corresponding markers to the map
	var addRouteToMap = function(route) {

		var strip = new H.geo.LineString(),
		routeShape = route.shape,
		polyline,
		startMarker,
		destMarker;

		routeShape.forEach(function(point) {
			var parts = point.split(',');
			strip.pushLatLngAlt(parts[0], parts[1]);
		});

		var randomColor = getShapeColor(shapeLevel, 1.0);

		polyline = new H.map.Polyline(strip, {
			style: {
				lineWidth: 4,
				strokeColor: randomColor
			}
		});

		var svgMarkup = '<svg  width="24" height="24" xmlns="http://www.w3.org/2000/svg">' +
			'<rect stroke="black" fill="${FILL}" x="1" y="1" width="22" height="22" />' +
			'<text x="12" y="18" font-size="12pt" font-family="Arial" font-weight="bold" ' +
			'text-anchor="middle" fill="${STROKE}" >${text}</text></svg>';

		var startIcon = new H.map.Icon(svgMarkup.replace('${FILL}', 'green').replace('${STROKE}', 'white').replace('${text}', 'S'));
		startMarker = new H.map.Marker({lat: route.waypoint[0].originalPosition.latitude, lng: route.waypoint[0].originalPosition.longitude}, {
			icon: startIcon,
			zIndex: zIndex++
		});

	map.addObject(startMarker);

	var destIcon = new H.map.Icon(svgMarkup.replace('${FILL}', 'blue').replace('${STROKE}', 'white').replace('${text}', 'D'));
	destMarker = new H.map.Marker({lat: route.waypoint[1].originalPosition.latitude, lng: route.waypoint[1].originalPosition.longitude}, {
		icon: destIcon,
		zIndex: zIndex++
	});

map.addObject(destMarker);

function timeoutFunction() {

	var border = 50;
	var objRect = lastBubble.getContentElement().parentElement.getBoundingClientRect();
	var objStyleRight = Math.abs(parseInt(lastBubble.getContentElement().parentElement.style.right));
	objStyleRight = objStyleRight ? objStyleRight : 0;

	var mapRect = map.getElement().getBoundingClientRect();
	var shiftX = 0;
	var shiftY = 0;

	// check, if infobubble isn't too far up
	if ((objRect.top-border)  < mapRect.top)  {
		shiftY = (mapRect.top - (objRect.top-border));
	}

	// check, if infobubble isn't too far down
	if ((objRect.bottom+border) > mapRect.bottom) {
		shiftY = (mapRect.bottom - (objRect.bottom+border));
	}

	// check, if infobubble isn't too far to the left
	var objLeft = (objRect.left - objStyleRight);
	if ((objLeft-border) < mapRect.left) {
		shiftX = (mapRect.left - (objLeft-border));
	} // check, if infobubble isn't too far to the right
	else if ((objRect.right+border) > mapRect.right) {
		shiftX = -(objRect.right - (mapRect.right-border));
	}

	if ((shiftX == 0) && (shiftY == 0)) {
		return;
	}

	var currScreenCenter = map.geoToScreen(map.getCenter());
	var newY = (currScreenCenter.y - shiftY);
	var newX = (currScreenCenter.x - shiftX);

	var newGeoCenter = map.screenToGeo(newX, newY);
	map.setCenter(newGeoCenter, true);

}

polyline.addEventListener("tap", function(event) {
	var polylineOnMap = event.target;
	var strip =  polylineOnMap.getGeometry();
	var numPoints = strip.getPointCount();
	var middleIndex = Math.floor(numPoints/2);
	var middlePoint = strip.extractPoint(middleIndex);

	var startLatitude = route.waypoint[0].originalPosition.latitude;
	var startLongitude = route.waypoint[0].originalPosition.longitude;
	var endLatitude = route.waypoint[1].originalPosition.latitude;
	var endLongitude = route.waypoint[1].originalPosition.longitude;
	var routeMode = route.mode.transportModes[0];
	if (routeMode === "car") {
		routeMode = "Car"
	} else if (routeMode === "pedestrian") {
		routeMode = "Pedestrian"
	} else if (routeMode === "publicTransport") {
		routeMode = "Public Transport"
	}

	var summary = route.summary;
	var formattedBaseTime = formatTime(summary.baseTime);
	var formattedTrafficTime = formatTime(summary.trafficTime);

	var html = "<div class='category'> Mode: </div>" + "<div class='specific'>" + routeMode + "</div> <br>" + "<div class='category'> Start: </div>" + "<div class='specific'>" + startLatitude + "," + startLongitude + "</div> <br>" + "<div class='category'> Destination: </div>" + "<div class='specific'>" +endLatitude + "," + endLongitude + "</div>";
	if (formattedTrafficTime !== "N/A") {
		html = html + "<br>" + "<div class='category'> ETA Base: </div>" + "<div class='specific'>" + formattedBaseTime + "</div>" + "<br> <div class='category'> ETA Traffic: </div>" + "<div class='specific'>" + formattedTrafficTime + "</div>";
	} else {
		html = html + "<br>" + "<div class='category'> ETA Base: </div>" + "<div class='specific'>" + formattedBaseTime + "</div>";
	}

	var infobubble = new H.ui.InfoBubble(middlePoint, {
		content: html
	})
	infoBubbleCoreFunctionality(infobubble);
});

startMarker.addEventListener("tap", function(event) {
	var marker = event.target;
	var position = marker.getPosition();
	var html = "<div class='category'> Start: </div>" + "<div class='specific'>" + position.lat + "," + position.lng; + "</div>";
	var infobubble = new H.ui.InfoBubble(position, {
		content: html
	});
	infoBubbleCoreFunctionality(infobubble);
});

destMarker.addEventListener("tap", function(event) {
	var marker = event.target;
	var position = marker.getPosition();
	var html = "<div class='category'> Destination: </div>" + "<div class='specific'>" + position.lat + "," + position.lng; + "</div>";
	var infobubble = new H.ui.InfoBubble(position, {
		content: html
	});
	infoBubbleCoreFunctionality(infobubble);
});

function infoBubbleCoreFunctionality(infobubble) {
	if (lastBubble != null) {
		ui.removeBubble(lastBubble);
	}
	lastBubble = infobubble;
	ui.addBubble(infobubble);

	setTimeout(timeoutFunction, 20);
}

shapeLevel = shapeLevel + 1;

// Add the polyline to the map
map.addObject(polyline);
// And zoom to its bounding rectangle
map.getViewModel().setLookAtData({bounds: polyline.getBoundingBox()}, true);

routesOnMap.push(polyline);
markersOnMap.push(startMarker);
markersOnMap.push(destMarker);
	}

	//clears all routes and markers on the map
	var clearRoutes = function() {
		for (var i = 0; i < routesOnMap.length; i++) {
			map.removeObject(routesOnMap[i]);
		}
		for (var i = 0; i < markersOnMap.length; i++) {
			map.removeObject(markersOnMap[i]);
		}
		routesOnMap = [];
		markersOnMap = [];
		shapeLevel = 1;
		var bubbleArray = ui.getBubbles();
		for (var i = 0; i < bubbleArray.length; i++) {
			ui.removeBubble(bubbleArray[i]);
		}
	};
	
	/********************************************************
		Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		var sh = document.getElementById("input-start").value,
			dh = document.getElementById("input-destination").value;
		
		if(bLongClickUseForStartPoint)
		{
			clearRoutes();
			sh = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-start").value = sh;
			onClickRefresh();
			bLongClickUseForStartPoint = false;
		}
		else
		{
			clearRoutes();
			dh = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-destination").value = dh;
			onClickRefresh();
			bLongClickUseForStartPoint = true;
		}
	}
	
	/**
	* Encapsulates the geocoding of waypoints as well as related responses
	* and next steps like routing calculation.
	*/
	var geocode = function(searchText, searchText2, searchTextLatLng, searchText2LatLng, routeParams) {

		function route(routeParams, positionString) {

			// Assign position to the right waypoint.
			if (routeParams.waypoint0) {
				routeParams.waypoint1 = positionString;
			} else if (routeParams.waypoint1) {
				routeParams.waypoint0 = positionString;
			} else {
				// Meaning there is no use of "My Location"
				routeParams.waypoint0 = positionString;
				geocode(searchText2, null, regexLatLng.test(searchText2), null, routeParams);
			}

			// If all waypoints have been geocoded.
			if (searchText2 == null) {
				// Calculate route to get ETA.
				router.calculateRoute(routeParams
					, function(result) {

						//error handling for if no route exists between two locations
						try {
							var route = result.response.route[0];
							if (urlConfig.start !== "mylocation") {
								urlConfig.start = route.waypoint[0].originalPosition.latitude + "," + route.waypoint[0].originalPosition.longitude;
							}
							if (urlConfig.destination !== "mylocation") {
								urlConfig.destination = route.waypoint[1].originalPosition.latitude + "," + route.waypoint[1].originalPosition.longitude;
							}
							// Update directions URL.
							directionsLink.href = getDirectionsURL(urlConfig.mode, urlConfig.start
							, urlConfig.destination);
						} catch(err) {
							error = true;
							$("#errorMessageSpan").text(function () { return "A route could not be found between these locations" });
							Spinner.hideSpinner();
							directionsLink.href = getDirectionsURL(urlConfig.mode, urlConfig.start
							, urlConfig.destination);
							return;
						}
						addRouteToMap(route);

						//add Routing Release number if not already done
						if (releaseRoutingShown== false){
							releaseInfoTxt.innerHTML+="<br />HLP Routing: "+	result.response.metaInfo.moduleVersion;
							releaseRoutingShown = true;
						}
						// Retrieve route summary.
						var summary = result.response.route[0].summary;

						// Log raw times.
						console.log("Base time: " + summary.baseTime);
						console.log("Traffic time: " + summary.trafficTime);

						// Display formated times.
						eta.base.innerHTML = formatTime(summary.baseTime);
						var formatted = formatTime(summary.trafficTime);
						if (formatted == "N/A") {
							eta.trafficDiv.style.display = "none";
						} else {
							eta.trafficDiv.style.display = "";
							eta.traffic.innerHTML = formatted;
						}

						Spinner.hideSpinner();

					}, function(error) {
						console.error(error);
						Spinner.hideSpinner();
					});
			}
		};

		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		//if-else handles whether input is an adress or lat/lng pair
		if (!searchTextLatLng) {
			geocoder.geocode({
				searchText: searchText,
				maxResults: 1,
				jsonattributes: 1
			}, function(result) {

				// Retrieve position of geocoded waypoint. Handles error where input cannot be geocoded
				try {
					var position = result.response.view[0].result[0].location.navigationPosition[0];
				} catch(err) {
					error = true;
					$("#errorMessageSpan").text(function () { return "Could not geocode one of the locations properly" });
					Spinner.hideSpinner();
					return;
				}
				var positionString = ["geo!", position.latitude, ",", position.longitude].join("");
				route(routeParams, positionString);

			}, function(error) {
				console.error(error);
				Spinner.hideSpinner();
			});

		} else {
			searchText = searchText.replace(/\s/g, "");
			var positionString = "geo!" + searchText;
			route(routeParams, positionString);
		}
	};



	/**
	* Performs ETA retrieval on radiobox change.
	*/
	var onRadioboxChange = function(target, event) {

		var error = false;

		var bubbleArray = ui.getBubbles();
		for (var i = 0; i < bubbleArray.length; i++) {
			ui.removeBubble(bubbleArray[i]);
		}

		Spinner.showSpinner();

		// URL config to be used to generate the directions URL.
		urlConfig = {
			mode: target.value
		};

		// Init route params.
		var routeParams = {
			mode: ["fastest", target.value, "traffic:disabled"].join(";"),
			routeattributes: "none,sm,sh,wp"
		};

		// If one of the waypoints is set to My Location.
		if (start.myLocation.checked || destination.myLocation.checked) {

			// Default URL config values (will be updated later from addresses --> lat/lng pairs).
			if (start.myLocation.checked) {
				urlConfig.start = "mylocation";
				urlConfig.destination = destination.input.value;
			} else {
				urlConfig.start = start.input.value;
				urlConfig.destination = "mylocation";
			}

			navigator.geolocation.getCurrentPosition(function(myPosition) {
				processMyLocation(myPosition, routeParams)
			}, function(error) {
				console.error(error);
				Spinner.hideSpinner();
			});


		} else { // Else geocode start waypoint first.

			// Default URL config values (will be updated later from addresses --> lat/lng pairs).
			urlConfig.start = start.input.value;
			urlConfig.destination = destination.input.value;

			geocode(start.input.value, destination.input.value, regexLatLng.test(start.input.value), regexLatLng.test(destination.input.value), routeParams);


		}

		if (!error) {
			$("#errorMessageSpan").text(function () { return "N/A" });
		}

	};

	/**
	* Processes my location result and triggers geocoding of the other waypoint.
	*/
	var processMyLocation = function(myPosition, routeParams) {

		// Format my position coordinates as a string.
		var positionString = ["geo!", myPosition.coords.latitude, ","
			, myPosition.coords.longitude].join("");
			var toGeocode = null;
			if (start.myLocation.checked) {
				routeParams.waypoint0 = positionString;
				toGeocode = destination.input.value;
			} else if (destination.myLocation.checked) {
				routeParams.waypoint1 = positionString;
				toGeocode = start.input.value;
			}

			// Geocode other waypoint and pass route params.
			geocode(toGeocode, null, regexLatLng.test(toGeocode), null, routeParams);
	};

	/**
	* Performs show/hide actions on start and destination inputs depending on the
	* checkbox status.
	*/
	var onCheckboxChange = function(target, event) {
		var display = target.checked ? "none" : "";

		if (target === start.myLocation) {
			start.input.style.display = display;
			destination.myLocation.parentNode.style.display = display;
		} else {
			destination.input.style.display = display;
			start.myLocation.parentNode.style.display = display;
		}
	};

	/**
	* Generates the beta.here.com URL to be used to display the route related
	* to the current configuration.
	*/
	var getDirectionsURL = function(mode, start, destination) {
		var template = "https://share.here.com/r/" + start + "/" + destination + "?m={mode}";
		if (mode === "car") {
			mode = "d";
		} else if (mode == "pedestrian") {
			mode = "w";
		} else if (mode == "publicTransport") {
			mode = "pt";
		}
		var url = template.replace("{mode}", mode).replace("{start}", start)
		.replace("{destination}", destination);
		return url;
	};

	/**
	* Formats time in seconds to readable format.
	*/
	var formatTime = function(seconds) {
		var format = "N/A";
		if (seconds != null) {
			var h = Math.floor(seconds / 3600);
			var m = Math.floor((seconds % 3600) / 60);
			var s = Math.floor(seconds % 3600 % 60);
			format = [h, " hour", h === 1 ? ", " : "s, ",
				m, " minute", m === 1 ? ", " : "s, ",
				s, " second", s === 1 ? "" : "s"].join("");
		}
		return format;
	};

	//determines which mode radio box is checked
	function getCheckedMode() {
		var checkedMode;
		var modesRadioGroup = document.getElementsByName('input-mode');
		for (var i = 0; i < modesRadioGroup.length; i++) {
			if (modesRadioGroup[i].checked) {
				checkedMode = modesRadioGroup[i];
				break;
			}
		}
		return checkedMode;
	}

	var onClickRefresh = function() {
		onRadioboxChange(getCheckedMode());
	};


	//Implements Autocompletion API for start/destination input text boxes
	var AUTOCOMPLETION_URL = 'https://autocomplete.geocoder.api.here.com/6.2/suggest.json';
	var APPLICATION_ID = app_id;
	var APPLICATION_CODE = app_code;
	var MIN_QUERY_LENGTH = 2;
	var MAX_RESULTS = 5;

	$.widget("custom.autocompleteHighlight", $.ui.autocomplete, {
		_renderItem : function (ul, item) {
			return $('<li>' + item.label + '</li>').appendTo(ul);
		}
	});

	function autocompleter(textBoxPressEnterID) {

		$(textBoxPressEnterID).autocompleteHighlight({
			source : function (request, response) {
				$.ajax({

					url : AUTOCOMPLETION_URL,
					dataType : "json",
					data : {
						maxresults : MAX_RESULTS,
						query : request.term,
						beginHighlight : '<mark>',
						endHighlight : '</mark>',
						app_id : APPLICATION_ID,
						app_code : APPLICATION_CODE
					},

					success : function (data) {
						response($.map(data.suggestions, function (item) {
							value = item.label.replace(/(<mark>|<\/mark>)/gm, '');
							name = item.label;
							return {
								label : name,
								value : value,
							}
						})
						);
					}
				}); //ajax
			}, // source
			minLength : MIN_QUERY_LENGTH,
			select : function (event, ui) {
				if (ui.item) {
					var otherTextBoxId;
					var otherCheckBoxId;
					if (textBoxPressEnterID === "#input-start") {
						otherTextBoxId = "#input-destination";
						otherCheckBoxId = "#input-destination-mylocation";
					} else if (textBoxPressEnterID === "#input-destination") {
						otherTextBoxId = "#input-start";
						otherCheckBoxId = "#input-start-mylocation";
					}
					if ($(otherTextBoxId).val() !== "" || $(otherCheckBoxId).is(':checked')) {
						onRadioboxChange(getCheckedMode());
					}
				}
				return true;
			}
		});
	};

	autocompleter("#input-start");
	autocompleter("#input-destination");

	//calls onRadioboxChange whenever the user presses Enter in a textbox assuming the other textbox is checked or has text in it
	function onClickEnter(textBoxPressEnterID) {
		var otherTextBoxId;
		var otherCheckBoxId;
		if (textBoxPressEnterID === "#input-start") {
			otherTextBoxId = "#input-destination";
			otherCheckBoxId = "#input-destination-mylocation";
		} else if (textBoxPressEnterID === "#input-destination") {
			otherTextBoxId = "#input-start";
			otherCheckBoxId = "#input-start-mylocation";
		}
		$(document).ready(function(){
			$(textBoxPressEnterID).keypress(function(e){
				if (e.keyCode === 13) {
					if ($(textBoxPressEnterID).val() !== "" && ($(otherTextBoxId).val() !== "" || $(otherCheckBoxId).is(':checked'))) {
						onRadioboxChange(getCheckedMode());
					}
				}
			});
		});
	}

	onClickEnter("#input-start");
	onClickEnter("#input-destination");

	map.addEventListener('tap', function (evt) {
		if (evt.target instanceof H.map.Marker) {
			// increase zIndex of the marker that was tapped
			evt.target.setZIndex(zIndex++);
		}
	});


	// Kick off the app.
	kickoff();