import { GameObject } from "./GameObject.js";

export class Grid extends GameObject {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} cellSize
     * @param {Object} colorMap - { colorKey: hexString } e.g. { red: '#FF6B6B' }
     */
    constructor(x, y, width, height, cellSize, colorMap = {}) {
        super(x, y);
        this.width    = width;
        this.height   = height;
        this.cellSize = cellSize;
        this.colorMap = colorMap;
    }

    init() {
        // Logical cells — used for BFS path detection and rendering
        this.cells = [];
        for (let y = 0; y < this.height; y += this.cellSize) {
            const row = [];
            for (let x = 0; x < this.width; x += this.cellSize) {
                row.push({
                    x: this.x + x,
                    y: this.y + y,
                    densities:     {},
                    dominantColor: null,
                });
            }
            this.cells.push(row);
        }

        // Sub-cells at half the cell size (2×2 per logical cell).
        // Pre-allocated to avoid per-frame GC pressure.
        this._subSize = this.cellSize / 2;
        const subCols = Math.ceil(this.width  / this._subSize);
        const subRows = Math.ceil(this.height / this._subSize);
        this._subcells = Array.from({ length: subRows }, () =>
            Array.from({ length: subCols }, () => ({ densities: {} }))
        );
    }

    clearOccupancy() {
        for (const row of this.cells) {
            for (const cell of row) {
                for (const k in cell.densities) cell.densities[k] = 0;
                cell.dominantColor = null;
            }
        }
        for (const row of this._subcells) {
            for (const sc of row) {
                for (const k in sc.densities) sc.densities[k] = 0;
            }
        }
    }

    /**
     * Splat particles into the 2×2 sub-grid first, then aggregate into logical
     * cells. The finer resolution prevents a single particle on a cell edge from
     * diluting its color contribution across two cells.
     * @param {Blob[]} blobs
     * @param {number} contribution - per-particle weight (default 1.0)
     */
    checkOccupancy(blobs, contribution = 1.0) {
        const subSize = this._subSize;
        const subRows = this._subcells.length;
        const subCols = this._subcells[0]?.length ?? 0;

        // ── Step 1: bilinear splat into sub-cells ──────────────────────────────
        for (const blob of blobs) {
            const ck = blob.colorKey;
            for (const p of blob.particles) {
                const lx = (p.x - this.x) / subSize;
                const ly = (p.y - this.y) / subSize;

                const col0 = Math.floor(lx);
                const row0 = Math.floor(ly);
                const fx   = lx - col0;
                const fy   = ly - row0;

                const splat = [
                    { c: col0,     r: row0,     w: (1 - fx) * (1 - fy) },
                    { c: col0 + 1, r: row0,     w:  fx       * (1 - fy) },
                    { c: col0,     r: row0 + 1, w: (1 - fx) *  fy       },
                    { c: col0 + 1, r: row0 + 1, w:  fx       *  fy      },
                ];

                for (const { c, r, w } of splat) {
                    if (r >= 0 && r < subRows && c >= 0 && c < subCols) {
                        const sc = this._subcells[r][c];
                        sc.densities[ck] = (sc.densities[ck] ?? 0) + contribution * w;
                    }
                }
            }
        }

        // ── Step 2: aggregate 2×2 sub-cells → logical cell densities ──────────
        const cellRows = this.cells.length;
        const cellCols = this.cells[0]?.length ?? 0;
        for (let r = 0; r < cellRows; r++) {
            for (let c = 0; c < cellCols; c++) {
                const cell = this.cells[r][c];
                const d    = cell.densities;
                for (let sr = 0; sr < 2; sr++) {
                    for (let sc = 0; sc < 2; sc++) {
                        const subR = r * 2 + sr;
                        const subC = c * 2 + sc;
                        if (subR < subRows && subC < subCols) {
                            const sub = this._subcells[subR][subC];
                            for (const [color, val] of Object.entries(sub.densities)) {
                                d[color] = (d[color] ?? 0) + val;
                            }
                        }
                    }
                }
            }
        }

        this._computeDominantColors();
    }

    /** Assign each cell its dominant color — whichever exceeds the threshold most. */
    _computeDominantColors() {
        // Threshold is relative to the aggregated sum of 4 sub-cells, so it scales
        // with contribution. 0.5 means a cell needs at least half a particle's worth
        // of a single color before it claims that color.
        const THRESHOLD = 0.5;
        for (const row of this.cells) {
            for (const cell of row) {
                let best = null;
                let bestVal = THRESHOLD;
                for (const [color, val] of Object.entries(cell.densities)) {
                    if (val > bestVal) { bestVal = val; best = color; }
                }
                cell.dominantColor = best;
            }
        }
    }

    /**
     * BFS left-wall → right-wall connectivity check for a single colorKey.
     * Returns true if any contiguous path of same-color cells spans the grid.
     */
    _hasColorPath(colorKey) {
        const rows = this.cells.length;
        const cols = this.cells[0]?.length ?? 0;
        if (cols < 2) return false;

        const visited = new Uint8Array(rows * cols);
        const queue   = [];

        for (let r = 0; r < rows; r++) {
            if (this.cells[r][0].dominantColor === colorKey) {
                visited[r * cols] = 1;
                queue.push(r * cols);
            }
        }

        const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let head = 0;
        while (head < queue.length) {
            const idx = queue[head++];
            const r   = (idx / cols) | 0;
            const c   = idx % cols;
            if (c === cols - 1) return true; // reached right wall
            for (const [dr, dc] of DIRS) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                const nidx = nr * cols + nc;
                if (!visited[nidx] && this.cells[nr][nc].dominantColor === colorKey) {
                    visited[nidx] = 1;
                    queue.push(nidx);
                }
            }
        }
        return false;
    }

    /** Returns array of colorKeys that currently have a left-to-right path. */
    getColorPaths() {
        return Object.keys(this.colorMap).filter(c => this._hasColorPath(c));
    }

    update(dt, blobs) {
        this.clearOccupancy();
        if (blobs && blobs.length > 0) this.checkOccupancy(blobs);
    }

    draw(ctx) {
        ctx.save();

        // ── Color density overlay ─────────────────────────────────────────────
        for (const row of this.cells) {
            for (const cell of row) {
                if (!cell.dominantColor) continue;
                const hex = this.colorMap[cell.dominantColor];
                if (!hex) continue;
                ctx.globalAlpha = 0.22;
                ctx.fillStyle   = hex;
                ctx.fillRect(cell.x, cell.y, this.cellSize, this.cellSize);
            }
        }
        ctx.globalAlpha = 1;

        // ── Grid lines ────────────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth   = 1;
        ctx.beginPath();

        for (let x = this.x; x <= this.x + this.width; x += this.cellSize) {
            ctx.moveTo(x, this.y);
            ctx.lineTo(x, this.y + this.height);
        }
        for (let y = this.y; y <= this.y + this.height; y += this.cellSize) {
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y);
        }

        ctx.stroke();
        ctx.restore();
    }
}