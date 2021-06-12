/*
	(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	maptypes =platform.createDefaultLayers(),
	router = platform.getRoutingService(),
	incidentService = platform.getTrafficService(),
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: center,
			zoom: zoom
		}
	),
	
	incidentGeneric = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="31" baseProfile="tiny" viewBox="0 0 26 31"><path fill="#868686" d="M16.995 28.98c0 1.115-1.79 2.02-4 2.02s-4-.905-4-2.02c0-1.118 1.79-2.026 4-2.026s4 .907 4 2.025"/><path fill="{color}" d="M1.702 17.693C.13 16.127.118 13.837 1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.693l-11.29 11.286L1.702 17.693z"/><path fill="#fff" d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213m0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.712.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0zM13.035 16.534c-.754 0-1.365.595-1.365 1.32 0 .73.613 1.326 1.365 1.326s1.363-.595 1.363-1.326c0-.725-.61-1.32-1.363-1.32zm0-1.332c.568 0 1.057-.448 1.088-.993l.365-5.916c.033-.548-.615-.996-1.455-.996-.832 0-1.49.448-1.453.996l.36 5.915c.034.544.526.992 1.095.992z"/></svg>',
	incidentCongestion = '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 18,15 0,0 c 0,-0.1 0,-0.2 0,-0.4 l 0,-0.2 c 0,-0.1 0,-0.2 0,-0.4 0,0 0,0 0,0 0.6,0 1.1,-0.4 1.1,-1 0,-0.5 -0.5,-1 -1,-1 -0.7,0 -1.1,0.5 -1.1,1 -0.1,0 -0.3,-0.1 -0.4,-0.1 l -0.6,0 -0.3,-0.5 C 15.2,11.6 14.3,11 13.3,11 L 18,11 17.2,9.6 C 17,9.3 16.7,9 16.3,9 L 12.8,9 C 12.4,9 12,9.3 11.8,9.6 L 11.1,11 9.8,11 C 9.7,11 9.6,11 9.5,11 9.2,11 9,10.9 9,10.6 L 9,10.4 C 9,10.2 9.2,9.9 9.5,9.9 l 1.2,0 0.6,-1.04 c 0.3,-0.5 0.9,-0.9 1.5,-0.9 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1.04 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 18.3,16 18,15.8 18,15.6 L 18,15 z M 8,18.1 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.6,0 -1.1,0.5 -1.1,1 0,0.6 0.5,1.1 1.1,1.1 m 7,0 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.5,0 -1,0.5 -1,1 0,0.6 0.5,1.1 1,1.1 M 14.2,13.6 C 14,13.3 13.7,13 13.3,13 L 9.8,13 C 9.4,13 9,13.3 8.8,13.6 L 8.1,15 15,15 14.2,13.6 z m -8.2,1 0,-0.2 c 0,-0.2 0.2,-0.5 0.5,-0.5 l 1.1,0 0.7,-1 C 8.6,12.4 9.2,12 9.8,12 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 15.3,20 15,19.8 15,19.6 L 15,19 8,19 8,19.6 C 8,19.8 7.8,20 7.5,20 l -1,0 C 6.2,20 6,19.8 6,19.6 l 0,-3.4 c 0,-0.4 0.2,-0.8 0.6,-1.1 l -0.1,0 C 6.2,15.1 6,14.9 6,14.6" fill="#ffffff" /></svg>',
	incidentClosed = '<svg width="26" height="31" viewBox="0 0 26 31" xmlns="http://www.w3.org/2000/svg"><g fill="none"><g><path d="M16.995 28.98c0 1.116-1.79 2.02-4 2.02s-4-.904-4-2.02c0-1.118 1.79-2.023 4-2.023 2.21-.004 4 .904 4 2.022" fill="#868686"/><path d="M1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.692l-11.29 11.286L1.702 17.693C.13 16.127.118 13.837 1.675 11.995z" id="Shape" fill="{color}"/><path d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213zm0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.713.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0z" id="Shape" fill="#fff"/><path fill="#fff" d="M9 15h1.5v3.8H9zM16 15h1.5v3.8H16z"/><path d="M20.01 13.965c0 .276-.225.5-.5.5h-13c-.275 0-.5-.224-.5-.5v-2.637c0-.276.225-.5.5-.5h13c.275 0 .5.224.5.5v2.637z" id="Shape" fill="#fff"/><path d="M9.565 11.33l-2.638 2.634h3.107l2.635-2.635H9.564zM16.004 11.33l-2.634 2.634h3.105l2.634-2.635h-3.106z" fill="#D5232F"/></g></g></svg>',
	incidentConstruction = '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 9.24,13.2 -3.7,6.8 1.3,0 2.8,-5.1 1.36,1.5 0,3.6 1.1,0 0,-4 -1.4,-1.6 -1.46,-1.2 z M 14.2,9.5 c 0.7,0 1.3,-0.5 1.3,-1.21 0,-0.7 -0.6,-1.2 -1.3,-1.2 -0.7,0 -1.2,0.5 -1.2,1.2 0,0.71 0.5,1.21 1.2,1.21 m -4.46,0.5 1.06,0 -0.96,2.1 -1,-0.8 0.9,-1.3 z m 2.56,4 -1,-0.7 1,-1.9 0,2.6 z m 6.9,1.7 c -0.4,-0.5 -1.5,-1.1 -2.3,0 -0.2,0.3 -0.6,0.7 -0.9,1.2 l -2.7,-2.1 0,-5 -0.8,-0.7 -3.26,0 -1.5,2.3 7.86,6 C 14.7,18.6 13.8,20 13.8,20 l 6,0 1.5,-1.6 c 0,0 -1.7,-2.2 -2.1,-2.7" fill="#ffffff" /></svg>',
	infoTemplate = 
			'<div>' +
			'<p > <b>{{title}}</b></p>' +
			'<p >{{desc}}</p>' +
			'<p >' +
			'<span> <b>Start Time: </b></span><span >{{from}}</span><br/>' +
			'<span ><b>Estimated End Time: </b></span><span >{{until}}</span><br/>' +
			'<span ><b>Length: </b></span><span >{{length}}</span></p>' +
			'</div>';

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseRoutingShown = false;


	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	function calculateRoute()
	{
		var calculateRouteParams = {
			'waypoint0' : '50.11203,8.68281',
			'waypoint1' : '50.1238883,8.6124551',
			'mode': 'fastest;car;traffic:disabled',
			'legAttributes': 'li',
			'linkAttributes': 'ds,sh',
			'routeAttributes' : 'lg,bb',
			'representation': 'display'
		},
		onResult = function(result) {
			//add Routing Release number if not already done
			if (releaseRoutingShown== false){
				releaseInfoTxt.innerHTML+="<br />HLP Routing: "+result.response.metaInfo.moduleVersion;
				releaseRoutingShown = true;
			}
			
			// linkAttributes from Routing response contains JamFactor
			// under the Dynamic Speed Info 
			// https://developer.here.com/documentation/routing/topics/resource-type-dynamic-speed-info.html#resource-type-dynamic-speed-info
			var route = result.response.route[0];
			var linkAttributes=route.leg[0].link;
			var linkCount = linkAttributes.length;
			for(var i=0;i<linkCount;i++){
					var strip = new H.geo.LineString();
					var linkAttribute = linkAttributes[i];
					var shape = linkAttribute.shape;
					var shapeLength = shape.length;
			
					for(var j = 0; j < shapeLength; j++)
					{
						strip.pushLatLngAlt.apply(strip, shape[j].split(',').map(function(item) { return parseFloat(item); }));
					}
					
					var dynamicSpeedInfo = linkAttribute.dynamicSpeedInfo;
					var jamFactor = dynamicSpeedInfo.jamFactor;
					// color for polyline is updated based on JamFactor
					var polyline = new H.map.Polyline(strip,
					{
						style:
						{
							lineWidth: 5,
							strokeColor: getColorForJF(jamFactor),
						}
					});
					polyline.$JF = jamFactor;
					polyline.$BaseSpeed = dynamicSpeedInfo.baseSpeed;
					polyline.$TrafficSpeed = dynamicSpeedInfo.trafficSpeed;
					
					// onclick show jam factor, base speed and traffic speed values
					polyline.addEventListener('pointerdown', function (e) {
							clearBubbles();
							
							var html =  '<div>'+
								'<p class="info">JamFactor: ' + e.target.$JF +'</p>'+
								'<p class="info">Base Speed: ' + Math.round(parseFloat(e.target.$BaseSpeed)) +'m/s </p>'+
								'<p class="info">Traffic Speed: ' + Math.round(parseFloat(e.target.$TrafficSpeed)) +'m/s </p>'+
								'</div>';
							var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
							infoBubble = new H.ui.InfoBubble(pos, { content: html });
							ui.addBubble(infoBubble);
					});
					
					map.addObject(polyline);
			}
			
			// For adding corridor for Traffic incidents use 
			// the Route shape (to avoid duplicate coordinates)
			var corridor = "",
				shape = route.shape,
				i,
				l = shape.length;
			
			for(var i = 0; i < l; i++)
			{
				var shp = shape[i].split(',');
				corridor += shp[0] + "," + shp[1] + ";";
				
			}
			corridor += "2";
			
			// bounding box to show route is available from
			// routing response
			var boundingBox = route.boundingBox;
			var mapBoundingBox = new H.geo.Rect(
					boundingBox.topLeft.latitude,
						boundingBox.topLeft.longitude,
							boundingBox.bottomRight.latitude,
								boundingBox.bottomRight.longitude);
			
			map.getViewModel().setLookAtData({
				tilt: 45,
				bounds: mapBoundingBox
			});
			
			// request incident data for the route with the corridor
			requestTrafficForCorridor(corridor);
		},
		onError = function(error) {
			console.log(error);
		}
		router.calculateRoute(calculateRouteParams, onResult, onError);
	}
	
	var requestTrafficForCorridor = function(corridor)
	{
		// incidents parameters
		var incidentParams = {
			'corridor' :corridor
		},
		onResult = function(response)
		{
			// Traffic incident data response is defined in Traffic API 
			// https://traffic.api.here.com/traffic/6.0/xsd/incident2.2.xsd?app_id={YOUR_APP_ID} &app_code={YOUR_APP_CODE} 
			if (response && response.TRAFFIC_ITEMS && response.TRAFFIC_ITEMS.TRAFFIC_ITEM) {

				items = response.TRAFFIC_ITEMS.TRAFFIC_ITEM;
				i = items.length;

				var listIncidents = document.getElementById('listIncidents');
				while (i--) {

					if (items[i].LOCATION && items[i].LOCATION.GEOLOC && items[i].LOCATION.GEOLOC.ORIGIN) {

						var tooltipContent = "";

						if (items[i].TRAFFIC_ITEM_TYPE_DESC) {
							tooltipContent += "<strong>Type</strong>: " + items[i].TRAFFIC_ITEM_TYPE_DESC + "<br /><hr />";
						}

						if (items[i]["RDS-TMC_LOCATIONS"]) {

							var length = items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0].LENGTH;
							var unit = "";
							if (length >= 1) {
								
								length = length.toFixed(1);                                
								unit = "km";
							}
							else {
								length = length * 1000;
								length = length.toFixed(0);
								unit = "m";
							}
						}

						var description = items[i].TRAFFIC_ITEM_TYPE_DESC,
							criticality = items[i].CRITICALITY.DESCRIPTION,

							svgString,
							closed,
							color;

						if(items[i].TRAFFIC_ITEM_DETAIL && items[i].TRAFFIC_ITEM_DETAIL.ROAD_CLOSED)
							closed = true;

						// based on criticaltiy decide the color for the icons
						if(criticality === "major")
							color = "#D5232F";
						else if(criticality === "minor")
							color = "#ffa100";
						else 
							color = "#000";
						
						if(description == "CONGESTION")
						{
							svgString = incidentCongestion;
						}
						else if(description == "CONSTRUCTION")
						{
							svgString = incidentConstruction;
						}
						else if(description == "MISCELLANEOUS" && closed == true)
						{
							svgString = incidentClosed;
						}
						else
						{
							svgString = incidentGeneric;
						}
						svgString = svgString.replace('{color}', color);

						var icon = new H.map.Icon(svgString, {
							size: { w: 26, h: 31 },
							anchor: { x: (26/2), y: (31/2) }
						});

						var tooltipContent = infoTemplate;
						tooltipContent = tooltipContent.replace('{{title}}', description);
						
						if (items[i]["RDS-TMC_LOCATIONS"] && items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"])
						{
							if(items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"].DESCRIPTION)
								tooltipContent = tooltipContent.replace('{{desc}}', items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"].DESCRIPTION);
							else
								tooltipContent = tooltipContent.replace('{{desc}}', '');
						}
						else
						{
							tooltipContent = tooltipContent.replace('{{desc}}', '');
						}

						tooltipContent = tooltipContent.replace('{{from}}', items[i].START_TIME).replace('{{until}}', items[i].END_TIME).replace('{{length}}', length + unit);
						// Create a marker for incident locations
						var marker = new H.map.Marker(new H.geo.Point(items[i].LOCATION.GEOLOC.ORIGIN.LATITUDE, items[i].LOCATION.GEOLOC.ORIGIN.LONGITUDE), {
							icon: icon
						});
						marker.$tooltipContent = tooltipContent;
						
						// on hover show the incident details
						marker.addEventListener('pointerenter', function (event) {
						
							var tooltipContent = event.target.$tooltipContent;
							var point = event.target.getGeometry();

							var screenPosition = map.geoToScreen(point);
							screenPosition.x += 8;
							screenPosition.y += -10;

							infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: tooltipContent });
							ui.addBubble(infoBubble);
						});
						
						marker.addEventListener('pointerleave', function(event){clearBubbles();})
						
						map.addObject(marker);
					}
				}
			}
		},
		onError = function(error)
		{
			console.log(error);
		};
		
		incidentService.requestIncidents(incidentParams, onResult, onError);
	}
	
	var clearBubbles = function() {
		ui.getBubbles().forEach(function (bubble) {
			ui.removeBubble(bubble);
		});
	}

	var displayReady = function(e)
	{
		map.removeEventListener("mapviewchangeend", displayReady);
		calculateRoute();
	};

	map.addEventListener("mapviewchangeend", displayReady);
	
	/**
	 * Color based on JamFactor
	 **/
	getColorForJF = function(jamFactor)
	{
		if(jamFactor < 4.0)
			return 'rgb(138,198,144)';
		else if(jamFactor < 6.5)
			return 'rgb(254,212,3)';
		else if(jamFactor < 8.0)
			return 'rgb(254,153,37)';
		else if(jamFactor < 10.0)
			return 'rgb(227,15,56)';
		else if (jamFactor == 10.0 || jamFactor > 10.0)
			return 'rgba(0,0,0)';
	}