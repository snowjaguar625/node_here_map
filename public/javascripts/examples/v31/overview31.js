/* 
	author domschuette
	(C) HERE 2014
*/

(function() {
    var mapsjs = mapsjs || H;
    var icon =
        '<svg version="1.1" class="H_icon" viewBox="0 0 26 26">' +
        '<path d="M4 4 L22 4 L22 22 L4 22 L4 4 Z" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
        '<path d="M6 8 L18 8 L18 12 L12 12 L12 18 L7 18 L7 8" stroke="rgb(0,0,0)" stroke-width="2" fill="none"/>' +
        '</svg>';

    var zoomdiff = 4;

    var Overview = function() {
        //call the super class constructor
        H.ui.Control.call(this);

        //bind functions to this instance
        this.onButtonStateChange_ = (function() {
            this.setActive(this.button.getState() === 'down');
        }).bind(this);

        this.button = new mapsjs.ui.base.PushButton({
            label: icon,
            onStateChange: this.onButtonStateChange_,
            tooltip: "Overview Map"
        });

        this.addChild(this.button);

        this.setAlignment('right-bottom');
    };

    inherits(Overview, H.ui.Control);

    Overview.prototype.setActive = function(active) {
        if (active != this.active_) {
            if (active && this.parent) {
                this.wrapper = document.createElement('div');
                this.wrapper.style.width = '100%';
                this.wrapper.style.height = '100%';
                this.wrapper.style.display = 'block';
                this.wrapper.style.position = 'absolute';
                this.wrapper.style.padding = '0px';
                this.wrapper.style.webkitUserSelect = "none";

                this.layer = document.createElement('div');
                this.layer.id = 'minimap';
                this.layer.style.width = '250px';
                this.layer.style.height = '250px';
                this.layer.style.margin = 0;
                this.layer.style.padding = 0;
                this.layer.style.right = '38px';
                this.layer.style.bottom = '42px';
                this.layer.style.position = 'absolute';
                this.layer.style.border = '3px solid white';
                this.layer.style.borderRadius = '3px';
                this.layer.style.boxShadow = '0 0 5px black';
                this.layer.style.display = 'block';
                this.layer.style.backgroundColor = 'white';
                this.layer.style.webkitUserSelect = "none";

                this.layer.appendChild(this.wrapper);

                this.parent.insertBefore(this.layer, this.parent.lastChild);

                minimap = new H.Map(this.wrapper, maptypes.vector.normal.map, {
                    center: map.getCenter(),
                    zoom: map.getZoom() - zoomdiff,
                    pixelRatio: window.devicePixelRatio || 1,
                    imprint: null
                });
                map.addEventListener('mapviewchange', this.sync);
                map.addEventListener('baselayerchange', this.baselayerchange);
            } else if (!active && this.parent && this.layer) {
                this.parent.removeChild(this.layer);
                map.removeEventListener('mapviewchange', this.sync);
            }
            this.active_ = active;
        }
    };

    Overview.prototype.renderInternal = function(element, doc) {
        H.ui.Control.prototype.renderInternal.call(this, element, doc);
        this.parent = map.getElement();
    }

    Overview.prototype.sync = function() {
        if (minimap) {
            minimap.setCenter(this.getCenter());
            minimap.setZoom(this.getZoom() - zoomdiff);
        }
    }

    Overview.prototype.baselayerchange = function() {
        if (minimap) {
            minimap.setBaseLayer(this.getBaseLayer());
        }
    }

    H.ui.Overview = Overview;
})();