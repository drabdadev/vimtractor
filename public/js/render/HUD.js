import { themeManager } from '../utils/ThemeManager.js';
import { SloganManager } from '../ui/SloganManager.js';

export class HUD {
    constructor() {
        this.scoreEl = document.getElementById('score-value');
        this.highScoreEl = document.getElementById('high-score-value');
        this.overlay = document.getElementById('overlay');
        this.nameScreen = document.getElementById('name-screen');
        this.menuScreen = document.getElementById('menu-screen');

        // Slogan typewriter
        this.sloganManager = new SloganManager('slogan');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.helpScreen = document.getElementById('help-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.finalScore = document.getElementById('final-score');
        this.finalHighScore = document.getElementById('final-high-score');
        this.playerNameInput = document.getElementById('player-name');
        this.playerDisplayName = document.getElementById('player-display-name');
        this.helpVisible = false;
        this.leaderboardVisible = false;
        this.versionInfo = document.getElementById('version-info');
        this.loadVersionInfo();

        // Vim statusline elements
        this.statusline = document.getElementById('vim-statusline');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.commandPrefix = document.getElementById('command-prefix');
        this.commandBuffer = document.getElementById('command-buffer');
        this.cursor = document.getElementById('cursor');
        this.statuslineHint = document.getElementById('statusline-hint');

        // Level indicator element
        this.levelIndicator = document.getElementById('level-indicator');
        this.speedLevelEl = document.getElementById('speed-level');

        // Lives indicator
        this.livesIndicator = document.getElementById('lives-indicator');
        this.livesCount = document.getElementById('lives-count');

        // Gas can indicator
        this.powerupGas = document.getElementById('powerup-gas');
        this.gasCount = document.getElementById('gas-count');

        // Debug toggle
        this.debugToggle = document.getElementById('debug-toggle');

        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');
        this.drabdaMessage = document.getElementById('drabda-message');

        // Vim infobar (Neovim-style permanent status line)
        this.infobar = document.getElementById('vim-infobar');
        this.infobarPlayer = document.getElementById('infobar-player');
        this.infobarTime = document.getElementById('infobar-time');
        this.infobarPosition = document.getElementById('infobar-position');

        this.setupThemeToggle();
        this.setupHelpTabs();
    }

    setupHelpTabs() {
        const tabs = document.querySelectorAll('.help-tab');
        const contents = document.querySelectorAll('.help-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update active content
                contents.forEach(content => {
                    if (content.dataset.content === targetTab) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
    }

    setupThemeToggle() {
        if (this.themeToggle) {
            // Set initial state
            this.updateThemeToggle(themeManager.isDrabdaMode());

            // Add click handler
            this.themeToggle.addEventListener('click', () => {
                const isDrabda = themeManager.toggleDrabda();
                this.updateThemeToggle(isDrabda);
            });
        }
    }

    updateThemeToggle(isDrabda) {
        if (this.themeToggle) {
            // Keep label fixed, only toggle active state for on/off effect
            this.themeToggle.title = isDrabda
                ? 'Drabda mode ON (:drabda)'
                : 'Drabda mode OFF (:drabda)';
            if (isDrabda) {
                this.themeToggle.classList.add('active');
            } else {
                this.themeToggle.classList.remove('active');
            }
        }
        // Show/hide drabda congratulations message in menu
        if (this.drabdaMessage) {
            if (isDrabda) {
                this.drabdaMessage.classList.remove('hidden');
            } else {
                this.drabdaMessage.classList.add('hidden');
            }
        }
    }

    updateSpeedLevel(level, name) {
        if (this.speedLevelEl) {
            this.speedLevelEl.textContent = `Lv.${level}`;
        }
        if (this.levelIndicator) {
            // Remove all level classes
            this.levelIndicator.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5');
            // Add current level class
            this.levelIndicator.classList.add(`level-${level}`);
        }
    }

    resetLevel() {
        this.updateSpeedLevel(1, 'Slow');
    }

    updateScore(score) {
        if (this.scoreEl) {
            this.scoreEl.textContent = score;
        }
    }

    updateHighScore(highScore) {
        if (this.highScoreEl) {
            this.highScoreEl.textContent = highScore;
        }
    }

    updateMode(mode) {
        if (this.modeIndicator) {
            this.modeIndicator.textContent = mode.toUpperCase();
            this.modeIndicator.classList.remove('command-mode', 'insert-mode');
            if (mode === 'command') {
                this.modeIndicator.classList.add('command-mode');
                this.showCursor(true);
                this.commandPrefix.textContent = ':';
                this.showStatusline(true);
            } else {
                this.showCursor(false);
                this.commandPrefix.textContent = '';
                this.commandBuffer.textContent = '';
                this.showStatusline(false);
            }
        }
    }

    updateCount(count) {
        // Show count in command line when in normal mode
        if (this.commandBuffer && count > 0) {
            this.commandBuffer.textContent = count.toString();
            this.showCursor(true);
            this.showStatusline(true);
        } else if (this.commandBuffer) {
            this.commandBuffer.textContent = '';
            this.showCursor(false);
            this.showStatusline(false);
        }
    }

    updateCommandBuffer(buffer) {
        if (this.commandBuffer) {
            this.commandBuffer.textContent = buffer;
        }
    }

    showStatusline(visible) {
        if (this.statusline) {
            if (visible) {
                this.statusline.classList.add('visible');
            } else {
                this.statusline.classList.remove('visible');
            }
        }
    }

    showCursor(visible) {
        if (this.cursor) {
            if (visible) {
                this.cursor.classList.add('visible');
            } else {
                this.cursor.classList.remove('visible');
            }
        }
    }

    showNameInput() {
        this.overlay.classList.remove('hidden');
        this.nameScreen.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        this.gameoverScreen.classList.add('hidden');
        this.helpScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        // Focus on input
        if (this.playerNameInput) {
            this.playerNameInput.focus();
        }
    }

    getNameInputValue() {
        return this.playerNameInput ? this.playerNameInput.value.trim() : '';
    }

    showMenu(playerName) {
        this.overlay.classList.remove('hidden');
        this.nameScreen.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
        this.gameoverScreen.classList.add('hidden');
        this.helpScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        if (this.playerDisplayName && playerName) {
            this.playerDisplayName.textContent = playerName;
        }
        // Start slogan typewriter
        this.sloganManager.start();
    }

    hideMenu() {
        this.menuScreen.classList.add('hidden');
        // Stop slogan typewriter
        this.sloganManager.stop();
    }

    showLeaderboard(leaderboard, currentPlayerName = null) {
        this.overlay.classList.remove('hidden');
        this.nameScreen.classList.add('hidden');
        this.menuScreen.classList.add('hidden');
        this.gameoverScreen.classList.add('hidden');
        this.helpScreen.classList.add('hidden');
        this.leaderboardScreen.classList.remove('hidden');
        this.leaderboardVisible = true;
        this.renderLeaderboard(leaderboard, currentPlayerName);
    }

    hideLeaderboard() {
        this.leaderboardScreen.classList.add('hidden');
        this.leaderboardVisible = false;
    }

    isLeaderboardVisible() {
        return this.leaderboardVisible;
    }

    renderLeaderboard(leaderboard, currentPlayerName) {
        if (!this.leaderboardList) return;

        if (!leaderboard || leaderboard.length === 0) {
            this.leaderboardList.innerHTML = '<p class="leaderboard-empty">No scores yet. Be the first!</p>';
            return;
        }

        let html = '';
        leaderboard.forEach((entry, index) => {
            const rank = index + 1;
            const isCurrentPlayer = entry.name === currentPlayerName;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            html += `
                <div class="leaderboard-entry ${isCurrentPlayer ? 'highlight' : ''}">
                    <span class="leaderboard-rank ${rankClass}">#${rank}</span>
                    <span class="leaderboard-name">${entry.name}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                </div>
            `;
        });

        this.leaderboardList.innerHTML = html;
    }

    showGameOver(score, highScore) {
        this.overlay.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        this.gameoverScreen.classList.remove('hidden');

        if (this.finalScore) {
            this.finalScore.textContent = score;
        }
        if (this.finalHighScore) {
            this.finalHighScore.textContent = highScore;
        }
    }

    hideOverlay() {
        this.overlay.classList.add('hidden');
        this.helpVisible = false;
        // Stop slogan typewriter when leaving menu
        this.sloganManager.stop();
    }

    showHelp() {
        // Track which screen was visible before help
        // Only check screens if overlay was already visible (not during gameplay)
        this.previousScreen = null;
        const overlayWasVisible = !this.overlay.classList.contains('hidden');

        if (overlayWasVisible) {
            if (!this.menuScreen.classList.contains('hidden')) {
                this.previousScreen = 'menu';
            } else if (!this.gameoverScreen.classList.contains('hidden')) {
                this.previousScreen = 'gameover';
            } else if (!this.leaderboardScreen.classList.contains('hidden')) {
                this.previousScreen = 'leaderboard';
            }
        }

        this.overlay.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        this.gameoverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        this.helpScreen.classList.remove('hidden');
        this.helpVisible = true;
    }

    hideHelp() {
        this.helpScreen.classList.add('hidden');
        this.helpVisible = false;

        // Restore previous screen if any
        if (this.previousScreen === 'menu') {
            this.menuScreen.classList.remove('hidden');
        } else if (this.previousScreen === 'gameover') {
            this.gameoverScreen.classList.remove('hidden');
        } else if (this.previousScreen === 'leaderboard') {
            this.leaderboardScreen.classList.remove('hidden');
        } else {
            // Was in playing state, hide overlay
            this.overlay.classList.add('hidden');
        }
        this.previousScreen = null;
    }

    toggleHelp() {
        if (this.helpVisible) {
            this.hideHelp();
            return false; // help was closed
        } else {
            this.showHelp();
            return true; // help was opened
        }
    }

    isHelpVisible() {
        return this.helpVisible;
    }

    // Show a temporary message (for errors, feedback, etc.)
    showMessage(text, duration = 2000) {
        // Create a temporary message element
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(233, 69, 96, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 100;
            animation: fadeIn 0.3s ease-out;
        `;
        msg.textContent = text;

        const container = document.getElementById('game-container');
        container.appendChild(msg);

        setTimeout(() => {
            msg.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => msg.remove(), 300);
        }, duration);
    }

    // Lives display - show count next to icon
    updateLives(lives) {
        if (this.livesCount) {
            this.livesCount.textContent = Math.max(0, lives);
        }
        // Visual feedback when low on lives
        if (this.livesIndicator) {
            if (lives <= 1) {
                this.livesIndicator.classList.add('critical');
            } else {
                this.livesIndicator.classList.remove('critical');
            }
        }
    }

    // Gas can indicator methods
    updateGasCans(count) {
        if (this.powerupGas) {
            if (count > 0) {
                this.powerupGas.classList.remove('hidden');
                this.powerupGas.classList.add('active');
                if (this.gasCount) {
                    this.gasCount.textContent = count;
                }
            } else {
                this.powerupGas.classList.add('hidden');
                this.powerupGas.classList.remove('active');
            }
        }
    }

    resetGasCans() {
        this.updateGasCans(0);
    }

    updateDebugMode(active) {
        if (this.debugToggle) {
            if (active) {
                this.debugToggle.classList.add('active');
                this.debugToggle.title = 'Debug Mode: ON - Click to resume scroll';
            } else {
                this.debugToggle.classList.remove('active');
                this.debugToggle.title = 'Debug Mode: OFF - Click to pause scroll';
            }
        }
    }

    // Infobar methods (Neovim-style permanent status line)
    showInfobar(visible) {
        if (this.infobar) {
            if (visible) {
                this.infobar.classList.add('visible');
            } else {
                this.infobar.classList.remove('visible');
            }
        }
    }

    updateInfobarPlayer(name) {
        if (this.infobarPlayer) {
            this.infobarPlayer.textContent = name || 'Player';
        }
    }

    updateInfobarTime(elapsedMs) {
        if (this.infobarTime) {
            const totalSeconds = Math.floor(elapsedMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            this.infobarTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateInfobarPosition(row, col) {
        if (this.infobarPosition) {
            // Format like Neovim: row:col (0-indexed internally, but show 1-indexed for users)
            this.infobarPosition.textContent = `${row}:${col}`;
        }
    }

    async loadVersionInfo() {
        if (!this.versionInfo) return;

        try {
            // Get version from cache name
            const cacheNames = await caches.keys();
            const vimtractorCache = cacheNames.find(name => name.startsWith('vimtractor-'));

            if (vimtractorCache) {
                // Extract version from cache name (format: vimtractor-YYYYMMDDHHmmss)
                const version = vimtractorCache.replace('vimtractor-', '');
                // Format: YYYY-MM-DD HH:mm
                const formatted = version.replace(
                    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
                    '$1-$2-$3 $4:$5'
                );
                this.versionInfo.textContent = `v${formatted}`;
            } else {
                this.versionInfo.textContent = 'v--';
            }
        } catch {
            this.versionInfo.textContent = '';
        }
    }
}
