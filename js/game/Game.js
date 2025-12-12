import {
    GAME_STATES, SPEED_LEVELS, LEVEL_DURATION, GRID_ROWS, CELL_TYPES, CELL_SIZE, PLAYER, CANVAS_HEIGHT
} from '../utils/Constants.js?v=11';
import { Grid } from './Grid.js?v=11';
import { Tractor } from './Tractor.js?v=11';
import { Spawner } from './Spawner.js?v=11';
import { Collision } from './Collision.js?v=11';
import { VimParser, COMMAND_TYPES } from '../input/VimParser.js?v=13';
import { InputHandler } from '../input/InputHandler.js?v=11';
import { Renderer } from '../render/Renderer.js?v=11';
import { HUD } from '../render/HUD.js?v=11';
import { Storage } from '../utils/Storage.js?v=11';
import { soundEngine } from '../audio/SoundEngine.js?v=12';

export class Game {
    constructor() {
        // Core components
        this.grid = new Grid();
        this.tractor = new Tractor();
        this.spawner = new Spawner(this.grid);
        this.collision = new Collision(this.grid, this.tractor);
        this.vimParser = new VimParser();
        this.inputHandler = new InputHandler(this.vimParser);
        this.renderer = new Renderer('game-canvas');
        this.hud = new HUD();
        this.storage = new Storage();

        // Game state
        this.state = GAME_STATES.NAME_INPUT;
        this.previousState = null;
        this.pausedForCommand = false;
        this.score = 0;
        this.highScore = this.storage.getHighScore();
        this.gameTime = 0;
        this.playerName = this.storage.getPlayerName();

        // Camera system (world coordinates)
        this.currentLevel = 0;
        this.scrollInterval = SPEED_LEVELS[0].interval;
        this.cameraY = 0;  // World Y position of top of screen (pixels)
        this.startingRow = PLAYER.START_ROW;  // Row where tractor starts (for starting line)
        this.lastSpawnedRow = 0;  // Track last spawned row for dynamic spawning
        this.debugMode = false;  // Debug mode: disables scroll for testing

        // Animation frame
        this.lastTime = 0;
        this.animationFrame = null;

        // Setup
        this.setupVimParser();
        this.hud.updateHighScore(this.highScore);

        // Sound engine (initialized on first user interaction)
        this.soundInitialized = false;
    }

    initSound() {
        if (!this.soundInitialized) {
            soundEngine.init();
            this.soundInitialized = true;
        }
        soundEngine.resume();
    }

    setupVimParser() {
        this.vimParser.setCommandHandler((command) => {
            this.handleVimCommand(command);
        });
    }

