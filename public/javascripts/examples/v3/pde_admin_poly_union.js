var postalBoundsContainer = new H.map.Group();
	var midpointsContainer = new H.map.Group();

	var pdeManager;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Init map
	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	var mapContainer = document.getElementById("mapContainer");
	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: 13
		}
	);

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI + Bbox-Selector
	var ui = H.ui.UI.createDefault(map, maptypes);
	var selectedPolygons = new Array();

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;
	
	var alllines = {};
	
	var results = new Array();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function(){
		map.getViewPort().resize();
	});

	// Update postal bounds after every view change
	map.addEventListener("mapviewchangeend", function(evt) 
	{
		if(selectedPolygons.length == 0)
			requestPDE();
	});

	var geocoder = platform.getGeocodingService();

	var pointerclick = function(evt)
	{
		var polygon = evt.target;
		if(!polygon.selected)
		{
			polygon.setStyle({fillColor: 'rgba(255, 0, 0, 0.6)'});
			polygon.selected = true;
			selectedPolygons.push(polygon);
		}
		else
		{
			polygon.setStyle();
			polygon.selected = false;
			var index = selectedPolygons.indexOf(polygon);
			if (index > -1) {
				selectedPolygons.splice(index, 1);
			}
		}
	}
	
	var requestPDE = function()
	{
		// Clean up old results
		postalBoundsContainer.removeAll();
		midpointsContainer.removeAll();
		results = new Array();

		// restrict zoomlevel for PDE requests
		if(map.getZoom() < 11) {
			return;
		}

		Spinner.showSpinner();

		var layers = new Object();
		layers["PSTLCB_MP"] = {callback: pcmmpResponse, isFCLayer: false, level: 12};

		// Init PDE
		var pdeManager = new PDEManager(app_id, app_code, layers);
		pdeManager.setBoundingBox(map.getViewBounds());
		pdeManager.setOnTileLoadingFinished(pcmmpFinished);
		pdeManager.start();
	};
	
	var union = function()
	{
		var i = 0, 
			lastGeometrie
			jsts_reader = new jsts.io.WKTReader(),
			jsts_writer = new jsts.io.WKTWriter();
			
		for(; i < selectedPolygons.length; i++)
		{
			if(i == 0)
			{
				lastGeometrie = jsts_reader.read(selectedPolygons[i].$wktString);
			}
			else 
			{
				var unionGeometrie = jsts_reader.read(selectedPolygons[i].$wktString);
				lastGeometrie = lastGeometrie.union(unionGeometrie);
			}
		}
		lastGeometrie = jsts_writer.write(lastGeometrie);
		
		var geom = parseWKT(lastGeometrie);
		renderWKT(geom, lastGeometrie, map, {fillColor: 'rgba(0, 255, 0, 0.6)'});
	}
	
	function addPolygonToMap(poly, wktString, container, options) {
		var polygonStrip = new H.geo.Strip();
		for (var k = 0; k < poly.length - 1; k++) {
			polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
		}

		var polygon = new H.map.Polygon(polygonStrip, options);
		polygon.addEventListener('tap', pointerclick);
		polygon.$wktString = wktString;
		
		container.addObject(polygon);
	}

	function addPointToMap(point, wktString, container, options) 
	{
		var marker = new H.map.Marker(new H.geo.Point(point[1], point[0], options));
		marker.$wktString = wktString;
		container.addObject(marker);
	}

	function addLineToMap(line, wktString, container, options) 
	{
		var lineStrip = new H.geo.Strip();
		for (var k = 0; k < line.length; k++)
		{
			if (line[k] === 'artificial') 
				continue;// our extension to geojson
			lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
		}
		var polyline = new H.map.Polyline(lineStrip, options);
		polyline.$wktString = wktString;
		container.addObject(polyline);
	}

	function renderWKT(geom, wktString, container, options)
	{
		for (var j = 0; j < geom.coordinates.length; j++) {
			switch (geom.type) {
				case 'MultiPolygon':
				for (var k = 0; k < geom.coordinates[j].length; k++) {
					addPolygonToMap(geom.coordinates[j][k], wktString, container);
				}
				break;
			  case 'Polygon': 
				addPolygonToMap(geom.coordinates[j], wktString, container);
				break;
			  case 'MultiPoint':
				addPointToMap(geom.coordinates[j][0], wktString, map);
				break;
			  case 'MultiLineString':
				addLineToMap(geom.coordinates[j], wktString, map);
				break;
			  default:
				console.log('Cannot draw matching geometry!');
			}
		}
	}

	function adminPolyFinished()
	{
		var geomUtils = platform.ext.getPDEGeomUtils();
		var wkts = geomUtils.converPDEResultsToWKT(results, "ADMIN_PLACE_ID", true);
		
		for (var i = 0; i < wkts.length; i++) {
			var geom = parseWKT(wkts[i]);
			renderWKT(geom, wkts[i], postalBoundsContainer);
		}

		map.addObject(postalBoundsContainer);

		// Select PDE layers
		var layers = new Object();
		layers["PSTLCB_MP"] = {callback: pcmmpResponse, isFCLayer: false, level: 12};

		// Init PDE
		var pdeManager = new PDEManager(app_id, app_code, layers);
		pdeManager.setBoundingBox(map.getViewBounds());
		pdeManager.setOnTileLoadingFinished(pcmmpFinished);
		pdeManager.start();
	}

	function pcmmpFinished()
	{
		map.addObject(midpointsContainer);
		map.addObject(postalBoundsContainer);
		Spinner.hideSpinner();
	}

	function pcmmpResponse(response)
	{
		if(response.responseCode == 400 || response.error != undefined)
			return;
		for (var r = 0; r < response.Rows.length; r++) {
			latString  = response.Rows[r].LAT;
			lonString  = response.Rows[r].LON;
			postalCode = response.Rows[r].POSTAL_CODE;

			pointA = new H.geo.Point(parseFloat(latString) / 100000.0, parseFloat(lonString) / 100000.0);
			marker = new H.map.Marker(pointA, {
				icon: createMarker(postalCode, "#F5F05F" )
			});
			midpointsContainer.addObject(marker);
			
			geocode(response.Rows[r].POSTAL_CODE + " " + response.Rows[r].ISO_COUNTRY_CODE + " " + response.Rows[r].ADMIN_4);
		}
	};

	function geocode(searchText)
	{
		geocoder.geocode({
			searchText: searchText,
			'additionalData': 'IncludeShapeLevel,default'
		},
		function(result) {
			createPolygon(result);
		},
		function(error) {
			alert(error);
		});
	};

	var createPolygon = function(result)
	{
		var wkt = result.Response.View[0].Result[0].Location.Shape.Value;
		var geom = parseWKT(wkt);
		renderWKT(geom, wkt, postalBoundsContainer);
	}

	var createMarker = function (text, colorMarker)
	{
		var svgMarker = '<svg width="__widthAll__" height="38" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="13" rx="3" stroke="#000000" height="22" width="__width__" y="12" x="20" fill="__color__"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="13" font-weight="bold" y="28" x="24" stroke-width="0" fill="#000000">__line1__</text>' +
			'</g>'+
			'</svg>';

		svgMarker = svgMarker.replace(/__line1__/g, text);
		svgMarker = svgMarker.replace(/__width__/g, text.length  *4 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, text.length  *4 + 48);
		svgMarker = svgMarker.replace(/__color__/g, colorMarker);
		return new H.map.Icon(svgMarker);
	};
