/* 
		author domschuette
		(C) HERE 2020
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

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(50.12353130546709, 8.474707204509514),
		zoom: 11,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);
	
	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	var heatmapProvider = new H.data.heatmap.Provider({
		type: "value",
		colors: new H.data.heatmap.Colors({
			0 :'rgb(51,255,0)',
			0.1: 'rgb(102,255,0)',
			0.2: 'rgb(255,102,0)',
			0.3: 'rgb(153,255,0)',
			0.4: 'rgb(204,255,0)',
			0.5: 'rgb(255,255,0)',
			0.6: 'rgb(255,204,0)',
			0.7: 'rgb(255,102,0)',
			0.8: 'rgb(255,51,0)',
			0.9: 'rgb(255, 0, 0)',
			1.0: 'rgb(0,0,0)'}, true),
		coarseness: 1,
		dataMax: 5,
		min: 10
	});

	var heatmapLayer = new H.map.layer.TileLayer(heatmapProvider, {
		opacity: 0.6
	});

	map.addLayer(heatmapLayer);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
		{ 
			var d = document.getElementById("centerCoordinate"),
				c = map.getCenter(),
				lat = c.lat,
				lon = c.lng;
			d.innerHTML = "" + lat + " " + lon + " @" + map.getZoom();
		}
	);
	
	map.addEventListener("mapviewchangeend", function() 
		{ 
			requestTraffic(map.getViewBounds());
		}
	);
	
	requestTraffic = function(bbox)
	{
		var url = "http" + (secure ? "s" : "") + "://traffic.api.here.com/traffic/6.1/flow.json?app_id=" + app_id + "&app_code=" + app_code + 
				  "&bbox=" + bbox.getTop() + ',' + bbox.getLeft() + ";" + 
				  bbox.getBottom() + "," + bbox.getRight() + 
				  "&i18n=true&responseattributes=simplifiedShape&units=metric&jsoncallback=updateTraffic";
	  
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	}
	
	updateTraffic = function(response)
	{
	
		dataPoints = new Array(), 
			i = 0,
			j = 0,
			k = 0,
			l = 0, 
			m = 0,
			n = 0;
		heatmapProvider.clear();
		
		if(response.RWS)
		{
			for(i = 0; i < response.RWS.length; i++)
			{
				if(response.RWS[i].RW)
				{
					for(j = 0; j < response.RWS[i].RW.length; j++)
					{
						if(response.RWS[i].RW[j].FIS)
						{
							for(k = 0; k < response.RWS[i].RW[j].FIS.length; k++)
							{
								if(response.RWS[i].RW[j].FIS[k])
								{
									for(l = 0; l < response.RWS[i].RW[j].FIS[k].FI.length; l++)
									{
										var FI = response.RWS[i].RW[j].FIS[k].FI[l],
											shp, 
											JF,
											point;
									
										if(FI.SHP && FI.CF)
										{
											//! TODO why is CF an Array, might this should be changed
											JF = FI.CF[0].JF;
											for(m = 0; m < FI.SHP.length; m++)
											{
												var debugpoints = new Array(); 
												shp = FI.SHP[m].value[0].trim().split(" ");
												for(n = 0; n < shp.length; n++)
												{
													point = shp[n].split(',');
													dataPoints.push({'lat': point[0], 'lng': point[1], 'value': JF})
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		heatmapProvider.clear();
		// Add specified data to the heat map
		heatmapProvider.addData(dataPoints);
	}