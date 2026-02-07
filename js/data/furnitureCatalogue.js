/**
 * FurnishView — Furniture Catalogue
 * 
 * Defines available furniture types with default dimensions, colours, and display info.
 * All dimensions are in meters.
 * 
 * @file js/data/furnitureCatalogue.js
 * @module data/furnitureCatalogue
 */

/**
 * Furniture type definitions
 * Each type includes: type ID, display label, default dimensions (meters), and default colour
 */
export const furnitureCatalogue = [
    {
        type: 'chair',
        label: 'Chair',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.85,
        defaultColour: '#5C4033',
        icon: 'chair'
    },
    {
        type: 'dining-table',
        label: 'Dining Table',
        defaultWidth: 1.6,
        defaultDepth: 0.9,
        defaultHeight: 0.75,
        defaultColour: '#5C4033',
        icon: 'table'
    },
    {
        type: 'side-table',
        label: 'Side Table',
        defaultWidth: 0.5,
        defaultDepth: 0.5,
        defaultHeight: 0.55,
        defaultColour: '#DEB887',
        icon: 'table-sm'
    },
    {
        type: 'sofa',
        label: 'Sofa',
        defaultWidth: 2.0,
        defaultDepth: 0.9,
        defaultHeight: 0.85,
        defaultColour: '#4A5568',
        icon: 'sofa'
    },
    {
        type: 'armchair',
        label: 'Armchair',
        defaultWidth: 0.9,
        defaultDepth: 0.85,
        defaultHeight: 0.9,
        defaultColour: '#4A5568',
        icon: 'armchair'
    },
    {
        type: 'coffee-table',
        label: 'Coffee Table',
        defaultWidth: 1.2,
        defaultDepth: 0.6,
        defaultHeight: 0.45,
        defaultColour: '#3D2B1F',
        icon: 'coffee-table'
    },
    {
        type: 'bookshelf',
        label: 'Bookshelf',
        defaultWidth: 0.8,
        defaultDepth: 0.3,
        defaultHeight: 1.8,
        defaultColour: '#5C4033',
        icon: 'bookshelf'
    },
    {
        type: 'desk',
        label: 'Desk',
        defaultWidth: 1.4,
        defaultDepth: 0.7,
        defaultHeight: 0.75,
        defaultColour: '#DEB887',
        icon: 'desk'
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

export default furnitureCatalogue;
