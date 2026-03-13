/**
 * FurnishView — Order History View
 *
 * Displays a user's past orders as expandable cards with full order detail,
 * delivery address, item breakdown, order total summary, and a visual status
 * progress tracker. Handles empty-state gracefully.
 *
 * Layout:
 *  - Header: Back button, "My Orders" title, cart count badge
 *  - Empty state: SVG illustration + "No orders yet" + "Start Shopping" CTA
 *  - Order cards (expandable):
 *      Collapsed — order ID pill, date, total, status badge, chevron
 *      Expanded  — items list, delivery address, total breakdown, progress tracker
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility of system status (status badge + progress tracker)
 *  - #3 User control and freedom (back, start shopping)
 *  - #4 Consistency and standards (same card/chip language as rest of app)
 *  - #8 Aesthetic and minimalist design (progressive disclosure via expand/collapse)
 *
 * @file js/views/OrderHistoryView.js
 * @module views/OrderHistoryView
 */

import { furnitureCatalogue } from '../data/furnitureCatalogue.js';

/** Delivery fee in USD (mirrors CartView constant) */
const DELIVERY_FEE = 49.99;

/** Free-delivery subtotal threshold in USD */
const FREE_DELIVERY_THRESHOLD = 500;

/** CSS style element ID — prevents duplicate injection */
const STYLES_ID = 'oh-styles';

/**
 * Escape HTML to prevent XSS.
 * @param {string} text
 * @returns {string}
 * @private
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format a price in USD.
 * @param {number} price
 * @returns {string} e.g. "$899.00"
 * @private
 */
function formatPrice(price) {
    return `$${Number(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Inject the order-history stylesheet once per page lifetime.
 * @private
 */
function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = `
/* ============================================================
   Order History View  —  oh- prefix
   ============================================================ */

.oh-view {
    min-height: 100vh;
    background: var(--bg, #F5F5F7);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    color: var(--text-primary, #1D1D1F);
}

/* ── Header ──────────────────────────────────────────────── */
.oh-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 60px;
    background: rgba(245, 245, 247, 0.85);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.oh-header__left,
.oh-header__right {
    display: flex;
    align-items: center;
    min-width: 120px;
}

.oh-header__right {
    justify-content: flex-end;
}

.oh-header__center {
    display: flex;
    align-items: center;
    gap: 8px;
}

.oh-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px 6px 8px;
    border: none;
    background: none;
    color: #5E5CE6;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
    white-space: nowrap;
}
.oh-back-btn:hover {
    background: rgba(94, 92, 230, 0.08);
}
.oh-back-btn svg { flex-shrink: 0; }

.oh-title {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: #1D1D1F;
}

.oh-cart-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    background: #5E5CE6;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 10px;
    line-height: 1;
}

/* ── Body wrapper ────────────────────────────────────────── */
.oh-body {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 20px 64px;
}

.oh-section-label {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #86868B;
    margin: 0 0 14px;
}

/* ── Empty state ─────────────────────────────────────────── */
.oh-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 24px;
    gap: 12px;
}

.oh-empty__icon {
    color: #C7C7CC;
    margin-bottom: 8px;
}

.oh-empty__title {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #1D1D1F;
}

.oh-empty__desc {
    margin: 0;
    font-size: 15px;
    color: #6E6E73;
    max-width: 280px;
    line-height: 1.5;
}

.oh-empty__cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 11px 22px;
    background: #5E5CE6;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
}
.oh-empty__cta:hover { opacity: 0.88; }
.oh-empty__cta:active { transform: scale(0.97); }

/* ── Order cards list ────────────────────────────────────── */
.oh-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ── Single order card ───────────────────────────────────── */
.oh-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    transition: box-shadow 0.2s;
}
.oh-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);
}

/* Card header row (always visible) */
.oh-card__header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}
.oh-card__header:focus-visible {
    outline: 2px solid #5E5CE6;
    outline-offset: -2px;
    border-radius: 12px;
}

