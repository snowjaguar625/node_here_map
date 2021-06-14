(function() {
  var mapsjs = mapsjs || H;
  var bindJs_ = function(fn, selfObj, var_args) {
    if (!fn) {
      throw new Error();
    }
    if (arguments.length > 2) {
      var boundArgs = Array.prototype.slice.call(arguments, 2);
      return function() {
        // Prepend the bound arguments to the current arguments.
        var newArgs = Array.prototype.slice.call(arguments);
        Array.prototype.unshift.apply(newArgs, boundArgs);
        return fn.apply(selfObj, newArgs);
      };
    } else {
      return function() {
        return fn.apply(selfObj, arguments);
      };
    }
  };
  
  var icon =
    '<svg version="1.1" class="H_icon" viewBox="0 0 26 26">' +
    '<circle cx="10" cy="22" r="1" />' +
    '<circle cx="7" cy="22" r="1" />' +
    '<circle cx="4" cy="22" r="1" />' +
    '<circle cx="4" cy="19" r="1" />' +
    '<circle cx="4" cy="16" r="1" />' +
    '<circle cx="4" cy="13" r="1" />' +
    '<circle cx="4" cy="10" r="1" />' +
    '<circle cx="4" cy="7" r="1" />' +
    '<circle cx="4" cy="4" r="1" />' +
    '<circle cx="7" cy="4" r="1" />' +
    '<circle cx="10" cy="4" r="1" />' +
    '<circle cx="13" cy="4" r="1" />' +
    '<circle cx="16" cy="4" r="1" />' +
    '<circle cx="19" cy="4" r="1" />' +
    '<circle cx="22" cy="4" r="1" />' +
    '<circle cx="22" cy="7" r="1" />' +
    '<circle cx="22" cy="10" r="1" />' +
	'<circle cx="22" cy="13" r="1" />' +
	'<circle cx="22" cy="16" r="1" />' +
	'<circle cx="22" cy="19" r="1" />' +
	'<circle cx="22" cy="22" r="1" />' +
	'<circle cx="13" cy="22" r="1" />' +
	'<circle cx="16" cy="22" r="1" />' +
	'<circle cx="19" cy="22" r="1" />' +
    '</svg>';
  var RectangleSelection = function(isVector) {
    //call the super class constructor
    H.ui.Control.call(this);
    //bind functions to this instance
    this.startRect = bindJs_(this.startRect, this);
    this.updateRect = bindJs_(this.updateRect, this);
    this.endRect = bindJs_(this.endRect, this);
    this.cancelRect = bindJs_(this.cancelRect, this);
    this.rectState_ = null;
    this.button = new mapsjs.ui.base.PushButton({
      label: icon,
      onStateChange: bindJs_(this.onButtonStateChange_, this)
    });
    this.addChild(this.button);
    this.setAlignment('right-middle');
	if(isVector){
		this.isVector = isVector;
		this.geoRect = null;
	}
	
  };
  inherits(RectangleSelection, H.ui.Control);
  RectangleSelection.prototype.onButtonStateChange_ = function(evt)
  {
	this.setActive(evt['target'].getState() === 'down');
  }
  
  RectangleSelection.prototype.setActive = function(active) {
    if(active != this.active_) {
       var map = this.getMap();
	   if(this.isVector){
		   var heading = map.getViewModel().getLookAtData().heading;
		   if(heading <= 90 || heading > 270){
				alert("Map will be re-orentied with Heading towards north");
				rotateMap(map,180);
			}
		}
	if(active && this.parent && this.layer) {
		if(this.isVector){
			map.addObject(this.geoRect);
		}
		this.parent.insertBefore(this.layer, this.parent.lastChild);
		
      } else if(!active && this.parent && this.layer) {
		this.parent.removeChild(this.layer);
      }
      this.active_ = active;
    }
  };
  
  RectangleSelection.prototype.setCallback = function(cb)
  {
	this.callback = cb;
  }
  RectangleSelection.prototype.renderInternal = function(element, doc) {
    H.ui.Control.prototype.renderInternal.call(this, element, doc);
	// implmeted using approach on https://jsfiddle.net/j3d7zo1w/24/ 
	// div used to capture mouse down event on screen
	this.layer = doc.createElement('div');
	this.layer.style.position = 'absolute';
	this.layer.style.height = '100%';
	this.layer.style.width = '100%';
	this.layer.style.background = 'rgba(255, 255, 255, 0.1)';
	this.layer.style.cursor = 'zoom-in';
	// div which actually creates the rectangle on UI
	this.rect = doc.createElement('div');
	this.rect.style.position = 'absolute';
	this.rect.style.border = '4px dotted #4A5B65';
	this.rect.style.cursor = 'zoom-in';
	// In 3 D mode simple div cannot be used as it does
	// not reflect the tilt hence using a Map rectangle
	if(this.isVector){
		var customStyle = {
			  strokeColor: '#4A5B65',
			  fillColor: 'rgba(255, 255, 255, 0)',
			  lineWidth: 4,
			  lineJoin: 'bevel',
			  lineDash : [2]
		};
		
		this.geoRect = new H.map.Rect(new H.geo.Rect(0,0,0,0),{style:customStyle});
		this.geoRect.setVisibility(false);
	}
	
	this.parent = map.getElement();
	this.layer.addEventListener('mousedown', this.startRect);
	this.layer.addEventListener('mouseup', this.endRect);
	
	
    return this;
  };
  RectangleSelection.prototype.findOffset = function(element) {
    'use strict';
    var doc = element.ownerDocument,
        docElement = doc.documentElement || doc.body.parentNode || doc.body,
        clientRect;
    clientRect = element.getBoundingClientRect();
    return {
      'x': clientRect['left'] + (typeof(window.pageXOffset) === 'number' ? window.pageXOffset : docElement.scrollLeft),
      'y': clientRect['top'] + (typeof(window.pageYOffset) === 'number' ? window.pageYOffset : docElement.scrollTop)
    };
  };
  RectangleSelection.prototype.startRect = function(evt) {
   var offset = this.findOffset(this.layer);
    // used for detecting map objects after rectangle is created
	this.rectState_ = {
      offset: offset,
      top:  evt.clientX - offset.x ,
      bottom:  evt.clientY - offset.y,
      left: evt.clientX - offset.x ,
      right:  evt.clientY - offset.y,
      width: 0,
      height: 0,
	  startX :  evt.clientX - offset.x ,
	  startY :  evt.clientY - offset.y
    };
	
	if(this.isVector){
		behaviour.disable();
		var map = this.getMap();
		
		
		if(this.geoRect)
			map.removeObject(this.geoRect);
		var topLeft = map.screenToGeo(this.rectState_.left, this.rectState_.top);
		var bottomRight =  map.screenToGeo(this.rectState_.right, this.rectState_.bottom);
		var rect = new H.geo.Rect( topLeft.lat, topLeft.lng, bottomRight.lat,  bottomRight.lng);
		this.geoRect.setBoundingBox(rect);
		this.geoRect.setVisibility(false);
		map.addObject(this.geoRect);
		this.layer.addEventListener('mousemove', this.updateRect);
	}else{
		// add the retangle div to parent div
		this.rect.style.top = this.rectState_.top + "px";
		this.rect.style.left = this.rectState_.left + "px";
		this.rect.style.width = '0';
		this.rect.style.height = '0';
		this.layer.appendChild(this.rect);
	}
	this.layer.addEventListener('mousemove', this.updateRect);

    ;
  };
  RectangleSelection.prototype.updateRect = function(evt) {
    if(this.rectState_) {
	// implmeted using approach on https://jsfiddle.net/j3d7zo1w/24/
	var width = (evt.clientX  - this.rectState_.offset.x)-this.rectState_.startX;
    var height = (evt.clientY  - this.rectState_.offset.y)-this.rectState_.startY;
    var x = this.rectState_.startX;
    var y = this.rectState_.startY;
    if (width < 0) {
    	x = this.rectState_.startX + width;
      width=-width;
    }
    if (height < 0) {
    	y = this.rectState_.startY + height;
      height = -height;
    }
	
    // copy values from rectangle div to state 
	// these values would be used to find overlapping map objects
	this.rectState_.top = y;
	this.rectState_.left = x;
	this.rectState_.width = width;
	this.rectState_.height = height;
	this.rectState_.right = x+width;
	this.rectState_.bottom = y+height;


	if(this.isVector){
		var map = this.getMap();
		var topLeft = map.screenToGeo(this.rectState_.left, this.rectState_.top);
		var bottomRight =  map.screenToGeo(this.rectState_.right, this.rectState_.bottom);
		var rect = new H.geo.Rect( topLeft.lat, topLeft.lng, bottomRight.lat,  bottomRight.lng);
		this.geoRect.setBoundingBox(rect);
		this.geoRect.setVisibility(true);
			
	}else{
			// update the div style according to mouse movement
		this.rect.style.top =  y + "px";
		this.rect.style.left = x + "px";
		this.rect.style.width =  width + "px";
		this.rect.style.height = height + "px";
	}
	  
    }
  },
  RectangleSelection.prototype.endRect = function(evt) {
   this.updateRect(evt);
   	if(this.isVector){
		behaviour.enable();
	}
    if(this.rectState_.width > 10 && this.rectState_.height > 10) {
      var map = this.getMap(),
          tl, br;
	  if(map) {
        tl = map.screenToGeo(this.rectState_.left, this.rectState_.top);
        br = map.screenToGeo(this.rectState_.right, this.rectState_.bottom);
		this.callback(mapsjs.geo.Rect.fromPoints(tl, br));
        // map.setViewBounds(mapsjs.geo.Rect.fromPoints(tl, br), true);
      }
    }
	this.cancelRect();
  };
  RectangleSelection.prototype.cancelRect = function() {
    this.layer.removeEventListener('mousemove', this.updateRect);
	if(this.geoRect){
		this.getMap().removeObject(this.geoRect);
	}else{
		   this.layer.removeChild(this.rect);
	}
 
    this.rectState_ = null;
    this.button.setState('up');
  };
  H.ui.RectangleSelection = RectangleSelection;
})();
