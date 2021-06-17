
/**
 * Generate valid WKT for given geo strip.
 */
function polygonStripToWkt(strip) {

    if (strip.getPointCount() == 1) {
        return 'POINT (' + strip.extractPoint(0).lng + ' ' + strip.extractPoint(0).lat + ')';
    }

    var points = [];
    for (var i = 0; i < strip.getPointCount(); i++) {
        var p = strip.extractPoint(i);
        points.push(p.lng + ' ' + p.lat);
    }
    points.push(points[0]);
    return 'POLYGON ((' + points.join(', ') + '))';
}