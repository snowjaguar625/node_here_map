// (C) dschutte HERE 2016

var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
var mapContainer = document.getElementById('mapContainer');

// check if the site was loaded via secure connection
var secure = (location.protocol === 'https:') ? true : false;

var platform = new H.service.Platform({
    app_code: app_code,
    app_id: app_id,
    useHTTPS: secure
});
var maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);
var map = new H.Map(mapContainer, maptypes.normal.map,
    {
        center: new H.geo.Point(52.11, 0.68),
        zoom: 5
    }
);

var mapBehavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map)),
    ui = H.ui.UI.createDefault(map, maptypes),
    geocoder = platform.getGeocodingService(),
    router = platform.getRoutingService();

var time_output = document.getElementById("time_output"),
    day_selector = document.getElementById("day_selector"),
    time_slider = document.getElementById("time_slider"),
    start = document.getElementById("start"),
    destination = document.getElementById("destination"),
    error = document.getElementById("error"),
    startCoord = start.value,
    destCoord = destination.value,
    objContainer = new H.map.Group(),
    bLongClickUseForStartPoint = true,
    weekday = 0,
    pattern_time = 0,
    td = new Date(),
    date = new Date(td.getFullYear(),td.getMonth(),td.getDate()+(0-td.getDay() + 7)),
    time = "00:00:00";

var trafficTileProvider = new H.map.provider.ImageTileProvider({
    label: "baselayer",
    descr: "",
    min: 1,
    max: 20,
    getURL: function( col, row, level )
    {
        var ptime = date.getFullYear() + "-" + ("0"+(date.getMonth()+1)).slice(-2) + "-"  + ("0" + date.getDate()).slice(-2) + "T" + time + ".0000000"
        return ["https://",
            (1 + ((row + col) % 4)),
            ".traffic.maps.api.here.com/maptile/2.1/traffictile/newest/normal.day/",
            level,
            "/",
            col,
            "/",
            row,
            "/256/png8",
            "?app_code=",
            app_code,
            "&app_id=",
            app_id,
            "&time=",
            ptime
            ].join("");
    }
});

// add long click in map event listener
map.addEventListener('longpress', handleLongClickInMap);
window.addEventListener('resize', function() { map.getViewPort().resize(); });

// Route, Start and Destination Container
map.addObject(objContainer);

/********************************************************
Start/Destination selectin via LongClick in map
********************************************************/
function handleLongClickInMap(currentEvent)
{
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
    if(!bLongClickUseForStartPoint)
    {
        document.getElementById("destination").value = lastClickedPos.lat + "," + lastClickedPos.lng;
        destCoord = lastClickedPos.lat + "," + lastClickedPos.lng;
    }
    else
    {
        document.getElementById("start").value = lastClickedPos.lat + "," + lastClickedPos.lng;
        startCoord = lastClickedPos.lat + "," + lastClickedPos.lng;
    }
    bLongClickUseForStartPoint = bLongClickUseForStartPoint ? false : true;
    calculateRouteFromAtoB(startCoord, destCoord);
}


/*
Start calculation
*/
var baseLayer = new H.map.layer.TileLayer(trafficTileProvider);
map.setBaseLayer(baseLayer);

calculate();


function calculate() {
    // remove old route if recalculated
    objContainer.removeAll();

    // geocode address if necessary
    if (!isCoordinate(start.value)) {
        geocoder.geocode(
            {
                searchText: start.value,
                jsonattributes : 1
            },
            onStartGeocodeSuccess,
            onError
        );
    } else {
        onDestinationGeocode();
    }
}

function onStartGeocodeSuccess(result) {
    var pos = result.response.view[0].result[0].location.displayPosition;
    startCoord = pos.latitude + "," + pos.longitude;

    onDestinationGeocode();
}

function onDestinationGeocode() {
    // geocode address if necessary
    if (!isCoordinate(destination.value)) {
        geocoder.geocode(
            {
                searchText: destination.value,
                jsonattributes : 1
            },
            onDestinationGeocodeSuccess,
            onError
        );
    } else {
        calculateRouteFromAtoB(startCoord, destCoord);
    }
}

function onDestinationGeocodeSuccess(result) {
    var pos = result.response.view[0].result[0].location.displayPosition;
    destCoord = pos.latitude + "," + pos.longitude;
    
    calculateRouteFromAtoB(startCoord, destCoord);
}

