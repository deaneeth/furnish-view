/**
 * FurnishView — Toolbar Component
 * 
 * Renders the furniture catalogue and action buttons in the editor.
 * Allows selecting furniture types to place on canvas.
 * 
 * Nielsen Heuristic #6: Recognition rather than recall — visual thumbnails not text dropdown
 * 
 * @file js/views/components/Toolbar.js
 * @module views/components/Toolbar
 */

/**
 * Emoji map for furniture types
 * @type {Object<string, string>}
 */
const FURNITURE_ICONS = {
    'chair': '🪑',
    'dining-table': '🍽️',
    'side-table': '🛏️',
    'sofa': '🛋️',
    'armchair': '💺',
    'coffee-table': '☕',
    'bookshelf': '📚',
    'desk': '🖥️',
    'tv-stand': '📺',
    'bed': '🛏️',
    'wardrobe': '🚪',
    'rug': '🟫'
};

/**
 * Toolbar component
 * Provides furniture selection and editor actions
 */
class Toolbar {
    /**
     * Create a Toolbar instance
     * @param {Object} options - Configuration
     * @param {Function} options.onFurnitureSelect - Callback when furniture type is selected
     * @param {Function} options.onUndo - Callback for undo action
     * @param {Function} options.onDelete - Callback for delete selected action
     * @param {Function} options.onExport - Callback for export as PNG action
     * @param {Function} options.onAutoArrange - Callback for auto-arrange action
     */
    constructor({
        onFurnitureSelect = () => {},
        onUndo = () => {},
        onDelete = () => {},
        onExport = () => {},
        onAutoArrange = () => {}
    } = {}) {
        this.onFurnitureSelect = onFurnitureSelect;
        this.onUndo = onUndo;
        this.onDelete = onDelete;
        this.onExport = onExport;
        this.onAutoArrange = onAutoArrange;
        
        this.selectedType = null;
        this.container = null;
    }
    
    /**
     * Render the toolbar into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} furnitureCatalogue - Available furniture types
     */
    render(container, furnitureCatalogue = []) {
        if (!container) return;
        
        this.container = container;
        
        container.innerHTML = `
            <div class="toolbar-content">
                <div class="toolbar-section">
                    <h3 class="toolbar-section-title">Furniture</h3>
                    <div class="toolbar-furniture-grid">
                        ${this._renderFurnitureButtons(furnitureCatalogue)}
                    </div>
                    <div class="toolbar-item-count" id="toolbar-item-count"></div>
                </div>
                
                <hr class="toolbar-divider" />
                
                <div class="toolbar-section">
                    <h3 class="toolbar-section-title">Actions</h3>
                    <div class="toolbar-actions">
                        <button 
                            type="button" 
                            class="toolbar-action-btn" 
                            data-action="undo"
                            title="Undo (Ctrl+Z)"
                            aria-label="Undo last action"
                        >
                            <span class="toolbar-btn-icon">↩️</span>
                            <span class="toolbar-btn-label">Undo</span>
                        </button>
                        <button 
                            type="button" 
                            class="toolbar-action-btn toolbar-action-danger" 
                            data-action="delete"
                            title="Delete Selected (Del)"
                            aria-label="Delete selected furniture"
                        >
                            <span class="toolbar-btn-icon">🗑️</span>
                            <span class="toolbar-btn-label">Delete</span>
                        </button>
                        <button
                            type="button"
                            class="toolbar-action-btn"
                            data-action="export"
                            title="Export as PNG"
                            aria-label="Export design as PNG image"
                        >
                            <span class="toolbar-btn-icon">📷</span>
                            <span class="toolbar-btn-label">Export</span>
                        </button>
                        <button
                            type="button"
                            class="toolbar-action-btn toolbar-action-arrange"
                            data-action="auto-arrange"
                            title="Auto Arrange Furniture"
                            aria-label="Automatically arrange all furniture"
                        >
                            <span class="toolbar-btn-icon">✨</span>
                            <span class="toolbar-btn-label">Arrange</span>
                        </button>
                    </div>
                </div>
                
                ${this._renderShortcutsSection()}
            </div>
        `;
        
        this._bindEvents();
    }
    
    /**
     * Render furniture type buttons
     * @param {Array} catalogue - Furniture catalogue array
     * @returns {string} HTML string for furniture buttons
     * @private
     */
    _renderFurnitureButtons(catalogue) {
        if (!Array.isArray(catalogue) || catalogue.length === 0) {
            return '<p class="toolbar-empty">No furniture available</p>';
        }
        
        return catalogue.map(item => {
            const icon = FURNITURE_ICONS[item.type] || '📦';
            const isSelected = this.selectedType === item.type;
            const escapedLabel = this._escapeHtml(item.label);
            
            return `
                <button 
                    type="button"
                    class="toolbar-furniture-btn ${isSelected ? 'active' : ''}"
                    data-furniture-type="${item.type}"
                    title="${escapedLabel} — Click, then click on canvas to place"
                    aria-label="Place ${escapedLabel}"
                    aria-pressed="${isSelected}"
                >
                    <span class="toolbar-btn-icon">${icon}</span>
                    <span class="toolbar-btn-label">${escapedLabel}</span>
                </button>
            `;
        }).join('');
    }
    
