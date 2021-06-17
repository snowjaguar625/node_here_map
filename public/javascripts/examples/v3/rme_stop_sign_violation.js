// author wobecker (C) HERE 2014 - 2016
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
var count=0;
var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection

var mapContainer = document.getElementById('mapContainer');
var platform = new H.service.Platform({	app_code: app_code,	app_id: app_id,	useHTTPS: secure });
var	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
var	map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });
var zoomToResult = true;

map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
var ui = H.ui.UI.createDefault(map, maptypes); // add UI

platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
window.addEventListener('resize', function() { map.getViewPort().resize(); });

var	objContainer = new H.map.Group();
var bubble;

var addTraceByClick = false;

var trafficLights=new Array(), stopSigns=new Array(), stopsDetected=new Array();
var tracePoints;
var tracePointsGroup = new H.map.Group();
var stopsDetectedGroup = new H.map.Group();
var trafficLightGroup = new H.map.Group();
var stopSignGroup = new H.map.Group();

var submitTrace = function () {
    objContainer.removeAll(); tracePointsGroup.removeAll(); stopsDetectedGroup.removeAll(); trafficLightGroup.removeAll();  stopSignGroup.removeAll();
    trafficLights=new Array(), stopSigns=new Array(), stopsDetected=new Array();
    // if there is an app_id specified in the URL then use it, otherwise use the default
    var url = document.getElementById('rmeUrl').value;
    var appIdRegEx= /[\?&]app_id=/i;
    var appCodeRegEx= /[\?&]app_code=/i;
    if( url.search( appIdRegEx ) === -1 && url.search( appCodeRegEx ) === -1 ) {
        if( ! url.endsWith( "&" ) ) url= url.concat( "&" );
        url= url.concat( "app_id=" + app_id + "&app_code=" + app_code );                
    }
    if( ( url.search( appIdRegEx ) >= 0 && url.search( appCodeRegEx ) < 0 ) || ( url.search( appIdRegEx ) < 0 && url.search( appCodeRegEx ) >= 0 ) ) {
        alert('If you provide credentials in the RME URL field, please provide both app_id AND app_code.');                
        return;
    }
    url = url + "&attributes=TRAFFIC_SIGN_FCn(*)";
    // create the icons if needed, ok we make some more icons as needed for GPX inputs
    var text = document.getElementById('tracetextarea').value;
    if (text === ""){
        alert("Please add a trace"); 
        return;
    }
    var lines = text.split(/\r|\r\n|\n/);
    var count = lines.length;
    createIcons(count);

    if (!("TextEncoder" in window)) 
          alert("Sorry, this browser does not support TextEncoder...");
      else {
          var enc = new TextEncoder(); // always utf-8
        var postData = enc.encode(text);
        $.ajax({
            url: url,
            dataType: "json",
            async: true,
            type: 'post',
            data: postData,
            contentType: 'application/octet-stream',
            processData: false,
            success: function(data) {
                gotRouteMatchResponse(data);
            },
            error: function(xhr, status, e) {
                alert(xhr.responseJSON.issues[0] || xhr.responseJSON);
            }
        });	
      }

    /*var zip = new JSZip();
    zip.file("temp.zip", document.getElementById('tracetextarea').value);
    var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
    url += "&file=" + encodeURIComponent(content);
    getJSONP(url, gotRouteMatchResponse);*/

            
};

document.getElementById('submittracebutton').onclick = submitTrace;

var toggleCheckboxesError = function() {
    window.alert('Please, submit a trace first');

    document.getElementById('toggleTrafficLightsAndStops').checked = false;
    document.getElementById('toggleAllTrafficSigns').checked = false;
  };


function reset() {
    objContainer.removeAll(); tracePointsGroup.removeAll(); stopsDetectedGroup.removeAll(); trafficLightGroup.removeAll();  stopSignGroup.removeAll();
    trafficLights=new Array(), stopSigns=new Array(), stopsDetected=new Array();
    document.getElementById('toggleTracePoints').checked = false;
    document.getElementById('toggleTrafficLights').checked = true;
    document.getElementById('toggleStopSigns').checked = true;
    document.getElementById('tracetextarea').value = '';
    document.getElementById("warningstextarea").value = '';
}

function toggleCheckbox(element){
    switch (element.id){
        case "toggleTracePoints":
            try{
                if(document.getElementById('toggleTracePoints').checked === true) objContainer.addObject(tracePointsGroup);
                else objContainer.removeObject(tracePointsGroup);
            }
            catch(error){
                console.log("Error:" + error.message);
            }
            break;
        case "toggleStopsDetected":
            try{
                if(document.getElementById('toggleStopsDetected').checked === true) objContainer.addObject(stopsDetectedGroup);
                else objContainer.removeObject(stopsDetectedGroup);
            }
            catch(error){
                console.log("Error:" + error.message);
            }
            break;
        case "toggleTrafficLights":
            try{
                if(document.getElementById('toggleTrafficLights').checked === true) objContainer.addObject(trafficLightGroup);
                else objContainer.removeObject(trafficLightGroup);
            }
            catch(error){
                console.log("Error:" + error.message);
            }
            break;
        case "toggleStopSigns":
            try{
                if(document.getElementById('toggleStopSigns').checked === true) objContainer.addObject(stopSignGroup);
                else objContainer.removeObject(stopSignGroup);
            }
            catch(error){
                console.log("Error:" + error.message);
            }
            break;
        default:
            console.log("Undefined checkbox");
            break;
    }
}

