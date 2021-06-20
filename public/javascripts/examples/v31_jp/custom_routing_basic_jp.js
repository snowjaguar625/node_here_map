/*
	(C) HERE 2017
	Author - Sachin Jonda
	*/
    apikey = api_key_jp;
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection
	var mapContainer = document.getElementById('mapContainer'),
		platform = new H.service.Platform({apikey: apikey, useHTTPS: secure}),
		maptypes = platform.createDefaultLayers(),
		group = new H.map.Group(),
		layers = null,
		secondaryGrp= new H.map.Group(),
		dotGrp = new H.map.Group(),
		routegroup = new H.map.Group(),
		// Japan styling requisites
		omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'}),
		baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/',
		// create a Japan specific style
		style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl),

		// instantiate provider and layer for the basemap
		omvProvider = new H.service.omv.Provider(omvService, style),
		omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22}),
		map = new H.Map(mapContainer, omvlayer,
			{
				center: new H.geo.Point(35.68066, 139.8355),
				zoom: 8,
                pixelRatio: window.devicePixelRatio || 1
			}
		);
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());	// Do not draw under control panel
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));	// add behavior control
	map.addEventListener('longpress', handleLongClickInMap);	// add long click in map event listener
	var ui = H.ui.UI.createDefault(map, maptypes);	// add UI
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addObject(group);
	map.addObject(secondaryGrp);
	map.addObject(dotGrp);

	var endpoint = 'https://fleet.ls.hereapi.com';
	var endPointFromUrl = getUrlParameter('host');
	if( endPointFromUrl != null && endPointFromUrl.length != 0 ) {
		endpoint = ( endPointFromUrl.includes('fleet.ls.hereapi.com') || endPointFromUrl.includes('fleet.ls.hereapi.com') ? 'https://' : 'http://' ) + endPointFromUrl;
		document.getElementById('endpoint-text-input').value= endpoint;
	}

	// Block the "Alte Bruecke" in Frankfurt/Germany. Links FC3 722493835 + FC3 722493836
	// Create a new bridge West of "Alte Bruecke". Shape goes from North to South. Split FC3 755264823 (North) & FC2 755383513 (South)
    document.getElementById('overlay-submit-area').value =
		'/2/overlays/upload.json\n?map_name=OVERLAYBASICDEMO1&overlay_spec=\n' +
		'[{"op":"override",\n"shape":[[35.71873,139.67335],[35.71856,139.67373]],\n"layer":"LINK_ATTRIBUTE_FCn",\n"data":{"VEHICLE_TYPES":"0"}},\n' +
		'{"op":"create",\n"shape":[[35.71873,139.67335],[35.71856,139.67373],[35.71857,139.67429]],\n\"data\":{\"NAMES\":\"ENGBNDemo Road\"}}]\n' +
		'&apikey=' + apikey + '\n&storage=readonly';

    document.getElementById('overlay-display-area').value =
		'/2/search/all.json\n' +
		'?map_name=OVERLAYBASICDEMO1&geom=full\n' +
		'&layer_id=LINK_ATTRIBUTE_FC1,LINK_ATTRIBUTE_FC2,LINK_ATTRIBUTE_FC3,LINK_ATTRIBUTE_FC4,LINK_ATTRIBUTE_FC5\n' +
		'&acceptMissingLayers=true\n' +
		//'&layer_id=LINK_ATTRIBUTE_FC2,LINK_ATTRIBUTE_FC3\n' +
		'&apikey=' + apikey;

    document.getElementById('route-area').value =
		'/2/calculateroute.json\n' +
		'?waypoint0=35.71873,139.67335&waypoint1=35.71857,139.67429\n' +
		'&mode=fastest;car;traffic:disabled&overlays=OVERLAYBASICDEMO1\n' +
		'&apikey=' + apikey;

    document.getElementById('overlay-delete-area').value =
		'/2/maps/delete.json?map_name=OVERLAYBASICDEMO1\n' +
		'&apikey=' + apikey + '\n&storage=readonly';

	// Select a coordinate by LongClick into map

	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		var coordsString= Math.round(lastClickedPos.lat * 100000.0) / 100000.0 + ',' + Math.round(lastClickedPos.lng * 100000.0) / 100000.0
		feedbackTxt.innerHTML +=  '\n' + coordsString;
		var point = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng);
		var marker = new H.map.DomMarker(point, { icon: createIconMarker(coordsString, "") });
		group.addObject(marker);

		navigator.clipboard.writeText(coordsString)
		.then(() => {
			console.log('Text copied to clipboard');
		})
		.catch(err => {
			// This can happen if the user denies clipboard permissions:
			console.error('Could not copy text: ', err);
		});
	}

	var submit_overlay = function()
	{
		var endpoint= document.getElementById('endpoint-text-input').value;
		var url = document.getElementById("overlay-submit-area").value.replace(/\r?\n/g, "") + '&callback=gotOverlayResponse';
		script = document.createElement("script");
		script.src = encodeUrlParameters(endpoint, url);
		document.body.appendChild(script);
	};

	var gotOverlayResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined) {
			alert (respJsonObj.error);
			feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
			return;
		}
		feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
	};

	var display_overlay = function(counter)
	{
		//group = new H.map.Group();

		if(counter == undefined)
		{
			var cleanCheckbox= document.getElementById('overlay-display-clean');
			if( cleanCheckbox.checked ) { group.removeAll(); secondaryGrp.removeAll(); routegroup.removeAll(); }
			geometryCount = 0;
		}

		var endpoint= document.getElementById('endpoint-text-input').value;
		var url = document.getElementById("overlay-display-area").value.replace(/\r?\n/g, "") + '&callback=gotSearchAllResponse' + (counter != undefined ? '&start_geometry_id=' + counter + '&no_of_records=500' : "");
		script =  document.createElement("script");
		script.src = encodeUrlParameters(endpoint, url);
		document.body.appendChild(script);
	};
	var hexToRGBAConverter = function(hex){
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    	return r + r + g + g + b + b;
  		});

  		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  		return result ? 'rgba('+
    		parseInt(result[1], 16)+','+
    		parseInt(result[2], 16)+','+
    		parseInt(result[3], 16)+','+
			0.5+')'
	 	 : null;

	}

	var gotSearchAllResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined) {
			alert (respJsonObj.error);
			feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
			return;
		}
		var showLinkIds= document.getElementById('overlay-display-linkids');
		var color= document.getElementById("overlay-display-color").value;
		//var inscrField= document.getElementById("selected-attribute");
		var e = document.getElementById("selected-attribute");
		var inscrField = e.options[e.selectedIndex].value;
		// for debugging: feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
		var links = respJsonObj.geometries;

		if(links === null || links.length == 0)
			geometryCount = 0;

		if(links !== null) {
			for (var i = 0; i < links.length; i++)	{
				var strip = new H.geo.LineString();
				var geometryId = links[i].attributes["GEOMETRY_ID"] != undefined ? parseInt(links[i].attributes["GEOMETRY_ID"]) : -1;
				if(geometryCount < geometryId)
					geometryCount = geometryId;

				var lineString0 = new H.geo.LineString();
				var lineString1 = new H.geo.LineString();
				var shape = links[i].geometry.startsWith('LINESTRING')
					? links[i].geometry.substring(11, links[i].geometry.length - 1).split(',') // LINESTRING(lat lon, lat lon, ...)
					: links[i].geometry.substring(17, links[i].geometry.length - 2).split(',') // MULTILINESTRING((lat lon, lat lon, ...))
				for (var j = 0; j < shape.length; j++) {
					var lonLat = shape[j].trim().split(' ');
					strip.pushLatLngAlt(parseFloat(lonLat[1]), parseFloat(lonLat[0]), 0);
					if( j == 0 ){
						 lineString0.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); 
						 //lineString0.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); 
					}
					if( j == shape.length-1 ){ 
						lineString1.pushPoint({lat: parseFloat(lonLat[0]), lng: parseFloat(lonLat[1]) }); 
						//lineString1.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); 
					}
				}

				var isAttrChanged= links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty("LINK_ID") && links[i].attributes.LINK_ID > 10000000;
				var isBlocked= inscrField==='LINK_ID' && links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty("VEHICLE_TYPES") && links[i].attributes.VEHICLE_TYPES === "0";

				var width= 11;
				if(isAttrChanged) 
					width= 7;
				if(isBlocked) 
					width= 15;
				var polyline = isBlocked  ? new H.map.Polyline(strip, 
																{ style: 
																		{ 
																			lineDash:[2,2], 
																			lineWidth: width, 
																			strokeColor: color, 
																			fillColor: color, 
																			lineJoin: "round" 
																		} 
																}) :
											new H.map.Polyline(strip, 
																{ style: 
																	{ 
																		lineWidth: width, 
																		strokeColor: isAttrChanged ? hexToRGBAConverter(color) : color, 
																		fillColor: isAttrChanged ? hexToRGBAConverter(color) : color, 
																		lineJoin: "round" 
																	} });
				group.addObject(polyline);
				if( links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty(inscrField) ) {

					coords=  strip.getLatLngAltArray()
					l= coords.length / 3;
					cl= Math.floor(l / 2);
					var inscLat= (coords[0] + coords[3]) / 2;
					var inscLon= (coords[1] + coords[4]) / 2;

					if( coords.length > 6 )
					{
						inscLat= coords[cl*3]
						inscLon= coords[cl*3+1]
					}

					if( links[i].attributes.hasOwnProperty(inscrField) && links[i].attributes[inscrField].length )
					switch( inscrField ) {
						case "LINK_ID":
						{
							var linkText= isBlocked ? '(' + links[i].attributes.LINK_ID + ')' : links[i].attributes.LINK_ID;

							addSVGMarker( secondaryGrp, linkText, color, inscLat, inscLon, links[i].attributes.LINK_ID < 10000000 );
						}
						break;

						case "CUSTOM_RESTRICTION_PAIRS":
						{
							var intArray= links[i].attributes[inscrField].split(',') ;
							var str='' + (intArray[1] != 2147483647 ? intArray[1] : '-');
							for( var j= 3; j < intArray.length; j+=2 ) str = str + ', ' + (intArray[j] != 2147483647 ? intArray[j] : '-');

							//var inscrText= isBlocked ? '' : str;
							addSVGMarker( secondaryGrp, str, color, inscLat, inscLon, false );
						}
						break;
					}
					addDot(dotGrp,lineString0.W[0], lineString0.W[1]);
					addDot(dotGrp,lineString1.W[0], lineString1.W[1]);
					
					/*secondaryGrp.addObject( new H.map.Polyline(lineString0, 
																		{ style: {
																			 lineWidth: Math.max( 9, width), 
																			 strokeColor: "black", 
																			 lineJoin: "round", 
																			 zIndex: "2" } 
																		}) 
																);
					secondaryGrp.addObject( new H.map.Polyline(lineString1, 
																		{ style: { 
																			lineWidth: Math.max( 9, width), 
																			strokeColor: "black", 
																			lineJoin: "round", 
																			zIndex: "2" } 
																		}) 
																);*/
				}
			}
		}

		if(geometryCount !=0 )
			display_overlay(geometryCount++);
		else
		{
			map.addObject( group );
			if( showLinkIds.checked ) map.addObject( secondaryGrp );
			map.getViewModel().setLookAtData(group.getBoundingBox());
		}
	};

	var handleSecondary= function(checkbox)
	{
		if( checkbox.checked )
			map.addObject( secondaryGrp );
		else
			map.removeObject( secondaryGrp );
	}

	var request_route = function(start, destination)
	{
		routegroup.removeAll();
		var endpoint= document.getElementById('endpoint-text-input').value;
		var url = document.getElementById("route-area").value.replace(/\r?\n/g, "") + '&jsoncallback=gotRoutingResponse';
		script = document.createElement("script");
		script.src = encodeUrlParameters( endpoint, url );
		document.body.appendChild(script);
	};

	var gotRoutingResponse = function (respJsonRouteObj)
	{
		routegroup.removeAll();

		var errmessage= null;
		if (respJsonRouteObj.error != undefined) {
			errmessage= respJsonRouteObj.error;
		}
		else if (respJsonRouteObj.issues != undefined && respJsonRouteObj.issues[0].message != undefined) {
			errmessage= respJsonRouteObj.issues[0].message;
		}
		else if (respJsonRouteObj.message != undefined) {
			errmessage= respJsonRouteObj.message;
		}

		if( errmessage!== null )
		{
			feedbackTxt.innerHTML = '\nCannot calculate route:\n' + errmessage + '\n';
			return;
		}

		var strip = new H.geo.LineString();
		for (var l = 0; l < respJsonRouteObj.response.route[0].leg.length; l++)	{
			var links = respJsonRouteObj.response.route[0].leg[l].link;
			for (var i = 0; i < links.length; i++)	{
				var shape = links[i].shape;
				for (var j = 0; j < shape.length; j++) {
					if (shape[j].toFixed != undefined) {  // &jsonattributes=41 -> array of lat, lon, lat, lon...
						strip.pushLatLngAlt(shape[j], shape[j + 1], 0);
						j++;
					} else { // array of "lat,lon", "lat,lon", ...
						var latLon = shape[j].split(",");
						strip.pushLatLngAlt(parseFloat(latLon[0]), parseFloat(latLon[1]), 0);
					}
				}
			}
		}
		var routeOutline  = new H.map.Polyline(strip, { 
								style: { 
									lineWidth: 10, 
									strokeColor: 'rgba(0, 128, 255, 0.7)',
									lineTailCap: 'arrow-tail',
									lineHeadCap: 'arrow-head'
								} 
							});
		var routeArrows = new H.map.Polyline(strip, {
								style: {
									lineWidth: 10,
									fillColor: 'white',
									strokeColor: 'rgba(255, 255, 255, 1)',
									lineDash: [0, 2],
									lineTailCap: 'arrow-tail',
									lineHeadCap: 'arrow-head' 
								}
								});
		
		routegroup.addObjects([routeOutline, routeArrows]);
		// show maneuver instructions
		if ( document.getElementById('route-display-maneuvers').checked )
		{
			for (var l = 0; l < respJsonRouteObj.response.route[0].leg.length; l++)	{
				var maneuvers = respJsonRouteObj.response.route[0].leg[l].maneuver;
				for (var i = 0; maneuvers && i < maneuvers.length; i++)	{
					var lat = maneuvers[i].position.latitude;
					var lon = maneuvers[i].position.longitude;
					var point = new H.geo.Point(parseFloat(lat), parseFloat(lon));
					var instr = maneuvers[i].instruction.replace(new RegExp("</span>", 'g'), "").replace(new RegExp('<span class="[a-z\-]+">', 'g'), "");
					var marker = new H.map.DomMarker(point, { icon: createIconMarker(maneuvers[i].travelTime + " seconds", instr) });
					routegroup.addObject(marker);
				}
			}
		}
		map.addObject(routegroup);
		map.getViewModel().setLookAtData(routegroup.getBoundingBox());
	}

	var delete_overlay = function()
	{
		var endpoint= document.getElementById('endpoint-text-input').value;
		var url = document.getElementById("overlay-delete-area").value.replace(/\r?\n/g,"" ) + '&callback=gotDeleteResponse';

		script = document.createElement("script");
		script.src = encodeUrlParameters( endpoint, url );
		document.body.appendChild(script);
	};

	var gotDeleteResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined) alert (respJsonObj.error);
		feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
	};

	var svgMarkerImage_Line='<svg width="__widthAll__" height="60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<g>' +
	'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="30" width="__width__" y="11" x="45" fill="#ffffff" fill-opacity="0.6"/>'+
	'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="55" stroke-width="0" fill="#000000">__line1__</text>' +
	'<text id="label-desc" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="8" y="36" x="55" stroke-width="0" fill="#000000">__line2__</text>'+
	'<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
	'</g>'+
	'</svg>';

	//--- Create marker with 2 text lines
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;
		var ll = Math.max(line1.length, line2.length);
		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, ll * 4 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, ll * 4 + 100);
		return new H.map.DomIcon(svgMarker);
	};

	var encodeUrlParameters = function (endpoint, url) {
		if( endpoint.endsWith("/") ) endpoint.substring( 0, endpoint.length-1 );
		if( ! url.startsWith("/") ) url= '/' + url;
		var urlParts= url.split('?');
		var urlParams= urlParts[1].split('&');

		for (var i = 0; i < urlParams.length; i++) {
			var nameValue= urlParams[i].split('=');
			urlParams[i] = encodeURIComponent( nameValue[0] ) + '=' + (nameValue.length > 1 ? encodeURIComponent( nameValue[1] ) : "");
		}
		var allEncUrlParams= urlParams.join('&');
		var result= [ endpoint, urlParts[0], '?', allEncUrlParams].join('');
		console.log( result );
		return result;
	}

	function addDot(dotGrp, lat, lng){
		//var dotsvg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg> ';
		//var anIcon = new H.map.Icon( dotsvg);
		//dotGrp.addObject(new H.map.Marker({lat: lat, lng: lng }, {icon: anIcon}));
		dotGrp.addObject(new H.map.Marker({lat: lat, lng: lng }));
	}
	function addSVGMarker( group, text, color, latitude, longitude, isDrawnUnder ) {
		var w= 10 * text.length
		//Create the svg mark-up
		// stroke="black"
		var svgMarkup = '<svg  width="' + w + '" height="24" xmlns="http://www.w3.org/2000/svg">' +
		'<rect fill="${FILL}" fill-opacity="0.3" x="1" y="1" width="' + w + '" height="22" />' +
		'<text x="1" y="18" font-size="12pt" font-family="monospace" font-weight="bold" ' +
		'text-anchor="start" fill="${STROKE}" >${Text}</text></svg>';

		var anIcon = new H.map.Icon( svgMarkup.replace('${FILL}', color).replace('${STROKE}', "black").replace('${Text}', text), {anchor: new H.math.Point(w/2, (isDrawnUnder ? 0 : 24) )} );
		//var anchor= anIcon.setAnchor(new H.math.Point(w/2, 12));
		//console.log(anIcon.getAnchor());

		group.addObject(new H.map.Marker({lat: latitude, lng: longitude }, {icon: anIcon}));
}

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