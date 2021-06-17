// author wobecker (C) HERE 2014 - 2018
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection

var mapContainer = document.getElementById('mapContainer');
var platform = new H.service.Platform({	app_code: app_code,	app_id: app_id,	useHTTPS: secure });
var	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
var	map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });
var zoomToResult = true;
var uTurn = false;

map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
var ui = H.ui.UI.createDefault(map, maptypes); // add UI

platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
window.addEventListener('resize', function() { map.getViewPort().resize(); });

var	objContainer = new H.map.Group();
var inputTracePointGroup = new H.map.Group();
var matchedTracePointGroup = new H.map.Group();

// confidence filter
var minConfidence = document.getElementById("confidenceFilter").value;
  var lastRespJsonObj = null;
  var DEFAULT_CONFIDENCE_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(18, 65, 145, 0.7)', lineJoin: 'round'};
  var HOVER_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(255, 65, 145, 1)', lineJoin: "round"};
  var DEFAULT_OFFSET_STYLE = {lineWidth: 1, strokeColor: 'green', lineJoin: 'round'};

  var linkHighlighted = false;

  // icon/markers  		
var icons = {};

// Info Bubbles for LinkInfo display
var linkDataInfoBubble;

var full_geometry = new Array(); 

/**
    Method that takes the input trace from trace text area and sends it to RME
*/
var submitTrace = function () {
    objContainer.removeAll();
    document.getElementById("warningstextarea").value = '';
//		document.getElementById("polylinetextarea").value = '';
    // if there is an app_id specified in the URL then use it, otherwise use the default
    var url = document.getElementById('rmeUrl').value;
    var appIdRegEx= /[\?&]app_id=/i;
    var appCodeRegEx= /[\?&]app_code=/i;
    if( url.search( appIdRegEx ) === -1 && url.search( appCodeRegEx ) === -1 ) {
        if( ! url.endsWith( "&" ) ) url= url.concat( "&" );
        url= url.concat( "app_id=" + app_id_cors + "&app_code=" + app_code_cors );
    }
    if( ( url.search( appIdRegEx ) >= 0 && url.search( appCodeRegEx ) < 0 ) || ( url.search( appIdRegEx ) < 0 && url.search( appCodeRegEx ) >= 0 ) ) {
        alert('If you provide credentials in the RME URL field, please provide both app_id AND app_code.');                
        return;
    }
    // create the icons if needed, ok we make some more icons as needed for GPX inputs
    var text = document.getElementById('tracetextarea').value;   
    var lines = text.split(/\r|\r\n|\n/);
    var count = lines.length;
    createIcons(count);		
    
    if (url.indexOf("matchroute.json") >= 0) { // old, send GET request
        var zip = new JSZip();
        zip.file("temp.zip", document.getElementById('tracetextarea').value);
        var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
        url += "&file=" + encodeURIComponent(content);
        getJSONP(url, gotRouteMatchResponse);
    } else { // new: calculateroute.json, send POST request
            content = document.getElementById('tracetextarea').value;
        $.ajax({
            url: url,
            dataType: "json",
            async: true,
            type: 'post',
            //data:{ file : document.getElementById('tracetextarea').value },
            data:content,
            contentType: 'application/octet-stream',
            success: function(data) {
                gotRouteMatchResponse(data);
            },
            error: function(xhr, status, e) {
                alert((xhr.responseJSON.issues[0].message ? xhr.responseJSON.issues[0].message :  xhr.responseJSON.issues[0] ) || xhr.responseJSON);
            }
        });
    }		
};
document.getElementById('submittracebutton').onclick = submitTrace;

var toggleCheckboxesError = function() {
    window.alert('Please, submit a trace first');

    document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;

};

var toggleReverseGeocodeWithHeading = toggleCheckboxesError;
var toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;

// Lazily geocode
var geocodedWithHeadingGroup = new H.map.Group();
var geocodedWithoutHeadingGroup = new H.map.Group();

  /**
    Method to reset last results
  */
