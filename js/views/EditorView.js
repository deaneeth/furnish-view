/**
 * FurnishView — Editor View
 * 
 * Renders the main design editor with toolbar, canvas, and sidebar.
 * Coordinates between 2D canvas, 3D view, and property panels.
 * Uses CSS Grid layout for the workspace structure.
 * 
 * Layout: TOP BAR | LEFT TOOLBAR | CENTER CANVAS | RIGHT SIDEBAR | BOTTOM STATUS
 * 
 * @file js/views/EditorView.js
 * @module views/EditorView
 */

import { Toolbar } from './components/Toolbar.js';
import { Sidebar } from './components/Sidebar.js';
import { Toast } from './components/Toast.js';
import { furnitureCatalogue } from '../data/furnitureCatalogue.js';
import { Renderer2D } from '../graphics/Renderer2D.js';
import { Renderer3D } from '../graphics/Renderer3D.js';
import { ColourManager } from '../graphics/ColourManager.js';
import { CanvasController } from '../controllers/CanvasController.js';
import { Modal } from './components/Modal.js';

/**
 * EditorView class
 * Manages the main editor layout and component coordination
 */
class EditorView {
    /**
     * Create an EditorView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onSave - Callback for save action
     * @param {Function} options.onBack - Callback for back to dashboard
     * @param {Function} options.onToggle3D - Callback for 2D/3D toggle
     */
    constructor({
        onSave = () => {},
        onBack = () => {},
        onToggle3D = () => {}
    } = {}) {
        this.onSave = onSave;
        this.onBack = onBack;
        this.onToggle3D = onToggle3D;
        
        this.currentView = '2d'; // '2d' or '3d'
        this.design = null;
        this.selectedFurniture = null;
        this.hasUnsavedChanges = false;
        
        // Component instances
        this.toolbar = null;
        this.sidebar = null;
        this.renderer2d = null;
        this.renderer3d = null;
        this.canvasController = null;
        
        // DOM references
        this.container = null;
        this.canvasContainer = null;
        this.canvas = null;
        this.view3DContainer = null;
        
        // Bound methods for event cleanup
        this._boundHandleKeyDown = this._handleKeyDown.bind(this);
        this._boundHandleResize = this._handleResize.bind(this);
        
        // Debounce timers for Toast notifications
        this._colourToastTimer = null;
        this._furnitureColourToastTimer = null;
    }
    
    /**
     * Render the editor view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} design - The design to edit
     */
    render(container, design = null) {
        if (!container) return;
        
        this.container = container;
        this.design = design;
        
        // Build the editor layout HTML
        container.innerHTML = this._buildLayoutHTML();
        
        // Cache DOM references
        this._cacheElements();
        
        // Initialize child components
        this._initializeComponents();
        
        // Bind events
        this._bindEvents();
        
        // Initial sidebar render
        this._updateSidebar();
    }
    
