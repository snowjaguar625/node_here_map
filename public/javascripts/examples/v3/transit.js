/*
	author vschul
	(C) HERE 2015
	*/

	//which color are we on?
	var clrcnt = 0;
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id : app_id,
		app_code : app_code,
		useHTTPS : secure
	}), maptypes = platform.createDefaultLayers( hidpi ? 512 : 256, hidpi ? 320 : null),
		geocoder = platform.getGeocodingService(),
		router = platform.getRoutingService(),
		start = H.geo.Point(50.11208, 8.68342),
		destination = H.geo.Point(50.14041, 8.57211),
		metricSystem = true, lang = "en-GB",
		markerLayer = new H.map.Group(),
		polylineLayerCon0 = new H.map.Group(),
		polylineLayerCon1 = new H.map.Group(),
		polylineLayerCon2 = new H.map.Group(),
		polylineLayerCon3 = new H.map.Group(),
		markerLayerCon0 = new H.map.Group(),
		markerLayerCon1 = new H.map.Group(),
		markerLayerCon2 = new H.map.Group(),
		markerLayerCon3 = new H.map.Group(),
		fenceLayer = new H.map.Group(),
		operator0,
		operator1,
		operator2,
		operator4,
		server_rr = 0,
		fence, currentPolyline,
		map = new H.Map(mapContainer, maptypes.normal.map, {
			center : new H.geo.Point(50.04614777739499, 8.613584243471905),
			zoom : 9
		});
		

	function reset(){
		markerLayer.removeAll();
		polylineLayerCon0.removeAll();
		polylineLayerCon1.removeAll();
		polylineLayerCon2.removeAll();
		polylineLayerCon3.removeAll();
		markerLayerCon0.removeAll();
		markerLayerCon1.removeAll();
		markerLayerCon2.removeAll();
		markerLayerCon3.removeAll();
		fenceLayer.removeAll();
	}
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	var mapBehavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false,
		bLongClickUseForStartPoint = true;

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	// adding rectangle control
	var rectControl = new H.ui.ZoomRectangle();
	ui.addControl("rectControl", rectControl);

	// adding Overview Control
	var overviewControl = new H.ui.Overview(maptypes.normal.map);
	ui.addControl("overviewControl", overviewControl);

	// react on a Base Layer change, and update the Overview Control
	map.addEventListener("baselayerchange", function() {
		overviewControl.setBaseLayer(map.getBaseLayer());
	});

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() {
		map.getViewPort().resize();
	});
	
	map.addObject(markerLayer);
	
	var now = new Date();
	
	/********************************************************
		Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		var sh = document.getElementById("input-from").value,
			dh = document.getElementById("input-to").value;
		
		if(bLongClickUseForStartPoint)
		{
			map.addObject(markerLayer);
			sh = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-from").value = sh;

			line1 = "Start"
			line2 = "";
			var marker = new H.map.Marker({lat: lastClickedPos.lat, lng: lastClickedPos.lng },
			{
				icon: createIcon( line1, line2)
			});

			markerLayer.addObject(marker);
			bLongClickUseForStartPoint = false;
		}
		else
		{
			dh = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-to").value = dh;
			
			line1 = "Destination"
			line2 = "";
			var marker = new H.map.Marker({lat: lastClickedPos.lat, lng: lastClickedPos.lng },
			{
				icon: createIcon( line1, line2)
			});

			markerLayer.addObject(marker);
			
			removeAndStartRouting();
			bLongClickUseForStartPoint = true;
		}
	}	
	

	/*TODO*/
	// route drag marker
	var svg = '<svg height="20" width="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + '<circle cx="10" cy="10" r="9" stroke="black" stroke-width="2" fill="none" />' + '</svg>';

	var icon = new H.map.Icon(svg);

	//Example request for transit
	//https://transit.api.here.com/metarouter/rest/routeservice/v2/route.json?
	//lang=en
	//&startX=-74.013664&startY=40.702068
	//&accessId=Qechac55zebruBa5aStEvet2eqayA76U
	//&client=here
	//&time=2015-06-16T08%3A00%3A00
	//&destY=40.81649&destX=-73.907807
	//&prod=1111111111111111

	var removeAndStartRouting = function() {

		polylineLayerCon0.removeAll();
		polylineLayerCon1.removeAll();
		polylineLayerCon2.removeAll();
		polylineLayerCon2.removeAll();
		reset();

		var from = document.getElementById('input-from').value, to = document.getElementById('input-to').value, gFrom, gTo;

		if (from && to) {
			gFrom = null;
			gTo = null;

			geocoder.search({
				searchText : from
			}, function(result) {

				//add Geocoder Release information if not already done
				if (releaseGeocoderShown == false) {
					loadGeocoderVersionTxt();
					releaseGeocoderShown = true;
				}
				if (result.Response.View[0].Result[0].Location != null) {
					gFrom = result.Response.View[0].Result[0].Location.DisplayPosition;
					address = result.Response.View[0].Result[0].Location.Address;
				} else {
					gFrom = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}
				gFrom.lat = parseFloat(gFrom.Latitude);
				gFrom.lng = parseFloat(gFrom.Longitude);
				line1 = "Start"
				line2 = address.Label;
				startMarker = new H.map.Marker({lat: gFrom.lat, lng: gFrom.lng },
					{
						icon: createIcon( line1, line2)
					});

					markerLayer.addObject(startMarker);
					calculateTransitRoute([gFrom, gTo]);
			}, function() {
			});

			geocoder.search({
				searchText : to
			}, function(result) {
				//add Geocoder Release information if not already done
				if (releaseGeocoderShown == false) {
					loadGeocoderVersionTxt();
					releaseGeocoderShown = true;
				}
				if (result.Response.View[0].Result[0].Location != null) {
					gTo = result.Response.View[0].Result[0].Location.DisplayPosition;
					address = result.Response.View[0].Result[0].Location.Address;
				} else {
					gTo = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}
				gTo.lat = parseFloat(gTo.Latitude);
				gTo.lng = parseFloat(gTo.Longitude);
				line1 = "Destination"
				line2 = address.Label;
				marker = new H.map.Marker({lat: gTo.lat, lng: gTo.lng },
					{
						icon: createIcon( line1, line2)
					});

					markerLayer.addObject(marker);

					calculateTransitRoute([gFrom, gTo]);
			}, function() {
			});
		}
	};

	// 3. Route calculation start
	var calculateTransitRoute = function(wPoints) {

		map.setViewBounds(markerLayer.getBounds());
	
		if (wPoints.length == 2 && (!wPoints[0] || !wPoints[1]))
			return;


		prod = ""
		arrProd = [];

	
		var appId = document.getElementById('customAppId').value;
		var appCode = document.getElementById('customAppCode').value;
		appId = appId == "" ? getUrlParameter( 'app_id' ) : appId;
		appCode = appCode == "" ? getUrlParameter( 'app_code' ) : appCode;
		
		
		
		if (document.getElementById('highSpeedTrains').checked)
			arrProd.push("high_speed_train");
		if (document.getElementById('Intercity_EuroCity_Trains').checked)
			arrProd.push("intercity_train");
		if (document.getElementById('Inter_regional_fast_trains').checked)
			arrProd.push("inter_regional_train");
		if (document.getElementById('Regional_other_trains').checked)
			arrProd.push("regional_train");
		if (document.getElementById('City_trains').checked)
			arrProd.push("city_train");
		if (document.getElementById('Buses').checked)
			arrProd.push("bus");
		if (document.getElementById('Boats_Ferries').checked)
			arrProd.push("ferry");
		if (document.getElementById('Metros_Subways').checked)
			arrProd.push("subway");
		if (document.getElementById('Trams').checked)
			arrProd.push("light_rail");
		if (document.getElementById('Ordered_services_Taxis').checked)
			arrProd.push("private_bus");
		if (document.getElementById('Inclined_Funiculars').checked)
			arrProd.push("inclined");
		if (document.getElementById('Aerials_Cable_Cars').checked)
			arrProd.push("aerial");
		if (document.getElementById('Rapid_Buses').checked)
			arrProd.push("bus_rapid");
		if (document.getElementById('Monorails').checked)
			arrProd.push("monorail");			
		if (document.getElementById('Airplanes').checked)
			arrProd.push("flight");	
		/*if (document.getElementById('Walk').checked)
			arrProd.push("walk");*/	
		
			
		prod = arrProd.join(",");

		// do JSONP here
		urlTransRouteReq = "https://transit.api.here.com/v3/route.json?";
		var urlParams = [
			"lang=en",
			"graph=1",
			"dep=" + wPoints[0].lat + "," + wPoints[0].lng,
			"arr=" + wPoints[1].lat + "," + wPoints[1].lng,
			"modes=" + prod,
			"time=" + encodeURIComponent(now.toISOString().slice(0,now.toISOString().indexOf("."))),
			"callbackFunc=gotRoutingResponse"
		];
		if(appId && appCode){
			urlParams.push("app_id=" + appId);
			urlParams.push("app_code=" + appCode);
		}else{
			//urlParams.push("accessId=Qechac55zebruBa5aStEvet2eqayA76U&client=here") //doesn't work properly
		}
		urlTransRouteReq += urlParams.join("&");
		
		script = document.createElement("script");
		script.src = urlTransRouteReq;
		document.body.appendChild(script);

	}

	var journeyDepLat,journeyDepLng, journeyArrLat, journeyArrLng;
	// parse the transit response
	var gotRoutingResponse = function(respJsonRouteObj) {

		document.getElementById("connection0").disabled = true;
		document.getElementById("connection1").disabled = true;
		document.getElementById("connection2").disabled = true;
		document.getElementById("connection3").disabled = true;

		journeyDepLat = null;
		journeyDepLng = null;
		journeyArrLat = null;
		journeyArrLng = null;

		if (respJsonRouteObj.error != undefined) {
			alert(respJsonRouteObj.error);
			return;
		}

		if (respJsonRouteObj.Res.Message != undefined) {
			alert(respJsonRouteObj.Res.Message.text);
			return;
		}

		if (respJsonRouteObj.Res.Connections != undefined) {

			//showing up to four connections
			numberCon = respJsonRouteObj.Res.Connections.Connection.length;

			if (numberCon > 4)
				numberCon = 4;

			//lopp through possible connections and show all possibilities - until then only the first one is shown
			for ( h = 0; h < numberCon; h++) {
				
				var descriptionString = "";
				
				var operator = "", 
					allOperators = 0;
				//getting the list of operators
				if(respJsonRouteObj.Res.Connections.Operators !== null && respJsonRouteObj.Res.Connections.Operators !== undefined)
					allOperators = respJsonRouteObj.Res.Connections.Operators.Op;

				var operators = allOperators.map(op => {
					return op.name
				})
				operator = operators.join("<br />");

				routeConnection = respJsonRouteObj.Res.Connections.Connection[h];
				routeConSections = routeConnection.Sections.Sec;

				for ( i = 0; i < routeConSections.length; i++) {

					section = routeConSections[i];
					//helper
					drawDirectPolyline= true;

					//walking ways
					if (section.Dep && section.Dep.Transport && section.Dep.Transport.mode == 20) {

						var strip = new H.geo.Strip();
						var arrY, arrX, depY, depX;

						if (section.Arr && section.Arr.Stn)
							descriptionString += "Go to " + section.Arr.Stn.name + " \n";

						//end point
						if (section.Dep.Stn != undefined) {
							depY = parseFloat(section.Dep.Stn.y);
							depX = parseFloat(section.Dep.Stn.x)
							strip.pushLatLngAlt.apply(strip, [depY, depX]);
						} else if (section.Dep.Addr) {
							depY = parseFloat(section.Dep.Addr.y);
							depX = parseFloat(section.Dep.Addr.x)
							strip.pushLatLngAlt.apply(strip, [depY, depX]);
						}
						//start point
						if (section.Arr.Stn != undefined) {
							arrY = parseFloat(section.Arr.Stn.y);
							arrX = parseFloat(section.Arr.Stn.x)
							strip.pushLatLngAlt.apply(strip, [arrY, arrX]);

						} else if (section.Arr.Addr != undefined) {
							arrY = parseFloat(section.Arr.Addr.y);
							arrX = parseFloat(section.Arr.Addr.x)
							strip.pushLatLngAlt.apply(strip, [arrY, arrX]);
						}
						//direct air-line distance
						var polyline = new H.map.Polyline(strip, {
							style : {
								lineWidth : 5,
								strokeColor : "rgba(255, 10, 50, 0.6)",
								lineJoin : "round"
							}
						});
						polyline.setArrows({
							color : "#F00F",
							width : 2,
							length : 2,
							frequency : 2
						});
						//call of the HLP router for showing the exact pedestrin route only if distance is higher than 70 meters
						var dist = Math.sqrt(Math.pow((arrX - depX), 2) + Math.pow((arrY - depY), 2)) * 100000;

						if (dist >= 70){
							calculatePedestrianRoute( depY, depX, arrY, arrX, h);
							drawDirectPolyline = false;
						}
					}

					//journey ways
					if (section.Dep.Transport.mode != 20) {
						var color;
						var colorSet = false;
						//retrieve color of transit line
						if (section.Dep.Freq && section.Dep.Freq.AltDep && section.Dep.Freq.AltDep.length != 0) {
							var altDep = section.Dep.Freq.AltDep;
							for ( j = 0; j < altDep.length; j++) {
								if (altDep[j].Transport.At.color) {
									color = altDep[j].Transport.At.color;
									colorSet = true;
								}
							}
						}

						if (colorSet == false)
							color = "000 000"

						descriptionString += "and take the " + section.Dep.Transport.name + " to " + section.Dep.Transport.dir + "\n";
						descriptionString += "get off " + section.Arr.Stn.name + "\n";
						


						var stripJourney = new H.geo.Strip();

						//start
						if (section.Dep.Stn) {
							journeyDepLat = parseFloat(section.Dep.Stn.y);
							journeyDepLng = parseFloat(section.Dep.Stn.x);
						} else if (section.Dep.Addr != undefined) {
							journeyDepLat = parseFloat(section.Dep.Addr.y);
							journeyDepLng = parseFloat(section.Dep.Addr.x);
						}
						stripJourney.pushLatLngAlt.apply(stripJourney, [journeyDepLat,journeyDepLng ]);
						line1 = section.Dep.Stn.name;
						line2 = "to " + section.Arr.Stn.name;
						markerStartJourney = new H.map.Marker({lat: journeyDepLat, lng:journeyDepLng },
							{
								icon: createIcon( line1, line2)
							});


							//loop through the single journey stops inbetween
							if (section.Journey.Stop && section.Journey.Stop.length != 0) {
								var stops = section.Journey.Stop;
								for ( k = 0; k < stops.length; k++) {
									stripJourney.pushLatLngAlt.apply(stripJourney, [parseFloat(stops[k].Stn.y), parseFloat(stops[k].Stn.x)]);
								}
							}

							//destination

							if (section.Arr.Stn) {
								journeyArrLat = parseFloat(section.Arr.Stn.y);
								journeyArrLng = parseFloat(section.Arr.Stn.x);
							} else if (section.Arr.Addr != undefined) {
								journeyArrLat = parseFloat(section.Arr.Addr.y);
								journeyArrLng = parseFloat(section.Arr.Addr.x);
							}
							stripJourney.pushLatLngAlt.apply(stripJourney, [journeyArrLat,journeyArrLng ]);
								
							var markerEndJourney = null;
							if(i == (routeConSections.length - 2))
							{
								
								line1 = "Leave" + section.Arr.Stn.name;
								line2 = "and walk to " + document.getElementById('input-to').value;
								markerEndJourney = new H.map.Marker({lat: journeyArrLat, lng: journeyArrLng  },
									{
										icon: createIcon( line1, line2)
									});
							}

								var polyline = new H.map.Polyline(stripJourney, {
									style : {
										lineWidth : 5,
										strokeColor : color,
										lineJoin : "round"
									}
								});


								if (h == 0) {
									document.getElementById("connection0").disabled = false;
									if(drawDirectPolyline != false){
										if(markerEndJourney)
											markerLayerCon0.addObject(markerEndJourney);
										markerLayerCon0.addObject(markerStartJourney);
									}

								}
								if (h == 1) {
									document.getElementById("connection1").disabled = false;
									if(drawDirectPolyline != false){
										if(markerEndJourney)
											markerLayerCon1.addObject(markerEndJourney);
										markerLayerCon1.addObject(markerStartJourney);
									}
								}
								if (h == 2) {
									document.getElementById("connection2").disabled = false;
									if(drawDirectPolyline != false){
										if(markerEndJourney)
											markerLayerCon2.addObject(markerEndJourney);
										markerLayerCon2.addObject(markerStartJourney);
									}
								}
								if (h == 3) {
									document.getElementById("connection3").disabled = false;
									if(drawDirectPolyline != false){
										if(markerEndJourney)
											markerLayerCon3.addObject(markerEndJourney);
										markerLayerCon3.addObject(markerStartJourney);
									}
								}

					}

					if (h == 0) {
						document.getElementById("connection0").disabled = false;
						if(drawDirectPolyline != false)
							polylineLayerCon0.addObject(polyline);
						operator0 = operator;
					}
					if (h == 1) {
						document.getElementById("connection1").disabled = false;
						if(drawDirectPolyline != false)
							polylineLayerCon1.addObject(polyline);
						operator1 = operator;
					}
					if (h == 2) {
						document.getElementById("connection2").disabled = false;
						if(drawDirectPolyline != false)
							polylineLayerCon2.addObject(polyline);
						operator2 = operator;
					}
					if (h == 3) {
						document.getElementById("connection3").disabled = false;
						if(drawDirectPolyline != false)
							polylineLayerCon3.addObject(polyline);
						operator3 = operator;
					}
				}
			}
		}

		//map.addObject(polylineLayer);
		simulationContainer.style.display = "block";
	}
	function calculatePedestrianRoute(arrY, arrX, depY, depX, count) {
		var calculateRouteParams = {
			'waypoint0' : arrY + "," + arrX,
			'waypoint1' : depY + "," + depX,
			'mode' : 'fastest;pedestrian;traffic:disabled',
			'representation' : 'display'
		}, onResult = function(result) {
			//add Routing Release number if not already done
			if (releaseRoutingShown== false){
				releaseInfoTxt.innerHTML+="<br />HLP Routing: "+result.response.metaInfo.moduleVersion+" for pedestrian route (red with white arrows)";
				releaseRoutingShown = true;
			}

			var strip = new H.geo.Strip(), shape = result.response.route[0].shape, i, l = shape.length;

			for ( i = 0; i < l; i++) {
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) {
					return parseFloat(item);
				}));
			}
			var polylinePed = new H.map.Polyline(strip, {
				style : {
					lineWidth : 5,
					strokeColor : "rgba(255, 10, 50, 0.7)"
				}
			});
			polylinePed.setArrows({
				color : "#F00F",
				width : 2,
				length : 2,
				frequency : 2
			});
			if (count == 0)
				polylineLayerCon0.addObject(polylinePed);
			if (count == 1)
				polylineLayerCon1.addObject(polylinePed);
			if (count == 2)
				polylineLayerCon2.addObject(polylinePed);
			if (count == 3)
				polylineLayerCon3.addObject(polylinePed);

		}, onError = function(error) {
			console.log(error);
		}
		router.calculateRoute(calculateRouteParams, onResult, onError);
	}

	var connectionOnOff0 = function() {
		showConnection0 = document.getElementById("connection0").checked;
		if (showConnection0) {
			map.addObject(polylineLayerCon0);
			map.addObject(markerLayerCon0);
			connectionOperators.innerHTML = operator0;
			map.setViewBounds(polylineLayerCon0.getBounds());
		} else{
			map.removeObject(polylineLayerCon0);
			map.removeObject(markerLayerCon0);
		}
	};

	var connectionOnOff1 = function() {
		showConnection1 = document.getElementById("connection1").checked;
		if (showConnection1) {
			map.addObject(polylineLayerCon1);
			map.addObject(markerLayerCon1);
			map.setViewBounds(polylineLayerCon1.getBounds());
			connectionOperators.innerHTML = operator1;
		} else{
			map.removeObject(polylineLayerCon1);
			map.removeObject(markerLayerCon1);
		}
	};

	var connectionOnOff2 = function() {
		showConnection2 = document.getElementById("connection2").checked;
		if (showConnection2) {
			map.addObject(polylineLayerCon2);
			map.addObject(markerLayerCon2);
			connectionOperators.innerHTML = operator2;
			map.setViewBounds(polylineLayerCon2.getBounds());
		} else{
			map.removeObject(polylineLayerCon2);
			map.removeObject(markerLayerCon2);
		}
	};

	var connectionOnOff3 = function() {
		showConnection3 = document.getElementById("connection3").checked;
		if (showConnection3) {
			map.addObject(polylineLayerCon3);
			map.addObject(markerLayerCon3);
			connectionOperators.innerHTML = operator0;
			map.setViewBounds(polylineLayerCon3.getBounds());
		} else {
			map.removeObject(polylineLayerCon3);
			map.removeObject(markerLayerCon3);
		}
	};


	var createIcon = function(line1, line2) {
		var div = document.createElement("div");

		var div = document.createElement("div");
		var svgMarker = "";

		if (line1 != "" && line2 != "") {
			svgMarker = svgMarkerImage_Line;
			svgMarker = svgMarker.replace(/__line1__/g, line1);
			svgMarker = svgMarker.replace(/__line2__/g, line2);
			svgMarker = svgMarker.replace(/__width__/g, line1.length * 4 + 57);
			svgMarker = svgMarker.replace(/__widthAll__/g, line1.length * 4 + 120);
		} else {
			svgMarker = svgMarkerImageTransit.replace(/__widthAll__/g, "60");
		}
		div.innerHTML = svgMarker;

		return new H.map.Icon(svgMarker, {
			anchor : new H.math.Point(24, 57)
		});
	};

	var switchRegion = function(reg) {
		reset();
		cfg = region[reg];
		map.setCenter(new H.geo.Point(cfg.center.lat, cfg.center.lng));
		document.getElementById("input-from").value = cfg.start;
		document.getElementById("input-to").value = cfg.dest;
		metricSystem = cfg.metric;
		language = cfg.lang;
		start = cfg.startCoordinate;
		destination = cfg.destCoordinate;
	};

	// settings for the different regions
	var region = {
		"EU" : {
			start : "Frankfurt",
			startCoordinate : new H.geo.Point(50.11208, 8.68342),
			dest : "Eschborn",
			destCoordinate : new H.geo.Point(50.14041, 8.57211),
			center : {
				lat : 50.04614777739499,
				lng : 8.613584243471905
			},
			metric : true,
			lang : "en-GB"
		},
		"NA" : {
			start : "Whitehall St, New York, NY",
			//startY, startX
			startCoordinate : new H.geo.Point(40.70207, -74.01366),
			dest : "Westchester Ave, New York, NY",
			destCoordinate : new H.geo.Point(40.81649, -73.907807),
			center : {
				lat : 40.77758215166187,
				lng : -73.9534179688
			},
			metric : false,
			lang : "en-US"
		},
		"BR" : {
			start : "Praca Benedito Calixto Sao Paulo",
			startCoordinate : new H.geo.Point(-23.5591698, -46.6801682),
			dest : "Rua Roque Barbosa Lima Sao Paulo",
			destCoordinate : new H.geo.Point(-23.5910606, -46.5458107),
			center : {
				lat : -23.559147337720326,
				lng : -46.678417109809544
			},
			metric : true,
			lang : "es-ES"
		},
		"MEA" : {
			start : "Dubai",
			startCoordinate : new H.geo.Point(25.26952, 55.30884),
			dest : "Al ain",
			destCoordinate : new H.geo.Point(24.20733, 55.68616),
			center : {
				lat : 24.8041548,
				lng : 55.4198266
			},
			metric : true,
			lang : "ar-AR"
		}
	};

	switchRegion("EU");

	function startCapture() {
		capture(map, ui);
	}

	function capture(map, ui) {
		// Capturing area of the map is asynchronous, callback function receives HTML5 canvas
		// element with desired map area rendered on it.
		// We also pass a H.ui.UI reference in order to see the ScaleBar in the result.
		// If dimensions are omitted, whole map will be captured, from top left corner up to
		// the bottom right.
		map.capture(function(canvas) {
			if (canvas) {
				window.open(canvas.toDataURL());
			} else {
				// For example when map is in Panorama mode
				alert('Capturing is not supported');
			}
		}, [ui], 0, 0, document.getElementById("mapContainer").offsetWidth, document.getElementById("mapContainer").offsetHeight);
	}