.oh-card__id {
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', Menlo, monospace;
    font-size: 12px;
    font-weight: 600;
    color: #1D1D1F;
    background: #F2F2F7;
    padding: 3px 8px;
    border-radius: 6px;
    white-space: nowrap;
    letter-spacing: 0.02em;
    flex-shrink: 0;
}

.oh-card__meta {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
}

.oh-card__date {
    font-size: 13px;
    color: #6E6E73;
    white-space: nowrap;
}

.oh-card__total {
    font-size: 15px;
    font-weight: 600;
    color: #1D1D1F;
    white-space: nowrap;
}

/* Status badge chip */
.oh-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: capitalize;
    white-space: nowrap;
    flex-shrink: 0;
}

/* Colour variants set via inline style on the element */

/* Chevron */
.oh-card__chevron {
    flex-shrink: 0;
    color: #C7C7CC;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.oh-card--open .oh-card__chevron {
    transform: rotate(180deg);
}

/* Expanded body */
.oh-card__body {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.oh-card--open .oh-card__body {
    max-height: 1200px; /* generous ceiling */
}

.oh-card__inner {
    padding: 0 18px 20px;
    border-top: 1px solid #F2F2F7;
}

/* ── Progress tracker ────────────────────────────────────── */
.oh-progress {
    display: flex;
    align-items: flex-start;
    gap: 0;
    padding: 18px 0 20px;
}

.oh-progress__step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
}

/* Connector line between steps */
.oh-progress__step:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 12px;
    left: calc(50% + 12px);
    right: calc(-50% + 12px);
    height: 2px;
    background: #E5E5EA;
    border-radius: 1px;
    transition: background 0.3s;
    z-index: 0;
}
.oh-progress__step--done:not(:last-child)::after {
    background: #10B981;
}
.oh-progress__step--active:not(:last-child)::after {
    background: #E5E5EA;
}
.oh-progress__step--cancelled:not(:last-child)::after {
    background: #E5E5EA;
}

.oh-progress__dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    transition: background 0.2s, border-color 0.2s;
}

.oh-progress__step--pending .oh-progress__dot {
    background: #F2F2F7;
    border: 2px solid #E5E5EA;
    color: #C7C7CC;
}
.oh-progress__step--active .oh-progress__dot {
    background: #5E5CE6;
    border: 2px solid #5E5CE6;
    color: #fff;
}
.oh-progress__step--done .oh-progress__dot {
    background: #10B981;
    border: 2px solid #10B981;
    color: #fff;
}
.oh-progress__step--cancelled .oh-progress__dot {
    background: #F5F5F7;
    border: 2px solid #E5E5EA;
    color: #C7C7CC;
}

.oh-progress__label {
    font-size: 10px;
    font-weight: 500;
    text-align: center;
    line-height: 1.3;
    color: #86868B;
}
.oh-progress__step--done .oh-progress__label,
.oh-progress__step--active .oh-progress__label {
    color: #1D1D1F;
    font-weight: 600;
}
.oh-progress__step--cancelled .oh-progress__label {
    color: #C7C7CC;
}

/* ── Items list ──────────────────────────────────────────── */
.oh-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
}

.oh-items__heading {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #86868B;
    margin: 4px 0 6px;
}

.oh-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #F9F9FB;
    border-radius: 8px;
}

.oh-item__icon {
    flex-shrink: 0;
    color: #6E6E73;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.oh-item__label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #1D1D1F;
    min-width: 0;
}

.oh-item__qty {
    font-size: 13px;
    color: #6E6E73;
    white-space: nowrap;
}

.oh-item__unit {
    font-size: 13px;
    color: #6E6E73;
    white-space: nowrap;
}

.oh-item__line-total {
    font-size: 14px;
    font-weight: 600;
    color: #1D1D1F;
    white-space: nowrap;
    min-width: 64px;
    text-align: right;
}

