/**
 * Pressure-based softbody simulation.
 *
 * Pressure model based on:
 *   Maciej Matyka, "How to implement a pressure soft body model"
 *   https://arxiv.org/abs/physics/0407003
 *
 * Jelly Car physics by Walaber:
 *   https://www.youtube.com/watch?v=3OmkehAJoyo&t=262s
 */

import { GameObject } from "./GameObject.js";
import { Particle } from "./Particle.js";
import { Spring } from "./Spring.js";

export class Blob extends GameObject{
    constructor(x, y) {
        super(x, y);
        this.particleCount = 16;
        this.radius = 64;
        this.particles = [];
        this.springs = [];
        this.createPoints();
    }

    createPoints() {
        const { particleCount, radius } = this;
        const k = 1800;
        for (let i = 0; i < particleCount; i++) {
            // Calculate the angle for this specific particle (in radians)
            // We divide the full circle (2 * PI) by the total number of particles
            const angle = (i / particleCount) * Math.PI * 2;

            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;

            // Push a new instance of your Particle
            this.particles.push(new Particle(x, y));

            if (i !== 0) {
                let p1 = this.particles[i];
                let p2 = this.particles[i - 1];
                const restLength = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                this.springs.push(new Spring(p1, p2, restLength, k));
            }
        }

        // Close the ring: connect last particle back to first
        const first = this.particles[0];
        const last  = this.particles[this.particles.length - 1];
        this.springs.push(new Spring(first, last, Math.hypot(first.x - last.x, first.y - last.y), k));

        // Cross-springs: connect each particle to the one directly opposite
        // These resist the blob collapsing inward and preserve overall shape
        const half = Math.floor(particleCount / 2);
        for (let i = 0; i < half; i++) {
            const a = this.particles[i];
            const b = this.particles[i + half];
            this.springs.push(new Spring(a, b, Math.hypot(a.x - b.x, a.y - b.y), k / 8));
        }

        return this.particles;
    }

    update(dt) {
        for (const s of this.springs)   s.apply(dt);
        this.applyPressure(6000, dt);
        for (const p of this.particles) p.update(dt);
    }

    applyPressure(pressureConstant = 6000, dt = 1/60) {
        const pts = this.particles;
        const n = pts.length;
        if (n < 3) return;

        // Compute current area via shoelace formula
        let area = 0;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        }
        area = Math.abs(area) / 2;
        if (area < 1) area = 1;

        // Particles are created CW in canvas (y-down) coords.
        // Outward normal = right-perpendicular of directed edge: (dy/len, -dx/len).
        // The original Matyka CCW formula gave inward normals here — fixed below.
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const p1 = pts[i];
            const p2 = pts[j];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;

            const nx = dy / len;   // right-perp x  (was -dy/len — inward)
            const ny = -dx / len;  // right-perp y  (was  dx/len — inward)

            const forceMag = len * pressureConstant / area;
            const fx = nx * forceMag;
            const fy = ny * forceMag;

            p1.applyForce(fx * dt, fy * dt);
            p2.applyForce(fx * dt, fy * dt);
        }
    }

    // Returns particle positions as vertices for SAT broad-phase.
    getVertices() {
        return this.particles.map(p => ({ x: p.x, y: p.y }));
    }

    // Returns perimeter edges as [particleA, particleB] pairs for particle-edge collision.
    getEdges() {
        const edges = [];
        const n = this.particles.length;
        for (let i = 0; i < n; i++)
            edges.push([this.particles[i], this.particles[(i + 1) % n]]);
        return edges;
    }

    // Override so checkAABB uses the live particle extents, not the default (0,0) box.
    getBroadBounds() {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const p of this.particles) {
            if (p.x - p.radius < minX) minX = p.x - p.radius;
            if (p.x + p.radius > maxX) maxX = p.x + p.radius;
            if (p.y - p.radius < minY) minY = p.y - p.radius;
            if (p.y + p.radius > maxY) maxY = p.y + p.radius;
        }
        return { left: minX, right: maxX, top: minY, bottom: maxY };
    }

    // Dragging logic: find nearest particle to mouse down, then apply forces to it while dragging

    startDrag(mx, my) {
        let nearest = null;
        let bestDist = Infinity;
        for (const p of this.particles) {
            const d = Math.hypot(p.x - mx, p.y - my);
            if (d < bestDist) { bestDist = d; nearest = p; }
        }
        if (bestDist < this.radius * 1.5) {
            this._dragParticle = nearest;
        }
    }

    updateDrag(mx, my, dt) {
        if (!this._dragParticle) return;
        const p  = this._dragParticle;
        const dx = mx - p.x;
        const dy = my - p.y;
        p.applyForce(dx * 1200 * dt, dy * 1200 * dt);
    }

    endDrag() {
        this._dragParticle = null;
    }

    getControlPoints(p0, p1, p2, p3, tension = 0.2) {
        // Catmull-Rom tangent vectors
        const c1x = p1.x + (p2.x - p0.x) * tension;
        const c1y = p1.y + (p2.y - p0.y) * tension;
        const c2x = p2.x - (p3.x - p1.x) * tension;
        const c2y = p2.y - (p3.y - p1.y) * tension;
        return { c1x, c1y, c2x, c2y };
    }

    draw(ctx) {
        //const colors = ['#9046CF', '#CC59D2', '#F487B6', '#FF5C33', '#FDE85D'];
        //ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = '#44ff88';
        const pts = this.particles;
        const n = pts.length;

        // Need at least 3 points - maybe draw simple line drawn shape if fewer?
        if (n < 3) return;

        ctx.beginPath();
        const first = this.particles[0];// Move to first real point
        ctx.moveTo(first.x, first.y);

        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const p3 = pts[(i + 2) % n];

            const { c1x, c1y, c2x, c2y } = this.getControlPoints(p0, p1, p2, p3);

            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
        }

        ctx.closePath();
        ctx.fill();

        // Stroke outline
        ctx.lineWidth = 4;
        ctx.strokeStyle = "black";
        ctx.stroke();
    }

    drawDebug(ctx) {
        for (const s of this.springs)  s.draw(ctx);
        for (const p of this.particles) p.draw(ctx);

        /**        ctx.moveTo(first.x, first.y);
        for (const p of this.particles) {
            ctx.lineTo(p.x, p.y);
        }*/
    }

}