/**
   * @author Michele Comignano
   * (C) HERE 2015
   * author Sachin Jonda
   * (C) HERE 2019 -> migrate to Japan and latest API's
   */
  
 var appidPassed=false;
 function setValuesFromUrl() {
   var indexOf = window.location.href.indexOf('?');
   if (indexOf < 0) return;
   var vars = window.location.href.slice(indexOf + 1).split('&');

   for (var i = 0; i < vars.length; i++) {
     nameVal = vars[i].split('=');
     if (!nameVal[0]) continue;
     if (nameVal[0] === 'app_id') {
       app_id = nameVal[1];
       appidPassed=true;
     } else if (nameVal[0] === 'app_code') {
       app_code = nameVal[1];
     } 
   }

 }
 // check if appid, appcode are provided in the request
 setValuesFromUrl();

 
 // check if the site was loaded via secure connection
 var secure = (location.protocol === 'https:') ? true : false;

 var mapContainer = document.getElementById('mapContainer');

 platform = new H.service.Platform({
   apikey: api_key_jp,
   useHTTPS: secure
 });
 var mapTileService = platform.getMapTileService({type: 'base'});
 var maptypes = platform.createDefaultLayers();
 
 //Japan styling
   omvService = platform.getOMVService({
       path:  'v2/vectortiles/core/mc'
   });
   baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
   // create a Japan specific style
   style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

   // instantiate provider and layer for the basemap
   omvProvider = new H.service.omv.Provider(omvService, style);
   omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

 var map = new H.Map(mapContainer, omvlayer, {
   center: new H.geo.Point(35.68066, 139.8355),
   zoom: 12,
   pixelRatio: window.devicePixelRatio || 1
 });

 var geocoder = platform.getGeocodingService();

 var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
 behavior.disable(H.mapevents.Behavior.DBLTAPZOOM);

 window.addEventListener('resize', function () {
   map.getViewPort().resize();
 });

 var DEFAULT_LAYER = 347350018;//quick fix for working Demo

 // Used when connecting to be in the global scope.
 var gfe = platform.ext.getGeoFencingService(api_key_jp);

 var layerIdElement = document.getElementById('layerId');

 var growingShape = null;
 var growingStrip = new H.geo.LineString();

 // Current Layer polygons.
 var polygons = [];

 var ui = H.ui.UI.createDefault(map, maptypes);

 ui.removeControl('mapsettings');
 //ui.removeControl('zoom');

 var NORMAL_STYLE = {
   strokeColor: "#f00",
   lineWidth: 1
 };
 var SELECTED_STYLE = {
   strokeColor: 'red',
   lineWidth: 2
 };

 var polygonOptions = {style: NORMAL_STYLE};



 map.addEventListener('dbltap', finalizePolygon);
 map.addEventListener('tap', initializeOraddPointToPolygon);
 map.addEventListener('pointermove', refreshNonFinalizedPolygon);
 
 
 


 function finalizePolygon(e) {
   if (e.originalEvent.which == 1 && growingShape == null) {
     var point = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

     var handleMarker = new H.map.Marker(point);
     makeDraggable(handleMarker, console.log);

     var name = window.prompt("Please specify value for key attribute NAME:");
     var strip = new H.geo.LineString();
     strip.pushPoint(point);

     polygons.push({
       $name: name,
       getStrip: function () {
         return strip;
       }
     });

     map.addObject(handleMarker);
     e.originalEvent.stopImmediatePropagation();
     return;
   }

   if (e.originalEvent.which !== 3) {
     return;// Only right click.
   }
   e.originalEvent.stopImmediatePropagation();

   growingShape.setGeometry(new H.geo.Polygon(growingStrip));

   map.removeObject(growingShape);// will be added as a group

   makePolygonModifiableAndDraggable(growingShape);

   var name = window.prompt("Please specify value for key attribute NAME:");
   growingShape.$name = name;

   growingShape = null;
   growingStrip = new H.geo.LineString();
 }

 function refreshNonFinalizedPolygon(e) {
   var point = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
   var strip = new H.geo.LineString(growingStrip.getLatLngAltArray().concat(point.lat, point.lng, point.alt));
   if (growingStrip.getPointCount() == 1) {
     // We placed first point, want to show line on cursor move.
     if (!growingShape) {
       growingShape = new H.map.Polyline(strip, polygonOptions);
       map.addObject(growingShape);
     } else {
       growingShape.setGeometry(strip);
     }
   } else if (growingStrip.getPointCount() === 2) {
     if (growingShape instanceof H.map.Polyline) {
       map.removeObject(growingShape);
       growingShape = new H.map.Polygon(strip, polygonOptions);
       map.addObject(growingShape);
     } else {
       growingShape.setGeometry(new H.geo.Polygon(strip));
     }
   } else if (growingStrip.getPointCount() > 2) {
     growingShape.setGeometry(new H.geo.Polygon(strip));
   }
 }

 function initializeOraddPointToPolygon(e) {
   // Only right click, left click for navigation.
   if (e.originalEvent.which !== 3) {
     return;
   }

   growingStrip.pushPoint(map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY));
 }
 function geoCoderV8(searchText){
   var searchURL = 'https://geocode.search.hereapi.com/v1/geocode?limit=1&lang=en_GB&q=' + searchText + '&apikey='+ api_key_jp;
   $.ajax({
       url: searchURL
   }).done(function(result){
       geoCoderV8Response(result);
   });
 }
 function geoCoderV8Response(result){
   var pos = result.items[0].position;
       map.setCenter(new H.geo.Point(pos.lat, pos.lng));
 }

 // Geocode support.

 /*function geocode(searchText) {
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
 }*/

 function makeHandles(polygon, polygonHandles) {
   var polygonStrip = polygon.getGeometry();
   for (var k = 0; k < polygonStrip.getExterior().getPointCount(); k++) {
     var handleCenter = polygonStrip.getExterior().extractPoint(k);
     var handleMarker = new H.map.Marker(handleCenter);
     handleMarker.draggable = true;

     handleMarker.addEventListener('dragstart', function () {
       document.body.style.cursor = 'pointer';
       behavior.disable();
     }, false);
     handleMarker.addEventListener('dragend', function () {
       polygonHandles.removeObjects(polygonHandles.getObjects());
       makeHandles(polygon, polygonHandles);
       document.body.style.cursor = 'auto';
       behavior.enable();
       behavior.disable(H.mapevents.Behavior.DBLTAPZOOM);
     }, false);
     (function (closureK) {// funny closures.
       handleMarker.addEventListener('drag', function (ev) {
         var target = ev.target;
         var pointer = ev.currentPointer;
         var screenToGeo = map.screenToGeo(pointer.viewportX, pointer.viewportY);
         target.setGeometry(screenToGeo);
         var newStrip = new H.geo.LineString();
         polygonStrip.getExterior().eachLatLngAlt(function (lat, lng, alt, idx) {
           if (idx !== closureK) {
             newStrip.pushLatLngAlt(lat, lng, 0);
           } else {
             newStrip.pushLatLngAlt(screenToGeo.lat, screenToGeo.lng, 0);
           }
         });
         polygon.setGeometry(new H.geo.Polygon(newStrip));
       }, false);
     })(k);
     polygonHandles.addObject(handleMarker);
   }
 }

 function makePolygonModifiableAndDraggable(polygon) {
   var polygonStuff = new H.map.Group({volatility: true});
   polygonStuff.addObject(polygon);
   var polygonHandles = new H.map.Group();
   polygonStuff.addObject(polygonHandles);

   var oldStrip = polygon.getGeometry();
   var newStrip = new H.geo.LineString();
   // fix the dbltap adding two points in last place, removing last.
   for (var i = 0; i < oldStrip.getExterior().getPointCount() - 1; i++) {
     newStrip.pushPoint(oldStrip.getExterior().extractPoint(i));
   }
   polygon.setGeometry(new H.geo.Polygon(newStrip));


   makeHandles(polygon, polygonHandles);
   makeDraggable(polygon, function (newStrip) {
     polygonHandles.removeObjects(polygonHandles.getObjects());
     makeHandles(polygon, polygonHandles);
   });

   map.addObject(polygonStuff);

   polygons.push(polygon);
 }

 function saveCurrentLayer() {

   if (layerIdElement.value == DEFAULT_LAYER) {
     window.alert(DEFAULT_LAYER + " cannot be used as layer id.");
     return;
   }

   var file = 'name\twkt\n';
   console.log("polygons:: ", polygons);
   for (var i = 0; i < polygons.length; i++) {
       var stripP;
       if(polygons[i] instanceof H.map.Polygon){
           stripP = polygons[i].getGeometry().getExterior();
       }else{
           stripP = polygons[i].getStrip();
       }
       file += polygons[i].$name + '\t' + polygonStripToWkt(stripP) + '\n';
   }
   var zip = new JSZip();
   zip.file("layer.wkt", file);
   var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
   gfe.uploadLayerCLE(layerIdElement.value, content, function (data, err) {
     if (err) {
       window.alert('Error trying save growingShape: "' + err.toString() + '"');
       return;
     }
     window.alert("Layer uploaded will be available soon!");
   });
 }

 function makeDraggable(object, draggedCallback) {
   object.draggable = true;
   object.addEventListener('drag', function (evt) {
     var newCoord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY));
     if (newCoord.lat != startCoord.lat || newCoord.lng != startCoord.lng) {
       if (!object instanceof H.map.Marker) {
         var strip = object.getGeometry();
         var newStrip = new H.geo.LineString();
         strip.eachLatLngAlt(function (lat, lng, alt, idx) {
           var diffLat = (lat - startCoord.lat);
           var diffLng = (lng - startCoord.lng);
           newStrip.pushLatLngAlt(newCoord.lat + diffLat, newCoord.lng + diffLng, 0);
         });
         object.setGeometry(new H.geo.Polygon(newStrip));
         draggedCallback(newStrip);
       } else {
         object.setGeometry(newCoord);
       }
       if (!map.getViewModel().getLookAtData().bounds.getBoundingBox().containsPoint(newCoord)) {
         map.setCenter(newCoord, true);
       }
       startCoord = newCoord;
     }
   });

   object.addEventListener('dragstart', function (evt) {
     document.body.style.cursor = 'pointer';
     startCoord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY));
     behavior.disable();
   });

   object.addEventListener('dragend', function (evt) {
     document.body.style.cursor = 'auto';
     behavior.enable();
     behavior.disable(H.mapevents.Behavior.DBLTAPZOOM);
   });
 }

 function openCheckPositionDemo() {
   var layerId = document.getElementById('layerId').value;
   var lat = map.getCenter().lat;
   var lon = map.getCenter().lng;
   
   if(appidPassed){
       window.open('gfe_check_asset_position_jp?layerId=' + layerId + '&labelAttributes=NAME&lat=' + lat + '&lon=' + lon+"&app_id="+app_id+"&app_code="+app_code);
   }else{
        window.open('gfe_check_asset_position_jp?layerId=' + layerId + '&labelAttributes=NAME&lat=' + lat + '&lon=' + lon);
   }
  
 }