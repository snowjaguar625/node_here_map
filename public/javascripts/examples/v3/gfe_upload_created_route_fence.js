/* 
		author domschuette
		(C) HERE 2016
	*/

	// Check whether the environment should use hi-res maps
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
		router = platform.getRoutingService(),
		geocoder = platform.getGeocodingService(),
		walkerStrip,
		bSimulationRunning = false,
		gfe = platform.ext.getGeoFencingService(),
		gfeStopCheckingAvailable = false,
		gfeLayerAvailable = false,
		redColor = "rgba(255, 20, 0, 1)",
		greenColor = "rgba(20, 255, 0, 1)",
		releaseRoutingShown = false,
		releaseGeocoderShown = false,
		bLongClickUseForStartPoint = true,
		simulationWalker = null,
		truckIcon = new H.map.Icon('/assets/icons/markerTruck.png'),
		truckMarker = new H.map.Marker({ lat: 52.53805, lng: 13.4205 }, { icon: truckIcon });
		truckMarker.$id = "truckMarker";
	
	var map = new H.Map(mapContainer, maptypes.normal.map, 
		{
			center: new H.geo.Point(50.04614777739499, 8.613584243471905),
			zoom: zoom
		}
	);
	
	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
	
	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
		//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;
	
		//add MRS Release information
	loadMRSVersionTxt();
	
	function calculateRouteWithOffset(wPoints, offset)
	{
		if(wPoints.length == 2 && (!wPoints[0] || !wPoints[1])) return;
		
		var start,
			dest;
			
		start = getOffsetPosition(wPoints[0].Latitude, wPoints[0].Longitude, offset);
		dest = getOffsetPosition(wPoints[1].Latitude, wPoints[1].Longitude, offset);
		
		calculateRoute([start, dest], offset);
	}
	
	function calculateRoute(wPoints, offset)
	{
		if(wPoints.length == 2 && (!wPoints[0] || !wPoints[1])) return;
		
		var calculateRouteParams = {
			'waypoint0' : offset != null ? (wPoints[0].Latitude + offset) + ',' + (wPoints[0].Longitude + offset) : wPoints[0].Latitude + ',' + wPoints[0].Longitude,
			'waypoint1' : offset != null ? (wPoints[1].Latitude + offset) + ',' + (wPoints[1].Longitude + offset) : wPoints[1].Latitude + ',' + wPoints[1].Longitude,
			'mode': 'fastest;car;traffic:disabled',
			'representation': 'display',
			'requestId': offset != null ? offset : "0"
		},
		onResult = function(result) {
			
			//add Routing Release number if not already done
			if (releaseRoutingShown== false){
				var ver = result.response.metaInfo.moduleVersion;
				releaseInfoTxt.innerHTML+="<br />Routing: " + ver;
				releaseRoutingShown = true;
			}
			
			var strip = new H.geo.Strip(),
				shape = result.response.route[0].shape, 
				i,
				l = shape.length,
				pathGeo = [],
				offset = result.response.requestId != "0" ? true : false;
		
			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				pathGeo.push([shape[i].split(',').map(function(item) { return parseFloat(item); })[0], shape[i].split(',').map(function(item) { return parseFloat(item); })[1]]);
			}
			
			var polyline = new H.map.Polyline(strip, 
			{
				style: 
				{
					lineWidth: 10,
					strokeColor: offset ? "rgba(255, 0, 0 , 0.5)" : "rgba(0, 255, 0, 1)"
				}	
			});
			map.addObject(polyline);
			if(offset)
			{
				walkerStrip = strip;
			}
			else 
			{
				var distance =  0.01,
					geoInput = {
						type: "LineString",
						coordinates: pathGeo
				};
				
				var geoReader = new jsts.io.GeoJSONReader(),
					geometry = geoReader.read(geoInput).buffer(distance),
					geoWriter = new jsts.io.WKTWriter(),
					polygon = geoWriter.write(geometry),
					shapes = polygon.replace("POLYGON", "").trim().split("),(");

					var strip = new H.geo.Strip(),
						newCoords = shapes[0].replace("(((", "").replace(")))", "").replace("((", "").replace("))", "").replace("(", "").replace(")", "").trim().split(",");
						
					for (var i = 0; i < newCoords.length; i++)
					{
						var split = newCoords[i].trim().split(" ");
						if(split.length === 2){
							var lat = parseFloat(split[0]);
							var lon = parseFloat(split[1]);
							strip.pushLatLngAlt( lat, lon, 0);
						}
					}
			
					poly = new H.map.Polygon(strip, 
					{
						style:
						{
							lineWidth: 5,
							strokeColor: "rgba(128, 128, 128, 0.5)",
							fillColor: "rgba(128, 128, 128, 0.5)"
						}
					});
					map.addObject(poly);
					map.setViewBounds(poly.getBounds());
					
					var wkt = generateWkt(poly);
					feedbackTxt.innerHTML = "Upload Polygon to GFE...";
					var content;
					var zip = new JSZip();
					zip.file("wktUpload.wkt", wkt);
					content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
					gfe.uploadLayerCLE(document.getElementById("layerId").value, content, uploadLayerCallback);
			}
		},
		onError = function(error) {
			console.log(error);
		}
		router.calculateRoute(calculateRouteParams, onResult, onError);
	}
	
	function getOffsetPosition(lat, lng, offset)
	{
		//Earth’s radius, sphere
		var r = 6378137,
			dn = offset,
			de = offset,
			dLat = dn/r,
			dLng = de/(r*Math.cos(Math.PI*lat/180));

			return {Latitude : lat + dLat * 180/Math.PI, Longitude: lng + dLng * 180/Math.PI};
	}
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			clearPreviousResults();
			var line = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-from").value = line;
			bLongClickUseForStartPoint = false;
		}
		else
		{
			var line = lastClickedPos.lat + "," + lastClickedPos.lng;
			document.getElementById("input-to").value = line;
			bLongClickUseForStartPoint = true;
			startRouting();
		}
	}
	
	function startRouting()
	{
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		
		clearPreviousResults();
		
		var from = document.getElementById('input-from').value,
			to = document.getElementById('input-to').value,
			gFrom, gTo;

		if(from && to) {
			gFrom = null;
			gTo = null;

			geocoder.search({searchText: from}, function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					gFrom = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					gFrom = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				}
				gFrom.lat = gFrom.Latitude;
				gFrom.lng = gFrom.Longitude;

				calculateRoute([gFrom, gTo]);
				calculateRouteWithOffset([gFrom, gTo], document.getElementById("offset").value);
			}, function(){});

			geocoder.search({searchText: to}, function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					gTo = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					gTo = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				}
				gTo.lat = gTo.Latitude;
				gTo.lng = gTo.Longitude;

				calculateRoute([gFrom, gTo]);
				calculateRouteWithOffset([gFrom, gTo], document.getElementById("offset").value);
			}, function(){});
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
	
	function uploadLayerCallback(resp, err)
	{
		if (err) {
			feedbackTxt.innerHTML = "Error during upload: " + resp.error_id + ': ' + resp.issues[0].message;
			return;
		}
		feedbackTxt.innerHTML = "Polygon submitted to Layer... waiting to be processed...";

		checkPolygonAvailibility();
	}

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
					feedbackTxt.innerHTML= "<span style=\"font-weight: bolder;color:" + rgb2hex(redColor) + ";\">Polygon took too long to be available in GFE.<span>";
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
	
	function checkPolygonAvailibility()
	{
		var insidePoint = new H.geo.Point(0, 0);
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
		feedbackTxt.innerHTML= "<span style=\"font-weight: bolder;color:" + rgb2hex(greenColor) + ";\">Polygon is available in GFE.<span>";
		if(poly != null)
		{
			poly.setStyle({ lineWidth: 5, strokeColor: "rgba(66, 141, 255, 0.5)", fillColor: "rgba(66, 141, 255, 0.5)"});
		}
		checkRouteSimulationButtonEnabledState();
	}
	
	// Helper to set correct state to route simulation button
	function checkRouteSimulationButtonEnabledState()
	{
		if(walkerStrip == null || walkerStrip.getLatLngAltArray().length == 0)
		{
			document.getElementById("simulateRouteButton").disabled = true;
		}
		else
		{
			document.getElementById("simulateRouteButton").disabled = false;
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
				break;
			}
		}
		if(!bTruckMarkerFound)
		{
			// set route start
			var startCoord = walkerStrip.extractPoint(0);
			truckMarker.setPosition(startCoord);
			iSimulationIsAtPosition = 0;
			map.addObject(truckMarker);
		}

		document.getElementById("simulateRouteButton").value = "Stop Simulation";
		bSimulationRunning = true;

		//start walker
		simulationWalker = new Walker(truckMarker, walkerStrip);
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
	
	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb){
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}	
	
	function clearPreviousResults()
	{
		gfeLayerAvailable = false;
		map.removeObjects(map.getObjects());
		walkerStrip = null;
		checkRouteSimulationButtonEnabledState();
		stopRouteSimulation();
	}
	
		// start route simulation
	function startStopRouteSimulation()
	{
		if(!bSimulationRunning)
		{
			startRouteSimulation();
		}
		else
		{
			stopRouteSimulation();
		}
	}
	
	function onSimulationActivePositionChanged(resp, assetPosition, err)
	{
		if (err) {
			return;
		}

		var insidePolygon = false;
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
				insidePolygon = true;
			} else if (dist < 0) {
				insidePolygon = true;
			} else {
				insidePolygon = false;
			}
		}

		if(poly != null)
		{
			if(insidePolygon)
			{
				poly.setStyle({ lineWidth: 5, strokeColor: "rgba(34, 204, 34, 0.5)", fillColor: "rgba(34, 204, 34, 0.5)"} );
			}
			else
			{
				poly.setStyle({ lineWidth: 5, strokeColor: "rgba(66, 141, 255, 0.5)", fillColor: "rgba(66, 141, 255, 0.5)"});
			}
		}
	}