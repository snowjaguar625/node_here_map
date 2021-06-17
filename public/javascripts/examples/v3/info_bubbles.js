 /*
	author domschuette
	(C) HERE 2014
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);


	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(50.26977024883014, 10.370596923828117),
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

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	htmlStr = '<iframe title="YouTube video player" class="youtube-player" type="text/html" ' +
		'width="640" height="390" src="https://www.youtube.com/embed/h5CYeESsTko" ' +
		'frameborder="0" allowFullScreen><\/iframe>';

	var infoBubble = new H.ui.InfoBubble(new H.geo.Point(50.1, 8.6), { content: htmlStr });
	ui.addBubble(infoBubble);