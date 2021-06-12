/*
		author domschuette
		(C) HERE 2018
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
	minimapLayers = platform.createDefaultLayers();
	minimapClassicLayers = platform.createDefaultLayers();
	console.log(maptypes);


	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: center,
		zoom: zoom,
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


	// remove map settings control
	ui.removeControl("mapsettings");
	ui.getControl("zoom").setAlignment('top-right');
	
	// add the Magnifier UI
	ui.addControl('Magnifier', new H.ui.Magnifier());

	window.addEventListener('resize', function() { map.getViewPort().resize(); });