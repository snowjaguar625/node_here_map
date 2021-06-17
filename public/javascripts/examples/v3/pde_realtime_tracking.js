// author ez (C) HERE 2015
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
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;
	//add MRS Release information
	loadMRSVersionTxt();
	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	// PDE layers that will be used (here only speedlimit)
	var	layers = new Object(); layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
	// initialization of PDE manager
	var	pdeManager = new PDEManager(app_id, app_code, layers);
	// container for trace points shown on map
	var	tracePositionsContainer = new H.map.Group();
	map.addObject(tracePositionsContainer);
	// bounding box container of current used PDE tile
	var	bboxContainer = new H.map.Group();
	map.addObject(bboxContainer);
	// bounds container of trace points
	var	boundsContainer = new H.map.Group();
	boundsContainer.setVisibility(false);
	// list of parsed (and stored) gps trace points
	var listGpsPoints = new Array();
	// current trace point that is processed internally
	var iCurrentGpsPoint = -1;
	// reverse geocode request count - used to know if a RGC is finished (== 0) or not
	var requestcount = 0;
	// current link id of trace point (got from reverse geocode)
	var iCurrentLinkId = -1;
	// geocoder map release is used to initialize the PDE manager
	var geocoderMapRelease = "LATEST";
	// speed limit unit
	var speedLimitUnit;
	// init speedlimit unit
	handleUnitChange();

	// hashmap with all cached pde links - all PDE information can be cached 30days
	var routeLinkSpeedHashMap  = new Object(); // key = linkID (always positive), value = link speed object
	var routeLinkTileHashMap = new Object(); // key = linkID (always positive), value = link tile info object
	// list with pde tiles that needs to be requested
	var requestThesePdeTiles = new Array();
	// saving for open pde tile count
	var openPdeTileCount = -1;
	// color for tile bounding boxes if it got requested via PDE
	var fcColors = ["rgba(0, 0, 255, 0.2)", "rgba(34, 34, 255, 0.2)", "rgba(68, 68, 255, 0.2)", "rgba(102, 102, 255, 0.2)", "rgba(136, 136, 255, 0.2)"];
	// color for tile bounding boxes if it was cached
	var strokeColorCached = "rgba(255, 0, 0, 0.2)";



	// truck icon
	var truckIcon = new H.map.Icon('/assets/icons/markerTruck.png');
	// truck marker
	var truckMarker = new H.map.Marker({ lat: 52.53805, lng: 13.4205 }, { icon: truckIcon });
	var simulationContainer = document.getElementById("simulationContainer");
	var bSimulationRunning = false;
	// simulation walker
	var simulationWalker = null;
	// color of simulation speed ok
	var	simulationSpeedOkColor = "rgba(20, 255, 20, 1)";
	// color of simulation speed warning
	var	simulationSpeedWarningColor = "rgba(255, 20, 20, 1)";

	// This method is used for choosing the right parser the input files
	var readInputTraceFile = function (file) {
		clearPreviousResults();
		// disable simulation button
		checkRouteSimulationButtonEnabledState();
		Spinner.showSpinner();
		var reader = new FileReader();

		if(file)
		{
			if(file.name.indexOf("csv") != -1)
			{
				reader.onload = function(e)
				{
					processCSV(reader.result);
					Spinner.hideSpinner();
					if(listGpsPoints.length > 0)
					{
						// zoom to loaded trace
						map.setViewBounds(boundsContainer.getBounds());
						// enable simulation button
						checkRouteSimulationButtonEnabledState();
						startSimulation();
					}
					else
					{
						feedbackTxt.innerHTML = "Error loading CSV Trace file.";
					}
				}
			}
			else if(file.name.indexOf("gpx") != -1)
			{
				reader.onload = function(e)
				{
					processGPX(reader.result);
					Spinner.hideSpinner();
					if(listGpsPoints.length > 0)
					{
						// zoom to loaded trace
						map.setViewBounds(boundsContainer.getBounds());
						// enable simulation button
						checkRouteSimulationButtonEnabledState();
						startSimulation();
					}
					else
					{
						feedbackTxt.innerHTML = "Error loading GPX Trace file.";
					}
				}
			}

		}

		reader.readAsBinaryString(file);
	};

	//process csv file
	function processCSV(result){
		// check where the position is inside the header line
		var arr = result.split('\n'),
		l1 = arr[0].trim(),
		l1split = l1.split(','),
		i = 0,
		firstline = 0;
		var latpos = -1;
		var lngpos = -1;
		var speedpos = -1;


		for(;i < l1split.length; i++)
		{
			var colName = l1split[i].toUpperCase().trim();
			if(colName == "LATITUDE")
			{
				latpos = i;
				firstline = 1;
			}
			else if(colName == "LONGITUDE")
			{
				lngpos = i;
				firstline = 1;
			}
			else if(colName == "SPEED")
			{
				speedpos = i;
				firstline = 1;
			}
		}

		// if we have only recId|pos
		// where pos is lat,lng,speed
		// 1|44.347745,-0.8594633,21.13
		if(latpos == -1 && lngpos == -1 && l1.indexOf('|') != -1)
		{
			var t = new Array();
			for(i = 1; i < arr.length; i++)
			{
				var latLonSpeed = arr[i].split('|')[1];
				var latLonSpeedSplit = latLonSpeed.split(',');
				var point = new H.geo.Point(latLonSpeedSplit[0], latLonSpeedSplit[1]);
				point.$speed = latLonSpeedSplit[2];
				t.push(point);
				var marker = new H.map.Marker({lat: point.lat, lng: point.lng});
				boundsContainer.addObject(marker);
			}
			listGpsPoints = t;
		}
		else
		{
			for(i = firstline; i < arr.length; i++)
			{
				var latLonSpeed = arr[i];
				var latLonSpeedSplit = latLonSpeed.split(',');
				var point = new H.geo.Point(latLonSpeedSplit[latpos], latLonSpeedSplit[lngpos]);
				point.$speed = latLonSpeedSplit[speedpos];
				listGpsPoints.push(point);
				var marker = new H.map.Marker({lat: point.lat, lng: point.lng});
				boundsContainer.addObject(marker);
			}
		}
	}
	// process gpx file
	function processGPX(result){
		xmlDoc = parseXml(result);
		parser = new GPXParser(xmlDoc, map, false);
		parser.SetMinTrackPointDelta(0.000001);                         // Set the minimum distance between track points
		parser.AddTrackpointsToMap();                                   // Add the trackpoints
		parser.AddWaypointsToMap();                                     // Add the waypoints

		var objs = parser.GetPointsWithSpeed(),
		i = 0;

		for(;i < objs.length; i++)
		{
			if(objs[i].speed)
			{
				var point = new H.geo.Point(objs[i].coord.lat,  objs[i].coord.lng);
				point.$speed = objs[i].speed;
				listGpsPoints.push(point);
				var marker = new H.map.Marker({lat: point.lat, lng: point.lng});
				boundsContainer.addObject(marker);
			}
			else
			{
				var point = new H.geo.Point(objs[i].coord.lat,  objs[i].coord.lng);
				listGpsPoints.push(point);
				var marker = new H.map.Marker({lat: point.lat, lng: point.lng});
				boundsContainer.addObject(marker);
			}
		}
	}

	// Helper to set correct state to route simulation button
	function checkRouteSimulationButtonEnabledState()
	{
		if(listGpsPoints.length == 0)
		{
			document.getElementById("simulateRouteButton").disabled = true;
		}
		else
		{
			document.getElementById("simulateRouteButton").disabled = false;
		}
	}

	// start route simulation
	function startStopSimulation()
	{
		if(!bSimulationRunning)
		{
			startSimulation();
		}
		else
		{
			stopSimulation();
		}
	}

	// Helper for route simulation start
	function startSimulation()
	{
		simulationContainer.style.display = "block";
		document.getElementById("simulateRouteButton").value = "Stop simulate GPS Trace";
		bSimulationRunning = true;

		// check if truck or simulation group is already part of the map - otherwise add them
		var arrayMapObjects = map.getObjects();
		var bTruckMarkerFound = false;
		for(var k = 0; k < arrayMapObjects.length; k++)
		{
			if(arrayMapObjects[k] == truckMarker)
			{
				bTruckMarkerFound = true;
			}

			if(bTruckMarkerFound)
			{
				break;
			}
		}
		if(!bTruckMarkerFound)
		{
			// set route start
			var startCoord = listGpsPoints[0];
			truckMarker.setPosition(startCoord);
			map.addObject(truckMarker);
		}

		//start walker
		simulationWalker = new Walker(truckMarker);
		simulationWalker.walk();
	}

	// Helper for route simulation stop
	function stopSimulation()
	{
		// stop simulation
		bSimulationRunning = false;
		document.getElementById("simulateRouteButton").value = "Simulate GPS Trace";
		//simulationContainer.style.display = "none";
		if(simulationWalker)
		{
			simulationWalker.stop();
		}
	}

	// Helper for ReverseGeocode a position
	function rgc(lat, lng, iTracePointPosition)
	{
		requestcount++;
		var rgcurl =
	["https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?",
			"maxresults=1",
			"&mode=retrieveAddresses",
			"&prox=",
			lat,
			",",
			lng,
			",50",
			"&gen=7",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&requestId=",
			iTracePointPosition,
			"&jsoncallback=rgccallback"
			].join("");
			script = document.createElement("script");
			script.src = rgcurl;
			document.body.appendChild(script);
	}

	// callback for reverse geocode
	function rgccallback(response)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Location)
		{
			var label = response.Response.View[0].Result[0].Location.Address.Label,
			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude,
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude,
			requestId = response.Response.MetaInfo.RequestId.split(',')[0];

			//get current link id
			var result = response.Response.View[0].Result[0];
			iCurrentLinkId = result.Location.MapReference.ReferenceId;
			// get release for PDE
			var mapVersion = result.Location.MapReference.MapVersion;

			geocoderMapRelease = "latest"; // mapVersion.split('/')[1] + mapVersion.split('/')[0]; don't use this, it is the base release of the weekly, can be up to 1 year old

			// create matched marker
			var marker = new H.map.Marker(new H.geo.Point(lat, lng),
			{
				icon: createIcon("#0000FF", requestId, 16)
			});

			tracePositionsContainer.addObject(marker);

			simulationAddressTxt.innerHTML = "<span style=\"font-weight: normal;\">" + label +"<span>";

			// check for PDE speed
			getPdeSpeedlimit();
		}
		else
		{
			requestcount--;
		}
	}

	// this method requests checks if a link id is known in current cached PDE tile. if not the tile gets requested
	function getPdeSpeedlimit()
	{
		// if current link id is not part of the cached PDE tile - request new PDE tile
		if(routeLinkTileHashMap[iCurrentLinkId] == null)
		{
			pdeManager.requestPDEIndex("LINK_ID", "ROAD_GEOM_FCn", iCurrentLinkId, gotMatchingTileInfoToLink);
		}
		else
		{
			// highlight cached tile boundingbox
			var tile = routeLinkTileHashMap[iCurrentLinkId];
			drawTileBoundingBox(tile.$TILE, true);

			// show link speed
			showLinkSpeed(iCurrentLinkId);

			requestcount--;
		}

	}

	// this method is called to get the pde index response for a link
	function gotMatchingTileInfoToLink(resp)
	{
		if (resp.error != undefined || resp.responseCode != undefined) {
			alert("Got PDE error response");
		}

		// clear last requested tile bounding box
		bboxContainer.removeAll();
		requestThesePdeTiles = new Array();
		if(resp.Layers[0] != null)
		{
			var level = resp.Layers[0].level;
			var layer = resp.Layers[0].layer;

			for (r = 0; r < resp.Layers[0].tileXYs.length; r++) {
				// read affected tiles by a link
				var tile = new Object();
				tile.tileX = resp.Layers[0].tileXYs[r].x;
				tile.tileY = resp.Layers[0].tileXYs[r].y;
				tile.level = level;
				tile.fc = layer.substring(layer.length-1, layer.length);
				requestThesePdeTiles.push(tile);

				// calculate tile bounding box for visualization purposes
				drawTileBoundingBox(tile, false);
			}

			openPdeTileCount = requestThesePdeTiles.length;

			for(var i = 0; i < requestThesePdeTiles.length; i++) // note: there can be more than one pde tile for a link since a link can cross a tile border
			{
				pdeManager.requestPDETile(requestThesePdeTiles[i], "SPEED_LIMITS_FC", gotSpeedLimits, true);
			}
		}
		else
		{
			// no link info available via PDE, go on
			showLinkSpeed(iCurrentLinkId);
			requestcount--;
		}
	}

	function gotSpeedLimits (resp) {
		if (resp.error != undefined || resp.responseCode != undefined) {
			alert("Got PDE error response");
		}

		if(resp.Rows.length != 0)
		{
			for (r = 0; r < resp.Rows.length; r++) {
				var linkId = parseInt(resp.Rows[r].LINK_ID);
				routeLinkSpeedHashMap[linkId] = new Object();
				routeLinkSpeedHashMap[linkId].$FROM_REF_SPEED_LIMIT = resp.Rows[r].FROM_REF_SPEED_LIMIT;
				routeLinkSpeedHashMap[linkId].$TO_REF_SPEED_LIMIT = resp.Rows[r].TO_REF_SPEED_LIMIT;
				routeLinkTileHashMap[linkId] = new Object();
				routeLinkTileHashMap[linkId].$TILE = requestThesePdeTiles[requestThesePdeTiles.length - openPdeTileCount];
			}
		}
		else
		{
			// there could be no speed information available (f.e. for FC5 streets) - we cache this result also
			var linkId = parseInt(iCurrentLinkId);
			routeLinkSpeedHashMap[linkId] = new Object();
			routeLinkSpeedHashMap[linkId].$FROM_REF_SPEED_LIMIT = null;
			routeLinkSpeedHashMap[linkId].$TO_REF_SPEED_LIMIT = null;
			routeLinkTileHashMap[linkId] = new Object();
			routeLinkTileHashMap[linkId].$TILE = requestThesePdeTiles[requestThesePdeTiles.length - openPdeTileCount];
		}

		openPdeTileCount--;

		if(openPdeTileCount == 0)
		{
			// after all tiles got cached, show current speedlimit
			showLinkSpeed(iCurrentLinkId);
			requestcount--;
		}
	}

	function pdeManagerFinished (evt) {
		// not used
	}

	// This method adds a tile bounding box to the map. This is for visualization purposes
	function drawTileBoundingBox(tile, bCached)
	{
		var	tileSizeDegree = 180.0 / (1 << tile.level);
		var miny = tile.tileY * tileSizeDegree -  90.0;
		var minx = tile.tileX * tileSizeDegree - 180.0;
		var maxy = miny + tileSizeDegree - 0.00001;
		var maxx = minx + tileSizeDegree - 0.00001;

		var bounds = new H.geo.Rect(maxy, minx, miny, maxx);

		this.bboxContainer.removeAll();

		var strokeColor = null;
		if(!bCached)
		{
			strokeColor = fcColors[tile.fc - 1];
		}
		else
		{
			strokeColor = strokeColorCached;
		}
		var rectangle = new H.map.Rect(bounds,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: strokeColor,
					fillColor: "rgba(0, 0, 0, 0)",
					lineJoin: "round"
				}
			}
		);
		this.bboxContainer.addObject(rectangle);
	}

	// this method shows the speed
	function showLinkSpeed(iCurrentLinkId)
	{
		var drivenSpeed = null;
		if(listGpsPoints[iCurrentGpsPoint].$speed != null)
		{
			drivenSpeed = listGpsPoints[iCurrentGpsPoint].$speed;
		}
		var simulationSpeedColor = simulationSpeedOkColor;
		var bTraceSpeedAvailable = true;
		if(drivenSpeed == null)
		{
			drivenSpeed = "Not available in Tracefile.";
			bTraceSpeedAvailable = false;
		}

		if(speedLimitUnit == 2 && bTraceSpeedAvailable)
		{
			drivenSpeed = convertMeterPerSecondToKmh(drivenSpeed);
			drivenSpeed = convertKmhToMph(drivenSpeed);
		}
		else if(speedLimitUnit == 1 && bTraceSpeedAvailable)
		{
			drivenSpeed = convertMeterPerSecondToKmh(drivenSpeed);
		}

		if(routeLinkSpeedHashMap[iCurrentLinkId] != null)
		{
			var fromRefSpeed = routeLinkSpeedHashMap[iCurrentLinkId].$FROM_REF_SPEED_LIMIT;
			var toRefSpeed = routeLinkSpeedHashMap[iCurrentLinkId].$TO_REF_SPEED_LIMIT;

			if(fromRefSpeed != null ||toRefSpeed != null)
			{
				var linkSpeed = (fromRefSpeed > toRefSpeed ? fromRefSpeed : toRefSpeed);

				if(speedLimitUnit == 2)
				{
					linkSpeed = convertKmhToMph(linkSpeed);
				}

				if(bTraceSpeedAvailable)
				{
					if(parseFloat(drivenSpeed) > parseFloat(linkSpeed))
					{
						simulationSpeedColor = simulationSpeedWarningColor;
					}
				}

				simulationSpeedTxt.innerHTML = "<span style=\"font-weight: bold;color:" + rgb2hex(simulationSpeedColor) + ";\">Legal Speed: " + linkSpeed + " / Driven Speed: " + drivenSpeed + "<span>";
			}
			else
			{
				simulationSpeedTxt.innerHTML = "<span style=\"font-weight: bold;color:" + rgb2hex(simulationSpeedColor) + ";\">Legal Speed: Not available / Driven Speed: " + drivenSpeed + "<span>";
			}
		}
		else
		{
			if(listGpsPoints[iCurrentGpsPoint].$speed != null)
			{
				simulationSpeedTxt.innerHTML = "<span style=\"font-weight: bold;color:" + rgb2hex(simulationSpeedColor) + ";\">Legal Speed: Not available / Driven Speed: " + drivenSpeed + "<span>";
			}
			else
			{
				simulationSpeedTxt.innerHTML = "<span style=\"font-weight: bold;color:" + rgb2hex(simulationSpeedColor) + ";\">No legal speedlimit and no speed from trace file available.<span>";
			}
		}
	}

	// Helper for clearing map display
	function clearPreviousResults()
	{
		boundsContainer.removeAll();
		stopSimulation();
		listGpsPoints = new Array();
		clearSimulationResults();
		bboxContainer.removeAll();

		requestThesePdeTiles = new Array();
		openPdeTileCount = -1;

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

	}

	// Helper for clearing simulation related results
	function clearSimulationResults()
	{
		tracePositionsContainer.removeAll();
		bboxContainer.removeAll();
		iCurrentGpsPoint = -1;
		requestcount = 0;
	}

	var Walker = function (marker)
	{
		this.marker = marker;
		this.isWalking = false;
		var that = this;
		this.walk = function ()
		{
			that.timeout = setTimeout(that.walk, 500);
			that.isWalking = true;
			// if there is a request ongoing (reverse geocode, pde) then we wait for it to finish
			if(requestcount == 0)
			{
				iCurrentGpsPoint++;
				// check for trace length
				if(iCurrentGpsPoint >= listGpsPoints.length)
				{
					clearSimulationResults();
					iCurrentGpsPoint++;
				}
				// get next gps point
				var currPoint = listGpsPoints[iCurrentGpsPoint];
				// draw unmatched coordinate
				tracePositionsContainer.addObject(new H.map.Marker(new H.geo.Point(currPoint.lat, currPoint.lng), {icon: createIcon("#000000", iCurrentGpsPoint, 16)}));
				// set truck marker positioni
				marker.setPosition(currPoint);
				// reverse geocode point
				rgc(currPoint.lat, currPoint.lng, iCurrentGpsPoint);

			}
		};

		this.stop = function ()
		{
			clearTimeout(that.timeout);
			this.isWalking = false;
		};
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

	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb){
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}

	/**
	This method handles the speedlimit unit change
	*/
	function handleUnitChange()
	{
		speedLimitUnit = document.getElementById("speedUnit").value;
		clearSimulationResults();
	}

	/**
	This method converts km/h to mph
	*/
	function convertKmhToMph(kmhValue)
	{
		// convert km/h to mph
		return parseInt((((kmhValue * 0.621371) + 0.5) * 100) / 100);
	}

	/**
	This method converts meter/second to km/h
	*/
	function convertMeterPerSecondToKmh(meterPerSecondValue)
	{
		// convert meter/second to km/h
		return parseInt(meterPerSecondValue * 3.6);
	}