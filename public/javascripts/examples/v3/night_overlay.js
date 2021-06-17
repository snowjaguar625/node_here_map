/*
	author domschuette
	(C) HERE 2014
	*/
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
	configObj = {};

	configObj.style = "wings";

	var maptileService = platform.getMapTileService({'type': 'base'}),
	tileLayer = maptileService.createTileLayer("maptile", "reduced.day", 256, "png8", configObj),

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(document.getElementById('mapContainer'), tileLayer, {
		center: center,
		zoom: 3,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// Enable specified ui
	var ui = new mapsjs.ui.UI(map,
	({
		'unitSystem': H.ui.UnitSystem['METRIC'],
		'zoom': {
			'alignment': 'right-middle'
		},
		'scalebar': {
			'alignment': 'bottom-right'
		},
		'locale':  'de-DE'
	})
	);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	NightOverlay.init(map);