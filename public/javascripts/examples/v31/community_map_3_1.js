/**
	* author boris.guenebaut@here.com, 
	* (C) HERE 2014
	*/

	// Variables.
	var positionMarker = null;
	var addressForm = document.getElementById("form-address");
	var addressInput = document.getElementById("input-address");

	// Check whether the environment should use hi-res maps.
	var hidpi = ("devicePixelRatio" in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs.
	platform = new H.service.Platform({
		apikey: api_key
	});

	var geocoder = platform.getGeocodingService();

	var defaultLayers = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal.
	var map = new H.Map(document.getElementById("mapContainer"),
	defaultLayers.vector.normal.map, {
		center: new H.geo.Point(48.857, 2.341),
		zoom: 14,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI.
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//helper
	var releaseGeocoderShown = false;

	// Listen to the window resize event to resize the map accordingly.
	window.addEventListener("resize", function() {
		map.getViewPort().resize();
	});

	// Create community tile provider and layer.
	var communityTileProvider = new H.map.provider.ImageTileProvider({
		min: 0,
		max: 20,
		getURL: function(col, row, level) {
			var qk = getQuadkey(col, row, level);

			return [
			"http" + (secure ? "s" : "") + "://" + getTileServerInstance(row, col) + ".mapcreator.tilehub.api.here.com/tilehub/live/map/png/",
			qk, "?" , "app_id=", app_id, "&app_code=", app_code, hidpi ? "&ppi=300" : ""].join("");
		}

	});

	var communityTileLayer = new H.map.layer.TileLayer(communityTileProvider);

	// Create community satellite tile provider and layer.
	var communitySatelliteTileProvider = new H.map.provider.ImageTileProvider({
		min: 0,
		max: 20,
		getURL: function(col, row, level) {
			var qk = getQuadkey(col, row, level);

			return [
			"http" + (secure ? "s" : "") + "://" + getTileServerInstance(row, col) + ".mapcreator.tilehub.api.here.com/tilehub/live/sat/png/",
			qk, "?" , "app_id=", app_id, "&app_code=", app_code, hidpi ? "&ppi=300" : ""].join("");
		}

	});

	var communitySatelliteTileLayer = new H.map.layer.TileLayer(communitySatelliteTileProvider);

	// Create community terrain tile provider and layer.
	var communityTerrainTileProvider = new H.map.provider.ImageTileProvider({
		min: 0,
		max: 20,
		getURL: function(col, row, level) {
			var qk = getQuadkey(col, row, level);

			return [
			"http" + (secure ? "s" : "") + "://" + getTileServerInstance(row, col) + ".mapcreator.tilehub.api.here.com/tilehub/live/terrain/png/",
			qk, "?" , "app_id=", app_id, "&app_code=", app_code, hidpi ? "&ppi=300" : ""].join("");
		}

	});

	var communityTerrainTileLayer = new H.map.layer.TileLayer(communityTerrainTileProvider);

	// Add a map entry for the community map.
	var mapSettings = new H.ui.MapSettingsControl({
		baseLayers: [{
			label: "Community map view",
			layer: communityTileLayer
			}, {
			label: "Community satellite",
			layer: communitySatelliteTileLayer
			}, {
			label: "Community terrain",
			layer: communityTerrainTileLayer
			},{
			label: "Map view",
			layer: defaultLayers.vector.normal.map
			}, {
			label: "Satellite",
			layer: defaultLayers.raster.satellite.map
			}]
	});
	var oldMapSettings = ui.removeControl("mapsettings");
	ui.addControl("mapsettings", mapSettings);

	// Default to community map.
	map.setBaseLayer(communityTileLayer);

	// Start app.
	kickoff();

	/**
	* Kicks the app off.
	*/
	function kickoff() {
		addressForm.onsubmit = onAddressSubmit;
		addressInput.focus();
		var q = getParam(window.location.href, "q");
		if (q) {
			q = decodeURI(q);
			addressInput.value = q;
			geocode(q);
		}
	}

	/**
	* Executes action when address form is submitted.
	*/
	function onAddressSubmit(e) {
		if (e) e.preventDefault();
		geocode(addressInput.value);
		window.location.href = addParam(window.location.href, "q", addressInput.value);
	};

	/**
	* Geocodes the given term.
	*/
	function geocode(searchText) {
		geocoder.geocode({
			searchText: searchText,
			maxResults: 1,
			jsonattributes: 1
			}, function(result) {
			processGeocodeResults(result);
			}, function(error) {
			alert(error);
		});
	};

	/**
	* Processes geocoder results.
	*/
	function processGeocodeResults(result) {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		var firstLocation = null;

		if (result.response.view[0].result[0].location != null) {
			firstLocation = result.response.view[0].result[0].location;
			} else {
			firstLocation = result.response.view[0].result[0].place.locations[0];
		}

		var pos = firstLocation.displayPosition;
		var posPoint = new H.geo.Point(pos.latitude, pos.longitude);
		addMarkerToPosition(posPoint);
	};

	/**
	* Adds a marker at the given position.
	*/
	function addMarkerToPosition(pos) {
		if (positionMarker)
		map.removeObject(positionMarker);
		positionMarker = new H.map.Marker(pos, {
			icon: createMarkerIcon()
		});
		map.addObject(positionMarker);
		map.setCenter(pos);
	};

	/**
	* Creates a simple DOM icon.
	*/
	function createMarkerIcon(color) {
		// Define a variable holding SVG mark-up that defines an icon image:
		 var svg = '<svg width="35" height="50" xmlns="http://www.w3.org/2000/svg">'+
		'<path d="M5 30 A 12 12, 0, 1, 1, 28, 30 L 17 47 Z" fill="#48DAD0" stroke="white" stroke-width="2"/>'+
         '<text x="34" y="60" font-size="25pt" ' +
		 'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
		 'fill="white"></text></svg>';
		return  new H.map.Icon(svg);
	};

	/**
	* Computes quadkey from X/Y/Z.
	*/
	function getQuadkey(x, y, zoom) {
		var quad = "";
		for (var i = zoom; i > 0; i--) {
			var mask = 1 << (i - 1);
			var cell = 0;
			if ((x & mask) != 0)
			cell++;
			if ((y & mask) != 0)
			cell += 2;
			quad += cell;
		}
		return quad;
	};

	/**
	* Gets a URL param (based on http://stackoverflow.com/a/979997/3505695).
	*/
	function getParam(url, name) {
		name = name || "";
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(url);
		if (results == null)
		return null;
		else
		return results[1];
	}

	/**
	* Adds a URL param (based on http://stackoverflow.com/a/14386004/3505695).
	*/
	function addParam(url, param, value) {
		var a = document.createElement('a'), regex = /[?&]([^=]+)=([^&]*)/g;
		var match, str = [];
		a.href = url;
		value = value || "";
		while (match = regex.exec(a.search))
		if (encodeURIComponent(param) != match[1])
		str.push(match[1] + "=" + match[2]);
		str.push(encodeURIComponent(param) + "=" + encodeURIComponent(value));
		a.search = (a.search.substring(0, 1) == "?" ? "" : "?") + str.join("&");
		return a.href;
	};

	/**
	* Gets the tile server instance from the given row and column.
	*/
	function getTileServerInstance(row, col) {
		return 1 + ((row + col) % 4);
	};