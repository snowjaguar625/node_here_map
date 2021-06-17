/*
	author domschuette
	(C) HERE 2015
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	maptileService = platform.getMapTileService({'type': 'base'}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	destination,
	shapegroup,
	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: zoom
		}
	);
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		sh = lastClickedPos.lat + "," + lastClickedPos.lng;
		document.getElementById("start").value = sh;
		geocode(sh);
	}

	var createMarkerIcon = function (color)
	{
		var div = document.createElement("div");
		var img = '<img src="/assets/icons/marker_' + color + '.png" />';

		div.innerHTML = img;

		return new H.map.DomIcon(div, {
			width: 16,
			height: 16,
			anchorX: 8,
			anchorY: 16,
			drawable: false
		})
	};

	addMarkerToPosition = function(pos)
	{
		destination = pos;
		marker = new H.map.DomMarker(destination,
			{
				icon: createMarkerIcon("red")
			});
			map.addObject(marker);
			map.setCenter(destination);
			map.setZoom(16);
	}

	// do a Geocode
	geocode = function(term)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geoUrl = [
			"http", 
			secure ? "s" : "", 
			"://geocoder.api.here.com/6.2/search.json?",
			"searchtext=",
			term,
			"&maxresults=1",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=",
			"geocallback"
			].join("");

			script = document.createElement("script");
			script.src = geoUrl;
			document.body.appendChild(script);
	}

	geocallback = function(result)
	{
		if(result.Response.View[0].Result[0].Location != null)
		{
			pos = result.Response.View[0].Result[0].Location.DisplayPosition;
		}
		else
		{
			pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
		}

		destination = new H.geo.Point(pos.Latitude, pos.Longitude);
		addMarkerToPosition(destination);
		calculateReverseFlow(document.getElementById("rangevalue").value);
	}

	var calculateReverseFlow = function(rangeValue)
	{
		if(destination === undefined)
		{
			document.getElementById('start').value = map.getCenter().lat + "," + map.getCenter().lng;
			addMarkerToPosition(map.getCenter());
		}

		var rangeType = document.getElementById("rangetype").value;

		routeUrl = [
			"https://isoline.route.api.here.com/",
			"routing/",
			"7.2/",
			"calculateisoline.json?",
			"destination=",
			destination.lat,
			",",
			destination.lng,
			"&",
			"mode=fastest;car;traffic:" + (document.getElementById("traffic").checked ? "enabled" : "disabled"),
			"&rangetype=" + rangeType,
			"&",
			"range=",
			rangeValue * (rangeType == "time" ? 60 : 1000),
			"&",
			"linkattributes=sh&",
			"app_code=",
			app_code,
			"&",
			"app_id=",
			app_id,
			"&jsoncallback=reverseFlowCallback"].join("");

			script = document.createElement("script");
			script.src = routeUrl;
			document.body.appendChild(script);
	}

	var reverseFlowCallback = function(result)
	{

		//add Routing Release number if not already done
		if (releaseRoutingShown== false){
			var ver = result.response.metaInfo.moduleVersion;
			releaseInfoTxt.innerHTML+="<br />Routing: " + ver;
			releaseRoutingShown = true;
		}


		if(shapegroup !== undefined)
		{
			map.removeObject(shapegroup);
			shapegroup = null;
		}
		if(!result.response){
			alert("Error: " +result.Details);
			return;
		}

		shapegroup = new H.map.Group();
		var shape = result.response.isoline[0].component[0].shape,
		strip = new H.geo.Strip();

		for (var i = 0; i < shape.length; i++)
		{
			var split = shape[i].trim().split(",");
			if(split.length === 2){
				var lat = parseFloat(split[0]);
				var lon = parseFloat(split[1]);
				strip.pushLatLngAlt( lat, lon, 0);
			}
		}

		var shp = new H.map.Polygon(strip,
			{
				style: { lineWidth: 5, strokeColor: "rgba(34, 204, 34, 0.5)"}
			}
		);

		shapegroup.addObject(shp);
		map.addObject(shapegroup);

		map.setViewBounds(shapegroup.getBounds());
	}