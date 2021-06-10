/*
	(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById("mapContainer");

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptileService = platform.getMapTileService({'type': 'base'});
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : 250);

	map = new H.Map(mapContainer,maptypes.vector.normal.map,
		{
			center: center,
			zoom: zoom
		}
	);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var polygon = null, paintReady = true;
	var polystrip = new H.geo.LineString();

	// add behavior control
	var mapevts = new H.mapevents.MapEvents(map);
	
		// add behavior control
	var mapBehavior = new H.mapevents.Behavior(mapevts);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	var screenPoint;
	

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	

	map.addEventListener("pointerdown", function(e) {
		if(paintReady && polystrip)
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
			if (polystrip && polystrip.getPointCount() > 2) {
				screenPoint = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
				updatePolygon(screenPoint);
			}
		}
	});

	map.addEventListener("dbltap", function(e) {
		if(paintReady)
		{
			//stop event propagation
			e.originalEvent.stopImmediatePropagation();

			//set path and fillColor of polygon to finish the digitizer
			polygon.setGeometry(new H.geo.Polygon(polystrip));

			//set paintReady flag to false to prevent painting polygon
			paintReady = false;
			polystrip = new H.geo.LineString();
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
		if(polystrip){
			// replace the last coordinate if three coorinates present
			if(polystrip.getPointCount() > 3)
			polystrip.removePoint(polystrip.getPointCount()-1);
			polystrip.pushPoint({lat:point.lat, lng:point.lng});
			var geoPolygon = new H.geo.Polygon(polystrip);
			polygon.setGeometry(geoPolygon);
		}
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