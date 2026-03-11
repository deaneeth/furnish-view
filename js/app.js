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
import { RegisterView } from './views/RegisterView.js';
import { LandingView } from './views/LandingView.js';
import { DashboardView } from './views/DashboardView.js';
import { UserDashboardView } from './views/UserDashboardView.js';
import { CatalogueView } from './views/CatalogueView.js';
import { CartView } from './views/CartView.js';
import { CheckoutView } from './views/CheckoutView.js';
import { RoomSetupModal } from './views/components/RoomSetupModal.js';
import { EditorView } from './views/EditorView.js';
import { ComparisonView } from './views/ComparisonView.js';
import { Modal } from './views/components/Modal.js';
import { initializeStorage, getAllDesigns, deleteDesign, saveDesign, loadDesign, addToCart, getCart, getCartCount, removeFromCart, updateCartQuantity, clearCart, saveOrder, getUserByUsername } from './utils/storage.js';
import { isLoggedIn, getCurrentUser, logout, getUserRole } from './auth/auth.js';
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
    viewInstance: null,
    pendingFurnitureType: null
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
 * Navigate to the landing page (default entry when not logged in)
 */
function showLanding() {
    clearContainer();
    AppState.currentView = 'landing';
    AppState.user = null;
    
    const container = getAppContainer();
    if (!container) return;
    
    const landingView = new LandingView({
        onLoginSuccess: () => {
            AppState.user = getCurrentUser();
            showDashboard();
        }
    });
    
    landingView.render(container);
    AppState.viewInstance = landingView;
}

/**
 * Navigate to the login view (fallback / direct login)
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
        },
        onSwitchToRegister: () => showRegister()
    });
    
    loginView.render(container);
    AppState.viewInstance = loginView;
}

/**
 * Navigate to the registration view
 */
function showRegister() {
    clearContainer();
    AppState.currentView = 'register';
    AppState.user = null;

    const container = getAppContainer();
    if (!container) return;

    const registerView = new RegisterView({
        onRegisterSuccess: () => {
            AppState.user = getCurrentUser();
            showDashboard();
        },
        onSwitchToLogin: () => showLogin()
    });

    registerView.render(container);
    AppState.viewInstance = registerView;
}

/**
 * Navigate to the appropriate dashboard based on user role.
 * Admin (designer) → DashboardView, User (customer) → UserDashboardView
 */
function showDashboard() {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    AppState.user = getCurrentUser();
    const role = getUserRole();

    if (role === 'user') {
        showUserDashboard();
    } else {
        showAdminDashboard();
    }
}

/**
 * Navigate to the admin (designer) dashboard
 */
function showAdminDashboard() {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    clearContainer();
    AppState.currentView = 'dashboard';
    AppState.user = getCurrentUser();

    const container = getAppContainer();
    if (!container) return;

    const username = AppState.user ? AppState.user.username : '';
    const userDesigns = getAllDesigns(username);

    const dashboardView = new DashboardView({
        onNewDesign: handleNewDesign,
        onOpenDesign: handleOpenDesign,
        onDeleteDesign: handleDeleteDesign,
        onLogout: handleLogout,
        onCompareDesigns: handleCompareDesigns
    });

    dashboardView.render(container, userDesigns, username);
    AppState.viewInstance = dashboardView;
}

/**
 * Navigate to the user (customer) dashboard
 */
function showUserDashboard() {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    clearContainer();
    AppState.currentView = 'user-dashboard';
    AppState.user = getCurrentUser();

    const container = getAppContainer();
    if (!container) return;

    const username = AppState.user ? AppState.user.username : '';
    const fullName = AppState.user ? AppState.user.fullName : '';
    const userDesigns = getAllDesigns(username);

    const userDashboardView = new UserDashboardView({
        onNewDesign: handleNewDesign,
        onOpenDesign: handleOpenDesign,
        onDeleteDesign: handleDeleteDesign,
        onLogout: handleLogout,
        onBrowseCatalogue: (category) => {
            showCatalogue(category);
        },
        onViewCart: () => {
            showCart();
        }
    });

    userDashboardView.render(container, userDesigns, username, {
        fullName,
        cartCount: getCartCount(username)
    });
    AppState.viewInstance = userDashboardView;
}

