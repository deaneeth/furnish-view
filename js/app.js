/**
 * FurnishView — Application Entry Point
 * 
 * Main application initialisation, page/view router, and global state management.
 * This module bootstraps the application and handles navigation between views.
 * 
 * @file js/app.js
 * @module app
 */

// TODO: Import views when implemented
// import { LoginView } from './views/LoginView.js';
// import { DashboardView } from './views/DashboardView.js';
// import { EditorView } from './views/EditorView.js';
// import { initializeStorage } from './utils/storage.js';
// import { isLoggedIn, getCurrentUser } from './auth/auth.js';

/**
 * Application state
 * @type {Object}
 */
const AppState = {
    currentView: null,
    currentDesignId: null,
    user: null
};

/**
 * Get the main application container element
 * @returns {HTMLElement} The #app container
 */
function getAppContainer() {
    return document.getElementById('app');
}

/**
 * Clear the application container
 */
function clearContainer() {
    const container = getAppContainer();
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Navigate to the login view
 */
function showLogin() {
    clearContainer();
    AppState.currentView = 'login';
    // TODO: Render LoginView
    console.info('[App] Navigated to Login view');
}

/**
 * Navigate to the dashboard view
 */
function showDashboard() {
    clearContainer();
    AppState.currentView = 'dashboard';
    // TODO: Render DashboardView
    console.info('[App] Navigated to Dashboard view');
}

/**
 * Navigate to the editor view with a specific design
 * @param {string} designId - The ID of the design to edit
 */
function showEditor(designId) {
    clearContainer();
    AppState.currentView = 'editor';
    AppState.currentDesignId = designId;
    // TODO: Render EditorView
    console.info(`[App] Navigated to Editor view (Design: ${designId})`);
}

/**
 * Initialise the application
 * Sets up storage, checks authentication, and routes to appropriate view
 */
function initApp() {
    console.info('[App] Initialising FurnishView...');
    
    // TODO: Initialize storage with default users
    // initializeStorage();
    
    // TODO: Check authentication status and route accordingly
    // if (isLoggedIn()) {
    //     AppState.user = getCurrentUser();
    //     showDashboard();
    // } else {
    //     showLogin();
    // }
    
    // Temporary: Show placeholder message
    const container = getAppContainer();
    if (container) {
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
                padding: 2rem;
            ">
                <h1 style="color: var(--primary); margin-bottom: 1rem;">FurnishView</h1>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    Room Designer Application
                </p>
                <p style="color: var(--text-muted); font-size: 0.875rem;">
                    Project skeleton created successfully.<br>
                    Implementation in progress...
                </p>
            </div>
        `;
    }
    
    console.info('[App] FurnishView initialised');
}

// Initialise app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export for ES modules
export {
    AppState,
    showLogin,
    showDashboard,
    showEditor,
    initApp
};
