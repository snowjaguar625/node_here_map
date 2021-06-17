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
	defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, {
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

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	// boolean to check if map will receive events
	var mapEventsOn = false;
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

/*	
	// check wich event is fired on the Map. 
	function logEvent(evt)
	{
		console.log(['event ', evt.type].join(''));
	}	
	
	map.addEventListener('pointerdown', logEvent);
	map.addEventListener('pointerup', logEvent);
	map.addEventListener('pointermove', logEvent);
	map.addEventListener('pointerenter', logEvent);
	map.addEventListener('pointerleave', logEvent);
	map.addEventListener('pointercancel', logEvent);
	map.addEventListener('dragstart', logEvent);
	map.addEventListener('drag', logEvent);
	map.addEventListener('dragend', logEvent);
	map.addEventListener('tap', logEvent);
	map.addEventListener('dbltap', logEvent);
	map.addEventListener('dbltap', logEvent);
*/	

	map.addEventListener('pointerleave', 
		function(e) 
		{ 
			$('#pageblock').fadeOut('normal');
			mapEventsOn = false;
		}
	);

	map.addEventListener('pointercancel', 
		function(e) 
		{ 
			$('#pageblock').fadeOut('normal');
			mapEventsOn = false;
		}
	);
	
	map.addEventListener('pointerenter', 
		function(e) 
		{ 
			mapEventsOn = true;
		}
	);
		
	document.addEventListener('touchmove', 
		function(e) 
		{
			if(mapEventsOn)
			{
				var touch = e.touches[0];
				
				if(e.touches.length == 1)
				{
					$('#pageblock').fadeIn('normal');
					behavior.disable(H.mapevents.Behavior.DRAGGING);
					pageblock.style.zIndex = "3";
				}
				
				if(e.touches.length == 2)
				{
					// This means there are two finger move gesture on screen
					pageblock.style.display = "none";
					behavior.enable(H.mapevents.Behavior.DRAGGING);
				}
			}
		}, 
	false);