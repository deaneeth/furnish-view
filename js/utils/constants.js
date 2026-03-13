/**
 * FurnishView — Application Constants
 * 
 * App-wide constants including default colours, dimensions, and configuration.
 * 
 * @file js/utils/constants.js
 * @module utils/constants
 */

/**
 * Application version
 */
export const APP_VERSION = '1.0.0';

/**
 * Default room colours
 */
export const DEFAULT_WALL_COLOUR = '#E8E0D4';
export const DEFAULT_FLOOR_COLOUR = '#8B7355';

/**
 * Canvas dimensions (pixels)
 */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

/**
 * Room dimension limits (meters)
 */
export const MIN_ROOM_DIM = 1;
export const MAX_ROOM_DIM = 20;
export const MIN_ROOM_HEIGHT = 2;
export const MAX_ROOM_HEIGHT = 5;

/**
 * Room shapes
 */
export const ROOM_SHAPES = {
    RECTANGULAR: 'rectangular',
    SQUARE: 'square',
    L_SHAPED: 'l-shaped'
};

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
    users: 'furnishview_users',
    designs: 'furnishview_designs',
    session: 'furnishview_session',
    cart: 'furnishview_cart',
    orders: 'furnishview_orders',
    wishlist: 'furnishview_wishlist',
    inventory: 'furnishview_inventory',
    promotions: 'furnishview_promotions'
};

/**
 * Default furniture colours
 */
export const FURNITURE_COLOURS = {
    wood: '#5C4033',
    lightWood: '#DEB887',
    darkWood: '#3D2B1F',
    fabric: '#4A5568',
    metal: '#718096'
};

/**
 * Toast notification durations (ms)
 */
export const TOAST_DURATION = {
    short: 2000,
    default: 3000,
    long: 5000
};

/**
 * Z-index layers
 */
export const Z_INDEX = {
    dropdown: 100,
    sticky: 200,
    modalBackdrop: 300,
    modal: 400,
    toast: 500
};

/**
 * 3D scene configuration
 */
export const THREE_CONFIG = {
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 0.8,
    cameraFov: 60,
    cameraNear: 0.1,
    cameraFar: 1000
};

/**
 * Keyboard shortcuts
 */
export const KEYBOARD = {
    DELETE: 'Delete',
    BACKSPACE: 'Backspace',
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    SAVE: 's' // With Ctrl/Cmd
};
