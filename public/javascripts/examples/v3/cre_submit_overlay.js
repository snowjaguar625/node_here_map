/*
	* @author Rohit Misra
	* (C) HERE 2017
	* Dom Schuette 
	* (C) HERE 2018
	*/
	
	// check URL Parameters
	var custom_app_id = getUrlParameter('app_id');
	var custom_app_code = getUrlParameter('app_code');
	var custom_mapname = getUrlParameter('mapname');
	// user appid / appcode from url if available
	if( custom_app_id !== null && custom_app_code !== null )
	{
		app_id = custom_app_id;
		app_code = custom_app_code;
		document.getElementById("customAppId").value = app_id;
		document.getElementById("customAppCode").value = app_code;
	}

	// custom map name is used as Overlay name
	if( custom_mapname !== null)
	{
		document.getElementById('mapname').value = custom_mapname;
	}
	var mapname = document.getElementById('mapname');
	
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
	var secure = (location.protocol === 'https:') ? true : false; // check if the site was loaded via secure connection
	
	// init map
	var mapContainer = document.getElementById('mapContainer'),
		platform = new H.service.Platform({app_code: app_code, app_id: app_id, useHTTPS: secure}),
		maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		group = new H.map.Group(),
		map = new H.Map(mapContainer, maptypes.normal.map, { center: new H.geo.Point(50.107890,8.687840), zoom: 17 });

	map.getViewPort().setPadding(0, 0, 0, $('.ctrl-panel').width());	// Do not draw under control panel
	var ui = H.ui.UI.createDefault(map, maptypes);	// add UI
	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	var roadShapes = [];
	var mapMatchedRoadShapes = [];
	var currentRoadShape = null;
	var growingStrip = new H.geo.Strip();
	var roadCreated = false;
	var underConstruction = false;
	var uTurn = false;
	var overlayGroup = new H.map.Group();
	
	// Some style definations to be used with different map objects
	var NORMAL_STYLE = {
		strokeColor: "#f00",
		lineWidth: 1
	};
	var SELECTED_STYLE = {
		strokeColor: "#000000",
		lineWidth: 7,
		fillColor:  "#000000"
	};

	var ROAD_STYLE0 = {
		strokeColor: "#3f59a7",
		lineWidth: 7,
		fillColor:  "#f01"
	}
	var ROAD_STYLE1 = {
		strokeColor: "#ec610e",
		lineWidth: 7,
		fillColor:  "#f01"
	};

	var ROAD_STYLE2 = {
		strokeColor: "#fab800",
		lineWidth: 7,
		fillColor:  "#f01"
	};

	var ROAD_STYLE3 = {
		strokeColor: "#52a3db",
		lineWidth: 7,
		fillColor:  "#f01"
	};

	var ROAD_STYLE4 = {
		strokeColor: "#673a93",
		lineWidth: 7,
		fillColor:  "#f01"
	};

	var ROAD_STYLE5 = {
		strokeColor: "#48dad0",
		lineWidth: 7,
		fillColor:  "#f01"
	};
	var ROAD_STYLE6 = {
		strokeColor: "#00908a",
		lineWidth: 7,
		fillColor:  "#f01"
	};
	

	var SELECTED_STYLE = {
		strokeColor: '#',
		lineWidth: 2
	};

	var roadEdits = [];
	var overlaySpecs = {};
	
	/**
	* Converts into json format the provided 
	* data. Json format deailts for CRE available in
	* documentation 
	* https://developer.here.com/documentation/custom-routing-extension/topics/overlay-description-format.html
	**/
	function overlaySpec(op, shape, layer, data){
		this.op = op;
		this.shape = shape;
		this.layer = layer;
		this.data = data;

		this.getOverlaySpecString = function(){
			return JSON.stringify(this);
		};
	}

	var endpoint = document.getElementById('endpoint');

	// Attributes which could be edited for Link using Custom Route API
	var attributeObj = {
			LINK_ATTRIBUTE_FCN: "VEHICLE_TYPES,TRAVEL_DIRECTION",
			TRUCK_RESTR_FCN: "VEHICLE_TYPES,TIME_OVERRIDE,WEIGHT_RESTRICTION,HEIGHT_RESTRICTION,LENGTH_RESTRICTION,WIDTH_RESTRICTION,MAX_WEIGHT_PER_AXLE,NUMBER_OF_AXLES,KPRA_LENGTH,HAZARDOUS_MATERIAL_TYPE,HAZMAT_PERMIT_REQUIRED,TRAILER_TYPE,PHYSICAL_STRUCTURE_TYPE,TRANSPORT_SPEED_LIMIT,TRANSPORT_SPEED_TYPE,SPEED_LIMIT_TYPE,WEIGHT_DEPENDENT,WEATHER_TYPE,PREFERRED_ROUTE_TYPE,tunnelCategory" 
	};

	// Hide - show the Usage guide
	$(".show-more a").on("click", function() {
            var $this = $(this); 
            var $content = $this.parent().siblings(".content");
            
            if($content.hasClass("hideContent")){
                $content.switchClass("hideContent", "showContent", 400);
            } else {
                $content.switchClass("showContent", "hideContent", 400);
            };
			
			// required to ensure if any window size change occur because of the panel
			// the map is adjusted to avoid blank areas on the screen
			setTimeout(function(){ map.getViewPort().resize(); }, 500);
			
			
        });

	var polygonOptions = {style: NORMAL_STYLE};
	var roadDisplayOptions = [{style: ROAD_STYLE0}, {style: ROAD_STYLE1}, {style: ROAD_STYLE2}, {style: ROAD_STYLE3}, {style: ROAD_STYLE4}, {style: ROAD_STYLE5}, {style: ROAD_STYLE6}];
	var routingMode = true;
	var currClickedviewportX = null;
	var currClickedviewportY = null;
	var lockGrowingShape = false;
	var tempMarkersGroup = new H.map.Group();
	var matchedTracePointGroup = new H.map.Group(); //group which will contain the matched trace point as delivered by RME
	var DEFAULT_OFFSET_STYLE = {lineWidth: 1, strokeColor: 'red', lineJoin: 'round'};
	var DEFAULT_TRACE_STYLE = {lineWidth: 1, strokeColor: 'black', lineJoin: 'round'};
	var	objContainer = new H.map.Group();
	map.addObject(tempMarkersGroup);
	
	// add context menu listner (mouse right click) 
    map.addEventListener('contextmenu', function(e){
		lockGrowingShape = true;
		currClickedviewportX = e.viewportX;
		currClickedviewportY = e.viewportY;
        clickCoords = map.screenToGeo(e.viewportX, e.viewportY);
		// add routing options if in routing mode
        if (routingMode) {
            e.items.push(new H.util.ContextItem({
                label: 'Route from here',
                callback: function(){
                    removeObjects(false);
                    waypoint_first = clickCoords;
                    firstMarker = addMarker(clickCoords);
                    waypoint_last = "";
                    
                }
            }));
            // Provide destination option when start already added.
			if(firstMarker){
				e.items.push(new H.util.ContextItem({
					label: 'Route to here (car)',
					callback: function(){
						removeObjects(true);
						waypoint_last = clickCoords;
						lastMarker = addMarker(clickCoords);
						calculateRouteFromAtoB('car');
						routeNotCalculated = false;
					}
				}));
				e.items.push(new H.util.ContextItem({
					label: 'Route to here (truck)',
					callback: function(){
						removeObjects(true);
						waypoint_last = clickCoords;
						lastMarker = addMarker(clickCoords);
						calculateRouteFromAtoB('truck');
						routeNotCalculated = false;
					}
				}));
			}
			if(lastRouteURL!=""){
				e.items.push(new H.util.ContextItem({
					label: 'Re-calculate last route',
					callback: function(){
						removeObjects(true);
						reCalculateRoute();
						routeNotCalculated = false;
					}
				}));	
			}
        }
        else {
				
				// Add right click options for adding shape
				if(underConstruction){
					// show finalize option only if more than 2 points are added
					if(currRoadShapeArr.length > 1){
						e.items.push(new H.util.ContextItem({
									label: 'Finalize shape',
									callback: function(){
										if(currentRoadShape)
										map.removeObject(currentRoadShape);// will be added as a group
										var ifBeforeInsertingRoad = roadShapes.length +1;
										addRoad(roadShapes.length +1  , currRoadShapeArr, true,true);
										mapMatch(ifBeforeInsertingRoad, "finalize"); //map match the inserted point
										currRoadShapeArr = [];
										
										currentRoadShape = null;
										underConstruction = false;
										lockGrowingShape = false;
									}
									
						}));
						e.items.push(new H.util.ContextItem({
									label: 'Finalize shape map matched',
									callback: function(){
										 if(currentRoadShape)
										map.removeObject(currentRoadShape);// will be added as a group
										mapMatch(roadShapes.length +1, "finalize_with_map_match"); //map match the inserted point
										currRoadShapeArr = [];
										
										currentRoadShape = null;
										underConstruction = false;
										lockGrowingShape = false;
									}
								
						}));
					}
				}else{
					 // show add shape option 
				   e.items.push(new H.util.ContextItem({
						label: 'Add shape point',
						callback: function(){
							if(!underConstruction){
								roadEdits.push(new H.geo.Strip());
								roadEdits[roadEdits.length-1].id = roadEdits.length;
								roadEdits[roadEdits.length-1].pushPoint(map.screenToGeo(currClickedviewportX, currClickedviewportY));
								currRoadShapeArr.push([map.screenToGeo(currClickedviewportX, currClickedviewportY).lat, map.screenToGeo(currClickedviewportX, currClickedviewportY).lng]);
								mapMatch(); //map match the inserted point
								
							}
							underConstruction = true;
							lockGrowingShape = false;
							var handleMarker = new H.map.Marker(map.screenToGeo(currClickedviewportX, currClickedviewportY),{
									icon: new H.map.Icon(markerSVG1.replace(/__NO__/g, roadShapes.length +1).replace(/__NO2__/g, ""))
								});
							tempMarkersGroup.addObject(handleMarker);
						}
					}));
				}
				
			  
			
		}
		
		
		// this ensures right click on a marker
		// does not show the 'Add Shape' option
		var isDeletePresent = false;
		for (var index in e.items) {
			if(e.items[index].getLabel() == "Delete Road"){
				isDeletePresent = true;
			}
		}
		// if delete option is found remove the last option 
		// which is the Add shape option
		if(isDeletePresent){
			e.items.pop();
		}
		
		
	});
	
	addMapEvents();
	
	/**
	* Function adds event listener on the map
	*/
	function addMapEvents(){
			// Add tap event to add shapes for custom links
			map.addEventListener('tap', initializeOraddPointToPolygon);
			
			// Add mouse-move listner to show polyline 
			map.addEventListener('pointermove', refreshNonFinalizedPolygon);
	}


	// disable double tap zoom
	var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
  	behavior.disable(H.mapevents.Behavior.DBLTAPZOOM);

	var roadGroups = [];
	
	/**
	* Clears map based on provided paramters
	* retainSampleCombo : if passed true the Road selecteor is not reset
	* retainMapMatchedGroups : if passed true the map matched data is cleared
	**/
	function clearMap(retainSampleCombo, retainMapMatchedGroups){
		roadGroups.forEach(function (val, idx){
			val.removeAll();
		});
		routingGroup.removeAll();
		roadGroups = [];
		roadShapes = [];
		roadEdits = [];
		if(overlayGroup) overlayGroup.removeAll();
		document.getElementById("overlay-def-container").innerHTML = ""
		document.getElementById("feedbackTxt").innerHTML = "";
		if(!retainSampleCombo){
			document.getElementById("sampleSelector").selectedIndex = 0;
		}
		
		// remove all road selector items added
		var selectobject = document.getElementById("roadSelector");
		selectobject.selectedIndex = 0;
		
		for (var i=selectobject.length-1; i>0; i--){
			if (i > 0){
				selectobject.remove(i);
			}
		}

		if (retainMapMatchedGroups){ //remove all the groups which display the map matching points/links

			if (mapMatchedRoadGroups){
				for (var m=0; m<mapMatchedRoadGroups.length; m++){
					mapMatchedRoadGroups[m].removeAll();
				}
				mapMatchedRoadGroups = [];
				mapMatchedRoadShapes = [];
			}

		}

	}

	/**
	* Function to add row to Panel when custom links/roads are added
	* Id : Id of the new road/link
	* roadShapeArr : Shape of the road in an array
	* showMapMatch : if passed true then "Map Match" option is shown in panel
	**/
	function addRowToContainer(id, roadShapeArr,showMapMatch){
		// A container div to be added to panel
		var container = document.getElementById("overlay-def-container");
		
		var header =  document.createElement("p");
		var iconDivElem = document.createElement("div");
		iconDivElem.id = 'container-block-'+id;
		var iconDiv = "";
		iconDiv+='<div>';
		
		iconDiv+=markerSVG1.replace(/__NO__/g, id).replace(/#1188DD/g, roadDisplayOptions[id%6].style.strokeColor);
		iconDiv+="<label for='shape-"+ id +"'>Shape of Road:</label>"
		iconDiv+='<input class="form-control col-sm-4 dropdown-toggle" type="text" id="shape' +'-'+ id +  '" size="10" value=""/><br>';
		iconDiv+='<input class="btn btn-default btn-xs" type="button" id="applyShapeChange" value="Apply" onclick="applyShapeEdit(' + id + ');">';
		
		// only show the map match option if road added via the "Add shape option"
		if(showMapMatch)
		iconDiv+='<input class="btn btn-default btn-xs" type="button" id="applyMapMatchResult" '+
					'value="Apply map match result" onclick="applyMapMatchToRoad(' + id + ');"><br>';

		iconDivElem.innerHTML= iconDiv;
		container.appendChild(iconDivElem);
		
		var formContainer = document.createElement("div");
		formContainer.id = "container-"+id;
		
        // Create an <input> element, set its type and name attributes
		var opInput = document.createElement("div");
		opInput.className = "form-group";
		
		// Options for newly added road
		var opDd = "";
		opDd+="<label for='op-"+ id +"'><b>3. Create as a new road or Modify existing road?</b></label>"
		opDd+="<select class='form-control' id='op-"+ id +"' onchange=\"operationChanged(\'"+id+"\')\">"
		opDd+="<option value='create'>New road</option>";
		opDd+="<option value='override'>Modify or block road</option>";
		opDd+="</select>";
		opInput.innerHTML = opDd;
		formContainer.appendChild(opInput);
		var formSubContainer = document.createElement("div");
		formSubContainer.id = "sub-container-"+id;
		formContainer.appendChild(formSubContainer);
		
		container.appendChild(formContainer);
		
		// show the shape in json format on the panel
		document.getElementById("shape-"+id).value=JSON.stringify(generateShapeFromRoadGroup(id)).replace(/"/g,"");
		operationChanged(id);
	}

	/**
	** Function applies the shape added as 'free text' in panel
	**/
	function applyShapeEdit(id){
		addRoad(id, JSON.parse(document.getElementById("shape-"+id).value), true,true);
	}

	/** 
	* Function applies the map match result (coordinates) to an existing road
	**/
	function applyMapMatchToRoad(id){
		var polyLineForSelectedRoad = mapMatchedRoadShapes[id - 1];
		// if not previsouly map matched , retrieve the coordinates for each mat-matched way point
		if (polyLineForSelectedRoad){
			document.getElementById("shape-"+id).value = generateJSONStringFromPolyLine(polyLineForSelectedRoad);
			addRoad(id, JSON.parse(document.getElementById("shape-"+id).value), true,true);
		}else{
			alert("Map matching result does not exist for the selected road, please use the entered coordinates instead.")
		}
	}

	/**
	* Function is triggered if any of the Road/Link value is changed in the panel
	**/
	function operationChanged(id){
		var formContainer = document.getElementById('sub-container-'+id);
		formContainer.innerHTML = "";
		
		// options to select which Link data/attribute to add/update
		var layerInput = document.createElement("div");
		layerInput.className = "form-group";
		var layerDd = "";
		layerDd+="<label for='layer-"+ id +"'>What properties to modify?</label>"
		layerDd+="<select class='form-control' id='layer-"+ id +"' onchange=\"attachAttributeForm(\'"+id+"\')\">"
		layerDd+="<option></option>";
		layerDd+="<option value='LINK_ATTRIBUTE_FCN'>Link Attributes (Block, change access, driving direction)</option>";
		layerDd+="<option value='TRUCK_RESTR_FCN'>Truck restrictions</option>";
		layerDd+="</select>"
		layerInput.innerHTML = layerDd;
		formContainer.appendChild(layerInput);

		// Radio boxes for Link Access Attributes
		var dataInput = document.createElement("div");
		var dataDdEditable = "";
		dataDdEditable+="<label for='mode-"+ id +"'>Make changes to link(s)</label><br>";
		dataDdEditable+="<input type='radio' name='mode-"+ id +"' value='quick' onclick='modechange(this)'>Simple&nbsp&nbsp&nbsp";
		dataDdEditable+="<input type='radio' name='mode-"+ id +"' value='advanced' onclick='modechange(this)'>Advanced<br><br>";
		
		dataDdEditable+="<div class='form-group' id='quickchange-"+ id +"' style='display:none'>"
		dataDdEditable+="<label for='quickchange-vehicle-types-"+ id +"'>Select vehicle types to allow:</label><br>";

		// Access attribute for car, truck, pedestriaion or all 
		dataDdEditable+="<input type='checkbox' name='quickchange-vehicle-types-"+ 
				id +"' value='1' alt='car' onclick='quickvehiclechange(this)'>Car<br>";
		dataDdEditable+="<input type='checkbox' name='quickchange-vehicle-types-"+ 
				id +"' value='32' alt='truck' onclick='quickvehiclechange(this)'>Truck<br>";
		dataDdEditable+="<input type='checkbox' name='quickchange-vehicle-types-"+ 
				id +"' value='16' alt='pedestrian' onclick='quickvehiclechange(this)'>Pedestrian<br>";
		dataDdEditable+="<input type='checkbox' name='quickchange-vehicle-types-"+
				id +"' value='0' alt='none' onclick='clearVehicleChange(this)'>None(Block all)<br>";

		// Travel direction update
		dataDdEditable+="<label for='quickchange-vehicle-types-"+ 
				id +"'>Select Travel direction:</label><br>";
		dataDdEditable+="<input type='radio' id='traveldir-FORWARD-"+ 
				id +"' name='quickchange-traveldir-"+ id +"' value='FORWARD' alt='car' onclick='quicktraveldir(this)'>FORWARD<br>";
		dataDdEditable+="<input type='radio' id='traveldir-BACKWARD-"+ id +"' name='quickchange-traveldir-"+ id +"' value='BACKWARD' alt='truck' onclick='quicktraveldir(this)'>BACKWARD<br>";
		dataDdEditable+="<input type='radio' id='traveldir-BOTH-"+ id +"' name='quickchange-traveldir-"+ id +"' value='BOTH' alt='pedestrian' onclick='quicktraveldir(this)'>BOTH<br>";
		dataDdEditable+="</div>"

		
		dataDdEditable+="<div class='form-group' id='attribute-"+ id +"' style='display:none'>"
		dataDdEditable+="<label for='attribute-"+ id +"'>Select Attribute to Override:</label>";
		dataDdEditable+="</div>"
		dataDdEditable+="<div id='attributecontainer-"+ id+"'>";
		dataDdEditable+="</div>";
		dataDdEditable+="<br><br>";
		
		// Add the elements to the panel
		dataInput.innerHTML = dataDdEditable;
		dataInput.id = "attributeDiv-"+id;
		formContainer.appendChild(dataInput);
		document.getElementById("attributeDiv-"+id).style.display = "none";
	}

	/**
	* Function call when selecting 'Overlay'/'Routing' radio button
	**/
	function editmode(that){
		if(that.value =='samples'){
			document.getElementById('shape-chooser').style.display = "block";
			document.getElementById('shape-drawing').style.display = "none";
			document.getElementById('shape-text-area').style.display = "none";
		}
		else if(that.value =='drawing'){
			document.getElementById('shape-chooser').style.display = "none";
			document.getElementById('shape-drawing').style.display = "block";
			document.getElementById('shape-text-area').style.display = "none";
			var other = document.getElementsByName('rightclick-mode');
			other[1].checked = true;
			rightclickchooser();
		}
		else if(that.value =='text'){
			document.getElementById('shape-chooser').style.display = "none";
			document.getElementById('shape-drawing').style.display = "none";
			document.getElementById('shape-text-area').style.display = "block";
		}
	}
	
	/**
	* Function updates flags which are used to deine the right click options
	**/
	function rightclickchooser(){
	    
		var that = document.getElementsByName('rightclick-mode');
		if(that[0].checked){
			routingMode = true;
			document.getElementById('shape-mode').style.display = 'none';
			document.getElementById('routing-info').style.display = 'block';
		}
		else if(that[1].checked){
			routingMode = false;
			document.getElementById('shape-mode').style.display = 'block';
			document.getElementById('routing-info').style.display = 'none';
		}
		
	}

	/**
	* Function resets the values if link is blocked for all vehicle types
	**/
	function clearVehicleChange(that){
		var inputs = document.getElementsByName(that.name);
		for(var idx in inputs){
			if(inputs[idx].checked && inputs[idx].value=='0'){
				document.getElementById("VEHICLE_TYPES-LINK_ATTRIBUTE_FCN-"+that.name.substring(26)).value = 0;
			}if(inputs[idx].checked && inputs[idx].value!='0'){
				inputs[idx].checked = false;
			}
		}
	}

	/**
	* Function sets the values if link is blocked for one or more vehicle types
	**/
	function quickvehiclechange(that){
		var inputs = document.getElementsByName(that.name);
		
		var vehicleMask = 0;
		for(var idx in inputs){
			if(inputs[idx].checked){
				vehicleMask += parseInt(inputs[idx].value);
			}
			if(inputs[idx].value=="0"){
				inputs[idx].checked = false;
			}
		}
		if(vehicleMask>0){
			document.getElementById("VEHICLE_TYPES-LINK_ATTRIBUTE_FCN-"+that.name.substring(26)).value = vehicleMask;
		}
	}
	
	/**
	* Function sets the values if link travelling direction is updated
	**/
	function quicktraveldir(that){
		var inputs = document.getElementsByName(that.name);
		var splitStr = that.name.split('-');
		var vehicleMask = 0;
		for(var idx in inputs){
			if(inputs[idx].checked){
				document.getElementById('TRAVEL_DIRECTION-LINK_ATTRIBUTE_FCN-'+	splitStr[splitStr.length-1]).value = inputs[idx].value;
				addDirectionArrows(splitStr[splitStr.length-1], inputs[idx].value);
				return;
			}
		}
	}

	/**
	* Function updates the panel when Simple/Advanced option is selected for
	* Link attributes
	**/
	function modechange(that){
		if(that.value=='advanced'){
			document.getElementById("attribute-"+that.name.substring(5)).style.display = "block";
			document.getElementById("quickchange-"+that.name.substring(5)).style.display = "none";
		}else{
			if(document.getElementById("layer-"+that.name.substring(5)).value != 'TRUCK_RESTR_FCN'){
				document.getElementById("quickchange-"+that.name.substring(5)).style.display = "block";
			}
			document.getElementById("attribute-"+that.name.substring(5)).style.display = "none";
		}
	}
	
	/**
	* Function called when an update in the settings in panel occurs
	**/
	function attachAttributeForm(id){
		var layerName = document.getElementById("layer-"+id).value;
		if(layerName){
			document.getElementById("attribute-"+id).innerHTML = getAttributeOptions(layerName, id);
			if(document.getElementById("layer-"+id).value == "LINK_ATTRIBUTE_FCN"){
				document.getElementsByName('mode-'+id)[0].checked = true;
				document.getElementsByName('mode-'+id)[0].onclick();
				//No travel direction in case of Truck Restrictions layer
				document.getElementsByName("quickchange-traveldir-"+id)[2].checked = true;
				document.getElementsByName("quickchange-traveldir-"+id)[2].onclick(id);
			}else{
				document.getElementsByName('mode-'+id)[1].checked = true;
				document.getElementsByName('mode-'+id)[1].onclick();
			}

			
		}
	}

	/**
	* Gets the attribute value from a layer with the provided Id
	**/
	function getAttributeOptions(layerName, id){
		document.getElementById("attributeDiv-"+id).style.display = "block";
		if(layerName == "TRUCK_RESTR_FCN"){
			document.getElementById("quickchange-"+id).style.display = "none";
		}
		var attributeHTML = '';
		attributes = attributeObj[layerName].split(",");
		for(var i=0; i<attributes.length; i++){
			attributeHTML+= '<label class="control-label col-sm-6" for="mapname">'+ attributes[i] +'</label>';
            attributeHTML+= '<div class="col-sm-4 input-group dropdown">';
            attributeHTML+=		'<input class="form-control col-sm-4 dropdown-toggle" type="text" id="'+ attributes[i] + '-' + layerName + '-'  + id +  '" size="10" value=""/>';
			attributeHTML+= '<ul class="dropdown-menu">';
			attributeHTML+= getAttributeValueOptions(attributes[i], id, layerName);
			attributeHTML+= "</ul>";
			attributeHTML+= "<span role='button' class='input-group-addon dropdown-toggle' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'><span class='caret'></span></span></div>";
            attributeHTML+= '</div>'
		}
		return attributeHTML;
	}

	/**
	* Gets the attribute value from a layer with the provided Id, attributeName
	**/
	function getAttributeValueOptions(attributeName, id, layerName){
		var attributeValuesObj = {
			VEHICLE_TYPES: "car,truck,pedestrian",
			TRAVEL_DIRECTION: "FORWARD,BACKWARD,BOTH",
			CONDITION_TYPE: "",
			WEIGHT_RESTRICTION:"2.5t,3.5t",
			HEIGHT_RESTRICTION: "2m,3m"
		};
		var attributeValueHTML = "";
		if(attributeValuesObj[attributeName]){
			attributeValues = attributeValuesObj[attributeName].split(",");
			for(var i=0; i<attributeValues.length; i++){
				attributeValueHTML+= "<li><a href='#' onclick='changeExample(this)' road-id='"+
					id +"'  data-value='"+ attributeName + "-" + layerName + "-"  + id +"'>"+ attributeValues[i] +"</a></li>";
			}
		}
		
		return attributeValueHTML;

	}

	/**
	* Function called when an example is selected from drop down
	**/
	function changeExample(drop){
		document.getElementById(drop.getAttribute("data-value")).value = drop.innerText;
	}

	/**
	* Function creates an object for pre-defined examples
	**/
	function sampleObj(sampleText, overlay_specs){
		this.sampleText = sampleText;
		this.overlay_specs = overlay_specs;
	}

	// Pre-defined examples
	var samples = {
					mainRiver : new sampleObj("Add a bridge on the Main river and block another one", 
												[{ "op": "override", "shape": [
															[50.10765, 8.68774],
															[50.10914, 8.68771]
														], "layer": "LINK_ATTRIBUTE_FCN", "data": { "VEHICLE_TYPES": "0" } 
													}, 
													{ "op": "create", "shape": [
															[50.10937, 8.68422],
															[50.10807, 8.68525],
															[50.10737, 8.68387]
														], "data": { "NAMES": "ENGBNDemo Road" } 
													}, {
													  "op": "create","shape": [
															[50.109498, 8.685869],
															[50.107469, 8.685751]
														], "layer": "LINK_ATTRIBUTE_FCN",
														"data": {
															"TRAVEL_DIRECTION": "BACKWARD"
														}
													}
												]
											),
					mainRiver2 : new sampleObj("Add another bridge on the Main river and block another one",
												[{ "op": "override", "shape": [
															[50.10765, 8.68774],
															[50.10914, 8.68771]
														], "layer": "LINK_ATTRIBUTE_FCN", "data": { "VEHICLE_TYPES": "0" } 
													}, 
													{ "op": "create", "shape":[
															[50.109518,8.689234],
															[50.107858,8.689065],
															[50.107205,8.688175]											
														], "data": { "NAMES": "ENGBNDemo1 Road" } 
													}
												]
												 ),
					zeilStreet : new sampleObj("Zeil Street", 
												[{ "op": "override", "shape": [
													[50.114741, 8.687676],
													[50.114738, 8.687214],
													[50.114738, 8.686732],
													[50.114731, 8.686356],
													[50.114745, 8.685771],
													[50.114762, 8.685353],
													[50.114769, 8.684940],
													[50.114776, 8.684827],
													[50.114858, 8.684833]
    											], "layer": "LINK_ATTRIBUTE_FCN", "data": { "VEHICLE_TYPES": "car,truck,pedestrian", "TRAVEL_DIRECTION": "BOTH" } }
												]
											),
					oneWayExampleFfm: new sampleObj("Convert a one way street to two way in Frankfurt",
												 [{ "op": "override", "shape": [
													[50.132306, 8.615628],
													[50.131150, 8.618176]
												 ], "layer": "LINK_ATTRIBUTE_FCN", "data": { "TRAVEL_DIRECTION": "BACKWARD" } }
												 ]
											),
					swissRoadBlock: new sampleObj("Block a road due to Snow and create a road network", 
												 [{"op":"override","shape":[
													 [46.996328,7.726329],
													 [46.994454,7.728647],
													 [46.990473,7.734226],
													 [46.989771,7.734998],
													 [46.987956,7.736200],
													 [46.985790,7.737573],
													 [46.981339,7.739547],
													 [46.979056,7.740405],
													 [46.979056,7.740405],
													 [46.978060,7.740234]
													 ], "layer":"LINK_ATTRIBUTE_FCN", "data":{"VEHICLE_TYPES":"0"} },
												{"op":"create","shape":[
													[46.997600,7.723447],[46.998947,7.725013],[46.998947,7.726472],[46.998260,7.727573],[46.997689,7.728797],[46.996899,7.728925],[46.996021,7.728539],[46.995523,7.728260],[46.995186,7.728797],[46.994338,7.729429],[46.994506,7.729737],[46.994918,7.730225],[46.995419,7.730716],[46.995742,7.730535],[46.996021,7.730642],[46.996606,7.730513],[46.997118,7.730749],[46.997645,7.730663],[46.997996,7.730427],[46.997835,7.729977],[46.997221,7.729633],[46.997206,7.729333],[46.997747,7.729075],[46.996943,7.729118],[46.996079,7.729075],[46.995567,7.729033],[46.995201,7.729462],[46.995186,7.729891],[46.995596,7.730127]] }
												]
											),
					fraNoTruck: new sampleObj("Allow trucks through blocked street",
											  [{"op":"override","shape":[
												  [50.105717,8.633522],
												  [50.105879,8.633532],
												  [50.105910,8.633500],
												  [50.105979,8.633254],
												  [50.106846,8.629246]
												  ],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"33"}}
											   ]
											),
					neckarWestHeim : new sampleObj("Private Facility", 
											  [{"op":"create","shape":[
												  [49.037591,9.171666],
												  [49.039012,9.170829],
												  [49.03852,9.177116],
												  [49.040025,9.175228],
												  [49.040165,9.171966],
												  [49.041684,9.174284],
												  [49.0434,9.175078]]
											  },
											  {"op":"create","shape":[
												 [49.039884,9.179798],
												 [49.043398,9.17509]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"BACKWARD"}
											  },
											  {"op":"create","shape":[
												 [49.0419,9.177114],
												 [49.043329,9.181164],
												 [49.045411,9.182859]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"FORWARD"}
											  },
											  {"op":"create","shape":[
												 [49.045406,9.182843],
												 [49.045805,9.179583]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"FORWARD"}
											  },
											  {"op":"create","shape":[
												  [49.0458,9.179594],
												  [49.04412,9.179192],
												  [49.043712,9.17651]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"FORWARD"}
											  },
											  {"op":"create","shape":[
												  [49.043396,9.175104],
												  [49.043711,9.176504]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"BACKWARD"}
											  },
											  {"op":"create","shape":[
												  [49.043726,9.176564],
												  [49.048192,9.178887],
												  [49.045408,9.187513]],
												 "layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"0","TRAVEL_DIRECTION":"FORWARD"}
											  }]
											),
				daimlerWoerth: new sampleObj("Daimler Wörth", [{"op":"override","shape":[[49.0435,8.28255],[49.04358,8.28254],[49.04362,8.28253],[49.04367,8.28248],[49.04369,8.28238],[49.04371,8.28219],[49.04377,8.2817],[49.04378,8.28157],[49.04377,8.28143],[49.04374,8.28137]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.04341,8.28254],[49.04344,8.28244],[49.04347,8.28219],[49.04348,8.28186],[49.04351,8.28164],[49.04355,8.28149],[49.04363,8.28137],[49.04368,8.28135],[49.04374,8.28137]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BACKWARD"}},{"op":"override","shape":[[49.043838,8.285887],[49.043922,8.285848],[49.043954,8.285796],[49.043966,8.285615],[49.043997,8.285064],[49.043975,8.284478],[49.043971,8.284435],[49.043971,8.284435]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.04325,8.28368],[49.0433,8.28406],[49.0434,8.28447],[49.04349,8.28487],[49.0436,8.28539],[49.04368,8.28568],[49.04376,8.28586],[49.04384,8.28589]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"override","shape":[[49.04325,8.28368],[49.04341,8.28374],[49.04373,8.28381],[49.04385,8.28386],[49.04392,8.28403],[49.04398,8.28449]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BACKWARD"}},{"op":"create","shape":[[49.043977,8.285306],[49.043589,8.285263]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.043989,8.284918],[49.043502,8.284868],[49.043502,8.284868]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.043985,8.284564],[49.043415,8.284499],[49.043415,8.284499]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.043938,8.284178],[49.043323,8.28411],[49.043323,8.28411]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.043348,8.283017],[49.046378,8.283499],[49.046505,8.280055],[49.04467,8.279841],[49.04467,8.279841]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.044682,8.27982],[49.044485,8.282706],[49.043894,8.282609]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.044675,8.279819],[49.04438,8.27998],[49.044155,8.280345],[49.044035,8.28072],[49.043965,8.28116],[49.043902,8.281804],[49.043803,8.28307],[49.043396,8.282995],[49.043396,8.282995]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.046498,8.280557],[49.046825,8.280584],[49.046638,8.284071],[49.046382,8.284039],[49.046382,8.284039]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.046371,8.283527],[49.0459,8.291262],[49.0459,8.291262]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.046364,8.284171],[49.046634,8.284203],[49.046634,8.284203]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.046497,8.28628],[49.046227,8.286243]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.046324,8.284534],[49.045422,8.284448]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045283,8.286736],[49.046193,8.286828]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.045694,8.286835],[49.045722,8.285976]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045295,8.291222],[49.045556,8.286812]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.045204,8.287756],[49.045496,8.287783],[49.045496,8.287783]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.044276,8.285301],[49.045338,8.285424]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.044265,8.285814],[49.045324,8.285942]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.044227,8.286553],[49.045274,8.286679]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.04617,8.287152],[49.046458,8.287185],[49.046458,8.287185]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.04602,8.289437],[49.046343,8.28947],[49.046343,8.289459]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.04692,8.278719],[49.046821,8.280017]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.048447,8.282037],[49.048778,8.282059]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.048361,8.28434],[49.04865,8.284383]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.048158,8.287365],[49.048474,8.28743]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.048158,8.287365],[49.048474,8.28743]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.049233,8.289844],[49.04834,8.289736]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.049479,8.285329],[49.048596,8.285206]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.049639,8.291732],[49.049477,8.294607],[49.050651,8.294757]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049634,8.293245],[49.050716,8.293384]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.050722,8.293433],[49.051703,8.293545]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.051635,8.29488],[49.051786,8.292005]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.051773,8.292325],[49.050803,8.29218]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"override","shape":[[49.050651,8.294755],[49.051646,8.294895]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.050797,8.292239],[49.051785,8.292346],[49.052759,8.292453]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"override","shape":[[49.052365,8.294802],[49.052555,8.294357],[49.052668,8.293659],[49.052773,8.292136]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.05165,8.294897],[49.051836,8.295144],[49.052001,8.295262],[49.052124,8.295181],[49.052367,8.294832],[49.052367,8.294832]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.051351,8.283749],[49.05153,8.280665],[49.05153,8.280665]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.053474,8.280886],[49.053439,8.281454]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.053341,8.283338],[49.053292,8.283982]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.053167,8.284012],[49.053146,8.284474]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.050587,8.288132],[49.051199,8.288197]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.048179,8.292195],[49.047962,8.292165]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048083,8.29393],[49.047892,8.293892]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048014,8.295576],[49.047803,8.295541]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048122,8.29396],[49.048439,8.293756],[49.049031,8.29383],[49.049129,8.291939]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048315,8.293818],[49.048416,8.291846],[49.049132,8.291938],[49.049132,8.291938]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.04858,8.293764],[49.048691,8.291889]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"override","shape":[[49.048848,8.293803],[49.048953,8.291918],[49.048953,8.291918]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048423,8.293957],[49.04838,8.294944]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.048236,8.295664],[49.048507,8.295401],[49.04857,8.294731],[49.048542,8.294302],[49.048532,8.293996],[49.048532,8.293991]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049686,8.292041],[49.049129,8.291986]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049505,8.292019],[49.04935,8.294964],[49.04935,8.294964]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049345,8.292008],[49.049191,8.29495]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.047981,8.297103],[49.047981,8.297393],[49.049071,8.297854],[49.049837,8.297994],[49.050344,8.297908],[49.050344,8.297908]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049807,8.297551],[49.049933,8.294697],[49.049933,8.294697]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049854,8.296497],[49.049144,8.296386],[49.048975,8.295849],[49.048258,8.295699]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.049693,8.295948],[49.048975,8.295846]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050359,8.297844],[49.050334,8.297689],[49.050162,8.297641],[49.049821,8.297539]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.052022,8.295393],[49.051215,8.297075],[49.05052,8.297578],[49.050336,8.29769]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050839,8.29734],[49.049826,8.297203]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.051245,8.29702],[49.049842,8.296859]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.051422,8.296687],[49.049865,8.29651]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.051501,8.296491],[49.050904,8.296432],[49.050984,8.294842],[49.050907,8.296427]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050913,8.29629],[49.049873,8.296167],[49.049869,8.296167],[49.049848,8.296167]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050928,8.295945],[49.049889,8.295827]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050939,8.295601],[49.049907,8.295486],[49.049907,8.295486]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.05096,8.295263],[49.049921,8.295134]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.050685,8.294768],[49.049936,8.294692],[49.049936,8.294694],[49.049929,8.294804]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.046268,8.291333],[49.04625,8.291757]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045311,8.291231],[49.045355,8.292846],[49.045339,8.293637],[49.045237,8.295448],[49.045358,8.295896],[49.045684,8.295863]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045728,8.29366],[49.045346,8.29362]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045715,8.293893],[49.045332,8.293846]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045699,8.294257],[49.045311,8.294213]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045688,8.294591],[49.04529,8.294562],[49.045288,8.294588]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045677,8.294952],[49.045272,8.2949]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045656,8.295302],[49.04525,8.295261]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.045631,8.295634],[49.045281,8.295606]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054603,8.281001],[49.055549,8.281157],[49.055848,8.281672],[49.055999,8.282954],[49.056192,8.28629],[49.05608,8.28687],[49.055792,8.287674],[49.055588,8.288146],[49.05551,8.288833],[49.055461,8.28967],[49.054906,8.290228]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054564,8.281551],[49.055338,8.281669],[49.054853,8.290177]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054298,8.287462],[49.054987,8.287527]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.054326,8.286588],[49.055033,8.286672]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"FORWARD"}},{"op":"create","shape":[[49.055189,8.283699],[49.054479,8.283592]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.055185,8.283975],[49.054456,8.283892]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.055174,8.284333],[49.054445,8.284258]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.05515,8.284709],[49.054424,8.284631]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.055144,8.284938],[49.054416,8.284863]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054606,8.280596],[49.053914,8.280515]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054636,8.280273],[49.053947,8.280192]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.05465,8.279924],[49.053961,8.279846]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054658,8.279593],[49.053976,8.279512]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054666,8.279573],[49.054343,8.279208]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.054343,8.279209],[49.053995,8.27918]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.053998,8.279178],[49.053901,8.280922]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.053963,8.279853],[49.053757,8.279856]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"17","TRAVEL_DIRECTION":"BOTH"}},{"op":"create","shape":[[49.055265,8.282687],[49.054516,8.282591]],"layer":"LINK_ATTRIBUTE_FCN","data":{"VEHICLE_TYPES":"49","TRAVEL_DIRECTION":"BOTH"}}]) 
										};


	
	/**
	* Function populates the pre-defined example
	**/
	function populateSampleOptions(){
		for(var sampleId in samples){
			var opt = document.createElement('option');
			opt.innerHTML = samples[sampleId].sampleText;
			opt.id = sampleId;
			document.getElementById("sampleSelector").appendChild(opt);
		}
	}

	// Load the examples once page has loaded
	document.addEventListener("DOMContentLoaded", function(event) {
		populateSampleOptions();
	});

	/**
	* Function adds a Link/Road from the example
	**/
	function addRoadExample(that){
		if(that.selectedOptions[0].id!='-1'){
			var selectedExampleId = that.selectedOptions[0].id;
			var overlay_specs = samples[selectedExampleId].overlay_specs;
			drawShapes(overlay_specs, false);
		}
	}

	/**
	* Function updates the shape of the link with the value provided in text area
	**/
	function applyShapes(){
		var overlay_shape = JSON.parse(document.getElementById('shapedrop').value)
		addRoad(roadShapes.length+1, overlay_shape, true,false);
	}
	
	/**
	* Function removes a link from the (not yet uploaded) overlay
	**/
	function removeRoadById(id){
		var currOverlaySpec = generateOverlayParams();
		currOverlaySpec.splice(id-1,1);
		//clearMap(false,false);
		if (mapMatchedRoadGroups.length > id -1 && mapMatchedRoadGroups[id-1]){
			mapMatchedRoadGroups[id-1].removeAll();
			mapMatchedRoadGroups.splice(id-1,1);
			mapMatchedRoadShapes.splice(id-1,1);
		} 
		drawShapes(currOverlaySpec, true);
		drawMapMatchedShapes();
	}
	
	/**
	* Function draws the shape provided in overlay_specs
	* showForm : if false , the panel does not show the Form for link attributes
	**/
	function drawShapes(overlay_specs, showForm){
		clearMap(true,false);
		overlay_specs.forEach(function(overlay_spec, idx){
				var id = roadShapes.length+1;
				addRoad(id, overlay_spec.shape, showForm,false);

				document.getElementById("op-"+id).value = overlay_spec.op;
				operationChanged(id);
				document.getElementById("layer-"+id).value =overlay_spec.layer;
				attachAttributeForm(id);

				// iterate through the attributes and update data
				for (var attribute in overlay_spec.data) {
					if (overlay_spec.data.hasOwnProperty(attribute)) {
						if(overlay_spec.layer){
							var elem = document.getElementById(attribute+'-'+overlay_spec.layer+'-'+id);
							if(elem !== null)
								document.getElementById(attribute+'-'+overlay_spec.layer+'-'+id).value = overlay_spec.data[attribute];
							if((attribute == "VEHICLE_TYPES") && overlay_spec.layer=="LINK_ATTRIBUTE_FCN"){
								var inputs = document.getElementsByName("quickchange-vehicle-types-"+ id);
								for(var idx in inputs){
									if((overlay_spec.data[attribute]==0 && inputs[idx].value == 0) || 
										(inputs[idx].value & overlay_spec.data[attribute]) ||
										(overlay_spec.data[attribute].indexOf(inputs[idx].alt)!=-1)){
										inputs[idx].checked = true;
									}
								}
							}else if((attribute == "TRAVEL_DIRECTION") && overlay_spec.layer=="LINK_ATTRIBUTE_FCN"){
								var inputs = document.getElementsByName("quickchange-traveldir-"+ id);
								inputs.forEach(function (val, idx){
									if(val.value == overlay_spec.data[attribute]){
										val.checked = true;
										addDirectionArrows(id, val.value);
									}
								});
							}
						}
					}
				}
		});

	}

	/**
	* Retrieve shape from the available geometry
	**/
	function generateShapeFromRoadGroup(id){
		var shape = [];

		roadShapes[id-1].getGeometry().eachLatLngAlt(function (lat, lng, alt, idx) {
			var tempShape = [];
			tempShape.push(parseFloat(parseFloat(lat).toFixed(6)));
			tempShape.push(parseFloat(parseFloat(lng).toFixed(6)));
			shape[shape.length] = tempShape;
		});
		return shape;
	}
	
	/**
	* Function creates the overlay in json format required for Custom Route API erquest
	**/
	function generateOverlayParams(){
		var overlay_specs = [];
		for(i = 1; i<roadGroups.length; i++){
			var op = document.getElementById("op-"+(i)).value;
			var layer;
			var data;
			var shape = generateShapeFromRoadGroup(i);
			layer = document.getElementById("layer-"+(i)).value;
			if(layer){
				data = new Object();
				attributeObj[layer].split(",").forEach(function (val, idx){
					var attrVal = document.getElementById(val+"-"+ layer +"-"+ (i)).value;
					if(attrVal!=undefined && attrVal!=null && attrVal!=""){
						data[val] = (attrVal==""?undefined:attrVal);
					}
				});	
			}
			
			
			var tempOverlayOp = new overlaySpec(op, shape, layer, data);
			overlay_specs[overlay_specs.length] = tempOverlayOp;
		}
		return overlay_specs;
	}


	/**
	* Function places direction arrows to the links added/updated
	**/
	function addDirectionArrows(id, dir){

		roadGroups[id].getObjects().forEach(function(obj, i){
			if(obj.objtype=='dirmarker'){
				roadGroups[id].removeObject(obj);
			}
		});

		var roadShapeArr = generateShapeFromRoadGroup(id);
		for(var i=0; i<roadShapeArr.length-1; i++){
			// add the arrows on the middle of the link, slighty offset to avoid overlay with the underlying polyline
			var midpoint = new H.geo.Point((roadShapeArr[i][0]+roadShapeArr[i+1][0])/2 - 0.00002,
						(roadShapeArr[i][1]+roadShapeArr[i+1][1])/2 - 0.00002);
			var p1 = map.geoToScreen({lat: roadShapeArr[i][0], lng: roadShapeArr[i][1]});
			var p2 = map.geoToScreen({lat: roadShapeArr[i+1][0], lng: roadShapeArr[i+1][1]});
			var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
			var dirMarker = new H.map.Marker(midpoint,{
				// 44 degree rotation required extra as the original icon have this angle inbuilt
				icon: new H.map.Icon(directionSVG.replace(/__rotang__/g, angleDeg) 
												.replace(/__displayfwd__/g, (dir=='BOTH' || dir =='FORWARD')?'block':'none')
												.replace(/__displaybck__/g, (dir=='BOTH' || dir =='BACKWARD')?'block':'none'))
			});
			dirMarker.objtype="dirmarker";
			roadGroups[id].addObject(dirMarker);
		}
		roadGroups[id].dir = dir;
	}

	/**
	* Function to add road on the map with Id and roadShapeArr
	* showForm : if passed false, does not shows the road detials in panel
	* showMapMatch : if passed falses does not shows the map match option
	**/
	function addRoad(id, roadShapeArr, showForm, showMapMatch){
		var direction="BOTH";

		var roadGroup = new H.map.Group();
		roadGroup.roadShapeArr = roadShapeArr;
		// add the road/link as polygon on the map
		var road = new H.geo.Strip();
		for(var i=0; i<roadShapeArr.length; i++){
			road.pushPoint(new H.geo.Point(roadShapeArr[i][0], roadShapeArr[i][1]));
		}
		currentRoadShape = new H.map.Polyline(road, roadDisplayOptions[id%6]);
		// highlight the polyline on mouse hover
		currentRoadShape.addEventListener('pointerenter', function(e){
			document.getElementById('mapContainer').style.cursor = 'pointer';
			e.currentTarget.setStyle(e.currentTarget.getStyle().getCopy({
				lineWidth: 9
			}));
		});
		currentRoadShape.addEventListener('pointerleave', function(e){
			document.getElementById('mapContainer').style.cursor = 'default';
			e.currentTarget.setStyle(e.currentTarget.getStyle().getCopy({
				lineWidth: 7,
				strokeColor: roadDisplayOptions[e.currentTarget.getGeometry().id%6].style.strokeColor
			}));
		});
		currentRoadShape.addEventListener('pointercancel', function(e){
			document.getElementById('mapContainer').style.cursor = 'default';
			e.currentTarget.setStyle(e.currentTarget.getStyle().getCopy({
				lineWidth: 7,
				strokeColor: '#000000',
				strokeColor: roadDisplayOptions[e.currentTarget.getGeometry().id%6].style.strokeColor
			}));
		});
		
		// show link details ig availabel on tap
		currentRoadShape.addEventListener('tap', function(e){
			var selectedRoadId = e.currentTarget.getGeometry().id;
			showFormForRoad(selectedRoadId);
			e.currentTarget.setStyle(e.currentTarget.getStyle().getCopy({
				lineWidth: 9
			}));

			e.currentTarget.setStyle(e.currentTarget.getStyle().getCopy({
				lineWidth: 7,
				strokeColor: '#000000',
				strokeColor: roadDisplayOptions[e.currentTarget.getGeometry().id%6].style.strokeColor
			}));
		});

		// add the polyline to map group
		roadGroup.addObject(currentRoadShape);
		var polygonHandles = new H.map.Group();
		roadGroup.addObject(polygonHandles);

		var oldStrip = currentRoadShape.getGeometry();
		var newStrip = new H.geo.Strip();
		// fix the dbltap adding two points in last place, removing last.
		for (var i = 0; i < oldStrip.getPointCount(); i++) {
			newStrip.pushPoint(oldStrip.extractPoint(i));
		}
		newStrip.id = id;
		currentRoadShape.setGeometry(newStrip);
		
		// add mouse event listner to the polyline
		makeHandles(currentRoadShape, polygonHandles);
		
		map.addObject(roadGroup);
		roadShapes[id-1]= currentRoadShape;
		
		// if the road group already exists in the gourp remove it 
		// and replace with new group
		if(roadGroups[id]){
			roadGroups[id].removeAll();
			roadGroups[id] = roadGroup;
		}else{
		
			//  add option to 'select a road' if this road is new
		    var opt = document.createElement('option');
			opt.innerHTML = id;
			opt.id = id;
			document.getElementById("roadSelector").appendChild(opt);
			document.getElementById("road-selector").style.display = 'block';
		
			roadGroups[id] = roadGroup;
			addRowToContainer(newStrip.id, roadShapeArr,showMapMatch);
			
			// show the details in panel if showForm passed true
			if(showForm){
				showFormForRoad(newStrip.id);
				document.getElementById("roadSelector").selectedIndex = document.getElementById("roadSelector").length-1 ;
			}else{
				showFormForRoad(null);
			}
				
		}
		
		currentRoadShape = null;
		underConstruction = false;
		// add arrows for direction in the link
		addDirectionArrows(id, direction);
		map.setViewBounds(roadGroup.getBounds());

		
	}

	/**
	* Function shows the Form in the panel corresponding to 
	* the Id passed
	**/
	function showFormForRoad(id){
		roadGroups.forEach(function (val, idx){
				if(idx==id){
					//show the selected
					document.getElementById('container-block-'+idx).style.display='block';
					document.getElementById('container-'+idx).style.display='block';
				}else{
					//hide the rest
					document.getElementById('container-block-'+idx).style.display='none';
					document.getElementById('container-'+idx).style.display='none';
				}
			});
	}

	var currRoadShapeArr = [];
	var mapMatchedRoadGroups = [];

	/**
	* Function initliazes or updtaes the polygon 
	* currently being down by mouse clicks
	*/
	function initializeOraddPointToPolygon(e) {
		if(underConstruction){
			var geoCords = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			roadEdits[roadEdits.length-1].pushPoint(geoCords);
			currRoadShapeArr.push([geoCords.lat, geoCords.lng]);
			var handleMarker = new H.map.Marker(geoCords,{
					icon: new H.map.Icon(markerSVG1.replace(/__NO__/g, roadShapes.length +1).replace(/__NO2__/g, ""))
			});
			tempMarkersGroup.addObject(handleMarker);
			growingStrip.pushPoint(geoCords);
			mapMatch(); //map match the inserted point
		}
	}

	/**
	* function updates the polygon when a coordinate is 
	* added 
	**/
	function refreshNonFinalizedPolygon(e) {
		if(underConstruction && !lockGrowingShape){
			var point = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			var strip = new H.geo.Strip(roadEdits[roadEdits.length-1].getLatLngAltArray().concat(point.lat, point.lng, point.alt));
			// if not already added on map , add the polyline on map
			if(underConstruction){
				if (!currentRoadShape) {
					currentRoadShape = new H.map.Polyline(strip, polygonOptions);
					map.addObject(currentRoadShape);
				} else {
					currentRoadShape.setGeometry(strip);
				}
			}
		}
	}
	
	/**
	* Function adds listners to polyline
	**/
	function makeHandles(polygon, polygonHandles) {
		tempMarkersGroup.removeAll();
		
		var polygonStrip = polygon.getGeometry();
		for (var k = 0; k < polygonStrip.getPointCount(); k++) {
			var markerToUse = ((k==0 || k==polygonStrip.getPointCount()-1)?markerSVG1:markerSVG1);
			var handleCenter = polygonStrip.extractPoint(k);
			
			// add marker on polyline coordinate and make them dragable to edit the 
			// polyline
			var handleMarker = new H.map.Marker(handleCenter,{
				icon: new H.map.Icon(markerToUse.replace(/__NO__/g, polygonStrip.id).replace(/__NO2__/g, ""))
			});
			handleMarker.draggable = true;
			handleMarker.markerId = k;
			handleMarker.polygonId = polygonStrip.id;
			// Add right click listner for the marker
			handleMarker.addEventListener('contextmenu', function(e){
				currClickedviewportX = e.viewportX;
				currClickedviewportY = e.viewportY;
				// required to avoid map right click being handled in marker right click
				if(e.target!==e.currentTarget){
					return;			
				}
				var shapePointId = e.currentTarget.markerId;
				var shapeId = e.currentTarget.polygonId;
				
				// Add delete options
				e.items.push(new H.util.ContextItem({
					label: 'Delete Shape Point',
					callback: function(){
						removeObjects(true);
						var shapeArr = generateShapeFromRoadGroup(shapeId);
						shapeArr.splice(shapePointId,1);
						document.getElementById('shape-'+shapeId).value = JSON.stringify(shapeArr).replace(/"/g,"");
						applyShapeEdit(shapeId);
						mapMatch(shapeId, "delete_shape_point", shapeArr);
					}
				}));
				e.items.push(new H.util.ContextItem({
					label: 'Delete Road',
					callback: function(){
						removeRoadById(shapeId);
					}
				}));
			});
			// marker drag event lsitners
			handleMarker.addEventListener('dragstart', function () {
				document.body.style.cursor = 'pointer';
				behavior.disable();
			}, false);
			handleMarker.addEventListener('dragend', function () {
				polygonHandles.removeObjects(polygonHandles.getObjects());
				makeHandles(polygon, polygonHandles);
				document.body.style.cursor = 'auto';
				behavior.enable();
				behavior.disable(H.mapevents.Behavior.DBLTAPZOOM);
				document.getElementsByName("quickchange-traveldir-"+handleMarker.polygonId)[2].onclick();
				addDirectionArrows(handleMarker.polygonId, roadGroups[handleMarker.polygonId].dir);
				//map match with the changed position
				mapMatch(handleMarker.polygonId,"delete_shape_point",JSON.parse(generateJSONStringFromPolyLine(polygon)));
			}, false);
			(function (closureK) {// funny closures.
				handleMarker.addEventListener('drag', function (ev) {
				var target = ev.target;
				var pointer = ev.currentPointer;
				var screenToGeo = map.screenToGeo(pointer.viewportX, pointer.viewportY);
				target.setPosition(screenToGeo);
				var newStrip = new H.geo.Strip();
				newStrip.id = polygonStrip.id;
				document.getElementById("shape-"+newStrip.id).value=JSON.stringify(generateShapeFromRoadGroup(newStrip.id)).replace(/"/g,"");
				polygonStrip.eachLatLngAlt(function (lat, lng, alt, idx) {
					if (idx !== closureK) {
					newStrip.pushLatLngAlt(lat, lng, 0);
					} else {
					newStrip.pushLatLngAlt(screenToGeo.lat, screenToGeo.lng, 0);
					}
				});
				polygon.setGeometry(newStrip);
				}, false);
			})(k);
			polygonHandles.addObject(handleMarker);
		}
	}

	/**
	* Function formats the date in format required by API
	**/
	function getFormattedTime() {
		var today = new Date();
		var y = today.getFullYear();
		var m = ('0' + parseInt(today.getMonth()+1)).slice(-2);
		var d = ('0' + today.getDate()).slice(-2);
		var h = ('0' + today.getHours()).slice(-2);
		var min = ('0' + today.getMinutes()).slice(-2);
		var s = ('0' + today.getSeconds()).slice(-2);

		return y + "-" + m + "-" + d + "T" + h + "-" + min + "-" + s;
	}

	/**
	* Function to convert json data of Overlay to string
	**/
	function backup(){
		var overlay_specs  = JSON.stringify(generateOverlayParams());
		if(overlay_specs != "[]")
		download(overlay_specs, mapname.value+'_'+getFormattedTime()+".json", 'application/json');
		else
		alert("Back Up only possible with data in Upload request");
	}

	/**
	* Function creates a downloadable file with overlay data 
	**/
	function download(text, name, type) {
		var a = document.createElement("a");
		var file = new Blob([text], {type: type});
		a.href = URL.createObjectURL(file);
		a.download = name;
		a.click();
	}
	document.getElementById('file-input').addEventListener('change', restoreShapes, false);

	/**
	* Function triggers loading of Overlay data from the provided file
	**/
	function restore(){
		document.getElementById('file-input').value = null;
		document.getElementById('file-input').click();
	}

	/**
	* Function populates the shapes from the overlay
	**/
	function restoreShapes(e) {
		var file = e.target.files[0];
		
		if (!file) {
			return;
		}
		var userConfirm = true;
		var fileNameSplit = file.name.split('.');
		var fileExtension = fileNameSplit[1];
		var fileNameArr = fileNameSplit[0].split('_');
		if(fileExtension!=='json'){
			//Could be Invalid file
			userConfirm = confirm('File Extension is not ".json". Might be an invalid file! Continue?')
		}
		if(userConfirm && !fileNameArr[0].startsWith('OVERLAY')){
			//Could be Invalid file
			userConfirm = confirm('File name does not start with OVERLAY. Might be an invalid file! Continue?')
		}
		if(userConfirm && fileNameArr[0]!==mapname.value){
			//Could be a different overlay map
			userConfirm = confirm('Map name of backup file('+ fileNameArr[0] +') is different than that in progress('+ mapname.value +'). Changes could be lost! Continue?');
			mapname.value = fileNameArr[0];
		}
		var reader = new FileReader();
		reader.onload = function(e) {
			var contents = e.target.result;
			var parsedShape;
			try{
				parsedShape = JSON.parse(contents)
			}catch(e){
				alert('Invalid shape file');
			}
			drawShapes(parsedShape, false);
		};
		if(userConfirm){
			reader.readAsText(file);
		}
	}

	/**
	* Function calls the Custom Route API upload end point 
	* to upload the overlay data
	**/
	var overlay_upload = function(){		
		Spinner.showSpinner();
		overlayparamString = JSON.stringify(generateOverlayParams());
		var url = endpoint.value + '/2/overlays/upload.json'+ '?app_id=' + 
			app_id + '&app_code=' + app_code + '\n&storage=readonly'+'&map_name='+mapname.value;
		 $.ajax({
                url: url,
                dataType: "json",
                async: true,
                type: 'post',
				data:{
					overlay_spec : overlayparamString
				},
                success: function(data) {
                    gotOverlayResponse(data, this);
                },
                error: function(xhr, status, e) {
					Spinner.hideSpinner();
                    var errorResp = (xhr.responseJSON.issues[0] || {
                        "message": "unknown error occured"
                    });
                    feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font>";
                    feedbackTxt.innerHTML += "<br/>";
                }
            });
	}

	var layersAffected = {};
	var layersToShow = [];
	var timeOutFunction = null;
	
	/**
	* Function parses the reponse for the overlay data available from Custom Route API
	**/
	var gotOverlayResponse = function (respJsonObj, that){
		feedbackTxt.innerHTML = "";
		if (respJsonObj.error != undefined) {
			Spinner.hideSpinner();
			alert (respJsonObj.error);
			feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
			return;
		}
		
		if(respJsonObj.meta === undefined){
			layersToShow = [];
			respJsonObj.layers.forEach(function (val, idx){
				if(val.indexOf("LINK_ATTRIBUTE_FC")!=-1){
					layersToShow.push (val);
				}
			});
			layersAffected = {};
		}else{
			respJsonObj.meta.forEach(function (val, idx){
				if(val.layerId.indexOf("LINK_ATTRIBUTE_FC")!=-1){
					layersAffected[val.layerId] = val.lastUpdateTimeStamp;
				}
			});
			layersToShow = [];
		}
		
		showAffectedRoads(layersAffected);
	};

	/**
	* Function add the links fomr the overlay on the map
	**/
	function showAffectedRoads(layersMeta){
		var layerIds = "";
		if(layersMeta){
			layerIds= Object.keys(layersMeta).map(function(elem){
							return elem;
					  }).join(",");
		}else{
			layerIds = "LINK_ATTRIBUTE_FCn";
			Spinner.showSpinner();
		}
		
		var displayURL = endpoint.value + '/2/search/all.json' +
		'?map_name='+mapname.value+'&geom=full' +
		'&layer_id=' + layerIds + 
		'&acceptMissingLayers=' + "true" + 
		'&app_id=' + app_id + '&app_code=' + app_code + '&meta=1';

		overlayGroup.removeAll();

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
                    var meta = respJsonObj.meta;
					var layerFound = true;
					if(layersToShow.length == 0 && layerIds != "LINK_ATTRIBUTE_FCn"){
						meta.forEach(function(obj, idx){
							layerFound = layersMeta[obj.layerId] == obj.lastUpdateTimeStamp;
						});
					}
					
					if(layerFound){
						var links = respJsonObj.geometries;
						// if there are no links in response, repeat the request
						if(links.length==0){
							setTimeout(function(){showAffectedRoads(layersMeta);}, 3000);
						}else{
							// add links to the map is available
							for (var i = 0; i < links.length; i++)	{

								var strip = new H.geo.Strip();
								var shape = links[i].geometry.startsWith('LINESTRING')
									? links[i].geometry.substring(11, links[i].geometry.length - 1).split(',') // LINESTRING(lat lon, lat lon, ...)
									: links[i].geometry.substring(17, links[i].geometry.length - 2).split(',') // MULTILINESTRING((lat lon, lat lon, ...))
								for (var j = 0; j < shape.length; j++) {
									var lonLat = shape[j].trim().split(' ');
									strip.pushLatLngAlt(parseFloat(lonLat[1]), parseFloat(lonLat[0]), 0);
								}
								var polyline = new H.map.Polyline(strip, { style: { lineWidth: 11, strokeColor: "#B22222", lineJoin: "round" } });
								polyline.$linkInfo = links[i].attributes;
								polyline.addEventListener('tap', createTapLinkHandler(polyline));
								polyline.addEventListener('pointerenter', createPointerEnterLinkHandler(polyline));
      			            	polyline.addEventListener('pointerleave', createPointerLeaveLinkHandler(polyline));
								overlayGroup.addObject(polyline);
							}
							Spinner.hideSpinner();
							map.addObject(overlayGroup);
							map.setViewBounds(overlayGroup.getBounds());
						}
					}else{
						// if the layer is not found, repeat the request
						if(timeOutFunction)
						clearTimeout(timeOutFunction);
						timeOutFunction = setTimeout(function(){showAffectedRoads(layersMeta);}, 3000);
					}
                },
                error: function(xhr, status, e) {
                    if (xhr.status == 400 && layersToShow.length == 0) {
							// error 400 could indicate the upload has not been completed yet
							// retry the request
							if(timeOutFunction)
							clearTimeout(timeOutFunction);
							setTimeout(function(){showAffectedRoads(layersMeta);}, 3000);
					}else if (xhr.status == 500) {
						//handle error
						Spinner.hideSpinner();
					} else {
						//handle error
						Spinner.hideSpinner();
					}
                }
            });
	}

		/**
		* Function to update polyline style on hover
		**/ 
        function createPointerEnterLinkHandler(polyline){
            return function(evt){
                polyline.setStyle(HOVER_LINK_STYLE);
            };
        }
    
        /**
		* Function to update polyline style on hover
		**/ 
		function createPointerLeaveLinkHandler(polyline) {
            return function (e) {
                polyline.setStyle(DEFAULT_LINK_STYLE);
            };
        }
	
		/**
		* Function to show link detials on tap event
		**/ 
        function createTapLinkHandler(polyline) {
            return function (e) {
                var strip = polyline.getStrip();
                var linkId = polyline.$linkId;
                var lowIndex = Math.floor((strip.getPointCount() - 1) / 2);
                var highIndex = Math.ceil(strip.getPointCount() / 2);
                var center;
				// find the polyline center to show the info bubble
			   if (lowIndex === highIndex) {
                    center = strip.extractPoint(lowIndex);
                } else {
                    var lowPoint = strip.extractPoint(lowIndex);
                    var highPoint = strip.extractPoint(highIndex);
                    center = new H.geo.Point((lowPoint.lat + highPoint.lat ) / 2, (lowPoint.lng + highPoint.lng) / 2);
                }
                
                // Get the link detials
                linkInfo= polyline.$linkInfo;
                
                var tableText = "";
                tableText += '<table <table class="link-info">';
				tableText += "<tr>";
					tableText += "<th>Attribute</th>";
					tableText += "<th>Value    </th>";
				tableText += "</tr>";
				var keys = Object.keys(linkInfo);
				keys.sort();
				keys.forEach(function(val, idx){
					var editable = false;
					if(attributeObj['LINK_ATTRIBUTE_FCN'].indexOf(val)!=-1){
						editable = true;
					}
					tableText += '<tr style="color:'+ ((editable)?'red':'#bababa') +'">';
						tableText += "<td>"+val          +"</td>";
						tableText += "<td>"+linkInfo[val]+"</td>";
					tableText += "</tr>";
				});

				tableText += "</table>";
                
                // Adding Link data to a Infobubble with text area formatting
                infoText="<div style='background-color:black;border:0;font-size:12px;"+
					"width:375px;max-height:250px;overflow-y: scroll'>"+tableText+"</div>";
            
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
    	var DEFAULT_LINK_STYLE = { lineWidth: 11, strokeColor: "#B22222", lineJoin: "round" };
		
		/**
		* Function to get the overlay details
		**/
	var display_overlay = function(){
			var displayURL = endpoint.value + '/2/search/all.json\n' +
			'?map_name='+mapname.value+'&geom=full\n' +
			'&layer_id=' + layerIds + 
			'&app_id=' + app_id + '&app_code=' + app_code;
			overlayGroup.removeAll();
			var url = displayURL.replace('\n','') + '&callback=gotSearchAllResponse';
			script = document.createElement("script");
			script.src = url;
			document.body.appendChild(script);
	};
	
	/**
	* Function to parse the search response
	**/
	var gotSearchAllResponse = function (respJsonObj){
		feedbackTxt.innerHTML = "";
		if (respJsonObj.issues != undefined) {
			feedbackTxt.innerHTML += respJsonObj.issues[0].message + '\n';
			return;
		}
		// for debugging: feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
		var links = respJsonObj.geometries;
		for (var i = 0; i < links.length; i++)	{
			var strip = new H.geo.Strip();
			var shape = links[i].geometry.startsWith('LINESTRING')
				? links[i].geometry.substring(11, links[i].geometry.length - 1).split(',') // LINESTRING(lat lon, lat lon, ...)
				: links[i].geometry.substring(17, links[i].geometry.length - 2).split(',') // MULTILINESTRING((lat lon, lat lon, ...))
			for (var j = 0; j < shape.length; j++) {
				var lonLat = shape[j].trim().split(' ');
				strip.pushLatLngAlt(parseFloat(lonLat[1]), parseFloat(lonLat[0]), 0);
			}
			var polyline = new H.map.Polyline(strip, { style: { lineWidth: 11, strokeColor: "#B22222", lineJoin: "round" } });
			overlayGroup.addObject(polyline);
		}
		map.addObject(overlayGroup);
		map.setViewBounds(overlayGroup.getBounds());
	};

	/**
	* Function calls the Custom Route API route end point
	**/
	var request_route = function(start, destination){
		var url = document.getElementById("route-area").value.replace('\n','') + '&algopts=nohlprouter&jsoncallback=gotRoutingResponse';
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	};

	/**
	* Function parses the Routing API response
	**/
	var gotRoutingResponse = function (respJsonRouteObj){
		if (respJsonRouteObj.error != undefined || respJsonRouteObj.issues != undefined) {
			alert (respJsonRouteObj.error);
			feedbackTxt.innerHTML = respJsonRouteObj.error;
			return;
		}
		var strip = new H.geo.Strip();
		for (var l = 0; l < respJsonRouteObj.response.route[0].leg.length; l++)	{
			var links = respJsonRouteObj.response.route[0].leg[l].link;
			for (var i = 0; i < links.length; i++)	{
				var shape = links[i].shape;
				for (var j = 0; j < shape.length; j += 2) {
					strip.pushLatLngAlt(parseFloat(shape[j]), parseFloat(shape[j + 1]), 0);
				}
			}
		}
		var polyline = new H.map.Polyline(strip, { style: { lineWidth: 5, strokeColor: "#2222B2", lineJoin: "round" } });
		group.addObject(polyline);
		map.addObject(group);
		map.setViewBounds(group.getBounds());
	}

	/**
	* Function calls the Delete end point of Custom Routes API
	**/
	var delete_overlay = function(){
		var deleteURL = endpoint.value + '/2/layers/delete.json?map_name='+mapname.value+'\n' +
		'&app_id=' + app_id + '&app_code=' + app_code + '\n&storage=readonly';

		var url = deleteURL.replace('\n','') + '&callback=gotDeleteResponse';
		script = document.createElement("script");
		script.src = url;
		document.body.appendChild(script);
	};
	
	/**
	* Function to parse the delete response
	**/
	var gotDeleteResponse = function (respJsonObj){	
		feedbackTxt.innerHTML = "";
		if (respJsonObj.error != undefined) alert (respJsonObj.error);
		feedbackTxt.innerHTML += JSON.stringify(respJsonObj, null, 2) + '\n';
	};

	//--- Create marker with 2 text lines
	var createIconMarker = function (line1, line2) {
		var svgMarker = svgMarkerImage_Line;
		svgMarker = svgMarker.replace(/__line1__/g, line1);
		svgMarker = svgMarker.replace(/__line2__/g, line2);
		svgMarker = svgMarker.replace(/__width__/g, line2.length * 4 + 20);
		svgMarker = svgMarker.replace(/__widthAll__/g, line2.length * 4 + 200);
		return new H.map.Icon(svgMarker, { anchor: new H.math.Point(24, 57)	});
	};


	// SVG defination for markers
	var markerSVG1 = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
			  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
			  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
			  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
			  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
			  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
			  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="#1188DD"/>' +
			  '<text font-size="14" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" text-anchor="middle" x="45%" y="50%">__NO__</text>' +
			  '</svg>';
	
	var markerSVG = '<svg xmlns="http://www.w3.org/2000/svg" style="margin-left:10%; margin-top:10%;"'+
				' width="58" height="45"><rect id="backgroundrect" width="100%" height="100%" x="0" y="0"'+
				' fill="none" stroke="none" class=""/><g class="currentLayer"><title>Layer 1</title>'+
				'<path d="M27.28125,42.25601625442505 C27.28125,43.95601625442505 24.58125,45.25601625442505'+
				' 21.28125,45.25601625442505 C17.98125,45.25601625442505 15.28125,43.95601625442505 15.28125,42.25601625442505'+
				' C15.28125,40.556016254425046 17.98125,39.25601625442505 21.28125,39.25601625442505 C24.58125,39.25601625442505'+
				' 27.28125,40.556016254425046 27.28125,42.25601625442505 z" fill="#000" fill-opacity=".2" id="svg_1" class=""/>'+
				'<path d="M21.28125,11.256016254425049 C17.78125,11.256016254425049 14.58125,12.55601625442505 12.08125,15.05601625442505'+
				' C9.68125,19.05601625442505 8.28125,20.656016254425047 8.28125,24.05601625442505 C8.28125,27.55601625442505 '+
				'9.68125,30.75601625442505 12.08125,33.15601625442505 L21.28125,42.25601625442505 L30.48125,33.15601625442505'+
				' C32.88125,30.75601625442505 34.18125,27.55601625442505 34.18125,24.05601625442505 C34.18125,20.656016254425047 '+
				'32.88125,17.35601625442505 30.38125,15.05601625442505 C27.98125,12.55601625442505 24.78125,11.256016254425049 21.28125,11.256016254425049 z"'+
				' fill="#fff" id="svg_2" class=""/><path d="M21.28125,13.456016254425048 C14.28125,13.456016254425048 10.58125,18.456016254425048 10.38125,24.05601625442505 C10.38125,27.35601625442505 11.38125,29.656016254425047 13.48125,31.75601625442505 L21.28125,39.45601625442505 L29.08125,31.75601625442505 C31.18125,29.656016254425047 32.08125,27.456016254425048 32.08125,24.05601625442505 C31.88125,18.32601625442505 28.28125,13.456016254425048 21.28125,13.456016254425048 z" fill="#1188DD" id="svg_3" class=""/><text font-size="11" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" text-anchor="middle" x="20.79110421382913" y="29.499886909634334" id="svg_4" class="">__NO1__</text><path fill="#4aabba" fill-opacity="1" stroke="#ffffff" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="round" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M26.37215133392041,12.620879067530943 C26.37215133392041,6.200503858927616 31.572655252889106,0.9999999399589239 37.99303046149243,0.9999999399589239 C44.413405670095756,0.9999999399589239 49.61390958906445,6.200503858927616 49.61390958906445,12.620879067530943 C49.61390958906445,19.041254276134268 44.413405670095756,24.241758195102964 37.99303046149243,24.241758195102964 C31.572655252889106,24.241758195102964 26.37215133392041,19.041254276134268 26.37215133392041,12.620879067530943 z" id="svg_8" class=""/><text font-size="11" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" text-anchor="middle" x="37.724287400894525" y="16.44589037306701" class="" id="svg_5">__NO2__</text></g></svg>';
	var markerSVG2 = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><rect id="backgroundrect" width="100%" height="100%" x="0" y="0" fill="none" stroke="none" class=""/><g class="currentLayer"><title>Layer 1</title><path fill="#4aabba" fill-opacity="1" stroke="#ffffff" stroke-opacity="1" stroke-width="2" stroke-dasharray="none" stroke-linejoin="round" stroke-linecap="butt" stroke-dashoffset="" fill-rule="nonzero" opacity="1" marker-start="" marker-mid="" marker-end="" d="M1.000000912777832,12.620879127135588 C1.000000912777832,6.20050391853226 6.200504831746528,0.9999999995635687 12.620880040349853,0.9999999995635687 C19.041255248953178,0.9999999995635687 24.24175916792187,6.20050391853226 24.24175916792187,12.620879127135588 C24.24175916792187,19.041254335738913 19.041255248953178,24.24175825470761 12.620880040349853,24.24175825470761 C6.200504831746528,24.24175825470761 1.000000912777832,19.041254335738913 1.000000912777832,12.620879127135588 z" id="svg_8" class=""/><text font-size="11" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" text-anchor="middle" x="12.352136979751947" y="16.445890432671654" class="" id="svg_5">__NO2__</text></g></svg>';

	
	var directionSVG = '<svg  transform="rotate(__rotang__)" xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:xlink="http://www.w3.org/1999/xlink"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   viewBox="0 0 64.999993 64.999999"   version="1.1"   id="svg3718"   sodipodi:docname="left-circle-arrow-resized-icon.svg"   width="65"   height="65"   style="clip-rule:evenodd;fill-rule:evenodd;image-rendering:optimizeQuality;shape-rendering:geometricPrecision;text-rendering:geometricPrecision"   inkscape:version="0.92.2 (5c3e80d, 2017-08-06)">  <metadata     id="metadata3722">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <sodipodi:namedview     pagecolor="#9b9da2"     bordercolor="#666666"     borderopacity="1"     objecttolerance="10"     gridtolerance="10"     guidetolerance="10"     inkscape:pageopacity="0"     inkscape:pageshadow="2"     inkscape:window-width="2560"     inkscape:window-height="1377"     id="namedview3720"     showgrid="false"     inkscape:pagecheckerboard="true"     inkscape:zoom="16"     inkscape:cx="42.049669"     inkscape:cy="32.913576"     inkscape:window-x="1592"     inkscape:window-y="-8"     inkscape:window-maximized="1"     inkscape:current-layer="svg3718"     fit-margin-top="0"     fit-margin-left="0"     fit-margin-right="0"     fit-margin-bottom="0" />  <defs     id="defs3711">    <style       type="text/css"       id="style3699"><![CDATA[    .str0 {stroke:#9b9da2;stroke-width:100}    .fil0 {fill:url(#id0)}    .fil1 {fill:url(#id1)}   ]]></style>    <radialGradient       cy="0.47999999"       fx="0.5"       fy="0.47999999"       id="id0">      <stop         offset="0"         stop-color="#9b9da2"         id="stop3701" />      <stop         offset="1"         stop-color="#9b9da2"         id="stop3703" />    </radialGradient>    <radialGradient       fx="0.5"       fy="0.5"       id="id1"       r="0.38">      <stop         offset="0"         stop-color="#ffffff"         id="stop3706" />      <stop         offset="1"         stop-color="#ffffff"         id="stop3708" />    </radialGradient>    <radialGradient       cy="0.47999999"       fx="0.5"       fy="0.47999999"       id="id0-1">      <stop         offset="0"         stop-color="#9b9da2"         id="stop3701-2" />      <stop         offset="1"         stop-color="#9b9da2"         id="stop3703-1" />    </radialGradient>    <radialGradient       fx="0.5"       fy="0.5"       id="id1-5"       r="0.38">      <stop         offset="0"         stop-color="#fff"         id="stop3706-9" />      <stop         offset="1"         stop-color="#ffffff"         id="stop3708-1" />    </radialGradient>    <radialGradient       inkscape:collect="always"       xlink:href="#id0"       id="radialGradient3763"       cy="2410"       fx="2500"       fy="2410"       cx="2500"       r="2250"       gradientUnits="userSpaceOnUse" />    <radialGradient       inkscape:collect="always"       xlink:href="#id1"       id="radialGradient3765"       fx="2135.5652"       fy="2927.0647"       r="1201.2675"       gradientTransform="scale(1.1708259,0.85409794)"       cx="2135.5652"       cy="2927.0647"       gradientUnits="userSpaceOnUse" />    <radialGradient       inkscape:collect="always"       xlink:href="#id0"       id="radialGradient3767"       cy="2410"       fx="2500"       fy="2410"       cx="2500"       r="2250"       gradientUnits="userSpaceOnUse" />    <radialGradient       inkscape:collect="always"       xlink:href="#id1"       id="radialGradient3769"       fx="2135.5652"       fy="2927.0647"       r="1201.2675"       gradientTransform="scale(1.1708259,0.85409794)"       cx="2135.5652"       cy="2927.0647"       gradientUnits="userSpaceOnUse" />  </defs>  <g   style="display:__displaybck__"  id="Layer_x0020_1"     transform="matrix(0.00703125,0,0,0.00703125,-1.5078125,15.539064)">    <circle      class="fil0 str0"       cx="2500"       cy="2500"       r="2200"       id="circle3713"       style="fill:url(#radialGradient3767);stroke:#9b9da2;stroke-width:100;stroke-opacity:0.1" />    <path       class="fil1 str0"       d="M 801,2300 1801,1300 c 50,-50 100,-100 200,-100 100,0 200,100 200,200 v 500 c 0,50 50,100 100,100 h 1900 c 50,0 100,50 100,100 v 800 c 0,50 -50,100 -100,100 H 2301 c -50,0 -100,50 -100,100 v 500 c 0,100 -100,200 -200,200 -100,0 -150,-50 -200,-100 L 801,2700 c -135,-135 -135,-265 0,-400 z"       id="path3715"       inkscape:connector-curvature="0"       style="fill:url(#radialGradient3769);stroke:#9b9da2;stroke-width:100" />  </g>  <g  style="display:__displayfwd__"   transform="matrix(-0.00703125,0,0,-0.00703125,66.376812,50.695315)"     id="Layer_x0020_1-2">    <circle       class="fil0 str0"       cx="2500"       cy="2500"       r="2200"       id="circle3713-6"       style="fill:url(#radialGradient3763);stroke:#9b9da2;stroke-width:100;stroke-opacity:0.1" />    <path       inkscape:connector-curvature="0"       class="fil1 str0"       d="M 801,2300 1801,1300 c 50,-50 100,-100 200,-100 100,0 200,100 200,200 v 500 c 0,50 50,100 100,100 h 1900 c 50,0 100,50 100,100 v 800 c 0,50 -50,100 -100,100 H 2301 c -50,0 -100,50 -100,100 v 500 c 0,100 -100,200 -200,200 -100,0 -150,-50 -200,-100 L 801,2700 c -135,-135 -135,-265 0,-400 z"       id="path3715-5"       style="fill:url(#radialGradient3765);stroke:#9b9da2;stroke-width:100" />  </g></svg>';


	// ------------------------- Routing functions -------------------

	var routeLinkHashMap = new Object();
    var legLinkHashMap = new Object();
	var lastRouteURL = "";
	var routeStroke = 8;
    //  colors from https://here.widencollective.com/portals/aus43pig/03ColorGuidelinesPage   
	var routeColor = ["rgba(68, 202, 157, 0.8)", "rgba(125, 186, 228, 0.7)", "rgba(211, 85, 102, 0.6)"];
	var address = "", firstMarker = null, lastMarker = null;
    // instance of routing service
    var router = platform.getRoutingService();
    var clickCoords = null, polyline;
    var routingGroup = new H.map.Group();
    map.addObject(routingGroup);


	// function to calculate route
    function calculateRouteFromAtoB(vehicleType){
		var routerResource =   '/2/calculateroute.json?'+'app_id=' + app_id + '&app_code=' + app_code;
		lastRouteURL = routerResource +'&mode=fastest;'+ vehicleType +';traffic:disabled' +"&waypoint0="+waypoint_first.lat + "," + waypoint_first.lng+"&waypoint1="+waypoint_last.lat + "," + waypoint_last.lng;
		calculateRoute(lastRouteURL);
    }
	
	/**
	* Function to trigger calculation of the last route
	**/
	function reCalculateRoute(){
		calculateRoute(lastRouteURL);
	}

	/**
	*	Calculate route using Custom Route API
	*/
	function calculateRoute(url) {
		Spinner.showSpinner();
		$.ajax({
			url: endpoint.value + url + '&algopts=nohlprouter&overlays='+ mapname.value,
			dataType: "json",
			async: true,
			type: 'get',
			success: function(data) {
				Spinner.hideSpinner();
				parseRoutingResponse(data);
			},
			error: function(xhr, status, e) {
				Spinner.hideSpinner();
				var errorResp = (xhr.responseJSON.issues[0] || {
					"message": "unknown error occured"
				});
				feedbackTxt.innerHTML = "<font color=\"red\">" + errorResp.message + "</font>";
				feedbackTxt.innerHTML += "<br/>";
			}
		});
	}

     /**
     * Creates poly lines for interconnections
     * @param strip
     * @param num
     * @returns {H.map.Polyline}
     */
     var createPolylineForIndex = function(strip, num) {
            return new H.map.Polyline(strip, {
                style: {
                    lineWidth: 8,
                    strokeColor:  routeColor[0],
                    fillColor: routeColor[0],
                }
            });
     };

	/**
	* Function clears the routes added on the mao
	**/
	function clearRoute(){
			routingGroup.removeAll();
	}

    /**
    *  Parse the routing response
    **/
    function parseRoutingResponse(resp) {
			clearRoute();
            routeLinkHashMap = new Object();

            // create link objects
            for (var r = 0; r < resp.response.route.length; r++) {
                for(var k = 0; k<resp.response.route[r].leg.length; k++){
                    for (var m = 0; m < resp.response.route[r].leg[k].link.length; m++) {
                        // only add new link if it does not exist so far - so alternatives are not drawn multiple times
                        var linkId = (resp.response.route[r].leg[k].link[m].linkId.lastIndexOf("+", 0) === 0 ? resp.response.route[r].leg[k].link[m].linkId.substring(1) : resp.response.route[r].leg[k].link[m].linkId);
                        if (routeLinkHashMap[linkId] == null) {
                            var strip = new H.geo.Strip(),
                                shape = resp.response.route[r].leg[k].link[m].shape,
                                i,
                                l = shape.length;

                            for (i = 0; i < l; i += 2) {
                                strip.pushLatLngAlt(shape[i], shape[i + 1], 0);
                            }

                            var link = new H.map.Polyline(strip, {
                                style: {
                                    lineWidth: (routeStroke - (r + 1)), // alternatives get smaller line with
                                    strokeColor: routeColor[r],
                                    lineCap: 'butt'
                                }
                            });
                            link.setArrows({
                                color: "#F00F",
                                width: 2,
                                length: 3,
                                frequency: 8
                            });
                            link.$linkId = resp.response.route[r].leg[k].link[m].linkId;

                            //The router can send back links ids with "-" or "+" prefix: only "-" prefix is kept and stored in this HashMap, the "+" is removed
                            routeLinkHashMap[linkId] = link;
                            legLinkHashMap[linkId] = resp.response.route[r].leg[k].link[m];
                            // add event listener to link
                            link.addEventListener("mouseover", function(e) {
                                if (currentOpenBubble)
                                    ui.removeBubble(currentOpenBubble);
                                var html = '<div>' +
                                    '<p style="font-family:Arial,sans-serif; font-size:12px;">LinkId: ' + e.target.$linkId + '</p>'
                                '</div>';

                                var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);

                                currentOpenBubble = new H.ui.InfoBubble(pos, {
                                    content: html
                                });
                                ui.addBubble(currentOpenBubble);
                            });
                        }
                    }
                }
            }

            /**
            *   draw a smooth route
            */
            for (var r = 0; r < resp.response.route.length; r++) {
                for(var k = 0; k<resp.response.route[r].leg.length; k++){
                    for (var linkIdx in resp.response.route[r].leg[k].link) {
                        var strip = new H.geo.Strip();
                        var shape = resp.response.route[r].leg[k].link[linkIdx].shape;
                        var l = shape.length;

                        for (var i = 0; i < l; i = i + 2) {
                            strip.pushLatLngAlt.apply(strip, [shape[i], shape[i + 1]].map(function(item) {
                                return parseFloat(item);
                            }));
                        }
                        var polyline = createPolylineForIndex(strip, linkIdx);
                        polyline.setArrows(true);
                        routingGroup.addObject(polyline);
                    }
                    var maneuvers = resp.response.route[r].leg[k].maneuver
                    for(var i in maneuvers){
                        addManueversToMap(maneuvers[i]);
                    }
                }
				// Add waypoints on the map
				 for(var k = 0; k<resp.response.route[r].waypoint.length; k++){
					var waypoint = resp.response.route[r].waypoint[k];
					var lat = waypoint.originalPosition.latitude;
                    var lon =  waypoint.originalPosition.longitude;
                    var point = new H.geo.Point(parseFloat(lat), parseFloat(lon));
					var marker = new H.map.Marker(point, { icon: createIconMarker(  "Waypoint:"+k, waypoint.mappedRoadName,) });
                    routingGroup.addObject(marker);
				 }
				
            }
			
			// add tap action for maneuve markers
			routingGroup.addEventListener('tap', function (evt) {
				map.setCenter(evt.target.getPosition());
				if(evt.target.instruction)
				openBubble(
				   evt.target.getPosition(), evt.target.instruction);
			  }, false);
			
			map.addObject(routingGroup);
			map.setViewBounds(routingGroup.getBounds());
            feedbackTxt.innerHTML = "";
	}
	
	/**
	 * Creates a series of H.map.Marker points from the route and adds them to the map.
	 * @param {Object} route  A route as received from the H.service.RoutingService
	 */
	function addManueversToMap(maneuver){
	  var svgMarkup = '<svg width="18" height="18" ' +
		'xmlns="http://www.w3.org/2000/svg">' +
		'<circle cx="8" cy="8" r="8" ' +
		  'fill="#fab800" stroke="white" stroke-width="1"  />' +
		'</svg>',
		dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}});

		  // Add a marker to the maneuvers group
		  var marker =  new H.map.Marker({
			lat: maneuver.position.latitude,
			lng: maneuver.position.longitude} ,
			{icon: dotIcon});
		
		 var instr = maneuver.instruction + "<br/> Travel Time :"+maneuver.travelTime +" seconds";
		 var html = '<div>' +
                                    '<p style="font-family:Arial,sans-serif; font-size:12px;">' + instr + '</p>'
                                '</div>';
		  marker.instruction = html;
		  routingGroup.addObject(marker);

	}
	
	var bubble;
	/**
	 * Opens/Closes a infobubble
	 * @param  {H.geo.Point} position     The location on the map.
	 * @param  {String} text              The contents of the infobubble.
	 */
	function openBubble(position, text){
	 if(!bubble){
		bubble =  new H.ui.InfoBubble(
		  position,
		  {content: text});
		ui.addBubble(bubble);
	  } else {
		bubble.setPosition(position);
		bubble.setContent(text);
		bubble.open();
	  }
	}
    
    
    // function creates a marker , adds to map
    function addMarker(coordinates){
        var marker = new H.map.Marker({
            lat: clickCoords.lat,
            lng: clickCoords.lng
        });
        routingGroup.addObject(marker);
        return marker;
    }
    
    // function removes objects from map as required
    function removeObjects(onlyPolyline){
        if (onlyPolyline) {
            if (routingGroup.contains(polyline)) 
                routingGroup.removeObject(polyline);
            if (routingGroup.contains(lastMarker)) 
                routingGroup.removeObject(lastMarker);
        }
        else {
            routingGroup.removeAll();
        }
    }

	// user-provided appid and appcode
    function changeAuth() {
        var customAppId = document.getElementById('customAppId').value;
        var customAppCode = document.getElementById('customAppCode').value;
        				
        if( customAppId.length > 0 && customAppCode.length > 0 ) {
            app_id= customAppId;
			app_code= customAppCode;
            console.log( 'Credentials updated to ' + app_id  );
        }
    }