function reset() {
    toggleReverseGeocodeWithHeading = toggleCheckboxesError;
    toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;
    document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;
    var traceTextArea = document.getElementById('tracetextarea');
    traceTextArea.value = '';
    objContainer.removeAll();
    inputTracePointGroup.removeAll();
    matchedTracePointGroup.removeAll();
    document.getElementById("warningstextarea").value = '';
    document.getElementById("responsetextarea").value = '';
//		document.getElementById("polylinetextarea").value = '';
    lastRespJsonObj = null;
    linkHighlighted = false;
    if(linkDataInfoBubble){linkDataInfoBubble.close();}
}

map.addEventListener('tap', function (currentEvent) {
    if(!linkHighlighted) {
        // only react on click in map if no link is highlighted (to show the link info popup)
        var traceTextArea = document.getElementById('tracetextarea');
        if (traceTextArea.value.lastIndexOf('LATITUDE,LONGITUDE', 0) != 0) traceTextArea.value = 'LATITUDE,LONGITUDE';
        var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
        document.getElementById('tracetextarea').value += "\n" + (Math.round(lastClickedPos.lat * 100000.0) / 100000.0) + "," + (Math.round(lastClickedPos.lng * 100000.0) / 100000.0);
        /*
        var lineCount = document.getElementById('tracetextarea').value.split('\n').length;
        var timestamp = new Date('2020-04-03T20:00:00');
        if(lineCount == 2)
            document.getElementById('tracetextarea').value += "," + convertToReadableDateTime(timestamp)
        else
            document.getElementById('tracetextarea').value += "," + convertToReadableDateTime(timestamp.setSeconds(timestamp.getSeconds() + 3 * (lineCount - 2)))
        */
        zoomToResult = false;
        submitTrace();
    }
});

function convertToReadableDateTime(timestamp) {
    const plus0 = num => `0${num.toString()}`.slice(-2);
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const monthTmp = d.getMonth() + 1
    const month = plus0(monthTmp)
    const date = plus0(d.getDate())
    const hour = plus0(d.getHours())
    const minute = plus0(d.getMinutes())
    const second = plus0(d.getSeconds())
    return `${year}-${month}-${date}T${hour}:${minute}:${second}`
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
    var geocoder = platform.getGeocodingService();

    geocoder.reverseGeocode(
        params,
        onSuccess,
        function (){
          console.log('cannot geocode');
        }
    );
}

/**
    Method that checks if confidence control should be enabled/disabled and triggers a re-display of the last RME response
*/
function filterLinksByConfidence() {
    if(document.getElementById('filterByConfidenceCheckbox').checked) {
        // show confidence control
        document.getElementById("confidenceControl").style.display = '';			
    } else {
        // hide confidence control
        document.getElementById('confidenceControl').style.display = 'none';
    }
    // remove already existing links from display
    try {
        objContainer.removeAll(); 
    } catch (e) {}
    if(lastRespJsonObj != null) {
        gotRouteMatchResponse(lastRespJsonObj, null);
    }
}

/**
    Method that triggers the rendering of the given response
*/
function displayRmeResponse() {
    // remove already existing links from display
    try {
        objContainer.removeAll(); 
    } catch (e) {}
    // clear input trace area as we do not know it
    document.getElementById('tracetextarea').value = '';
    // visualize response via normal RME response callback
    if(document.getElementById("responsetextarea").value != null) {
        var jsonObj = null;
        try {
            jsonObj = JSON.parse(document.getElementById("responsetextarea").value);
        } catch (e) {
            console.log('Failed to parse the content of the response text area.');
        }
        if(jsonObj !== null) {
            // create cached tracepoint icons
            if(jsonObj.TracePoints !== null) {
                createIcons(jsonObj.TracePoints.length);	
            } else if(jsonObj.response.route !== null && jsonObj.response.route[0].waypoint !== null ) {
                createIcons(jsonObj.response.route[0].waypoint.length);	
            }
            gotRouteMatchResponse(jsonObj, null);
        }
    }
}

