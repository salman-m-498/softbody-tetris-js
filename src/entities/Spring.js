/*
    Based on the spring forces coding challenge by Daniel Shiffman.
     - https://thecodingtrain.com/CodingChallenges/160-spring-forces.html
     - https://youtu.be/Rr-5HiXquhw
*/

import { GameObject } from './GameObject.js';

export class Spring {
    constructor(p1, p2, restLength, stiffness) {
        this.p1 = p1; // Particle 1
        this.p2 = p2; // Particle 2
        this.restLength = restLength; // Natural length of the spring
        this.stiffness = stiffness; // Spring stiffness (k)
    }

    apply(dt) {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const forceMagnitude = this.stiffness * (distance - this.restLength);

        if (distance > 0) {
            const fx = (dx / distance) * forceMagnitude * dt;
            const fy = (dy / distance) * forceMagnitude * dt;

            this.p1.applyForce(fx, fy);
            this.p2.applyForce(-fx, -fy);
        }
    }

    draw(ctx) {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
    }
}