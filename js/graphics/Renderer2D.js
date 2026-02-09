/**
 * FurnishView — 2D Renderer
 * 
 * HTML5 Canvas 2D rendering engine for top-down room visualization.
 * Implements hand-coded computer graphics algorithms for:
 * - Coordinate scaling (real-world meters → canvas pixels)
 * - Hit detection (point-in-rectangle test for furniture selection)
 * - Boundary clamping (prevent furniture placement outside room)
 * - Render loop (clear → grid → room → furniture → selection)
 * 
 * Canvas API methods used: fillRect, strokeRect, beginPath, moveTo, lineTo,
 * fill, stroke, clearRect, save, restore, translate, rotate, fillText, setLineDash, arc
 * 
 * @file js/graphics/Renderer2D.js
 * @module graphics/Renderer2D
 */

import { 
    getScaleFactor, 
    getCentreOffset, 
    worldToCanvas, 
    canvasToWorld,
    scaleToCanvas,
    PADDING 
} from '../utils/scaleCalculator.js';

/**
 * Default colours for rendering
 * @type {Object}
 */
const RENDER_COLOURS = {
    GRID: '#E5E5E5',
    GRID_LABEL: '#999999',
    SELECTION: '#3B82F6',
    SELECTION_HANDLE: '#3B82F6',
    FURNITURE_BORDER: 'rgba(0, 0, 0, 0.3)',
    FURNITURE_LABEL: '#FFFFFF',
    DIMENSION_LABEL: '#666666',
    CANVAS_BG: '#FAFAFA'
};

/**
 * Rendering configuration
 * @type {Object}
 */
const RENDER_CONFIG = {
    GRID_LINE_WIDTH: 1,
    WALL_LINE_WIDTH: 3,
    FURNITURE_BORDER_WIDTH: 2,
    SELECTION_BORDER_WIDTH: 2,
    SELECTION_DASH: [6, 4],
    HANDLE_SIZE: 8,
    LABEL_FONT_SIZE: 12,
    DIMENSION_FONT_SIZE: 11,
    MIN_LABEL_SIZE: 40 // Minimum furniture size to show label
};

/**
 * Renderer2D class
 * Manages 2D canvas rendering for room layouts
 * 
 * @example
 * const renderer = new Renderer2D({ canvas: canvasElement });
 * renderer.setRoom(roomData);
 * renderer.setFurniture(furnitureArray);
 * renderer.render();
 */
class Renderer2D {
    /**
     * Create a Renderer2D instance
     * 
     * @param {Object} options - Configuration
     * @param {HTMLCanvasElement} options.canvas - The canvas element to render to
     * @param {number} [options.width=800] - Canvas width in pixels
     * @param {number} [options.height=600] - Canvas height in pixels
     * @param {boolean} [options.showGrid=true] - Whether to show the grid overlay
     * @param {boolean} [options.showDimensions=true] - Whether to show dimension labels
     */
    constructor({
        canvas = null,
        width = 800,
        height = 600,
        showGrid = true,
        showDimensions = true
    } = {}) {
        /** @type {HTMLCanvasElement|null} Canvas element */
        this.canvas = canvas;
        
        /** @type {CanvasRenderingContext2D|null} 2D rendering context */
        this.ctx = canvas ? canvas.getContext('2d') : null;
        
        /** @type {number} Canvas width in pixels */
        this.width = width;
        
        /** @type {number} Canvas height in pixels */
        this.height = height;
        
        /** @type {number} Padding from canvas edges in pixels */
        this.padding = PADDING;
        
        /** @type {boolean} Whether to render grid lines */
        this.showGrid = showGrid;
        
        /** @type {boolean} Whether to render dimension labels */
        this.showDimensions = showDimensions;
        
        /** @type {Object|null} Room data (width, depth, height, shape, colours) */
        this.room = null;
        
        /** @type {Array} Array of furniture items to render */
        this.furniture = [];
        
        /** @type {string|null} ID of selected furniture item */
        this.selectedId = null;
        
        /** @type {number} Calculated scale factor (pixels per meter) */
        this.scale = 100;
        
        /** @type {Object} Offset for centering room { x, y } */
        this.offset = { x: 0, y: 0 };
        
        // Set canvas dimensions if provided
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }
    
