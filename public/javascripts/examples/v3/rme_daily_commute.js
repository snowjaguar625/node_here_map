// author wobecker (C) HERE 2017
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection

var mapContainer = document.getElementById('mapContainer');
var platform = new H.service.Platform({	app_code: app_code,	app_id: app_id,	useHTTPS: secure });
var	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
var	map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(52.11, 0.68), zoom: 5 });
var zoomToResult = true;
var router = platform.getRoutingService();

map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // Do not draw underneath control panel

new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
var ui = H.ui.UI.createDefault(map, maptypes); // add UI

platform.configure(H.map.render.panorama.RenderEngine); // setup the Streetlevel imagery
window.addEventListener('resize', function() { map.getViewPort().resize(); });

var	objContainer = new H.map.Group();
var relevantWayPointsForRouter = [];

var submitTrace = function () {
    objContainer.removeAll();
    document.getElementById("warningstextarea").value = '';
    relevantWayPointsForRouter = [];
    
    // if there is an app_id specified in the URL then use it, otherwise use the default
    var url = document.getElementById('rmeUrl').value + "&attributes=LINK_FCn(REF_NODE_NEIGHBOR_LINKS,NONREF_NODE_NEIGHBOR_LINKS)&file=" + encodeURIComponent(content);
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
            var content = document.getElementById('tracetextarea').value;
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
};
document.getElementById('submittracebutton').onclick = submitTrace;

function clear() {
    document.getElementById('tracetextarea').value = '';
    objContainer.removeAll();
    document.getElementById("warningstextarea").value = '';
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

var gotRouteMatchResponse = function (respJsonObj) {
    if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
        alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
        return;
    }
    // draw the route
    // also extract the route-relevant links (behind intersections) and compute a stable match point per link
    var behindIntersection = false;
    relevantWayPointsForRouter = [];
    var metersToDriveBeforeCreatingAnotherRouteRelevantPoint = 0; // prevent too many waypoints for router
    var routeLinks = respJsonObj.response.route[0].leg[0].link;
    for (var l = 0; l < routeLinks.length; l++) {
        var bestLat = 0, bestLon = 0, maxDist2BetweenShapePoints = 0;
        var coords1 = routeLinks[l].shape;
        var coords2 = new H.geo.Strip();
        for (var c = 0; c < coords1.length; c += 2) coords2.pushLatLngAlt(coords1[c], coords1[c + 1], null);
        objContainer.addObject(new H.map.Polyline(coords2, {zIndex: 3, style: {lineWidth: 4, strokeColor: "rgba(0, 255, 0, 0.7)", lineJoin: "round"}}));
        var inFrontOfIntersection = (routeLinks[l].linkId >= 0)
            ? (routeLinks[l].attributes.LINK_FCN[0].NONREF_NODE_NEIGHBOR_LINKS.split(',').length > 1)
            : (routeLinks[l].attributes.LINK_FCN[0].   REF_NODE_NEIGHBOR_LINKS.split(',').length > 1);
        if ((behindIntersection && metersToDriveBeforeCreatingAnotherRouteRelevantPoint <= 0) || l == 0 || l == routeLinks.length - 1) { // Route relevant. Take the point in the middle of the longest shape point pair distance
            for (var c = 2; c < coords1.length; c += 2) {
                var fromLat = parseFloat(coords1[c - 2]), fromLon = parseFloat(coords1[c - 1]), toLat = parseFloat(coords1[c]), toLon = parseFloat(coords1[c +1]); 
                var dist2 = (toLat - fromLat) * (toLat - fromLat) * 0.4 + (toLon - fromLon) * (toLon - fromLon); // very rough - not projecting into cartesian
                if (maxDist2BetweenShapePoints < dist2) {
                    maxDist2BetweenShapePoints = dist2;
                    bestLat = (toLat + fromLat) / 2.0;
                    bestLon = (toLon + fromLon) / 2.0;
                }
            }
        }
        metersToDriveBeforeCreatingAnotherRouteRelevantPoint -= routeLinks[l].length;
        if (maxDist2BetweenShapePoints > 0) {
            objContainer.addObject(new H.map.Marker(new H.geo.Point(bestLat, bestLon), {icon: createIcon("#FF0000", l)}));
            relevantWayPointsForRouter.push(Math.round(bestLat * 100000.0) / 100000.0 + "," + Math.round(bestLon * 100000.0) / 100000.0);
            metersToDriveBeforeCreatingAnotherRouteRelevantPoint = 50;
        }
        behindIntersection = inFrontOfIntersection;
    }

    // draw the original and the matched trace points
    tracePoints = respJsonObj.response.route[0].waypoint;
    for (var l = 0; l < tracePoints.length; l++) {
        var p = tracePoints[l];
        objContainer.addObject(new H.map.Marker(new H.geo.Point(p.originalPosition.latitude, p.originalPosition.longitude), {icon: createIcon("rgba(0,   0, 0, 0.5)", l)}));
        objContainer.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon("rgba(0, 255, 0, 0.5)", l)}));
    }
    map.addObject(objContainer);
    if (zoomToResult) map.setViewBounds(objContainer.getBounds());
    zoomToResult = true;
    var warningsArea = document.getElementById("warningstextarea");
    if(respJsonObj.response.warnings == undefined || respJsonObj.response.warnings.length === 0) {
        warningsArea.value += 'No Warnings.';
    } else {
        for(var d = 0; d < respJsonObj.response.warnings.length; d++) {
            if(0 !== d) warningsArea.value += '\n';
            warningsArea.value += respJsonObj.response.warnings[d].message;
        }
    }
    var maxPointsPerRouterCall = 100;
    if (relevantWayPointsForRouter.length > maxPointsPerRouterCall) {
        document.getElementById("warningstextarea").value += '\n' + relevantWayPointsForRouter.length + ' route relevant points -> split into multiple HLS Router calls of size ' + maxPointsPerRouterCall;
    }
    for (var chunk = 0; chunk <= relevantWayPointsForRouter.length / maxPointsPerRouterCall; chunk++) {
        var startIdx = chunk * maxPointsPerRouterCall - 1; if (startIdx < 0) startIdx = 0; // connect to last point of previous chunk
        var endIdx = (chunk + 1) * maxPointsPerRouterCall - 1; if (endIdx >= relevantWayPointsForRouter.length) endIdx = relevantWayPointsForRouter.length - 1;
        routeAlongMatchedPoints(startIdx, endIdx);
    }
};

