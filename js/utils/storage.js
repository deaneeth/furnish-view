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

import { Design } from '../models/Design.js';
import { STORAGE_KEYS } from './constants.js';

/**
 * Maximum storage size warning threshold (4MB)
 * @type {number}
 */
const STORAGE_WARNING_THRESHOLD = 4 * 1024 * 1024;

/**
 * Maximum designs per user (for performance)
 * @type {number}
 */
const MAX_DESIGNS_PER_USER = 50;

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed value or fallback
 * @private
 */
function safeJSONParse(jsonString, fallback) {
    if (typeof jsonString !== 'string' || jsonString.length === 0) {
        return fallback;
    }
    try {
        return JSON.parse(jsonString);
    } catch {
        return fallback;
    }
}

/**
 * Safe localStorage getItem with error handling
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null
 * @private
 */
function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Safe localStorage setItem with error handling
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {boolean} True if successful
 * @private
 */
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        // Storage quota exceeded or access denied
        return false;
    }
}

/**
 * Safe localStorage removeItem with error handling
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 * @private
 */
function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate username format (alphanumeric, 3-50 chars)
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 * @private
 */
function isValidUsername(username) {
    if (typeof username !== 'string') return false;
    const trimmed = username.trim();
    return trimmed.length >= 3 && trimmed.length <= 50 && /^[a-zA-Z0-9_]+$/.test(trimmed);
}

/**
 * Validate password format (minimum 6 chars)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 * @private
 */
function isValidPassword(password) {
    if (typeof password !== 'string') return false;
    return password.length >= 6 && password.length <= 100;
}

/**
 * Check estimated storage usage
 * @returns {number} Approximate bytes used
 */
function getStorageUsage() {
    try {
        let total = 0;
        for (const key in localStorage) {
            if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
            }
        }
        return total;
    } catch {
        return 0;
    }
}

/**
 * Check if storage is near capacity
 * @returns {boolean} True if near capacity
 */
