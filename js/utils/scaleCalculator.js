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

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

/**
 * Padding from canvas edges in pixels (on each side)
 * @type {number}
 */
const PADDING = 40;

/**
 * Minimum scale factor to prevent extreme zoom
 * @type {number}
 */
const MIN_SCALE = 10;

/**
 * Maximum scale factor to prevent extreme zoom
 * @type {number}
 */
const MAX_SCALE = 500;

/**
 * Validate that a value is a positive finite number
 * @param {number} value - Value to validate
 * @param {number} fallback - Fallback if invalid
 * @returns {number} Validated value
 * @private
 */
function validatePositive(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    return fallback;
}

/**
 * Validate that a value is a finite number (can be negative)
 * @param {number} value - Value to validate
 * @param {number} fallback - Fallback if invalid
 * @returns {number} Validated value
 * @private
 */
function validateNumber(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return fallback;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 * @private
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the scale factor for a room to fit in canvas
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {number} Scale factor (pixels per meter), clamped to safe range
 */
function getScaleFactor(roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    // Validate inputs with sensible defaults
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    const safeCanvasWidth = validatePositive(canvasWidth, CANVAS_WIDTH);
    const safeCanvasHeight = validatePositive(canvasHeight, CANVAS_HEIGHT);
    
    // Calculate available drawing area (excluding padding)
    const availableWidth = safeCanvasWidth - (PADDING * 2);
    const availableHeight = safeCanvasHeight - (PADDING * 2);
    
    // Calculate scale for each dimension
    const scaleX = availableWidth / safeRoomWidth;
    const scaleY = availableHeight / safeRoomDepth;
    
    // Use the smaller scale to ensure room fits entirely
    const scale = Math.min(scaleX, scaleY);
    
    // Clamp to prevent extreme values
    return clamp(scale, MIN_SCALE, MAX_SCALE);
}

/**
 * Get the offset to centre the room in the canvas
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {Object} Offset { x, y } in pixels
 */
function getCentreOffset(roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    const safeCanvasWidth = validatePositive(canvasWidth, CANVAS_WIDTH);
    const safeCanvasHeight = validatePositive(canvasHeight, CANVAS_HEIGHT);
    
    const scale = getScaleFactor(safeRoomWidth, safeRoomDepth, safeCanvasWidth, safeCanvasHeight);
    
    return {
        x: (safeCanvasWidth - (safeRoomWidth * scale)) / 2,
        y: (safeCanvasHeight - (safeRoomDepth * scale)) / 2
    };
}

/**
 * Convert world coordinates to canvas coordinates
 * @param {number} worldX - X position in meters (from room origin)
 * @param {number} worldY - Y position in meters (from room origin, depth direction)
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {Object} Canvas coordinates { x, y } in pixels
 */
function worldToCanvas(worldX, worldY, roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    const safeWorldX = validateNumber(worldX, 0);
    const safeWorldY = validateNumber(worldY, 0);
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    const safeCanvasWidth = validatePositive(canvasWidth, CANVAS_WIDTH);
    const safeCanvasHeight = validatePositive(canvasHeight, CANVAS_HEIGHT);
    
    const scale = getScaleFactor(safeRoomWidth, safeRoomDepth, safeCanvasWidth, safeCanvasHeight);
    const offset = getCentreOffset(safeRoomWidth, safeRoomDepth, safeCanvasWidth, safeCanvasHeight);
    
    return {
        x: offset.x + (safeWorldX * scale),
        y: offset.y + (safeWorldY * scale)
    };
}

/**
 * Convert canvas coordinates to world coordinates
 * @param {number} canvasX - X position in pixels
 * @param {number} canvasY - Y position in pixels
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {Object} World coordinates { x, y } in meters
 */
function canvasToWorld(canvasX, canvasY, roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    const safeCanvasX = validateNumber(canvasX, 0);
    const safeCanvasY = validateNumber(canvasY, 0);
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    const safeCanvasWidth = validatePositive(canvasWidth, CANVAS_WIDTH);
    const safeCanvasHeight = validatePositive(canvasHeight, CANVAS_HEIGHT);
    
    const scale = getScaleFactor(safeRoomWidth, safeRoomDepth, safeCanvasWidth, safeCanvasHeight);
    const offset = getCentreOffset(safeRoomWidth, safeRoomDepth, safeCanvasWidth, safeCanvasHeight);
    
    return {
        x: (safeCanvasX - offset.x) / scale,
        y: (safeCanvasY - offset.y) / scale
    };
}

/**
 * Convert world coordinates to Three.js coordinates
 * In Three.js: x = width direction, y = height (up), z = depth direction
 * Room centre is at origin (0, 0, 0)
 * @param {number} worldX - X position in meters (from room origin)
 * @param {number} worldY - Y position in meters (depth in 2D view)
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @returns {Object} Three.js coordinates { x, y, z }
 */
function worldToThree(worldX, worldY, roomWidth, roomDepth) {
    const safeWorldX = validateNumber(worldX, 0);
    const safeWorldY = validateNumber(worldY, 0);
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    
    return {
        x: safeWorldX - (safeRoomWidth / 2),
        y: 0, // Ground level; actual object height is set separately
        z: safeWorldY - (safeRoomDepth / 2)
    };
}

/**
 * Convert Three.js coordinates back to world coordinates
 * @param {number} threeX - Three.js X coordinate
 * @param {number} threeZ - Three.js Z coordinate (depth)
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @returns {Object} World coordinates { x, y }
 */
function threeToWorld(threeX, threeZ, roomWidth, roomDepth) {
    const safeThreeX = validateNumber(threeX, 0);
    const safeThreeZ = validateNumber(threeZ, 0);
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    
    return {
        x: safeThreeX + (safeRoomWidth / 2),
        y: safeThreeZ + (safeRoomDepth / 2)
    };
}

/**
 * Scale a dimension from world units to canvas pixels
 * @param {number} worldSize - Size in meters
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {number} Size in pixels
 */
function scaleToCanvas(worldSize, roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    const safeWorldSize = validatePositive(worldSize, 0);
    const scale = getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight);
    return safeWorldSize * scale;
}

