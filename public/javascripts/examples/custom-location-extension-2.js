/** 
 *	Utility to access CLE search interface
 *  Copyright(C) HERE 2016
 */
(function () {
    'use strict';
    console.log("custom-location.extension");
    if (H.service.Platform.prototype.ext === undefined) {
        console.log("custom-location.extension: platform.ext");
        H.service.Platform.prototype.ext = {};
    }

    // TODO: overlaps with cle1-naming
    H.service.Platform.prototype.ext.getCustomLocationService = function ( environment, mapLayersEndpoint ) {
        return new CleGateway( environment, mapLayersEndpoint );
    };

    H.service.Platform.prototype.ext.getCustomLocationServiceApiKey = function ( environment, mapLayersEndpoint, apiKey ) {
        return new CleGateway( environment, mapLayersEndpoint, apiKey );
    };

    function CleGateway( environment, mapLayersEndpoint, apiKey) {
		this.endpoint= environment;
		if( ! this.endpoint.endsWith('/') )
			this.endpoint= this.endpoint + '/';
		if( ! this.endpoint.endsWith('2/') )
			this.endpoint= this.endpoint + '2/';

        if(!apiKey){
            this.cleAppId = app_id;
            this.cleAppCode = app_code;
        }
        else{
            this.cleApiKey = api_key;
        }

		this.mapLayersEndpoint = mapLayersEndpoint;
		if( ! this.mapLayersEndpoint.endsWith('/') )
            this.mapLayersEndpoint= this.mapLayersEndpoint + '/';
		if( ! this.mapLayersEndpoint.endsWith('2/'))
            this.mapLayersEndpoint= this.mapLayersEndpoint + '2/';
        
            console.log( 'CLE environment set to: ' + this.endpoint );
    }
    
	CleGateway.prototype.setEnvironment = function( environment,  service) {
		this.endpoint= environment;
		if( ! this.endpoint.endsWith('/') )
            this.endpoint= this.endpoint + '/';
		if( ! this.endpoint.endsWith('2') ){
            this.endpoint= this.endpoint + '2';
		}
		this.service=service;
		
		console.log(service + ' environment set to: ' + this.endpoint );
    }
    
    CleGateway.prototype.setMapLayersEndpoint = function( environment,  service) {
		this.mapLayersEndpoint = environment;
		if( ! this.mapLayersEndpoint.endsWith('/') )
            this.mapLayersEndpoint= this.mapLayersEndpoint + '/';
		if( ! this.mapLayersEndpoint.endsWith('2/')){
                this.mapLayersEndpoint= this.mapLayersEndpoint + '2';
        }
		this.service=service;
		
		console.log(service + ' environment\'s map layers endpoint set to: ' + this.mapLayersEndpoint );
    }
    
    CleGateway.prototype.setCredentials = function( appId, appCode, apiKey ) {
		var isUpdated= false;
		if( ! (this.cleAppId === appId ) ) {
			this.cleAppId = appId;
			isUpdated= true;
		}
		
		if( ! (this.cleAppCode === appCode ) ) {
			this.cleAppCode = appCode;
			isUpdated= true;
        }
        
        if( ! (this.cleApiKey === apiKey ) ) {
            this.cleApiKey = apiKey;
            isUpdated= true;
        }

		return isUpdated;
    }
    
    /**
     * Check asset position against custom uploaded layers using CLE.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchProximity = function ( layerId, searchClause, options, callback ) {
        var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        
        var url = this.endpoint + '/search/proximity.json?' + 'layer_ids=' + layerId + '&' + searchClause;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

		if(this.service==='PDE') url += '&key_attributes=' + options['attribute']
        if(this.service==='CLE') url += '&geom='+options['geom']
        if(options.map_name) url += '&map_name=' + options.map_name;
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
     * Check asset position against custom uploaded layers using CLE.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchCorridor = function ( layerId, searchClause, options, callback ) {
        var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        var url = this.endpoint + '/search/corridor.json?' + 'layer_ids=' + layerId + '&' + searchClause;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

		if(this.service==='PDE') url += '&key_attributes=' + options['attribute']
        if(this.service==='CLE') url += '&geom='+options['geom']
        if(options.map_name) url += '&map_name=' + options.map_name;
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
     * Check asset position against custom uploaded layers using CLE.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchBbox = function ( layerId, searchClause, options, callback ) {
        var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        var url = this.endpoint + '/search/bbox.json?' + 'layer_id=' + layerId + '&' + searchClause;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

		if(this.service==='PDE') url += '&key_attribute=' + options['attribute']
        if(this.service==='CLE') url += '&geom='+options['geom']
        if(options.map_name) url += '&map_name=' + options.map_name;
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
     * Check asset position against custom uploaded layers using CLE.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchQuadkey = function ( layerId, searchClause, options, callback ) {
        var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        var url = this.endpoint + '/search/quadkey.json?' + 'layer_id=' + layerId + '&' + searchClause;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

		if(this.service==='PDE') url += '&key_attribute=' + options['attribute']
        if(this.service==='CLE') url += '&geom='+options['geom']
        if(options.map_name) url += '&map_name=' + options.map_name;
        var that = this;
		
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);
        }, this);
    };
	
    /**
     * Check asset position against custom uploaded layers using CLE.
     * @param layerId integer to identify previously loaded layer.
     * @param assetPosition H.geo.Point of the asset position to check.
     * @param options further options.
     * @param callback function to be called on completion/error.
     */
    CleGateway.prototype.searchAll = function ( layerId, options, callback ) {
        if(this.service==='PDE'){
			alert('PDE does not support All Search');
			return;
		}
		var optionsParams = [];
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                optionsParams.push(key.toString() + '=' + options[key].toString());
            }
        }
        var url = this.endpoint + '/search/all.json?' + 'layer_id=' + layerId + '&geom='+options['geom'];

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

		if(options.hasOwnProperty("searchtext")) url = url + "&" + options['searchtext'];
        if(options.map_name) url += '&map_name=' + options.map_name;

        var that = this;

        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
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
            "layer_id=" + layerId + "&file=" + encodeURIComponent(content);

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
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
    CleGateway.prototype.deleteLayer = function (layerId, callback) {
        var url = this.endpoint + "/layers/delete.json?" +
            "layer_ids=" + layerId;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);

        }, this);
    };
	
	/**
     *
     * @param layerId integer, layer to modify.
	 * @param action the modify action which should be used (update/append/delete)
	 * @param changes the changes that should be applied
     * @param callback function to be called on completion.
     */
    CleGateway.prototype.modifyLayer = function (layerId, action, changes, callback) {
        var url = this.endpoint + "/layers/modify.json?" +
            "layer_id=" + layerId + "&action=" + action +
            "&changes=" + encodeURIComponent(changes);
            

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);

        }, this);
    };

    /**
     * @param xyzSpaceId: SpaceId containing yard content XYZ Space
     * @param xyzToken: token to access XYZ Space
     * @param mapName: map name for the overlay layers
     * @param callback function to be called on completion.
     */
    CleGateway.prototype.importFromXYZ = function (xyzSpaceId, xyzToken, mapName, callback) {
        var url = this.endpoint + "overlays/import.json?" +
            "map_name=" + mapName + "&xyzToken=" + xyzToken + "&xyzSpaceId=" + xyzSpaceId;

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;
        loadJSONP(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);

        }, this);
    };
	
	/**
     *
	 * @param params additional parameters complete like 'waypoint0=x&waypoint1=y&mode=fastest;car;traffic:disabled&linkAttributes=sh'
     * @param callback function to be called on completion.
     */
    CleGateway.prototype.calculateRoute = function (params, callback) {
        var url = this.endpoint + "/calculateroute.json?" + params;
           
        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;
        loadJSONCallback(url, function (resp) {
            if (resp.error_id != null) {
                callback.call(that, url, resp, new Error(resp.issues[0].message));
                return;
            }
            callback.call(that, url, resp, null);

        }, this);
    };
	
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

        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;
        
        for (var k=0;k<optionsParams.length;k++){
            url += '&' + optionsParams[k];
        }

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
     * @param callback function to be called on completion.
     */
    CleGateway.prototype.getPDELayers = function (callback) {
        var endPoint= this.mapLayersEndpoint.replace("2","1");
        var url = endPoint + '/doc/layers.json?';
        
        if(!this.cleApiKey)
            url = url + '&app_code=' + this.cleAppCode + '&app_id=' + this.cleAppId;
        else
            url = url + '&apiKey=' + this.cleApiKey ;

        var that = this;

        loadJSONP(url, function (resp) {
            if (resp.faultCode) {
                callback.call(that, resp, new Error(resp.message));
                return;
            }
            var geoFencableLayers = [];
            resp.forEach(function (layer) {
                if (layer.type === "geom") {
                    layer.attributes.splice(layer.attributes.indexOf('LAT'), 1);
                    layer.attributes.splice(layer.attributes.indexOf('LON'), 1);
                    geoFencableLayers.push({"name": layer.name, "attributes": layer.attributes});
                }
            });
            callback.call(that, geoFencableLayers, null);
        }, this);
    };

})();



    




    
/**
	uses jsoncallback as parameter name
*/
var loadJSONCallback = (function () {
    'use strict';
    var unique = 0;
    return function (url, callback, context) {
        // INIT
        var jsonpCallbackParamName = 'jsoncallback';
        var name = "_jsonpcallback_" + unique++;
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

/**
	uses callback as parameter name
*/
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

