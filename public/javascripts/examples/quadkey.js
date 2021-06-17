/*
------------------------------------------------------------------------------
 <copyright company="Microsoft">
     Copyright (c) 2006-2009 Microsoft Corporation.  All rights reserved.
 </copyright>

 Ported from C# code 
 http://msdn.microsoft.com/en-us/library/bb259689.aspx
------------------------------------------------------------------------------
*/
(function () {
    'use strict';
    var highestLevelOfDetail;

	if (H.service.Platform.prototype.ext === undefined) {
        H.service.Platform.prototype.ext = {};
    }
	if (H.service.Platform.prototype.ext.tooling === undefined) {
		H.service.Platform.prototype.ext.tooling = {};
	}

	H.service.Platform.prototype.ext.tooling.quadKey = function () {
		return new QuadKey();
	}
	
    function QuadKey() {
		this.highestLevelOfDetail = 23;
    }	
    /**
     * Clips a number to the specified minimum and maximum values.
     *
     * @param n        The number to clip.
     * @param minValue Minimum allowable value.
     * @param maxValue Maximum allowable value.
     * @return The clipped value.
     */
    QuadKey.prototype.clip = function( n, minValue, maxValue ) {
        return Math.min( Math.max( n, minValue ), maxValue );
    }

    /**
     * Determines the map width and height (in pixels) at a specified level of detail.
     *
     * @param levelOfDetail Level of detail, from 1 (lowest detail) to 23 (highest detail).
     * @return The map width and height in pixels.
     */
    QuadKey.prototype.mapSize= function( levelOfDetail ) {
        return 256 << levelOfDetail;
    }

    /**
     * Converts a pixel from pixel XY coordinates at a specified level of detail
     * into latitude/longitude WGS-84 coordinates (in degrees).
     *
     * @param pixelX        X coordinate of the point, in pixels.
     * @param pixelY        Y coordinates of the point, in pixels.
     * @param levelOfDetail Level of detail, from 1 (lowest detail) to 23 (highest detail).
     * @return array of doubles    [ latitude, longitude ]
     */
    QuadKey.prototype.pixelXYToLatLong= function( pixelX, pixelY, levelOfDetail) {
        var mapSize = this.mapSize(levelOfDetail);
        var x = (this.clip(pixelX, 0, mapSize - 1) / mapSize) - 0.5;
        var y = 0.5 - (this.clip(pixelY, 0, mapSize - 1) / mapSize);

        var latitude = 90 - 360 * Math.atan( Math.exp( -y * 2 * Math.PI ) ) / Math.PI;
        var longitude = 360 * x;

        return [ latitude, longitude ];
    }


    /**
     * Converts tile XY coordinates into pixel XY coordinates of the upper-left pixel
     * of the specified tile.
     *
     * @param tileX (int)
     * @param tileY (int)
     * @return array of ints [pixelX, pixelY]
     */
    QuadKey.prototype.tileXYToPixelXY= function( tileX, tileY ) {
        return [ tileX * 256, tileY * 256 ];
    }


    /**
     * Converts a QuadKey into tile XY coordinates.
     *
     * @param quadKey (String)
     * @return array of ints [tileX, tileY, levelOfDetail]
	 * @throws Error
     */
    QuadKey.prototype.quadKeyToTileXY = function( quadKey ) {

        if (quadKey == null || quadKey.length == 0 || quadKey.length > highestLevelOfDetail)
            throw new Error("QuadKey cannot be empty");

        var tileX = 0;
        var tileY = 0;
        var levelOfDetail = quadKey.length;
        for (var i = levelOfDetail; i > 0; i--) {
            var mask = 1 << (i - 1);
            switch ( quadKey.charAt(levelOfDetail - i) ) {
                case '0':
                    break;

                case '1':
                    tileX |= mask;
                    break;

                case '2':
                    tileY |= mask;
                    break;

                case '3':
                    tileX |= mask;
                    tileY |= mask;
                    break;

                default:
                    throw new Error("Invalid QuadKey: " + quadKey );
            }
        }
        return [tileX, tileY, levelOfDetail];
    }


    /**
     * Returns the bounding box of a QuadKey, in WGS84 degrees.
     *
     * @param quadKey (String)
     * @return double[0]    [ Upper Left latitude, Upper Left longitude, Lower Right latitude, Lower Right	longitude ]
     * @throws Error
     */
    QuadKey.prototype.quadKeyToBBox = function( quadKey ) {

        var keyToTile = this.quadKeyToTileXY(quadKey);
        var tileX = keyToTile[0];
        var tileY = keyToTile[1];
        var levelOfDetail = keyToTile[2];

        //upper left
        var pixel = this.tileXYToPixelXY( tileX, tileY );
        var latlonUL = this.pixelXYToLatLong( pixel[0], pixel[1], levelOfDetail );
        var latlonLR = this.pixelXYToLatLong(
                pixel[0] + 256,
                pixel[1] + 256,
                levelOfDetail);

        return [ latlonUL[0], latlonLR[0], latlonUL[1], latlonLR[1] ];
    }
	
    QuadKey.prototype.quadKeyToHGeoRect = function( quadKey ) {
		var bbox= this.quadKeyToBBox( quadKey );
		return  new H.geo.Rect( bbox[0], bbox[2], bbox[1], bbox[3] );
    }
	
})();
