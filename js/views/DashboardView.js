/**
 * FurnishView — Dashboard View
 * 
 * Renders the design portfolio/dashboard showing saved designs with
 * canvas-generated thumbnail previews for each design card.
 * 
 * Implements Nielsen Heuristics:
 * - #1 Visibility of system status (design count, thumbnails, empty state)
 * - #5 Error prevention (delete confirmation via Modal)
 * - #7 Flexibility (multiple ways to access designs)
 * - #8 Aesthetic and minimalist design (clean card layout)
 * 
 * @file js/views/DashboardView.js
 * @module views/DashboardView
 */

import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { loadSampleData, getAllDesigns } from '../utils/storage.js';

/** Thumbnail canvas dimensions in pixels */
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;

/** Thumbnail padding ratio (fraction of canvas reserved for margin) */
const THUMB_PADDING = 0.12;

/** Default colours for thumbnail rendering fallbacks */
const THUMB_DEFAULTS = {
    FLOOR: '#F5F0EB',
    WALL: '#E8E0D4',
    FURNITURE: '#94A3B8',
    GRID: '#EEEEEE'
};

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 * @private
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date for display with relative time for recent dates
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date string
 * @private
 */
function formatDate(isoDate) {
    if (!isoDate) return 'Unknown date';
    
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return 'Unknown date';
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return 'Unknown date';
    }
}

/**
 * Format room dimensions for display
 * @param {Object} room - Room object
 * @returns {string} Formatted dimensions string
 * @private
 */
function formatRoomDimensions(room) {
    if (!room) return 'No room data';
    
    const width = room.width || 0;
    const depth = room.depth || 0;
    const shape = room.shape || 'rectangular';
    
    const shapeName = shape.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    return `${width}m × ${depth}m ${shapeName}`;
}

/**
 * DashboardView class
 * Manages the design portfolio grid with canvas-generated thumbnails
 */
class DashboardView {
    /**
     * Create a DashboardView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onNewDesign - Callback for new design action
     * @param {Function} options.onOpenDesign - Callback for opening a design
     * @param {Function} options.onDeleteDesign - Callback for deleting a design
     * @param {Function} options.onLogout - Callback for logout action
     * @param {Function} options.onCompareDesigns - Callback for compare action
     */
    constructor({
        onNewDesign = () => {},
        onOpenDesign = () => {},
        onDeleteDesign = () => {},
        onLogout = () => {},
        onCompareDesigns = () => {}
    } = {}) {
        this.onNewDesign = onNewDesign;
        this.onOpenDesign = onOpenDesign;
        this.onDeleteDesign = onDeleteDesign;
        this.onLogout = onLogout;
        this.onCompareDesigns = onCompareDesigns;
        this.container = null;
        this.designs = [];
        this.username = '';
    }
    
    /**
     * Render the dashboard view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} designs - Array of saved designs to display
     * @param {string} username - Current user's name
     */
    render(container, designs = [], username = '') {
        if (!container) return;
        
        this.container = container;
        this.designs = Array.isArray(designs) ? designs : [];
        this.username = escapeHtml(username || 'User');
        
        const hasDesigns = this.designs.length > 0;
        const canCompare = this.designs.length >= 2;
        const designCountText = this.designs.length === 1
            ? '1 design'
            : `${this.designs.length} designs`;
        
        container.innerHTML = `
            <div class="dashboard">
                <!-- Header Bar -->
                <header class="dashboard-header">
                    <div class="dashboard-brand">
                        <h1 class="dashboard-logo">
                            <span class="dashboard-logo-icon" aria-hidden="true">🏠</span>
                            FurnishView
                        </h1>
                    </div>
                    <div class="dashboard-user">
                        <span class="dashboard-username">Logged in as <strong>${this.username}</strong></span>
                        <button type="button" id="logout-btn" class="dashboard-signout" aria-label="Sign out">Sign out</button>
                    </div>
                </header>
                
                <!-- Main Content -->
                <main class="dashboard-main">
                    <!-- Action Bar -->
                    <div class="dashboard-actions">
                        <h2 class="dashboard-title">My Designs</h2>
                        <div class="dashboard-action-row">
                            ${hasDesigns ? `<span class="dashboard-design-count">${designCountText}</span>` : ''}
                            ${!hasDesigns ? `<button type="button" id="load-samples-btn" class="btn btn-secondary">Load Sample Designs</button>` : ''}
                            <button type="button" id="compare-btn" class="btn btn-secondary" ${canCompare ? '' : 'disabled'}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M2 4h5M2 8h5M2 12h5M9 4h5M9 8h5M9 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                Compare
                            </button>
                            <button type="button" id="new-design-btn" class="btn btn-primary">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                New Design
                            </button>
                        </div>
                    </div>
                    
                    <!-- Designs Grid or Empty State -->
                    ${hasDesigns ? this._renderDesignsGrid() : this._renderEmptyState()}
                </main>
            </div>
        `;
        
        this._attachEventListeners();
        
        // Generate thumbnails after DOM is ready
        if (hasDesigns) {
            requestAnimationFrame(() => this._generateThumbnails());
        }
    }
    
