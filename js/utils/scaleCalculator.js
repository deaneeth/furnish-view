/**
 * FurnishView — Scale Calculator
 * 
 * Utility functions for converting between real-world dimensions and canvas/3D coordinates.
 * 
 * Coordinate systems:
 * - World: Real-world meters (room dimensions, furniture sizes)
 * - Canvas: Pixel coordinates on the 2D HTML5 Canvas
 * - Three: Three.js world units (room center = 0,0,0, y-axis is up)
 * 
 * @file js/utils/scaleCalculator.js
 * @module utils/scaleCalculator
 */

/**
 * Padding from canvas edges in pixels
 */
const PADDING = 40;

/**
 * Calculate the scale factor for a room to fit in canvas
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {number} Scale factor (pixels per meter)
 */
function getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight) {
    const availableWidth = canvasWidth - (PADDING * 2);
    const availableHeight = canvasHeight - (PADDING * 2);
    
    const scaleX = availableWidth / roomWidth;
    const scaleY = availableHeight / roomDepth;
    
    // Use the smaller scale to ensure room fits
    return Math.min(scaleX, scaleY);
}

/**
 * Convert world coordinates to canvas coordinates
 * @param {number} worldX - X position in meters
 * @param {number} worldY - Y position in meters
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {Object} Canvas coordinates { x, y }
 */
function worldToCanvas(worldX, worldY, roomWidth, roomDepth, canvasWidth, canvasHeight) {
    const scale = getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight);
    
    // Centre the room in the canvas
    const offsetX = (canvasWidth - (roomWidth * scale)) / 2;
    const offsetY = (canvasHeight - (roomDepth * scale)) / 2;
    
    return {
        x: offsetX + (worldX * scale),
        y: offsetY + (worldY * scale)
    };
}

/**
 * Convert canvas coordinates to world coordinates
 * @param {number} canvasX - X position in pixels
 * @param {number} canvasY - Y position in pixels
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {Object} World coordinates { x, y }
 */
function canvasToWorld(canvasX, canvasY, roomWidth, roomDepth, canvasWidth, canvasHeight) {
    const scale = getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight);
    
    const offsetX = (canvasWidth - (roomWidth * scale)) / 2;
    const offsetY = (canvasHeight - (roomDepth * scale)) / 2;
    
    return {
        x: (canvasX - offsetX) / scale,
        y: (canvasY - offsetY) / scale
    };
}

/**
 * Convert world coordinates to Three.js coordinates
 * In Three.js: x = width, y = height (up), z = depth
 * Room centre is at origin (0, 0, 0)
 * @param {number} worldX - X position in meters
 * @param {number} worldY - Y position in meters (depth in 2D)
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @returns {Object} Three.js coordinates { x, y, z }
 */
function worldToThree(worldX, worldY, roomWidth, roomDepth) {
    return {
        x: worldX - (roomWidth / 2),
        y: 0, // Ground level, actual height set separately
        z: worldY - (roomDepth / 2)
    };
}

/**
 * Scale a dimension from world units to canvas pixels
 * @param {number} worldSize - Size in meters
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {number} Size in pixels
 */
function scaleToCanvas(worldSize, roomWidth, roomDepth, canvasWidth, canvasHeight) {
    const scale = getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight);
    return worldSize * scale;
}

export {
    PADDING,
    getScaleFactor,
    worldToCanvas,
    canvasToWorld,
    worldToThree,
    scaleToCanvas
};
