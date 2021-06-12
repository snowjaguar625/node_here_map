/*
   * (C) HERE 2019
   *
   * This is an example implementation of the isoline route calculation offered by HERE.
   *
   */

(function setValuesFromUrl() {
    var indexOf = window.location.href.indexOf('?');
    if (indexOf < 0) return;
    var vars = window.location.href.slice(indexOf + 1).split('&');

    for (var i = 0; i < vars.length; i++) {
      nameVal = vars[i].split('=');
      if (!nameVal[0]) continue;
	  if (!document.getElementById(nameVal[0])) continue;
      document.getElementById(nameVal[0]).value = decodeURIComponent(nameVal[1]);
    }

  })();
  
  //Replace the default credentials with custom ones from user input
  function setCredentials(){
  	var apikey = document.getElementById('customApiKey').value;
	if( apikey.length > 0  ) {
            api_key = apikey;
    }
  }

  /**
  *  Show and hide text
  */
  var detailsSelect = function()
  {
    var detaildesc = document.getElementById("detaildesc");
    var moreText = document.getElementById("more");
    moreText.value = (detaildesc.style.display == 'block') ? "more" : "less";
    detaildesc.style.display = (detaildesc.style.display == 'block') ? 'none' : 'block';
  };

  var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

  var mapContainer = document.getElementById('mapContainer');

  // color of junction view markers (along route)
  var jvColor = "rgba(255, 224, 22, 0.5)";

  // check if the site was loaded via secure connection
  var secure = (location.protocol === 'https:') ? true : false;
  var platform = new H.service.Platform({
		apikey: api_key,
		useHTTPS: secure
  });

  // Create a platform object to communicate with the HERE REST APIs

  var maptypes = platform.createDefaultLayers();
  var geocoder = platform.getGeocodingService();
  var router = platform.getRoutingService();
  var group = new H.map.Group();
  var markerGroup = new H.map.Group();
  var geomGroup = new H.map.Group();
  var layerId;
  
  //this variable will hold the previous junction group data which was clicked,
  //this will be closed if a new POI has been clicked before acutally closing the 
  //previous bubble
  var previousJunctionGroup;

  var map = new H.Map(mapContainer, maptypes.vector.normal.map, {
    center: center,
    zoom: zoom,
    pixelRatio: hidpi ? 2 : 1
  });

  var boundingCircleIntersectsPolygonOptions = {
      style: {
        fillColor: 'rgba(230, 200, 0, 0.3)',
        lineWidth: 0
      }
    };

  // Do not draw under control panel
  map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());

  // add behavior control
  new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // add UI
  var ui = H.ui.UI.createDefault(map, maptypes);

  var demoExampleLayerIdForCLE = "444777000DEMO";

  //add JS API Release information
  releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version; //may be a good info to display

  //helper
  var releaseGeocoderShown = false;
  var releaseRoutingShown = false;


  // add window resizing event listener
  window.addEventListener('resize', function () {
    map.getViewPort().resize();
  });

  // read the HTML page URL parameters
  var htmlPageUrlParameters = [];
  location.search.replace("?","").split("&").forEach( function(nameValue) { nv = nameValue.split("="); htmlPageUrlParameters[nv[0]] = nv[1]; } );
  if (htmlPageUrlParameters.endpointurl) document.getElementById('serverURL').value = htmlPageUrlParameters.endpointurl;

  var cle = platform.ext.getCustomLocationServiceApiKey( document.getElementById('serverURL').value, api_key);

  var timeRadioButton = document.getElementById('time-radio-button');
  var layerRadioButton = document.getElementById('layer-radio-button-pde');
  
  var detourType;
  function detourTypeChanged(input) {
    detourType = input.value;
    document.getElementById('max-detour-time').style.display = input.value === 'time' ? 'block' : 'none';
    document.getElementById('max-detour-distance').style.display = input.value === 'distance' ? 'block' : 'none';
  }

  timeRadioButton.click();

  //var layerEnvironment;
  function environementChanged(input) {
    var layerEnvironment = input.value;
    if(layerEnvironment === 'pde'){
      document.getElementById('customLayerIdDiv').style.display = 'none';    
      document.getElementById('noResultDiv').style.display = 'none';
      document.getElementById('predefinedPdeLayersDiv').style.display = 'block';
      predefinedExample(input);
    }
    if (layerEnvironment === 'cle'){
      document.getElementById('customLayerIdDiv').style.display = 'block';    
      document.getElementById('noResultDiv').style.display = 'block';    
      document.getElementById('predefinedPdeLayersDiv').style.display = 'none';
      predefinedExample(input);
    }
  }
  layerRadioButton.click();

  // add long click in map event listener
  map.addEventListener('longpress', handleLongClickInMap);

  var routeButton = document.getElementById("routeButton");
  var start = document.getElementById("start");
  var dest = document.getElementById("dest");

  var feedbackTxt = document.getElementById("feedbackTxt");
  var pointA;
  var pointB;
  var startMarker = null;
  var destMarker = null;
  var bErrorHappened = false;
  var bLongClickUseForStartPoint = true; // for long click in map we toggle start/destination

  map.addObject(markerGroup);
  map.addObject(group);

  var bubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {content: ''});
    bubble.close();
    ui.addBubble(bubble);

  /************************************

   Geocoding and routing methods

   ************************************/

  /***/
  function clearLastRouteCalculation() {
    bErrorHappened = false;
    bLongClickUseForStartPoint = true;
    group.removeAll();
    if(bubble){
      bubble.close();
    }
  }

   function setEnvironment() {
        var environment = document.getElementById('serverURL').value;
        cle.setEnvironment( environment );
   }


  function refreshDemo() {

    if( document.getElementById('serverURL').value === "" ) {
        alert("Please enter an endpoint.");
        return;
    }

    var file = [ 'link_id\tid\ttype\tname\taddress\twkt',
                 '722955940\t1\tEat & Drink\tTRYPP RESTAURANT\tKatharinenkreisel Frankfurt am Main\tPOINT(8.629184 50.116002)',
                 '1155907060\t2\tEat & Drink\tImbiss\tFelix-Kracht-Straße Frankfurt am Main\tPOINT (8.624943 50.114392)',
                 '1189760959\t3\tEat & Drink\tView\tLeonardo-da-Vinci-Allee Frankfurt am Main\tPOINT(8.627610 50.113943)',
                 '576404691\t4\tEat & Drink\tValentinoo\tMontgolfier-Allee Frankfurt am Main\tPOINT(8.624033 50.112806)',
                 '1003401126\t5\tEat & Drink\tRest Cafe Europa\tEuropa-Allee Frankfurt am Main\tPOINT(8.624999 50.107726)',
                 '1193337887\t6\tEat & Drink\tMilanu\tAm Roemerhof Frankfurt\tPOINT(8.619443 50.107523)',
                 '1185849363\t7\tEat & Drink\tLame des thess\tEuropa-Allee Frankfurt am Main\tPOINT(8.628068 50.107352)',
                 '1185849364\t8\tEat & Drink\tDa Ciminu\tEuropa-Allee Frankfurt am Main\tPOINT(8.628733 50.107676)',
                 '1197082728\t9\tEat & Drink\tPizzeria da Salvo\tBuzzistraße Frankfurt am Main\tPOINT(8.628249 50.111678)',
                 '52308927\t10\tEat & Drink\tOng Tae\tAm Dammgraben Frankfurt am Main\tPOINT(8.629229 50.110964)',
                 '52308665\t11\tEat & Drink\tdieKantinu\tMüllerstraße Frankfurt am Main\tPOINT(8.630288 50.112507)',
                 '895134215\t12\tEat & Drink\tLaube Liebe Hoffnungg\tPariser Straße Frankfurt am Main\tPOINT(8.632920 50.108670)'
               ].join('\n');

    var zip = new JSZip();
    zip.file("layer.wkt", file);
    var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
    
    cle.uploadLayer(demoExampleLayerIdForCLE, content, true, onUpload );
    predefinedExample(document.getElementById('layer-radio-button-cle')); //fill up the start, destination fields with the cle pre-defined example
  }

  function predefinedExample(input){

    var selectedValue = input.value;

    if (selectedValue === 'TRUCK_POI' || selectedValue === 'pde'){
      var startLocation = 'Frankfurt';   
      var destinationLocation = 'Frankfurt International Airport';
      var maxD = "180"; //minutes
      layerId = 'TRUCK_POI';
     
      document.getElementById('start').value = startLocation;
      document.getElementById('dest').value = destinationLocation;

      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';

      document.getElementById('max-detour-time').value =  maxD;
      document.getElementById("pdeExampleSelector").value = "TRUCK_POI";
      detourType = "time";
    } else if ( selectedValue === 'EVCHARGING_POI'){
      var startLocation = 'Staaken Berlin';   
      var destinationLocation = 'Brandenburg Airport Berlin';
      var maxD = "180"; //minutes
      layerId = 'EVCHARGING_POI';

      document.getElementById('start').value = startLocation;
      document.getElementById('dest').value = destinationLocation;

      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';

      document.getElementById('max-detour-time').value =  maxD;
      document.getElementById("pdeExampleSelector").value = "EVCHARGING_POI";
      detourType = "time";
    } else if ( selectedValue === 'FUELSTATION_POI'){
      var startLocation = 'Bodenseestrasse, Pasingen, Munich';   
      var destinationLocation = 'Kohlbeckstrasse Dachau';
      var maxD = "180"; //minutes
      layerId = 'FUELSTATION_POI';

      document.getElementById('start').value = startLocation;
      document.getElementById('dest').value = destinationLocation;

      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';

      document.getElementById('max-detour-time').value =  maxD;
      document.getElementById("pdeExampleSelector").value = "FUELSTATION_POI";
      detourType = "time";
    } else if ( selectedValue === 'PUBLIC_TRANSPORT_POI'){
      layerId = selectedValue;
      document.getElementById("pdeExampleSelector").value = selectedValue;
      document.getElementById('start').value = 'Frankfurt Hoechst';
      document.getElementById('dest').value = 'Frankfurt Hölderlinstrasse';
      detourType = "time";
      document.getElementById('max-detour-time').value = "180"; //minutes
      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';
    } else if ( selectedValue === 'POI_SMALL'){
      layerId = selectedValue;
      document.getElementById("pdeExampleSelector").value = selectedValue;
      document.getElementById('start').value = 'Darmstadt';
      document.getElementById('dest').value = 'Giessen';
      detourType = "time";
      document.getElementById('max-detour-time').value = "180"; //minutes
      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';
    } else if (selectedValue === 'cle'){
      var startLocation = 'Am Römerhof 35 Frankfurt';   
      var destinationLocation = 'Europa-Allee 130 Frankfurt';
      var maxD = "180"; //minutes
      layerId = 'EVCHARGING_POI';

      document.getElementById('start').value = startLocation;
      document.getElementById('dest').value = destinationLocation;

      document.getElementById("time-radio-button").checked = true;
      document.getElementById('max-detour-time').style.display = 'block';
      document.getElementById('max-detour-distance').style.display = 'none';

      document.getElementById('max-detour-time').value =  maxD;
      document.getElementById('layerId').value = demoExampleLayerIdForCLE;

      detourType = "time";
    }
  }

  function setLayerId(){
    if (document.getElementById("layer-radio-button-pde").checked){
      layerId = document.getElementById('pdeExampleSelector').value;
    } else{
      layerId = document.getElementById('layerId').value;
    }  
  }

    /*
    Display the success message if the upload was successfull otherwise the error message
    */
    function onUpload( url, resp, err ) {
        var uploadTxt =  "Upload Example Layer Result:" 
        if (err) {
            feedbackTxt.innerHTML = uploadTxt + '(ERROR!: '+ resp.issues[0].message + '['+resp.error_id+'])';
        } else {
            feedbackTxt.innerHTML = uploadTxt + '(Success: response_code='+ resp.response_code + ')';
            //calculate isoline route calculation after succfully uploading the demo CLE layer
            startRouteCalculation();
        }
    }

  /************************************
   Start Isoline Route Calculation
   ************************************/
  var startRouteCalculation = function () {
    clearLastRouteCalculation();
    geocode(start.value, true, calculateRouteIsoline);
  };
  routeButton.onclick = startRouteCalculation;

  /********************************************************
   Start/Destination selection via LongClick in map
   ********************************************************/
  function handleLongClickInMap(currentEvent) {
    var lastClickedPos = map.screenToGeo(currentEvent.currentPointer.viewportX, currentEvent.currentPointer.viewportY);

    if (bLongClickUseForStartPoint) {
      clearLastRouteCalculation();
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      start.value = line1;
      pointA = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (startMarker != null) {
        markerGroup.removeObject(startMarker);
      }
      startMarker = new H.map.Marker(pointA,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(startMarker);
      bLongClickUseForStartPoint = false;
    } else {
      var line1 = "" + lastClickedPos.lat + "," + lastClickedPos.lng;
      var line2 = null;
      dest.value = line1;
      pointB = new H.geo.Point(lastClickedPos.lat, lastClickedPos.lng)
      if (destMarker != null) {
        markerGroup.removeObject(destMarker);
      }
      destMarker = new H.map.Marker(pointB,
          {
            icon: createIconMarker(line1, line2)
          });
      markerGroup.addObject(destMarker);
      bLongClickUseForStartPoint = true;
    }
  }

  /************************************
   Geocode start/destination
   ************************************/
  function geocode(searchTerm, start, cb) {

    if(bubble){
      bubble.close();
    }

    //if no endpoint is provided then show an error message
    if( document.getElementById('serverURL').value === "" ) {
        alert("Please enter an endpoint.");
        return;
    }

    //set the layer id first
    setLayerId();
    //if no layer id is provided then show an error message
    if( !layerId) {
        alert("Please enter the layer id.");
        return;
    }

    //if no start point is provided then show an error message
    if( document.getElementById('start').value === "" ) {
        alert("Please enter the start point.");
        return;
    }

    //if no destination point is provided then show an error message
    if( document.getElementById('dest').value === "" ) {
        alert("Please enter the destination point.");
        return;
    }

    //add Geocoder Release information if not already done
    if (releaseGeocoderShown == false) {
      loadGeocoderVersionTxt();
      releaseGeocoderShown = true;
    }
    geocoder.search({
      searchText: searchTerm
    }, function (result) {
      var pos;
      if (result.Response.View[0].Result[0].Location != null) {
        pos = result.Response.View[0].Result[0].Location.DisplayPosition;
      } else {
        pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
      }

      if (start) pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
      else pointB = new H.geo.Point(pos.Latitude, pos.Longitude);

      if (result.Response.View[0].Result[0].Location != null) {
        address = result.Response.View[0].Result[0].Location.Address;
      } else {
        address = result.Response.View[0].Result[0].Place.Locations[0].Address;
      }

      line1 = pos.Latitude + " " + pos.Longitude;
      line2 = address.Label;

      if (start) {
        if (startMarker != null) {
          markerGroup.removeObject(startMarker);
        }
        startMarker = new H.map.Marker(pointA, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(startMarker);

      } else {
        if (destMarker != null) {
          markerGroup.removeObject(destMarker);
        }
        destMarker = new H.map.Marker(pointB, {
          icon: createIconMarker(line1, line2)
        });
        markerGroup.addObject(destMarker);
        map.getViewModel().setLookAtData({
				bounds: markerGroup.getBoundingBox()
		});
      }

      if (start) geocode(dest.value, false, cb);
      else cb(pointA, pointB);
    }, alert);
  }

   /************************************
   Actual Isoline Route Calculation
   ************************************/
  var calculateRouteIsoline = (function () {
    var layer;
    
    return function (start, destination) {
      if (layer) map.removeLayer(layer);
      //remove the existing geometry from the map if exist before starting a new isoline request
     geomGroup.removeAll();

     var params = {
          apiKey: api_key,
          waypoint0: start.lat + "," + start.lng, //enable these two waypoint0 and waypoint1 parameters once the CLE gets deployed to the PRD.
          waypoint1: destination.lat + "," + destination.lng,
          geom: 'local'
	 };

     params['max_detour_' + detourType] = document.getElementById('max-detour-' + detourType).value;

     var poiReqParams = {
        waypoint0: start.lat + "," + start.lng,
        waypoint1: destination.lat + "," + destination.lng,
        geom: 'local'
      };
      poiReqParams['max_detour_' + detourType] = document.getElementById('max-detour-' + detourType).value;

      feedbackTxt.innerHTML = 'Request sent, please wait...';
	  var url = document.getElementById('serverURL').value + '/calculaterouteisoline.json?' + Object.keys(params).map(function (k) {
          return k + '=' + params[k]
      }).join('&');
	  
	  var callbackF = jsonp(searchResponse, counter_recursion);
	  $.ajax({
			url : url,
			dataType : "jsonp",
			async : false,
			type : 'get',
			data : {
				callback: callbackF
			},
			jsonp: false,
			jsonpCallback:callbackF,
			success : function (data) {
				parseResponse(data);
			},
			error : function(xhr, status, e){
				console.log(e);
			}
		});
		
		function parseResponse(data){
			feedbackTxt.innerHTML = 'Response received successfully.';
			var features = data.geometries.map(function (g) {
				var coords = g.geometry.substring(12, g.geometry.length - 1).split(', ').map(function (p) {
				  return p.split(' ').map(parseFloat);
				});

				g.attributes.partOfRoute = g.partOfRoute;
				return {
				  type: 'Feature',
				  geometry: {
					type: 'LineString',
					coordinates: coords
				  },
				  properties: g.attributes
				};
           });
		  
		  feedbackTxt.innerHTML = 'Parsing recieved data.';
		  var polylines=[];
		  features.forEach(function (feature) {
				var strip= new H.geo.LineString();
				var geom = feature.geometry.coordinates;
				var partOfRoute = feature.properties.partOfRoute;
				for (var i = 0; i < geom.length ; i++) {
					strip.pushPoint({lat: geom[i][1], lng: geom[i][0]});
				 }
				var polyline = new H.map.Polyline(strip, { style:{
																lineWidth: partOfRoute ? 6 : 2,
																strokeColor: partOfRoute ? 'black' : '#488AC7',
															}
														  }
				);
				polylines.push(polyline);
				
		  });
		  group.addObjects(polylines);
		}	
		

      //simultaneously call routeisoline to get the POIs along the isoline route
      cle.searchRouteIsoline (layerId, poiReqParams, onCheckPositionChanged);



    }
  })();
  
  
    var counter_recursion = 0;
  	//using this wrapper function we can send back an additional argument with the callback.
	function jsonp(real_callback, arg) {
		var callback_name = 'jsonp_callback_' + Math.floor(Math.random() * 100000);
		window[callback_name] = function(response) {
			real_callback(response, arg);
			delete window[callback_name];  // Clean up after ourselves.
		};
		return callback_name;
	}
	
	var searchResponse = function(data, arr, pos) {
		//add Geocoder Release information if not already done
		if (releaseGeocoderShown== false){
			loadGeocoderVersionTxt();
			releaseGeocoderShown = true;
		}
	};

   // callback function for the isolineroute call
   function onCheckPositionChanged( url, resp, err ) {
        
        if (err) {
            feedbackTxt.innerHTML = 'Isoline POI Request received with an Error: ' + resp.issues[0].message + '['+resp.error_id+']';       
            return;
        }
        var geometryResponse = null;
       
        if (resp.response.route[0].searchResult.geometries != null) {
            geometryResponse = resp.response.route[0].searchResult.geometries
        } else {
            geometryResponse = resp.response.route[0].searchResult.geometries;
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

          //show the added geometry on the map
          map.addObject(geomGroup);
      }   
    }

    function addPolygonToGroup(poly, options) {
        var polygonStrip = new H.geo.LineString();
        var borderStrips = [new H.geo.LineString()];
        for (var k = 0; k < poly.length - 1; k++) {
            polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
            borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
            if (poly[k][2] === 'artificial') {
                borderStrips.push(new H.geo.LineString());
            }
        }
        // If the polygon was joining in non artificial points.
        if (k > 0 && !poly[k][2] && !poly[0][2]) {
          borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
        }

        var polygon = new H.map.Polygon(polygonStrip, options);
        geomGroup.addObject(polygon);
        for (var i = 0; i < borderStrips.length; i++) {
            var borderStrip = borderStrips[i];
            if (borderStrip.getPointCount() <= 1) continue;
            geomGroup.addObject(new H.map.Polyline(borderStrip));
        }
        return calculateCentroid(polygonStrip);
    }

    /**
    * show and hide the junction info based on the bubble open
    * and close event
    */
    bubble.addEventListener('statechange', function () {
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
            if (previousJunctionGroup && bubble.getState() === H.ui.InfoBubble.State.OPEN){ //close the previously opened junction
              if (previousJunctionGroup instanceof H.map.Group){
                previousJunctionGroup.setVisibility(false);
                if (junctionGroup) {
                  junctionGroup.setVisibility(true);
                  showFeedbackText("Selected POIs junction link is shown in red.", "Red");
                }
                previousJunctionGroup=junctionGroup;
              }
            }
            bubble.setContent(getBubbleContent(geometryObject));
            bubble.setPosition(e.target.getGeometry());
            if(junctionGroup) bubble.setData(junctionGroup);
            bubble.open();
        });

        geomGroup.addObject(marker);

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
              var polyLineCoordinates = new H.geo.LineString();  
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
        var lineStrip = new H.geo.LineString();
        for (var k = 0; k < line.length; k++) {
            lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
        }
        geomGroup.addObject(new H.map.Polyline(lineStrip));   
        return calculateCentroid(lineStrip);   
    }

    function getBubbleContent(geometryObject){
      var content = ('<h5>{POIAttributes}</h5><div class="attributes-body"><table class="isoline-record">' +
                     '{attributes}' +
                     '</table></div>');
      var timeAndDistanceContent = ('<h5>Detour from the main route</h5><table class="isoline-record">'+
                                    '{timeAndDistanceInfo}' +
                                    '</table>');
      var pdeDocumentationUrl = '<a target="_blank" class="isoline-record" href="https://tcs.ext.here.com/pde/layer?region=WEU&release=LATEST&url_root=pde.api.here.com&layer={layerId}">Read PDE layer documentation for details</a>';
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

      if (document.getElementById("layer-radio-button-pde").checked){
        content = content.replace('{POIAttributes}','PDE attributes for the selected POI');
        content+=pdeDocumentationUrl.replace('{layerId}',layerId);
      }else{
        content = content.replace('{POIAttributes}','CLE attributes for the selected POI');
      }

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

  //--- Helper - Create Start / Destination marker
  var createIconMarker = function (line1, line2) {
    var svgMarker = svgMarkerImage_Line;
    svgMarker = svgMarker.replace(/__line1__/g, line1);
    svgMarker = svgMarker.replace(/__line2__/g, (line2 != undefined ? line2 : ""));
    svgMarker = svgMarker.replace(/__width__/g, (line2 != undefined ? line2.length * 4 + 20 : (line1.length * 4 + 80)));
    svgMarker = svgMarker.replace(/__widthAll__/g, (line2 != undefined ? line2.length * 4 + 80 : (line1.length * 4 + 150)));
    return new H.map.Icon(svgMarker, {
      anchor: new H.math.Point(24, 57)
    });
  };