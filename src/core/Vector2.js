/**
 * Vector2.js
 * A 2D vector extending Point — adds velocity, force, and physics helpers.
 *
 * Inherits all Point geometry (distance, midpoint, lerp, etc.)
 * and adds direction manipulation, clamping, and reflection.
 */

import { Point } from './Point.js';

export class Vector2 extends Point {
    constructor(x = 0, y = 0) {
        super(x, y);
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    static zero()  { return new Vector2(0, 0); }
    static up()    { return new Vector2(0, -1); }
    static down()  { return new Vector2(0, 1); }
    static left()  { return new Vector2(-1, 0); }
    static right() { return new Vector2(1, 0); }

    /** Unit vector at the given angle (radians). */
    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    /** Convert a plain {x,y} or Point to Vector2. */
    static from({ x, y }) {
        return new Vector2(x, y);
    }

    // ── Cloning (override to return Vector2) ─────────────────────────────────

    clone() {
        return new Vector2(this.x, this.y);
    }

    // ── Arithmetic (override to return Vector2) ───────────────────────────────

    add(other)        { return new Vector2(this.x + other.x, this.y + other.y); }
    subtract(other)   { return new Vector2(this.x - other.x, this.y - other.y); }
    scale(factor)     { return new Vector2(this.x * factor, this.y * factor); }
    negate()          { return new Vector2(-this.x, -this.y); }
    normalize() {
        const len = this.magnitude();
        if (len === 0) return Vector2.zero();
        return new Vector2(this.x / len, this.y / len);
    }

    // ── Vector-specific operations ────────────────────────────────────────────

    /**
     * Limit magnitude to `max`. Returns a new Vector2.
     */
    clampMagnitude(max) {
        const len = this.magnitude();
        if (len <= max) return this.clone();
        return this.normalize().scale(max);
    }

    /**
     * Apply simple linear drag each frame: v *= (1 - drag).
     * Typical drag values: 0.01 (slight air) – 0.2 (heavy friction).
     */
    applyDrag(drag) {
        return new Vector2(this.x * (1 - drag), this.y * (1 - drag));
    }

    /**
     * Reflect this vector off a surface whose normal is `normal`
     * (normal should be unit length).
     * Formula: v - 2(v·n)n
     */
    reflect(normal) {
        const dot2 = 2 * this.dot(normal);
        return new Vector2(this.x - dot2 * normal.x, this.y - dot2 * normal.y);
    }

    /**
     * Project this vector onto `onto`. Returns the component of this vector
     * that lies along `onto`.
     */
    projectOnto(onto) {
        const lenSq = onto.magnitudeSq();
        if (lenSq === 0) return Vector2.zero();
        const scalar = this.dot(onto) / lenSq;
        return new Vector2(onto.x * scalar, onto.y * scalar);
    }

    /**
     * Rotate 90° clockwise.
     */
    perpendicular() {
        return new Vector2(this.y, -this.x);
    }

    /**
     * Return a new Vector2 with each component clamped between min and max.
     */
    clampComponents(min, max) {
        return new Vector2(
            Math.max(min, Math.min(max, this.x)),
            Math.max(min, Math.min(max, this.y))
        );
    }

    /**
     * Angle between this vector and another (unsigned, 0–PI).
     */
    angleBetween(other) {
        const magProduct = this.magnitude() * other.magnitude();
        if (magProduct === 0) return 0;
        return Math.acos(Math.max(-1, Math.min(1, this.dot(other) / magProduct)));
    }

    /**
     * Linear interpolation toward another vector. Returns new Vector2.
     */
    lerp(other, t) {
        return new Vector2(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t
        );
    }

    // ── Physics helpers ───────────────────────────────────────────────────────

    /**
     * Apply a force (acceleration * mass) to produce a new velocity.
     * @param {Vector2} force     Force vector
     * @param {number}  mass      Object mass (>0)
     * @param {number}  dt        Delta time in seconds
     */
    applyForce(force, mass, dt) {
        return this.add(force.scale(dt / mass));
    }

    /**
     * Integrate: returns new position = position + velocity * dt
     */
    integrate(velocity, dt) {
        return this.add(velocity.scale(dt));
    }

    toString() {
        return `Vector2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`;
    }
}
