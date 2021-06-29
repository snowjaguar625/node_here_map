const app = require("../app");

var loginVerifyMiddleware = function(req, res, next) {
  var page_url = req.originalUrl;
  var c_hideLogOut = 'false';
  res.locals.hideLogOut = c_hideLogOut;
  var c_root_url = '/';
  // res.cookie('root_url', c_root_url);
  res.locals.root_url = c_root_url;
  var checkCookie = false;
  var sessionCookie;
  // req.app.set('env', 'production');
  var c_environment = req.app.get("env");
  // res.cookie('environment', c_environment);
  res.locals.env = c_environment ? c_environment : '';
  var useragent = req.header('User-Agent');
  
  if(req.app.get('env') == 'development'){
    // # un-comment the following to enable login in dev
    // checkCookie = true;
    sessionCookie = req.cookies.here_auth_st;
  }
  else{
    checkCookie = true;
    sessionCookie = req.cookies.here_auth;
  }
 
  if(page_url == c_root_url || page_url.includes('technical_support') || page_url.includes("getlatestrelease") || page_url.includes('rest/extract') || (page_url.includes('app_id') && page_url.includes('app_code'))){
    checkCookie = false;
  }
  if(useragent){ 
    if (useragent.includes('Microsoft Office') || useragent.includes('ms-office')){
      checkCookie = false;
    }
  }

  var c_original_url = c_root_url;
  // res.cookie('original_url', c_original_url);
  res.locals.original_url = c_original_url ? c_original_url : '';
  if(checkCookie){ //will check
    if(sessionCookie == null || sessionCookie == ""){ //unauthenticate
      if(page_url.includes('login')){
        c_original_url = req.session.original_url;
        // res.cookie('original_url', c_original_url);
        res.locals.original_url = c_original_url ? c_original_url : '';
        if(c_original_url && c_original_url.includes('login')){
          req.session.original_url = c_root_url;
          res.redirect(c_root_url);
        }
      }
      else{
        req.session.original_url = page_url;
        c_hideLogOut = "true";
        // res.cookie('hideLogOut', c_hideLogOut);
        res.locals.hideLogOut = c_hideLogOut ? c_hideLogOut : '';
        res.redirect('/login');
      }
    }
    else if(page_url.includes('login')){//authenticate, url:login
      req.session.original_url = c_root_url;
      res.redirect(c_root_url);
    }
    else{ //authenticated, url: not login

    }
  }
  else{ //will not check
    c_hideLogOut = "true";
    // res.cookie('hideLogOut', c_hideLogOut);
    res.locals.hideLogOut = c_hideLogOut ? c_hideLogOut : '' ;
  }
  next();
};

module.exports = loginVerifyMiddleware;
