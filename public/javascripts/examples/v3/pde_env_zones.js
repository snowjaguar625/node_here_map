/* 
		author domschuette
		(C) HERE 2018
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	adminLevel,
	layer,
	provider,
	totalPdeTilesLoaded = 0,
	zoom = 11;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.terrain.map, {
		center: new H.geo.Point(48.70021 , 9.50474),
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	window.addEventListener('resize', function() { 
		map.getViewPort().resize(); 
	});

	map.addEventListener("mapviewchangeend", function() 
	{ 
		clear();
		
		var d = document.getElementById("centerCoordinate"),
			c = map.getCenter(),
			lon = Math.round(c.lng * 100000.0) /100000.0;
			lat = Math.round(c.lat * 100000.0) /100000.0;
			d.innerHTML = "Map center: " + lat + " / " + lon;
		showEnvironmentalZoneNames();
	});

	// stores the static environmental zone data
	var envZoneHashMap = new Object();  // key: cartoId
	// stores the selected vehicle emission class
	var selectedVehicleEmissionClass;
	setNewVehicleEmmisionClass(false);
	var displayedZoneNames =  new Object(); // key: cartoId, value: name
	// storage for carto coordinates to be remembered in order to be able to write set a names marker
	var cartoPolyCoordBox = new Object(); // key: cartoId
	// environmental zone midpoints
	var envZoneMarkerGroup = new H.map.Group();
	map.addObject(envZoneMarkerGroup);
	var markerScale = 1.2;
	var cartoIdsInView = [];
	var maxZoomLevelEnvZones = 10;

	// load the static layer SC_ENV_ZONE_RESTR to get the environmental zone restriction info
    var url = "https://pde.api.here.com/1/static.json?content=ENV_ZONE_RESTR&tilex=-1&tiley=-1&level=-1&app_id=" + app_id + "&app_code=" + app_code + "&callback=gotStaticContentEnvironmentalZones";
    var script = document.createElement("script");
    script.src = url;
	document.body.appendChild(script);
	
	/*
		Callback for the environmental zone static content layer
	**/
	function gotStaticContentEnvironmentalZones(response)	{
		if (response.error != undefined) {
		  alert(response.error);
		  return;
		}
		if (response.responseCode != undefined) {
		  alert (response.message);
		  return;
		}

		for (var r = 0; r < response.Rows.length; r++) {
			var zoneRestr = {};
			// parse emission type restrictions
			var emissionTypes = [];
			if(response.Rows[r].EMISSION_TYPE != null) {
				emissionTypes = response.Rows[r].EMISSION_TYPE.split(',');
			}
			zoneRestr.emissionTypes = emissionTypes;
			zoneRestr.zone_name = response.Rows[r].ZONE_NAME;
			envZoneHashMap[parseInt(response.Rows[r].CARTO_ID)] = zoneRestr;
		}

		// add environmental zone polygon layer loader
		// add our provider to the map
		provider = new CustomProvider({});
		layer = new mapsjs.map.layer.TileLayer(provider);
		map.addLayer(layer);
	}

	// load the environmental zone polygons
	var CustomProvider = function(options) 
	{
		this.projection = new mapsjs.geo.PixelProjection();
		this.projection.rescale(7);
		this.url = "https://pde.api.here.com/1/tile.json?release=LATEST&layer=CARTO_POLY_TOLL_HAZ&level=11&tilex={$X$}&tiley={$Y$}&app_id=" + app_id + "&app_code=" + app_code;
		this.done = {};
		this.drawStrip.bind(this);
		mapsjs.map.provider.RemoteTileProvider.call(this /*, {min: 7, max: 8}*/);
	};

	// inherits is API internal, but it saves time to use it directly
	inherits(CustomProvider, mapsjs.map.provider.RemoteTileProvider);

	CustomProvider.prototype.requestInternal = function(x, y, z, onSuccess, onError) 
	{
		this.projection.rescale(z);

		var that = this,
		degSize = 180 / Math.pow(2, 11),
		counter = 0,
		topleft = this.projection.pixelToGeo({x: x * 256,y: y * 256}),
		topLeftXY = [Math.floor((topleft.lng + 180) / degSize), Math.floor((topleft.lat + 90) / degSize)],
		bottomright = this.projection.pixelToGeo({x: x * 256 + 255,y: y * 256 + 255}),
		bottomrightXY = [Math.floor((bottomright.lng + 180) / degSize), Math.floor((bottomright.lat + 90) / degSize)],
		bottomrightColRow = [],
		total = (bottomrightXY[0] - topLeftXY[0] + 1) * (topLeftXY[1] - bottomrightXY[1] + 1);
		xhrs = [];

		// restrict zoomlevel for PDE requests
		if(map.getZoom() < maxZoomLevelEnvZones) {
			return;
		}

		for (var i = topLeftXY[0], lenI = bottomrightXY[0]; i <= lenI; i++) {
			for (var k = bottomrightXY[1], lenK = topLeftXY[1]; k <= lenK; k++) {
				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d');
				
				canvas.width = 256;
				canvas.height = 256;
				
				xhrs.push(
					new mapsjs.net.Xhr(this.url.replace('{$X$}', i).replace('{$Y$}', k), (function(x, y) {return function(resp) 
					{
						if (resp.ok) {
							resp.json().then(function(jsonResp){
							
								var rows = jsonResp.Rows, len = rows.length;								
								
								for (var j = 0; j < len; j++) {
									// show only the environmental zones from this layer
									if(parseInt(rows[j].FEATURE_TYPE) == 9997010) {
										var envZoneColor = '#FF0000';
										var cartoId = parseInt(rows[j].CARTO_ID);
										if(cartoPolyCoordBox[cartoId] === undefined) {
											cartoPolyCoordBox[cartoId] = [];
											cartoIdsInView.push(cartoId);
										}
										var zoneName = null;
										// filter environmental zones to vehicle Parameters
										var restictionDataAvailable = envZoneHashMap[cartoId];

										if(restictionDataAvailable != undefined) {
											if(restictionDataAvailable.emissionTypes.length > 0) {
												envZoneColor = '#808080'; // assume the environmental zone restriction is not applicable
												for(var e = 0; e < restictionDataAvailable.emissionTypes.length; e++) {
													var emissionClassNr = 0;
													try {
														var emissionClassNr = parseInt(restictionDataAvailable.emissionTypes[e].replace("EURO ", ""));
													} catch (e) {console.log("Error parsing emmission type number out of " + restictionDataAvailable.emissionTypes[e]);}
													// if found in the restriction list - it is applicable
													if(selectedVehicleEmissionClass <= emissionClassNr) {
														envZoneColor = '#FF0000';
														break;
													}
												}
											}
											displayedZoneNames[cartoId] = restictionDataAvailable.zone_name;
										}
										that.drawStrip(cartoId, rows[j].LAT.split(','), rows[j].LON.split(','), that.tileSize * x, that.tileSize * y, ctx, envZoneColor);
									}
								}
								
								//grid for debuging
								/*ctx.save();
								ctx.fillStyle = 'rgba(255, 0, 0, 1)';
								ctx.font = (11) + 'px sans-serif';
								ctx.fillText(z + '/' + x + '/' + y, 11, 11);
								ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
								ctx.lineWidth = 1;
								ctx.strokeRect(0, 0, 2 * that.tileSize, 2 * that.tileSize);
								ctx.strokeRect((that.tileSize / 2) - 1, (that.tileSize / 2) - 1, 2, 2);
								ctx.restore();*/
								
							}, function(err){
								errorMsg = err;
								gotResponse = true;
							});
						}
						
						
					
						counter++;
						totalPdeTilesLoaded++;
						if (counter == total) {
							releaseInfoTxt.innerHTML = totalPdeTilesLoaded + " PDE tiles loaded";
							console.log("map tile drawn");
						}
						counter === total && onSuccess(canvas);
				};}(x, y))));
			}
		};

		return {
			'cancel': function() 
			{
				xhrs.forEach(function(item) 
				{
					item.abort();
				});
			}
		}
	}

	CustomProvider.prototype.drawStrip = function(cartoId, lats, lons, offsetX, offsetY, ctx, envZoneColor) 
	{
		var parsedLat, parsedLon,
			lastLat = 0, lastLon = 0,
			lat, lon, 
			point,
			coords = new Array(),
			alllines = new Array(),
			textPosY = 0, textPosX = 0;

		for (var i = 0; i < lats.length; i++) {
			if (lats[i] == "") lats[i] = 0;
			if (lons[i] == "") lons[i] = 0;
			lat = parseFloat(lats[i]) / 100000.0 + lastLat;
			lon = parseFloat(lons[i]) / 100000.0 + lastLon;
			addCoordinateToCarto(cartoId, lat, lon);
			lastLat = lat;
			lastLon = lon;
			point = this.projection.geoToPixel({lat: lat, lng: lon});
			textPosX += point.x - offsetX;
			textPosY += point.y - offsetY;
			var g = lons[i].toString();
			if (g.charAt(0) === '-') g = g.substr(1);
			if (g.indexOf("0") === 0 && lons[i] != 0 || g == "00") { // point starts artificial line that is only used for polygon filling
				if (i == 0) continue;
				coords.push(point);
				alllines.push(coords);
				coords = new Array();
				continue;
			}
			coords.push(point);
		}
		alllines.push(coords);
		textPosY /= lats.length;
		textPosX /= lons.length;

		ctx.lineWidth = 5;
		ctx.strokeStyle = envZoneColor;
		for (var i = 0; i < alllines.length; i++) {
			ctx.beginPath();
			coords = alllines[i];
			for (var j = 0; j < coords.length; j++)	{
				point = coords[j];
				ctx.lineTo(point.x - offsetX, point.y - offsetY);
			}
			ctx.stroke();
		}
	}

	/**
		Redraws the custom tile provider that renders the polygons
	*/
	function reloadCustomTileProvider() {
		if(layer != null && layer !== undefined) {
			try {
				layer.getProvider().reload();
			} catch (e){}
		}
	}

	/**
		Clear last results
	*/
	function clear() {
		try {
			envZoneMarkerGroup.removeAll();
		} catch (e){}		
	}


	/**
		Updates the selected emmision class
	*/
	function setNewVehicleEmmisionClass(redrawMap) {
		selectedVehicleEmissionClass = document.getElementById("emissionType").value;
		
		if(redrawMap) {
			reloadCustomTileProvider();
		}
	}

	/**
		Takes a coordinate for a carto id and adds saves it - used to set a map marker with environmental zone name later on
	*/
	function addCoordinateToCarto(cartoId, lat, lon) {
		var existingCoords = cartoPolyCoordBox[cartoId];
		var coordAlreadyFound = false;
		for(var i = 0; i < existingCoords.length; i++) {
			var c = existingCoords[i];
			if(c.lat == lat && c.lon == lon) {
				coordAlreadyFound = true;
				break;
			}
		}
		if(!coordAlreadyFound) {
			var coord = {};
			coord.lat = lat;
			coord.lon = lon;
			cartoPolyCoordBox[cartoId].push(coord);
		}
	}

	/**
		Simple center method - not really the mass center of the environmental zone polygon, but good enough for the name marker purpose here
	*/
	function polygonCenter(coords) {
		var center = {};
		center.lat = 0;
		center.lon = 0;
		for(var i = 0; i < coords.length; i++) {
			center.lat += coords[i].lat;
			center.lon += coords[i].lon;
		}
		center.lat = center.lat / coords.length;
		center.lon = center.lon / coords.length;
		return center;
	}

	/**
		Puts the environmental zone names as markers to the map
	*/
	function showEnvironmentalZoneNames() {
		console.log("showEnvironmentalZoneNames.");
		if(map.getZoom() < maxZoomLevelEnvZones) {
			return;
		}
		for(var i = 0; i < cartoIdsInView.length; i++) {
			var zoneName = displayedZoneNames[cartoIdsInView[i]];
			if(zoneName !== null && zoneName !== undefined) {
				coord = polygonCenter(cartoPolyCoordBox[cartoIdsInView[i]]);
				var icon = createIcon(zoneName);
				envZoneMarkerGroup.addObject(new H.map.Marker(new H.geo.Point(coord.lat, coord.lon), {icon: icon}));
			}
		}
	}

	/**
		Creates icons with Text (used for tracepoint sequence number)
	*/
	var svgLocationMarker = '<svg xmlns="http://www.w3.org/2000/svg" width="{{{WIDTH}}}" height="{{{HEIGHT}}}"><g transform="scale({{{SCALE}}})"><path id="marker_ground_shaddow" fill-opacity="0.2" fill="#000" d="m14.609755992889404,22.544715881347656 c0,1.7000000000000002 -2.7,3 -6,3 c-3.3,0 -6,-1.3 -6,-3 c0,-1.7000000000000002 2.7,-3 6,-3 c3.3,0 6,1.3 6,3 z" class=""/><text id="destination_label_text" stroke="#8A8AF1" stroke-opacity="1" stroke-width="0.25" y="8.296977452945708" x="25.288722365205288" font-family="Nimbus Sans L,sans-serif" fill="#0A70C9" font-weight="bold" font-size="12" class="" transform="matrix(1.61048, 0, 0, 1.5062, -15.4331, 0.775187)">_TEXT_</text><path id="pole" fill="#0A70C9" fill-opacity="1" stroke="#0A70C9" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="miter" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M8.58934497833252,22.524281079286993 L8.58934497833252,22.524281079286993 zL8.58934497833252,1.4630391510024836 " class="" filter=""/><path id="triangle" fill="none" stroke="#0A70C9" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="miter" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M8.588785486785127,1.873892068862915 L1.6443515900487569,7.058241844177246 L8.588474289653277,11.463082313537598 L8.588785486785127,1.873892068862915 z" class=""/></g></svg>';
	
	var createIcon = function(text) {
		var svgMarker = svgLocationMarker;
	
		// adapt text
		svgMarker = svgMarker.replace(/_TEXT_/g, text);
		var textLength = text.length;
		var baseWidth = 39 + (textLength * 15); // ca 15 px per letter
		var baseHeigth = 26;
		var baseAnchorX = 8;
		var baseAnchorY = 22;		
		// scale the marker
		svgMarker = svgMarker.replace('{{{SCALE}}}', markerScale);
		svgMarker = svgMarker.replace('{{{WIDTH}}}', markerScale * baseWidth);
		svgMarker = svgMarker.replace('{{{HEIGHT}}}', markerScale * baseHeigth);
		return new H.map.Icon(svgMarker, { anchor: new H.math.Point(markerScale * baseAnchorX / 2, markerScale * baseAnchorY)});
	}