/**
    Callback that is used to parse the RME response and create map display objects
*/
var gotRouteMatchResponse = function (respJsonObj) {
    document.getElementById('geocodedWithHeadingCheckbox').checked = false;
    document.getElementById('geocodedWithoutHeadingCheckbox').checked = false;
    try {
        inputTracePointGroup.removeAll();
        matchedTracePointGroup.removeAll();
    } catch (e) {}

    if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
        alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
        toggleReverseGeocodeWithHeading = toggleCheckboxesError;
        toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;
        return;
    }
    // safe json 
    lastRespJsonObj = respJsonObj;
    document.getElementById("responsetextarea").value =  JSON.stringify(lastRespJsonObj, undefined, 5);

    // parse links and show on map
    var routeLinks = respJsonObj.RouteLinks;
    if (routeLinks == undefined) { // new calculateroute response
        // draw the route
        routeLinks = respJsonObj.response.route[0].leg[0].link;
        if(routeLinks.length > 0) {
            addRouteLinksToObjectContainer(routeLinks, true);
        }
        // draw the route on the horizon
        if(respJsonObj.response.route[0].leg[1]) {
            routeLinks = respJsonObj.response.route[0].leg[1].link;
            routeLinks.forEach(link => {
                link.eHorizon = true;
            });	
            if(routeLinks.length > 0) {
                addRouteLinksToObjectContainer(routeLinks, true);
            }
        }

        // draw the original and the matched trace points
        tracePoints = respJsonObj.response.route[0].waypoint;
        
        for (var l = 0; l < tracePoints.length; l++) {
            var p = tracePoints[l];
            inputTracePointGroup.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: icons["#000000" + l]}));
            matchedTracePointGroup.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: icons["#00FF00" + l]}));

            // show the original and matched offset
            if(document.getElementById('filterByConfidenceCheckbox').checked) {
                var offsetStrip = new H.geo.Strip();
                offsetStrip.pushLatLngAlt(p.originalPosition.latitude, p.originalPosition.longitude, null);
                offsetStrip.pushLatLngAlt(p.mappedPosition.latitude, p.mappedPosition.longitude, null);
                objContainer.addObject(new H.map.Polyline(offsetStrip, {zIndex: 4, style: DEFAULT_OFFSET_STYLE}));
            }
        }

        var warningsArea = document.getElementById("warningstextarea");
        if (respJsonObj.response.route.length > 0 && respJsonObj.response.route[0].matchedVehicleType != null) {
            warningsArea.value += "Which vehicle type was it?\n" + JSON.stringify(respJsonObj.response.route[0].matchedVehicleType) + '\n';
        }
        if(respJsonObj.response.warnings == undefined || respJsonObj.response.warnings.length === 0) {
            warningsArea.value += 'No Warnings.';
        } else {
            for(var d = 0; d < respJsonObj.response.warnings.length; d++) {
                if(0 !== d) warningsArea.value += '\n';
                warningsArea.value += respJsonObj.response.warnings[d].message;
            }
        }

    } else { // old routematch response
        // draw the route
        addRouteLinksToObjectContainer(routeLinks,false);
        // draw the original and the matched trace points
        tracePoints = respJsonObj.TracePoints;
        for (var l = 0; l < tracePoints.length; l++) {
            var p = tracePoints[l];
            inputTracePointGroup.addObject(new H.map.Marker(new H.geo.Point(p.lat       , p.lon       ), {icon: icons["#000000" + l]}));
            matchedTracePointGroup.addObject(new H.map.Marker(new H.geo.Point(p.latMatched, p.lonMatched), {icon: icons["#00FF00" + l]}));

            // show the original and matched offset
            if(document.getElementById('filterByConfidenceCheckbox').checked) {
                var offsetStrip = new H.geo.Strip();
                offsetStrip.pushLatLngAlt(p.lat, p.lon, null);
                offsetStrip.pushLatLngAlt(p.latMatched, p.lonMatched, null);
                objContainer.addObject(new H.map.Polyline(offsetStrip, {zIndex: 4, style: DEFAULT_OFFSET_STYLE}));
            }
        }
        //display warnings in the warnings text area
        var warningsArea = document.getElementById("warningstextarea");
        if(respJsonObj.Warnings == undefined || respJsonObj.Warnings.length === 0) {
            warningsArea.value += 'No Warnings.';
        } else {
            for(var d = 0; d < respJsonObj.Warnings.length; d++) {
                if(0 !== d) warningsArea.value += '\n';
                warningsArea.value += respJsonObj.Warnings[d].text;
            }
        }
    }

    toggleShowInputTracePoints(document.getElementById('inputCheckbox'));
    toggleShowRmeMatchedTraceAndPoints(document.getElementById('matchedCheckbox'));
    
    map.addObject(objContainer);
    if (zoomToResult) map.setViewBounds(objContainer.getBounds());
    zoomToResult = true;
    // should display the warnings … warnings = respJsonObj.Warnings;  if (warnings.length > 0) …
    mapVersion = respJsonObj.mapVersion; // RME's map version. Use it to cross reference with PDE.

    // ok to do geocode requests
    toggleReverseGeocodeWithHeading= toggleReverseGeocodeWithHeadingFunction 
    toggleReverseGeocodeWithoutHeading= toggleReverseGeocodeWithoutHeadingFunction
