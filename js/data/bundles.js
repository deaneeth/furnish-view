/**
 * FurnishView — Room Bundles Data
 *
 * Pre-defined furniture bundles that group items for common room setups.
 *
 * @file js/data/bundles.js
 * @module data/bundles
 */

export const BUNDLES = [
    {
        id: 'living-starter',
        name: 'Living Room Starter',
        description: 'Sofa, coffee table and rug — everything to complete your lounge.',
        items: ['sofa', 'coffee-table', 'rug'],
        image: 'sofa', // icon type for SVG
        tag: 'Most Popular',
        tagColour: '#0071e3'
    },
    {
        id: 'dining-set',
        name: 'Dining Set',
        description: 'Dining table and four matching chairs for the perfect dinner setting.',
        items: ['dining-table', 'chair', 'chair', 'chair', 'chair'],
        image: 'table',
        tag: 'Great Value',
        tagColour: '#34c759'
    },
    {
        id: 'bedroom-essentials',
        name: 'Bedroom Essentials',
        description: 'Bed, wardrobe and side table — a complete bedroom in one bundle.',
        items: ['bed', 'wardrobe', 'side-table'],
        image: 'bed',
        tag: 'Save 10%',
        tagColour: '#ff9f0a'
    },
    {
        id: 'home-office',
        name: 'Home Office',
        description: 'Desk, bookshelf and ergonomic desk chair for a productive work-from-home setup.',
        items: ['desk', 'bookshelf', 'desk-chair'],
        image: 'desk',
        tag: 'Work From Home',
        tagColour: '#5856d6'
    }
];

/**
 * Calculate the total price of a bundle from the catalogue.
 * @param {Object} bundle - A bundle object from BUNDLES
 * @param {Array} catalogue - The furnitureCatalogue array
 * @returns {number} Total price
 */
export function getBundlePrice(bundle, catalogue) {
    return bundle.items.reduce((total, type) => {
        const item = catalogue.find(c => c.type === type);
        return total + (item ? item.price : 0);
    }, 0);
}
