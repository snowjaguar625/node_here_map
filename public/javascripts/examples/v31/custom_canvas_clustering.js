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
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: new H.geo.Point(52, 1),
		zoom: 5,
		pixelRatio: hidpi ? 2 : 1
	}),
		pixelRatio = hidpi ? 2 : 1,
		baseFontSize = 11;

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes),
		clusterIcons = {},
		clusterBackgrounds = {};

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();


	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var dataPoints = [
		new H.clustering.DataPoint(52, 1),
		new H.clustering.DataPoint(52.1, 1),
		new H.clustering.DataPoint(52.2, 1),
	];
	
	for(var i = 0; i < coordinates.length; i++)
	{
		dataPoints.push(new H.clustering.DataPoint(coordinates[i].lat, coordinates[i].lng, null, i));
	}
	
	var imageObj = new Image();
	imageObj.src = '/images/truck_green.png';
	
	var clusteringProvider = new H.clustering.Provider(dataPoints, {
		min: 1,
		max: 15,
		clusteringOptions: {
			minWeight: 1,
			eps: 32
		},
		theme: {
			getClusterPresentation: function (cluster) {

				var weight = cluster.getWeight(),
					clusterVisual,
					clusterImage,
					textCoord,
					size,
					ctx,
					icon,
					marker,
					fontSize,
					tx,
					ty;

				icon = clusterIcons[weight];
				if (!icon) 
				{
					clusterVisual = getClusterVisual(weight);
					clusterImage = clusterVisual.bg;
					textCoord = clusterVisual.textCoord;
					size = clusterImage.width;
					ctx = clusterImage.getContext('2d');
					ctx.fillStyle = '#FFFFFF';

					fontSize = baseFontSize * pixelRatio;
					ctx.font = 'bold ' + fontSize + 'px Arial';

					tx = textCoord['x'] * pixelRatio;
					ty = textCoord['y'] * pixelRatio;

					ctx.fillText(weight, tx, ty);
					icon = new H.map.Icon(clusterImage,
					({
						'anchor': {
							'x': size / 2,
							'y': size / 2
						}
					}));
					// store icon for reuse
					clusterIcons[weight] = icon;
				}

				marker = new H.map.Marker(cluster.getPosition(), {
					'icon': icon,
					'min': cluster.getMinZoom(),
					'max': cluster.getMaxZoom()
				});
				marker.setData(cluster);
				return marker;
			},
			getNoisePresentation: function (noisePoint)
			{
				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d');
				
				var size = 28;
				size *= pixelRatio;
				canvas.height = size;
				canvas.width = size * 2;
				ctx.fillStyle = '#000000';
				
				ctx.drawImage(imageObj, 0, 0);
			
				fontSize = baseFontSize * pixelRatio;
				ctx.font = 'bold ' + fontSize + 'px Arial';
				ctx.fillText(noisePoint.getData(), 14, 14);
				
				icon = new H.map.Icon(canvas,
					({
						'anchor': {
							'x': size / 2,
							'y': size / 2
						}
					}));
			
				var noiseMarker = new H.map.Marker(noisePoint.getPosition(), {
					icon: icon,
					min: noisePoint.getMinZoom(),
					max: 20
				});
				noiseMarker.setData(noisePoint);

				noiseMarker.addEventListener("tap", function (event) {

					var point = event.target.getGeometry();
					var tooltipContent = ["Latitude: ", point.lat, ", Longitude: ", point.lng].join("");

					var screenPosition = map.geoToScreen(point);

					infoBubble = new H.ui.InfoBubble(map.screenToGeo(screenPosition.x, screenPosition.y), { content: tooltipContent });
					ui.addBubble(infoBubble);
				});

				return noiseMarker;
			}
		}
	});
	
	getClusterVisual = function(weight) 
	{
		var textCoord,
			bg;

		if (weight < 10) 
		{
			bg = createClusterBg(28, '118,209,0');
			textCoord = {
				'x': 11,
				'y': 18
			}
		} 
		else if (weight < 25) 
		{
			bg = createClusterBg(38, '255,105,0');
			textCoord = {
				'x': 13,
				'y': 23
			}
		} 
		else if (weight < 50) 
		{
			bg = createClusterBg(38, '240,60,0');
			textCoord = {
				'x': 13,
				'y': 23
			}
		} 
		else if (weight < 100) 
		{
			bg = createClusterBg(38, '181,0,21');
			textCoord = {
				'x': 13,
				'y': 23
			}
		} 
		else if (weight < 1000) 
		{
			bg = createClusterBg(48, '181,0,21');
			textCoord = {
				'x': 15,
				'y': 28
			}
		} 
		else 
		{
			bg = createClusterBg(66, '181,0,21');
			textCoord = {
				'x': 20,
				'y': 38
			}
		}
	
		return({
			bg: bg,
			textCoord: textCoord
		})
	}
	
	createClusterBg = function(size, rgbString) 
	{
		var bgKey,
			existingBg,
			canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d'),
			radius;

		size *= pixelRatio;
		bgKey = size + ':' + rgbString;

		canvas.width = canvas.height = size;

		existingBg = clusterBackgrounds[bgKey];

		if (existingBg) 
		{
			ctx.putImageData(existingBg, 0, 0);
		} 
		else 
		{
			radius = size / 2;
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(' + rgbString + ',0.2)';
			ctx.fillStyle = 'rgba(' + rgbString + ',1)';
			ctx.arc(radius, radius, 3 * (radius / 5), 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.lineWidth = 4 * (radius / 5);
			ctx.stroke();
			clusterBackgrounds[bgKey] = ctx.getImageData(0, 0, size, size);
		}
		return canvas;
	}

	var objectLayer = new H.map.layer.ObjectLayer(clusteringProvider);
	map.addLayer(objectLayer);