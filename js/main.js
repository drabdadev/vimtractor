import { Game } from './game/Game.js?v=33';
import { soundEngine } from './audio/SoundEngine.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game();
    game.start();

    // Expose game instance for debugging (remove in production)
    window.vimtractor = game;

    // Sound toggle click handler
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle?.addEventListener('click', () => {
        const isMuted = soundEngine.toggleMute();
        soundToggle.textContent = isMuted ? '🔇' : '🔊';
        soundToggle.title = isMuted ? 'Sound OFF' : 'Sound ON';
    });

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
