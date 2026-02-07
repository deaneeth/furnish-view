/**
 * FurnishView — Canvas Controller
 * 
 * Handles mouse and touch events for the 2D canvas.
 * Manages furniture placement, selection, dragging, and removal.
 * 
 * @file js/controllers/CanvasController.js
 * @module controllers/CanvasController
 */

/**
 * CanvasController
 * Manages canvas interactions and furniture manipulation
 */
class CanvasController {
    /**
     * Create a CanvasController instance
     * @param {Object} options - Configuration
     * @param {HTMLCanvasElement} options.canvas - The 2D canvas element
     * @param {Function} options.onFurniturePlaced - Callback when furniture is placed
     * @param {Function} options.onFurnitureSelected - Callback when furniture is selected
     * @param {Function} options.onFurnitureMoved - Callback when furniture is moved
     * @param {Function} options.onFurnitureRemoved - Callback when furniture is removed
     */
    constructor({
        canvas = null,
        onFurniturePlaced = () => {},
        onFurnitureSelected = () => {},
        onFurnitureMoved = () => {},
        onFurnitureRemoved = () => {}
    } = {}) {
        this.canvas = canvas;
        this.onFurniturePlaced = onFurniturePlaced;
        this.onFurnitureSelected = onFurnitureSelected;
        this.onFurnitureMoved = onFurnitureMoved;
        this.onFurnitureRemoved = onFurnitureRemoved;
        
        this.isDragging = false;
        this.selectedFurnitureId = null;
        this.placingType = null;
        this.dragOffset = { x: 0, y: 0 };
    }
    
    /**
     * Initialize event listeners on the canvas
     */
    init() {
        // TODO: Implement event listeners
        // - Click: place new furniture or select existing
        // - MouseDown + MouseMove: drag furniture
        // - MouseUp: end drag
        // - Delete key: remove selected furniture
        console.info('[CanvasController] Initialized');
    }
    
    /**
     * Set the furniture type to place on next click
     * @param {string} furnitureType - Type from catalogue
     */
    setPlacingMode(furnitureType) {
        this.placingType = furnitureType;
        // TODO: Change cursor to crosshair
    }
    
    /**
     * Clear placing mode
     */
    clearPlacingMode() {
        this.placingType = null;
        // TODO: Reset cursor
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        // TODO: Remove event listeners
        console.info('[CanvasController] Destroyed');
    }
}

export { CanvasController };
export default CanvasController;
