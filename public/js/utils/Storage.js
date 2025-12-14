const STORAGE_KEYS = {
    HIGH_SCORE: 'vimtractor_highscore',
    TELEMETRY: 'vimtractor_telemetry',
    SETTINGS: 'vimtractor_settings',
    PLAYER_NAME: 'vimtractor_player',
    LEADERBOARD: 'vimtractor_leaderboard'
};

// API Configuration - uses relative path (works in both dev and production)
const API_URL = '/api';

export class Storage {
    constructor() {
        this.available = this.checkAvailability();
    }

    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // High Score
    getHighScore() {
        if (!this.available) return 0;
        const score = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
        return score ? parseInt(score, 10) : 0;
    }

    setHighScore(score) {
        if (!this.available) return false;
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
        return true;
    }

    updateHighScore(score) {
        const current = this.getHighScore();
        if (score > current) {
            this.setHighScore(score);
            return true;
        }
        return false;
    }

    // Telemetry (for tracking command usage, etc.)
    getTelemetry() {
        if (!this.available) return this.getDefaultTelemetry();
        const data = localStorage.getItem(STORAGE_KEYS.TELEMETRY);
        return data ? JSON.parse(data) : this.getDefaultTelemetry();
    }

    getDefaultTelemetry() {
        return {
            gamesPlayed: 0,
            totalPlayTime: 0,
            commandUsage: {},
            invalidCommands: 0
        };
    }

    updateTelemetry(updates) {
        if (!this.available) return;
        const current = this.getTelemetry();
        const updated = { ...current, ...updates };
        localStorage.setItem(STORAGE_KEYS.TELEMETRY, JSON.stringify(updated));
    }

    incrementGamePlayed() {
        const telemetry = this.getTelemetry();
        telemetry.gamesPlayed++;
        this.updateTelemetry(telemetry);
    }

    trackCommand(command) {
        const telemetry = this.getTelemetry();
        if (!telemetry.commandUsage[command]) {
            telemetry.commandUsage[command] = 0;
        }
        telemetry.commandUsage[command]++;
        this.updateTelemetry(telemetry);
    }

    trackInvalidCommand() {
        const telemetry = this.getTelemetry();
        telemetry.invalidCommands++;
        this.updateTelemetry(telemetry);
    }

    // Settings
    getSettings() {
        if (!this.available) return this.getDefaultSettings();
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            soundEnabled: true,
            musicEnabled: true,
            volume: 0.5
        };
    }

    saveSettings(settings) {
        if (!this.available) return false;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    }

    // Player Name
    getPlayerName() {
        if (!this.available) return null;
        return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    }

    setPlayerName(name) {
        if (!this.available) return false;
        localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name.trim());
        return true;
    }

    hasPlayerName() {
        return !!this.getPlayerName();
    }

    // Leaderboard - Server API methods
    async fetchLeaderboard() {
        try {
            const response = await fetch(`${API_URL}/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                // Cache locally
                localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data));
                return data;
            }
        } catch (e) {
            console.warn('Failed to fetch leaderboard from server, using local cache');
        }
        // Fallback to local cache
        return this.getLocalLeaderboard();
    }

    async submitScore(name, score) {
        try {
            const response = await fetch(`${API_URL}/leaderboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
            });
            if (response.ok) {
                const data = await response.json();
                // Update local cache
                localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data));
                return data;
            }
        } catch (e) {
            console.warn('Failed to submit score to server, saving locally');
        }
        // Fallback: save locally only
        return this.addToLocalLeaderboard(name, score);
    }

    // Local leaderboard methods (fallback/cache)
    getLocalLeaderboard() {
        if (!this.available) return [];
        const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
        return data ? JSON.parse(data) : [];
    }

    addToLocalLeaderboard(name, score) {
        if (!this.available) return [];
        const leaderboard = this.getLocalLeaderboard();
        leaderboard.push({ name, score, date: new Date().toISOString() });
        leaderboard.sort((a, b) => b.score - a.score);
        const top10 = leaderboard.slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(top10));
        return top10;
    }

    // Sync method for backward compatibility (uses cached data)
    getLeaderboard() {
        return this.getLocalLeaderboard();
    }

    addToLeaderboard(name, score) {
        // Fire and forget - submit to server
        this.submitScore(name, score);
        // Return immediately with local update
        return this.addToLocalLeaderboard(name, score);
    }

    isHighScore(score) {
        const leaderboard = this.getLocalLeaderboard();
        if (leaderboard.length < 10) return true;
        return score > leaderboard[leaderboard.length - 1].score;
    }

    // Clear all data
    clearAll() {
        if (!this.available) return;
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}
