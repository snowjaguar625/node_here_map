$(function(){
    /*
	author Mykyta
	(C) HERE 2019
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	mapContainer = document.getElementById('mapContainer'),
	defaultLayers = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(mapContainer, defaultLayers.vector.normal.map, {
		center: center, 
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);
	ui.addControl('FullScreen', new H.ui.FullScreen());

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	htmlStr = '<iframe title="YouTube video player" class="youtube-player" type="text/html" ' +
		'width="640" height="390" src="https://www.youtube.com/embed/h5CYeESsTko" ' +
		'frameborder="0" allowFullScreen><\/iframe>';

	var infoBubble = new H.ui.InfoBubble(new H.geo.Point(50.02247733016747, 8.538626708984374), { content: htmlStr });
	ui.addBubble(infoBubble);
})