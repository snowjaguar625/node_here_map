(function() {

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
    '<path d="M 18.4 13.2 C 15.6 13.2 13.4 15.4 13.4 18.2 C 13.4 21 15.6 23.2 18.4 23.2 C 19.3 23.2 20.2 22.9 20.9 22.5' +
    ' L 23.2 24.8 C 23.6 25.2 24.3 25.2 24.7 24.8 C 25.1 24.4 25.1 23.8 24.7 23.4 L 22.4 21.2 C 23 20.3 23.4 19.3 23.4 ' +
    '18.2 C 23.4 15.4 21.2 13.2 18.4 13.2 z M 18.4 15.2 C 20 15.2 21.4 16.5 21.4 18.2 C 21.4 19.9 20 21.2 18.4 21.2 C 1' +
    '6.7 21.2 15.4 19.9 15.4 18.2 C 15.4 16.5 16.7 15.2 18.4 15.2 z " />' +
    '</svg>';

  var ZoomToRectangle = function() {
    //call the super class constructor
    H.ui.Control.call(this);

    //bind functions to this instance
    this.startRect = bindJs_(this.startRect, this);
    this.updateRect = bindJs_(this.updateRect, this);
    this.endRect = bindJs_(this.endRect, this);
    this.cancelRect = bindJs_(this.cancelRect, this);

    this.rectState_ = null;

    this.button = new H.ui.base.PushButton({
      label: icon,
      onStateChange: bindJs_(this.onButtonStateChange_, this)
    });
    this.addChild(this.button);

    this.setAlignment('right-middle');
  };
  inherits(ZoomToRectangle, H.ui.Control);

  ZoomToRectangle.prototype.onButtonStateChange_ = function(evt)
  {
	this.setZoomActive(evt['target'].getState() === 'down');
  }
  
  ZoomToRectangle.prototype.setZoomActive = function(active) {
    if(active != this.active_) {
      if(active && this.parent && this.layer) {
        this.parent.insertBefore(this.layer, this.parent.lastChild);
      } else if(!active && this.parent && this.layer) {
        this.parent.removeChild(this.layer);
      }
      this.active_ = active;
    }
  };

  ZoomToRectangle.prototype.renderInternal = function(element, doc) {
    H.ui.Control.prototype.renderInternal.call(this, element, doc);

    this.layer = doc.createElement('div');
    this.layer.style.position = 'absolute';
    this.layer.style.height = '100%';
    this.layer.style.width = '100%';
    this.layer.style.background = 'rgba(255, 255, 255, 0.1)';
    this.layer.style.cursor = 'zoom-in';

    this.rect = doc.createElement('div');
    this.rect.style.position = 'absolute';
    this.rect.style.border = '4px dotted #4A5B65';
    this.rect.style.cursor = 'zoom-in';

    this.parent = map.getElement();

    this.layer.addEventListener('mousedown', this.startRect);
    this.layer.addEventListener('mouseup', this.endRect);
    return this;
  };

  ZoomToRectangle.prototype.findOffset = function(element) {
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

  ZoomToRectangle.prototype.startRect = function(evt) {
    var offset = this.findOffset(this.layer);
    this.rectState_ = {
      offset: offset,
      top: evt.pageY - offset.y,
      bottom: evt.pageY - offset.y,
      left: evt.pageX - offset.x,
      right: evt.pageX - offset.x,
      width: 0,
      height: 0
    };

    this.rect.style.top = this.rectState_.top + "px";
    this.rect.style.left = this.rectState_.left + "px";
    this.rect.style.width = '0';
    this.rect.style.height = '0';
    this.layer.appendChild(this.rect);

    this.layer.addEventListener('mousemove', this.updateRect);
    ;
  };
  ZoomToRectangle.prototype.updateRect = function(evt) {
    var temp;
    if(this.rectState_) {
      this.rectState_.bottom = evt.pageY - this.rectState_.offset.y;
      this.rectState_.right = evt.pageX - this.rectState_.offset.x;

      this.rectState_.width = (this.rectState_.right - this.rectState_.left) - 1;
      this.rectState_.height = (this.rectState_.bottom - this.rectState_.top) - 1;

      this.rect.style.width = this.rectState_.width + 'px';
      this.rect.style.height = this.rectState_.height + 'px';
    }
  },
  ZoomToRectangle.prototype.endRect = function(evt) {
    this.updateRect(evt);
    if(this.rectState_.width > 10 && this.rectState_.height > 10) {
      var map = this.getMap(),
          tl, br;
      if(map) {
        tl = map.screenToGeo(this.rectState_.left, this.rectState_.top);
        br = map.screenToGeo(this.rectState_.right, this.rectState_.bottom);
		// JS API 3.1 has different name for the function
	   if (typeof map.setViewBounds === "function") { 
			map.setViewBounds(H.geo.Rect.fromPoints(tl, br), true);
		}else{
			// zoom to marathon track using bounds
			map.getViewModel().setLookAtData({
					bounds: H.geo.Rect.fromPoints(tl, br)
			});
		}
		
      }
    }
    this.cancelRect();
  };
  ZoomToRectangle.prototype.cancelRect = function() {
    this.layer.removeEventListener('mousemove', this.updateRect);
    this.layer.removeChild(this.rect);
    this.rectState_ = null;
    this.button.setState('up');
  };

  H.ui.ZoomToRectangle = ZoomToRectangle;
})();
