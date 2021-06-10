/**
		* author domschuette
		* (C) HERE 2016
            author Mykyta
            (C) HERE 2019 -> migrate to 3.1
		*/
		
		
		var heatmapLayer,
			DATA_POINTS = [];

		// check if the site was loaded via secure connection
		var secure = (location.protocol === 'https:') ? true : false;   
		
		// Create a platform object to communicate with the HERE REST APIs.
		var platform = new H.service.Platform({
			apikey: api_key,
			useHTTPS: secure
		});

		var maptypes = platform.createDefaultLayers();

		// Instantiate a map in the 'map' div, set the base map to normal.
		var map = new H.Map(mapContainer, maptypes.vector.normal.map, {
			center: new H.geo.Point(50.06789540798869, 8.3770953636635),
			zoom: 14,
			pixelRatio: window.devicePixelRatio || 1
		});

		// Enable the map event system
		var mapevents = new H.mapevents.MapEvents(map);

		// Enable map interaction (pan, zoom, pinch-to-zoom)
		var behavior = new H.mapevents.Behavior(mapevents);

		// Enable the default UI.
		var ui = H.ui.UI.createDefault(map, maptypes);


		// Listen to the window resize event to resize the map accordingly. 
		window.addEventListener("resize", function() {
			map.getViewPort().resize();
		});
		
		var layers = new Object();
			layers["POI_BIG"] = {callback: poiCallback, isFCLayer: false, level: 9};
			layers["POI_BIGGER"] = {callback: poiCallback, isFCLayer: false, level: 6};
			layers["POI_SMALL"] = {callback: poiCallback, isFCLayer: false, level: 11};
			layers["POI_SMALLER"] = {callback: poiCallback, isFCLayer: false, level: 12};
			layers["PUBLIC_TRANSPORT_POI"] = {callback: poiCallback, isFCLayer: false, level: 13};
			
		var pdeManager = new PDEManager(app_id, app_code, layers);
		
		var markers = new H.map.Group();
		map.addObject(markers);
		
		var pois = new Object();
		
		var currentOpenBubble = null;
		
		
		// react on mapchanges
		map.addEventListener('mapviewchangeend', loadPois);
		
		// react on heat map changes (density / value)
		var type = document.getElementById("type");
		type.onchange = function(evt) 
		{ 
			type.checked ? showLayer('value') : showLayer('density');
		};

		function createHeatMap(map, type, dataPoints) {
			var heatmapProvider = new H.data.heatmap.Provider({
				type: type,
				colors: new H.data.heatmap.Colors({
					0: 'darkBlue',
					0.1: 'blue',
					0.2: 'darkGreen',
					0.3: 'green',
					0.4: '#d5b60a',
					0.5: 'yellow',
					0.7: '#DEB887',
					0.8: '#EEC591',
					0.9: '#CDAA7D',
					0.93: '#8B7355',
					0.95: 'red',
					0.97: 'darkRed'
					},
					true),
				coarseness: 0,
				dataMax: 255,
				min: 13
			});

			heatmapProvider.addData(dataPoints);

			var heatmapLayer = new H.map.layer.TileLayer(heatmapProvider, {
				opacity: 0.5
			});

			map.addLayer(heatmapLayer);

			return heatmapLayer;
		}
		
		var ICON = new H.map.Icon(
			'<svg xmlns="http://www.w3.org/2000/svg" height="10" width="10">' +
			'<circle cx="5" cy="5" r="4" fill="rgba(0,0,0,0.3)" stroke="white"/></svg>',
			{
				anchor: {
					x: 5, y: 5
				}
		});

		function loadPois()
		{
			markers.removeAll();
			pois = new Object();
			DATA_POINTS = [];
			
			pdeManager.setLayers(layers);
			pdeManager.setMeta(true);
			
			console.log("getLookAtData:: ", map.getViewModel().getLookAtData().bounds.getBoundingBox());
			pdeManager.setBoundingBox(map.getViewModel().getLookAtData().bounds.getBoundingBox());
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);

			pdeManager.start();
		}
		
		function poiCallback(resp)
		{
			if (resp.error != undefined)
			{
				feedbackTxt.innerHTML = resp.error;
				return;
			}
			if (resp.responseCode != undefined)
			{
				alert (resp.message);
				feedbackTxt.innerHTML = resp.message;
				return;
			}
			
			for (r = 0; r < resp.Rows.length; r++)
			{
				if(resp.Rows[r].CAT_ID == "5800" || resp.Rows[r].CAT_ID == "7011")
				{
					var poiId = parseInt(resp.Rows[r].POI_ID);
					pois[poiId] = resp.Rows[r];
				}
			}
		}
		
		function pdeManagerFinished()
		{
			for (var i = 0, keys = Object.keys(pois), ii = keys.length; i < ii; i++) 
			{
				
				DATA_POINTS.push (
					{
						lat: parseFloat(pois[keys[i]].LAT) / 100000,
						lng: parseFloat(pois[keys[i]].LON) / 100000,
						name: pois[keys[i]].NAME,
						cat: pois[keys[i]].CAT_ID
					});
			
			}

			DATA_POINTS.forEach(function(place) {
				var marker = new H.map.Marker(place, {
					icon: ICON
				});
				markers.addObject(marker);
			});
			
			showLayer('value');
		}

		function showLayer(type) {
			// Remove old layer if it exists
			if (heatmapLayer) {
				map.removeLayer(heatmapLayer);
			}

			// Create new layer
			heatmapLayer = createHeatMap(map, type, DATA_POINTS);
		}