/*
	(C) HERE 2020
	*/
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	api_key = getUrlParameter( 'apikey' );
		
	
	if(api_key == null){
		api_key = api_key_jp;
	}
	
	
	//const domainConfig = {};
	const getoptions = {
		  apikey: api_key
	};
	
	// Japan Vector Tile service /core instead of /base
	/*domainConfig[H.service.omv.Service.CONFIG_KEY] = {
		  baseUrl: new H.service.Url(
			'https', 'vector.hereapi.com', 'v2/vectortiles/core/mc', getoptions
		  ),
		  subdomain: null // optional, if subdomain is not needed null must be passed
    };*/
	
	// Create an instamce of the platform
		var platform = new H.service.Platform({
		  apikey: api_key/*,
		  servicesConfig: domainConfig*/
        });
        var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
        var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
        // create a Japan specific style
        var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

        // instantiate provider and layer for the basemap
        var omvProvider = new H.service.omv.Provider(omvService, style);
        var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

		var defaultLayers = platform.createDefaultLayers();
		
		// Instantiate a map in the 'map' div, set the base map to normal
		var map = new H.Map(document.getElementById('mapContainer'), omvlayer, {
			center: new H.geo.Point(35.68066, 139.8355),
			zoom: zoom,
			pixelRatio: hidpi ? 2 : 1
        });
        
        // Create the default UI components
        var ui = new H.ui.UI(map, {
            mapsettings: {
                layers: [
                    {
                        label: "Satellite",
                        layer: defaultLayers.raster.satellite.map
                    }
                ]
            },
            zoom: true,
            scalebar: true,
            zoomrectangle: true,
            distancemeasurement: true,
            unitSystem: H.ui.UnitSystem.METRIC
        });
	
	// do i need this ?!?
	var
		geocoder = platform.getSearchService(),
		router = platform.getRoutingService(null, 8),
		group = new H.map.Group(),
		polyline;
		

	
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
	geocode = function(term, start)
	{
		var arg = {start: (start ? "start" : "dest"), term: term};
		geocoder.geocode(
			{
				q: term,
			},
			function(result) {
				var item = result.items[0],
					pos = item.position,
					label = item.address.label;

				var lat = pos.lat;
				var lon = pos.lng;
				
				var start =  arg.start == "start" ? true : false;
				
				marker = start ? smarker : dmarker;
				if(marker)
				{
					group.removeObject(marker);
					marker = null;
				}
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

			},
			function(error) {
				alert(error);
			}
		);
	};


	
	

	var routing = function(startLat, startLon, destLat, destLon){
		var routeRequestParams = {
			routingMode: 'fast',
			transportMode: 'car',
			origin: [startLat, startLon].join(","),
			destination: [destLat, destLon].join(","),
			return: 'polyline,turnByTurnActions,actions,instructions,travelSummary'
		};

		router.calculateRoute(
			routeRequestParams,
			routingCallback,
			function(error) {
				alert(error);
			}
		);
	}


	// parse the routing response
	var routingCallback = function (resp)
	{
		var route = resp.routes[0];

		addRouteShapeToMap(route)
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

var polylines = [];

/**
 * Creates a H.map.Polyline from the shape of the route and adds it to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
	function addRouteShapeToMap(route){
			polylines.forEach((p) => {
				try {
					map.removeObject(p);
				} catch (error) {}
			});
			polylines = [];
		var linestring = []
		route.sections.forEach((section) => {
			// decode LineString from the flexible polyline
			linestring = [...linestring, ...H.geo.LineString.fromFlexiblePolyline(section.polyline).getLatLngAltArray()];
		});
		// Create a polyline to display the route:
		polyline = new H.map.Polyline( new H.geo.LineString(linestring), {
		style: {
			lineWidth: 4,
			strokeColor: 'rgba(0, 128, 255, 0.7)'
		}
		});
		// Add the polyline to the map
		map.addObject(polyline);
		polylines.push(polyline);
		// And zoom to its bounding rectangle
		map.getViewModel().setLookAtData({
			bounds: polyline.getBoundingBox()
		});
	}
	
	
	/*function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}*/