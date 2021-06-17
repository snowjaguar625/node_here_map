/* 
	author domschuette
	(C) HERE 2014
*/

(function() {

  var ZoomControl = function() {
    //call the super class constructor
    H.ui.Control.call(this);
	
	ui.removeControl('zoom');
	this.setAlignment('right-middle');
  };
	
  inherits(ZoomControl, H.ui.Control);
  
  ZoomControl.prototype.renderInternal = function(element, doc) 
  {
    H.ui.Control.prototype.renderInternal.call(this, element, doc);
	this.parent = map.getElement();
	
	this.container = document.createElement('div');
	this.container.style.right = '0.2em';
	this.container.style.bottom = '40%';
	this.container.style.display = 'block'; 
	this.container.style.position = 'absolute'; 
	this.container.style.padding = '0px';
	this.container.style.background = "#1f262a";
	this.container.style.borderRadius = "15px";
	this.container.style.webkitUserSelect = "none";
	
	var icon = '<svg class="H_icon" viewBox="0 0 25 25"><path d="M 18.5,11 H 14 V 6.5 c 0,-.8 -.7,-1.5 -1.5,-1.5 -.8,0 -1.5,.7 -1.5,1.5 V 11 H 6.5 C 5.7,11 5,11.7 5,12.5 5,13.3 5.7,14 6.5,14 H 11 v 4.5 c 0,.8 .7,1.5 1.5,1.5 .8,0 1.5,-.7 1.5,-1.5 V 14 h 4.5 C 19.3,14 20,13.3 20,12.5 20,11.7 19.3,11 18.5,11 z"></path></svg>';
	
	this.plus = document.createElement('div');
	this.plus.innerHTML = icon;
	this.plus.addEventListener('click', this.zoomIn);
	this.plus.style.cursor = "pointer";
	this.plus.style.webkitUserSelect = "none";

	slider = document.createElement('input');
	slider.setAttribute('type', 'range');
	slider.setAttribute('orient', 'vertical');
	slider.style.webkitAppearance = "slider-vertical";
	slider.min = "0";
	slider.max = "20";
	slider.style.width = "28px";
	slider.value = "5";
	slider.style.cursor = "pointer";
	slider.style.webkitUserSelect = "none";
	
	var icon = '<svg class="H_icon" viewBox="0 0 25 25"><path d="m 6.5,11 h 12 c .8,0 1.5,.7 1.5,1.5 0,.8 -.7,1.5 -1.5,1.5 H 6.5 C 5.7,14 5,13.3 5,12.5 5,11.7 5.67,11 6.5,11 z"></path></svg>';
	
	this.minus = document.createElement('div');
	this.minus.innerHTML = icon;
	this.minus.addEventListener('click', this.zoomOut);
	this.minus.style.cursor = "pointer";
	this.minus.style.webkitUserSelect = "none";

	this.container.appendChild(this.plus);
	this.container.appendChild(slider);
	this.container.appendChild(this.minus);
	
	this.parent.insertBefore(this.container, this.parent.lastChild);
	
	map.addEventListener('mapviewchange', this.map2ZoomControl);
	slider.onchange = function() { map.setZoom(slider.value); };
	slider.onmousemove = function() { map.setZoom(slider.value); };
	
	return this;
  }
  
  ZoomControl.prototype.map2ZoomControl = function()
  {
	slider.value = map.getZoom();
  }
  
  ZoomControl.prototype.zoomIn = function()
  {
	map.setZoom(map.getZoom() + 1);
  }

  ZoomControl.prototype.zoomOut = function()
  {
	map.setZoom(map.getZoom() - 1);
  }
  
  H.ui.ZoomControl = ZoomControl;
})();
