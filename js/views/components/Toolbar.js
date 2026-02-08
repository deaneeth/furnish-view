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
    'desk': '🖥️'
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
     */
    constructor({
        onFurnitureSelect = () => {},
        onUndo = () => {},
        onDelete = () => {},
        onExport = () => {}
    } = {}) {
        this.onFurnitureSelect = onFurnitureSelect;
        this.onUndo = onUndo;
        this.onDelete = onDelete;
        this.onExport = onExport;
        
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
                    </div>
                </div>
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
                    title="${escapedLabel} (${item.defaultWidth}m × ${item.defaultDepth}m)"
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
     * Get the currently selected furniture type
     * @returns {string|null} Selected furniture type or null
     */
    getSelectedType() {
        return this.selectedType;
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
}

export { Toolbar };
export default Toolbar;