var DEFAULT_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(18, 65, 145, 0.7)', lineJoin: 'round'};
var HOVER_LINK_STYLE = {lineWidth: 8, strokeColor: 'rgba(255, 65, 145, 1)', lineJoin: "round"};

function createPointerLeaveLinkHandler(polyline) {
    return function (e) {
      polyline.setStyle(DEFAULT_LINK_STYLE);
    };
}
function createPointerEnterLinkHandler(polyline) {
    return function (e) {
        polyline.setStyle(HOVER_LINK_STYLE);
    };
  }


map.addEventListener('tap', function (currentEvent) {
    if (currentEvent.target === map){
        if (!addTraceByClick){
            if (confirm("Add new trace by clicking on the map ?")){
                addTraceByClick = true;
                reset();
                addTracePointsByClick(currentEvent);
            }
        }
        else addTracePointsByClick(currentEvent);
    }
});

function addTracePointsByClick(currentEvent){
    var traceTextArea = document.getElementById('tracetextarea');
    if (traceTextArea.value.lastIndexOf('LATITUDE,LONGITUDE', 0) != 0) traceTextArea.value = 'LATITUDE,LONGITUDE';
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
    document.getElementById('tracetextarea').value += "\n" + (Math.round(lastClickedPos.lat * 100000.0) / 100000.0) + "," + (Math.round(lastClickedPos.lng * 100000.0) / 100000.0);
    zoomToResult = false;
    submitTrace();
}

function createPolylineTapLinkHandler(polyline) {
    return function (e) {
    if (bubble) ui.removeBubble(bubble);
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
    var infoText = JSON.stringify(polyline.getData(),undefined,5);
    infoText="<textarea readonly rows='5' cols='35' style='background-color:black;border:0;font-size:12px;max-width:350px;max-height:400px;'>"+infoText+"</textarea>";
    bubble = new H.ui.InfoBubble(center, {content: infoText});
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
            //submitTrace();
        }
        r.readAsText(file);
    },
    false
);


