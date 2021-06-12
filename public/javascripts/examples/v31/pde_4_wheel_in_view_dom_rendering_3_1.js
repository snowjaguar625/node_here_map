/*
		author domschuette
		(C) HERE 2018
	*/

	// check if the site was loaded via secure connection
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	defaultLayers = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), defaultLayers.vector.normal.map, {

		center: new H.geo.Point(39.22975223273634,-106.21381660738041), 
		zoom: 13,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);
	var rectSelection = new H.ui.RectangleSelection();
	ui.addControl('RectangleSelection', rectSelection);
	rectSelection.setCallback(selection);
	
	var rect = null,
		roadGeom = new Object(),
		rr = new Object(),
		group = new H.map.Group();
	
	var pdeReleaseShown = false;

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	mapReleaseTxt = document.getElementById("mapReleaseTxt");
	var layers = new Object();
	
	var pdeManager = new PDEManager(app_id, app_code, layers),
		group = new H.map.Group(),
		releaseRoutingShown=false;

	var loadRRForView = function()
	{
		var rect = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		loadRR(rect);
	}
	
	loadRR = function(rect)
	{
		Spinner.showSpinner();

		roadGeom = new Object();
		rr = new Object();
		group.removeAll();
		
		layers["LINK_ATTRIBUTE2_FC"] = {callback: gotRR, isFCLayer: true};
		layers["ROAD_GEOM_FC"] = {callback: gotRoadGeomFC};

		pdeManager.setLayers(layers);
		pdeManager.setBoundingBoxContainer(group);
		
		pdeManager.setBoundingBox(rect);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);

		pdeManager.start();
	}

	function pdeManagerFinished(finishedRequests)
	{
		map.addObject(group);
		map.setViewBounds(group.getBounds());
		
		Spinner.hideSpinner();
	}

	function gotRoadGeomFC(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}
		for(var i = 0; i < resp.Rows.length; i++)
		{
			roadGeom[resp.Rows[i].LINK_ID] = resp.Rows[i];
		}
	}
	
	function gotRR(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}
		for(var i = 0; i < resp.Rows.length; i++)
		{
			rr[resp.Rows[i].LINK_ID] = 
			{
				FOUR_WHEEL_DRIVE: resp.Rows[i].FOUR_WHEEL_DRIVE
			};
		}
	}
	
	function pdeManagerFinished()
	{
		for (var i in rr)
		{
			var linkid = i,
				values = rr[i];
				
			var linkGeom= roadGeom[linkid];
			if(linkGeom && values.FOUR_WHEEL_DRIVE != null)
			{
				var lat = linkGeom.LAT.split(",");
				var lon = linkGeom.LON.split(",");
				var strip = new H.geo.LineString();
				var temLat= 0,temLon = 0;
				for(i=0;i<lat.length;i++)
				{
					temLat = temLat + (isNaN(parseInt(lat[i])) ? 0 : parseInt(lat[i]));
					temLon = temLon + (isNaN(parseInt(lon[i])) ? 0 : parseInt(lon[i]));
					strip.pushPoint({lat:temLat / 100000, lng:temLon / 100000});
				}
				var polyline = new H.map.Polyline(
						strip, { style: { lineWidth: 10, strokeColor: "#ff0000" }}
				)
				group.addObject(polyline);
			}
		}
		Spinner.hideSpinner();
		map.addObject(group);
	}
	
	function selection(rectangle)
	{
		rect = rectangle;
		loadRR(rect);
	}