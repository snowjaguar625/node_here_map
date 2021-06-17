/* 
		author Ali Aien
		TCS Melbourne
		(C) HERE 2015
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);    

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
		maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		geocoder = platform.getGeocodingService(),
		router = platform.getRoutingService(),
		group = new H.map.Group(),
		markerGroup = new H.map.Group(),
		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(-37.810942, 144.958287),
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

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine)

	//add JS API Release information
	releaseInfoTxt.innerHTML += "<br />JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	map.addObject(markerGroup);
	
	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	routeButton  = document.getElementById("routeButton" );
	var	start        = document.getElementById("start"       );
	var	dest         = document.getElementById("dest"        );
	var	mapReleaseTxt  = document.getElementById("mapReleaseTxt" );

	var pointA;
	var pointB;
	var startMarker = null;
	var destMarker = null;
	var routeLinkHashMap  = new Object(); // key = linkID, value = link object
	var routerMapRelease;
	var release;
	var currentBubble;
	var m_iCountTceRequests = 0;
	var m_iCountTceResponse = 0;
	var m_listCurrRouteTollCountries = [];
	var currentOpenBubble;
	var bErrorHappened = false;
	var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination
	
	var routeColor = "rgba(18, 65, 145, 0.3)";
	var strRoutingRequestSend = "Routing request sent. Waiting for response...";
	var strTceResponseReceived = "Received TCE response. Processing it now.";
	
	// should display the warnings … warnings = respJsonObj.Warnings;  if (warnings.length > 0) …
	var warningsArea = document.createElement("TEXTAREA");
	warningsArea.id = "warningsArea";
	warningsArea.readOnly = true;
	warningsArea.wrap = 'off';
	warningsArea.cols = 50;
	document.getElementById("warningscontainer").appendChild(warningsArea);

	/************************************
	
		Geocoding and routing methods
		
	************************************/

	function clearLastRouteCalculation()
	{
		bErrorHappened = false;
		bLongClickUseForStartPoint = true;
		if(currentOpenBubble)
		{
			ui.removeBubble(currentOpenBubble);
		}
		group.removeAll();
		
		warningsArea.value = "";

	}

	/************************************
		Start Route Calculation
	************************************/
	var startRouteCalculation = function()
	{
		clearLastRouteCalculation();
		geocode(start.value, true);
	}
	routeButton.onclick = startRouteCalculation;

	/********************************************************
			Start/Destination selection via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			clearLastRouteCalculation();
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			start.value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				markerGroup.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA, 
			{
				icon: createIconMarker(line1, line2)
			});
			markerGroup.addObject(startMarker);
			bLongClickUseForStartPoint = false;
		}
		else
		{
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			dest.value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
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
				
				
				if(start)
				{
					if(startMarker !=  null)
					{
						markerGroup.removeObject(startMarker);
					}
					startMarker = new H.map.Marker(pointA, 
					{
						icon: createIconMarker(line1, line2)
					});
					markerGroup.addObject(startMarker);
				

				}
				else
				{
					if(destMarker !=  null)
					{
						markerGroup.removeObject(destMarker);
					}
					destMarker = new H.map.Marker(pointB, 
					{
						icon: createIconMarker(line1, line2)
					});
					markerGroup.addObject(destMarker);
					map.setViewBounds(markerGroup.getBounds());
				}
				
				
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

	/************************************
		Actual Route Calculation
	************************************/
	var calculateRoute = function(start, destination)
	{
		
		// generate routing request
		var transportMode = "car";
		var traffictMode = document.getElementById('traffic').value;

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
				"&routeAttributes=sh,bb,lg",
				"&linkAttributes=all",
				"&legAttributes=all",						
				"&mode=fastest;" + transportMode + ";traffic:" + traffictMode,
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
	var parseRoutingResponse = function (resp)
	{
		if (resp.error != undefined)
		{
			if(resp.error=="NoRouteFound")
			{
				alert('Please consider to change your start or destination as the one you entered is not reachable with the given vehicle profile');
				feedbackTxt.innerHTML = 'The Router service is unable to compute the route: try to change your start / destination point';
			}
			else
			{
				alert (resp.error);
				feedbackTxt.innerHTML = resp.error;
			}
			return;
		}
		if (resp.response == undefined)
		{					
			if(resp.subtype=="NoRouteFound")
			{
				alert('Please consider to change your start or destination as the one you entered is not reachable with the given vehicle profile');
				feedbackTxt.innerHTML = 'The Router service is unable to compute the route: try to change your start / destination point';
			}
			else
			{
				alert (resp.subtype + " " + resp.details);
				feedbackTxt.innerHTML = resp.error;
			}
			return;
		}
	
		//add Routing Release number if not already done
		if (releaseRoutingShown== false){
			var meta = resp.response.metaInfo.moduleVersion;

			releaseInfoTxt.innerHTML+="<br /> Routing: " + meta;
			releaseRoutingShown = true;
		
		}
		routerMapRelease = "unknown";
		aditionalData = resp.response.metaInfo.moduleVersion;
		

		
		warningsArea.value += 'No. of Links: ' +resp.response.route[0].leg[0].link.length;
		
		for (i=0; i< aditionalData.length; i++)
		{
			if (aditionalData[i].key == "Map0")
			{
				routerMapRelease = aditionalData[i].value;
				console.log(aditionalData[i].value);
				mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			}
		}	

		routeLinkHashMap = new Object();
		
		
		// create link objects
		for(var m = 0; m < resp.response.route[0].leg[0].link.length; m++)
		{
			var strip = new H.geo.Strip(),
				shape = resp.response.route[0].leg[0].link[m].shape, 
				i = 0,
				l = shape.length;
				
			for(; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
			}
			
			var link = new H.map.Polyline(strip, 
			{
				style: 
				{
					lineWidth: 3,
					strokeColor: routeColor,
					lineJoin: "miter"
				}	
			});
			link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});
			link.$linkId = resp.response.route[0].leg[0].link[m].linkId;					
			
			
			warningsArea.value += '\n';
			warningsArea.value += resp.response.route[0].leg[0].link[m].linkId;
			
			// add event listener to link
			link.addEventListener("pointerdown", function(e)
			{
				if(currentOpenBubble)
					ui.removeBubble(currentOpenBubble);
				var html =  '<div>'+
						'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkId: ' + e.target.$linkId +'</p>'
						'</div>';
				
				
				
				var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
				
				currentOpenBubble = new H.ui.InfoBubble(pos, { content: html });
				ui.addBubble(currentOpenBubble);
			});		
			
			group.addObject(link);
		}

		map.addObject(group);
	}

//--- Helper - Create Start / Destination marker 
var createIconMarker = function (line1, line2) {
	var svgMarker = svgMarkerImage_Line;

	svgMarker = svgMarker.replace(/__line1__/g, line1);
	svgMarker = svgMarker.replace(/__line2__/g, (line2 != undefined ? line2 : ""));
	svgMarker = svgMarker.replace(/__width__/g, (line2 != undefined ? line2.length  *4  + 20 : (line1.length * 4 + 80)));
	svgMarker = svgMarker.replace(/__widthAll__/g, (line2 != undefined ? line2.length  *4  + 80 : (line1.length * 4 + 150)));
	
	return new H.map.Icon(svgMarker, {
		anchor: new H.math.Point(24, 57)
	});

};