/*		
    var arr = new Array();
    for(var i=0; i < full_geometry.length; i++)
    {
        var cur = full_geometry[i];
        var carr = new Array();
        carr.push(cur.lng);
        carr.push(cur.lat);
        arr.push(carr);
    }
    var ret = polyline.encode(arr);
    document.getElementById("polylinetextarea").value = ret;
*/
};

/**
    Helper to parse a file from sample data. With that a RME request is automatically triggered
*/
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

/**
    Helpers for customize view
*/
toggleShowInputTracePoints = function (checkbox) {
    try {
        if (!checkbox.checked) {				
            objContainer.removeObject(inputTracePointGroup);
            return;
        } else {
            objContainer.addObject(inputTracePointGroup);
        }
    } catch (e){}
};
toggleShowRmeMatchedTraceAndPoints = function (checkbox) {
    try {
        if (!checkbox.checked) {				
            objContainer.removeObject(matchedTracePointGroup);
            return;
        } else {
            objContainer.addObject(matchedTracePointGroup);
        }
    } catch (e){}
};
toggleShowResponse = function (checkbox) {
    if (checkbox.checked) {				
        document.getElementById("responseHeadline").style.display = '';
        document.getElementById("responsetextarea").style.display = '';
        return;
    } else {
        document.getElementById("responseHeadline").style.display = 'none';
        document.getElementById("responsetextarea").style.display = 'none';
    }
};
var toggleReverseGeocodeWithoutHeadingFunction = function (checkbox) {
    try {
        if (!checkbox.checked) {
            geocodedWithoutHeadingGroup.removeAll();
            objContainer.removeObject(geocodedWithoutHeadingGroup);
            return;
        }
        for (var n = 0; n < tracePoints.length; n++) {
            var tracePoint = tracePoints[n];
            reverseGeocode({gen: '9', pos: (tracePoint.lat ? tracePoint.lat : tracePoint.originalPosition.latitude) + ',' + (tracePoint.lon ? tracePoint.lon : tracePoint.originalPosition.longitude), mode: 'trackPosition'},
                            function (data) {
                                    //console.log("n: ", this.n);
                                    var p = data.Response.View[0].Result[0].Location.DisplayPosition;
                                    geocodedWithoutHeadingGroup.addObject(new H.map.Marker(new H.geo.Point(p.Latitude, p.Longitude), {icon: icons["blue" + this.n]}));
                                }.bind({n: n})
                           );
        }
        objContainer.addObject(geocodedWithoutHeadingGroup);
    } catch (e){}
};

var toggleReverseGeocodeWithHeadingFunction = function (checkbox) {
    try {
      if (!checkbox.checked) {
        geocodedWithHeadingGroup.removeAll();
        objContainer.removeObject(geocodedWithHeadingGroup);
        return;
      }
        for (var l = 0; l < tracePoints.length; l++) {
          // 10000 is heading Unknown so we are not using any heading in such cases.
          var headingFromInput = tracePoints[l].headingDegreeNorthClockwise !== 10000 ? ',' + tracePoints[l].headingDegreeNorthClockwise : '';
          reverseGeocode({
            gen: '9',
            pos: (tracePoints[l].lat ? tracePoints[l].lat : tracePoints[l].originalPosition.latitude) + ',' + (tracePoints[l].lon ? tracePoints[l].lon : tracePoints[l].originalPosition.longitude)  + (headingFromInput), //calculateroute interface returned the lat and lon in originalPosition object
            mode: 'trackPosition'
          }, function (l) {
            return function (data) {
              var p = data.Response.View[0].Result[0].Location.DisplayPosition;
              geocodedWithHeadingGroup.addObject(new H.map.Marker(new H.geo.Point(p.Latitude, p.Longitude), {icon: icons["red" + l]}));
            }
          }(l));
        }
      objContainer.addObject(geocodedWithHeadingGroup);
  } catch (e){}
};

