/* ==========================================================================
   Jungle Dash: Lost Temple - Obstacles & Procedural Fair-Route Generator
   MCA Multimedia Systems Lab - Collision Detection, Spawning & Object Lifecycle
   ========================================================================== */

import { CAMERA, LANES, LANE_VALUES, LANE_WIDTH_WORLD, OBSTACLE_TYPES, PLAYER_CONFIG } from './constants.js';
import { PLAYER_STATES } from './player.js';

export class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.nextSpawnZ = 600; // Next distance to spawn obstacle
        this.minSpacing = 280; // Distance between consecutive obstacles
        this.difficulty = 1.0;
    }

    reset() {
        this.obstacles = [];
        this.nextSpawnZ = 600;
        this.difficulty = 1.0;
    }

    /**
     * Updates obstacle positions, procedurally spawns new ones, and prunes off-screen obstacles.
     * @param {number} dt 
     * @param {number} speed 
     */
    update(dt, speed) {
        const moveDelta = speed * dt;

        // Move active obstacles toward camera
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.z -= moveDelta;

            // Remove obstacles that have safely passed behind the camera
            if (obs.z < CAMERA.DEPTH_MIN) {
                this.obstacles.splice(i, 1);
            }
        }

        // Advance spawn tracker
        this.nextSpawnZ -= moveDelta;

        // Spawn new obstacle pattern when spawn marker crosses horizon threshold
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

        // Dynamic spacing: decreases slightly with speed/difficulty but remains fair
        const dynamicSpacing = Math.max(220, this.minSpacing - this.difficulty * 8);

        // Pattern selection
        if (rand < 0.28) {
            // Pattern 1: Low wooden spike hurdle across 1 or 2 lanes (requires JUMP)
            const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
            this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.LOW_BARRIER, targetLane, spawnZ));

            // Occasionally spawn in 2 lanes, leaving 1 lane completely free
            if (Math.random() < 0.35) {
                const otherLanes = LANE_VALUES.filter(l => l !== targetLane);
                const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
                this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.LOW_BARRIER, secondLane, spawnZ));
            }
        } else if (rand < 0.54) {
            // Pattern 2: Overhead ancient stone lintel arch (requires SLIDE)
            // Can span across 2 lanes or all 3 lanes, but player can slide under all of them!
            const spanAll = Math.random() < 0.5;
            if (spanAll) {
                // Spans all 3 lanes - slide is guaranteed safe escape
                LANE_VALUES.forEach(lane => {
                    this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.HIGH_BARRIER, lane, spawnZ));
                });
            } else {
                const targetLane = LANE_VALUES[Math.floor(Math.random() * LANE_VALUES.length)];
                this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.HIGH_BARRIER, targetLane, spawnZ));
            }
        } else if (rand < 0.78) {
            // Pattern 3: Ancient Stone Totem Monolith (blocks 1 or 2 lanes - MUST DODGE)
            // Never block all 3 lanes!
            const blockedLanesCount = Math.random() < 0.4 ? 2 : 1;
            const shuffledLanes = [...LANE_VALUES].sort(() => Math.random() - 0.5);

            for (let i = 0; i < blockedLanesCount; i++) {
                this.obstacles.push(this.createObstacle(OBSTACLE_TYPES.STONE_BLOCK, shuffledLanes[i], spawnZ));
            }
        } else {
            // Pattern 4: Crumbling Ground Gap / Pit Trap (requires JUMP or DODGE)
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
            depth: 30, // Depth buffer along track
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
            // 1. Z-axis overlap check (depth collision window)
            const zDist = Math.abs(obs.z - pz);
            if (zDist > 25) continue; // Outside collision slice

            // 2. X-axis overlap check (lane collision)
            const xDist = Math.abs(obs.worldX - px);
            const xThreshold = (obs.width + player.width) * 0.44;
            if (xDist > xThreshold) continue; // Safely in another lane

            // 3. Y-axis / State Clearance Rules:
            switch (obs.type) {
                case OBSTACLE_TYPES.LOW_BARRIER:
                    // Cleared if jumping sufficiently high
                    if (py > 38) {
                        continue; // Cleared!
                    }
                    return true; // Hit barrier

                case OBSTACLE_TYPES.HIGH_BARRIER:
                    // Cleared if sliding
                    if (isSliding && py <= 5) {
                        continue; // Cleared under lintel!
                    }
                    return true; // Hit overhead arch

                case OBSTACLE_TYPES.STONE_BLOCK:
                    // Solid tall monolith - fatal if occupied
                    return true;

                case OBSTACLE_TYPES.GROUND_GAP:
                    // Pit trap - cleared only if airborne
                    if (py > 28) {
                        continue; // Jumped over gap!
                    }
                    return true; // Fell into pit
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
        // Sort obstacles from back (highest Z) to front (lowest Z)
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

        // Shadow on road
        ctx.fillStyle = 'rgba(15, 10, 5, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, w * 0.5, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wooden log crossbar
        const woodGrad = ctx.createLinearGradient(0, -h, 0, 0);
        woodGrad.addColorStop(0, '#784d28');
        woodGrad.addColorStop(0.5, '#563517');
        woodGrad.addColorStop(1, '#341f0b');
        ctx.fillStyle = woodGrad;

        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h, w, h * 0.7, 4 * s);
        ctx.fill();

        // Wooden posts
        ctx.fillStyle = '#2c190a';
        ctx.fillRect(-w * 0.45, -h * 1.15, 8 * s, h * 1.2);
        ctx.fillRect(w * 0.45 - 8 * s, -h * 1.15, 8 * s, h * 1.2);

        // Warning spikes on top
        ctx.fillStyle = '#b38246';
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

        // Jump arrow icon in center
        ctx.fillStyle = '#ffd700';
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
        const w = widthWorld * s * 2.0;
        const archHeight = 84 * s;
        const beamThickness = 28 * s;

        // Ground shadow beneath arch
        ctx.fillStyle = 'rgba(10, 10, 10, 0.35)';
        ctx.fillRect(-w * 0.5, -4 * s, w, 8 * s);

        // Side Support Columns
        ctx.fillStyle = '#3a3228';
        ctx.fillRect(-w * 0.5, -archHeight, 14 * s, archHeight);
        ctx.fillRect(w * 0.5 - 14 * s, -archHeight, 14 * s, archHeight);

        // Overhead Stone Crossbeam (at head height - leaves gap at ground)
        const beamGrad = ctx.createLinearGradient(0, -archHeight, 0, -archHeight + beamThickness);
        beamGrad.addColorStop(0, '#5f5443');
        beamGrad.addColorStop(0.5, '#463d30');
        beamGrad.addColorStop(1, '#2c251c');
        ctx.fillStyle = beamGrad;

        ctx.fillRect(-w * 0.52, -archHeight, w * 1.04, beamThickness);

        // Ancient Carved Skull/Idol in center of beam
        ctx.fillStyle = '#b89f65';
        ctx.beginPath();
        ctx.arc(0, -archHeight + beamThickness * 0.5, 7 * s, 0, Math.PI * 2);
        ctx.fill();

        // Slide arrow indicator pointing down
        ctx.fillStyle = '#ffb703';
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

        // Ground shadow
        ctx.fillStyle = 'rgba(10, 8, 5, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 3 * s, w * 0.55, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Monolith body
        const stoneGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
        stoneGrad.addColorStop(0, '#2e271e');
        stoneGrad.addColorStop(0.3, '#5c503e');
        stoneGrad.addColorStop(0.7, '#43392a');
        stoneGrad.addColorStop(1, '#1e1811');
        ctx.fillStyle = stoneGrad;

        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h, w, h, 6 * s);
        ctx.fill();

        // Glowing Ancient Aztec Rune on totem
        ctx.fillStyle = '#e63946';
        ctx.shadowColor = '#e63946';
        ctx.shadowBlur = 10 * s;

        // Rune Diamond
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.65);
        ctx.lineTo(12 * s, -h * 0.5);
        ctx.lineTo(0, -h * 0.35);
        ctx.lineTo(-12 * s, -h * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow blur
    }

    /**
     * Crumbling road pit / ground hazard (Requires JUMP or DODGE).
     */
    renderGroundGap(ctx, s, widthWorld) {
        const w = widthWorld * s * 1.7;
        const pitDepth = 22 * s;

        // Pit Hole (Chasm into darkness)
        ctx.fillStyle = '#080605';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.5, pitDepth * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deep red/lava or abyss glow from chasm
        const lavaGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, w * 0.45);
        lavaGrad.addColorStop(0, 'rgba(230, 57, 70, 0.85)');
        lavaGrad.addColorStop(0.6, 'rgba(120, 20, 20, 0.4)');
        lavaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lavaGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.45, pitDepth * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Broken stone rubble around edge
        ctx.fillStyle = '#453a2d';
        ctx.fillRect(-w * 0.48, -4 * s, 10 * s, 6 * s);
        ctx.fillRect(w * 0.35, -2 * s, 12 * s, 5 * s);
    }
}
