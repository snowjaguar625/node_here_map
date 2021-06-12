// author DomSchuette
	// (c) HERE 2017
  
  
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
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

  	// Do not draw under control panel
  	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	
  	new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
  	var ui = H.ui.UI.createDefault(map, maptypes); // add UI

  	// Add JS API Release information
  	releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;
  	// add MRS Release information
  	loadMRSVersionTxt();

  	window.addEventListener('resize', function () {
    	map.getViewPort().resize();
  	});
	
	// Group for map objects
  	var objContainer = new H.map.Group();
  	map.addObject(objContainer);
	
	var currentBubble = null,
		linkIds = [],
		roadGeometry = {},
		trafficSign = {},
		roundabouts = {},
		admin = {};
	
	// Create a PDE Manager instance
	var layers = [];
	pdeManager = new PDEManager(app_id, app_code, layers);
	
	var loadFromFile = function (filename) {
		var req = new XMLHttpRequest();
		req.open('GET', '/sample_data/' + filename);
		req.onreadystatechange = function() {
			if (req.readyState != XMLHttpRequest.DONE) return;
			document.getElementById('tracetextarea').value = req.responseText;
			submitTrace();
		}
		req.send();
	}
	
	function reset() {
		var traceTextArea = document.getElementById('tracetextarea');
		traceTextArea.value = '';
		objContainer.removeAll();

		linkIds = [];
		roadGeometry = {},
		trafficSign = {},
		roundabouts = {},
		admin = {},
		railway_crossing = 0;

		document.getElementById("warningstextarea").value = '';
		document.getElementById("outputtextarea").value = '';
	}
	
	function getJSONP(url, callback) {
		var cbnum = "s" + getJSONP.counter++;
		var cbname = "getJSONP." + cbnum;
		url += "&callback=" + cbname;
		var script = document.createElement("script");
		getJSONP[cbnum] = function(response) {
			try {
				callback(response);
			}
			finally {
				delete getJSONP[cbnum];
				script.parentNode.removeChild(script);
			}
		};
		script.src = url;
		script.onerror = function(data)	{
			alert("Could not connect to RME.\nCheck connectivity and trace size.");
		}
		document.body.appendChild(script);
	} getJSONP.counter = 0;	
	
	var submitTrace = function ()
	{
		objContainer.removeAll();
		document.getElementById("warningstextarea").value = '';
		document.getElementById("outputtextarea").value = '';
		
		// reset the dictionaries to safe memory
		linkIds = [];
		roadGeometry = {},
		trafficSign = {},
		roundabouts = {},
		admin = {},
		railway_crossing = 0;

		
		var zip = new JSZip();
		zip.file("temp.zip", document.getElementById('tracetextarea').value);
		var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
		// if there is an app_id specified in the URL then use it, otherwise use the default
		var url = document.getElementById('RMEURL').value + "&file=" + encodeURIComponent(content);
        var appIdRegEx= /[\?&]app_id=/i;
        var appCodeRegEx= /[\?&]app_code=/i;
        if( url.search( appIdRegEx ) === -1 && url.search( appCodeRegEx ) === -1 ) {
			if( ! url.endsWith( "&" ) ) url= url.concat( "&" );
            url= url.concat( "app_id=" + app_id + "&app_code=" + app_code );                
        }
        if( ( url.search( appIdRegEx ) >= 0 && url.search( appCodeRegEx ) < 0 ) || ( url.search( appIdRegEx ) < 0 && url.search( appCodeRegEx ) >= 0 ) ) {
            alert('If you provide credentials in the RME URL field, please provide both app_id AND app_code.');                
            return;
        }
		getJSONP(url, gotRouteMatchResponse);
	};
	document.getElementById('submittracebutton').onclick = submitTrace;
	
	var createIcon = function (color, text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="16px">' +
			'<line x1="14"  y1="16" x2="14" y2="9" stroke="' + color + '"/>' +
			'<text font-size="10" x="14" y="8" text-anchor="middle" fill="' + color + '">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 14, y : 16}});
	};
	
	var gotRouteMatchResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		// draw the route
		linkIds = respJsonObj.RouteLinks;
		for (var l = 0; l < linkIds.length; l++) {
			var coords1 = linkIds[l].shape.split(" ");
			var coords2 = new H.geo.LineString();
			for (var c = 0; c < coords1.length; c += 2)
				coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
			objContainer.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}}));
		}

		// draw the original and the matched trace points
		tracePoints = respJsonObj.TracePoints;
		for (var l = 0; l < tracePoints.length; l++) {
			var p = tracePoints[l];
			objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon("#000000", l)}));
			objContainer.addObject(new H.map.Marker(new H.geo.Point(p.latMatched, p.lonMatched), {icon: createIcon("#00FF00", l)}));
		}

		map.addObject(objContainer);
		map.getViewModel().setLookAtData({bounds: objContainer.getBoundingBox()}, false);
		
		var warningsArea = document.getElementById("warningstextarea");
		if(respJsonObj.Warnings.length === 0)
		{
			warningsArea.value += 'No Warnings.';
		}
		else
		{
			for(var d = 0; d < respJsonObj.Warnings.length; d++)
			{
				if(0 !== d) warningsArea.value += '\n';
				warningsArea.value += respJsonObj.Warnings[d].text;
			}
		}
		
		var layers = new Object();
		
		// Tunnel (Chapter 4.4.3) 	Total number found (ROAD_GEOM_FCn)
		// Bridge (Chapter 4.4.3) 	Total number found  (ROAD_GEOM_FCn)
		layers["ROAD_GEOM_FC"] = {callback: pdeLinkGeomertyResponse };
		layers["TRAFFIC_SIGN_FC"] = {callback: pdeTrafficSignResponse};
		layers["ROUNDABOUT_FC"] = {callback: pdeRoundaboutResponse};
		layers["ROAD_ADMIN_FC"] = {callback: pdeRadminResponse};

