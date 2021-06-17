/* 
 * author domschuette
 * (C) HERE 2014
 */


// helper for hashmap size
Object.size = function(obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

/**
	This constructor creates the PDE manager. It needs the app_id and app_code/ api_key plus the layerObjects.
	A layerObject needs a callback for a layer and optional if it's a FC layer or not.
	See setLayers.
*/

PDEManager = function(app_id, app_code, layersObjects, api_key) {

    if(!api_key){
        this.baseURL = "https://pde.api.here.com/1/tile.json";
        this.tilesBaseURL = "https://pde.api.here.com/1/tiles.json";
        this.fileURL = "https://pde.api.here.com/1/file.bin";
        this.indexURL = "https://pde.api.here.com/1/index.json";
        this.layersURL = "https://pde.api.here.com/1/doc/layers.json";
        this.staticContentURL = "https://pde.api.here.com/1/static.json";
        this.app_id = app_id;
        this.app_code = app_code;
    }
    else{
        this.baseURL = "https://fleet.ls.hereapi.com/1/tile.json";
        this.tilesBaseURL = "https://fleet.ls.hereapi.com/1/tiles.json";
        this.fileURL = "https://fleet.ls.hereapi.com/1/file.bin";
        this.indexURL = "https://fleet.ls.hereapi.com/1/index.json";
        this.layersURL = "https://fleet.ls.hereapi.com/1/doc/layers.json";
        this.staticContentURL = "https://fleet.ls.hereapi.com/1/static.json";
        this.api_key = api_key;
    }
    this.region = null;
    // sequential order or link objects beloning to a route. this links have functional class, linkId (with sign indication in which direction the link is driven (+/-))
    this.links = null;
    this.bbox = null;
    this.bboxContainer = undefined;
    this.numTilesOpen = 0;
    this.numTilesRequested = 0;
    this.feedbackTxt = undefined;
    // link hashmap
    this.routeLinks = new Object(); //key=(-)linkId value=object
    this.layersObjects = layersObjects;
    // events
    this.onTileLoadingFinished = undefined;
    // cache information for tiles got requested and are cached on client side
    this.tileCacheHashMap = new Object(); // key = layer value = hashMap with key = tx|ty (f.e. key=SPEED_LIMIT_FC1 value = (key = 519|394 value = true))
    this.cacheRequestedTileInformation = false;
    this.meta = false;
};

/**
	This method sets the layerObjects.
	Required:
		callback - function called when layer is loaded
	Optional:
		isFCLayer
		fcLayers - array of required FC's. isFCLayer must be true (default)
	
	For example:
	layers = new Object();
	layers["JUNCTION_VIEW"] = {callback: gotJunctionViews, isFCLayer: false, level: 9};
	layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits};
	layers["SPEED_LIMITS_FC"] = {callback: gotSpeedLimits, fcLayers: [1,3,5]};
*/
PDEManager.prototype.setLayers = function(layersObjects) {
        this.layersObjects = layersObjects;
    }
    /**
    	Function called when requested PDE tiles for all FCs are loaded (pdeManager is finished)
    */
PDEManager.prototype.setOnTileLoadingFinished = function(func) {
        this.onTileLoadingFinished = func;
    }
    /**
    	Set the PDE base URL - default is "http://pde.api.here.com/1/tile.json" (already set)
    */
PDEManager.prototype.setBaseURL = function(baseURL) {
    this.baseURL = baseURL;
}
    /**
    	Setter for region
    */
   PDEManager.prototype.setRegion = function(region) {
    this.region = region;
}

/**
	Get the PDE base URL
*/
PDEManager.prototype.getBaseURL = function() {
    return this.baseURL;
}

/**
	Set the FeedBackText element
*/
PDEManager.prototype.setFeedbackTxt = function(feedbackTxt) {
    this.feedbackTxt = feedbackTxt;
}


/**
	Set Meta flag, used to retrieve additional information like Release etc. 
*/
PDEManager.prototype.setMeta = function(meta) {
    this.meta = meta;
}

/**
	Set the PDE file URL - default is "http://pde.api.here.com/1/file.bin" (already set)
*/
PDEManager.prototype.setFileURL = function(fileURL) {
    this.fileURL = fileURL;
}

/**
	Get the PDE file URL
*/
PDEManager.prototype.getFileURL = function() {
    return this.fileURL;
}

/**
	Set the PDE index URL - default is "http://pde.api.here.com/1/index.json" (already set)
*/
PDEManager.prototype.setIndexURL = function(indexURL) {
    this.indexURL = indexURL;
}

/**
	Get the PDE index URL
*/
PDEManager.prototype.getIndexURL = function() {
    return this.indexURL;
}

/**
	Set the PDE static content URL - default is "http://pde.api.here.com/1/static.json" (already set)
*/
PDEManager.prototype.setStaticContentURL = function(staticContentURL) {
    this.staticContentURL = staticContentURL;
}

/**
	Get the PDE static content URL
*/
PDEManager.prototype.getStaticContentURL = function() {
    return this.staticContentURL;
}

/**
	This method sets (true/false) if all requested tiles information should be cached
	- means if the same tile from the same layer gets requested again it will not call PDE
	again but return the finished callback imedially. Use this if the PDE result is cached
	on client side.
*/
PDEManager.prototype.setCacheTileInformation = function(cache) {
        this.cacheRequestedTileInformation = cache;
    }
    /**
    	This method clears the cached which stores which tiles got already requested
    */
PDEManager.prototype.clearCachedTileInformation = function() {
    this.tileCacheHashMap = new Object();
}

/**
	With this method you can set the (route) link objects from the router response or route match extension.
	The link objects should have a linkId, functionalClass and shape. Please use:
	router response: 				pdeManager.setLinks(respJsonRouteObj.response.route[0].leg[0].link);
	route match extension response: pdeManager.setLinks(respJsonRouteObj.RouteLinks);
*/
PDEManager.prototype.setLinks = function(links) {
    this.links = links;

    // the router response and route match extension have different link object shapes. Here we try to align them.
    // router: 
    //  shape: Array[2]
    //	0: "41.8842506,-87.6324539"
    //	1: "41.8844719,-87.6324615"

    // route match extension:
    //  shape: "46.2349014 7.3720999 46.2357712 7.3727298"

    // here we check for links from route match extension
    var length = this.links.length;
    for (var m = 0; m < length; m++) {
        var link = this.links[m];
        if (link.shape.constructor === Array) {
            // shape from routing link
            // assign new shape
            link.$shapeForTileGeneration = link.shape;
        } else {
            // no array means we have lat lon space seperated
            // we create a shape array
            var newShape = [];
            var shapeSplit = link.shape.split(' ');
            var tmpLatLon;
            for (var iCount = 0; iCount < shapeSplit.length; iCount++) {
                if (iCount % 2 == 0) {
                    tmpLatLon = shapeSplit[iCount];
                } else {
                    tmpLatLon += "," + shapeSplit[iCount];
                    newShape.push(tmpLatLon);
                    tmpLatLon = null;
                }
            }

            // assign new shape
            link.$shapeForTileGeneration = newShape;
        }
    }
}

/**
	Returns the route link objects
*/
PDEManager.prototype.getLinks = function() {
    return this.links;
}

/**
	If the PDE manager should work not on links but on a specific bounding box - set this one here
*/
PDEManager.prototype.setBoundingBox = function(bbox) {
    this.bbox = bbox;
}

/**
	The PDE manager can draw the bounding box of each requested tile into a container - mainly used for drawing
	/debug purpose. This container can be set here. F.E.

	var map = new H.Map(mapContainer, maptypes.normal.map, ...);
	var group = new H.map.Group();
	pdeManager.setBoundingBoxContainer(group);
	// after the pdeManager.start() and all tiles returned
	map.addObject(group);
	map.setViewBounds(group.getBounds());
*/
PDEManager.prototype.setBoundingBoxContainer = function(bboxContainer) {
    this.bboxContainer = bboxContainer;
}

/**
	Returns the (tile) bounding box container
	@see setBoundingBoxContainer
*/
PDEManager.prototype.getBoundingBoxContainer = function() {
    return this.bboxContainer;
}

/**
	This method gives back the route link as hashmap. key=(-)linkId value=object
*/
PDEManager.prototype.getRouteLinks = function() {
    return this.routeLinks;
}

/**
	This method checks if all links from given array are part of the internal stored route
*/
PDEManager.prototype.getLinksPartOfRoute = function(linkIds) {
    var bRet = true;
    var linkSplit = linkIds.split(",");
    for (var i = 0; i < linkSplit.length; i++) {
        var linkWithoutPlusSign = linkSplit[i].lastIndexOf("+", 0) === 0 ? linkSplit[i].substring(1) : linkSplit[i];
        var linkWithMinusSign = linkSplit[i].lastIndexOf("-", 0) === 0 ? linkSplit[i] : '-' + linkSplit[i];
        if (!(this.routeLinks[linkWithoutPlusSign] || this.routeLinks[linkWithMinusSign])) {
            bRet = false;
            break;
        }
    }

    return bRet;
}

/**
	This method checks if the given link id is part of the internal stored route
*/
PDEManager.prototype.getLinkPartOfRoute = function(linkId) {
    var bRet = false;
    var linkWithoutPlusSign = linkId.lastIndexOf("+", 0) === 0 ? linkId.substring(1) : linkId;
    var linkWithMinusSign = linkId.lastIndexOf("-", 0) === 0 ? linkId : '-' + linkId;
    // check if link is part of the route (never the less the link is driven from or to reference node)
    if (this.routeLinks[linkWithoutPlusSign] || this.routeLinks[linkWithMinusSign]) {
        bRet = true;
    }

    return bRet;
}

/**
	This method checks if first link from given array is part of the internal stored route
*/
PDEManager.prototype.getFirstLinkPartOfRoute = function(linkIds) {
    var bRet = false;
    var linkSplit = linkIds.split(",");
    var linkWithoutPlusSign = linkSplit[0].lastIndexOf("+", 0) === 0 ? linkSplit[0].substring(1) : linkSplit[0];
    var linkWithMinusSign = linkSplit[0].lastIndexOf("-", 0) === 0 ? linkSplit[0] : '-' + linkSplit[0];
    // check if link is part of the route (never the less the link is driven from or to reference node)
    if (this.routeLinks[linkWithoutPlusSign] || this.routeLinks[linkWithMinusSign]) {
        bRet = true;
    }

    return bRet;
}

/**
	This method returns if the given link id is driven towards reference node on the route
	For a route [-554335741, +83426082, +83426084] that is saved in this.links returning value of the
	request link id 83426082 would be true.
*/
PDEManager.prototype.getLinkIsDrivenFromReferenceNodeOnRoute = function(linkId) {
    var bRet = false;
    var linkWithoutPlusSign = linkId.lastIndexOf("+", 0) === 0 ? llinkId.substring(1) : linkId;
    if (this.routeLinks[linkWithoutPlusSign]) {
        bRet = true;
    }
    return bRet;
}

/**
	This method returns the previous link on the route for the given link id. For a route
	[-554335741, +83426082, +83426084] that is saved in this.links the previous link of the
	request link id 83426082 would be -554335741 in case returnValueWithDrivingSign is true
	or 554335741 in case of 554335741 returnValueWithDrivingSign is false.
	The input can be with our without sign infront of the link id (+83426082/83426082).
	If there is no previous link, null gets returned.
*/
PDEManager.prototype.getPreviousIdLinkOnRoute = function(linkId, returnValueWithDrivingSign) {
    var bPrevLinkId = null;
    var linkWithoutSign = linkId.lastIndexOf("+", 0) === 0 ? llinkId.substring(1) : linkId;
    linkWithoutSign = linkId.lastIndexOf("-", 0) === 0 ? llinkId.substring(1) : linkId;
    for (var i = 0; i < this.links.length; i++) {
        var tmpLinkOnRoute = this.links[i].linkId + ""; //lastIndexOf function below will fail if the linkid is of type integer so convert it to string
        var tmpLinkOnRouteWithoutSign = tmpLinkOnRoute.lastIndexOf("+", 0) === 0 ? tmpLinkOnRoute.substring(1) : tmpLinkOnRoute;
        tmpLinkOnRouteWithoutSign = tmpLinkOnRouteWithoutSign.lastIndexOf("-", 0) === 0 ? tmpLinkOnRouteWithoutSign.substring(1) : tmpLinkOnRouteWithoutSign;
        if (tmpLinkOnRouteWithoutSign == linkId) {
            if (i > 1) {
                if (returnValueWithDrivingSign) {
                    bPrevLinkId = this.links[(i - 1)].linkId;
                } else {
                    var tmpPrevLink = this.links[(i - 1)].linkId;
                    tmpPrevLink = tmpPrevLink.lastIndexOf("+", 0) === 0 ? tmpPrevLink.substring(1) : tmpPrevLink;
                    tmpPrevLink = tmpPrevLink.lastIndexOf("-", 0) === 0 ? tmpPrevLink.substring(1) : tmpPrevLink;
                    bPrevLinkId = tmpPrevLink;
                }
                break;
            }
        }
    }

    return bPrevLinkId;
}

/**
	This method returns the next link on the route for the given link id.For a route
	[-554335741, +83426082, +83426084] that is saved in this.links the next link of the
	request link id 83426082 would be +83426084 in case returnValueWithDrivingSign is true
	or 554335741 in case of 83426084 returnValueWithDrivingSign is false.
	The input can be with our without sign infront of the link id (+83426082/83426082).
	If there is no previous link, null gets returned.
*/
PDEManager.prototype.getNextLinkIdOnRoute = function(linkId, returnValueWithDrivingSign) {
    var bNextLinkId = null;
    var linkWithoutSign = linkId.lastIndexOf("+", 0) === 0 ? llinkId.substring(1) : linkId;
    linkWithoutSign = linkId.lastIndexOf("-", 0) === 0 ? llinkId.substring(1) : linkId;
    for (var i = 0; i < this.links.length; i++) {
        var tmpLinkOnRoute = this.links[i].linkId + ""; //lastIndexOf function below will fail if the linkid is of type integer so convert it to string
        var tmpLinkOnRouteWithoutSign = tmpLinkOnRoute.lastIndexOf("+", 0) === 0 ? tmpLinkOnRoute.substring(1) : tmpLinkOnRoute;
        tmpLinkOnRouteWithoutSign = tmpLinkOnRouteWithoutSign.lastIndexOf("-", 0) === 0 ? tmpLinkOnRouteWithoutSign.substring(1) : tmpLinkOnRouteWithoutSign;
        if (tmpLinkOnRouteWithoutSign == linkId) {
            if (i < (this.links.length - 1)) {
                if (returnValueWithDrivingSign) {
                    bNextLinkId = this.links[(i + 1)].linkId;
                } else {
                    var tmpNextLink = this.links[(i + 1)].linkId;
                    tmpNextLink = tmpNextLink.lastIndexOf("+", 0) === 0 ? tmpNextLink.substring(1) : tmpNextLink;
                    tmpNextLink = tmpNextLink.lastIndexOf("-", 0) === 0 ? tmpNextLink.substring(1) : tmpNextLink;
                    bNextLinkId = tmpNextLink;
                }
                break;
            }
        }
    }

    return bNextLinkId;
}

/**
	This metod starts the PDE manager tile generation/request
*/
PDEManager.prototype.start = function() {
    if (!this.links && !this.bbox) {
        var event = new CustomEvent("PDEError", { detail: { message: "no bbox or links given" } });
        document.dispatchEvent(event);
        return;
    }
    this.numTilesRequested = 0;
    // create tile requests for FC layers
    var requestsObjFc = [];
    var requestsObjNoFc = [];

    // create tile requests for FC and non-FC layers
    for (var layer in this.layersObjects) {

        var isFcLayer = true;
        if (typeof this.layersObjects[layer].isFCLayer !== 'undefined') {
            isFcLayer = this.layersObjects[layer].isFCLayer;
        }


        if (!isFcLayer) {
            var level = this.layersObjects[layer].level;
            requestsObjNoFc[layer] = this.generatePDETileRequests(level, isFcLayer, undefined);
            this.routeLinks = requestsObjNoFc[layer].routeLinks;
        } else {
            // optional array of specific FCs
            var fcLayers = this.layersObjects[layer].fcLayers || [1, 2, 3, 4, 5];
            requestsObjFc = this.generatePDETileRequests(-1, isFcLayer, fcLayers);
            this.routeLinks = requestsObjFc.routeLinks;
        }
    }

    // calculate overall size
    for (var layer in this.layersObjects) {
        var isFcLayer = true;
        if (typeof this.layersObjects[layer].isFCLayer !== 'undefined') {
            isFcLayer = this.layersObjects[layer].isFCLayer;
        }

        var length = (isFcLayer ? requestsObjFc.requests.length : requestsObjNoFc[layer].requests.length);
        this.numTilesOpen += length;
    }

    // request PDE tiles

    var
        tileGotRequested = false,
        tiles = [],
        layers = [],
        isFcLayers = [];
    for (var layer in this.layersObjects) {
        var isFcLayer = true;
        if (typeof this.layersObjects[layer].isFCLayer !== 'undefined') {
            isFcLayer = this.layersObjects[layer].isFCLayer;
        }
        var requests = (isFcLayer ? requestsObjFc.requests : requestsObjNoFc[layer].requests);
        for (i = 0; i < requests.length; i++) {
            var requestTile = true;
            if (this.cacheRequestedTileInformation) {
                if (this.tileCacheHashMap[layer] != null && this.tileCacheHashMap[layer][requests[i].tileX + "|" + requests[i].tileY]) {
                    requestTile = false;
                    this.numTilesOpen--;
                }
            }
            if (requestTile) {
                tileGotRequested = true;
                //this.requestPDETile(requests[i], layer, this.layersObjects[layer].callback, isFcLayer);
                tiles.push(requests[i]);
                layers.push(layer);
                isFcLayers.push(isFcLayer);
            }
        }
    }

    this.requestPDETiles(tiles, layers, isFcLayers);

    // if there was no new tile requested (maybe cause of cache) then fire onTileLoadingFinished
    if (!tileGotRequested) {
        if (this.onTileLoadingFinished !== 'undefined') {
            this.onTileLoadingFinished(0);
        }
    }
};

/**
	Request a specific PDE tile - mainly used inside PDE manager (via start())
*/

PDEManager.prototype.requestPDETiles = function(tiles, layers, isFcLayers, callback) {
    var
        tileXY = [],
        levels = [],
        layerNames = [],
        layerName,
        runRequest = function(layerNamesR, tileXYsR, levelsR) {
            window.onLoadPDETiles = this.onLoadPDETiles.bind(this);

            if(!this.api_key){
            var url = this.tilesBaseURL + "?layers=" + layerNamesR.join(',') +
                "&levels=" + levelsR.join(',') + "&tilexy=" + tileXYsR.join(',') + "&app_id=" + this.app_id + "&app_code=" + this.app_code + "&meta=1" + ((this.region != null) ? ("&region=" + this.region) : "") +
                ((callback === undefined) ? ("&callback=onLoadPDETiles") : ("&callback=" + callback));
            }
            else{
            var url = this.tilesBaseURL + "?layers=" + layerNamesR.join(',') +
                "&levels=" + levelsR.join(',') + "&tilexy=" + tileXYsR.join(',') + "&apikey=" + this.api_key + "&meta=1" + ((this.region != null) ? ("&region=" + this.region) : "") +
                ((callback === undefined) ? ("&callback=onLoadPDETiles") : ("&callback=" + callback));
            }
            var script = document.createElement("script");
            script.src = url;
            document.body.appendChild(script);
        }.bind(this);

    for (var i = 0, l = tiles.length; i < l; i++) {
        layerName = layers[i] + (isFcLayers[i] && tiles[i].fc != null ? tiles[i].fc : "");

        layerNames.push(layerName);
        tileXY.push(tiles[i].tileX + ',' + tiles[i].tileY);
        levels.push(tiles[i].level);
        if (tileXY.length == 15) { //Count of tilexy is limited to 15			
            runRequest(layerNames, tileXY, levels);
            tileXY = [];
            levels = [];
            layerNames = [];
        }
    }
    if (tileXY.length != 0) {
        runRequest(layerNames, tileXY, levels); //the last tiles
    }


};

/**
	Request a specific PDE tile - mainly used inside PDE manager (via start())
*/
PDEManager.prototype.requestPDETile = function(tile, layer, callback, isFcLayer) {

    if (callback && typeof(callback) === "function") {
        // Get the callback function name (callback.name not support in IE yet)
        var callbackName = callback.name || callback.toString().match(/^function\s*([^\s(]+)/)[1];
        var layerName = layer + (isFcLayer && tile.fc != null ? tile.fc : "");

        if(!this.api_key){
            var url = this.baseURL + "?layer=" + layerName +
            "&level=" + tile.level + "&tilex=" + tile.tileX + "&tiley=" + tile.tileY + "&app_id=" + this.app_id + "&app_code=" + this.app_code + (this.meta ? "&meta=1" : "") + ((this.region != null) ? ("&region=" + this.region) : "") 
            +"&callback=" + callbackName;

        }else{
        
            var url = this.baseURL + "?layer=" + layerName +
            "&level=" + tile.level + "&tilex=" + tile.tileX + "&tiley=" + tile.tileY + "&apikey=" + this.api_key + (this.meta ? "&meta=1" : "") + ((this.region != null) ? ("&region=" + this.region) : "") 
            +"&callback=" + callbackName;
        }
        if (this.cacheRequestedTileInformation) {
            if (this.tileCacheHashMap[layerName] == null) {
                this.tileCacheHashMap[layerName] = new Object();
            }
            this.tileCacheHashMap[layerName][tile.tileX + "|" + tile.tileY] = true;
        }
        var script = document.createElement("script");
        script.src = url;
        var that = this;
        script.onload = function() {
            that.numTilesOpen--;
            that.numTilesRequested++;

            // PDE tiles loaded for all FCs
            if (that.numTilesOpen === 0 && typeof that.onTileLoadingFinished !== 'undefined') {
                that.onTileLoadingFinished(that.numTilesRequested);
            }
        };
        document.body.appendChild(script);
    } else {
        throw "Given Callback is not a function";
    }
}

/**
	Request a PDE index - for example if a link id is known but not the functional class - then the FC class and tile
	can be requested from the index. A typical index call looks like this:
	pde.api.here.com/1/index.txt?region=EU&release=2014Q2&layer=ROAD_GEOM_FCn&attributes=LINK_ID&values=52312557,52312592,52312689,52312693,52312712&app_id=xzy&app_code=abc
*/
PDEManager.prototype.requestPDEIndex = function(attribute, layer, values, callback) {
    if (callback && typeof(callback) === "function") {
        // Get the callback function name (callback.name not support in IE yet)
        var callbackName = callback.name || callback.toString().match(/^function\s*([^\s(]+)/)[1];

        if(!this.api_key){
        var url = this.indexURL + "?layer=" + layer +
        "&attributes=" + attribute + "&values=" + values + "&app_id=" + this.app_id + "&app_code=" + this.app_code + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        
    }  
        else{
        var url = this.indexURL + "?layer=" + layer +
        "&attributes=" + attribute + "&values=" + values + "&apikey=" + this.api_key + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        }
        var script = document.createElement("script");
        script.src = url;
        var that = this;
        document.body.appendChild(script);
    } else {
        throw "Given Callback is not a function";
    }
}

/**
	Request a PDE static content - for example the traffic pattern layers reference static content
	http://pde.api.here.com/1/static.txt?region=EU&release=2014Q4&content=TRAFFIC_PATTERN&app_id=xzy&app_code=abc
*/
PDEManager.prototype.requestPDEStaticContent = function(content, callback) {
    if (callback && typeof(callback) === "function") {
        // Get the callback function name (callback.name not support in IE yet)
        var callbackName = callback.name || callback.toString().match(/^function\s*([^\s(]+)/)[1];

        if(!this.api_key){
        var url = this.staticContentURL + "?content=" + content +
        "&app_id=" + this.app_id + "&app_code=" + this.app_code + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        }
        else{
        var url = this.staticContentURL + "?content=" + content +
        "&apikey=" + this.api_key + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        }

        var script = document.createElement("script");
        script.src = url;
        var that = this;
        document.body.appendChild(script);
    } else {
        throw "Given Callback is not a function";
    }
}

/**
 Request available PDE layers for given region - for example the census boundaries layers in CENSUSWORLD region.
 http://pde.api.here.com/1/layer.json?region=EU&release=2014Q4&app_id=xzy&app_code=abc
 */
PDEManager.prototype.getAvailableLayers = function(callback) {
    if (callback && typeof(callback) === "function") {
        // Get the callback function name (callback.name not support in IE yet)
        var callbackName = callback.name || callback.toString().match(/^function\s*([^\s(]+)/)[1];

        if(!this.api_key){
        var url = this.layersURL + "?app_id=" + this.app_id + "&app_code=" + this.app_code + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        }
        else{
        var url = this.layersURL + "?apikey=" + this.api_key + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;
        }

        var script = document.createElement("script");
        script.src = url;
        document.body.appendChild(script);
    } else {
        throw "Given Callback is not a function";
    }
}

/**
	Request a specific PDE file via the given path and layer - pls see PDE developer guide what path, layer means. The callback is called
	after the file recives.
*/
PDEManager.prototype.requestPDEFile = function(path, layer, callback) {
    if (callback && typeof(callback) === "function") {
        // Get the callback function name (callback.name not support in IE yet)
        var callbackName = callback.name || callback.toString().match(/^function\s*([^\s(]+)/)[1];

        if(!this.api_key){
        var url = this.fileURL + "?layer=" + layer +
        "&path=" + path + "&app_id=" + this.app_id + "&app_code=" + this.app_code + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;

        }
        else{
        var url = this.fileURL + "?layer=" + layer +
        "&path=" + path + "&apikey=" + this.api_key + ((this.region != null) ? ("&region=" + this.region) : "") + "&callback=" + callbackName;

        }
        
        var script = document.createElement("script");
        script.src = url;
        var that = this;
        that.$lastFilePath = path;
        script.onload = function() {
            var event = new CustomEvent("PDEFileLoadingFinished", { detail: { "finishedFileRequest": that.$lastFilePath } });

            document.dispatchEvent(event);
        }
        document.body.appendChild(script);
    } else {
        throw "Given Callback is not a function";
    }
}

/**
	This method generates the PDE tiles. If the passed level parameter is -1 then the functional
	class from all links is used - the provided level otherwise. Mainly used inside PDE manager via start().
*/
PDEManager.prototype.generatePDETileRequests = function(givenLevel, isFcLayer, fcLayers) {
    var pdeTileRequests = [],
        fcColors = ["rgba(0, 0, 255, 0.2)", "rgba(34, 34, 255, 0.2)", "rgba(68, 68, 255, 0.2)", "rgba(102, 102, 255, 0.2)", "rgba(136, 136, 255, 0.2)"],
        miny,
        minx,
        maxy,
        maxx,
        bounds,
        rectangle,
        m,
        routeLinksMap = new Object();

    if (this.links != null) {
        this.bbox = null; // ensure bbox mode is disabled
        l = this.links.length;
        for (m = 0; m < l; m++) {
            routeLinksMap[parseInt(this.links[m].linkId)] = this.links[m]; // when driving from ref, linkID is positive, else negative
            var fc = this.links[m].functionalClass;

            // skip if this FC layer is not requested
            if (typeof fcLayers !== 'undefined' && fcLayers.indexOf(fc) === -1) continue;

            var level = -1; // different zoom level for each functional class
            if (givenLevel == -1) {
                level = fc + 8; // different zoom level for each functional class
            } else {
                level = givenLevel;
            }
            var tileSizeDegree = 180.0 / (1 << level);
            var shapePointsLatLonZ = this.links[m].$shapeForTileGeneration;

            for (j = 0; j < shapePointsLatLonZ.length; j++) {
                // support both old RME response and new RME response (=router response)
                var isRoutingResponse = !isNaN(shapePointsLatLonZ[j] - parseFloat(shapePointsLatLonZ[j]));
                var tileX, tileY;
                if (isRoutingResponse) {
                    tileY = Math.floor((shapePointsLatLonZ[j++] + 90.0) / tileSizeDegree);
                    tileX = Math.floor((shapePointsLatLonZ[j] + 180.0) / tileSizeDegree);
                } else {
                    var shapePointsLatLonZString = shapePointsLatLonZ[j].trim().split(",");
                    tileY = Math.floor((parseFloat(shapePointsLatLonZString[0]) + 90.0) / tileSizeDegree);
                    tileX = Math.floor((parseFloat(shapePointsLatLonZString[1]) + 180.0) / tileSizeDegree);
                }
                var found = undefined;
                for (u = 0; !found && u < pdeTileRequests.length; u++) // do we have this tile in the list already?
                    if (tileY == pdeTileRequests[u].tileY && tileX == pdeTileRequests[u].tileX) {
                        // seperate check if fc class is also matching - depending of if the layer is a fc layer
                        if (isFcLayer) {
                            if (fc == pdeTileRequests[u].fc) {
                                found = true;
                            }
                        } else {
                            found = true;
                        }
                    }
                if (found)
                    continue;

                pdeTileRequests.push({ tileX: tileX, tileY: tileY, level: level, fc: fc });

                var fcColor = fcColors[fc - 1];

                // display tile bounding box
                miny = tileY * tileSizeDegree - 90.0;
                minx = tileX * tileSizeDegree - 180.0;
                maxy = miny + tileSizeDegree - 0.00001;
                maxx = minx + tileSizeDegree - 0.00001;

                bounds = new H.geo.Rect(maxy, minx, miny, maxx);

                rectangle = new H.map.Rect(bounds, {
                    style: {
                        lineWidth: 5,
                        strokeColor: fcColor,
                        fillColor: "rgba(0, 0, 0,0)",
                        lineJoin: "round"
                    }
                });
                if (this.bboxContainer)
                    this.bboxContainer.addObject(rectangle);
            }
        }
    } else if (this.bbox != null) {
        this.links = null; // ensure linke mode is disabled
        var minY = this.bbox.getBottom(),
            maxY = this.bbox.getTop(),
            minX = this.bbox.getLeft(),
            maxX = this.bbox.getRight(),
            tileX,
            tileY,
            tileSizeDegree = 180.0 / (1 << givenLevel),
            bounds;

        var level = -1; // different zoom level for each functional class
        if (givenLevel == -1) {
            level = fc + 8; // different zoom level for each functional class
        } else {
            level = givenLevel;
        }

        if (givenLevel == -1) // FC mode
        {
            // default to all FCs if no fcLayers option passed
            if (typeof fcLayers === 'undefined') fcLayers = [1, 2, 3, 4, 5];

            for (i = 0; i < fcLayers.length; i++) {
                level = fcLayers[i] + 8; // different zoom level for each functional class
                tileSizeDegree = 180.0 / (1 << level);
                for (tileY = Math.floor((minY + 90.0) / tileSizeDegree); tileY <= Math.floor((maxY + 90.0) / tileSizeDegree); tileY++) {
                    for (tileX = Math.floor((minX + 180.0) / tileSizeDegree); tileX <= Math.floor((maxX + 180.0) / tileSizeDegree); tileX++) {
                        found = undefined;
                        for (u = 0; !found && u < pdeTileRequests.length; u++) // do we have this tile in the list already?
                        {
                            if (tileY == pdeTileRequests[u].tileY && tileX == pdeTileRequests[u].tileX && fcLayers[i] == pdeTileRequests[u].fc) {
                                found = true;
                            }
                        }
                        if (!found) {
                            pdeTileRequests.push({ tileX: tileX, tileY: tileY, level: level, fc: fcLayers[i] });
                        }
                    }
                }
            }
        } else {
            for (tileY = Math.floor((minY + 90.0) / tileSizeDegree); tileY <= Math.floor((maxY + 90.0) / tileSizeDegree); tileY++) {
                for (tileX = Math.floor((minX + 180.0) / tileSizeDegree); tileX <= Math.floor((maxX + 180.0) / tileSizeDegree); tileX++) {
                    found = undefined;
                    for (u = 0; !found && u < pdeTileRequests.length; u++) // do we have this tile in the list already?
                    {
                        if (tileY == pdeTileRequests[u].tileY && tileX == pdeTileRequests[u].tileX) {
                            found = true;
                        }
                    }
                    if (!found) {
                        pdeTileRequests.push({ tileX: tileX, tileY: tileY, level: level });
                    }
                }
            }
        }
    }
    return { requests: pdeTileRequests, bboxContainer: this.bboxContainer, routeLinks: routeLinksMap };
};

PDEManager.prototype.onLoadPDETiles = function(resp) {
    if (resp.error != undefined && this.feedbackTxt != undefined) {
        this.feedbackTxt.innerHTML = resp.error;
        return;
    }
    if (resp.responseCode != undefined && this.feedbackTxt != undefined) {
        alert(resp.message);
        this.feedbackTxt.innerHTML = resp.message;
        return;
    }
    if (!resp.Tiles) {
        console.error("onLoadPDETiles:", resp);
        return;
    }
    for (var t = 0; t < resp.Tiles.length; t++) {
        var
            tile = resp.Tiles[t],
            meta = tile.Rows.length != 0 ? tile.Meta : false;

        this.numTilesRequested++;
        if (meta) {

            var layer = meta.layerName.replace("FC" + (meta.level - 8), "FC");
            this.layersObjects[layer].callback(tile);
        }
        this.numTilesOpen--;

    }
    // PDE tiles loaded for all FCs
    if (this.numTilesOpen === 0 && typeof this.onTileLoadingFinished !== 'undefined') {
        this.onTileLoadingFinished(this.numTilesRequested);
    }
};

PDEManager.prototype.addEventListener = function(evtName, eventHandler) {
    document.addEventListener(evtName, eventHandler, false);
}