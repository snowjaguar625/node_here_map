/**
	* @author Michele Comignano, Knut Strobeck
	* @copyright (C) HERE 2015
	*author asadovoy
	*(C) HERE 2019 -> migrate to 3.1
	*/

	var centerLat = 50.16220;
	var centerLon = 8.53324;

	// Prefill values from URL if passed.
	(function setValuesFromUrl() {
	  var indexOf = window.location.href.indexOf('?');
	  if (indexOf < 0) return;
	  var vars = window.location.href.slice(indexOf + 1).split('&');

	  for (var i = 0; i < vars.length; i++) {
		nameVal = vars[i].split('=');
		var paramName = nameVal[0];
		if (!paramName) continue;
		var paramValue = nameVal[1];
		if (paramName === 'lat') centerLat = paramValue;
		if (paramName === 'lon') centerLon = paramValue;
		var elementById = document.getElementById(paramName);
		if (elementById) {
		  elementById.value = decodeURIComponent(paramValue);
		}
	  }

	})();

	var boundingCircleInsidePolygonOptions = {
	  style: {
		fillColor: 'rgba(0, 150, 0, 0.8)',
		lineWidth: 0
	  }
	};

	var assetInsidePolygonOptions = {
	  style: {
		fillColor: 'rgba(0, 255, 0, 0.8)',
		lineWidth: 0
	  }
	};

	var boundingCircleIntersectsPolygonOptions = {
	  style: {
		fillColor: 'rgba(230, 200, 0, 0.3)',
		lineWidth: 0
	  }
	};

	var searchGeometryOptions = {
	  style: {
		fillColor: 'rgba(0, 0, 0, 0.0)',
		lineWidth: 2,
		strokeColor: 'red'
	  }
	};

	var distanceOptions = {
	  style: {
		fillColor: 'rgba(0, 0, 0, 0.0)',
		lineWidth: 2,
		lineDash: [5, 5],
		strokeColor: 'red'
	  }
	};

	  // check if the site was loaded via secure connection
	var secure = (location.protocol === 'https:') ? true : false;
	
	// Create a platform object to communicate with the HERE REST APIs
	var platform = new H.service.Platform({
		useHTTPS: secure,
		apikey: api_key
	});
	maptypes = platform.createDefaultLayers();

	// Instantiate a map in the 'map' div, set the base map to normal
	var DEFAULT_LAYER = 'A333666999';//quick fix for working Demo
	var layerIdElement = document.getElementById('layerId');

	if (!layerIdElement.value) {
	  layerIdElement.value = DEFAULT_LAYER;
	}
	var defaultCenter = new H.geo.Point(centerLat, centerLon);
	var defaultZoom = 13;
	var map = new H.Map(document.getElementById('mapContainer'), maptypes.vector.normal.map, {
		center: defaultCenter,
		zoom: defaultZoom,
		pixelRatio: window.devicePixelRatio || 1
	});

	// Enable the map event system
	var mapevents = new H.mapevents.MapEvents(map);

	// Enable map interaction (pan, zoom, pinch-to-zoom)
	var behavior = new H.mapevents.Behavior(mapevents);

	// Enable the default UI
	var ui = H.ui.UI.createDefault(map, maptypes);

	//add JS API Release information
	// <!-- releaseInfoTxt.innerHTML += "JS API: 3." + H.buildInfo().version; -->

	//add MRS Release information
	// <!-- loadMRSVersionTxt(); -->

	window.addEventListener('resize', function () {
		map.getViewPort().resize();
	});

	 //when the page loads then there is no enviornment is set
	window.onload = envSelect;

	  map.addEventListener('longpress', mapLongpress);

	  function mapLongpress(e) {		
		if(document.getElementById('searchType').value === 'proximity'){
			var p = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			map.removeObjects(map.getObjects());
			if(currentBubble)
			ui.removeBubble(currentBubble);
			var searchRadius = document.getElementById('searchRadius').value;
			var circle = new H.map.Circle(p, searchRadius, searchGeometryOptions);
			map.addObject(circle);
			map.addObject(new H.map.Marker(p));
			map.getViewModel().setLookAtData({
				bounds: circle.getBoundingBox()
			}, true);
			document.getElementById('searchclause').value='proximity='+p.lat.toFixed(4)+','+p.lng.toFixed(4);
			callCle();
		}
	  }
	
	// read the HTML page URL parameters
	var htmlPageUrlParameters = [];
	location.search.replace("?","").split("&").forEach( function(nameValue) { nv = nameValue.split("="); htmlPageUrlParameters[nv[0]] = nv[1]; } );
	if (htmlPageUrlParameters.endpointurl) document.getElementById('environment').value = htmlPageUrlParameters.endpointurl;

	var cle = platform.ext.getCustomLocationServiceApiKey( document.getElementById('environment').value, document.getElementById('environment').value, api_key);
	var geocoder = platform.getGeocodingService();
	var quadKey = platform.ext.tooling.quadKey();
	  var currentBubble = null;
	

	var logArea = document.getElementById('logArea');
	logArea.log = function (str) {
		logArea.value += str + '\n';
		logArea.scrollTop = logArea.scrollHeight;
	};    
	logArea.delim = function () {
		logArea.log("--------------------------------------------------");
	};
	logArea.strongDelim = function () {
		logArea.log("=================================================");
	};
	
	
	function clearLog() {
		 logArea.value = "";
	}

	function getKeyAttributeName() {
	  return document.getElementById('keyAttributeName').value;
	}

	  cle.getPDELayers(onGetMapLayers);
	
	function onGetMapLayers(layers, err) {
	  if (err) {
		window.alert("Could not get layers from DPE");
		return;
	  }
	  var layerList = document.getElementById("pdelayerId");
	  layers.forEach(function (l) {
		var opt = document.createElement('option');
		opt.value = l.name;
		opt.innerHTML = l.name;
		opt.$attributes = l.attributes;
		layerList.appendChild(opt);
	  });
	  // Set attributes for the selection.
	  setAvailableKeyAttributes(layerList.options[layerList.selectedIndex].$attributes);
	}

	function setAvailableKeyAttributes(attrs) {
	  var keyAttributes = document.getElementById("keyAttributeName");
	  var labelNames = document.getElementById("labelfield");
	  // Reset current attributes list.
	  keyAttributes.options.length = 0;
	  labelNames.options.length = 0;
	  
	  var none = document.createElement('option');
	  none.value = "none";
	  none.innerHTML = "none";
	  labelNames.appendChild(none);
	  
	  attrs.forEach(function (attr) {
		var opt1 = document.createElement('option');
		opt1.value = attr;
		opt1.innerHTML = attr;
		var opt2 = document.createElement('option');
		opt2.value = attr;
		opt2.innerHTML = attr;
		keyAttributes.appendChild(opt1);
		labelNames.appendChild(opt2);
	  });
	}
	
	
	function searchSelect() {
		var type= document.getElementById('searchType').value;
		switch( type ) {
			case 'proximity':
				document.getElementById('searchclause').value= 'proximity=41.9,12.5';
				document.getElementById('searchRadius').value = '3000'
				document.getElementById('searchRadiusLabel').style.display = 'block'
				document.getElementById('searchRadius').style.display = 'block'
				break;
			case 'corridor':
				document.getElementById('searchclause').value= 'corridor=41.897748022063600;12.476418018341064,41.898354945920445;12.476460933685303,41.899009778349530;12.476503849029541,41.899009778349530;12.476203441619873,41.898997799767800;12.476008068921288,41.899005785489194;12.475825678708276,41.898502683091590;12.475932967068871,41.898430810996956;12.475841771962365,41.898358938821410;12.475584279896935,41.898303038184540;12.475074660184106,41.897923711141644;12.475044727325440,41.897875795986490;12.473993301391602,41.897843852529725;12.473521232604980,41.897779965568270;12.472941875457764,41.897748022063600;12.472491264343262,41.897748022063600;12.472233772277832,41.897157064344830;12.472748756408691,41.896933457295496;12.472512722015380,41.897348726906856;12.470796108245850,41.897492473450875;12.470109462738037,41.897748022063600;12.469122409820557,41.898115371402824;12.468392848968506,41.899201435351210;12.466976642608643,41.899888201550380;12.466011047363281,41.900239567447360;12.465624809265137,41.900670786587625;12.465023994445800,41.901581128543090;12.463908195495605,41.902156074670180;12.463114261627197,41.902427575208420;12.462985515594482,41.902731015620340;12.463006973266602,41.904359986865300;12.463243007659912,41.904902968044830;12.463328838348389,41.905749370673930;12.463457584381104,41.905541763520490;12.466225624084473,41.905334155691950;12.468457221984863,41.906036825618070;12.470560073852539,41.905222366581576;12.471053600311280,41.905014757714450;12.473413944244385,41.904902968044830;12.475044727325440,41.905126547188330;12.475173473358154,41.905589672923520;12.475216388702393,41.906404127274314;12.475194931030273,41.906771426817430;12.475152015686035,41.907106785424310;12.475152015686035,41.907458111599190;12.475259304046630,41.907729589591930;12.475237846374512,41.907729589591930;12.475237846374512,41.908017035620060;12.475044727325440';
				document.getElementById('searchRadius').value = '100'
				document.getElementById('searchRadiusLabel').style.display = 'block'
				document.getElementById('searchRadius').style.display = 'block'
				
				break;
			case 'bbox':
				document.getElementById('searchclause').value= 'bbox=41.91,12.47;41.893,12.51'
				document.getElementById('searchRadiusLabel').style.display = 'none'
				document.getElementById('searchRadius').style.display = 'none'
				break;
			case 'all':
				document.getElementById('searchclause').value= '';
				document.getElementById('searchRadiusLabel').style.display = 'none'
				document.getElementById('searchRadius').style.display = 'none'
				break;
			case 'quad_key':
				document.getElementById('searchclause').value= 'quad_key=1202322211';
				document.getElementById('searchRadiusLabel').style.display = 'none'
				document.getElementById('searchRadius').style.display = 'none'
				break;
			default: console.alert("Unknown search type: " + type)
		}
	}
	
	function refreshDemo() {
	  if( cle.endpoint === "" ) {
		  alert("Please enter an endpoint.");
		  return;
	  }
	
	  //var content= "UEsDBAoAAAAIAINwlUg00UqulQYAACgSAAAJAAAAbGF5ZXIud2t0tZddi5xFEIWvk18xlwmIdHV1d3VdiqAImgQVwcshLLq4mYHsrkJ%2BvU%2FNvNUja7K5yZIEks15%2B%2BNU1TmnD%2Ft3V8%2F%2B%2Bevu%2BS%2F7w%2B6bwx9XN8dnb17%2F%2BPv3r1%2FtXryQ%2BnUbfZZpvYlMtV2Tr71oncNnKXV2%2B2q3gUZVn9XnGPOMqqbd3WevtSXKxHr3wlqjbajho4AcZmut4fxkeBWTnqjWZLiOwq%2B1mOpg8dG96wbrVrWIV6vSF4yj1l5nVUlUncpRS9F1epvNpfdqfS5QUbch3tbpfTSt3Eaq5ul7a9q1cSddG7qPDmXNm%2Bg6%2FhSWcl2LDeMUzp34%2BUJxbDGbvfiCzTK6cj7xdfrZKndSfo2F6mzQhzYxXzDqY7VIn4lyWFbvNqy1Ty9mfGIsZ71Y%2FTT9wAqfWbfSEmZlli6tU5q1p0E2v8tcnBkM9T6keF%2Fnhx41q%2FBriTJ3mfQBVV4wOO1Soaxt11TVOTmFqMx1sNLpAVX6TBPFyWprVeoCeYFntmkzl2q9DApeRdtCNaNmgxtsjagdxrhzn9LWsXxUuHBvZtsdddRKT7vOyxWValRlbHI%2FukRLY%2F0pCRruleWF66wNacAyvfqFrZiVSdFcfOTZTzt09pDVhrM06Y3hqHmqFi1WOK35QgmXpskK1c0d22gxM35ZyyaEVhqqVkkUI0PTwP9lbptNBg8WzBZd3DC6Ri4DyZdlNmm6mOgxuc7Z1rE67dImTSI1S%2BiTBmFCh4zLhrWhKUFRbqhleEOGfPXDF0U9qoUvXz5%2Fsz%2Fc%2FXl1PDwQUePLibzQt6InhZmO%2FhRDeEbZVjc6l3lBGahATVCNFqVMMvqCwRbCJ%2FAzzrBpAahMT86nmTQp81TukijaSyv81bpAodd0nLfEwDk00GPVHlmpoY1ztlHWoeIrOm7QNwni5Ix9YYMUl%2BCB6YSJisYl7EQoKqp%2BgaEFUObRPrllsD750%2FtCSQxtjc6RRDEbrI1Wa6KYcJWYBWQ0L4lnBIUq9T%2BLFRtRXysJYzy4J2OFLixYaCGuQ83zAiBqcIPVJQoZwcCY72o1UdSItikYxnga2KM9RnOGx7%2B5vrp7%2F9Djw%2Fd0SNRzlmXMGkIrHVE%2Bb9DhdnDrQg11eRbCWsIBU1I%2BiooogP2gZJYo%2Fo2PwrmUvlBC%2B%2BOIyTbqoQoyDHdsa8lJJLk8StPXlrBDodDuWhcM61bk2%2FunDwaFSDVDXka6zCkD0JSwtiwLUzZWj06tF9RjjMH2t8eb4%2B3t1UOuKQ7H4mZVYeVcJuSROakeueS8PiRUVNlRaj27GChGB0%2FEwudmUM7EnxIIRM5cK6ovNErNcMayjIjjsTh9oswbMezEUS4WUt4jw4VZbzA6zJgRPLaOhLVIXgyotW1O6DHSUrhDCiVrYa4N9x7z7InMMhpB6fg2GypMDeKFfDPPuSUmnsnSk25IohpOFDaCnyeqMfFIHnqWKP7O%2Fg1aiY65VkegoLlk2T5C6%2FSwSvoA7%2FJEaUxbi7kpiYKy0BI8Kmlle6yhR1RddCECQhKTtRLpiqwJQ2rJFmIRnS2yGvhLwx7vsOjN6%2Fdv728fdCbtTbXVY%2BL6VjSLuxCUmMCt%2FjExJCNaHSI3ctCiEtwwqZmKYJS0jG%2BAO88k4iRhUx1JbSladJzEYjFecvYNhJ6cKsSjTpZ8EthnLho%2Bfr3%2F8GG%2Fe7X%2F%2B3jYPzRzpolCD%2FRWfOOXMEQYExuas2kaDwAUDxZaS1QoN6Gi5ZwzDUR%2BchvtrpuHOdmS7xRKJVHIWzyuuODYYhpZgZZn%2BbJCJlEb%2BSHQx1MgUYVsytcj59cif1MUOCpjO5dHVwn30nx4gCJL8NrBPVMz3CIbjUpn2RPBHieWuvy0v7893vxPVJHsCX9wEsN8vjp7lUL9reVcw3xsi0dEjksUCSv8XS6gGhMmtK9tXKMjHi8UJi0dnrFn9qMkaymUC2pJCyWfsl8W9fgVIedwf3MDMT%2B8%2BnV3HuiGLzCXtEXZZhDHIK4gIWz6kQ9opRJigdGULUJQIN6jrtHP4%2BXz747vj7ufj%2B%2F2h4c1oFA8saK5cMlNnZSwRzSKVL0RN%2BOtDen8UDK9ItnkT5L9mJ4oZnhGmSStSHjqSQsXyciGPccDzhG8lsGUtIyDaFh8fQLUZ64YDXp%2Fe3W9%2B21%2Fd%2F12f7h%2BmLMEPBocJbEt9UTEjDcaUS4TVD89PIHy1tSstGGqI3JnSxTVjdQd%2F7ehqBHEkceWqSO5BFvMW4qMXEocQ0SFUjc%2Bdyyu9S9QSwECFAAKAAAACACDcJVINNFKrpUGAAAoEgAACQAAAAAAAAAAAAAAAAAAAAAAbGF5ZXIud2t0UEsFBgAAAAABAAEANwAAALwGAAAAAA%3D%3D"
	  var file = [ 'name\twkt',
				  'San Angelo\tPOLYGON ((12.46580875411837 41.90328698002857, 12.465862398298668 41.90273599985224, 12.465717559011864 41.90269607356777, 12.465690736921715 41.902644169360606, 12.465733652265953 41.902572301927215, 12.46579802528231 41.9025283829003, 12.465878491552758 41.90252039761944, 12.465964322241234 41.902544353459035, 12.465996508749413 41.90264816199344, 12.466752891691613 41.902672117785094, 12.46680653587191 41.902584279838386, 12.466854815634179 41.90258028720158, 12.466956739576744 41.902584279838386, 12.467015748175072 41.902644169360606, 12.467010383757042 41.90270805145573, 12.466972832830834 41.90275995561095, 12.466881637724327 41.902779918736336, 12.466849451216149 41.90333888371318, 12.467005019339013 41.9033708244212, 12.467090850027489 41.90345067612134, 12.46704793468325 41.903558475758146, 12.466962103994774 41.9036223569385, 12.46683872238009 41.90365030493481, 12.466699247511315 41.90359440892995, 12.466677789839196 41.90344668353871, 12.465980415495324 41.90342672062179, 12.465910678060936 41.90354649802971, 12.465781932028221 41.90357843863387, 12.465647821577477 41.903550490606115, 12.46557808414309 41.9035025796729, 12.46558344856112 41.903398772527616, 12.465642457159447 41.90330694298918, 12.465642457159447 41.90330694298918, 12.465642457159447 41.90330694298918, 12.46580875411837 41.90328698002857))',
				  'Pantheon\tPOLYGON ((12.476588552149138 41.8990007878608, 12.477006976755462 41.899022748591165, 12.477025752218566 41.89879116232706, 12.477141087206206 41.8986993261622, 12.47718668475946 41.89856157166727, 12.477141087206206 41.8984397884605, 12.477157180460296 41.898274083068486, 12.476580505522094 41.898254118534396, 12.476572458895049 41.89841183818355, 12.476513450296721 41.89847772095963, 12.476489310415587 41.898559575223125, 12.476510768087707 41.898659397353676, 12.476564412268004 41.89873526206852, 12.476612692030272 41.898779183704356, 12.476612692030272 41.898779183704356, 12.476612692030272 41.898779183704356, 12.476588552149138 41.8990007878608))',
				  'San Pietro\tPOLYGON ((12.452753618460804 41.90263216115243, 12.454776004058033 41.90260820534579, 12.454776004058033 41.90273596954407, 12.454969123107105 41.90273197691676, 12.455033496123463 41.901669929182155, 12.454792097312122 41.90166194379395, 12.454776004058033 41.901833629420636, 12.452758982878834 41.90177773182542, 12.452753618460804 41.90263216115243))',
				  'Colosseo\tPOLYGON ((12.491343755023735 41.89061830292838, 12.491628069179313 41.89080599173984, 12.492325443523185 41.89091381272257, 12.492829698817985 41.890794011619434, 12.493387598293083 41.890370712588826, 12.49345733572747 41.89007520028218, 12.493350047366874 41.88977169973343, 12.492990631358879 41.88956803408301, 12.492497104900139 41.88947219119931, 12.491998214023369 41.88955605373042, 12.491628069179313 41.88965988337829, 12.491392034786003 41.88990747647297, 12.49119891573693 41.8903068181519, 12.491279382007377 41.890526455011155, 12.491279382007377 41.890526455011155, 12.491279382007377 41.890526455011155, 12.491343755023735 41.89061830292838))',
				  'Circus\tPOLYGON ((12.482570739349654 41.88715198501236, 12.483364673218063 41.887910764796146, 12.488364310821822 41.885179115397456, 12.487516732773116 41.884156713655514, 12.487516732773116 41.884156713655514, 12.487516732773116 41.884156713655514, 12.482570739349654 41.88715198501236))',
				  'Piazza Navona\tPOLYGON ((12.472963066658195 41.89784196176384, 12.473494144043144 41.89788987694438, 12.473311753830131 41.89981444030761, 12.473209829887566 41.900061994040385, 12.47286114271563 41.90000210209626, 12.472759218773064 41.89993821729394, 12.472727032264885 41.899794476255074, 12.472727032264885 41.899794476255074, 12.472727032264885 41.899794476255074, 12.472963066658195 41.89784196176384))',
				  'Mausoleo\tPOLYGON ((12.475881310066598 41.90648008847429, 12.476999791225808 41.9064022367619, 12.476922007164376 41.90556981636452, 12.475739152988808 41.90568759353077, 12.475739152988808 41.90568759353077, 12.475739152988808 41.90568759353077, 12.475881310066598 41.90648008847429))',
				  'Arco di Constantino\tPOINT (12.49068582638813 41.88976784789742)',
				  'Basilica di Massenzio\tPOINT (12.48820455553576 41.892010594721995)',
				  'Foro Romano\tPOLYGON ((12.480721526664723 41.892560680133485, 12.480506949943532 41.89152242321051, 12.480742984336842 41.891059195446665, 12.482502513450612 41.89141060991992, 12.483918719810475 41.89214537938946, 12.485184722465505 41.89145852992555, 12.48404746584319 41.8896694919995, 12.483489566368092 41.88815196519828, 12.488832526725758 41.885260577522295, 12.49031310610198 41.889190276904124, 12.491128497642507 41.8913946365767, 12.489004188102712 41.89280027548829, 12.48705153993987 41.89406212952569, 12.486193233055104 41.89498853813898, 12.486901336235036 41.89610659960469, 12.485485129875173 41.896058683086174, 12.484412246269216 41.89583507219109, 12.482867293876637 41.89561146051311, 12.48228793672942 41.895228124386485, 12.48207336000823 41.89367878410001, 12.480721526664723 41.892560680133485))',
				  'Musei Vaticani\tPOLYGON ((12.451893928642875 41.90593995327049, 12.455670478935843 41.90647493622684, 12.455423715706473 41.90734527205434, 12.45176518261016 41.90641904269485, 12.451893928642875 41.90593995327049))',
				].join('\n');

	  var zip = new JSZip();
	  zip.file("layer.wkt", file);
	  var content = zip.generate({type : "base64" , compression: "DEFLATE", compressionOptions : {level:6} });
	  
	  cle.uploadLayer( layerIdElement.value, content, true, onUpload );
	}
	
	function changeenv(that) {
	  
	  var env = that.id;
	  // document.getElementById('environment').value = document.getElementById('environment').value.replace('cle', env);
	  // document.getElementById('environment').value = document.getElementById('environment').value.replace('pde', env);
		
	  if(env==='pde'){
		document.getElementById('pdefields').style.display = 'block'
		document.getElementById('clefields').style.display = 'none'
	  }
		
	  if(env==='cle'){
		document.getElementById('clefields').style.display = 'block'
			  document.getElementById('pdefields').style.display = 'none'
			  document.getElementById('environment').value = "https://fleet.ls.hereapi.com";
	  }
	  var environment = document.getElementById('environment').value;
	  var service = document.getElementById('service').elements['service'].value;
	  cle.setEnvironment(environment, service);
	}
	  
	function envSelect() {
	  var environment = document.getElementById('environment').value;
	  var apikey = document.getElementById('customApiKey').value;
	  
	  var service = document.getElementById('service').elements['service'].value;
		
	  if(service==='' || service=== undefined){
		service = 'CLE';
	  }		
	  cle.setEnvironment( environment, service );     
		
	  if( apikey.length > 0 ) {
		  if( cle.setCredentials( apikey ) ) {
			  logArea.log( 'Credentials updated.' );
		  }
	  }

	  if(service === 'PDE'){
		  cle.setMapLayersEndpoint(environment,service); //first set the newly entered endpoint so that the maps are taken by using the newly entered url.
		  cle.getPDELayers(onGetMapLayers); //reload the PDE layers because with pde.api.here.com url we get only PDE layers and some layers e.g., ARCUIVED_WEATHER layer does not appear if the request goes with cle.api.here.com url
	  }
	}

	var searchGeometry;

	function callCle() {
		  if(currentBubble) {
		ui.removeBubble(currentBubble);
	  }
		  var env = document.getElementById('service').elements['service'].value.toLowerCase();
			
		  var searchClause = document.getElementById('searchclause').value;
	  var options = {
		  layer_ids:	(env==='pde')?document.getElementById('pdelayerId').value:layerIdElement.value,
		  attribute:	(env==='pde')?document.getElementById('keyAttributeName').value:'',
		  filter:		'',
		  geom: 		(document.getElementById('fullGeometry').checked) ? document.getElementById('fullGeometry').value : 'local',
		  region: 'JPN'
		};
	  map.removeObjects(map.getObjects());
		
	  switch( document.getElementById('searchType').value ) {
	  case 'proximity':		
		  searchGeometry = getGeometryBySearchClause( searchClause );
		map.addObject( searchGeometry );
		var radius = document.getElementById('searchRadius').value;
		searchClause += "," + radius;
		cle.searchProximity( options.layer_ids, searchClause, options, onCheckPositionChanged );
		break;
	  case 'all':
		if(this.service==='PDE'){
		  alert('PDE does not support All Search');
		  return;
		}else{
		  searchGeometry = getGeometryBySearchClause( 'all= ' );
		  map.addObject( searchGeometry );
		  cle.searchAll( options.layer_ids, options, onCheckPositionChanged );
		  break;
		}
		  
	  case 'quad_key':
		searchGeometry = getGeometryBySearchClause( searchClause );
		  map.addObject( searchGeometry );
		cle.searchQuadkey( options.layer_ids, searchClause, options, onCheckPositionChanged );          
			  break;
		  case 'bbox':
		searchGeometry = getGeometryBySearchClause( searchClause );
		  map.addObject( searchGeometry );
		cle.searchBbox( options.layer_ids, searchClause, options, onCheckPositionChanged );
		break;
		  case 'corridor':
			  searchGeometry = getGeometryBySearchClause( searchClause );
			  map.addObject( searchGeometry );
			  var radius = document.getElementById('searchRadius').value;
		searchClause += "&radius=" + radius;
			  cle.searchCorridor( options.layer_ids, searchClause, options, onCheckPositionChanged );
			  break;
	  default: 
		alert('Unknown searchtype in call to CLE');
	  }
		
	  map.getViewModel().setLookAtData({
            bounds: searchGeometry.getBoundingBox()
        });
	}
	
	  function getGeometryBySearchClause( searchClause ) {
	  var searchGeometry= null;
	  var splitAtEqual= searchClause.split( /[=&]/ );
	  if( splitAtEqual.length === 1 ) {
		logArea.log( 'Error: Bad Search parameter. It should be like proximity=lat/lon (without radius), corridor=..., quad_key=..., bbox=upperLeftLat,upperLeftLon,lowerRightLat,LowerRightLon .' )
		return null;
	  }
	  
	  var type= document.getElementById( 'searchType' ).value;
	  switch( document.getElementById( 'searchType' ).value ) {
		case 'proximity':
		  var splitAtCommas= splitAtEqual[1].split(',');
		  if( splitAtCommas.length !== 2 ) {
			logArea.log( 'Proximity requires latitude, longitude and radius in meter, e.g. proximity=52.308056,8.623056' );
			break;
		  }
		  var center= new H.geo.Point( splitAtCommas[ 0 ], splitAtCommas[ 1 ] );
		  searchGeometry = new H.map.Circle( center, document.getElementById('searchRadius').value, searchGeometryOptions );
		  break;
				  
		case 'all':
		  searchGeometry = new H.map.Rect( new H.geo.Rect( 89.9, -179.9, -89.9, 179.9 ), searchGeometryOptions );
		  break;
				  
			  case 'radius':
		case 'corridor':
				  var corridorDataIdx= 0;
				  while( corridorDataIdx < splitAtEqual.length && splitAtEqual[ corridorDataIdx ] !== 'corridor' ) {
					  corridorDataIdx++;
				  }
				  if( corridorDataIdx == splitAtEqual.length ) {
					  logArea.log( 'Error: Cannot find corridor data in parameters.' );
					  break;
				  }
				  corridorDataIdx++;
				  var splitAtCommas= splitAtEqual[ corridorDataIdx ].split( /[,;]/ );
				  var latLngAlts=[];
				  for( var k= 0; k < splitAtCommas.length; k+= 2 ) {
					  latLngAlts.push( splitAtCommas[ k ] );
					  latLngAlts.push( splitAtCommas[ k + 1 ] );
					  latLngAlts.push( 0 );
				  }
				  searchGeometry = new H.map.Polyline( new H.geo.LineString( latLngAlts ), searchGeometryOptions );
		  break;

		case 'quad_key':
				var geoRect= quadKey.quadKeyToHGeoRect( splitAtEqual[ 1 ] );
				searchGeometry = new H.map.Rect( geoRect, searchGeometryOptions );
				break;
					  
		case 'bbox':
				  var regex=/[,;]/;
				  var splitAtCommas= splitAtEqual[1].split( regex );
				  if( splitAtCommas.length !== 4 ) {
			logArea.log( 'The bounding box upper, left, lower and right coordinates in WGS84 degrees, e.g. bbox=37.8,-122.1;37.2,-122.0' );
			break;
				  }
				  searchGeometry = new H.map.Rect( new H.geo.Rect( splitAtCommas[0], splitAtCommas[1], splitAtCommas[2], splitAtCommas[3] ), searchGeometryOptions );
		  break;
				  
		default: 
		  logArea.log( 'Error: Bad Search parameter. It should be like proximity=lat/lon (without radius), corridor=..., quad_key=..., bbox=upperLeftLat,upperLeftLon,lowerRightLat,LowerRightLon' );
	  }
	  
	  return searchGeometry;
	}

	function addPolygonToMap(poly, options) {
	  var polygonStrip = new H.geo.LineString();
	  var borderStrips = [new H.geo.LineString()];
	  for (var k = 0; k < poly.length - 1; k++) {
		  polygonStrip.pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
		  borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
		  if (poly[k][2] === 'artificial') {
			  borderStrips.push(new H.geo.LineString());
		  }
	  }
	  // If the polygon was joining in non artificial points.
	  if (k > 0 && !poly[k][2] && !poly[0][2]) {
		borderStrips[borderStrips.length - 1].pushPoint(new H.geo.Point(poly[k][1], poly[k][0]));
	  }

	  var polygon = new H.map.Polygon(polygonStrip, options);
	  map.addObject(polygon);
	  for (var i = 0; i < borderStrips.length; i++) {
		  var borderStrip = borderStrips[i];
		  if (borderStrip.getPointCount() <= 1) continue;
		  map.addObject(new H.map.Polyline(borderStrip));
	  }
	  return calculateCentroid(polygonStrip);
	}

	function addPointToMap(point, text) {
		  var marker = new H.map.Marker(new H.geo.Point(point[1], point[0]));
	  marker.$text = JSON.stringify(text, undefined, 4);
		  marker.addEventListener("tap", function(e)
	  {
		if (currentBubble) 
		  ui.removeBubble(currentBubble);
		
		var pos = map.screenToGeo(e.currentPointer.viewportX, e.currentPointer.viewportY);
			
		currentBubble = new H.ui.InfoBubble(pos, {
		  content: "<textarea rows='10' cols='30'>" + e.target.$text + "</textarea>"
		});
		ui.addBubble(currentBubble);
	  });
	  map.addObject(marker);   
	  return [new H.geo.Point(point[1], point[0]), 0];     
	}

	function addLineToMap(line, options) {
	  var lineStrip = new H.geo.LineString();
	  for (var k = 0; k < line.length; k++) {
		// Found an element  "artifical" which causes an error
		// added the check to avoid error when parsing such elements
		if(line[k] instanceof Array) {
		  lineStrip.pushPoint(new H.geo.Point(line[k][1], line[k][0]));
		}
	  }
	  map.addObject(new H.map.Polyline(lineStrip));   
	  return calculateCentroid(lineStrip);   
	}

	function onUpload( url, resp, err ) {
	  logArea.log( "Request:" );
	  logArea.log( url );
	  logArea.delim();
	  if (err) {
		  logArea.log( 'ERROR!: '+ resp.issues[0].message + '['+resp.error_id+']' );
	  } else {
		  logArea.log( 'Success: '+ resp );
	  }
	}

	function onCheckPositionChanged( url, resp, err ) {
	  logArea.log( "Request:" );
	  logArea.log( url );
	  logArea.delim();
	  
	  if (err) {
		logArea.log('ERROR!: '+ resp.issues[0].message + '['+resp.error_id+']');
		logArea.strongDelim();
		return;
	  }

	  var geometryResponse = null;
	  if (resp.polygons != null) {
		  geometryResponse = resp.polygons
	  } else {
		  geometryResponse = resp.geometries;
	  }
		
	  if(geometryResponse!=null && (geometryResponse.length<200 || confirm('There are too many geometries ('+ geometryResponse.length +') to be rendered on the map. Are you sure?'))){
		var centroids = [];
		for (var i = 0; i < geometryResponse.length; i++) {
		  var rawGeom = geometryResponse[i];
		  var geom = parseWKT(rawGeom.geometry);
		  var dist = rawGeom.distance;
		
		  centroids[i] = [];
		  switch ( geom.type ) {
		  
			case 'MultiPolygon':
			  for (var j = 0; j < geom.coordinates.length; j++) {
				for (var k = 0; k < geom.coordinates[j].length; k++) {
				var style;
				if (dist === -99999999) {
				  style = boundingCircleInsidePolygonOptions;
				} else if (dist < 0) {
				  style = assetInsidePolygonOptions;
				} else {
				  style = boundingCircleIntersectsPolygonOptions;
				}
				centroids[i].push(addPolygonToMap(geom.coordinates[j][k], style));
				}
			  }
			  break;
			  
			case 'MultiPoint':
			  for (var j = 0; j < geom.coordinates.length; j++) {
				var pp;
				if (rawGeom.attributes.DISPLAY_LAT) {
				  pp = [+rawGeom.attributes.DISPLAY_LON / 100000, +rawGeom.attributes.DISPLAY_LAT / 100000];
				} else {
				  pp = geom.coordinates[j][0];
				}
				centroids[i].push(addPointToMap(pp, rawGeom), boundingCircleIntersectsPolygonOptions);
			  }
			  break;
			  
			case 'MultiLineString':
			  for (var j = 0; j < geom.coordinates.length; j++) {
			  centroids[i].push(addLineToMap(geom.coordinates[j]), boundingCircleIntersectsPolygonOptions);
			  }
			  break;
			  
			case 'Polygon':
			  for (var k = 0; k < geom.coordinates.length; k++) {
			  var style;
			  if (dist === -99999999) {
				style = boundingCircleInsidePolygonOptions;
			  } else if (dist < 0) {
				style = assetInsidePolygonOptions;
			  } else {
				style = boundingCircleIntersectsPolygonOptions;
			  }
			  centroids[i].push(addPolygonToMap(geom.coordinates[k], style));
			  }
			  break;
			  
			case 'Point':
			  var pp;
			  if (rawGeom.attributes.DISPLAY_LAT) {
				pp = [+rawGeom.attributes.DISPLAY_LON / 100000, +rawGeom.attributes.DISPLAY_LAT / 100000];
			  } else {
				pp = geom.coordinates;
			  }
			  centroids[i].push(addPointToMap(pp, rawGeom), boundingCircleIntersectsPolygonOptions);
			  break;
			  
			case 'LineString':
			  centroids[i].push(addLineToMap(geom.coordinates), boundingCircleIntersectsPolygonOptions);
			  break;            
			  
			default:
			  window.alert( "Cannot draw matching geometry for type " + geom.type );
		  }
		}

		logArea.log(geometryResponse.length + ' matches: ');
		// Draw geometry captions then so they are over.
		for (var i = 0; i < geometryResponse.length; i++) {
		var label = "";

		var keys= Object.keys( geometryResponse[i].attributes );
		if(document.getElementById('service').elements['service'].value == 'CLE'){
		  for(var j = 0; j < keys.length; j++) {
		  if( typeof geometryResponse[i].attributes[ keys[ j ] ] !== "undefined" )
			label = label + geometryResponse[i].attributes[ keys[ j ] ] + ' ';
		  else
			logArea.log( "WARNING: Attribute " + labels[j] + " doesn't exist!" );
		  }
		}else if(document.getElementById('service').elements['service'].value == 'PDE'){
		  label =  geometryResponse[i].attributes[document.getElementById('labelfield').value];
		}
		
		if( label === null )
		  label= "<no attribute>";
		addGeometryCaption(calculateWeightedCentroid(centroids[i]), label);
		logArea.log( label + '(' + centroids[i][0][0].lat + ',' + centroids[i][0][0].lng + ')' );
		}
		
		logArea.strongDelim();
		// Keep the search area on top.
		map.removeObject( searchGeometry );
		map.addObject( searchGeometry );
		} // end if      
	}

	function addGeometryCaption(p, caption) {
	  if(caption != null)
	  {
		var markerElement = document.createElement('div');
		markerElement.className = 'caption';
		markerElement.innerHTML = caption;
		map.addObject(new H.map.DomMarker(p, {
		  icon: new H.map.DomIcon(markerElement)
		}));
	  }
	}

	function addLineToNearestPoint(assetPosition, fenceLat, fenceLon, distance) {
	  if (distance === -99999999) {
		// Cannot draw because distance is not available.
		return;
	  }
	  var strip = new H.geo.LineString();
	  strip.pushPoint(assetPosition);
	  strip.pushPoint({lat: fenceLat, lng: fenceLon});
	  map.addObject(new H.map.Polyline(strip, distanceOptions));
	  var markerElement = document.createElement('div');
	  markerElement.className = 'distance';
	  markerElement.innerHTML = distance;
	  map.addObject(new H.map.DomMarker({
		lat: (assetPosition.lat + fenceLat) / 2,
		lng: (assetPosition.lng + fenceLon) / 2
	  }, {icon: new H.map.DomIcon(markerElement)}));
	}

	function getLabelAttributes() {
		return document.getElementById('labelAttributes').value;
	}