/* ── Divider ─────────────────────────────────────────────── */
.oh-divider {
    height: 1px;
    background: #F2F2F7;
    margin: 16px 0;
}

/* ── Delivery address ────────────────────────────────────── */
.oh-delivery {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 18px;
}

.oh-delivery__icon {
    flex-shrink: 0;
    color: #86868B;
    margin-top: 1px;
}

.oh-delivery__detail {
    flex: 1;
}

.oh-delivery__name {
    font-size: 14px;
    font-weight: 600;
    color: #1D1D1F;
    margin: 0 0 2px;
}

.oh-delivery__lines {
    font-size: 13px;
    color: #6E6E73;
    line-height: 1.6;
    margin: 0;
}

/* ── Totals breakdown ────────────────────────────────────── */
.oh-totals {
    background: #F9F9FB;
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.oh-totals__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.oh-totals__row span:first-child {
    color: #6E6E73;
}

.oh-totals__row span:last-child {
    font-weight: 500;
    color: #1D1D1F;
}

.oh-totals__divider {
    height: 1px;
    background: #E5E5EA;
    margin: 4px 0;
}

.oh-totals__row--grand {
    font-size: 15px;
}

.oh-totals__row--grand span:first-child {
    font-weight: 600;
    color: #1D1D1F;
}

.oh-totals__row--grand span:last-child {
    font-weight: 700;
    color: #1D1D1F;
}

.oh-free-delivery {
    color: #10B981;
    font-weight: 600;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 480px) {
    .oh-header {
        padding: 0 16px;
    }
    .oh-body {
        padding: 20px 12px 48px;
    }
    .oh-card__meta {
        gap: 6px;
    }
    .oh-card__total {
        font-size: 14px;
    }
    .oh-item__unit {
        display: none;
    }
}
`;
    document.head.appendChild(style);
}

/**
 * Compact 24×24 SVG icons for furniture types in the order line items.
 * Keyed by the `icon` field on each catalogue entry.
 * @type {Object<string, string>}
 * @private
 */
const OH_ICONS = {
    chair:          `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4H5v-4z"/><path d="M19 15v5M5 15v5"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/></svg>`,
    table:          `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="3" rx="1"/><path d="M4 10v10M20 10v10"/></svg>`,
    'table-sm':     `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="2" rx="1"/><path d="M7 10v9M17 10v9"/></svg>`,
    sofa:           `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M4 19v2M20 19v2"/></svg>`,
    armchair:       `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9V7a5 5 0 0 0-10 0v2"/><path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a3 3 0 0 0-6 0H9a3 3 0 0 0-6 0z"/><path d="M5 19v2M19 19v2"/></svg>`,
    'coffee-table': `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="2" rx="1"/><path d="M5 12v6M19 12v6"/><path d="M3 18h18"/></svg>`,
    bookshelf:      `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="10" y1="2" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="14"/></svg>`,
    desk:           `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="3" rx="1"/><path d="M4 9v10M20 9v10"/><rect x="13" y="9" width="5" height="6" rx="0.5"/></svg>`,
    'tv-stand':     `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6M18 8V6"/><rect x="4" y="10" width="7" height="4" rx="0.5"/></svg>`,
    bed:            `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    wardrobe:       `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="9" cy="12" r="0.5" fill="currentColor"/><circle cx="15" cy="12" r="0.5" fill="currentColor"/></svg>`,
    rug:            `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M18 6v12"/><path d="M2 12h20"/></svg>`
};

