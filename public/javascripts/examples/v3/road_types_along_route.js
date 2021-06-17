/*
	author vschuler, domschuette, wobecker, bguenebaut, mpukkonen
	(C) HERE 2014
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
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	geocoder = platform.getGeocodingService(),
	router = platform.getRoutingService(),
	group = new H.map.Group(),
	map = new H.Map(mapContainer, maptypes.normal.map,
	{
		center: center,
		zoom: zoom
	}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	map.addObject(group);

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);	

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	routeButton   = document.getElementById("routeButton");
	var	start         = document.getElementById("start");
	var	dest          = document.getElementById("dest");
	var	mapReleaseTxt = document.getElementById("mapReleaseTxt");

	var pointA;
	var pointB;
	var pdeManager;
	var routeLinkHashMap; // key = linkID, value = link object
	var routeBBox;
	var numLinksMatched = 0;
	var release;
	var bLongClickUseForStartPoint = true,
		startMarker =  null, 
		destMarker = null;

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
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				group.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA,
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
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
				group.removeObject(destMarker);
			}
			destMarker = new H.map.Marker(pointB,
				{
					icon: createIconMarker(line1, line2)
				});
			group.addObject(destMarker);
			bLongClickUseForStartPoint = true;
			routeButton.onclick();
		}
	}	

	
	// 1. User pressed button --> Geocode start address
	routeButton.onclick = function ()
	{
		Spinner.showSpinner();

		// clean up
		group.removeAll();

		feedbackTxt.innerHTML = "Routing from: " + start.value + " to " + dest.value + " ...";
		geocode(start.value, true);
	};

	// 2. Start address geocoded --> Geocode destination address  --> route
	var geocode = function(searchTerm, start)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.search(
		{
			searchText: searchTerm,
			additionaldata: "Country2,true"
		},
		function(result) {
			if(result.Response.View[0].Result[0].Location != null)
			{
				pos = result.Response.View[0].Result[0].Location.DisplayPosition;
				address = result.Response.View[0].Result[0].Location.Address;
			}
			else
			{
				pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				address = result.Response.View[0].Result[0].Place.Locations[0].Address;
			}

			if(start)
			pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
			else
			pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

			line1 = pos.Latitude + " " + pos.Longitude;
			line2 = address.Label ? address.Label : "";

			marker = new H.map.Marker(start ? pointA : pointB,
			{
				icon: createIconMarker(line1, line2)
			});

			group.addObject(marker);

			if(start) {
				// Geocode destination.
				geocode(dest.value, false);
				} else {

				/// Calculate route.
				calculateRouteDirect(pointA, pointB);
			}
		},
		function(error) {
			alert(error);
		}
		);
	}

	// 3. Route calculation start
	var calculateRouteDirect = function(start, destination){
		// do JSONP here
		urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+ start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +
		"&alternatives=1&departure=2014-04-01T15%3A04%3A34.698Z&requestid=sampleRequest&language=en-US&representation=overview&routeattributes=sc,sm,sh,bb,lg,no,shape&legattributes=li&linkattributes=sh,nl,fc&instructionformat=html&mode=fastest;car;traffic:enabled&app_id="+app_id+"&app_code="+app_code+"&jsoncallback=gotRoutingResponse";

		feedbackTxt.innerHTML = urlRoutingReq;
		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);

	}

	// parse the routing response
	var gotRoutingResponse = function (respJsonRouteObj)
	{
		if (respJsonRouteObj.error != undefined)
		{
			alert (respJsonRouteObj.error);
			feedbackTxt.innerHTML = respJsonRouteObj.error;
			return;
		}

		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+respJsonRouteObj.response.metaInfo.moduleVersion;
			routerMapRelease = respJsonRouteObj.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}

		var strip = new H.geo.Strip(),
		shape = respJsonRouteObj.response.route[0].shape,
		i,
		l = shape.length;

		for(i = 0; i < l; i++)
		{
			strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
		}

		var polyline = new H.map.Polyline(strip, // draw the route as a thin black line. It will be covered with the route type colors later on.
		{
			style:
			{
				lineWidth: 1,
				strokeColor: "rgba(0, 0, 0, 0.7)",
				lineJoin: "round"
			}
		});

		group.addObject(polyline);

		
		var links = respJsonRouteObj.response.route[0].leg[0].link;

		routeLinkHashMap = new Object();
		for (m = 0; m < links.length; m++) {
			routeLinkHashMap[parseInt(links[m].linkId)] = links[m];
		}

		// Select PDE layers
		var layers = new Object();
		layers["LINK_ATTRIBUTE_FC"] = {callback: gotAttributesTileResponse};

		// Init PDE
		var pdeManager = new PDEManager(app_id, app_code, layers);
		pdeManager.setOnTileLoadingFinished(loadLinksFinished);
		pdeManager.setLinks(links);
		pdeManager.start();
	}

	function gotAttributesTileResponse (respJsonObj)
	{
		if (respJsonObj.error != undefined)
		{
			feedbackTxt.innerHTML = respJsonObj.error;
			return;
		}

		feedbackTxt.innerHTML = "Received Attributes info for " + respJsonObj.Rows.length + " (splitted) links";

		for (r = 0; r < respJsonObj.Rows.length; r++)
		{
			linkId = parseInt(respJsonObj.Rows[r].LINK_ID);
			routeLinkDir = '+';
			routeLink = routeLinkHashMap[linkId];
			if (routeLink == null) // maybe route is driving it to ref node
			{
				routeLink = routeLinkHashMap[-linkId];
				if (routeLink == null) // linkID is not on the route
				continue;
				routeLinkDir = '-';
			}

			var strip = new H.geo.Strip(),
			shape = routeLink.shape,
			i,
			l = shape.length;

			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(','));
			}

			// set the color per route type
			color = "rgba(204, 204, 204, 0.5)";
			if      ((respJsonObj.Rows[r].ROUTE_TYPES & 2) == 2) color = "rgba(0, 0, 255, 0.5)"; // Motorway
			else if ((respJsonObj.Rows[r].ROUTE_TYPES & 4) == 4) color = "rgba(255, 180, 0, 0.5)"; // Express Highway
			else if ((respJsonObj.Rows[r].ROUTE_TYPES & 1) == 1) color = "rgba(153, 153, 255, 0.5)"; // Inter* route less interesting (color only if not type 2 or type 3)
			else if ((respJsonObj.Rows[r].ROUTE_TYPES & 8) == 8) color = "rgba(0, 255, 0, 0.5)"; // Highway

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

			// draw red line on top if urban
			if ( respJsonObj.Rows[r].URBAN == "Y")
			{

				var polyline = new H.map.Polyline(strip,
				{
					style:
					{
						lineWidth: 2,
						strokeColor: "rgba(255, 0, 0, 0.9)",
						lineJoin: "round"
					}
				});
				group.addObject(polyline);

			}

			numLinksMatched++;
		}
	};

	function loadLinksFinished(nrTilesRequested) {
		document.getElementById('colors').style.display = 'block';
		Spinner.hideSpinner();
		map.setViewBounds(group.getBounds());
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length  *4 );
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length  *4 + 80);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});

	};