	// author faheem, wobecker (C) HERE 2017 - 2018
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection

	var mapContainer = document.getElementById('mapContainer');
	var app_id = app_id_cors; //this app_id_cors is allowed to do the CORS call
	var app_code = app_code_cors;
	var platform = new H.service.Platform({	app_code: app_code,	app_id: app_id,	useHTTPS: secure });
	var	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
	var	map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });
	var zoomToResult = true;
	
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

	// Removing svg if the zoom is too far
	map.addEventListener("mapviewchangeend", function(evt) {
		if(map.getZoom() < 10) hideMarkers();
		else showMarkers();
	});
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
	var ui = H.ui.UI.createDefault(map, maptypes); // add UI

	platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// PDE manager
	var pdeManager = new PDEManager(app_id, app_code, null);
	var latAccelGroup = new H.map.Group();
	var latAccelShownOnMap = false;
	
	var curvatureGroup = new H.map.Group();
	var lastRespJsonObj;

	// adas coordinate to wgs conversion
	var ADASNTU_TO_WGS84 = 10000000;

	var routeLinkHashMap  = new Object(); // key = linkID (only positive value), value = link object which is part of the route

	//color for different categories that are returned in the warnings section of the response
	//the key here is the category_id + color or name
	var warningCategory = {
		'1_color' 	: 'rgba(255, 255, 0, 0.8)',
		'1_name'  	: 'Other',
		'2_color' 	: 'rgba(255, 216, 0, 0.8)',
		'2_name' 	: 'Suspicious U Turn',
		'3_color'	: 'rgba(255, 0, 0, 0.8)',
		'3_name'	: 'Forbidden Driving Direction',
		'4_color'	: 'rgba(255, 127, 127, 0.8)', 
		'4_name'	: 'Forbidden Access',
		'5_color'	: 'rgba(214, 127, 255, 0.8)',
		'5_name'	: 'Leaving No Through Traffic Zone',
		'6_color'	: 'rgba(178, 0, 255, 0.8)',
		'6_name'	: 'Illegal U Turn',
		'7_color'	: 'rgba(0, 204, 0, 0.8)',
		'7_name'	: 'Gate Traversal',
		'8_color'	: 'rgba(0, 145, 255, 0.7)',
		'8_name'	: 'Illegal Turn',
		'9_color'	: 'rgba(255, 255, 0, 0.7)',
		'9_name'	: 'Toll Cost Route Link Id not found in map',
		'10_color'	: 'rgba(255, 216, 0, 0.7)',
		'10_name'	: 'Toll cost ferry links on route',
		'11_color'	: 'rgba(255, 0, 0, 0.7)',
		'11_name'	: 'Toll cost vehicle_spec param mismatch',
		'12_color'	: 'rgba(255, 127, 127, 0.7)',
		'12_name'	: 'Toll cost vehicle near match',
		'13_color'	: 'rgba(214, 127, 255, 0.7)',
		'13_name'	: 'Optional way_point',
		'1000_color': 'rgba(255, 255, 0, 0.8)',
		'1000_name'	: 'Other',
		'1001_color': 'rgba(178, 0, 255, 0.7)',
		'1001_name' : 'Deprecated CSV column',
		'1002_color': 'rgba(0, 204, 0, 0.7)',
		'1002_name' : 'Unknown CSV column',
		'1003_color': 'rgba(127, 201, 255, 0.6)',
		'1003_name'	: 'Unconnected route links',
		'1004_color': 'rgba(255, 255, 0, 0.6)',
		'1004_name'	: 'Ignored bad trace point',
		'1005_color': 'rgba(255, 216, 0, 0.6)',
		'1005_name'	: 'Trace point long match distance',
		'1006_color': 'rgba(255, 0, 0, 0.6)',
		'1006_name'	: 'Trace point matched out of sequence on route',
		'1008_color': 'rgba(255, 127, 127, 0.6)',
		'1008_name'	: 'Trace point could not be matched',
		'1009_color': 'rgba(214, 127, 255, 0.6)',
		'1009_name'	: 'Route dist big waypoints close'
	}

	//below FCs colors are as close as possible to the HERE maps FCs colors
	var driverReportColor = {
		'tracepoints' :            'rgba(0, 0, 0, 1.0)',
		'accelerationMps' :        'rgba(255, 0, 0, 0.8)', 
		'speedKphLimit':           'rgba(255, 255, 0, 0.8)',
		'speedLimitKphSpeedok':    'rgba(43, 156, 106, 1.0)',
		'speedLimitKphSpeeding':   'rgba(205, 20, 57, 1.0)',
		'curveSpeedKph':           'rgba( 69, 139, 0, 1.0)',
		'curveSpeedKphWarn':       'rgba(255, 255, 0, 1.0)',
		'curveSpeedKphCrit':       'rgba(178, 34, 34, 1.0)',
		'lightConditions':     	   'rgb(255, 255, 153, 1.0)',
	}
			

	var	routePolyContainer = new H.map.Group();
	var	pointContainer = new H.map.Group();
	var	pointMatchedContainer = new H.map.Group();
	var warningsGroup = [];
	var latAccelInscriptGroup = new H.map.Group();
	var accelerationMPSS = new H.map.Group();
	var applicableSpeedLimitKph = new H.map.Group();
	var stopViolationWarnings = [];
	var lightConditions = new H.map.Group();

	var submitTrace = function () {
		deleteDynamicallyAddedLiElements();
		clearGroups();

		//remove the existing bubbles if any
		removeInfoBubbles();
		document.getElementById("warningstextarea").value = '';
		document.getElementById("tracepoints").checked = true;
		var url = document.getElementById('rmeUrl').value;
		// if there is an app_id specified in the URL then use it, otherwise use the default
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
		if (url.indexOf("matchroute.json") >= 0) { // old, send GET request
			var zip = new JSZip();
			zip.file("temp.zip", document.getElementById('tracetextarea').value);
			var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
			url += "&file=" + encodeURIComponent(content);
			getJSONP(url, gotRouteMatchResponse);
		} else { // new: calculateroute.json, send POST request
			content = document.getElementById('tracetextarea').value;
			$.ajax({
                url: url,
                dataType: "json",
                async: true,
                type: 'post',
				data:content,
				contentType: 'application/octet-stream',
                success: function(data) {
                    gotRouteMatchResponse(data);
                },
                error: function(xhr, status, e) {
					alert((xhr.responseJSON.issues[0].message ? xhr.responseJSON.issues[0].message :  xhr.responseJSON.issues[0] ) || xhr.responseJSON);
                }
            });
		}		
	};
	document.getElementById('submittracebutton').onclick = submitTrace;

  function showTooltip(element) {
	  var id = element.id + "Text";
	  var icon = document.getElementById(element.id)
	  var tooltip = document.getElementById(id);
	  if (tooltip.style.display == "none"){
		  tooltip.style.display = "block";
		  icon.classList.remove("glyphicon-chevron-down");
		  icon.classList.add("glyphicon-chevron-up");
	  } else {
		  tooltip.style.display = "none";
		  icon.classList.add("glyphicon-chevron-down");
		  icon.classList.remove("glyphicon-chevron-up");
	  }
	}
  
  function clearGroups(){
		
	warningsGroup.forEach(function (item, index) {
			item.close();
		});

	stopViolationWarnings.forEach(function (item, index) {
			item.close();
		});

	latAccelGroup.removeAll();
	latAccelInscriptGroup.removeAll();
	accelerationMPSS.removeAll();
	applicableSpeedLimitKph.removeAll();
	pointContainer.removeAll();
	pointMatchedContainer.removeAll();
	routePolyContainer.removeAll();
	lightConditions.removeAll();

	warningsGroup.length = 0;
	stopViolationWarnings.length = 0;
  }

  
  function reset() {
    var traceTextArea = document.getElementById('tracetextarea');
    traceTextArea.value = '';
    deleteDynamicallyAddedLiElements();
    clearGroups();
    document.getElementById("warningstextarea").value = '';
    document.getElementById("tracepoints").checked = true;
   	removeInfoBubbles();
  }

	document.getElementById('tracetextarea').addEventListener(
			'dragover', function handleDragOver(evt) {
				evt.stopPropagation();
				evt.preventDefault();
				evt.dataTransfer.dropEffect = 'copy';
			},
		false
	);

	document.getElementById('tracetextarea').addEventListener(
		'drop', function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			var files = evt.dataTransfer.files;
			var file = files[0];
			var r = new FileReader();
			r.onload = function(e) { 
				document.getElementById('tracetextarea').value = r.result;
				submitTrace();
			}
			r.readAsText(file);
		},
		false
	);

	var gotRouteMatchResponse = function (respJsonObj) {
   
   		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		//remove any existing bubbles if any
		removeInfoBubbles();

		var routeLinksLength;
		var newResponse = routeLinks == undefined;
		var routeLinks = respJsonObj.RouteLinks;

		// store links in hashmap, which is used for adas information, too.
		if (newResponse) { // new calculateroute response
			// draw the route
			routeLinks = respJsonObj.response.route[0].leg[0].link;
			routeLinksLength = routeLinks.length;
			for (var l = 0; l < routeLinks.length; l++) {
				var coords1 = routeLinks[l].shape;
				var coords2 = new H.geo.Strip();
				for (var c = 0; c < coords1.length; c += 2)
					coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
					var link = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}});
					link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});

				routePolyContainer.addObject(link);
				routeLinkHashMap[Math.abs(routeLinks[l].linkId)] = routeLinks[l];
			}
		}
		lastRespJsonObj= respJsonObj;
		pdeManagerLoadAdasForLinks(respJsonObj);
	}

	var processRouteMatchResponse = function() {
	
		var respJsonObj= lastRespJsonObj;
		var maxLatAccel= document.getElementById("latAccelLimit").value;

		var routeLinks = respJsonObj.RouteLinks;
		var newResponse = routeLinks == undefined;
		var routeLinksLength;
		var tracePointsLength;
		if (newResponse) { // new calculateroute response

			// draw tracepoints from response
			routeLinks = respJsonObj.response.route[0].leg[0].link;
			routeLinksLength = routeLinks.length;

			// draw the original and the matched trace points
			tracePoints = respJsonObj.response.route[0].waypoint;
			tracePointsLength = tracePoints.length;
			for (var l = 0; l < tracePointsLength; l++) {
				var p = tracePoints[l];
				var isSpeeding= p.hasOwnProperty("applicableSpeedLimitKph") && (p.speedMps * 3.6) > p.applicableSpeedLimitKph;
				pointContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: createIcon("#000000", l, 16)}));
				pointMatchedContainer.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon(isSpeeding ? "#cd1439":"#2b9c6a", l, 16)}));
				if (p.lateralAccelerationMpss) addlateralAcceleration( p, maxLatAccel );
				if (p.accelerationMPSS) addAcceleration(p);
				if (p.applicableSpeedLimitKph) addApplicableSpeed(p);
				if (p.solarAltitudeAngle) addLightConditions(p);
			}
		}
		pointContainer.setVisibility(true);
		pointMatchedContainer.setVisibility(false);

		map.addObject(routePolyContainer);
		map.addObject(pointContainer);
		map.addObject(pointMatchedContainer);
		if (zoomToResult) map.setViewBounds(routePolyContainer.getBounds());
		zoomToResult = true;
		// should display the warnings … warnings = respJsonObj.Warnings;  if (warnings.length > 0) …
		mapVersion = newResponse ? "latest" : respJsonObj.mapVersion; // RME's map version. Use it to cross reference with PDE.
		var warningsArea = document.getElementById("warningstextarea");
		var warnings = newResponse ? respJsonObj.response.warnings : respJsonObj.Warnings;
		if (warnings.length === 0) {
			warningsArea.value += 'No Warnings.';
		} else {
			for(var d = 0; d < warnings.length; d++) {
				if(0 !== d) warningsArea.value += '\n';
				warningsArea.value += (newResponse ? warnings[d].message : warnings[d].text ) ;
				var category = newResponse ? warnings[d].code : warnings[d].category;
				//display the categories/eventes in different colors on the map related to the RouteLinks 
				if (warnings[d].routeLinkSeqNum){
					var routeLinkSeqNum = warnings[d].routeLinkSeqNum;
					if (routeLinkSeqNum != undefined && routeLinkSeqNum !== -1 && routeLinkSeqNum < routeLinksLength) {
						var routeLink = routeLinks[routeLinkSeqNum];
						var coords2 = new H.geo.Strip();
						var isRoutingResponse = Array.isArray(routeLink.shape);
						if (isRoutingResponse) {
							var coords1 = routeLink.shape;
							for (var c = 0; c < coords1.length; c += 2)
								coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
						} else {
							var coords1 = routeLink.shape.split(" ");
							for (var c = 0; c < coords1.length; c += 2)
								coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
						}	
						var warningPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 12, strokeColor: warningCategory[category+'_color'] != undefined ? warningCategory[category+'_color'] : warningCategory['1000_color'], lineJoin: "round"}});
						var warningMessage = newResponse ? warnings[d].message : warnings[d].text;
						warningPolyline.setData(warningMessage);
						//show info bubble
						var bubble =  new H.ui.InfoBubble(warningPolyline.getBounds().getCenter(), {
      					// read custom data
      					content: '<h6>' + warningPolyline.getData() + '</h6>'
    					});
						if (bubble){
							if (category != 1017){
								ui.addBubble(bubble);
								bubble.open();
								warningsGroup.push(bubble);
							} else {
								ui.addBubble(bubble);
								stopViolationWarnings.push(bubble);
								bubble.close();
							}
						}
					}
				}

				//display the categories/eventes in different colors on the map related to the tracepoints
				if (warnings[d].tracePointSeqNum){
					var tracePointSeqNum = warnings[d].tracePointSeqNum;
					if (tracePointSeqNum != undefined && tracePointSeqNum !== -1 &&  tracePointSeqNum < tracePointsLength){
						var p = tracePoints[tracePointSeqNum];
						var categoryColor = warningCategory[category+'_color'] != undefined ? warningCategory[category+'_color'] : warningCategory['1000_color']
						var lat = newResponse ? p.originalPosition.latitude : p.lat; 
						var lon = newResponse ? p.originalPosition.longitude : p.lon ;
						var warningMarker = new H.map.Marker(new H.geo.Point(lat, lon), {icon: createIcon(rgb2hex(categoryColor), tracePointSeqNum, 16)});
						warningMarker.setData(newResponse ? warnings[d].message : warnings[d].text);
						var bubble =  new H.ui.InfoBubble(warningMarker.getPosition(), {
      					// read custom data
      					content: '<h6>' + warningMarker.getData() + '</h6>'
    					});
    					// show info bubble						
						if (bubble){
							if (category != 1017){
								ui.addBubble(bubble);
								bubble.open();
								warningsGroup.push(bubble);
							} else {
								ui.addBubble(bubble);
								stopViolationWarnings.push(bubble);
								bubble.close();
							 }
							}
					}
				}
			}
		}

		map.addObject(latAccelGroup);
		map.addObject(latAccelInscriptGroup);
		map.addObject(accelerationMPSS);
		map.addObject(applicableSpeedLimitKph);
		map.addObject(lightConditions);

		latAccelGroup.setVisibility(false);
		latAccelInscriptGroup.setVisibility(false);
		accelerationMPSS.setVisibility(false);
		applicableSpeedLimitKph.setVisibility(false);
		lightConditions.setVisibility(false);

		showAdditionalInfo(document.getElementById('tracepoints'));
	};

	function createInfoPopup(tp, content, colorId){
		var point = new H.geo.Point(tp.mappedPosition.latitude,tp.mappedPosition.longitude);
		var circle = new H.map.Circle(point, 10, {zIndex: 10, style: {lineWidth: 3, strokeColor: driverReportColor[colorId], fillColor: driverReportColor[colorId], lineJoin: "round"}});
		circle.addEventListener("tap", function(e)
		{
				var linkDataInfoBubble = new H.ui.InfoBubble(point,{content: content});
				ui.addBubble(linkDataInfoBubble);	
				linkDataInfoBubble.open();
		});
		return circle;
	}
	function createInfoPopupIcon(tp, content, colorId, svgIcon){
		var point = new H.geo.Point(tp.mappedPosition.latitude,tp.mappedPosition.longitude);
		svgIcon.addEventListener("tap", function(e)
		{
				var linkDataInfoBubble = new H.ui.InfoBubble(point,{content: content});
				ui.addBubble(linkDataInfoBubble);	
				linkDataInfoBubble.open();
		});
		return svgIcon;
	}

	function addlateralAcceleration(tp, maxLatAccel) {

		if( ! tp.hasOwnProperty('speedMps') || ! tp.hasOwnProperty('lateralAccelerationMpss') || tp.lateralAccelerationMpss < 0.001 || tp.speedMps < 0.001) return;

		var linkIdWithDir= parseInt(tp.linkId);
		var link= routeLinkHashMap[Math.abs(linkIdWithDir)];

		var shortestDist= 100000000000; 
		var pos= -1;
		for( var i= 0; i < link.$HPX.length; i++) {
			var hlon = link.$HPX[i] / ADASNTU_TO_WGS84;
			var hlat = link.$HPY[i] / ADASNTU_TO_WGS84;
			var dist2= (hlon - tp.mappedPosition.longitude) * (hlon - tp.mappedPosition.longitude) + (hlat - tp.mappedPosition.latitude) * (hlat - tp.mappedPosition.latitude); // dropping cos for performance
			if( dist2 <= shortestDist ) { shortestDist= dist2; pos=i;}		
		}
		if( link.$CURVATURE[pos] == 0 ) pos= pos == 0 ? pos+1 : pos-1;
		var curvDir= Math.sign(linkIdWithDir) * (link.$CURVATURE[pos] == 0 ? 1 : Math.sign(link.$CURVATURE[pos])); // reconstruct the direction of the lateral accel. from the map data.
		var scaledSignedLateralAccelaration= curvDir * tp.lateralAccelerationMpss * 10000;
		var scaledSignedLateralMaxAccelaration= curvDir * maxLatAccel * 10000;

		// convert matched heading like adas heading stype
		var h=  tp.headingMatched >= 0 ? tp.headingMatched : 360 + tp.headingMatched;
		var reportCurvColor;
		if( tp.lateralAccelerationMpss > 0.85 * maxLatAccel ) 		reportCurvColor= driverReportColor['curveSpeedKphCrit'];
		else if( tp.lateralAccelerationMpss > 0.60 * maxLatAccel )	reportCurvColor= driverReportColor['curveSpeedKphWarn'];
		else  														reportCurvColor= driverReportColor['curveSpeedKph'];
		renderCurvature(tp.mappedPosition.longitude*10000000, tp.mappedPosition.latitude*10000000, scaledSignedLateralAccelaration, h, reportCurvColor,2);
		
		latAccelInscriptGroup.addObject(new H.map.Marker(new H.geo.Point(tp.mappedPosition.latitude, tp.mappedPosition.longitude), { 
			icon:	createLimitationIcon("#000000", tp.lateralAccelerationMpss + ' m/s/s', 16 )
		}));
	}

	function addAcceleration(tp) {
		var content = "<div style='font-size: 14px;width: 200px'><span>Acceleration [m/s&sup2;]: " + tp.accelerationMPSS + "</span></br>" +
		"<span>Speed [km/h]: " + (tp.speedMps * 3.6).toFixed(1)  +"</span></div>";
		var popup = createInfoPopup(tp, content, "accelerationMps");
		accelerationMPSS.addObject(popup);
	}
	
	function addApplicableSpeed(tp) {
		if( ! tp.hasOwnProperty('speedMps') || tp.speedMps === 0) return;
		var content = "<div style='font-size: 14px;width: 200px'><span>Applicable speed [km/h]: " + tp.applicableSpeedLimitKph + "</span></br>" +
		"<span>Speed [km/h]: " + (tp.speedMps * 3.6).toFixed(1) + "</div>";
		var popup = createInfoPopup(tp, content, "speedKphLimit");
		applicableSpeedLimitKph.addObject(popup);
	}

	function addLightConditions(tp) {
		if( ! tp.hasOwnProperty('solarAltitudeAngle') || tp.solarAltitudeAngle === 0) return;
		var marker = new H.map.Marker(new H.geo.Point(tp.mappedPosition.latitude, tp.mappedPosition.longitude), { 
			icon:	createCustomInfo(tp)
		});
		lightConditions.addObject(marker);
		var content = "<div style='font-size: 12px;width: 200px'><span>relative_altAngle / absolute_altAngle: " + tp.solarRelAltitudeAngle + '&#176; / ' + tp.solarAltitudeAngle + "&#176;</span></br>"
						 + "<span>azimAngle: " + tp.solarRelHorizontalAngle + "&#176;</span></br>"
					   + "<span>Heading: " + tp.headingMatched + "&#176;</span></br>";
		var popup = createInfoPopupIcon(tp, content, "lightConditions", marker);
	    lightConditions.addObject(popup);
		
	}

	var addLegend = function(element){
		var keys = element.id.split(";");
		var values = element.value.split(";");
		var legendList = document.getElementById("legendList");
		if( keys.length != values.length ) alert("cannot create Legend: " + element.id + " / " + element.value );
		for( var i= 0; i< keys.length; i++) {
			//Display the legends according to the returned categories
			var li = document.createElement("li");
			li.id = keys[i] + "Legend";
			li.appendChild(document.createTextNode(values[i]));
			li.style.color = rgb2hex(driverReportColor[keys[i]]);
			legendList.appendChild(li);
		}
	}
	
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
	
	var createLimitationIcon = function (color, text, height) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="62px" height="' + height + 'px">' +			
			'<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
			text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
	};


	var createIcon = function (color, text, height) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="56px" height="' + height + 'px">' +
			'<line x1="28"  y1="' + height + '" x2="28" y2="' + (height - 7) + '" stroke="' + color + '"/>' +
			'<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
			text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
	};

	var createCustomInfo = function (tp) {
		var div = document.createElement("div");	
		var svg = carSvg;
		var carHeight = 6;
		var heading = tp.headingMatched;
		var delta = carHeight/Math.tan(tp.solarRelAltitudeAngle * Math.PI/180);
		var solarHorizontalAngle = tp.solarRelHorizontalAngle + heading;
		var x = delta*Math.cos(solarHorizontalAngle * Math.PI/180); 
		var y = delta*Math.sin(solarHorizontalAngle * Math.PI/180);
		var scale = 1 + Math.abs(carHeight/delta);
		var solarHorizontalAngle = tp.solarRelHorizontalAngle + heading;
		if( solarHorizontalAngle < -180 ) solarHorizontalAngle += 360;
		if( solarHorizontalAngle >  180 ) solarHorizontalAngle -= 360;
		if (tp.solarRelHorizontalAngle > 0 && tp.solarRelHorizontalAngle <= 90){
			y= -y;
		} else if (tp.solarRelHorizontalAngle < 0 && tp.solarRelHorizontalAngle >= - 90){
			x= -x;
			y= -y;
		} else if (tp.solarRelHorizontalAngle < 0 && tp.solarRelHorizontalAngle <= - 90){
			x=-x;
		} 
		if (tp.solarRelAltitudeAngle > 0 && tp.solarRelAltitudeAngle < 30 && tp.solarRelHorizontalAngle < -45 && tp.solarRelHorizontalAngle < 45) svg = svg.replace(/_color_/g,"red");
		else svg = svg.replace(/_color_/g, "blue");
		svg = svg.replace(/_rotAngle_/g, heading + 90);	
		if (x < 0) svg = svg.replace("_scale_", "translate(55, 50) scale(-" + scale + ",1) translate(-55, -50) translate("+x +","+ y+")");
		svg = svg.replace("_scale_", "translate(45, 50) scale(" + scale + ",1) translate(-45, -50) translate("+x +","+ y+")");
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 84, y : 84}});
	};

	function getDiagramQuadrant(value){
		
		if (value >= 0 && value < 90) return 1;
		else if (value >= 90 && value < 180) return 2;
		else if (value < 0 && value >= - 90) return 3;
		else return 4;
	}
	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb) {
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
	}

	function removeInfoBubbles(){
		var previousBubbles = ui.getBubbles();
    	previousBubbles.forEach(function(b) {
        	ui.removeBubble(b);
    	});
	}


	/**
		This method calculates the distance between two points
	 */
	function calculateDistance(lon1,lat1,lon2,lat2){

		var dGridSizeXReduction = Math.abs(Math.cos(lat1 * Math.PI / 180.0 ));
		var dRed2 = dGridSizeXReduction * dGridSizeXReduction;
		var dMinDist2 = (lon1 - lon2) * (lon1 - lon2) * dRed2 + (lat1 - lat2) * (lat1 - lat2);	
		return Math.sqrt(dMinDist2);
	}

	//function to remove newly added elements in the existing ul
	function deleteDynamicallyAddedLiElements(){
		var legendList = document.getElementById("legendList")
		var legendListChildren = legendList.children;
		var childrenLength = legendListChildren.length;	
		if (childrenLength === 1){ //no need to remove anything
			return;
		}else{
			 for(var x = 0; x < childrenLength; x++){
        		if (legendListChildren[x] != undefined){
        			if(legendListChildren[x].id !== "matchedPoints"){
        				var elem = document.getElementById(legendListChildren[x].id);
        				elem.parentNode.removeChild(elem);
        				elem=null;
        				x--; //because removing an element makes the array to readjust itself
        			}
        		}	
    		}
		}
	}

	function closeAnyOpenBubble() {
		var bubbles= ui.getBubbles();
		for( var i= 0; i<bubbles.length; i++) bubbles[i].close();
	}
  
	
	function showAdditionalInfo(that){
		var checkedItem = that.id;
		deleteDynamicallyAddedLiElements();
		switch (checkedItem){
		case 'curveSpeedKph;curveSpeedKphWarn;curveSpeedKphCrit': 
			closeAnyOpenBubble();
			pointContainer.setVisibility(false);
			pointMatchedContainer.setVisibility(false);
			latAccelInscriptGroup.setVisibility(true);
			accelerationMPSS.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(false);
			latAccelGroup.setVisibility(true);	 		
			closeInfos(stopViolationWarnings);
			closeInfos(warningsGroup);
			addLegend(that);
			break;
		case 'accelerationMps':
			closeAnyOpenBubble();
			pointContainer.setVisibility(false);
			pointMatchedContainer.setVisibility(false);
			accelerationMPSS.setVisibility(true);
			latAccelInscriptGroup.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(false);
			closeInfos(stopViolationWarnings);
			closeInfos(warningsGroup);
			latAccelGroup.setVisibility(false);
			addLegend(that);
			break;
		case 'speedKphLimit;speedLimitKphSpeedok;speedLimitKphSpeeding':
			closeAnyOpenBubble();
			pointContainer.setVisibility(false);
			pointMatchedContainer.setVisibility(true);
			applicableSpeedLimitKph.setVisibility(true);
			latAccelInscriptGroup.setVisibility(false);
			accelerationMPSS.setVisibility(false);
			lightConditions.setVisibility(false);
			closeInfos(stopViolationWarnings);
			closeInfos(warningsGroup);
			latAccelGroup.setVisibility(false);
			addLegend(that);
			break;
		case 'stopViolation':
			closeAnyOpenBubble();
			pointContainer.setVisibility(false);
			pointMatchedContainer.setVisibility(false);
			latAccelInscriptGroup.setVisibility(false);
			accelerationMPSS.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(false);
			closeInfos(warningsGroup);
			openInfos(stopViolationWarnings);
			latAccelGroup.setVisibility(false);
			break;
		case 'tracepoints':
			closeAnyOpenBubble();
			pointContainer.setVisibility(true);
			pointMatchedContainer.setVisibility(false);
			latAccelInscriptGroup.setVisibility(false);
			accelerationMPSS.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(false);
			closeInfos(stopViolationWarnings);
			openInfos(warningsGroup);
			latAccelGroup.setVisibility(false);
			addLegend(that);
			break;
		case 'lightConditions':
			closeAnyOpenBubble();
			pointContainer.setVisibility(false);
			pointMatchedContainer.setVisibility(false);
			accelerationMPSS.setVisibility(false);
			latAccelInscriptGroup.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(true);
			closeInfos(stopViolationWarnings);
			closeInfos(warningsGroup);
			latAccelGroup.setVisibility(false);
			addLegend(that);
			break;
		default:
			closeAnyOpenBubble();
			pointContainer.setVisibility(true);
			pointMatchedContainer.setVisibility(true);
			latAccelInscriptGroup.setVisibility(false);
			accelerationMPSS.setVisibility(false);
			applicableSpeedLimitKph.setVisibility(false);
			lightConditions.setVisibility(false);
			closeInfos(stopViolationWarnings);
			openInfos(warningsGroup);
			latAccelGroup.setVisibility(false);
			break;
		}
	}

	function closeInfos(infos){
		for (var i=0; i<infos.length;i++){
			infos[i].close();
		}
	}
	
	function openInfos(infos){
		for (var i=0; i<infos.length;i++){
			infos[i].open();
		}
	}

    function hideMarkers() {
		closeAnyOpenBubble();
		pointContainer.setVisibility(false);
		pointMatchedContainer.setVisibility(false);
		accelerationMPSS.setVisibility(false);
		latAccelInscriptGroup.setVisibility(false);
		applicableSpeedLimitKph.setVisibility(false);
		lightConditions.setVisibility(false);
		closeInfos(stopViolationWarnings);
		closeInfos(warningsGroup);
		latAccelGroup.setVisibility(false);
	}

	function showMarkers() {
		$("#reports input").each(function(){
		 if (this.checked) showAdditionalInfo(this);
		});
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
	
	// initiate async loading of adas data
	function pdeManagerLoadAdasForLinks(respJsonRouteObj)
	{
		pdeManager.setLinks(respJsonRouteObj.response.route[0].leg[0].link);
		layers = new Object();
		layers["ADAS_ATTRIB_FC"] = {callback: gotAdasTile};
		pdeManager.setLayers(layers);
		pdeManager.setOnTileLoadingFinished(processRouteMatchResponse);
		pdeManager.start();
	}	

// ============================ below this line copied from pde_adas_curvature along route ===============================
	
	// callback that is set to PDE manager and that gets called with the adas tile information
	// that get requested (after route calculation)
	function gotAdasTile(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = resp.Rows[r].LINK_ID;

			if(pdeManager.getLinkPartOfRoute(linkId))
			{
				var curvature = resp.Rows[r].CURVATURES;
				var headings = resp.Rows[r].HEADINGS;
				var hpx = resp.Rows[r].HPX;
				var hpy = resp.Rows[r].HPY;
				var refLinkCurvHeads = resp.Rows[r].REFNODE_LINKCURVHEADS;
				var nrefLinkCurvHeads = resp.Rows[r].NREFNODE_LINKCURVHEADS;

				var curvatureSplit = curvature.split(',');
				var headingsSplit = headings.split(',');
				var hpxSplit = hpx.split(',');
				var hpySplit = hpy.split(',');
				var refLinkCurvHeadsSplit = refLinkCurvHeads.split(',');
				var nrefLinkCurvHeadsSplit = nrefLinkCurvHeads.split(',');

				if(curvatureSplit.length == 1 && curvatureSplit[0] == '')
				{
					curvatureSplit = [];
				}
				if(headingsSplit.length == 1 && headingsSplit[0] == '')
				{
					headingsSplit = [];
				}

				// result arrays for curvature and heading
				var resultCurvature = [];
				var resultHeading = [];
				var resultHpx = [];
				var resultHpy = [];

				//0. find out if link is driven from or to reference node
				var bLinkIsDrivenFromReferenceNode = pdeManager.getLinkIsDrivenFromReferenceNodeOnRoute(linkId);

				//1. handle reference node
				var previousLinkId = pdeManager.getPreviousIdLinkOnRoute(linkId, false);

				var bNodePointAdded = false;
				if(previousLinkId != null)
				{
					for(var k = 0; k < refLinkCurvHeadsSplit.length; k++)
					{
						var splitData = refLinkCurvHeadsSplit[k].split(':');
						if(splitData[0] == (previousLinkId - linkId))
						{
							resultCurvature.push(parseInt(splitData[1]));
							resultHeading.push(parseInt(splitData[2] / 1000));
							bNodePointAdded = true;
							break;
						}
					}
				}

				if(!bNodePointAdded)
				{
					resultCurvature.push(0);
					resultHeading.push(0);
				}

				// 2. handle shape curvatures, heading, coordinates
				var lastCoordValueCurvature = 0;
				for(var k = 0; k < curvatureSplit.length; k++)
				{
					lastCoordValueCurvature += parseInt(curvatureSplit[k]);
					resultCurvature.push(lastCoordValueCurvature);
				}

				var lastCoordValueHeading = 0;
				for(var k = 0; k < headingsSplit.length; k++)
				{
					lastCoordValueHeading += parseInt(headingsSplit[k]);
					resultHeading.push(parseInt(lastCoordValueHeading / 1000));
				}

				var lastCoordValueHpx = 0;
				for(var k = 0; k < hpxSplit.length; k++)
				{
					lastCoordValueHpx += parseInt(hpxSplit[k]);
					resultHpx.push(lastCoordValueHpx);
				}

				var lastCoordValueHpy = 0;
				for(var k = 0; k < hpySplit.length; k++)
				{
					lastCoordValueHpy += parseInt(hpySplit[k]);
					resultHpy.push(lastCoordValueHpy);
				}

				// 3. handle nonreference node
				var nextLinkId = pdeManager.getNextLinkIdOnRoute(linkId, false);

				bNodePointAdded = false;
				if(nextLinkId != null)
				{
					for(var k = 0; k < nrefLinkCurvHeadsSplit.length; k++)
					{
						var splitData = nrefLinkCurvHeadsSplit[k].split(':');
						if(splitData[0] == (nextLinkId - linkId))
						{
							resultCurvature.push(parseInt(splitData[1]));
							resultHeading.push(parseInt(splitData[2]) / 1000);
							bNodePointAdded = true;
							break;
						}
					}
				}

				if(!bNodePointAdded)
				{
					resultCurvature.push(0);
					resultHeading.push(0);
				}

				// at this point we have all curvature and heading data to the link - so we save it
				routeLinkHashMap[linkId].$HPX = resultHpx;
				routeLinkHashMap[linkId].$HPY = resultHpy;
				routeLinkHashMap[linkId].$CURVATURE = resultCurvature;
				routeLinkHashMap[linkId].$HEADING = resultHeading;
				routeLinkHashMap[linkId].$LINK_DRIVEN_FROM_REV = bLinkIsDrivenFromReferenceNode;
			}
		}
	}
	
	
	/**
	This method takes ADAS coordinates (x, y) and their curvature and heading information and renders
	the curvature on the map display via polylines
	*/
	function renderCurvature(x, y, curvature, heading, lineColor, width)
	{
		// Missing values are represented as NULL or as 1000000000.
		if(curvature == 1000000000)
			return;

		// calculate shifted lat/lon for curvature polyline
		var radius = curvature == 0 ? 0 : (1000000.0 / curvature);
		radius = radius == 0 ? 0 : -((1 / radius) * 2000);

		var bearingSuppl = -90;
		if (radius < 0)
		{
			radius *= -1;
			bearingSuppl *= -1;
		}

		var lat = y / ADASNTU_TO_WGS84;
		var lon = x / ADASNTU_TO_WGS84;
		var shiftedLatLon = shiftLatLon(lat, lon, (heading + bearingSuppl + 360) % 360, radius);

		//console.log("" + x + "/" + y + " curvature: " + curvature + " heading: " + heading + " results in radius: " + radius + " and bearing: " + bearingSuppl + ":: " + lat + "/" + lon + "/" + shiftedLatLon[0] + "/" + shiftedLatLon[1]);

		// create polyline
		var strip = new H.geo.Strip();
		strip.pushLatLngAlt(lat, lon, 0);
		strip.pushLatLngAlt(shiftedLatLon[0], shiftedLatLon[1], 0);

		var curvatureLine = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: width,
					strokeColor: lineColor
				}
			});
			latAccelGroup.addObject(curvatureLine);
	}	

	
	/**
	 *	This method shifts the given lat and long along given bearing to the given distance
 	 */
	function shiftLatLon(latDegrees, lonDegrees, bearing, distance)
	{
		var earthRadius = 6371000;
		// convert input parameters from decimal degrees into radians
		var latRad = (latDegrees) * Math.PI / 180;
		var lonRad = (lonDegrees) * Math.PI / 180;

		var bearingRad = bearing * Math.PI / 180;
		var distRad = distance / earthRadius;

		var latNewRad = Math.asin(Math.sin(latRad) * Math.cos(distRad) + Math.cos(latRad) * Math.sin(distRad)
		* Math.cos(bearingRad));
		var lonNewRad = lonRad
		+ Math.atan2(Math.sin(bearingRad) * Math.sin(distRad) * Math.cos(latRad), Math.cos(distRad) - Math.sin(latRad)
		* Math.sin(latNewRad));

		// convert input parameters from radians into decimal degrees
		var latNewDegrees = latNewRad * 180 / Math.PI;
		var lonNewDegrees = lonNewRad * 180 / Math.PI;
		var latLonRet = [];
		latLonRet.push(latNewDegrees);
		latLonRet.push(lonNewDegrees);
		return latLonRet;
	}

	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb){
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}


