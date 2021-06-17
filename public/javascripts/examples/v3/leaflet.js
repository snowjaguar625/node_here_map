/* 
		author domschuette
		(C) HERE 2016
	*/ 
	
	// helper for layer creation
	createLayer = function (scheme, tiletype)
	{
		var type = 'base';
		if(scheme.indexOf("hybrid") != -1 || scheme.indexOf("terrain") != -1)
		{
			type = 'aerial';
		}
		if(tiletype.indexOf("flowtile") != -1)
		{
			type = 'traffic';
		}
	
		baseUrl = ['https://{s}.',
					type,
					'.maps.api.here.com/maptile/2.1/',
					tiletype,
					'/newest/',
					scheme,
					'/{z}/{x}/{y}/256/png8?app_id=',
					app_id, 
					'&app_code=',
					app_code,
					((tiletype.indexOf('truckonlytile') != -1) ? "&style=fleet" : "")
				  ].join("");
		layer =	L.tileLayer(baseUrl, 
			{
				subdomains: '1234',
				attribution: 'Map data &copy; 2019 <a href="http://www.here.com">HERE</a>' + (scheme.indexOf("hybrid") != -1 ? ', Imagery &copy; 2019 <a href="http://www.digitalglobe.com/">DigitalGlobe</a>' : ''),
				maxZoom: 20
			}
		);
		return layer; 
	}
	
	
	// global variables
	var incidents = L.layerGroup([]);
	var incidentsMap = {};

	var	icons = 
	{
		'incidentGeneric' : '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="31" baseProfile="tiny" viewBox="0 0 26 31"><path fill="#868686" d="M16.995 28.98c0 1.115-1.79 2.02-4 2.02s-4-.905-4-2.02c0-1.118 1.79-2.026 4-2.026s4 .907 4 2.025"/><path fill="{color}" d="M1.702 17.693C.13 16.127.118 13.837 1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.693l-11.29 11.286L1.702 17.693z"/><path fill="#fff" d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213m0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.712.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0zM13.035 16.534c-.754 0-1.365.595-1.365 1.32 0 .73.613 1.326 1.365 1.326s1.363-.595 1.363-1.326c0-.725-.61-1.32-1.363-1.32zm0-1.332c.568 0 1.057-.448 1.088-.993l.365-5.916c.033-.548-.615-.996-1.455-.996-.832 0-1.49.448-1.453.996l.36 5.915c.034.544.526.992 1.095.992z"/></svg>',
		'incidentCongestion' : '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 18,15 0,0 c 0,-0.1 0,-0.2 0,-0.4 l 0,-0.2 c 0,-0.1 0,-0.2 0,-0.4 0,0 0,0 0,0 0.6,0 1.1,-0.4 1.1,-1 0,-0.5 -0.5,-1 -1,-1 -0.7,0 -1.1,0.5 -1.1,1 -0.1,0 -0.3,-0.1 -0.4,-0.1 l -0.6,0 -0.3,-0.5 C 15.2,11.6 14.3,11 13.3,11 L 18,11 17.2,9.6 C 17,9.3 16.7,9 16.3,9 L 12.8,9 C 12.4,9 12,9.3 11.8,9.6 L 11.1,11 9.8,11 C 9.7,11 9.6,11 9.5,11 9.2,11 9,10.9 9,10.6 L 9,10.4 C 9,10.2 9.2,9.9 9.5,9.9 l 1.2,0 0.6,-1.04 c 0.3,-0.5 0.9,-0.9 1.5,-0.9 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1.04 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 18.3,16 18,15.8 18,15.6 L 18,15 z M 8,18.1 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.6,0 -1.1,0.5 -1.1,1 0,0.6 0.5,1.1 1.1,1.1 m 7,0 c 0.6,0 1.1,-0.5 1.1,-1.1 0,-0.5 -0.5,-1 -1.1,-1 -0.5,0 -1,0.5 -1,1 0,0.6 0.5,1.1 1,1.1 M 14.2,13.6 C 14,13.3 13.7,13 13.3,13 L 9.8,13 C 9.4,13 9,13.3 8.8,13.6 L 8.1,15 15,15 14.2,13.6 z m -8.2,1 0,-0.2 c 0,-0.2 0.2,-0.5 0.5,-0.5 l 1.1,0 0.7,-1 C 8.6,12.4 9.2,12 9.8,12 l 3.5,0 c 0.6,0 1.2,0.4 1.5,0.9 l 0.6,1 1.2,0 c 0.2,0 0.4,0.3 0.4,0.5 l 0,0.2 c 0,0.3 -0.2,0.5 -0.4,0.5 l -0.1,0 c 0.3,0.3 0.5,0.7 0.5,1.1 l 0,3.4 c 0,0.2 -0.2,0.4 -0.4,0.4 l -1.1,0 C 15.3,20 15,19.8 15,19.6 L 15,19 8,19 8,19.6 C 8,19.8 7.8,20 7.5,20 l -1,0 C 6.2,20 6,19.8 6,19.6 l 0,-3.4 c 0,-0.4 0.2,-0.8 0.6,-1.1 l -0.1,0 C 6.2,15.1 6,14.9 6,14.6" fill="#ffffff" /></svg>',
		'incidentClosed' : '<svg width="26" height="31" viewBox="0 0 26 31" xmlns="http://www.w3.org/2000/svg"><g fill="none"><g><path d="M16.995 28.98c0 1.116-1.79 2.02-4 2.02s-4-.904-4-2.02c0-1.118 1.79-2.023 4-2.023 2.21-.004 4 .904 4 2.022" fill="#868686"/><path d="M1.675 11.995l8.41-10.098c.772-.9 1.806-1.394 2.914-1.394 1.124 0 2.212.525 2.91 1.404l8.402 10.09c1.602 1.867 1.592 4.052-.027 5.692l-11.29 11.286L1.702 17.693C.13 16.127.118 13.837 1.675 11.995z" id="Shape" fill="{color}"/><path d="M12.998 1.007c.97 0 1.91.445 2.516 1.213l8.41 10.1c1.375 1.602 1.494 3.503 0 5.016l-10.93 10.93-10.936-10.93c-1.392-1.384-1.39-3.374 0-5.016l8.41-10.1c.723-.84 1.642-1.213 2.53-1.213zm0-1.007C11.74 0 10.57.555 9.703 1.563l-8.42 10.112c-1.732 2.047-1.708 4.61.063 6.374L12.28 28.976l.714.713.713-.713 10.93-10.93c1.8-1.82 1.818-4.324.055-6.383L16.288 1.576C15.514.596 14.278 0 12.998 0z" id="Shape" fill="#fff"/><path fill="#fff" d="M9 15h1.5v3.8H9zM16 15h1.5v3.8H16z"/><path d="M20.01 13.965c0 .276-.225.5-.5.5h-13c-.275 0-.5-.224-.5-.5v-2.637c0-.276.225-.5.5-.5h13c.275 0 .5.224.5.5v2.637z" id="Shape" fill="#fff"/><path d="M9.565 11.33l-2.638 2.634h3.107l2.635-2.635H9.564zM16.004 11.33l-2.634 2.634h3.105l2.634-2.635h-3.106z" fill="#D5232F"/></g></g></svg>',
		'incidentConstruction' : '<svg width="26" height="32" xmlns="http://www.w3.org/2000/svg"><path d="m 16.8,29.4 c 0,-1.1 -1.8,-2 -4,-2 -2.2,0 -4.01,0.9 -4.01,2 0,1.1 1.81,2 4.01,2 2.2,0 4,-0.9 4,-2" style="fill:#878787"/><path d="m 24.1,17.8 c 1.6,-1.6 1.6,-3.8 0,-5.7 L 15.8,1.9 C 15,0.998 14,0.498 12.9,0.498 11.8,0.498 10.7,1.1 10,1.9 L 1.7,12.1 c -1.6,1.9 -1.6,4.1 0,5.7 L 12.9,29 24.1,17.8 z" stroke="#fff" stroke-width="1" fill="{color}" /><path d="m 9.24,13.2 -3.7,6.8 1.3,0 2.8,-5.1 1.36,1.5 0,3.6 1.1,0 0,-4 -1.4,-1.6 -1.46,-1.2 z M 14.2,9.5 c 0.7,0 1.3,-0.5 1.3,-1.21 0,-0.7 -0.6,-1.2 -1.3,-1.2 -0.7,0 -1.2,0.5 -1.2,1.2 0,0.71 0.5,1.21 1.2,1.21 m -4.46,0.5 1.06,0 -0.96,2.1 -1,-0.8 0.9,-1.3 z m 2.56,4 -1,-0.7 1,-1.9 0,2.6 z m 6.9,1.7 c -0.4,-0.5 -1.5,-1.1 -2.3,0 -0.2,0.3 -0.6,0.7 -0.9,1.2 l -2.7,-2.1 0,-5 -0.8,-0.7 -3.26,0 -1.5,2.3 7.86,6 C 14.7,18.6 13.8,20 13.8,20 l 6,0 1.5,-1.6 c 0,0 -1.7,-2.2 -2.1,-2.7" fill="#ffffff" /></svg>',
	}

	var normalDay  = createLayer("normal.day", "maptile"),
		hybridDay  = createLayer("hybrid.day", "maptile"),
		terrainDay = createLayer("terrain.day", "maptile"),
		traffic    = createLayer("normal.day", "flowtile"), 
		transport  = createLayer("normal.day", "truckonlytile");
	
	var map = L.map('mapContainer', {
		center: [51.505, -0.09],
		zoom: 10,
		layers: [normalDay]
	});
	
	var baseLayers = 
	{
		"Map": normalDay,
		"Satellite": hybridDay,
		"Terrain": terrainDay
	};

	var overlays = {
		"Traffic": traffic,
		"Incidents": incidents,
		"Transport": transport			
	};

	L.control.layers(baseLayers, overlays).addTo(map);
	L.control.scale().addTo(map);
	
	geocode = function(term, start)
	{
		geoUrl = ["https://geocoder.api.here.com/search/6.2/search.json?", 
				  "searchtext=",
				  term, 
				  "&maxresults=1",
				  "&requestid=",
				  (start ? "start" : "dest"),
				  "&app_id=",
				  app_id, 
				  "&app_code=",
				  app_code,
				  "&jsoncallback=",
				  "geocallback"
				 ].join("");
		
		script = document.createElement("script");
		script.src = geoUrl;
		document.body.appendChild(script);
	}
	
	// globals for start and destination marker and the route shape (polyline)
	var smarker, dmarker, startpos, destpos, rshape;
	
	geocallback = function(response)
	{
		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0])
		{
			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
			
			start = response.Response.MetaInfo.RequestId == "start" ? true : false;
			
			marker = start ? smarker : dmarker;
			if(marker)
			{
				map.removeLayer(marker);
				marker = null;
			}
			label = response.Response.View[0].Result[0].Location.Address.Label;
			marker = L.marker([lat, lng]).addTo(map);
			marker.bindPopup((start ? "<b>Start</b>" : "<b>Destination</b>") + "</br><p>" + label + "</p>")
			map.setView(new L.LatLng(lat, lng), map.getZoom());
			start ? (smarker = marker) : (dmarker = marker);
			
			if(smarker && dmarker)
			{
				routing(smarker.getLatLng().lat, smarker.getLatLng().lng, dmarker.getLatLng().lat, dmarker.getLatLng().lng);
			}
		}
	}
	
	startRouting = function()
	{
		if(!smarker)
			geocode(document.getElementById('start').value, true);
		if(!dmarker)
			geocode(document.getElementById('dest').value, false);
	}
	
	routing = function(slat, slng, dlat, dlng)
	{
		gWeight = parseFloat(document.getElementById("grossWeight").value);
		lWeight = parseFloat(document.getElementById("limitedWeight").value);
		aWeight = parseFloat(document.getElementById("weightPerAxel").value);
		tWeight = parseFloat(document.getElementById("trailerWeight").value);
		h = parseFloat(document.getElementById("height").value);
		w = parseFloat(document.getElementById("width").value);
		l = parseFloat(document.getElementById("length").value);
		
		if(isNaN(gWeight)) gWeight = 0;
		if(isNaN(lWeight)) lWeight = 0;
		if(isNaN(aWeight)) aWeight = 0;
		if(isNaN(tWeight)) tWeight = 0;
		if(isNaN(h)) h = 0;
		if(isNaN(w)) w = 0;
		if(isNaN(l)) l = 0;
	
		routeUrl = 
				["https://route.api.here.com/routing/7.2/calculateroute.json?",
				 "waypoint0=geo!",
				 slat,
				 ",",
				 slng,
				 "&waypoint1=geo!",
				 dlat,
				 ",",
				 dlng,
				 "&representation=overview",
				 "&routeattributes=wp,sc,sm,sh,bb,lg,no",
				 "&instructionformat=html",
				 document.getElementById('hasTrailer').checked ? "&hastraile=true" : "",
				 "&shippedhazardousgoods=", 
				 document.getElementById('explosive').checked ? "explosive," : "",
				 document.getElementById('gas').checked ? "gas," : "",
				 document.getElementById('flammable').checked ? "flammable," : "", 
				 document.getElementById('combustible').checked ? "combustible," : "",
				 document.getElementById('organic').checked ? "organic," : "",
				 document.getElementById('poison').checked ? "poison," : "",
				 document.getElementById('radioActive').checked ? "radioActive," : "",
				 document.getElementById('corrosive').checked ? "corrosive," : "",
				 document.getElementById('poisonousInhalation').checked ? "poisonousInhalation," : "", 
				 document.getElementById('harmfulToWater').checked ? "harmfulToWater," : "",
				 document.getElementById('other').checked ? "other" : "",
				 gWeight > 0 ? ("&permittedgrossweight=" + gWeight) : "",
				 lWeight > 0 ? ("&limitedweight=" + lWeight) : "",
				 aWeight > 0 ? ("&weightperaxle=" + aWeight) : "",
				 tWeight > 0 ? ("&trailerweight=" + tWeight) : "",
				 h > 0 ? ("&height=" + h) : "",
				 w > 0 ? ("&width=" + w) : "",
				 l > 0 ? ("&length=" + l) : "",
				 "&mode=fastest;truck;traffic:enabled",
				 "&app_id=",
				 app_id,
				 "&app_code=",
				 app_code,
				 "&jsoncallback=routingcallback"
				].join("");
		
		script = document.createElement("script");
		script.src = routeUrl;
		document.body.appendChild(script);
	}
	
	routingcallback = function(response)
	{
		if(response && response.response && response.response.route[0] && response.response.route[0].shape)
		{
			shape = response.response.route[0].shape;
			latlngs = new Array();
			for(i = 0; i < shape.length; i++)
			{
				coord = shape[i].split(",");
				lat = coord[0];
				lng = coord[1];
				latlngs.push(new L.LatLng(lat, lng));
			}
			if(rshape)
			{
				map.removeLayer(rshape);
				rshape = null;
			}					
			rshape = L.polyline(latlngs, {color: 'red'}).addTo(map);
			map.fitBounds(rshape.getBounds());
		}
	}
	
	var popup = L.popup();

	onMapClick = function(e)
	{
		rgcurl = 
				 ["https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?",
				 "maxresults=1",
				 "&mode=retrieveAddresses",
				 "&prox=",
				 e.latlng.lat,
				 ",",
				 e.latlng.lng,
				 ",50",
				 "&app_id=",
				 app_id,
				 "&app_code=",
				 app_code,
				 "&jsoncallback=rgccallback"
				 ].join("");
		script = document.createElement("script");
		script.src = rgcurl;
		document.body.appendChild(script);
	}
	
	rgccallback = function(response)
	{
		if(response && response.Response && response.Response.View[0] && response.Response.View[0].Result[0] && response.Response.View[0].Result[0].Location)
		{
			label = response.Response.View[0].Result[0].Location.Address.Label;
			lat = response.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
			lng = response.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
			popup
				.setLatLng(new L.LatLng(lat, lng))
				.setContent(label)
				.openOn(map);
		}
	}

	map.on('click', onMapClick);
	
	incidentcallback = function(response)
	{
		if(response && response.TRAFFIC_ITEMS && response.TRAFFIC_ITEMS.TRAFFIC_ITEM)
		{
			items = response.TRAFFIC_ITEMS.TRAFFIC_ITEM;
			i = items.length;
			while(i--) {
				item = items[i];
				id = item.TRAFFIC_ITEM_ID;
				
				if (this.incidentsMap[id]) 
				{
					continue;
				}
				
				if (item.LOCATION && item.LOCATION.GEOLOC && item.LOCATION.GEOLOC.ORIGIN) {
					coord = new L.LatLng(item.LOCATION.GEOLOC.ORIGIN.LATITUDE, item.LOCATION.GEOLOC.ORIGIN.LONGITUDE);
					tooltipContent = "";
					
					if (item.TRAFFIC_ITEM_DESCRIPTION) {
						tooltipContent += item.TRAFFIC_ITEM_DESCRIPTION[1].value + "<br/>";
					}
						
					if (item.CRITICALITY && item.CRITICALITY.DESCRIPTION) { 
						tooltipContent += "Factor" + " : " + item.CRITICALITY.DESCRIPTION; 
					}

					var closed = false;
					if(items[i].TRAFFIC_ITEM_DETAIL && items[i].TRAFFIC_ITEM_DETAIL.ROAD_CLOSED)
						closed = true;
					
					var color = "";
					if(item.CRITICALITY.DESCRIPTION === "major")
						color = "#D5232F";
					else if(item.CRITICALITY.DESCRIPTION === "minor")
						color = "#ffa100";
					else 
						color = "#000";
					
					var svgString = ""; 
					
					if(item.TRAFFIC_ITEM_TYPE_DESC == "CONGESTION")
					{
						svgString = icons["incidentCongestion"];
					}
					else if(item.TRAFFIC_ITEM_TYPE_DESC == "CONSTRUCTION")
					{
						svgString = icons["incidentConstruction"];
					}
					else if(item.TRAFFIC_ITEM_TYPE_DESC == "MISCELLANEOUS" && closed == true)
					{
						svgString = icons["incidentClosed"];
					}
					else
					{
						svgString = icons["incidentGeneric"];
					}
					
					svgString = svgString.replace('{color}', color);
					
					var trafficicon = L.icon({
						iconUrl: "data:image/svg+xml;base64," + btoa(svgString), 
						iconSize: [25, 30],
						iconAnchor: [12, 30],
						popupAnchor: [0, 0]
					});

					m = L.marker(coord, {icon: trafficicon});
					m.bindPopup("<b><p>" + tooltipContent + "</p></b>")
					
					incidentsMap[id] = m;	
					incidents.addLayer(m);
				}
			}
		}
	}
	
	incidentController = function()
	{
		bounds = map.getBounds();
		incurl = 
				["https://traffic.api.here.com/traffic/6.1/incidents.json?",
				 "app_id=",
				 app_id, 
				 "&app_code=",
				 app_code,
				 "&bbox=",
				 bounds.getNorth(),
				 ",",
				 bounds.getEast(),
				 ";",
				 bounds.getSouth(),
				 ",",
				 bounds.getWest(),
				 "&jsoncallback=incidentcallback"
				].join("");
		script = document.createElement("script");
		script.src = incurl;
		document.body.appendChild(script);
	}
	
	overlayAdd = function(e)
	{
		if(e.name == "Incidents")
		{
			incidentController();
			map.addEventListener('moveend', incidentController);
		}
	}
	
	overlayRemove = function(e)
	{
		if(e.name == "Incidents")
		{
			map.removeEventListener('moveend', incidentController);
			incidents.clearLayers();
			incidentsMap = null; 
		}
	}
	
	map.on('overlayadd', overlayAdd);
	map.on('overlayremove', overlayRemove);

	onLocationFound = function(e) {
		var radius = e.accuracy / 2;

		L.marker(e.latlng).addTo(map)
			.bindPopup("You are within " + radius + " meters from this point").openPopup();

		L.circle(e.latlng, radius).addTo(map);
	}

	onLocationError = function(e) {
		console.info(e.message);
	}

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);
	map.zoomControl.setPosition('topright');
	map.locate({setView: true, maxZoom: 16});