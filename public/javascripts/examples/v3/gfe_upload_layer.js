/*
	author domschuette
	(C) HERE 2015
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: true,
		app_id: app_id,
		app_code: app_code
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	group = new H.map.Group(),

	unit = document.getElementById("unit"),

	requestUnit = "km",
	requestMode = "truck"

	calcroute = document.getElementById("isorouting"),

	bar1 = document.getElementById("bar1"),
	text1 = document.getElementById("text1"),

	slider1 = document.getElementById("unit-slider"),
	slider1.onchange = function() { updateTextValue(slider1.value,text1) };
	slider1.onmousemove = function() {updateTextValue(slider1.value,text1) };

	isolineOptions = [
		{ lineWidth: 5, strokeColor: "rgba(128, 128, 128, 0.5)", fillColor: "rgba(128, 128, 128, 0.5)"}, // isoline available
		{ lineWidth: 5, strokeColor: "rgba(66, 141, 255, 0.5)", fillColor: "rgba(66, 141, 255, 0.5)"}, // isoline uploaded to GFE
		{ lineWidth: 5, strokeColor: "rgba(34, 204, 34, 0.5)", fillColor: "rgba(34, 204, 34, 0.5)"} // simulation assed inside isoline
	];

	var isolineUpperLeftLat = -90.0;
	var isolineUpperLeftLng = -180.0;
	var gfeLayerAvailable = false;
	var gfeStopCheckingAvailable = false;
	var layerAvailableChecker = null;
	// color of error warnings
	var redColor = "rgba(255, 20, 0, 1)";
	var greenColor = "rgba(20, 255, 0, 1)";

	// GFE Extension
	var gfe = platform.ext.getGeoFencingService();

	// SIMULATION OBJECTS
	// simulation running or not
	var bSimulationRunning = false;
	// object with all route points
	var currentRouteStrip = new H.geo.Strip();
	// truck icon
	var truckIcon = new H.map.Icon('/assets/icons/markerTruck.png');
	// truck marker
	var truckMarker = new H.map.Marker({ lat: 52.53805, lng: 13.4205 }, { icon: truckIcon });
	truckMarker.$id = "truckMarker";
	var iSimulationIsAtPosition = 0;
	// simulation walker
	var simulationWalker = null;
	var simulationGroup = new H.map.Group();
	var routeGroup = new H.map.Group();
	var isolinePolygon = null;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		clearPreviousResults();
		sh = lastClickedPos.lat + "," + lastClickedPos.lng;
		document.getElementById("input-start").value = sh;
		geocode(sh);
	}


	var geocode = function(term)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		clearPreviousResults();
		feedbackTxt.innerHTML = "Geocoding address...";

		geoUrl = ["https://geocoder.api.here.com/6.2/search.json?",
			"searchtext=",
			term,
			"&maxresults=1",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=",
			"geocallback"
			].join("");

			script = document.createElement("script");
			script.src = geoUrl;
			document.body.appendChild(script);
	}

	var geocallback = function(response)
	{
		group.removeAll();

		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Place && response.Response.View[0].Result[0].Place.Locations[0])
		{
			lat = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Longitude;

			getIsolines(lat, lng);
		}
		else if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Location && response.Response.View[0].Result[0].Location.DisplayPosition)
		{

			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude;

			getIsolines(lat, lng);
		}
	}

	var getIsolines = function(lat, lng)
	{
		var url = ["https://isoline.route.api.here.com/routing/7.2/calculateisoline.json?",
			"mode=",
			"fastest;",
			requestMode,
			";",
			"traffic:",
			"disabled",
			"&start=geo!",
			lat,
			",",
			lng,
			requestUnit == "km" ? "&rangetype=distance" : "&rangetype=time",
			"&range=",
			"__POS__",
			"&resolution=",
			"__RES__",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=isolineCallback",
			"&requestId=",
			"__ID__"
			].join("");


			feedbackTxt.innerHTML = "Getting Isoline...";

			var val = slider1.value;
			if(val > 0)
			{
				if(requestUnit == "km")
				{
					val *= 1000;
				}
				else
				{
					val *= 60;
				}

				var newUrl = url;

				newUrl = newUrl.replace("__POS__", val);
				newUrl = newUrl.replace("__RES__", document.getElementById("select" + (1)).value);
				newUrl = newUrl.replace("__ID__", 0 + "," + val);

				script = document.createElement("script");
				script.src = newUrl;
				document.body.appendChild(script);
			}

	}

	var isolineCallback = function(response)
	{
		if(response && response.response && response.response.isoline)
		{

			//add Routing Release number if not already done
			if (releaseRoutingShown== false){
				var ver = response.response.metaInfo.moduleVersion;
				releaseInfoTxt.innerHTML+="<br />Routing: " + ver;
				releaseRoutingShown = true;
			}

			var requestId = response.response.metaInfo.requestId,
			tmp = requestId.split(","),
			val = tmp[1],
			shape = response.response.isoline[0].component[0].shape,
			strip = new H.geo.Strip();

			for (var i = 0; i < shape.length; i++)
			{
				var split = shape[i].trim().split(",");
				if(split.length === 2){
					var lat = parseFloat(split[0]);
					var lon = parseFloat(split[1]);
					if(lat > isolineUpperLeftLat)
					{
						isolineUpperLeftLat = lat;
					}
					if(lon > isolineUpperLeftLng)
					{
						isolineUpperLeftLng = lon;
					}
					strip.pushLatLngAlt( lat, lon, 0);
				}
			}

			isolinePolygon = new H.map.Polygon(strip,
				{
					style: isolineOptions[0]
				}
			);
			isolinePolygon.setZIndex = -val;
			group.addObject(isolinePolygon);
		}
		map.addObject(group);
		map.setViewBounds(group.getBounds());

		// upload to GFE
		uploadIsolineToGFE(isolinePolygon)
	}



	unit.onchange = function (evt)
	{
		requestUnit = requestUnit == "km"?"minute":"km";
		var max=requestUnit=="km"?20:30;

		slider1.max = max;
		slider1.value = 10;

		updateTextValue(slider1.value, text1);
	};

	calcroute.onclick = function ()
	{
		geocode(document.getElementById("start").value);
	};

	function updateTextValue(value,text)
	{
		sliderPosition = 0;
		if (requestUnit == "km")
		{
			text.innerHTML = "Distance: " + value + " km";
		}
		else
		{
			text.innerHTML = "Travel time: " + value +" min";
		}

	};

	function uploadIsolineToGFE(shp)
	{
		var layerId = document.getElementById("layerId").value;
		var wkt = generateWkt(shp);

		feedbackTxt.innerHTML = "Upload Isoline to GFE...";

		var content;
		var zip = new JSZip();
		zip.file("wktUpload.wkt", wkt);
		content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });

		// gfe.customLayersCLEEndpoint = "http://cle.api.here.com/2";
		
		gfe.uploadLayerCLE(layerId, content, uploadLayerCallback);

	}

	function uploadLayerCallback(resp, err)
	{
		if (err) {
			feedbackTxt.innerHTML = "Error during upload: " + resp.error_id + ': ' + resp.issues[0].message;
			return;
		}
		feedbackTxt.innerHTML = "Isoline submitted to Layer... waiting to be processed...";

		checkIsolineAvailibility();
	}

	function checkIsolineAvailibility()
	{
		var insidePoint = new H.geo.Point(lat, lng);
		layerAvailableChecker = new AvailableChecker(document.getElementById('layerId').value, insidePoint);
		layerAvailableChecker.check();
	}

	function onCheckPositionChanged(resp, assetPosition, err)
	{
		if (err) {
			if(resp.issues[0].message.indexOf("The requested layer for the provided AppID does not exist") === -1 )
			{
				feedbackTxt.innerHTML = "Error during checking layer availibility: " + resp.requestId + ': ' + resp.errors[0].type + ", " + resp.errors[0].message;
				gfeStopCheckingAvailable = true;
				return;
			}
		}

		gfeLayerAvailable = true;
		feedbackTxt.innerHTML= "<span style=\"font-weight: bolder;color:" + rgb2hex(greenColor) + ";\">Isoline is available in GFE.<span>";
		if(isolinePolygon != null)
		{
			isolinePolygon.setStyle(isolineOptions[1]);
		}

		calculateExampleRoute();
	}

	function onSimulationActivePositionChanged(resp, assetPosition, err)
	{
		if (err) {
			return;
		}

		var insideIsoline = false;
		var dist = 0;
		var geometryResponse = null;
		if(resp.polygons != null) {
            geometryResponse = resp.polygons
        }
        else {
            geometryResponse = resp.geometries;
        }
		if(geometryResponse[0] != null)
		{
			dist = geometryResponse[0].distance;

			if (dist === -99999999)
			{
				insideIsoline = true;
			} else if (dist < 0) {
				insideIsoline = true;
			} else {
				insideIsoline = false;
			}
		}

		if(isolinePolygon != null)
		{
			if(insideIsoline)
			{
				isolinePolygon.setStyle(isolineOptions[2]);
			}
			else
			{
				isolinePolygon.setStyle(isolineOptions[1]);
			}
		}
	}

	function generateWkt(shp)
	{
		var header = "WKT\n";
		var wkt = "MULTIPOLYGON(((";
			var shapeArray = shp.getStrip().getLatLngAltArray();
			for(var i = 0; i < shapeArray.length; i += 3)
			{
				if(i > 0)
				{
					wkt += ",";
				}
				wkt += shapeArray[i + 1] + " " + shapeArray[i];
			}


		wkt += ")))";
		return header + wkt;
	}

	var calculateExampleRoute = function()
	{
		var urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+
			(isolineUpperLeftLat + 0.004) + "," + (isolineUpperLeftLng + 0.004) + "&waypoint1="+lat+","+ lng +
			"&departure=now&routeAttributes=sh,lg&legAttributes=li&linkAttributes=length,fc&mode=fastest;" +
			requestMode + ";traffic:disabled&app_id=" + app_id + "&app_code=" + app_code+ "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.src = urlRoutingReq;
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

		if (respJsonRouteObj.type != undefined && respJsonRouteObj.type =="ApplicationError")
		{
			alert (respJsonRouteObj.details);
			feedbackTxt.innerHTML = respJsonRouteObj.details;
			return;
		}

		// create link objects
		for(var m = 0; m < respJsonRouteObj.response.route[0].leg[0].link.length; m++)
		{
			var strip = new H.geo.Strip(),
			shape = respJsonRouteObj.response.route[0].leg[0].link[m].shape,
			i,
			l = shape.length;

			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				currentRouteStrip.pushLatLngAlt.apply(currentRouteStrip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
			}

			var link = new H.map.Polyline(strip,
				{
					style:
					{
						lineWidth: 5,
						strokeColor: "rgba(18, 65, 145, 1)",
						lineJoin: "round"
					}
				});
				link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});
				// we store some additional values to each link cause they get re-used for simulation
				link.$linkId = respJsonRouteObj.response.route[0].leg[0].link[m].linkId;
				link.$linkLength = respJsonRouteObj.response.route[0].leg[0].link[m].length;
				link.$linkShape = shape;
				link.$linkPositionOnRoute = m;

				routeGroup.addObject(link);
		}

		// enable simulation button
		checkRouteSimulationButtonEnabledState();
	}

	// Helper for clearing map display
	function clearPreviousResults()
	{
		currentRouteStrip = new H.geo.Strip();
		if(layerAvailableChecker)
		{
			layerAvailableChecker.stop();
		}
		stopRouteSimulation();
		iSimulationIsAtPosition = 0;
		try
		{
			if(truckMarker)
			{
				map.removeObject(truckMarker);
			}
		}
		catch (e)
		{
			// this can happen if the group contains elements but they did not got added to the map
			// we do nothing.
		}
		try
		{
			if(routeGroup)
			{
				map.removeObject(routeGroup);
			}
		}
		catch (e)
		{
			// this can happen if the group contains elements but they did not got added to the map
			// we do nothing.
		}
		try
		{
			if(simulationGroup)
			{
				map.removeObject(simulationGroup);
			}
		}
		catch(e)
		{
			// nothing we can do
		}

		routeGroup = new H.map.Group()
		simulationGroup = new H.map.Group();
		checkRouteSimulationButtonEnabledState();
		isolinePolygon = null;
		isolineUpperLeftLat = -90.0;
		isolineUpperLeftLng = -180.0;
		gfeLayerAvailable = false;
		gfeStopCheckingAvailable = false;
		layerAvailableChecker = null;
		checkRouteSimulationButtonEnabledState()

	}

	// Helper to set correct state to route simulation button
	function checkRouteSimulationButtonEnabledState()
	{
		if(currentRouteStrip.getLatLngAltArray().length == 0)
		{
			document.getElementById("simulateRouteButton").disabled = true;
		}
		else
		{
			document.getElementById("simulateRouteButton").disabled = false;
		}
	}

	// start route simulation
	function startStopRouteSimulation()
	{
		if(!bSimulationRunning)
		{
			map.addObject(routeGroup);
			map.setViewBounds(routeGroup.getBounds());
			startRouteSimulation();
		}
		else
		{
			stopRouteSimulation();
		}
	}

	// Helper for route simulation start
	function startRouteSimulation()
	{
		// start simulation

		// check if truck or simulation group is already part of the map - otherwise add them
		var arrayMapObjects = map.getObjects();
		var bTruckMarkerFound = false;
		var bSimulationGroupFound = false;
		for(var k = 0; k < arrayMapObjects.length; k++)
		{
			if(arrayMapObjects[k] == truckMarker)
			{
				bTruckMarkerFound = true;
			}
			if(arrayMapObjects[k] == simulationGroup)
			{
				bSimulationGroupFound = true;
			}

			if(bTruckMarkerFound && bSimulationGroupFound)
			{
				break;
			}
		}
		if(!bTruckMarkerFound)
		{
			// set route start
			var startCoord = currentRouteStrip.extractPoint(0);
			truckMarker.setPosition(startCoord);
			iSimulationIsAtPosition = 0;
			map.addObject(truckMarker);
		}
		if(!bSimulationGroupFound)
		{
			map.addObject(simulationGroup);
		}
		document.getElementById("simulateRouteButton").value = "Stop Simulation";
		bSimulationRunning = true;
		//start walker
		simulationWalker = new Walker(truckMarker, currentRouteStrip);
		simulationWalker.walk();
	}

	// Helper for route simulation stop
	function stopRouteSimulation()
	{
		// stop simulation
		bSimulationRunning = false;
		document.getElementById("simulateRouteButton").value = "Simulate Asset";
		if(simulationWalker)
		{
			simulationWalker.stop();
		}
	}

	var Walker = function (marker, path)
	{
		this.path = path;
		this.marker = marker;
		this.dir = -1;
		this.isWalking = false;
		this.options = {
			search_radius: 1,
			keyattribute: 'ID'
		};
		var that = this;
		this.walk = function ()
		{
			// Get the next coordinate from the route and set the marker to this coordinate
			var coord = path.extractPoint(iSimulationIsAtPosition);

			marker.setPosition(coord);

			// If we get to the end of the route reverse direction
			if (!iSimulationIsAtPosition || iSimulationIsAtPosition === path.getPointCount() - 1) {
				iSimulationIsAtPosition = 0;
			}

			iSimulationIsAtPosition += 1;

			/* Recursively call this function with time that depends on the distance to the next point
			* which makes the marker move in similar random fashion
			*/
			that.timeout = setTimeout(that.walk, 100);
			that.isWalking = true;

			gfe.checkProximity(document.getElementById('layerId').value, coord, that.options, onSimulationActivePositionChanged);

		};

		this.stop = function ()
		{
			clearTimeout(that.timeout);
			this.isWalking = false;
		};
	};


	var AvailableChecker = function (layerId, insidePoint)
	{
		this.layerId = layerId;
		this.insidePoint = insidePoint;
		this.isChecking = false;
		this.MAX_CHECK = 30;
		this.checkCount = 0;
		this.options = {
			search_radius: 1,
			keyattribute: 'ID'
		};
		var that = this;
		this.check = function ()
		{

			/* Recursively call this function with timeout
			*/
			that.timeout = setTimeout(that.check, 1000);
			that.isChecking = true;

			if(!gfeStopCheckingAvailable && !gfeLayerAvailable)
			{
				if(that.checkCount < that.MAX_CHECK)
				{
					gfe.checkProximity(document.getElementById('layerId').value, that.insidePoint, that.options, onCheckPositionChanged);
					that.checkCount++;
				}
				else
				{
					that.stop();
					feedbackTxt.innerHTML= "<span style=\"font-weight: bolder;color:" + rgb2hex(redColor) + ";\">Isoline took too long to be available in GFE.<span>";
				}
			}
			else
			{
				that.stop();
			}
		};

		this.stop = function ()
		{
			clearTimeout(that.timeout);
			this.isChecking = false;
		};
	};

	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb){
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}