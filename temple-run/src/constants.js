/* ==========================================================================
   Jungle Dash: Lost Temple - Constants & Configuration
   MCA Multimedia Systems Lab - Core Game Engine Settings
   ========================================================================== */

export const GAME_STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

export const LANES = {
    LEFT: -1,
    CENTER: 0,
    RIGHT: 1
};

export const LANE_VALUES = [-1, 0, 1];

// Lane world coordinates spacing (meters/units)
export const LANE_WIDTH_WORLD = 110;

// World Perspective & Camera Configuration
export const CAMERA = {
    FOV: 65,
    HEIGHT: 180,           // Camera height above the ground
    DEPTH_MAX: 1600,       // Maximum view distance (horizon)
    DEPTH_MIN: 10,         // Near clipping plane
    VANISHING_Y_RATIO: 0.36 // Horizon height as fraction of canvas height (0.36 = 36% from top)
};

// Player Physics & Kinetics Configuration
export const PLAYER_CONFIG = {
    WORLD_Z: 140,          // Distance from camera where the player runs
    RUN_SPEED_INITIAL: 380,// Initial forward speed (units per second)
    RUN_SPEED_MAX: 860,    // Maximum capped speed
    ACCELERATION: 4.5,     // Speed increase per second
    LANE_CHANGE_SPEED: 11, // Interpolation speed for lane transitions

    // Jump kinetics
    JUMP_VELOCITY: 580,    // Initial vertical jump impulse
    GRAVITY: -1450,        // Downward gravitational acceleration
    MAX_JUMP_HEIGHT: 130,

    // Slide kinetics
    SLIDE_DURATION: 0.72,  // Slide duration in seconds
    NORMAL_HEIGHT: 70,     // Hitbox height when standing
    SLIDE_HEIGHT: 32,      // Hitbox height when sliding
    WIDTH: 42              // Hitbox width
};

// Obstacle Types
export const OBSTACLE_TYPES = {
    LOW_BARRIER: 'LOW_BARRIER',       // Must JUMP over (wooden spike / fallen log)
    HIGH_BARRIER: 'HIGH_BARRIER',     // Must SLIDE under (stone arch / swinging blade)
    STONE_BLOCK: 'STONE_BLOCK',       // Tall solid totem - must DODGE lane
    GROUND_GAP: 'GROUND_GAP'          // Pit trap / lava fissure - must JUMP or DODGE
};

// Coin and Scoring Settings
export const SCORING = {
    POINTS_PER_METER: 1,
    POINTS_PER_COIN: 10,
    COIN_FLOAT_SPEED: 4,
    COIN_FLOAT_AMPLITUDE: 6
};

// Storage Keys
export const STORAGE_KEYS = {
    HIGH_SCORE: 'jungledash_highscore',
    TOTAL_COINS: 'jungledash_totalcoins',
    SOUND_MUTED: 'jungledash_muted'
};
