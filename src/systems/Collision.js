/**
 * Collision.js
 * SAT (Separating Axis Theorem) + AABB collision detection.
 *
 * Generalised from Fwoggy-Flick. Works with any object that implements:
 *   - getVertices(): returns an array of {x,y} world-space points (for SAT)
 *   - getBroadBounds(): returns { left, right, top, bottom } (for AABB pre-pass)
 *
 * All methods are static — no instantiation needed.
 *
 * Reference: https://www.sevenson.com.au/programming/sat/
 */

export class CollisionUtils {

    // ── AABB broad phase ──────────────────────────────────────────────────────

    /**
     * Fast box-vs-box check using pre-computed broad bounds.
     * Returns false quickly if objects cannot possibly be touching.
     */
    static checkAABB(objA, objB) {
        const a = objA.getBroadBounds();
        const b = objB.getBroadBounds();
        return a.left < b.right  &&
               a.right > b.left  &&
               a.top   < b.bottom &&
               a.bottom > b.top;
    }

    /**
     * Broad-phase + narrow-phase SAT.
     * Use this as your main collision check for polygon shapes.
     */
    static checkAABBAndSAT(objA, objB) {
        if (!this.checkAABB(objA, objB)) return false;
        return this.checkSAT(objA, objB);
    }

    // ── SAT narrow phase ──────────────────────────────────────────────────────

    /**
     * Full SAT collision test. Both objects must implement getVertices().
     * Returns true if they overlap.
     */
    static checkSAT(objA, objB) {
        const polyA = objA.getVertices();
        const polyB = objB.getVertices();
        const axes  = [...this.#getNormals(polyA), ...this.#getNormals(polyB)];

        for (const axis of axes) {
            const pA = this.#project(polyA, axis);
            const pB = this.#project(polyB, axis);
            if (pA.max < pB.min || pB.max < pA.min) return false;
        }
        return true;
    }

    /**
     * SAT with Minimum Translation Vector (MTV).
     * Returns null if no collision, or { normal, depth } to resolve the overlap.
     */
    static checkSATWithMTV(objA, objB) {
        const polyA = objA.getVertices();
        const polyB = objB.getVertices();
        const axes  = [...this.#getNormals(polyA), ...this.#getNormals(polyB)];

        let minDepth  = Infinity;
        let minNormal = null;

        for (const axis of axes) {
            const pA = this.#project(polyA, axis);
            const pB = this.#project(polyB, axis);
            if (pA.max < pB.min || pB.max < pA.min) return null; // gap

            const overlap = Math.min(pA.max, pB.max) - Math.max(pA.min, pB.min);
            if (overlap < minDepth) {
                minDepth  = overlap;
                minNormal = axis;
            }
        }
        return { normal: minNormal, depth: minDepth };
    }

    // ── Circle helpers ────────────────────────────────────────────────────────

    /** Circle vs Circle. Centers at (ax,ay) and (bx,by) with radii rA, rB. */
    static checkCircles(ax, ay, rA, bx, by, rB) {
        const dx = bx - ax, dy = by - ay;
        const distSq = dx * dx + dy * dy;
        const radSum = rA + rB;
        return distSq <= radSum * radSum;
    }

    /** Circle vs AABB (rectangle). */
    static checkCircleAABB(cx, cy, r, rx, ry, rw, rh) {
        const nearX = Math.max(rx, Math.min(cx, rx + rw));
        const nearY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nearX, dy = cy - nearY;
        return dx * dx + dy * dy <= r * r;
    }

    /**
     * Resolve two overlapping circular RigidBodyGameObjects.
     * Separates positions and exchanges velocity along the collision normal.
     *
     * @param {{x,y,vx,vy,radius,restitution,invMass}} a
     * @param {{x,y,vx,vy,radius,restitution,invMass}} b
     */
    static resolveCircles(a, b) {
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist >= minDist || dist === 0) return;

        // Collision normal
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate positions equally
        const overlap = (minDist - dist) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Relative velocity along normal
        const dvx = b.vx - a.vx;
        const dvy = b.vy - a.vy;
        const dot  = dvx * nx + dvy * ny;
        if (dot > 0) return; // already separating

        const restitution = Math.min(a.restitution, b.restitution);
        const impulse = -(1 + restitution) * dot / (a.invMass + b.invMass);
        a.vx -= impulse * a.invMass * nx;
        a.vy -= impulse * a.invMass * ny;
        b.vx += impulse * b.invMass * nx;
        b.vy += impulse * b.invMass * ny;
    }

    /**
     * Resolve a particle against a perimeter edge defined by two particles.
     * Finds the closest point on the segment edgeA→edgeB, pushes the particle
     * out if penetrating, and applies a velocity impulse split by inverse mass.
     */
    static resolveParticleEdge(p, edgeA, edgeB) {
        const ax = edgeB.x - edgeA.x;
        const ay = edgeB.y - edgeA.y;
        const lenSq = ax * ax + ay * ay;
        if (lenSq === 0) return;

        // Closest point on segment (t clamped to [0,1])
        const t = Math.max(0, Math.min(1,
            ((p.x - edgeA.x) * ax + (p.y - edgeA.y) * ay) / lenSq));
        const cx = edgeA.x + t * ax;
        const cy = edgeA.y + t * ay;

        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= p.radius || dist === 0) return;

        // Normal from edge surface toward particle
        const nx    = dx / dist;
        const ny    = dy / dist;
        const depth = p.radius - dist;

        // Position correction weighted by inverse mass
        const totalInvMass = p.invMass + edgeA.invMass * (1 - t) + edgeB.invMass * t;
        if (totalInvMass === 0) return;

        p.x     += nx * depth * (p.invMass / totalInvMass);
        p.y     += ny * depth * (p.invMass / totalInvMass);
        edgeA.x -= nx * depth * (edgeA.invMass * (1 - t) / totalInvMass);
        edgeA.y -= ny * depth * (edgeA.invMass * (1 - t) / totalInvMass);
        edgeB.x -= nx * depth * (edgeB.invMass * t / totalInvMass);
        edgeB.y -= ny * depth * (edgeB.invMass * t / totalInvMass);

        // Velocity of edge at contact point (interpolated)
        const evx = edgeA.vx * (1 - t) + edgeB.vx * t;
        const evy = edgeA.vy * (1 - t) + edgeB.vy * t;
        const rvx = p.vx - evx;
        const rvy = p.vy - evy;
        const vn  = rvx * nx + rvy * ny;
        if (vn > 0) return; // already separating

        const restitution = Math.min(p.restitution, edgeA.restitution, edgeB.restitution);
        const impulse = -(1 + restitution) * vn / totalInvMass;
        p.vx     += impulse * p.invMass * nx;
        p.vy     += impulse * p.invMass * ny;
        edgeA.vx -= impulse * edgeA.invMass * (1 - t) * nx;
        edgeA.vy -= impulse * edgeA.invMass * (1 - t) * ny;
        edgeB.vx -= impulse * edgeB.invMass * t * nx;
        edgeB.vy -= impulse * edgeB.invMass * t * ny;
    }