/**
 * Navigate to the furniture catalogue browser
 * @param {string} [category='all'] - Initial category filter
 */
function showCatalogue(category = 'all') {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    clearContainer();
    AppState.currentView = 'catalogue';
    AppState.user = getCurrentUser();

    const container = getAppContainer();
    if (!container) return;

    const username = AppState.user ? AppState.user.username : '';

    const catalogueView = new CatalogueView({
        onBack: () => showDashboard(),
        onAddToCart: (furnitureType, price) => {
            const success = addToCart(username, furnitureType, 1, price);
            if (success) {
                const count = getCartCount(username);
                catalogueView.updateCartCount(count);
                Toast.success('Added to cart');
            } else {
                Toast.error('Failed to add to cart');
            }
        },
        onUseInDesign: (furnitureType) => {
            AppState.pendingFurnitureType = furnitureType;
            handleNewDesign();
        },
        onViewCart: () => {
            showCart();
        }
    });

    catalogueView.render(container, {
        category: category || 'all',
        cartCount: getCartCount(username)
    });
    AppState.viewInstance = catalogueView;
}

/**
 * Navigate to the shopping cart page
 */
function showCart() {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    clearContainer();
    AppState.currentView = 'cart';
    AppState.user = getCurrentUser();

    const container = getAppContainer();
    if (!container) return;

    const username = AppState.user ? AppState.user.username : '';

    const cartView = new CartView({
        onBack: () => showDashboard(),
        onContinueShopping: () => showCatalogue(),
        onUpdateQuantity: (furnitureType, newQuantity) => {
            updateCartQuantity(username, furnitureType, newQuantity);
            cartView.refresh(getCart(username));
        },
        onRemoveItem: (furnitureType) => {
            removeFromCart(username, furnitureType);
            Toast.success('Item removed from cart');
            cartView.refresh(getCart(username));
        },
        onClearCart: () => {
            clearCart(username);
            Toast.success('Cart cleared');
            cartView.refresh(getCart(username));
        },
        onCheckout: () => {
            showCheckout();
        }
    });

    cartView.render(container, getCart(username));
    AppState.viewInstance = cartView;
}

/**
 * Navigate to the checkout page
 */
function showCheckout() {
    if (!isLoggedIn()) {
        showLanding();
        return;
    }

    AppState.user = getCurrentUser();
    const username = AppState.user ? AppState.user.username : '';
    const cartItems = getCart(username);

    if (cartItems.length === 0) {
        Toast.info('Your cart is empty');
        showCart();
        return;
    }

    clearContainer();
    AppState.currentView = 'checkout';

    const container = getAppContainer();
    if (!container) return;

    const checkoutView = new CheckoutView({
        onBack: () => showCart(),
        onPlaceOrder: (deliveryDetails) => {
            const subtotal = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);
            const deliveryFee = subtotal >= 500 ? 0 : 49.99;
            const total = subtotal + deliveryFee;

            const result = saveOrder(username, cartItems, total, deliveryDetails);
            if (result.success) {
                clearCart(username);
            }
            return result;
        },
        onContinueDesigning: () => showDashboard()
    });

    const userProfile = getUserByUsername(username);

    checkoutView.render(container, cartItems, {
        fullName: userProfile ? userProfile.fullName : (AppState.user ? AppState.user.fullName : ''),
        email: userProfile ? userProfile.email : ''
    });
    AppState.viewInstance = checkoutView;
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
                designerName: AppState.user ? AppState.user.username : '',
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
 * Handle compare designs action — shows selection modal with two dropdowns
 * @private
 */
