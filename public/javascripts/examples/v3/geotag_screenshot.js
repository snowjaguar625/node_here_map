/*
	author domschuette
	(C) HERE 2016
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	// we overwrite the center
	center = { lat: -38.33451388888889, lng: 144.32484722222222};
	zoom = 17;
	
	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	function startCapture()
	{
		capture(map, ui);
	}

	function capture(map, ui) {
		map.capture(function(canvas) {
			if (canvas) {
				var dataURL = canvas.toDataURL("image/jpeg", 1.0);
				
				var center = map.getCenter();
				var coord = dd2dms(center);
				var gps = {};

				gps[piexif.GPSIFD.GPSLatitudeRef] = coord.GPSLatitudeRef;
				gps[piexif.GPSIFD.GPSLongitudeRef] = coord.GPSLongitudeRef;
				gps[piexif.GPSIFD.GPSLatitude] = [[coord.dmsLatDeg,1],[coord.dmsLatMin,1],[coord.dmsLatSec,1]];
				gps[piexif.GPSIFD.GPSLongitude] = [[coord.dmsLngDeg,1],[coord.dmsLngMin,1],[coord.dmsLonSec,1]];
				var exifObj = {"GPS":gps};
				var exifbytes = piexif.dump(exifObj);

				var inserted = piexif.insert(exifbytes, dataURL);
				
				var img = new Image();
				img.src = inserted;
				
				var w = window.open("captured");
				w.document.write(img.outerHTML);
			} else {
					alert('Capturing is not supported');
			}
		}, [ui], 0, 0, document.getElementById("mapContainer").offsetWidth, document.getElementById("mapContainer").offsetHeight);
	}
	
	function dd2dms(coord) {
		var ddLat = "" + coord.lat,
			ddLng = "" + coord.lng,
			ddLatVal = ddLat,
			ddLngVal = ddLng,
			dmsLatDeg,
			dmsLngDeg,
			dmsLatMin,
			dmsLngMin,
			GPSLatitudeRef = "N",
			GPSLongitudeRef = "E";
		
		// got dashes?
		
		if (ddLat.substr(0,1) == "-") {
			GPSLatitudeRef = "S";
			ddLatVal = ddLat.substr(1,ddLat.length-1);
		}
		
		if (ddLng.substr(0,1) == "-") {
			GPSLongitudeRef = "W";
			ddLngVal = ddLng.substr(1,ddLng.length-1);
		}
		
		// degrees = degrees
		dmsLatDeg = ddLatVal.split(".")[0];
		dmsLngDeg = ddLngVal.split(".")[0];
		
		// * 60 = mins
		var ddLatRemainder  = ("0." + ddLatVal.split(".")[1]) * 60;
		var dmsLatMinVals   = ddLatRemainder.toString().split(".");
		dmsLatMin = dmsLatMinVals[0];
		
		var ddLngRemainder  = ("0." + ddLngVal.split(".")[1]) * 60;
		var dmsLngMinVals   = ddLngRemainder.toString().split(".");
		dmsLngMin = dmsLngMinVals[0];
		
		// * 60 again = secs
		var ddLatMinRemainder = ("0." + dmsLatMinVals[1]) * 60;
		dmsLatSec = ddLatMinRemainder;
		
		var ddLngMinRemainder = ("0." + dmsLngMinVals[1]) * 60;
		dmsLngSec = ddLngMinRemainder;
		
		return {GPSLatitudeRef : GPSLatitudeRef , dmsLatDeg : dmsLatDeg, dmsLatMin : dmsLatMin, dmsLatSec : dmsLatSec, 
				GPSLongitudeRef : GPSLongitudeRef , dmsLngDeg : dmsLngDeg, dmsLngMin : dmsLngMin, dmsLngSec : dmsLngSec};
	}

	function dumpExif(file)
	{
		var reader = new FileReader();
		reader.onloadend = function(e) {
			var exifObj = piexif.load(e.target.result);
			var str = ""; 
			for (var ifd in exifObj) {
				if (ifd == "thumbnail") {
					continue;
				}
				str += ("-" + ifd) + '</br>';
				for (var tag in exifObj[ifd]) {
					str += "  " + piexif.TAGS[ifd][tag]["name"] + ":" + exifObj[ifd][tag] + '</br>';
				}
			}
			document.getElementById("result").innerHTML = str;
		};
		reader.readAsDataURL(file);
	}