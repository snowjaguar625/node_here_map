/*
	author Mykyta
	(C) HERE 2016
    author asadovoy
    (C) HERE 2019 -> migrate to 3.1
	*/

	document.getElementById('chartContainer').style.display = 'none';   
	var str_Point;
	var intermediate_Point;
	var heightsArray = new Object();
	var heightsLatLonArray = new Object();
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),
		// position of route start
		pointA,
		// position of route destination
		pointB,

		platform = new H.service.Platform({
			apikey: api_key,
			useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService(),
		router = platform.getRoutingService(),
		group = new H.map.Group(),
		layers = null,
		map = new H.Map(mapContainer, maptypes.vector.normal.map,
			{
				center: new H.geo.Point(52.11, 0.68),
				zoom: 5,
				pixelRatio: window.devicePixelRatio || 1
			}
		);
	
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	
	//add JS API Release information
	releaseInfoTxt.innerHTML+="<br />JS API: 3."+ H.buildInfo().version;
	
	//add MRS Release information
	loadMRSVersionTxt();

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	var dataPoints = [];


	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	var pointedvalue;
	var  clicked=0;

	var	routeButton = document.getElementById("routeButton"),
		start = document.getElementById("start"),
		dest = document.getElementById("dest"),
		mapReleaseTxt = document.getElementById("mapReleaseTxt"),
		pointA,
		pointB,
		routeBBox,
		numLinksMatched = 0,
		pdeManager = new PDEManager(app_id, app_code, layers),
		group = new H.map.Group(),
		startMarker,
		destMarker,
		bLongClickUseForStartPoint = true,
		marker4height; // for long click in map we toggle start/destination;
		
	var chart = new CanvasJS.Chart("chartContainer",
	{
			backgroundColor: "#f8f8f8",
			colorSet: "hereColors",
			title: {
				text: "Height Statistics along the route" 
			},
			toolTip:{
				enabled: false,
			},
			axisX: {
				title: "Distance from start point (KM)",
			},
			axisY:{
				includeZero: false,
				title: "Height value (Mts)",
			},
			
			data: [
			{
				mouseover: function(e)
				{
					clicked =1;
					pointedvalue = e.dataPoint.x;
		
					if(marker4height == null)
					{
						marker4height = new H.map.Marker(
						heightsLatLonArray[pointedvalue],
						{
							icon: createIconMarkerSpeed(Math.round(e.dataPoint.y) + " m", "#00FF00 ")
						});
						group.addObject(marker4height);
						map.setCenter(heightsLatLonArray[pointedvalue]);
					}
					else
					{
						marker4height.setGeometry(heightsLatLonArray[pointedvalue]);
						marker4height.setIcon(createIconMarkerSpeed(Math.round(e.dataPoint.y) + " m", "#00FF00 "));
					}
				},
				
				click: function(e)
				{
					marker4height.setGeometry(heightsLatLonArray[pointedvalue]);
					marker4height.setIcon(createIconMarkerSpeed(Math.round(e.dataPoint.y) + " m", "#00FF00 "));
				}
			}],
		dataPoints: []
	});

	var releaseRoutingShown=false;
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			map.addObject(group);
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "0";
			start.value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				markerGroup.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA,
				{
					icon: createIconMarker(line1, line2)
				});
			group.addObject(startMarker);
			bLongClickUseForStartPoint = false;
		}
		
		else
		{
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = "1";
			dest.value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
				markerGroup.removeObject(destMarker);
			}
			destMarker = new H.map.Marker(pointB,
				{
					icon: createIconMarker(line1, line2)
				});
			group.addObject(destMarker);
			bLongClickUseForStartPoint = true;
			go();
		}
	}	

	routeButton.onclick = function ()
	{
		go();
	};

	var go = function()
	{
		layers = new Object();
		layers["BASIC_HEIGHT_FC"] = {callback: gotPdeResponse};

		pdeManager.setLayers(layers);

		group.removeAll();

		group = new H.map.Group();
		//feedbackTxt.innerHTML = "Routing from: " + start.value + " to " + dest.value + " ...";
		geocode(start.value, true);
	}

	var geocode = function(searchTerm, start)
	{
		geocoder.search(
			{
				searchText: searchTerm
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
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
				line2 = address.Label ? address.Label : " ";

				marker = new H.map.Marker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					if(start)
						geocode(dest.value, false);
					else
					{
						//add Geocoder Release information
						loadGeocoderVersionTxt();
						calculateRouteDirect(pointA, pointB);
						
					}	
			},
			function(error) {
				alert(error);
			}
		);
	}

	var calculateRouteDirect = function(start, destination)
	{
		var urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+
			start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +
			"&departure=" +"&routeattributes=sh,lg&legattributes=li&linkattributes=nl,fc&mode=fastest;" +
			"car;traffic:disabled&app_id=" + app_id + "&app_code=" + app_code+ "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.src = urlRoutingReq;
		str_Point = new H.geo.Point(start.lat, start.lng);
		document.body.appendChild(script);
	}

	// parse the routing response
	var gotRoutingResponse = function (respJsonRouteObj)
	{
		if (respJsonRouteObj.error != undefined)
		{
			alert (respJsonRouteObj.error);
			feedbackTxt.innerHTML = respJsonRouteObj.error;
			return;
		}
		//add Routing Release number if not already done
		if (releaseRoutingShown == false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+respJsonRouteObj.response.metaInfo.moduleVersion;
			routerMapRelease = respJsonRouteObj.response.metaInfo.mapVersion;
			mapReleaseTxt.innerHTML = "HLP Routing Service based on "+routerMapRelease+ " map release";
			releaseRoutingShown = true;
		}


		var strip = new H.geo.LineString(),
		shape = respJsonRouteObj.response.route[0].shape,
		i,
		l = shape.length;

		for(i = 0; i < l; i++)
		{
			strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
		}

		var polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "#B22222",
					lineJoin: "round"
				}
			});

			group.addObject(polyline);

			pdeManager.setBoundingBoxContainer(group);
			pdeManager.setLinks(respJsonRouteObj.response.route[0].leg[0].link);
			pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
			pdeManager.start();
	}

