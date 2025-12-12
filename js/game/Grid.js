import { GRID_COLS, CELL_TYPES } from '../utils/Constants.js';

export class Grid {
    constructor() {
        this.cols = GRID_COLS;
        // Use Map for sparse row storage (supports infinite world)
        this.cells = new Map();  // key: row number, value: Array[GRID_COLS]
    }

    // Get or create a row
    getRow(row) {
        if (!this.cells.has(row)) {
            return null;
        }
        return this.cells.get(row);
    }

    // Ensure a row exists
    ensureRow(row) {
        if (!this.cells.has(row)) {
            this.cells.set(row, new Array(this.cols).fill(null));
        }
        return this.cells.get(row);
    }

    getCell(col, row) {
        if (col < 0 || col >= this.cols) {
            return null;
        }
        const rowData = this.getRow(row);
        if (!rowData) return null;
        return rowData[col];
    }

    setCell(col, row, value) {
        if (col < 0 || col >= this.cols) {
            return false;
        }
        const rowData = this.ensureRow(row);
        rowData[col] = value;
        return true;
    }

    clearCell(col, row) {
        const rowData = this.getRow(row);
        if (rowData) {
            rowData[col] = null;
        }
        return true;
    }

    // Check if column is valid (row can be any number now)
    isValidColumn(col) {
        return col >= 0 && col < this.cols;
    }

    isEmpty(col, row) {
        return this.getCell(col, row) === null;
    }

    isObstacle(col, row) {
        const cell = this.getCell(col, row);
        return cell !== null && cell.type === CELL_TYPES.OBSTACLE;
    }

    isItem(col, row) {
        const cell = this.getCell(col, row);
        return cell !== null && cell.type === CELL_TYPES.ITEM;
    }

    isPowerup(col, row) {
        const cell = this.getCell(col, row);
        return cell !== null && cell.type === CELL_TYPES.POWERUP;
    }

    // Find next obstacle/item in a direction from a position
    findNextInDirection(startCol, startRow, direction) {
        let col = startCol + direction;

        while (col >= 0 && col < this.cols) {
            const cell = this.getCell(col, startRow);
            if (cell !== null) {
                return { col, row: startRow, cell };
            }
            col += direction;
        }

        return null;
    }

    // Find a safe row (no obstacle) in a column within visible range
    findSafeRowInRange(col, startRow, endRow, fromTop = true) {
        if (fromTop) {
            for (let row = startRow; row <= endRow; row++) {
                if (!this.isObstacle(col, row)) {
                    return row;
                }
            }
        } else {
            for (let row = endRow; row >= startRow; row--) {
                if (!this.isObstacle(col, row)) {
                    return row;
                }
            }
        }
        return null;
    }

    // Clear all cells
    reset() {
        this.cells = new Map();
    }

    // Clean up rows that are far behind the camera (memory management)
    cleanupRowsBefore(row) {
        for (const key of this.cells.keys()) {
            if (key < row) {
                this.cells.delete(key);
            }
        }
    }

    // Clean up rows that are far below the camera (for upward scrolling)
    cleanupRowsAfter(row) {
        for (const key of this.cells.keys()) {
            if (key > row) {
                this.cells.delete(key);
            }
        }
    }

    // Find the word (consecutive non-empty cells) at or after a position
    findWordAt(col, row) {
        if (!this.isValidColumn(col)) return null;

        // If current cell is non-empty, find the boundaries of this word
        if (!this.isEmpty(col, row)) {
            return this.getWordBoundaries(col, row);
        }

        // Current cell is empty, find the next word to the right
        for (let c = col + 1; c < this.cols; c++) {
            if (!this.isEmpty(c, row)) {
                return this.getWordBoundaries(c, row);
            }
        }

        return null;
    }

    // Get the start and end of a word containing the given position
    getWordBoundaries(col, row) {
        if (this.isEmpty(col, row)) return null;

        let start = col;
        let end = col;

        // Find start (scan left)
        while (start > 0 && !this.isEmpty(start - 1, row)) {
            start--;
        }

        // Find end (scan right)
        while (end < this.cols - 1 && !this.isEmpty(end + 1, row)) {
            end++;
        }

        return { start, end, row };
    }

    // Find the next word in a direction (1 = right, -1 = left)
    findNextWord(col, row, direction) {
        if (!this.isValidColumn(col)) return null;

        // First, skip past current word if we're in one
        let currentCol = col;
        while (this.isValidColumn(currentCol) && !this.isEmpty(currentCol, row)) {
            currentCol += direction;
        }

        // Then skip empty cells
        while (this.isValidColumn(currentCol) && this.isEmpty(currentCol, row)) {
            currentCol += direction;
        }

        // If we found a non-empty cell, get its word boundaries
        if (this.isValidColumn(currentCol) && !this.isEmpty(currentCol, row)) {
            return this.getWordBoundaries(currentCol, row);
        }

        return null;
    }

    // Find the previous word (going left from position)
    findPrevWord(col, row) {
        if (!this.isValidColumn(col)) return null;

        // Start searching from one cell to the left
        let currentCol = col - 1;

        // Skip empty cells
        while (currentCol >= 0 && this.isEmpty(currentCol, row)) {
            currentCol--;
        }

        // If we found a non-empty cell, get its word boundaries
        if (currentCol >= 0 && !this.isEmpty(currentCol, row)) {
            return this.getWordBoundaries(currentCol, row);
        }

        return null;
    }

    // Debug: get rows in range
    toString(startRow, endRow) {
        let result = [];
        for (let row = startRow; row <= endRow; row++) {
            const rowData = this.getRow(row);
            if (rowData) {
                result.push(`${row.toString().padStart(3)}: ${rowData.map(c => c ? c.emoji[0] : '.').join('')}`);
            } else {
                result.push(`${row.toString().padStart(3)}: ${'·'.repeat(this.cols)}`);
            }
        }
        return result.join('\n');
    }
}
