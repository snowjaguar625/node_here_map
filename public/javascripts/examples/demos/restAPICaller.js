var url;
var type;
var contentType;
var processData;
var method;

RestAPICaller = function(service, resource){

    url = ((document.getElementById("endpointUrl") &&document.getElementById("endpointUrl").value) ? document.getElementById("endpointUrl").value : (restHelper[service].hostname) )+ (restHelper[service].resources[resource].path);
    type = restHelper[service].resources[resource].method;
    contentType = (restHelper[service].resources[resource].method=='POST')? false :'application/json';
    processData = (restHelper[service].resources[resource].method=='POST')? false : true;
    method =  restHelper[service].resources[resource].method;

   return this; 
}


var restHelper = {
    CLE: {
        hostname: 'https://cle.api.here.com',
        resources: {
            searchAll: {
                path: '/2/search/all.json',
                method: 'GET'
            },
            upload: {
                path: '/2/layers/upload.json',
                method: 'POST'
            }
        }
    },
    CRE: {
        hostname: "https://cre.api.here.com",
        resources: {
            calculateRoute: {
                path: '/2/calculateroute.json',
                method: 'GET'
            }
        }
    },
    RME: {
        hostname: "https://rme.api.here.com",
        resources: {
            calculateRoute: {
                path: '/2/calculateroute.json',
                method: 'GET'
            }
        }
    },
    CRE_MULTIVEHICLE: {
        hostname: "https://cle.api.here.com", // "http://localhost:8080/cle",
        resources: {
            calculateroutemultivehicle: {
                path: '/2/calculateroutemultivehicle.json',
                method: 'POST'
            }
        }
    }
};	


RestAPICaller.prototype.callService = function(data, params, callbackOnSuccess, callbackOnFailure) {
    feedbackTxt.innerHTML = ""; //clearing the any error message from the previous request before sending the new request
    var custom_app_id = getUrlParameter('app_id');
    var custom_app_code = getUrlParameter('app_code');
    if (custom_app_id !== null && custom_app_code !== null) {
        app_id = custom_app_id;
        app_code = custom_app_code;
    }
        url += "?app_id="   + app_id;
        url += "&app_code=" + app_code;

    url += params;    
    $.ajax({
        url: url,
        dataType: "json",
        async: true,
        type: type,
        data: data,
        contentType: contentType,
        processData: processData,
        method: method,
        success: function(data){
                callbackOnSuccess(data);
            },

        error: function(xhr) {
             callbackOnFailure(xhr);
        }
    });
};