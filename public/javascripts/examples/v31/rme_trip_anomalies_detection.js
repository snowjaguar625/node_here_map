// author faheem, wobecker (C) HERE 2017 - 2018
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection

var mapContainer = document.getElementById('mapContainer');
var platform = new H.service.Platform({			apikey: api_key,
    useHTTPS: secure });
var	maptypes = platform.createDefaultLayers();
var	map = new H.Map(mapContainer, maptypes.vector.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });
var zoomToResult = true;

map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
var ui = H.ui.UI.createDefault(map, maptypes); // add UI
window.addEventListener('resize', function() { map.getViewPort().resize(); });

var	pdeManager;
var speeds = new Object();
var linkAttributes = new Object();
var urbanLinkAttributes = new Object();
var congestionFactorLinks = new Object();
var iLastLinkSpeedlimit = 0;
var curvatureWarningText = 'Curvature Warning: ';

var trafficPatternHashMap; //variable to hold the static traffic content content

// adas coordinate to wgs conversion
var ADASNTU_TO_WGS84 = 10000000;

var routeLinkHashMap  = new Object(); // key = linkID (only positive value), value = link object which is part of the route


//color for different categories that are returned in the warnings section of the response
//the key here is the category_id + color or name
var warningCategory = {
    '1_color' 	: 'rgba(255, 255, 0, 0.8)',
    '1_name'  	: 'Other',
    '2_color' 	: 'rgba(255, 216, 0, 0.8)',
    '2_name' 	: 'Suspicious U Turn',
    '3_color'	: 'rgba(255, 0, 0, 0.8)',
    '3_name'	: 'Forbidden Driving Direction',
    '4_color'	: 'rgba(255, 127, 127, 0.8)', 
    '4_name'	: 'Forbidden Access',
    '5_color'	: 'rgba(214, 127, 255, 0.8)',
    '5_name'	: 'Leaving No Through Traffic Zone',
    '6_color'	: 'rgba(178, 0, 255, 0.8)',
    '6_name'	: 'Illegal U Turn',
    '7_color'	: 'rgba(0, 204, 0, 0.8)',
    '7_name'	: 'Gate Traversal',
    '8_color'	: 'rgba(0, 145, 255, 0.7)',
    '8_name'	: 'Illegal Turn',
    '9_color'	: 'rgba(255, 255, 0, 0.7)',
    '9_name'	: 'Toll Cost Route Link Id not found in map',
    '10_color'	: 'rgba(255, 216, 0, 0.7)',
    '10_name'	: 'Toll cost ferry links on route',
    '11_color'	: 'rgba(255, 0, 0, 0.7)',
    '11_name'	: 'Toll cost vehicle_spec param mismatch',
    '12_color'	: 'rgba(255, 127, 127, 0.7)',
    '12_name'	: 'Toll cost vehicle near match',
    '13_color'	: 'rgba(214, 127, 255, 0.7)',
    '13_name'	: 'Optional way_point',
    '1000_color': 'rgba(255, 255, 0, 0.8)',
    '1000_name'	: 'Other',
    '1001_color': 'rgba(178, 0, 255, 0.7)',
    '1001_name' : 'Deprecated CSV column',
    '1002_color': 'rgba(0, 204, 0, 0.7)',
    '1002_name' : 'Unknown CSV column',
    '1003_color': 'rgba(127, 201, 255, 0.6)',
    '1003_name'	: 'Unconnected route links',
    '1004_color': 'rgba(255, 255, 0, 0.6)',
    '1004_name'	: 'Ignored bad trace point',
    '1005_color': 'rgba(255, 216, 0, 0.6)',
    '1005_name'	: 'Trace point long match distance',
    '1006_color': 'rgba(255, 0, 0, 0.6)',
    '1006_name'	: 'Trace point matched out of sequence on route',
    '1008_color': 'rgba(255, 127, 127, 0.6)',
    '1008_name'	: 'Trace point could not be matched',
    '1009_color': 'rgba(214, 127, 255, 0.6)',
    '1009_name'	: 'Route dist big waypoints close'
}

//below FCs colors are as close as possible to the HERE maps FCs colors
var functionalClassColor = {
    '1' : 'rgba(220, 123, 161, 1)', //FC1 color hex = #dc7ba1
    '2' : 'rgba(254, 173, 157, 1)', //FC2 color hex = #fead9d
    '3' : 'rgba(255, 252, 168, 1)', //FC3 color hex = fffca8
    '4' : 'rgba(254, 254, 226, 1)',	//FC4 color hex = #fefee2 
    '5' : 'rgba(255, 255, 255, 1)'	//FC5 color hex = #ffffff
}

//a boolean variable to hide/show the curvature legend
var bCurvatureSpeedlimitCreated = false;

var curvatureColor = "rgba(255, 50, 190, 0.7)";
var controlledAccessColor = "rgba(128, 128, 0, 1)"; //hex = #808000

var	objContainer = new H.map.Group();
var warningsGroup = new H.map.Group();
var pdeSpeedGroup = new H.map.Group();
var pdeUrbanLinkGroup = new H.map.Group();
var pdeFCLinkGroup = new H.map.Group();
var linkCurvatureGroup = new H.map.Group();
var curvatureWarningGroup = new H.map.Group();
var controlledAccessLinkGroup = new H.map.Group();
var congestionFactorGroup = new H.map.Group();

