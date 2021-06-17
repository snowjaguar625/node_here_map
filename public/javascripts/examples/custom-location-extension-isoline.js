/** 
 *	Utility to access CLE search interface
 *  Copyright(C) HERE 2019
 */
(function () {
    'use strict';
    console.log("custom-location.extension");
    if (H.service.Platform.prototype.ext === undefined) {
        console.log("custom-location.extension: platform.ext");
        H.service.Platform.prototype.ext = {};
    }

    // TODO: overlaps with cle1-naming
    H.service.Platform.prototype.ext.getCustomLocationService = function ( endPoint, app_id, app_code ) {
        return new CleGateway( endPoint, app_id, app_code );
    };	
	H.service.Platform.prototype.ext.getCustomLocationServiceApiKey = function ( endPoint, api_key ) {
        return new CleGateway( endPoint, api_key );
    };

    function CleGateway( endPoint, app_id_key, app_code ) {
		this.endpoint= endPoint;
		if( ! this.endpoint.endsWith('/') )
			this.endpoint= this.endpoint + '/';
		if( ! this.endpoint.endsWith('2/') )
			this.endpoint= this.endpoint + '2/';

		if(app_code){
			this.cleAppId = app_id_key;
			this.cleAppCode = app_code;
		}else{
			this.cleApiKey = app_id_key;
		}
		console.log( 'CLE environment set to: ' + this.endpoint );
    }
    
	CleGateway.prototype.setEnvironment = function( endPoint) {
		this.endpoint= endPoint;
		if( ! this.endpoint.endsWith('/') )
			this.endpoint= this.endpoint + '/';
		if( ! this.endpoint.endsWith('2')){
			this.endpoint= this.endpoint + '2';
		}
	}
	
    /*CleGateway.prototype.setCredentials = function( appId, appCode ) {
		var isUpdated= false;
		if( ! (this.cleAppId === appId ) ) {
			this.cleAppId = appId;
			isUpdated= true;
		}
		
		if( ! (this.cleAppCode === appCode ) ) {
			this.cleAppCode = appCode;
			isUpdated= true;
		}
		
		return isUpdated;
    }*/
    
    /**
     * Check POIs along the isoline route.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchRouteIsoline = function ( layerId, options, callback ) {
        var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        var url = this.endpoint + '/search/routeisoline.json?' + 'layer_ids=' + layerId ;
		
		if(this.cleAppId)
            url = url + "&app_id=" + this.cleAppId + "&app_code=" + this.cleAppCode;
		else
			url = url + "&apiKey=" + this.cleApiKey ;
        
        for (var k=0;k<optionsParams.length;k++){
            url += '&' + optionsParams[k];
        }
        console.log("Calling routeisoline with the url: "+url);
        var that = this;

        loadJSONP(url, function( resp ) {
            if (resp.error_id != null) {
                callback.call( that, url, resp, new Error( resp.issues[0].message ) );
                return;
            }
            callback.call(that, url, resp, null);
        }, this);
    };		
	
    
    /**
     *
     * @param layerId integer, layer to create or replace.
     * @param content base64 encoded (plain or zipped) WKT or Shapefile
     * @param callback function to be called on completion.
     */
    CleGateway.prototype.uploadLayer = function (layerId, content, isContentEncoded, callback) {
        var url = this.endpoint + "/layers/upload.json?" +
            "layer_id=" + layerId + "&file=" + encodeURIComponent(content) ;
			
		if(this.cleAppId)
            url = url + "&app_id=" + this.cleAppId + "&app_code=" + this.cleAppCode;
		else
			url = url + "&apiKey=" + this.cleApiKey ;
        var that = this;
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);

        }, this);
    };	
})();


var loadJSONP = (function () {
    'use strict';
    var unique = 0;
    return function (url, callback, context) {
        // INIT
        var jsonpCallbackParamName = 'callback';
        var name = "_jsonp_" + unique++;
        if (url.match(/\?/)) {
            url += '&' + jsonpCallbackParamName + '=' + name;
        } else {
            url += '?' + jsonpCallbackParamName + '=' + name;
        }

        // Create script
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // Setup handler
        window[name] = function (data) {
            callback.call((context || window), data);
            document.getElementsByTagName('head')[0].removeChild(script);
            script = null;
            delete window[name];
        };

        // Load JSON
        document.getElementsByTagName('head')[0].appendChild(script);
    };
})();