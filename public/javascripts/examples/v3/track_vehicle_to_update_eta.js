/*
		(C) HERE 2018 - 2019
		Authors Dominique Schuette, Ivana Arsenijevic
	*/
	
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);	// Check whether the environment should use hi-res maps
	var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection
	var platform = new H.service.Platform({ app_id: app_id_cors, app_code: app_code_cors, useHTTPS: secure }); // Create a platform object to communicate with the HERE REST APIs
	var defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);	
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, { center: center, zoom: zoom, pixelRatio: hidpi ? 2 : 1 }); // Instantiate a map in the 'map' div, set the base map to normal

	var objContainer = new H.map.Group();
	map.addObject(objContainer);
	
	var warningsContainer = new H.map.Group();
	map.addObject(warningsContainer);
	
	var creWarningsContainer = new H.map.Group();
	map.addObject(creWarningsContainer);

	var mapevents = new H.mapevents.MapEvents(map);	// Enable the map event system
	var behavior  = new H.mapevents.Behavior(mapevents);	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var ui        = H.ui.UI.createDefault(map, defaultLayers); // Enable the default UI
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	// read the HTML page URL parameters
	var htmlPageUrlParameters = [];
	location.search.replace("?","").split("&").forEach( function(nameValue) { nv = nameValue.split("="); htmlPageUrlParameters[nv[0]] = nv[1]; } );

	var endPointUrl = document.getElementById('endpoint-text-input').value;
	var useAppId = app_id_cors;
	var useAppCode = app_code_cors;
	if (htmlPageUrlParameters.endpointurl) {
		endPointUrl = htmlPageUrlParameters.endpointurl;
		document.getElementById('endpoint-text-input').value = htmlPageUrlParameters.endpointurl;
	}
	if (htmlPageUrlParameters.app_id) useAppId = htmlPageUrlParameters.app_id;
	if (htmlPageUrlParameters.app_code) useAppCode = htmlPageUrlParameters.app_code;
	if (htmlPageUrlParameters.learnId) {
		document.getElementById('learnId').value = htmlPageUrlParameters.learnId;
	}
	var defaultCalcRouteParams = "/2/calculateroute.json?routeMatch=2&mode=fastest;truck;traffic:disabled&driver_cost=30&app_id=" + useAppId + "&app_code=" + useAppCode;
	var ROUTER_URL = endPointUrl + defaultCalcRouteParams;

	var restTimeParams;	           // parameter to be added to the calculate route for rest times
	var currentId             = 0; // id of the tracepoint where user clicked = simulated point on the route that was driven so far
	var	firstTimestamp        = 0;
	var currentTimestamp      = 0;
	var lastTimestamp         = 0; 
	var breaksDuration        = 0; // total duration of all RME-detected breaks for the entire trace
	var currentBreaksDuration = 0; 
	var restTimeDuration      = 0;
	var plannedWaypoints       = new Array();
	var uTurn                 = false;
	var truckRoutingUrl       = undefined;
	var tracePoints;
    var COLORS  = ["rgba(18, 65, 145, 0.7)", "#999900"];
	var simulatingDrive = 0;

	var loadFromFile = function (filename) {
		var req = new XMLHttpRequest();
		req.open('GET', '/sample_data/' + filename);
		req.onreadystatechange = function() {
			if (req.readyState != XMLHttpRequest.DONE) return;
			document.getElementById('waypointsarea').value = '';
			document.getElementById('tracefilearea').value = req.responseText;
			submitTrace(req.responseText);
		}
		req.send();
	}
	
	function submitTrace(traceFile) {
		var urlRoutingReq = endPointUrl + "/2/calculateroute.json?routeMatch=1&mode=fastest;truck;traffic:disabled"+ "&app_id=" + useAppId + "&app_code=" + useAppCode;;
	    var addParams = document.getElementById('addParams').value;
	    if (addParams) urlRoutingReq += addParams;
		getJSONP(urlRoutingReq, gotRouteMatchResponse, traceFile, true);
	}

	var gotRouteMatchResponse = function (respJsonObj) {
		
		clearAll();
		objContainer.removeAll();
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			toggleReverseGeocodeWithHeading = toggleCheckboxesError;
			toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;
			return;
		}
		// draw the route
		var routeLinks = routeLinks = respJsonObj.response.route[0].leg[0].link;;

		if(routeLinks !== undefined && routeLinks[0] !== undefined && routeLinks[0].shape !== undefined)
		{
			var shapeSplit = routeLinks[0].shape;
			startCoord = new H.geo.Point(parseFloat(shapeSplit[0]), parseFloat(shapeSplit[1]));
		}
		for (var l = 0; l < routeLinks.length; l++) {
			var coords1 = routeLinks[l].shape;
			var coords2 = new H.geo.Strip();
			if (routeLinks[l].offset && routeLinks[l].offset < 1) {
				if (routeLinks[l].linkId < 0){
					distance = (1 - routeLinks[l].offset) *  routeLinks[l].length; //if  offset is set calculate new length of the link, caclulateroute.json resource returns back the link length in the length json field while matchroute.json returns it in linkLength
				} else {
					distance = routeLinks[l].offset * routeLinks[l].length; //if  offset is set calculate new length of the link
				}
				coords1 = getCoordsWithOffset(coords1, distance, l, routeLinks.length);
			} 
			for (var c = 0; c < coords1.length; c += 2){
				coords2.pushLatLngAlt(coords1[c], coords1[c+1], null); //if it is not offset link, just add new point
			}

			var linkPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: COLORS[0], lineJoin: "round"}});
			objContainer.addObject(linkPolyline);
		}
		// lookup actual trace driving time, and trace driving time until to the selected point
		tracePoints = respJsonObj.response.route[0].waypoint;
		firstTimestamp   = tracePoints[0                     ].timestamp;
		currentTimestamp = tracePoints[tracePoints.length - 1].timestamp;
		if (lastTimestamp == 0) lastTimestamp = currentTimestamp;
		
		//adding first and last trace points to the planned stops 
		firstTracePointCoords  = tracePoints[0                     ].mappedPosition;
		lastTracePointCoords   = tracePoints[tracePoints.length - 1].mappedPosition;
		if (document.getElementById('waypointsarea').value == '') { // if user didn't define start & destination, then fetch it from the trace
			document.getElementById('waypointsarea').value = 'SEQNR,\tLATITUDE,\tLONGITUDE\n' +
															 '0,\t' + firstTracePointCoords.latitude + ",\t" + firstTracePointCoords.longitude + "\n" +
															 '1,\t' + lastTracePointCoords.latitude + ",\t" + lastTracePointCoords.longitude + "\n";
		}
		updateWaypoints();
		
		// add warnings message for stops
		
        if (respJsonObj.response.warnings){
        
        var warnings = respJsonObj.response.warnings;
            for (var w = 0; w < warnings.length; w++) {
                if (warnings[w].message && warnings[w].tracePointSeqNum !== -1) {
                    var tracePointSeqNum = warnings[w].tracePointSeqNum;
                    if (tracePointSeqNum && tracePointSeqNum < tracePoints.length) { //get trace point coordinates and add warning icon on the map
    					var tracePoint = tracePoints[tracePointSeqNum];
                        var point = new H.geo.Point(parseFloat(tracePoint.mappedPosition.latitude), parseFloat(tracePoint.mappedPosition.longitude));
                        if (tracePoint.breakDuration) breaksDuration += tracePoint.breakDuration;
                        var warningObj = new Warning(warnings[w], tracePoint.breakDuration);
                        var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
                        warningsContainer.addObject(marker);
                    }    
                }
            }
        } 
  
		//check matchedVehicleType to possbily modify routing mode when drag/drop the trace into the textarea
		if(respJsonObj.response.route[0].matchedVehicleType && respJsonObj.response.route[0].matchedVehicleType.length > 0){
			// if we guess it was a truck
			if(respJsonObj.response.route[0].matchedVehicleType[0].type == 'truck'){
				truckRoutingUrl = ROUTER_URL;
				var subType = respJsonObj.response.route[0].matchedVehicleType[0].subType? respJsonObj.response.route[0].matchedVehicleType[0].subType : 'light';
				var truckSpec;
				switch(subType) {
					case 'light':
						truckSpec = "&limitedWeight=5t";
						break;
					case 'medium':
						truckSpec = "&limitedWeight=15t";
						break;
					case 'heavy':
						truckSpec = "&limitedWeight=25t";
						break; 
				}
				if(truckSpec){
					if(truckRoutingUrl.search(/;car;/) != -1)
						truckRoutingUrl = truckRoutingUrl.replace(/;car;/,";truck;");
					if(truckRoutingUrl.search(/&limitedWeight/) == -1) // if &limitedWeight is not specified yet
						truckRoutingUrl = truckRoutingUrl.concat(truckSpec);
				}
			}
		}
		
        map.setViewBounds(objContainer.getBounds());
		document.getElementById("routingRespText").innerHTML = "CRE URL: <br>" + (truckRoutingUrl ? truckRoutingUrl : ROUTER_URL);
		var realDrivingTime = Math.floor((lastTimestamp - firstTimestamp) / 1000);
		var realBreaksTime  = Math.floor(breaksDuration                   / 1000);
		document.getElementById("fullTraceElapsedTime"   ).innerHTML = gettime(                 realDrivingTime);
		document.getElementById("fullTraceSumStopTimes"  ).innerHTML = gettime(realBreaksTime                  );
		document.getElementById("fullTraceNetDrivingTime").innerHTML = gettime(realDrivingTime - realBreaksTime);
		
		var slider = document.getElementById('slider');
		slider.setAttribute("max", tracePoints.length - 1);
		slider.value = 0;
		slider.onchange = function() {
			currentId = this.value;
			populateFieldsWhenNewPositionSelected(currentId);
		}
	}
	
	function removeLimitedWeight(router_endpoint){
		if(router_endpoint.search(/&limitedWeight=/) != -1){
			var idx = router_endpoint.search(/&limitedWeight=/);
			var startIdx = idx;
			idx += '&limitedWeight='.length;
			while(router_endpoint.charAt(idx) != '&' && router_endpoint.charAt(idx) != '')
				idx++;
			router_endpoint = router_endpoint.replace(router_endpoint.substring(startIdx, idx), '');
		}
		return router_endpoint;
	}
	
	var getCoordsWithOffset = function (coords1, distance, currentLink, numberOfLinks){
		
		var temp = [];
		var prevCoord = [coords1[0], coords1[1]];
		for (var c = 0; c < coords1.length; c += 2){
			var linkLength = calculateDistance(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1]);  //calculate distance to the next point           // if this is a link with offset, do calculations for the offset
			if ((distance - linkLength) < 0) {        //if offset is not reached add new point
				// var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], linkLength - distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
				var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
				var midPointIndex = c;
		    	break;
		    } else {
			    distance = distance - linkLength;
			}
			prevCoord[0] = coords1[c];
			prevCoord[1] = coords1[c + 1];
		}
		if(!midPoint) {
			var midPoint = getMidPoint(coords1[coords1.length - 4], coords1[coords1.length - 3], coords1[coords1.length - 2], coords1[coords1.length - 1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
			var midPointIndex = coords1.length - 2;
		}
		if (currentLink == 0 || uTurn){
			if (uTurn) uTurn = false;	
			temp.push(String(midPoint[0]));
			temp.push(String(midPoint[1]));
			for (var c = midPointIndex; c < coords1.length; c += 1){
				temp.push(coords1[c]);
			}
		} else {                                         
			if (currentLink != numberOfLinks-1) uTurn = true;         
			for (var c = 0; c < midPointIndex; c += 1){
				temp.push(coords1[c]);
			}
			temp.push(midPoint[0]);
			temp.push(midPoint[1]);
		}
		return temp;
	}

    var getMidPoint = function(lat1, lon1, lat2, lon2, distance)
    {
    	 /* var lon = ratio*lon1 + (1.0 - ratio)*lon2;
    	  var lat = ratio*lat1 + (1.0 - ratio)*lat2;*/
    	  
	      var heading = getHeading(lat2,lon2,lat1,lon1);
    	  var shiftedLatLon = shiftLatLon(lat1, lon1, ((parseFloat(heading) + 180) % 360), distance);  // only 180 degrees to go into the opposite direction
    	  
	    return shiftedLatLon;
    }
    
  	function getHeading(lat1,lng1,lat2,lng2)
	{
		var phi1 = lat1 * (Math.PI / 180),
			phi2 = lat2 * (Math.PI / 180),
			dl = (lng2 - lng1) * (Math.PI / 180),
			y = Math.sin(dl) * Math.cos(phi2),
			x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl),
			t = Math.atan2(y, x);

		return Math.round(((t * 180 / Math.PI) + 360) % 360);
	};
	
	function shiftLatLon(latDegrees, lonDegrees, bearing, distance)	// shift coordinate along given bearing to the given distance
	{
		var earthRadius = 6371000;
		var latRad = (latDegrees) * Math.PI / 180; // convert input parameters from decimal degrees into radians
		var lonRad = (lonDegrees) * Math.PI / 180;
		var bearingRad = bearing * Math.PI / 180;
		var distRad = distance / earthRadius;
		var latNewRad = Math.asin(Math.sin(latRad) * Math.cos(distRad) + Math.cos(latRad) * Math.sin(distRad) * Math.cos(bearingRad));
		var lonNewRad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distRad) * Math.cos(latRad), Math.cos(distRad) - Math.sin(latRad) * Math.sin(latNewRad));
		var latNewDegrees = latNewRad * 180 / Math.PI; // convert back from radians into decimal degrees
		var lonNewDegrees = lonNewRad * 180 / Math.PI;
		var latLonRet = [];
		latLonRet.push(latNewDegrees);
		latLonRet.push(lonNewDegrees);
		return latLonRet;
	}
	
	document.getElementById('tracefilearea').addEventListener('dragover', function handleDragOver(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			evt.dataTransfer.dropEffect = 'copy';
		},
		false
	);
	
	document.getElementById('tracefilearea').addEventListener('drop', function(evt) {
		    evt.stopPropagation();
		    evt.preventDefault();
		    var files = evt.dataTransfer.files;
		    var file = files[0];
		    var r = new FileReader();
		    r.onload = function(e) { 
		    	document.getElementById('tracefilearea').value = r.result;
			    submitTrace(r.result);
		    }
		    r.readAsText(file);
		},
		false
	);
	
	document.getElementById('waypointsarea').addEventListener('dragover', function handleDragOver(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			evt.dataTransfer.dropEffect = 'copy';
		},
		false
	);

	document.getElementById('waypointsarea').addEventListener('drop', function(evt) {
		    evt.stopPropagation();
		    evt.preventDefault();
		    var files = evt.dataTransfer.files;
		    var file = files[0];
		    var r = new FileReader();
		    r.onload = function(e) { 
		    	document.getElementById('waypointsarea').value = r.result;
		    	updateWaypoints();
		    }
		    r.readAsText(file);
	    },
	    false
	);

	map.addEventListener('dbltap', function (currentEvent) {
			var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
			currentId = getClosestPointOnRoute(lastClickedPos, tracePoints);
			populateFieldsWhenNewPositionSelected(currentId);
			document.getElementById('slider').value = currentId;
		},
		false
	);
	
	function nextTracepoint(){
	if (currentId < tracePoints.length - 1){
		currentId++;
		populateFieldsWhenNewPositionSelected(currentId);
		document.getElementById('slider').value = currentId;
	 }
	}
	
	function previousTracepoint(){
	if (currentId > 0){
		currentId--;
		populateFieldsWhenNewPositionSelected(currentId);
		document.getElementById('slider').value = currentId;
	 }
	}

	function simulateDriveStart(){
		if (currentId >= tracePoints.length - 2) return; // we don't simulate the arrival, because it would learn the stops each time
		simulatingDrive = 1;
		populateFieldsWhenNewPositionSelected(currentId);
		document.getElementById('slider').value = currentId;
	}

	function simulateDriveNext(){
		if (currentId >= tracePoints.length - 2) { // we don't simulate the arrival, because it would learn the stops each time
			simulatingDrive = 0;
		} else {
			currentId++;
			populateFieldsWhenNewPositionSelected(currentId);
			document.getElementById('slider').value = currentId;
		}
	}

	function simulateDriveStop(){
		simulatingDrive = 0;
	}
	 
	map.addEventListener('contextmenu', function(evt) { //right clicked into the map -> add this coordinate as predefined waypoint
		var coord = map.screenToGeo(evt.viewportX, evt.viewportY);
		var waypointsArea = document.getElementById('waypointsarea');
		var header1 = ['LATITUDE','LONGITUDE'].join(",\t");
		var header2 = ['SEQNR','LATITUDE','LONGITUDE'].join(",\t");
		var header = header1;
		if (waypointsArea.value == "")	waypointsArea.value = header2;
		var strLines = waypointsArea.value.trim().split(/\r*\n/);
		var numCoords = strLines.length;
		var hasSqnNum = strLines[0].split(",").length > 2;
		var newWp = [coord.lat, coord.lng];
		var newWpStr = [coord.lat, coord.lng].join(",");
		if (hasSqnNum){
			newWpStr = [""].concat(newWp).join(",");
			header = header2;
		}
		if(numCoords >= 2){
			strLines.splice(numCoords-1, 0, newWpStr); //insert a waypoint before a last one
		}else{
			strLines = strLines.concat(newWpStr);
		}
		strLines.splice((numCoords+1) * -1 , 1); //first delete a header before normalize the coordinates
		strLines = strLines.map((wp, idx) => {
			return wp.split(",").map((clmn, idxC) => {
				if(hasSqnNum && idxC == 0){
					return idx;
				}else{
					return parseFloat(clmn.trim()).toFixed(6);
				}
			}).join(",\t");
		});
		strLines.splice(0, 0, header); //add header
		waypointsArea.value = strLines.join("\n");
		updateWaypoints();
   }, false);


	/**
    	This method is called when current position on the route is changed. 
    */
	var populateFieldsWhenNewPositionSelected = function (currentId){
	
		//--- when new position on the route as a start is selected trace file must be adjusted and waypoints updated
	    // position can be set by tapping on the route, or by moving the slider
		objContainer.removeAll();
		warningsContainer.removeAll();
	    for (var i = 0; i < plannedWaypoints.length; i++) {	
			plannedWaypoints[i].status = "not visited";
		}
		var traceFilePart = getTraceFileUpToPoint(currentId, tracePoints);
		calculateRoute(traceFilePart, currentId);
	}
	
	var updateWaypoints = function (){
		plannedWaypoints = [];
		var waypointsArea = document.getElementById('waypointsarea').value;
		var waypointLines = waypointsArea.split("\n");
		for (i=0; i < waypointLines.length; i++){
			if (waypointLines[i].includes("LATITUDE") || waypointLines[i] === "")	continue;
			var waypoint = waypointLines[i].split(",");
			if (waypoint.length != 3 && waypoint.length != 2) alert("Please provide correct format of the planned stops:\n LATITUDE, LONGITUDE");
			var p;
			if (waypoint.length == 3){
				p = {id: waypoint[0].trim(), lat: parseFloat(waypoint[1].trim()).toFixed(6), lon: parseFloat(waypoint[2].trim()).toFixed(6), status: "not visited"};
			}else if (waypoint.length == 2){
				p = {id: plannedWaypoints.length, lat: parseFloat(waypoint[0].trim()).toFixed(6), lon: parseFloat(waypoint[1].trim()).toFixed(6), status: "not visited"};	
			}
			plannedWaypoints.push(p);
			objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon("#424949", p.status, p.id)}));
		}
	}

	/**
		Updates the endpoint URL from input text field
	*/
	var updateEndpointUrl = function () {
		endPointUrl = document.getElementById('endpoint-text-input').value;
		ROUTER_URL = endPointUrl + defaultCalcRouteParams;
	}

	/**
	This method calculates the closest point on the route to the clicked point on the map
    */
	var getClosestPointOnRoute = function(lastClickedPos, tracePoints) {
		
		var distance = null;
		var idLastTracePoint = 0;
		for (var i=0; i < tracePoints.length; i++){
			var currDistance = calculateDistance(tracePoints[i].mappedPosition.longitude,tracePoints[i].mappedPosition.latitude, lastClickedPos.lng, lastClickedPos.lat);
			if (distance == null || currDistance < distance){
				distance = currDistance;
				idLastTracePoint = i;
			}
		}
		return idLastTracePoint;
	}
	
	/**
	  * Return the trace file up to the currently selected point. 
     */
	var getTraceFileUpToPoint = function (idLastTracePoint, tracePoints) {

		var traceFilePart = 'LATITUDE,\tLONGITUDE,\tTIMESTAMP\n';
		for (var i=0; i<= idLastTracePoint; i++){
			if (i == 0)
			traceFilePart += tracePoints[i].mappedPosition.latitude + ",\t" + tracePoints[i].mappedPosition.longitude + ",\t" + new Date(tracePoints[i].timestamp).toISOString();
			else
		    traceFilePart += "\n" + tracePoints[i].mappedPosition.latitude + ",\t" + tracePoints[i].mappedPosition.longitude + ",\t" + new Date(tracePoints[i].timestamp).toISOString();	
		}
		return traceFilePart;
	}
	

	/**
		This method calculates the distance (roughly)  between two points in meters
	 */
	function calculateDistance(lon1,lat1,lon2,lat2){
		
		var dGridSizeXReduction = Math.abs(Math.cos(lat1 * Math.PI / 180.0 ));
		var dMinDist2 = (lon1 - lon2) * (lon1 - lon2) * dGridSizeXReduction * dGridSizeXReduction + (lat1 - lat2) * (lat1 - lat2);	
		return Math.sqrt(dMinDist2) * 100000.0 * 1.113238715696961;
	}
	
	function calculateAirlineDistanceToDest(dLat1, dLon1, dLat2, dLon2, dLat, dLon){
		
		var dGridSizeXReduction = Math.abs(Math.cos(dLat * Math.PI / 180.0 ));
		var dRed2 = dGridSizeXReduction * dGridSizeXReduction;
		var s1_s2x = dLon2 - dLon1;
		var s1_s2y = dLat2 - dLat1;
		var s1_px = dLon - dLon1;
		var s1_py = dLat - dLat1;
		var t = (s1_s2x * s1_px * dRed2 + s1_s2y * s1_py) / (s1_s2x * s1_s2x * dRed2 + s1_s2y * s1_s2y);
		var ppx=0;
		var ppy=0; // p projected onto shape segment (if  point alongside) or moved to closer end

		if (t < 0) // p is behind s1
		{
			ppx = dLon1;
			ppy = dLat1;
		}
		else if (t>=0.0 && t<=1.0) // p is at the side of the shape segment, can be projected onto it
		{
			ppx = dLon1 + t * s1_s2x;
			ppy = dLat1 + t * s1_s2y;
		}
		else // p is behind s2
		{
			ppx = dLon2;
			ppy = dLat2;
		}
		
		return calculateDistance(ppx, ppy, dLon2, dLat2);
	}
	
	function calculateRoute(traceFile, lastDrivenPointIndex){
	   
		// draw the original and the matched predefined waypoints
		var urlWayPoints = "";
	    for (var i = 0; i < plannedWaypoints.length; i++) {	
			urlWayPoints += "&waypoint" + i + "=" + plannedWaypoints[i].lat + "," + plannedWaypoints[i].lon;
		}
		var urlRoutingReq = ROUTER_URL + urlWayPoints;
		if (restTimeParams) urlRoutingReq += restTimeParams;
		var learnId = document.getElementById('learnId').value;
	    if (learnId) {
			if (lastDrivenPointIndex >= tracePoints.length - 1)
				urlRoutingReq += "&learnStopsId="   + learnId; // if we are at the end of the trace, we tell router to learn the stops
			else
				urlRoutingReq += "&learnedStopsId=" + learnId;				
	    }		
		var resttimes = document.getElementById('resttimes').value;
	    if (resttimes) urlRoutingReq += "&restTimes=" + resttimes; 	   
	    var addParams = document.getElementById('addParams').value;
	    if (addParams) urlRoutingReq += addParams;
		if (simulatingDrive == 0) document.getElementById("routingRespText").innerHTML = "CRE URL: <br>" + urlRoutingReq;
		getJSONP(urlRoutingReq, gotRoutingResponse, traceFile, false);
	}
	
	// parse the routing response
	var gotRoutingResponse = function (resp)
	{
		if (resp.error != undefined)
		{
			alert (resp.error);
			return;
		}
        //resetting all values for rest times back to defaut
		document.getElementById("long-rest" ).innerHTML = "00:00:00";
		document.getElementById("short-rest").innerHTML = "00:00:00";
		document.getElementById("restTimes" ).innerHTML = "00:00:00";
	  
		//parsing though the CRE response 
		var links = [];
		for (var m = 0; m < resp.response.route.length; m++){
			for (var k = 0; k<resp.response.route[m].leg.length; k++){
                    for (var linkIdx in resp.response.route[m].leg[k].link) {
                        var strip = new H.geo.Strip();
                        var shape = resp.response.route[m].leg[k].link[linkIdx].shape;
                        var l = shape.length;
                        var linkId = resp.response.route[m].leg[k].link[linkIdx].linkId;

                        for (var i = 0; i < l; i = i + 2) {
                            strip.pushLatLngAlt.apply(strip, [shape[i], shape[i + 1]].map(function(item) {
                                return parseFloat(item);
                            }));
						}
                        var polyline = new H.map.Polyline(strip, {style: {lineWidth: 8, strokeColor: COLORS[1], lineJoin: "round"}});
                        polyline.setArrows(true);
                        objContainer.addObject(polyline);
                    }
			}
		}
        // add warnings message only for driver rest times
		creWarningsContainer.removeAll();
        var warnings = resp.response.warnings;
        restTimeDuration = 0;
    	currentBreaksDuration = 0;
    	if (resp.response.matchedRoute){
    	var tracePointsNew = resp.response.matchedRoute[0].waypoint;
		firstTimestamp   = tracePointsNew[0                     ].timestamp;
		currentTimestamp = tracePointsNew[tracePointsNew.length - 1].timestamp;
		// ETA = actual driven time so far (from trace) + estimated remaining time (from routing)
		var realDrivingTime        = Math.floor((lastTimestamp    - firstTimestamp) / 1000);
		var realDrivingTimeSoFar   = Math.floor((currentTimestamp - firstTimestamp) / 1000);

		
		//parsing though the RME response 
		var links = [];
		for (var k = 0; k<resp.response.matchedRoute[0].leg.length; k++){
			for (var linkIdx in resp.response.matchedRoute[0].leg[k].link) {
				var strip = new H.geo.Strip();
				var shape = resp.response.matchedRoute[0].leg[k].link[linkIdx].shape;
				var l = shape.length;
				var linkId = resp.response.matchedRoute[0].leg[k].link[linkIdx].linkId;

				for (var i = 0; i < l; i = i + 2) {
					strip.pushLatLngAlt.apply(strip, [shape[i], shape[i + 1]].map(function(item) {
						return parseFloat(item);
					}));
				}
				var polyline = new H.map.Polyline(strip, {style: {lineWidth: 8, strokeColor: COLORS[0], lineJoin: "round"}});
				polyline.setArrows(true);
				objContainer.addObject(polyline);
				for (var v in resp.response.matchedRoute[0].leg[k].link[linkIdx].warning){
					var warning = resp.response.matchedRoute[0].leg[k].link[linkIdx].warning[v];
					if (shape){
						var shapeLength = shape.length;
						var lastLon = shape[shapeLength-1];
						var lastLat = shape[shapeLength-2];
						var point = new H.geo.Point(parseFloat(lastLat), parseFloat(lastLon));
						var warningObj = new Warning(warning);
						var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
						creWarningsContainer.addObject(marker); 
						if (warning.code == '1015'){
							var message = warning.message;
							if (message.includes("Long")) document.getElementById("long-rest").innerHTML = gettime(realDrivingTimeSoFar - message.slice(message.indexOf("after") + 6, message.indexOf(" sec for")));
						    if (message.includes("Short")) document.getElementById("short-rest").innerHTML = gettime(realDrivingTimeSoFar - message.slice(message.indexOf("after") + 6, message.indexOf(" sec for")));
						} 
					}
				}
			}
		}
		for (var i = 0; i <resp.response.matchedRoute[0].waypoint.length; i++){
			var tracePoint = resp.response.matchedRoute[0].waypoint[i];
			for (var n in tracePoint.warning){
				var warning = tracePoint.warning[n];
				var point = new H.geo.Point(parseFloat(tracePoint.mappedPosition.latitude), parseFloat(tracePoint.mappedPosition.longitude));
				if (tracePoint.breakDetected)	currentBreaksDuration +=  tracePoint.breakDuration;
				var warningObj = new Warning(warning, tracePoint.breakDuration);
				var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
				warningsContainer.addObject(marker); 
			}
		}
    	}
        if (warnings){
        	//if there are multiple legs in the response then the routeLinkSeqNum goes across the legs for example.,
        	//if the warning message says that we took the break at the routeLinkSeq = 20 and the first leg contains
        	//12 links and the 2nd leg contains 10 links then the routeLinkSeq number goes with the number 13 in the 
        	//2nd leg and it represents that at 8th link of the 2nd leg we took the break
        	var combinedLegs = [];
       for (var m = 0; m < resp.response.route.length; m++){
        for(var l = 0; l<resp.response.route[m].leg.length; l++){
			if (l > 0) combinedLegs = combinedLegs.concat(resp.response.route[0].leg[l].link.slice(1));
			else  combinedLegs = combinedLegs.concat(resp.response.route[0].leg[l].link);          
 

        	for (var w = 0; w < warnings.length; w++) {
        		if (warnings[w].message && warnings[w].tracePointSeqNum !== -1) {
        			var tracePointSeqNum = warnings[w].tracePointSeqNum;
        			if (warnings[w].code == '1013') {
        				var message = warnings[w].message;
        				var id = message.slice(message.indexOf("waypoint") + 8, message.indexOf(" ("));
        				plannedWaypoints[id].status = "visited";
        			}else if (warnings[w].code == '1014'){
        				var message = warnings[w].message;
        				var id = message.slice(message.indexOf("waypoint") + 8, message.indexOf(" ("));
        				plannedWaypoints[id].status = "skipped";
        			}
        			else if (tracePointSeqNum && tracePointSeqNum < tracePoints.length) { //get trace point coordinates and add warning icon on the map
        				var tracePoint = tracePoints[tracePointSeqNum];
        				if (tracePoint.breakDetected){
        				var point = new H.geo.Point(parseFloat(tracePoint.mappedPosition.latitude), parseFloat(tracePoint.mappedPosition.longitude));
        				var warningObj = new Warning(warnings[w], tracePoint.breakDuration);
        				var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
        				warningsContainer.addObject(marker);
        				}
        				}    
        			else if (warnings[w].routeLinkSeqNum !== -1) {
        				var warningMsg = warnings[w].message;
        				var warningCode = warnings[w].code;

        				var routeLinkSeqNum = warnings[w].routeLinkSeqNum;
        				if (routeLinkSeqNum){ //routeLinkSeqNum = "routeLinkSeqNum 897"
        					//routeLinkSeqNum = parseInt(routeLinkSeqNum.replace(/[^0-9\.]/g,''),10);//replace any non digit character with empty string // redundant - this is now int field
        					var actualLinkSeqNum = routeLinkSeqNum - 1; //because the response links array starts at zero index
        					if(routeLinkSeqNum){
        						var routeLinksLength = combinedLegs.length;   //resp.response.route[0].leg[l].link.length;
        						if (actualLinkSeqNum < routeLinksLength){
        							var shape = combinedLegs[actualLinkSeqNum].shape; //resp.response.route[0].leg[l].link[actualLinkSeqNum].shape;
        							if (shape){
        								var shapeLength = shape.length;
        								var lastLon = shape[1];
        								var lastLat = shape[0];
        								var point = new H.geo.Point(parseFloat(lastLat), parseFloat(lastLon));
        								var warningObj = new Warning(warnings[w]);
        								var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
        								creWarningsContainer.addObject(marker);
        								if (warnings[w].code == '14'){
        									var message = warnings[w].message;
        								    restTimeDuration += parseInt(message.slice(message.indexOf("sec for ") + 8, message.indexOf(" sec at")));
											warnings[w].code = '9999'; // to make sure we only add it once, because we iterate over the route legs here
        								} 
        							}
        						}
        					}    
        				}
        			}
        		}
        	}
        }
   	}
    	}	
    		// draw the original and the matched predefined waypoints
    		for (var l = 0; l < plannedWaypoints.length; l++) {
    			var p = plannedWaypoints[l];
    			if (p.status == "visited"){
    				objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon("#186A3B", p.status, l)}));
    			}else if ((p.status == "not visited")){
    				objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon("#424949", p.status, l)}));
    			}else{
    				objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon("#922B21", p.status, l)}));
    			}
    		}
				

		var realBreaksTimeSoFar = Math.floor(currentBreaksDuration / 1000);
		var estimatedRemainingTime = resp.response.route[0].summary.trafficTime;
		document.getElementById("actual").innerHTML = gettime(realDrivingTimeSoFar + estimatedRemainingTime);
		document.getElementById("diff"  ).innerHTML = gettime(realDrivingTimeSoFar + estimatedRemainingTime - realDrivingTime);
		document.getElementById("realBreaksTimeSoFar").innerHTML =  gettime(realBreaksTimeSoFar);
		document.getElementById("realDrivingTimeSoFar").innerHTML = gettime(realDrivingTimeSoFar);
		document.getElementById("realNetDrivingTimeSoFar").innerHTML = gettime(realDrivingTimeSoFar - realBreaksTimeSoFar);
		document.getElementById("estimatedRemainingTime").innerHTML = gettime(estimatedRemainingTime);
		document.getElementById("estimatedNetRemainingTime").innerHTML = gettime(estimatedRemainingTime - restTimeDuration);
		document.getElementById("restTimes").innerHTML = gettime(restTimeDuration);

        if (simulatingDrive == 1) {
			var a = new Date(currentTimestamp); // 2020-03-05 00:08:00
            var d = a.getFullYear() + "-" + (a.getMonth() < 10 ? '0' + a.getMonth() : a.getMonth()) + "-" +
                    (a.getDay() < 10 ? '0' + a.getDay() : a.getDay()) + " " + (a.getHours() < 10 ? '0' + a.getHours() : a.getHours()) + ":" +
					(a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes()) + ":" + (a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds());
			document.getElementById("routingRespText").innerHTML += "\r\n" + d + "," + realDrivingTimeSoFar/60 + "," + Math.round((realDrivingTimeSoFar + estimatedRemainingTime - realDrivingTime)/60);
			simulateDriveNext();
		}
	};
	
	function gettime(time)
	{
		var negative = time < 0;
		if (negative) time = -time;
		var h = Math.floor( time / 3600)      ; if (h < 10) h = "0" + h;
		var m = Math.floor((time % 3600) / 60); if (m < 10) m = "0" + m;
		var s =             time %         60 ; if (s < 10) s = "0" + s;
		return (negative ? "-" : "") + h + ":" + m + ":" + s;
	};


	function reset()
	{
		clearAll();
		document.getElementById('tracefilearea').value = '';
		document.getElementById('waypointsarea').value = '';
	}
	
	function clearAll(){
		
		document.getElementById("actual").innerHTML = "00:00:00";
		document.getElementById("fullTraceNetDrivingTime").innerHTML = "00:00:00";
		objContainer.removeAll();
		warningsContainer.removeAll();
		creWarningsContainer.removeAll();
		plannedWaypoints =  new Array();
		lastTimestamp = 0;
		breaksDuration = 0;
		currentId = 0;
		restTimeDuration = 0;
		document.getElementById("routingRespText").innerHTML = '';
	}
	
	var icons = {};
	
	function createIcons(l)
	{
		for(var i = 0; i < l; i++)
		{
			if(icons["red" + i] === undefined)
				icons["red" + i] = createIcon("red", i);
			if(icons["blue" + i] === undefined)
				icons["blue" + i] = createIcon("blue", i);
			if(icons["#000000" + i] === undefined)
				icons["#000000" + i] = createIcon("#000000", i);
			if(icons["00FF00" + i] === undefined)
				icons["#00FF00" + i] = createIcon("#00FF00", i);
		}
	}

	var createIcon = function (color, text, id)
	{
		var canvas = document.createElement('canvas'),
		width = 65,
		height = 52,
		fontSize = 12;

		canvas.width = width;
		canvas.height = height;

		ctx = canvas.getContext('2d');
		ctx.font = 'bold ' + fontSize + 'px Arial';


		var centerX = width / 2;
		var centerY = height / 2;
		var radius = 10;

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(centerX, centerY + radius);
		ctx.lineTo(centerX, 45);
		ctx.stroke();
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.textAlign = 'center'; 
		ctx.fillText(text,32,10);
		ctx.fillStyle = "white";
		ctx.fillText(id,centerX,centerY + 4);

		var icon = new mapsjs.map.Icon(canvas,
				({
					'anchor': {
						'x': 30,
						'y': 42
					}
				}));
		delete canvas; 
		return icon;
	};
	
	
	//--- function to make an ajax call to the backend server
	function getJSONP(url, callback, content, firstCall){
	Spinner.showSpinner();
    $.ajax({ 
    	url: url, 
    	dataType: "json", 
    	async: true, 
    	type: 'post',
    	data:content,
		contentType: 'application/octet-stream',
        success: function(response) {
        	callback(response);
			Spinner.hideSpinner();
			if (firstCall)	populateFieldsWhenNewPositionSelected(0);
        },
        error: function(xhr, status, e) {
        	Spinner.hideSpinner();
        	if (xhr.responseText) alert(xhr.responseText);
        	else alert("Something went wrong.");
        }
    });

	}