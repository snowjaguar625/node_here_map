/* 
	author domschuette
	(C) HERE 2014
*/

var icon =
    '<svg version="1.1" class="H_icon" viewBox="0 0 26 26">' +
    '<path d="M4 4 L22 4 L22 22 L4 22 L4 4 Z" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M7 22 L7 8" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M13 22 L13 8" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M19 22 L19 8" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M10 22 L10 14" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M16 22 L16 14" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '<path d="M6 20 L20 20" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
    '</svg>';

var waypointssvg = '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24">' +
    '<circle cx="12" cy="12" r="8" stroke="#661144" stroke-width="5" fill="white" />' +
    '</svg>';

var labelsvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="14">' +
    '<g><text x="0" y="12" font-size="12pt" font-family="arial" font-weight="bold" style="fill:rgb(255,255,255);stroke:#000000;" ' +
    'text-anchor="left" fill="white">__DISTANCE__</text></g></svg>';

var waypointIcon = new H.map.Icon(waypointssvg, { anchor: new H.math.Point(12, 12) });

var DistanceMeasurement = function() {
    var that = this;

    that.waypoints = new H.map.Group();
    that.lines = new H.map.Group();
    that.labels = new H.map.Group();

    // call the super class constructor
    H.ui.Control.call(that);

    // add distance measurement button for ui
    that.button = new H.ui.base.PushButton({
        label: icon,
        tooltip: "Distance Measurement"
    });

    that.addChild(that.button);
    that.setAlignment('right-bottom');

    // update coordinates for connected line when moving a waypoint
    // i == 0 -> update first coord
    // i == 1 -> update second coord
    that.updateLine = function(polyline, i, pointer) {
        var strip = polyline.getGeometry ? polyline.getGeometry() : polyline.getStrip();
        var from = (i == 0) ? 3 : 0;

        strip.spliceLatLngAlts(from, 3);
        strip.insertLatLngAlt(from, pointer.lat, pointer.lng, 0);
        polyline.setStrip(strip);
    }

    // turn measurement on/off listener
    that.button.addEventListener("statechange", function() {
        that.measurementOnOff();
    });

};

inherits(DistanceMeasurement, H.ui.Control);

DistanceMeasurement.prototype.measurementOnOff = function() {
    if (this.button.getState() === "down") {
        map.addObject(this.waypoints);
        map.addObject(this.lines);
        map.addObject(this.labels);

        map.addEventListener('tap', this.tapEvent, false, this);
    } else {
        this.waypoints.removeAll();
        this.lines.removeAll();
        this.labels.removeAll();

        if (this.waypoints) map.removeObject(this.waypoints);
        if (this.lines) map.removeObject(this.lines);
        //if (this.labels) map.removeObject(this.labels);

        map.removeEventListener('tap', this.tapEvent, false, this);
    }
};

// event triggered when clicking on the map
DistanceMeasurement.prototype.tapEvent = function(e) {
    var that = this,
        nWaypoints = this.waypoints.getObjects().length;
    // add a new waypoint
    that.addWaypoint(e, nWaypoints);
    // add new line
    that.addLine(e, nWaypoints - 1);
}

DistanceMeasurement.prototype.enableLabels = function() {
    if (this.labels) map.addObject(this.labels);
}

DistanceMeasurement.prototype.disableLabels = function() {
    if (this.labels) map.removeObject(this.labels);
}

// event triggered when dragging a waypoint
DistanceMeasurement.prototype.dragWaypoint = function(e) {
    var that = this,
        waypoint = e.target,
        lines = that.lines,
        lineObjects = lines.getObjects(),
        nLines = lines.getObjects().length,
        i = that.waypoints.getObjects().indexOf(waypoint),
        pointer = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

    // Update waypoint position
    waypoint.setPosition(pointer);

    // Update polyline between waypoints
    if (lineObjects.length > 0) {
        // Update first coordinate of line
        if (i > 0) {
            that.updateLine(lineObjects[i - 1], 0, pointer);
        }
        // Update second coordinate of line
        if (i < nLines) {
            that.updateLine(lineObjects[i], 1, pointer);
        }
        that.updateLabels();
    }
}

// Add waypoint to position marked by index i
DistanceMeasurement.prototype.addWaypoint = function(e, i) {
    // current pointer location
    var that = this,
        pointer = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY),
        waypoint = new H.map.Marker(pointer, { icon: waypointIcon });

    waypoint.draggable = true;

    waypoint.addEventListener('pointerup', this.enableLabels.bind(that));
    waypoint.addEventListener('pointerenter', this.enableLabels.bind(that));
    waypoint.addEventListener('pointerleave', this.disableLabels.bind(that));
    waypoint.addEventListener('dragstart', function(e) {
        behavior.disable();
        that.labels.removeAll();
    }, false);

    waypoint.addEventListener('drag', function(e) {
        that.dragWaypoint(e);
    }, false);

    waypoint.addEventListener('dragend', function(e) {
        behavior.enable();
        that.updateLabels();
    }, false);

    // add waypoint to waypoints array in the place located by index i
    that.addObjectAtIndex(that.waypoints, waypoint, i);

    // show labels after the click
    that.enableLabels();

    return waypoint;
};

