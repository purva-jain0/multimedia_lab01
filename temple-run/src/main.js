/* ==========================================================================
   Jungle Dash: Lost Temple - Main Bootstrap & Application Lifecycle
   MCA Multimedia Systems Lab - Event Handling & Entry Point
   ========================================================================== */

import { Game } from './game.js';
import { GAME_STATES } from './constants.js';

window.addEventListener('DOMContentLoaded', () => {
    // Instantiate core game engine
    const game = new Game();
    game.init();

    // Auto-pause when browser tab loses focus or visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === GAME_STATES.PLAYING) {
            game.pause();
        }
    });

    window.addEventListener('blur', () => {
        if (game.state === GAME_STATES.PLAYING) {
            game.pause();
        }
    });

    // Expose game instance for testing / debugging in console
    window.jungleDashGame = game;
});