    /**
     * Render the designs grid
     * @returns {string} HTML string for designs grid
     * @private
     */
    _renderDesignsGrid() {
        const designCards = this.designs.map(d => this._renderDesignCard(d)).join('');
        
        return `
            <div class="designs-grid" role="list" aria-label="Saved designs">
                ${designCards}
            </div>
        `;
    }
    
    /**
     * Render a single design card with placeholder for thumbnail
     * @param {Object} design - Design object
     * @returns {string} HTML string for design card
     * @private
     */
    _renderDesignCard(design) {
        const id = escapeHtml(design.id || '');
        const name = escapeHtml(design.name || 'Untitled Design');
        const roomDimensions = formatRoomDimensions(design.room);
        const createdDate = formatDate(design.createdAt);
        const furnitureCount = Array.isArray(design.furniture) ? design.furniture.length : 0;
        const itemsLabel = furnitureCount === 1 ? '1 item' : `${furnitureCount} items`;
        
        return `
            <article class="design-card" role="listitem" data-design-id="${id}">
                <div class="design-card-preview" data-thumb-id="${id}">
                    <div class="design-card-placeholder">
                        <span class="design-card-placeholder-icon" aria-hidden="true">📐</span>
                        <span>${escapeHtml(roomDimensions)}</span>
                    </div>
                </div>
                <div class="design-card-content">
                    <h3 class="design-card-name" title="${name}">${name}</h3>
                    <p class="design-card-dimensions">${roomDimensions}</p>
                    <div class="design-card-meta">
                        <span class="design-card-date">${createdDate}</span>
                        <span class="design-card-meta-divider" aria-hidden="true"></span>
                        <span class="design-card-items">${itemsLabel}</span>
                    </div>
                </div>
                <div class="design-card-actions">
                    <button type="button" class="btn btn-sm btn-primary design-open-btn" data-design-id="${id}">
                        Open
                    </button>
                    <button type="button" class="btn btn-sm btn-icon btn-danger-outline design-delete-btn" data-design-id="${id}" data-design-name="${name}" aria-label="Delete ${name}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4M7 7v4M9 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </article>
        `;
    }
    
