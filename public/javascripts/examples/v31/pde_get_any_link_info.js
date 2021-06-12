// author(C) HERE 2019
  
var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
  
// check if the site was loaded via secure connection
var secure = (location.protocol === 'https:') ? true : false;

var mapContainer = document.getElementById('mapContainer');
var platform = new H.service.Platform({apikey: api_key,
  useHTTPS: secure});

var maptypes =  platform.createDefaultLayers();
var map = new H.Map(mapContainer, maptypes.vector.normal.map,
  {center: new H.geo.Point(50.11239,8.68598), zoom: 10});

// Do not draw under control panel
map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

new H.mapevents.Behavior(new H.mapevents.MapEvents(map)); // add behavior control
var ui = H.ui.UI.createDefault(map, maptypes); // add UI

// Add JS API Release information
releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;
// add MRS Release information
loadMRSVersionTxt();

window.addEventListener('resize', function () {
  map.getViewPort().resize();
});

// Group for map objects
var mapObjects = new H.map.Group();
map.addObject(mapObjects);

// console.log("This example has temporary caching of PDE tile data." + 
// 				" Link Info will be requested from server if not existing in the already retrieved data");

function changemode(that){
  if(that.value==='link'){
      document.getElementById("topo-seg-input").disabled=true;
      document.getElementById("link-input").disabled=false;
  }else if (that.value === 'topo'){
      document.getElementById("link-input").disabled=true;
      document.getElementById("topo-seg-input").disabled=false;
  }
}

//Containers for PDE Link Data
var ROAD_GEOM_FC=[], LINK_ATTRIBUTE_FC=[], LINK_ATTRIBUTE2_FC=[], SPEED_LIMITS_FC=[], 
  SPEED_LIMITS_COND_FC=[], SPEED_LIMITS_VAR_FC=[], TRAFFIC_PATTERN_FC=[], TRUCK_SPEED_LIMITS_FC=[],
  ADAS_ATTRIB_FC=[], BASIC_HEIGHT_FC=[], LANE_FC=[], LINK_FC=[],
  LINK_TMC_FC=[], ROAD_ADMIN_FC=[], TRUCK_RESTR_FC=[], ROAD_NAME_FC=[], 
  ROAD_ADMIN_NAMES_FC=[], ROAD_ROUGHNESS_FC=[], TOPO_SEG_ID_FC=[], TURN_RESTR_FC=[], TOPO_SEG_LINK_FC = [];
  
// Container for link Polyline Map Objects added
var linkPolylines = [];

// Link display styles
var HOVER_LINK_STYLE = {lineWidth: 12, strokeColor: 'rgba(0, 255, 50, 0.7)', lineJoin: 'round'};
var DEFAULT_LINK_STYLE = {lineWidth: 12, strokeColor: 'rgba(255, 0, 0, 1)', lineJoin: "round"};

// Info Bubbles for LinkInfo display
map.addEventListener('longpress', function (currentEvent) 
{
  var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);
  submitPosition(lastClickedPos);
});

var submitPosition = function(pos)
{
  var zip = new JSZip(),
      lastPos = "SEQNR,\tLATITUDE,\tLONGITUDE\n1,\t" + (Math.round(pos.lat * 100000.0) / 100000.0) + ",\t" + (Math.round(pos.lng * 100000.0) / 100000.0);
  zip.file("temp.zip", lastPos);
  var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
  var url = "https://rme.api.here.com/2/matchroute.json?routemode=emergency&file=" + encodeURIComponent(content);
      url += "&app_id=" + app_id + "&app_code=" + app_code + "&callback=gotRouteMatchResponse";
  
  script = document.createElement("script");
  script.src = url;
  document.body.appendChild(script);
}

var gotRouteMatchResponse = function (respJsonObj) {
  if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
      alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
      return;
  }
  // draw the route
  var linkid = respJsonObj.RouteLinks[0].linkId;
  document.getElementById('link-input').value = linkid;
  prepareGetLinkInfoCall(true);
}


var pdeURL = document.getElementById("serverURL").value,
layerSelected,
linksTextInput,
linkDataInfoBubble,
linksInput  = [],
topoSegInput,
levels = new Array(),
tileXY = new Array(),
geomLayers = new Array(),
linkInfoLayers = new Array(),
maxInputLinks;


