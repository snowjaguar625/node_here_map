/* 
		author domschuette
		(C) HERE 2017
	*/ 

	var map = new OpenLayers.Map({
		div: "mapContainer",
		projection: "EPSG:900913",
		displayProjection: "EPSG:4326",
		numZoomLevels: 21
	});
	
	var normalDay = new OpenLayers.Layer.XYZ(
		"normal.day",
		[
			"https://1.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://2.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://3.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://4.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code
		], {
			attribution: "Tiles &copy; <a href='http://here.com/'>HERE</a>",
			sphericalMercator: true,
			wrapDateLine: true,
			transitionEffect: "resize",
			buffer: 1,
			numZoomLevels: 21
		}
	);
	
	var hybridDay = new OpenLayers.Layer.XYZ(
		"hybrid.day",
		[
			"https://1.aerial.maps.api.here.com/maptile/2.1/maptile/newest/hybrid.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://2.aerial.maps.api.here.com/maptile/2.1/maptile/newest/hybrid.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://3.aerial.maps.api.here.com/maptile/2.1/maptile/newest/hybrid.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://4.aerial.maps.api.here.com/maptile/2.1/maptile/newest/hybrid.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code
		], {
			attribution: "Tiles &copy; <a href='http://here.com/'>HERE</a>",
			sphericalMercator: true,
			wrapDateLine: true,
			transitionEffect: "resize",
			buffer: 1,
			numZoomLevels: 21
		}
	);

	var terrainDay = new OpenLayers.Layer.XYZ(
		"terrain.day",
		[
			"https://1.aerial.maps.api.here.com/maptile/2.1/maptile/newest/terrain.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://2.aerial.maps.api.here.com/maptile/2.1/maptile/newest/terrain.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://3.aerial.maps.api.here.com/maptile/2.1/maptile/newest/terrain.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code,
			"https://4.aerial.maps.api.here.com/maptile/2.1/maptile/newest/terrain.day/${z}/${x}/${y}/256/png8?app_id=" + app_id + "&app_code=" + app_code
		], {
			attribution: "Tiles &copy; <a href='http://here.com/'>HERE</a>",
			sphericalMercator: true,
			wrapDateLine: true,
			transitionEffect: "resize",
			buffer: 1,
			numZoomLevels: 21
		}
	);
	
	map.addLayers([
		normalDay, hybridDay, terrainDay
	]);

	map.addControl(new OpenLayers.Control.LayerSwitcher());
	map.addControl(new OpenLayers.Control.MousePosition());
	map.zoomToMaxExtent();