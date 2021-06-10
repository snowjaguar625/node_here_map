/**
 * author boris.guenebaut@here.com
 * (C) HERE 2016
 	// author asadovoy
	// (C) HERE 2019 -> migrate to 3.1
 */

// Global static variables.
const DELAY_IN_MS = 2000;
const LAYER_ID = 673;
const LIMIT = 5000;
const MINUTES_INTERVAL = 12;
const SINGLE_DAY = '2016/03/10';
const DATE_FORMAT = 'YYYY/MM/DD';
const TIME_FORMAT = 'HH:mm';
const DATE_TIME_FORMAT = [DATE_FORMAT, ' ', TIME_FORMAT].join('');
const DATE_TIME_FORMAT_CLE = DATE_TIME_FORMAT.replace(/\//g, '-');

// Launch the app and retrieve global variables.
var refs = kickoff();

/**
 * Kicks off the demo with the default config.
 */
function kickoff() {
  // Init the map.
  var refs = initMap();

  // Initialize date inputs.
  initDateInputs(refs);

  // Add element refs.
  refs.locationForm = $('#form-location');
  refs.locationInput = $('#input-location');
  refs.autoReload = $('#input-checkbox-auto-reload');

  // Add form submit listener.
  refs.locationForm.submit(function(e) {
    onLocationFormSubmit(e, refs);
  });

  // Customize autocompletion style.
  $.widget("custom.autocompleteHighlight", $.ui.autocomplete, {
    _renderItem: function(ul, item) {
      return $('<li>' + item.label + '</li>').appendTo(ul);
    }
  });

  // Enable autocompletion.
  autocompleter(refs.locationInput, function(event, ui) {
    if (ui.item) {
      refs.locationForm.submit();
    }
    return true;
  });

  // Set focus to input.
  refs.locationInput.focus();

  // Zoom to default location.
  refs.locationForm.submit();

  return refs;
};

/**
 * Initializes the map.
 */
function initMap() {
  // check if the site was loaded via secure connection
  var secure = (location.protocol === 'https:') ? true : false;

  // Initialize communication with the platform.
  var platform = new H.service.Platform({
	apikey: api_key,
	useHTTPS: secure
  });

  var maptypes = platform.createDefaultLayers();

  // Initialize a map - not specificing a location will give a whole world view.
  var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
    zoom: 14,
	pixelRatio: window.devicePixelRatio || 1
  });

  // Do not draw under control panel.
  map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

  // Enable map events.
  // Behavior implements default interactions for pan/zoom (also on mobile touch environments).
  new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // Create the default UI components.
  var ui = H.ui.UI.createDefault(map, maptypes);


  // Add window resize listener to adjust the map dimensions.
  window.addEventListener('resize', function() {
    map.getViewPort().resize();
  });

  // Add map view change end listener.
  map.addEventListener('mapviewchangeend', function(e) {
    if (refs.autoReload.prop('checked') || $.isEmptyObject(refs.mapSerialTraces)) {
      refreshTracesWithDelay(refs, DELAY_IN_MS);
    }
  });

  // Instantiate and add object group.
  var group = new H.map.Group();
  map.addObject(group);

  // Prepare the clustered data provider.
  var clusteredDataProvider = createClusterProvider([]);

  // Create a layer that includes the data provider and its data points.
  var layer = new H.map.layer.ObjectLayer(clusteredDataProvider);
  map.addLayer(layer);

  // Add JS API Release information
  releaseInfoTxt.innerHTML += 'JS API: 3.' + H.buildInfo().version;
  // add MRS Release information
  loadMRSVersionTxt();

  return {
    platform: platform,
    map: map,
    ui: ui,
    group: group,
    clusterProvider: clusteredDataProvider,
    locationMarker: null,
    mapSerialTraces: {},
    mapSerialObjects: {},
  };
}

/**
 * Initializes date inputs.
 */
