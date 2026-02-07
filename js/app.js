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
import { DashboardView } from './views/DashboardView.js';
import { RoomSetupModal } from './views/components/RoomSetupModal.js';
// import { EditorView } from './views/EditorView.js';
import { initializeStorage, getAllDesigns, deleteDesign, saveDesign } from './utils/storage.js';
import { isLoggedIn, getCurrentUser, logout } from './auth/auth.js';
import { Toast } from './views/components/Toast.js';
import { Design } from './models/Design.js';
import { Room } from './models/Room.js';

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
    
    // Get user's designs
    const userDesigns = getAllDesigns(AppState.user);
    
    // Create and render dashboard view
    const dashboardView = new DashboardView({
        onNewDesign: handleNewDesign,
        onOpenDesign: handleOpenDesign,
        onDeleteDesign: handleDeleteDesign,
        onLogout: handleLogout,
        onCompareDesigns: handleCompareDesigns
    });
    
    dashboardView.render(container, userDesigns, AppState.user);
    AppState.viewInstance = dashboardView;
}

/**
 * Handle new design action — shows room setup modal
 * @private
 */
function handleNewDesign() {
    RoomSetupModal.show({
        onSubmit: (formData) => {
            // Create Room from form data
            const room = new Room(formData.room);
            
            // Create Design with Room and current user
            const design = new Design({
                name: formData.name,
                designerName: AppState.user || '',
                room: room,
                furniture: []
            });
            
            // Save design to storage
            const success = saveDesign(design.toJSON());
            
            if (success) {
                Toast.success(`Design "${formData.name}" created`);
                showEditor(design.id);
            } else {
                Toast.error('Failed to create design');
            }
        },
        onCancel: () => {
            // User cancelled — do nothing
        }
    });
}

/**
 * Handle open design action
 * @param {string} designId - ID of design to open
 * @private
 */
function handleOpenDesign(designId) {
    if (!designId) return;
    showEditor(designId);
}

/**
 * Handle delete design action
 * @param {string} designId - ID of design to delete
 * @private
 */
function handleDeleteDesign(designId) {
    if (!designId) return;
    
    const success = deleteDesign(designId);
    
    if (success) {
        Toast.success('Design deleted successfully');
        // Refresh the dashboard
        showDashboard();
    } else {
        Toast.error('Failed to delete design');
    }
}

/**
 * Handle compare designs action
 * @private
 */
function handleCompareDesigns() {
    // Innovation feature - implementation coming in later task
    Toast.info('Compare Designs feature coming soon!');
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
    Toast.info('You have been logged out');
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
