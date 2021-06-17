/*
* Set authentication app_id and app_code
* WARNING: this is a demo-only key
* please register on https://developer.here.com/
* and obtain your own API key
*
* author 
* (C) HERE 2015
*/

var what3wordsApi = "MMFFK8O1",
	center = {lat: 50.13, lng: 8.54},
	zoom = 10;

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

function getUrlParameter(param)
	{
		var pageURL = window.location.search.substring(1),
			urlVariables = pageURL.split('&');

		for (var i = 0; i < urlVariables.length; i++){

			var parameterName = urlVariables[i].split('=');
			if (parameterName[0] == param){
				return parameterName[1];
			}
		}
		return null;
	}


// Show this spinner while doing time consuming tasks. Must include defaults.css to work.
var Spinner = (function () {
	return {
		hideSpinner: function()
		{
			document.getElementById('spinner').style.display = 'none';
			document.getElementById("pageblock").style.display = "none";
		},

		showSpinner: function()
		{
			spinnerImg = "<img src='/assets/loading.gif' alt='spinner'>";

			var w = window,
			d = document,
			e = d.documentElement,
			g = d.getElementsByTagName('body')[0],
			x = w.innerWidth || e.clientWidth || g.clientWidth,
			y = w.innerHeight|| e.clientHeight|| g.clientHeight;

			var spinner = document.getElementById('spinner');
			var pageblock = document.getElementById('pageblock');

			if (spinner === null || pageblock === null)
				throw new Error("Did you forget to add HTML tags for spinner and pageblock?");

			spinner.style.display = "block";
			spinner.style.zIndex = "5";
			spinner.style.left = x/2 + "px";
			spinner.style.top = y/2 + "px";
			spinner.innerHTML = spinnerImg;

			pageblock.style.display = "block";
			pageblock.style.zIndex = "3";
		}
	};
})();

$( document ).ready(function() {
	
	if(document.getElementById("toggle-ctrl-panel")){
		//hide default footer in exampels
	document.getElementById("footer").style.display="none";
	}
	
	//  Show/hide control panel on examples pages
	$('#toggle-ctrl-panel').click(function(){
		var noteContainer = $('.ctrl-panel')[0];
		var width = $('.ctrl-panel').width();

		if (noteContainer.style.left == '' || noteContainer.style.left == '0px') {
			noteContainer.style.left = '-' + (width - 30) + "px";
			$('#toggle-ctrl-panel').removeClass('glyphicon-menu-left').addClass('glyphicon-menu-right');
		} else {
			noteContainer.style.left = '0px';
			$('#toggle-ctrl-panel').removeClass('glyphicon-menu-right').addClass('glyphicon-menu-left');
		}
	});

	//  Bootstrap style file picker
	$('.btn-file :file').on('fileselect', function(event, numFiles, label) {
		var input = $(this).parents('.input-group').find(':text'),
		log = numFiles > 1 ? numFiles + ' files selected' : label;

		if( input.length ) {
			input.val(log);
		} else {
			if(log) console.log(log);
		}
	});

	$(document).on('change', '.btn-file :file', function() {
		var input = $(this),
		numFiles = input.get(0).files ? input.get(0).files.length : 1,
		label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
			input.trigger('fileselect', [numFiles, label]);
	});

});


/*
Use this marker if a SVG with Base64 encoded image is required
*/
var svgMarkerImage_Line='<svg width="__widthAll__" height="60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<g>' +
	'<rect id="label-box" ry="3" rx="3" stroke="#000000" height="30" width="__width__" y="11" x="45" fill="#ffffff"/>'+
	'<text id="label-text" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="10" font-weight="bold" y="24" x="55" stroke-width="0" fill="#000000">__line1__</text>' +
	'<text id="label-desc" xml:space="preserve" text-anchor="start" font-family="Sans-serif" font-size="8" y="36" x="55" stroke-width="0" fill="#000000">__line2__</text>'+
	'<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
	'</g>'+
	'</svg>';
var svgMarkerBase64Image='<svg width="__widthAll__" height="60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<g>' +
	'<image width="50" height="50" x="8.5" y="9.5" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
	'</g>'+
	'</svg>';

