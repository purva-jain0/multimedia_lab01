/* ==========================================================================
   Jungle Dash: Lost Temple - Collectible Gold Coins & Sparkle Particles
   MCA Multimedia Systems Lab - Animation, Particle Systems & Audio Triggers
   ========================================================================== */

import { CAMERA, LANE_VALUES, LANE_WIDTH_WORLD, SCORING } from './constants.js';

export class CoinManager {
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

        // 1. Move active coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.z -= moveDelta;

            // Prune coins that passed camera
            if (coin.z < CAMERA.DEPTH_MIN) {
                this.coins.splice(i, 1);
            }
        }

        // 2. Procedural Coin Line Spawning
        this.nextSpawnZ -= moveDelta;
        if (this.nextSpawnZ <= CAMERA.DEPTH_MAX - 100) {
            this.spawnCoinPattern();
        }

        // 3. Update Sparkle Particles
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

        // 4. Update Floating Score Popups (+10)
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
        const isArc = Math.random() < 0.35; // Jump arc pattern
        const count = Math.floor(Math.random() * 4) + 4; // 4 to 7 coins
        const spacing = 45;

        for (let i = 0; i < count; i++) {
            const z = spawnZ + i * spacing;
            let elevation = 22; // Base floating height

            if (isArc) {
                // Parabolic jump arc curve
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

            // Z overlap check
            const zDist = Math.abs(coin.z - pz);
            if (zDist > 30) continue;

            // X overlap check
            const xDist = Math.abs(coin.worldX - px);
            if (xDist > 40) continue;

            // Y elevation overlap check
            // Coin can be collected if player is within reaching height
            const yDist = Math.abs(coin.worldY - (py + 30));
            if (yDist > 55) continue;

            // Mark collected & trigger effects
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
                color: Math.random() < 0.6 ? '#ffd700' : '#fff3b0',
                alpha: 1.0,
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
            alpha: 1.0
        });
    }

    /**
     * Renders all coins, shadows, sparkles, and score popups.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {import('./camera.js').Camera} camera 
     */
    render(ctx, camera) {
        // Sort from furthest to nearest
        const sortedCoins = [...this.coins].sort((a, b) => b.z - a.z);

        // 1. Render Coins
        for (const coin of sortedCoins) {
            // Apply vertical bobbing
            const bobbing = Math.sin(this.animTime + coin.z * 0.05) * SCORING.COIN_FLOAT_AMPLITUDE;
            const currentY = coin.worldY + bobbing;

            // Project ground shadow
            const groundProj = camera.project(coin.worldX, 0, coin.z);
            if (groundProj.visible) {
                this.renderCoinShadow(ctx, groundProj.screenX, groundProj.screenY, groundProj.scale);
            }

            // Project floating coin
            const coinProj = camera.project(coin.worldX, currentY, coin.z);
            if (!coinProj.visible) continue;

            this.renderCoinBody(ctx, coinProj.screenX, coinProj.screenY, coinProj.scale, coin.z);
        }

        // 2. Render Sparkle Particles
        this.renderSparkles(ctx, camera);

        // 3. Render Floating Scores
        this.renderFloatingScores(ctx, camera);
    }

    renderCoinShadow(ctx, sx, sy, scale) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = 'rgba(15, 12, 8, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * scale * 1.8, 5 * scale * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderCoinBody(ctx, sx, sy, scale, z) {
        ctx.save();
        ctx.translate(sx, sy);

        // 3D spinning rotation illusion: horizontal scale fluctuates with cosine
        const spinPhase = this.animTime * 2.5 + z * 0.08;
        const spinScaleX = Math.cos(spinPhase);
        const radius = 16 * scale * 1.8;

        ctx.scale(Math.max(0.12, Math.abs(spinScaleX)), 1);

        // Outer Golden Coin Rim
        const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        rimGrad.addColorStop(0, '#ffe066');
        rimGrad.addColorStop(0.5, '#f48c06');
        rimGrad.addColorStop(1, '#9d0208');
        ctx.fillStyle = rimGrad;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Embossed Temple Face
        ctx.fillStyle = '#ffba08';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        ctx.fill();

        // Aztec / Lost Temple Diamond Inscription
        ctx.fillStyle = '#d00000';
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.45);
        ctx.lineTo(radius * 0.45, 0);
        ctx.lineTo(0, radius * 0.45);
        ctx.lineTo(-radius * 0.45, 0);
        ctx.closePath();
        ctx.fill();

        // Glistening white specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
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
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'center';
            ctx.fillText(fs.text, sx, sy);
            ctx.restore();
        }
    }
}
