/**
 * FurnishView — 2D Renderer
 * 
 * HTML5 Canvas 2D rendering engine for top-down room visualization.
 * Implements hand-coded computer graphics algorithms for:
 * - Coordinate scaling (real-world meters → canvas pixels)
 * - Hit detection (point-in-rectangle test for furniture selection)
 * - Boundary clamping (prevent furniture placement outside room)
 * - Type-specific furniture silhouettes (top-down shapes per type)
 * - Adaptive label scaling (font size proportional to furniture pixel size)
 * - Render loop (clear → grid → room → furniture → selection)
 * 
 * Canvas API methods used: fillRect, strokeRect, beginPath, moveTo, lineTo,
 * fill, stroke, clearRect, save, restore, translate, rotate, fillText, setLineDash, arc,
 * quadraticCurveTo, ellipse
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
    ROTATION_HANDLE: '#2563EB',
    ROTATION_BADGE_BG: 'rgba(37, 99, 235, 0.85)',
    ROTATION_BADGE_TEXT: '#FFFFFF',
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
    ROTATION_HANDLE_RADIUS: 8,
    ROTATION_ARM_LENGTH: 24,
    ROTATION_ARM_WIDTH: 1.5,
    ROTATION_BADGE_FONT_SIZE: 10,
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
     * Set ghost preview for placing mode
     * Shows a semi-transparent preview of furniture at mouse position
     * 
     * @param {Object|null} preview - Preview configuration or null to clear
     * @param {string} preview.type - Furniture type
     * @param {number} preview.x - World X position (meters)
     * @param {number} preview.y - World Y position (meters)
     * @param {number} preview.width - Furniture width (meters)
     * @param {number} preview.depth - Furniture depth (meters)
     * @param {string} preview.colour - Furniture colour
     */
    setGhostPreview(preview) {
        this.ghostPreview = preview;
    }
    
    /**
     * Clear ghost preview
     */
    clearGhostPreview() {
        this.ghostPreview = null;
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
        
        // Step 3.5: Draw dimension labels (outside room edges)
        if (this.showDimensions) {
            this._drawDimensionLabels();
        }
        
        // Step 4: Draw all furniture items
        this._drawAllFurniture();
        
        // Step 5: Draw selection highlight
        if (this.selectedId) {
            const selectedItem = this.furniture.find(f => f.id === this.selectedId);
            if (selectedItem) {
                this._drawSelection(selectedItem);
            }
        }
        
        // Step 6: Draw ghost preview (for placing mode)
        if (this.ghostPreview) {
            this._drawGhostPreview();
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
     * Draw architectural dimension labels along room edges.
     *
     * Renders width and depth dimension lines with arrow endpoints
     * and extension lines outside the room outline, similar to
     * architectural blueprint annotations.
     *
     * @private
     */
    _drawDimensionLabels() {
        if (!this.ctx || !this.room) return;

        const ctx = this.ctx;
        const roomW = this.room.width;
        const roomD = this.room.depth;

        // Canvas coordinates for room corners
        const topLeft = this.worldToCanvas(0, 0);
        const topRight = this.worldToCanvas(roomW, 0);
        const bottomLeft = this.worldToCanvas(0, roomD);
        const bottomRight = this.worldToCanvas(roomW, roomD);

        // Offset distances (pixels)
        const LABEL_OFFSET = 28;    // Distance from room edge
        const TICK_LENGTH = 6;      // Extension line length
        const ARROW_SIZE = 5;       // Arrowhead size

        ctx.save();
        ctx.strokeStyle = RENDER_COLOURS.DIMENSION_LABEL;
        ctx.fillStyle = RENDER_COLOURS.DIMENSION_LABEL;
        ctx.lineWidth = 1;
        ctx.font = `${RENDER_CONFIG.DIMENSION_FONT_SIZE}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // --- Width label (bottom edge) ---
        const widthY = bottomLeft.y + LABEL_OFFSET;

        // Extension lines (vertical ticks at each end)
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y + 4);
        ctx.lineTo(bottomLeft.x, widthY + TICK_LENGTH);
        ctx.moveTo(bottomRight.x, bottomRight.y + 4);
        ctx.lineTo(bottomRight.x, widthY + TICK_LENGTH);
        ctx.stroke();

        // Dimension line with arrows
        const widthText = `${roomW.toFixed(1)}m`;
        const textWidth = ctx.measureText(widthText).width + 12;
        const midX = (bottomLeft.x + bottomRight.x) / 2;

        // Left segment with arrow
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, widthY);
        ctx.lineTo(midX - textWidth / 2, widthY);
        ctx.stroke();
        this._drawArrowhead(ctx, bottomLeft.x, widthY, 'right', ARROW_SIZE);

        // Right segment with arrow
        ctx.beginPath();
        ctx.moveTo(midX + textWidth / 2, widthY);
        ctx.lineTo(bottomRight.x, widthY);
        ctx.stroke();
        this._drawArrowhead(ctx, bottomRight.x, widthY, 'left', ARROW_SIZE);

        // Width text
        ctx.fillText(widthText, midX, widthY);

        // --- Depth label (right edge) ---
        const depthX = topRight.x + LABEL_OFFSET;

        // Extension lines (horizontal ticks at each end)
        ctx.beginPath();
        ctx.moveTo(topRight.x + 4, topRight.y);
        ctx.lineTo(depthX + TICK_LENGTH, topRight.y);
        ctx.moveTo(bottomRight.x + 4, bottomRight.y);
        ctx.lineTo(depthX + TICK_LENGTH, bottomRight.y);
        ctx.stroke();

        // Depth dimension line
        const depthText = `${roomD.toFixed(1)}m`;
        const depthTextWidth = ctx.measureText(depthText).width + 12;
        const midY = (topRight.y + bottomRight.y) / 2;

        // Top segment with arrow
        ctx.beginPath();
        ctx.moveTo(depthX, topRight.y);
        ctx.lineTo(depthX, midY - depthTextWidth / 2);
        ctx.stroke();
        this._drawArrowhead(ctx, depthX, topRight.y, 'down', ARROW_SIZE);

        // Bottom segment with arrow
        ctx.beginPath();
        ctx.moveTo(depthX, midY + depthTextWidth / 2);
        ctx.lineTo(depthX, bottomRight.y);
        ctx.stroke();
        this._drawArrowhead(ctx, depthX, bottomRight.y, 'up', ARROW_SIZE);

        // Depth text (rotated 90°)
        ctx.save();
        ctx.translate(depthX, midY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(depthText, 0, 0);
        ctx.restore();

        ctx.restore();
    }

    /**
     * Draw a small arrowhead at the given position.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Arrowhead tip X
     * @param {number} y - Arrowhead tip Y
     * @param {string} direction - 'left', 'right', 'up', or 'down'
     * @param {number} size - Arrowhead size in pixels
     * @private
     */
    _drawArrowhead(ctx, x, y, direction, size) {
        ctx.beginPath();
        switch (direction) {
            case 'right':
                ctx.moveTo(x, y);
                ctx.lineTo(x + size, y - size / 2);
                ctx.lineTo(x + size, y + size / 2);
                break;
            case 'left':
                ctx.moveTo(x, y);
                ctx.lineTo(x - size, y - size / 2);
                ctx.lineTo(x - size, y + size / 2);
                break;
            case 'down':
                ctx.moveTo(x, y);
                ctx.lineTo(x - size / 2, y - size);
                ctx.lineTo(x + size / 2, y - size);
                break;
            case 'up':
                ctx.moveTo(x, y);
                ctx.lineTo(x - size / 2, y + size);
                ctx.lineTo(x + size / 2, y + size);
                break;
        }
        ctx.closePath();
        ctx.fill();
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
     * Renders a single furniture item with a type-specific top-down silhouette:
     * 1. Convert world position to canvas position using scale
     * 2. Save context, translate to item centre, rotate if needed
     * 3. Dispatch to type-specific shape drawing method
     * 4. Draw adaptive label (size scales with furniture pixel dimensions)
     * 5. Restore context
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
        
        // Always translate to item centre for consistent rotation and drawing
        const centerX = pos.x + scaledWidth / 2;
        const centerY = pos.y + scaledDepth / 2;
        ctx.translate(centerX, centerY);
        
        // Apply rotation if present
        if (item.rotation && item.rotation !== 0) {
            ctx.rotate((item.rotation * Math.PI) / 180);
        }
        
        // Draw type-specific shape centred at origin
        this._drawFurnitureShape(-scaledWidth / 2, -scaledDepth / 2, scaledWidth, scaledDepth, item);
        
        ctx.restore();
    }
    
    /**
     * Draw a type-specific top-down silhouette for a furniture item.
     * 
     * Dispatches to per-type drawing methods based on `item.type`.
     * Falls back to a plain filled rectangle for unknown types.
     * After drawing the shape, renders an adaptive label.
     * 
     * @param {number} x - X position (top-left, relative to translated origin)
     * @param {number} y - Y position (top-left, relative to translated origin)
     * @param {number} w - Width in canvas pixels
     * @param {number} h - Height (depth) in canvas pixels
     * @param {Object} item - Furniture item for colour and type
     * @private
     */
    _drawFurnitureShape(x, y, w, h, item) {
        if (!this.ctx) return;
        
        const fillColour = item.colour || '#5C4033';
        const strokeColour = this._darkenHex(fillColour, 0.3);
        
        switch (item.type) {
            case 'chair':
                this._drawChairShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'dining-table':
                this._drawDiningTableShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'side-table':
                this._drawSideTableShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'sofa':
                this._drawSofaShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'armchair':
                this._drawArmchairShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'coffee-table':
                this._drawCoffeeTableShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'bookshelf':
                this._drawBookshelfShape(x, y, w, h, fillColour, strokeColour);
                break;
            case 'desk':
                this._drawDeskShape(x, y, w, h, fillColour, strokeColour);
                break;
            default:
                this._drawDefaultShape(x, y, w, h, fillColour, strokeColour);
                break;
        }
        
        // Draw adaptive label
        this._drawFurnitureLabel(x, y, w, h, item);
    }
    
    // ── Type-specific silhouette methods ────────────────────────────
    
    /**
     * Draw chair silhouette: rounded seat + backrest band + 4 corner leg circles.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawChairShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.12;
        const legR = Math.max(1.5, Math.min(w, h) * 0.08);
        const inset = legR * 1.2;
        
        // Seat — rounded rectangle
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Backrest — narrow band along top edge
        const backH = Math.max(2, h * 0.15);
        ctx.fillStyle = stroke;
        this._drawRoundedRect(x, y, w, backH, r * 0.5);
        ctx.fill();
        
        // 4 corner legs
        ctx.fillStyle = stroke;
        const legPositions = [
            [x + inset, y + inset],
            [x + w - inset, y + inset],
            [x + inset, y + h - inset],
            [x + w - inset, y + h - inset]
        ];
        for (const [lx, ly] of legPositions) {
            ctx.beginPath();
            ctx.arc(lx, ly, legR, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Draw dining table silhouette: rounded rectangle surface + 4 inset leg circles.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawDiningTableShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.08;
        const legR = Math.max(1.5, Math.min(w, h) * 0.06);
        const inset = Math.min(w, h) * 0.15;
        
        // Table surface
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // 4 inset legs
        ctx.fillStyle = stroke;
        const legPositions = [
            [x + inset, y + inset],
            [x + w - inset, y + inset],
            [x + inset, y + h - inset],
            [x + w - inset, y + h - inset]
        ];
        for (const [lx, ly] of legPositions) {
            ctx.beginPath();
            ctx.arc(lx, ly, legR, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Draw side table silhouette: circular top + small centre pedestal circle.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawSideTableShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = Math.min(w, h) / 2;
        
        // Circular top
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Centre pedestal
        const pedestalR = radius * 0.25;
        ctx.fillStyle = stroke;
        ctx.beginPath();
        ctx.arc(cx, cy, pedestalR, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw sofa silhouette: U-shape with seat, back cushion, and armrests.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawSofaShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.1;
        const armW = Math.max(2, w * 0.12);
        const backH = Math.max(2, h * 0.2);
        
        // Main seat area — full bounds
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Back cushion — thick band along top edge
        ctx.fillStyle = stroke;
        this._drawRoundedRect(x, y, w, backH, r * 0.6);
        ctx.fill();
        
        // Left armrest
        ctx.fillStyle = this._darkenHex(fill, 0.15);
        this._drawRoundedRect(x, y + backH, armW, h - backH, r * 0.4);
        ctx.fill();
        
        // Right armrest
        this._drawRoundedRect(x + w - armW, y + backH, armW, h - backH, r * 0.4);
        ctx.fill();
    }
    
    /**
     * Draw armchair silhouette: squarer proportions, seat + back + armrests.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawArmchairShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.14;
        const armW = Math.max(2, w * 0.18);
        const backH = Math.max(2, h * 0.22);
        
        // Main seat — rounded rectangle
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Back cushion
        ctx.fillStyle = stroke;
        this._drawRoundedRect(x, y, w, backH, r * 0.6);
        ctx.fill();
        
        // Left armrest
        ctx.fillStyle = this._darkenHex(fill, 0.15);
        this._drawRoundedRect(x, y + backH, armW, h - backH, r * 0.4);
        ctx.fill();
        
        // Right armrest
        this._drawRoundedRect(x + w - armW, y + backH, armW, h - backH, r * 0.4);
        ctx.fill();
    }
    
    /**
     * Draw coffee table silhouette: rounded rectangle + inner offset shelf rectangle.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawCoffeeTableShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.12;
        
        // Outer surface
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Inner shelf rectangle (offset inward)
        const inset = Math.min(w, h) * 0.18;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        this._drawRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, r * 0.5);
        ctx.stroke();
    }
    
    /**
     * Draw bookshelf silhouette: rectangle with horizontal shelf division lines.
     * Front edge gets a slightly different fill for visual depth.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawBookshelfShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        
        // Main body
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.strokeRect(x, y, w, h);
        
        // Front edge — slightly darker band along bottom
        const edgeH = Math.max(2, h * 0.12);
        ctx.fillStyle = this._darkenHex(fill, 0.15);
        ctx.fillRect(x, y + h - edgeH, w, edgeH);
        
        // Shelf division lines (3-4 horizontal lines)
        const divisions = 4;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        for (let i = 1; i < divisions; i++) {
            const lineY = y + (h * i) / divisions;
            ctx.beginPath();
            ctx.moveTo(x + 1, lineY);
            ctx.lineTo(x + w - 1, lineY);
            ctx.stroke();
        }
    }
    
    /**
     * Draw desk silhouette: rectangle with a dividing line for the drawer unit.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawDeskShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        const r = Math.min(w, h) * 0.06;
        
        // Main surface
        ctx.fillStyle = fill;
        this._drawRoundedRect(x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.stroke();
        
        // Drawer unit — right third, slightly darker
        const drawerW = w * 0.35;
        ctx.fillStyle = this._darkenHex(fill, 0.12);
        this._drawRoundedRect(x + w - drawerW, y, drawerW, h, r);
        ctx.fill();
        
        // Dividing line between desk and drawer
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w - drawerW, y + 1);
        ctx.lineTo(x + w - drawerW, y + h - 1);
        ctx.stroke();
    }
    
    /**
     * Draw default furniture silhouette: plain filled rectangle.
     * Used as fallback for unknown furniture types.
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} fill - Fill colour
     * @param {string} stroke - Stroke colour
     * @private
     */
    _drawDefaultShape(x, y, w, h, fill, stroke) {
        const ctx = this.ctx;
        
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = RENDER_CONFIG.FURNITURE_BORDER_WIDTH;
        ctx.strokeRect(x, y, w, h);
    }
    
    // ── Shape / label helper methods ────────────────────────────────
    
    /**
     * Draw a rounded rectangle path (does NOT fill or stroke — caller must do that).
     * 
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} r - Corner radius
     * @private
     */
    _drawRoundedRect(x, y, w, h, r) {
        const ctx = this.ctx;
        const clampedR = Math.min(r, w / 2, h / 2);
        
        ctx.beginPath();
        ctx.moveTo(x + clampedR, y);
        ctx.lineTo(x + w - clampedR, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + clampedR);
        ctx.lineTo(x + w, y + h - clampedR);
        ctx.quadraticCurveTo(x + w, y + h, x + w - clampedR, y + h);
        ctx.lineTo(x + clampedR, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - clampedR);
        ctx.lineTo(x, y + clampedR);
        ctx.quadraticCurveTo(x, y, x + clampedR, y);
        ctx.closePath();
    }
    
    /**
     * Darken a hex colour by a given factor.
     * 
     * @param {string} hex - Hex colour string (e.g. '#5C4033')
     * @param {number} factor - Darkening factor (0–1, where 0.3 = 30% darker)
     * @returns {string} Darkened hex colour
     * @private
     */
    _darkenHex(hex, factor) {
        const sanitised = hex.replace('#', '');
        const r = parseInt(sanitised.substring(0, 2), 16);
        const g = parseInt(sanitised.substring(2, 4), 16);
        const b = parseInt(sanitised.substring(4, 6), 16);
        
        const dr = Math.round(r * (1 - factor));
        const dg = Math.round(g * (1 - factor));
        const db = Math.round(b * (1 - factor));
        
        return '#' + [dr, dg, db]
            .map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Return a contrast-aware text colour for a given background hex colour.
     * Uses the W3C relative luminance formula to decide between white (#FFFFFF)
     * for dark backgrounds and dark grey (#333333) for light backgrounds.
     *
     * @param {string} hex - Background hex colour string (e.g. '#DEB887')
     * @returns {string} '#FFFFFF' or '#333333'
     * @private
     */
    _getContrastColour(hex) {
        const sanitised = (hex || '#5C4033').replace('#', '');
        const r = parseInt(sanitised.substring(0, 2), 16) / 255;
        const g = parseInt(sanitised.substring(2, 4), 16) / 255;
        const b = parseInt(sanitised.substring(4, 6), 16) / 255;

        // sRGB to linear conversion for each channel
        const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

        // WCAG threshold: luminance > 0.179 is "light" → use dark text
        return luminance > 0.179 ? '#333333' : '#FFFFFF';
    }
    
    /**
     * Get an abbreviated 2-letter label for a furniture type.
     * Used when furniture is too small for a full label but large enough
     * for an abbreviation.
     * 
     * @param {string} type - Furniture type key (e.g. 'dining-table')
     * @returns {string} Abbreviated label (e.g. 'DT')
     * @private
     */
    _getAbbreviatedLabel(type) {
        const abbreviations = {
            'chair': 'CH',
            'dining-table': 'DT',
            'side-table': 'ST',
            'sofa': 'SF',
            'armchair': 'AC',
            'coffee-table': 'CT',
            'bookshelf': 'BS',
            'desk': 'DK'
        };
        return abbreviations[type] || type.charAt(0).toUpperCase();
    }
    
    /**
     * Draw adaptive centred label text inside furniture.
     * 
     * Font size scales proportionally with the furniture's pixel dimensions:
     * - Proportional: fontSize = minDimension × 0.25, clamped to [8, 14]
     * - If minDimension < 20px: label is skipped entirely (too small to read)
     * - If minDimension < 40px: abbreviated label is used (e.g. 'CH', 'DT')
     * - Otherwise: full capitalised label is drawn
     * 
     * @param {number} x - Furniture X position (top-left, relative to origin)
     * @param {number} y - Furniture Y position (top-left, relative to origin)
     * @param {number} width - Furniture width in canvas pixels
     * @param {number} height - Furniture height in canvas pixels
     * @param {Object} item - Furniture item object with type and colour
     * @private
     */
    _drawFurnitureLabel(x, y, width, height, item) {
        if (!this.ctx || !item || !item.type) return;
        
        const ctx = this.ctx;
        const minDimension = Math.min(width, height);
        
        // Skip label entirely if furniture is too small to read
        if (minDimension < 20) return;
        
        // Calculate adaptive font size: proportional to item size with bounds
        const fontSize = Math.max(8, Math.min(14, minDimension * 0.25));
        
        // Choose label text: abbreviated for small items, full for larger
        let label;
        if (minDimension < 40) {
            label = this._getAbbreviatedLabel(item.type);
        } else {
            // Full capitalised label
            label = item.type
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Choose contrast-aware text colour based on furniture background
        const textColour = this._getContrastColour(item.colour);
        const isLightText = textColour === '#FFFFFF';

        ctx.save();
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = textColour;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow for readability — dark shadow for light text, light shadow for dark text
        ctx.shadowColor = isLightText ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.6)';
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
        
        // --- Rotation handle (Task 4B.2) ---
        const armLength = RENDER_CONFIG.ROTATION_ARM_LENGTH;
        const handleRadius = RENDER_CONFIG.ROTATION_HANDLE_RADIUS;
        const topCenterX = x + scaledWidth / 2;
        const topCenterY = y;
        const handleCX = topCenterX;
        const handleCY = topCenterY - armLength;
        
        // Rotation arm line (thin solid)
        ctx.strokeStyle = RENDER_COLOURS.ROTATION_HANDLE;
        ctx.lineWidth = RENDER_CONFIG.ROTATION_ARM_WIDTH;
        ctx.beginPath();
        ctx.moveTo(topCenterX, topCenterY - 2);
        ctx.lineTo(handleCX, handleCY);
        ctx.stroke();
        
        // Rotation handle circle
        ctx.beginPath();
        ctx.arc(handleCX, handleCY, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = RENDER_COLOURS.ROTATION_HANDLE;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Rotation icon inside circle (arc arrow)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(handleCX, handleCY, 4, -Math.PI * 0.7, Math.PI * 0.5);
        ctx.stroke();
        // Arrowhead
        const arrowTipX = handleCX + 4 * Math.cos(Math.PI * 0.5);
        const arrowTipY = handleCY + 4 * Math.sin(Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(arrowTipX - 3, arrowTipY - 2);
        ctx.lineTo(arrowTipX, arrowTipY);
        ctx.lineTo(arrowTipX + 2, arrowTipY - 3);
        ctx.stroke();
        
        // --- Angle badge (only when rotation is non-zero) ---
        if (item.rotation && item.rotation !== 0) {
            const badgeText = `${Math.round(item.rotation)}\u00b0`;
            const badgeFontSize = RENDER_CONFIG.ROTATION_BADGE_FONT_SIZE;
            ctx.font = `600 ${badgeFontSize}px system-ui, sans-serif`;
            const textWidth = ctx.measureText(badgeText).width;
            const badgePadX = 4;
            const badgePadY = 2;
            const badgeW = textWidth + badgePadX * 2;
            const badgeH = badgeFontSize + badgePadY * 2;
            const badgeX = handleCX - badgeW / 2;
            const badgeY = handleCY - handleRadius - badgeH - 4;
            
            // Badge background
            ctx.fillStyle = RENDER_COLOURS.ROTATION_BADGE_BG;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
            ctx.fill();
            
            // Badge text
            ctx.fillStyle = RENDER_COLOURS.ROTATION_BADGE_TEXT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, handleCX, badgeY + badgeH / 2);
        }
        
        // --- Furniture dimension label ("1.6m × 0.9m") below selection ---
        this._drawFurnitureDimensions(item, x, y, scaledWidth, scaledDepth);
        
        ctx.restore();
    }
    
    /**
     * Draw real-world dimension label below a selected furniture item.
     *
     * Shows the item's width and depth in meters (e.g. "1.6m × 0.9m")
     * positioned just below the selection border, centred horizontally.
     * Reinforces the scaling requirement (FR4) and supports the
     * consultation scenario.
     *
     * @param {Object} item - Furniture item with width and depth in meters
     * @param {number} x - Selection box X (top-left, may be relative to rotation centre)
     * @param {number} y - Selection box Y
     * @param {number} w - Selection box width in pixels
     * @param {number} h - Selection box height (depth) in pixels
     * @private
     */
    _drawFurnitureDimensions(item, x, y, w, h) {
        if (!this.ctx || !item) return;

        const ctx = this.ctx;
        const widthM = (item.width || 0).toFixed(1);
        const depthM = (item.depth || 0).toFixed(1);
        const dimText = `${widthM}m \u00d7 ${depthM}m`;

        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = RENDER_COLOURS.DIMENSION_LABEL;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Position below the selection border (4px border offset + 6px gap)
        ctx.fillText(dimText, x + w / 2, y + h + 10);
    }
    
    /**
     * Get canvas-space position of the rotation handle for a furniture item.
     * Used by CanvasController for hit detection on the rotation affordance.
     * 
     * @param {Object} item - Furniture item with x, y, width, depth, rotation
     * @returns {{ x: number, y: number }} Canvas coordinates of handle centre
     */
    getRotationHandlePosition(item) {
        if (!item) return { x: 0, y: 0 };
        
        const pos = this.worldToCanvas(item.x, item.y);
        const scaledWidth = this.scaleSize(item.width);
        const scaledDepth = this.scaleSize(item.depth);
        const armLength = RENDER_CONFIG.ROTATION_ARM_LENGTH;
        
        // Handle is at top-centre minus arm length, in local space
        const localX = scaledWidth / 2;
        const localY = -armLength;
        
        if (item.rotation && item.rotation !== 0) {
            // Rotate the local handle position around the item centre
            const centerX = pos.x + scaledWidth / 2;
            const centerY = pos.y + scaledDepth / 2;
            const rad = (item.rotation * Math.PI) / 180;
            
            // Local offset from centre
            const dx = localX - scaledWidth / 2;
            const dy = localY - scaledDepth / 2;
            
            return {
                x: centerX + dx * Math.cos(rad) - dy * Math.sin(rad),
                y: centerY + dx * Math.sin(rad) + dy * Math.cos(rad)
            };
        }
        
        return {
            x: pos.x + localX,
            y: pos.y + localY
        };
    }
    
    /**
     * Draw ghost preview for furniture placement.
     * Shows a semi-transparent preview of the type-specific silhouette
     * at the current mouse position.
     * 
     * @private
     */
    _drawGhostPreview() {
        if (!this.ctx || !this.ghostPreview || !this.room) return;
        
        const ctx = this.ctx;
        const preview = this.ghostPreview;
        
        // Get canvas position from world position
        const pos = this.worldToCanvas(preview.x, preview.y);
        
        // Scale furniture dimensions
        const scaledWidth = this.scaleSize(preview.width);
        const scaledDepth = this.scaleSize(preview.depth);
        
        ctx.save();
        
        // Set transparency for ghost effect
        ctx.globalAlpha = 0.5;
        
        // Translate to centre for consistent shape rendering
        ctx.translate(pos.x + scaledWidth / 2, pos.y + scaledDepth / 2);
        
        // Draw type-specific silhouette as ghost
        this._drawFurnitureShape(
            -scaledWidth / 2, -scaledDepth / 2,
            scaledWidth, scaledDepth,
            preview
        );
        
        // Dashed selection border overlay
        ctx.strokeStyle = RENDER_COLOURS.SELECTION;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-scaledWidth / 2, -scaledDepth / 2, scaledWidth, scaledDepth);
        
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
