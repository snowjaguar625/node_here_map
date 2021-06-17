/*
	author domschuette
	(C) HERE 2016
	*/

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	router = platform.getRoutingService(),

	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: center,
			zoom: zoom
		}
	);

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

	// setup the Streetlevel imagery
	platform.configure(H.map.render.panorama.RenderEngine);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	
  var allPolylines = new H.map.Group();
  map.addObject(allPolylines);

	
	var startWps = [
	  "50.14928,8.52773",
	  "50.14136,8.559",
	  "50.13046,8.5732",
	  "50.17979,8.51766",
	  "50.15778,8.55425"
	];
	var destinationWps = [
	  "50.16164,8.53413"
	];



  
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
	
  var marker = new H.map.DomMarker(
	  point,
	  {
		  icon: createSvgMarkerIconWithImg("<tspan x='50' dy='1.0em'>Destination:</tspan><tspan x='50' dy='1.0em'>Am Kronberger Hang 8</tspan><tspan x='50' dy='1.0em'>Schwalbach</tspan>", "rgba(255,0,0,1)")

	  });			
	allPolylines.addObject(marker);


	var Requests = {};

	function calculateMtxRoute()
	{
		var urlRoutingReq = 
					["https://matrix.route.api.here.com",
					"/routing/7.2/calculatematrix.json",
					"?app_id=",
					app_id,
					"&app_code=",
					app_code,
					"&start0="+startWps[0],
					"&start1="+startWps[1],
					"&start2="+startWps[2],
					"&start3="+startWps[3],
					"&start4="+startWps[4],
					"&destination0="+destinationWps[0],
					/*"&destination1=50.16164,8.53413", //if only one destination we don't need to define more destionations with the same coords
					"&destination2=50.16164,8.53413",
					"&destination3=50.16164,8.53413",
					"&destination4=50.16164,8.53413",*/
					"&mode=fastest;car;traffic:disabled",
					"&matrixAttributes=ix,su",
					"&summaryattributes=all",
					"&jsoncallback=onMatrixCalculated"
					].join("");

			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}




  function onMatrixCalculated(r){
	
	
	    if (r && r.response) {
		  //console.log('OnMatrixCalculated: ', r.data);
	
		  var that = this,
			l = 0,
			results = {},
			response = r.response.matrixEntry,
			request = r.request,
			metric = "km",
			params = {
				/*language: r.request.language,
				mode: r.request.mode,
				traffic: r.request.traffic,
				vehicle: r.request.vehicle*/
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
				t = summary.travelTime,
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



	function parseRoute(result){
	  //console.log("onRouteCalculated:: ", this, result);

	  var strip = new H.geo.Strip(),
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
				  lineWidth: 4,
				  strokeColor: this.rIdx === 0 ? "rgba(255, 0, 0, 0.7)" : "rgba(0, 0, 255, 0.7)"
			  }
		  });
		  
		  
	var point = {
	  lat: route.waypoint[0].mappedPosition.latitude,
	  lng: route.waypoint[0].mappedPosition.longitude
	};
	
  var marker = new H.map.DomMarker(
	  point,
	  {
		  icon: createSvgMarkerIconWithImg(this.text)

	  });			
	allPolylines.addObject(marker);
		  allPolylines.addObject(polyline);
		   map.setViewBounds(allPolylines.getBounds(), true);
			  
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
						["mode","fastest;car;traffic:disabled"].join("="),
						["representation","display"].join("="),
						["jsoncallback","Requests."+nameFunc].join("=")
					  ].join("&")
					].join("");

			script = document.createElement("script");
			script.src = urlRoutingReq;
			document.body.appendChild(script);
	}




	var displayReady = function(e)
	{
		map.removeEventListener("mapviewchangeend", displayReady);
		calculateMtxRoute();
	};

	map.addEventListener("mapviewchangeend", displayReady);