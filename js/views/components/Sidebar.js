/**
 * FurnishView — Sidebar Component
 * 
 * Renders room settings, colour pickers, and furniture property editors.
 * Context-sensitive: shows room properties or selected furniture properties.
 * 
 * @file js/views/components/Sidebar.js
 * @module views/components/Sidebar
 */

/**
 * Sidebar component
 * Provides property editing panels for room and furniture
 */
class Sidebar {
    /**
     * Create a Sidebar instance
     * @param {Object} options - Configuration
     * @param {Function} options.onRoomChange - Callback when room properties change
     * @param {Function} options.onFurnitureChange - Callback when furniture properties change
     */
    constructor({
        onRoomChange = () => {},
        onFurnitureChange = () => {}
    } = {}) {
        this.onRoomChange = onRoomChange;
        this.onFurnitureChange = onFurnitureChange;
    }
    
    /**
     * Render the sidebar into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} room - Current room data
     * @param {Object|null} selectedFurniture - Currently selected furniture item
     */
    render(container, room = null, selectedFurniture = null) {
        // TODO: Implement sidebar rendering
        // - Room properties section (dimensions, colours)
        // - Selected furniture section (if any selected)
        // - Colour pickers for wall/floor/furniture
        container.innerHTML = '<p>Sidebar placeholder</p>';
    }
}

export { Sidebar };
export default Sidebar;
