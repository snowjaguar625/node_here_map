/*
	* author domschuette
	* (C) HERE 2014-2019
    * author Alex Sadovoy
	* (C) HERE 2020-2021
	*/

	
	const pdeFleetUrl = 'https://fleet.ls.hereapi.com/1/';
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var
        mapContainer = document.getElementById('mapContainer'),

        platform = new H.service.Platform({
            apikey: api_key_jp,
            useHTTPS: secure
        }),
        maptypes = platform.createDefaultLayers();
    var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    var center = new H.geo.Point(35.68066, 139.8355);

    var
        geocoder = platform.getSearchService(),
        router = platform.getRoutingService(null, 8),
        group = new H.map.Group(),
        map = new H.Map(mapContainer, omvlayer,
            {
                center: center,
                zoom: zoom,
                pixelRatio: window.devicePixelRatio || 1
            }
        );
	map.getViewModel().setLookAtData({
		tilt: 15
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="<br />JS API: 3."+ H.buildInfo().version;
	//add MRS Release information
	loadMRSVersionTxt();
	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// add long click in map event listener
	//map.addEventListener('longpress', handleLongClickInMap);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });


	map.addEventListener('contextmenu', function (e) {
		var coord  = map.screenToGeo(e.viewportX, e.viewportY);
		e.items.push(
			new H.util.ContextItem({
				label: 'Route From',
				callback: function() {
					reverseGeocode([coord.lat, coord.lng].join(), 'start');
				}
			}),
			H.util.ContextItem.SEPARATOR,
			new H.util.ContextItem({
				label: 'Route To',
				callback: function() {
					reverseGeocode([coord.lat, coord.lng].join(), 'dest');
				}
			}),
			H.util.ContextItem.SEPARATOR,
			new H.util.ContextItem({
				label: 'Via',
				callback: function() {
					reverseGeocode([coord.lat, coord.lng].join(), 'via');
				}
			})
		);
	});

	var layers = new Object();
	layers["TRAFFIC_SIGN_FC"] = {callback: pdeResponse};
	
	var signs = {};

	var	routeButton  = document.getElementById("routeButton"),
	start        = document.getElementById("start"      ),
	dest         = document.getElementById("dest"       ),
	mapReleaseTxt  = document.getElementById("mapReleaseTxt"),
	pointA,
	pointB,
	pointV,
	pdeManager = new PDEManager(null, null, layers, api_key_jp),
	currentBubble,
	numLinksMatched = 0,
	bLongClickUseForStartPoint = true,
	routeLinksMap;
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		geocode(lastClickedPos.lat + "," + lastClickedPos.lng, bLongClickUseForStartPoint);
		if(!bLongClickUseForStartPoint)
		{
			document.getElementById("dest").value = lastClickedPos.lat + "," + lastClickedPos.lng;
			group.removeAll();
		}
		else
		{
			document.getElementById("start").value = lastClickedPos.lat + "," + lastClickedPos.lng;
		}
		bLongClickUseForStartPoint = bLongClickUseForStartPoint ? false : true; 
	}

	routeButton.onclick = function ()
	{
		pointA = null; 
		pointB = null;
		pointV = null;
		group.removeAll();
		numLinksMatched = 0;
		
		Spinner.showSpinner();
		geocode(start.value, "start");
	};

	var geocode = function(searchTerm, which)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			//loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.geocode(
			{
				q: searchTerm,
			},
			function(result) {
				var item = result.items[0]
				pos = item.position
				point = new H.geo.Point(pos.lat, pos.lng);

				if(which == "start")
				{
					pointA = point;
					p = pointA;
				}else if(which == "dest"){
					pointB = point;
					p = pointB;
				}else{
					pointV = point;
					p = pointV;
				}
				line1 = pos.lat + " " + pos.lng;
				line2 = item.address.label || line1;

				marker = new H.map.DomMarker(p,
					{
						icon: createIconMarker(line1, line2)
					});
					group.addObject(marker);
					if(which == "start")
						geocode(dest.value, "dest");
					else if(pointA && pointB && !pointV && document.getElementById("via").value == "")
						calculateRoute(pointA, pointB);
					else if(pointA && pointB &&  !pointV && document.getElementById("via").value != "")
						geocode(document.getElementById("via").value, "via")
					else if(pointA && pointB && pointV)
						calculateRoute(pointA, pointB, pointV);
			},
			function(error) {
				alert(error);
			}
		);
	}

	var reverseGeocode = function(coord, inpId) {
		geocoder.reverseGeocode({
			at: coord,
			limit: 1
		},
		function(result)
		{
			//console.log("result:", result);
			var
				item = result.items[0],
				pos = item.position,
				point = new H.geo.Point(pos.lat, pos.lng),
				address = item.address,
				block = address.block || "",
				subblock = address.subblock || "",
				street = address.street ? address.street : "",
				housenumber = address.houseNumber || "",
				zip = address.postalCode ? address.postalCode : "",
				city = address.city ? address.city : "",
				label = [city, zip, street, block, subblock, housenumber]
					.filter((item) => item != "")
					.join(" ");
			document.getElementById(inpId).value = label;
		},
		function(error)
		{
			alert(error);
		}
		);
	}


	var calculateRoute = function(start, destination, via){
		signs = {};
		var wP2 = via ? ["&waypoint2=", (destination.lat+","+ destination.lng)] : [""];
		var urlRoutingReq = ["https://fleet.ls.hereapi.com/2/calculateroute.json?",
			"waypoint0=", (start.lat + "," + start.lng),
			"&waypoint1=", via ? (via.lat + "," + via.lng) : (destination.lat+","+ destination.lng),
			...wP2,
			"&legAttributes=","li",
			"&linkAttributes=fc",
			"&routeAttributes=sh&mode=fastest;car;traffic:enabled",
			"&apikey=", api_key_jp,
			"&jsoncallback=gotRoutingResponse"].join("");

		feedbackTxt.innerHTML = urlRoutingReq;
			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
		
		/*var routeRequestParams = {
			routingMode: 'fast',
			transportMode: 'car',
			//departureTime: 'any',
			origin: [start.lat, start.lng].join(","),
			via: new H.service.Url.MultiValueQueryParameter([ [via.lat, via.lng].join(",") ]),
			destination: [destination.lat, destination.lng].join(","),
			return: 'polyline,turnByTurnActions,actions,instructions,travelSummary',
			spans: 'segmentId'
		};

		router.calculateRoute(
			routeRequestParams,
			parseResponse,
			function(error) {
				alert(error);
			}
		);*/

		
	}

	var gotRoutingResponse = function(resp)
	{
		var
			linkIds = [];
		if(resp.issues){
			let errors = resp.issues.map(er => er.message);
			alert(errors.join("\n\n"));
			return;
		}
		if(!resp || !resp.response || !resp.response || !resp.response.route || !resp.response.route.length){
			alert("Route response: emtpy, unknown error");
			return;
		}
		var
			shape = resp.response.route[0].shape,
			strip = shape.reduce((strip, currValue, currIdx, arr) => {
					strip.$i = strip.$i || 0;
					if(strip.$i >= arr.length) return strip;
					strip.pushLatLngAlt(arr[strip.$i], arr[strip.$i + 1]);
					strip.$i += 2;
					return strip;
				}, new H.geo.LineString()
			),
			polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "rgba(18, 65, 145, 0.7)",
					lineJoin: "round"
				}
			});
		group.addObject(polyline);

		var linkIds = resp.response.route[0].leg
			.map((leg) => {
				return leg.link;	
			})
			.flat();
		pdeManager.setLinks(linkIds);
		pdeManager.setBoundingBoxContainer(group);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
		pdeManager.start();
		
	}


	function pdeManagerFinished(finishedRequests)
	{
		Spinner.hideSpinner();
		feedbackTxt.innerHTML = "Done. Requested " + finishedRequests + " PDE tiles for " + numLinksMatched + " route links. ";
		
		var resultHTML = '<table class="pde_table" cellpadding="2" cellspacing="0" border="1" width="90%">' +
						 '<thead>' + 
							'<tr>' +
							'<th width="80%">Sign</th>' +
							'<th width="20%">#</th>' +
							'</tr>' +
						 '</thead>' +
						 '<tbody id="maps_table_body">';

		for(var sign in signs)
		{
			resultHTML += "<tr>" + "<td>" + sign + "</td>" + "<td>" + signs[sign] + "</td>" + "</tr>";
		}
		
		resultHTML += "</tbody>" + "</table>";

		document.getElementById("resultArea").innerHTML = resultHTML;
		document.getElementById("resultArea").style.display = "block";
		
		map.addObject(group);
        map.getViewModel().setLookAtData({
            bounds: group.getBoundingBox()
        });
	}

	function pdeResponse(respJsonObj)
	{
		if (respJsonObj.error != undefined)
		{
			feedbackTxt.innerHTML = respJsonObj.error;
			return;
		}
		if (respJsonObj.responseCode != undefined)
		{
			alert (respJsonObj.message);
			feedbackTxt.innerHTML = respJsonObj.message;
			return;
		}

		feedbackTxt.innerHTML = "Received Attributes info for " + respJsonObj.Rows.length + " (splitted) links";
		for (r = 0; r < respJsonObj.Rows.length; r++)
		{
			var conditionType = respJsonObj.Rows[r].CONDITION_TYPE;
			var signType = respJsonObj.Rows[r].TRAFFIC_SIGN_TYPE == null ? "0" : respJsonObj.Rows[r].TRAFFIC_SIGN_TYPE;
			var linkIds = respJsonObj.Rows[r].LINK_IDS.split(','); // variable speed signs have 2 links, all others just one link
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
			shape = routeLink.shape,
			i,
			l = shape.length;

			for(i = 0; i < l; i+=2)
			{
				strip.pushLatLngAlt.apply(strip, [shape[i], shape[i+1]]);
			}
			

			if (conditionType == "17") {
					while (signType.length < 3) 
						signType = "0" + signType;
			}
			var trafficSignIdentifier = conditionType + "_" + signType;
			var trafficSign = trafficSigns[trafficSignIdentifier];
			var color = "rgba(255, 10, 50, 0.7)";
				
			if(signs[trafficSign] != undefined)
				signs[trafficSign]++;
			else
				signs[trafficSign] = 1;	

			// For No overtaking don't show icon, instead add polyline 
			if (conditionType == "19") {
				color = "rgba(255, 0, 0, 1)";
				polyline = new H.map.Polyline(strip, {
					style: {
						lineWidth: 5,
						strokeColor: color,
						lineJoin: "round"
					}
				});
				polyline.$CONDITION_ID = respJsonObj.Rows[r].CONDITION_ID;
				polyline.$TRAFFIC_SIGN = trafficSign;
				
				polyline.addEventListener("pointerdown", function(e){
					if (currentBubble) 
						ui.removeBubble(currentBubble);
					var html = '<div>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Condition ID: ' +
					e.target.$CONDITION_ID +
					'</p>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Sign Type: ' +
					e.target.$TRAFFIC_SIGN +
					'</p>' +
					'</div>';
					
					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
					
					currentBubble = new H.ui.InfoBubble(pos, {
						content: html
					});
					ui.addBubble(currentBubble);
				});
				
				group.addObject(polyline);
			}
			else {
			
			    // Note: The router returns the geometry points of a link in route driving direction. He doesn't start with the reference node coordinate.
				// If linkID > 0: Driving from ref node. Sign is posted at the non-ref node of the link. Last coordinate returned from router.
				// If linkID < 0: Driving to   ref node. Sign is posted at the     ref node of the link. Last coordinate returned from router.
				var stripArr = strip.getLatLngAltArray();
				var point = new H.geo.Point(stripArr[stripArr.length - 3], stripArr[stripArr.length - 2]);
				
				var signMarker;
			
				
				if (trafficIcons[trafficSignIdentifier + "_eu"]) {
					signMarker = new H.map.Marker(point, {
						icon: trafficIcons[trafficSignIdentifier + "_eu"]
					});
				}
				else {
					signMarker = new H.map.Marker(point, {
						icon: trafficIcons["11_000_eu"]
					});
				}
				// Traffic sign description available in PDE documentation
				
				signMarker.$CONDITION_ID = respJsonObj.Rows[r].CONDITION_ID;
				signMarker.$TRAFFIC_SIGN = trafficSign;
				signMarker.addEventListener("pointerdown", function(e){
					if (currentBubble) 
						ui.removeBubble(currentBubble);
					var html = '<div>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Condition ID: ' +
					e.target.$CONDITION_ID +
					'</p>' +
					'<p style="font-family:Arial,sans-serif; font-size:12px;">Sign Type: ' +
					e.target.$TRAFFIC_SIGN +
					'</p>' +
					'</div>';
					
					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY-10);
					
					currentBubble = new H.ui.InfoBubble(pos, {
						content: html
					});
					ui.addBubble(currentBubble);
				});
				group.addObject(signMarker);
			}
			numLinksMatched++;
		}
	};


	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
        line2 = line2.trim();
		line1 = line1.trim();
		var domElement = document.createElement('div');
		domElement.style.marginTop = "-55px";
		domElement.style.marginLeft = "-27px";
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line1.length * 8);
        svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 8 + 80);
		domElement.innerHTML = svgMarker;

		return new H.map.DomIcon(domElement);
	};