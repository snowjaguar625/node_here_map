//author wobecker

function changeFeatureStyle(map){
    // get the vector provider from the vector layer
    var provider = map.getLayers().get(1).getProvider(); //get provider from vector layer

    // get the style object for the vector layer
        var vStyle = provider.getStyle();

        var changeListener = (evt) => {
            if (vStyle.getState() === H.map.Style.State.READY) {
                vStyle.removeEventListener('change', changeListener);

            // query the sub-section of the style configuration
            // the call removes the subsection from the original configuration
                var vConfig = vStyle.extractConfig([
                        'earth',
                        //'landuse'
                        'landuse.wood',
                        'landuse.forest',
                        'landuse.park',
                        'landuse.builtup',
                        'landuse.national_park',
                        'landuse.nature_reserve',
                        'landuse.green-areas',
                        'landuse.other',
                        'water.small_water',
                        'water.deep_water',
                        'water.river'
                        ]);
                }
        };

        vStyle.addEventListener('change', changeListener);
}



// check if the site was loaded via secure connection
var secure = (location.protocol === 'https:') ? true : false;

var mapContainer = document.getElementById("mapContainer"),
markerContainer = new H.map.Group(), // for the height points
pointContainer = new H.map.Group(), // for the tile rectangles
showHeightValues = true,
minHeight = Number.MAX_VALUE,
maxHeight = Number.MIN_VALUE,
iconMap = {},

// Initialize our map
platform = new H.service.Platform({
    apikey: api_key,
    useHTTPS: secure
}),
maptypes = platform.createDefaultLayers(),

map = new H.Map(mapContainer, maptypes.raster.terrain.xbase, {
        center: new H.geo.Point(49.97200, 7.87444),
        zoom: 15,
        pixelRatio: window.devicePixelRatio || 1
    }),

// Enable the map event system
mapevents = new H.mapevents.MapEvents(map),

// Enable map interaction (pan, zoom, pinch-to-zoom)
behavior = new H.mapevents.Behavior(mapevents),

// Enable the default UI
ui = H.ui.UI.createDefault(map, maptypes),

heightValuesOnOff = function()
{
    showHeightValues = document.getElementById("showHeightValues").checked;
    if(showHeightValues)
    {
        map.removeObject(pointContainer);
        map.addObject(markerContainer);
    }
    else
    {
        map.removeObject(markerContainer);
        map.addObject(pointContainer);
    }
},

loadDtmTiles = function()
{
    markerContainer.removeAll();
    pointContainer.removeAll();
    var layers = new Object();
    layers["DTM_HEIGHT"] = {callback: gotPdeResponse, isFCLayer: false, level: 11};

    var pdeManager = new PDEManager(app_id, app_code, layers),
    bounds = map.getViewModel().getLookAtData().bounds.getBoundingBox(),
    layers = new Object();

    pdeManager.setBoundingBox(bounds);
    pdeManager.setOnTileLoadingFinished(function()
    {
        if(showHeightValues)
        map.addObject(markerContainer);
        else
        map.addObject(pointContainer);
    });

    pdeManager.start();

};

//add JS API Release information
releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

//add MRS Release information
loadMRSVersionTxt();

map.addLayer(maptypes.vector.normal.map);//add vector layer on the top
changeFeatureStyle(map);