/** Fallback icon when the type has no matching entry */
const OH_ICON_FALLBACK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/></svg>`;

/**
 * Build a lookup map from the catalogue for O(1) label/icon resolution.
 * @type {Map<string, {label: string, icon: string}>}
 * @private
 */
const CATALOGUE_MAP = new Map(
    furnitureCatalogue.map(entry => [entry.type, { label: entry.label, icon: entry.icon }])
);

/**
 * OrderHistoryView
 *
 * Renders a full-page order history screen into a given container element.
 * The view is entirely self-contained: it injects its own CSS on first use,
 * manages expand/collapse state, and exposes a simple `destroy()` teardown.
 */
class OrderHistoryView {
    /**
     * @param {Object}   [options]
     * @param {Function} [options.onBack]             - Navigate back (e.g., to dashboard)
     * @param {Function} [options.onContinueShopping] - Navigate to catalogue
     */
    constructor({ onBack = () => {}, onContinueShopping = () => {} } = {}) {
        this.onBack = onBack;
        this.onContinueShopping = onContinueShopping;

        /** @type {HTMLElement|null} */
        this.container = null;

        /**
         * Tracks which order card IDs are currently expanded.
         * @type {Set<string>}
         * @private
         */
        this._expanded = new Set();

        /**
         * Bound delegated click handler — stored so it can be removed on destroy.
         * @type {Function|null}
         * @private
         */
        this._clickHandler = null;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Render (or re-render) the view into `container`.
     *
     * @param {HTMLElement} container  - Host element; its innerHTML will be replaced
     * @param {Array<Object>} orders   - Order objects from `getOrders(username)`
     * @param {Object} [options]
     * @param {string} [options.username='']   - Current user's display name
     * @param {number} [options.cartCount=0]   - Items in cart for the badge
     */
    render(container, orders = [], { username = '', cartCount = 0 } = {}) {
        if (!container) return;

        injectStyles();

        this.container = container;
        this._expanded.clear();

        const safeOrders = Array.isArray(orders) ? orders : [];

        container.innerHTML = this._buildHTML(safeOrders, username, cartCount);
        this._attachEventListeners();
    }

    /**
     * Clean up event listeners and release DOM references.
     */
    destroy() {
        if (this.container && this._clickHandler) {
            this.container.removeEventListener('click', this._clickHandler);
        }
        this.container = null;
        this._clickHandler = null;
        this._expanded.clear();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private — HTML builders
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Build the complete view HTML string.
     * @param {Array<Object>} orders
     * @param {string} username
     * @param {number} cartCount
     * @returns {string}
     * @private
     */
    _buildHTML(orders, username, cartCount) {
        const hasOrders = orders.length > 0;

        return `
<div class="oh-view">
    <!-- Header -->
    <header class="oh-header">
        <div class="oh-header__left">
            <button type="button" class="oh-back-btn" id="oh-back-btn" aria-label="Go back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
            </button>
        </div>
        <div class="oh-header__center">
            <h1 class="oh-title">My Orders</h1>
            ${cartCount > 0 ? `<span class="oh-cart-badge" aria-label="${cartCount} items in cart">${cartCount > 99 ? '99+' : cartCount}</span>` : ''}
        </div>
        <div class="oh-header__right"></div>
    </header>

    <!-- Body -->
    <main class="oh-body">
        ${hasOrders ? this._renderOrders(orders) : this._renderEmptyState()}
    </main>
</div>
        `.trim();
    }

    /**
     * Build the order list section.
     * @param {Array<Object>} orders
     * @returns {string}
     * @private
     */
    _renderOrders(orders) {
        return `
<p class="oh-section-label">${orders.length} ${orders.length === 1 ? 'order' : 'orders'}</p>
<div class="oh-list" role="list">
    ${orders.map(order => this._renderOrderCard(order)).join('')}
</div>
        `.trim();
    }

    /**
     * Build HTML for a single expandable order card.
     * @param {Object} order
     * @returns {string}
     * @private
     */
    _renderOrderCard(order) {
        const safeId      = escapeHtml(order.orderId || 'Unknown');
        const dateLabel   = this._formatDate(order.createdAt);
        const totalLabel  = formatPrice(order.total || 0);
        const status      = order.status || 'confirmed';
        const statusCfg   = this._statusConfig(status);

        const statusBadge = `
