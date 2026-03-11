import { RigidBodyGameObject } from './RigidBodyGameObject.js';

export class Particle extends RigidBodyGameObject {
    constructor(x, y) {
        super(x, y);
        this.radius     = 8;
        this.startAngle = 0;
        this.endAngle   = 2 * Math.PI;
    }

    update(dt) {
        this.integrateVelocity(dt);
    }

    draw(ctx) {
        ctx.fillStyle = '#44ff88';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "black";
        ctx.stroke();
    }
}