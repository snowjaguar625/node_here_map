// author wobecker 
	// (C) HERE 2014
	// author dom schuette
	// (C) HERE 2019 -> changed to new Fleet Telematics endpoint and POST upload
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	var mapContainer = document.getElementById('mapContainer');
	var platform = new H.service.Platform({	app_code: app_code,	app_id: app_id,	useHTTPS: secure });
	var	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
	var	map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
	var ui = H.ui.UI.createDefault(map, maptypes); // add UI

	//add JS API Release information
	releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;
	//add MRS Release information
	loadMRSVersionTxt();

	platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	mapReleaseTxt = document.getElementById("mapReleaseTxt");
	var	objContainer = new H.map.Group(),
		unmatchedContainer = new H.map.Group(),
		matchedContainer = new H.map.Group(),
		speedContainer = new H.map.Group(),
		speeds = new Object(),
		icons = {},
		linkDataInfoBubble, 
		renderAll = false;
		
	var handleRender = function()
	{
		renderAll = !renderAll;
		document.getElementById("colors").style = renderAll ? 'block' : 'none';
		if(renderAll)
		{
			map.addObject(unmatchedContainer);
			map.addObject(matchedContainer);
			map.addObject(speedContainer);
		}
		else
		{
			map.removeObject(unmatchedContainer);
			map.removeObject(matchedContainer);
			map.removeObject(speedContainer);
		}
	}

	var readInputTraceFile = function (file) {
		objContainer.removeAll();
		unmatchedContainer.removeAll();
		matchedContainer.removeAll();
		speedContainer.removeAll();
		speeds = new Object();
		document.getElementById("warningstextarea").value = "";
		
		var reader = new FileReader();
		reader.fileName = file.name;
		reader.readAsBinaryString(file);

		reader.onload = function(e) {
			var content;
			if(reader.fileName.indexOf(".xml", reader.fileName.length - 4) !== -1) {
				var xmlDoc = parseXml(reader.result),
					parser = new GPXParser(xmlDoc, map, false);
					
				parser.SetMinTrackPointDelta(0.000001);                         // Set the minimum distance between track points
				parser.AddTrackpointsToMap();                                   // Add the trackpoints
				parser.AddWaypointsToMap();                                     // Add the waypoints
				content = parser.GetPointsWithSpeed();
				if(content instanceof Array)
				{
					var tmp = "Latitude,Longitude,SPEED_MPH\n";
					for(var i = 0; i < content.length; i++)
					{
						var curObj = content[i];
						tmp += curObj.coord.lat + "," + curObj.coord.lng + "," + curObj.speed + "\n";
					}
					content = btoa(tmp);
				}
			}
			else if(reader.fileName.indexOf(".zip", reader.fileName.length - 4) !== -1) {
				content = btoa(reader.result);
			} else {
				content = reader.result;
			}
			
			var match = content.match(/\r?\n/g);
			createIcons(match.length);
			
			var url = "https://fleet.api.here.com/2/calculateroute.json?routeMatch=1&mode=fastest;car;traffic:disabled&attributes=SPEED_LIMITS_FCn(FROM_REF_SPEED_LIMIT,TO_REF_SPEED_LIMIT),LINK_ATTRIBUTE_FCn(ISO_COUNTRY_CODE)&app_id=" + app_id_cors + "&app_code=" + app_code_cors;
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
		};
	};
	
	function gotRouteMatchResponse (respJsonObj) {
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}

		var linksWithDirection = {},
			speeds = {};
		
		// draw the original and the matched trace points
		var tracePoints = respJsonObj.response.route[0].waypoint;
		for (var l = 0; l < tracePoints.length; l++)
		{
			var p = tracePoints[l];
			
			// we need the direction on the link, to know which speed limit is valid
			var linkId = parseInt(p.linkId);
			if(linkId == 565942253)
				console.log("YES");
			linksWithDirection[linkId] = "+";
			if(linkId < 0)
				linksWithDirection[linkId] = "-";
		
			unmatchedContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: icons["#000000" + l]}));
			matchedContainer.addObject(new H.map.Marker(new H.geo.Point(p.mappedPosition.latitude, p.mappedPosition.longitude), {icon: icons["#0000FF" + l]}));
		}
		
		// draw the route
		var routeLinks = respJsonObj.response.route[0].leg[0].link,
			lastSpeed = 0;
		for (var l = 0; l < routeLinks.length; l++) {
			var coords1 = routeLinks[l].shape;
			var coords2 = new H.geo.Strip();
			for (var c = 0; c < coords1.length; c += 2)
				coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
			var polyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}});
			objContainer.addObject(polyline);
			if(routeLinks[l].attributes !== undefined && routeLinks[l].attributes.SPEED_LIMITS_FCN !== undefined && routeLinks[l].attributes.SPEED_LIMITS_FCN[0] !== undefined)
			{
				var speed = parseInt(routeLinks[l].linkId) > 0 ? routeLinks[l].attributes.SPEED_LIMITS_FCN[0].FROM_REF_SPEED_LIMIT : routeLinks[l].attributes.SPEED_LIMITS_FCN[0].TO_REF_SPEED_LIMIT;
				
				var speedUnit = "km/h";
				var iso = routeLinks[l].attributes.LINK_ATTRIBUTE_FCN[0]['ISO_COUNTRY_CODE'];
				if(iso == "USA" || iso == "GBR" || iso == "PRI")
				{
					speedUnit = "mp/h";
					speed = (speed * 0.6213711922).toFixed(0);
				}
			
				speeds[routeLinks[l].linkId] = { speed: speed, speedUnit: speedUnit };
				polyline.$speed = speed == 999 ? "unlimited" : speed;
				polyline.$unit = speedUnit;
				
				var strip = polyline.getGeometry();
				var lowIndex = Math.floor((strip.getPointCount() - 1) / 2);
				var highIndex = Math.ceil(strip.getPointCount() / 2);
				var center;
				if (lowIndex === highIndex) {
					center = strip.extractPoint(lowIndex);
				} else {
				var lowPoint = strip.extractPoint(lowIndex);
				var highPoint = strip.extractPoint(highIndex);
					center = new H.geo.Point((lowPoint.lat + highPoint.lat ) / 2, (lowPoint.lng + highPoint.lng) / 2);
				}
				polyline.$center = center;
				
				polyline.addEventListener("pointerenter", function(e)
					{
						if(linkDataInfoBubble)
						{
							linkDataInfoBubble.close();
						}
						
						if (!linkDataInfoBubble)
						{
							linkDataInfoBubble = new H.ui.InfoBubble(e.target.$center,{content: "<div>Speed Limit: " + e.target.$speed + " " + e.target.$unit + "</div>"});
							ui.addBubble(linkDataInfoBubble);	
						}
						else
						{
							linkDataInfoBubble.setPosition(e.target.$center);
							linkDataInfoBubble.setContent("<div>Speed Limit: " + e.target.$speed + " " + e.target.$unit + "</div>");
						}
						linkDataInfoBubble.open();
				});
					
				polyline.addEventListener("pointerleave", function(e)
				{
					if(linkDataInfoBubble)
						linkDataInfoBubble.close();
				});				
			
				var marker = new H.map.Marker(coords2.extractPoint(0), {icon: icons["speed" + speed]});
					marker.$speed = speed;
					marker.$unit = speedUnit;
					marker.addEventListener("pointerenter", function(e)
						{
							if(linkDataInfoBubble)
							{
								linkDataInfoBubble.close();
							}
							
							if (!linkDataInfoBubble)
							{
								linkDataInfoBubble = new H.ui.InfoBubble(e.target.getPosition(),{content: "<div>Speed Limit: " + e.target.$speed + " " + e.target.$unit + "</div>"});
								ui.addBubble(linkDataInfoBubble);	
							}
							else
							{
								linkDataInfoBubble.setPosition(e.target.getPosition());
								linkDataInfoBubble.setContent("<div>Speed Limit: " + e.target.$speed + " " + e.target.$unit + "</div>");
							}
							linkDataInfoBubble.open();
					});
						
					marker.addEventListener("pointerleave", function(e)
					{
						if(linkDataInfoBubble)
							linkDataInfoBubble.close();
					});
				if(lastSpeed != speed)						
					objContainer.addObject(marker);
				else
					matchedContainer.addObject(marker);
				lastSpeed = speed;
			}
		}

		// check if we are overspeeding
		for (var l = 0; l < tracePoints.length; l++) {
			var p = tracePoints[l], 
				linkId = parseInt(p.linkId);
				
			var sl = speeds[linkId]; // negative sign already replaced
			if (sl == null) 
				continue; // no speed limit for this link, probably functional class 5
			var speed = (p.speedMps * 3.6); 
			
			if(sl.speedUnit == "mp/h")
				speed = (speed * 0.6213711922).toFixed(0);
			
			var speedingColor = (speed > sl.speed) ? "#FF0000" : "#00FF00";
			speedContainer.addObject(new H.map.Marker(new H.geo.Point(p.mappedPosition.latitude, p.mappedPosition.longitude), {icon: createSpeedIcon(speedingColor, speed + "/" + sl.speed, 24)}));
		}
		

		var warningsArea = document.getElementById("warningstextarea");
		if(respJsonObj.response.warnings == undefined || respJsonObj.response.warnings.length === 0) {
			warningsArea.value += 'No Warnings.';
		} else {
			warningsArea.value = '';
			for(var d = 0; d < respJsonObj.response.warnings.length; d++) {
				if(0 !== d) warningsArea.value += '\n';
				warningsArea.value += respJsonObj.response.warnings[d].message;
			}
		}

		map.addObject(objContainer);
		map.setViewBounds(objContainer.getBounds());
	};

	var createIcons = function(count)
	{
		for(var i = 0; i < count; i++)
		{
			if(icons["#000000" + i] === undefined)
				icons["#000000" + i] = createIcon("#000000", i);
			if(icons["0000FF" + i] === undefined)
				icons["#0000FF" + i] = createIcon("#0000FF", i);
		}
		var speeds = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 000]
		for(var i = 0; i < speeds.length; i++)
		{
			var speed = speeds[i];
			if(icons["speed" + speed] === undefined)
				icons["speed"+speed] = createSpeedSign(speed);
		}
		var unlimited = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" stroke="black" stroke-width="5" fill="white"/><line fill="none" stroke-width="0.5" stroke-opacity="null" fill-opacity="null" x1="22.28125" y1="7.96484" x2="7.53125" y2="20.90234" id="svg_2" stroke-linejoin="null" stroke-linecap="null" stroke="#000"/><line fill="none" stroke-width="0.5" stroke-opacity="null" fill-opacity="null" x1="22.71856" y1="8.71451" x2="7.96856" y2="21.65201" id="svg_4" stroke-linejoin="null" stroke-linecap="null" stroke="#000"/><line fill="none" stroke-width="0.5" stroke-opacity="null" fill-opacity="null" x1="23.28081" y1="9.4017" x2="8.53081" y2="22.3392" id="svg_3" stroke-linejoin="null" stroke-linecap="null" stroke="#000"/><line fill="none" stroke-width="0.5" stroke-opacity="null" fill-opacity="null" x1="23.84306" y1="10.02642" x2="9.09306" y2="22.96392" id="svg_5" stroke-linejoin="null" stroke-linecap="null" stroke="#000"/><line fill="none" stroke-width="0.5" stroke-opacity="null" fill-opacity="null" x1="24.4053" y1="10.58867" x2="9.6553" y2="23.52617" id="svg_6" stroke-linejoin="null" stroke-linecap="null" stroke="#000"/></svg>';
		icons["speed" + 999 ] = new H.map.Icon(unlimited, ({'anchor': {'x': 32 / 2,'y': 32 / 2}	}));
	}
	
	// generate speed icons
	var signTemplate = '<svg xmlns="http://www.w3.org/2000/svg" height="32" width="32"><circle cx="16" cy="16" r="12" stroke="red" stroke-width="5" fill="white" /><text x="16" y="16" fill="black" text-anchor="middle" alignment-baseline="central" font-weight="bold">__NO__</text></svg>';
	
	var createSpeedSign = function(speed)
	{
		return new H.map.Icon(signTemplate.replace(/__NO__/g, speed), ({'anchor': {'x': 32 / 2,'y': 32 / 2}	}))
	}
	
	var createIcon = function (color, text)
	{
		var canvas = document.createElement('canvas'),
			width = 28,
			height = 16,
			fontSize = 10;
			
		canvas.width = width;
		canvas.height = height;

		ctx = canvas.getContext('2d');
			
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(14, 16);
		ctx.lineTo(14, 9);
		ctx.stroke();
		ctx.closePath();

		ctx.font = 'bold ' + fontSize + 'px Arial';
		ctx.fillStyle = color;
		ctx.textAlign = 'center'; 
		ctx.fillText(text,14,8);

		var icon = new mapsjs.map.Icon(canvas,
					({
						'anchor': {
							'x': 14,
							'y': 16
						}
					}));
		delete canvas; 
		return icon;
	};
	
	var createSpeedIcon = function (color, text, height) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="56px" height="' + height + 'px">' +
			'<line x1="28"  y1="' + height + '" x2="28" y2="' + (height - 7) + '" stroke="' + color + '"/>' +
			'<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
			text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
	};