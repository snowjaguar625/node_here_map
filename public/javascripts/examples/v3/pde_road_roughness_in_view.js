/*
		author domschuette
		(C) HERE 2017
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Initialize our map
	var platform = new H.service.Platform(
		{	
			app_code: app_code,	
			app_id: app_id,	
			useHTTPS: secure 
		}),
	    maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		map = new H.Map(
			document.getElementById("mapContainer"), 
			maptypes.normal.map, 
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
	var PDE_ENDPOINT = (secure ? ('https') : ('http') )+ '://pde.api.here.com',
		drivingSidesByIsoCountryCode = {};
	
	// First we load country static layer where we have information about driving side (relevant for rendering).
	var url = PDE_ENDPOINT + '/1/static.json?content=COUNTRY&cols=DRIVING_SIDE;ISO_COUNTRY_CODE&app_id=' + app_id + '&app_code=' + app_code;

	var req = new XMLHttpRequest();
	req.open('GET', url);
	req.onreadystatechange = function() {
		if (req.readyState == 4 && req.status == 200)
		{
			var resp = JSON.parse(req.responseText);
			resp.Rows.forEach(function (c) {
				drivingSidesByIsoCountryCode[c.ISO_COUNTRY_CODE] = c.DRIVING_SIDE;
			});
			initRRLayer();
		}
	};
	req.send( null );

	// 2nd create PDE Road Roughness Layers and display
	function initRRLayer()
	{
		for (var fc = 1; fc <= 5; fc++) 
		{
			var RRLayer = 'ROAD_ROUGHNESS_FC' + fc,
				linkAttributeLayer = 'LINK_ATTRIBUTE_FC' + fc;
			
			var layer = new H.map.layer.ObjectLayer(createPdeObjectProvider(map, {
				min: 11 + fc,
				layer: 'ROAD_GEOM_FC' + fc,
			  
				dataLayers: [
					{layer: RRLayer},
					{layer: linkAttributeLayer, cols: ['LINK_ID', 'ISO_COUNTRY_CODE', 'TRAVEL_DIRECTION']}
				],
				level: 8 + fc,
				postProcess: splitMultiDigitized.bind(null, fc),
				tap: showBubble.bind(null, fc),
				polylineStyle: RRBasedStyle.bind(null, fc)
			}));
			map.addLayer(layer);
		}

		function splitMultiDigitized(fc, strip, data)
		{
			function shift(strip, dist)
			{
				var shifted = new H.geo.Strip(),
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
		
		function RRBasedStyle(fc, data) 
		{
			var rrLayer = 'ROAD_ROUGHNESS_FC' + fc;
			var rrData = data[rrLayer];
			if(!rrData) 
				return null;

			var rrCat,
				fromRefRRCat = parseInt(rrData.FROM_AVG_ROUGHN_CAT) || null,
				toRefRRCat = parseInt(rrData.FROM_AVG_ROUGHN_CAT) || null;
				
			if (data.processedKey === 'single')
			{
				rrCat = (fromRefRRCat && toRefRRCat) ? (fromRefRRCat + toRefRRCat) / 2 : (fromRefRRCat || toRefRRCat);
			}
			else if (data.processedKey === 'fromRef')
			{
				rrCat = fromRefRRCat;
			}
			else if (data.processedKey === 'toRef')
			{
				rrCat = toRefRRCat;
			}

			if (rrCat === null)
				return null;

			if (rrCat < 0)
				return null;
			var color = '#61ba72';
			if (rrCat == 2) color = '#fecf00';
			if (rrCat == 3) color = '#ea232d';
			
			return {
				strokeColor: color,
				lineWidth: 6 - fc
			}
		}
		
		function showBubble(fc, e, data) 
		{
			var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			var rrLayer = 'ROAD_ROUGHNESS_FC' + fc;
			var content = (
				'<table class="rr-record">' +
					'<tr><td>LINK_ID</td><td>{linkId}</td></tr>' +
					'<tr><td>FROM_AVG_ROUGHN_CAT</td><td>{fromAVGCat}</td></tr>' +
					'<tr><td>TO_AVG_ROUGHN_CAT</td><td>{toAVGCat}</td></tr>' +
					'<tr><td>FROM_AVAILABLE_ROUGHN_TYP</td><td>{fromType}</td></tr>' +
					'<tr><td>TO_AVAILABLE_ROUGHN_TYP</td><td>{toType}</td></tr>' +
					'<tr><td>FROM_AVG_IRI</td><td>{fromIRI}</td></tr>' +
					'<tr><td>TO_AVG_IRI</td><td>{toIRI}</td></tr>' +
					
				'</table>' +
				'<a target="_blank" class="rr-record" href="https://tcs.ext.here.com/pde/layer?region=TSRWORLD&release=LATEST&url_root={pdeRoot}&layer=ROAD_ROUGHNESS_FC{fc}">Read PDE layer documentation for details</a>')
				.replace('{linkId}', data[rrLayer].LINK_ID)
				.replace('{fromAVGCat}', getCategoryDescription(data[rrLayer].FROM_AVG_ROUGHN_CAT) || 'n/a')
				.replace('{toAVGCat}', getCategoryDescription(data[rrLayer].TO_AVG_ROUGHN_CAT) || 'n/a')
				.replace('{fromType}', getRoughnessType(data[rrLayer].FROM_AVAILABLE_ROUGHN_TYP) || 'n/a')
				.replace('{toType}', getRoughnessType(data[rrLayer].TO_AVAILABLE_ROUGHN_TYP) || 'n/a')
				.replace('{fromIRI}', data[rrLayer].FROM_AVG_IRI || 'n/a')
				.replace('{toIRI}', data[rrLayer].TO_AVG_IRI || 'n/a')
				.replace('{pdeRoot}', PDE_ENDPOINT.replace('http://', '').replace('https://', ''))
				.replace('{fc}', fc);
			bubble.setPosition(p);
			bubble.setContent(content);
			bubble.open();
		}
		
		function getCategoryDescription(cat)
		{
			var t = cat; 
			if(cat == 1)
				t += " - Good";
			else if(cat == 2)
				t += " - Fair";
			else if(cat == 3)
				t += " - Poor";
			return t || null;
		}
		
		function getRoughnessType(type)
		{
			var t = type; 
			if(type == 1)
				t += " - Bump";
			else if(type == 2)
				t += " - Dip";
			return t || null;
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