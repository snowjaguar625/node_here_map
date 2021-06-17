	/*
	(C) HERE 2019
	*/
	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

		// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform,map,defaultLayers,useApiKey=false;
	
	// check which JS API version is being used, H.mapevents.Behavior.Feature is only available in 
	// JS 3.1 
	if(H.mapevents.Behavior.Feature){
		platform = new H.service.Platform({
			apikey: api_key,
			useHTTPS: secure
		});
		defaultLayers = platform.createDefaultLayers();
		map = new H.Map(document.getElementById('mapContainer'),  defaultLayers.vector.normal.map, {
			center: center,
			zoom: zoom,
			pixelRatio: hidpi ? 2 : 1
		 });
		 // to use api key in geocoder requests
		 useApiKey = true;
	}else{
		platform = new H.service.Platform({
			app_id: app_id,
			app_code: app_code,
			useHTTPS: secure
		}),
		defaultLayers = platform.createDefaultLayers();
		// Instantiate a map in the 'map' div, set the base map to normal
		map = new H.Map(document.getElementById('mapContainer'), defaultLayers.normal.map, {
			center: center,
			zoom: zoom,
			pixelRatio: hidpi ? 2 : 1
		});	
	}
	var mapObjectGroup = new H.map.Group();
	map.addObject(mapObjectGroup);

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });


	/** Setup the html**/
	$( "#fid_queryType" ).change(function() {
	    $( "#fid_queryType option:selected" ).each(function() {
	    	if( $(this).val() === 'qualifiedAddressInput')
	    		$("#qualifiedAddressInput").show();
	    	else
	    		$("#qualifiedAddressInput").hide();
	    });
	}).trigger( "change" );


	$(document).click(function(event) { 
	    if(!$(event.target).closest('#suggestionDiv').length) {
	        if($('#suggestionDiv').html() != '') {
	            $('#suggestionDiv').html('');
	        }
	    }        
	})


	var setAddressFromChoice = function(tag){
		$("#searchTextInput").val(tag.text());
		$("#suggestionDiv").html('');
	}

	var autocompleteSuggestion = function(text){
		var autocompleteUrl = "https://autocomplete.geocoder.api.here.com/6.2/suggest.json";
		var data =  {
				app_id:app_id,
				app_code:app_code,
				query:text,
		};
		
		if(useApiKey){
			autocompleteUrl = "https://autocomplete.geocoder.ls.hereapi.com/6.2/suggest.json";
			data = {
				apikey : api_key,
				query:text,
			};
		}
		$.ajax({
			type: "get",
			url: autocompleteUrl,
			data:data,
			success: function(res){
				var sugResponse = eval(res);
                if (sugResponse.suggestions && sugResponse.suggestions.length > 0)
                  {
                  	var suggList = '<ul style="list-style:none;padding-left:5px;" id="ui-id-2" tabindex="0" >';
                  	for( var i = 0; i < sugResponse.suggestions.length ; i++){
                  		console.log(sugResponse.suggestions[i].label);
                  		suggList += '<li class="ui-menu-item" id="ui-id-16" tabindex="-1"><a onclick="setAddressFromChoice($(this))">'+ sugResponse.suggestions[i].label.split(',').reverse().join().replace(',',', ')+ '</a></li>';
                  	}
                  		suggList += '</ul>';
                  		$("#suggestionDiv").html(suggList);
                  }
                else
                  {
                     $("#suggestionDiv").html('');
                   }
               }
			});
  	};

  	

	var url = 'https://geocoder.api.here.com/6.2/geocode.json?app_id=' + app_id + '&app_code=' + app_code;

	var submit = function(){
		url = 'https://geocoder.api.here.com/6.2/geocode.json?app_id=' + app_id + '&app_code=' + app_code;
		if(useApiKey){
			url = 'https://geocoder.ls.hereapi.com/6.2/geocode.json?apikey=' + api_key ;
		}

		//var searchText = $("#searchTextInput").val();
		url += $("#searchTextInput").val().trim() === '' ? '' : '&searchtext='+ $("#searchTextInput").val().trim();
		// var country = $("#countryInput").val();
		url += $("#countryInput").val().trim() === '' ? '' : '&country=' + $("#countryInput").val().trim();
		// var language = $("#fid_language option:selected").val();
		url += $("#fid_language option:selected").val().trim() === ''? '' : '&language='+ $("#fid_language option:selected").val().trim();
		var politicalview = $("#fid_politicalview option:selected").val();
		url += $("#fid_politicalview option:selected").val().trim() === ''? '' : '&politicalview='+ $("#fid_politicalview option:selected").val().trim();

		if( $( "#fid_queryType option:selected" ).val() === 'qualifiedAddressInput'){
			//Qualified Address
			// var countryFocus = $("#countryFocusInput").val();
			url+= $("#countryFocusInput").val().trim() === '' ? '' : '&countryfocus=' + $("#countryFocusInput").val().trim();
			// var state = $("#stateInput").val();
			url += $("#stateInput").val().trim() === '' ? '' : '&state=' + $("#stateInput").val().trim();
			// var county = $("#countyInput").val();
			url += $("#countyInput").val().trim() === '' ? '' : '&county=' + $("#countyInput").val().trim();
			// var city = $("#cityInput").val();
			url += $("#cityInput").val().trim() === '' ? '' : '&city=' + $("#cityInput").val().trim();
			// var postalCode = $("#postalCodeInput").val();
			url += $("#postalCodeInput").val().trim() === '' ? '' : '&postalcode=' + $("#postalCodeInput").val().trim();
			// var district = $("#districtInput").val();
			url += $("#districtInput").val().trim() === '' ? '' : '&district=' + $("#districtInput").val().trim();
			// var street = $("#streetInput").val();
			url += $("#streetInput").val().trim() === '' ? '' : '&street=' + $("#streetInput").val().trim();
			// var houseNumber = $("#houseNumberInput").val();
			url += $("#houseNumberInput").val().trim() === '' ? '' : '&housenumber=' + $("#houseNumberInput").val().trim();
		}


		//Additional Data
		var additionalURL= "";
		// var crossingStreets = $("#crossingStreetsCheck").is(':checked');
		if( $("#crossingStreetsCheck").is(':checked') )
			additionalURL += '&CrossingStreets=false;';
		// var preserveUnitDesignators = $("#preserveUnitDesignatorsCheck").is(':checked');
		if( $("#preserveUnitDesignatorsCheck").is(':checked') )
			additionalURL += '&PreserveUnitDesignators=true;';
		// var country2 = $("#country2Check").is(':checked');
		if( $("#country2Check").is(':checked') )
			additionalURL += '&Country2=true;';
		// var flexibleAdminValues = $("#flexibleAdminValuesCheck").is(':checked');
		if( $("#flexibleAdminValuesCheck").is(':checked') )
			additionalURL += 'FlexibleAdminValues,true;';
		// var normalizeNames = $("#normalizeNamesCheck").is(':checked');
		if( $("#normalizeNamesCheck").is(':checked') )
			additionalURL += 'normalizeNames,true;';
		// var includeZipAddOn = $("#includeZipAddOnCheck").is(':checked');
		if( $("#includeZipAddOnCheck").is(':checked') )
			additionalURL += 'IncludeRoutingInformation,true;'
		// var includeChildPOIs = $("#includeChildPOIsCheck").is(':checked');
		if( $("#includeChildPOIsCheck").is(':checked') )
			additionalURL += 'IncludeChildPOIs,true;';
		// var includeRoutingInformation = $("#includeRoutingInformationCheck").is(':checked');
		if( $("#includeRoutingInformationCheck").is(':checked') )
			additionalURL += 'IncludeRoutingInformation,true;';
		// var includeDistanceMarkers = $("#includeDistanceMarkersCheck").is(':checked');
		if( $("#includeDistanceMarkersCheck").is(':checked') )
			additionalURL += 'IncludeDistanceMarkers,true;';
		// var additionalAddressProvider = $("#additionalAddressProviderInput").val();
		additionalURL += $("#additionalAddressProviderInput").val().trim() === '' ? '' : 'AdditionalAddressProvider,' + $("#additionalAddressProviderInput").val().trim()+';';
		// var houseNumberMode = $("#fid_houseNumberMode option:selected").val();
		additionalURL += $("#fid_houseNumberMode option:selected").val().trim() === ''? '' : 'HouseNumberMode,'+ $("#fid_houseNumberMode option:selected").val().trim()+';';
		// var intersectionSnapTolerance = $("#intersectionSnapToleranceInput").val();
		additionalURL += $("#intersectionSnapToleranceInput").val().trim() === '' ? '' : 'IntersectionSnapTolerance,' + $("#intersectionSnapToleranceInput").val().trim()+';';
		// var addressRangeSqueezeOffset = $("#addressRangeSqueezeOffsetInput").val();
		additionalURL += $("#addressRangeSqueezeOffsetInput").val().trim() === '' ? '' : 'AddressRangeSqueezeOffset,' + $("#addressRangeSqueezeOffsetInput").val().trim()+';';
		// var addressRangeSqueezeFactor = $("#addressRangeSqueezeFactorInput").val();
		additionalURL += $("#addressRangeSqueezeFactorInput").val().trim() === '' ? '' : 'AddressRangeSqueezeFactor,' + $("#addressRangeSqueezeFactorInput").val().trim()+';';
		// var includeSHapeLevel = $("#fid_includeShapeLevel option:selected").val();
		additionalURL += $("#fid_includeShapeLevel option:selected").val().trim() === ''? '' : 'IncludeShapeLevel,'+ $("#fid_includeShapeLevel option:selected").val().trim()+';';
		// var restrictedLevel = $("#fid_restrictLevel option:selected").val();
		additionalURL += $("#fid_restrictLevel option:selected").val().trim() === ''? '' : 'RestrictLevel,'+ $("#fid_restrictLevel option:selected").val().trim()+';';
		// var suppressedStreetType = $("#fid_suppressStreetType option:selected").val();
		additionalURL += $("#fid_suppressStreetType option:selected").val().trim() === ''? '' : 'SuppressStreetType,'+ $("#fid_suppressStreetType option:selected").val().trim()+';';

		url = url+ "&additionaldata="+additionalURL.slice(0,-1);

		//Control Attributes
		var responseAttributes = ''; 
		$('#fid_responseattributes :selected').each(function(i, selected){ 
			if( i === 0)
		  		responseAttributes += $(selected).text().trim(); 
		  	else
		  		responseAttributes +=','+ $(selected).text().trim();
		});

		if( responseAttributes.length > 0)
			url += '&responseattributes=' + responseAttributes;

		var locationAttributes = ''; 
		$('#fid_locationattributes :selected').each(function(i, selected){ 
			if( i === 0)
		  		locationAttributes += $(selected).text().trim(); 
		  	else
		  		locationAttributes +=','+ $(selected).text().trim();		
		 });

		if(locationAttributes.length > 0)
			url += '&locationattributes=' + locationAttributes;

		var addressAttributes = ''; 
		$('#fid_addressattributes :selected').each(function(i, selected){ 
			 if( i === 0)
		  		addressAttributes += $(selected).text().trim(); 
			 else
		 		addressAttributes +=','+ $(selected).text().trim();		
		 });

		if( addressAttributes.length > 0)
			url += '&addressattributes='+addressAttributes;

		//Control Behavior
		// var maxResults = $("#maxResultsInput").val();
		url+= $("#maxResultsInput").val().trim() === '' ? '' : '&maxresults=' + $("#maxResultsInput").val().trim();
		// var pageInformation = $("#pageInfoInput").val();
		url += $("#pageInfoInput").val().trim() === '' ? '' : '&pageinformation=' + $("#pageInfoInput").val().trim();
		// var gen = $("#genInput");
		url += $("#genInput").val().trim() === '' ? '' : '&gen=' + $("#genInput").val();


		$("#apiCallUrl").val(encodeURI(url));
		makeGetCall();
	};

	var fullResponse = null;
	var specificResponses = [];

	var displaySpecific = function(self){
		var index = self.data().index;
		var response = specificResponses[index];
		printJson(response);
		var coords = {lat: response.Location.DisplayPosition.Latitude,lng:response.Location.DisplayPosition.Longitude};
		map.setCenter(coords);
		return false;
	};

	var showSpecificModal = function(self){
		var index = self.parent().parent().parent().data().index;
		var response = specificResponses[index];
		printJson(response);
		$("#jsonModalTitle").html('JSON for Element ' + index);
		$("#jsonResultModal").modal("show");
		return false;
	};

	var displayFullResponse = function(){
		if(fullResponse != null ){
			printJson(fullResponse);
			$("#jsonModalTitle").html('Full JSON response');
			$("#jsonResultModal").modal("show");
		}
		return false;
	};


	var makeGetCall = function(){
		ajaxCallBegin(url);
	}

	var ajaxCallBegin = function(theUrl){
		if( mapObjectGroup != null)
			mapObjectGroup.removeAll();
		fullResponse = null;
		specificResponses = [];
		$('#results').html("");
		$('#json').html("");

		$.ajax({
		    type: 'GET',
		    url: theUrl,
		    success: function(data) {
		    	printJson(data);
		    	fullResponse = data;
		    	specificResponses = [];

		    	if(data.Response.View.length > 0){
			    	var array = data.Response.View[0].Result;
			    	var resultsHtml = '';

			    	for (var i =0; i < array.length; i++ ){
			    		var address = array[i].Location.Address;
			    		specificResponses.push(array[i]);

			    		var displayI = i+1;
			    		resultsHtml += '<a onclick=\"return displaySpecific($(this))\" data-index=\"'+i+'\" href=\"#\"><div class=\"form-group\">\n<div class=\"col-xs-2 border-right-grey\"><span class=\"badge\">'+ displayI +'</span></div><div class=\"col-xs-10 border-bottom-accent\"><p><strong>'+address.Label+'</strong><span class=\"glyphicon glyphicon-menu-right pull-right\"></span><br/>';
						$.each(address, function(key, value) {
						    if ( key != 'Label' && key != 'AdditionalData') {
						    	resultsHtml += key + ': ' + value + '<br/>';
						    }
						});

						resultsHtml +='</p><button class=\"btn btn-default float-right\" onclick=\"showSpecificModal($(this))\" style=\"    margin-bottom: 5px;\">Show Element</button><br/></div></div></a>';
						addMarker(array[i],i);
			    	}
			    	$('#results').html(resultsHtml);
			    	if(useApiKey){
						map.getViewModel().setLookAtData({
							bounds: mapObjectGroup.getBoundingBox()
						});
					}else{
						map.setViewBounds(mapObjectGroup.getBounds());
					}
					
		    	}
 		 }});
	}

	var addMarker = function(response, index){
		// Define a variable holding SVG mark-up that defines an icon image:
		var i = index + 1;
		 var svg = '<svg width="70" height="100" xmlns="http://www.w3.org/2000/svg">'+
		'<path d="M10 60 A 25 25, 0, 1, 1, 57, 60 L 35 95 Z" fill="#00afaa" stroke="white" stroke-width="3"/>'+
         '<text x="34" y="60" font-size="25pt" ' +
		 'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
		 'fill="white">'+ i +'</text></svg>';

		 var navigationSVG = '<svg width="70" height="100" xmlns="http://www.w3.org/2000/svg">'+
		'<path d="M10 60 A 25 25, 0, 1, 1, 57, 60 L 35 95 Z" fill="#b65a27" stroke="white" stroke-width="3"/>'+
         '<text x="34" y="60" font-size="25pt" ' +
		 'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
		 'fill="white">'+ i +'</text></svg>';

		 //navigation marker
		 if(response.Location.NavigationPosition != undefined && response.Location.NavigationPosition[0] != undefined){
			// Create an icon, an object holding the latitude and longitude, and a marker:
			var iconNav = new H.map.Icon(navigationSVG),
			 coordsNav = {lat: response.Location.NavigationPosition[0].Latitude,lng:response.Location.NavigationPosition[0].Longitude},
			 markerNav = new H.map.Marker(coordsNav, {icon: iconNav});
			// Add the marker to the map and center the map at the location of the marker:
			mapObjectGroup.addObject(markerNav);
		}

		// Create an icon, an object holding the latitude and longitude, and a marker:
		var icon = new H.map.Icon(svg),
		 coords = {lat: response.Location.DisplayPosition.Latitude,lng:response.Location.DisplayPosition.Longitude},
		 marker = new H.map.Marker(coords, {icon: icon});
		// Add the marker to the map and center the map at the location of the marker:
		mapObjectGroup.addObject(marker);
	}

	var printJson = function(json){	 
	    $('#json').html(syntaxHighlight(json,undefined,2));
	}

	var syntaxHighlight = function(json) {
		if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }	
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}