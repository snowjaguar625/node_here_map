/*
	author domschuette
    (C) HERE 2019
    Alexander Sadovoy
    (C) HERE 2021
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key_jp
	}),
	defaultLayers = platform.createDefaultLayers();
	geocoder = platform.getSearchService();
    

    var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    center = new H.geo.Point(35.68066, 139.8355);

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), omvlayer, {
		center: center,
		zoom: zoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers),
	group = new H.map.Group(),

	reverseGeocode = function() {
		geocoder.reverseGeocode({
			at: [35.68066, 139.8355].join(","),
			limit: 5
			//mode: "retrieveAddresses",
			//requestId: "TESTREQUEST"
		},
		function(result)
		{
			console.log("result:", result);
			var items = result.items;
			for (i = 0; i < items.length; i++)
			{
				pos = items[i].position;
				point = new H.geo.Point(pos.lat, pos.lng);
				address = items[i].address;

				block = address.block || "";
				subblock = address.subblock || "";
				street = address.street != undefined ? address.street : "";
				housenumber = address.houseNumber || "";
				zip = address.postalCode != undefined ? address.postalCode : "";
				city = address.city != undefined ? address.city : "";

				line1 = [street, block, subblock, housenumber].join(" ");
				line2 = [zip, city].join("");

				marker = new H.map.Marker(point,
					{
						icon: createIcon(i + ": " + line1, line2)
					});

					group.addObject(marker);
			}
			map.addObject(group);
			map.getViewModel().setLookAtData({
				tilt: 45,
				bounds: group.getBoundingBox()
			});
		},
		function(error)
		{
			alert(error);
		}
		);
	}

	geocode = function()
	{
		geocoder.geocode(
			{
				q: "〒136-0073 東京都江東区北砂6丁目2", //2 Kitasuna 6-chome, Koto-ku, Tokyo, 136-0073 Japan
			},
			function(result) {
				var item = result.items[0]
				pos = item.position
				point = new H.geo.Point(pos.lat, pos.lng);

				line1 = pos.lat + " " + pos.lng;
				line2 = item.resultType;

				marker = new H.map.Marker(point,
					{
						icon: createIcon(line1, line2)
					});
					map.addObject(marker);
					map.setCenter(point);
					map.setZoom(18);
			},
			function(error) {
				alert(error);
			}
		);
	},

	createIcon = function (line1, line2) {
		var div = document.createElement("div");

		var div = document.createElement("div");
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line1.length  * 4 + 57);
		svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 4 + 120);
		div.innerHTML = svgMarker;

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	};