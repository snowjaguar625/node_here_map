/*
	author domschuette
	(C) HERE 2014
	*/

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
	geocoder = platform.getGeocodingService();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: zoom,
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

	//helper
	var releaseGeocoderShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes),
	group = new H.map.Group(),

	reverseGeocode = function() {
		geocoder.reverseGeocode({
			prox: 52.53099 + "," + 13.38455 + "," + "100",
			mode: "retrieveAddresses",
			requestId: "TESTREQUEST"
		},
		function(result)
		{
			//add Geocoder Release information if not already done
			if (releaseGeocoderShown== false){
				loadGeocoderVersionTxt();
				releaseGeocoderShown = true;
			}
			results = result.Response.View[0].Result;
			for (i = 0; i < results.length; i++)
			{
				pos = result.Response.View[0].Result[i].Location.DisplayPosition;
				point = new H.geo.Point(pos.Latitude, pos.Longitude);
				address = result.Response.View[0].Result[i].Location.Address;

				street = address.Street;
				housenumber = address.HouseNumber;
				zip = address.PostalCode;
				city = address.City;

				line1 = street + " " + housenumber;
				line2 = zip + " " + city;

				marker = new H.map.Marker(point,
					{
						icon: createIcon(i + ": " + line1, line2)
					});

					group.addObject(marker);
			}
			map.addObject(group);
			map.setViewBounds(group.getBounds());
		},
		function(error)
		{
			alert(error);
		}
		);
	}

	geocode = function()
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.geocode(
			{
				searchText: "425 W Randolph Street, Chicago"
			},
			function(result) {
				pos = result.Response.View[0].Result[0].Location.DisplayPosition
				point = new H.geo.Point(pos.Latitude, pos.Longitude);

				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = result.Response.View[0].Result[0].MatchLevel;

				marker = new H.map.Marker(point,
					{
						icon: createIcon(line1, line2)
					});
					map.addObject(marker);
					map.setCenter(point);
					map.setZoom(18);
			},
			function(error) {
				alert(error);
			}
		);
	},

	createIcon = function (line1, line2) {
		var div = document.createElement("div");

		var div = document.createElement("div");
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line1.length  * 4 + 57);
		svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 4 + 120);
		div.innerHTML = svgMarker;

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});;
	};