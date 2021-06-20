// author dom schuette
	// (C) HERE 2018
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

    var mapContainer = document.getElementById('mapContainer');
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		apikey: api_key_jp,
		useHTTPS: secure
	}),
	defaultLayers = platform.createDefaultLayers();
    var geocoder = platform.getSearchService();

    var omvService = platform.getOMVService({path:  'v2/vectortiles/core/mc'});
    var baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
    // create a Japan specific style
    var style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);

    // instantiate provider and layer for the basemap
    var omvProvider = new H.service.omv.Provider(omvService, style);
    var omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});

    center = new H.geo.Point(35.68066, 139.8355);

	var	maptypes = platform.createDefaultLayers();
	var	map = new H.Map(mapContainer, omvlayer, {
        center: center,
        zoom: 10,
        pixelRatio: window.devicePixelRatio || 1
    });

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var	objContainer = new H.map.Group(),
		container = new Object(),
		currentBubble;

	var submitTrace = function ()
	{
		objContainer.removeAll();
		document.getElementById("warningstextarea").value = '';
		document.getElementById("resulttextarea").value = '';
		/*var zip = new JSZip();
		zip.file("temp.zip", document.getElementById('tracetextarea').value);
		var content = zip.generate(
			{
				type : "base64" , 
				compression: "DEFLATE", 
				compressionOptions : 
				{
					level:6
				} 
			}
		);*/

		var content = document.getElementById('tracetextarea').value;
		
		// if there is an apikey specified in the URL then use it, otherwise use the default
		//var url = document.getElementById('rmeUrl').value + "&file=" + encodeURIComponent(content);
		var url = document.getElementById('rmeUrl').value;

        var appKeyRegEx= /[\?&]apikey=/i;
        
		if( url.search( appKeyRegEx ) === -1 ) 
		{
			if( ! url.endsWith( "&" ) ) url= url.concat( "&" );
            url= url.concat( "apikey=" + api_key_jp );                
        }
		
		url += "&attributes=SPEED_LIMITS_FCn(FROM_REF_SPEED_LIMIT,TO_REF_SPEED_LIMIT)";

		$.ajax({
			url: url,
			dataType: "json",
			async: true,
			type: 'post',
			data: content,
			contentType: 'application/octet-stream',
			success: function(data) {
				gotRouteMatchResponse(data);
			},
			error: function(xhr, status, e) {
				alert((xhr.responseJSON.issues[0].message ? xhr.responseJSON.issues[0].message :  xhr.responseJSON.issues[0] ) || xhr.responseJSON);
			}
		});

		
		//getJSONP(url, gotRouteMatchResponse);
	};
	document.getElementById('submittracebutton').onclick = submitTrace;

	function reset() {
		var traceTextArea = document.getElementById('tracetextarea');
		traceTextArea.value = '';
		objContainer.removeAll();
		document.getElementById("warningstextarea").value = '';
		document.getElementById("resulttextarea").value = '';
		if(currentBubble)
			ui.removeBubble(currentBubble);
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

	var gotRouteMatchResponse = function (respJsonObj)
	{
		if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type)
		{
			alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
			return;
		}
		var routeLinks = respJsonObj.RouteLinks,
			warningsArea = document.getElementById("warningstextarea");
		warningsArea.value += 'Need ' + routeLinks.length + ' Reverse Geocoder Calls.\r\n';
		// store the route
		container = new Object();
		
		for (var l = 0; l < routeLinks.length; l++)
		{
			var coords1 = routeLinks[l].shape.split(" "),
				coords2 = new H.geo.LineString(), 
				attributes = routeLinks[l].attributes;
			for (var c = 0; c < coords1.length; c += 2)
				coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
						
			// add RGC Point of middle Point of the strip
			var rgcPoint = coords2.extractPoint(parseInt(coords2.getPointCount() / 2)),
				polyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}}),
				fPoint = coords2.extractPoint(0), 
				lPoint = coords2.extractPoint(coords2.getPointCount() - 1),
				fromRef = false;
				
			if(fPoint.lat <= lPoint.lat)
				fromRef = true;
			
			container[respJsonObj.RouteLinks[l].linkId] = 
			{ 
				attributes: attributes, 
				rgcPoint: rgcPoint, 
				polyline: polyline, 
				pointsMatched: new Array(), 
				pointsOriginal: new Array(),
				tracePosition: l,
				rgcResult: "",
				fromRef: fromRef
			};
		}

		// draw the original and the matched trace points
		tracePoints = respJsonObj.TracePoints;
		
		for (var l = 0; l < tracePoints.length; l++)
		{
			var p = tracePoints[l];
			
			container[p.linkIdMatched].pointsOriginal.push( {pos: l, coord: new H.geo.Point(p.lat, p.lon) });
			container[p.linkIdMatched].pointsMatched.push( {pos: l, coord: new H.geo.Point(p.latMatched, p.lonMatched) });
		}
		
		if(respJsonObj.Warnings.length === 0) {
			warningsArea.value += 'No Warnings.';
		} else {
			for(var d = 0; d < respJsonObj.Warnings.length; d++) {
				if(0 !== d) warningsArea.value += '\n';
				warningsArea.value += respJsonObj.Warnings[d].text;
			}
		}
        requestcount = 0;
        for(id in container){
            requestcount++;
            let obj = container[id];
            let params = {at: [obj.rgcPoint.lat, obj.rgcPoint.lng].join()};
            geocoder.reverseGeocode(
                params,
                rgccallback.bind({id: id}),
                function (){
                    console.log('cannot geocode');
                }
            );
        }
	};
	
	var reverseGeocode = function(container)
	{
		requestcount = 0;
		for(id in container)
		{
			requestcount++;
			var obj = container[id];
			var rgcurl = [ 
					"https",
					//secure ? "s" : "", 
					"://revgeocode.search.hereapi.com/v1/revgeocode?",
					"at=", encodeURIComponent([obj.rgcPoint.lat, obj.rgcPoint.lng].join()),
					"&apikey=",
					api_key_jp,
					"&jsoncallback=rgccallback"
					].join("");

				script = document.createElement("script");
				script.src = rgcurl;
 				document.body.appendChild(script);
		}
	}
	
	function rgccallback(response)
	{
		//console.log("rgccallback(response):", response.items[0].address.label);
        requestcount--;
		container[this.id].rgcResult = response.items[0].address;
		if(requestcount == 0)
		{
			// bring the container objects into right order
			var containerSorted = sortProperties(container),
				txt = "";
				
			for(var i = 0; i < containerSorted.length; i++)	
			{
				var id = containerSorted[i][0],
					obj = containerSorted[i][1];
					
				objContainer.addObject(obj.polyline);
				
				// add the matched points
				var j = 0, 
					l = obj.pointsMatched.length,
					speed = -1;
				
				if(obj.fromRef == true)
					speed = obj.attributes ? obj.attributes.SPEED_LIMITS_FCN[0].FROM_REF_SPEED_LIMIT : "na";
				else
					speed = obj.attributes ? obj.attributes.SPEED_LIMITS_FCN[0].TO_REF_SPEED_LIMIT : "na";
				
				txt += id + " " + i + " " + obj.rgcResult.label + " " + speed + "\r\n";
				
				obj.polyline.$id = id;
				obj.polyline.$label = obj.rgcResult.label;
				obj.polyline.$speed = speed;
				obj.polyline.$trackPosition = i;

				obj.polyline.addEventListener("pointerdown", function(e)
				{
					if(currentBubble)
						ui.removeBubble(currentBubble);

						var html = '<div>';
							html +=	'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkID: ' + e.target.$id +'</p>';
							html += e.target.$label != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Location: ' + e.target.$label +'</p>') : "";
							html += e.target.$label != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">Speed: ' + e.target.$speed +'</p>') : "";
							html += e.target.$label != null ? ('<p style="font-family:Arial,sans-serif; font-size:12px;">TrackPos: ' + e.target.$trackPosition +'</p>') : "";
							html += '</div>';

						var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
						currentBubble = new H.ui.InfoBubble(pos, { content: html });
						ui.addBubble(currentBubble);
				});
								
				for(; j < l; j++)
				{
					objContainer.addObject(new H.map.Marker(obj.pointsMatched[j].coord, {icon: createIcon("#00FF00", obj.pointsMatched[j].pos)}));
				}
				
				// add the original points
				j = 0,
				l = obj.pointsOriginal.length;
				for(; j < l; j++)
				{
					objContainer.addObject(new H.map.Marker(obj.pointsOriginal[j].coord, {icon: createIcon("#000000", obj.pointsOriginal[j].pos)}));
				}	
			}
			document.getElementById("resulttextarea").value = txt;
			map.addObject(objContainer);
			map.getViewModel().setLookAtData({
                bounds: objContainer.getBoundingBox()
			});
		}
	}

	// helper to sort the container
	function sortProperties(obj)
	{
		// convert object into array
		var sortable=[];
		for(var key in obj)
			if(obj.hasOwnProperty(key))
				sortable.push([key, obj[key]]); // each item is an array in format [key, value]
	
		// sort items by value
		sortable.sort(function(a, b, sortVal)
		{
			return a[1].tracePosition - b[1].tracePosition; // compare numbers
		});
		return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
	}	
	
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
	
	var createIcon = function (color, text) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="16px">' +
			'<line x1="14"  y1="16" x2="14" y2="9" stroke="' + color + '"/>' +
			'<text font-size="10" x="14" y="8" text-anchor="middle" fill="' + color + '">' + text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 14, y : 16}});
	};

	function getJSONP(url, callback) {
		var cbnum = "s" + getJSONP.counter++;
		var cbname = "getJSONP." + cbnum;
		url += "&callback=" + cbname;
		var script = document.createElement("script");
		getJSONP[cbnum] = function(response) {
			try {
				callback(response);
			}
			finally {
				delete getJSONP[cbnum];
				script.parentNode.removeChild(script);
			}
		};
		script.src = url;
		script.onerror = function(data)	{
			alert("Could not connect to RME.\nCheck connectivity and trace size.");
		}
		document.body.appendChild(script);
	} getJSONP.counter = 0;