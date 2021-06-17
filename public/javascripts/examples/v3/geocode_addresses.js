function geocode(line, numberOfLines, arrayPos) {
    if (line == "") { return; }
    document.getElementById("counter").innerHTML = ["Geocoded ", arrayPos + 1, " of ", numberOfLines].join("");
    url = ["https://geocoder.api.here.com/6.2/geocode.json?gen=8&jsonattributes=1&language=en-GB&maxresults=1",
        "&searchtext=",
        line,
        "&strictlanguagemode=false",
        "&app_id=",
        app_id,
        "&app_code=",
        app_code,
        "&jsoncallback=",
        jsonp(searchResponse, arrayPos)].join("");
        script = document.createElement("script");
        script.src = url;
        document.body.appendChild(script);
}

var searchResponse = function(data, arrayPos) {
    var lines = document.geocodeForm.addresses.value.split('\n');
    if(data.response!=null && data.response.view!=null){
    lines[arrayPos] += document.geocodeForm.delimiter.value + data.response.view[0].result[0].location.navigationPosition[0].latitude + document.geocodeForm.delimiter.value +
        data.response.view[0].result[0].location.navigationPosition[0].longitude + document.geocodeForm.delimiter.value + data.response.view[0].result[0].relevance +
        document.geocodeForm.delimiter.value + data.response.view[0].result[0].matchLevel;
        document.geocodeForm.addresses.value = lines.join("\n");
    }
};

function go() {
    var lines = document.geocodeForm.addresses.value.split('\n');
    for(var i = 0;i < lines.length;i++){
        geocode(lines[i], lines.length, i);
    }
}

//using this wrapper function we can send back an additional argument with the callback.
function jsonp(real_callback, arg) {
    var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
    window[callback_name] = function(response) {
        real_callback(response, arg);
        delete window[callback_name];  // Clean up after ourselves.
    };
    return callback_name;
}

function zoomTo() {
    var pos = getCaret(document.geocodeForm.addresses),
    before = document.geocodeForm.addresses.value.substr(0, pos);
    var line_no = before.split(/\r?\n/).length;
    //get line contents
    var lines = document.geocodeForm.addresses.value.split('\n');
    var line = lines[line_no - 1];
    //check to see if document contains delimiter.  If it does the
    //lat long will be in the 3rd to last and 2nd to last fields
    if (line.indexOf(document.geocodeForm.delimiter.value) > -1) {
        var fields = line.split(document.geocodeForm.delimiter.value);
        /* Create a marker on a specified geo coordinate
        * (in this example we use the map's center as our coordinate)
        */
        var lat = fields[fields.length - 4];
        var lon = fields[fields.length - 3];
        
        //draw marker
        var createSvgMarkerIconWithImg = function () {
            var svg =svgMarkerImageTransit;

            return new H.map.Icon(svg, {
                anchor: new H.math.Point(24, 57)
            });
        };

        coord = new H.geo.Point(parseFloat(lat), parseFloat(lon));
        marker = new H.map.Marker(
            coord,
            {
                icon: createSvgMarkerIconWithImg()
            }
        );
        map.addObject(marker);
        map.setCenter(coord);
        map.setZoom(15);
        
    }
}

function getCaret(node) {
    if (node.selectionStart) {
        return node.selectionStart;
    } else if (!document.selection) {
        return 0;
    }

    var c = "\001",
    sel = document.selection.createRange(),
    dul = sel.duplicate(),
    len = 0;

    dul.moveToElementText(node);
    sel.text = c;
    len = dul.text.indexOf(c);
    sel.moveStart('character',-1);
    sel.text = "";

    return len;
}

// Check whether the environment should use hi-res maps
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

var mapContainer = document.getElementById("mapContainer");

// check if the site was loaded via secure connection
var secure = (location.protocol === 'https:') ? true : false,

platform = new H.service.Platform({
    app_code: app_code,
    app_id: app_id,
    useHTTPS: secure
}),
maptileService = platform.getMapTileService({'type': 'base'});
maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

map = new H.Map(mapContainer, maptypes.normal.map,
    {
        center: center,
        zoom: zoom,
        pixelRatio: hidpi ? 2 : 1
    }
);

// Do not draw under control panel
map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

// Enable the map event system
var mapevents = new H.mapevents.MapEvents(map);

// Enable map interaction (pan, zoom, pinch-to-zoom)
var behavior = new H.mapevents.Behavior(mapevents);

// Enable the default UI
var ui = H.ui.UI.createDefault(map, maptypes);

// setup the Streetlevel imagery
platform.configure(H.map.render.panorama.RenderEngine);

window.addEventListener('resize', function() { map.getViewPort().resize(); });