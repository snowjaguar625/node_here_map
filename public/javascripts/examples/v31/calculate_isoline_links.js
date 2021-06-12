/*
   * (C) HERE 2018
   *
   * This is an example implementation of the isoline calculation offered by HERE.
   *
   */

(function setValuesFromUrl() {

    // this is to force using our credentials
    setCredentials();

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
  
  var isolineOptions = [
    { lineWidth: 5, strokeColor: "rgba(34, 204, 34, 0.5)"},
    { lineWidth: 2, strokeColor: "rgba(204, 204, 34, 0.5)"},
    { lineWidth: 2, strokeColor: "rgba(204, 34, 34, 0.5)"}
	];

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
  var rangeType;
  function rangeTypeChanged(input) {
    rangeType = input.value;
    document.getElementById('range-type-time').style.display = input.value === 'time' ? 'block' : 'none';
    document.getElementById('range-type-distance').style.display = input.value === 'distance' ? 'block' : 'none';
    document.getElementById('range-type-consumption').style.display = input.value === 'consumption' ? 'block' : 'none';
    document.getElementById('consumption-details').style.display = input.value === 'consumption' ? 'block' : 'none';
  }

  timeRadioButton.click();

  // add long click in map event listener
  map.addEventListener('longpress', handleLongClickInMap);

  var calculateButton = document.getElementById("calculateButton");
  var center = document.getElementById("center");

  var feedbackTxt = document.getElementById("feedbackTxt");
  var centerPoint;
  var centerMarker = null;
  var bErrorHappened = false;
  var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination

  map.addObject(markerGroup);
  map.addObject(group);

  /************************************

   Geocoding and routing methods

   ************************************/

  /***/
  function clearLastCalculation() {
    bErrorHappened = false;
    bLongClickUseForStartPoint = true;
    group.removeAll();

  }

  /************************************
   Start Isoline Calculation
   ************************************/
  var startIsolineCalculation = function () {
    clearLastCalculation();
    geocode(center.value, true, calculateIsolineFc);
  };
  calculateButton.onclick = startIsolineCalculation;

  /********************************************************
   Start selectin via LongClick in map
   ********************************************************/
  function handleLongClickInMap(currentEvent) {
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

    if (bLongClickUseForStartPoint) {
      clearLastCalculation();
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      center.value = line1;
      centerPoint = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (centerMarker != null) {
        markerGroup.removeObject(centerMarker);
      }
      centerMarker = new H.map.Marker(centerPoint,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(centerMarker);
      bLongClickUseForStartPoint = false;
    }
  }

  /************************************
   Geocode center
   ************************************/
  function geocode(searchTerm, center, calculateIsoline) {
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

      if (center) centerPoint = new H.geo.Point(pos.Latitude, pos.Longitude);

      if (result.Response.View[0].Result[0].Location != null) {
        address = result.Response.View[0].Result[0].Location.Address;
      } else {
        address = result.Response.View[0].Result[0].Place.Locations[0].Address;
      }

      line1 = pos.Latitude + " " + pos.Longitude;
      line2 = address.Label;

      if (center) {
        if (centerMarker != null) {
          markerGroup.removeObject(centerMarker);
        }
        centerMarker = new H.map.Marker(centerPoint, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(centerMarker);

      }
      calculateIsoline(centerPoint);
    }, alert);
  }

  /************************************
   Actual Isoline Calculation
   ************************************/
  function calculateIsolineFc(center) {

      var params = {
		apikey : api_key
      };

      var startSelected = document.getElementById('start-radiobutton').checked;
      if(startSelected)
        params['start'] = center.lat + "," + center.lng;
      else
        params['destination'] = center.lat + "," + center.lng;  

      if(rangeType === 'time'){
        params['rangeType'] = 'time';
        params['range'] = document.getElementById('range-type-' + rangeType).value;
      }
      else if(rangeType === 'distance'){
        params['rangeType'] = 'distance';
        params['range'] = document.getElementById('range-type-' + rangeType).value;
      } else if (rangeType === 'consumption'){
        params['rangeType'] = 'consumption';
        params['range'] = document.getElementById('range-type-' + rangeType).value;
        params['customConsumptionDetails'] = document.getElementById('consumption-details-data').value;
      }
      params['callback'] = 'isolineCallback';
      if(document.getElementById('shape-checkbox').checked) params['isolineAttributes'] = 'shape';
	  if(document.getElementById('links-checkbox').checked) params['isolineAttributes'] = 'links';
	  if(document.getElementById('shape-checkbox').checked &&
	     document.getElementById('links-checkbox').checked) params['isolineAttributes'] = 'shape;links';

      feedbackTxt.innerHTML = 'Request sent, please wait...';
      
      var url = document.getElementById('serverURL').value + '/2/calculateisoline.json?' +
                Object.keys(params).map(function (k) { return k + '=' + params[k] }).join('&') +
                document.getElementById('parameters-data').value;

      script = document.createElement("script");
	  script.src = url;
	 document.body.appendChild(script);

  }


  /************************************
   process calculate isoline response
   ************************************/
  var isolineCallback = function(response){
    if(response && response.isoline && response.isoline.length > 0)
      {
        var components = response.isoline[0].component;
        var displayPolylines = document.getElementById('links-checkbox').checked;
        var displayPolygon = document.getElementById('shape-checkbox').checked;

        for (var j = 0; j < components.length; j++) {

          if(displayPolygon){
            // construct outline polygon
            var strip = new H.geo.LineString();
            var outline = components[j].shape;
            for (var i = 0; i < outline.length; i+=2) {
              var lat = parseFloat(outline[i]);
              var lon = parseFloat(outline[i+1]);
              strip.pushLatLngAlt(lat, lon, 0);
            }
            
            shp = new H.map.Polygon(strip, {
              style: isolineOptions[parseInt(0)]
            });
            // may not be hardcoded
            shp.setZIndex = -1;
            group.addObject(shp);
          }

          if(displayPolylines){
            // construct all link geometries
            var links = components[j].links;
            for(var i = 0; i < links.length; i++){
              var shape = links[i].shape;
              var linkStrip = new H.geo.LineString();
              for(var j = 0; j < shape.length; j+=2){
                linkStrip.pushLatLngAlt.apply(linkStrip, [shape[j], shape[j + 1]].map(function(item) {return parseFloat(item);}));
              }
              var polyline = new H.map.Polyline(linkStrip, {
                                  style: {
                                      lineWidth: 2,
                                      strokeColor: "rgba(70, 105, 160, 0.8)",
                                      fillColor: "rgba(120, 133, 160, 0.9)"
                                  }
                            });
              group.addObject(polyline);               
            }
          }
        }
      }
      map.addObject(group);
	  map.getViewModel().setLookAtData({
				bounds: group.getBoundingBox()
		});
      feedbackTxt.innerHTML = '';
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