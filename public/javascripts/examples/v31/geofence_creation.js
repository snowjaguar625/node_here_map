/* 
	author Mytyta
	(C) HERE 2016
    author asadovoy
    (C) HERE 2019 -> migrate to 3.1
*/


// check if the site was loaded via secure connection
var secure = (location.protocol === 'https:') ? true : false;

var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(),
	router = platform.getRoutingService(),
	
	map = new H.Map(mapContainer, maptypes.vector.normal.map, 
		{
			center: new H.geo.Point(50.04614777739499, 8.613584243471905),
			zoom: zoom,
			pixelRatio: window.devicePixelRatio || 1
		}
	);
	
	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
	
	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	function calculateRoute()
	{
		var calculateRouteParams = {
		
			'waypoint0' : '50.16193,8.53361',
			'waypoint1' : '50.06436,8.37443',
			'mode': 'fastest;car;traffic:disabled',
			'representation': 'display'
		},
		onResult = function(result) {
			var strip = new H.geo.LineString(),
				shape = result.response.route[0].shape, 
				i,
				l = shape.length,
				pathGeo = [];
		
			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				pathGeo.push([shape[i].split(',').map(function(item) { return parseFloat(item); })[0], shape[i].split(',').map(function(item) { return parseFloat(item); })[1]]);
			}
			
			var polyline = new H.map.Polyline(strip, 
			{
				style: 
				{
					lineWidth: 10,
					strokeColor: "rgba(0, 255, 0, 1)"
				}	
			});
			map.addObject(polyline);
			
			
			var distance =  0.01,
				geoInput = {
					type: "LineString",
					coordinates: pathGeo
			};
			
			var geoReader = new jsts.io.GeoJSONReader(),
				geometry = geoReader.read(geoInput).buffer(distance),
				geoWriter = new jsts.io.WKTWriter(),
				polygon = geoWriter.write(geometry),
				shapes = polygon.replace("POLYGON", "").trim().split("),(");

				var strip = new H.geo.LineString(),
					newCoords = shapes[0].replace("(((", "").replace(")))", "").replace("((", "").replace("))", "").replace("(", "").replace(")", "").trim().split(",");
					
				for (var i = 0; i < newCoords.length; i++)
				{
					var split = newCoords[i].trim().split(" ");
					if(split.length === 2){
						var lat = parseFloat(split[0]);
						var lon = parseFloat(split[1]);
						strip.pushLatLngAlt( lat, lon, 0);
					}
				}
		
				var poly = new H.map.Polygon(strip, 
				{
					style:
					{
						lineWidth: 5,
						strokeColor: "rgba(50, 128, 128, 0.5)"
					}
				});
				map.addObject(poly);
				map.getViewModel().setLookAtData({
					bounds: poly.getBoundingBox()
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