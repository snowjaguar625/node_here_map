/*
	author Mykyta
	(C) HERE 2019
*/

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
    '<svg version="1.1" class="H_icon" viewBox="0 0 20 20">' +
	'<path fill-rule="evenodd" d="M1 1v6h2V3h4V1H1zm2 12H1v6h6v-2H3v-4zm14 4h-4v2h6v-6h-2v4zm0-16h-4v2h4v4h2V1h-2z"/>' +
	'</svg>';
	
  var FullScreen = function() {
    //call the super class constructor
    H.ui.Control.call(this);

    this.button = new H.ui.base.PushButton({
      label: icon,
      onStateChange: bindJs_(this.onButtonStateChange_, this)
    });
    this.addChild(this.button);

    this.setAlignment('right-middle');
  };
  inherits(FullScreen, H.ui.Control);

  FullScreen.prototype.onButtonStateChange_ = function(evt)
  {
	if(evt['target'].getState() === 'down')
	{
		var map = this.getMap(),
			mapContainer = map.getElement();
		
		if (mapContainer.requestFullscreen)
		{
			mapContainer.requestFullscreen();
		}
		else if (mapContainer.mozRequestFullScreen)
		{
			/* Firefox */
			mapContainer.mozRequestFullScreen();
		}
		else if (mapContainer.webkitRequestFullscreen)
		{
			/* Chrome, Safari and Opera */
			mapContainer.webkitRequestFullscreen();
		}
		else if (mapContainer.msRequestFullscreen)
		{
			/* IE/Edge */
			mapContainer.msRequestFullscreen();
		}
	}
	else 
	{
		if (document.exitFullscreen)
		{
			document.exitFullscreen();
		}
		else if (document.mozCancelFullScreen)
		{
			/* Firefox */
			document.mozCancelFullScreen();
		}
		else if (document.webkitExitFullscreen)
		{
			/* Chrome, Safari and Opera */
			document.webkitExitFullscreen();
		}
		else if (document.msExitFullscreen)
		{
			/* IE/Edge */
			document.msExitFullscreen();
		}
	}		
  }

  H.ui.FullScreen = FullScreen;
})();
