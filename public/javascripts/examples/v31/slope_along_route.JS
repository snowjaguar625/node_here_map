/*
	(C) HERE 2019
	*/

	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	var mapContainer = document.getElementById('mapContainer'),
	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : 72),
	geocoder = platform.getGeocodingService(),
	router = platform.getRoutingService(),
	waypoints = new H.map.Group(),
	routeLinks = new H.map.Group(),
	slopeMarkers = new H.map.Group();
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: new H.geo.Point(39.983908, -78.810955),
			zoom: 10
		}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	var bLongClickUseForStartPoint = true,
		startMarker =  null, 
		destMarker = null;

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
		
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			map.addObject(waypoints);
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "0";
			start.value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				waypoints.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA,
				{
					icon: createIconMarker(line1, line2)
				});
			waypoints.addObject(startMarker);
			bLongClickUseForStartPoint = false;
		}
		else
		{
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "1";
			dest.value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
				waypoints.removeObject(destMarker);
			}
			destMarker = new H.map.Marker(pointB,
				{
					icon: createIconMarker(line1, line2)
				});
			waypoints.addObject(destMarker);
			bLongClickUseForStartPoint = true;
			routeButton.onclick();
		}
	}	

	
	var routeButton = document.getElementById("routeButton");
	var start = document.getElementById("start");
	var dest = document.getElementById("dest");

	var pointA;
	var pointB;
	var routeLinkHashMap; // key = linkID, value = link object
	var numLinksMatched, numTilesRequested; // for statistics

	// 1. User pressed button --> Geocode start address
	routeButton.onclick = function () {
		Spinner.showSpinner();
		routeLinks = new H.map.Group();
		slopeMarkers = new H.map.Group();
		geocode(start.value, true);
	};

	// 2. Start address geocoded --> Geocode destination address --> route
	var geocode = function (searchTerm, start) {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
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
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else {
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}

				if (start)
					pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
				else
					pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = address.Label ? address.Label : "";

				marker = new H.map.Marker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

					waypoints.addObject(marker);

					if (start)
						geocode(dest.value, false);
					else
						calculateRouteDirect(pointA, pointB);
			},
			function (error) {
				alert(error);
			}
		);
	}

	// 3. Route calculation start
	var calculateRouteDirect = function (start, destination) {
		// do JSONP here
		urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0=" + start.lat + "," + start.lng + "&waypoint1=" + destination.lat + "," + destination.lng +
			"&alternatives=1&departure=2014-04-01T15%3A04%3A34.698Z&requestid=sampleRequest&language=en-US&representation=overview&routeattributes=sc,sm,sh,bb,lg,no,shape&legattributes=li&linkattributes=sh,nl,fc&instructionformat=html&mode=fastest;car;traffic:enabled&app_id=" + app_id + "&app_code=" + app_code + "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);

	}

	// parse the routing response
	var gotRoutingResponse = function (respJsonRouteObj) {
		if (respJsonRouteObj.error != undefined) {
			alert(respJsonRouteObj.error);
			return;
		}

		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+respJsonRouteObj.response.metaInfo.moduleVersion;
			routerMapRelease = respJsonRouteObj.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}

		var strip = new H.geo.LineString(),
		shape = respJsonRouteObj.response.route[0].shape,
		i,
		l = shape.length;

		for (i = 0; i < l; i++) {
			strip.pushLatLngAlt.apply(strip, shape[i].split(','));
		}

		var polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "rgba(255, 10, 50, 0.7)",
					lineJoin: "round"
				}
			});
			routeLinks.addObject(polyline);

			var links = respJsonRouteObj.response.route[0].leg[0].link;

			routeLinkHashMap = new Object();
			for (m = 0; m < links.length; m++) {
				routeLinkHashMap[parseInt(links[m].linkId)] = links[m];
			}

			// Select PDE layers
			var layers = new Object();
			layers["ADAS_ATTRIB_FC"] = { callback: loadAdasResponse };

			// Init PDE
			var pdeManager = new PDEManager(app_id, app_code, layers);
			pdeManager.setLinks(links);
			pdeManager.setOnTileLoadingFinished(loadAdasFinished);
			pdeManager.start();
	}

	function loadAdasResponse(response) {
		if (response.responseCode == 400) {
			alert(response.message);
			return;
		}

		previousCoordX = 0, previousCoordY = 0;
		for (r = 0; r < response.Rows.length; r++) {
			linkId = parseInt(response.Rows[r].LINK_ID);
			routeLinkDir = '+';
			routeLink = routeLinkHashMap[linkId];

			if (routeLink == null) // maybe route is driving it to ref node
			{
				routeLink = routeLinkHashMap[-linkId];
				if (routeLink == null) // linkID is not on the route
					continue;
				routeLinkDir = '-';
			}

			hpxString = response.Rows[r].HPX;
			hpyString = response.Rows[r].HPY;
			hpzString = response.Rows[r].HPZ;
			slopeString = response.Rows[r].SLOPES;
			headingString = response.Rows[r].HEADINGS;
			curveString = response.Rows[r].CURVATURES;
			verticalString = response.Rows[r].VERTICAL_FLAGS;
			refNodeLinkCurvHeads = response.Rows[r].REFNODE_LINKCURVHEADS;
			nrefNodeLinkCurvHeads = response.Rows[r].NREFNODE_LINKCRVHEADS;

			var stripRouteLink = new H.geo.LineString(),
			shape = routeLink.shape,
			l = shape.length;

			for (k = 0; k < l; k++) {
				stripRouteLink.pushLatLngAlt.apply(stripRouteLink, routeLink.shape[k].split(',').map(function (item) { return parseFloat(item); }));
			}

			var polylineRouteLink = new H.map.Polyline(stripRouteLink,
				{
					style:
					{
						lineWidth: 5,
						strokeColor: "rgba(0, 190, 50, 0.7)",
						lineJoin: "round"
					}
				});

				routeLinks.addObject(polylineRouteLink);
				numLinksMatched++;
				previousCoordXonLink = 0, previousCoordYonLink = 0, previousSlopeOnLink = 0;

				arrayX = hpxString.split(',');
				arrayY = hpyString.split(',');
				arraySlopes = slopeString == null ? null : slopeString.split(',');

				for (i = 0; i < arrayX.length; i++) {
					hpx = parseFloat(arrayX[i]) / 10000000.0 + previousCoordXonLink; // degree WGS84, values are relative to previous values on link
					hpy = parseFloat(arrayY[i]) / 10000000.0 + previousCoordYonLink; // degree WGS84
					slope = slopeString == null ? null : parseFloat(arraySlopes[i]) / 1000.0 + previousSlopeOnLink; // 360 degree
					previousSlopeOnLink = slope;
					slope = (slope == null) ? 0.0 : (routeLinkDir == '+' ? slope : -slope); // when driving to ref node, slope values must be reversed
					if (hpx == previousCoordX && hpy == previousCoordY) // last node of previous link = first node of next link, don't draw twice
					{
						previousCoordXonLink = hpx; previousCoordYonLink = hpy;
						continue;
					}

					slopeDegree = (slope * 10.0) / 10.0;
					slopeDegree = slopeDegree.toFixed(2);
					
				//	slopePercent = slopeString == null ? 0.0 : Math.round(Math.tan(slope * Math.PI / 180.0) * 100);
				
					slopePercent = slopeString == null ? 0.0 :(Math.tan(slope * Math.PI / 180.0) * 100);
					
					slopePercent = slopePercent.toFixed(3);
				
					slopeBackColor = ((slopeString == null) || (Math.abs(slope) == 1000000)) ? "#BBBBFFB0" : (slopePercent == 0.0 ? "#FFFFFF" : (slopePercent > 0.0 ? "#F099B6" : "#99F0B8"));
					slopeText = ((slopeString == null) || (Math.abs(slope) == 1000000)) ? "no slope" : (slopePercent + "% = " + slopeDegree + " \u00B0");
					
					

					if (document.getElementById('showSlopeData').checked) {
						
						var slopeIcon = createIconSlope(slopeText, slopeText.length, slopeBackColor);
					//	var slopeIcon2 = createIconSlope(slopeText.slice(0,3), (slopeText.slice(0,3) + "    ").length, slopeBackColor);
						var slopeIcon2 = createIconSlope(slopeText.slice(0,7), (slopeText.slice(0,7) + "    ").length, slopeBackColor);
						
						marker = new H.map.Marker(new H.geo.Point(hpy, hpx),
						{
							icon: slopeIcon
						});
						
						marker.$slopeIcon = slopeIcon;
						marker.$slopeIcon2 = slopeIcon2;
						
						slopeMarkers.addObject(marker);
					}

					previousCoordX = hpx; previousCoordXonLink = hpx;
					previousCoordY = hpy; previousCoordYonLink = hpy;
				}
		}
	}

	function loadAdasFinished(response) {
		map.addObject(routeLinks);
		map.addObject(slopeMarkers);
		map.addObject(waypoints);

		waypoints.setZIndex(10);
		
		map.getViewModel().setLookAtData({
			tilt: 45,
			bounds: waypoints.getBoundingBox()
		});

		Spinner.hideSpinner();
	}

	var handleMarkerContainer = function () {
		if (document.getElementById("showSlopeData").checked)
			map.addObject(slopeMarkers);
		else
			map.removeObject(slopeMarkers);
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {

		var svgMarker = svgMarkerImage_Line;
		var _height = 60;
		var _width = line2.length * 4;
		var _widthAll = line2.length * 4 + 80;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, _width);
		svgMarker = svgMarker.replace(/__widthAll__/g, _widthAll);

		return new H.map.Icon(svgMarker, {
			size: { w: _widthAll, h: _height },
			anchor: new H.math.Point(24, 57)
		});
	};

	//--- Helper - Create slope information
	var createIconSlope = function (text, width, colour) {

		var svg = '<svg width="__widthAll__" height="36" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="27" fill="__colour__"/>' +
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__text__</text>' +
			'</g>' +
			'</svg>';

		var _width = width * 7;
		var _widthAll = width * 7 + 60;
		var _height = 36;

		svg = svg.replace(/__text__/g, text);
		svg = svg.replace(/__width__/g, _width);
		svg = svg.replace(/__widthAll__/g, _widthAll);
		svg = svg.replace(/__colour__/g, colour);

		return new H.map.Icon(svg, {
			size: { w: _widthAll, h: _height },
			anchor: { x: Math.round(_widthAll / 2), y: Math.round(_height / 2) }
		});

	};
	
	var switchIcons = function()
	{
		slopeMarkers.forEach(function(m, index, group)
		{
			if(m.getIcon() == m.$slopeIcon)
				m.setIcon(m.$slopeIcon2);
			else
				m.setIcon(m.$slopeIcon);
		});
	}