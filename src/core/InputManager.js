/**
 * InputManager.js
 * Centralised keyboard, mouse, and touch input handler.
 *
 * Usage:
 *   const input = new InputManager(canvas);
 *
 *   // Polling (inside game loop):
 *   input.isDown('Space')           // held
 *   input.isJustPressed('ArrowUp')  // pressed this frame
 *   input.isJustReleased('ArrowUp') // released this frame
 *   input.mouse.x / input.mouse.y  // canvas-relative mouse coords
 *   input.mouse.left / .right       // mouse button state
 *
 *   // Must call once per frame to clear "just" flags:
 *   input.update();
 *
 *   // Clean up:
 *   input.destroy();
 */

export class InputManager {
    constructor(canvas) {
        this._canvas = canvas;

        this._down         = new Set();
        this._justPressed  = new Set();
        this._justReleased = new Set();

        this.mouse = { x: 0, y: 0, left: false, right: false, middle: false,
                       justLeft: false, justRight: false, wheel: 0 };

        this._onKeyDown    = this._onKeyDown.bind(this);
        this._onKeyUp      = this._onKeyUp.bind(this);
        this._onMouseMove  = this._onMouseMove.bind(this);
        this._onMouseDown  = this._onMouseDown.bind(this);
        this._onMouseUp    = this._onMouseUp.bind(this);
        this._onWheel      = this._onWheel.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchEnd   = this._onTouchEnd.bind(this);

        window.addEventListener('keydown',    this._onKeyDown,    { passive: true });
        window.addEventListener('keyup',      this._onKeyUp,      { passive: true });
        canvas.addEventListener('mousemove',  this._onMouseMove,  { passive: true });
        canvas.addEventListener('mousedown',  this._onMouseDown,  { passive: true });
        canvas.addEventListener('mouseup',    this._onMouseUp,    { passive: true });
        canvas.addEventListener('wheel',      this._onWheel,      { passive: true });
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
        canvas.addEventListener('touchend',   this._onTouchEnd,   { passive: true });

        canvas.setAttribute('tabindex', '0');
    }

    // ── Key events ────────────────────────────────────────────────────────────

    _onKeyDown(e) {
        if (!this._down.has(e.code)) this._justPressed.add(e.code);
        this._down.add(e.code);
    }

    _onKeyUp(e) {
        this._down.delete(e.code);
        this._justReleased.add(e.code);
    }

    // ── Mouse events ──────────────────────────────────────────────────────────

    _getCanvasPos(clientX, clientY) {
        const rect   = this._canvas.getBoundingClientRect();
        const scaleX = this._canvas.width  / rect.width;
        const scaleY = this._canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top)  * scaleY
        };
    }

    _onMouseMove(e) {
        const pos = this._getCanvasPos(e.clientX, e.clientY);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
    }

    _onMouseDown(e) {
        if (e.button === 0) { this.mouse.left   = true; this.mouse.justLeft  = true; }
        if (e.button === 1)   this.mouse.middle = true;
        if (e.button === 2) { this.mouse.right  = true; this.mouse.justRight = true; }
    }

    _onMouseUp(e) {
        if (e.button === 0) this.mouse.left   = false;
        if (e.button === 1) this.mouse.middle = false;
        if (e.button === 2) this.mouse.right  = false;
    }

    _onWheel(e) {
        this.mouse.wheel = e.deltaY;
    }

    // ── Touch → mouse proxy ───────────────────────────────────────────────────

    _onTouchStart(e) {
        const t = e.touches[0];
        if (!t) return;
        const pos = this._getCanvasPos(t.clientX, t.clientY);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.left = true;
        this.mouse.justLeft = true;
    }

    _onTouchEnd() {
        this.mouse.left = false;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    isDown(code)         { return this._down.has(code); }
    isJustPressed(code)  { return this._justPressed.has(code); }
    isJustReleased(code) { return this._justReleased.has(code); }

    /** Call once per frame at the END of your update step. */
    update() {
        this._justPressed.clear();
        this._justReleased.clear();
        this.mouse.justLeft  = false;
        this.mouse.justRight = false;
        this.mouse.wheel     = 0;
    }

    /** Remove all event listeners. Call when tearing down the game. */
    destroy() {
        window.removeEventListener('keydown',    this._onKeyDown);
        window.removeEventListener('keyup',      this._onKeyUp);
        this._canvas.removeEventListener('mousemove',  this._onMouseMove);
        this._canvas.removeEventListener('mousedown',  this._onMouseDown);
        this._canvas.removeEventListener('mouseup',    this._onMouseUp);
        this._canvas.removeEventListener('wheel',      this._onWheel);
        this._canvas.removeEventListener('touchstart', this._onTouchStart);
        this._canvas.removeEventListener('touchend',   this._onTouchEnd);
    }
}
