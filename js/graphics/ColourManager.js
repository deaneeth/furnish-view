/**
 * FurnishView — Colour Manager
 * 
 * Handles colour application to room elements and furniture.
 * Coordinates colour changes between 2D and 3D views.
 * 
 * @file js/graphics/ColourManager.js
 * @module graphics/ColourManager
 */

/**
 * ColourManager
 * Manages colour operations for room and furniture elements
 */
const ColourManager = {
    /**
     * Convert hex colour to RGB object
     * @param {string} hex - Hex colour string (e.g., '#E8E0D4')
     * @returns {Object} RGB object { r, g, b }
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    /**
     * Convert RGB to hex string
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {string} Hex colour string
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },
    
    /**
     * Convert hex to Three.js compatible integer
     * @param {string} hex - Hex colour string
     * @returns {number} Integer colour value
     */
    hexToThreeColor(hex) {
        return parseInt(hex.replace('#', ''), 16);
    },
    
    /**
     * Get contrasting text colour (black or white) for a background
     * @param {string} bgHex - Background hex colour
     * @returns {string} '#000000' or '#FFFFFF'
     */
    getContrastColour(bgHex) {
        const rgb = this.hexToRgb(bgHex);
        if (!rgb) return '#000000';
        
        // Calculate relative luminance
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    },
    
    /**
     * Lighten a hex colour
     * @param {string} hex - Hex colour string
     * @param {number} amount - Amount to lighten (0-1)
     * @returns {string} Lightened hex colour
     */
    lighten(hex, amount) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        return this.rgbToHex(
            Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
            Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
            Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
        );
    },
    
    /**
     * Darken a hex colour
     * @param {string} hex - Hex colour string
     * @param {number} amount - Amount to darken (0-1)
     * @returns {string} Darkened hex colour
     */
    darken(hex, amount) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        return this.rgbToHex(
            Math.round(rgb.r * (1 - amount)),
            Math.round(rgb.g * (1 - amount)),
            Math.round(rgb.b * (1 - amount))
        );
    },
    
    /**
     * Apply colour to room wall or floor
     * Updates the Room model's wallColour or floorColour property
     * 
     * @param {Object} design - Design object containing room data
     * @param {string} target - Target surface: 'wall' or 'floor'
     * @param {string} colour - Hex colour string (e.g., '#E8E0D4')
     * @returns {boolean} True if colour was applied successfully
     */
    applyRoomColour(design, target, colour) {
        if (!design?.room || !colour) {
            return false;
        }
        
        // Validate target
        if (target !== 'wall' && target !== 'floor') {
            return false;
        }
        
        // Validate colour format
        if (!/^#[0-9A-Fa-f]{6}$/.test(colour)) {
            return false;
        }
        
        // Apply colour to appropriate property
        if (target === 'wall') {
            design.room.wallColour = colour;
        } else {
            design.room.floorColour = colour;
        }
        
        return true;
    },
    
    /**
     * Apply colour to a furniture item
     * Updates the FurnitureItem's colour property
     * 
     * @param {Object} item - Furniture item object
     * @param {string} colour - Hex colour string (e.g., '#5C4033')
     * @returns {boolean} True if colour was applied successfully
     */
    applyFurnitureColour(item, colour) {
        if (!item || !colour) {
            return false;
        }
        
        // Validate colour format
        if (!/^#[0-9A-Fa-f]{6}$/.test(colour)) {
            return false;
        }
        
        item.colour = colour;
        return true;
    }
};

export { ColourManager };
export default ColourManager;