// Got PDE tile
function gotPdeResponse(respJsonObj)
{
    if (respJsonObj.error != undefined){
        alert(respJsonObj.error);
        return;
    }
    if (respJsonObj.message != undefined){
        alert(respJsonObj.message);
        return;
    }
    var heightValues = ""; // concatenate the response
    for (var r = 0; r < respJsonObj.Rows.length; r++)
    {
        heightValues += respJsonObj.Rows[r].HEIGHT_VALUES;
    }

    // Parse the response
    var i1 = heightValues.indexOf(","),
    latMin = parseFloat(heightValues.substring(0, i1)),
    i2 = heightValues.indexOf(",", i1 + 1),
    lonMin = parseFloat(heightValues.substring(i1 + 1, i2)),
    i3  = heightValues.indexOf(",", i2 + 1);

    if (i3  < 0) i3  = Number.MAX_VALUE;

    var i3n = heightValues.indexOf(";", i2 + 1);
    if (i3n < 0) i3n = Number.MAX_VALUE;

    var nextPositive = i3 < i3n;
    i3 = Math.min(i3, i3n);

    var numPointsHorizontal = parseInt(heightValues.substring(i2 + 1, i3)),
    heightMatrix = new Array(),
    previousValue = 0,
    repeatPreviousValue = 0,
    positive = nextPositive;

    while (true)
    {
        var row = new Array(numPointsHorizontal),
        x = 0;
        for (; x < numPointsHorizontal; x++)
        {
            positive = nextPositive;
            if (repeatPreviousValue > 0)
            {
                row[x] = previousValue;
                repeatPreviousValue--;
            }
            else
            {
                var i4  = heightValues.indexOf(",", i3 + 1); if (i4   < 0) i4  = Number.MAX_VALUE;
                var i4n = heightValues.indexOf(";", i3 + 1); if (i4n  < 0) i4n = Number.MAX_VALUE;

                nextPositive = i4 < i4n;
                i4 = Math.min(i4, i4n);

                if (i4 == Number.MAX_VALUE) {
                    i4 = heightValues.length; // last value in string
                }

                var heightStr = heightValues.substring(i3 + 1, i4),
                indexX = heightStr.indexOf("x");

                if (indexX >= 0) {
                    repeatPreviousValue = parseInt(heightStr.substring(indexX + 1)) - 1;
                    heightStr = heightStr.substring(0, indexX);
                }

                row[x] = previousValue + parseInt(heightStr) * (positive ? 1 : -1);
                previousValue = row[x];

                i3 = i4;
                if (row[x] < minHeight)
                minHeight = row[x];
                if (row[x] > maxHeight)
                maxHeight = row[x];
            }
        }

        heightMatrix.push(row);
        if (i3 == heightValues.length)
        break;
    }

    // Create the height points.
    // JSAPI renders faster, if we reuse the same SVG icon objects, rather than creating multiple identical ones.
    for (var y = 0; y < heightMatrix.length; y++)
    {
        var row = heightMatrix[y],
        lat = latMin + y / 1200.0;

        for (var x = 0; x < row.length; x++)
        {
            var lon = lonMin + x / 1200.0,
            h = row[x],
            icon = iconMap[h];

            if 	(icon == undefined)
            {
                // the relativeHeight is not accurate, because the maxHeight, minHeight values change while loading the tiles
                var relativeHeight = Math.round((h - minHeight) * 255/ (maxHeight - minHeight + 1)).toString(16);
                if (relativeHeight.length == 1) relativeHeight = "0" + relativeHeight;
                icon = createIcon(h, "#" + relativeHeight + relativeHeight + relativeHeight, true);
                iconMap[h] = icon;
            }
            markerContainer.addObject(new H.map.Marker(new H.geo.Point(lat, lon), { icon: icon }));

            icon = iconMap['POINT' + h];
            if 	(icon == undefined)
            {
                // the relativeHeight is not accurate, because the maxHeight, minHeight values change while loading the tiles
                var relativeHeight = Math.round((h - minHeight) * 255/ (maxHeight - minHeight + 1)).toString(16);
                if (relativeHeight.length == 1) relativeHeight = "0" + relativeHeight;
                icon = createIcon(h, "#" + relativeHeight + relativeHeight + relativeHeight, false);
                iconMap['POINT' + h] = icon;
            }

            pointContainer.addObject(new H.map.Marker(new H.geo.Point(lat, lon), { icon: icon }));
        }
    }
};

var createIcon = function (height, color, withText) {
    var svg = '<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
    '<g>';
    if (withText) {
        var txt = height + "m";
        svg += '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="8" font-weight="plain" y="8" x="0" stroke-width="0" fill="#000000">' + txt + "</text>";
        } else {
        svg += '<rect id="h" stroke="' + color + '" height="3" width="3" y="-1" x="-1" fill="' + color + '"/>';
    }
    svg +=    '</g>'+
    '</svg>';
    return new H.map.Icon(svg, { anchor: { x: 0, y: 0 } });
};