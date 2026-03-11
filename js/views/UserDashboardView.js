/**
 * FurnishView — User (Customer) Dashboard View
 *
 * Customer-focused home screen with hero section, personal designs grid,
 * furniture category browsing, and quick action shortcuts.
 *
 * Key differences from Admin DashboardView:
 * - Hero section with "Design Your Dream Room" CTA
 * - Browse Furniture section with category cards
 * - Quick Actions: New Design, Browse Catalogue, View Cart
 * - Cart badge in header
 * - Shares the same editor (EditorView) for room design creation
 *
 * Implements Nielsen Heuristics:
 * - #1 Visibility of system status (design count, cart badge, empty states)
 * - #5 Error prevention (delete confirmation via Modal)
 * - #7 Flexibility (multiple entry points to key features)
 * - #8 Aesthetic and minimalist design (card-based layout)
 *
 * @file js/views/UserDashboardView.js
 * @module views/UserDashboardView
 */

import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { loadSampleData, getAllDesigns } from '../utils/storage.js';

/** Thumbnail canvas dimensions in pixels */
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;

/** Thumbnail padding ratio */
const THUMB_PADDING = 0.12;

/** Default colours for thumbnail rendering */
const THUMB_DEFAULTS = {
    FLOOR: '#F5F0EB',
    WALL: '#E8E0D4',
    FURNITURE: '#94A3B8',
    GRID: '#EEEEEE'
};