/*

Overpass (Chapter 4.4.27) 	Total number found 
Underpass (Chapter 4.4.27) 	Total number found 
Railway crossings (Chapter 8.3.9.1) 	Total number found (TRAFFIC_SIGN_FCn)
Street type (Country road, highway, …) 
Number of lanes in the same direction (Chapter 4.4.20) 	List of different lane numbers, if number changes 
Highway entrances 	Total number found 
Highway exits (Chapter 9.5.42) 	Total number found 
Road markings (color, type) 
Road boundaries (???) 
Lane width, if it differs from the country specific default value (Chapter 4.5.2.11) 	Width in Centimeters 

Country (Chapter 5.3.1.6) 	ISO Country Code  (LINK_ATTRIBUTE_FCn)
Country (Chapter 9.7) 	Name (ADMIN_PLACE_n)
State (Chapter 9.7) 	Name 
Environment (City, Rural area, wooded area, desert, …) (LINK_ATTRIBUTE_FCn, Urbanflag, )
Street ID (Chapter 9.7.2.1) 	Street name, national highway (“Bundesstraße”), Highway (ROAD_NAME_FCn)
City (Chapter 9.7) 	Name 
Construction zone (Chapter 6.4.24) 	Total number (only long term) 
*/
		
		pdeManager.setLayers(layers);
		pdeManager.setLinks(respJsonObj.RouteLinks);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
		pdeManager.start();
				
		pdeManager.setLinks(respJsonObj.RouteLinks);
	};
	
	var pdeLinkGeomertyResponse = function(resp)
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

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			roadGeometry[linkId]=resp.Rows[r];
		}
	}
	
	var pdeRoundaboutResponse = function(resp)
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

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			roundabouts[linkId]=resp.Rows[r];
		}
	}
	
	var pdeRadminResponse = function(resp)
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

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			admin[linkId]=resp.Rows[r];
		}
	}
	
	
	var pdeTrafficSignResponse = function(resp)
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
			var linkId = parseInt(resp.Rows[r].LINK_IDS);
			trafficSigns[linkId]=resp.Rows[r];
			
			var conditionType = resp.Rows[r].CONDITION_TYPE;
			var signType = resp.Rows[r].TRAFFIC_SIGN_TYPE == null ? "0" : resp.Rows[r].TRAFFIC_SIGN_TYPE;
			var linkIds = resp.Rows[r].LINK_IDS.split(','); // variable speed signs have 2 links, all others just one link
			var linkId = parseInt(linkIds[0]);
			var routeLink = pdeManager.getRouteLinks()[linkId]; // the link, including direction (+/-), must be on the route
			if (routeLink == null)
			{
				continue;
			}
			if (conditionType == 11) // the variable speed sign condition applies only, if both links are on the route, and in the correct direction
			{
				var linkId2 = parseInt(linkIds[1]);
				var routeLink2 = pdeManager.getRouteLinks()[linkId2];
				if (routeLink2 == null)
				{
					continue;
				}
			}

			var strip = new H.geo.LineString(),
			shape = routeLink.shape.split(' '),
			i,
			l = shape.length;

			for(i = 0; i < l; i += 2)
			{
				strip.pushPoint(new H.geo.Point(shape[i], shape[i+1]));
			}

			var color = "rgba(255, 10, 50, 0.7)";

			if(conditionType == "17")
			{
				while(signType.length < 3)
					signType = "0" + signType;
			}

			// Note: The router returns the geometry points of a link in route driving direction. He doesn't start with the reference node coordinate.
			// If linkID > 0: Driving from ref node. Sign is posted at the non-ref node of the link. Last coordinate returned from router.
			// If linkID < 0: Driving to   ref node. Sign is posted at the     ref node of the link. Last coordinate returned from router.
			var stripArr = strip.getLatLngAltArray();
			var point = new H.geo.Point(stripArr[stripArr.length -3], stripArr[stripArr.length -2]);

			var signMarker;
			var trafficSignIdentifier=conditionType + "_" + signType;

			if(trafficIcons[trafficSignIdentifier + "_eu"]){
				signMarker = new H.map.Marker(point,
					{
						icon: trafficIcons[trafficSignIdentifier + "_eu"]
					});
			}else{
				signMarker = new H.map.Marker(point,
					{
						icon: trafficIcons["11_000_eu"]
					});
			}
			
			if(trafficSignIdentifier == "17_032" || trafficSignIdentifier == "18_0" || trafficSignIdentifier == "17_009")
				railway_crossing += 1;
			
			// Traffic sign description available in PDE documentation
			var sign = trafficSigns[trafficSignIdentifier];
			signMarker.$CONDITION_ID = resp.Rows[r].CONDITION_ID;
			signMarker.$TRAFFIC_SIGN = sign;
			
			if(trafficSign[sign] == undefined)
				trafficSign[sign] = 1;
			else
				trafficSign[sign] += 1;
			
			signMarker.addEventListener("pointerdown", function(e)
			{
				if(currentBubble)
					ui.removeBubble(currentBubble);
				var html =  '<div>'+
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Condition ID: ' + e.target.$CONDITION_ID +'</p>'+
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Sign Type: ' + e.target.$TRAFFIC_SIGN +'</p>'+
					'</div>';

				var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

				currentBubble = new H.ui.InfoBubble(pos, { content: html });
				ui.addBubble(currentBubble);
			});
			objContainer.addObject(signMarker);
		}
	}
	
	var pdeManagerFinished = function(resp)
	{
/*
Overpass (Chapter 4.4.27) 	Total number found 
Underpass (Chapter 4.4.27) 	Total number found 

Street type (Country road, highway, …) 
Number of lanes in the same direction (Chapter 4.4.20) 	List of different lane numbers, if number changes 
Highway entrances 	Total number found 
Highway exits (Chapter 9.5.42) 	Total number found 
Road markings (color, type) 
Road boundaries (???) 
Lane width, if it differs from the country specific default value (Chapter 4.5.2.11) 	Width in Centimeters 

Country (Chapter 5.3.1.6) 	ISO Country Code  (LINK_ATTRIBUTE_FCn)
Country (Chapter 9.7) 	Name (ADMIN_PLACE_n)
State (Chapter 9.7) 	Name 
Environment (City, Rural area, wooded area, desert, …) (LINK_ATTRIBUTE_FCn, Urbanflag, )
Street ID (Chapter 9.7.2.1) 	Street name, national highway (“Bundesstraße”), Highway (ROAD_NAME_FCn)
City (Chapter 9.7) 	Name 
Construction zone (Chapter 6.4.24) 	Total number (only long term) 
*/

		var bridgeFlagged = 0,
			tunnelFlagged = 0,
			roundaboutFlagged = 0,
			onBridge = false, 
			inTunnel = false, 
			stdcolor = "rgba(18, 65, 145, 0.7)";
			tunnelColor = "rgba(0, 0, 0, 0.7)";
			bridgeColor = "rgba(255, 0, 0, 0.7";
			color = stdcolor;

		for (var l = 0; l < linkIds.length; l++) 
		{
			var coords1 = linkIds[l].shape.split(" "),
				coords2 = new H.geo.LineString();
				
			for (var c = 0; c < coords1.length; c += 2)
			{
				coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
			}
			
			if(roadGeometry[linkIds[l].linkId] === undefined)
				linkIds[l].linkId *= -1;
			
			if(roadGeometry[linkIds[l].linkId].TUNNEL == "Y" && inTunnel == false)
			{
				tunnelFlagged += 1;
				inTunnel = true;
				color = tunnelColor;
			}
			else if(roadGeometry[linkIds[l].linkId].TUNNEL == "N" && inTunnel)
			{
				inTunnel = false;
				color = stdcolor;
			}
			
			if(roadGeometry[linkIds[l].linkId].BRIDGE == "Y" && onBridge == false)
			{
				bridgeFlagged += 1;
				onBridge = true;
				color = bridgeColor
			}
			else if(roadGeometry[linkIds[l].linkId].BRIDGE == "N" && onBridge)
			{
				onBridge = false;
				color = stdcolor;
			}
			
			if(roundabouts[linkIds[l].linkId] !== undefined)
				roundaboutFlagged += 1;
			
			var polyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: color, lineJoin: "round"}});

			polyline.$tunnel = roadGeometry[linkIds[l].linkId].TUNNEL;
			polyline.$bridge = roadGeometry[linkIds[l].linkId].BRIDGE;
			polyline.$streetName = roadGeometry[linkIds[l].linkId].NAME;
			polyline.$streetNames = roadGeometry[linkIds[l].linkId].NAMES;
			polyline.$longHaul = roadGeometry[linkIds[l].linkId].LONG_HAUL;
			polyline.$linkID = linkIds[l].linkId;

			// if(linkIds[l].linkId == 1164495126) debugger;
			
			// add events
			polyline.addEventListener('pointerenter', onPointerEnter);
			polyline.addEventListener('pointerleave', onPointerLeave);
			
			objContainer.addObject(polyline);
		}
		
		var str = "Signs: \r\n";
		for(var key in trafficSign)
		{
			str += key + " : " + trafficSign[key] + "\r\n";
		}
		str += "--------------------------\r\n";
		
		str += "Flags: \r\n";
		str += "Bridge : " + bridgeFlagged + "\r\n";
		str += "Tunnel : " + tunnelFlagged + "\r\n";
		str += "RailWay Crossings : " + railway_crossing + "\r\n";
		str += "Links in Roundabouts : " + roundaboutFlagged + "\r\n";
		
		
		
		document.getElementById("outputtextarea").value = str;
	}
	
		// show info bubble
	var onPointerEnter = function(e) 
	{
		document.getElementById('mapContainer').style.cursor = 'crosshair';
		if(currentBubble)
			ui.removeBubble(currentBubble);
		var html =  '<div>'+
			'<p style="font-family:Arial,sans-serif; font-size:12px;">' + e.target.$streetName + '</p>' +
			'<p style="font-family:Arial,sans-serif; font-size:10px;">Link Id: ' + e.target.$linkID +'</br>'+
			'Bridge Flag: ' + e.target.$bridge + '</br>'+
			'Tunnel Flag: ' + e.target.$tunnel + '</p>'+
			'</div>';

		var point = map.screenToGeo(e.pointers[0].viewportX, e.pointers[0].viewportY);
		currentBubble = new H.ui.InfoBubble(point, { content: html });
		ui.addBubble(currentBubble);
	}
	
	var onPointerLeave = function(e) 
	{
		document.getElementById('mapContainer').style.cursor = 'default';
	}