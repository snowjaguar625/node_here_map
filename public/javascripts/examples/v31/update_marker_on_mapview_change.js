/**
	* author boris.guenebaut@here.com
	* (C) HERE 2019
	*/

	// array of colors that are mapped to zoom levels
	var arrColor = ['#0C0101', '#220202', '#320303', '#410505', '#520707',
		'#640909', '#7A0C0C', '#910F0F', '#AB0E0E', '#D21313', '#FC1111',
		'#9DA008', '#F4F80E', '#0EF82A', '#6ADB78', '#0C0101', '#220202',
		'#320303', '#410505', '#520707', '#640909', '#AB0E0E', '#D21313',
	'#FC1111', '#9DA008'];

	// create SVG markup for marker's icon
	var iconMarkup = '<svg style="left:-{{{LEFT}}}px;top:-{{{TOP}}}px;"' +
		'xmlns="http://www.w3.org/2000/svg" width="{{{WIDTH}}}px" height="{{{HEIGHT}}}px" >'
	+ '<g transform="scale({{{SCALE}}})"><path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 ' +
		'28 13 28 C 16.3 28 19 29.3 19 31 Z" fill="#000" fill-opacity=".2"></path>'
	+ '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 ' +
		'19.5 3.8 21.9 L 13 31 L 22.2 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 ' +
		'6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"></path>'
	+ '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L ' +
		'13 28.2 L 20.8 20.5 C 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 ' +
		'13 2.2 Z" fill="{{{COLOUR}}}"></path>'
	+ '<text transform="matrix( 1 0 0 1 13 18 )" x="0" y="0" fill-opacity="1" '
	+ 'fill="#fff" text-anchor="middle" '
	+ 'font-weight="bold" font-size="13px" font-family="arial">{{{ZOOM}}}</text></g></svg>';

	var map, marker;

	var lastZoom = 0;

	function updateMarker() {
		var zoom = Math.floor(map.getZoom());
		// change icon only when reached new zoomlevel
		if (lastZoom !== zoom) {
			var scale = zoom % 4 + 1;
			// update marker's icon
			marker.setIcon(new H.map.DomIcon(
				// set icon content and colour
				iconMarkup.replace('{{{COLOUR}}}', arrColor[zoom])
				.replace('{{{ZOOM}}}', zoom)
				.replace('{{{SCALE}}}', scale)
				.replace('{{{LEFT}}}', scale * 14)
				.replace('{{{TOP}}}', scale * 36)
				.replace("{{{WIDTH}}}", scale * 28)
				.replace("{{{HEIGHT}}}", scale * 36)
			));
			lastZoom = zoom;
		}
	}

	function addMarkerToMap(map) {
		// create DOM marker
		marker = new H.map.DomMarker({
			lat: 41.888,
			lng: -87.632
		});
		updateMarker();
		map.addObject(marker);
		// update marker when map zoom level changes
		map.addEventListener('mapviewchange', updateMarker);
	}

	/**
	* Boilerplate map initialization code starts below:
	*/
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// initialize communication with the platform
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	});

	var defaultLayers = platform.createDefaultLayers();

	// initialize a map
	var map = new H.Map(document.getElementById('mapContainer'),
	defaultLayers.vector.normal.map, {
		center: {
			lat: 41.888,
			lng: -87.632
		},
		zoom: 13,
		pixelRatio: window.devicePixelRatio || 1
	});

	// make the map interactive
	// MapEvents enables the event system
	// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
	var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));


	// Now use the map as required...
	addMarkerToMap(map);