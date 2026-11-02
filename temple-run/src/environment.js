/* ==========================================================================
   Jungle Dash: Lost Temple - Environment, Parallax & Stone Track Renderer
   MCA Multimedia Systems Lab - Graphics, Parallax Layers & Pseudo-3D Track
   ========================================================================== */

import { CAMERA, LANE_WIDTH_WORLD } from './constants.js';

export class Environment {
    constructor() {
        this.scrollDistance = 0;
        this.roadSegmentLength = 80;
        this.numSegments = 24; // Road depth slices from horizon to foreground
        this.pillarSpacing = 240; // World Z distance between side pillars

        // Atmospheric floating pollen / fireflies
        this.particles = [];
        this.initParticles(35);

        // Torch flame animation phase
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

        // Update floating jungle fireflies/pollen
        for (const p of this.particles) {
            p.z -= forwardDistance * 0.35 + p.speedZ * dt;
            p.osc += dt * 3;
            p.x += Math.sin(p.osc) * 0.4;

            // Recycle to horizon if passed camera
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

        // 1. Sky & Ancient Temple Atmosphere
        this.renderSkyAndCanopy(ctx, w, h, hy);

        // 2. Distant Temple Pyramids & Parallax Ruins
        this.renderDistantRuins(ctx, w, hy);

        // 3. Ground Jungle Floor (surrounding the track)
        this.renderJungleGround(ctx, w, h, hy);

        // 4. Three-Lane Ancient Stone Track
        this.renderStoneTrack(ctx, camera);

        // 5. Track Edge Pillars & Flaming Torches
        this.renderEdgePillars(ctx, camera);

        // 6. Floating Jungle Fireflies / Pollen
        this.renderPollenParticles(ctx, camera);

        // 7. Atmospheric Jungle Mist / Vignette
        this.renderAtmosphereVignette(ctx, w, h, hy);
    }

    renderSkyAndCanopy(ctx, w, h, hy) {
        // Dramatic jungle twilight sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, hy);
        skyGrad.addColorStop(0, '#102219');    // Deep canopy emerald
        skyGrad.addColorStop(0.5, '#2b3f27');  // Jungle moss green
        skyGrad.addColorStop(0.85, '#73572d'); // Golden temple haze
        skyGrad.addColorStop(1, '#b5833c');    // Amber horizon glow

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, hy + 4);

        // Distant warm sun rays through canopy
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffea9f';
        const numRays = 7;
        const cx = w * 0.5;
        for (let i = 0; i < numRays; i++) {
            const angle = -0.6 + (i / numRays) * 1.2;
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
        // Ancient Aztec/Mayan style stepped temple pyramid silhouette in center
        ctx.fillStyle = '#1c281e';
        const cx = w * 0.5;

        // Central Temple Pyramid
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

        // Altar top
        ctx.fillStyle = '#2d3b2b';
        ctx.fillRect(cx - 20, hy - 84, 40, 14);

        // Side mountains and canopy silhouettes
        ctx.fillStyle = '#182419';
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
        // Deep foliage ground on sides of road
        const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
        groundGrad.addColorStop(0, '#1c2e1f');
        groundGrad.addColorStop(0.4, '#152517');
        groundGrad.addColorStop(1, '#0c180e');

        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, hy, w, h - hy);
    }

    renderStoneTrack(ctx, camera) {
        const totalRoadWidth = LANE_WIDTH_WORLD * 3.4; // 3 lanes + shoulders
        const segmentOffset = this.scrollDistance % this.roadSegmentLength;

        // Render road segments from farthest (horizon) to nearest (foreground)
        for (let i = this.numSegments - 1; i >= 0; i--) {
            const zNear = i * this.roadSegmentLength - segmentOffset + PLAYER_CONFIG_WORLD_Z_OFFSET;
            const zFar = zNear + this.roadSegmentLength;

            if (zFar > CAMERA.DEPTH_MAX || zNear < CAMERA.DEPTH_MIN) continue;

            const segNear = camera.getRoadSegmentAtZ(zNear, totalRoadWidth);
            const segFar = camera.getRoadSegmentAtZ(zFar, totalRoadWidth);

            if (!segNear.visible && !segFar.visible) continue;

            // Alternating stone slab color shades
            const isAlt = Math.floor((this.scrollDistance + zNear) / this.roadSegmentLength) % 2 === 0;

            // Main stone pathway trapezoid
            ctx.fillStyle = isAlt ? '#4d463b' : '#3f382f';
            ctx.beginPath();
            ctx.moveTo(segFar.leftX, segFar.y);
            ctx.lineTo(segFar.rightX, segFar.y);
            ctx.lineTo(segNear.rightX, segNear.y);
            ctx.lineTo(segNear.leftX, segNear.y);
            ctx.closePath();
            ctx.fill();

            // Mossy stone borders / curbstones
            const borderWNear = (segNear.rightX - segNear.leftX) * 0.06;
            const borderWFar = (segFar.rightX - segFar.leftX) * 0.06;

            // Left Border
            ctx.fillStyle = '#2c3526';
            ctx.beginPath();
            ctx.moveTo(segFar.leftX, segFar.y);
            ctx.lineTo(segFar.leftX + borderWFar, segFar.y);
            ctx.lineTo(segNear.leftX + borderWNear, segNear.y);
            ctx.lineTo(segNear.leftX, segNear.y);
            ctx.closePath();
            ctx.fill();

            // Right Border
            ctx.beginPath();
            ctx.moveTo(segFar.rightX - borderWFar, segFar.y);
            ctx.lineTo(segFar.rightX, segFar.y);
            ctx.lineTo(segNear.rightX, segNear.y);
            ctx.lineTo(segNear.rightX - borderWNear, segNear.y);
            ctx.closePath();
            ctx.fill();

            // Lane Divider Grooves (Carved ancient inlays)
            this.renderLaneDividers(ctx, camera, zNear, zFar, isAlt);
        }
    }