/**
 * Scale a dimension from canvas pixels to world units
 * @param {number} canvasSize - Size in pixels
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @param {number} [canvasWidth=CANVAS_WIDTH] - Canvas width in pixels
 * @param {number} [canvasHeight=CANVAS_HEIGHT] - Canvas height in pixels
 * @returns {number} Size in meters
 */
function scaleToWorld(canvasSize, roomWidth, roomDepth, canvasWidth = CANVAS_WIDTH, canvasHeight = CANVAS_HEIGHT) {
    const safeCanvasSize = validatePositive(canvasSize, 0);
    const scale = getScaleFactor(roomWidth, roomDepth, canvasWidth, canvasHeight);
    return safeCanvasSize / scale;
}

/**
 * Check if a world coordinate is within room bounds
 * @param {number} worldX - X position in meters
 * @param {number} worldY - Y position in meters
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @returns {boolean} True if within bounds
 */
function isWithinRoom(worldX, worldY, roomWidth, roomDepth) {
    const safeWorldX = validateNumber(worldX, 0);
    const safeWorldY = validateNumber(worldY, 0);
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    
    return safeWorldX >= 0 && safeWorldX <= safeRoomWidth &&
           safeWorldY >= 0 && safeWorldY <= safeRoomDepth;
}

/**
 * Clamp world coordinates to room bounds
 * @param {number} worldX - X position in meters
 * @param {number} worldY - Y position in meters
 * @param {number} roomWidth - Room width in meters
 * @param {number} roomDepth - Room depth in meters
 * @returns {Object} Clamped coordinates { x, y }
 */
function clampToRoom(worldX, worldY, roomWidth, roomDepth) {
    const safeRoomWidth = validatePositive(roomWidth, 5);
    const safeRoomDepth = validatePositive(roomDepth, 4);
    
    return {
        x: clamp(validateNumber(worldX, 0), 0, safeRoomWidth),
        y: clamp(validateNumber(worldY, 0), 0, safeRoomDepth)
    };
}

export {
    // Constants
    PADDING,
    MIN_SCALE,
    MAX_SCALE,
    
    // Core conversion functions
    getScaleFactor,
    getCentreOffset,
    worldToCanvas,
    canvasToWorld,
    worldToThree,
    threeToWorld,
    
    // Dimension scaling
    scaleToCanvas,
    scaleToWorld,
    
    // Bounds checking
    isWithinRoom,
    clampToRoom
};
