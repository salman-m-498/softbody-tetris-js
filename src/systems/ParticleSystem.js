/**
 * ParticleSystem.js
 * Pool-based 2D particle system — zero heap allocations per frame after init.
 *
 * Generalised from Fwoggy-Flick. All emitter methods are configurable.
 *
 * API:
 *   const ps = new ParticleSystem(400);   // pool size
 *
 *   // Built-in emitters:
 *   ps.burst(x, y, color)        – generic directional burst
 *   ps.explosion(x, y, color)    – large multi-ring explosion
 *   ps.sparkle(x, y, color)      – subtle sparkle / pickup
 *   ps.dustPuff(x, y, color)     – ground dust
 *
 *   // Per-frame:
 *   ps.update(dt)
 *   ps.draw(ctx)
 *   ps.clear()                   – reset on game restart
 */

export class ParticleSystem {
    constructor(maxParticles = 400) {
        this._pool = Array.from({ length: maxParticles }, () => ({
            active: false,
            x: 0, y: 0, vx: 0, vy: 0,
            size: 4, color: '#fff',
            alpha: 1, life: 0, maxLife: 1,
            gravity: 0, drag: 0.92,
            type: 'square',   // 'square' | 'spark' | 'circle' | 'ring'
            shrink: true,
            ringRadius: 0, ringGrow: 0,
        }));
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    clear() {
        for (const p of this._pool) p.active = false;
    }

    get activeCount() {
        return this._pool.filter(p => p.active).length;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(dt) {
        for (const p of this._pool) {
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; continue; }

            if (p.type === 'ring') {
                p.ringRadius += p.ringGrow * dt;
                p.alpha = 1 - p.life / p.maxLife;
                continue;
            }

            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity * dt;
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;
            p.alpha = 1 - p.life / p.maxLife;
        }
    }

    // ── Draw ──────────────────────────────────────────────────────────────────

    draw(ctx) {
        ctx.save();
        for (const p of this._pool) {
            if (!p.active || p.alpha <= 0) continue;
            ctx.globalAlpha = p.alpha;

            if (p.type === 'ring') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth   = p.size;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.ringRadius, 0, Math.PI * 2);
                ctx.stroke();
                continue;
            }

            const size = p.shrink ? p.size * (1 - p.life / p.maxLife) : p.size;

            if (p.type === 'circle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth   = size * 0.4;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
                ctx.stroke();
            } else {
                // square (default)
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ── Internal emit ─────────────────────────────────────────────────────────

    _acquire() {
        for (const p of this._pool) if (!p.active) return p;
        return null; // pool full — drop rather than allocate
    }

    _emit(x, y, vx, vy, size, color, maxLife, gravity = 0, drag = 0.92, shrink = true, type = 'square') {
        const p = this._acquire();
        if (!p) return;
        p.active = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.size = size; p.color = color;
        p.alpha = 1; p.life = 0; p.maxLife = maxLife;
        p.gravity = gravity; p.drag = drag;
        p.shrink = shrink; p.type = type;
        p.ringRadius = 0; p.ringGrow = 0;
    }

    _ring(x, y, color, growSpeed, life, lineWidth = 1.5) {
        const p = this._acquire();
        if (!p) return;
        p.active = true;
        p.x = x; p.y = y; p.vx = 0; p.vy = 0;
        p.size = lineWidth; p.color = color;
        p.alpha = 1; p.life = 0; p.maxLife = life;
        p.gravity = 0; p.drag = 1;
        p.shrink = false; p.type = 'ring';
        p.ringRadius = 1; p.ringGrow = growSpeed;
    }

    // ── Built-in emitters ─────────────────────────────────────────────────────

    /**
     * Generic burst — e.g. tile destroy, impact.
     */
    burst(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 130;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                2 + Math.random() * 4, color, 0.45 + Math.random() * 0.4,
                90, 0.91, true, 'square');
        }
        for (let i = 0; i < 4; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 100 + Math.random() * 160;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5, '#ffffff', 0.35, 80, 0.89, true, 'spark');
        }
        this._ring(x, y, color, 50, 0.35);
    }

    /**
     * Small hit chips — object damaged but not destroyed.
     */
    hit(x, y, color, count = 6) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 30 + Math.random() * 70;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5 + Math.random() * 2, color, 0.25 + Math.random() * 0.2,
                120, 0.9, true, 'square');
        }
    }

    /**
     * Large explosion with rings — boss death, bomb.
     */
    explosion(x, y, color = '#ff6600', count = 20) {
        this.burst(x, y, color, count);
        this._ring(x, y, '#ffffff', 80, 0.3, 2.5);
        this._ring(x, y, color, 55, 0.45, 1.5);
        for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 50 + Math.random() * 200;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                4 + Math.random() * 6, '#ffdd44', 0.6 + Math.random() * 0.4,
                120, 0.88, true, 'circle');
        }
    }

    /**
     * Sparkle — pickup, power-up activation.
     */
    sparkle(x, y, color = '#ffff88', count = 12) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const s = 20 + Math.random() * 50;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s - 30,
                1 + Math.random() * 2, color, 0.5 + Math.random() * 0.3,
                0, 0.95, true, 'spark');
        }
        this._ring(x, y, color, 30, 0.4, 1);
    }

    /**
     * Dust puff — landing, ground impact.
     */
    dustPuff(x, y, color = '#aaaaaa', count = 8) {
        for (let i = 0; i < count; i++) {
            const a = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
            const s = 20 + Math.random() * 40;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s - 10,
                2 + Math.random() * 3, color, 0.4 + Math.random() * 0.3,
                -20, 0.93, true, 'circle');
        }
    }

    /**
     * Directional burst — e.g. projectile trail or shoot effect.
     * @param {number} angle  Direction in radians
     * @param {number} spread Half-angle spread in radians
     */
    directional(x, y, angle, color, count = 8, spread = 0.4) {
        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * spread * 2;
            const s = 50 + Math.random() * 100;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5 + Math.random() * 3, color, 0.3 + Math.random() * 0.3,
                40, 0.9, true, 'spark');
        }
    }
}
