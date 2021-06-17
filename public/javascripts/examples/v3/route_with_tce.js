/*
		* authors ez,ah,mc
		* (C) HERE 2015
		*
		* This is an example implementation of the route toll cost calculation offered by HERE.
		* With a calculated route the route toll cost calculation service gets called and the
		* response is presented in a summary.
		* Please note that not all possible details of the route toll cost service is analysed
		* by this demo.
		*
		* Cause JS has the limitations of GET request URL length there are several calls done to
		* the route toll cost service. The route (links) gets split in overlapping segments.
		* If they would not overlap you could loose toll informations which are only present between
		* specific segments (links). Since the route toll cost service responds possibly with
		* the same toll on the same links - the result gets post-processed to exclude the double
		* toll costs. This limitation does not exists using POST or GET within other applications.
		*/
		(function setValuesFromUrl() {
			var indexOf = window.location.href.indexOf('?');
			if (indexOf < 0) return;
			var vars = window.location.href.slice(indexOf + 1).split('&');

			for (var i = 0; i < vars.length; i++) {
				nameVal = vars[i].split('=');
				if (!nameVal[0]) continue;
				document.getElementById(nameVal[0]).value = decodeURIComponent(nameVal[1]);
			}

		})();

		function cloneSettingsInNewWindow() {
			var url = location.protocol + '//' + location.host + location.pathname + '?';
			var inputs = document.getElementsByTagName('input');
			for (var i = 0; i < inputs.length; i++) {
				url += inputs[i].id + '=' + encodeURIComponent(inputs[i].value) + '&';
			}
			var inputs = document.getElementsByTagName('select');
			for (var i = 0; i < inputs.length; i++) {
				url += inputs[i].id + '=' + inputs[i].value + '&';
			}

			window.open(url);
		}

		var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		var mapContainer = document.getElementById('mapContainer');

		// check if the site was loaded via secure connection
		var secure = (location.protocol === 'https:') ? true : false;

		// Create a platform object to communicate with the HERE REST APIs
		var platform = new H.service.Platform({
			app_id: app_id,
			app_code: app_code,
			useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		geocoder = platform.getGeocodingService(),
		router = platform.getRoutingService(),
		group = new H.map.Group(),
		markerGroup = new H.map.Group(),
		map = new H.Map(mapContainer, maptypes.normal.map,
			{
				center: center,
				zoom: zoom
			}
		);

		// Do not draw under control panel
		map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

		// add behavior control
		new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

		// add UI
		var ui = H.ui.UI.createDefault(map, maptypes);

		//add JS API Release information
		releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;

		//add MRS Release information
		loadMRSVersionTxt();

		//helper
		var releaseGeocoderShown = false;
		var releaseRoutingShown = false;

		// setup the Streetlevel imagery
		platform.configure(H.map.render.panorama.RenderEngine);

		// add window resizing event listener
		window.addEventListener('resize', function () {
			map.getViewPort().resize();
		});

		// add long click in map event listener
		map.addEventListener('longpress', handleLongClickInMap);

		var routeButton = document.getElementById("routeButton");
		var start = document.getElementById("start");
		var dest = document.getElementById("dest");
		var mapReleaseTxt = document.getElementById("mapReleaseTxt");

		var pointA;
		var pointB;
		var startMarker = null;
		var destMarker = null;
		var routeLinkHashMap = new Object(); // key = linkID, value = link object
		var routerMapRelease;
		var release;
		var currentBubble;
		var currentOpenBubble;
		var bErrorHappened = false;
		var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination

		var routeColor = ["rgba(18, 65, 145, 0.8)", "rgba(0, 145, 255, 0.7)", "rgba(127, 201, 255, 0.6)"];
		var ppType_A_Color = ["rgba(255, 255, 0, 0.8)", "rgba(255, 255, 0, 0.7)", "rgba(255, 255, 0, 0.6)"];
		var ppType_a_Color = ["rgba(255, 216, 0, 0.8)", "rgba(255, 216, 0, 0.7)", "rgba(255, 216, 0, 0.6)"];
		var ppType_S_Color = ["rgba(255, 0, 0, 0.8)", "rgba(255, 0, 0, 0.7)", "rgba(255, 0, 0, 0.6)"];
		var ppType_p_Color = ["rgba(255, 127, 127, 0.8)", "rgba(255, 127, 127, 0.7)", "rgba(255, 127, 127, 0.6)"];
		var ppType_F_Color = ["rgba(214, 127, 255, 0.8)", "rgba(214, 127, 255, 0.7)", "rgba(214, 127, 255, 0.6)"];
		var ppType_K_Color = ["rgba(178, 0, 255, 0.8)", "rgba(178, 0, 255, 0.7)", "rgba(178, 0, 255, 0.6)"];
		var ppType_U_Color = ["rgba(0, 204, 0, 0.8)", "rgba(0, 204, 0, 0.7)", "rgba(0, 204, 0, 0.6)"];
		var tollCostStroke = 8, routeStroke = 8;
		var strRoutingRequestSend = "Routing request sent. Waiting for response...";
		var strTceRequestSend = "Route Toll Cost request sent and logged. Waiting for response...";
		var strTceError = "An Error happened during Route Toll Cost calculation. Please check the vehicle specification<br/>F.e. Trailer number set but no trailer type.";
		var strTceResponseReceived = "Received TCE response. Processing it now.";
		// toll image
		var tollImg = document.createElement("img");
		tollImg.src = "/assets/icons/toll_20_10.png";
		var tollIcon = new H.map.Icon(tollImg, {anchor: new H.math.Point(0, 10)});
		map.addObject(markerGroup);

		/************************************

		Geocoding and routing methods

		************************************/

		/***/
		function clearLastRouteCalculation() {
			bErrorHappened = false;
			bLongClickUseForStartPoint = true;
			if (currentOpenBubble) {
				ui.removeBubble(currentOpenBubble);
			}
			group.removeAll();

		}

		/************************************
		Start Route Calculation
		************************************/
		var startRouteCalculation = function () {
			clearLastRouteCalculation();
			geocode(start.value, true);
		}
		routeButton.onclick = startRouteCalculation;

		/********************************************************
		Start/Destination selectin via LongClick in map
		********************************************************/
		function handleLongClickInMap(currentEvent) {
			var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

			if (bLongClickUseForStartPoint) {
				clearLastRouteCalculation();
				var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
				var line2 = null;
				start.value = line1;
				pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
				if (startMarker != null) {
					markerGroup.removeObject(startMarker);
				}
				startMarker = new H.map.Marker(pointA,
					{
						icon: createIconMarker(line1, line2)
					});
					markerGroup.addObject(startMarker);
					bLongClickUseForStartPoint = false;
			}
			else {
				var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
				var line2 = null;
				dest.value = line1;
				pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
				if (destMarker != null) {
					markerGroup.removeObject(destMarker);
				}
				destMarker = new H.map.Marker(pointB,
					{
						icon: createIconMarker(line1, line2)
					});
					markerGroup.addObject(destMarker);
					bLongClickUseForStartPoint = true;
			}
		}

		/************************************
		Geocode start/destination
		************************************/
		var geocode = function (searchTerm, start) {
			//add Geocoder Release information if not already done
			if (releaseGeocoderShown == false) {
				loadGeocoderVersionTxt();
				releaseGeocoderShown = true;
			}
			geocoder.search(
				{
					searchText: searchTerm
				},
				function (result) {
					if (result.Response.View[0].Result[0].Location != null) {
						pos = result.Response.View[0].Result[0].Location.DisplayPosition;
					}
					else {
						pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
					}

					if (start)
						pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
					else
						pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

					if (result.Response.View[0].Result[0].Location != null) {
						address = result.Response.View[0].Result[0].Location.Address;
					}
					else {
						address = result.Response.View[0].Result[0].Place.Locations[0].Address;
					}


					line1 = pos.Latitude + " " + pos.Longitude;
					line2 = address.Label;

					if (start) {
						if (startMarker != null) {
							markerGroup.removeObject(startMarker);
						}
						startMarker = new H.map.Marker(pointA,
							{
								icon: createIconMarker(line1, line2)
							});
							markerGroup.addObject(startMarker);

					}
					else {
						if (destMarker != null) {
							markerGroup.removeObject(destMarker);
						}
						destMarker = new H.map.Marker(pointB,
							{
								icon: createIconMarker(line1, line2)
							});
							markerGroup.addObject(destMarker);
							map.setViewBounds(markerGroup.getBounds());
					}


					if (start)
						geocode(dest.value, false);
					else
						calculateRoute(pointA, pointB);
				},
				function (error) {
					alert(error);
				}
			);
		}

		/************************************
		Actual Route Calculation
		************************************/
		var calculateRoute = function (start, destination) {

			// generate routing request
			var transportMode = "car";
			if (vehicles.value == "3" || vehicles.value == "9") {
				transportMode = "truck"
			}
			if (vehicles.value == "9" && serverURL.value.search("fleet") != -1 ) {
				transportMode = "delivery"
			}

			var hasTrailer = null;
			var shippedHazardousGoods = null;
			var limitedWeight = null;
			var trailerWeight = null;
			var height = null;
			var width = null;
			var length = null;
			var heightAbove1stAxle = null;


			if (parseInt(trailerType.value) > 0) {
				hasTrailer = "&trailersCount=1";
			}

			if (parseInt(hazardousType.value) == 1) {
				shippedHazardousGoods = "&shippedHazardousGoods=explosive";
			}
			else if (parseInt(hazardousType.value) == 2) {
				shippedHazardousGoods = "&shippedHazardousGoods=other";
			}

			if (parseInt(vehWeight.value) > 0) {
				if (parseInt(vehWeight.value) > parseInt(totalWeight.value)) {
					alert("Total Weight cannot be smaller than Vehicle Weight");
					return;
				}
				limitedWeight = "&limitedWeight=" + (totalWeight.value / 1000) + "t";// router 7.2 used by TCE includes trailer weight
			}


			if (parseInt(vehHeight.value) > 0 || parseInt(trailerHeight.value) > 0) {
				height = "&height=" + ((parseInt(vehHeight.value) > parseInt(trailerHeight.value) ? parseInt(vehHeight.value) : parseInt(trailerHeight.value)) / 100) + "m";
			}

			if (parseInt(totalWidth.value) > 0) {
				width = "&width=" + (totalWidth.value / 100) + "m";
			}

			if (parseInt(totalLength.value) > 0) {
				length = "&length=" + (totalLength.value / 100) + "m";
			}
			
			if(document.getElementById("heightAbove1stAxle").value != 0) {
				heightAbove1stAxle = (document.getElementById("heightAbove1stAxle").value / 100)  + "m";
			}

			var vspec = "";
			vspec += "&tollVehicleType=" + vehicles.value;
			vspec += "&trailerType=" + trailerType.value;
			vspec += "&trailersCount=" + trailerNr.value;
			vspec += "&vehicleNumberAxles=" + nrOfAxlesVehicle.value;
			vspec += "&trailerNumberAxles=" + nrOfAxlesTrailer.value;
			vspec += "&hybrid=" + hybrid.value;
			vspec += "&emissionType=" + emissionType.value;
			vspec += "&fuelType=" + fuelType.value;
			if (height != null && height.length > 0) vspec += height;
			vspec += "&trailerHeight=" + trailerHeight.value;
			vspec += "&vehicleWeight=" + vehWeight.value;
			if (limitedWeight != null && limitedWeight.length > 0) vspec += limitedWeight;
			vspec += "&disabledEquipped=" + disabledEquipped.value;
			vspec += "&minimalPollution=" + minPollution.value;
			vspec += "&hov=" + hov.value;
			vspec += "&passengersCount=" + nrPassengers.value;
			vspec += "&tiresCount=" + nrOfTotalTires.value;
			vspec += "&commercial=" + commercial.value;
			vspec += "&heightAbove1stAxle=" + heightAbove1stAxle;
			if (width != null && width.length > 0) vspec += width;
			if (length != null && length.length > 0) vspec += length;
			if (shippedHazardousGoods != null && shippedHazardousGoods.length > 0) vspec += shippedHazardousGoods;
			var routerParamsValue = document.getElementById('routerParamsValue').value;
			var finalParamsValue = '';
			if (routerParamsValue !== '') {
				var paramsArray = [];
				var components = routerParamsValue.split('&');
				for (var i = 0; i < components.length; i++) {
					var key = components[i].split('=');
					if (key[0].substr(0, 'waypoint'.length) === 'waypoint') {
						continue;// ignore waypoints because we already specified.
					}
					if (key[0] === 'mode') {
						continue;// Ignore mode since cor build this inside
					}
					paramsArray.push(components[i]);
				}
				finalParamsValue = paramsArray.join('&');
			}

			var routeAlternativesRequested = false;
			if(document.getElementById("routeAlternatives").value != null && document.getElementById("routeAlternatives").value != "0") {
				routeAlternativesRequested = true;
			}
			var isDTFilteringEnabled = document.getElementById("chkEnableDTFiltering").checked;

			var rollupPrm = serverURL.value.search("fleet") != -1 ? "rollups" : "rollup"
			var urlRoutingReq =
			[
				serverURL.value + "/2/calculateroute.json?",
				"jsonAttributes=41",
				"&waypoint0=",
				start.lat,
				",",
				start.lng,
				"&detail=1",
				"&waypoint1=",
				destination.lat,
				",",
				destination.lng,
				"&maneuverAttributes=none",
				"&linkAttributes=none,sh",
				"&legAttributes=none,li",
				"&currency=",
				document.getElementById('currency').value,
				"&departure=",
				isDTFilteringEnabled? document.getElementById("startRouteDate").value + 'T' + document.getElementById("startRouteTime").value : '',
				vspec,
				"&mode=fastest;" + transportMode + ";traffic:disabled",
				//((width != null && width.length > 0) ? width : ""), //this parameter has already been added in the vspec so no need to add it again
				//((length != null && length.length > 0) ? length : ""), //this parameter has already been added in the vspec so no need to add it again
				((shippedHazardousGoods != null && shippedHazardousGoods.length > 0) ? shippedHazardousGoods : ""),
				"&"+rollupPrm+"=none,country;tollsys",
				(routeAlternativesRequested ? "&alternatives=" + document.getElementById("routeAlternatives").value  : ''),
				// Additional custom parameters
				(finalParamsValue !== '' ? '&' + finalParamsValue : ''),
				"&app_id=",
				app_id,
				"&app_code=",
				app_code,
				"&jsoncallback=parseRoutingResponse"].join("");

				feedbackTxt.innerHTML = strRoutingRequestSend;
				script = document.createElement("script");
				script.src = urlRoutingReq;
				document.body.appendChild(script);
		}

		/************************************
		parse the routing response
		************************************/
		function parseRoutingResponse(resp) {
			if (resp.errors != undefined && resp.errors.length != 0) {
				if (resp.errors[resp.errors.length-1] == "NoRouteFound") {
					alert('Please consider to change your start or destination as the one you entered is not reachable with the given vehicle profile');
					feedbackTxt.innerHTML = 'The Router service is unable to compute the route: try to change your start / destination point';
				}
				else {
					alert(JSON.stringify(resp));
					feedbackTxt.innerHTML = JSON.stringify(resp);
				}
				return;
			}
			if (resp.response == undefined) {
				if (resp.subtype == "NoRouteFound") {
					alert('Please consider to change your start or destination as the one you entered is not reachable with the given vehicle profile');
					feedbackTxt.innerHTML = 'The Router service is unable to compute the route: try to change your start / destination point';
				} else if(resp.issues !== undefined && resp.issues.length > 0) {
					alert("Please consider to change your start or destination as the one you entered is not reachable with the given vehicle profile. Some routes need the &tollPass=transponder parameter.")
					feedbackTxt.innerHTML = resp.issues[0].message;
				}
				else {
					alert(resp.subtype + " " + resp.details);
					feedbackTxt.innerHTML = resp.error;
				}
				return;
			}

			routeLinkHashMap = new Object();

			// create link objects
			for (var r = 0; r < resp.response.route.length; r++) {
				for (var m = 0; m < resp.response.route[r].leg[0].link.length; m++) {
					var strip = new H.geo.Strip(),
					shape = resp.response.route[r].leg[0].link[m].shape,
					i,
					l = shape.length;

					for (i = 0; i < l; i += 2) {
						strip.pushLatLngAlt(shape[i], shape[i + 1], 0);
					}

					var link = new H.map.Polyline(strip,
						{
							style: {
								lineWidth: (routeStroke - (r + 1)), // alternatives get smaller line with
								strokeColor: routeColor[r],
								lineCap: 'butt'
							}
						});
						link.setArrows({color: "#F00F", width: 2, length: 3, frequency: 4});
						link.$linkId = resp.response.route[r].leg[0].link[m].linkId;

						//The router can send back links ids with "-" or "+" prefix: only "-" prefix is kept and stored in this HashMap, the "+" is removed
						routeLinkHashMap[(resp.response.route[r].leg[0].link[m].linkId.lastIndexOf("+", 0) === 0 ? resp.response.route[r].leg[0].link[m].linkId.substring(1) : resp.response.route[r].leg[0].link[m].linkId)] = link;

						// add event listener to link
						link.addEventListener("pointerdown", function (e) {
							if (currentOpenBubble)
								ui.removeBubble(currentOpenBubble);
							var html = '<div>' +
								'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkId: ' + e.target.$linkId + '</p>'
							'</div>';

							var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

							currentOpenBubble = new H.ui.InfoBubble(pos, {content: html});
							ui.addBubble(currentOpenBubble);
						});

						group.addObject(link);
				}
			}

			map.addObject(group);
			//map.setViewBounds(group.getBounds());

			// show TCE costs
			showTceCost(resp.response.route[0].tollCost.costsByCountryAndTollSystem, resp.response.route[0].cost, resp.warnings);

			/***********************************************
			Highlight Links
			***********************************************/
			for(var i = 0; i < resp.response.route.length; i++) {
				highlightRoute(resp.response.route[i].tollCost.routeTollItems, i);
			}
		}

		/**************************************************
		show route toll cost response
		**************************************************/
		function showTceCost(costByCountryAndTollSystem, costs, warnings) {
			
			/***********************************************

			Publishing route total cost

			***********************************************/

			feedbackTxt.innerHTML = "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">COSTS FOR MAIN ROUTE</span>";
			if(warnings)
			{
				for(var j = 0; j < warnings.length; j++)
				{
					// check only category 10 -> boat ferry and train ferry, both can be on one route.
					if(warnings[j].category == 10 && warnings[j].context.includes("boat"))
					{
						feedbackTxt.innerHTML += "<br/></br><span style=\"color:#ff0000\">Route contains boat ferry links which might add cost</span>";
					}
					else if(warnings[j].category == 10 && warnings[j].context.includes("train"))
					{
						feedbackTxt.innerHTML += "<br/></br><span style=\"color:#ff0000\">Route contains train ferry links which might add cost</span>";
					}
				}
			}

			if (!costs) {
				feedbackTxt.innerHTML += "<br/><br/>None.";
			} else {
				feedbackTxt.innerHTML += "<br/><br/><span>Total Cost: " + costs.totalCost + " " + costs.currency + "</span>";
				feedbackTxt.innerHTML += "<ul><li>Driver Cost: " + costs.details.driverCost + " " + costs.currency + "</li></ul>";
				feedbackTxt.innerHTML += "<ul><li>Vehicle Cost: " + costs.details.vehicleCost + " " + costs.currency + "</li></ul>";
				feedbackTxt.innerHTML += "<ul><li>Toll Cost: " + costs.details.tollCost + " " + costs.currency + "</li></ul>";
			}

			/***********************************************

			Publishing route detail cost

			***********************************************/

			feedbackTxt.innerHTML += "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">TOLL COST FOR MAIN ROUTE</span>";

			if (costs.details.tollCost == 0.0) {
				feedbackTxt.innerHTML += "<br/><br/>None.<br/><br/>";
			}

			/***********************************************
			Apply toll to link objects
			***********************************************/
			if(costByCountryAndTollSystem != null) {
				var feedback = "";
				feedback += "<br/>";
				for (var j = 0; j < costByCountryAndTollSystem.length; j++) {
					feedback += "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">" + costByCountryAndTollSystem[j].country + "</span>"
					feedback += "<ul><li>";
					if(costByCountryAndTollSystem[j].name != null && costByCountryAndTollSystem[j].name.trim().length > 0) {
						feedback += "Toll System " + costByCountryAndTollSystem[j].name + ": ";
					} else if(costByCountryAndTollSystem[j].tollSystemId != null && costByCountryAndTollSystem[j].tollSystemId.trim().length > 0) {
						feedback += "Toll System ID " + costByCountryAndTollSystem[j].tollSystemId + ": "
					} else {
						feedback += "Toll : ";
					}
					feedback += costByCountryAndTollSystem[j].amountInTargetCurrency + " " + costs.currency;
					feedback += "</li></ul>";
				}

				feedbackTxt.innerHTML += feedback;
			}

			if (costs.details.tollCost != 0.0) {
				feedbackTxt.innerHTML += "<br/><br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_A_Color[0]) + ";\">Paypoint Type A: Country wide toll - payed here.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_a_Color[0]) + ";\">Paypoint Type A: Country wide toll - payed somewhere else.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_S_Color[0]) + ";\">Paypoint Type S: Toll section from one toll booth or between two toll boths.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_p_Color[0]) + ";\">Paypoint Type p: Toll - payed somewhere else.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_F_Color[0]) + ";\">Paypoint Type F: Toll section belonging to a toll system.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_K_Color[0]) + ";\">Paypoint Type K: Toll section defined between junctions.</span>";
				feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_U_Color[0]) + ";\">UFR: Usage fee required link(s).</span>";
			}

			return; // done

		}

		/**
			Highlights the toll links in map display
		*/
		function highlightRoute(routeTollItems, routeAlternative) {
			if (routeTollItems != null) {
				for (var i = 0; i < routeTollItems.length; i++) {
					var tollType = routeTollItems[i].tollType;
					var color = ppType_S_Color[routeAlternative];
					if(tollType == 'A') {
						color = ppType_A_Color[routeAlternative];
					} else if(tollType == 'a') {
						color = ppType_a_Color[routeAlternative];
					} else if(tollType == 'S'){
						color = ppType_S_Color[routeAlternative];
					} else if(tollType == 'p'){
						color = ppType_p_Color[routeAlternative];
					} else if(tollType == 'F'){
						color = ppType_F_Color[routeAlternative];
					} else if(tollType == 'K'){
						color = ppType_K_Color[routeAlternative];
					} else if(tollType == 'U'){
						color = ppType_U_Color[routeAlternative];
					} 

					for (var j = 0; j < routeTollItems[i].linkIds.length; j++) {
						// set color and stroke of links
						var tollstroke = (tollCostStroke - (routeAlternative + 1));	// route alternatives have a different stroke
						var link = routeLinkHashMap[routeTollItems[i].linkIds[j]];
						if(link.getStyle().strokeColor == routeColor[routeAlternative]) { // only change link color to toll color if not already modified
							link.setStyle({strokeColor: color, lineWidth: tollstroke});
					}
					}

					//toll structures
					if(routeTollItems[i].tollStructures != null) {
						for (var j = 0; j < routeTollItems[i].tollStructures.length; j++) {
							createTollMarker(routeTollItems[i].tollStructures[j]);
						}
					}
				}
			}

		}

		//--- Helper - Create Start / Destination marker
		var createIconMarker = function (line1, line2) {
			var svgMarker = svgMarkerImage_Line;

			svgMarker = svgMarker.replace(/__line1__/g, line1);
			svgMarker = svgMarker.replace(/__line2__/g, (line2 != undefined ? line2 : ""));
			svgMarker = svgMarker.replace(/__width__/g, (line2 != undefined ? line2.length * 4 + 20 : (line1.length * 4 + 80)));
			svgMarker = svgMarker.replace(/__widthAll__/g, (line2 != undefined ? line2.length * 4 + 80 : (line1.length * 4 + 150)));

			return new H.map.Icon(svgMarker, {
				anchor: new H.math.Point(24, 57)
			});

		};

		// Toll cost object (country)
		function CountryTce() {
			this.name = "";
			this.adminAdmissionCost = [];	// CostTce array
			this.roadSectionCost = [];		// CostTce array
			this.tollSystemsNames = [];     // TollSystem array
			this.usageFeeRequiredLinks = null;
		}

		function TollSystem() {
			this.id = null;
			this.names = [];  // TollSystemName array
		}

		function TollSystemName() {
			this.languageCode = null;
			this.name = null;
		}

		// Toll cost object (toll info)
		function CostTce() {
			this.name = "";
			this.linkIds = []; // String array
		this.conditions = []; // TceConditon array
		this.tollStructures = []; // TollStructure array
	}

	function TollStructure() {
		this.linkId1 = "";
		this.linkId2 = "";
		this.name = "";
		this.lngCode = "";
		this.latitude = 0;
		this.longitude = 0;
	}

	// Toll cost object (conditions)
	function TceCondition() {
		this.time = null;
		this.pass = null;
		this.amount = null;
		this.currency = null;
		this.methodsOfPayment = null;
		this.daylightHours = null;
		this.discountAvailable = null;
		this.tollSystemsIds = null;
	}

	// Helper for selecting the value attached to a JS selection
	function selectionSettingHelper(selection, value) {
		for (var opt, j = 0; opt = selection.options[j]; j++) {
			if (opt.value == value) {
				selection.selectedIndex = j;
				break;
			}
		}
	}

	//Returns the name of the provided toll system id
	function getTollSystemName(tollSystemId, tollSystemsNames) {

		//Case 1: only one toll system id
		if (tollSystemId.indexOf(",") == -1) {
			return getTollSystemNameWithLanguageCode(tollSystemId, tollSystemsNames, "ENG");
		}

		//Case 2: 2 toll systems ids separated by a comma
		var splitTsn = tollSystemId.split(",");
		return (getTollSystemNameWithLanguageCode(splitTsn[0], tollSystemsNames, "ENG") + " , " + getTollSystemNameWithLanguageCode(splitTsn[1], tollSystemsNames, "ENG"));
	}

	//Retrieves the name related to the specified language code for the provided toll system id
	function getTollSystemNameWithLanguageCode(tollSystemId, tollSystemsNames, lngCode) {
		for (var i = 0; i < tollSystemsNames.length; i++) {
			if (tollSystemsNames[i].id == tollSystemId) {
				for (var j = 0; j < tollSystemsNames[i].names.length; j++) {
					if (tollSystemsNames[i].names[j].languageCode == lngCode) {
						return tollSystemsNames[i].names[j].name;
					}
				}
			}
		}

		return "";
	}

	/*********************************
	 Vehicle Specification
	 *********************************/
	/**
	 This method checks the user setted vehicle specification and adapts all vehicle value in the GUI
	 */
	function handleVehicleSpecChanged() {
		setUserdefinedVehicleSpec(false);
		var vehicle = 2;
		var totalNumTires = 4;
		var trailerType = 0;
		var trailerNum = 0;
		var vehicleNumAxles = 2;
		var trailerNumAxles = 0;
		var hybrid = 0;
		var emmisionType = 5;
		var vehicleHeight = 167;
		var vehicleWeight = 1739;
		var trailerHeight = 0;
		var totalWeight = 1739;
		var totalWidth = 180;
		var totalLength = 441;
		var disabledEquipped = 0;
		var minPollution = 0;
		var hov = 0;
		var numPassengers = 2;
		var commercial = 0;
		var hazardousType = 0;
		var heightAbove1stAxle = 100;
		var fuelType = 'petrol';

		var vehSpecSelection = document.getElementById("predefinedVehSpec");
		if (vehSpecSelection.value == 0) // Car
		{
			vehicle = 2;
			totalNumTires = 4;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 2;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 167;
			vehicleWeight = 1739;
			trailerHeight = 0;
			totalWeight = 1739;
			totalWidth = 180;
			totalLength = 441;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 2;
			commercial = 0;
			hazardousType = 0;
			heightAbove1stAxle = 100;
			fuelType = 'petrol';
		}
		else if (vehSpecSelection.value == 1) // Delivery Truck
		{
			vehicle = 9;
			totalNumTires = 4;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 2;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 255;
			vehicleWeight = 3500;
			trailerHeight = 0;
			totalWeight = 3500;
			totalWidth = 194;
			totalLength = 652;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 1;
			hazardousType = 0;
			heightAbove1stAxle = 130;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 2) // Truck 7.5t
		{
			vehicle = 3;
			totalNumTires = 4;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 2;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 340;
			vehicleWeight = 7500;
			trailerHeight = 0;
			totalWeight = 7500;
			totalWidth = 250;
			totalLength = 720;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 1;
			hazardousType = 0;
			heightAbove1stAxle = 300;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 3) // Truck 11t
		{
			vehicle = 3;
			totalNumTires = 6;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 2;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 380;
			vehicleWeight = 11000;
			trailerHeight = 0;
			totalWeight = 11000;
			totalWidth = 255;
			totalLength = 1000;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 1;
			hazardousType = 0;
			heightAbove1stAxle = 300;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 4) // Truck one trailer 38t
		{
			vehicle = 3;
			totalNumTires = 10;
			trailerType = 2;
			trailerNum = 1;
			vehicleNumAxles = 2;
			trailerNumAxles = 3;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 400;
			vehicleWeight = 24000;
			trailerHeight = 400;
			totalWeight = 38000;
			totalWidth = 255;
			totalLength = 1800;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 1;
			hazardousType = 0;
			heightAbove1stAxle = 300;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 5) // Trailer Truck 40t
		{
			vehicle = 3;
			totalNumTires = 14;
			trailerType = 2;
			trailerNum = 1;
			vehicleNumAxles = 3;
			trailerNumAxles = 2;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 400;
			vehicleWeight = 12000;
			trailerHeight = 400;
			totalWeight = 40000;
			totalWidth = 255;
			totalLength = 1650;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 1;
			hazardousType = 0;
			heightAbove1stAxle = 300;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 6) // Car with Trailer
		{
			vehicle = 2;
			totalNumTires = 6;
			trailerType = 2;
			trailerNum = 1;
			vehicleNumAxles = 2;
			trailerNumAxles = 1;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 167;
			vehicleWeight = 1739;
			trailerHeight = 167;
			totalWeight = 2589;
			totalWidth = 180;
			totalLength = 733;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 1;
			commercial = 0;
			hazardousType = 0;
			heightAbove1stAxle = 100;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 7) // Bus
		{
			vehicle = 3;
			totalNumTires = 6;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 3;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 371;
			vehicleWeight = 17500;
			trailerHeight = 0;
			totalWeight = 17500;
			totalWidth = 253;
			totalLength = 1300;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 51;
			commercial = 1;
			hazardousType = 0;
			eightAbove1stAxle = 300;
			fuelType = 'diesel';
		}
		else if (vehSpecSelection.value == 8) // Motor Home
		{
			vehicle = 3;
			totalNumTires = 4;
			trailerType = 0;
			trailerNum = 0;
			vehicleNumAxles = 2;
			trailerNumAxles = 0;
			hybrid = 0;
			emmisionType = 5;
			vehicleHeight = 372;
			vehicleWeight = 4535;
			trailerHeight = 0;
			totalWeight = 4535;
			totalWidth = 254;
			totalLength = 760;
			disabledEquipped = 0;
			minPollution = 0;
			hov = 0;
			numPassengers = 4;
			commercial = 0;
			hazardousType = 0;
			heightAbove1stAxle = 140;
			fuelType = 'diesel';
		}

		selectionSettingHelper(document.getElementById("vehicles"), vehicle);
		document.getElementById("nrOfTotalTires").value = totalNumTires;
		selectionSettingHelper(document.getElementById("trailerType"), trailerType);
		selectionSettingHelper(document.getElementById("trailerNr"), trailerNum);
		document.getElementById("nrOfAxlesVehicle").value = vehicleNumAxles;
		document.getElementById("nrOfAxlesTrailer").value = trailerNumAxles;
		selectionSettingHelper(document.getElementById("hybrid"), hybrid);
		selectionSettingHelper(document.getElementById("emissionType"), emmisionType);
		document.getElementById("vehHeight").value = vehicleHeight;
		document.getElementById("vehWeight").value = vehicleWeight;
		document.getElementById("trailerHeight").value = trailerHeight;
		document.getElementById("totalWeight").value = totalWeight;
		document.getElementById("totalWidth").value = totalWidth;
		document.getElementById("totalLength").value = totalLength;
		selectionSettingHelper(document.getElementById("disabledEquipped"), disabledEquipped);
		selectionSettingHelper(document.getElementById("minPollution"), minPollution);
		selectionSettingHelper(document.getElementById("hov"), hov);
		document.getElementById("nrPassengers").value = numPassengers;
		selectionSettingHelper(document.getElementById("commercial"), commercial);
		selectionSettingHelper(document.getElementById("hazardousType"), hazardousType);
		selectionSettingHelper(document.getElementById("fuelType"), fuelType);
	}

	/**
	 This method sets the user defined vehicle spec option in the element predefinedVehSpec if
	 the passed parameter is true
	 */
	function setUserdefinedVehicleSpec(bSetUserdefinedVehicleSpec) {
		if (bSetUserdefinedVehicleSpec) {
			// show User defined option
			var vehSpecSelection = document.getElementById("predefinedVehSpec");
			selectionSettingHelper(vehSpecSelection, 99);
		}
		/*else
		 {
		 // do nothing cause User defined option will hide automatically
		 }*/
	}

	/**
	 This method returns a string of the payment methods of the passed condition like '(Creditcard, Bank Card)'
	 */
	function extractMethodOfPayment(condition) {
		var strRet = "(";
		var methodOfPayment = condition.methodsOfPayment;
		var count = 0;
		while (methodOfPayment > 0) {
			if (count > 0) {
				strRet += ","
			}
			if ((methodOfPayment - 128) >= 0) {
				strRet += "Travel card"
				methodOfPayment -= 128;
			}
			else if ((methodOfPayment - 64) >= 0) {
				strRet += "Exact cash"
				methodOfPayment -= 64;
			}
			else if ((methodOfPayment - 32) >= 0) {
				strRet += "Video toll charge"
				methodOfPayment -= 32;
			}
			else if ((methodOfPayment - 16) >= 0) {
				strRet += "Transponder"
				methodOfPayment -= 16;
			}
			else if ((methodOfPayment - 8) >= 0) {
				strRet += "Pass"
				methodOfPayment -= 8;
			}
			else if ((methodOfPayment - 4) >= 0) {
				strRet += "Creditcard"
				methodOfPayment -= 4;
			}
			else if ((methodOfPayment - 2) >= 0) {
				strRet += "Bank Card"
				methodOfPayment -= 2;
			}
			else if ((methodOfPayment - 1) >= 0) {
				strRet += "Cash"
				methodOfPayment -= 1;
			}
			count++;
		}
		strRet += ")";

		return strRet;
	}

	/**
	This method creates the toll marker at the beginning of the passed link
	*/
	function createTollMarker(oneTollStructure)
	{
		var pos= new H.geo.Point(oneTollStructure.latitude, oneTollStructure.longitude);
		var tollMarker = new H.map.Marker(pos, { icon: tollIcon });
		tollMarker.addEventListener("tap",function() {displayTollStructureName(pos,oneTollStructure.name);});
		group.addObject(tollMarker);
	}

	function displayTollStructureName(position,name){
		infoBubble = new H.ui.InfoBubble(position, { content: name });
		ui.addBubble(infoBubble);
	}

	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb) {
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
	}

	// Check if a string is null/undefined/withoutContent
	function isEmpty(str) {
    return (!str || 0 === str.length);
	}


	/**
	 * Function handling the click on the "Enable datetime filtering" checkbox
	 */
	function handleDateTimeFilteringClicked() {
		var isDTFilteringEnabled = document.getElementById("chkEnableDTFiltering").checked;
		if (isDTFilteringEnabled) {
			//Displaying the date and time input checkboxes
			document.getElementById("trStartRouteDate").style.display = '';
			document.getElementById("trStartRouteTime").style.display = '';
			document.getElementById("trStartRouteActions").style.display = '';
		}
		else {
			//Hiding the date and time input checkboxes
			document.getElementById("trStartRouteDate").style.display = 'none';
			document.getElementById("trStartRouteTime").style.display = 'none';
			document.getElementById("trStartRouteActions").style.display = 'none';
		}

	}

	function applyNowToStartRoute() {

		//Getting now datetime informations
		var now = new Date();
		var day = now.getDate();
		var month = now.getMonth() + 1; //January is 0!
		var year = now.getFullYear();
		var hours = now.getHours()
		var minutes = now.getMinutes()
		var seconds = now.getSeconds()

		//Setting these info in the datetime fields
		document.getElementById("startRouteDate").value = year + '-' + ((month < 10) ? '0' + month : month) + '-' + ((day < 10) ? '0' + day : day);
		document.getElementById("startRouteTime").value = ((hours < 10) ? '0' + hours : hours) + ':' + ((minutes < 10) ? '0' + minutes : minutes) + ':' + ((seconds < 10) ? '0' + seconds : seconds);
	}