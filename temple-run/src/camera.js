/* ==========================================================================
   Jungle Dash: Lost Temple - Camera & Pseudo-3D Projection
   MCA Multimedia Systems Lab - Perspective Geometry & World-to-Screen Mapping
   ========================================================================== */

import { CAMERA, PLAYER_CONFIG } from './constants.js';

export class Camera {
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

        // Focal length adapted to screen height for consistent field of view
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
        // Objects behind camera or past max depth are clipped
        if (worldZ < CAMERA.DEPTH_MIN || worldZ > CAMERA.DEPTH_MAX) {
            return { screenX: 0, screenY: 0, scale: 0, visible: false };
        }

        // Perspective scale factor inversely proportional to distance z
        // Reference point: at player Z, scale is normalized to 1.0
        const playerZ = PLAYER_CONFIG.WORLD_Z;
        const scale = playerZ / (worldZ + 30);

        // Ground level Y position along the perspective road:
        // Distant objects (large Z) approach vanishingY; close objects approach bottomY.
        // We use an exponential/hyperbolic depth curve for natural perspective compression.
        const depthRatio = Math.max(0, Math.min(1, (worldZ - CAMERA.DEPTH_MIN) / (CAMERA.DEPTH_MAX - CAMERA.DEPTH_MIN)));
        const groundCurve = Math.pow(1 - depthRatio, 1.85);
        const groundScreenY = this.vanishingY + (this.bottomY - this.vanishingY) * groundCurve;

        // X projection radiates out from the vanishing point
        const screenX = this.vanishingX + worldX * scale * 1.8;

        // Y projection: ground level minus elevated worldY scaled by perspective
        const screenY = groundScreenY - (worldY * scale * 1.8);

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
}
