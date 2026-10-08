# VimTractor - Project Instructions

## Server Configuration

**Porte assegnate:**
- **Development Express:** 5003
- **Development static (legacy):** 3110

### Avvio server (development)
```bash
# Verifica porta libera
lsof -ti:5003

# Avvia server Express (serve static + API leaderboard)
npm run dev
```

### Avvio con Docker (local test)
```bash
docker-compose -f docker-compose.local.yml up --build
```

### URL
- Development: http://localhost:5003
- Production: https://vimtractor.drabda.it

## Stack Tecnico
- **Frontend:** Vanilla JavaScript (ES6 modules), Canvas 2D
- **Backend:** Express.js (serve static + leaderboard API)
- **Database:** JSON file (data/leaderboard.json)
- **Container:** Docker (Node.js 20-alpine)

## Struttura Progetto
```
vimtractor/
├── server.js           # Express server (static + API)
├── package.json        # Dependencies
├── Dockerfile          # Docker build
├── docker-compose.yml  # Production compose (VPS)
├── docker-compose.local.yml  # Local testing
│
├── public/             # Static files (served by Express)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── game/       # Game logic
│   │   ├── input/      # VimParser, InputHandler
│   │   ├── render/     # Renderer, HUD
│   │   ├── ui/         # SloganManager
│   │   ├── audio/      # SoundEngine
│   │   └── utils/      # Constants, Storage, ThemeManager
│   ├── data/slogans.json
│   ├── icons/
│   ├── manifest.json
│   └── service-worker.js
│
└── data/               # Persisted data (Docker volume)
    └── leaderboard.json
```

## API Endpoints
- `GET /` - Game (static files)
- `GET /api/leaderboard` - Top 10 scores
- `POST /api/leaderboard` - Submit score { name, score }
- `GET /health` - Health check

## Deployment (VPS)
```bash
# Su VPS (/var/docker/apps/vimtractor/)
docker-compose build
docker-compose up -d

# Nginx config: /var/docker/nginx/sites/vimtractor.conf
```

## Note Sviluppo
- Il gioco usa viewport scaling automatico per adattarsi a schermi piccoli
- Drabda mode: tema retro con font Press Start 2P
- Service Worker: aggiornare CACHE_NAME in service-worker.js quando deploy
- Rate limiting: 10 submissions/min per IP (nginx)