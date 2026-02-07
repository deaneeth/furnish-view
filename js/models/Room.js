/**
 * FurnishView — Room Model
 * 
 * Data model representing a room with dimensions, shape, and colour scheme.
 * Pure data class with no DOM manipulation or rendering logic.
 * 
 * @file js/models/Room.js
 * @module models/Room
 */

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
     */
    constructor({
        width = 5,
        depth = 4,
        height = 2.8,
        shape = 'rectangular',
        wallColour = '#E8E0D4',
        floorColour = '#8B7355'
    } = {}) {
        // TODO: Add validation
        this.width = width;
        this.depth = depth;
        this.height = height;
        this.shape = shape;
        this.wallColour = wallColour;
        this.floorColour = floorColour;
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
     */
    static fromJSON(data) {
        return new Room(data);
    }
}

export { Room };
export default Room;
