/**
 * Point.js
 * A 2D point with a rich set of geometry utilities.
 *
 * Designed for game development: connecting points, finding centers, 
 * measuring distances, line intersections, and more.
 *
 * All methods that take another Point also accept plain {x, y} objects.
 */

export class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    /** Create a Point from a plain {x, y} object. */
    static from({ x, y }) {
        return new Point(x, y);
    }

    /** Create a Point from a polar (angle, radius) pair. */
    static fromPolar(angle, radius) {
        return new Point(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }

    /** Return a new (0, 0) origin point. */
    static zero() {
        return new Point(0, 0);
    }

    /** Create a Point from an array [x, y]. */
    static fromArray([x, y]) {
        return new Point(x, y);
    }

    // ── Copying / conversion ──────────────────────────────────────────────────

    clone() {
        return new Point(this.x, this.y);
    }

    toArray() {
        return [this.x, this.y];
    }

    toString() {
        return `Point(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    // ── Basic arithmetic (returns new Point) ──────────────────────────────────

    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }

    scale(factor) {
        return new Point(this.x * factor, this.y * factor);
    }

    negate() {
        return new Point(-this.x, -this.y);
    }

    /** Floor both components to the nearest integer. Useful for pixel-snapping. */
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }

    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }

    // ── In-place mutation (returns this for chaining) ─────────────────────────

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copyFrom(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    addInPlace(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    subtractInPlace(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    scaleInPlace(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    // ── Distance & length ─────────────────────────────────────────────────────

    /** Euclidean distance to another point. */
    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Squared distance — cheaper when you only need comparisons. */
    distanceToSq(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return dx * dx + dy * dy;
    }

    /** Manhattan distance (grid distance). */
    manhattanDistanceTo(other) {
        return Math.abs(other.x - this.x) + Math.abs(other.y - this.y);
    }

    /** Length of this point treated as a vector from origin. */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magnitudeSq() {
        return this.x * this.x + this.y * this.y;
    }

    // ── Angles ────────────────────────────────────────────────────────────────

    /** Angle (radians) from this point toward another. 0 = right, PI/2 = down. */
    angleTo(other) {
        return Math.atan2(other.y - this.y, other.x - this.x);
    }

    /** Angle (radians) of this point as a vector from origin. */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    // ── Midpoint & centroid ───────────────────────────────────────────────────

    /** Return the midpoint between this and another point. */
    midpointTo(other) {
        return new Point((this.x + other.x) / 2, (this.y + other.y) / 2);
    }

    /**
     * Centroid of an array of points (static).
     * @param {Array<Point|{x,y}>} points
     * @returns {Point}
     */
    static centroid(points) {
        if (!points.length) return new Point(0, 0);
        let sx = 0, sy = 0;
        for (const p of points) { sx += p.x; sy += p.y; }
        return new Point(sx / points.length, sy / points.length);
    }

    /**
     * Bounding-box center of an array of points (static).
     * Finds the center of the axis-aligned box that contains all points.
     */
    static boundingCenter(points) {
        if (!points.length) return new Point(0, 0);
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        return new Point((minX + maxX) / 2, (minY + maxY) / 2);
    }

    // ── Interpolation ─────────────────────────────────────────────────────────

    /** Linear interpolation from this point toward another. t=0 → this, t=1 → other. */
    lerp(other, t) {
        return new Point(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t
        );
    }

    /** Smooth-step (ease in/out) interpolation. */
    smoothstep(other, t) {
        const s = t * t * (3 - 2 * t);
        return this.lerp(other, s);
    }

    // ── Direction & projection ────────────────────────────────────────────────

    /**
     * Return a unit-length direction vector from this point toward another.
     * Returns (0,0) if the points are identical.
     */
    directionTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return new Point(0, 0);
        return new Point(dx / len, dy / len);
    }

    /** Normalize this point as if it were a vector. Returns new Point. */
    normalize() {
        const len = this.magnitude();
        if (len === 0) return new Point(0, 0);
        return new Point(this.x / len, this.y / len);
    }

    /** Dot product of this point (as vector) with another. */
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    /** 2D cross product (scalar z of 3D cross). Positive = b is CCW from a. */
    cross(other) {
        return this.x * other.y - this.y * other.x;
    }

    // ── Rotation ──────────────────────────────────────────────────────────────

    /** Rotate this point around the origin by `angle` radians. */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Point(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }

    /** Rotate this point around a `pivot` Point by `angle` radians. */
    rotateAround(pivot, angle) {
        return this.subtract(pivot).rotate(angle).add(pivot);
    }

    // ── Line & segment helpers ────────────────────────────────────────────────

    /**
     * Point on the line segment [a → b] closest to this point.
     * @param {Point} a  Segment start
     * @param {Point} b  Segment end
     */
    closestPointOnSegment(a, b) {
        const ab = b.subtract(a);
        const lenSq = ab.magnitudeSq();
        if (lenSq === 0) return a.clone();
        const t = Math.max(0, Math.min(1, this.subtract(a).dot(ab) / lenSq));
        return a.add(ab.scale(t));
    }

    /** Shortest distance from this point to the line segment [a → b]. */
    distanceToSegment(a, b) {
        return this.distanceTo(this.closestPointOnSegment(a, b));
    }

    /**
     * Intersection point of two infinite lines defined by point-pairs.
     * Returns null if lines are parallel.
     * @param {Point} p1  Line 1 start
     * @param {Point} p2  Line 1 end
     * @param {Point} p3  Line 2 start
     * @param {Point} p4  Line 2 end
     */
    static lineIntersection(p1, p2, p3, p4) {
        const d1 = p2.subtract(p1);
        const d2 = p4.subtract(p3);
        const cross = d1.cross(d2);
        if (Math.abs(cross) < 1e-10) return null; // parallel
        const t = p3.subtract(p1).cross(d2) / cross;
        return p1.add(d1.scale(t));
    }

    /**
     * Intersection of two line *segments*.
     * Returns null if they don't intersect.
     */
    static segmentIntersection(p1, p2, p3, p4) {
        const d1 = p2.subtract(p1);
        const d2 = p4.subtract(p3);
        const cross = d1.cross(d2);
        if (Math.abs(cross) < 1e-10) return null;
        const t = p3.subtract(p1).cross(d2) / cross;
        const u = p3.subtract(p1).cross(d1) / cross;
        if (t < 0 || t > 1 || u < 0 || u > 1) return null;
        return p1.add(d1.scale(t));
    }

    // ── Containment ───────────────────────────────────────────────────────────

    /** Is this point inside an axis-aligned rectangle? */
    isInsideRect(rx, ry, rw, rh) {
        return this.x >= rx && this.x <= rx + rw && this.y >= ry && this.y <= ry + rh;
    }

    /** Is this point inside a circle defined by center and radius? */
    isInsideCircle(cx, cy, radius) {
        const dx = this.x - cx;
        const dy = this.y - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    /** Is this point inside a convex polygon (array of Points, CCW winding)? */
    isInsidePolygon(vertices) {
        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            if (b.subtract(a).cross(this.subtract(a)) < 0) return false;
        }
        return true;
    }

    // ── Equality ──────────────────────────────────────────────────────────────

    equals(other, epsilon = 0) {
        return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon;
    }
}
