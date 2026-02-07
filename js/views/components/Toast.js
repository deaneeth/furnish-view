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
 * Toast notification container element
 * @type {HTMLElement|null}
 */
let toastContainer = null;

/**
 * Toast notification component (singleton)
 */
const Toast = {
    /**
     * Initialize the toast container
     */
    init() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    },
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: 'success', 'error', 'info'
     * @param {number} duration - Auto-dismiss duration in ms (default 3000)
     */
    show(message, type = 'info', duration = 3000) {
        this.init();
        
        // TODO: Implement toast rendering
        // - Create toast element with type class
        // - Animate in (slide from right)
        // - Auto-dismiss after duration
        // - Animate out
        console.info(`[Toast] ${type.toUpperCase()}: ${message}`);
    },
    
    /**
     * Show a success toast
     * @param {string} message - Message to display
     */
    success(message) {
        this.show(message, 'success');
    },
    
    /**
     * Show an error toast
     * @param {string} message - Message to display
     */
    error(message) {
        this.show(message, 'error');
    },
    
    /**
     * Show an info toast
     * @param {string} message - Message to display
     */
    info(message) {
        this.show(message, 'info');
    }
};

export { Toast };
export default Toast;