    /**
     * Render empty state with welcoming message
     * @returns {string} HTML string for empty state
     * @private
     */
    _renderEmptyState() {
        return `
            <div class="dashboard-empty">
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                            <path d="M24 6L42 18V38a2 2 0 01-2 2H8a2 2 0 01-2-2V18L24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
                            <rect x="18" y="24" width="12" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
                            <path d="M14 18h6M28 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">Start your first design</h3>
                    <p class="empty-description">Create room layouts and see them come to life in 3D</p>
                    <button type="button" id="empty-new-design-btn" class="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        Create New Design
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate thumbnail previews for all design cards using offscreen canvas.
     * Draws a simplified room outline with furniture rectangles.
     * @private
     */
    _generateThumbnails() {
        if (!this.container) return;
        
        for (const design of this.designs) {
            if (!design.id) continue;
            
            const previewEl = this.container.querySelector(`[data-thumb-id="${design.id}"]`);
            if (!previewEl) continue;
            
            try {
                const dataUrl = this._generateThumbnail(design);
                if (dataUrl) {
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.alt = escapeHtml(design.name || 'Design preview');
                    img.className = 'design-card-thumbnail';
                    img.loading = 'lazy';
                    
                    // Replace placeholder with thumbnail
                    previewEl.innerHTML = '';
                    previewEl.appendChild(img);
                }
            } catch {
                // Keep the fallback placeholder on error — already rendered
            }
        }
    }
    
    /**
     * Generate a single thumbnail for a design using an offscreen canvas.
     *
     * ALGORITHM:
     *  1. Create offscreen canvas (THUMB_WIDTH × THUMB_HEIGHT)
     *  2. Compute scale to fit room inside canvas with padding
     *  3. Fill background with floor colour
     *  4. Stroke room outline with wall colour
     *  5. Draw each furniture item as a filled rectangle
     *  6. Return canvas.toDataURL()
     *
     * @param {Object} design - Design object with room and furniture data
     * @returns {string|null} Data URL of the thumbnail, or null on failure
     * @private
     */
    _generateThumbnail(design) {
        const room = design.room;
        if (!room || !room.width || !room.depth) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_WIDTH;
        canvas.height = THUMB_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const roomW = room.width;
        const roomD = room.depth;
        const isLShaped = room.shape === 'l-shaped';
        
        // Calculate scale to fit room inside thumbnail with padding
        const padX = THUMB_WIDTH * THUMB_PADDING;
        const padY = THUMB_HEIGHT * THUMB_PADDING;
        const availW = THUMB_WIDTH - 2 * padX;
        const availH = THUMB_HEIGHT - 2 * padY;
        const scale = Math.min(availW / roomW, availH / roomD);
        
        // Centre the room
        const drawW = roomW * scale;
        const drawH = roomD * scale;
        const offsetX = (THUMB_WIDTH - drawW) / 2;
        const offsetY = (THUMB_HEIGHT - drawH) / 2;
        
        // --- 1. Background ---
        ctx.fillStyle = THUMB_DEFAULTS.GRID;
        ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        
        // --- 2. Floor ---
        const floorColour = room.floorColour || THUMB_DEFAULTS.FLOOR;
        ctx.fillStyle = floorColour;

        if (isLShaped) {
            const cutW = roomW * 0.4 * scale;
            const cutD = roomD * 0.4 * scale;
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
            ctx.lineTo(offsetX + drawW, offsetY);
            ctx.lineTo(offsetX + drawW, offsetY + drawH - cutD);
            ctx.lineTo(offsetX + drawW - cutW, offsetY + drawH - cutD);
            ctx.lineTo(offsetX + drawW - cutW, offsetY + drawH);
            ctx.lineTo(offsetX, offsetY + drawH);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(offsetX, offsetY, drawW, drawH);
        }

        // --- 3. Subtle floor grid ---
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.5;
        const gridStep = 1 * scale; // 1m grid
        for (let gx = gridStep; gx < drawW; gx += gridStep) {
            ctx.beginPath();
            ctx.moveTo(offsetX + gx, offsetY);
            ctx.lineTo(offsetX + gx, offsetY + drawH);
            ctx.stroke();
        }
        for (let gy = gridStep; gy < drawH; gy += gridStep) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + gy);
            ctx.lineTo(offsetX + drawW, offsetY + gy);
            ctx.stroke();
        }
        
        // --- 4. Wall outline ---
        const wallColour = room.wallColour || THUMB_DEFAULTS.WALL;
        ctx.strokeStyle = wallColour;
        ctx.lineWidth = 3;

        if (isLShaped) {
            const cutW = roomW * 0.4 * scale;
            const cutD = roomD * 0.4 * scale;
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
            ctx.lineTo(offsetX + drawW, offsetY);
            ctx.lineTo(offsetX + drawW, offsetY + drawH - cutD);
            ctx.lineTo(offsetX + drawW - cutW, offsetY + drawH - cutD);
            ctx.lineTo(offsetX + drawW - cutW, offsetY + drawH);
            ctx.lineTo(offsetX, offsetY + drawH);
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.strokeRect(offsetX, offsetY, drawW, drawH);
        }

        // --- 5. Furniture items ---
        const furniture = Array.isArray(design.furniture) ? design.furniture : [];
        for (const item of furniture) {
            if (!item) continue;
            
            const fx = (item.x || 0) * scale;
            const fy = (item.y || 0) * scale;
            const fw = (item.width || 0.6) * scale;
            const fd = (item.depth || 0.6) * scale;
            const colour = item.colour || THUMB_DEFAULTS.FURNITURE;
            const type = item.type || '';
            
            ctx.save();
            
            // Handle rotation
            if (item.rotation && item.rotation !== 0) {
                const centerX = offsetX + fx + fw / 2;
                const centerY = offsetY + fy + fd / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate((item.rotation * Math.PI) / 180);
                ctx.translate(-centerX, -centerY);
            }
            
            const x = offsetX + fx;
            const y = offsetY + fy;
            const r = Math.min(3, Math.min(fw, fd) * 0.15); // corner radius

            // Drop shadow
            if (type !== 'rug') {
                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 2;
            }
            
            // Base shape — rounded rectangle
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + fw - r, y);
            ctx.arcTo(x + fw, y, x + fw, y + r, r);
            ctx.lineTo(x + fw, y + fd - r);
            ctx.arcTo(x + fw, y + fd, x + fw - r, y + fd, r);
            ctx.lineTo(x + r, y + fd);
            ctx.arcTo(x, y + fd, x, y + fd - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();

            ctx.fillStyle = colour;
            ctx.fill();

            // Reset shadow before drawing details
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // --- Type-specific interior details ---
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;

            if (type === 'bed') {
                // Pillow area at top (~25%)
                const pillowH = fd * 0.22;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + fw - r, y);
                ctx.arcTo(x + fw, y, x + fw, y + r, r);
                ctx.lineTo(x + fw, y + pillowH);
                ctx.lineTo(x, y + pillowH);
                ctx.lineTo(x, y + r);
                ctx.arcTo(x, y, x + r, y, r);
                ctx.closePath();
                ctx.fill();
                // Pillow line
                ctx.beginPath();
                ctx.moveTo(x + 2, y + pillowH);
                ctx.lineTo(x + fw - 2, y + pillowH);
                ctx.stroke();
                // Duvet fold
                ctx.beginPath();
                ctx.moveTo(x + fw * 0.35, y + pillowH + 4);
                ctx.lineTo(x + fw * 0.35, y + fd - 4);
                ctx.stroke();

            } else if (type === 'sofa') {
                // Back cushion strip
                const backH = fd * 0.25;
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(x + 2, y + 2, fw - 4, backH);
                // Seat cushion dividers
                const cushions = Math.max(2, Math.round(fw / (0.6 * scale)));
                const cw = (fw - 4) / cushions;
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                for (let i = 1; i < cushions; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x + 2 + i * cw, y + backH + 2);
                    ctx.lineTo(x + 2 + i * cw, y + fd - 2);
                    ctx.stroke();
                }

            } else if (type === 'armchair') {
                // Back cushion
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(x + 2, y + 2, fw - 4, fd * 0.25);
                // Arm rests
                ctx.fillStyle = 'rgba(0,0,0,0.08)';
                ctx.fillRect(x + 1, y + 1, fw * 0.15, fd - 2);
                ctx.fillRect(x + fw - fw * 0.15 - 1, y + 1, fw * 0.15, fd - 2);

            } else if (type === 'chair') {
                // Circular seat
                ctx.beginPath();
                ctx.arc(x + fw / 2, y + fd / 2, Math.min(fw, fd) * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.stroke();

            } else if (type === 'dining-table' || type === 'coffee-table' || type === 'side-table') {
                // Inset rectangle (tabletop edge)
                const inset = Math.max(2, Math.min(fw, fd) * 0.12);
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + inset, y + inset, fw - 2 * inset, fd - 2 * inset);

            } else if (type === 'desk') {
                // Tabletop inset
                const inset = Math.max(2, Math.min(fw, fd) * 0.1);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.strokeRect(x + inset, y + inset, fw - 2 * inset, fd - 2 * inset);
                // Drawer pull
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                const pullW = fw * 0.2;
                ctx.fillRect(x + (fw - pullW) / 2, y + fd - inset - 2, pullW, 2);

            } else if (type === 'bookshelf') {
                // Horizontal shelf lines
                const shelves = Math.max(2, Math.round(fd / (0.35 * scale)));
                const gap = fd / (shelves + 1);
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                for (let s = 1; s <= shelves; s++) {
                    ctx.beginPath();
                    ctx.moveTo(x + 2, y + gap * s);
                    ctx.lineTo(x + fw - 2, y + gap * s);
                    ctx.stroke();
                }

            } else if (type === 'wardrobe') {
                // Centre door line
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.beginPath();
                ctx.moveTo(x + fw / 2, y + 3);
                ctx.lineTo(x + fw / 2, y + fd - 3);
                ctx.stroke();
                // Door handles
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                const handleH = Math.min(6, fd * 0.15);
                ctx.fillRect(x + fw / 2 - 4, y + fd / 2 - handleH / 2, 2, handleH);
                ctx.fillRect(x + fw / 2 + 2, y + fd / 2 - handleH / 2, 2, handleH);

            } else if (type === 'tv-stand') {
                // Screen rectangle
                const screenInset = Math.max(3, Math.min(fw, fd) * 0.15);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x + screenInset, y + 2, fw - 2 * screenInset, fd * 0.45);

            } else if (type === 'rug') {
                // Border pattern
                const bw = Math.max(2, Math.min(fw, fd) * 0.08);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x + bw, y + bw, fw - 2 * bw, fd - 2 * bw);
            }

            // Outer border for all non-rug items
            if (type !== 'rug') {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + fw - r, y);
                ctx.arcTo(x + fw, y, x + fw, y + r, r);
                ctx.lineTo(x + fw, y + fd - r);
                ctx.arcTo(x + fw, y + fd, x + fw - r, y + fd, r);
                ctx.lineTo(x + r, y + fd);
                ctx.arcTo(x, y + fd, x, y + fd - r, r);
                ctx.lineTo(x, y + r);
                ctx.arcTo(x, y, x + r, y, r);
                ctx.closePath();
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Attach event listeners using event delegation
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;
        
        // Logout button
        const logoutBtn = this.container.querySelector('#logout-btn');
        logoutBtn?.addEventListener('click', () => this.onLogout());
        
        // New design buttons
        const newDesignBtn = this.container.querySelector('#new-design-btn');
        newDesignBtn?.addEventListener('click', () => this.onNewDesign());
        
        const emptyNewDesignBtn = this.container.querySelector('#empty-new-design-btn');
        emptyNewDesignBtn?.addEventListener('click', () => this.onNewDesign());

        // Load sample designs button
        const loadSamplesBtn = this.container.querySelector('#load-samples-btn');
        loadSamplesBtn?.addEventListener('click', () => this._handleLoadSamples());
        
        // Compare designs button
        const compareBtn = this.container.querySelector('#compare-btn');
        compareBtn?.addEventListener('click', () => {
            if (this.designs.length >= 2) {
                this.onCompareDesigns();
            } else {
                Toast.info('You need at least 2 designs to compare');
            }
        });
        
        // Design card actions (event delegation)
        const designsGrid = this.container.querySelector('.designs-grid');
        if (designsGrid) {
            designsGrid.addEventListener('click', (event) => {
                const target = event.target;
                
                // Open button
                const openBtn = target.closest('.design-open-btn');
                if (openBtn) {
                    const designId = openBtn.dataset.designId;
                    if (designId) this.onOpenDesign(designId);
                    return;
                }
                
                // Delete button
                const deleteBtn = target.closest('.design-delete-btn');
                if (deleteBtn) {
                    const designId = deleteBtn.dataset.designId;
                    const designName = deleteBtn.dataset.designName || 'this design';
                    if (designId) this._handleDeleteDesign(designId, designName);
                }
            });
        }
    }
    
    /**
     * Handle delete design with confirmation modal
     * @param {string} designId - ID of design to delete
     * @param {string} designName - Name of design for confirmation message
     * @private
     */
    _handleDeleteDesign(designId, designName) {
        Modal.confirmDelete(designName, () => {
            this.onDeleteDesign(designId);
        });
    }
    
    /**
     * Handle loading sample designs from demo data.
     * @private
     */
    async _handleLoadSamples() {
        const count = await loadSampleData(this.username);
        if (count > 0) {
            Toast.success(`Loaded ${count} sample design${count > 1 ? 's' : ''}`);
            const designs = getAllDesigns(this.username);
            this.refreshDesigns(designs);
        } else {
            Toast.error('Failed to load sample designs');
        }
    }

    /**
     * Refresh the design list with new data
     * @param {Array} designs - Updated designs array
     */
    refreshDesigns(designs) {
        if (!this.container) return;
        this.render(this.container, designs, this.username);
    }
    
    /**
     * Clean up the view and release references
     */
    destroy() {
        this.container = null;
        this.designs = [];
    }
}

export { DashboardView };
export default DashboardView;
