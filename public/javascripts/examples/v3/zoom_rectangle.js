/*
	author domschuette
	(C) HERE 2014
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
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	ui.addControl('zoomRectangle', new H.ui.ZoomToRectangle());

	window.addEventListener('resize', function() { map.getViewPort().resize(); });