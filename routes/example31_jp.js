const fs = require('fs');
const path = require('path');
const pug = require('pug');

var express = require('express');
var router = express.Router();

let rawdexamplesv31_jp = fs.readFileSync(path.resolve(__dirname, '../config/tcs_examples31_jp.json'));
let examples31_jp = JSON.parse(rawdexamplesv31_jp);
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('examples/index31_jp.pug', { title: 'TCS examples (Japan)', examples31_jp: examples31_jp });
});

router.get('/simple_geocoding_jp', function(req, res, next) {
    res.render('examples/v31_jp/simple_geocoding_jp', { title: 'Simple Geocoding' });
});
//server error
router.get('/custom_routing_basic_jp', function(req, res, next) {
    res.render('examples/v31_jp/custom_routing_basic_jp', { title: 'Custom Routing Basic Demo' });
});

router.get('/fleet_telematics_api_jp', function(req, res, next) {
  res.render('examples/v31_jp/fleet_telematics_api_jp', { title: 'Fleet Telematics API' });
});

router.get('/demo_matrix_routing_jp', function(req, res, next) {
  res.render('examples/v31_jp/demo_matrix_routing_jp', { title: 'シンプルなマトリックスルーティング' });
});

router.get('/gfe_draw_upload_layer_jp', function(req, res, next) {
  res.render('examples/v31_jp/gfe_draw_upload_layer_jp', { title: 'Draw and Upload Geo Fencing Layer Demo' });
});

router.get('/gfe_check_asset_position_jp', function(req, res, next) {
  res.render('examples/v31_jp/gfe_check_asset_position_jp', { title: 'GFE Geofencing Demo: Asset in Fence?' });
});
//server error
router.get('/gfe_upload_layer_jp', function(req, res, next) {
  res.render('examples/v31_jp/gfe_upload_layer_jp', { title: 'GFE: Isoline uploading and checking asset position' });
});

router.get('/link_speed_locator_jp', function(req, res, next) {
  res.render('examples/v31_jp/link_speed_locator_jp', { title: 'Speed Limits using Geocoder + PDE' });
});

router.get('/pde_get_any_link_info_jp', function(req, res, next) {
  res.render('examples/v31_jp/pde_get_any_link_info_jp', { title: 'PDE Get(Any)LinkInfo' });
});

router.get('/pde_height_information_along_route_jp', function(req, res, next) {
  res.render('examples/v31_jp/pde_height_information_along_route_jp', { title: 'PDE: Height information along the route' });
});

router.get('/pde_speed_limits_along_route_jp', function(req, res, next) {
  res.render('examples/v31_jp/pde_speed_limits_along_route_jp', { title: 'Advanced Datasets：ルートに沿った制限速度' });
});

router.get('/pde_traffic_signs_jp', function(req, res, next) {
  res.render('examples/v31_jp/pde_traffic_signs_jp', { title: 'Advanced Datasets: Display Traffic Signs along Route' });
});

router.get('/rme_basic_jp', function(req, res, next) {
  res.render('examples/v31_jp/rme_basic_jp', { title: 'RME Basic Demo' });
});
//server error
router.get('/rme_pde_rgc_jp', function(req, res, next) {
  res.render('examples/v31_jp/rme_pde_rgc_jp', { title: 'RME with Attributes and Reverse Geocoding' });
});

router.get('/rme_trip_anomalies_detection_jp', function(req, res, next) {
  res.render('examples/v31_jp/rme_trip_anomalies_detection_jp', { title: 'RME Trip Anomalies Detection' });
});

router.get('/rme_with_pde_attributes_jp', function(req, res, next) {
  res.render('examples/v31_jp/rme_with_pde_attributes_jp', { title: 'RME with PDE/CLE attributes' });
});

router.get('/simple_map_jp', function(req, res, next) {
  res.render('examples/v31_jp/simple_map_jp', { title: 'Japan HERE Map' });
});

router.get('/speed_limits_along_gps_trace_jp', function(req, res, next) {
  res.render('examples/v31_jp/speed_limits_along_gps_trace_jp', { title: 'Road Matching Demo & speed limit along the route' });
});

router.get('/waypoint_sequence_extension_jp', function(req, res, next) {
  res.render('examples/v31_jp/waypoint_sequence_extension_jp', { title: 'ウェイポイントシーケンス拡張' });
});

router.get('/rme_stop_sign_violation_jp', function(req, res, next) {
  res.render('examples/v31_jp/rme_stop_sign_violation_jp', { title: 'RME STOP Sign Violation' });
});


module.exports = router;