/**
    Creates and adds links which then gets stored in internal object container
*/
var addRouteLinksToObjectContainer = function (routeLinks, callingCalculateRoute)
{
    for (var l = 0; l < routeLinks.length; l++) {
        if(document.getElementById('filterByConfidenceCheckbox').checked) {
            if (routeLinks[l].confidence < document.getElementById('confidenceFilter').value) {
                continue;
            }
        }
        var coords1 =  callingCalculateRoute ? routeLinks[l].shape : routeLinks[l].shape.split(" "); //in calculateroute resource ths shape is already returned as array
        var coords2 = new H.geo.Strip();
        if (routeLinks[l].offset && routeLinks[l].offset < 1)
        {
            if (routeLinks[l].linkId < 0){
                distance = (1 - routeLinks[l].offset) * (callingCalculateRoute ? routeLinks[l].length : routeLinks[l].linkLength); //if  offset is set calculate new length of the link, caclulateroute.json resource returns back the link length in the length json field while matchroute.json returns it in linkLength
            } else {
                distance = routeLinks[l].offset * (callingCalculateRoute ? routeLinks[l].length : routeLinks[l].linkLength); //if  offset is set calculate new length of the link
            }
            coords1 = getCoordsWithOffset(coords1, distance, l, routeLinks.length);
        } 

        for (var c = 0; c < coords1.length; c += 2){
            coords2.pushLatLngAlt(coords1[c], coords1[c+1], null); //if it is not offset link, just add new point
            // strip.pushPoint(new H.geo.Point(coords1[c], coords1[c+1]));
            full_geometry.push(new H.geo.Point(coords1[c], coords1[c+1]));
        }
    
    
        lLinkId = Math.abs(routeLinks[l].linkId); 

        var lineStyle = makeConfidenceAwareStyle(routeLinks[l].confidence, routeLinks[l].eHorizon);
        
        var linkPolyline;
        if(routeLinks[l].eHorizon)
            linkPolyline = new H.map.Polyline(coords2, {zIndex: 2, style: lineStyle});
        else
            linkPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: lineStyle});

        linkPolyline.setArrows(true);
        linkPolyline.setData(routeLinks[l]);
        linkPolyline.addEventListener('pointerenter', createPointerEnterLinkHandler(linkPolyline));
        linkPolyline.addEventListener('pointerleave', createPointerLeaveLinkHandler(linkPolyline));
        linkPolyline.addEventListener('tap', createTapLinkHandler(linkPolyline));
        objContainer.addObject(linkPolyline);

    }
    
    var extractedStrip = new H.geo.Strip(); 
    for(var i = 0; i < full_geometry.length; i++)
    {
        extractedStrip.pushPoint(full_geometry[i]);
    }
    extractedPolyline = new H.map.Polyline(extractedStrip);
}

