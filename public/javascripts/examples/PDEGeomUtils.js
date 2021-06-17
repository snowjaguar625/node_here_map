/* 
* author domschuette
* (C) HERE 2016
*/

(function () {
    'use strict';
	if (H.service.Platform.prototype.ext === undefined) 
	{
		H.service.Platform.prototype.ext = {};
	}

	H.service.Platform.prototype.ext.getPDEGeomUtils = function () 
	{
		return new PDEGeomUtils();
	};

	function PDEGeomUtils() 
	{
	}
	
	PDEGeomUtils.prototype.splitLatitudes = function (latitudes)
	{
		return latitudes.split(",", -1);
	}
		
	PDEGeomUtils.prototype.splitLongitudes = function(longitudes)
	{
		return longitudes.split(",", -1);
	}

	PDEGeomUtils.prototype.extractRowLatLon = function(latParts, lonParts)
	{
		var rowLatLon = new Array;
		for (var c = 0; c < latParts.length; c++) {
			rowLatLon[2 * c] = (this.isEmpty(latParts[c]) ? 0 : parseInt(latParts[c]) / 100000.0) + (c == 0 ? 0 : rowLatLon[2 * c - 2]);
			rowLatLon[2 * c + 1] = (this.isEmpty(lonParts[c]) ? 0 : parseInt(lonParts[c]) / 100000.0) + (c == 0 ? 0 : rowLatLon[2 * c - 1]);
		}
		return rowLatLon;
	}

	PDEGeomUtils.prototype.extractArtificialLineStart = function(rowLonStr)
	{
		var artificialLineStart = new Array;
		for (var c = 0; c < rowLonStr.length; c++) {
			artificialLineStart[c] = !this.isEmpty(rowLonStr[c]) && (rowLonStr[c].charAt(0) == '0' || (rowLonStr[c].charAt(0) == '-' && rowLonStr[c].charAt(1) == '0'));
		}
		return artificialLineStart;
	}

	PDEGeomUtils.prototype.strSum = function(intStrs) {
		var sum = 0,
			s = "";
		for (var i = 0; i < intStrs.length; i++) 
		{
			s = intStrs[i];
			if (s.length == 0) continue;
			sum+= parseInt(s);
		}
		return sum;
	}

	PDEGeomUtils.prototype.extractGeometryType = function(latParts, lonParts) {
		var geomType;
		if (latParts.length == 1) {
			geomType = "GEOM_POINT";
		} else if (this.strSum(latParts) != parseInt(latParts[0]) || this.strSum(lonParts) != parseInt(lonParts[0])) {
			geomType = "GEOM_LINE";
		} else if (this.strSum(latParts) == parseInt(latParts[0]) && this.strSum(lonParts) == parseInt(lonParts[0])) {
			geomType = "GEOM_POLYGON";
		} else {
			throw new IllegalArgumentException("Unsupported geometry type.");
		}
		return geomType;
	}

	PDEGeomUtils.prototype.rowToWkt = function(latParts, lonParts)
	{
		var rowLatLon = this.extractRowLatLon(latParts, lonParts);
		var artificialLineStart = this.extractArtificialLineStart(lonParts);
		
		var geomType = this.extractGeometryType(latParts, lonParts);

		var wkt = "";
		
		if (wkt.length == 0) {
			if (geomType == "GEOM_POINT") {
				wkt += "MULTIPOINT()";
			} else if (geomType == "GEOM_LINE") {
				wkt += "MULTILINESTRING()";
			} else {
				wkt += "MULTIPOLYGON()";
			}
		}

		wkt = wkt.slice(0, -1);

		if (wkt.length
				> 16) {
			wkt += (',');
		}
		if (geomType == "GEOM_POLYGON") {
			wkt += ("((");
		} else {
			wkt += ('(');
		}

		for (var c = 0; c < rowLatLon.length / 2; c++) {
			if (c > 0) {
				wkt += (',');
			}
			if (artificialLineStart[c] && rowLatLon[2 * c + 1] >= 0) {
				wkt += ('0');
				wkt += (Math.round(rowLatLon[2 * c + 1] * 100000.0) / 100000.0);
			} else if (artificialLineStart[c] && rowLatLon[2 * c + 1] < 0) {
				wkt += ("-0");
				wkt += (Math.round(-rowLatLon[2 * c + 1] * 100000.0) / 100000.0);
			} else {
				wkt += (Math.round(rowLatLon[2 * c + 1] * 100000.0) / 100000.0);
			}
			wkt += (' '); 
			wkt += (Math.round(rowLatLon[2 * c] * 100000.0) / 100000.0);
		}

		if (geomType == "GEOM_POLYGON") {
			wkt += (")))");
		} else {
			wkt += ("))");
		}
		return wkt;
	}

	PDEGeomUtils.prototype.isEmpty = function(str) {
		return (!str || 0 === str.length);
	}

	PDEGeomUtils.prototype.converPDEResultsToWKT = function(results, column_id, union)
	{
		var geoReader = new jsts.io.GeoJSONReader();
		var geometries; 
		if(union)
			geometries = {};
		else
			geometries = new Array();
		
		for(var i = 0; i < results.length; i++)
		{
			for(var j = 0; j < results[i].length; j++)
			{
				var id = results[i][j][column_id];
				var rowLatStr = this.splitLatitudes(results[i][j].LAT);
				var rowLonStr = this.splitLatitudes(results[i][j].LON);
				
				var c = this.rowToWkt(rowLatStr, rowLonStr);
				if(union)
				{
					if(geometries[id] == undefined)
						geometries[id] = new Array();
					geometries[id].push(c);
				}
				else{
					geometries.push(this.rowToWkt(rowLatStr, rowLonStr));
				}
			}
		}
		
		if(union)
		{
			var jsts_reader = new jsts.io.WKTReader();
			var jsts_writer = new jsts.io.WKTWriter();
			var ret = new Array();
			for (var i = 0, keys = Object.keys(geometries), ii = keys.length; i < ii; i++) 
			{
				try
				{
					var id = keys[i], 
						currentGeoms = geometries[keys[i]],
						j = 0, 
						lastGeometrie = "";
					
					for(; j < currentGeoms.length; j++)
					{
						if(j == 0)
						{
							lastGeometrie = jsts_reader.read(currentGeoms[j]);
						}
						else 
						{
							var unionGeometrie = jsts_reader.read(currentGeoms[j]);
							lastGeometrie = lastGeometrie.union(unionGeometrie);
						}
					}
					lastGeometrie = jsts_writer.write(lastGeometrie);
					ret.push(lastGeometrie);
				} 
				catch(e) 
				{
					console.log("error in union");
				}
			}
			return ret; 
		}
		return geometries;
	}
})();