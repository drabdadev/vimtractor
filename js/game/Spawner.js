import {
    GRID_COLS, GRID_ROWS, CELL_TYPES,
    OBSTACLES, ITEMS, POWERUPS, LIFE_ITEM, PLAYER
} from '../utils/Constants.js';
import { GameConfig } from '../config/GameConfig.js';

export class Spawner {
    constructor(grid) {
        this.grid = grid;
        this.obstacleTypes = Object.values(OBSTACLES);
        this.itemTypes = Object.values(ITEMS);
        this.powerupTypes = Object.values(POWERUPS);
    }

    // Get points for an item by name from GameConfig
    getItemPoints(itemName) {
        return GameConfig.points[itemName] || 1;
    }

    // Spawn content for a new row
    spawnRow(row = 0, difficulty = 1) {
        // Adjust spawn rates based on difficulty (cap at maxObstacleRate for playability)
        const obstacleRate = Math.min(GameConfig.spawn.obstacle * difficulty, GameConfig.spawn.maxObstacleRate);
        const itemRate = GameConfig.spawn.item;
        const powerupRate = GameConfig.spawn.powerup;

        // Track spawned cells to avoid overlap
        const spawned = new Set();

        // Spawn obstacles
        for (let col = 0; col < GRID_COLS; col++) {
            if (spawned.has(col)) continue;

            if (Math.random() < obstacleRate) {
                const obstacle = this.randomObstacle();
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.OBSTACLE,
                    subtype: obstacle.name,
                    emoji: obstacle.emoji
                });
                spawned.add(col);
            }
        }

        // Chance to spawn a consecutive vegetable group
        const vgConfig = GameConfig.spawn.vegetableGroup;
        if (Math.random() < vgConfig.chance) {
            const groupLength = Math.floor(Math.random() * (vgConfig.maxLength - vgConfig.minLength + 1)) + vgConfig.minLength;
            const vegetable = this.randomVegetable();

            // Find a starting position that has enough consecutive free cells
            const maxStart = GRID_COLS - groupLength;
            let startCol = Math.floor(Math.random() * (maxStart + 1));

            // Check if we have enough free cells starting from startCol
            let canPlace = true;
            for (let i = 0; i < groupLength; i++) {
                if (spawned.has(startCol + i)) {
                    canPlace = false;
                    break;
                }
            }

            // If original position blocked, try to find another
            if (!canPlace) {
                for (let attempt = 0; attempt < maxStart; attempt++) {
                    startCol = Math.floor(Math.random() * (maxStart + 1));
                    canPlace = true;
                    for (let i = 0; i < groupLength; i++) {
                        if (spawned.has(startCol + i)) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (canPlace) break;
                }
            }

            // Place the vegetable group
            if (canPlace) {
                for (let i = 0; i < groupLength; i++) {
                    const col = startCol + i;
                    this.grid.setCell(col, row, {
                        type: CELL_TYPES.ITEM,
                        subtype: vegetable.name,
                        emoji: vegetable.emoji,
                        points: this.getItemPoints(vegetable.name)
                    });
                    spawned.add(col);
                }
            }
        }

        // Spawn individual items (in remaining empty cells)
        for (let col = 0; col < GRID_COLS; col++) {
            if (spawned.has(col)) continue;

            if (Math.random() < itemRate * 0.5) { // Reduced rate since we have groups
                const item = this.randomItem();
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.ITEM,
                    subtype: item.name,
                    emoji: item.emoji,
                    points: this.getItemPoints(item.name)
                });
                spawned.add(col);
            }
        }

        // Spawn powerups (rare, in remaining cells)
        for (let col = 0; col < GRID_COLS; col++) {
            if (spawned.has(col)) continue;

            if (Math.random() < powerupRate) {
                const powerup = this.randomPowerup();
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.POWERUP,
                    subtype: powerup.name,
                    emoji: powerup.emoji,
                    action: powerup.action
                });
                spawned.add(col);
            }
        }

        // Spawn lives (very rare, in remaining cells)
        for (let col = 0; col < GRID_COLS; col++) {
            if (spawned.has(col)) continue;

            if (Math.random() < GameConfig.spawn.life) {
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.LIFE,
                    subtype: LIFE_ITEM.name,
                    emoji: LIFE_ITEM.emoji
                });
                spawned.add(col);
            }
        }

        // Ensure at least one path through
        this.ensurePassablePath(row);
    }

    // Make sure there's at least one empty cell for the player to pass
    ensurePassablePath(row) {
        let hasPath = false;

        for (let col = 0; col < GRID_COLS; col++) {
            if (!this.grid.isObstacle(col, row)) {
                hasPath = true;
                break;
            }
        }

        // If no path, clear a random obstacle
        if (!hasPath) {
            const clearCol = Math.floor(Math.random() * GRID_COLS);
            this.grid.clearCell(clearCol, row);
        }
    }

    randomObstacle() {
        return this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
    }

    randomVegetable() {
        const vegetables = [
            ITEMS.TOMATO, ITEMS.LETTUCE, ITEMS.ZUCCHINI, ITEMS.GRAPES,
            ITEMS.POTATO, ITEMS.CARROT, ITEMS.ASPARAGUS,
            ITEMS.PEPPER, ITEMS.WHEAT, ITEMS.CORN
        ];
        return vegetables[Math.floor(Math.random() * vegetables.length)];
    }

    randomItem() {
        // Weighted random selection based on GameConfig distribution
        const dist = GameConfig.spawn.itemDistribution;
        const rand = Math.random();
        if (rand < dist.vegetables) {
            // Vegetables
            const vegetables = [
                ITEMS.TOMATO, ITEMS.LETTUCE, ITEMS.ZUCCHINI, ITEMS.GRAPES,
                ITEMS.POTATO, ITEMS.CARROT, ITEMS.ASPARAGUS,
                ITEMS.PEPPER, ITEMS.WHEAT, ITEMS.CORN
            ];
            return vegetables[Math.floor(Math.random() * vegetables.length)];
        } else if (rand < dist.vegetables + dist.coins) {
            // Coins
            return ITEMS.COIN;
        }
        // Gems (rare)
        return ITEMS.GEM;
    }

    randomPowerup() {
        return this.powerupTypes[Math.floor(Math.random() * this.powerupTypes.length)];
    }

    // Spawn initial rows for game start (world coordinates)
    // Camera scrolls UP (decreasing cameraY), so player moves UP (decreasing row) to keep up
    // Returns the LOWEST spawned row number (for tracking lastSpawnedRow)
    spawnInitialRows() {
        const tractorRow = PLAYER.START_ROW;
        const safeRows = GameConfig.difficulty.safeZoneRows;

        // Safe zone: rows from tractorRow down to tractorRow - safeRows (no obstacles)
        const safeStartRow = tractorRow - safeRows;
        for (let row = safeStartRow; row <= tractorRow; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (Math.random() < GameConfig.spawn.item * 0.5) {
                    const item = this.randomItem();
                    this.grid.setCell(col, row, {
                        type: CELL_TYPES.ITEM,
                        subtype: item.name,
                        emoji: item.emoji,
                        points: this.getItemPoints(item.name)
                    });
                }
            }
        }

        // Spawn normal content ABOVE safe zone (lower row numbers - where player goes)
        const topRow = safeStartRow - GRID_ROWS - GameConfig.difficulty.initialBufferRows;
        for (let row = safeStartRow - 1; row >= topRow; row--) {
            this.spawnRow(row, 1);
        }

        // Spawn some decorative rocks BELOW tractor (higher row numbers - scroll off bottom)
        for (let row = tractorRow + 1; row <= tractorRow + GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (Math.random() < 0.08) {
                    const obstacle = this.randomObstacle();
                    this.grid.setCell(col, row, {
                        type: CELL_TYPES.OBSTACLE,
                        subtype: obstacle.name,
                        emoji: obstacle.emoji
                    });
                }
            }
        }

        // Return the lowest spawned row (for tracking - will decrease from here)
        return topRow;
    }
}
