$(function(){
    /*
	author domschuette
	(C) HERE 2019
	*/

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	var platform = new H.service.Platform({
			useHTTPS: secure,
			apikey: api_key
		}),
		defaultLayers = platform.createDefaultLayers(),
		router = platform.getRoutingService(),

		map = new H.Map(mapContainer, defaultLayers.vector.normal.map,
			{
				center: center,
				zoom: zoom,
				pixelRatio: window.devicePixelRatio || 1
			}
		);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	function calculateRoute()
	{
		var calculateRouteParams = {

			'waypoint0' : '52.516222,13.388900',
			'waypoint1' : '52.517175,13.395129',
			'mode': 'fastest;car;traffic:disabled',
			'representation': 'display'
		},
		onResult = function(result) {
			var lineString = new H.geo.LineString(),
				routeShape = result.response.route[0].shape,
				polyline;

			routeShape.forEach(function(point) {
				var parts = point.split(',');
				lineString.pushLatLngAlt(parts[0], parts[1]);
			});

			var polyline = new H.map.Polyline(lineString,
				{
					style:
					{
						lineWidth: 10,
						strokeColor: "rgba(0, 128, 0, 0.7)"
					}
				});

			map.addObject(polyline);
			map.getViewModel().setLookAtData({
				tilt: 45,
				bounds: polyline.getBoundingBox()
			});
		},
		onError = function(error) {
			console.log(error);
		}
		router.calculateRoute(calculateRouteParams, onResult, onError);
	}

	var displayReady = function(e)
	{
		map.removeEventListener("mapviewchangeend", displayReady);
		calculateRoute();
	};

	map.addEventListener("mapviewchangeend", displayReady);
    
})
	
