/* ==========================================================================
   Jungle Dash: Lost Temple - Core Game Engine & Real-Time Loop
   MCA Multimedia Systems Lab - Real-Time Rendering & System Coordination
   ========================================================================== */

import { CAMERA, GAME_STATES, PLAYER_CONFIG, SCORING } from './constants.js';
import { Camera } from './camera.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { Player, PLAYER_STATES } from './player.js';
import { Environment } from './environment.js';
import { ObstacleManager } from './obstacles.js';
import { CoinManager } from './coins.js';
import { UIManager } from './ui.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Subsystems
        this.camera = new Camera();
        this.audio = new AudioManager();
        this.input = new InputManager();
        this.player = new Player();
        this.environment = new Environment();
        this.obstacles = new ObstacleManager();
        this.coins = new CoinManager();
        this.ui = new UIManager();

        // Game State Variables
        this.state = GAME_STATES.MENU;
        this.currentSpeed = PLAYER_CONFIG.RUN_SPEED_INITIAL;
        this.distanceTravelled = 0;
        this.score = 0;
        this.coinsCollected = 0;

        // Loop timing
        this.lastTime = 0;
        this.animationFrameId = null;

        // Crash effect timer
        this.crashTimer = 0;

        // Bindings
        this.boundLoop = this.loop.bind(this);
        this.boundResize = this.handleResize.bind(this);
    }

    /**
     * Initializes engine, wires callbacks, and attaches event listeners.
     */
    init() {
        this.handleResize();
        window.addEventListener('resize', this.boundResize);

        // Wire inputs to player actions
        this.input.onMoveLeft = () => {
            if (this.state === GAME_STATES.PLAYING) {
                if (this.player.moveLeft()) {
                    this.audio.playLaneSwitch();
                }
            }
        };

        this.input.onMoveRight = () => {
            if (this.state === GAME_STATES.PLAYING) {
                if (this.player.moveRight()) {
                    this.audio.playLaneSwitch();
                }
            }
        };

        this.input.onJump = () => {
            if (this.state === GAME_STATES.PLAYING) {
                if (this.player.jump()) {
                    this.audio.playJump();
                }
            }
        };

        this.input.onSlide = () => {
            if (this.state === GAME_STATES.PLAYING) {
                if (this.player.slide()) {
                    this.audio.playSlide();
                }
            }
        };

        this.input.onPauseToggle = () => {
            if (this.state === GAME_STATES.PLAYING) {
                this.pause();
            } else if (this.state === GAME_STATES.PAUSED) {
                this.resume();
            }
        };

        // Attach input listeners
        this.input.attach(this.canvas);

        // Bind UI buttons
        this.bindUIButtons();

        // Set initial UI state
        this.ui.updateSoundIcons(this.audio.isMuted);
        this.ui.setScreen(GAME_STATES.MENU);

        // Start render loop
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.boundLoop);
    }

    /**
     * Binds DOM UI buttons across Menu, Pause, and Game-Over screens.
     */
    bindUIButtons() {
        const bind = (id, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.audio.init();
                    this.audio.playClick();
                    callback();
                });
            }
        };

        // Menu buttons
        bind('btn-start-game', () => this.startGame());
        bind('btn-how-to-play', () => this.ui.showHowToPlay());
        bind('btn-close-howtoplay', () => this.ui.hideHowToPlay());

        // Pause buttons
        bind('btn-hud-pause', () => this.pause());
        bind('btn-resume', () => this.resume());
        bind('btn-pause-restart', () => this.startGame());
        bind('btn-pause-menu', () => this.returnToMenu());

        // Game Over buttons
        bind('btn-restart-game', () => this.startGame());
        bind('btn-menu-from-gameover', () => this.returnToMenu());

        // Audio toggles
        const toggleSound = () => {
            this.audio.init();
            const isMuted = this.audio.toggleMute();
            this.ui.updateSoundIcons(isMuted);
        };
        bind('btn-sound-menu', toggleSound);
        bind('btn-sound-hud', toggleSound);
    }

    /**
     * Starts or restarts a fresh gameplay session.
     */
    startGame() {
        this.audio.init();
        this.audio.startBGM();

        // Reset variables
        this.state = GAME_STATES.PLAYING;
        this.currentSpeed = PLAYER_CONFIG.RUN_SPEED_INITIAL;
        this.distanceTravelled = 0;
        this.score = 0;
        this.coinsCollected = 0;
        this.crashTimer = 0;

        // Reset game entities
        this.player.reset();
        this.environment.reset();
        this.obstacles.reset();
        this.coins.reset();

        this.ui.updateHUD(this.score, this.coinsCollected, this.currentSpeed);
        this.ui.setScreen(GAME_STATES.PLAYING);
    }

    /**
     * Pauses the active game session.
     */
    pause() {
        if (this.state !== GAME_STATES.PLAYING) return;
        this.state = GAME_STATES.PAUSED;
        this.audio.stopBGM();
        this.ui.setScreen(GAME_STATES.PAUSED);
    }

    /**
     * Resumes the paused game session.
     */
    resume() {
        if (this.state !== GAME_STATES.PAUSED) return;
        this.state = GAME_STATES.PLAYING;
        this.audio.startBGM();
        this.lastTime = performance.now(); // Prevent large delta-time spike
        this.ui.setScreen(GAME_STATES.PLAYING);
    }

    /**
     * Returns to the main menu screen.
     */
    returnToMenu() {
        this.state = GAME_STATES.MENU;
        this.audio.stopBGM();
        this.player.reset();
        this.obstacles.reset();
        this.coins.reset();
        this.ui.setScreen(GAME_STATES.MENU);
    }

    /**
     * Triggers player crash and transitions to game-over.
     */
    triggerGameOver() {
        this.state = GAME_STATES.GAMEOVER;
        this.audio.stopBGM();
        this.audio.playCrash();
        this.audio.playGameOver();
        this.player.crash();
        this.crashTimer = 0.8; // Brief tumble animation before presenting results
    }

    /**
     * Handles canvas resizing with devicePixelRatio for sharp Retina rendering.
     */
    handleResize() {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

        const cssWidth = Math.floor(rect.width);
        const cssHeight = Math.floor(rect.height);

        this.canvas.width = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;

        // Reset context transform and scale by DPR
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        // Update camera viewport metrics
        this.camera.updateViewport(cssWidth, cssHeight);
    }

    /**
     * Main animation frame loop.
     * @param {number} timestamp
     */
    loop(timestamp) {
        // Delta time in seconds, clamped to 0.1s to avoid physics glitch on lag spikes
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.animationFrameId = requestAnimationFrame(this.boundLoop);
    }

    /**
     * Updates physics, animations, and game progression.
     * @param {number} dt
     */
    update(dt) {
        if (this.state === GAME_STATES.MENU) {
            // Idle background scrolling in menu
            const menuSpeed = 160;
            this.environment.update(dt, menuSpeed * dt);
            this.player.update(dt, menuSpeed);
            return;
        }

        if (this.state === GAME_STATES.PAUSED) {
            return; // All updates frozen
        }

        if (this.state === GAME_STATES.GAMEOVER) {
            // Update crash tumble animation
            this.player.update(dt, 0);
            if (this.crashTimer > 0) {
                this.crashTimer -= dt;
                if (this.crashTimer <= 0) {
                    this.ui.showGameOver(this.score, this.coinsCollected);
                }
            }
            return;
        }

        if (this.state === GAME_STATES.PLAYING) {
            // 1. Accelerate run speed gradually
            this.currentSpeed = Math.min(
                PLAYER_CONFIG.RUN_SPEED_MAX,
                this.currentSpeed + PLAYER_CONFIG.ACCELERATION * dt
            );

            const forwardDelta = this.currentSpeed * dt;
            this.distanceTravelled += forwardDelta;

            // 2. Update distance score
            this.score = Math.floor(this.distanceTravelled * 0.1) + (this.coinsCollected * SCORING.POINTS_PER_COIN);
            this.ui.updateHUD(this.score, this.coinsCollected, this.currentSpeed);

            // 3. Update Environment
            this.environment.update(dt, forwardDelta);

            // 4. Update Player
            this.player.update(dt, this.currentSpeed);

            // 5. Update Obstacles & Check Collisions
            this.obstacles.difficulty = (this.currentSpeed - PLAYER_CONFIG.RUN_SPEED_INITIAL) / 200;
            this.obstacles.update(dt, this.currentSpeed);

            if (this.obstacles.checkCollision(this.player)) {
                this.triggerGameOver();
                return;
            }

            // 6. Update Coins & Check Collection
            this.coins.update(dt, this.currentSpeed);
            const collectedThisFrame = this.coins.checkCollection(this.player, () => {
                this.audio.playCoin();
            });

            if (collectedThisFrame > 0) {
                this.coinsCollected += collectedThisFrame;
                this.score += collectedThisFrame * SCORING.POINTS_PER_COIN;
                this.ui.updateHUD(this.score, this.coinsCollected, this.currentSpeed);
            }
        }
    }

    /**
     * Renders the complete scene using Canvas 2D API.
     */
    render() {
        const w = this.camera.width;
        const h = this.camera.height;

        this.ctx.clearRect(0, 0, w, h);

        // 1. Parallax Sky, Canopy, and 3-Lane Stone Road
        this.environment.render(this.ctx, this.camera);

        // 2. Active Obstacles
        this.obstacles.render(this.ctx, this.camera);

        // 3. Collectible Gold Coins & Sparkles
        this.coins.render(this.ctx, this.camera);

        // 4. Player Character (or idle runner in Menu)
        this.player.render(this.ctx, this.camera);
    }
}
