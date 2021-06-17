/*
	(C) HERE 2017
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
	
	var addresseField=document.getElementById("input-start");
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
	
	var icon = new H.map.Icon(svgMarkerPublicTransit);
	var currentStationCoords=null;
	
	/**
	 * Open Info bubble with station details
	 * @param {Object} evt
	 */
	var openBubble = function(evt) {
		var pos = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
		ui.removeBubble(infoBubble);
		var duration=evt.target.$duration;
		var stationId=evt.target.$stnId.split("#");
		if(stationId.length<0){
			stationId=[evt.target.$stnId];
		}
		var stnName=evt.target.$stnName;
		var content="<span class='smallFont'>Station : <a class='here_green' "+
		"target='_blank' href='transit_line_info?stationId="+stationId[0]+"'>"+stnName+"</a>"+
		"<br>Duration :"+parseDuration(duration)+ "<br>Station Id :"+stationId[0]+"</span>";
		
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
	 * Add Station Marker by parsing details from Station object
	 * @param {Object} stationDetails
	 */
	var addStationMarker = function (stationDetails){
		
		if(stationDetails && stationDetails["@x"] && stationDetails["@y"]){
			var stationLon = parseFloat(stationDetails["@x"]);
			var stationLat = parseFloat(stationDetails["@y"]);
			coord = new H.geo.Point(stationLat, stationLon);
			var shp = new H.map.Marker(coord,{icon:icon});
			shp.$stnName=stationDetails["@name"];
			shp.$stnId=stationDetails["@id"];
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
	 * 
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
			getTransitAlert(lat, lng);
		}
	}
	
	/**
	 * Get nearby stations
	 * @param {Object} lat
	 * @param {Object} lng
	 */
	var getNearbyStation = function(lat, lng)
	{
		var url = ["https://transit.api.here.com/search/by_geocoord.json?",
		"x=",
		lng, 
		"&y=",
		lat,
		"&radius=350",
		"&app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&callback_func=stationCallback"
		
		].join("");

		var newUrl = url;
        script = document.createElement("script");
		script.src = newUrl;
		document.body.appendChild(script);
		
	}
	
	
	var getTransitAlert = function(lat, lng)
	{
	
		 jQuery.ajax({
	        url: "https://transit.api.here.com/v3/alerts/nearby.json",
			data: {
	            app_id: app_id,
	            app_code: app_code,
	            center: lat+","+lng,
				format: "json"
	        },
			success: function( response ) {
        		alertCallback( response ); // server response
    		} 
   		 });
	}
	
	
	
	
	var alertCallback= function (response){
		
		if (response && response.Res && response.Res.Alerts) {
			var transitAlerts=response.Res.Alerts.Alert;
			document.getElementById("lineInfoHeader").style.display="block";
			var alterMessages="";
			for(var i=0;i<transitAlerts.length;i++){
				var transitAlert=transitAlerts[i];
				console.log(transitAlert);
				alterMessages = alterMessages+ "<div class='alertMessages'>";
				switch(transitAlert.origin){
					case "API" : 
						alterMessages= alterMessages+ transitAlert.info +
						"<br/><a target='_blank' class='here_green' href='"+transitAlert.Link.href+"'>(From Operator)</a>"+ "</div>";
						document.getElementById("lineInfo").innerHTML=alterMessages;  
					break;
					
					case "RSS" : alterMessages= alterMessages+ transitAlert.info + "</div>"; 
						document.getElementById("lineInfo").innerHTML=alterMessages;  
					break;
					
					case "WEB" : alterMessages= alterMessages+ transitAlert.info + "</div>"; 
						document.getElementById("lineInfo").innerHTML=alterMessages;  
					break;
					
					case "TWITTER" : 
						var twitterDiv= document.createElement("div");
						twttr.widgets.createTweet(
							transitAlert.Branding.At.tweetId,
							twitterDiv
						);
						document.getElementById("lineInfo").appendChild(twitterDiv);
					break;
					
					case "INVITRO" : alterMessages= alterMessages+ transitAlert.info + "</div>"; 
						document.getElementById("lineInfo").appendChild(twitterDiv);
					break;
					
				}
			}
			
			
		}else if(response && response.Res && response.Res.Message){
				alert(response.Res.Message.text);
			
		}
		
	}
	
	/*var getEmbededTweet = function (url){
		
		jQuery.ajax({
	        url: "https://publish.twitter.com/oembed",
			data: {
	           url : url,
			   omit_script : true,
			   hide_media : true
	        },
			 crossDomain: true,
    		dataType: 'jsonp',
			success: function( response ) {
        		//console.log(response.html);
				var alterMessages = response.html;
				document.getElementById("lineInfo").innerHTML=document.getElementById("lineInfo").innerHTML+alterMessages;
				twttr.widgets.load();
    		} 
   		 });
		
		
	}*/

	var stationCallback = function(response)
	{
		
		if(response && response.Res && response.Res.Stations && response.Res.Stations.Stn)
		{
			stations = response.Res.Stations.Stn;
		
		
			for (var j = 0; j < stations.length; j++) {
				
				
				var station = stations[j];
				var stationLon = parseFloat(station["@x"]);
				var stationLat = parseFloat(station["@y"]);
				coord = new H.geo.Point(parseFloat(stationLat), parseFloat(stationLon));
					
				shp = new H.map.Marker(coord);
				shp.$stnName=station["@name"];
				shp.$stnId=station["@id"];
				shp.$duration=stations[j]["@duration"];
				
				group.addObject(shp);
			}
			
			
		}else{
			alert("Oops! Something went wrong.");
		}
	
	    map.addObject(group);
		map.setViewBounds(group.getBounds());
	}
	
	/**
	 * 
	 */
	calcroute.onclick = function ()
	{
		/*if (document.getElementById("stationId").checked) {
			clearAll();
			document.getElementById("input-start").value="";
			getStationDetails(document.getElementById("input-stationId").value);
		}else{*/
			clearAll();
			document.getElementById("lineInfo").innerHTML="";
			geocode(document.getElementById("input-start").value);
		//}
		
	};


	/*if(stationIdUrl ){
		document.getElementById("input-stationId").value=stationIdUrl;
		document.getElementById("stationId").checked=true;
		calcroute.click();
	}*/