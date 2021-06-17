/*
	author domschuette
	(C) HERE 2016
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
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(52, 1),
		zoom: 5,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var dataPoints = [
		new H.clustering.DataPoint(52, 1),
		new H.clustering.DataPoint(52.1, 1),
		new H.clustering.DataPoint(52.2, 1),
	];
	
	for(var i = 0; i < coordinates.length; i++)
	{
		dataPoints.push(new H.clustering.DataPoint(coordinates[i].lat, coordinates[i].lng));
	}
	
	var oms = new OverlappingMarkerSpiderfier(map, { markersWontMove: true, markersWontHide: true });

	var noiseSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" height="50px" width="50px">' +
	'<circle cx="20px" cy="20px" r="20" fill="#3FC8BB" fill-opacity="0.5"/>' +
	'<text x="20" y="35" font-size="30pt" font-family="arial" font-weight="bold" text-anchor="middle" fill="white" textContent="!">!</text></svg>';

	var noiseIcon = new H.map.Icon(noiseSvg, {
		size: { w: 22, h: 22 },
		anchor: { x: 11, y: 11 }
	});

	var clusterSvgTemplate =
	'<svg xmlns="http://www.w3.org/2000/svg" height="50px" width="50px"><circle cx="25px" cy="25px" r="20" fill="#3FC8BB" fill-opacity="0.5" stroke-opacity="0.5" />' +
	'<text x="24" y="32" font-size="14pt" font-family="arial" font-weight="bold" text-anchor="middle" fill="white">{text}</text>' +
	'</svg>';

	var clusteringProvider = new mapsjs.clustering.Provider(dataPoints, {
		min: 1,
		max: 15,
		clusteringOptions: {
			minWeight: 1,
			eps: 32
		},
		theme: {
			getClusterPresentation: function (markerCluster) {

				// Use cluster weight to change icon size:
				var svgString = clusterSvgTemplate.replace('{radius}', markerCluster.getWeight() * 5);
				svgString = svgString.replace('{text}', + markerCluster.getWeight());

				var w, h;
				var weight = markerCluster.getWeight();

				//Set cluster size depending on the weight
				if (weight <= 6)
				{
					w = 35;
					h = 35;
				}
				else if (weight <= 12) {
					w = 50;
					h = 50;
				}
				else {
					w = 75;
					h = 75;
				}

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
				
				clusterMarker.addEventListener("tap", function (event) {

					var point = event.target.getPosition(),
						screenPosition = map.geoToScreen(point),
						t = event.target,
						data = t.getData();
					oms.clearMarkers();
					data.forEachDataPoint(
						function(p) 
						{
							var tooltipContent = ["Latitude: ", p.getPosition().lat, ", Longitude: ", p.getPosition().lng].join("");
							var m = new H.map.Marker({lat:data.getPosition().lat, lng:data.getPosition().lng});
							m.addEventListener("tap", function (event) {
								var point = event.target.getPosition();
								var tooltipContent = ["Latitude: ", point.lat, ", Longitude: ", point.lng].join("");
								var screenPosition = map.geoToScreen(point);

								infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: tooltipContent });
								ui.addBubble(infoBubble);
							});
							oms.addMarker(m);
						}
					);
					// needs to be called
					oms.spiderManual();
				});

				return clusterMarker;
			},
			getNoisePresentation: function (noisePoint) {

				// Create a marker for noise points:
				var noiseMarker = new H.map.Marker(noisePoint.getPosition(), {
					icon: noiseIcon,

					// Use min zoom from a noise point to show it correctly at certain
					// zoom levels:
					min: noisePoint.getMinZoom(),
					max: 20
				});

				// Bind cluster data to the marker:
				noiseMarker.setData(noisePoint);

				noiseMarker.addEventListener("tap", function (event) {

					var point = event.target.getPosition();
					var tooltipContent = ["Latitude: ", point.lat, ", Longitude: ", point.lng].join("");

					var screenPosition = map.geoToScreen(point);

					infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: tooltipContent });
					ui.addBubble(infoBubble);
				});

				return noiseMarker;
			}
		}

	});

	var objectLayer = new mapsjs.map.layer.ObjectLayer(clusteringProvider);
	map.addLayer(objectLayer);