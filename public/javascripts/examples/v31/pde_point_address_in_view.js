/*
		author domschuette
		(C) HERE 2016
	*/


	var smapTileRequests = [], // elements have tileX, tileY, fc, level
		mapContainer = document.getElementById("mapContainer"),
		iconMap = {},
		dmarkerColor = "rgba(255, 224, 22, 1)",
		layers = null,
		pdeManager = new PDEManager(app_id, app_code, layers),
		currentBubble;

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Initialize our map
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: new H.geo.Point(50.161420780029026 , 8.534013309478581),
		zoom: 16,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	var rectSelection = new H.ui.RectangleSelection();
	ui.addControl('RectangleSelection', rectSelection);
	rectSelection.setCallback(selection);
	
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
		  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
		  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
		  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
		  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
		  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
		  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="#1188DD"/>' +
//		  '<text font-size="12" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" x="10" y="19">__NO__</text>' +
		  '</svg>';
	
	var rect = null,
		icon = new H.map.Icon(svg);
	
	var pdeReleaseShown = false;

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	mapReleaseTxt = document.getElementById("mapReleaseTxt");
	var layers = new Object();
	layers["POINT_ADDRESS"] = {callback: pdeResponse};
	
	var pdeManager = new PDEManager(app_id, app_code, layers),
		group = new H.map.Group(),
		releaseRoutingShown=false;

	var loadPAsFromView = function()
	{
		var rect = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		loadPAs(rect);
	}
	

	loadPAs = function(rect)
	{
		Spinner.showSpinner();

		layers["POINT_ADDRESS"] = {callback: pdeResponse, isFCLayer: false, level: 13};

		pdeManager.setLayers(layers);
		pdeManager.setMeta(true);

		group.removeAll();
		
		pdeManager.setBoundingBoxContainer(group);
		
		pdeManager.setBoundingBox(rect);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);

		pdeManager.start();
	}

	function pdeManagerFinished(finishedRequests)
	{
		map.addObject(group);
		map.getViewModel().setLookAtData({bounds: group.getBoundingBox()}, false);
		
		Spinner.hideSpinner();
	}

	function pdeResponse(respJsonObj)
	{
		if (respJsonObj.error != undefined)
		{
			feedbackTxt.innerHTML = respJsonObj.error;
			return;
		}
		if (respJsonObj.responseCode != undefined)
		{
			alert (respJsonObj.message);
			feedbackTxt.innerHTML = respJsonObj.message;
			return;
		}

		for (r = 0; r < respJsonObj.Rows.length; r++)
		{
			var row = respJsonObj.Rows[r],
				coord = new H.geo.Point(row.LAT / 100000, row.LON / 100000),
				name = row.NAME;
				
			var marker = new H.map.Marker(coord, 
			{
				icon: icon
			});
			marker.$row = JSON.stringify(row, undefined,2);
	
			marker.addEventListener("pointerdown", function(e)
			{
				if(currentBubble)
					ui.removeBubble(currentBubble);
				// var html =  '<div><p style="font-family:Arial,sans-serif; font-size:12px;">Name: ' + e.target.$row + '</p></div>';
				var html = '<pre id="json" style="font-family:Arial,sans-serif; font-size:12px;">'+e.target.$row+'</pre>';
				var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

				currentBubble = new H.ui.InfoBubble(pos, { content: html });
				ui.addBubble(currentBubble);
			});
			group.addObject(marker);
		}
	};
	
	function selection(rectangle)
	{
		rect = rectangle;
		loadPAs(rect);
	}