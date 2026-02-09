/**
 * FurnishView — Modal Component
 * 
 * Reusable modal dialog for confirmations, room setup, and save dialogs.
 * Supports focus trapping and keyboard navigation (Escape to close).
 * 
 * Implements Nielsen Heuristics:
 * - #3 User control and freedom (Escape to close, backdrop click)
 * - #5 Error prevention (confirmation for destructive actions)
 * 
 * @file js/views/components/Modal.js
 * @module views/components/Modal
 */

/**
 * Modal backdrop element
 * @type {HTMLElement|null}
 */
let modalBackdrop = null;

/**
 * Previously focused element before modal opened
 * @type {HTMLElement|null}
 */
let previouslyFocusedElement = null;

/**
 * Keyboard event handler reference
 * @type {Function|null}
 */
let keydownHandler = null;

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 * @private
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get all focusable elements within an element
 * @param {HTMLElement} element - Container element
 * @returns {HTMLElement[]} Array of focusable elements
 * @private
 */
function getFocusableElements(element) {
    const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(element.querySelectorAll(focusableSelectors));
}

/**
 * Modal component (singleton)
 * Displays centered modal dialogs with backdrop
 */
const Modal = {
    /**
     * Currently displayed modal element
     * @type {HTMLElement|null}
     */
    currentModal: null,
    
    /**
     * Callbacks for current modal
     * @type {Object}
     * @private
     */
    callbacks: {
        onConfirm: null,
        onCancel: null
    },
    
    /**
     * Show a modal dialog
     * @param {Object} options - Modal configuration
     * @param {string} options.title - Modal title
     * @param {string} options.content - HTML content for modal body
     * @param {string} [options.confirmText='Confirm'] - Confirm button text
     * @param {string} [options.cancelText='Cancel'] - Cancel button text
     * @param {Function} [options.onConfirm] - Confirm callback
     * @param {Function} [options.onCancel] - Cancel callback
     * @param {boolean} [options.isDanger=false] - If true, confirm button is danger styled
     * @param {boolean} [options.hideCancel=false] - If true, hide cancel button (for info modals)
     */
    show({
        title = '',
        content = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = () => {},
        onCancel = () => {},
        isDanger = false,
        hideCancel = false
    } = {}) {
        // Close any existing modal first
        if (this.currentModal) {
            this.close();
        }
        
        // Store callbacks
        this.callbacks.onConfirm = onConfirm;
        this.callbacks.onCancel = onCancel;
        
        // Store previously focused element for restoration
        previouslyFocusedElement = document.activeElement;
        
        // Create backdrop
        modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        modalBackdrop.setAttribute('aria-hidden', 'true');
        
        // Create modal
        this.currentModal = document.createElement('div');
        this.currentModal.className = 'modal';
        this.currentModal.setAttribute('role', 'dialog');
        this.currentModal.setAttribute('aria-modal', 'true');
        this.currentModal.setAttribute('aria-labelledby', 'modal-title');
        
        // Determine button classes
        const confirmButtonClass = isDanger ? 'btn btn-danger' : 'btn btn-primary';
        const cancelButtonHtml = hideCancel ? '' : `
            <button type="button" class="btn btn-secondary modal-cancel">
                ${escapeHtml(cancelText)}
            </button>
        `;
        
        this.currentModal.innerHTML = `
            <div class="modal-card">
                <header class="modal-header">
                    <h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>
                    <button type="button" class="modal-close" aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </header>
                <div class="modal-body">
                    ${content}
                </div>
                <footer class="modal-footer">
                    ${cancelButtonHtml}
                    <button type="button" class="${confirmButtonClass} modal-confirm">
                        ${escapeHtml(confirmText)}
                    </button>
                </footer>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(modalBackdrop);
        document.body.appendChild(this.currentModal);
        document.body.classList.add('modal-open');
        
        // Trigger animation
        requestAnimationFrame(() => {
            modalBackdrop.classList.add('modal-backdrop-visible');
            this.currentModal.classList.add('modal-visible');
        });
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Focus first focusable element (usually cancel or confirm button)
        requestAnimationFrame(() => {
            const focusableElements = getFocusableElements(this.currentModal);
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        });
    },
    
    /**
     * Attach modal event listeners
     * @private
     */
    attachEventListeners() {
        if (!this.currentModal) return;
        
        // Close button
        const closeBtn = this.currentModal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => this.handleCancel());
        
        // Cancel button
        const cancelBtn = this.currentModal.querySelector('.modal-cancel');
        cancelBtn?.addEventListener('click', () => this.handleCancel());
        
        // Confirm button
        const confirmBtn = this.currentModal.querySelector('.modal-confirm');
        confirmBtn?.addEventListener('click', () => this.handleConfirm());
        
        // Backdrop click
        modalBackdrop?.addEventListener('click', () => this.handleCancel());
        
        // Close when clicking outside modal-card (backdrop click on modal container)
        this.currentModal.addEventListener('click', (e) => {
            // Only close if clicking directly on the modal container, not on modal-card or its children
            if (e.target === this.currentModal) {
                this.handleCancel();
            }
        });
        
        // Keyboard events
        keydownHandler = (event) => this.handleKeydown(event);
        document.addEventListener('keydown', keydownHandler);
    },
    
    /**
     * Handle keydown events for modal
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeydown(event) {
        if (!this.currentModal) return;
        
        // Escape to close
        if (event.key === 'Escape') {
            event.preventDefault();
            this.handleCancel();
            return;
        }
        
        // Tab trap (focus trap)
        if (event.key === 'Tab') {
            const focusableElements = getFocusableElements(this.currentModal);
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (event.shiftKey) {
                // Shift + Tab: if on first element, go to last
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab: if on last element, go to first
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    },
    
    /**
     * Handle confirm action
     * @private
     */
    handleConfirm() {
        const callback = this.callbacks.onConfirm;
        this.close();
        if (typeof callback === 'function') {
            callback();
        }
    },
    
    /**
     * Handle cancel action
     * @private
     */
    handleCancel() {
        const callback = this.callbacks.onCancel;
        this.close();
        if (typeof callback === 'function') {
            callback();
        }
    },
    
    /**
     * Close the current modal
     */
    close() {
        if (!this.currentModal) return;
        
        // Remove keyboard listener
        if (keydownHandler) {
            document.removeEventListener('keydown', keydownHandler);
            keydownHandler = null;
        }
        
        // Animate out
        this.currentModal.classList.remove('modal-visible');
        this.currentModal.classList.add('modal-hiding');
        modalBackdrop?.classList.remove('modal-backdrop-visible');
        
        // Remove after animation
        const modal = this.currentModal;
        const backdrop = modalBackdrop;
        
        setTimeout(() => {
            modal?.parentElement?.removeChild(modal);
            backdrop?.parentElement?.removeChild(backdrop);
            document.body.classList.remove('modal-open');
        }, 200); // Match CSS transition duration
        
        // Clear references
        this.currentModal = null;
        modalBackdrop = null;
        this.callbacks.onConfirm = null;
        this.callbacks.onCancel = null;
        
        // Restore focus to previously focused element
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
            previouslyFocusedElement.focus();
        }
        previouslyFocusedElement = null;
    },
    
    /**
     * Show a confirmation modal for delete actions
     * @param {string} itemName - Name of item being deleted
     * @param {Function} onConfirm - Callback if confirmed
     */
    confirmDelete(itemName, onConfirm) {
        this.show({
            title: 'Delete Design',
            content: `<p>Are you sure you want to delete <strong>${escapeHtml(itemName)}</strong>?</p><p class="text-muted">This action cannot be undone.</p>`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            isDanger: true,
            onConfirm
        });
    },
    
    /**
     * Show an alert modal (info only, single button)
     * @param {string} title - Modal title
     * @param {string} message - Message to display
     * @param {Function} [onClose] - Callback when closed
     */
    alert(title, message, onClose = () => {}) {
        this.show({
            title,
            content: `<p>${escapeHtml(message)}</p>`,
            confirmText: 'OK',
            hideCancel: true,
            onConfirm: onClose
        });
    },
    
    /**
     * Show unsaved changes confirmation modal
     * Three options: Save, Discard, Cancel
     * @param {Object} options - Configuration options
     * @param {Function} options.onSave - Callback when Save is clicked
     * @param {Function} options.onDiscard - Callback when Discard is clicked
     * @param {Function} [options.onCancel] - Callback when Cancel is clicked
     */
    confirmUnsavedChanges({ onSave, onDiscard, onCancel = () => {} }) {
        // Close any existing modal first
        if (this.currentModal) {
            this.close();
        }
        
        // Store previously focused element for restoration
        previouslyFocusedElement = document.activeElement;
        
        // Create backdrop
        modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        modalBackdrop.setAttribute('aria-hidden', 'true');
        
        // Create modal
        this.currentModal = document.createElement('div');
        this.currentModal.className = 'modal';
        this.currentModal.setAttribute('role', 'dialog');
        this.currentModal.setAttribute('aria-modal', 'true');
        this.currentModal.setAttribute('aria-labelledby', 'modal-title');
        
        this.currentModal.innerHTML = `
            <div class="modal-card">
                <header class="modal-header">
                    <h2 id="modal-title" class="modal-title">Unsaved Changes</h2>
                    <button type="button" class="modal-close" aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </header>
                <div class="modal-body">
                    <p>You have unsaved changes. What would you like to do?</p>
                </div>
                <footer class="modal-footer modal-footer-three-btn">
                    <button type="button" class="btn btn-secondary modal-cancel-btn">Cancel</button>
                    <button type="button" class="btn btn-ghost modal-discard-btn">Discard</button>
                    <button type="button" class="btn btn-primary modal-save-btn">Save</button>
                </footer>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(modalBackdrop);
        document.body.appendChild(this.currentModal);
        document.body.classList.add('modal-open');
        
        // Trigger animation
        requestAnimationFrame(() => {
            modalBackdrop.classList.add('modal-backdrop-visible');
            this.currentModal.classList.add('modal-visible');
        });
        
        // Button handlers
        const saveBtn = this.currentModal.querySelector('.modal-save-btn');
        const discardBtn = this.currentModal.querySelector('.modal-discard-btn');
        const cancelBtn = this.currentModal.querySelector('.modal-cancel-btn');
        const closeBtn = this.currentModal.querySelector('.modal-close');
        
        saveBtn?.addEventListener('click', () => {
            this.close();
            if (typeof onSave === 'function') onSave();
        });
        
        discardBtn?.addEventListener('click', () => {
            this.close();
            if (typeof onDiscard === 'function') onDiscard();
        });
        
        cancelBtn?.addEventListener('click', () => {
            this.close();
            if (typeof onCancel === 'function') onCancel();
        });
        
        closeBtn?.addEventListener('click', () => {
            this.close();
            if (typeof onCancel === 'function') onCancel();
        });
        
        // Backdrop click = cancel
        modalBackdrop?.addEventListener('click', () => {
            this.close();
            if (typeof onCancel === 'function') onCancel();
        });
        
        // Keyboard events
        keydownHandler = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
                if (typeof onCancel === 'function') onCancel();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        
        // Focus save button
        requestAnimationFrame(() => {
            saveBtn?.focus();
        });
    }
};

export { Modal };
export default Modal;
