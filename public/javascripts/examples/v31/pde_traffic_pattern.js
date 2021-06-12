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

    // check if the site was loaded via secure connection
  var secure = (location.protocol === 'https:') ? true : false;
  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
  var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
  });
  maptypes = platform.createDefaultLayers();
  var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
    center: {lat: 50.110924, lng: 8.682127},
    zoom: 13,
    pixelRatio: hidpi ? 2 : 1
  });
  var mapevents = new H.mapevents.MapEvents(map);
  var behavior = new H.mapevents.Behavior(mapevents);
  var ui = H.ui.UI.createDefault(map, maptypes);
  window.addEventListener('resize', function () {
    map.getViewPort().resize();
  });
  var PDE_ENDPOINT = document.getElementById('endpoint').value;
  var drivingSidesByIsoCountryCode = {};

  var weekday = new Date().getDay();
  var pattern_time = Math.trunc(new Date().getHours() * 4 + new Date().getMinutes() / 15);
  var trafficPatternHashMap;
  var currentLayers = [];

    var bubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
    bubble.close();
    ui.addBubble(bubble);

    function showBubble(fc, e, data) {
      var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
      var trafficLayer = 'TRAFFIC_PATTERN_FC' + fc;
      var content = ('<table class="speed-record">' +
      '<tr><td>LINK_ID</td><td>{linkId}</td></tr>' +
      '<tr><td>FROM_REF_KMH</td><td>{fromRefFlow}</td></tr>' +
      '<tr><td>TO_REF_KMH</td><td>{toRefFlow}</td></tr>' +
      '<tr><td>FREE_FLOW_KMH</td><td>{avgFlow}</td></tr>' +
      '</table>')
          .replace('{linkId}', data[trafficLayer].LINK_ID)
          .replace('{fromRefFlow}', getSpeed(fc, 1, data) || 'n/a')
          .replace(  '{toRefFlow}', getSpeed(fc, 2, data) || 'n/a')
          .replace(    '{avgFlow}', getSpeed(fc, 0, data) || 'n/a');
      bubble.setPosition(p);
      bubble.setContent(content);
      bubble.open();
    }

    function trafficBasedStyle(fc, data) {
      var trafficLayer = 'TRAFFIC_PATTERN_FC' + fc;
      var trafficData = data[trafficLayer];
      if (!trafficData || !trafficPatternHashMap) return null; // at startup it takes 1 - 2 minutes to load the pattern content
	  var freeFlowSpeed   = getSpeed(fc, 0, data);
	  var fromRefSpeedKmh = getSpeed(fc, 1, data);
	  var   toRefSpeedKmh = getSpeed(fc, 2, data);
	  if (!fromRefSpeedKmh && !toRefSpeedKmh) return null;
	  var speedKmh = 0;
	  if (data.processedKey === 'single') { // check which fields the object got created by the "splitMultiDigitized()" postProcess function
        speedKmh = (fromRefSpeedKmh && toRefSpeedKmh) ? Math.min(fromRefSpeedKmh, toRefSpeedKmh) : (fromRefSpeedKmh ? fromRefSpeedKmh : toRefSpeedKmh);
      } else if (data.processedKey === 'fromRef') {
        speedKmh = fromRefSpeedKmh;
      } else if (data.processedKey === 'toRef') {
        speedKmh = toRefSpeedKmh;
      }
	  if (freeFlowSpeed <= 0) freeFlowSpeed = 1; // avoid division by zero
	  var speedFactor = speedKmh / freeFlowSpeed; // coloring is subject to customer preferences
      var                           color = '#61ba72'; // green
      if      (speedFactor <= 0.50) color = '#ea232d'; // red
      else if (speedFactor <= 0.75) color = '#fecf00'; // yellow
      return { strokeColor: color, lineWidth: 8 - fc }
    }

    function splitMultiDigitized(fc, strip, data) {

      function shift(strip, dist) {
        var shifted = new H.geo.LineString();
        var lastShifted;
        for (var i = 0; i < strip.getPointCount() - 1; i++) {
          var p0 = strip.extractPoint(i);
          var p1 = strip.extractPoint(i + 1);
          var bearing = p0.bearing(p1) + 90;
          var p0shifted = p0.walk(bearing, dist);
          if (lastShifted) {
            p0shifted =p0shifted.walk(p0shifted.bearing(lastShifted), p0shifted.distance(lastShifted) / 2);
          }
          shifted.pushPoint(p0shifted);
          lastShifted = p1.walk(bearing, dist);
          if (i + 1 === strip.getPointCount() - 1) shifted.pushPoint(lastShifted);
        }
        return shifted;
      }
	  
      var travelDirection = data['LINK_ATTRIBUTE_FC' + fc].TRAVEL_DIRECTION;
      var drivingSide = drivingSidesByIsoCountryCode[data['LINK_ATTRIBUTE_FC' + fc].ISO_COUNTRY_CODE] || 'R';
      var fromRefDist = drivingSide === 'R' ? 4 : -4;
      if (travelDirection === 'B') {
        return { fromRef: shift(strip, fromRefDist), toRef: shift(strip, -fromRefDist) };
      } else if (travelDirection === 'F') {
        return {single: shift(strip, fromRefDist)};
      } else if (travelDirection === 'T') {
        return {single: shift(strip, -fromRefDist)};
      }
    }

	function getSpeed(fc, mode, data) { // 0 = free flow speed, 1 = from ref speed, 2 = to ref speed
      var trafficLayer = 'TRAFFIC_PATTERN_FC' + fc;
      var trafficData = data[trafficLayer];
      if (!trafficData || !trafficPatternHashMap) return null; // at startup it takes a moment to load the pattern content
	  if (mode == 0) { // Free flow = Average across the weekdays of the maximum speed of each day. Customers do it differetnly, this is just one possibility.
        var weekdayList = trafficData.F_WEEKDAY ? trafficData.F_WEEKDAY : trafficData.T_WEEKDAY; // take ony for the free flow computation
	    var freeFlowSpeed = 0;
	    for (var w = 0; weekdayList && w < 7; w++) {
          var pattern = weekdayList.split(',')[w];
		  var maxSpeedOfDay = 0;
		  for (var d = 0; pattern && d < 96; d++) {
		    if (trafficPatternHashMap[pattern][d] > maxSpeedOfDay) maxSpeedOfDay = trafficPatternHashMap[pattern][d];
		  }
		  freeFlowSpeed += maxSpeedOfDay/7;
		}
	    return Math.trunc(freeFlowSpeed);
	  }
	  var weekdayList = mode == 1 ? trafficData.F_WEEKDAY : trafficData.T_WEEKDAY;
      var pattern = weekdayList ? weekdayList.split(',')[weekday] : null;
	  return pattern ? trafficPatternHashMap[pattern][pattern_time] : null;
	}

    function requestTrafficPattern() {
      currentLayers.forEach(function (l) {
        map.removeLayer(l);
      });
      for (var fc = 1; fc <= 5; fc++) {
        var layer = new H.map.layer.ObjectLayer(createPdeObjectProvider(map, {
          min: 11 + fc,
          layer: 'ROAD_GEOM_FC' + fc,
          dataLayers: [ {layer: 'TRAFFIC_PATTERN_FC' + fc}, {layer: 'LINK_ATTRIBUTE_FC' + fc, cols: ['LINK_ID', 'ISO_COUNTRY_CODE', 'TRAVEL_DIRECTION']} ],
          level: 8 + fc,
          postProcess: splitMultiDigitized.bind(null, fc),
          tap: showBubble.bind(null, fc),
          polylineStyle: trafficBasedStyle.bind(null, fc)
        }));
        map.addLayer(layer);
        currentLayers.push(layer);
		
		/*required in JS 3.1 to trigger spatial requests*/
		requestSpatial(layer,map);
      }
    }

    document.getElementById("day").onchange = function(sel) {
		weekday = parseInt(sel.srcElement.value);			
		requestTrafficPattern();
	};
	
	// time slider initialization
	var slider = document.createElement('input');
	slider.setAttribute('type', 'range');
	slider.setAttribute('orient', 'horizontal');
	slider.min = 0;
	slider.max = 240;
	slider.style.width = "240px";
	slider.style.cursor = "pointer";
	bar.appendChild(slider);
	slider.onchange    = function() { updateSliderText(slider.value, true ) };
	slider.onmousemove = function() { updateSliderText(slider.value, false) };
	slider.value = 240 * pattern_time / 96;
    patternTimeText.innerHTML = "Time: " + new Date().getHours() + ":" + Math.floor(new Date().getMinutes() / 15) * 15 + ". <b><font color=red>Loading Traffic Pattern curves...</font></b>";
    document.getElementById("day").value = weekday;

  	function updateSliderText (pos, refreshDisplay) {
				t = (Math.ceil(pos / 240 * 96) / 4);
				hour = Math.floor(t);
				h = t.toFixed(2);
				minutes = (h % 1) * 60;
				pattern_time = Math.ceil(pos / 240 * 96);
				if (pattern_time >= 96) pattern_time = 95;
				if(hour < 10) hour = "0" + hour; // add leading zero to minutes string
				if(minutes === 0) minutes = "00"; // format minutes from 0 to 00
				patternTimeText.innerHTML = "Time: " + hour + ":" + minutes;
				if (refreshDisplay) {		
					requestTrafficPattern();
				}
	}
			
    function gotStaticContentTrafficPattern(response)	{
	  if (response.error != undefined) {
		alert(response.error);
		return;
	  }
	  if (response.responseCode != undefined) {
		alert (response.message);
		return;
	  }
	  trafficPatternHashMap = new Object();
	  for (var r = 0; r < response.Rows.length; r++) {
        trafficPatternHashMap[response.Rows[r].PATTERN_ID] = response.Rows[r].SPEED_VALUES.split(',');
	  }
	  requestTrafficPattern();
	  patternTimeText.innerHTML = "Time: " + new Date().getHours() + ":" + Math.floor(new Date().getMinutes() / 15) * 15;
    }
  
    // load the static layer TRAFFIC_PATTERN
    var url = document.getElementById('endpoint').value + "/1/static.json?content=TRAFFIC_PATTERN&app_id=" + app_id + "&app_code=" + app_code + "&callback=gotStaticContentTrafficPattern";
    var script = document.createElement("script");
    script.src = url;
    document.body.appendChild(script);


	H.geo.Point.prototype.bearing = function (to) {
		'use strict';
		var lngTo = to.lng * (Math.PI / 180);
		var lngFrom = this.lng * (Math.PI / 180);
		var latTo = to.lat * (Math.PI / 180);
		var latFrom = this.lat * (Math.PI / 180);
		var lngDelta = (lngTo - lngFrom);
		var y = Math.sin(lngDelta) * Math.cos(latTo);
		var x = Math.cos(latFrom) * Math.sin(latTo) - Math.sin(latFrom) * Math.cos(latTo) * Math.cos(lngDelta);
		var brng = Math.atan2(y, x);
		return (brng >= 0 ? brng : (2 * Math.PI + brng)) * (180 / Math.PI);
	};
	
		
	/**
	* Function triggers spatial layer requests explicitly
	*/
	function requestSpatial(layer,map){
		var boundingBox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
		var zoom = map.getZoom();
		layer.getProvider().requestSpatials(boundingBox,zoom,true,false);
	}
	
	/*required in JS 3.1 to trigger spatial requests*/
	map.addEventListener("mapviewchangeend",function(){
		currentLayers.forEach(function (l) {
			requestSpatial(l,map);
		});
	})