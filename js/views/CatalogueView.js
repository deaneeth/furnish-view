/**
 * FurnishView — Catalogue View
 *
 * Browsable furniture catalogue page with category filtering, search,
 * product cards with pricing, and Add-to-Cart / Use-in-Design actions.
 *
 * Layout:
 *  - Top bar: back-to-dashboard, search, category filter
 *  - Search bar: Apple-style rounded input with live filtering
 *  - Category pills: All, Living Room, Bedroom, Dining, Office
 *  - Furniture grid: icon/swatch, name, dimensions, price, action buttons
 *  - Card enhancements: stock badge, wishlist heart, star rating, colour dots, View Details
 *  - Sticky cart summary bar at bottom
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility (active category, search results count, cart badge, stock status)
 *  - #3 User control (back button, clear search, remove filters, wishlist toggle)
 *  - #5 Error prevention (disabled add-to-cart for out-of-stock, duplicate-add feedback)
 *  - #7 Flexibility (pill tabs + dropdown + search for filtering)
 *  - #8 Aesthetic and minimalist design (card grid, clean spacing)
 *
 * @file js/views/CatalogueView.js
 * @module views/CatalogueView
 */

import { furnitureCatalogue, getFurnitureByCategory } from '../data/furnitureCatalogue.js';
import { Toast } from './components/Toast.js';
import { BUNDLES, getBundlePrice } from '../data/bundles.js';

/** Category definitions for the filter pills */
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'living', label: 'Living Room' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'dining', label: 'Dining' },
    { id: 'office', label: 'Home Office' },
    { id: 'general', label: 'General' },
    { id: 'structure', label: 'Doors & Windows' }
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
    rug: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M18 6v12"/><path d="M2 12h20"/></svg>`,
    'desk-chair': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h10a1 1 0 0 1 1 1v1H6v-1a1 1 0 0 1 1-1z"/><path d="M8 5h8a1 1 0 0 1 1 1v7H7V6a1 1 0 0 1 1-1z"/><path d="M12 15v3"/><path d="M8 21l4-3 4 3"/><path d="M5 13v-1M19 13v-1"/></svg>`,
    chaise: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14h14a4 4 0 0 0 4-4V6"/><path d="M2 14v3M20 6v2"/><path d="M2 10v4"/><path d="M18 14h2a2 2 0 0 1 2 2v1H2"/><path d="M4 17v2M18 17v2"/></svg>`,
    'floor-plant': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 16c-3-4-6-3-8-1"/><path d="M12 16c3-4 6-3 8-1"/><path d="M12 13c-2-3-5-3-7-1"/><path d="M12 13c2-3 5-3 7-1"/><path d="M12 10c-1.5-2.5-4-3-6-1.5"/><path d="M12 10c1.5-2.5 4-3 6-1.5"/><path d="M9 22h6"/><rect x="9" y="18" width="6" height="4" rx="1"/></svg>`,
    'table-plant': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-4"/><path d="M12 16c-2-3-5-3-6-1"/><path d="M12 16c2-3 5-3 6-1"/><path d="M12 13c-1.5-2.5-4-3-5.5-1"/><path d="M12 13c1.5-2.5 4-3 5.5-1"/><path d="M12 10c-1-2-3-2.5-4.5-1"/><path d="M12 10c1-2 3-2.5 4.5-1"/><rect x="8" y="18" width="8" height="4" rx="1.5"/></svg>`,
    'floor-lamp': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 8h-4L9 3z"/><line x1="12" y1="11" x2="12" y2="20"/><path d="M8 20h8"/><circle cx="12" cy="5" r="0.5" fill="currentColor" stroke="none"/></svg>`,
    'table-lamp': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8l-2 8h-4L8 4z"/><ellipse cx="12" cy="12" rx="4" ry="1"/><line x1="12" y1="13" x2="12" y2="18"/><path d="M9 18h6"/><rect x="8" y="18" width="8" height="2" rx="1"/></svg>`,
    'bedside-lamp': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="5" ry="3"/><path d="M7 6l2 8h6l2-8"/><line x1="12" y1="14" x2="12" y2="18"/><rect x="8" y="18" width="8" height="2" rx="1"/></svg>`,
    'single-door': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="2" x2="4" y2="22"/><line x1="20" y1="2" x2="20" y2="22"/><line x1="4" y1="2" x2="20" y2="2"/><circle cx="17" cy="12" r="1" fill="currentColor"/><rect x="7" y="4" width="10" height="7" rx="0.5"/><rect x="7" y="13" width="10" height="7" rx="0.5"/></svg>`,
    'double-door': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="10" cy="12" r="0.8" fill="currentColor"/><circle cx="14" cy="12" r="0.8" fill="currentColor"/><rect x="4" y="4" width="6" height="7" rx="0.5"/><rect x="14" y="4" width="6" height="7" rx="0.5"/><rect x="4" y="13" width="6" height="7" rx="0.5"/><rect x="14" y="13" width="6" height="7" rx="0.5"/></svg>`,
    'standard-window': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="5" y1="5" x2="10" y2="10"/><line x1="14" y1="5" x2="19" y2="10"/></svg>`,
    'tall-window': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="1" width="14" height="22" rx="1"/><line x1="12" y1="1" x2="12" y2="23"/><line x1="5" y1="8" x2="19" y2="8"/><line x1="5" y1="16" x2="19" y2="16"/><line x1="7" y1="3" x2="10" y2="6"/><line x1="14" y1="10" x2="17" y2="14"/></svg>`,
    'small-window': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1"/><line x1="7" y1="7" x2="12" y2="12"/><rect x="6" y="6" width="12" height="12" rx="0.5" stroke-dasharray="0"/></svg>`
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
 * Format a price in USD
 * @param {number} price - Price value
 * @returns {string} Formatted price string (e.g., "$599")
 * @private
 */
