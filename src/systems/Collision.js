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
