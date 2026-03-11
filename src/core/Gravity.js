import { RigidBodyGameObject } from '../entities/RigidBodyGameObject.js';

/**
 * Gravity.js
 * Stateless utility that applies a gravity acceleration to RigidBodyGameObjects.
 *
 * Usage in main.js update():
 *   Gravity.apply(blob.particles, dt);
 *   // or with a custom gravity:
 *   Gravity.apply(blob.particles, dt, 600);
 */
export class Gravity {
    /** Default gravitational acceleration in pixels/s². */
    static GRAVITY = 980;

    /**
     * Apply gravity to an array of RigidBodyGameObjects for this frame.
     * Static bodies (isStatic = true) are skipped.
     *
     * @param {RigidBodyGameObject[]} bodies  Array of rigidbodies to affect
     * @param {number}                dt      Delta time in seconds
     * @param {number}                [g]     Override gravity (default: Gravity.GRAVITY)
     */
    static apply(bodies, dt, g = Gravity.GRAVITY) {
        for (const body of bodies) {
            if (!(body instanceof RigidBodyGameObject)) continue;
            if (body.isStatic) continue;
            body.vy += g * dt;
        }
    }
}
