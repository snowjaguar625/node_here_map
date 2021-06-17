/* 
		author domschuette
		(C) HERE 2016
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	adminLevel,
	layer,
	provider,
	totalPdeTilesLoaded = 0;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.satellite.xbase, {
		center: new H.geo.Point(51.68462,0.37478),
		zoom: 18,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
	{ 
		var d = document.getElementById("centerCoordinate"),
			c = map.getCenter(),
			lon = Math.round(c.lng * 100000.0) /100000.0;
			lat = Math.round(c.lat * 100000.0) /100000.0;
			d.innerHTML = "Map center: " + lat + " / " + lon;
	});

	var getPdeTilingLevel = function(adminLevel)
	{
		switch(adminLevel) { // should lookup from https://pde.api.here.com/1/doc/layers.json?app_id=' + app_id + '&app_code=' + app_code --> layer name + tileLevel
			case "0": return  7;
			case "1": return  8;
			case "2": return  9;
			case "8": return 10;
			case "9": return 11;
		}
	};

	var	sourceTypeColor = { G: '#FF0000', L: '#FFFF00', P: '#00FF00', U: '#F2D933' };
	var sourceTypeLegendTxt = 'Polygons are colored by <a href="https://pde.api.here.com/1/doc/layer.json?layer=ADMIN_POLY_0&app_id=' + app_id + '&app_code=' + app_code + '" style="color:#00ACDC">Source Type</a>:';
	for (var c in sourceTypeColor) {
		if (sourceTypeColor.hasOwnProperty(c)) {
			sourceTypeLegendTxt += " <font color='" + sourceTypeColor[c] + "'>" + c + "</font>";
		}
	}
	document.getElementById("sourceTypeLegend").innerHTML = sourceTypeLegendTxt;
			
	var CustomProvider = function(options) 
	{
		this.projection = new mapsjs.geo.PixelProjection();
		this.projection.rescale(7);
		this.url = "https://pde.api.here.com/1/tile.json?release=LATEST&layer=ADMIN_POLY_" + adminLevel + "&level=" + getPdeTilingLevel(adminLevel) + "&tilex={$X$}&tiley={$Y$}&app_id=" + app_id + "&app_code=" + app_code;
		this.done = {};
		this.drawStrip.bind(this);
		mapsjs.map.provider.RemoteTileProvider.call(this /*, {min: 7, max: 8}*/);
	};

	// inherits is API internal, but it saves time to use it directly
	inherits(CustomProvider, mapsjs.map.provider.RemoteTileProvider);

	CustomProvider.prototype.requestInternal = function(x, y, z, onSuccess, onError) 
	{
	this.projection.rescale(z);

	var that = this,
		degSize = 180 / Math.pow(2, getPdeTilingLevel(adminLevel)),
		counter = 0,
		topleft = this.projection.pixelToGeo({x: x * 256,y: y * 256}),
		topLeftXY = [Math.floor((topleft.lng + 180) / degSize), Math.floor((topleft.lat + 90) / degSize)],
		bottomright = this.projection.pixelToGeo({x: x * 256 + 255,y: y * 256 + 255}),
		bottomrightXY = [Math.floor((bottomright.lng + 180) / degSize), Math.floor((bottomright.lat + 90) / degSize)],
		bottomrightColRow = [],
		total = (bottomrightXY[0] - topLeftXY[0] + 1) * (topLeftXY[1] - bottomrightXY[1] + 1);
		xhrs = [];

		for (var i = topLeftXY[0], lenI = bottomrightXY[0]; i <= lenI; i++) {
			for (var k = bottomrightXY[1], lenK = topLeftXY[1]; k <= lenK; k++) {
				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d');
				
				canvas.width = 256;
				canvas.height = 256;
				
				xhrs.push(
					new mapsjs.net.Xhr(this.url.replace('{$X$}', i).replace('{$Y$}', k), (function(x, y) {return function(resp) 
					{
						
						if (resp.ok) {
							resp.json().then(function(jsonResp){
							
								var rows = jsonResp.Rows, i, len = rows.length;
								
								
								for (i = 0; i < len; i++) {
									//if(rows[i].SOURCE_TYPE!="G")
									that.drawStrip(rows[i].LAT.split(','), rows[i].LON.split(','), that.tileSize * x, that.tileSize * y, ctx, rows[i].SOURCE_TYPE, rows[i].NAME);
								}
								
								//grid for debuging
								/*ctx.save();
								ctx.fillStyle = 'rgba(255, 0, 0, 1)';
								ctx.font = (11) + 'px sans-serif';
								ctx.fillText(z + '/' + x + '/' + y, 11, 11);
								ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
								ctx.lineWidth = 1;
								ctx.strokeRect(0, 0, 2 * that.tileSize, 2 * that.tileSize);
								ctx.strokeRect((that.tileSize / 2) - 1, (that.tileSize / 2) - 1, 2, 2);
								ctx.restore();*/
								
							}, function(err){
								errorMsg = err;
								gotResponse = true;
							});
						}
						
						
					
						counter++;
						totalPdeTilesLoaded++;
						if (counter == total) {
							releaseInfoTxt.innerHTML = totalPdeTilesLoaded + " PDE tiles loaded";
						}
						counter === total && onSuccess(canvas);
				};}(x, y))));
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

	CustomProvider.prototype.drawStrip = function(lats, lons, offsetX, offsetY, ctx, sourceType, name) 
	{
		var parsedLat, parsedLon,
			lastLat = 0, lastLon = 0,
			lat, lon, 
			point,
			coords = new Array(),
			alllines = new Array(),
			textPosY = 0, textPosX = 0;

		for (var i = 0; i < lats.length; i++) {
			if (lats[i] == "") lats[i] = 0;
			if (lons[i] == "") lons[i] = 0;
			lat = parseFloat(lats[i]) / 100000.0 + lastLat;
			lon = parseFloat(lons[i]) / 100000.0 + lastLon;
			lastLat = lat;
			lastLon = lon;
			point = this.projection.geoToPixel({lat: lat, lng: lon});
			textPosX += point.x - offsetX;
			textPosY += point.y - offsetY;
			var g = lons[i].toString();
			if (g.charAt(0) === '-') g = g.substr(1);
			if (g.indexOf("0") === 0 && lons[i] != 0 || g == "00") { // point starts artificial line that is only used for polygon filling
				if (i == 0) continue;
				coords.push(point);
				alllines.push(coords);
				coords = new Array();
				continue;
			}
			coords.push(point);
		}
		alllines.push(coords);
		textPosY /= lats.length;
		textPosX /= lons.length;

		ctx.lineWidth = 2;
		ctx.strokeStyle = sourceTypeColor[sourceType];
		for (var i = 0; i < alllines.length; i++) {
			ctx.beginPath();
			coords = alllines[i];
			for (var j = 0; j < coords.length; j++)	{
				point = coords[j];
				ctx.lineTo(point.x - offsetX, point.y - offsetY);
			}
			ctx.stroke();
		}

		/*
		ctx.font = "10px Arial";
		ctx.lineWidth = 1;
		ctx.strokeText(name, textPosX, textPosY);
		*/
	}

	var adminLevelChanged = function (obj)
	{
		adminLevel = obj.value;
		provider = new CustomProvider({});
		if (layer != undefined)
			map.removeLayer(layer);
		layer = new mapsjs.map.layer.TileLayer(provider);
		map.addLayer(layer);
	}
	
	var radioButtons = document.getElementsByName("adminLevelRadioButtons");
	for (var i = 0; i < radioButtons.length; i++) {
		if (radioButtons[i].checked)
			adminLevelChanged(radioButtons[i]);
	}