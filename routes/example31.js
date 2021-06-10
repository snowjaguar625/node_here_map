const fs = require('fs');
const path = require('path');

var express = require('express');
var router = express.Router();

let rawdexamplesv31 = fs.readFileSync(path.resolve(__dirname, '../config/tcs_examples31.json'));
let examples31 = JSON.parse(rawdexamplesv31);
// console.log(examples31);
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('examples/index', { title: 'TCS examples', examples31: examples31 });
});

router.get('/simple_map', function(req, res, next){
  res.render('examples/v31/simple_map', { title: 'Simple HERE Map Display' });
})

router.get('/simple_routing', function(req, res, next) {
  res.render('examples/v31/simple_route', { title: 'Simple HERE Route Display' });
});

router.get('/simple_geocoding', function(req, res, next) {
  res.render('examples/v31/simple_geocoding', { title: 'Simple Geocoding' });
});

router.get('/fleet', function(req, res, next){
  res.render('examples/v31/fleet', { title: 'Here Truck Routing' });
})

router.get('/info_bubbles', function(req, res, next){
  res.render('examples/v31/info_bubbles', { title: 'InfoBubble display' });
})

router.get('/several_markers', function(req, res, next){
  res.render('examples/v31/several_markers', { title: 'Several markers' });
})

router.get('/marker_performance', function(req, res, next){
  res.render('examples/v31/marker_performance', { title: 'Marker Performance' });
})

router.get('/auto_cloud_weather', function(req, res, next){
  res.render('examples/v31/auto_cloud_weather', { title: 'Display for Auto Cloud Weather Service' });
})

router.get('/admin_boundaries', function(req, res, next){
  res.render('examples/v31/admin_boundaries', { title: 'AdminBoundary for Geocoding' });
})

router.get('/admin_boundaries_inverted', function(req, res, next){
  res.render('examples/v31/admin_boundaries_inverted', { title: 'AdminBoundary from Geocoder' });
})

router.get('/mrs_options', function(req, res, next){
  res.render('examples/v31/mrs_options', { title: 'Parameters for MRS tiles' });
})

router.get('/reverse_isoline', function(req, res, next){
  res.render('examples/v31/reverse_isoline', { title: 'Reverse Isoline Routing' });
})
/////////////metainfo
router.get('/slope_along_route', function(req, res, next){
  res.render('examples/v31/slope_along_route', { title: 'PDE: Display slope along route' });
})
///////////metainfo
router.get('/road_types_along_route', function(req, res, next){
  res.render('examples/v31/road_types_along_route', { title: 'PDE: Displays the road types along a Route' });
})

router.get('/speed_limits_along_gps_trace', function(req, res, next){
  res.render('examples/v31/speed_limits_along_gps_trace', { title: 'Road Matching Demo' });
})

router.get('/polygon_shaper', function(req, res, next){
  res.render('examples/v31/polygon_shaper', { title: 'Shaper example' });
})

router.get('/2d_landmarks', function(req, res, next){
  res.render('examples/v31/2d_landmarks', { title: '2D Landmarks' });
})

router.get('/zoom_rectangle', function(req, res, next){
  res.render('examples/v31/zoom_rectangle', { title: 'Zoom Rectangle UI example' });
})

//error as server
router.get('/geocode_addresses', function(req, res, next){
  res.render('examples/v31/geocode_addresses', { title: 'Geocode Addresses' });
})

router.get('/pde_traffic_signs', function(req, res, next){
  res.render('examples/v31/pde_traffic_signs', { title: 'PDE: Display Traffic Signs along Route' });
})
/////////metainfo
router.get('/pde_speed_limits_along_route', function(req, res, next){
  res.render('examples/v31/pde_speed_limits_along_route', { title: 'PDE: Speed limits along the route' });
})

router.get('/pde_speed_limits_in_view', function(req, res, next){
  res.render('examples/v31/pde_speed_limits_in_view', { title: 'PDE: Speed Limits in Map View or in selected Area' });
})

router.get('/isoline_routing', function(req, res, next){
  res.render('examples/v31/isoline_routing', { title: 'Isoline Routing' });
})

router.get('/geofencing', function(req, res, next){
  res.render('examples/v31/geofencing', { title: 'Geofencing demo' });
})

router.get('/clustering', function(req, res, next){
  res.render('examples/v31/clustering', { title: 'Simple Clustering Demo' });
})

router.get('/admin_boundaries_batch', function(req, res, next){
  res.render('examples/v31/admin_boundaries_batch', { title: 'AdminBoundaries Batch for Geocoding' });
})

router.get('/update_marker_on_mapview_change', function(req, res, next){
  res.render('examples/v31/update_marker_on_mapview_change', { title: 'Update Marker on Map Change' });
})

router.get('/show_info_on_hover', function(req, res, next){
  res.render('examples/v31/show_info_on_hover', { title: 'Show Info on Object Hover' });
})

router.get('/pde_postal_bounds', function(req, res, next){
  res.render('examples/v31/pde_postal_bounds', { title: 'PDE: Postal Boundaries' });
})

router.get('/pde_census_boundaries', function(req, res, next){
  res.render('examples/v31/pde_census_boundaries', { title: 'PDE: Display Census Boundaries' });
})
//error like server
router.get('/pde_digital_terrain_model', function(req, res, next){
  res.render('examples/v31/pde_digital_terrain_model', { title: 'PDE: Digital Terrain Height Points' });
})

router.get('/pde_distance_markers', function(req, res, next){
  res.render('examples/v31/pde_distance_markers', { title: 'PDE: Distance Markers' });
})

