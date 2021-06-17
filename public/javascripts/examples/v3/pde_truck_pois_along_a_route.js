/*
	* author domschuette
	* (C) HERE 2017
	*/

	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	geocoder = platform.getGeocodingService(),
	router = platform.getRoutingService(),
	group = new H.map.Group(),
	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: zoom
		}
	);

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

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var layers = new Object();
	layers["TRUCK_POI"] = {callback: pdeResponse, isFCLayer: false, level: 13};


	var	routeButton  = document.getElementById("routeButton"),
	start        = document.getElementById("start"      ),
	dest         = document.getElementById("dest"       ),
	mapReleaseTxt  = document.getElementById("mapReleaseTxt"),
	pointA,
	pointB,
	pdeManager = new PDEManager(app_id, app_code, layers),
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
		group.removeAll();
		geocode(start.value, true);
	};

	var geocode = function(searchTerm, start)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geocoder.search(
			{
				searchText: searchTerm
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition
				}
				if(start)
					pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
				else
					pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

				if(result.Response.View[0].Result[0].Location != null)
				{
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else
				{
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}

				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = address.Label ? address.Label : line1;

				marker = new H.map.Marker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					if(start)
						geocode(dest.value, false);
					else
						calculateRoute(pointA, pointB);
			},
			function(error) {
				alert(error);
			}
		);
	}

	var calculateRoute = function(start, destination){
		var urlRoutingReq =
		["https://route.",
			"api.here.com/routing/7.2/calculateroute.json?",
			"jsonAttributes=1&",
			"waypoint0=",
			start.lat,
			",",
			start.lng,
			"&waypoint1=",
			destination.lat,
			",",
			destination.lng,
			"&representation=overview",
			"&routeattributes=sc,sm,sh,bb,lg,no,shape",
			"&legattributes=li",
			"&linkattributes=sh,nl,fc",
			"&mode=fastest;car;traffic:enabled",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=parseResponse"].join("");

			feedbackTxt.innerHTML = urlRoutingReq;
			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}


	// parse the routing response
	var parseResponse = function (resp)
	{
		if (resp.error != undefined)
		{
			alert (resp.error);
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.response == undefined)
		{
			alert (resp.subtype + " " + resp.details);
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+resp.response.metaInfo.moduleVersion;
			routerMapRelease = resp.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}

		var strip = new H.geo.Strip(),
		shape = resp.response.route[0].shape,
		i,
		l = shape.length;

		for(i = 0; i < l; i++)
		{
			strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
		}

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

			pdeManager.setLinks(resp.response.route[0].leg[0].link);
			numLinksMatched=resp.response.route[0].leg[0].link.length; //to display later on how many links were matched in the route
			pdeManager.setBoundingBoxContainer(group);
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
			pdeManager.start();
	}

	function pdeManagerFinished(finishedRequests)
	{
		feedbackTxt.innerHTML = "Done. Requested " + finishedRequests + " PDE tiles for " + numLinksMatched + " route links. ";
		map.addObject(group);
		map.setViewBounds(group.getBounds());
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
		for (var r = 0; r < respJsonObj.Rows.length; r++)
		{
			var currentRow = respJsonObj.Rows[r];
			var lat = currentRow.LAT / 100000,
				lng = currentRow.LON / 100000,
				html = "";
				
			if(currentRow.NAMES != null)
				html += "<h4>NAMES: " + extractNames(currentRow.NAMES)[0].text + "</h4>";
			if(currentRow.POI_ID != null)
				html += "<h4>POI_ID: " + currentRow.POI_ID + "</h4>";
			if(currentRow.LINK_ID != null)
				html += "<h6>LINK_ID: " + currentRow.LINK_ID + "</h6>";
			if(currentRow.SIDE_OF_STREET != null)
				html += "<h6>SIDE_OF_STREET: " + currentRow.SIDE_OF_STREET + "</h6>";
			if(currentRow.CHAIN_ID != null)
				html += "<h6>CHAIN_ID: " + currentRow.CHAIN_ID + "</h6>";
			if(currentRow.CAT_ID != null)
				html += "<h6>CAT_ID: " + currentRow.CAT_ID + "</h6>";
			if(currentRow.DIESEL != null)
				html += "<h6>DIESEL: " + currentRow.DIESEL + "</h6>";
			if(currentRow.BIODIESEL != null)
				html += "<h6>BIODIESEL: " + currentRow.BIODIESEL + "</h6>";
			if(currentRow.VEGETABLE_OIL != null)
				html += "<h6>VEGETABLE_OIL: " + currentRow.VEGETABLE_OIL + "</h6>";
			if(currentRow.LPG != null)
				html += "<h6>LPG: " + currentRow.LPG + "</h6>";
			if(currentRow.CNG != null)
				html += "<h6>CNG: " + currentRow.CNG + "</h6>";
			if(currentRow.OPEN_24_HOURS != null)
				html += "<h6>OPEN_24_HOURS: " + currentRow.OPEN_24_HOURS + "</h6>";
			if(currentRow.SECURE_PARKING != null)
				html += "<h6>SECURE_PARKING: " + currentRow.SECURE_PARKING + "</h6>";
			if(currentRow.NIGHT_PARKING_ONLY != null)
				html += "<h6>NIGHT_PARKING_ONLY: " + currentRow.NIGHT_PARKING_ONLY + "</h6>";
			if(currentRow.WEIGH_IN_MOTION != null)
				html += "<h6>WEIGH_IN_MOTION: " + currentRow.WEIGH_IN_MOTION + "</h6>";
			if(currentRow.WIFI != null)
				html += "<h6>WIFI: " + currentRow.WIFI + "</h6>";
			if(currentRow.IDLE_REDUCTION_SYSTEM != null)
				html += "<h6>IDLE_REDUCTION_SYSTEM: " + currentRow.IDLE_REDUCTION_SYSTEM + "</h6>";
			if(currentRow.TRUCK_SCALES != null)
				html += "<h6>TRUCK_SCALES: " + currentRow.TRUCK_SCALES + "</h6>";
			if(currentRow.TRUCK_SERVICE != null)
				html += "<h6>TRUCK_SERVICE: " + currentRow.TRUCK_SERVICE + "</h6>";
			if(currentRow.TRUCK_WASH != null)
				html += "<h6>TRUCK_WASH: " + currentRow.TRUCK_WASH + "</h6>";
			if(currentRow.SHOWERS != null)
				html += "<h6>SHOWERS: " + currentRow.SHOWERS + "</h6>";
			if(currentRow.HIGH_CANOPY != null)
				html += "<h6>HIGH_CANOPY: " + currentRow.HIGH_CANOPY + "</h6>";
			if(currentRow.HGV_PUMPS != null)
				html += "<h6>HGV_PUMPS: " + currentRow.HGV_PUMPS + "</h6>";
			if(currentRow.PAY_AT_PUMP != null)
				html += "<h6>PAY_AT_PUMP: " + currentRow.PAY_AT_PUMP + "</h6>";
			if(currentRow.CONVENIENCE_STORE != null)
				html += "<h6>CONVENIENCE_STORE: " + currentRow.CONVENIENCE_STORE + "</h6>";
			if(currentRow.POWER_SUPPLY != null)
				html += "<h6>POWER_SUPPLY: " + currentRow.POWER_SUPPLY + "</h6>";
			if(currentRow.CHEMICAL_TOILET_DISPOSAL != null)
				html += "<h6>CHEMICAL_TOILET_DISPOSAL: " + currentRow.CHEMICAL_TOILET_DISPOSAL + "</h6>";
			if(currentRow.REST_AREA_TYPE != null)
				html += "<h6>REST_AREA_TYPE: " + currentRow.REST_AREA_TYPE + "</h6>";
			if(currentRow.NBR_OF_SLOTS != null)
				html += "<h6>NBR_OF_SLOTS: " + currentRow.NBR_OF_SLOTS + "</h6>";
			if(currentRow.DANGEROUS_GOODS_ALLOWED != null)
				html += "<h6>DANGEROUS_GOODS_ALLOWED: " + currentRow.DANGEROUS_GOODS_ALLOWED + "</h6>";
			if(currentRow.RESTAURANT != null)
				html += "<h6>RESTAURANT: " + currentRow.RESTAURANT + "</h6>";
			if(currentRow.SNACK_BAR != null)
				html += "<h6>SNACK_BAR: " + currentRow.SNACK_BAR + "</h6>";
			if(currentRow.GOBOX != null)
				html += "<h6>GOBOX: " + currentRow.GOBOX + "</h6>";
			if(currentRow.DOCTOR_STOP != null)
				html += "<h6>DOCTOR_STOP: " + currentRow.DOCTOR_STOP; + "</h6>";
			if(currentRow.LICENSE_CONTROL != null)
				html += "<h6>LICENSE_CONTROL: " + currentRow.LICENSE_CONTROL + "</h6>";
			if(currentRow.TOLL_TERMINAL != null)
				html += "<h6>TOLL_TERMINAL: " + currentRow.TOLL_TERMINAL; + "</h6>";
			if(currentRow.BATHROOM != null)
				html += "<h6>BATHROOM: " + currentRow.BATHROOM + "</h6>";
			if(currentRow.PARKING != null)
				html += "<h6>PARKING: " + currentRow.PARKING + "</h6>";
			if(currentRow.PERCENT_FROM_REFNODE != null)
				html += "<h6>PERCENT_FROM_REFNODE: " + currentRow.PERCENT_FROM_REFNODE + "</h6>";
			if(currentRow.CAR_WASH != null)
				html += "<h6>CAR_WASH: " + currentRow.CAR_WASH + "</h6>";

			var marker = new H.map.Marker(new H.geo.Point(lat, lng));
			
			marker.$html = html;

			marker.addEventListener("pointerdown", function(e)
				{
					if(currentBubble)
						ui.removeBubble(currentBubble);
					currentBubble = new H.ui.InfoBubble(e.target.getPosition(), { content: e.target.$html });
					ui.addBubble(currentBubble);

				}
			);
			
			group.addObject(marker);
		}
	};
	
	var extractNames = function(str)
	{
		/*	NAMES = NAME1 \u001D NAME2 \u001D NAME3 ...
			NAME = NAME_TEXT \u001E TRANSLIT1 ; TRANSLIT2 ; ... \u001E PHONEME1 ; PHONEME2 ; ...
			NAME_TEXT = LANGUAGE_CODE NAME_TYPE IS_EXONYM text
			TRANSLIT = LANGUAGE_CODE text
			PHONEME = LANGUAGE_CODE IS_PREFERRED text
			LANGUAGE_CODE is a 3 character string
			NAME_TYPE is one letter (A = abbreviation, B = base name, E = exonym, K = shortened name, S = synonym)
			IS_EXONYM = Y if the name is a translation into another language
			IS_PREFERRED = Y if this is the preferred phoneme.
		*/
		
		var ret = new Array(),
			names = str.split("\u001D");
			for(var i = 0; i < names.length; i++)
			{
				var name = names[i],
					name_text_split = name.split("\u001E"),
					name_text = name_text_split[0],
					translit = name_text_split[1],
					translitsObj = new Array(),
					phoneme = name_text_split[2],
					phonemesObj = new Array();
					
					
				// get the first 3 characters as language code, 4 character is the name type, 5 character is_exonym
				var language_code = name_text.substring(0,3),
					name_type = name_text.substring(3,4),
					is_exonym = name_text.substring(4,5),
					text = name_text.substring(5, name_text.length);
				
				if(translit)
				{
					var translits = translit.split(";");
					for(var j = 0; j < translits.length; j++)
					{
						var lcode = translits[j].substring(0,3),
							tr = translits[j].substring(3,translits[j].length);
						translitsObj.push({ language_code : lcode, translit: tr});
					}
				}

				if(phoneme)
				{
					var phonemes = phoneme.split(";");
					for(var j = 0; j < phonemes.length; j++)
					{
						var lcode = phonemes[j].substring(0,3),
							pr = phonemes[j].substring(3,4),
							ph = phonemes[j].substring(4,phonemes[j].length);
						phonemesObj.push({ language_code : lcode, prefered : pr, phoneme: ph});
					}
				}
				
				ret.push({language_code : language_code, name_type: name_type, is_exonym : is_exonym, text: text, translits: translitsObj, phonemes : phonemesObj});
			}
		return ret;
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length  * 4 + 30 );
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length  * 4 + 80);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});

	};