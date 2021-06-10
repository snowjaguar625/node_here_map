$(function(){
    /* 
		author Mykyta
		(C) HERE 2019
	*/

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var mapContainer = document.getElementById('mapContainer'),

		platform = new H.service.Platform({
			useHTTPS: secure,
			apikey: api_key
		}),
		defaultLayers = platform.createDefaultLayers(),
		markergroup = new H.map.Group(),
		svggroup = new H.map.Group(),
		map = new H.Map(mapContainer, defaultLayers.vector.normal.map, 
			{
				center: new H.geo.Point(50.1075760803018, 8.66582114227154),
				zoom: 5
			}
		);
		
	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
	
	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, defaultLayers);

	window.addEventListener('resize', function() { map.getViewPort().resize(); });
	
	var svg_circle = '<svg xmlns="http://www.w3.org/2000/svg" height="40" width="40">' +
					 '<circle cx="20" cy="20" r="18" stroke="black" stroke-width="2" fill="__FILLCOLOR__" />' +
					 '</svg>';

	var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px">' +
			  '<path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19' +
			  ' 29.3 19 31 Z" fill="#000" fill-opacity=".2"/>' +
			  '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2' +
			  ' 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/>' +
			  '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C' +
			  ' 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="__FILLCOLOR__"/>' +
			  '<text font-size="12" font-weight="bold" fill="#fff" font-family="Nimbus Sans L,sans-serif" x="10" y="19">__NO__</text>' +
			  '</svg>';
	
	var colors = [
					new H.map.Icon(
								svg.replace(/__NO__/g, "1")
								.replace(/__FILLCOLOR__/g, "#FF0000")), 
					new H.map.Icon(svg.replace(/__NO__/g, "2")
								.replace(/__FILLCOLOR__/g, "#FF0000")), 
					new H.map.Icon(svg.replace(/__NO__/g, "3")
								.replace(/__FILLCOLOR__/g, "#00FF00")), 
					new H.map.Icon(svg.replace(/__NO__/g, "4")
								.replace(/__FILLCOLOR__/g, "#0000FF")), 
					new H.map.Icon(svg.replace(/__NO__/g, "5")
								.replace(/__FILLCOLOR__/g, "#F0F000"))
				];
				
	var circle_colors = [
			new H.map.Icon(
						svg_circle.replace(/__NO__/g, "1")
						.replace(/__FILLCOLOR__/g, "#FF0000")), 
			new H.map.Icon(svg_circle.replace(/__NO__/g, "2")
						.replace(/__FILLCOLOR__/g, "#FF0000")), 
			new H.map.Icon(svg_circle.replace(/__NO__/g, "3")
						.replace(/__FILLCOLOR__/g, "#00FF00")), 
			new H.map.Icon(svg_circle.replace(/__NO__/g, "4")
						.replace(/__FILLCOLOR__/g, "#0000FF")), 
			new H.map.Icon(svg_circle.replace(/__NO__/g, "5")
						.replace(/__FILLCOLOR__/g, "#F0F000"))
		];
	
	var a = new Array(coordinates.length);
	for ( var i = 0; i < a.length; i++) 
	{
		a[i] = new H.map.Marker(coordinates[i], 
		{
			icon: colors[Math.floor((Math.random()*4))]
		});
		a[i].title = "Hallo Welt"; 
	}
	markergroup.addObjects(a);
	
	var tooltip = new Tooltip(map);

	var b = new Array(coordinates.length);
	for ( var i = 0; i < b.length; i++) 
	{
		b[i] = new H.map.Marker(coordinates[i], 
		{
			icon: circle_colors[Math.floor((Math.random()*4))]
		});
		b[i].title = "Hallo Welt";
	}
	svggroup.addObjects(b);
	
	markergroup.setZIndex(99);
	svggroup.setZIndex(1);

	map.addObject(markergroup);
	map.addObject(svggroup);
})