function initDateInputs(refs) {
  // Initialize variables.
  var minDate = moment(SINGLE_DAY + ' 00:00', DATE_TIME_FORMAT);
  var maxDate = minDate.clone().add(23, 'h').add(59, 's');
  var start = $('#input-date-start');
  var end = $('#input-date-end');

  // Configure date inputs.
  start.datetimepicker({
    useCurrent: false,
    minDate: minDate.clone(),
    maxDate: maxDate.clone(),
    defaultDate: moment(SINGLE_DAY + ' 10:30', DATE_TIME_FORMAT),
    toolbarPlacement: 'top'
  });
  start.on('dp.change', function(e) {
    refreshTracesWithDelay(refs, DELAY_IN_MS);
  });

  end.datetimepicker({
    useCurrent: false,
    minDate: minDate.clone(),
    maxDate: maxDate.clone(),
    defaultDate: moment(SINGLE_DAY + ' 14:49', DATE_TIME_FORMAT),
    toolbarPlacement: 'top'
  });
  end.on('dp.change', function(e) {
    refreshTracesWithDelay(refs, DELAY_IN_MS);
  });

  refs.dates = {
    start: start,
    end: end
  }
}

/**
 * Executes refresh traces with specified delay.
 */
function refreshTracesWithDelay(refs, delayInMilliseconds) {
  delay(function() {
    refreshTraces(refs);
  }, delayInMilliseconds)();
}

/**
 * Refreshes the displayed traces based on the map view.
 */
function refreshTraces(refs) {
  Spinner.showSpinner();
  // Prepare the bounding box.
  var rectangle = refs.map.getViewModel().getLookAtData().bounds.getBoundingBox();
  var bbox = [rectangle.getTop(), ',', rectangle.getLeft(), ';',
      rectangle.getBottom(), ',', rectangle.getRight()].join('');

  // Prepare the dates (moment.js objects).
  var currentDate = refs.dates.start.datetimepicker().data('DateTimePicker').date();
  var endDate = refs.dates.end.datetimepicker().data('DateTimePicker').date();

  refs.cleReqCount = refs.cleReqCount || 0;
  refs.cleReqCount += Math.ceil(moment.duration(endDate.diff(currentDate)).asMinutes() / MINUTES_INTERVAL) - 1;
  while (currentDate.isBefore(endDate)) {
    // Get start and end formatted dates.
    var start = currentDate.format(DATE_TIME_FORMAT_CLE);
    currentDate = currentDate.add(MINUTES_INTERVAL, 'm'); // Add the minutes interval to the current date.
    var end = currentDate.format(DATE_TIME_FORMAT_CLE);
    // Send requests.
    searchTraces(LAYER_ID, bbox, start, end);
  }
}

/**
 * Performs show/hide actions on start and destination inputs depending on the
 * checkbox status.
 */
function onCheckboxChange(target, e) {
  var display = target.checked ? "none" : "";
  target.parentNode.parentNode.parentNode.children[0].style.display = display;
  if (!target.checked) {
    // Set focus to input.
    refs.locationInput.focus();
  }
}

/**
 * Performs zoom to address on submission.
 */
function onLocationFormSubmit(e, refs) {
  e.preventDefault();

  var form = e.currentTarget;
  var input = $(form).find('input');

  if (input.is(':hidden')) {
    navigator.geolocation.getCurrentPosition(function(myPosition) {
      processLocation(refs, {
        lat: myPosition.coords.latitude,
        lng: myPosition.coords.longitude
      });
    }, function(error) {
      console.error(error);
    });
  } else {
    var inputVal = input.val();
    if (inputVal.length > 0) {
      refs.platform.getGeocodingService().geocode({
        searchText: input.val(),
        maxResults: 1,
        jsonattributes: 1
      }, function(result) {
        // Retrieve position of geocoded waypoint. Handles error where input cannot be geocoded.
        var position;
        try {
          position = result.response.view[0].result[0].location.displayPosition;
        } catch (error) {
          console.error("Could not geocode successfully the following input: " + input.val());
        }
        processLocation(refs, {
          lat: position.latitude,
          lng: position.longitude
        });

      }, function(error) {
        console.error(error);
      });
    } else {
      console.warn("The address input was empty");
    }
  }

  return false;
}

/**
 * Processes input or current location by updating the map center.
 */
function processLocation(refs, position) {
  if (refs.locationMarker == null) {
    // Lazy instantiation.
    refs.locationMarker = new H.map.Marker(position);
    refs.group.addObject(refs.locationMarker);
  } else {
    refs.locationMarker.setGeometry(position);
  }
  refs.map.setCenter(refs.locationMarker.getGeometry());
}

