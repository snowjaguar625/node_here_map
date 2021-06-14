	/*
	author 
	(C) HERE 2019
	*/

	// check if the site was loaded via secure connection
    
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	defaultLayers = platform.createDefaultLayers();
	geocoder = platform.getGeocodingService();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.vector.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers),
	group = new H.map.Group(),

	reverseGeocode = function() {
		geocoder.reverseGeocode({
			prox: 52.53099 + "," + 13.38455 + "," + "100",
			mode: "retrieveAddresses",
			requestId: "TESTREQUEST"
		},
		function(result)
		{
			results = result.Response.View[0].Result;
			for (i = 0; i < results.length; i++)
			{
				pos = result.Response.View[0].Result[i].Location.DisplayPosition;
				point = new H.geo.Point(pos.Latitude, pos.Longitude);
				address = result.Response.View[0].Result[i].Location.Address;

				street = address.Street != undefined ? address.Street : "";
				housenumber = address.HouseNumber != undefined ? address.HouseNumber : "";
				zip = address.PostalCode != undefined ? address.PostalCode : "";
				city = address.City != undefined ? address.City : "";

				line1 = street + " " + housenumber;
				line2 = zip + " " + city;

				marker = new H.map.Marker(point,
					{
						icon: createIcon(i + ": " + line1, line2)
					});

					group.addObject(marker);
			}
			map.addObject(group);
			map.getViewModel().setLookAtData({
				tilt: 45,
				bounds: group.getBoundingBox()
			});
		},
		function(error)
		{
			alert(error);
		}
		);
	}

	geocode = function()
	{
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
		});
	};
    $('#reverseGeoCode').on('click', reverseGeocode() );