var topoLevels = new Array();
var topoLayers = new Array();
var topoTileXY = new Array();

var stabTopoChecked = document.getElementById('includeStabTopo').checked;

function getBaseUrl() {
  pdeURL = document.getElementById("serverURL").value;
}

function getServiceConfigLimit(){
  console.log("Triggering ServiceConfiguration Request");
  
  // Generate URL.
  // https://pde.api.here.com/1/serviceconfiguration.json?app_id=&app_code=
  var url = [pdeURL,'serviceconfiguration.json?',
      '&app_id=',
      app_id,
      '&app_code=',
      app_code,
      "&callback=processServiceConfigResponse"
      ].join('');
      
      // Send request.
      script = document.createElement("script");
       script.src = url;
      document.body.appendChild(script);
      Spinner.showSpinner();
}

// callback for PDE Config Request call
function processServiceConfigResponse(resp){
  if (resp == null) {
      alert("Something went wrong in PDE Service Configuration call");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Service Configuration call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else {
      config = resp.Configuration;
      maxInputLinks = config.maxTilesPerRequest;
      Spinner.hideSpinner();
  }
}

getServiceConfigLimit();
//getInputLinks();
getLayerSelected();


// Triggered on change in layer selected
function getLayerSelected() {
  layerSelected = document.getElementById("layerSelected").value;
  levels = new Array(),
  tileXY = new Array(),
  geomLayers = new Array(),
  linkInfoLayers = new Array();
  mapObjects.removeAll();
  if(linkDataInfoBubble !== undefined){linkDataInfoBubble.close();}
}
function isTopoBasedSearch(){
  return document.getElementsByName('search-mode')[1].checked;

  /*
  linksTextInput   = document.getElementById("link-input")    .value.replace(/[^0-9\,]/g, '');
  topoSegTextInput = document.getElementById("topo-seg-input").value.replace(/[^0-9\,]/g, '');
  
  var linksInput   = linksTextInput  ===""?[]:  linksTextInput.split(",");
  topoSegInput = topoSegTextInput===""?[]:topoSegTextInput.split(",");
  if(linksInput.length>0 && topoSegInput.length>0){
      alert("Please provide either Link ids or Topology Segment Ids");
      return {
          result: null,
          error: true
      };
  }else{
      var isTopoSeg = false;
      if(linksInput.length>0){
          idsToLookup = linksInput;
      }else if(topoSegInput.length>0){
          
          isTopoSeg = true;
      }
      return {
          result: isTopoSeg,
          error: false
      };
  }*/
}
// Triggered on change in input link text
function getInputLinks() {
  linksTextInput   = document.getElementById("link-input").value.replace(/[^0-9\,]/g, '');
  linksInput = linksTextInput.split(",");
  
  if (linksInput.length>maxInputLinks){
      alert("More than " + maxInputLinks + " Link_Ids added, selecting only first " + maxInputLinks);
      linksInput = linksInput.slice(0,maxInputLinks);
      document.getElementById("link-input").value = linksInput.join();
  }
  mapObjects.removeAll();
  if(linkDataInfoBubble !== undefined){linkDataInfoBubble.close();}
}

function getInputLinksViaTopoSeg(){
  topoSegTextInput = document.getElementById("topo-seg-input").value.replace(/[^0-9\,]/g, '');
  
  topoSegInput = topoSegTextInput.split(",");
  if (topoSegInput.length>maxInputLinks){
      alert("More than " + maxInputLinks + " Link_Ids added, selecting only first " + maxInputLinks);
      topoSegInput = topoSegInput.slice(0,maxInputLinks);
      document.getElementById("link-input").value = topoSegInput.join();
  }

  mapObjects.removeAll();
  if(linkDataInfoBubble !== undefined){linkDataInfoBubble.close();}


}


function handle(e){
  if(e.keyCode === 13){
      e.preventDefault(); // Ensure it is only this code that runs
      prepareGetLinkInfoCall();
  }
}

// Link selection display handlers
function createPointerEnterLinkHandler(polyline){
  return function(evt){
      polyline.setStyle(HOVER_LINK_STYLE);
  };
}

function createPointerLeaveLinkHandler(polyline) {
  return function (e) {
        polyline.setStyle(DEFAULT_LINK_STYLE);
  };
}

//LinkInfo display handler
function createTapLinkHandler(polyline) {
  return function (e) {
        var strip = polyline.getGeometry();
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
      infoText="";
      
      // Get Link data to display based on the layer selected
      if(layerSelected == 'ROAD_GEOM_FC'){infoText = ROAD_GEOM_FC[linkId];}
      else if(layerSelected == 'LINK_ATTRIBUTE_FC'){infoText = LINK_ATTRIBUTE_FC[linkId];}
      else if(layerSelected == 'LINK_ATTRIBUTE2_FC'){	infoText = LINK_ATTRIBUTE2_FC[linkId];}
      else if(layerSelected == 'SPEED_LIMITS_FC'){infoText = SPEED_LIMITS_FC[linkId];}
      else if(layerSelected == 'SPEED_LIMITS_COND_FC'){infoText = SPEED_LIMITS_COND_FC[linkId];}
      else if(layerSelected == 'SPEED_LIMITS_VAR_FC'){infoText = SPEED_LIMITS_VAR_FC[linkId];}
      else if(layerSelected == 'TRAFFIC_PATTERN_FC'){infoText = TRAFFIC_PATTERN_FC[linkId];}
      else if(layerSelected == 'TRUCK_SPEED_LIMITS_FC'){infoText = TRUCK_SPEED_LIMITS_FC[linkId];}
      else if(layerSelected == 'ADAS_ATTRIB_FC'){infoText = ADAS_ATTRIB_FC[linkId];}
      else if(layerSelected == 'BASIC_HEIGHT_FC'){infoText = BASIC_HEIGHT_FC[linkId];}
      else if(layerSelected == 'LANE_FC'){infoText = LANE_FC[linkId];}
      else if(layerSelected == 'LINK_FC'){infoText = LINK_FC[linkId];}
      else if(layerSelected == 'LINK_TMC_FC'){infoText = LINK_TMC_FC[linkId];}
      else if(layerSelected == 'ROAD_ADMIN_FC'){infoText = ROAD_ADMIN_FC[linkId];}
      else if(layerSelected == 'ROUNDABOUT_FC'){infoText = ROUNDABOUT_FC[linkId];}
      else if(layerSelected == 'TURN_RESTR_FC'){infoText = TURN_RESTR_FC[linkId];}
      else if(layerSelected == 'TRUCK_RESTR_FC'){infoText = TRUCK_RESTR_FC[linkId];}
      else if(layerSelected == 'ROAD_NAME_FC'){infoText = ROAD_NAME_FC[linkId];}
      else if(layerSelected == 'ROAD_ADMIN_NAMES_FC'){infoText = ROAD_ADMIN_NAMES_FC[linkId];}
      else if(layerSelected == 'ROAD_ROUGHNESS_FC'){infoText = ROAD_ROUGHNESS_FC[linkId];}
      else if(layerSelected == 'TOPO_SEG_ID_FC'){infoText = TOPO_SEG_ID_FC[linkId];}
      
      if (infoText == null) {
          infoText = "LINK_ID: " + JSON.stringify(linkId) + ", No data available for the layer: " + layerSelected;
      }
      else {
          infoText = JSON.stringify(infoText,undefined,5);
      }
      
      // Adding Link data to a Infobubble with text area formatting
      infoText="<textarea readonly rows='5' cols='35' style='border:0;font-size:12px;max-width:350px;max-height:400px;'>"+infoText+"</textarea>";
  
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


// Get the Tilex, TileY and Level for all the Links using PDE Index endpoint
function getIndex(newIds, isTopologySegment){
  
  
  // https://pde.api.here.com/1/index.json?layer=ROAD_GEOM_FCn&attributes=LINK_ID&values=52298144,52298166&app_id=&app_code=
  if(!isTopologySegment){
      console.log("Triggering PDE Index call for links: " + newIds.join());
      levels = new Array(),
      tileXY = new Array(),
      geomLayers = new Array(),
      linkInfoLayers = new Array();
      // Generate URL.
      var url = [pdeURL, 'index.json?layer=ROAD_GEOM_FCn&attributes=LINK_ID&values=',newIds.join(),
          '&app_id=',
          app_id,
          '&app_code=',
          app_code,
          "&callback=processIndexResponse"
          ].join('');
          // Send request.
          script = document.createElement("script");
          script.src = url;
          document.body.appendChild(script);
          Spinner.showSpinner();
  }else{
      console.log("Triggering PDE Index call for Topology Segments: " + newIds.join());
      // Generate URL.
      var url = [pdeURL, 'index.json?layer=TOPO_SEG_LINK_FCn&attributes=TOPOLOGY_ID&values=',newIds.join(),
          '&app_id=',
          app_id,
          '&app_code=',
          app_code,
          "&callback=processIndexResponseTopo"
          ].join('');
          // Send request.
          script = document.createElement("script");
          script.src = url;
          document.body.appendChild(script);
          Spinner.showSpinner();
  }
}

// callback for PDE index layer call, Tilex, TileY, Level and Layer info is retrieved
function processIndexResponse(resp){
  if (resp == null || resp.Layers == null) {
      alert("Something went wrong in PDE Index call");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Index call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else {
      layers = resp.Layers;
      for (var i = 0; i < layers.length; i++) {
          for (var j=0; j < layers[i].tileXYs.length; j++) {
              levels.push(layers[i].level);
              tileXY.push(layers[i].tileXYs[j].x);
              tileXY.push(layers[i].tileXYs[j].y);
              var layer = layers[i].layer;
              geomLayers.push(layer);
              var FC = layer[layer.length -1];
              linkInfoLayers.push(layerSelected.concat(FC));
          }
      }
      
      Spinner.hideSpinner();

      // Triggereing PDE Link Geometry and Link Info calls based on PDE layer selected
      if (layerSelected == 'ROAD_GEOM_FC'){
          getLinkGeometry();
      }
      else {
          getLinkGeometry();
          getLinkInfo();
      }
  }	
}

// callback for PDE index layer call, Tilex, TileY, Level and Layer info is retrieved
function processIndexResponseTopo(resp){
  if (resp == null || resp.Layers == null) {
      alert("Something went wrong in PDE Index call");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Index call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else {
      layers = resp.Layers;
      topoLevels = new Array();
      topoLayers = new Array();
      topoTileXY = new Array();
      for (var i=0;i<layers.length;i++) {
          topoLevels.push(layers[i].level);
          topoTileXY.push(layers[i].tileXYs[0].x);
          topoTileXY.push(layers[i].tileXYs[0].y);
          var layer = layers[i].layer;
          topoLayers.push(layer);
      }
      
      Spinner.hideSpinner();

      getLinksForTopoSeg()
  }	
}

// Get Link geometry from ROAD_GEOM_FC layer
function getLinkGeometry(){
  console.log("Triggering PDE Road Geometry call");
  
  // Generate URL.
  // https://pde.api.here.com/1/index.json?layer=ROAD_GEOM_FC&attributes=LINK_ID&values=52298144,52298166&app_id=&app_code=
  var url = [pdeURL,'tiles.json?layers=',geomLayers.join(),
      '&levels=',levels.join(),
      '&tilexy=',tileXY.join(),
      '&app_id=',
      app_id,
      '&app_code=',
      app_code,
      "&callback=processGeometryResponse"
      ].join('');
      
      // Send request.
      script = document.createElement("script");
       script.src = url;
      document.body.appendChild(script);
      Spinner.showSpinner();
}


// Get Link geometry from ROAD_GEOM_FC layer
function getLinksForTopoSeg(){
  console.log("Triggering PDE Topo Seg call");
  
  // Generate URL.
  // https://pde.api.here.com/1/index.json?layer=ROAD_GEOM_FC&attributes=LINK_ID&values=52298144,52298166&app_id=&app_code=
  var url = [pdeURL,'tiles.json?layers=',topoLayers.join(),
      '&levels=',topoLevels.join(),
      '&tilexy=',topoTileXY.join(),
      '&app_id=',
      app_id,
      '&app_code=',
      app_code,
      "&callback=processTopoTilesResponse"
      ].join('');
      
      // Send request.
      script = document.createElement("script");
       script.src = url;
      document.body.appendChild(script);
      Spinner.showSpinner();
}

//Process the PDE ROAD_GEOM tile response, caching all tile data
function processGeometryResponse(resp) {
  if (resp == null || resp.Tiles == null || resp.Tiles[0].Rows == null) {
      alert("Something went wrong in PDE Link Geometry call, no PDE data available");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Link Geometry call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else{
      for (var t=0; t<resp.Tiles.length; t++){
          for (var r = 0; r < resp.Tiles[t].Rows.length; r++) {
              var linkId = parseInt(resp.Tiles[t].Rows[r].LINK_ID);	
              ROAD_GEOM_FC[linkId] = resp.Tiles[t].Rows[r];
          }
      }	
  }
  addLinkGeometry(linksInput);
}


//Process the PDE ROAD_GEOM tile response, caching all tile data
function processTopoTilesResponse(resp) {
  if (resp == null || resp.Tiles == null || resp.Tiles[0].Rows == null) {
      alert("Something went wrong in PDE Link Geometry call, no PDE data available");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Link Geometry call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else{
      linksInput = [];
      mapObjects.removeAll();
      for (var t=0; t<resp.Tiles.length; t++){
          for (var r = 0; r < resp.Tiles[t].Rows.length; r++) {
              TOPO_SEG_LINK_FC[resp.Tiles[t].Rows[r].TOPOLOGY_ID] = decodeLinkIds(resp.Tiles[t].Rows[r].LINK_IDS).join(",");
              if(topoSegInput.indexOf(resp.Tiles[t].Rows[r].TOPOLOGY_ID)!=-1){
                  linksInput = linksInput.concat(TOPO_SEG_LINK_FC[resp.Tiles[t].Rows[r].TOPOLOGY_ID].split(","));
              }
          }
      }
  }
  getPdeLinkInfo();
}

function decodeLinkIds(LINK_IDS_TXT){
  var LINK_IDS = LINK_IDS_TXT.split(',')
  var linkIdsDecoded = [];
  for(var i=0; i<LINK_IDS.length; i++){
      if(i==0){
          linkIdsDecoded[i] = hexToDec(LINK_IDS[i]);
      }else{
          linkIdsDecoded[i] = linkIdsDecoded[i-1] + hexToDec(LINK_IDS[i]);
      }
  }
  return linkIdsDecoded;
}

function hexToDec(hex) {
  return parseInt(hex, 16);
}

// Adding geometry of only required links in input to map
function addLinkGeometry(linksToAdd){
  for (var l=0; l<linksToAdd.length; l++){
      linkId = linksToAdd[l];
      var linkGeom = ROAD_GEOM_FC[linkId];
        if (linkGeom) {
            var lat = linkGeom.LAT.split(",");
            var lon = linkGeom.LON.split(",");
            var strip = new H.geo.LineString();
            var temLat = 0, temLon = 0;
            for (i = 0; i < lat.length; i++) {
              var latChange = parseInt(lat[i]) || 0; // to handle cases where there is no change in lat value
              var lonChange = parseInt(lon[i]) || 0; // to handle cases where there is no change in lon value
                temLat = temLat + latChange;
                temLon = temLon + lonChange;
                strip.pushPoint({
                    lat: temLat / 100000,
                    lng: temLon / 100000
                });
            }
            var polyline = new H.map.Polyline(strip, {
                style: DEFAULT_LINK_STYLE, arrows: {width:0.8, length:1.2, frequency:3}
            });
          polyline['LINK_ID'] = linkId;
          linkPolylines[linkId] = polyline;
          polyline.$linkId=linkId;
          
          // Event listeners to highlight link on mouse pointer enter/leave
          polyline.addEventListener('pointerenter', createPointerEnterLinkHandler(polyline));
            polyline.addEventListener('pointerleave', createPointerLeaveLinkHandler(polyline));
          
          // Event listener for link data display in InfoBubble on tap
          polyline.addEventListener('tap', createTapLinkHandler(polyline));
          
            mapObjects.addObject(polyline);
        }
  }
  map.getViewModel().setLookAtData({
      tilt: 45,
      bounds: mapObjects.getBoundingBox()
  });
  Spinner.hideSpinner();
}

// Function to trigger PDE link info request based on layer selected.
function getLinkInfo(){
  console.log("Triggerring PDE LinkInfo call for layer: "+layerSelected);
  var includeStabTopo = (document.getElementById('includeStabTopo').checked) ? "&link2stabletopologyid=1" : "";
  var url = [pdeURL,'tiles.json?layers=',linkInfoLayers.join(),
      '&levels=',levels.join(),
      '&tilexy=',tileXY.join(),
      '&app_id=',
      app_id,
      '&app_code=',
      app_code,
      "&callback=processLinkInfoResponse",
      includeStabTopo
      ].join('');
      // Send request.
      script = document.createElement("script");
       script.src = url;
      document.body.appendChild(script);
      Spinner.showSpinner();
}

// Process the PDE LinkInfo tile response, caching all tile data 
function processLinkInfoResponse(resp) {
  if (resp == null || resp.Tiles == null || resp.Tiles[0].Rows == null) {
      alert("Something went wrong in PDE Link Info call, no PDE data available");
      Spinner.hideSpinner();
      return;
  }
  else if(resp.responseCode == "400"){
      alert("Something went wrong in PDE Link Info call" + resp["message"]);
      Spinner.hideSpinner();
      return;
  }
  else{
      for (var t=0; t<resp.Tiles.length; t++){
          for (var r = 0; r < resp.Tiles[t].Rows.length; r++) {
              var linkId = parseInt(resp.Tiles[t].Rows[r].LINK_ID);
              
              if(layerSelected == 'TRUCK_RESTR_FC'){
                  //var linkIds = parseInt(resp.Tiles[t].Rows[r].LINK_IDS);
                  var linkIds = resp.Tiles[t].Rows[r].LINK_IDS;
                  linkIds = parseInt(linkIds.replace(/[^0-9\,]/g, ''));
                  //linkIds = Math.abs(linkIds);
                  if (TRUCK_RESTR_FC[linkIds]==null){
                      TRUCK_RESTR_FC[linkIds] = new Array();
                      TRUCK_RESTR_FC[linkIds].push(resp.Tiles[t].Rows[r]);
                  }
                  else {
                      TRUCK_RESTR_FC[linkIds].push(resp.Tiles[t].Rows[r]);
                  }
              }
              if(layerSelected == 'TURN_RESTR_FC'){
                  //var linkIds = parseInt(resp.Tiles[t].Rows[r].LINK_IDS);
                  var linkIds = resp.Tiles[t].Rows[r].LINK_IDS;
                  linkIds = parseInt(linkIds.replace(/[^0-9\,]/g, ''));
                  //linkIds = Math.abs(linkIds);
                  if (TURN_RESTR_FC[linkIds]==null){
                      TURN_RESTR_FC[linkIds] = new Array();
                      TURN_RESTR_FC[linkIds].push(resp.Tiles[t].Rows[r]);
                  }
                  else {
                      TURN_RESTR_FC[linkIds].push(resp.Tiles[t].Rows[r]);
                  }
              }					
              // Saving the link info based on layer selected
              else if(layerSelected == 'LINK_ATTRIBUTE_FC'){LINK_ATTRIBUTE_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'LINK_ATTRIBUTE2_FC'){LINK_ATTRIBUTE2_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'SPEED_LIMITS_FC'){SPEED_LIMITS_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'SPEED_LIMITS_COND_FC'){SPEED_LIMITS_COND_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'SPEED_LIMITS_VAR_FC'){SPEED_LIMITS_VAR_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'TRAFFIC_PATTERN_FC'){TRAFFIC_PATTERN_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'TRUCK_SPEED_LIMITS_FC'){TRUCK_SPEED_LIMITS_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ADAS_ATTRIB_FC'){ADAS_ATTRIB_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'BASIC_HEIGHT_FC'){BASIC_HEIGHT_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'LANE_FC'){LANE_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'LINK_FC'){LINK_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'LINK_TMC_FC'){LINK_TMC_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ROAD_ADMIN_FC'){ROAD_ADMIN_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ROUNDABOUT_FC'){ROUNDABOUT_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ROAD_NAME_FC'){ROAD_NAME_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ROAD_ADMIN_NAMES_FC'){ROAD_ADMIN_NAMES_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'ROAD_ROUGHNESS_FC'){ROAD_ROUGHNESS_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'TOPO_SEG_ID_FC'){TOPO_SEG_ID_FC[linkId]=resp.Tiles[t].Rows[r];}
              else if(layerSelected == 'TURN_RESTR_FC'){TURN_RESTR_FC[linkId]=resp.Tiles[t].Rows[r];}

          }
      }
  }
  Spinner.hideSpinner();
}
function prepareGetLinkInfoCall(forceLinkIDSearch){
  mapObjects.removeAll();
  // clear all previous results
  ROAD_GEOM_FC=[];
  LINK_ATTRIBUTE_FC=[];
  LINK_ATTRIBUTE2_FC=[]; 
  SPEED_LIMITS_FC=[]; 
  SPEED_LIMITS_COND_FC=[];
  SPEED_LIMITS_VAR_FC=[];
  TRAFFIC_PATTERN_FC=[];
  TRUCK_SPEED_LIMITS_FC=[];
  ADAS_ATTRIB_FC=[];
  BASIC_HEIGHT_FC=[];
  LANE_FC=[];
  LINK_FC=[];
  LINK_TMC_FC=[];
  ROAD_ADMIN_FC=[];
  TRUCK_RESTR_FC=[];
  ROAD_NAME_FC=[]; 
  ROAD_ADMIN_NAMES_FC=[];
  ROAD_ROUGHNESS_FC=[];
  TOPO_SEG_ID_FC=[];
  TURN_RESTR_FC=[];
  TOPO_SEG_LINK_FC = [];
  if(!isTopoBasedSearch() || forceLinkIDSearch){
      getInputLinks();
      getPdeLinkInfo();
  }else{
      topoSegInput = document.getElementById("topo-seg-input").value.replace(/[^0-9\,]/g, '').split(',');
      getIndex(topoSegInput, true);
  }

  
}

// Function called on UI 'Get PDE Link Info' button click 
function getPdeLinkInfo() {
  
  var linksTobeRequested = new Array();
  var currStabTopoChecked = document.getElementById('includeStabTopo').checked;
  
  if (currStabTopoChecked !== stabTopoChecked) { // Stable Topology info was requested/not requested before. So trigger new PDE requests (not load from cache) 
      stabTopoChecked = currStabTopoChecked
      for (var l=0; l<linksInput.length; l++) {
          linksTobeRequested.push(linksInput[l]);
      }
  }
  else { // Checking from cache if link Info is already available for links in input field for specific layer selected
      for (var l=0; l<linksInput.length; l++) {
          linkId = linksInput[l];
          if(layerSelected == 'ROAD_GEOM_FC'){if (ROAD_GEOM_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'LINK_ATTRIBUTE_FC'){if (LINK_ATTRIBUTE_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'LINK_ATTRIBUTE2_FC'){if (LINK_ATTRIBUTE2_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'SPEED_LIMITS_FC'){if (SPEED_LIMITS_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'SPEED_LIMITS_COND_FC'){if (SPEED_LIMITS_COND_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'SPEED_LIMITS_VAR_FC'){if (SPEED_LIMITS_VAR_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'TRAFFIC_PATTERN_FC'){if (TRAFFIC_PATTERN_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'TRUCK_SPEED_LIMITS_FC'){if (TRUCK_SPEED_LIMITS_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ADAS_ATTRIB_FC'){if (ADAS_ATTRIB_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'BASIC_HEIGHT_FC'){if (BASIC_HEIGHT_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'LANE_FC'){if (LANE_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'LINK_FC'){if (LINK_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'LINK_TMC_FC'){if (LINK_TMC_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ROAD_ADMIN_FC'){if (ROAD_ADMIN_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ROUNDABOUT_FC'){if (ROUNDABOUT_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'TRUCK_RESTR_FC'){if (TRUCK_RESTR_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ROAD_NAME_FC'){if (ROAD_NAME_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ROAD_ADMIN_NAMES_FC'){if (ROAD_ADMIN_NAMES_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'ROAD_ROUGHNESS_FC'){if (ROAD_ROUGHNESS_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'TOPO_SEG_ID_FC'){if (TOPO_SEG_ID_FC[linkId]==null) {linksTobeRequested.push(linkId);}}
          else if(layerSelected == 'TURN_RESTR_FC'){if (TURN_RESTR_FC[linkId]==null) {linksTobeRequested.push(linkId);}}

      }
  }
  
  // Triggering PDE calls if link info not in cache
  if (linksTobeRequested.length>0){
      console.log("Requesting new LinkInfo from server");
      
      getIndex(linksTobeRequested);
      //getLinkGeometry();
      //getLinkInfo();
      //addLinkGeometry(linksInput);
  }
  else {
      console.log("Loading LinkInfo from cache");
      addLinkGeometry(linksInput);
  }
}