var submitTrace = function () {
    objContainer.removeAll();
    warningsGroup.removeAll();
    pdeSpeedGroup.removeAll();
    pdeUrbanLinkGroup.removeAll();
    pdeFCLinkGroup.removeAll();
    linkCurvatureGroup.removeAll();
    curvatureWarningGroup.removeAll();
    controlledAccessLinkGroup.removeAll();
    congestionFactorGroup.removeAll();
    iLastLinkSpeedlimit = 0;
    bCurvatureSpeedlimitCreated = false;
    //remove the existing bubbles if any
    removeInfoBubbles();
    initializePDEManager();
    document.getElementById("warningstextarea").value = '';
    document.getElementById("nothingToShow").checked = true;
    deleteDynamicallyAddedLiElements();
    var url = document.getElementById('rmeUrl').value;
    // if there is an app_id specified in the URL then use it, otherwise use the default
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
};

var toggleShowRmeMatchedTraceAndPoints = toggleCheckboxesError;

function reset() {
toggleReverseGeocodeWithHeading = toggleCheckboxesError;
toggleReverseGeocodeWithoutHeading = toggleCheckboxesError;
toggleShowRmeMatchedTraceAndPoints = toggleCheckboxesError;
deleteDynamicallyAddedLiElements();
var traceTextArea = document.getElementById('tracetextarea');
traceTextArea.value = '';
objContainer.removeAll();
warningsGroup.removeAll();
pdeSpeedGroup.removeAll();
pdeUrbanLinkGroup.removeAll();
pdeFCLinkGroup.removeAll();
linkCurvatureGroup.removeAll();
curvatureWarningGroup.removeAll();
controlledAccessLinkGroup.removeAll();
congestionFactorGroup.removeAll();
document.getElementById("warningstextarea").value = '';
document.getElementById("nothingToShow").checked = true;
   removeInfoBubbles();
   iLastLinkSpeedlimit = 0;
   bCurvatureSpeedlimitCreated = false;
}

map.addEventListener('tap', function (currentEvent) {
    var traceTextArea = document.getElementById('tracetextarea');
    if (traceTextArea.value.lastIndexOf('LATITUDE,LONGITUDE', 0) != 0) traceTextArea.value = 'LATITUDE,LONGITUDE';
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
    var numLines = traceTextArea.value.split(/\r*\n/).length;
    document.getElementById('tracetextarea').value += "\n" + (Math.round(lastClickedPos.lat * 100000.0) / 100000.0) + "," + (Math.round(lastClickedPos.lng * 100000.0) / 100000.0);
    zoomToResult = false;
    submitTrace();
});

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

function initializePDEManager(){
  var	layers = new Object(); 
layers["SPEED_LIMITS_FC"]   = {callback: gotSpeedLimits};
layers["LINK_ATTRIBUTE_FC"] = {callback: gotLinkAttributeResponse}; //to get the urban and functional class flag
layers["TRAFFIC_PATTERN_FC"] = {callback: gotTrafficPatternResponse}; //to show the congestion factor
pdeManager = new PDEManager(app_id, app_code, layers);
}