    handleVimCommand(command) {
        // Initialize sound on first user interaction
        this.initSound();

        // Track command for telemetry
        if (command.type === COMMAND_TYPES.MOVE || command.type === COMMAND_TYPES.ACTION) {
            this.storage.trackCommand(command.direction || command.action);
        }

        // Update HUD for mode changes and counts
        if (command.type === 'mode') {
            this.hud.updateMode(command.mode);
            if (command.mode === 'normal') {
                this.hud.updateCount(0);
                // Resume game if was paused for command mode
                if (this.pausedForCommand && this.previousState === GAME_STATES.PLAYING) {
                    this.state = GAME_STATES.PLAYING;
                    this.pausedForCommand = false;
                }
            } else if (command.mode === 'command') {
                // Pause game while in command mode (so tractor doesn't fall)
                if (this.state === GAME_STATES.PLAYING) {
                    this.previousState = this.state;
                    this.state = GAME_STATES.PAUSED;
                    this.pausedForCommand = true;
                }
                soundEngine.playCommandMode();
            }
            return;
        }

        if (command.type === 'count') {
            this.hud.updateCount(command.count);
            return;
        }

        if (command.type === 'command_buffer') {
            this.hud.updateCommandBuffer(command.buffer);
            return;
        }

        // Handle help commands (available in any state)
        if (command.type === 'help') {
            if (command.action === 'toggle') {
                const helpOpened = this.hud.toggleHelp();
                if (helpOpened && this.state === GAME_STATES.PLAYING) {
                    this.previousState = this.state;
                    this.state = GAME_STATES.PAUSED;
                }
                return;
            } else if (command.action === 'close') {
                if (this.hud.isHelpVisible()) {
                    this.hud.hideHelp();
                    if (this.previousState === GAME_STATES.PLAYING) {
                        this.state = GAME_STATES.PLAYING;
                    }
                    return;
                }
                // Don't return - let Escape fall through to state handlers
            }
        }

        // If help is visible, ignore other commands except close
        if (this.hud.isHelpVisible()) {
            return;
        }

        // Handle commands based on game state
        if (this.state === GAME_STATES.NAME_INPUT) {
            // Name input is handled separately via DOM events
            return;
        }

        if (this.state === GAME_STATES.LEADERBOARD) {
            // Escape goes back to menu
            if (command.type === 'help' && command.action === 'close') {
                this.hud.hideLeaderboard();
                this.enterMenuState();
            }
            return;
        }

        if (this.state === GAME_STATES.MENU) {
            // Start menu jingle if not already running (sound needs user interaction first)
            if (!soundEngine.menuJingleRunning) {
                soundEngine.startMenuJingle();
            }

            // Tab shows leaderboard
            if (command.type === 'leaderboard') {
                this.showLeaderboard();
                return;
            }
            this.startGame();
            return;
        }

        if (this.state === GAME_STATES.GAME_OVER) {
            // Tab shows leaderboard
            if (command.type === 'leaderboard') {
                this.showLeaderboard();
                return;
            }
            // Accept :restart command, Enter, or any movement/action key to go to menu
            if (command.type === COMMAND_TYPES.COMMAND_LINE && command.command === 'restart') {
                this.startGame();
            } else if (command.type === 'enter' || command.type === COMMAND_TYPES.MOVE || command.type === COMMAND_TYPES.ACTION) {
                // Go to menu first
                this.enterMenuState();
            }
            return;
        }

        if (this.state !== GAME_STATES.PLAYING) {
            return;
        }

        // Handle debug toggle (spacebar)
        if (command.type === 'debug_toggle') {
            this.toggleDebugMode();
            return;
        }

        // Handle movement
        if (command.type === COMMAND_TYPES.MOVE) {
            this.handleMove(command);
        }

        // Handle actions
        if (command.type === COMMAND_TYPES.ACTION) {
            this.handleAction(command);
        }

        // Handle command line
        if (command.type === COMMAND_TYPES.COMMAND_LINE) {
            this.handleCommandLine(command);
        }

        // Clear count display after command
        this.hud.updateCount(0);
    }

