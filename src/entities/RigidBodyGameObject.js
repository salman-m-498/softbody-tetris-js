import { GameObject } from './GameObject.js';

export class RigidBodyGameObject extends GameObject {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(x, y, width, height);
        this.vx          = 0;
        this.vy          = 0;
        this.mass        = 1;
        this.restitution = 0.5;  // bounciness [0–1]
        this.damping     = 0.98; // velocity multiplier per frame [0–1], lower = more drag
        this.isStatic    = false; // true = infinite mass, never moves
    }

    /** Inverse mass — 0 for static bodies so forces have no effect. */
    get invMass() {
        return this.isStatic ? 0 : 1 / this.mass;
    }

    /** Apply a force vector (world units/s²) scaled by inverse mass. */
    applyForce(fx, fy) {
        this.vx += fx * this.invMass;
        this.vy += fy * this.invMass;
    }

    /** Advance position by current velocity. Call once per update. */
    integrateVelocity(dt) {
        this.vx *= this.damping;
        this.vy *= this.damping;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}
