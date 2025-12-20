// Theme configuration for VimTractor
// Normal theme: Current colorful design
// Drabda theme: Monochromatic B&W retro style

const THEMES = {
    normal: {
        // CSS custom properties
        '--bg-primary': '#1a1a2e',
        '--bg-secondary': '#121a2e',
        '--bg-tertiary': '#16213e',
        '--bg-overlay': 'rgba(22, 33, 62, 0.95)',
        '--border-primary': '#0f3460',
        '--border-secondary': '#1a5276',
        '--border-translucent': 'rgba(15, 52, 96, 0.3)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#cccccc',
        '--text-muted': '#888888',
        '--text-dim': '#666666',
        '--accent-primary': '#e94560',
        '--accent-secondary': '#00ff88',
        '--accent-tertiary': '#ffd700',
        '--kbd-bg': '#0f3460',
        '--kbd-text': '#00ff88',
        '--kbd-text-alt': '#ffd700',
        '--mode-normal-bg': '#00ff88',
        '--mode-normal-text': '#000000',
        '--mode-command-bg': '#ffd700',
        '--mode-command-text': '#000000',
        '--mode-insert-bg': '#e94560',
        '--mode-insert-text': '#ffffff',
        '--shadow-color': 'rgba(15, 52, 96, 0.4)',
        '--shadow-glow': 'rgba(233, 69, 96, 0.5)',
        '--level-1': '#00ff88',
        '--level-2': '#ffd700',
        '--level-3': '#ff9500',
        '--level-4': '#ff5500',
        '--level-5': '#e94560',
        '--leaderboard-gold': '#ffd700',
        '--leaderboard-silver': '#c0c0c0',
        '--leaderboard-bronze': '#cd7f32',
        '--font-primary': "'Courier New', monospace",
        // Canvas colors
        canvas: {
            GRID_LINE: 'rgba(15, 52, 96, 0.3)',
            GRID_CELL_EVEN: 'rgba(22, 33, 62, 0.8)',
            GRID_CELL_ODD: 'rgba(26, 38, 70, 0.8)',
            TRACTOR_HIGHLIGHT: 'rgba(0, 255, 136, 0.2)',
            ROAD_BASE: 'rgba(60, 50, 40, 0.9)',
            ROAD_LINE: 'rgba(90, 75, 60, 0.8)',
            ROAD_EDGE: 'rgba(40, 80, 40, 0.7)',
            STARTING_LINE: 'rgba(255, 200, 50, 0.6)',
            LIFE_GLOW: '#00ff88',
            TRACTOR_BORDER: '#ffffff',
            FLASH_COLOR: 'rgba(233, 69, 96, 0.5)',
            SCORE_POPUP: '#ffd700',
            HIGHLIGHT: 'rgba(255, 215, 0, 0.3)'
        }
    },
    drabda: {
        // Monochromatic black & white theme
        '--bg-primary': '#0a0a0a',
        '--bg-secondary': '#111111',
        '--bg-tertiary': '#1a1a1a',
        '--bg-overlay': 'rgba(20, 20, 20, 0.95)',
        '--border-primary': '#333333',
        '--border-secondary': '#444444',
        '--border-translucent': 'rgba(255, 255, 255, 0.1)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#cccccc',
        '--text-muted': '#888888',
        '--text-dim': '#555555',
        '--accent-primary': '#ffffff',
        '--accent-secondary': '#ffffff',
        '--accent-tertiary': '#ffffff',
        '--kbd-bg': '#222222',
        '--kbd-text': '#ffffff',
        '--kbd-text-alt': '#cccccc',
        '--mode-normal-bg': '#ffffff',
        '--mode-normal-text': '#000000',
        '--mode-command-bg': '#cccccc',
        '--mode-command-text': '#000000',
        '--mode-insert-bg': '#666666',
        '--mode-insert-text': '#ffffff',
        '--shadow-color': 'rgba(255, 255, 255, 0.1)',
        '--shadow-glow': 'rgba(255, 255, 255, 0.3)',
        '--level-1': '#ffffff',
        '--level-2': '#cccccc',
        '--level-3': '#aaaaaa',
        '--level-4': '#888888',
        '--level-5': '#666666',
        '--leaderboard-gold': '#ffffff',
        '--leaderboard-silver': '#cccccc',
        '--leaderboard-bronze': '#888888',
        '--font-primary': "'Press Start 2P', monospace",
        // Canvas colors - pure grayscale (except tractor border for visibility)
        canvas: {
            GRID_LINE: 'rgba(255, 255, 255, 0.15)',
            GRID_CELL_EVEN: 'rgba(20, 20, 20, 0.9)',
            GRID_CELL_ODD: 'rgba(30, 30, 30, 0.9)',
            TRACTOR_HIGHLIGHT: 'rgba(255, 255, 255, 0.2)',
            ROAD_BASE: 'rgba(40, 40, 40, 0.9)',
            ROAD_LINE: 'rgba(60, 60, 60, 0.8)',
            ROAD_EDGE: 'rgba(50, 50, 50, 0.7)',
            STARTING_LINE: 'rgba(255, 255, 255, 0.6)',
            LIFE_GLOW: '#ffffff',
            TRACTOR_BORDER: '#00ff88',  // Green border to distinguish player from B&W elements
            FLASH_COLOR: 'rgba(255, 255, 255, 0.5)',
            SCORE_POPUP: '#ffffff',
            HIGHLIGHT: 'rgba(255, 255, 255, 0.3)'
        }
    }
};

const STORAGE_KEY = 'vimtractor_theme';

class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.listeners = [];
        this.cachedCanvasColors = null;
    }

    loadTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved && THEMES[saved] ? saved : 'normal';
        } catch {
            return 'normal';
        }
    }

    saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // localStorage not available
        }
    }

    getTheme() {
        return this.currentTheme;
    }

    isDrabdaMode() {
        return this.currentTheme === 'drabda';
    }

    setTheme(theme) {
        if (!THEMES[theme]) return false;
        this.currentTheme = theme;
        this.cachedCanvasColors = null; // Invalidate cache
        this.saveTheme(theme);
        this.applyTheme();
        this.notifyListeners();
        return true;
    }

    toggleDrabda() {
        const newTheme = this.currentTheme === 'drabda' ? 'normal' : 'drabda';
        this.setTheme(newTheme);
        return this.currentTheme === 'drabda';
    }

    applyTheme() {
        const theme = THEMES[this.currentTheme];
        const root = document.documentElement;

        // Apply CSS custom properties
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'canvas' && typeof value === 'string') {
                root.style.setProperty(key, value);
            }
        });

        // Add/remove theme class on body
        document.body.classList.remove('theme-normal', 'theme-drabda');
        document.body.classList.add(`theme-${this.currentTheme}`);
    }

    getCanvasColors() {
        // Cache colors for performance (called every frame)
        if (!this.cachedCanvasColors) {
            this.cachedCanvasColors = { ...THEMES[this.currentTheme].canvas };
        }
        return this.cachedCanvasColors;
    }

    // Observer pattern for components that need to react to theme changes
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentTheme);
            } catch (e) {
                console.error('Theme listener error:', e);
            }
        });
    }

    init() {
        this.applyTheme();
    }
}

// Singleton instance
export const themeManager = new ThemeManager();
