const fs = require('fs');
const path = require('path');
const pug = require('pug');

var express = require('express');
var router = express.Router();

let mobileSDKexamples = fs.readFileSync(path.resolve(__dirname, '../config/sdk_examples.json'));
let examples = JSON.parse(mobileSDKexamples);
/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('examples/mobileSDKRoute', { title: 'Mobile SDK examples', examples: examples });
});

module.exports = router;
