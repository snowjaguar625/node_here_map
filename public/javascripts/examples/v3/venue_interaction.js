/*
	author domschuette
	(C) HERE 2014
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
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);


	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(52.50906645, 13.30502625),
		zoom: 17,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	var spaces = new Array();

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);


	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var curLevel = 0;
	maxFloor = 0;
	minFloor = 0;
	var venueProvider=null;

	addVenueLayer(map,platform);

	function addVenueLayer(map, platform) {
		// Create a tile layer, which will display venues
		var customVenueLayer = platform.getVenueService().createTileLayer({
			// Provide a callback that will be called for each newly created space
			onSpaceCreated: onSpaceCreated
		});

		// Get TileProvider from Venue Layer
		venueProvider = customVenueLayer.getProvider();
		// Add venues layer to the map
		map.addLayer(customVenueLayer);


	}

	/**
	* Changes the default style for spaces
	*
	* @param {H.service.venues.Space}
	*/
	function onSpaceCreated(space) {
		//change the outline color
		space.setStyle(space.getStyle().getCopy({
			lineWidth: 2,
			strokeColor: 'rgba(0,0,0,0.5)'
		}));
		// add tap listner
		space.addEventListener("tap", function(evt){
			var point = map.screenToGeo(evt.pointers[0].viewportX, evt.pointers[0].viewportY);
			infoBubble = new H.ui.InfoBubble(point, { content: evt.target.getData().preview });
			ui.addBubble(infoBubble);
		}, false);
		// map for storing building details
		building=space.getFloor().getBuilding();
		if(!spaces[building.getId()]){
			spaces[building.getId()]=building;
			checkBuildingMinMax(spaces);
		}

	}

	document.getElementById("minus").addEventListener("click", function(){ level(-1) });
	document.getElementById("plus").addEventListener("click", function(){ level(1) });

	/**
	* Function to change floor level
	**/
	function level(level)
	{
		if(curLevel + level <= maxFloor && curLevel + level >= minFloor)
		{
			curLevel = curLevel + level;
			document.getElementById("venue-level").value = curLevel;

			if(level==-1){
				venueProvider.setCurrentLevel(venueProvider.getCurrentLevel() - 1);
			}else{
				venueProvider.setCurrentLevel(venueProvider.getCurrentLevel() + 1);
			}

			ui.getBubbles().forEach(function (bubble) {
				bubble.close();
			});

		}
	}

	/**
	* Find venues using discover service in the current map view
	**/
	map.addEventListener("mapviewchangeend", function(evt){
		buldingsDetailsFound=new Array();
		platform.getVenueService().discover({
			at:map.getViewBounds().getTop()+","+map.getViewBounds().getLeft()+","
			+map.getViewBounds().getBottom()+","+map.getViewBounds().getRight(),
		}, function(result) {
			buldingsFound=result.results.items;
			buldingsFound.forEach(function (building) {
				if(spaces[building.id]){
					buldingsDetailsFound.push(spaces[building.id]);
				}
			});
			checkBuildingMinMax(buldingsDetailsFound);
		}, function (err) {

		});

	}, false);

	/**
	* Function to restrict the max and min floors
	**/
	function checkBuildingMinMax(buldingsDetailsFound) {
		minF = 0,
		maxF = 0,
		Object.keys(buldingsDetailsFound).forEach(function(key) {
			building=buldingsDetailsFound[key];
			minF = Math.min(minF, building.getMinLevel());
			maxF = Math.max(maxF, building.getMaxLevel());
		});
		maxFloor=maxF;
		minFloor=minF;
	}