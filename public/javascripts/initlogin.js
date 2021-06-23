// <%= javascript_tag "initLogin('#{@clientId}','#{@environment}','#{@type}','#{@lang}','#{@screenconfig}','#{root_url}','#{@hideLogOut}');" %> 

// var clientId = getCookie('clientId');
// var environment = getCookie('environment');
// var type = getCookie('type');
// var screenconfig = getCookie('lang');
// var screenconfig = getCookie('screenconfig');
// var root_url = getCookie('root_url');
// var hideLogOut = getCookie('hideLogOut');

console.log("uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu")
console.log("here is client: cookie test field");
console.log(getCookie('testcookie'))
testfunc();

console.log(getCookie('hideLogOut'));
console.log(getCookie('root_url').replaceAll('%2F', '/'));
console.log(getCookie('environment'));
console.log(getCookie('original_url').replaceAll('%2F', '/'));
var original_url = getCookie('original_url').replaceAll('%2F', '/');
console.log(login_clientId)
console.log(getCookie('environment') == 'development' ? login_dev_environment : login_environment)
console.log()
initLogin(login_clientId, getCookie('environment') == 'development' ? login_dev_environment : login_environment, login_type, login_lang, login_screenconfig, getCookie('root_url').replaceAll('%2F', '/'), getCookie('hideLogOut')) ;
// console.log(title);
// $(function(){

//     // console.log("here is client :"  + getCookie('test'));
//     var root_url = "/";
//     var hideLogOut = getCookie('hideLogOut');
//     var environment = getCookie('env') == "prod" ? login_environment : login_dev_environment;
//     var original_url = getCookie('original_url');

//     // initLogin(login_clientId, login_environment, login_type, login_lang, login_screenconfig, root_url, hideLogOut) ;
//     initLogin(login_clientId, environment, login_type, login_lang, login_screenconfig, root_url, hideLogOut) ;

// })