    handleMove(command) {
        const { direction, count } = command;
        let moved = false;

        switch (direction) {
            case 'left':
                moved = this.tractor.moveLeft(count);
                break;
            case 'right':
                moved = this.tractor.moveRight(count);
                break;
            case 'up':
                moved = this.tractor.moveUp(count);
                break;
            case 'down':
                moved = this.tractor.moveDown(count);
                break;
            case 'line_start':
                moved = this.tractor.moveToStart();
                break;
            case 'line_end':
                moved = this.tractor.moveToEnd();
                break;
            case 'file_start':
                // gg - find safe row at top of visible area
                const visibleTop = this.getVisibleTopRow();
                const visibleBottom = this.getVisibleBottomRow();
                const topRow = this.grid.findSafeRowInRange(this.tractor.col, visibleTop, visibleBottom, true);
                if (topRow !== null) {
                    moved = this.tractor.setPosition(this.tractor.col, topRow);
                }
                break;
            case 'file_end':
                // G - find safe row at bottom of visible area
                const visTop = this.getVisibleTopRow();
                const visBottom = this.getVisibleBottomRow();
                const bottomRow = this.grid.findSafeRowInRange(this.tractor.col, visTop, visBottom, false);
                if (bottomRow !== null) {
                    moved = this.tractor.setPosition(this.tractor.col, bottomRow);
                }
                break;
            case 'word_next': {
                // w - move to START of next word (Vim behavior)
                const startCol = this.tractor.col;
                const row = this.tractor.row;

                let targetWord;
                // If on a non-empty cell, find the NEXT word
                if (!this.grid.isEmpty(startCol, row)) {
                    targetWord = this.grid.findNextWord(startCol, row, 1);
                } else {
                    // If on empty cell, find word at or after current position
                    targetWord = this.grid.findWordAt(startCol, row);
                }

                if (targetWord) {
                    // Move to START of the word
                    const targetCol = targetWord.start;
                    this.collectItemsInRange(startCol + 1, targetCol - 1, row);
                    moved = this.tractor.setPosition(targetCol, row);
                } else {
                    // No word found, go to end of row
                    this.collectItemsInRange(startCol + 1, this.grid.cols - 1, row);
                    moved = this.tractor.setPosition(this.grid.cols - 1, row);
                }
                break;
            }
            case 'word_prev': {
                // b - move to START of previous word (Vim behavior)
                const startColB = this.tractor.col;
                const row = this.tractor.row;

                const prevWord = this.grid.findPrevWord(startColB, row);

                if (prevWord) {
                    // Move to START of the previous word
                    const targetCol = prevWord.start;
                    this.collectItemsInRange(targetCol + 1, startColB - 1, row);
                    moved = this.tractor.setPosition(targetCol, row);
                } else {
                    // No word found, go to start of row
                    this.collectItemsInRange(0, startColB - 1, row);
                    moved = this.tractor.setPosition(0, row);
                }
                break;
            }
            case 'word_end': {
                // e - move to END of current word, or END of next word if at end (Vim behavior)
                const startColE = this.tractor.col;
                const row = this.tractor.row;

                let targetCol;
                const currentWord = this.grid.getWordBoundaries(startColE, row);

                if (currentWord && startColE < currentWord.end) {
                    // Inside a word but not at the end - go to end of this word
                    targetCol = currentWord.end;
                } else {
                    // At end of word or on empty cell - find next word
                    const nextWord = this.grid.findNextWord(startColE, row, 1);
                    if (nextWord) {
                        targetCol = nextWord.end;
                    }
                }

                if (targetCol !== undefined) {
                    // Collect items along the path (including destination)
                    this.collectItemsInRange(startColE + 1, targetCol, row);
                    moved = this.tractor.setPosition(targetCol, row);
                }
                break;
            }
            case 'word_end_prev': {
                // ge - move to END of previous word (Vim behavior)
                const startCol = this.tractor.col;
                const row = this.tractor.row;

                // Find previous word
                const prevWord = this.grid.findPrevWord(startCol, row);
                if (prevWord) {
                    // Go to end of previous word
                    const targetCol = prevWord.end;
                    // Collect items along the path (going left)
                    this.collectItemsInRange(targetCol, startCol - 1, row);
                    moved = this.tractor.setPosition(targetCol, row);
                }
                break;
            }
            case 'page_down':
                // Ctrl+f - move down by half the screen
                moved = this.tractor.moveDown(Math.floor(GRID_ROWS / 2));
                break;
            case 'page_up':
                // Ctrl+b - move up by half the screen
                moved = this.tractor.moveUp(Math.floor(GRID_ROWS / 2));
                break;
        }

        // Check collision after move
        if (moved) {
            soundEngine.playMove();
            this.checkCollisions();
        }
    }

    handleAction(command) {
        const { action } = command;

        switch (action) {
            case 'delete_line':
                // dd - clear current row and collect points (requires 1 gas can)
                if (this.tractor.getGasCans() >= 1) {
                    soundEngine.playPowerup();
                    const points = this.clearRowAndCollect(this.tractor.row);
                    this.tractor.useGasCans(1);
                    this.score += points;
                    this.hud.updateScore(this.score);
                    this.updateGasCanDisplay();
                }
                break;
            case 'delete_all':
                // dG - clear entire screen and collect all points (requires 2+ gas cans)
                if (this.tractor.getGasCans() >= 2) {
                    soundEngine.playPowerup();
                    const points = this.clearScreenAndCollect();
                    this.tractor.useGasCans(2);
                    this.score += points;
                    this.hud.updateScore(this.score);
                    this.updateGasCanDisplay();
                }
                break;
            case 'delete_word':
                // dw - delete from position to start of next word
                this.executeDeleteWord();
                break;
            case 'delete_word_end':
                // de - delete from position to end of current/next word
                this.executeDeleteWordEnd();
                break;
            case 'delete_back':
                // db - delete backward to after previous word
                this.executeDeleteBack(false);
                break;
            case 'delete_back_aggressive':
                // dB - delete backward including rock at boundary
                this.executeDeleteBack(true);
                break;
            case 'delete_char':
                // x - delete character at current position
                this.deleteRangeAndScore(this.tractor.col, this.tractor.col, this.tractor.row);
                break;
            case 'undo':
                // u - undo (placeholder - not fully implemented)
                // Could restore from position history in the future
                break;
        }
    }

