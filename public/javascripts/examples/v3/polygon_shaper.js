/*
	author mglynn
	(C) HERE 2014
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById("mapContainer");

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	maptileService = platform.getMapTileService({'type': 'base'});
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: zoom
		}
	);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var polygon = null, paintReady = true;
	var polystrip = new H.geo.Strip();

	// add behavior control
	var mapevts = new H.mapevents.MapEvents(map);
	
		// add behavior control
	var mapBehavior = new H.mapevents.Behavior(mapevts);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	
	

	map.addEventListener("pointerdown", function(e) {
		if(paintReady)
		{
			//push a point into array
			polystrip.pushPoint(map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY));
			//create a polygon if points array has one point inside.
			if(polystrip.getPointCount() == 3) {
				pushPolygon();
			}
			else if(polystrip.getPointCount() == 2){
				pushPolyline();
			}
		}
	});

	map.addEventListener("pointermove", function(e) {
		if(paintReady)
		{
			// update polygon shape by pointermove event
			if (polystrip.getPointCount() > 2) updatePolygon(map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY));
		}
	});

	map.addEventListener("dbltap", function(e) {
		if(paintReady)
		{
			//stop event propagation
			e.originalEvent.stopImmediatePropagation();

			//set path and fillColor of polygon to finish the digitizer
			polygon.setStrip(polystrip);

			//set paintReady flag to false to prevent painting polygon
			paintReady = false;
			polystrip = new H.geo.Strip();
		}
	});

	var cns = document.getElementById("clear");
	cns.onclick = function()
	{
		if(polygon)
			map.removeObject(polygon);
		paintReady = true;
	};

	//update the shape of polygon by pointermove event
	updatePolygon = function(point) {
		polygon.setStrip(new H.geo.Strip(polystrip.getLatLngAltArray().concat(point.lat, point.lng, undefined)));
	};

	//push polygon to map
	pushPolygon = function(){
		map.removeObject(polyline);
		polygon = new H.map.Polygon(
			polystrip, {
				style: {
					strokeColor: "#f00",
					lineWidth: 1
				}
			}
		);
		map.addObject(polygon);
	};
	
	//push polyline to map
	pushPolyline = function(){
		polyline = new H.map.Polyline(
			polystrip, {
				style: {
					strokeColor: "#f00",
					lineWidth: 1
				}
			}
		);
		map.addObject(polyline);
	};