/**
 * FurnishView — Storage Utility
 * 
 * localStorage CRUD wrapper for designs and user data.
 * Handles serialization, error handling, and quota management.
 * 
 * Storage keys:
 * - furnishview_users: Array of user credentials
 * - furnishview_designs: Array of design objects
 * - furnishview_session: Current logged-in username
 * 
 * @file js/utils/storage.js
 * @module utils/storage
 */

// TODO: Import when implemented
// import { Design } from '../models/Design.js';
// import { STORAGE_KEYS } from './constants.js';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
    users: 'furnishview_users',
    designs: 'furnishview_designs',
    session: 'furnishview_session'
};

/**
 * Initialize storage with default data
 * Creates default users if none exist
 */
function initializeStorage() {
    try {
        const users = localStorage.getItem(STORAGE_KEYS.users);
        if (!users) {
            const defaultUsers = [
                { username: 'designer1', password: 'password123' },
                { username: 'designer2', password: 'password456' }
            ];
            localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
        }
        
        const designs = localStorage.getItem(STORAGE_KEYS.designs);
        if (!designs) {
            localStorage.setItem(STORAGE_KEYS.designs, JSON.stringify([]));
        }
    } catch (error) {
        console.error('[Storage] Initialization error:', error);
    }
}

/**
 * Get all users from storage
 * @returns {Array} Array of user objects
 */
function getUsers() {
    try {
        const users = localStorage.getItem(STORAGE_KEYS.users);
        return users ? JSON.parse(users) : [];
    } catch (error) {
        console.error('[Storage] Error reading users:', error);
        return [];
    }
}

/**
 * Validate login credentials
 * @param {string} username - Username to validate
 * @param {string} password - Password to validate
 * @returns {boolean} True if credentials are valid
 */
function validateLogin(username, password) {
    const users = getUsers();
    return users.some(u => u.username === username && u.password === password);
}

/**
 * Set the current session
 * @param {string} username - Username to store in session
 */
function setSession(username) {
    try {
        localStorage.setItem(STORAGE_KEYS.session, username);
    } catch (error) {
        console.error('[Storage] Error setting session:', error);
    }
}

/**
 * Get the current session username
 * @returns {string|null} Current username or null
 */
function getSession() {
    try {
        return localStorage.getItem(STORAGE_KEYS.session);
    } catch (error) {
        console.error('[Storage] Error reading session:', error);
        return null;
    }
}

/**
 * Clear the current session
 */
function clearSession() {
    try {
        localStorage.removeItem(STORAGE_KEYS.session);
    } catch (error) {
        console.error('[Storage] Error clearing session:', error);
    }
}

/**
 * Save a design to storage
 * @param {Object} design - Design object to save
 * @returns {boolean} Success status
 */
function saveDesign(design) {
    // TODO: Implement design save
    console.info('[Storage] Saving design:', design?.id);
    return false;
}

/**
 * Load a design by ID
 * @param {string} id - Design ID
 * @returns {Object|null} Design object or null
 */
function loadDesign(id) {
    // TODO: Implement design load
    console.info('[Storage] Loading design:', id);
    return null;
}

/**
 * Get all designs for a designer
 * @param {string} designerName - Designer's username
 * @returns {Array} Array of design objects
 */
function getAllDesigns(designerName) {
    // TODO: Implement design list
    console.info('[Storage] Getting designs for:', designerName);
    return [];
}

/**
 * Delete a design by ID
 * @param {string} id - Design ID to delete
 * @returns {boolean} Success status
 */
function deleteDesign(id) {
    // TODO: Implement design delete
    console.info('[Storage] Deleting design:', id);
    return false;
}

/**
 * Export a design as JSON string
 * @param {string} id - Design ID to export
 * @returns {string|null} JSON string or null
 */
function exportDesignJSON(id) {
    const design = loadDesign(id);
    return design ? JSON.stringify(design, null, 2) : null;
}

export {
    STORAGE_KEYS,
    initializeStorage,
    getUsers,
    validateLogin,
    setSession,
    getSession,
    clearSession,
    saveDesign,
    loadDesign,
    getAllDesigns,
    deleteDesign,
    exportDesignJSON
};