    // ── Canvas boundary check ─────────────────────────────────────────────────

    /**
     * Resolve a circular RigidBodyGameObject against canvas walls.
     * Clamps position inside and reflects velocity using the body's restitution.
     *
     * @param {{x,y,vx,vy,radius,restitution}} body
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    static resolveCircleBoundary(body, canvasWidth, canvasHeight) {
        const r = body.radius ?? 0;

        if (body.x - r < 0) {
            body.x  = r;
            body.vx = Math.abs(body.vx) * body.restitution;
        } else if (body.x + r > canvasWidth) {
            body.x  = canvasWidth - r;
            body.vx = -Math.abs(body.vx) * body.restitution;
        }

        if (body.y - r < 0) {
            body.y  = r;
            body.vy = Math.abs(body.vy) * body.restitution;
        } else if (body.y + r > canvasHeight) {
            body.y  = canvasHeight - r;
            body.vy = -Math.abs(body.vy) * body.restitution;
        }
    }

    /**
     * Simple boundary test — returns 'left' | 'right' | 'top' | 'bottom' | null.
     * @param {{x,y,width,height}} obj  Object with x/y as TOP-LEFT corner
     * @param {HTMLCanvasElement}  canvas
     */
    static checkBoundaries(obj, canvas) {
        if (obj.x < 0)                              return 'left';
        if (obj.x + obj.width  > canvas.width)      return 'right';
        if (obj.y < 0)                              return 'top';
        if (obj.y + obj.height > canvas.height)     return 'bottom';
        return null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    static #project(vertices, axis) {
        let min = vertices[0].x * axis.x + vertices[0].y * axis.y;
        let max = min;
        for (let i = 1; i < vertices.length; i++) {
            const dot = vertices[i].x * axis.x + vertices[i].y * axis.y;
            if (dot < min) min = dot;
            if (dot > max) max = dot;
        }
        return { min, max };
    }

    static #getNormals(vertices) {
        const normals = [];
        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];
            const edge   = { x: p2.x - p1.x, y: p2.y - p1.y };
            const normal = { x: -edge.y, y: edge.x };
            const len    = Math.sqrt(normal.x ** 2 + normal.y ** 2);
            normals.push({ x: normal.x / len, y: normal.y / len });
        }
        return normals;
    }
}
