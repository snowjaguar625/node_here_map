/*
	author domschuette
	(C) HERE 2015
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: 10,
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

	var tileProvider = maptypes.normal.metaInfo.getProvider();
	tileProvider.addEventListener('pointermove', updateMapCursor);
	
	tileProvider.addEventListener('pointerdown', showMetaInfo);
	map.addEventListener('pointermove', updateMapCursor);
	map.addLayer(maptypes.normal.metaInfo);
	
	function updateMapCursor(e) 
	{
		map.getElement().style.cursor = (e.target === map) ? '' : 'pointer';
	}

	function showMetaInfo(e) 
	{
		if(e.target !== map)
		{
			var currentPointer = e.currentPointer,
				metaInfoData = e.target.getData(),
				content =  '<strong style="font-size: large;">' + metaInfoData.name  + '</strong></br>';
			
			content  += '<br/><strong>metaInfo:</strong><br/>';
			content  += '<div style="margin-left:5%; margin-right:5%;"><pre><code style="font-size: x-small;">' +
			JSON.stringify(metaInfoData, null, ' ') + '</code></pre></div>';
			locationsContainer.innerHTML = content;
		}
	}