    /**
     * Set the room data and recalculate scale
     * 
     * @param {Object} room - Room data object
     * @param {number} room.width - Room width in meters
     * @param {number} room.depth - Room depth in meters
     * @param {string} room.shape - Room shape ('rectangular' or 'l-shaped')
     * @param {string} room.wallColour - Wall colour as hex string
     * @param {string} room.floorColour - Floor colour as hex string
     */
    setRoom(room) {
        this.room = room;
        this._calculateScale();
    }
    
    /**
     * Set the furniture array to render
     * 
     * @param {Array} furniture - Array of furniture item objects
     */
    setFurniture(furniture) {
        this.furniture = Array.isArray(furniture) ? furniture : [];
    }
    
    /**
     * Set the selected furniture item ID
     * 
     * @param {string|null} id - ID of selected furniture, or null for no selection
     */
    setSelectedId(id) {
        this.selectedId = id;
    }
    
    /**
     * Calculate scale factor and offset based on room and canvas dimensions.
     * 
     * ALGORITHM: Coordinate Scaling
     * - Scale factor = min(availableWidth / roomWidth, availableHeight / roomDepth)
     * - This ensures the room fits entirely within the canvas with padding
     * - Offset centres the room within the available space
     * 
     * @private
     */
    _calculateScale() {
        if (!this.room) {
            this.scale = 100;
            this.offset = { x: this.padding, y: this.padding };
            return;
        }
        
        // Use scaleCalculator utilities for consistent calculations
        this.scale = getScaleFactor(
            this.room.width, 
            this.room.depth, 
            this.width, 
            this.height
        );
        
        this.offset = getCentreOffset(
            this.room.width, 
            this.room.depth, 
            this.width, 
            this.height
        );
    }
    
    /**
     * Convert world coordinates (meters) to canvas coordinates (pixels).
     * 
     * ALGORITHM: World to Canvas Conversion
     * canvasX = offset.x + (worldX * scale)
     * canvasY = offset.y + (worldY * scale)
     * 
     * @param {number} worldX - X position in meters
     * @param {number} worldY - Y position in meters
     * @returns {Object} Canvas coordinates { x, y } in pixels
     */
    worldToCanvas(worldX, worldY) {
        if (!this.room) {
            return { x: worldX, y: worldY };
        }
        return worldToCanvas(
            worldX, 
            worldY, 
            this.room.width, 
            this.room.depth, 
            this.width, 
            this.height
        );
    }
    
    /**
     * Convert canvas coordinates (pixels) to world coordinates (meters).
     * 
     * ALGORITHM: Canvas to World Conversion (Inverse of worldToCanvas)
     * worldX = (canvasX - offset.x) / scale
     * worldY = (canvasY - offset.y) / scale
     * 
     * @param {number} canvasX - X position in pixels
     * @param {number} canvasY - Y position in pixels
     * @returns {Object} World coordinates { x, y } in meters
     */
    canvasToWorld(canvasX, canvasY) {
        if (!this.room) {
            return { x: canvasX, y: canvasY };
        }
        return canvasToWorld(
            canvasX, 
            canvasY, 
            this.room.width, 
            this.room.depth, 
            this.width, 
            this.height
        );
    }
    
    /**
     * Scale a dimension from world units to canvas pixels.
     * 
     * @param {number} worldSize - Size in meters
     * @returns {number} Size in pixels
     */
    scaleSize(worldSize) {
        return worldSize * this.scale;
    }
    
