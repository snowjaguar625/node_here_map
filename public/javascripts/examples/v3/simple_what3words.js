/*
		author domschuette
		(C) HERE 2017
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
		defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		geocoder = platform.getGeocodingService();

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});
	
	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);
	
	var marker = null;
	
	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	
	map.addEventListener('tap', function (currentEvent) {
		var p = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		reverse(p.lat, p.lng);
	});
	
	var createIcon = function (text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120px" height="38px">' +
			'<line x1="60"  y1="22" x2="60" y2="32" stroke="#000000"/>' +
			'<text font-size="14" x="60" y="18" text-anchor="middle" fill="#000000">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 60, y : 32}});
	};
	
	var get = function()
	{
		var term = document.getElementById('iotextarea').value,
			pattern = /\w+\.\w+\.\w+/i,
			w3w = pattern.test(term);
		
		if(w3w)
			forward(term);
		else
			geocode(term);
	}
	
	var forward = function(term)
	{
		var url = ["https://api.what3words.com/v2/forward?addr=", 
				   term, 
				   "&display=terse",
				   "&format=json",
				   "&key=",
				   what3wordsApi,
				   "&callback=reverseCB"].join("");
		
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);		
	}
	
	var reverse = function(lat, lng)
	{
		var url = ["https://api.what3words.com/v2/reverse?coords=", 
				   lat,
				   ",",
				   lng, 
				   "&display=terse",
				   "&format=json",
				   "&key=",
				   what3wordsApi,
				   "&callback=reverseCB"].join("");
		
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);		
	}
	
	var reverseCB = function(result)
	{
		reverseGeocode(result.geometry.lat, result.geometry.lng, result.words);
		if(marker)
			map.removeObject(marker);
			
		marker = new H.map.Marker(new H.geo.Point(result.geometry.lat, result.geometry.lng), {icon: createIcon(result.words)});
		map.addObject(marker);					
	}
	
	var geocode = function(searchterm)
	{
		geocoder.search(
			{
				searchText: searchterm,
				maxresults: 1
			},
			function(result) {
				var p = result.Response.View[0].Result[0].Location.DisplayPosition;
				reverse(p.Latitude, p.Longitude);
			},
			function(error) {
				alert(error);
			}
		);
	}
	
	var	reverseGeocode = function(lat, lng, words) {
		geocoder.reverseGeocode({
			prox: lat + "," + lng + "," + "100",
			mode: "retrieveAddresses",
			maxresults: 1,
			requestid: words
		},
		function(result)
		{
			var html = result.Response.MetaInfo.RequestId + "\n" + result.Response.View[0].Result[0].Location.Address.Label
			document.getElementById('iotextarea').value = html;
		},
		function(error)
		{
			alert(error);
		}
		);
	}