    /**
     * Build the main editor layout HTML structure
     * @returns {string} HTML string for the editor layout
     * @private
     */
    _buildLayoutHTML() {
        const designName = this.design?.name || 'Untitled Design';
        const escapedName = this._escapeHtml(designName);
        
        return `
            <div class="editor-layout">
                <!-- TOP BAR -->
                <header class="editor-top-bar">
                    <div class="editor-top-left">
                        <button type="button" class="btn btn-ghost btn-sm editor-back-btn" aria-label="Back to Dashboard">
                            <span class="btn-icon">←</span>
                            <span class="btn-text">Dashboard</span>
                        </button>
                        <input 
                            type="text" 
                            class="editor-design-name" 
                            value="${escapedName}"
                            placeholder="Design Name"
                            maxlength="100"
                            aria-label="Design name"
                        />
                    </div>
                    
                    <div class="editor-top-center">
                        <div class="view-toggle">
                            <div class="view-toggle-indicator" id="toggle-indicator"></div>
                            <button type="button" class="view-toggle-btn active" data-view="2d">2D Layout</button>
                            <button type="button" class="view-toggle-btn" data-view="3d">3D Preview</button>
                        </div>
                    </div>
                    
                    <div class="editor-top-right">
                        <span class="save-status save-status-saved" id="save-status">Saved ✓</span>
                        <button type="button" class="btn btn-primary btn-sm editor-save-btn">
                            <span class="btn-icon">💾</span>
                            <span class="btn-text">Save</span>
                        </button>
                    </div>
                </header>
                
                <!-- MAIN CONTENT AREA -->
                <div class="editor-main-content">
                    <!-- LEFT TOOLBAR -->
                    <aside class="editor-toolbar" aria-label="Furniture Toolbar">
                        <div class="toolbar-container"></div>
                    </aside>
                    
                    <!-- CENTER CANVAS -->
                    <main class="editor-canvas-area">
                        <button type="button" class="sidebar-toggle-btn" id="sidebar-toggle" aria-label="Toggle properties panel" title="Toggle sidebar">☰</button>
                        <div class="canvas-wrapper">
                            <div class="canvas-container">
                                <canvas id="room-canvas" class="canvas-2d" width="800" height="600"></canvas>
                            </div>
                            <div id="view-3d-container" class="view-3d-container" hidden>
                                <!-- Three.js scene will be mounted here -->
                            </div>
                        </div>
                    </main>
                    
                    <!-- RIGHT SIDEBAR -->
                    <aside class="editor-sidebar" aria-label="Properties Panel">
                        <div class="sidebar-container"></div>
                    </aside>
                </div>
                
                <!-- BOTTOM STATUS BAR -->
                <footer class="editor-status-bar">
                    <div class="status-left">
                        <span class="status-item" id="status-room-info">
                            ${this._getRoomInfoText()}
                        </span>
                    </div>
                    <div class="status-center">
                        <span class="status-item" id="status-selection">
                            ${this._getSelectionText()}
                        </span>
                    </div>
                    <div class="status-right">
                        <span class="status-item" id="status-scale">
                            ${this._getScaleText()}
                        </span>
                    </div>
                </footer>
            </div>
        `;
    }
    
    /**
     * Get room dimensions text for status bar
     * @returns {string} Room info text
     * @private
     */
    _getRoomInfoText() {
        if (!this.design?.room) {
            return 'No room data';
        }
        const room = this.design.room;
        return `Room: ${room.width}m × ${room.depth}m × ${room.height}m`;
    }
    
    /**
     * Cache DOM element references
     * @private
     */
    _cacheElements() {
        this.canvasContainer = this.container.querySelector('.canvas-container');
        this.canvas = this.container.querySelector('#room-canvas');
        this.view3DContainer = this.container.querySelector('#view-3d-container');
        this.toolbarContainer = this.container.querySelector('.toolbar-container');
        this.sidebarContainer = this.container.querySelector('.sidebar-container');
        this.sidebarPanel = this.container.querySelector('.editor-sidebar');
        this.designNameInput = this.container.querySelector('.editor-design-name');
        this.saveBtn = this.container.querySelector('.editor-save-btn');
        this.backBtn = this.container.querySelector('.editor-back-btn');
        this.viewToggleBtns = this.container.querySelectorAll('.view-toggle-btn');
        this.toggleIndicator = this.container.querySelector('#toggle-indicator');
        this.saveStatusEl = this.container.querySelector('#save-status');
        this.sidebarToggleBtn = this.container.querySelector('#sidebar-toggle');
        this.canvasArea = this.container.querySelector('.editor-canvas-area');
    }
    
    /**
     * Initialize child components (Toolbar and Sidebar)
     * @private
     */
    _initializeComponents() {
        // Initialize Toolbar
        this.toolbar = new Toolbar({
            onFurnitureSelect: (type) => this._handleFurnitureSelect(type),
            onUndo: () => this._handleUndo(),
            onDelete: () => this._handleDelete(),
            onExport: () => this._handleExport()
        });
        this.toolbar.render(this.toolbarContainer, furnitureCatalogue);
        
        // Initialize Sidebar
        this.sidebar = new Sidebar({
            onRoomChange: (property, value) => this._handleRoomChange(property, value),
            onFurnitureChange: (property, value) => this._handleFurnitureChange(property, value)
        });
        
        // Initialize 2D Renderer
        this._initializeRenderer();
    }
    
