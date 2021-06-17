var loginVerifyMiddleware = function(req, res, next) {
    var page_url = req.originalUrl;
    var checkCookie = false;
    var hideLogOut = "false";
    var useragent = req.header('user-agent');
    var environment = "production";
    res.cookie("env", "prod");
    var sessionCookie;
    var root_url = "/";
    var original_url = '';
  
    if(req.app.get('env') == "production"){
      checkCookie = true;
      sessionCookie = req.cookies.here_auth;
    }else{
      checkCookie = true;
      environment = "development";
      res.cookie("env", "dev");
      sessionCookie = req.cookies.here_auth_st;
    }
  
    if(page_url == root_url || page_url.includes("technical_support") || page_url.includes("getlatestrelease") || page_url.includes("rest/extract") || page_url.includes("app_id") || page_url.includes("app_code"))
      checkCookie = false;
    
    if(useragent == null){
      if(useragent.includes("Microsoft Office") || useragent.includes("ms-office")){
        checkCookie = false;
      }
    }
  
    original_url = root_url;
    res.cookie("original_url", root_url);
    if(checkCookie){
      if(sessionCookie == null || sessionCookie == ""){
        if(page_url.includes("login")){
          original_url = req.session.original_url;
          res.cookie("original_url", original_url);
          if(original_url != null && original_url.includes("login")){
            req.session.original_url = root_url;
            res.redirect(root_url);
          }
        }else{
          req.session.original_url = page_url;
          res.redirect("/login");
          hideLogOut = "true";
          res.cookie("hideLogOut", "true");
        }
      }else if(page_url.includes("login")){
        req.session.original_url = root_url;
        res.redirect(root_url);
      }
    }else{
      hideLogOut = "true";
      res.cookie("hideLogOut", "true");
    }
    next();
};

module.exports = loginVerifyMiddleware;
