/**
 * Rectangle.js
 * Axis-aligned bounding rectangle — used for broad-phase collision and layout.
 *
 * Also provides static helpers for computing bounding boxes from point arrays.
 */

import { Point } from './Point.js';

export class Rectangle {
    /**
     * @param {number} x      Left edge
     * @param {number} y      Top edge
     * @param {number} width
     * @param {number} height
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    static fromCenter(cx, cy, width, height) {
        return new Rectangle(cx - width / 2, cy - height / 2, width, height);
    }

    static fromPoints(p1, p2) {
        const minX = Math.min(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        return new Rectangle(minX, minY, Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    }

    /** Tight bounding box around an array of points. */
    static fromPointArray(points) {
        if (!points.length) return new Rectangle();
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    // ── Derived properties ────────────────────────────────────────────────────

    get left()   { return this.x; }
    get right()  { return this.x + this.width; }
    get top()    { return this.y; }
    get bottom() { return this.y + this.height; }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
    get center()  { return new Point(this.centerX, this.centerY); }

    get topLeft()     { return new Point(this.left,  this.top); }
    get topRight()    { return new Point(this.right, this.top); }
    get bottomLeft()  { return new Point(this.left,  this.bottom); }
    get bottomRight() { return new Point(this.right, this.bottom); }

    get corners() {
        return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
    }

    get perimeter() {
        return 2 * (this.width + this.height);
    }

    get area() {
        return this.width * this.height;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    containsPoint(p) {
        return p.x >= this.left && p.x <= this.right &&
               p.y >= this.top  && p.y <= this.bottom;
    }

    intersects(other) {
        return this.left < other.right  &&
               this.right > other.left  &&
               this.top   < other.bottom &&
               this.bottom > other.top;
    }

    contains(other) {
        return other.left >= this.left && other.right  <= this.right &&
               other.top  >= this.top  && other.bottom <= this.bottom;
    }

    // ── Transforms ────────────────────────────────────────────────────────────

    /** Return a new rectangle expanded outward on all sides by `amount`. */
    expand(amount) {
        return new Rectangle(this.x - amount, this.y - amount,
                             this.width + 2 * amount, this.height + 2 * amount);
    }

    /** Return the overlapping region of two rectangles, or null if none. */
    intersection(other) {
        const left   = Math.max(this.left,   other.left);
        const top    = Math.max(this.top,    other.top);
        const right  = Math.min(this.right,  other.right);
        const bottom = Math.min(this.bottom, other.bottom);
        if (right < left || bottom < top) return null;
        return new Rectangle(left, top, right - left, bottom - top);
    }

    /** Smallest rectangle that contains both this and other. */
    union(other) {
        const left   = Math.min(this.left,   other.left);
        const top    = Math.min(this.top,    other.top);
        const right  = Math.max(this.right,  other.right);
        const bottom = Math.max(this.bottom, other.bottom);
        return new Rectangle(left, top, right - left, bottom - top);
    }

    translate(dx, dy) {
        return new Rectangle(this.x + dx, this.y + dy, this.width, this.height);
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    toString() {
        return `Rect(${this.x}, ${this.y}, ${this.width}×${this.height})`;
    }
}
