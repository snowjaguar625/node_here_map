const fs = require('fs');
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.redirect("maptools/distributions");
});

router.get('/distributions', function(req, res, next) {
    var payload = {
        maptools_version: [],
        maptools_version_ci: [],
        maptools_version_docs: [],
        maptools_version_installer: [],
        maptools_version_clipper: []
        
    };
    payload.maptools_version = fs.readdirSync('public/maptools/distributions').sort().reverse();
    payload.maptools_version_ci = fs.readdirSync('public/maptools/ci').sort().reverse();
    payload.maptools_version_docs = fs.readdirSync('public/maptools/docs').sort().reverse();
    payload.maptools_version_installer = fs.readdirSync('public/maptools/rdfinstaller').sort().reverse();
    payload.maptools_version_clipper = fs.readdirSync('public/maptools/rdfclipper').sort().reverse();
    res.render('maptools/index', { title: 'Map Tools', payload: payload});
});

module.exports = router;