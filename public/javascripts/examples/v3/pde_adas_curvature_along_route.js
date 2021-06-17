/*
	author ez
	(C) HERE 2014
	*/

	// setting for hi res map tiles
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	// the map container
	var mapContainer = document.getElementById('mapContainer'),

	// check if the site was loaded via secure connection
	secure = (location.protocol === 'https:') ? true : false;

	// initializing of the HERE platform service
	platform = new H.service.Platform({
		app_code: app_code,
		app_id: app_id,
		useHTTPS: secure
	}),
	// setting of the map type default
	maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
	// geocoder (for route start and destination)
	geocoder = platform.getGeocodingService(),
	// router
	router = platform.getRoutingService(),
	// object that holds the links, start/destination markers
	// via this group they get added to the map display (and also removed)
	group = new H.map.Group(),
	markerGroup = new H.map.Group(),
	// link curvature group that get added to the map display
	linkCurvatureGroup = new H.map.Group(),
	bLinkCurvatureShownOnMap = false,
	// speedlimit group that get added to the map display
	speedlimitGroup = new H.map.Group(),
	bSpeedlimitShownOnMap = false,
	// internal variable holds the last link speedlimit on the route
	iLastLinkSpeedlimit = 0,
	// the PDE layers used in this demo
	layers = null,
	// instantiate a map in the 'map' div, set the base map to normal
	map = new H.Map(mapContainer, maptypes.normal.map,
		{
			center: new H.geo.Point(47.574356, 10.408155),
			zoom: 7
		}
	);

	// Do not draw under control panel
	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

	// PDE manager
	var pdeManager = new PDEManager(app_id, app_code, layers);
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
	depature,

	// links are also clickable - this is the info bubble for current open link
	currentLinkInfoBubble,
	// color of curve lines
	curvatureColor = "rgba(255, 50, 190, 0.7)",
	// color of speed limit changed
	speedLimitChangedColor = "rgba(0, 0, 0, 1)",
	// color of curve warnings
	speedWarningColor = "rgba(255, 20, 0, 1)",
	// last clicked position
	lastClickedPos = null,
	// speedlimit unit
	speedLimitUnit;

	// start and destination marker
	var startMarker = null;
	var destMarker = null;

	var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination

	// adas coordinate to wgs conversion
	var ADASNTU_TO_WGS84 = 10000000;
	// hashmap with all route links - used to match the arrows of the JVs
	var routeLinkHashMap  = new Object(); // key = linkID (always positive), value = link object

	// color code explanation
	var colorExplanation = "<span style=\"font-weight: normal;color:" + rgb2hex(curvatureColor) + ";\">Purple: Curvature</span>";
	colorExplanation +=    "<br/><span style=\"font-weight: normal;color:" + rgb2hex(speedLimitChangedColor) + ";\">Black: Speedlimit change along route</span>";
	colorExplanation +=    "<br/><span style=\"font-weight: normal;color:" + rgb2hex(speedWarningColor) + ";\">Red: Warning that legal speedlimit is higher than actual possible driving speed [legal speedlimit /</br>suggested speed]</span>";

	// SIMULATION OBJECTS
	// holds the polylines which markes the JV visible path during simulation
	var simulationGroup = new H.map.Group();

	// simulation running or not
	var bSimulationRunning = false;
	//TODO: check if needed
	// object with all route points
	var currentRouteStrip = new H.geo.Strip();
	// truck icon
	var truckIcon = new H.map.Icon('/assets/icons/markerTruck.png');
	// warning truck icon
	var warningTruckIcon = new H.map.Icon('/assets/icons/markerTruckWarning.png');
	// truck marker
	var truckMarker = new H.map.Marker({ lat: 52.53805, lng: 13.4205 }, { icon: truckIcon });
	truckMarker.$id = "truckMarker";
	var iSimulationIsAtLinkPosition = 0;
	var iSimulationIsAtLinkShapePosition = 0;
	// simulation walker
	var simulationWalker = null;
	var listLinksOnRoute = [];
	var simulationContainer = document.getElementById("simulationContainer");
	var currentWalkerTimeout = 100;
	// color of simulation speed ok
	var	simulationSpeedOkColor = "rgba(20, 255, 20, 1)";
	var	simulationSpeedWarningColor = "rgba(255, 20, 20, 1)";
	var maxLookupMetersUpfrontRouteForCurvature = 200;

	// initializations
	map.addObject(markerGroup);

	// init callbacks for tile/file received finish

	// init link curvature display
	handleLinkCurvatureChanged();
	// init speedlimit display
	handleSpeedlimitChanged();
	// init speedlimit unit
	handleUnitChange();

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
			startRouteCalculation();
		}
	}

	/**
	This method will start the route calculation (incl. geocoding of the start and destination point)
	and will retrive the Junction View image locations from the HERE PDE service.
	*/
	var startRouteCalculation = function()
	{
		layers = new Object();
		layers["SPEED_LIMITS_FC"] = {callback: gotSpeedlimitTile};

		pdeManager.setLayers(layers);

		clearPreviousResults();

		depature = "now";
		geocode(start.value, true);
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

			// create link objects
			for(var m = 0; m < respJsonRouteObj.response.route[0].leg[0].link.length; m++)
			{
				var strip = new H.geo.Strip(),
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
							strokeColor: "rgba(18, 65, 145, 0.4)",
							lineJoin: "round"
						}
					});
					link.setArrows({color:"#F00F",width:2,length:3,frequency: 4});
					// we store some additional values to each link cause they get re-used for simulation
					link.$linkId = respJsonRouteObj.response.route[0].leg[0].link[m].linkId;
					link.$linkLength = respJsonRouteObj.response.route[0].leg[0].link[m].length;
					link.$linkShape = shape;
					link.$linkPositionOnRoute = m;
					routeLinkHashMap[respJsonRouteObj.response.route[0].leg[0].link[m].linkId.substring(1)] = link;
					//save also in sequential list  - enables to sum up the link length
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
			pdeManager.setOnTileLoadingFinished(pdeManagerSpeedFinished);
			pdeManager.start();
	}

	// callback for PDE manager finished receiving speedlimit tile information
	function pdeManagerSpeedFinished(evt)
	{
		layers = new Object();
		layers["ADAS_ATTRIB_FC"] = {callback: gotAdasTile};

		pdeManager.setLayers(layers);
		pdeManager.setOnTileLoadingFinished(pdeManagerAdasFinished);
		pdeManager.start();
	}

	// callback for PDE manager finished receiving adas tile information, then the curvature and max speedlimit display
	// gets generated
	function pdeManagerAdasFinished(evt)
	{
		map.addObject(group);
		map.setViewBounds(group.getBounds());
		generateCurvatureAlongRoute();
		generateMaxSpeedlimitAlongRoute();
		handleLinkCurvatureChanged();
		handleSpeedlimitChanged();
	}

	// callback that is set to PDE manager and that gets called with the speedlimit tile information
	// that get requested (after route calculation)
	function gotSpeedlimitTile(resp)
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

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = resp.Rows[r].LINK_ID;

			if(pdeManager.getLinkPartOfRoute(linkId))
			{
				// save speedlimit information to link
				routeLinkHashMap[linkId].$FROM_REF_SPEED_LIMIT = resp.Rows[r].FROM_REF_SPEED_LIMIT;
				routeLinkHashMap[linkId].$TO_REF_SPEED_LIMIT = resp.Rows[r].TO_REF_SPEED_LIMIT;
				routeLinkHashMap[linkId].$SPEED_LIMIT_UNIT = resp.Rows[r].SPEED_LIMIT_UNIT;
			}
		}
	}

	// callback that is set to PDE manager and that gets called with the adas tile information
	// that get requested (after route calculation)
	function gotAdasTile(resp)
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
		feedbackTxt.innerHTML = colorExplanation;

		for (var r = 0; r < resp.Rows.length; r++)
		{
			var linkId = resp.Rows[r].LINK_ID;

			if(pdeManager.getLinkPartOfRoute(linkId))
			{

				var curvature = resp.Rows[r].CURVATURES;
				var headings = resp.Rows[r].HEADINGS;
				var hpx = resp.Rows[r].HPX;
				var hpy = resp.Rows[r].HPY;
				var refLinkCurvHeads = resp.Rows[r].REFNODE_LINKCURVHEADS;
				var nrefLinkCurvHeads = resp.Rows[r].NREFNODE_LINKCURVHEADS;

				var curvatureSplit = curvature.split(',');
				var headingsSplit = headings.split(',');
				var hpxSplit = hpx.split(',');
				var hpySplit = hpy.split(',');
				var refLinkCurvHeadsSplit = refLinkCurvHeads.split(',');
				var nrefLinkCurvHeadsSplit = nrefLinkCurvHeads.split(',');

				if(curvatureSplit.length == 1 && curvatureSplit[0] == '')
				{
					curvatureSplit = [];
				}
				if(headingsSplit.length == 1 && headingsSplit[0] == '')
				{
					headingsSplit = [];
				}

				// result arrays for curvature and heading
				var resultCurvature = [];
				var resultHeading = [];
				var resultHpx = [];
				var resultHpy = [];

				//0. find out if link is driven from or to reference node
				var bLinkIsDrivenFromReferenceNode = pdeManager.getLinkIsDrivenFromReferenceNodeOnRoute(linkId);

				//1. handle reference node
				var previousLinkId = pdeManager.getPreviousIdLinkOnRoute(linkId, false);

				var bNodePointAdded = false;
				if(previousLinkId != null)
				{
					for(var k = 0; k < refLinkCurvHeadsSplit.length; k++)
					{
						var splitData = refLinkCurvHeadsSplit[k].split(':');
						if(splitData[0] == (previousLinkId - linkId))
						{
							resultCurvature.push(parseInt(splitData[1]));
							resultHeading.push(parseInt(splitData[2] / 1000));
							bNodePointAdded = true;
							break;
						}
					}
				}

				if(!bNodePointAdded)
				{
					resultCurvature.push(0);
					resultHeading.push(0);
				}

				// 2. handle shape curvatures, heading, coordinates
				var lastCoordValueCurvature = 0;
				for(var k = 0; k < curvatureSplit.length; k++)
				{
					lastCoordValueCurvature += parseInt(curvatureSplit[k]);
					resultCurvature.push(lastCoordValueCurvature);
				}

				var lastCoordValueHeading = 0;
				for(var k = 0; k < headingsSplit.length; k++)
				{
					lastCoordValueHeading += parseInt(headingsSplit[k]);
					resultHeading.push(parseInt(lastCoordValueHeading / 1000));
				}

				var lastCoordValueHpx = 0;
				for(var k = 0; k < hpxSplit.length; k++)
				{
					lastCoordValueHpx += parseInt(hpxSplit[k]);
					resultHpx.push(lastCoordValueHpx);
				}

				var lastCoordValueHpy = 0;
				for(var k = 0; k < hpySplit.length; k++)
				{
					lastCoordValueHpy += parseInt(hpySplit[k]);
					resultHpy.push(lastCoordValueHpy);
				}

				// 3. handle nonreference node
				var nextLinkId = pdeManager.getNextLinkIdOnRoute(linkId, false);

				bNodePointAdded = false;
				if(nextLinkId != null)
				{
					for(var k = 0; k < nrefLinkCurvHeadsSplit.length; k++)
					{
						var splitData = nrefLinkCurvHeadsSplit[k].split(':');
						if(splitData[0] == (nextLinkId - linkId))
						{
							resultCurvature.push(parseInt(splitData[1]));
							resultHeading.push(parseInt(splitData[2]) / 1000);
							bNodePointAdded = true;
							break;
						}
					}
				}

				if(!bNodePointAdded)
				{
					resultCurvature.push(0);
					resultHeading.push(0);
				}

				// at this point we have all curvature and heading data to the link - so we save it
				routeLinkHashMap[linkId].$HPX = resultHpx;
				routeLinkHashMap[linkId].$HPY = resultHpy;
				routeLinkHashMap[linkId].$CURVATURE = resultCurvature;
				routeLinkHashMap[linkId].$HEADING = resultHeading;
				routeLinkHashMap[linkId].$LINK_DRIVEN_FROM_REV = bLinkIsDrivenFromReferenceNode;
			}
		}
	}

	/**
	This method generates the curvature along the route display
	*/
	function generateCurvatureAlongRoute()
	{
		var linksAlongRoute = pdeManager.getLinks();

		// create curvature lines
		for(var i = 0; i < linksAlongRoute.length; i++)
		{
			var currLinkId = linksAlongRoute[i].linkId;
			// remove + or - sign
			var linkIdWithoutSign = currLinkId.lastIndexOf("+", 0) === 0 ?  currLinkId.substring(1) : currLinkId;
			linkIdWithoutSign = linkIdWithoutSign.lastIndexOf("-", 0) === 0 ?  linkIdWithoutSign.substring(1) : linkIdWithoutSign;
			var linkObject = routeLinkHashMap[linkIdWithoutSign];
			// safety check if route got cleared in the meanwhile
			if(pointA != null)
			{
				// check if ADAS data is available for the link
				if(linkObject.$HPX != null)
				{
					for(var k = 0; k < linkObject.$HPX.length; k++)
					{
						var x = linkObject.$HPX[k];
						var y = linkObject.$HPY[k];
						var curvature = linkObject.$CURVATURE[k];
						var heading = linkObject.$HEADING[k];
						renderCurvature(x, y, curvature, heading);
					}
				}
			}
		}
	}

	/**
	This method generates the max speedlimit along the route display
	*/
	function generateMaxSpeedlimitAlongRoute()
	{
		var linksAlongRoute = pdeManager.getLinks();

		if(linksAlongRoute)
		{
			for(var i = 0; i < linksAlongRoute.length; i++)
			{
				var currLinkId = linksAlongRoute[i].linkId;
				// remove + or - sign
				var linkIdWithoutSign = currLinkId.lastIndexOf("+", 0) === 0 ?  currLinkId.substring(1) : currLinkId;
				linkIdWithoutSign = linkIdWithoutSign.lastIndexOf("-", 0) === 0 ?  linkIdWithoutSign.substring(1) : linkIdWithoutSign;
				var linkObject = routeLinkHashMap[linkIdWithoutSign];
				// safety check if route got cleared in the meanwhile
				if(pointA != null)
				{
					// check if ADAS data is available for the link
					if(linkObject.$HPX != null)
					{
						for(var k = 0; k < linkObject.$HPX.length; k++)
						{
							var x = linkObject.$HPX[k];
							var y = linkObject.$HPY[k];
							var curvature = linkObject.$CURVATURE[k];
							var slope = null; // not yet implemented
							createSpeedlimit(x, y, curvature, slope, linkObject, linkObject.$LINK_DRIVEN_FROM_REV);
						}

						//revert max speedlimit array depending on driven direction
						if(!linkObject.$LINK_DRIVEN_FROM_REV)
						{
							if (linkObject.$maxPossibleSpeed == true)
								linkObject.$maxPossibleSpeed.reverse();
						}
					}
				}
			}
		}
	}

	/**
	This method takes ADAS coordinates (x, y) and their curvature and heading information and renders
	the curvature on the map display via polylines
	*/
	function renderCurvature(x, y, curvature, heading)
	{
		// Missing values are represented as NULL or as 1000000000.
		if(curvature == 1000000000)
			return;

		// calculate shifted lat/lon for curvature polyline
		var radius = curvature == 0 ? 0 : (1000000.0 / curvature);
		radius = radius == 0 ? 0 : -((1 / radius) * 2000);
		var bearingSuppl = -90;
		if (radius < 0)
		{
			radius *= -1;
			bearingSuppl *= -1;
		}

		var lat = y / ADASNTU_TO_WGS84;
		var lon = x / ADASNTU_TO_WGS84;
		var shiftedLatLon = shiftLatLon(lat, lon, (heading + bearingSuppl + 360) % 360, radius);

		// console.log("" + x + "/" + y + " curvature: " + curvature + " heading: " + heading + " results in radius: " + radius + " and bearing: " + bearingSuppl + ":: " + lat + "/" + lon + "/" + shiftedLatLon[0] + "/" + shiftedLatLon[1]);

		// create polyline
		var strip = new H.geo.Strip();
		strip.pushLatLngAlt(lat, lon, 0);
		strip.pushLatLngAlt(shiftedLatLon[0], shiftedLatLon[1], 0);

		var curvatureLine = new H.map.Polyline(strip,
			{
				style:
				{
					lineWidth: 2,
					strokeColor: curvatureColor
				}
			});
			linkCurvatureGroup.addObject(curvatureLine);
	}

	/**
	This method shifts the given lat and long along given bearing to the given distance
	*/
	function shiftLatLon(latDegrees, lonDegrees, bearing, distance)
	{
		var earthRadius = 6371000;
		// convert input parameters from decimal degrees into radians
		var latRad = (latDegrees) * Math.PI / 180;
		var lonRad = (lonDegrees) * Math.PI / 180;

		var bearingRad = bearing * Math.PI / 180;
		var distRad = distance / earthRadius;

		var latNewRad = Math.asin(Math.sin(latRad) * Math.cos(distRad) + Math.cos(latRad) * Math.sin(distRad)
		* Math.cos(bearingRad));
		var lonNewRad = lonRad
		+ Math.atan2(Math.sin(bearingRad) * Math.sin(distRad) * Math.cos(latRad), Math.cos(distRad) - Math.sin(latRad)
		* Math.sin(latNewRad));

		// convert input parameters from radians into decimal degrees
		var latNewDegrees = latNewRad * 180 / Math.PI;
		var lonNewDegrees = lonNewRad * 180 / Math.PI;
		var latLonRet = [];
		latLonRet.push(latNewDegrees);
		latLonRet.push(lonNewDegrees);
		return latLonRet;
	}

	/**
	This method generates the speedlimits
	*/
	function createSpeedlimit(x, y, curvature, slope, link, bLinkIsDrivenFromReferenceNode)
	{
		var lat = y / ADASNTU_TO_WGS84;
		var lon = x / ADASNTU_TO_WGS84;

		var actualSpeedLimit = null;

		if(bLinkIsDrivenFromReferenceNode)
		{
			actualSpeedLimit = link.$FROM_REF_SPEED_LIMIT;
		}
		else
		{
			actualSpeedLimit = link.$TO_REF_SPEED_LIMIT;
		}

		// ignore ramps speed limit or null values (speed limit not known)
		if(actualSpeedLimit == 999 || actualSpeedLimit == null)
		{
			return;
		}

		if(speedLimitUnit == 2)
		{
			// convert speedlimit to mph
			actualSpeedLimit = parseInt((((actualSpeedLimit * 0.621371) + 0.5) * 100) / 100)
		}

		// generate maximal possible Speed based on curvature data
		var bCurvatureSpeedlimitCreated = false;
		var maxPossibleSpeed = generateMaximalPossibleSpeed(curvature, slope);
		var maxPossibleSpeedSelected = 0;
		if(speedLimitUnit == 1)
		{
			// use kmh
			maxPossibleSpeedSelected = maxPossibleSpeed[2];
		}
		else if (speedLimitUnit == 2)
		{
			// use mph
			maxPossibleSpeedSelected = maxPossibleSpeed[1];
		}

		if(!link.$maxPossibleSpeed)
		{
			link.$maxPossibleSpeed = [];
		}
		// save max possible speed to link for simulation
		link.$maxPossibleSpeed.push(maxPossibleSpeed[2]);

		if(maxPossibleSpeedSelected != 999999) // only create marker if there is a valid speed
		{
			if(maxPossibleSpeedSelected < actualSpeedLimit) // and if the generated max speedlimit is lower than the legal speedlimit
			{
				var marker = new H.map.Marker(new H.geo.Point(lat, lon), {icon: createSpeedlimitIcon(speedWarningColor, actualSpeedLimit + "/" + maxPossibleSpeedSelected, 24)});
				speedlimitGroup.addObject(marker);
				bCurvatureSpeedlimitCreated = true;
			}
		}

		// in case no warning marker was created and the legal speedlimit changed - show it
		if(!bCurvatureSpeedlimitCreated)
		{
			if(actualSpeedLimit != iLastLinkSpeedlimit)
			{
				var marker = new H.map.Marker(new H.geo.Point(lat, lon), {icon: createSpeedlimitIcon(speedLimitChangedColor, actualSpeedLimit, 24)});
				speedlimitGroup.addObject(marker);
			}

			iLastLinkSpeedlimit = actualSpeedLimit;
		}
	}

	/**
	This method calculates out of the curvature the maximal possible speed that a normal car should drive. For Curvature = 0 the returned
	speed with also be 999999 - means endless
	@return: an array with the 3 max speedlimits [speedMaxMeterPerSecond, speedMaxMilesPerHour, speedMaxKilometerPerHour]
	@honor to http://hyperphysics.phy-astr.gsu.edu/hbase/mechanics/carbank.html#c1
	*/
	//TODO: add slope
	function generateMaximalPossibleSpeed(curvature, slope)
	{
		var aRet = [];
		if(curvature != 0)
		{
			if(curvature < 0)
			{
				curvature *= -1;
			}
			if(slope == null || slope == 0)
			{
				slope = 1;
			}
			var radius = curvature == 0 ? 0 : (1000000.0 / curvature);
			var staticFriction = 0.5;
			var aSlope = slope * Math.PI / 180;

			/* can be enabled if slope gets passed to this method
			speedMaxMeterPerSecondWithSlope = Math.sqrt(radius*9.8*(Math.sin(aSlope)-(-1)*staticFriction*Math.cos(aSlope))/(Math.cos(aSlope)-staticFriction*Math.sin(aSlope)));
			speedMaxMilesPerHourWithSlope = speedMaxMeterPerSecondWithSlope*2.2369;
			speedMaxKilometerPerHourWithSlope = speedMaxMeterPerSecondWithSlope*3.6;
			*/

			var speedMaxMeterPerSecond = Math.sqrt(radius * 9.8 * staticFriction);
			var speedMaxMilesPerHour = speedMaxMeterPerSecond * 2.2369;
			var speedMaxKilometerPerHour = speedMaxMeterPerSecond * 3.6;

			var resultMeterPerSecond = parseInt(((speedMaxMeterPerSecond + 0.5) * 100) / 100);
			var resultMilesPerHour = parseInt(((speedMaxMilesPerHour + 0.5) * 100) / 100);
			var resultKilometerPerHour = parseInt(((speedMaxKilometerPerHour + 0.5) * 100) / 100);

			aRet.push(resultMeterPerSecond);
			aRet.push(resultMilesPerHour);
			aRet.push(resultKilometerPerHour);
		}
		else
		{
			aRet.push(999999);
			aRet.push(999999);
			aRet.push(999999);
		}
		return aRet;
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

	// helper for creation of speedlimit icon
	var createSpeedlimitIcon = function (color, text, height) {
		var div = document.createElement("div");
		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="56px" height="' + height + 'px">' +
			'<line x1="28"  y1="' + height + '" x2="28" y2="' + (height - 7) + '" stroke="' + color + '"/>' +
			'<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
			text + '</text>' +
			'</svg>';
		div.innerHTML = svg;
		return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
	};

	// Helper for clearing map display
	function clearPreviousResults()
	{
		currentRouteStrip = new H.geo.Strip();
		listLinksOnRoute = [];
		routeLinkHashMap  = new Object();
		clearInfoBubble();
		stopRouteSimulation();
		iLastLinkSpeedlimit = 0;
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
			if(linkCurvatureGroup)
			{
				map.removeObject(linkCurvatureGroup);
				bLinkCurvatureShownOnMap = false;
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

		clearSpeedlimitAlongRoute();

		group = new H.map.Group()
		linkCurvatureGroup = new H.map.Group();
		bLongClickUseForStartPoint = true;
		simulationGroup = new H.map.Group();
		checkRouteSimulationButtonEnabledState();
		truckMarker.setIcon(truckIcon);
		feedbackTxt.innerHTML = "Routing from: " + start.value + " to " + dest.value + " ...";
	}

	// Helper to clear speedlimit signs along route
	function clearSpeedlimitAlongRoute()
	{
		try
		{
			if(speedlimitGroup)
			{
				map.removeObject(speedlimitGroup);
				bSpeedlimitShownOnMap = false;
			}
		}
		catch (e)
		{
			// this can happen if the group contains elements but they did not got added to the map
			// we do nothing.
		}

		speedlimitGroup = new H.map.Group();
	}

	// Helper for clearing all info bubble related variables
	function clearInfoBubble()
	{
		if(currentLinkInfoBubble)
		{
			ui.removeBubble(currentLinkInfoBubble);
			currentLinkInfoBubble = null;
		}

		lastClickedPos = null;
	}

	/**
	This method handles the speedlimit unit change
	*/
	function handleUnitChange()
	{
		speedLimitUnit = document.getElementById("speedUnit").value;
		clearSpeedlimitAlongRoute();
		generateMaxSpeedlimitAlongRoute();
		handleSpeedlimitChanged();
	}

	/**
	This method handles if linkCurvature should be shown on map display or not
	*/
	function handleLinkCurvatureChanged()
	{
		bShowLinkCurvature = document.getElementById("linkCurvature").checked;

		displayLinkCurvature(bShowLinkCurvature);
	}

	function displayLinkCurvature(bShow)
	{
		if(pointA) // only show link curvature object if geocoding was done
		{
			if(bShow)
			{
				if(!bLinkCurvatureShownOnMap)
				{
					map.addObject(linkCurvatureGroup);
					bLinkCurvatureShownOnMap = true;
				}
			}
			else
			{
				if(bLinkCurvatureShownOnMap)
				{
					try
					{
						if(linkCurvatureGroup)
						{
							map.removeObject(linkCurvatureGroup);
							bLinkCurvatureShownOnMap = false;
						}
					}
					catch (e)
					{
						// this can happen if the group contains elements but they did not got added to the map
						// we do nothing.
					}
				}
			}
		}
	}

	/**
	This method handles if speedlimits should be shown on map display or not
	*/
	function handleSpeedlimitChanged()
	{
		bShowySpeedlimits = document.getElementById("shapeSpeedlimit").checked;

		displaySpeedlimits(bShowySpeedlimits);
	}

	function displaySpeedlimits(bShow)
	{
		if(pointA) // only show link curvature object if geocoding was done
		{
			if(bShow)
			{
				if(!bSpeedlimitShownOnMap)
				{
					map.addObject(speedlimitGroup);
					bSpeedlimitShownOnMap = true;
				}
			}
			else
			{
				if(bSpeedlimitShownOnMap)
				{
					try
					{
						if(speedlimitGroup)
						{
							map.removeObject(speedlimitGroup);
							bSpeedlimitShownOnMap = false;
						}
					}
					catch (e)
					{
						// this can happen if the group contains elements but they did not got added to the map
						// we do nothing.
					}
				}
			}
		}
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
		simulationContainer.style.display = "block";
		truckMarker.setIcon(truckIcon);
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
			truckMarker.setPosition(startCoord);
			iSimulationIsAtLinkPosition = 0;
			iSimulationIsAtLinkShapePosition = 0;
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
		simulationWalker = new Walker(truckMarker);
		simulationWalker.walk();
	}

	// Helper for route simulation stop
	function stopRouteSimulation()
	{
		// stop simulation
		bSimulationRunning = false;
		document.getElementById("simulateRouteButton").value = "Simulate Route";
		simulationContainer.style.display = "none";
		if(simulationWalker)
		{
			simulationWalker.stop();
		}
	}

	var Walker = function (marker)
	{
		this.marker = marker;
		this.dir = -1;
		this.isWalking = false;
		this.currentShowingJv = null;
		var that = this;
		this.walk = function ()
		{
			// Get the next coordinate from the route and set the marker to this coordinate
			var currLink = listLinksOnRoute[iSimulationIsAtLinkPosition];
			var shape = currLink.$linkShape;
			var coord = shape[iSimulationIsAtLinkShapePosition].split(',');
			marker.setPosition(new H.geo.Point(coord[0], coord[1]));


			/* Recursively call this function with time that depends on the distance to the next point
			* which makes the marker move in similar random fashion
			*/
			that.timeout = setTimeout(that.walk, currentWalkerTimeout);
			that.isWalking = true;

			var iCurrSpeed = 0;
			if(currLink.$LINK_DRIVEN_FROM_REV)
			{
				iCurrSpeed = currLink.$FROM_REF_SPEED_LIMIT;
			}
			else
			{
				iCurrSpeed = currLink.$TO_REF_SPEED_LIMIT;
			}

			// lookup the speed upfront the road
			var linkPosOnRoute = currLink.$linkPositionOnRoute;
			var bWalkAlongRoute = true;
			var length = 0;
			var bShowWarning = false;
			var iUpcomingWarningSpeed = 999999;

			while(bWalkAlongRoute)
			{
				if(linkPosOnRoute >= listLinksOnRoute.length)
				{
					// we're at the end of the route - there is no more to add
					break;
				}

				// ignore ramp speed
				if(iCurrSpeed != 999)
				{

					if(listLinksOnRoute[linkPosOnRoute].$maxPossibleSpeed)
					{
						var u = 0;
						//if current evaluating link is the current active one, than we skip all previous shapepoints
						if(listLinksOnRoute[linkPosOnRoute] == currLink)
						{
							u = iSimulationIsAtLinkShapePosition;
						}
						// check each shapepoint value
						for(; u < listLinksOnRoute[linkPosOnRoute].$maxPossibleSpeed.length; u++)
						{
							var iMaxPosSpeed = listLinksOnRoute[linkPosOnRoute].$maxPossibleSpeed[u];
							if(iMaxPosSpeed < iCurrSpeed)
							{
								// show warning!
								bShowWarning = true;
								var iWarningSpeed = iMaxPosSpeed;
								if(iWarningSpeed < iUpcomingWarningSpeed)
								{
									iUpcomingWarningSpeed = iWarningSpeed;
								}
							}
						}
					}

					if(length >= maxLookupMetersUpfrontRouteForCurvature)
					{
						// stop
						bWalkAlongRoute = false;
					}
				}

				length += listLinksOnRoute[linkPosOnRoute].$linkLength;
				linkPosOnRoute++;
			}

			if(speedLimitUnit == 2)
			{
				// convert speedlimit to mph
				iCurrSpeed = parseInt((((iCurrSpeed * 0.621371) + 0.5) * 100) / 100)
			}
			if(!bShowWarning)
			{
				marker.setIcon(truckIcon);
				if(iCurrSpeed != 999)
				{
					simulationSpeedTxt.innerHTML = "<span style=\"font-weight: normal;color:" + rgb2hex(simulationSpeedOkColor) + ";\">Legal Speed: " + iCurrSpeed + "<span>";
				}
				else
				{
					simulationSpeedTxt.innerHTML = "<span style=\"font-weight: normal;color:" + rgb2hex(simulationSpeedOkColor) + ";\">Legal Speed: Ramp<span>";
				}

				if(currentWalkerTimeout > 100)
				{
					currentWalkerTimeout -= 30;
				}
			}
			else
			{
				if(speedLimitUnit == 2)
				{
					// convert speedlimit to mph
					iUpcomingWarningSpeed = parseInt((((iUpcomingWarningSpeed * 0.621371) + 0.5) * 100) / 100)
				}
				marker.setIcon(warningTruckIcon);
				simulationSpeedTxt.innerHTML = "<span style=\"font-weight: bolder;color:" + rgb2hex(simulationSpeedWarningColor) + ";\">Legal Speed: " + iCurrSpeed + " Curvature Warning ahead: " + iUpcomingWarningSpeed + "<span>";

				if(currentWalkerTimeout < 300)
				{
					currentWalkerTimeout += 30;
				}
			}


			// If we get to the end of the route reverse direction
			if (iSimulationIsAtLinkPosition === listLinksOnRoute.length - 1) {
				iSimulationIsAtLinkPosition = 0;
				iSimulationIsAtLinkShapePosition = 0;
			}

			if(iSimulationIsAtLinkShapePosition === shape.length -1)
			{
				iSimulationIsAtLinkPosition += 1;
				iSimulationIsAtLinkShapePosition = 0;
			}

			iSimulationIsAtLinkShapePosition += 1;

			// dynamic walker timeout depending on speed limit
			// we try to reduce or increase the timeout and 100ms is the normal timeout
			if(!bShowWarning)
			{
				if(iCurrSpeed != 999999)
				{
					if(currentWalkerTimeout > (200 - iCurrSpeed))
					{
						currentWalkerTimeout -= 30;
						if(currentWalkerTimeout < (200 - iCurrSpeed))
						{
							currentWalkerTimeout = (200 - iCurrSpeed);
						}
					}
					else if (currentWalkerTimeout < (200 - iCurrSpeed))
					{
						currentWalkerTimeout += 30;
						if(currentWalkerTimeout > (200 - iCurrSpeed))
						{
							currentWalkerTimeout = (200 - iCurrSpeed);
						}
					}

					// safety check
					if(currentWalkerTimeout < 0)
					{
						currentWalkerTimeout = 100;
					}
				}
				else
				{
					currentWalkerTimeout = 100;
				}
			}
		};

		this.stop = function ()
		{
			clearTimeout(that.timeout);
			this.isWalking = false;
		};
	};


	//Function to convert hex format to a rgb color from http://jsfiddle.net/Mottie/xcqpF/1/light/
	function rgb2hex(rgb){
		rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}