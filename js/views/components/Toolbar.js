/**
 * FurnishView — Toolbar Component
 * 
 * Renders the furniture catalogue and action buttons in the editor.
 * Allows selecting furniture types to place on canvas.
 * 
 * @file js/views/components/Toolbar.js
 * @module views/components/Toolbar
 */

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
     */
    constructor({
        onFurnitureSelect = () => {},
        onUndo = () => {},
        onDelete = () => {}
    } = {}) {
        this.onFurnitureSelect = onFurnitureSelect;
        this.onUndo = onUndo;
        this.onDelete = onDelete;
        this.selectedType = null;
    }
    
    /**
     * Render the toolbar into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} furnitureCatalogue - Available furniture types
     */
    render(container, furnitureCatalogue = []) {
        // TODO: Implement toolbar rendering
        // - Section: Furniture items (from catalogue)
        // - Section: Actions (undo, delete, export)
        container.innerHTML = '<p>Toolbar placeholder</p>';
    }
}

export { Toolbar };
export default Toolbar;
