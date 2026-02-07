/**
 * FurnishView — Toast Component
 * 
 * Non-blocking notification component for user feedback.
 * Shows success, error, and info messages with auto-dismiss.
 * 
 * Implements Nielsen Heuristic #1: Visibility of system status.
 * 
 * @file js/views/components/Toast.js
 * @module views/components/Toast
 */

/**
 * Maximum number of toasts visible at once
 * @type {number}
 */
const MAX_VISIBLE_TOASTS = 5;

/**
 * Toast container element reference
 * @type {HTMLElement|null}
 */
let toastContainer = null;

/**
 * Active toast count
 * @type {number}
 */
let activeToastCount = 0;

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 * @private
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get icon SVG for toast type
 * @param {string} type - Toast type
 * @returns {string} SVG icon HTML
 * @private
 */
function getToastIcon(type) {
    const icons = {
        success: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor"/>
        </svg>`,
        error: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/>
        </svg>`,
        info: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
        </svg>`,
        warning: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="currentColor"/>
        </svg>`
    };
    return icons[type] || icons.info;
}

/**
 * Toast notification component (singleton)
 * Provides visual feedback for user actions
 */
const Toast = {
    /**
     * Initialize the toast container
     * Creates the container element if it doesn't exist
     * @private
     */
    init() {
        if (toastContainer && document.body.contains(toastContainer)) {
            return;
        }
        
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('role', 'region');
        toastContainer.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(toastContainer);
    },
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: 'success', 'error', 'info', 'warning'
     * @param {number} duration - Auto-dismiss duration in ms (default 3000)
     */
    show(message, type = 'info', duration = 3000) {
        // Validate inputs
        if (typeof message !== 'string' || message.trim().length === 0) {
            return;
        }
        
        // Validate type
        const validTypes = ['success', 'error', 'info', 'warning'];
        const safeType = validTypes.includes(type) ? type : 'info';
        
        // Validate duration
        const safeDuration = Math.max(1000, Math.min(10000, Number(duration) || 3000));
        
        // Initialize container
        this.init();
        
        // Limit visible toasts
        if (activeToastCount >= MAX_VISIBLE_TOASTS) {
            const oldestToast = toastContainer.querySelector('.toast');
            if (oldestToast) {
                this.dismissToast(oldestToast);
            }
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${safeType}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        toast.innerHTML = `
            ${getToastIcon(safeType)}
            <span class="toast-message">${escapeHtml(message)}</span>
            <button type="button" class="toast-dismiss" aria-label="Dismiss notification">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        
        // Add dismiss button handler
        const dismissBtn = toast.querySelector('.toast-dismiss');
        dismissBtn?.addEventListener('click', () => {
            this.dismissToast(toast);
        });
        
        // Add to container
        toastContainer.appendChild(toast);
        activeToastCount++;
        
        // Trigger slide-in animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });
        
        // Auto-dismiss after duration
        const timeoutId = setTimeout(() => {
            this.dismissToast(toast);
        }, safeDuration);
        
        // Store timeout ID for cleanup
        toast.dataset.timeoutId = timeoutId.toString();
    },
    
    /**
     * Dismiss a specific toast
     * @param {HTMLElement} toast - Toast element to dismiss
     * @private
     */
    dismissToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        // Clear auto-dismiss timeout
        const timeoutId = toast.dataset.timeoutId;
        if (timeoutId) {
            clearTimeout(parseInt(timeoutId, 10));
        }
        
        // Animate out
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hiding');
        
        // Remove after animation
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
                activeToastCount = Math.max(0, activeToastCount - 1);
            }
        }, 300); // Match CSS transition duration
    },
    
    /**
     * Show a success toast
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - Display duration in ms
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    },
    
    /**
     * Show an error toast
     * @param {string} message - Message to display
     * @param {number} [duration=4000] - Display duration in ms (longer for errors)
     */
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    },
    
    /**
     * Show an info toast
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - Display duration in ms
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    },
    
    /**
     * Show a warning toast
     * @param {string} message - Message to display
     * @param {number} [duration=3500] - Display duration in ms
     */
    warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    },
    
    /**
     * Clear all visible toasts
     */
    clear() {
        if (!toastContainer) return;
        
        const toasts = toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => {
            this.dismissToast(toast);
        });
    }
};

export { Toast };
export default Toast;
