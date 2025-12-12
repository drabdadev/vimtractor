import { PLAYER, GRID_COLS, CELL_SIZE } from '../utils/Constants.js';
import { GameConfig } from '../config/GameConfig.js';

export class Tractor {
    constructor() {
        // Logical position (grid cell)
        this.col = PLAYER.START_COL;
        this.row = PLAYER.START_ROW;
        this.emoji = PLAYER.EMOJI;

        // Visual position (pixels) for smooth animation
        this.visualX = this.col * CELL_SIZE;
        this.visualY = this.row * CELL_SIZE;
        this.targetX = this.visualX;
        this.targetY = this.visualY;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.startX = this.visualX;
        this.startY = this.visualY;

        // Lives system
        this.lives = GameConfig.player.startingLives;

        // Power-ups (gas cans only)
        this.gasCans = GameConfig.player.startingGasCans;

        // Death state
        this.isDead = false;
        this.normalEmoji = PLAYER.EMOJI;

        // Position history for undo
        this.positionHistory = [];
        this.maxHistoryLength = 60; // ~1 second at 60fps
    }

    // Start animation to new position
    startAnimation() {
        this.startX = this.visualX;
        this.startY = this.visualY;
        this.targetX = this.col * CELL_SIZE;
        this.targetY = this.row * CELL_SIZE;
        this.isAnimating = true;
        this.animationProgress = 0;
    }

    // Update animation (called each frame)
    updateAnimation(deltaTime) {
        if (!this.isAnimating) {
            // When not animating, ensure visual position stays synced with logical position
            // This prevents drift when camera scrolls without tractor movement
            const targetX = this.col * CELL_SIZE;
            const targetY = this.row * CELL_SIZE;
            if (this.visualX !== targetX || this.visualY !== targetY) {
                this.visualX = targetX;
                this.visualY = targetY;
            }
            return;
        }

        this.animationProgress += deltaTime / GameConfig.animation.moveDuration;

        if (this.animationProgress >= 1) {
            this.animationProgress = 1;
            this.isAnimating = false;
            this.visualX = this.targetX;
            this.visualY = this.targetY;
        } else {
            // Ease-out interpolation
            const t = 1 - Math.pow(1 - this.animationProgress, 2);
            this.visualX = this.startX + (this.targetX - this.startX) * t;
            this.visualY = this.startY + (this.targetY - this.startY) * t;
        }
    }

    // Snap visual position to logical (for scroll sync)
    snapToLogical() {
        this.visualX = this.col * CELL_SIZE;
        this.visualY = this.row * CELL_SIZE;
        this.targetX = this.visualX;
        this.targetY = this.visualY;
        this.isAnimating = false;
    }

    // Basic movements
    moveLeft(count = 1) {
        const newCol = Math.max(0, this.col - count);
        const moved = newCol !== this.col;
        this.col = newCol;
        if (moved) this.startAnimation();
        return moved;
    }

    moveRight(count = 1) {
        const newCol = Math.min(GRID_COLS - 1, this.col + count);
        const moved = newCol !== this.col;
        this.col = newCol;
        if (moved) this.startAnimation();
        return moved;
    }

    moveUp(count = 1) {
        // No upper limit - camera system uses negative rows after scrolling
        this.row -= count;
        this.startAnimation();
        return true;
    }

    moveDown(count = 1) {
        // No lower limit - camera system handles game over
        this.row += count;
        this.startAnimation();
        return true;
    }

    // Line movements
    moveToStart() {
        const moved = this.col !== 0;
        this.col = 0;
        if (moved) this.startAnimation();
        return moved;
    }

    moveToEnd() {
        const moved = this.col !== GRID_COLS - 1;
        this.col = GRID_COLS - 1;
        if (moved) this.startAnimation();
        return moved;
    }

    // Set position directly
    setPosition(col, row) {
        // Allow any row (negative rows exist after camera scroll)
        if (col >= 0 && col < GRID_COLS) {
            this.col = col;
            this.row = row;
            this.startAnimation();
            return true;
        }
        return false;
    }

    // Record current position for undo
    recordPosition() {
        this.positionHistory.push({ col: this.col, row: this.row });
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
    }

    // Lives management
    addLife() {
        this.lives++;
    }

    loseLife() {
        this.lives--;
        return this.lives;
    }

    hasLives() {
        return this.lives > 0;
    }

    // Gas can management
    addGasCan() {
        this.gasCans++;
    }

    getGasCans() {
        return this.gasCans;
    }

    useGasCans(count = 1) {
        if (this.gasCans >= count) {
            this.gasCans -= count;
            return true;
        }
        return false;
    }

    // Show explosion emoji
    showExplosion() {
        this.isDead = true;
        this.emoji = '💥';
    }

    // Restore normal emoji
    restoreEmoji() {
        this.isDead = false;
        this.emoji = this.normalEmoji;
    }

    // Reset to initial state
    reset() {
        this.col = PLAYER.START_COL;
        this.row = PLAYER.START_ROW;
        this.visualX = this.col * CELL_SIZE;
        this.visualY = this.row * CELL_SIZE;
        this.targetX = this.visualX;
        this.targetY = this.visualY;
        this.isAnimating = false;
        this.lives = GameConfig.player.startingLives;
        this.gasCans = GameConfig.player.startingGasCans;
        this.positionHistory = [];
        this.isDead = false;
        this.emoji = this.normalEmoji;
    }

    // Get position object
    getPosition() {
        return { col: this.col, row: this.row };
    }
}