var svgMarkerImageTransit='<svg width="__widthAll__" height="60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<g>' +
	'<image width="45" height="45" x="8.5" y="9.5" xlink:href="data:image/png;base64,R0lGODlhfQDCAPQdAAELHgEMHgIMHw8LHRALHR8KGyAKGxEbLCEqOzE5SUBIVkFIV2Fnc3B1gHF2gYCFjoCFj4+UnJCVnZ+jqqCkq6+yuLCzuc/R1NDS1d/g4uDh4+/v8PDw8f///wAAAAAAACH5BAEAAB4ALAAAAAB9AMIAAAX+oCeOJCmcaKqubOu+cCyvZW2XxKzvfO+vhNvN8Csaj0eD0IRsOp+vpQdKrUKF1qy2aNt6v7MSEUwup5Qjs9o8yq3f3uAUTteK6vjqPc9v7vuAP3OBhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnCkICwoMEA4KCwidWgsSGB2trq+uFxEKqEcHHhUcsLu8HRsTHge1OwgTvcfIE6fDLwcQyNDIEMLMKs4b0dm9G9PVJwkZ2uK9GQnVDOPpvQzDEervuxGdBxXw9q8V1JgHF/f+rRf0VeL3r2DAS/UKFqxgSYLChxIooXv4kF2kBBQzmnt0IFzGhxkELnr2kSIERwf+sJV8uEEkIpIrH55chCDmx2WJKNjMSEHRgZ0fXQaaCLRiIgtFKfZEpDJpwQ2IFjiluOCQw6kKIxrqh9Xgoa4Pv4ItaKjm2H84AUk9668qobVs7bkNBDPuOweF6tpNN5PuXnh43/59N1ftYHWF+2A8PC4tIMbjxELOdojVZGgYrF6GprUQ3M28EgfSBXoXh6Oldy09RDR1K4uHfrp2JTSQztmrEZl17fiQ3st9fZLezKG2od+Mgy86oGGzhoubN0JqPRh2pKuDO09C+tfCpQOW42IwzjH82PGaDnAHa4H8JOxTtXOiDtQ6qgTNgWqQzszZ8I8cKOeNMyV14w0LCNz+VhAFvR1oDQMU/CcOBxQw4J6DKqhi3jGyiIZhD58s4MAoC5jy4Ykopqjiiiy26OKLMMYo44w01mgjIIPcqMMfOoaRY48x8AgkDCIMMGQMA6RxZBQjFLBkCwWU8CQLXUyJAhZWShEJAAIE0GUAYIYp5phenkAmmCpw2YIUIjjZiJpbwKlClGyOYOQiclYBQJ4nJFknloXwCcWeKfxp6KGIJiplFn4q6uijkNagRaORVmrpoYxeqummS2TK6aeg/ugEpaGWGqkVpJqqaqJjXLHqq47qAeush7bqBK24/klFrrwuYSsSvQZb5a3CFiuCG34Ya+wTyhqL7BHNLptstMHTEktttcBeiy202m7LRbe9Zgsur9yOm2u55uJqRLrkfsuuuoK8C68P8uL664710upDqvmaei+S/erLA78Bh/qsDAQXDOrACsN6MAwJN8zpDhFLrOnDLlRs8aX4bqxqxx6b6mPIIstA8qomn1wykSqv7ELLLq8Jc6ksz7wwkzbfLHPOn+LM86b/nvCzzjQMzWnQRvdMZdKbYsz0xEU/fenDUm8addWVHoy1pipszTEKGnuta59iWwp22WYLEDbaWqrNdqVuvw1p3HI/unbdeOetN6whAAA7" />'+
	'</g>'+
	'</svg>';
	
var svgMarkerPublicTransit = '<svg  width="20" height="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
	'<image width="20" height="20" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBmaWxsPSJibGFja19ibHVlIiBkPSJNNC42ODkgOWgtLjcyVjUuMTgyYzAtLjUuNjc4LTEuMjI5IDEuMTgtMS4yMjlsMi40ODgtLjAxNWMuMzU5LTEuMDQ1Ljc0My0xLjI4IDIuMTM2LTEuMjhoMi4zNTFDMTEuODA5IDIuMTE2IDExLjE1MyAyIDEwLjQ4NSAySDUuMDI5Yy0xIDAtMi4wMTcuODE0LTIuMDE3IDEuODE1di45NzhsLS4yNDUuMDZjLS4yNSAwLS43MDUuMjA0LS43MDUuNDU0djEuMTk0YzAgLjI1MS40MDMuNDAzLjY1My40MDNsLjI5Ny4wNjF2NC45NDRjMCAuNjIzLjYxLjU2MyAxLjAxOS43MTN2Ljk5MmMwIC4yNS4zNTYuMzU1LjM1Ni4zNTVoLjk2OWEuNDU1LjQ1NSAwIDAgMCAuNDU0LS40NTV2LS41MzdIN1Y5SDQuNjg5em0uODE5IDIuMjg3YS43OS43OSAwIDEgMS0uMDAyLTEuNTguNzkuNzkgMCAwIDEgLjAwMiAxLjU4eiIvPjxwYXRoIGQ9Ik0xNS45NjkgMTd2LS45OTdoLS45MDdWMTdoLTQuMDkzdi0uOTk3SDEwVjE3aC0uOTg3di45MjZoNy45NTZWMTd6bS4yNjctMTIuOTc5aC02LjE4Yy0uOTY3IDAtMi4wMjcgMS4wNTEtMi4wMjcgMi4wMTl2Ny42MTRjMCAuNzI2Ljc3MSAxLjMyIDEuNDk3IDEuMzJoNy4wNDJjLjcyNSAwIDEuNDE0LS41OTUgMS40MTQtMS4zMlY2LjA0YzAtLjk2OC0uNzc3LTIuMDE5LTEuNzQ2LTIuMDE5ek0xMC4wMSA1LjMyM2MwLS4xODMuMTAxLS4zMzEuMjIyLS4zMzFoNS41Yy4xMTkgMCAuMjIuMTc0LjIyLjM1NXYuMzQ4YzAgLjE4MS0uMTAxLjMyOS0uMjIuMzI5aC01LjVjLS4xMjEgMC0uMjIyLS4xNDgtLjIyMi0uMzI5di0uMzcyem0tLjQ5MSA3Ljk4OGEuODA1LjgwNSAwIDAgMS0uODA0LS44MDIuODA1LjgwNSAwIDAgMSAxLjYwOCAwIC44MDMuODAzIDAgMCAxLS44MDQuODAyem02Ljk3OSAwYS44MDUuODA1IDAgMCAxLS44MDQtLjgwMi44MDUuODA1IDAgMCAxIDEuNjA4IDAgLjgwMi44MDIgMCAwIDEtLjgwNC44MDJ6bS41MTUtMi4yNzZIOC45NjV2LTQuMDRoOC4wNDh2NC4wNHoiIGZpbGw9ImJsYWNrX2JsdWUiLz48L3N2Zz4=" />'+
	'</svg>';

function inherits(B, A) {
	function I() {}
	I.prototype = A.prototype;
	B.prototype = new I();
	B.prototype.constructor = B;
}




function rotateMap(map,heading){
	map.getViewModel().setLookAtData({
               heading: heading
     });
}

