// author wobecker (C) HERE 2014 - 2016
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
    var count=0;
	var
        mapContainer = document.getElementById('mapContainer'),

        platform = new H.service.Platform({
            apikey: api_key_jp,
            useHTTPS: secure
        }),
        maptypes = platform.createDefaultLayers();
    var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});
    var center = new H.geo.Point(35.68066, 139.8355);

    var map = new H.Map(mapContainer, omvlayer,
            {
                center: center,
                zoom: zoom,
                pixelRatio: window.devicePixelRatio || 1
            }
        );
	
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

	var zoomToResult = true;
    new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
	var ui = H.ui.UI.createDefault(map, maptypes); // add UI

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	objContainer = new H.map.Group();
	
	var layerSelected = document.getElementById("pdeLayerSelected").value;
	var layerSource = undefined;
	var sampleLayerExists = false;
	var SAMPLE_LAYER_ID = 'CUSTOM_SPEED_LIMITS';
	var CLE_LIST_LAYER_RESOURCE = '/2/layers/list.json';
	var CLE_UPLOAD_LAYER_RESOURCE = '/2/layers/upload.json';
    // icon/markers  		
	var icons = {};

	function layerSourceChanged(input){
		document.getElementById('pdeLayerList').style.display = 'pde' === input.value? 'block':'none';
		document.getElementById('cleLayerList').style.display = 'cle' === input.value? 'block':'none';

		if('cle' === input.value){
			if(!sampleLayerExists){ //After the page first got loaded, sampleLayerExists = false. When the user selectes "CLE" as source for the first time, we do a layers/list to 
				
				var rmeUrl = new URL(document.getElementById('rmeUrl').value);
				var cleUrl = rmeUrl.protocol + "//" + rmeUrl.host + CLE_LIST_LAYER_RESOURCE + rmeUrl.search + "&layer_id=" + SAMPLE_LAYER_ID ;
				cleUrl = appendAppIdAppCodeIfNotProvidedInUrl(cleUrl);
				if(!cleUrl) return;

				$.ajax({
					url: cleUrl,
					type: 'GET',
					success: function(response) {
						sampleLayerExists = true;
						document.getElementById('cleLayerSelected').innerHTML = '<option value="' + SAMPLE_LAYER_ID + '">' + SAMPLE_LAYER_ID + '</option>';
						document.getElementById('infoTextCle').innerHTML = 'A sample layer including custom speed limits in Rome';
					},
					error: function(jqXHR, textStatus, errorMessage) {
						if(jqXHR.status === 0){
							document.getElementById("warningstextarea").style.color = "red";
							document.getElementById("warningstextarea").value = 'Provided URL is invalid, or unauthorized request, or server is not available!';
						}
						else if(jqXHR.status === 404)
							document.getElementById('infoTextCle').innerHTML = 'A sample layer does not exist, please reload the sample layer';
						else
							console.log(xhr.responseJSON.issues[0].message.concat("Listing layer failed."));
					}
				});
			}
			else
				document.getElementById('infoTextCle').innerHTML = 'A sample layer including custom speed limits in Rome'; 
		} 
	}

	function getLayerSelected() {
		layerSelected = document.getElementById("pdeLayerSelected").value;
	}

	// if there is an apikey specified in the URL then use it, otherwise use the default
	function appendAppIdAppCodeIfNotProvidedInUrl(url){
		var apiKeyRegEx= /[\?&]apikey=/i;
        if( url.search( apiKeyRegEx ) === -1 ) {
            if(!url.endsWith( "&" ) ) url= url.concat( "&" );
            url = url.concat( "apikey=" + api_key_jp);                
        }
		return url;
	}

	var submitTrace = function () {
		objContainer.removeAll();
		document.getElementById("warningstextarea").value = '';
		document.getElementById("warningstextarea").style.color = "black";
		// if there is an app_id specified in the URL then use it, otherwise use the default
		var url = document.getElementById('rmeUrl').value;

        // create the icons if needed, ok we make some more icons as needed for GPX inputs
		var text = document.getElementById('tracetextarea').value;   
		var lines = text.split(/\r|\r\n|\n/);
		var count = lines.length;
		createIcons(count);	
		
		var radios = document.getElementsByName('source');

		radios.forEach(r => {
						if(r.checked)
							layerSource = r.value;
					}
		);
		var attributes;
		if('pde' === layerSource){
			layerSelected = document.getElementById('pdeLayerSelected').value;
			attributes = layerSelected + "n(*)";
			url = url.concat("&attributes=" + attributes);
    }
		else if('cle' === layerSource){
			layerSelected = document.getElementById('cleLayerSelected').value;
			attributes = layerSelected + "(*)";
			url = url.concat("&customAttributes=" + attributes);
		}

		url = appendAppIdAppCodeIfNotProvidedInUrl(url);
		if(!url) return;

		var fileContent=document.getElementById('tracetextarea').value;

		var rmeFile = new Blob([fileContent], { type: 'plain/text' });
				
		$.ajax({
					url: url,
					dataType: "json",
					async: true,
					type: 'post',
					data: rmeFile,
					processData: false,
					contentType: "application/octet-stream",
					success: function(data) {
						processRouteMatchResponse(data);
					},
					error: function(xhr, status, e) {
						if(xhr.status == 0 || xhr.status == 404){
							document.getElementById("warningstextarea").style.color = "red";
							document.getElementById("warningstextarea").value = 'Provided URL is invalid, or unauthorized request, or server is not available!';
						}
						else{
							document.getElementById("warningstextarea").style.color = "red";
							document.getElementById("warningstextarea").value = xhr.responseJSON.issues[0].message.concat(". Please reload the sample layer.");
						}
					}
		});
	};
	document.getElementById('submittracebutton').onclick = submitTrace;

  var toggleCheckboxesError = function() {
    window.alert('Please, submit a trace first');

    //document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;
    //document.getElementById('matchedCheckbox').checked = true;
  };

  var toggleShowRmeMatchedTraceAndPoints = toggleCheckboxesError;
  var toggleReverseGeocodeWithHeading = toggleCheckboxesError;
  var toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;

  function reset() {
		toggleReverseGeocodeWithHeading = toggleCheckboxesError;
    toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;
    toggleShowRmeMatchedTraceAndPoints = toggleCheckboxesError;
    //document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;
    //document.getElementById('matchedCheckbox').checked = true;
    var traceTextArea = document.getElementById('tracetextarea');
    traceTextArea.value = '';
    objContainer.removeAll();
    document.getElementById("warningstextarea").value = '';
		document.getElementById("warningstextarea").style.color = "black";
  }
  
  var DEFAULT_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(18, 65, 145, 0.7)', lineJoin: 'round'};
  var HOVER_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(255, 65, 145, 1)', lineJoin: "round"};
  var DEFAULT_OFFSET_STYLE = {lineWidth: 1, strokeColor: 'green', lineJoin: 'round'};
  var DEFAULT_TRACE_STYLE = {lineWidth: 1, strokeColor: 'black', lineJoin: 'round'};
  
	var CUSTOM_LAYER_LINK_COLOR = "#48dad0";
	var CUSTOM_LAYER_LINK_HIGHLIGHT_COLOR = "#fc2d84";
	var CUSTOM_LAYER_LINK_STYLE = {lineWidth: 10, strokeColor: CUSTOM_LAYER_LINK_COLOR, lineJoin: "round"};
	var CUSTOM_LAYER_LINK_HIGHLIGHT_STYLE = {lineWidth: 10, strokeColor: CUSTOM_LAYER_LINK_HIGHLIGHT_COLOR, lineJoin: "round"};

  function createPointerEnterLinkHandler(polyline) {
    return function (e) {
			if(polyline.style.strokeColor === CUSTOM_LAYER_LINK_COLOR) {
				polyline.setStyle(CUSTOM_LAYER_LINK_HIGHLIGHT_STYLE);
				return;
			}
      polyline.setStyle(HOVER_LINK_STYLE);
    };
  }

	function createPointerLeaveLinkHandler(polyline) {
    return function (e) {
			if(polyline.style.strokeColor === CUSTOM_LAYER_LINK_HIGHLIGHT_COLOR){
				polyline.setStyle(CUSTOM_LAYER_LINK_STYLE);
				return;
      }
			polyline.setStyle(makeConfidenceAwareStyle(polyline.getData().confidence));
    };
  }

  function makeConfidenceAwareStyle(c) {
    if (c === undefined) {
      // support rme versions without confidence on result.
      return DEFAULT_LINK_STYLE;
    }
    var color;
    var MAX_CONF = 1.0;
    if (c > MAX_CONF) {
      color = 'green';
    } else if (c <= 0.01) {
      color = 'red';
    } else {
      var greenPart = c;
      var redPart = MAX_CONF - c;

      var red = Math.floor(255 * redPart / MAX_CONF);
      var green = Math.floor(255 * greenPart / MAX_CONF);

      color = 'rgba(' + red + ', ' + green + ', 0, 0.7)';

    }
    return {lineWidth: 8, strokeColor: color, lineJoin: 'round'};
  }

	/*map.addEventListener('tap', function (currentEvent) {
		var traceTextArea = document.getElementById('tracetextarea');
		if (traceTextArea.value.lastIndexOf('SEQNR,\tLATITUDE,\tLONGITUDE', 0) != 0) traceTextArea.value = 'SEQNR,\tLATITUDE,\tLONGITUDE';
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		var numLines = traceTextArea.value.split(/\r*\n/).length;
		document.getElementById('tracetextarea').value += "\n" + (numLines - 1) + ",\t" + (Math.round(lastClickedPos.lat * 100000.0) / 100000.0) + ",\t" + (Math.round(lastClickedPos.lng * 100000.0) / 100000.0);
		zoomToResult = false;
		submitTrace();
	});*/
	
	function createTapLinkHandler(polyline) {
    return function (e) {
		if (bubble){
			ui.removeBubble(bubble);
		}
      var strip = polyline.getGeometry();
      var lowIndex = Math.floor((strip.getPointCount() - 1) / 2);
      var highIndex = Math.ceil(strip.getPointCount() / 2);
      var center;
      if (lowIndex === highIndex) {
        center = strip.extractPoint(lowIndex);
      } else {
        var lowPoint = strip.extractPoint(lowIndex);
        var highPoint = strip.extractPoint(highIndex);
        center = new H.geo.Point((lowPoint.lat + highPoint.lat ) / 2, (lowPoint.lng + highPoint.lng) / 2);
      }
		var infoText = JSON.stringify(polyline.getData(),undefined,5);
		infoText="<textarea readonly rows='5' cols='35' style='background-color:white;border:0;font-size:12px;max-width:350px;max-height:400px;'>"+infoText+"</textarea>";
    var bubble = new H.ui.InfoBubble(center, {content: infoText});
    ui.addBubble(bubble);
	  count++;
    };
  }

	document.getElementById('tracetextarea').addEventListener(
			'dragover', function handleDragOver(evt) {
				evt.stopPropagation();
				evt.preventDefault();
				evt.dataTransfer.dropEffect = 'copy';
			},
		false
	);

	document.getElementById('tracetextarea').addEventListener(
		'drop', function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			var files = evt.dataTransfer.files;
			var file = files[0];
			var r = new FileReader();
			r.onload = function(e) { 
				document.getElementById('tracetextarea').value = r.result;
				submitTrace();
			}
			r.readAsText(file);
		},
		false
	);

    function reverseGeocode(params, onSuccess) {
            var geocoder = platform.getSearchService();

            geocoder.reverseGeocode(
                params,
                onSuccess,
                function (){
                console.log('cannot geocode');
                }
            );
        }

	var processRouteMatchResponse = function (respJsonObj) {
    //document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;
    //document.getElementById('matchedCheckbox').checked = true;
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		// draw the route
		for(var i = 0; i < respJsonObj.response.route[0].leg.length; i++){
				var routeLinks = respJsonObj.response.route[0].leg[i].link;
				for (var l = 0; l < routeLinks.length; l++) {
					var coords1 = routeLinks[l].shape;
					var coords2 = new H.geo.LineString();
					for (var c = 0; c < coords1.length; c += 2){
						coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
					}

					if('cle' === layerSource && routeLinks[l].attributes)
						linkPolyline = new H.map.Polyline(coords2, {zIndex: 9, style: CUSTOM_LAYER_LINK_STYLE});
					else
						linkPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}});
					objContainer.addObject(linkPolyline);
					linkPolyline.setData(routeLinks[l]);
					linkPolyline.addEventListener('pointerenter', createPointerEnterLinkHandler(linkPolyline));
					linkPolyline.addEventListener('pointerleave', createPointerLeaveLinkHandler(linkPolyline));
					linkPolyline.addEventListener('tap', createTapLinkHandler(linkPolyline));
					objContainer.addObject(linkPolyline);
				}
		}

		// draw the waypoints
		tracePoints = respJsonObj.response.route[0].waypoint;
			for (var l = 0; l < tracePoints.length; l++) {
				var p = tracePoints[l];
				objContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: createIcon("#000000", l)}));
				objContainer.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon("#00FF00", l)}));
		}

		// Lazily geocode
    var geocodedWithHeading = false;
    var geocodedWithoutHeading = false;

    var geocodedWithHeadingGroup = new H.map.Group();
    var geocodedWithoutHeadingGroup = new H.map.Group();
    toggleReverseGeocodeWithoutHeading = function (checkbox) {
      if (!checkbox.checked) {
        geocodedWithoutHeadingGroup.removeAll();
        objContainer.removeObject(geocodedWithoutHeadingGroup);
        return;
      }
      if (!geocodedWithoutHeading) {

        for (var n = 0; n < tracePoints.length; n++) {
            var tracePoint = tracePoints[n];
            reverseGeocode({at: [(tracePoint.lat ? tracePoint.lat : tracePoint.originalPosition.latitude), (tracePoint.lon ? tracePoint.lon : tracePoint.originalPosition.longitude)].join(",")},
								function (data) {
										//console.log("n: ", this.n, data);
										var p = data.items[0].access ? data.items[0].access[0] : data.items[0].position;
										geocodedWithoutHeadingGroup.addObject(new H.map.Marker(new H.geo.Point(p.lat, p.lng), {icon: icons["blue" + this.n]}));
									}.bind({n: n})
							);
        }
      }
      objContainer.addObject(geocodedWithoutHeadingGroup);
    };

    toggleReverseGeocodeWithHeading = function (checkbox) {
      if (!checkbox.checked) {
        geocodedWithHeadingGroup.removeAll();
        objContainer.removeObject(geocodedWithHeadingGroup);
        return;
      }
      if (!geocodedWithHeading) {
        for (var l = 0; l < tracePoints.length; l++) {
          // 10000 is heading Unknown so we are not using any heading in such cases.
          var headingFromInput = tracePoints[l].headingDegreeNorthClockwise !== 10000 ? ',' + tracePoints[l].headingDegreeNorthClockwise : '';
          reverseGeocode({
            gen: '9',
            pos: tracePoints[l].originalPosition.latitude + ',' + tracePoints[l].originalPosition.longitude + (headingFromInput),
            mode: 'trackPosition'
          }, function (l) {
            return function (data) {
              var p = data.Response.View[0].Result[0].Location.DisplayPosition;
              geocodedWithHeadingGroup.addObject(new H.map.Marker(new H.geo.Point(p.Latitude, p.Longitude), {icon: createIcon("red", l)}));
            }
          }(l));
        }
      }
      objContainer.addObject(geocodedWithHeadingGroup);
    };

		map.addObject(objContainer);
		if (zoomToResult) {
            //map.setViewBounds(objContainer.getBounds());
            map.getViewModel().setLookAtData({
                bounds: objContainer.getBoundingBox()
            });
        }
		zoomToResult = true;
		// should display the warnings … warnings = respJsonObj.Warnings;  if (warnings.length > 0) …
		mapVersion = respJsonObj.mapVersion; 
		
		// RME's map version. Use it to cross reference with PDE.

		var warningsArea = document.getElementById("warningstextarea");
		if(respJsonObj.response.warnings.length === 0) {
			warningsArea.value += 'No Warnings.';
		} else {
			for(var d = 0; d < respJsonObj.response.warnings.length; d++) {
				if(0 !== d) warningsArea.value += '\n';
				warningsArea.value += respJsonObj.response.warnings[d].message;
			}
		}
	};

	var loadFromFile = function (filename) {
		var req = new XMLHttpRequest();
		req.open('GET', '/sample_data/' + filename);
		req.onreadystatechange = function() {
			if (req.readyState != XMLHttpRequest.DONE) return;
			document.getElementById('tracetextarea').value = req.responseText;
			submitTrace();
		}
		req.send();
	}

	// upload sample cle layer sample_speed_limit_layer.wkt
	var reloadCleLayer = function(){
		$.ajax({
			url: "/sample_data/sample_speed_limit_layer.wkt",
			type: 'GET',
			success: function(response) {
				var blob = new Blob([response], {type: 'text/plain'});
				var formData = new FormData();
				formData.append('file', blob,'layer.wkt');
				
				var rmeUrl = new URL(document.getElementById('rmeUrl').value);
				var cleUrl = rmeUrl.protocol + "//" + rmeUrl.host + CLE_UPLOAD_LAYER_RESOURCE + rmeUrl.search + "&layer_id=" + SAMPLE_LAYER_ID + '&level=10';
				cleUrl = appendAppIdAppCodeIfNotProvidedInUrl(cleUrl);
				if(!cleUrl) return;

				$.ajax({
					url: cleUrl,
					dataType: "json",
					async: true,
					type: "post",
					data: formData,
					processData: false,
					contentType: false,
					method: "post",
					success: function(response) {
						sampleLayerExists = true;
						document.getElementById('cleLayerSelected').innerHTML = '<option value="' + SAMPLE_LAYER_ID + '">' + SAMPLE_LAYER_ID + '</option>';
						document.getElementById('infoTextCle').innerHTML = 'A sample layer including custom speed limits in Rome has been uploaded';
					},
					error: function(xhr, status, e) {
						if(xhr.status == 0 || xhr.status == 404){
							document.getElementById("warningstextarea").style.color = "red";
							document.getElementById("warningstextarea").value = 'Provided URL is invalid, or unauthorized request, or server is not available!';
						}
						else{
							document.getElementById("warningstextarea").style.color = "red";
							document.getElementById("warningstextarea").value = xhr.responseJSON.issues[0].message.concat(". Uploading layer failed.");
						}
					}
				});
			},
			error: function(jqXHR, textStatus, errorMessage) {
				document.getElementById("warningstextarea").style.color = "red";
				document.getElementById("warningstextarea").value = errorMessage.concat(". Uploading layer failed.");
			}
		});
	}

	/*var createIcon = function (color, text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="16px">' +
			'<line x1="14"  y1="16" x2="14" y2="9" stroke="' + color + '"/>' +
			'<text font-size="10" x="14" y="8" text-anchor="middle" fill="' + color + '">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 14, y : 16}});
	};*/
    /**
		Create matched/unmatched markers that can be used to draw the original/matched tracepoints. They are just created and stored
	*/
	var createIcons = function(count)
	{
		for(var i = 0; i < count; i++)
		{
			if(icons["red" + i] === undefined)
				icons["red" + i] = createIcon("red", i);
			if(icons["blue" + i] === undefined)
				icons["blue" + i] = createIcon("blue", i);
			if(icons["#000000" + i] === undefined)
				icons["#000000" + i] = createIcon("#000000", i);
			if(icons["00FF00" + i] === undefined)
				icons["#00FF00" + i] = createIcon("#00FF00", i);
		}
	}
	
	/**
		Creates icons with Text (used for tracepoint sequence number)
	*/
	var createIcon = function (color, text)
	{
		var canvas = document.createElement('canvas'),
			width = 28,
			height = 16,
			fontSize = 10;
			
		canvas.width = width;
		canvas.height = height;

		ctx = canvas.getContext('2d');
			
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(14, 16);
		ctx.lineTo(14, 9);
		ctx.stroke();
		ctx.closePath();

		ctx.font = 'bold ' + fontSize + 'px Arial';
		ctx.fillStyle = color;
		ctx.textAlign = 'center'; 
		ctx.fillText(text,14,8);

		var icon = new H.map.Icon(canvas,
					({
						'anchor': {
							'x': 14,
							'y': 16
						}
					}));
		delete canvas; 
		return icon;
	};