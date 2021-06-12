/* 
		(C) HERE 2020
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(),
	adminLevel,
	layer,
	provider,
	totalPdeTilesLoaded = 0;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	var group = new H.map.Group();
	map.addObject(group);
	var currentBubble;
	
	group.addEventListener('pointermove',function(e){
		if (currentBubble) 
		  ui.removeBubble(currentBubble);
		
		var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
		var names=e.target.$name.split("\u001e");
		var name = "";
		if(names[0]){
			name = names[0].substring(5,names[0].length);
		}
		
		currentBubble = new H.ui.InfoBubble(pos, {
		  content: name
		});
		ui.addBubble(currentBubble);
	})
	
	// style for polyline
	var customStyle = {
	  strokeColor: 'rgba(255, 0, 0,1)',
	  lineWidth: 5,
	};

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
	{ 
		var d = document.getElementById("centerCoordinate"),
			c = map.getCenter(),
			lon = Math.round(c.lng * 100000.0) /100000.0;
			lat = Math.round(c.lat * 100000.0) /100000.0;
			d.innerHTML = "Map center: " + lat + " / " + lon;
	});

	var CustomProvider = function(options) 
	{
		this.projection = new H.geo.PixelProjection();
		this.projection.rescale(7);
		this.url = "https://s.fleet.ls.hereapi.com/1/tile.json?release=LATEST&layer=CARTO_POLY_TOLL_HAZ&level=11&tilex={$X$}&tiley={$Y$}&apikey=" + api_key;
		this.done = {};
		this.drawStrip.bind(this);
		H.map.provider.RemoteTileProvider.call(this /*, {min: 7, max: 8}*/);
	};

	// inherits is API internal, but it saves time to use it directly
	inherits(CustomProvider, H.map.provider.RemoteTileProvider);

	// custom layer provider implementation to request tiles from Advanced Data Sets API
	CustomProvider.prototype.requestSpatial = function(geoRect, z, onSuccess, onError) 
	{
		this.projection.rescale(z);
		var that = this,
		
		// calculate the tiles for Advanced Data Sets API based on current map bounding box
		degSize = 180 / Math.pow(2, 11),
		counter = 0,
		topLeftXY = [Math.floor((geoRect.getLeft() + 180) / degSize), Math.floor((geoRect.getTop() + 90) / degSize)],
        bottomrightXY = [Math.floor((geoRect.getRight() + 180) / degSize), Math.floor((geoRect.getBottom() + 90) / degSize)]; 
		
		bottomrightColRow = [],
		total = (bottomrightXY[0] - topLeftXY[0] + 1) * (topLeftXY[1] - bottomrightXY[1] + 1);
		xhrs = [];

		// restrict zoomlevel for Advanced Data Sets API requests
		if(map.getZoom() < 10) {
			return;
		}

		// trigger all required tiles 
		for (var i = topLeftXY[0], lenI = bottomrightXY[0]; i <= lenI; i++) {
			for (var k = bottomrightXY[1], lenK = topLeftXY[1]; k <= lenK; k++) {
				xhrs.push(
					new H.net.Xhr(this.url.replace('{$X$}', i).replace('{$Y$}', k), (function(x, y) {return function(resp){
					if (resp.ok) {
							resp.json().then(function(jsonResp){
								
								var rows = jsonResp.Rows, i, len = rows.length;
								for (i = 0; i < len; i++) {
									that.drawStrip(rows[i].LAT.split(','), rows[i].LON.split(','), rows[i].NAMES);
								}
								
							}, function(err){
								errorMsg = err;
								gotResponse = true;
							});
						}
						counter++;
						totalPdeTilesLoaded++;
						if (counter == total) {
							releaseInfoTxt.innerHTML = totalPdeTilesLoaded + " tiles loaded";
						}
						counter === total ;
				};}(geoRect))));
			}
		};

		return {
			'cancel': function() 
			{
				xhrs.forEach(function(item) 
				{
					item.abort();
				});
			}
		}
	}

	CustomProvider.prototype.drawStrip = function(lats, lons, name) {
		var parsedLat, parsedLon,
			lastLat = 0, lastLon = 0,
			lat, lon, 
			point,
			coords =  new H.geo.LineString();
			alllines = new Array();
		// create polyline by parsing the lat,lon format available from
		// Advanced data sets API
		for (var i = 0; i < lats.length; i++) {
			if (lats[i] == "") lats[i] = 0;
			if (lons[i] == "") lons[i] = 0;
			lat = parseFloat(lats[i]) / 100000.0 + lastLat;
			lon = parseFloat(lons[i]) / 100000.0 + lastLon;
			lastLat = lat;
			lastLon = lon;
			var g = lons[i].toString();
			if (g.charAt(0) === '-') g = g.substr(1);
			if (g.indexOf("0") === 0 && lons[i] != 0 || g == "00") { // point starts artificial line that is only used for polygon filling
				if (i == 0) continue;
				coords.pushPoint({lat: lat, lng: lon});
				alllines.push(coords);
				coords =  new H.geo.LineString();
				continue;
			}
			coords.pushPoint({lat: lat, lng: lon});
		}
		alllines.push(coords);
		for (var i = 0; i < alllines.length; i++) {
			coords = alllines[i];
			if(coords.getPointCount()  > 2){
				var polyline = new H.map.Polyline(coords,{ style: customStyle });
				// name to show info bubble on hover
				polyline.$name = name;
				group.addObject(polyline);
			}
		}
	}
	
	// add custom provider to the map
	provider = new CustomProvider({});
	layer = new H.map.layer.TileLayer(provider);
	map.addLayer(layer);
	
	/*required in JS 3.1 to trigger spatial requests*/
	map.addEventListener("mapviewchangeend",function(){
			group.removeAll();
			
			if (currentBubble) 
			ui.removeBubble(currentBubble);
			
			var boundingBox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
			var zoom = map.getZoom();
			layer.getProvider().requestSpatial(boundingBox,zoom);
	})