<span class="oh-status"
      style="background-color: ${statusCfg.colour}22; color: ${statusCfg.colour};"
      aria-label="Status: ${statusCfg.label}">
    ${statusCfg.icon}
    ${escapeHtml(statusCfg.label)}
</span>`.trim();

        const chevron = `
<svg class="oh-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
</svg>`.trim();

        return `
<article class="oh-card" role="listitem" data-order-id="${safeId}">
    <div class="oh-card__header"
         role="button"
         tabindex="0"
         aria-expanded="false"
         aria-controls="oh-body-${safeId}"
         data-toggle-card="${safeId}">
        <span class="oh-card__id">${safeId}</span>
        <div class="oh-card__meta">
            <span class="oh-card__date">${escapeHtml(dateLabel)}</span>
            <span class="oh-card__total">${escapeHtml(totalLabel)}</span>
            ${statusBadge}
        </div>
        ${chevron}
    </div>
    <div class="oh-card__body" id="oh-body-${safeId}" role="region" aria-label="Details for order ${safeId}">
        <div class="oh-card__inner">
            ${this._renderProgressTracker(status)}
            ${this._renderItemsList(order.items || [])}
            <div class="oh-divider"></div>
            ${this._renderDelivery(order.delivery || {})}
            ${this._renderTotals(order)}
        </div>
    </div>
</article>
        `.trim();
    }

    /**
     * Build the 4-step horizontal progress tracker.
     *
     * Steps: Confirmed → Processing → Shipped → Delivered
     * Cancelled orders show all steps greyed out with an X icon.
     *
     * @param {string} status
     * @returns {string}
     * @private
     */
    _renderProgressTracker(status) {
        const STEPS = [
            { key: 'confirmed',  label: 'Confirmed' },
            { key: 'processing', label: 'Processing' },
            { key: 'shipped',    label: 'Shipped' },
            { key: 'delivered',  label: 'Delivered' }
        ];

        const ORDER = ['confirmed', 'processing', 'shipped', 'delivered'];
        const currentIndex = ORDER.indexOf(status);
        const isCancelled  = status === 'cancelled';

        const stepHTML = STEPS.map((step, idx) => {
            let stepClass;
            let dotContent;

            if (isCancelled) {
                stepClass  = 'oh-progress__step--cancelled';
                dotContent = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
            } else if (idx < currentIndex) {
                // Completed step
                stepClass  = 'oh-progress__step--done';
                dotContent = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            } else if (idx === currentIndex) {
                // Active/current step
                stepClass  = 'oh-progress__step--active';
                dotContent = `<span style="width:8px;height:8px;border-radius:50%;background:currentColor;display:block;"></span>`;
            } else {
                // Future step
                stepClass  = 'oh-progress__step--pending';
                dotContent = `<span style="width:6px;height:6px;border-radius:50%;background:#C7C7CC;display:block;"></span>`;
            }

            return `
<div class="oh-progress__step ${escapeHtml(stepClass)}">
    <div class="oh-progress__dot">${dotContent}</div>
    <span class="oh-progress__label">${escapeHtml(step.label)}</span>
</div>
            `.trim();
        }).join('\n');

        return `<div class="oh-progress" role="list" aria-label="Order progress">${stepHTML}</div>`;
    }

    /**
     * Build the items list for the expanded card body.
     * @param {Array<{type: string, quantity: number, price: number}>} items
     * @returns {string}
     * @private
     */
    _renderItemsList(items) {
        if (!items.length) {
            return `<p class="oh-items__heading" style="margin:0 0 16px;">No items on record.</p>`;
        }

        const rows = items.map(item => {
            const label     = escapeHtml(this._getFurnitureLabel(item.type));
            const catalogEntry = CATALOGUE_MAP.get(item.type);
            const iconKey   = catalogEntry ? catalogEntry.icon : item.type;
            const iconSvg   = OH_ICONS[iconKey] || OH_ICON_FALLBACK;
            const qty       = Number(item.quantity) || 1;
            const unitPrice = Number(item.price)    || 0;
            const lineTotal = qty * unitPrice;

            return `
