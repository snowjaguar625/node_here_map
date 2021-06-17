/*
	author domschuette
	(C) HERE 2017
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
	
    var infoBubble,
		incidentsMap = {},
		clusteredDataProvider, 
		noiseSvg, 
		noiseIcon, 
		clusterSvgTemplate,
        clusterDataPoints = [];

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	incidentGeneric = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="31" baseProfile="tiny" viewBox="0 0 26 31"><path fill="#868686" d="M16.995 28.98c0 1.115-1.79 2.02-4 2.02s-4-.905-4-2.02c0-1.118 1.79-2.026 4-2.026s4 .907 4 2.025"/><path fill="{color}" d="M1.702 17.693C.13 16.127.118 13.837 1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.693l-11.29 11.286L1.702 17.693z"/><path fill="#fff" d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213m0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.712.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0zM13.035 16.534c-.754 0-1.365.595-1.365 1.32 0 .73.613 1.326 1.365 1.326s1.363-.595 1.363-1.326c0-.725-.61-1.32-1.363-1.32zm0-1.332c.568 0 1.057-.448 1.088-.993l.365-5.916c.033-.548-.615-.996-1.455-.996-.832 0-1.49.448-1.453.996l.36 5.915c.034.544.526.992 1.095.992z"/></svg>';
	incidentCongestion = '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 18,15 0,0 c 0,-0.1 0,-0.2 0,-0.4 l 0,-0.2 c 0,-0.1 0,-0.2 0,-0.4 0,0 0,0 0,0 0.6,0 1.1,-0.4 1.1,-1 0,-0.5 -0.5,-1 -1,-1 -0.7,0 -1.1,0.5 -1.1,1 -0.1,0 -0.3,-0.1 -0.4,-0.1 l -0.6,0 -0.3,-0.5 C 15.2,11.6 14.3,11 13.3,11 L 18,11 17.2,9.6 C 17,9.3 16.7,9 16.3,9 L 12.8,9 C 12.4,9 12,9.3 11.8,9.6 L 11.1,11 9.8,11 C 9.7,11 9.6,11 9.5,11 9.2,11 9,10.9 9,10.6 L 9,10.4 C 9,10.2 9.2,9.9 9.5,9.9 l 1.2,0 0.6,-1.04 c 0.3,-0.5 0.9,-0.9 1.5,-0.9 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1.04 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 18.3,16 18,15.8 18,15.6 L 18,15 z M 8,18.1 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.6,0 -1.1,0.5 -1.1,1 0,0.6 0.5,1.1 1.1,1.1 m 7,0 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.5,0 -1,0.5 -1,1 0,0.6 0.5,1.1 1,1.1 M 14.2,13.6 C 14,13.3 13.7,13 13.3,13 L 9.8,13 C 9.4,13 9,13.3 8.8,13.6 L 8.1,15 15,15 14.2,13.6 z m -8.2,1 0,-0.2 c 0,-0.2 0.2,-0.5 0.5,-0.5 l 1.1,0 0.7,-1 C 8.6,12.4 9.2,12 9.8,12 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 15.3,20 15,19.8 15,19.6 L 15,19 8,19 8,19.6 C 8,19.8 7.8,20 7.5,20 l -1,0 C 6.2,20 6,19.8 6,19.6 l 0,-3.4 c 0,-0.4 0.2,-0.8 0.6,-1.1 l -0.1,0 C 6.2,15.1 6,14.9 6,14.6" fill="#ffffff" /></svg>';
	incidentClosed = '<svg width="26" height="31" viewBox="0 0 26 31" xmlns="http://www.w3.org/2000/svg"><g fill="none"><g><path d="M16.995 28.98c0 1.116-1.79 2.02-4 2.02s-4-.904-4-2.02c0-1.118 1.79-2.023 4-2.023 2.21-.004 4 .904 4 2.022" fill="#868686"/><path d="M1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.692l-11.29 11.286L1.702 17.693C.13 16.127.118 13.837 1.675 11.995z" id="Shape" fill="{color}"/><path d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213zm0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.713.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0z" id="Shape" fill="#fff"/><path fill="#fff" d="M9 15h1.5v3.8H9zM16 15h1.5v3.8H16z"/><path d="M20.01 13.965c0 .276-.225.5-.5.5h-13c-.275 0-.5-.224-.5-.5v-2.637c0-.276.225-.5.5-.5h13c.275 0 .5.224.5.5v2.637z" id="Shape" fill="#fff"/><path d="M9.565 11.33l-2.638 2.634h3.107l2.635-2.635H9.564zM16.004 11.33l-2.634 2.634h3.105l2.634-2.635h-3.106z" fill="#D5232F"/></g></g></svg>';
	incidentConstruction = '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 9.24,13.2 -3.7,6.8 1.3,0 2.8,-5.1 1.36,1.5 0,3.6 1.1,0 0,-4 -1.4,-1.6 -1.46,-1.2 z M 14.2,9.5 c 0.7,0 1.3,-0.5 1.3,-1.21 0,-0.7 -0.6,-1.2 -1.3,-1.2 -0.7,0 -1.2,0.5 -1.2,1.2 0,0.71 0.5,1.21 1.2,1.21 m -4.46,0.5 1.06,0 -0.96,2.1 -1,-0.8 0.9,-1.3 z m 2.56,4 -1,-0.7 1,-1.9 0,2.6 z m 6.9,1.7 c -0.4,-0.5 -1.5,-1.1 -2.3,0 -0.2,0.3 -0.6,0.7 -0.9,1.2 l -2.7,-2.1 0,-5 -0.8,-0.7 -3.26,0 -1.5,2.3 7.86,6 C 14.7,18.6 13.8,20 13.8,20 l 6,0 1.5,-1.6 c 0,0 -1.7,-2.2 -2.1,-2.7" fill="#ffffff" /></svg>';

	// Create an SVG template for the cluster icon:
	clusterSvgTemplate = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="44" viewBox="0 0 40 44"><g opacity=".25"><path fill="#4B4B4C" d="M20.498 42.5C12.778 42.5 6.5 39.584 6.5 36s6.28-6.5 13.998-6.5c7.72 0 14.002 2.916 14.002 6.5s-6.28 6.5-14.002 6.5z"/><path d="M20.498 30C28.574 30 34 33.104 34 36s-5.426 6-13.502 6C12.424 42 7 38.896 7 36s5.424-6 13.498-6m0-1C12.492 29 6 32.113 6 36s6.492 7 14.498 7C28.508 43 35 39.887 35 36s-6.49-7-14.502-7z"/></g><path opacity=".25" fill="#353535" d="M26 36c0 1.666-2.688 3-6 3s-6-1.334-6-3 2.688-3 6-3 6 1.334 6 3z"/><path fill="#fff" d="M11.802 4.615C10.35 4.615 9 5.255 8 6.42l-5.52 8.05c-2 2.363-1.97 5.32.072 7.355L20 36v-4l9.426-10.176c2.076-2.1 2.1-4.988.064-7.365L15.598 6.433c-.894-1.13-2.32-1.82-3.796-1.82z"/><path fill="#96969B" d="M11.632 5.615c1.12 0 2.202.514 2.902 1.4l13.9 8.036C30.02 16.9 21.723 27.255 20 29v6L3.205 20.842c-1.607-1.598-1.605-3.895 0-5.79l5.508-8.036c.834-.97 1.893-1.4 2.92-1.4"/><path fill="#fff" d="M28.198 4.615c-1.476 0-2.902.69-3.796 1.818L10.51 14.46c-2.035 2.376-2.012 5.265.064 7.364L20 32v4l17.447-14.175c2.043-2.034 2.072-4.992.072-7.354L32 6.42c-1-1.164-2.35-1.805-3.802-1.805z"/><path fill="#96969B" d="M28.368 5.615c1.024 0 2.085.43 2.92 1.4l5.507 8.037c1.605 1.895 1.607 4.19 0 5.79L20 35v-6c-1.725-1.746-10.02-12.1-8.434-13.948l13.9-8.037c.7-.886 1.782-1.4 2.902-1.4"/><path fill="#fff" d="M19.998 1c-1.453 0-2.803.64-3.803 1.803L6.48 14.47c-2 2.363-1.97 5.32.072 7.355L19 35l1 1 1-1 12.426-13.176c2.076-2.1 2.1-4.988.064-7.365L23.793 2.817C22.9 1.688 21.473 1 19.998 1z"/><path fill="#646469" d="M19.998 2.162c1.12 0 2.2.514 2.902 1.398l9.703 11.653c1.588 1.85 1.725 4.044 0 5.79L20 34.5 7.375 21.004c-1.607-1.598-1.605-3.895 0-5.79l9.703-11.65c.834-.972 1.895-1.402 2.92-1.402"/><path fill="none" d="M18.333 12.667H45.75v10.736H18.333z"/><text transform="translate(20 23)" fill="#fff" font-family="sans-serif" font-size="14" color="#fff" font-weight="bold" text-anchor="middle">{text}</text></svg>';

	// Create a clustered data provider and a theme implementation:
	clusteredDataProvider = new H.clustering.Provider(clusterDataPoints, {
		min: 6,
		max: 21,
		clusteringOptions: {
			minWeight: 3,
			eps: 36
		},
		theme: {
			getClusterPresentation: function (markerCluster) {

				var svgString = clusterSvgTemplate.replace('{text}', markerCluster.getWeight());

				var w = 40, h = 44;

				var clusterIcon = new H.map.Icon(svgString, {
					size: { w: w, h: h },
					anchor: { x: (w/2), y: (h/2) }
				});

				// Create a marker for clusters:
				var clusterMarker = new H.map.Marker(markerCluster.getPosition(), {
					icon: clusterIcon,
					// Set min/max zoom with values from the cluster, otherwise
					// clusters will be shown at all zoom levels:
					min: markerCluster.getMinZoom(),
					max: markerCluster.getMaxZoom()
				});

				// Bind cluster data to the marker:
				clusterMarker.setData(markerCluster);

				return clusterMarker;
			},
			getNoisePresentation: function (noisePoint) {
				
				var svgString; 
				var w = 26, h = 31;
				
				var criticality = noisePoint.getData().criticality;
				var description = noisePoint.getData().description;
				var color = "";
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
				else if(description == "MISCELLANEOUS" && noisePoint.getData().closed == true)
				{
					svgString = incidentClosed;
				}
				else
				{
					svgString = incidentGeneric;
				}
				svgString = svgString.replace('{color}', color);
				
				var noiseIcon = new H.map.Icon(svgString, {
					size: { w: w, h: h },
					anchor: { x: (w/2), y: (h/2) }
				});

				// Create a marker for noise points:
				var noiseMarker = new H.map.Marker(noisePoint.getPosition(), {
					icon: noiseIcon,

					// Use min zoom from a noise point to show it correctly at certain
					// zoom levels:
					min: noisePoint.getMinZoom()
				});

				// Bind cluster data to the marker:
				noiseMarker.setData(noisePoint);

				noiseMarker.addEventListener('pointerenter', function (event) {

					var id = event.target.getData().getData().id;
					var tooltipContent = event.target.getData().getData().tooltipContent;
					var point = event.target.getPosition();

					var screenPosition = map.geoToScreen(point);
					screenPosition.x += 8;
					screenPosition.y += -10;

					infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: tooltipContent });
					ui.addBubble(infoBubble);

					document.getElementById('box_' + id).style.background = '#FFDBDB';                            
				});

				noiseMarker.addEventListener('pointerleave', function (event) {

					var id = event.target.getData().getData().id;

					if (document.getElementById('box_' + id) != null) {
						document.getElementById('box_' + id).style.background = '#FFF';
					}

					clearBubbles();
				});

				return noiseMarker;
			}
		}
	});


	var layer = new H.map.layer.ObjectLayer(clusteredDataProvider);
	map.addLayer(layer);

	// set the traffic flow layer
	map.setBaseLayer(defaultLayers.normal.traffic);

	map.addEventListener('mapviewchangeend', function (evt)
	{
		clearBubbles();

		clusterDataPoints = [];
		clusteredDataProvider.setDataPoints(clusterDataPoints);

		var listIncidents = document.getElementById('listIncidents');
		listIncidents.innerHTML = "";

		//We correct the boundingbox to add the left bar div 300 px (map is 100% width)
		var bbox = map.getViewBounds();
		var topLeftPixels = map.geoToScreen(bbox.getTopLeft());
		topLeftPixels.x += 315;
		var left = map.screenToGeo(topLeftPixels.x, topLeftPixels.y).lng;
		getTrafficIncidents(new H.geo.Rect(bbox.getTop(), left, bbox.getBottom(), bbox.getRight()));
	});

	function showInfoBubble(id) {

		clusterDataPoints.forEach(function (dataPoint) {

			if (dataPoint.data.id == id) {

				var point;
				if (dataPoint.data.clusterPosition != null) {
					point = dataPoint.data.clusterPosition;
				}
				else {
					point = new H.geo.Point(dataPoint.lat, dataPoint.lng);
				}

				//Fix the position so the info bubble doesn't overlap the marker
				var screenPosition = map.geoToScreen(point);
				screenPosition.x += 8;
				screenPosition.y += -10;

				infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: dataPoint.data.tooltipContent });
				ui.addBubble(infoBubble);

				return;
			}
		});
	}

	function clearBubbles() {

		ui.getBubbles().forEach(function (bubble) {
			ui.removeBubble(bubble);
		});
	}

	function goToDataPoint(id) {

		clusterDataPoints.forEach(function (dataPoint) {

			if (dataPoint.data.id == id) {

				var point = new H.geo.Point(dataPoint.lat, dataPoint.lng);

				map.setCenter(point, true);
				map.setZoom(16, true);
				return;
			}
		});
	}

	var getTrafficIncidents = function (bbox) {
		
		//API traffic doesn't provide information for a bounding box got from a zoom level lower than 6
		if (map.getZoom() >= 7) {
			
			if (map.getZoom() >= 6 && map.getZoom() < 8) {

				var listIncidents = document.getElementById('listIncidents');
				var element = document.createElement("li");
				element.innerHTML = "<div style='text-align: center; color: #000;'><strong>Too much incidents to show, please zoom in</strong></div>";
				listIncidents.appendChild(element);
			}

			//USe JSONP technique to avoid same-origin security browser policy
			var url =
				   ["https://traffic.api.here.com/traffic/6.1/incidents.json?",
					"app_id=", app_id,
					"&app_code=", app_code,
					"&bbox=",
					bbox.getBottom(), ",",
					bbox.getRight(), ";",
					bbox.getTop(), ",",
					bbox.getLeft(),
					"&jsoncallback=incidentCallback"
				   ].join("");

			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
		}
		else {
			var listIncidents = document.getElementById('listIncidents');
			var element = document.createElement("li");
			element.innerHTML = "<div style='text-align: center; color: #FF0000;'><strong>Zoom level too low, please zoom in</strong></div>";
			listIncidents.appendChild(element);
		}
	}

	var incidentCallback = function (response) {

		if (response && response.TRAFFIC_ITEMS && response.TRAFFIC_ITEMS.TRAFFIC_ITEM) {

			items = response.TRAFFIC_ITEMS.TRAFFIC_ITEM;
			i = items.length;

			var listIncidents = document.getElementById('listIncidents');
			while (i--) {

				if (items[i].LOCATION && items[i].LOCATION.GEOLOC && items[i].LOCATION.GEOLOC.ORIGIN) {

					tooltipContent = "";

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

						tooltipContent += "<strong>Length</strong>: " + length + " " + unit + ".<br /><hr />";

						if (items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"])
						{
							if(items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"].DESCRIPTION)
								tooltipContent += "<strong>Description</strong>: " + items[i]["RDS-TMC_LOCATIONS"]["RDS-TMC"][0]["ALERTC"].DESCRIPTION;
						}
					}

					var closed = false;
					if(items[i].TRAFFIC_ITEM_DETAIL && items[i].TRAFFIC_ITEM_DETAIL.ROAD_CLOSED)
						closed = true;
					
					clusterDataPoints.push(new H.clustering.DataPoint(
						items[i].LOCATION.GEOLOC.ORIGIN.LATITUDE, items[i].LOCATION.GEOLOC.ORIGIN.LONGITUDE, 1,
						{
							'id': items[i].TRAFFIC_ITEM_ID,
							'tooltipContent': tooltipContent,
							'criticality' : items[i].CRITICALITY.DESCRIPTION,
							'description' : items[i].TRAFFIC_ITEM_TYPE_DESC,
							'closed' : closed
						}
					 ));

					if (map.getZoom() >= 8) {

						var element = document.createElement("li");
						element.setAttribute("id", "box_" + items[i].TRAFFIC_ITEM_ID);
						element.setAttribute("onmouseover", "this.style.background='#FFDBDB'; clearBubbles(); showInfoBubble(" + items[i].TRAFFIC_ITEM_ID + ");");
						element.setAttribute("onmouseout", "this.style.background='#FFF'; clearBubbles();");
						element.setAttribute("onclick", "goToDataPoint(" + items[i].TRAFFIC_ITEM_ID + ");");

						while (tooltipContent.indexOf("<hr />") > -1) {
							tooltipContent = tooltipContent.replace("<hr />", "");
						}
						tooltipContent = tooltipContent.substr(0, 250);
						tooltipContent += "...";

						element.innerHTML = tooltipContent;
						listIncidents.appendChild(element);
					}
				}
			}

			clusteredDataProvider.setDataPoints(clusterDataPoints);
		}
		else {
			var listIncidents = document.getElementById('listIncidents');
			var element = document.createElement("li");
			element.innerHTML = "<div style='text-align: center; color: #009933;'><strong>No incidents found in this area</strong></div>";
			listIncidents.appendChild(element);
		}
	}