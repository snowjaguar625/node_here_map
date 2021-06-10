
	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
			useHTTPS: secure,
			apikey: api_key
		}),

		// Get pre-configured set of HERE layers
		defaultLayers = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService(),

		// Create a group as a container for other map objects(markers, polygons, etc.)
		group = new H.map.Group(),
		maxCount = 0,

		// Instantiate a map in the 'map' div, set the base map to normal map tile layer
		map = new H.Map(mapContainer, defaultLayers.vector.normal.map, {
			center: center,
			zoom: zoom,
			pixelRatio: window.devicePixelRatio || 1
		});

	// Do not draw under control panel.
	// Padding results in a shifted map center which is the visual center of the padded area.
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map),

		// Enable map interaction (pan, zoom, pinch-to-zoom)
		behavior = new H.mapevents.Behavior(mapevents),

		// Enable the default UI
		ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() {
		map.getViewPort().resize();
	});

	map.addEventListener('contextmenu', function(e) { //right click event on the map
		var geoPoint = map.screenToGeo(e.viewportX, e.viewportY);
		$('#coord').text(geoPoint.lat.toFixed(8) + "," + geoPoint.lng.toFixed(8)); //set coordinate to html element with id='coord'
	});


	var reverseGeocode = function() {
		geocoder.reverseGeocode({
				prox: $('#coord').text() + "," + "100",
				mode: 'retrieveAddresses',
				'additionalData': 'IncludeShapeLevel,postalCode'

			},
			function(result) { // When the request has completed, run this function
				createPolygon(result);
			},
			function(error) {
				alert(error);
			});
	};

	var geocode = function() {
		var searchText = document.getElementById("geoCode").value;
		geocoder.geocode({
				searchText: searchText,
				'additionalData': 'IncludeShapeLevel,default'
			},
			function(result) { // When the request has completed, run this function
				createPolygon(result);
			},
			function(error) {
				alert(error);
			});
	};

	var createPolygon = function(result) {
		// Proof of already shown objects and remove all them from the map
		group.removeAll();

		//Check result response
		if (!result || !result.Response || !result.Response.View ||
			result.Response.View.length == 0 || !result.Response.View[0].Result) {
			alert("Given address is not found!");
			return;
		}
		// Parse geocode/reverse result
		ParseResult: {
			var location = {},
				resRef = result.Response.View[0].Result[0];
			location.Shape = resRef.Location.Shape;
		}

		if (!location.Shape) {
			//alert('Found Address too detailed!');
		} else {
			var shapes = new Array();
			var respShape = location.Shape.Value;

			// Parse WKTs like "MULTIPOLYGON (((8.92115 50.10965, 8.9193 50.11115, 8.91823 50.11284, 8.92115 50.10965)))"
			//	  to arrays of coordinates like [8.92115,50.10965, 8.9193,50.11115, 8.91823,50.11284, 8.92115,50.10965]
			// maybe we have more than one polygon then split them to array of polygons by "), ("
			shapes = respShape.replace("MULTIPOLYGON", "").replace("POLYGON", "").trim().split("), (");

			for (var j = 0; j < shapes.length; j++) { //go through all polygons
				var lineStr = new H.geo.LineString();

				//erase all chars '(' and ')' then split to array by ','
				var newCoords = shapes[j].replace(/\(/g, "").replace(/\)/g, "").trim().split(",");

				// now newCoords contains array like ["8.92115 50.10965", "8.9193 50.11115", "8.91823 50.11284", "8.92115 50.10965"]
				for (var i = 0; i < newCoords.length; i++) {
					var split = newCoords[i].trim().split(" "); //convert "8.92115 50.10965" to array ["8.92115,50.10965"]
					if (split.length === 2) { //assert only latitude and longitude
						var lat = parseFloat(split[1]);
						var lon = parseFloat(split[0]);
						lineStr.pushLatLngAlt(lat, lon, 0); //now lineStr contains only lat,lon,alt,lat,lon,alt... etc
					}
				}

				maxCount = lineStr.getPointCount();

				var shp = new H.map.Polygon(lineStr, { //make polygon from lineStr
					style: {
						lineWidth: 5,
						strokeColor: "rgba(50, 128, 128, 0.5)"
					}
				});
				group.addObject(shp);
			}
		}
		map.addObject(group); //push polygons to map
		map.getViewModel().setLookAtData({
			tilt: 45,
			bounds: group.getBoundingBox()
		});
	};