/**
 * FurnishView — FurnitureItem Model
 * 
 * Data model representing a furniture piece with type, position, size, colour, and rotation.
 * Pure data class with no DOM manipulation or rendering logic.
 * 
 * @file js/models/FurnitureItem.js
 * @module models/FurnitureItem
 */

/**
 * Generate a unique ID for furniture items
 * @returns {string} Unique identifier
 */
function generateId() {
    return `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * FurnitureItem data model
 * Represents a furniture piece placed in a room design
 */
class FurnitureItem {
    /**
     * Create a FurnitureItem instance
     * @param {Object} options - Furniture configuration
     * @param {string} [options.id] - Unique identifier (auto-generated if not provided)
     * @param {string} options.type - Furniture type from catalogue
     * @param {number} options.x - X position in room (meters)
     * @param {number} options.y - Y position in room (meters)
     * @param {number} options.width - Width in meters
     * @param {number} options.depth - Depth in meters
     * @param {number} options.height - Height in meters
     * @param {string} options.colour - Colour as hex string
     * @param {number} options.rotation - Rotation angle in degrees
     */
    constructor({
        id = null,
        type = 'chair',
        x = 0,
        y = 0,
        width = 0.5,
        depth = 0.5,
        height = 0.85,
        colour = '#5C4033',
        rotation = 0
    } = {}) {
        this.id = id || generateId();
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.depth = depth;
        this.height = height;
        this.colour = colour;
        this.rotation = rotation;
    }
    
    /**
     * Create a deep copy of this furniture item
     * @returns {FurnitureItem} Cloned instance
     */
    clone() {
        return new FurnitureItem({
            id: generateId(), // New ID for clone
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            depth: this.depth,
            height: this.height,
            colour: this.colour,
            rotation: this.rotation
        });
    }
    
    /**
     * Serialize furniture item to JSON-compatible object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            depth: this.depth,
            height: this.height,
            colour: this.colour,
            rotation: this.rotation
        };
    }
    
    /**
     * Create a FurnitureItem instance from JSON data
     * @param {Object} data - Furniture data object
     * @returns {FurnitureItem} New FurnitureItem instance
     */
    static fromJSON(data) {
        return new FurnitureItem(data);
    }
}

export { FurnitureItem, generateId };
export default FurnitureItem;
