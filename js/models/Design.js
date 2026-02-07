/**
 * FurnishView — Design Model
 * 
 * Data model representing a complete room design with room specs, furniture, and metadata.
 * Combines Room and FurnitureItem models into a persistable design entity.
 * 
 * @file js/models/Design.js
 * @module models/Design
 */

import { Room } from './Room.js';
import { FurnitureItem } from './FurnitureItem.js';

/**
 * Generate a unique ID for designs
 * @returns {string} Unique identifier
 */
function generateDesignId() {
    return `design_${Date.now()}`;
}

/**
 * Design data model
 * Represents a complete room design with all its components
 */
class Design {
    /**
     * Create a Design instance
     * @param {Object} options - Design configuration
     * @param {string} [options.id] - Unique identifier (auto-generated if not provided)
     * @param {string} options.name - Design name
     * @param {string} options.designerName - Name of the designer who created this
     * @param {string} [options.createdAt] - ISO date string (auto-generated if not provided)
     * @param {Room|Object} options.room - Room instance or room data
     * @param {Array<FurnitureItem|Object>} [options.furniture] - Array of furniture items
     */
    constructor({
        id = null,
        name = 'Untitled Design',
        designerName = '',
        createdAt = null,
        room = {},
        furniture = []
    } = {}) {
        this.id = id || generateDesignId();
        this.name = name;
        this.designerName = designerName;
        this.createdAt = createdAt || new Date().toISOString();
        
        // Ensure room is a Room instance
        this.room = room instanceof Room ? room : new Room(room);
        
        // Ensure furniture items are FurnitureItem instances
        this.furniture = furniture.map(item => 
            item instanceof FurnitureItem ? item : new FurnitureItem(item)
        );
    }
    
    /**
     * Add a furniture item to the design
     * @param {FurnitureItem} item - Furniture item to add
     */
    addFurniture(item) {
        this.furniture.push(item);
    }
    
    /**
     * Remove a furniture item by ID
     * @param {string} id - ID of furniture to remove
     * @returns {boolean} True if item was found and removed
     */
    removeFurniture(id) {
        const index = this.furniture.findIndex(item => item.id === id);
        if (index !== -1) {
            this.furniture.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Get a furniture item by ID
     * @param {string} id - ID of furniture to find
     * @returns {FurnitureItem|null} The furniture item or null
     */
    getFurnitureById(id) {
        return this.furniture.find(item => item.id === id) || null;
    }
    
    /**
     * Serialize design to JSON-compatible object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            designerName: this.designerName,
            createdAt: this.createdAt,
            room: this.room.toJSON(),
            furniture: this.furniture.map(item => item.toJSON())
        };
    }
    
    /**
     * Create a Design instance from JSON data
     * @param {Object} data - Design data object
     * @returns {Design} New Design instance
     */
    static fromJSON(data) {
        return new Design({
            ...data,
            room: Room.fromJSON(data.room),
            furniture: (data.furniture || []).map(item => FurnitureItem.fromJSON(item))
        });
    }
}

export { Design, generateDesignId };
export default Design;
