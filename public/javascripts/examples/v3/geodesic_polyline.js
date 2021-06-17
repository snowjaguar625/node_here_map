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

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: 2,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	var npoints = 100, 
		offset = 20;

	// Berlin -> Chicago
	add([52.51607,13.37699],[41.88425,-87.63245], { style: { strokeColor : "#00FF00", lineWidth : 5 }, arrows: { color : "#FFFFFF", width : 2, length : 3, frequency : 4}});
	
	// Tokyo -> san Francisco
	add([35.68019,139.81194],[37.77712,-122.41964], {style: { strokeColor: "rgba(0,0,255,0.7)", lineWidth: 15}});
	
	// Berlin -> Melbourne
	add([52.51607,13.37699],[-37.81753,144.96715], { style: { strokeColor : "rgba(255,0,255,0.7)", lineWidth : 5 }, arrows: { color : "#FFFFFF", width : 2, length : 3, frequency : 4}});
	
	// Berlin -> Paris -> Paris -> London
	add([52.51607,13.37699],[48.85721, 2.34144], { style: { strokeColor : "rgba(0,255,0,0.7)", lineWidth : 5 }, arrows: { color : "#FFFFFF", width : 2, length : 3, frequency : 4}});
	add([48.85721, 2.34144],[51.50643,-0.12721], { style: { strokeColor : "rgba(255,255,0,0.7)", lineWidth : 5 }, arrows: { color : "#FFFFFF", width : 2, length : 3, frequency : 4}});
	
	function add(s,e,options) {
		var start_ll = new H.geo.Point(s[0],s[1]),
			end_ll = new H.geo.Point(e[0],e[1]),
			start_coord = {x: start_ll.lng, y:start_ll.lat},
			end_coord = {x:end_ll.lng, y:end_ll.lat};
			description = ''+s[0]+','+s[1]+'=>'+e[0]+','+e[1]+'',
			gc0 = new arc.GreatCircle(start_coord,end_coord, {'name': 'line', 'color':'#ff7200','description':description}),
			line0 = gc0.Arc(npoints,{offset:offset}),
			strip = line0.strip();
		
		map.addObject(new H.map.Polyline(strip, options));
	}