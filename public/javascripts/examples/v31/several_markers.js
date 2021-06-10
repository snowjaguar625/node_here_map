$(function(){
    /*
	(C) HERE 2019
	*/

	/* Begin rotating effect logic*/

	var rotateManager = Object(),
	groupRotating = new H.map.Group(),
	groupNonRotating = new H.map.Group();

	rotateManager.divIdsToRoatate = [];
	rotateManager.isRotating = false;
	rotateManager.idSetInterval = "";

	//Rotate a div using the "rotate" CSS3 property
	rotateManager.rotateDiv = function (divElement, degrees) {

		/*add tranform property acc to browser*/
		var ua = navigator.userAgent.toLowerCase();
		var transformProperties = [];
		if (ua.indexOf('safari') != -1) {
			if (ua.indexOf('chrome') > -1) {
				transformProperties.push("msTransform");
				transformProperties.push("transform");
			} else {
				transformProperties.push("webkitTransform");// Safari
			}
		}else{
			transformProperties.push("msTransform");
			transformProperties.push("transform");
		}

		transformProperties.forEach(function (transformProperty) {

			if (divElement.style[transformProperty]) {

				var transformPropertyValue = divElement.style[transformProperty];
				var replacement = "rotate(" + degrees + "deg)";

				//Rotate
				if (transformPropertyValue.indexOf("rotate") != -1) {

					//Replace with the new "degrees" value
					divElement.style[transformProperty] = transformPropertyValue.replace(/rotate\(.*?deg\)/g, replacement);
				}
				else {
					//Add the "rotate" property value
					divElement.style[transformProperty] = transformPropertyValue+ " " + replacement;
				}
			}
		});
	}

	//Create a time interval to rotate 360º each X milliseconds
	rotateManager.start = function () {

		var milliseconds = 8;
		var degrees = 0;

		this.isRotating = true;

		this.idSetInterval = setInterval(function () {

			rotateManager.divIdsToRoatate.forEach(function (idDivToRotate) {

				var divToRotate = document.getElementById(idDivToRotate);

				if (divToRotate != null) {
					rotateManager.rotateDiv(divToRotate, degrees);
				}
			});

			if (degrees >= 360) {
				degrees = 0;
			}
			degrees++;

		}, milliseconds); //setInterval
	};

	//Stop the interval
	rotateManager.stop = function () {

		window.clearInterval(this.idSetInterval)
		this.isRotating = false;
	};


	//Wait for window.onload
	window.onload = function () {

		rotateManager.start();
	};

	/* End rotating effect logic*/

	var mapContainer = document.getElementById('mapContainer');

	// check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;

	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	}),
	defaultLayers = platform.createDefaultLayers(),
	map = new H.Map(mapContainer, defaultLayers.vector.normal.map,
		{
			center: new H.geo.Point(50.1075760803018, 8.66582114227154),
			zoom: 18,
			pixelRatio: window.devicePixelRatio || 1
		}
	);

	var ui = H.ui.UI.createDefault(map, defaultLayers);

	// add behavior control
	new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

	window.addEventListener('resize', function() { map.getViewPort().resize(); });

	// adjust tilt and rotation of the map
	map.getViewModel().setLookAtData({
		tilt: 45,
		heading: 60
	});

	//draw marker 1 (SVG marker + text)
	var createSvgMarkerIcon = function (text, line1, mainColor, accentColor) {

		var svg =
		'<svg width="170" height="156" xmlns="http://www.w3.org/2000/svg">' +
			'<g>' +
			'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="32" width="140" y="10" x="27" fill="#ffffff"/>' +
			'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
			'<circle stroke="__MAINCOLOR__" fill="__MAINCOLOR__" cx="16" cy="16" r="16" />' +
			'<text x="16" y="20" font-size="14pt" font-family="arial" font-weight="bold" text-anchor="middle" fill="__ACCENTCOLOR__" textContent="__TEXTCONTENT__">__TEXT__</text>' +
			'</g>' +
			'</svg>',

		svg = svg.replace(/__line1__/g, line1);
		svg = svg.replace(/__TEXTCONTENT__/g, text)
		svg = svg.replace(/__TEXT__/g, text)
		svg = svg.replace(/__ACCENTCOLOR__/g, accentColor)
		svg = svg.replace(/__MAINCOLOR__/g, mainColor);

		return new H.map.DomIcon(svg);

	};
	
	// create SVG markup for marker's icon
	var iconMarkup = '<svg style="left:-{{{LEFT}}}px;top:-{{{TOP}}}px;"' +
		'xmlns="http://www.w3.org/2000/svg" width="{{{WIDTH}}}px" height="{{{HEIGHT}}}px" >'
	+ '<g transform="scale({{{SCALE}}})"><path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 ' +
		'28 13 28 C 16.3 28 19 29.3 19 31 Z" fill="#000" fill-opacity=".2"></path>'
	+ '<path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 ' +
		'19.5 3.8 21.9 L 13 31 L 22.2 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 ' +
		'6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"></path>'
	+ '<path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L ' +
		'13 28.2 L 20.8 20.5 C 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 ' +
		'13 2.2 Z" fill="{{{COLOR}}}"></path>'
	+ '<text transform="matrix( 1 0 0 1 13 18 )" x="0" y="0" fill-opacity="1" '
	+ 'fill="{{{FONTCOLOR}}}" text-anchor="middle" '
	+ 'font-weight="bold" font-size="13px" font-family="arial">{{{TEXT}}}</text></g></svg>';	
	
	var dropMainDiv = document.createElement("div");
	dropMainDiv.classList.add("dj");
	var dropDiv = document.createElement("div");
	dropMainDiv.appendChild(dropDiv);
	dropDiv.classList.add("drop");
	var scale = 1.4;
	dropDiv.innerHTML = iconMarkup
			.replace('{{{FONTCOLOR}}}', "#300303")
			.replace('{{{COLOR}}}', "#00d3ba")
			.replace('{{{TEXT}}}', "DJ")
			.replace('{{{SCALE}}}', scale)
			.replace('{{{LEFT}}}', scale * 14)
			.replace('{{{TOP}}}', scale * 36)
			.replace("{{{WIDTH}}}", scale * 28)
			.replace("{{{HEIGHT}}}", scale * 36);
	var drop_jumpIcon = new H.map.DomIcon(dropMainDiv);//DomIcon create once and reuse it
	var drop_jumpMarker = new H.map.DomMarker(
		new H.geo.Point(50.108158,8.669274),
		{
		  icon: drop_jumpIcon
		}
	);
	drop_jumpMarker.addEventListener('tap',
		function (event) {
			var dj = document.querySelector(".dj").children[0]; //get html element which created on the map by "new H.map.DomMarker"
			dj.classList.toggle("drop");
			dj.classList.toggle("jump");
		},true
	);
	
	groupNonRotating.addObject(drop_jumpMarker);

	point = new H.geo.Point(50.1079790808038, 8.66582114227184);
	marker = new H.map.DomMarker(
		point,
		{
			icon: createSvgMarkerIcon("!", "SVG marker with text", "#FF0000", "#FFF")
		});
	marker.addEventListener('dblclick',
		function (event) {
			scope.selectedSegments({ selected: [event.target.getData().getData().segment] });
		},true
	);

	marker.addEventListener('dbltap',
		function (event) {
			scope.selectedSegments({ selected: [event.target.getData().getData().segment] });
		}
	);
	marker.addEventListener('pointerenter',
		function (event) {
			this.setIcon(createSvgMarkerIcon(":)", "Marker with a new text", "#FF0000", "#FFF"));
		}
	);
	marker.addEventListener('pointerleave',
		function (event) {
			this.setIcon(createSvgMarkerIcon("!", "SVG marker with text", "#FF0000", "#FFF"));
		}
	);
	groupNonRotating.addObject(marker);

	//draw marker 2 (SVG marker + Image base64 encoded)
	var createSvgMarkerIconWithImg = function (line1) {
		var ua = navigator.userAgent.toLowerCase();
		var svg =
			'<svg width="220" height="50" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"  >' +
				'<g>' +
				'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="32" width="170" x="35" fill="#ffffff"/>' +
				'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" stroke-width="0" fill="#000000" x="45" y="20">__line1__</text>'+
				'<image width="50" height="50"   overflow="visible" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
				'</g>' +
				'</svg>';


		svg = svg.replace(/__line1__/g, line1);
		return new H.map.DomIcon(svg);
	};

	point = new H.geo.Point(50.1075760803018, 8.66882114227154);
	marker = new H.map.DomMarker(
			point,
			{
				icon: createSvgMarkerIconWithImg("SVG marker with base64 image")
			});
	groupNonRotating.addObject(marker);

	//draw marker 3 (Marker + Image URL)
	var createImgMarkerIcon = function (line1) {
				var img = document.createElement("img");
				img.src = "/assets/icons/truck.png";

				return new H.map.Icon(img, {
					anchor: { x: 64, y: 64 }
				});
	};

	point = new H.geo.Point(50.1089790808038, 8.66532714227184);
	marker = new H.map.Marker(
				point,
				{
					icon: createImgMarkerIcon()
				});
	groupNonRotating.addObject(marker);

	//draw marker 4 (DOM marker + Image URL + Rotate)
	var createImgTransformMarkerIcon = function (id, imgPath) {
		var div = document.createElement("div");
		div.setAttribute('id', id);
		rotateManager.divIdsToRoatate.push(id);

		var img = document.createElement("img");
		img.src = imgPath;
		div.appendChild(img);

		return new H.map.DomIcon(div, {
					anchor: { x: 0, y: 0 }
		});
	};

	point = new H.geo.Point(50.1079780808038, 8.66782714227184);
	marker = new H.map.DomMarker(
				  point, {
					  icon: createImgTransformMarkerIcon('myDivToRotate', "/images/examples/map-icon-arrow-blue.png")
	});
	groupRotating.addObject(marker);

	//draw marker 5 (SVG  + Image URL)
	var createSVGRotatingMarkerIcon = function (line1) {
		var div = document.createElement("div");
		div.setAttribute('id', 'myDivSVGToRotate');
		rotateManager.divIdsToRoatate.push('myDivSVGToRotate');

		var svg =
				  '<svg width="170" height="56" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
					  '<g>' +
					  '<rect id="label-box" ry="3" rx="3" stroke="#000000" height="32" width="140" y="10" x="27" fill="#ffffff"/>' +
					  '<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="45" stroke-width="0" fill="#000000">__line1__</text>' +
					  '<image width="48" height="57" xlink:href="/assets/icons/tools.png" />' +
					  '</g>' +
					  '</svg>';

		svg = svg.replace(/__line1__/g, line1);
		div.innerHTML = svg;

		return new H.map.DomIcon(div, {
					  width: 33,
					  height: 33,
					  drawable: false
				  });
	};

	point = new H.geo.Point(50.1085760803018, 8.66689114227154);
	marker = new H.map.DomMarker(
				  point,
				  {
					  icon: createSVGRotatingMarkerIcon("SVG marker with image")
				  });
	groupRotating.addObject(marker);
	
	//draw marker 6 which opens a link on click
	point = new H.geo.Point(50.1086760803018, 8.66892114227154);
	marker = new H.map.DomMarker(
			point,
			{
				icon: createSvgMarkerIconWithImg("Click Me")
			});
	  // set the href
    marker.$href = "https://wego.here.com";
	marker.addEventListener("pointerenter", function(e)
        {
           document.body.style.cursor = "pointer";
        }
	);
	marker.addEventListener("pointerleave", function(e)
        {
           document.body.style.cursor = "default";
        }
	);
	marker.addEventListener("pointerdown", function(e)
        {
           e.preventDefault();
		   var a = document.createElement("a");
            a.target = "_blank";
            a.href = e.target.$href;
            a.click();
        }
	);
	
	groupNonRotating.addObject(marker);

	//Center and zoom the map
	map.setCenter(point);
	map.addObject(groupRotating);
	map.addObject(groupNonRotating);
})