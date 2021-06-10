/*
	author domschuette
	(C) HERE 2019
	*/


	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

    //maptypes.vector.normal.map = platform.getOMVService().createLayer(maptypes.vector.normal.map.getProvider().getStyle(), {tileSize: 512});
    var baseLayer = maptypes.vector.normal.map;
	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

    // add the Overview UI
    ui.addControl('Overview', new H.ui.Overview(baseLayer));

	ui.addControl('Distance', new H.ui.DistanceMeasurement());

	ui.addControl('ZoomControl', new H.ui.ZoomControl());

	window.addEventListener('resize', function() { map.getViewPort().resize(); });