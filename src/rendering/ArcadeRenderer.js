/**
 * ArcadeRenderer.js
 * Static arcade-style drawing helpers — retro visuals without sprite sheets.
 *
 * All methods are static and take a `ctx` as the first argument.
 * Ported and extended from Fwoggy-Flick.
 */

export class ArcadeRenderer {

    // ── Palette ───────────────────────────────────────────────────────────────

    static COLORS = Object.freeze({
        RED:       '#FF4444',
        BLUE:      '#4444FF',
        YELLOW:    '#FFFF44',
        GREEN:     '#44FF44',
        MAGENTA:   '#FF44FF',
        CYAN:      '#44FFFF',
        ORANGE:    '#FF8844',
        PURPLE:    '#8844FF',
        WHITE:     '#FFFFFF',
        BLACK:     '#000000',
        DARK_BLUE: '#001133',
        PINK:      '#FF4488',
        NEON_GREEN: '#44ff88',
        ARCADE_YELLOW: '#ffee00',
    });

    static PIXEL_FONT = '"Press Start 2P", monospace';

    // ── Shapes ────────────────────────────────────────────────────────────────

    /** Filled + outlined rounded rectangle. */
    static roundedTile(ctx, x, y, w, h, color, radius = 4, outlineWidth = 1) {
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = this.COLORS.BLACK;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fill();
    }

    /** Glow effect: blurred shadow around a rectangle. */
    static glowRect(ctx, x, y, w, h, color, blur = 10) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur  = blur;
        ctx.fillStyle   = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    /** Outlined circle. */
    static circle(ctx, cx, cy, r, fill, stroke = null, lineWidth = 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth   = lineWidth;
            ctx.stroke();
        }
    }

    /** Draw a line between two points with an optional color. */
    static line(ctx, x1, y1, x2, y2, color = '#ffffff', width = 1) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth   = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    /** Draw a chain of connected points. */
    static polyline(ctx, points, color = '#ffffff', width = 1, closed = false) {
        if (points.length < 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth   = width;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        if (closed) ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    /** Filled polygon from an array of {x,y} points. */
    static polygon(ctx, points, fill, stroke = null, lineWidth = 1) {
        if (points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth   = lineWidth;
            ctx.stroke();
        }
    }

    // ── Dotted background ─────────────────────────────────────────────────────

    static dottedBackground(ctx, width, height, dotSize = 2, spacing = 20, color = '#111133') {
        ctx.fillStyle = color;
        for (let x = 0; x < width; x += spacing) {
            for (let y = 0; y < height; y += spacing) {
                ctx.fillRect(x, y, dotSize, dotSize);
            }
        }
    }

    /** Scanline overlay for a CRT-style look. */
    static scanlines(ctx, width, height, alpha = 0.08) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        for (let y = 0; y < height; y += 4) {
            ctx.fillRect(0, y, width, 2);
        }
        ctx.restore();
    }

    // ── Text ──────────────────────────────────────────────────────────────────

    /** Pixel-font text with optional shadow. */
    static pixelText(ctx, text, x, y, size = 16, color = '#ffffff', shadowColor = null) {
        ctx.font      = `${size}px ${this.PIXEL_FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        if (shadowColor) {
            ctx.fillStyle = shadowColor;
            ctx.fillText(text, x + 2, y + 2);
        }
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    /** Centered pixel text. */
    static pixelTextCentered(ctx, text, cx, cy, size = 16, color = '#ffffff') {
        ctx.font         = `${size}px ${this.PIXEL_FONT}`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = color;
        ctx.fillText(text, cx, cy);
    }

    /** Plain bold monospace text. */
    static retroText(ctx, text, x, y, size = 16, color = '#ffffff') {
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px monospace`;
        ctx.fillText(text, x, y);
    }

    // ── Progress bars ─────────────────────────────────────────────────────────

    /**
     * Horizontal progress bar with border.
     * @param {number} fill  0–1
     */
    static progressBar(ctx, x, y, w, h, fill, fillColor, bgColor = '#222', borderColor = '#555') {
        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);
        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fill)), h);
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    // ── Pulsing / animated ────────────────────────────────────────────────────

    /** Pulse a color's opacity over time. Returns an rgba string. */
    static pulseColor(color, time, speed = 2, minAlpha = 0.5) {
        const alpha = Math.sin(time * speed) * ((1 - minAlpha) / 2) + ((1 + minAlpha) / 2);
        // Strip # and parse
        const r = parseInt(color.slice(1,3),16);
        const g = parseInt(color.slice(3,5),16);
        const b = parseInt(color.slice(5,7),16);
        return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
    }

    /** Squash-and-stretch rectangle centered at (cx, cy). */
    static squashStretch(ctx, cx, cy, w, h, squash, color) {
        const sw = w * (1 + squash);
        const sh = h * (1 - squash * 0.5);
        ctx.fillStyle = color;
        ctx.fillRect(cx - sw / 2, cy - sh / 2, sw, sh);
    }

    // ── Pixel heart ───────────────────────────────────────────────────────────

    static pixelHeart(ctx, x, y, size, color, outlineColor = '#000000') {
        const pixels = [
            [0,1,1,0,1,1,0],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [0,1,1,1,1,1,0],
            [0,0,1,1,1,0,0],
            [0,0,0,1,0,0,0],
        ];
        const ps = size / 7;
        for (let row = 0; row < pixels.length; row++) {
            for (let col = 0; col < pixels[row].length; col++) {
                if (!pixels[row][col]) continue;
                const px = x + col * ps;
                const py = y + row * ps;
                ctx.fillStyle = outlineColor;
                ctx.fillRect(px - 1, py - 1, ps + 2, ps + 2);
                ctx.fillStyle = color;
                ctx.fillRect(px, py, ps, ps);
            }
        }
    }

    // ── Icon / emoji ──────────────────────────────────────────────────────────

    static icon(ctx, emoji, cx, cy, size) {
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = `${size * 0.6}px Arial`;
        ctx.fillText(emoji, cx, cy);
    }
}