var carSvg = '<svg style="overflow:visible" xmlns="http://www.w3.org/2000/svg" width="44.860424mm" height="43.936993mm" viewBox="0 0 44.860423 43.936993" version="1.1">' + 
'  <g id="g142" transform="rotate(_rotAngle_,19,19) scale(1.2, 1.2)"><g id="g142" transform="matrix(0.51902968,0,0,0.51581593,7.0172178,6.6328833)">' + 
'   <g  style="fill:#000000"  id="g34"  transform="matrix(0,-0.5,0.5,0,-17.353816,44.812392)">' + 
'   <g  style="fill:#000000"   x="-250%" y="-250%" height="600%"  width="600%" id="g32"  transform="matrix(0.7142857,0,0,0.78776018,12.371792,18.677365) _scale_">' + 
'  <path id="path2" d="m 51.961523,32.999993 -4.330127,2.5 c -1.990153,5.038607 -0.866025,8.5 2e-6,13.000005 -0.233939,0.55604 -2.598078,0.499995 -4.330129,3.499995 L 43.30127,54 47.631398,51.5 v 12 5 l -0.866026,7.499998 c -0.141983,2.20577 -0.241674,4.473169 0.866024,8.499995 0.867246,1.290248 1.579907,2.703093 4.330127,2.5 6.702335,1.597405 12.154166,1.044194 17.320508,0 1.805139,0.07152 3.386462,-0.416774 4.330127,-2.5 0.859473,-2.157061 1.732051,-7 0.866026,-9.5 L 73.612163,68.5 v -5 l -5e-6,-12.000006 4.330127,2.5 v -2.000001 c -2.044766,-2.217629 -2.604421,-2.6439 -4.330122,-3.499995 0.125085,-4.232151 1.92555,-7.003136 -5e-6,-13.000005 l -4.330127,-2.5 c -5.275546,-0.79308 -11.214953,-0.528849 -17.320508,0 z" style="fill:#000000;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" />' + 
'   </g>' + 
'   </g>' + 
'   </g>' + 
'  <g transform="matrix(0,-0.26622669,0.25240188,0,-1.6749263,30.107988)" id="g34-6">' + 
'   <g  transform="matrix(0.7142857,0,0,0.78776018,12.371792,18.677365)"  id="g32-1">' + 
'   <path  style="fill:_color_ ;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 51.961523,32.999993 -4.330127,2.5 c -1.990153,5.038607 -0.866025,8.5 2e-6,13.000005 -0.233939,0.55604 -2.598078,0.499995 -4.330129,3.499995 L 43.30127,54 47.631398,51.5 v 12 5 l -0.866026,7.499998 c -0.141983,2.20577 -0.241674,4.473169 0.866024,8.499995 0.867246,1.290248 1.579907,2.703093 4.330127,2.5 6.702335,1.597405 12.154166,1.044194 17.320508,0 1.805139,0.07152 3.386462,-0.416774 4.330127,-2.5 0.859473,-2.157061 1.732051,-7 0.866026,-9.5 L 73.612163,68.5 v -5 l -5e-6,-12.000006 4.330127,2.5 v -2.000001 c -2.044766,-2.217629 -2.604421,-2.6439 -4.330122,-3.499995 0.125085,-4.232151 1.92555,-7.003136 -5e-6,-13.000005 l -4.330127,-2.5 c -5.275546,-0.79308 -11.214953,-0.528849 -17.320508,0 z"  id="path2-1" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.32404703px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="M 50.229473,49.500001 52.82755,55.5 v 17 l -2.598077,2.999999 z"  id="path4-3" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 47.631397,35.499993 h 3.464102 l 0.866024,-2.5 z"  id="path6-5" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 73.612159,35.499993 h -3.464102 l -0.866024,-2.5 z"  id="path8-5" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.32404703px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 71.014084,49.5 -2.598077,5.999999 v 17 l 2.598077,2.999999 z"  id="path10-3" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 51.961523,48.999999 h 17.320508 l -2.598076,6.5 H 54.559599 Z"  id="path12-5" />' + 
'   <path  style="fill:#b3b3b3;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"  d="m 54.559599,72.5 h 12.124356 l 3.464103,3.999999 V 77.5 H 51.095499 v -1.000001 z"  id="path14-3" />' + 
'   <g  id="g22-9">' + 
'  <path   d="m 54.559598,35.499993 -0.866023,0.5" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path16-4" />' + 
'  <path   d="m 53.693575,45.999993 v -10" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path18-0" />' + 
'  <path   d="M 54.559598,35.499993 V 45.499994" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path20-7" />' + 
'   </g>' + 
'   <g  transform="matrix(-1,0,0,1,121.24355,-1.547845e-7)"  id="g30-9">' + 
'  <path   d="m 54.559598,35.499993 -0.866023,0.5" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path24-4" />' + 
'  <path   d="m 53.693575,45.999993 v -10" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path26-2" />' + 
'  <path   d="M 54.559598,35.499993 V 45.499994" style="fill:none;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" id="path28-1" />' + 
'   </g></g></g></g></svg>';