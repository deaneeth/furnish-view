/**
 * FurnishView — Room Model
 * 
 * Data model representing a room with dimensions, shape, and colour scheme.
 * Pure data class with no DOM manipulation or rendering logic.
 * 
 * @file js/models/Room.js
 * @module models/Room
 */

import { 
    DEFAULT_WALL_COLOUR, 
    DEFAULT_FLOOR_COLOUR, 
    MIN_ROOM_DIM, 
    MAX_ROOM_DIM,
    MIN_ROOM_HEIGHT,
    MAX_ROOM_HEIGHT,
    ROOM_SHAPES 
} from '../utils/constants.js';

/**
 * Valid room shapes
 * @type {Set<string>}
 */
const VALID_SHAPES = new Set([ROOM_SHAPES.RECTANGULAR, ROOM_SHAPES.L_SHAPED]);

/**
 * Validate that a value is a positive number within range
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} name - Property name for error message
 * @returns {number} Validated number
 * @throws {RangeError} If value is out of range
 * @throws {TypeError} If value is not a number
 */
function validateDimension(value, min, max, name) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new TypeError(`${name} must be a number`);
    }
    if (value < min || value > max) {
        throw new RangeError(`${name} must be between ${min} and ${max} meters`);
    }
    return value;
}

/**
 * Validate hex colour format
 * @param {string} colour - Colour string to validate
 * @param {string} fallback - Fallback colour if invalid
 * @returns {string} Valid hex colour
 */
function validateHexColour(colour, fallback) {
    if (typeof colour !== 'string') {
        return fallback;
    }
    // Match 3 or 6 digit hex colours
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(colour) ? colour : fallback;
}

/**
 * Room data model
 * Represents a room's physical properties and colour scheme
 */
class Room {
    /**
     * Create a Room instance
     * @param {Object} options - Room configuration
     * @param {number} options.width - Room width in meters (1-20)
     * @param {number} options.depth - Room depth in meters (1-20)
     * @param {number} options.height - Room height in meters (2-5)
     * @param {string} options.shape - Room shape ('rectangular' or 'l-shaped')
     * @param {string} options.wallColour - Wall colour as hex string
     * @param {string} options.floorColour - Floor colour as hex string
     * @throws {RangeError} If dimensions are out of valid range
     * @throws {TypeError} If dimensions are not numbers
     */
    constructor({
        width = 5,
        depth = 4,
        height = 2.8,
        shape = ROOM_SHAPES.RECTANGULAR,
        wallColour = DEFAULT_WALL_COLOUR,
        floorColour = DEFAULT_FLOOR_COLOUR
    } = {}) {
        // Validate dimensions with proper bounds checking
        this.width = validateDimension(width, MIN_ROOM_DIM, MAX_ROOM_DIM, 'width');
        this.depth = validateDimension(depth, MIN_ROOM_DIM, MAX_ROOM_DIM, 'depth');
        this.height = validateDimension(height, MIN_ROOM_HEIGHT, MAX_ROOM_HEIGHT, 'height');
        
        // Validate shape
        this.shape = VALID_SHAPES.has(shape) ? shape : ROOM_SHAPES.RECTANGULAR;
        
        // Validate colours (with fallback to defaults)
        this.wallColour = validateHexColour(wallColour, DEFAULT_WALL_COLOUR);
        this.floorColour = validateHexColour(floorColour, DEFAULT_FLOOR_COLOUR);
    }
    
    /**
     * Update room dimensions with validation
     * @param {Object} updates - Properties to update
     * @param {number} [updates.width] - New width in meters
     * @param {number} [updates.depth] - New depth in meters
     * @param {number} [updates.height] - New height in meters
     * @throws {RangeError} If dimensions are out of valid range
     */
    updateDimensions({ width, depth, height }) {
        if (width !== undefined) {
            this.width = validateDimension(width, MIN_ROOM_DIM, MAX_ROOM_DIM, 'width');
        }
        if (depth !== undefined) {
            this.depth = validateDimension(depth, MIN_ROOM_DIM, MAX_ROOM_DIM, 'depth');
        }
        if (height !== undefined) {
            this.height = validateDimension(height, MIN_ROOM_HEIGHT, MAX_ROOM_HEIGHT, 'height');
        }
    }
    
    /**
     * Update wall colour with validation
     * @param {string} colour - New wall colour as hex string
     */
    setWallColour(colour) {
        this.wallColour = validateHexColour(colour, this.wallColour);
    }
    
    /**
     * Update floor colour with validation
     * @param {string} colour - New floor colour as hex string
     */
    setFloorColour(colour) {
        this.floorColour = validateHexColour(colour, this.floorColour);
    }
    
    /**
     * Get the floor area in square meters
     * @returns {number} Floor area (width * depth)
     */
    getFloorArea() {
        return this.width * this.depth;
    }
    
    /**
     * Get the room volume in cubic meters
     * @returns {number} Room volume (width * depth * height)
     */
    getVolume() {
        return this.width * this.depth * this.height;
    }
    
    /**
     * Serialize room to JSON-compatible object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            width: this.width,
            depth: this.depth,
            height: this.height,
            shape: this.shape,
            wallColour: this.wallColour,
            floorColour: this.floorColour
        };
    }
    
    /**
     * Create a Room instance from JSON data
     * @param {Object} data - Room data object
     * @returns {Room} New Room instance
     * @throws {RangeError} If dimensions are out of valid range
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            return new Room();
        }
        return new Room(data);
    }
}

export { Room, validateDimension, validateHexColour };
export default Room;
