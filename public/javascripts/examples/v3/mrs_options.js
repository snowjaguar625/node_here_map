/*
	author domschuette
	(C) HERE 2014
	*/

	// helper to remove duplicates from an array
	Array.prototype.uniq = function uniq() {
		return this.reduce(function(accum, cur) {
			if (accum.indexOf(cur) === -1) accum.push(cur);
			return accum;
		}, [] );
	}

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	basemaptileService = platform.getMapTileService({'type': 'base'});
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),

	aerialmaptileService = platform.getMapTileService({'type': 'aerial'}),
	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: zoom
		}
	),
	schemes = new Array,
	tiletypes = new Array,
	languages = new Array,
	formats = new Array,
	pviews = new Array,
	infoAvailable = false,
	pViewsAvailable = false;

	// add behavior to the map
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);


	var ui = H.ui.UI.createDefault(map, maptypes);

	// Remove not needed settings and panorama control
	ui.removeControl('mapsettings');
	ui.removeControl("panorama");
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// callbacks for the map tiler info
	basemaptileService.addEventListener("infoupdate", info);
	aerialmaptileService.addEventListener("infoupdate", info);
	getPoliticalViews();
	
	function getPoliticalViews()
	{
		var url = [secure ? "https://" : "http://", 
				   "1.base.maps.api.here.com/maptile/2.1/meta/pviews?",
				   "app_id=", 
				   app_id, 
				   "&app_code=",
				   app_code,
				   "&output=json",
				   "&callback_func=gotPViews"].join("");

		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}
	
	function gotPViews(obj)
	{
		pViewsAvailable = true;
		
		// push allways international view
		pviews.push("INT");
		
		var t = eval("(" + obj + ')').pviews;
		
		for(var i = 0; i < t.length; i++)
			pviews.push(t[i]);
		
		if(infoAvailable && pViewsAvailable)
		{
			setupUi(schemes.uniq().sort(), tiletypes.uniq().sort(), languages.uniq().sort(), formats.uniq().sort(), pviews.uniq().sort());
			changeTileProvider();
		}
	}

	function info(e)
	{
		tileService = e.currentTarget;
		info = tileService.getInfo();
		t = info.schemes
		for(key in t)
			schemes.push(key);
		t = info.formats
		for(key in t)
			formats.push(key);
		t = info.tiletypes;
		for(key in t)
			tiletypes.push(key);
		t = info.languages;
		for(key in t)
			languages.push(key);
		infoAvailable = true;
		if(infoAvailable && pViewsAvailable)
		{
			setupUi(schemes.uniq().sort(), tiletypes.uniq().sort(), languages.uniq().sort(), formats.uniq().sort(), pviews.uniq().sort());
			changeTileProvider();
		}
	}

	// helper for html#select
	function getOptions(arr)
	{
		var ret = "";
		for(var i = 0; i < arr.length; i++)
		{
			selected = "";
			if(arr[i] == "ENG" || arr[i] == "maptile" || arr[i] == "normal.day" || arr[i] == "png8" || arr[i] == "INT")
				selected = "selected";

			ret += '<option value="' + arr[i] + '" ' + selected + '>' + arr[i] + '</option>';
		}
		return ret;
	}

	// enables the ui after the event "infoupdate" is fired
	function setupUi(schemes, tiletypes, languages, formats, pviews)
	{
		contentNode = document.getElementById("content");
		contentNode.innerHTML = '<tr>' +
			'<td>Schema: </td>' +
			'<td><select id="schema" onchange="changeTileProvider()">>' +
			getOptions(schemes) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>Tile Type: </td>' +
			'<td><select id="tiletype" onchange="changeTileProvider()">>' +
			getOptions(tiletypes) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>Language 1: </td>' +
			'<td><select id="language1" onchange="changeTileProvider()">>' +
			getOptions(languages) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>Language 2: </td>' +
			'<td><select id="language2" onchange="changeTileProvider()">>' +
			'<option value="">none</option>' + getOptions(languages) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>Format: </td>' +
			'<td><select id="format" onchange="changeTileProvider()">>' +
			getOptions(formats) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>Political View: </td>' +
			'<td><select id="pview" onchange="changeTileProvider()">>' +
			getOptions(pviews) +
			'</select>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td>320dpi</td>' +
			'<td><input type="checkbox" id="ppi" onchange="changeTileProvider()"></td>' +
			'</tr>' +
			'<tr>' +
			'<td>Pois</td>' +
			'<td><input type="checkbox" id="pois" onchange="changeTileProvider()"></td>' +
			'</tr>' +
			'<tr>' +
			'<td>Congestion</td>' +
			'<td><input type="checkbox" id="congestion" onchange="changeTileProvider()"></td>' +
			'</tr>' +
			'<tr>' +
			'<td>Fleet Style</td>' +
			'<td><input type="checkbox" id="fleet" onchange="changeTileProvider()"></td>' +
			'</tr>';
	}

	// changes the tile provider at runtime, special handling for "style=fleet"
	function changeTileProvider()
	{
		configObj = {};

		tiletype = document.getElementById("tiletype").value;
		schema = document.getElementById("schema").value;
		format = document.getElementById("format").value;
		lg1 = document.getElementById("language1").value;
		lg2 = document.getElementById("language2").value;
		pview = document.getElementById("pview").value;
		pois = document.getElementById("pois").checked;
		congestion = document.getElementById("congestion").checked;
		fleet = document.getElementById("fleet").checked;
		ppi = document.getElementById("ppi").checked;
		document.getElementById("status").innerHTML = "";

		configObj.lg = lg1;
		if(lg2 != "none")
			configObj.lg2 = lg2;
		if(pois)
			configObj.pois = "true";
		if(congestion)
			configObj.congestion = "true";
		if(ppi)
		{
			if(schema == "hybrid.day.mobile" || schema == "carnav.day.grey" || schema == "hybrid.day.mobile" || schema == "normal.day.custom" ||
				schema == "normal.day.grey.mobile" || schema == "normal.day.mobile" || schema == "normal.day.transit.mobile" ||
				schema == "normal.night.grey.mobile" || schema == "normal.day.mobile" || schema == "pedestrian.day.mobile" ||
			schema == "pedestrian.night.mobile" || schema == "satellite.day" || schema == "terrain.day.mobile")
			{
				ppi = false;
				document.getElementById("status").innerHTML = "PPI 320 is not supported in schema: " + schema;
			}
			else
			{
				configObj.ppi = "320";
				document.getElementById("status").innerHTML = "";
			}
		}
		
		if(pview != "INT")
			configObj.pview = pview;

		// fleet is only available in normal. + hybrid.day modes
		if(fleet)
		{
			if(schema != "normal.day" || schema != "hybrid.day")
				schema = "normal.day";
			if(tiletype != "maptile"   || tiletype != "basetile"   ||
				tiletype != "xbasetile" || tiletype != "alabletile" ||
				tiletype != "labletile" || tiletype != "linetile"   ||
			tiletype != "lltile"    || tiletype != "streettile")
			tiletype = "maptile";
			configObj.style = "fleet";
		}

		// get the correct tile service
		maptileService = null;
		if(schema.indexOf("hybrid") != -1 || schema.indexOf("terrain") != -1 || schema.indexOf("satellite") != -1)
		{
			maptileService = aerialmaptileService;
		}
		else
		{
			maptileService = basemaptileService;
		}

		tileLayer = maptileService.createTileLayer(tiletype, schema, ppi ? 512 : 256, format, configObj);
		map.setBaseLayer(tileLayer);
	}