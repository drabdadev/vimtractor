import {
    CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE,
    GRID_COLS, GRID_ROWS, ANIMATION, CELL_TYPES, PLAYER
} from '../utils/Constants.js';
import { themeManager } from '../utils/ThemeManager.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        // Configure text rendering for emoji
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Screen shake state
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeTime = 0;
        this.isShaking = false;

        // Explosion state
        this.explosions = [];

        // Collection effect particles
        this.collectEffects = [];

        // Smoke effects for dd/dG clear operations
        this.smokeEffects = [];
    }

    clear() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    drawBackground(cameraY = 0) {
        const colors = themeManager.getCanvasColors();
        // Draw checkerboard pattern based on camera position
        // Calculate which world rows are visible
        const startRow = Math.floor(cameraY / CELL_SIZE) - 1;
        const endRow = Math.floor((cameraY + CANVAS_HEIGHT) / CELL_SIZE) + 1;

        for (let row = startRow; row <= endRow; row++) {
            const screenY = (row * CELL_SIZE) - cameraY;
            for (let col = 0; col < GRID_COLS; col++) {
                // Only draw if visible
                if (screenY >= -CELL_SIZE && screenY < CANVAS_HEIGHT + CELL_SIZE) {
                    // Draw normal field checkerboard
                    const isEven = (row + col) % 2 === 0;
                    this.ctx.fillStyle = isEven ? colors.GRID_CELL_EVEN : colors.GRID_CELL_ODD;
                    this.ctx.fillRect(col * CELL_SIZE, screenY, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    drawStartingLine(startingRow, cameraY = 0) {
        const colors = themeManager.getCanvasColors();
        // Simple line at the starting row (world coordinates)
        const screenY = (startingRow * CELL_SIZE) - cameraY;

        // Only draw if visible on screen
        if (screenY >= -CELL_SIZE && screenY <= CANVAS_HEIGHT) {
            this.ctx.strokeStyle = colors.STARTING_LINE;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(CANVAS_WIDTH, screenY);
            this.ctx.stroke();
        }
    }

    drawGridLines(cameraY = 0) {
        const colors = themeManager.getCanvasColors();
        this.ctx.strokeStyle = colors.GRID_LINE;
        this.ctx.lineWidth = 1;

        // Vertical lines (these don't move)
        for (let col = 0; col <= GRID_COLS; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * CELL_SIZE, 0);
            this.ctx.lineTo(col * CELL_SIZE, CANVAS_HEIGHT);
            this.ctx.stroke();
        }

        // Horizontal lines (world rows converted to screen position)
        const startRow = Math.floor(cameraY / CELL_SIZE) - 1;
        const endRow = Math.floor((cameraY + CANVAS_HEIGHT) / CELL_SIZE) + 1;

        for (let row = startRow; row <= endRow; row++) {
            const screenY = (row * CELL_SIZE) - cameraY;
            if (screenY >= 0 && screenY <= CANVAS_HEIGHT) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, screenY);
                this.ctx.lineTo(CANVAS_WIDTH, screenY);
                this.ctx.stroke();
            }
        }
    }

    drawEmojiAt(emoji, xPixels, yPixels, size = CELL_SIZE * 0.8) {
        this.ctx.font = `${size}px Arial`;
        this.ctx.fillText(emoji, xPixels, yPixels);
    }

    drawCellAt(col, yPixels, cell) {
        if (!cell) return;

        const x = col * CELL_SIZE;
        const centerX = x + CELL_SIZE / 2;
        const centerY = yPixels + CELL_SIZE / 2;

        // Draw glow for life items (extra tractors)
        if (cell.type === CELL_TYPES.LIFE) {
            const colors = themeManager.getCanvasColors();
            this.ctx.save();
            this.ctx.shadowColor = colors.LIFE_GLOW;
            this.ctx.shadowBlur = 12;
            this.ctx.strokeStyle = colors.LIFE_GLOW;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                x + 2,
                yPixels + 2,
                CELL_SIZE - 4,
                CELL_SIZE - 4
            );
            this.ctx.restore();
        }

        this.drawEmojiAt(cell.emoji, centerX, centerY);
    }

    drawGrid(grid, cameraY = 0) {
        // Calculate visible world rows from camera position
        const startRow = Math.floor(cameraY / CELL_SIZE);
        const endRow = Math.floor((cameraY + CANVAS_HEIGHT) / CELL_SIZE) + 1;

        for (let row = startRow; row <= endRow; row++) {
            const screenY = (row * CELL_SIZE) - cameraY;
            // Only draw if visible on screen
            if (screenY >= -CELL_SIZE && screenY < CANVAS_HEIGHT + CELL_SIZE) {
                for (let col = 0; col < GRID_COLS; col++) {
                    const cell = grid.getCell(col, row);
                    if (cell) {
                        this.drawCellAt(col, screenY, cell);
                    }
                }
            }
        }
    }

    drawTractor(tractor, cameraY = 0) {
        const colors = themeManager.getCanvasColors();
        // Draw tractor at world position converted to screen position
        // Use visualX/visualY for smooth animation, then apply camera offset
        const screenX = tractor.visualX;
        const screenY = tractor.visualY - cameraY;

        const centerX = screenX + CELL_SIZE / 2;
        const centerY = screenY + CELL_SIZE / 2;

        this.ctx.font = `${CELL_SIZE * 0.8}px Arial`;
        this.ctx.fillText(tractor.emoji, centerX, centerY);

        // Draw border around tractor (more visible)
        this.ctx.strokeStyle = colors.TRACTOR_BORDER;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            screenX + 2,
            screenY + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
    }

    // Start screen shake effect
    startShake() {
        this.isShaking = true;
        this.shakeTime = 0;
    }

    // Update shake effect
    updateShake(deltaTime) {
        if (!this.isShaking) return;

        this.shakeTime += deltaTime;

        if (this.shakeTime >= ANIMATION.SHAKE_DURATION) {
            this.isShaking = false;
            this.shakeOffset = { x: 0, y: 0 };
        } else {
            // Decreasing intensity shake
            const progress = this.shakeTime / ANIMATION.SHAKE_DURATION;
            const intensity = ANIMATION.SHAKE_INTENSITY * (1 - progress);
            this.shakeOffset = {
                x: (Math.random() - 0.5) * 2 * intensity,
                y: (Math.random() - 0.5) * 2 * intensity
            };
        }
    }

    // Add explosion at world position (col, row)
    addExplosion(col, row) {
        this.explosions.push({
            col: col,
            worldRow: row,  // Store world row for camera conversion
            time: 0,
            emoji: '💥'
        });
    }

    // Update explosions
    updateExplosions(deltaTime) {
        this.explosions = this.explosions.filter(exp => {
            exp.time += deltaTime;
            return exp.time < ANIMATION.EXPLOSION_DURATION;
        });
    }

    // Draw explosions with camera offset
    drawExplosions(cameraY = 0) {
        this.explosions.forEach(exp => {
            const progress = exp.time / ANIMATION.EXPLOSION_DURATION;
            const scale = 1 + progress * 0.5; // Grow slightly
            const alpha = 1 - progress; // Fade out

            // Convert world position to screen position
            const screenX = exp.col * CELL_SIZE + CELL_SIZE / 2;
            const screenY = (exp.worldRow * CELL_SIZE) - cameraY + CELL_SIZE / 2;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `${CELL_SIZE * scale}px Arial`;
            this.ctx.fillText(exp.emoji, screenX, screenY);
            this.ctx.restore();
        });
    }

    // Add collection effect with particles
    addCollectEffect(col, row, emoji) {
        // Create multiple particle effects
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            this.collectEffects.push({
                col: col,
                worldRow: row,
                time: 0,
                emoji: emoji,
                vx: Math.cos(angle) * 50, // velocity in pixels/sec
                vy: Math.sin(angle) * 50 - 30, // upward bias
                offsetX: 0,
                offsetY: 0,
                scale: 0.5
            });
        }
        // Center burst
        this.collectEffects.push({
            col: col,
            worldRow: row,
            time: 0,
            emoji: '✨',
            vx: 0,
            vy: -20,
            offsetX: 0,
            offsetY: 0,
            scale: 0.8
        });
    }

    // Update collection effects
    updateCollectEffects(deltaTime) {
        const duration = 0.4; // 400ms effect duration
        this.collectEffects = this.collectEffects.filter(eff => {
            eff.time += deltaTime;
            // Update position based on velocity
            eff.offsetX += eff.vx * deltaTime;
            eff.offsetY += eff.vy * deltaTime;
            // Add gravity
            eff.vy += 100 * deltaTime;
            return eff.time < duration;
        });
    }

    // Draw collection effects
    drawCollectEffects(cameraY = 0) {
        const duration = 0.4;
        this.collectEffects.forEach(eff => {
            const progress = eff.time / duration;
            const alpha = 1 - progress; // Fade out
            const scale = eff.scale * (1 - progress * 0.5); // Shrink

            const screenX = eff.col * CELL_SIZE + CELL_SIZE / 2 + eff.offsetX;
            const screenY = (eff.worldRow * CELL_SIZE) - cameraY + CELL_SIZE / 2 + eff.offsetY;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `${CELL_SIZE * scale}px Arial`;
            this.ctx.fillText(eff.emoji, screenX, screenY);
            this.ctx.restore();
        });
    }

    // Add smoke effect at a single cell (used by dd/dG)
    addSmokeEffect(col, row) {
        this.smokeEffects.push({
            col: col,
            worldRow: row,
            time: 0,
            emoji: '💨',
            offsetX: (Math.random() - 0.5) * 10,
            offsetY: 0,
            vy: -30 - Math.random() * 20, // Float upward
            scale: 0.6 + Math.random() * 0.3,
            delay: Math.random() * 0.1 // Stagger effect slightly
        });
    }

    // Add smoke effects for an entire row (dd command)
    addRowSmokeEffect(row) {
        for (let col = 0; col < GRID_COLS; col++) {
            // Stagger from center outward for nice wave effect
            const centerCol = GRID_COLS / 2;
            const distFromCenter = Math.abs(col - centerCol);
            const delay = distFromCenter * 15; // 15ms per column from center

            this.smokeEffects.push({
                col: col,
                worldRow: row,
                time: -delay, // Negative time creates delay (in ms)
                emoji: '💨',
                offsetX: 0,
                offsetY: 0,
                vy: -40 - Math.random() * 20, // pixels per second
                scale: 0.5 + Math.random() * 0.2,
                delay: 0
            });
        }
    }

    // Add smoke effects for entire screen (dG command)
    addScreenSmokeEffect(startRow, endRow) {
        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                // Minimal wave effect - nearly instant (max ~80ms total)
                const delay = (row - startRow) * 3 + col * 2; // ms

                this.smokeEffects.push({
                    col: col,
                    worldRow: row,
                    time: -delay, // Negative time creates delay (in ms)
                    emoji: '💨',
                    offsetX: 0,
                    offsetY: 0,
                    vy: -50 - Math.random() * 30, // pixels per second
                    scale: 0.4 + Math.random() * 0.2,
                    delay: 0
                });
            }
        }
    }

    // Update smoke effects
    updateSmokeEffects(deltaTime) {
        const duration = 600; // 600ms effect duration
        this.smokeEffects = this.smokeEffects.filter(smoke => {
            smoke.time += deltaTime;

            // Only animate if past delay
            if (smoke.time > 0) {
                // velocity is in pixels per second, deltaTime in ms
                smoke.offsetY += smoke.vy * (deltaTime / 1000);
                // Slow down as it rises
                smoke.vy *= 0.98;
                // Drift slightly sideways
                smoke.offsetX += (Math.random() - 0.5) * 2;
            }

            return smoke.time < duration;
        });
    }

    // Draw smoke effects
    drawSmokeEffects(cameraY = 0) {
        const duration = 600; // ms
        this.smokeEffects.forEach(smoke => {
            // Skip if still in delay period
            if (smoke.time < 0) return;

            const progress = smoke.time / duration;
            // Fade in quickly then fade out
            const fadeIn = Math.min(1, smoke.time / 100); // 100ms fade in
            const fadeOut = 1 - Math.pow(progress, 2);
            const alpha = fadeIn * fadeOut * 0.8;

            // Scale up slightly as it dissipates
            const scale = smoke.scale * (1 + progress * 0.3);

            const screenX = smoke.col * CELL_SIZE + CELL_SIZE / 2 + smoke.offsetX;
            const screenY = (smoke.worldRow * CELL_SIZE) - cameraY + CELL_SIZE / 2 + smoke.offsetY;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `${CELL_SIZE * scale}px Arial`;
            this.ctx.fillText(smoke.emoji, screenX, screenY);
            this.ctx.restore();
        });
    }

    // Draw a highlight on a cell (for movement preview, etc.)
    highlightCell(col, row, color = null) {
        const colors = themeManager.getCanvasColors();
        this.ctx.fillStyle = color || colors.HIGHLIGHT;
        this.ctx.fillRect(
            col * CELL_SIZE,
            row * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );
    }

    // Flash effect for collision
    flashScreen(color = null) {
        const colors = themeManager.getCanvasColors();
        this.ctx.fillStyle = color || colors.FLASH_COLOR;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Draw score popup at position
    drawScorePopup(col, row, text, color = null) {
        const colors = themeManager.getCanvasColors();
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = row * CELL_SIZE;

        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = color || colors.SCORE_POPUP;
        this.ctx.fillText(text, x, y);
    }

    // Full render frame
    render(game, deltaTime = 0, cameraY = 0, startingRow = PLAYER.START_ROW) {
        // Update effects
        this.updateShake(deltaTime);
        this.updateExplosions(deltaTime);
        this.updateCollectEffects(deltaTime);
        this.updateSmokeEffects(deltaTime);

        // Apply shake offset
        this.ctx.save();
        if (this.isShaking) {
            this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
        }

        this.clear();
        this.drawBackground(cameraY);
        this.drawGridLines(cameraY);
        this.drawStartingLine(startingRow, cameraY);  // Starting line scrolls with world
        this.drawGrid(game.grid, cameraY);
        this.drawTractor(game.tractor, cameraY);  // Tractor in world coords
        this.drawExplosions(cameraY);
        this.drawCollectEffects(cameraY);
        this.drawSmokeEffects(cameraY);

        this.ctx.restore();
    }
}
