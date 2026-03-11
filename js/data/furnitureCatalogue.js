/**
 * FurnishView — Furniture Catalogue
 *
 * Defines available furniture types with default dimensions, colours, display info,
 * pricing, categories, and descriptions for the catalogue browser.
 * All dimensions are in meters. Prices are in USD ($).
 *
 * @file js/data/furnitureCatalogue.js
 * @module data/furnitureCatalogue
 */

/**
 * Furniture type definitions
 * Each type includes: type ID, display label, default dimensions (meters),
 * default colour, icon key, price, category, and description
 */
export const furnitureCatalogue = [
    {
        type: 'chair',
        label: 'Chair',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.85,
        defaultColour: '#5C4033',
        icon: 'chair',
        price: 149,
        category: 'dining',
        description: 'Classic wooden dining chair with contoured backrest and sturdy frame.'
    },
    {
        type: 'dining-table',
        label: 'Dining Table',
        defaultWidth: 1.6,
        defaultDepth: 0.9,
        defaultHeight: 0.75,
        defaultColour: '#5C4033',
        icon: 'table',
        price: 599,
        category: 'dining',
        description: 'Spacious solid-wood dining table seating up to six guests.'
    },
    {
        type: 'side-table',
        label: 'Side Table',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.55,
        defaultColour: '#DEB887',
        icon: 'table-sm',
        price: 129,
        category: 'living',
        description: 'Compact side table in light wood, ideal for lamps and decorative accents.'
    },
    {
        type: 'sofa',
        label: 'Sofa',
        defaultWidth: 2.0,
        defaultDepth: 0.9,
        defaultHeight: 0.85,
        defaultColour: '#4A5568',
        icon: 'sofa',
        price: 899,
        category: 'living',
        description: 'Three-seat upholstered sofa with deep cushions and premium fabric finish.'
    },
    {
        type: 'armchair',
        label: 'Armchair',
        defaultWidth: 0.9,
        defaultDepth: 0.85,
        defaultHeight: 0.9,
        defaultColour: '#4A5568',
        icon: 'armchair',
        price: 449,
        category: 'living',
        description: 'Plush single-seat armchair with padded armrests and lumbar support.'
    },
    {
        type: 'coffee-table',
        label: 'Coffee Table',
        defaultWidth: 1.2,
        defaultDepth: 0.6,
        defaultHeight: 0.45,
        defaultColour: '#3D2B1F',
        icon: 'coffee-table',
        price: 349,
        category: 'living',
        description: 'Low-profile dark wood coffee table with clean modern lines.'
    },
    {
        type: 'bookshelf',
        label: 'Bookshelf',
        defaultWidth: 0.8,
        defaultDepth: 0.3,
        defaultHeight: 1.8,
        defaultColour: '#5C4033',
        icon: 'bookshelf',
        price: 279,
        category: 'office',
        description: 'Tall five-shelf bookcase in warm walnut, perfect for storage and display.'
    },
    {
        type: 'desk',
        label: 'Desk',
        defaultWidth: 1.4,
        defaultDepth: 0.7,
        defaultHeight: 0.75,
        defaultColour: '#DEB887',
        icon: 'desk',
        price: 399,
        category: 'office',
        description: 'Spacious writing desk with cable management and drawer storage.'
    },
    {
        type: 'tv-stand',
        label: 'TV Stand',
        defaultWidth: 1.5,
        defaultDepth: 0.45,
        defaultHeight: 0.55,
        defaultColour: '#3C3C3C',
        icon: 'tv-stand',
        price: 329,
        category: 'living',
        description: 'Contemporary media console with open shelving and cable routing.'
    },
    {
        type: 'bed',
        label: 'Bed',
        defaultWidth: 1.6,
        defaultDepth: 2.0,
        defaultHeight: 0.5,
        defaultColour: '#E8DCC8',
        icon: 'bed',
        price: 749,
        category: 'bedroom',
        description: 'King-size platform bed with slatted headboard and solid wood frame.'
    },
    {
        type: 'wardrobe',
        label: 'Wardrobe',
        defaultWidth: 1.8,
        defaultDepth: 0.6,
        defaultHeight: 2.0,
        defaultColour: '#D2B48C',
        icon: 'wardrobe',
        price: 699,
        category: 'bedroom',
        description: 'Double-door wardrobe with hanging rail, shelves, and soft-close hinges.'
    },
    {
        type: 'rug',
        label: 'Rug',
        defaultWidth: 2.0,
        defaultDepth: 1.5,
        defaultHeight: 0.02,
        defaultColour: '#8B4513',
        icon: 'rug',
        price: 199,
        category: 'general',
        description: 'Hand-woven area rug in rich tones, adding warmth to any room.'
    }
];

/**
 * Get furniture definition by type
 * @param {string} type - Furniture type ID
 * @returns {Object|null} Furniture definition or null
 */
export function getFurnitureByType(type) {
    return furnitureCatalogue.find(f => f.type === type) || null;
}

/**
 * Get all furniture types
 * @returns {Array} Array of furniture type IDs
 */
export function getAllFurnitureTypes() {
    return furnitureCatalogue.map(f => f.type);
}

/**
 * Get furniture items filtered by category
 * @param {string} category - Category ID ('living', 'bedroom', 'dining', 'office', 'general')
 * @returns {Array} Filtered furniture items (all items if category is 'all' or invalid)
 */
export function getFurnitureByCategory(category) {
    if (!category || category === 'all') return [...furnitureCatalogue];
    return furnitureCatalogue.filter(f => f.category === category);
}

export default furnitureCatalogue;
