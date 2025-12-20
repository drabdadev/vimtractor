import {
    CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE,
    GRID_COLS, GRID_ROWS, CELL_TYPES, PLAYER
} from '../utils/Constants.js';
import { GameConfig } from '../config/GameConfig.js';
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

        // Score popup effects (+2, +3, etc.)
        this.scorePopups = [];

        // Flying vegetable effects (emoji rises and fades)
        this.flyingVegetables = [];

        // Rock transmutation effect state
        this.transmuteEffect = null; // { col, row, progress }
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

        // Special rendering for seeds (pulsing animation)
        if (cell.type === CELL_TYPES.SEED) {
            const age = Date.now() - (cell.plantedAt || Date.now());
            const growthProgress = Math.min(age / cell.growthTime, 1);

            // Pulsing effect as seed grows (faster pulse as it gets closer to growing)
            const pulseSpeed = 200 + (1 - growthProgress) * 300; // Faster near end
            const pulse = Math.sin(age / pulseSpeed) * 0.1;

            // Seed grows larger as it approaches growth time
            const baseScale = 0.5 + growthProgress * 0.3;
            const scale = baseScale + pulse;

            // Draw seed with glow when close to growing
            if (growthProgress > 0.7) {
                this.ctx.save();
                this.ctx.shadowColor = '#00ff88';
                this.ctx.shadowBlur = 8 + (growthProgress - 0.7) * 20;
                this.drawEmojiAt(cell.emoji, centerX, centerY, CELL_SIZE * scale);
                this.ctx.restore();
            } else {
                this.drawEmojiAt(cell.emoji, centerX, centerY, CELL_SIZE * scale);
            }
            return;
        }

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

    drawTractor(tractor, cameraY = 0, isTransmuting = false) {
        const colors = themeManager.getCanvasColors();
        // Draw tractor at world position converted to screen position
        // Use visualX/visualY for smooth animation, then apply camera offset
        let screenX = tractor.visualX;
        let screenY = tractor.visualY - cameraY;

        // Add vibration effect during transmutation
        if (isTransmuting) {
            const vibration = 3; // pixels
            screenX += (Math.random() - 0.5) * vibration * 2;
            screenY += (Math.random() - 0.5) * vibration * 2;
        }

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

        if (this.shakeTime >= GameConfig.animation.shakeDuration) {
            this.isShaking = false;
            this.shakeOffset = { x: 0, y: 0 };
        } else {
            // Decreasing intensity shake
            const progress = this.shakeTime / GameConfig.animation.shakeDuration;
            const intensity = GameConfig.animation.shakeIntensity * (1 - progress);
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
            return exp.time < GameConfig.animation.explosionDuration;
        });
    }

    // Draw explosions with camera offset
    drawExplosions(cameraY = 0) {
        this.explosions.forEach(exp => {
            const progress = exp.time / GameConfig.animation.explosionDuration;
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

    // Add growth effect when seed becomes vegetable
    addGrowthEffect(col, row) {
        // Sparkle burst effect
        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            this.collectEffects.push({
                col: col,
                worldRow: row,
                time: 0,
                emoji: '✨',
                vx: Math.cos(angle) * 40,
                vy: Math.sin(angle) * 40 - 20,
                offsetX: 0,
                offsetY: 0,
                scale: 0.4 + Math.random() * 0.2
            });
        }
        // Center green glow burst
        this.collectEffects.push({
            col: col,
            worldRow: row,
            time: 0,
            emoji: '🌟',
            vx: 0,
            vy: -15,
            offsetX: 0,
            offsetY: 0,
            scale: 0.6
        });
    }

    // Update collection effects
    updateCollectEffects(deltaTime) {
        const duration = GameConfig.animation.collectEffectDuration / 1000; // Convert ms to seconds
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
        const duration = GameConfig.animation.collectEffectDuration / 1000;
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
    addSmokeEffect(col, row, isRed = false) {
        // Add multiple smoke particles for a fuller effect
        const particleCount = isRed ? 5 : 3;
        for (let i = 0; i < particleCount; i++) {
            this.smokeEffects.push({
                col: col,
                worldRow: row,
                time: -i * 30, // Stagger particles
                emoji: '💨',
                offsetX: (Math.random() - 0.5) * 15,
                offsetY: 0,
                vy: -35 - Math.random() * 25, // Float upward
                scale: 0.5 + Math.random() * 0.3,
                delay: 0,
                isRed: isRed // Flag for red tint
            });
        }
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
        const duration = GameConfig.animation.smokeEffectDuration;
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
        const duration = GameConfig.animation.smokeEffectDuration;
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

            // Apply red tint for moai smoke
            if (smoke.isRed) {
                this.ctx.filter = 'hue-rotate(-50deg) saturate(3)';
            }

            this.ctx.font = `${CELL_SIZE * scale}px Arial`;
            this.ctx.fillText(smoke.emoji, screenX, screenY);
            this.ctx.restore();
        });
    }

    // Add score popup (+2, +3, -50, etc.) that floats upward
    addScorePopup(col, row, points) {
        // Format text: negative values show as "-50", positive as "+2"
        const text = points >= 0 ? `+${points}` : `${points}`;
        const isNegative = points < 0;

        this.scorePopups.push({
            col: col,
            worldRow: row,
            time: 0,
            text: text,
            offsetY: 0,
            vy: -80, // pixels per second upward
            scale: 1,
            isNegative: isNegative
        });
    }

    // Update score popups
    updateScorePopups(deltaTime) {
        const duration = 800; // ms duration
        this.scorePopups = this.scorePopups.filter(popup => {
            popup.time += deltaTime;
            popup.offsetY += popup.vy * (deltaTime / 1000);
            // Slow down as it rises
            popup.vy *= 0.97;
            return popup.time < duration;
        });
    }

    // Draw score popups
    drawScorePopups(cameraY = 0) {
        const colors = themeManager.getCanvasColors();
        const duration = 800;
        this.scorePopups.forEach(popup => {
            const progress = popup.time / duration;
            // Fade out in the last half
            const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
            // Scale up slightly at start, then shrink
            const scale = progress < 0.2 ? 1 + progress * 1.5 : 1.3 - progress * 0.5;

            const screenX = popup.col * CELL_SIZE + CELL_SIZE / 2;
            const screenY = (popup.worldRow * CELL_SIZE) - cameraY + CELL_SIZE / 2 + popup.offsetY;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `bold ${14 * scale}px Arial`;
            // Use red for negative values, gold for positive
            this.ctx.fillStyle = popup.isNegative ? '#FF4444' : (colors.SCORE_POPUP || '#FFD700');
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            // Draw text with outline for visibility
            this.ctx.strokeText(popup.text, screenX, screenY);
            this.ctx.fillText(popup.text, screenX, screenY);
            this.ctx.restore();
        });
    }

    // Add flying vegetable effect (emoji rises and fades)
    addFlyingVegetable(col, row, emoji) {
        // Random angle slightly upward
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const speed = 120 + Math.random() * 60; // pixels per second

        this.flyingVegetables.push({
            col: col,
            worldRow: row,
            time: 0,
            emoji: emoji,
            offsetX: 0,
            offsetY: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 8, // radians per second
            scale: 0.7
        });
    }

    // Update flying vegetables
    updateFlyingVegetables(deltaTime) {
        const duration = 600; // ms
        this.flyingVegetables = this.flyingVegetables.filter(veg => {
            veg.time += deltaTime;
            veg.offsetX += veg.vx * (deltaTime / 1000);
            veg.offsetY += veg.vy * (deltaTime / 1000);
            // Add gravity
            veg.vy += 200 * (deltaTime / 1000);
            // Rotation
            veg.rotation += veg.rotationSpeed * (deltaTime / 1000);
            return veg.time < duration;
        });
    }

    // Draw flying vegetables
    drawFlyingVegetables(cameraY = 0) {
        const duration = 600;
        this.flyingVegetables.forEach(veg => {
            const progress = veg.time / duration;
            // Fade out
            const alpha = 1 - progress;
            // Shrink as it flies
            const scale = veg.scale * (1 - progress * 0.5);

            const screenX = veg.col * CELL_SIZE + CELL_SIZE / 2 + veg.offsetX;
            const screenY = (veg.worldRow * CELL_SIZE) - cameraY + CELL_SIZE / 2 + veg.offsetY;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.translate(screenX, screenY);
            this.ctx.rotate(veg.rotation);
            this.ctx.font = `${CELL_SIZE * scale}px Arial`;
            this.ctx.fillText(veg.emoji, 0, 0);
            this.ctx.restore();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROCK TRANSMUTATION EFFECTS
    // ═══════════════════════════════════════════════════════════════════════

    // Start transmutation effect on a rock
    startTransmuteEffect(col, row) {
        this.transmuteEffect = { col, row, startTime: Date.now() };
    }

    // Stop transmutation effect
    stopTransmuteEffect() {
        this.transmuteEffect = null;
    }

    // Draw transmutation progress circle on target rock
    drawTransmuteProgress(cameraY, progress) {
        if (!this.transmuteEffect) return;

        const { col, row } = this.transmuteEffect;
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = (row * CELL_SIZE) - cameraY + CELL_SIZE / 2;

        // Draw background circle
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(x, y - CELL_SIZE * 0.6, 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw progress arc (green)
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.arc(x, y - CELL_SIZE * 0.6, 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        this.ctx.stroke();

        // Draw pulsing glow on the rock
        const pulse = Math.sin(Date.now() / 100) * 0.15 + 0.85;
        this.ctx.save();
        this.ctx.shadowColor = '#00ff88';
        this.ctx.shadowBlur = 15 * pulse;
        this.ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 * pulse})`;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            col * CELL_SIZE + 2,
            (row * CELL_SIZE) - cameraY + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
        this.ctx.restore();
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
        this.updateScorePopups(deltaTime);
        this.updateFlyingVegetables(deltaTime);

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
        this.drawTractor(game.tractor, cameraY, game.isTransmuting);  // Pass transmutation state
        this.drawExplosions(cameraY);
        this.drawCollectEffects(cameraY);
        this.drawSmokeEffects(cameraY);
        this.drawFlyingVegetables(cameraY);
        this.drawScorePopups(cameraY);


        this.ctx.restore();
    }
}
