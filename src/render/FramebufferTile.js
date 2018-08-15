/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports FramebufferTile
 * @version $Id: FramebufferTile.js 3345 2015-07-28 20:28:35Z dcollins $
 */
define([
        '../error/ArgumentError',
        '../render/FramebufferTexture',
        '../util/Logger',
        '../geom/Matrix',
        '../geom/Rectangle',
        '../render/TextureTile'
    ],
    function (ArgumentError,
              FramebufferTexture,
              Logger,
              Matrix,
              Rectangle,
              TextureTile) {
        "use strict";

        /**
         * Constructs a framebuffer tile.
         * @alias FramebufferTile
         * @constructor
         * @augments TextureTile
         * @classdesc Represents a WebGL framebuffer applied to a portion of a globe's terrain. The framebuffer's width
         * and height in pixels are equal to this tile's [tileWidth]{@link FramebufferTile#tileWidth} and
         * [tileHeight]{@link FramebufferTile#tileHeight}, respectively. The framebuffer can be made active by calling
         * [bindFramebuffer]{@link FramebufferTile#bindFramebuffer}. Color fragments written to this
         * tile's framebuffer can then be drawn on the terrain surface using a
         * [SurfaceTileRenderer]{@link SurfaceTileRenderer}.
         * <p>
         * This class is meant to be used internally. Applications typically do not interact with this class.
         * @param {Sector} sector The sector this tile covers.
         * @param {Level} level The level this tile is associated with.
         * @param {Number} row This tile's row in the associated level.
         * @param {Number} column This tile's column in the associated level.
         * @param {String} cacheKey A string uniquely identifying this tile relative to other tiles.
         * @throws {ArgumentError} If the specified sector or level is null or undefined, the row or column arguments
         * are less than zero, or the cache name is null, undefined or empty.
         */
        var FramebufferTile = function (sector, level, row, column, cacheKey) {
            if (!cacheKey || (cacheKey.length < 1)) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "FramebufferTile", "constructor",
                        "The specified cache name is null, undefined or zero length."));
            }

            TextureTile.call(this, sector, level, row, column); // args are checked in the superclass' constructor

            // Assign the cacheKey as the gpuCacheKey (inherited from TextureTile).
            this.gpuCacheKey = cacheKey;

            // Internal. Intentionally not documented.
            this.textureTransform = Matrix.fromIdentity().setToUnitYFlip();

            // Internal. Intentionally not documented.
            this.mustClear = true;
        };

        FramebufferTile.prototype = Object.create(TextureTile.prototype);

        /**
         * Causes this tile to clear any color fragments written to its off-screen framebuffer.
         * @param dc The current draw context.
         */
        FramebufferTile.prototype.clearFramebuffer = function (dc) {
            this.mustClear = true;
        };

        /**
         * Causes this tile's off-screen framebuffer as the current WebGL framebuffer. WebGL operations that affect the
         * framebuffer now affect this tile's framebuffer, rather than the default WebGL framebuffer.
         * Color fragments are written to this tile's WebGL texture, which can be made active by calling
         * [SurfaceTile.bind]{@link SurfaceTile#bind}.
         *
         * @param {DrawContext} dc The current draw context.
         * @returns {Boolean} true if the framebuffer was bound successfully, otherwise false.
         */
        FramebufferTile.prototype.bindFramebuffer = function (dc) {
            var framebuffer = dc.gpuResourceCache.resourceForKey(this.gpuCacheKey);

            if (!framebuffer) {
                framebuffer = this.createFramebuffer(dc);
            }

            dc.bindFramebuffer(framebuffer);

            if (this.mustClear) {
                this.doClearFramebuffer(dc);
                this.mustClear = false;
            }

            return true;
        };

        // Internal. Intentionally not documented.
        FramebufferTile.prototype.createFramebuffer = function (dc) {
            var framebuffer = new FramebufferTexture(dc.currentGlContext, this.tileWidth, this.tileHeight, false);
            dc.gpuResourceCache.putResource(this.gpuCacheKey, framebuffer, framebuffer.size);

            return framebuffer;
        };

        // Internal. Intentionally not documented.
        FramebufferTile.prototype.doClearFramebuffer = function (dc) {
            var gl = dc.currentGlContext;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        };

        /**
         * Applies the appropriate texture transform to display this tile's WebGL texture.
         * @param {DrawContext} dc The current draw context.
         * @param {Matrix} matrix The matrix to apply the transform to.
         */
        FramebufferTile.prototype.applyInternalTransform = function (dc, matrix) {
            matrix.multiplyMatrix(this.textureTransform);
        };

        return FramebufferTile;
    });