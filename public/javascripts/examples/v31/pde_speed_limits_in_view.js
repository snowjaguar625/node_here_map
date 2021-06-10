/*
		author domschuette
		(C) HERE 2016-2019
	*/


	var smapTileRequests = [], // elements have tileX, tileY, fc, level
		mapContainer = document.getElementById("mapContainer"),
		iconMap = {},
		dmarkerColor = "rgba(255, 224, 22, 1)",
		layers = null,
		pdeManager = new PDEManager(app_id, app_code, layers),
		currentBubble;

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Initialize our map
	var platform = new H.service.Platform({
            apikey: api_key,
            useHTTPS: secure
        }),
        maptypes = platform.createDefaultLayers();
		map = new H.Map(mapContainer, maptypes.vector.normal.map, {
                center: new H.geo.Point(50.161420780029026 , 8.534013309478581),
                zoom: 16,
                pixelRatio: window.devicePixelRatio || 1
            });

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	var rectSelection = new H.ui.RectangleSelection();
	ui.addControl('RectangleSelection', rectSelection);
	rectSelection.setCallback(selection);
	
	var rect = null;
	
	var pdeReleaseShown = false;

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	date = document.getElementById("date"),
		time = document.getElementById("time"),
		trucks = document.getElementById("trucks"),
		truckOptions = document.getElementById("truckoptions"),
		mapReleaseTxt = document.getElementById("mapReleaseTxt"),
		depature,
		numLinksMatched = 0,
		conditionalSpeeds = new Object(),
		speeds = new Object(),
		variableSpeeds = new Object(),
		pdeManager = new PDEManager(app_id, app_code, layers),
		group = new H.map.Group(),
		now = moment(),
		truck = false,
		roadGeom = new Object();
	
	date.value = now.format("YYYY-MM-DD");
	time.value = now.format("HH:mm");

	var handleTruck = function()
	{
		if(document.getElementById("vehicletype").value == "32")
		{
			truck = true;
			truckOptions.style.display = "block";
		}
		else
		{
			truck = false;
			truckOptions.style.display = "none";
		}
	}
	
	var releaseRoutingShown=false;

	
	date.value = now.format("YYYY-MM-DD");
	time.value = now.format("HH:mm");
	
	loadSpeedLimitsFromView = function()
	{
		rect = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		loadSpeedLimits(rect);
	}
	

	loadSpeedLimits = function(rect)
	{
		Spinner.showSpinner();

		if(truck)
		{
			layers = new Object();
			layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
			layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
			layers["TRUCK_SPEED_LIMITS_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
			layers["ROAD_GEOM_FC"] = {callback: gotRoadGeomFC};
		}
		else
		{
			layers = new Object();
			layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
			layers["SPEED_LIMITS_COND_FC"] = {callback: gotCONDSpeedLimits};
			layers["SPEED_LIMITS_VAR_FC"] = {callback: gotVariableSpeedLimits};
			layers["ROAD_GEOM_FC"] = {callback: gotRoadGeomFC};
		}

		pdeManager.setLayers(layers);
		pdeManager.setMeta(true);

		group.removeAll();
		
		depature = date.value + "T" + time.value + ":00";
		group = new H.map.Group();
		
		pdeManager.setBoundingBoxContainer(group);
		
		pdeManager.setBoundingBox(rect);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);

		pdeManager.start();
	}

	function pdeManagerFinished(evt)
	{
		map.addObject(group);
		
		time = moment(depature),
		ii = 0,
		ll = Object.keys(roadGeom).length;

		for(;ii < ll; ii++)
		{
			var linkID = Object.keys(roadGeom)[ii],
			validCondition = false,
			clink = conditionalSpeeds[linkID],
			dtp,
			variable = false;
			if(!clink)
			{
				variable = variableSpeeds[linkID];

			}
			if(clink)
			{
				var cll = clink.length,
				c = 0,
				speedLimit,
				vehicleMask;

				for(; c < cll; c++)
				{
					vehicleMask = (clink[c].VEHICLE_TYPES != undefined) ? clink[c].VEHICLE_TYPES : clink[c].TRUCK_TYPES; // compatible with older maps
					if(clink[c].DATE_TIMES)
					{
						dtp = new DateTimeParser(clink[c].DATE_TIMES, time);
						if(!truck)
						{
							validCondition = (dtp.check() && validateVehicleType(vehicleMask));
						}
						else
						{
							var truckcond = validateTruckOptions(clink[c].TRAILER, clink[c].MIN_WEIGHT, clink[c].MAX_WEIGHT, clink[c].LENGTH, clink[c].EXPL_DANG_MATERIAL);
							validCondition = (dtp.check() && validateVehicleType(vehicleMask) && truckcond);
						}
						if(speeds[linkID])
						{
							var routeLinkDir = linkID < 0 ? "-" : "+";
							if(routeLinkDir == '-' && speeds[linkID].TO_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].TO_REF_SPEED_LIMIT, speeds[linkID].TO_REF_SPEED_LIMIT);
							else if(speeds[linkID].FROM_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].FROM_REF_SPEED_LIMIT, speeds[linkID].FROM_REF_SPEED_LIMIT);
							else
								speedLimit = clink[c].SPEED_LIMIT;
						}
					}
					else
					{
						if(!truck)
						{
							validCondition = validateVehicleType(vehicleMask);
						}
						else
						{
							var truckcond = validateTruckOptions(clink[c].TRAILER, clink[c].MIN_WEIGHT, clink[c].MAX_WEIGHT, clink[c].LENGTH, clink[c].EXPL_DANG_MATERIAL);
							validCondition = (validateVehicleType(vehicleMask) && truckcond);

						}
						if(speeds[linkID])
						{
							var routeLinkDir = linkID < 0 ? "-" : "+";
							if(routeLinkDir == '-' && speeds[linkID].TO_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].TO_REF_SPEED_LIMIT, speeds[linkID].TO_REF_SPEED_LIMIT);
							else if(speeds[linkID].FROM_REF_SPEED_LIMIT != null)
								speedLimit = getLowerSpeedLimit(clink[c].FROM_REF_SPEED_LIMIT, speeds[linkID].FROM_REF_SPEED_LIMIT);
							else
								speedLimit = clink[c].SPEED_LIMIT;
						}
					}

					if(validCondition)
					{
						//if variable and conditional - append the word variable to the
						//restriction value.
						conditional = (speedLimit == clink[c].SPEED_LIMIT);
						speedLimit = speedLimit + " KM/H ";
						if (variable) speedLimit = speedLimit + " + variable signs";
						
						var point = new H.geo.Point(roadGeom[linkID].lat, roadGeom[linkID].lng)
						if(!rect.containsPoint(point))
							continue;

						var	marker4Speed = new H.map.Marker(
							point,
							{
								icon: createIconMarkerSpeed(speedLimit, "#FF0000")
							});

						marker4Speed.$linkID = linkID;

						if(variable)
							marker4Speed.$location = clink[c].VARIABLE_SPEED_SIGN_LOCATION;
						if(conditional)
							marker4Speed.$condition = getCondDescription(clink[c]);

						marker4Speed.addEventListener("pointerdown", function(e)
						{
							if(currentBubble)
								ui.removeBubble(currentBubble);
							
							copyTextToClipboard(e.target.$linkID);

							var html = '<div>';
							html +=	'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkID: ' + e.target.$linkID +'</p>';
							html += e.target.$location != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Location: ' + e.target.$location +'</p>') : "";
							html += e.target.$condition != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Conditional: ' + e.target.$condition +'</p>') : "";
							html += '</div>';

							var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

							currentBubble = new H.ui.InfoBubble(pos, { content: html });
							ui.addBubble(currentBubble);
						});
						group.addObject(marker4Speed);
					}
				}
			}

			if(!validCondition)
			{
				var startPoint = roadGeom[linkID],
					resp = speeds[linkID];

				// set the color per route type
				var unit = resp ? resp.SPEED_LIMIT_UNIT : "M",
				color = "#87CEFA",
				colorMarker = "#ADD8E6",
				speedLimit = ""
				routeLinkDir = linkID < 0 ? "-" : "+"; //is always positive from layer ROAD_GEOMETRY, why we check it?
				

				if (unit == "M")
				{
					if(resp && resp.FROM_REF_SPEED_LIMIT == null )
					{
						routeLinkDir = "-";
						if (resp.TO_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998 )
						{
							speedLimit = "No restriction";
						}
						else if (routeLinkDir == '-'&& resp.TO_REF_SPEED_LIMIT != null)
						{
							speedLimit = (Math.round(resp.TO_REF_SPEED_LIMIT / 1.61)) + " MPH";
						}
						else
						{
							speedLimit =  "0 MPH";
							console.log("linkID:: ", linkID);
						}
					}
					else if (resp && (resp.FROM_REF_SPEED_LIMIT == 999 || resp.FROM_REF_SPEED_LIMIT == 998))
					{
						speedLimit = "No restriction";
					}
					else if(!resp)
					{
						speedLimit = "No Information";
					}
					else
					{
						speedLimit = (Math.round(resp.FROM_REF_SPEED_LIMIT / 1.61)) + " MPH";
					}
				}
				else if( unit == "K")
				{
					routeLinkDir = "-";
					if(resp && resp.FROM_REF_SPEED_LIMIT == null )
					{
						if (resp.TO_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998)
						{
							speedLimit = "No restriction";
						}
						else if (routeLinkDir == '-'&& resp.TO_REF_SPEED_LIMIT != null)
						{
							speedLimit = resp.TO_REF_SPEED_LIMIT  + " KM/H";
						}
						else
						{
							speedLimit =  "0 KM/H";
						}
					}
					else if (resp && (resp.FROM_REF_SPEED_LIMIT == 999 || resp.TO_REF_SPEED_LIMIT == 998))
					{
						speedLimit = "No restriction";
					}
					else if(!resp)
					{
						speedLimit = "No information";
					}
					else
					{
						speedLimit = resp.FROM_REF_SPEED_LIMIT + " KM/H";
					}
				}

				if (variable) speedLimit = speedLimit + " + variable signs";

				var pointSpeed = new H.geo.Point(startPoint.lat,startPoint.lng);
				if(!rect.containsPoint(pointSpeed))
					continue;
				
				var	marker4Speed = new H.map.Marker(
						pointSpeed,
						{
							icon: createIconMarkerSpeed(speedLimit, colorMarker)
						});

				marker4Speed.$linkID = linkID;
				marker4Speed.addEventListener("pointerdown", function(e)
				{
					if(currentBubble)
						ui.removeBubble(currentBubble);

					copyTextToClipboard(e.target.$linkID);
					
					var html =  '<div>'+
						'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkID: ' + e.target.$linkID +'</p>'
					'</div>';

					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
					currentBubble = new H.ui.InfoBubble(pos, { content: html });
					ui.addBubble(currentBubble);
				});
				group.addObject(marker4Speed);
			}
		}
		Spinner.hideSpinner();
	}
	
	function gotRoadGeomFC(resp)
	{
		for(var i = 0; i < resp.Rows.length; i++)
		{
			roadGeom[resp.Rows[i].LINK_ID] = {lat: resp.Rows[i].LAT.split(",")[0] / 100000, lng: resp.Rows[i].LON.split(",")[0] / 100000};
		}
	}
	
	function gotSpeedLimits(resp)
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
		
		if(resp.Meta.mapRelease && !pdeReleaseShown)
		{
			releaseInfoTxt.innerHTML+= "</br>PDE: " + resp.Meta.mapRelease;
			pdeReleaseShown = true;
		}

		for (r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			speeds[linkId] = resp.Rows[r];
		}
	}

	function gotVariableSpeedLimits(resp)
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
			var linkId = parseInt(resp.Rows[r].LINK_ID);
	
			if(!variableSpeeds[linkId])
				variableSpeeds[linkId] = new Array();
			variableSpeeds[linkId].push(resp.Rows[r]);
		}
	}

	function gotCONDSpeedLimits(resp)
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
			var linkId = parseInt(resp.Rows[r].LINK_ID);

			if(!conditionalSpeeds[linkId])
				conditionalSpeeds[linkId] = new Array();
			conditionalSpeeds[linkId].push(resp.Rows[r]);
		}
	};
	
	var validateVehicleType = function(vehicleTypeMask)
	{
		var myMask = parseInt(document.getElementById("vehicletype").value);
		//! TODO remove "plus one" and "truck if" after fixed is ready in service
		if(truck)
			vehicleTypeMask = parseInt(vehicleTypeMask) + 1;
		return ((vehicleTypeMask & myMask) == myMask);
	}

	var validateTruckOptions = function(trailer, min_weight, max_weight, length, expl_dang_material)
	{
		var ret = false,
		tr = parseInt(document.getElementById("trailer").value),
		truckWeight=parseFloat(document.getElementById("truck_weight").value),
		l = parseInt(document.getElementById("length").value),
		exp = document.getElementById("expl_dang_material").checked;

		if(trailer && tr > 0 )
		{
			if(trailer == 'Y' || trailer >= tr)
				return true;
		}
		if(truckWeight){
			if( min_weight && max_weight == null && truckWeight > parseFloat(min_weight))
				return true;
			if( min_weight == null && max_weight && truckWeight <= parseFloat(max_weight))
				return true;
			if(min_weight && max_weight && truckWeight > parseFloat(min_weight) && truckWeight <= parseFloat(max_weight))
				return true;

		}

		if(length && parseInt(length) <= l)
			return true;

		if(expl_dang_material && exp)
			return true;

		return ret;
	}
	
	function getLowerSpeedLimit(limit1, limit2) {
		if (limit1 == undefined) return limit2;
		if (limit2 == undefined) return limit1;
		return Math.min(limit1, limit2);
	}

	//Helper create svg for speeds
	var createIconMarkerSpeed = function (speedInfo, colorMarker) {
		var svgMarker4Speed = '<svg width="__widthAll__" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="34" fill="__color__"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
			'</g>'+
			'</svg>';

		svgMarker4Speed = svgMarker4Speed.replace(/__line1__/g, speedInfo);
		svgMarker4Speed = svgMarker4Speed.replace(/__width__/g, speedInfo.length  *4 + 32);
		svgMarker4Speed = svgMarker4Speed.replace(/__widthAll__/g, speedInfo.length  *4 + 70);
		svgMarker4Speed = svgMarker4Speed.replace(/__color__/g, colorMarker);

		return new H.map.Icon(svgMarker4Speed);

	};

	// for conditional speed description
	function getCondDescription(clink){
		// Data retrieved from RDF_META table
		var speedType=clink.SPEED_LIMIT_TYPE;
		var dependendType=clink.DEPENDEND_SPEED_TYPE;
		var description="";
		switch(speedType){
			case "1" : description="Advisory"; break;
			case "2":
				switch (dependendType){
					case "1" : description="School"; break;
					case "2" : description="Rain"; break;
					case "3" : description="Snow"; break;
					case "4" : description="Time-Dependednt"; break;
					case "5" : description="Approximate Seasonal Time"; break;
					case "6" : description="Lane Dependent"; break;
					case "7" : description="Fog"; break;
				}
				break;
			case "3": description="Speed bumps present"; break;
		}
		return description;
	}
	
	function copyTextToClipboard(text) {
		var textArea = document.createElement("textarea");

		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;

		textArea.style.width = '2em';
		textArea.style.height = '2em';

		textArea.style.padding = 0;

		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';

		textArea.style.background = 'transparent';

		textArea.value = text;

		document.body.appendChild(textArea);

		textArea.select();

		try {
		var successful = document.execCommand('copy');
		} catch (err) {
		}
		document.body.removeChild(textArea);
	}
	
	function selection(rectangle)
	{
		rect = rectangle;
		loadSpeedLimits(rect);
	}