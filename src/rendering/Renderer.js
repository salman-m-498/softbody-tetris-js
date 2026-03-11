/**
 * Renderer.js
 * Base canvas renderer — handles clear, background, and a layered draw pass.
 *
 * Extend this class and override drawBackground(), drawWorld(), drawHUD()
 * to build your game's rendering pipeline.
 *
 * Usage:
 *   class MyRenderer extends Renderer {
 *       drawWorld(ctx) {
 *           for (const obj of this.objects) obj.draw(ctx);
 *       }
 *   }
 *   const renderer = new MyRenderer(canvas, { bgColor: '#000' });
 *   renderer.render(ctx);  // call from your game loop
 */

export class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} [options]
     * @param {string}  [options.bgColor]  Canvas clear color (default '#000000')
     * @param {boolean} [options.pixelArt] Disable image smoothing for pixel art
     */
    constructor(canvas, { bgColor = '#000000', pixelArt = false } = {}) {
        this.canvas   = canvas;
        this.bgColor  = bgColor;
        this.pixelArt = pixelArt;

        // Screen-shake state (applied during render, separate from Camera)
        this._shakeX = 0;
        this._shakeY = 0;
        this._shakeIntensity = 0;
        this._shakeDuration  = 0;
    }

    // ── Screen shake ──────────────────────────────────────────────────────────

    shake(intensity, duration) {
        this._shakeIntensity = intensity;
        this._shakeDuration  = Math.max(this._shakeDuration, duration);
    }

    updateShake(dt) {
        if (this._shakeDuration > 0) {
            this._shakeDuration -= dt;
            const i = this._shakeIntensity * Math.max(0, this._shakeDuration > 0 ? 1 : 0);
            this._shakeX = (Math.random() * 2 - 1) * i;
            this._shakeY = (Math.random() * 2 - 1) * i;
            if (this._shakeDuration <= 0) {
                this._shakeX = this._shakeY = 0;
                this._shakeIntensity = 0;
            }
        }
    }

    // ── Main render pass ──────────────────────────────────────────────────────

    /**
     * Full render call — override the individual layer methods below.
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this.pixelArt) ctx.imageSmoothingEnabled = false;

        ctx.save();
        if (this._shakeX || this._shakeY) {
            ctx.translate(this._shakeX, this._shakeY);
        }

        this.clear(ctx);
        this.drawBackground(ctx);
        this.drawWorld(ctx);
        this.drawHUD(ctx);
        this.drawDebugOverlay(ctx);

        ctx.restore();
    }

    // ── Layer methods (override in subclass) ──────────────────────────────────

    clear(ctx) {
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /** Background / environment layer (sky, tilemap, parallax). */
    drawBackground(ctx) {}

    /** Main game objects layer. */
    drawWorld(ctx) {}

    /** HUD / UI overlay (drawn on top, unaffected by camera). */
    drawHUD(ctx) {}

    /** Debug overlay (vertices, bounding boxes, etc.). */
    drawDebugOverlay(ctx) {}
}