function handleCompareDesigns() {
    if (!isLoggedIn()) {
        showLogin();
        return;
    }

    const username = AppState.user ? AppState.user.username : '';
    const designs = getAllDesigns(username);
    if (designs.length < 2) {
        Toast.info('You need at least 2 designs to compare');
        return;
    }

    // Build dropdown options from saved designs
    const optionsHtml = designs.map(d => {
        const id = escapeHtml(d.id || '');
        const name = escapeHtml(d.name || 'Untitled');
        return `<option value="${id}">${name}</option>`;
    }).join('');

    // Second dropdown defaults to the second design
    const optionsBHtml = designs.map((d, i) => {
        const id = escapeHtml(d.id || '');
        const name = escapeHtml(d.name || 'Untitled');
        const selected = i === 1 ? ' selected' : '';
        return `<option value="${id}"${selected}>${name}</option>`;
    }).join('');

    const content = `
        <div class="form-group">
            <label class="form-label" for="compare-select-a">Design A</label>
            <select id="compare-select-a" class="form-select">${optionsHtml}</select>
        </div>
        <div class="form-group">
            <label class="form-label" for="compare-select-b">Design B</label>
            <select id="compare-select-b" class="form-select">${optionsBHtml}</select>
        </div>
        <p id="compare-error" class="form-error" style="display:none;">Please select two different designs.</p>
    `;

    Modal.show({
        title: 'Compare Designs',
        content,
        confirmText: 'Compare',
        cancelText: 'Cancel',
        onConfirm: () => {
            const selectA = document.getElementById('compare-select-a');
            const selectB = document.getElementById('compare-select-b');
            const idA = selectA ? selectA.value : '';
            const idB = selectB ? selectB.value : '';

            if (!idA || !idB || idA === idB) {
                Toast.error('Please select two different designs');
                return;
            }

            showComparison(idA, idB);
        }
    });
}

/**
 * Navigate to the comparison view with two designs
 * @param {string} designIdA - ID of the first design
 * @param {string} designIdB - ID of the second design
 */
function showComparison(designIdA, designIdB) {
    if (!isLoggedIn()) {
        showLogin();
        return;
    }

    // Load both designs from storage
    const designA = loadDesign(designIdA);
    const designB = loadDesign(designIdB);

    if (!designA || !designB) {
        Toast.error('One or both designs could not be loaded');
        showDashboard();
        return;
    }

    clearContainer();
    AppState.currentView = 'comparison';

    const container = getAppContainer();
    if (!container) return;

    const comparisonView = new ComparisonView({
        onBack: () => showDashboard()
    });

    comparisonView.render(container, designA, designB);
    AppState.viewInstance = comparisonView;
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
    
    // Load design from storage
    let design = null;
    if (designId) {
        design = loadDesign(designId);
        if (!design) {
            Toast.error('Design not found');
            showDashboard();
            return;
        }
    }
    
    // Create EditorView instance
    const editorView = new EditorView({
        onSave: (updatedDesign) => handleSaveDesign(updatedDesign),
        onBack: () => showDashboard(),
        onToggle3D: (view) => handleToggle3D(view)
    });
    
    editorView.render(container, design);
    AppState.viewInstance = editorView;

    // Auto-start placing mode if a furniture type was pre-selected from catalogue
    if (AppState.pendingFurnitureType) {
        editorView.startPlacingFurniture(AppState.pendingFurnitureType);
        AppState.pendingFurnitureType = null;
    }
}

/**
 * Handle save design from editor
 * @param {Object} design - Design to save
 * @private
 */
function handleSaveDesign(design) {
    if (!design) {
        Toast.error('No design to save');
        return;
    }
    
    // Convert to JSON if needed
    const designJSON = typeof design.toJSON === 'function' 
        ? design.toJSON() 
        : design;
    
    const success = saveDesign(designJSON);
    
    if (success) {
        Toast.success('Design saved successfully');
    } else {
        Toast.error('Failed to save design');
    }
}

/**
 * Handle 2D/3D view toggle
 * @param {string} view - '2d' or '3d'
 * @private
 */
function handleToggle3D(view) {
    // View switching is handled internally by EditorView.
    // This hook is kept for potential app-level side-effects in later phases.
}

/**
 * Handle logout action
 */
function handleLogout() {
    logout();
    AppState.user = null;
    AppState.currentDesignId = null;
    Toast.info('You have been logged out');
    showLanding();
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
        showLanding();
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
    showLanding,
    showLogin,
    showRegister,
    showDashboard,
    showAdminDashboard,
    showUserDashboard,
    showCatalogue,
    showCart,
    showCheckout,
    showEditor,
    showComparison,
    handleLogout,
    initApp
};
