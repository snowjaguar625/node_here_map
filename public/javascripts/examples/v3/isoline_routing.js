/*
	author domschuette
	(C) HERE 2015
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	group = new H.map.Group(),

	unit = document.getElementById("unit"),
	rangetype = document.getElementById("rangetype"),

	requestUnit = "km",
	requestMode = "car"
	
	reverseisoline = document.getElementById("reverseisoline"),
	traffic = document.getElementById("traffic"),
	calcroute = document.getElementById("routing"),

	bar1 = document.getElementById("bar1"),
	text1 = document.getElementById("text1"),
	slider1 = addSlider(bar1,text1,1),

	bar2 = document.getElementById("bar2"),
	text2 = document.getElementById("text2"),
	slider2 = addSlider(bar2,text2,2),

	bar3 = document.getElementById("bar3"),
	text3 = document.getElementById("text3"),
	slider3 = addSlider(bar3,text3,3),

	isolineOptions = [
	{ lineWidth: 5, strokeColor: "rgba(34, 204, 34, 0.5)"},
	{ lineWidth: 5, strokeColor: "rgba(204, 204, 34, 0.5)"},
	{ lineWidth: 5, strokeColor: "rgba(204, 34, 34, 0.5)"}
	];

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

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

	var centerMarker = new H.map.Marker({lat:0, lng:0});

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
	
	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		group.removeAll();
		sh = lastClickedPos.lat + "," + lastClickedPos.lng;
		document.getElementById("input-start").value = sh;
		geocode(sh);
	}
	
	var geocode = function(term)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
		geoUrl = ["https://geocoder.api.here.com/6.2/search.json?",
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

	var geocallback = function(response)
	{
		group.removeAll();
		lat = lng = false;

		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Place && response.Response.View[0].Result[0].Place.Locations[0])
		{
			lat = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Place.Locations[0].DisplayPosition.Longitude;

			getIsolines(lat, lng);
		}
		else if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Location && response.Response.View[0].Result[0].Location.DisplayPosition)
		{

			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude;

			getIsolines(lat, lng);
		}
		
		if(lat && lng){
			centerMarker.setPosition({lat: lat, lng:lng});
			group.addObject(centerMarker);
		}else{
			alert("adress not found");
		}
	}

	var getIsolines = function(lat, lng)
	{
		var rangetypePrm;
		var isConsumption = false;
		if((requestUnit == "km" || requestUnit == "meters") && rangetype.value != "consumption"){
			rangetypePrm = "&rangetype=distance";
		}else if((requestUnit == "km" || requestUnit == "meters") && rangetype.value == "consumption"){
			rangetypePrm = "&rangetype=consumption";
			isConsumption = true;
		}else{
			rangetypePrm = "&rangetype=time";
		}
		var url = ["https://isoline.route.api.here.com/routing/7.2/calculateisoline.json?",
		"mode=",
		"fastest;",
		requestMode,
		";",
		"traffic:",
		traffic.checked ? "enabled" : "disabled",
		reverseisoline.checked ? "&destination=geo!" : "&start=geo!",
		lat,
		",",
		lng,
		rangetypePrm,
		"&range=",
		"__POS__",
		"&resolution=",
		"__RES__",
		"__CONSUPTION_MODEL__",
		"&app_id=",
		app_id,
		"&app_code=",
		app_code,
		"&jsoncallback=isolineCallback",
		"&requestId=",
		"__ID__"
		].join("");

		if(!isConsumption){
			for (var i = 0; i < 3; i++)
			{
				var val = (i == 0) ? slider1.value : (i == 1) ? slider2.value : slider3.value;
				if(val > 0)
				{
					if(requestUnit == "km")
					{
						val *= 1000;
					}
					else if(requestUnit == "minute")
					{
						val *= 60;
					}

					var newUrl = url;

					newUrl = newUrl.replace("__POS__", val);
					newUrl = newUrl.replace("__RES__", document.getElementById("select" + (i+1)).value);
					newUrl = newUrl.replace("__ID__", i + "," + val);
					newUrl = newUrl.replace("__CONSUPTION_MODEL__", "");

					script = document.createElement("script");
					script.src = newUrl;
					document.body.appendChild(script);
				}
			}
		}else{
			var arrConsums = [];
			$(".speed").each(function(key, item){
				arrConsums[key*2] = item.value;
			});
			$(".consumtion").each(function(key, item){
				arrConsums[(key+1)*2-1] = item.value;
			});
			var ascentVal = document.getElementById("ascent").value;
			var descentVal = document.getElementById("descent").value;
			var customconsumptiondetails = "speed," + arrConsums.join(",") + ";ascent," + ascentVal + ";descent," + descentVal;
			var newUrl = url;
			var val = parseInt(document.getElementById("range").value)*1000;

			newUrl = newUrl.replace("__POS__", val);
			newUrl = newUrl.replace("__RES__", 1);
			newUrl = newUrl.replace("__ID__", "0," + val);
			newUrl = newUrl.replace("__CONSUPTION_MODEL__", "&consumptionmodel=standard");
			newUrl += "&customconsumptiondetails=" + customconsumptiondetails;

			script = document.createElement("script");
			script.src = newUrl;
			document.body.appendChild(script);

		}
	}

	var isolineCallback = function(response)
	{
		if(response && response.response && response.response.isoline)
		{

			//add Routing Release number if not already done
			if (releaseRoutingShown== false){
				var ver = response.response.metaInfo.moduleVersion;
				releaseInfoTxt.innerHTML+="<br />Routing: " + ver;
				releaseRoutingShown = true;
			}

			var requestId = response.response.metaInfo.requestId,
			tmp = requestId.split(","),
			id = tmp[0],
			val = tmp[1],
			components = response.response.isoline[0].component;

			for (var j = 0; j < components.length; j++) {
				var strip = new H.geo.Strip();
			    var shape = components[j].shape;
				for (var i = 0; i < shape.length; i++) {
					var split = shape[i].trim().split(",");
					if (split.length === 2) {
						var lat = parseFloat(split[0]);
						var lon = parseFloat(split[1]);
						strip.pushLatLngAlt(lat, lon, 0);
					}
				}
				
				shp = new H.map.Polygon(strip, {
					style: isolineOptions[parseInt(id)]
				});
				shp.setZIndex = -val;
				group.addObject(shp);
			}
			
			
			
		}
		map.addObject(group);
		map.setViewBounds(group.getBounds());
	}



	unit.onchange = function (evt)
	{
		var max;
		var trgt = evt.target;
		switch (trgt.value) {
			case "1":
				requestUnit = "km";
				max = 500;
				break;
			case "2":
				requestUnit = "meters";
				max = 50000;
				break;
			case "3":
				requestUnit = "minute";
				max = 300;
				break;
		}

		slider1.max = max;
		slider2.max = max;
		slider3.max = max;
		slider1.value = 0;
		slider2.value = 0;
		slider3.value = 0;

		updateTextValue(slider1.value, text1);
		updateTextValue(slider2.value, text2);
		updateTextValue(slider3.value , text3);
		
		var rngType = $('#rangetype');
		var consumtCont = $('.consumtion-container');
		var isolineDist = $('.isoline-dist');
		if(requestUnit == "km" || requestUnit == "meters"){
			rngType.css("display", "inline-block");
		}else{
			rngType.css("display", "none");
			consumtCont.css("display", "none");
			isolineDist.css("display", "block");
		}
	};

	rangetype.onchange = function(evt){
		var
			isolineDist = $('.isoline-dist'),
			consumtCont = $('.consumtion-container');
		if(rangetype.value == "consumption"){
			isolineDist.css("display", "none");
			consumtCont.css("display", "block");
		}else{
			isolineDist.css("display", "inline-block");
			consumtCont.css("display", "none");
		}

	};

	mode.onchange = function (evt)
	{
		requestMode = requestMode == "car"?"pedestrian":"car";
	};

	calcroute.onclick = function ()
	{
		geocode(document.getElementById("input-start").value);
	};

	function addSlider(parent,text,no){
		var slider = document.createElement('input');
		slider.setAttribute('type', 'range');
		slider.setAttribute('orient', 'horizontal');

		slider.min = "0";
		if (requestUnit == "km"){
			slider.max = "500";
		}
		if (requestUnit == "meters"){
			slider.max = "50000";
		}
		if (requestUnit == "minute"){
			slider.max = "300";
		}
		slider.style.width = "450px";
		slider.value = "0";
		slider.style.cursor = "pointer";
		parent.appendChild(slider);

		var container = document.createElement("div");
		container.innerHTML = "Resolution ";

		//Create and append the options
		var select = document.createElement("select");

		var array = ["1", "50", "100", "150", "200", "250", "300", "350", "400", "1000"];
		for (var i = 0; i < array.length; i++) {
			var option = document.createElement("option");
			option.value = array[i];
			option.text = array[i];
			select.appendChild(option);
		}
		select.setAttribute("id", "select" + no);
		container.appendChild(select);
		parent.appendChild(container);

		slider.onchange = function() { updateTextValue(slider.value,text) };
		slider.onmousemove = function() {updateTextValue(slider.value,text) };
		return slider;
	}

	var updateTextValue = function (value,text)
	{
		sliderPosition = 0;
		if (requestUnit == "km")
		{
			text.innerHTML = "distance: " + value + " km";
		}
		else if (requestUnit == "meters")
		{
			text.innerHTML = "distance: " + value + " m";
		}
		else
		{
			text.innerHTML = "travel time: " + value +" min";
		}

	};