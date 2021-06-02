const fs = require('fs');
const path = require('path');

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('examples/v31/simple_route', { title: 'Simple HERE Route Display' });
});

module.exports = router;