function formatPrice(price) {
    return `$${Number(price).toLocaleString('en-US')}`;
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
 * Render a star rating row as HTML
 * Supports full stars, one half-star, and empty stars.
 * @param {number} rating - Rating value 0–5 (decimals allowed)
 * @param {number} reviewCount - Number of reviews
 * @returns {string} HTML string
 * @private
 */
function renderStarRating(rating, reviewCount) {
    if (rating == null) return '';
    const total = 5;
    const fullStars = Math.floor(rating);
    const hasHalf = (rating - fullStars) >= 0.5;
    const emptyStars = total - fullStars - (hasHalf ? 1 : 0);

    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += `<span class="cat-star cat-star--full" aria-hidden="true">★</span>`;
    }
    if (hasHalf) {
        stars += `<span class="cat-star cat-star--half" aria-hidden="true">★</span>`;
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += `<span class="cat-star cat-star--empty" aria-hidden="true">★</span>`;
    }

    const count = reviewCount != null ? `<span class="cat-review-count">(${reviewCount})</span>` : '';
    return `<div class="cat-rating" aria-label="Rating: ${rating} out of 5 (${reviewCount} reviews)">${stars}${count}</div>`;
}

/**
 * Render a stock badge HTML string based on stock level
 * @param {number} stock - Current stock quantity
 * @returns {string} HTML string (empty string if stock > 10)
 * @private
 */
function renderStockBadge(stock) {
    if (stock == null || stock > 10) return '';
    if (stock === 0) {
        return `<span class="cat-stock-badge cat-stock-badge--out" aria-label="Out of Stock">Out of Stock</span>`;
    }
    return `<span class="cat-stock-badge cat-stock-badge--low" aria-label="Only ${stock} left in stock">Only ${stock} left</span>`;
}

/**
 * Render colour dot swatches HTML
 * Shows up to 4 dots from the item's colours array.
 * @param {Array} colours - Array of { name, hex } objects
 * @returns {string} HTML string
 * @private
 */
