/*
	* author domschuette
	* (C) HERE 2017
	*/

	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
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

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="<br />JS API: 3."+ H.buildInfo().version;
	
	//add MRS Release information
	loadMRSVersionTxt();
	
	//helper
	var releaseGeocoderShown = false,
		releaseRoutingShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	routeButton    = document.getElementById("routeButton"  ),
		start          = document.getElementById("start"        ),
		dest           = document.getElementById("dest"         ),
		mapReleaseTxt  = document.getElementById("mapReleaseTxt"),
		pointA,
		pointB,
		bLongClickUseForStartPoint = true;
	
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
		group.removeAll();
		geocode(start.value, true);
	};

	var geocode = function(searchTerm, start)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.search(
			{
				searchText: searchTerm
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
				line2 = address.Label ? address.Label : line1;

				marker = new H.map.Marker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					if(start)
						geocode(dest.value, false);
					else
						calculateRoute(pointA, pointB);
			},
			function(error) {
				alert(error);
			}
		);
	}

	var calculateRoute = function(start, destination){
		var urlRoutingReq =
		["https://route.",
			"api.here.com/routing/7.2/calculateroute.json?",
			"jsonAttributes=1&",
			"waypoint0=",
			start.lat,
			",",
			start.lng,
			"&waypoint1=",
			destination.lat,
			",",
			destination.lng,
			"&representation=overview",
			"&routeattributes=sc,sm,sh,bb,lg,no,shape",
			"&legattributes=li",
			"&linkattributes=sh,nl,fc",
			"&mode=fastest;car;traffic:enabled",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=parseRoutingResponse"].join("");

			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}

	// parse the routing response
	var parseRoutingResponse = function (respJsonRouteObj)
	{
		if (respJsonRouteObj.error != undefined)
		{
			alert (respJsonRouteObj.error);
			return;
		}

		if (respJsonRouteObj.type != undefined && respJsonRouteObj.type =="ApplicationError")
		{
			alert (respJsonRouteObj.details);
			return;
		}
		
		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+respJsonRouteObj.response.metaInfo.moduleVersion;
			routerMapRelease = respJsonRouteObj.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}
		
		var geoJson = '{"type": "FeatureCollection","features": [{ "type": "Feature", "geometry": { "type": "MultiLineString","coordinates":[';
		
		// create link objects
		for(var m = 0; m < respJsonRouteObj.response.route[0].leg[0].link.length; m++)
		{
			var strip = new H.geo.Strip(),
			shape = respJsonRouteObj.response.route[0].leg[0].link[m].shape,
			i,
			l = shape.length;
			
			geoJson += "[";

			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				geoJson += "[" + shape[i].split(",").reverse() + "],";
			}
			geoJson = geoJson.slice(0,-1);
			var link = new H.map.Polyline(strip,
				{
					style:
					{
						lineWidth: 5,
						strokeColor: "rgba(18, 65, 145, 0.4)",
						lineJoin: "round"
					}
				});

			link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});
			group.addObject(link);
			
			geoJson += "],";
		}
		
		geoJson = geoJson.slice(0,-1);
		geoJson += ']},"properties": {"prop0": "value0","prop1": 0}}]}';
				
		map.addObject(group);
		map.setViewBounds(group.getBounds());
		document.getElementById("textArea").innerHTML = JSON.stringify(JSON.parse(geoJson), undefined, 4);
	}
	
	function saveTextAsFile() {
		var textToWrite = document.getElementById('textArea').value;
		var textFileAsBlob = new Blob([ textToWrite ], { type: 'text/plain' });
		var fileNameToSaveAs = "trace.json";

		var downloadLink = document.createElement("a");
		downloadLink.download = fileNameToSaveAs;
		downloadLink.innerHTML = "Download File";
		if (window.webkitURL != null) {
			// Chrome allows the link to be clicked without actually adding it to the DOM.
			downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
		} else {
			// Firefox requires the link to be added to the DOM before it can be clicked.
			downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
			downloadLink.onclick = destroyClickedElement;
			downloadLink.style.display = "none";
			document.body.appendChild(downloadLink);
		}
	  downloadLink.click();
	}

	var button = document.getElementById('save');
	button.addEventListener('click', saveTextAsFile);

	function destroyClickedElement(event) {
	  // remove the link from the DOM
	  document.body.removeChild(event.target);
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length  * 4 + 30 );
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length  * 4 + 80);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	};