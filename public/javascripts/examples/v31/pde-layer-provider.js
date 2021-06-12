function createPdeObjectProvider(map, opts) {
    function PdeObjectProvider() {
		H.map.provider.LocalObjectProvider.call(this, opts || {});
    }

    inherits(PdeObjectProvider, H.map.provider.LocalObjectProvider);

    var projection = new H.geo.PixelProjection();
    var tilesXYs = [];
    var linkObjectsByLinkId = {};
    var alreadyRequestedXYPairs = {};// Key X Values [Ys]
	var that;
	
    PdeObjectProvider.prototype.requestSpatialsByTile = function (tile, visiblesOnly, cacheOnly) {
		that = this;
        if (tile.z >= opts.min) {
            projection.rescale(tile.z);

            var degSize = 180 / Math.pow(2, opts.level),
                topleft = projection.pixelToGeo({x: tile.x * 256, y: tile.y * 256}),
                topLeftXY = [Math.floor((topleft.lng + 180) / degSize), Math.floor((topleft.lat + 90) / degSize)],
                bottomright = projection.pixelToGeo({x: tile.x * 256 + 255, y: tile.y * 256 + 255}),
                bottomrightXY = [Math.floor((bottomright.lng + 180) / degSize), Math.floor((bottomright.lat + 90) / degSize)];
			
			requestTiles(topLeftXY,bottomrightXY);
        }

        return H.map.provider.LocalObjectProvider.prototype.requestSpatialsByTile.call(this, tile, visiblesOnly, cacheOnly);
    };
	
	function requestTiles(topLeftXY,bottomrightXY){
		for (var i = topLeftXY[0], lenI = bottomrightXY[0]; i <= lenI; i++) {

                for (var k = bottomrightXY[1], lenK = topLeftXY[1]; k <= lenK; k++) {
                    if (alreadyRequestedXYPairs[i] && alreadyRequestedXYPairs[i][k]) {
                        continue;
                    }
                    if (!alreadyRequestedXYPairs[i]) {
                        alreadyRequestedXYPairs[i] = {};
                    }
                    alreadyRequestedXYPairs[i][k] = true;

                    tilesXYs.push(i);
                    tilesXYs.push(k);
                    setTimeout(runCalls);
                }
            }
	}
	
	
	 function loadDataTiles(dataLayer, joinedTilesXYs, cb) {
                var url = PDE_ENDPOINT + '/1/tiles.json' +
                    '?layer=' + dataLayer.layer +
                    (dataLayer.cols ? '&cols=' + dataLayer.cols.join(';') : '') +
                    '&level=' + opts.level +
                    '&tilexy=' + joinedTilesXYs ;
					
					if(PDE_ENDPOINT.indexOf("fleet.ls.hereapi.com") !== -1){
						url = url+'&apiKey='+api_key;
					}
                    else{
					 url = url +'&app_id=' + app_id + '&app_code=' + app_code;
					}
                if (dataLayer.release) {
                    url += '&release=' + dataLayer.release;
                }
                $.ajax({
                        url: url,
                        dataType: 'jsonp',
                        error: console.log,
                        success: cb
                    }
                );
    }

    function runCalls() {
                if (!tilesXYs.length) return;
                var joinedTilesXYs = tilesXYs.join(',');
                var url = PDE_ENDPOINT + '/1/tiles.json' +
                    '?layer=' + opts.layer +
                    '&level=' + opts.level +
                    '&tilexy=' + joinedTilesXYs +
                    '&cols=' + (opts.cols || 'LINK_ID;LAT;LON') ;
                    if(PDE_ENDPOINT.indexOf("fleet.ls.hereapi.com") !== -1){
						url = url+'&apiKey='+api_key;
					}
                    else{
					 url = url +'&app_id=' + app_id + '&app_code=' + app_code;
					}
                tilesXYs = [];

                $.ajax({
                        url: url,
                        dataType: 'jsonp',
                        error: console.log,
                        success: function (data) {
                            var stripsByLinkId = {};
                            var dataByLinkId = {};
                            var tileCount = 0;
                            data.Tiles && data.Tiles.forEach(function (t) {
                                t.Rows && t.Rows.forEach(function (r) {

                                    // POIs, if we have display lat/lon use it.
                                    if (r.DISPLAY_LAT || (r.LAT.indexOf(',') === -1 && r.LON.indexOf(',') === -1)) {
                                        var marker = new H.map.Marker({
                                            lat: +(r.DISPLAY_LAT || r.LAT) / 100000,
                                            lng: +(r.DISPLAY_LON || r.LON) / 100000
                                        }, opts.markerStyle && {icon: opts.markerStyle(r)});
                                        opts.tap && marker.addEventListener('tap', opts.tap.bind(null, r));
                                        that.getRootGroup().addObjects([marker]);
                                        return;
                                    }

                                    // Otherwise handling links.
                                    if (stripsByLinkId[r.LINK_ID]) {
                                        // Do not add objects twice and add again when invalidated.
                                        return;
                                    }
                                    var lats = r.LAT.split(',');
                                    var lons = r.LON.split(',');
                                    var strip ;
									if(H.geo.Strip){
										strip=new H.geo.Strip();
									}else{
										strip= new H.geo.LineString();
									}
                                    var lastLat = Number(lats[0]) / 100000;
                                    var lastLon = Number(lons[0]) / 100000;
                                    strip.pushPoint({lat: lastLat, lng: lastLon});
                                    for (var i = 1; i < lats.length; i++) {
                                        lastLat += Number(lats[i]) / 100000;
                                        lastLon += Number(lons[i]) / 100000;
                                        strip.pushPoint({lat: lastLat, lng: lastLon});
                                    }

                                    stripsByLinkId[r.LINK_ID] = strip;
                                    // Use callback to process resulting strip from PDE.

                                    var data = {};
                                    data[opts.layer] = r;
                                    dataByLinkId[r.LINK_ID] = data;
                                });
                                tileCount++;
                            });
                            var todoCount = opts.dataLayers && opts.dataLayers.length || 0;
                            opts.dataLayers && opts.dataLayers.forEach(function (dataLayer) {
                                if(document.getElementById("spinner")) Spinner.showSpinner();    
                                loadDataTiles(dataLayer, joinedTilesXYs, function (data) {
                                    todoCount -= 1;
                                    data.Tiles && data.Tiles.forEach(function (t) {
                                        t.Rows && t.Rows.forEach(function (r) {
                                            if (!dataByLinkId[r.LINK_ID]) return;
                                            dataByLinkId[r.LINK_ID][dataLayer.layer] = r;
                                            if (todoCount === 0) {
                                                var strip = stripsByLinkId[r.LINK_ID];
                                                delete stripsByLinkId[r.LINK_ID];
                                                var data = dataByLinkId[r.LINK_ID];
                                                delete dataByLinkId[r.LINK_ID];

                                                var strips = opts.postProcess && opts.postProcess(strip, data) || [strip];
                                                Object.keys(strips).forEach(function (k) {
                                                    var strip = strips[k];
                                                    var polyline = new H.map.Polyline(strip, {});

                                                    opts.tap && polyline.addEventListener('tap', function (e) {
                                                        opts.tap(e, polyline.getData());
                                                    });

                                                    // Not adding until all data available.
                                                    data.processedKey = k;
                                                    polyline.setData(data);
                                                    var polylineStyle = opts.polylineStyle(data);
                                                    if (polylineStyle) {
                                                        polyline.setStyle(polylineStyle);
                                                        that.getRootGroup().addObjects([polyline]);
                                                        //polylines.push(polyline);
                                                    }
                                                });
                                            }
                                        });
                                    });
                                    if(document.getElementById("spinner"))Spinner.hideSpinner();
                                })
                            });
                        }
                    }
                );
    }
	
	
	/**
	* Used specifcally by JS API 3.1 examples where spatial tiles are not being requested automatically
	*/
	PdeObjectProvider.prototype.requestSpatials = function (geoRect, zoomLevel, visiblesOnly, cacheOnly) {
		that = this;
        if (zoomLevel >= opts.min) {
            projection.rescale(zoomLevel);
            var degSize = 180 / Math.pow(2, opts.level),
                topLeftXY = [Math.floor((geoRect.getLeft() + 180) / degSize), Math.floor((geoRect.getTop() + 90) / degSize)],
                bottomrightXY = [Math.floor((geoRect.getRight() + 180) / degSize), Math.floor((geoRect.getBottom() + 90) / degSize)];        
			requestTiles(topLeftXY,bottomrightXY);
        }
    };
	


    var pdeObjectProvider = new PdeObjectProvider(opts);

	var strip ;
	if(H.geo.Strip){
		strip=new H.geo.Strip();
	}else{
		strip= new H.geo.LineString();
	}
    strip.pushPoint({lat: 52.5308, lng: 12.3852});
    strip.pushPoint({lat: 51.5308, lng: 13.3852});
    strip.pushPoint({lat: 50.5308, lng: 12.3852});
    strip.pushPoint({lat: 49.5308, lng: 13.3852});

    pdeObjectProvider.getRootGroup().addObjects([
        new H.map.Polyline(strip)
    ]);

    return pdeObjectProvider;

}