    /**
     * Bind event listeners
     * @private
     */
    _bindEvents() {
        if (!this.container) return;
        
        // Furniture buttons
        const furnitureBtns = this.container.querySelectorAll('.toolbar-furniture-btn');
        furnitureBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.furnitureType;
                this._selectFurnitureType(type);
            });
        });
        
        // Action buttons
        const actionBtns = this.container.querySelectorAll('.toolbar-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this._handleAction(action);
            });
        });
        
        // Shortcuts toggle
        const shortcutsToggle = this.container.querySelector('#shortcuts-toggle');
        const shortcutsBody = this.container.querySelector('#shortcuts-body');
        if (shortcutsToggle && shortcutsBody) {
            shortcutsToggle.addEventListener('click', () => {
                const isExpanded = shortcutsToggle.getAttribute('aria-expanded') === 'true';
                shortcutsToggle.setAttribute('aria-expanded', String(!isExpanded));
                shortcutsBody.classList.toggle('expanded', !isExpanded);
            });
        }
    }
    
    /**
     * Select a furniture type for placement
     * @param {string} type - Furniture type to select
     * @private
     */
    _selectFurnitureType(type) {
        // Toggle selection - clicking same type deselects
        if (this.selectedType === type) {
            this.selectedType = null;
        } else {
            this.selectedType = type;
        }
        
        // Update button visual states
        this._updateButtonStates();
        
        // Trigger callback
        this.onFurnitureSelect(this.selectedType);
    }
    
    /**
     * Update button active states
     * @private
     */
    _updateButtonStates() {
        if (!this.container) return;
        
        const buttons = this.container.querySelectorAll('.toolbar-furniture-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.furnitureType === this.selectedType;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });
    }
    
    /**
     * Handle action button click
     * @param {string} action - Action type
     * @private
     */
    _handleAction(action) {
        switch (action) {
            case 'undo':
                this.onUndo();
                break;
            case 'delete':
                this.onDelete();
                break;
            case 'export':
                this.onExport();
                break;
            case 'auto-arrange':
                this.onAutoArrange();
                break;
        }
    }
    
    /**
     * Clear the current selection
     */
    clearSelection() {
        this.selectedType = null;
        this._updateButtonStates();
    }
    
    /**
     * Set the selected furniture type (for canvas selection feedback)
     * @param {string|null} type - Furniture type to highlight, or null to clear
     */
    setSelectedType(type) {
        this.selectedType = type || null;
        this._updateButtonStates();
    }
    
    /**
     * Get the currently selected furniture type
     * @returns {string|null} Selected furniture type or null
     */
    getSelectedType() {
        return this.selectedType;
    }

    /**
     * Enable or disable the toolbar.
     *
     * When disabled, pointer events are blocked and the toolbar is
     * visually dimmed. Any active furniture selection is cleared to
     * prevent stale placing mode when re-enabled.
     *
     * @param {boolean} disabled - True to disable, false to enable
     */
    setDisabled(disabled) {
        if (!this.container) return;

        // Only disable the furniture selection grid, not the action
        // buttons (Undo, Delete, Export) — those remain usable in 3D.
        const furnitureGrid = this.container.querySelector('.toolbar-furniture-grid');
        const sectionTitle = this.container.querySelector('.toolbar-section-title');

        if (disabled) {
            furnitureGrid?.classList.add('disabled');
            sectionTitle?.classList.add('disabled');
            furnitureGrid?.setAttribute('aria-disabled', 'true');
            this.clearSelection();
        } else {
            furnitureGrid?.classList.remove('disabled');
            sectionTitle?.classList.remove('disabled');
            furnitureGrid?.removeAttribute('aria-disabled');
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Render collapsible keyboard shortcuts section
     * Nielsen #10: Help and documentation — available but not intrusive
     * @returns {string} HTML string for shortcuts section
     * @private
     */
    _renderShortcutsSection() {
        return `
            <div class="toolbar-shortcuts">
                <button 
                    type="button" 
                    class="toolbar-shortcuts-toggle"
                    id="shortcuts-toggle"
                    aria-expanded="false"
                    aria-controls="shortcuts-body"
                >
                    <span>⌨️ Shortcuts</span>
                    <span class="toolbar-shortcuts-toggle-icon">▼</span>
                </button>
                <div class="toolbar-shortcuts-body" id="shortcuts-body" role="region">
                    <div class="toolbar-shortcut-item">
                        <kbd class="toolbar-shortcut-key">Del</kbd>
                        <span>Remove selected item</span>
                    </div>
                    <div class="toolbar-shortcut-item">
                        <kbd class="toolbar-shortcut-key">Ctrl+Z</kbd>
                        <span>Undo last action</span>
                    </div>
                    <div class="toolbar-shortcut-item">
                        <kbd class="toolbar-shortcut-key">Esc</kbd>
                        <span>Deselect / cancel</span>
                    </div>
                    <div class="toolbar-shortcut-item">
                        <kbd class="toolbar-shortcut-key">Shift+Drag</kbd>
                        <span>Snap rotation to 15°</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update the item count badge in the toolbar
     * @param {number} count - Number of furniture items placed
     */
    updateItemCount(count) {
        if (!this.container) return;
        const badge = this.container.querySelector('#toolbar-item-count');
        if (!badge) return;
        
        if (count > 0) {
            badge.textContent = `${count} item${count !== 1 ? 's' : ''} placed`;
        } else {
            badge.textContent = '';
        }
    }
}

export { Toolbar };
export default Toolbar;
