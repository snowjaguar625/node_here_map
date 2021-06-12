/*
	(C) HERE 2020
	*/

	function init()
	{
		// Check whether the environment should use hi-res maps
		var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
		
		// check if the site was loaded via secure connection
		var secure = (location.protocol === 'https:') ? true : false;

		// Create a platform object to communicate with the HERE REST APIs
		var platform = new H.service.Platform({
			apikey: api_key,useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers();

		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
			center: new H.geo.Point(41.88323004259764, -87.63241635074196),
			zoom: 16,
			pixelRatio: hidpi ? 2 : 1
		});

		// to store the returned locations
		var group = new H.map.Group();
		map.addObject(group);
		
		//
		var selectedMarker = null;
		
		// search center
		var searchcenter = map.getCenter();

		// Enable the map event system
		var mapevents = new H.mapevents.MapEvents(map);

		// Enable map interaction (pan, zoom, pinch-to-zoom)
		var behavior = new H.mapevents.Behavior(mapevents);

		// Enable the default UI
		var ui = H.ui.UI.createDefault(map, maptypes);
		
		var infoBubble;

		// if the window is resized, we need to resize the viewport
		window.addEventListener('resize', function() { map.getViewPort().resize(); });
		
		// jquery widget to show autocomplete UI element
		$.widget("custom.autocompleteHighlight", $.ui.autocomplete, {
			_renderItem : function (ul, item) {
				return $('<li>' + item.label + '</li>').appendTo(ul);
			}
		});
		
		
		// helper function for detecting when document is ready
		function getReady() 
		{
			var deferredReady = $.Deferred();
			$(document).ready(function()
			{
				deferredReady.resolve();
			});
			return deferredReady.promise();
		}

		var autoSuggestUrl = 'https://places.api.here.com/places/v1/autosuggest';
			
		if(secure)
			autoSuggestUrl = 'https://places.api.here.com/places/v1/autosuggest';

		var center_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="50px" height="50px">' +
			  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
			  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
			  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
			  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
			  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
			  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="green"/>' +
			  '</svg>';
		
		var selected_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="50px" height="50px">' +
			  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
			  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
			  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
			  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
			  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
			  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="red"/>' +
			  '</svg>';
		
		var center_icon = new H.map.Icon(center_svg),
			selected_icon = new H.map.Icon(selected_svg);
	
		
		$("#search").autocompleteHighlight({
			source : function (request, response) {
				placesRequest = $.ajax({
					url : autoSuggestUrl,
					beforeSend: function(request) {
						var boundingBox = map.getViewModel().getLookAtData().bounds.getBoundingBox();
						request.setRequestHeader('X-Map-Viewport', boundingBox.getTopLeft().lng 
							+ "," + boundingBox.getBottomRight().lat
							+ "," + boundingBox.getBottomRight().lng 
							+ "," + boundingBox.getTopLeft().lat);
						group.removeAll();
						
						var marker = new H.map.Marker(map.getCenter(), { icon: center_icon});
						group.addObject(marker);
					},
					dataType : "json",
					data : {
						size : 20,
						q : request.term,
						app_id : app_id,
						app_code : app_code
					}
				});
				
				$.when( getReady(), placesRequest).done( function( readyResponse, placesResponse ) 
				{
					var p = $.map(placesResponse[0].results, function (item) {
								if(item.vicinity)
								{
									value = item.title + " " + item.vicinity.replace(/(<br\/>)/gm, ', ');
									name = item.highlightedTitle + " " + item.vicinity.replace(/(<br\/>)/gm, ', ');
									
									var marker = new H.map.Marker(new H.geo.Point(item.position[0], item.position[1]));
									marker.setData(value);
									group.addObject(marker);
									
									return {
										label : name,
										value : {placeName:value,type: "Places", lat: item.position[0], lng: item.position[1]}
									}
								}
							});
					response(p);
				});
			}, 
			minLength : 2,
			select : function (event, ui) {
				event.preventDefault();
				if (ui.item) {
					selectItem(ui.item.value);
				}
				return true;
			},
		});

		group.addEventListener("tap",function (evt){
				if(evt.target.getData()){
					if(infoBubble){
						ui.removeBubble(infoBubble);
					}
					var pos = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
					var html =  '<div>'+
					'<p style="font-family:Arial,sans-serif; font-size:12px;">' +evt.target.getData()+
					'</div>';
					infoBubble = new H.ui.InfoBubble(pos, { content: html });
					ui.addBubble(infoBubble);
				}
			
		});
		
		
		function selectItem (obj)
		{
			if(obj && obj.type == "Places")
			{
				if(selectedMarker)
					group.removeObject(selectedMarker);
				selected_marker = new H.map.Marker(new H.geo.Point(obj.lat, obj.lng), {icon: selected_icon});
				group.removeAll();
				group.addObject(selected_marker);
				map.setCenter(new H.geo.Point(obj.lat, obj.lng));
				map.setZoom(18);
				document.getElementById("search").value=obj.placeName;
			}
		}
	}
	init();