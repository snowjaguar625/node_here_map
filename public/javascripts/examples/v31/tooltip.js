/*
author Mykyta
(C) HERE 2019
*/

(function (ctx)
{
	// ensure CSS is injected
	var tooltipStyleNode = ctx.createElement('style'),
		css = '#nm_tooltip{' +
		' color:white;' +
		' background:black;' +
		' border: 1px solid grey;' +
		' padding-left: 1em; ' +
		' padding-right: 1em; ' +
		' display: none;  ' +
		' min-width: 120px;  ' +
		'}';

	tooltipStyleNode.type = 'text/css';
	if(tooltipStyleNode.styleSheet)
	{ // IE
		tooltipStyleNode.styleSheet.cssText = css;
	}
	else
	{
		tooltipStyleNode.appendChild(ctx.createTextNode(css));
	}
	
	if(ctx.body)
	{
		ctx.body.appendChild(tooltipStyleNode);
	}
	else if(ctx.addEventListener)
	{
		ctx.addEventListener('DOMContentLoaded',  function () 
		{
			ctx.body.appendChild(tooltipStyleNode);
		}, false);
	}
	else
	{
		ctx.attachEvent('DOMContentLoaded',  function ()
		{
			ctx.body.appendChild(tooltipStyleNode);
		});
	}
})(document);

Object.defineProperty(Tooltip.prototype, 'visible',
{
	get: function()
	{
		return this._visible;
	},
	set: function(visible)
	{
		this._visible = visible;
		this.tooltip.style.display = visible ? 'block' : 'none';
	}
});

function Tooltip(map)
{
	var that = this;
	that.map = map;
	that.tooltip  = document.createElement('div');
	that.tooltip.id = 'nm_tooltip';
	that.tooltip.style.position = 'absolute';
	// obj = null,
	showTooltip = function (obj)
	{
		var point = that.map.geoToScreen(obj.getGeometry()),
			left = point.x - (that.tooltip.offsetWidth / 2),
			top = point.y + 1; // Slight offset to avoid flicker.
		that.tooltip.style.left = left + 'px';
		that.tooltip.style.top = top + 'px';
		that.visible = true;
		that.tooltip.innerHTML =  obj.title;
	};

	map.getElement().appendChild(that.tooltip);
	map.addEventListener('pointermove', function (evt)
	{
		map.getObjectAt(evt.currentPointer.viewportX, evt.currentPointer.viewportY, (obj) => 
		{
			if (obj && obj instanceof H.map.Marker && obj.title)
			{
				showTooltip(obj);
			}
			else
			{
				that.visible = false;
			}
		});
	});

	map.addEventListener('tap', function (evt)
	{
		that.tooltip.visible  = false;
	});
  
	map.addEventListener('drag', function (evt)
	{
		if (that.visible)
		{
			showTooltip();
		}
	});
};