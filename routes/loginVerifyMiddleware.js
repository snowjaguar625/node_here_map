const app = require("../app");

var loginVerifyMiddleware = function(req, res, next) {
  // app.locals({localtest: "hahahahhahahahahahahaaha"});
  res.locals.jtest = "ahahahahahahahah";
  console.log("here is middlewareeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
  console.log(req.protocol);
  console.log(req.hostname);
  console.log(req.get('host'));
  console.log(req.originalUrl);
  res.cookie("testcookie", "rcmetestcookievalue");


  console.log(req.app.get("env"))

  var page_url = req.originalUrl;
  var c_hideLogOut = 'false';
  res.locals.hideLogOut = c_hideLogOut;
  var c_root_url = '/';
  // res.cookie('root_url', c_root_url);
  res.locals.root_url = c_root_url;
  var checkCookie = false;
  var sessionCookie;
  var c_environment = req.app.get("env");
  // res.cookie('environment', c_environment);
  res.locals.env = c_environment ? c_environment : '';
  var useragent = req.header('User-Agent');
  
  console.log("env:ppppppppppppppppppppppppppppppppppp");
  console.log(req.app.get('env'));
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
  console.log("tyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
  console.log(checkCookie)
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


  





    // var page_url = req.originalUrl;
    // var checkCookie = false;
    // var hideLogOut = "false";
    // var useragent = req.header('user-agent');
    // var environment = "production";
    // res.cookie("env", "prod");
    // var sessionCookie;
    // var root_url = "/";
    // var original_url = '';
  
    // if(req.app.get('env') == "production"){
    //   checkCookie = true;
    //   sessionCookie = req.cookies.here_auth;
    // }else{
    //   checkCookie = true;
    //   environment = "development";
    //   res.cookie("env", "dev");
    //   sessionCookie = req.cookies.here_auth_st;
    // }
  
    // if(page_url == root_url || page_url.includes("technical_support") || page_url.includes("getlatestrelease") || page_url.includes("rest/extract") || page_url.includes("app_id") || page_url.includes("app_code"))
    //   checkCookie = false;
    
    // if(useragent == null){
    //   if(useragent.includes("Microsoft Office") || useragent.includes("ms-office")){
    //     checkCookie = false;
    //   }
    // }
  
    // original_url = root_url;
    // res.cookie("original_url", root_url);
    // if(checkCookie){
    //   if(sessionCookie == null || sessionCookie == ""){
    //     if(page_url.includes("login")){
    //       original_url = req.session.original_url;
    //       res.cookie("original_url", original_url);
    //       if(original_url != null && original_url.includes("login")){
    //         req.session.original_url = root_url;
    //         res.redirect(root_url);
    //       }
    //     }else{
    //       req.session.original_url = page_url;
    //       res.redirect("/login");
    //       hideLogOut = "true";
    //       res.cookie("hideLogOut", "true");
    //     }
    //   }else if(page_url.includes("login")){
    //     req.session.original_url = root_url;
    //     res.redirect(root_url);
    //   }
    // }else{
    //   hideLogOut = "true";
    //   res.cookie("hideLogOut", "true");
    // }
    // next();
};

module.exports = loginVerifyMiddleware;