    renderLaneDividers(ctx, camera, zNear, zFar, isAlt) {
        const laneOffsets = [-LANE_WIDTH_WORLD * 0.5, LANE_WIDTH_WORLD * 0.5];
        ctx.strokeStyle = isAlt ? 'rgba(212, 175, 55, 0.45)' : 'rgba(120, 110, 90, 0.25)';
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
        // Compute base pillar index from scrollDistance
        const firstPillarIndex = Math.floor(this.scrollDistance / this.pillarSpacing);
        const maxPillars = Math.ceil(CAMERA.DEPTH_MAX / this.pillarSpacing) + 1;

        // Render from furthest to nearest
        for (let i = maxPillars; i >= 0; i--) {
            const pillarIndex = firstPillarIndex + i;
            const worldZ = pillarIndex * this.pillarSpacing - this.scrollDistance + PLAYER_CONFIG_WORLD_Z_OFFSET;

            if (worldZ < CAMERA.DEPTH_MIN || worldZ > CAMERA.DEPTH_MAX) continue;

            const roadSideX = LANE_WIDTH_WORLD * 1.85;

            // Left pillar & torch
            this.drawTemplePillar(ctx, camera, -roadSideX, worldZ, -1);

            // Right pillar & torch
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

        // Stone pillar column
        const pillarGrad = ctx.createLinearGradient(-pw * 0.5, 0, pw * 0.5, 0);
        pillarGrad.addColorStop(0, '#2d271f');
        pillarGrad.addColorStop(0.4, '#544b3c');
        pillarGrad.addColorStop(1, '#231e17');

        ctx.fillStyle = pillarGrad;
        ctx.fillRect(-pw * 0.5, -ph, pw, ph);

        // Capital/Base carvings
        ctx.fillStyle = '#6e624e';
        ctx.fillRect(-pw * 0.65, -ph, pw * 1.3, 12 * s);
        ctx.fillRect(-pw * 0.65, -8 * s, pw * 1.3, 8 * s);

        // Ancient Carved Idol Face / Runes on Pillar
        ctx.fillStyle = '#1c1712';
        ctx.fillRect(-pw * 0.3, -ph * 0.7, pw * 0.6, ph * 0.2);
        ctx.fillStyle = '#bfa15f';
        ctx.fillRect(-pw * 0.15, -ph * 0.65, pw * 0.3, 3 * s);

        // Torch Brazier atop pillar
        const torchY = -ph - 6 * s;
        ctx.fillStyle = '#221e1a';
        ctx.beginPath();
        ctx.moveTo(-pw * 0.5, torchY);
        ctx.lineTo(pw * 0.5, torchY);
        ctx.lineTo(pw * 0.3, torchY + 8 * s);
        ctx.lineTo(-pw * 0.3, torchY + 8 * s);
        ctx.closePath();
        ctx.fill();

        // Flickering Torch Fire
        const flicker = Math.sin(this.flameTime + worldZ) * 3 * s;
        const flameH = (22 + flicker) * s;
        const flameW = (12 + flicker * 0.5) * s;

        // Fire Outer Glow
        const fireGrad = ctx.createRadialGradient(0, torchY - flameH * 0.5, 2 * s, 0, torchY - flameH * 0.5, 25 * s);
        fireGrad.addColorStop(0, 'rgba(255, 210, 70, 0.95)');
        fireGrad.addColorStop(0.4, 'rgba(255, 110, 20, 0.7)');
        fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(0, torchY - flameH * 0.5, 24 * s, 0, Math.PI * 2);
        ctx.fill();

        // Core flame tongue
        ctx.fillStyle = '#fff4a3';
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
        // Horizon fog band (softens depth transition)
        const fogGrad = ctx.createLinearGradient(0, hy - 15, 0, hy + 25);
        fogGrad.addColorStop(0, 'rgba(181, 131, 60, 0)');
        fogGrad.addColorStop(0.5, 'rgba(181, 131, 60, 0.4)');
        fogGrad.addColorStop(1, 'rgba(30, 45, 30, 0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, hy - 15, w, 40);

        // Screen vignette edges
        const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.75);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(10, 18, 12, 0.45)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
    }
}

const PLAYER_CONFIG_WORLD_Z_OFFSET = 30;