    /**
     * Clear the entire canvas.
     * 
     * @private
     */
    _clear() {
        if (!this.ctx) return;
        
        // Fill with background colour
        this.ctx.fillStyle = RENDER_COLOURS.CANVAS_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Main render method - draws the complete scene.
     * 
     * RENDER LOOP ORDER:
     * 1. Clear canvas (removes previous frame)
     * 2. Draw grid (optional background reference)
     * 3. Draw room (floor fill + wall outline)
     * 4. Draw all furniture items
     * 5. Draw selection highlight on selected item
     * 
     * @param {Object} [room] - Optional room data (uses stored room if not provided)
     * @param {Array} [furniture] - Optional furniture array
     * @param {string|null} [selectedId] - Optional selected item ID
     */
    render(room = null, furniture = null, selectedId = null) {
        // Update data if provided
        if (room !== null) {
            this.setRoom(room);
        }
        if (furniture !== null) {
            this.setFurniture(furniture);
        }
        if (selectedId !== null) {
            this.selectedId = selectedId;
        }
        
        if (!this.ctx) return;
        
        // Step 1: Clear canvas
        this._clear();
        
        if (!this.room) return;
        
        // Step 2: Draw grid (optional)
        if (this.showGrid) {
            this._drawGrid();
        }
        
        // Step 3: Draw room outline
        this._drawRoom();
        
        // Step 4: Draw all furniture items
        this._drawAllFurniture();
        
        // Step 5: Draw selection highlight
        if (this.selectedId) {
            const selectedItem = this.furniture.find(f => f.id === this.selectedId);
            if (selectedItem) {
                this._drawSelection(selectedItem);
            }
        }
    }
    
    /**
     * ALGORITHM 4: Draw Grid
     * 
     * Draws light grey lines at 1-meter intervals to help users gauge scale.
     * Lines span only the room area, not the full canvas.
     * Labels show meter markings at edges.
     * 
     * @private
     */
    _drawGrid() {
        if (!this.ctx || !this.room) return;
        
        const ctx = this.ctx;
        const roomWidth = this.room.width;
        const roomDepth = this.room.depth;
        
        // Get room corners in canvas coordinates
        const topLeft = this.worldToCanvas(0, 0);
        const bottomRight = this.worldToCanvas(roomWidth, roomDepth);
        
        ctx.save();
        ctx.strokeStyle = RENDER_COLOURS.GRID;
        ctx.lineWidth = RENDER_CONFIG.GRID_LINE_WIDTH;
        ctx.font = `${RENDER_CONFIG.DIMENSION_FONT_SIZE}px sans-serif`;
        ctx.fillStyle = RENDER_COLOURS.GRID_LABEL;
        
        // Draw vertical lines (X-axis)
        for (let x = 0; x <= roomWidth; x++) {
            const pos = this.worldToCanvas(x, 0);
            const endPos = this.worldToCanvas(x, roomDepth);
            
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
            
            // Draw label at top
            if (x % 1 === 0) {
                ctx.fillText(`${x}m`, pos.x - 8, pos.y - 8);
            }
        }
        
        // Draw horizontal lines (Y-axis / depth)
        for (let y = 0; y <= roomDepth; y++) {
            const pos = this.worldToCanvas(0, y);
            const endPos = this.worldToCanvas(roomWidth, y);
            
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
            
            // Draw label on left
            if (y % 1 === 0) {
                ctx.fillText(`${y}m`, pos.x - 24, pos.y + 4);
            }
        }
        
        ctx.restore();
    }
    
    /**
     * ALGORITHM 1: Draw Room
     * 
     * Draws the room outline based on shape type:
     * - Rectangular: filled rectangle for floor, stroke for walls
     * - L-shaped: polygon using beginPath/moveTo/lineTo
     * 
     * Applies coordinate scaling: room dimensions in meters → canvas pixels.
     * Accounts for padding (room doesn't start at pixel 0,0).
     * Draws dimension labels along walls.
     * 
     * @private
     */
    _drawRoom() {
        if (!this.ctx || !this.room) return;
        
        const ctx = this.ctx;
        const shape = this.room.shape || 'rectangular';
        
        if (shape === 'l-shaped') {
            this._drawLShapedRoom();
        } else {
            this._drawRectangularRoom();
        }
        
        // Draw dimension labels
        if (this.showDimensions) {
            this._drawRoomDimensions();
        }
    }
    
    /**
     * Draw a rectangular room (floor fill + wall outline).
     * 
     * @private
     */
    _drawRectangularRoom() {
        if (!this.ctx || !this.room) return;
        
        const ctx = this.ctx;
        const topLeft = this.worldToCanvas(0, 0);
        const scaledWidth = this.scaleSize(this.room.width);
        const scaledDepth = this.scaleSize(this.room.depth);
        
        // Draw floor fill
        ctx.fillStyle = this.room.floorColour || '#8B7355';
        ctx.fillRect(topLeft.x, topLeft.y, scaledWidth, scaledDepth);
        
        // Draw wall outline
        ctx.strokeStyle = this.room.wallColour || '#E8E0D4';
        ctx.lineWidth = RENDER_CONFIG.WALL_LINE_WIDTH;
        ctx.strokeRect(topLeft.x, topLeft.y, scaledWidth, scaledDepth);
    }
    
    /**
     * Draw an L-shaped room using polygon path.
     * 
     * L-shape is defined as:
     * - Main rectangle: full width × 2/3 depth
     * - Cutout: right 1/3 width removed from bottom 1/3 depth
     * 
     * @private
     */
    _drawLShapedRoom() {
        if (!this.ctx || !this.room) return;
        
        const ctx = this.ctx;
        const w = this.room.width;
        const d = this.room.depth;
        
        // L-shape vertices (counter-clockwise from top-left)
        // Main shape with bottom-right corner cut out
        const cutWidth = w * 0.4;  // 40% width cut
        const cutDepth = d * 0.4;  // 40% depth cut
        
        const points = [
            { x: 0, y: 0 },                    // Top-left
            { x: w, y: 0 },                    // Top-right
            { x: w, y: d - cutDepth },         // Right side, before cut
            { x: w - cutWidth, y: d - cutDepth }, // Inner corner top
            { x: w - cutWidth, y: d },         // Inner corner bottom
            { x: 0, y: d }                     // Bottom-left
        ];
        
        // Convert to canvas coordinates
        const canvasPoints = points.map(p => this.worldToCanvas(p.x, p.y));
        
        // Draw floor fill
        ctx.beginPath();
        ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        for (let i = 1; i < canvasPoints.length; i++) {
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        ctx.closePath();
        
        ctx.fillStyle = this.room.floorColour || '#8B7355';
        ctx.fill();
        
        // Draw wall outline
        ctx.strokeStyle = this.room.wallColour || '#E8E0D4';
        ctx.lineWidth = RENDER_CONFIG.WALL_LINE_WIDTH;
        ctx.stroke();
    }
    
    /**
     * Draw room dimension labels along the edges.
     * 
     * @private
     */
    _drawRoomDimensions() {
        if (!this.ctx || !this.room) return;
        
        const ctx = this.ctx;
        const w = this.room.width;
        const d = this.room.depth;
        
        ctx.save();
        ctx.font = `bold ${RENDER_CONFIG.DIMENSION_FONT_SIZE}px sans-serif`;
        ctx.fillStyle = RENDER_COLOURS.DIMENSION_LABEL;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Width label (bottom edge)
        const bottomCenter = this.worldToCanvas(w / 2, d);
        ctx.fillText(`${w.toFixed(1)}m`, bottomCenter.x, bottomCenter.y + 20);
        
        // Depth label (right edge, rotated)
        const rightCenter = this.worldToCanvas(w, d / 2);
        ctx.save();
        ctx.translate(rightCenter.x + 20, rightCenter.y);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(`${d.toFixed(1)}m`, 0, 0);
        ctx.restore();
        
        ctx.restore();
    }
    
    /**
     * Draw all furniture items in the array.
     * Items are drawn in order, so later items appear on top.
     * 
     * @private
     */
    _drawAllFurniture() {
        if (!this.furniture || this.furniture.length === 0) return;
        
        for (const item of this.furniture) {
            this._drawFurnitureItem(item);
        }
    }
    
    /**
     * ALGORITHM 2: Draw Furniture Item
     * 
     * Renders a single furniture item:
     * 1. Convert world position to canvas position using scale
     * 2. If rotation > 0: save context, translate to centre, rotate, draw, restore
     * 3. Draw filled rectangle with item's colour
     * 4. Draw darker border stroke
     * 5. Draw centred label (furniture type)
     * 
     * @param {Object} item - Furniture item object
     * @private
     */
    _drawFurnitureItem(item) {
        if (!this.ctx || !item) return;
        
        const ctx = this.ctx;
        
        // Get canvas position and dimensions
        const pos = this.worldToCanvas(item.x, item.y);
        const scaledWidth = this.scaleSize(item.width);
        const scaledDepth = this.scaleSize(item.depth);
        
        ctx.save();
        
        // Handle rotation if present
        if (item.rotation && item.rotation !== 0) {
            // Translate to furniture centre
            const centerX = pos.x + scaledWidth / 2;
            const centerY = pos.y + scaledDepth / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((item.rotation * Math.PI) / 180); // Convert degrees to radians
            
            // Draw furniture centred at origin
            this._drawFurnitureRect(-scaledWidth / 2, -scaledDepth / 2, scaledWidth, scaledDepth, item);
        } else {
            // No rotation - draw at position
            this._drawFurnitureRect(pos.x, pos.y, scaledWidth, scaledDepth, item);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw the furniture rectangle with fill, border, and label.
     * 
     * @param {number} x - X position in canvas pixels
     * @param {number} y - Y position in canvas pixels
     * @param {number} width - Width in canvas pixels
     * @param {number} height - Height (depth) in canvas pixels
     * @param {Object} item - Furniture item for colour and type
     * @private
     */
    _drawFurnitureRect(x, y, width, height, item) {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        
        // Draw fill
        ctx.fillStyle = item.colour || '#5C4033';
        ctx.fillRect(x, y, width, height);
        
        // Draw border (slightly darker than fill)
        ctx.strokeStyle = RENDER_COLOURS.FURNITURE_BORDER;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label if furniture is large enough
        if (width >= RENDER_CONFIG.MIN_LABEL_SIZE && height >= RENDER_CONFIG.MIN_LABEL_SIZE) {
            this._drawFurnitureLabel(x, y, width, height, item.type);
        }
    }
    
    /**
     * Draw centred label text inside furniture.
     * 
     * @param {number} x - Furniture X position
     * @param {number} y - Furniture Y position
     * @param {number} width - Furniture width
     * @param {number} height - Furniture height
     * @param {string} type - Furniture type for label
     * @private
     */
    _drawFurnitureLabel(x, y, width, height, type) {
        if (!this.ctx || !type) return;
        
        const ctx = this.ctx;
        
        // Format type for display (capitalize, replace hyphens)
        const label = type
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        ctx.save();
        ctx.font = `${RENDER_CONFIG.LABEL_FONT_SIZE}px sans-serif`;
        ctx.fillStyle = RENDER_COLOURS.FURNITURE_LABEL;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText(label, x + width / 2, y + height / 2);
        ctx.restore();
    }
    
    /**
     * ALGORITHM 3: Draw Selection Highlight
     * 
     * Draws visual feedback for selected furniture:
     * 1. Dashed border around the item (setLineDash)
     * 2. Small resize handles at corners (filled squares)
     * 3. Accent colour (blue) for visibility
     * 
     * @param {Object} item - Selected furniture item
     * @private
     */
    _drawSelection(item) {
        if (!this.ctx || !item) return;
        
        const ctx = this.ctx;
        
        // Get canvas position and dimensions
        const pos = this.worldToCanvas(item.x, item.y);
        const scaledWidth = this.scaleSize(item.width);
        const scaledDepth = this.scaleSize(item.depth);
        
        ctx.save();
        
        // Handle rotation for selection box
        let x = pos.x;
        let y = pos.y;
        
        if (item.rotation && item.rotation !== 0) {
            const centerX = pos.x + scaledWidth / 2;
            const centerY = pos.y + scaledDepth / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((item.rotation * Math.PI) / 180);
            
            x = -scaledWidth / 2;
            y = -scaledDepth / 2;
        }
        
        // Draw dashed selection border
        ctx.strokeStyle = RENDER_COLOURS.SELECTION;
        ctx.lineWidth = RENDER_CONFIG.SELECTION_BORDER_WIDTH;
        ctx.setLineDash(RENDER_CONFIG.SELECTION_DASH);
        ctx.strokeRect(x - 2, y - 2, scaledWidth + 4, scaledDepth + 4);
        
        // Reset line dash for handles
        ctx.setLineDash([]);
        
        // Draw corner resize handles
        const handleSize = RENDER_CONFIG.HANDLE_SIZE;
        const halfHandle = handleSize / 2;
        
        ctx.fillStyle = RENDER_COLOURS.SELECTION_HANDLE;
        
        // Top-left handle
        ctx.fillRect(x - halfHandle, y - halfHandle, handleSize, handleSize);
        
        // Top-right handle
        ctx.fillRect(x + scaledWidth - halfHandle, y - halfHandle, handleSize, handleSize);
        
        // Bottom-left handle
        ctx.fillRect(x - halfHandle, y + scaledDepth - halfHandle, handleSize, handleSize);
        
        // Bottom-right handle
        ctx.fillRect(x + scaledWidth - halfHandle, y + scaledDepth - halfHandle, handleSize, handleSize);
        
        ctx.restore();
    }
    
    /**
     * HIT DETECTION: Get Furniture Item at Canvas Position
     * 
     * ALGORITHM:
     * 1. Convert canvas click position to world coordinates
     * 2. Loop through furniture items in REVERSE order (top items have priority)
     * 3. For each item: check if click point is within item bounds
     *    - Basic test: clickX >= item.x && clickX <= item.x + item.width &&
     *                  clickY >= item.y && clickY <= item.y + item.depth
     * 4. Return the first hit item or null
     * 
     * @param {number} canvasX - X position on canvas in pixels
     * @param {number} canvasY - Y position on canvas in pixels
     * @returns {Object|null} The hit furniture item or null if no hit
     */
    getItemAtPosition(canvasX, canvasY) {
        if (!this.furniture || this.furniture.length === 0 || !this.room) {
            return null;
        }
        
        // Convert canvas coordinates to world coordinates
        const world = this.canvasToWorld(canvasX, canvasY);
        
        // Loop in reverse order so top-most items are checked first
        for (let i = this.furniture.length - 1; i >= 0; i--) {
            const item = this.furniture[i];
            
            // Use FurnitureItem's containsPoint if available, otherwise do basic rect test
            if (typeof item.containsPoint === 'function') {
                if (item.containsPoint(world.x, world.y)) {
                    return item;
                }
            } else {
                // Basic point-in-rectangle test (no rotation support)
                if (world.x >= item.x && 
                    world.x <= item.x + item.width &&
                    world.y >= item.y && 
                    world.y <= item.y + item.depth) {
                    return item;
                }
            }
        }
        
        return null;
    }
    
    /**
     * BOUNDARY CLAMPING: Ensure Furniture Position is Within Room
     * 
     * ALGORITHM:
     * Given a furniture item, clamp its position so it stays within room boundaries:
     * - item.x = max(0, min(item.x, room.width - item.width))
     * - item.y = max(0, min(item.y, room.depth - item.depth))
     * 
     * @param {Object} item - Furniture item with x, y, width, depth properties
     * @returns {Object} Clamped position { x, y }
     */
    clampToRoom(item) {
        if (!this.room || !item) {
            return { x: item?.x || 0, y: item?.y || 0 };
        }
        
        const clampedX = Math.max(0, Math.min(item.x, this.room.width - item.width));
        const clampedY = Math.max(0, Math.min(item.y, this.room.depth - item.depth));
        
        return { x: clampedX, y: clampedY };
    }
    
    /**
     * Check if a world position is within room bounds.
     * 
     * @param {number} worldX - X position in meters
     * @param {number} worldY - Y position in meters
     * @returns {boolean} True if within room bounds
     */
    isWithinRoom(worldX, worldY) {
        if (!this.room) return false;
        
        return worldX >= 0 && 
               worldX <= this.room.width && 
               worldY >= 0 && 
               worldY <= this.room.depth;
    }
    
    /**
     * Update canvas dimensions and recalculate scale.
     * 
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        
        this._calculateScale();
    }
    
    /**
     * Toggle grid display.
     * 
     * @param {boolean} show - Whether to show the grid
     */
    setShowGrid(show) {
        this.showGrid = Boolean(show);
    }
    
    /**
     * Toggle dimension labels display.
     * 
     * @param {boolean} show - Whether to show dimension labels
     */
    setShowDimensions(show) {
        this.showDimensions = Boolean(show);
    }
    
    /**
     * Export canvas as PNG data URL.
     * 
     * @returns {string} PNG data URL of current canvas state
     */
    exportAsPNG() {
        if (!this.canvas) return '';
        return this.canvas.toDataURL('image/png');
    }
}

export { Renderer2D, RENDER_COLOURS, RENDER_CONFIG };
export default Renderer2D;
