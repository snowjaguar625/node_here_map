
var express = require('express');
var router = express.Router();
const superagent = require('superagent');

router.get('/', function(req, res, next) {
  res.render('pde/index', { title: 'Platform Data Extension'});
});

router.get('/:id', async function(req, res, next) {
    var id = req.params.id;
    var req_url = 'doc/' + id + '.json';

    var uri = "http://" + req.query.url_root + "/1/" + req_url;
    console.log(uri)

    var param = {app_id: process.env.app_id, app_code: process.env.app_code};

    if(req.query.hasOwnProperty("region")) param.region = req.query.region;
    if(req.query.hasOwnProperty("release")) param.release = req.query.release;
    if(req.query.hasOwnProperty("content")) param.content = req.query.content;
    if(req.query.hasOwnProperty("layer")) param.layer = req.query.layer;
    if(req.query.hasOwnProperty("detail")) param.detail = req.query.detail;

    superagent.get(uri)
        .query(param)
        .end((err, response) => {
            if (err) { return console.log(err); }
            res.render(`pde/${id}`, { title: 'Platform Data Extension', json: response.body, payload: param, url_root: req.query.url_root});
        });
    // next();
});


module.exports = router;