/** Furniture category definitions for the browse section */
const FURNITURE_CATEGORIES = [
    {
        id: 'living',
        label: 'Living Room',
        description: 'Sofas, armchairs, coffee tables & more',
        icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M4 19v2M20 19v2"/></svg>`,
        types: ['sofa', 'armchair', 'coffee-table', 'side-table', 'rug', 'tv-stand']
    },
    {
        id: 'bedroom',
        label: 'Bedroom',
        description: 'Beds, wardrobes, side tables',
        icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
        types: ['bed', 'wardrobe', 'side-table', 'rug']
    },
    {
        id: 'dining',
        label: 'Dining Room',
        description: 'Tables, chairs & accessories',
        icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="2" rx="1"/><path d="M4 9v10M20 9v10"/><path d="M6 9v8M18 9v8"/></svg>`,
        types: ['dining-table', 'chair', 'side-table', 'rug']
    },
    {
        id: 'office',
        label: 'Home Office',
        description: 'Desks, bookshelves & chairs',
        icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
        types: ['desk', 'chair', 'bookshelf']
    },
    {
        id: 'all',
        label: 'All Furniture',
        description: 'View the complete catalogue',
        icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
        types: []
    }
];

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
 * Format date for display with relative time
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
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
        if (diffDays === 0) return 'Today';
        else if (diffDays === 1) return 'Yesterday';
        else if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Unknown date'; }
}

/**
 * Format room dimensions for display
 * @param {Object} room - Room object
 * @returns {string} Formatted dimensions
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
 * UserDashboardView class
 * Manages the customer dashboard with designs, category browsing, and quick actions
 */
class UserDashboardView {
    /**
     * Create a UserDashboardView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onNewDesign - Callback for creating a new design
     * @param {Function} options.onOpenDesign - Callback for opening a design
     * @param {Function} options.onDeleteDesign - Callback for deleting a design
     * @param {Function} options.onLogout - Callback for logout action
     * @param {Function} options.onBrowseCatalogue - Callback for browsing catalogue (with optional category)
     * @param {Function} options.onViewCart - Callback for viewing the cart
     */
    constructor({
        onNewDesign = () => {},
        onOpenDesign = () => {},
        onDeleteDesign = () => {},
        onLogout = () => {},
        onBrowseCatalogue = () => {},
        onViewCart = () => {}
    } = {}) {
        this.onNewDesign = onNewDesign;
        this.onOpenDesign = onOpenDesign;
        this.onDeleteDesign = onDeleteDesign;
        this.onLogout = onLogout;
        this.onBrowseCatalogue = onBrowseCatalogue;
        this.onViewCart = onViewCart;
        this.container = null;
        this.designs = [];
        this.username = '';
        this.fullName = '';
        this.cartCount = 0;
    }

    /**
     * Render the user dashboard
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} designs - Array of saved designs
     * @param {string} username - Current username
     * @param {Object} options - Additional render options
     * @param {string} options.fullName - User's display name
     * @param {number} options.cartCount - Number of items in cart
     */
    render(container, designs = [], username = '', { fullName = '', cartCount = 0 } = {}) {
        if (!container) return;

        this.container = container;
        this.designs = Array.isArray(designs) ? designs : [];
        this.username = escapeHtml(username || 'User');
        this.fullName = escapeHtml(fullName || username || 'User');
        this.cartCount = cartCount;

        const hasDesigns = this.designs.length > 0;
        const designCountText = this.designs.length === 1
            ? '1 design'
            : `${this.designs.length} designs`;
        const cartBadge = this.cartCount > 0
            ? `<span class="ud-cart-badge">${this.cartCount}</span>`
            : '';

        container.innerHTML = `
            <div class="user-dashboard">
                <!-- Header Bar -->
                <header class="dashboard-header">
                    <div class="dashboard-brand">
                        <h1 class="dashboard-logo">
                            <span class="dashboard-logo-icon" aria-hidden="true">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            </span>
                            FurnishView
                        </h1>
                    </div>
                    <div class="dashboard-user">
                        <button type="button" class="ud-cart-btn" id="ud-cart-btn" aria-label="View cart">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            ${cartBadge}
                        </button>
                        <span class="dashboard-username">${this.fullName}</span>
                        <button type="button" id="ud-logout-btn" class="dashboard-signout" aria-label="Sign out">Sign out</button>
                    </div>
                </header>

                <main class="ud-main">
                    <!-- Hero Section -->
                    <section class="ud-hero">
                        <div class="ud-hero__content">
                            <h2 class="ud-hero__title">Design Your Dream Room</h2>
                            <p class="ud-hero__subtitle">Create stunning room layouts with our intuitive 2D editor and see them come alive in 3D.</p>
                            <button type="button" class="ud-hero__cta btn btn-primary" id="ud-hero-new-design">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                Start Designing
                            </button>
                        </div>
                        <div class="ud-hero__visual" aria-hidden="true">
                            <svg viewBox="0 0 320 200" fill="none" class="ud-hero__illustration">
                                <rect x="20" y="15" width="280" height="170" rx="6" fill="#F5F0EB" stroke="#D4CBC0" stroke-width="1.5"/>
                                <line x1="100" y1="15" x2="100" y2="185" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="180" y1="15" x2="180" y2="185" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="260" y1="15" x2="260" y2="185" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="20" y1="70" x2="300" y2="70" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="20" y1="125" x2="300" y2="125" stroke="#E8E0D8" stroke-width="0.5"/>
                                <rect x="35" y="30" width="85" height="32" rx="5" fill="#6B7B6E" opacity="0.85"/>
                                <rect x="40" y="35" width="25" height="22" rx="3" fill="#7D8E80" opacity="0.5"/>
                                <rect x="70" y="35" width="25" height="22" rx="3" fill="#7D8E80" opacity="0.5"/>
                                <rect x="50" y="80" width="50" height="28" rx="4" fill="#A0896E" opacity="0.85"/>
                                <rect x="190" y="35" width="75" height="48" rx="5" fill="#C9B99A" opacity="0.85"/>
                                <rect x="193" y="38" width="69" height="12" rx="3" fill="#D4C7AB"/>
                                <rect x="190" y="125" width="65" height="45" rx="5" fill="#8C7A64" opacity="0.85"/>
                                <circle cx="205" cy="118" r="8" fill="#9C8B75" opacity="0.7"/>
                                <circle cx="240" cy="118" r="8" fill="#9C8B75" opacity="0.7"/>
                            </svg>
                        </div>
                    </section>

                    <!-- Quick Actions -->
                    <section class="ud-section">
                        <div class="ud-quick-actions">
                            <button type="button" class="ud-quick-action" id="ud-action-design">
                                <span class="ud-quick-action__icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                </span>
                                <span class="ud-quick-action__label">New Design</span>
                            </button>
                            <button type="button" class="ud-quick-action" id="ud-action-catalogue">
                                <span class="ud-quick-action__icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                </span>
                                <span class="ud-quick-action__label">Browse Catalogue</span>
                            </button>
                            <button type="button" class="ud-quick-action" id="ud-action-cart">
                                <span class="ud-quick-action__icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                                </span>
                                <span class="ud-quick-action__label">View Cart</span>
                            </button>
                        </div>
                    </section>

                    <!-- My Designs Section -->
                    <section class="ud-section">
                        <div class="ud-section-header">
                            <h2 class="ud-section-title">My Designs</h2>
                            <div class="ud-section-actions">
                                ${hasDesigns ? `<span class="dashboard-design-count">${designCountText}</span>` : ''}
                                ${!hasDesigns ? `<button type="button" id="ud-load-samples-btn" class="btn btn-secondary btn-sm">Load Samples</button>` : ''}
                                <button type="button" id="ud-new-design-btn" class="btn btn-primary btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    New Design
                                </button>
                            </div>
                        </div>
                        ${hasDesigns ? this._renderDesignsGrid() : this._renderEmptyDesigns()}
                    </section>

                    <!-- Browse Furniture Section -->
                    <section class="ud-section">
                        <div class="ud-section-header">
                            <h2 class="ud-section-title">Browse Furniture</h2>
                            <p class="ud-section-subtitle">Explore our collection by category</p>
                        </div>
                        <div class="ud-categories-grid">
                            ${FURNITURE_CATEGORIES.map(cat => this._renderCategoryCard(cat)).join('')}
                        </div>
                    </section>
                </main>
            </div>
        `;

        this._attachEventListeners();

        if (hasDesigns) {
            requestAnimationFrame(() => this._generateThumbnails());
        }
    }

    /**
     * Render the user's designs grid (reuses admin card structure)
     * @returns {string} HTML string for designs grid
     * @private
     */
    _renderDesignsGrid() {
        const cards = this.designs.map(d => this._renderDesignCard(d)).join('');
        return `<div class="designs-grid" role="list" aria-label="My designs">${cards}</div>`;
    }

    /**
     * Render a single design card
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
                        <span class="design-card-placeholder-icon" aria-hidden="true">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                        </span>
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
                    <button type="button" class="btn btn-sm btn-primary design-open-btn" data-design-id="${id}">Open</button>
                    <button type="button" class="btn btn-sm btn-icon btn-danger-outline design-delete-btn" data-design-id="${id}" data-design-name="${name}" aria-label="Delete ${name}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4M7 7v4M9 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </article>
        `;
    }

    /**
     * Render empty state for designs section
     * @returns {string} HTML string
     * @private
     */
    _renderEmptyDesigns() {
        return `
            <div class="ud-empty-designs">
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                            <path d="M24 6L42 18V38a2 2 0 01-2 2H8a2 2 0 01-2-2V18L24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
                            <rect x="18" y="24" width="12" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
                            <path d="M14 18h6M28 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">No designs yet</h3>
                    <p class="empty-description">Create your first room design and see it come to life in 3D</p>
                    <button type="button" class="btn btn-primary" id="ud-empty-new-design-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                        Create First Design
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render a single furniture category card
     * @param {Object} category - Category definition
     * @returns {string} HTML string for category card
     * @private
     */
    _renderCategoryCard(category) {
        const itemCount = category.types.length;
        const countLabel = category.id === 'all' ? '12 items' : `${itemCount} items`;

        return `
            <button type="button" class="ud-category-card" data-category="${escapeHtml(category.id)}">
                <span class="ud-category-card__icon">${category.icon}</span>
                <span class="ud-category-card__label">${escapeHtml(category.label)}</span>
                <span class="ud-category-card__desc">${escapeHtml(category.description)}</span>
                <span class="ud-category-card__count">${countLabel}</span>
            </button>
        `;
    }

    /**
     * Generate thumbnail previews for design cards using offscreen canvas.
     * Reuses the same algorithm as DashboardView for visual consistency.
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
                    previewEl.innerHTML = '';
                    previewEl.appendChild(img);
                }
            } catch {
                // Keep placeholder on error
            }
        }
    }

    /**
     * Generate a single design thumbnail using an offscreen canvas.
     *
     * ALGORITHM:
     *  1. Create offscreen canvas (THUMB_WIDTH x THUMB_HEIGHT)
     *  2. Compute scale to fit room inside canvas with padding
     *  3. Fill background with floor colour
     *  4. Draw grid lines, wall outline, and furniture shapes
     *  5. Return canvas.toDataURL()
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

        const padX = THUMB_WIDTH * THUMB_PADDING;
        const padY = THUMB_HEIGHT * THUMB_PADDING;
        const availW = THUMB_WIDTH - 2 * padX;
        const availH = THUMB_HEIGHT - 2 * padY;
        const scale = Math.min(availW / roomW, availH / roomD);

        const drawW = roomW * scale;
        const drawH = roomD * scale;
        const offsetX = (THUMB_WIDTH - drawW) / 2;
        const offsetY = (THUMB_HEIGHT - drawH) / 2;

        // Background
        ctx.fillStyle = THUMB_DEFAULTS.GRID;
        ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);

        // Floor
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

        // Grid
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.5;
        const gridStep = 1 * scale;
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

        // Walls
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

        // Furniture
        const furniture = Array.isArray(design.furniture) ? design.furniture : [];
        for (const item of furniture) {
            if (!item) continue;
            const fx = (item.x || 0) * scale;
            const fy = (item.y || 0) * scale;
            const fw = (item.width || 0.6) * scale;
            const fd = (item.depth || 0.6) * scale;
            const colour = item.colour || THUMB_DEFAULTS.FURNITURE;

            ctx.save();
            if (item.rotation && item.rotation !== 0) {
                const cx = offsetX + fx + fw / 2;
                const cy = offsetY + fy + fd / 2;
                ctx.translate(cx, cy);
                ctx.rotate((item.rotation * Math.PI) / 180);
                ctx.translate(-cx, -cy);
            }

            const x = offsetX + fx;
            const y = offsetY + fy;
            const r = Math.min(3, Math.min(fw, fd) * 0.15);

            if (item.type !== 'rug') {
                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 2;
            }

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

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            if (item.type !== 'rug') {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        }

        return canvas.toDataURL('image/png');
    }

    /**
     * Attach event listeners via event delegation
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;

        // Header actions
        this.container.querySelector('#ud-logout-btn')?.addEventListener('click', () => this.onLogout());
        this.container.querySelector('#ud-cart-btn')?.addEventListener('click', () => this.onViewCart());

        // Hero CTA
        this.container.querySelector('#ud-hero-new-design')?.addEventListener('click', () => this.onNewDesign());

        // Quick actions
        this.container.querySelector('#ud-action-design')?.addEventListener('click', () => this.onNewDesign());
        this.container.querySelector('#ud-action-catalogue')?.addEventListener('click', () => this.onBrowseCatalogue());
        this.container.querySelector('#ud-action-cart')?.addEventListener('click', () => this.onViewCart());

        // Designs section
        this.container.querySelector('#ud-new-design-btn')?.addEventListener('click', () => this.onNewDesign());
        this.container.querySelector('#ud-empty-new-design-btn')?.addEventListener('click', () => this.onNewDesign());
        this.container.querySelector('#ud-load-samples-btn')?.addEventListener('click', () => this._handleLoadSamples());

        // Design card actions (event delegation)
        const designsGrid = this.container.querySelector('.designs-grid');
        if (designsGrid) {
            designsGrid.addEventListener('click', (event) => {
                const openBtn = event.target.closest('.design-open-btn');
                if (openBtn) {
                    const designId = openBtn.dataset.designId;
                    if (designId) this.onOpenDesign(designId);
                    return;
                }
                const deleteBtn = event.target.closest('.design-delete-btn');
                if (deleteBtn) {
                    const designId = deleteBtn.dataset.designId;
                    const designName = deleteBtn.dataset.designName || 'this design';
                    if (designId) this._handleDeleteDesign(designId, designName);
                }
            });
        }

        // Category cards
        this.container.querySelectorAll('.ud-category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.onBrowseCatalogue(category);
            });
        });
    }

    /**
     * Handle delete design with confirmation modal
     * @param {string} designId - Design ID
     * @param {string} designName - Design name for confirmation
     * @private
     */
    _handleDeleteDesign(designId, designName) {
        Modal.confirmDelete(designName, () => {
            this.onDeleteDesign(designId);
        });
    }

    /**
     * Handle loading sample designs
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
     * Refresh the design list with updated data
     * @param {Array} designs - Updated designs array
     */
    refreshDesigns(designs) {
        if (!this.container) return;
        this.render(this.container, designs, this.username, {
            fullName: this.fullName,
            cartCount: this.cartCount
        });
    }

    /**
     * Clean up the view and release references
     */
    destroy() {
        this.container = null;
        this.designs = [];
    }
}

export { UserDashboardView };
export default UserDashboardView;