// ------------------------- Geocoding functions -------------------
var geocoder = platform.getGeocodingService();

var geocode = function(){
	var location = document.getElementById("location").value;
	geocoder.geocode({
			searchText: location
		},
		function(result) {
			if(result.Response.View[0].Result[0].Location != null){
				pos = result.Response.View[0].Result[0].Location.DisplayPosition;
				address = result.Response.View[0].Result[0].Location.Address;
			}
			else{
				pos = result.Response.View[0].Result[0].Place.Locations[0].DisplayPosition;
				address = result.Response.View[0].Result[0].Place.Locations[0].Address;
			}
			pointA = new H.geo.Point(pos.Latitude, pos.Longitude);
			map.setCenter(pointA);
			map.setZoom(17);
		},
		function(error) {
			alert(error);
		}
	);
};

/**
* Method that takes the clicked points and sends it to RME for map matching. 
**/
var mapMatch = function (id, action, shapeArrToMapMatch) {
	//objContainer.removeAll();
	try {
		var currentMapMatchedGroup = action === "delete_shape_point" && id ?  mapMatchedRoadGroups[id - 1]  : getCurrentMapMatchedGroup(true); 
		if (currentMapMatchedGroup) currentMapMatchedGroup.removeAll();
	} catch (e) {}


	// if there is an app_id specified in the URL then use it, otherwise use the default
	var url = "https://fleet.api.here.com/2/calculateroute.json?routeMatch=1&mode=fastest;car;traffic:disabled&app_id="+app_id_cors+"&app_code="+app_code_cors; //give a hard coded value for now
	
	 // new: calculateroute.json, send POST request
	content = 'SEQNR,\tLATITUDE,\tLONGITUDE';
	if (shapeArrToMapMatch){ //an existing road shape must be re-map matched e.g., after deleting some shape point(s) from an existing road
		for(var i=0; i<shapeArrToMapMatch.length; i++){
			content += "\n" + i + ",\t"+shapeArrToMapMatch[i][0]+",\t"+ shapeArrToMapMatch[i][1];
		}
	}else{ //a new non-existing road array to be map matched
		for(var i=0; i<currRoadShapeArr.length; i++){
			content += "\n" + i + ",\t"+currRoadShapeArr[i][0]+",\t"+ currRoadShapeArr[i][1];
		}
	}
	console.log("Values to be map matched: "+content);
	$.ajax({
        url: url,
        dataType: "json",
        async: true,
        type: 'post',
		data:content,
		contentType: 'application/octet-stream',
        success: function(data) {
            gotMapMatchResponse(data,id,action);
        },
        error: function(xhr, status, e) {
            alert((xhr.responseJSON.issues[0].message ? xhr.responseJSON.issues[0].message :  xhr.responseJSON.issues[0] ) || xhr.responseJSON);
        }
    });
};

