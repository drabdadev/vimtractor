// VimTractor Leaderboard API
// Run: node server/leaderboard.js
// Port: 5110

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5110;
const FILE = path.join(__dirname, 'leaderboard.json');
const MAX_ENTRIES = 50;

function readLeaderboard() {
    if (!fs.existsSync(FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeLeaderboard(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // GET - Retrieve leaderboard
    if (req.method === 'GET' && req.url === '/leaderboard') {
        const leaderboard = readLeaderboard();
        return res.end(JSON.stringify(leaderboard));
    }

    // POST - Add new score
    if (req.method === 'POST' && req.url === '/leaderboard') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { name, score } = JSON.parse(body);

                // Validate
                if (!name || typeof score !== 'number') {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ error: 'Invalid data' }));
                }

                let leaderboard = readLeaderboard();

                // Add new entry
                leaderboard.push({
                    name: String(name).slice(0, 12).trim(),
                    score: Math.floor(score),
                    date: new Date().toISOString()
                });

                // Sort by score descending, keep top entries
                leaderboard.sort((a, b) => b.score - a.score);
                leaderboard = leaderboard.slice(0, MAX_ENTRIES);

                writeLeaderboard(leaderboard);
                res.end(JSON.stringify(leaderboard.slice(0, 10)));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`VimTractor Leaderboard API running on http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET  /leaderboard - Get top scores`);
    console.log(`  POST /leaderboard - Add new score { name, score }`);
});
