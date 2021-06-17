/*
		(C) HERE 2017
		Author dschuette
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);	

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});
	
	var objContainer = new H.map.Group();
	map.addObject(objContainer);
	
	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	map.addEventListener('tap', function (currentEvent) 
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		submitPosition(lastClickedPos);
	});
	
	var submitPosition = function(pos)
	{
		objContainer.removeAll();
		content = "SEQNR,\tLATITUDE,\tLONGITUDE\n1,\t" + (Math.round(pos.lat * 100000.0) / 100000.0) + ",\t" + (Math.round(pos.lng * 100000.0) / 100000.0);
		var url = "https://fleet.api.here.com/2/calculateroute.json?routeMatch=1&mode=fastest;car;traffic:disabled";
			url += "&attributes=SPEED_LIMITS_FCn(FROM_REF_SPEED_LIMIT,TO_REF_SPEED_LIMIT),TRUCK_SPEED_LIMITS_FCn(FROM_REF_SPEED_LIMIT,TO_REF_SPEED_LIMIT)" + "&app_id=" + app_id + "&app_code=" + app_code;
	
			$.ajax({
				url: url,
				dataType: "json",
				async: true,
				type: 'post',
				data:content,
				contentType: 'application/json',
				success: function(data) {
					gotRouteMatchResponse(data);
				},
				error: function(xhr, status, e) {
					alert(xhr.responseText);
				}
			});
	}

	var gotRouteMatchResponse = function (respJsonObj) {
		if (respJsonObj.error_id != undefined || respJsonObj.issues != undefined) {
			alert(respJsonObj.issues[0] + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		// draw the route
		var routeLinks = respJsonObj.response.route[0].leg[0].link;
		
		if(routeLinks && routeLinks[0] && routeLinks[0].attributes && routeLinks[0].attributes.SPEED_LIMITS_FCN && routeLinks[0].attributes.SPEED_LIMITS_FCN[0])
		{
			var toRefSpeedLimit = routeLinks[0].attributes.SPEED_LIMITS_FCN[0].TO_REF_SPEED_LIMIT,
				toRefTruckSpeedLimit = routeLinks[0].attributes.TRUCK_SPEED_LIMITS_FCN ? routeLinks[0].attributes.TRUCK_SPEED_LIMITS_FCN[0].TO_REF_SPEED_LIMIT : undefined,
				fromRefSpeedLimit = routeLinks[0].attributes.SPEED_LIMITS_FCN[0].FROM_REF_SPEED_LIMIT,
				fromRefTruckSpeedLimit = routeLinks[0].attributes.TRUCK_SPEED_LIMITS_FCN ? routeLinks[0].attributes.TRUCK_SPEED_LIMITS_FCN[0].FROM_REF_SPEED_LIMIT : undefined,
				toRefHTML = "",
				fromRefHTML = "",
				linkId = routeLinks[0].linkId;
			
			if(toRefSpeedLimit == "999")
				toRefHTML = "<h6>ToRefSpeedLimit (car / truck):</h6>" + "unlimited";
			else
				toRefHTML = toRefSpeedLimit == "0" ? "" : "<h6>ToRefSpeedLimit (car / truck):</h6>" + toRefSpeedLimit;
			if(fromRefSpeedLimit == "999")
				fromRefHTML = "<h6>FromRefSpeedLimit (car / truck):</h6>" + "unlimited"; 
			else
				fromRefHTML = fromRefSpeedLimit == "0" ? "" : "<h6>FromRefSpeedLimit (car / truck):</h6>" + fromRefSpeedLimit;
			
			if(toRefTruckSpeedLimit !== undefined)
			{
				toRefHTML += " / " + toRefTruckSpeedLimit;
			}
			else if(toRefHTML !== "")
			{
				toRefHTML += " / " + toRefSpeedLimit;
			}
			
			if(fromRefTruckSpeedLimit !== undefined)
			{
				fromRefHTML += " / " + fromRefTruckSpeedLimit;
			}
			else if(fromRefHTML !== "")
			{
				fromRefHTML += " / " + fromRefSpeedLimit;
			}
			
			document.getElementById("toRefSpeedLimit").innerHTML = toRefHTML;
			document.getElementById("fromRefSpeedLimit").innerHTML = fromRefHTML;
			linkId = routeLinks[0].linkId;
			document.getElementById("linkId").innerHTML = "<h5>LinkID: " + linkId + "</h5>";
		
		} else if (routeLinks && routeLinks[0] && routeLinks[0].linkId){
			linkId = routeLinks[0].linkId;
			document.getElementById("linkId").innerHTML = "<h5>LinkID: " + linkId + "</h5>";
			document.getElementById("toRefSpeedLimit").innerHTML = "No data";
			document.getElementById("fromRefSpeedLimit").innerHTML = "No data";

		}
		
		for (var l = 0; l < routeLinks.length; l++) {
			var coords1 = routeLinks[l].shape;
			var coords2 = new H.geo.Strip();
			for (var c = 0; c < coords1.length; c += 2)
				coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
			objContainer.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}}));
		}

		// draw the original and the matched trace points
		tracePoints = respJsonObj.response.route[0].waypoint;
		for (var l = 0; l < tracePoints.length; l++) {
			var p = tracePoints[l];
			objContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: createIcon("#000000", l)}));
			objContainer.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon("#00FF00", l)}));
		}
	}
	
	var createIcon = function (color, text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="16px">' +
			'<line x1="14"  y1="16" x2="14" y2="9" stroke="' + color + '"/>' +
			'<text font-size="10" x="14" y="8" text-anchor="middle" fill="' + color + '">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 14, y : 16}});
	};