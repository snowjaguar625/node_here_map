/*
	* author domschuette
	* (C) HERE 2014-2019
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(),
	geocoder = platform.getGeocodingService(),
	router = platform.getRoutingService(),
	group = new H.map.Group(),
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: center,
            zoom: zoom,
            pixelRatio: window.devicePixelRatio || 1
		}
	);
	map.getViewModel().setLookAtData({
		tilt: 45
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="<br />JS API: 3."+ H.buildInfo().version;
	//add MRS Release information
	loadMRSVersionTxt();
	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var layers = new Object();
	layers["TRAFFIC_SIGN_FC"] = {callback: pdeResponse};
	
	var signs = {};

	var	routeButton  = document.getElementById("routeButton"),
	start        = document.getElementById("start"      ),
	dest         = document.getElementById("dest"       ),
	mapReleaseTxt  = document.getElementById("mapReleaseTxt"),
	pointA,
	pointB,
	pointV,
	pdeManager = new PDEManager(app_id, app_code, layers),
	currentBubble,
	numLinksMatched = 0,
	bLongClickUseForStartPoint = true,
	routeLinksMap;
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		geocode(lastClickedPos.lat + "," + lastClickedPos.lng, bLongClickUseForStartPoint);
		if(!bLongClickUseForStartPoint)
		{
			document.getElementById("dest").value = lastClickedPos.lat + "," + lastClickedPos.lng;
			group.removeAll();
		}
		else
		{
			document.getElementById("start").value = lastClickedPos.lat + "," + lastClickedPos.lng;
		}
		bLongClickUseForStartPoint = bLongClickUseForStartPoint ? false : true; 
	}

	routeButton.onclick = function ()
	{
		pointA = null; 
		pointB = null;
		pointV = null;
		group.removeAll();
		geocode(start.value, "start");
	};

	var geocode = function(searchTerm, which)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.search(
			{
				searchText: searchTerm,
				requestId: which
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition
				}
				
				var which = result.Response.MetaInfo.RequestId,
					p; 
				
				if(which == "start")
				{
					pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
					p = pointA;
				}
				else if (which == "dest")
				{
					pointB = new H.geo.Point(pos.Latitude, pos.Longitude);
					p = pointB;
				}
				else 
				{
					pointV = new H.geo.Point(pos.Latitude, pos.Longitude);
					p = pointV;
				}

				if(result.Response.View[0].Result[0].Location != null)
				{
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else
				{
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}

				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = address.Label ? address.Label : line1;

				marker = new H.map.DomMarker(p,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					if(which == "start")
						geocode(dest.value, "dest");
					else if(pointA && pointB && !pointV && document.getElementById("via").value == "")
						calculateRoute(pointA, pointB);
					else if(pointA && pointB &&  !pointV && document.getElementById("via").value != "")
						geocode(document.getElementById("via").value, "via")
					else if(pointA && pointB && pointV)
						calculateRoute(pointA, pointB, pointV);
			},
			function(error) {
				alert(error);
			}
		);
	}

	var calculateRoute = function(start, destination, via){
		signs = {};
		var urlRoutingReq =
		["https://route.",
			"api.here.com/routing/7.2/calculateroute.json?",
			"jsonAttributes=1&",
			"waypoint0=",
			start.lat,
			",",
			start.lng,
			"&waypoint1=",
			via ? via.lat : destination.lat,
			",",
			via ? via.lng : destination.lng,
			via ? "&waypoint2=" : "",
			via ? destination.lat : "", 
			via ? "," : "",
			via ? destination.lng : "",
			"&representation=overview",
			"&routeattributes=sc,sm,sh,bb,lg,no,shape",
			"&legattributes=li",
			"&linkattributes=sh,nl,fc",
			"&mode=fastest;car;traffic:enabled",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=parseResponse"].join("");

			feedbackTxt.innerHTML = urlRoutingReq;
			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}


	// parse the routing response
	var parseResponse = function (resp)
	{
		if (resp.error != undefined)
		{
			alert (resp.error);
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.response == undefined)
		{
			alert (resp.subtype + " " + resp.details);
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+resp.response.metaInfo.moduleVersion;
			routerMapRelease = resp.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}

		var strip = new H.geo.LineString(),
		shape = resp.response.route[0].shape,
		i,
		l = shape.length;

		for(i = 0; i < l; i++)
		{
			strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
		}

		polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "rgba(18, 65, 145, 0.7)",
					lineJoin: "round"
				}
			});

			group.addObject(polyline);

			var links = [];
			for(var i = 0; i < resp.response.route[0].leg.length; i++)
				links = links.concat(resp.response.route[0].leg[i].link);
			
			pdeManager.setLinks(links);
			pdeManager.setBoundingBoxContainer(group);
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
			pdeManager.start();
	}

	function pdeManagerFinished(finishedRequests)
	{
		feedbackTxt.innerHTML = "Done. Requested " + finishedRequests + " PDE tiles for " + numLinksMatched + " route links. ";
		
		var resultHTML = '<table class="pde_table" cellpadding="2" cellspacing="0" border="1" width="90%">' +
						 '<thead>' + 
							'<tr>' +
							'<th width="80%">Sign</th>' +
							'<th width="20%">#</th>' +
							'</tr>' +
						 '</thead>' +
						 '<tbody id="maps_table_body">';

		for(var sign in signs)
		{
			resultHTML += "<tr>" + "<td>" + sign + "</td>" + "<td>" + signs[sign] + "</td>" + "</tr>";
		}
		
		resultHTML += "</tbody>" + "</table>";

		document.getElementById("resultArea").innerHTML = resultHTML;
		document.getElementById("resultArea").style.display = "block";
		
		map.addObject(group);
        //map.setViewBounds(group.getBoundingBox());
        map.getViewModel().setLookAtData({
            bounds: group.getBoundingBox()
        });
	}

	function pdeResponse(respJsonObj)
	{
		if (respJsonObj.error != undefined)
		{
			feedbackTxt.innerHTML = respJsonObj.error;
			return;
		}
		if (respJsonObj.responseCode != undefined)
		{
			alert (respJsonObj.message);
			feedbackTxt.innerHTML = respJsonObj.message;
			return;
		}

		feedbackTxt.innerHTML = "Received Attributes info for " + respJsonObj.Rows.length + " (splitted) links";
		for (r = 0; r < respJsonObj.Rows.length; r++)
		{
			var conditionType = respJsonObj.Rows[r].CONDITION_TYPE;
			var signType = respJsonObj.Rows[r].TRAFFIC_SIGN_TYPE == null ? "0" : respJsonObj.Rows[r].TRAFFIC_SIGN_TYPE;
			var linkIds = respJsonObj.Rows[r].LINK_IDS.split(','); // variable speed signs have 2 links, all others just one link
			var linkId = parseInt(linkIds[0]);
			var routeLink = pdeManager.getRouteLinks()[linkId]; // the link, including direction (+/-), must be on the route
			if (routeLink == null)
			{
				continue;
			}
			if (conditionType == 11) // the variable speed sign condition applies only, if both links are on the route, and in the correct direction
			{
				var linkId2 = parseInt(linkIds[1]);
				var routeLink2 = pdeManager.getRouteLinks()[linkId2];
				if (routeLink2 == null)
				{
					continue;
				}
			}

			var strip = new H.geo.LineString(),
			shape = routeLink.shape,
			i,
			l = shape.length;

			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(','));
			}

			if (conditionType == "17") {
					while (signType.length < 3) 
						signType = "0" + signType;
			}
			var trafficSignIdentifier = conditionType + "_" + signType;
			var trafficSign = trafficSigns[trafficSignIdentifier];
			var color = "rgba(255, 10, 50, 0.7)";
				
			if(signs[trafficSign] != undefined)
				signs[trafficSign]++;
			else
				signs[trafficSign] = 1;	

			// For No overtaking don't show icon, instead add polyline 
			if (conditionType == "19") {
				color = "rgba(255, 0, 0, 1)";
				polyline = new H.map.Polyline(strip, {
					style: {
						lineWidth: 5,
						strokeColor: color,
						lineJoin: "round"
					}
				});
				polyline.$CONDITION_ID = respJsonObj.Rows[r].CONDITION_ID;
				polyline.$TRAFFIC_SIGN = trafficSign;
				
				polyline.addEventListener("pointerdown", function(e){
					if (currentBubble) 
						ui.removeBubble(currentBubble);
					var html = '<div>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Condition ID: ' +
					e.target.$CONDITION_ID +
					'</p>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Sign Type: ' +
					e.target.$TRAFFIC_SIGN +
					'</p>' +
					'</div>';
					
					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
					
					currentBubble = new H.ui.InfoBubble(pos, {
						content: html
					});
					ui.addBubble(currentBubble);
				});
				
				group.addObject(polyline);
			}
			else {
			
			    // Note: The router returns the geometry points of a link in route driving direction. He doesn't start with the reference node coordinate.
				// If linkID > 0: Driving from ref node. Sign is posted at the non-ref node of the link. Last coordinate returned from router.
				// If linkID < 0: Driving to   ref node. Sign is posted at the     ref node of the link. Last coordinate returned from router.
				var stripArr = strip.getLatLngAltArray();
				var point = new H.geo.Point(stripArr[stripArr.length - 3], stripArr[stripArr.length - 2]);
				
				var signMarker;
			
				
				if (trafficIcons[trafficSignIdentifier + "_eu"]) {
					signMarker = new H.map.Marker(point, {
						icon: trafficIcons[trafficSignIdentifier + "_eu"]
					});
				}
				else {
					signMarker = new H.map.Marker(point, {
						icon: trafficIcons["11_000_eu"]
					});
				}
				// Traffic sign description available in PDE documentation
				
				signMarker.$CONDITION_ID = respJsonObj.Rows[r].CONDITION_ID;
				signMarker.$TRAFFIC_SIGN = trafficSign;
				signMarker.addEventListener("pointerdown", function(e){
					if (currentBubble) 
						ui.removeBubble(currentBubble);
					var html = '<div>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Condition ID: ' +
					e.target.$CONDITION_ID +
					'</p>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Sign Type: ' +
					e.target.$TRAFFIC_SIGN +
					'</p>' +
					'</div>';
					
					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
					
					currentBubble = new H.ui.InfoBubble(pos, {
						content: html
					});
					ui.addBubble(currentBubble);
				});
				group.addObject(signMarker);
			}
			numLinksMatched++;
		}
	};


	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
        line2 = line2.trim();
		var domElement = document.createElement('div');
		domElement.style.marginTop = "-55px";
		domElement.style.marginLeft = "-27px";
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length  *4);
        svgMarker = svgMarker.replace(/__widthAll__/g, line2.length  *4 + 80);
		domElement.innerHTML = svgMarker;

		return new H.map.DomIcon(domElement);


	};