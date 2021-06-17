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

var layerSelected = document.getElementById("pdeLayerSelected").value;
var layerSource = undefined;
var sampleLayerExists = false;
var SAMPLE_LAYER_ID = 'CUSTOM_SPEED_LIMITS';
var CLE_LIST_LAYER_RESOURCE = '/2/layers/list.json';
var CLE_UPLOAD_LAYER_RESOURCE = '/2/layers/upload.json';

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

// if there is an app_id specified in the URL then use it, otherwise use the default
function appendAppIdAppCodeIfNotProvidedInUrl(url){
    var appIdRegEx= /[\?&]app_id=/i;
var appCodeRegEx= /[\?&]app_code=/i;
if( url.search( appIdRegEx ) === -1 && url.search( appCodeRegEx ) === -1 ) {
        if(!url.endsWith( "&" ) ) url= url.concat( "&" );
  url = url.concat( "app_id=" + app_id + "&app_code=" + app_code);                
}
if( ( url.search( appIdRegEx ) >= 0 && url.search( appCodeRegEx ) < 0 ) || ( url.search( appIdRegEx ) < 0 && url.search( appCodeRegEx ) >= 0 ) ) {
  alert('If you provide credentials in the RME URL field, please provide both app_id AND app_code.');                
  return undefined;
}
    return url;
}

var submitTrace = function () {
    objContainer.removeAll();
    document.getElementById("warningstextarea").value = '';
    document.getElementById("warningstextarea").style.color = "black";
    // if there is an app_id specified in the URL then use it, otherwise use the default
    var url = document.getElementById('rmeUrl').value;
    
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

document.getElementById('geocodedWithHeadingCheckbox').checked = false;
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
document.getElementById('geocodedWithHeadingCheckbox').checked = false;
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
var geocoder = platform.getGeocodingService();

geocoder.reverseGeocode(
    params,
    onSuccess,
    function (){
      console.log('cannot geocode');
    }
);
}

var processRouteMatchResponse = function (respJsonObj) {
document.getElementById('geocodedWithHeadingCheckbox').checked = false;
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
                var coords2 = new H.geo.Strip();
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

    for (var l = 0; l < tracePoints.length; l++) {
      reverseGeocode({
        gen: '9',
        pos: tracePoints[l].originalPosition.latitude + ',' + tracePoints[l].originalPosition.longitude,
        mode: 'trackPosition'
      }, function (l) {
        return function (data) {
          var p = data.Response.View[0].Result[0].Location.DisplayPosition;
          geocodedWithoutHeadingGroup.addObject(new H.map.Marker(new H.geo.Point(p.Latitude, p.Longitude), {icon: createIcon("blue", l)}));

        }
      }(l));
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
    if (zoomToResult) map.setViewBounds(objContainer.getBounds());
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

var createIcon = function (color, text) {
    var div = document.createElement("div");
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="16px">' +
        '<line x1="14"  y1="16" x2="14" y2="9" stroke="' + color + '"/>' +
        '<text font-size="10" x="14" y="8" text-anchor="middle" fill="' + color + '">' + text + '</text>' +
        '</svg>';
    div.innerHTML = svg;
    return new H.map.Icon(svg, {anchor: {x : 14, y : 16}});
};