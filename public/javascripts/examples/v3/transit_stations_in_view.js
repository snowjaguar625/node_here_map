/* 
		author domschuette
		(C) HERE 2017
		added isochrone - Alex Sadovoy (C) HERE 2018
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: 13,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);
	
	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	var group = new H.map.Group(),
		currentBubble;
		
	map.addObject(group);

	var isIsochrone = false,
		fixedCenter = false,
		reactOnMapChange = true;
	
	requestUnit = "minute";
	var bar1 = document.getElementById("bar1"),
		text1 = document.getElementById("text1"),
		slider1 = addSlider(bar1,text1,1);

	var svg_circleL = '<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30">' +
						'<circle cx="15" cy="15" r="14" stroke="white" stroke-width="2" fill="__FILLCOLOR__" fill-opacity="0.7" stroke-opacity="0.2" />' +
						'</svg>';
	var svg_circleH = '<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16">' +
						'<circle cx="8" cy="8" r="6" stroke="white" stroke-width="2" fill="__FILLCOLOR__" fill-opacity="0.7" stroke-opacity="0.2" />' +
						'</svg>';
	var color_circle = {};

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
		{ 
			var d = document.getElementById("centerCoordinate"),
				c = map.getCenter(),
				lat = c.lat,
				lon = c.lng;
			d.innerHTML = "" + lat + " " + lon + " @" + map.getZoom();
		}
	);
	map.addEventListener("tap", function(e){
		if(!isIsochrone) return false;
		fixedCenter = map.screenToGeo(e.pointers[0].viewportX, e.pointers[0].viewportY);
		reactOnMapChange = true;
		map.setCenter(fixedCenter, true);
	});
	
	var onViewChangeEnd = function() 
		{
			if(!reactOnMapChange){
				changeIcons();
				return;
			}
			group.removeAll();
			if(isIsochrone){
				requestStationsIsochrone(fixedCenter || map.getCenter());
			}else{
				requestStations(map.getCenter());
			}
			
			
		};
	map.addEventListener("mapviewchangeend", onViewChangeEnd);

	map.addLayer(new H.map.layer.CanvasLayer(function(ctx, renderParams) {
		var x = renderParams.screenCenter.x,
			y = renderParams.screenCenter.y,
			offset = 15
			info = isIsochrone ? "Start point" : "Map center";
		if(fixedCenter){
			x = map.geoToScreen(fixedCenter).x;
			y = map.geoToScreen(fixedCenter).y;
		}
		ctx.fillStyle = "red";
		ctx.strokeStyle = "red";
		ctx.lineWidth = 3

		ctx.moveTo(x - offset, y - offset);
		ctx.lineTo(x + offset, y + offset);
		ctx.moveTo(x + offset, y - offset);
		ctx.lineTo(x - offset, y + offset);
		ctx.stroke();
		ctx.fillText(info, x-offset-7, y-offset-5);
		return H.map.render.RenderState.DONE;
	}));
	
	/*
	map.addLayer(new H.map.layer.CanvasLayer(function(ctx, renderParams) {
		return H.map.render.RenderState.DONE;
		if(!isIsochrone) return H.map.render.RenderState.DONE;
		//ctx.globalAlpha = 0.3;
		group.forEach(function(m){
			var p = map.geoToScreen({lat: m.$stn.y, lng: m.$stn.x});
			ctx.fillStyle = "blue"; 
			ctx.fillRect(p.x-25, p.y-25, 50, 50); 
		});

		return H.map.render.RenderState.DONE;
	}));


	// Create heat map provider
	var heatmapProvider = new H.data.heatmap.Provider({
		colors: new H.data.heatmap.Colors({
			'0.3': 'green',
			'0.5': 'red',
			'0.7': 'yellow'
		}, true),
		// Paint assumed values in regions where no data is available
		//assumeValues: false,
		coarseness: 10
		//dataMax: 255
	});
	// Create a semi-transparent heat map layer
	var heatmapLayer = new H.map.layer.TileLayer(heatmapProvider, {
  		opacity: 0.6
	});*/
	//map.addLayer(heatmapLayer);
	
	requestStations = function(center)
	{
                   
        var url = ["https://transit.api.here.com/",
                   "v3/",
                   "stations/",
                   "by_geocoord.json",
                   "?app_id=",
                   app_id,
                   "&app_code=",
                   app_code,
                   "&center=",
   				   center.lat,
				   ",",
				   center.lng,
                   "&radius=10000",
                   "&max=50",
                   "&maxStn=40",
                   "&callbackFunc=stationsReceived"].join("");
	  
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}
	
	stationsReceived = function(response)
	{
		if(response && response.Res && response.Res.Stations && response.Res.Stations.Stn)
		{
			var stn = response.Res.Stations.Stn,
				i = 0,
				l = stn.length;
				
			for(;i < l; i++)
			{
				var currentStn = stn[i],
					lat = currentStn.y,
					lng = currentStn.x
				
				addMarker(lat, lng, currentStn);
			}
		}
	}

	requestStationsIsochrone = function(center)
	{
		var maxDur = slider1.value;
		if(maxDur < 5) return;
		var date = document.getElementById('date').value,
			time = document.getElementById('time').value;

        var url = ["https://transit.api.here.com/",
                   "v3/",
                   "isochrone.json",
                   "?app_id=",
                   app_id,
                   "&app_code=",
                   app_code,
                   "&center=",
   				   center.lat,
				   ",",
				   center.lng,
                   "&time=" + encodeURIComponent(date + "T" + time),
                   "&maxDur=" + maxDur,
                   "&callbackFunc=stationsReceivedIsochrone"].join("");
	  
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}
	
	stationsReceivedIsochrone = function(response)
	{
		if(response && response.Res && response.Res.Isochrone && response.Res.Isochrone.IsoDest)
		{
			var isoDest = response.Res.Isochrone.IsoDest,
				i = 0,
				len = isoDest.length
				dPoints = [],
				dPointsNear = [],
				dPointsM = [];
			//heatmapProvider.clear();
				
			for(;i < len; i++)
			{
				var currentDest = isoDest[i].Stn,
					iStn = 0
					lenStn = currentDest.length
					duration = isoDest[i].duration;
				for(;iStn < lenStn; iStn++)
				{
					var currentStn = currentDest[iStn],
						lat = currentStn.y,
						lng = currentStn.x;
					currentStn.duration = dur2min(duration);
					addMarker(lat, lng, currentStn);
					/*group.addObject(new H.map.Circle(
						{lat: lat, lng:lng},
						500
					));*/
					if(currentStn.duration <= 30){
						dPointsNear.push({y: lat, x: lng});
					}else if(currentStn.duration > 30 && currentStn.duration <= 60) {
						dPointsM.push({y: lat, x: lng});
					}else{
						dPoints.push({y: lat, x: lng});
					}
					

				}	
			}
			reactOnMapChange = false;
			//heatmapProvider.addData(dPoints);

			// Get convex hull polygon coversing all stations retrieved
			dPointsNear.push({x: fixedCenter.lng, y: fixedCenter.lat});
			dPointsM.push({x: fixedCenter.lng, y: fixedCenter.lat});
			dPoints.push({x: fixedCenter.lng, y: fixedCenter.lat});
			var shp = getAroundPolygon(dPointsNear, "rgba(255, 0, 0, 0.2)");
			group.addObject(shp);
			shp = getAroundPolygon(dPointsM, "rgba(255, 204, 34, 0.3)")
			group.addObject(shp);
			shp = getAroundPolygon(dPoints, "rgba(0, 0, 255, 0.1)");
			group.addObject(shp);

			map.setViewBounds(group.getBounds());
		}
	}

	function getAroundPolygon(dPoints, color){
		var hullPoints = convexHull(dPoints);
		var strip = new H.geo.Strip();
		hullPoints.forEach(function (p) {
				strip.pushLatLngAlt(p.y, p.x, 0);
		});
		strip.pushLatLngAlt(hullPoints[0].y, hullPoints[0].x, 0);
		shp = new H.map.Polygon(strip, {
				style:{ lineWidth: 50, strokeColor: color, fillColor : color }
		});
		return shp;
	}

	function changeIcons(){
		group.forEach(function(m){
			if(!m.$stn){return;}
			var curZoom = map.getZoom(),
				markLevel = curZoom > 14 ? "zL": "zH";
			m.setIcon(isIsochrone ? getIconColor(m.$stn.duration)[markLevel] : null);
		});
	}



	addMarker = function(lat, lng, stn)
	{
		if(lat && lng)
		{
			var json = JSON.stringify(stn, undefined, 4);
			var curZoom = map.getZoom(),
				markLevel = curZoom > 14 ? "zL": "zH";
			var m = new H.map.Marker({
				lat: lat,
				lng: lng,
			},{
				icon: isIsochrone ? getIconColor(stn.duration)[markLevel] : null
			});
			
			m.$stn = stn;
			m.$json = json;
			
			m.addEventListener("tap", function(e)
			{
				e.stopPropagation();
				if(currentBubble)
					ui.removeBubble(currentBubble);
				var html = ["<a class='here_green smallFont' target='_blank' href='transit_line_info_new?stationId=",
								e.target.$stn.id,
								"'>",
								e.target.$stn.name,
								"</a><textarea rows='10' cols='30'>",
								e.target.$json,
								"</textarea>"
							].join("");

				var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

				currentBubble = new H.ui.InfoBubble(pos, { content: html });
				ui.addBubble(currentBubble);
			});
			
			group.addObject(m);
		}
	}

	function dur2min(dur){
		var aDur = dur.split("H"),
			minDur = 0;
		if(aDur.length == 2){
			minDur = parseInt(aDur[0].replace("PT", "")) * 60;
			minDur += parseInt(aDur[1].replace("M", ""));
		}else{
			minDur = parseInt(aDur[0].replace("PT", "").replace("M", ""));
		}
		return minDur;
	}

	function getIconColor(dur){
		var prc = Math.floor((dur*100)/90),
			cCode = prc+"prc",
			color = numberToColorRgb(prc);
		cCode = "test";
		

		if(!color_circle[cCode]){
			color_circle[cCode] = {
					/*"zL": new H.map.Icon(
							svg_circleL.replace(/__FILLCOLOR__/g, color),
							{
								anchor: {x: 15, y: 15}
							},
						),
					"zH": new H.map.Icon(
							svg_circleH.replace(/__FILLCOLOR__/g, color),
							{
								anchor: {x: 8, y: 8}
							}		
						)*/
					"zL": new H.map.Icon(
							svgMarkerPublicTransit,//"/assets/icons/ptrans30x30.png",
							{
								anchor: {x: 10, y: 10}
							},		
						),
					"zH": new H.map.Icon(
							 svgMarkerPublicTransit,//"/assets/icons/ptrans30x30.png",
							{
								anchor: {x: 10, y: 10}
							}
						)
			};
		}
		return color_circle[cCode];
	}

	// convert a color to a number using hsl
	// based on formula as provided by @KamilT
	function numberToColorRgb(i) {
		// we calculate red and green
		var green = Math.floor(255 - (255 * i / 100));
		var red = Math.floor(255 * i / 100);
		// we format to css value and return
		return 'rgb('+red+','+green+',0)'
	}

	function addSlider(parent,text,no){
		var slider = document.createElement('input');
		slider.setAttribute('type', 'range');
		slider.setAttribute('orient', 'horizontal');

		slider.min = "5";
		if (requestUnit == "km"){
			slider.max = "500";
		}
		if (requestUnit == "minute"){
			slider.max = "90";
		}
		slider.style.width = "200px";
		slider.value = "90";
		slider.style.cursor = "pointer";
		parent.appendChild(slider);

		var container = document.createElement("div");
		container.setAttribute("style", "display: none;");
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

		slider.onchange = function() { updateTextValue(slider.value,text); reactOnMapChange=true; onViewChangeEnd(); };
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
		else
		{
			text.innerHTML = "Maximum duration of the journeys: " + value +" min";
		}

	};

	function chIsochrone(it){
		if(it.checked){
			document.getElementById('isochrone').setAttribute("style", "display: block;");
			isIsochrone = true;
			fixedCenter = map.getCenter();
		}else{
			document.getElementById('isochrone').setAttribute("style", "display: none;");
			isIsochrone = false;
			fixedCenter = false;
			reactOnMapChange = true;
		}
		onViewChangeEnd();
		
	}

	function dateTimeChg(){
		reactOnMapChange = true;
		onViewChangeEnd();
	}