var gotRouteMatchResponse = function (respJsonObj) {

       if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
        alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
        return;
    }

    //remove any existing bubbles if any
    removeInfoBubbles();

    var routeLinks = respJsonObj.RouteLinks;
    var newResponse = routeLinks == undefined;
    var routeLinksLength;
    var tracePointsLength;
    if (newResponse) { // new calculateroute response
        // draw the route
        routeLinks = respJsonObj.response.route[0].leg[0].link;
        routeLinksLength = routeLinks.length;
        for (var l = 0; l < routeLinks.length; l++) {
            var coords1 = routeLinks[l].shape;
            var coords2 = new H.geo.LineString();
            for (var c = 0; c < coords1.length; c += 2)
                coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
            objContainer.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}}));
            routeLinkHashMap[Math.abs(routeLinks[l].linkId)] = routeLinks[l];
        }
        // draw the original and the matched trace points
        tracePoints = respJsonObj.response.route[0].waypoint;
        tracePointsLength = tracePoints.length;
        for (var l = 0; l < tracePointsLength; l++) {
            var p = tracePoints[l];
            objContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: createIcon("#000000", l, 16)}));
            objContainer.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon("#00FF00", l, 16)}));
        }
    } else { // old routematch response
        // draw the route
        routeLinksLength = routeLinks.length;
        for (var l = 0; l < routeLinksLength; l++) {
            var coords1 = routeLinks[l].shape.split(" ");
            var coords2 = new H.geo.LineString();
            for (var c = 0; c < coords1.length; c += 2)
                coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
            var absoluteRouteLinkId = Math.abs(routeLinks[l].linkId);
            routeLinkHashMap[absoluteRouteLinkId] = routeLinks[l];
            objContainer.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(18, 65, 145, 0.7)", lineJoin: "round"}}));
        }
        // draw the original and the matched trace points
        tracePoints = respJsonObj.TracePoints;
        tracePointsLength = tracePoints.length;
        for (var l = 0; l < tracePointsLength; l++) {
            var p = tracePoints[l];
            objContainer.addObject(new H.map.Marker(new H.geo.Point(p.lat       , p.lon       ), {icon: createIcon("#000000", l, 16)}));
            objContainer.addObject(new H.map.Marker(new H.geo.Point(p.latMatched, p.lonMatched), {icon: createIcon("#0000FF", l, 16)}));
        }
    }

    map.addObject(objContainer);
    map.addObject(warningsGroup);
    if (zoomToResult) 
        map.getViewModel().setLookAtData({
                    bounds: objContainer.getBoundingBox()
        });
    zoomToResult = true;
    // should display the warnings … warnings = respJsonObj.Warnings;  if (warnings.length > 0) …
    mapVersion = newResponse ? "latest" : respJsonObj.mapVersion; // RME's map version. Use it to cross reference with PDE.
    var warningsArea = document.getElementById("warningstextarea");
    var warnings = newResponse ? respJsonObj.response.warnings : respJsonObj.Warnings;
    if (warnings.length === 0) {
        warningsArea.value += 'No Warnings.';
    } else {
        var legendList = document.getElementById("legendList");
        var categorySet = {};
        for(var d = 0; d < warnings.length; d++) {
            if(0 !== d) warningsArea.value += '\n';
            warningsArea.value += (newResponse ? warnings[d].message : warnings[d].text ) ;
            var category = newResponse ? warnings[d].code : warnings[d].category;
            if (!categorySet.hasOwnProperty(category)){
                categorySet[category] = category;
            }
            //display the categories/eventes in different colors on the map related to the RouteLinks 
            if (warnings[d].routeLinkSeqNum){
                var routeLinkSeqNum = warnings[d].routeLinkSeqNum;
                if (routeLinkSeqNum != undefined && routeLinkSeqNum !== -1 && routeLinkSeqNum < routeLinksLength) {
                    var routeLink = routeLinks[routeLinkSeqNum];
                    var coords2 = new H.geo.LineString();
                    var isRoutingResponse = Array.isArray(routeLink.shape);
                    if (isRoutingResponse) {
                        var coords1 = routeLink.shape;
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
                    } else {
                        var coords1 = routeLink.shape.split(" ");
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
                    }	
                    var warningPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 12, strokeColor: warningCategory[category+'_color'] != undefined ? warningCategory[category+'_color'] : warningCategory['1000_color'], lineJoin: "round"}});
                    var warningMessage = newResponse ? warnings[d].message : warnings[d].text;
                    warningPolyline.setData(warningMessage);
                    warningsGroup.addObject(warningPolyline);

                    //show info bubble
                    var bubble =  new H.ui.InfoBubble(warningPolyline.getBoundingBox().getCenter(), {
                      // read custom data
                      content: '<h6>' + warningPolyline.getData() + '</h6>'
                    });
                    if (bubble){
                        ui.addBubble(bubble);
                        bubble.open();
                    }
                }
            }

            //display the categories/eventes in different colors on the map related to the tracepoints
            if (warnings[d].tracePointSeqNum){
                var tracePointSeqNum = warnings[d].tracePointSeqNum;
                if (tracePointSeqNum != undefined && tracePointSeqNum !== -1 &&  tracePointSeqNum < tracePointsLength){
                    var p = tracePoints[tracePointSeqNum];
                    var categoryColor = warningCategory[category+'_color'] != undefined ? warningCategory[category+'_color'] : warningCategory['1000_color']
                    var lat = newResponse ? p.originalPosition.latitude : p.lat; 
                    var lon = newResponse ? p.originalPosition.longitude : p.lon ;
                    var warningMarker = new H.map.Marker(new H.geo.Point(lat, lon), {icon: createIcon(rgb2hex(categoryColor), tracePointSeqNum, 16)});
                    warningMarker.setData(newResponse ? warnings[d].message : warnings[d].text);
                    warningsGroup.addObject(warningMarker);
                    //show info bubble
                    var bubble =  new H.ui.InfoBubble(warningMarker.getGeometry(), {
                      // read custom data
                      content: '<h6>' + warningMarker.getData() + '</h6>'
                    });
                        // show info bubble
                    
                    if (bubble){
                        ui.addBubble(bubble);
                        bubble.open();
                    }
                }
            }
        }

        //Display the legends according to the returned categories
        Object.keys(categorySet).forEach(function(key) {
            var li = document.createElement("li");
            li.id = key;
              li.appendChild(document.createTextNode(warningCategory[key+'_name'] != undefined ? warningCategory[key+'_name'] : warningCategory['1000_name']));
              li.style.color = rgb2hex(warningCategory[key+'_color'] != undefined ? warningCategory[key+'_color'] : warningCategory['1000_color']);
              legendList.appendChild(li);
        });
    }

    //call PDE to get the speed of the trace
    //pdeManager.setBoundingBoxContainer(objContainer); //uncomment this line if you want to show the tiling on the map
    pdeManager.setLinks(routeLinks);
    pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
    pdeManager.start();
};


function gotSpeedLimits (resp) {
    if (resp.error != undefined || resp.responseCode != undefined) {
        alert("Got PDE error response");
    }
    for (r = 0; r < resp.Rows.length; r++) {
        var linkId = parseInt(resp.Rows[r].LINK_ID);
        var routeLink = pdeManager.getRouteLinks()[linkId];
        if (routeLink == null) { // if the route is driving it to ref node, it has a negative link_id in the route response
            routeLink = pdeManager.getRouteLinks()[-linkId];
            if (routeLink == null) continue; // link_id is not on the route
            linkId = -linkId;
        }
        speeds[linkId] = resp.Rows[r];
    }
}

