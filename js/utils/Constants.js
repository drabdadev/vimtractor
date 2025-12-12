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

// Speed levels - each level lasts 1 minute, interval is time between scroll steps
export const SPEED_LEVELS = [
    { level: 1, interval: 3000, name: 'Slow' },      // 1 step every 3 seconds
    { level: 2, interval: 2000, name: 'Normal' },   // 1 step every 2 seconds
    { level: 3, interval: 1000, name: 'Fast' },     // 1 step every 1 second
    { level: 4, interval: 500, name: 'Very Fast' }, // 1 step every 0.5 seconds
    { level: 5, interval: 250, name: 'Insane' }     // 1 step every 0.25 seconds
];
export const LEVEL_DURATION = 60000; // 1 minute per level in ms

// Spawn rates (probability per row)
export const OBSTACLE_SPAWN_RATE = 0.18; // reduced for balanced difficulty progression
export const ITEM_SPAWN_RATE = 0.15;
export const POWERUP_SPAWN_RATE = 0.05;

// Cell types
export const CELL_TYPES = {
    EMPTY: 0,
    OBSTACLE: 1,
    ITEM: 2,
    POWERUP: 3,
    LIFE: 4
};

// Obstacle subtypes - rocks and stone structures are dangerous!
export const OBSTACLES = {
    ROCK: { emoji: '🪨', name: 'rock' },
    STONE_PILE: { emoji: '🗿', name: 'stone_pile' }
};

// Item subtypes - vegetables and treasures to collect
export const ITEMS = {
    COIN: { emoji: '💰', points: 1, name: 'coin' },
    GEM: { emoji: '💎', points: 5, name: 'gem' },
    TOMATO: { emoji: '🍅', points: 2, name: 'tomato' },
    LETTUCE: { emoji: '🥬', points: 2, name: 'lettuce' },
    ZUCCHINI: { emoji: '🥒', points: 2, name: 'zucchini' },
    GRAPES: { emoji: '🍇', points: 3, name: 'grapes' },
    POTATO: { emoji: '🥔', points: 2, name: 'potato' },
    CARROT: { emoji: '🥕', points: 2, name: 'carrot' },
    ASPARAGUS: { emoji: '🥦', points: 3, name: 'asparagus' },
    PEPPER: { emoji: '🫑', points: 2, name: 'pepper' },
    WHEAT: { emoji: '🌾', points: 2, name: 'wheat' },
    CORN: { emoji: '🌽', points: 2, name: 'corn' }
};

// Powerup subtypes - gas cans give special abilities
// dd (2 gas cans) = clear row and collect points, lives, gas cans
// dG (10 gas cans) = clear screen and collect all points, lives, gas cans
export const POWERUPS = {
    GAS_CAN: { emoji: '⛽', name: 'gas-can' }
};

// Life item - extra tractors give lives (with green glow)
export const LIFE_ITEM = {
    emoji: '🚜',
    name: 'life',
    spawnRate: 0.02
};

// Animation settings
export const ANIMATION = {
    MOVE_DURATION: 100,     // ms for tractor to move between cells
    SHAKE_DURATION: 300,    // ms for screen shake
    SHAKE_INTENSITY: 8,     // pixels
    EXPLOSION_DURATION: 500 // ms for explosion animation
};

// Starting lives
export const STARTING_LIVES = 3;

// Player settings
export const PLAYER = {
    EMOJI: '🚜',
    START_COL: Math.floor(GRID_COLS / 2),
    START_ROW: Math.floor(GRID_ROWS / 2) + 2  // Slightly below middle
};


// Vim parser settings
export const VIM = {
    COUNT_TIMEOUT: 1500, // ms before count resets
    MAX_COUNT: 99
};

// Colors
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
