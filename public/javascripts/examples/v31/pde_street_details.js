/*
	*  (C) HERE 2016
	author asadovoy
		(C) HERE 2019 -> migrate to 3.1
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs.
	var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	});
	var maptypes = platform.createDefaultLayers();
	// Instantiate a map in the 'map' div, set the base map to normal.
	var map = new H.Map(document.getElementById("mapContainer"),
	maptypes.vector.normal.map, {
		center: new H.geo.Point(50.11065,8.69908),
		zoom: 14,
		pixelRatio: window.devicePixelRatio || 1
	});
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());
	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);
	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);
	// Enable the default UI.
	var ui = H.ui.UI.createDefault(map, maptypes);
	ui.getControl("scalebar").setAlignment("bottom-center");

	// SVG used for coordinates
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
		'<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
		' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
		'<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
		' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
		'<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
		' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="__COLOR__"/>' +
		'<text font-size="12" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" x="10" y="19">__NO__</text>' +
		'</svg>';


	var responseMessage = $('#responseMessage');
	var color=  generateColor();
	
	var linksToCheck=[],matchingLinks=[],streetNameLinksIdMap=[],streetNames=[],polylines=[],roadGeometry=[];
	var staticPatterns=[],streetName="",position=1,currentBubble;
	var layers = new Object();
	
	var pdeManager = new PDEManager(app_id, app_code, layers);

	// Map objects
	var mapObjects = new H.map.Group();
	map.addObject(mapObjects);
	
	// geocoder service
	var geocoder = platform.getGeocodingService();

	function generateColor(){
		
		return "rgba("+(Math.floor((Math.random() * 255) + 1)) +
			 ","+ (Math.floor((Math.random() * 255) + 1)) +","+
			 	 (Math.floor((Math.random() * 255) + 1)) +","+ 1 + ")";
	}

   // add tap lister
	map.addEventListener('tap', function (evt) {
	  loadLinks(evt);
	});
	   

	//call back for Variable speed limts
	function gotLinkGeomerty(resp)
	{
		if (resp.error != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.error);
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert("Oops! Something went wrong.");
			console.log(resp.message);
			return;
		}
		// Populate variable speed limits map
		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = parseInt(resp.Rows[r].LINK_ID);
			roadGeometry[linkId]=resp.Rows[r];
			loadAllEngStreetName(resp.Rows[r]);
		}
	}


	// Make reverse Geocoder request with provided coordinated to get closest link
	var loadLinks = function(evt) {
		 linksToCheck=[],matchingLinks=[],streetNameLinksIdMap=[],streetNames=[],polylines=[],roadGeometry=[];
		 index=0,streetName="";
		 var geoPoint = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
		 
		 
		
		var reverseGeocodingParameters = {
			prox: geoPoint.lat + ',' + geoPoint.lng+ ',500',
			mode: 'retrieveAddresses',
			maxResults: 1,
			additionaldata: 'SuppressStreetType,Unnamed',
			locationattributes : 'linkInfo'
	};
	
		geocoder.reverseGeocode(
			reverseGeocodingParameters,
			onSuccess,
			function(e) {
				alert(e);
			}
		);
	};
	
	// callback for geocoder result
	function onSuccess(result) {
		var location = result.Response.View[0].Result[0].Location;
		if(location){
			linksToCheck[index++]={linkId : location.MapReference.ReferenceId };
			streetName=location.Address.Street;
			color=  generateColor();
			
			// if check box is checked, clear previously loaded objects
			var checkbox=document.getElementById("clear-checkbox");
			if(checkbox.checked && mapObjects.getObjects() ){
				 	mapObjects.removeAll();
					position=1;
					document.getElementById("responseMessage").innerHTML= "";
			}
			
			// display marker at navigable position
			var coord = new H.geo.Point(location.DisplayPosition.Latitude,location.DisplayPosition.Longitude);
			var marker = new H.map.Marker(coord, {
					icon: new H.map.Icon(svg.replace(/__COLOR__/g, color).replace(/__NO__/g, position++))
				});
			var coordStrings =location.Address.Label;

			marker.setData("<div>" + coordStrings + "</div>");
				
			mapObjects.addObject(marker);
			zoomToMapObjects();
			
			// if zoomed out too much clear objects
			if(map.getZoom() >= 14){
				// call PDE layers for the cooridnates using map view bound
				layers["ROAD_GEOM_FC"] = {callback: gotLinkGeomerty , fcLayers: [location.LinkInfo.FunctionalClass]};
				pdeManager.setLayers(layers);
				pdeManager.setBoundingBox(map.getViewModel().getLookAtData().bounds.getBoundingBox());
				pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
				pdeManager.start();
				Spinner.showSpinner();	
			}else{
				
				document.getElementById("responseMessage").innerHTML= 
				document.getElementById("responseMessage").innerHTML+"<br/> "+
						"Zoomed out too much, clearing previous objects <br/> click again please";
				 var checkbox=document.getElementById("clear-checkbox");
				 checkbox.checked=true;
				 map.setZoom(14);
						
			}
		}
	}
	
	//get all street names
	 function loadAllEngStreetName(row) {
			var names = row.NAMES;
			var nameText= row.NAME;
			// check if any name in language codes are matching the value from reverse geocode
			if(names!=null ){
				var tempNames = names.split('\u001D');
				for (var i = 0; i < tempNames.length; i++) {
					var strName = tempNames[i].split('\u001E')[0];
					streetNames=checkStreetName("ENGBN",strName,row);
					streetNames=checkStreetName("GERBN",strName,row);
				}
				streetNameLinksIdMap[row.LINK_ID]=streetNames;
			}
			 // check if any name are matching the value from reverse geocode
			if(nameText!=null ){
				var tempNames = nameText.split('\u001E');
				if(streetName == tempNames[0] && streetNameLinksIdMap[row.LINK_ID] !="added"){
							matchingLinks.push(row);
							streetNameLinksIdMap[row.LINK_ID]="added";
				}
				streetNames.push(tempNames[0]);
				streetNameLinksIdMap[row.LINK_ID]=streetNames;
			}
		}
	
	// check if street name for the language code
	function checkStreetName(languageCode, str,row){
		if (str.indexOf(languageCode)>-1) {
			str = str.replace(languageCode, "");
			if(str == streetName && streetNameLinksIdMap[row.LINK_ID] !="added"){
							matchingLinks.push(row);
							streetNameLinksIdMap[row.LINK_ID]="added";
			}
			streetNames.push(str);
		}
		return streetNames;
	}
	
	
	// callback when all PDE layers are loaded
	// render link shapes which match the street name
	function pdeManagerFinished(evt){
		Spinner.hideSpinner();		
		var routeLink=null;
		for(i=0;i<matchingLinks.length;i++){
				var linkGeom=matchingLinks[i];
				var lat = linkGeom.LAT.split(",");
				var lon = linkGeom.LON.split(",");
				var strip = new H.geo.LineString();
				var temLat= 0,temLon = 0;
				for(j=0;j<lat.length;j++){
					
					if (parseInt(lat[j])) {
						temLat = temLat + parseInt(lat[j]);
					}
					if(parseInt(lon[j])){
						temLon= temLon+ parseInt(lon[j]);
					}
					
					strip.pushPoint({lat:temLat/100000, lng:temLon/100000});
				}
				var polyline = new H.map.Polyline(
						strip, 
						{ style: { lineWidth: 10, strokeColor: color }}
						
				);
				polyline.details=linkGeom;
				// add listner to show infobubble
				polyline.addEventListener('pointerenter', onPointerEnter);
				polyline.addEventListener('pointerleave', onPointerLeave);
				polylines.push(polyline);
			
			
			
		}
		mapObjects.addObjects(polylines);
		document.getElementById("responseMessage").innerHTML=
				document.getElementById("responseMessage").innerHTML+"<br/> "+(position-1)+
					". "+streetName;
		zoomToMapObjects();
	}
	
	// show info bubble
	function onPointerEnter(e) {
		document.getElementById('mapContainer').style.cursor = 'crosshair';
						if(currentBubble)
						ui.removeBubble(currentBubble);
						var html =  '<div>'+
							'<p style="font-family:Arial,sans-serif; font-size:12px;">Link Id: ' + e.target.details.LINK_ID +'</p>'+
							'<p style="font-family:Arial,sans-serif; font-size:10px;">Bridge Flag: ' + e.target.details.BRIDGE + '</p>'+
							'<p style="font-family:Arial,sans-serif; font-size:10px;">Tunnel Flag: ' + e.target.details.TUNNEL + '</p>'+
							'</div>';

						var point = map.screenToGeo(e.pointers[0].viewportX, e.pointers[0].viewportY);
						currentBubble = new H.ui.InfoBubble(point, { content: html });
						ui.addBubble(currentBubble);
	}

	function onPointerLeave(e) {
		document.getElementById('mapContainer').style.cursor = 'default';
	}

  // zoom to map objects 
	var zoomToMapObjects = function() {
		map.getViewModel().setLookAtData({
            bounds: mapObjects.getBoundingBox()
        });
		
	};