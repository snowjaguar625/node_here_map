/**
         * @author Platform for Business Group
         * (C) HERE 2017
         * Author - Sachin Jonda
         */

        /**  Set authentication app_id and app_code
         *  WARNING: this is a demo-only key
         *  please register on http://developer.here.com/
         *  and obtain your own API key
         */

         $(document).ready(function() {});
         var feedbackTxt = document.getElementById("feedbackTxt");
         var padZerosNumbers = function(num, size) {
             var negative = (num < 0);
             if (negative) {
                 num = Math.abs(num);
                 size--;
             }
             var s = num + "";
             while (s.length < size) s = "0" + s;
             return negative ? "-" + s : s;
         };
         var now = moment();
         var secure = secure = (location.protocol === 'https:') ? true : false;
         var noneExampleTxt = getUrlParameter('destinations');
         var custom_app_id = getUrlParameter('app_id');
         var custom_app_code = getUrlParameter('app_code');
         var host = getUrlParameter('host');      
         if( host !== null && host.length != 0 ) {
             document.getElementById('endpoint').value = document.getElementById('endpoint').value.replace("https://fleet.ls.hereapi.com" , host);
         }
         var destinationsTextArea = document.getElementById('destinations');
         setDepartureNow();
 
         if (custom_app_id !== null && custom_app_code !== null) {
             app_id = custom_app_id;
             app_code = custom_app_code;
             document.getElementById("endpointDetails").style.display = "table-row";
         }
 
         var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
         var mapContainer = document.getElementById('mapContainer');
         var platform = new H.service.Platform({ 
             apikey: api_key_jp,
             useHTTPS: true
         }),
         maptypes = platform.createDefaultLayers(),
         router = platform.getRoutingService(),
         labels = new H.map.Group(),
         group = new H.map.Group(),
         secondaryGrp= new H.map.Group(),
         groups = [],
         activeGroup = null,
         activeConnections = null,
         activeLabels = null,
         basemaptileService = platform.getMapTileService({ 'type': 'base' });
             
         //Japan styling
         omvService = platform.getOMVService({
             path:  'v2/vectortiles/core/mc'
         });
         baseUrl = 'https://js.api.here.com/v3/3.1/styles/omv/oslo/japan/';
         // create a Japan specific style
         style = new H.map.Style(`${baseUrl}normal.day.yaml`, baseUrl);
 
         // instantiate provider and layer for the basemap
         omvProvider = new H.service.omv.Provider(omvService, style);
         omvlayer = new H.map.layer.TileLayer(omvProvider, {max: 22});
 
         // Instantiate a map in the 'map' div, set the base map to normal
         var map = new H.Map(document.getElementById('mapContainer'), omvlayer, {
             center: new H.geo.Point(35.68066, 139.8355),
             zoom: zoom
         });
             
        // map = new H.Map(mapContainer,  maptypes.terrain.map, { center: center, zoom: zoom });
         
             
         
         map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // do not draw under control panel
         map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width()); // set padding for control panel
         map.addObject(labels);                                           // add labels (waypoint markers) to map
         new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control, e.g. for mouse
         var expertModeEnabled = false;
         map.addEventListener('tap', function(evt) {
            if (typeof evt.target.$linkId === 'undefined') { // if user has not clicked onto a route link
                 if(!expertModeEnabled) {
                     var traceTextArea = destinationsTextArea;
                     var coords = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
                     var numLines = (traceTextArea.value == "") ? 0 : traceTextArea.value.split('\n').length;
                     var wp = new Waypoints(numLines, coords.lat, coords.lng);
                     if(destinationsTextArea.value.length > 0 && !destinationsTextArea.value.endsWith("\n")) {
                         destinationsTextArea.value += "\n";
                     }
                     destinationsTextArea.value += wp.getWaypointParameterText();
                     parseWaypointsFromTextAndUpdateMap("destinations");
                 }
             }
         }, false);
         
         // enable UI components and remove the unnecessary
         var ui = H.ui.UI.createDefault(map, maptypes);
         window.addEventListener('resize', function() {
             map.getViewPort().resize();
         });
 
         // intitialize default vehicle values
         handleVehicleSpecChanged();
 
         var routeLinkHashMap = new Object(); // key = linkID, value = array of link objects
 
         // display groups
         var routeGroup = new H.map.Group();
         routeGroup.setZIndex(2);
         map.addObject(routeGroup);
         var routeLinks = [];
         var warningsGroup = new H.map.Group();
         map.addObject(warningsGroup);
         var maneuversGroup = new H.map.Group(); // not added by default
         var plannedWaypointsGroup = new H.map.Group();
         plannedWaypointsGroup.setZIndex(1);
         map.addObject(plannedWaypointsGroup);
         var searchResultGroup = new H.map.Group();
         searchResultGroup.setZIndex(1);
         map.addObject(searchResultGroup);
         var usedWaypointsGroup = new H.map.Group();
         usedWaypointsGroup.setZIndex(2);
         map.addObject(usedWaypointsGroup);
         var elapsedTimeGroup = new H.map.Group();  // not added by default
         var spaceGroup = new H.map.Group();
         spaceGroup.setZIndex(4);
         map.addObject(spaceGroup);
         var spaceGroupB = new H.map.Group();
         spaceGroupB.setZIndex(5);
         map.addObject(spaceGroupB);
 
         // route display
         var routeStroke = 8;
         var routeColor = ["rgba(18, 65, 145, 0.8)", "rgba(0, 145, 255, 0.7)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)", "rgba(127, 201, 255, 0.6)"];
         var server_rr = 0; // for truck overlay tile load URLs
         var routeSlider = document.getElementById("routeSlider");
         var routeSliderDiv = document.getElementById("routeSliderDiv");
         routeSliderDiv.style.display = "none";
         routeSlider.onchange = function() {
             redrawRoute(this.value);
         }
         
         // Canvas circle
         var createCanvasCircle = function(fillStyle, strokeStyle, lineWidth, radius)
         {
             var canvas = document.createElement('canvas'),
                 context = canvas.getContext('2d');
                 canvas.width = canvas.height = 6,
                 centerX = canvas.width / 2,
                 centerY = canvas.height / 2,
                 radius = radius;
 
             context.beginPath();
             context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
             context.fillStyle = fillStyle;
             context.fill();
             context.lineWidth = lineWidth;
             context.strokeStyle = strokeStyle;
             context.stroke();
             return canvas;
         }
         
         /*var circle = new mapsjs.map.Icon(createCanvasCircle('grey', 'grey', 1, 2));
         var circleB = new mapsjs.map.Icon(createCanvasCircle('orange', 'orange', 1, 1));*/
         
         var circle = new H.map.Icon(createCanvasCircle('grey', 'grey', 1, 2));
         var circleB = new H.map.Icon(createCanvasCircle('orange', 'orange', 1, 1));
         
         
 
         // search result info
         var searchResultInfoBubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
         searchResultInfoBubble.close();
         ui.addBubble(searchResultInfoBubble);
         //this variable will hold the previous junction group data which was clicked,
         //this will be closed if a new POI has been clicked before acutally closing the 
         //previous bubble
         var previousJunctionGroup;
         // color of junction view markers (along route)
         var jvColor = "rgba(255, 224, 22, 0.5)";
 
         /*****************************************
             Example configuration
         *****************************************/
         // class holding the example parameter values
         function RouteSample(label, exampleDescriptionText, waypointsParameters, vehicleType, additionalParams ) {
             this.label = label;
             this.waypointsParameters = waypointsParameters;
             this.additionalParams = additionalParams;
             this.vehicleType = vehicleType;
             this.exampleDescriptionText = exampleDescriptionText;
             this.getLabel = function() {
                 return label;
             };
             this.getWaypointsParameters = function() {
                 return waypointsParameters;
             };
             this.getAdditionalParams = function(){
                 return this.additionalParams === undefined ? "" : this.additionalParams;
             };
             this.hasAdditionalParams = function(){
                 return this.additionalParams !== undefined && this.additionalParams !== null && this.additionalParams !== "";
             };
             this.getVehicleType = function(){
                 return this.vehicleType === undefined ? "truck" : this.vehicleType;
             };            
             this.hasExampleDescriptionText = function() {
                 return this.exampleDescriptionText !== undefined && this.exampleDescriptionText !== null && this.exampleDescriptionText !== "";
             };
             this.getExampleDescriptionText = function(){
                 return this.exampleDescriptionText;
             };
         }
         //removed the below example because it works together with an overlays and this overlays must be created from another demo so does not make mush sense. Add it if required again   
         //"swissRoute": new RouteSample("Road Blocked due to snow", "&waypoint0=46.997337,7.720789\n&waypoint1=46.996716,7.728708\n&waypoint2=46.994469,7.729678", "car")
 
         // the vehicle type parameter should match the value selection from aboves 'vehicleType' selector
         var samplesObj = {
             "blank": new RouteSample("Please select an example", null, "truck" ),
             "mainBrueke": new RouteSample("Nagano road route", 
                         "Simple calculate route example between two waypoints.",
                         "&waypoint0=36.1953588335487,137.93529076180457\n&waypoint1=36.020613915405164,138.08223289087698", 
                         0),
             "fraRoute": new RouteSample("Multiple Waypoints", 
                         "Route with multiple waypoints.",
                         "&waypoint0=50.115620,8.631210\n&waypoint1=50.122540,8.631070\n&waypoint2=50.128920,8.629830\n&waypoint3=50.132540,8.649280",
                         0),
             "fraOneWay": new RouteSample("Frankfurt one way example", 
                         "Route legal between two waypoints and obey oneways.",
                         "&waypoint0=50.131764,8.616784\n&waypoint1=50.131143,8.618211",
                         0),
             "fraNoTruck": new RouteSample("Restricted way for Truck", 
                         "Calculate taking vehicle access restriction into account. This example shows a route which is not driving the direct street between two waypoints - as those have truck access restrictions.",
                         "&waypoint0=50.106860,8.629233\n&waypoint1=50.105718,8.633553",
                         2),
             "DK_SWE_Motorway": new RouteSample("Avoid motorways through Denmark-Sweden route", 
                         "Avoid motorways via mode setting. As the route is passing neccessary bridges - it uses motorways only there.",
                         "&waypoint0=55.515896,9.458414\n&waypoint1=55.454537,9.891686\n&waypoint2=55.381344,11.337998\n&waypoint3=55.568923,12.858715\n&waypoint4=55.590871,13.107827",
                         2),
             "English_channel_ferry": new RouteSample("Avoid ferries over the English channel", 
                         "Via the avoid ferry flag, ferries are avoided. Setting avoid rail ferry and removing hte avoid ferry flag would take the ferry and avoid the Calais tunnel",
                         "&waypoint0=50.911237,1.928579\n&waypoint1=51.149763,1.321334", 
                         0),
             "Boston_Canaan": new RouteSample("Avoid Tolls in US", 
                         "Via the avoidToll flag, toll roads are avoided. Remove the avoid option and the route would take the toll road",
                         "&waypoint0=42.35866,-71.05675\n&waypoint1=42.41218,-73.44781", 
                         2),
             "fraStopOver": new RouteSample("StopOver at a way point in Frankfurt", 
                         "An example to show that a stop-over at waypoint1 takes 5 minutues. The stop-over time will be included in the travel time of the route.",
                         "&waypoint0=50.12188,8.64859\n&waypoint1=stopOver,300!50.121499, 8.650912\n&waypoint2=50.12003,8.65228",
                         0),
             "fraDarmstadtDriverRestTime": new RouteSample("Driver Rest Time - Frankfurt to Darmstadt", 
                         "This example sets individual driver rest time via the &restTimes parameter. Changing the values for short and long rest would change the arrival time (ETA).",
                         "&waypoint0=50.11208,8.68342\n&waypoint1=49.87264,8.65014",
                         0,
                         "&restTimes=900,1200,2400,2100"),
             "fraTruckShouldWaitOnSunday": new RouteSample("Truck Not Allowed on Sunday in Frankfurt", 
                         "Since trucks > 7.5t are not allowed to drive in Germany on Sundays, the truck needs to wait until the restriction is over. A change in the departure time to a weekday would reduce the arrival time (ETA).",
                         "&waypoint0=50.08211,8.64391\n&waypoint1=50.14156,8.66751",
                         2),
             "fraOpeningTime": new RouteSample("Opening Time at a way point in Frankfurt", 
                         "Waypoint 1 has an opening time specified in second - relative to the route's start time. Therefore the vehicle needs to wait on the waypoint until it's opened. The wait time is: opening time (200 sec.) - travel time to the waypoint (50 sec.).",
                         "&waypoint0=50.18025,8.61968\n&waypoint1=50.18197,8.62564;opening:200\n&waypoint2=50.18076,8.6266",
                         0),
             "capacityDemo1": new RouteSample("Route with no capacity", 
                         "A route without any capacity constrains picks up a optional good at waypoint 1 and delivers it at waypoint 2.",
                         "&waypoint0=50.13552,8.52318\n&waypoint1=50.087929,8.449031;optional;taketo:2;value:5\n&waypoint2=50.088592,8.451459;optional\n&waypoint3=50.22151,8.58675",
                         0, 
                         "&driver_cost=11&currency=EUR"),
             "capacityDemo2": new RouteSample("Route with feasible capacity", 
                         "A route which fullfils the vehicles capacity at each waypoint picks up the optional load at waypoint 1 and delivers it at waypoint 2.",
                         "&waypoint0=50.13552,8.52318\n&waypoint1=50.087929,8.449031;optional;taketo:2;value:5;load:1,4,5\n&waypoint2=50.088592,8.451459;optional\n&waypoint3=50.22151,8.58675",
                         0, 
                         "&driver_cost=11&currency=EUR&capacity=1,5,7"),
             "capacityDemo3": new RouteSample("Route with infeasible capacity", 
                         "The capacity of the optional item at waypoint 1 does not fit the capacity of the vehicle. Therefor the optional item at waypoint 1 is not picked up.",
                         "&waypoint0=50.13552,8.52318\n&waypoint1=50.087929,8.449031;load:1,6,5;optional;taketo:2;value:5\n&waypoint2=50.088592,8.451459;optional\n&waypoint3=50.22151,8.58675",
                         0, 
                         "&driver_cost=11&currency=EUR&capacity=1,5,7"),
             "alternativesDemo": new RouteSample("Frankfurt to Hohenstadt via Stuttgart", 
                         "",
                         "&waypoint0=50.112698,8.675777\n&waypoint1=48.544180,9.662530",
                         0),
             "relaxVehTypRestrToTurnIntoZeilFrankfurtWorking": new RouteSample("Destination in a Pedestrian Zone - Truck Allowed", 
                         "The &ignoreWaypointVehicleRestriction lifts the truck access restriction at the waypoints in the inner city. Removing the ignore parameter would result in the service message stating that the route cannot be calculated due to the access restriction",
                         "&waypoint0=50.114089,8.628484\n&waypoint1=50.114467,8.679136\n&waypoint2=50.114210,8.681649",
                         2,
                         "&ignoreWaypointVehicleRestriction=150"),
             "headingAndWSEParams": new RouteSample("Heading, Transit Radius Params", 
                         "Waypoint1 uses the heading 100 degree (;;;100 - degree clockwise from North), to map match the waypoint to the bridge. Customer can change value to 270 degree, so that waypoint is map matched below the bridge. Waypoint3 uses transit radius of 200m (;200), meaning that route should pass maximum 200m from the waypoint.",
                         "&waypoint0=50.135372,8.625288;;Label1;\n&waypoint1=50.115517,8.609948;;Label1;100;optional;taketo:2;value:40\n&waypoint2=50.118842,8.623891;optional\n&waypoint3=50.120896,8.629464;200\n&waypoint4=50.125462,8.632758",
                         2),
             "excludeCountries": new RouteSample("Avoid Countries", 
                         "The &excludeCountries parameter is used to avoid several countries. The route is avoiding them. Remove the parameter to see the direct route.",
                         "&waypoint0=52.320738,4.915213\n&waypoint1=52.223914,20.985335", 
                         0,
                         "&excludeCountries=DEU,AUT,CZE"),
             "environmentalZones": new RouteSample("Environmental Zones", 
                         "Shows a route that avoids environmental zone (forbids vehicles below EURO 4) in Frankfurt city as vehicle specifies only emission type 3. This restriction can be lifted by specifying &emissionType=4",
                         "&waypoint0=50.133637,8.577592\n&waypoint1=50.121638,8.763561",
                         0,
                         "&excludeZoneTypes=environmental&emissionType=3"),
             "emergencyExample": new RouteSample("Emergency Example", 
                         "Via the emergency vehicle type and the &oneway penalty lift, the route is taking the oneway in the opposite direction - as it's allowed for emergency vehicles. Setting the penality to 1 would avoid driving oneways in the wrong direction.",
                         "&waypoint0=50.079342,8.219209\n&waypoint1=50.081036,8.238553",
                         8, "&oneway=penalty:0.5"),
             "wasteCollection": new RouteSample("Waste collection route", 
                         "This route shows a typical waste collection scenario. All roads from that city needs to be driven, but the order is not known. The waypoints are having the 'sort' parameter attached and the router finds a route through all waypoints.",
                         "&waypoint0=50.13363,8.51574\n&waypoint1=50.11973,8.5438;sort\n&waypoint2=50.12075,8.52314;sort\n&waypoint3=50.11782,8.5289;sort\n&waypoint4=50.12026,8.52344;sort\n&waypoint5=50.12387,8.52013;sort\n&waypoint6=50.12911,8.52956;sort\n&waypoint7=50.12843,8.53323;sort\n&waypoint8=50.1273,8.53497;sort\n&waypoint9=50.12699,8.53582;sort\n&waypoint10=50.12686,8.5369;sort\n&waypoint11=50.1271,8.53777;sort\n&waypoint12=50.13058,8.53329;sort\n&waypoint13=50.12681,8.522;sort\n&waypoint14=50.12774,8.52365;sort\n&waypoint15=50.12839,8.52479;sort\n&waypoint16=50.12909,8.5261;sort\n&waypoint17=50.12985,8.52747;sort\n&waypoint18=50.12767,8.5264;sort\n&waypoint19=50.1283,8.53108;sort\n&waypoint20=50.12972,8.53018;sort\n&waypoint21=50.12756,8.52254;sort\n&waypoint22=50.12824,8.52269;sort\n&waypoint23=50.12769,8.52086;sort\n&waypoint24=50.12799,8.52191;sort\n&waypoint25=50.12857,8.52123;sort\n&waypoint26=50.12954,8.52155;sort\n&waypoint27=50.12934,8.52028;sort\n&waypoint28=50.12934,8.51893;sort\n&waypoint29=50.13009,8.52086;sort\n&waypoint30=50.12991,8.51951;sort\n&waypoint31=50.1296,8.51829;sort\n&waypoint32=50.13024,8.51908;sort\n&waypoint33=50.12989,8.51837;sort\n&waypoint34=50.12996,8.51744;sort\n&waypoint35=50.13044,8.51783;sort\n&waypoint36=50.13044,8.51681;sort\n&waypoint37=50.1308,8.51853;sort\n&waypoint38=50.13133,8.51789;sort\n&waypoint39=50.13108,8.51675;sort\n&waypoint40=50.13205,8.5171;sort\n&waypoint41=50.13254,8.51612;sort\n&waypoint42=50.13275,8.51543;sort\n&waypoint43=50.13197,8.515;sort\n&waypoint44=50.13143,8.51371;sort\n&waypoint45=50.13053,8.51055;sort\n&waypoint46=50.12801,8.50433;sort\n&waypoint47=50.12853,8.52385;sort\n&waypoint48=50.12957,8.52232;sort\n&waypoint49=50.12935,8.52387;sort\n&waypoint50=50.1301,8.52337;sort\n&waypoint51=50.12988,8.52475;sort\n&waypoint52=50.13032,8.52458;sort\n&waypoint53=50.13017,8.52533;sort\n&waypoint54=50.12991,8.52627;sort\n&waypoint55=50.13083,8.52627;sort\n&waypoint56=50.13054,8.52528;sort\n&waypoint57=50.13124,8.52595;sort\n&waypoint58=50.1313,8.52554;sort\n&waypoint59=50.13061,8.52387;sort\n&waypoint60=50.13104,8.52468;sort\n&waypoint61=50.13048,8.52322;sort\n&waypoint62=50.13131,8.52491;sort\n&waypoint63=50.1318,8.52469;sort\n&waypoint64=50.13192,8.52392;sort\n&waypoint65=50.13153,8.52413;sort\n&waypoint66=50.13101,8.52407;sort\n&waypoint67=50.13086,8.52277;sort\n&waypoint68=50.13122,8.52331;sort\n&waypoint69=50.13173,8.52309;sort\n&waypoint70=50.13185,8.52347;sort\n&waypoint71=50.13153,8.52268;sort\n&waypoint72=50.13131,8.52261;sort\n&waypoint73=50.13111,8.52235;sort\n&waypoint74=50.13109,8.52183;sort\n&waypoint75=50.13123,8.5214;sort\n&waypoint76=50.13118,8.52126;sort\n&waypoint77=50.13066,8.52201;sort\n&waypoint78=50.13141,8.52215;sort\n&waypoint79=50.13185,8.52262;sort\n&waypoint80=50.13228,8.52305;sort\n&waypoint81=50.13212,8.52152;sort\n&waypoint82=50.1324,8.52241;sort\n&waypoint83=50.13279,8.52259;sort\n&waypoint84=50.13267,8.52197;sort\n&waypoint85=50.13311,8.52181;sort\n&waypoint86=50.13283,8.52107;sort\n&waypoint87=50.13314,8.52006;sort\n&waypoint88=50.13252,8.52046;sort\n&waypoint89=50.1323,8.52015;sort\n&waypoint90=50.13193,8.52007;sort\n&waypoint91=50.132,8.5202;sort\n&waypoint92=50.13267,8.51916;sort\n&waypoint93=50.13353,8.52105;sort\n&waypoint94=50.13402,8.52052;sort\n&waypoint95=50.13311,8.51954;sort\n&waypoint96=50.13339,8.51875;sort\n&waypoint97=50.13428,8.51995;sort\n&waypoint98=50.13283,8.51671;sort\n&waypoint99=50.13313,8.5177;sort\n&waypoint100=50.13362,8.51863;sort\n"
                             + "&waypoint101=50.13423,8.51941;sort\n&waypoint102=50.13384,8.51698;sort\n&waypoint103=50.13466,8.51627;sort\n&waypoint104=50.13546,8.5172;sort\n&waypoint105=50.1348,8.51877;sort\n&waypoint106=50.13485,8.51768;sort\n&waypoint107=50.13493,8.51685;sort\n&waypoint108=50.13466,8.51683;sort\n&waypoint109=50.1345,8.51721;sort\n&waypoint110=50.13455,8.51779;sort\n&waypoint111=50.13417,8.51773;sort\n&waypoint112=50.13402,8.51814;sort\n&waypoint113=50.13412,8.51867;sort\n&waypoint114=50.13073,8.52828;sort\n&waypoint115=50.13092,8.52746;sort\n&waypoint116=50.13125,8.52789;sort\n&waypoint117=50.13076,8.52862;sort\n&waypoint118=50.13506,8.51924;sort\n&waypoint119=50.13567,8.5183;sort\n&waypoint120=50.13594,8.51742;sort\n&waypoint121=50.13609,8.51695;sort\n&waypoint122=50.13682,8.51622;sort\n&waypoint123=50.13718,8.51665;sort\n&waypoint124=50.136,8.51806;sort\n&waypoint125=50.13558,8.51951;sort\n&waypoint126=50.13493,8.52033;sort\n&waypoint127=50.13544,8.5208;sort\n&waypoint128=50.1362,8.51958;sort\n&waypoint129=50.13719,8.51853;sort\n&waypoint130=50.13713,8.51917;sort\n&waypoint131=50.13706,8.52012;sort\n&waypoint132=50.13615,8.52149;sort\n&waypoint133=50.13422,8.5234;sort\n&waypoint134=50.13439,8.52451;sort\n&waypoint135=50.13331,8.52583;sort\n&waypoint136=50.13768,8.51885;sort\n&waypoint137=50.13814,8.51815;sort\n&waypoint138=50.138,8.51873;sort\n&waypoint139=50.13763,8.51982;sort\n&waypoint140=50.13689,8.52109;sort\n&waypoint141=50.13648,8.52186;sort\n&waypoint142=50.13555,8.52322;sort\n&waypoint143=50.13468,8.52442;sort\n&waypoint144=50.13426,8.52547;sort\n&waypoint145=50.13404,8.5266;sort\n&waypoint146=50.13377,8.5259;sort\n&waypoint147=50.13333,8.52624;sort\n&waypoint148=50.13338,8.52719;sort\n&waypoint149=50.13362,8.52781;sort\n&waypoint150=50.13338,8.52818;sort\n&waypoint151=50.13306,8.52812;sort\n&waypoint152=50.13215,8.52861;sort\n&waypoint153=50.1311,8.52906;sort\n&waypoint154=50.13042,8.52849;sort\n&waypoint155=50.13013,8.5324;sort\n&waypoint156=50.13056,8.53245;sort\n&waypoint157=50.12992,8.53507;sort\n&waypoint158=50.13113,8.53049;sort\n&waypoint159=50.13138,8.5311;sort\n&waypoint160=50.13085,8.5314;sort\n&waypoint161=50.13104,8.53164;sort\n&waypoint162=50.13201,8.53262;sort\n&waypoint163=50.13159,8.52957;sort\n&waypoint164=50.13156,8.5302;sort\n&waypoint165=50.1318,8.53098;sort\n&waypoint166=50.13028,8.53966;sort\n&waypoint167=50.13219,8.53538;sort\n&waypoint168=50.13113,8.53644;sort\n&waypoint169=50.13107,8.53667;sort\n&waypoint170=50.13327,8.52863;sort\n&waypoint171=50.13338,8.52918;sort\n&waypoint172=50.13385,8.52958;sort\n&waypoint173=50.13346,8.53034;sort\n&waypoint174=50.13242,8.53127;sort\n&waypoint175=50.13285,8.53174;sort\n&waypoint176=50.13315,8.53128;sort\n&waypoint177=50.13406,8.5312;sort\n&waypoint178=50.13316,8.53531;sort\n&waypoint179=50.13352,8.53722;sort\n&waypoint180=50.13499,8.53651;sort\n&waypoint181=50.13398,8.53886;sort\n&waypoint182=50.13432,8.54011;sort\n&waypoint183=50.13321,8.54241;sort\n&waypoint184=50.13243,8.54115;sort\n&waypoint185=50.13516,8.5301;sort\n&waypoint186=50.13479,8.53066;sort\n&waypoint187=50.13441,8.5313;sort\n&waypoint188=50.13474,8.53237;sort\n&waypoint189=50.13408,8.53194;sort\n&waypoint190=50.13349,8.53298;sort\n&waypoint191=50.13303,8.53379;sort\n&waypoint192=50.13538,8.53116;sort\n&waypoint193=50.13503,8.53159;sort\n&waypoint194=50.13433,8.53316;sort\n&waypoint195=50.13357,8.53435;sort\n&waypoint196=50.1362,8.53102;sort\n&waypoint197=50.13591,8.53176;sort\n&waypoint198=50.13572,8.5321;sort\n&waypoint199=50.13554,8.53244;sort\n" 
                             + "&waypoint200=50.13538,8.5327;sort\n&waypoint201=50.13593,8.53292;sort\n&waypoint202=50.13561,8.53336;sort\n&waypoint203=50.13519,8.53307;sort\n&waypoint204=50.13579,8.53527;sort\n&waypoint205=50.1349,8.53364;sort\n&waypoint206=50.1345,8.53439;sort\n&waypoint207=50.13506,8.53494;sort\n&waypoint208=50.13412,8.53508;sort\n&waypoint209=50.13369,8.53584;sort\n&waypoint210=50.13442,8.53494;sort\n&waypoint211=50.13463,8.53535;sort\n&waypoint212=50.13411,8.53585;sort\n&waypoint213=50.13439,8.53625;sort\n&waypoint214=50.13364,8.53647;sort\n&waypoint215=50.13386,8.53686;sort\n&waypoint216=50.13415,8.53711;sort\n&waypoint217=50.13343,8.53635;sort\n&waypoint218=50.13616,8.532;sort\n&waypoint219=50.13685,8.53157;sort\n&waypoint220=50.1364,8.53278;sort\n&waypoint221=50.13697,8.53251;sort\n&waypoint222=50.13651,8.53314;sort\n&waypoint223=50.13738,8.53242;sort\n&waypoint224=50.13686,8.53419;sort\n&waypoint225=50.13796,8.53306;sort\n&waypoint226=50.13441,8.52621;sort\n&waypoint227=50.13502,8.52649;sort\n&waypoint228=50.13494,8.52722;sort\n&waypoint229=50.1342,8.52739;sort\n&waypoint230=50.13488,8.52859;sort\n&waypoint231=50.13543,8.52772;sort\n&waypoint232=50.13589,8.52784;sort\n&waypoint233=50.13584,8.52703;sort\n&waypoint234=50.13553,8.52848;sort\n&waypoint235=50.13555,8.52946;sort\n&waypoint236=50.13602,8.52872;sort\n&waypoint237=50.13651,8.528;sort\n&waypoint238=50.13651,8.52902;sort\n&waypoint239=50.13655,8.53012;sort\n&waypoint240=50.13721,8.52914;sort\n&waypoint241=50.13822,8.53091;sort\n&waypoint242=50.13889,8.53187;sort\n&waypoint243=50.13911,8.53159;sort\n&waypoint244=50.13871,8.53107;sort\n&waypoint245=50.13897,8.52966;sort\n&waypoint246=50.13798,8.52958;sort\n&waypoint247=50.13815,8.52801;sort\n&waypoint248=50.1371,8.52825;sort\n&waypoint249=50.13644,8.52725;sort\n&waypoint250=50.13572,8.52613;sort\n&waypoint251=50.13525,8.5254;sort\n&waypoint252=50.13484,8.5249;sort\n&waypoint253=50.13503,8.52442;sort\n&waypoint254=50.13554,8.52549;sort\n&waypoint255=50.13621,8.52644;sort\n&waypoint256=50.136,8.52577;sort\n&waypoint257=50.13584,8.52506;sort\n&waypoint258=50.13645,8.52604;sort\n&waypoint259=50.13627,8.52541;sort\n&waypoint260=50.13627,8.52432;sort\n&waypoint261=50.13683,8.52548;sort\n&waypoint262=50.13699,8.52438;sort\n&waypoint263=50.13696,8.52326;sort\n&waypoint264=50.13745,8.52515;sort\n&waypoint265=50.13768,8.52356;sort\n&waypoint266=50.13842,8.52365;sort\n&waypoint267=50.13795,8.5249;sort\n&waypoint268=50.13827,8.52628;sort\n&waypoint269=50.13756,8.52608;sort\n&waypoint270=50.13756,8.52695;sort\n&waypoint271=50.13703,8.52721;sort\n&waypoint272=50.13687,8.52233;sort\n&waypoint273=50.13745,8.52244;sort\n&waypoint274=50.13801,8.52235;sort\n&waypoint275=50.13861,8.52287;sort\n&waypoint276=50.13789,8.52162;sort\n&waypoint277=50.1385,8.52207;sort\n&waypoint278=50.13838,8.52138;sort\n&waypoint279=50.13928,8.52055;sort\n&waypoint280=50.13796,8.52037;sort\n&waypoint281=50.13864,8.51886;sort\n&waypoint282=50.13944,8.52002;sort\n&waypoint283=50.13991,8.52023;sort\n&waypoint284=50.14042,8.5191;sort\n&waypoint285=50.13963,8.51954;sort\n&waypoint286=50.13831,8.51736;sort\n&waypoint287=50.13846,8.51694;sort\n&waypoint288=50.13859,8.51664;sort\n&waypoint289=50.13883,8.51718;sort\n&waypoint290=50.13927,8.5175;sort\n&waypoint291=50.13985,8.51791;sort\n&waypoint292=50.14049,8.51834;sort\n&waypoint293=50.14025,8.51797;sort\n&waypoint294=50.14004,8.51752;sort\n&waypoint295=50.14058,8.51789;sort\n&waypoint296=50.13864,8.51569;sort\n&waypoint297=50.13973,8.51693;sort\n&waypoint298=50.1415,8.51698;sort\n&waypoint299=50.13898,8.51432;sort\n" + 
                         "&waypoint300=50.13941,8.51553;sort\n&waypoint301=50.14005,8.5147;sort\n&waypoint302=50.14016,8.51573;sort\n&waypoint303=50.14073,8.51435;sort\n&waypoint304=50.14078,8.51414;sort\n&waypoint305=50.13911,8.51364;sort\n&waypoint306=50.13929,8.51286;sort\n&waypoint307=50.13893,8.51346;sort\n&waypoint308=50.13921,8.51085;sort\n&waypoint309=50.1382,8.51335;sort\n&waypoint310=50.13767,8.51271;sort\n&waypoint311=50.1378,8.51177;sort\n&waypoint312=50.13765,8.51181;sort\n&waypoint313=50.13754,8.51401;sort\n&waypoint314=50.14262,8.5148;sort\n&waypoint315=50.14346,8.51314;sort\n&waypoint316=50.14383,8.51242;sort\n&waypoint317=50.14496,8.51047;sort\n&waypoint318=50.13929,8.51067;sort\n&waypoint319=50.13988,8.51238;sort\n&waypoint320=50.14029,8.51269;sort\n&waypoint321=50.14065,8.51283;sort\n&waypoint322=50.14108,8.51328;sort\n&waypoint323=50.11931,8.52514;sort\n&waypoint324=50.13422,8.52076;sort\n&waypoint325=50.13391,8.52861;sort\n&waypoint326=50.13493,8.52956;sort\n&waypoint327=50.13583,8.53025;sort\n&waypoint328=50.13699,8.531;sort\n&waypoint329=50.13779,8.53147;sort\n&waypoint330=50.13849,8.53192;sort\n&waypoint331=50.13363,8.51574", 
                         0,
                         "&ignoreWaypointVehicleRestriction=500&traverseGate=true&avoidTurns=uTurnAtWaypoint"),
             "busExample": new RouteSample(  "Bus Example", 
                         "Shows a bus route using road links that are only allowed for bus. Change to vehicle 'car' to see a car route in comparison.",
                         "&waypoint0=50.080358,8.246076\n&waypoint1=50.080186,8.236179", 
                         7),
             "routeWithCustomSpeedProfile": new RouteSample("Route with Custom Speed Profile", 
                         "This route is using the &speedFcCat parameter and sets a higher (custom) speed on functional class 1 roads (motorways) to simulate the scenario 'My driver drive 10% faster than the routers default values'. The ETA is below 4 hours. Removing the custom speed settings would result in a route having an ETA above 4 hours.",
                         "&waypoint0=49.466522,8.480756&waypoint1=49.437217,11.070657",
                         2,
                         "&speedFcCat=80,76,68,,,,,;,,,,,,,;,,,,,,,;,,,,,,,;,,,,,,,;,,,,,,,"),
             "routeWithOverlaysWithPreferredLinks": new RouteSample("Prefer certain links and route through them", 
                         "This example first uploads an overlay which gives preference to certain links. It then sends a routing request togehter with the newly created overlay therefore the routing engine calculates a route through the preferred links. Please see the difference in the route by removing the parameter &overlays from the Parameters text box and then calculate the route again. Please pay attention at the start of the route where few links are set to prefer in the overlay.",
                         "&waypoint0=53.549986,9.994754\n&waypoint1=53.564154,9.984726",
                         0,
                         "&overlays=OVERLAYPREFROADDEMO"),
             "routeWithOverlaysWithAvoidLinks": new RouteSample("Avoid certain links and route by avoiding them", 
                         "This example first uploads an overlay which contains few links that should be avoided in the final route. It then sends a routing request togehter with the newly created overlay therefore the routing engine calculates a route by avoiding those links. Please see the difference in the route by removing the parameter &overlays from the Parameters text box and then calculate the route again. Please pay attention at the end of the route (close to waypoint1) where few links are set to avoid in the overlay.",
                         "&waypoint0=51.515825,-0.082030\n&waypoint1=51.510384,-0.093231",
                         0,
                         "&overlays=OVERLAYAVOIDROADDEMO"),
                         "routeWithPrivateYard": new RouteSample("Route on the Yard map in San Francisco", 
                         "This example shows the Yard map on the San Francisco airport and possible routing on the top of it.",
                         "&waypoint0=37.610133498440135,-122.39248212048551\n&waypoint1=37.61054145833521,-122.35930855938932",
                         0,
                         "&overlays=OVERLAYSANFRANCISCO"),
             "avoidCrossroad": new RouteSample("Avoid crossroad in Madrid", 
                         "This example shows the avoid crossroad overlay in Madrid and routing on the top of it.",
                         "&waypoint0=40.45901645470276,-3.791819475009106\n&waypoint1=40.461849043749304,-3.791127465083264",
                         0,
                         "&overlays=OVERLAYMADRID"),
             "avoidBumpy": new RouteSample("Avoid bumpy road in Madrid", 
                         "This example shows the avoid bumpy road in Madrid and route around it.",
                         "&waypoint0=40.47217274351645,-3.7890864585642703\n&waypoint1=40.47406622056981,-3.828697321296204",
                         0,
                         "&overlays=OVERLAYMADRID1"),
             "avoidLeftTurn": new RouteSample("Avoid left turn in Pittsburgh", 
                         "This example shows resticted left turn on the crossroad in Pittsburgh and route around it.",
                         "&waypoint0=40.363328616525195,-79.96809110976756\n&waypoint1=40.36336744713949,-79.96835396625102",
                         0,
                         "&overlays=OVERLAYPITTSBURGH&avoidTurns=uTurn"),
             "overrideSpeedProfile": new RouteSample("Override speed profile in LA", 
                         "This example shows overriden speed profile in LA and route through it.",
                         "&waypoint0=34.06688866461588,-118.40999625390396\n&waypoint1=34.01945117193681,-118.4918787307106",
                         0,
                         "&overlays=OVERLAYLA")   
         };
 
 
         var Simulation = function(routeSamplesArr, label, commentArr){
             //this.id = id;
             this.routeSamplesArr = routeSamplesArr;
             this.commentArr = commentArr;
 
             if(label === undefined || label === null || label === ''){
                 this.label = routeSamplesArr[0].getLabel();
             }else{
                 this.label = label;
             }
 
             this.getLabel = function(){
                 return this.label;
             };
 
             this.getRoutes = function(){
                 return this.routeSamplesArr;
             };
 
             this.getComments = function(idx){
                 if(idx!==undefined && idx!=null && idx>=0 && commentArr && commentArr.length > 0){
                     return commentArr[idx];
                 }
             }
 
         };
 
         var simulationsObj = {
             'blank': new Simulation([samplesObj['blank']]),
             'mainBrueke': new Simulation([samplesObj['mainBrueke']]),
             'fraRoute': new Simulation([samplesObj['fraRoute']]),
             'fraOneWay': new Simulation([samplesObj['fraOneWay']]),
             //'swissRoute': new Simulation([samplesObj['swissRoute']]), //removed this example from the demo because it needs an overlay and this overlay must be created in another demo - does not make much sense
             'fraNoTruck': new Simulation([samplesObj['fraNoTruck']]),
             'DK_SWE_Motorway': new Simulation([samplesObj['DK_SWE_Motorway']]),
             'English_channel_ferry': new Simulation([samplesObj['English_channel_ferry']]),
             'Boston_Canaan': new Simulation([samplesObj['Boston_Canaan']]),
             'fraStopOver': new Simulation([samplesObj['fraStopOver']]),
             'fraDarmstadtDriverRestTime': new Simulation([samplesObj['fraDarmstadtDriverRestTime']]),
             'fraTruckShouldWaitOnSunday': new Simulation([samplesObj['fraTruckShouldWaitOnSunday']]),
             'fraOpeningTime': new Simulation([samplesObj['fraOpeningTime']]),
             'capacityDemo1': new Simulation([samplesObj['capacityDemo1']]),
             'capacityDemo2': new Simulation([samplesObj['capacityDemo2']]),
             'capacityDemo3': new Simulation([samplesObj['capacityDemo3']]),
             'alternativesDemo': new Simulation([samplesObj['alternativesDemo']]),
             'relaxVehTypRestrToTurnIntoZeilFrankfurtWorking': new Simulation([samplesObj['relaxVehTypRestrToTurnIntoZeilFrankfurtWorking']]),
             'headingAndWSEParams': new Simulation([samplesObj['headingAndWSEParams']]),
             'excludeCountries': new Simulation([samplesObj['excludeCountries']]),
             'environmentalZones': new Simulation([samplesObj['environmentalZones']]),
             'emergencyExample': new Simulation([samplesObj['emergencyExample']]),
             'wasteCollection': new Simulation([samplesObj['wasteCollection']]),
             'busExample': new Simulation([samplesObj['busExample']]),
             'routeWithCustomSpeedProfile': new Simulation([samplesObj['routeWithCustomSpeedProfile']]),
             'routeWithOverlaysWithPreferredLinks': new Simulation([samplesObj['routeWithOverlaysWithPreferredLinks']]),
             'routeWithOverlaysWithAvoidLinks': new Simulation([samplesObj['routeWithOverlaysWithAvoidLinks']]),
             'routeWithPrivateYard': new Simulation([samplesObj['routeWithPrivateYard']]),
             'avoidCrossroad': new Simulation([samplesObj['avoidCrossroad']]),
             'avoidBumpy': new Simulation([samplesObj['avoidBumpy']]),
             'avoidLeftTurn': new Simulation([samplesObj['avoidLeftTurn']]),
             'overrideSpeedProfile': new Simulation([samplesObj['overrideSpeedProfile']])
         };
 
         /**
         *   Load samples and populate them in the drop down
         */
         var loadSamples = function() {
             for (var simulation in simulationsObj) {
                 var opt = document.createElement('option');
                 opt.innerHTML = simulationsObj[simulation].getLabel();
                 opt.id = simulation;
                 document.getElementById("exampleSelector").appendChild(opt);
             }
         }();
 
         document.getElementById('pageblock').style.display = "none";
         
         /**
         *	When a sample is selected, show it in the destinations list
         */
         function exampleSelect() {
             var me = document.getElementById('exampleSelector');
             destinationsTextArea.value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getWaypointsParameters();
             // set the vehicle
             document.getElementById('vehicleType').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getVehicleType();
             // set default vehicle values which can be overwritten via setExampleSpecificValuesInGui()
             handleVehicleSpecChanged();
             // set the example text
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasExampleDescriptionText()) {
                 var txtElem = document.getElementById("ExampleInfoText");
                 txtElem.innerHTML = "<small>" + simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getExampleDescriptionText() + "</small>";
                 showExampleDescription();
             } else {
                 var txtElem = document.getElementById("ExampleInfoText");
                 txtElem.innerHTML = "";
                 hideExampleDescription();
             }
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasAdditionalParams()){
                 document.getElementById('addtlparams').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getAdditionalParams();
             } else {
                 document.getElementById("addtlparams").value = ""; // default is no additional parameters
             }
             // set example specific settings
             setExampleSpecificValuesInGui(me.selectedOptions[0].id);
             
             // toggle truck map display based on vehicle spec           
             showHideTruckMapDisplay();
 
             parseWaypointsFromTextAndUpdateMap("destinations");
             if (me.selectedOptions[0].id === "routeWithOverlaysWithPreferredLinks" || me.selectedOptions[0].id === "routeWithOverlaysWithAvoidLinks"){ //these examples need to first create the overlays and then route with the overlays. So first overlays need to be created
                 var overlaySpecification = getOverlaySpecification(me.selectedOptions[0].id);
                 uploadOverlaysAndCalculateRoute(overlaySpecification, simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getAdditionalParams());
             }else{
                 calculateRoute();        
             }
         }
 
         /**
         *   A waypoint for display using markers
         */
         function Waypoints(idx, lat, lng, options, prefix) {
             this.idx = idx;
             this.lat = lat;
             this.lng = lng;
             this.prefix = prefix;
             this.options = options;
             this.seqNrOnRoute = null;
 
             /**
             *   Return a waypoint text. Eg. waypoint0=geo!50,8...
             */
             this.getWaypointParameterText = function() {
                 return "&waypoint" + idx + "=" + ((prefix)?prefix:"") + parseFloat(this.lat).toFixed(6) + "," + parseFloat(this.lng).toFixed(6) + ((this.bonusDef != 'none' && this.bonusDef != undefined && this.bonusDef != "") ? (";" + this.bonusDef) : "");
             };
 
         }
 
         /**
             Clears any previous result on switch between simple/expert mode and on new example selection
         */
         function clearPreviousResult() {
             feedbackTxt.innerHTML = '';
             routeSliderDiv.style.display="none";
             try {
                 clearPreviousRoute();
                 plannedWaypointsGroup.removeAll();
             } catch (e) {
                 console.log("Failed to clear previous result: " + e);
             }
         }
 
         /*
             Clears previous route result
         */
         function clearPreviousRoute() {
             routeLinks = [];
             routeGroup.removeAll();
             usedWaypointsGroup.removeAll();
             maneuversGroup.removeAll();
             searchResultGroup.removeAll();
             spaceGroup.removeAll();
             spaceGroupB.removeAll();
             elapsedTimeGroup.removeAll();
             warningsGroup.removeAll();
             secondaryGrp.removeAll();
             group.removeAll();
             if(searchResultInfoBubble) {
                 searchResultInfoBubble.close();
             }
         }
 
         /**
         *   Read the destinations text and parse into waypoints
         *   @param documentId - the document id which should be used to parse the waypoints from 
         *   @see Waypoints
         */
         function parseWaypointsFromTextAndUpdateMap(documentId) {
             var waypointArr = [];
             var textAreaWithWaypoints = document.getElementById(documentId);
             if (textAreaWithWaypoints.value.trim() != "") {
                 var destinationsWithoutLineBreaks = textAreaWithWaypoints.value.trim().replace(/\r*\n/g, '').trim().substring(1);
                 destinationsWithoutLineBreaks = decodeURIComponent(destinationsWithoutLineBreaks); // decode any url parameters
                 var rawDestArray = destinationsWithoutLineBreaks.split(/&/);
                 for (var i = 0; i < rawDestArray.length; i++) {
                     if(rawDestArray[i].indexOf("waypoint") >= 0) {
                         var rawDestination = rawDestArray[i]; // &waypoint0=geo!50.23232,6.434343;taketo:5
                         if(new RegExp("(?:" + "=" + ")(.*?)(?:" + ";|$" + ")", "ig").exec(rawDestination) !== null) {
                             var coordWithPrefix = (new RegExp("(?:" + "=" + ")(.*?)(?:" + ";|$" + ")", "ig").exec(rawDestination)[1]).split("!");
                             var coord = coordWithPrefix[(coordWithPrefix.length - 1)].split(",");
                             var prefix = (coordWithPrefix[(coordWithPrefix.length - 2)] || "");
                             prefix = (prefix) ? prefix + '!' : prefix;
                             var wayPointIdx = new RegExp("(?:" + "waypoint" + ")(.*?)(?:" + "=" + ")", "ig").exec(rawDestination)[1];
                             var options = (rawDestination.indexOf(";") > -1) ? (rawDestination.substr(rawDestination.indexOf(";") + 1)) : "";
                             waypointArr.push(new Waypoints(wayPointIdx, coord[0], coord[1], options, prefix));
                         }
                     }
                 }
             }
             // clear old route result markers as we got new planned ones
             clearPreviousResult();
             // create new markers and update view bounds
             createMarkersForWaypoints(waypointArr, plannedWaypointsGroup);
             updateMapViewBounds();
         }
 
         /*********************************
           Vehicle Specification
         *********************************/
         /**
         This method checks the user setted vehicle specification and adapts all vehicle value in the GUI
         */
         function handleVehicleSpecChanged() {
             var driverCost = null;
             var vehicleCost = null;
             var totalHeight = 3.8;
             var totalWidth = 2.55;
             var totalLength = 10;
             var limitedWeight = 11;
             var weightPerAxle = 3.6;
             var trailer = false;
 
             var vehSpecSelection = document.getElementById("vehicleType").value; 
             if(vehSpecSelection == 0 || vehSpecSelection == 11) { // Car
                 totalHeight = 1.67;
                 totalWidth = 1.8;
                 totalLength = 4.41;
                 limitedWeight = 1.739;
                 weightPerAxle = 0.87;
                 trailer = false;
             } else if(vehSpecSelection == 1) { // Transporter
                 totalHeight = 2.55;
                 totalWidth = 1.94;
                 totalLength = 6.52;
                 limitedWeight = 3.500;
                 weightPerAxle = 1.750;
                 trailer = false;
             } else if(vehSpecSelection == 2) { // Truck (7.5t)
                 totalHeight = 3.4;
                 totalWidth = 2.50;
                 totalLength = 7.2;
                 limitedWeight = 7.500;
                 weightPerAxle = 3.250;
                 trailer = false;
             } else if(vehSpecSelection == 3) { // Truck (11t)
                 totalHeight = 3.8;
                 totalWidth = 2.55;
                 totalLength = 10.0;
                 limitedWeight = 11.000;
                 weightPerAxle = 3.666;
                 trailer = false;
             } else if(vehSpecSelection == 4) { // Truck with one trailer (38t)
                 totalHeight = 4.0;
                 totalWidth = 2.55;
                 totalLength = 18.0;
                 limitedWeight = 38.000;
                 weightPerAxle = 8.000;
                 trailer = true;
             } else if(vehSpecSelection == 5) { // Trailer Truck (40t)
                 totalHeight = 4.0;
                 totalWidth = 2.55;
                 totalLength = 16.5;
                 limitedWeight = 40.000;
                 weightPerAxle = 14.000;
                 trailer = true;
             } else if(vehSpecSelection == 6) { // Car with Trailer
                 totalHeight = 1.67;
                 totalWidth = 1.8;
                 totalLength = 7.33;
                 limitedWeight = 1.739;
                 weightPerAxle = 0.87;
                 trailer = false;
             }  else if(vehSpecSelection == 7) { // Bus
                 totalHeight = 4;
                 totalWidth = 2.55;
                 totalLength = 13.5;
                 limitedWeight = 25;
                 weightPerAxle = 10;
                 trailer = false;
             } else if(vehSpecSelection == 8 || vehSpecSelection == 10) { //Emergency or Pedestrian / Emergency
                 totalHeight = 2.85;
                 totalWidth = 2.15;
                 totalLength = 6.59;
                 limitedWeight = 5;
                 weightPerAxle = 2.5;
                 trailer = false;
             } else if(vehSpecSelection == 9) {
                 totalHeight = 1.90;
                 totalWidth = 0.7;
                 totalLength = 0.4;
                 limitedWeight = 0.09;
                 weightPerAxle = 0.09;
                 trailer = false;
             }
                            
             document.getElementById("drivercost").value = driverCost;
             document.getElementById("vehiclecost").value = vehicleCost;
             document.getElementById("height").value = totalHeight;
             document.getElementById("width").value = totalWidth;
             document.getElementById("length").value = totalLength;
             document.getElementById("limitedWeight").value = limitedWeight;
             document.getElementById("weightPerAxle").value = weightPerAxle; 
             document.getElementById("hasTrailer").checked = trailer; 
         }
         
         /**
         This method checks the user selected example and adapts setting values in the GUI
         */
         function setExampleSpecificValuesInGui(id) {
 
             // default not avoid
             document.getElementById("motorwayAvoid").value = 1;
             document.getElementById("tollAvoid").value = 1;
             document.getElementById("boatFerry").value = 1; 
             document.getElementById("railFerry").value = 1;
             document.getElementById("tunnel").value = 1;
             // default no alternatives
             document.getElementById('alternatives').value = 0; 
             // set default starting date
             setDepartureNow();
 
             if (id === 'fraTruckShouldWaitOnSunday'){
                 document.getElementById("limitedWeight").value = "10"; //10t truck cannot drive on Sunday in Germany
                 document.getElementById("departure").value = "2017-11-12T13:45:00"; // Sunday because truck more than 7.5t cannot drive on Sunday in Germany
             } else if (id === 'fraStopOver' || id === 'fraOpeningTime'){
                 document.getElementById('drivercost').value = "5";
             } else if (id === 'alternativesDemo'){
                document.getElementById('alternatives').value = 10;
             } else if (id === 'headingAndWSEParams'){
                document.getElementById('drivercost').value = "5";
                document.getElementById("vehiclecost").value = "1.1";
             } else if (id === 'routeWithCustomSpeedProfile')  {
                 document.getElementById("limitedWeight").value = "30"; //30t truck 
             } else if(id === 'English_channel_ferry') {
                 document.getElementById("boatFerry").value = -1; // avoid
             }  else if(id === 'DK_SWE_Motorway') {
                 document.getElementById("motorwayAvoid").value = -1; // avoid
             } else if(id === 'Boston_Canaan') {
                 document.getElementById("tollAvoid").value = -1; // avoid
             }
         }
 
         function setDepartureNow(){
             document.getElementById("departure").value = moment().format("YYYY-MM-DDTHH:mm:ss");
         }
 
         /**
         *   Creates waypoint markers from given array
         */
         function createMarkersForWaypoints(waypointsArr, markersGroup) {
             markersGroup.removeAll();
             for (var wpIdx in waypointsArr) {
                 var number = waypointsArr[wpIdx].idx;
                 var iconColor = "#1188DD";
                 if (waypointsArr[wpIdx].seqNrOnRoute != null) {
                     number = waypointsArr[wpIdx].seqNrOnRoute == -1 ? '-' : waypointsArr[wpIdx].seqNrOnRoute;
                     iconColor = "#299E7C";
                 }
                 var marker = new H.map.Marker(waypointsArr[wpIdx], { icon: new H.map.Icon(createWaypointIcon(number, iconColor)) });
                 markersGroup.addObject(marker);
                 markersGroup.setZIndex(10);
             }
         }
 
         /*
             Updates the map display view bounds
         */
         function updateMapViewBounds() {
             // update view getBounds
             var newViewBounds = null;
             var pwgb = plannedWaypointsGroup.getBoundingBox();
             var uwgb = usedWaypointsGroup.getBoundingBox();
             var rgb = routeGroup.getBoundingBox();
             if(pwgb !== null) {
                 newViewBounds = pwgb.clone();
             }
             if(uwgb !== null) {
                 if(newViewBounds === null) {
                     newViewBounds = uwgb.clone();
                 } else {
                     newViewBounds = newViewBounds.mergeRect(uwgb);
                 }
             }
             if(rgb !== null) {
                 if(newViewBounds === null) {
                     newViewBounds = rgb.clone();
                 } else {
                     newViewBounds = newViewBounds.mergeRect(rgb);
                 }
             }
             if(newViewBounds !== null) {
                 //map.setViewBounds(newViewBounds);
                 map.getViewModel().setLookAtData({
                     bounds: newViewBounds
                 });
             }
         }
 
         /*
             Parses the URL parameters to this demo
         */
         function getUrlParameter(param) {
             var pageURL = window.location.search.substring(1);
             var urlVariables = pageURL.split('&');
             for (var i = 0; i < urlVariables.length; i++) {
                 var parameterName = urlVariables[i].split('=');
                 if (parameterName[0] == param) {
                     return parameterName[1];
                 }
             }
             return null;
         }
 
         var truckOverlayProvider = new H.map.provider.ImageTileProvider({
             label: "Tile Info Overlay",
             descr: "",
             min: 12,
             max: 20,
             getURL: function(col, row, level) {
                 server_rr++;
                 if (server_rr > 4) server_rr = 1;
                 return ["https://",
                     server_rr,
                     ".base.maps.ls.hereapi.com/maptile/2.1/truckonlytile/newest/normal.day/",
                     level,
                     "/",
                     col,
                     "/",
                     row,
                     "/256/png8",
                     "?style=fleet",
                     "&apikey=",
                     api_key_jp
                 ].join("");
             }
         });
         var truckOverlayLayer = new H.map.layer.TileLayer(truckOverlayProvider);
         map.addLayer(truckOverlayLayer);
 
         /**
          * Show and hide truck restrictions
          */
          function showHideTruckMapDisplay() {
             if (document.getElementById("truckrestr").checked) map.addLayer   (truckOverlayLayer);
             else                                              try {  map.removeLayer(truckOverlayLayer); } catch (exc) {console.log("Failed to remove truck overlay layer: " + exc);}
         }
 
         /**
          * Show and hide time along route
          */
         function timeAlongRouteSelect() {
             if (document.getElementById("linkTime").checked) map.addObject   (elapsedTimeGroup);
             else                                       try { map.removeObject(elapsedTimeGroup); } catch (exc) {console.log("Failed to remove elapsed time group: " + exc)}
         }
 
         /*
             Show and hides the warnings along the route
         */
         function warningsSelect() {
             if (document.getElementById("showWarnings").checked) map.addObject   (warningsGroup);
             else                                       try { map.removeObject(warningsGroup); } catch (exc) {console.log("Failed to remove warning group: " + exc)}
         }
 
         /*
         Show and hides the manoevers along the route
         */
         function maneuversSelect() {
             if (document.getElementById("showManeuvers").checked) map.addObject   (maneuversGroup);
             else                                       try { map.removeObject(maneuversGroup); } catch (exc) {console.log("Failed to remove maneuver group: " + exc)}
         }
 
         /**
          * Function collects truck attributes in one object
          */
         var truckParameters = function(vehicleType) {
             var p = {};
 
             if (vehicleType === "truck" || vehicleType === "bus") {
                 
                 var lWeight = parseFloat(document.getElementById("limitedWeight").value);
                 var aWeight = parseFloat(document.getElementById("weightPerAxle").value);
                 var height = parseFloat(document.getElementById("height").value);
                 var width = parseFloat(document.getElementById("width").value);
                 var length = parseFloat(document.getElementById("length").value);
 
                 if (isNaN(lWeight)) lWeight = 0;
                 if (isNaN(aWeight)) aWeight = 0;
                 if (isNaN(height)) height = 0;
                 if (isNaN(width)) width = 0;
                 if (isNaN(length)) length = 0;
 
                 var hazard = [];
                 if (document.getElementById('explosive').checked)
                     hazard.push("explosive");
                 if (document.getElementById('gas').checked)
                     hazard.push("gas");
                 if (document.getElementById('flammable').checked)
                     hazard.push("flammable");
                 if (document.getElementById('combustible').checked)
                     hazard.push("combustible");
                 if (document.getElementById('organic').checked)
                     hazard.push("organic");
                 if (document.getElementById('poison').checked)
                     hazard.push("poison");
                 if (document.getElementById('radioActive').checked)
                     hazard.push("radioActive");
                 if (document.getElementById('corrosive').checked)
                     hazard.push("corrosive");
                 if (document.getElementById('poisonousInhalation').checked)
                     hazard.push("poisonousInhalation");
                 if (document.getElementById('harmfulToWater').checked)
                     hazard.push("harmfulToWater");
                 if (document.getElementById('other').checked)
                     hazard.push("other");
 
                 hazard = hazard.join(",");
 
                 if (hazard.length > 0) p["shippedHazardousGoods"] = hazard;
                 if (aWeight > 0) p["weightPerAxle"] = aWeight + "t";
                 if (lWeight > 0) p["limitedWeight"] = lWeight + "t";
                 if (height > 0) p["height"] = height + "m";
                 if (width > 0) p["width"] = width + "m";
                 if (length > 0) p["length"] = length + "m";
 
                 p["trailersCount"] = document.getElementById('hasTrailer').checked ? "1" : "0";
             }
 
             return p;
         };
 
         function eraseCharSurr(x, ch){
             while( x.charAt( 0 ) === ch )
                 x = x.slice( 1 );
             while( x.charAt( x.length-1 ) === ch )
                 x = x.slice(0, x.length-1);
             return x;
         }
 
         function getDestinationParamArr() {
             if (document.getElementById("destinations").value != ""){
                 var p = document.getElementById("destinations").value.trim();
                 p = eraseCharSurr(p, '&');
                 return p.trim().split(/\n+/g);
             } else{
                 return [];
             } 
         }
 
         /*
         Show and hides the overlay
              */
         /*function overlaySelect() {
             if (document.getElementById("showOverlay").checked){
                  map.addObject   (group);
                 map.addObject   (secondaryGrp);
             }
             else   try { map.removeObject(group);  map.removeObject(secondaryGrp); } catch (exc) {console.log("Failed to remove warning group: " + exc)}
         }*/
 
 
         /**
         *	Calculate route
         */
         function calculateRoute() {
             Spinner.showSpinner();
             var url;
             if(document.getElementById('simple-mode-radio').checked === true) {
                 if(document.getElementById("destinations").value.trim() === "") {
                     feedbackTxt.innerHTML = "<font color=\"red\">No waypoints given</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     Spinner.hideSpinner();
                     return;
                 } 
                 var transportMode;
                 var vehSpecSelection = document.getElementById("vehicleType").value; 
                 if(vehSpecSelection == 0 || vehSpecSelection == 1 || vehSpecSelection == 6) {
                     transportMode = "car";
                 } else if(vehSpecSelection == 0 || vehSpecSelection == 2 || vehSpecSelection == 3 || vehSpecSelection == 4 || vehSpecSelection == 5) {
                     transportMode = "truck";
                 } else if(vehSpecSelection == 7) {
                     transportMode = "bus";
                 } else if(vehSpecSelection == 11) {
                     transportMode = "taxi";
                 } else if(vehSpecSelection == 8) {
                     transportMode = "emergency";
                 } else if(vehSpecSelection == 9) {
                     transportMode = "pedestrian";
                 }  else if(vehSpecSelection == 10) {
                     transportMode = "pedestrian,emergency";
                 }
 
                 parseWaypointsFromTextAndUpdateMap("destinations");
                 var addtlparams = document.getElementById('addtlparams').value.trim();
                 addtlparams = eraseCharSurr(addtlparams, '&');
                 url = document.getElementById("endpoint").value + '?';
                 url += eraseCharSurr( [addtlparams, getDestinationParamArr().join("")].join("&"), "&" );
                 var truckRawParams = truckParameters(transportMode);
                 var vehicleType = transportMode;
                 var traffic     = document.getElementById('traffic'    ).value;
                 var motorway    = document.getElementById('motorwayAvoid'   ).value;
                 var toll        = document.getElementById('tollAvoid'       ).value;
                 var boatFerry   = document.getElementById('boatFerry'  ).value;
                 var railFerry   = document.getElementById('railFerry'  ).value;
                 var tunnel      = document.getElementById('tunnel'  ).value;
                 var driverCost = parseFloat(document.getElementById("drivercost").value);
                 var vehicleCost = parseFloat(document.getElementById("vehiclecost").value);
                 var alternatives = parseFloat(document.getElementById("alternatives").value);
                 var truckParams = $.param(truckRawParams);
 
                 if(!addtlparams.includes("mode")){
                   url += "&mode=fastest;" + vehicleType + ";traffic:" + traffic;
                 }
                 
                 if( motorway  != 1) url += ";motorway:"  + motorway;
                 if (toll      != 1) url += ";tollroad:"  + toll;
                 if (boatFerry != 1) url += ";boatFerry:" + boatFerry;
                 if (railFerry != 1) url += ";railFerry:" + railFerry;
                 if (tunnel    != 1) url += ";tunnel:"    + tunnel;
                 var departure = document.getElementById("departure").value;
                 if (departure != "") url += "&departure=" + departure;
                 var arrival = document.getElementById("arrival").value;
                 if (arrival != "") url += "&arrival=" + arrival;
 
                 if (!isNaN(driverCost) && driverCost !== "") url = url + "&driver_cost=" + driverCost;
                 if (!isNaN(vehicleCost) && vehicleCost !== "") url = url + "&vehicle_cost=" + vehicleCost;
                 if (alternatives !== "") url = url + "&alternatives=" + alternatives;
 
 
                 url += "&" + truckParams;
 
                 var logArea = document.getElementById('logArea');
                 logArea.value = url.slice(0, -1);
             } else { // expert mode, URL provided
                 url = document.getElementById("completeUrl").value.replace('\r','').replace('\n','');
                 if(url.length == 0 || !(url.indexOf("/calculateroute.json?") != -1 || url.indexOf("/routeisoline.json?") != -1)) {
                     feedbackTxt.innerHTML = "<font color=\"red\">Only calculateroute.json or routeisoline.json endpoint is supported</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     Spinner.hideSpinner();
                     return;
                 }               
             }
             
             if( url.indexOf("&apikey") == -1 ) url += '&apikey=' + api_key_jp;
             $.ajax({
                 url: url,
                 dataType: "json",
                 async: true,
                 type: 'get',
                 success: function(data) {
                     parseRoutingResponse(data, url);
                     Spinner.hideSpinner();
                     map.getViewPort().resize();
                 },
                 error: function(xhr, status, e) {
                     var errorResp = "unknown error occured";
 
                     if(xhr.responseJSON && xhr.responseJSON.issues != undefined && xhr.responseJSON.issues[0].message != undefined) {
                         errorResp = xhr.responseJSON.issues[0].message;
                     } else if(xhr.responseJSON && xhr.responseJSON.message) {
                         errorResp = xhr.responseJSON.message;
                     } else if(xhr.responseJSON && xhr.responseJSON.errors != undefined && xhr.responseJSON.errors[0].message != undefined){
                         errorResp = xhr.responseJSON.errors[0].message;
                     }
                     
                     if(xhr.responseJSON && xhr.responseJSON.searchSpace != undefined) {
                         for(var k = 0; k < xhr.responseJSON.searchSpace.length; k++) {
                             var split = xhr.responseJSON.searchSpace[k].trim().split(",");
                             var lat = parseFloat(split[0]) / 100000.0;
                             var lon = parseFloat(split[1]) / 100000.0;
                             var m = new H.map.Marker({ lat: lat, lng: lon }, 
                             {
                                 icon: circle
                             });
                             spaceGroup.addObject(m);
                         }
                     }
                     if(xhr.responseJSON && xhr.responseJSON.searchSpaceB != undefined) {
                         for(var k = 0; k < xhr.responseJSON.searchSpaceB.length; k++) {
                             var split = xhr.responseJSON.searchSpaceB[k].trim().split(",");
                             var lat = parseFloat(split[0]) / 100000.0;
                             var lon = parseFloat(split[1]) / 100000.0;
                             var m = new H.map.Marker({ lat: lat, lng: lon }, 
                             {
                                 icon: circleB
                             });
                             spaceGroupB.addObject(m);
                         }
                     }
                     feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp + "</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     routeCalculatonErrorCaseShowClosedLocationReached(errorResp);
                     Spinner.hideSpinner();
                     map.getViewPort().resize();
 
                     
                 }
             });
         }
 
         /**
         *  Parse the routing response
         */
         function parseRoutingResponse(resp, url) {
             routeGroup.removeAll();
             warningsGroup.removeAll();
             elapsedTimeGroup.removeAll();
             secondaryGrp.removeAll();
             group.removeAll();
             //document.getElementById("showOverlay").checked = false;
 
             var zIndex = 1;
             routeLinkHashMap = new Object();
             var remainingTimeAtStartOfRoute = 0;
             
             var baseTime;
             var baseDist;
             var language;
             var threshold = 0.08;
 
             /** if overlay is included in the route call, also draw overlay
             */
             /*if (url.includes("overlays")){
                 showAffectedRoads(url.substring(url.indexOf("overlays=") + 9, url.indexOf("&")));
             }*/
 
             /**
             *   draw the route
             */
             if( resp.response.route[0].summary === undefined) {
                 feedbackTxt.innerHTML = "<font color=\"red\">Route response contains no route summary information. Try to add &routeAttributes=sm</font>";
                 feedbackTxt.innerHTML += "<br/>";
                 Spinner.hideSpinner();
                 return;
             }
             var sample = new H.map.Group();
             baseTime = resp.response.route[0].summary.baseTime;
             baseDist = resp.response.route[0].summary.distance;
             language = resp.response.language;
             for (var r = 0; r < resp.response.route.length; r++) {
                 if(((resp.response.route[r].summary.baseTime - baseTime)/baseTime) > threshold){
                     continue;
                 }
                 for (var k = 0; k < resp.response.route[r].leg.length; k++){
                         var maneuvers = resp.response.route[0].leg[k].maneuver
                         for (var i in maneuvers) {
                             if(maneuvers[i].position !== undefined) { // maneuvers could have no geometry if set &maneuverAttributes=none
                                 var lat = maneuvers[i].position.latitude;
                                 var lon = maneuvers[i].position.longitude;
                                 var point = new H.geo.Point(parseFloat(lat), parseFloat(lon));
                                 var instr = maneuvers[i].instruction.replace(new RegExp("</span>", 'g'), "").replace(new RegExp('<span class="[a-z\-]+">', 'g'), "");
                                 var marker = new H.map.DomMarker(point, { icon: createWarningIconMarker(humanReadabletime(maneuvers[i].travelTime), instr, "guidance", language, true) });
                                 
                                 maneuversGroup.addObject(marker);
                                 /*var marker = new H.map.Marker;
                                 marker.setGeometry(point);
                                 var icon = H.map.Icon({
                                     icon: createWarningIconMarker(humanReadabletime(maneuvers[i].travelTime), 
                                     instr, 
                                     "guidance",
                                     language)
                                 });
                                 marker.setIcon(icon); */
                                 // Define a variable holding SVG mark-up that defines an animated icon image:
                                 /*var animatedSvg =
                                     '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" ' + 
                                     'y="0px" style="margin:-112px 0 0 -32px" width="136px"' + 
                                     'height="150px" viewBox="0 0 136 150"><ellipse fill="#000" ' +
                                     'cx="32" cy="128" rx="36" ry="4"><animate attributeName="cx" ' + 
                                     'from="32" to="32" begin="0s" dur="1.5s" values="96;32;96" ' + 
                                     'keySplines=".6 .1 .8 .1; .1 .8 .1 1" keyTimes="0;0.4;1"' + 
                                     'calcMode="spline" repeatCount="indefinite"/>' +    
                                     '<animate attributeName="rx" from="36" to="36" begin="0s"' +
                                     'dur="1.5s" values="36;10;36" keySplines=".6 .0 .8 .0; .0 .8 .0 1"' + 
                                     'keyTimes="0;0.4;1" calcMode="spline" repeatCount="indefinite"/>' +
                                     '<animate attributeName="opacity" from=".2" to=".2"  begin="0s" ' +
                                     ' dur="1.5s" values=".1;.7;.1" keySplines=" .6.0 .8 .0; .0 .8 .0 1" ' +
                                     'keyTimes=" 0;0.4;1" calcMode="spline" ' +
                                     'repeatCount="indefinite"/></ellipse><ellipse fill="#1b468d" ' +
                                     'cx="26" cy="20" rx="16" ry="12"><animate attributeName="cy" ' +
                                     'from="20" to="20" begin="0s" dur="1.5s" values="20;112;20" ' +
                                     'keySplines=".6 .1 .8 .1; .1 .8 .1 1" keyTimes=" 0;0.4;1" ' +
                                     'calcMode="spline" repeatCount="indefinite"/> ' +
                                     '<animate attributeName="ry" from="16" to="16" begin="0s" ' + 
                                     'dur="1.5s" values="16;12;16" keySplines=".6 .0 .8 .0; .0 .8 .0 1" ' +
                                     'keyTimes="0;0.4;1" calcMode="spline" ' +
                                     'repeatCount="indefinite"/></ellipse></svg>';
 
                                 // Create an icon object, an object with geographic coordinates and a marker:
                                 var icon = new H.map.DomIcon(animatedSvg),
                                     coords = point,
                                     marker1 = new H.map.DomMarker(coords, {icon: icon});
 
                                 // Set map center and zoom, add the marker to the map:
                                 //map.setCenter(coords);
                                 //map.setZoom(18);
                                 //map.addObject(marker);*/
                                 
                                 
                                 //sample.addObject(marker1);
                                 //map.addObject(marker);
                             }
                         }                   
                 }
             }
             displaySummary(resp.response.route[0]);
            // map.addObject(sample);
             // create link objects
             var previousTime = "";
             for (var r = 0; r < resp.response.route.length; r++) {
                 
                 if(((resp.response.route[r].summary.baseTime - baseTime)/baseTime) > threshold){
                     //continue;
                 }
                 
                 for(var k = 0; k<resp.response.route[r].leg.length; k++){
                     if( resp.response.route[r].leg[k].link === undefined) {
                         feedbackTxt.innerHTML = "<font color=\"red\">Route response contains no link information. Try to add &legAttributes=li</font>";
                         feedbackTxt.innerHTML += "<br/>";
                         Spinner.hideSpinner();
                         return;
                     }
                     for (var m = 0; m < resp.response.route[r].leg[k].link.length; m++) {
                         var linkId = (resp.response.route[r].leg[k].link[m].linkId.lastIndexOf("+", 0) === 0 ? resp.response.route[r].leg[k].link[m].linkId.substring(1) : resp.response.route[r].leg[k].link[m].linkId);
                         var strip = new H.geo.LineString();
                         var shape = resp.response.route[r].leg[k].link[m].shape;
                         if( shape === undefined) {
                             feedbackTxt.innerHTML = "<font color=\"red\">Route response contains no link shape information. Try to add &linkAttributes=sh</font>";
                             feedbackTxt.innerHTML += "<br/>";
                             Spinner.hideSpinner();
                             return;
                         }
                         var l = shape.length;
                         for (var i = 0; i < l; i += 2) {
                             strip.pushLatLngAlt(shape[i], shape[i + 1], 0);
                         }
                         var routeStyle = {
                             style: {
                                     lineWidth: (routeStroke - (2)), // alternatives get smaller line with
                                     strokeColor: routeColor[r],
                                     lineCap: 'butt'
                                 }
                             };
                         var link = new H.map.Polyline(strip, routeStyle);
                         link.setArrows(true);
                         link.$routeStyle = routeStyle;
                         if(m === 0){
                             remainingTimeAtStartOfRoute = resp.response.route[r].leg[k].link[m].remainTime;
                         }
 
                         var elapsedTime = remainingTimeAtStartOfRoute - resp.response.route[r].leg[k].link[m].remainTime;
                         
                         // show the elapsed time (time since the route starts) at each link
                         var time = humanReadabletimeShort(elapsedTime);
                         if (time != previousTime) {
                             elapsedTimeGroup.addObject(new H.map.Marker(link.getBoundingBox().getCenter(), {icon: createTimeIcon("#000000", time, 17)}));
                             previousTime = time;
                         }
 
                         link.$linkId = resp.response.route[r].leg[k].link[m].linkId;
                         link.$routeNum = r;
                         link.$ETA = resp.response.route[r].summary.travelTime;
                         //The router can send back links ids with "-" or "+" prefix: only "-" prefix is kept and stored in this HashMap, the "+" is removed
                         if (routeLinkHashMap[linkId] == null) {
                             routeLinkHashMap[linkId] = [];
                         }
                         routeLinkHashMap[linkId].push(link);
                         // add event listener to link
                         link.addEventListener('tap', createTapLinkHandler(link));
                         link.addEventListener('pointerenter', createPointerEnterLinkHandler(link));
                         link.addEventListener('pointerleave', createPointerLeaveLinkHandler(link));
                         routeLinks.push(link);
                     }
                 }
             }
 
             if(resp.response.route[0].searchResult !== undefined) {
                 checkPoiPartOfRoute(resp);
             }
 
             if(resp.searchSpace != null) {
                 for(var k = 0; k < resp.searchSpace.length; k++) {
                     var split = resp.searchSpace[k].trim().split(",");
                     var lat = parseFloat(split[0]) / 100000.0;
                     var lon = parseFloat(split[1]) / 100000.0;
                     var m = new H.map.Marker({ lat: lat, lng: lon }, 
                     {
                         icon: circle
                     });
                     spaceGroup.addObject(m);
                 }
             }
             if(resp.searchSpaceB != null) {
                 for(var k = 0; k < resp.searchSpaceB.length; k++) {
                     var split = resp.searchSpaceB[k].trim().split(",");
                     var lat = parseFloat(split[0]) / 100000.0;
                     var lon = parseFloat(split[1]) / 100000.0;
                     var m = new H.map.Marker({ lat: lat, lng: lon }, 
                     {
                         icon: circleB
                     });
                     spaceGroupB.addObject(m);
                 }
             }
 
             // show toll costs
             if (resp.response.route[0].tollCost != null && resp.response.route[0].tollCost.costsByCountryAndTollSystem != null) {
                 showTollCost(resp.response.route[0].tollCost.costsByCountryAndTollSystem, resp.response.route[0].cost);
             }
             // highlight toll booths
             for (var i = 0; i < resp.response.route.length; i++) {
                 if (resp.response.route[i].tollCost) {
                     highlightTollBoothsAndLinks(resp.response.route[i].tollCost.routeTollItems, i);
                 }
             }
             
            //add stop icon for each waypoint with stopover time
            if (resp.response.route[0].leg.length > 0) {
                 var wayPointsArr = getDestinationParamArr();
                 for (var wayPoint in wayPointsArr) {
                     var wp = wayPointsArr[wayPoint];
                     if(wp.indexOf('stopOver,') !== -1){
                         var stopOverDuration = wp.substring(wp.indexOf('stopOver,'),wp.indexOf('!'));
                         stopOverDuration = parseInt(stopOverDuration.replace(/[^0-9\.]/g,''),10);//replace any non digit character with empty string
                         var wayPointLocation = extractWayPointCoordinates(wp);
                         var wayPointCoordinates = wayPointLocation.trim().split(',');
                         var point = new H.geo.Point(parseFloat(wayPointCoordinates[0]), parseFloat(wayPointCoordinates[1]));
                         var marker = new H.map.DomMarker(point, { icon: createWarningIconMarker('StopOver', 'StopOver Delay for '+humanReadabletime(stopOverDuration), 'StopOver', null, true) });
                         warningsGroup.addObject(marker);
                     }
                 }
            }
 
            // add warnings message only for driver rest times, sleeping when vehicle cannot enter a link due to some restriction, or delay at waypoint
            var warnings = resp.response.warnings;
            if (warnings){
                 //if there are multiple legs in the response then the routeLinkSeqNum goes across the legs for example.,
                 //if the warning message says that we took the break at the routeLinkSeq = 20 and the first leg contains
                 //12 links and the 2nd leg contains 10 links then the routeLinkSeq number goes with the number 13 in the 
                 //2nd leg and it represents that at 8th link of the 2nd leg we took the break
                 var combinedLegs = [];
                 var previousLink = 0;
                 for(var l = 0; l<resp.response.route[0].leg.length; l++){
                     if (l > 0) combinedLegs = combinedLegs.concat(resp.response.route[0].leg[l].link.slice(1));
                     else  combinedLegs = combinedLegs.concat(resp.response.route[0].leg[l].link);          
                 }
                 for (var w=0; w<warnings.length; w++) {
                     var warningMsg = warnings[w].message;
                     var warningCode = warnings[w].code;
                     if (warningMsg){
                       if (warnings[w].routeLinkSeqNum !== -1) {
                             var routeLinkSeqNum = warnings[w].routeLinkSeqNum;
                             if (routeLinkSeqNum){ //routeLinkSeqNum = "routeLinkSeqNum 897"
                                 var actualLinkSeqNum = routeLinkSeqNum - 1; //because the response links array starts at zero index
                                 if(routeLinkSeqNum){
                                     var routeLinksLength = combinedLegs.length;   //resp.response.route[0].leg[l].link.length;
                                     if (actualLinkSeqNum < routeLinksLength){
                                         var shape = combinedLegs[actualLinkSeqNum].shape; //resp.response.route[0].leg[l].link[actualLinkSeqNum].shape;
                                         if (shape){
                                             var shapeLength = shape.length;
                                             var lastLon = shape[1];
                                             var lastLat = shape[0];
                                             var point = new H.geo.Point(parseFloat(lastLat), parseFloat(lastLon));
                                             var warningObj = new Warning(warnings[w]);
                                             var marker = new H.map.DomMarker(point, { icon: warningObj.getIcon() });
                                             warningsGroup.addObject(marker);
                                         }
                                     }
                                 }    
                             }
                         }
                     }
                 }
            }       
 
             /**
              * Update waypoint sequence numbers (can change from sorting) and add additional waypoints (f.e. EV POIs on route)
              */
             if (resp.response.route.length > 0) {
                 for (var r = 0; r < resp.response.route.length; r++) {
                     var plannedWaypointsArr = []
                     if(resp.response.route[r].waypoint != undefined) {
                         for (var w = 0; w < resp.response.route[r].waypoint.length; w++) {                    
                             var seqNrOnRoute = resp.response.route[r].waypoint[w].seqNrOnRoute;
                             if(seqNrOnRoute > -1) { // -1 means it was a optional waypoint - but was is not used by the route as its too expensive
                                 var lat = resp.response.route[r].waypoint[w].mappedPosition.latitude;
                                 var lon = resp.response.route[r].waypoint[w].mappedPosition.longitude;
                                 var wp = new Waypoints(seqNrOnRoute, lat, lon);
                                 wp.seqNrOnRoute = seqNrOnRoute;
                                 plannedWaypointsArr.push(wp);
                             }
                         }
                         createMarkersForWaypoints(plannedWaypointsArr, usedWaypointsGroup);
                     }
                 }
             }
 
             updateMapViewBounds();
             routeSlider.setAttribute("max", routeLinks.length);
             routeSlider.value = routeLinks.length; // value for complete route
             if(expertModeEnabled === true) { // slider is only shown in expert mode
                 routeSliderDiv.style.display="block";
             }
             redrawRoute(routeLinks.length);
         }
 
         /**
             In case there is an route calculation error and the service returns the closest location it could reach towards the destination, we parse out the location and show it on the map
         */
         function routeCalculatonErrorCaseShowClosedLocationReached(errorRespMessage) {
             if(errorRespMessage !== null && errorRespMessage.indexOf("closest link to destination reached") != -1) {
                 // f.e. Couldn't reach way point 1 (start links -1022577279 1022577279 dest links -1062429931 1062429931 ), closest link to destination reached: -1022583937 at 51.9772/7.61211, issues: gate
                 var sub = errorRespMessage.substring(errorRespMessage.indexOf("destination reached:") + 20);
                 // sub is now " -1022583937 at 51.9772/7.61211, issues: gate"
                 sub = sub.substring(sub.indexOf("at ") + 3);
                 // sub is now "51.9772/7.61211, issues: gate"
                 var locationCoordinate = sub; // some errors don't have an issue attached and they do not have text after the coordinate
                 var issueText = "Closest location reached during route calculation.";
                 if(locationCoordinate.indexOf(",") != -1) {
                     issueText = issueText + " " + locationCoordinate.substring(locationCoordinate.indexOf(",") + 1);
                     locationCoordinate = locationCoordinate.substring(0, locationCoordinate.indexOf(","));
                 }
                 var loc = locationCoordinate.split("/");
                 var svgMarker = '<svg xmlns="http://www.w3.org/2000/svg" width="{{{WIDTH}}}" height="{{{HEIGHT}}}"><g transform="scale({{{SCALE}}})"><path id="marker_ground_shaddow" fill-opacity="0.2" fill="#000" d="m14.609755992889404,22.544715881347656 c0,1.7000000000000002 -2.7,3 -6,3 c-3.3,0 -6,-1.3 -6,-3 c0,-1.7000000000000002 2.7,-3 6,-3 c3.3,0 6,1.3 6,3 z" class=""/><text id="destination_label_text" stroke="#FF6A00" stroke-opacity="1" stroke-width="0.25" y="8.296977452945708" x="25.288722365205288" font-family="Nimbus Sans L,sans-serif" fill="#FF6A00" font-weight="bold" font-size="12" class="" transform="matrix(1.61048, 0, 0, 1.5062, -15.4331, 0.775187)">_TEXT_</text><path id="pole" fill="#FF6A00" fill-opacity="1" stroke="#FF6A00" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="miter" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M8.58934497833252,22.524281079286993 L8.58934497833252,22.524281079286993 zL8.58934497833252,1.4630391510024836 " class="" filter=""/><path id="triangle" fill="none" stroke="#FF6A00" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="miter" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M8.588785486785127,1.873892068862915 L1.6443515900487569,7.058241844177246 L8.588474289653277,11.463082313537598 L8.588785486785127,1.873892068862915 z" class=""/></g></svg>';
                 var locationMarkerScale = 0.9;
                 // adapt text
                 svgMarker = svgMarker.replace(/_TEXT_/g, issueText);
                 var textLength = issueText.length;
                 var baseWidth = 39 + (textLength * 10.4); // ca 10.4 px per letter
                 var baseHeigth = 26;
                 var baseAnchorX = 8;
                 var baseAnchorY = 22;		
                 // scale the marker
                 svgMarker = svgMarker.replace('{{{SCALE}}}', locationMarkerScale);
                 svgMarker = svgMarker.replace('{{{WIDTH}}}', locationMarkerScale * baseWidth);
                 svgMarker = svgMarker.replace('{{{HEIGHT}}}', locationMarkerScale * baseHeigth);
                 var icon = new H.map.Icon(svgMarker, { anchor: new H.math.Point(locationMarkerScale * baseAnchorX / 2, locationMarkerScale * baseAnchorY)});
                 var marker = new H.map.Marker({ lat: loc[0], lng: loc[1] }, { icon: icon }, false);
                 warningsGroup.addObject(marker);
             }
         }
 
         function showTollCost(costByCountryAndTollSystem, costs) {
             // total cost
             feedbackTxt.innerHTML += "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">COSTS FOR MAIN ROUTE</span>";
             if (!costs) {
                 feedbackTxt.innerHTML += "<br/><br/>None.";
             } else {
                 feedbackTxt.innerHTML += "<br/><br/><span>Total Cost: " + costs.totalCost + " " + costs.currency + "</span>";
                 feedbackTxt.innerHTML += "<ul><li>Driver Cost: " + costs.details.driverCost + " " + costs.currency + "</li></ul>";
                 feedbackTxt.innerHTML += "<ul><li>Vehicle Cost: " + costs.details.vehicleCost + " " + costs.currency + "</li></ul>";
                 feedbackTxt.innerHTML += "<ul><li>Toll Cost: " + costs.details.tollCost + " " + costs.currency + "</li></ul>";
             }
             // route detail cost
             feedbackTxt.innerHTML += "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">TOLL COST FOR MAIN ROUTE</span>";
             if (costs.details.tollCost == 0.0) {
                 feedbackTxt.innerHTML += "<br/><br/>None.<br/><br/>";
             }
             if (costByCountryAndTollSystem != null) {
                 var feedback = "";
                 feedback += "<br/>";
                 for (var j = 0; j < costByCountryAndTollSystem.length; j++) {
                     feedback += "<br/><span style=\"font-weight: bold;border: 1px solid;padding: 2px;\">" + costByCountryAndTollSystem[j].country + "</span>"
                     feedback += "<ul><li>";
                     if(costByCountryAndTollSystem[j].name != null && costByCountryAndTollSystem[j].name.trim().length > 0) {
                         feedback += "Toll System " + costByCountryAndTollSystem[j].name + ": ";
                     } else if(costByCountryAndTollSystem[j].tollSystemId != null && costByCountryAndTollSystem[j].tollSystemId.trim().length > 0) {
                         feedback += "Toll System ID " + costByCountryAndTollSystem[j].tollSystemId + ": "
                     } else {
                         feedback += "Toll : ";
                     }
                     feedback += costByCountryAndTollSystem[j].amountInTargetCurrency + " " + costs.currency;
                     feedback += "</li></ul>";
                 }
                 feedbackTxt.innerHTML += feedback;
             }
             if (costs.details.tollCost != 0.0) {
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_A_Color) + ";\">Paypoint Type A: Country wide toll - payed here.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_a_Color) + ";\">Paypoint Type A: Country wide toll - payed somewhere else.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_S_Color) + ";\">Paypoint Type S: Toll section from one toll booth or between two toll boths.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_p_Color) + ";\">Paypoint Type p: Toll - payed somewhere else.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_F_Color) + ";\">Paypoint Type F: Toll section belonging to a toll system.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_K_Color) + ";\">Paypoint Type K: Toll section defined between junctions.</span>";
                 feedbackTxt.innerHTML += "<br/><span style=\"font-weight: normal;color:" + rgb2hex(ppType_U_Color) + ";\">UFR: Usage fee required link(s).</span>";
             }
         }
 
         var ppType_A_Color = "rgba(255, 255, 000, 0.8)";
         var ppType_a_Color = "rgba(255, 216, 000, 0.8)";
         var ppType_S_Color = "rgba(255, 000, 000, 0.8)";
         var ppType_p_Color = "rgba(255, 127, 127, 0.8)";
         var ppType_F_Color = "rgba(214, 127, 255, 0.8)";
         var ppType_K_Color = "rgba(178, 000, 255, 0.8)";
         var ppType_U_Color = "rgba(000, 204, 000, 0.8)";
         var tollImage = document.createElement("img");
         tollImage.src = "/assets/icons/toll_20_10.png";
         var tollIcon = new H.map.Icon(tollImage, {anchor: new H.math.Point(0, 10)});
 
         function highlightTollBoothsAndLinks(routeTollItems, routeAlternative) {
             if (routeTollItems != null) {
                 for (var i = routeTollItems.length - 1; i >= 0; i--) { // reverse order to get the main route on top
                     var tollType = routeTollItems[i].tollType;
                     var color = "rgba(0, 0, 0, 0)"; // unknown toll item type
                     if      (tollType == 'A') color = ppType_A_Color;
                     else if (tollType == 'a') color = ppType_a_Color;
                     else if (tollType == 'S') color = ppType_S_Color;
                     else if (tollType == 'p') color = ppType_p_Color;
                     else if (tollType == 'F') color = ppType_F_Color;
                     else if (tollType == 'K') color = ppType_K_Color;
                     else if (tollType == 'U') color = ppType_U_Color;
                     for (var j = 0; j < routeTollItems[i].linkIds.length; j++) {
                         var tollstroke = 7 - routeAlternative; // route alternatives have a different stroke
                         var links = routeLinkHashMap[routeTollItems[i].linkIds[j]];
                         for(var li = 0; li < links.length; li++) {
                             links[li].setStyle({strokeColor: color, lineWidth: tollstroke});
                         }
                     }
                     if (routeTollItems[i].tollStructures != null) {
                         for (var j = 0; j < routeTollItems[i].tollStructures.length; j++) {
                             var oneTollStructure = routeTollItems[i].tollStructures[j];
                             var pos = new H.geo.Point(oneTollStructure.latitude, oneTollStructure.longitude);
                             var tollMarker = new H.map.Marker(pos, { icon: tollIcon });
                             routeGroup.addObject(tollMarker);
                         }
                     }
                 }
             }
         }
 
         /*function showAffectedRoads(overlayname){
         
             var layerIds = "LINK_ATTRIBUTE_FCn";		
             var displayURL = endpoint.value.substring(0, endpoint.value.indexOf("/2/")) + '/2/search/all.json' +
             '?map_name='+ overlayname +'&geom=full' +
             '&layer_id=' + layerIds + 
             '&acceptMissingLayers=' + "true" + 
             '&app_id=' + app_id + '&app_code=' + app_code + '&meta=1';
             // ajax call repeated multiple times as the upload request make take some time 
             // untill the changes are available via the API
             $.ajax({
                     url: displayURL,
                     dataType: "json",
                     async: true,
                     type: 'get',
                     tryCount : 0,
                     retryLimit : 20,
                     success: function(respJsonObj) {
                         gotSearchAllResponse(respJsonObj);
                     },
                     error: function(xhr, status, e) {
                         if (xhr.status == 400 && layersToShow.length == 0) {
                                 // error 400 could indicate the upload has not been completed yet
                                 // retry the request
                                 if(timeOutFunction)
                                 clearTimeout(timeOutFunction)
             }
             }
                 });
         }*/
     
         var gotSearchAllResponse = function (respJsonObj)
         {
             if (respJsonObj.error != undefined) {
                 alert (respJsonObj.error);
                 feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
                 return;
             }
            var color = "red";
             // for debugging: feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
             var links = respJsonObj.geometries;
             var geometryCount; 
             if(links === null || links.length == 0)
                 geometryCount = 0;
     
             if(links !== null) {
                 for (var i = 0; i < links.length; i++)	{
                     var strip = new H.geo.Strip();
                     var geometryId = links[i].attributes["GEOMETRY_ID"] != undefined ? parseInt(links[i].attributes["GEOMETRY_ID"]) : -1;
                     if(geometryCount < geometryId)
                         geometryCount = geometryId;
                     
                     var lineString0 = new H.geo.LineString();
                     var lineString1 = new H.geo.LineString();
                     var shape = links[i].geometry.startsWith('LINESTRING')
                         ? links[i].geometry.substring(11, links[i].geometry.length - 1).split(',') // LINESTRING(lat lon, lat lon, ...)
                         : links[i].geometry.substring(17, links[i].geometry.length - 2).split(',') // MULTILINESTRING((lat lon, lat lon, ...))
                     for (var j = 0; j < shape.length; j++) {
                         var lonLat = shape[j].trim().split(' ');
                         strip.pushLatLngAlt(parseFloat(lonLat[1]), parseFloat(lonLat[0]), 0);
                         if( j == 0 )				{ lineString0.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); lineString0.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); }
                         if( j == shape.length-1 )	{ lineString1.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); lineString1.pushPoint({lat: parseFloat(lonLat[1]), lng: parseFloat(lonLat[0]) }); }
                     }
                     
                     var isAttrChanged= links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty("LINK_ID") && links[i].attributes.LINK_ID > 10000000;
                     var isBlocked= links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty("VEHICLE_TYPES") && links[i].attributes.VEHICLE_TYPES === "0";
     
                     var width= 11;
                     if(isAttrChanged) width= 7;
                     if(isBlocked) width= 15;
                     var polyline = isBlocked  ? new H.map.Polyline(strip, { style: { lineDash:[2,20], lineWidth: width, strokeColor: color, fillColor: color, lineJoin: "round" } }) : 
                                                 new H.map.Polyline(strip, { style: { lineWidth: width, strokeColor: isAttrChanged ? color+"C0" : color, fillColor: isAttrChanged ? color+"C0" : color, lineJoin: "round" } });
                     group.addObject(polyline);
                     if( links[i].hasOwnProperty("attributes") && links[i].attributes.hasOwnProperty("LINK_ID") ) {
     
                         coords=  strip.getLatLngAltArray()
                         l= coords.length / 3; 
                         cl= Math.floor(l / 2);
                         var inscLat= (coords[0] + coords[3]) / 2;
                         var inscLon= (coords[1] + coords[4]) / 2;
     
                         if( coords.length > 6 )
                         {
                             inscLat= coords[cl*3]
                             inscLon= coords[cl*3+1]
                         }
     
                         if( links[i].attributes.hasOwnProperty("LINK_ID") && links[i].attributes["LINK_ID"].length )
                         {
                                 var linkText= isBlocked ? '(' + links[i].attributes.LINK_ID + ')' : links[i].attributes.LINK_ID;
                         }
                         
                         
                         secondaryGrp.addObject( new H.map.Polyline(lineString0, { style: { lineWidth: Math.max( 9, width), strokeColor: "black", lineJoin: "round" } }) );
                         secondaryGrp.addObject( new H.map.Polyline(lineString1, { style: { lineWidth: Math.max( 9, width), strokeColor: "black", lineJoin: "round" } }) );
                     }
                 }
             }
             
                 map.addObject( group );
                 map.addObject( secondaryGrp );
                 document.getElementById("showOverlay").checked = true;
                // map.setViewBounds(group.getBounds());
         };
     
 
         // Link selection display handlers
         function createPointerEnterLinkHandler(polyline){
             return function(evt){
                 polyline.setStyle(HOVER_LINK_STYLE);
             };
         }
     
         function createPointerLeaveLinkHandler(polyline, routeStyle) {
             return function (e) {
                 polyline.setStyle(polyline.$routeStyle.style);
             };
         }
 
         //LinkInfo display handler
         function createTapLinkHandler(polyline) {
             return function (e) {
                 var strip = polyline.getStrip();
                 var linkId = polyline.$linkId;
                 var lowIndex = Math.floor((strip.getPointCount() - 1) / 2);
                 var highIndex = Math.ceil(strip.getPointCount() / 2);
                 var center;
                 if (lowIndex === highIndex) {
                     center = strip.extractPoint(lowIndex);
                 } else {
                     var lowPoint = strip.extractPoint(lowIndex);
                     var highPoint = strip.extractPoint(highIndex);
                     center = new H.geo.Point((lowPoint.lat + highPoint.lat ) / 2, (lowPoint.lng + highPoint.lng) / 2);
                 }
                 
                 // Get the LinkId
                 linkId= polyline.$linkId;
                 routeId = polyline.$routeNum;
                 ETA = polyline.$ETA;
                 infoText= "Route: " + routeId + ", LinkId : " + linkId + "ETA: " + humanReadabletime(ETA);
                 
                 
                 
                 
                 // Adding Link data to a Infobubble with text area formatting
                 infoText="<div style='background-color:black;border:0;font-size:12px;max-width:400px;max-height:400px;'>"+infoText+"</div>";
             
                 if (!linkDataInfoBubble){
                     linkDataInfoBubble = new H.ui.InfoBubble(center,{content: infoText});
                     ui.addBubble(linkDataInfoBubble);	
                 }
                 else {
                     linkDataInfoBubble.setPosition(center);
                     linkDataInfoBubble.setContent(infoText);
                 }
                 linkDataInfoBubble.open();
             };
         }
         // Info Bubbles for LinkInfo display
         var linkDataInfoBubble;
           var HOVER_LINK_STYLE = {lineWidth: 12, strokeColor: 'rgba(0, 255, 50, 0.7)', lineJoin: 'round'};
         var DEFAULT_LINK_STYLE = {lineWidth: (routeStroke - (1)), // alternatives get smaller line width
                                     strokeColor: "rgba(255, 255, 255, 0)",
                                     lineCap: 'butt'};
 
         var addPatternTimeControlToMap = function(mapUI) {
             var sumSecondsTimeTraffic = {
                     value: "0"
                 },
                 trafficTileProvider = new H.map.provider.ImageTileProvider({
                     getURL: function(x, y, level) {
                     //var trafficHostNew = 'https//1.traffic.maps.ls.hereapi.com/traffic/6.0/tiles/8/133/86/256/png32?',
                         var trafficHost = "https://1.traffic.maps.ls.hereapi.com/traffic/6.0/tiles/",
                             url = trafficHost + level + "/" + x + "/" + y + "/256/png32?",
                             params = [
                                 "apikey=" + api_key_jp,
                                 "compress=" + "true",
                                 "pattern_time=" + this.sumSecondsTimeTraffic.value
                             ];
                         return url + params.join("&");
                     }.bind({
                         "sumSecondsTimeTraffic": sumSecondsTimeTraffic
                     })
                 }),
                 trafficTileLayer = new H.map.layer.TileLayer(trafficTileProvider),
                 patternContainer = new H.ui.Control(),
                 patternContainerEl,
                 dOfWeekEl = document.querySelector("#dOfWeek"),
                 hourEl = document.querySelector("#hour"),
                 minutesEl = document.querySelector("#minutes"),
                 chgTime = function() {
                     var dOfWeekEl = document.querySelector("#dOfWeek"),
                         hourEl = document.querySelector("#hour"),
                         minutesEl = document.querySelector("#minutes");
                     this.sumSecondsTimeTraffic.value = parseInt(dOfWeekEl.options[dOfWeekEl.selectedIndex].value) * 24 * 60 * 60 + parseInt(hourEl.options[hourEl.selectedIndex].value) * 60 * 60 + parseInt(minutesEl.options[minutesEl.selectedIndex].value) * 60;
                     this.trafficTileLayer.getProvider().reload(false);
                 }.bind({
                     "trafficTileLayer": trafficTileLayer,
                     "sumSecondsTimeTraffic": sumSecondsTimeTraffic
                 });
 
 
             mapUI.addControl("patternCont", patternContainer);
             patternContainerEl = patternContainer.getElement();
 
             patternContainer.setAlignment("right-top");
 
             var ctrlTimeEl = document.querySelector(".ctrl-time"),
                 tSelectEl = document.querySelector(".tselect");
 
             tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34s.png)";
             tSelectEl.addEventListener("click", function(e) {
                 var contTimeEl = document.querySelector(".cont-time"),
                     bkgImg = this.tSelectEl.style.backgroundImage;
 
                 if (bkgImg.indexOf("traffic_timebw30x34s") == -1) {
                     this.tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34s.png)";
                     contTimeEl.style.display = "none";
                     map.removeLayer(this.trafficTileLayer);
                 } else {
                     this.tSelectEl.style.backgroundImage = "url(/assets/examples/traffic_timebw30x34.png)";
                     contTimeEl.style.display = "block";
                     map.addLayer(this.trafficTileLayer);
                 }
                 /*background-image: url(../img/HLP_traffic_timebw30x34.png);*/
             }.bind({
                 "tSelectEl": tSelectEl,
                 "trafficTileLayer": trafficTileLayer
             }));
 
             dOfWeekEl.addEventListener("change", chgTime);
             hourEl.addEventListener("change", chgTime);
             minutesEl.addEventListener("change", chgTime);
 
             patternContainerEl.appendChild(ctrlTimeEl);
 
             patternContainer.setVisibility(true);
         };
 
         //add pattern time control to the map
         addPatternTimeControlToMap(ui);
 
 
         //draw marker for clicked waypoints
       var createWaypointIcon = function(number, iconColor) {
             return '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
               '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
               ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
               '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
               ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
               '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
               ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="' + iconColor + '"/>' +
               '<text font-size="11" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" text-anchor="middle" x="45%" y="50%">' + number + '</text>' +
               '</svg>';
         };
 
 
         var humanReadabletimeShort = function(timeSeconds) {
             if (timeSeconds < 3600) return Math.floor(timeSeconds / 60);
             else                    return Math.floor(timeSeconds / 3600) + ":" + padZerosNumbers(Math.floor((timeSeconds /   60) % 60), 2);
         };
 
         var humanReadableDist = function(distMeters) {
             if (distMeters < 1000)
                 return distMeters + "m";
             else
                 return (distMeters / 1000).toFixed(1) + "km";
         };
 
         var humanReadabletime = function(timeSeconds) {
             if (timeSeconds < 60)
                 return timeSeconds + "s ";
             if (timeSeconds < 3600)
                 return Math.floor((timeSeconds / 60)) + "min " + timeSeconds % 60 + 's';
             else
                 return Math.floor((timeSeconds / 3600)) + "h " + Math.floor((timeSeconds / 60) % 60) + "min " + timeSeconds % 60 + 's';
         };
 
         var humanReadableCost = function(cost) {
             var sign = cost >= 0 ? "" : "-";
             cost = Math.abs(cost);
             if (cost < 1.0) return sign +                   "0." + padZerosNumbers(Math.floor(cost * 100.0)      , 2);
             else            return sign + Math.floor(cost) + "." + padZerosNumbers(Math.floor(cost * 100.0) % 100, 2);
         };
 
         var displaySummary = function(routeObj){
             feedbackTxt.innerHTML = '<table border=0><col width="auto"> <col width="auto">'
                                     + "<tr>"
                                     +"<td><b>Travel time:</b></td>" + "<td>" + humanReadabletime(routeObj.summary.travelTime) + "</td>"
                                     + "</tr>"
                                     + "<tr>"
                                     + "<td><b>Distance:</b></td>" + "<td>" + humanReadableDist(routeObj.summary.distance)  + "</td>"
                                     + "</tr>"
                                     + "<tr>"
                                     + "<td><b>Departure:</b></td>" + "<td>" + humanReadableDataTimeFormat(routeObj.summary.departure) + "</td>"
                                     + "</tr>"
                                     + "<tr>"
                                     + "<td><b>Arrival:</b></td>" + "<td>" + humanReadableDataTimeFormat(routeObj.summary.arrival) + "</td>"
                                     + (routeObj.cost ? ("</tr>" + "<td><b>Cost:</b></td>" + "<td>" +  humanReadableCost(routeObj.cost.totalCost)+ "</td>") : '')
                                     + "</table>"
         }
 
 
         var humanReadableDataTimeFormat = function (dateTimeString){
         if (dateTimeString == undefined) return '';
             var dateTimeArr = dateTimeString.split('T');
             var properDate = dateTimeArr[0].split("-").reverse().join('/');
             var timeZone = parseInt(dateTimeArr[1].split("+")[1]);
             var properTime = dateTimeArr[1].split('+')[0] + '(GMT' + (timeZone<0?'-':'+' + timeZone) + ')';
             return properDate + ' ' + properTime;
         };
 
         //Extract the waypoint coordinates out of the waypoint if the waypoint is like waypoint1=stopOver,300!50.9,8.7;opening:600
         function extractWayPointCoordinates(waypoint){
             if (waypoint){
                 if (waypoint.indexOf('!') !== -1){
                     waypoint = waypoint.substring(waypoint.indexOf('!')+1);
                 }
                 if (waypoint.indexOf(';') !== -1){
                     waypoint = waypoint.substring(0,waypoint.indexOf(';'));
                     //at this point we might have waypoint1=50.8,8.9 so replace the text and equal sign
                     if(waypoint.indexOf('=') !== -1 ){
                         waypoint = waypoint.substring(waypoint.indexOf('=')+1);
                     }
                 }
             }
             return waypoint;
         }
 
         var createTimeIcon = function (color, text, height) {
             var div = document.createElement("div");
             var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="56px" height="' + height + 'px">' +
                 '<line x1="28"  y1="' + height + '" x2="28" y2="' + (height - 7) + '" stroke="' + color + '"/>' +
                 '<text font-size="10" x="28" y="8" text-anchor="middle" fill="' + color + '">' +
                 text + '</text>' +
                 '</svg>';
             div.innerHTML = svg;
             return new H.map.Icon(svg, {anchor: {x : 28, y : height}});
         };
         
         // convert hex format to a rgb color
         function rgb2hex(rgb) {
             rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
             return (rgb && rgb.length === 4) ? "#" +
             ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
             ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
             ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
         }
         
         // changes the input mode
         function changeInputMode(expertMode) {
             clearPreviousResult();
             if(expertMode === true) {
                 document.getElementById('simple-mode-radio').checked=false;
                 document.getElementById('expert-mode-radio').checked=true;
                 document.getElementById('simple-mode-div').style.display = "none";
                 document.getElementById('expert-mode-div').style.display = "block";
                 expertModeEnabled = true;
                 parseWaypointsFromTextAndUpdateMap('completeUrl');
             } else {
                 document.getElementById('simple-mode-radio').checked=true;
                 document.getElementById('expert-mode-radio').checked=false;
                 document.getElementById('simple-mode-div').style.display = "block";
                 document.getElementById('expert-mode-div').style.display = "none";
                 expertModeEnabled = false;
                 parseWaypointsFromTextAndUpdateMap('destinations');
             }            
         }
 
         /*
             Publishes the route until route item x of routeLinks array
         */
         function redrawRoute(untilRouteItem) {
             if(untilRouteItem < 0 || untilRouteItem > routeLinks.length) {
                 // ignore
                 return false;
             }
             routeGroup.removeAll();
             for(var c = 0; c < untilRouteItem; c++) {
                 routeGroup.addObject(routeLinks[c]);
             }
             return true;
         }
 
         function drawPreviousLink() {
             var idx = parseInt(routeSlider.value) - 1;
             if(redrawRoute(idx)) {
                 routeSlider.value = idx;
             }
         }
 
         function drawNextLink() {
             var idx = parseInt(routeSlider.value) + 1;
             if(redrawRoute(idx)) {
                 routeSlider.value = idx;
             }
         }
 
         /**
             Shows and hides the example information text
         */
         function toggleExampleDescription() {
             var exampleDescriptionTxt = document.getElementById("ExampleInfoText");
             if (exampleDescriptionTxt.style.display == "none"){
                 showExampleDescription();
             } else {
                 hideExampleDescription();
             }
         }
         /**
             Hides the example description text
         */
         function hideExampleDescription() {
             var icon = document.getElementById("ExampleInfo");
             var exampleDescriptionTxt = document.getElementById("ExampleInfoText");
             exampleDescriptionTxt.style.display = "none";
             icon.classList.add("glyphicon-chevron-down");
             icon.classList.remove("glyphicon-chevron-up");
         }
         /**
             Shows the example description text    
         */
         function showExampleDescription() {
             var icon = document.getElementById("ExampleInfo");
             var exampleDescriptionTxt = document.getElementById("ExampleInfoText");
             exampleDescriptionTxt.style.display = "block";
             icon.classList.remove("glyphicon-chevron-down");
             icon.classList.add("glyphicon-chevron-up");
         }
 
         /**
             The function to return the appropriate overlay specifications for those pre-defined examples where it is first required to create the overlays. the id argument is the id of 
             the pre-defined example.
         */
         function getOverlaySpecification(id){
             if (id === "routeWithOverlaysWithPreferredLinks"){
                 return '[{"op":"restrict","shape":[[53.547416,9.997037],[53.547455,9.997646],[53.547506,9.998244],[53.547555,9.999262],[53.547573,9.999883],[53.547369,10.002239],[53.547382,10.004171],[53.547598,10.005475],[53.547761,10.006004]], "type":"preferred", "data":{"VEHICLE_TYPES":"145","PREFERRED_ROUTE_TYPE":"201","ENTRY_PENALTY":-10,"DRIVE_PENALTY":-0.2}}]';
             } else if (id === "routeWithOverlaysWithAvoidLinks"){
                 return '[{"op":"restrict","shape":[[51.50974,-0.08718],[51.5098,-0.08758],[51.50985,-0.0879],[51.5099,-0.08824],[51.51007,-0.08896],[51.51027,-0.08961],[51.51039,-0.09016],[51.51048,-0.09064],[51.51058,-0.09125],[51.51071,-0.09202],[51.51083,-0.09271]], "type":"preferred", "data":{"VEHICLE_TYPES":"145","PREFERRED_ROUTE_TYPE":"201","ENTRY_PENALTY":10,"DRIVE_PENALTY":1.6}}]';
             }
         }
 
         /**
             Function to upload an overlay
         */
         /*function uploadOverlaysAndCalculateRoute(overlaySpecification, additionalParams){
             Spinner.showSpinner();
             //extract the overlays name from the additional parameters
             feedbackTxt.innerHTML = "";
             var addParams = additionalParams.split('&');
             var overlaysName = "";
             for (var i=0; i<addParams.length; i++){
                 if(addParams[i].startsWith("overlays")){
                     overlaysName =  addParams[i].substring(addParams[i].indexOf("=")+1);
                     break;
                 }
             }
 
             if(!overlaysName){
                 Spinner.hideSpinner();
                 feedbackTxt.innerHTML = "<font color=\"red\"> Please provide overlays name </font>";
                 feedbackTxt.innerHTML += "<br/>";
                 return;
             }
 
             var endPoint = document.getElementById("endpoint").value;
             if (!endPoint){
                 Spinner.hideSpinner();
                 feedbackTxt.innerHTML = "<font color=\"red\"> Please provide endpoint url </font>";
                 feedbackTxt.innerHTML += "<br/>";
                 return;
             }
 
             //extract the port and host name from the endpoint to build the layer upload endpoint
             var anchor = document.createElement('a');
             anchor.setAttribute('href',endPoint);
             var host = anchor.protocol + '//' + anchor.hostname + (anchor.port ? ':'+anchor.port : '');
             var url = host + '/2/overlays/upload.json'+ '?app_id=' +  app_id + '&app_code=' + app_code + '\n&storage=readonly'+'&map_name='+overlaysName;
 
             anchor.remove(); //remove the newly created anchor as there is no need for it anymore
            
         //upload overlays
         $.ajax({
                 url: url,
                 dataType: "json",
                 async: true,
                 type: 'post',
                 data:{
                     overlay_spec : overlaySpecification
                 },
                 success: function(data) {
                     gotOverlayResponse(data, host, overlaysName);
                 },
                 error: function(xhr, status, e) {
                     Spinner.hideSpinner();
                     var errorResp = "unknown error occured";
                     if(xhr.responseJSON && xhr.responseJSON.issues != undefined && xhr.responseJSON.issues[0].message != undefined) {
                         errorResp = xhr.responseJSON.issues[0].message;
                     } else if(xhr.responseJSON && xhr.responseJSON.message) {
                         errorResp = xhr.responseJSON.message;
                     } else if(xhr.responseJSON && xhr.responseJSON.errors != undefined && xhr.responseJSON.errors[0].message != undefined){
                         errorResp = xhr.responseJSON.errors[0].message;
                     }
                     feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font>";
                     feedbackTxt.innerHTML += "<br/>";
                 }
             });
         }
 */
         var gotOverlayResponse = function (respJsonObj, host, overlaysName){
             feedbackTxt.innerHTML = "";
             if (respJsonObj.error != undefined) {
                 Spinner.hideSpinner();
                 alert (respJsonObj.error);
                 feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
                 return;
             }
             
             //check for the existance of the overlays
             pollUntilMapLayerIsListedInEnvironment(host, overlaysName, 7);
 
         }
 
         /**
             This method will call the list.json resource until the newly created overlays becomes visible
         */
        /* function pollUntilMapLayerIsListedInEnvironment(host, overlaysName, maxNoOfTries){
 
             var timeoutMillis = 4000;
             var found;
             var layerToCheck = "LINK_ATTRIBUTE_FC"; //we just check if this layer exist in the newly created overlays map, if it does then the overlays map has successfully been created
             feedbackTxt.innerHTML = "";
             if (maxNoOfTries <= 0){
                 Spinner.hideSpinner();
                 feedbackTxt.innerHTML = "<font color=\"red\">Couldn't find the uploaded overlays.</font>";
                 feedbackTxt.innerHTML += "<br/>";
                 return;
             }
 
             var layerListUrl = host + '/2/layers/list.json?app_id=' +  app_id + '&app_code=' + app_code + '\n&storage=readonly'+'&map_name='+overlaysName;
 
             setTimeout(function(){
                 $.ajax({ 
                     url: layerListUrl,
                     dataType: "json",
                     async: true,
                     type: 'get',
                     success: function(data){
                         var layers = data.layers;
                         for(var l=0; l<layers.length; l++){
                             if (layers[l].startsWith(layerToCheck)){
                                 found = true;
                                 break;
                             }
                         }
                         if (!found){ //layer not found yet so check it once again
                             pollUntilMapLayerIsListedInEnvironment(host, overlaysName, --maxNoOfTries);
                         }else{
                             Spinner.hideSpinner();
                             calculateRoute(); //overlay map has successfully been created therefore send the calculate route request
                         }
                 }, dataType: "json"});
             }, timeoutMillis);
 
 
         }*/
 
         /**********************************
                 Search Result methods
         ***********************************/
         // callback function for the isolineroute call
         function checkPoiPartOfRoute( resp ) {
                 
             if (resp.response.route[0].searchResult === undefined) {
                 return;
             }
             var geometryResponse = null;
         
             if (resp.response.route[0].searchResult.geometries != null) {
                 geometryResponse = resp.response.route[0].searchResult.geometries
                 console.log(geometryResponse.length + " Search results part of request.")
             } 
             var centroids = [];
             
             var routeLinkHashMap  = new Object(); // key = linkID (only positive value), value = shape of the link
             var linkResponse = resp.response.route[0].leg[0].link;
 
             //to highlight the junction link we need the shape of the links
             if (linkResponse){
                 for(var m=0; m<linkResponse.length; m++){
                     var absoluteRouteLinkId = Math.abs(linkResponse[m].linkId);
                     routeLinkHashMap[absoluteRouteLinkId] = linkResponse[m].shape;
                 }
             }
 
             for (var i = 0; i < geometryResponse.length; i++) {
                 var geom = parseWKT(geometryResponse[i].geometry);
                 var geometryObject  = geometryResponse[i];
                 
                 if(!geometryObject)
                 continue;
                     
                 centroids[i] = [];
                 switch ( geom.type ) {
                     case 'MultiPolygon':
                     for (var j = 0; j < geom.coordinates.length; j++) {
                         for (var k = 0; k < geom.coordinates[j].length; k++) {
                             centroids[i].push(addPolygonToGroup(geom.coordinates[j][k], boundingCircleIntersectsPolygonOptions));
                         }
                     }
                     break;
                     
                     case 'MultiPoint':
                     for (var j = 0; j < geom.coordinates.length; j++) {
                         centroids[i].push(addPointToGroup(geom.coordinates[j][0], boundingCircleIntersectsPolygonOptions, geometryObject, routeLinkHashMap));
                     }
                     break;
                     
                     case 'MultiLineString':
                     for (var j = 0; j < geom.coordinates.length; j++) {
                         centroids[i].push(addLineToGroup(geom.coordinates[j], boundingCircleIntersectsPolygonOptions));
                     }
                     break;
                     
                     case 'Polygon':
                     for (var k = 0; k < geom.coordinates.length; k++) {
                         centroids[i].push(addPolygonToGroup(geom.coordinates[k], boundingCircleIntersectsPolygonOptions));
                     }
                     break;
                     
                     case 'Point':
                     centroids[i].push(addPointToGroup(geom.coordinates, boundingCircleIntersectsPolygonOptions, geometryObject, routeLinkHashMap));
                     break;
                     
                     case 'LineString':
                     centroids[i].push(addLineToGroup(geom.coordinates, boundingCircleIntersectsPolygonOptions));
                     break;            
                     
                     default:
                     window.alert( "Cannot draw matching geometry for type " + geom.type );
                 }
             }   
         }
 
         function addPolygonToGroup(poly, options) {
             var polygonStrip = new H.geo.Strip();
             var borderStrips = [new H.geo.Strip()];
             for (var k = 0; k < poly.length - 1; k++) {
                 polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
                 borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
                 if (poly[k][2] === 'artificial') {
                     borderStrips.push(new H.geo.Strip());
                 }
             }
             // If the polygon was joining in non artificial points.
             if (k > 0 && !poly[k][2] && !poly[0][2]) {
             borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
             }
 
             var polygon = new H.map.Polygon(polygonStrip, options);
             searchResultGroup.addObject(polygon);
             for (var i = 0; i < borderStrips.length; i++) {
                 var borderStrip = borderStrips[i];
                 if (borderStrip.getPointCount() <= 1) continue;
                 searchResultGroup.addObject(new H.map.Polyline(borderStrip));
             }
             return calculateCentroid(polygonStrip);
         }
 
         /**
         * show and hide the junction info based on the bubble open
         * and close event
         */
         searchResultInfoBubble.addEventListener('statechange', function () {
             if (this.getState() === H.ui.InfoBubble.State.OPEN) {
             var junctionGroup = this.getData();
             if (junctionGroup && junctionGroup instanceof H.map.Group){
                 junctionGroup.setVisibility(true);
                 previousJunctionGroup = junctionGroup;
                 showFeedbackText("Selected POIs junction link is shown in red.", "Red");
             } 
             }
             if (this.getState() === H.ui.InfoBubble.State.CLOSED) {
             var junctionGroup = this.getData();
             if (junctionGroup && junctionGroup instanceof H.map.Group){
                 junctionGroup.setVisibility(false);
                 showFeedbackText("","Black");
             }
             }
         }); 
 
         function showFeedbackText(text,color){
             feedbackTxt.innerHTML = text;
             feedbackTxt.style.color = color;
         }
 
         function addPointToGroup(point, options, geometryObject, routeLinkHashMap) {
             var marker = new H.map.Marker(new H.geo.Point(point[1], point[0]));
             var junctionGroup;
 
             if(geometryObject.junctionLinkId && geometryObject.junctionLocation){
             junctionGroup = addJunctionToGroup(geometryObject.junctionLinkId, geometryObject.junctionLocation, routeLinkHashMap);
             }
 
             marker.addEventListener('tap', function (e) {
                 //since we have only one main object of bubble and if it is once opened, its state will remain open unitl the cross
                 //sign on the bubble is clicked and then its state will change to closed. But if a bubble is opned and then the user 
                 //clicks on another POI without closing the current bubble then stateChanged event will not be called because its 
                 //state is never changed and stays as opened, and then the previous junction group will remain open on the map. In order
                 //to avoid this from happening we maintain a variable wihch will hold the previously opened junction and it will be
                 //closed before the new junction corresponding to the clicked POI is shown.
                 if (previousJunctionGroup && searchResultInfoBubble.getState() === H.ui.InfoBubble.State.OPEN){ //close the previously opened junction
                 if (previousJunctionGroup instanceof H.map.Group){
                     previousJunctionGroup.setVisibility(false);
                     if (junctionGroup) {
                     junctionGroup.setVisibility(true);
                     showFeedbackText("Selected POIs junction link is shown in red.", "Red");
                     }
                     previousJunctionGroup=junctionGroup;
                 }
                 }
                 searchResultInfoBubble.setContent(getBubbleContent(geometryObject));
                 searchResultInfoBubble.setPosition(e.target.getPosition());
                 if(junctionGroup) searchResultInfoBubble.setData(junctionGroup);
                 searchResultInfoBubble.open();
             });
 
             searchResultGroup.addObject(marker);
 
             return [new H.geo.Point(point[1], point[0]), 0];     
         }
 
         function addJunctionToGroup(jLinkId, jLocation, routeLinkHashMap){
             var absJunctionLinkId = Math.abs(jLinkId);
             var junctionGroup;
             if(routeLinkHashMap){
                 var shape = routeLinkHashMap[absJunctionLinkId];
                 if (shape){
                     var jType = parseWKT(jLocation);
                     if (jType.type === 'Point'){
 
                     //create the junction location on the map
                     var junctionPoint = new H.geo.Point(jType.coordinates[1], jType.coordinates[0]);
                     var junctionMarker = new H.map.Marker(
                     junctionPoint,
                     {
                         icon: createIconMarkerJV("Junction", jvColor)
                     });
                     var polyLineCoordinates = new H.geo.Strip();  
                     //highlight the junction link
                     for (var n=0; n<shape.length; n+=2){
                         polyLineCoordinates.pushLatLngAlt(parseFloat(shape[n]), parseFloat(shape[n + 1]), null);
                     }  
 
                     var polyLine = new H.map.Polyline(polyLineCoordinates, {zIndex: 3, style: {lineWidth: 8, strokeColor: "rgba(255, 0, 0, 0.8)", lineJoin: "round"}});
                     junctionGroup = new H.map.Group();
 
                     //add the junction location marker into the group
                     junctionGroup.addObject(junctionMarker);
 
                     //add the junction link into the group
                     junctionGroup.addObject(polyLine);
                     junctionGroup.setVisibility(false);
                     map.addObject(junctionGroup);
                     }
                 }
                 return junctionGroup;
             }
         }
 
         function addLineToGroup(line, options) {
             var lineStrip = new H.geo.Strip();
             for (var k = 0; k < line.length; k++) {
                 lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
             }
             searchResultGroup.addObject(new H.map.Polyline(lineStrip));   
             return calculateCentroid(lineStrip);   
         }
 
         function getBubbleContent(geometryObject){
             var content = ('<h5>{POIAttributes}</h5><div class="attributes-body"><table class="isoline-record">' +
                             '{attributes}' +
                             '</table></div>');
             var timeAndDistanceContent = ('<h5>Detour from the main route</h5><table class="isoline-record">'+
                                             '{timeAndDistanceInfo}' +
                                             '</table>');
             var actualContent = '';
             var timeAndDistInfo = '';
             if(geometryObject){
                 var attributes = geometryObject.attributes;
                 if(attributes){
                 for (var key in attributes){
                     if(attributes.hasOwnProperty(key)){
                     actualContent+='<tr><td>'+key+'</td><td>'+attributes[key]+'</td></tr>';
                     }
                 }
                 }else{
                 actualContent+='<tr><td>Attributes</td><td>Not Available</td></tr>';
                 }
 
                 if (geometryObject.timeToReach){
                     timeAndDistInfo+='<tr><td>timeToReach</td><td>'+geometryObject.timeToReach+' sec</td></tr>';
                 }
 
                 if (geometryObject.distanceToReach){
                     timeAndDistInfo+='<tr><td>distanceToReach</td><td>'+geometryObject.distanceToReach+ (geometryObject.distanceToReach > 1 ? ' meters' : ' meter') +'</td></tr>';
                 }
 
             }
 
             if(timeAndDistInfo){
                 content+=timeAndDistanceContent.replace('{timeAndDistanceInfo}', timeAndDistInfo);
             }
 
             content = content.replace('{POIAttributes}','Layer attributes for the selected POI');
 
             return content.replace('{attributes}', actualContent);
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
 
         var boundingCircleIntersectsPolygonOptions = {
             style: {
                 fillColor: 'rgba(230, 200, 0, 0.3)',
                 lineWidth: 0
             }
         };