<div class="oh-item">
    <span class="oh-item__icon" aria-hidden="true">${iconSvg}</span>
    <span class="oh-item__label">${label}</span>
    <span class="oh-item__qty">×&thinsp;${qty}</span>
    <span class="oh-item__unit">${escapeHtml(formatPrice(unitPrice))} ea</span>
    <span class="oh-item__line-total">${escapeHtml(formatPrice(lineTotal))}</span>
</div>
            `.trim();
        }).join('\n');

        return `
<div class="oh-items">
    <p class="oh-items__heading">Items ordered</p>
    ${rows}
</div>
        `.trim();
    }

    /**
     * Build the delivery address block.
     * @param {Object} delivery
     * @returns {string}
     * @private
     */
    _renderDelivery(delivery) {
        const name     = escapeHtml(delivery.fullName  || '—');
        const address  = escapeHtml(delivery.address   || '');
        const city     = escapeHtml(delivery.city      || '');
        const postcode = escapeHtml(delivery.postcode  || '');
        const phone    = escapeHtml(delivery.phone     || '');
        const email    = escapeHtml(delivery.email     || '');

        const cityLine = [city, postcode].filter(Boolean).join(', ');

        return `
<div class="oh-delivery">
    <span class="oh-delivery__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
    </span>
    <div class="oh-delivery__detail">
        <p class="oh-delivery__name">${name}</p>
        <p class="oh-delivery__lines">
            ${[address, cityLine, phone, email].filter(Boolean).join('<br>')}
        </p>
    </div>
</div>
        `.trim();
    }

    /**
     * Build the order totals breakdown panel.
     * @param {Object} order
     * @returns {string}
     * @private
     */
    _renderTotals(order) {
        const items    = Array.isArray(order.items) ? order.items : [];
        const subtotal = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
        const grand    = Number(order.total) || subtotal;

        // Infer whether delivery was charged
        const impliedDelivery = grand - subtotal;
        const deliveryCharged = impliedDelivery > 0.005; // float tolerance

        const deliveryCell = deliveryCharged
            ? escapeHtml(formatPrice(impliedDelivery))
            : `<span class="oh-free-delivery">Free</span>`;

        return `
<div class="oh-totals">
    <div class="oh-totals__row">
        <span>Subtotal</span>
        <span>${escapeHtml(formatPrice(subtotal))}</span>
    </div>
    <div class="oh-totals__row">
        <span>Delivery</span>
        <span>${deliveryCell}</span>
    </div>
    <div class="oh-totals__divider"></div>
    <div class="oh-totals__row oh-totals__row--grand">
        <span>Total</span>
        <span>${escapeHtml(formatPrice(grand))}</span>
    </div>
</div>
        `.trim();
    }

    /**
     * Build the empty state illustration and call-to-action.
     * @returns {string}
     * @private
     */
    _renderEmptyState() {
        return `
<div class="oh-empty">
    <div class="oh-empty__icon" aria-hidden="true">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Box body -->
            <rect x="10" y="28" width="52" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/>
            <!-- Box lid -->
            <path d="M6 28h60" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Lid flaps -->
            <path d="M36 10v18M20 10l4 18M52 10l-4 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Tape stripe -->
            <path d="M10 44h52" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
            <!-- Stars / sparkle -->
            <circle cx="56" cy="20" r="2" fill="currentColor" opacity="0.3"/>
            <circle cx="62" cy="14" r="1.2" fill="currentColor" opacity="0.2"/>
            <circle cx="14" cy="18" r="1.5" fill="currentColor" opacity="0.25"/>
        </svg>
    </div>
    <h3 class="oh-empty__title">No orders yet</h3>
    <p class="oh-empty__desc">When you place an order it will appear here, ready to track.</p>
    <button type="button" class="oh-empty__cta" id="oh-start-shopping-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        Start Shopping
    </button>
