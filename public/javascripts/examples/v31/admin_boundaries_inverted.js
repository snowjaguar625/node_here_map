    // check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer');

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
			useHTTPS: secure,
			apikey: api_key
		}),
		defaultLayers = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService(),
		polygon = new H.map.Group(),

		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(mapContainer, defaultLayers.vector.normal.map, {
			center: new H.geo.Point(50.15, 8.54),
			zoom: 12,
			pixelRatio: window.devicePixelRatio || 1
		}),

		// Enable the map event system
		mapevents = new H.mapevents.MapEvents(map),
		
		// Enable map interaction (pan, zoom, pinch-to-zoom)
		behavior = new H.mapevents.Behavior(mapevents),

		// Enable the default UI
		ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addObject(polygon);

	var reverseGeocode = function() 
	{

		geocoder.reverseGeocode(
			{
				prox:  50.1802815 + "," + 8.474503934 + "," + "100",
				mode: 'retrieveAddresses',
				'additionalData': 'IncludeShapeLevel,postalCode'
			},
			function(result) {
				revGeoReq = true;
				createPolygon(result);
			},
			function(error) {
					alert(error);
			}
		);
	}
	
	var geocode = function()
	{
		var searchText = document.getElementById("geoCode").value;		
		geocoder.geocode(
			{ 
				searchText: searchText,
				'additionalData': 'IncludeShapeLevel,default'
			},
			function(result) {
					createPolygon(result);
			},
			function(error) {
					alert(error);
			}
		);
	};			
	
	var createPolygon = function(result)
	{
		polygon.removeAll();

		var pos = null,
			point = null,
			address = null,
			matchLevel = null;

		if(result.Response.View[0].Result[0].Location != null)
		{
			pos = result.Response.View[0].Result[0].Location.DisplayPosition;
			matchLevel = result.Response.View[0].Result[0].MatchLevel;
		}
		else
		{
			pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
		}

		point = new H.geo.Point(pos.Latitude, pos.Longitude);
			
		if(result.Response.View[0].Result[0].Location != null)
		{
			address = result.Response.View[0].Result[0].Location.Address;
			matchLevel = "Place";
		}
		else
		{
			address = result.Response.View[0].Result[0].Place.Locations[0].Address;		
		}				
		
		if (typeof(result.Response.View[0].Result[0].Location.Shape) != "undefined")
		{
			var shapes = new Array(),
				respShape = result.Response.View[0].Result[0].Location.Shape.Value;
					
			if(respShape.indexOf("MULTIPOLYGON") != -1)
			{
				shapes = respShape.replace("MULTIPOLYGON", "").trim().split("), (");
			}
			else
			{
				shapes[0] = respShape.replace("POLYGON", "").replace("((", "").replace("))", "").trim();
			}
					
			for (var j = 0; j < shapes.length; j++)
			{
				var lineStr = new H.geo.LineString();
					newCoords = shapes[j].replace("(((", "").replace(")))", "").replace("((", "").replace("))", "").replace("(", "").replace(")", "").trim().split(",");

				for (var i = 0; i < newCoords.length; i++)
				{
					var split = newCoords[i].trim().split(" ");
					if(split.length === 2){
						var lat = parseFloat(split[1]),
							lon = parseFloat(split[0]);
						lineStr.pushLatLngAlt( lat, lon, 0);									
					}
				}

				invertedPolygon = new InvertedPolygon(lineStr);
				polygon.addObject(invertedPolygon.polygon);
			}
		}
		map.getViewModel().setLookAtData({
			tilt: 45,
			bounds: invertedPolygon.bounds
		});
	};