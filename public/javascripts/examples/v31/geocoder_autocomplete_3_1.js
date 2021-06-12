/*
	author 
	(C) HERE 2018
	*/

	function init()
	{
		// Check whether the environment should use hi-res maps
		var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);
		
		// check if the site was loaded via secure connection
		var secure = (location.protocol === 'https:') ? true : false;

		// Create a platform object to communicate with the HERE REST APIs
		var platform = new H.service.Platform({
		apikey: api_key
		}),
		maptypes = platform.createDefaultLayers(),
		geocoder = platform.getGeocodingService();

		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
			center: center,
			zoom: zoom,
		});

		//add JS API Release information
		releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version;
		//add MRS Release information
		loadMRSVersionTxt();

		var releaseGeocoderShown = false;

		// to store the returned locations
		var group;

		// Enable the map event system
		var mapevents = new H.mapevents.MapEvents(map);

		// Enable map interaction (pan, zoom, pinch-to-zoom)
		var behavior = new H.mapevents.Behavior(mapevents);

		// Enable the default UI
		var ui = H.ui.UI.createDefault(map, maptypes);

		// if the window is resized, we need to resize the viewport
		window.addEventListener('resize', function() { map.getViewPort().resize(); });
		
		// handle checks
		var mapViewCheck = document.getElementById("useMapview-checkbox");
		var countryCheck = document.getElementById("useCountry-checkbox");
		
		
		mapViewCheck.onchange = function() {
			if(this.checked) {
				countryCheck.checked = false;
			}
		};
		
		countryCheck.onchange = function() {
			if(this.checked) {
				mapViewCheck.checked = false;
			}
		};

		// register widget for the autocomplete box http://api.jqueryui.com/jQuery.widget/#jQuery-Widget2
		$.widget("custom.autocompleteHighlight", $.ui.autocomplete, {
			_renderItem : function (ul, item) {
				return $('<li>' + item.label + '</li>').appendTo(ul);
			}
		});
		
		// https://api.jquery.com/jquery.deferred/
		function getReady() 
		{
			var deferredReady = $.Deferred();
			$(document).ready(function()
			{
				deferredReady.resolve();
			});
			return deferredReady.promise();
		}

		// url to be used for Autocomplete API calls
		var autoCompelteUrl='http://autocomplete.geocoder.api.here.com/6.2/suggest.json';
		if(secure){
			autoCompelteUrl='https://autocomplete.geocoder.api.here.com/6.2/suggest.json';
		}

		// define the autocomplete component
		$("#search").autocompleteHighlight({
			source : function (request, response) {
				countries = getSelectedCountries();
				var viewBounds = map.screenToLookAtData().bounds.getBoundingBox();
				
				// setting request params for Geocoder Autocomplete API
				// https://developer.here.com/documentation/geocoder-autocomplete/topics/resource-suggest.html
				geocoderRequest = $.ajax({
					url : autoCompelteUrl,
					dataType : "json",
					data : {
						maxresults : 5,
						country : countryCheck.checked ? countries : "",
						language : document.getElementById("language").value,
						query : request.term,
						beginHighlight : '<mark>',
						endHighlight : '</mark>',
						app_id : app_id,
						app_code : app_code,
						mapview : mapViewCheck.checked ? viewBounds.getTopLeft().lat + "," + 
									viewBounds.getTopLeft().lng + ";" + viewBounds.getBottomRight().lat +
										"," + viewBounds.getBottomRight().lng : ""
					}
				});
				
				$.when( getReady(), geocoderRequest).done( function( readyResponse, geocoderResponse, placesResponse ) 
				{
					var g = $.map(geocoderResponse[0].suggestions, function (item) {
								var label = item.label.split(',').reverse().join();;
								// replace style class used for highlight
								value = label.replace(/(<mark>|<\/mark>)/gm, ''); 
								name = label;
								return {
									label : name,
									value : value 
								}
							});
					
					response(g);
				});
				
				
			}, 
			minLength : 2,
			select : function (event, ui) {
				event.preventDefault();
				if (ui.item) {
					var selectedString = ui.item.value;
					geocode(selectedString, 10);
					$("#search").val(selectedString);
				}
				return true;
			},
			
		});

		// If enter pressed without any selection, 
		// geocode the provided text
		$("#search").keypress(function (e) {
			if (e.which == 13) {
				$(".ui-menu-item").hide();
				geocode($("#search").val(), 10);
			}
		});
		
		// get the countries selected
		function getSelectedCountries() {
			
			var items = [];
			$('#chk_c option:selected').each(function(){ items.push($(this).val()); });
			return items.join(',');
		}

		// Gecode the provided text
		function geocode(addr, maxResults) {
			geocodingParameters = {
				searchText : addr,
				maxresults : maxResults
			};

			geocoder.geocode(
				geocodingParameters,
				onSuccess,
				onError
			);
		}
		
		// callback when geocoder request is completed
		function onSuccess(result) {
			var position,
			i = 0,
			mapview,
			topLeft,
			bottomRight;

			if (group) {
				map.removeObject(group);
			}

			group = new H.map.Group();

			var locations = result.Response.View[0].Result;

			//add Geocoder Release information if not already done
			if (releaseGeocoderShown == false) {
					loadGeocoderVersionTxt();
					releaseGeocoderShown = true;
			}

			// Add a marker for each location found
			for (;i < locations.length; i += 1) {
				position = {
					lat : locations[i].Location.DisplayPosition.Latitude,
					lng : locations[i].Location.DisplayPosition.Longitude
				};
				topLeft = locations[0].Location.MapView.TopLeft;
				bottomRight = locations[0].Location.MapView.BottomRight;
				mapview = new H.geo.Rect(topLeft.Latitude, topLeft.Longitude, bottomRight.Latitude, bottomRight.Longitude);
				marker = new H.map.Marker(position);
				marker.label = i;
				group.addObject(marker);
			}
			// Add the locations group to the map
			map.addObject(group);
			if(group.getChildCount() > 1)
				map.getViewModel().setLookAtData({bounds: group.getBoundingBox()}, true);
			else
				map.getViewModel().setLookAtData({bounds: mapview}, true);
		}

		function onError(error) {
			alert('Ooops!');
		}
	}

	//initialize
	init();