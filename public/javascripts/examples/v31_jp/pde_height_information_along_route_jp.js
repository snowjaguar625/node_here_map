/*
	author domschuette
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
			apikey: api_key_jp,
			useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers(),
		geocoder = platform.getSearchService(),
		router = platform.getRoutingService(),
		group = new H.map.Group(),
		layers = null;

	var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    var center = new H.geo.Point(35.68066, 139.8355);


	var	map = new H.Map(mapContainer, omvlayer,
			{
				center: center,
				zoom: zoom,
				pixelRatio: window.devicePixelRatio || 1
			}
		);
	
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	
	//add JS API Release information
	releaseInfoTxt.innerHTML+="<br />JS API: 3."+ H.buildInfo().version;
	
	//add MRS Release information
	loadMRSVersionTxt();

	releaseInfoTxt.innerHTML+="<br />Geocoder: 7";

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	var dataPoints = [];


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
			})
		);
	});

	
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
		pdeManager = new PDEManager(null, null, layers, api_key_jp),
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
		geocode(start.value, 'start');
	}

	
	var geocode = function(searchTerm, which)
	{
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
					else
						calculateRoute(pointA, pointB);
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



	/*var geocode = function(searchTerm, start)
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
	}*/

	/*var calculateRouteDirect = function(start, destination)
	{
		var urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+
			start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +
			"&departure=" +"&routeattributes=sh,lg&legattributes=li&linkattributes=nl,fc&mode=fastest;" +
			"car;traffic:disabled&app_id=" + app_id + "&app_code=" + app_code+ "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.src = urlRoutingReq;
		str_Point = new H.geo.Point(start.lat, start.lng);
		document.body.appendChild(script);
	}*/


	var calculateRoute = function(start, destination, via){
		str_Point = new H.geo.Point(start.lat, start.lng);
		var wP2 = via ? ["&waypoint2=", (destination.lat+","+ destination.lng)] : [""];
		var urlRoutingReq = ["https://fleet.ls.hereapi.com/2/calculateroute.json?",
			"waypoint0=", (start.lat + "," + start.lng),
			"&waypoint1=", via ? (via.lat + "," + via.lng) : (destination.lat+","+ destination.lng),
			...wP2,
			"&legAttributes=","li",
			"&linkAttributes=fc",
			"&routeAttributes=sh&mode=fastest;car;traffic:disabled",
			"&apikey=", api_key_jp,
			"&jsoncallback=gotRoutingResponse"].join("");

		//feedbackTxt.innerHTML = urlRoutingReq;
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


	// parse the routing response
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


	/*var gotRoutingResponse = function (respJsonRouteObj)
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
	}*/

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
						for(i = 0; i < l; i+=2)
						{
							strip.pushLatLngAlt.apply(strip, [shape[i], shape[i+1]]);
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
        line2 = line2.trim();
		line1 = line1.trim();
		var domElement = document.createElement('div');
		domElement.style.marginTop = "-55px";
		domElement.style.marginLeft = "-27px";
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line1.length * 10);
        svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 10 + 80);
		domElement.innerHTML = svgMarker;

		return new H.map.DomIcon(domElement);
	};

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

	
	var loadGeocoderVersionFromSwagger = function(){
		try{
			$.ajax({
				url: "https://developer.here.com/documentation/geocoding-search-api/swagger/open-search-v7-external-spec.json",
				dataType: "json",
				async: true,
				type: 'get',
				success: function(resp) {
					console.log("resp:", resp);
				},
				error: function(xhr, status, e) {

				}
			});
		}catch(e){

		}
	}