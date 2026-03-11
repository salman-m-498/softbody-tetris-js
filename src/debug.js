/**
 * debug.js
 * Development helpers — all no-ops in production (set DEBUG = false).
 */

export const DEBUG = true; // flip to false before shipping

export const DebugDraw = {

    /** Draw bounding boxes for an array of GameObjects. */
    drawBounds(ctx, objects, color = 'rgba(0,255,255,0.4)') {
        if (!DEBUG) return;
        for (const obj of objects) {
            if (obj.drawDebug) obj.drawDebug(ctx);
        }
    },

    /** Draw a crosshair at (x, y). */
    crosshair(ctx, x, y, size = 8, color = 'red') {
        if (!DEBUG) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
        ctx.restore();
    },

    /** Draw an fps / info overlay in the top-left corner. */
    info(ctx, lines, fontSize = 11) {
        if (!DEBUG) return;
        ctx.save();
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(4, 4, 200, lines.length * (fontSize + 4) + 8);
        ctx.fillStyle = '#00ff88';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
            ctx.fillText(line, 10, 10 + i * (fontSize + 4));
        });
        ctx.restore();
    },
};

/** Simple FPS counter. */
export class FPSCounter {
    constructor(sampleSize = 60) {
        this._samples = new Array(sampleSize).fill(0);
        this._index   = 0;
    }
    update(dt) {
        this._samples[this._index++ % this._samples.length] = 1 / dt;
    }
    get fps() {
        return Math.round(this._samples.reduce((a, b) => a + b, 0) / this._samples.length);
    }
}
