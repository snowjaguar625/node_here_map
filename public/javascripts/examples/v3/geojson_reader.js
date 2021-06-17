/*
	author HERE
	(C) HERE 2014
	*/
	
	function showGeoJSONData (map) {
	  	
        // Create GeoJSON reader which will download the specified file.
        // Shape of the file was obtained by using HERE Geocoder API.
        // It is possible to customize look and feel of the objects.
        var reader = new H.data.geojson.Reader('/sample_data/berlin.json', {
          // This function is called each time parser detects a new map object
          style: function (mapObject) {
            // We can style parsed geo objects using setStyle method like this:
            if (mapObject instanceof H.map.Polygon) {
              mapObject.setStyle({
                fillColor: 'rgba(153, 0, 153, 0.5)',
                strokeColor: 'rgba(0, 0, 102, 0.5)',
                lineWidth: 3
              });
            }
          }
        });
      
        // Start parsing the file
        reader.parse();
      
        // Add layer which shows GeoJSON data on the map
        map.addLayer(reader.getLayer());
      }
  
      // Check whether the environment should use hi-res maps
      var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
      
      // check if the site was loaded via secure connection
      var secure = (location.protocol === 'https:') ? true : false;
  
      // Create a platform object to communicate with the HERE REST APIs
      var platform = new H.service.Platform({
          useHTTPS: secure,
          app_id: app_id,
          app_code: app_code
      }),
      maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
  
      // Instantiate a map in the 'map' div, set the base map to normal
      var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
          center: new H.geo.Point(52.51, 13.45),
          zoom: 11,
          pixelRatio: hidpi ? 2 : 1
      });
  
      // Do not draw under control panel
      map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
  
      // Enable the map event system
      var mapevents = new H.mapevents.MapEvents(map);
  
      // Enable map interaction (pan, zoom, pinch-to-zoom)
      var behavior = new H.mapevents.Behavior(mapevents);
  
      // Enable the default UI
      var ui = H.ui.UI.createDefault(map, maptypes);
  
      //add JS API Release information
      releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;
  
      //add MRS Release information
      loadMRSVersionTxt();
  
      // setup the Streetlevel imagery
      platform.configure(H.map.render.panorama.RenderEngine);
  
      window.addEventListener('resize', function() { map.getViewPort().resize(); });
  
      showGeoJSONData(map);