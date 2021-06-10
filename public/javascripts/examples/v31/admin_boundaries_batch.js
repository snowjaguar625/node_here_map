/**
	 * author boris.guenebaut@here.com
	 * (C) HERE 2019
	 */


 var mapContainer = document.getElementById("mapContainer");

 // check if the site was loaded via secure connection
 var secure = (location.protocol === 'https:') ? true : false;

 // Create a platform object to communicate with the HERE REST APIs
 var platform = new H.service.Platform({
     apikey: api_key,
     useHTTPS: secure
 });

 // Get pre-configured set of HERE layers
 var maptypes = platform.createDefaultLayers();
 var geocoder = platform.getGeocodingService();
 var group = null;

 // Instantiate a map in the "map" div, set the base map to normal
 var map = new H.Map(mapContainer, maptypes.vector.normal.map, {
     center: new H.geo.Point(47.609722, -122.333056),
     zoom: 10,
     pixelRatio: window.devicePixelRatio || 1
 });

 // Do not draw under control panel
 // Padding results in a shifted map center which is the visual center of the padded area.
 map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

 // Enable the map event system
 var mapevents = new H.mapevents.MapEvents(map);

 // Enable map interaction (pan, zoom, pinch-to-zoom)
 var behavior = new H.mapevents.Behavior(mapevents);

 // Enable the default UI
 var ui = H.ui.UI.createDefault(map, maptypes);

 //add JS API Release information
 releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;

 //add MRS Release information
 loadMRSVersionTxt();

 //helper
 var releaseGeocoderShown = false;


 window.addEventListener("resize", function() {
     map.getViewPort().resize();
 });

 // Requests count.
 var reqCount = 0;

 var geocodeAll = function() {
     //add Geocoder Release information if not already done
     showGeocoderVersion();

     // Reset variables.
     try {
         map.removeObject(group);
     } catch (e) {}
     group = new H.map.Group();
     reqCount = 0;

     // Prepare input text for processing.
     var citySearch = document.getElementById("input-ci").value;
     var postalCodeSearches = document.getElementById("input-pc").value;
     //Create an array of what we will search
     adminAreaSearches = [citySearch].concat(postalCodeSearches.split("\n"));

     // Geocode each search.
     for (var i = 0; i < adminAreaSearches.length; i++) {
         var search = adminAreaSearches[i];
         if (search.length > 0) {
             reqCount++; //Count how many requests will be sent
             geocode(search, i === 0 /*remember: fist element is the city shape level*/ ? "city" : "postalcode");
         }
     }

 };

 var geocode = function(searchText, shapeLevel) {
     //add Geocoder Release information if not already done
     showGeocoderVersion();

     geocoder.geocode({
         searchText: searchText,
         additionalData: "IncludeShapeLevel," + shapeLevel,
         maxResults: 1,
         jsonattributes: 1,
         requestId: shapeLevel //mark request to retrieve it later from MetaInfo of response
     }, function(result) {
         reqCount--; //this request is finished. Reduce the number of unfinished requests
         createAdminShape(result);
     }, function(error) {
         alert(error);
     });

 };

 /**
  * Creates the admin shape contained in the given response when applicable.
  */
 var createAdminShape = function(result) {

     var shapeLevel = result.response.metaInfo.requestId;
     var firstLocation = null;

     //Check result response
     if (!result || !result.response || !result.response.view ||
         result.response.view.length == 0 || !result.response.view[0].result ||
         result.response.view[0].result.length == 0 ||
         (!result.response.view[0].result[0].location && !result.response.view[0].result[0].place)) {
         return;
     }

     if (result.response.view[0].result[0].location != null) {
         firstLocation = result.response.view[0].result[0].location;
     } else {
         firstLocation = result.response.view[0].result[0].place.locations[0];
     }

     if (firstLocation.shape) {
         var shapeText = firstLocation.shape.value;

         // Split the shape string to get individual sub shape strings
         var strips = parsePolyStrings(shapeText);

         for (var i = 0; i < strips.length; i++) {
             var strip = strips[i];

             var fillColor = null;
             // Logic specific to this example.
             if (strip.isHole && shapeLevel === "city") {
                 fillColor = "FFF1";
             } else if (strip.isHole) {
                 fillColor = getShapeColor("city", 0.4);
             } else {
                 fillColor = getShapeColor(shapeLevel);
             }
             var shape = new H.map.Polygon(strip.strip, {
                 style: {
                     lineWidth: 2,
                     fillColor: fillColor

                 },
                 zIndex: shapeLevel === "city" ? 10 : strip.isHole ? 30 : 20
             });

             group.addObject(shape);
         }
     }

     if (reqCount === 0) {
         map.addObject(group);
         map.getViewModel().setLookAtData({
             bounds: group.getBoundingBox()
         });
     }
 };

 /**
  * Transforms the WKT polygon representations into HERE strips.
  */
 var parsePolyStrings = function(ps) {
     var i, j, lat, lng, tmp, strip, strips = [],
         // Match '(' and ')' plus contents between them which
         // contain anything other than '(' or ')'.
         m = ps.match(/\([^\(\)]+\)/g);
     if (m !== null) {
         for (i = 0; i < m.length; i++) {
             //match all numeric strings
             tmp = m[i].match(/-?\d+\.?\d*/g);
             if (tmp !== null) {
                 // Convert all the coordinate sets in tmp from strings to Numbers
                 // And add them to the current strip.
                 for (j = 0, strip = new H.geo.LineString(); j < tmp.length; j += 2) {
                     lng = Number(tmp[j]);
                     lat = Number(tmp[j + 1]);
                     strip.pushLatLngAlt(lat, lng, 0);
                 }
                 strips.push({
                     strip: strip,
                     isHole: isPolyHole(ps, m[i])
                 });
             }
         }
     }
     // Returns array of strips or empty array.
     return strips;
 };

 /**
  * Indicates whether the polygon represented in polyWkt is a hole.
  */
 var isPolyHole = function(allWkt, polyWkt) {
     var previousChar = allWkt[allWkt.indexOf(polyWkt) - 1];
     return previousChar === "," || previousChar === " ";
 };


 /**
  * Maps colors and shape levels.
  */
 var shapeLevelColorMap = {};

 /**
  * Returns the color associated to the given shape level.
  */
 var getShapeColor = function(shapeLevel, opacity) {
     var colorParts = shapeLevelColorMap[shapeLevel];
     if (!colorParts) {
         colorParts = shapeLevelColorMap[shapeLevel] = getRandomColor();
     }
     opacity = opacity || 0.5;
     var allColorParts = colorParts.concat([opacity]);
     return ["rgba(", allColorParts.join(","), ")"].join("");
 };

 /**
  * Generates a random color.
  */
 var getRandomColor = function() {
     var parts = [];
     for (var i = 0; i < 3; i++) {
         parts.push(Math.floor(Math.random() * 255));
     }
     return parts;
 };

 /**
  * Extends the String object by adding the method contains.
  */
 String.prototype.contains = function(text) {
     return this.indexOf(text) !== -1;
 };

 /**
  * Replaces all "find" expressions by "replace" ones.
  */
 String.prototype.replaceAll = function(find, replace) {
     var regex = new RegExp(find, 'g');
     return this.replace(regex, replace);
 };

 var showGeocoderVersion = function() {
     //add Geocoder Release information if not already done
     if (!releaseGeocoderShown) {
         loadGeocoderVersionTxt(); //get version from https://geocoder.api.here.com/6.2/version.txt
         releaseGeocoderShown = true;
     }
 };