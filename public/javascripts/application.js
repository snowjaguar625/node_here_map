// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require jquery-ui
//= require jquery.turbolinks
//= require fancybox
//= require turbolinks
//= require bootstrap-sprockets
//= require moment
//= require bootstrap-datetimepicker
//= require kefir.min

//= require defaults
//= require release-requests

//= require pde-manager-tiles

//= require_self

function popup()
{
	$('#screen').css({	"display": "block", opacity: 0.7, "width":$(document).width(),"height":$(document).height()});
	//$('body').css({"overflow":"hidden"});
	$('#box').css({"display": "block"}).click(function(){$(this).css("display", "none");$('#screen').css("display", "none")});
	$('#screen').css({"display": "block"}).click(function(){$(this).css("display", "none");$('#box').css("display", "none")});
}

function closePopup() 
{
	$('#box').css({"display": "none"});
	$('#screen').css({"display": "none"});
}

function setTimer(timeToDisplay)
{
	setTimeout(closePopup, timeToDisplay);
	var time = timeToDisplay,
		r=document.getElementById('timer'),
		tmp=time;
		setInterval(
			function()
			{
				var c=tmp--,
					m=(c/60)>>0,
					s=(c-m*60)+'';
				r.textContent=s + "s"
				tmp!=0||(tmp=time);
			},1000);
}