/**
	Callback that is used to parse the RME response and display the matched point on the map
*/
var gotMapMatchResponse = function (respJsonObj, id, action) {
	
	var currentMapMatchedGroup = action === "delete_shape_point" && id ? mapMatchedRoadGroups[id - 1]  : getCurrentMapMatchedGroup(false); 
	var currentRoadNumber = id ? id : mapMatchedRoadGroups.length;
	if (action === "delete_shape_point" && id && id <= mapMatchedRoadGroups.length) mapMatchedRoadGroups[id -1] = currentMapMatchedGroup; //already existing group
	var currRoadShapeMapMatchedArr = []; // matched lat and lng as returned by RME
	try {
		if (currentMapMatchedGroup) currentMapMatchedGroup.removeAll();
	} catch (e) {}

	if (respJsonObj.error != undefined || respJsonObj.faultCode != undefined || respJsonObj.type) {
		alert(respJsonObj.message + "\nStatus: " + respJsonObj.responseCode);
		return;
	}
	
	// parse links and show on map
	var routeLinks = respJsonObj.response.route[0].leg[0].link;
	tracePoints = respJsonObj.response.route[0].waypoint;

	//Draw the original and matched trace points and their offsets
	for (var l = 0; l < tracePoints.length; l++) {
		var p = tracePoints[l];
		currentMapMatchedGroup.addObject(new H.map.Marker(new H.geo.Point(p.  mappedPosition.latitude, p.  mappedPosition.longitude), {icon: createIcon("#008000", currentRoadNumber + "." + l)}));	
		currRoadShapeMapMatchedArr.push([p.  mappedPosition.latitude, p.  mappedPosition.longitude]);
	}

	//draw the matched links on the maps
	for (var l = 0; l < routeLinks.length; l++) {
		var coords1 =  routeLinks[l].shape;
		var coords2 = new H.geo.Strip();
		if (routeLinks[l].offset && routeLinks[l].offset < 1) {
		    if (routeLinks[l].linkId < 0){
		    	distance = (1 - routeLinks[l].offset) * (routeLinks[l].length);
			} else {
				distance = routeLinks[l].offset * (routeLinks[l].length); //if  offset is set calculate new length of the link
			}
			coords1 = getCoordsWithOffset(coords1, distance, l, routeLinks.length);
		} 
		for (var c = 0; c < coords1.length; c += 2){
			coords2.pushLatLngAlt(coords1[c], coords1[c+1], null); //if it is not offset link, just add new point
		}

			var lineStyle = lineStyle =  {lineWidth: 8, strokeColor: "rgba(0,128,0 ,0.7)", lineJoin: "round" , lineDash : [0,8]}; //green color to display the matched route
			var linkPolyline = new H.map.Polyline(coords2, {zIndex: 3, style: lineStyle});
			currentMapMatchedGroup.addObject(linkPolyline);
	}
		
	map.addObject(currentMapMatchedGroup);
	if (id && action && action === "finalize_with_map_match" && currRoadShapeMapMatchedArr.length > 0){ //user has clicked on the Finalize shape and he would like to use the matched points
		currRoadShapeArr = [];
		mapMatchedRoadShapes[id - 1] = getLineForMapMatchedPoint(id, currRoadShapeMapMatchedArr);
		addRoad(id  , currRoadShapeMapMatchedArr, true, true);
	}else if (id && action && (action === "finalize" || action === "delete_shape_point")){ //user has clicked on Finalize Shape cotext item but he does not want to use the matched points but the original one which he entered but we still want to store the matched points if he later wants to change it
		mapMatchedRoadShapes[id - 1] = getLineForMapMatchedPoint(id, currRoadShapeMapMatchedArr);
	}
};

	var getCoordsWithOffset = function (coords1, distance, currentLink, numberOfLinks){
	
	 var temp = [];
	 var prevCoord = [coords1[0], coords1[1]];
		for (var c = 0; c < coords1.length; c += 2){
			var linkLength = getKartesianDistanceInMeter(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1]);  //calculate distance to the next point  // if this is a link with offset, do calculations for the offset
			   if ((distance - linkLength) < 0) {        //if offset is not reached add new point
			       	 // var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], linkLength - distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
			       	  var midPoint = getMidPoint(prevCoord[0], prevCoord[1], coords1[c], coords1[c+1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
			       	  var midPointIndex = c;
	    		   	  break;
	    	   } else {
		           distance = distance - linkLength;

	    	   }
			prevCoord[0] = coords1[c];
			prevCoord[1] = coords1[c + 1];
	    }
		 if(!midPoint) {
		   var midPoint = getMidPoint(coords1[coords1.length - 4], coords1[coords1.length - 3], coords1[coords1.length - 2], coords1[coords1.length - 1], distance);  //if offset is reached calculate new point based on the distance from the first point, and angle of the link.
		   	var midPointIndex = coords1.length - 2;
		 }
		 if (currentLink == 0 || uTurn){
			 if (uTurn) uTurn = false;	
			 temp.push(String(midPoint[0]));
			 temp.push(String(midPoint[1]));
			 for (var c = midPointIndex; c < coords1.length; c += 1){
				 temp.push(coords1[c]);
			 }
		 } else {                                         
			 if (currentLink != numberOfLinks-1) uTurn = true;         
			 for (var c = 0; c < midPointIndex; c += 1){
				 temp.push(coords1[c]);
			 }
			 temp.push(midPoint[0]);
			 temp.push(midPoint[1]);
		 }

		 return temp;
	}

	/**
	* Converts cartesian distance between cordinates
	**/
	var getKartesianDistanceInMeter = function(lat1, lon1, lat2, lon2)
	{
		  
		  var earthRadius = 6371000;
			// convert input parameters from decimal degrees into radians
		  var phi1 = (lat1) * Math.PI / 180;	  
		  var phi2 = (lat2) * Math.PI / 180;
		  var dphi = phi2 - phi1;
		  var dl = (lon2 - lon1) * (Math.PI / 180);

		  var a = Math.sin(dphi/2) * Math.sin(dphi/2) +
		          Math.cos(phi1) * Math.cos(phi2) *
		          Math.sin(dl/2) * Math.sin(dl/2);
		  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

		  return earthRadius * c;
	}

	/**
	* Calculate the mid point between two coordinates
	**/
	var getMidPoint = function(lat1, lon1, lat2, lon2, distance)
    {
    	  
	      var heading = getHeading(lat2,lon2,lat1,lon1);
    	  var shiftedLatLon = shiftLatLon(lat1, lon1, ((parseFloat(heading) + 180) % 360), distance);  // only 180 degrees to go into the opposite direction
    	  
	    return shiftedLatLon;
    }
    
  	/**
	* Function gets the heading between coordinates
	**/
	function getHeading(lat1,lng1,lat2,lng2)
	{
		var phi1 = lat1 * (Math.PI / 180),
			phi2 = lat2 * (Math.PI / 180),
			dl = (lng2 - lng1) * (Math.PI / 180),
			y = Math.sin(dl) * Math.cos(phi2),
			x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl),
			t = Math.atan2(y, x);

		return Math.round(((t * 180 / Math.PI) + 360) % 360);
	};
	
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
		Creates icons with Text (used for tracepoint sequence number)
	*/
	var createIcon = function (color, text)
	{
		var canvas = document.createElement('canvas'),
			width = 28,
			height = 16,
			fontSize = 10;
			
		canvas.width = width;
		canvas.height = height;

		ctx = canvas.getContext('2d');
			
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(14, 16);
		ctx.lineTo(14, 9);
		ctx.stroke();
		ctx.closePath();

		ctx.font = 'bold ' + fontSize + 'px Arial';
		ctx.fillStyle = color;
		ctx.textAlign = 'center'; 
		ctx.fillText(text,14,8);

		var icon = new mapsjs.map.Icon(canvas,
					({
						'anchor': {
							'x': 14,
							'y': 16
						}
					}));
		delete canvas; 
		return icon;
	};

	/**
	  Method which will either create a new group to store the map matched links and return it or return the group of currently added road if alrady exists.
	  We need this because in the mapMatch method we are sending the entered road points in incremental order to RME for map match and we need to first clear
	  already existing matched links in the current group and then add the newly matched links in that group to show it on the map.
	  We need a separate group for each of the entered/created road
	*/
	function getCurrentMapMatchedGroup (createNewGroup){

	  var mapMatchedGroup;
	  
	  if (currRoadShapeArr.length == 1 && createNewGroup){ // we have just started to create a road on the map so we need a corresponding group for this roadCreated
		  mapMatchedGroup= new H.map.Group();
		  mapMatchedRoadGroups.push(mapMatchedGroup);
	  }else{ // a group for this road already existing so return the last one from the array
	  	  mapMatchedGroup = mapMatchedRoadGroups[mapMatchedRoadGroups.length - 1];				
	  }

	  return mapMatchedGroup;
	}
	
	/***
	* Function returns the map matched coordinate for the passed index in polygon
	**/
	function getLineForMapMatchedPoint(id, currRoadShapeMapMatchedArr){
		var road = new H.geo.Strip();
			for(var i=0; i<currRoadShapeMapMatchedArr.length; i++){
				road.pushPoint(new H.geo.Point(currRoadShapeMapMatchedArr[i][0], currRoadShapeMapMatchedArr[i][1]));
			}
		var mapMatchedRoadShape = new H.map.Polyline(road, roadDisplayOptions[id%6]);
		return mapMatchedRoadShape;
	}
	
	/**
	* Funtion returns the polyline shape in json format
	**/
	function generateJSONStringFromPolyLine(polyLine){
		var shape = [];

		polyLine.getGeometry().eachLatLngAlt(function (lat, lng, alt, idx) {
			var tempShape = [];
			tempShape.push(parseFloat(parseFloat(lat).toFixed(6)));
			tempShape.push(parseFloat(parseFloat(lng).toFixed(6)));
			shape[shape.length] = tempShape;
		});
		return JSON.stringify(shape).replace(/"/g,"");
	}

	/**
		once an existing road is deleted from the map then its corresponding map matching road is also deleted. Since we show the mapped point with the road number
		and the entered point number within the road for example if a road is added and its number is 2 then the first point within this road will get a number 2.1 the second
		entered/clicked point within this road will get a number 2.2 and so on. This is to just easily identify which point within the road is mapped to which point on the acutal road.
		But when a road is deleted from the map we  have to adapt this number for the other roads and this is done by redrawing the mapped roads on the maps.
	**/
	function drawMapMatchedShapes(){

		if (mapMatchedRoadShapes.length !== mapMatchedRoadGroups.length) //both must have the same length otherwise we run into the error in the below code
			return;
			
		var lineStyle = lineStyle =  {lineWidth: 8, strokeColor: "rgba(0,128,0 ,1)", lineJoin: "round"}; //green color to display the matched route

		for (var r=0; r<mapMatchedRoadShapes.length; r++){
			var mapMatchedRoadGroup = mapMatchedRoadGroups[r];
			var mapMatchedUpdatedRoadShape = mapMatchedRoadShapes[r];

			if (mapMatchedRoadGroup && mapMatchedUpdatedRoadShape){
				mapMatchedRoadGroup.removeAll();

				mapMatchedUpdatedRoadShape.getGeometry().eachLatLngAlt(function (lat, lng, alt, idx) {
					mapMatchedRoadGroup.addObject(new H.map.Marker(new H.geo.Point(parseFloat(parseFloat(lat).toFixed(6)), parseFloat(parseFloat(lng).toFixed(6))), {icon: createIcon("#008000", (r+1) + "." + idx)}));	
				});

				var linkPolyline = new H.map.Polyline(mapMatchedUpdatedRoadShape.getGeometry(), {zIndex: 3, style: lineStyle});
				mapMatchedRoadGroup.addObject(linkPolyline);
				map.addObject(mapMatchedRoadGroup);
			}
		}
	}