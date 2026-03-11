/**
 * MathUtils.js
 * Standalone math helpers commonly needed in 2D games.
 */

export const MathUtils = {

    // ── Angle helpers ─────────────────────────────────────────────────────────

    /** Convert degrees to radians. */
    toRad(degrees)  { return degrees * Math.PI / 180; },

    /** Convert radians to degrees. */
    toDeg(radians)  { return radians * 180 / Math.PI; },

    /** Normalize an angle to [-PI, PI]. */
    normalizeAngle(angle) {
        while (angle >  Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },

    /** Shortest signed angular difference from `a` to `b` (both in radians). */
    angleDiff(a, b) {
        return this.normalizeAngle(b - a);
    },

    /** Lerp between two angles without wrapping artefacts. */
    lerpAngle(a, b, t) {
        return a + this.angleDiff(a, b) * t;
    },

    // ── Range & clamping ──────────────────────────────────────────────────────

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /** Map a value from one range to another. */
    remap(value, inMin, inMax, outMin, outMax) {
        if (inMax === inMin) return outMin;
        return outMin + (value - inMin) / (inMax - inMin) * (outMax - outMin);
    },

    /** Map value, clamped to the output range. */
    remapClamped(value, inMin, inMax, outMin, outMax) {
        return this.clamp(this.remap(value, inMin, inMax, outMin, outMax), outMin, outMax);
    },

    // ── Interpolation ─────────────────────────────────────────────────────────

    lerp(a, b, t)        { return a + (b - a) * t; },
    smoothstep(a, b, t)  { const s = t * t * (3 - 2 * t); return this.lerp(a, b, s); },
    smootherstep(a, b, t){ const s = t * t * t * (t * (t * 6 - 15) + 10); return this.lerp(a, b, s); },

    // ── Easing ────────────────────────────────────────────────────────────────

    easeInQuad(t)  { return t * t; },
    easeOutQuad(t) { return 1 - (1 - t) * (1 - t); },
    easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; },
    easeOutBack(t, overshoot = 1.70158) {
        const c1 = overshoot;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeOutBounce(t) {
        if (t < 1 / 2.75)       return 7.5625 * t * t;
        else if (t < 2 / 2.75)  return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        else if (t < 2.5 / 2.75)return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        else                     return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },

    // ── Randomness ────────────────────────────────────────────────────────────

    /** Random float in [min, max). */
    randFloat(min, max)   { return min + Math.random() * (max - min); },

    /** Random integer in [min, max]. */
    randInt(min, max)     { return Math.floor(this.randFloat(min, max + 1)); },

    /** Random element from an array. */
    randChoice(arr)       { return arr[Math.floor(Math.random() * arr.length)]; },

    /** Shuffle an array in-place (Fisher-Yates). */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /** Weighted random pick: weights is a parallel array of numbers. */
    weightedChoice(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    },

    // ── Oscillation ──────────────────────────────────────────────────────────

    /** Sine wave oscillating between 0 and 1. time is raw seconds or frame counter. */
    wave01(time, speed = 1) {
        return Math.sin(time * speed * Math.PI * 2) * 0.5 + 0.5;
    },

    /** Ping-pong: value bounces between 0 and length. */
    pingpong(t, length) {
        const mod = t % (2 * length);
        return mod > length ? 2 * length - mod : mod;
    },

    // ── Snap & grid ───────────────────────────────────────────────────────────

    /** Snap a value to the nearest multiple of `step`. */
    snap(value, step) {
        return Math.round(value / step) * step;
    },

    /** World position → grid cell (column, row). */
    toGrid(wx, wy, cellSize) {
        return { col: Math.floor(wx / cellSize), row: Math.floor(wy / cellSize) };
    },

    /** Grid cell (col, row) → world center position. */
    fromGrid(col, row, cellSize) {
        return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
    },

    // ── Color helpers ─────────────────────────────────────────────────────────

    /** Interpolate between two hex colors. t ∈ [0,1]. */
    lerpColor(hexA, hexB, t) {
        const a = this._parseHex(hexA);
        const b = this._parseHex(hexB);
        const r = Math.round(a.r + (b.r - a.r) * t);
        const g = Math.round(a.g + (b.g - a.g) * t);
        const bl = Math.round(a.b + (b.b - a.b) * t);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
    },

    _parseHex(hex) {
        const c = hex.replace('#','');
        return {
            r: parseInt(c.substring(0,2),16),
            g: parseInt(c.substring(2,4),16),
            b: parseInt(c.substring(4,6),16)
        };
    },
};