/**
    Helper to create the line style based on the links confidence value
*/
function makeConfidenceAwareStyle(c,h) {
    if(!document.getElementById('filterByConfidenceCheckbox').checked) {
        // default blue RME links, turquoise for the links on the electronic horizon
        if(h)
            return lineStyle =  {lineWidth: 8, strokeColor: "rgba(20, 212, 222, 0.7)", lineJoin: "round"};
        else
            return lineStyle =  {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"};
    }
    if (c === undefined) {
      // support rme versions without confidence on result.
      return DEFAULT_CONFIDENCE_LINK_STYLE;
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

var getCoordsWithOffset = function (coords1, distance, currentLink, numberOfLinks){

 var temp = [];
 var prevCoord = [coords1[0], coords1[1]];
    for (var c = 0; c < coords1.length; c += 2){
        var linkLength = getKartesianDistanceInMeter(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1]);  //calculate distance to the next point           // if this is a link with offset, do calculations for the offset
           if ((distance - linkLength) < 0) {        //if offset is not reached add new point
                    // var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], linkLength - distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
                     var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
                     var midPointIndex = c;
                     break;
           } else {
               distance = distance - linkLength;

           }
        prevCoord[0] = coords1[c];
        prevCoord[1] = coords1[c + 1];
    }
     if(!midPoint) {
       var midPoint = getMidPoint(coords1[coords1.length - 4], coords1[coords1.length - 3], coords1[coords1.length - 2], coords1[coords1.length - 1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
           var midPointIndex = coords1.length - 2;
     }
     if (currentLink == 0 || uTurn){
         if (uTurn) uTurn = false;	
         temp.push(String(midPoint[0]));
         temp.push(String(midPoint[1]));
         for (var c = midPointIndex; c < coords1.length; c += 1){
             temp.push(coords1[c]);
         }
     } else {                                         
         if (currentLink != numberOfLinks-1) uTurn = true;         
         for (var c = 0; c < midPointIndex; c += 1){
             temp.push(coords1[c]);
         }
         temp.push(midPoint[0]);
         temp.push(midPoint[1]);
     }

     return temp;
}


  var getKartesianDistanceInMeter = function(lat1, lon1, lat2, lon2)
{
      
      var earthRadius = 6371000;
        // convert input parameters from decimal degrees into radians
      var phi1 = (lat1) * Math.PI / 180;	  
      var phi2 = (lat2) * Math.PI / 180;
      var dphi = phi2 - phi1;
      var dl = (lon2 - lon1) * (Math.PI / 180);

      var a = Math.sin(dphi/2) * Math.sin(dphi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dl/2) * Math.sin(dl/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return earthRadius * c;
}

  var getMidPoint = function(lat1, lon1, lat2, lon2, distance)
{
     /* var lon = ratio*lon1 + (1.0 - ratio)*lon2;
      var lat = ratio*lat1 + (1.0 - ratio)*lat2;*/
      
      var heading = getHeading(lat2,lon2,lat1,lon1);
      var shiftedLatLon = shiftLatLon(lat1, lon1, ((parseFloat(heading) + 180) % 360), distance);  // only 180 degrees to go into the opposite direction
      
    return shiftedLatLon;
}

  function getHeading(lat1,lng1,lat2,lng2)
{
    var phi1 = lat1 * (Math.PI / 180),
        phi2 = lat2 * (Math.PI / 180),
        dl = (lng2 - lng1) * (Math.PI / 180),
        y = Math.sin(dl) * Math.cos(phi2),
        x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl),
        t = Math.atan2(y, x);

    return Math.round(((t * 180 / Math.PI) + 360) % 360);
};

/**
This method shifts the given lat and long along given bearing to the given distance
*/
function shiftLatLon(latDegrees, lonDegrees, bearing, distance)
{
    var earthRadius = 6371000;
    // convert input parameters from decimal degrees into radians
    var latRad = (latDegrees) * Math.PI / 180;
    var lonRad = (lonDegrees) * Math.PI / 180;

    var bearingRad = bearing * Math.PI / 180;
    var distRad = distance / earthRadius;

    var latNewRad = Math.asin(Math.sin(latRad) * Math.cos(distRad) + Math.cos(latRad) * Math.sin(distRad)
    * Math.cos(bearingRad));
    var lonNewRad = lonRad
    + Math.atan2(Math.sin(bearingRad) * Math.sin(distRad) * Math.cos(latRad), Math.cos(distRad) - Math.sin(latRad)
    * Math.sin(latNewRad));

    // convert input parameters from radians into decimal degrees
    var latNewDegrees = latNewRad * 180 / Math.PI;
    var lonNewDegrees = lonNewRad * 180 / Math.PI;
    var latLonRet = [];
    latLonRet.push(latNewDegrees);
    latLonRet.push(lonNewDegrees);
    return latLonRet;
}

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

    var icon = new mapsjs.map.Icon(canvas,
                ({
                    'anchor': {
                        'x': 14,
                        'y': 16
                    }
                }));
    delete canvas; 
    return icon;
};

/**
    Helper to highlight a link
*/
function createPointerEnterLinkHandler(polyline) {
    return function (e) {
        linkHighlighted = true;
        polyline.setStyle(HOVER_LINK_STYLE);
    };
}

  /**
    Helper to disable highlight of a link
*/
  function createPointerLeaveLinkHandler(polyline) {
    return function (e) {
        linkHighlighted = false;
        polyline.setStyle(makeConfidenceAwareStyle(polyline.getData().confidence,polyline.getData().eHorizon));
    };
}

/**
    Shows popup with link info
*/
function createTapLinkHandler(polyline) {
    return function (e) {
        var strip = polyline.getStrip();
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

        var linkInfo = JSON.stringify(polyline.getData(), undefined, 5);
        linkInfo = "<textarea readonly rows='10' cols='50' style='background-color:black;border:0;font-size:12px;max-width:350px;max-height:400px;'>" + linkInfo + "</textarea>";
        if (!linkDataInfoBubble){
            linkDataInfoBubble = new H.ui.InfoBubble(center,{content: linkInfo});
            ui.addBubble(linkDataInfoBubble);	
        }
        else {
            linkDataInfoBubble.setPosition(center);
              linkDataInfoBubble.setContent(linkInfo);
        }
          linkDataInfoBubble.open();
    };
}

/**
    Get method with callback
*/
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


var setCredentials = function(appId, appCode){
    this.app_id = appId;
    this.app_code = appCode;
}

/**
    Adds a China base map overlay layer to the UI - map view choose control element
*/
var addChinaBaseMapLayer = function() {
    var tileProvider = new H.map.provider.ImageTileProvider({
        min: 1,
           max: 20,
        getURL: function (column, row, zoom) {
            // return 'tiles/'+ zoom+ '/'+ row + '/'+ column+ '.png';
            return 'https://'+getRndInteger(1, 4)+'.base.maps.hereapi.cn/maptile/2.1/maptile/newest/normal.day/'+ zoom+ '/'+ column + '/'+ row +'/256/png8?&app_id='+ app_id + '&app_code=' + app_code + '&lg2=ENG';
          }
    });

    var chinaOverlayLayer = new H.map.layer.TileLayer(tileProvider);

    var chinaMapType = {
        map: chinaOverlayLayer
    };

    this.mapSettings = new H.ui.MapSettingsControl({ alignment: H.ui.LayoutAlignment.BOTTOM_RIGHT, 
        entries: [{
          name: "Map view",
          mapType: maptypes.normal
        }, {
          name: "Satellite",
          mapType: maptypes.satellite
        }, {
          name: "Terrain",
          mapType: maptypes.terrain
        },{
          name: "China Map view",
          mapType: chinaMapType
         }]
        });
    var oldMapSettings = ui.removeControl("mapsettings");
    ui.addControl("mapsettings", mapSettings);
    ui.getControl("scalebar").setAlignment(H.ui.LayoutAlignment.BOTTOM_RIGHT);

    map.setCenter({lat:39.94953, lng:116.44285});
    map.setZoom(16);

    var bboxBeijing = new H.geo.Rect(39.97232,	116.40794, 39.92307,	116.47627);
    var bboxShanghai = new H.geo.Rect(31.24981,	121.43831, 31.19352,121.49973);

    var group = new H.map.Group();

    group.addObject(new H.map.Rect(bboxBeijing, {style: {fillColor: 'rgba(0,0,25,0.1)', strokeColor: 'rgba(0,255,0,1)', linewidth: 2} }));
    group.addObject(new H.map.Rect(bboxShanghai, {style: {fillColor: 'rgba(0,0,25,0.1)', strokeColor: 'rgba(0,255,0,1)', linewidth: 2} }));
    map.addObject(group);
    map.setViewBounds(bboxBeijing);
}

function getRndInteger(min, max) {
      return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function saveWkt()
{
    var link = document.createElement('a');
    link.download = 'data.wkt';
    var blob = new Blob([extractedPolyline.getGeometry().toString()], {type: 'text/plain'});
    link.href = window.URL.createObjectURL(blob);
    link.click();
}