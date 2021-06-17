/**
	*
	* @param  {H.Map} map      A HERE Map instance within the application
	*/
    // setting for hi res map tiles
    var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	var styleArray=new Array();

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	//Step 1: initialize communication with the platform
	var platform = new H.service.Platform({
		app_id: app_id,
		app_code: app_code,
		useHTTPS: secure,
	});
	// add optional parameters for platform
	var defaultLayers = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null);

	//Step 2: initialize a map  - not specificing a location will give a whole world view.
	var map =  new H.Map(document.getElementById('mapContainer'),
	defaultLayers.normal.map,{
		center: {lat:50.11208, lng:8.68342},
		zoom: 12
	});

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	//Step 3: make the map interactive
	// MapEvents enables the event system
	// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
	var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	// Create the default UI components
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	var places_appId=app_id,
	places_appCode=app_code;


	function findPublicTransportSuggestions(data) {
		
		setCredentials();

		if(data==null || data.response==null || data.response.view==null || data.response.view.length==0){
			alert("Kindly provide a more specific address");
			return;
		}

		var lat=data.response.view[0].result[0].location.navigationPosition[0].latitude;
		var lon=data.response.view[0].result[0].location.navigationPosition[0].longitude;

		var coord = new H.geo.Point(parseFloat(lat), parseFloat(lon));
		var at=lat+","+lon;
		map.setCenter(coord);
		document.body.style.cursor = 'wait';
		// places API call for getting public transport suggestions
		var url = ["https://places.demo.api.here.com/places/v1/browse/pt-stops?",
			"app_id=" + places_appId + "&",
			"app_code=" + places_appCode + "&",
			"at=" + at + "&",
			"callback=showResults"].join("");
			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
	}

	// Show results from suggestion
	function showResults(data){
		//clear previous results
		var resultDiv=document.getElementById('result');
		resultDiv.innerHTML="<p>Click on any link to display next departures</p>";

		if (data == null || data.results == null || data.results.items == null ) {
			resultDiv.innerHTML="No Data found.";
			return;
		}

		var results=data.results.items,
		suggestionDiv,
		suggestion,
		icon;
		var length=results.length;
		// Add suggestions to results box
		for(var i=0;i<length;i++){
			suggestionDiv=document.createElement("div");
			icon=document.createElement("img");
			icon.src=results[i].icon;
			icon.height="30";
			icon.width="30";
			icon.setAttribute("style","vertical-align: middle");
			suggestionDiv.appendChild(icon);
			suggestion=document.createElement("a");
			//pass the href for getting details from suggestion
			suggestion.href="javascript:findDeparture('"+results[i].href+"',"+results[i].position+")";
			suggestion.innerHTML=results[i].title;
			suggestionDiv.appendChild(suggestion);
			suggestionDiv.appendChild(suggestion);
			resultDiv.appendChild(suggestionDiv);
		}
		resultDiv.style.display="block";
		document.body.style.cursor = 'auto';
	}
	// Places API call for getting departure values
	function findDeparture(url,position){
		document.body.style.cursor = 'wait';
		var departureDetails = url+"&pretty"+"&callback=showDepartures";
		script = document.createElement("script");
		script.src = departureDetails;
		document.body.appendChild(script);
	}
	// Show departure results
	function showDepartures(data){
		//clear old results
		var contentDiv=document.createElement("div");

		var departureDiv=document.createElement("div");
		departureDiv.className="uiMapBox3";

		if (data == null || data.name==null) {
			document.body.style.cursor = 'auto';
			alert("Error in calling Places API");
			return;
		}

		var departureStation=document.createElement("div");
		departureStation.innerHTML=data.name;
		departureDiv.appendChild(departureStation);
		// populate departure results
		var departureResults=document.createElement("div");
		var text="";
		if (data.extended == null ||  data.extended.departures==null ) {
			
			if(data.extended.transitLines !=null && 
				data.extended.transitLines.destinations!=null){
				
				text=text+"<br/>Destination : Line<br/><ul>";
				var lines=data.extended.transitLines.destinations;
				for (var i = 0; i < lines.length; i++){
					text=text+"<li>"+lines[i].destination+" : "+lines[i].line+"</li>";
				}
				text=text+"</ul><br>Departure Information not available"+
				" here, try changing the credentials";
				
			}
		}else{
			departureDiv.innerHTML="Next Departures";
			text=data.extended.departures.text;
		}
		departureResults.innerHTML=text;
		departureDiv.appendChild(departureResults);
		contentDiv.appendChild(departureDiv);
		//add marker at the public transit
		addMarker(data.location.position,data.icon,contentDiv);
		document.body.style.cursor = 'auto';
	}

	// Add marker at public transit with an Info bubble showing departure results
	function addMarker(position,icon,contentDiv){
		var positionValue={lat:position[0], lng:position[1]};
		var marker = new H.map.Marker(positionValue);
		map.addObject(marker);
		map.setCenter(positionValue);
		marker.setData(contentDiv.innerHTML);
		// add 'tap' event listener, that opens info bubble, to the group
		marker.addEventListener('tap', function (evt) {
			// event target is the marker itself, group is a parent event target
			// for all objects that it contains
			var bubble =  new H.ui.InfoBubble(evt.target.getPosition(), {
				// read custom data
				content: evt.target.getData()
			});
			// show info bubble
			ui.addBubble(bubble);

		}, false);
		marker.dispatchEvent('tap');
		map.setZoom(13);
	}


	function geocode() {
		url = ["https://geocoder.api.here.com/6.2/geocode.json?gen=4&jsonattributes=1&language=en-GB&maxresults=1",
			"&searchtext=",
			document.getElementById('address').value,
			"&strictlanguagemode=false",
			"&app_id=",
			app_id,
			"&app_code=",
			app_code,
			"&jsoncallback=findPublicTransportSuggestions"].join("");
			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
	}
	
	function setCredentials(){
		var checked=document.getElementById("checkbox").checked;
		if(checked){
			document.getElementById("credentials").style.display="block";
			places_appId=document.getElementById('appIdExt').value;
			places_appCode=document.getElementById('appCodeExt').value;
		}else{
			document.getElementById("credentials").style.display="none";
			places_appId=app_id;
			places_appCode=app_code;
		}
		
	}