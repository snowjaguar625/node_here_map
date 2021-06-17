/*
	author Ali Aien
	TCS Melbourne
	(C) HERE 2014
	*/

	var marker;

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
	var mapEvents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapEvents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;

	// Create a group that can hold map objects:
	group = new H.map.Group();

	// Add the group to the map object (created earlier):
	map.addObject(group);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// Get an instance of the geocoding service:
	var geocoder = platform.getGeocodingService();

	map.addEventListener('mapviewchangeend', function() {
		group.removeAll();
		marker = new H.map.Marker(map.getCenter());
		// Add the marker to the group (which causes// it to be displayed on the map)
			group.addObject(marker);
			var mapCenterLat = map.getCenter().lat;
			var mapCenterLng = map.getCenter().lng;

			//Function to return the location of the marker (center of the map)
			locationOfMarker (mapCenterLat,mapCenterLng);

			//Reverse Geocoding function to return the address of the marker (center of the map)
			reverseGeocoding (mapCenterLat,mapCenterLng);
	});

	function locationOfMarker(mapCenLat, mapCenLng){
		document.getElementById("markerLocationText").value = mapCenLat.toFixed(7) + ", " + mapCenLng.toFixed(7);
	}

	function reverseGeocoding(mapRGCenLat, mapRGCenLng){
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		var reverseGeocodingParameters = {
			prox: mapRGCenLat+ "," + mapRGCenLng + "," + 500,
			mode: 'retrieveAddresses',
			minResults: 1,
			additionaldata: 'SuppressStreetType,Unnamed',
			gen:8
		};

		// Call the geocode method with the geocoding parameters,
		// the callback and an error callback function (called if a communication error occurs):
		geocoder.reverseGeocode(
			reverseGeocodingParameters,
			onSuccess,
			function(e) {
				alert(e);
			}
		);
	}

	// Define a callback function to process the response:
	function onSuccess(result) {
		var location = result.Response.View[0].Result[0];
		// Display returned location with the address label:
		document.getElementById("addressText").value = location.Location.Address.Label;
	}