/*
	author domschuette
    (C) HERE 2014
    author asadovoy
	(C) HERE 2019 -> migrate to 3.1
	*/


	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
        useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: center,
		zoom: 2,
		pixelRatio: window.devicePixelRatio || 1
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


	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	var npoints = 100, 
		offset = 20;

	// Berlin -> Chicago
	add([52.51607,13.37699],[41.88425,-87.63245], { style: { strokeColor : "#00FF00", lineWidth : 5, lineDash: [3], lineHeadCap: "arrow-head", lineTailCap: "arrow-tail"} });
	
	// Tokyo -> san Francisco
	add([35.68019,139.81194],[37.77712,-122.41964], {style: { strokeColor: "rgba(0,0,255,0.7)", lineWidth: 15, lineDash: [1], lineHeadCap: "arrow-head", lineTailCap: "arrow-tail"} });
	
	// Berlin -> Melbourne
	add([52.51607,13.37699],[-37.81753,144.96715], { style: { strokeColor : "rgba(255,0,255,0.7)", lineWidth : 5, lineDash: [3], lineHeadCap: "arrow-head", lineTailCap: "arrow-tail"} });
	
	// Berlin -> Paris -> Paris -> London
	add([52.51607,13.37699],[48.85721, 2.34144], { style: { strokeColor : "rgba(0,255,0,0.7)", lineWidth : 5, lineDash: [3], lineHeadCap: "arrow-head", lineTailCap: "arrow-tail"} });
	add([48.85721, 2.34144],[51.50643,-0.12721], { style: { strokeColor : "rgba(255,255,0,0.7)", lineWidth : 5, lineDash: [3], lineHeadCap: "arrow-head", lineTailCap: "arrow-tail"} });
	
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