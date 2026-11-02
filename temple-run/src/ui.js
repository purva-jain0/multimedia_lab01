/* ==========================================================================
   Jungle Dash: Lost Temple - UI & Screen State Manager
   MCA Multimedia Systems Lab - DOM Interaction, HUD Updates & Local Storage
   ========================================================================== */

import { GAME_STATES, STORAGE_KEYS } from './constants.js';

export class UIManager {
    constructor() {
        // DOM Screens
        this.screenMenu = document.getElementById('screen-menu');
        this.screenHud = document.getElementById('screen-hud');
        this.screenPause = document.getElementById('screen-pause');
        this.screenGameOver = document.getElementById('screen-gameover');
        this.screenHowToPlay = document.getElementById('screen-howtoplay');

        // HUD Elements
        this.hudScore = document.getElementById('hud-score');
        this.hudCoins = document.getElementById('hud-coins');
        this.hudSpeed = document.getElementById('hud-speed');

        // Game Over Elements
        this.goScore = document.getElementById('go-final-score');
        this.goCoins = document.getElementById('go-final-coins');
        this.goBest = document.getElementById('go-best-score');
        this.goNewHighBadge = document.getElementById('go-new-high-badge');

        // Menu Elements
        this.menuBestScore = document.getElementById('menu-best-score');

        // Sound Toggle Buttons
        this.btnSoundMenu = document.getElementById('btn-sound-menu');
        this.btnSoundHud = document.getElementById('btn-sound-hud');

        // High Score
        this.highScore = this.loadHighScore();
        this.updateMenuHighScore(this.highScore);
    }

    /**
     * Safely reads high score from LocalStorage.
     * @returns {number}
     */
    loadHighScore() {
        try {
            const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
            return val ? parseInt(val, 10) || 0 : 0;
        } catch (e) {
            console.warn('LocalStorage access restricted:', e);
            return 0;
        }
    }

    /**
     * Safely saves new high score to LocalStorage.
     * @param {number} score 
     */
    saveHighScore(score) {
        if (score > this.highScore) {
            this.highScore = Math.floor(score);
            try {
                localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, this.highScore.toString());
            } catch (e) {
                console.warn('LocalStorage save failed:', e);
            }
            this.updateMenuHighScore(this.highScore);
            return true;
        }
        return false;
    }

    updateMenuHighScore(score) {
        if (this.menuBestScore) {
            this.menuBestScore.textContent = Math.floor(score).toLocaleString();
        }
    }

    /**
     * Transitions between game screens based on active state.
     * @param {string} state - Member of GAME_STATES
     */
    setScreen(state) {
        // Hide all screens first
        this.screenMenu.classList.add('hidden');
        this.screenHud.classList.add('hidden');
        this.screenPause.classList.add('hidden');
        this.screenGameOver.classList.add('hidden');
        this.screenHowToPlay.classList.add('hidden');

        switch (state) {
            case GAME_STATES.MENU:
                this.screenMenu.classList.remove('hidden');
                break;
            case GAME_STATES.PLAYING:
                this.screenHud.classList.remove('hidden');
                break;
            case GAME_STATES.PAUSED:
                this.screenHud.classList.remove('hidden');
                this.screenPause.classList.remove('hidden');
                break;
            case GAME_STATES.GAMEOVER:
                this.screenHud.classList.remove('hidden');
                this.screenGameOver.classList.remove('hidden');
                break;
        }
    }

    showHowToPlay() {
        this.screenMenu.classList.add('hidden');
        this.screenHowToPlay.classList.remove('hidden');
    }

    hideHowToPlay() {
        this.screenHowToPlay.classList.add('hidden');
        this.screenMenu.classList.remove('hidden');
    }

    /**
     * Updates real-time HUD counters.
     * @param {number} score 
     * @param {number} coins 
     * @param {number} speed 
     */
    updateHUD(score, coins, speed) {
        if (this.hudScore) this.hudScore.textContent = Math.floor(score).toLocaleString();
        if (this.hudCoins) this.hudCoins.textContent = coins.toLocaleString();
        if (this.hudSpeed) {
            const speedKmh = Math.floor((speed / 10) * 0.9);
            this.hudSpeed.textContent = `${speedKmh} km/h`;
        }
    }

    /**
     * Populates final game-over results.
     * @param {number} finalScore 
     * @param {number} coins 
     */
    showGameOver(finalScore, coins) {
        const isNewHigh = this.saveHighScore(finalScore);

        if (this.goScore) this.goScore.textContent = Math.floor(finalScore).toLocaleString();
        if (this.goCoins) this.goCoins.textContent = coins.toLocaleString();
        if (this.goBest) this.goBest.textContent = this.highScore.toLocaleString();

        if (this.goNewHighBadge) {
            if (isNewHigh) {
                this.goNewHighBadge.classList.remove('hidden');
            } else {
                this.goNewHighBadge.classList.add('hidden');
            }
        }

        this.setScreen(GAME_STATES.GAMEOVER);
    }

    /**
     * Updates sound toggle button visual indicators.
     * @param {boolean} isMuted 
     */
    updateSoundIcons(isMuted) {
        const icon = isMuted ? '🔇' : '🔊';
        const label = isMuted ? 'Unmute' : 'Mute';

        if (this.btnSoundMenu) {
            this.btnSoundMenu.textContent = `${icon} ${label}`;
            this.btnSoundMenu.setAttribute('aria-label', label);
        }
        if (this.btnSoundHud) {
            this.btnSoundHud.textContent = icon;
            this.btnSoundHud.setAttribute('aria-label', label);
        }
    }
}
