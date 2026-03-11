/**
 * polyfills.js
 * Browser compatibility shims.
 * Import this file first in main.js.
 */

// roundRect — not available in all browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (r === undefined) r = 5;
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        else {
            const def = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (const s in def) r[s] = r[s] || def[s];
        }
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
    };
}
