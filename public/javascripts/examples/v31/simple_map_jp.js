/*
	(C) HERE 2020
	*/
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	app_id = getUrlParameter( 'api_key' );
	app_code = getUrlParameter( 'app_code' );
	api_key = getUrlParameter( 'apikey' );
		
	if(app_id == null || app_code == null)
	{
		app_id = app_id_jp;
		app_code = app_code_jp;
	}
	
	if(api_key == null){
		api_key = api_key_jp;
	}
	
	
	const domainConfig = {};
	const getoptions = {
		  apikey: api_key
	};
	
	// Japan Vector Tile service /core instead of /base
	domainConfig[H.service.omv.Service.CONFIG_KEY] = {
		  baseUrl: new H.service.Url(
			'https', 'vector.hereapi.com', 'v2/vectortiles/core/mc', getoptions
		  ),
		  subdomain: null // optional, if subdomain is not needed null must be passed
	};
	
	
	// Create an instamce of the platform
		var platform = new H.service.Platform({
		  apikey: api_key,
		  servicesConfig: domainConfig
		});
		maptypes = platform.createDefaultLayers();
		
		// Instantiate a map in the 'map' div, set the base map to normal
		var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
			center: new H.geo.Point(35.68066,139.8355),
			zoom: zoom,
			pixelRatio: hidpi ? 2 : 1
		});
	
	// do i need this ?!?
	var
		group = new H.map.Group(),
		polyline;
		
	var jpProvider = new H.map.provider.ImageTileProvider({
		label: "JP Base Provider",
		descr: "",
		min: 8,
		max: 20,
		getURL: function( col, row, level )
		{
			return ["https://",
					"m.lbs.api.heremaps.jp/v1/map?app_id=",
					app_id,
					"&app_code=",
					app_code,
					"&tilematrix=EPSG:900913:",
					level,
					"&tilecol=",
					col,
					"&tilerow=",
					row].join("");
		}
	});

	
	// add the marker and polyline group to the map. 
	map.addObject(group);

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	// globals for start and destination marker and the route shape (polyline)
	var smarker, dmarker, rshape;
	
	var startRouting = function()
	{
		var vStart = document.getElementById('start').value;
		var vDest = document.getElementById('dest').value;
		if(!smarker || smarker.$term != vStart){
			smarker = resetMarker(smarker);
			geocode(vStart, true);
		}
		
		if(!dmarker || dmarker.$term != vDest){
			dmarker = resetMarker(dmarker);
			geocode(vDest, false);
		}
			
	}	
	var resetMarker = function(m){
		if(m)
		{
			group.removeObject(m);
			return null;
		}
	};
	
	// do the Geocoding
	var geocode = function(term, start)
	{
		var geoUrl = ["https://s.lbs.api.heremaps.jp/v1/addr?", 
				  "addr=",
				  term, 
				  "&gov=0",
				  "&app_id=",
				  app_id, 
				  "&app_code=",
				  app_code,
				  "&callback=",
				  jsonp(geocallback, {start: (start ? "start" : "dest"), term: term})
				 ].join("");
		
		script = document.createElement("script");
		script.src = geoUrl;
		document.body.appendChild(script);
	}
	
	var geocallback = function(response, arg)
	{
		if(response && response.results && response.results[0] && response.results[0].lat && response.results[0].lon && response.results[0].name)
		{
			var lat = response.results[0].lat;
			var lon = response.results[0].lon;
			
			var start =  arg.start == "start" ? true : false;
			
			marker = start ? smarker : dmarker;
			if(marker)
			{
				group.removeObject(marker);
				marker = null;
			}
			label = response.results[0].name;
			var marker = new H.map.Marker(new H.geo.Point(lat, lon),
				{
					icon: createIconMarker(label, lat + " " + lon)
				});
			marker.$term = arg.term;

			group.addObject(marker);
			
			start ? (smarker = marker) : (dmarker = marker);
			
			if(smarker && dmarker)
			{
				routing(smarker.getGeometry().lat, smarker.getGeometry().lng, dmarker.getGeometry().lat, dmarker.getGeometry().lng);
			}
		}
	}

	var routing = function(startLat, startLon, destLat, destLon){
		var urlRoutingReq =
			["https://r.lbs.api.heremaps.jp/v1/calcroute?",
			 "app_id=",
			 app_id, 
			 "&app_code=",
			 app_code,
			 "&start=",
			 startLon,
			 ",",
			 startLat, 
			 "&destination=",
			 destLon,
			 ",",
			 destLat,
			 "&callback=routingCallback"
			].join("");
			
		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);
	}

	// parse the routing response
	var routingCallback = function (resp)
	{
		var strip = new H.geo.LineString(),
			shape = resp.shape,
			i,
			l = shape.length;

		for(i = 0; i < l; i++)
		{
			var curshapepoints = resp.shape[i].shapePoints,
				j = 0,
				spl = curshapepoints.length;
			for(; j < spl; j++)
			{
				strip.pushLatLngAlt(curshapepoints[j].lat, curshapepoints[j].lon, 0);
			}
		} 
		if(polyline){
			group.removeObject(polyline);
		}

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
		map.getViewModel().setLookAtData({
                bounds: group.getBoundingBox()
        });
	}

	
	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length  * 4 + 30 );
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length  * 4 + 80);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	};
	
	
	function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}