function calculateCentroid(strip) {
    var sl = strip.getLatLngAltArray().slice();
    if (H.geo.Strip) {
        strip = new H.geo.Strip(sl);
    } else {
        strip = new H.geo.LineString(sl);
    }


    var pointCount = strip.getPointCount();
    if (pointCount === 1) {
        return [strip.extractPoint(0), 0.001];
    } else if (pointCount === 2) {
        var a = strip.extractPoint(0);
        var b = strip.extractPoint(1);
        return [new H.geo.Point((a.lat + b.lat) / 2, (a.lng + b.lng) / 2), 0.001];
    } else if (pointCount === 3) {
        var a = strip.extractPoint(0);
        var b = strip.extractPoint(1);
        var c = strip.extractPoint(2);
        var area = a.lng * (b.lat - c.lat) + b.lng * (c.lat - a.lat) + c.lng * (a.lat - b.lat);
        var number = (a.lng + b.lng + c.lng) / 3;
        var number2 = (a.lat + b.lat + c.lat) / 3;
        return [new H.geo.Point(number2, number), area];
    }

    var first = strip.extractPoint(0);
    var last = strip.extractPoint(pointCount - 1);
    if (first.lat != last.lat || first.lng != last.lng) {
        strip.pushPoint(first);
    }

    var doubleArea = 0;
    var lat = 0;
    var lng = 0;
    var point1;
    var point2;
    var tmpArea;
    for (var i = 0, j = pointCount - 1; i < pointCount; j = i++) {
        point1 = strip.extractPoint(i);
        point2 = strip.extractPoint(j);
        tmpArea = point1.lng * point2.lat - point2.lng * point1.lat;
        doubleArea += tmpArea;
        lat += (point1.lat + point2.lat) * tmpArea;
        lng += (point1.lng + point2.lng) * tmpArea;
    }
    if (doubleArea === 0) {
        // Almost no area, take one point and avoid divide by zero.
        return [strip.extractPoint(0), 0];
    }
    var divFactor = doubleArea * 3;
    return [new H.geo.Point(lat / divFactor, lng / divFactor), doubleArea / 2];
}

function calculateWeightedCentroid(centroids) {
    // TODO not really weighted at the moment :)
    // Just taking the max.
    var maxArea = -1;
    var center;
    for (var i = 0; i < centroids.length; i++) {
        if (centroids[i][1] > maxArea) {
            center = centroids[i][0];
        }
    }
    return center;
}