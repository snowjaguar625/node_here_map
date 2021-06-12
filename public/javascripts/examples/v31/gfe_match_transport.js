var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
  var secure = (location.protocol === 'https:');
  var mapContainer = document.getElementById('mapContainer');
  var platform = new H.service.Platform({apikey: api_key, useHTTPS: secure});
  var maptypes = platform.createDefaultLayers();
  var map = new H.Map(mapContainer, maptypes.vector.normal.map, {center: new H.geo.Point(41.89193, 12.51133), zoom: 15});
  map.getViewPort().setPadding(0, 0, 0, document.getElementsByClassName('ctrl-panel')[0].offsetWidth);
  new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
  var ui = H.ui.UI.createDefault(map, maptypes); // add UI
  window.addEventListener('resize', map.getViewPort().resize());

  // Add map display for pois from PUBLIC_TRANSPORT_POI layer from PDE.
  var bubble = new H.ui.InfoBubble(map.getCenter(), {
    content: ''
  });
  bubble.close();
  ui.addBubble(bubble);

  var PDE_ENDPOINT = 'https://pde.api.here.com';
  var ptLayer = new H.map.layer.ObjectLayer(createPdeObjectProvider(map, {
    min: 15,
    layer: 'PUBLIC_TRANSPORT_POI',
    cols: 'PLACE_ID;LINK_ID;CAT_ID;CAT_NAME;SIDE_OF_STREET;NAMES;DISPLAY_LAT;LAT;DISPLAY_LON;LON',
    markerStyle: function(r) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill="darkorange" d="M4.689 9h-.72V5.182c0-.5.678-1.229 1.18-1.229l2.488-.015c.359-1.045.743-1.28 2.136-1.28h2.351C11.809 2.116 11.153 2 10.485 2H5.029c-1 0-2.017.814-2.017 1.815v.978l-.245.06c-.25 0-.705.204-.705.454v1.194c0 .251.403.403.653.403l.297.061v4.944c0 .623.61.563 1.019.713v.992c0 .25.356.355.356.355h.969a.455.455 0 0 0 .454-.455v-.537H7V9H4.689zm.819 2.287a.79.79 0 1 1-.002-1.58.79.79 0 0 1 .002 1.58z"/><path d="M15.969 17v-.997h-.907V17h-4.093v-.997H10V17h-.987v.926h7.956V17zm.267-12.979h-6.18c-.967 0-2.027 1.051-2.027 2.019v7.614c0 .726.771 1.32 1.497 1.32h7.042c.725 0 1.414-.595 1.414-1.32V6.04c0-.968-.777-2.019-1.746-2.019zM10.01 5.323c0-.183.101-.331.222-.331h5.5c.119 0 .22.174.22.355v.348c0 .181-.101.329-.22.329h-5.5c-.121 0-.222-.148-.222-.329v-.372zm-.491 7.988a.805.805 0 0 1-.804-.802.805.805 0 0 1 1.608 0 .803.803 0 0 1-.804.802zm6.979 0a.805.805 0 0 1-.804-.802.805.805 0 0 1 1.608 0 .802.802 0 0 1-.804.802zm.515-2.276H8.965v-4.04h8.048v4.04z" fill="darkorange"/></svg>';
      var options = {
        size: new H.math.Size(20, 20),
        anchor: new H.math.Point(10, 10),
        hitArea: new H.map.HitArea(H.map.HitArea.ShapeType.POLYGON, [0, 0, 20, 0, 20, 20, 0, 20])
      };
      return new H.map.Icon(svg, options);
    },
    tap: function (r, e) {
      bubble.setPosition(e.target.getGeometry());
      var content = ('<table class="pt-record">' +
      '<tr><td>PLACE_ID</td><td>{PLACE_ID}</td></tr>' +
      '<tr><td>NAMES</td><td>{NAMES}</td></tr>' +
      '<tr><td>LINK_ID</td><td>{LINK_ID}</td></tr>' +
      '<tr><td>CAT_ID</td><td>{CAT_ID}</td></tr>' +
      '<tr><td>CAT_NAME</td><td>{CAT_NAME}</td></tr>' +
      '<tr><td>SIDE_OF_STREET</td><td>{SIDE_OF_STREET}</td></tr>' +
      '</table>' +
      '<a target="_blank" class="pt-record" href="{pdeRoot}/1/doc/layer.html?layer=PUBLIC_TRANSPORT_POI&app_id={appId}&app_code={appCode}">Read PDE layer documentation for details</a>');

      Object.keys(r).forEach(function (k) {
        console.log(k);
        content = content.replace('{' + k + '}', r[k]);
      });
      content = content.replace('{pdeRoot}', PDE_ENDPOINT);
      content = content.replace('{appId}', app_id);
      content = content.replace('{appCode}', app_code);

      bubble.setContent(content);
      bubble.open();
      e.stopPropagation();
    },
    level: 13
  }));
  map.addLayer(ptLayer);



  var gfeMatcher = (function (undefined) {

    // Private state.
    var DEFAULT_TRACE_HEADER = 'SEQNR,LATITUDE,LONGITUDE';
    var SEARCH_RADIUS = 20;
    var traceArea = document.getElementById('trace-area');
    var zoomToResult = true;
    var objContainer = new H.map.Group();
    map.addObject(objContainer);
    var matching = 0;
    // Please see PDE layers documentation for explanation of layers content.
    var lookupLayers = {
      // Roads.
      'ROAD_GEOM_FC1': {keyAttr: 'LINK_ID'},
      'ROAD_GEOM_FC2': {keyAttr: 'LINK_ID'},
      'ROAD_GEOM_FC3': {keyAttr: 'LINK_ID'},
      'ROAD_GEOM_FC4': {keyAttr: 'LINK_ID'},
      'ROAD_GEOM_FC5': {keyAttr: 'LINK_ID'},
      // Railway lines.
      'CARTO_LINE_DO3': {
        keyAttr: 'CARTO_ID',
        filter: {'FEATURE_TYPE': ['1800201' /* railroad */, '1800202'/* subway */, '1800201' /* light rail */]}
      },
      // River polygons.
      'CARTO_POLY_RIVER_DO1': {keyAttr: 'CARTO_ID'},
      'CARTO_POLY_RIVER_DO2': {keyAttr: 'CARTO_ID'},
      'CARTO_POLY_RIVER_DO3': {keyAttr: 'CARTO_ID'},
      'CARTO_POLY_RIVER_DO4': {keyAttr: 'CARTO_ID'},
      // Rivers lines.
      'CARTO_LINE_DO1': {
        keyAttr: 'CARTO_ID',
        filter: {'FEATURE_TYPE': ['500412'/* river */, '500413'/* intermittent river */, '500414'/* canal/waterchannel */]}
      },
      'CARTO_LINE_DO2': {
        keyAttr: 'CARTO_ID',
        filter: {'FEATURE_TYPE': ['500412'/* river */, '500413'/* intermittent river */, '500414'/* canal/waterchannel */]}
      },
      // Deep sea.
      'CARTO_POLY_OCEAN': {keyAttr: 'CARTO_ID'},
      // Public transport POIs.
      'PUBLIC_TRANSPORT_POI': {keyAttr: 'PLACE_ID'},
      // Airports and other poly features.
      'CARTO_POLY_DO1': {keyAttr: 'CARTO_ID', filter: {'FEATURE_TYPE': ['1900403'/* airport */]}},
      'CARTO_POLY_DO2': {keyAttr: 'CARTO_ID', filter: {'FEATURE_TYPE': ['1907403'/* aircraft roads */]}}
    };
    var bubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
    bubble.close();
    ui.addBubble(bubble);

    // Public members.
    this.reset = reset;
    this.loadFromFile = loadFromFile;
    this.match = match;

    // Starts matching current trace if not other match is in progress.
    function match(opts) {
      if (matching > 0) {
        window.alert('Please wait until previous match completes.');
        return;
      }
      var gfeOnMapsEndpoint = document.getElementById('gfe-maps-endpoint').value;

      var lines = traceArea.value.split(/\r*\n/);
      var head = lines[0].toUpperCase().split(/\s*,\s*/);
      if (head.indexOf('LATITUDE') < 0 || head.indexOf('LONGITUDE') < 0) {
        window.alert('LATITUDE and LONGITUDE columns are mandatory.');
        matching = 0;
        return;
      }

      var tracePoints = [];
      for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        if (line.trim().length === 0) continue;
        var vals = line.split(/\s*,\s*/);
        if (vals.length !== head.length) {
          window.alert('Trace point at line ' + i + ' is malformed.');
          matching = 0;
          return;
        }
        var tracePoint = {};
        for (var j = 0; j < vals.length; j++) {
          tracePoint[head[j]] = vals[j];
        }
        tracePoints.push(tracePoint);
      }
      if (head.indexOf('SEQNR') >= 0) {
        tracePoints.sort(function (a, b) {
          return b.SEQNR - a.SEQNR;
        });
      }
      matching = tracePoints.length;
      objContainer.removeAll();


      // For each trace point, we decide mean of transport based on proximity of cartographic items.
      tracePoints.forEach(function (tp) {
        var req = new XMLHttpRequest();

        var layerNames = Object.keys(lookupLayers);
        var keyAttributes = layerNames.map(function (l) {
          return lookupLayers[l].keyAttr
        });

        var url = gfeOnMapsEndpoint +
            '?key_attributes=' + keyAttributes.join(',') + '&geom=none&layer_ids=' + layerNames.join(',') +
            '&proximity=' + tp.LATITUDE + ',' + tp.LONGITUDE + ',' + SEARCH_RADIUS +
            '&app_code=' + app_code + '&app_id=' + app_id;
        req.onreadystatechange = function () {
          if (req.readyState == 4 && req.status == 200) {
            tp.nearbyGeometries = JSON.parse(req.responseText).geometries;
            tp.nearbyGeometries = tp.nearbyGeometries.filter(function (g) {
              var filter = lookupLayers[g.layerId].filter;
              if (filter === undefined) return true;
              return Object.keys(filter).reduce(function (acc, colName) {
                return acc || filter[colName].indexOf(g.attributes[colName]) >= 0;
              }, false);
            });
            var pos = {lat: tp.LATITUDE, lng: tp.LONGITUDE};
            tp.nearbyGeometries.forEach(function (p) {
              // Points having DISPLAY_LAT get distance recalculated to use display position instead of LAT/LON as used on the server side.
              // This improves visual matching of POIs, as those points are also displayed using DISPLAY_LAT/DISPLAY_LON.
              if (p.attributes.DISPLAY_LAT && p.attributes.DISPLAY_LAT !== null) {
                p.distance = new H.geo.Point(+p.attributes.DISPLAY_LAT / 100000.0, +p.attributes.DISPLAY_LON / 100000.0).distance(pos);
              }
            });
            tp.nearbyGeometries.sort(function (a, b) {
              return a.distance - b.distance;
            });

            matching -= 1;
            if (matching === 0) {
              postProcessMatch(tracePoints, opts);
            }
          }
        };
        req.open('GET', url, true);
        req.send();
      });
    }

    /**
     * Postprocess trace points filled with nearby features.
     * @param tracePoints trace points with nearbyGeometries filed containing all features nearby.
     */
    function postProcessMatch(tracePoints, opts) {
      //Extremely simple implementation, deciding mean of transport based on the layer the nearest feature belongs to.
      tracePoints.forEach(function (tp) {
        var nearbyGeometries = tp.nearbyGeometries;
        var nearestGeometry = nearbyGeometries.length > 0 && nearbyGeometries[0] || {attributes: {}, layerId: ''};

        function isRoad(g) {
          return g.layerId.startsWith('ROAD_GEOM_FC')
        }

        function isWaterWay(g) {
          return g.layerId.startsWith('CARTO_POLY_RIVER_DO') || ['CARTO_POLY_OCEAN', 'CARTO_LINE_DO1', 'CARTO_LINE_DO2'].indexOf(g.layerId) >= 0;
        }

        function isRailway(g) {
          return g.layerId.startsWith('CARTO_LINE_DO3');
        }

        function isAirport(g) {
          return g.layerId.startsWith('CARTO_POLY_DO');
        }

        function isPublicTransport(g){
          return g.layerId.startsWith('PUBLIC_TRANSPORT_POI');
        }

        var isNearestRoad = isRoad(nearestGeometry);
        var isNearestWaterWay = isWaterWay(nearestGeometry);
        var isNearestRailway = isRailway(nearestGeometry);
        var isNearestAirport = isAirport(nearestGeometry);
        var isNearestPublicTransport = isPublicTransport(nearestGeometry);
        var isNearestWalkingUnknown = !(isNearestRoad || isNearestWaterWay || isNearestRailway || isNearestAirport || isNearestPublicTransport);
        var color = isNearestRoad ? 'red' : isNearestWaterWay ? 'lightblue' : isNearestRailway ? 'yellow' :
            isNearestAirport ? 'lightgrey' : isNearestPublicTransport? 'orange' : 'green';

        var nearestRoad = nearbyGeometries.filter(isRoad)[0];
        var nearestWaterWay = nearbyGeometries.filter(isWaterWay)[0];
        var nearestRailway = nearbyGeometries.filter(isRailway)[0];
        var nearestAirport = nearbyGeometries.filter(isAirport)[0];
        var nearestPublicTransport = nearbyGeometries.filter(isPublicTransport)[0];
        var nearestWalkingUnknown = nearbyGeometries.filter(function (g) {
          return !(isRoad(g) || isWaterWay(g) || isRailway(g) || isAirport(g) || isPublicTransport(g));
        })[0];
        var pos = {lat: +tp.LATITUDE, lng: +tp.LONGITUDE};
        var tpMarker = new H.map.Marker(pos, {icon: createIcon(color)});
        tpMarker.addEventListener('tap', function (e) {
          var content = '<div>';
          content += '<h5>Best match ' +
              (isNearestRoad ? '<span class="label" style="background-color: red">Road</span> ' : '') +
              (isNearestRailway ? '<span class="label" style="background-color: yellow; color: black">Railway</span> ' : '') +
              (isNearestWalkingUnknown ? '<span class="label" style="background-color: green">Unknown/walking</span> ' : '') +
              (isNearestWaterWay ? '<span class="label" style="background-color: lightblue; color: black">Water way</span> ' : '') +
              (isNearestAirport ? '<span class="label" style="background-color: lightgrey; color: black">Airway/Plane</span>' : '') +
              (isNearestPublicTransport ? '<span class="label" style="background-color: orange; color: black">Public Transport</span>' : '') +
              '<h5>';

          var allBestMatches = [nearestAirport, nearestRailway, nearestRoad, nearestWaterWay, nearestPublicTransport, nearestWalkingUnknown].filter(function (g) {
            return g !== undefined;
          });
          allBestMatches.sort(function (a, b) {
            return a.distance - b.distance;
          });

          function makeSvg(matches) {
            content += '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="' + (1 + matches.length * 17) + '">';
            content += '<rect width="200" height="' + (1 + matches.length * 17) + 'px" style="fill:black;" />';
            for (var i = 0; i < matches.length; i++) {
              var m = matches[i];
              var color = isRoad(m) ? 'red' : isWaterWay(m) ? 'lightblue' : isRailway(m) ? 'yellow' :
                  isAirport(m) ? 'lightgrey' : isPublicTransport(m) ? 'orange' : 'green';
              var width = (198 - Math.floor((198 / SEARCH_RADIUS) * (m.distance >= 0 ? m.distance : 0)));
              content += '<line x1="0" y1="' + (i * 17) + '" x2="200" y2="' + (i * 17) + '" style="stroke:darkgrey;stroke-width:1" />'
              content += '<rect x="1" y="' + (1 + i * 17) + '" width="' + width + '" height="16" style="fill:' + color + ';" />';
            }
            content += '<line x1="0" y1="' + matches.length * 17 + '" x2="200" y2="' + matches.length * 17 + '" style="stroke:darkgrey;stroke-width:1" />'
            for (var j = 0; j <= 10; j++) {
              content += '<line x1="' + (20 * j) + '" y1="0" x2="' + (20 * j) + '" y2="' + (1 + matches.length * 17) + '" style="stroke:darkgrey;stroke-width:1" />';
            }
            content += '</svg>';
          }

          if (allBestMatches.length === 0) {
            content += '<h5>No proximity match</h5>';
          } else {
            content += '<h5>Other proximity matches</h5>';
            makeSvg(allBestMatches);
          }
          bubble.setContent(content);
          bubble.setPosition(pos);
          bubble.open();
          e.stopPropagation();
          e.preventDefault();
        });
        objContainer.addObjects([tpMarker]);
        var k = tracePoints.indexOf(tp);
        if (k > 0) {
          var strip = new H.geo.LineString();
          strip.pushLatLngAlt(+tracePoints[k - 1].LATITUDE, +tracePoints[k - 1].LONGITUDE, 0);
          strip.pushLatLngAlt(+tp.LATITUDE, +tp.LONGITUDE, 0);
          objContainer.addObject(new H.map.Polyline(strip));
        }
      });
      if (opts && opts.fitBounds) {
        map.getViewModel().setLookAtData({
			bounds: objContainer.getBoundingBox()
		});
      }
    }

    function reset() {
      traceArea.value = DEFAULT_TRACE_HEADER;
      objContainer.removeAll();
    }

    function createIcon(color) {
      // Our classic marker with customizable color.
      var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
          '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
          ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
          '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
          ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
          '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
          ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="' + color + '"/>' +
          '</svg>';
      var options = {
        size: new H.math.Size(28, 36),
        anchor: new H.math.Point(14, 32),
        hitArea: new H.map.HitArea(H.map.HitArea.ShapeType.POLYGON, [0, 16, 0, 7, 8, 0, 18, 0, 26, 7, 26, 16, 18, 34, 8, 34])
      };
      return new H.map.Icon(svg, options);
    }

    map.addEventListener('tap', function (e) {
      if (matching > 0) {
        window.alert('Please wait until latest match is finalized.');
        return;
      }
      if (traceArea.value.lastIndexOf(DEFAULT_TRACE_HEADER, 0) != 0) traceArea.value = DEFAULT_TRACE_HEADER;
      var lastClickedPos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
      var numLines = (traceArea.value.match(/\r*\n/g) || []).length;
      traceArea.value += "\n" + numLines + "," + (Math.round(lastClickedPos.lat * 100000.0) / 100000.0) + "," + (Math.round(lastClickedPos.lng * 100000.0) / 100000.0);
      zoomToResult = false;
      match();
    });

    traceArea.addEventListener('dragover', function handleDragOver(e) {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, false);

    traceArea.addEventListener('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var r = new FileReader();
      r.onload = function () {
        traceArea.value = r.result;
        match({fitBounds: true});
      };
      r.readAsText(e.dataTransfer.files[0]);
    }, false);


    function loadFromFile(filename) {
      var req = new XMLHttpRequest();
      req.open('GET', '/sample_data/' + filename);
      req.onreadystatechange = function () {
        if (req.readyState != XMLHttpRequest.DONE) return;
        traceArea.value = req.responseText;
        match({fitBounds: true});
      };
      req.send();
    }

    return this;
  })();
  
	/**
	* Function triggers spatial layer requests explicitly
	*/
	function requestSpatial(layer,map){
		var boundingBox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		var zoom = map.getZoom();
		layer.getProvider().requestSpatials(boundingBox,zoom,true,false);
	}
	
	/*required in JS 3.1 to trigger spatial requests*/
	map.addEventListener("mapviewchangeend",function(){
		requestSpatial(ptLayer,map);
	})