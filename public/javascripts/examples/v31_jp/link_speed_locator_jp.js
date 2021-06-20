/*
	*  (C) HERE 2014
		// author asadovoy
	    // (C) HERE 2019 -> migrate to 3.1
	*/

	// Create a platform object to communicate with the HERE REST APIs.
	var platform = new H.service.Platform({
		apikey: api_key_jp,
		useHTTPS: true
	});
    var maptypes = platform.createDefaultLayers();
    
    var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    center = new H.geo.Point(35.68066, 139.8355);


	// Instantiate a map in the 'map' div, set the base map to normal.
	var map = new H.Map(document.getElementById("mapContainer"),
	    omvlayer, {
		center: center,
		zoom: 14,
		pixelRatio: window.devicePixelRatio || 1
	});
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);
	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);
	// Enable the default UI.
	var ui = H.ui.UI.createDefault(map, maptypes);
	ui.getControl("scalebar").setAlignment("bottom-center");

	// SVG used for coordinates
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
		'<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
		' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
		'<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
		' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
		'<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
		' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="#FF0000"/>' +
		'<text font-size="12" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" x="10" y="19">__NO__</text>' +
		'</svg>';

	// DOM elements
	var $clearInput = $('#clear-checkbox');
	var $loadButton = $('#btn-load');
	var $coordsInput = $('#speed-output');
	// Set up coordinated input input.
	var $coordInput = $('#coord-input');
	
	var linksToCheck=[],speeds=[],speedLimits=[],conditionalSpeeds=[],variableSpeeds=[],roadGeometry=[];
	var staticPatterns=[];
	var layers = new Object();
	layers["TRAFFIC_PATTERN_FC"] = {callback: gotAverageSpeed, isFCLayer : true};
	layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
	layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
	layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
	layers["ROAD_GEOM_FC"] = {callback: gotLinkGeomerty};
	var pdeManager = new PDEManager(null, null, layers, api_key_jp);
	pdeManager.baseURL = "https://fleet.ls.hereapi.com/1/tile.json";
	pdeManager.tilesBaseURL = "https://fleet.ls.hereapi.com/1/tiles.json";

	// Map objects
	var mapObjects = new H.map.Group();
	map.addObject(mapObjects);

	// Info Bubbles for LinkInfo display
	map.addEventListener('longpress', function (currentEvent) 
	{
		reset();
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		$coordInput.val([lastClickedPos.lat, lastClickedPos.lng].join(","));
		submitPosition(lastClickedPos);
	});
	
	var submitPosition = function(pos)
	{
		var zip = new JSZip(),
			lastPos = "SEQNR,\tLATITUDE,\tLONGITUDE\n1,\t" + (Math.round(pos.lat * 100000.0) / 100000.0) + ",\t" + (Math.round(pos.lng * 100000.0) / 100000.0);
		zip.file("temp.zip", lastPos);
		var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
		var url = "https://fleet.ls.hereapi.com/2/matchroute.json?routemode=emergency&file=" + encodeURIComponent(content);
			url += "&apikey=" + api_key_jp + "&callback=gotRouteMatchResponse";
		
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}

	function reset() {
		// Clear map previous objects if needed.
		if ($clearInput.is(':checked')) {
			mapObjects.removeAll();
		}
	}
	
	var linkid;
	var gotRouteMatchResponse = function (respJsonObj) {
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		// draw the route
		linkid = respJsonObj.RouteLinks[0].linkId;
		doReverseGeo();
	}	

	// geocoder service
	var geocoder = platform.getSearchService();

	// retrieve details on button click
	$loadButton.on('click', function() {
		reset();
		// hide all previous error messages
		$('#error-message-container').hide();
		doReverseGeo();
	});
	
	// load static layer from PDE for traffic patterns 
	function getStaticContent(){
		
		// Generate URL.
		var url = ['https://fleet.ls.hereapi.com/1/static.json?content=TRAFFIC_PATTERN',
			'&apikey=',
			api_key_jp,
			"&callback=processStaticContent"
			].join('');
			// Send request.
			script = document.createElement("script");
		 	script.src = url;
			document.body.appendChild(script);
			Spinner.showSpinner();
	
	}
	
	// callback for static layer from PDE
	function processStaticContent(resp){
		if(resp ==null || resp.Rows==null){
			alert("Oops! Something went wrong.");
			return;
		}
		
		// populate static pattern map
		var rows=resp.Rows;
		for(var i=0;i<rows.length;i++){
			staticPatterns[rows[i].PATTERN_ID]=rows[i].SPEED_VALUES;
		}
		Spinner.hideSpinner();
	}
	
	// callback for conditional speed limts layer
	function gotCONDSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}

		// populate conditional speed limit map
		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			conditionalSpeeds[linkId]=resp.Rows[r];
		}
	};
	
	// call back for Speed Limits layer
	function gotSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}
		// Populate speed limits map 
		for (r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			speedLimits[linkId] = resp.Rows[r];
		}
	}
	
	//call back for Variable speed limts
	function gotVariableSpeedLimits(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}
	    // Populate variable speed limits map
		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			variableSpeeds[linkId]=resp.Rows[r];
		}
	}
	
	
	//call back for Variable speed limts
	function gotLinkGeomerty(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}
	    // Populate variable speed limits map
		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			roadGeometry[linkId]=resp.Rows[r];
		}
	}


	// Make reverse Geocoder request with provided coordinated to get closest link
	var doReverseGeo = function() {
		linksToCheck=[],speeds=[],speedLimits=[],conditionalSpeeds=[],variableSpeeds=[];
		 index=0;
		var coordValue = $coordInput.val();
		
		
		var reverseGeocodingParameters = {
			at: coordValue.trim()
		};
	
		geocoder.reverseGeocode(
			reverseGeocodingParameters,
			onSuccess,
			function(e) {
				alert(e);
			}
		);
	};
	
	// callback for geocoder result
	function onSuccess(result) {
		var location = result.items[0];
		if(location){
			linksToCheck[index++]={linkId : linkid};
			
			// display marker at navigable position
			var coord = new H.geo.Point(location.position.lat, location.position.lng);
			var marker = new H.map.Marker(coord, {
					icon: new H.map.Icon(svg.replace(/__NO__/g, 1))
				});
			var coordStrings = location.address.label;

			marker.setData("<div>" + coordStrings + "</div>");
			marker.addEventListener('tap', function(evt){
				var bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
					content: evt.target.getData()
				});
				ui.addBubble(bubble);
			}, false);
				
			// display marker at provided coorindates	
			coordStrings = document.getElementById("coord-input").value;
			var coord = new H.geo.Point(parseFloat(coordStrings.split(",")[0]),parseFloat(coordStrings.split(",")[1]));
			var marker1 = new H.map.Marker(coord, {
					icon: new H.map.Icon(svg.replace(/__NO__/g, 0))
			});
			 

			marker1.setData("<div>" + coordStrings + "</div>");
			marker1.addEventListener('tap', function (evt) {
					var bubble =  new H.ui.InfoBubble(evt.target.getGeometry(), {
						content: evt.target.getData()
					});
					ui.addBubble(bubble);
			}, false);

			// add markers to the map
			mapObjects.addObject(marker1);
			mapObjects.addObject(marker);
			zoomToMapObjects();
			
			// call PDE layers for the cooridnates using map view bound
			pdeManager.setLayers(layers);
			pdeManager.setBoundingBox(map.getViewModel().getLookAtData().bounds.getBoundingBox());
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
			pdeManager.start();
			Spinner.showSpinner();	
			
		}
	}
	

	
	// callback when all PDE layers are loaded
	function pdeManagerFinished(evt){
		Spinner.hideSpinner();		
		var routeLink=null;
		for(i=0;i<linksToCheck.length;i++){
			var linkId= Math.abs(linksToCheck[i].linkId);
			var linksValue="-"+linkId;
			
			
			var linkGeom= roadGeometry[linkId];
			if (linkGeom) {
				var lat = linkGeom.LAT.split(",");
				var lon = linkGeom.LON.split(",");
				var strip = new H.geo.LineString();
				var temLat= 0,temLon = 0;
				for(i=0;i<lat.length;i++){
					temLat = temLat + (parseInt(lat[i]) || 0);
					temLon = temLon + (parseInt(lon[i]) || 0);
					strip.pushPoint({lat: temLat/100000, lng: temLon/100000});
				}
				var polyline = new H.map.Polyline(
						strip, { style: { lineWidth: 10, strokeColor: "#ff0000" }}
				)
				mapObjects.addObject(polyline);
			}
			
			
			// get speed limit, use TO_REF_SPEED_LIMIT if FROM_REF_SPEED_LIMIT is null
			var routeLink=speedLimits[linkId];
			var speedLimit=0;
			if (routeLink) {
				speedLimit = parseFloat(routeLink.FROM_REF_SPEED_LIMIT);
				if(routeLink.FROM_REF_SPEED_LIMIT == null){
					speedLimit = parseFloat(routeLink.TO_REF_SPEED_LIMIT);
				}
			
			}
		
			// get conditional speed limit
			var variableSpeed=0;
			var conditinalSpeed=0;
			if(conditionalSpeeds[linkId]){
				conditinalSpeed=parseInt(conditionalSpeeds[linkId].SPEED_LIMIT);
			}
		
			// minimum of speed limit and conditional speed limit should be selected
			var finalspeedLimit=speedLimit;
			if(conditinalSpeed>0){
				finalspeedLimit=Math.min(speedLimit,conditinalSpeed);
			}
			
			var linkPattern=speeds[linkId];
			// get the traffic pattern speeds
			var pattern="";
			if (linkPattern != null) {
				if (linkPattern.F_WEEKDAY == null &&  linkPattern.T_WEEKDAY!=null) {
					pattern = linkPattern.T_WEEKDAY.split(",");
				}
				else if(linkPattern.F_WEEKDAY != null){
					pattern = linkPattern.F_WEEKDAY.split(",");
				}
			}
			
			
			// calculate average speed for speed collected in traffic pattern 
			//over 15 min intervals over the day (24 X 4), each day of the the week (7).
			var averageSpeedCal=0;
			var jindex=0;
			for (var j = pattern.length - 1; j >= 0; j--){
				var weeklyspeeds=staticPatterns[pattern[j]].split(",");
				for(var k=0;k<weeklyspeeds.length;k++){
					averageSpeedCal=averageSpeedCal+parseInt(weeklyspeeds[k]);
				}
			}
			averageSpeedCal=averageSpeedCal/(24*4*7);
			
			// get speed limit unit
			var unit = routeLink ? routeLink.SPEED_LIMIT_UNIT : "M";
			if(unit == "M"){
					finalspeedLimit = finalspeedLimit == 999 ?"No Restriction":(Math.round(finalspeedLimit*0.6213712) + " mph");
					averageSpeedCal= Math.round(averageSpeedCal*0.6213712) + " mph";
			}else{
				finalspeedLimit = finalspeedLimit == 999 ?"No Restriction":(finalspeedLimit+ " kph");
				averageSpeedCal = Math.round(averageSpeedCal)+ " kph";
			}
			
			
			document.getElementById("speed-output").value="Speed Limit: "+finalspeedLimit+" \nCalculated Average Speed: "+averageSpeedCal;
		}
	}
	
	//call back for traffic patter (average speed) layer
	function gotAverageSpeed(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}

		for (r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			speeds[linkId] = resp.Rows[r];
		}
	}

	var zoomToMapObjects = function() {
		map.getViewModel().setLookAtData({
            bounds: mapObjects.getBoundingBox()
        });
	};
	
	// load static layer on page load
	getStaticContent();