var gotRouteMatchResponse = function (respJsonObj) {
    if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
        alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
        return;
    }
    // draw the route
    var routeLinks = respJsonObj.response.route[0].leg[0].link;
    for (var l = 0; l < routeLinks.length; l++) {
        link = routeLinks[l];
        var coords1 = link.shape;
        var coords2 = new H.geo.Strip();
        for (var c = 0; c < coords1.length; c += 2){
            coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
        }
        linkPolyline = new H.map.Polyline(coords2, {zIndex: 3, arrows: {width:0.8, length:1.2, frequency:3}, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}});
        objContainer.addObject(linkPolyline);
        
        linkPolyline.setData(routeLinks[l]);

        linkPolyline.addEventListener('pointerenter', createPointerEnterLinkHandler(linkPolyline));
        linkPolyline.addEventListener('pointerleave', createPointerLeaveLinkHandler(linkPolyline));
        linkPolyline.addEventListener('tap', createPolylineTapLinkHandler(linkPolyline));
        objContainer.addObject(linkPolyline);

        var trafficSignalIcon = "";
        if (link.attributes !== undefined){
            console.log(link.attributes);
            if(link.attributes.TRAFFIC_SIGN_FCN !== undefined){
                var trafficSigns = link.attributes.TRAFFIC_SIGN_FCN;
                for (var i=0; i<trafficSigns.length;i++){
                    var linkIds = trafficSigns[i].LINK_IDS.split(",");
                    for (var j=0;j<linkIds.length;j++){
                        //if(linkIds[j].replace(/[a-z]/gi, "") === link.linkId.replace(/-/,"") || linkIds[j] === link.linkId){
                        if(linkIds[j].replace(/[0-9]/gi, "") === "B" || linkIds[j] === link.linkId){
                            if (trafficSigns[i].CONDITION_TYPE==="16"){
                                for (var i; i<trafficLights.length;i++){
                                    if (trafficLights[i].linkId === link.linkId) return;
                                }
                                trafficLights.push({"linkId":link.linkId, "lat":coords1[coords1.length - 2], "lng": coords1[coords1.length - 1], "condition":trafficSigns[i]});
                                var point = new H.geo.Point(coords1[coords1.length - 2], coords1[coords1.length - 1]);
                                var signMarker = new H.map.Marker(point, {
                                        icon: trafficIcons["16_0_eu"]
                                    });
                                trafficLightGroup.addObject(signMarker);
                            }
                            else if (trafficSigns[i].CONDITION_TYPE==="17" && trafficSigns[i].TRAFFIC_SIGN_TYPE==="20"){
                                for (var i; i<stopSigns.length;i++){
                                    if (stopSigns[i].linkId === link.linkId) return;
                                }
                                stopSigns.push({"linkId":link.linkId, "lat":coords1[coords1.length - 2], "lng": coords1[coords1.length - 1], "condition":trafficSigns[i]});
                                var point = new H.geo.Point(coords1[coords1.length - 2], coords1[coords1.length - 1]);
                                var signMarker = new H.map.Marker(point, {
                                        icon: trafficIcons["17_020_eu"]
                                    });
                                stopSignGroup.addObject(signMarker);
                            }
                        }
                    }
                }
            }
        }
    }

    // draw the original and the matched trace points
    tracePoints = respJsonObj.response.route[0].waypoint;
    for (var l = 0; l < tracePoints.length; l++) {
        var p = tracePoints[l];
        tracePointsGroup.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {
            //icon: createIcon("#000000", l)
            icon: icons["#000000" + l]
        }));
        tracePointsGroup.addObject(new H.map.Marker(new H.geo.Point(p.mappedPosition.latitude, p.mappedPosition.longitude), {
            //icon: createIcon("#FF0000", l)
            icon: icons["#FF0000" + l]
        }));
    }


    if (zoomToResult) map.setViewBounds(objContainer.getBounds());
    zoomToResult = true;

    var warningsArea = document.getElementById("warningstextarea");
    if(respJsonObj.response.warnings.length === 0) {
        warningsArea.value += 'No Warnings.';
    } else {
        var warnings = respJsonObj.response.warnings;
        for(var d = 0; d < warnings.length; d++) {
            var warning = warnings[d];
            if (warning.code === 1010) {
                if(0 !== d) warningsArea.value += '\n';
                warningsArea.value += warning.message;
                var start = parseInt(warning.tracePointSeqNum);
                var end = parseInt(warning.message.replace("Vehicle stopped until trace point ", ""));
                var duration = tracePoints[start].breakDuration !== undefined ? tracePoints[start].breakDuration/1000 : 0;
                var links = new Array();
                for (var i=start; i<=end;i++){
                    links.push(tracePoints[i].linkId);
                }
                stopsDetected.push({"start":start, "end": end, "duration":duration, "linksMatched":links});
                var point = new H.geo.Point(tracePoints[start].mappedPosition.latitude, tracePoints[start].mappedPosition.longitude);
                var marker = new H.map.Marker(point, 
                    {
                        icon: createIconMarker("Stop Detected from tracepoint "+ start + " till " + end, "Duration: " + duration + " seconds")
                    });
                stopsDetectedGroup.addObject(marker);
            }
            
        }
    }
    // Stop Violation detection
    /*for (var i=0;i<stopSigns.length;i++){
        var stopSign = stopSigns[i];
        for (var l; l<trafficLights.length; l++){
            if (stopSign.linkId === trafficLights[l].linkId) 
        }
        for (var j=0; j<stopsDetected.length; j++){
            var stopDetected = stopsDetected[j];
            var stopLinks = stopsDetected[j].linksMatched;
            var stopViolation = false;
            for (var j=0; j<stopLinks.length; j++){
                stopLink = stopDetected.linksMatched[j].replace("+","");
                if (stopLink === stopSign.linkId){

                }
            }
    }*/

    if (document.getElementById('toggleTracePoints').checked == true) objContainer.addObject(tracePointsGroup);
    if (document.getElementById('toggleStopsDetected').checked == true) objContainer.addObject(stopsDetectedGroup);
    if (document.getElementById('toggleTrafficLights').checked == true) objContainer.addObject(trafficLightGroup);
    if (document.getElementById('toggleStopSigns').checked == true) objContainer.addObject(stopSignGroup);

    map.addObject(objContainer);
};

var loadFromFile = function (filename) {
    var req = new XMLHttpRequest();
    req.open('GET', '/sample_data/' + filename);
    req.onreadystatechange = function() {
        if (req.readyState != XMLHttpRequest.DONE) return;
        document.getElementById('tracetextarea').value = req.responseText;
        //submitTrace();
    }
    req.send();
}

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


var icons = {};

var createIcons = function(l)
{
    for(var i = 0; i < l; i++)
    {
        if(icons["#000000" + i] === undefined)
            icons["#000000" + i] = createIcon("#000000", i);
        if(icons["FF0000" + i] === undefined)
            icons["#FF0000" + i] = createIcon("#FF0000", i);
    }
}

var createIcon = function (color, text) {
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

//--- Helper - Create Start / Destination marker
var createIconMarker = function (line1, line2) {
    var svgMarker = svgMarkerImage_Line;

    svgMarker = svgMarker.replace(/__line1__/g, line1);
    svgMarker = svgMarker.replace(/__line2__/g, (line2.length !== 0 ? line2 : ""));
    svgMarker = svgMarker.replace(/__width__/g, (line1.length !== 0 ? line1.length * 4 + 80 : (line2.length * 4 + 40)));
    svgMarker = svgMarker.replace(/__widthAll__/g, (line1.length !== 0 ? line1.length * 4 + 150 : (line2.length * 4 + 150)));
    return new H.map.Icon(svgMarker, {
        anchor: new H.math.Point(24, 57)
    });
};