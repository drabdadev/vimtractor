/**
 * VimTractor Production Server
 * Express server that serves static files and leaderboard API
 *
 * Endpoints:
 *   GET  /                    - Static files (game)
 *   GET  /api/leaderboard     - Get top 10 scores
 *   POST /api/leaderboard     - Submit new score
 *   GET  /health              - Health check for Docker
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5110;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const STATIC_DIR = IS_PRODUCTION ? 'dist' : 'public';  // Vite outputs to dist/
const DATA_DIR = path.join(__dirname, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAX_ENTRIES = 50;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize leaderboard file if not exists
if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, '[]');
}

// Middleware
app.use(express.json({ limit: '1kb' })); // Limit body size for security

// Serve static files from dist/ (production) or public/ (dev fallback)
// In production, Vite builds to dist/ with hashed filenames for cache busting
app.use(express.static(STATIC_DIR, {
    maxAge: IS_PRODUCTION ? '1y' : 0,  // Long cache in prod (hashed filenames), no cache in dev
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // No cache for HTML and service worker (must always be fresh)
        if (filePath.endsWith('.html') || filePath.endsWith('service-worker.js') || filePath.endsWith('version.json')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Validation
const NAME_REGEX = /^[a-zA-Z0-9_\-\s]+$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 100000; // Reasonable max score

function validateSubmission(data) {
    if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid data format' };
    if (!data.name || typeof data.name !== 'string') return { valid: false, error: 'Name is required' };
    if (typeof data.score !== 'number') return { valid: false, error: 'Score must be a number' };

    const name = data.name.trim();
    if (name.length < MIN_NAME_LENGTH) return { valid: false, error: `Name must be at least ${MIN_NAME_LENGTH} characters` };
    if (name.length > MAX_NAME_LENGTH) return { valid: false, error: `Name must be at most ${MAX_NAME_LENGTH} characters` };
    if (!NAME_REGEX.test(name)) return { valid: false, error: 'Name contains invalid characters' };

    if (data.score < 0) return { valid: false, error: 'Score cannot be negative' };
    if (data.score > MAX_SCORE) return { valid: false, error: 'Score exceeds maximum allowed' };
    if (!Number.isFinite(data.score)) return { valid: false, error: 'Invalid score value' };

    return { valid: true };
}

function readLeaderboard() {
    try {
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading leaderboard:', err.message);
        return [];
    }
}

function writeLeaderboard(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing leaderboard:', err.message);
        return false;
    }
}

// API Routes

// GET /api/leaderboard - Get top 10 scores
app.get('/api/leaderboard', (req, res) => {
    const leaderboard = readLeaderboard();
    res.json(leaderboard.slice(0, 10));
});

// POST /api/leaderboard - Submit new score
app.post('/api/leaderboard', (req, res) => {
    const validation = validateSubmission(req.body);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    const { name, score } = req.body;
    let leaderboard = readLeaderboard();

    // Add new entry
    leaderboard.push({
        name: name.trim().slice(0, MAX_NAME_LENGTH),
        score: Math.floor(score),
        date: new Date().toISOString()
    });

    // Sort by score descending, keep top entries
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, MAX_ENTRIES);

    if (!writeLeaderboard(leaderboard)) {
        return res.status(500).json({ error: 'Failed to save score' });
    }

    res.json({
        success: true,
        rank: leaderboard.findIndex(e => e.name === name.trim() && e.score === Math.floor(score)) + 1,
        top10: leaderboard.slice(0, 10)
    });
});

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// 404 handler - serve index.html for client-side routing (PWA)
app.use((req, res, next) => {
    // Only serve index.html for GET requests that accept HTML
    if (req.method === 'GET' && req.accepts('html')) {
        res.sendFile(path.join(__dirname, STATIC_DIR, 'index.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VimTractor server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Endpoints:`);
    console.log(`  GET  /                  - Game (static files)`);
    console.log(`  GET  /api/leaderboard   - Get top 10 scores`);
    console.log(`  POST /api/leaderboard   - Submit score { name, score }`);
    console.log(`  GET  /health            - Health check`);
});
