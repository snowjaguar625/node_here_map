/*
        author domschuette
        (C) HERE 2018
	*/
    
    var map,
        group, 
        geocoder,
        pointA,
        pointB,
        router,
        bLongClickUseForStartPoint = true,
		colorCar = {red: 148, green: 62, blue: 96, alpha: .8 }; 
		colorPedestrian = {red: 96, green: 96, blue: 96, alpha: 1 };;
       
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure
	});
	
	// define globals
	var defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	geocoder = platform.getGeocodingService(),
	start = document.getElementById("start"),
	dest = document.getElementById("dest"),
	router = platform.getRoutingService(),
	connections = new Array(),
	groups = {},
	mgroup = new H.map.Group(),
	maneuvers = {};

	// Instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, {
		center: center,
		zoom: zoom,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	map.addObject(mgroup);
	
    /********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	var handleLongClickInMap = function(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
		geocode(lastClickedPos.lat + "," + lastClickedPos.lng, bLongClickUseForStartPoint);
		if(!bLongClickUseForStartPoint)
		{
			document.getElementById("dest").value = lastClickedPos.lat + "," + lastClickedPos.lng;
			for(g in groups)
				groups[g].removeAll();
			mgroup.removeAll();
		}
		else
		{
			document.getElementById("start").value = lastClickedPos.lat + "," + lastClickedPos.lng;
		}
		bLongClickUseForStartPoint = bLongClickUseForStartPoint ? false : true; 
	};
	
	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);
    
    var route = function()
    {
		for(g in groups)
			groups[g].removeAll();
		mgroup.removeAll();
		geocode(start.value, true);
    };
    
    var geocode = function(searchTerm, start)
	{
		geocoder.search(
			{
				searchText: searchTerm
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition
				}
				if(start)
					pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
				else
					pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

				if(result.Response.View[0].Result[0].Location != null)
				{
					address = result.Response.View[0].Result[0].Location.Address;
				}
				else
				{
					address = result.Response.View[0].Result[0].Place.Locations[0].Address;
				}
				
				var line1 = address.Label ? address.Label : "",
					line2 = pos.Latitude + " " + pos.Longitude;
				
				var marker = new H.map.Marker(start ? pointA : pointB,
					{
						icon: createIconMarker(line1, line2)
					});

				mgroup.addObject(marker);
				if(start)
					geocode(dest.value, false);
				else
					calculateRoute(pointA, pointB);
			},
			function(error) {
				alert(error);
			}
		);
	};
    
    var calculateRoute = function(pointA, pointB)
    {
        // get the date and time: 
        var date = document.getElementById("date").value,
            time = document.getElementById("time").value,
            depature = date + "T" + time + ":00"
			
		var url = 
            [
                "https://mobility.api.here.com/",
                "v1/",
                "route.json?",
                "app_id=",
                app_id,
                "&app_code=",
                app_code,
                "&profile=parkandride"
            ].join("");
			
		var data = '{"arr":"' + pointB.lat + ',' + pointB.lng + '","car_change_strategy":"' + document.getElementById("strategy").value + '","dep":"' + pointA.lat + ',' + pointA.lng + '","graph":\"1\","maneuvers":\"1\","routing":"all","time":"' + depature + '"}';
		
        $.ajax({ 
			url: url, 
			async: true, 
			type: 'post',
			data: data,
            success: parsePandRResponse,
            error: function(xhr, status, e) {
                var errorResp = (xhr.responseJSON.issues[0] || { "message": "unknown error occured" });
                feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font><br/>";
            }
        });
    };
    
    var parsePandRResponse = function(response)
    {
        if(response && response.Res && response.Res.Connections && response.Res.Connections.Connection)
        {
			var l = 0,
				i = 0,
				html = '';
				
			connections = new Array(),
			maneuvers = {},
			groups = {};
			
			// store connections
            l = response.Res.Connections.Connection.length;
            for(;i < l; i++)
            {
				connections.push(response.Res.Connections.Connection[i]);
				groups[i] = new H.map.Group();
				if(i == 0)
				{
					groups[i].$shown = true;
					map.addObject(groups[i]);
				}
				else
				{
					groups[i].$shown = false;
				}
			}
			
			// store maneuvers, duplicate multiple section id's
			i = 0,
			l = response.Res.Guidance.Maneuvers.length;
			
			for(; i < l; i++)
			{
				var ids = response.Res.Guidance.Maneuvers[i].sec_ids,
					idsSplit = ids.split(" ");
				if(idsSplit.length > 1)
				{
					for(var j = 0; j < idsSplit.length; j++)
					{
						maneuvers[idsSplit[j]] = response.Res.Guidance.Maneuvers[i];
					}
				}
				else
				{
					maneuvers[ids] = response.Res.Guidance.Maneuvers[i];
				}
			}
			
			// iterate over the connections
			i = 0,
			l = connections.length;
			
			for(; i < l; i++)
			{
				var connection = connections[i],
					sections = connection.Sections.Sec,
					i1 = 0,
					l1 = sections.length,
					group = groups[i],
					duration = moment.duration(connection.duration);
				
				html += '<tr onclick="selectConnection(' + i + ');" id="connection_' + i + '"><td>' + duration.hours() + ' hours ' + duration.minutes() + ' minutes ' + duration.seconds() + ' seconds' + '</td><td><ul class="segments" id="' + i + '">';
					
				// iterate over the sections
				for(; i1 < l1; i1++)
				{
					var section = sections[i1],
						secId = section.id, 
						sectionManeuver = maneuvers[secId];

					html += '<li class="' + getTransitDesc(section.mode) +'"></li>';
					
					// check if we find this section id in maneuvers
					if(sectionManeuver)
					{
						var i2 = 0,
							l2 = sectionManeuver.Maneuver.length;
						
						for(; i2 < l2; i2++)
						{
							var maneuver = sectionManeuver.Maneuver[i2],
								shape = maneuver.graph.split(" "),
								strip = new H.geo.Strip(),
								i3 = 0,
								l3 = shape.length,
								color = (section.Dep.Transport && section.Dep.Transport.At && section.Dep.Transport.At.color) ? section.Dep.Transport.At.color : "#303030";
							
							if(section.mode == 20)
								color = "#606060";
							else if(section.mode == 21)
								color = "rgba(155, 43, 86, 0.9)";
							
							for(; i3 < l3; i3++)
							{
								strip.pushLatLngAlt.apply(strip, shape[i3].split(',').map(function(item) { return parseFloat(item); }));
							}
							
							if(l3 > 1)
							{
								var polyline = new H.map.Polyline(strip, {style: {lineWidth: 4, strokeColor: color}});
								if(section.mode == 21)
									polyline.setArrows({fillColor: 'rgba(255, 255, 255, 1)', frequency: 3});
								group.addObject(polyline);
							}
							else
							{
								// check the activity
								if(section && section.Arr && section.Arr.Activities && section.Arr.Activities.Act && section.Arr.Activities.Act[0].type == "parking")
								{
									var marker = new H.map.Marker(strip.extractPoint(0), 
									{
										icon: new H.map.Icon("/assets/icons/parking-icon.gif")
									});
									group.addObject(marker);
								}
							}
						}
					}
					else
					{
						if(section && section.Journey && section.Journey.Stop)
						{
							var stops = section.Journey.Stop,
								i2 = 0, 
								l2 = stops.length,
								strip = new H.geo.Strip(),
								color = (section.Dep.Transport && section.Dep.Transport.At && section.Dep.Transport.At.color) ? section.Dep.Transport.At.color : "#303030",
								icon_stop = new H.map.Icon("/assets/icons/stop_icon.png"),
								icon_transfer = new H.map.Icon("/assets/icons/transfer.png");
							
							for(; i2 < l2; i2++)
							{
								if(i2 == 0 || i2 == (l2-1) )
									group.addObject(new H.map.Marker(new H.geo.Point(stops[i2].Stn.y, stops[i2].Stn.x), { icon: icon_transfer}));
								else
									group.addObject(new H.map.Marker(new H.geo.Point(stops[i2].Stn.y, stops[i2].Stn.x), { icon: icon_stop}));
								
								strip.pushLatLngAlt(stops[i2].Stn.y, stops[i2].Stn.x, 0);
							}
							
							if(l2 > 1)
							{
								var polyline = new H.map.Polyline(strip, {style: {lineWidth: 4, strokeColor: color}});
								group.addObject(polyline);
							}						
						}
					}
				}
				html += '</ul></td></tr>';
			}
			document.getElementById('connections_table').innerHTML = html;
			document.getElementById('connection_0').style.border = "outset";
			document.getElementById('connection_0').style.borderWidth = "2px";
			document.getElementById('connection_0').style.borderColor = "#48dad0";
			map.setViewBounds(groups[0].getBounds());
        }        
    }
	
	var selectConnection = function(i)
	{
		var group = groups[i],
			h = 0;
		
		for(g in groups)
		{
			h++;
			if(groups[g].$shown)
			{
				map.removeObject(groups[g]);
				groups[g].$shown = false;
			}
		}
		
		for(var j = 0; j < h; j++)
		{
			document.getElementById('connection_' + j).style.border = "none";
			document.getElementById('connection_' + j).style.borderWidth = "";
			document.getElementById('connection_' + j).style.borderColor = "";
		}
				
		document.getElementById('connection_' + i).style.border = "outset";
		document.getElementById('connection_' + i).style.borderWidth = "2px";
		document.getElementById('connection_' + i).style.borderColor = "#48dad0";
		
		map.addObject(group);
		group.$shown = true;
		map.setViewBounds(group.getBounds());
	}
    
    // Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line1.length  * 4 + 60 );
		svgMarker = svgMarker.replace(/__widthAll__/g, line1.length  * 4 + 160);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	};
	
	var getTransitDesc = function(id)
	{
		switch(id)
		{
			case 0:
			case 1:
			case 2:
			case 3:
			case 4: return "rail"; 
			case 5: return "bus";
			case 6: return "ferry";
			case 7: return "metro";
			case 8: return "tram"; 
			case 9: return "bus"; 
			case 10: return "funicular";
			case 11: return "aerial";
			case 12: return "bus";
			case 13: return "monorail";
			case 14: return "flight";
			case 15: 
			case 16: return ""; 
			case 17: return "bike";
			case 18: return "bike share";
			case 19: return "";
			case 20: return "walk"; 
			case 21: return "car";
			case 22: return "car share";
			case 23: return "taxi";
			case 24: return "spaceship";
		}
	}