$(function(){
    /*
	author Mykyta
	(C) HERE 2019
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);	

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
			useHTTPS: secure,
			apikey: api_key
		}),
		currentBubble,
		defaultLayers = platform.createDefaultLayers(),
		requestCount = 0;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.vector.normal.map, {
		center: center,
		zoom: 5,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	var projection = new H.geo.PixelProjection();
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// groups for zoom levels 4 - 10
	groups =
	{
		4 : new H.map.Group(),
		5 : new H.map.Group(),
		6 : new H.map.Group(),
		7 : new H.map.Group(),
		8 : new H.map.Group(),
		9 : new H.map.Group(),
		10: new H.map.Group()
	};

	// group for zoom levels > 10
	iconsGroup = new H.map.Group();

	map.addEventListener("mapviewchangeend", function (event) {
		requestWeather();
	});

	function requestWeather ()
	{
		Spinner.showSpinner();
		
		zoom = map.getZoom();

		i = 10;
		while(i > zoom && i > 4)
		{
			try
			{
				group = groups[i];
				i--;
				// map.removeObject(iconsGroup);
				map.removeObject(group);

			}
			catch(ex){}
		}

		if(zoom > 3 && zoom < 11)
		{
			requestWeatherViaName(zoom);
		}
		else if(zoom > 10)
			requestWeatherViaLatLon()
	}

	function requestWeatherViaName(zoom)
	{
		group = groups[zoom];
		group.removeAll();
		if(group.getObjects().length == 0)
		{
			var arr = levels[zoom],
				bbox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		
			for(n = 0; n < arr.length; n++)
			{
				var curPoint = new H.geo.Point(arr[n].Latitude, arr[n].Longitude);
				if(bbox.containsPoint(curPoint))
				{
					requestCount++;
					document.cookie = "";
					var url = [
						"https://tcs.it.here.com/Proxy?",
						"https://weather.cc.api.here.com/weather/",
						"1.0/",
						"report.json?",
						"name=",
						arr[n].name,
						"&",
						"product=observation",
						"&",
						"oneobservation=true",
						"&",
						"app_id=",
						app_id,
						"&",
						"app_code=",
						app_code,
						"&",
						"jsonpCallback=",
						jsonp(parseWeather, zoom)
					].join("");

					script = document.createElement("script");
					script.src = url;
					document.body.appendChild(script);
				}
			}
			if(requestCount == 0)
				Spinner.hideSpinner();
		}
		else
		{
			map.addObject(group);
		}
	}

	function requestWeatherViaLatLon()
	{
		var coords = getCenterCoordinates();
		iconsGroup.removeAll();
		requestCount = coords.length;
		
		for(var i in coords)
		{
			document.cookie = "";
			var coordinate = coords[i],
				url = [
					"https://tcs.it.here.com/Proxy?",
					"https://weather.cc.api.here.com/weather/",
					"1.0/",
					"report.json?",
					"latitude=",
					coordinate.lat,
					"&",
					"longitude=",
					coordinate.lng,
					"&",
					"product=observation",
					"&",
					"app_id=",
					app_id,
					"&",
					"app_code=",
					app_code,
					"&",
					"jsonpCallback=parseWeather"
				].join("");

			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
		}
	}

	var parseWeather = function(data, zoom)
	{
		requestCount--;
		group = null;
		if(zoom)
		{
			group = groups[zoom];
		}
		else
		{
			group = iconsGroup;
		}

		if(data && data.observations && data.observations.location)
		{
			var locations = data.observations.location;
			document.cookie = "";
			for (i = 0; i < locations.length; i++)
			{
				obj = locations[i];
				point = new H.geo.Point(obj.latitude, obj.longitude);
				observation = obj.observation[0];
				iconUrl = observation.iconLink;

				if(iconUrl.indexOf("no_report") === -1)
				{
					var icon = new H.map.Icon(iconUrl, { anchor: {x: 25, y: 25}});
					var marker = new H.map.Marker(
					point,
					{
						icon: icon
					});

					var str = '<h3>' + obj.city + '</h3></br>';
					str += '<p style="font-family:Arial,sans-serif; font-size:10px;">';
				
					if(observation.description)
						str += observation.description + '</br>';
					if(observation.temperature)
						str += "Temp: " + observation.temperature + '</br>';
					if(observation.daylight)
						str += "Daylight" + observation.daylight + '</br>';
					if(observation.skyInfo)
						str += "SkyInfo: " + observation.skyInfo + '</br>';
					if(observation.skyDescription)
						str += "SkyDescription: " + observation.skyDescription + '</br>';
					if(observation.temperatureDesc)
						str += "TemperatureDesc: " + observation.temperatureDesc + '</br>';
					if(observation.comfort)
						str += "Comfort: " + observation.comfort + '</br>';
					if(observation.highTemperature)
						str += "HighTemperature: " + observation.highTemperature + '</br>';
					if(observation.lowTemperature)
						str += "LowTemperature: " + observation.lowTemperature + '</br>';
					if(observation.humidity)
						str += "Humidity: " + observation.humidity + '</br>';
					if(observation.dewPoint)
						str += "DewPoint: " + observation.dewPoint + '</br>';
					if(observation.precipitation1H)
						str += "Precipitation1H: " + observation.precipitation1H + '</br>';
					if(observation.precipitation3H)
						str += "Precipitation3H: " + observation.precipitation3H + '</br>';
					if(observation.precipitation16)
						str += "Precipitation6H: " + observation.precipitation6H + '</br>';
					if(observation.precipitation12H)
						str += "Precipitation12H: " + observation.precipitation12H + '</br>';
					if(observation.precipitation24H)
						str += "Precipitation24H: " + observation.precipitation24H + '</br>';
					if(observation.precipitationDesc)
						str += "PrecipitationDesc: " + observation.precipitationDesc + '</br>';
					if(observation.airInfo)
						str += "AirInfo: " + observation.airInfo + '</br>';
					if(observation.airDescription)
						str += "AirDescription: " + observation.airDescription + '</br>';
					if(observation.windSpeed)
						str += "WindSpeed: " + observation.windSpeed + '</br>';
					if(observation.windDirection)
						str += "WindDirection: " + observation.windDirection + '</br>';
					if(observation.windDesc)
						str += "WindDesc: " + observation.windDesc + '</br>';
					if(observation.windDescShort)
						str += "WindDescShort: " + observation.windDescShort + '</br>';
					if(observation.barometerPressure)
						str += "BarometerPressure: " + observation.barometerPressure + '</br>';
					if(observation.barometerTrend)
						str += "BarometerTrend: " + observation.barometerTrend + '</br>';
					if(observation.visibility)
						str += "Visibility: " + observation.visibility + '</br>';
					if(observation.snowCover)
						str += "SnowCover: " + observation.snowCover + '</br>';
					if(observation.ageMinutes)
						str += "AgeMinutes: " + observation.ageMinutes + '</br>';
					if(observation.activeAlerts)
						str += "ActiveAlerts: " + observation.activeAlerts + '</br>';

					marker.$html = str;

					marker.addEventListener("pointerdown", function(e)
						{
							if(currentBubble)
								ui.removeBubble(currentBubble);
							var html = '<img src="' + e.target.getIcon().getBitmap().toDataURL() + '">';
							html += e.target.$html;
							currentBubble = new H.ui.InfoBubble(e.target.getGeometry(), { content: html });
							ui.addBubble(currentBubble);

						}
					);
					group.addObject(marker);
				}
			}
		}
		map.addObject(group);
		if(requestCount == 0)
			Spinner.hideSpinner();
	}
	

	function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}

	function getCenterCoordinates()
	{
		var bounds = map.getViewModel().getLookAtData().bounds.getBoundingBox(),
			boundingBoxes = [],
			boundsNeLatLng = new H.geo.Point(bounds.getTop(), bounds.getRight()),// bounds.getNorthEast(),
			boundsSwLatLng = new H.geo.Point(bounds.getBottom(), bounds.getLeft()),
			boundsNwLatLng = new H.geo.Point(boundsNeLatLng.lat, boundsSwLatLng.lng),
			boundsSeLatLng = new H.geo.Point(boundsSwLatLng.lat, boundsNeLatLng.lng),
			zoom = map.getZoom(),
			tiles = [],
			tileCoordinateNw = pointToTile(boundsNwLatLng, zoom),
			tileCoordinateSe = pointToTile(boundsSeLatLng, zoom),
			tileColumns = tileCoordinateSe.x - tileCoordinateNw.x + 1;
			tileRows = tileCoordinateSe.y - tileCoordinateNw.y + 1;
			zfactor = Math.pow(2, zoom),
			minX = tileCoordinateNw.x,
			minY = tileCoordinateNw.y,
			coords = new Array();

		while (tileRows--) {
			while (tileColumns--) {
				tiles.push({
					x: minX + tileColumns,
					y: minY
				});
			}
			minY++;
			tileColumns = tileCoordinateSe.x - tileCoordinateNw.x + 1;
		}

		$.each(tiles, function(i, v) {
			boundingBoxes.push({
				ne: projection.pixelToGeo(new H.math.Point(v.x * (hidpi ? 512 : 256) / zfactor, v.y * (hidpi ? 512 : 256) / zfactor)),
				sw: projection.pixelToGeo(new H.math.Point((v.x + 1) * (hidpi ? 512 : 256) / zfactor, (v.y + 1) * (hidpi ? 512 : 256) / zfactor))
			});
		});
			
		$.each(boundingBoxes, function(i, v) {
			var lineString = new H.geo.LineString();
			lineString.pushPoint(v.ne);
			lineString.pushPoint(new H.geo.Point(v.sw.lat, v.ne.lng));
			lineString.pushPoint(v.sw);
			lineString.pushPoint(new H.geo.Point(v.ne.lat, v.sw.lng));
			
			var poly = new H.map.Polygon(lineString, {
				style: {
					fillColor: 'rgba(123,0,23,0.5)',
					strokeColor: '#829',
					lineWidth: 1
				}
			});
		
			var center = new H.geo.Rect(v.ne.lat, v.ne.lng, v.sw.lat, v.sw.lng).getCenter();
			
			coords.push(center);
		});
		return coords;
	}
	
	function pointToTile(latLng, z)
	{
		var worldCoordinate = projection.geoToPixel(latLng);
		var pixelCoordinate = new H.math.Point(worldCoordinate.x * Math.pow(2, z), worldCoordinate.y * Math.pow(2, z));
		var tileCoordinate = new H.math.Point(Math.floor(pixelCoordinate.x / (hidpi ? 512 : 256)), Math.floor(pixelCoordinate.y / (hidpi ? 512 : 256)));
		return tileCoordinate;
	};
})