    // Clear a row and return total points collected
    clearRowAndCollect(row) {
        let points = 0;
        for (let col = 0; col < this.grid.cols; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell) {
                if (cell.points) {
                    points += cell.points;
                }
                this.grid.clearCell(col, row);
            }
        }
        return points;
    }

    // Clear entire visible screen and return total points collected
    clearScreenAndCollect() {
        let points = 0;
        const startRow = this.getVisibleTopRow();
        const endRow = this.getVisibleBottomRow();
        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                const cell = this.grid.getCell(col, row);
                if (cell) {
                    if (cell.points) {
                        points += cell.points;
                    }
                    this.grid.clearCell(col, row);
                }
            }
        }
        return points;
    }

    // Collect items in a horizontal range (for word movements)
    collectItemsInRange(fromCol, toCol, row) {
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);
        let collected = false;

        for (let col = minCol; col <= maxCol; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell && cell.type === CELL_TYPES.ITEM) {
                // It's an item, collect it with animation
                if (cell.points) {
                    this.score += cell.points;
                    collected = true;
                    // Add collection effect
                    if (this.renderer.addCollectEffect) {
                        this.renderer.addCollectEffect(col, row, cell.emoji);
                    }
                }
                this.grid.clearCell(col, row);
            }
        }

        if (collected) {
            soundEngine.playCollect();
        }
        this.hud.updateScore(this.score);
    }

    // dw - Delete from current position to start of next word
    // Vim behavior: cursor stays in place after deletion
    executeDeleteWord() {
        const col = this.tractor.col;
        const row = this.tractor.row;

        // Find the current word (if on one) or next word
        const currentWord = this.grid.findWordAt(col, row);
        if (!currentWord) return;

        // Find the next word after current
        const nextWord = this.grid.findNextWord(currentWord.end, row, 1);

        // Delete from current position to:
        // - If there's a next word: one cell before it
        // - If no next word: end of current word
        const endCol = nextWord ? nextWord.start - 1 : currentWord.end;

        this.deleteRangeAndScore(col, endCol, row);
        // Cursor stays in place (Vim behavior)
    }

    // de - Delete from current position to end of word
    // Vim behavior: cursor stays in place after deletion
    executeDeleteWordEnd() {
        const col = this.tractor.col;
        const row = this.tractor.row;

        const currentWord = this.grid.getWordBoundaries(col, row);

        let targetCol;
        if (currentWord && col < currentWord.end) {
            // Inside a word but not at the end - delete to end of this word
            targetCol = currentWord.end;
        } else {
            // At end of word or on empty cell - delete to end of next word
            const nextWord = this.grid.findNextWord(col, row, 1);
            if (nextWord) {
                targetCol = nextWord.end;
            }
        }

        if (targetCol !== undefined) {
            this.deleteRangeAndScore(col, targetCol, row);
            // Cursor stays in place (Vim behavior)
        }
    }

    // db/dB - Delete backward (Vim behavior: delete to START of previous word)
    // Vim behavior: cursor moves to start of deleted area
    executeDeleteBack(includeRockAtBoundary) {
        const col = this.tractor.col;
        const row = this.tractor.row;

        // Find previous word
        const prevWord = this.grid.findPrevWord(col, row);

        let startCol;
        if (prevWord) {
            // db - delete from START of previous word to current position - 1
            // (Vim's db deletes to where 'b' would move)
            startCol = prevWord.start;
        } else {
            // No previous word, delete from start of row
            startCol = 0;
        }

        // Delete from startCol to position before current (db doesn't delete current char)
        if (startCol < col) {
            this.deleteRangeAndScore(startCol, col - 1, row);
            // Cursor moves to start of deleted area (Vim behavior)
            this.tractor.setPosition(startCol, row);
        }
    }

    // Delete a range of cells and calculate score/lives
    // Items give points, obstacles cost a life
    deleteRangeAndScore(fromCol, toCol, row) {
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);
        let livesLost = 0;
        let itemsCollected = false;
        let powerupCollected = false;
        let lifeCollected = false;

        for (let col = minCol; col <= maxCol; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell) {
                if (cell.type === CELL_TYPES.ITEM) {
                    // Item - collect points with animation
                    if (cell.points) {
                        this.score += cell.points;
                        itemsCollected = true;
                        // Add collection effect
                        if (this.renderer.addCollectEffect) {
                            this.renderer.addCollectEffect(col, row, cell.emoji);
                        }
                    }
                } else if (cell.type === CELL_TYPES.OBSTACLE) {
                    // Obstacle - lose a life with explosion
                    livesLost++;
                    if (this.renderer.addExplosion) {
                        this.renderer.addExplosion(col, row);
                    }
                } else if (cell.type === CELL_TYPES.POWERUP) {
                    // Powerup - collect it with animation
                    this.tractor.addGasCan();
                    this.updateGasCanDisplay();
                    powerupCollected = true;
                    if (this.renderer.addCollectEffect) {
                        this.renderer.addCollectEffect(col, row, cell.emoji);
                    }
                } else if (cell.type === CELL_TYPES.LIFE) {
                    // Life item - gain a life with animation
                    if (this.tractor.addLife) {
                        this.tractor.addLife();
                        lifeCollected = true;
                        if (this.renderer.addCollectEffect) {
                            this.renderer.addCollectEffect(col, row, cell.emoji);
                        }
                    }
                }
                this.grid.clearCell(col, row);
            }
        }

        // Play sounds based on what was collected/destroyed
        if (itemsCollected) {
            soundEngine.playCollect();
        }
        if (powerupCollected) {
            soundEngine.playGasCanCollect();
        }
        if (lifeCollected) {
            soundEngine.playExtraLife();
        }

        // Apply lives lost
        for (let i = 0; i < livesLost; i++) {
            if (this.tractor.loseLife) {
                const remaining = this.tractor.loseLife();
                soundEngine.playCrash();
                if (remaining <= 0) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Update displays
        this.hud.updateScore(this.score);
        this.updateLivesDisplay();
    }

    handleCommandLine(command) {
        switch (command.command) {
            case 'quit':
            case 'save_quit':
                this.gameOver();
                break;
            case 'restart':
                this.startGame();
                break;
            case 'unknown':
                this.hud.showMessage(`Unknown command: ${command.raw}`);
                break;
        }
    }

    checkCollisions() {
        const results = this.collision.process();

        // Handle both old (gameOver) and new (collision) format
        const hasCollision = results.collision || results.gameOver;

        if (hasCollision) {
            // Hit an obstacle - trigger effects
            if (this.renderer.startShake) {
                this.renderer.startShake();
            }
            if (this.renderer.addExplosion) {
                this.renderer.addExplosion(this.tractor.col, this.tractor.row);
            }

            // Lose a life (if lives system exists)
            if (this.tractor.loseLife) {
                const remainingLives = this.tractor.loseLife();
                this.updateLivesDisplay();

                if (remainingLives <= 0) {
                    // Game over - sound played in gameOver()
                    this.gameOver();
                    return;
                }

                // Just lost a life - play crash sound
                soundEngine.playCrash();

                // Clear the obstacle that was hit
                this.grid.clearCell(this.tractor.col, this.tractor.row);
            } else {
                // Old behavior - immediate game over
                this.gameOver();
                return;
            }
        }

        if (results.pickup) {
            // Add collection effect
            if (this.renderer.addCollectEffect && results.pickup.emoji) {
                this.renderer.addCollectEffect(this.tractor.col, this.tractor.row, results.pickup.emoji);
            }

            if (results.pickup.type === 'item') {
                soundEngine.playCollect();
                this.score += results.pickup.points;
                this.hud.updateScore(this.score);
            } else if (results.pickup.type === 'powerup') {
                soundEngine.playGasCanCollect();
                this.tractor.addGasCan();
                this.updateGasCanDisplay();
            } else if (results.pickup.type === 'life') {
                soundEngine.playExtraLife();
                if (this.tractor.addLife) {
                    this.tractor.addLife();
                    this.updateLivesDisplay();
                }
            }
        }
    }

    updateGasCanDisplay() {
        this.hud.updateGasCans(this.tractor.getGasCans());
    }

    updateLivesDisplay() {
        if (this.hud.updateLives && this.tractor.lives !== undefined) {
            this.hud.updateLives(this.tractor.lives);
        }
    }

    update(deltaTime) {
        if (this.state !== GAME_STATES.PLAYING) {
            return;
        }

        this.gameTime += deltaTime;

        // Update tractor animation (if method exists - handles cache compatibility)
        if (this.tractor.updateAnimation) {
            this.tractor.updateAnimation(deltaTime);
        }

        // Record position for undo
        this.tractor.recordPosition();

        // Update speed level based on time (each level lasts LEVEL_DURATION ms)
        const newLevel = Math.min(
            Math.floor(this.gameTime / LEVEL_DURATION),
            SPEED_LEVELS.length - 1
        );

        if (newLevel !== this.currentLevel) {
            this.currentLevel = newLevel;
            this.scrollInterval = SPEED_LEVELS[newLevel].interval;
            this.hud.updateSpeedLevel(newLevel + 1, SPEED_LEVELS[newLevel].name);
            soundEngine.playLevelUp();
        }

        // Skip scroll in debug mode
        if (!this.debugMode) {
            // Camera scroll: move cameraY DOWN (negative direction)
            // This reveals lower row numbers at the top - player must move UP to keep up
            const scrollSpeed = CELL_SIZE / this.scrollInterval;
            this.cameraY -= deltaTime * scrollSpeed;

            // Spawn new rows as camera reveals them (spawn ahead at TOP - lower row numbers)
            const difficulty = 1 + this.gameTime / 30000;
            const targetRow = this.getVisibleTopRow() - GRID_ROWS;
            while (this.lastSpawnedRow > targetRow) {
                this.lastSpawnedRow--;
                this.spawner.spawnRow(this.lastSpawnedRow, difficulty);
            }

            // Clean up old rows to save memory (remove rows BELOW camera - higher row numbers)
            const cleanupRow = this.getVisibleBottomRow() + 10;
            this.grid.cleanupRowsAfter(cleanupRow);
        }

        // Check if tractor touches bottom edge of screen (skip in debug mode)
        const tractorScreenY = this.getTractorScreenY();
        const bottomEdgeY = CANVAS_HEIGHT - CELL_SIZE;
        if (!this.debugMode && tractorScreenY >= bottomEdgeY) {
            // Tractor touched bottom edge - lose a life
            if (this.renderer.startShake) {
                this.renderer.startShake();
            }

            const remainingLives = this.tractor.loseLife();
            this.updateLivesDisplay();

            if (remainingLives <= 0) {
                this.gameOver();
                return;
            }

            // Fell off screen - play crash sound
            soundEngine.playCrash();

            // Respawn tractor 5 rows up from current position
            const safeRow = this.tractor.row - 5;
            this.tractor.setPosition(this.tractor.col, safeRow);
        }

        // Check collision at tractor's position
        this.checkCollisions();

        // Award survival points every second
        if (Math.floor(this.gameTime / 1000) > Math.floor((this.gameTime - deltaTime) / 1000)) {
            this.score += 1;
            this.hud.updateScore(this.score);
        }
    }

    // Camera helper methods
    getVisibleTopRow() {
        return Math.floor(this.cameraY / CELL_SIZE);
    }

    getVisibleBottomRow() {
        return Math.floor((this.cameraY + CANVAS_HEIGHT) / CELL_SIZE);
    }

    getTractorScreenY() {
        return (this.tractor.row * CELL_SIZE) - this.cameraY;
    }

    render(deltaTime) {
        this.renderer.render(this, deltaTime, this.cameraY, this.startingRow);
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render(deltaTime);

        this.animationFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    startGame() {
        // Reset state
        this.state = GAME_STATES.PLAYING;
        this.score = 0;
        this.gameTime = 0;

        // Reset speed level system
        this.currentLevel = 0;
        this.scrollInterval = SPEED_LEVELS[0].interval;

        // Reset camera system
        this.cameraY = 0;
        this.startingRow = PLAYER.START_ROW;

        // Reset components
        this.grid.reset();
        this.tractor.reset();
        this.vimParser.reset();

        // Spawn initial content and track last spawned row
        this.lastSpawnedRow = this.spawner.spawnInitialRows();

        // Update UI
        this.hud.updateScore(0);
        this.hud.updateMode('normal');
        this.hud.updateCount(0);
        this.hud.resetLevel();
        this.hud.resetGasCans();
        this.updateLivesDisplay();
        this.hud.hideOverlay();

        // Track telemetry
        this.storage.incrementGamePlayed();

        // Start input handling
        this.inputHandler.enable();

        // Audio: stop menu jingle, start engine
        soundEngine.stopMenuJingle();
        soundEngine.startEngine();
    }

    async showLeaderboard() {
        this.state = GAME_STATES.LEADERBOARD;
        // Show cached data immediately
        this.hud.showLeaderboard(this.storage.getLeaderboard(), this.playerName);
        // Then fetch fresh data from server
        const freshData = await this.storage.fetchLeaderboard();
        if (this.state === GAME_STATES.LEADERBOARD) {
            this.hud.showLeaderboard(freshData, this.playerName);
        }
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.hud.updateDebugMode(this.debugMode);
        return this.debugMode;
    }

    gameOver() {
        this.state = GAME_STATES.GAME_OVER;

        // Stop engine
        soundEngine.stopEngine();

        // Show explosion emoji on tractor and play explosion sound
        this.tractor.showExplosion();
        soundEngine.playExplosion();

        // Add score to leaderboard (async, will submit to server)
        if (this.playerName && this.score > 0) {
            this.storage.addToLeaderboard(this.playerName, this.score);
        }

        // Update high score
        if (this.storage.updateHighScore(this.score)) {
            this.highScore = this.score;
            this.hud.updateHighScore(this.highScore);
        }

        // After 1.5 seconds, show game over screen and play sad music
        setTimeout(() => {
            this.tractor.restoreEmoji();
            soundEngine.playDeathMusic();
            this.hud.showGameOver(this.score, this.highScore);
        }, 1500);

        // Reset parser for restart
        this.vimParser.reset();
    }

    start() {
        // Check if player has a saved name
        if (this.playerName) {
            // Go directly to menu
            this.state = GAME_STATES.MENU;
            this.hud.showMenu(this.playerName);
            // Start menu jingle (will be initialized on first keypress)
        } else {
            // Show name input
            this.state = GAME_STATES.NAME_INPUT;
            this.hud.showNameInput();
            this.setupNameInput();
        }

        // Enable input - VimParser handles menu state via handleVimCommand
        this.inputHandler.enable();

        // Start game loop
        this.lastTime = performance.now();
        this.animationFrame = requestAnimationFrame((t) => this.gameLoop(t));
    }

    // Start menu jingle when entering menu
    enterMenuState() {
        this.state = GAME_STATES.MENU;
        this.hud.showMenu(this.playerName);
        soundEngine.stopEngine();
        soundEngine.startMenuJingle();
    }

    setupNameInput() {
        const nameInput = document.getElementById('player-name');
        if (!nameInput) return;

        // Handle Enter key on name input
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const name = nameInput.value.trim();
                if (name.length > 0) {
                    this.playerName = name;
                    this.storage.setPlayerName(name);
                    // Initialize sound and enter menu
                    this.initSound();
                    this.enterMenuState();
                }
            }
        });
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.inputHandler.disable();
        soundEngine.stopAll();
    }
}
