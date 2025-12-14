import {
    GAME_STATES, GRID_ROWS, CELL_TYPES, CELL_SIZE, PLAYER, CANVAS_HEIGHT, SEED_ITEM
} from '../utils/Constants.js?v=42';
import { GameConfig } from '../config/GameConfig.js?v=42';
import { Grid } from './Grid.js';
import { Tractor } from './Tractor.js?v=42';
import { Spawner } from './Spawner.js?v=42';
import { Collision } from './Collision.js';
import { VimParser, COMMAND_TYPES } from '../input/VimParser.js?v=42';
import { InputHandler } from '../input/InputHandler.js';
import { Renderer } from '../render/Renderer.js?v=42';
import { HUD } from '../render/HUD.js?v=42';
import { Storage } from '../utils/Storage.js';
import { soundEngine } from '../audio/SoundEngine.js';
import { themeManager } from '../utils/ThemeManager.js?v=42';

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

        // Canvas reference for viewport calculations
        this.canvas = document.getElementById('game-canvas');

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
        this.scrollInterval = GameConfig.speed.levels[0].interval;
        this.cameraY = 0;  // World Y position of top of screen (pixels)
        this.startingRow = PLAYER.START_ROW;  // Row where tractor starts (for starting line)
        this.lastSpawnedRow = 0;  // Track last spawned row for dynamic spawning
        this.debugMode = false;  // Debug mode: disables scroll for testing

        // Animation frame
        this.lastTime = 0;
        this.animationFrame = null;

        // Rock transmutation state
        this.isTransmuting = false;
        this.transmuteTarget = null;  // { col, row, subtype }
        this.transmuteStartTime = 0;
        this.transmuteProgress = 0;
        this.stopTransmuteSound = null;  // Function to stop transmute sound

        // Setup
        this.setupVimParser();
        this.hud.updateHighScore(this.highScore);

        // Initialize theme manager
        themeManager.init();

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
                    soundEngine.resumeEngine();
                }
            } else if (command.mode === 'command') {
                // Pause game while in command mode (so tractor doesn't fall)
                if (this.state === GAME_STATES.PLAYING) {
                    this.previousState = this.state;
                    this.state = GAME_STATES.PAUSED;
                    this.pausedForCommand = true;
                    soundEngine.pauseEngine();
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
                    soundEngine.pauseEngine();
                }
                return;
            } else if (command.action === 'close') {
                if (this.hud.isHelpVisible()) {
                    this.hud.hideHelp();
                    if (this.previousState === GAME_STATES.PLAYING) {
                        this.state = GAME_STATES.PLAYING;
                        soundEngine.resumeEngine();
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
        // Block movement during transmutation
        if (this.isTransmuting) return;

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
                // G - find safe row at bottom of navigable area (standard grid)
                const visTop = this.getVisibleTopRow();
                const navBottom = this.getNavigableBottomRow();
                const bottomRow = this.grid.findSafeRowInRange(this.tractor.col, visTop, navBottom, false);
                if (bottomRow !== null) {
                    moved = this.tractor.setPosition(this.tractor.col, bottomRow);
                }
                break;
            case 'word_next': {
                // w - move to START of next word (navigation only, no collection)
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
                    // Move to START of the word (no collection)
                    moved = this.tractor.setPosition(targetWord.start, row);
                } else {
                    // No word found, go to end of row (no collection)
                    moved = this.tractor.setPosition(this.grid.cols - 1, row);
                }
                break;
            }
            case 'word_prev': {
                // b - move to START of previous word (navigation only, no collection)
                const startColB = this.tractor.col;
                const row = this.tractor.row;

                const prevWord = this.grid.findPrevWord(startColB, row);

                if (prevWord) {
                    // Move to START of the previous word (no collection)
                    moved = this.tractor.setPosition(prevWord.start, row);
                } else {
                    // No word found, go to start of row (no collection)
                    moved = this.tractor.setPosition(0, row);
                }
                break;
            }
            case 'word_end': {
                // e - move to END of current word (navigation only, no collection)
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
                    // Move to end of word (no collection)
                    moved = this.tractor.setPosition(targetCol, row);
                }
                break;
            }
            case 'word_end_prev': {
                // ge - move to END of previous word (navigation only, no collection)
                const startCol = this.tractor.col;
                const row = this.tractor.row;

                // Find previous word
                const prevWord = this.grid.findPrevWord(startCol, row);
                if (prevWord) {
                    // Go to end of previous word (no collection)
                    moved = this.tractor.setPosition(prevWord.end, row);
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
            case 'find_right': {
                // f{char} - find object to the right, go ON it
                const { targetType } = command;
                const targetCol = this.grid.findObjectOnRow(this.tractor.col, this.tractor.row, 1, targetType);
                if (targetCol !== null) {
                    // For obstacles, stop adjacent (can't go on them)
                    if (targetType === 'rock') {
                        moved = this.tractor.setPosition(targetCol - 1, this.tractor.row);
                    } else {
                        moved = this.tractor.setPosition(targetCol, this.tractor.row);
                    }
                }
                break;
            }
            case 'find_left': {
                // F{char} - find object to the left, go ON it
                const { targetType } = command;
                const targetCol = this.grid.findObjectOnRow(this.tractor.col, this.tractor.row, -1, targetType);
                if (targetCol !== null) {
                    // For obstacles, stop adjacent (can't go on them)
                    if (targetType === 'rock') {
                        moved = this.tractor.setPosition(targetCol + 1, this.tractor.row);
                    } else {
                        moved = this.tractor.setPosition(targetCol, this.tractor.row);
                    }
                }
                break;
            }
            case 'till_right': {
                // t{char} - find object to the right, stop ONE cell before
                const { targetType } = command;
                const targetCol = this.grid.findObjectOnRow(this.tractor.col, this.tractor.row, 1, targetType);
                if (targetCol !== null && targetCol > this.tractor.col + 1) {
                    moved = this.tractor.setPosition(targetCol - 1, this.tractor.row);
                }
                break;
            }
            case 'till_left': {
                // T{char} - find object to the left, stop ONE cell after
                const { targetType } = command;
                const targetCol = this.grid.findObjectOnRow(this.tractor.col, this.tractor.row, -1, targetType);
                if (targetCol !== null && targetCol < this.tractor.col - 1) {
                    moved = this.tractor.setPosition(targetCol + 1, this.tractor.row);
                }
                break;
            }
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
                // dd - clear current row and collect points
                if (this.tractor.getGasCans() >= GameConfig.powerupCosts.dd) {
                    soundEngine.playPowerup();
                    // Add smoke effect before clearing
                    if (this.renderer.addRowSmokeEffect) {
                        this.renderer.addRowSmokeEffect(this.tractor.row);
                    }
                    const results = this.clearRowAndCollect(this.tractor.row);
                    this.tractor.useGasCans(GameConfig.powerupCosts.dd);
                    this.score += results.points;
                    // Add collected lives
                    for (let i = 0; i < results.lives; i++) {
                        this.tractor.addLife();
                    }
                    // Add collected gas cans
                    for (let i = 0; i < results.gasCans; i++) {
                        this.tractor.addGasCan();
                    }
                    // Play appropriate sounds
                    if (results.points > 0) soundEngine.playCollect();
                    if (results.lives > 0) soundEngine.playExtraLife();
                    if (results.gasCans > 0) soundEngine.playGasCanCollect();
                    this.hud.updateScore(this.score);
                    this.updateLivesDisplay();
                    this.updateGasCanDisplay();
                }
                break;
            case 'delete_all':
                // dG - clear entire screen and collect all points
                if (this.tractor.getGasCans() >= GameConfig.powerupCosts.dG) {
                    soundEngine.playPowerup();
                    // Add smoke effect for entire screen before clearing
                    if (this.renderer.addScreenSmokeEffect) {
                        this.renderer.addScreenSmokeEffect(this.getVisibleTopRow(), this.getVisibleBottomRow());
                    }
                    const results = this.clearScreenAndCollect();
                    this.tractor.useGasCans(GameConfig.powerupCosts.dG);
                    this.score += results.points;
                    // Add collected lives
                    for (let i = 0; i < results.lives; i++) {
                        this.tractor.addLife();
                    }
                    // Add collected gas cans
                    for (let i = 0; i < results.gasCans; i++) {
                        this.tractor.addGasCan();
                    }
                    // Play appropriate sounds
                    if (results.points > 0) soundEngine.playCollect();
                    if (results.lives > 0) soundEngine.playExtraLife();
                    if (results.gasCans > 0) soundEngine.playGasCanCollect();
                    this.hud.updateScore(this.score);
                    this.updateLivesDisplay();
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
                // x - delete character(s) at current position (supports count: 3x = 3 chars)
                {
                    const col = this.tractor.col;
                    const row = this.tractor.row;
                    const count = command.count || 1;
                    const endCol = Math.min(col + count - 1, this.grid.cols - 1);
                    this.deleteRangeAndScore(col, endCol, row);
                    // Animate forward, then teleport back (Vim cursor stays in place)
                    if (endCol > col) {
                        this.tractor.setPositionWithReturn(endCol, row, col, row);
                    }
                }
                break;
            case 'delete_char_back':
                // X - delete character(s) to the left (supports count: 3X = 3 chars left)
                {
                    const col = this.tractor.col;
                    const row = this.tractor.row;
                    const count = command.count || 1;
                    const startCol = Math.max(col - count, 0);
                    if (startCol < col) {
                        this.deleteRangeAndScore(startCol, col - 1, row);
                        // Animate backward, then teleport back (Vim cursor stays in place)
                        this.tractor.setPositionWithReturn(startCol, row, col, row);
                    }
                }
                break;
            case 'delete_to_line_start':
                // d0 - delete from current position back to start of line
                {
                    const col = this.tractor.col;
                    const row = this.tractor.row;
                    if (col > 0) {
                        this.deleteRangeAndScore(0, col - 1, row);
                        // Animate backward to start, then teleport back
                        this.tractor.setPositionWithReturn(0, row, col, row);
                    }
                }
                break;
            case 'delete_to_line_end':
                // d$ - delete from current position to end of line
                {
                    const col = this.tractor.col;
                    const row = this.tractor.row;
                    const endCol = this.grid.cols - 1;
                    if (col < endCol) {
                        this.deleteRangeAndScore(col + 1, endCol, row);
                        // Animate forward, then teleport back (Vim cursor stays in place)
                        this.tractor.setPositionWithReturn(endCol, row, col, row);
                    }
                }
                break;
            case 'undo':
                // u - undo (placeholder - not fully implemented)
                // Could restore from position history in the future
                break;

            // Change commands (c) - collect + plant seeds
            case 'change_word':
                // cw - collect from position to start of next word + plant seeds
                this.executeChangeWord();
                break;
            case 'change_word_end':
                // ce - collect from position to end of word + plant seeds
                this.executeChangeWordEnd();
                break;
            case 'change_back':
                // cb - collect backward to previous word + plant seeds
                this.executeChangeBack();
                break;
            case 'change_line':
                // cc - collect entire row + plant seeds (costs gas cans)
                if (this.tractor.getGasCans() >= GameConfig.powerupCosts.cc) {
                    soundEngine.playPowerup();
                    if (this.renderer.addRowSmokeEffect) {
                        this.renderer.addRowSmokeEffect(this.tractor.row);
                    }
                    const results = this.changeRowAndPlantSeeds(this.tractor.row);
                    this.tractor.useGasCans(GameConfig.powerupCosts.cc);
                    this.score += results.points;
                    for (let i = 0; i < results.lives; i++) {
                        this.tractor.addLife();
                    }
                    for (let i = 0; i < results.gasCans; i++) {
                        this.tractor.addGasCan();
                    }
                    if (results.points > 0) soundEngine.playCollect();
                    if (results.lives > 0) soundEngine.playExtraLife();
                    if (results.gasCans > 0) soundEngine.playGasCanCollect();
                    this.hud.updateScore(this.score);
                    this.updateLivesDisplay();
                    this.updateGasCanDisplay();
                }
                break;

            // Rock transmutation command (r + direction)
            case 'replace_rock':
                // Cannot start transmutation if already transmuting
                if (this.isTransmuting) break;

                const targetCell = this.getAdjacentCell(command.direction);
                if (targetCell && targetCell.cell && targetCell.cell.type === CELL_TYPES.OBSTACLE) {
                    this.startTransmutation(targetCell.col, targetCell.row, targetCell.cell.subtype);
                }
                break;
        }
    }

    // Clear a row and return total points, lives, and gas cans collected
    clearRowAndCollect(row) {
        let points = 0;
        let lives = 0;
        let gasCans = 0;
        for (let col = 0; col < this.grid.cols; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell) {
                if (cell.type === CELL_TYPES.ITEM && cell.points) {
                    points += cell.points;
                    // Flying vegetable effect
                    if (this.renderer.addFlyingVegetable) {
                        this.renderer.addFlyingVegetable(col, row, cell.emoji);
                    }
                } else if (cell.type === CELL_TYPES.LIFE) {
                    lives++;
                } else if (cell.type === CELL_TYPES.POWERUP) {
                    gasCans++;
                }
                // Obstacles are just cleared without penalty (using gas to clear them)
                this.grid.clearCell(col, row);
            }
        }
        return { points, lives, gasCans };
    }

    // Clear entire visible screen and return total points, lives, and gas cans collected
    // Only 1/5 (20%) of points are credited to balance the powerful dG command
    clearScreenAndCollect() {
        let totalPoints = 0;
        let lives = 0;
        let gasCans = 0;
        const startRow = this.getVisibleTopRow();
        const endRow = this.getVisibleBottomRow();
        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                const cell = this.grid.getCell(col, row);
                if (cell) {
                    if (cell.type === CELL_TYPES.ITEM && cell.points) {
                        totalPoints += cell.points;
                        // Flying vegetable effect (sparse for performance)
                        if (this.renderer.addFlyingVegetable && Math.random() < 0.3) {
                            this.renderer.addFlyingVegetable(col, row, cell.emoji);
                        }
                    } else if (cell.type === CELL_TYPES.LIFE) {
                        lives++;
                    } else if (cell.type === CELL_TYPES.POWERUP) {
                        gasCans++;
                    }
                    // Obstacles are just cleared without penalty (using gas to clear them)
                    this.grid.clearCell(col, row);
                }
            }
        }
        // Apply dG multiplier to balance the powerful screen clear
        const points = Math.floor(totalPoints * GameConfig.points.dGMultiplier);
        return { points, lives, gasCans };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHANGE COMMANDS (c) - Collect items and plant seeds
    // ═══════════════════════════════════════════════════════════════════════

    // cw - Collect from current position to start of next word + plant seeds
    executeChangeWord() {
        const col = this.tractor.col;
        const row = this.tractor.row;

        const currentWord = this.grid.findWordAt(col, row);
        if (!currentWord) return;

        const nextWord = this.grid.findNextWord(currentWord.end, row, 1);
        const endCol = nextWord ? nextWord.start - 1 : currentWord.end;

        this.collectAndPlantSeeds(col, endCol, row);
        // Animate forward, then teleport back
        if (endCol > col) {
            this.tractor.setPositionWithReturn(endCol, row, col, row);
        }
    }

    // ce - Collect from current position to end of word + plant seeds
    executeChangeWordEnd() {
        const col = this.tractor.col;
        const row = this.tractor.row;

        const currentWord = this.grid.getWordBoundaries(col, row);

        let targetCol;
        if (currentWord && col < currentWord.end) {
            targetCol = currentWord.end;
        } else {
            const nextWord = this.grid.findNextWord(col, row, 1);
            if (nextWord) targetCol = nextWord.end;
        }

        if (targetCol !== undefined) {
            this.collectAndPlantSeeds(col, targetCol, row);
            // Animate forward, then teleport back
            if (targetCol > col) {
                this.tractor.setPositionWithReturn(targetCol, row, col, row);
            }
        }
    }

    // cb - Collect backward to previous word + plant seeds
    executeChangeBack() {
        const col = this.tractor.col;
        const row = this.tractor.row;

        const prevWord = this.grid.findPrevWord(col, row);
        let startCol = prevWord ? prevWord.start : 0;

        if (startCol < col) {
            this.collectAndPlantSeeds(startCol, col - 1, row);
            // Animate backward, then teleport back
            this.tractor.setPositionWithReturn(startCol, row, col, row);
        }
    }

    // Core method: collect items in range and plant seeds
    collectAndPlantSeeds(fromCol, toCol, row) {
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);
        let collected = false;
        let livesLost = 0;
        let powerupCollected = false;
        let lifeCollected = false;

        for (let col = minCol; col <= maxCol; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell) {
                // Skip seeds - they can't be collected
                if (cell.type === CELL_TYPES.SEED) {
                    continue;
                }

                if (cell.type === CELL_TYPES.ITEM && cell.points) {
                    this.score += cell.points;
                    collected = true;
                    // Add collection effects
                    if (this.renderer.addCollectEffect) {
                        this.renderer.addCollectEffect(col, row, cell.emoji);
                    }
                    // Flying vegetable effect
                    if (this.renderer.addFlyingVegetable) {
                        this.renderer.addFlyingVegetable(col, row, cell.emoji);
                    }
                    // Score popup
                    if (this.renderer.addScorePopup) {
                        this.renderer.addScorePopup(col, row, cell.points);
                    }
                } else if (cell.type === CELL_TYPES.OBSTACLE) {
                    livesLost++;
                    if (this.renderer.addExplosion) {
                        this.renderer.addExplosion(col, row);
                    }
                } else if (cell.type === CELL_TYPES.POWERUP) {
                    this.tractor.addGasCan();
                    this.updateGasCanDisplay();
                    powerupCollected = true;
                    if (this.renderer.addCollectEffect) {
                        this.renderer.addCollectEffect(col, row, cell.emoji);
                    }
                } else if (cell.type === CELL_TYPES.LIFE) {
                    if (this.tractor.addLife) {
                        this.tractor.addLife();
                        lifeCollected = true;
                        if (this.renderer.addCollectEffect) {
                            this.renderer.addCollectEffect(col, row, cell.emoji);
                        }
                    }
                }
            }

            // Clear cell and plant seed (even if was empty)
            this.grid.clearCell(col, row);
            this.plantSeed(col, row);
        }

        // Play sounds
        if (collected) soundEngine.playCollect();
        if (powerupCollected) soundEngine.playGasCanCollect();
        if (lifeCollected) soundEngine.playExtraLife();

        // Apply lives lost from obstacles
        for (let i = 0; i < livesLost; i++) {
            if (this.tractor.loseLife) {
                const remaining = this.tractor.loseLife();
                soundEngine.playCrash();
                if (remaining <= 0) {
                    this.updateLivesDisplay();  // Update display BEFORE game over
                    this.gameOver();
                    return;
                }
            }
        }

        this.hud.updateScore(this.score);
        this.updateLivesDisplay();
    }

    // Plant a single seed at position
    plantSeed(col, row) {
        this.grid.setCell(col, row, {
            type: CELL_TYPES.SEED,
            subtype: SEED_ITEM.name,
            emoji: GameConfig.seeds.emoji,
            plantedAt: Date.now(),
            growthTime: GameConfig.seeds.growthTime
        });
    }

    // cc - Change entire row: collect all + plant seeds
    changeRowAndPlantSeeds(row) {
        let points = 0;
        let lives = 0;
        let gasCans = 0;

        for (let col = 0; col < this.grid.cols; col++) {
            const cell = this.grid.getCell(col, row);
            if (cell) {
                // Skip seeds
                if (cell.type === CELL_TYPES.SEED) {
                    continue;
                }

                if (cell.type === CELL_TYPES.ITEM && cell.points) {
                    points += cell.points;
                    // Add collection effects
                    if (this.renderer.addFlyingVegetable) {
                        this.renderer.addFlyingVegetable(col, row, cell.emoji);
                    }
                    if (this.renderer.addScorePopup) {
                        this.renderer.addScorePopup(col, row, cell.points);
                    }
                } else if (cell.type === CELL_TYPES.LIFE) {
                    lives++;
                } else if (cell.type === CELL_TYPES.POWERUP) {
                    gasCans++;
                }
                // Obstacles are cleared without penalty (using gas)
            }

            // Clear and plant seed
            this.grid.clearCell(col, row);
            this.plantSeed(col, row);
        }

        return { points, lives, gasCans };
    }

    // Update seeds: check for growth and convert to vegetables
    updateSeeds() {
        const now = Date.now();
        const visibleTop = this.getVisibleTopRow() - 5;  // Buffer
        const visibleBottom = this.getVisibleBottomRow() + 5;

        for (let row = visibleTop; row <= visibleBottom; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                const cell = this.grid.getCell(col, row);
                if (cell && cell.type === CELL_TYPES.SEED) {
                    const age = now - cell.plantedAt;
                    if (age >= cell.growthTime) {
                        // Grow into random vegetable
                        const vegetable = this.spawner.randomVegetable();
                        this.grid.setCell(col, row, {
                            type: CELL_TYPES.ITEM,
                            subtype: vegetable.name,
                            emoji: vegetable.emoji,
                            points: this.spawner.getItemPoints(vegetable.name)
                        });
                        // Add growth effect
                        if (this.renderer.addGrowthEffect) {
                            this.renderer.addGrowthEffect(col, row);
                        }
                    }
                }
            }
        }
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
    // Game behavior: tractor moves forward through the deleted area (like db moves backward)
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
        // Game behavior: tractor animates forward, then teleports back (Vim cursor stays in place)
        if (endCol > col) {
            this.tractor.setPositionWithReturn(endCol, row, col, row);
        }
    }

    // de - Delete from current position to end of word
    // Game behavior: tractor animates forward, then teleports back (Vim cursor stays in place)
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
            // Game behavior: tractor animates forward, then teleports back (Vim cursor stays in place)
            if (targetCol > col) {
                this.tractor.setPositionWithReturn(targetCol, row, col, row);
            }
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
            // Vim behavior: cursor moves to start of deleted area with 'b' motion
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
                // Skip seeds - they cannot be deleted
                if (cell.type === CELL_TYPES.SEED) {
                    continue;
                }

                if (cell.type === CELL_TYPES.ITEM) {
                    // Item - collect points with animation
                    if (cell.points) {
                        this.score += cell.points;
                        itemsCollected = true;
                        // Add collection effects
                        if (this.renderer.addCollectEffect) {
                            this.renderer.addCollectEffect(col, row, cell.emoji);
                        }
                        // Flying vegetable effect
                        if (this.renderer.addFlyingVegetable) {
                            this.renderer.addFlyingVegetable(col, row, cell.emoji);
                        }
                        // Score popup
                        if (this.renderer.addScorePopup) {
                            this.renderer.addScorePopup(col, row, cell.points);
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
                    this.updateLivesDisplay();  // Update display BEFORE game over
                    this.gameOver();
                    return;
                }
            }
        }

        // Update displays
        this.hud.updateScore(this.score);
        this.updateLivesDisplay();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROCK TRANSMUTATION (r + direction command)
    // ═══════════════════════════════════════════════════════════════════════

    // Get adjacent cell in a direction relative to tractor
    getAdjacentCell(direction) {
        let col = this.tractor.col;
        let row = this.tractor.row;

        switch (direction) {
            case 'left':  col -= 1; break;
            case 'right': col += 1; break;
            case 'up':    row -= 1; break;
            case 'down':  row += 1; break;
            default: return null;
        }

        // Check bounds
        if (col < 0 || col >= this.grid.cols) return null;

        const cell = this.grid.getCell(col, row);
        return { col, row, cell };
    }

    // Start rock transmutation process
    startTransmutation(col, row, rockSubtype) {
        this.isTransmuting = true;
        this.transmuteTarget = { col, row, subtype: rockSubtype };
        this.transmuteStartTime = Date.now();
        // Visual effect: notify renderer that transmutation started
        if (this.renderer.startTransmuteEffect) {
            this.renderer.startTransmuteEffect(col, row);
        }
        // Start working sound (drilling/digging)
        this.stopTransmuteSound = soundEngine.playTransmuteWork();
    }

    // Complete transmutation - rock becomes item or penalty
    completeTransmutation() {
        if (!this.transmuteTarget) return;

        const { col, row, subtype } = this.transmuteTarget;

        // Check if it's a moai rock (trap!)
        const isMoai = subtype === 'stone_pile' || subtype === 'moai';

        if (isMoai) {
            // Moai trap! Lose 50 points
            this.score = Math.max(0, this.score + GameConfig.rockTransmute.moaiPenalty);
            this.hud.updateScore(this.score);
            soundEngine.playPenalty();
            // Remove the moai rock
            this.grid.clearCell(col, row);
            // Show RED smoke effect (moai trap)
            if (this.renderer.addSmokeEffect) {
                this.renderer.addSmokeEffect(col, row, true); // true = red smoke
            }
            // Show penalty popup
            if (this.renderer.addScorePopup) {
                this.renderer.addScorePopup(col, row, GameConfig.rockTransmute.moaiPenalty);
            }
        } else {
            // Normal rock - 50% chance of finding something
            if (Math.random() < GameConfig.rockTransmute.successChance) {
                // Success! Create snail or mushroom
                const resultType = GameConfig.rockTransmute.results[
                    Math.floor(Math.random() * GameConfig.rockTransmute.results.length)
                ];
                const emoji = resultType === 'snail' ? '🐌' : '🍄';
                const points = GameConfig.points[resultType] || GameConfig.rockTransmute.points;

                // Clear rock and place item
                this.grid.clearCell(col, row);
                this.grid.setCell(col, row, {
                    type: CELL_TYPES.ITEM,
                    subtype: resultType,
                    emoji: emoji,
                    points: points
                });

                // Visual feedback
                if (this.renderer.addGrowthEffect) {
                    this.renderer.addGrowthEffect(col, row);
                }
                soundEngine.playCollect();
            } else {
                // Nothing found - just clear the rock with smoke
                this.grid.clearCell(col, row);
                // Show normal smoke effect for empty result
                if (this.renderer.addSmokeEffect) {
                    this.renderer.addSmokeEffect(col, row, false); // false = normal smoke
                }
            }
        }

        // Stop transmutation effect and sound
        if (this.renderer.stopTransmuteEffect) {
            this.renderer.stopTransmuteEffect();
        }
        if (this.stopTransmuteSound) {
            this.stopTransmuteSound();
            this.stopTransmuteSound = null;
        }

        this.isTransmuting = false;
        this.transmuteTarget = null;
        this.transmuteStartTime = 0;
    }

    // Cancel transmutation (e.g., if tractor falls off screen)
    cancelTransmutation() {
        if (this.renderer.stopTransmuteEffect) {
            this.renderer.stopTransmuteEffect();
        }
        // Stop transmutation sound
        if (this.stopTransmuteSound) {
            this.stopTransmuteSound();
            this.stopTransmuteSound = null;
        }
        this.isTransmuting = false;
        this.transmuteTarget = null;
        this.transmuteStartTime = 0;
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
            case 'drabda':
                this.toggleDrabdaMode();
                break;
            case 'unknown':
                this.hud.showMessage(`Unknown command: ${command.raw}`);
                break;
        }
    }

    toggleDrabdaMode() {
        const isDrabda = themeManager.toggleDrabda();
        const message = isDrabda ? 'Drabda Mode: ON' : 'Drabda Mode: OFF';
        this.hud.showMessage(message, 1500);
        this.hud.updateThemeToggle(isDrabda);
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

        // Update infobar (time and position)
        this.hud.updateInfobarTime(this.gameTime);
        // Row shows distance from starting row (how far the player has advanced)
        const rowsAdvanced = this.startingRow - this.tractor.row;
        this.hud.updateInfobarPosition(rowsAdvanced, this.tractor.col);

        // Update tractor animation (if method exists - handles cache compatibility)
        if (this.tractor.updateAnimation) {
            this.tractor.updateAnimation(deltaTime);
        }

        // Update rock transmutation timer
        if (this.isTransmuting) {
            const elapsed = Date.now() - this.transmuteStartTime;
            // Update progress for renderer
            this.transmuteProgress = Math.min(elapsed / GameConfig.rockTransmute.duration, 1);

            if (elapsed >= GameConfig.rockTransmute.duration) {
                this.completeTransmutation();
            }
        }

        // Record position for undo
        this.tractor.recordPosition();

        // Update speed level based on time (each level lasts levelDuration ms)
        const newLevel = Math.min(
            Math.floor(this.gameTime / GameConfig.speed.levelDuration),
            GameConfig.speed.levels.length - 1
        );

        if (newLevel !== this.currentLevel) {
            this.currentLevel = newLevel;
            this.scrollInterval = GameConfig.speed.levels[newLevel].interval;
            this.hud.updateSpeedLevel(newLevel + 1, GameConfig.speed.levels[newLevel].name);
            soundEngine.playLevelUp();
        }

        // Skip scroll in debug mode
        if (!this.debugMode) {
            // Camera scroll: move cameraY DOWN (negative direction)
            // This reveals lower row numbers at the top - player must move UP to keep up
            const scrollSpeed = CELL_SIZE / this.scrollInterval;
            this.cameraY -= deltaTime * scrollSpeed;

            // Spawn new rows as camera reveals them (spawn ahead at TOP - lower row numbers)
            // Difficulty scales based on GameConfig interval
            const difficulty = 1 + this.gameTime / GameConfig.difficulty.scalingInterval;
            const targetRow = this.getVisibleTopRow() - GRID_ROWS;
            while (this.lastSpawnedRow > targetRow) {
                this.lastSpawnedRow--;
                this.spawner.spawnRow(this.lastSpawnedRow, difficulty);
            }

            // Clean up old rows to save memory (remove rows BELOW camera - higher row numbers)
            const cleanupRow = this.getVisibleBottomRow() + 10;
            this.grid.cleanupRowsAfter(cleanupRow);
        }

        // Check if tractor goes above visible screen (skip in debug mode)
        // If tractor is fully above the top edge, lose a life
        const tractorScreenY = this.getTractorScreenY();
        if (!this.debugMode && tractorScreenY < -CELL_SIZE) {
            // Cancel any ongoing transmutation when going off screen
            if (this.isTransmuting) {
                this.cancelTransmutation();
            }

            // Tractor went above visible area - lose a life
            if (this.renderer.startShake) {
                this.renderer.startShake();
            }

            const remainingLives = this.tractor.loseLife();
            this.updateLivesDisplay();

            if (remainingLives <= 0) {
                this.gameOver();
                return;
            }

            // Went off top - play crash sound
            soundEngine.playCrash();

            // Respawn tractor at visible top row
            const safeRow = this.getVisibleTopRow() + 2;
            this.tractor.setPosition(this.tractor.col, safeRow);
        }

        // Check if tractor touches bottom edge of VISIBLE screen (skip in debug mode)
        // Use visual position and the actual visible canvas height (accounts for browser viewport)
        const visibleHeight = this.getVisibleCanvasHeight();
        const bottomEdgeY = visibleHeight - CELL_SIZE;  // Tractor top at this Y means bottom touches visible edge
        if (!this.debugMode && tractorScreenY >= bottomEdgeY) {
            // Cancel any ongoing transmutation when falling off screen
            if (this.isTransmuting) {
                this.cancelTransmutation();
            }

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

            // Respawn tractor above current position
            const safeRow = this.tractor.row - GameConfig.player.respawnRowOffset;
            this.tractor.setPosition(this.tractor.col, safeRow);
        }

        // Update seeds (check for growth)
        this.updateSeeds();

        // Check collision at tractor's position
        this.checkCollisions();

        // Award survival points every second
        if (Math.floor(this.gameTime / 1000) > Math.floor((this.gameTime - deltaTime) / 1000)) {
            this.score += GameConfig.points.survivalPerSecond;
            this.hud.updateScore(this.score);
        }
    }

    // Camera helper methods
    getVisibleTopRow() {
        return Math.floor(this.cameraY / CELL_SIZE);
    }

    getVisibleBottomRow() {
        // For game over detection - uses actual visible height
        const visibleHeight = this.getVisibleCanvasHeight();
        return Math.floor((this.cameraY + visibleHeight) / CELL_SIZE);
    }

    getNavigableBottomRow() {
        // For G command navigation - uses standard grid rows minus safety margin
        // This ensures G stops before the dangerous bottom edge
        const margin = GameConfig.navigation.gCommandMargin;
        return this.getVisibleTopRow() + GRID_ROWS - 1 - margin;
    }

    getTractorScreenY() {
        // Use visualY for screen position check - matches what player sees
        // visualY is in world coordinates (pixels), same as row * CELL_SIZE when not animating
        return this.tractor.visualY - this.cameraY;
    }

    // Get the visible height of the canvas in the browser viewport
    // This accounts for cases where the canvas extends beyond the visible window
    getVisibleCanvasHeight() {
        if (!this.canvas) return CANVAS_HEIGHT;

        const rect = this.canvas.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Canvas top relative to viewport
        const canvasTop = rect.top;
        // Canvas bottom relative to viewport
        const canvasBottom = rect.bottom;

        // If canvas is fully visible, use full height
        if (canvasTop >= 0 && canvasBottom <= viewportHeight) {
            return CANVAS_HEIGHT;
        }

        // If canvas extends below viewport, calculate visible portion
        if (canvasBottom > viewportHeight) {
            // How much of the canvas is cut off at the bottom
            const cutoff = canvasBottom - viewportHeight;
            // Scale from CSS pixels to canvas pixels (canvas might be scaled)
            const scaleY = CANVAS_HEIGHT / rect.height;
            return CANVAS_HEIGHT - (cutoff * scaleY);
        }

        return CANVAS_HEIGHT;
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
        this.scrollInterval = GameConfig.speed.levels[0].interval;

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

        // Show infobar with player info
        this.hud.showInfobar(true);
        this.hud.updateInfobarPlayer(this.playerName);
        this.hud.updateInfobarTime(0);
        this.hud.updateInfobarPosition(0, this.tractor.col);

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

        // Hide infobar
        this.hud.showInfobar(false);

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

        // After delay, show game over screen and play sad music
        setTimeout(() => {
            this.tractor.restoreEmoji();
            soundEngine.playDeathMusic();
            this.hud.showGameOver(this.score, this.highScore);
        }, GameConfig.ui.gameOverDelay);

        // Reset parser for restart
        this.vimParser.reset();
    }

    start() {
        // Setup viewport scaling for smaller screens
        this.setupViewportScaling();

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

    setupViewportScaling() {
        const container = document.getElementById('game-container');
        if (!container) return;

        // Required dimensions (from CSS variables)
        const CONTAINER_HEIGHT = 1066; // canvas 960 + hud 50 + statusline 44 + padding 12
        const CONTAINER_WIDTH = 656;   // canvas 576 + padding 80

        const applyScale = () => {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Calculate scale factors for both dimensions
            const scaleY = Math.min(1, (viewportHeight - 40) / CONTAINER_HEIGHT); // 40px margin
            const scaleX = Math.min(1, (viewportWidth - 40) / CONTAINER_WIDTH);

            // Use the smaller scale to maintain aspect ratio
            const scale = Math.min(scaleX, scaleY);

            if (scale < 1) {
                container.style.transform = `scale(${scale})`;
                container.style.transformOrigin = 'top center';
            } else {
                container.style.transform = '';
                container.style.transformOrigin = '';
            }
        };

        // Apply on load and resize
        applyScale();
        window.addEventListener('resize', applyScale);
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
