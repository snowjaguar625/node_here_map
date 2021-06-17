/*
	author domschuette
	(C) HERE 2015
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
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	group = new H.map.Group();
	linePath = new H.map.Group();
	linePathMarkers = new H.map.Group();
	
	var stationIdField=document.getElementById("input-stationId");
	var addresseField=document.getElementById("input-start");
	
	var stationIdUrl= getUrlParameter("stationId");
	var calcroute=document.getElementById("routing");
	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center:  new H.geo.Point(41.88854,-87.62849),
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

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

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;
	
	var infoBubble;
	var pathSegmntMap=[],stationMap=[],refPathSegMap=[];


	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	var icon = new H.map.Icon(svgMarkerPublicTransit, {
		anchor: {x: 10, y: 10}
	});
	var currentStationCoords=null;
	
	/**
	 * Open Info bubble with station details
	 * @param {Object} evt
	 */
	var openBubble = function(evt) {
		
		var pos = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
		currentStationCoords = pos;
		ui.removeBubble(infoBubble);
		var duration=evt.target.$duration;
		var stationId=evt.target.$stnId.split("#");
		var stnName=evt.target.$stnName;
		var content="<span class='smallFont'>Station : <a class='here_green' href='#' onclick='getLineDtls(\""+stationId[0]+"\")'>"
		+stnName+"</a><br/> StationId:"+stationId[0]+"</span>";
		
		infoBubble = new H.ui.InfoBubble(pos, { content: content });
		bubble = ui.addBubble(infoBubble);
		
		
   }
   
   /**
	 * Parse duration values
	 * @param {Object} duration
	 */
	var parseDuration = function(duration){
		duration=duration.replace(/PT/g,"").replace(/H/g," Hour(s)").replace(/M/g," Minute(s)").replace(/S/g," Second(s)")
		return duration;
	}
	
	/**
	 * Clear Line related plotted map objects
	 */
	var clearLineInfo = function(){
		linePath.removeAll();
		linePathMarkers.removeAll();
		lineInfoMap=[];
		document.getElementById("lineNumbers").innerHTML="";
		document.getElementById("lineInfo").innerHTML="";
		document.getElementById("lineNumbersHeader").style.display="none";
		document.getElementById("lineInfoHeader").style.display="none";
	}
	
	/**
	 * Clear all map objects
	 */
	var clearAll = function(){
		stationIdField="";
		clearLineInfo();
		pathSegmntMap=[];stationMap=[];refPathSegMap=[];
		group.removeAll();
	}
	
	/**
	 * Get Line Details
	 * @param {Object} stationId
	 */
	var getLineDtls = function (stationId){
		clearAll();
		getLineDetails(stationId);
	} 
	
	/**
	 * Get Line Details
	 * @param {Object} stationId
	 */
	var getLineDetails = function(stationId){
		
		document.getElementById("input-stationId").value=stationId;
		var url = ["https://transit.api.here.com/v3/lines/by_stn_id.json?",
		//var url = ["https://transit.api.here.com/lines/v1/by_stopid.json?",
		"app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&graph=1",
		"&stnId=",
		encodeURIComponent(stationId),
		//"&callback_func=linkInfoCallBack"
		"&callbackFunc=linkInfoCallBack"
		
		].join("");

		var newUrl = url;
        script = document.createElement("script");
		script.src = newUrl;
		document.body.appendChild(script);
	}
	
	/**
	 * Get Station Details
	 * @param {Object} stationId
	 */
	var getStationDetails = function(stationId){
		document.getElementById("input-stationId").value=stationId;
		//var url = ["https://transit.api.here.com/search/by_stopids.json?",
		var url = ["https://transit.api.here.com/v3/stations/by_ids.json?",
		"app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&stnIds=",
		encodeURIComponent(stationId),
		"&details=1",
		//"&callback_func=stnDetailsCallBack"
		"&callbackFunc=stnDetailsCallBack"
		
		].join("");

		var newUrl = url;
        script = document.createElement("script");
		script.src = newUrl;
		document.body.appendChild(script);
	}
	
	/**
	 * Callb ack for  back station details response
	 * @param {Object} response
	 */
	var stnDetailsCallBack = function (response){
		if (response && response.Res && response.Res && response.Res.Stations) {
			var stations=response.Res.Stations.Stn;
			if(stations && stations.length > 0){
				var stationDetails=stations[0];
				// Station location
				var stationLon = parseFloat(stationDetails["x"]);
				var stationLat = parseFloat(stationDetails["y"]);
				coord = new H.geo.Point(stationLat, stationLon);
				var shp = new H.map.Marker(coord);
				shp.$stnName=stationDetails["name"];
				shp.$stnId=stationDetails["id"];
				linePathMarkers.addObject(shp);
				map.addObject(linePathMarkers);
				map.setViewBounds(linePathMarkers.getBounds());
				
				var address=parseName(stationDetails,"number")+parseName(stationDetails,"street")+
				parseName(stationDetails,"district")+parseName(stationDetails,"postal")+parseName(stationDetails,"country");
				document.getElementById("input-start").value=address;
				// Get line passing through station
				getLineDetails(stationDetails["id"]);
			}
		}else if(response && response.Res && response.Res.Message){
			alert("Oops! "+response.Res.Message["$"]);
		}else{
			alert("Oops! Something went wrong.");
		}
	}
	
	/**
	 * Parse out the attr from passed object
	 * @param {Object} stationDetails
	 * @param {Object} attr
	 */
	var parseName = function(stationDetails,attr){
		if(stationDetails[attr]){
			return stationDetails[attr]+", ";
		}else{
			return "";
		}
		
	}
	
	var lineInfoMap=[];
	
	/**
	 * Callback for parsing Link Info details
	 * @param {Object} response
	 */
	var linkInfoCallBack = function(response){
		if (currentStationCoords) {
			var marker = new H.map.Marker(currentStationCoords);
			group.addObject(marker);
		}
	
		if(response && response.Res && response.Res && response.Res.PathSegments){
			
			var contentToBeDisplayed="";
			// Create PathSegment  map
			var pathSegments=response.Res.PathSegments.PathSeg;
			for(var i=0;i<pathSegments.length;i++){
				var pathSegment=pathSegments[i];
				pathSegmntMap[pathSegment["id"]]=pathSegments[i];
				
			}
				
			// Create Station Map
			var stations=response.Res.Stations.Stn;
			for(var i=0;i<stations.length;i++){
				var station=stations[i];
				stationMap[station["id"]]=station;
				
			}
			
			//Create Reference Path Segment Map
			var refPathSeg=response.Res.PathSegments.RefPathSeg;
			if(refPathSeg)
			for(var i=0;i<refPathSeg.length;i++){
				var refPath=refPathSeg[i];
				if(refPath)
				refPathSegMap[refPath["id"]]=refPath;
				
			}
		
			// Parse details of line
			var lineInfos=response.Res.LineInfos.LineInfo;
			var element=document.getElementById("lineNumbers");
			for(var i=0;i<lineInfos.length;i++){
				contentToBeDisplayed="";
				var line=lineInfos[i];
				var lineDetails=document.createElement("div");
				lineDetails.innerHTML="<span class='smallFont' ><b>Line: </b><a class='here_green' href='#'"+
				"onclick='showLineDetails("+i+")'>"+line.Transport["name"]+"</a> <b>Direction: </b>"+line.Transport["dir"]+"</span>";
				element.appendChild(lineDetails);
				
				// Get the most request stops and all stops
				var mainStops=lineInfos[i].LineSegments[0]["seg_ids"].split(" ");
				var allStops=lineInfos[i].LineSegments[1]["seg_ids"].split(" ");
				
				// Populate main stop details
				for (var j = 0; j < mainStops.length; j++) {
					var station;
					if (pathSegmntMap[mainStops[j]]) {
						// Get To station from path segments
						station = pathSegmntMap[mainStops[j]]["to"];
					}else if(refPathSegMap[mainStops[j]]){
						// If segment Id is retruned as reference path Id
						// then find the corresponding Path Segment
						// if  reference path contains reverse attribute then
						// take from station
						var refPath=refPathSegMap[mainStops[j]];
						if(refPath && refPath["reverse"]){
							 station = pathSegmntMap[refPath["seg_id"]]["from"];
						}else if(refPath){
							 station = pathSegmntMap[refPath["seg_id"]]["to"];
						}
					}
					if(stationMap[station]){
						var stationName = stationMap[station]["name"];
					    contentToBeDisplayed = contentToBeDisplayed + stationName +" ("+station+ ")<br>";
					}
				}
				
				var stations = [];
				// Populate All stop details
				for (var j = 0; j < allStops.length; j++) {
						if (pathSegmntMap[mainStops[j]]) {
							stations[j] = pathSegmntMap[mainStops[j]];
						}else if(refPathSegMap[mainStops[j]]){
							// If segment Id is retruned as reference path Id
							// then find the corresponding Path Segment
							// if  reference path contains reverse attribute then
							// exchange from and to stations
							stations[j] = pathSegmntMap[refPathSegMap[mainStops[j]]["seg_id"]];
							if(stations[j]["reverse"]){
								var temp=stations[j]["from"];
								stations[j]["from"]=stations[j]["to"];
								stations[j]["to"]=temp;
							}
						}
				}
				
				// default color for line
				var lineColor="rgba(255, 0, 0, 0.8)";
				// if Colors of the line are available then parse the same
				if(line.At){
					var colors=line.At;
					for(var j=0;j<colors.length;j++){
						if(colors[j]["id"] && colors[j]["id"] == "color"){
							lineColor=colors[j]["$"];
							break;
						}
					}
				}
				
				lineInfoMap[i]=	{mainStops:contentToBeDisplayed,allStops:stations,color:lineColor};
			}
			document.getElementById("lineNumbersHeader").style.display="block";
		}
	}
	
	/**
	 * Sho details of the line
	 * @param {Object} line
	 */
	var showLineDetails = function(line){
		linePath.removeAll();
		linePathMarkers.removeAll();
		contentToBeDisplayed=lineInfoMap[line];
		document.getElementById("lineInfo").innerHTML=contentToBeDisplayed.mainStops;
		var allStops =contentToBeDisplayed.allStops;
		var lineColor = contentToBeDisplayed.color;
		
		// add the first "from station"
		if(allStops[0] && allStops[0]["from"]){
			var stationDetails=stationMap[allStops[0]["from"]];
			addStationMarker(stationDetails);
		}
	
		
		for (var j = 0; j < allStops.length; j++) {
			var segments = allStops[j];
			if (segments) {
			    // get the Grpah attribute to plot the polyline
				var coords = segments["graph"].split(" ");
				var strip = new H.geo.Strip();
				for (var k = 0; k < coords.length; k++) {
					strip.$duration = segments["duration"];
					strip.pushLatLngAlt(parseFloat(coords[k].split(",")[0]), parseFloat(coords[k].split(",")[1]), 0);
				}
				
				var stationDetails = stationMap[segments["to"]];
				addStationMarker(stationDetails);
				var shp = new H.map.Polyline(strip, {
					style: {
						lineWidth: 5,
						strokeColor: lineColor,
						fillColor: lineColor
					}
				});
				linePath.addObject(shp);
				
			}		
				
		}
		
		map.addObject(linePath);
		map.addObject(linePathMarkers);
		map.setViewBounds(linePath.getBounds());
		document.getElementById("lineInfoHeader").style.display="block";
	}
	
	/**
	 * Add Station Marker by parsing details from Station object
	 * @param {Object} stationDetails
	 */
	var addStationMarker = function (stationDetails){
		
		if(stationDetails && stationDetails["x"] && stationDetails["y"]){
			var stationLon = parseFloat(stationDetails["x"]);
			var stationLat = parseFloat(stationDetails["y"]);
			coord = new H.geo.Point(stationLat, stationLon);
			var shp = new H.map.Marker(coord,{icon:icon});
			shp.$stnName=stationDetails["name"];
			shp.$stnId=stationDetails["id"];
			linePathMarkers.addObject(shp);
		}
		
		
	}
	
	group.addEventListener("tap", openBubble);
	linePathMarkers.addEventListener("tap", openBubble);
	
	/**
	* Start/Destination selectin via LongClick in map
	**/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		group.removeAll();
		sh = lastClickedPos.lat + "," + lastClickedPos.lng;
		document.getElementById("input-start").value = sh;
		geocode(sh);
	}
	
	/**
	 * Geocoder to coorinated for address
	 * @param {Object} term
	 */
	var geocode = function(term)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geoUrl = ["https://geocoder.api.here.com/6.2/search.json?",
		"searchtext=",
		term,
		"&maxresults=1",
		"&app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&jsoncallback=",
		"geocallback"
		].join("");

		script = document.createElement("script");
		script.src = geoUrl;
		document.body.appendChild(script);
	}

	/**
	 * Call back for parsing the Geocoder response
	 * @param {Object} response
	 */
	var geocallback = function(response)
	{
		group.removeAll();

		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Place && response.Response.View[0].Result[0].Place.Locations[0])
		{
			lat = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Longitude;

			getIsolines(lat, lng);
		}
		else if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Location && response.Response.View[0].Result[0].Location.DisplayPosition)
		{

			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude;

			getNearbyStation(lat, lng);
		}
	}

	/**
	 * Get stations neaby
	 * @param {Object} lat
	 * @param {Object} lng
	 */
	var getNearbyStation = function(lat, lng)
	{
		var url = ["https://transit.api.here.com/v3/stations/by_geocoord.json?",
		"center=",
		lat + "," + lng, 
		"&radius=350",
		"&app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&callbackFunc=stationCallback"
		
		].join("");

		var newUrl = url;
        script = document.createElement("script");
		script.src = newUrl;
		document.body.appendChild(script);
		
	}

	/**
	 * Call back for parsing Staion details response
	 * @param {Object} response
	 */
	var stationCallback = function(response)
	{
		
		if(response && response.Res && response.Res.Stations && response.Res.Stations.Stn)
		{
			stations = response.Res.Stations.Stn;
		
		
			for (var j = 0; j < stations.length; j++) {
				
				
				var station = stations[j];
				var stationLon = parseFloat(station["x"]);
				var stationLat = parseFloat(station["y"]);
				coord = new H.geo.Point(parseFloat(stationLat), parseFloat(stationLon));
					
				shp = new H.map.Marker(coord);
				shp.$stnName=station["name"];
				shp.$stnId=station["id"];
				shp.$duration=stations[j]["duration"];
				
				group.addObject(shp);
			}
			
			
		}else{
			alert("Oops! Something went wrong.");
		}
	
	    map.addObject(group);
		map.setViewBounds(group.getBounds());
	}
	
	
	 
	
	// Call specific function for getting details
	calcroute.onclick = function ()
	{
		// if checked use Station id provided
		if (document.getElementById("stationId").checked) {
			clearAll();
			document.getElementById("input-start").value="";
			getStationDetails(document.getElementById("input-stationId").value);
		}else{
			clearAll();
			document.getElementById("input-stationId").value="";
			geocode(document.getElementById("input-start").value);
		}
		
	};

	// If stationId is available from url then
	// use the same
	if(stationIdUrl ){
		document.getElementById("input-stationId").value=stationIdUrl;
		document.getElementById("stationId").checked=true;
		calcroute.click();
	}