/*
	author knut.strobeck@here.com
	(C) HERE 2015 - 2018
	author Sachin Jonda migrated to Japan and Latest API's
	*/

	/*  Set authentication app_id and app_code
	*  WARNING: this is a demo-only key
	*  please register on http://developer.here.com/
	*  and obtain your own API key
	*/

	$( document ).ready(function() {
	});

	var padZerosNumbers= function(num, size)
	{
		var negative= ( num  < 0 );
		if( negative )
		{
			num= Math.abs( num );
			size--;
		}
		var s = num + "";
		while( s.length < size ) s = "0" + s;
		return negative ? "-" + s : s;
	};

	var secure = secure = (location.protocol === 'https:') ? true : false;
	var noneExampleTxt=  getUrlParameter( 'destinations' );
	var custom_app_id=   getUrlParameter( 'app_id' );
	var custom_app_code= getUrlParameter( 'app_code' );
	var custom_apikey= getUrlParameter( 'apikey')
	var host=            getUrlParameter( 'host' );
	if( host === null )
		host= 'wse.ls.hereapi.com';

	else{
		document.getElementById("endpointDetails").style.display= "table-row";
		var wseurl;

		if (host.substring(0, 7) != "http://" && host.substring(0, 8) != "https://") {
			wseurl = (secure ? "https://" : "http://") + host;
		}else{
			wseurl = host;
		}
		document.getElementById("endpoint").value= wseurl;
	}



	//var startDate= new Date( document.getElementById("departureDate").value );
	var startDate= new Date(2016, 9, 14, 7, 30, 0 );
	startDate.setMinutes( startDate.getMinutes() - 120 - startDate.getTimezoneOffset() );
	var effTime= startDate.toLocaleTimeString('en-US', { hour12: false });
	document.getElementById("departureTime").value= effTime;
	document.getElementById("departureDate").value= (1900 + startDate.getYear()) + '-' + padZerosNumbers( (1+startDate.getMonth()).toFixed( 0 ), 2 ) + '-' + padZerosNumbers( startDate.getDate().toFixed( 0 ), 2 );

	if( custom_app_id !== null && custom_app_code !== null && custom_apikey !== null )
	{
		app_id = custom_app_id;
		app_code = custom_app_code;
		apikey = custom_apikey;
		document.getElementById("endpointDetails").style.display= "table-row";
	}else{
		apikey = api_key_jp;
	}

	// check if the site was loaded via secure connection



	var baseUrl= (secure ? "https:" : "http:") + "//" + host + "/2/findsequence.json?";
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	document.getElementById("serverendpoint").innerHTML= baseUrl + "<br>apikey: " + apikey;
	var globalRoutingMode="";
