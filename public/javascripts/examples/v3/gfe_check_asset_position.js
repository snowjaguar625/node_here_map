/**
   * @author Michele Comignano
   * @copyright (C) HERE 2015
   */

 var centerLat = 41.36162042312592;
 var centerLon = 2.1376044225728776;

 // Prefill values from URL if passed.
 (function setValuesFromUrl() {
   var indexOf = window.location.href.indexOf('?');
   if (indexOf < 0) return;
   var vars = window.location.href.slice(indexOf + 1).split('&');

   for (var i = 0; i < vars.length; i++) {
     nameVal = vars[i].split('=');
     var paramName = nameVal[0];
     if (!paramName) continue;
     var paramValue = nameVal[1];
     if (paramName === 'lat') centerLat = paramValue;
     if (paramName === 'lon') centerLon = paramValue;
      if (paramName === 'app_id') app_id = paramValue;
     if (paramName === 'app_code') app_code = paramValue;
     var elementById = document.getElementById(paramName);
     if (elementById) {
       elementById.value = decodeURIComponent(paramValue);
     }
   }

 })();


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

 // Check whether the environment should use hi-res maps
 var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

 // check if the site was loaded via secure connection
 var secure = (location.protocol === 'https:') ? true : false;

 // Create a platform object to communicate with the HERE REST APIs
 var platform = new H.service.Platform({
   useHTTPS: secure, app_id: app_id,
   app_code: app_code
 });
 maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

 // Instantiate a map in the 'map' div, set the base map to normal
 var DEFAULT_LAYER = 20180123;//quick fix for working Demo
 var layerIdElement = document.getElementById('layerId');

 if (!layerIdElement.value) {
   layerIdElement.value = DEFAULT_LAYER;
 }
 var defaultCenter = new H.geo.Point(centerLat, centerLon);
 var defaultZoom = 13;
 var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
   center: defaultCenter,
   zoom: defaultZoom,
   pixelRatio: hidpi ? 2 : 1
 });

 // Enable the map event system
 var mapevents = new H.mapevents.MapEvents(map);

 // Enable map interaction (pan, zoom, pinch-to-zoom)
 var behavior = new H.mapevents.Behavior(mapevents);

 // Enable the default UI
 var ui = H.ui.UI.createDefault(map, maptypes);

 //add JS API Release information
//  <!-- releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version; -->

 //add MRS Release information
