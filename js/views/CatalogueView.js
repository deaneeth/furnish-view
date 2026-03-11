/**
 * FurnishView — Catalogue View
 *
 * Browsable furniture catalogue page with category filtering, search,
 * product cards with pricing, and Add-to-Cart / Use-in-Design actions.
 *
 * Layout:
 *  - Top bar: back-to-dashboard, search, category filter
 *  - Category pills: All, Living Room, Bedroom, Dining, Office
 *  - Furniture grid: icon/swatch, name, dimensions, price, action buttons
 *  - Sticky cart summary bar at bottom
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility (active category, search results count, cart badge)
 *  - #3 User control (back button, clear search, remove filters)
 *  - #5 Error prevention (disabled duplicate-add feedback via Toast)
 *  - #7 Flexibility (pill tabs + dropdown + search for filtering)
 *  - #8 Aesthetic and minimalist design (card grid, clean spacing)
 *
 * @file js/views/CatalogueView.js
 * @module views/CatalogueView
 */

import { furnitureCatalogue, getFurnitureByCategory } from '../data/furnitureCatalogue.js';
import { Toast } from './components/Toast.js';

/** Category definitions for the filter pills */
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'living', label: 'Living Room' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'dining', label: 'Dining' },
    { id: 'office', label: 'Home Office' },
    { id: 'general', label: 'General' }
];

/**
 * Furniture icon SVGs keyed by catalogue icon field.
 * Compact inline SVGs for product card headers.
 * @type {Object<string, string>}
 * @private
 */
