/*
   * (C) HERE 2019
   *
   * This is an example implementation of the isoline route calculation from Custom Location API offered by HERE.
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
  	var apikey = document.getElementById('customApiKey').value;
	if( apikey.length > 0  ) {
            api_key = apikey;
    }
  }

  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

  var mapContainer = document.getElementById('mapContainer');

  // check if the site was loaded via secure connection
  var secure = (location.protocol === 'https:') ? true : false;
  var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
  });

  // Create a platform object to communicate with the HERE REST APIs

  var maptypes = platform.createDefaultLayers();
  var geocoder = platform.getGeocodingService();
  var router = platform.getRoutingService();
  var group = new H.map.Group();
  var markerGroup = new H.map.Group();

  var map = new H.Map(mapContainer, maptypes.vector.normal.map, {
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
        map.getViewModel().setLookAtData({
				bounds: markerGroup.getBoundingBox()
		});
		
      }

      if (start) geocode(dest.value, false, cb);
      else cb(pointA, pointB);
    }, alert);
  }
  
  	var counter_recursion = 0;
  	//using this wrapper function we can send back an additional argument with the callback.
	function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}
	
	var searchResponse = function(data, arr, pos) {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
	};

  /************************************
   Actual Isoline Route Calculation
   ************************************/
  var calculateRouteIsoline = (function () {

    return function (start, destination) {

      var params = {
        apiKey: api_key,
        waypoint0: start.lat + "," + start.lng, 
        waypoint1: destination.lat + "," + destination.lng,
        geom: 'local'
      };
      params['max_detour_' + detourType] = document.getElementById('max-detour-' + detourType).value;

      feedbackTxt.innerHTML = 'Request sent, please wait...';
	  
	  var url = document.getElementById('serverURL').value + '/calculaterouteisoline.json?' + Object.keys(params).map(function (k) {
          return k + '=' + params[k]
      }).join('&');
	  
	  var callbackF = jsonp(searchResponse, counter_recursion);
	  $.ajax({
			url : url,
			dataType : "jsonp",
			async : false,
			type : 'get',
			data : {
				callback: callbackF
			},
			jsonp: false,
			jsonpCallback:callbackF,
			success : function (data) {
				parseResponse(data);
			},
			error : function(xhr, status, e){
				console.log(e);
			}
		});
		
		function parseResponse(data){
			feedbackTxt.innerHTML = 'Response received successfully.';
			var features = data.geometries.map(function (g) {
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
		  
		  feedbackTxt.innerHTML = 'Parsing recieved data.';
		  var polylines=[];
		  features.forEach(function (feature) {
				var strip= new H.geo.LineString();
				var geom = feature.geometry.coordinates;
				var partOfRoute = feature.properties.partOfRoute;
				for (var i = 0; i < geom.length ; i++) {
					strip.pushPoint({lat: geom[i][1], lng: geom[i][0]});
				 }
				var polyline = new H.map.Polyline(strip, { style:{
																lineWidth: partOfRoute ? 6 : 2,
																strokeColor: partOfRoute ? 'black' : '#488AC7',
															}
														  }
				);
				polylines.push(polyline);
				
		  });
		  group.addObjects(polylines);
		}	  
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