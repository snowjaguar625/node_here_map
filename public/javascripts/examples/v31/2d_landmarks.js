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
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : 250),
	importance1 = new H.map.Group(),
	importance2 = new H.map.Group();

	// Instantiate a map in the 'map' div
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: new H.geo.Point(52.51804784164938, 13.377256123093076),
		zoom: 19,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// add the marathon track to the map
	strip = new H.geo.LineString();
	for(i = 0; i < track.length; i++)
	{
		strip.pushLatLngAlt(track[i].lat, track[i].lng, 0);
	}

	var polyline = new H.map.Polyline(strip,
		{
			style:
			{
				lineWidth: 5,
				strokeColor: "rgba(18, 65, 145, 0.7)"
			}
		});

		map.addObject(polyline);

		// zoom to marathon track using bounds
		map.getViewModel().setLookAtData({
				tilt: 45,
				bounds: polyline.getBoundingBox()
		});
		
		// add importance groups to the map
		map.addObject(importance1);
		map.addObject(importance2);

		importance2.setVisibility(false);

		// add the 2D Landmarks as marker to the map
		for(i = 0; i < objs.length; i++)
		{
			// obj array is defined in berlin.js
			obj = objs[i];

			icon = new H.map.Icon("/assets/2d_landmarks/" + obj.filename, {
				anchor: new H.math.Point(24, 24),
				size: new H.math.Size(48, 48)
			});;

			// Create a marker using the previously instantiated icon
			marker = new H.map.Marker({ lat: obj.lat, lng: obj.lng }, { icon: icon });
			marker.filename = obj.filename;

			marker.addEventListener("pointerdown", function(e) { console.log(e.target.filename); });

			group = obj.importance == 1 ? importance1 : obj.importance == 2 ? importance2 : importance3;

			// Add the marker to the map.
			group.addObject(marker);
		}

		map.addEventListener("mapviewchangeend", function(e)
		{
			zoom = map.getZoom();
			console.log(zoom);
			if(zoom < 10 || zoom >= 16)
			{
				importance1.setVisibility(false);
				importance2.setVisibility(false);
			}
			else if(zoom >= 10 && zoom < 13)
			{
				importance1.setVisibility(true);
				importance2.setVisibility(false);
			}
			else
			{
				importance1.setVisibility(true);
				importance2.setVisibility(true);
			}
		}
		);