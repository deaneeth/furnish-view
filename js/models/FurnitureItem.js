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
 * Generate a unique ID for furniture items using timestamp and random string
 * @returns {string} Unique identifier in format 'f_timestamp_randomstring'
 */
function generateId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `f_${timestamp}_${random}`;
}

/**
 * Validate that a value is a finite number
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Valid number
 */
function validateNumber(value, defaultValue) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return defaultValue;
}

/**
 * Validate that a value is a non-negative number
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Valid non-negative number
 */
function validatePositiveNumber(value, defaultValue) {
    const num = validateNumber(value, defaultValue);
    return num >= 0 ? num : defaultValue;
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
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(colour) ? colour : fallback;
}

/**
 * Validate rotation angle and normalize to 0-360 range
 * @param {number} rotation - Rotation angle in degrees
 * @returns {number} Normalized rotation (0-360)
 */
function normalizeRotation(rotation) {
    const num = validateNumber(rotation, 0);
    // Normalize to 0-360 range
    return ((num % 360) + 360) % 360;
}

/**
 * Validate string with maximum length for security
 * @param {string} value - String to validate
 * @param {string} fallback - Fallback value if invalid
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Validated string
 */
function validateString(value, fallback, maxLength = 50) {
    if (typeof value !== 'string') {
        return fallback;
    }
    // Trim and limit length for security
    return value.trim().substring(0, maxLength);
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
     * @param {number} options.rotation - Rotation angle in degrees (0-360)
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
        rotation = 0,
        wall = null
    } = {}) {
        // Generate unique ID if not provided, or validate existing ID
        this.id = (typeof id === 'string' && id.length > 0) ? validateString(id, generateId(), 100) : generateId();
        
        // Validate type string
        this.type = validateString(type, 'chair', 50);
        
        // Validate position (can be any finite number)
        this.x = validateNumber(x, 0);
        this.y = validateNumber(y, 0);
        
        // Validate dimensions (must be positive)
        this.width = validatePositiveNumber(width, 0.5);
        this.depth = validatePositiveNumber(depth, 0.5);
        this.height = validatePositiveNumber(height, 0.85);
        
        // Validate colour
        this.colour = validateHexColour(colour, '#5C4033');
        
        // Normalize rotation to 0-360 range
        this.rotation = normalizeRotation(rotation);

        // Wall attachment ('top'|'right'|'bottom'|'left'|null)
        this.wall = (typeof wall === 'string' && ['top', 'right', 'bottom', 'left'].includes(wall)) ? wall : null;
    }
    
    /**
     * Update furniture position
     * @param {number} x - New X position in meters
     * @param {number} y - New Y position in meters
     */
    setPosition(x, y) {
        this.x = validateNumber(x, this.x);
        this.y = validateNumber(y, this.y);
    }
    
    /**
     * Update furniture rotation
     * @param {number} degrees - New rotation angle in degrees
     */
    setRotation(degrees) {
        this.rotation = normalizeRotation(degrees);
    }
    
    /**
     * Rotate furniture by a relative amount
     * @param {number} degrees - Degrees to rotate (positive = clockwise)
     */
    rotate(degrees) {
        this.rotation = normalizeRotation(this.rotation + degrees);
    }
    
    /**
     * Update furniture colour
     * @param {string} colour - New colour as hex string
     */
    setColour(colour) {
        this.colour = validateHexColour(colour, this.colour);
    }
    
    /**
     * Get the bounding box of the furniture item
     * @returns {Object} Bounding box { minX, minY, maxX, maxY }
     */
    getBoundingBox() {
        return {
            minX: this.x,
            minY: this.y,
            maxX: this.x + this.width,
            maxY: this.y + this.depth
        };
    }
    
    /**
     * Check if a point is inside this furniture item (for hit detection)
     * @param {number} pointX - X coordinate to check
     * @param {number} pointY - Y coordinate to check
     * @returns {boolean} True if point is inside furniture bounds
     */
    containsPoint(pointX, pointY) {
        const box = this.getBoundingBox();
        return pointX >= box.minX && pointX <= box.maxX &&
               pointY >= box.minY && pointY <= box.maxY;
    }
    
    /**
     * Create a deep copy of this furniture item with a new ID
     * @returns {FurnitureItem} Cloned instance with new unique ID
     */
    clone() {
        return new FurnitureItem({
            id: generateId(), // Always generate new ID for clone
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            depth: this.depth,
            height: this.height,
            colour: this.colour,
            rotation: this.rotation,
            wall: this.wall
        });
    }
    
    /**
     * Serialize furniture item to JSON-compatible object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        const json = {
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
        if (this.wall) json.wall = this.wall;
        return json;
    }
    
    /**
     * Create a FurnitureItem instance from JSON data
     * @param {Object} data - Furniture data object
     * @returns {FurnitureItem} New FurnitureItem instance
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            return new FurnitureItem();
        }
        return new FurnitureItem(data);
    }
}

export { FurnitureItem, generateId };
export default FurnitureItem;
