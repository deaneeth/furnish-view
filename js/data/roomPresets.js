/**
 * FurnishView — Room Presets
 * 
 * Pre-built room templates for quick room setup (Innovation Feature 2).
 * Reduces designer input time during customer consultations.
 * 
 * @file js/data/roomPresets.js
 * @module data/roomPresets
 */

import { DEFAULT_WALL_COLOUR, DEFAULT_FLOOR_COLOUR } from '../utils/constants.js';

/**
 * Room preset templates
 * Each preset includes room dimensions, shape, and colour scheme
 */
export const roomPresets = [
    {
        id: 'studio',
        name: 'Studio Apartment',
        width: 4,
        depth: 3,
        height: 2.7,
        shape: 'rectangular',
        wallColour: '#F5F5F5',
        floorColour: '#B8956E'
    },
    {
        id: 'living-room',
        name: 'Living Room',
        width: 5,
        depth: 4,
        height: 2.8,
        shape: 'rectangular',
        wallColour: DEFAULT_WALL_COLOUR,
        floorColour: DEFAULT_FLOOR_COLOUR
    },
    {
        id: 'dining-room',
        name: 'Dining Room',
        width: 4,
        depth: 3.5,
        height: 2.8,
        shape: 'rectangular',
        wallColour: '#EDE8E3',
        floorColour: '#6B4423'
    },
    {
        id: 'bedroom',
        name: 'Bedroom',
        width: 4,
        depth: 3.5,
        height: 2.7,
        shape: 'rectangular',
        wallColour: '#E8EDF0',
        floorColour: '#A67C52'
    },
    {
        id: 'open-plan',
        name: 'Open Plan',
        width: 7,
        depth: 5,
        height: 3,
        shape: 'rectangular',
        wallColour: '#FAFAFA',
        floorColour: '#8B7355'
    }
];

/**
 * Get preset by ID
 * @param {string} id - Preset ID
 * @returns {Object|null} Preset object or null
 */
export function getRoomPresetById(id) {
    return roomPresets.find(p => p.id === id) || null;
}

/**
 * Get all preset names for dropdown display
 * @returns {Array} Array of { id, name } objects
 */
export function getRoomPresetOptions() {
    return roomPresets.map(p => ({ id: p.id, name: p.name }));
}

export default roomPresets;
