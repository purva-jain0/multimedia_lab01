/* ==========================================================================
   Automated Test Suite for Jungle Dash: Lost Temple
   Tests Core Mechanics, Collision Detection, Camera Projection, and State Machine
   ========================================================================== */

import { CAMERA, LANES, LANE_WIDTH_WORLD, OBSTACLE_TYPES, PLAYER_CONFIG, SCORING } from './src/constants.js';
import { Camera } from './src/camera.js';
import { Player, PLAYER_STATES } from './src/player.js';
import { ObstacleManager } from './src/obstacles.js';
import { CoinManager } from './src/coins.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${testName}`);
        failed++;
    }
}

console.log('=== TEST 1: Camera & Pseudo-3D Perspective Projection ===');
const camera = new Camera();
camera.updateViewport(800, 600);

const pCenter = camera.project(0, 0, PLAYER_CONFIG.WORLD_Z);
assert(pCenter.visible === true, 'Center projection at player Z is visible');
assert(Math.abs(pCenter.screenX - 400) < 1, 'Center projection screenX is at vanishingX (400)');
assert(pCenter.screenY > camera.vanishingY && pCenter.screenY <= 600, 'ScreenY is between horizon and bottom');

const pLeft = camera.project(-LANE_WIDTH_WORLD, 0, PLAYER_CONFIG.WORLD_Z);
const pRight = camera.project(LANE_WIDTH_WORLD, 0, PLAYER_CONFIG.WORLD_Z);
assert(pLeft.screenX < pCenter.screenX, 'Left lane projects to the left of center');
assert(pRight.screenX > pCenter.screenX, 'Right lane projects to the right of center');
assert(Math.abs((pCenter.screenX - pLeft.screenX) - (pRight.screenX - pCenter.screenX)) < 1, 'Lanes are symmetrically projected');

const pFar = camera.project(0, 0, CAMERA.DEPTH_MAX - 50);
assert(pFar.scale < pCenter.scale, 'Distant objects scale down significantly');
assert(pFar.screenY < pCenter.screenY, 'Distant objects project closer to horizon');

console.log('\n=== TEST 2: Player Kinematics & Lane Bounds ===');
const player = new Player();
assert(player.currentLane === LANES.CENTER, 'Player starts in center lane');

assert(player.moveLeft() === true, 'Player can move left to Left Lane');
assert(player.currentLane === LANES.LEFT, 'Player is now in Left Lane');
assert(player.moveLeft() === false, 'Player cannot move past Left Lane boundary');
assert(player.currentLane === LANES.LEFT, 'Player remains bounded in Left Lane');

assert(player.moveRight() === true, 'Player moves back to Center Lane');
assert(player.moveRight() === true, 'Player moves to Right Lane');
assert(player.moveRight() === false, 'Player cannot move past Right Lane boundary');
assert(player.currentLane === LANES.RIGHT, 'Player remains bounded in Right Lane');

// Reset to center
player.reset();
assert(player.currentLane === LANES.CENTER, 'Reset brings player to center lane');

console.log('\n=== TEST 3: Jumping Arc & Sliding State Machine ===');
assert(player.jump() === true, 'Player initiates jump from ground');
assert(player.state === PLAYER_STATES.JUMPING, 'Player state is JUMPING');
assert(player.verticalVelocity === PLAYER_CONFIG.JUMP_VELOCITY, 'Initial jump velocity applied');

// Simulate half second of jump physics
player.update(0.2, 400);
assert(player.worldY > 0, 'Player ascends into the air');

// Advance until player lands
for (let i = 0; i < 40; i++) {
    player.update(0.05, 400);
}
assert(player.worldY === 0, 'Player returns safely to ground');
assert(player.state === PLAYER_STATES.RUNNING, 'Player state returns to RUNNING');

// Test Slide
assert(player.slide() === true, 'Player initiates slide');
assert(player.state === PLAYER_STATES.SLIDING, 'Player state is SLIDING');
assert(player.height === PLAYER_CONFIG.SLIDE_HEIGHT, 'Player height reduced during slide');

// Advance past slide duration
player.update(PLAYER_CONFIG.SLIDE_DURATION + 0.1, 400);
assert(player.state === PLAYER_STATES.RUNNING, 'Player returns to RUNNING after slide duration');
assert(player.height === PLAYER_CONFIG.NORMAL_HEIGHT, 'Player height restored to NORMAL');

