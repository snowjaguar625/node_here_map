/*
	(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var objContainer = new H.map.Group();
	var mapContainer = document.getElementById("mapContainer");

	var waypointsWithTransitRadius = new Array();
	var waypointsOrigin = new Array();
	var positionsLeft;
	var waypointsWithSpeed = new Array();
	var path;
	var currentBubble;
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),

	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : 250);
	geocoder = platform.getGeocodingService(),
	objContainer,
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: center,
			zoom: zoom,
			pixelRatio: hidpi ? 2 : 1
		}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);


	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var startProcessingGPSTrace = function(coordWithSpeedArr)
	{
		if(coordWithSpeedArr == null || coordWithSpeedArr.length == 0)
		{
			alert("The GPX trace does not contain valid values for a route calculation!");
			closeSpinner();
			return;
		}
		else
		{
			polylineArr = new Array();
			if(coordWithSpeedArr[0].coord != coordWithSpeedArr[coordWithSpeedArr.length -1].coord)
			{
				//for the transit radius - 0 means it will be searched until the next link nevertheless how far (useful for area within less roads)
				radius = 200;

				// always add the start
				waypointsWithTransitRadius.push({position: coordWithSpeedArr[0].coord, speed: Math.round(coordWithSpeedArr[0].speed*10)/10} );
				polylineArr.push(coordWithSpeedArr[0].coord);
				lastCoordinate = null;
				for(var i = 0; i < coordWithSpeedArr.length; i++)
				{
					//start of the GPS trace
					if(i == 0)
					{
						lastCoord = coordWithSpeedArr[i].coord;
						lastSpeed = Math.round(coordWithSpeedArr[i].speed*1.6);
						lastSpeed4Marker = "Start";
						continue;
					}
					//end of the GPS trace
				else if(i == coordWithSpeedArr.length -1 )
				{
					lastCoord = coordWithSpeedArr[i].coord;
					lastSpeed = Math.round(coordWithSpeedArr[i].speed*1.6);
					lastSpeed4Marker = "Destination";
					continue;
				}

				//for all other points of the GPS trace
				count=""+(i+1);

				lastCoord = coordWithSpeedArr[i].coord;
				lastSpeed = coordWithSpeedArr[i].speed;
				lastSpeed4Marker = Math.round(lastSpeed*1.6) + "km/h";
				waypointsWithTransitRadius.push({position: coordWithSpeedArr[i].coord, transitRadius: radius, speed: Math.round(coordWithSpeedArr[i].speed*1.6)} );
				polylineArr.push(coordWithSpeedArr[i].coord);
				}

				// allways add the end
				waypointsWithTransitRadius.push({position: coordWithSpeedArr[coordWithSpeedArr.length - 1].coord, transitRadius: radius, speed: coordWithSpeedArr[coordWithSpeedArr.length - 1].speed} );
				polylineArr.push(coordWithSpeedArr[coordWithSpeedArr.length - 1].coord);

				//create a list of overall waypoints for the comparison with the speedLimits later on - waypointsWithTransitRadius will be reduced for each new route request and cannot be used therefore anymore
				waypointsOrigin = waypointsWithTransitRadius.slice(0);
				splitWaypointList();
			}
			else
			{
				alert("Your routing produced no results!");
				closeSpinner();
				return;
			}
		}
	};

	function splitWaypointList()
	{
		positionsLeft=true;
		splittedWaypointList = null;
		splittedWaypointList = new Array();
		coordList = new Array();
		if (waypointsWithTransitRadius.length >= 100){
			for ( j=0; j <= 100; j++)
			{
				coordList.push({position: waypointsWithTransitRadius[0].position, transitRadius: radius, speed: waypointsWithTransitRadius[0].speed} );
				waypointsWithTransitRadius.shift();
			}
		}
		else if (waypointsWithTransitRadius.length < 100 ){
			while(waypointsWithTransitRadius.length > 0)
			{
				coordList.push({position: waypointsWithTransitRadius[0].position, transitRadius: radius, speed: waypointsWithTransitRadius[0].speed} );
				waypointsWithTransitRadius.shift();
				positionsLeft=false;
			}
		}
		requestRoute(coordList);
	}

	var requestRoute = function(coordList)
	{
		//set up of list of waypoints as one string
		wayppointsString="";
		lastWaypointLat=0;
		lastWaypointLon=0;
		//for the waypoint number in the request we need an unbroken line of number
		waypointNumber=0;


		for (i=0; i < coordList.length; i++)
		{
			if (i==0){
				wayppointsString= wayppointsString.concat("&waypoint"+i+"="+coordList[i].position.lat+","+coordList[i].position.lng);
				lastWaypointLat= coordList[i].position.lat;
				lastWaypointLon= coordList[i].position.lng;
				waypointNumber++;
			}
			else if(i== coordList.length -1)
			{
				wayppointsString= wayppointsString.concat("&waypoint"+i+"="+coordList[i].position.lat+","+coordList[i].position.lng);
				lastWaypointLat= coordList[i].position.lat;
				lastWaypointLon= coordList[i].position.lng;
				waypointNumber++;
			}
			else
			{
				if (coordList[i].position.lat == lastWaypointLat && coordList[i].position.lng == lastWaypointLon)
				{
					continue;
				}
				else
				{
					wayppointsString= wayppointsString.concat("&waypoint"+waypointNumber+"="+coordList[i].position.lat+","+coordList[i].position.lng+";" + radius);
					lastWaypointLat= coordList[i].position.lat;
					lastWaypointLon= coordList[i].position.lng;
					waypointNumber++;
				}
			}
		}
		url = "https://route.api.here.com/routing/7.2/calculateroute.json?" + wayppointsString + "&jsonAttributes=1&departure=now&requestid=Route6&language=en-US&representation=overview&routeattributes=sm,sh,bb,lg,no&legattributes=li&linkattributes=none,sh,sl&instructionformat=html&mode=fastest;car;traffic:disabled&app_id=" + app_id + "&app_code=" + app_code + "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.onerror = function(data)
		{
			type = data ? data.type : script.readyState;
			if (type === "error")
			{
				alert("The routing request failed. Please make sure that it is set up correctly and that the Routing service is available.");
				closeSpinner();
				return;
			}
		}

		script.src = url;
		document.body.appendChild(script);
	};

	var gotRoutingResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined || respJsonObj.type)
		{
			alert("Error Type: " + respJsonObj.type + " Details: " + respJsonObj.details);
			closeSpinner();
			return;
		}

		routes = respJsonObj.response.route;

		shape = routes[0].shape;
		shapePoints = new Array();
		for(i = 0; i < shape.length; i++)
		{
			coord=shape[i].split(',');
			lat= parseFloat(coord[0]);
			lon= parseFloat(coord[1]);

			path.push(new H.geo.Point(lat,lon,0));
		}

		//read out all speed limits out of the route response
		route0leg0links = respJsonObj.response.route[0].leg[0].link;
		speedLimits = [];
		for (m = 0; m < route0leg0links.length; m++)
		{
			LinkShapeCoordArray = new Array();
			for(n=0; n < route0leg0links[m].shape.length; n++)
			{
				linkShapePointArray= route0leg0links[m].shape[n].split(",");
				linkShapeCoordLat=parseFloat(linkShapePointArray[0]);
				linkShapeCoordLon=parseFloat(linkShapePointArray[1]);
				LinkShapeCoordArray.push(linkShapeCoordLat,linkShapeCoordLon);
			}

			//for the speed limit
			if (route0leg0links[m].speedLimit )
			{
				x = Math.round(((route0leg0links[m].speedLimit * 1.6)*10 )/10);
				colour:  "#FF000088" ;
			}
			//otherwise speedCategory
		else
		{
			currentSpeedCategory = route0leg0links[m].speedCategory;

			switch (currentSpeedCategory)
			{
				case "SC1":
					x=">130";
					break;
				case "SC2":
					x="101-130";
					break;
				case "SC3":
					x="91-100";
					break;
				case "SC4":
					x="71-90";
					break;
				case "SC5":
					x="51-70";
					break;
				case "SC6":
					x="31-50";
					break;
				case "SC7":
					x="11-30";
					break;
				case "SC8":
					x="0-11";
					break;
			}
		}

		waypointsWithSpeed.push({lat:LinkShapeCoordArray[0], lon: LinkShapeCoordArray[1], speed: x} );
		}
		if (positionsLeft==true)
			splitWaypointList();
		else
			findNearestSpeedLimit();
	};

	var findNearestSpeedLimit = function()
	{
		//for each GPS trace waypoint...
		for(i=0; i<waypointsOrigin.length; i++)
		{
			dLat = waypointsOrigin[i].position.lat;
			dLon = waypointsOrigin[i].position.lng;

			dGridSizeXReduction = Math.abs(Math.cos(dLat * Math.PI / 180.0 ));
			dRed2 = dGridSizeXReduction * dGridSizeXReduction;
			dMinDist2 = Number.MAX_VALUE;

			startLat = 0;
			startLon = 0;
			startSpeed = 0;
			bubble=0;
			html=0;

			//.. calculate the distance to each link with speed limit
			for(sh=0; sh < waypointsWithSpeed.length-1; sh++)
			{
				// project current point p onto shape segment s1->s2: t = ((s2-s1) scalarmult (p-s1)) / |s1,s2|^2
				dLat1 = waypointsWithSpeed[sh].lat;
				dLon1 = waypointsWithSpeed[sh].lon;
				dLat2 = waypointsWithSpeed[sh+1].lat;
				dLon2 = waypointsWithSpeed[sh+1].lon;
				s1_s2x = dLon2 - dLon1;
				s1_s2y = dLat2 - dLat1;
				s1_px = dLon - dLon1;
				s1_py = dLat - dLat1;
				t = (s1_s2x * s1_px * dRed2 + s1_s2y * s1_py) / (s1_s2x * s1_s2x * dRed2 + s1_s2y * s1_s2y);
				ppx=0;
				ppy=0; // p projected onto shape segment (if point alongside) or moved to closer end

				if (t < 0) // p is behind s1
				{
					ppx = dLon1;
					ppy = dLat1;
				}
				else if (t>=0.0 && t<=1.0) // p is at the side of the shape segment, can be projected onto it
				{
					ppx = dLon1 + t * s1_s2x;
					ppy = dLat1 + t * s1_s2y;
				}
				else // p is behind s2
				{
					ppx = dLon2;
					ppy = dLat2;
				}
				dist2 = (dLon - ppx) * (dLon - ppx) * dRed2 + (dLat - ppy) * (dLat - ppy);
				if (dist2 < dMinDist2)
				{
					dMinDist2 = dist2;
					var startLat = dLat1;
					var startLon = dLon1;
					startSpeed = waypointsWithSpeed[sh].speed+ ' km/h';
					roughMeter = Math.sqrt(dMinDist2);
				}
			}

			vehicleSpeed = parseFloat(waypointsOrigin[i].speed);
			currentStartSpeed = parseFloat(startSpeed);

			if(vehicleSpeed == 0 )
			{
				vs= "0.0 km/h";
				colour = "#3399FF";
			}

			if(currentStartSpeed !="NaN" && vehicleSpeed != 0)
				{		//vehicle slower that speed limit
					if(vehicleSpeed < currentStartSpeed)
					{
						vs= Math.round(vehicleSpeed)+" km/h";
						colour = "#99FF99";
					}
					//vehicle faster that speed limit
					if(vehicleSpeed > currentStartSpeed)
					{
						vs=Math.round(vehicleSpeed)+" km/h";
						colour = "#FF6666";
					}
				}
				//only speed category available
				if(currentStartSpeed =="NaN"  && vehicleSpeed != 0)
				{
					sp=currentStartSpeed.split('-');
					min= parseFloat(sp[0]);
					max= parseFloat(sp[1]);

					//vehicle slower that speed limit
					if(vehicleSpeed < max)
					{
						vs= Math.round(vehicleSpeed)+" km/h"
						colour = "#99FF99";
					}
					//vehicle faster that speed limit
					if(vehicleSpeed > max)
					{
						vs= Math.round(vehicleSpeed)+" km/h";
						colour = "#FF6666";
					}
				};

				point = new H.geo.Point(dLat,dLon);
				marker = new H.map.Marker(point,
					{
						icon: createIcon(colour)

					});
					marker.vehicleSpeedText = vs;
					marker.startSpeed = startSpeed;

					marker.addEventListener("pointerdown", function(e)
					{
						if(currentBubble)
							ui.removeBubble(currentBubble);
						var html =  '<div>'+
							'<p style="font-family:Arial,sans-serif; font-size:12px;">Vehicle Speed: ' + e.target.vehicleSpeedText +'</p>'+
							'<p style="font-family:Arial,sans-serif; font-size:10px;">Speed Limit: ' + e.target.startSpeed + ' km/h </p>'+
							'</div>';

						// do adjust the tail to the Icons Position
						pos = map.geoToScreen(e.target.getGeometry());
						pos.x += 18;
						pos.y -= 18;
						geoPos = map.screenToGeo(pos.x, pos.y);

						currentBubble = new H.ui.InfoBubble(geoPos, { content: html });
						ui.addBubble(currentBubble);

					});
					objContainer.addObject(marker);

		}

		var strip = new H.geo.LineString(),

		i,
		l = path.length;

		for(i = 0; i < l; i++)
		{
			strip.pushPoint(path[i]);
		}

		var polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "#003366",
					lineJoin: "round"
				}
			});
			objContainer.addObject(polyline);

			map.addObject(objContainer);
			
			map.getViewModel().setLookAtData({
				//tilt: 45,
				bounds: objContainer.getBoundingBox()
			});

			closeSpinner();
	}

	function closeSpinner()
	{
		document.getElementById('popup').style.display = 'none';
		document.getElementById("pageblock").style.display = "none";
	}

	function showDialog(text)
	{
		var el = document.getElementById('popup');
		el.style.display = "block";
		document.getElementById("pageblock").style.display = "block";
		document.getElementById("pageblock").style.zIndex = "1";
		el.style.zIndex = "5";
		document.getElementById('popuptext').innerHTML = text;
		// setToCenterOfParent(el, map.width, map.height);
		height = document.getElementById('mapContainer').getBoundingClientRect().height;
		width = document.getElementById('mapContainer').getBoundingClientRect().width;
		setToCenterOfParent(el, width, height);
	}

	function setToCenterOfParent(el, parentWidth, parentHeight)
	{
		elementWidth = el.offsetWidth;
		elementHeight = el.offsetHeight;
		x = parentWidth/2 - elementWidth/2;
		y = parentHeight/2 - elementHeight/2;
		el.style.left = x + "px";
		el.style.top = y + "px";
	}

	function showSpinner()
	{
		text = "<img src='/assets/loading.gif' alt='' style='background-color: rgb(18, 65, 145);'>";
		showDialog(text);
	}

	function startGPXImport(file)
	{
		showSpinner();
		var reader = new FileReader();
		objContainer.removeAll();
		path = new Array();

		reader.onload = function(e)
		{
			xmlDoc = parseXml(reader.result);
			parser = new GPXParser(xmlDoc, map, false);
			parser.SetTrackColor("#ff0000");                                // Set the track line colour
			parser.SetMarkerColor("#00ff00");
			parser.SetTrackWidth(5);                                        // Set the track line width
			parser.SetMinTrackPointDelta(0.000001);                         // Set the minimum distance between track points
			parser.AddTrackpointsToMap();                                   // Add the trackpoints
			parser.AddWaypointsToMap();                                     // Add the waypoints
			startProcessingGPSTrace(parser.GetPointsWithSpeed());
		}
		reader.readAsText(file);
	}

	//----------Helper ------------------
	var createIcon = function (color) {
		var div = document.createElement("div");

		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
			'<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
			' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
			'<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
			' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
			'<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
			' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="__color__"/>' +
			'</svg>';

		svg = svg.replace(/__color__/g, color);
		div.innerHTML = svg;

		return new H.map.Icon(svg, {
			anchor: new H.math.Point(14, 32)
		});

	};