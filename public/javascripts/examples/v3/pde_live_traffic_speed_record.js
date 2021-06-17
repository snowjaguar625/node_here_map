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

  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
  var platform = new H.service.Platform({
    useHTTPS: (location.protocol === 'https:') ? true : false,
    app_id: app_id,
    app_code: app_code
  });
  maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
  var greyTileLayer = platform.getMapTileService({type: 'base'}).createTileLayer('maptile', 'normal.day.grey', hidpi ? 512 : 256, 'png8', null);
  greyTileLayer.setMax(17);
  var map = new H.Map(document.getElementById('mapContainer'), greyTileLayer, {
    center: {lat: 50.110924, lng: 8.682127},
    zoom: 16,
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

  var trafficTimeMachine = (function () {
    var currentLayers = [];
    var timer;

    var bubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
    bubble.close();
    ui.addBubble(bubble);

    function showBubble(fc, e, data) {
      var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
      var trafficLayer = 'TRAFFIC_SPEED_RECORD_FC' + fc;
      var content = ('<table class="speed-record">' +
      '<tr><td>LINK_ID</td><td>{linkId}</td></tr>' +
      '<tr><td>FROM_REF_FLOW</td><td>{fromRefFlow}</td></tr>' +
      '<tr><td>TO_REF_FLOW</td><td>{toRefFlow}</td></tr>' +
      '</table>' +
      '<a target="_blank" class="speed-record" href="https://tcs.ext.here.com/pde/layer?region=TSRWORLD&release=LATEST&url_root={pdeRoot}&layer=TRAFFIC_SPEED_RECORD_FC{fc}">Read PDE layer documentation for details</a>')
          .replace('{linkId}', data[trafficLayer].LINK_ID)
          .replace('{fromRefFlow}', data[trafficLayer].FROM_REF_FLOW || 'n/a')
          .replace('{toRefFlow}', data[trafficLayer].TO_REF_FLOW || 'n/a')
          .replace('{pdeRoot}', PDE_ENDPOINT.replace('http://', '').replace('https://', ''))
          .replace('{fc}', fc);
      bubble.setPosition(p);
      bubble.setContent(content);
      bubble.open();
    }

    function trafficBasedStyle(fc, data) {
      var trafficLayer = 'TRAFFIC_SPEED_RECORD_FC' + fc;
      var trafficData = data[trafficLayer];
      if (!trafficData) return null;

      var JF;
      var fromRefJF = (trafficData.FROM_REF_FLOW && trafficData.FROM_REF_FLOW.split(';')[3]) || null;
      var toRefJF = (trafficData.TO_REF_FLOW && trafficData.TO_REF_FLOW.split(';')[3]) || null;
      if (data.processedKey === 'single') {
        JF = (fromRefJF && toRefJF) ? (fromRefJF + toRefJF) / 2 : (fromRefJF || toRefJF);
      } else if (data.processedKey === 'fromRef') {
        JF = fromRefJF;
      } else if (data.processedKey === 'toRef') {
        JF = toRefJF;
      }

      if (JF === null) return null;

      // See https://developer.here.com/rest-apis/documentation/traffic/topics/tiles.html
      if (JF < 0) return null;
      var color = '#61ba72';
      if (JF >= 4) color = '#fecf00';
      if (JF >= 8) color = '#ea232d';
      if (JF >= 10) color = '#0f1621';

      return {
        strokeColor: color,
        lineWidth: 6 - fc
      }
    }

    function splitMultiDigitized(fc, strip, data) {

      function shift(strip, dist) {
        var shifted = new H.geo.Strip();
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
          if (i + 1 === strip.getPointCount() - 1) {
            shifted.pushPoint(lastShifted);
          }
        }
        return shifted;
      }

      var travelDirection = data['LINK_ATTRIBUTE_FC' + fc].TRAVEL_DIRECTION;
      var drivingSide = drivingSidesByIsoCountryCode[data['LINK_ATTRIBUTE_FC' + fc].ISO_COUNTRY_CODE] || 'R';
      var fromRefDist = drivingSide === 'R' ? 4 : -4;
      if (travelDirection === 'B') {
        return {
          fromRef: shift(strip, fromRefDist),
          toRef: shift(strip, -fromRefDist)
        };
      } else if (travelDirection === 'F') {
        return {single: shift(strip, fromRefDist)};
      } else if (travelDirection === 'T') {
        return {single: shift(strip, -fromRefDist)};
      }

    }

    function goBackBy(timestampOffset, onLoaded) {
      var release = Math.floor(new Date().getTime() + timestampOffset);

      // Just make a single tile request to get meta for actual release.
      var url = PDE_ENDPOINT + '/1/tile.json?layer=TRAFFIC_SPEED_RECORD_FC1&level=9&tilex=1&tiley=1&meta=1' +
          '&app_id=' + app_id + '&app_code=' + app_code + '&release=' + release;
      $.ajax({
            url: url,
            dataType: 'jsonp',
            error: console.error,
            success: function (data) {
              onLoaded(-(new Date().getTime() - Number(data.Meta.mapRelease)) / 1000);
            }
          }
      );


      currentLayers.forEach(function (l) {
        map.removeLayer(l);
      });
      for (var fc = 1; fc <= 5; fc++) {
        var trafficLayer = 'TRAFFIC_SPEED_RECORD_FC' + fc;
        var linkAttributeLayer = 'LINK_ATTRIBUTE_FC' + fc;
        var layer = new H.map.layer.ObjectLayer(createPdeObjectProvider(map, {
          min: 11 + fc,
          layer: 'ROAD_GEOM_FC' + fc,
          // Release as msecs will make PDE pick the nearest one to given timestamp.
          dataLayers: [
            {layer: trafficLayer, release: release},
            {layer: linkAttributeLayer, cols: ['LINK_ID', 'ISO_COUNTRY_CODE', 'TRAVEL_DIRECTION']}
          ],
          level: 8 + fc,
          postProcess: splitMultiDigitized.bind(null, fc),
          tap: showBubble.bind(null, fc),
          polylineStyle: trafficBasedStyle.bind(null, fc)
        }));
        map.addLayer(layer);
        currentLayers.push(layer);
      }
    }

    this.goBackBy = goBackBy;
    this.invokeLaterGoBackBy = function (timestampOffsetMsecs, onLoaded) {
      // used by the slider so we actually change offset of traffic after 0.2 seconds inactivity.
      timer && clearTimeout(timer);
      timer = setTimeout(function () {
        goBackBy(timestampOffsetMsecs, onLoaded);
      }, 1000)
    };

    return this;
  })();

  function updateRequestTimeLabel(offset) {
    var date = new Date(new Date().getTime() + offset * 1000);
    document.getElementById('request-ts-label').innerHTML = date.toDateString() + ' ' + date.toTimeString();
    document.getElementById('actual-ts-label').innerHTML = '...';
  }

  function updateActualTimeLabel(offset) {
    var date = new Date(new Date().getTime() + offset * 1000);
    document.getElementById('actual-ts-label').innerHTML = date.toDateString() + ' ' + date.toTimeString();
  }

  // Starting with current date.
  var url = PDE_ENDPOINT + '/1/static.json?content=COUNTRY&cols=DRIVING_SIDE;ISO_COUNTRY_CODE&app_id=' + app_id + '&app_code=' + app_code;

  // First we load country static layer where we have information about driving side (relevant for rendering).
  var req = new XMLHttpRequest();
  req.open('GET', url);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      var resp = JSON.parse(req.responseText);
      resp.Rows.forEach(function (c) {
        drivingSidesByIsoCountryCode[c.ISO_COUNTRY_CODE] = c.DRIVING_SIDE;
      });
      updateRequestTimeLabel(0);
      trafficTimeMachine.goBackBy(0, updateActualTimeLabel);
    }
  };
  req.send( null );


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