/** 
	ClusterMarkerSpider based on: 
	https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet
	Copyright (c) 2011 - 2012 George MacKerron
	Released under the MIT licence: http://opensource.org/licenses/mit-license
	Note: The HERE maps API must be included *before* this code
*/
/*
	author domschuette
	(C) HERE 2016
*/

var hasProp = {}.hasOwnProperty,
    slice = [].slice;


this['OverlappingMarkerSpiderfier'] = (function() {
    var p, twoPi;

    p = _Class.prototype;

    twoPi = Math.PI * 2;
    p['keepSpiderfied'] = true;
    p['nearbyDistance'] = 20;
    p['circleSpiralSwitchover'] = 9;
    p['circleFootSeparation'] = 25;
    p['circleStartAngle'] = twoPi / 12;
    p['spiralFootSeparation'] = 28;
    p['spiralLengthStart'] = 11;
    p['spiralLengthFactor'] = 5;
    p['legWeight'] = 2;
    p['legColors'] = {
        'usual': 'rgba(63, 200, 187, 1)',
        'highlighted': 'rgba(255, 255, 255, 1)'
    };

    p['icons'] = {
        'usual': new H.map.Icon('<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
            '<g>' +
            '<path fill-opacity="0.2" fill="rgba(63, 200, 187, 1)" d="m19,31c0,1.7 -2.7,3 -6,3c-3.3,0 -6,-1.3 -6,-3c0,-1.7 2.7,-3 6,-3c3.3,0 6,1.3 6,3z"/>' +
            '<path stroke="null" fill="rgba(63, 200, 187, 1)" d="m14,1.2c-7,0 -10.7,6.73077 -10.9,14.26923c0,4.44231 1,7.53846 3.1,10.36539l7.8,10.36539l7.8,-10.36539c2.1,-2.82692 3,-5.78846 3,-10.36539c-0.2,-7.71346 -3.8,-14.26923 -10.8,-14.26923z"/>' +
            '</g>' +
            '</svg>'),
        'highlighted': new H.map.Icon('<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
            '<path fill-opacity="0.2" fill="rgba(255, 255, 255, 1)" d="m19,31c0,1.7 -2.7,3 -6,3c-3.3,0 -6,-1.3 -6,-3c0,-1.7 2.7,-3 6,-3c3.3,0 6,1.3 6,3z"/>' +
            '<path stroke="null" fill="rgba(255, 255, 255, 1)" d="m14,1.2c-7,0 -10.7,6.73077 -10.9,14.26923c0,4.44231 1,7.53846 3.1,10.36539l7.8,10.36539l7.8,-10.36539c2.1,-2.82692 3,-5.78846 3,-10.36539c-0.2,-7.71346 -3.8,-14.26923 -10.8,-14.26923z"/>' +
            '</svg>')
    };

    function _Class(map, opts) {
        var e, j, k, len, ref, v;
        this.map = map;
        this.initMarkerArrays();
        this.listeners = {};

        // other map events can be added 
        ref = ['mapviewchangeend'];
        for (j = 0, len = ref.length; j < len; j++) {
            e = ref[j];
            this.map.addEventListener(e, (function(_this) {
                return function() {
                    return _this['unspiderfy']();
                };
            })(this));
        }
    }

    p.initMarkerArrays = function() {
        this.markers = [];
        return this.markerListeners = [];
    };

    p['addMarker'] = function(marker) {
        var markerListener;
        // return the marker if we have it already
        if (marker['_oms'] != null) {
            return this;
        }
        marker['_oms'] = true;
        markerListener = (function(_this) {
            return function() {
                return _this.spiderListener(marker);
            };
        })(this);

        marker.addEventListener('tap', markerListener);
        marker.setIcon(this['icons']['usual']);
        this.markerListeners.push(markerListener);
        this.markers.push(marker);
        return this;
    };

    p['getMarkers'] = function() {
        return this.markers.slice(0);
    };

    p['clearMarkers'] = function() {
        var i, j, len, marker, markerListener, ref;
        this['unspiderfy']();
        ref = this.markers;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
            marker = ref[i];
            markerListener = this.markerListeners[i];
            marker.removeEventListener('tap', markerListener);
            delete marker['_oms'];
        }
        this.initMarkerArrays();
        return this;
    };

    p['addListener'] = function(event, func) {
        var base;
        ((base = this.listeners)[event] != null ? base[event] : base[event] = []).push(func);
        return this;
    };

    p.trigger = function() {
        var args, event, func, j, len, ref, ref1, results;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        ref1 = (ref = this.listeners[event]) != null ? ref : [];
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
            func = ref1[j];
            results.push(func.apply(null, args));
        }
        return results;
    };

    p.generatePtsCircle = function(count, centerPt) {
        var angle, angleStep, circumference, i, j, legLength, ref, results;
        circumference = this['circleFootSeparation'] * (2 + count);
        legLength = circumference / twoPi;
        angleStep = twoPi / count;
        results = [];
        for (i = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            angle = this['circleStartAngle'] + i * angleStep;
            results.push(new H.math.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle)));
        }
        return results;
    };

    p.generatePtsSpiral = function(count, centerPt) {
        var angle, i, j, legLength, pt, ref, results;
        legLength = this['spiralLengthStart'];
        angle = 0;
        results = [];
        for (i = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            angle += this['spiralFootSeparation'] / legLength + i * 0.0005;
            pt = new H.math.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle));
            legLength += twoPi * this['spiralLengthFactor'] / angle;
            results.push(pt);
        }
        return results;
    };

    p.spiderManual = function() {
        if (this.getMarkers() != null && this.getMarkers()[0]) {
            this.spiderListener(this.getMarkers()[0]);
        }
    }

    p.spiderListener = function(marker) {
        var j, len, m, mPt, markerPt, markerSpiderfied, nearbyMarkerData, ref;
        markerSpiderfied = marker['_omsData'] != null;
        // can be used to close the current visible spider
        if (!(markerSpiderfied && this['keepSpiderfied'])) {
            this['unspiderfy']();
        }

        if (markerSpiderfied) {
            return this.trigger('tap', marker);
        } else {
            nearbyMarkerData = [];
            markerPt = this.map.geoToScreen(marker.getPosition ? marker.getPosition() : marker.getGeometry());
            ref = this.markers;
            for (j = 0, len = ref.length; j < len; j++) {
                m = ref[j];
                mPt = this.map.geoToScreen(m.getPosition ? m.getPosition() : m.getGeometry());
                nearbyMarkerData.push({
                    marker: m,
                    markerPt: mPt
                });
            }
            if (nearbyMarkerData.length === 1) {
                return this.trigger('tap', marker);
            } else {
                return this.spiderfy(nearbyMarkerData);
            }
        }
    };

    p.makeHighlightListeners = function(marker) {
        return {
            highlight: (function(_this) {
                return function() {
                    marker.setIcon(_this['icons']['highlighted']);
                    return marker['_omsData'].leg.setStyle({
                        fillColor: _this['legColors']['highlighted'],
                        strokeColor: _this['legColors']['highlighted'],
                        lineWidth: _this['legWeight']
                    });
                };
            })(this),
            unhighlight: (function(_this) {
                return function() {
                    marker.setIcon(_this['icons']['usual']);
                    return marker['_omsData'].leg.setStyle({
                        fillColor: _this['legColors']['usual'],
                        strokeColor: _this['legColors']['usual'],
                        lineWidth: _this['legWeight']
                    });
                };
            })(this)
        };
    };

    p.spiderfy = function(markerData) {
        var bodyPt, footLl, footPt, footPts, leg, marker, md, mhl, nearestMarkerDatum, numFeet, spiderfiedMarkers;
        this.spiderfying = true;
        numFeet = markerData.length;
        bodyPt = this.ptAverage((function() {
            var j, len, results;
            results = [];
            for (j = 0, len = markerData.length; j < len; j++) {
                md = markerData[j];
                results.push(md.markerPt);
            }
            return results;
        })());

        footPts = numFeet >= this['circleSpiralSwitchover'] ? this.generatePtsSpiral(numFeet, bodyPt).reverse() : this.generatePtsCircle(numFeet, bodyPt);
        spiderfiedMarkers = (function() {
            var j, len, results;
            results = [];
            for (j = 0, len = footPts.length; j < len; j++) {
                footPt = footPts[j];
                footLl = this.map.screenToGeo(Math.round(footPt.x), Math.round(footPt.y));
                nearestMarkerDatum = this.minExtract(markerData, (function(_this) {
                    return function(md) {
                        return _this.ptDistanceSq(md.markerPt, footPt);
                    };
                })(this));

                marker = nearestMarkerDatum.marker;
                var strip = H.geo.Strip ? new H.geo.Strip() : new H.geo.LineString();
                strip.pushPoint(footLl);
                strip.pushPoint((marker.getPosition ? marker.getPosition() : marker.getGeometry()))

                leg = new H.map.Polyline(strip);
                leg.setStyle({
                    fillColor: this['legColors']['usual'],
                    strokeColor: this['legColors']['usual'],
                    lineWidth: this['legWeight']
                });

                this.map.addObject(leg);
                marker['_omsData'] = {
                    leg: leg
                };

                if (this['legColors']['highlighted'] !== this['legColors']['usual']) {
                    mhl = this.makeHighlightListeners(marker);
                    marker['_omsData'].highlightListeners = mhl;
                    marker.addEventListener('pointerenter', mhl.highlight);
                    marker.addEventListener('pointerleave', mhl.unhighlight);
                }

                marker.setPosition ? marker.setPosition(footLl) : marker.setGeometry(footLl);
                marker.setZIndex(1000000);
                leg.setZIndex(999999);
                map.addObject(marker);
                results.push(marker);
            }
            return results;
        }).call(this);
        delete this.spiderfying;
        this.spiderfied = true;
    };

    p['unspiderfy'] = function() {
        var j, len, marker, mhl, ref;
        this.unspiderfying = true;
        ref = this.markers;
        for (j = 0, len = ref.length; j < len; j++) {
            marker = ref[j];
            if (marker['_omsData'] != null) {
                this.map.removeObject(marker['_omsData'].leg);
                this.map.removeObject(marker);

                mhl = marker['_omsData'].highlightListeners;
                if (mhl != null) {
                    marker.removeEventListener('pointerenter', mhl.highlight);
                    marker.removeEventListener('pointerleave', mhl.unhighlight);
                }
                delete marker['_omsData'];
            }
        }
        return this;
    };

    p.ptDistanceSq = function(pt1, pt2) {
        var dx, dy;
        dx = pt1.x - pt2.x;
        dy = pt1.y - pt2.y;
        return dx * dx + dy * dy;
    };

    p.ptAverage = function(pts) {
        var j, len, numPts, pt, sumX, sumY;
        sumX = sumY = 0;
        for (j = 0, len = pts.length; j < len; j++) {
            pt = pts[j];
            sumX += pt.x;
            sumY += pt.y;
        }
        numPts = pts.length;
        return new H.math.Point(sumX / numPts, sumY / numPts);
    };

    p.minExtract = function(set, func) {
        var bestIndex, bestVal, index, item, j, len, val;
        for (index = j = 0, len = set.length; j < len; index = ++j) {
            item = set[index];
            val = func(item);

            if ((typeof bestIndex === "undefined" || bestIndex === null) || val < bestVal) {
                bestVal = val;
                bestIndex = index;
            }
        }
        return set.splice(bestIndex, 1)[0];
    };

    p.arrIndexOf = function(arr, obj) {
        var i, j, len, o;
        if (arr.indexOf != null) {
            return arr.indexOf(obj);
        }

        for (i = j = 0, len = arr.length; j < len; i = ++j) {
            o = arr[i];
            if (o === obj) {
                return i;
            }
        }
        return -1;
    };

    return _Class;
})();