</div>
        `.trim();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private — status helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Map a status string to a display config object.
     *
     * @param {string} status - One of: confirmed | processing | shipped | delivered | cancelled
     * @returns {{ label: string, colour: string, icon: string }}
     */
    _statusConfig(status) {
        const configs = {
            confirmed: {
                label:  'Confirmed',
                colour: '#5E5CE6',
                icon:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            },
            processing: {
                label:  'Processing',
                colour: '#F59E0B',
                icon:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`
            },
            shipped: {
                label:  'Shipped',
                colour: '#3B82F6',
                icon:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
            },
            delivered: {
                label:  'Delivered',
                colour: '#10B981',
                icon:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            },
            cancelled: {
                label:  'Cancelled',
                colour: '#EF4444',
                icon:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
            }
        };

        return configs[status] || configs.confirmed;
    }

    /**
     * Format an ISO 8601 date string into "12 Mar 2026".
     * Falls back gracefully on invalid input.
     *
     * @param {string} isoString
     * @returns {string}
     */
    _formatDate(isoString) {
        if (!isoString) return '—';
        try {
            return new Date(isoString).toLocaleDateString('en-GB', {
                day:   'numeric',
                month: 'short',
                year:  'numeric'
            });
        } catch {
            return '—';
        }
    }

    /**
     * Look up the human-readable label for a furniture type.
     *
     * @param {string} type - Furniture type ID (e.g. 'sofa')
     * @returns {string} Display label (e.g. 'Sofa'), or the raw type if unknown
     */
    _getFurnitureLabel(type) {
        const entry = CATALOGUE_MAP.get(type);
        return entry ? entry.label : (type || 'Item');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private — event handling
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Attach all DOM event listeners using a single delegated handler.
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;

        // Back button
        this.container.querySelector('#oh-back-btn')
            ?.addEventListener('click', () => this.onBack());

        // "Start Shopping" in empty state
        this.container.querySelector('#oh-start-shopping-btn')
            ?.addEventListener('click', () => this.onContinueShopping());

        // Delegated handler for card expand/collapse and keyboard activation
        this._clickHandler = (event) => {
            // Support both mouse click and keyboard (Enter / Space)
            const trigger = event.target.closest('[data-toggle-card]');
            if (!trigger) return;

            if (
                event.type === 'keydown' &&
                event.key !== 'Enter' &&
                event.key !== ' '
            ) return;

            if (event.type === 'keydown') event.preventDefault();

            const orderId = trigger.dataset.toggleCard;
            this._toggleCard(orderId, trigger);
        };

        this.container.addEventListener('click',   this._clickHandler);
        this.container.addEventListener('keydown', this._clickHandler);
    }

    /**
     * Toggle the expanded/collapsed state of one order card.
     *
     * Uses CSS max-height animation driven by the `oh-card--open` class,
     * and updates aria-expanded for accessibility.
     *
     * @param {string}      orderId - The order ID used as the data attribute
     * @param {HTMLElement} trigger - The header element that was activated
     * @private
     */
    _toggleCard(orderId, trigger) {
        const card = this.container.querySelector(`.oh-card[data-order-id="${CSS.escape(orderId)}"]`);
        if (!card) return;

        const isOpen = this._expanded.has(orderId);

        if (isOpen) {
            this._expanded.delete(orderId);
            card.classList.remove('oh-card--open');
            trigger.setAttribute('aria-expanded', 'false');
        } else {
            this._expanded.add(orderId);
            card.classList.add('oh-card--open');
            trigger.setAttribute('aria-expanded', 'true');
        }
    }
}

export { OrderHistoryView };
export default OrderHistoryView;