/**
 * Converts input element into autocompleter.
 */
function autocompleter(element, onSelect) {
  var AUTOCOMPLETION_URL = 'https://autocomplete.geocoder.api.here.com/6.2/suggest.json';
  var APPLICATION_ID = app_id;
  var APPLICATION_CODE = app_code;
  var MIN_QUERY_LENGTH = 2;
  var MAX_RESULTS = 5;

  $(element).autocompleteHighlight({
    source: function(request, response) {
      $.ajax({
        url: AUTOCOMPLETION_URL,
        dataType: "json",
        data: {
          maxresults: MAX_RESULTS,
          query: request.term,
          beginHighlight: '<mark>',
          endHighlight: '</mark>',
          app_id: APPLICATION_ID,
          app_code: APPLICATION_CODE
        },

        success: function(data) {
          response($.map(data.suggestions, function(item) {
            value = item.label.replace(/(<mark>|<\/mark>)/gm, '');
            name = item.label;
            return {
              label: name,
              value: value,
            }
          }));
        }
      }); //ajax
    }, // source
    minLength: MIN_QUERY_LENGTH,
    select: onSelect
  });
}

/**
 * Sends search attributes request to CLE.
 */
function searchTraces(layerId, bbox, start, end) {
  // Generate URL.
  url = ['https://customlocation.api.here.com/v1/search/bbox?',
         'app_id=',
         app_id,
         '&app_code=',
         app_code,
         '&layerId=',
         layerId,
         '&bbox=' + bbox,
         //['&query=', formatCLEQuery(start, end)].join(''),
         //['&customAttributeQuery=[>=]/timestamp/', start, '/[AND]/[<]/timestamp/', end, '/[AND]/[x]/serial/0002-1097990084'].join(''),
         ['&customAttributeQuery=[>=]/timestamp/', start, '/[AND]/[<]/timestamp/', end].join(''),
         '&limit=' + LIMIT,
         '&jsonAttributes=1'
         ].join('');

  // Send request.
  sendJSONP(url, 'jsoncallback', processCLEResults);
};

/**
 * Generates the CLE query.
 */
function formatCLEQuery(start, end) {
  var ids = $.map(refs.mapSerialTraces, function(tracker, serial) {
    return $.map(tracker.traces, function(trace, id) {
      if (start < trace.timestamp && end > trace.timestamp) {
        return ['[not]/customerLocationId/', id].join('');
      }
    });
  });
  return ids.join('/[AND]/');
}

/**
 * Processes CLE results.
 */
function processCLEResults(response) {
  var locations = response.bblocations;
  if (locations && locations.length > 0) {
    var p = new Parallel(locations);
    p.require(extractAttributes);
    p
      .map(extractAttributes)
      .then(function(traceEntries) {
        // Store traces
        storeTraces(refs.mapSerialTraces, traceEntries);
        // If all CLE data for the day have been fetched.
        if (--refs.cleReqCount <= 0) {
          refs.cleReqCount = 0;
          // Match route for each vehicle.
          $.each(refs.mapSerialTraces, function(serial, tracker) {
            if (tracker.hasChanged) {
              tracker.hasChanged = false;
              var traces = [];
              var tracesCount = 0;
              $.each(tracker.traces, function(id, attributes) {
                traces.push(attributes);
              });
              traces.sort(SortByTimestamp);
              refs.rmeReqCount = refs.rmeReqCount || 0;
              refs.rmeReqCount++;
              matchRoute(zipFile(new Date().toString(), createCSV(traces)), serial);
            }
          });
          if (rmeReqCount <= 0) {
            Spinner.hideSpinner();
          }
        }
      });
  } else {
    if (--refs.cleReqCount <= 0) {
      refs.cleReqCount = 0;
      Spinner.hideSpinner();
    }
  }
}

/**
 * Extracts location attributes and store them in a map {serial -> traces}.
 */
function storeTraces(map, traces) {
  for (var i = 0; i < traces.length; i += 3) {
    var current = traces[i];
    // Check if the cache map for the current vehicle exists.
    var tracker = map[current.serial];
    if (tracker == null) {
      tracker = map[current.serial] = {
        traces: {},
        hasChanged: true
      }
    }
    // Check if the cache map for the current trace exists.
    var trace = tracker.traces[current.id];
    if (trace == null) {
      tracker.traces[current.id] = current;
      tracker.hasChanged = true;
    }
  }
}

