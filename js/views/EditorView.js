/**
 * FurnishView — Editor View
 * 
 * Renders the main design editor with toolbar, canvas, and sidebar.
 * Coordinates between 2D canvas, 3D view, and property panels.
 * 
 * @file js/views/EditorView.js
 * @module views/EditorView
 */

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
     */
    constructor({
        onSave = () => {},
        onBack = () => {}
    } = {}) {
        this.onSave = onSave;
        this.onBack = onBack;
        this.currentView = '2d'; // '2d' or '3d'
    }
    
    /**
     * Render the editor view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} design - The design to edit
     */
    render(container, design = null) {
        // TODO: Implement editor layout
        // - Header with design name, save, back buttons
        // - Left toolbar (furniture catalogue)
        // - Centre canvas area (2D/3D toggle)
        // - Right sidebar (room/furniture properties)
        container.innerHTML = '<p>EditorView placeholder</p>';
    }
    
    /**
     * Switch between 2D and 3D views
     * @param {string} view - '2d' or '3d'
     */
    switchView(view) {
        this.currentView = view;
        // TODO: Toggle between Renderer2D and Renderer3D
    }
}

export { EditorView };
export default EditorView;
