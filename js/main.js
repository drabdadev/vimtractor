import { Game } from './game/Game.js?v=31';

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

    // Help toggle click handler
    document.getElementById('help-toggle')?.addEventListener('click', () => {
        game.hud.toggleHelp();
    });

    console.log('VimTractor loaded! Use h/j/k/l to move. Press any key to start.');
});