console.log('\n=== TEST 4: Obstacle Collision Detection Rules ===');
const obstacles = new ObstacleManager();

// Test 4A: Low Barrier (Requires Jump)
player.reset();
const lowBarrier = obstacles.createObstacle(OBSTACLE_TYPES.LOW_BARRIER, LANES.CENTER, player.worldZ);
obstacles.obstacles = [lowBarrier];

// Standing in center - should collide!
assert(obstacles.checkCollision(player) === true, 'Standing player collides with Low Barrier');

// Jumping over low barrier - should clear!
player.worldY = 45; // in air
assert(obstacles.checkCollision(player) === false, 'Jumping player clears Low Barrier');

// Different lane - should clear!
player.worldY = 0;
player.worldX = -LANE_WIDTH_WORLD; // Left lane
assert(obstacles.checkCollision(player) === false, 'Player in different lane avoids Low Barrier');

// Test 4B: High Barrier / Overhead Lintel (Requires Slide)
player.reset();
const highBarrier = obstacles.createObstacle(OBSTACLE_TYPES.HIGH_BARRIER, LANES.CENTER, player.worldZ);
obstacles.obstacles = [highBarrier];

// Standing - should collide!
assert(obstacles.checkCollision(player) === true, 'Standing player collides with Overhead Lintel');

// Sliding - should clear!
player.slide();
assert(obstacles.checkCollision(player) === false, 'Sliding player clears under Overhead Lintel');

// Test 4C: Stone Block Monolith (Requires Dodge)
player.reset();
const stoneBlock = obstacles.createObstacle(OBSTACLE_TYPES.STONE_BLOCK, LANES.CENTER, player.worldZ);
obstacles.obstacles = [stoneBlock];

// Standing or jumping in center - collision!
assert(obstacles.checkCollision(player) === true, 'Player in same lane hits Stone Monolith');
player.worldY = 60;
assert(obstacles.checkCollision(player) === true, 'Jumping player cannot clear tall Stone Monolith');

// Moved to adjacent lane - clears!
player.worldX = LANE_WIDTH_WORLD;
assert(obstacles.checkCollision(player) === false, 'Dodging lane clears Stone Monolith');

console.log('\n=== TEST 5: Procedural Fair Path Route Guarantee ===');
obstacles.reset();
// Spawn 50 patterns and verify that every single pattern has at least one free or passable escape route
let allFair = true;
for (let step = 0; step < 50; step++) {
    obstacles.obstacles = [];
    obstacles.spawnPattern();
    const obsAtZ = obstacles.obstacles;
    
    // Check if all 3 lanes are blocked by insurmountable obstacles (STONE_BLOCK)
    const stoneLanes = obsAtZ.filter(o => o.type === OBSTACLE_TYPES.STONE_BLOCK).map(o => o.lane);
    if (stoneLanes.length >= 3) {
        allFair = false;
        break;
    }
}
assert(allFair === true, 'Procedural generator guarantees at least one fair passable route in all patterns');

console.log('\n=== TEST 6: Collectible Coins & Scoring Mechanics ===');
const coins = new CoinManager();
player.reset();

// Place coin right at player position
coins.coins = [{
    lane: LANES.CENTER,
    worldX: 0,
    worldY: 20,
    z: player.worldZ,
    collected: false
}];

let soundPlayed = false;
const collectedCount = coins.checkCollection(player, () => {
    soundPlayed = true;
});

assert(collectedCount === 1, 'Coin was successfully collected');
assert(soundPlayed === true, 'Audio trigger callback fired upon coin collection');
assert(coins.coins.length === 0, 'Collected coin removed from active array');
assert(coins.sparkles.length > 0, 'Collection sparkle particles generated');
assert(coins.floatingScores.length > 0, 'Floating score indicator generated');

// Verify coin in another lane is NOT collected
coins.coins = [{
    lane: LANES.LEFT,
    worldX: -LANE_WIDTH_WORLD,
    worldY: 20,
    z: player.worldZ,
    collected: false
}];
const countDiffLane = coins.checkCollection(player);
assert(countDiffLane === 0, 'Coin in different lane is not collected');

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('ALL UNIT AND ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
}
