/*
	(C) HERE 2019
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(),
	router = platform.getRoutingService(),
    tableData = new Array(),
    group = new H.map.Group(),

	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: new H.geo.Point(50.89707321010794,4.411075282841921),
			zoom: 13
		}
	);
    
    map.addObject(group);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseRoutingShown = false;

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	
    var allPolylines = new H.map.Group();
    map.addObject(allPolylines);


    var startWps = [
        "50.885145755516696,4.46324905313503",
        "50.90855323601063,4.437393505096708",
        "50.912346105079294,4.375544266646443",
        "50.91339122761129,4.35636647219016",
        "50.90709646153618,4.369549529498244",
        "50.89724163381905,4.39485885376277",
        "50.907708724947476,4.404276089614115",
        "50.87442510251702,4.454551415389631"
	];
	var destinationWps = [
        "50.885145755516696,4.46324905313503",
        "50.90855323601063,4.437393505096708",
        "50.912346105079294,4.375544266646443",
        "50.91339122761129,4.35636647219016",
        "50.90709646153618,4.369549529498244",
        "50.89724163381905,4.39485885376277",
        "50.907708724947476,4.404276089614115",
        "50.87442510251702,4.454551415389631"
	];


	function addColumOnClick(tableId){
		var tableCols="#"+tableId+" td";
		
		 $(tableCols).hover(function() {
        $(this).css('cursor','pointer');
    });

		
		$(tableCols).click(function() {     

			var column_num = parseInt( $(this).index() ) + 1;
			var row_num = parseInt( $(this).parent().index() )+1;
			
			$("#result").html( "Row_num =" + row_num + "  ,  Column_num ="+ column_num );
            group.removeAll();
            
            var start = new H.geo.Point(startWps[row_num - 2].split(",")[0], startWps[row_num - 2].split(",")[1]),
                dest = new H.geo.Point(destinationWps[column_num - 2].split(",")[0], destinationWps[column_num - 2].split(",")[1]);
			calculateRouteDirect(start, dest);
		});
		
	}
  
  var createSvgMarkerIconWithImg = function (line1, txtColor) {
	var textColor = txtColor ? txtColor : "#000000";
	var ua = navigator.userAgent.toLowerCase();
	var svg =
	'<svg style="margin-left: -21px;margin-top: -48px;" width="220" height="150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  >' +
		'<g>' +
		'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="40" width="170" x="40" fill="#ffffff"/>' +
		'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" stroke-width="0" fill="__textColor__" x="45" y="3">__line1__</text>'+
		'<image width="50" height="50"   overflow="visible" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
		'</g>' +
		'</svg>';


	svg = svg.replace(/__line1__/g, line1);
	svg = svg.replace(/__textColor__/g, textColor);

	return new H.map.DomIcon(svg);
};

  
  
  var point = {
	  lat: destinationWps[0].split(",")[0],
	  lng: destinationWps[0].split(",")[1]
	};
	
  var marker = new H.map.DomMarker(point);			
	allPolylines.addObject(marker);


	var Requests = {};

	function calculateMtxRoute()
	{
		var urlRoutingReq = 
					["https://matrix.route.ls.hereapi.com",
					"/routing/7.2/calculatematrix.json",
					"?apikey=",
					api_key,
					"&start0=" + startWps[0],
					"&start1=" + startWps[1],
					"&start2=" + startWps[2],
					"&start3=" + startWps[3],
					"&start4=" + startWps[4],
                    "&start5=" + startWps[5],
                    "&start6=" + startWps[6],
                    "&start7=" + startWps[7],
					"&destination0=" + destinationWps[0],
					"&destination1=" + destinationWps[1],
					"&destination2=" + destinationWps[2],
					"&destination3=" + destinationWps[3],
					"&destination4=" + destinationWps[4],
                    "&destination5=" + destinationWps[5],
                    "&destination6=" + destinationWps[6],
                    "&destination7=" + destinationWps[7],
					"&mode=fastest;car;traffic:enabled",
					"&matrixAttributes=ix,su",
					"&summaryattributes=all",
					"&jsoncallback=onMatrixCalculated"
					].join("");

			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}


	var calculateRouteDirect = function(start, destination)
	{
		console.log(destination);
		var urlRoutingReq = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+
			start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +"&departure=now&routeattributes=sh,lg&legattributes=li&linkattributes=nl,fc&mode=fastest;" +
			"car;traffic:enabled&apikey=" + api_key + "&jsoncallback=gotRoutingResponse";

			line1 = start.lat + " " + start.lng;
			line2="";
		marker = new H.map.Marker(start,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
					
		line1 = destination.lat + " " + destination.lng;
		line2="";
		marker = new H.map.Marker(destination,
					{
						icon: createIconMarker(line1, line2)
					});

					group.addObject(marker);
		
		
		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);
	}
    
  function travelTimeToHMMSS(time)
  {
    var hours = Math.floor(time / 3600);
    time -= hours * 3600;   

    var minutes = Math.floor(time / 60);
    time -= minutes * 60;

    var seconds = parseInt(time % 60, 10);

    return "" + (hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds));
  }

  function onMatrixCalculated(r){
	if (r && r.response) {
            	var table = document.getElementById("TABLE");
                
    tableData.push(["", "1", "2", "3", "4", "5", "6", "7", "8"]);
    tableData.push(["1",r.response.matrixEntry[0].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[0].summary.travelTime),
                        r.response.matrixEntry[1].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[1].summary.travelTime),
                        r.response.matrixEntry[2].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[2].summary.travelTime),
                        r.response.matrixEntry[3].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[3].summary.travelTime),
                        r.response.matrixEntry[4].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[4].summary.travelTime),
                        r.response.matrixEntry[5].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[5].summary.travelTime),
                        r.response.matrixEntry[6].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[6].summary.travelTime),
                        r.response.matrixEntry[7].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[7].summary.travelTime)
                        ]);
    tableData.push(["2",r.response.matrixEntry[8].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[8].summary.travelTime),
                        r.response.matrixEntry[9].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[9].summary.travelTime),
                        r.response.matrixEntry[10].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[10].summary.travelTime),
                        r.response.matrixEntry[11].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[11].summary.travelTime),
                        r.response.matrixEntry[12].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[12].summary.travelTime),
                        r.response.matrixEntry[13].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[13].summary.travelTime),
                        r.response.matrixEntry[14].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[14].summary.travelTime),
                        r.response.matrixEntry[15].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[15].summary.travelTime)
                        ]);                        
    tableData.push(["3",r.response.matrixEntry[16].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[16].summary.travelTime),
                        r.response.matrixEntry[17].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[17].summary.travelTime),
                        r.response.matrixEntry[18].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[18].summary.travelTime),
                        r.response.matrixEntry[19].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[19].summary.travelTime),
                        r.response.matrixEntry[20].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[20].summary.travelTime),
                        r.response.matrixEntry[21].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[21].summary.travelTime),
                        r.response.matrixEntry[22].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[22].summary.travelTime),
                        r.response.matrixEntry[23].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[23].summary.travelTime)
                        ]);                        
    tableData.push(["4",r.response.matrixEntry[24].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[24].summary.travelTime),
                        r.response.matrixEntry[25].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[25].summary.travelTime),
                        r.response.matrixEntry[26].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[26].summary.travelTime),
                        r.response.matrixEntry[27].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[27].summary.travelTime),
                        r.response.matrixEntry[28].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[28].summary.travelTime),
                        r.response.matrixEntry[29].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[29].summary.travelTime),
                        r.response.matrixEntry[30].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[30].summary.travelTime),
                        r.response.matrixEntry[31].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[31].summary.travelTime)
                        ]);                        
    tableData.push(["5",r.response.matrixEntry[32].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[32].summary.travelTime),
                        r.response.matrixEntry[33].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[33].summary.travelTime),
                        r.response.matrixEntry[34].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[34].summary.travelTime),
                        r.response.matrixEntry[35].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[35].summary.travelTime),
                        r.response.matrixEntry[36].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[36].summary.travelTime),
                        r.response.matrixEntry[37].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[37].summary.travelTime),
                        r.response.matrixEntry[38].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[38].summary.travelTime),
                        r.response.matrixEntry[39].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[39].summary.travelTime)
                        ]);                        
    tableData.push(["6",r.response.matrixEntry[40].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[40].summary.travelTime),
                        r.response.matrixEntry[41].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[41].summary.travelTime),
                        r.response.matrixEntry[42].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[42].summary.travelTime),
                        r.response.matrixEntry[43].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[43].summary.travelTime),
                        r.response.matrixEntry[44].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[44].summary.travelTime),
                        r.response.matrixEntry[45].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[45].summary.travelTime),
                        r.response.matrixEntry[46].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[46].summary.travelTime),
                        r.response.matrixEntry[47].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[47].summary.travelTime)
                        ]);                      
    tableData.push(["7",r.response.matrixEntry[48].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[48].summary.travelTime),
                        r.response.matrixEntry[49].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[49].summary.travelTime),
                        r.response.matrixEntry[50].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[50].summary.travelTime),
                        r.response.matrixEntry[51].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[51].summary.travelTime),
                        r.response.matrixEntry[52].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[52].summary.travelTime),
                        r.response.matrixEntry[53].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[53].summary.travelTime),
                        r.response.matrixEntry[54].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[54].summary.travelTime),
                        r.response.matrixEntry[55].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[55].summary.travelTime)
                        ]);                      
    tableData.push(["8",r.response.matrixEntry[56].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[56].summary.travelTime),
                        r.response.matrixEntry[57].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[57].summary.travelTime),
                        r.response.matrixEntry[58].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[58].summary.travelTime),
                        r.response.matrixEntry[59].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[59].summary.travelTime),
                        r.response.matrixEntry[60].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[60].summary.travelTime),
                        r.response.matrixEntry[61].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[61].summary.travelTime),
                        r.response.matrixEntry[62].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[62].summary.travelTime),
                        r.response.matrixEntry[63].summary.distance + "m" + "</br>" + travelTimeToHMMSS(r.response.matrixEntry[63].summary.travelTime)
                        ]);                      

	table.innerHTML = "";
	var columnCount = tableData[0].length;
	
	var row = table.insertRow(-1);
    for (var i = 0; i < columnCount; i++) {
        var headerCell = document.createElement("TH");
        headerCell.innerHTML = tableData[0][i];
        row.appendChild(headerCell);
    }
 
    //Add the data rows.
    for (var i = 1; i < tableData.length; i++) {
        row = table.insertRow(-1);
        for (var j = 0; j < columnCount; j++) {
            var cell = row.insertCell(-1);
            cell.innerHTML = tableData[i][j];
       		
        }
    }

	var dvTable = document.getElementById("dvTable");
    dvTable.innerHTML = "";
    dvTable.appendChild(table);
	
	addColumOnClick("TABLE");
	tableData = [];
	
		  var that = this,
			l = 0,
			results = {},
			response = r.response.matrixEntry,
			request = r.request,
			metric = "km",
			params = {
			};
	
	
		  response.sort(function(a1,a2){
			var
			  summary1 = a1.summary,
			  summary2 = a2.summary,
			  dTravelTime = summary1.travelTime - summary2.travelTime,
			  dCostFactor = summary1.costFactor - summary2.costFactor;
			  
			  if(dTravelTime == 0){
				return dCostFactor;
			  }else{
				return dTravelTime;
			  }
		  });
		  
		  for(var i=0,lR=response.length; i<lR; i++){
			  var item = response[i],
	
				summary = item.summary,
				t = r.response.matrixEntry[0].summary.travelTime,
				d = summary.distance/1000,
				c = summary.costFactor,
				//s = " " + Math.floor(t /60) + " min" + " <br /> " + d + " " + metric + " <br /> " + c + " cost factor";
				s = "<tspan x='50' dy='1.0em'>" + Math.floor(t /60) + " min" + "</tspan><tspan x='50' dy='1.0em'>" + d + " " + metric + "</tspan><tspan x='50' dy='1.0em'>" + c + " cost factor</tspan>";
		
			  if(t==0 && d==0){s = "";}
			  
			  
			  if(s !== ""){
				var currStart = startWps[item.startIndex];
				var point = new H.geo.Point(currStart.split(",")[0], currStart.split(",")[1]);
				
				var nameFunc = "onRouteCalculated"+i;
				Requests[nameFunc] = parseRoute.bind({
				  text: s,
				  rIdx:i
				});
				calculateSimpleRoute(currStart, destinationWps[item.destinationIndex], nameFunc);
			  }
		  }
	
	    }
	
	}

	// parse the routing response
	var gotRoutingResponse = function (respJsonRouteObj)
	{
		if (respJsonRouteObj.error != undefined)
		{
			alert (respJsonRouteObj.error);
			feedbackTxt.innerHTML = respJsonRouteObj.error;
			return;
		}

		var strip = new H.geo.LineString(),
		shape = respJsonRouteObj.response.route[0].shape,
		i,
		l = shape.length;

		for(i = 0; i < l; i++)
		{
			strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
		}

		var polyline = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 5,
					strokeColor: "rgb(255,0,0)",
					lineJoin: "round"
				}
			});
           
           group.setZIndex(10);

			group.addObject(polyline);

			
	}

	function parseRoute(result){
	  //console.log("onRouteCalculated:: ", this, result);

	  var strip = new H.geo.LineString(),
		route = result.response.route[0],
	  shape = route.shape,
	  i,
	  l = shape.length;

	  for(i = 0; i < l; i++)
	  {
		  strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
	  }
	  var polyline = new H.map.Polyline(strip,
		  {
			  style:
			  {
				  lineWidth: 1,
				  strokeColor: "rgba(0, 0, 255, 0.3)"
			  }
		  });
          
	  
		  
	var point = {
	  lat: route.waypoint[0].mappedPosition.latitude,
	  lng: route.waypoint[0].mappedPosition.longitude
	};
	
  var marker = new H.map.Marker(point);			
	allPolylines.addObject(marker);
		  allPolylines.addObject(polyline);
		   map.getViewModel().setLookAtData({
				bounds: allPolylines.getBoundingBox()
			});
		 
			  
	}

	function calculateSimpleRoute(wp0, wp1, nameFunc)
	{
		var urlRoutingReq = 
					["https://route.api.here.com",
					"/routing/7.2/calculateroute.json",
					"?",
					  [
						["app_id",app_id].join("="),
						["app_code",app_code].join("="),
						["waypoint0",wp0].join("="),
						["waypoint1",wp1].join("="),
						["mode","fastest;car;traffic:enabled"].join("="),
						["representation","display"].join("="),
						["jsoncallback","Requests."+nameFunc].join("=")
					  ].join("&")
					].join("");

			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line1);
		svgMarker = svgMarker.replace(/__width__/g, line1.length * 5 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, line1.length * 4 + 200);

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	}


	var displayReady = function(e)
	{
		map.removeEventListener("mapviewchangeend", displayReady);
		calculateMtxRoute();
	};

	map.addEventListener("mapviewchangeend", displayReady);