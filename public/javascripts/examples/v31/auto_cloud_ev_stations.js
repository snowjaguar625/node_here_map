/*
	(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	
	// in this example we need to overwrite the app_id & app_code
	var app_id = "UbGDnK0iGwveR4rjIwhu",
		app_code = "ztzryH1sjBDG_VQe0uNgRw";

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	currentBubble,
	maptypes = platform.createDefaultLayers();


	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map,{
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// groups for zoom levels 4 - 10
	var evGroup = new H.map.Group();
	
	map.addEventListener("mapviewchangeend", function (event) {
		requestEVStations();
	});

	function requestEVStations()
	{
		if(map.getZoom() <= 8)
			return;
		
		var bounds = map.getViewModel().getLookAtData().bounds.getBoundingBox();
				
		var bbox = bounds.getTop() + "," + bounds.getLeft() + ";" + bounds.getBottom() + "," + bounds.getRight();

		url = ["https://ev-v2.cc.api.here.com/ev/",
			"stations.json?",
			"bbox=",
			bbox,
			"&",
			"app_id=",
			app_id,
			"&",
			"app_code=",
			app_code,
			"&maxresults=500",
			"&jsoncallback=parseEVStations"
		].join("");

		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}

	var parseEVStations = function(data)
	{
		evGroup.removeAll();

		if(data && data.evStations)
		{
			var locations = data.evStations.evStation;
			for (i = 0; i < locations.length; i++)
			{
				var evStation = locations[i];
				
				if(evStation.position && evStation.position.latitude && evStation.position.longitude)
				{
					var html = "",
						json = "";
					
					var point = new H.geo.Point(evStation.position.latitude, evStation.position.longitude);
					var marker = new H.map.Marker(point);

					if(evStation.name)
						html += "<h5>" + evStation.name + "</h5>";
					
					if(evStation.totalNumberOfConnectors)
						html += "<h5>#Connectors: " + evStation.totalNumberOfConnectors + "</h5>";
					
					if(evStation.brand)
						html += "<h5>Brand: " + evStation.brand + "</h5>";
					
					if(evStation.address)
					{
						var address = evStation.address;
						if(address.city)
							html += "<h6>City: " + address.city + "</h6>";
						if(address.country)
							html += "<h6>Country: " + address.country + "</h6>";
						if(address.postalCode)
							html += "<h6>ZIP: " + address.postalCode + "</h6>";
						if(address.street)
							html += "<h6>Street: " + address.street + "</h6>";
						if(address.streetNumber)
							html += "<h6>Hnr: " + address.streetNumber + "</h6>";
					}
					
					json += JSON.stringify(evStation.connectors, undefined, 4);
					json += JSON.stringify(evStation.contacts, undefined, 4);
					json += JSON.stringify(evStation.evStationDetails, undefined, 4);
					
					html += "<textarea rows='10' cols='30'>" + json + "</textarea>";
					
					marker.$html = html;

					marker.addEventListener("pointerdown", function(e)
					{
						if(currentBubble)
							ui.removeBubble(currentBubble);
						currentBubble = new H.ui.InfoBubble(e.target.getGeometry(), { content: e.target.$html });
						ui.addBubble(currentBubble);
					});
					evGroup.addObject(marker);
				}
			}
			map.addObject(evGroup);
		}
	}