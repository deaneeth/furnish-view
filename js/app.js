/**
 * FurnishView — Application Entry Point
 * 
 * Main application initialisation, page/view router, and global state management.
 * This module bootstraps the application and handles navigation between views.
 * 
 * @file js/app.js
 * @module app
 */

import { LoginView } from './views/LoginView.js';
// import { DashboardView } from './views/DashboardView.js';
// import { EditorView } from './views/EditorView.js';
import { initializeStorage } from './utils/storage.js';
import { isLoggedIn, getCurrentUser, logout } from './auth/auth.js';

/**
 * Application state
 * @type {Object}
 */
const AppState = {
    currentView: null,
    currentDesignId: null,
    user: null,
    viewInstance: null
};

/**
 * Get the main application container element
 * @returns {HTMLElement|null} The #app container
 */
function getAppContainer() {
    return document.getElementById('app');
}

/**
 * Clear the application container and destroy current view
 */
function clearContainer() {
    // Destroy current view instance if it exists
    if (AppState.viewInstance && typeof AppState.viewInstance.destroy === 'function') {
        AppState.viewInstance.destroy();
    }
    AppState.viewInstance = null;
    
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
    AppState.user = null;
    
    const container = getAppContainer();
    if (!container) return;
    
    // Create and render login view
    const loginView = new LoginView({
        onLoginSuccess: () => {
            AppState.user = getCurrentUser();
            showDashboard();
        }
    });
    
    loginView.render(container);
    AppState.viewInstance = loginView;
}

/**
 * Navigate to the dashboard view
 */
function showDashboard() {
    // Check authentication
    if (!isLoggedIn()) {
        showLogin();
        return;
    }
    
    clearContainer();
    AppState.currentView = 'dashboard';
    AppState.user = getCurrentUser();
    
    const container = getAppContainer();
    if (!container) return;
    
    // TODO: Replace with DashboardView when implemented
    container.innerHTML = `
        <header class="app-header">
            <div class="app-logo">FurnishView</div>
            <nav class="app-nav">
                <div class="user-info">
                    <span>Welcome, <strong>${escapeHtml(AppState.user || 'Designer')}</strong></span>
                </div>
                <button id="logout-btn" class="btn btn-secondary btn-sm">Logout</button>
            </nav>
        </header>
        <main class="dashboard-container">
            <div class="dashboard-header">
                <h2 class="dashboard-title">My Designs</h2>
                <div class="dashboard-actions">
                    <button id="new-design-btn" class="btn btn-primary">+ New Design</button>
                </div>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">📐</div>
                <h3 class="empty-state-title">No Designs Yet</h3>
                <p class="empty-state-message">
                    Create your first room design to get started.
                </p>
                <button id="create-first-btn" class="btn btn-primary">Create First Design</button>
            </div>
        </main>
    `;
    
    // Attach logout handler
    const logoutBtn = container.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', handleLogout);
    
    // Attach new design handlers (placeholder for now)
    const newDesignBtn = container.querySelector('#new-design-btn');
    const createFirstBtn = container.querySelector('#create-first-btn');
    
    newDesignBtn?.addEventListener('click', () => {
        showEditor(null); // null = new design
    });
    
    createFirstBtn?.addEventListener('click', () => {
        showEditor(null);
    });
}

/**
 * Navigate to the editor view with a specific design
 * @param {string|null} designId - The ID of the design to edit, or null for new design
 */
function showEditor(designId) {
    // Check authentication
    if (!isLoggedIn()) {
        showLogin();
        return;
    }
    
    clearContainer();
    AppState.currentView = 'editor';
    AppState.currentDesignId = designId;
    
    const container = getAppContainer();
    if (!container) return;
    
    // TODO: Replace with EditorView when implemented
    container.innerHTML = `
        <header class="app-header">
            <div class="app-logo">FurnishView</div>
            <nav class="app-nav">
                <button id="back-to-dashboard" class="btn btn-ghost btn-sm">← Back to Dashboard</button>
                <div class="user-info">
                    <span>${escapeHtml(AppState.user || 'Designer')}</span>
                </div>
            </nav>
        </header>
        <main class="editor-container" style="flex: 1; display: flex; align-items: center; justify-content: center;">
            <div class="text-center">
                <h2 style="margin-bottom: var(--space-4);">Editor View</h2>
                <p class="text-secondary" style="margin-bottom: var(--space-4);">
                    ${designId ? `Editing design: ${escapeHtml(designId)}` : 'Creating new design'}
                </p>
                <p class="text-muted">Editor implementation coming in Task 2.1</p>
            </div>
        </main>
    `;
    
    // Attach back button handler
    const backBtn = container.querySelector('#back-to-dashboard');
    backBtn?.addEventListener('click', showDashboard);
}

/**
 * Handle logout action
 */
function handleLogout() {
    logout();
    AppState.user = null;
    AppState.currentDesignId = null;
    showLogin();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialise the application
 * Sets up storage, checks authentication, and routes to appropriate view
 */
function initApp() {
    // Initialize storage with default users
    initializeStorage();
    
    // Check authentication status and route accordingly
    if (isLoggedIn()) {
        AppState.user = getCurrentUser();
        showDashboard();
    } else {
        showLogin();
    }
}

// Initialise app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

// Export for ES modules
export {
    AppState,
    showLogin,
    showDashboard,
    showEditor,
    handleLogout,
    initApp
};