function gotLinkAttributeResponse (resp){
    if (resp.error != undefined || resp.responseCode != undefined) {
        alert("Got PDE error response while getting link attributes");
        return;
    }
    for (var row = 0; row < resp.Rows.length; row++){
        var linkId = parseInt(resp.Rows[row].LINK_ID);
        var routeLink = pdeManager.getRouteLinks()[linkId];

        if (routeLink == null) { // if the route is driving it to ref node, it has a negative link_id in the route response
            routeLink = pdeManager.getRouteLinks()[-linkId];
            if (routeLink == null) continue; // link_id is not on the route
            linkId = -linkId;
        }

        if (!resp.Rows[row].FUNCTIONAL_CLASS) continue;

        //only add those links which has URBAN flag set
        if (resp.Rows[row].URBAN){
            if (resp.Rows[row].URBAN === 'Y') {
                //urbanLinkAttributes[linkId] = resp.Rows[row];
                urbanLinkAttributes[linkId] = routeLink;
                //add this to the group which will be shown on the map
                var coords2 = new H.geo.LineString();
                var isRoutingResponse = Array.isArray(routeLink.shape);
                if (isRoutingResponse) {
                    var coords1 = routeLink.shape;
                    for (var c = 0; c < coords1.length; c += 2)
                        coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
                } else {
                    var coords1 = routeLink.shape.split(" ");
                    for (var c = 0; c < coords1.length; c += 2)
                        coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
                }
                pdeUrbanLinkGroup.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(204, 68, 153, 1)", lineJoin: "round"}}));
            }
            //store and show those records which have functional class attribute set
            if (resp.Rows[row].FUNCTIONAL_CLASS){
                routeLink._functionalClass = resp.Rows[row].FUNCTIONAL_CLASS;
                linkAttributes[linkId] = routeLink;
                var fcColor = functionalClassColor[routeLink._functionalClass];
                if (fcColor){
                    var coords2 = new H.geo.LineString();
                    var isRoutingResponse = Array.isArray(routeLink.shape);
                    if (isRoutingResponse) {
                        var coords1 = routeLink.shape;
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
                    } else {
                        var coords1 = routeLink.shape.split(" ");
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
                    }
                    pdeFCLinkGroup.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 19, strokeColor: fcColor, lineJoin: "round"}}));
                }		
            }

            //controlled access roads/links
            if (resp.Rows[row].CONTROLLED_ACCESS){
                if (resp.Rows[row].CONTROLLED_ACCESS === 'Y'){
                    routeLink._controlledAccess = resp.Rows[row].CONTROLLED_ACCESS;
                    //add this to the group which will be shown on the map
                    var coords2 = new H.geo.LineString();
                    var isRoutingResponse = Array.isArray(routeLink.shape);
                    if (isRoutingResponse) {
                        var coords1 = routeLink.shape;
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
                    } else {
                        var coords1 = routeLink.shape.split(" ");
                        for (var c = 0; c < coords1.length; c += 2)
                            coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
                    }
                    controlledAccessLinkGroup.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 19, strokeColor: controlledAccessColor, lineJoin: "round"}}));
                }
            }
        } 
    }
}

function gotTrafficPatternResponse(resp){
    if (resp.error != undefined || resp.responseCode != undefined) {
        alert("Got PDE error response while getting traffic pattern.");
        return;
    }

    //RME sends back the timestamp in the response (TracePoints) so read the first record and then add the "mSecToReachLinkFromStart" for each
    //link in the RouteLinks section
    var timeStamp;
    var timeStampInMSec;
    if (tracePoints && tracePoints.length > 0){
        timeStamp = tracePoints[0].timestamp === 0 ? new Date() : new Date(tracePoints[0].timestamp);
        timeStampInMSec = timeStamp.getTime();
    }else{
        timeStamp = new Date();
        timeStampInMSec = timeStamp.getTime();
    }

    for (var row = 0; row < resp.Rows.length; row++){
        var linkId = parseInt(resp.Rows[row].LINK_ID);
        var routeLink = pdeManager.getRouteLinks()[linkId];

        if (routeLink == null) { // if the route is driving it to ref node, it has a negative link_id in the route response
            routeLink = pdeManager.getRouteLinks()[-linkId];
            if (routeLink == null) continue; // link_id is not on the route
            linkId = -linkId;
        }
        if (routeLink.mSecToReachLinkFromStart){
            timeStampInMSec+=routeLink.mSecToReachLinkFromStart;	
            resp.Rows[row]._timeStampInMSec = timeStampInMSec;
        }
        resp.Rows[row]._shape = routeLink.shape;
        congestionFactorLinks[linkId] = resp.Rows[row]; 
    }
}

