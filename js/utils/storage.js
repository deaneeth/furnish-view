/**
 * FurnishView — Storage Utility
 * 
 * localStorage CRUD wrapper for designs and user data.
 * Handles serialization, error handling, and quota management.
 * 
 * Storage keys:
 * - furnishview_users: Array of user objects {username, password, role, fullName, email, createdAt}
 * - furnishview_designs: Array of design objects
 * - furnishview_session: JSON string of current user {username, role, fullName}
 * 
 * @file js/utils/storage.js
 * @module utils/storage
 */

import { Design } from '../models/Design.js';
import { STORAGE_KEYS } from './constants.js';
import { emit } from './eventBus.js';

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
 * Initialize storage with default data.
 * Creates default users if none exist. Migrates legacy users
 * (those missing the 'role' field) by assigning them 'admin' role.
 * @returns {boolean} True if initialization successful
 */
function initializeStorage() {
    try {
        const existingUsers = safeGetItem(STORAGE_KEYS.users);
        if (!existingUsers) {
            const defaultUsers = [
                {
                    username: 'designer1',
                    password: 'password123',
                    role: 'admin',
                    fullName: 'Sarah Mitchell',
                    email: 'sarah@furnishview.com',
                    createdAt: new Date().toISOString()
                },
                {
                    username: 'designer2',
                    password: 'password456',
                    role: 'admin',
                    fullName: 'James Wilson',
                    email: 'james@furnishview.com',
                    createdAt: new Date().toISOString()
                },
                {
                    username: 'customer1',
                    password: 'password123',
                    role: 'user',
                    fullName: 'Emma Thompson',
                    email: 'emma@example.com',
                    createdAt: new Date().toISOString()
                }
            ];
            safeSetItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
        } else {
            // Backwards compatibility: migrate legacy users missing 'role' field
            const users = safeJSONParse(existingUsers, []);
            let migrated = false;
            const updatedUsers = users.map(user => {
                if (!user.role) {
                    migrated = true;
                    return {
                        ...user,
                        role: 'admin',
                        fullName: user.fullName || user.username,
                        email: user.email || '',
                        createdAt: user.createdAt || new Date().toISOString()
                    };
                }
                return user;
            });
            if (migrated) {
                safeSetItem(STORAGE_KEYS.users, JSON.stringify(updatedUsers));
            }
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
 * @returns {Array<Object>} Array of user objects
 */
function getUsers() {
    const data = safeGetItem(STORAGE_KEYS.users);
    return safeJSONParse(data, []);
}

/**
 * Validate login credentials against stored users.
 * Returns the matched user's public profile (excludes password) on success.
 * @param {string} username - Username to validate
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, user: Object|null}} Validation result with user data
 */
function validateLogin(username, password) {
    if (!isValidUsername(username) || !isValidPassword(password)) {
        return { valid: false, user: null };
    }
    
    const users = getUsers();
    const trimmedUsername = username.trim().toLowerCase();
    
    const matchedUser = users.find(user =>
        user.username.toLowerCase() === trimmedUsername &&
        user.password === password
    );
    
    if (!matchedUser) {
        return { valid: false, user: null };
    }
    
    // Return public profile (no password)
    return {
        valid: true,
        user: {
            username: matchedUser.username,
            role: matchedUser.role || 'admin',
            fullName: matchedUser.fullName || matchedUser.username,
            email: matchedUser.email || '',
            createdAt: matchedUser.createdAt || null
        }
    };
}

/**
 * Get a user by their username (case-insensitive lookup).
 * Returns public profile without password.
 * @param {string} username - Username to look up
 * @returns {Object|null} User object (without password) or null if not found
 */
function getUserByUsername(username) {
    if (!isValidUsername(username)) return null;
    
    const users = getUsers();
    const trimmedUsername = username.trim().toLowerCase();
    const matched = users.find(u => u.username.toLowerCase() === trimmedUsername);
    
    if (!matched) return null;
    
    return {
        username: matched.username,
        role: matched.role || 'admin',
        fullName: matched.fullName || matched.username,
        email: matched.email || '',
        createdAt: matched.createdAt || null
    };
}

/**
 * Check if a username is already taken (case-insensitive)
 * @param {string} username - Username to check
 * @returns {boolean} True if the username is already in use
 */
function isUsernameTaken(username) {
    if (typeof username !== 'string' || username.trim().length === 0) return false;
    
    const users = getUsers();
    const trimmedUsername = username.trim().toLowerCase();
    return users.some(u => u.username.toLowerCase() === trimmedUsername);
}

/**
 * Register a new user account.
 * Validates all input fields, checks username uniqueness,
 * and persists the new user to storage.
 * @param {string} username - Desired username (alphanumeric, 3-50 chars)
 * @param {string} password - Password (min 6 chars)
 * @param {string} role - User role, either 'admin' or 'user'
 * @param {string} fullName - Full display name
 * @param {string} email - Email address
 * @returns {{success: boolean, message: string, user: Object|null}} Registration result
 */
function registerUser(username, password, role, fullName, email) {
    if (!isValidUsername(username)) {
        return { success: false, message: 'Username must be 3-50 alphanumeric characters', user: null };
    }
    if (!isValidPassword(password)) {
        return { success: false, message: 'Password must be 6-100 characters', user: null };
    }
    if (role !== 'admin' && role !== 'user') {
        return { success: false, message: 'Role must be either admin or user', user: null };
    }
    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
        return { success: false, message: 'Full name is required', user: null };
    }
    if (typeof email !== 'string' || email.trim().length === 0) {
        return { success: false, message: 'Email is required', user: null };
    }
    
    if (isUsernameTaken(username)) {
        return { success: false, message: 'Username is already taken', user: null };
    }
    
    const newUser = {
        username: username.trim(),
        password: password,
        role: role,
        fullName: fullName.trim(),
        email: email.trim(),
        createdAt: new Date().toISOString()
    };
    
    const users = getUsers();
    users.push(newUser);
    
    const saved = safeSetItem(STORAGE_KEYS.users, JSON.stringify(users));
    if (!saved) {
        return { success: false, message: 'Failed to save user data', user: null };
    }

    emit('user_registered', { username: newUser.username, role: newUser.role });

    // Return public profile (no password)
    return {
        success: true,
        message: 'Registration successful',
        user: {
            username: newUser.username,
            role: newUser.role,
            fullName: newUser.fullName,
            email: newUser.email,
            createdAt: newUser.createdAt
        }
    };
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
 * Set the current session.
 * Stores a JSON object with the user's public profile.
 * @param {Object} user - User object with at least {username, role, fullName}
 * @returns {boolean} True if successful
 */
function setSession(user) {
    if (!user || typeof user !== 'object' || !isValidUsername(user.username)) {
        return false;
    }
    const sessionData = {
        username: user.username.trim(),
        role: user.role || 'admin',
        fullName: user.fullName || user.username
    };
    return safeSetItem(STORAGE_KEYS.session, JSON.stringify(sessionData));
}

/**
 * Get the current session data.
 * Returns a user object or null if no session exists.
 * Backwards-compatible: if session is a plain string (old format),
 * wraps it as {username, role: 'admin', fullName: username}.
 * @returns {{username: string, role: string, fullName: string}|null} Session user or null
 */
function getSession() {
    const raw = safeGetItem(STORAGE_KEYS.session);
    if (!raw || raw.length === 0) return null;
    
    // Try parsing as JSON (new format)
    const parsed = safeJSONParse(raw, null);
    if (parsed && typeof parsed === 'object' && parsed.username) {
        return {
            username: parsed.username,
            role: parsed.role || 'admin',
            fullName: parsed.fullName || parsed.username
        };
    }
    
    // Backwards compatibility: plain username string (old format)
    if (typeof raw === 'string' && raw.length > 0) {
        return { username: raw, role: 'admin', fullName: raw };
    }
    
    return null;
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
// CART MANAGEMENT
// ============================================================================

/**
 * Get the full cart array for a user.
 * Each item is `{ type: string, quantity: number, price: number }`.
 * @param {string} username - Username whose cart to retrieve
 * @returns {Array<{type: string, quantity: number, price: number}>} Cart items array
 */
function getCart(username) {
    if (typeof username !== 'string' || username.trim().length === 0) return [];

    const allCarts = safeJSONParse(safeGetItem(STORAGE_KEYS.cart), {});
    const key = username.trim().toLowerCase();
    const userCart = allCarts[key];
    return Array.isArray(userCart) ? userCart : [];
}

/**
 * Persist the full cart array for a user (internal helper).
 * @param {string} username - Username
 * @param {Array} cart - Cart items array
 * @returns {boolean} True if saved successfully
 * @private
 */
function saveCart(username, cart) {
    const allCarts = safeJSONParse(safeGetItem(STORAGE_KEYS.cart), {});
    const key = username.trim().toLowerCase();
    allCarts[key] = cart;
    return safeSetItem(STORAGE_KEYS.cart, JSON.stringify(allCarts));
}

/**
 * Add an item to the user's cart or increment its quantity.
 * @param {string} username - Username
 * @param {string} furnitureType - Furniture type ID
 * @param {number} quantity - Quantity to add (default 1)
 * @param {number} price - Unit price of the item
 * @returns {boolean} True if cart updated successfully
 */
function addToCart(username, furnitureType, quantity = 1, price = 0) {
    if (typeof username !== 'string' || username.trim().length === 0) return false;
    if (typeof furnitureType !== 'string' || furnitureType.trim().length === 0) return false;
    if (typeof quantity !== 'number' || quantity < 1) return false;

    const cart = getCart(username);
    const existing = cart.find(item => item.type === furnitureType);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ type: furnitureType, quantity, price: Number(price) || 0 });
    }

    const result = saveCart(username, cart);
    if (result) emit('cart_changed', { username: username.trim().toLowerCase() });
    return result;
}

/**
 * Remove an item entirely from the user's cart.
 * @param {string} username - Username
 * @param {string} furnitureType - Furniture type ID to remove
 * @returns {boolean} True if item was found and removed
 */
function removeFromCart(username, furnitureType) {
    if (typeof username !== 'string' || username.trim().length === 0) return false;

    const cart = getCart(username);
    const initial = cart.length;
    const filtered = cart.filter(item => item.type !== furnitureType);

    if (filtered.length === initial) return false;
    return saveCart(username, filtered);
}

/**
 * Update the quantity of an item in the cart.
 * If quantity is 0 or less, removes the item.
 * @param {string} username - Username
 * @param {string} furnitureType - Furniture type ID
 * @param {number} quantity - New quantity
 * @returns {boolean} True if updated successfully
 */
function updateCartQuantity(username, furnitureType, quantity) {
    if (typeof username !== 'string' || username.trim().length === 0) return false;

    if (typeof quantity !== 'number' || quantity <= 0) {
        return removeFromCart(username, furnitureType);
    }

    const cart = getCart(username);
    const item = cart.find(i => i.type === furnitureType);
    if (!item) return false;

    item.quantity = quantity;
    return saveCart(username, cart);
}

/**
 * Clear all items from a user's cart.
 * @param {string} username - Username
 * @returns {boolean} True if cleared successfully
 */
function clearCart(username) {
    if (typeof username !== 'string' || username.trim().length === 0) return false;
    return saveCart(username, []);
}

/**
 * Get the total price of all items in the user's cart.
 * @param {string} username - Username
 * @returns {number} Total price (sum of price × quantity for each item)
 */
function getCartTotal(username) {
    const cart = getCart(username);
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Get the total number of items (sum of quantities) in the user's cart.
 * @param {string} username - Username
 * @returns {number} Total item count
 */
function getCartCount(username) {
    const cart = getCart(username);
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * Generate a unique order reference number.
 * Format: FV-YYYY-XXXXX (e.g., FV-2026-83742)
 * @returns {string} Order reference ID
 * @private
 */
function generateOrderId() {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `FV-${year}-${random}`;
}

/**
 * Save a completed order to storage.
 * @param {string} username - Username placing the order
 * @param {Array<{type: string, quantity: number, price: number}>} items - Cart items
 * @param {number} total - Order total including delivery
 * @param {Object} deliveryDetails - Delivery address details
 * @param {string} deliveryDetails.fullName - Recipient name
 * @param {string} deliveryDetails.email - Contact email
 * @param {string} deliveryDetails.address - Street address
 * @param {string} deliveryDetails.city - City
 * @param {string} deliveryDetails.postcode - Postcode
 * @param {string} deliveryDetails.phone - Phone number
 * @returns {{success: boolean, orderId: string|null}} Result with generated order ID
 */
function saveOrder(username, items, total, deliveryDetails) {
    if (typeof username !== 'string' || username.trim().length === 0) {
        return { success: false, orderId: null };
    }
    if (!Array.isArray(items) || items.length === 0) {
        return { success: false, orderId: null };
    }

    const orderId = generateOrderId();
    const order = {
        orderId,
        username: username.trim().toLowerCase(),
        items: items.map(i => ({ type: i.type, quantity: i.quantity, price: i.price })),
        total: Number(total) || 0,
        delivery: deliveryDetails || {},
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };

    const allOrders = safeJSONParse(safeGetItem(STORAGE_KEYS.orders), []);
    allOrders.push(order);

    const saved = safeSetItem(STORAGE_KEYS.orders, JSON.stringify(allOrders));
    if (saved) {
        decrementStock(items);
        emit('order_created', { orderId, username: order.username, total: order.total, itemCount: items.length });
        emit('inventory_changed', {});
    }
    return saved ? { success: true, orderId } : { success: false, orderId: null };
}

/**
 * Get all orders for a user, sorted newest first.
 * @param {string} username - Username
 * @returns {Array<Object>} Array of order objects
 */
function getOrders(username) {
    if (typeof username !== 'string' || username.trim().length === 0) return [];

    const allOrders = safeJSONParse(safeGetItem(STORAGE_KEYS.orders), []);
    const key = username.trim().toLowerCase();
    return allOrders
        .filter(o => o.username === key)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * Initialize inventory from catalogue default stock levels.
 * Only sets up inventory if it doesn't already exist.
 * @param {Array} catalogue - Furniture catalogue array with stock field
 */
function initializeInventory(catalogue) {
    const existing = safeGetItem(STORAGE_KEYS.inventory);
    if (existing) return;
    const inventory = {};
    catalogue.forEach(item => { inventory[item.type] = item.stock ?? 20; });
    safeSetItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
}

/**
 * Get stock level for a furniture type.
 * @param {string} type - Furniture type ID
 * @returns {number} Stock count
 */
function getStock(type) {
    const inv = safeJSONParse(safeGetItem(STORAGE_KEYS.inventory), {});
    return typeof inv[type] === 'number' ? inv[type] : 999;
}

/**
 * Get full inventory object.
 * @returns {Object} Map of type -> stock count
 */
function getInventory() {
    return safeJSONParse(safeGetItem(STORAGE_KEYS.inventory), {});
}

/**
 * Update stock level for a furniture type.
 * @param {string} type - Furniture type ID
 * @param {number} quantity - New stock level
 * @returns {boolean} Success
 */
function setStock(type, quantity) {
    const inv = safeJSONParse(safeGetItem(STORAGE_KEYS.inventory), {});
    inv[type] = Math.max(0, Number(quantity) || 0);
    const saved = safeSetItem(STORAGE_KEYS.inventory, JSON.stringify(inv));
    if (saved) emit('inventory_changed', { type, newStock: inv[type] });
    return saved;
}

/**
 * Decrement stock for multiple items (called on order placement).
 * @param {Array<{type: string, quantity: number}>} items
 * @returns {boolean} Success
 */
function decrementStock(items) {
    if (!Array.isArray(items)) return false;
    const inv = safeJSONParse(safeGetItem(STORAGE_KEYS.inventory), {});
    items.forEach(({ type, quantity }) => {
        if (typeof inv[type] === 'number') {
            inv[type] = Math.max(0, inv[type] - quantity);
        }
    });
    return safeSetItem(STORAGE_KEYS.inventory, JSON.stringify(inv));
}

/**
 * Check if all cart items have sufficient stock.
 * @param {Array<{type: string, quantity: number}>} items
 * @returns {Array<string>} Array of type IDs that are out of stock
 */
function checkStockAvailability(items) {
    if (!Array.isArray(items)) return [];
    const inv = safeJSONParse(safeGetItem(STORAGE_KEYS.inventory), {});
    return items
        .filter(({ type, quantity }) => (inv[type] ?? 999) < quantity)
        .map(i => i.type);
}

// ============================================================================
// WISHLIST MANAGEMENT
// ============================================================================

/**
 * Get wishlist for a user.
 * @param {string} username
 * @returns {Array<string>} Array of furniture type IDs
 */
function getWishlist(username) {
    if (!username) return [];
    const all = safeJSONParse(safeGetItem(STORAGE_KEYS.wishlist), {});
    const key = username.trim().toLowerCase();
    return Array.isArray(all[key]) ? all[key] : [];
}

/**
 * Add a furniture type to user's wishlist.
 * @param {string} username
 * @param {string} type - Furniture type ID
 * @returns {boolean} Success
 */
function addToWishlist(username, type) {
    if (!username || !type) return false;
    const all = safeJSONParse(safeGetItem(STORAGE_KEYS.wishlist), {});
    const key = username.trim().toLowerCase();
    const list = Array.isArray(all[key]) ? all[key] : [];
    if (!list.includes(type)) list.push(type);
    all[key] = list;
    return safeSetItem(STORAGE_KEYS.wishlist, JSON.stringify(all));
}

/**
 * Remove a furniture type from user's wishlist.
 * @param {string} username
 * @param {string} type
 * @returns {boolean} Success
 */
function removeFromWishlist(username, type) {
    if (!username || !type) return false;
    const all = safeJSONParse(safeGetItem(STORAGE_KEYS.wishlist), {});
    const key = username.trim().toLowerCase();
    const list = Array.isArray(all[key]) ? all[key] : [];
    all[key] = list.filter(t => t !== type);
    return safeSetItem(STORAGE_KEYS.wishlist, JSON.stringify(all));
}

/**
 * Toggle a furniture type in the wishlist.
 * @param {string} username
 * @param {string} type
 * @returns {{ inWishlist: boolean }} New state
 */
function toggleWishlist(username, type) {
    const list = getWishlist(username);
    if (list.includes(type)) {
        removeFromWishlist(username, type);
        return { inWishlist: false };
    } else {
        addToWishlist(username, type);
        return { inWishlist: true };
    }
}

/**
 * Check if type is in user's wishlist.
 * @param {string} username
 * @param {string} type
 * @returns {boolean}
 */
function isInWishlist(username, type) {
    return getWishlist(username).includes(type);
}

// ============================================================================
// ADMIN ORDER MANAGEMENT
// ============================================================================

/**
 * Get ALL orders across all users (admin only).
 * @returns {Array<Object>} All orders sorted newest first
 */
function getAllOrders() {
    const allOrders = safeJSONParse(safeGetItem(STORAGE_KEYS.orders), []);
    return allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Update the status of an order.
 * Valid statuses: 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {boolean} Success
 */
function updateOrderStatus(orderId, status) {
    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return false;
    const allOrders = safeJSONParse(safeGetItem(STORAGE_KEYS.orders), []);
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return false;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    const saved = safeSetItem(STORAGE_KEYS.orders, JSON.stringify(allOrders));
    if (saved) emit('order_updated', { orderId, status });
    return saved;
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
    getUserByUsername,
    isUsernameTaken,
    registerUser,
    
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

    // Cart management
    getCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartCount,

    // Order management
    saveOrder,
    getOrders,

    // Inventory management
    initializeInventory,
    getStock,
    getInventory,
    setStock,
    decrementStock,
    checkStockAvailability,

    // Wishlist management
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,

    // Admin order management
    getAllOrders,
    updateOrderStatus,

    // Constants (re-exported for convenience)
    MAX_DESIGNS_PER_USER
};
