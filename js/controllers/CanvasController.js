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
import { Toast } from '../views/components/Toast.js';
import { autoArrangeFurniture } from '../utils/autoArrange.js';

/**
 * Furniture types that must be placed on a table surface
 * @type {Set<string>}
 */
const TABLETOP_ITEMS = new Set(['table-plant', 'table-lamp', 'bedside-lamp']);

/**
 * Furniture types that provide a surface for tabletop items
 * @type {Set<string>}
 */
const TABLE_SURFACES = new Set(['side-table', 'desk', 'tv-stand', 'coffee-table', 'dining-table']);

/**
 * Furniture types that must be placed on a wall
 * @type {Set<string>}
 */
const WALL_ITEMS = new Set(['single-door', 'double-door', 'standard-window', 'tall-window', 'small-window']);

/**
 * Maximum perpendicular distance (meters) from a wall for snap-to-wall placement
 * @type {number}
 */
const WALL_SNAP_THRESHOLD = 0.5;

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
 * Default snap-to-grid increment in meters
 * @type {number}
 */
const SNAP_INCREMENT = 0.25;

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
        
        // Snap-to-grid state
        this.snapToGrid = true;
        this.snapIncrement = SNAP_INCREMENT;

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
        // Wall items cannot be rotated — their rotation is set by wall placement
        if (this.selectedItem && !WALL_ITEMS.has(this.selectedItem.type)) {
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

        // --- Wall items: constrain drag to current wall ---
        if (WALL_ITEMS.has(this.selectedItem.type) && this.selectedItem.wall) {
            const room = this.design.room;
            const wall = this.selectedItem.wall;
            let nx = this.selectedItem.x;
            let ny = this.selectedItem.y;

            if (wall === 'top' || wall === 'bottom') {
                // Slide along x axis, y is fixed
                nx = Math.max(0, Math.min(worldPos.x, room.width - this.selectedItem.width));
            } else {
                // Left/right wall: slide along y axis, x is fixed
                // depth holds the along-wall span (swapped at placement)
                ny = Math.max(0, Math.min(worldPos.y, room.depth - this.selectedItem.depth));
            }

            this.selectedItem.setPosition(nx, ny);
            this.positionChanged = true;
            this._render();
            return;
        }

        // Clamp to room boundary
        const clampedPos = this.renderer.clampToRoom({
            x: worldPos.x,
            y: worldPos.y,
            width: this.selectedItem.width,
            depth: this.selectedItem.depth
        });
        
        // Snap to grid if enabled
        let finalPos = this.snapToGrid
            ? this._snapPosition(clampedPos.x, clampedPos.y)
            : clampedPos;

        // Re-clamp after snap — rounding can push position past boundary
        if (this.snapToGrid) {
            finalPos = this.renderer.clampToRoom({
                x: finalPos.x,
                y: finalPos.y,
                width: this.selectedItem.width,
                depth: this.selectedItem.depth
            });
        }

        // Resolve furniture-to-furniture collisions (rugs excluded)
        finalPos = this._resolveCollisions(this.selectedItem, finalPos.x, finalPos.y);

        // Re-clamp after collision push — separation can push outside room
        finalPos = this.renderer.clampToRoom({
            x: finalPos.x,
            y: finalPos.y,
            width: this.selectedItem.width,
            depth: this.selectedItem.depth
        });

        // Update item position
        this.selectedItem.setPosition(finalPos.x, finalPos.y);
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
            // If a tabletop item was dragged, snap it to the nearest overlapping table
            if (this.selectedItem && TABLETOP_ITEMS.has(this.selectedItem.type)) {
                const table = this._findBestOverlappingTable(this.selectedItem);
                if (table) {
                    // Clamp tabletop item within the table bounds
                    const cx = Math.max(table.x,
                        Math.min(this.selectedItem.x, table.x + table.width - this.selectedItem.width));
                    const cy = Math.max(table.y,
                        Math.min(this.selectedItem.y, table.y + table.depth - this.selectedItem.depth));
                    this.selectedItem.setPosition(cx, cy);
                    this.selectedItem.parentTableId = table.id;
                } else {
                    // No table found — revert to start position
                    this.selectedItem.setPosition(this.dragStartPosition.x, this.dragStartPosition.y);
                    Toast.warning('Tabletop items must stay on a table');
                }
                this._render();
            }

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

        const isTabletopItem = TABLETOP_ITEMS.has(furnitureDef.type);

        // Convert canvas position to world position
        const rawPos = this.renderer.canvasToWorld(pos.x, pos.y);

        // --- Tabletop items: must land on a valid table surface ---
        if (isTabletopItem) {
            const targetTable = this._findTableAtPoint(rawPos.x, rawPos.y);
            if (!targetTable) {
                Toast.warning('Place this item on a table surface');
                return;
            }

            // Save state for undo before modification
            this._saveState();

            // Centre the item on the table
            const cx = targetTable.x + targetTable.width / 2 - furnitureDef.defaultWidth / 2;
            const cy = targetTable.y + targetTable.depth / 2 - furnitureDef.defaultDepth / 2;

            const newItem = new FurnitureItem({
                type: furnitureDef.type,
                x: cx,
                y: cy,
                width: furnitureDef.defaultWidth,
                depth: furnitureDef.defaultDepth,
                height: furnitureDef.defaultHeight,
                colour: furnitureDef.defaultColour,
                rotation: 0
            });

            // Store which table this item sits on
            newItem.parentTableId = targetTable.id;

            this.design.addFurniture(newItem);
            this.cancelPlacing();
            this._selectItem(newItem);
            this.onDesignChange();
            this._notifyPlaced(furnitureDef.label || furnitureDef.type);
            this._render();
            return;
        }

        // --- Wall items: must land on a wall surface ---
        const isWallItem = WALL_ITEMS.has(furnitureDef.type);
        if (isWallItem) {
            const wallInfo = this._findNearestWall(rawPos.x, rawPos.y, furnitureDef.defaultWidth);
            if (!wallInfo) {
                Toast.warning('Place this item on a wall');
                return;
            }

            this._saveState();

            // Left/right walls: swap width ↔ depth so bounding box matches physical footprint
            const isVerticalWall = wallInfo.wall === 'left' || wallInfo.wall === 'right';
            const newItem = new FurnitureItem({
                type: furnitureDef.type,
                x: wallInfo.x,
                y: wallInfo.y,
                width:  isVerticalWall ? furnitureDef.defaultDepth : furnitureDef.defaultWidth,
                depth:  isVerticalWall ? furnitureDef.defaultWidth : furnitureDef.defaultDepth,
                height: furnitureDef.defaultHeight,
                colour: furnitureDef.defaultColour,
                rotation: wallInfo.rotation,
                wall: wallInfo.wall
            });

            this.design.addFurniture(newItem);
            this.cancelPlacing();
            this._selectItem(newItem);
            this.onDesignChange();
            this._notifyPlaced(furnitureDef.label || furnitureDef.type);
            this._render();
            return;
        }

        // --- Standard floor placement ---
        // Save state for undo before modification
        this._saveState();

        // Snap placement position to grid if enabled
        const worldPos = this.snapToGrid
            ? this._snapPosition(
                rawPos.x - furnitureDef.defaultWidth / 2,
                rawPos.y - furnitureDef.defaultDepth / 2
              )
            : { x: rawPos.x - furnitureDef.defaultWidth / 2,
                y: rawPos.y - furnitureDef.defaultDepth / 2 };

        // Create new furniture item with default dimensions
        const newItem = new FurnitureItem({
            type: furnitureDef.type,
            x: worldPos.x,
            y: worldPos.y,
            width: furnitureDef.defaultWidth,
            depth: furnitureDef.defaultDepth,
            height: furnitureDef.defaultHeight,
            colour: furnitureDef.defaultColour,
            rotation: 0
        });

        // Clamp to room boundary
        let clampedPos = this.renderer.clampToRoom(newItem);

        // Snap placement position to grid, then re-clamp after rounding
        if (this.snapToGrid) {
            const snapped = this._snapPosition(clampedPos.x, clampedPos.y);
            clampedPos = this.renderer.clampToRoom({
                x: snapped.x,
                y: snapped.y,
                width: newItem.width,
                depth: newItem.depth
            });
        }

        newItem.setPosition(clampedPos.x, clampedPos.y);

        // Resolve collisions — push away from existing furniture (rugs excluded)
        const safePos = this._resolveCollisions(newItem, clampedPos.x, clampedPos.y);

        // Re-clamp after collision push
        const finalPos = this.renderer.clampToRoom({
            x: safePos.x,
            y: safePos.y,
            width: newItem.width,
            depth: newItem.depth
        });

        newItem.setPosition(finalPos.x, finalPos.y);

        // Add to design
        this.design.addFurniture(newItem);

        // Exit placing mode
        this.cancelPlacing();

        // Select the newly placed item
        this._selectItem(newItem);

        // Notify changes
        this.onDesignChange();

        // Feedback: furniture placed (Nielsen H1 — Visibility of System Status)
        this._notifyPlaced(furnitureDef.label || furnitureDef.type);

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

        // --- Wall items: snap preview to nearest wall ---
        const isWallItem = WALL_ITEMS.has(this.placingDef.type);
        if (isWallItem) {
            const wallInfo = this._findNearestWall(worldPos.x, worldPos.y, this.placingDef.defaultWidth);
            if (wallInfo) {
                const isVert = wallInfo.wall === 'left' || wallInfo.wall === 'right';
                this.renderer.setGhostPreview({
                    type: this.placingDef.type,
                    x: wallInfo.x,
                    y: wallInfo.y,
                    width:  isVert ? this.placingDef.defaultDepth : this.placingDef.defaultWidth,
                    depth:  isVert ? this.placingDef.defaultWidth : this.placingDef.defaultDepth,
                    colour: this.placingDef.defaultColour,
                    rotation: wallInfo.rotation,
                    wall: wallInfo.wall,
                    invalid: false
                });
            } else {
                // Too far from any wall — show invalid
                const previewX = worldPos.x - this.placingDef.defaultWidth / 2;
                const previewY = worldPos.y - this.placingDef.defaultDepth / 2;
                this.renderer.setGhostPreview({
                    type: this.placingDef.type,
                    x: previewX,
                    y: previewY,
                    width: this.placingDef.defaultWidth,
                    depth: this.placingDef.defaultDepth,
                    colour: this.placingDef.defaultColour,
                    invalid: true
                });
            }
            this._render();
            return;
        }

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

        // Snap to grid if enabled
        const finalPos = this.snapToGrid
            ? this._snapPosition(clampedPos.x, clampedPos.y)
            : clampedPos;

        // For tabletop items, check if hovering over a valid table
        const isTabletop = TABLETOP_ITEMS.has(this.placingDef.type);
        const overTable = isTabletop
            ? this._findTableAtPoint(worldPos.x, worldPos.y) !== null
            : true;

        // Set ghost preview on renderer
        this.renderer.setGhostPreview({
            type: this.placingDef.type,
            x: finalPos.x,
            y: finalPos.y,
            width: this.placingDef.defaultWidth,
            depth: this.placingDef.defaultDepth,
            colour: this.placingDef.defaultColour,
            invalid: isTabletop && !overTable
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
     * Auto-arrange all furniture using zone-based heuristics.
     *
     * Saves current state for undo, computes a new layout via the
     * autoArrange algorithm, then animates each item to its new position.
     *
     * @returns {boolean} True if arrangement was applied
     */
    autoArrange() {
        if (!this.design || !this.design.room) return false;

        const items = this.design.furniture;
        if (!Array.isArray(items) || items.length === 0) return false;

        const layoutMap = autoArrangeFurniture(this.design.room, items);
        if (layoutMap.size === 0) return false;

        // Save state for undo before modification
        this._saveState();

        // Capture old positions for animation
        const startPositions = new Map();
        for (const item of items) {
            startPositions.set(item.id, {
                x: item.x,
                y: item.y,
                rotation: item.rotation || 0
            });
        }

        // Animate items to new positions over 400ms
        const duration = 400;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease-out cubic for smooth deceleration
            const ease = 1 - Math.pow(1 - t, 3);

            for (const item of items) {
                const target = layoutMap.get(item.id);
                const start = startPositions.get(item.id);
                if (!target || !start) continue;

                item.setPosition(
                    start.x + (target.x - start.x) * ease,
                    start.y + (target.y - start.y) * ease
                );
                item.setRotation(
                    start.rotation + (target.rotation - start.rotation) * ease
                );
            }

            this._render();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure final positions are exact
                for (const item of items) {
                    const target = layoutMap.get(item.id);
                    if (!target) continue;
                    item.setPosition(target.x, target.y);
                    item.setRotation(target.rotation);
                }
                this._render();
                this._deselectAll();
                this.onDesignChange();
            }
        };

        requestAnimationFrame(animate);
        return true;
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

    /**
     * Snap a world position to the nearest grid increment.
     *
     * @param {number} worldX - X position in meters
     * @param {number} worldY - Y position in meters
     * @returns {Object} Snapped position { x, y }
     * @private
     */
    _snapPosition(worldX, worldY) {
        const inc = this.snapIncrement;
        return {
            x: Math.round(worldX / inc) * inc,
            y: Math.round(worldY / inc) * inc
        };
    }

    /**
     * Toggle snap-to-grid on or off.
     *
     * @returns {boolean} New snap-to-grid state
     */
    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;
        return this.snapToGrid;
    }

    /**
     * Show a toast notification when furniture is placed.
     * @param {string} label - Furniture type label
     * @private
     */
    _notifyPlaced(label) {
        const name = label
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        Toast.success(`${name} placed`);
    }

    // ── Collision detection ──────────────────────────────────────────

    /**
     * Check whether two axis-aligned bounding boxes overlap.
     *
     * @param {Object} a - { x, y, width, depth }
     * @param {Object} b - { x, y, width, depth }
     * @returns {boolean}
     * @private
     */
    static _boxesOverlap(a, b) {
        return (
            a.x < b.x + b.width  &&
            a.x + a.width  > b.x &&
            a.y < b.y + b.depth  &&
            a.y + a.depth  > b.y
        );
    }

    /**
     * Resolve the position of a moving furniture item so it does not
     * overlap any other furniture item (except rugs).
     *
     * Strategy: if the desired position overlaps another item, compute
     * the minimum translation along each axis to separate them.  Pick
     * the axis with the **smallest** push distance (minimum penetration
     * axis) so the item "slides" to the nearest edge of the blocker.
     * Repeat until no overlaps remain (handles chain collisions).
     *
     * Rugs are always excluded because they sit flat on the floor and
     * any furniture can be placed on top of them.
     *
     * @param {Object}  movingItem  - The item being moved { id, type, x, y, width, depth }
     * @param {number}  desiredX    - Desired X position (world meters)
     * @param {number}  desiredY    - Desired Y position (world meters)
     * @returns {{ x: number, y: number }} Resolved non-overlapping position
     * @private
     */
    _resolveCollisions(movingItem, desiredX, desiredY) {
        if (!this.design) return { x: desiredX, y: desiredY };

        // Rugs can be placed anywhere — skip collision entirely for them
        if (movingItem.type === 'rug') return { x: desiredX, y: desiredY };

        // Tabletop items skip collision — they sit on tables
        if (TABLETOP_ITEMS.has(movingItem.type)) return { x: desiredX, y: desiredY };

        // Wall items skip collision — they sit on walls
        if (WALL_ITEMS.has(movingItem.type)) return { x: desiredX, y: desiredY };

        const others = this.design.furniture.filter(
            f => f.id !== movingItem.id && f.type !== 'rug'
                && !TABLETOP_ITEMS.has(f.type) // tabletop items don't block floor items
                && !WALL_ITEMS.has(f.type)     // wall items don't block floor items
        );

        if (others.length === 0) return { x: desiredX, y: desiredY };

        let x = desiredX;
        let y = desiredY;
        const w = movingItem.width;
        const d = movingItem.depth;

        // Up to N iterations to resolve chain collisions
        const MAX_PASSES = others.length + 1;
        for (let pass = 0; pass < MAX_PASSES; pass++) {
            let resolved = true;

            for (const other of others) {
                const a = { x, y, width: w, depth: d };
                const b = { x: other.x, y: other.y, width: other.width, depth: other.depth };

                if (!CanvasController._boxesOverlap(a, b)) continue;

                resolved = false;

                // Compute overlap on each axis
                const overlapLeft   = (x + w) - b.x;          // push left
                const overlapRight  = (b.x + b.width) - x;    // push right
                const overlapTop    = (y + d) - b.y;           // push up
                const overlapBottom = (b.y + b.depth) - y;     // push down

                // Find minimum penetration axis
                const minX = overlapLeft < overlapRight ? -overlapLeft : overlapRight;
                const minY = overlapTop < overlapBottom ? -overlapTop  : overlapBottom;

                if (Math.abs(minX) <= Math.abs(minY)) {
                    x += minX;
                } else {
                    y += minY;
                }
            }

            if (resolved) break;
        }

        return { x, y };
    }

    // ── Tabletop placement helpers ──────────────────────────────────

    /**
     * Find a table surface at a given world point.
     *
     * @param {number} worldX - X position in meters
     * @param {number} worldY - Y position in meters
     * @returns {Object|null} The furniture item that is a table surface, or null
     * @private
     */
    _findTableAtPoint(worldX, worldY) {
        if (!this.design) return null;
        const tables = this.design.furniture.filter(f => TABLE_SURFACES.has(f.type));
        for (const table of tables) {
            if (worldX >= table.x && worldX <= table.x + table.width &&
                worldY >= table.y && worldY <= table.y + table.depth) {
                return table;
            }
        }
        return null;
    }

    /**
     * Find the table surface that most overlaps a tabletop item's bounding box.
     *
     * @param {Object} item - { x, y, width, depth }
     * @returns {Object|null} Best overlapping table or null
     * @private
     */
    _findBestOverlappingTable(item) {
        if (!this.design) return null;
        const tables = this.design.furniture.filter(f => TABLE_SURFACES.has(f.type));
        let bestTable = null;
        let bestArea = 0;
        for (const table of tables) {
            const overlapX = Math.max(0,
                Math.min(item.x + item.width, table.x + table.width) - Math.max(item.x, table.x));
            const overlapY = Math.max(0,
                Math.min(item.y + item.depth, table.y + table.depth) - Math.max(item.y, table.y));
            const area = overlapX * overlapY;
            if (area > bestArea) {
                bestArea = area;
                bestTable = table;
            }
        }
        return bestTable;
    }

    // ── Wall placement helpers ──────────────────────────────────────

    /**
     * Find the nearest room wall to a world point and return snap position.
     *
     * For rectangular/square rooms: 4 walls (top, bottom, left, right).
     * For L-shaped rooms: 6 wall segments.
     *
     * @param {number} worldX - Cursor X in meters
     * @param {number} worldY - Cursor Y in meters
     * @param {number} itemWidth - Width of the item being placed (along-wall dimension)
     * @returns {{ wall: string, x: number, y: number, rotation: number }|null}
     * @private
     */
    _findNearestWall(worldX, worldY, itemWidth) {
        if (!this.design) return null;
        const room = this.design.room;
        const W = room.width;
        const D = room.depth;
        const itemDepth = 0.05; // wall items are thin

        // Build wall segments: { name, dist, x, y, rotation }
        const walls = [];

        // Top wall (y = 0)
        const topClampX = Math.max(0, Math.min(worldX - itemWidth / 2, W - itemWidth));
        walls.push({ wall: 'top', dist: Math.abs(worldY), x: topClampX, y: 0, rotation: 0 });

        // Bottom wall (y = depth - itemDepth)
        const botClampX = Math.max(0, Math.min(worldX - itemWidth / 2, W - itemWidth));
        walls.push({ wall: 'bottom', dist: Math.abs(worldY - D), x: botClampX, y: D - itemDepth, rotation: 180 });

        // Left wall (x = 0)
        const leftClampY = Math.max(0, Math.min(worldY - itemWidth / 2, D - itemWidth));
        walls.push({ wall: 'left', dist: Math.abs(worldX), x: 0, y: leftClampY, rotation: 90 });

        // Right wall (x = width - itemDepth)
        const rightClampY = Math.max(0, Math.min(worldY - itemWidth / 2, D - itemWidth));
        walls.push({ wall: 'right', dist: Math.abs(worldX - W), x: W - itemDepth, y: rightClampY, rotation: 270 });

        // For L-shaped rooms, add inner wall segments
        if (room.shape === 'l-shaped') {
            const hw = W / 2;
            const hd = D / 2;
            // Inner horizontal wall: y = hd, x spans [hw, W]
            if (worldX >= hw) {
                const ihClampX = Math.max(hw, Math.min(worldX - itemWidth / 2, W - itemWidth));
                walls.push({ wall: 'top', dist: Math.abs(worldY - hd), x: ihClampX, y: hd, rotation: 0 });
            }
            // Inner vertical wall: x = hw, y spans [0, hd]
            if (worldY <= hd) {
                const ivClampY = Math.max(0, Math.min(worldY - itemWidth / 2, hd - itemWidth));
                walls.push({ wall: 'right', dist: Math.abs(worldX - hw), x: hw - itemDepth, y: ivClampY, rotation: 270 });
            }
        }

        // Find the nearest wall within threshold
        let best = null;
        for (const w of walls) {
            if (w.dist <= WALL_SNAP_THRESHOLD && (!best || w.dist < best.dist)) {
                best = w;
            }
        }

        return best;
    }
}

export { CanvasController };
export default CanvasController;