function routeAlongMatchedPoints(fromIdx, toIdx) {
    var calculateRouteParams = {
        'mode': 'fastest;car;traffic:enabled',
        'alternatives': '0',
        'departure': 'now',
        'representation': 'display'
    };
    for (var i = fromIdx; i <= toIdx; i++) {
        calculateRouteParams["waypoint" + (i - fromIdx)] = ((i > fromIdx && i < toIdx) ? 'passThrough!' : '') + relevantWayPointsForRouter[i];
    }
    var onResult = function(result) {
        var strip = new H.geo.Strip(), shape = result.response.route[0].shape, i, l = shape.length;
        for (var i = 0; i < l; i++) {
            strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
        }
        var polyline = new H.map.Polyline(strip, { style: {	lineWidth: 7, strokeColor: "rgba(255, 0, 0, 0.7)" } });
        objContainer.addObject(polyline);
        map.addObject(objContainer);
    },
    onError = function(error) {
        document.getElementById("warningstextarea").value += '\n' + error;
        map.addObject(objContainer);
    }
    router.calculateRoute(calculateRouteParams, onResult, onError);
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
    url += "&callback=" + "getJSONP." + cbnum;
    var script = document.createElement("script");
    getJSONP[cbnum] = function(response) {
        try {
            callback(response);
        } finally {
            delete getJSONP[cbnum];
            script.parentNode.removeChild(script);
        }
    };
    script.src = url;
    script.onerror = function(data)	{
        alert("Could not connect to " + url + ".\nCheck connectivity and trace size.");
    }
    document.body.appendChild(script);
}
getJSONP.counter = 0;