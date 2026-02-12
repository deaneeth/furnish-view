/**
 * FurnishView — Canvas Controller
 * 
 * Handles all mouse and touch events on the 2D canvas.
 * Manages furniture placement, selection, dragging, and removal.
 * Bridges user input → model updates → re-rendering.
 * 
 * @file js/controllers/CanvasController.js
 * @module controllers/CanvasController
 */

import { FurnitureItem } from '../models/FurnitureItem.js';
import { Design } from '../models/Design.js';
import { getFurnitureByType } from '../data/furnitureCatalogue.js';

/**
 * Maximum number of undo states to store
 * @type {number}
 */
const MAX_UNDO_STACK = 20;

/**
 * Hit-detection radius for the rotation handle (px)
 * @type {number}
 */
const ROTATION_HIT_RADIUS = 14;

/**
 * Snap increment (degrees) when Shift is held during rotation
 * @type {number}
 */
const ROTATION_SNAP_STEP = 15;

/**
 * CanvasController
 * Manages canvas interactions and furniture manipulation
 */
class CanvasController {
    /**
     * Create a CanvasController instance
     * 
     * @param {Object} options - Configuration
     * @param {HTMLCanvasElement} options.canvas - The 2D canvas element
     * @param {Renderer2D} options.renderer2D - The 2D renderer instance
     * @param {Design} options.design - The current design model
     * @param {Function} options.onFurnitureSelect - Callback when furniture is selected
     * @param {Function} options.onFurnitureUpdate - Callback when furniture position changes
     * @param {Function} options.onDesignChange - Callback when design is modified
     */
    constructor({
        canvas = null,
        renderer2D = null,
        design = null,
        onFurnitureSelect = () => {},
        onFurnitureUpdate = () => {},
        onDesignChange = () => {}
    } = {}) {
        // Store references
        this.canvas = canvas;
        this.renderer = renderer2D;
        this.design = design;
        
        // Callbacks
        this.onFurnitureSelect = onFurnitureSelect;
        this.onFurnitureUpdate = onFurnitureUpdate;
        this.onDesignChange = onDesignChange;
        
        // Interaction state
        this.selectedItem = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPosition = { x: 0, y: 0 };
        this.positionChanged = false;
        
        // Rotation interaction state (Task 4B.2)
        this.isRotating = false;
        this.rotationStartAngle = 0;
        this.rotationStartRotation = 0;
        this.rotationChanged = false;
        this.shiftHeld = false;
        
        // Placing mode state
        this.placingType = null;
        this.placingDef = null; // Furniture definition for placing preview
        
        // Undo system
        this.undoStack = [];
        
        // Bound event handlers (for cleanup)
        this._boundHandleMouseDown = this._handleMouseDown.bind(this);
        this._boundHandleMouseMove = this._handleMouseMove.bind(this);
        this._boundHandleMouseUp = this._handleMouseUp.bind(this);
        this._boundHandleTouchStart = this._handleTouchStart.bind(this);
        this._boundHandleTouchMove = this._handleTouchMove.bind(this);
        this._boundHandleTouchEnd = this._handleTouchEnd.bind(this);
        
        // Initialize event listeners
        this._attachEventListeners();
    }
    
    /**
     * Attach all event listeners to the canvas
     * @private
     */
    _attachEventListeners() {
        if (!this.canvas) return;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', this._boundHandleMouseDown);
        this.canvas.addEventListener('mousemove', this._boundHandleMouseMove);
        this.canvas.addEventListener('mouseup', this._boundHandleMouseUp);
        this.canvas.addEventListener('mouseleave', this._boundHandleMouseUp);
        
        // Touch events for tablet support
        this.canvas.addEventListener('touchstart', this._boundHandleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._boundHandleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._boundHandleTouchEnd);
        this.canvas.addEventListener('touchcancel', this._boundHandleTouchEnd);
    }
    
    /**
     * Get mouse/touch position relative to canvas
     * @param {MouseEvent|Touch} event - Mouse or touch event
     * @returns {Object} Position { x, y } in canvas coordinates
     * @private
     */
    _getCanvasPosition(event) {
        if (!this.canvas) return { x: 0, y: 0 };
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseDown(event) {
        event.preventDefault();
        const pos = this._getCanvasPosition(event);
        this._handlePointerDown(pos);
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const pos = this._getCanvasPosition(event.touches[0]);
            this._handlePointerDown(pos);
        }
    }
    
