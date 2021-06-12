/*
		(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
			apikey:api_key,
			useHTTPS: secure 
		}),
		defaultLayers = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService();

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(document.getElementById('mapContainer'), defaultLayers.vector.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});
	
	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);
	
	var marker = null;

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	function TileToQuadKey ( x, y, zoom){ 
		var quad = ""; 
		for (var i = zoom; i > 0; i--){
			var mask = 1 << (i - 1); 
			var cell = 0; 
			if ((x & mask) != 0) 
				cell++; 
			if ((y & mask) != 0) 
				cell += 2; 
			quad += cell; 
		} 
		return quad; 
	}

	var infoProvider = new H.map.provider.ImageTileProvider({
		min: 0,
		max: 20,
		opacity: 0.6,
		crossOrigin: true,
		getURL: function( col, row, level ) {
			var fill;
			if ((col % 2 && !(row % 2)) || (!(col % 2) && row % 2)) {
				fill = "255,255,255,0.2";
			} else { 
				fill = "0,0,0,0.2";
			}
	
			var XY = " (" + col + "," + row +")";
			var tiletms = " (" + col + "," + ((1 << level) - row - 1) + ")";
			var tilequadtree = " " + TileToQuadKey( col, row, level);
			
			var iconSVG = '<svg width=\'256\' height=\'256\' xmlns=\'http://www.w3.org/2000/svg\'>' +
							  '<rect width=\'256\' height=\'256\' style=\'fill:rgba(__FILL__);\'></rect>' +
							  '<text x=\'20\' y=\'20\' font-size=\'12pt\' font-family=\'arial\' font-weight=\'bold\' style=\'fill:rgb(0,0,0);stroke:#000000\' ' +
							  'text-anchor=\'left\' fill=\'black\' textContent=\'XY: __XY__\'>XY: __XY__</text>' +
							  '<text x=\'20\' y=\'40\' font-size=\'12pt\' font-family=\'arial\' font-weight=\'bold\' style=\'fill:rgb(0,0,0);stroke:#000000\' ' +
							  'text-anchor=\'left\' fill=\'black\' textContent=\'TMS: __TMS__\'>TMS: __TMS__</text>' +
							  '<text x=\'20\' y=\'60\' font-size=\'12pt\' font-family=\'arial\' font-weight=\'bold\' style=\'fill:rgb(0,0,0);stroke:#000000\' ' +
							  'text-anchor=\'left\' fill=\'black\' textContent=\'QK: __QUAD__\'>QK: __QUAD__</text>' +
							  '<text x=\'20\' y=\'110\' font-size=\'12pt\' font-family=\'arial\' font-weight=\'bold\' style=\'fill:rgb(0,0,0);stroke:#000000\' ' +
							  'text-anchor=\'left\' fill=\'black\' textContent=\'Zoom: __ZOOM__\'>Zoom: __ZOOM__</text>' +
						  '</svg>',

			svg = iconSVG
				.replace(/__XY__/g, XY)
				.replace(/__TMS__/g, tiletms)
				.replace(/__QUAD__/g, tilequadtree)
				.replace(/__ZOOM__/g, level)
				.replace(/__FILL__/g, fill);

			return 'data:image/svg+xml;base64,' + btoa(svg);
		}
	});

	var infoLayer = new H.map.layer.TileLayer(infoProvider);
	console.log(infoLayer);

	var handleOverlay = function(checked)
	{
		if(checked)
			map.addLayer(infoLayer);
		else
			map.removeLayer(infoLayer);
	}


	var decodeGeoHash = function(geohash) 
	{
		var bounds = getBounds(geohash); // <-- the hard work
		// now just determine the centre of the cell...

		var latMin = bounds.sw.lat, lonMin = bounds.sw.lon;
		var latMax = bounds.ne.lat, lonMax = bounds.ne.lon;

		// cell centre
		var lat = (latMin + latMax)/2;
		var lon = (lonMin + lonMax)/2;

		// round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
		lat = lat.toFixed(Math.floor(2-Math.log(latMax-latMin)/Math.LN10));
		lon = lon.toFixed(Math.floor(2-Math.log(lonMax-lonMin)/Math.LN10));

		return { lat: Number(lat), lon: Number(lon) };
	}
	
	var getBounds = function(geohash) 
	{
		if (geohash.length === 0) throw new Error('Invalid geohash');

		geohash = geohash.toLowerCase();

		var evenBit = true;
		var latMin =  -90, latMax =  90;
		var lonMin = -180, lonMax = 180;
		var base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

		for (var i=0; i<geohash.length; i++) {
			var chr = geohash.charAt(i);
			var idx = base32.indexOf(chr);
			if (idx == -1) throw new Error('Invalid geohash');

			for (var n=4; n>=0; n--) {
				var bitN = idx >> n & 1;
				if (evenBit) {
					// longitude
					var lonMid = (lonMin+lonMax) / 2;
					if (bitN == 1) {
						lonMin = lonMid;
					} else {
						lonMax = lonMid;
					}
				} else {
					// latitude
					var latMid = (latMin+latMax) / 2;
					if (bitN == 1) {
						latMin = latMid;
					} else {
						latMax = latMid;
					}
				}
				evenBit = !evenBit;
			}
		}

		var bounds = {
			sw: { lat: latMin, lon: lonMin },
			ne: { lat: latMax, lon: lonMax },
		};

		return bounds;
	}
	
	var encodeGeoHash = function(lat, lon) {
		var precision = 12,
			base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
		
		lat = Number(lat);
		lon = Number(lon);
		precision = Number(precision);

		if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geohash');

		var idx = 0; // index into base32 map
		var bit = 0; // each char holds 5 bits
		var evenBit = true;
		var geohash = '';

		var latMin =  -90, latMax =  90;
		var lonMin = -180, lonMax = 180;

		while (geohash.length < precision) {
			if (evenBit) {
				// bisect E-W longitude
				var lonMid = (lonMin + lonMax) / 2;
				if (lon >= lonMid) {
					idx = idx*2 + 1;
					lonMin = lonMid;
				} else {
					idx = idx*2;
					lonMax = lonMid;
				}
			} else {
				// bisect N-S latitude
				var latMid = (latMin + latMax) / 2;
				if (lat >= latMid) {
					idx = idx*2 + 1;
					latMin = latMid;
				} else {
					idx = idx*2;
					latMax = latMid;
				}
			}
			evenBit = !evenBit;

			if (++bit == 5) {
				// 5 bits gives us a character: append it and start over
				geohash += base32.charAt(idx);
				bit = 0;
				idx = 0;
			}
		}
		return geohash;
	};
	
	map.addEventListener('tap', function (currentEvent) {
		
		var p = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		
		var hash = encodeGeoHash(p.lat, p.lng);
		
		if(marker)
			map.removeObject(marker);
		
		marker = new H.map.Marker(new H.geo.Point(p.lat, p.lng), {icon: createIcon(hash)});
		map.addObject(marker);
		
		// reverse Geocode here		
		reverseGeocode(p.lat, p.lng, hash);
	});
	
	
	var createIcon = function (text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="38px">' +
			'<line x1="50"  y1="22" x2="50" y2="32" stroke="#000000"/>' +
			'<text font-size="14" x="48" y="18" text-anchor="middle" fill="#000000">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 50, y : 32}});
	};
	
	var encode = function()
	{
		var searchterm = document.getElementById('iotextarea').value;
		geocode(searchterm);
	}
	
	var decode = function()
	{
		var hash = document.getElementById('iotextarea').value,
			p = decodeGeoHash(hash);
		reverseGeocode(p.lat, p.lon, hash);
		if(marker)
			map.removeObject(marker);
			
		marker = new H.map.Marker(new H.geo.Point(p.lat, p.lon), {icon: createIcon(hash)});
		map.addObject(marker);
	}
	
	var geocode = function(searchterm)
	{
		geocoder.search(
			{
				searchText: searchterm,
				maxresults: 1
			},
			function(result) {
				var p = result.Response.View[0].Result[0].Location.DisplayPosition,
					hash = encodeGeoHash(p.Latitude, p.Longitude),
					html = hash + "\n" + result.Response.View[0].Result[0].Location.Address.Label;
				
				if(result.Response.View[0].Result[0].Location.Address.Label)
				{
					document.getElementById('iotextarea').value = html;			
					if(marker)
						map.removeObject(marker);
			
					marker = new H.map.Marker(new H.geo.Point(p.Latitude, p.Longitude), {icon: createIcon(hash)});
					map.addObject(marker);
				}
				else
				{
					reverseGeocode(p.Latitude, p.Longitude, hash);
				}
			},
			function(error) {
				alert(error);
			}
		);
	}
	
	var	reverseGeocode = function(lat, lng, hash) {
		geocoder.reverseGeocode({
			prox: lat + "," + lng + "," + "100",
			mode: "retrieveAddresses",
			maxresults: 1,
			requestid: hash
		},
		function(result)
		{
			var html = result.Response.MetaInfo.RequestId + "\n" + result.Response.View[0].Result[0].Location.Address.Label
			document.getElementById('iotextarea').value = html;
		},
		function(error)
		{
			alert(error);
		}
		);
	}