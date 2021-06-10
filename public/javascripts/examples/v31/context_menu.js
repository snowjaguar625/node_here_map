// author asadovoy
	// (C) HERE 2019 -> migrate to 3.1
    
    // check if the site was loaded via secure connection
    var secure = (location.protocol === 'https:') ? true : false;

    // Create a platform object to communicate with the HERE REST APIs
    var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
    }), maptypes = platform.createDefaultLayers();
    
    // Instantiate a map in the 'map' div, set the base map to normal
    var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
        center: new H.geo.Point(50.11238,8.67095),
        zoom: 12,
        pixelRatio: window.devicePixelRatio || 1
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
    
    
    window.addEventListener('resize', function(){
        map.getViewPort().resize();
    });
    
    // Get an instance of the geocoding service:
    var geocoder = platform.getGeocodingService();
    
    var notReverseGeocoded = true;
    var address = "", firstMarker = null, lastMarker = null;
    // instance of routing service
    var router = platform.getRoutingService();
    var clickCoords = null, polyline;
    var group = new H.map.Group();
    map.addObject(group);
    
    
    // add context menu listner  
    map.addEventListener('contextmenu', function(e){
        // reverse geocode at the point of click if not already
        if (notReverseGeocoded) {
            clickCoords = map.screenToGeo(e.viewportX, e.viewportY);
            var reverseGeocodingParameters = {
                prox: clickCoords.lat + "," + clickCoords.lng + ",200",
                mode: 'retrieveAddresses',
                maxresults: 1,
                language: 'en'
            };
            geocoder.reverseGeocode(reverseGeocodingParameters, function(result){
                try {
                    address = result.Response.View[0].Result[0].Location.Address.Label;
                    notReverseGeocoded = false;
                    // disptach to the context menu event again to add results to the 
                    // context menu
                    map.dispatchEvent(e);
                } 
                catch (e) {
                    console.log(e);
                }
            }, function(e){
                console.log(e);
            });
            
        }
        else {
            // add address to context menu
            e.items.push(new H.util.ContextItem({
                label: address,
            
            }));
            
            // add routing options 
            e.items.push(new H.util.ContextItem({
                label: 'Route from here',
                callback: function(){
                    removeObjects(false);
                    waypoint_first = clickCoords;
                    firstMarker = addMarker(clickCoords);
                    waypoint_last = "";
                    
                }
            }));
            e.items.push(new H.util.ContextItem({
                label: 'Route to here',
                callback: function(){
                    removeObjects(true);
                    waypoint_last = clickCoords;
                    lastMarker = addMarker(clickCoords);
                    calculateRouteFromAtoB();
                    routeNotCalculated = false;
                }
            }));
            notReverseGeocoded = true;
        }
    });
    
    
    // function to calculate route
    function calculateRouteFromAtoB(){
    
        var routeRequestParams = {
            mode: 'fastest;car',
            representation: 'display',
            routeattributes: 'waypoints,summary,shape,legs',
            maneuverattributes: 'direction,action',
            waypoint0: waypoint_first.lat + "," + waypoint_first.lng,
            waypoint1: waypoint_last.lat + "," + waypoint_last.lng
        };
        
        // calculate route
        router.calculateRoute(routeRequestParams, addRouteShapeToMap, function(e){
            console.log(e);
        });
    }
    
    // add route to map
    function addRouteShapeToMap(result){
        try {
            var route = result.response.route[0];
            var strip = new H.geo.LineString(), routeShape = route.shape;
            
            routeShape.forEach(function(point){
                var parts = point.split(',');
                strip.pushLatLngAlt(parts[0], parts[1]);
            });
            
            polyline = new H.map.Polyline(strip, {
                style: {
                    lineWidth: 4,
                    strokeColor: 'rgba(0, 128, 255, 0.7)'
                }
            });
            // Add the polyline to the map
            group.addObject(polyline);
            // And zoom to its bounding rectangle
			map.getViewModel().setLookAtData({
				bounds: polyline.getBoundingBox()
			}, true);
        } 
        catch (e) {
            console.log(e);
        }
        
        
    }
    
    // function creates a marker , adds to map
    function addMarker(coordinates){
        var marker = new H.map.Marker({
            lat: clickCoords.lat,
            lng: clickCoords.lng
        });
        group.addObject(marker);
        return marker;
    }
    
    // function removes objects from map as required
    function removeObjects(onlyPolyline){
        if (onlyPolyline) {
            if (group.contains(polyline)) 
                group.removeObject(polyline);
            if (group.contains(lastMarker)) 
                group.removeObject(lastMarker);
        }
        else {
            group.removeAll();
        }
    }