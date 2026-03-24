import { GameObject } from "./GameObject.js";

export class Grid extends GameObject {
    constructor(x, y, width, height, cellSize) {
        super(x, y);
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
    }

    init() {
        // Create 2D array of cells
        this.cells = [];
        for (let y = 0; y < this.height; y += this.cellSize) {
            const row = [];
            for (let x = 0; x < this.width; x += this.cellSize) {
                row.push({ x: this.x + x, y: this.y + y, occupied: 0 });
            }
            this.cells.push(row);
        }
    }

    clearOccupancy() {
        // Zero out occupied in-place each frame
        for (const row of this.cells) {
            for (const cell of row) {
                cell.occupied = 0;
            }
        }
    }

    draw(ctx) {
        ctx.strokeStyle = 'rgb(255, 0, 0)';
        ctx.lineWidth = 1;
        ctx.save();
        ctx.beginPath();

        // Vertical lines
        for (let x = this.x; x <= this.x + this.width; x += this.cellSize) {
            ctx.moveTo(x, this.y);
            ctx.lineTo(x, this.y + this.height);
        }

        // Horizontal lines
        for (let y = this.y; y <= this.y + this.height; y += this.cellSize) {
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y);
        }
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }    
}