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
        const wordConfig = GameConfig.spawn.wordSpawning;

        // Use word-based spawning if enabled
        if (wordConfig && wordConfig.enabled) {
            this.spawnWordBasedRow(row, difficulty);
        } else {
            this.spawnLegacyRow(row, difficulty);
        }
    }

    // NEW: Word-based spawning - creates text-like patterns
    // Words = groups of vegetables, Spaces = empty cells between words
    spawnWordBasedRow(row, difficulty) {
        const wordConfig = GameConfig.spawn.wordSpawning;
        const spawned = new Set();

        // Determine number of words for this row
        const numWords = Math.floor(
            Math.random() * (wordConfig.wordsPerRow.max - wordConfig.wordsPerRow.min + 1)
        ) + wordConfig.wordsPerRow.min;

        let currentCol = 0;

        // Add initial gap sometimes (like indentation)
        if (Math.random() < 0.3) {
            currentCol = Math.floor(Math.random() * 3) + 1;
        }

        for (let w = 0; w < numWords && currentCol < GRID_COLS - 3; w++) {
            // Add gap before word (except first word if no indent)
            if (w > 0) {
                const gap = Math.floor(
                    Math.random() * (wordConfig.wordGapMax - wordConfig.wordGapMin + 1)
                ) + wordConfig.wordGapMin;
                currentCol += gap;
            }

            // Determine word length
            const maxPossibleLength = Math.min(
                wordConfig.wordLength.max,
                GRID_COLS - currentCol - 1
            );
            if (maxPossibleLength < wordConfig.wordLength.min) break;

            const wordLength = Math.floor(
                Math.random() * (maxPossibleLength - wordConfig.wordLength.min + 1)
            ) + wordConfig.wordLength.min;

            // Choose one vegetable type for the entire "word"
            const vegetable = this.randomVegetable();

            // Spawn the word (consecutive cells of same vegetable)
            for (let i = 0; i < wordLength && currentCol + i < GRID_COLS; i++) {
                const col = currentCol + i;
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.ITEM,
                    subtype: vegetable.name,
                    emoji: vegetable.emoji,
                    points: this.getItemPoints(vegetable.name)
                });
                spawned.add(col);
            }

            currentCol += wordLength;
        }

        // Rare obstacle spawn in empty cells (5% base, scaled by difficulty)
        const obstacleRate = Math.min(
            GameConfig.spawn.obstacle * difficulty,
            GameConfig.spawn.maxObstacleRate
        );

        for (let col = 0; col < GRID_COLS; col++) {
            if (!spawned.has(col) && Math.random() < obstacleRate) {
                const obstacle = this.randomObstacle();
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.OBSTACLE,
                    subtype: obstacle.name,
                    emoji: obstacle.emoji
                });
                spawned.add(col);
            }
        }

        // Spawn powerups (gas cans) in empty cells
        for (let col = 0; col < GRID_COLS; col++) {
            if (!spawned.has(col) && Math.random() < GameConfig.spawn.powerup) {
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

        // Spawn lives (very rare) in empty cells
        for (let col = 0; col < GRID_COLS; col++) {
            if (!spawned.has(col) && Math.random() < GameConfig.spawn.life) {
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.LIFE,
                    subtype: LIFE_ITEM.name,
                    emoji: LIFE_ITEM.emoji
                });
                spawned.add(col);
            }
        }

        // Ensure passable path
        this.ensurePassablePath(row);
    }

    // Legacy spawning (kept for compatibility)
    spawnLegacyRow(row, difficulty) {
        const obstacleRate = Math.min(GameConfig.spawn.obstacle * difficulty, GameConfig.spawn.maxObstacleRate);
        const itemRate = GameConfig.spawn.item;
        const powerupRate = GameConfig.spawn.powerup;
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

        // Spawn items
        for (let col = 0; col < GRID_COLS; col++) {
            if (spawned.has(col)) continue;
            if (Math.random() < itemRate) {
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

        // Spawn powerups
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

        // Spawn lives
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
