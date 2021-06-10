/*
	author domschuette
    (C) HERE 2015
    // author asadovoy
	// (C) HERE 2019 -> migrate to 3.1
	*/
	

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: center,
		zoom: 10,
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

	//add MRS Release information
	loadMRSVersionTxt();


	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener('pointermove', updateMapCursor);

	function setInteractive(map){
		// get the vector provider from the base layer
		var provider = map.getBaseLayer().getProvider();

		// get the style object for the base layer
		var style = provider.getStyle();

		var changeListener = (evt) => {
			if (style.getState() === H.map.Style.State.READY) {
				style.removeEventListener('change', changeListener);

				// enable interactions for the desired map features
				style.setInteractive(['water', 'road_labels', 'buildings',  'places'], true, true);

				// add an event listener that is responsible for catching the
				// 'tap' event on the feature and showing the infobubble
				provider.addEventListener('tap', showMetaInfo);
				provider.addEventListener('pointermove', updateMapCursor);
			}
		};
		style.addEventListener('change', changeListener);
	}

	
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
				name = metaInfoData.properties.name || metaInfoData.properties.kind,
				content =  '<strong style="font-size: large;">' + name + '</strong></br>';
			
			content  += '<br/><strong>metaInfo:</strong><br/>';
			content  += '<div style="margin-left:5%; margin-right:5%;"><pre><code style="font-size: x-small;">' +
			JSON.stringify(metaInfoData, null, ' ') + '</code></pre></div>';
			locationsContainer.innerHTML = content;
		}
	}
	setInteractive(map);