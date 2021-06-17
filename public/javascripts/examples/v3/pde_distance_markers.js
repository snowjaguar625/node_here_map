 //author wobecker

        // Check whether the environment should use hi-res maps
        var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

        var smapTileRequests = []; // elements have tileX, tileY, fc, level
        var mapContainer = document.getElementById("mapContainer");
        var markerGroup = new H.map.Group();
        var minHeight = Number.MAX_VALUE;
        var maxHeight = Number.MIN_VALUE;
        var iconMap = {};
        var dmarkerColor = "rgba(255, 224, 22, 1)";
        var dmarkerColorAlt = "rgba(192,192,192, 0.4)";
        var layers = new Object();
        layers["DISTANCE_MARKERS_FC"] = {
            callback: gotPdeResponse
        };

        var iccIndex;
        var dvIndex;
        var snIndex;


        var pdeManager = new PDEManager(app_id, app_code, layers);

        // check if the site was loaded via secure connection
        var secure = (location.protocol === 'https:') ? true : false;

        // Initialize our map
        platform = new H.service.Platform({
                app_code: app_code,
                app_id: app_id,
                useHTTPS: secure
            }),
            maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);


        map = new H.Map(mapContainer, maptypes.normal.map, {
            center: new H.geo.Point(41.87268, -87.82527),
            zoom: 18
        });

        // Enable the map event system
        var mapevents = new H.mapevents.MapEvents(map);

        // Enable map interaction (pan, zoom, pinch-to-zoom)
        var behavior = new H.mapevents.Behavior(mapevents);

        // Enable the default UI
        var ui = H.ui.UI.createDefault(map, maptypes);

        //add JS API Release information
        releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;

        //add MRS Release information
        loadMRSVersionTxt();

        // setup the Streetlevel imagery
        platform.configure(H.map.render.panorama.RenderEngine);


        loadDistanceMarkers = function() {
            Spinner.showSpinner();

            if (markerGroup.getObjects().length > 0) {
                map.removeObject(markerGroup);
            }
            markerGroup = new H.map.Group();

            var bounds = map.getViewBounds();
            pdeManager.setBoundingBox(bounds);
            pdeManager.setOnTileLoadingFinished(pdeManagerFinished);

            pdeManager.start();
        };

        loadDistanceMarkersViaIndex = function() {


            
            dvIndex = document.getElementById('dvText').value;
            snIndex = document.getElementById('snText').value;
            iccIndex = document.getElementById('iccText').value;
            
            if (iccIndex === "" || dvIndex === "" || snIndex === "") {
                alert("Please provide values for all three indexes (DISTANCE_VALUE,STREET_NAME,ISO_COUNTRY_CODE)");
                return;
            }

            Spinner.showSpinner();

            if (markerGroup.getObjects().length > 0) {
                map.removeObject(markerGroup);
            }
            markerGroup = new H.map.Group();

            pdeManager.requestPDEIndex('DISTANCE_VALUE,STREET_NAME,ISO_COUNTRY_CODE', 'DISTANCE_MARKERS_FCn', dvIndex + ',' + snIndex + ',' + iccIndex, gotPDEIndexResponse);
        };

        function gotPDEIndexResponse(respJsonObj) {

            if (respJsonObj.error != undefined) {
                alert(respJsonObj.error);
                return;
            }
            if (respJsonObj.message != undefined) {
                alert(respJsonObj.message);
                return;
            }

            if (respJsonObj.Layers.length == 0) {
                alert('No Distance markers found for the specified values');
                Spinner.hideSpinner();
                return;
            }

            var tiles = [];
            var layersForTilesCall = [];
            for (var i = 0; i < respJsonObj.Layers.length; i++) {
                var layer = respJsonObj.Layers[i];
                for (var j = 0; j < layer.tileXYs.length; j++) {
                    var tileXYs = layer.tileXYs[j];
                    tiles.push({
                        tileX: tileXYs.x,
                        tileY: tileXYs.y,
                        level: layer.level,
                        fc: layer.level - 8
                    });
                    layersForTilesCall.push('DISTANCE_MARKERS_FC' + (layer.level - 8));
                }
            }
            pdeManager.requestPDETiles(tiles, layersForTilesCall, true, "displayResults");
            console.log(tiles);
        }

        function displayResults(respJsonObj) {
            if (respJsonObj.error != undefined) {
                alert(respJsonObj.error);
                return;
            }
            if (respJsonObj.message != undefined) {
                alert(respJsonObj.message);
                return;
            }
            var respJsonObj = respJsonObj.Tiles;
            var strPointFeatureId = null;
            var strLinkId = null;
            var strDistanceValue = null;
            var strDirectionOnSign = null;
            var strDirection = null;
            var strUnitOfMeasure = null;
            var strEnhanced = null;
            var strStreetName = null;
            var strCountry = null;
            var iLat = null;
            var iLon = null;

            for (var t = 0; t < respJsonObj.length; t++) {
                for (var r = 0; r < respJsonObj[t].Rows.length; r++) {

                    strPointFeatureId = respJsonObj[t].Rows[r].POINT_FEATURE_ID;
                    strLinkId = respJsonObj[t].Rows[r].LINK_ID;
                    strDistanceValue = respJsonObj[t].Rows[r].DISTANCE_VALUE;
                    strDirectionOnSign = respJsonObj[t].Rows[r].DIRECTION_ON_SIGN;
                    strDirection = respJsonObj[t].Rows[r].DIRECTION;
                    strUnitOfMeasure = respJsonObj[t].Rows[r].UNIT_OF_MEASURE;
                    strEnhanced = respJsonObj[t].Rows[r].ENHANCED;
                    strStreetName = respJsonObj[t].Rows[r].STREET_NAME;
                    strCountry = respJsonObj[t].Rows[r].ISO_COUNTRY_CODE;
                    iLat = parseInt(respJsonObj[t].Rows[r].LAT) / 100000.0;
                    iLon = parseInt(respJsonObj[t].Rows[r].LON) / 100000.0;
                    var text = strDistanceValue + " on " + strStreetName + " dir: " + strDirection;

                    if (strDistanceValue === dvIndex && strStreetName === snIndex && strCountry === iccIndex) {
                        markerGroup.addObject(new H.map.Marker(new mapsjs.geo.Point(iLat, iLon), {
                            icon: createIcon(text, dmarkerColor)
                        }));
                    } else {
                        /*markerGroup.addObject(new H.map.Marker(new mapsjs.geo.Point(iLat, iLon), {
                            icon: createIcon(text, dmarkerColorAlt)
                        }));*/
                    }
                }
            }
            pdeManagerFinished();


        }



        function pdeManagerFinished(evt) {
            map.addObject(markerGroup);
            Spinner.hideSpinner();
            map.setViewBounds(markerGroup.getBounds());
        }

        // Got PDE tile
        function gotPdeResponse(respJsonObj) {
            if (respJsonObj.error != undefined) {
                alert(respJsonObj.error);
                return;
            }
            if (respJsonObj.message != undefined) {
                alert(respJsonObj.message);
                return;
            }
            var strPointFeatureId = null;
            var strLinkId = null;
            var strDistanceValue = null;
            var strDirectionOnSign = null;
            var strDirection = null;
            var strUnitOfMeasure = null;
            var strEnhanced = null;
            var strStreetName = null;
            var iLat = null;
            var iLon = null;
            console.log(respJsonObj.Rows.length);
            for (var r = 0; r < respJsonObj.Rows.length; r++) {
                strPointFeatureId = respJsonObj.Rows[r].POINT_FEATURE_ID;
                strLinkId = respJsonObj.Rows[r].LINK_ID;
                strDistanceValue = respJsonObj.Rows[r].DISTANCE_VALUE;
                strDirectionOnSign = respJsonObj.Rows[r].DIRECTION_ON_SIGN;
                strDirection = respJsonObj.Rows[r].DIRECTION;
                strUnitOfMeasure = respJsonObj.Rows[r].UNIT_OF_MEASURE;
                strEnhanced = respJsonObj.Rows[r].ENHANCED;
                strStreetName = respJsonObj.Rows[r].STREET_NAME;
                iLat = parseInt(respJsonObj.Rows[r].LAT) / 100000.0;
                iLon = parseInt(respJsonObj.Rows[r].LON) / 100000.0;
                var text = strDistanceValue + " on " + strStreetName + " dir: " + strDirection;
                markerGroup.addObject(new H.map.Marker(new mapsjs.geo.Point(iLat, iLon), {
                    icon: createIcon(text, dmarkerColor)
                }));
            }
        };

        var createIcon = function(text, color) {
            var svg = '<svg width="__widthAll__" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                '<g>' +
                '<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="34" fill="__color__"/>' +
                '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
                '</g>' +
                '</svg>';
            var textLength = text.length * 4 + 70;
            svg = svg.replace(/__line1__/g, text);
            svg = svg.replace(/__width__/g, text.length * 4 + 32);
            svg = svg.replace(/__widthAll__/g, textLength);
            svg = svg.replace(/__color__/g, color);

            return new H.map.Icon(svg, {
                anchor: {
                    x: textLength / 2,
                    y: 16
                }
            });
        };