$(document).on('change', '.btn-file :file', function() {
    var input = $(this), numFiles = input.get(0).files ? input.get(0).files.length : 1, label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
});

$(document).ready(function() {
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {

        var input = $(this).parents('.input-group').find(':text'), log = numFiles > 1 ? numFiles + ' files selected' : label;

        if (input.length) {
            input.val(log);
            } else {
            if (log)
            alert(log);
        }

    });
});

// KML import
var reader = null;
var group = new H.map.Group();

function processKml() {

    //parse the KML file
    kmlReader.parse();

    // Clear previous objects.
    if ($('#clear-checkbox').is(':checked')) {

        group.removeObjects(group.getObjects());
    }


}

function makeDraggable(object) {

    object.draggable = true;

    object.addEventListener('drag', function (evt) {

        var newCoord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY));

        if (newCoord.lat != startCoord.lat || newCoord.lng != startCoord.lng) {

            if (object.getGeometry() != null && object.getGeometry()  instanceof H.geo.LineString) {

                var strip = object.getGeometry();
                var newStrip = new H.geo.LineString();

                strip.eachLatLngAlt(function (lat, lng, alt, idx) {

                    var diffLat = (lat - startCoord.lat);
                    var diffLng = (lng - startCoord.lng);

                    newStrip.pushLatLngAlt(
                        newCoord.lat + diffLat,
                        newCoord.lng + diffLng,
                    0);
                });

                object.setGeometry(newStrip);
            }
            else {
                object.setGeometry(newCoord);
            }

            if (!map.screenToLookAtData().bounds.getBoundingBox().containsPoint(newCoord)) {
                map.setCenter(newCoord, true);
            }

            startCoord = newCoord;
        }

    });

    object.addEventListener('dragstart', function (evt) {

        document.body.style.cursor = "pointer";
        startCoord = map.screenToGeo((evt.pointers[0].viewportX), (evt.pointers[0].viewportY));
        behavior.disable();
    });

    object.addEventListener('dragend', function (evt) {

        document.body.style.cursor = "auto";
        behavior.enable();
    });
}

function findDraggableObjects(object) {

    var hasObjects = (object.getObjects != null && typeof object.getObjects() !== "undefined" && object.getObjects().length >= 1);

    if (hasObjects) {
        object.getObjects().forEach(function (innerObject) {
            findDraggableObjects(innerObject);
        });
    } else {
        group.addObject(object);
        makeDraggable(object);
    }
}


    var kmlReader = new H.data.kml.Reader();

    kmlReader.addEventListener('statechange', function (evt) {

        if (evt.state == H.data.AbstractReader.State.READY) {

            var parsedObjects = kmlReader.getParsedObjects();

            parsedObjects.forEach(function (parsedObject) {

                findDraggableObjects(parsedObject);
            });

            map.addObject(group);
            map.getViewModel().setLookAtData({bounds: group.getBoundingBox()}, false);
            Spinner.hideSpinner();

            var infobubble = null;
            var lastBubble = null;

            group.addEventListener('tap', function(ev) {

                var marker = ev.target;
                var content;
                if (marker.getData().hasOwnProperty("description")) {
                    content = '<div id = "name" >' + marker.getData()["name"] + '</div>' + '<div id="description">' + marker.getData()["description"] + '</div>';
                } else {
                    content = '<div id = "name" >' + marker.getData()["name"] + '</div>';
                }

                if (marker instanceof H.map.Marker) {
                    infobubble = new H.ui.InfoBubble(marker.getGeometry(), {
                        content: content
                    });
                } else if (marker instanceof H.map.Polyline) {
                    var strip = marker.getGeometry();
                    var middleIndex = Math.floor(strip.getPointCount()/2);
                    var middlePoint = strip.extractPoint(middleIndex, middlePoint);
                    infobubble = new H.ui.InfoBubble(middlePoint, {
                        content: content
                    });
                } else if (marker instanceof H.map.Polygon) {
                    var startingPoint = marker.getGeometry().getExterior().extractPoint(0);
                    infobubble = new H.ui.InfoBubble(startingPoint, {
                        content: content
                    });
                }
                if (lastBubble != null) {
                    ui.removeBubble(lastBubble);
                }
                lastBubble = infobubble;
                ui.addBubble(infobubble);
                
                

                setTimeout(function() {

                    var border = 50;
                    var objRect = lastBubble.getContentElement().parentElement.getBoundingClientRect();
                    var objStyleRight = Math.abs(parseInt(lastBubble.getContentElement().parentElement.style.right));
                    objStyleRight = objStyleRight ? objStyleRight : 0;

                    var mapRect = map.getElement().getBoundingClientRect();
                    var shiftX = 0;
                    var shiftY = 0;

                    // check, if infobubble isn't too far to up
                    if ((objRect.top-border)  < mapRect.top)  {
                        shiftY = (mapRect.top - (objRect.top-border));
                    }

                    // check, if infobubble isn't too far down
                    if ((objRect.bottom+border) > mapRect.bottom) {
                        shiftY = (mapRect.bottom - (objRect.bottom+border));
                    }

                    // check, if infobubble isn't too far to the left
                    var objLeft = (objRect.left - objStyleRight);
                    if ((objLeft-border) < mapRect.left) {
                        shiftX = (mapRect.left - (objLeft-border));
                    } // check, if infobubble isn't too far to the right
                    else if ((objRect.right+border) > mapRect.right) {
                        shiftX = -(objRect.right - (mapRect.right-border));
                    }

                    if ((shiftX == 0) && (shiftY == 0)) {
                        return;
                    }

                    var currScreenCenter = map.geoToScreen(map.getCenter());
                    var newY = (currScreenCenter.y - shiftY);
                    var newX = (currScreenCenter.x - shiftX);

                    var newGeoCenter = map.screenToGeo(newX, newY);
                    map.setCenter(newGeoCenter, true);

                }, 20);
            });
        }
    });

