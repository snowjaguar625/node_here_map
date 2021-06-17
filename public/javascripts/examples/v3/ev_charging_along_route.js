/**
         * @author Platform for Business Group
         * (C) HERE 2017
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
             document.getElementById('endpointUrl').value = document.getElementById('endpointUrl').value.replace("https://fleet.api.here.com" , host);
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
         var currentBubble;
 
         var platform = new H.service.Platform({ app_code: app_code, app_id: app_id, useHTTPS: secure }),
             maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
             router = platform.getRoutingService(),
             labels = new H.map.Group(),
             groups = [],
             activeGroup = null,
             activeConnections = null,
             activeLabels = null,
             basemaptileService = platform.getMapTileService({ 'type': 'base' });
         
         map = new H.Map(mapContainer,  maptypes.terrain.map, { center: center, zoom: zoom });
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
         ui.removeControl('panorama');
         window.addEventListener('resize', function() {
             map.getViewPort().resize();
         });
 
         var routeLinkHashMap = new Object(); // key = linkID, value = link object
 
         // display groups
         var routeGroup = new H.map.Group();
         map.addObject(routeGroup);
         var routeLinks = [];
         var warningsGroup = new H.map.Group();
         map.addObject(warningsGroup);
         var plannedWaypointsGroup = new H.map.Group();
         var evChargingStationGroup = new H.map.Group();
         plannedWaypointsGroup.setZIndex(1);
         map.addObject(plannedWaypointsGroup);
         var usedWaypointsGroup = new H.map.Group();
         usedWaypointsGroup.setZIndex(2);
         map.addObject(usedWaypointsGroup);
         var spaceGroup = new H.map.Group();
         map.addObject(spaceGroup);
         map.addObject(evChargingStationGroup);
 
         // route display
         var routeStroke = 8;
         var routeColor = ["rgba(18, 65, 145, 0.8)", "rgba(0, 145, 255, 0.7)", "rgba(127, 201, 255, 0.6)"];
         var server_rr = 0; // for truck overlay tile load URLs
       
         
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
         
         var circle = new mapsjs.map.Icon(createCanvasCircle('grey', 'grey', 1, 2));
         var circleB = new mapsjs.map.Icon(createCanvasCircle('orange', 'orange', 1, 1));
 
         /*****************************************
             Example configuration
         *****************************************/
         function RouteSample(label, exampleDescriptionText, waypointsParameters, consumptionDetails, energyDetails, chargingCurve, connectorType, additionalParams, customLayer) {
             this.label = label;
             this.waypointsParameters = waypointsParameters;
             this.additionalParams = additionalParams;
             this.exampleDescriptionText = exampleDescriptionText;
             this.consumptionDetails = consumptionDetails;
             this.energyDetails = energyDetails;
             this.connectorType = connectorType;
             this.chargingCurve = chargingCurve;
             this.customLayer = customLayer;
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
             this.hasExampleDescriptionText = function() {
                 return this.exampleDescriptionText !== undefined && this.exampleDescriptionText !== null && this.exampleDescriptionText !== "";
             };
             this.getExampleDescriptionText = function(){
                 return this.exampleDescriptionText;
             };           
             this.hasConsumptionDetails = function(){
                 return this.consumptionDetails!==undefined && this.consumptionDetails!==null && this.consumptionDetails!=="";
             };
             this.getConsumptionDetails = function(){
                 return this.consumptionDetails===undefined ? "" : this.consumptionDetails;
             };
             this.hasEnergyDetails = function(){
                 return this.energyDetails!==undefined && this.energyDetails!==null && this.energyDetails!=="";
             };
             this.getEnergyDetails = function(){
                 return this.energyDetails===undefined ? "" : this.energyDetails;
             };
             this.hasCustomLayer = function(){
                 return this.customLayer !==undefined && this.customLayer!==null && this.customLayer!=="";
             };
             this.getCustomLayer = function(){
                 return this.customLayer===undefined ? "" : this.customLayer;
             };
             this.hasConnectorType = function(){
                 return this.connectorType!==undefined && this.connectorType!==null && this.connectorType!=="";
             };
             this.getConnectorType = function(){
                 return this.connectorType===undefined ? "" : this.connectorType;
             };
             this.hasChargingCurve = function(){
                 return this.chargingCurve!==undefined && this.chargingCurve!==null && this.chargingCurve!=="";
             };
             this.getChargingCurve = function(){
                 return this.chargingCurve===undefined ? "" : this.chargingCurve;
             };
         }
         var chargingStopOverWaypoints = {}; //holds all the waypoints which were mapped to the charging station poi, key=latlon; value=waypoint sequence number
 
         var samplesObj = {
             "blank": new RouteSample("Please select an example"),
             "routingRechargeStopOvers": new RouteSample(
                 "Route between two waypoints", 
                 "Sample routing between two waypoints. Based on the energy and consumption details, the router adds two charging stops.",
                 "&waypoint0=48.769606,9.174678\n&waypoint1=51.536344,9.923906",
                 "speed,0,0.102,10,0.084,30,0.066,50,0.06,70,0.066,100,0.072,120,0.084,140,0.108;ascent,0.4;descent,0.1",
                 "energyDetails,15,33,7,27",
                 "0,45,20,48,23,50,27,40,28,27,30,15,32,5,33,1",
                 "",
                 "",
                 ""),
             "stopOverMultiWps": new RouteSample(
                 "Route between multiple waypoints",
                 "Sample routing between multiple waypoints. Based on the energy and consumption details, the router adds couple charging stops.",
                 "&waypoint0=41.399291,2.170606\n&waypoint1=43.300187,5.374409\n&waypoint2=45.071236,7.666632\n&waypoint3=48.133126,11.566872",
                 "speed,0,0.204,10,0.168,30,0.132,50,0.12,70,0.132,100,0.144,120,0.168,140,0.216;ascent,0.8;descent,0.2",
                 "energyDetails,50,75,10,60",
                 "7.5,140,15,145,22.5,148,30,150,38,112,45,88,52.5,56,60,38,68,10,75,10",
                 "", 
                 "",
                 ""),
             "routingRechargeStopOverSingleConnectorType": new RouteSample(
                 "Routing with single connector type", 
                 "Sample routing between two waypoints. Charging stops on the route are selected based on the given connector type.",
                 "&waypoint0=48.769606,9.174678\n&waypoint1=51.963414,7.619480",
                 "speed,0,0.204,10,0.168,30,0.132,50,0.12,70,0.132,100,0.144,120,0.168,140,0.216;ascent,0.8;descent,0.2",
                 "energyDetails,70,75,15,60",
                 "7.5,140,15,145,22.5,148,30,150,38,112,45,88,52.5,56,60,38,68,10,75,10",
                 "Tesla Connector (high power wall)",
                 "",
                 ""),
             "routingRechargeStopOverMultipleConnectorTypes": new RouteSample(
                 "Routing with multiple connector types", 
                 "Sample routing between two waypoints. Charging stops on the route are selected based on two different connector types.",
                 "&waypoint0=48.127773,11.604879\n&waypoint1=50.112291,8.684861",
                 "speed,0,0.204,10,0.168,30,0.132,50,0.12,70,0.132,100,0.144,120,0.168,140,0.216;ascent,0.8;descent,0.2",
                 "energyDetails,33,33,8,27",
                 "0,45,20,48,23,50,27,40,28,27,30,15,32,5,33,1",
                 "Tesla Connector (high power wall),IEC 62196-2 type 2 combo (Mennekes)",
                 "",
                 ""),
             "routeFailsChargingStationGaps": new RouteSample(
                 "Show route even though the vehicle cannot reach destination", 
                 "With the given energy details, the destination cannot be reached. Changing parameter &makeReachable=false to true can be used to still return a route. Removing it and the route calculation returns an error.",
                 "&waypoint0=61.165570,-149.915014\n&waypoint1=64.817744,-147.871093",
                 "speed,0,0.102,10,0.084,30,0.066,50,0.06,70,0.066,100,0.072,120,0.084,140,0.108;ascent,0.4;descent,0.1",
                 "energyDetails,4.1,20,4,16",
                 "0,6.67,20,0", 
                 "",
                 "&makeReachable=false",
                 ""),
             "routingWithCustomLayer"    : new RouteSample(
                 "Routing with custom layer", 
                 "Layer with custom set of charging POIs is uploaded. This layer is then used for routing.",
                 "&waypoint0=48.769606,9.174678&waypoint1=50.547213,8.784016",
                 "speed,0,0.102,10,0.084,30,0.066,50,0.06,70,0.066,100,0.072,120,0.084,140,0.108;ascent,0.4;descent,0.1",
                 "energyDetails,15,20,4,16", 
                 "0,133,20,0",
                 "",
                 "",
                 "CustomEVChargingPois"),
                 
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
             'routingRechargeStopOvers' : new Simulation([samplesObj['routingRechargeStopOvers']]),
             'stopOverMultiWps': new Simulation([samplesObj['stopOverMultiWps']]),
             'routingRechargeStopOverSingleConnectorType' : new Simulation([samplesObj['routingRechargeStopOverSingleConnectorType']]),
             'routingRechargeStopOverMultipleConnectorTypes' : new Simulation([samplesObj['routingRechargeStopOverMultipleConnectorTypes']]),
             'routeFailsChargingStationGaps' : new Simulation([samplesObj['routeFailsChargingStationGaps']]),
             'routingWithCustomLayer'        : new Simulation([samplesObj['routingWithCustomLayer']]),
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
             if (me.selectedOptions[0].id === 'blank')
                 return;
             destinationsTextArea.value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getWaypointsParameters();
             // set the example text
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasExampleDescriptionText()) {
                 var txtElem = document.getElementById("ExampleInfoText");
                 txtElem.innerHTML = "<small>" + simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getExampleDescriptionText() + "</small>";
                 showExampleDescription();
             }else{
                 var txtElem = document.getElementById("ExampleInfoText");
                 txtElem.innerHTML = "";
                 hideExampleDescription();
             }
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasAdditionalParams()){
                 document.getElementById('addtlparams').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getAdditionalParams();
             }else{
                 document.getElementById("addtlparams").value = ""; // default is no additional parameters
             }
             // set example specific settings
             setExampleSpecificValuesInGui(me.selectedOptions[0].id);
             
             //display custom consumption details if there is any
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasConsumptionDetails()){
                 document.getElementById('customConsumptionDetails').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getConsumptionDetails();
             }
             //display energy details if there is any
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasEnergyDetails()){
                 displayEnergyDetails(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getEnergyDetails());
             } else {
                 displayEnergyDetails(null);
             }
             //display charging curve details if there is any
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasChargingCurve()){
                 displayChargingCurveDetails(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getChargingCurve());
             } else {
                 displayChargingCurveDetails(null);
             }
             //display connectorType if there is any
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasConnectorType()){
                 document.getElementById('connectorType').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getConnectorType();
                 }else{
                 document.getElementById('connectorType').value = '';
                 }
             //display custom layer upload option if there is any
             if(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].hasCustomLayer()){
                 uploadSampleFile(simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getCustomLayer());
                 if (document.getElementById('evPoiLayerName').value == '') document.getElementById('evPoiLayerName').value = simulationsObj[me.selectedOptions[0].id].getRoutes()[0].getCustomLayer();
             } else {
                 document.getElementById('evPoiLayerName').value = '';
             }
             parseWaypointsFromTextAndUpdateMap("destinations");
             calculateRoute();
         }
 
         function displayChargingCurveDetails(chargingCurveDetails){
             if(chargingCurveDetails !== undefined && chargingCurveDetails !== null){
                 document.getElementById('chargingCurve').value = chargingCurveDetails;
             }else{
                 document.getElementById('chargingCurve').value = '';
             }
         }
 
            //uploading poi layer in the background to be used while routing.  
         var sampleLayerUploading = function(layerId){		
             var formData = new FormData();
             var wktFile = new Blob([wktFileExample], { type: 'plain/text' });
             formData.append('file', wktFile,'CustomEVChargingPois2.wkt');
             var params = "&layer_id=" + layerId;
             var restCaller = new RestAPICaller("CLE", "upload");
             restCaller.callService(formData, params, function(data){
               console.log("Layer uploaded successfully!");                             
               });
         }
 
         var uploadSampleFile = function (layerId) {
             var req = new XMLHttpRequest(layerId);
             req.open('GET', '/sample_data/ev_charging/CustomEVChargingPois2.wkt');
             req.onreadystatechange = function() {
                 if (req.readyState != XMLHttpRequest.DONE) return;
                 wktFileExample = req.responseText;
                 sampleLayerUploading(layerId); 
             };
             req.send();
         }
 
         /**
         *   A function to display the energy/battery details into the corresponding text boxes
         */
         function displayEnergyDetails(energyDetails){
 
             if(energyDetails !== undefined && energyDetails !== null){
                 var chargingDetails; 
                 if(energyDetails.startsWith("energyDetails,")){
                      chargingDetails =  energyDetails.substring(energyDetails.indexOf(",")+1);
                 }else{
                     chargingDetails = energyDetails;
                 }
 
                 var energyValues = chargingDetails.split(",");
                 if (energyValues.length < 2){
                     alert("Please give the value for mandatory fields: Initial Charge, Maximum Charge");
                     return;
                 }
 
                 document.getElementById('initialCharge').value = energyValues[0];
                 document.getElementById('maxCharge').value = energyValues[1];
                 
                 if (energyValues.length >= 3) {
                     document.getElementById('minChargeAtStop').value = energyValues[2];
                 } else {
                     document.getElementById('minChargeAtStop').value = '';
             }
                 if (energyValues.length >= 4) {
                     document.getElementById('chargingStopDepartureCharge').value = energyValues[3];
                 } else {
                     document.getElementById('chargingStopDepartureCharge').value = '';
                 }
             } else {
                 document.getElementById('initialCharge').value = '';
                 document.getElementById('maxCharge').value = '';
                 document.getElementById('minChargeAtStop').value = '';
                 document.getElementById('chargingStopDepartureCharge').value = '';
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
             this.waypointType = null;
 
             /**
             *   Return a waypoint text. Eg. waypoint0=geo!50,8...
             */
             this.getWaypointParameterText = function() {
                 return "&waypoint" + idx + "=" + ((prefix)?prefix:"") + parseFloat(this.lat).toFixed(6) + "," + parseFloat(this.lng).toFixed(6) + ((this.bonusDef != 'none' && this.bonusDef != undefined && this.bonusDef != "") ? (";" + this.bonusDef) : "");
             };
 
         }
         /**
         * function to validate the input in the text box
         */
         
         function validateInput(textbox){
             var enteredValue = textbox.value;
             var textboxId    = textbox.id;
             if(textboxId === "initialCharge" || textboxId === "maxCharge" || textboxId === "minChargeAtStop" || textboxId === "chargingStopDepartureCharge"){
                 if(isNaN(enteredValue)){
                     alert("Please enter only numbers")
                 }
             }
         }
 
         /**
             Clears any previous result on switch between simple/expert mode and on new example selection
         */
         function clearPreviousResult() {
             feedbackTxt.innerHTML = '';
            // routeSliderDiv.style.display="none";
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
             spaceGroup.removeAll();
             warningsGroup.removeAll();
             evChargingStationGroup.removeAll();
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
                             waypointArr.push(new Waypoints(wayPointIdx, coord[0], coord[1], options, prefix, ));
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
 
         /**
         This method checks the user selected example and adapts setting values in the GUI
         */
         function setExampleSpecificValuesInGui(id) {
             // set default starting date
                 setDepartureNow();
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
                     iconColor = waypointsArr[wpIdx].waypointType != null && waypointsArr[wpIdx].waypointType === "chargingStopOver" ?  "#800000" : "#299E7C"; //#5e5d5d
                 }
                 var marker = new H.map.Marker(waypointsArr[wpIdx], { icon: new H.map.Icon(createWaypointIcon(number, iconColor)) });
                 markersGroup.addObject(marker);
             }
         }
 
         /*
             Updates the map display view bounds
         */
         function updateMapViewBounds() {
             // update view getBounds
             var newViewBounds = null;
             var pwgb = plannedWaypointsGroup.getBounds();
             var uwgb = usedWaypointsGroup.getBounds();
             var rgb = routeGroup.getBounds();
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
                 map.setViewBounds(newViewBounds);
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
 
         /*
             Show and hides the warnings along the route
         */
         function warningsSelect() {
             if (document.getElementById("showWarnings").checked) map.addObject   (warningsGroup);
             else                                       try { map.removeObject(warningsGroup); } catch (exc) {console.log("Failed to remove warning group: " + exc)}
         }
 
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
                 return "";
             } 
         }
 
         function checkMandatoryValues(){
 
             if (!document.getElementById("customConsumptionDetails").value){
                 alert('Please provide value for the consumption details!');
                 return false;
             }
 
             if ((!document.getElementById("initialCharge").value) || (!document.getElementById("maxCharge").value) || (!document.getElementById("chargingCurve").value)){
                 alert('Please provide values for Initial Charge, Maximum Charge and Charging Curve!')
                 return false;
             }
 
             return true;
         }
 
         /**
         *	Calculate route
         */
         function calculateRoute() {
             if(!document.getElementById('destinations').value) { //no waypoints are given, especially in the case when nothing is chosen from the pre-defined example
                 feedbackTxt.innerHTML = "<font color=\"red\">No waypoints given</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     Spinner.hideSpinner();
                     return;
             }
             if(!checkMandatoryValues()){
                 return; // mandatory values are missing
             }
             Spinner.showSpinner();
             var url;
             parseWaypointsFromTextAndUpdateMap("destinations");
             var addtlparams = document.getElementById('addtlparams').value.trim();
             addtlparams = eraseCharSurr(addtlparams, '&');
             url = document.getElementById("endpointUrl").value + '/2/calculateroute.json?';
             url += eraseCharSurr( [addtlparams, getDestinationParamArr().join("")].join("&"), "&" );
             var traffic     = document.getElementById('traffic'    ).value;
             url += "&mode=fastest;car;traffic:" + traffic;
             var departure = document.getElementById("departure").value; //departure/arrival does not work with the energy optimized routing, it stays as commented unless it gets fixed in the service
             if (departure != "") url += "&departure=" + departure;
 
             //consumption and energy details
             var customConsumptionDetails = document.getElementById("customConsumptionDetails").value;
              
             var energyDetails = "initialCharge:"+document.getElementById("initialCharge").value + ";" + "maxCharge:"+document.getElementById("maxCharge").value +
             (document.getElementById("minChargeAtStop").value ? ";minChargeAtStop:" + document.getElementById("minChargeAtStop").value : "") + 
             (document.getElementById("chargingStopDepartureCharge").value ? ";chargingStopDepartureCharge:" + document.getElementById("chargingStopDepartureCharge").value : "") +  
             ";chargingCurve:" + document.getElementById("chargingCurve").value
             
             if (customConsumptionDetails && energyDetails){
                 url = url + "&customConsumptionDetails="+customConsumptionDetails+"&batteryParameters="+energyDetails;
             }
 
             var connectorType = document.getElementById("connectorType").value;
             if(connectorType) url = url + "&chargingStationFilters=plugType:"+connectorType;
             
             var evPoiLayer = document.getElementById("evPoiLayerName").value;
             if(evPoiLayer) url = url + "&evPoiLayer="+evPoiLayer;
 
             if( url.indexOf("&app_id") == -1 && url.indexOf("&app_code") == -1) url += '&app_id=' + app_id + '&app_code=' + app_code;
             $.ajax({
                 url: url,
                 dataType: "json",
                 async: true,
                 type: 'get',
                 success: function(data) {
                     parseRoutingResponse(data);
                     Spinner.hideSpinner();
                     map.getViewPort().resize();
                 },
                 error: function(xhr, status, e) {
                     var errorObj = "";
                     if(xhr.responseJSON && xhr.responseJSON.issues) {
                         errorObj = xhr.responseJSON.issues;
                     } else if(xhr.responseJSON && xhr.responseJSON.errors){
                         errorObj = xhr.responseJSON.errors;
                     }
                     var errorResp = (errorObj[0] || {
                         "message": "unknown error occured"
                     });
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
                             spaceGroup.addObject(m);
                         }
                     }
                     feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     Spinner.hideSpinner();
                     map.getViewPort().resize();
                 }
             });
         }
 
         /**
         *  Parse the routing response
         */
         function parseRoutingResponse(resp) {
             routeGroup.removeAll();
             warningsGroup.removeAll();
             evChargingStationGroup.removeAll();
 
             var zIndex = 1;
             routeLinkHashMap = new Object();
             var remainingTimeAtStartOfRoute = 0;
             var shapePointOfLinksAlongRoute = []; //holds the first shape point of each link along the whole route, will be used to construct the corridor for the corridor search request
             chargingStopOverWaypoints = {};
             
             /**
             *   draw the route
             */
             displaySummary(resp.response.route[0]);
             
             // create link objects
             var previousTime = "";
             for (var r = 0; r < resp.response.route.length; r++) {
                        
                 var routeColor = "rgba(0, 140, 255, 1)"; // ("rgba("+(Math.floor((Math.random() * 255) + 1)) + ","+ (Math.floor((Math.random() * 255) + 1)) +","+ (Math.floor((Math.random() * 255) + 1)) +","+ 1 + ")");
                 for(var k = 0; k<resp.response.route[r].leg.length; k++){
                     
                     for (var m = 0; m < resp.response.route[r].leg[k].link.length; m++) {
                         // only add new link if it does not exist so far - so alternatives are not drawn multiple times
                         var linkId = (resp.response.route[r].leg[k].link[m].linkId.lastIndexOf("+", 0) === 0 ? resp.response.route[r].leg[k].link[m].linkId.substring(1) : resp.response.route[r].leg[k].link[m].linkId);
                         if (routeLinkHashMap[linkId] == null) {
                             var strip = new H.geo.Strip();
                             var shape = resp.response.route[r].leg[k].link[m].shape;
                             var l = shape.length;
                             for (var i = 0; i < l; i += 2) {
                                 var shapeLat = shape[i];
                                 var shapeLng = shape[i + 1];
                                 strip.pushLatLngAlt(shapeLat, shapeLng, 0);
                                 if (i === 0) shapePointOfLinksAlongRoute.push(shapeLat+","+shapeLng);
                             }
                             var routeStyle = {
                                 style: {
                                         lineWidth: (routeStroke - (2)), // alternatives get smaller line with
                                         strokeColor: routeColor,
                                         lineCap: 'butt'
                                     }
                                 };
                             var link = new H.map.Polyline(strip, routeStyle);
                             link.setArrows(true);
                             link.$routeStyle = routeStyle;
                             if(m === 0){
                                 remainingTimeAtStartOfRoute = resp.response.route[r].leg[k].link[m].remainTime;
                             }
 
                             link.$linkId = resp.response.route[r].leg[k].link[m].linkId;
                             link.$routeNum = r;
                             link.$ETA = resp.response.route[r].summary.travelTime;
                             //The router can send back links ids with "-" or "+" prefix: only "-" prefix is kept and stored in this HashMap, the "+" is removed
                             routeLinkHashMap[linkId] = link;
                             // add event listener to link
                             link.addEventListener('tap', createTapLinkHandler(link));
                             link.addEventListener('pointerenter', createPointerEnterLinkHandler(link));
                             link.addEventListener('pointerleave', createPointerLeaveLinkHandler(link));
                             routeLinks.push(link);
                         }
                     }
                 }
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
                     spaceGroup.addObject(m);
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
                         var marker = new H.map.Marker(point, { icon: createWarningIconMarker('StopOver', 'StopOver Delay for '+ humanReadabletime(stopOverDuration), 'StopOver') });
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
                     if (warningMsg && warningMsg.indexOf('Suspicious u-turn') == -1){ // ignore warning of suspicious u-turn
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
                                             var marker = new H.map.Marker(point, { icon: warningObj.getIcon() });
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
                             var showWp = true;               
                             var seqNrOnRoute = resp.response.route[r].waypoint[w].seqNrOnRoute;
                             var waypointType = resp.response.route[r].waypoint[w].waypointType;
                             if(seqNrOnRoute > -1) { // -1 means it was a optional waypoint - but was is not used by the route as its too expensive
                                 var lat = resp.response.route[r].waypoint[w].mappedPosition.latitude;
                                 var lon = resp.response.route[r].waypoint[w].mappedPosition.longitude;
                                 var wp = new Waypoints(seqNrOnRoute, lat, lon);
                                 wp.seqNrOnRoute = seqNrOnRoute;
                                 if(waypointType) {
                                     wp.waypointType = waypointType;
                                     if(waypointType === "chargingStopOver"){
                                         // in case of chargingStopOver waypoint - just remember the location. A special charging station icon will be shown from the PDE corridor response
                                         showWp = false;
                                         var poiOriginalLat = resp.response.route[r].waypoint[w].originalPosition.latitude;
                                         var poiOriginalLon = resp.response.route[r].waypoint[w].originalPosition.longitude;
                                         chargingStopOverWaypoints[poiOriginalLat+""+poiOriginalLon] = w;
                                         var legIndex = seqNrOnRoute == 0 ? 0 : seqNrOnRoute - 1;
                                         if (resp.response.route[r].waypoint[w].rechargeTimeAtWayPoint){
                                             var point = new H.geo.Point(poiOriginalLat + 0.00002, poiOriginalLon+ 0.00002);
                                             var warningTxt;
                                             if(resp.response.route[r].waypoint[w].energyAfterChargingAtWayPoint)
                                                 warningTxt = 'from ' + resp.response.route[r].waypoint[w].remainingEnergyAtWayPoint + ' kWh ' +
                                                              'to '   + resp.response.route[r].waypoint[w].energyAfterChargingAtWayPoint + ' kWh ' +
                                                              'for '  + humanReadabletime(resp.response.route[r].waypoint[w].rechargeTimeAtWayPoint);
                                             else
                                                 warningTxt = 'for ' + humanReadabletime(resp.response.route[r].waypoint[w].rechargeTimeAtWayPoint) +
                                                              ', remaining energy: ' +  resp.response.route[r].waypoint[w].remainingEnergyAtWayPoint + ' kWh';
                                             var marker = new H.map.Marker(point, { icon: createWarningIconMarker('Charging', warningTxt, 'Default') });
                                             warningsGroup.addObject(marker);
                                         }
                                         if (resp.response.route[r].leg[legIndex].stayingTime){
                                             var point = new H.geo.Point(poiOriginalLat + 0.00002, poiOriginalLon+ 0.00002);
                                             var warningTxt;
                                             if(resp.response.route[r].leg[legIndex].targetBatteryCharge)
                                                 warningTxt = 'from ' + resp.response.route[r].leg[legIndex].arrivalBatteryCharge + ' kWh ' +
                                                              'to '   + resp.response.route[r].leg[legIndex].targetBatteryCharge + ' kWh ' +
                                                              'for '  + humanReadabletime(resp.response.route[r].leg[legIndex].stayingTime);
                                             else
                                                 warningTxt = 'for ' + humanReadabletime(resp.response.route[r].leg[legIndex].stayingTime) +
                                                              ', remaining energy: ' +  resp.response.route[r].leg[legIndex].arrivalBatteryCharge + ' kWh';
                                             var marker = new H.map.Marker(point, { icon: createWarningIconMarker('Charging', warningTxt, 'Default') });
                                             warningsGroup.addObject(marker);
                                         }
                                     }
                                 }
                                 if(showWp) {
                                 plannedWaypointsArr.push(wp);
                             }
                         }
                         }
                         createMarkersForWaypoints(plannedWaypointsArr, usedWaypointsGroup);
                     }
                 }
             }
 
             updateMapViewBounds();
             redrawRoute(routeLinks.length);
 
             //call PDE corridor search to get all the EV charging pois along the whole route
             var evChargingStationLayer = "EVCHARGING_POI"; //Default
             var callCle = document.getElementById("evPoiLayerName").value ? true : false;
             if (callCle) evChargingStationLayer = document.getElementById("evPoiLayerName").value;
 
             doCorridorSearch(shapePointOfLinksAlongRoute,evChargingStationLayer,callCle);
         }
 
         /**
         *	Perform PDE corridor search
         */
         function doCorridorSearch(corridorPoints,layerId,callCle) {
             Spinner.showSpinner();
             var version = callCle ? "2" : "1";
             var url = document.getElementById("endpointUrl").value + "/" + version + "/search/corridor.json";
             url += "?layer_ids=" + layerId; 
             url += "&corridor=" + corridorPoints.join(";");
             url += "&radius=1600" , // corridor search allows max radius of 2km and also has another restriction that max of 1000 search results (POIs) can be returned so it is not advisable to use max of 2km here
             url += "&key_attributes=" + (callCle ? "GEOMETRY_ID" : "POI_ID"); //POI_ID might not exist in a Custom CLE layer;
             url += document.getElementById("addtlparams").value; // mainly to catch custom app_id/app_code, the other parameters won't apply to a corridor search
             if( url.indexOf("&app_id") == -1 && url.indexOf("&app_code") == -1) url += '&app_id=' + app_id + '&app_code=' + app_code; // default app_id
             $.ajax({
                 url: url,
                 dataType: "json",
                 async: true,
                 type: 'get',
                 success: function(data) {
                     parseCorridorResponse(data);
                     Spinner.hideSpinner();
                     //map.getViewPort().resize();
                 },
                 error: function(xhr, status, e) {
                     var errorObj = "";
                     if(xhr.responseJSON && xhr.responseJSON.issues) {
                         errorObj = xhr.responseJSON.issues;
                     } else if(xhr.responseJSON && xhr.responseJSON.errors){
                         errorObj = xhr.responseJSON.errors;
                     }
                     var errorResp = (errorObj[0] || {
                         "message": "unknown error occured while getting Charging POIs along the route"
                     });
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
                     feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font>";
                     feedbackTxt.innerHTML += "<br/>";
                     Spinner.hideSpinner();
                     //map.getViewPort().resize();
                 }
             });
         }
 
         function parseCorridorResponse(resp){
             
             evChargingStationGroup.removeAll();
             currentBubble = "";
             
            
             var geometries = resp.geometries;
             var markerScale = 1.0;
             var fillColor;
             var guiSelectedConnectorTypes = document.getElementById('connectorType').value ;
             var guiSelectedConnectorType = guiSelectedConnectorTypes.split(',', -1);
             for(var g=0; g<geometries.length; g++){
                 var waypointNumber = null;
                 var zIndex = 0;
                 var html = "";
                 var privateAccess = "";
                 var displayChargingStation = false;
                 var geometryLat = geometries[g].nearestLat;
                 var geometryLon = geometries[g].nearestLon;
                 if(geometryLat && geometryLon){
           
                    if(geometries[g].attributes.CONNECTORTYPE != null){
                        var availableConnectorTypes = geometries[g].attributes.CONNECTORTYPE.split("|", -1); //Connector types are separated by pipe character
                        html = "<h6>Connector Types:<br />";
                        for (var c=0; c<availableConnectorTypes.length; c++){
                             // check if available connectior is part of selected connector lists. If not we do not add it to the map
                             if(guiSelectedConnectorTypes !== null && guiSelectedConnectorTypes.length > 0 ) {
                                 for(var i = 0; i < guiSelectedConnectorType.length; i++) {
                                     if( availableConnectorTypes[c].indexOf(guiSelectedConnectorType[i]) != -1) {
                                         displayChargingStation = true;
                                     }
                                 }
                             } else {
                                 // default - show
                                 displayChargingStation = true;
                             }
                            if (c > 0) html += "<hr />";
                            html +=  availableConnectorTypes[c];
                        }
                        html += "</h6>";
                    }
 
                    if(geometries[g].attributes.PRIVATE_ACCESS != null){
                         privateAccess = geometries[g].attributes.PRIVATE_ACCESS;
                         if (privateAccess){
                             html += "<hr>"
                             html += "<h6> Private Access: " + privateAccess + "</h6>"
                         }
                    }
 
                     if(displayChargingStation) {
                         var point = new H.geo.Point(parseFloat(geometryLat), parseFloat(geometryLon));
                         if (chargingStopOverWaypoints[geometryLat+""+geometryLon]){
                                 waypointNumber = chargingStopOverWaypoints[geometryLat+""+geometryLon];
                         }
 
                         if(waypointNumber !== null) {
                                 markerScale = 1.0;
                                 fillColor = '#0000ff';
                                 zIndex = 1;
                         } else {
                             
                             if(privateAccess === 'y')
                                 fillColor = '#FF0000';
                             else 
                                 fillColor = '#808080';
                             
                             markerScale = 0.5;
                         }
                         var marker = createEvChargingStationIcon (point, fillColor, markerScale, waypointNumber);
                         marker.setZIndex(zIndex);
 
 
                    marker.$content = html;
 
                    marker.addEventListener("pointerdown", function(e) {
                         if(currentBubble)
                             ui.removeBubble(currentBubble);
                         currentBubble = new H.ui.InfoBubble(e.target.getPosition(), { content: e.target.$content });
                         ui.addBubble(currentBubble);
                     }
             );
                     
                     evChargingStationGroup.addObject(marker);
                 }
             }
         }
             }
 
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
 
         var createEvChargingStationIcon = function(locationLatLon, fillColor, markerScale, waypointNumber) {
             var evChargingStationIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36">'+
             '<g transform="scale({{MARKER_SCALE}})">'+
             '  <g transform="matrix(0.32977765,0,0,0.43687655,-10.472542,-31.428298)">'+
             '    <path d="m 42.333333,74.75 v 74.08333 H 84.666666 V 74.75 Z" style="fill:{{FILL_COLOR}};fill-opacity:1;stroke:{{FILL_COLOR}};stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"/>'+
             '    <path d="M 31.75,148.83333 H 95.249999" style="fill:{{FILL_COLOR}};fill-opacity:0.91785715;stroke:{{FILL_COLOR}};stroke-width:5.76499987;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.9607143"/>'+
             '    <path d="M 52.916666,85.333334 V 106.5 H 74.083332 V 85.333334 Z" style="fill:#ffffff;stroke:#000000;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"/>'+
             '    <path d="m 65.011904,89.113099 -7.937501,9.407417 5.291667,-2.351858 -2.645833,7.055552 7.9375,-9.407408 h -2.645833 z" style="fill:{{FILL_COLOR}};stroke:{{FILL_COLOR}};stroke-width:0.06236285px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"/>'+
             '    <path d="M 84.666666,95.916667 95.249999,106.5 v 31.75 H 105.83333 V 95.916667" style="fill:none;stroke:{{FILL_COLOR}};stroke-width:2.7650001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"/>'+
             '    <path d="M 95.249999,95.916667 H 116.41667 V 85.333334 H 95.249999 Z" style="fill:{{FILL_COLOR}};stroke:{{FILL_COLOR}};stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"/>'+
             '    <path d="M 100.54166,74.75 V 85.333334" style="fill:none;stroke:{{FILL_COLOR}};stroke-width:1.66499996;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"/>'+
             '    <path d="M 109.61306,74.75 V 85.333334" style="fill:none;stroke:{{FILL_COLOR}};stroke-width:1.66499996;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"/>'+
             '  </g>'+
             '  <g style="opacity:{{WAYPOINTOPACITY}}"><text style="font-style:normal;font-weight:normal;font-size:14.45927525px;line-height:1.25;font-family:sans-serif;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.36148193" x="5.0332823" y="34.407612" transform="scale(1.126595,0.88763043)">_N_</text></g>'+
             '</g>'+
             '</svg>';
 
             evChargingStationIconSvg = evChargingStationIconSvg.replace(/{{FILL_COLOR}}/g, fillColor);
             evChargingStationIconSvg = evChargingStationIconSvg.replace('{{MARKER_SCALE}}', markerScale);
             if(waypointNumber !== null) {
                 evChargingStationIconSvg = evChargingStationIconSvg.replace('_N_', waypointNumber);
                 evChargingStationIconSvg = evChargingStationIconSvg.replace(/{{WAYPOINTOPACITY}}/g, '1');
             } else {
                 evChargingStationIconSvg = evChargingStationIconSvg.replace(/{{WAYPOINTOPACITY}}/g, '0');
             }
 
             var baseWidth = 28;
             var baseAnchorX = 14;
             var baseHeigth = 36;
             return new H.map.Marker(locationLatLon, { icon: new H.map.Icon(evChargingStationIconSvg,  { anchor: new H.math.Point(markerScale * baseAnchorX / 2, markerScale * baseHeigth)	})});
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
                                    // + "<td><b>Arrival:</b></td>" + "<td>" + humanReadableDataTimeFormat(routeObj.summary.arrival) + "</td>"
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
 
 
         var humanReadabletime = function(timeSeconds) {
             if (timeSeconds < 60)
                 return timeSeconds + "s ";
             if (timeSeconds < 3600)
                 return Math.floor((timeSeconds / 60)) + "min " + timeSeconds % 60 + 's';
             else
                 return Math.floor((timeSeconds / 3600)) + "h " + Math.floor((timeSeconds / 60) % 60) + "min " + timeSeconds % 60 + 's';
         };
 
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
 
 
 
         var wktFileExample = 'NAMES	OPEN_24_HOURS	PRIVATE_ACCESS	CONNECTORTYPE	SIDE_OF_STREET	PERCENT_FROM_REFNODE	PAYMENTMETHOD	WKT'
         + 'SPABNAsador CUSTOM   y   n   Custom IEC 62196-2 type 2 (Mennekes);;1;3;380-480VAC, 3-phase at max. 63 A;true;3;23.94;AC EV connector (Mennekes - type 2);|Custom IEC 62196-3 type 2 combo (Mennekes);;1;4;400VDC, at max. 125 A;true;4;62.5;AC/DC combo (Mennekes - type 2); L   10  S:Electric;;n   POINT(8.6321 49.35022)'
         + 'SPABNAsador CUSTOM2  y   n   Custom2 Domestic plug/socket type F (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 13 A;false;;;country specific domestic plug/socket; R   10  S:Electric;;y   POINT(8.6955 50.3781)'
         + 'SPABNAsador CUSTOM3  y   n   Custom3 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;   R   10  S:Electric;;y   POINT(8.64669 49.40818)'
         + 'SPABNAsador CUSTOM4	y	n	Custom4 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.64635 49.40903)'
         + 'SPABNAsador CUSTOM5	y	n	Custom5 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.61932 49.35402)'
         + 'SPABNAsador CUSTOM6	y	n	Custom6 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.62247 49.36279)'
         + 'SPABNAsador CUSTOM7	y	n	Custom7 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.63052 49.46036)'
         + 'SPABNAsador CUSTOM8	y	n	Custom8 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.64493 49.46985)'
         + 'SPABNAsador CUSTOM9	y	n	Custom9 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.63553 49.47261)'
         + 'SPABNAsador CUSTOM10	y	n	Custom10 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.62213 49.47171)'
         + 'SPABNAsador CUSTOM11	y	n	Custom11 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.66069 49.50638)'
         + 'SPABNAsador CUSTOM12	y	n	Custom12 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.62856 49.58091)'
         + 'SPABNAsador CUSTOM13	y	n	Custom13 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.61386 49.68153)'
         + 'SPABNAsador CUSTOM14	y	n	Custom14 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.5902 49.68532)'
         + 'SPABNAsador CUSTOM15	y	n	Custom15 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.60678 49.69771)'
         + 'SPABNAsador CUSTOM16	y	n	Custom16 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.60114 49.74084)'
         + 'SPABNAsador CUSTOM17	y	n	Custom17 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.6582 50.27485)'
         + 'SPABNAsador CUSTOM18	y	n	Custom18 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.69823 50.31695)'
         + 'SPABNAsador CUSTOM19	y	n	Custom19 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.69732 50.37559)'
         + 'SPABNAsador CUSTOM20	y	n	Custom20 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.72746 50.47095)'
         + 'SPABNAsador CUSTOM21	y	n	Custom21 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.72445 50.48457)'
         + 'SPABNAsador CUSTOM22	y	n	Custom22 plug/socket type G (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 15 A;false;1;3.45;country specific custom plug/socket;	R	10	S:Electric;;y	POINT(8.77144 50.53318)'
         + 'SPABNAsador CUSTOM23 y   n   Custom23 plug/socket type F (CEE 7/4 (Schuko));;1;1;200-240VAC, 1-phase at max. 13 A;false;;;country specific domestic plug/socket;     R   10  S:Electric;;y   POINT(8.683194 50.429868)';