function gotPdeResponse(respJsonObj){
	
	if (respJsonObj.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (respJsonObj.responseCode != undefined)
		{
			alert (respJsonObj.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}

		for (var r = 0; r < respJsonObj.Rows.length; r++)
		{
			var linkId = parseInt(respJsonObj.Rows[r].LINK_ID);
			routeLink = pdeManager.getRouteLinks()[linkId];

			if(!heightsArray[linkId])
				heightsArray[linkId] = new Array();
			heightsArray[linkId].push(respJsonObj.Rows[r]);			
			
		}
	
}

	function pdeManagerFinished(nrTilesRequested)
	{
		map.addObject(group);
		map.getViewModel().setLookAtData({
            bounds: group.getBoundingBox()
        });
		dataPoints = [];
		var links = pdeManager.getLinks(),
		ii = 0,
		ll = links.length;

		for(;ii < ll; ii++)
		{
			var linkID = links[ii].linkId;
			linkID = linkID.replace("-","").replace("+","");
			validCondition = false;
			clink = heightsArray[linkID];
			if(clink)
			{
				var cll = clink.length,
				c = 0,
				height;
				
				
						strip = new H.geo.LineString();
						shape = links[ii].shape;
						i;

						if(shape){
							l = shape.length;
						for(i = 0; i < l; i++)
						{
							strip.pushLatLngAlt.apply(strip, shape[i].split(','));
						}

						var polyline = new H.map.Polyline(strip,
							{
								style:
								{
									lineWidth:6,
									strokeColor: "#FF0000",
									lineJoin: "round"
								}
							});
							group.addObject(polyline);
							
							height = clink[0].DTM_AVG_HEIGHT;
							height = Math.round(height/100);
							var dummy = Math.round(linkID/1000);
							
							intermediate_Point = strip.extractPoint(0);
							var distance = Math.round(str_Point.distance(intermediate_Point));
							distance = Math.round(distance/1000);
							heightsLatLonArray[distance]=intermediate_Point;
							
							dataPoints.push({ x: distance, y: height });
							
							chart.options.data[0].dataPoints = dataPoints;
							
						
					}
								

			numLinksMatched++;
		}
		}
		document.getElementById("chartContainer").style.display='block';
		document.getElementById("chartContainer").style.overflow = 'hidden';
		document.getElementById("chartContainer").style.height="350px"; 
		document.getElementById("chartContainer").style.width="350px"; 
		
		chart.render();
		
	};


	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;
		var wAll = line2.length * 4 + 200;
		wAll = wAll > 250 ? 250 : wAll;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length * 4 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, wAll);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	}

	//Helper create svg for speeds
	var createIconMarkerSpeed = function (speedInfo, colorMarker) {
		var svgmarker4height = '<svg width="__widthAll__" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="34" fill="__color__"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
			'</g>'+
			'</svg>';
		var wAll = speedInfo.length  *4 + 70;

		svgmarker4height = svgmarker4height.replace(/__line1__/g, speedInfo);
		svgmarker4height = svgmarker4height.replace(/__width__/g, speedInfo.length  *4 + 32);
		svgmarker4height = svgmarker4height.replace(/__widthAll__/g, wAll);
		svgmarker4height = svgmarker4height.replace(/__color__/g, colorMarker);

		return new H.map.Icon(svgmarker4height);

	};
	window.onload = function () { CanvasJS.addColorSet("hereColors", ["#48dad0", "#383c45"]);};