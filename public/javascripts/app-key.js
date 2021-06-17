// var app_id = "inCUge3uprAQEtRaruyaZ8",
// 				app_code = "9Vyk_MElhgPCytA7z3iuPA",
var app_id = "Mr6DULLwdPpaaxrBxpUa",
	app_code = "G_dIaYuRa_FyK7fsOJnDbQ",
	app_id_cors = "BTp1kLd1IpptcQe2Ir3h",
	app_code_cors = "zMDPaKTAFR2g3wF3h4ok7w",
	app_id_jp = "dPNJ6XzVATngXoWhlqx7",
	app_code_jp = "qUYWNNt0HKi8B9JhTGKNIA",
	api_key = "3lKmytJ9qwM22dCKUNNbu2C6zab5zWXYPy5lGKGdYM4",
	api_key_jp = "aqzbtK2GQGtD2ZtxWNcWPyeLCCGbOgbRFLe4Bntfi9U",
	app_id_new = "akl066ieG9nLbhXEWANd",
	app_code_new = "zKCsydHYhOY17rbzvhq4KQ",
	api_key_new = "3lKmytJ9qwM22dCKUNNbu2C6zab5zWXYPy5lGKGdYM4",
	api_key_geocode = "cF1MCUW-j-ThP4xHja2a7Y_x_Bq6tg6Nz_2CFSR4IwI",
	center = {lat:"50.13", lng:"8.34"},
	zoom = "10";

//////////////////////////////////////
	// # Configure HERE credentials
    // app_id = 'dIqjg3N5LuHG1QAwHbwD'
    // app_code = 'rJbZNQB3EN3oB4NqHaFXTQ'
    // # HERE Account integration configs
    login_clientId =  'inCUge3uprAQEtRaruyaZ8'
    login_environment = 'https://account.here.com'
    login_type = 'frame'
    login_lang = 'en-EN'
    login_screenconfig = 'password'
    login_dev_environment = 'https://st.p.account.here.com'
    bosch_resthost='http://34.209.174.200'
	    
    // # specify new app_id / app_code for productive mode and dev mode here!!!
    // app_id_global = 'inCUge3uprAQEtRaruyaZ8'
    // app_code_global = '9Vyk_MElhgPCytA7z3iuPA'
	// app_id_cors = 	'BTp1kLd1IpptcQe2Ir3h'
    // app_code_cors =	'zMDPaKTAFR2g3wF3h4ok7w'
	// app_id_jp = 'dPNJ6XzVATngXoWhlqx7'
	// app_code_jp = 'qUYWNNt0HKi8B9JhTGKNIA'
	
	// # for js api 3.1 (app_id : 02aNLyqsJvBnA18RFjnH) ==> BlackListed for over usage
//   # api_key = 'FdX8ng49KKL5M4Dail77oRCl0AbLF2sFo8fkrWMpLPk'
//   # for js api 3.1 (app_id : akl066ieG9nLbhXEWANd)
	// api_key = '3lKmytJ9qwM22dCKUNNbu2C6zab5zWXYPy5lGKGdYM4'
	// #Japan api key (app_id : kDaunY5Arh4kq38xawKr)
	// api_key_jp = '_U80GrbnQYHbU_QeWhGY70qeAKNE5mzInsZM6w4Tq2U' # APP ID: OV6n0T6POyODRz1FbXOj
	// api_key_jp_rest = 'C4qtrsh1ciA07R4bARhgmVmdAkKlyOiuvYIKBD4CeHM' # APP ID: kDaunY5Arh4kq38xawKr


$(function(){
	if($('title').text())
		$('.header-text').text($('title').text());
})