router.get('/custom_components', function(req, res, next){
  res.render('examples/v31/custom_components', { title: 'Custom Components' });
})
//////////metainfo
router.get('/pde_junction_view_along_route', function(req, res, next){
  res.render('examples/v31/pde_junction_view_along_route', { title: 'PDE: Junction View' });
})

router.get('/rme_basic', function(req, res, next){
  res.render('examples/v31/rme_basic', { title: 'RME Basic Demo' });
})

router.get('/rme_basic_with_ADAS', function(req, res, next){
  res.render('examples/v31/rme_basic_with_ADAS', { title: 'RME with ADAS and Speed Demo' });
})

router.get('/rme_pde_speeding_along_gps_trace', function(req, res, next){
  res.render('examples/v31/rme_pde_speeding_along_gps_trace', { title: 'RME + Attributes Speeding on GPS Track' });
})

router.get('/night_overlay', function(req, res, next){
  res.render('examples/v31/night_overlay', { title: 'Night overlay' });
})

router.get('/geodesic_polyline', function(req, res, next){
  res.render('examples/v31/geodesic_polyline', { title: 'Geodesic Polyline' });
})

router.get('/geojson_reader', function(req, res, next){
  res.render('examples/v31/geojson_reader', { title: 'GeoJson Reader' });
})

router.get('/route_with_tce', function(req, res, next){
  res.render('examples/v31/route_with_tce', { title: 'Route with Toll Cost' });
})

router.get('/find_linkid', function(req, res, next){
  res.render('examples/v31/find_linkid', { title: 'Routing 7.2: Return LinkIDs along the route' });
})

router.get('/heatmap', function(req, res, next){
  res.render('examples/v31/heatmap', { title: 'Heatmap Based on Search Result' });
})

router.get('/predictive_routing_with_traffic', function(req, res, next){
  res.render('examples/v31/predictive_routing_with_traffic', { title: 'Traffic Patterns Display' });
})
////////metainfo
router.get('/pde_height_information_along_route', function(req, res, next){
  res.render('examples/v31/pde_height_information_along_route', { title: 'PDE: Height information along the route' });
})

router.get('/geofence_creation', function(req, res, next){
  res.render('examples/v31/geofence_creation', { title: 'Geofence Creation' });
})
//////////response.route[0] issue
router.get('/pde_adas_curvature_along_route_3_1', function(req, res, next){
  res.render('examples/v31/pde_adas_curvature_along_route_3_1', { title: 'PDE: ADAS Curvature along Route' });
})
//error like server
router.get('/community_map_3_1', function(req, res, next){
  res.render('examples/v31/community_map_3_1', { title: 'HERE Community Map' });
})

router.get('/places_next_departure_3_1', function(req, res, next){
  res.render('examples/v31/places_next_departure_3_1', { title: 'Places API: Next departure' });
})

router.get('/waypoint_sequence_extension_3_1', function(req, res, next){
  res.render('examples/v31/waypoint_sequence_extension_3_1', { title: 'Waypoint Sequence Extension' });
})

router.get('/gfe_draw_upload_layer', function(req, res, next){
  res.render('examples/v31/gfe_draw_upload_layer', { title: 'Draw and Upload Geo Fencing Layer Demo' });
})

router.get('/gfe_check_asset_position', function(req, res, next){
  res.render('examples/v31/gfe_check_asset_position', { title: 'GFE Geofencing Demo: Asset in Fence?' });
})

router.get('/check_asset_position_on_core_maps', function(req, res, next){
  res.render('examples/v31/check_asset_position_on_core_maps', { title: 'Geofencing on Core Maps Demo' });
})

router.get('/gfe_upload_layer', function(req, res, next){
  res.render('examples/v31/gfe_upload_layer', { title: 'GFE: Isoline uploading and checking asset position' });
})

router.get('/transit', function(req, res, next){
  res.render('examples/v31/transit', { title: 'Transit API Demo' });
})

router.get('/cost_optimized_route', function(req, res, next){
  res.render('examples/v31/cost_optimized_route', { title: 'Cost Optimized Route' });
})

router.get('/link_speed_locator', function(req, res, next){
  res.render('examples/v31/link_speed_locator', { title: 'Speed Limits using Geocoder + PDE' });
})

router.get('/draggable_kml_shapes_3_1', function(req, res, next){
  res.render('examples/v31/draggable_kml_shapes_3_1', { title: 'Draggable KML shapes' });
})
//autocomplte mthode issue
router.get('/eta_provider_3_1', function(req, res, next){
  res.render('examples/v31/eta_provider_3_1', { title: 'ETA Provider' });
})

router.get('/geocoder_autocomplete_3_1', function(req, res, next){
  res.render('examples/v31/geocoder_autocomplete_3_1', { title: 'Geocoder Autocomplete' });
})
/////issue lide server
router.get('/geocoder_checkout_3_1', function(req, res, next){
  res.render('examples/v31/geocoder_checkout_3_1', { title: 'Geocoder Checkout' });
})

router.get('/meta_layer', function(req, res, next){
  res.render('examples/v31/meta_layer', { title: 'HERE Meta Layer Map Display' });
})

router.get('/context_menu', function(req, res, next){
  res.render('examples/v31/context_menu', { title: 'Context Menu Demo' });
})
//////issue like server
router.get('/cle_rme_fleet_tracking', function(req, res, next){
  res.render('examples/v31/cle_rme_fleet_tracking', { title: 'CLE + RME Fleet Tracking' });
})

router.get('/rme_pde_java_example', function(req, res, next){
  res.render('examples/v31/rme_pde_java_example', { title: 'RME PDE Java Example' });
})


module.exports = router;
