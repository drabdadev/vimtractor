import { CELL_TYPES } from '../utils/Constants.js';

export class Collision {
    constructor(grid, tractor) {
        this.grid = grid;
        this.tractor = tractor;
    }

    // Check collision at tractor's current position
    check() {
        const { col, row } = this.tractor.getPosition();
        const cell = this.grid.getCell(col, row);

        if (!cell) {
            return { collision: false, type: null };
        }

        return {
            collision: true,
            type: cell.type,
            cell: cell
        };
    }

    // Check if a specific position has an obstacle
    hasObstacle(col, row) {
        return this.grid.isObstacle(col, row);
    }

    // Check if position would cause collision
    wouldCollide(col, row) {
        return this.grid.isObstacle(col, row);
    }

    // Check for item pickup
    checkPickup() {
        const { col, row } = this.tractor.getPosition();
        const cell = this.grid.getCell(col, row);

        if (!cell) {
            return null;
        }

        if (cell.type === CELL_TYPES.ITEM) {
            // Remove item from grid
            this.grid.clearCell(col, row);
            return {
                type: 'item',
                subtype: cell.subtype,
                points: cell.points || 1
            };
        }

        if (cell.type === CELL_TYPES.POWERUP) {
            // Remove powerup from grid
            this.grid.clearCell(col, row);
            return {
                type: 'powerup',
                subtype: cell.subtype,
                action: cell.action
            };
        }

        if (cell.type === CELL_TYPES.LIFE) {
            // Remove life item from grid
            this.grid.clearCell(col, row);
            return {
                type: 'life',
                subtype: cell.subtype
            };
        }

        return null;
    }

    // Check if tractor hit an obstacle
    checkObstacleCollision() {
        const { col, row } = this.tractor.getPosition();
        return this.grid.isObstacle(col, row);
    }

    // Process all collisions and pickups
    process() {
        const results = {
            collision: false,
            pickup: null
        };

        // Check for obstacle collision first
        if (this.checkObstacleCollision()) {
            results.collision = true;
            return results;
        }

        // Check for pickups
        results.pickup = this.checkPickup();

        return results;
    }
}
