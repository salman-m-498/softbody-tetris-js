/**
 * GameLoop.js
 * requestAnimationFrame-based game loop with fixed delta time and frame cap.
 *
 * Usage:
 *   const loop = new GameLoop({
 *       update: (dt) => { },   // dt in seconds, capped
 *       render: (ctx) => { },
 *       canvas,
 *   });
 *   loop.start();
 *   loop.stop();
 */

export class GameLoop {
    /**
     * @param {object} options
     * @param {function(number): void} options.update  - Called with dt (seconds)
     * @param {function(CanvasRenderingContext2D): void} options.render - Called after update
     * @param {HTMLCanvasElement} options.canvas
     * @param {number} [options.maxDt=0.05]   Cap delta to avoid spiral of death (default 50ms)
     */
    constructor({ update, render, canvas, maxDt = 0.05 }) {
        this._update  = update;
        this._render  = render;
        this._ctx     = canvas.getContext('2d');
        this._maxDt   = maxDt;
        this._running = false;
        this._rafId   = null;
        this._last    = null;

        this._tick = this._tick.bind(this);
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._last    = null;
        this._rafId   = requestAnimationFrame(this._tick);
    }

    stop() {
        this._running = false;
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _tick(timestamp) {
        if (!this._running) return;
        this._rafId = requestAnimationFrame(this._tick);

        if (this._last === null) {
            this._last = timestamp;
            return;
        }

        const dt = Math.min((timestamp - this._last) / 1000, this._maxDt);
        this._last = timestamp;

        this._update(dt);
        this._render(this._ctx);
    }
}