function pdeManagerFinished (evt) {
    var url = document.getElementById('rmeUrl').value;	
    var newCalculateRouteResponse = url.indexOf("matchroute.json") >= 0 ? false : true; 

    for (var l = 0; l < tracePoints.length; l++) {
        var p = tracePoints[l], linkId = newCalculateRouteResponse ? p.linkId : p.linkIdMatched;
        if (linkId.startsWith("+")) linkId = linkId.substring(linkId.indexOf("+")+1); 
        var sp = speeds[linkId]; // negative sign if driving to reference node
        var lat = newCalculateRouteResponse ? p.mappedPosition.latitude : p.latMatched;
        var lon = newCalculateRouteResponse ? p.mappedPosition.longitude : p.lonMatched;
        // Speeding information
        if (sp){//if not set then continue; // no speed limit for this link, probably functional class 5
            var sl = (linkId > 0) ? speeds[linkId].FROM_REF_SPEED_LIMIT : speeds[linkId].TO_REF_SPEED_LIMIT;
            //if (sl == null) continue; // no speed limit for this link, probably functional class 5
            if (sl){
                var speedingColor = (p.speedMps * 3.6 > sl) ? "#cd1439" : "#2b9c6a"; // #00FF00=light green , #FF0000 = red
                pdeSpeedGroup.addObject(new H.map.Marker(new H.geo.Point(lat, lon), {icon: createIcon(speedingColor, Math.round(p.speedMps * 3.6) + "/" + sl, 26)}));
            }
        }
    }

    //Traffic Pattern - Congestion Factor
    var currentTimeInMSec = new Date().getTime();
    for (var key in congestionFactorLinks){
        if (congestionFactorLinks.hasOwnProperty(key)){
            var cfl = congestionFactorLinks[key];
            var timeInMSec = cfl._timeStampInMSec;
            if (!timeInMSec)
                timeInMSec = currentTimeInMSec;
            var date = new Date(timeInMSec);
            var weekday = date.getDay();
            var minutes = date.getMinutes();
            var hours = date.getHours();
            var freeFlowSpeed = cfl.FREE_FLOW_SPEED;
            if (!freeFlowSpeed || !trafficPatternHashMap) continue; //not possible to compute the congestion factor if no free flow speed is present or if the static layer is not yet loaded
            var patternTime = hours * 4 + Math.floor(minutes / 15);
            var fromRefSpeedKmh;
            var toRefSpeedKmh;
            var speedKmh;
            if(cfl.TRAVEL_DIRECTION === "F"){
                speedKmh = getSpeed(1, weekday, patternTime, cfl);
            }else{
                speedKmh = getSpeed(2, weekday, patternTime, cfl);
            }
            if(!speedKmh){
                //console.log("No speed available for --> link " + cfl.LINK_ID + "|Driving Direction "+cfl.TRAVEL_DIRECTION + "|FC "+cfl.FUNCTIONAL_CLASS); //for debugging
                 continue; //do not have the speed available for that link
            }
            if (freeFlowSpeed <= 0) freeFlowSpeed = 1; // avoid division by zero
            var speedFactor = speedKmh / freeFlowSpeed; // coloring is subject to customer preferences
            var                           color = '#61ba72'; // green
            if      (speedFactor <= 0.50) color = '#ea232d'; // red
            else if (speedFactor <= 0.75) color = '#fecf00'; // yellow
            var coords2 = new H.geo.LineString();
            var isRoutingResponse = Array.isArray(cfl._shape);
            if (isRoutingResponse) {
                var coords1 = cfl._shape;
                for (var c = 0; c < coords1.length; c += 2)
                    coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
            } else {
                var coords1 = cfl._shape.split(" ");
                for (var c = 0; c < coords1.length; c += 2)
                    coords2.pushLatLngAlt(parseFloat(coords1[c]), parseFloat(coords1[c + 1]), null);
            }
            congestionFactorGroup.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 19, strokeColor: color, lineJoin: "round"}}));
        }
    }

    map.addObject(pdeSpeedGroup);
    map.addObject(pdeUrbanLinkGroup);
    pdeUrbanLinkGroup.setVisibility(false);
    map.addObject(pdeFCLinkGroup);
    pdeFCLinkGroup.setVisibility(false);
    map.addObject(controlledAccessLinkGroup);
    controlledAccessLinkGroup.setVisibility(false);
    map.addObject(congestionFactorGroup);
    congestionFactorGroup.setVisibility(false);

    if (pdeSpeedGroup.getBoundingBox() != null)
        map.getViewModel().setLookAtData({
                    bounds: pdeSpeedGroup.getBoundingBox()
        });

    //after successfully receiving the speed information now call ADAS layer to get the curvature (cornering) info
    callPDEManagerForADASLayer();
}

function getSpeed(mode, weekday, pattern_time, data) { // 1 = from ref speed, 2 = to ref speed
    var weekdayList = mode == 1 ? data.F_WEEKDAY : data.T_WEEKDAY;
    var pattern = weekdayList ? weekdayList.split(',')[weekday] : null;
    return pattern ? trafficPatternHashMap[pattern][pattern_time] : null;
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

var createIcon = function (color, text, height) {
    var div = document.createElement("div");
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="56px" height="' + height + 'px">' +
        '<line x1="28"  y1="' + height + '" x2="28" y2="' + (height - 7) + '" stroke="' + color + '"/>' +
        '<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
        text + '</text>' +
        '</svg>';
    div.innerHTML = svg;
    return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
};

//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgb.length === 4) ? "#" +
    ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
}

//function to remove newly added elements in the existing ul
function deleteDynamicallyAddedLiElements(){
    var lagendList = document.getElementById("legendList")
    var lagendListChildren = lagendList.children;
    var childrenLength = lagendListChildren.length;	
    if (childrenLength === 4){ //no need to remove anything
        return;
    }else{
         for(var x = 0; x < childrenLength; x++){
            if (lagendListChildren[x] != undefined){
                if(lagendListChildren[x].id !== "inputTracePoints" && lagendListChildren[x].id !== "matchedPoints" && lagendListChildren[x].id !== "speedOk" && lagendListChildren[x].id !== "speeding"){
                    var elem = document.getElementById(lagendListChildren[x].id);
                    elem.parentNode.removeChild(elem);
                    elem=null;
                    x--; //because removing an element makes the array to readjust itself
                }
            }	
        }
    }
}

function removeInfoBubbles(){
    var previousBubbles = ui.getBubbles();
    previousBubbles.forEach(function(b) {
        ui.removeBubble(b);
    });
}

