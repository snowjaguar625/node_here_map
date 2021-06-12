/*
		(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Initialize our map
	var platform = new H.service.Platform(
		{	
			apikey: api_key,
			useHTTPS: secure
		}),
	    maptypes = platform.createDefaultLayers(),
		map = new H.Map(
			document.getElementById("mapContainer"), 
			maptypes.vector.normal.map, 
			{ 
				center: center, 
				zoom: 12, 
				pixelRatio: hidpi ? 2 : 1
			});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	// current info bubble
    var bubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
    bubble.close();
    ui.addBubble(bubble);

	// PDE Endpoint HERE:
		// new PDE Endpoint HERE has only https 
	var PDE_ENDPOINT = 'https://s.fleet.ls.hereapi.com',
		drivingSidesByIsoCountryCode = {},
		marker = null,
		layer;
	
	// First we load country static layer where we have information about driving side (relevant for rendering).
	var url = PDE_ENDPOINT + '/1/static.json?content=COUNTRY&cols=DRIVING_SIDE;ISO_COUNTRY_CODE&apiKey=' + api_key

	var req = new XMLHttpRequest();
	req.open('GET', url);
	req.onreadystatechange = function() {
		if (req.readyState == 4 && req.status == 200)
		{
			var resp = JSON.parse(req.responseText);
			resp.Rows.forEach(function (c) {
				drivingSidesByIsoCountryCode[c.ISO_COUNTRY_CODE] = c.DRIVING_SIDE;
			});
			initVSLayer();
		}
	};
	req.send( null );

	// 2nd create PDE Road Roughness Layers and display
	function initVSLayer()
	{
		for (var fc = 1; fc <= 5; fc++) 
		{
			var VSLayer = 'SPEED_LIMITS_VAR_FC' + fc,
				linkAttributeLayer = 'LINK_ATTRIBUTE_FC' + fc;
			
			layer = new H.map.layer.ObjectLayer(createPdeObjectProvider(map, {
				min: 11 + fc,
				layer: 'ROAD_GEOM_FC' + fc,
			  
				dataLayers: [
					{layer: VSLayer},
					{layer: linkAttributeLayer, cols: ['LINK_ID', 'ISO_COUNTRY_CODE', 'TRAVEL_DIRECTION']}
				],
				level: 8 + fc,
				postProcess: splitMultiDigitized.bind(null, fc),
				tap: showBubble.bind(null, fc),
				polylineStyle: vsBasedStyle.bind(null, fc)
			}));
			map.addLayer(layer);
			
			/*required in JS 3.1 to trigger spatial requests*/
			requestSpatial(layer,map);
		}

		function splitMultiDigitized(fc, strip, data)
		{
			function shift(strip, dist)
			{
				var shifted = new H.geo.LineString(),
					lastShifted,
					i = 0,
					pc = strip.getPointCount();
				
				for (; i < pc - 1; i++)
				{
					var p0 = strip.extractPoint(i),
						p1 = strip.extractPoint(i + 1);

					var bearing = p0.bearing(p1) + 90,
						p0shifted = p0.walk(bearing, dist);
		  
					if (lastShifted)
					{
						p0shifted =p0shifted.walk(p0shifted.bearing(lastShifted), p0shifted.distance(lastShifted) / 2);
					}

					shifted.pushPoint(p0shifted);
					lastShifted = p1.walk(bearing, dist);
					if (i + 1 === strip.getPointCount() - 1)
					{
						shifted.pushPoint(lastShifted);
					}
				}
				return shifted;
			}

			var travelDirection = data['LINK_ATTRIBUTE_FC' + fc].TRAVEL_DIRECTION;
			var drivingSide = drivingSidesByIsoCountryCode[data['LINK_ATTRIBUTE_FC' + fc].ISO_COUNTRY_CODE] || 'R';
			var fromRefDist = drivingSide === 'R' ? 4 : -4;
			if (travelDirection === 'B')
				return { fromRef: shift(strip, fromRefDist), toRef: shift(strip, -fromRefDist)};
			else if (travelDirection === 'F')
				return {single: shift(strip, fromRefDist)};
			else if (travelDirection === 'T')
				return {single: shift(strip, -fromRefDist)};
		}
		
		function vsBasedStyle(fc, data) 
		{
			var vsLayer = 'SPEED_LIMITS_VAR_FC' + fc;
			var vsData = data[vsLayer];
			if(!vsData) 
				return null;
			
			return {
				strokeColor: '#ea232d',
				lineWidth: 6 - fc
			}
		}
		
		function showBubble(fc, e, data) 
		{
			var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			var vsLayer = 'SPEED_LIMITS_VAR_FC' + fc,
				geomLayer = 'ROAD_GEOM_FC' + fc;
			
			var LINK_ID = data[vsLayer].LINK_ID,
				lat = data[geomLayer].LAT.split(',')[0] / 100000,
				lng = data[geomLayer].LON.split(',')[0] / 100000,
				mPos = new H.geo.Point(lat, lng);
			
			var content = (
				'<table class="rr-record">' +
					'<tr><td>FC</td><td>{fc}</td></tr>' +
					'<tr><td>LINK_ID</td><td>{linkId}</td></tr>' +
					'<tr><td>CONDITION_ID</td><td>{condID}</td></tr>' +
					'<tr><td>DATE_TIMES</td><td>{datetime}</td></tr>' +
					'<tr><td>DIRECTION</td><td>{dir}</td></tr>' +
					'<tr><td>TIME_OVERRIDE</td><td>{tOverride}</td></tr>' +
					'<tr><td>VARIABLE_SPEED_SIGN_LOCATION</td><td>{vssloc}</td></tr>' +
					'<tr><td>VEHICLE_TYPES</td><td>{vTypes}</td></tr>' +
					'<tr><td>VSS_ID</td><td>{id}</td></tr>' +
				'</table>' +
				'<a target="_blank" class="rr-record" href="https://tcs.ext.here.com/pde/layer?region=TSRWORLD&release=LATEST&url_root={pdeRoot}&layer=SPEED_LIMITS_VAR_FC{fc}">Read PDE layer documentation for details</a>')
				
				.replace('{linkId}', LINK_ID)
				.replace('{condID}', data[vsLayer].CONDITION_ID || 'n/a')
				.replace('{datetime}', data[vsLayer].DATE_TIMES || 'n/a')
				.replace('{dir}', data[vsLayer].DIRECTION || 'n/a')
				.replace('{tOverride}', data[vsLayer].TIME_OVERRIDE || 'n/a')
				.replace('{vssloc}', data[vsLayer].VARIABLE_SPEED_SIGN_LOCATION || 'n/a')
				.replace('{vTypes}', data[vsLayer].VEHICLE_TYPES || 'n/a')
				.replace('{id}', data[vsLayer].VSS_ID || 'n/a')
				.replace('{pdeRoot}', PDE_ENDPOINT.replace('http://', '').replace('https://', ''))
				.replace('{fc}', fc);
			bubble.setPosition(p);
			bubble.setContent(content);
			bubble.open();
			
			if(marker)
			{
				try
				{
					map.removeObject(marker);
					marker = null;
				}catch(e) {}
			}
			marker = new H.map.Marker(mPos); 
			map.addObject(marker); 
		}
	}
	
	// Helper function to get the bearing from a this to given point
	H.geo.Point.prototype.bearing = function (to)
	{
		'use strict';

		var lngTo = to.lng * (Math.PI / 180);
		var lngFrom = this.lng * (Math.PI / 180);
		var latTo = to.lat * (Math.PI / 180);
		var latFrom = this.lat * (Math.PI / 180);

		var lngDelta = (lngTo - lngFrom);
		var y = Math.sin(lngDelta) * Math.cos(latTo);
		var x = Math.cos(latFrom) * Math.sin(latTo) - Math.sin(latFrom) * Math.cos(latTo) * Math.cos(lngDelta);
		var brng = Math.atan2(y, x);
		return (brng >= 0 ? brng : (2 * Math.PI + brng)) * (180 / Math.PI);
	};
	
		/**
	* Function triggers spatial layer requests explicitly
	*/
	function requestSpatial(layer,map){
		var boundingBox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		var zoom = map.getZoom();
		layer.getProvider().requestSpatials(boundingBox,zoom,true,false);
	}
	
	/*required in JS 3.1 to trigger spatial requests*/
	map.addEventListener("mapviewchangeend",function(){
		requestSpatial(layer,map);
	})