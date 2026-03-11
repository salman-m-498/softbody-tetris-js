/**
 * GameObject.js
 * Base class for every object in the game world.
 *
 * Extends the world-space Point concept — position (x, y) IS the center of the object.
 * Width and height describe the local-space bounding box around that center.
 *
 * Features:
 *  - World-space center position (x, y)
 *  - Rotation (radians)
 *  - Axis-aligned broad bounds for cheap culling
 *  - Rotated corner vertices for SAT collision
 *  - Point utilities: corners, center, connecting helpers
 *  - Lifecycle hooks: update(dt), draw(ctx)
 *  - Optional tag/name for identification
 */

import { Point }     from '../core/Point.js';
import { Rectangle } from '../core/Rectangle.js';

export class GameObject {
    /**
     * @param {number} x        World-space center X
     * @param {number} y        World-space center Y
     * @param {number} width    Local bounding box width
     * @param {number} height   Local bounding box height
     * @param {number} rotation Rotation in radians
     */
    constructor(x = 0, y = 0, width = 0, height = 0, rotation = 0) {
        this.x        = x;
        this.y        = y;
        this.width    = width;
        this.height   = height;
        this.rotation = rotation;        // radians

        this.active   = true;   // set false to skip update/draw
        this.visible  = true;   // set false to skip draw only
        this.name     = '';     // optional identifier tag
    }

    // ── Center ────────────────────────────────────────────────────────────────

    /** Center as a Point instance. */
    get center() {
        return new Point(this.x, this.y);
    }

    set center(p) {
        this.x = p.x;
        this.y = p.y;
    }

    // ── Corners (local-space, relative to center) ─────────────────────────────

    /**
     * Four corners of the bounding box in local space (un-rotated).
     * Origin is the center of the object.
     */
    get localCorners() {
        const hw = this.width  / 2;
        const hh = this.height / 2;
        return [
            new Point(-hw, -hh),  // top-left
            new Point( hw, -hh),  // top-right
            new Point( hw,  hh),  // bottom-right
            new Point(-hw,  hh),  // bottom-left
        ];
    }

    // ── Vertices (world-space, rotated) ──────────────────────────────────────

    /**
     * Rotated world-space vertices for SAT collision.
     * Matches the pattern from Fwoggy-Flick's getVertices().
     */
    getVertices() {
        return this.localCorners.map(lp => this._rotateLocalPoint(lp));
    }

    /**
     * Rotate a local-space Point into world space around this object's center.
     */
    _rotateLocalPoint(localPt) {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        return new Point(
            this.x + localPt.x * cos - localPt.y * sin,
            this.y + localPt.x * sin + localPt.y * cos
        );
    }

    /**
     * Legacy-compatible helper: rotate a raw (px, py) local offset into world space.
     */
    rotatePoint(px, py) {
        return this._rotateLocalPoint(new Point(px, py));
    }

    // ── Bounds ────────────────────────────────────────────────────────────────

    /**
     * Axis-aligned bounding box of the rotated object.
     * Useful as the broad-phase step before SAT.
     */
    getBroadBounds() {
        if (this.rotation === 0) {
            return {
                left:   this.x - this.width  / 2,
                right:  this.x + this.width  / 2,
                top:    this.y - this.height / 2,
                bottom: this.y + this.height / 2,
            };
        }
        const diagonal = Math.sqrt(this.width ** 2 + this.height ** 2);
        const half = diagonal / 2;
        return {
            left:   this.x - half,
            right:  this.x + half,
            top:    this.y - half,
            bottom: this.y + half,
        };
    }

    /**
     * Rectangle representation of the axis-aligned broad bounds.
     */
    getBroadRect() {
        const b = this.getBroadBounds();
        return new Rectangle(b.left, b.top, b.right - b.left, b.bottom - b.top);
    }

    /**
     * Tight AABB (no rotation) as a Rectangle — useful when rotation doesn't matter.
     */
    getAABB() {
        return new Rectangle(this.x - this.width / 2, this.y - this.height / 2,
                             this.width, this.height);
    }

    // ── Point connection helpers ──────────────────────────────────────────────

    /**
     * Point-to-point distance from this object's center to another's.
     * Accepts another GameObject or any {x, y}.
     */
    distanceTo(other) {
        return this.center.distanceTo(other instanceof GameObject ? other.center : other);
    }

    /**
     * Angle (radians) from this center toward another object/point.
     */
    angleTo(other) {
        return this.center.angleTo(other instanceof GameObject ? other.center : other);
    }

    /**
     * Midpoint between this center and another object's center.
     */
    midpointTo(other) {
        return this.center.midpointTo(other instanceof GameObject ? other.center : other);
    }

    /**
     * Unit direction vector from this center toward another object/point.
     */
    directionTo(other) {
        return this.center.directionTo(other instanceof GameObject ? other.center : other);
    }

    /**
     * Whether this object's broad bounds overlap with another's.
     */
    isNear(other) {
        const a = this.getBroadBounds();
        const b = other.getBroadBounds();
        return a.left < b.right && a.right > b.left &&
               a.top  < b.bottom && a.bottom > b.top;
    }

    /**
     * Whether a Point (or {x,y}) is inside this object's unrotated AABB.
     */
    containsPoint(p) {
        return this.getAABB().containsPoint(p);
    }

    // ── Interpolation / movement helpers ─────────────────────────────────────

    /**
     * Move the object toward a target position at `speed` units per second.
     * Stops exactly at target when overshoot would occur.
     */
    moveToward(targetX, targetY, speed, dt) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        const step = Math.min(speed * dt, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
    }

    /**
     * Linearly interpolate position toward (tx, ty). t ∈ [0,1] per frame —
     * useful for smooth follow (lerp the position every update).
     */
    lerpPosition(tx, ty, t) {
        this.x += (tx - this.x) * t;
        this.y += (ty - this.y) * t;
    }

    // ── Lifecycle (override in subclasses) ────────────────────────────────────

    /**
     * Override to implement per-frame game logic.
     * @param {number} dt  Delta time in seconds
     */
    update(dt) {}

    /**
     * Override to draw the object onto the canvas context.
     * ctx.save() / ctx.restore() are handled automatically by the Renderer.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {}

    // ── Debug ─────────────────────────────────────────────────────────────────

    /**
     * Draw debug overlay: center dot, bounding box, vertices.
     * Call from your debug render pass.
     */
    drawDebug(ctx) {
        // Broad bounds
        const b = this.getBroadBounds();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,0,0.5)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);

        // Rotated vertices
        const verts = this.getVertices();
        ctx.strokeStyle = 'rgba(0,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.stroke();

        // Center dot
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