//function to call PDE for ADAS layer
function callPDEManagerForADASLayer(){
    layers = new Object();
    layers["ADAS_ATTRIB_FC"] = {callback: gotAdasTile};

    pdeManager.setLayers(layers);
    pdeManager.setOnTileLoadingFinished(pdeManagerAdasFinished);
    pdeManager.start();
}


// callback that is set to PDE manager and that gets called with the adas tile information
// that get requested
function gotAdasTile(resp)
{
    if (resp.error != undefined)
    {
        alert("Got PDE error response while getting Cornering information. "+resp.error);
        return;
    }

    if (resp.responseCode != undefined)
    {
        alert (resp.message);
        return;
    }

    //we want to show the curvature warning if the actual driving speed was greater than the speed at which the vehicle should should 
    //be driven otherwise the car will be thrown out of the curve. This driving speed is taken from the given trace points. 

    for (var r = 0; r < resp.Rows.length; r++)
    {
        var linkId = resp.Rows[r].LINK_ID;

        if(pdeManager.getLinkPartOfRoute(linkId)) // this will check the linkid with both positive and negative values
        {

            var curvature = resp.Rows[r].CURVATURES;
            var headings = resp.Rows[r].HEADINGS;
            var hpx = resp.Rows[r].HPX;
            var hpy = resp.Rows[r].HPY;
            var refLinkCurvHeads = resp.Rows[r].REFNODE_LINKCURVHEADS;
            var nrefLinkCurvHeads = resp.Rows[r].NREFNODE_LINKCURVHEADS;

            var curvatureSplit = curvature.split(',');
            var headingsSplit = headings.split(',');
            var hpxSplit = hpx.split(',');
            var hpySplit = hpy.split(',');
            var refLinkCurvHeadsSplit = refLinkCurvHeads.split(',');
            var nrefLinkCurvHeadsSplit = nrefLinkCurvHeads.split(',');

            if(curvatureSplit.length == 1 && curvatureSplit[0] == '')
            {
                curvatureSplit = [];
            }
            if(headingsSplit.length == 1 && headingsSplit[0] == '')
            {
                headingsSplit = [];
            }

            // result arrays for curvature and heading
            var resultCurvature = [];
            var resultHeading = [];
            var resultHpx = [];
            var resultHpy = [];

            //0. find out if link is driven from or to reference node
            var bLinkIsDrivenFromReferenceNode = pdeManager.getLinkIsDrivenFromReferenceNodeOnRoute(linkId);

            //1. handle reference node
            var previousLinkId = pdeManager.getPreviousIdLinkOnRoute(linkId, true);

            var bNodePointAdded = false;
            if(previousLinkId != null)
            {
                for(var k = 0; k < refLinkCurvHeadsSplit.length; k++)
                {
                    var splitData = refLinkCurvHeadsSplit[k].split(':');
                    if(splitData[0] == (Math.abs(previousLinkId) - Math.abs(linkId)))
                    {
                        resultCurvature.push(parseInt(splitData[1]));
                        resultHeading.push(parseInt(splitData[2] / 1000));
                        bNodePointAdded = true;
                        break;
                    }
                }
            }

            if(!bNodePointAdded)
            {
                resultCurvature.push(0);
                resultHeading.push(0);
            }

            // 2. handle shape curvatures, heading, coordinates
            var lastCoordValueCurvature = 0;
            for(var k = 0; k < curvatureSplit.length; k++)
            {
                lastCoordValueCurvature += parseInt(curvatureSplit[k]);
                resultCurvature.push(lastCoordValueCurvature);
            }

            var lastCoordValueHeading = 0;
            for(var k = 0; k < headingsSplit.length; k++)
            {
                lastCoordValueHeading += parseInt(headingsSplit[k]);
                resultHeading.push(parseInt(lastCoordValueHeading / 1000));
            }

            var lastCoordValueHpx = 0;
            for(var k = 0; k < hpxSplit.length; k++)
            {
                lastCoordValueHpx += parseInt(hpxSplit[k]);
                resultHpx.push(lastCoordValueHpx);
            }

            var lastCoordValueHpy = 0;
            for(var k = 0; k < hpySplit.length; k++)
            {
                lastCoordValueHpy += parseInt(hpySplit[k]);
                resultHpy.push(lastCoordValueHpy);
            }

            // 3. handle nonreference node
            var nextLinkId = pdeManager.getNextLinkIdOnRoute(linkId, true);

            bNodePointAdded = false;
            if(nextLinkId != null)
            {
                for(var k = 0; k < nrefLinkCurvHeadsSplit.length; k++)
                {
                    var splitData = nrefLinkCurvHeadsSplit[k].split(':');
                    if(splitData[0] == (Math.abs(nextLinkId) - Math.abs(linkId)))
                    {
                        resultCurvature.push(parseInt(splitData[1]));
                        resultHeading.push(parseInt(splitData[2]) / 1000);
                        bNodePointAdded = true;
                        break;
                    }
                }
            }

            if(!bNodePointAdded)
            {
                resultCurvature.push(0);
                resultHeading.push(0);
            }

            //linkid can be either negative or positive
            var absLinkId = Math.abs(linkId);
            // at this point we have all curvature and heading data to the link - so we save it
            routeLinkHashMap[absLinkId]._HPX = resultHpx;
            routeLinkHashMap[absLinkId]._HPY = resultHpy;
            routeLinkHashMap[absLinkId]._CURVATURE = resultCurvature;
            routeLinkHashMap[absLinkId]._HEADING = resultHeading;
            routeLinkHashMap[absLinkId]._LINK_DRIVEN_FROM_REV = bLinkIsDrivenFromReferenceNode;
        }
    }
}



