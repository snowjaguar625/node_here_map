/* 
		author Jonathan Hernandez
		TCS Chicago
		(C) HERE 2016
	*/
	
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);    

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		app_id: app_id,
		app_code: app_code
	}),
		maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		group = new H.map.Group(),
		markerGroup = new H.map.Group(),
		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.map, {
		center: new H.geo.Point(41.88449, -87.6387699),
		zoom: 13,
		pixelRatio: hidpi ? 2 : 1
	});

	
	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);


	//add JS API Release information
	releaseInfoTxt.innerHTML += "<br />JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();
	
	map.addObject(markerGroup);
	
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	//Buttons used to toggle classes/styles
	var defaultBtn = document.getElementById("defaultBtn"); 
	var custom1Btn = document.getElementById("custom1Btn"); 
	var custom2Btn = document.getElementById("custom2Btn"); 
	var customStyleBtn = document.getElementById("custom_style_btn"); 
	var resetCustomStyleBtn = document.getElementById("reset_custom_style_btn"); 

	//text areas to modify styles using javascript
	var customBodyStyle= document.getElementById("h_ib_body_style");
	var customContentStyle= document.getElementById("h_ib_content_style");
	var customCloseStyle= document.getElementById("h_ib_close_style");
	var customTailStyle= document.getElementById("h_ib_tail_style");

	var currentBubble;

	//create basic info bubble
	var makeNewInfoBubble = function(){
		if( currentBubble != null )
			ui.removeBubble(currentBubble);
		var coords = {
					  lat: 41.88457,
					  lng: -87.63875
					};
					//Make Bubble
		currentBubble =  new H.ui.InfoBubble(coords, {content: 'I am the bubble!'});
		ui.addBubble(currentBubble);
	};

	/************************************
		Apply custom class
	************************************/
	var applyCustomClass = function(className)
	{
		makeNewInfoBubble();
		currentBubble.addClass(className); //add class and allowing CSS stylesheet to apply appropriate changes
	};

	/************************************
		Apply custom style in Javascript, find the elements through javascript and apply styles as needed 
	************************************/
	var applyCustomStyles = function()
	{
		makeNewInfoBubble();

		var bubbleElement = currentBubble.getElement();
		//find elements
		for(var i=0; i< bubbleElement.childNodes.length; i++){
			//Tail
			if(bubbleElement.childNodes[i].className == 'H_ib_tail'){
				bubbleElement.childNodes[i].innerHTML='<svg viewBox="0 0 25 25"><g><path d="M 20,0.5 15,20 10,0.5 z" stroke-width="1" stroke="#1F1710"></path></g></svg>';
				bubbleElement.childNodes[i].setAttribute('style',customTailStyle.value)
			}
			//Body
			else if(bubbleElement.childNodes[i].className == 'H_ib_body'){
				bubbleElement.childNodes[i].setAttribute('style',customBodyStyle.value);


				for(var j=0; j < bubbleElement.childNodes[i].childNodes.length; j++){
					//Content
					if(bubbleElement.childNodes[i].childNodes[j].className == 'H_ib_content')
						bubbleElement.childNodes[i].childNodes[j].setAttribute('style',customContentStyle.value);
					//Close
					else if(bubbleElement.childNodes[i].childNodes[j].className == 'H_ib_close')
						bubbleElement.childNodes[i].childNodes[j].setAttribute('style',customCloseStyle.value);

				}
			}
		}
	};
	customStyleBtn.onclick = applyCustomStyles;

	/************************************
		Reset custom style shown in example on load
	************************************/
	var resetCustomStyles = function()
	{
		customBodyStyle.value = "background:-webkit-linear-gradient(#F29E0D, #2E3038);background:-o-linear-gradient(#F29E0D, #2E3038);background:-moz-linear-gradient(#F29E0D, #2E3038);background:linear-gradient(#F29E0D, #2E3038)";
		customContentStyle.value = "text-align:right;font-size:small";
		customCloseStyle.value = "display:none;";
		customTailStyle.value = "z-index:-1;";
		applyCustomStyles();
	}
	resetCustomStyleBtn.onclick = resetCustomStyles;