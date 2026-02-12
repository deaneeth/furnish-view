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
     * Calculate WCAG relative luminance from a hex colour
     * Uses sRGB linearisation: channel values are gamma-decoded before weighting.
     * Returns 0 (pure black) to 1 (pure white).
     * 
     * @param {string} hex - Hex colour string (e.g., '#E8E0D4')
     * @returns {number} Relative luminance between 0 and 1
     * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
     */
    getLuminance(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;
        
        // Linearise each sRGB channel
        const [rLin, gLin, bLin] = [rgb.r, rgb.g, rgb.b].map(c => {
            const srgb = c / 255;
            return srgb <= 0.04045
                ? srgb / 12.92
                : Math.pow((srgb + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    },
    
    /**
     * Calculate WCAG contrast ratio between two hex colours
     * WCAG AA requires 4.5:1 for normal text, 3:1 for large text.
     * 
     * @param {string} hex1 - First hex colour
     * @param {string} hex2 - Second hex colour
     * @returns {number} Contrast ratio (1:1 minimum, 21:1 maximum)
     */
    getContrastRatio(hex1, hex2) {
        const l1 = this.getLuminance(hex1);
        const l2 = this.getLuminance(hex2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    },
    
    /**
     * Check if a colour is too extreme for use as a room surface colour
     * Too dark walls make furniture invisible; too light floors make labels unreadable.
     * 
     * @param {string} hex - Hex colour to evaluate
     * @returns {{ tooLight: boolean, tooDark: boolean, warning: string }} Assessment result
     */
    isColourTooExtreme(hex) {
        const luminance = this.getLuminance(hex);
        const result = { tooLight: false, tooDark: false, warning: '' };
        
        if (luminance < 0.08) {
            result.tooDark = true;
            result.warning = 'Very dark colour may reduce furniture visibility in 3D view';
        } else if (luminance > 0.95) {
            result.tooLight = true;
            result.warning = 'Very light colour may reduce label readability';
        }
        
        return result;
    },
    
    /**
     * Suggest a safer colour by clamping luminance to a usable range
     * Lightens too-dark colours to minimum luminance 0.15,
     * darkens too-light colours to maximum luminance 0.90.
     * 
     * @param {string} hex - Original hex colour
     * @param {string} [target='wall'] - Surface target ('wall' or 'floor')
     * @returns {string} Adjusted hex colour with safer luminance
     */
    suggestBetterColour(hex, target = 'wall') {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const luminance = this.getLuminance(hex);
        const minLuminance = 0.15;
        const maxLuminance = 0.90;
        
        if (luminance >= minLuminance && luminance <= maxLuminance) {
            return hex; // Already within safe range
        }
        
        // Scale factor to shift luminance into safe range
        // For dark colours: lighten proportionally
        // For light colours: darken proportionally
        if (luminance < minLuminance) {
            // Lighten: blend towards white until target luminance reached
            const targetLum = minLuminance;
            // Binary search for an appropriate blend factor (accurate to 1% steps)
            let lo = 0;
            let hi = 1;
            for (let i = 0; i < 20; i++) {
                const mid = (lo + hi) / 2;
                const r = Math.round(rgb.r + (255 - rgb.r) * mid);
                const g = Math.round(rgb.g + (255 - rgb.g) * mid);
                const b = Math.round(rgb.b + (255 - rgb.b) * mid);
                const newLum = this.getLuminance(this.rgbToHex(r, g, b));
                if (newLum < targetLum) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            const factor = (lo + hi) / 2;
            return this.rgbToHex(
                Math.round(rgb.r + (255 - rgb.r) * factor),
                Math.round(rgb.g + (255 - rgb.g) * factor),
                Math.round(rgb.b + (255 - rgb.b) * factor)
            );
        }
        
        // Darken: blend towards black until target luminance reached
        const targetLum = maxLuminance;
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 20; i++) {
            const mid = (lo + hi) / 2;
            const r = Math.round(rgb.r * (1 - mid));
            const g = Math.round(rgb.g * (1 - mid));
            const b = Math.round(rgb.b * (1 - mid));
            const newLum = this.getLuminance(this.rgbToHex(r, g, b));
            if (newLum > targetLum) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        const factor = (lo + hi) / 2;
        return this.rgbToHex(
            Math.round(rgb.r * (1 - factor)),
            Math.round(rgb.g * (1 - factor)),
            Math.round(rgb.b * (1 - factor))
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