DistanceMeasurement.prototype.activateLine = function(e) {
    e.target.setStyle({ strokeColor: 'rgb(102, 17, 68)', lineWidth: 8 });
}

DistanceMeasurement.prototype.deactivateLine = function(e) {
    e.target.setStyle({ strokeColor: 'rgba(102, 17, 68, 0.8)', lineWidth: 7 });
}


DistanceMeasurement.prototype.addLine = function(e, i) {
    var that = this,
        objects = that.waypoints.getObjects(),
        length = objects.length;

    if (length > 1) {
        var startP = objects[i];
        var endP = objects[i + 1];
        startP.getPosition = startP.getPosition || startP.getGeometry;
        endP.getPosition = endP.getPosition || endP.getGeometry;
        var startCoord = startP.getPosition(),
            endCoord = endP.getPosition(),
            strip = H.geo.Strip ? new H.geo.Strip() : new H.geo.LineString(),
            distance;

        strip.pushPoint(startCoord);
        strip.pushPoint(endCoord);

        var line = new H.map.Polyline(strip, { style: { strokeColor: 'rgba(102, 17, 68, 0.8)', lineWidth: 7 } });
        // add line to the array of lines
        that.addObjectAtIndex(that.lines, line, i);
        // add listeners
        line.addEventListener('pointerenter', that.enableLabels.bind(that));
        line.addEventListener('pointerenter', that.activateLine);
        line.addEventListener('pointerleave', that.disableLabels.bind(that));
        line.addEventListener('pointerleave', that.deactivateLine);
        line.draggable = true;
        line.addEventListener('drag', function(e) {

            e.target = markerCreatedFromDrag;
            that.dragWaypoint(e);
        }, false);

        line.addEventListener('dragstart', function(e) {

            var i = that.lines.getObjects().indexOf(e.target);
            // stop map drag
            behavior.disable();
            // remove labels
            that.labels.removeAll();
            // add a new waypoint
            markerCreatedFromDrag = that.addWaypoint(e, i + 1);
            // split the line which was clicked
            that.splitLine(e, i);

        }, false);

        line.addEventListener('dragend', function(e) {
            behavior.enable();
        }, false);

        that.updateLabels();
    };
};

// split line into two lines
DistanceMeasurement.prototype.splitLine = function(e, index) {
    var that = this;
    that.removeObjectAtIndex(that.lines, index);
    that.addLine(e, index);
    that.addLine(e, index + 1);
}

DistanceMeasurement.prototype.updateLabels = function() {
    var that = this,
        lines = this.lines.getObjects(),
        waypoints = this.waypoints.getObjects(),
        distance = 0,
        position;

    // remove current labels
    this.labels.removeAll();

    // update labels for lines
    lines.forEach(function(line) {
        var strip = line.getGeometry ? line.getGeometry() : line.getStrip();

        var distance = strip.extractPoint(0).distance(strip.extractPoint(1));
        var bound = line.getBounds ? line.getBounds() : line.getBoundingBox();
        position = bound.getCenter();
        that.buildLabel(position, distance);
        // clear distance
        distance = 0;
    });

    // update labels for waypoints
    waypoints.forEach(function(waypoint) {
        // clear distance
        distance = 0;

        // sum all previous waypoints distances
        for (var i = 0; i < waypoints.length; i++) {
            if (i == waypoints.indexOf(waypoint)) break;
            distance += waypoints[i].getPosition().distance(waypoints[i + 1].getPosition());
        }

        // Only add marker if distance is not 0
        if (distance !== 0) {
            position = waypoint.getPosition();
            that.buildLabel(position, distance);
        }
    });
}

DistanceMeasurement.prototype.buildLabel = function(position, distance) {
    var that = this;
    var label = new H.map.Marker(position, { icon: new H.map.Icon(labelsvg.replace(/__DISTANCE__/g, that.getDistranceString(distance))) });
    label.addEventListener('pointerenter', that.enableLabels.bind(that));
    label.addEventListener('pointerleave', that.disableLabels.bind(that));
    that.labels.addObject(label);
    distance = 0;
}

DistanceMeasurement.prototype.getDistranceString = function(distance) {
    return this.unitSystem == 'metric' ? (Math.round((distance / 1000) * 100) / 100) + " km" : (Math.round((distance * 0.00062137) * 100) / 100) + " mi";
}

DistanceMeasurement.prototype.onUnitSystemChange = function(unitSystem) {
    this.unitSystem = (this.unitSystem == "metric") ? "imperial" : "metric";
    this.updateLabels();
};

// add object to H.map.Group at the place located by index i 
DistanceMeasurement.prototype.addObjectAtIndex = function(group, element, i) {
    var objects = group.getObjects();
    objects.splice(i, 0, element);
    group.removeAll();
    group.addObjects(objects);
}

// remove object from H.map.Group at the place located by index i 
DistanceMeasurement.prototype.removeObjectAtIndex = function(group, i) {
    var objects = group.getObjects();
    objects.splice(i, 1);
    group.removeAll();
    group.addObjects(objects);
}

H.ui.DistanceMeasurement = DistanceMeasurement;