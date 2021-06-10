/*
	author domschuette/ez
	(C) HERE 2019
	*/

	// the map container
	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false,

	// initializing of the HERE platform service
	platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
	}),
	// setting of the map type default
	maptypes = platform.createDefaultLayers(),
	// geocoder (for route start and destination)
	geocoder = platform.getGeocodingService(),
	// router
	router = platform.getRoutingService(),
	// object that holds the links, junction view markers
	// via this group they get added to the map display (and also removed)
	group = new H.map.Group(),
	markerGroup = new H.map.Group(),
	// start and destination marker
	startMarker = null,
	destMarker = null,

	bLongClickUseForStartPoint = true, // for long click in map we toggle start/destination
	// holds the polylines which markes the JV visible path during simulation
	simulationGroup = new H.map.Group(),
	// the PDE layers used in this demo
	layers = null,
	// instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(mapContainer, maptypes.vector.normal.map,
		{
			center: new H.geo.Point(41.963104, -87.74324),
            zoom: 7,
            pixelRatio: window.devicePixelRatio || 1
		}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// PDE manager
	var pdeManager = new PDEManager(app_id, app_code, layers);

	// router map release - used for PDE
	var routerMapRelease = "";

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	//add JS API Release information
	releaseInfoTxt.innerHTML+="JS API: 3."+ H.buildInfo().version;

	//add MRS Release information
	loadMRSVersionTxt();

	//helper
	var releaseGeocoderShown = false;
	var releaseRoutingShown = false;

	// add UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	// adding listener for the map resize
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// add long click in map event listener
	map.addEventListener('longpress', handleLongClickInMap);

	// route button
	var	routeButton = document.getElementById("routeButton"),
	// route start
	start = document.getElementById("start"),
	// route destination
	dest = document.getElementById("dest"),
	// position of route start
	pointA,
	// position of route destination
	pointB,
	// routing departure
	depature;

	// current open junction view
	var	currentJvInfoBubble,
	// links are also clickable - this is the info bubble for current open link
	currentLinkInfoBubble,
	// color of junction view markers (along route)
	jvColor = "rgba(255, 224, 22, 0.5)",
	// variable that holds the custom colors CSS loaded via PDE
	customColorsCss = "not yet loaded",
	// variable that holds the custom colors CSS loaded via PDE
	junctionStyleCss = "not yet loaded",
	// the original junction view SVG requested via PDE (always the last one)
	m_jvOriginalSvg = null,
	// the original sky SVG requested via PDE
	m_skyOriginalSvg = null,
	// the original sign as real SVG requested via PDE (always the last one)
	m_sarOriginalSvg = null,
	// the file name of last requested jv file
	lastRequestedJvFileName = null,
	// the file name of last requested sar file
	lastRequestedSarFileName = null,
	// last clicked position
	lastClickedPos = null;
	// the current image with/height (will be modified by ratio setting by the user)
	var iCurrImageWidth = 400;
	var iCurrImageHeight = 300;
	// container for the different image sizes we use for displaying the different aspect ratios
	var ratioImageSizes   = new Object(); // // key = 4x3, value = [width, height]
	ratioImageSizes["4x3"] = [400, 300];
	ratioImageSizes["5x3"] = [500, 300];
	ratioImageSizes["3x5"] = [300, 500];
	ratioImageSizes["16x9"] = [533, 300];
	// user choosen aspect ratio
	var currChoosenRatio = "???";
	handleRatioChanged();
	// user choosen view (f.e. driver, bird)
	var currChoosenView = "???";
	handleViewChanged();
	// day night setting
	var dayNightSetting = null;
	handleDayNight();
	// opacity for JV arrows and signs
	var ARROW_FILL_OPACITY = "0.18";
	var SIGN_FILL_OPACITY = "0.28";
	var ATTRIBUTE_FILL_OPACITY = "fill-opacity";
	// hashmap with all route links - used to match the arrows of the JVs
	var routeLinkHashMap  = new Object(); // key = linkID (always positive), value = link object
	// setting for showing mutli arrows or single arrows in JVs
	var showMultiArrow = true;
	handleArrowChanged();

	map.addObject(markerGroup);

	// init callbacks for tile/file received finish
	pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
	pdeManager.addEventListener("PDEFileLoadingFinished", pdeManagerFileLoadingFinished);

	// request custom colors CSS from PDE
	requestCustomColorsCss();
	// request junction style CSS from PDE
	requestJunctionStyleCss();

	// SIMULATION OBJECTS
	// simulation running or not
	var bSimulationRunning = false;
	// object with all route points
	var currentRouteStrip = new H.geo.LineString();
	// truck icon
	var truckIcon = new H.map.Icon('/assets/icons/markerTruck.png');
	// truck marker
	var truckMarker = new H.map.Marker({ lat: 52.53805, lng: 13.4205 }, { icon: truckIcon, volatility: true });
	truckMarker.$id = "truckMarker";
	var iSimulationIsAtPosition = 0;
	// simulation walker
	var simulationWalker = null;
	var listLinksOnRoute = [];
	var SHOW_JV_UPFRONT_DISTANCE = 1200;
	


	/**
	This method will start the route calculation (incl. geocoding of the start and destination point)
	and will retrive the Junction View image locations from the HERE PDE service.
	*/
	var startRouteCalculationAndGetJvImagesLocations = function()
	{
		layers = new Object();
		layers["JUNCTION_VIEW"] = {callback: gotJunctionViews, isFCLayer: false, level: 10};

		pdeManager.setLayers(layers);

		clearPreviousResults();

		depature = "now";
		geocode(start.value, true);
	}

	/********************************************************
	Start/Destination selectin via LongClick in map
	********************************************************/
	function handleLongClickInMap(currentEvent)
	{
		var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

		if(bLongClickUseForStartPoint)
		{
			clearPreviousResults();
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			start.value = line1;
			pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(startMarker !=  null)
			{
				markerGroup.removeObject(startMarker);
			}
			startMarker = new H.map.Marker(pointA,
				{
					icon: createIconMarker(line1, line2)
				});
				markerGroup.addObject(startMarker);
				bLongClickUseForStartPoint = false;
		}
		else
		{
			var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
			var line2 = null;
			dest.value = line1;
			pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
			if(destMarker !=  null)
			{
				markerGroup.removeObject(destMarker);
			}
			destMarker = new H.map.Marker(pointB,
				{
					icon: createIconMarker(line1, line2)
				});
			markerGroup.addObject(destMarker);
			bLongClickUseForStartPoint = true;
			startRouteCalculationAndGetJvImagesLocations();
		}
	}


	/**
	Geocoding of start and destination and after that starts the route calculation
	*/
	var geocode = function(searchTerm, start)
	{
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}

		geocoder.search(
			{
				searchText: searchTerm
			},
			function(result) {
				if(result.Response.View[0].Result[0].Location != null)
				{
					pos = result.Response.View[0].Result[0].Location.DisplayPosition;
				}
				else
				{
					pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
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

				line1 = pos.Latitude + " " + pos.Longitude;
				line2 = address.Label;

				if(start)
				{
					if(startMarker !=  null)
					{
						markerGroup.removeObject(startMarker);
					}
					startMarker = new H.map.Marker(pointA,
						{
							icon: createIconMarker(line1, line2)
						});
						markerGroup.addObject(startMarker);
				}
				else
				{
					if(destMarker !=  null)
					{
						markerGroup.removeObject(destMarker);
					}
					destMarker = new H.map.Marker(pointB,
						{
							icon: createIconMarker(line1, line2)
						});
						markerGroup.addObject(destMarker);
				}

				if(start)
					geocode(dest.value, false);
				else
					calculateRouteDirect(pointA, pointB);
			},
			function(error) {
				alert(error);
			}
		);
	}

	var calculateRouteDirect = function(start, destination)
	{
		var urlRoutingReq = "https://route.api.here.com/routing/7.2/calculateroute.json?jsonAttributes=1&waypoint0="+
			start.lat + "," + start.lng + "&waypoint1="+destination.lat+","+ destination.lng +
			"&departure=" + depature +"&routeattributes=sh,lg&legattributes=li&linkattributes=length,fc&mode=fastest;" +
			"car" + ";traffic:enabled&app_id=" + app_id + "&app_code=" + app_code+ "&jsoncallback=gotRoutingResponse";

		script = document.createElement("script");
		script.src = urlRoutingReq;
		document.body.appendChild(script);
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

		if (respJsonRouteObj.type != undefined && respJsonRouteObj.type =="ApplicationError")
		{
			alert (respJsonRouteObj.details);
			feedbackTxt.innerHTML = respJsonRouteObj.details;
			return;
		}

		//add Routing Release number if not already done
		if (releaseRoutingShown== false){
			releaseInfoTxt.innerHTML+="<br />HLP Routing: "+respJsonRouteObj.response.metaInfo.moduleVersion;
			routerMapRelease = respJsonRouteObj.response.metaInfo.mapVersion;
			explanation.innerHTML = "HLP Routing Service based on " + routerMapRelease + " map release";
			releaseRoutingShown = true;
		}

		
				
			

		// create link objects
		for(var m = 0; m < respJsonRouteObj.response.route[0].leg[0].link.length; m++)
		{
			var strip = new H.geo.LineString(),
			shape = respJsonRouteObj.response.route[0].leg[0].link[m].shape,
			i,
			l = shape.length;

			for(i = 0; i < l; i++)
			{
				strip.pushLatLngAlt.apply(strip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
				currentRouteStrip.pushLatLngAlt.apply(currentRouteStrip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
			}

			var link = new H.map.Polyline(strip,
				{
					style:
					{
						lineWidth: 5,
						strokeColor: "rgba(18, 65, 145, 1.0)",
						lineJoin: "round"
					}
				});
				link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});
				// we store some additional values to each link cause they get re-used for simulation
				link.$linkId = respJsonRouteObj.response.route[0].leg[0].link[m].linkId;
				link.$linkLength = respJsonRouteObj.response.route[0].leg[0].link[m].length;
				link.$linkPositionOnRoute = m;
				link.$linkShape = shape;
				routeLinkHashMap[respJsonRouteObj.response.route[0].leg[0].link[m].linkId.substring(1)] = link;
				//save also in sequential list - enables to sum up the link length
				listLinksOnRoute.push(link);

				// add event listener to link
				link.addEventListener("pointerdown", function(e)
				{
					if(currentLinkInfoBubble)
						ui.removeBubble(currentLinkInfoBubble);
					var html =  '<div>'+
						'<p style="font-family:Arial,sans-serif; font-size:12px;">LinkId: ' + e.target.$linkId +'</p>'
					'</div>';

					var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

					currentLinkInfoBubble = new H.ui.InfoBubble(pos, { content: html });
					ui.addBubble(currentLinkInfoBubble);
				});

				group.addObject(link);
		}

		// enable simulation button
		checkRouteSimulationButtonEnabledState();

		
		pdeManager.setLinks(respJsonRouteObj.response.route[0].leg[0].link);
		pdeManager.setOnTileLoadingFinished(pdeManagerFinished);
		pdeManager.start();
	}

	// callback for PDE manager finished receiving tile information
	function pdeManagerFinished(evt)
	{
		map.addObject(group);
        map.getViewModel().setLookAtData({
            bounds: group.getBoundingBox()
        });
	}

	// callback for PDE manager finished receiving file information
	function pdeManagerFileLoadingFinished(evt)
	{
		feedbackTxt.innerHTML = "Received PDE file " + evt.detail.finishedFileRequest;
	}

	// callback that is set to PDE manager and that gets called with the junction view tile information
	// that get requested (after route calculation)
	function gotJunctionViews(resp)
	{
		if (resp.error != undefined)
		{
			feedbackTxt.innerHTML = resp.error;
			return;
		}
		if (resp.responseCode != undefined)
		{
			alert (resp.message);
			feedbackTxt.innerHTML = resp.message;
			return;
		}
		feedbackTxt.innerHTML = "Received Attributes info for " + resp.Rows.length + " (splitted) links";

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkIds = resp.Rows[r].LINK_IDS;

			if(pdeManager.getLinksPartOfRoute(linkIds))
			{
				// create JV marker
				var conditionId = resp.Rows[r].CONDITION_ID;
				var lat = parseInt(resp.Rows[r].LAT) / 100000.0;
				var lon = parseInt(resp.Rows[r].LON) / 100000.0;

				var pointJv = new H.geo.Point(lat, lon);
				var markerJv = new H.map.Marker(
					pointJv,
					{
						icon: createIconMarkerJV("JV: " + conditionId, jvColor)
					});
					markerJv.$jvFormat = resp.Rows[r].JV_FORMAT;
					markerJv.$jvFile = resp.Rows[r].JV_FILE;
					markerJv.$sarFormat = resp.Rows[r].SAR_FORMAT;
					markerJv.$sarFile = resp.Rows[r].SAR_FILE;
					markerJv.$markerLat = lat;
					markerJv.$markerLon = lon;

					// add event listener to JV
					markerJv.addEventListener("pointerdown", function(currentEventJvRequest)
					{
						clearInfoBubble();
						// save click position (in order we change the ratio - that we can re-use it)
						lastClickedPos = map.screenToGeo(currentEventJvRequest.currentPointer.viewportX, currentEventJvRequest.currentPointer.viewportY);
						requestJvSkyAndSarFile(currentEventJvRequest.target.$jvFormat, currentEventJvRequest.target.$jvFile, currentEventJvRequest.target.$sarFormat, currentEventJvRequest.target.$sarFile);
					});

					group.addObject(markerJv);

					// create invisible strip upfront JV for simulation
					var showJvInSimulationStrip = new H.geo.LineString();
					var shape = getJvSimulationStrip(linkIds);

					for(var i = 0; i < shape.length; i++)
					{
						showJvInSimulationStrip.pushLatLngAlt.apply(showJvInSimulationStrip, shape[i].split(',').map(function(item) { return parseFloat(item); }));
					}

					var showJvInSimulationPolyline = new H.map.Polyline(showJvInSimulationStrip,
						{
							style:
							{
								lineWidth: 4,
								strokeColor: jvColor
							}
						});
						showJvInSimulationPolyline.$jvMarker = markerJv;
						simulationGroup.addObject(showJvInSimulationPolyline);
			}
		}
	}

	// requesting the custom colors CSS via PDE
	function requestCustomColorsCss()
	{
		if(customColorsCss == "not yet loaded")
		{
			// load the custom colors css
			pdeManager.requestPDEFile("customcolors.css", "JUNCTION_VIEW", customColorsCssLoaded);
		}
	}

	// saves the custom colors css after loading
	function customColorsCssLoaded(resp)
	{
		customColorsCss = '<style><![CDATA[ ' + resp + ']]></style>';
	}

	// requestiong the JV_STYLE css via PDE
	function requestJunctionStyleCss()
	{
		if(junctionStyleCss == "not yet loaded")
		{
			// load the jv style css
			pdeManager.requestPDEFile("D/16x9/JV_STYLE.css", "JUNCTION_VIEW", junctionStyleCssLoaded);
		}
	}

	// saves the JV_STYLE css after loading
	function junctionStyleCssLoaded(resp)
	{
		junctionStyleCss = '<style><![CDATA[ ' + resp + ']]></style>';
	}


	// after custom colors css got loaded - load JV, Sky and SAR file
	function requestJvSkyAndSarFile(jvFormats, jvFile, sarFormats, sarFile)
	{
		var selectedJvFormat = currChoosenView + "/" + currChoosenRatio + "/";
		var selectedSarFormat = currChoosenRatio + "/";
		var bJvFormatAvailable = false;
		var bSarFormatAvailable = false;

		// check if requested file is available for choosen view and ratio
		var jvAvailableFileFormats = jvFormats;
		var sarAvailableFileFormats = sarFormats;
		if(jvAvailableFileFormats.length > 0)
		{
			jvAvailableFileFormats = jvAvailableFileFormats.split(",");
			if(arrayContains(jvAvailableFileFormats, selectedJvFormat))
			{
				bJvFormatAvailable = true;
			}
		}
		if(sarAvailableFileFormats.length > 0)
		{
			sarAvailableFileFormats = sarAvailableFileFormats.split(",");
			if(arrayContains(sarAvailableFileFormats, selectedSarFormat))
			{
				bSarFormatAvailable = true;
			}
		}

		if(bJvFormatAvailable && bSarFormatAvailable)
		{
			// save file information (f.e. for displaying them to user)
			lastRequestedJvFileName = jvFile;
			lastRequestedSarFileName = sarFile;

			// request files

			// request the selected JV file
			pdeManager.requestPDEFile(selectedJvFormat + jvFile, "JUNCTION_VIEW", gotJVFile);

			// sky image only has to be requested once
			if(m_skyOriginalSvg == null)
			{
				pdeManager.requestPDEFile(selectedJvFormat + "JV_SKY.svg", "JUNCTION_VIEW", gotSkyFile);
			}

			// request sar file
			pdeManager.requestPDEFile(selectedSarFormat + sarFile, "JUNCTION_VIEW", gotSarFile);
		}
		else
		{
			feedbackTxt.innerHTML = "The requested JunctionView " + jvFile + " is not available in the selected format.";
			if(!bJvFormatAvailable)
			{
				feedbackTxt.innerHTML += "<br/>The available junction view formats are: " + jvAvailableFileFormats;
				feedbackTxt.innerHTML += "<br/>(B = BirdView, D = Driver View)";
			}
			if(!bSarFormatAvailable)
			{
				feedbackTxt.innerHTML += "<br/>The available Sign as real formats are: " + sarAvailableFileFormats;
			}
		}
	}

	// callback functions that save the JV SVG content and after all are received show them
	function gotJVFile(jvSvg)
	{
		m_jvOriginalSvg = jvSvg.replace('<?xml-stylesheet type="text/css" href="./JV_STYLE.css"?>', "");
		m_jvOriginalSvg = m_jvOriginalSvg.replace('<defs>', junctionStyleCss + '<defs>');
		assembleCompleteJvImage();
	}
	function gotSkyFile(skySvg)
	{
		m_skyOriginalSvg = skySvg.replace('<?xml-stylesheet type="text/css" href="./JV_STYLE.css"?>', "");
		m_skyOriginalSvg = m_skyOriginalSvg.replace('<defs>', junctionStyleCss + '<defs>');
		assembleCompleteJvImage();
	}
	function gotSarFile(sarSvg)
	{
		m_sarOriginalSvg = sarSvg.replace('<?xml-stylesheet type="text/css" href="../customcolors.css"?>', "");
		m_sarOriginalSvg = m_sarOriginalSvg.replace('<mr:routes', customColorsCss + '<mr:routes');
		assembleCompleteJvImage();
	}

	/**
	Method to assemble the complete JV image to be shown. It checks if JV SVG, Sky SVG and SAR SVG
	where loaded and then starts with rendering.
	*/
	function assembleCompleteJvImage()
	{
		if(m_jvOriginalSvg != null && m_skyOriginalSvg != null && m_sarOriginalSvg != null)
		{
			var jvRenderCanvas = document.createElement("canvas"),
			jvRenderContext = jvRenderCanvas.getContext("2d"),
			toLoad = 3;

			// set canvas size
			jvRenderCanvas.height = iCurrImageHeight;
			jvRenderCanvas.width = iCurrImageWidth;

			/********************************************************************

			Modification of SVG files - f.e. to adapt them to day/night style

			********************************************************************/
			// modify sky with day and night
			var modifiedSkySvg = m_skyOriginalSvg;
			modifiedSkySvg = modifySvgDayNight(modifiedSkySvg);

			// modify JV with day and night
			var modifiedJvSvg = m_jvOriginalSvg;
			modifiedJvSvg =  modifySvgDayNight(modifiedJvSvg);

			// modify arrows on JV  based on route
			modifiedJvSvg = modifyJvSvgArrowsOnRoute(modifiedJvSvg);

			//modify Sar signs based on route
			var modifiedSarSvg = m_sarOriginalSvg;
			modifiedSarSvg = modifySarSignsOnRoute(modifiedSarSvg);

			/********************************************************************

			Draw images

			********************************************************************/
			var imgSky = new Image();
			var imgSkySrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(modifiedSkySvg)));

			imgSky.onload = function()
			{
				jvRenderContext.drawImage(imgSky, 0, 0, iCurrImageWidth, iCurrImageHeight);

				toLoad--;
				if(toLoad == 0)
					showInfobubble(lastRequestedJvFileName, lastRequestedSarFileName, jvRenderCanvas);
			};
			imgSky.src = imgSkySrc;

			var imgJV = new Image();
			var imgJVSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(modifiedJvSvg)));

			imgJV.onload = function()
			{
				jvRenderContext.drawImage(imgJV, 0, 0, iCurrImageWidth, iCurrImageHeight);

				toLoad--;
				if(toLoad == 0)
					showInfobubble(lastRequestedJvFileName, lastRequestedSarFileName, jvRenderCanvas);
			};
			imgJV.src = imgJVSrc;

			var imgSar = new Image();
			var imgSarSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(modifiedSarSvg)));



			imgSar.onload = function()
			{
				jvRenderContext.drawImage(imgSar, 0, 0, iCurrImageWidth, iCurrImageHeight);

				toLoad--;
				if(toLoad == 0)
				{
					if(lastClickedPos)
					{
						showInfobubble(lastRequestedJvFileName, lastRequestedSarFileName, jvRenderCanvas);
					}
					else
					{
						showJvInSimulationView(jvRenderCanvas);
					}
				}
			};
			imgSar.src = imgSarSrc;
		}
	}

	// Helper to modify given SVG and remoe day/night tags
	function modifySvgDayNight(strSvg)
	{
		var domParser = new DOMParser();
		var docSvg = domParser.parseFromString(strSvg, "image/svg+xml");
		docSvg.documentElement.removeChild(docSvg.getElementById(dayNightSetting));
		return (new XMLSerializer()).serializeToString(docSvg);
	}

	// Helper to modify the given JV SVG and set arrows opacy that are not part of the route
	function modifyJvSvgArrowsOnRoute(strSvg)
	{
		var domParser = new DOMParser();
		var docSvg = domParser.parseFromString(strSvg, "image/svg+xml");
		setArrowOpacity(docSvg.documentElement);
		return (new XMLSerializer()).serializeToString(docSvg);
	}

	// Helper to modify the given SVG and set sign opacy that are not part of the route
	function modifySarSignsOnRoute(strSvg)
	{
		var domParser = new DOMParser();
		var docSvg = domParser.parseFromString(strSvg, "image/svg+xml");
		var refSignsPartOfRoute = getSignReferencesPartOfRoute(docSvg.documentElement);
		setSignOpacity(docSvg.documentElement, refSignsPartOfRoute);
		return (new XMLSerializer()).serializeToString(docSvg);
	}

	// Helper to find the sign references inside the SAR SVG file that are part of the route
	function getSignReferencesPartOfRoute(nodeElement)
	{
		var refRets = [];
		listNodes = nodeElement.childNodes;

		for(var r = 0; r < listNodes.length; r++)
		{
			var rootNode = listNodes[r];
			if(rootNode.nodeName != 'mr:routes')
				continue;

			var listRoutesNodes = rootNode.childNodes;
			for(var i = 0; i < listRoutesNodes.length; i++)
			{
				var routesNode = listRoutesNodes[i];
				if(routesNode.nodeName != 'mr:route')
					continue;

				var strDestLinkPvid = routesNode.getAttribute('destinationLinkPVId');
				if(strDestLinkPvid != null && strDestLinkPvid.length > 0)
				{
					if(getIsLinkPartOfRoute(strDestLinkPvid))
					{
						var listRouteNodes = routesNode.childNodes;
						for(var j = 0; j < listRouteNodes.length; j++)
						{
							var routeNode = listRouteNodes[j];
							if(routeNode.hasChildNodes()) // routeNode.getAttribute is undefined on #text
							{
								var strDestLanePvid = routeNode.getAttribute('destinationLanePVId');
								if(strDestLanePvid != null && strDestLanePvid.length > 0)
								{
									// lanes present = use their subchilds
									var listLaneNodes = routeNode.childNodes;
									for(var k = 0; k < listLaneNodes.length; k++)
									{
										var signRefNode = listLaneNodes[k];

										if(signRefNode.nodeName != 'mr:SVGObject')
											continue;

										var refId = signRefNode.getAttribute('refId');
										if(refId != null && refId.length > 0)
										{
											refRets.push(refId);
										}
									}
								}
								else
								{
									// no lanes present - use refIds directly
									for(var k = 0; k < listSignRefNodes.length; k++)
									{
										var signRefNode = listSignRefNodes[k];

										if(signRefNode.nodeName != 'mr:SVGObject')
											continue;

										var refId = signRefNode.getAttribute('refId');
										if(refId != null && refId.length > 0)
										{
											refRets.push(refId);
										}
									}
								}
							}
						}
					}
				}
			}
		}

		return refRets;
	}

	// Helper to recursivly go through SVG elements and find the Arrows - check if they are part of the route
	// and if not set opacy
	function setArrowOpacity(nodeElement)
	{
		var listNodes = nodeElement.childNodes;

		for(var i = 0; i < listNodes.length; i++)
		{
			var node = listNodes[i];
			if(node.nodeName != 'g')
				continue;

			var strDestLinkPvid = node.getAttribute('destinationLinkPVID');
			if(strDestLinkPvid == null || strDestLinkPvid.length == 0)
			{
				// arrows can be in child elements
				setArrowOpacity(node);
				continue;
			}

			// check for arrow id
			if(node.getAttribute('id').indexOf('ARROWS.') == 0)
			{
				if(showMultiArrow)
				{
					// hide single arrows
					node.setAttribute('display', 'none');
				}
				else if(!getIsLinkPartOfRoute(strDestLinkPvid))
				{
					node.setAttribute(ATTRIBUTE_FILL_OPACITY, ARROW_FILL_OPACITY);
					node.setAttribute("fill", "red");
				}
			}
			else if(node.getAttribute('id').indexOf('MULTI_ARROWS.') == 0)
			{
				if(!showMultiArrow)
				{
					// hide single arrows
					node.setAttribute('display', 'none');
				}
				else if(!getIsLinkPartOfRoute(strDestLinkPvid))
				{
					node.setAttribute(ATTRIBUTE_FILL_OPACITY, ARROW_FILL_OPACITY);
					node.setAttribute("fill", "red");
				}
			}

		}

	}

	// Helper to recursivly go through SVG elements and find the Signs - check if they are part of the route
	// and if not set opacy
	function setSignOpacity(nodeElement, refSignsPartOfRoute)
	{
		var listNodes = nodeElement.childNodes;

		for(var i = 0; i < listNodes.length; i++)
		{
			var node = listNodes[i];
			if(node.nodeName != 'g')
				continue;

			var strId = node.getAttribute('id');
			if(strId.charAt(0) != 'A')
			{
				setSignOpacity(node, refSignsPartOfRoute);
			}
			else if (refSignsPartOfRoute.indexOf(strId) >= 0)
			{
				continue;
			}
			else if (strId.charAt(0) == 'A')
			{
				var type = node.getAttribute('type');
				if(type != null && type.length > 0 && type.indexOf('Panel') == 0)
				{
					setSignOpacity(node, refSignsPartOfRoute);
				}
				else if(refSignsPartOfRoute.indexOf(strId) < 0)
				{
					node.setAttribute(ATTRIBUTE_FILL_OPACITY, SIGN_FILL_OPACITY);
				}
			}
		}
	}

	/**
	This method opens the popup with the JV image
	*/
	var showInfobubble = function(lastRequestedJvFileName, lastRequestedSarFileName, jvRenderCanvas)
	{
		var	html =  '<div>'+
			/*'<p style="font-family:Arial,sans-serif; font-size:12px;">JV File: ' + lastRequestedJvFileName +'</p>' +
			'<p style="font-family:Arial,sans-serif; font-size:12px;">SAR File: ' + lastRequestedSarFileName +'</p>' +*/
			'<img height="' + iCurrImageHeight + '" width="' + iCurrImageWidth + '" src="'+ jvRenderCanvas.toDataURL() +'">' +
				'</div>';

			currentJvInfoBubble = new H.ui.InfoBubble(lastClickedPos, { content: html });
			currentJvInfoBubble.addEventListener("statechange", function (e)
			{
				if (e.target.getState() == "closed")
				{
					currentJvInfoBubble = null;
					lastClickedPos = null;
				}
			});
			ui.addBubble(currentJvInfoBubble);
	}

	/*
	This method shows the junction view in the JV container (not popup)
	**/
	function showJvInSimulationView(jvRenderCanvas)
	{
		var jvContainer = document.getElementById('jvContainer');
		clearJunctionViewSimulationContainer();

		if(bSimulationRunning)
		{
			var imageElement = document.createElement("img");
			imageElement.setAttribute("src", jvRenderCanvas.toDataURL());
			imageElement.setAttribute("height", iCurrImageHeight);
			imageElement.setAttribute("width", iCurrImageWidth);
			imageElement.setAttribute("id", "jvSimulationImage");
			jvContainer.appendChild(imageElement);
		}
	}

	//--- Helper - Create Start / Destination marker
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;

		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, (line2 != undefined ? line2 : ""));
		svgMarker = svgMarker.replace(/__width__/g, (line2 != undefined ? line2.length  *4  + 20 : (line1.length * 4 + 80)));
		svgMarker = svgMarker.replace(/__widthAll__/g, (line2 != undefined ? line2.length  *4  + 80 : (line1.length * 4 + 150)));

		return new H.map.Icon(svgMarker, {
			anchor: new H.math.Point(24, 57)
		});
	}

	//Helper create svg for JVs
	var createIconMarkerJV = function (conditionId, colorMarker)
	{
		var svgMarkerJv = '<svg width="__widthAll__" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="22" width="__width__" y="10" x="34" fill="__color__"/>'+
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="40" stroke-width="0" fill="#000000">__line1__</text>' +
			'</g>'+
			'</svg>';

		svgMarkerJv = svgMarkerJv.replace(/__line1__/g, conditionId);
		svgMarkerJv = svgMarkerJv.replace(/__width__/g, conditionId.length  *4 + 32);
		svgMarkerJv = svgMarkerJv.replace(/__widthAll__/g, conditionId.length  *4 + 70);
		svgMarkerJv = svgMarkerJv.replace(/__color__/g, colorMarker);

		return new H.map.Icon(svgMarkerJv);

	};

	// Helper for clearing map display
	function clearPreviousResults()
	{
		currentRouteStrip = new H.geo.LineString();
		listLinksOnRoute = [];
		routeLinkHashMap  = new Object();
		clearInfoBubble();
		stopRouteSimulation();
		iSimulationIsAtPosition = 0;
		try
		{
			if(truckMarker)
			{
				map.removeObject(truckMarker);
			}
		}
		catch (e)
		{
			// this can happen if the group contains elements but they did not got added to the map
			// we do nothing.
		}
		try
		{
			if(group)
			{
				map.removeObject(group);
			}
		}
		catch (e)
		{
			// this can happen if the group contains elements but they did not got added to the map
			// we do nothing.
		}
		try
		{
			if(simulationGroup)
			{
				map.removeObject(simulationGroup);
			}
		}
		catch(e)
		{
			// nothing we can do
		}

		group = new H.map.Group()
		simulationGroup = new H.map.Group();
		bLongClickUseForStartPoint = true;
		checkRouteSimulationButtonEnabledState();
		feedbackTxt.innerHTML = "Routing from: " + start.value + " to " + dest.value + " ...";
	}

	// Helper for clearing all info bubble related variables
	function clearInfoBubble()
	{
		if(currentJvInfoBubble)
		{
			ui.removeBubble(currentJvInfoBubble);
			currentJvInfoBubble = null;
		}

		m_jvOriginalSvg = null;
		//m_skyOriginalSvg = null; note: we will keep the first loaded sky svg cause we can reuse it
		m_sarOriginalSvg = null;
		lastRequestedJvFileName = null;
		lastRequestedSarFileName = null;
		lastClickedPos = null;
	}

	// Helper for clearing the junction view simulation container
	function clearJunctionViewSimulationContainer()
	{
		var jvSimulationImage = document.getElementById("jvSimulationImage");

		if(jvSimulationImage)
		{
			jvSimulationImage.parentNode.removeChild(jvSimulationImage);

			// we clear also the path to the last JV/SAR images that they will not be re-used
			clearInfoBubble();
		}
	}

	/**
	This method handles the view (driver/bird) setting change
	*/
	function handleViewChanged()
	{
		currChoosenView = document.getElementById("view").value;

		if(currentJvInfoBubble)
		{
			clearInfoBubble();
			requestJvSkyAndSarFile();
		}
	}

	/**
	This method handles the aspect ratio change
	- removes last info bubble if open
	- if an info bubble was open - it requests JV image with new ratio
	*/
	function handleRatioChanged()
	{
		var ratios = document.getElementsByName("ratio");
		for (var i = 0; i < ratios.length; i++) {
			if (ratios[i].checked) {
				// do whatever you want with the checked radio
				currChoosenRatio = ratios[i].value;
				break;
			}
		}

		iCurrImageWidth = ratioImageSizes[currChoosenRatio][0];
		iCurrImageHeight = ratioImageSizes[currChoosenRatio][1];

		if(currentJvInfoBubble)
		{
			clearInfoBubble();
			requestJvSkyAndSarFile();
		}
	}

	/**
	This method handles the day/night change
	*/
	function handleDayNight()
	{
		dayNightSetting = document.getElementById("dayNight").value;

		if(currentJvInfoBubble)
		{
			clearInfoBubble();
			requestJvSkyAndSarFile();
		}
	}

	/**
	This method handles the arrow change
	*/
	function handleArrowChanged()
	{
		showMultiArrow = document.getElementById("multiArrow").checked;

		if(currentJvInfoBubble)
		{
			clearInfoBubble();
			requestJvSkyAndSarFile();
		}
	}

	// Helper for checking if a given link id is part of the calculated route
	function getIsLinkPartOfRoute(strDestLinkPvid)
	{
		if(routeLinkHashMap[strDestLinkPvid] != null)
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	// Helper for checking if array contains value
	function arrayContains(array, obj)
	{
		for (var i = 0; i < array.length; i++)
		{
			if (array[i] === obj)
			{
				return true;
			}
		}
		return false;
	}

	// Helper to set correct state to route simulation button
	function checkRouteSimulationButtonEnabledState()
	{
		if(listLinksOnRoute.length == 0)
		{
			document.getElementById("simulateRouteButton").disabled = true;
		}
		else
		{
			document.getElementById("simulateRouteButton").disabled = false;
		}
	}

	// Helper to return the route shape upfront a JV
	function getJvSimulationStrip(linkIds)
	{
		var shape = [];
		var linkSplit = linkIds.split(",");
		var currLinkToProcess = linkSplit.length -1;
		// find position of JV link
		var lastLinkIdOfJvCondition = linkSplit[currLinkToProcess].lastIndexOf("-", 0) === 0 ? linkSplit[currLinkToProcess].substring(1) : linkSplit[currLinkToProcess]; // we remove the '-' since in routeLinkHashMap all link ids are positive
		var linkPosOnRoute = routeLinkHashMap[lastLinkIdOfJvCondition].$linkPositionOnRoute;
		var bWalkBackJvLinks = true;
		var upfrontJvConditionLength = 0;

		// first we add all the link shapes between the links that belong to a junction view
		while (bWalkBackJvLinks)
		{
			if(linkPosOnRoute < 0)
			{
				// we're at the start of the route - there is no more to add
				break;
			}

			var linkIdOnRoute = listLinksOnRoute[linkPosOnRoute].$linkId.lastIndexOf("+", 0) === 0 ?  listLinksOnRoute[linkPosOnRoute].$linkId.substring(1) : listLinksOnRoute[linkPosOnRoute].$linkId;
			var bAddShapeFromRef = listLinksOnRoute[linkPosOnRoute].$linkId.lastIndexOf("+", 0) === 0 ? false : true;
			if(linkIdOnRoute == linkSplit[currLinkToProcess])
			{
				if(linkSplit[currLinkToProcess] == linkSplit[0])
				{
					// if we reach the first link of the junction view condition than we stop here
					bWalkBackJvLinks = false;
				}
				currLinkToProcess--;
			}

			if(bAddShapeFromRef)
			{
				for(var i = 0; i < listLinksOnRoute[linkPosOnRoute].$linkShape.length; i++)
				{
					shape = shape.concat(listLinksOnRoute[linkPosOnRoute].$linkShape[i]);
				}
			}
			else
			{
				for(var i = listLinksOnRoute[linkPosOnRoute].$linkShape.length - 1; i >= 0; i--)
				{
					shape = shape.concat(listLinksOnRoute[linkPosOnRoute].$linkShape[i]);
				}
			}
			--linkPosOnRoute;
		}

		// now add the distance upfront route
		var bWalkBackRouteLinks = true;
		while (bWalkBackRouteLinks)
		{
			if(linkPosOnRoute < 0)
			{
				// we're at the start of the route - there is no more to add
				break;
			}

			bAddShapeFromRef = listLinksOnRoute[linkPosOnRoute].$linkId.lastIndexOf("+", 0) === 0 ? false : true;
			if(bAddShapeFromRef)
			{
				for(var i = 0; i < listLinksOnRoute[linkPosOnRoute].$linkShape.length; i++)
				{
					shape = shape.concat(listLinksOnRoute[linkPosOnRoute].$linkShape[i]);
				}
			}
			else
			{
				for(var i = listLinksOnRoute[linkPosOnRoute].$linkShape.length - 1; i >= 0; i--)
				{
					shape = shape.concat(listLinksOnRoute[linkPosOnRoute].$linkShape[i]);
				}
			}

			upfrontJvConditionLength += listLinksOnRoute[linkPosOnRoute].$linkLength;
			if(upfrontJvConditionLength >= SHOW_JV_UPFRONT_DISTANCE)
			{
				bWalkBackRouteLinks = false;
			}
			--linkPosOnRoute;
		}

		return shape;
	}

	// start route simulation
	function startStopRouteSimulation()
	{
		if(!bSimulationRunning)
		{
			startRouteSimulation();
		}
		else
		{
			stopRouteSimulation();
		}
	}

	// Helper for route simulation start
	function startRouteSimulation()
	{
		// start simulation

		// check if truck or simulation group is already part of the map - otherwise add them
		var arrayMapObjects = map.getObjects();
		var bTruckMarkerFound = false;
		var bSimulationGroupFound = false;
		for(var k = 0; k < arrayMapObjects.length; k++)
		{
			if(arrayMapObjects[k] == truckMarker)
			{
				bTruckMarkerFound = true;
			}
			if(arrayMapObjects[k] == simulationGroup)
			{
				bSimulationGroupFound = true;
			}

			if(bTruckMarkerFound && bSimulationGroupFound)
			{
				break;
			}
		}
		if(!bTruckMarkerFound)
		{
			// set route start
			var startCoord = currentRouteStrip.extractPoint(0);
			truckMarker.setGeometry(startCoord);
			iSimulationIsAtPosition = 0;
			map.addObject(truckMarker);
		}
		if(!bSimulationGroupFound)
		{
			map.addObject(simulationGroup);
		}
		document.getElementById("simulateRouteButton").value = "Stop Simulation";
		bSimulationRunning = true;
		clearInfoBubble();
		//start walker
		simulationWalker = new Walker(truckMarker, currentRouteStrip);
		simulationWalker.walk();
	}

	// Helper for route simulation stop
	function stopRouteSimulation()
	{
		// stop simulation
		bSimulationRunning = false;
		document.getElementById("simulateRouteButton").value = "Simulate Route";
		clearJunctionViewSimulationContainer();
		if(simulationWalker)
		{
			simulationWalker.stop();
		}
	}




	var Walker = function (marker, path)
	{
		this.path = path;
		this.marker = marker;
		this.dir = -1;
		this.isWalking = false;
		this.currentShowingJv = null;
		var that = this;
		this.walk = function ()
		{
			that.walkProcess = true;
			// Get the next coordinate from the route and set the marker to this coordinate
			var coord = path.extractPoint(iSimulationIsAtPosition);

			marker.setGeometry(coord);

			// If we get to the end of the route reverse direction
			if (!iSimulationIsAtPosition || iSimulationIsAtPosition === path.getPointCount() - 1) {
				iSimulationIsAtPosition = 0;
			}

			iSimulationIsAtPosition += 1;

			/* Recursively call this function with time that depends on the distance to the next point
			* which makes the marker move in similar random fashion
			*/
			that.timeout = setTimeout(that.walk, 100);
			that.isWalking = true;

			var pixelcoord  = map.geoToScreen(coord);
			map.getObjectsAt(pixelcoord.x, pixelcoord.y, objects => {
				var bJvSimulationPathFound = false;
				for (var object in objects)
				{
					if (objects[object].$jvMarker)
					{
						bJvSimulationPathFound = true;
						// show JV
						if(that.currentShowingJv == null || that.currentShowingJv != objects[object].$jvMarker.$jvFile)
						{
							// load JV
							that.currentShowingJv = objects[object].$jvMarker.$jvFile;
							requestJvSkyAndSarFile(objects[object].$jvMarker.$jvFormat, objects[object].$jvMarker.$jvFile, objects[object].$jvMarker.$sarFormat, objects[object].$jvMarker.$sarFile);
						}

						break;
					}
				}
				// clear last shown JV if out of the fence
				if(!bJvSimulationPathFound && that.currentShowingJv != null)
				{
					clearJunctionViewSimulationContainer();
				}
				//map.getViewPort().dispatchEvent('update'); //force requestAnimationFrame but doesn't work afects to amp objects on the map
			});
		};

		this.stop = function ()
		{
			clearTimeout(that.timeout);
			this.isWalking = false;
		};
	};
