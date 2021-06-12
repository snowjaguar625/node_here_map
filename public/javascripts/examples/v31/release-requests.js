/*
author 
(C) HERE 2015
*/

var geocoderVersion;
var MRSVersion;
var MIAVersion;


//retrieve the Geocoder release number
function loadGeocoderVersionTxt(h) {
	var host = h || "geocoder.api.here.com";

	function createCORSGeocoderRequest(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			xhr = null;
		}
		return xhr;
	}

	var requestGeocoder = createCORSGeocoderRequest("get", "https://" + host + "/6.2/version.txt");

	if (requestGeocoder) {
		requestGeocoder.onload = function() {
			rows4GV = requestGeocoder.responseText.split(/\n/);
			versioNo4GV = rows4GV[0].split(":");
			//alert("Geocoder: " +versioNo4GV[2])
			geocoderVersion = "<br />Geocoder: " + versioNo4GV[2];
			releaseInfoTxt.innerHTML += geocoderVersion;

		};

		requestGeocoder.send();

	}
}

//retrieve the MRS release number
function loadMRSVersionTxt(h) {
	var host = h || "1.base.maps.api.here.com";

	function createCORSMRSRequest(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			xhr = null;
		}
		return xhr;
	}

	var requestMRS = createCORSMRSRequest("get", "https://" + host + "/maptile/2.1/version?app_id=" +
		app_id + "&app_code=" + app_code);

	if (requestMRS) {
		requestMRS.onload = function() {
			rows = requestMRS.responseText.split(/\n/);
			//alert(rows[0])
			MRSVersion = "<br />" + rows[0];
			releaseInfoTxt.innerHTML += MRSVersion;

		};

		requestMRS.send();

	}
}

function loadMIAVersionTxt(h) {
	var host = h || "image.maps.api.here.com";

	function createCORSMIARequest(method, url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			xhr.open(method, url, true);
		} else if (typeof XDomainRequest != "undefined") {
			xhr = new XDomainRequest();
			xhr.open(method, url);
		} else {
			xhr = null;
		}
		return xhr;
	}

	var requestMIA = createCORSMIARequest("get", "https://" + host + "/mia/1.6/version?app_id=" +
		app_id + "&app_code=" + app_code);

	if (requestMIA) {
		requestMIA.onload = function() {
			rows = requestMIA.responseText.split(/\n/);
			//alert(rows[0])
			MIAVersion = "<br />" + rows[0];
			releaseInfoTxt.innerHTML += MIAVersion;

		};

		requestMIA.send();

	}
}