function pdeManagerAdasFinished(evt)
{
    generateCurvatureWarningForTracePoints();
    map.addObject(curvatureWarningGroup);
    curvatureWarningGroup.setVisibility(false);
}

/**
This method generates the curvature warning for the provided trace points
*/

function generateCurvatureWarningForTracePoints()
{
    // create curvature warnings
    for(var i = 0; i < tracePoints.length; i++)
    {
        var tp = tracePoints [i];

        var matchedLinkId = tp.linkIdMatched;
        if (matchedLinkId == undefined) matchedLinkId = tp.linkId;
        var linkObject = routeLinkHashMap[Math.abs(matchedLinkId)];

        if (!linkObject) continue;

        linkObject._TRACE_POINT_SPEED_MPS = tp.speedMps;
        if (tp.latMatched == undefined) {
            linkObject._TRACE_POINT_MATCHED_LAT = tp.mappedPosition.latitude;
            linkObject._TRACE_POINT_MATCHED_LON = tp.mappedPosition.longitude;			
        } else {
            linkObject._TRACE_POINT_MATCHED_LAT = tp.latMatched;
            linkObject._TRACE_POINT_MATCHED_LON = tp.lonMatched;
        }

        // check if ADAS data is available for the link
        if(linkObject._HPX != null)	{
            var shapePointsLength = linkObject._HPX.length;
            var shortesShapePointIndex = -1;
            var shortestDistanceBetweenTwoWayPoints = 0;
            for(var k = 0; k < shapePointsLength; k++){
                var x = linkObject._HPX[k] / 10000000.0;
                var y = linkObject._HPY[k] / 10000000.0;
                var distance = calculateDistance (x,y,linkObject._TRACE_POINT_MATCHED_LON,linkObject._TRACE_POINT_MATCHED_LAT);
                if (k === 0){
                    shortestDistanceBetweenTwoWayPoints = distance;
                    shortesShapePointIndex = k;
                }
                else {
                    if (distance < shortestDistanceBetweenTwoWayPoints){
                        shortestDistanceBetweenTwoWayPoints = distance;
                        shortesShapePointIndex = k;
                    }
                }
            }
        
            if (shortesShapePointIndex > 0 && shortesShapePointIndex < shapePointsLength){
                //console.log('Shortest Shape point Index= '+shortesShapePointIndex+",x="+linkObject._HPX[shortesShapePointIndex]/ADASNTU_TO_WGS84+",y="+linkObject._HPY[shortesShapePointIndex]/ADASNTU_TO_WGS84);
                var curvature = linkObject._CURVATURE[shortesShapePointIndex];
                var slope = null; // not yet implemented
                //need to draw the warning on the nearest matched shape point
                linkObject._SHORTEST_POINT_LAT = linkObject._HPY[shortesShapePointIndex];
                linkObject._SHORTEST_POINT_LON = linkObject._HPX[shortesShapePointIndex];
                createCornerSpeedLimitWarning(linkObject._HPX[shortesShapePointIndex], linkObject._HPY[shortesShapePointIndex], curvature, slope, linkObject, linkObject._LINK_DRIVEN_FROM_REV);
            }	
        }
    }

    //show curvature legend
    if(bCurvatureSpeedlimitCreated){
        var legendList = document.getElementById("legendList");
        var li = document.createElement("li");
        li.id = "cornering";
          li.appendChild(document.createTextNode("Curvature (Actual Speed / Maximum Possible Speed) [km/h]"));
          li.style.color = "#FA8072";
          legendList.appendChild(li);
          bCurvatureSpeedlimitCreated = false;
    }
}

/**
    This method calculates the distance between two points
 */
function  calculateDistance(lon1,lat1,lon2,lat2){

    var dGridSizeXReduction = Math.abs(Math.cos(lat1 * Math.PI / 180.0 ));
    var dRed2 = dGridSizeXReduction * dGridSizeXReduction;
    var dMinDist2 = (lon1 - lon2) * (lon1 - lon2) * dRed2 + (lat1 - lat2) * (lat1 - lat2);	
    return Math.sqrt(dMinDist2);
}

