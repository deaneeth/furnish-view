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
import { furnitureCatalogue, getFurnitureByType } from '../data/furnitureCatalogue.js';
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
        onToggle3D = () => {},
        userRole = 'admin',
        onAddAllToCart = () => {},
        onCheckoutFromCanvas = () => {}
    } = {}) {
        this.onSave = onSave;
        this.onBack = onBack;
        this.onToggle3D = onToggle3D;
        this.userRole = userRole;
        this.onAddAllToCart = onAddAllToCart;
        this.onCheckoutFromCanvas = onCheckoutFromCanvas;
        
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
        // Initial cost badge
        this._refreshCostBadge();
        // Onboarding tour (first visit only)
        this._maybeShowOnboardingTour();
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
                        <button type="button" class="btn btn-ghost btn-sm editor-cost-btn" id="editor-cost-btn" title="View room cost summary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            <span class="btn-text">Cost</span>
                            <span class="editor-cost-badge" id="editor-cost-badge" style="display:none"></span>
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm editor-pdf-btn" id="editor-pdf-btn" title="Export design quote as PDF">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            <span class="btn-text">PDF</span>
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm editor-share-btn" id="editor-share-btn" title="Copy shareable link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            <span class="btn-text">Share</span>
                        </button>
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
                                <!-- 3D move-furniture overlay controls -->
                                <div class="view-3d-controls" id="view-3d-controls">
                                    <div class="view-3d-toolbar">
                                        <button type="button" class="btn-3d-ctrl" id="btn-3d-move" title="Toggle move-furniture mode">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
                                                <polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/>
                                                <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                                            </svg>
                                            Move
                                        </button>
                                        <span class="view-3d-sep"></span>
                                        <button type="button" class="btn-3d-ctrl" id="btn-3d-roof" title="Toggle ceiling on/off">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 21h18"/><path d="M3 7l9-4 9 4"/><path d="M5 7v14"/><path d="M19 7v14"/>
                                            </svg>
                                            Roof
                                        </button>
                                        <span class="view-3d-sep"></span>
                                        <button type="button" class="btn-3d-ctrl" id="btn-3d-translucent" title="Toggle translucent walls">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.5"/>
                                                <path d="M3 9h18"/><path d="M9 3v18"/>
                                            </svg>
                                            Walls
                                        </button>
                                        <div class="view-3d-opacity-wrap" id="view-3d-opacity-control">
                                            <span class="view-3d-sep"></span>
                                            <label class="view-3d-opacity-label" for="view-3d-opacity-slider">Opacity</label>
                                            <input type="range" id="view-3d-opacity-slider" class="view-3d-opacity-slider"
                                                   min="5" max="100" value="35" step="5" />
                                            <span class="view-3d-opacity-value" id="view-3d-opacity-value">35%</span>
                                        </div>
                                    </div>
                                    <span class="view-3d-hint" id="view-3d-hint">Orbit to rotate • Scroll to zoom</span>
                                </div>
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

                <!-- PRICE PANEL (floating overlay) -->
                <div class="editor-price-panel" id="editor-price-panel" style="display:none" role="dialog" aria-label="Room cost summary">
                    <div class="price-panel__header">
                        <div class="price-panel__title">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Room Cost Summary
                        </div>
                        <button class="price-panel__close-btn" id="price-panel-close" type="button" aria-label="Close">✕</button>
                    </div>
                    <div class="price-panel__body" id="price-panel-body"></div>
                    <div class="price-panel__footer" id="price-panel-footer"></div>
                </div>
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
        this.costBtn = this.container.querySelector('#editor-cost-btn');
        this.costBadge = this.container.querySelector('#editor-cost-badge');
        this.pricePanelEl = this.container.querySelector('#editor-price-panel');
        this.pdfBtn = this.container.querySelector('#editor-pdf-btn');
        this.shareBtn = this.container.querySelector('#editor-share-btn');
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
            onExport: () => this._handleExport(),
            onAutoArrange: () => this._handleAutoArrange()
        });
        this.toolbar.render(this.toolbarContainer, furnitureCatalogue);

        // Inject sidebar search into the toolbar's furniture section
        this._injectSidebarSearch();
        
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

        // Cost panel toggle
        this.costBtn?.addEventListener('click', () => {
            if (!this.pricePanelEl) return;
            const isVisible = this.pricePanelEl.style.display !== 'none';
            this.pricePanelEl.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) this._updatePricePanel();
        });
        this.container.querySelector('#price-panel-close')?.addEventListener('click', () => {
            if (this.pricePanelEl) this.pricePanelEl.style.display = 'none';
        });

        // PDF export button
        this.pdfBtn?.addEventListener('click', () => this._handleExportPDF());

        // Share button
        this.shareBtn?.addEventListener('click', () => this._handleShare());
        
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

        // G - Toggle snap-to-grid (only when not typing in an input)
        if (e.key === 'g' && document.activeElement?.tagName !== 'INPUT') {
            const isSnapping = this.canvasController?.toggleSnapToGrid();
            if (isSnapping !== undefined) {
                const label = isSnapping
                    ? `Snap: ${this.canvasController.snapIncrement}m`
                    : 'Snap: Off';
                Toast.info(label);
            }
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
     * Programmatically start placing a furniture type (e.g. from catalogue "Use in Design")
     * @param {string} type - Furniture type to place
     */
    startPlacingFurniture(type) {
        if (!type) return;
        this.toolbar?.setSelectedType(type);
        this.canvasController?.startPlacing(type);
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
     * Handle auto-arrange action from toolbar.
     *
     * Delegates to CanvasController which runs the zone-based algorithm,
     * animates items into position, and pushes onto the undo stack.
     *
     * @private
     */
    _handleAutoArrange() {
        if (!this.design?.furniture?.length) {
            Toast.info('Place some furniture first');
            return;
        }
        if (this.currentView === '3d') {
            Toast.info('Switch to 2D view to auto-arrange');
            return;
        }
        if (this.canvasController?.autoArrange()) {
            Toast.success('Furniture arranged');
        } else {
            Toast.info('Nothing to arrange');
        }
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
        this._sync3DScene();
        // Keep price panel in sync if it's open
        if (this.pricePanelEl?.style.display !== 'none') {
            this._updatePricePanel();
        }
        // Always refresh the badge count
        this._refreshCostBadge();
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

        // Lazy-initialise Renderer3D (with WebGL fallback)
        if (!this.renderer3d && this.view3DContainer) {
            try {
                this.renderer3d = new Renderer3D({
                    container: this.view3DContainer
                });
            } catch {
                Toast.error('3D view requires WebGL — your browser may not support it');
                this.view3DContainer.innerHTML =
                    '<div style="display:flex;align-items:center;justify-content:center;' +
                    'height:100%;color:#666;font-size:1rem;text-align:center;padding:2rem;">' +
                    '⚠️ 3D preview is unavailable.<br>Your browser does not support WebGL.</div>';
                return;
            }
        }

        // Build / rebuild the scene with the latest design data
        // Reset fly-in flag so buildRoom skips camera positioning
        // (animateCameraEntry will handle it)
        if (this.renderer3d) {
            this.renderer3d._flyInActive = true;
        }
        this._sync3DScene();

        // Smooth camera fly-in from top-down to isometric angle
        // Use rAF to ensure scene is fully built before animating
        if (this.renderer3d) {
            this.renderer3d._flyInActive = false;
            requestAnimationFrame(() => {
                this.renderer3d?.animateCameraEntry();
            });
        }

        // Disable toolbar — can't place furniture in 3D
        this.toolbar?.setDisabled(true);

        // Cancel any active placing mode
        this.canvasController?.cancelPlacing();

        // Wire the 3D move-furniture toggle button (only once)
        if (!this._3dMoveBtnBound) {
            this._3dMoveBtnBound = true;
            const moveBtn = this.container.querySelector('#btn-3d-move');
            const hint    = this.container.querySelector('#view-3d-hint');
            if (moveBtn) {
                moveBtn.addEventListener('click', () => {
                    const isActive = moveBtn.classList.toggle('btn-3d-ctrl--active');
                    if (hint) hint.textContent = isActive
                        ? 'Drag furniture to reposition · Click again to exit move mode'
                        : 'Orbit to rotate • Scroll to zoom';
                    if (isActive) {
                        // Helper: convert 3D coords to design coords, resolve collisions,
                        // then convert back to 3D coords.
                        const resolve3dCollision = (itemId, threeX, threeZ) => {
                            if (!this.design || !this.canvasController) return { x: threeX, z: threeZ };
                            const item = this.design.furniture.find(f => f.id === itemId);
                            if (!item) return { x: threeX, z: threeZ };
                            const room = this.design.room;
                            const rw = room.width || 5;
                            const rd = room.depth || 4;

                            // 3D → design-model coords
                            const designX = threeX + rw / 2 - (item.width || 0.5) / 2;
                            const designY = threeZ + rd / 2 - (item.depth || 0.5) / 2;

                            // Resolve collisions in design space
                            const safe = this.canvasController._resolveCollisions(item, designX, designY);

                            // Clamp to room bounds
                            const clamped = this.renderer2d
                                ? this.renderer2d.clampToRoom({ x: safe.x, y: safe.y, width: item.width, depth: item.depth })
                                : safe;

                            // Design-model → 3D coords
                            return {
                                x: clamped.x - rw / 2 + (item.width || 0.5) / 2,
                                z: clamped.y - rd / 2 + (item.depth || 0.5) / 2
                            };
                        };

                        this.renderer3d?.enableFurnitureMove((itemId, x, z) => {
                            // Sync 3D position back to the Design model + 2D canvas
                            if (!this.design) return;
                            const item = this.design.furniture.find(f => f.id === itemId);
                            if (!item) return;
                            const room = this.design.room;
                            const rw = room.width || 5;
                            const rd = room.depth || 4;

                            // Convert 3D → design coords
                            let designX = x + rw / 2 - (item.width || 0.5) / 2;
                            let designY = z + rd / 2 - (item.depth || 0.5) / 2;

                            // Resolve collisions in design space
                            if (this.canvasController) {
                                const safe = this.canvasController._resolveCollisions(item, designX, designY);
                                const clamped = this.renderer2d
                                    ? this.renderer2d.clampToRoom({ x: safe.x, y: safe.y, width: item.width, depth: item.depth })
                                    : safe;
                                designX = clamped.x;
                                designY = clamped.y;
                            }

                            item.x = designX;
                            item.y = designY;
                            this._renderCanvas();
                        }, resolve3dCollision);
                    } else {
                        this.renderer3d?.disableFurnitureMove();
                    }
                });
            }
        }

        // Wire roof and translucent-walls toggles (only once)
        if (!this._3dTogglesBound) {
            this._3dTogglesBound = true;

            const roofBtn        = this.container.querySelector('#btn-3d-roof');
            const translucentBtn = this.container.querySelector('#btn-3d-translucent');
            const opacityControl = this.container.querySelector('#view-3d-opacity-control');
            const opacitySlider  = this.container.querySelector('#view-3d-opacity-slider');
            const opacityValue   = this.container.querySelector('#view-3d-opacity-value');
            const moveBtn        = this.container.querySelector('#btn-3d-move');
            const hint           = this.container.querySelector('#view-3d-hint');

            // ── Toggle 1: Roof (Ceiling) ──
            if (roofBtn) {
                roofBtn.addEventListener('click', () => {
                    const isActive = roofBtn.classList.toggle('btn-3d-ctrl--active');
                    this.renderer3d?.setCeilingVisible(isActive);
                });
            }

            // ── Toggle 2: Translucent Walls ──
            if (translucentBtn) {
                translucentBtn.addEventListener('click', () => {
                    const isActive = translucentBtn.classList.toggle('btn-3d-ctrl--active');
                    this.renderer3d?.setTranslucentWalls(isActive);

                    // Smoothly show/hide opacity slider
                    if (opacityControl) opacityControl.classList.toggle('view-3d-opacity-wrap--visible', isActive);

                    if (isActive) {
                        // Disable furniture movement
                        if (moveBtn?.classList.contains('btn-3d-ctrl--active')) {
                            moveBtn.classList.remove('btn-3d-ctrl--active');
                            this.renderer3d?.disableFurnitureMove();
                            if (hint) hint.textContent = 'Orbit to rotate \u2022 Scroll to zoom';
                        }
                        moveBtn?.classList.add('btn-3d-ctrl--disabled');
                        moveBtn?.setAttribute('disabled', 'true');
                    } else {
                        // Re-enable the move button
                        moveBtn?.classList.remove('btn-3d-ctrl--disabled');
                        moveBtn?.removeAttribute('disabled');
                    }
                });
            }

            // ── Opacity Slider ──
            if (opacitySlider) {
                opacitySlider.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value, 10);
                    this.renderer3d?.setWallOpacity(val / 100);
                    if (opacityValue) opacityValue.textContent = `${val}%`;
                });
            }
        }
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
        // Deactivate 3D move mode if it was on
        const moveBtn = this.container?.querySelector('#btn-3d-move');
        const hint    = this.container?.querySelector('#view-3d-hint');
        if (moveBtn?.classList.contains('btn-3d-ctrl--active')) {
            moveBtn.classList.remove('btn-3d-ctrl--active');
            this.renderer3d?.disableFurnitureMove();
            if (hint) hint.textContent = 'Orbit to rotate \u2022 Scroll to zoom';
        }

        // Deactivate roof toggle if it was on
        const roofBtn = this.container?.querySelector('#btn-3d-roof');
        if (roofBtn?.classList.contains('btn-3d-ctrl--active')) {
            roofBtn.classList.remove('btn-3d-ctrl--active');
            this.renderer3d?.setCeilingVisible(false);
        }

        // Deactivate translucent walls if on
        const translucentBtn = this.container?.querySelector('#btn-3d-translucent');
        const opacityControl = this.container?.querySelector('#view-3d-opacity-control');
        if (translucentBtn?.classList.contains('btn-3d-ctrl--active')) {
            translucentBtn.classList.remove('btn-3d-ctrl--active');
            this.renderer3d?.setTranslucentWalls(false);
            if (opacityControl) opacityControl.classList.remove('view-3d-opacity-wrap--visible');
        }

        // Re-enable move button in case it was locked by translucent mode
        moveBtn?.classList.remove('btn-3d-ctrl--disabled');
        moveBtn?.removeAttribute('disabled');

        // Cancel any in-progress fly-in so it triggers cleanly next toggle
        if (this.renderer3d) {
            this.renderer3d._flyInActive = false;
        }

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
    
    // =========================================================================
    // PRICE PANEL
    // =========================================================================

    /**
     * Refresh only the cost badge number in the top bar.
     * Called on every design change so the count is always current.
     * @private
     */
    _refreshCostBadge() {
        if (!this.costBadge) return;
        const furniture = this.design?.furniture || [];
        const types = new Set(furniture.map(f => f.type));
        if (types.size > 0) {
            this.costBadge.textContent = furniture.length;
            this.costBadge.style.display = 'inline-flex';
        } else {
            this.costBadge.style.display = 'none';
        }
    }

    /**
     * Rebuild the price panel content from the current canvas state.
     * Groups furniture by type, computes unit + subtotal prices, and
     * renders role-specific action buttons (admin: quote tools; user: cart/checkout).
     * @private
     */
    _updatePricePanel() {
        const body = this.container?.querySelector('#price-panel-body');
        const footer = this.container?.querySelector('#price-panel-footer');
        if (!body || !footer) return;

        const furniture = this.design?.furniture || [];

        // Aggregate by type
        const typeCounts = {};
        furniture.forEach(item => {
            typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
        });
        const types = Object.keys(typeCounts);

        if (types.length === 0) {
            body.innerHTML = '<p class="price-panel__empty">No furniture on canvas yet.<br>Add items to see the cost breakdown.</p>';
            footer.innerHTML = '';
            return;
        }

        // Build table rows
        let grandTotal = 0;
        let rows = '';
        types.forEach(type => {
            const def = getFurnitureByType(type);
            if (!def) return;
            const qty = typeCounts[type];
            const subtotal = def.price * qty;
            grandTotal += subtotal;
            const sku = this._escapeHtml(def.sku || type.toUpperCase());
            rows += `<tr>
                <td class="pp-col-sku">${sku}</td>
                <td class="pp-col-name">${this._escapeHtml(def.label)}</td>
                <td class="pp-col-qty">${qty}</td>
                <td class="pp-col-price">$${def.price.toLocaleString()}</td>
                <td class="pp-col-total">$${subtotal.toLocaleString()}</td>
            </tr>`;
        });

        body.innerHTML = `
            <table class="price-panel__table">
                <thead><tr>
                    <th>SKU</th><th>Item</th>
                    <th class="pp-col-qty">Qty</th>
                    <th class="pp-col-price">Unit</th>
                    <th class="pp-col-total">Total</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

        const totalStr = '$' + grandTotal.toLocaleString('en-US');

        let actionBtns = '';
        if (this.userRole === 'admin') {
            actionBtns = `
                <button type="button" class="btn btn-secondary btn-sm pp-action-btn" id="pp-copy-quote">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Quote
                </button>
                <button type="button" class="btn btn-ghost btn-sm pp-action-btn" id="pp-print-quote">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print
                </button>`;
        } else {
            actionBtns = `
                <button type="button" class="btn btn-secondary btn-sm pp-action-btn" id="pp-add-to-cart">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Add All to Cart
                </button>
                <button type="button" class="btn btn-primary btn-sm pp-action-btn" id="pp-checkout-now">
                    Checkout
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>`;
        }

        const note = this.userRole === 'admin'
            ? 'Share this quote with your customer'
            : 'Items reflect your current canvas design';

        footer.innerHTML = `
            <div class="price-panel__total-row">
                <span class="price-panel__total-label">Grand Total</span>
                <span class="price-panel__total-amount">${totalStr}</span>
            </div>
            <p class="price-panel__note">${note}</p>
            <div class="price-panel__actions">${actionBtns}</div>`;

        // Bind action buttons (re-bound each render cycle)
        if (this.userRole === 'admin') {
            footer.querySelector('#pp-copy-quote')?.addEventListener('click', () => this._handleCopyQuote(typeCounts, grandTotal));
            footer.querySelector('#pp-print-quote')?.addEventListener('click', () => this._handlePrintQuote(typeCounts, grandTotal));
        } else {
            footer.querySelector('#pp-add-to-cart')?.addEventListener('click', () => this._handleAddAllToCart(typeCounts));
            footer.querySelector('#pp-checkout-now')?.addEventListener('click', () => {
                this._handleAddAllToCart(typeCounts);
                this.onCheckoutFromCanvas();
            });
        }
    }

    /**
     * Copy a formatted plain-text quote to the clipboard (admin only).
     * @param {Object} typeCounts - { type: qty } map
     * @param {number} grandTotal - Computed grand total
     * @private
     */
    _handleCopyQuote(typeCounts, grandTotal) {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const designName = this.design?.name || 'Untitled';
        const sep = '─'.repeat(60);
        const lines = [
            'FURNISHVIEW — ROOM DESIGN QUOTE',
            `Date: ${date}`,
            `Design: ${designName}`,
            '',
            sep,
            'SKU           Item                  Qty   Unit Price    Total',
            sep,
        ];
        Object.entries(typeCounts).forEach(([type, qty]) => {
            const def = getFurnitureByType(type);
            if (!def) return;
            const subtotal = def.price * qty;
            const sku = (def.sku || type.toUpperCase()).padEnd(13);
            const name = def.label.padEnd(21);
            const q = String(qty).padStart(3);
            const unit = `$${def.price.toLocaleString()}`.padStart(11);
            const sub = `$${subtotal.toLocaleString()}`.padStart(9);
            lines.push(`${sku} ${name} ${q} ${unit} ${sub}`);
        });
        lines.push(sep);
        lines.push(`${'GRAND TOTAL'.padEnd(44)} $${grandTotal.toLocaleString()}`);
        lines.push('');
        lines.push('Quote valid for 30 days · FurnishView Professional');

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            Toast.success('Quote copied to clipboard');
        }).catch(() => {
            Toast.error('Copy failed — please use Print instead');
        });
    }

    /**
     * Open a printable quote in a new browser window (admin only).
     * @param {Object} typeCounts - { type: qty } map
     * @param {number} grandTotal - Computed grand total
     * @private
     */
    _handlePrintQuote(typeCounts, grandTotal) {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const designName = this._escapeHtml(this.design?.name || 'Untitled');
        let rows = '';
        Object.entries(typeCounts).forEach(([type, qty]) => {
            const def = getFurnitureByType(type);
            if (!def) return;
            const subtotal = def.price * qty;
            rows += `<tr>
                <td>${this._escapeHtml(def.sku || type.toUpperCase())}</td>
                <td>${this._escapeHtml(def.label)}</td>
                <td style="text-align:center">${qty}</td>
                <td style="text-align:right">$${def.price.toLocaleString()}</td>
                <td style="text-align:right">$${subtotal.toLocaleString()}</td>
            </tr>`;
        });
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>FurnishView Quote — ${designName}</title>
<style>
  body{font-family:-apple-system,Arial,sans-serif;color:#1a1a1a;max-width:720px;margin:40px auto;padding:0 24px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:28px;border-bottom:2px solid #B8864E}
  .brand{font-size:22px;font-weight:700;color:#B8864E}.brand small{display:block;font-size:12px;color:#888;font-weight:400;margin-top:2px}
  .meta{text-align:right;font-size:13px;color:#555}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#F5F0EB;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#7a6a5a}
  td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13.5px}
  tr:last-child td{border-bottom:none}
  .tot td{background:#1D1D1F;color:#fff;font-weight:700;font-size:15px;padding:13px 12px}
  .foot{margin-top:28px;font-size:11.5px;color:#aaa;border-top:1px solid #eee;padding-top:14px}
  @media print{body{margin:0}}
</style></head><body>
<div class="hdr">
  <div><div class="brand">FurnishView<small>Professional Room Design</small></div></div>
  <div class="meta"><strong>Room Design Quote</strong><br>${date}<br>Design: ${designName}</div>
</div>
<table>
  <thead><tr><th>SKU</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="tot"><td colspan="4">Grand Total</td><td style="text-align:right">$${grandTotal.toLocaleString()}</td></tr></tfoot>
</table>
<div class="foot">All prices in USD. Quote valid for 30 days from date above. Prices subject to stock availability.</div>
</body></html>`;

        const win = window.open('', '_blank', 'width=800,height=680');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        } else {
            Toast.error('Allow pop-ups to print the quote');
        }
    }

    /**
     * Add all canvas furniture to the cart (user only).
     * Calls the onAddAllToCart callback with item list.
     * @param {Object} typeCounts - { type: qty } map
     * @private
     */
    _handleAddAllToCart(typeCounts) {
        const items = Object.entries(typeCounts).map(([type, qty]) => {
            const def = getFurnitureByType(type);
            return { type, quantity: qty, price: def?.price || 0 };
        }).filter(i => i.price > 0);

        if (!items.length) {
            Toast.info('No priceable items on canvas');
            return;
        }
        this.onAddAllToCart(items);
    }

    // =========================================================================
    // SIDEBAR SEARCH
    // =========================================================================

    /**
     * Inject a search input into the toolbar's furniture section and bind
     * the filter logic so typing narrows the visible furniture buttons.
     * @private
     */
    _injectSidebarSearch() {
        const grid = this.toolbarContainer?.querySelector('.toolbar-furniture-grid');
        if (!grid) return;

        // Inject CSS once
        if (!document.getElementById('sidebar-search-style')) {
            const style = document.createElement('style');
            style.id = 'sidebar-search-style';
            style.textContent = `
                .sidebar-search-wrap {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 8px;
                    padding: 5px 8px;
                    margin: 0 0 10px 0;
                }
                .sidebar-search-wrap svg { flex-shrink: 0; opacity: 0.5; }
                .sidebar-search-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 12px;
                    color: inherit;
                    min-width: 0;
                }
                .sidebar-search-input::placeholder { opacity: 0.45; }
                .sidebar-search-clear {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 11px;
                    line-height: 1;
                    opacity: 0.55;
                    padding: 0 2px;
                    color: inherit;
                }
                .sidebar-search-clear:hover { opacity: 1; }
                .toolbar-search-no-results {
                    font-size: 11px;
                    text-align: center;
                    opacity: 0.5;
                    padding: 8px 0;
                    display: none;
                    width: 100%;
                }
            `;
            document.head.appendChild(style);
        }

        // Build the search widget HTML and insert before the grid
        const wrap = document.createElement('div');
        wrap.className = 'sidebar-search-wrap';
        wrap.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" id="sidebar-search" class="sidebar-search-input" placeholder="Search furniture\u2026" autocomplete="off"/>
            <button type="button" id="sidebar-search-clear" class="sidebar-search-clear" style="display:none" aria-label="Clear search">\u2715</button>
        `;
        grid.parentElement.insertBefore(wrap, grid);

        // Add "no results" message inside the grid
        const noResults = document.createElement('p');
        noResults.className = 'toolbar-search-no-results';
        noResults.id = 'sidebar-search-no-results';
        noResults.textContent = 'No results';
        grid.appendChild(noResults);

        const searchInput = wrap.querySelector('#sidebar-search');
        const clearBtn = wrap.querySelector('#sidebar-search-clear');

        const filterFurniture = (query) => {
            const q = query.trim().toLowerCase();
            const buttons = grid.querySelectorAll('.toolbar-furniture-btn');
            let visibleCount = 0;
            buttons.forEach(btn => {
                const label = (btn.querySelector('.toolbar-btn-label')?.textContent || '').toLowerCase();
                const matches = !q || label.includes(q);
                btn.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });
            // Hide category groups that have no visible buttons
            grid.querySelectorAll('.toolbar-category-group').forEach(group => {
                const hasVisible = group.querySelector('.toolbar-furniture-btn:not([style*="display: none"])');
                group.style.display = hasVisible ? '' : 'none';
            });
            const noResultsEl = grid.querySelector('#sidebar-search-no-results');
            if (noResultsEl) {
                noResultsEl.style.display = visibleCount === 0 ? 'block' : 'none';
            }
            clearBtn.style.display = q ? 'inline' : 'none';
        };

        searchInput?.addEventListener('input', (e) => filterFurniture(e.target.value));
        clearBtn?.addEventListener('click', () => {
            searchInput.value = '';
            filterFurniture('');
            searchInput.focus();
        });
    }

    // =========================================================================
    // PDF EXPORT
    // =========================================================================

    /**
     * Export the current design as a formatted PDF quote using jsPDF.
     * Dynamically loads jsPDF from CDN on first use.
     * @private
     */
    async _handleExportPDF() {
        const furniture = this.design?.furniture || [];
        if (!furniture.length) {
            Toast.info('Add furniture to the canvas first');
            return;
        }

        // Dynamically load jsPDF from CDN if not already loaded
        if (!window.jspdf) {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch {
                Toast.error('Failed to load PDF library. Check your internet connection.');
                return;
            }
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const design = this.design;

        // Header bar
        doc.setFillColor(94, 92, 230);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text('FurnishView', 14, 12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Room Design Quote', 14, 20);
        doc.text(
            `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`,
            130, 20
        );

        // Design info
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(design?.name || 'Untitled Design', 14, 40);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const room = design?.room;
        if (room) doc.text(`Room: ${room.width}m \u00d7 ${room.depth}m \u00d7 ${room.height}m`, 14, 48);

        // Aggregate items by type
        const typeCounts = {};
        furniture.forEach(f => {
            if (!typeCounts[f.type]) {
                const def = getFurnitureByType(f.type);
                typeCounts[f.type] = {
                    label: def?.label || f.type,
                    sku: def?.sku || '-',
                    price: def?.price || 0,
                    qty: 0
                };
            }
            typeCounts[f.type].qty++;
        });

        const items = Object.values(typeCounts);

        // Table header
        let y = 58;
        doc.setFillColor(245, 245, 247);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('SKU', 16, y + 5.5);
        doc.text('ITEM', 46, y + 5.5);
        doc.text('QTY', 120, y + 5.5);
        doc.text('UNIT PRICE', 140, y + 5.5);
        doc.text('TOTAL', 173, y + 5.5);
        y += 10;

        // Table rows
        let grandTotal = 0;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        items.forEach((item, i) => {
            const lineTotal = item.price * item.qty;
            grandTotal += lineTotal;

            if (i % 2 === 0) {
                doc.setFillColor(252, 252, 254);
                doc.rect(14, y - 2, 182, 9, 'F');
            }

            doc.setTextColor(120, 120, 120);
            doc.text(item.sku, 16, y + 4);
            doc.setTextColor(30, 30, 30);
            doc.text(item.label, 46, y + 4);
            doc.text(String(item.qty), 122, y + 4);
            doc.text(`$${item.price.toFixed(2)}`, 140, y + 4);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${lineTotal.toFixed(2)}`, 173, y + 4);
            doc.setFont('helvetica', 'normal');
            y += 10;
        });

        // Grand total row
        y += 4;
        doc.setDrawColor(200, 200, 210);
        doc.line(14, y, 196, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text('TOTAL', 120, y);
        doc.setTextColor(94, 92, 230);
        doc.text(`$${grandTotal.toFixed(2)}`, 160, y);

        // Footer
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('FurnishView \u2014 Premium Furniture Design Studio', 14, 285);
        doc.text('Prices are estimates and may vary. Contact store for final quote.', 14, 290);

        // Trigger download
        const filename = `FurnishView-Quote-${(design?.name || 'Design').replace(/\s+/g, '-')}.pdf`;
        doc.save(filename);
        Toast.success('PDF quote downloaded');
    }

    // =========================================================================
    // DESIGN SHARING
    // =========================================================================

    /**
     * Build a shareable URL using the current design ID and copy it to
     * the clipboard, showing temporary visual feedback on the button.
     * @private
     */
    _handleShare() {
        const designId = this.design?.id;
        if (!designId) {
            Toast.info('Save your design first to generate a shareable link');
            return;
        }

        const url = `${window.location.origin}${window.location.pathname}#share=${designId}`;

        navigator.clipboard.writeText(url).then(() => {
            const btn = this.container.querySelector('#editor-share-btn');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/></svg><span class="btn-text">Copied!</span>`;
                btn.style.color = '#10B981';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 2000);
            }
            Toast.success('Shareable link copied to clipboard');
        }).catch(() => {
            prompt('Share this link:', url);
        });
    }

    /**
     * Clean up event listeners and resources
     */
    /**
     * Show an onboarding tooltip tour the first time a user visits the editor.
     * Skipped on subsequent visits via localStorage flag.
     * @private
     */
    _maybeShowOnboardingTour() {
        if (localStorage.getItem('fv_editor_toured')) return;
        localStorage.setItem('fv_editor_toured', '1');

        // Inject tour CSS once
        if (!document.getElementById('tour-styles')) {
            const style = document.createElement('style');
            style.id = 'tour-styles';
            style.textContent = `
                .tour-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 8000;
                    pointer-events: none;
                }
                .tour-tooltip {
                    position: fixed;
                    background: #fff;
                    border-radius: 16px;
                    padding: 20px;
                    width: 280px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    z-index: 8001;
                    pointer-events: auto;
                    animation: pd-fade-in 0.2s ease;
                }
                .tour-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.3);
                    z-index: 7999;
                    pointer-events: none;
                }
                .tour-step-count {
                    font-size: 11px;
                    color: #888;
                    margin-bottom: 4px;
                }
                .tour-title {
                    font-weight: 700;
                    margin: 6px 0 4px;
                    font-size: 15px;
                    color: #1d1d1f;
                }
                .tour-body {
                    font-size: 14px;
                    color: #555;
                    margin: 0 0 12px;
                    line-height: 1.5;
                }
                .tour-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
            `;
            document.head.appendChild(style);
        }

        const steps = [
            { selector: '.toolbar-furniture-grid', title: 'Pick furniture', body: 'Click any item to start placing it in your room.' },
            { selector: '#room-canvas', title: 'Arrange your room', body: 'Drag furniture to reposition. Select a piece to rotate or resize it.' },
            { selector: '.view-toggle', title: 'Switch to 3D', body: 'Click "3D Preview" to see your room in realistic 3D at any time.' },
            { selector: '.editor-save-btn', title: 'Save your design', body: 'Hit Save (or Ctrl+S) to keep your design. You can come back any time.' }
        ];

        let step = 0;
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        overlay.innerHTML = `
            <div class="tour-backdrop" id="tour-backdrop"></div>
            <div class="tour-tooltip" id="tour-tooltip">
                <div class="tour-step-count" id="tour-step-count"></div>
                <h3 class="tour-title" id="tour-title"></h3>
                <p class="tour-body" id="tour-body"></p>
                <div class="tour-actions">
                    <button class="tour-skip btn btn-secondary btn-sm">Skip tour</button>
                    <button class="tour-next btn btn-primary btn-sm" id="tour-next">Next</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const updateStep = () => {
            const s = steps[step];
            overlay.querySelector('#tour-step-count').textContent = `Step ${step + 1} of ${steps.length}`;
            overlay.querySelector('#tour-title').textContent = s.title;
            overlay.querySelector('#tour-body').textContent = s.body;
            overlay.querySelector('#tour-next').textContent = step === steps.length - 1 ? 'Done' : 'Next';

            const target = this.container?.querySelector(s.selector);
            const tooltip = overlay.querySelector('#tour-tooltip');
            if (target) {
                const rect = target.getBoundingClientRect();
                tooltip.style.top = Math.min(rect.bottom + 12, window.innerHeight - 180) + 'px';
                tooltip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 320)) + 'px';
                tooltip.style.transform = '';
            } else {
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }
        };

        updateStep();

        overlay.querySelector('.tour-next').addEventListener('click', () => {
            step++;
            if (step >= steps.length) { overlay.remove(); return; }
            updateStep();
        });
        overlay.querySelector('.tour-skip').addEventListener('click', () => overlay.remove());
    }

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
