// ═══════════════════════════════════════════════════════════════════════════
// COSTANTI TECNICHE - Non modificare questi valori!
// Per i parametri di gameplay, vedi js/config/GameConfig.js
// ═══════════════════════════════════════════════════════════════════════════

// Grid configuration (4:3 aspect ratio)
export const GRID_COLS = 24;
export const GRID_ROWS = 18;
export const CELL_SIZE = 48;  // 50% larger cells for better visibility

// Canvas dimensions
export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;  // 1152px
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE; // 864px

// Game timing
export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

// Cell types
export const CELL_TYPES = {
    EMPTY: 0,
    OBSTACLE: 1,
    ITEM: 2,
    POWERUP: 3,
    LIFE: 4,
    SEED: 5         // Semi piantati dai comandi 'c' (change)
};

// Obstacle subtypes - rocks and stone structures are dangerous!
export const OBSTACLES = {
    ROCK: { emoji: '🪨', name: 'rock' },
    STONE_PILE: { emoji: '🗿', name: 'stone_pile' }
};

// Item subtypes - vegetables and treasures to collect
// NOTA: I punti sono definiti in GameConfig.js
export const ITEMS = {
    COIN: { emoji: '💰', name: 'coin' },
    GEM: { emoji: '💎', name: 'gem' },
    TOMATO: { emoji: '🍅', name: 'tomato' },
    LETTUCE: { emoji: '🥬', name: 'lettuce' },
    ZUCCHINI: { emoji: '🥒', name: 'zucchini' },
    GRAPES: { emoji: '🍇', name: 'grapes' },
    POTATO: { emoji: '🥔', name: 'potato' },
    CARROT: { emoji: '🥕', name: 'carrot' },
    ASPARAGUS: { emoji: '🥦', name: 'asparagus' },
    PEPPER: { emoji: '🫑', name: 'pepper' },
    WHEAT: { emoji: '🌾', name: 'wheat' },
    CORN: { emoji: '🌽', name: 'corn' }
};

// Powerup subtypes - gas cans give special abilities
// dd (2 gas cans) = clear row and collect points, lives, gas cans
// dG (10 gas cans) = clear screen and collect all points, lives, gas cans
export const POWERUPS = {
    GAS_CAN: { emoji: '⛽', name: 'gas-can' }
};

// Life item - extra tractors give lives (with green glow)
// NOTA: spawnRate è definito in GameConfig.js
export const LIFE_ITEM = {
    emoji: '🚜',
    name: 'life'
};

// Seed item - planted by change commands (c)
// NOTA: growthTime è definito in GameConfig.js
export const SEED_ITEM = {
    emoji: '🌱',
    name: 'seed'
};

// Transmute items - created from rocks via 'r' command
// NOTA: punti definiti in GameConfig.js
export const TRANSMUTE_ITEMS = {
    SNAIL: { emoji: '🐌', name: 'snail' },
    MUSHROOM: { emoji: '🍄', name: 'mushroom' }
};

// Player settings
export const PLAYER = {
    EMOJI: '🚜',
    START_COL: Math.floor(GRID_COLS / 2),
    START_ROW: Math.floor(GRID_ROWS / 2) + 2  // Slightly below middle
};

// Colors (usati da ThemeManager)
export const COLORS = {
    GRID_LINE: 'rgba(15, 52, 96, 0.3)',
    GRID_CELL_EVEN: 'rgba(22, 33, 62, 0.8)',
    GRID_CELL_ODD: 'rgba(26, 38, 70, 0.8)',
    TRACTOR_HIGHLIGHT: 'rgba(0, 255, 136, 0.2)',
    // Road colors
    ROAD_BASE: 'rgba(60, 50, 40, 0.9)',      // Brown dirt road
    ROAD_LINE: 'rgba(90, 75, 60, 0.8)',       // Lighter road marking
    ROAD_EDGE: 'rgba(40, 80, 40, 0.7)',       // Green grass edge
    STARTING_LINE: 'rgba(255, 200, 50, 0.6)' // Yellow starting line
};

// Game states
export const GAME_STATES = {
    NAME_INPUT: 'name_input',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    LEADERBOARD: 'leaderboard'
};
