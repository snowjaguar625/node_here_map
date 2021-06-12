/* 
		(C) HERE 2019
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(),
		adminLevel,
		layer,
		provider;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: new H.geo.Point(35.176904616342135, 33.359340725785955),
		zoom: 10,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	var defaultYamlUrl = 'https://js.api.here.com/v3/3.1//styles/omv/normal.day.yaml';
	var defaultStyle = new H.map.Style(defaultYamlUrl,
		'https://js.api.here.com/v3/3.1/styles/omv/');
	
	// the custom style file url 
	// check line numbers 33,95-106 ,1487,1721 in the file for customization done
	// over the default style
	var customYamlUrl = '/sample_data/normal.day.filter.yaml';
	var customStyle = new H.map.Style(customYamlUrl,
		'https://js.api.here.com/v3/3.1/styles/omv/');
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	var provider = map.getBaseLayer().getProvider();
	function changeFilter(checkbox)
	{
		filter = checkbox.checked;
		if(filter){
			provider.setStyle(customStyle);
		}else{
			provider.setStyle(defaultStyle);
		}
	}