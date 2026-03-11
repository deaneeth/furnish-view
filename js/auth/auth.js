/**
 * FurnishView — Authentication Module
 * 
 * Handles login validation, session management, user registration,
 * and role-based authentication. Uses localStorage for credential
 * and session storage via storage.js.
 * 
 * @file js/auth/auth.js
 * @module auth
 */

import { 
    validateLogin as storageValidateLogin, 
    setSession, 
    getSession, 
    clearSession,
    registerUser as storageRegisterUser
} from '../utils/storage.js';

/**
 * Result object returned by login and register operations
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} message - Human-readable result message
 * @property {Object|null} user - User object on success, null on failure
 * @property {string} user.username - The user's username
 * @property {string} user.role - The user's role ('admin' or 'user')
 * @property {string} user.fullName - The user's display name
 */

/**
 * Attempt to log in a user.
 * Validates credentials against stored users, creates a session on success,
 * and returns the authenticated user object including their role.
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to validate
 * @returns {AuthResult} Result object with success status, message, and user
 * @example
 * const result = login('designer1', 'password123');
 * if (result.success) {
 *     // result.user.role === 'admin'
 *     // Navigate to appropriate dashboard
 * }
 */
function login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') {
        return {
            success: false,
            message: 'Please enter both username and password',
            user: null
        };
    }
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length === 0) {
        return {
            success: false,
            message: 'Username is required',
            user: null
        };
    }
    
    if (password.length === 0) {
        return {
            success: false,
            message: 'Password is required',
            user: null
        };
    }
    
    // storageValidateLogin now returns { valid, user }
    const result = storageValidateLogin(trimmedUsername, password);
    
    if (!result.valid || !result.user) {
        return {
            success: false,
            message: 'Invalid username or password',
            user: null
        };
    }
    
    // Create session with user object
    const sessionCreated = setSession(result.user);
    
    if (!sessionCreated) {
        return {
            success: false,
            message: 'Failed to create session. Please try again.',
            user: null
        };
    }
    
    return {
        success: true,
        message: 'Login successful',
        user: result.user
    };
}

/**
 * Register a new user and automatically log them in.
 * Delegates validation and persistence to storage.registerUser(),
 * then creates a session for the new user on success.
 * @param {string} username - Desired username
 * @param {string} password - Desired password
 * @param {string} role - User role ('admin' or 'user')
 * @param {string} fullName - Full display name
 * @param {string} email - Email address
 * @returns {AuthResult} Result with success status, message, and user
 */
function register(username, password, role, fullName, email) {
    const result = storageRegisterUser(username, password, role, fullName, email);
    
    if (!result.success) {
        return {
            success: false,
            message: result.message,
            user: null
        };
    }
    
    // Auto-login: create session for the newly registered user
    const sessionCreated = setSession(result.user);
    
    if (!sessionCreated) {
        return {
            success: false,
            message: 'Account created but failed to start session. Please log in.',
            user: result.user
        };
    }
    
    return {
        success: true,
        message: 'Registration successful',
        user: result.user
    };
}

/**
 * Log out the current user.
 * Clears the active session from localStorage.
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
 * Get the currently logged-in user's full session data.
 * Returns an object with username, role, and fullName.
 * @returns {{username: string, role: string, fullName: string}|null} User object or null
 */
function getCurrentUser() {
    return getSession();
}

/**
 * Get the role of the currently logged-in user.
 * @returns {string|null} 'admin', 'user', or null if not logged in
 */
function getUserRole() {
    const session = getSession();
    return session ? session.role : null;
}

export {
    login,
    register,
    logout,
    isLoggedIn,
    getCurrentUser,
    getUserRole
};
