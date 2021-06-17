/*
   *  krishnan
   * (C) HERE 2019
   *
   * This is an example to illustrate usage of isoline route calculation to detect intersections
   * along a calculated route.
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
			if(cle){
				cle.cleAppId = appId;
				cle.cleAppCode = appCode;
			}
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
  var greyTileLayer = basemaptileService.createTileLayer("maptile", "reduced.night", hidpi ? 512 : 256, "png8", null);

  // Create a platform object to communicate with the HERE REST APIs

  var maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
  var geocoder = platform.getGeocodingService();
  var router = platform.getRoutingService();
  var markerGroup = new H.map.Group();
  var geomGroup = new H.map.Group();
 

  var map = new H.Map(mapContainer, greyTileLayer, {
    center: center,
    zoom: zoom,
    pixelRatio: hidpi ? 2 : 1
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
  
  var linkInRoute = [];

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
  map.addObject(geomGroup);
	
  var cleUrl = 'https://cle.api.here.com';

  /**
  ** Clear objects from the map
  **/
  function clearLastRouteCalculation() {
    bErrorHappened = false;
    bLongClickUseForStartPoint = true;
    geomGroup.removeAll();
  }

  /**
  ** Sets the envionrment url
  **/
  function setEnvironment() {
        cleUrl = document.getElementById('serverURL').value;
  }

   
  /**
   ** Start Isoline Route Calculation
   **/
  var startRouteCalculation = function () {
    clearLastRouteCalculation();
    geocode(start.value, true, calculateRouteIsoline);
  };
  routeButton.onclick = startRouteCalculation;

  /**
   ** Start/Destination selection via LongClick in map
   **/
  function handleLongClickInMap(currentEvent) {
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX,
			currentEvent.currentPointer.viewportY);

	// get the coordinates from event and convert to latitude,longitude
    if (bLongClickUseForStartPoint) {
      clearLastRouteCalculation();
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      start.value = line1;
      pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (startMarker != null) {
        markerGroup.removeObject(startMarker);
      }
      // add a start marker
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
	   // add a destination marker
      destMarker = new H.map.Marker(pointB,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(destMarker);
      bLongClickUseForStartPoint = true;
    }
  }

  /**
   ** Geocode start/destination
   **/
  function geocode(searchTerm, start, cb) {
	//if no endpoint is provided then show an error message
    if( document.getElementById('serverURL').value === "" ) {
        alert("Please enter an endpoint.");
        return;
    }

	//if no start point is provided then show an error message
    if( document.getElementById('start').value === "" ) {
        alert("Please enter the start point.");
        return;
    }

    //if no destination point is provided then show an error message
    if( document.getElementById('dest').value === "" ) {
        alert("Please enter the destination point.");
        return;
    }

    //add Geocoder Release information if not already done
    if (releaseGeocoderShown == false) {
      loadGeocoderVersionTxt();
      releaseGeocoderShown = true;
    }
	
	// Geocode the address
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
	  // add start marker
      if (start) {
        if (startMarker != null) {
          markerGroup.removeObject(startMarker);
        }
        startMarker = new H.map.Marker(pointA, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(startMarker);

      } else {
      // add destination marker       
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
      else cb(pointA, pointB) // call isoline routing;
    }, alert);
  }

   /**
   ** Actual Isoline Route Calculation
   **/
  var calculateRouteIsoline = (function () {
    var layer;
    
    return function (start, destination) {
      if (layer) map.removeLayer(layer);
      //remove the existing geometry from the map if exist before starting a new isoline request
     geomGroup.removeAll();

     var poiReqParams = {
        waypoint0: start.lat + "," + start.lng,
        waypoint1: destination.lat + "," + destination.lng,
        geom: 'local',
		layer_ids: 'LINK_FCN', // to get the neighouring links
		max_detour_time : 60, // to ensure links connected to main route are retruned
      };
      
	var	url = [cleUrl+'/2/search/routeisoline.json?',
			'app_code=',
			app_code,
			'&app_id=',
			app_id,
			'&jsonAttributes=1'
			].join('');
			
			
	for(var param in poiReqParams){
		url=url+"&"+param+"="+poiReqParams[param];
	}
	
	// Send request
	$.ajax({
				type: 'GET',
				url: url,
				jsonp : false,
				cache: 'true',
				success : function (data) {
				  onSuccess(data);
				},
				error : function (error){
					onError(error);
				},
	});
	  
	 feedbackTxt.innerHTML = 'Request sent, please wait...';
    }
  })();
  
  
  /**
  ** Process the api response
  **/
  function onSuccess(result) {
	  var route = result.response.route[0];
	  addRouteShapeToMap(route);
	  searchResults(route.searchResult.geometries);
  }

   /**
   ** Add the route geometry on the map
   **/
   function addRouteShapeToMap(route){
	  var lineString = new H.geo.LineString(),
		routeLinks = route.leg[0].link,
		polyline;

	  routeLinks.forEach(function(link) {
		var shape = link.shape;
		// createa  linkId map to be checked later
		linkInRoute[link.linkId] = true;
		// shape contains lat,lon as a continours array
		for(var i=0;i<shape.length;i=i+2){
			lineString.pushLatLngAlt(shape[i], shape[i+1]);
		}
	  });

	  polyline = new H.map.Polyline(lineString, {
		style: {
		  lineWidth: 4,
		  strokeColor: 'rgba(64, 224, 208, 0.8)'
		}
	  });
	  // Add the polyline to the map
	  geomGroup.addObject(polyline);
	  // And zoom to its bounding rectangle
	  map.setViewBounds(polyline.getBounds(), true);
   }

   /**
   ** Go through the geometries retruned 
   ** and if a link does not belongs to the route, 
   ** check the neighbouring links of that link to detect an intersection
   **/
  function searchResults(geometries){
    var intersections = [];
	geometries.forEach(function(geometry){
		if(geometry.partOfRoute == false){
			var attributes = geometry.attributes;
			var neighbourlinks = [];
			
			// get the Reference and Non Reference node neigbour links
			// neighbourlinks may contains an array of links
			// or an aray of array of links (nested array)
			var refneibourlinks = attributes.REF_NODE_NEIGHBOR_LINKS;
			if(attributes.REF_NODE_NEIGHBOR_LINKS.indexOf(",")>-1){
				refneibourlinks = attributes.REF_NODE_NEIGHBOR_LINKS.split(',');
				neighbourlinks.push(refneibourlinks);
			}else{
				neighbourlinks.push(refneibourlinks);
			}
			
			var nonerefneibourlinks = attributes.NONREF_NODE_NEIGHBOR_LINKS.split(',');
			if(attributes.NONREF_NODE_NEIGHBOR_LINKS.indexOf(",")>-1){
				nonerefneibourlinks = attributes.NONREF_NODE_NEIGHBOR_LINKS.split(',');
				neighbourlinks.push(nonerefneibourlinks);
			}else{
				neighbourlinks.push(nonerefneibourlinks);
			}
			
			// go through all the links and if any neighbour 
			// link is in the route then an intersection 
			// exists at that point
			 var intersectionExists = false;
			 neighbourlinks.forEach(function(link) {
				if(Array.isArray(link)){
					link.forEach(function(indLink) {
						if(linkInRoute[indLink] == true){
							intersectionExists = true;
						}
					});
				}else {
					if(linkInRoute[link] == true){
					  intersectionExists = true;
					}
				}
			 });
			 
			 // if intersection exists add this to the array to be plotted
			 if(intersectionExists){
			   intersections.push(geometry.junctionLocation);
			 }
			
		}
	});
	
	// add all intersections to the map
	addIntersectionsToMap(intersections);
 }

  /**
  ** Adds all the intersections on the map
  **/
  function addIntersectionsToMap(intersections){
	  var svgMarkup = '<svg width="18" height="18" ' +
		'xmlns="http://www.w3.org/2000/svg">' +
		'<circle cx="8" cy="8" r="8" ' +
		  'fill="rgb(236,97,14)" stroke="white" stroke-width="1"  />' +
		'</svg>',
		dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}}),
		i,
		j;

	  // Add a marker for each intersection
	  for (i = 0;  i < intersections.length; i += 1) {
		  // coordinates are in WKT format
		  var intersection = intersections[i];
		  intersection = intersection.replace("POINT (","");
		  intersection = intersection.replace(")","");
		  var coords = intersection.split(" ");
		  var marker =  new H.map.Marker({
			lat: coords[1],
			lng: coords[0]} ,
			{icon: dotIcon});
			geomGroup.addObject(marker);
	  }
	
	feedbackTxt.innerHTML = 'Completed.';
  }
  

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