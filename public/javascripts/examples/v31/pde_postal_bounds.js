var demoOptions = { colorful: false };

	var postalBoundsContainer = new H.map.Group();
	var midpointsContainer = new H.map.Group();

	var pdeManager;


	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Init map
	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

	var mapContainer = document.getElementById("mapContainer");
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: new H.geo.Point(-6.17, 106.83),
			zoom: 13,
            pixelRatio: window.devicePixelRatio || 1
		}
	);

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI + Bbox-Selector
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;


	window.addEventListener('resize', function(){
		map.getViewPort().resize();
	});

	// Update postal bounds after every view change
	map.addEventListener("mapviewchangeend", function(evt) {
		requestPDE();
	});

	var geocoder = platform.getGeocodingService();

	var geocode = function()
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		var location = document.getElementById("location").value;
		geocoder.geocode(
			{
				searchText: location
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition;
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}
				pointA = new H.geo.Point(pos.Latitude, pos.Longitude);

				marker = new H.map.Marker(pointA,
					{
						icon: createIcon(pos.Latitude + " " + pos.Longitude, address.Label)
					});

					map.addObject(marker);
					map.setCenter(pointA);
					map.setZoom(15);
			},
			function(error) {
				alert(error);
			}
		);
	};

	var requestPDE = function()
	{
		// Clean up old results
		postalBoundsContainer.removeAll();
		midpointsContainer.removeAll();

		// restrict zoomlevel for PDE requests
		if(map.getZoom() < 11) {
			return;
		}

		Spinner.showSpinner();		

		// Select PDE layers
		var layers = new Object();
		layers["PSTLCB_GEN"] = {callback: pcmgenResponse, isFCLayer: false, level: 12};

		// Init PDE
		var pdeManager = new PDEManager(app_id, app_code, layers, api_key); 
		pdeManager.setBoundingBox(map.getViewModel().getLookAtData().bounds.getBoundingBox());
		pdeManager.setOnTileLoadingFinished(pcmgenFinished);
		pdeManager.start();
	};

	function pcmgenFinished()
	{
		map.addObject(postalBoundsContainer);

		// Select PDE layers
		var layers = new Object();
		layers["PSTLCB_MP"] = {callback: pcmmpResponse, isFCLayer: false, level: 12};

		// Init PDE
		var pdeManager = new PDEManager(app_id,app_code, layers, api_key);
		pdeManager.setBoundingBox(map.getViewModel().getLookAtData().bounds.getBoundingBox());
		pdeManager.setOnTileLoadingFinished(pcmmpFinished);
		pdeManager.start();

	}

	function pcmmpFinished()
	{
		map.addObject(midpointsContainer);
		Spinner.hideSpinner();
	}

	function pcmgenResponse(response)
	{
		if (response.error != undefined) {
			alert(response.error);
			Spinner.hideSpinner();
			if(map.objects)
				map.objects.clear();
			return;
		}

		if (response.message != undefined) {
			alert(response.message);
			Spinner.hideSpinner();
			if(map.objects)
				map.objects.clear();
			return;
		}

		var cacheFragments = new Array();

		for (var r = 0; r < response.Rows.length; r++)
		{
			latString     = response.Rows[r].LAT;
			lonString     = response.Rows[r].LON;
			if (latString == undefined)
				alert("no coordinate");

			previousCoordLatLink = 0;
			previousCoordLonLink = 0;
			arrayLat = latString.split(',');
			arrayLon = lonString.split(',');
			coords = new Array();

			var alllines = new Array();

			for (var i = 0; i < arrayLat.length; i++)
			{
				if(arrayLat[i]=="")
					arrayLat[i]=0;
				if(arrayLon[i]=="")
					arrayLon[i]=0;

				latitude  = parseFloat(arrayLat[i]) / 100000.0 + previousCoordLatLink; // degree WGS84, values are relative to previous values on link
				longitude = parseFloat(arrayLon[i]) / 100000.0 + previousCoordLonLink; // degree WGS84
				previousCoordLatLink = latitude;
				previousCoordLonLink = longitude;

				var g = arrayLon[i].toString();
				if(g.charAt(0) === '-')
					g = g.substr(1);
				if(g.indexOf("0") === 0 && arrayLon[i] != 0 || g == "00") { // next line is artifical
					if(i == 0) { // start of array
						continue;
					}
					coords.push(new H.geo.Point(latitude, longitude));
					alllines.push(coords);
					coords = new Array();
					continue;
				}
				coords.push(new H.geo.Point(latitude, longitude));
			}
			alllines.push(coords);

			for(var k = 0; k < alllines.length; k++)
			{
				coords = alllines[k];
				if (coords && coords.length > 1)
				{
					var strip = new H.geo.LineString();

					for(var j = 0; j < coords.length; j++)
						strip.pushPoint(coords[j]);

					var polyline = new H.map.Polyline(strip,
						{
							style:
							{
								lineWidth: 3,
								strokeColor: (demoOptions.colorful) ?  getRandomColor() : "#1111DD",
								lineJoin: "round"
							}
						});
						postalBoundsContainer.addObject(polyline);
						cacheFragments.push(polyline);
				}
			}
		}
	};

	function pcmmpResponse(response)
	{
		if(response.responseCode == 400 || response.error != undefined)
			return;
		var cacheFragment = new Array();
		for (var r = 0; r < response.Rows.length; r++) {
			latString  = response.Rows[r].LAT;
			lonString  = response.Rows[r].LON;
			postalCode = response.Rows[r].POSTAL_CODE;

			pointA = new H.geo.Point(parseFloat(latString) / 100000.0, parseFloat(lonString) / 100000.0);
			marker = new H.map.Marker(pointA, {
				icon: createMarker(postalCode, "#F5F05F" )
			});
			midpointsContainer.addObject(marker);
			cacheFragment.push(marker);
		}
	};

	var getRandomColor = function()
	{
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	};

	//SVG-Marker definition
	var createIcon = function (line1, line2)
	{
		var div = document.createElement("div");
		var svg = svgMarkerImage_Line;

		svg = svg.replace(/__line1__/g, line1);
		svg = svg.replace(/__line2__/g, line2);
		svg = svg.replace(/__width__/g, 220);
		svg = svg.replace(/__widthAll__/g,270);
		div.innerHTML = svg;

		return new H.map.Icon(svg, {
			anchor: new H.math.Point(24, 57)
		});

	};

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