function calculateRouteFromAtoB(waypoint0, waypoint1) {

    var startMarker = new H.map.Marker(new H.geo.Point(waypoint0.split(",")[0], waypoint0.split(",")[1]),
    {
        icon: createIcon(waypoint0, "Start")
    });
    objContainer.addObject(startMarker);
    

    var destMarker = new H.map.Marker(new H.geo.Point(waypoint1.split(",")[0], waypoint1.split(",")[1]),
    {
        icon: createIcon(waypoint1, "Destination")
    });
    objContainer.addObject(destMarker);

    month = (date.getMonth() + 1);
    if(month < 10)
        month = "0" + month;

    cday = date.getDate();
    if(cday < 10)
        cday = "0" + cday;

    departure = date.getFullYear() + "-" + month + "-" + cday + "T" + time;

    var routeRequestParams = {
        mode: 'fastest;car;traffic:enabled',
        representation: 'display',
        routeattributes : 'waypoints,summary,shape,legs',
        waypoint0: waypoint0,
        waypoint1: waypoint1,
        departure: departure
    };

    router.calculateRoute(
        routeRequestParams,
        onRoutingSuccess,
        onError
    );
}

function onRoutingSuccess(result) {
    route = result.response.route[0];
    basetime = route.summary.baseTime;
    traffictime = route.summary.trafficTime;

    document.getElementById("baseTime").innerHTML = "Base Time: " + gettime(basetime);
    document.getElementById("trafficTime").innerHTML = "Traffic Time: " + gettime(traffictime);

    addRouteShapeToMap(route);
}

function onError(e) {
    console.log(e);
}

gettime = function(time)
{
    h = Math.floor(time / 3600);
    (h < 10) ? h = "0" + h : h;
    m = Math.floor((time % 3600) / 60);
    (m < 10) ? m = "0" + m : m;
    s = time % 60;
    (s < 10) ? s = "0" + s : s;

    return h + ":" + m + ":" + s;
};

function addRouteShapeToMap(route){
    var strip = new H.geo.Strip(),
    routeShape = route.shape;

    routeShape.forEach(function(point) {
        var parts = point.split(',');
        strip.pushLatLngAlt(parts[0], parts[1]);
    });

    mapRoute = new H.map.Polyline(strip, {
        style: {
            lineWidth: 4,
            strokeColor: 'rgba(0, 128, 255, 0.7)'
        }
    });
    // Add the polyline to the map and zoom into the route
    objContainer.addObject(mapRoute);
    map.setViewBounds(objContainer.getBounds(), true);
}

function isCoordinate(value) {
    return (value.replace(/ /g,'').match(/-?\d+\.\d+,-?\d+\.\d/g)) ? true : false;
}

function updateRoute(event)
{
    if (event.keyCode == 13) {
        startCoord = start.value;
        destCoord = destination.value;

        calculate();
    }
}

function updateTrafficTiles()
{
    var i = day_selector.options[day_selector.selectedIndex].value;
    weekday = parseInt(i) * 24 * 60 * 60;

    t = (Math.ceil(time_slider.value / 240 * 96) / 4);
    hour = Math.floor(t);
    h = t.toFixed(2);
    minutes = (h % 1) * 60;

    pattern_time = (hour * 60 * 60) + (minutes * 60) + weekday;

    // add leading zero to minutes string
    if(hour < 10)
        hour = "0" + hour;

    // format minutes from 0 to 00
    if(minutes === 0)
        minutes = "00";

    time = hour + ":" + minutes + ":00";

    time_output.innerHTML = "Time of Day: " + hour + ":" + minutes;

    td = new Date();
    date = new Date(td.getFullYear(),td.getMonth(),td.getDate()+(parseInt(day_selector.selectedIndex)-td.getDay() + 7));

    trafficTileProvider.reload(true);
    calculate();
};

var createIcon = function (line1, line2) {
    var div = document.createElement("div");

    var div = document.createElement("div");
    var svgMarker = "";

    if(line1 != "" && line2 != "")
    {
        svgMarker = svgMarkerImage_Line;
        svgMarker = svgMarker.replace(/__line1__/g, line1);
        svgMarker = svgMarker.replace(/__line2__/g, line2);
        svgMarker = svgMarker.replace(/__width__/g, line1.length  * 4 + 57);
        svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 4 + 120);
    }
    else
    {
        svgMarker = svgMarkerBase64Image.replace(/__widthAll__/g, "60");
    }
    div.innerHTML = svgMarker;

    return new H.map.Icon(svgMarker, {
        anchor: new H.math.Point(24, 57)
    });
};