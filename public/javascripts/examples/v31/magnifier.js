/* 
	(C) HERE 2020
*/

(function() {
	
	var allMapsShown = false,
		isFlowOn = false,
		that =  this,
		minimap_cmap = null;
	
	var Magnifier = function()
	{
		H.ui.Control.call(this);
		this.parent = map.getElement();
		this.init();
		this.setAlignment('bottom-right');
	};
  
	inherits(Magnifier, H.ui.Control);

	Magnifier.prototype.init = function()
	{		
		// creating UI elements to show the maginifier component

		//div element to be passed to create satellite mini view
		this.wrapper = document.createElement('div');
		this.wrapper.style.width = '100%';
		this.wrapper.style.height = '100%';
		this.wrapper.style.display = 'block'; 
		this.wrapper.style.position = 'absolute'; 
		this.wrapper.style.padding = '0px';
		this.wrapper.style.webkitUserSelect = "none";
		this.wrapper.style.cursor = "pointer";
		this.wrapper.id = "wrapper_sat";

		// div to show default satellite mini view in UI
		this.layer = document.createElement('div');
		this.layer.id = 'minimapsat';
		this.layer.style.width = '100px';
		this.layer.style.height = '100px';
		this.layer.style.margin = 0;
		this.layer.style.padding = 0; 
		this.layer.style.right = '6px';
		this.layer.style.bottom = '25px';
		this.layer.style.position = 'absolute';
		this.layer.style.border = '3px solid white';
		this.layer.style.borderRadius = '3px';
		this.layer.style.boxShadow = '0 0 5px black';
		this.layer.style.display = 'block';
		this.layer.style.backgroundColor = 'white';
		this.layer.style.webkitUserSelect = "none";
		
		// div element which adds a border to the satellite mini view
		this.layer_overlay = document.createElement('div');
		this.layer_overlay.id = 'minimapsat_overlay';
		this.layer_overlay.style.width = '100px';
		this.layer_overlay.style.height = '100px';
		this.layer_overlay.style.margin = 0;
		this.layer_overlay.style.padding = 0; 
		this.layer_overlay.style.right = '6px';
		this.layer_overlay.style.bottom = '25px';
		this.layer_overlay.style.position = 'absolute';
		this.layer_overlay.style.borderRadius = '3px';
		this.layer_overlay.style.display = 'block';
		this.layer_overlay.style.cursor = 'pointer';
		this.layer_overlay.style.webkitUserSelect = "none";
		// label for the the satellite mini view
		this.head = document.createElement('div');
		this.head.id = 'head_satellite';
		this.head.style.width = '94px';
		this.head.style.height = '20px';
		this.head.style.backgroundColor = 'white';
		this.head.style.opacity = '0.8';
		this.head.innerHTML = 'Satellite';
		this.head.style.textAlign = 'center';
		
		// append div to the parent UI div
		this.layer.appendChild(this.wrapper);
		this.layer.appendChild(this.head);
		
		//div element to be passed to create terrain mini view
		this.wrapper_terrain = document.createElement('div');
		this.wrapper_terrain.style.width = '100%';
		this.wrapper_terrain.style.height = '100%';
		this.wrapper_terrain.style.display = 'block'; 
		this.wrapper_terrain.style.position = 'absolute'; 
		this.wrapper_terrain.style.padding = '0px';
		this.wrapper_terrain.style.webkitUserSelect = "none";
		this.wrapper_terrain.style.cursor = "pointer";

		// div to show default terrain mini view in UI
		this.layer_terrain = document.createElement('div');
		this.layer_terrain.id = 'minimapterrain';
		this.layer_terrain.style.width = '100px';
		this.layer_terrain.style.height = '100px';
		this.layer_terrain.style.margin = 0;
		this.layer_terrain.style.padding = 0; 
		this.layer_terrain.style.right = '-3px';
		this.layer_terrain.style.bottom = '100px';
		this.layer_terrain.style.position = 'absolute';
		this.layer_terrain.style.border = '3px solid white';
		this.layer_terrain.style.borderRadius = '3px';
		this.layer_terrain.style.boxShadow = '0 0 5px black';
		this.layer_terrain.style.display = 'block';
		this.layer_terrain.style.backgroundColor = 'white';
		this.layer_terrain.style.webkitUserSelect = "none";
		// label for the the terrain mini view
		this.head_terrain = document.createElement('div');
		this.head_terrain.id = 'head_terrain';
		this.head_terrain.style.width = '94px';
		this.head_terrain.style.height = '20px';
		this.head_terrain.style.backgroundColor = 'white';
		this.head_terrain.style.opacity = '0.8';
		this.head_terrain.innerHTML = 'Terrain';
		this.head_terrain.style.textAlign = 'center';
		
		// append div to the parent UI div
		this.layer_terrain.appendChild(this.wrapper_terrain);
		this.layer_terrain.appendChild(this.head_terrain);

		//div element to be passed to create classic mini view
		this.wrapper_cmap = document.createElement('div');
		this.wrapper_cmap.style.width = '100%';
		this.wrapper_cmap.style.height = '100%';
		this.wrapper_cmap.style.display = 'block'; 
		this.wrapper_cmap.style.position = 'absolute'; 
		this.wrapper_cmap.style.padding = '0px';
		this.wrapper_cmap.style.webkitUserSelect = "none";
		this.wrapper_cmap.style.cursor = "pointer";

		// div to show  classic mini view in UI
		this.layer_cmap = document.createElement('div');
		this.layer_cmap.id = 'minimapclassic';
		this.layer_cmap.style.width = '100px';
		this.layer_cmap.style.height = '100px';
		this.layer_cmap.style.margin = 0;
		this.layer_cmap.style.padding = 0; 
		this.layer_cmap.style.right = '-3px';
		this.layer_cmap.style.bottom = '203px';
		this.layer_cmap.style.position = 'absolute';
		this.layer_cmap.style.border = '3px solid white';
		this.layer_cmap.style.borderRadius = '3px';
		this.layer_cmap.style.boxShadow = '0 0 5px black';
		this.layer_cmap.style.display = 'block';
		this.layer_cmap.style.backgroundColor = 'white';
		this.layer_cmap.style.webkitUserSelect = "none";
		// label for the classic mini view
		this.head_cmap = document.createElement('div');
		this.head_cmap.id = 'head_classic';
		this.head_cmap.style.width = '94px';
		this.head_cmap.style.height = '20px';
		this.head_cmap.style.backgroundColor = 'white';
		this.head_cmap.style.opacity = '0.8';
		this.head_cmap.innerHTML = 'Classic';
		this.head_cmap.style.textAlign = 'center';
		
		this.layer_cmap.appendChild(this.wrapper_cmap);
		this.layer_cmap.appendChild(this.head_cmap);

		// adding the layes to Satellite UI div
		// to access them in callback functions
		this.layer.layer_terrain = this.layer_terrain;
		this.layer.wrapper_terrain = this.wrapper_terrain;
		
		this.layer.layer_cmap = this.layer_cmap;
		this.layer.wrapper_cmap = this.wrapper_cmap;
		
		// Div to show Traffic flow button
		this.layer.layer_flow = document.createElement('div');
		this.layer.layer_flow.id = '_flow';
		this.layer.layer_flow.style.width = '100px';
		this.layer.layer_flow.style.height = '20px';
		this.layer.layer_flow.style.right = '-3px';
		this.layer.layer_flow.style.margin = 0;
		this.layer.layer_flow.style.padding = 0;
		this.layer.layer_flow.style.backgroundColor = 'white';
		this.layer.layer_flow.style.opacity = '0.8';
		this.layer.layer_flow.innerHTML = 'Flow';
		this.layer.layer_flow.style.textAlign = 'center';
		this.layer.layer_flow.style.bottom = "328px";
		this.layer.layer_flow.style.position = "absolute";
		this.layer.layer_flow.style.border = '3px solid white';
		this.layer.layer_flow.style.borderRadius = '3px';
		this.layer.layer_flow.style.boxShadow = '0 0 5px black';
		this.layer.layer_flow.style.display = 'block';
		this.layer.layer_flow.style.backgroundColor = 'white';
		this.layer.layer_flow.style.webkitUserSelect = "none";
		this.layer.layer_flow.style.cursor = "pointer";
		
		// Div to show Traffic incidents button
		this.layer.layer_incidents = document.createElement('div');
		this.layer.layer_incidents.id = '_inc';
		this.layer.layer_incidents.style.width = '100px';
		this.layer.layer_incidents.style.height = '20px';
		this.layer.layer_incidents.style.right = '-3px';
		this.layer.layer_incidents.style.margin = 0;
		this.layer.layer_incidents.style.padding = 0;
		this.layer.layer_incidents.style.backgroundColor = 'white';
		this.layer.layer_incidents.style.opacity = '0.8';
		this.layer.layer_incidents.innerHTML = 'Incidents';
		this.layer.layer_incidents.style.textAlign = 'center';
		this.layer.layer_incidents.style.bottom = "306px";
		this.layer.layer_incidents.style.position = "absolute";
		this.layer.layer_incidents.style.border = '3px solid white';
		this.layer.layer_incidents.style.borderRadius = '3px';
		this.layer.layer_incidents.style.boxShadow = '0 0 5px black';
		this.layer.layer_incidents.style.display = 'block';
		this.layer.layer_incidents.style.backgroundColor = 'white';
		this.layer.layer_incidents.style.webkitUserSelect = "none";
		this.layer.layer_incidents.style.cursor = "pointer";
		
		// callback when click event occurs on the div showing the 
		// UI component
		this.layer_overlay.addEventListener('click', 
			function(event)
			{
				// if all the mini maps are being shown
				// update the layers accordingly
				if(allMapsShown)
				{
					// check for JS API 3.1
					if(maptypes.vector){
						if(minimap_sat.getBaseLayer() == minimapLayers.raster.satellite.map){
							// update map base layer
							map.setBaseLayer(maptypes.raster.satellite.map);
							// exchange base layers of mini maps
							document.getElementById('head_satellite').innerHTML = "Classic"
							minimap_sat.setBaseLayer(minimapLayers.vector.normal.map);
							document.getElementById('head_classic').innerHTML = "Satellite";
							minimap_cmap.setBaseLayer(minimapClassicLayers.raster.satellite.map);
						}else{
							// update map base layer
							map.setBaseLayer(maptypes.vector.normal.map);
							// exchange base layers of mini maps
							document.getElementById('head_satellite').innerHTML = "Satellite";
							minimap_sat.setBaseLayer( minimapLayers.raster.satellite.map);
							document.getElementById('head_classic').innerHTML = "Classic";	
							minimap_cmap.setBaseLayer(minimapClassicLayers.vector.normal.map);
							
						}
						// add traffic layer if flow is enabled
						if(isFlowOn){
								map.addLayer(maptypes.vector.normal.traffic);
								minimap_sat.addLayer(minimapLayers.vector.normal.traffic);
								minimap_cmap.addLayer(minimapLayers.vector.normal.traffic);
						}
					
					}else{
						//code for JS API 3.0
						if(minimap_sat.getBaseLayer() == maptypes.satellite.map ||
							minimap_sat.getBaseLayer() == maptypes.satellite.traffic){
							// update map base layer
							map.setBaseLayer(isFlowOn ? maptypes.satellite.traffic : maptypes.satellite.map);
							// exchange base layers of mini maps taking into consideration 
							// the flow flag
							document.getElementById('head_satellite').innerHTML = "Classic"
							minimap_sat.setBaseLayer(isFlowOn ? maptypes.normal.traffic : maptypes.normal.map);
							document.getElementById('head_classic').innerHTML = "Satellite";
							minimap_cmap.setBaseLayer(isFlowOn ? maptypes.satellite.traffic : maptypes.satellite.map);
						}else{
							// update map base layer
							map.setBaseLayer(isFlowOn ? maptypes.normal.traffic : maptypes.normal.map);
							// exchange base layers of mini maps taking into consideration 
							// the flow flag
							document.getElementById('head_satellite').innerHTML = "Satellite";
							minimap_sat.setBaseLayer(isFlowOn ? maptypes.satellite.traffic : maptypes.satellite.map);
							document.getElementById('head_classic').innerHTML = "Classic";	
							minimap_cmap.setBaseLayer(isFlowOn ? maptypes.normal.traffic : maptypes.normal.map);
						}
					
					}
				}					
				//trigger a click event on div showing the mini map
				document.getElementById('minimapsat').click();
			}
		);
		
		this.layer.addEventListener('click', 
			function (event) 
			{
				// toggle map shown flag
				allMapsShown = !allMapsShown;
				if(allMapsShown)
				{
					// add the mini maps to the UI starting with
					// terrain map
					this.appendChild(this.layer_terrain);
					// adjust the map center accoring to the width/height 
					// of the divs
					var cPos = map.screenToGeo(offsetLeft + 50, offsetTop -53);
					if(typeof minimap_terrain === "undefined")
					{
						var terrain ;
						if(maptypes.vector){
							terrain= minimapLayers.raster.terrain.map;
						}else{
							terrain=isFlowOn ? maptypes.terrain.traffic : maptypes.terrain.map;
						}
						// init the terrain map
						minimap_terrain = new H.Map(this.wrapper_terrain, terrain, {
							center: cPos,
							zoom: map.getZoom(),
							imprint: null
						});
						// for JS API 3.1 add the traffic layer additionally 
						// if the flag is set
						if(isFlowOn && maptypes.vector){
							minimap_terrain.addLayer(minimapLayers.vector.normal.traffic);
						}
					}
					else
					{
						var terrain ;
						if(maptypes.vector){
							minimap_terrain.setBaseLayer(minimapLayers.raster.terrain.map);
							// for JS API 3.1 add/remove the traffic layer additionally 
							// if the flag is set
							if(isFlowOn)
								minimap_terrain.addLayer(minimapLayers.vector.normal.traffic);
							else
								minimap_terrain.removeLayer(minimapLayers.vector.normal.traffic);
						}else{
							terrain=isFlowOn ? maptypes.terrain.traffic : maptypes.terrain.map;
							minimap_terrain.setBaseLayer(terrain);
						}
						
						minimap_terrain.setCenter(cPos);
						minimap_terrain.setZoom(map.getZoom());
					}
					// callback for terrain mini map click 
					this.layer_terrain.addEventListener("click", function(e) 
					{
						var terrain ;
						if(maptypes.vector){
							terrain= maptypes.raster.terrain.map;
						}else{
							terrain=isFlowOn ? maptypes.terrain.traffic : maptypes.terrain.map;
						}
						map.setBaseLayer(terrain);
						
						if( maptypes.vector){
							if(isFlowOn)
								map.addLayer(maptypes.vector.normal.traffic);
							else
								map.removeLayer(maptypes.vector.normal.traffic);
						}
						
					});
					
					// add the classic mini maps to UI
					this.appendChild(this.layer_cmap);
					// adjust the map center accoring to the width/height 
					// of the divs
					var cPos = map.screenToGeo(offsetLeft + 50, offsetTop - 156);
					if(minimap_cmap == null)
					{
						var cMap;
						if(maptypes.vector){
							cMap= minimapClassicLayers.vector.normal.map;
						}else{
							cMap=isFlowOn ? maptypes.normal.traffic : maptypes.normal.map;
						}
						
						minimap_cmap = new H.Map(this.wrapper_cmap, cMap, {
							center: cPos,
							zoom: map.getZoom(),
							imprint: null
						});
						
						// for JS API 3.1 add/remove the traffic layer additionally 
						// if the flag is set
						if(maptypes.vector) {
							if(isFlowOn){
								minimap_cmap.addLayer(minimapClassicLayers.vector.normal.traffic);
							}else{
								minimap_cmap.removeLayer(minimapClassicLayers.vector.normal.traffic);
							} 
						}
					}
					else
					{
						var cMap;
						if(maptypes.vector){
							// toggle base layer of classic mini map
							if(document.getElementById('head_classic').innerHTML == "Classic"){
								minimap_cmap.setBaseLayer(minimapClassicLayers.vector.normal.map);
							}else{
								minimap_cmap.setBaseLayer(minimapClassicLayers.raster.satellite.map);
							}
							// for JS API 3.1 add/remove the traffic layer additionally 
							// if the flag is set
							if(isFlowOn){
								minimap_cmap.addLayer(minimapClassicLayers.vector.normal.traffic);
							}else{
								minimap_cmap.removeLayer(minimapClassicLayers.vector.normal.traffic);
							}
						}else{
							// toggle base layer of classic mini map
							if(document.getElementById('head_classic').innerHTML == "Classic"){
								cMap=isFlowOn ? maptypes.normal.traffic : maptypes.normal.map;
							}else{
								cMap=isFlowOn ? maptypes.satellite.traffic :maptypes.satellite.map;
							}
							minimap_cmap.setBaseLayer(cMap);
						}
						
						
						minimap_cmap.setCenter(cPos);
						minimap_cmap.setZoom(map.getZoom());
					}
					
					// call back for click on clasic mini map
					this.layer_cmap.addEventListener("click", function(e) 
					{
						var trafficLayer,satLayer;
						if(maptypes.vector){
							// toggle base layer of map
							if(document.getElementById('head_classic').innerHTML == "Classic"){
								map.setBaseLayer(maptypes.vector.normal.map);
							}else if(document.getElementById('head_classic').innerHTML == "Satellite"){
								map.setBaseLayer(maptypes.raster.satellite.map);

							}
							// for JS API 3.1 add the traffic layer additionally 
							// if the flag is set
							if(isFlowOn){
								map.addLayer(maptypes.vector.normal.traffic);
							}
						}else{
							// toggle base layer of map
							if(document.getElementById('head_classic').innerHTML == "Classic")
								map.setBaseLayer(isFlowOn ? maptypes.normal.traffic : maptypes.normal.map);
							else if(document.getElementById('head_classic').innerHTML == "Satellite")
								map.setBaseLayer(isFlowOn ? maptypes.satellite.traffic : maptypes.satellite.map);
						}
					});
					
					// add the flow button div to UI
					this.appendChild(this.layer_flow);
					// call back when flow button is clicked
					this.layer_flow.addEventListener("click", function(e)
					{
						e.stopImmediatePropagation();
						
						var usedmaptype;
						if(maptypes.vector){
							// for JS API 3.1 add/remove the traffic layer additionally 
							// if the flag is set
							if(isFlowOn){
								map.removeLayer(maptypes.vector.normal.traffic);
							}else{
								map.addLayer(maptypes.vector.normal.traffic);
							}
						}else{
							// update the bas layer of map
							if (map.getBaseLayer() == maptypes.normal.map) usedmaptype = maptypes.normal.traffic;
							else if(map.getBaseLayer() == maptypes.normal.traffic) usedmaptype = maptypes.normal.map;
							else if(map.getBaseLayer() == maptypes.terrain.map) usedmaptype = maptypes.terrain.traffic;
							else if(map.getBaseLayer() == maptypes.terrain.traffic) usedmaptype = maptypes.terrain.map;
							else if(map.getBaseLayer() == maptypes.satellite.map) usedmaptype = maptypes.satellite.traffic;
							else if(map.getBaseLayer() == maptypes.satellite.traffic) usedmaptype = maptypes.satellite.map;
							map.setBaseLayer(usedmaptype);
						}	
						// update style of the Flow button
						if(isFlowOn)
						{ 
							this.style.border = '3px solid white';
							isFlowOn = false;	
						}
						else
						{
							this.style.border = '3px solid rgb(46, 213, 201)';
							isFlowOn = true;
						}
						
						// dispatch event to sync the maps
						map.dispatchEvent('baselayerchange');
						document.getElementById('minimapsat').click();
					});
					
					// add the incidents button div to UI
					this.appendChild(this.layer_incidents);
					// call back when incidents button is clicked
					this.layer_incidents.addEventListener("click", function(e)
					{
						e.stopImmediatePropagation();
						var isIncOn = this.style.border == '3px solid rgb(46, 213, 201)' ? true : false;
						var layer;
						if(maptypes.vector){
							layer = maptypes.vector.normal.trafficincidents;
						}else{
							layer = maptypes.incidents;
						}
						// toggle indicents layer on the map
						if(isIncOn)
						{
							map.removeLayer(layer);
							this.style.border = '3px solid white';
						}
						else
						{
							map.addLayer(layer);
							this.style.border = '3px solid rgb(46, 213, 201)';
						}
						document.getElementById('minimapsat').click();
					});
				}
				else
				{
					// remove all divs from UI once any have been clicked
					this.removeChild(this.layer_terrain);
					this.removeChild(this.layer_cmap);
					this.removeChild(this.layer_flow);
					this.removeChild(this.layer_incidents);
				}
			}
		);

		// insert the Maginifier UI to map UI
		this.parent.insertBefore(this.layer, this.parent.lastChild);
		this.parent.insertBefore(this.layer_overlay, this.parent.lastChild);
		
		offsetLeft = this.layer.offsetLeft;
		offsetTop = this.layer.offsetTop;

		// adjust the center of satellite mini map based on height/width of div
		var cPos = map.screenToGeo(offsetLeft + 50, offsetTop + 50);
		if(maptypes.vector){
			satLayer = minimapLayers.raster.satellite.map;
		}else{
			satLayer = maptypes.satellite.map;
		}

		minimap_sat = new H.Map(this.wrapper, satLayer, {
					center: cPos,
					zoom: map.getZoom(),
					imprint: null
		});
		
		// trigger sync callback for changes in the map layer/view
		map.addEventListener('mapviewchange', this.sync);
		map.addEventListener('baselayerchange', this.sync);
	}

	Magnifier.prototype.renderInternal = function(element, doc) 
	{
		H.ui.Control.prototype.renderInternal.call(this, element, doc);
	}
 
	Magnifier.prototype.sync = function()
	{
		// allways update the Sat Minimap
		if(minimap_sat)
		{
			// adjust the center of satellite mini map based on height/width of div
			var cPos = map.screenToGeo(offsetLeft + 50, offsetTop + 50);
			minimap_sat.setCenter(cPos);
			minimap_sat.setZoom(this.getZoom());
			if(isFlowOn)
			{
				var usedmaptype;
				if(maptypes.vector){
					// for JS API 3.1 add the traffic layer additionally 
					// if the flag is set
					minimap_sat.addLayer(minimapLayers.vector.normal.traffic);
				}else{
					// update the satelitte mini map base layer
					if (minimap_sat.getBaseLayer() == maptypes.normal.map) usedmaptype = maptypes.normal.traffic;
					else if(minimap_sat.getBaseLayer() == maptypes.normal.traffic) usedmaptype = maptypes.normal.traffic;
					else if(minimap_sat.getBaseLayer() == maptypes.satellite.map) usedmaptype = maptypes.satellite.traffic;
					else if(minimap_sat.getBaseLayer() == maptypes.satellite.traffic) usedmaptype = maptypes.satellite.traffic;
					minimap_sat.setBaseLayer(usedmaptype);
				}
				
				
			}
			else
			{
				var usedmaptype;
				if(maptypes.vector){
					// for JS API 3.1 remove the traffic layer additionally 
					// if the flag is set
					minimap_sat.removeLayer(minimapLayers.vector.normal.traffic);
				}else{
					// update the satelitte mini map base layer
					if (minimap_sat.getBaseLayer() == maptypes.normal.map) usedmaptype = maptypes.normal.map;
					else if(minimap_sat.getBaseLayer() == maptypes.normal.traffic) usedmaptype = maptypes.normal.map;
					else if(minimap_sat.getBaseLayer() == maptypes.satellite.map) usedmaptype = maptypes.satellite.map;
					else if(minimap_sat.getBaseLayer() == maptypes.satellite.traffic) usedmaptype = maptypes.satellite.map;
					minimap_sat.setBaseLayer(usedmaptype);	
				}
							
			}
		}
		
		if(allMapsShown)
		{
			if(minimap_terrain)
			{
				// adjust the center of terrain mini map based on height/width of div
				var cPos = map.screenToGeo(offsetLeft + 50, offsetTop - 53);
				minimap_terrain.setCenter(cPos);
				minimap_terrain.setZoom(this.getZoom());
			}
			if(minimap_cmap)
			{
				// adjust the center of classic mini map based on height/width of div
				var cPos = map.screenToGeo(offsetLeft + 50, offsetTop - 156);
				minimap_cmap.setCenter(cPos);
				minimap_cmap.setZoom(this.getZoom());				

				if(isFlowOn)
				{
					var usedmaptype;
					if(maptypes.vector){
						// for JS API 3.1 add the traffic layer additionally 
						// if the flag is set
						minimap_cmap.addLayer( minimapClassicLayers.vector.normal.traffic);
					}else{
						// update the classic mini map base layer
						if (minimap_cmap.getBaseLayer() == maptypes.normal.map) usedmaptype = maptypes.normal.traffic;
						else if(minimap_cmap.getBaseLayer() == maptypes.normal.traffic) usedmaptype = maptypes.normal.traffic;
						else if(minimap_cmap.getBaseLayer() == maptypes.satellite.map) usedmaptype = maptypes.satellite.traffic;
						else if(minimap_cmap.getBaseLayer() == maptypes.satellite.traffic) usedmaptype = maptypes.satellite.traffic;
						minimap_cmap.setBaseLayer(usedmaptype);
					}
					
				}
				else	
				{
					var usedmaptype;
					if(maptypes.vector){
						// for JS API 3.1 remove the traffic layer additionally 
						// if the flag is set
						minimap_cmap.removeLayer( minimapClassicLayers.vector.normal.traffic);
					}
					else{
						// update the classic mini map base layer
						if (minimap_cmap.getBaseLayer() == maptypes.normal.map) usedmaptype = maptypes.normal.map;
						else if(minimap_cmap.getBaseLayer() == maptypes.normal.traffic) usedmaptype = maptypes.normal.map;
						else if(minimap_cmap.getBaseLayer() == maptypes.satellite.map) usedmaptype = maptypes.satellite.map;
						else if(minimap_cmap.getBaseLayer() == maptypes.satellite.traffic) usedmaptype = maptypes.satellite.map;
						minimap_cmap.setBaseLayer(usedmaptype);
					}		
				}
			}
		}
	}
	
	
	Magnifier.prototype.getId = function ()
	{
		return 'Magnifier';
	}

	Magnifier.prototype.getVersion = function ()
	{
		return '1.0.0';
	}
	
	H.ui.Magnifier = Magnifier;
})();