/*
	author domschuette
    (C) HERE 2014
    author asadovoy
	(C) HERE 2019 -> migrate to 3.1
    
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	platform = new H.service.Platform({
		apikey: api_key,
        useHTTPS: secure
	}),
	configObj = {};

	configObj.style = "wings";

	var maptileService = platform.getMapTileService({'type': 'base'}),
	tileLayer = maptileService.createTileLayer("maptile", "reduced.day", 256, "png8", configObj),

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(document.getElementById('mapContainer'), tileLayer, {
		center: center,
		zoom: 3,
		pixelRatio: window.devicePixelRatio || 1
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
	var ui = new H.ui.UI(map,
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