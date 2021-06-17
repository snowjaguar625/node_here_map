'use strict';

	var DEFAULT_LAYER = 'CEN_USA_BGP';
	var addCensusLayersOptions;


	// Fill combo with available layers from CENSUSWORLD.
	var addCensusLayersFinished = Kefir.fromCallback(finishLayerSet => {
		addCensusLayersOptions = function(layers) {
			var censusLayers = document.getElementById('censusLayers');
			layers.forEach(function (l) {
		if (!(l.name.substr(0, 4) === 'CEN_')) return;
				var option = document.createElement('option');
				option.text = l.name;
				option.value = l.name;
				censusLayers.appendChild(option);
				if (l.name === DEFAULT_LAYER) {
					option.selected = 'selected';
				}
			});
			finishLayerSet(true);
		};
		var censusLayers = document.getElementById('censusLayers');

		var pdeManager = new PDEManager(app_id, app_code, {});

		pdeManager.getAvailableLayers(addCensusLayersOptions);
	});


	var demoOptions = {colorful: false};

	var censusBoundariesContainer = new H.map.Group();
	var markersPoints = {};

	var pdeManager;

	// Check whether the environment should use hi-res maps
	var hidpi = (window.devicePixelRatio && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Init map
	var platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	});
	var maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	var mapContainer = document.getElementById('mapContainer');
	var map = new H.Map(mapContainer, maptypes.normal.map, {
		center: new H.geo.Point(34.05349, -118.24532),
		zoom: 14
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI + Bbox-Selector
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function () {
		map.getViewPort().resize();
	});

	var streamMapviewchangeend = Kefir.fromEvents(map, 'mapviewchangeend');
	var combyEvts = Kefir.combine([addCensusLayersFinished, streamMapviewchangeend]);

	// Update postal bounds after every view change & layers html options set
	combyEvts.onValue(x => {
		onViewBoundsChange();
	});



	var geocoder = platform.getGeocodingService();

	var detailsBubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {
		content: document.getElementById('bubbleContent')
	});
	detailsBubble.close();
	ui.addBubble(detailsBubble);
	
	function geocode() {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown == false) {
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		var location = document.getElementById('location').value;
		geocoder.geocode({searchText: location}, function (result) {
			var pos;
			if (result.Response.View[0].Result[0].Location != null) {
				pos = result.Response.View[0].Result[0].Location.DisplayPosition;
			} else {
				pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
			}
			map.setCenter(new H.geo.Point(pos.Latitude, pos.Longitude));
			map.setZoom(14);
		}, function (error) {
			alert(error);
		});
	}

	function onViewBoundsChange() {

		// Clean up old results
		censusBoundariesContainer.removeAll();
		markersPoints = {};

		// restrict zoomlevel for PDE requests
		if(map.getZoom() < 14) {
			return;
		}
		
		Spinner.showSpinner();

		// Update used pde map
		var censusLayer = document.getElementById('censusLayers').value;

		// Select PDE layers
		var layers = {};
		layers[censusLayer] = {callback: drawCensusLayer, isFCLayer: false, level: 8};

		// Init PDE
		var pdeManager = new PDEManager(app_id, app_code, layers);
		pdeManager.setBoundingBox(map.getViewBounds());
		pdeManager.setOnTileLoadingFinished(placeMarkers);
		pdeManager.start();
	}

	function getOffset(coordStr) {
		return coordStr.length === 0 ? 0 : parseInt(coordStr) / 100000.0;
	}

	function coordIsArtificial(lonStr) {
		if (lonStr.charAt(0) === '-') {
			lonStr = lonStr.substr(1);
		}
		return lonStr.substr(0, 1) === '0' && lonStr !== '0';
	}

	function rowHash(row) {
		row.LAT = undefined;
		row.LON = undefined;
		return JSON.stringify(row, null, 2);
	}

	function drawCensusLayer(response) {
		if (response.error) {
			alert(response.error);
			Spinner.hideSpinner();
			if (map.objects) {
				map.objects.clear();
			}
			return;
		}

		// For each census boundary.
		for (var r = 0; r < response.Rows.length; r++) {
			var row = response.Rows[r];
			var latString = row.LAT;
			var lonString = row.LON;
			if (!latString || !lonString) {
				alert('Missing coordinates');
			}

			var currentLat = 0.0;
			var currentLon = 0.0;

			var arrayLat = latString.split(',');
			var arrayLon = lonString.split(',');

			var boundary = [];
			var boundaries = [];

			// For each point in the boundary.
			for (var i = 0; i < arrayLat.length; i++) {
				var latOffset = getOffset(arrayLat[i]);
				var lonOffset = getOffset(arrayLon[i]);

				var currentLat = currentLat + latOffset;
				var currentLon = currentLon + lonOffset;

				var point = new H.geo.Point(currentLat, currentLon);
				if (coordIsArtificial(arrayLon[i])) {
					if (i === 0) continue;
					boundary.push(point);
					boundaries.push(boundary);
					// Split when an artificial coordinate is found.
					boundary = [];
				} else {
					boundary.push(point);
				}
			}
			boundaries.push(boundary);
			for (var k = 0; k < boundaries.length; k++) {
				boundary = boundaries[k];
				if (boundary.length > 1) {
					var strip = new H.geo.Strip();

					var lastDrawnPoint;
					for (var j = 0; j < boundary.length; j++) {
						var currentPoint = boundary[j];

						if (lastDrawnPoint) {
							var latDistance = currentPoint.lat - lastDrawnPoint.lat;
							var lonDistance = currentPoint.lng - lastDrawnPoint.lng;
							var treshold = getTreshold(map.getZoom(), hidpi);
							if (j > 0 && j < boundary.length - 1 &&
								Math.abs(latDistance) < treshold &&
								Math.abs(lonDistance) < treshold) {
									continue;
								}
						}
						strip.pushPoint(currentPoint);
						lastDrawnPoint = currentPoint;
					}

					var rowHash2 = rowHash(row);
					var center = calculateCentroid(strip);
					if (markersPoints.hasOwnProperty(rowHash2)) {
						if (markersPoints[rowHash2][1] < center[1]) {
							markersPoints[rowHash2] = center;
						}
					} else {
						markersPoints[rowHash2] = center;
					}

					var polyline = new H.map.Polyline(strip, {
						style: {
							lineWidth: 2,
							strokeColor: (demoOptions.colorful) ? getRandomColor() : "#1111DD",
							lineJoin: "round"
						}
					});
					censusBoundariesContainer.addObject(polyline);
				}
			}
		}
		console.log(censusBoundariesContainer.getChildCount());
		map.addObject(censusBoundariesContainer);
		Spinner.hideSpinner();
	}

	function sortAndCenter(strip) {
		var stripCenter = strip.getBounds().getCenter();
		var nearestPoint = strip.extractPoint(0);
		var stortestDistance = stripCenter.distance(nearestPoint);
		for (var i = 0; i < strip.getPointCount(); i++) {
			var tmpPoint = strip.extractPoint(i);
			var tmpDistance = stripCenter.distance(tmpPoint);
			if (tmpDistance < stortestDistance) {
				nearestPoint = tmpPoint;
			}
		}
		return nearestPoint;
	}

	function placeMarkers() {
		for (var key in markersPoints) {
			var center = markersPoints[key][0];
			var marker = new H.map.Marker(center);
			marker.addEventListener('tap', function (e) {
				var detailsTextarea = document.getElementById('detailsTextarea');
				detailsTextarea.value = key;
				detailsBubble.setPosition(e.target.getPosition());
				detailsBubble.open();
			});
			censusBoundariesContainer.addObject(marker);
		}
	}

	var tresholdTable = [0.0002, 0.0001, -1, -1, -1, -1, -1];

	function getTreshold(zoom) {
		return tresholdTable[zoom - 14];
	}

	function calculateCentroid(strip) {
		var strip = new H.geo.Strip(strip.getLatLngAltArray().slice());

		var pointCount = strip.getPointCount();

		if (pointCount === 1) {
			return [strip.extractPoint(0), 0.001];
		} else if (pointCount === 2) {
			var a = strip.extractPoint(0);
			var b = strip.extractPoint(1);
			return [new H.geo.Point((a.lat + b.lat) / 2, (a.lng + b.lng) / 2), 0.001];
		} else if (pointCount === 3) {
			var a = strip.extractPoint(0);
			var b = strip.extractPoint(1);
			var c = strip.extractPoint(2);
			var area = a.lng * (b.lat - c.lat) + b.lng * (c.lat - a.lat) + c.lng * (a.lat - b.lat);
			return [new H.geo.Point((a.lat + b.lat + c.lat) / 3, (a.lng + b.lng + c.lng) / 3), area];
		}

		var first = strip.extractPoint(0);
		var last = strip.extractPoint(pointCount - 1);
		if (first.lat != last.lat || first.lng != last.lng) {
			strip.pushPoint(first);
		}

		var doubleArea = 0;
		var lat = 0;
		var lng = 0;
		var point1;
		var point2;
		var tmpArea;
		for (var i = 0, j = pointCount - 1; i < pointCount; j = i++) {
			point1 = strip.extractPoint(i);
			point2 = strip.extractPoint(j);
			tmpArea = point1.lng * point2.lat - point2.lng * point1.lat;
			doubleArea += tmpArea;
			lat += ( point1.lat + point2.lat ) * tmpArea;
			lng += ( point1.lng + point2.lng ) * tmpArea;
		}
		if (doubleArea === 0) {
			// Almost no area, take one point and avoid divide by zero.
			return [strip.extractPoint(0), 0];
		}
		var divFactor = doubleArea * 3;
		return [new H.geo.Point(lat / divFactor, lng / divFactor), doubleArea / 2];
	}


	function getRandomColor() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}