# VimTractor - Project Instructions

## Server Configuration

**Porte assegnate da lsm (LocalServer Manager):**
- **Frontend:** 3110
- **Backend:** 5110 (non usato - gioco statico)

### Avvio server
```bash
# Verifica porta libera
lsof -ti:3110

# Avvia server (con -c-1 per disabilitare cache dei moduli ES6)
npx http-server -p 3110 -c-1
```

### URL
- Development: http://localhost:3110

## Stack Tecnico
- Vanilla JavaScript (ES6 modules)
- Canvas 2D per rendering
- No build system (static files)

## Struttura Progetto
```
vimtractor/
├── index.html          # Entry point
├── css/style.css       # Stili + CSS variables
├── js/
│   ├── main.js         # Bootstrap
│   ├── game/           # Game logic (Game, Grid, Tractor, Spawner)
│   ├── input/          # VimParser, InputHandler
│   ├── render/         # Renderer, HUD
│   ├── ui/             # SloganManager
│   ├── audio/          # SoundEngine
│   └── utils/          # Constants, Storage, ThemeManager
└── data/
    └── slogans.json    # Slogan per menu
```

## Note Sviluppo
- Il gioco usa viewport scaling automatico per adattarsi a schermi piccoli
- Drabda mode: tema retro con font Press Start 2P
- Cache busting: aggiornare `?v=XX` in index.html quando modifichi CSS/JS