function renderColourDots(colours) {
    if (!Array.isArray(colours) || colours.length === 0) return '';
    const dots = colours.slice(0, 4).map(c =>
        `<span class="cat-colour-dot" style="background-color:${escapeHtml(c.hex)};" title="${escapeHtml(c.name)}" aria-label="${escapeHtml(c.name)}"></span>`
    ).join('');
    return `<div class="cat-colour-dots" aria-label="Available colours">${dots}</div>`;
}

/**
 * Inject additional CSS for new card enhancements.
 * Uses a <style id="cat-extra-styles"> tag to avoid duplication.
 * @private
 */
function injectCatExtraStyles() {
    if (document.getElementById('cat-extra-styles')) return;
    const style = document.createElement('style');
    style.id = 'cat-extra-styles';
    style.textContent = `
        /* ── Search bar (Apple HIG style) ── */
        .cat-search-bar {
            padding: 12px 20px 0;
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
            box-sizing: border-box;
        }
        .cat-search-bar__wrap {
            position: relative;
            display: flex;
            align-items: center;
            background: #f0f0f0;
            border-radius: 9999px;
            height: 40px;
            padding: 0 12px;
            border: 1.5px solid transparent;
            transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
        }
        .cat-search-bar__wrap:focus-within {
            background: #fff;
            border-color: #0071e3;
            box-shadow: 0 0 0 3px rgba(0,113,227,0.18);
        }
        .cat-search-bar__icon {
            flex-shrink: 0;
            color: #888;
            margin-right: 8px;
            display: flex;
            align-items: center;
            pointer-events: none;
        }
        .cat-search-bar__input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 14px;
            color: #1d1d1f;
            outline: none;
            line-height: 1;
            min-width: 0;
        }
        .cat-search-bar__input::placeholder {
            color: #aaa;
        }
        .cat-search-bar__clear {
            flex-shrink: 0;
            display: none;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: none;
            background: #c0c0c0;
            color: #fff;
            cursor: pointer;
            padding: 0;
            margin-left: 6px;
            transition: background 0.15s;
        }
        .cat-search-bar__clear:hover {
            background: #999;
        }

        /* ── Card image area overlay container ── */
        .cat-card__header {
            position: relative;
        }

        /* ── Stock badges ── */
        .cat-stock-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 6px;
            padding: 2px 8px;
            pointer-events: none;
            z-index: 2;
            letter-spacing: 0.01em;
        }
        .cat-stock-badge--low {
            background: #FEF3C7;
            color: #92400E;
            border: 1px solid #FDE68A;
        }
        .cat-stock-badge--out {
            background: #FEE2E2;
            color: #991B1B;
            border: 1px solid #FECACA;
        }

        /* ── Wishlist heart button ── */
        .cat-wishlist-btn {
            position: absolute;
            top: 8px;
            left: 8px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.88);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            z-index: 3;
            transition: background 0.15s, transform 0.12s;
        }
        .cat-wishlist-btn:hover {
            background: rgba(255,255,255,1);
            transform: scale(1.1);
        }
        .cat-wishlist-btn:active {
            transform: scale(0.95);
        }
        .cat-wishlist-btn svg {
            width: 16px;
            height: 16px;
            transition: fill 0.15s, stroke 0.15s;
        }
        /* Outline heart (not in wishlist) */
        .cat-wishlist-btn[data-in-wishlist="false"] svg {
            fill: none;
            stroke: #888;
        }
        /* Filled red heart (in wishlist) */
        .cat-wishlist-btn[data-in-wishlist="true"] svg {
            fill: #E53E3E;
            stroke: #E53E3E;
        }

        /* ── Star ratings ── */
        .cat-rating {
            display: flex;
            align-items: center;
            gap: 1px;
            margin-top: 4px;
            margin-bottom: 2px;
            font-size: 13px;
        }
        .cat-star {
            font-size: 13px;
            line-height: 1;
        }
        .cat-star--full {
            color: #F59E0B;
        }
        .cat-star--half {
            color: #F59E0B;
            opacity: 0.6;
        }
        .cat-star--empty {
            color: #D1D5DB;
        }
        .cat-review-count {
            font-size: 12px;
            color: #888;
            margin-left: 4px;
            font-weight: 400;
        }

        /* ── Colour dots ── */
        .cat-colour-dots {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-top: 6px;
        }
        .cat-colour-dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1.5px solid rgba(0,0,0,0.12);
            flex-shrink: 0;
            cursor: default;
        }

        /* ── View Details link ── */
        .cat-view-details-link {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 12px;
            color: #0071e3;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 0 0;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.15s, gap 0.15s;
        }
        .cat-view-details-link:hover {
            color: #0051a3;
            gap: 6px;
        }

        /* ── Disabled add-to-cart state ── */
        .cat-add-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* ── Search empty state ── */
        .cat-empty-search {
            text-align: center;
            padding: 48px 24px;
            color: #888;
        }
        .cat-empty-search__title {
            font-size: 16px;
            font-weight: 600;
            color: #555;
            margin: 0 0 6px;
        }
        .cat-empty-search__sub {
            font-size: 13px;
            margin: 0;
        }

        /* ── Bundles Section ── */
        .cat-bundles {
            padding: 0 20px 8px;
            margin-top: 4px;
        }
        .cat-bundles__heading {
            font-size: 15px;
            font-weight: 600;
            color: #86868b;
            margin: 0 0 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .cat-bundles__row {
            display: flex;
            flex-direction: row;
            gap: 14px;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
        }
        .cat-bundle-card {
            background: #fbfbfd;
            border-radius: 16px;
            padding: 18px;
            min-width: 230px;
            max-width: 260px;
            flex-shrink: 0;
            position: relative;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
            border: 1px solid rgba(0,0,0,0.06);
            display: flex;
            flex-direction: column;
            gap: 6px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .cat-bundle-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1);
        }
        .cat-bundle-tag {
            display: inline-block;
            position: absolute;
            top: 14px;
            right: 14px;
            font-size: 10px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 9999px;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }
        .cat-bundle-icon {
            color: #1d1d1f;
            margin-bottom: 2px;
            opacity: 0.6;
        }
        .cat-bundle-title {
            font-size: 15px;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0;
            padding-right: 56px;
        }
        .cat-bundle-desc {
            font-size: 12px;
            color: #86868b;
            margin: 0;
            line-height: 1.45;
        }
        .cat-bundle-items {
            font-size: 11px;
            color: #86868b;
            margin: 4px 0 0;
            padding: 0;
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        .cat-bundle-items li {
            background: #f5f5f7;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 11px;
            color: #6e6e73;
        }
        .cat-bundle-price {
            font-size: 17px;
            font-weight: 600;
            color: #1d1d1f;
            margin: 4px 0 0;
        }
        .cat-bundle-add-btn {
            width: 100%;
            margin-top: 6px;
            background: #1d1d1f;
            color: #fff;
            border: none;
            border-radius: 9999px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s, transform 0.1s;
        }
        .cat-bundle-add-btn:hover {
            background: #424245;
        }
        .cat-bundle-add-btn:active {
            transform: scale(0.98);
        }

        /* ── Compare Checkbox ── */
        .cat-compare-check {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #555;
            cursor: pointer;
            margin-top: 6px;
            user-select: none;
        }
        .cat-compare-check input[type="checkbox"] {
            cursor: pointer;
            accent-color: #0071e3;
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        /* ── Compare Bar ── */
        .cat-compare-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #fff;
            border-top: 1px solid #e8e8ed;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            z-index: 200;
        }
        .cat-compare-bar__text {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: #1d1d1f;
        }

        /* ── Compare Modal ── */
        .cat-compare-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .cat-compare-modal {
            background: #fff;
            border-radius: 20px;
            padding: 28px;
            max-width: 640px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        }
        .cat-compare-modal__close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: #f0f0f0;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cat-compare-modal__title {
            font-size: 18px;
            font-weight: 700;
            color: #1d1d1f;
            margin: 0 0 20px;
        }
        .cat-compare-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .cat-compare-table th {
            background: #f5f5f7;
            padding: 10px 14px;
            text-align: left;
            font-weight: 700;
            color: #1d1d1f;
            border-bottom: 2px solid #e8e8ed;
        }
        .cat-compare-table td {
            padding: 10px 14px;
            color: #444;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: top;
        }
        .cat-compare-table tr:last-child td {
            border-bottom: none;
        }
        .cat-compare-table td:first-child {
            font-weight: 600;
            color: #888;
            font-size: 12px;
            width: 28%;
        }
    `;
    document.head.appendChild(style);
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
     * @param {Function} options.onViewProduct - Callback when "View Details" is clicked: (furnitureType) => void
     * @param {Function} options.onToggleWishlist - Callback when wishlist heart is clicked: (furnitureType) => { inWishlist: boolean }
     * @param {string} options.username - Currently logged-in username
     * @param {string} options.role - User role ('admin' hides wishlist buttons)
     * @param {Array<string>} options.wishlistItems - Array of furniture type strings already in wishlist
     */
    constructor({
        onBack = () => {},
        onAddToCart = () => {},
        onUseInDesign = () => {},
        onViewCart = () => {},
        onViewProduct = () => {},
        onToggleWishlist = () => {},
        username = '',
        role = '',
        wishlistItems = []
    } = {}) {
        this.onBack = onBack;
        this.onAddToCart = onAddToCart;
        this.onUseInDesign = onUseInDesign;
        this.onViewCart = onViewCart;
        this.onViewProduct = onViewProduct;
        this.onToggleWishlist = onToggleWishlist;
        this.username = username;
        this.role = role;
        this.wishlistItems = new Set(wishlistItems || []);
        this.container = null;
        this._activeCategory = 'all';
        this._searchQuery = '';
        this._searchTimer = null;
        this._cartCount = 0;
        this._compareSet = new Set(); // max 2 items
    }

    /**
     * Render the catalogue view
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} options - Render options
     * @param {string} [options.category='all'] - Initial category filter
     * @param {number} [options.cartCount=0] - Current cart item count
     * @param {Array<string>} [options.wishlistItems=[]] - Items currently in wishlist
     * @param {string} [options.username=''] - Currently logged-in username
     */
    render(container, { category = 'all', cartCount = 0, wishlistItems = [], username = '' } = {}) {
        if (!container) return;

        this.container = container;
        this._activeCategory = category;
        this._cartCount = cartCount;

        // Sync wishlist and username from render call if provided
        if (wishlistItems && wishlistItems.length > 0) {
            this.wishlistItems = new Set(wishlistItems);
        }
        if (username) {
            this.username = username;
        }

        injectCatExtraStyles();
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

                <!-- Bundles Section -->
                <section class="cat-bundles" aria-label="Room bundles">
                    <h2 class="cat-bundles__heading">Room Bundles</h2>
                    <div class="cat-bundles__row">
                        ${BUNDLES.map(b => this._renderBundleCard(b)).join('')}
                    </div>
                </section>

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

                <!-- Compare Bar -->
                <div class="cat-compare-bar" id="cat-compare-bar" style="display:none">
                    <span class="cat-compare-bar__text" id="cat-compare-bar-text"></span>
                    <button class="btn btn-primary btn-sm" id="cat-compare-bar-btn">Compare Now</button>
                    <button class="btn btn-secondary btn-sm" id="cat-compare-bar-clear">Clear</button>
                </div>
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
        const isOutOfStock = item.stock === 0;

        // Stock badge (top-right of card image area)
        const stockBadge = renderStockBadge(item.stock);

        // Wishlist heart button (top-left of card image area, hidden for admin)
        const isAdmin = this.role === 'admin';
        const inWishlist = this.wishlistItems.has(item.type);
        const wishlistBtn = isAdmin ? '' : `
            <button
                type="button"
                class="cat-wishlist-btn"
                data-type="${escapeHtml(item.type)}"
                data-in-wishlist="${inWishlist ? 'true' : 'false'}"
                aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}"
                title="${inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}"
            >
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        `;

        // Star rating + review count
        const starRating = renderStarRating(item.rating, item.reviewCount);

        // Colour dots (up to 4)
        const colourDots = renderColourDots(item.colours);

        return `
            <article class="cat-card" role="listitem" data-type="${escapeHtml(item.type)}">
                <div class="cat-card__header">
                    <span class="cat-card__icon" aria-hidden="true">${iconSvg}</span>
                    <span class="cat-card__swatch" style="background-color: ${escapeHtml(item.defaultColour)}" title="Default colour: ${escapeHtml(item.defaultColour)}" aria-label="Colour swatch"></span>
                    ${wishlistBtn}
                    ${stockBadge}
                </div>
                <div class="cat-card__body">
                    <h3 class="cat-card__name">${name}</h3>
                    <p class="cat-card__desc">${desc}</p>
                    <p class="cat-card__dims">${dims}</p>
                    <span class="cat-card__category">${escapeHtml(categoryLabel)}</span>
                </div>
                <div class="cat-card__footer">
                    <div class="cat-card__footer-row1">
                        <span class="cat-card__price">${price}</span>
                        ${starRating}
                    </div>
                    ${colourDots}
                    <div class="cat-card__actions">
                        <button type="button" class="btn btn-sm btn-secondary cat-use-btn" data-type="${escapeHtml(item.type)}" title="Open editor with this item">Use in Design</button>
                        <button type="button" class="btn btn-sm btn-primary cat-add-btn" data-type="${escapeHtml(item.type)}" data-price="${item.price}"${isOutOfStock ? ' disabled aria-disabled="true"' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                    <button type="button" class="cat-view-details-link" data-type="${escapeHtml(item.type)}" aria-label="View details for ${name}">
                        View Details →
                    </button>
                    <label class="cat-compare-check" aria-label="Add ${name} to comparison">
                        <input type="checkbox" class="cat-compare-input" data-type="${escapeHtml(item.type)}" ${this._compareSet.has(item.type) ? 'checked' : ''} />
                        Compare
                    </label>
                </div>
            </article>
        `;
    }

    /**
     * Render a single bundle card
     * @param {Object} bundle - Bundle from BUNDLES
     * @returns {string} HTML string
     * @private
     */
    _renderBundleCard(bundle) {
        const iconSvg = FURNITURE_ICONS[bundle.image] || FURNITURE_ICONS['chair'];
        const price = getBundlePrice(bundle, furnitureCatalogue);
        const priceStr = `$${Number(price).toLocaleString('en-US')}`;

        // Unique item names with counts
        const itemCounts = {};
        bundle.items.forEach(type => { itemCounts[type] = (itemCounts[type] || 0) + 1; });
        const itemListHtml = Object.entries(itemCounts).map(([type, count]) => {
            const cat = furnitureCatalogue.find(c => c.type === type);
            const label = cat ? cat.label : type;
            return `<li>${count > 1 ? `${count}× ` : ''}${escapeHtml(label)}</li>`;
        }).join('');

        return `
            <div class="cat-bundle-card">
                <span class="cat-bundle-tag" style="background-color: ${escapeHtml(bundle.tagColour)}18; color: ${escapeHtml(bundle.tagColour)}">${escapeHtml(bundle.tag)}</span>
                <div class="cat-bundle-icon" aria-hidden="true">${iconSvg}</div>
                <h3 class="cat-bundle-title">${escapeHtml(bundle.name)}</h3>
                <p class="cat-bundle-desc">${escapeHtml(bundle.description)}</p>
                <ul class="cat-bundle-items">${itemListHtml}</ul>
                <div class="cat-bundle-price">${priceStr}</div>
                <button type="button" class="cat-bundle-add-btn" data-bundle-id="${escapeHtml(bundle.id)}">
                    Add Bundle to Cart
                </button>
            </div>
        `;
    }

    /**
     * Render the empty state when no items match search/filter
     * @param {string} [query=''] - The search query that produced no results
     * @returns {string} HTML string
     * @private
     */
    _renderEmptyState(query = '') {
        if (query) {
            return `
                <div class="cat-empty cat-empty-search">
                    <h3 class="cat-empty-search__title">No results for "${escapeHtml(query)}"</h3>
                    <p class="cat-empty-search__sub">Try a different search term or select another category.</p>
                </div>
            `;
        }
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

        // ── Header search input ──
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

        // Bundle add-to-cart buttons
        this.container.querySelectorAll('.cat-bundle-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bundleId = btn.dataset.bundleId;
                const bundle = BUNDLES.find(b => b.id === bundleId);
                if (!bundle) return;
                bundle.items.forEach(type => {
                    const catalogueItem = furnitureCatalogue.find(c => c.type === type);
                    const price = catalogueItem ? catalogueItem.price : 0;
                    this.onAddToCart(type, price);
                });
                Toast.success('Bundle added to cart!');
                const newCount = this._cartCount + bundle.items.length;
                this.updateCartCount(newCount);
            });
        });

        // Compare bar buttons
        const compareBarBtn = this.container.querySelector('#cat-compare-bar-btn');
        const compareBarClear = this.container.querySelector('#cat-compare-bar-clear');
        compareBarBtn?.addEventListener('click', () => this._openCompareModal());
        compareBarClear?.addEventListener('click', () => {
            this._compareSet.clear();
            this._updateCompareBar();
            // Uncheck all compare checkboxes
            this.container.querySelectorAll('.cat-compare-input').forEach(cb => { cb.checked = false; });
        });

        // Product card actions (event delegation on grid)
        const grid = this.container.querySelector('#cat-grid');
        if (grid) {
            grid.addEventListener('click', (event) => {
                // Add to Cart
                const addBtn = event.target.closest('.cat-add-btn');
                if (addBtn && !addBtn.disabled) {
                    const type = addBtn.dataset.type;
                    const price = Number(addBtn.dataset.price) || 0;
                    this.onAddToCart(type, price);
                    return;
                }

                // Use in Design
                const useBtn = event.target.closest('.cat-use-btn');
                if (useBtn) {
                    const type = useBtn.dataset.type;
                    this.onUseInDesign(type);
                    return;
                }

                // View Details link
                const viewBtn = event.target.closest('.cat-view-details-link');
                if (viewBtn) {
                    const type = viewBtn.dataset.type;
                    this.onViewProduct(type);
                    return;
                }

                // Compare checkbox
                const compareInput = event.target.closest('.cat-compare-input');
                if (compareInput) {
                    const type = compareInput.dataset.type;
                    if (compareInput.checked) {
                        if (this._compareSet.size >= 2) {
                            compareInput.checked = false;
                            Toast.error('You can compare up to 2 items');
                            return;
                        }
                        this._compareSet.add(type);
                    } else {
                        this._compareSet.delete(type);
                    }
                    this._updateCompareBar();
                    return;
                }

                // Wishlist heart toggle
                const wishBtn = event.target.closest('.cat-wishlist-btn');
                if (wishBtn) {
                    const type = wishBtn.dataset.type;
                    const currentlyIn = wishBtn.dataset.inWishlist === 'true';
                    // Optimistic UI toggle
                    const newState = !currentlyIn;
                    wishBtn.dataset.inWishlist = newState ? 'true' : 'false';
                    wishBtn.setAttribute('aria-label', newState ? 'Remove from wishlist' : 'Add to wishlist');
                    wishBtn.setAttribute('title', newState ? 'Remove from wishlist' : 'Save to wishlist');
                    if (newState) {
                        this.wishlistItems.add(type);
                    } else {
                        this.wishlistItems.delete(type);
                    }
                    // Notify parent; parent may call updateWishlist() to confirm/correct
                    this.onToggleWishlist(type);
                    return;
                }
            });
        }
    }

    /**
     * Update compare bar state
     * @private
     */
    _updateCompareBar() {
        const bar = this.container?.querySelector('#cat-compare-bar');
        const text = this.container?.querySelector('#cat-compare-bar-text');
        if (!bar) return;
        if (this._compareSet.size > 0) {
            bar.style.display = 'flex';
            const names = Array.from(this._compareSet).map(type => {
                const item = furnitureCatalogue.find(c => c.type === type);
                return item ? item.label : type;
            });
            text.textContent = `Comparing: ${names.join(' vs ')}`;
        } else {
            bar.style.display = 'none';
        }
    }

    /**
     * Open the comparison modal for up to 2 selected items
     * @private
     */
    _openCompareModal() {
        const types = Array.from(this._compareSet);
        const items = types.map(t => furnitureCatalogue.find(c => c.type === t)).filter(Boolean);
        if (items.length < 2) {
            Toast.error('Select 2 items to compare');
            return;
        }

        const [a, b] = items;
        const rows = [
            ['Name', escapeHtml(a.label), escapeHtml(b.label)],
            ['Price', `$${Number(a.price).toLocaleString('en-US')}`, `$${Number(b.price).toLocaleString('en-US')}`],
            ['Dimensions', `${a.defaultWidth}m × ${a.defaultDepth}m × ${a.defaultHeight}m`, `${b.defaultWidth}m × ${b.defaultDepth}m × ${b.defaultHeight}m`],
            ['Rating', a.rating != null ? `${a.rating} ★ (${a.reviewCount || 0})` : '—', b.rating != null ? `${b.rating} ★ (${b.reviewCount || 0})` : '—'],
            ['Stock', a.stock != null ? String(a.stock) : '—', b.stock != null ? String(b.stock) : '—'],
            ['Lead Time', escapeHtml(a.leadTime || '—'), escapeHtml(b.leadTime || '—')],
            ['Description', escapeHtml(a.description || '—'), escapeHtml(b.description || '—')]
        ];

        const rowsHtml = rows.map(([label, va, vb]) => `
            <tr>
                <td>${label}</td>
                <td>${va}</td>
                <td>${vb}</td>
            </tr>
        `).join('');

        const overlay = document.createElement('div');
        overlay.className = 'cat-compare-modal-overlay';
        overlay.innerHTML = `
            <div class="cat-compare-modal" role="dialog" aria-modal="true" aria-label="Product comparison">
                <button class="cat-compare-modal__close" aria-label="Close comparison">✕</button>
                <h2 class="cat-compare-modal__title">Product Comparison</h2>
                <table class="cat-compare-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>${escapeHtml(a.label)}</th>
                            <th>${escapeHtml(b.label)}</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.cat-compare-modal__close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
        });
    }

    /**
     * Refresh just the grid and results count without full re-render.
     * Operates on the DOM by re-rendering matched items.
     * @private
     */
    _refreshGrid() {
        const items = this._getFilteredItems();
        const grid = this.container?.querySelector('#cat-grid');
        const count = this.container?.querySelector('#cat-results-count');

        if (grid) {
            if (items.length > 0) {
                grid.innerHTML = items.map(item => this._renderProductCard(item)).join('');
            } else {
                grid.innerHTML = this._renderEmptyState(this._searchQuery);
            }
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
     * Update the wishlist heart icon for a specific furniture type
     * without re-rendering the entire page.
     * Called externally after a toggle is confirmed/rejected by the server.
     * @param {string} type - Furniture type ID
     * @param {boolean} inWishlist - Whether the item is now in the wishlist
     */
    updateWishlist(type, inWishlist) {
        if (!this.container) return;
        const btn = this.container.querySelector(`.cat-wishlist-btn[data-type="${CSS.escape(type)}"]`);
        if (!btn) return;

        btn.dataset.inWishlist = inWishlist ? 'true' : 'false';
        btn.setAttribute('aria-label', inWishlist ? 'Remove from wishlist' : 'Add to wishlist');
        btn.setAttribute('title', inWishlist ? 'Remove from wishlist' : 'Save to wishlist');

        // Keep internal set in sync
        if (inWishlist) {
            this.wishlistItems.add(type);
        } else {
            this.wishlistItems.delete(type);
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