    /**
     * Bind event listeners
     * @private
     */
    _bindEvents() {
        // Save button
        this.saveBtn?.addEventListener('click', () => this._handleSave());
        
        // Back button
        this.backBtn?.addEventListener('click', () => this._handleBack());
        
        // Design name input
        this.designNameInput?.addEventListener('input', (e) => {
            if (this.design) {
                this.design.name = e.target.value.trim() || 'Untitled Design';
                this.hasUnsavedChanges = true;
                this._updateSaveStatus();
            }
        });
        
        // View toggle buttons
        this.viewToggleBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view && view !== this.currentView) {
                    this.switchView(view);
                }
            });
        });
        
        // Sidebar toggle (narrow screens)
        this.sidebarToggleBtn?.addEventListener('click', () => {
            this.sidebarPanel?.classList.toggle('sidebar-open');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this._boundHandleKeyDown);

        // Window resize — update both 2D and 3D renderers
        window.addEventListener('resize', this._boundHandleResize);
    }
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    _handleKeyDown(e) {
        // Only handle if editor is active
        if (!this.container || !document.body.contains(this.container)) {
            return;
        }
        
        // Ctrl+S / Cmd+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this._handleSave();
            return;
        }
        
        // Ctrl+Z / Cmd+Z - Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            this._handleUndo();
            return;
        }
        
        // Delete or Backspace - Delete selected
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedFurniture) {
            // Only if not focused on an input
            if (document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                this._handleDelete();
            }
        }
        
        // Escape - Deselect / cancel placing
        if (e.key === 'Escape') {
            // Cancel placing mode if active
            this.canvasController?.cancelPlacing();
            
            // Deselect furniture
            this.selectedFurniture = null;
            this.canvasController?.deselectAll?.();
            this.toolbar?.clearSelection();
            this._updateSidebar();
            this._updateStatusSelection();
        }
    }
    
    /**
     * Handle save action
     * @private
     */
    _handleSave() {
        if (!this.design) {
            Toast.error('No design to save');
            return;
        }
        
        this.onSave(this.design);
        this.hasUnsavedChanges = false;
        this._updateSaveStatus();
    }
    
    /**
     * Handle back navigation
     * Shows Save/Discard/Cancel modal if there are unsaved changes
     * @private
     */
    _handleBack() {
        if (this.hasUnsavedChanges) {
            Modal.confirmUnsavedChanges({
                onSave: () => {
                    // Save first, then navigate back
                    this._handleSave();
                    this.onBack();
                },
                onDiscard: () => {
                    // Discard changes and navigate back
                    this.hasUnsavedChanges = false;
                    this.onBack();
                },
                onCancel: () => {
                    // Stay in editor, do nothing
                }
            });
            return;
        }
        
        this.onBack();
    }
    
    /**
     * Handle furniture type selection from toolbar
     * @param {string} type - Furniture type selected
     * @private
     */
    _handleFurnitureSelect(type) {
        // Delegate placing mode to controller
        if (type) {
            this.canvasController?.startPlacing(type);
        } else {
            this.canvasController?.cancelPlacing();
        }
    }
    
    /**
     * Handle undo action
     * @private
     */
    _handleUndo() {
        if (this.canvasController?.undo()) {
            Toast.success('Undo successful');
        } else {
            Toast.info('Nothing to undo');
        }
    }
    
    /**
     * Handle delete selected furniture
     * @private
     */
    _handleDelete() {
        if (this.canvasController?.deleteSelected()) {
            Toast.success('Furniture deleted');
        } else {
            Toast.info('No furniture selected');
        }
    }
    
    /**
     * Handle export as PNG.
     *
     * Captures the current view (2D canvas or 3D scene) and triggers
     * a browser download of the resulting PNG image.
     *
     * @private
     */
    _handleExport() {
        let dataUrl = null;

        if (this.currentView === '3d' && this.renderer3d) {
            dataUrl = this.renderer3d.captureScreenshot();
        } else if (this.canvas) {
            dataUrl = this.canvas.toDataURL('image/png');
        }

        if (!dataUrl) {
            Toast.error('Unable to capture screenshot');
            return;
        }

        // Create a temporary anchor to trigger download
        const link = document.createElement('a');
        const designName = this.design?.name || 'design';
        const safeName = designName.replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `${safeName}_${this.currentView}.png`;
        link.href = dataUrl;
        link.click();

        Toast.success(`Exported ${this.currentView.toUpperCase()} view as PNG`);
    }
    
    /**
     * Handle room property change from sidebar
     * @param {string} property - Property name ('wallColour', 'floorColour', etc.)
     * @param {*} value - New value
     * @private
     */
    _handleRoomChange(property, value) {
        if (!this.design?.room) return;
        
        this.design.room[property] = value;
        this.hasUnsavedChanges = true;
        this._updateSaveStatus();
        
        // Debounced Toast notification for colour changes
        // Only shows after user stops dragging for 500ms
        if (property === 'wallColour' || property === 'floorColour') {
            clearTimeout(this._colourToastTimer);
            this._colourToastTimer = setTimeout(() => {
                const target = property === 'wallColour' ? 'Wall' : 'Floor';
                Toast.success(`${target} colour updated`);
            }, 500);
        }
        
        // Re-render canvas with updated room
        this._renderCanvas();
        this._updateStatusRoomInfo();

        // Synchronise 3D scene if active
        this._sync3DScene();
    }
    
    /**
     * Initialize the 2D renderer for the canvas
     * @private
     */
    _initializeRenderer() {
        if (!this.canvas) return;
        
        // Get canvas dimensions
        const width = this.canvas.width || 800;
        const height = this.canvas.height || 600;
        
        // Create Renderer2D instance
        this.renderer2d = new Renderer2D({
            canvas: this.canvas,
            width: width,
            height: height,
            showGrid: true,
            showDimensions: true
        });
        
        // Set initial room data if available
        if (this.design?.room) {
            this.renderer2d.setRoom(this.design.room);
        }
        
        // Set furniture if available
        if (this.design?.furniture) {
            this.renderer2d.setFurniture(this.design.furniture);
        }
        
        // Initialize CanvasController for interactions
        this.canvasController = new CanvasController({
            canvas: this.canvas,
            renderer2D: this.renderer2d,
            design: this.design,
            onFurnitureSelect: (item) => this._onControllerFurnitureSelect(item),
            onFurnitureUpdate: () => this._onControllerFurnitureUpdate(),
            onDesignChange: () => this._onControllerDesignChange()
        });
        
        // Initial render
        this._renderCanvas();
    }
    
    /**
     * Handle furniture selection from controller
     * @param {FurnitureItem|null} item - Selected item or null
     * @private
     */
    _onControllerFurnitureSelect(item) {
        this.selectedFurniture = item;
        
        // Highlight the furniture type in toolbar when selected on canvas
        this.toolbar?.setSelectedType(item?.type || null);
        
        this._updateSidebar();
        this._updateStatusSelection();
    }
    
    /**
     * Handle furniture position update from controller
     * @private
     */
    _onControllerFurnitureUpdate() {
        this.hasUnsavedChanges = true;
        this._updateSaveStatus();
        this._updateSidebar();
    }
    
    /**
     * Handle design change from controller (furniture added/removed)
     * @private
     */
    _onControllerDesignChange() {
        this.hasUnsavedChanges = true;
        this._updateSaveStatus();
        this._renderCanvas();
        this._updateSidebar();
        this._updateStatusFurnitureCount();

        // Synchronise 3D scene if active
        this._sync3DScene();
    }
    
    /**
     * Render the 2D canvas
     * @private
     */
    _renderCanvas() {
        if (!this.renderer2d || !this.design) return;
        
        // Update renderer with current data
        this.renderer2d.setRoom(this.design.room);
        this.renderer2d.setFurniture(this.design.furniture || []);
        this.renderer2d.setSelectedId(this.selectedFurniture?.id || null);
        
        // Trigger render
        this.renderer2d.render();
    }
    
    /**
     * Handle furniture property change from sidebar
     * @param {string} property - Property name
     * @param {*} value - New value
     * @private
     */
    _handleFurnitureChange(property, value) {
        if (!this.selectedFurniture) return;
        
        this.selectedFurniture[property] = value;
        this.hasUnsavedChanges = true;
        this._updateSaveStatus();
        
        // Debounced Toast notification for colour changes
        // Only shows after user stops dragging for 500ms
        if (property === 'colour') {
            clearTimeout(this._furnitureColourToastTimer);
            const typeName = this._formatFurnitureType(this.selectedFurniture.type);
            this._furnitureColourToastTimer = setTimeout(() => {
                Toast.success(`${typeName} colour updated`);
            }, 500);
        }
        
        // Re-render canvas with updated furniture
        this._renderCanvas();

        // Synchronise 3D scene if active
        this._sync3DScene();
    }
    
    /**
     * Switch between 2D and 3D views.
     *
     * - TO 3D: lazy-creates Renderer3D, builds scene from current design,
     *   hides 2D canvas, disables toolbar.
     * - TO 2D: shows 2D canvas, re-renders it, re-enables toolbar.
     *
     * @param {string} view - '2d' or '3d'
     */
    switchView(view) {
        if (view !== '2d' && view !== '3d') return;
        if (view === this.currentView) return;

        this.currentView = view;

        // Update toggle button states
        this.viewToggleBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Slide the indicator to match active view
        if (this.toggleIndicator) {
            this.toggleIndicator.classList.toggle('right', view === '3d');
        }

        // Crossfade transition
        if (this.canvasArea) {
            this.canvasArea.classList.add('view-crossfade');
            setTimeout(() => this.canvasArea.classList.remove('view-crossfade'), 220);
        }

        if (view === '3d') {
            this._switchTo3D();
        } else {
            this._switchTo2D();
        }

        // Update status bar
        this._updateStatusScale();

        // Trigger callback
        this.onToggle3D(view);
    }

    /**
     * Activate 3D view.
     *
     * Lazy-creates the Renderer3D on first use, then rebuilds the scene
     * from the current design state. Hides 2D canvas and disables the
     * toolbar to prevent furniture placement.
     *
     * @private
     */
    _switchTo3D() {
        // Hide 2D, show 3D
        if (this.canvasContainer) this.canvasContainer.hidden = true;
        if (this.view3DContainer) this.view3DContainer.hidden = false;

        // Lazy-initialise Renderer3D
        if (!this.renderer3d && this.view3DContainer) {
            this.renderer3d = new Renderer3D({
                container: this.view3DContainer
            });
        }

        // Build / rebuild the scene with the latest design data
        this._sync3DScene();

        // Disable toolbar — can't place furniture in 3D
        this.toolbar?.setDisabled(true);

        // Cancel any active placing mode
        this.canvasController?.cancelPlacing();
    }

    /**
     * Activate 2D view.
     *
     * Re-shows the 2D canvas, re-renders it (in case colours changed
     * while in 3D view), and re-enables the toolbar.
     *
     * @private
     */
    _switchTo2D() {
        // Hide 3D, show 2D
        if (this.view3DContainer) this.view3DContainer.hidden = true;
        if (this.canvasContainer) this.canvasContainer.hidden = false;

        // Re-render 2D canvas to pick up any model changes
        this._renderCanvas();

        // Re-enable toolbar
        this.toolbar?.setDisabled(false);
    }

    /**
     * Synchronise the 3D scene with the current design model.
     *
     * Only acts when the 3D renderer exists and the current view is 3D.
     * Safe to call at any time — it is a no-op otherwise.
     *
     * @private
     */
    _sync3DScene() {
        if (this.currentView !== '3d' || !this.renderer3d || !this.design) return;
        this.renderer3d.updateFromDesign(this.design);
    }

    /**
     * Handle window resize for both 2D and 3D renderers.
     * @private
     */
    _handleResize() {
        // 3D renderer has its own resize logic
        if (this.renderer3d) {
            this.renderer3d.handleResize();
        }

        // 2D canvas: update dimensions and re-render
        if (this.canvas && this.canvasContainer) {
            const rect = this.canvasContainer.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this._renderCanvas();
            }
        }
    }
    
    /**
     * Update the sidebar with current data
     * @private
     */
    _updateSidebar() {
        if (!this.sidebar || !this.sidebarContainer) return;
        
        this.sidebar.render(
            this.sidebarContainer,
            this.design,
            this.selectedFurniture
        );
    }
    
    /**
     * Update status bar room info
     * @private
     */
    _updateStatusRoomInfo() {
        const el = this.container?.querySelector('#status-room-info');
        if (el) {
            el.textContent = this._getRoomInfoText();
        }
    }
    
    /**
     * Update status bar selection info
     * @private
     */
    _updateStatusSelection() {
        const el = this.container?.querySelector('#status-selection');
        if (el) {
            el.textContent = this._getSelectionText();
        }
    }
    
    /**
     * Update status bar scale info
     * @private
     */
    _updateStatusScale() {
        const el = this.container?.querySelector('#status-scale');
        if (el) {
            el.textContent = this._getScaleText();
        }
    }
    
    /**
     * Get formatted selection text for status bar
     * @returns {string} Selection description with dimensions
     * @private
     */
    _getSelectionText() {
        if (!this.selectedFurniture) return 'No selection';
        const item = this.selectedFurniture;
        const typeName = this._formatFurnitureType(item.type);
        const w = item.width ?? 0;
        const d = item.depth ?? 0;
        return `Selected: ${typeName} (${w}m × ${d}m)`;
    }
    
    /**
     * Get formatted scale text for status bar
     * @returns {string} Current scale description
     * @private
     */
    _getScaleText() {
        if (this.currentView === '3d') return 'View: 3D Preview';
        if (this.renderer2d?.scale) {
            const pxPerM = Math.round(this.renderer2d.scale);
            return `Scale: 1m = ${pxPerM}px`;
        }
        return 'View: 2D Layout';
    }
    
    /**
     * Update the save status indicator in the top bar.
     * Shows "Saved ✓" (green) or "Unsaved changes" (amber).
     * @private
     */
    _updateSaveStatus() {
        if (!this.saveStatusEl) return;
        
        if (this.hasUnsavedChanges) {
            this.saveStatusEl.textContent = 'Unsaved changes';
            this.saveStatusEl.className = 'save-status save-status-unsaved';
        } else {
            this.saveStatusEl.textContent = 'Saved ✓';
            this.saveStatusEl.className = 'save-status save-status-saved';
        }
    }
    
    /**
     * Update status bar furniture count
     * @private
     */
    _updateStatusFurnitureCount() {
        if (!this.currentDesign || !this.toolbar) return;
        const count = this.currentDesign.getFurnitureCount();
        this.toolbar.updateItemCount(count);
    }
    
    /**
     * Set the selected furniture item
     * @param {Object|null} furniture - Furniture item to select
     */
    setSelectedFurniture(furniture) {
        this.selectedFurniture = furniture;
        this._updateSidebar();
        this._updateStatusSelection();
    }
    
    /**
     * Mark design as having unsaved changes
     */
    markUnsaved() {
        this.hasUnsavedChanges = true;
        this._updateSaveStatus();
    }
    
    /**
     * Get the canvas element
     * @returns {HTMLCanvasElement|null}
     */
    getCanvas() {
        return this.canvas;
    }
    
    /**
     * Get the 3D view container
     * @returns {HTMLElement|null}
     */
    get3DContainer() {
        return this.view3DContainer;
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
     * Format furniture type for display
     * @param {string} type - Furniture type (e.g., 'dining-table')
     * @returns {string} Formatted type (e.g., 'Dining Table')
     * @private
     */
    _formatFurnitureType(type) {
        if (!type || typeof type !== 'string') return 'Furniture';
        return type
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this._boundHandleKeyDown);
        window.removeEventListener('resize', this._boundHandleResize);
        
        // Clean up controller
        this.canvasController?.destroy();

        // Dispose 3D renderer to free WebGL resources
        if (this.renderer3d) {
            this.renderer3d.dispose();
            this.renderer3d = null;
        }
        
        // Clear references
        this.container = null;
        this.canvas = null;
        this.toolbar = null;
        this.sidebar = null;
        this.canvasController = null;
    }
}

export { EditorView };
export default EditorView;
