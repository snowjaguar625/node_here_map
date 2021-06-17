/* 
		author domschuette
		(C) HERE 2017
	*/
	
	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	// Check whether the environment should use hi-res maps
	var hidpi = ('devicePixelRatio' in window && devicePixelRatio > 1);

	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
			app_id: app_id,
			app_code: app_code,
			useHTTPS: secure
		}),
		maptypes = platform.createDefaultLayers(hidpi ? 512 : 256, hidpi ? 320 : null),
		adminLevel,
		layer,
		provider;

	// Instantiate a map in the 'map' div, set the base map to normal
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.normal.base, {
		center: new H.geo.Point(35.176904616342135, 33.359340725785955),
		zoom: 14,
		pixelRatio: hidpi ? 2 : 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);
	
	// canvas colorDepth
	var fillstyle = "blue",
		filter = true;

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	map.addEventListener("mapviewchange", function() 
	{ 
		var d = document.getElementById("centerCoordinate"),
			c = map.getCenter(),
			lon = Math.round(c.lng * 100000.0) /100000.0;
			lat = Math.round(c.lat * 100000.0) /100000.0;
			d.innerHTML = "Map center: " + lat + " / " + lon;
	});

	var CustomProvider = function(options) 
	{
		this.projection = new mapsjs.geo.PixelProjection();
		this.projection.rescale(7);

		this.url = "https://{$SERVER$}.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/{$Z$}/{$X$}/{$Y$}/256/png8?app_id=" + app_id +  "&app_code="+ app_code + "&metadata=metaonly&mgen=2&lg=gre";
		
		this.done = {};
		mapsjs.map.provider.RemoteTileProvider.call(this /*, {min: 7, max: 8}*/);
	};

	// inherits is API internal, but it saves time to use it directly
	inherits(CustomProvider, mapsjs.map.provider.RemoteTileProvider);

	CustomProvider.prototype.requestInternal = function(x, y, z, onSuccess, onError) 
	{
		this.projection.rescale(z);

		var that = this,
			xhrs = [],
			canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');
		
		canvas.width = 256;
		canvas.height = 256;
		var server_rr = 1 + ((y + x) % 4);
		
		xhrs.push(
			new mapsjs.net.Xhr(this.url.replace('{$X$}', x).replace('{$Y$}', y).replace('{$Z$}', z).replace('{$SERVER$}', server_rr), (function(x, y) {return function(resp) 
			{
				if (resp.ok)
				{
                    resp.json().then(function(jsonResp)
                    {
                        var metadata = jsonResp.metadata;
                        for (var key in metadata) 
                        {
                            var objs = metadata[key];
                            for(var i = 0; i < objs.length; i++)
                            {
                                var curObj = objs[i];
                                
                                var bboxes = curObj["bounding boxes"],
                                    box1 = curObj["box 1"],
                                    box2 = curObj["box 2"],
                                    name = curObj["name"],
                                    vertices = curObj["vertices"],
                                    font_size = curObj["font size"],
                                    uri = curObj["uri"];
                                if(bboxes && uri)
                                {
                                    for(var j = 0; j < bboxes.length; j++)
                                    {
                                        var box = bboxes[0]["box " + (j + 1)];
                                        if(box)
                                        {
                                            var x = box[0],
                                                y = box[1],
                                                w = box[2],
                                                h = box[3];
                                            
                                            var img = new Image();
                                            img.onload = function() {
                                                ctx.drawImage(img, x, y);
                                            };
                                            img.src = uri;
                                        }
                                    }
                                }
                                else if(box1 && box2 && name)
                                {
                                    var re = '\\w+';
                                    if ((filter && !name.match(re)) || (!filter && name.match(re))) 
                                    {
                                        ctx.fillStyle = fillstyle;
                                        ctx.fillRect(box1[0],box1[1],box1[2],box1[3]);
                                        if(font_size)
                                            ctx.font = font_size + "px Arial";
                                        else
                                            ctx.font = "12px Arial";
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(name, box2[0], box2[1]);
                                    }
                                }
                                else if(box1 && name)
                                {
                                    var re = '\\w+';
                                    if ((filter && !name.match(re)) || (!filter && name.match(re)))  
                                    {
                                        ctx.fillStyle = fillstyle;
                                        if(font_size)
                                            ctx.font = font_size + "px Arial";
                                        else
                                            ctx.font = "10px Arial";
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(name, box1[0], box1[1]);
                                    }
                                }
                                else if(box2 && name)
                                {
                                    var re = '\\w+';
                                    if ((filter && !name.match(re)) || (!filter && name.match(re)))  
                                    {
                                        ctx.fillStyle = fillstyle;
                                        if(font_size)
                                            ctx.font = font_size + "px Arial";
                                        else
                                            ctx.font = "10px Arial";
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(name, box2[0], box2[1]);
                                    }
                                }
                                else if(vertices && name)
                                {
                                    var re = '\\w+';
                                    if ((filter && !name.match(re)) || (!filter && name.match(re))) 
                                    {
                                        ctx.fillStyle = fillstyle;;
                                        if(font_size)
                                            ctx.font = font_size + "px Arial";
                                        else
                                            ctx.font = "8px Arial";
                                        ctx.textAlign = 'center';
                                        ctx.textPath(name, vertices);
                                    }
                                }
                                else if(name && curObj["bounding boxes"][0]["box 1"] || curObj["bounding boxes"][0]["box 2"])
                                {
                                    var box = null;
                                    
                                    if(curObj["bounding boxes"][0]["box 1"] && curObj["bounding boxes"][0]["box 2"])
                                        box = curObj["bounding boxes"][0]["box 2"];
                                    else if(curObj["bounding boxes"][0]["box 2"])
                                        box = curObj["bounding boxes"][0]["box 2"]
                                    else
                                        box = curObj["bounding boxes"][0]["box 1"];
                                    
                                    var re = '\\w+';
                                    if ((filter && !name.match(re)) || (!filter && name.match(re)))  
                                    {
                                        ctx.fillStyle = fillstyle;
                                        if(font_size)
                                            ctx.font = font_size + "px Arial";
                                        else
                                            ctx.font = "10px Arial";
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(name, box[0],box[1]);
                                    }
                                }
                                else
                                {
                                    console.log(curObj);
                                }
                                onSuccess(canvas);
                            }
                        }
					}, 
                    function(err)
                    {
                        console.log(err);
                    });
				}
            };}(x, y))));

		return {
			'cancel': function() 
			{
				xhrs.forEach(function(item) 
				{
					item.abort();
				});
			}
		}
	}
	
	function changeFilter(checkbox)
	{
		filter = checkbox.checked;
		document.getElementById("filter_label").innerHTML = filter ? "Filter Latin Characters" : "Filter non Latin Characters";
		provider.reload(true);
	}
	
	var provider = new CustomProvider({}),
		layer = new mapsjs.map.layer.TileLayer(provider);
	map.addLayer(layer);