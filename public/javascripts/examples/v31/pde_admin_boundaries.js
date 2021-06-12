/* 
		(C) HERE 2019
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	maptypes = platform.createDefaultLayers(),
	adminLevel,
	layer,
	provider,
	totalPdeTilesLoaded = 0;
	
	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.raster.satellite.xbase, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});
	
	map.getViewModel().setLookAtData({
				tilt: 45,
	})

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	// create info bubble that is used to display SOURCE_TYPE
	bubble = new H.ui.InfoBubble(map.getCenter(), {
	  content: ''
	});
	bubble.close();
	ui.addBubble(bubble);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
	{ 
		var d = document.getElementById("centerCoordinate"),
			c = map.getCenter(),
			lon = Math.round(c.lng * 100000.0) /100000.0;
			lat = Math.round(c.lat * 100000.0) /100000.0;
			d.innerHTML = "Map center: " + lat + " / " + lon;
	});
	
	var service = platform.getPlatformDataService();
	style = new H.map.SpatialStyle({lineWidth:4, strokeColor:'#F2D933'});
	
	
	// create tile provider and layer that displays admin boundaries	
	var boundariesProvider0 = new H.service.extension.platformData.TileProvider(service,
	{
	  layer: 'ADMIN_POLY_0', level: 7
	}, {
	  resultType: H.service.extension.platformData.TileProvider.ResultType.POLYLINE,
	  styleCallback: function(data) {return style}
	});
	// create a layer from the Advanced Data Sets data as provider
	var boundaries0 = new H.map.layer.TileLayer(boundariesProvider0,{min:5});
	

	// create tile provider and layer that displays admin boundaries	
	var boundariesProvider1 = new H.service.extension.platformData.TileProvider(service,
	{
	  layer: 'ADMIN_POLY_1', level: 8
	}, {
	  resultType: H.service.extension.platformData.TileProvider.ResultType.POLYLINE,
	  styleCallback: function(data) {return style}
	});
	// create a layer from the Advanced Data Sets data as provider
	var boundaries1 = new H.map.layer.TileLayer(boundariesProvider1,{min:5});
	
	// create tile provider and layer that displays admin boundaries	
	var boundariesProvider2 = new H.service.extension.platformData.TileProvider(service,
	{
	  layer: 'ADMIN_POLY_2', level: 9
	}, {
	  resultType: H.service.extension.platformData.TileProvider.ResultType.POLYLINE,
	  styleCallback: function(data) {return style}
	});
	// create a layer from the Advanced Data Sets data as provider
	var boundaries2 = new H.map.layer.TileLayer(boundariesProvider2,{min:8});
	
	// create tile provider and layer that displays admin boundaries	
	var boundariesProvider8 = new H.service.extension.platformData.TileProvider(service,
	{
	  layer: 'ADMIN_POLY_8', level: 10
	}, {
	  resultType: H.service.extension.platformData.TileProvider.ResultType.POLYLINE,
	  styleCallback: function(data) {return style}
	});
	// create a layer from the Advanced Data Sets data as provider
	var boundaries8 = new H.map.layer.TileLayer(boundariesProvider8,{min:8});
	
	// create tile provider and layer that displays admin boundaries	
	var boundariesProvider9 = new H.service.extension.platformData.TileProvider(service,
	{
	  layer: 'ADMIN_POLY_9', level: 11
	}, {
	  resultType: H.service.extension.platformData.TileProvider.ResultType.POLYLINE,
	  styleCallback: function(data) {return style}
	});
	// create a layer from the Advanced Data Sets data as provider
	var boundaries9 = new H.map.layer.TileLayer(boundariesProvider9,{min:8});
	
	// add the layer based on the admin level choosen
	var getPdeLayer = function(adminLevel){
		switch(adminLevel) { 
			case "0": return  boundaries0;
			case "1": return  boundaries1;
			case "2": return  boundaries2;
			case "8": return boundaries8;
			case "9": return boundaries9;
		}
	}
	
	var sourceTypeLegendTxt = 'On Tap Polygon\'s type shown is based on <a target="_blank" href="https://pde.api.here.com/1/doc/layer.html?layer=ADMIN_POLY_0&app_id=' + app_id + '&app_code=' + app_code +'" style="color:#00ACDC"> source type </a>';
	document.getElementById("sourceTypeLegend").innerHTML = sourceTypeLegendTxt;
	
	// Tap listner on polylines rendered to show the Source type
	map.addEventListener("tap",function(evt){
		if(evt.target && (evt.target instanceof H.map.Object)){
			var point = map.screenToGeo(evt.currentPointer.viewportX,evt.currentPointer.viewportY);
			var sourceType=evt.target.getData().getCell("SOURCE_TYPE");
			bubble.setPosition(point);
			var str = 'Source Type: ' + sourceType ;
			bubble.setContent(str);
			bubble.open();
		}
	});

	// function triggered when Admin level is selected
	var adminLevelChanged = function (obj)
	{
		adminLevel = obj.value;
		if (layer != undefined)
			map.removeLayer(layer);
		layer = getPdeLayer(adminLevel);
		map.addLayer(layer);
	}
	
	// Load admin layer of the default admin level 0
	var radioButtons = document.getElementsByName("adminLevelRadioButtons");
	for (var i = 0; i < radioButtons.length; i++) {
		if (radioButtons[i].checked)
			adminLevelChanged(radioButtons[i]);
	}