/**
 * Creates attributes object from an original trace.
 */
function extractAttributes(location) {
  var attributes = {
    id: location.customerLocationId,
    latitude: location.coordinate.latitude,
    longitude: location.coordinate.longitude
  }

  for (var j = 0; j < location.customAttributes.length; j++) {
    var current = location.customAttributes[j];
    switch(current.name) {
      case 'gps_speed':
       attributes.speed = current.value; 
       break;
      case 'heading':
       attributes.heading = current.value; 
       break;
      case 'timestamp':
       attributes.timestamp = current.value; 
       break;
      case 'serial':
       attributes.serial = current.value; 
       break;
    }
  }
  return attributes;
}

/**
 * Creates traces CSV file.
 */
function createCSV(traces) {
  var csvData = ["timestamp,latitude,longitude,speed_mph,heading"];
  for (var i = 0; i < traces.length; i++) {
    var attributes = traces[i];
    csvData.push([attributes.timestamp, attributes.latitude, attributes.longitude, attributes.speed, attributes.heading].join(','));
  }
  return csvData.join('\n');
}

/**
 * Sorts by name1 field.
 */
function SortByTimestamp(a, b) {
  var aName = a.timestamp.toLowerCase();
  var bName = b.timestamp.toLowerCase(); 
  return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

/**
 * Zips content into a file.
 */
function zipFile(filename, content) {
  var zip = new JSZip();
  zip.file(filename, content);
  return zip.generate({type: "base64" , compression: "DEFLATE", compressionOptions: {level:6}});
}

/**
 * Sends request to route match extension.
 */
function matchRoute(zippedContent, serial) {
   // Generate URL.
  url = ['https://rme.api.here.com/2/matchroute.json?',
         'app_id=',
         app_id,
         '&app_code=',
         app_code,
         '&routemode=car',
         '&file=',
         encodeURIComponent(zippedContent)
         ].join('');

  // Send request.
  sendJSONP(url, 'callback', function(results) {
    processRMEResults(results, serial);
  });
}

/**
 * Processes RME results.
 */
function processRMEResults(results, serial) {
  if (results.error != undefined || results.faultCode != undefined || results.type) {
      console.warn(results.message + "\nStatus: " + results.responseCode);
      if (--refs.rmeReqCount <= 0) {
        refs.rmeReqCount = 0;
        Spinner.hideSpinner();
      }
  } else {
    // Retrieve the last vehicle position.
    var lastTracePoint = results.TracePoints[results.TracePoints.length - 1];
    var lastPosition = {lat: lastTracePoint.lat, lng: lastTracePoint.lon};
    
    // Check if the the map objects already exist for the current vehicle.
    var vehicleObjects = refs.mapSerialObjects[serial];
    if (vehicleObjects == null) {
      vehicleObjects = refs.mapSerialObjects[serial] = {
        dataPoint: null,
        group: new H.map.Group()
      };
      // Add vehicle group to the map.
      refs.group.addObject(vehicleObjects.group);
    } else {
      // Remove previous position from cluster.
      refs.clusterProvider.removeDataPoint(vehicleObjects.dataPoint);
      // To avoid overlapping objects.
      vehicleObjects.group.removeAll();
    }

    // Add last position to cluster.
    vehicleObjects.dataPoint = new H.clustering.DataPoint(lastPosition.lat, lastPosition.lng);
    refs.clusterProvider.addDataPoint(vehicleObjects.dataPoint);

    // Draw the route.
    var routeLinks = results.RouteLinks;
    var allCoordinates = $.map(routeLinks, function(routeLink) {
      var coordinates = [];
      try {
        var shape = routeLink.shape;
        var coords = shape.split(" ");
          for (var c = 0; c < coords.length; c += 6) // Skip every other pair to optimize.
            coordinates = coordinates.concat([parseFloat(coords[c]), parseFloat(coords[c + 1])]);
      } catch(e) {
        console.warn(e);
      }
      return coordinates;
    });
    var strip = new H.geo.LineString.fromLatLngArray(allCoordinates);
    if (strip.getPointCount() > 1) {
      // Draw the route.
      var polyline = new H.map.Polyline(strip, {zIndex: 3, style: {lineWidth: 6, strokeColor: 'rgba(11, 68, 109, 0.65)', lineJoin: "round"}});
      polyline.setArrows({color:"#F00F", width: 1, length: 2, frequency: 6});
      vehicleObjects.group.addObject(polyline);
    }

    if (--refs.rmeReqCount <= 0) {
      refs.rmeReqCount = 0;
      Spinner.hideSpinner();
    }
  }
}

/**
 * Creates the cluster provider.
 */
function createClusterProvider(dataPoints) {
  // SVG template to use for cluster icons.
  var clusterSvgTemplate = '<svg xmlns="http://www.w3.org/2000/svg" height="{diameter}" width="{diameter}">' +
    '<circle cx="{radius}px" cy="{radius}px" r="{radius}px" fill="rgba(0, 140, 255, 0.9)" />' +
    '<text x="{x}" y="{y}" font-size="{fs}px" font-family="arial" font-weight="bold" text-anchor="middle" fill="white">{text}</text>' +
    '</svg>';

  // Create a clustered data provider and a theme implementation
  var clusteredDataProvider = new H.clustering.Provider(dataPoints, {
    min: 1,
    max: 20,
    clusteringOptions: {
      strategy: H.clustering.Provider.Strategy.DYNAMICGRID,
      eps: 50,
      minWeight: 3
    },
    theme: {
      getClusterPresentation: function(cluster) {
        // Use cluster weight to change the icon size.
        var weight = cluster.getWeight();
        // Calculate circle size.
        var radius = 25;
        var diameter = radius * 2;

        // Calculate text variables.
        var x = radius;
        var y = Math.ceil(radius * 1.25);
        var fs = Math.ceil(radius * 0.75);

        // Replace variables in the icon template
        var svgString = clusterSvgTemplate
          .replace(/\{radius\}/g, radius)
          .replace(/\{x\}/g, x)
          .replace(/\{y\}/g, y)
          .replace(/\{fs\}/g, fs)
          .replace(/\{diameter\}/g, diameter)
          .replace(/\{text\}/g, weight);

          // Create an icon.
          // Note that we create a different icon depending from the weight of the cluster.
          clusterIcon = new H.map.Icon(svgString, {
            size: {w: diameter, h: diameter},
            anchor: {x: radius, y: radius}
          }),

          // Create a marker for the cluster
          clusterMarker = new H.map.Marker(cluster.getGeometry(), {
          icon: clusterIcon,

          // Set min/max zoom with values from the cluster, otherwise
          // clusters will be shown at all zoom levels.
          min: cluster.getMinZoom(),
          max: cluster.getMaxZoom()
          });

        // Bind cluster data to the marker.
        clusterMarker.setData(cluster);

        return clusterMarker;
      },
      getNoisePresentation: function(noisePoint) {
        // Create a marker for noise points.
        var noiseMarker = new H.map.Marker(noisePoint.getGeometry(), {
          icon: createIcon(),

          // Use min zoom from a noise point to show it correctly at certain zoom levels.
          min: noisePoint.getMinZoom(),

          // Set max soom to highest one
          max: 20
        });

        // Bind noise point data to the marker.
        noiseMarker.setData(noisePoint);
        return noiseMarker;
      }
    }
  });
  return clusteredDataProvider;
}

/**
 * Creates marker icon.
 */
function createIcon() {
  var img = document.createElement('img');
  img.src = 'https://c.dryicons.com/images/icon_sets/coquette_part_8_icons_set/png/32x32/truck.png';

  return new H.map.Icon(img, {
    anchor: {x: 16, y: 16}
  });
};

/**
 * Sends request as JSONP.
 */
function sendJSONP(url, callbackName, callback) {
  $.ajax({
    url: url,
    jsonp : callbackName,
    dataType : 'jsonp',
    cache: true,
    success: callback
  });
}

/**
 * delays callback and cancels previous timeout call to ensure a smoother usage of resources.
 */
function delay(callback, delay) {
  var timerId = null;
  return function () {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timeId = setTimeout(function() {
      callback.call();
    }, delay);
  }
}