/**
This method generates the speedlimits
*/
function createCornerSpeedLimitWarning(x, y, curvature, slope, link, bLinkIsDrivenFromReferenceNode)
{
    var lat = link._SHORTEST_POINT_LAT / ADASNTU_TO_WGS84;
    var lon = link._SHORTEST_POINT_LON / ADASNTU_TO_WGS84;

    var actualDrivingSpeed = link._TRACE_POINT_SPEED_MPS;

    // ignore ramps speed limit or null values (speed limit not known)
    if(actualDrivingSpeed == 999 || actualDrivingSpeed == null)
    {
        return;
    }

    // convert the actual speed to kph
    actualDrivingSpeed = Math.round(actualDrivingSpeed * 3.6);
    
    var maxPossibleSpeed = generateMaximalPossibleSpeed(curvature, slope);
    var maxPossibleSpeedSelected = maxPossibleSpeed[2]; // use kph value

    if(maxPossibleSpeedSelected != 999999 && maxPossibleSpeedSelected !== 0) // only create marker if there is a valid speed
    {
        if(maxPossibleSpeedSelected < actualDrivingSpeed) // and if the generated max speedlimit is lower than the actual driven speed
        {
            //console.log("Maximum speed selected is: "+maxPossibleSpeedSelected);
            var marker = new H.map.Marker(new H.geo.Point(lat, lon), {icon: createIcon(curvatureColor, actualDrivingSpeed + "/" + maxPossibleSpeedSelected, 35)});
            //var marker = new H.map.Marker(new H.geo.Point(lat, lon));
            marker.setData("<div style='color: #FA8072;'>"+curvatureWarningText+actualDrivingSpeed+"" + "/" + maxPossibleSpeedSelected+""+" kmh</div>");
            curvatureWarningGroup.addObject(marker);

            var curvatureWarningBubble =  new H.ui.InfoBubble(marker.getGeometry(), {
                      // read custom data
                      content: marker.getData()
                    });
                        // show info bubble
                    
            if (curvatureWarningBubble){
                ui.addBubble(curvatureWarningBubble);
                curvatureWarningBubble.open();
                bCurvatureSpeedlimitCreated = true;
            }
        }
    }
}

/**
This method calculates out of the curvature the maximal possible speed that a normal car should drive. For Curvature = 0 the returned
speed with also be 999999 - means endless
@return: an array with the 3 max speedlimits [speedMaxMeterPerSecond, speedMaxMilesPerHour, speedMaxKilometerPerHour]
@honor to http://hyperphysics.phy-astr.gsu.edu/hbase/mechanics/carbank.html#c1
*/
//TODO: add slope
function generateMaximalPossibleSpeed(curvature, slope)
{
    var aRet = [];
    if(curvature != 0)
    {
        if(curvature < 0)
        {
            curvature *= -1;
        }
        if(slope == null || slope == 0)
        {
            slope = 1;
        }
        var radius = curvature == 0 ? 0 : (1000000.0 / curvature);
        var staticFriction = 0.5;
        var aSlope = slope * Math.PI / 180;

        /* can be enabled if slope gets passed to this method
        speedMaxMeterPerSecondWithSlope = Math.sqrt(radius*9.8*(Math.sin(aSlope)-(-1)*staticFriction*Math.cos(aSlope))/(Math.cos(aSlope)-staticFriction*Math.sin(aSlope)));
        speedMaxMilesPerHourWithSlope = speedMaxMeterPerSecondWithSlope*2.2369;
        speedMaxKilometerPerHourWithSlope = speedMaxMeterPerSecondWithSlope*3.6;
        */

        var speedMaxMeterPerSecond = Math.sqrt(radius * 9.8 * staticFriction);
        var speedMaxMilesPerHour = speedMaxMeterPerSecond * 2.2369;
        var speedMaxKilometerPerHour = speedMaxMeterPerSecond * 3.6;

        var resultMeterPerSecond = parseInt(((speedMaxMeterPerSecond + 0.5) * 100) / 100);
        var resultMilesPerHour = parseInt(((speedMaxMilesPerHour + 0.5) * 100) / 100);
        var resultKilometerPerHour = parseInt(((speedMaxKilometerPerHour + 0.5) * 100) / 100);

        aRet.push(resultMeterPerSecond);
        aRet.push(resultMilesPerHour);
        aRet.push(resultKilometerPerHour);
    }
    else
    {
        aRet.push(999999);
        aRet.push(999999);
        aRet.push(999999);
    }
    return aRet;
}


function showAdditionalInfo(that){
    var checkedItem = that.id;
    if(checkedItem ==='urban'){
        pdeUrbanLinkGroup.setVisibility(true);
        pdeFCLinkGroup.setVisibility(false);
        controlledAccessLinkGroup.setVisibility(false);
        congestionFactorGroup.setVisibility(false);
    }

    if (checkedItem ==='functionalClass'){
        pdeFCLinkGroup.setVisibility(true);
        pdeUrbanLinkGroup.setVisibility(false);
        controlledAccessLinkGroup.setVisibility(false);
        congestionFactorGroup.setVisibility(false);
    }

    if (checkedItem ==='nothingToShow'){
        pdeUrbanLinkGroup.setVisibility(false);
        pdeFCLinkGroup.setVisibility(false);
        controlledAccessLinkGroup.setVisibility(false);
        congestionFactorGroup.setVisibility(false);
    }	

    if (checkedItem ==='controlledAccess'){
        controlledAccessLinkGroup.setVisibility(true);
        pdeUrbanLinkGroup.setVisibility(false);
        pdeFCLinkGroup.setVisibility(false);
        congestionFactorGroup.setVisibility(false);
    }

    if (checkedItem ==='roadCongestionFactor'){
        congestionFactorGroup.setVisibility(true);
        controlledAccessLinkGroup.setVisibility(false);
        pdeUrbanLinkGroup.setVisibility(false);
        pdeFCLinkGroup.setVisibility(false);
    }
    
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
    //requestTrafficPattern();
    //patternTimeText.innerHTML = "Time: " + new Date().getHours() + ":" + Math.floor(new Date().getMinutes() / 15) * 15;
  }

// load the static layer SC_TRAFFIC_PATTERN
var url = document.getElementById('pdeEndPoint').value + "/1/static.json?content=SC_TRAFFIC_PATTERN&app_id=" + app_id + "&app_code=" + app_code + "&callback=gotStaticContentTrafficPattern";
var script = document.createElement("script");
script.src = url;
document.body.appendChild(script);