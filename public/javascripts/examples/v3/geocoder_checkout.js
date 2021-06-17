/*
   * author boris.guenebaut@here.com
   * (C) HERE 2016
   */

   // Execute the app.
   kickstart();

   /**
    * Encapsulates the code for this particular example.
    */
   function kickstart() {
     // Check whether the environment should use hi-res maps.
     var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
 
     // Check if the site was loaded via secure connection.
     var secure = (location.protocol === 'https:') ? true: false;
 
     // Create a platform object to communicate with the HERE REST APIs.
     var platform = new H.service.Platform({
       app_id: app_id,
       app_code: app_code,
       useHTTPS: secure
     });
     var maptypes = platform.createDefaultLayers(hidpi ? 512: 256, hidpi ? 320: null);
     var geocoder = platform.getGeocodingService();
 
     // Override center and zoom.
     center = {lat: 47.609722, lng: -122.333056};
     zoom = 12;
 
     // Instantiate a map in the 'map' div, set the base map to normal.
     var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
       center: center,
       zoom: zoom,
       pixelRatio: hidpi ? 2: 1
     });
 
     // Create and set flame map style.
     map.setBaseLayer(getFlameTileLayer());
 
     // Enable the map event system.
     var mapevents = new H.mapevents.MapEvents(map);
 
     // Enable map interaction (pan, zoom, pinch-to-zoom).
     var behavior = new H.mapevents.Behavior(mapevents);
 
     // Enable the default UI.
     var ui = H.ui.UI.createDefault(map, maptypes);
 
     // Setup the Streetlevel imagery.
     platform.configure(H.map.render.panorama.RenderEngine);
 
     // If the window is resized, we need to resize the viewport.
     window.addEventListener('resize', function() { map.getViewPort().resize(); });
 
     // Enable marker drag & drop on map.
     enableDragAndDrop(map, behavior);
 
     // Add API Release information.
     releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;
     loadMRSVersionTxt();
     loadGeocoderVersionTxt();
 
     // Focus on search input.
     $('#search').focus();
 
     // Init autocomplete.
     initAutocomplete();
 
     /**
      * Creates the Flame tile layer.
      */
     function getFlameTileLayer() {
       var maptiler = platform.getMapTileService({'type': 'base'});
       var flameStyleLayer = maptiler.createTileLayer(
         'maptile',
         'normal.day',
         256,
         'png8',
         {'style': 'flame'}
       );
       return flameStyleLayer;
     }
 
     /**
      * Initializes the Geocoder Autocomplete widget.
      */
     function initAutocomplete() {
       // Configure autocomplete widget via JQuery UI toolkit.
       $.widget('custom.autocompleteHighlight', $.ui.autocomplete, {
         _renderItem: function (ul, item) {
           return $('<li>' + item.label + '</li>').appendTo(ul);
         }
       });
 
       $('#search').autocompleteHighlight({
         source: function (request, response) {
           $.ajax({
             url: 'https://autocomplete.geocoder.api.here.com/6.2/suggest.json',
             dataType: 'json',
             data: {
               maxresults: 5,
               query: request.term,
               beginHighlight: '<mark>',
               endHighlight: '</mark>',
               app_id: app_id,
               app_code: app_code
             },
 
             success: function (data) {
               response($.map(data.suggestions, function (item) {
                 value = item.label.replace(/(<mark>|<\/mark>)/gm, '');
                 name = item.label;
                 return {
                   label: name,
                   value: value
                 }
               })
               );
             }
           });
         },
         minLength: 2,
         select: function (event, ui) {
           if (ui.item) {
             geocode(ui.item.value);
           }
           return true;
         },
       });
 
       $('#search').keypress(function (e) {
         if (e.which == 13) {
           $('.ui-menu-item').hide();
           geocode($('#search').val());
         }
       });
     }
 
     /**
      * Enables object drag & drop on given map.
      */
     function enableDragAndDrop(map, behavior) {
       // Disable the default draggability of the underlying map
       // when starting to drag a marker object.
       map.addEventListener('dragstart', function(e) {
         var target = e.target;
         if (target instanceof H.map.Marker) {
           // Disable default behavior related to drag & drop.
           behavior.disable();
         }
       }, false);
 
       // Re-enable the default draggability of the underlying map
       // when dragging has completed.
       map.addEventListener('dragend', function(e) {
         var target = e.target;
         if (target instanceof mapsjs.map.Marker) {
           // Get latest dragged position and reverse geocode it.
           var pointer = e.currentPointer;
           var point = map.screenToGeo(pointer.viewportX, pointer.viewportY);
           reverseGeocode(point);
           // Enable behavior again.
           behavior.enable();
         }
       }, false);
 
       // Listen to the drag event and move the position of the marker
       // as necessary.
        map.addEventListener('drag', function(e) {
         var target = e.target;
         if (target instanceof mapsjs.map.Marker) {
           // Update position.
           var pointer = e.currentPointer;
           var point = map.screenToGeo(pointer.viewportX, pointer.viewportY);
           target.setPosition(point);
         }
       }, false);
     }
 
     /**
      * Wraps geocoder service.
      */
     function geocode(address) {
       parameters = {
         searchText: address,
         maxResults: 1
       };
 
       geocoder.geocode(
         parameters,
         onSuccess,
         onError
       );
 
       function onSuccess(result) {
         // Clear map.
         map.removeObjects(map.getObjects());
 
         var locations = result.Response.View[0].Result;
 
         // Add a marker for each location found
         for (var i = 0; i < locations.length; i++) {
           // Get display position.
           var position = {
             lat: locations[i].Location.DisplayPosition.Latitude,
             lng: locations[i].Location.DisplayPosition.Longitude
           };
 
           // Create and add marker.
           var marker = new H.map.Marker(position, {
             icon: createImgMarkerIcon()
           });
           marker.draggable = true;
           map.addObject(marker);
 
           // Set map view.
           var topLeft = locations[0].Location.MapView.TopLeft;
           var bottomRight = locations[0].Location.MapView.BottomRight;
           var mapview = new H.geo.Rect(topLeft.Latitude, topLeft.Longitude, bottomRight.Latitude, bottomRight.Longitude);
           map.setViewBounds(mapview);
 
           // Set result label to search value.
           var label = locations[i].Location.Address.Label;
           
           // Update search input.
           $('#search').val(label);
           // Blur from element to prevent keyboard to show up on mobile devices.
           $('#search').blur();
         }
       }
 
       function onError(error) {
         console.error("Error while geocoding: " + error);
       }
     }
 
     /**
      * Wraps reverse geocoder service.
      */
     function reverseGeocode(point) {
       parameters = {
         prox: [point.lat, point.lng, 100].join(','),
         mode: 'retrieveAddresses',
         maxResults: 1
       };
 
       geocoder.reverseGeocode(
         parameters,
         onSuccess,
         onError
       );
 
       function onSuccess(result) {
         var locations = result.Response.View[0].Result;
 
         // Add a marker for each location found
         for (var i = 0; i < locations.length; i++) {
           // Set result label to search value.
           var label = locations[i].Location.Address.Label;
           $('#search').val(label);
         }
       }
 
       function onError(error) {
         console.error("Error while reverse geocoding: " + error);
       }
     }
 
     /**
      * Creates icon from image.
      */
     function createImgMarkerIcon () {
       var img = document.createElement('img');
       img.src = 'http://a.dryicons.com/images/icon_sets/stylistica_icons_set/png/64x64/home.png';
 
       return new H.map.Icon(img, {
         anchor: {x: 32, y: 32}
       });
     }
 
   }