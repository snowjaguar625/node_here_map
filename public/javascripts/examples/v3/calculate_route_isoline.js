/*
   * authors mf
   * (C) HERE 2015
   *
   * This is an example implementation of the isoline route calculation offered by HERE.
   *
   */

(function setValuesFromUrl() {
    var indexOf = window.location.href.indexOf('?');
    if (indexOf < 0) return;
    var vars = window.location.href.slice(indexOf + 1).split('&');

    for (var i = 0; i < vars.length; i++) {
      nameVal = vars[i].split('=');
      if (!nameVal[0]) continue;
      document.getElementById(nameVal[0]).value = decodeURIComponent(nameVal[1]);
    }

  })();
  
  //Replace the default credentials with custom ones from user input
  function setCredentials(){
  	var appId = document.getElementById('customAppId').value;
    var appCode = document.getElementById('customAppCode').value;
	if( appId.length > 0 && appCode.length > 0 ) {
            app_id = appId;
			app_code = appCode;
        }
  }

  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

  var mapContainer = document.getElementById('mapContainer');

  // check if the site was loaded via secure connection
  var secure = (location.protocol === 'https:') ? true : false;
  var platform = new H.service.Platform({
    app_id: app_id,
    app_code: app_code,
    useHTTPS: secure
  });
  var basemaptileService = platform.getMapTileService({'type': 'base'});
  var greyTileLayer = basemaptileService.createTileLayer("maptile", "normal.day.grey", hidpi ? 512 : 256, "png8", null);

  // Create a platform object to communicate with the HERE REST APIs

  var maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
  var geocoder = platform.getGeocodingService();
  var router = platform.getRoutingService();
  var group = new H.map.Group();
  var markerGroup = new H.map.Group();

  var map = new H.Map(mapContainer, greyTileLayer, {
    center: center,
    zoom: zoom
  });

  // Do not draw under control panel
  map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

  // add behavior control
  new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // add UI
  var ui = H.ui.UI.createDefault(map, maptypes);

  //add JS API Release information
  releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version; //may be a good info to display

  //helper
  var releaseGeocoderShown = false;
  var releaseRoutingShown = false;

  // setup the Streetlevel imagery
  platform.configure(H.map.render.panorama.RenderEngine);

  // add window resizing event listener
  window.addEventListener('resize', function () {
    map.getViewPort().resize();
  });

  var timeRadioButton = document.getElementById('time-radio-button');
  var detourType;
  function detourTypeChanged(input) {
    detourType = input.value;
    document.getElementById('max-detour-time').style.display = input.value === 'time' ? 'block' : 'none';
    document.getElementById('max-detour-distance').style.display = input.value === 'distance' ? 'block' : 'none';
  }

  timeRadioButton.click();

  // add long click in map event listener
  map.addEventListener('longpress', handleLongClickInMap);

  var routeButton = document.getElementById("routeButton");
  var start = document.getElementById("start");
  var dest = document.getElementById("dest");

  var feedbackTxt = document.getElementById("feedbackTxt");
  var pointA;
  var pointB;
  var startMarker = null;
  var destMarker = null;
  var bErrorHappened = false;
  var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination

  map.addObject(markerGroup);
  map.addObject(group);

  /************************************

   Geocoding and routing methods

   ************************************/

  /***/
  function clearLastRouteCalculation() {
    bErrorHappened = false;
    bLongClickUseForStartPoint = true;
    group.removeAll();

  }

  /************************************
   Start Isoline Route Calculation
   ************************************/
  var startRouteCalculation = function () {
    clearLastRouteCalculation();
    geocode(start.value, true, calculateRouteIsoline);
  };
  routeButton.onclick = startRouteCalculation;

  /********************************************************
   Start/Destination selectin via LongClick in map
   ********************************************************/
  function handleLongClickInMap(currentEvent) {
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

    if (bLongClickUseForStartPoint) {
      clearLastRouteCalculation();
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      start.value = line1;
      pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (startMarker != null) {
        markerGroup.removeObject(startMarker);
      }
      startMarker = new H.map.Marker(pointA,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(startMarker);
      bLongClickUseForStartPoint = false;
    } else {
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      dest.value = line1;
      pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (destMarker != null) {
        markerGroup.removeObject(destMarker);
      }
      destMarker = new H.map.Marker(pointB,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(destMarker);
      bLongClickUseForStartPoint = true;
    }
  }

  /************************************
   Geocode start/destination
   ************************************/
  function geocode(searchTerm, start, cb) {
    //add Geocoder Release information if not already done
    if (releaseGeocoderShown == false) {
      loadGeocoderVersionTxt();
      releaseGeocoderShown = true;
    }
    geocoder.search({
      searchText: searchTerm
    }, function (result) {
      var pos;
      if (result.Response.View[0].Result[0].Location != null) {
        pos = result.Response.View[0].Result[0].Location.DisplayPosition;
      } else {
        pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
      }

      if (start) pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
      else pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

      if (result.Response.View[0].Result[0].Location != null) {
        address = result.Response.View[0].Result[0].Location.Address;
      } else {
        address = result.Response.View[0].Result[0].Place.Locations[0].Address;
      }

      line1 = pos.Latitude + " " + pos.Longitude;
      line2 = address.Label;

      if (start) {
        if (startMarker != null) {
          markerGroup.removeObject(startMarker);
        }
        startMarker = new H.map.Marker(pointA, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(startMarker);

      } else {
        if (destMarker != null) {
          markerGroup.removeObject(destMarker);
        }
        destMarker = new H.map.Marker(pointB, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(destMarker);
        map.setViewBounds(markerGroup.getBounds());
      }

      if (start) geocode(dest.value, false, cb);
      else cb(pointA, pointB);
    }, alert);
  }

  /************************************
   Actual Isoline Route Calculation
   ************************************/
  var calculateRouteIsoline = (function () {
    var layer;

    return function (start, destination) {
      if (layer) map.removeLayer(layer);

      var params = {
        app_id: app_id,
        app_code: app_code,
        waypoint0: start.lat + "," + start.lng, //enable these two waypoint0 and waypoint1 parameters once the CLE gets deployed to the CIT.
        waypoint1: destination.lat + "," + destination.lng,
        geom: 'local'
      };
      params['max_detour_' + detourType] = document.getElementById('max-detour-' + detourType).value;

      feedbackTxt.innerHTML = 'Request sent, please wait...';
      var provider = new H.datalens.RawDataProvider({
        dataUrl: document.getElementById('serverURL').value + '/2/calculaterouteisoline.json?' + Object.keys(params).map(function (k) {
          return k + '=' + params[k]
        }).join('&'),
        dataToFeatures: function (data) {
          var features = JSON.parse(data).geometries.map(function (g) {

            var coords = g.geometry.substring(12, g.geometry.length - 1).split(', ').map(function (p) {
              return p.split(' ').map(parseFloat);
            });

            g.attributes.partOfRoute = g.partOfRoute;
            return {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coords
              },
              properties: g.attributes
            };
          });
          return features;
        }
      });

      function drawTilePoint(ctx, tp) {
        var geom = tp.data.geometry;
		console.log(geom);
        if (geom.length == 0) return;
        ctx.strokeStyle = tp.data.properties.partOfRoute ? 'black' : '#488AC7';
        ctx.lineWidth = (tp.data.properties.partOfRoute ? 6 : 2);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        geom.forEach(function (g) {
          ctx.beginPath();
          ctx.moveTo(g[0][0] >> 4, g[0][1] >> 4);
          for (var i = 1; i < g.length - 1; i++) {
            ctx.lineTo(g[i][0] >> 4, g[i][1] >> 4);
          }
          ctx.lineTo(g[g.length - 1][0] >> 4, g[g.length - 1][1] >> 4);
          ctx.stroke();
        });
      }

      layer = new H.datalens.RasterLayer(provider, {
        rowToTilePoint: function (row, x, y) {
          return {x: x, y: y, data: row};
        },
        dataToRows: function (data) {
          feedbackTxt.innerHTML = 'Response received successfully.';
          return data.features;
        },
        renderTile: function (tilepoint, canvas, zoom) {
          if (tilepoint.length == 0) return;
          var ctx = canvas.getContext('2d');

          // Draw main route first.
          tilepoint.forEach(function (tp) {
            tp.data.properties.partOfRoute && drawTilePoint(ctx, tp);
          });
          tilepoint.forEach(function (tp) {
            !tp.data.properties.partOfRoute && drawTilePoint(ctx, tp);
          });
        }
      });
      map.addLayer(layer);
    }
  })();

  //--- Helper - Create Start / Destination marker
  var createIconMarker = function (line1, line2) {
    var svgMarker = svgMarkerImage_Line;
    svgMarker = svgMarker.replace(/__line1__/g, line1);
    svgMarker = svgMarker.replace(/__line2__/g, (line2 != undefined ? line2 : ""));
    svgMarker = svgMarker.replace(/__width__/g, (line2 != undefined ? line2.length * 4 + 20 : (line1.length * 4 + 80)));
    svgMarker = svgMarker.replace(/__widthAll__/g, (line2 != undefined ? line2.length * 4 + 80 : (line1.length * 4 + 150)));
    return new H.map.Icon(svgMarker, {
      anchor: new H.math.Point(24, 57)
    });
  };