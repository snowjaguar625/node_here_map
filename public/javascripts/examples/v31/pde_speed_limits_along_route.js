/*
	author domschuette
	(C) HERE 2014-2019
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var custom_app_id=   getUrlParameter( 'app_id' );
	var custom_app_code= getUrlParameter( 'app_code' );
	var custom_api_key = getUrlParameter( 'api_key' );
	
	if( custom_app_id !== null || custom_app_code !== null || custom_api_key !== null)
	{
		app_id = custom_app_id;
		app_code = custom_app_code;
		api_key = custom_api_key;
	}

	var mapContainer = document.getElementById('mapContainer'),
		// position of route start
		pointA,
		// position of route destination
		pointB,

		platform = new H.service.Platform({
            apikey: api_key,
            useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService(),
		router = platform.getRoutingService(),
		group = new H.map.Group(),
		layers = null,
		map = new H.Map(mapContainer, maptypes.vector.normal.map,
			{
				center: new H.geo.Point(52.11, 0.68),
				zoom: 5,
                pixelRatio: window.devicePixelRatio || 1
			}
		);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	
	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	routeButton = document.getElementById("routeButton"),
		start = document.getElementById("start"),
		dest = document.getElementById("dest"),
		date = document.getElementById("date"),
		time = document.getElementById("time"),
		trucks = document.getElementById("trucks"),
		truckOptions = document.getElementById("truckoptions"),
		pointA,
		pointB,
		routeBBox,
		depature,
		numLinksMatched = 0,
		conditionalSpeeds = new Object(),
		speeds = new Object(),
		variableSpeeds = new Object(),
		pdeManager = new PDEManager(null, null, layers, api_key),
		group = new H.map.Group(),
		now = moment(),
		truck = false,
		truckSpeedLimitOnly = false,
		currentBubble,
		startMarker,
		destMarker,
		bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination;
	
	pdeManager.setRegion(document.getElementById("region").value);
	pdeManager.setFeedbackTxt(feedbackTxt);
	
	date.value = now.format("YYYY-MM-DD");
	time.value = now.format("HH:mm");

	var handleTruck = function()
	{
		if(document.getElementById("vehicletype").value == "32")
		{
			truck = true;
			truckOptions.style.display = "block";
		}
	    else if(document.getElementById("vehicletype").value == "2048"){
			truckSpeedLimitOnly = true;
			truckOptions.style.display = "block";
	    }
	    else
		{
			truck = false;
			truckOptions.style.display = "none";
		}
	};

	var changeRegion = function()
	{
		if (document.getElementById("region").value != "") pdeManager.setRegion(document.getElementById("region").value);
		else pdeManager.setRegion(null);
	};
	
	var loadExample = function()
	{
		switch (document.getElementById("examples").value){
			case "1":
					document.getElementById("start").value = "Kasel";
					document.getElementById("dest").value = "Frankfurt";
					document.getElementById("region").value = "";
					changeRegion();
					break;
		
			case "2": 
					document.getElementById("start").value = "Tokyo";
					document.getElementById("dest").value = "Yokohama";
					document.getElementById("region").value = "JPN";
					changeRegion();
					break;
			}
		
	};
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			map.addObject(group);
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "0";
			start.value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng);
			if(startMarker !=  null)
			{
				markerGroup.removeObject(startMarker);
			}
			startMarker = new H.map.DomMarker(pointA,
				{
					icon: createIconMarker(line1, line2)
				});
			group.addObject(startMarker);
			bLongClickUseForStartPoint = false;
		}
		else
		{
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "1";
			dest.value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng);
			if(destMarker !=  null)
			{
				markerGroup.removeObject(destMarker);
			}
			destMarker = new H.map.DomMarker(pointB,
				{
					icon: createIconMarker(line1, line2)
				});
			group.addObject(destMarker);
			bLongClickUseForStartPoint = true;
			go();
		}
	}	

	routeButton.onclick = function ()
	{
		go();
	};

	var go = function()
	{
		if(truckSpeedLimitOnly){
			layers = new Object();
			layers["TRUCK_SPEED_LIMITS_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
		}
	    else if(truck)
		{
			layers = new Object();
			layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
			layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
			layers["TRUCK_SPEED_LIMITS_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
		}
		else
		{
			layers = new Object();
			layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
			layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
		}

		pdeManager.setLayers(layers);

		group.removeAll();
		
		depature = date.value + "T" + time.value + ":00";
		group = new H.map.Group();
		feedbackTxt.innerHTML = "Routing from: " + start.value + " to " + dest.value + " ...";
		geocode(start.value, true);
	};

	var geocode = function(searchTerm, start)
	{
		geocoder.search(
			{
				searchText: searchTerm
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				}

				if(start)
					pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
				else
					pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

				if(result.Response.View[0].Result[0].Location != null)
				{
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else
				{
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}


				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = address.Label ? address.Label : " ";

				marker = new H.map.DomMarker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					if(start)
						geocode(dest.value, false);
					else
					{
						calculateRouteDirect(pointA, pointB);
					}	
			},
			function(error) {
				alert(error);
			}
		);
	};

	var calculateRouteDirect = function(start, destination)
	{
		var urlRoutingReq = "https://fleet.ls.hereapi.com/2/calculateroute.json?waypoint0="+
			start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +
			"&departure=" + depature +"&legAttributes=li&linkAttributes=fc&routeAttributes=sh&mode=fastest;" +
			(truck ? "truck" : "car") + ";traffic:enabled&apikey=" + api_key + "&jsoncallback=gotRoutingResponse";

		if (document.getElementById("region").value != "") urlRoutingReq += "&region=" + document.getElementById("region").value;
		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);		
	};

	// parse the routing response
	var gotRoutingResponse = function (resp)
	{
	if (resp.error_id != undefined)
		{
			alert (resp.issues[0].message);
			feedbackTxt.innerHTML = resp.issues[0].message;
			return;
		}
	for (var r = 0; r < resp.response.route.length; r++) {

		for(var k = 0; k<resp.response.route[r].leg.length; k++){
			if( resp.response.route[r].leg[k].link === undefined) {
				feedbackTxt.innerHTML = "<font color=\"red\">Route response contains no link information. Try to add &legAttributes=links</font>";
				feedbackTxt.innerHTML += "<br/>";
				Spinner.hideSpinner();
				return;
			}
			for (var m = 0; m < resp.response.route[r].leg[k].link.length; m++) {
				var linkId = (resp.response.route[r].leg[k].link[m].linkId.lastIndexOf("+", 0) === 0 ? resp.response.route[r].leg[k].link[m].linkId.substring(1) : resp.response.route[r].leg[k].link[m].linkId);
				var strip = new H.geo.LineString();
				var shape = resp.response.route[r].leg[k].link[m].shape;
				var l = shape.length;
				for (var i = 0; i < l; i += 2) {
					strip.pushLatLngAlt(shape[i], shape[i + 1], 0);
				}
			
   				var polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "#B22222",
					lineJoin: "round"
				}
			});
			}
		}
	}
			group.addObject(polyline);

			pdeManager.setBoundingBoxContainer(group);
			pdeManager.setLinks(resp.response.route[0].leg[0].link);
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
			pdeManager.start();
	};

	var validateVehicleType = function(vehicleTypeMask)
	{
		var myMask = parseInt(document.getElementById("vehicletype").value);
		//! TODO remove "plus one" and "truck if" after fixed is ready in service
		if(truck||truckSpeedLimitOnly)
			vehicleTypeMask = parseInt(vehicleTypeMask) + 1;
		return ((vehicleTypeMask & myMask) == myMask);
	};

	var validateTruckOptions = function(trailer, min_weight, max_weight, length, expl_dang_material)
	{
		var ret = false,
		tr = parseInt(document.getElementById("trailer").value),
		truckWeight=parseFloat(document.getElementById("truck_weight").value),
		l = parseInt(document.getElementById("length").value),
		exp = document.getElementById("expl_dang_material").checked;

		if(trailer && tr > 0 )
		{
			if(trailer == 'Y' || trailer >= tr)
				return "Trailer";
		}
		if(truckWeight){
			if( min_weight && max_weight == null && truckWeight > parseFloat(min_weight))
				return "Minimum Weight :"+min_weight;
			if( min_weight == null && max_weight && truckWeight <= parseFloat(max_weight))
				return "Maximum Weight :"+max_weight;
			if(min_weight && max_weight && truckWeight > parseFloat(min_weight) && truckWeight <= parseFloat(max_weight))
				return "Weight between :"+min_weight+" and "+max_weight;

		}

		if(length && parseInt(length) <= l)
			return "Truck Length :"+length;

		if(expl_dang_material && exp)
			return "Dangerous Material";

		return ret;
	};

	function pdeManagerFinished(nrTilesRequested)
	{
		map.addObject(group);
        map.getViewModel().setLookAtData({
            bounds: group.getBoundingBox()
        });

		var links = pdeManager.getLinks(),
		time = moment(depature),
		ii = 0,
		ll = links.length;
		
		numLinksMatched = 0;

		for(;ii < ll; ii++)
		{
			var linkID = links[ii].linkId.replace("+", ""), // normalization: omit directional plus sign
			validCondition = false,
			clink = conditionalSpeeds[linkID],
			dtp,
			variable = false;
			if(variableSpeeds[linkID])
			{
				variable = variableSpeeds[linkID];
			}
			if(clink)
			{
				var cll = clink.length,
				c = 0,
				speedLimit,
				vehicleMask;
				var truckcond = false;

				for(; c < cll; c++)
				{
					vehicleMask = (clink[c].VEHICLE_TYPES != undefined) ? clink[c].VEHICLE_TYPES : clink[c].TRUCK_TYPES; // compatible with older maps
					if(clink[c].DATE_TIMES)
					{

						dtp = new DateTimeParser(clink[c].DATE_TIMES, time);
						if(!(truck||truckSpeedLimitOnly))
						{
							validCondition = (dtp.check() && validateVehicleType(vehicleMask));
						}
						else
						{
							truckcond = validateTruckOptions(clink[c].TRAILER, clink[c].MIN_WEIGHT, clink[c].MAX_WEIGHT, clink[c].LENGTH, clink[c].EXPL_DANG_MATERIAL);
							validCondition = (dtp.check() && validateVehicleType(vehicleMask) && truckcond);
						}
						if(speeds[linkID])
						{
							var routeLinkDir = linkID < 0 ? "-" : "+";
							if(routeLinkDir == '-' && speeds[linkID].SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].SPEED_LIMIT, speeds[linkID].TO_REF_SPEED_LIMIT);
							else if(speeds[linkID].FROM_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].SPEED_LIMIT, speeds[linkID].FROM_REF_SPEED_LIMIT);
							else
								speedLimit = clink[c].SPEED_LIMIT;
							// set unit
							unit = speeds[linkID].SPEED_LIMIT_UNIT ;
						}
					}
					else
					{
						if(!(truck||truckSpeedLimitOnly))
						{
							validCondition = validateVehicleType(vehicleMask);
						}
						else
						{
							 truckcond = validateTruckOptions(clink[c].TRAILER, clink[c].MIN_WEIGHT, clink[c].MAX_WEIGHT, clink[c].LENGTH, clink[c].EXPL_DANG_MATERIAL);
							validCondition = (validateVehicleType(vehicleMask) && truckcond);

						}
						if(speeds[linkID])
						{
							var routeLinkDir = linkID < 0 ? "-" : "+";
							if(routeLinkDir == '-' && speeds[linkID].TO_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].SPEED_LIMIT, speeds[linkID].TO_REF_SPEED_LIMIT);
							else if(speeds[linkID].FROM_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].SPEED_LIMIT, speeds[linkID].FROM_REF_SPEED_LIMIT);
							else
								speedLimit = clink[c].SPEED_LIMIT;
								unit = speeds[linkID].SPEED_LIMIT_UNIT ;
						}
					}

					if(validCondition)
					{
						var routeLink = pdeManager.getRouteLinks()[linkID],
						strip = new H.geo.LineString(),
						shape = routeLink.shape,
						i,
						l = shape.length;

						for(i = 0; i < l; i += 2)
						{	
							strip.pushLatLngAlt(shape[i], shape[i+1], 0);
							// strip.pushLatLngAlt.apply(strip, shape[i].split(','));
						}

						var polyline = new H.map.Polyline(strip,
							{
								style:
								{
									lineWidth:6,
									strokeColor: "#FF0000",
									lineJoin: "round"
								}
							});
							group.addObject(polyline);

							//if variable and conditional - append the word variable to the
							//restriction value.
							
							conditional = (speedLimit == clink[c].SPEED_LIMIT || clink[c].SPEED_LIMIT == null);
							if(unit == "M")
								 speedLimit = (Math.round(speedLimit / 1.61)) + " MPH"; 
							else
								speedLimit = speedLimit + " KM/H ";
							if (variable) speedLimit = speedLimit + " + variable signs";

							var	marker4Speed = new H.map.Marker(
								strip.extractPoint(0),
								{
									icon: createIconMarkerSpeed(speedLimit, "#FF0000")
								});


								marker4Speed.$linkID = linkID;

								
								if(variable)
									marker4Speed.$location = variable.VARIABLE_SPEED_SIGN_LOCATION;
								if(clink[c].SPEED_LIMIT_TYPE || truckcond)
									marker4Speed.$condition = getCondDescription(clink[c],truckcond);

								marker4Speed.addEventListener("pointerdown", function(e)
								{
									if(currentBubble)
										ui.removeBubble(currentBubble);

									var html = '<div>';
									html +=	'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkID: ' + e.target.$linkID +'</p>';
									html += e.target.$location != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Location: ' + e.target.$location +'</p>') : "";
									html += e.target.$condition != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Conditional: ' + e.target.$condition +'</p>') : "";
									html += '</div>';

									var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

									currentBubble = new H.ui.InfoBubble(pos, { content: html });
									ui.addBubble(currentBubble);
								});
								group.addObject(marker4Speed);
					}
				}
			}

			if(!validCondition)
			{										   
				var routeLink = pdeManager.getRouteLinks()[linkID],
				strip = new H.geo.LineString(),
				shape = routeLink.shape,
				i,
				l = shape.length,
				resp = speeds[linkID];

				for(i = 0; i < l; i += 2)
				{
					strip.pushLatLngAlt(shape[i], shape[i+1], 0);
				}

				var startPoint = new Array();
				startPoint.push(shape[0]);
				startPoint.push(shape[1]);

				// set the color per route type
				var unit = resp ? resp.SPEED_LIMIT_UNIT : "M",
				color = "#87CEFA",
				colorMarker = "#ADD8E6",
				speedLimit = "",
				routeLinkDir = linkID < 0 ? "-" : "+";

				if (unit == "M")
				{
					if(resp && resp.FROM_REF_SPEED_LIMIT == null )
					{
						if (resp.TO_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998 )
						{
							speedLimit = "No restriction";
						}
						else if (routeLinkDir == '-'&& resp.TO_REF_SPEED_LIMIT != null)
						{
							speedLimit = (Math.round(resp.TO_REF_SPEED_LIMIT / 1.61)) + " MPH";
						}
						else
						{
							speedLimit =  "0 MPH";
						}
					}
					else if (resp && (resp.FROM_REF_SPEED_LIMIT == 999 || resp.FROM_REF_SPEED_LIMIT == 998))
					{
						speedLimit = "No restriction";
					}
					else if(!resp)
					{
						speedLimit = "No Information";
					}
					else
					{
						speedLimit = (Math.round(resp.FROM_REF_SPEED_LIMIT / 1.61)) + " MPH";
					}
				}
				else if( unit == "K")
				{
					if(resp && resp.FROM_REF_SPEED_LIMIT == null )
					{
						if (resp.TO_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998)
						{
							speedLimit = "No restriction";
						}
						else if (routeLinkDir == '-'&& resp.TO_REF_SPEED_LIMIT != null)
						{
							speedLimit = resp.TO_REF_SPEED_LIMIT  + " KM/H";
						}
						else
						{
							speedLimit =  "0 KM/H";
						}
					}
					else if (resp && (resp.FROM_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998))
					{
						speedLimit = "No restriction";
					}
					else if(!resp)
					{
						speedLimit = "No information";
					}
					else
					{
						speedLimit = resp.FROM_REF_SPEED_LIMIT + " KM/H";
					}
				}

				var polyline = new H.map.Polyline(strip,
					{
						style:
						{
							lineWidth:6,
							strokeColor: color,
							lineJoin: "round"
						}
					});
					group.addObject(polyline);

					if (variable) speedLimit = speedLimit + " + variable signs";


					var pointSpeed = new H.geo.Point(startPoint[0],startPoint[1]),
					marker4Speed = new H.map.Marker(
						pointSpeed,
						{
							icon: createIconMarkerSpeed(speedLimit, colorMarker)
						});
						
						
						if(variable)
							marker4Speed.$location = variable.VARIABLE_SPEED_SIGN_LOCATION;

						marker4Speed.$linkID = linkID;
						marker4Speed.addEventListener("pointerdown", function(e)
						{
							if(currentBubble)
								ui.removeBubble(currentBubble);
							var html =  '<div>'+
								'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkID: ' + e.target.$linkID +'</p>';
								html += e.target.$location != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Location: ' + e.target.$location +'</p>') : "";
							html=html+'</div>';

							var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

							currentBubble = new H.ui.InfoBubble(pos, { content: html });
							ui.addBubble(currentBubble);
						});
						group.addObject(marker4Speed);
			}
			// dunamic spped info not supported by 7.2 router.
			//time.add(links[ii].dynamicSpeedInfo.trafficTime, "seconds");
			numLinksMatched++;
		}

		feedbackTxt.innerHTML = "Done. Requested " + nrTilesRequested + " PDE tiles for " + numLinksMatched + " route links. ";
		conditionalSpeeds = new Object();
		variableSpeeds = new Object();
		speed = new Object();
	}

	function gotVariableSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID),
			routeLinkDir = '',
			routeLink = pdeManager.getRouteLinks()[linkId];
			if (routeLink == null) // maybe route is driving it to ref node
			{
				routeLink = pdeManager.getRouteLinks()[-linkId];
				if (routeLink == null) // linkID is not on the route
					continue;
				routeLinkDir = '-';
			}

			if(!variableSpeeds[routeLinkDir + linkId])
				variableSpeeds[routeLinkDir + linkId] = new Array();
			variableSpeeds[routeLinkDir + linkId].push(resp.Rows[r]);
		}
	}

	function gotCONDSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID),
			routeLinkDir = '',
			routeLink = pdeManager.getRouteLinks()[linkId];
			if (routeLink == null) // maybe route is driving it to ref node
			{
				routeLink = pdeManager.getRouteLinks()[-linkId];
				if (routeLink == null) // linkID is not on the route
					continue;
				routeLinkDir = '-';
			}

			if(!conditionalSpeeds[routeLinkDir + linkId])
				conditionalSpeeds[routeLinkDir + linkId] = new Array();
			conditionalSpeeds[routeLinkDir + linkId].push(resp.Rows[r]);
		}
	};

	function gotSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}

		for (r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID),
			routeLinkDir = '',						// normally positive directions are given without a literal sign
			routeLink = pdeManager.getRouteLinks()[linkId];

			if (routeLink == null) // maybe route is driving it to ref node
			{
				routeLink = pdeManager.getRouteLinks()[-linkId];
				if (routeLink == null) // linkID is not on the route
					continue;
				routeLinkDir = '-';
			}
			speeds[routeLinkDir + linkId] = resp.Rows[r];
		}
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		line2 = line2.trim();
		var domElement = document.createElement('div');
		domElement.style.marginTop = "-55px";
		domElement.style.marginLeft = "-27px";
        var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length * 4 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length * 4 + 200);
        domElement.innerHTML = svgMarker;

		return new H.map.DomIcon(domElement);
	};

	//Helper create svg for speeds
	var createIconMarkerSpeed = function (speedInfo, colorMarker) {
		var svgMarker4Speed = '<svg width="__widthAll__" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="34" fill="__color__"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
			'</g>'+
			'</svg>';

		svgMarker4Speed = svgMarker4Speed.replace(/__line1__/g, speedInfo);
		svgMarker4Speed = svgMarker4Speed.replace(/__width__/g, speedInfo.length  *4 + 32);
		svgMarker4Speed = svgMarker4Speed.replace(/__widthAll__/g, speedInfo.length  *4 + 70);
		svgMarker4Speed = svgMarker4Speed.replace(/__color__/g, colorMarker);


		return new H.map.Icon(svgMarker4Speed);

	};
	// for conditional speed description
	function getCondDescription(clink,truckCondition){
		// Data retrieved from RDF_META table
		var speedType=clink.SPEED_LIMIT_TYPE;
		var dependendType=clink.DEPENDEND_SPEED_TYPE;
		var description="";
		
		if(truckCondition){
			return truckCondition;
		}
		
		switch(speedType){
			case "1" : description="Advisory"; break;
			case "2":
				switch (dependendType){
					case "1" : description="School"; break;
					case "2" : description="Rain"; break;
					case "3" : description="Snow"; break;
					case "4" : description="Time-Dependednt"; break;
					case "5" : description="Approximate Seasonal Time"; break;
					case "6" : description="Lane Dependent"; break;
					case "7" : description="Fog"; break;
				}
				break;
			case "3": description="Speed bumps present"; break;
		}
		return description;
	}

	function getLowerSpeedLimit(limit1, limit2) {
		if (limit1 == undefined) return limit2;
		if (limit2 == undefined) return limit1;
		return Math.min(limit1, limit2);
	}