//  <!-- loadMRSVersionTxt(); -->

 window.addEventListener('resize', function () {
   map.getViewPort().resize();
 });

 var geocoder = platform.getGeocodingService();

 var logArea = document.getElementById('logArea');
 logArea.log = function (str) {
   logArea.value += str + '\n';
   logArea.scrollTop = logArea.scrollHeight;
 };

 var circle;

 map.addEventListener('tap', callCheckPositionChanged);

 function callCheckPositionChanged(e) {

   var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
   var searchRadius = document.getElementById('maxDistance').value;
   var options = {
     search_radius: searchRadius,
     geom: 'local'
   };
   map.removeObjects(map.getObjects());
   circle = new H.map.Circle(p, searchRadius, circleOptions);
   map.addObject(circle);
   map.addObject(circle);
   map.addObject(new H.map.Marker(p));
   var gfe = platform.ext.getGeoFencingServiceCustom(document.getElementById('gfeUrl').value, 'gfe on maps not used');
   gfe.checkProximity(layerIdElement.value, p, options, onCheckPositionChanged);
 }

 function addPolygonToMap(poly, options) {
   var polygonStrip = new H.geo.Strip();
   var borderStrips = [new H.geo.Strip()];
   for (var k = 0; k < poly.length - 1; k++) {
     polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
     borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
     if (poly[k][2] === 'artificial') {
       borderStrips.push(new H.geo.Strip());
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

 function addLineToMap(line, options) {// TODO handle multiline
   var lineStrip = new H.geo.Strip();
   for (var k = 0; k < line.length; k++) {
     if (line[k] === 'artificial') continue;// our extension to geojson
     lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
   }
   map.addObject(new H.map.Polyline(lineStrip));
   return calculateCentroid(lineStrip);
 }


 function onCheckPositionChanged(resp, assetPosition, err) {
   if (err) {
     logArea.log('ERROR!: ' + resp.issues[0].message + '[' + resp.error_id + ']');
     return;
   }
   //var keys = [];
   var geometryResponse = null;
   if (resp.polygons != null) {
     geometryResponse = resp.polygons
   } else {
     geometryResponse = resp.geometries;
   }
   var centroids = [];
   var respLength = geometryResponse.length;
   for (var i = 0; i < respLength; i++) {
     var geom = parseWKT(geometryResponse[i].geometry);
     var dist = geometryResponse[i].distance;
     //keys.push(geometryResponse[i].attributes[getLabelAttributes()] + ' (' + dist + ')');
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
           centroids[i].push(addLineToMap(geom.coordinates[j]), boundingCircleIntersectsPolygonOptions);
           break;
         default:
           window.alert('Cannot draw matching geometry.');
       }
     }
   }
   // Draw distance lines then so they are over.
   for (var i = 0; i < respLength; i++) {
     var dist = geometryResponse[i].distance;
     addLineToNearestPoint(assetPosition, geometryResponse[i].nearestLat, geometryResponse[i].nearestLon, dist);
   }
   var labels = getLabelAttributes().split(",");
   logArea.log(respLength + (respLength === 1 ? ' match: ' : ' matches: '));
   // Draw geometry captions then so they are over.
   for (var i = 0; i < respLength; i++) {
     var label = "";
     for (var j = 0; j < labels.length; j++) {
       if (typeof geometryResponse[i].attributes[labels[j].trim()] !== "undefined")
         label = label + geometryResponse[i].attributes[labels[j].trim()] + ' ';
       else if(typeof geometryResponse[i].attributes.NAME !== "undefined")
         label = label + geometryResponse[i].attributes.NAME.trim() + ' ';
       else
         logArea.log("WARNING: Attribute " + labels[j] + " doesn't exist!");
     }
     addGeometryCaption(calculateWeightedCentroid(centroids[i]), label);
     logArea.log(label + '(' + centroids[i][0][0].lat.toFixed(5) + ',' + centroids[i][0][0].lng.toFixed(5) + ')');
   }
   // Keep the circle on top.
   map.removeObject(circle);
   map.addObject(circle);


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
   var strip = new H.geo.Strip();
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

 function getLabelAttributes() {
   return document.getElementById('labelAttributes').value;
 }

 function uploadLayer(file) {
   var layerId = layerIdElement.value;
   if (layerId == DEFAULT_LAYER) {
     logArea.log("Please don't overwrite the default layer");
     return;
   }
   var reader = new FileReader();
   reader.fileName = file.name;
   reader.readAsBinaryString(file);
   reader.onload = function (e) {
     var content;
     if (reader.fileName.indexOf(".zip", reader.fileName.length - 4) !== -1) {
       content = btoa(reader.result);
     } else {
       var zip = new JSZip();
       zip.file(reader.fileName, reader.result);
       content = zip.generate({type: "base64", compression: "DEFLATE", compressionOptions: {level: 6}});
     }
     var gfe = platform.ext.getGeoFencingServiceCustom(document.getElementById('gfeUrl').value, 'gfe on maps not used');
     gfe.uploadLayerCLE(layerId, content, uploadLayerCallback);
   };
 }

 function uploadLayerCallback(resp, err) {
   if (err) {
     logArea.log('ERROR!: ' + resp.issues[0].message + '[' + resp.error_id + ']');
     console.error(resp);
     return;
   }
   logArea.log("Layer submitted.");
 }

 // Geocode support.

 function geocode(searchText) {
   geocoder.geocode({
     searchText: searchText,
     additionalData: 'IncludeShapeLevel,default'
   }, function (result) {
     try {
       var pos = result.Response.View[0].Result[0].Location.DisplayPosition;
       map.setCenter(new H.geo.Point(pos.Latitude, pos.Longitude));
     } catch (err) {
       window.alert('Could not find location specified location.');
     }

   }, function (error) {
     alert(error);
   });
 }