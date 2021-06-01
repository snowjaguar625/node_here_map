const fs = require('fs');
const path = require('path');

var express = require('express');
var router = express.Router();

let rawdexamplesv31 = fs.readFileSync(path.resolve(__dirname, '../config/tcs_examples31.json'));
let examples31 = JSON.parse(rawdexamplesv31);
console.log(examples31);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('examples/index', { title: 'HERE TCS site', examples31: examples31 });
});

module.exports = router;