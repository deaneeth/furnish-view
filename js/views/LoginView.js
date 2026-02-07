/**
 * FurnishView — Login View
 * 
 * Renders the login screen with username/password form.
 * Implements HCI principles:
 * - Nielsen Heuristic #1 (Visibility): Loading state on button
 * - Nielsen Heuristic #5 (Error Prevention): Button disabled until fields have content
 * - Nielsen Heuristic #9 (Help users recognise errors): Clear error messages
 * - Accessibility: Labels associated with inputs, keyboard navigation
 * 
 * @file js/views/LoginView.js
 * @module views/LoginView
 */

import { login } from '../auth/auth.js';

/**
 * LoginView class
 * Manages the login form UI and interactions
 */
class LoginView {
    /**
     * Create a LoginView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onLoginSuccess - Callback for successful login
     */
    constructor({ onLoginSuccess = () => {} } = {}) {
        this.onLoginSuccess = onLoginSuccess;
        this.container = null;
        this.form = null;
        this.usernameInput = null;
        this.passwordInput = null;
        this.submitButton = null;
        this.errorMessage = null;
        this.isLoading = false;
    }
    
    /**
     * Render the login view into a container
     * @param {HTMLElement} container - The DOM element to render into
     */
    render(container) {
        if (!container) return;
        
        this.container = container;
        
        // Create login HTML structure
        container.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <header class="login-header">
                        <h1 class="login-logo">FurnishView</h1>
                        <p class="login-subtitle">Room Designer Application</p>
                    </header>
                    
                    <form id="login-form" class="login-form" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="login-username">Username</label>
                            <input 
                                type="text" 
                                id="login-username" 
                                name="username"
                                class="form-input" 
                                placeholder="Enter your username"
                                autocomplete="username"
                                autocapitalize="none"
                                spellcheck="false"
                                required
                            >
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="login-password">Password</label>
                            <input 
                                type="password" 
                                id="login-password"
                                name="password" 
                                class="form-input" 
                                placeholder="Enter your password"
                                autocomplete="current-password"
                                required
                            >
                        </div>
                        
                        <div id="login-error" class="login-error" role="alert" aria-live="polite"></div>
                        
                        <button 
                            type="submit" 
                            id="login-submit" 
                            class="btn btn-primary btn-lg login-submit"
                            disabled
                        >
                            <span class="login-submit-text">Sign In</span>
                            <span class="login-submit-loading" aria-hidden="true"></span>
                        </button>
                    </form>
                    
                    <footer class="login-footer">
                        <p class="login-hint">
                            <span class="text-muted">Test credentials:</span><br>
                            designer1 / password123
                        </p>
                    </footer>
                </div>
            </div>
        `;
        
        // Cache DOM references
        this.form = container.querySelector('#login-form');
        this.usernameInput = container.querySelector('#login-username');
        this.passwordInput = container.querySelector('#login-password');
        this.submitButton = container.querySelector('#login-submit');
        this.errorMessage = container.querySelector('#login-error');
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Focus username input for accessibility
        requestAnimationFrame(() => {
            this.usernameInput?.focus();
        });
    }
    
    /**
     * Attach event listeners to form elements
     * @private
     */
    attachEventListeners() {
        // Form submission
        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
        
        // Input validation for button state (Error Prevention - Nielsen #5)
        this.usernameInput?.addEventListener('input', () => this.updateButtonState());
        this.passwordInput?.addEventListener('input', () => this.updateButtonState());
        
        // Clear error on input change
        this.usernameInput?.addEventListener('input', () => this.clearError());
        this.passwordInput?.addEventListener('input', () => this.clearError());
        
        // Handle Enter key specifically for accessibility
        this.form?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !this.submitButton?.disabled) {
                event.preventDefault();
                this.handleSubmit();
            }
        });
    }
    
    /**
     * Update submit button enabled state based on field content
     * Implements Error Prevention (Nielsen Heuristic #5)
     * @private
     */
    updateButtonState() {
        if (!this.submitButton || !this.usernameInput || !this.passwordInput) return;
        
        const hasUsername = this.usernameInput.value.trim().length > 0;
        const hasPassword = this.passwordInput.value.length > 0;
        
        this.submitButton.disabled = !(hasUsername && hasPassword) || this.isLoading;
    }
    
    /**
     * Show error message
     * Implements Help Users Recognise Errors (Nielsen Heuristic #9)
     * @param {string} message - Error message to display
     * @private
     */
    showError(message) {
        if (!this.errorMessage) return;
        
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('visible');
        
        // Add error styling to inputs
        this.usernameInput?.classList.add('error');
        this.passwordInput?.classList.add('error');
    }
    
    /**
     * Clear error message
     * @private
     */
    clearError() {
        if (!this.errorMessage) return;
        
        this.errorMessage.textContent = '';
        this.errorMessage.classList.remove('visible');
        
        // Remove error styling from inputs
        this.usernameInput?.classList.remove('error');
        this.passwordInput?.classList.remove('error');
    }
    
    /**
     * Set loading state
     * Implements Visibility of System Status (Nielsen Heuristic #1)
     * @param {boolean} loading - Whether to show loading state
     * @private
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        if (!this.submitButton) return;
        
        if (loading) {
            this.submitButton.classList.add('loading');
            this.submitButton.disabled = true;
            this.submitButton.setAttribute('aria-busy', 'true');
        } else {
            this.submitButton.classList.remove('loading');
            this.submitButton.removeAttribute('aria-busy');
            this.updateButtonState();
        }
    }
    
    /**
     * Handle form submission
     * @private
     */
    handleSubmit() {
        if (this.isLoading) return;
        
        const username = this.usernameInput?.value || '';
        const password = this.passwordInput?.value || '';
        
        // Clear previous errors
        this.clearError();
        
        // Show loading state (Visibility - Nielsen #1)
        this.setLoading(true);
        
        // Simulate slight delay for UX (shows loading state)
        setTimeout(() => {
            // Attempt login
            const result = login(username, password);
            
            this.setLoading(false);
            
            if (result.success) {
                // Success - call callback
                this.onLoginSuccess();
            } else {
                // Show error (Help Users Recognise Errors - Nielsen #9)
                this.showError(result.message);
                
                // Focus the first input for correction
                this.usernameInput?.focus();
                this.usernameInput?.select();
            }
        }, 300);
    }
    
    /**
     * Clean up the view (remove event listeners)
     */
    destroy() {
        // Event listeners are automatically cleaned up when DOM is replaced
        this.container = null;
        this.form = null;
        this.usernameInput = null;
        this.passwordInput = null;
        this.submitButton = null;
        this.errorMessage = null;
    }
}

export { LoginView };
export default LoginView;
