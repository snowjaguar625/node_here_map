var parseXml;

if (window.DOMParser) {
    parseXml = function(xmlStr) {
        return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
    };
} else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
    parseXml = function(xmlStr) {
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(xmlStr);
        return xmlDoc;
    };
} else {
    parseXml = function() { return null; }
}

function GPXParser(xmlDoc, map,  draw)
{
	this.xmlDoc = xmlDoc;
	this.map = map;
	this.trackcolor = "#ff00ff"; 
	this.markercolor = "ff00ff"; 
	this.trackwidth = 5;
	this.mintrackpointdelta = 0.0001;
	this.objectContainer = new H.map.Group();
	this.pointsWithSpeed = [];
	if(draw)
		this.map.addObjects(this.objectContainer);
}

GPXParser.prototype.SetTrackColor = function(color)
{
	this.trackcolor = color;
}

GPXParser.prototype.SetMarkerColor = function(color)
{
	this.markercolor = color;
}

GPXParser.prototype.SetTrackWidth = function(width)
{
	this.trackwidth = width;
}

// Set the minimum distance between trackpoints. Used to remove unneeded trackpoints from the map
GPXParser.prototype.SetMinTrackPointDelta = function(delta)
{
	this.mintrackpointdelta = delta;
}

GPXParser.prototype.CreateMarker = function(point)
{
	var lon = parseFloat(point.getAttribute("lon"));
	var lat = parseFloat(point.getAttribute("lat"));
	var html = "";

	if (point.getElementsByTagName("html").length > 0)
	{
		for (i=0; i<point.getElementsByTagName("html").item(0).childNodes.length; i++)
		{
			html += point.getElementsByTagName("html").item(0).childNodes[i].nodeValue;
		}
	}

	line1 = "Via Point";
	
	latLon = new H.geo.Point(lat, lon);
	var marker = new H.map.Marker(latLon, 
					{
						icon: this.createIcon( line1)
					});

	
	this.objectContainer.objects.add(marker);
}

GPXParser.prototype.AddTrackSegmentToMap = function(trackSegment, color, width)
{
	var trackpoints = trackSegment.getElementsByTagName("trkpt");
	if (trackpoints.length == 0)
	{
		return;
	}

	var lastlon = parseFloat(trackpoints[0].getAttribute("lon"));
	var lastlat = parseFloat(trackpoints[0].getAttribute("lat"));
	var latlng = new H.geo.Point( lastlat,lastlon);
	
	var speed = 0;
	
	var tmp = trackpoints[0].getElementsByTagName("speed")[0];
	if(tmp && tmp.length != 0)
		speed = tmp.childNodes[0].nodeValue;
	
	speed = parseFloat(speed);
	
	var heading = -1;
	
	tmp = trackpoints[0].getElementsByTagName("course")[0];
	if(tmp)
		heading = tmp.childNodes[0].nodeValue;
	
	heading = parseFloat(heading);

	if(heading > 0)
		this.pointsWithSpeed.push({coord: latlng, speed: speed, heading: heading});
	else
		this.pointsWithSpeed.push({coord: latlng, speed: speed});
		
	for (var i=1; i < trackpoints.length; i++)
	{
		var lon = parseFloat(trackpoints[i].getAttribute("lon"));
		var lat = parseFloat(trackpoints[i].getAttribute("lat"));

		speed = 0;
	
		tmp = trackpoints[i].getElementsByTagName("speed")[0];
		if(tmp && tmp.length != 0)
			speed = tmp.childNodes[0].nodeValue;
	
		speed = parseFloat(speed);
		
		var heading = -1;
	
		tmp = trackpoints[i].getElementsByTagName("course")[0];
		if(tmp)
			heading = tmp.childNodes[0].nodeValue;
	
		heading = parseFloat(heading);		

		var latdiff = lat - lastlat;
		var londiff = lon - lastlon;
		if ( Math.sqrt(latdiff*latdiff + londiff*londiff) > this.mintrackpointdelta )
		{
			var latlng = new H.geo.Point( lat,lon);
			// H.geo.Strip is replaced by H.geo.LineString in JS 3.1
			if (typeof H.geo.Strip === 'function')
			var splitLatlng = new H.geo.Strip();
			else
			var splitLatlng = new H.geo.LineString();
			splitLatlng.pushLatLngAlt( lat,lon, 0);
			splitLatlng.pushLatLngAlt( lastlat,lastlon, 0);
			polyline = new H.map.Polyline(splitLatlng,
									{
										style: 
										{
											lineWidth: 5,
											strokeColor: "rgba(50, 128, 128, 0.5)"
										}	
									}
						);		
			if(heading > 0)
				this.pointsWithSpeed.push({coord: latlng, speed: speed, heading: heading});
			else
				this.pointsWithSpeed.push({coord: latlng, speed: speed});
			
			this.objectContainer.addObject(polyline);
			lastlon = lon;
			lastlat = lat;
		}
	}
}

GPXParser.prototype.GetPointsWithSpeed = function()
{
	return this.pointsWithSpeed;
}

GPXParser.prototype.GetObjectContainer = function()
{
	return this.objectContainer;
}

GPXParser.prototype.AddTrackToMap = function(track, color, width)
{
	var segments = track.getElementsByTagName("trkseg");
	for (var i=0; i < segments.length; i++)
	{
		var segmentlatlngbounds = this.AddTrackSegmentToMap(segments[i], color, width);
	}
}

GPXParser.prototype.CenterAndZoomTo = function ()
{
	this.map.zoomTo(this.objectContainer.getBoundingBox());
}


GPXParser.prototype.AddTrackpointsToMap = function (draw)
{
	var tracks = this.xmlDoc.documentElement.getElementsByTagName("trk");

	for (var i=0; i < tracks.length; i++)
	{
		this.AddTrackToMap(tracks[i], this.trackcolor, this.trackwidth);
	}
}

GPXParser.prototype.AddWaypointsToMap = function ()
{
	var waypoints = this.xmlDoc.documentElement.getElementsByTagName("wpt");

	for (var i=0; i < waypoints.length; i++)
	{
		this.CreateMarker(waypoints[i]);
	}
}

//----------Helper ------------------
			
GPXParser.prototype.createIcon = function (line1) {
	var div = document.createElement("div");
	var svg = '<svg width="270" height="56" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
				'<g>' +
					'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="32" width="220" y="10" x="27" fill="#ffffff"/>'+
					'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
				'</g>'+
			  '</svg>';

	svg = svg.replace(/__line1__/g, line1);
	div.innerHTML = svg;

	return new H.map.MarkerIcon({
		element: div,
		width: 33, 
		height: 33,
		anchorX: 24,
		anchorY: 57,
		drawable: false
	});

};
