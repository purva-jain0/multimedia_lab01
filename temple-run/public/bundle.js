(() => {
  // src/constants.js
  var GAME_STATES = {
    MENU: "MENU",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAMEOVER: "GAMEOVER"
  };
  var LANES = {
    LEFT: -1,
    CENTER: 0,
    RIGHT: 1
  };
  var LANE_VALUES = [-1, 0, 1];
  var LANE_WIDTH_WORLD = 110;
  var CAMERA = {
    FOV: 65,
    HEIGHT: 180,
    // Camera height above the ground
    DEPTH_MAX: 1600,
    // Maximum view distance (horizon)
    DEPTH_MIN: 10,
    // Near clipping plane
    VANISHING_Y_RATIO: 0.36
    // Horizon height as fraction of canvas height (0.36 = 36% from top)
  };
  var PLAYER_CONFIG = {
    WORLD_Z: 140,
    // Distance from camera where the player runs
    RUN_SPEED_INITIAL: 380,
    // Initial forward speed (units per second)
    RUN_SPEED_MAX: 860,
    // Maximum capped speed
    ACCELERATION: 4.5,
    // Speed increase per second
    LANE_CHANGE_SPEED: 11,
    // Interpolation speed for lane transitions
    // Jump kinetics
    JUMP_VELOCITY: 580,
    // Initial vertical jump impulse
    GRAVITY: -1450,
    // Downward gravitational acceleration
    MAX_JUMP_HEIGHT: 130,
    // Slide kinetics
    SLIDE_DURATION: 0.72,
    // Slide duration in seconds
    NORMAL_HEIGHT: 70,
    // Hitbox height when standing
    SLIDE_HEIGHT: 32,
    // Hitbox height when sliding
    WIDTH: 42
    // Hitbox width
  };
  var OBSTACLE_TYPES = {
    LOW_BARRIER: "LOW_BARRIER",
    // Must JUMP over (wooden spike / fallen log)
    HIGH_BARRIER: "HIGH_BARRIER",
    // Must SLIDE under (stone arch / swinging blade)
    STONE_BLOCK: "STONE_BLOCK",
    // Tall solid totem - must DODGE lane
    GROUND_GAP: "GROUND_GAP"
    // Pit trap / lava fissure - must JUMP or DODGE
  };
  var SCORING = {
    POINTS_PER_METER: 1,
    POINTS_PER_COIN: 10,
    COIN_FLOAT_SPEED: 4,
    COIN_FLOAT_AMPLITUDE: 6
  };
  var STORAGE_KEYS = {
    HIGH_SCORE: "jungledash_highscore",
    TOTAL_COINS: "jungledash_totalcoins",
    SOUND_MUTED: "jungledash_muted"
  };

  // src/camera.js
  var Camera = class {
    constructor() {
      this.width = 800;
      this.height = 600;
      this.vanishingX = 400;
      this.vanishingY = 220;
      this.focalLength = 320;
      this.horizonY = 220;
      this.bottomY = 600;
    }
    /**
     * Updates viewport dimensions and recalculates perspective projection metrics.
     * @param {number} width - Current canvas width in CSS pixels
     * @param {number} height - Current canvas height in CSS pixels
     */
    updateViewport(width, height) {
      this.width = width;
      this.height = height;
      this.vanishingX = width * 0.5;
      this.vanishingY = height * CAMERA.VANISHING_Y_RATIO;
      this.horizonY = this.vanishingY;
      this.bottomY = height * 0.98;
      this.focalLength = height * 0.48;
    }
    /**
     * Projects a 3D world coordinate (worldX, worldY, worldZ) onto 2D canvas coordinates.
     * 
     * World Coordinate System:
     * - worldX: Horizontal displacement (-110 = Left Lane, 0 = Center, +110 = Right Lane)
     * - worldY: Vertical elevation (0 = Ground level, > 0 = in the air / jumping)
     * - worldZ: Distance along track relative to camera (0 = at camera, 140 = player, 1600 = horizon)
     * 
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} worldZ 
     * @returns {{ screenX: number, screenY: number, scale: number, visible: boolean }}
     */
    project(worldX, worldY, worldZ) {
      if (worldZ < CAMERA.DEPTH_MIN || worldZ > CAMERA.DEPTH_MAX) {
        return { screenX: 0, screenY: 0, scale: 0, visible: false };
      }
      const playerZ = PLAYER_CONFIG.WORLD_Z;
      const scale = playerZ / (worldZ + 30);
      const depthRatio = Math.max(0, Math.min(1, (worldZ - CAMERA.DEPTH_MIN) / (CAMERA.DEPTH_MAX - CAMERA.DEPTH_MIN)));
      const groundCurve = Math.pow(1 - depthRatio, 1.85);
      const groundScreenY = this.vanishingY + (this.bottomY - this.vanishingY) * groundCurve;
      const screenX = this.vanishingX + worldX * scale * 1.8;
      const screenY = groundScreenY - worldY * scale * 1.8;
      return {
        screenX,
        screenY,
        scale,
        visible: true
      };
    }
    /**
     * Calculates the track road bounds (left edge, right edge, lane centers) at a given distance Z.
     * @param {number} worldZ
     * @param {number} roadWidthWorld
     */
    getRoadSegmentAtZ(worldZ, roadWidthWorld = 400) {
      const leftEdge = this.project(-roadWidthWorld * 0.5, 0, worldZ);
      const rightEdge = this.project(roadWidthWorld * 0.5, 0, worldZ);
      const center = this.project(0, 0, worldZ);
      return {
        leftX: leftEdge.screenX,
        rightX: rightEdge.screenX,
        y: center.screenY,
        scale: center.scale,
        visible: center.visible
      };
    }
  };

  // src/audio.js
  var AudioManager = class {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.isMuted = false;
      this.isInitialized = false;
      this.isBgmPlaying = false;
      this.bgmTimer = null;
      this.tempo = 124;
      this.step = 0;
      this.drumFrequencies = {
        kick: 130,
        congaHigh: 340,
        congaLow: 220,
        shaker: 1e3
      };
      try {
        const savedMute = localStorage.getItem("jungledash_muted");
        if (savedMute !== null) {
          this.isMuted = JSON.parse(savedMute);
        }
      } catch {
        this.isMuted = false;
      }
    }
    /**
     * Initializes the Web Audio Context upon the first user interaction.
     * Complies with modern browser Autoplay Policy restrictions.
     */
    init() {
      if (this.isInitialized) {
        if (this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {
          });
        }
        return;
      }
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          console.warn("Web Audio API not supported in this browser.");
          return;
        }
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
        this.isInitialized = true;
      } catch (e) {
        console.warn("AudioContext initialization failed:", e);
      }
    }
    /**
     * Toggles audio mute state.
     * @returns {boolean} Current muted state
     */
    toggleMute() {
      this.isMuted = !this.isMuted;
      try {
        localStorage.setItem("jungledash_muted", JSON.stringify(this.isMuted));
      } catch {
      }
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, now, 0.05);
      }
      return this.isMuted;
    }
    /**
     * Plays a crisp coin collection chime (arpeggiated crystal harmonic).
     */
    playCoin() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(987.77, now);
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.09);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(1e-3, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.22);
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1975.53, now + 0.04);
      gain2.gain.setValueAtTime(0.2, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(1e-3, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.28);
    }
    /**
     * Plays a rising whoosh sound for jumping.
     */
    playJump() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
    /**
     * Plays a swoosh/slide friction sound.
     */
    playSlide() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.22;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.2);
      filter.Q.value = 2.5;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
    }
    /**
     * Plays a lane switch swoosh sound.
     */
    playLaneSwitch() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
    /**
     * Plays an impact collision crash.
     */
    playCrash() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4);
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.28);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.3);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);
    }
    /**
     * Plays the game over defeat cadence.
     */
    playGameOver() {
      if (!this.canPlay()) return;
      const notes = [293.66, 261.63, 220, 174.61];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.16;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, time);
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.35);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.36);
      });
    }
    /**
     * UI button click sound.
     */
    playClick() {
      if (!this.canPlay()) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
    /**
     * Starts the procedural tribal jungle ambient rhythm loop.
     */
    startBGM() {
      if (this.isBgmPlaying) return;
      this.init();
      if (!this.ctx) return;
      this.isBgmPlaying = true;
      this.step = 0;
      this.scheduleBeat();
    }
    /**
     * Schedules procedural drum pattern beats.
     */
    scheduleBeat() {
      if (!this.isBgmPlaying || !this.ctx) return;
      const stepDuration = 60 / this.tempo / 4;
      const now = this.ctx.currentTime;
      const s = this.step % 16;
      if (s === 0 || s === 8) {
        this.playSynthKick(now);
      }
      if (s === 4 || s === 12) {
        this.playSynthConga(now, 210, 0.22);
      }
      if (s === 2 || s === 10) {
        this.playSynthConga(now, 330, 0.18);
      }
      if (s % 2 === 0) {
        this.playSynthShaker(now, s % 4 === 0 ? 0.08 : 0.04);
      }
      this.step++;
      const nextTime = Math.max(20, stepDuration * 1e3);
      this.bgmTimer = setTimeout(() => this.scheduleBeat(), nextTime);
    }
    playSynthKick(time) {
      if (!this.musicGain || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.14);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.15);
    }
    playSynthConga(time, freq, vol) {
      if (!this.musicGain || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, time + 0.1);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.12);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.13);
    }
    playSynthShaker(time, vol) {
      if (!this.musicGain || !this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2500, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
    }
    /**
     * Stops the background rhythm.
     */
    stopBGM() {
      this.isBgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
    canPlay() {
      return this.isInitialized && this.ctx && this.ctx.state !== "closed";
    }
  };

  // src/input.js
  var InputManager = class {
    constructor() {
      this.onMoveLeft = null;
      this.onMoveRight = null;
      this.onJump = null;
      this.onSlide = null;
      this.onPauseToggle = null;
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchStartTime = 0;
      this.isSwiping = false;
      this.swipeThreshold = 35;
      this.maxSwipeDuration = 500;
      this.keysDown = /* @__PURE__ */ new Set();
      this.boundKeyDown = this.handleKeyDown.bind(this);
      this.boundKeyUp = this.handleKeyUp.bind(this);
      this.boundTouchStart = this.handleTouchStart.bind(this);
      this.boundTouchMove = this.handleTouchMove.bind(this);
      this.boundTouchEnd = this.handleTouchEnd.bind(this);
    }
    /**
     * Attaches all input event listeners to the window and canvas.
     * @param {HTMLElement} canvasElement
     */
    attach(canvasElement) {
      window.addEventListener("keydown", this.boundKeyDown, { passive: false });
      window.addEventListener("keyup", this.boundKeyUp, { passive: false });
      if (canvasElement) {
        canvasElement.addEventListener("touchstart", this.boundTouchStart, { passive: false });
        canvasElement.addEventListener("touchmove", this.boundTouchMove, { passive: false });
        canvasElement.addEventListener("touchend", this.boundTouchEnd, { passive: false });
      }
      this.bindOnScreenButtons();
    }
    /**
     * Removes all input event listeners.
     */
    detach(canvasElement) {
      window.removeEventListener("keydown", this.boundKeyDown);
      window.removeEventListener("keyup", this.boundKeyUp);
      if (canvasElement) {
        canvasElement.removeEventListener("touchstart", this.boundTouchStart);
        canvasElement.removeEventListener("touchmove", this.boundTouchMove);
        canvasElement.removeEventListener("touchend", this.boundTouchEnd);
      }
    }
    /**
     * Binds on-screen mobile HUD directional & action buttons.
     */
    bindOnScreenButtons() {
      const bindBtn = (id, callback) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const trigger = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (callback) callback();
        };
        btn.addEventListener("touchstart", trigger, { passive: false });
        btn.addEventListener("click", trigger);
      };
      bindBtn("btn-touch-left", () => this.triggerLeft());
      bindBtn("btn-touch-right", () => this.triggerRight());
      bindBtn("btn-touch-jump", () => this.triggerJump());
      bindBtn("btn-touch-slide", () => this.triggerSlide());
    }
    handleKeyDown(e) {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        if (!this.keysDown.has(e.code)) {
          this.keysDown.add(e.code);
          if (this.onPauseToggle) this.onPauseToggle();
        }
        return;
      }
      const validKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"];
      if (validKeys.includes(e.code)) {
        e.preventDefault();
        if (this.keysDown.has(e.code)) {
          return;
        }
        this.keysDown.add(e.code);
        switch (e.code) {
          case "ArrowLeft":
          case "KeyA":
            this.triggerLeft();
            break;
          case "ArrowRight":
          case "KeyD":
            this.triggerRight();
            break;
          case "ArrowUp":
          case "KeyW":
          case "Space":
            this.triggerJump();
            break;
          case "ArrowDown":
          case "KeyS":
            this.triggerSlide();
            break;
        }
      }
    }
    handleKeyUp(e) {
      this.keysDown.delete(e.code);
    }
    handleTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();
      this.isSwiping = true;
    }
    handleTouchMove(e) {
      if (this.isSwiping) {
        e.preventDefault();
      }
    }
    handleTouchEnd(e) {
      if (!this.isSwiping) return;
      this.isSwiping = false;
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      const duration = Date.now() - this.touchStartTime;
      if (duration > this.maxSwipeDuration) return;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (Math.max(absX, absY) < this.swipeThreshold) {
        return;
      }
      if (absX > absY) {
        if (deltaX < 0) {
          this.triggerLeft();
        } else {
          this.triggerRight();
        }
      } else {
        if (deltaY < 0) {
          this.triggerJump();
        } else {
          this.triggerSlide();
        }
      }
    }
    triggerLeft() {
      if (this.onMoveLeft) this.onMoveLeft();
    }
    triggerRight() {
      if (this.onMoveRight) this.onMoveRight();
    }
    triggerJump() {
      if (this.onJump) this.onJump();
    }
    triggerSlide() {
      if (this.onSlide) this.onSlide();
    }
  };

  // src/player.js
  var PLAYER_STATES = {
    RUNNING: "RUNNING",
    JUMPING: "JUMPING",
    SLIDING: "SLIDING",
    CRASHED: "CRASHED"
  };
  var Player = class {
    constructor() {
      this.currentLane = LANES.CENTER;
      this.targetX = 0;
      this.worldX = 0;
      this.worldY = 0;
      this.worldZ = PLAYER_CONFIG.WORLD_Z;
      this.state = PLAYER_STATES.RUNNING;
      this.verticalVelocity = 0;
      this.slideTimer = 0;
      this.tiltAngle = 0;
      this.animTime = 0;
      this.width = PLAYER_CONFIG.WIDTH;
      this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
      this.dustParticles = [];
    }
    /**
     * Resets player state for a fresh run.
     */
    reset() {
      this.currentLane = LANES.CENTER;
      this.targetX = 0;
      this.worldX = 0;
      this.worldY = 0;
      this.state = PLAYER_STATES.RUNNING;
      this.verticalVelocity = 0;
      this.slideTimer = 0;
      this.tiltAngle = 0;
      this.animTime = 0;
      this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
      this.dustParticles = [];
    }
    /**
     * Attempts to move one lane to the left.
     * @returns {boolean} Whether the lane change succeeded
     */
    moveLeft() {
      if (this.state === PLAYER_STATES.CRASHED) return false;
      if (this.currentLane > LANES.LEFT) {
        this.currentLane--;
        this.targetX = this.currentLane * LANE_WIDTH_WORLD;
        return true;
      }
      return false;
    }
    /**
     * Attempts to move one lane to the right.
     * @returns {boolean} Whether the lane change succeeded
     */
    moveRight() {
      if (this.state === PLAYER_STATES.CRASHED) return false;
      if (this.currentLane < LANES.RIGHT) {
        this.currentLane++;
        this.targetX = this.currentLane * LANE_WIDTH_WORLD;
        return true;
      }
      return false;
    }
    /**
     * Initiates a jump if on the ground.
     * @returns {boolean} Whether the jump was initiated
     */
    jump() {
      if (this.state === PLAYER_STATES.CRASHED) return false;
      if (this.state === PLAYER_STATES.RUNNING || this.state === PLAYER_STATES.SLIDING) {
        this.state = PLAYER_STATES.JUMPING;
        this.verticalVelocity = PLAYER_CONFIG.JUMP_VELOCITY;
        this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
        this.slideTimer = 0;
        this.spawnDust(8, 20);
        return true;
      }
      return false;
    }
    /**
     * Initiates a slide. If in mid-air, fast-falls into a slide.
     * @returns {boolean}
     */
    slide() {
      if (this.state === PLAYER_STATES.CRASHED) return false;
      this.state = PLAYER_STATES.SLIDING;
      this.slideTimer = PLAYER_CONFIG.SLIDE_DURATION;
      this.height = PLAYER_CONFIG.SLIDE_HEIGHT;
      if (this.worldY > 0) {
        this.verticalVelocity = -PLAYER_CONFIG.JUMP_VELOCITY * 1.2;
      } else {
        this.spawnDust(6, 15);
      }
      return true;
    }
    /**
     * Triggers crash state on fatal obstacle impact.
     */
    crash() {
      this.state = PLAYER_STATES.CRASHED;
      this.verticalVelocity = 280;
    }
    /**
     * Updates physics, kinematics, timers, and particle effects.
     * @param {number} dt - Delta time in seconds
     * @param {number} currentSpeed - Forward running speed
     */
    update(dt, currentSpeed) {
      this.animTime += dt * (currentSpeed / 200);
      const diffX = this.targetX - this.worldX;
      const lerpFactor = Math.min(1, dt * PLAYER_CONFIG.LANE_CHANGE_SPEED);
      this.worldX += diffX * lerpFactor;
      const laneVelocity = diffX * PLAYER_CONFIG.LANE_CHANGE_SPEED;
      const targetTilt = laneVelocity / LANE_WIDTH_WORLD * 0.22;
      this.tiltAngle += (targetTilt - this.tiltAngle) * Math.min(1, dt * 14);
      if (Math.abs(this.targetX - this.worldX) < 0.5) {
        this.worldX = this.targetX;
      }
      if (this.state === PLAYER_STATES.JUMPING || this.state === PLAYER_STATES.CRASHED || this.worldY > 0) {
        this.worldY += this.verticalVelocity * dt;
        this.verticalVelocity += PLAYER_CONFIG.GRAVITY * dt;
        if (this.worldY <= 0) {
          this.worldY = 0;
          this.verticalVelocity = 0;
          if (this.state !== PLAYER_STATES.CRASHED) {
            if (this.slideTimer > 0) {
              this.state = PLAYER_STATES.SLIDING;
            } else {
              this.state = PLAYER_STATES.RUNNING;
              this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
            }
            this.spawnDust(6, 12);
          }
        }
      }
      if (this.state === PLAYER_STATES.SLIDING) {
        this.slideTimer -= dt;
        if (Math.random() < 0.6) {
          this.spawnDust(1, 10);
        }
        if (this.slideTimer <= 0) {
          this.slideTimer = 0;
          this.state = PLAYER_STATES.RUNNING;
          this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
        }
      }
      for (let i = this.dustParticles.length - 1; i >= 0; i--) {
        const p = this.dustParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += p.growth * dt;
        p.alpha -= p.fade * dt;
        if (p.alpha <= 0) {
          this.dustParticles.splice(i, 1);
        }
      }
      if (this.state === PLAYER_STATES.RUNNING && this.worldY === 0) {
        if (Math.sin(this.animTime * 12) > 0.85 && Math.random() < 0.3) {
          this.spawnDust(1, 8);
        }
      }
    }
    spawnDust(count = 1, speed = 10) {
      for (let i = 0; i < count; i++) {
        this.dustParticles.push({
          x: this.worldX + (Math.random() * 20 - 10),
          y: Math.random() * 4,
          vx: (Math.random() * 2 - 1) * speed,
          vy: Math.random() * speed * 0.8 + 5,
          size: Math.random() * 3 + 2,
          growth: 5,
          alpha: 0.65,
          fade: 2.2
        });
      }
    }
    /**
     * Renders the player character and shadows on the 2D Canvas.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {import('./camera.js').Camera} camera 
     */
    render(ctx, camera) {
      const groundProj = camera.project(this.worldX, 0, this.worldZ);
      if (!groundProj.visible) return;
      const charProj = camera.project(this.worldX, this.worldY, this.worldZ);
      ctx.save();
      this.renderShadow(ctx, groundProj.screenX, groundProj.screenY, groundProj.scale);
      this.renderDust(ctx, camera);
      this.renderCharacterBody(ctx, charProj.screenX, charProj.screenY, charProj.scale);
      ctx.restore();
    }
    /**
     * Renders perspective drop shadow on the stone pathway.
     */
    renderShadow(ctx, screenX, screenY, scale) {
      const heightRatio = Math.min(1, this.worldY / PLAYER_CONFIG.MAX_JUMP_HEIGHT);
      const shadowScale = scale * (1 - heightRatio * 0.45);
      const shadowAlpha = 0.55 - heightRatio * 0.35;
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.fillStyle = `rgba(18, 12, 8, ${Math.max(0.1, shadowAlpha)})`;
      ctx.beginPath();
      const rx = 24 * shadowScale;
      const ry = 8 * shadowScale;
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    /**
     * Renders dust particle puffs.
     */
    renderDust(ctx, camera) {
      for (const p of this.dustParticles) {
        const proj = camera.project(p.x, p.y, this.worldZ);
        if (!proj.visible) continue;
        ctx.save();
        ctx.fillStyle = `rgba(195, 175, 135, ${Math.max(0, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(proj.screenX, proj.screenY, p.size * proj.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    /**
     * Procedurally draws the Temple Explorer adventurer character.
     * Features explorer fedora, brown jacket, boots, dynamic running gait, jump, or slide.
     */
    renderCharacterBody(ctx, cx, cy, scale) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(this.tiltAngle);
      const runCycle = Math.sin(this.animTime * 12);
      const runCycleCos = Math.cos(this.animTime * 12);
      if (this.state === PLAYER_STATES.SLIDING) {
        ctx.translate(0, 16);
        ctx.fillStyle = "#654321";
        ctx.fillStyle = "#3a271d";
        ctx.beginPath();
        ctx.roundRect(-10, -8, 28, 10, 4);
        ctx.fill();
        ctx.fillStyle = "#9e8156";
        ctx.beginPath();
        ctx.roundRect(-18, -14, 24, 12, 5);
        ctx.fill();
        ctx.fillStyle = "#5c3a21";
        ctx.beginPath();
        ctx.roundRect(-22, -26, 22, 16, 4);
        ctx.fill();
        ctx.fillStyle = "#d4a373";
        ctx.beginPath();
        ctx.arc(-16, -34, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3525";
        ctx.beginPath();
        ctx.ellipse(-16, -37, 14, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-22, -45, 12, 8, [4, 4, 0, 0]);
        ctx.fill();
        ctx.fillStyle = "#d93829";
        ctx.beginPath();
        ctx.moveTo(-20, -30);
        ctx.lineTo(-38 + Math.sin(this.animTime * 20) * 4, -34);
        ctx.lineTo(-24, -26);
        ctx.fill();
      } else if (this.state === PLAYER_STATES.CRASHED) {
        ctx.rotate(0.6);
        ctx.fillStyle = "#5c3a21";
        ctx.beginPath();
        ctx.roundRect(-14, -40, 28, 30, 6);
        ctx.fill();
        ctx.fillStyle = "#d4a373";
        ctx.beginPath();
        ctx.arc(0, -50, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3525";
        ctx.beginPath();
        ctx.ellipse(12, -65, 15, 5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.state === PLAYER_STATES.JUMPING) {
        ctx.fillStyle = "#3a271d";
        ctx.beginPath();
        ctx.roundRect(-14, -14, 9, 11, 3);
        ctx.roundRect(5, -14, 9, 11, 3);
        ctx.fill();
        ctx.fillStyle = "#9e8156";
        ctx.beginPath();
        ctx.roundRect(-15, -28, 10, 16, 4);
        ctx.roundRect(5, -28, 10, 16, 4);
        ctx.fill();
        ctx.fillStyle = "#6b4423";
        ctx.beginPath();
        ctx.roundRect(-15, -50, 30, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#2d1b0d";
        ctx.fillRect(-15, -30, 30, 4);
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(-4, -31, 8, 6);
        ctx.fillStyle = "#6b4423";
        ctx.beginPath();
        ctx.roundRect(-24, -48, 8, 18, 3);
        ctx.roundRect(16, -48, 8, 18, 3);
        ctx.fill();
        ctx.fillStyle = "#d4a373";
        ctx.beginPath();
        ctx.arc(0, -60, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3525";
        ctx.beginPath();
        ctx.ellipse(0, -66, 17, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-9, -76, 18, 11, [5, 5, 1, 1]);
        ctx.fill();
        ctx.fillStyle = "#2a1a10";
        ctx.fillRect(-9, -68, 18, 3);
        ctx.fillStyle = "#d93829";
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.quadraticCurveTo(-14, -48, -26, -56);
        ctx.lineTo(-24, -50);
        ctx.closePath();
        ctx.fill();
      } else {
        const legSwingLeft = runCycle * 14;
        const legSwingRight = -runCycle * 14;
        const armSwingLeft = -runCycle * 12;
        const armSwingRight = runCycle * 12;
        const torsoBob = Math.abs(runCycleCos) * 3;
        ctx.translate(0, -torsoBob);
        ctx.fillStyle = "#8f744d";
        ctx.beginPath();
        ctx.roundRect(-13, -24 + legSwingLeft * 0.3, 8, 18, 3);
        ctx.fill();
        ctx.fillStyle = "#3a271d";
        ctx.beginPath();
        ctx.roundRect(-14, -8 + legSwingLeft * 0.5, 10, 8, 2);
        ctx.fill();
        ctx.fillStyle = "#9e8156";
        ctx.beginPath();
        ctx.roundRect(5, -24 + legSwingRight * 0.3, 8, 18, 3);
        ctx.fill();
        ctx.fillStyle = "#3a271d";
        ctx.beginPath();
        ctx.roundRect(4, -8 + legSwingRight * 0.5, 10, 8, 2);
        ctx.fill();
        ctx.fillStyle = "#6b4423";
        ctx.beginPath();
        ctx.roundRect(-14, -48, 28, 26, 5);
        ctx.fill();
        ctx.fillStyle = "#4e3016";
        ctx.fillRect(-10, -48, 4, 24);
        ctx.fillRect(6, -48, 4, 24);
        ctx.fillStyle = "#2d1b0d";
        ctx.fillRect(-14, -26, 28, 4);
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(-3, -27, 6, 6);
        ctx.fillStyle = "#5c3a21";
        ctx.beginPath();
        ctx.roundRect(-20, -45 + armSwingLeft * 0.4, 6, 18, 3);
        ctx.fill();
        ctx.fillStyle = "#6b4423";
        ctx.beginPath();
        ctx.roundRect(14, -45 + armSwingRight * 0.4, 6, 18, 3);
        ctx.fill();
        ctx.fillStyle = "#d4a373";
        ctx.beginPath();
        ctx.arc(0, -56, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3525";
        ctx.beginPath();
        ctx.ellipse(0, -62, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-8, -72, 16, 11, [5, 5, 1, 1]);
        ctx.fill();
        ctx.fillStyle = "#22150b";
        ctx.fillRect(-8, -64, 16, 3);
        const wave = Math.sin(this.animTime * 16) * 6;
        ctx.fillStyle = "#d93829";
        ctx.beginPath();
        ctx.moveTo(-3, -50);
        ctx.quadraticCurveTo(-14, -46 + wave, -24, -50 + wave * 1.4);
        ctx.lineTo(-20, -44 + wave);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // src/environment.js
  var Environment = class {
    constructor() {
      this.scrollDistance = 0;
      this.roadSegmentLength = 80;
      this.numSegments = 24;
      this.pillarSpacing = 240;
      this.particles = [];
      this.initParticles(35);
      this.flameTime = 0;
    }
    initParticles(count) {
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * 800,
          y: Math.random() * 250 + 20,
          z: Math.random() * CAMERA.DEPTH_MAX,
          speedZ: Math.random() * 40 + 20,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.7 + 0.3,
          osc: Math.random() * Math.PI * 2
        });
      }
    }
    reset() {
      this.scrollDistance = 0;
      this.flameTime = 0;
    }
    update(dt, forwardDistance) {
      this.scrollDistance += forwardDistance;
      this.flameTime += dt * 8;
      for (const p of this.particles) {
        p.z -= forwardDistance * 0.35 + p.speedZ * dt;
        p.osc += dt * 3;
        p.x += Math.sin(p.osc) * 0.4;
        if (p.z < CAMERA.DEPTH_MIN) {
          p.z = CAMERA.DEPTH_MAX;
          p.x = (Math.random() - 0.5) * 800;
          p.y = Math.random() * 250 + 20;
        }
      }
    }
    /**
     * Renders background, stone track, side pillars, and atmospheric mist.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {import('./camera.js').Camera} camera 
     */
    render(ctx, camera) {
      const w = camera.width;
      const h = camera.height;
      const hy = camera.horizonY;
      this.renderSkyAndCanopy(ctx, w, h, hy);
      this.renderDistantRuins(ctx, w, hy);
      this.renderJungleGround(ctx, w, h, hy);
      this.renderStoneTrack(ctx, camera);
      this.renderEdgePillars(ctx, camera);
      this.renderPollenParticles(ctx, camera);
      this.renderAtmosphereVignette(ctx, w, h, hy);
    }
    renderSkyAndCanopy(ctx, w, h, hy) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, hy);
      skyGrad.addColorStop(0, "#102219");
      skyGrad.addColorStop(0.5, "#2b3f27");
      skyGrad.addColorStop(0.85, "#73572d");
      skyGrad.addColorStop(1, "#b5833c");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, hy + 4);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ffea9f";
      const numRays = 7;
      const cx = w * 0.5;
      for (let i = 0; i < numRays; i++) {
        const angle = -0.6 + i / numRays * 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, hy * 0.3);
        ctx.lineTo(cx + Math.sin(angle - 0.05) * w, hy);
        ctx.lineTo(cx + Math.sin(angle + 0.05) * w, hy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    renderDistantRuins(ctx, w, hy) {
      ctx.save();
      ctx.fillStyle = "#1c281e";
      const cx = w * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 90, hy);
      ctx.lineTo(cx - 70, hy - 40);
      ctx.lineTo(cx - 50, hy - 40);
      ctx.lineTo(cx - 35, hy - 70);
      ctx.lineTo(cx + 35, hy - 70);
      ctx.lineTo(cx + 50, hy - 40);
      ctx.lineTo(cx + 70, hy - 40);
      ctx.lineTo(cx + 90, hy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2d3b2b";
      ctx.fillRect(cx - 20, hy - 84, 40, 14);
      ctx.fillStyle = "#182419";
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(0, hy - 50);
      ctx.quadraticCurveTo(w * 0.2, hy - 80, cx - 80, hy);
      ctx.lineTo(0, hy);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, hy);
      ctx.lineTo(w, hy - 60);
      ctx.quadraticCurveTo(w * 0.8, hy - 85, cx + 80, hy);
      ctx.lineTo(w, hy);
      ctx.fill();
      ctx.restore();
    }
    renderJungleGround(ctx, w, h, hy) {
      const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
      groundGrad.addColorStop(0, "#1c2e1f");
      groundGrad.addColorStop(0.4, "#152517");
      groundGrad.addColorStop(1, "#0c180e");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, hy, w, h - hy);
    }
    renderStoneTrack(ctx, camera) {
      const totalRoadWidth = LANE_WIDTH_WORLD * 3.4;
      const segmentOffset = this.scrollDistance % this.roadSegmentLength;
      for (let i = this.numSegments - 1; i >= 0; i--) {
        const zNear = i * this.roadSegmentLength - segmentOffset + PLAYER_CONFIG_WORLD_Z_OFFSET;
        const zFar = zNear + this.roadSegmentLength;
        if (zFar > CAMERA.DEPTH_MAX || zNear < CAMERA.DEPTH_MIN) continue;
        const segNear = camera.getRoadSegmentAtZ(zNear, totalRoadWidth);
        const segFar = camera.getRoadSegmentAtZ(zFar, totalRoadWidth);
        if (!segNear.visible && !segFar.visible) continue;
        const isAlt = Math.floor((this.scrollDistance + zNear) / this.roadSegmentLength) % 2 === 0;
        ctx.fillStyle = isAlt ? "#4d463b" : "#3f382f";
        ctx.beginPath();
        ctx.moveTo(segFar.leftX, segFar.y);
        ctx.lineTo(segFar.rightX, segFar.y);
        ctx.lineTo(segNear.rightX, segNear.y);
        ctx.lineTo(segNear.leftX, segNear.y);
        ctx.closePath();
        ctx.fill();
        const borderWNear = (segNear.rightX - segNear.leftX) * 0.06;
        const borderWFar = (segFar.rightX - segFar.leftX) * 0.06;
        ctx.fillStyle = "#2c3526";
        ctx.beginPath();
        ctx.moveTo(segFar.leftX, segFar.y);
        ctx.lineTo(segFar.leftX + borderWFar, segFar.y);
        ctx.lineTo(segNear.leftX + borderWNear, segNear.y);
        ctx.lineTo(segNear.leftX, segNear.y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(segFar.rightX - borderWFar, segFar.y);
        ctx.lineTo(segFar.rightX, segFar.y);
        ctx.lineTo(segNear.rightX, segNear.y);
        ctx.lineTo(segNear.rightX - borderWNear, segNear.y);
        ctx.closePath();
        ctx.fill();
        this.renderLaneDividers(ctx, camera, zNear, zFar, isAlt);
      }
    }
    renderLaneDividers(ctx, camera, zNear, zFar, isAlt) {
      const laneOffsets = [-LANE_WIDTH_WORLD * 0.5, LANE_WIDTH_WORLD * 0.5];
      ctx.strokeStyle = isAlt ? "rgba(212, 175, 55, 0.45)" : "rgba(120, 110, 90, 0.25)";
      ctx.lineWidth = Math.max(1, (CAMERA.DEPTH_MAX - zNear) / CAMERA.DEPTH_MAX * 2.5);
      for (const laneX of laneOffsets) {
        const pFar = camera.project(laneX, 0, zFar);
        const pNear = camera.project(laneX, 0, zNear);
        if (pFar.visible && pNear.visible) {
          ctx.beginPath();
          ctx.moveTo(pFar.screenX, pFar.screenY);
          ctx.lineTo(pNear.screenX, pNear.screenY);
          ctx.stroke();
        }
      }
    }
    renderEdgePillars(ctx, camera) {
      const firstPillarIndex = Math.floor(this.scrollDistance / this.pillarSpacing);
      const maxPillars = Math.ceil(CAMERA.DEPTH_MAX / this.pillarSpacing) + 1;
      for (let i = maxPillars; i >= 0; i--) {
        const pillarIndex = firstPillarIndex + i;
        const worldZ = pillarIndex * this.pillarSpacing - this.scrollDistance + PLAYER_CONFIG_WORLD_Z_OFFSET;
        if (worldZ < CAMERA.DEPTH_MIN || worldZ > CAMERA.DEPTH_MAX) continue;
        const roadSideX = LANE_WIDTH_WORLD * 1.85;
        this.drawTemplePillar(ctx, camera, -roadSideX, worldZ, -1);
        this.drawTemplePillar(ctx, camera, roadSideX, worldZ, 1);
      }
    }
    drawTemplePillar(ctx, camera, worldX, worldZ, side) {
      const proj = camera.project(worldX, 0, worldZ);
      if (!proj.visible) return;
      const s = proj.scale;
      const pw = 28 * s;
      const ph = 110 * s;
      ctx.save();
      ctx.translate(proj.screenX, proj.screenY);
      const pillarGrad = ctx.createLinearGradient(-pw * 0.5, 0, pw * 0.5, 0);
      pillarGrad.addColorStop(0, "#2d271f");
      pillarGrad.addColorStop(0.4, "#544b3c");
      pillarGrad.addColorStop(1, "#231e17");
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(-pw * 0.5, -ph, pw, ph);
      ctx.fillStyle = "#6e624e";
      ctx.fillRect(-pw * 0.65, -ph, pw * 1.3, 12 * s);
      ctx.fillRect(-pw * 0.65, -8 * s, pw * 1.3, 8 * s);
      ctx.fillStyle = "#1c1712";
      ctx.fillRect(-pw * 0.3, -ph * 0.7, pw * 0.6, ph * 0.2);
      ctx.fillStyle = "#bfa15f";
      ctx.fillRect(-pw * 0.15, -ph * 0.65, pw * 0.3, 3 * s);
      const torchY = -ph - 6 * s;
      ctx.fillStyle = "#221e1a";
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, torchY);
      ctx.lineTo(pw * 0.5, torchY);
      ctx.lineTo(pw * 0.3, torchY + 8 * s);
      ctx.lineTo(-pw * 0.3, torchY + 8 * s);
      ctx.closePath();
      ctx.fill();
      const flicker = Math.sin(this.flameTime + worldZ) * 3 * s;
      const flameH = (22 + flicker) * s;
      const flameW = (12 + flicker * 0.5) * s;
      const fireGrad = ctx.createRadialGradient(0, torchY - flameH * 0.5, 2 * s, 0, torchY - flameH * 0.5, 25 * s);
      fireGrad.addColorStop(0, "rgba(255, 210, 70, 0.95)");
      fireGrad.addColorStop(0.4, "rgba(255, 110, 20, 0.7)");
      fireGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, torchY - flameH * 0.5, 24 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff4a3";
      ctx.beginPath();
      ctx.moveTo(-flameW * 0.4, torchY);
      ctx.quadraticCurveTo(0, torchY - flameH * 1.2, flameW * 0.4, torchY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    renderPollenParticles(ctx, camera) {
      for (const p of this.particles) {
        const proj = camera.project(p.x, p.y, p.z);
        if (!proj.visible) continue;
        ctx.save();
        ctx.fillStyle = `rgba(255, 220, 130, ${p.alpha * proj.scale})`;
        ctx.beginPath();
        ctx.arc(proj.screenX, proj.screenY, Math.max(0.8, p.radius * proj.scale * 1.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    renderAtmosphereVignette(ctx, w, h, hy) {
      const fogGrad = ctx.createLinearGradient(0, hy - 15, 0, hy + 25);
      fogGrad.addColorStop(0, "rgba(181, 131, 60, 0)");
      fogGrad.addColorStop(0.5, "rgba(181, 131, 60, 0.4)");
      fogGrad.addColorStop(1, "rgba(30, 45, 30, 0)");
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, hy - 15, w, 40);
      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.75);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(10, 18, 12, 0.45)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  };
  var PLAYER_CONFIG_WORLD_Z_OFFSET = 30;

  // src/obstacles.js
  var ObstacleManager = class {
    constructor() {
      this.obstacles = [];
      this.nextSpawnZ = 600;
      this.minSpacing = 280;
      this.difficulty = 1;
    }
    reset() {
      this.obstacles = [];
      this.nextSpawnZ = 600;
      this.difficulty = 1;
    }
    /**
     * Updates obstacle positions, procedurally spawns new ones, and prunes off-screen obstacles.
     * @param {number} dt 
     * @param {number} speed 
     */
    update(dt, speed) {
      const moveDelta = speed * dt;
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.z -= moveDelta;
        if (obs.z < CAMERA.DEPTH_MIN) {
          this.obstacles.splice(i, 1);
        }
      }
      this.nextSpawnZ -= moveDelta;
      if (this.nextSpawnZ <= CAMERA.DEPTH_MAX - 100) {
        this.spawnPattern();
      }
    }
    /**
     * Spawns an obstacle pattern guaranteed to have at least one fair, clear escape lane.
     */
    spawnPattern() {
      const spawnZ = CAMERA.DEPTH_MAX;
      const rand = Math.random();
      const dynamicSpacing = Math.max(220, this.minSpacing - this.difficulty * 8);
      if (rand < 0.28) {
        const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
        this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.LOW_BARRIER, targetLane, spawnZ));
        if (Math.random() < 0.35) {
          const otherLanes = LANE_VALUES.filter((l) => l !== targetLane);
          const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
          this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.LOW_BARRIER, secondLane, spawnZ));
        }
      } else if (rand < 0.54) {
        const spanAll = Math.random() < 0.5;
        if (spanAll) {
          LANE_VALUES.forEach((lane) => {
            this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.HIGH_BARRIER, lane, spawnZ));
          });
        } else {
          const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
          this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.HIGH_BARRIER, targetLane, spawnZ));
        }
      } else if (rand < 0.78) {
        const blockedLanesCount = Math.random() < 0.4 ? 2 : 1;
        const shuffledLanes = [...LANE_VALUES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < blockedLanesCount; i++) {
          this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.STONE_BLOCK, shuffledLanes[i], spawnZ));
        }
      } else {
        const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
        this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.GROUND_GAP, targetLane, spawnZ));
      }
      this.nextSpawnZ = spawnZ + dynamicSpacing;
    }
    createObstacle(type, lane, z) {
      return {
        type,
        lane,
        worldX: lane * LANE_WIDTH_WORLD,
        z,
        width: LANE_WIDTH_WORLD * 0.92,
        depth: 30,
        // Depth buffer along track
        passed: false
      };
    }
    /**
     * Checks collision against the player.
     * @param {import('./player.js').Player} player 
     * @returns {boolean} True if a fatal collision occurred
     */
    checkCollision(player) {
      const pz = player.worldZ;
      const px = player.worldX;
      const py = player.worldY;
      const isSliding = player.state === PLAYER_STATES.SLIDING;
      for (const obs of this.obstacles) {
        const zDist = Math.abs(obs.z - pz);
        if (zDist > 25) continue;
        const xDist = Math.abs(obs.worldX - px);
        const xThreshold = (obs.width + player.width) * 0.44;
        if (xDist > xThreshold) continue;
        switch (obs.type) {
          case OBSTACLE_TYPES.LOW_BARRIER:
            if (py > 38) {
              continue;
            }
            return true;
          // Hit barrier
          case OBSTACLE_TYPES.HIGH_BARRIER:
            if (isSliding && py <= 5) {
              continue;
            }
            return true;
          // Hit overhead arch
          case OBSTACLE_TYPES.STONE_BLOCK:
            return true;
          case OBSTACLE_TYPES.GROUND_GAP:
            if (py > 28) {
              continue;
            }
            return true;
        }
      }
      return false;
    }
    /**
     * Renders all active obstacles on the Canvas.
     * Renders sorted from furthest to nearest for correct depth layering.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {import('./camera.js').Camera} camera 
     */
    render(ctx, camera) {
      const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);
      for (const obs of sorted) {
        const proj = camera.project(obs.worldX, 0, obs.z);
        if (!proj.visible) continue;
        ctx.save();
        ctx.translate(proj.screenX, proj.screenY);
        switch (obs.type) {
          case OBSTACLE_TYPES.LOW_BARRIER:
            this.renderLowBarrier(ctx, proj.scale, obs.width);
            break;
          case OBSTACLE_TYPES.HIGH_BARRIER:
            this.renderHighBarrier(ctx, proj.scale, obs.width);
            break;
          case OBSTACLE_TYPES.STONE_BLOCK:
            this.renderStoneBlock(ctx, proj.scale, obs.width);
            break;
          case OBSTACLE_TYPES.GROUND_GAP:
            this.renderGroundGap(ctx, proj.scale, obs.width);
            break;
        }
        ctx.restore();
      }
    }
    /**
     * Low wooden spike barrier / fallen log (Requires JUMP).
     */
    renderLowBarrier(ctx, s, widthWorld) {
      const w = widthWorld * s * 1.8;
      const h = 38 * s;
      ctx.fillStyle = "rgba(15, 10, 5, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 2, w * 0.5, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      const woodGrad = ctx.createLinearGradient(0, -h, 0, 0);
      woodGrad.addColorStop(0, "#784d28");
      woodGrad.addColorStop(0.5, "#563517");
      woodGrad.addColorStop(1, "#341f0b");
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h, w, h * 0.7, 4 * s);
      ctx.fill();
      ctx.fillStyle = "#2c190a";
      ctx.fillRect(-w * 0.45, -h * 1.15, 8 * s, h * 1.2);
      ctx.fillRect(w * 0.45 - 8 * s, -h * 1.15, 8 * s, h * 1.2);
      ctx.fillStyle = "#b38246";
      const numSpikes = 5;
      const step = w / numSpikes;
      for (let i = 0; i < numSpikes; i++) {
        const sx = -w * 0.5 + i * step + step * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx - 4 * s, -h);
        ctx.lineTo(sx, -h - 10 * s);
        ctx.lineTo(sx + 4 * s, -h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.75);
      ctx.lineTo(-6 * s, -h * 0.4);
      ctx.lineTo(6 * s, -h * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    /**
     * Overhead ancient carved stone lintel arch (Requires SLIDE).
     */
    renderHighBarrier(ctx, s, widthWorld) {
      const w = widthWorld * s * 2;
      const archHeight = 84 * s;
      const beamThickness = 28 * s;
      ctx.fillStyle = "rgba(10, 10, 10, 0.35)";
      ctx.fillRect(-w * 0.5, -4 * s, w, 8 * s);
      ctx.fillStyle = "#3a3228";
      ctx.fillRect(-w * 0.5, -archHeight, 14 * s, archHeight);
      ctx.fillRect(w * 0.5 - 14 * s, -archHeight, 14 * s, archHeight);
      const beamGrad = ctx.createLinearGradient(0, -archHeight, 0, -archHeight + beamThickness);
      beamGrad.addColorStop(0, "#5f5443");
      beamGrad.addColorStop(0.5, "#463d30");
      beamGrad.addColorStop(1, "#2c251c");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(-w * 0.52, -archHeight, w * 1.04, beamThickness);
      ctx.fillStyle = "#b89f65";
      ctx.beginPath();
      ctx.arc(0, -archHeight + beamThickness * 0.5, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb703";
      ctx.beginPath();
      ctx.moveTo(0, -archHeight + beamThickness + 14 * s);
      ctx.lineTo(-6 * s, -archHeight + beamThickness + 4 * s);
      ctx.lineTo(6 * s, -archHeight + beamThickness + 4 * s);
      ctx.closePath();
      ctx.fill();
    }
    /**
     * Tall solid ancient stone totem / monolith block (Requires DODGE).
     */
    renderStoneBlock(ctx, s, widthWorld) {
      const w = widthWorld * s * 1.6;
      const h = 110 * s;
      ctx.fillStyle = "rgba(10, 8, 5, 0.5)";
      ctx.beginPath();
      ctx.ellipse(0, 3 * s, w * 0.55, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      const stoneGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
      stoneGrad.addColorStop(0, "#2e271e");
      stoneGrad.addColorStop(0.3, "#5c503e");
      stoneGrad.addColorStop(0.7, "#43392a");
      stoneGrad.addColorStop(1, "#1e1811");
      ctx.fillStyle = stoneGrad;
      ctx.beginPath();
      ctx.roundRect(-w * 0.5, -h, w, h, 6 * s);
      ctx.fill();
      ctx.fillStyle = "#e63946";
      ctx.shadowColor = "#e63946";
      ctx.shadowBlur = 10 * s;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.65);
      ctx.lineTo(12 * s, -h * 0.5);
      ctx.lineTo(0, -h * 0.35);
      ctx.lineTo(-12 * s, -h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    /**
     * Crumbling road pit / ground hazard (Requires JUMP or DODGE).
     */
    renderGroundGap(ctx, s, widthWorld) {
      const w = widthWorld * s * 1.7;
      const pitDepth = 22 * s;
      ctx.fillStyle = "#080605";
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.5, pitDepth * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      const lavaGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, w * 0.45);
      lavaGrad.addColorStop(0, "rgba(230, 57, 70, 0.85)");
      lavaGrad.addColorStop(0.6, "rgba(120, 20, 20, 0.4)");
      lavaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lavaGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.45, pitDepth * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#453a2d";
      ctx.fillRect(-w * 0.48, -4 * s, 10 * s, 6 * s);
      ctx.fillRect(w * 0.35, -2 * s, 12 * s, 5 * s);
    }
  };

  // src/coins.js
  var CoinManager = class {
    constructor() {
      this.coins = [];
      this.sparkles = [];
      this.floatingScores = [];
      this.nextSpawnZ = 350;
      this.animTime = 0;
    }
    reset() {
      this.coins = [];
      this.sparkles = [];
      this.floatingScores = [];
      this.nextSpawnZ = 350;
      this.animTime = 0;
    }
    /**
     * Updates coins, spawns lines/arcs, and animates collection sparkles.
     * @param {number} dt 
     * @param {number} speed 
     */
    update(dt, speed) {
      this.animTime += dt * SCORING.COIN_FLOAT_SPEED;
      const moveDelta = speed * dt;
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.z -= moveDelta;
        if (coin.z < CAMERA.DEPTH_MIN) {
          this.coins.splice(i, 1);
        }
      }
      this.nextSpawnZ -= moveDelta;
      if (this.nextSpawnZ <= CAMERA.DEPTH_MAX - 100) {
        this.spawnCoinPattern();
      }
      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sp = this.sparkles[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.alpha -= sp.fade * dt;
        sp.size *= 0.96;
        if (sp.alpha <= 0) {
          this.sparkles.splice(i, 1);
        }
      }
      for (let i = this.floatingScores.length - 1; i >= 0; i--) {
        const fs = this.floatingScores[i];
        fs.y += fs.vy * dt;
        fs.alpha -= dt * 1.5;
        if (fs.alpha <= 0) {
          this.floatingScores.splice(i, 1);
        }
      }
    }
    /**
     * Spawns rhythmic lines or jump arcs of gold coins.
     */
    spawnCoinPattern() {
      const spawnZ = CAMERA.DEPTH_MAX;
      const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
      const isArc = Math.random() < 0.35;
      const count = Math.floor(Math.random() * 4) + 4;
      const spacing = 45;
      for (let i = 0; i < count; i++) {
        const z = spawnZ + i * spacing;
        let elevation = 22;
        if (isArc) {
          const progress = i / (count - 1);
          elevation += Math.sin(progress * Math.PI) * 75;
        }
        this.coins.push({
          lane: targetLane,
          worldX: targetLane * LANE_WIDTH_WORLD,
          worldY: elevation,
          z,
          collected: false
        });
      }
      this.nextSpawnZ = spawnZ + count * spacing + 180;
    }
    /**
     * Checks collision between player and coins.
     * @param {import('./player.js').Player} player 
     * @param {Function} onCollectCoin 
     * @returns {number} Number of coins collected this frame
     */
    checkCollection(player, onCollectCoin) {
      let collectedCount = 0;
      const pz = player.worldZ;
      const px = player.worldX;
      const py = player.worldY;
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        if (coin.collected) continue;
        const zDist = Math.abs(coin.z - pz);
        if (zDist > 30) continue;
        const xDist = Math.abs(coin.worldX - px);
        if (xDist > 40) continue;
        const yDist = Math.abs(coin.worldY - (py + 30));
        if (yDist > 55) continue;
        coin.collected = true;
        this.coins.splice(i, 1);
        collectedCount++;
        this.triggerSparkles(coin.worldX, coin.worldY, coin.z);
        this.triggerFloatingScore(coin.worldX, coin.worldY + 25, coin.z);
        if (onCollectCoin) {
          onCollectCoin();
        }
      }
      return collectedCount;
    }
    triggerSparkles(worldX, worldY, worldZ) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 80 + 40;
        this.sparkles.push({
          worldX,
          worldY,
          worldZ,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 2,
          color: Math.random() < 0.6 ? "#ffd700" : "#fff3b0",
          alpha: 1,
          fade: 2.2
        });
      }
    }
    triggerFloatingScore(worldX, worldY, worldZ) {
      this.floatingScores.push({
        worldX,
        worldY,
        worldZ,
        y: 0,
        vy: 45,
        text: `+${SCORING.POINTS_PER_COIN}`,
        alpha: 1
      });
    }
    /**
     * Renders all coins, shadows, sparkles, and score popups.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {import('./camera.js').Camera} camera 
     */
    render(ctx, camera) {
      const sortedCoins = [...this.coins].sort((a, b) => b.z - a.z);
      for (const coin of sortedCoins) {
        const bobbing = Math.sin(this.animTime + coin.z * 0.05) * SCORING.COIN_FLOAT_AMPLITUDE;
        const currentY = coin.worldY + bobbing;
        const groundProj = camera.project(coin.worldX, 0, coin.z);
        if (groundProj.visible) {
          this.renderCoinShadow(ctx, groundProj.screenX, groundProj.screenY, groundProj.scale);
        }
        const coinProj = camera.project(coin.worldX, currentY, coin.z);
        if (!coinProj.visible) continue;
        this.renderCoinBody(ctx, coinProj.screenX, coinProj.screenY, coinProj.scale, coin.z);
      }
      this.renderSparkles(ctx, camera);
      this.renderFloatingScores(ctx, camera);
    }
    renderCoinShadow(ctx, sx, sy, scale) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = "rgba(15, 12, 8, 0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 * scale * 1.8, 5 * scale * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    renderCoinBody(ctx, sx, sy, scale, z) {
      ctx.save();
      ctx.translate(sx, sy);
      const spinPhase = this.animTime * 2.5 + z * 0.08;
      const spinScaleX = Math.cos(spinPhase);
      const radius = 16 * scale * 1.8;
      ctx.scale(Math.max(0.12, Math.abs(spinScaleX)), 1);
      const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
      rimGrad.addColorStop(0, "#ffe066");
      rimGrad.addColorStop(0.5, "#f48c06");
      rimGrad.addColorStop(1, "#9d0208");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffba08";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d00000";
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.45);
      ctx.lineTo(radius * 0.45, 0);
      ctx.lineTo(0, radius * 0.45);
      ctx.lineTo(-radius * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.beginPath();
      ctx.ellipse(-radius * 0.35, -radius * 0.35, radius * 0.25, radius * 0.12, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    renderSparkles(ctx, camera) {
      for (const sp of this.sparkles) {
        const proj = camera.project(sp.worldX, sp.worldY, sp.worldZ);
        if (!proj.visible) continue;
        const sx = proj.screenX + sp.x;
        const sy = proj.screenY - sp.y;
        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, sp.size * proj.scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    renderFloatingScores(ctx, camera) {
      for (const fs of this.floatingScores) {
        const proj = camera.project(fs.worldX, fs.worldY, fs.worldZ);
        if (!proj.visible) continue;
        const sx = proj.screenX;
        const sy = proj.screenY - fs.y;
        ctx.save();
        ctx.font = `bold ${Math.max(12, Math.floor(18 * proj.scale))}px "Segoe UI", sans-serif`;
        ctx.fillStyle = `rgba(255, 225, 50, ${Math.max(0, fs.alpha)})`;
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 4;
        ctx.textAlign = "center";
        ctx.fillText(fs.text, sx, sy);
        ctx.restore();
      }
    }
  };

  // src/ui.js
  var UIManager = class {
    constructor() {
      this.screenMenu = document.getElementById("screen-menu");
      this.screenHud = document.getElementById("screen-hud");
      this.screenPause = document.getElementById("screen-pause");
      this.screenGameOver = document.getElementById("screen-gameover");
      this.screenHowToPlay = document.getElementById("screen-howtoplay");
      this.hudScore = document.getElementById("hud-score");
      this.hudCoins = document.getElementById("hud-coins");
      this.hudSpeed = document.getElementById("hud-speed");
      this.goScore = document.getElementById("go-final-score");
      this.goCoins = document.getElementById("go-final-coins");
      this.goBest = document.getElementById("go-best-score");
      this.goNewHighBadge = document.getElementById("go-new-high-badge");
      this.menuBestScore = document.getElementById("menu-best-score");
      this.btnSoundMenu = document.getElementById("btn-sound-menu");
      this.btnSoundHud = document.getElementById("btn-sound-hud");
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
        console.warn("LocalStorage access restricted:", e);
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
          console.warn("LocalStorage save failed:", e);
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
      this.screenMenu.classList.add("hidden");
      this.screenHud.classList.add("hidden");
      this.screenPause.classList.add("hidden");
      this.screenGameOver.classList.add("hidden");
      this.screenHowToPlay.classList.add("hidden");
      switch (state) {
        case GAME_STATES.MENU:
          this.screenMenu.classList.remove("hidden");
          break;
        case GAME_STATES.PLAYING:
          this.screenHud.classList.remove("hidden");
          break;
        case GAME_STATES.PAUSED:
          this.screenHud.classList.remove("hidden");
          this.screenPause.classList.remove("hidden");
          break;
        case GAME_STATES.GAMEOVER:
          this.screenHud.classList.remove("hidden");
          this.screenGameOver.classList.remove("hidden");
          break;
      }
    }
    showHowToPlay() {
      this.screenMenu.classList.add("hidden");
      this.screenHowToPlay.classList.remove("hidden");
    }
    hideHowToPlay() {
      this.screenHowToPlay.classList.add("hidden");
      this.screenMenu.classList.remove("hidden");
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
        const speedKmh = Math.floor(speed / 10 * 0.9);
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
          this.goNewHighBadge.classList.remove("hidden");
        } else {
          this.goNewHighBadge.classList.add("hidden");
        }
      }
      this.setScreen(GAME_STATES.GAMEOVER);
    }
    /**
     * Updates sound toggle button visual indicators.
     * @param {boolean} isMuted 
     */
    updateSoundIcons(isMuted) {
      const icon = isMuted ? "\u{1F507}" : "\u{1F50A}";
      const label = isMuted ? "Unmute" : "Mute";
      if (this.btnSoundMenu) {
        this.btnSoundMenu.textContent = `${icon} ${label}`;
        this.btnSoundMenu.setAttribute("aria-label", label);
      }
      if (this.btnSoundHud) {
        this.btnSoundHud.textContent = icon;
        this.btnSoundHud.setAttribute("aria-label", label);
      }
    }
  };

  // src/game.js
  var Game = class {
    constructor() {
      this.canvas = document.getElementById("game-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.camera = new Camera();
      this.audio = new AudioManager();
      this.input = new InputManager();
      this.player = new Player();
      this.environment = new Environment();
      this.obstacles = new ObstacleManager();
      this.coins = new CoinManager();
      this.ui = new UIManager();
      this.state = GAME_STATES.MENU;
      this.currentSpeed = PLAYER_CONFIG.RUN_SPEED_INITIAL;
      this.distanceTravelled = 0;
      this.score = 0;
      this.coinsCollected = 0;
      this.lastTime = 0;
      this.animationFrameId = null;
      this.crashTimer = 0;
      this.boundLoop = this.loop.bind(this);
      this.boundResize = this.handleResize.bind(this);
    }
    /**
     * Initializes engine, wires callbacks, and attaches event listeners.
     */
    init() {
      this.handleResize();
      window.addEventListener("resize", this.boundResize);
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
      this.input.attach(this.canvas);
      this.bindUIButtons();
      this.ui.updateSoundIcons(this.audio.isMuted);
      this.ui.setScreen(GAME_STATES.MENU);
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
          el.addEventListener("click", (e) => {
            e.preventDefault();
            this.audio.init();
            this.audio.playClick();
            callback();
          });
        }
      };
      bind("btn-start-game", () => this.startGame());
      bind("btn-how-to-play", () => this.ui.showHowToPlay());
      bind("btn-close-howtoplay", () => this.ui.hideHowToPlay());
      bind("btn-hud-pause", () => this.pause());
      bind("btn-resume", () => this.resume());
      bind("btn-pause-restart", () => this.startGame());
      bind("btn-pause-menu", () => this.returnToMenu());
      bind("btn-restart-game", () => this.startGame());
      bind("btn-menu-from-gameover", () => this.returnToMenu());
      const toggleSound = () => {
        this.audio.init();
        const isMuted = this.audio.toggleMute();
        this.ui.updateSoundIcons(isMuted);
      };
      bind("btn-sound-menu", toggleSound);
      bind("btn-sound-hud", toggleSound);
    }
    /**
     * Starts or restarts a fresh gameplay session.
     */
    startGame() {
      this.audio.init();
      this.audio.startBGM();
      this.state = GAME_STATES.PLAYING;
      this.currentSpeed = PLAYER_CONFIG.RUN_SPEED_INITIAL;
      this.distanceTravelled = 0;
      this.score = 0;
      this.coinsCollected = 0;
      this.crashTimer = 0;
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
      this.lastTime = performance.now();
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
      this.crashTimer = 0.8;
    }
    /**
     * Handles canvas resizing with devicePixelRatio for sharp Retina rendering.
     */
    handleResize() {
      const container = document.getElementById("game-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = Math.floor(rect.width);
      const cssHeight = Math.floor(rect.height);
      this.canvas.width = cssWidth * dpr;
      this.canvas.height = cssHeight * dpr;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.camera.updateViewport(cssWidth, cssHeight);
    }
    /**
     * Main animation frame loop.
     * @param {number} timestamp
     */
    loop(timestamp) {
      const dt = Math.min(0.1, (timestamp - this.lastTime) / 1e3);
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
        const menuSpeed = 160;
        this.environment.update(dt, menuSpeed * dt);
        this.player.update(dt, menuSpeed);
        return;
      }
      if (this.state === GAME_STATES.PAUSED) {
        return;
      }
      if (this.state === GAME_STATES.GAMEOVER) {
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
        this.currentSpeed = Math.min(
          PLAYER_CONFIG.RUN_SPEED_MAX,
          this.currentSpeed + PLAYER_CONFIG.ACCELERATION * dt
        );
        const forwardDelta = this.currentSpeed * dt;
        this.distanceTravelled += forwardDelta;
        this.score = Math.floor(this.distanceTravelled * 0.1) + this.coinsCollected * SCORING.POINTS_PER_COIN;
        this.ui.updateHUD(this.score, this.coinsCollected, this.currentSpeed);
        this.environment.update(dt, forwardDelta);
        this.player.update(dt, this.currentSpeed);
        this.obstacles.difficulty = (this.currentSpeed - PLAYER_CONFIG.RUN_SPEED_INITIAL) / 200;
        this.obstacles.update(dt, this.currentSpeed);
        if (this.obstacles.checkCollision(this.player)) {
          this.triggerGameOver();
          return;
        }
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
      this.environment.render(this.ctx, this.camera);
      this.obstacles.render(this.ctx, this.camera);
      this.coins.render(this.ctx, this.camera);
      this.player.render(this.ctx, this.camera);
    }
  };

  // src/main.js
  window.addEventListener("DOMContentLoaded", () => {
    const game = new Game();
    game.init();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.state === GAME_STATES.PLAYING) {
        game.pause();
      }
    });
    window.addEventListener("blur", () => {
      if (game.state === GAME_STATES.PLAYING) {
        game.pause();
      }
    });
    window.jungleDashGame = game;
  });
})();