function isStorageNearCapacity() {
    return getStorageUsage() > STORAGE_WARNING_THRESHOLD;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Initialize storage with default data
 * Creates default users if none exist
 * @returns {boolean} True if initialization successful
 */
function initializeStorage() {
    try {
        const existingUsers = safeGetItem(STORAGE_KEYS.users);
        if (!existingUsers) {
            const defaultUsers = [
                { username: 'designer1', password: 'password123' },
                { username: 'designer2', password: 'password456' }
            ];
            safeSetItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
        }
        
        const existingDesigns = safeGetItem(STORAGE_KEYS.designs);
        if (!existingDesigns) {
            safeSetItem(STORAGE_KEYS.designs, JSON.stringify([]));
        }
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Get all users from storage
 * @returns {Array<{username: string, password: string}>} Array of user objects
 */
function getUsers() {
    const data = safeGetItem(STORAGE_KEYS.users);
    return safeJSONParse(data, []);
}

/**
 * Validate login credentials
 * @param {string} username - Username to validate
 * @param {string} password - Password to validate
 * @returns {boolean} True if credentials are valid
 */
function validateLogin(username, password) {
    if (!isValidUsername(username) || !isValidPassword(password)) {
        return false;
    }
    
    const users = getUsers();
    const trimmedUsername = username.trim().toLowerCase();
    
    return users.some(user => 
        user.username.toLowerCase() === trimmedUsername && 
        user.password === password
    );
}

/**
 * Get the original username (with correct casing) for a validated user
 * @param {string} username - Username to look up
 * @returns {string|null} Original username or null
 */
function getOriginalUsername(username) {
    if (!isValidUsername(username)) return null;
    
    const users = getUsers();
    const trimmedUsername = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === trimmedUsername);
    
    return user ? user.username : null;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Set the current session
 * @param {string} username - Username to store in session
 * @returns {boolean} True if successful
 */
function setSession(username) {
    if (!isValidUsername(username)) {
        return false;
    }
    return safeSetItem(STORAGE_KEYS.session, username.trim());
}

/**
 * Get the current session username
 * @returns {string|null} Current username or null
 */
function getSession() {
    const session = safeGetItem(STORAGE_KEYS.session);
    return session && session.length > 0 ? session : null;
}

/**
 * Clear the current session (logout)
 * @returns {boolean} True if successful
 */
function clearSession() {
    return safeRemoveItem(STORAGE_KEYS.session);
}

/**
 * Check if user is currently logged in
 * @returns {boolean} True if session exists
 */
function isLoggedIn() {
    return getSession() !== null;
}

// ============================================================================
// DESIGN MANAGEMENT
// ============================================================================

/**
 * Get all raw design data from storage
 * @returns {Array<Object>} Array of design JSON objects
 * @private
 */
function getRawDesigns() {
    const data = safeGetItem(STORAGE_KEYS.designs);
    return safeJSONParse(data, []);
}

/**
 * Save raw designs array to storage
 * @param {Array<Object>} designs - Array of design JSON objects
 * @returns {boolean} True if successful
 * @private
 */
function saveRawDesigns(designs) {
    if (!Array.isArray(designs)) return false;
    return safeSetItem(STORAGE_KEYS.designs, JSON.stringify(designs));
}

/**
 * Save a design to storage
 * Creates new design or updates existing design with same ID
 * @param {Design|Object} design - Design model instance or plain object
 * @returns {boolean} True if save successful
 */
function saveDesign(design) {
    if (!design || typeof design !== 'object') {
        return false;
    }
    
    // Serialize design to JSON object
    const designJSON = typeof design.toJSON === 'function' 
        ? design.toJSON() 
        : design;
    
    if (!designJSON.id || !designJSON.designerName) {
        return false;
    }
    
    const designs = getRawDesigns();
    const existingIndex = designs.findIndex(d => d.id === designJSON.id);
    
    if (existingIndex !== -1) {
        // Update existing design
        designs[existingIndex] = designJSON;
    } else {
        // Check user design limit
        const userDesigns = designs.filter(d => d.designerName === designJSON.designerName);
        if (userDesigns.length >= MAX_DESIGNS_PER_USER) {
            return false;
        }
        // Add new design
        designs.push(designJSON);
    }
    
    return saveRawDesigns(designs);
}

/**
 * Load a design by ID
 * @param {string} id - Design ID to load
 * @returns {Design|null} Design instance or null if not found
 */
function loadDesign(id) {
    if (typeof id !== 'string' || id.length === 0) {
        return null;
    }
    
    const designs = getRawDesigns();
    const designData = designs.find(d => d.id === id);
    
    if (!designData) {
        return null;
    }
    
    try {
        return Design.fromJSON(designData);
    } catch {
        return null;
    }
}

/**
 * Get all designs for a specific designer
 * @param {string} designerName - Designer's username
 * @returns {Array<Design>} Array of Design instances
 */
function getAllDesigns(designerName) {
    if (typeof designerName !== 'string' || designerName.length === 0) {
        return [];
    }
    
    const designs = getRawDesigns();
    const userDesigns = designs.filter(d => d.designerName === designerName);
    
    // Sort by createdAt descending (newest first)
    userDesigns.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });
    
    return userDesigns.map(data => {
        try {
            return Design.fromJSON(data);
        } catch {
            return null;
        }
    }).filter(design => design !== null);
}

/**
 * Delete a design by ID
 * @param {string} id - Design ID to delete
 * @returns {boolean} True if design was found and deleted
 */
function deleteDesign(id) {
    if (typeof id !== 'string' || id.length === 0) {
        return false;
    }
    
    const designs = getRawDesigns();
    const initialLength = designs.length;
    const filtered = designs.filter(d => d.id !== id);
    
    if (filtered.length === initialLength) {
        // Design not found
        return false;
    }
    
    return saveRawDesigns(filtered);
}

/**
 * Export a design as formatted JSON string for download
 * @param {string} id - Design ID to export
 * @returns {string|null} Formatted JSON string or null if not found
 */
function exportDesignJSON(id) {
    if (typeof id !== 'string' || id.length === 0) {
        return null;
    }
    
    const designs = getRawDesigns();
    const designData = designs.find(d => d.id === id);
    
    if (!designData) {
        return null;
    }
    
    // Return formatted JSON with 2-space indentation
    return JSON.stringify(designData, null, 2);
}

/**
 * Import a design from JSON string
 * @param {string} jsonString - JSON string to import
 * @param {string} designerName - Designer name to assign (for ownership)
 * @returns {Design|null} Imported Design instance or null on failure
 */
function importDesignJSON(jsonString, designerName) {
    if (typeof jsonString !== 'string' || typeof designerName !== 'string') {
        return null;
    }
    
    try {
        const data = JSON.parse(jsonString);
        
        // Create new design from imported data, assigning new ID and owner
        const design = new Design({
            ...data,
            id: null, // Generate new ID
            designerName: designerName,
            createdAt: new Date().toISOString()
        });
        
        if (saveDesign(design)) {
            return design;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Count designs for a specific designer
 * @param {string} designerName - Designer's username
 * @returns {number} Number of designs
 */
function countDesigns(designerName) {
    if (typeof designerName !== 'string') return 0;
    const designs = getRawDesigns();
    return designs.filter(d => d.designerName === designerName).length;
}

/**
 * Clear all designs for a specific designer (use with caution)
 * @param {string} designerName - Designer's username
 * @returns {boolean} True if successful
 */
function clearUserDesigns(designerName) {
    if (typeof designerName !== 'string') return false;
    const designs = getRawDesigns();
    const filtered = designs.filter(d => d.designerName !== designerName);
    return saveRawDesigns(filtered);
}

/**
 * Load pre-built sample designs for a user.
 *
 * Fetches demo-designs.json, stamps each design with the given
 * designerName and a fresh unique ID, then saves to storage.
 *
 * @param {string} designerName - Username to assign ownership
 * @returns {Promise<number>} Number of designs loaded (0 on failure)
 */
async function loadSampleData(designerName) {
    if (typeof designerName !== 'string' || designerName.length === 0) {
        return 0;
    }

    try {
        const response = await fetch('./assets/sample-data/demo-designs.json');
        if (!response.ok) return 0;

        const samples = await response.json();
        if (!Array.isArray(samples)) return 0;

        let loaded = 0;
        for (const sample of samples) {
            const design = new Design({
                ...sample,
                id: null,            // generate fresh ID
                designerName,
                createdAt: new Date().toISOString()
            });

            if (saveDesign(design.toJSON())) {
                loaded++;
            }
        }

        return loaded;
    } catch {
        return 0;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // User management
    initializeStorage,
    getUsers,
    validateLogin,
    getOriginalUsername,
    
    // Session management
    setSession,
    getSession,
    clearSession,
    isLoggedIn,
    
    // Design management
    saveDesign,
    loadDesign,
    getAllDesigns,
    deleteDesign,
    exportDesignJSON,
    importDesignJSON,
    countDesigns,
    clearUserDesigns,

    // Sample data
    loadSampleData,
    
    // Storage info
    getStorageUsage,
    isStorageNearCapacity,
    
    // Constants (re-exported for convenience)
    MAX_DESIGNS_PER_USER
};
