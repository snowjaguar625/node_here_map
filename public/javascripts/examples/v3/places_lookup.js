/*
	author dschutte
	(C) HERE 2017
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	group = new H.map.Group(),
	currentBubble,

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(mapContainer, maptypes.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});
	
	// marker 
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
		  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
		  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
		  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
		  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
		  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
		  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="green"/>' +
		  '</svg>',
		icon = new H.map.Icon(svg);


	map.addObject(group);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	mapevents = new H.mapevents.MapEvents(map),

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	behavior = new H.mapevents.Behavior(mapevents),

	// Enable the default UI
	ui = H.ui.UI.createDefault(map, maptypes);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var lookup = function()
	{
		var source = document.getElementById('source'),
			sourceType = source.options[source.selectedIndex].value,
			term = document.getElementById('term').value,
			url;
			
		if(sourceType == "sharing" || sourceType == "pvid")
		{
			url = ['https://places.api.here.com/places/v1/places/lookup?',
				   'app_code=',
				   app_code,
				   '&app_id=',
				   app_id,
				   '&id=',
				   term,
				   '&source=',
				   sourceType,
				   '&callback=lookupresponse' ].join("");
				   
			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
		}
		else if(sourceType == "name")
		{
			url = ['https://places.api.here.com/places/v1/discover/search?',
				   'app_code=',
				   app_code,
				   '&app_id=', 
				   app_id,
				   '&at=0,0',
				   '&q=',
				   term,
				   '&callback=placesresponse'].join("");

			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
		}
	}
	
	var lookupresponse = function(response)
	{
		group.removeAll();
		if(response && !response.status)
		{
			if(response.location && response.location.position)
			{
				var lat = response.location.position[0], 
					lng = response.location.position[1],
					html = "";
					
				var marker = new H.map.Marker(new H.geo.Point(lat, lng)); 
				
				html = "<h5>" + response.name + "</h5>";
				html += "<textarea rows='10' cols='30'>" + JSON.stringify(response, undefined, 4) + "</textarea>";
				marker.$html = html;
				
				marker.addEventListener("pointerdown", function(e)
					{
						if(currentBubble)
							ui.removeBubble(currentBubble);
						currentBubble = new H.ui.InfoBubble(e.target.getPosition(), { content: e.target.$html });
						ui.addBubble(currentBubble);
					}
				);
				group.addObject(marker);
			}
			if(response.location && response.location.access[0] && response.location.access[0].position)
			{
				var lat = response.location.access[0].position[0], 
					lng = response.location.access[0].position[1],
					html = "";
					
				var marker = new H.map.Marker(new H.geo.Point(lat, lng), {icon: icon}); 
				
				html = "<h5>" + response.name + "</h5>";
				html += "<textarea rows='10' cols='30'>" + JSON.stringify(response, undefined, 4) + "</textarea>";
				marker.$html = html;
				
				marker.addEventListener("pointerdown", function(e)
					{
						if(currentBubble)
							ui.removeBubble(currentBubble);
						currentBubble = new H.ui.InfoBubble(e.target.getPosition(), { content: e.target.$html });
						ui.addBubble(currentBubble);
					}
				);
				group.addObject(marker);
			}
			map.setViewBounds(group.getBounds());
		}
		else
		{
			alert("Error in Places Lookup, might no Place was found?!? Please check Console output"); 
		}
	}
	
	var placesresponse = function(response)
	{
		group.removeAll();
		if(response && !response.status)
		{
			if(response.results.items)
			{
				var i = 0;
				for(; i < response.results.items.length; i++)
				{
					var obj = response.results.items[i],
						lat = obj.position[0],
						lng = obj.position[1],
						html = ""; 
					
					var marker = new H.map.Marker(new H.geo.Point(lat, lng)); 
				
					html = "<h5>" + obj.title + "</h5>";
					html += "<textarea rows='10' cols='30'>" + JSON.stringify(obj, undefined, 4) + "</textarea>";
					marker.$html = html;
				
					marker.addEventListener("pointerdown", function(e)
						{
							if(currentBubble)
								ui.removeBubble(currentBubble);
							currentBubble = new H.ui.InfoBubble(e.target.getPosition(), { content: e.target.$html });
							ui.addBubble(currentBubble);
						}
					);
					group.addObject(marker);
				}
				map.setViewBounds(group.getBounds());
			}
		}
		else
		{
			alert("Error in Places Request, might no Place found?!? Please check Console output");
		}
	}