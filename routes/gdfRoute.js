var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('gdf/index', { title: 'GDF Viewer' });
});

module.exports = router;