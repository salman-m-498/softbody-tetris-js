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
        const k = 800;
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
        for (const p of this.particles) p.update(dt);
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

    draw(ctx) {
        for (const s of this.springs)  s.draw(ctx);
        for (const p of this.particles) p.draw(ctx);
    }

}