//	+ "<br>app_code: " + app_code

	var examplesArr = [
		/*None, possibly provided as an Url parameter: */  noneExampleTxt != null ? decodeURIComponent(noneExampleTxt).split('\\n').join('\n') : "",
		/* Ruhrdistrict round trip without constraints: */  "House1;35.67910002636881,139.83319866403752\nHouse2;35.69011501843044,139.89980327394417\nHouse3;35.713394869114154,139.78255856114458\n",
		/* Ruhrdistrict round trip with A before B */       "DuisburgRuhrort;51.4541,6.7406\nGelsenkirchen;51.5053,7.1016\nZecheZollverein;51.486,7.0459\nKokereiZollverein;51.49016,7.03141\nMuehlheimRuhrHbf;51.432,6.886;before:destination9\nBochumRathaus;51.4832,7.2186\nDortmundHbf;51.5169,7.4605\nBochum;51.4732,7.1771\nEssenGrugapark;51.4304,7.0011\nHerne;51.537974,7.217826\nBottrop;51.519478,6.950919\nDuisburgHafen;51.4576,6.7717",
		/* Ruhrdistrict round trip with access hours: */    "DuisburgRuhrort;51.4541,6.7406\nGelsenkirchen;51.5053,7.1016;acc:fr08:00:00+02:00|fr10:00:00+02:00,fr14:00:00+02:00|fr16:00:00+02:00;st:900\nZecheZollverein;51.486,7.0459;acc:mo12:00:00+02:00|fr18:00:00+02:00;st:900\nKokereiZollverein;51.49016,7.03141;acc:mo12:00:00+02:00|fr18:00:00+02:00;st:900\nMuehlheimRuhrHbf;51.432,6.886;acc:mo08:00:00+02:00|fr13:00:00+02:00;st:900\nBochumRathaus;51.4832,7.2186;acc:mo08:00:00+02:00|fr13:00:00+02:00;st:900\nDortmundHbf;51.5169,7.4605;acc:mo08:00:00+02:00|fr17:40:00+02:00;st:900\nBochum;51.4732,7.1771;acc:mo09:30:00+02:00|fr12:00:00+02:00;st:900\nEssenGrugapark;51.4304,7.0011;acc:mo12:00:00+02:00|fr18:00:00+02:00;st:900\nHerne;51.537974,7.217826;acc:mo12:00:00+02:00|fr18:00:00+02:00;st:900\nBottrop;51.51936,6.95109;acc:mo12:00:00+02:00|fr18:00:00+02:00;st:900\nDuisburgHafen;51.4576,6.7717\n"
		
	];

	function exampleSelect(me)
	{
		document.getElementById('destinations').value = examplesArr[parseInt(me.value.replace("ex",""))];
	}

	var addPatternTimeControlToMap = function(mapUI)
	{
		var sumSecondsTimeTraffic = {value: "0"},
		trafficTileProvider = new H.map.provider.ImageTileProvider({
			getURL: function(x, y, level){
				var trafficHost = (secure ? "https":"https") + "://1.traffic.maps.ls.hereapi.com/traffic/6.0/tiles/",
				url = trafficHost + level + "/" + x +"/" + y + "/256/png32?",
				params = [
					"apikey=" + apikey,
					"compress=" + "true",
					"pattern_time=" + this.sumSecondsTimeTraffic.value
				];
				return url+params.join("&");
			}.bind({"sumSecondsTimeTraffic": sumSecondsTimeTraffic})
		}),
		trafficTileLayer = new H.map.layer.TileLayer(trafficTileProvider),
		patternContainer = new H.ui.Control(),
		patternContainerEl,
		dOfWeekEl = document.querySelector("#dOfWeek"),
		hourEl = document.querySelector("#hour"),
		minutesEl = document.querySelector("#minutes"),
		chgTime = function(){
			var dOfWeekEl = document.querySelector("#dOfWeek"),
			hourEl = document.querySelector("#hour"),
			minutesEl = document.querySelector("#minutes");
			this.sumSecondsTimeTraffic.value = parseInt(dOfWeekEl.options[dOfWeekEl.selectedIndex].value)*24*60*60 + parseInt(hourEl.options[hourEl.selectedIndex].value)*60*60 + parseInt(minutesEl.options[minutesEl.selectedIndex].value)*60;
			this.trafficTileLayer.getProvider().reload(false);
		}.bind({"trafficTileLayer": trafficTileLayer, "sumSecondsTimeTraffic": sumSecondsTimeTraffic});


		mapUI.addControl("patternCont", patternContainer);
		patternContainerEl = patternContainer.getElement();

		patternContainer.setAlignment("right-top");

		var ctrlTimeEl = document.querySelector(".ctrl-time"),
		tSelectEl = document.querySelector(".tselect");

		tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34s.png)";
		tSelectEl.addEventListener("click", function(e){
			var contTimeEl = document.querySelector(".cont-time"),
			bkgImg = this.tSelectEl.style.backgroundImage;

			if(bkgImg.indexOf("traffic_timebw30x34s") == -1){
				this.tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34s.png)";
				contTimeEl.style.display = "none";
				map.removeLayer(this.trafficTileLayer);
			}else{
				this.tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34.png)";
				contTimeEl.style.display = "block";
				map.addLayer(this.trafficTileLayer);
			}
			/*background-image: url(../img/HLP_traffic_timebw30x34.png);*/
		}.bind({"tSelectEl": tSelectEl, "trafficTileLayer": trafficTileLayer}));

		dOfWeekEl.addEventListener("change", chgTime);
		hourEl.addEventListener("change", chgTime);
		minutesEl.addEventListener("change", chgTime);

		patternContainerEl.appendChild(ctrlTimeEl);

		patternContainer.setVisibility(true);
	};


	var mapContainer = document.getElementById('mapContainer');
	
	

	platform = new H.service.Platform({
		apikey: api_key_jp
	}),
	maptypes = platform.createDefaultLayers(),
	router = platform.getRoutingService(),
	labels = new H.map.Group(),
	groups = [],
	activeGroup= null,
	activeConnections= null,
	activeLabels= null;
	
	// Japan styling requisites
	var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    center = new H.geo.Point(35.68066, 139.8355);

	map = new H.Map( mapContainer, omvlayer,
		{
			center: center,
			zoom: zoom
		}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	// set padding for control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	// add labels (waypoint markers) to map
	map.addObject( labels );
	
	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	// add behavior control, e.g. for mouse
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// enable UI components and remove the unnecessary
	var ui = H.ui.UI.createDefault( map, maptypes );
	ui.removeControl('mapsettings');

	//add pattern time control to the map
	addPatternTimeControlToMap(ui);

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;
	
	var zIndex = 1;
    var currentColor ="rgba(0,85,170,";
	var wayPointColor ="#A9D4FF";


	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	map.addEventListener('tap', function (evt)
	{
		if( document.getElementById('addCoords').checked )
		{
			var coords =  map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
			var point = new H.geo.Point(coords.lat, coords.lng);
			var marker = new H.map.DomMarker(
						point,
						{ icon: createSimpleSvgMarkerIconWithImg('-', coords.lat.toFixed(6) +','+ coords.lng.toFixed(6), '') }
					);

			labels.addObject( marker );
			document.getElementById('destinations').value += "\r\n" + coords.lat.toFixed(6) + "," + coords.lng.toFixed(6);
		}
		  
	      // increase z-index of the group contianing marker/polyline that was tapped
		  
		  if(evt.target instanceof H.map.DomMarker || evt.target instanceof H.map.Polyline)
		  	  evt.target.getParentGroup().setZIndex(zIndex++);
		  
		
	}, false);
	
	


	var server_rr = 0;
	var truckOverlayProvider = new H.map.provider.ImageTileProvider({
		label: "Tile Info Overlay",
		descr: "",
		min: 12,
		max: 20,
		getURL: function( col, row, level )
		{
			server_rr++;
			if(server_rr > 4)
				server_rr = 1;
			return ["https://",
				server_rr,
				".base.maps.ls.hereapi.com/maptile/2.1/truckonlytile/newest/normal.day/",
				level,
				"/",
				col,
				"/",
				row,
				"/256/png8",
				"?style=fleet",
				"&apikey=",
				apikey
				].join("");
		}
	});

	function getUrlParameter(param){

		var pageURL = window.location.search.substring(1);
		var urlVariables = pageURL.split('&');

		for (var i = 0; i < urlVariables.length; i++){

			var parameterName = urlVariables[i].split('=');
			if (parameterName[0] == param){
				return parameterName[1];
			}
		}
		return null;
	}

	var handleTransport = function(cb)
	{
		if(cb.checked)
			map.addLayer(truckOverlayLayer);
		else
			map.removeLayer(truckOverlayLayer);
	};
	var truckOverlayLayer = new H.map.layer.TileLayer(truckOverlayProvider);

	/**
	*  Show and hide traffic options
	*/
	var detailsSelect = function()
	{
		var detaildesc = document.getElementById("detaildesc");
		var moreText = document.getElementById("more");
		moreText.value = (detaildesc.style.display == 'block') ? "もっと" : "もっと少なく";
		detaildesc.style.display = (detaildesc.style.display == 'block') ? 'none' : 'block';
	};

	/**
	* Show and hide truck attributes
	*/
	var truckSelect= function()
	{
		var vehicleType=        document.getElementById('vehicleType').value;
		if( vehicleType === "car" ||  vehicleType === "pedestrian")
		{
			document.getElementById("vehicleDetails").style.display="none";
			document.getElementById("truckRestDiv").style.display= "none";
			map.removeLayer(truckOverlayLayer);
		}
		else if( vehicleType === "truck" )
		{
			document.getElementById("vehicleDetails").style.display= "block";
			document.getElementById("truckRestDiv").style.display= "block";
			if( document.getElementById("truckrestr").checked )
				map.addLayer(truckOverlayLayer);
			else
				map.removeLayer(truckOverlayLayer);
		}
	};

	var restSelect= function()
	{
		var selected=        document.getElementById('rest-selector').value;
		if( selected === "default" || selected === "disabled"  )
		{
			document.getElementById("custom-rest-times").style.display="none";
		}
		else if( selected === "custom" )
		{
			document.getElementById("custom-rest-times").style.display="block";
		}
	};

	var getRestSelection= function()
	{
		var selected=        document.getElementById('rest-selector').value;
		if( selected === "default" || selected === "disabled"  )
		{
			return selected;
		}
		else if( selected === "custom" )
		{
			return    "durations:"    + document.getElementById("rest-custom-durations").value
			+ ";serviceTimes:" + document.getElementById("rest-custom-serviceTimes").value
		}
		return null;
	};



	/**
	* Sends request to the service
	*/
	var calculateOptimizedRoute = function( mode, startPoint, destinations, endPoint, vehicletype, traffic, departure, truckParams, restTimes )
	{
		var url =
		[   document.getElementById('endpoint').value+"/2/findsequence.json?",
			"mode=",
			mode,
			"&apikey=",
			apikey,
			"&start=",
			startPoint,
			"&departure=",
			departure
		];

		var additionalParams = document.getElementById("additional").value.trimLeft();
		if( additionalParams != "" && !additionalParams.startsWith("&") ) additionalParams= "&" + additionalParams;
	

		if( restTimes !== null )
			url.push( "&restTimes=", restTimes );

		if( endPoint != null )
			url.push( "&end=", endPoint );

		for( var i= 0, k= 0; i < destinations.length; i++ )
		{
			if( destinations[ i ] != null && destinations[ i ].trim().length > 0 )
			{
				url.push( "&destination" + (k+1) + "=", destinations[ i ]  );
				k++;
			}
		}

		var improveFor = document.getElementById('improveFor').value;
		if (improveFor == 'TIME' || improveFor == 'DISTANCE') { // otherwise we don't optimize at all
			url.push( "&improveFor=", improveFor );
		}
		url.push( truckParams );
		url.push( additionalParams );
		url.push( "&jsonCallback=processResults" );

		if (improveFor == 'NONE') {
			url.push( "&algo=white" );
		}

		// save all (geocoded) waypoints in case an error occures - then just the waypoints without the route is displayed on map
		var currentRouteWaypoints = [];
		currentRouteWaypoints.push(startPoint);
		currentRouteWaypoints = currentRouteWaypoints.concat(destinations);
		currentRouteWaypoints.push(endPoint);
		// show waypoints on map
		for( var j = 0; j < currentRouteWaypoints.length; j++ )
		{
			var labelSplit = currentRouteWaypoints[j].split('%3B');
			var coordIdx= findPositionIdx( labelSplit );
			//if(labelSplit.length >= 2)
			{
				var coordSplit = labelSplit[coordIdx].split('%2C');
				if(coordSplit.length == 2)
				{
					var point = new H.geo.Point(coordSplit[0], coordSplit[1]);
					var marker = new H.map.DomMarker(
						point,
						{ icon: createSimpleSvgMarkerIconWithImg('-', decodeURIComponent(labelSplit[0]), '') }
					);

					labels.addObject( marker );
				}
			}
		}
		if(labels.getChildCount() > 0)
		{
			map.getViewModel().setLookAtData({bounds: labels.getBoundingBox()}, false);

		}

		feedbackTxt.innerHTML = "Calculation request sent, waiting for response…";
		script = document.createElement("script");
		script.src = url.join("");
		script.onerror = function(e)
		{
			feedbackTxt.innerHTML = "An Error happened during the calculation. We're sorry.";
			bErrorHappened = true;
		};
		document.body.appendChild(script);
	};


	/**
	* Displays the result, activated via callback
	* @param data  result from service
	*/
	var processResults = function(data)
	{
		if (data.results == null || data.results.length==0){
			if(data.warnings != null && data.warnings.outOfSequenceWaypoints.length>0){
				feedbackTxt.innerHTML = "Unable to calculate a sequence because of the constraints on the following waypoints:";
				for(var i = 0; i<data.warnings.outOfSequenceWaypoints.length;i++){
					feedbackTxt.innerHTML += "<br>" + data.warnings.outOfSequenceWaypoints[i].id;
				}
			}else if(data.errors!=null || data.errors.length > 0){
				feedbackTxt.innerHTML = "Error: " + data.errors[0];
			}else{
				feedbackTxt.innerHTML = "An Unknown Error happened during the calculation. We are sorry.";
			}
		}
		if (data.results.length > 1) {
			feedbackTxt.innerHTML = "Warning: Got several alternatives in response, displaying only the first one.";
		}

		var err= null;
		if ( data.hasOwnProperty('error') && data.error != null + data.hasOwnProperty('status') )
			err= "" + data.status + " " + data.error + "<br>" + data.error_description;
		else if ( data.hasOwnProperty('errors') && data.errors.length != 0 )
			err= data.errors[ 0 ];
		if( err != null ) {
			feedbackTxt.innerHTML = "An Error happened during the calculation. We are sorry. <br><br>" + err;
			bErrorHappened = true;
			return;
		}

		// clear dummy waypoint labels
		clearWayPointMarkersOnMap();
		var r = data.results[0];
		var routeDepartureTime = new Date(r.waypoints[0].estimatedDeparture).getTime() / 1000;
		var timeSpent = r.time;
		var markers= new Array();
		var markersCopy= new Array();

		// Show point markers.
		if (document.getElementById('showwaypointdetail').checked) {
			for( var j = 0; j < r.waypoints.length; j++ ) {
				var point = new H.geo.Point(r.waypoints[j].lat, r.waypoints[j].lng);
				var marker     = new H.map.DomMarker(point, { icon: createSvgMarkerIconWithImg(j + 1, r.waypoints[ j ], routeDepartureTime, timeSpent)});
				var markerCopy = new H.map.DomMarker(point, { icon: createSvgMarkerIconWithImg(j + 1, r.waypoints[ j ], routeDepartureTime, timeSpent)}); // without new objects, makers not getting added to group for line, route seperately
				markers.push( marker );
				markersCopy.push(markerCopy);
			}
		}
				
		var lineGroup= new H.map.Group();
		groups.push( lineGroup );
		lineGroup.addObjects( markers );
				
		// set tour polylines
		for( var k= 0; k < r.waypoints.length - 1; k++ ) {
			var strip = new H.geo.LineString();
			strip.pushPoint( { lat: r.waypoints[k].lat, lng: r.waypoints[k].lng } );
			strip.pushPoint( { lat: r.waypoints[k + 1].lat, lng: r.waypoints[k + 1].lng } );
			var polyline= createPolylineForIndex( strip, k );
			polyline.setArrows( true );
			lineGroup.addObject( polyline );
		}
			
		if (document.getElementById('showwaypointdetail').checked) {
			for( var i = 0; i < r.waypoints.length - 1; i++ ) {
				var lat= ( r.waypoints[i].lat + r.waypoints[i + 1].lat ) / 2;
				var lng= ( r.waypoints[i].lng + r.waypoints[i + 1].lng ) / 2;
				lineGroup.addObject( createConnectionLabel( lat, lng,
							r.interconnections[i].distance,
							r.interconnections[i].time,
							r.interconnections[i].rest,
							r.interconnections[i].waiting,
							colorForIndex( i, 0.7 ) ) );
			}
		}
				
		var routeGroup= new H.map.Group();
		groups.push( routeGroup );
		routeGroup.addObjects( markersCopy );
		for( var ii = 0; ii < r.interconnections.length; ii++ ) {
			var startPoint=     getWayPointByID( r, r.interconnections[ ii ].fromWaypoint );
			var endPoint=       getWayPointByID( r, r.interconnections[ ii ].toWaypoint );
			var estDeparture=   r.waypoints[ ii ].estimatedDeparture;
			var hasTraffic=     document.getElementById("traffic").value === "enabled";
			calculateRoute( startPoint,
							endPoint,
							globalRoutingMode,
							routeGroup,
							ii,
							hasTraffic ? estDeparture : "",
							r.interconnections[ ii ].rest,
							r.interconnections[ ii ].waiting,
							r.interconnections[ ii ].time );
		}

		feedbackTxt.innerHTML = "Result:<br>";
		var content= "";
		content+= "Completing the sequence needs " + humanReadabletime( r.time ) + " for " + (r.distance / 1000.0).toFixed(1) + "km.";
		if( r.timeBreakdown.waiting != 0 || r.timeBreakdown.service != 0 || r.timeBreakdown.rest    != 0 ) {
			content+= "<br>This includes: <table border=\"0\"><tbody>";
			if( r.timeBreakdown.driving != 0 ) { content+= " <tr><td>Driving: </td><td> " + humanReadabletime( r.timeBreakdown.driving ) + "</td></tr>"; }
			if( r.timeBreakdown.waiting != 0 ) { content+= " <tr><td>Waiting: </td><td> " + humanReadabletime( r.timeBreakdown.waiting ) + "</td></tr>"; }
			if( r.timeBreakdown.service != 0 ) { content+= " <tr><td>Service: </td><td> " + humanReadabletime( r.timeBreakdown.service ) + "</td></tr>"; }
			if( r.timeBreakdown.rest    != 0 ) { content+= " <tr><td>Rest: </td><td> "    + humanReadabletime( r.timeBreakdown.rest )    + "</td></tr>"; }
			content += "</tbody></table>";
		}
		content+= "<br><form name=\"Form1\" action=\"#\" >";
		content+= "<input type=\"radio\" name=\"routeradio\"         onclick = \"showGroup(0)\"/> Lines ";
		content+= "<input type=\"radio\" name=\"routeradio\" checked onclick = \"showGroup(1)\"/> Routes<br>";
		content+= "<br>Gray and blue sections of the result are only for better visualization.<br>Clicking on the schedule symbol on left of the waypoint labels shows the details for a waypoint.";
		content+= "<br>Labels on the connections indicate distance and time. " +
			"The keywords &laquo;resting&raquo; and &laquo;waiting&raquo; indicate that resting or waiting was necessary and how much time was spend on that purpose."
		content+= "<br>Clicking on the traffic sign in the top right corner of the map enables the display of <br>traffic patterns. Traffic patterns can be chosen for the local time.";
		content+= "</form>";
		feedbackTxt.innerHTML+= content;

		if(activeGroup == null){
			activeGroup = new Array();
		}
		activeGroup[0]= groups[groups.length-1];
		activeGroup[0].setZIndex(zIndex++);
		map.addObject( activeGroup [0] );

	
		map.getViewModel().setLookAtData({bounds: groups[ groups.length-2 ].getBoundingBox()}, false);

	};

	/**
	* updates route on radio-box click, if different routes are available
	* @param groupNumber
	*/
	var showGroup = function( groupNumber )
	{
		
		map.removeObject( activeGroup[0] );
		activeGroup[0]= groups[ groupNumber ];
		map.addObject( activeGroup [0]);
		
		
		if( (groupNumber + 2) <  groups.length){
			if(activeGroup[1])
			map.removeObject( activeGroup[1] );
		
			activeGroup[1]= groups[ groupNumber+2 ];
			map.addObject( activeGroup [1]);
		}		
		
	};

	/**
	* Lookup coordinate
	*/
	var getWayPointByID = function( result, id )
	{
		for( var i= 0; i < result.waypoints.length; i++)
		{
			if( result.waypoints[ i ].id === id )
				return result.waypoints[ i ];
		}
		console.log( "no waypoint found for id " + id );
		return null;
	};

	var destinationsEntriesArr = [];

	function startOptimize() {

		var destinations=[];
		clearWayPointMarkersOnMap();
		
		if( groups.length > 0)
		{
			if(document.getElementById("keepPrevious").checked){
				updateColor();
				// keep only the previous route (line and route),
				// remove any earlier route
				if (groups.length > 2) {
					for (var i = 0; i < groups.length - 2; i++) {
						groups[i].removeAll();
					}
					groups.shift();
					groups.shift();
				}
					
					// increasing array index for currently shown   
					// route or line for easier removal later
					if(activeGroup[1]){
						map.removeObject(activeGroup[1]);
					}
					
					// always Route to be shown whenever new calculation is triggered
					activeGroup[1] = groups[groups.length -1];
					map.removeObject(activeGroup[0]);
					map.addObject(activeGroup[1]);
					
			}else{
				for( var i= 0; i < groups.length; i++ )
				groups[ i ].removeAll();
				activeGroup= null;
				groups= [];
			}
		}

		var rawDestinations=    document.getElementById('destinations').value,
		vehicleType=        document.getElementById('vehicleType').value,
		traffic=            document.getElementById('traffic').value,
		rawEndpoint=        "",
		useEndPoint=        document.getElementById('useEnding').checked,
		departure=          "",
		truckRawParams=     truckParameters( vehicleType),
		truckParams=        "",
		restTimes=          getRestSelection();

		for( var prop in truckRawParams ) {
			truckParams+= "&" + prop + "=" + truckRawParams[prop];
        }

        globalRoutingMode=  "fastest;" + vehicleType + ";traffic:" + traffic + ";";

		var z = startDate.getTimezoneOffset();
		var zHours= z / -60;
		var zMinutes= z % -60;
		var zString;

		if( zHours >= 0 )
		{
			if( zMinutes < 0 ) { zMinutes+=60; zHours-=1; }
			zString= [ "%2b",
				padZerosNumbers( zHours.toFixed( 0 ), 2 ),
				':',
				padZerosNumbers( zMinutes.toFixed( 0 ), 2 )
				].join('');
		}
		else
		{
			zString=  [ padZerosNumbers( zHours.toFixed( 0 ), 3 /* 1 for sign */ ),
				':',
				padZerosNumbers( zMinutes.toFixed( 0 ), 2 )
				].join('');
		}
		departure= document.getElementById('departureDate').value + "T" + document.getElementById('departureTime').value + zString;
		var destinationsEntries = rawDestinations.trim().split(/\n+/g);

		// clean up empty lines at he begin
		while( destinationsEntries[ 0 ] == null || destinationsEntries[ 0 ].trim().length === 0)
			destinationsEntries.shift();

		// clean up tail
		while(      destinationsEntries[ destinationsEntries.length - 1 ] == null
			||  destinationsEntries[ destinationsEntries.length - 1 ].trim().length === 0)
			destinationsEntries.pop();

			parseGeocodesV7(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
	}

	function findPositionIdx( rawLocations ) {
		if( rawLocations.length == 0 )
			return -1;
		if( rawLocations.length == 1 )
			return 0;
		if(  rawLocations.length == 2 )
		{
			if( rawLocations[ 1 ].match( /(st:|acc:|at:|before:|st%3A|acc%3A|at%3A|before%3A)/ ) )
				return 0;
			else
				return 1;
		}
		else if(  rawLocations.length > 5 )
			return -1;
		else
			for( var i= rawLocations.length - 1; i >= 0; i-- )
			{
				if( ! rawLocations[ i ].match( /(st:|acc:|at:|before:|st%3A|acc%3A|at%3A|before%3A)/ ) )
					return i;
			}
	}

	var counter_recursion = 0;
	function parseGeocodesV7(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes){

		if(counter_recursion < destinationsEntries.length){
			var rawLocations = destinationsEntries[counter_recursion].split(";");
			/* any ASCII letter in first part? Then it is an ID */
			var positionIdx = findPositionIdx( rawLocations );
			var rawLocation= rawLocations[ positionIdx ];
			
			if(!isLatLon(rawLocation)){
				var callbackF = jsonp(searchResponse, counter_recursion);
				var searchURL = 'https://geocode.search.hereapi.com/v1/geocode?limit=1&lang=en_GB&q=' + rawLocation + '&apikey='+ api_key_geocode
				
					var latlon = "";
					$.ajax({
						url : searchURL
					}).done(function(result){
							if(result.items.length > 0){
							latlon = result.items[0].position;
							destsTemp = destinationsEntries[counter_recursion].split(";");
							if(positionIdx==0){
								destsTemp[positionIdx] = destsTemp[positionIdx] +";"+ latlon.latitude+","+latlon.longitude;
							}else{
								destsTemp[positionIdx] = latlon.latitude+","+latlon.longitude;

							}
							destinationsEntries[counter_recursion] = destsTemp.join(";");

							counter_recursion++;
							if(counter_recursion < destinationsEntries.length)
								parseGeocodesV7(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
							else{
								finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
								counter_recursion = 0;
							}
						}
						else
						{
							// address not found
							feedbackTxt.innerHTML = "The address '" + rawLocation + "' could not be geocoded.";
							bErrorHappened = true;
						}
					});
					
			}else{
				counter_recursion++;
				parseGeocodesV7(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
			}

		}else{
			finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
			counter_recursion = 0;
		}
	}
	/*function parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes){

		if(counter_recursion < destinationsEntries.length){
			var rawLocations = destinationsEntries[counter_recursion].split(";");
			/* any ASCII letter in first part? Then it is an ID 
			var positionIdx = findPositionIdx( rawLocations );
			var rawLocation= rawLocations[ positionIdx ];

			if(!isLatLon(rawLocation)){
				var callbackF = jsonp(searchResponse, counter_recursion);
				var url1 = ["https://geocoder.api.here.com/6.2/geocode.json?gen=4&jsonattributes=1&language=en-GB&maxresults=1",
					"&searchtext=",
					rawLocation,
					"&strictlanguagemode=false",
					"&app_id=",
					app_id_new,
					"&app_code=",
					app_code_new,
					"&jsoncallback=",
					callbackF].join("");
					var latlon = "";
					$.ajax({
						url : url1,
						dataType : "jsonp",
						async : false,
						type : 'get',
						data : {
							callback: callbackF
						},
						jsonp: false,
						jsonpCallback:callbackF,
						success : function (data) {
							if(data.response.view.length > 0)
							{
								if(data.response.view[0].result[0].location != null)
								{
									latlon = data.response.view[0].result[0].location.navigationPosition[0];
								}
								else
								{
									pos = result.response.view[0].result[0].place.location[0].navigationPosition[0];
								}
								destsTemp = destinationsEntries[counter_recursion].split(";");
								if(positionIdx==0){
									destsTemp[positionIdx] = destsTemp[positionIdx] +";"+ latlon.latitude+","+latlon.longitude;
								}else{
									destsTemp[positionIdx] = latlon.latitude+","+latlon.longitude;

								}


								destinationsEntries[counter_recursion] = destsTemp.join(";");

								counter_recursion++;
								if(counter_recursion < destinationsEntries.length)
									parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
								else{
									finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
									counter_recursion = 0;
								}
							}
							else
							{
								// address not found
								feedbackTxt.innerHTML = "The address '" + rawLocation + "' could not be geocoded.";
								bErrorHappened = true;
							}

						},
						error : function(xhr, status, e){
							console.log(e);
						}
					});
			}else{
				counter_recursion++;
				parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
			}

		}else{
			finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes);
			counter_recursion = 0;
		}
	}*/


	function finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes) {
		destinationsEntries= destinationsEntries.map( function( item ) { return encodeURIComponent( item ) });
		var rawStartPoint=   destinationsEntries.shift().trim();

		if(useEndPoint)
		{
			rawEndpoint= destinationsEntries.pop().trim();
		}
		
		
		calculateOptimizedRoute( globalRoutingMode, rawStartPoint, destinationsEntries, rawEndpoint, vehicleType, traffic, departure, truckParams, restTimes );
		
		
		
	}


	function isLatLon(entry){
		if(entry.indexOf(",")==-1)
			return false;
		if(entry.split(",").length!=2)
			return false;
		if(isNaN(entry.split(",")[0]) && entry.split(",")[0].toString().indexOf('.') == -1)
			return false;
		if(!isNaN(entry.split(",")[1]) && entry.split(",")[1].toString().indexOf('.') != -1)
			return true;
		return false;
	}


	function getLatLon(address, arr, pos){

		return $.ajax({
			url : url1,
			dataType : "jsonp",
			async : false,
			type : 'get',
			data : {
				callback: callbackF
			},
			jsonp: false,
			jsonpCallback:callbackF,
			success : function (data) {
				latlon = data.response.view[0].result[0].location.navigationPosition[0];
			},
			error : function(xhr, status, e){
				console.log(e);
			}
		});
	}


	/*function geocode(line, arr, pos) {
		//document.getElementById("counter").innerHTML = ["Geocoded ", arrayPos + 1, " of ", numberOfLines].join("");
		var callbackF = jsonp(searchResponse, pos);
		url = ["https://geocoder.api.here.com/6.2/geocode.json?gen=4&jsonattributes=1&language=en-GB&maxresults=1",
			"&searchtext=",
			line,
			"&strictlanguagemode=false",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=",
			jsonp(searchResponse, arrayPos)].join("");
			script = document.createElement("script");
			script.src = url;
			script1 = document.body.appendChild(script);
	}*/

	var searchResponse = function(data, arr, pos) {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
	};


	//using this wrapper function we can send back an additional argument with the callback.
	function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}

	/**
	* Function collects truck attributes in one object
	*/
	var truckParameters= function( vehicleType )
	{
		var p={};

		if( vehicleType === "truck" )
		{
			var lWeight = parseFloat(document.getElementById("limitedWeight").value);
			var aWeight = parseFloat(document.getElementById("weightPerAxle").value);
			var height = parseFloat(document.getElementById("height").value);
			var width = parseFloat(document.getElementById("width").value);
			var length = parseFloat(document.getElementById("length").value);

			if(isNaN(lWeight))  lWeight = 0;
			if(isNaN(aWeight))  aWeight = 0;
			if(isNaN(height))   height = 0;
			if(isNaN(width))    width = 0;
			if(isNaN(length))   length = 0;

			var hazard = [];
			if(document.getElementById('explosive').checked)
				hazard.push("explosive");
			if(document.getElementById('gas').checked)
				hazard.push("gas");
			if(document.getElementById('flammable').checked)
				hazard.push("flammable");
			if(document.getElementById('combustible').checked)
				hazard.push("combustible");
			if(document.getElementById('organic').checked)
				hazard.push("organic");
			if(document.getElementById('poison').checked)
				hazard.push("poison");
			if(document.getElementById('radioActive').checked)
				hazard.push("radioActive");
			if(document.getElementById('corrosive').checked)
				hazard.push("corrosive");
			if(document.getElementById('poisonousInhalation').checked)
				hazard.push("poisonousInhalation");
			if(document.getElementById('harmfulToWater').checked)
				hazard.push("harmfulToWater");
			if(document.getElementById('other').checked)
				hazard.push("other");

			hazard = hazard.join(",");

			if( hazard.length > 0 )     p["shippedHazardousGoods"]= hazard;
			if( aWeight > 0 )           p["weightPerAxle"]= aWeight;
			if( lWeight > 0 )           p["limitedWeight"]= lWeight;
			if( height > 0 )            p["height"]= height;
			if( width > 0 )             p["width"]= width;
			if( length > 0 )            p["length"]= length;

			// Routing 6.2:
			//p["hasTrailer"]= document.getElementById('hasTrailer').checked ? "true" : "false";

			//Routing 7.2:
			p["trailersCount"]= document.getElementById('hasTrailer').checked ? "1" : "0";
		}

		return p;
	};

	/**
	*  Function calculates single routes for display purposes only
	*/
	var calculateRoute= function( startPoint, endPoint, currentMode, group, num, departure, wseRestTime, wseWaitingTime, wseRouterTime )
	{
	
		
		var wp0= startPoint.lat + "," + startPoint.lng,
		wp1= endPoint.lat + "," + endPoint.lng;
		var calculateRouteParams = {
			'origin': wp0,
			'destination': wp1,
			'routingMode': 'fast',
			'departure': departure,
			'transportMode' : 'car',
			'return':'polyline,actions,instructions,summary,passthrough,routeHandle',
			'apikey': api_key_jp
		},
		onResultV8 = function(result){
			var strip = new H.geo.LineString(),
			route = result.routes[0],
			shape = H.util.flexiblePolyline.decode(route.sections[0].polyline).polyline,
			i,
			l = shape.length;
			var temp = [];
			for(x=0; x < shape.length;x++){
				temp.push(shape[x][0] + "," + shape[x][1]);
			}
			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, temp[i].split(',').map(function(item) { return parseFloat(item); }));
			}
			var polyline = createPolylineForIndex( strip, num );
			polyline.setArrows( true );
			var s= strip.getPointCount(),
			point= new H.geo.Point( 0, 0),
			cPoint= strip.extractPoint ( Math.floor(s / 2), point),
			lLat= cPoint.lat,
			lLng= cPoint.lng;

			group.addObject( polyline );
			if (document.getElementById('showwaypointdetail').checked) {
				group.addObject( createConnectionLabel( lLat, lLng,  result.routes[0].sections[0].summary.length,
					wseRouterTime, wseRestTime, wseWaitingTime, colorForIndex( num, 0.7 ) ) );
			}
		},
		/*onResult = function(result) {

				var strip = new H.geo.LineString(),
				shape = result.response.route[0].shape,
				l = shape.length;

				for(var i = 0; i < l; i++)
				{
					strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				}
				var polyline = createPolylineForIndex( strip, num );
				polyline.setArrows( true );

				var s= strip.getPointCount(),
				point= new H.geo.Point( 0, 0),
				cPoint= strip.extractPoint ( Math.floor(s / 2), point),
				lLat= cPoint.lat,
				lLng= cPoint.lng;

				group.addObject( polyline );
				if (document.getElementById('showwaypointdetail').checked) {
					group.addObject( createConnectionLabel( lLat, lLng,  result.response.route[0].summary.distance,
						wseRouterTime, wseRestTime, wseWaitingTime, colorForIndex( num, 0.7 ) ) );
				}
		},*/
		onError = function(error) {
			console.log("fail:" + error);
		};

		/*var truckParams= truckParameters( document.getElementById('vehicleType').value );
		for( var p in truckParams )
		{
			calculateRouteParams[ p ]= truckParams[ p ];
		}*/
		encodedUrl = Object.keys(calculateRouteParams).map(function(k) {
			return encodeURIComponent(k) + '=' + encodeURIComponent(calculateRouteParams[k].trim())
		}).join('&');
		$.ajax({
			url: "https://router.hereapi.com/v8/routes?"+encodedUrl
		}).done(function(result){
			console.log('route calculation done!!')
			onResultV8(result);
		});
		//router.calculateRoute(calculateRouteParams, onResult, onError);
	};

	function getNameFromEventClass(e) {

		var useServiceAsWork=   document.getElementById("rest-custom-serviceTimes").value === null
		|| document.getElementById("rest-custom-serviceTimes").value === "work";

		switch (e) {
			case 'arr': return 'Arrival at Waypoint';
			case 'dep': return 'Departure from Waypoint';
			case 'at': return 'Appointment Matched';
			case 'accStarts': return 'Matching Access Time Starts';
			case 'accEnds': return 'Matching Access Time Ends';
			case 'stStarts': return useServiceAsWork ? 'Service Time Starts' : 'Service Time or Resting Starts';
			case 'stEnds': return useServiceAsWork ? 'Service Time Ends' : 'Service Time or Resting Ends';
			case 'before': return 'Before Constraints';
			default: return 'Unknown Event';
		}
	}

	function getReadableConstraintNameFromEventClass(e) {

		var useServiceAsWork=   document.getElementById("rest-custom-serviceTimes").value === null
		|| document.getElementById("rest-custom-serviceTimes").value === "work";

		switch (e.name) {
			case 'arr': return 'Arrival at Waypoint';
			case 'dep': return 'Departure from Waypoint';
			case 'at': return 'Appointment Matched';
			case 'accStarts': return 'Matching Access Time Starts';
			case 'accEnds': return 'Matching Access Time Ends';
			case 'stStarts': return useServiceAsWork ? 'Service Time Starts' : 'Service Time or Resting Starts';
			case 'stEnds': return useServiceAsWork ? 'Service Time Ends' : 'Service Time or Resting Ends';
			case 'before': return e.constraintDescription ? 'Before ' + e.constraintDescription : 'Before Constraints';
			default: return 'Unknown Event';
		}
	}

	function toggleWaypointDetails(num, lat, lng, timelineEvents) {
		var numEvents = timelineEvents.length;
		if (numEvents === 0) {
			return;
		}
		var minorThanGraph = {
			at: ['stEnds', 'dep', 'accEnds'],
			stStarts: ['at'],
			arr: ['stStarts', 'dep'],
			accStarts: ['arr'],
			stEnds: ['dep']
		};

		timelineEvents.sort(function(a, b) {
			if (a.time === b.time) {
				if (minorThanGraph[a.name] && $.inArray(b.name, minorThanGraph[a.name]) >= 0){
					return -1;
				}
				if (minorThanGraph[b.name] && $.inArray(a.name, minorThanGraph[b.name]) >= 0){
					return 1;
				}
			}
			return a.time - b.time;
		});
		var list = $('<ul class="timeline">');
		for (var i = 0; i < numEvents; i++) {
			var e = timelineEvents[i];
			if(e.time){ // in case of before constraint we do not show any time
				var eventDate = new Date(e.time * 1000);
				list.append('<li class="' + e.name + '">' + eventDate.toDateString() + ' ' + eventDate.toTimeString() + ": " + getReadableConstraintNameFromEventClass(e) + '</li>');	
			}else{
				list.append('<li class="' + e.name + '">' + getReadableConstraintNameFromEventClass(e) + '</li>');	
			}
			
		}

		var content = $('<div>');
		content.append(list);
		var bubble =  new H.ui.InfoBubble({lat: lat, lng: lng}, { content: content.html() });
		ui.addBubble(bubble);
	}

	/**
	* Draws pins with timelines for destinations.
	* @returns {H.map.DomIcon}
	*/
	var createSvgMarkerIconWithImg = function(num, waypoint, routeDepartureTime, routeTotalTime)
	{
		var estDep = waypoint.estimatedDeparture;
		var estArv = waypoint.estimatedArrival;
		var spent= ( estArv !== null ? ("Arrive: " + estArv.substr(11,5) + "  ") : ''  ) + ( estDep !== null ? "Leave: " + estDep.substr(11,5) : '' );
		var constraintsDescr = waypoint.fulfilledConstraints[0] || null;
		var line1 = waypoint.id;
		var line2 = spent.length > 2 ? spent : null;

		var div = document.createElement("div");
		div.style.marginTop = "-57px";
		div.style.marginLeft = "-23px";

		var timelineEvents = [];

		var timeline = '<rect id="label-box" ry="3" rx="3" stroke="#000000" stroke-width="1" fill-opacity="0.6" height="9" width="188" y="0" x="17.5" fill="white"/>';

		var totalLenght = 188;
		var startX = 17.5;

		var completedWidth;
		if (waypoint.estimatedDeparture) {
			var waypointDepartureTime = new Date(waypoint.estimatedDeparture).getTime() / 1000;
			timelineEvents.push({ name: 'dep', time: waypointDepartureTime });
			var waypointDepartureTimeOffset = waypointDepartureTime - routeDepartureTime;
			completedWidth = (totalLenght / routeTotalTime * waypointDepartureTimeOffset);
		} else {
			completedWidth = totalLenght;
		}
		timeline += '<rect id="label-box" ry="3" rx="3" stroke-width="0" fill-opacity="0.6" height="9" width="' + completedWidth + '" y="0" x="17.5" fill="#121212" />';

		// Arrival red line, not for the first waypoint.
		if (waypoint.estimatedArrival) {
			var waypointArrivalTime = new Date(waypoint.estimatedArrival).getTime() / 1000;
			timelineEvents.push({ name: 'arr', time: waypointArrivalTime });
			var waypointArrivalTimeOffset = waypointArrivalTime - routeDepartureTime;
			var arrX = startX + (totalLenght / routeTotalTime * waypointArrivalTimeOffset);
			var arrBox = '<rect id="label-box" stroke-width="0" height="9" width="2" y="0" x="' + arrX + '" fill="red" />';
		}

		if (constraintsDescr) {
			var constraints = constraintsDescr.split(';');

			var accBoxes = '';
			var stBox = '';
			var atBox = '';

			for (var i = 0; i < constraints.length; i++) {
				var sepIndex = constraints[i].indexOf(':');
				var constraintType = constraints[i].substr(0, sepIndex);
				var constraint = constraints[i].substr(sepIndex + 1);
				switch (constraintType) {
					case 'acc':
						// Only one supported ad the moment. When we have more, just position them at different y and make the st higher.
						var accessStart = constraint.split('|')[0];
						var accessEnd = constraint.split('|')[1];

						var days = { 'mo': 1, 'tu': 2, 'we': 3, 'th': 4, 'fr': 5, 'sa': 6, 'su': 0 };
						var constraintDay = days[accessStart.substring(0, 2)];
						var arrivalDate = new Date(waypoint.estimatedArrival);
						var firstPart = waypoint.estimatedArrival.split('T')[0];

						function getMinAccessTimeOffset() {
							var nextCheckDate = new Date(firstPart + 'T' + accessStart.substring(2));

							while (arrivalDate.getDay() !== nextCheckDate.getDay() || arrivalDate < nextCheckDate) {
								nextCheckDate.setDate(nextCheckDate.getDate() - 1);
							}

							var offset = nextCheckDate.getTime() / 1000 - routeDepartureTime;
							return offset < 0 ? 0 : offset;
						}

						function getMaxAccessTimeOffset() {
							var nextCheckDate = new Date(firstPart + 'T' + accessEnd.substring(2));

							while (arrivalDate.getDay() !== nextCheckDate.getDay() || arrivalDate > nextCheckDate) {
								nextCheckDate.setDate(nextCheckDate.getDate() + 1);
							}

							var offset = nextCheckDate.getTime() / 1000 - routeDepartureTime;
							return offset > routeTotalTime ? Number(routeTotalTime) : offset;
						}

						var leftMatchingTimeOffset = getMinAccessTimeOffset();
						timelineEvents.push({ name: 'accStarts', time: leftMatchingTimeOffset + routeDepartureTime });

						var rightMatchingTimeOffset = getMaxAccessTimeOffset();

						timelineEvents.push({ name: 'accEnds', time: rightMatchingTimeOffset + routeDepartureTime });
						var acc = rightMatchingTimeOffset - leftMatchingTimeOffset;


						var accX = startX + (totalLenght / routeTotalTime * leftMatchingTimeOffset);
						var accWidth = (totalLenght / routeTotalTime * acc);

						accBoxes += '<rect id="label-box" stroke-width="0" ry="1" rx="1" height="2" width="' + accWidth + '" y="6" x="' + accX + '" fill="#59b354" />';
						break;
					case 'st':
						var st = Number(constraint);
						var stWidth =  (totalLenght / routeTotalTime * st);
						break;
					case 'at':
						var at = new Date(constraint);
						var waypointConstrainedArrivalTime = at.getTime() / 1000;
						timelineEvents.push({ name: 'at', time: waypointConstrainedArrivalTime });
						var waypointConstrainedArrivalTimeOffset = waypointConstrainedArrivalTime - routeDepartureTime;

						var atX = startX + (totalLenght / routeTotalTime * waypointConstrainedArrivalTimeOffset);
						atBox = '<rect id="at-constraint-box-' + num + '" stroke-width="0" height="9" width="2" y="0" x="' + atX + '" fill="yellow" />';
						break;
					case 'before':
						var beforeConstraint = constraint;
						timelineEvents.push({ name: 'before', time: '', constraintDescription: beforeConstraint});
						break;
					default:
						console.error('Cannot visualize unsupported constraint: ' + constraintType);
				}
			}

			if (st) {
				// If 'at' constraint is matched, service time starts there.
				var stX = atX || arrX;
				if (atX) {
					timelineEvents.push({ name: 'stStarts', time: waypointConstrainedArrivalTime });
					timelineEvents.push({ name: 'stEnds', time: waypointConstrainedArrivalTime + st });
				} else {
					timelineEvents.push({ name: 'stStarts', time: waypointArrivalTime });
					timelineEvents.push({ name: 'stEnds', time: waypointArrivalTime + st });
				}
				stBox = '<rect id="at-constraint-box-' + num + '" stroke-width="0" height="4" width="' + stWidth + '" y="1" x="' + stX + '" fill="#1b5fcc" />';
			}

			// SVG z-order depends on relative order of elements.
			timeline += accBoxes + stBox + atBox + arrBox;

		}


		var svg = '<svg overflow="visible" width="220" height="900" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box-' + num + '" ry="3" rx="3" stroke="#000000" height="30" width="155" y="11" x="50" fill="'+wayPointColor+'"/>'+
			'<a onclick=\'toggleWaypointDetails(' + num + ', ' + waypoint.lat + ', ' + waypoint.lng + ', ' + JSON.stringify(timelineEvents) + ');\' xlink:href="#">' +
			'<image width="16" height="16" x="54" y="14"  xlink:href="images/examples/history.svg" />' +
			'</a>' +
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="70" stroke-width="0" fill="#000000">__line1__</text>' +
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="9" font-weight="bold" y="37" x="55" stroke-width="0" fill="#000000">__line2__</text>' +
			'<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,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" />' +
			'<text id="label-text" xml:space="preserve" text-anchor="middle" font-family="Sans-serif" font-size="18" font-weight="bold" y="33" x="33" stroke-width="0" fill="#ffffff">__num__</text>'+
			(timeline || '') +
			'</g>' +
			'</svg>';
			
			
			

		svg = svg.replace( /__line1__/g, line1 );
		svg = svg.replace( /__line2__/g, line2 !== null ? line2 :'' );
		svg = svg.replace( /__num__/g, num );
		div.innerHTML = svg;

		return new H.map.DomIcon(div, {
			width: 33,
			height: 33,
			drawable: false
		});
	};

	/**
	* Draws pins for destinations
	* @param line1
	* @returns {H.map.DomIcon}
	*/
	var createSimpleSvgMarkerIconWithImg = function(num, line1, line2)
	{
		var div = document.createElement("div");
		div.style.marginTop = "-57px";
		div.style.marginLeft = "-23px";

		var svg =      '<svg width="220" height="56" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="30" width="160" y="11" x="45" fill="#ffffff"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="55" stroke-width="0" fill="#000000">__line1__</text>' +
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="9" font-weight="bold" y="34" x="55" stroke-width="0" fill="#000000">__line2__</text>' +
			'<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,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" />' +
			'<text id="label-text" xml:space="preserve" text-anchor="middle" font-family="Sans-serif" font-size="18" font-weight="bold" y="33" x="33" stroke-width="0" fill="#ffffff">__num__</text>'+
			'</g>' +
			'</svg>';

		svg = svg.replace( /__line1__/g, line1 );
		svg = svg.replace( /__line2__/g, line2 !== null ? line2 :'' );
		svg = svg.replace( /__num__/g, num );
		div.innerHTML = svg;

		return new H.map.DomIcon(div, {
			width: 33,
			height: 33,
			drawable: false
		});
	};

	/**
	*   TextMarkers for labeling on interconnection
	*/
	var createSvgMarkerLabel = function( inscriptions, svgWidth, svgBorderHeight, color )
	{
		var svgHeight= 2*svgBorderHeight + (inscriptions.length/2) * 11;
		var div = document.createElement("div");
		var svg='<svg width="' + (svgWidth + 1) + '" height="' + (svgHeight + 1) + '" xmlns="http://www.w3.org/2000/svg">' +
			'<rect fill="'+ color +'" x="0.5" y="0.5" rx="5" ry="5" width="' + svgWidth + '" height="' + svgHeight + '"' +
			' style="stroke:#FFF;stroke-width:1;"/>' +
			'<text x="8" y="' + 2 + '" fill="#FFF" style="font-weight:normal;font-family:sans-serif;font-size:10px;">';

		var maxLen= 0;
		for( var i= 0; i < inscriptions.length; i+=2 ) 
		{
			svg+= '<tspan x="6" dy="1.2em">' + inscriptions[ i ] + '</tspan>' +  '<tspan x="53" dy="0em">' 
				  +  inscriptions[ i + 1 ] + '</tspan>';
			if( inscriptions[ i + 1 ].length > maxLen ) maxLen= inscriptions[ i + 1 ].length;
		}
		svg+= '</text></svg>'

		div.innerHTML = svg;

		var widthExt= maxLen > 5 ? (maxLen - 5 ) * 6 : 0;
		return new H.map.DomIcon( div, {
			width: svgWidth + widthExt,
			height: svgHeight,
			drawable: false
		});
	};

	var createConnectionLabel = function( lat, lng, distance, basetime, rest, wait, color )
	{
		var inscriptions= ["Distance:", humanReadableDist( distance ),  "Time:", humanReadabletimeShort(basetime)];
		if( rest !== 0 )    { inscriptions.push( "Resting:" ); inscriptions.push( humanReadabletimeShort( rest ) ) };
		if( wait !== 0 )    { inscriptions.push( "Waiting:" ); inscriptions.push( humanReadabletimeShort( wait ) ) };

		var label = new H.map.DomMarker(
			new H.geo.Point(lat, lng),
			{
				icon: createSvgMarkerLabel( inscriptions, 90, 5, color )
			});

			return label;
	};

	function updateColor(){
		if(currentColor.indexOf("rgba(80,80,80,") > -1){
			currentColor = "rgba(0,85,170,";
			wayPointColor = "#A9D4FF";
		}else{
			currentColor = "rgba(80,80,80,";
			wayPointColor = "#C7C5C5";
		}
	}


	var colorForIndex= function( num, alpha )
	{
		return currentColor +  alpha + ")";
		
	};

	/**
	* Creates poly lines for interconnections
	* @param strip
	* @param num
	* @returns {H.map.Polyline}
	*/
	var createPolylineForIndex = function( strip, num )
	{
		var polyline= new H.map.Polyline(strip, {
			style:
			{
				lineWidth: 7,
				strokeColor: colorForIndex( num, 0.6 ),
				fillColor:   colorForIndex( num, 0.4 )
			}
		});
		
		// to give a highlight to select
		// polyline in case multiple routes present
		polyline.addEventListener('pointerenter', function(e) {
						var style = e.target.getStyle();
						var newStyle= style.getCopy({lineWidth:10});
						e.target.setStyle(newStyle);
					
					});
		polyline.addEventListener('pointerleave', function(e) {
						var style = e.target.getStyle();
						var newStyle= style.getCopy({lineWidth:7});
						e.target.setStyle(newStyle);
					
		});
		return polyline;
	};

	var humanReadabletimeShort= function( timeSeconds )
	{
		if( timeSeconds < 60)
			return timeSeconds + "s ";
		else
			return 	  padZerosNumbers( Math.floor( (timeSeconds / 3600) ), 2) + ":"
					+ padZerosNumbers( Math.floor( (timeSeconds /   60) % 60), 2);
	};
	
	var humanReadableDist= function( distMeters )
	{
		if( distMeters < 1000 )
			return distMeters + "m";
		else
			return ( distMeters / 1000 ).toFixed( 1 ) + "km";
	};

	var humanReadabletime= function( timeSeconds )
	{
		if( timeSeconds < 60)
			return timeSeconds + "s ";
		if( timeSeconds < 3600 )
			return Math.floor( (timeSeconds / 60) ) + "min " + timeSeconds % 60 + 's';
		else
			return Math.floor( (timeSeconds / 3600) ) + "h " + Math.floor((timeSeconds / 60) % 60) + "min " + timeSeconds % 60 + 's';
	};


	/**
	This method clears the waypoint markers on the map
	*/
	function clearWayPointMarkersOnMap()
	{
		labels.removeAll();
	}