var onKmlFileLoad = function (e) {

    var bubbleArray = ui.getBubbles();
    for (var i = 0; i < bubbleArray.length; i++) {
        bubbleArray[i].close();
    }

    e.preventDefault();
    var input = $('.btn-file :file')[0];

    


    if (input.files.length === 0) {

        // Use default server-hosted example.
        kmlReader.setUrl('/sample_data/draggable_kml_loaded_shapes.kml');
        processKml();

    } else {
        // Use the HTML5 FileReader API and read input file as text.
        var reader = new FileReader();

        reader.onload = function (e) {
            kmlReader.setUrl(reader.result);
            processKml();
        };

        reader.readAsDataURL(input.files[0]);
        
    }
};

// Map initalization
$('#btn-load').on('click', onKmlFileLoad);

var mapContainer = document.getElementById('mapContainer');

var platform = new H.service.Platform({
    apikey: api_key
}),
maptypes = platform.createDefaultLayers();
map = new H.Map(mapContainer, maptypes.vector.normal.map,
    {
        center: center,
        zoom: zoom
    }
);


// add behavior control
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Enable the default UI
var ui = H.ui.UI.createDefault(map, maptypes);

window.addEventListener('resize', function () { map.getViewPort().resize(); });

function getUrlParameter(param)
{
    var pageURL = window.location.search.substring(1),
        urlVariables = pageURL.split('&');

    for (var i = 0; i < urlVariables.length; i++){

        var parameterName = urlVariables[i].split('=');
        if (parameterName[0] == param){
            return parameterName[1];
        }
    }
    return null;
}

//requested by Heiner for showing customer/ internal 
if(getUrlParameter("preLoad")=="1")
{
    kmlReader.setUrl('/sample_data/pre_load.kml');
    processKml();
    Spinner.showSpinner();
    
}
else if(getUrlParameter("preLoad"))
{
    kmlReader.setUrl('/sample_data/'+getUrlParameter("preLoad"));
    processKml();
    Spinner.showSpinner();
    
    var lastBubble = null;
    map.addEventListener('tap', function (currentEvent) 
    {
        var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
        if (lastBubble != null) {
                        ui.removeBubble(lastBubble);
        }
        var content = lastClickedPos.lat + "," + lastClickedPos.lng; 
        var infobubble = new H.ui.InfoBubble(lastClickedPos, {
                            content: content
        });
        
        
        lastBubble = infobubble;
        ui.addBubble(infobubble);
    });
    
}