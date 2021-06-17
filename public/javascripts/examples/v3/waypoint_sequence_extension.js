/*
   author knut.strobeck@here.com
   (C) HERE 2015 - 2018
   */

  /*  Set authentication app_id and app_code
   *  WARNING: this is a demo-only key
   *  please register on http://developer.here.com/
   *  and obtain your own API key
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

  var padZerosNumbers = function (num, size) {
    var negative = ( num < 0 );
    if (negative) {
      num = Math.abs(num);
      size--;
    }
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return negative ? "-" + s : s;
  };

  var secure = (location.protocol === 'https:');

  var startDate = new Date(2016, 9, 14, 7, 30, 0);
  document.getElementById("departure").value = (1900 + startDate.getYear()) + '-' + padZerosNumbers((1 + startDate.getMonth()).toFixed(0), 2) + '-' + padZerosNumbers(startDate.getDate().toFixed(0), 2) + "T" + startDate.toLocaleTimeString('en-US', {hour12: false});

  // check if the site was loaded via secure connection

  var baseUrl = (secure ? "https:" : "http:") + "//" + document.getElementById('host').value + "/2/findpickups.json?";
  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
  var globalRoutingMode = "";

  var examplesArr = ["",
    /* Simple pickup with convenient bonus */ "waypoint0;50.115620,8.631210\nwaypoint1;50.122540,8.631070;pickup:LOAD2\nwaypoint2;50.128920,8.629830;drop:LOAD2,value:200\nwaypoint3;50.132540,8.649280\n",
    /* Simple pickup with drop at the end */ "waypoint0;50.115620,8.631210\nwaypoint1;50.122540,8.631070;pickup:LOAD2\nwaypoint3;50.132540,8.649280;drop:LOAD2,value:2000\nwaypoint4;50.132540,8.649280\n",
    "waypoint0;50.115620,8.631210\nwaypoint1;50.122540,8.631070;pickup:LOAD2\nwaypoint2;50.128920,8.629830;drop:LOAD2,value:0.8\nwaypoint3;50.132540,8.649280",
    "Start;51.431707,6.769662\nPA;51.428616,6.789221;pickup:A\nPC;51.428362,6.795787;pickup:C\nPD;51.431191,6.801717;pickup:D\nPE;51.434118,6.811997;pickup:E\nPF;51.429402,6.819388;pickup:F\nPG;51.426649,6.819820;pickup:G\nPH;51.416587,6.830463;pickup:H\nPI;51.418300,6.829433;pickup:I\nPB;51.415945,6.838016;pickup:B\nDA;51.425258,6.853551;drop:A,value:1000\nDB;51.425258,6.853551;drop:B,value:1000\nDC;51.425258,6.853551;drop:C,value:1000\nDD;51.425258,6.853551;drop:D,value:1000\nDE;51.425258,6.853551;drop:E,value:1000\nDF;51.425258,6.853551;drop:F,value:1000\nDG;51.425258,6.853551;drop:G,value:1000\nDH;51.425258,6.853551;drop:H,value:1000\nDI;51.425258,6.853551;drop:I,value:1000\nEnd;51.425258,6.853551",    
	"Start;51.431707,6.769662\nPA;51.428616,6.789221;pickup:A\nPC;51.428362,6.795787;pickup:C\nPD;51.431191,6.801717;pickup:D\nPE;51.434118,6.811997;pickup:E\nPF;51.429402,6.819388;pickup:F\nPG;51.426649,6.819820;pickup:G\nPH;51.416587,6.830463;pickup:H\nPI;51.418300,6.829433;pickup:I\nPB;51.415945,6.838016;pickup:B\nDA;51.425258,6.853551;drop:A,value:1000\nDB;51.425258,6.853551;drop:B,value:1000\nDC;51.425258,6.853551;drop:C,value:1000\nDD;51.425258,6.853551;drop:D,value:1000\nDE;51.425258,6.853551;drop:E,value:0.001\nDF;51.425258,6.853551;drop:F,value:1000\nDG;51.425258,6.853551;drop:G,value:1000\nDH;51.425258,6.853551;drop:H,value:0.001\nDI;51.425258,6.853551;drop:I,value:1000\nEnd;51.425258,6.853551",
	/* flowing */ "Start;50.115620,8.631210\nwaypoint0;50.115620,8.631210;pickup:STARTtoEND\nwaypoint1;50.118578,8.636551;drop:POTOFGOLD,value:30\nwaypoint2;50.122540,8.631070;pickup:LOAD2\nwaypoint3;50.128920,8.629830;drop:LOAD2,value:30\nwaypoint4;50.118654,8.619956;pickup:POTOFGOLD\nwaypoint5;50.123998,8.640626;drop:TOXICWASTE,value:50\nwaypoint6;50.130299,8.613031;pickup:TOXICWASTE\nwaypoint7;50.132540,8.649280;drop:STARTtoEND,value:1000\nEnd;50.132540,8.649280",
    /* weight */ "Start;50.115620,8.631210\nPA;50.115620,8.631210;pickup:A;capacity:5\nDB;50.118578,8.636551;drop:B,value:30;capacity:-30\nPC;50.122540,8.631070;pickup:C;capacity:10\nDC;50.128920,8.629830;drop:C,value:30;capacity:-10\nPB;50.118654,8.619956;pickup:B;capacity:30\nDD;50.123998,8.640626;drop:D,value:50;capacity:-20\nPD;50.130299,8.613031;pickup:D;capacity:20\nDA;50.132540,8.649280;drop:A,value:1000;capacity:-5\nEnd;50.132540,8.649280",
    /* big */ "START;50.10346,8.68999\nWP1;50.04177,8.96877;pickup:Mario\nWP2;49.99676,9.19948;pickup:Carlo\nWP3;49.86239,9.50160;pickup:Miuccia\nWP4;49.79876,9.92476;pickup:Bebi\nWP5;49.47651,10.97575;pickup:Valente\nWP6;49.45428,11.08245;pickup:Stoca\nWP7;49.50977,11.02154;pickup:Varionzo\nWP8;49.55375,10.71533;pickup:Steca\nWP9;49.57956,10.77258;pickup:Zigo\nDR1;49.51276,11.13648;drop:Mario,value:50\nDR2;49.77941,9.88206;drop:Carlo,value:50\nDR3;49.74423,10.06319;drop:Miuccia,value:50\nDR4;49.74347,10.15274;drop:Bebi,value:50\nDR5;49.73679,10.26915;drop:Valente,value:50\nDR6;49.81838,10.44218;drop:Stoca,value:40\nDR7;49.77583,10.61659;drop:Varionzo,value:32\nWP10;49.62036,10.51539;pickup:Zago\nWP11;49.68045,10.52739;pickup:Mago\nWP12;49.69979,10.42701;pickup:Pago\nDSteca;49.48823,11.12965;drop:Steca,value:40\nDZigo;49.48823,11.12965;drop:Zigo,value:40\nDZago;49.48823,11.12965;drop:Zago,value:40\nDMago;49.48823,11.12965;drop:Mago,value:40\nDPago;49.48823,11.12965;drop:Pago,value:40\nEND;49.48823,11.12965",
    /* service time */ "waypoint0;50.115620,8.631210\nwaypoint1;50.122540,8.631070;pickup:LOAD2;st:300\nwaypoint2;50.128920,8.629830;drop:LOAD2,value:200;st:300\nwaypoint3;50.132540,8.649280\n",
  ];
  function exampleSelect(me) {
    document.getElementById('destinations').value = examplesArr[parseInt(me.value.replace("ex", ""))];
  }

  var mapContainer = document.getElementById('mapContainer');

  platform = new H.service.Platform({
    app_code: app_code,
    app_id: app_id,
    useHTTPS: secure
  }),
      maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
      router = platform.getRoutingService(),
      labels = new H.map.Group(),
      groups = [],
      activeGroup = null,
      activeConnections = null,
      activeLabels = null,
      basemaptileService = platform.getMapTileService({'type': 'base'}),
      greyTileLayer = basemaptileService.createTileLayer("maptile", "normal.day.grey", hidpi ? 512 : 256, "png8", null);

  var map = new H.Map(mapContainer, greyTileLayer, {center: center, zoom: zoom});

  // Do not draw under control panel
  map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
  // set padding for control panel
  map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
  // add labels (waypoint markers) to map
  map.addObject(labels);


  // add behavior control, e.g. for mouse
  new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // enable UI components and remove the unnecessary
  var ui = H.ui.UI.createDefault(map, maptypes);
  ui.removeControl('panorama');
  ui.removeControl('mapsettings');

  var zIndex = 1;
  var currentColor = "rgba(0,85,170,";
  var wayPointColor = "#A9D4FF";


  window.addEventListener('resize', function () {
    map.getViewPort().resize();
  });

  map.addEventListener('tap', function (evt) {
    if (document.getElementById('addCoords').checked) {
      var coords = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
      var point = new H.geo.Point(coords.lat, coords.lng);
      var marker = new H.map.DomMarker(
          point,
          {icon: createSimpleSvgMarkerIconWithImg('-', coords.lat.toFixed(6) + ',' + coords.lng.toFixed(6), '')}
      );

      labels.addObject(marker);
      document.getElementById('destinations').value += "\r\nWP_ID;" + coords.lat.toFixed(6) + "," + coords.lng.toFixed(6);
    }

    // increase z-index of the group contianing marker/polyline that was tapped

    if (evt.target instanceof H.map.DomMarker || evt.target instanceof H.map.Polyline)
      evt.target.getParentGroup().setZIndex(zIndex++);


  }, false);


  var server_rr = 0;
  var truckOverlayProvider = new H.map.provider.ImageTileProvider({
    label: "Tile Info Overlay",
    descr: "",
    min: 12,
    max: 20,
    getURL: function (col, row, level) {
      server_rr++;
      if (server_rr > 4)
        server_rr = 1;
      return ["https://",
        server_rr,
        ".base.maps.api.here.com/maptile/2.1/truckonlytile/newest/normal.day/",
        level,
        "/",
        col,
        "/",
        row,
        "/256/png8",
        "?style=fleet",
        "&app_code=",
        app_code,
        "&app_id=",
        app_id
      ].join("");
    }
  });


  var handleTransport = function (cb) {
    if (cb.checked)
      map.addLayer(truckOverlayLayer);
    else
      map.removeLayer(truckOverlayLayer);
  };
  var truckOverlayLayer = new H.map.layer.TileLayer(truckOverlayProvider);

  /**
   *  Show and hide traffic options
   */
  var detailsSelect = function () {
    var detaildesc = document.getElementById("detaildesc");
    var moreText = document.getElementById("more");
    moreText.value = (detaildesc.style.display == 'block') ? "more" : "less";
    detaildesc.style.display = (detaildesc.style.display == 'block') ? 'none' : 'block';
  };

  /**
   * Show and hide truck attributes
   */
  var truckSelect = function () {
    var vehicleType = document.getElementById('vehicleType').value;
    if (vehicleType === "car" || vehicleType === "pedestrian") {
      document.getElementById("vehicleDetails").style.display = "none";
      document.getElementById("truckRestDiv").style.display = "none";
      map.removeLayer(truckOverlayLayer);
    }
    else if (vehicleType === "truck") {
      document.getElementById("vehicleDetails").style.display = "block";
      document.getElementById("truckRestDiv").style.display = "block";
      if (document.getElementById("truckrestr").checked)
        map.addLayer(truckOverlayLayer);
      else
        map.removeLayer(truckOverlayLayer);
    }
  };

  /**
   * Sends request to the service
   */
  var calculateOptimizedRoute = function (mode, startPoint, destinations, endPoint, vehicletype, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost) {

	var overrideAppId   = document.getElementById('custom-app-id'  ).value;
	var overrideAppCode = document.getElementById('custom-app-code').value;
	if (overrideAppId.length > 0 && overrideAppCode.length > 0) {
		app_id = overrideAppId;
		app_code = overrideAppCode;
	}

    var url =
        [document.getElementById('host').value + "/2/findpickups.json?",
          "mode=",         mode,
          "&app_id=",      app_id,
          "&app_code=",    app_code,
          "&start=",       startPoint,
          "&departure=",   departure,
          "&vehicleCost=", vehicleCost,
          "&driverCost=",  driverCost
        ];

    if (arrival !== null) url.push("&arrival=", arrival);

    if (capacity !== null && parseInt(capacity) >= 0) {
      url.push("&capacity=", capacity);
    }

    if (restTimes !== null)
      url.push("&restTimes=", restTimes);

    if (endPoint != null)
      url.push("&end=", endPoint);

    for (var i = 0, k = 0; i < destinations.length; i++) {
      if (destinations[i] != null && destinations[i].trim().length > 0) {
        url.push("&destination" + k + "=", destinations[i]);
        k++;
      }
    }

    url.push(truckParams);
    url.push("&jsonCallback=processResults");

    // save all (geocoded) waypoints in case an error occures - then just the waypoints without the route is displayed on map
    var currentRouteWaypoints = [];
    currentRouteWaypoints.push(startPoint);
    currentRouteWaypoints = currentRouteWaypoints.concat(destinations);
    currentRouteWaypoints.push(endPoint);
    // show waypoints on map
    for (var j = 0; j < currentRouteWaypoints.length; j++) {
      var labelSplit = currentRouteWaypoints[j].split('%3B');
      var coordSplit = labelSplit[1].split('%2C');
      if (coordSplit.length == 2) {
          var point = new H.geo.Point(coordSplit[0], coordSplit[1]);
          var marker = new H.map.DomMarker(
              point,
              {icon: createSimpleSvgMarkerIconWithImg('-', decodeURIComponent(labelSplit[0]), '')}
          );
          labels.addObject(marker);
      }
    }
    if (labels.getChildCount() > 0) {
      map.setViewBounds(labels.getBounds());
    }

    feedbackTxt.innerHTML = "Calculation request sent, waiting for response...";
    script = document.createElement("script");
    script.src = url.join("");
    script.onerror = function (e) {
      feedbackTxt.innerHTML = "An Error happened during the calculation. We're sorry.";
      bErrorHappened = true;
    };
    document.body.appendChild(script);
  };


  /**
   * Displays the result, activated via callback
   * @param data  result from service
   */
  var processResults = function (data) {
    if (data.results == null || data.results.length == 0) {
      if (data.warnings != null && data.warnings.outOfSequenceWaypoints.length > 0) {
        feedbackTxt.innerHTML = "Unable to calculate a sequence because of the constraints on the following waypoints:";
        for (var i = 0; i < data.warnings.outOfSequenceWaypoints.length; i++) {
          feedbackTxt.innerHTML += "<br>" + data.warnings.outOfSequenceWaypoints[i].id;
        }
      } else if (data.errors != null || (data.errors && data.errors.length > 0)) {
        feedbackTxt.innerHTML = "Error: " + data.errors[0];
      } else {
        feedbackTxt.innerHTML = "An Unknown Error happened during the calculation. We are sorry.";
      }
    } else {
      var err = null;
      if (data.hasOwnProperty('error') && data.error != null + data.hasOwnProperty('status'))
        err = "" + data.status + " " + data.error + "<br>" + data.error_description;
      else if (data.hasOwnProperty('errors') && data.errors && data.errors.length != 0)
        err = data.errors[0];

      if (err != null) {
        feedbackTxt.innerHTML = "An Error happened during the calculation. We are sorry. <br><br>" + err;
        bErrorHappened = true;
        return;
      }

      // clear dummy waypoint labels
      //clearWayPointMarkersOnMap();
      var results = data.results;

      for (var rIdx = 0; rIdx < results.length; rIdx++) {
        var r = results[rIdx];


        var routeDepartureTime = new Date(r.waypoints[0].estimatedDeparture).getTime() / 1000;
        var timeSpent = r.time;
        var markers = new Array();
        var markersCopy = new Array();

        // Adds fake constraint (st is part of pickup/drop constrainst for WSE pickups) for nice rendering of service time.
        for (var k = 0; k < r.waypoints.length; k++) {
          var wp = r.waypoints[k];
          if (wp.estimatedArrival !== null && wp.estimatedDeparture !== null && wp.estimatedDeparture !== wp.estimatedArrival) {
            wp.fulfilledConstraints.push("st:300");
          }
        }

        // Show point markers.
        for (var j = 0; j < r.waypoints.length; j++) {
          var point = new H.geo.Point(r.waypoints[j].lat, r.waypoints[j].lng);
          var marker = new H.map.DomMarker(
              point,
              {icon: createSvgMarkerIconWithImg(j + 1, r.waypoints[j], routeDepartureTime, timeSpent)}
          );

          // without new objects, makers not getting
          // added to group for line, route seperately
          var markerCopy = new H.map.DomMarker(
              point,
              {icon: createSvgMarkerIconWithImg(j + 1, r.waypoints[j], routeDepartureTime, timeSpent)}
          );

          markers.push(marker);
          markersCopy.push(markerCopy);

        }

        // show waypoints not matched.

        var lineGroup = new H.map.Group();
        groups.push(lineGroup);
        lineGroup.addObjects(markers);


        // set tour polylines
        for (var k = 0; k < r.waypoints.length - 1; k++) {
          var strip = new H.geo.Strip();
          strip.pushPoint({lat: r.waypoints[k].lat, lng: r.waypoints[k].lng});
          strip.pushPoint({lat: r.waypoints[k + 1].lat, lng: r.waypoints[k + 1].lng});
          var polyline = createPolylineForIndex(strip, k);
          polyline.setArrows(true);


          lineGroup.addObject(polyline);
        }


        for (var i = 0; i < r.waypoints.length - 1; i++) {
          var lat = ( r.waypoints[i].lat + r.waypoints[i + 1].lat ) / 2;
          var lng = ( r.waypoints[i].lng + r.waypoints[i + 1].lng ) / 2;

          lineGroup.addObject(createConnectionLabel(lat, lng,
              r.interconnections[i].distance,
              r.interconnections[i].time,
              r.interconnections[i].rest,
              r.interconnections[i].waiting,
              colorForIndex(i, 0.7)));
        }


        for (var ir = 0; ir < results.length; ir++) {
          var routeGroup = new H.map.Group();
          groups.push(routeGroup);
          routeGroup.addObjects(markersCopy);


          for (var ii = 0; ii < r.interconnections.length; ii++) {
            var startPoint = getWayPointByID(r, r.interconnections[ii].fromWaypoint);
            var endPoint = getWayPointByID(r, r.interconnections[ii].toWaypoint);
            var estDeparture = r.waypoints[ii].estimatedDeparture;
            var hasTraffic = false;

            calculateRoute(startPoint,
                endPoint,
                globalRoutingMode,
                routeGroup,
                ii,
                hasTraffic ? estDeparture : "",
                r.interconnections[ii].rest,
                r.interconnections[ii].waiting,
                r.interconnections[ii].time);
          }
        }
      }

      feedbackTxt.innerHTML = "Result:<br>";
      var rIdx = 0;
      var r = results[rIdx];
      var content = "";
      content += "Completing the sequence needs " + humanReadabletime(r.time) + " for " + (r.distance / 1000.0).toFixed(1) + "km.";
      if (r.timeBreakdown.waiting != 0 || r.timeBreakdown.service != 0 || r.timeBreakdown.rest != 0) {
        content += "<br>This includes: <table border=\"0\"><tbody>";
        if (r.timeBreakdown.driving != 0) {
          content += " <tr><td>Driving: </td><td> " + humanReadabletime(r.timeBreakdown.driving) + "</td></tr>";
        }
        if (r.timeBreakdown.waiting != 0) {
          content += " <tr><td>Waiting: </td><td> " + humanReadabletime(r.timeBreakdown.waiting) + "</td></tr>";
        }
        if (r.timeBreakdown.service != 0) {
          content += " <tr><td>Service: </td><td> " + humanReadabletime(r.timeBreakdown.service) + "</td></tr>";
        }
        if (r.timeBreakdown.rest != 0) {
          content += " <tr><td>Rest: </td><td> " + humanReadabletime(r.timeBreakdown.rest) + "</td></tr>";
        }
        content += "</tbody></table>";
      }
      content += "<br><form name=\"Form1\" action=\"#\" >";
      content += "<input type=\"radio\" name=\"routeradio\"" + " onclick = \"showGroup(" + (2 * rIdx) + ")\"/> Lines ";
      content += "<input type=\"radio\" name=\"routeradio\"" + (rIdx == results.length - 1 ? "checked" : "") + " onclick = \"showGroup(" + (2 * rIdx + 1) + ")\"/> Routes<br>";
      content += "<br>Gray and blue sections of the result are only for better visualization.<br>Clicking on the schedule symbol on left of the waypoint labels shows the details for a waypoint.";
      content += "<br>Labels on the connections indicate distance (<b>D</b>), driving time (<b>T</b>), rest time (<b>R</b>), waiting time (<b>W</b>). " +
          "<br>R and W appear only where resting or waiting is necessary. ";
      content += "<br>Clicking on the traffic sign in the top right corner of the map enables the display of <br>traffic patterns. Traffic patterns can be chosen for the local time.";
      content += "</form>";
      feedbackTxt.innerHTML += content;

      if (activeGroup == null) {
        activeGroup = new Array();
      }

      activeGroup[0] = groups[groups.length - 1];

      activeGroup[0].setZIndex(zIndex++);
      map.addObject(activeGroup [0]);
      map.setViewBounds(groups[groups.length - 2].getBounds());

    }
  };

  /**
   * updates route on radio-box click, if different routes are available
   * @param groupNumber
   */
  var showGroup = function (groupNumber) {

    map.removeObject(activeGroup[0]);
    activeGroup[0] = groups[groupNumber];
    map.addObject(activeGroup [0]);


    if ((groupNumber + 2) < groups.length) {
      if (activeGroup[1])
        map.removeObject(activeGroup[1]);

      activeGroup[1] = groups[groupNumber + 2];
      map.addObject(activeGroup [1]);
    }

  };

  /**
   * Lookup coordinate
   */
  var getWayPointByID = function (result, id) {
    for (var i = 0; i < result.waypoints.length; i++) {
      if (result.waypoints[i].id === id)
        return result.waypoints[i];
    }
    console.log("no waypoint found for id " + id);
    return null;
  };

  var destinationsEntriesArr = [];

  function startOptimize() {

    var destinations = [];
    clearWayPointMarkersOnMap();

    if (groups.length > 0) {
      for (var i = 0; i < groups.length; i++)
        groups[i].removeAll();
      activeGroup = null;
      groups = [];
    }

    var rawDestinations = document.getElementById('destinations').value,
        vehicleType = document.getElementById('vehicleType').value,
        traffic = 'disabled',
        arrival = document.getElementById('arrival').value,
        capacity = document.getElementById('capacity').value,
        rawEndpoint = "",
        useEndPoint = true,
        departure = "",
        truckRawParams = truckParameters(vehicleType),
        truckParams = "",
        restTimes = 'disabled';
    driverCost = document.getElementById('driverCost').value;
    vehicleCost = document.getElementById('vehicleCost').value;

    for (var prop in truckRawParams) {
      truckParams += "&" + prop + "=" + truckRawParams[prop];
    }
    globalRoutingMode = "fastest;" + vehicleType + ";traffic:" + traffic + ";";
    departure = document.getElementById('departure').value;
    var destinationsEntries = rawDestinations.trim().split(/\n+/g);

    // clean up empty lines at he begin
    while (destinationsEntries[0] == null || destinationsEntries[0].trim().length === 0)
      destinationsEntries.shift();

    // clean up tail
    while (destinationsEntries[destinationsEntries.length - 1] == null
    || destinationsEntries[destinationsEntries.length - 1].trim().length === 0)
      destinationsEntries.pop();

    parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);
  }

  function findPositionIdx(rawLocations) {
    if (rawLocations.length == 0)
      return -1;
    if (rawLocations.length == 1)
      return 0;
    if (rawLocations.length == 2) {
      if (rawLocations[1].match(/(st:|acc:|at:|before:|pickup:|drop:|st%3A|acc%3A|at%3A|before%3A|pickup%3A|drop%3A|capacity%3A)/))
        return 0;
      else
        return 1;
    }
    else if (rawLocations.length > 5)
      return -1;
    else
      for (var i = rawLocations.length - 1; i >= 0; i--) {
        if (!rawLocations[i].match(/(st:|acc:|at:|before:|pickup:|drop:|st%3A|acc%3A|at%3A|before%3A|pickup%3A|drop%3A|capacity%3A)/))
          return i;
      }
  }

  var counter_recursion = 0;
  function parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost) {

    if (counter_recursion < destinationsEntries.length) {
      var rawLocations = destinationsEntries[counter_recursion].split(";");
      var rawLocation = rawLocations[1]; // [0] is the way point id, [1] the coordinates or the street address

      if (!isLatLon(rawLocation)) {
        var callbackF = jsonp(searchResponse, counter_recursion);
        var url1 = ["https://geocoder.api.here.com/6.2/geocode.json?gen=4&jsonattributes=1&language=en-GB&maxresults=1",
          "&searchtext=",
          rawLocation,
          "&strictlanguagemode=false",
          "&app_id=",
          app_id,
          "&app_code=",
          app_code,
          "&jsoncallback=",
          callbackF].join("");
        var latlon = "";
        $.ajax({
          url: url1,
          dataType: "jsonp",
          async: false,
          type: 'get',
          data: {
            callback: callbackF
          },
          jsonp: false,
          jsonpCallback: callbackF,
          success: function (data) {
            if (data.response.view.length > 0) {
              if (data.response.view[0].result[0].location != null) {
                latlon = data.response.view[0].result[0].location.navigationPosition[0];
              }
              else {
                pos = result.response.view[0].result[0].place.location[0].navigationPosition[0];
              }
              destsTemp = destinationsEntries[counter_recursion].split(";");
              destsTemp[1] = latlon.latitude + "," + latlon.longitude;
              destinationsEntries[counter_recursion] = destsTemp.join(";");
              counter_recursion++;
              if (counter_recursion < destinationsEntries.length)
                parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);
              else {
                finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);
                counter_recursion = 0;
              }
            } else { // address not found
              feedbackTxt.innerHTML = "The address '" + rawLocation + "' could not be geocoded.";
              bErrorHappened = true;
            }
          },
          error: function (xhr, status, e) {
            console.log(e);
          }
        });
      } else {
        counter_recursion++;
        parseGeocodes(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);
      }

    } else {
      finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);
      counter_recursion = 0;
    }
  }


  function finalCall(globalRoutingMode, destinationsEntries, useEndPoint, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost) {
    destinationsEntries = destinationsEntries.map(function (item) {
      return encodeURIComponent(item)
    });
    var rawStartPoint = destinationsEntries.shift().trim();

    if (useEndPoint) {
      rawEndpoint = destinationsEntries.pop().trim();
    }


    calculateOptimizedRoute(globalRoutingMode, rawStartPoint, destinationsEntries, rawEndpoint, vehicleType, traffic, departure, arrival, capacity, truckParams, restTimes, driverCost, vehicleCost);


  }


  function isLatLon(entry) {
    if (entry.indexOf(",") == -1)
      return false;
    if (entry.split(",").length != 2)
      return false;
    if (isNaN(entry.split(",")[0]) && entry.split(",")[0].toString().indexOf('.') == -1)
      return false;
    if (!isNaN(entry.split(",")[1]) && entry.split(",")[1].toString().indexOf('.') != -1)
      return true;
    return false;
  }


  function getLatLon(address, arr, pos) {

    return $.ajax({
      url: url1,
      dataType: "jsonp",
      async: false,
      type: 'get',
      data: {
        callback: callbackF
      },
      jsonp: false,
      jsonpCallback: callbackF,
      success: function (data) {
        latlon = data.response.view[0].result[0].location.navigationPosition[0];
      },
      error: function (xhr, status, e) {
        console.log(e);
      }
    });
  }


  function geocode(line, arr, pos) {
    //document.getElementById("counter").innerHTML = ["Geocoded ", arrayPos + 1, " of ", numberOfLines].join("");
    var callbackF = jsonp(searchResponse, pos);
    url = ["https://geocoder.api.here.com/6.2/geocode.json?gen=4&jsonattributes=1&language=en-GB&maxresults=1",
      "&searchtext=",
      line,
      "&strictlanguagemode=false",
      "&app_id=",
      app_id,
      "&app_code=",
      app_code,
      "&jsoncallback=",
      jsonp(searchResponse, arrayPos)].join("");
    script = document.createElement("script");
    script.src = url;
    script1 = document.body.appendChild(script);
  }

  var searchResponse = function (data, arr, pos) {
  };


  //using this wrapper function we can send back an additional argument with the callback.
  function jsonp(real_callback, arg) {
    var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
    window[callback_name] = function (response) {
      real_callback(response, arg);
      delete window[callback_name];  // Clean up after ourselves.
    };
    return callback_name;
  }

  /**
   * Function collects truck attributes in one object
   */
  var truckParameters = function (vehicleType) {
    var p = {};

    if (vehicleType === "truck") {
      var lWeight = parseFloat(document.getElementById("limitedWeight").value);
      var aWeight = parseFloat(document.getElementById("weightPerAxle").value);
      var height = parseFloat(document.getElementById("height").value);
      var width = parseFloat(document.getElementById("width").value);
      var length = parseFloat(document.getElementById("length").value);

      if (isNaN(lWeight))  lWeight = 0;
      if (isNaN(aWeight))  aWeight = 0;
      if (isNaN(height))   height = 0;
      if (isNaN(width))    width = 0;
      if (isNaN(length))   length = 0;

      var hazard = [];
      if (document.getElementById('explosive').checked)
        hazard.push("explosive");
      if (document.getElementById('gas').checked)
        hazard.push("gas");
      if (document.getElementById('flammable').checked)
        hazard.push("flammable");
      if (document.getElementById('combustible').checked)
        hazard.push("combustible");
      if (document.getElementById('organic').checked)
        hazard.push("organic");
      if (document.getElementById('poison').checked)
        hazard.push("poison");
      if (document.getElementById('radioActive').checked)
        hazard.push("radioActive");
      if (document.getElementById('corrosive').checked)
        hazard.push("corrosive");
      if (document.getElementById('poisonousInhalation').checked)
        hazard.push("poisonousInhalation");
      if (document.getElementById('harmfulToWater').checked)
        hazard.push("harmfulToWater");
      if (document.getElementById('other').checked)
        hazard.push("other");

      hazard = hazard.join(",");

      if (hazard.length > 0)     p["shippedHazardousGoods"] = hazard;
      if (aWeight > 0)           p["weightPerAxle"] = aWeight;
      if (lWeight > 0)           p["limitedWeight"] = lWeight;
      if (height > 0)            p["height"] = height;
      if (width > 0)             p["width"] = width;
      if (length > 0)            p["length"] = length;

      // Routing 6.2:
      //p["hasTrailer"]= document.getElementById('hasTrailer').checked ? "true" : "false";

      //Routing 7.2:
      p["trailersCount"] = document.getElementById('hasTrailer').checked ? "1" : "0";
    }

    return p;
  };

  /**
   *  Function calculates single routes for display purposes only
   */
  var calculateRoute = function (startPoint, endPoint, currentMode, group, num, departure, wseRestTime, wseWaitingTime, wseRouterTime) {


    var wp0 = startPoint.lat + "," + startPoint.lng,
        wp1 = endPoint.lat + "," + endPoint.lng;
    var calculateRouteParams = {
          'waypoint0': wp0,
          'waypoint1': wp1,
          'mode': currentMode,
          'departure': departure,
          'representation': 'display',
          'routeAttributes': 'all',
          'app_code': app_code,
          'app_id': app_id
        },
        onResult = function (result) {

          var strip = new H.geo.Strip(),
              shape = result.response.route[0].shape,
              l = shape.length;

          for (var i = 0; i < l; i++) {
            strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function (item) {
              return parseFloat(item);
            }));
          }
          var polyline = createPolylineForIndex(strip, num);
          polyline.setArrows(true);

          var s = strip.getPointCount(),
              point = new H.geo.Point(0, 0),
              cPoint = strip.extractPoint(Math.floor(s / 2), point),
              lLat = cPoint.lat,
              lLng = cPoint.lng;

          group.addObject(polyline);
          group.addObject(createConnectionLabel(lLat, lLng, result.response.route[0].summary.distance,
              wseRouterTime, wseRestTime, wseWaitingTime, colorForIndex(num, 0.7)));
        },
        onError = function (error) {
          console.log("fail:" + error);
        };

    var truckParams = truckParameters(document.getElementById('vehicleType').value);
    for (var p in truckParams) {
      calculateRouteParams[p] = truckParams[p];
    }

    router.calculateRoute(calculateRouteParams, onResult, onError);
  };

  function getNameFromEventClass(e) {

    var useServiceAsWork = true;
    //document.getElementById("rest-custom-serviceTimes").value === null
     //   || document.getElementById("rest-custom-serviceTimes").value === "work";

    switch (e) {
      case 'arr':
        return 'Arrival at Waypoint';
      case 'dep':
        return 'Departure from Waypoint';
      case 'at':
        return 'Appointment Matched';
      case 'accStarts':
        return 'Matching Access Time Starts';
      case 'accEnds':
        return 'Matching Access Time Ends';
      case 'stStarts':
        return useServiceAsWork ? 'Service Time Starts' : 'Service Time or Resting Starts';
      case 'stEnds':
        return useServiceAsWork ? 'Service Time Ends' : 'Service Time or Resting Ends';
      case 'before':
        return 'Before Constraints';
      case 'pickup':
        return 'Picking up good';
      case 'drop':
        return 'Dropping good';
      default:
        return 'Unknown Event';
    }
  }

  function getReadableConstraintNameFromEventClass(e) {

    var useServiceAsWork = true;
    //document.getElementById("rest-custom-serviceTimes").value === null
      //  || document.getElementById("rest-custom-serviceTimes").value === "work";

    switch (e.name) {
      case 'arr':
        return 'Arrival at Waypoint';
      case 'dep':
        return 'Departure from Waypoint';
      case 'at':
        return 'Appointment Matched';
      case 'accStarts':
        return 'Matching Access Time Starts';
      case 'accEnds':
        return 'Matching Access Time Ends';
      case 'stStarts':
        return useServiceAsWork ? 'Service Time Starts' : 'Service Time or Resting Starts';
      case 'stEnds':
        return useServiceAsWork ? 'Service Time Ends' : 'Service Time or Resting Ends';
      case 'before':
        return e.constraintDescription ? 'Before ' + e.constraintDescription : 'Before Constraints';
      case 'pickup':
        return 'Pickup load: ' + e.constraintDescription;
      case 'drop':
        return 'Drop load: ' + e.constraintDescription;

      default:
        return 'Unknown Event';
    }
  }

  function toggleWaypointDetails(num, lat, lng, timelineEvents) {
    var numEvents = timelineEvents.length;
    if (numEvents === 0) {
      return;
    }
    var minorThanGraph = {
      at: ['stEnds', 'dep', 'accEnds'],
      stStarts: ['at', 'pickup', 'drop'],
      arr: ['stStarts', 'dep', 'pickup', 'drop'],
      accStarts: ['arr'],
      stEnds: ['dep'],
      pickup: ['dep', 'stEnds'],
      drop: ['pickup', 'dep', 'stEnds']
    };

    timelineEvents.sort(function (a, b) {
      if (a.time === b.time) {
        if (minorThanGraph[a.name] && $.inArray(b.name, minorThanGraph[a.name]) >= 0) {
          return -1;
        }
        if (minorThanGraph[b.name] && $.inArray(a.name, minorThanGraph[b.name]) >= 0) {
          return 1;
        }
      }
      return a.time - b.time;
    });
    var list = $('<ul class="timeline">');
    for (var i = 0; i < numEvents; i++) {
      var e = timelineEvents[i];
      if (e.time) { // in case of before constraint we do not show any time
        var eventDate = new Date(e.time * 1000);
        list.append('<li class="' + e.name + '">' + eventDate.toDateString() + ' ' + eventDate.toTimeString() + ": " + getReadableConstraintNameFromEventClass(e) + '</li>');
      } else {
        list.append('<li class="' + e.name + '">' + getReadableConstraintNameFromEventClass(e) + '</li>');
      }

    }

    var content = $('<div>');
    content.append(list);
    var bubble = new H.ui.InfoBubble({lat: lat, lng: lng}, {content: content.html()});
    ui.addBubble(bubble);
  }

  /**
   * Draws pins with timelines for destinations.
   * @returns {H.map.DomIcon}
   */
  var createSvgMarkerIconWithImg = function (num, waypoint, routeDepartureTime, routeTotalTime) {
    var estDep = waypoint.estimatedDeparture;
    var estArv = waypoint.estimatedArrival;
    var spent = ( estArv !== null ? (estArv.substr(11) + " - ") : ''  ) + ( estDep !== null ? estDep.substr(11) : '' );

    var div = document.createElement("div");
    div.style.marginTop = "-57px";
    div.style.marginLeft = "-23px";

    var timelineEvents = [];

    var timeline = '<rect id="label-box" ry="3" rx="3" stroke="#000000" stroke-width="1" fill-opacity="0.6" height="9" width="188" y="0" x="17.5" fill="white"/>';

    var totalLenght = 188;
    var startX = 17.5;

    var completedWidth;
    if (waypoint.estimatedDeparture) {
      var waypointDepartureTime = new Date(waypoint.estimatedDeparture).getTime() / 1000;
      timelineEvents.push({name: 'dep', time: waypointDepartureTime});
      var waypointDepartureTimeOffset = waypointDepartureTime - routeDepartureTime;
      completedWidth = (totalLenght / routeTotalTime * waypointDepartureTimeOffset);
    } else {
      completedWidth = totalLenght;
    }
    timeline += '<rect id="label-box" ry="3" rx="3" stroke-width="0" fill-opacity="0.6" height="9" width="' + completedWidth + '" y="0" x="17.5" fill="#121212" />';

    // Arrival red line, not for the first waypoint.
    if (waypoint.estimatedArrival) {
      var waypointArrivalTime = new Date(waypoint.estimatedArrival).getTime() / 1000;
      timelineEvents.push({name: 'arr', time: waypointArrivalTime});
      var waypointArrivalTimeOffset = waypointArrivalTime - routeDepartureTime;
      var arrX = startX + (totalLenght / routeTotalTime * waypointArrivalTimeOffset);
      var arrBox = '<rect id="label-box" stroke-width="0" height="9" width="2" y="0" x="' + arrX + '" fill="red" />';
    }

    var constraintsDescr = waypoint.fulfilledConstraints || [];
    for (var x = 0; x < constraintsDescr.length; x++) {
      var constraints = constraintsDescr[x].split(';');

      var accBoxes = '';
      var stBox = '';
      var atBox = '';
      var pickupBox = '';
      var dropBox = '';

      for (var i = 0; i < constraints.length; i++) {
        var sepIndex = constraints[i].indexOf(':');
        var constraintType = constraints[i].substr(0, sepIndex);
        var constraint = constraints[i].substr(sepIndex + 1);
        switch (constraintType) {
          case 'acc':
            // Only one supported ad the moment. When we have more, just position them at different y and make the st higher.
            var accessStart = constraint.split('|')[0];
            var accessEnd = constraint.split('|')[1];

            var days = {'mo': 1, 'tu': 2, 'we': 3, 'th': 4, 'fr': 5, 'sa': 6, 'su': 0};
            var constraintDay = days[accessStart.substring(0, 2)];
            var arrivalDate = new Date(waypoint.estimatedArrival);
            var firstPart = waypoint.estimatedArrival.split('T')[0];

          function getMinAccessTimeOffset() {
            var nextCheckDate = new Date(firstPart + 'T' + accessStart.substring(2));

            while (arrivalDate.getDay() !== nextCheckDate.getDay() || arrivalDate < nextCheckDate) {
              nextCheckDate.setDate(nextCheckDate.getDate() - 1);
            }

            var offset = nextCheckDate.getTime() / 1000 - routeDepartureTime;
            return offset < 0 ? 0 : offset;
          }

          function getMaxAccessTimeOffset() {
            var nextCheckDate = new Date(firstPart + 'T' + accessEnd.substring(2));

            while (arrivalDate.getDay() !== nextCheckDate.getDay() || arrivalDate > nextCheckDate) {
              nextCheckDate.setDate(nextCheckDate.getDate() + 1);
            }

            var offset = nextCheckDate.getTime() / 1000 - routeDepartureTime;
            return offset > routeTotalTime ? Number(routeTotalTime) : offset;
          }

            var leftMatchingTimeOffset = getMinAccessTimeOffset();
            timelineEvents.push({name: 'accStarts', time: leftMatchingTimeOffset + routeDepartureTime});

            var rightMatchingTimeOffset = getMaxAccessTimeOffset();

            timelineEvents.push({name: 'accEnds', time: rightMatchingTimeOffset + routeDepartureTime});
            var acc = rightMatchingTimeOffset - leftMatchingTimeOffset;


            var accX = startX + (totalLenght / routeTotalTime * leftMatchingTimeOffset);
            var accWidth = (totalLenght / routeTotalTime * acc);

            accBoxes += '<rect id="label-box" stroke-width="0" ry="1" rx="1" height="2" width="' + accWidth + '" y="6" x="' + accX + '" fill="#59b354" />';
            break;
          case 'st':
            var st = Number(constraint);
            var stWidth = (totalLenght / routeTotalTime * st);
            break;
          case 'at':
            var at = new Date(constraint);
            var waypointConstrainedArrivalTime = at.getTime() / 1000;
            timelineEvents.push({name: 'at', time: waypointConstrainedArrivalTime});
            var waypointConstrainedArrivalTimeOffset = waypointConstrainedArrivalTime - routeDepartureTime;

            var atX = startX + (totalLenght / routeTotalTime * waypointConstrainedArrivalTimeOffset);
            atBox = '<rect id="at-constraint-box-' + num + '" stroke-width="0" height="9" width="2" y="0" x="' + atX + '" fill="yellow" />';
            break;
          case 'before':
            var beforeConstraint = constraint;
            timelineEvents.push({name: 'before', time: '', constraintDescription: beforeConstraint});
            break;
          case 'pickup':
            timelineEvents.push({
              name: 'pickup',
              time: waypointArrivalTime || waypointDepartureTime,
              constraintDescription: constraint
            });
            pickupBox = '<rect id="label-box" stroke-width="0" height="9" width="2" y="0" x="' + (arrX || startX + completedWidth) + '" fill="orange" />';
            break;
          case 'drop':
            timelineEvents.push({
              name: 'drop',
              time: waypointArrivalTime || waypointDepartureTime,
              constraintDescription: constraint
            });
            dropBox = '<rect id="label-box" stroke-width="0" height="9" width="2" y="0" x="' + (arrX || startX + completedWidth) + '" fill="lightgreen" />';
            break;
          default:
            console.error('Cannot visualize unsupported constraint: ' + constraintType);
        }
      }

      if (st) {
        // If 'at' constraint is matched, service time starts there.
        var stX = atX || arrX;
        if (atX) {
          timelineEvents.push({name: 'stStarts', time: waypointConstrainedArrivalTime});
          timelineEvents.push({name: 'stEnds', time: waypointConstrainedArrivalTime + st});
        } else {
          timelineEvents.push({name: 'stStarts', time: waypointArrivalTime});
          timelineEvents.push({name: 'stEnds', time: waypointArrivalTime + st});
        }
        stBox = '<rect id="at-constraint-box-' + num + '" stroke-width="0" height="4" width="' + stWidth + '" y="1" x="' + stX + '" fill="#1b5fcc" />';
      }

      // SVG z-order depends on relative order of elements.
      timeline += accBoxes + stBox + atBox + arrBox + pickupBox + dropBox;

    }


    var svg = '<svg overflow="visible" width="220" height="900" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<g>' +
        '<rect id="label-box-' + num + '" ry="3" rx="3" stroke="#000000" height="30" width="155" y="11" x="50" fill="' + wayPointColor + '"/>' +
        '<a onclick=\'toggleWaypointDetails(' + num + ', ' + waypoint.lat + ', ' + waypoint.lng + ', ' + JSON.stringify(timelineEvents) + ');\' xlink:href="#">' +
        '<image width="16" height="16" x="54" y="14"  xlink:href="images/examples/history.svg" />' +
        '</a>' +
        '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="70" stroke-width="0" fill="#000000">' + waypoint.id                     + '</text>' +
        '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="9"  font-weight="bold" y="37" x="55" stroke-width="0" fill="#000000">' + (spent.length > 2 ? spent : '') + '</text>' +
        '<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAADCCAYAAABkHM2FAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wEVEQ0Rt+EdvwAABdZJREFUeF7t2+1V20AUhGHDSSW0QAUph4oohwpogVYIcqJ4La00Wlkfe2ff/EkirozvPB5F+MRPl7W/Xt++157KeRsl8Pn+tOaRlp0E8JpszzlnwQthHl1hv/w+ZzG+6+Xy9TGfwgz+NHoKDu58wDV9NX0xTMDn0QGvibH8uQj4MTrg5SHXeMYM/D064DXyrX9OE/A3dMDXh1vzmRn459Hz5aZtFEnoAxnPv03vW54ZCL0wT/6WQN/4nzv6cdMJyj4B0O2JxwuCPs7E/gjo9sTjBZ8v6v318TkciZzAj/et6dy5R6bUzz3x5fKu47KbAN2OVC8Eus7IbgJ0O1K9EOg6I7sJ0O1I9UKg64zsJkC3I9ULga4zspsA3Y5ULwS6zshuAnQ7Ur0Q6DojuwnQ7Uj1QqDrjOwmQLcj1QuBrjOymwDdjlQvBLrOyG4CdDtSvRDoOiO7CdDtSPVCoOuM7CZAtyPVC4GuM7KbAN2OVC8Eus7IbgJ0O1K9EOg6I7sJ0O1I9UKg64zsJkC3I9ULga4zspsA3Y5ULwS6zshuAnQ7Ur0Q6DojuwnQ7Uj1QqDrjOwmQLcj1QuBrjOymwDdjlQvBLrOyG4CdDtSvRDoOiO7CdDtSPVCoOuM7CZAtyPVC4GuM7KbAN2OVC8Eus7IbgJ0O1K9EOg6I7sJ0O1I9UKg64zsJkC3I9ULga4zspsA3Y5ULwS6zshuAnQ7Ur0Q6DojuwnQ7Uj1QqDrjOwmQLcj1QuBrjOymwDdjlQvBLrOyG4CdDtSvRDoOiO7CdDtSPVCoOuM7CZAtyPVC4GuM7KbAN2OVC8Eus7IbgJ0O1K9EOg6I7sJ0O1I9UKg64zsJkC3I9ULga4zspsA3Y5ULwS6zshuAnQ7Ur0Q6DojuwnQ7Uj1QqDrjOwmQLcj1QuBrjOymwDdjlQvBLrOyG4CdDtSvRDoOiO7CdDtSPVCN/SvDz3NRNwEEt/ny+f7U9xNeObFCfx4c3kvTi3+CaDHNyzeAPTiyOKfAHp8w+INbjdxr2/f17Nffhc/CCdUnkB/5/7vpn3cdH50q1yw8OllPO9/XOvbTuMLk610PAVPfjQf/4wOfKWChU9rArx7lDF6dxT4woQrG58Bn0YHvjLFgqcjwOfRh/C578udfi6VY45lbtDuvvHM2+v5y/vwaaeX++HXWvj72S9uBZwazGD3Y8vQc7AtvRDORJ8DXwCco1uPnns0t2Nnv2HVg6/EneIYvzkzNdna8bOvZDuBd4ygqxfzGZf2HcG7dbm859DPvKzvDE7Tc+BnHjsAnKbngM9oeXqHvvFNW27FX7mDzR474+btoHanptzI5V7hR928nQDO5T0FP/qyfhJ4tzJNzzV972MngtP0HvfIlp8MTtP3bvTw8SsAp+ldAke1vBJwmj5s4l5/rwicph/R8srAafpeze4ft0Lwtpu+d8srBafpezW9YvB2m75nyysHp+lbNz0AeJtN36vlQcBp+lZNDwTeXtP3aHkwcJr+aNMDgrfV9K1bHhScpq9temDwdpq+ZcuDg7fR9B58bavT8wzA20Dv0R79z44m4P7oW7XcCNwffYuWm4F3kfh+lm2LmzdD8Haa3je+5HdTcN+mP9pyY3Canmu+Obhn09e2vMfuUjngk6O519tRx/jUapd0A+1OX1Bed+9rWt4YeIff9gcYGwTv0H2aXtryRsHbbXrD4D5NL2l54+DtNR3w6018/H/Tl7Yc8Ct496uNu3fA/4N3f4jd9CUtB/wO3L/pgI/AYzddtRzwLHjcpvfgU2sBPpXM9XjsG7ncf3YEfBa8+2K8G7m5yzrgEjx+09MVAV8EHq/pUy0HfDG4R9MBLwKP1fRcywEvBo/ddMBXgcdp+rDlgK8Gj9l0wB8Cj9H0tOWAPwweq+mAbwJef9OH77GbfwhhM1XxQHHeewdcUC7/cr3vvactB3y56ILJ+psO+AJGh5Gu5cN/zx32YoeZBACfCYcvkQAJkAAJkEA2gT8reWIzdSwMcQAAAABJRU5ErkJggg==" />' +
        '<text id="label-text" xml:space="preserve" text-anchor="middle" font-family="Sans-serif" font-size="18" font-weight="bold" y="33" x="33" stroke-width="0" fill="#ffffff">' + num + '</text>' +
        (timeline || '') +
        '</g>' +
        '</svg>';
    div.innerHTML = svg;

    return new H.map.DomIcon(div, {
      width: 33,
      height: 33,
      drawable: false
    });
  };

  /**
   * Draws pins for destinations
   * @param line1
   * @returns {H.map.DomIcon}
   */
  var createSimpleSvgMarkerIconWithImg = function (num, line1, line2) {
    var div = document.createElement("div");
    div.style.marginTop = "-57px";
    div.style.marginLeft = "-23px";

    var svg = '<svg width="220" height="56" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<g>' +
        '<rect id="label-box" ry="3" rx="3" stroke="#000000" height="30" width="160" y="11" x="45" fill="#ffffff"/>' +
        '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="55" stroke-width="0" fill="#000000">__line1__</text>' +
        '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="9" font-weight="bold" y="34" x="55" stroke-width="0" fill="#000000">__line2__</text>' +
        '<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAADCCAYAAABkHM2FAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QgICRwZacXPuwAAAztJREFUeNrt3U1u2mAYhVF/iJV0miEryFIyRMpyIjHMUroChpl2K3TSqpTwY4zB5r3nmbeqOFzz2SRq64a2Wu86Tdt204b8sQY4743QbsH+eHvxIk/U++fXYPzWBxzuk74ZTsA34HnwDXgefAOeB9+A58EvnMhrd8yz7a8ceMDit5u28HLkBR26oKsoui9Tslqtdwu3anm3bi7vPtMFXdAFXdAFXdAFXdAFXdAFXdAFXdAFXdChC7qgC7qgC7qgC7qgC7qgC7qgC7qgC7qgQxd0QRd0QRd0QRd0QRd0QRd0QRd0QRd0QYcu6IIu6IIu6IIu6IIu6IIu6IIu6IIu6IIOXdAFXdAFXdAFXdAFXdAFXdAFXdAFXdAFXdChC7qgC7qgC7qga4bo759fXo3C7fsuuu2meUmC2m6ay7vPdEEXdNXo3yFutd51Xdd9vL14Vaqe3P8c2hfnjvaqdav2fel7a7f4guB7t+bf79HBlwY/jg6+NPhpdPBlwc+jH8Afy5thXge0/zrzeL3fc/cL+NWb+s191R1Vj+9SloP/ovA3wizAB35Zthz8r0n4dm7iN/bhQ5Wx8hg2DBz6TD/P7wne/yAXuvKK4JY+10Pbnc9Llj6Dlfd5oDJmS8rTHt4etW6X95kc3qYAd3mf8LI+FbilFz+wWfpMVj41uKWHLdzSH7zyuYBbetjCLf1BK58buKWHLdzS77zyuYJbetjCs5d+x5XPHdzSA8Ezl36nlT8LuKUHguct/Q4rfzZwSw8Ez1r6yCt/VnBLDwTPWfqIK3928Iylj/jDjhXAoy7vt668Cnh99JFWXgk8Zum3rLwaeO2D3AiHt4rgbtkCwesu/caVVwa39EDwmksfuPJH/+bolPmt1ZB11136gJWngcd/pieC11r6lStPBY9dejJ4naVfsfJ08LilA6+y9J4rBx62dOCVlt5j5cDDlg682tIvrBx4taVf+DEo4IUv78dWDrzi5f3MZR142EEOeNWln1g58LClA6+89CMrBx62dODVl36wcuBhSweesPS/T99+vHbdr5/Ao5YOPGTph8/YgYctHXjA0vdXDjxs6cBDWq13U/9X1pr6ACdJki71G2fLm9TDrqzTAAAAAElFTkSuQmCC" />' +
        '<text id="label-text" xml:space="preserve" text-anchor="middle" font-family="Sans-serif" font-size="18" font-weight="bold" y="33" x="33" stroke-width="0" fill="#ffffff">__num__</text>' +
        '</g>' +
        '</svg>';

    svg = svg.replace(/__line1__/g, line1);
    svg = svg.replace(/__line2__/g, line2 !== null ? line2 : '');
    svg = svg.replace(/__num__/g, num);
    div.innerHTML = svg;

    return new H.map.DomIcon(div, {
      width: 33,
      height: 33,
      drawable: false
    });
  };

  /**
   *   TextMarkers for labeling on interconnection
   */
  var createSvgMarkerLabel = function (inscriptions, svgWidth, svgBorderHeight, color) {
    var svgHeight = 2 * svgBorderHeight + inscriptions.length * 11;
    var div = document.createElement("div");
    var svg = '<svg width="' + (svgWidth + 1) + '" height="' + (svgHeight + 1) + '" xmlns="http://www.w3.org/2000/svg">' +
        '<rect fill="' + color + '" x="0.5" y="0.5" rx="5" ry="5" width="' + svgWidth + '" height="' + svgHeight + '"' +
        ' style="stroke:#FFF;stroke-width:1;"/>' +
        '<text x="8" y="' + 2 + '" fill="#FFF" style="font-weight:normal;font-family:sans-serif;font-size:10px;">';

    for (var i = 0; i < inscriptions.length; i++)   svg += '<tspan x="6" dy="1.2em">' + inscriptions[i] + '</tspan>'

    svg += '</text></svg>'

    div.innerHTML = svg;

    return new H.map.DomIcon(div, {
      width: svgWidth,
      height: svgHeight,
      drawable: false
    });
  };

  var createConnectionLabel = function (lat, lng, distance, basetime, rest, wait, color) {
    var inscriptions = ["D: " + humanReadableDist(distance), "T: " + humanReadabletimeShort(basetime)];
    if (rest !== 0)    inscriptions.push("R: " + humanReadabletimeShort(rest));
    if (wait !== 0)    inscriptions.push("W: " + humanReadabletimeShort(wait));

    var label = new H.map.DomMarker(
        new H.geo.Point(lat, lng),
        {
          icon: createSvgMarkerLabel(inscriptions, 70, 5, color)
        });

    return label;
  };

  function updateColor() {
    if (currentColor.indexOf("rgba(80,80,80,") > -1) {
      currentColor = "rgba(0,85,170,";
      wayPointColor = "#A9D4FF";
    } else {
      currentColor = "rgba(80,80,80,";
      wayPointColor = "#C7C5C5";
    }
  }


  var colorForIndex = function (num, alpha) {
    return currentColor + alpha + ")";

  };

  /**
   * Creates poly lines for interconnections
   * @param strip
   * @param num
   * @returns {H.map.Polyline}
   */
  var createPolylineForIndex = function (strip, num) {
    var polyline = new H.map.Polyline(strip, {
      style: {
        lineWidth: 7,
        strokeColor: colorForIndex(num, 0.6),
        fillColor: colorForIndex(num, 0.4)
      }
    });

    // to give a highlight to select
    // polyline in case multiple routes present
    polyline.addEventListener('pointerenter', function (e) {
      var style = e.target.getStyle();
      var newStyle = style.getCopy({lineWidth: 10});
      e.target.setStyle(newStyle);

    });
    polyline.addEventListener('pointerleave', function (e) {
      var style = e.target.getStyle();
      var newStyle = style.getCopy({lineWidth: 7});
      e.target.setStyle(newStyle);

    });
    return polyline;
  };

  var humanReadabletimeShort = function (timeSeconds) {
    if (timeSeconds < 60)
      return timeSeconds + "s ";
    else
      return padZerosNumbers(Math.floor((timeSeconds / 3600)), 2) + ":"
          + padZerosNumbers(Math.floor((timeSeconds / 60) % 60), 2) + ":" + padZerosNumbers(timeSeconds % 60, 2);
  };

  var humanReadableDist = function (distMeters) {
    if (distMeters < 1000)
      return distMeters + "m";
    else
      return ( distMeters / 1000 ).toFixed(1) + "km";
  };

  var humanReadabletime = function (timeSeconds) {
    if (timeSeconds < 60)
      return timeSeconds + "s ";
    if (timeSeconds < 3600)
      return Math.floor((timeSeconds / 60)) + "min " + timeSeconds % 60 + 's';
    else
      return Math.floor((timeSeconds / 3600)) + "h " + Math.floor((timeSeconds / 60) % 60) + "min " + timeSeconds % 60 + 's';
  };


  /**
   This method clears the waypoint markers on the map
   */
  function clearWayPointMarkersOnMap() {
    labels.removeAll();
  }