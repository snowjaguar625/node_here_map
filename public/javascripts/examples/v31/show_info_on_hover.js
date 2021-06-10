/**
	*
	* (C) HERE 2019
	*/

	var infoBubble = null;

	/**
	* Adds map objects listening for mouse enter and leave events.
	*/
	function addObjectsToMap(map) {
		// Marker
		var marker = new H.map.Marker({
			lat: 47.329,
			lng: 5.045
		});
		marker.addEventListener('pointerenter', onPointerEnter);
		map.addEventListener('tap', removeBubble);
		map.addObject(marker);

		// Polyline
		var strip = new H.geo.LineString();
		strip.pushPoint({
			lat: 53.3477,
			lng: -6.2597
		});
		strip.pushPoint({
			lat: 51.5008,
			lng: -0.1224
		});
		strip.pushPoint({
			lat: 48.8567,
			lng: 2.3508
		});
		strip.pushPoint({
			lat: 52.5166,
			lng: 13.3833
		});

		var polyline = new H.map.Polyline(strip, {
			style: {
				lineWidth: 6
			}
		});
		polyline.addEventListener('pointerenter', onPointerEnter);

		map.addObject(polyline);
	}

	function onPointerEnter(e) {
		document.getElementById('mapContainer').style.cursor = 'crosshair';
		
		if(infoBubble)
		removeBubble(e);	
		
		var point = map.screenToGeo(e.pointers[0].viewportX, e.pointers[0].viewportY);
		infoBubble = new H.ui.InfoBubble(point, { content: 'I am being hovered!' });

		ui.addBubble(infoBubble);
		var bubbleTail = document.getElementsByClassName("H_ib_tail");
		for (var i=0;i<bubbleTail.length;i++){
			bubbleTail[i].innerHTML='<svg viewBox="0 0 25 25"><g><path d="M 20,0.5 15,20 10,0.5 z"  style="fill:rgb(140, 127, 238);fill-opacity : 0.85"></path></g></svg>';
		}
		checkInfoBubble(infoBubble);
	}
	
	// check if info bubble is visible, otherwise move the map center
	function checkInfoBubble(infoBubble){
		setTimeout(function() {
		      if(infoBubble && infoBubble.getState() == "open"){
				var border = 50;
				var objRect = infoBubble.getContentElement().parentElement.getBoundingClientRect();
				var objStyleRight = Math.abs(parseInt(infoBubble.getContentElement().parentElement.style.right));
				objStyleRight = objStyleRight ? objStyleRight : 0;

				var mapRect = map.getElement().getBoundingClientRect();
				var shiftX = 0;
				var shiftY = 0;
				
				// check, if infobubble isn't too far to up
				if ((objRect.top-border)  < mapRect.top)  {
					shiftY = (mapRect.top - (objRect.top-border));
				}
				
				// check, if infobubble isn't too far to the left
				var objLeft = (objRect.left - objStyleRight);
				if ((objLeft-border) < mapRect.left) {
					shiftX = (mapRect.left - (objLeft-border));
				} // check, if infobubble isn't too far to the right
				else if ((objRect.right+border) > mapRect.right) {
					shiftX = -(objRect.right - (mapRect.right-border));
				}
					
							
				if ((shiftX == 0) && (shiftY == 0)) {
					return;
				}

				var currScreenCenter = map.geoToScreen(map.getCenter());
				var newY = (currScreenCenter.y - shiftY);
				var newX = (currScreenCenter.x - shiftX);
				 
				 var newGeoCenter = map.screenToGeo(newX, newY);
				 map.setCenter(newGeoCenter, true); 
			}
			
			 
		 }, 20);
	}

	function removeBubble(e) {
		document.getElementById('mapContainer').style.cursor = 'default';
		ui.removeBubble(infoBubble);
		infoBubble.dispose();
	}

	/**
	* Boilerplate map initialization code starts below:
	*/
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// initialize communication with the platform
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	});

	var defaultLayers = platform.createDefaultLayers();

	// initialize a map
	var map = new H.Map(document.getElementById('mapContainer'),
	defaultLayers.vector.normal.map, {
		center: {
			lat: 52,
			lng: 5
		},
		zoom: 5,
		pixelRatio: window.devicePixelRatio || 1
    });
    map.getViewModel().setLookAtData({
		tilt: 45
	});

	// make the map interactive
	// MapEvents enables the event system
	// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
	var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();



	// Now use the map as required...
	addObjectsToMap(map);