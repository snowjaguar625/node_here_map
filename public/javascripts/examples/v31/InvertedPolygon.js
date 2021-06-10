/* 
    author dschutte
    (C) HERE 2019
*/

InvertedPolygon = function(path) {
    var i = 0,
        latLongAlt = path.getLatLngAltArray(),
        l = latLongAlt.length;

	var poly1 = [
		"-179.99 89.99",
		"0 89.99", 
		"179.99 89.99", 
		"179.99 0", 
		"179.99 -89.99",
		"0 -89.99",
		"-179.99 -89.99"];
		
	var poly2 = [];

    for(; i < l; i += 3)
	{
		poly2.push(latLongAlt[i+1] + " " + latLongAlt[i]);
	}
	
	var wkt = 'POLYGON ((' + poly1.join(",") + ")" + "," + "(" + poly2.join(",") + ")" + ")";
	

    var bounds = new H.map.Polygon(H.util.wkt.toGeometry('POLYGON ((' + poly2.join(",") + '))'), {
                                        style: {
                                            fillColor: 'rgba(255, 255, 255, 0.7)',
                                            strokeColor: 'rgba(255, 255, 255, 0)',
                                        }
                                    });
									
    var polygon = new H.map.Polygon(H.util.wkt.toGeometry(wkt),{
                                        style: {
											strokeColor: "rgba(122, 122, 122, 0.7)",
                                            fillColor: "rgba(255, 255, 255, 0.7)"
                                        }   
                                    });      


	// return values based on JS API version
	if(H.geo.Strip){
		return { bounds : bounds.getBounds(), polygon: polygon };
	}else{
		return { bounds : bounds.getBoundingBox(), polygon: polygon };
	}
   
};
