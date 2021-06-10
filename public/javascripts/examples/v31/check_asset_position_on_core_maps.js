/**
   * @author Michele Comignano
   * @copyright (C) HERE 2015
   * // author Mykyta
	// (C) HERE 2019 -> migrate to 3.1
   */

    var boundingCircleInsidePolygonOptions = {
        style: {
          fillColor: 'rgba(0, 150, 0, 0.8)',
          lineWidth: 0
        }
      };
    
      var assetInsidePolygonOptions = {
        style: {
          fillColor: 'rgba(0, 255, 0, 0.8)',
          lineWidth: 0
        }
      };
    
      var boundingCircleIntersectsPolygonOptions = {
        style: {
          fillColor: 'rgba(230, 200, 0, 0.3)',
          lineWidth: 0
        }
      };
    
      var circleOptions = {
        style: {
          fillColor: 'rgba(0, 0, 0, 0.0)',
          lineWidth: 2,
          strokeColor: 'red'
        }
      };
    
      var distanceOptions = {
        style: {
          fillColor: 'rgba(0, 0, 0, 0.0)',
          lineWidth: 2,
          lineDash: [5, 5],
          strokeColor: 'red'
        }
      };
    
    
      // check if the site was loaded via secure connection
      var secure = (location.protocol === 'https:') ? true : false;
    
      // Create a platform object to communicate with the HERE REST APIs
      var platform = new H.service.Platform({
        apikey: api_key,
        useHTTPS: secure
      });
      maptypes = platform.createDefaultLayers();
    
      // Instantiate a map in the 'map' div, set the base map to normal
      var DEFAULT_LAYER = 347350018;//quick fix for working Demo
      document.getElementById('layerId').value = DEFAULT_LAYER;
      var defaultCenter = new H.geo.Point(50.16220, 8.53324);
      var defaultZoom = 13;
      var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
        center: defaultCenter,
        zoom: defaultZoom,
        pixelRatio: window.devicePixelRatio || 1
      });
    
      // Enable the map event system
      var mapevents = new H.mapevents.MapEvents(map);
    
      // Enable map interaction (pan, zoom, pinch-to-zoom)
      var behavior = new H.mapevents.Behavior(mapevents);
    
      // Enable the default UI
      var ui = H.ui.UI.createDefault(map, maptypes);
    
      //add JS API Release information
    //   <!-- releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version; -->
    
      //add MRS Release information
    //   <!-- loadMRSVersionTxt(); -->
    
      window.addEventListener('resize', function () {
        map.getViewPort().resize();
      });
    
      var gfe = platform.ext.getGeoFencingService();
    
      var logArea = document.getElementById('logArea');
      logArea.log = function (str) {
        logArea.value += str + '\n';
        logArea.scrollTop = logArea.scrollHeight;
      };
    
      var circle;
    
      map.addEventListener('tap', callCheckPositionChanged);
    
      // Fills combo with layers.
      gfe.getMapLayers(onGetMapLayers);
    
      function callCheckPositionChanged(e) {
    
        var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
        var searchRadius = document.getElementById('maxDistance').value;
        var options = {
          search_radius: searchRadius,
          keyattributes: getKeyAttributeName(),
          geom: 'local'
        };
        map.removeObjects(map.getObjects());
        circle = new H.map.Circle(p, searchRadius, circleOptions);
        map.addObject(circle);
        map.addObject(new H.map.Marker(p));
        gfe.checkOnMap(document.getElementById('layerId').value, p, options, onCheckPositionChanged);
      }
    
      function addPolygonToMap(poly, options) {
        var polygonStrip = new H.geo.LineString();
        var borderStrips = [new H.geo.LineString()];
        for (var k = 0; k < poly.length - 1; k++) {
          polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
          borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
          if (poly[k][2] === 'artificial') {
            borderStrips.push(new H.geo.LineString());
          }
        }
        // If the polygon was joining in non artificial points.
        if (k > 0 && !poly[k][2] && !poly[0][2]) {
          borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
        }
    
    
        var polygon = new H.map.Polygon(polygonStrip, options);
        map.addObject(polygon);
        for (var i = 0; i < borderStrips.length; i++) {
          var borderStrip = borderStrips[i];
          if (borderStrip.getPointCount() <= 1) continue;
          map.addObject(new H.map.Polyline(borderStrip));
        }
        return calculateCentroid(polygonStrip);
      }
    
      function addPointToMap(point, options) {
        map.addObject(new H.map.Marker(new H.geo.Point(point[1], point[0], options)));
        return [new H.geo.Point(point[1], point[0]), 0];
      }
    
      function addLineToMap(line, options) {
        var lineStrip = new H.geo.LineString();
        for (var k = 0; k < line.length; k++) {
          if (line[k] === 'artificial') continue;// our extension to geojson
          lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
        }
        map.addObject(new H.map.Polyline(lineStrip, options));
        return calculateCentroid(lineStrip);
      }
    
      function onCheckPositionChanged(resp, assetPosition, err) {
        if (err) {
          logArea.log(resp.requestId + ': ' + resp.errors[0].type + ", " + resp.errors[0].message);
          return;
        }
        var keys = [];
        var geometryResponse = null;
        if (resp.polygons != null) {
          geometryResponse = resp.polygons
        } else {
          geometryResponse = resp.geometries;
        }
        var centroids = [];
        for (var i = 0; i < geometryResponse.length; i++) {
          var geom = parseWKT(geometryResponse[i].geometry);
          var dist = geometryResponse[i].distance;
          keys.push(geometryResponse[i].attributes[getKeyAttributeName()] + ' (' + dist + ')');
          centroids[i] = [];
          for (var j = 0; j < geom.coordinates.length; j++) {
            switch (geom.type) {
              case 'MultiPolygon':
                for (var k = 0; k < geom.coordinates[j].length; k++) {
                  var style;
                  if (dist === -99999999) {
                    style = boundingCircleInsidePolygonOptions;
                  } else if (dist < 0) {
                    style = assetInsidePolygonOptions;
                  } else {
                    style = boundingCircleIntersectsPolygonOptions;
                  }
                  centroids[i].push(addPolygonToMap(geom.coordinates[j][k], style));
                }
                break;
              case 'MultiPoint':
                centroids[i].push(addPointToMap(geom.coordinates[j][0]), boundingCircleIntersectsPolygonOptions);
                break;
              case 'MultiLineString':
                  console.log(geom, j, geom.coordinates[j]);
                  centroids[i].push(addLineToMap(geom.coordinates[j]), boundingCircleIntersectsPolygonOptions);
                break;
              default:
                window.alert('Cannot draw matching geometry.');
            }
          }
        }
        // Draw distance lines then so they are over.
        for (var i = 0; i < geometryResponse.length; i++) {
          var dist = geometryResponse[i].distance;
          addLineToNearestPoint(assetPosition, geometryResponse[i].nearestLat, geometryResponse[i].nearestLon, dist);
        }
        // Draw geometry captions then so they are over.
        for (var i = 0; i < geometryResponse.length; i++) {
          addGeometryCaption(calculateWeightedCentroid(centroids[i]), geometryResponse[i].attributes[getKeyAttributeName()]);
        }
        // Keep the circle on top.
        map.removeObject(circle);
        map.addObject(circle);
    
        logArea.log(geometryResponse.length + ' matches: ' + keys.join(', '));
      }
    
      function addGeometryCaption(p, caption) {
        var markerElement = document.createElement('div');
        markerElement.className = 'caption';
        markerElement.innerHTML = caption;
        map.addObject(new H.map.DomMarker(p, {
          icon: new H.map.DomIcon(markerElement)
        }));
      }
    
      function addLineToNearestPoint(assetPosition, fenceLat, fenceLon, distance) {
        if (distance === -99999999) {
          // Cannot draw because distance is not available.
          return;
        }
        var strip = new H.geo.LineString();
        strip.pushPoint(assetPosition);
        strip.pushPoint({lat: fenceLat, lng: fenceLon});
        map.addObject(new H.map.Polyline(strip, distanceOptions));
        var markerElement = document.createElement('div');
        markerElement.className = 'distance';
        markerElement.innerHTML = distance;
        map.addObject(new H.map.DomMarker({
          lat: (assetPosition.lat + fenceLat) / 2,
          lng: (assetPosition.lng + fenceLon) / 2
        }, {icon: new H.map.DomIcon(markerElement)}));
      }
    
      function getKeyAttributeName() {
        return document.getElementById('keyAttributeName').value;
      }
    
      function onGetMapLayers(layers, err) {
        if (err) {
          window.alert("Could not get layers from DPE");
          return;
        }
        var layerList = document.getElementById("layerId");
        layers.forEach(function (l) {
          var opt = document.createElement('option');
          opt.value = l.name;
          opt.innerHTML = l.name;
          opt.$attributes = l.attributes;
          layerList.appendChild(opt);
        });
        // Set attributes for the selection.
        setAvailableKeyAttributes(layerList.options[layerList.selectedIndex].$attributes);
      }
    
      function setAvailableKeyAttributes(attrs) {
        var keyAttributes = document.getElementById("keyAttributeName");
        // Reset current attributes list.
        keyAttributes.options.length = 0;
        attrs.forEach(function (attr) {
          var opt = document.createElement('option');
          opt.value = attr;
          opt.innerHTML = attr;
          keyAttributes.appendChild(opt);
        });
      }