const FURNITURE_ICONS = {
    chair: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4H5v-4z"/><path d="M19 15v5M5 15v5"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/></svg>`,
    table: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="3" rx="1"/><path d="M4 10v10M20 10v10"/></svg>`,
    'table-sm': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="2" rx="1"/><path d="M7 10v9M17 10v9"/></svg>`,
    sofa: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M4 19v2M20 19v2"/></svg>`,
    armchair: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9V7a5 5 0 0 0-10 0v2"/><path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a3 3 0 0 0-6 0H9a3 3 0 0 0-6 0z"/><path d="M5 19v2M19 19v2"/></svg>`,
    'coffee-table': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="2" rx="1"/><path d="M5 12v6M19 12v6"/><path d="M3 18h18"/></svg>`,
    bookshelf: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="10" y1="2" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="14"/></svg>`,
    desk: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="3" rx="1"/><path d="M4 9v10M20 9v10"/><rect x="13" y="9" width="5" height="6" rx="0.5"/></svg>`,
    'tv-stand': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6M18 8V6"/><rect x="4" y="10" width="7" height="4" rx="0.5"/></svg>`,
    bed: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    wardrobe: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="9" cy="12" r="0.5" fill="currentColor"/><circle cx="15" cy="12" r="0.5" fill="currentColor"/></svg>`,
    rug: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M18 6v12"/><path d="M2 12h20"/></svg>`
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
 * Format a price in GBP
 * @param {number} price - Price value
 * @returns {string} Formatted price string (e.g., "£599")
 * @private
 */
function formatPrice(price) {
    return `£${Number(price).toLocaleString('en-GB')}`;
}

/**
 * Format dimensions for display
 * @param {Object} item - Furniture catalogue item
 * @returns {string} Formatted dimensions (e.g., "1.6m × 0.9m × 0.75m")
 * @private
 */
function formatDimensions(item) {
    return `${item.defaultWidth}m × ${item.defaultDepth}m × ${item.defaultHeight}m`;
}

/**
 * CatalogueView class
 * Manages the furniture catalogue browser with search, filtering and cart actions
 */
class CatalogueView {
    /**
     * Create a CatalogueView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onBack - Callback to navigate back to dashboard
     * @param {Function} options.onAddToCart - Callback when adding item to cart: (furnitureType, price) => void
     * @param {Function} options.onUseInDesign - Callback to open editor with a furniture type pre-selected: (furnitureType) => void
     * @param {Function} options.onViewCart - Callback to navigate to cart
     */
    constructor({
        onBack = () => {},
        onAddToCart = () => {},
        onUseInDesign = () => {},
        onViewCart = () => {}
    } = {}) {
        this.onBack = onBack;
        this.onAddToCart = onAddToCart;
        this.onUseInDesign = onUseInDesign;
        this.onViewCart = onViewCart;
        this.container = null;
        this._activeCategory = 'all';
        this._searchQuery = '';
        this._searchTimer = null;
        this._cartCount = 0;
    }

    /**
     * Render the catalogue view
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} options - Render options
     * @param {string} [options.category='all'] - Initial category filter
     * @param {number} [options.cartCount=0] - Current cart item count
     */
    render(container, { category = 'all', cartCount = 0 } = {}) {
        if (!container) return;

        this.container = container;
        this._activeCategory = category;
        this._cartCount = cartCount;

        this._buildDOM();
        this._attachEventListeners();
    }

    /**
     * Build the full catalogue DOM structure
     * @private
     */
    _buildDOM() {
        const items = this._getFilteredItems();
        const cartBadge = this._cartCount > 0
            ? `<span class="cat-cart-badge">${this._cartCount}</span>`
            : '';

        this.container.innerHTML = `
            <div class="catalogue-view">
                <!-- Top Bar -->
                <header class="cat-header">
                    <div class="cat-header__left">
                        <button type="button" class="cat-back-btn" id="cat-back-btn" aria-label="Back to dashboard">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            Dashboard
                        </button>
                    </div>
                    <div class="cat-header__center">
                        <div class="cat-search">
                            <svg class="cat-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" class="cat-search__input" id="cat-search-input" placeholder="Search furniture..." autocomplete="off" spellcheck="false" />
                            <button type="button" class="cat-search__clear" id="cat-search-clear" aria-label="Clear search" style="display:none;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="cat-header__right">
                        <button type="button" class="cat-cart-btn" id="cat-cart-btn" aria-label="View cart">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            ${cartBadge}
                        </button>
                    </div>
                </header>

                <!-- Category Pills -->
                <nav class="cat-pills" aria-label="Furniture categories">
                    ${CATEGORIES.map(cat => `
                        <button type="button"
                            class="cat-pill${cat.id === this._activeCategory ? ' cat-pill--active' : ''}"
                            data-category="${cat.id}"
                            ${cat.id === this._activeCategory ? 'aria-current="true"' : ''}>
                            ${escapeHtml(cat.label)}
                        </button>
                    `).join('')}
                </nav>

                <!-- Results summary -->
                <div class="cat-results-bar">
                    <span class="cat-results-count" id="cat-results-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
                </div>

                <!-- Furniture Grid -->
                <div class="cat-grid" id="cat-grid" role="list" aria-label="Furniture items">
                    ${items.length > 0 ? items.map(item => this._renderProductCard(item)).join('') : this._renderEmptyState()}
                </div>

                <!-- Cart Summary Bar -->
                ${this._cartCount > 0 ? `
                <div class="cat-cart-bar" id="cat-cart-bar">
                    <span class="cat-cart-bar__text">${this._cartCount} ${this._cartCount === 1 ? 'item' : 'items'} in cart</span>
                    <button type="button" class="btn btn-primary btn-sm cat-cart-bar__btn" id="cat-cart-bar-btn">
                        View Cart
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    /**
     * Render a single product card
     * @param {Object} item - Furniture catalogue item
     * @returns {string} HTML string for product card
     * @private
     */
    _renderProductCard(item) {
        const iconSvg = FURNITURE_ICONS[item.icon] || FURNITURE_ICONS['chair'];
        const name = escapeHtml(item.label);
        const desc = escapeHtml(item.description || '');
        const dims = formatDimensions(item);
        const price = formatPrice(item.price);
        const categoryLabel = CATEGORIES.find(c => c.id === item.category)?.label || item.category;

        return `
            <article class="cat-card" role="listitem" data-type="${escapeHtml(item.type)}">
                <div class="cat-card__header">
                    <span class="cat-card__icon" aria-hidden="true">${iconSvg}</span>
                    <span class="cat-card__swatch" style="background-color: ${escapeHtml(item.defaultColour)}" title="Default colour: ${escapeHtml(item.defaultColour)}" aria-label="Colour swatch"></span>
                </div>
                <div class="cat-card__body">
                    <h3 class="cat-card__name">${name}</h3>
                    <p class="cat-card__desc">${desc}</p>
                    <p class="cat-card__dims">${dims}</p>
                    <span class="cat-card__category">${escapeHtml(categoryLabel)}</span>
                </div>
                <div class="cat-card__footer">
                    <span class="cat-card__price">${price}</span>
                    <div class="cat-card__actions">
                        <button type="button" class="btn btn-sm btn-secondary cat-use-btn" data-type="${escapeHtml(item.type)}" title="Open editor with this item">Use in Design</button>
                        <button type="button" class="btn btn-sm btn-primary cat-add-btn" data-type="${escapeHtml(item.type)}" data-price="${item.price}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render the empty state when no items match search/filter
     * @returns {string} HTML string
     * @private
     */
    _renderEmptyState() {
        return `
            <div class="cat-empty">
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                            <circle cx="22" cy="22" r="14" stroke="currentColor" stroke-width="2.5"/>
                            <line x1="32" y1="32" x2="42" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                            <path d="M18 22h8M22 18v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">No furniture found</h3>
                    <p class="empty-description">Try a different search term or category filter.</p>
                </div>
            </div>
        `;
    }

    /**
     * Get catalogue items filtered by active category and search query
     * @returns {Array} Filtered furniture items
     * @private
     */
    _getFilteredItems() {
        let items = getFurnitureByCategory(this._activeCategory);

        if (this._searchQuery.length > 0) {
            const query = this._searchQuery.toLowerCase();
            items = items.filter(item =>
                item.label.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                item.type.toLowerCase().includes(query)
            );
        }

        return items;
    }

    /**
     * Attach event listeners via delegation and direct binding
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;

        // Back to dashboard
        this.container.querySelector('#cat-back-btn')?.addEventListener('click', () => this.onBack());

        // Cart buttons
        this.container.querySelector('#cat-cart-btn')?.addEventListener('click', () => this.onViewCart());
        this.container.querySelector('#cat-cart-bar-btn')?.addEventListener('click', () => this.onViewCart());

        // Search input with debounce
        const searchInput = this.container.querySelector('#cat-search-input');
        const clearBtn = this.container.querySelector('#cat-search-clear');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => {
                    this._searchQuery = searchInput.value.trim();
                    if (clearBtn) clearBtn.style.display = this._searchQuery.length > 0 ? 'flex' : 'none';
                    this._refreshGrid();
                }, 250);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this._searchQuery = '';
                clearBtn.style.display = 'none';
                this._refreshGrid();
                searchInput?.focus();
            });
        }

        // Category pills
        this.container.querySelectorAll('.cat-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this._activeCategory = pill.dataset.category;
                this.container.querySelectorAll('.cat-pill').forEach(p => {
                    p.classList.toggle('cat-pill--active', p.dataset.category === this._activeCategory);
                    p.setAttribute('aria-current', p.dataset.category === this._activeCategory ? 'true' : 'false');
                });
                this._refreshGrid();
            });
        });

        // Product card actions (event delegation on grid)
        const grid = this.container.querySelector('#cat-grid');
        if (grid) {
            grid.addEventListener('click', (event) => {
                const addBtn = event.target.closest('.cat-add-btn');
                if (addBtn) {
                    const type = addBtn.dataset.type;
                    const price = Number(addBtn.dataset.price) || 0;
                    this.onAddToCart(type, price);
                    return;
                }
                const useBtn = event.target.closest('.cat-use-btn');
                if (useBtn) {
                    const type = useBtn.dataset.type;
                    this.onUseInDesign(type);
                }
            });
        }
    }

    /**
     * Refresh just the grid and results count without full re-render
     * @private
     */
    _refreshGrid() {
        const items = this._getFilteredItems();
        const grid = this.container?.querySelector('#cat-grid');
        const count = this.container?.querySelector('#cat-results-count');

        if (grid) {
            grid.innerHTML = items.length > 0
                ? items.map(item => this._renderProductCard(item)).join('')
                : this._renderEmptyState();
        }
        if (count) {
            count.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
        }
    }

    /**
     * Update the cart count display (called externally after cart changes)
     * @param {number} count - New cart item count
     */
    updateCartCount(count) {
        this._cartCount = count;

        // Update header badge
        const cartBtn = this.container?.querySelector('#cat-cart-btn');
        if (cartBtn) {
            const existing = cartBtn.querySelector('.cat-cart-badge');
            if (count > 0) {
                if (existing) {
                    existing.textContent = count;
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'cat-cart-badge';
                    badge.textContent = count;
                    cartBtn.appendChild(badge);
                }
            } else if (existing) {
                existing.remove();
            }
        }

        // Update or toggle bottom cart bar
        const existingBar = this.container?.querySelector('#cat-cart-bar');
        if (count > 0) {
            if (existingBar) {
                const text = existingBar.querySelector('.cat-cart-bar__text');
                if (text) text.textContent = `${count} ${count === 1 ? 'item' : 'items'} in cart`;
            } else {
                const bar = document.createElement('div');
                bar.className = 'cat-cart-bar';
                bar.id = 'cat-cart-bar';
                bar.innerHTML = `
                    <span class="cat-cart-bar__text">${count} ${count === 1 ? 'item' : 'items'} in cart</span>
                    <button type="button" class="btn btn-primary btn-sm cat-cart-bar__btn" id="cat-cart-bar-btn">
                        View Cart
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                `;
                this.container?.querySelector('.catalogue-view')?.appendChild(bar);
                bar.querySelector('#cat-cart-bar-btn')?.addEventListener('click', () => this.onViewCart());
            }
        } else if (existingBar) {
            existingBar.remove();
        }
    }

    /**
     * Clean up the view and release references
     */
    destroy() {
        clearTimeout(this._searchTimer);
        this.container = null;
    }
}

export { CatalogueView };
export default CatalogueView;
