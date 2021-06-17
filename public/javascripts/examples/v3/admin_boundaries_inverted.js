/* 
	author dschutte
	(C) HERE 2016
*/

// Check whether the environment should use hi-res maps
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

var mapContainer = document.getElementById('mapContainer');

// Create a platform object to communicate with the HERE REST APIs
var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code, 
		useHTTPS: true
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	geocoder = platform.getGeocodingService(),
	mask = new H.map.Group(),
	polygons = new H.map.Group(),

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(mapContainer, maptypes.normal.map, {
		center: new H.geo.Point(50.15, 8.54),
		zoom: 12,
		pixelRatio: hidpi ? 2 : 1
	}),

	// Enable the map event system
	mapevents = new H.mapevents.MapEvents(map),
	
	// Enable map interaction (pan, zoom, pinch-to-zoom)
	behavior = new H.mapevents.Behavior(mapevents),

// Enable the default UI
ui = H.ui.UI.createDefault(map, maptypes);

//add JS API Release information
releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

//add MRS Release information
loadMRSVersionTxt();

//helper
var releaseGeocoderShown = false;		

// setup the Streetlevel imagery
platform.configure(H.map.render.panorama.RenderEngine);
	
window.addEventListener('resize', function() { map.getViewPort().resize(); });

map.addObject(mask);
map.addObject(polygons);

var reverseGeocode = function() 
{
	//add Geocoder Release information if not already done
	if (releaseGeocoderShown== false){
		loadGeocoderVersionTxt();
		releaseGeocoderShown = true;
	}

	geocoder.reverseGeocode(
		{
			prox:  50.1802815 + "," + 8.474503934 + "," + "100",
			mode: 'retrieveAddresses',
			'additionalData': 'IncludeShapeLevel,postalCode'
		},
		function(result) {
			revGeoReq = true;
			createPolygon(result);
		},
		function(error) {
				alert(error);
		}
	);
}
	
var geocode = function()
{
	//add Geocoder Release information if not already done
	if (releaseGeocoderShown== false){
		loadGeocoderVersionTxt();
		releaseGeocoderShown = true;
	}

	var searchText = document.getElementById("geoCode").value;		
	geocoder.geocode(
		{ 
			searchText: searchText,
			'additionalData': 'IncludeShapeLevel,default'
		},
		function(result) {
				createPolygon(result);
		},
		function(error) {
				alert(error);
		}
	);
};			
	
var createPolygon = function(result)
{
	mask.removeAll();
	polygons.removeAll();

	var pos = null,
		point = null,
		address = null,
		matchLevel = null;

	if(result.Response.View[0].Result[0].Location != null)
	{
		pos = result.Response.View[0].Result[0].Location.DisplayPosition;
		matchLevel = result.Response.View[0].Result[0].MatchLevel;
	}
	else
	{
		pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
	}

	point = new H.geo.Point(pos.Latitude, pos.Longitude);
		
	if(result.Response.View[0].Result[0].Location != null)
	{
		address = result.Response.View[0].Result[0].Location.Address;
		matchLevel = "Place";
	}
	else
	{
		address = result.Response.View[0].Result[0].Place.Locations[0].Address;		
	}				
	
	if (typeof(result.Response.View[0].Result[0].Location.Shape) != "undefined")
	{
		var shapes = new Array(),
			respShape = result.Response.View[0].Result[0].Location.Shape.Value;
				
		if(respShape.indexOf("MULTIPOLYGON") != -1)
		{
			shapes = respShape.replace("MULTIPOLYGON", "").trim().split("), (");
		}
		else
		{
			shapes[0] = respShape.replace("POLYGON", "").replace("((", "").replace("))", "").trim();
		}
				
		for (var j = 0; j < shapes.length; j++)
		{
			var strip = new H.geo.Strip(),
				newCoords = shapes[j].replace("(((", "").replace(")))", "").replace("((", "").replace("))", "").replace("(", "").replace(")", "").trim().split(",");

			for (var i = 0; i < newCoords.length; i++)
			{
				var split = newCoords[i].trim().split(" ");
				if(split.length === 2){
					var lat = parseFloat(split[1]),
						lon = parseFloat(split[0]);
					strip.pushLatLngAlt( lat, lon, 0);									
				}
			}

			var invertedPolygon = new InvertedPolygon(strip);
			
			//mask.addObject(invertedPolygon.mask);
			polygons.addObject(invertedPolygon.polygon);
		}
	}			
	map.setViewBounds(invertedPolygon.bounds);
};