/**
 * FurnishView — Authentication Module
 * 
 * Handles login validation, session management, and user authentication.
 * Uses localStorage for credential and session storage via storage.js.
 * 
 * @file js/auth/auth.js
 * @module auth
 */

import { 
    validateLogin as storageValidateLogin, 
    setSession, 
    getSession, 
    clearSession,
    getOriginalUsername
} from '../utils/storage.js';

/**
 * Result object returned by login operations
 * @typedef {Object} LoginResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} message - Human-readable result message
 */

/**
 * Attempt to log in a user
 * Validates credentials against stored users and creates a session on success
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to validate
 * @returns {LoginResult} Result object with success status and message
 * @example
 * const result = login('designer1', 'password123');
 * if (result.success) {
 *     // Navigate to dashboard
 * }
 */
function login(username, password) {
    // Validate input types
    if (typeof username !== 'string' || typeof password !== 'string') {
        return {
            success: false,
            message: 'Please enter both username and password'
        };
    }
    
    // Trim username (password is case-sensitive, keep as is)
    const trimmedUsername = username.trim();
    
    // Check for empty fields
    if (trimmedUsername.length === 0) {
        return {
            success: false,
            message: 'Username is required'
        };
    }
    
    if (password.length === 0) {
        return {
            success: false,
            message: 'Password is required'
        };
    }
    
    // Validate credentials against storage
    const isValid = storageValidateLogin(trimmedUsername, password);
    
    if (!isValid) {
        return {
            success: false,
            message: 'Invalid username or password'
        };
    }
    
    // Get the original username with correct casing
    const originalUsername = getOriginalUsername(trimmedUsername);
    
    // Create session
    const sessionCreated = setSession(originalUsername || trimmedUsername);
    
    if (!sessionCreated) {
        return {
            success: false,
            message: 'Failed to create session. Please try again.'
        };
    }
    
    return {
        success: true,
        message: 'Login successful'
    };
}

/**
 * Log out the current user
 * Clears the active session from localStorage
 * @returns {boolean} True if logout was successful
 */
function logout() {
    return clearSession();
}

/**
 * Check if a user is currently logged in
 * @returns {boolean} True if a valid session exists
 */
function isLoggedIn() {
    return getSession() !== null;
}

/**
 * Get the currently logged-in username
 * @returns {string|null} The username or null if not logged in
 */
function getCurrentUser() {
    return getSession();
}

// Export for ES modules
export {
    login,
    logout,
    isLoggedIn,
    getCurrentUser
};
