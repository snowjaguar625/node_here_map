	/*
	author 
	(C) HERE 2015
	*/
	//which color are we on?
	var clrcnt = 0;
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	var alternatives =0;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	defaultLayers = platform.createDefaultLayers(),
	geocoder = platform.getGeocodingService(),
	router = platform.getRoutingService(),
	start = H.geo.Point(50.11208, 8.68342),
	destination = H.geo.Point(50.14041, 8.57211),
	lang = "en-GB",
	markerLayer = new H.map.Group(),
	polylineLayer = new H.map.Group(),
	fenceLayer = new H.map.Group(),
	server_rr = 0,
	fence,
	currentPolyline,
	bLongClickUseForStartPoint = true,
	startMarker = null,
	destMarker = null,

	map = new H.Map(mapContainer, defaultLayers.vector.normal.map,
	{
		center: center,
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add the layer for markers to the map
	map.addObject(markerLayer);
	map.addObject(polylineLayer);

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	// add behavior control
	var mapBehavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// adding rectangle control
	var rectControl = new H.ui.ZoomRectangle();
	ui.addControl("rectControl", rectControl);

	// adding Overview Control
	var overviewControl = new H.ui.Overview(defaultLayers.vector.normal.map);
	ui.addControl("overviewControl", overviewControl);

	// react on a Base Layer change, and update the Overview Control
	map.addEventListener("baselayerchange", function() { overviewControl.setBaseLayer(map.getBaseLayer());});

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			removeAndStartRouting();
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			document.getElementById("input-from").value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				markerLayer.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA,
			{
				icon: createIcon(line1, line2),
				volatility: true
			});
			markerLayer.addObject(startMarker);
			bLongClickUseForStartPoint = false;
		}
		else
		{
			removeAndStartRouting();
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			document.getElementById("input-to").value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
				markerLayer.removeObject(destMarker);
			}
			destMarker = new H.map.Marker(pointB,
			{
				icon: createIcon(line1, line2),
				volatility: true
			});
			markerLayer.addObject(destMarker);
			bLongClickUseForStartPoint = true;
		}
	}

	
		var cnts = ["rgba(209, 0, 0, 0.7)", "rgba(0, 0, 0, 0.9)", "rgba(118, 0, 161, 0.7)", "rgba(51, 221, 0, 0.7)", "rgba(17, 51, 204, 0.7)"];
		
		

	// settings for the different regions
	var region =
	{
		"EU" :
		{
			start: "Frankfurt",
			startCoordinate: new H.geo.Point(50.11208, 8.68342),
			dest: "Elly-Beinhorn-Straße Eschborn",
			destCoordinate: new H.geo.Point(50.14041, 8.57211),
			center :
			{
				lat: 50.04614777739499,
				lng: 8.613584243471905
			},
			
			lang: "en-GB"
		},
		"NA" :
		{
			start: "Causeway St, Boston, MA",
			startCoordinate: new H.geo.Point(42.365818, -71.0605927),
			dest: "Allston,Boston, MA",
			destCoordinate: new H.geo.Point(42.36268, -71.1302),
			center :
			{
				lat: 42.37758215166187,
				lng: -71.1293934179688
			},
			
			lang: "en-US"
		},
		"BR" :
		{
			start: "Praca Benedito Calixto Sao Paulo",
			startCoordinate: new H.geo.Point(-23.5591698, -46.6801682),
			dest: "Rua Roque Barbosa Lima Sao Paulo",
			destCoordinate: new H.geo.Point(-23.5910606, -46.5458107),
			center :
			{
				lat: -23.559147337720326,
				lng: -46.678417109809544
			},
			
			lang: "es-ES"
		},
		"MEA":
		{
			start: "Dubai",
			startCoordinate: new H.geo.Point(25.26952, 55.30884),
			dest: "Al ain",
			destCoordinate: new H.geo.Point(24.20733, 55.68616),
			center:
			{
				lat: 24.8041548,
				lng: 55.4198266
			},
			
			lang: "ar-AR"
		}
	};
	/*TODO*/
	// route drag marker
	var svg = '<svg height="20" width="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<circle cx="10" cy="10" r="9" stroke="black" stroke-width="2" fill="none" />' +
	'</svg>';

	var icon = new H.map.Icon(svg);
	var releaseShown = false;
	var dragRoute = [];
	var currentRoute=0,oldAlternative;
	var zindex=1000;
	
	function createDragRoutes(alternatives){
		for(var i=0;i<alternatives;i++){
		dragRoute[i]=new Object();	
		dragRoute[i].routeHoverMarker = new H.map.Marker({lat: 50.126237073013314, lng: 8.627775069326162}, {
			icon: icon,
			visibility: false,
			zIndex: 1,
			volatility: true
		});
		dragRoute[i].routeHoverMarker.draggable = true;

		map.addObject(dragRoute[i].routeHoverMarker);

		dragRoute[i].pointermoveOnRouteHoverMarker = function(evt) {
		//	console.log(currentPolyline.routeNo);
			currentPolyline.dispatchEvent(evt);
			currentPolyline.setZIndex(zindex++);
		};

		dragRoute[i].dragstartOnRouteHoverMarker = function (evt) {
			//console.log(this);
			//console.log("routeHoverMarker dragstart:: ", evt, evt.target, currentPolyline);
			currentPolyline.dispatchEvent(evt);
		};

		dragRoute[i].dragOnRouteHoverMarker = function(evt) {
			
			//console.log(evt.target);
			
			var coord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY + 8));
			evt.target.setGeometry(coord);

			currentPolyline.dispatchEvent(evt);
		};

		dragRoute[i].dragendOnRouteHoverMarker = function (evt) {
			
			currentPolyline.dispatchEvent(evt);
		};

		dragRoute[i].routeHoverMarker.addEventListener("pointermove", dragRoute[i].pointermoveOnRouteHoverMarker, false);
		dragRoute[i].routeHoverMarker.addEventListener("dragstart", dragRoute[i].dragstartOnRouteHoverMarker, true);
		dragRoute[i].routeHoverMarker.addEventListener("drag", dragRoute[i].dragOnRouteHoverMarker, false);
		dragRoute[i].routeHoverMarker.addEventListener("dragend", dragRoute[i].dragendOnRouteHoverMarker, false);
		
		
		dragRoute[i].calculateRouteParams = {
					
					
		};
	
		}

}

	/*TODO*/
	var createIcon = function (line1, line2) {
		var div = document.createElement("div");

		var div = document.createElement("div");
		var svgMarker = "";

		if(line1 != "" && line2 != "")
		{
			svgMarker = svgMarkerImage_Line;
			svgMarker = svgMarker.replace(/__line1__/g, line1);
			svgMarker = svgMarker.replace(/__line2__/g, line2);
			svgMarker = svgMarker.replace(/__width__/g, line1.length  * 4 + 57);
			svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 4 + 120);
		}
		else
		{
			svgMarker = svgMarkerBase64Image.replace(/__widthAll__/g, "60");
		}
		div.innerHTML = svgMarker;

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	};
	
	var MultiplePolyline = function (route) 
	{
		var routeInfo = {};
		var lineString = new H.geo.LineString();

		var shape = route.shape,
		waypoints = route.waypoint,
		i,
		l = shape.length,
		distance,
		hour,
		minute,
		second,
		timeleft = route.summary.baseTime;

		hour = Math.floor( timeleft / 3600 );
		minute = Math.floor( (timeleft % 3600) / 60 );
		second = Math.floor( timeleft % 60 );

		document.getElementById("time").innerHTML = "Time: " + hour + ":" + minute + ":" + second;

		if(metricSystem)
		document.getElementById("distance").innerHTML = "Distance: " + route.summary.distance / 1000 + " km";
		else
		document.getElementById("distance").innerHTML = "Distance: " + route.summary.distance *0.000621371192; + " miles";

		for(i = 0; i < l; i++)
		{
			var parts = shape[i].split(',');
			lineString.pushLatLngAlt(parts[0], parts[1]);
			for(var iW = 0,lW = waypoints.length; iW < lW; iW++){
				var wPos = waypoints[iW].mappedPosition;
				if(wPos.latitude == parts[0] && wPos.longitude == parts[1]) waypoints[iW].idxInStrip = i;
			}
		}

		var waypointMarkers = [];
		for(var iW = 0,lW = waypoints.length; iW < lW; iW++){
			var wPos = new H.geo.Point(waypoints[iW].mappedPosition.latitude, waypoints[iW].mappedPosition.longitude);
			if (!window.calcRouteTimeOutId){
				waypointMarkers.push( createWaypointMarker(wPos, wPos.lat.toFixed(5) + ", " + wPos.lng.toFixed(5), ""+(iW+1)) );
			}

		}
		routeInfo.waypointMarkers = waypointMarkers;

		//var color=  "rgba("+(Math.floor((Math.random() * 255) + 1)) + ","+ (Math.floor((Math.random() * 255) + 1)) +","+ (Math.floor((Math.random() * 255) + 1)) +","+ 1 + ")";
		var color=  "rgba(8,37,226,1)";
		dragRoute[currentRoute].polyline = new H.map.Polyline(lineString,
		{
			zIndex: 99,
			style:
			{
				lineWidth: 5,
				strokeColor: color, 
			}
		});

		dragRoute[currentRoute].polyline.routeNo=currentRoute;

		routeInfo.polyline = dragRoute[currentRoute].polyline;
		dragRoute[currentRoute].polyline.setData(routeInfo);

		for(var iW = 0,lW = waypointMarkers.length; iW < lW; iW++){
			var info = {
				idxW: iW,
				polyline: dragRoute[currentRoute].polyline,
				waypointMarkers: waypointMarkers
			};
			waypointMarkers[iW].setData(info);
		}

		dragRoute[currentRoute].polyline.draggable = true;

		dragRoute[currentRoute].polyline.setArrows({color:"#F00F",width:2,length:3,frequency: 4});

		dragRoute[currentRoute].pointerenterOnPolyline = function (evt) {
			currentPolyline = evt.target;
			currentRoute=currentPolyline.routeNo;
			var coord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY + 8));
			dragRoute[currentPolyline.routeNo].routeHoverMarker.setGeometry(coord);
			dragRoute[currentPolyline.routeNo].routeHoverMarker.setVisibility(true);
		};

		dragRoute[currentRoute].dragstartOnPolyline = function (evt) {
			
		//	console.log("dragRoute[currentRoute].dragstartOnPolyline:: ", evt);
			currentPolyline = evt.currentTarget;
			currentRoute=currentPolyline.routeNo;
			
		//	console.log(" currentRoute value : " + currentRoute);
			mapBehavior.disable();

			var viewportX = evt.pointers[0].viewportX,
			viewportY = evt.pointers[0].viewportY,
			pStrip = currentPolyline.getGeometry(),
			clipedPolyline = clipPolyline(currentPolyline, viewportX, viewportY, 8),
			foundIdxPolylineForWaypoint = false,
			partPolyline = false,

			eachStripPointFn = function(lat, lng, alt, idx) {
				if(foundIdxPolylineForWaypoint) return;
				if(partPolyline[0] == lat && partPolyline[1] == lng) {
					for(var iP=2,lP=partPolyline.length; iP<lP; iP+=2){
						var stripPoint = pStrip.extractPoint(idx+iP/2);
						if( stripPoint && stripPoint.lat==partPolyline[iP] && stripPoint.lng==partPolyline[iP+1]){
							foundIdxPolylineForWaypoint = idx;
						}
						else{
							foundIdxPolylineForWaypoint = false;
						}
					}
				}

			};
			if(clipedPolyline[0]) {
				partPolyline = clipedPolyline[0];
				pStrip.eachLatLngAlt(eachStripPointFn);
			};
			dragRoute[currentPolyline.routeNo].foundIdxPolylineForWaypoint = foundIdxPolylineForWaypoint;
		};

		dragRoute[currentRoute].dragendOnPolyline = function (evt)
		{
			mapBehavior.enable();
			currentPolyline = evt.currentTarget;
			currentRoute=currentPolyline.routeNo;

			var coord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY + 8));
			
			if(!dragRoute[currentPolyline.routeNo].foundIdxPolylineForWaypoint) 
				return;

			for(var iW = 0,allWaypoits = dragRoute[currentPolyline.routeNo].allWaypoitsForNewRoute,lW = allWaypoits.length; iW < lW; iW++){
				dragRoute[currentPolyline.routeNo].calculateRouteParams["waypoint"+iW] = 'geo!' + allWaypoits[iW].lat + "," + allWaypoits[iW].lng;
			}

			router.calculateRoute(dragRoute[currentPolyline.routeNo].calculateRouteParams, onResult, onError);

			var routeInfo = currentPolyline.getData();
			removeAllRouteObjects(routeInfo);
		};

		dragRoute[currentRoute].polyline.addEventListener("pointerenter", dragRoute[currentRoute].pointerenterOnPolyline, false);
		dragRoute[currentRoute].polyline.addEventListener("pointermove", function(evt)
		{
			currentPolyline = evt.currentTarget;
			currentRoute=currentPolyline.routeNo;
			var viewportX = evt.pointers[0].viewportX,
			viewportY = evt.pointers[0].viewportY,
			clipedPolyline = clipPolyline(currentPolyline, viewportX, viewportY, 8),
			coord = map.screenToGeo(viewportX, (viewportY + 8));

			if(clipedPolyline.length == 0) {
				dragRoute[currentPolyline.routeNo].routeHoverMarker.setVisibility(false);
				return;
			}

			dragRoute[currentPolyline.routeNo].routeHoverMarker.setGeometry(coord);
		}, false);

		dragRoute[currentRoute].polyline.addEventListener("dragstart", dragRoute[currentRoute].dragstartOnPolyline, false);
		dragRoute[currentRoute].polyline.addEventListener("drag", function(evt)
		{
			// console.log("drag polyline:: ", evt, waypoints);
			currentPolyline = evt.currentTarget;	
			currentRoute=currentPolyline.routeNo;				
			var coord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY + 8)),
				newWpIdx = false;

			if(!dragRoute[currentPolyline.routeNo].foundIdxPolylineForWaypoint) return;

			dragRoute[currentPolyline.routeNo].allWaypoitsForNewRoute = [];

			for(var iW = 0,lW = waypoints.length; iW < lW; iW++){
				var wPos = waypoints[iW].mappedPosition;
				dragRoute[currentPolyline.routeNo].allWaypoitsForNewRoute.push(new H.geo.Point(wPos.latitude, wPos.longitude));
				if(dragRoute[currentPolyline.routeNo].foundIdxPolylineForWaypoint > waypoints[iW].idxInStrip && waypoints[iW+1] && dragRoute[currentPolyline.routeNo].foundIdxPolylineForWaypoint < waypoints[iW+1].idxInStrip){
					dragRoute[currentPolyline.routeNo].allWaypoitsForNewRoute.push(coord);
					newWpIdx = iW+1;
				}
			}
			calculateSampleRoute(dragRoute[currentPolyline.routeNo].allWaypoitsForNewRoute, newWpIdx);

		}, false);
		dragRoute[currentRoute].polyline.addEventListener("dragend", dragRoute[currentRoute].dragendOnPolyline, false);


		polylineLayer.addObject(dragRoute[currentRoute].polyline);

		if (window.tmpPolyline){
			try{
				polylineLayer.removeObject(window.tmpPolyline);
			}catch(e){}

			window.tmpPolyline = false;
		}
		if(window.calcRouteTimeOutId) window.tmpPolyline = dragRoute[currentRoute].polyline;


		var fence = new H.map.Polyline(lineString,
		{
			style:
			{
				lineColor: color,
				lineWidth: 80
			}
		});

		fenceLayer.addObject(fence);

		clearTimeout(window.calcRouteTimeOutId);
		window.calcRouteTimeOutId = false;
	}

	var calculateRoute = function(wPoints)
	{
		if(wPoints.length == 2 && (!wPoints[0] || !wPoints[1])) return;

		var e = document.getElementById("routeOption");
		var routeOption = e.options[e.selectedIndex].value;

		var mode = routeOption + ";";
		mode += document.getElementById('useCar').checked ? "car;" : "truck;"
		mode += 'traffic:';

		e = document.getElementById('traffic');
		var tr = e.options[e.selectedIndex].value;

		mode += tr + ";";
		mode += 'tollroad:' + document.getElementById("tollroads").value + ',';
		mode += 'motorway:' + document.getElementById("motorways").value + ',';
		mode += 'boatFerry:' + document.getElementById("boatFerries").value + ',';
		mode += 'railFerry:' + document.getElementById("railFerries").value + ',';
		mode += 'tunnel:' + document.getElementById("tunnels").value + ',';
		mode += 'dirtRoad:' + document.getElementById("dirtRoads").value;

		trailersCount = document.getElementById('trailersCount').value;

		var tunnelCategory = "";
		
		var hazard = new Array();

		if(document.getElementById('combustible').checked)
		{
			hazard.push("combustible");
			tunnelCategory = "D";
		}
		if(document.getElementById('organic').checked)
		{
			hazard.push("organic");
			tunnelCategory = "D"; 
		}
		if(document.getElementById('poison').checked)
		{
			hazard.push("poison");
			tunnelCategory = "D";
		}
		if(document.getElementById('radioActive').checked)
		{
			hazard.push("radioActive");
			tunnelCategory = "D";
		}
		if(document.getElementById('corrosive').checked)
		{
			hazard.push("corrosive");
			tunnelCategory = "D";
		}
		if(document.getElementById('poisonousInhalation').checked)
		{
			hazard.push("poisonousInhalation");
			tunnelCategory = "D";
		}
		if(document.getElementById('harmfulToWater').checked)
		{
			hazard.push("harmfulToWater");
			tunnelCategory = "D"; 
		}
		if(document.getElementById('other').checked)
		{
			hazard.push("other");
			tunnelCategory = "D";
		}
		
		if(document.getElementById('gas').checked)
		{
			hazard.push("gas");
			if(tunnelCategory != "D")
				tunnelCategory = "E";
		}
		if(document.getElementById('flammable').checked)
		{
			hazard.push("flammable");
			tunnelCategory = "C";
		}
		if(document.getElementById('explosive').checked)
		{
			hazard.push("explosive");
			tunnelCategory = "B";
		}
		
		hazard = hazard.join(",");

		var lWeight = parseFloat(document.getElementById("limitedWeight").value);
		var aWeight = parseFloat(document.getElementById("weightPerAxel").value);
		var h = parseFloat(document.getElementById("height").value);
		var w = parseFloat(document.getElementById("width").value);
		var l = parseFloat(document.getElementById("length").value);

		alternatives = parseFloat(document.getElementById("alt").value);
		if(oldAlternative != alternatives){
			createDragRoutes(alternatives);
			oldAlternative=alternatives;
		}

		if(isNaN(lWeight)) lWeight = 0;
		if(isNaN(aWeight)) aWeight = 0;
		if(isNaN(h)) h = 0;
		if(isNaN(w)) w = 0;
		if(isNaN(l)) l = 0;

		
		var e = document.getElementById("metric");
		var isMetric = e.options[e.selectedIndex].value;
		
		if (isMetric == 1) {
			metricSystem = true;
		}
		else{
			metricSystem = false;
		}
		
		if(!metricSystem)
		{
			h /= 3.2808;
			w /= 3.2808;
			l /= 3.2808;
		}

		if(wPoints.length>2){
			alternatives =1;
		}
		
		dragRoute[currentRoute].calculateRouteParams = {
				'app_code': app_code,
				'app_id': app_id,
				'mode': mode,
				'language': lang,
				'representation' : 'overview',
				'metricSystem' : metricSystem ? "metric" : "imperial",
				'routeattributes' : 'wp,sc,sm,sh,bb,lg,no,shape',
				'legattributes' : 'wp,mn,li,le,tt',
				'maneuverattributes' : 'po,sh,tt,le,ti,li,pt,pl,rn,nr,di',
				'linkattributes' : 'sh,le,sl,ds,tr',
				'instructionformat' : 'html',
				'shippedhazardousgoods' : hazard,
				'tunnelCategory' : tunnelCategory,
				'trailersCount' : trailersCount,
				'alternatives' : alternatives-1				
			};
		
		
		for(var iW=0,lW=wPoints.length; iW < lW; iW++){
			dragRoute[currentRoute].calculateRouteParams['waypoint'+iW] = 'geo!' + wPoints[iW].lat + "," + wPoints[iW].lng;
		}

		var calculateRouteParams = dragRoute[currentRoute].calculateRouteParams;
		

		if(lWeight > 0)
		calculateRouteParams.limitedWeight = lWeight;
		if(aWeight > 0)
		calculateRouteParams.weightPerAxle = aWeight;
		if(h > 0)
		calculateRouteParams.height = h;
		if(w > 0)
		calculateRouteParams.width = w;
		if(l > 0)
		calculateRouteParams.length = l;

		router.calculateRoute(calculateRouteParams, onResult, onError);
	};
	
	var onResult = function(result) {
		if(!result.response || !result.response.route || !result.response.route[0]) 
			return;
		
		if(releaseShown != true){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+result.response.metaInfo.moduleVersion;
			releaseShown = true;
		}
			
		for(var i=0; i<result.response.route.length; i++){
			currentRoute=i;
			MultiplePolyline(result.response.route[i]);
		}
			
		currentRoute=0;
		
	};
	
	var onError = function(error)
	{
		console.log(error);
	};

	var createWaypointMarker = function(geocoord, info1, info2) {
		info1 = info1 ? info1 : "";
		info2 = info2 ? info2 : "";

		var marker = new H.map.Marker({lat: geocoord.lat, lng: geocoord.lng}, {
			icon: createIcon(info1, info2),
			volatility: true
		});
		marker.draggable = true;
		marker.addEventListener("dragstart", 
			function(evt){
				mapBehavior.disable();
			}, false);

		marker.addEventListener("drag", function(evt){

			var curMarker = evt.currentTarget,
			coord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY));

			curMarker.setGeometry(coord);
			var	routeInfo = curMarker.getData(),
				waypointMarkers = routeInfo.waypointMarkers,
				waipoints = [];

			for(var iW=0,lW=waypointMarkers.length; iW<lW; iW++){
				waipoints.push(waypointMarkers[iW].getGeometry());
			}
			calculateSampleRoute(waipoints, routeInfo.idxW);
		}, false);

		marker.addEventListener("dragend", function(evt){
			mapBehavior.enable();

			var curMarker = evt.currentTarget;
			var coord = map.screenToGeo((evt.pointers[0].viewportX ), (evt.pointers[0].viewportY ));

			curMarker.setGeometry(coord);

			var routeInfo = curMarker.getData();
			var waypointMarkers = routeInfo.waypointMarkers;
			var wPoints = [];

			for(var iW=0,lW=waypointMarkers.length; iW<lW; iW++){
				var wPos = waypointMarkers[iW].getGeometry();
				wPoints.push(waypointMarkers[iW].getGeometry());
			}
			calculateRoute(wPoints);
			removeAllRouteObjects(routeInfo);

		}, false);

		// Add marker to the markerLayer, to make it visible on the map
		markerLayer.addObject(marker);

		map.getViewModel().setLookAtData({
			bounds: markerLayer.getBoundingBox()
		});

		return marker;
	};

	var removeAndStartRouting = function()
	{
		if (document.getElementById('showMultipleRoutes').checked) {
			clrcnt++;
			if(clrcnt >= 5)
			{
				markerLayer.removeObject(markerLayer.getObjects()[0]);
				markerLayer.removeObject(markerLayer.getObjects()[0]);
				polylineLayer.removeObject(polylineLayer.getObjects()[0]);
				fenceLayer.removeObject(fenceLayer.getObjects()[0]);
				clrcnt = 0;
			}
		} else {
			markerLayer.removeAll();
			polylineLayer.removeAll();
			fenceLayer.removeAll();

			clrcnt = 0;
		}

		var from = document.getElementById('input-from').value,
		to = document.getElementById('input-to').value,
		gFrom, gTo;

		if(from && to) {
			gFrom = null;
			gTo = null;

			geocoder.search({searchText: from}, function(result) {

				//add Geocoder Release information if not already done
				if (releaseGeocoderShown== false){
					loadGeocoderVersionTxt();
					releaseGeocoderShown = true;
				}
				if(result.Response.View[0].Result[0].Location != null)
				{
					gFrom = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					gFrom = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				}
				gFrom.lat = gFrom.Latitude;
				gFrom.lng = gFrom.Longitude;

				//createWaypointMarker(gFrom);
				calculateRoute([gFrom, gTo]);
			}, function(){});

			geocoder.search({searchText: to}, function(result) {
				//add Geocoder Release information if not already done
				if (releaseGeocoderShown== false){
					loadGeocoderVersionTxt();
					releaseGeocoderShown = true;
				}
				if(result.Response.View[0].Result[0].Location != null)
				{
					gTo = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					gTo = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				}
				gTo.lat = gTo.Latitude;
				gTo.lng = gTo.Longitude;

				//createWaypointMarker(gTo);
				calculateRoute([gFrom, gTo]);
			}, function(){});
		}
	};

	var removeAllRouteObjects = function(routeInfo){
		try{
			polylineLayer.removeObject(routeInfo.polyline);
		}catch(e){}


		for(var iW = 0,lW = routeInfo.waypointMarkers.length; iW<lW; iW++){
			try{
				markerLayer.removeObject(routeInfo.waypointMarkers[iW]);
			}catch(e){}
		}
	};

	var clipPolyline = function(polyline, viewportX, viewportY, bboxSize){
		var	pleft = viewportX - bboxSize,
		pright = viewportX + bboxSize,
		ptop = viewportY - bboxSize,
		pbottom = viewportY + bboxSize,
		coordLeftTop = map.screenToGeo(pleft, ptop),
		coordRigthBottom = map.screenToGeo(pright, pbottom),
		rect = new H.geo.Rect(coordLeftTop.lat,coordLeftTop.lng,coordRigthBottom.lat,coordRigthBottom.lng),
		clipedPolyline = polyline.clip(rect);

		return clipedPolyline;
	};

	var calculateSampleRoute = function(waipoints, idxW){
		var prevW = idxW-1,
		nextW = idxW+1;

		window.tempwPoints = [];
		if(prevW >= 0) window.tempwPoints.push(waipoints[prevW]);
		window.tempwPoints.push(waipoints[idxW]); //current
		if(nextW < waipoints.length) window.tempwPoints.push(waipoints[nextW]);

		if(!window.calcRouteTimeOutId){
			window.calcRouteTimeOutId = setTimeout(
			function(){
				calculateRoute(window.tempwPoints);
			},
			200
			);
		}

		//console.log("waypoint drag :: ", evt  );

	};

	var truckOverlayProvider = new H.map.provider.ImageTileProvider({
		label: "Tile Info Overlay",
		descr: "",
		min: 8,
		max: 20,
		getURL: function( col, row, level )
		{
			server_rr++;
			if(server_rr > 4)
			server_rr = 1;
			return ["https://",
			server_rr,
			".base.maps.api.here.com/maptile/2.1/truckonlytile/newest/normal.day/",
			level,
			"/",
			col,
			"/",
			row,
			"/256/png8",
			"?style=fleet",
			"&app_code=",
			app_code,
			"&app_id=",
			app_id
			].join("");
		}
	});

	var truckOverlayLayer = new H.map.layer.TileLayer(truckOverlayProvider);

	var handleTransport = function(cb)
	{
		if(cb.checked)
		map.addLayer(truckOverlayLayer);
		else
		map.removeLayer(truckOverlayLayer);
	};

	var TrafficOverlay = new H.map.provider.ImageTileProvider({
		label: "TrafficOverlay",
		descr: "Here TrafficOverlay",
		min: 8,
		max: 20,
		getURL: function( col, row, level) {
			server_rr++;
			if(server_rr > 4)
			server_rr = 1;
			return ["https://",
			server_rr,
			".traffic.maps.api.here.com/maptile/2.1/flowtile/newest/normal.day/",
			level,
			"/",
			col,
			"/",
			row,
			"/256/png8",
			"?app_code=",
			app_code,
			"&app_id=",
			app_id
			].join("");
		}
	});

	var trafficOverlayLayer = new H.map.layer.TileLayer(TrafficOverlay);

	var handleTraffic = function(cb)
	{
		if(cb.checked)
		map.addLayer( trafficOverlayLayer );
		else
		map.removeLayer( trafficOverlayLayer );
	};

	var handleFence = function(cb)
	{
		//console.log(fenceLayer.getObjects()[0].isClosed());
		
		if(cb.checked)
		map.addObject( fenceLayer );
		else
		map.removeObject( fenceLayer );
	};

	var switchRegion = function(reg)
	{
		console.log(reg)
		cfg = region[reg];
		map.setCenter(new H.geo.Point(cfg.center.lat, cfg.center.lng));
		document.getElementById("input-from").value = cfg.start;
		document.getElementById("input-to").value = cfg.dest;
		metricSystem = cfg.metric;
		language = cfg.lang;
		start = cfg.startCoordinate;
		destination = cfg.destCoordinate;
		markerLayer.removeAll();
		removeAndStartRouting();
	};

	switchRegion("EU");

	function startCapture()
	{
		capture(map, ui);
	}

	function capture(map, ui) {
		// Capturing area of the map is asynchronous, callback function receives HTML5 canvas
		// element with desired map area rendered on it.
		// We also pass a H.ui.UI reference in order to see the ScaleBar in the result.
		// If dimensions are omitted, whole map will be captured, from top left corner up to
		// the bottom right.
		map.capture(function(canvas) {
			if (canvas) {
				snapshotContainer.innerHTML = '';
				snapshotContainer.appendChild(canvas);
				window.open(canvas.toDataURL());
				} else {
				// For example when map is in Panorama mode
				alert('Capturing is not supported');
			}
		}, [ui], 0, 0, document.getElementById("mapContainer").offsetWidth, document.getElementById("mapContainer").offsetHeight);
	}