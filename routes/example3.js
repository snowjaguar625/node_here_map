const fs = require('fs');
const path = require('path');
const pug = require('pug');

var express = require('express');
var router = express.Router();

let rawdexamplesv3 = fs.readFileSync(path.resolve(__dirname, '../config/tcs_examples3.json'));
let examples3 = JSON.parse(rawdexamplesv3);
/* GET home page. */
router.use(function(req, res, next){
    var page_url = req.originalUrl;
    if(page_url.includes('fleet_china'))
        req.session.is_china_example = 'true';
    else
        req.session.is_china_example = 'false';
    next();
})
router.get('/', function(req, res, next) {
  res.render('examples/index3', { title: 'TCS examples', examples3: examples3 });
});

router.get('/restful_examples', function(req, res, next) {
    res.render('examples/v3/restful_examples', { title: 'RESTful request examples', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_map', function(req, res, next) {
    res.render('examples/v3/simple_map', { title: 'Simple HERE Map Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/mrs_options', function(req, res, next) {
    res.render('examples/v3/mrs_options', { title: 'Parameters for MRS tiles', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_routing', function(req, res, next) {
    res.render('examples/v3/simple_routing', { title: 'Simple HERE Map Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_geocoding', function(req, res, next) {
    res.render('examples/v3/simple_geocoding', { title: 'Simple Geocoding', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/several_markers', function(req, res, next) {
    res.render('examples/v3/several_markers', { title: 'Several markersg', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/marker_performance', function(req, res, next) {
    res.render('examples/v3/marker_performance', { title: 'Marker Performance', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/reverse_isoline', function(req, res, next) {
    res.render('examples/v3/reverse_isoline', { title: 'Reverse Isoline Routing', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/auto_cloud_weather', function(req, res, next) {
    res.render('examples/v3/auto_cloud_weather', { title: 'Display for Auto Cloud Weather Service', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/admin_boundaries', function(req, res, next) {
    res.render('examples/v3/admin_boundaries', { title: 'AdminBoundary for Geocoding', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/admin_boundaries_inverted', function(req, res, next) {
    res.render('examples/v3/admin_boundaries_inverted', { title: 'AdminBoundary from Geocoder', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/slope_along_route', function(req, res, next) {
    res.render('examples/v3/slope_along_route', { title: 'PDE: Display slope along route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/road_types_along_route', function(req, res, next) {
    res.render('examples/v3/road_types_along_route', { title: 'PDE: Displays the road types along a Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/speed_limits_along_gps_trace', function(req, res, next) {
    res.render('examples/v3/speed_limits_along_gps_trace', { title: 'Road Matching Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/polygon_shaper', function(req, res, next) {
    res.render('examples/v3/polygon_shaper', { title: 'Shaper example', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/info_bubble_custom_css', function(req, res, next) {
    res.render('examples/v3/info_bubble_custom_css', { title: 'Customizing Info Bubble with Classes/Javascript', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/info_bubbles', function(req, res, next) {
    res.render('examples/v3/info_bubbles', { title: 'InfoBubble display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/2d_landmarks', function(req, res, next) {
    res.render('examples/v3/2d_landmarks', { title: '2D Landmarks', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/zoom_rectangle', function(req, res, next) {
    res.render('examples/v3/zoom_rectangle', { title: 'Zoom Rectangle UI examples', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geocode_addresses', function(req, res, next) {
    res.render('examples/v3/geocode_addresses', { title: 'Geocode Addresses', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_traffic_signs', function(req, res, next) {
    res.render('examples/v3/pde_traffic_signs', { title: 'PDE: Display Traffic Signs along Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//datetype error
router.get('/pde_speed_limits_along_route', function(req, res, next) {
    res.render('examples/v3/pde_speed_limits_along_route', { title: 'PDE: Speed limits along the route', version_num: 'v3', is_china_example: req.session.is_china_example});
});
/////datetype error
router.get('/pde_speed_limits_in_view', function(req, res, next) {
    res.render('examples/v3/pde_speed_limits_in_view', { title: 'PDE: Speed Limits in Map View or in selected Area', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/isoline_routing', function(req, res, next) {
    res.render('examples/v3/isoline_routing', { title: 'Isoline Routing', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/fleet', function(req, res, next) {
    res.render('examples/v3/fleet', { title: 'Here Truck Routing', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geofencing', function(req, res, next) {
    res.render('examples/v3/geofencing', { title: 'Geofencing demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/clustering', function(req, res, next) {
    res.render('examples/v3/clustering', { title: 'Simple Clustering Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/admin_boundaries_batch', function(req, res, next) {
    res.render('examples/v3/admin_boundaries_batch', { title: 'AdminBoundaries Batch for Geocoding', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/update_marker_on_mapview_change', function(req, res, next) {
    res.render('examples/v3/update_marker_on_mapview_change', { title: 'Update Marker on Map Change', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/show_info_on_hover', function(req, res, next) {
    res.render('examples/v3/show_info_on_hover', { title: 'Show Info on Object Hover', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_postal_bounds', function(req, res, next) {
    res.render('examples/v3/pde_postal_bounds', { title: 'PDE: Postal Boundaries', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_census_boundaries', function(req, res, next) {
    res.render('examples/v3/pde_census_boundaries', { title: 'PDE: Display Census Boundaries', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_digital_terrain_model', function(req, res, next) {
    res.render('examples/v3/pde_digital_terrain_model', { title: 'PDE: Digital Terrain Height Points', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_distance_markers', function(req, res, next) {
    res.render('examples/v3/pde_distance_markers', { title: 'PDE: Distance Markers', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/custom_components', function(req, res, next) {
    res.render('examples/v3/custom_components', { title: 'Custom Components', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_junction_view_along_route', function(req, res, next) {
    res.render('examples/v3/pde_junction_view_along_route', { title: 'PDE: Junction View', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_basic', function(req, res, next) {
    res.render('examples/v3/rme_basic', { title: 'RME Basic Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_pde_speeding_along_gps_trace', function(req, res, next) {
    res.render('examples/v3/rme_pde_speeding_along_gps_trace', { title: 'RME + Attributes Speeding on GPS Track', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/night_overlay', function(req, res, next) {
    res.render('examples/v3/night_overlay', { title: 'Night overlay', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geodesic_polyline', function(req, res, next) {
    res.render('examples/v3/geodesic_polyline', { title: 'Geodesic Polyline', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_adas_curvature_along_route', function(req, res, next) {
    res.render('examples/v3/pde_adas_curvature_along_route', { title: 'PDE: ADAS Curvature along Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/reverse_geocoding_center_view', function(req, res, next) {
    res.render('examples/v3/reverse_geocoding_center_view', { title: 'Geocoding center of the View', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/community_map', function(req, res, next) {
    res.render('examples/v3/community_map', { title: 'HERE Community Map', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/places_next_departure', function(req, res, next) {
    res.render('examples/v3/places_next_departure', { title: 'Places API: Next departure', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_realtime_tracking', function(req, res, next) {
    res.render('examples/v3/pde_realtime_tracking', { title: 'PDE: Real Time Tracking', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/waypoint_sequence_extension', function(req, res, next) {
    res.render('examples/v3/waypoint_sequence_extension', { title: 'Waypoint Sequence Extension', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/draggable_kml_shapes', function(req, res, next) {
    res.render('examples/v3/draggable_kml_shapes', { title: 'Draggable KML shapes', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/eta_provider', function(req, res, next) {
    res.render('examples/v3/eta_provider', { title: 'ETA Provider', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geocoder_autocomplete', function(req, res, next) {
    res.render('examples/v3/geocoder_autocomplete', { title: 'Geocoder Autocomplete', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geocoder_checkout', function(req, res, next) {
    res.render('examples/v3/geocoder_checkout', { title: 'Geocoder Checkout', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/gfe_draw_upload_layer', function(req, res, next) {
    res.render('examples/v3/gfe_draw_upload_layer', { title: 'Draw and Upload Geo Fencing Layer Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/gfe_check_asset_position', function(req, res, next) {
    res.render('examples/v3/gfe_check_asset_position', { title: 'GFE Geofencing Demo: Asset in Fence?', version_num: 'v3', is_china_example: req.session.is_china_example});
});


router.get('/check_asset_position_on_core_maps', function(req, res, next) {
    res.render('examples/v3/check_asset_position_on_core_maps', { title: 'Geofencing on Core Maps Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/gfe_upload_layer', function(req, res, next) {
    res.render('examples/v3/gfe_upload_layer', { title: 'GFE: Isoline uploading and checking asset position', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/transit', function(req, res, next) {
    res.render('examples/v3/transit', { title: 'Transit API Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/cost_optimized_route', function(req, res, next) {
    res.render('examples/v3/cost_optimized_route', { title: 'Cost Optimized Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/link_speed_locator', function(req, res, next) {
    res.render('examples/v3/link_speed_locator', { title: 'Speed Limits using Geocoder + PDE', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/venue_interaction', function(req, res, next) {
    res.render('examples/v3/venue_interaction', { title: 'Venue Maps Interaction', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/meta_layer', function(req, res, next) {
    res.render('examples/v3/meta_layer', { title: 'HERE Meta Layer Map Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/context_menu', function(req, res, next) {
    res.render('examples/v3/context_menu', { title: 'Context Menu Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geojson_reader', function(req, res, next) {
    res.render('examples/v3/geojson_reader', { title: 'GeoJson Reader', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/route_with_tce', function(req, res, next) {
    res.render('examples/v3/route_with_tce', { title: 'Route with Toll Cost', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/find_linkid', function(req, res, next) {
    res.render('examples/v3/find_linkid', { title: 'Routing 7.2: Return LinkIDs along the route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/heatmap', function(req, res, next) {
    res.render('examples/v3/heatmap', { title: 'Heatmap Based on Search Result', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/flow_heatmap', function(req, res, next) {
    res.render('examples/v3/flow_heatmap', { title: 'Traffic Flow Heatmap', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/predictive_routing_with_traffic', function(req, res, next) {
    res.render('examples/v3/predictive_routing_with_traffic', { title: 'Traffic Patterns Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_height_information_along_route', function(req, res, next) {
    res.render('examples/v3/pde_height_information_along_route', { title: 'PDE: Height information along the route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geofence_creation', function(req, res, next) {
    res.render('examples/v3/geofence_creation', { title: 'Geofence Creation', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/cle_rme_fleet_tracking', function(req, res, next) {
    res.render('examples/v3/cle_rme_fleet_tracking', { title: 'CLE + RME Fleet Tracking', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_pde_java_example', function(req, res, next) {
    res.render('examples/v3/rme_pde_java_example', { title: 'RME PDE Java Example', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geotag_screenshot', function(req, res, next) {
    res.render('examples/v3/geotag_screenshot', { title: 'Capture HERE Map Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/gfe_upload_created_route_fence', function(req, res, next) {
    res.render('examples/v3/gfe_upload_created_route_fence', { title: 'Create a Route Geofence, upload to GFE and simulate asset', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/cle2_pde_search', function(req, res, next) {
    res.render('examples/v3/cle2_pde_search', { title: 'CLE & PDE Visual Search Bench', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/bicycle_routing', function(req, res, next) {
    res.render('examples/v3/bicycle_routing', { title: 'Routing 7.2: Bicycle Routing (Beta version)', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_admin_poly_union', function(req, res, next) {
    res.render('examples/v3/pde_admin_poly_union', { title: 'PDE + Geocoder: PostalCode Bounds with Union', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/cluster_marker_spider', function(req, res, next) {
    res.render('examples/v3/cluster_marker_spider', { title: 'Simple Cluster Spider Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_street_details', function(req, res, next) {
    res.render('examples/v3/pde_street_details', { title: 'Street Geometries using PDE', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_matrix_routing', function(req, res, next) {
    res.render('examples/v3/simple_matrix_routing', { title: 'Simple Matrix Routing', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/leaflet', function(req, res, next) {
    res.render('examples/v3/leaflet', { title: '', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/pde_admin_boundaries', function(req, res, next) {
    res.render('examples/v3/pde_admin_boundaries', { title: 'PDE Admin Polygons in Canvas', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rectangle_selection', function(req, res, next) {
    res.render('examples/v3/rectangle_selection', { title: 'Select Markers via Rectangle', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_truck_pois_along_a_route', function(req, res, next) {
    res.render('examples/v3/pde_truck_pois_along_a_route', { title: 'PDE: Truck POIs along Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/meta_layer_in_canvas', function(req, res, next) {
    res.render('examples/v3/meta_layer_in_canvas', { title: 'Meta Layer Rendering in Canvas', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/auto_cloud_ev_stations', function(req, res, next) {
    res.render('examples/v3/auto_cloud_ev_stations', { title: 'Display for Auto Cloud EV Charging Stations', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/ev_charging_along_route', function(req, res, next) {
    res.render('examples/v3/ev_charging_along_route', { title: 'Electric Vehicle charging along the route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/open_layers', function(req, res, next) {
    res.render('examples/v3/open_layers', { title: 'HERE Backends with OpenLayers', version_num: 'v3', is_china_example: req.session.is_china_example});
});


router.get('/custom_canvas_clustering', function(req, res, next) {
    res.render('examples/v3/custom_canvas_clustering', { title: 'Custom Canvas Clustering Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_get_any_link_info', function(req, res, next) {
    res.render('examples/v3/pde_get_any_link_info', { title: 'PDE Get(Any)LinkInfo', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/rme_speed_limits', function(req, res, next) {
    res.render('examples/v3/rme_speed_limits', { title: 'RME Speed Limit Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/track_vehicle_to_update_eta', function(req, res, next) {
    res.render('examples/v3/track_vehicle_to_update_eta', { title: 'Track Vehicle to Update ETA', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_tmc_linkid', function(req, res, next) {
    res.render('examples/v3/pde_tmc_linkid', { title: 'PDE: TMC / LINK_ID along Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/geojson_route_extraction', function(req, res, next) {
    res.render('examples/v3/geojson_route_extraction', { title: 'Extract Route Shape to MultiLineString in GeoJSON', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/places_lookup', function(req, res, next) {
    res.render('examples/v3/places_lookup', { title: 'Search for POI by Name, PlaceID or PVID', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/transit_line_info', function(req, res, next) {
    res.render('examples/v3/transit_line_info', { title: 'Transit Line Info', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/transit_alerts', function(req, res, next) {
    res.render('examples/v3/transit_alerts', { title: 'Transit Alerts', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_with_pde_attributes', function(req, res, next) {
    res.render('examples/v3/rme_with_pde_attributes', { title: 'RME with PDE/CLE attributes', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/custom_routing_basic', function(req, res, next) {
    res.render('examples/v3/custom_routing_basic', { title: 'Custom Routing Basic Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/cre_submit_overlay', function(req, res, next) {
    res.render('examples/v3/cre_submit_overlay', { title: 'CRE - Submit Overlay', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/fleet_telematics_api', function(req, res, next) {
    res.render('examples/v3/fleet_telematics_api', { title: 'Fleet Telematics API', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/pde_live_traffic_speed_record', function(req, res, next) {
    res.render('examples/v3/pde_live_traffic_speed_record', { title: 'PDE Live traffic speed record', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_traffic_pattern', function(req, res, next) {
    res.render('examples/v3/pde_traffic_pattern', { title: 'PDE Traffic Patterns', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/forward_geocoder', function(req, res, next) {
    res.render('examples/v3/forward_geocoder', { title: 'Forward Geocoder', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/gfe_match_transport', function(req, res, next) {
    res.render('examples/v3/gfe_match_transport', { title: 'GFE: Match Transport', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_trip_anomalies_detection', function(req, res, next) {
    res.render('examples/v3/rme_trip_anomalies_detection', { title: 'RME Trip Anomalies Detection', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/transit_stations_in_view', function(req, res, next) {
    res.render('examples/v3/transit_stations_in_view', { title: 'Transit & isoline Stations around Map Center', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/demo_matrix_routing', function(req, res, next) {
    res.render('examples/v3/demo_matrix_routing', { title: 'Simple Matrix Routing', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/calculate_route_isoline', function(req, res, next) {
    res.render('examples/v3/calculate_route_isoline', { title: 'Calculate Route Isoline', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/calculate_poi_along_isoline_route', function(req, res, next) {
    res.render('examples/v3/calculate_poi_along_isoline_route', { title: 'POIs along Isoline Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/calculate_isoline_links', function(req, res, next) {
    res.render('examples/v3/calculate_isoline_links', { title: 'Calculate Isoline Route including Links', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/waypoint_sequence_extension_pickups', function(req, res, next) {
    res.render('examples/v3/waypoint_sequence_extension_pickups', { title: 'Waypoint Sequence Extension Pickups', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_daily_commute', function(req, res, next) {
    res.render('examples/v3/rme_daily_commute', { title: 'RME for Daily Commute Delays', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/restful_analyzer', function(req, res, next) {
    res.render('examples/v3/restful_analyzer', { title: '', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/simple_map_incl_overlay_geohash', function(req, res, next) {
    res.render('examples/v3/simple_map_incl_overlay_geohash', { title: 'Geohash Example', version_num: 'v3', is_china_example: req.session.is_china_example});
});
//server error
router.get('/simple_what3words', function(req, res, next) {
    res.render('examples/v3/simple_what3words', { title: 'What3Words with HERE', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_map_two_fingers', function(req, res, next) {
    res.render('examples/v3/simple_map_two_fingers', { title: 'Simple HERE Map for Mobile Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_road_roughness_in_view', function(req, res, next) {
    res.render('examples/v3/pde_road_roughness_in_view', { title: 'PDE: Road Roughness in MapView', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_var_speed_signs_in_view', function(req, res, next) {
    res.render('examples/v3/pde_var_speed_signs_in_view', { title: 'PDE: Variable Speed Signs', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/traffic_viewer', function(req, res, next) {
    res.render('examples/v3/traffic_viewer', { title: 'Full Incident Display', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_p_and_r', function(req, res, next) {
    res.render('examples/v3/simple_p_and_r', { title: 'Simple Park&Ride Demo', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/magnifier', function(req, res, next) {
    res.render('examples/v3/magnifier', { title: 'Magnifier Layer Switch', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_pde_rgc', function(req, res, next) {
    res.render('examples/v3/rme_pde_rgc', { title: 'RME with Attributes and Reverse Geocoding', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/pde_env_zones', function(req, res, next) {
    res.render('examples/v3/pde_env_zones', { title: 'PDE Environmental Zones in Canvas', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/simple_map_jp', function(req, res, next) {
    res.render('examples/v3/simple_map_jp', { title: 'Simple Japan HERE Map', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/rme_stop_sign_violation', function(req, res, next) {
    res.render('examples/v3/rme_stop_sign_violation', { title: 'RME STOP Sign Violation', version_num: 'v3', is_china_example: req.session.is_china_example});
});

router.get('/find_intersection_along_route', function(req, res, next) {
    res.render('examples/v3/find_intersection_along_route', { title: 'Intersections along Route', version_num: 'v3', is_china_example: req.session.is_china_example});
});

module.exports = router;