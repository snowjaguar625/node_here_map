var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("here is login controller: ")
  console.log(req.originalUrl);
  console.log(req.baseUrl);
  res.render('login', { title: 'login'});
});

module.exports = router;