    /**
     * Common handler for pointer down (mouse or touch)
     * @param {Object} pos - Canvas position { x, y }
     * @private
     */
    _handlePointerDown(pos) {
        if (!this.renderer || !this.design) return;
        
        // If in placing mode, create new furniture
        if (this.placingType) {
            this._placeFurniture(pos);
            return;
        }
        
        // Check rotation handle BEFORE drag (Task 4B.2)
        if (this.selectedItem) {
            const handlePos = this.renderer.getRotationHandlePosition(this.selectedItem);
            const dx = pos.x - handlePos.x;
            const dy = pos.y - handlePos.y;
            if (Math.sqrt(dx * dx + dy * dy) <= ROTATION_HIT_RADIUS) {
                this._startRotation(this.selectedItem, pos);
                return;
            }
        }
        
        // Otherwise, check for hit detection (selection/drag)
        const hitItem = this.renderer.getItemAtPosition(pos.x, pos.y);
        
        if (hitItem) {
            // Select the item and start dragging
            this._selectItem(hitItem);
            this._startDrag(hitItem, pos);
        } else {
            // Clicked empty space - deselect
            this._deselectAll();
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseMove(event) {
        const pos = this._getCanvasPosition(event);
        
        // Track Shift key for snap-rotation
        this.shiftHeld = event.shiftKey;
        
        // Handle placing mode - show ghost preview
        if (this.placingType && this.placingDef) {
            this._updateGhostPreview(pos);
            return;
        }
        
        // Cursor: rotation handle hover (Task 4B.2)
        if (this.selectedItem && !this.isDragging && !this.isRotating && this.canvas) {
            const handlePos = this.renderer.getRotationHandlePosition(this.selectedItem);
            const dx = pos.x - handlePos.x;
            const dy = pos.y - handlePos.y;
            if (Math.sqrt(dx * dx + dy * dy) <= ROTATION_HIT_RADIUS) {
                this.canvas.classList.add('rotating');
            } else {
                this.canvas.classList.remove('rotating');
            }
        }
        
        if (!this.isDragging && !this.isRotating) return;
        
        event.preventDefault();
        this._handlePointerMove(pos);
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchMove(event) {
        if (event.touches.length !== 1) return;
        
        const pos = this._getCanvasPosition(event.touches[0]);
        
        // Handle placing mode - show ghost preview
        if (this.placingType && this.placingDef) {
            event.preventDefault();
            this._updateGhostPreview(pos);
            return;
        }
        
        if (!this.isDragging) return;
        
        event.preventDefault();
        this._handlePointerMove(pos);
    }
    
    /**
     * Common handler for pointer move (mouse or touch)
     * @param {Object} pos - Canvas position { x, y }
     * @private
     */
    _handlePointerMove(pos) {
        if (!this.selectedItem || !this.renderer) return;
        
        // --- Rotation mode (Task 4B.2) ---
        if (this.isRotating) {
            const canvasPos = this.renderer.worldToCanvas(this.selectedItem.x, this.selectedItem.y);
            const scaledW = this.renderer.scaleSize(this.selectedItem.width);
            const scaledD = this.renderer.scaleSize(this.selectedItem.depth);
            const centerX = canvasPos.x + scaledW / 2;
            const centerY = canvasPos.y + scaledD / 2;
            
            const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
            let delta = (currentAngle - this.rotationStartAngle) * (180 / Math.PI);
            let newRotation = this.rotationStartRotation + delta;
            
            // Shift-snap to 15-degree increments
            if (this.shiftHeld) {
                newRotation = Math.round(newRotation / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
            }
            
            this.selectedItem.setRotation(newRotation);
            this.rotationChanged = true;
            this._render();
            
            // Notify so sidebar can sync
            this.onFurnitureSelect(this.selectedItem);
            return;
        }
        
        // --- Drag mode ---
        if (!this.isDragging) return;
        
        // Convert canvas position to world position (accounting for drag offset)
        const worldPos = this.renderer.canvasToWorld(
            pos.x - this.dragOffset.x,
            pos.y - this.dragOffset.y
        );
        
        // Clamp to room boundary
        const clampedPos = this.renderer.clampToRoom({
            x: worldPos.x,
            y: worldPos.y,
            width: this.selectedItem.width,
            depth: this.selectedItem.depth
        });
        
        // Update item position
        this.selectedItem.setPosition(clampedPos.x, clampedPos.y);
        this.positionChanged = true;
        
        // Re-render for real-time visual feedback
        this._render();
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _handleMouseUp(event) {
        this._handlePointerUp();
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchEnd(event) {
        this._handlePointerUp();
    }
    
    /**
     * Common handler for pointer up (mouse or touch)
     * @private
     */
    _handlePointerUp() {
        // Finalize rotation (Task 4B.2)
        if (this.isRotating && this.rotationChanged) {
            this.onFurnitureUpdate();
            this.onDesignChange();
        }
        this.isRotating = false;
        this.rotationChanged = false;
        
        // Remove rotating cursor
        if (this.canvas) {
            this.canvas.classList.remove('rotating');
        }
        
        if (this.isDragging && this.positionChanged) {
            // Finalize position change
            this.onFurnitureUpdate();
            this.onDesignChange();
        }
        
        this.isDragging = false;
        this.positionChanged = false;
    }
    
    /**
     * Place new furniture at the given canvas position
     * @param {Object} pos - Canvas position { x, y }
     * @private
     */
    _placeFurniture(pos) {
        if (!this.placingType || !this.renderer || !this.design) return;
        
        // Get furniture definition from catalogue
        const furnitureDef = getFurnitureByType(this.placingType);
        if (!furnitureDef) {
            this.cancelPlacing();
            return;
        }
        
        // Save state for undo before modification
        this._saveState();
        
        // Convert canvas position to world position
        const worldPos = this.renderer.canvasToWorld(pos.x, pos.y);
        
        // Create new furniture item with default dimensions
        const newItem = new FurnitureItem({
            type: furnitureDef.type,
            x: worldPos.x - furnitureDef.defaultWidth / 2, // Center on click
            y: worldPos.y - furnitureDef.defaultDepth / 2,
            width: furnitureDef.defaultWidth,
            depth: furnitureDef.defaultDepth,
            height: furnitureDef.defaultHeight,
            colour: furnitureDef.defaultColour,
            rotation: 0
        });
        
        // Clamp to room boundary
        const clampedPos = this.renderer.clampToRoom(newItem);
        newItem.setPosition(clampedPos.x, clampedPos.y);
        
        // Add to design
        this.design.addFurniture(newItem);
        
        // Exit placing mode
        this.cancelPlacing();
        
        // Select the newly placed item
        this._selectItem(newItem);
        
        // Notify changes
        this.onDesignChange();
        
        // Re-render
        this._render();
    }
    
    /**
     * Start dragging the selected item
     * @param {FurnitureItem} item - The item being dragged
     * @param {Object} pos - Canvas position where drag started
     * @private
     */
    _startDrag(item, pos) {
        // Save state for undo before potential modification
        this._saveState();
        
        // Calculate drag offset (mouse position relative to item's canvas position)
        const itemCanvasPos = this.renderer.worldToCanvas(item.x, item.y);
        
        this.dragOffset = {
            x: pos.x - itemCanvasPos.x,
            y: pos.y - itemCanvasPos.y
        };
        
        this.dragStartPosition = { x: item.x, y: item.y };
        this.isDragging = true;
        this.positionChanged = false;
    }
    
    /**
     * Start rotating the selected item (Task 4B.2)
     * @param {FurnitureItem} item - The item being rotated
     * @param {Object} pos - Canvas position where rotation started
     * @private
     */
    _startRotation(item, pos) {
        // Save state for undo before potential modification
        this._saveState();
        
        // Compute centre of item in canvas space
        const canvasPos = this.renderer.worldToCanvas(item.x, item.y);
        const scaledW = this.renderer.scaleSize(item.width);
        const scaledD = this.renderer.scaleSize(item.depth);
        const centerX = canvasPos.x + scaledW / 2;
        const centerY = canvasPos.y + scaledD / 2;
        
        this.rotationStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
        this.rotationStartRotation = item.rotation || 0;
        this.isRotating = true;
        this.rotationChanged = false;
    }
    
    /**
     * Select a furniture item
     * @param {FurnitureItem} item - The item to select
     * @private
     */
    _selectItem(item) {
        this.selectedItem = item;
        
        // Update renderer selection
        if (this.renderer) {
            this.renderer.setSelectedId(item?.id || null);
        }
        
        // Notify callback
        this.onFurnitureSelect(item);
        
        // Re-render to show selection
        this._render();
    }
    
    /**
     * Deselect all items
     * @private
     */
    _deselectAll() {
        this.selectedItem = null;
        
        // Update renderer selection
        if (this.renderer) {
            this.renderer.setSelectedId(null);
        }
        
        // Notify callback
        this.onFurnitureSelect(null);
        
        // Re-render
        this._render();
    }
    
    /**
     * Update ghost preview position during placing mode
     * @param {Object} pos - Canvas position { x, y }
     * @private
     */
    _updateGhostPreview(pos) {
        if (!this.renderer || !this.placingDef) return;
        
        // Convert canvas position to world position
        const worldPos = this.renderer.canvasToWorld(pos.x, pos.y);
        
        // Center the preview on cursor
        const previewX = worldPos.x - this.placingDef.defaultWidth / 2;
        const previewY = worldPos.y - this.placingDef.defaultDepth / 2;
        
        // Clamp to room boundary
        const clampedPos = this.renderer.clampToRoom({
            x: previewX,
            y: previewY,
            width: this.placingDef.defaultWidth,
            depth: this.placingDef.defaultDepth
        });
        
        // Set ghost preview on renderer
        this.renderer.setGhostPreview({
            type: this.placingDef.type,
            x: clampedPos.x,
            y: clampedPos.y,
            width: this.placingDef.defaultWidth,
            depth: this.placingDef.defaultDepth,
            colour: this.placingDef.defaultColour
        });
        
        // Re-render to show preview
        this._render();
    }
    
    /**
     * Trigger a canvas re-render
     * @private
     */
    _render() {
        if (this.renderer && this.design) {
            this.renderer.render(
                this.design.room,
                this.design.furniture,
                this.selectedItem?.id || null
            );
        }
    }
    
    /**
     * Save current design state for undo
     * @private
     */
    _saveState() {
        if (!this.design) return;
        
        // Serialize current state
        const state = this.design.toJSON();
        
        // Add to undo stack
        this.undoStack.push(JSON.stringify(state));
        
        // Limit stack size
        if (this.undoStack.length > MAX_UNDO_STACK) {
            this.undoStack.shift();
        }
    }
    
    /**
     * Undo the last operation
     * @returns {boolean} True if undo was successful
     */
    undo() {
        if (this.undoStack.length === 0) {
            return false;
        }
        
        // Pop last state
        const stateJson = this.undoStack.pop();
        const state = JSON.parse(stateJson);
        
        // Restore design from snapshot
        const restoredDesign = Design.fromJSON(state);
        
        // Update design properties
        this.design.name = restoredDesign.name;
        this.design.room = restoredDesign.room;
        this.design.furniture = restoredDesign.furniture;
        this.design.updatedAt = restoredDesign.updatedAt;
        
        // Deselect current item (it may no longer exist)
        this._deselectAll();
        
        // Notify changes
        this.onDesignChange();
        
        // Re-render
        this._render();
        
        return true;
    }
    
    /**
     * Delete the currently selected furniture item
     * @returns {boolean} True if deletion was successful
     */
    deleteSelected() {
        if (!this.selectedItem || !this.design) {
            return false;
        }
        
        // Save state for undo
        this._saveState();
        
        // Remove from design
        const removed = this.design.removeFurniture(this.selectedItem.id);
        
        if (removed) {
            // Deselect
            this._deselectAll();
            
            // Notify changes
            this.onDesignChange();
            
            // Re-render
            this._render();
        }
        
        return removed;
    }
    
    /**
     * Enter placing mode for a furniture type
     * @param {string} furnitureType - Type from furniture catalogue
     */
    startPlacing(furnitureType) {
        if (!furnitureType) return;
        
        // Get furniture definition for preview dimensions
        const furnitureDef = getFurnitureByType(furnitureType);
        if (!furnitureDef) return;
        
        this.placingType = furnitureType;
        this.placingDef = furnitureDef;
        
        // Change cursor to crosshair
        if (this.canvas) {
            this.canvas.classList.add('placing');
        }
        
        // Deselect any current selection
        this._deselectAll();
    }
    
    /**
     * Exit placing mode
     */
    cancelPlacing() {
        this.placingType = null;
        this.placingDef = null;
        
        // Clear ghost preview
        if (this.renderer) {
            this.renderer.clearGhostPreview();
            this._render();
        }
        
        // Reset cursor
        if (this.canvas) {
            this.canvas.classList.remove('placing');
        }
    }
    
    /**
     * Check if currently in placing mode
     * @returns {boolean} True if in placing mode
     */
    isPlacing() {
        return this.placingType !== null;
    }
    
    /**
     * Get the currently selected item
     * @returns {FurnitureItem|null} Selected item or null
     */
    getSelectedItem() {
        return this.selectedItem;
    }
    
    /**
     * Set the design model
     * @param {Design} design - The design model to use
     */
    setDesign(design) {
        this.design = design;
        this.undoStack = []; // Clear undo stack for new design
        this._deselectAll();
    }
    
    /**
     * Set the renderer instance
     * @param {Renderer2D} renderer - The renderer to use
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    /**
     * Check if undo is available
     * @returns {boolean} True if undo stack has entries
     */
    canUndo() {
        return this.undoStack.length > 0;
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
        if (!this.canvas) return;
        
        // Remove mouse events
        this.canvas.removeEventListener('mousedown', this._boundHandleMouseDown);
        this.canvas.removeEventListener('mousemove', this._boundHandleMouseMove);
        this.canvas.removeEventListener('mouseup', this._boundHandleMouseUp);
        this.canvas.removeEventListener('mouseleave', this._boundHandleMouseUp);
        
        // Remove touch events
        this.canvas.removeEventListener('touchstart', this._boundHandleTouchStart);
        this.canvas.removeEventListener('touchmove', this._boundHandleTouchMove);
        this.canvas.removeEventListener('touchend', this._boundHandleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this._boundHandleTouchEnd);
        
        // Clear state
        this.selectedItem = null;
        this.isDragging = false;
        this.placingType = null;
        this.undoStack = [];
    }
}

export { CanvasController };
export default CanvasController;
