/**
 * FurnishView — Design Model
 * 
 * Data model representing a complete room design with room specs, furniture, and metadata.
 * Combines Room and FurnitureItem models into a persistable design entity.
 * Pure data class with no DOM manipulation or rendering logic.
 * 
 * @file js/models/Design.js
 * @module models/Design
 */

import { Room } from './Room.js';
import { FurnitureItem } from './FurnitureItem.js';

/**
 * Maximum allowed furniture items per design (for performance and security)
 * @type {number}
 */
const MAX_FURNITURE_ITEMS = 100;

/**
 * Maximum string length for design name and designer name
 * @type {number}
 */
const MAX_NAME_LENGTH = 100;

/**
 * Generate a unique ID for designs using timestamp and random string
 * @returns {string} Unique identifier in format 'design_timestamp_randomstring'
 */
function generateDesignId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `design_${timestamp}_${random}`;
}

/**
 * Validate and sanitize a string with maximum length
 * @param {string} value - String to validate
 * @param {string} fallback - Fallback value if invalid
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Validated and trimmed string
 */
function validateString(value, fallback, maxLength = MAX_NAME_LENGTH) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return fallback;
    }
    return value.trim().substring(0, maxLength);
}

/**
 * Validate ISO date string
 * @param {string} dateString - Date string to validate
 * @returns {string} Valid ISO date string or current date
 */
function validateDateString(dateString) {
    if (typeof dateString === 'string') {
        const date = new Date(dateString);
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return new Date().toISOString();
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
     * @param {string} options.name - Design name (max 100 characters)
     * @param {string} options.designerName - Name of the designer who created this
     * @param {string} [options.createdAt] - ISO date string (auto-generated if not provided)
     * @param {string} [options.updatedAt] - ISO date string of last update
     * @param {Room|Object} options.room - Room instance or room data
     * @param {Array<FurnitureItem|Object>} [options.furniture] - Array of furniture items
     */
    constructor({
        id = null,
        name = 'Untitled Design',
        designerName = '',
        createdAt = null,
        updatedAt = null,
        room = {},
        furniture = []
    } = {}) {
        // Validate and set ID
        this.id = (typeof id === 'string' && id.length > 0) 
            ? validateString(id, generateDesignId(), 100) 
            : generateDesignId();
        
        // Validate name and designer name with length limits
        this.name = validateString(name, 'Untitled Design', MAX_NAME_LENGTH);
        this.designerName = validateString(designerName, '', MAX_NAME_LENGTH);
        
        // Validate dates
        this.createdAt = validateDateString(createdAt);
        this.updatedAt = updatedAt ? validateDateString(updatedAt) : this.createdAt;
        
        // Ensure room is a Room instance (with validation)
        try {
            this.room = room instanceof Room ? room : new Room(room);
        } catch (error) {
            // If room validation fails, create with defaults
            this.room = new Room();
        }
        
        // Ensure furniture items are FurnitureItem instances
        // Limit array size for security/performance
        const safeItems = Array.isArray(furniture) 
            ? furniture.slice(0, MAX_FURNITURE_ITEMS) 
            : [];
        
        this.furniture = safeItems.map(item => {
            try {
                return item instanceof FurnitureItem ? item : new FurnitureItem(item);
            } catch (error) {
                // Skip invalid items
                return null;
            }
        }).filter(item => item !== null);
    }
    
    /**
     * Update design name with validation
     * @param {string} name - New design name
     */
    setName(name) {
        this.name = validateString(name, this.name, MAX_NAME_LENGTH);
        this.markUpdated();
    }
    
    /**
     * Mark the design as updated (sets updatedAt to now)
     */
    markUpdated() {
        this.updatedAt = new Date().toISOString();
    }
    
    /**
     * Add a furniture item to the design
     * @param {FurnitureItem|Object} item - Furniture item to add
     * @returns {boolean} True if added successfully, false if limit reached
     */
    addFurniture(item) {
        if (this.furniture.length >= MAX_FURNITURE_ITEMS) {
            return false;
        }
        
        const furnitureItem = item instanceof FurnitureItem 
            ? item 
            : new FurnitureItem(item);
        
        this.furniture.push(furnitureItem);
        this.markUpdated();
        return true;
    }
    
    /**
     * Remove a furniture item by ID
     * @param {string} id - ID of furniture to remove
     * @returns {boolean} True if item was found and removed
     */
    removeFurniture(id) {
        if (typeof id !== 'string') {
            return false;
        }
        
        const index = this.furniture.findIndex(item => item.id === id);
        if (index !== -1) {
            this.furniture.splice(index, 1);
            this.markUpdated();
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
        if (typeof id !== 'string') {
            return null;
        }
        return this.furniture.find(item => item.id === id) || null;
    }
    
    /**
     * Update a furniture item by ID
     * @param {string} id - ID of furniture to update
     * @param {Object} updates - Properties to update
     * @returns {boolean} True if item was found and updated
     */
    updateFurniture(id, updates) {
        const item = this.getFurnitureById(id);
        if (!item) {
            return false;
        }
        
        // Apply updates with validation
        if (updates.x !== undefined) item.setPosition(updates.x, item.y);
        if (updates.y !== undefined) item.setPosition(item.x, updates.y);
        if (updates.rotation !== undefined) item.setRotation(updates.rotation);
        if (updates.colour !== undefined) item.setColour(updates.colour);
        
        this.markUpdated();
        return true;
    }
    
    /**
     * Clear all furniture from the design
     */
    clearFurniture() {
        this.furniture = [];
        this.markUpdated();
    }
    
    /**
     * Get the total number of furniture items
     * @returns {number} Count of furniture items
     */
    getFurnitureCount() {
        return this.furniture.length;
    }
    
    /**
     * Check if design has any furniture
     * @returns {boolean} True if design has furniture items
     */
    hasFurniture() {
        return this.furniture.length > 0;
    }
    
    /**
     * Get furniture items grouped by type
     * @returns {Object} Object with type keys and arrays of items
     */
    getFurnitureByType() {
        const grouped = {};
        for (const item of this.furniture) {
            if (!grouped[item.type]) {
                grouped[item.type] = [];
            }
            grouped[item.type].push(item);
        }
        return grouped;
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
            updatedAt: this.updatedAt,
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
        if (!data || typeof data !== 'object') {
            return new Design();
        }
        
        return new Design({
            id: data.id,
            name: data.name,
            designerName: data.designerName,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            room: data.room ? Room.fromJSON(data.room) : {},
            furniture: Array.isArray(data.furniture) 
                ? data.furniture.map(item => FurnitureItem.fromJSON(item))
                : []
        });
    }
}

export { Design, generateDesignId, MAX_FURNITURE_ITEMS };
export default Design;
