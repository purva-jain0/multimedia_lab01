/* ==========================================================================
   Jungle Dash: Lost Temple - Player Character & Animation State Machine
   MCA Multimedia Systems Lab - Procedural Animation, Kinematics & Rendering
   ========================================================================== */

import { LANES, LANE_WIDTH_WORLD, PLAYER_CONFIG } from './constants.js';

export const PLAYER_STATES = {
    RUNNING: 'RUNNING',
    JUMPING: 'JUMPING',
    SLIDING: 'SLIDING',
    CRASHED: 'CRASHED'
};

export class Player {
    constructor() {
        // Lane positioning
        this.currentLane = LANES.CENTER;
        this.targetX = 0;
        this.worldX = 0;
        this.worldY = 0; // Elevation above ground
        this.worldZ = PLAYER_CONFIG.WORLD_Z; // Fixed camera-relative distance

        // Dynamics
        this.state = PLAYER_STATES.RUNNING;
        this.verticalVelocity = 0;
        this.slideTimer = 0;
        this.tiltAngle = 0; // Visual bank/tilt angle when changing lanes
        this.animTime = 0; // Animation cycle accumulator

        // Dimensions for collision
        this.width = PLAYER_CONFIG.WIDTH;
        this.height = PLAYER_CONFIG.NORMAL_HEIGHT;

        // Running dust particles
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

            // Spawn launch dust puff
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

        // If sliding while in mid-air, rapidly ground the character
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

        // 1. Smooth Lane Interpolation (exponential smoothing)
        const diffX = this.targetX - this.worldX;
        const lerpFactor = Math.min(1, dt * PLAYER_CONFIG.LANE_CHANGE_SPEED);
        this.worldX += diffX * lerpFactor;

        // Compute dynamic banking/tilt angle proportional to lane velocity
        const laneVelocity = diffX * PLAYER_CONFIG.LANE_CHANGE_SPEED;
        const targetTilt = (laneVelocity / LANE_WIDTH_WORLD) * 0.22;
        this.tiltAngle += (targetTilt - this.tiltAngle) * Math.min(1, dt * 14);

        // Snap if very close
        if (Math.abs(this.targetX - this.worldX) < 0.5) {
            this.worldX = this.targetX;
        }

        // 2. State & Vertical Kinematics
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
                    this.spawnDust(6, 12); // Landing dust
                }
            }
        }

        // 3. Sliding Timer Management
        if (this.state === PLAYER_STATES.SLIDING) {
            this.slideTimer -= dt;
            // Spawn continuous slide friction dust
            if (Math.random() < 0.6) {
                this.spawnDust(1, 10);
            }

            if (this.slideTimer <= 0) {
                this.slideTimer = 0;
                this.state = PLAYER_STATES.RUNNING;
                this.height = PLAYER_CONFIG.NORMAL_HEIGHT;
            }
        }

        // 4. Update Dust Particles
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

        // 5. Running Footstep Dust Puffs
        if (this.state === PLAYER_STATES.RUNNING && this.worldY === 0) {
            // Footstrike rhythm
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
        // Project base position (feet at ground level)
        const groundProj = camera.project(this.worldX, 0, this.worldZ);
        if (!groundProj.visible) return;

        // Project elevated position (taking jump into account)
        const charProj = camera.project(this.worldX, this.worldY, this.worldZ);

        ctx.save();

        // 1. Render Ground Shadow
        this.renderShadow(ctx, groundProj.screenX, groundProj.screenY, groundProj.scale);

        // 2. Render Dust Particles
        this.renderDust(ctx, camera);

        // 3. Render Procedural Character
        this.renderCharacterBody(ctx, charProj.screenX, charProj.screenY, charProj.scale);

        ctx.restore();
    }

    /**
     * Renders perspective drop shadow on the stone pathway.
     */
    renderShadow(ctx, screenX, screenY, scale) {
        // Jump height reduces shadow opacity and size
        const heightRatio = Math.min(1, this.worldY / PLAYER_CONFIG.MAX_JUMP_HEIGHT);
        const shadowScale = scale * (1 - heightRatio * 0.45);
        const shadowAlpha = (0.55 - heightRatio * 0.35);

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

        // Apply banking tilt angle
        ctx.rotate(this.tiltAngle);

        const runCycle = Math.sin(this.animTime * 12);
        const runCycleCos = Math.cos(this.animTime * 12);

        if (this.state === PLAYER_STATES.SLIDING) {
            // SLIDING POSE: Low, legs forward/tucked, leaning back
            ctx.translate(0, 16);

            // Shadow/glow under body
            ctx.fillStyle = '#654321';

            // Sliding legs (extended forward)
            ctx.fillStyle = '#3a271d'; // Boots
            ctx.beginPath();
            ctx.roundRect(-10, -8, 28, 10, 4);
            ctx.fill();

            // Khaki pants
            ctx.fillStyle = '#9e8156';
            ctx.beginPath();
            ctx.roundRect(-18, -14, 24, 12, 5);
            ctx.fill();

            // Brown explorer vest/jacket
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.roundRect(-22, -26, 22, 16, 4);
            ctx.fill();

            // Head & Fedora tilted
            ctx.fillStyle = '#d4a373'; // Skin
            ctx.beginPath();
            ctx.arc(-16, -34, 9, 0, Math.PI * 2);
            ctx.fill();

            // Fedora hat
            ctx.fillStyle = '#4a3525';
            ctx.beginPath();
            ctx.ellipse(-16, -37, 14, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(-22, -45, 12, 8, [4, 4, 0, 0]);
            ctx.fill();

            // Red scarf blowing back
            ctx.fillStyle = '#d93829';
            ctx.beginPath();
            ctx.moveTo(-20, -30);
            ctx.lineTo(-38 + Math.sin(this.animTime * 20) * 4, -34);
            ctx.lineTo(-24, -26);
            ctx.fill();

        } else if (this.state === PLAYER_STATES.CRASHED) {
            // CRASH POSE: Knocked back & rotating
            ctx.rotate(0.6);
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.roundRect(-14, -40, 28, 30, 6);
            ctx.fill();

            // Head
            ctx.fillStyle = '#d4a373';
            ctx.beginPath();
            ctx.arc(0, -50, 10, 0, Math.PI * 2);
            ctx.fill();

            // Flying hat
            ctx.fillStyle = '#4a3525';
            ctx.beginPath();
            ctx.ellipse(12, -65, 15, 5, 0.4, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.state === PLAYER_STATES.JUMPING) {
            // JUMP POSE: Arms spread, knees bent upward
            // Feet / Boots
            ctx.fillStyle = '#3a271d';
            ctx.beginPath();
            ctx.roundRect(-14, -14, 9, 11, 3);
            ctx.roundRect(5, -14, 9, 11, 3);
            ctx.fill();

            // Pants (bent knees)
            ctx.fillStyle = '#9e8156';
            ctx.beginPath();
            ctx.roundRect(-15, -28, 10, 16, 4);
            ctx.roundRect(5, -28, 10, 16, 4);
            ctx.fill();

            // Explorer Safari Jacket
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.roundRect(-15, -50, 30, 24, 6);
            ctx.fill();

            // Leather Belt with golden buckle
            ctx.fillStyle = '#2d1b0d';
            ctx.fillRect(-15, -30, 30, 4);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-4, -31, 8, 6);

            // Arms raised out
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.roundRect(-24, -48, 8, 18, 3);
            ctx.roundRect(16, -48, 8, 18, 3);
            ctx.fill();

            // Head & Fedora
            ctx.fillStyle = '#d4a373';
            ctx.beginPath();
            ctx.arc(0, -60, 10, 0, Math.PI * 2);
            ctx.fill();

            // Fedora
            ctx.fillStyle = '#4a3525';
            ctx.beginPath();
            ctx.ellipse(0, -66, 17, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(-9, -76, 18, 11, [5, 5, 1, 1]);
            ctx.fill();
            // Hat band
            ctx.fillStyle = '#2a1a10';
            ctx.fillRect(-9, -68, 18, 3);

            // Red adventurer scarf
            ctx.fillStyle = '#d93829';
            ctx.beginPath();
            ctx.moveTo(0, -54);
            ctx.quadraticCurveTo(-14, -48, -26, -56);
            ctx.lineTo(-24, -50);
            ctx.closePath();
            ctx.fill();

        } else {
            // NORMAL RUNNING CYCLE POSE
            const legSwingLeft = runCycle * 14;
            const legSwingRight = -runCycle * 14;
            const armSwingLeft = -runCycle * 12;
            const armSwingRight = runCycle * 12;
            const torsoBob = Math.abs(runCycleCos) * 3;

            ctx.translate(0, -torsoBob);

            // Left Leg (Behind / swinging)
            ctx.fillStyle = '#8f744d';
            ctx.beginPath();
            ctx.roundRect(-13, -24 + legSwingLeft * 0.3, 8, 18, 3);
            ctx.fill();
            // Left Boot
            ctx.fillStyle = '#3a271d';
            ctx.beginPath();
            ctx.roundRect(-14, -8 + legSwingLeft * 0.5, 10, 8, 2);
            ctx.fill();

            // Right Leg
            ctx.fillStyle = '#9e8156';
            ctx.beginPath();
            ctx.roundRect(5, -24 + legSwingRight * 0.3, 8, 18, 3);
            ctx.fill();
            // Right Boot
            ctx.fillStyle = '#3a271d';
            ctx.beginPath();
            ctx.roundRect(4, -8 + legSwingRight * 0.5, 10, 8, 2);
            ctx.fill();

            // Explorer Vest & Torso
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.roundRect(-14, -48, 28, 26, 5);
            ctx.fill();

            // Explorer backpack strap & collar details
            ctx.fillStyle = '#4e3016';
            ctx.fillRect(-10, -48, 4, 24);
            ctx.fillRect(6, -48, 4, 24);

            // Golden Belt buckle
            ctx.fillStyle = '#2d1b0d';
            ctx.fillRect(-14, -26, 28, 4);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-3, -27, 6, 6);

            // Left Arm
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.roundRect(-20, -45 + armSwingLeft * 0.4, 6, 18, 3);
            ctx.fill();

            // Right Arm
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.roundRect(14, -45 + armSwingRight * 0.4, 6, 18, 3);
            ctx.fill();

            // Head (Explorer adventurer face from behind)
            ctx.fillStyle = '#d4a373';
            ctx.beginPath();
            ctx.arc(0, -56, 9, 0, Math.PI * 2);
            ctx.fill();

            // Fedora Hat (Classic adventurer brim & crown)
            ctx.fillStyle = '#4a3525';
            ctx.beginPath();
            ctx.ellipse(0, -62, 16, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(-8, -72, 16, 11, [5, 5, 1, 1]);
            ctx.fill();
            // Hat band
            ctx.fillStyle = '#22150b';
            ctx.fillRect(-8, -64, 16, 3);

            // Flying red scarf waving behind character
            const wave = Math.sin(this.animTime * 16) * 6;
            ctx.fillStyle = '#d93829';
            ctx.beginPath();
            ctx.moveTo(-3, -50);
            ctx.quadraticCurveTo(-14, -46 + wave, -24, -50 + wave * 1.4);
            ctx.lineTo(-20, -44 + wave);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
