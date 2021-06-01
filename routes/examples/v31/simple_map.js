const fs = require('fs');
const path = require('path');

var express = require('express');
var router = express.Router();

let rawMapDefault = fs.readFileSync(path.resolve(__dirname, '../../../config/map_default.json'));
let mapDefault = JSON.parse(rawMapDefault);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('examples/v31/simple_map', { title: 'Simple HERE Map Display', center:  mapDefault.center, zoom: mapDefault.zoom });
});

module.exports = router;