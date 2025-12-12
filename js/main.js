import { Game } from './game/Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game();
    game.start();

    // Expose game instance for debugging (remove in production)
    window.vimtractor = game;

    // Debug toggle click handler
    document.getElementById('debug-toggle')?.addEventListener('click', () => {
        game.toggleDebugMode();
    });

    console.log('VimTractor loaded! Use h/j/k/l to move. Press any key to start.');
});
