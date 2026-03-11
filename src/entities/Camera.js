/**
 * Camera.js
 * 2D scrolling / follow camera.
 *
 * Usage:
 *   const cam = new Camera(canvas.width, canvas.height);
 *   cam.follow(player, dt);          // smooth follow
 *
 *   // Wrap your draw calls:
 *   cam.begin(ctx);
 *   // ... draw world objects ...
 *   cam.end(ctx);
 *
 *   // Convert between screen and world space:
 *   const worldPos = cam.screenToWorld(mouseX, mouseY);
 *   const screenPos = cam.worldToScreen(obj.x, obj.y);
 */

import { Point } from '../core/Point.js';

export class Camera {
    /**
     * @param {number} viewWidth   Canvas/viewport width
     * @param {number} viewHeight  Canvas/viewport height
     */
    constructor(viewWidth, viewHeight) {
        this.viewWidth  = viewWidth;
        this.viewHeight = viewHeight;

        // Current camera center in world space
        this.x = viewWidth  / 2;
        this.y = viewHeight / 2;

        this.zoom = 1;

        // Screen-shake state
        this._shakeIntensity = 0;
        this._shakeDuration  = 0;
        this._shakeOffsetX   = 0;
        this._shakeOffsetY   = 0;

        // Dead-zone for follow (pixels around target center to ignore)
        this.deadZone = 0;
    }

    // ── Follow ────────────────────────────────────────────────────────────────

    /**
     * Smoothly follow a target {x, y}.
     * @param {object} target  Any object with .x and .y
     * @param {number} dt      Delta time in seconds
     * @param {number} speed   Lerp speed (higher = snappier). Default 5.
     */
    follow(target, dt, speed = 5) {
        const t   = 1 - Math.exp(-speed * dt);
        const dx  = target.x - this.x;
        const dy  = target.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.deadZone) {
            this.x += dx * t;
            this.y += dy * t;
        }
    }

    /** Immediately snap to a position. */
    snapTo(x, y) {
        this.x = x;
        this.y = y;
    }

    // ── World bounds clamping ─────────────────────────────────────────────────

    /**
     * Clamp the camera so it never shows outside the world rectangle.
     */
    clampToBounds(worldX, worldY, worldWidth, worldHeight) {
        const hw = (this.viewWidth  / this.zoom) / 2;
        const hh = (this.viewHeight / this.zoom) / 2;
        this.x = Math.max(worldX + hw, Math.min(worldX + worldWidth  - hw, this.x));
        this.y = Math.max(worldY + hh, Math.min(worldY + worldHeight - hh, this.y));
    }

    // ── Screen-shake ──────────────────────────────────────────────────────────

    shake(intensity, duration) {
        this._shakeIntensity = intensity;
        this._shakeDuration  = duration;
    }

    // ── Transform application ─────────────────────────────────────────────────

    /**
     * Apply camera transform to canvas context. Call before drawing the world.
     */
    begin(ctx) {
        ctx.save();
        ctx.translate(
            this.viewWidth  / 2 - this.x * this.zoom + this._shakeOffsetX,
            this.viewHeight / 2 - this.y * this.zoom + this._shakeOffsetY
        );
        if (this.zoom !== 1) ctx.scale(this.zoom, this.zoom);
    }

    /**
     * Restore canvas context after drawing world objects.
     */
    end(ctx) {
        ctx.restore();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(dt) {
        if (this._shakeDuration > 0) {
            this._shakeDuration -= dt;
            const i = this._shakeIntensity * (this._shakeDuration > 0 ? 1 : 0);
            this._shakeOffsetX = (Math.random() * 2 - 1) * i;
            this._shakeOffsetY = (Math.random() * 2 - 1) * i;
            if (this._shakeDuration <= 0) {
                this._shakeOffsetX = 0;
                this._shakeOffsetY = 0;
                this._shakeIntensity = 0;
            }
        }
    }

    // ── Coordinate conversion ─────────────────────────────────────────────────

    screenToWorld(sx, sy) {
        return new Point(
            (sx - this.viewWidth  / 2) / this.zoom + this.x,
            (sy - this.viewHeight / 2) / this.zoom + this.y
        );
    }

    worldToScreen(wx, wy) {
        return new Point(
            (wx - this.x) * this.zoom + this.viewWidth  / 2,
            (wy - this.y) * this.zoom + this.viewHeight / 2
        );
    }

    /** Is this world-space rectangle visible in the viewport? */
    isVisible(x, y, width, height) {
        const tl = this.worldToScreen(x, y);
        const br = this.worldToScreen(x + width, y + height);
        return br.x > 0 && tl.x < this.viewWidth &&
               br.y > 0 && tl.y < this.viewHeight;
    }
}
