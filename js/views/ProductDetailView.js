/**
 * FurnishView — Product Detail View
 *
 * Full-page product detail view for a single furniture item.
 * Displays hero section with large illustration, colour swatches, pricing,
 * stock status, and a tabbed details section covering product info,
 * dimensions, and materials. Also includes a related items carousel.
 *
 * Layout:
 *  - Top bar: back arrow + breadcrumb + cart count badge
 *  - Hero: two-column (large SVG illustration LEFT, product info RIGHT)
 *  - Tabs: Details / Dimensions / Materials
 *  - Related items: horizontal scroll of same-category products
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility (stock chip, cart badge, active tab, selected swatch ring)
 *  - #3 User control (back button, tab navigation, colour selection)
 *  - #4 Consistency (same visual language as CatalogueView)
 *  - #6 Recognition over recall (breadcrumb, visual swatch labels on hover)
 *  - #8 Aesthetic and minimalist design (premium card layout, clean typography)
 *
 * @file js/views/ProductDetailView.js
 * @module views/ProductDetailView
 */

import { furnitureCatalogue, getFurnitureByType } from '../data/furnitureCatalogue.js';

// ---------------------------------------------------------------------------
// Style ID — only inject once per page session
// ---------------------------------------------------------------------------
const STYLE_ID = 'pd-styles';

// ---------------------------------------------------------------------------
// CSS — full scoped stylesheet for the product detail view
// ---------------------------------------------------------------------------
const PD_CSS = `
/* ---- Product Detail: Layout ---- */
.pd-page {
    min-height: 100vh;
    background: var(--bg);
    font-family: var(--font-sans);
    color: var(--text);
    display: flex;
    flex-direction: column;
    animation: pd-fade-in 0.25s ease;
}
@keyframes pd-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ---- Top Bar ---- */
.pd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 32px;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
}
.pd-topbar__left {
    display: flex;
    align-items: center;
    gap: 16px;
}
.pd-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text);
    cursor: pointer;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
    white-space: nowrap;
}
.pd-back-btn:hover {
    background: var(--bg);
    box-shadow: var(--shadow-sm);
}
.pd-breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
}
.pd-breadcrumb__sep {
    color: var(--text-muted);
}
.pd-breadcrumb__current {
    color: var(--text);
    font-weight: 500;
}
.pd-cart-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
    color: var(--text);
}
.pd-cart-btn:hover {
    background: var(--bg);
    box-shadow: var(--shadow-sm);
}
.pd-cart-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    background: #4F46E5;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid var(--surface);
    line-height: 1;
}

/* ---- Hero Section ---- */
.pd-hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    max-width: 1100px;
    width: 100%;
    margin: 40px auto 0;
    padding: 0 32px;
    align-items: start;
}
@media (max-width: 768px) {
    .pd-hero {
        grid-template-columns: 1fr;
        gap: 28px;
        padding: 0 16px;
        margin-top: 24px;
    }
}

/* ---- Hero: Illustration Card ---- */
.pd-illustration-card {
    background: linear-gradient(145deg, #F0F4FF 0%, #FAF5FF 50%, #FFF7ED 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 360px;
    padding: 40px;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
}
.pd-illustration-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 70%, rgba(99,102,241,0.08) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 30%, rgba(168,85,247,0.06) 0%, transparent 60%);
    pointer-events: none;
}
.pd-hero-svg {
    transition: fill 0.3s ease;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 12px 24px rgba(0,0,0,0.14));
}

/* ---- Hero: Product Info ---- */
.pd-product-info {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 8px;
}
.pd-sku-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    width: fit-content;
}
.pd-product-name {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.15;
    color: var(--text);
    margin: 0;
}
.pd-rating-row {
    display: flex;
    align-items: center;
    gap: 8px;
}
.pd-stars {
    display: flex;
    align-items: center;
    gap: 1px;
    font-size: 18px;
    line-height: 1;
    color: #F59E0B;
}
.pd-rating-score {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
}
.pd-review-count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}
.pd-price-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
}
.pd-price {
    font-size: 36px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1;
}
.pd-stock-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
}
.pd-stock-chip--in {
    background: var(--success-light);
    color: var(--success);
}
.pd-stock-chip--low {
    background: var(--warning-light);
    color: var(--warning);
}
.pd-stock-chip--out {
    background: var(--danger-light);
    color: var(--danger);
}
.pd-stock-chip__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
}

/* ---- Colour Swatches ---- */
.pd-swatches-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.pd-swatches-label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
}
.pd-swatches-label span {
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 4px;
}
.pd-swatches-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.pd-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--border);
    cursor: pointer;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    position: relative;
    flex-shrink: 0;
}
.pd-swatch:hover {
    transform: scale(1.12);
    box-shadow: var(--shadow-md);
}
.pd-swatch--selected {
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.2);
}
.pd-swatch-tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--text);
    color: var(--text-inverse);
    font-size: 10px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: 10;
}
.pd-swatch:hover .pd-swatch-tooltip {
    opacity: 1;
}

/* ---- Action Buttons ---- */
.pd-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}
.pd-btn-cart {
    flex: 1;
    min-width: 160px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    background: #4F46E5;
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
    box-shadow: 0 2px 8px rgba(79,70,229,0.28);
}
.pd-btn-cart:hover:not(:disabled) {
    background: #4338CA;
    box-shadow: 0 4px 16px rgba(79,70,229,0.36);
    transform: translateY(-1px);
}
.pd-btn-cart:active:not(:disabled) {
    transform: translateY(0);
}
.pd-btn-cart:disabled {
    background: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
}
.pd-btn-wishlist {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: var(--surface);
    color: var(--text);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
    white-space: nowrap;
}
.pd-btn-wishlist:hover {
    border-color: #E11D48;
    color: #E11D48;
    background: #FFF1F2;
}
.pd-btn-wishlist--active {
    border-color: #E11D48;
    color: #E11D48;
    background: #FFF1F2;
}
.pd-btn-wishlist--active .pd-heart-icon path {
    fill: #E11D48;
    stroke: #E11D48;
}
.pd-btn-design {
    flex: 1;
    min-width: 160px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    background: var(--surface);
    color: var(--text);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}
.pd-btn-design:hover {
    border-color: #4F46E5;
    color: #4F46E5;
    background: #EEF2FF;
}

/* ---- Tabs Section ---- */
.pd-tabs-section {
    max-width: 1100px;
    width: 100%;
    margin: 40px auto 0;
    padding: 0 32px;
}
@media (max-width: 768px) {
    .pd-tabs-section {
        padding: 0 16px;
    }
}
.pd-tabs-nav {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
}
.pd-tab-btn {
    padding: 12px 24px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--transition-fast), border-color var(--transition-fast);
    margin-bottom: -1px;
    white-space: nowrap;
}
.pd-tab-btn:hover {
    color: var(--text);
}
.pd-tab-btn--active {
    color: #4F46E5;
    border-bottom-color: #4F46E5;
}
.pd-tab-panel {
    display: none;
    padding: 28px 0;
    animation: pd-tab-in 0.18s ease;
}
.pd-tab-panel--active {
    display: block;
}
@keyframes pd-tab-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ---- Details Tab ---- */
.pd-details-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 620px;
}
.pd-description {
    font-size: var(--text-base);
    line-height: var(--leading-relaxed);
    color: var(--text-secondary);
    margin: 0;
}
.pd-meta-chips {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.pd-meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--text-secondary);
}
.pd-meta-chip strong {
    color: var(--text);
    font-weight: 600;
}

/* ---- Dimensions Tab ---- */
.pd-dims-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: start;
}
@media (max-width: 600px) {
    .pd-dims-content {
        grid-template-columns: 1fr;
        gap: 24px;
    }
}
.pd-dims-diagram {
    background: linear-gradient(135deg, #F8FAFF 0%, #FDF8FF 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
}
.pd-dims-table {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
}
.pd-dims-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    font-size: var(--text-sm);
}
.pd-dims-row:last-child {
    border-bottom: none;
}
.pd-dims-row:nth-child(even) {
    background: var(--bg);
}
.pd-dims-label {
    color: var(--text-secondary);
    font-weight: 500;
}
.pd-dims-value {
    color: var(--text);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

/* ---- Materials Tab ---- */
.pd-materials-content {
    max-width: 560px;
}
.pd-materials-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.pd-material-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--text);
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition-fast);
}
.pd-material-item:hover {
    box-shadow: var(--shadow);
}
.pd-material-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4F46E5;
    flex-shrink: 0;
    margin-top: 5px;
}

/* ---- Related Items ---- */
.pd-related-section {
    max-width: 1100px;
    width: 100%;
    margin: 40px auto;
    padding: 0 32px;
}
@media (max-width: 768px) {
    .pd-related-section {
        padding: 0 16px;
    }
}
.pd-related-heading {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--text);
    margin: 0 0 20px 0;
    letter-spacing: -0.2px;
}
.pd-related-scroll {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
}
.pd-related-scroll::-webkit-scrollbar {
    height: 4px;
}
.pd-related-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.pd-related-scroll::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
}
.pd-related-card {
    flex-shrink: 0;
    width: 200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition), transform var(--transition);
    display: flex;
    flex-direction: column;
}
.pd-related-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}
.pd-related-card__img {
    background: linear-gradient(135deg, #F0F4FF 0%, #FDF8FF 100%);
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
}
.pd-related-card__body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
}
.pd-related-card__name {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.pd-related-card__price {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
}
.pd-related-card__btn {
    margin-top: auto;
    padding: 7px 0;
    background: none;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
    width: 100%;
}
.pd-related-card__btn:hover {
    border-color: #4F46E5;
    color: #4F46E5;
    background: #EEF2FF;
}

/* ---- Zoom / Lightbox ---- */
.pd-illustration-card {
    cursor: zoom-in;
}
.pd-zoom-icon {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.88);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    z-index: 2;
}
.pd-zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
    animation: pd-zoom-in 0.2s ease;
}
@keyframes pd-zoom-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
.pd-zoom-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255,255,255,0.15);
    border: none;
    color: #fff;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    z-index: 10000;
}
.pd-zoom-close:hover {
    background: rgba(255,255,255,0.28);
}
.pd-zoom-content {
    max-width: 80vmin;
    max-height: 80vmin;
    background: white;
    border-radius: 20px;
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.pd-zoom-content svg {
    max-width: 100%;
    max-height: 100%;
}
.pd-zoom-hint {
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    margin: 0;
    text-align: center;
}
`;

// ---------------------------------------------------------------------------
// Large hero SVG builders per furniture type
// ---------------------------------------------------------------------------

/**
 * Build a large hero SVG for the given furniture icon key.
 * @param {string} icon - Icon key from catalogue
 * @param {string} colour - Current hex colour
 * @returns {string} SVG markup string
 */
function buildHeroSvg(icon, colour) {
    const SIZE = 300;
    const c = escapeHtml(colour || '#A0825A');
    const dark = darkenHex(colour || '#A0825A', 28);
    const light = lightenHex(colour || '#A0825A', 40);

    const svgOpen = `<svg id="pd-hero-svg" class="pd-hero-svg" viewBox="0 0 300 300" width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">`;
    const svgClose = `</svg>`;

    switch (icon) {
        case 'chair':
            return `${svgOpen}
              <!-- Seat -->
              <rect x="85" y="140" width="130" height="30" rx="8" fill="${c}"/>
              <!-- Back rest -->
              <rect x="90" y="80" width="120" height="65" rx="8" fill="${c}"/>
              <!-- Back connector -->
              <rect x="100" y="108" width="100" height="10" fill="${dark}" opacity="0.3"/>
              <!-- Front legs -->
              <rect x="92"  y="170" width="16" height="60" rx="6" fill="${dark}"/>
              <rect x="192" y="170" width="16" height="60" rx="6" fill="${dark}"/>
              <!-- Back legs (shorter, behind) -->
              <rect x="95"  y="170" width="12" height="48" rx="5" fill="${dark}" opacity="0.6"/>
              <rect x="193" y="170" width="12" height="48" rx="5" fill="${dark}" opacity="0.6"/>
              <!-- Seat cushion highlight -->
              <rect x="90" y="142" width="120" height="12" rx="6" fill="${light}" opacity="0.5"/>
            ${svgClose}`;

        case 'desk-chair':
            return `${svgOpen}
              <!-- Tall backrest -->
              <rect x="95" y="55" width="110" height="100" rx="10" fill="${c}"/>
              <!-- Lumbar curve -->
              <ellipse cx="150" cy="125" rx="40" ry="8" fill="${light}" opacity="0.4"/>
              <!-- Seat cushion -->
              <rect x="80" y="150" width="140" height="28" rx="8" fill="${c}"/>
              <rect x="85" y="152" width="130" height="12" rx="6" fill="${light}" opacity="0.45"/>
              <!-- Armrests -->
              <rect x="72" y="140" width="8" height="45" rx="3" fill="${dark}" opacity="0.7"/>
              <rect x="220" y="140" width="8" height="45" rx="3" fill="${dark}" opacity="0.7"/>
              <rect x="65" y="140" width="22" height="6" rx="3" fill="${dark}" opacity="0.5"/>
              <rect x="213" y="140" width="22" height="6" rx="3" fill="${dark}" opacity="0.5"/>
              <!-- Pedestal -->
              <rect x="143" y="178" width="14" height="42" rx="4" fill="${dark}" opacity="0.65"/>
              <!-- Star base arms -->
              <line x1="150" y1="220" x2="105" y2="240" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
              <line x1="150" y1="220" x2="195" y2="240" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
              <line x1="150" y1="220" x2="120" y2="245" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
              <line x1="150" y1="220" x2="180" y2="245" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
              <line x1="150" y1="220" x2="150" y2="248" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
              <!-- Wheels -->
              <circle cx="105" cy="242" r="5" fill="${dark}" opacity="0.5"/>
              <circle cx="195" cy="242" r="5" fill="${dark}" opacity="0.5"/>
              <circle cx="120" cy="247" r="5" fill="${dark}" opacity="0.45"/>
              <circle cx="180" cy="247" r="5" fill="${dark}" opacity="0.45"/>
              <circle cx="150" cy="250" r="5" fill="${dark}" opacity="0.45"/>
            ${svgClose}`;

        case 'sofa':
            return `${svgOpen}
              <!-- Base -->
              <rect x="40" y="155" width="220" height="65" rx="12" fill="${c}"/>
              <!-- Back rest -->
              <rect x="40" y="105" width="220" height="60" rx="12" fill="${c}"/>
              <!-- Left armrest -->
              <rect x="34"  y="120" width="30" height="80" rx="10" fill="${dark}"/>
              <!-- Right armrest -->
              <rect x="236" y="120" width="30" height="80" rx="10" fill="${dark}"/>
              <!-- Seat cushion divider -->
              <rect x="147" y="158" width="6" height="60" rx="3" fill="${dark}" opacity="0.25"/>
              <!-- Cushion highlights -->
              <rect x="50"  y="157" width="90" height="18" rx="6" fill="${light}" opacity="0.45"/>
              <rect x="158" y="157" width="90" height="18" rx="6" fill="${light}" opacity="0.45"/>
              <!-- Back cushion highlight -->
              <rect x="50"  y="108" width="200" height="18" rx="6" fill="${light}" opacity="0.35"/>
              <!-- Feet -->
              <rect x="52"  y="218" width="18" height="20" rx="5" fill="${dark}"/>
              <rect x="230" y="218" width="18" height="20" rx="5" fill="${dark}"/>
            ${svgClose}`;

        case 'bed':
            return `${svgOpen}
              <!-- Headboard -->
              <rect x="60" y="80" width="180" height="65" rx="14" fill="${c}"/>
              <rect x="72" y="90" width="156" height="42" rx="8" fill="${light}" opacity="0.35"/>
              <!-- Mattress base -->
              <rect x="52" y="140" width="196" height="85" rx="10" fill="${dark}" opacity="0.45"/>
              <!-- Mattress top -->
              <rect x="56" y="138" width="188" height="80" rx="9" fill="${light}"/>
              <!-- Pillow left -->
              <ellipse cx="108" cy="158" rx="34" ry="18" fill="${c}" opacity="0.85"/>
              <ellipse cx="108" cy="154" rx="28" ry="12" fill="${light}" opacity="0.5"/>
              <!-- Pillow right -->
              <ellipse cx="192" cy="158" rx="34" ry="18" fill="${c}" opacity="0.85"/>
              <ellipse cx="192" cy="154" rx="28" ry="12" fill="${light}" opacity="0.5"/>
              <!-- Duvet fold -->
              <rect x="60"  y="178" width="180" height="36" rx="8" fill="${c}" opacity="0.6"/>
              <rect x="60"  y="178" width="180" height="12" rx="6" fill="${light}" opacity="0.4"/>
              <!-- Legs -->
              <rect x="62"  y="220" width="14" height="22" rx="5" fill="${dark}"/>
              <rect x="224" y="220" width="14" height="22" rx="5" fill="${dark}"/>
            ${svgClose}`;

        case 'table':
        case 'dining-table':
            return `${svgOpen}
              <!-- Table top -->
              <rect x="30" y="120" width="240" height="24" rx="8" fill="${c}"/>
              <!-- Table top edge highlight -->
              <rect x="34" y="122" width="232" height="10" rx="5" fill="${light}" opacity="0.5"/>
              <!-- Apron left -->
              <rect x="48" y="144" width="16" height="18" rx="4" fill="${dark}" opacity="0.5"/>
              <!-- Apron right -->
              <rect x="236" y="144" width="16" height="18" rx="4" fill="${dark}" opacity="0.5"/>
              <!-- Legs -->
              <rect x="52"  y="144" width="18" height="78" rx="7" fill="${dark}"/>
              <rect x="230" y="144" width="18" height="78" rx="7" fill="${dark}"/>
              <rect x="108" y="144" width="15" height="78" rx="6" fill="${dark}" opacity="0.7"/>
              <rect x="177" y="144" width="15" height="78" rx="6" fill="${dark}" opacity="0.7"/>
              <!-- Stretcher -->
              <rect x="62"  y="196" width="176" height="8"  rx="4" fill="${dark}" opacity="0.35"/>
            ${svgClose}`;

        case 'desk':
            return `${svgOpen}
              <!-- Desktop surface -->
              <rect x="30" y="118" width="240" height="22" rx="7" fill="${c}"/>
              <rect x="34" y="120" width="232" height="10" rx="5" fill="${light}" opacity="0.45"/>
              <!-- Drawer unit -->
              <rect x="170" y="140" width="76" height="78" rx="7" fill="${dark}" opacity="0.35"/>
              <rect x="174" y="144" width="68" height="32" rx="4" fill="${c}" opacity="0.6"/>
              <rect x="174" y="182" width="68" height="30" rx="4" fill="${c}" opacity="0.6"/>
              <!-- Drawer handles -->
              <rect x="200" y="158" width="16" height="4" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="200" y="196" width="16" height="4" rx="2" fill="${dark}" opacity="0.5"/>
              <!-- Legs -->
              <rect x="40"  y="140" width="18" height="88" rx="7" fill="${dark}"/>
              <rect x="170" y="140" width="18" height="88" rx="7" fill="${dark}" opacity="0.7"/>
            ${svgClose}`;

        case 'wardrobe':
            return `${svgOpen}
              <!-- Body -->
              <rect x="55" y="65" width="190" height="195" rx="10" fill="${c}"/>
              <!-- Top panel highlight -->
              <rect x="60" y="68" width="180" height="18" rx="6" fill="${light}" opacity="0.4"/>
              <!-- Centre divider -->
              <rect x="147" y="68" width="6" height="188" fill="${dark}" opacity="0.25"/>
              <!-- Left door panel -->
              <rect x="63" y="90" width="78" height="158" rx="6" fill="${c}" opacity="0.7"/>
              <rect x="67" y="94" width="70" height="146" rx="4" fill="${light}" opacity="0.2"/>
              <!-- Right door panel -->
              <rect x="159" y="90" width="78" height="158" rx="6" fill="${c}" opacity="0.7"/>
              <rect x="163" y="94" width="70" height="146" rx="4" fill="${light}" opacity="0.2"/>
              <!-- Handles -->
              <rect x="130" y="162" width="8" height="28" rx="4" fill="${dark}"/>
              <rect x="162" y="162" width="8" height="28" rx="4" fill="${dark}"/>
              <!-- Feet -->
              <rect x="66"  y="256" width="20" height="12" rx="4" fill="${dark}"/>
              <rect x="214" y="256" width="20" height="12" rx="4" fill="${dark}"/>
            ${svgClose}`;

        case 'bookshelf':
            return `${svgOpen}
              <!-- Frame sides -->
              <rect x="68" y="50" width="16" height="210" rx="6" fill="${c}"/>
              <rect x="216" y="50" width="16" height="210" rx="6" fill="${c}"/>
              <!-- Top -->
              <rect x="64" y="50" width="172" height="16" rx="6" fill="${c}"/>
              <!-- Bottom -->
              <rect x="64" y="248" width="172" height="16" rx="6" fill="${c}"/>
              <!-- Shelves -->
              <rect x="72" y="104" width="156" height="12" rx="5" fill="${dark}" opacity="0.5"/>
              <rect x="72" y="152" width="156" height="12" rx="5" fill="${dark}" opacity="0.5"/>
              <rect x="72" y="200" width="156" height="12" rx="5" fill="${dark}" opacity="0.5"/>
              <!-- Books on shelf 1 (top) -->
              <rect x="80" y="70"  width="12" height="34" rx="3" fill="${dark}" opacity="0.6"/>
              <rect x="96" y="74"  width="12" height="30" rx="3" fill="${light}" opacity="0.7"/>
              <rect x="112" y="68" width="10" height="36" rx="3" fill="${dark}" opacity="0.4"/>
              <!-- Books on shelf 2 -->
              <rect x="80" y="116" width="12" height="36" rx="3" fill="${light}" opacity="0.6"/>
              <rect x="96" y="120" width="10" height="32" rx="3" fill="${dark}" opacity="0.5"/>
              <rect x="110" y="116" width="14" height="36" rx="3" fill="${dark}" opacity="0.35"/>
              <!-- Books on shelf 3 -->
              <rect x="80" y="164" width="10" height="36" rx="3" fill="${dark}" opacity="0.5"/>
              <rect x="94" y="168" width="12" height="32" rx="3" fill="${light}" opacity="0.55"/>
            ${svgClose}`;

        case 'coffee-table':
            return `${svgOpen}
              <!-- Table top -->
              <rect x="35" y="140" width="230" height="28" rx="10" fill="${c}"/>
              <rect x="40" y="143" width="220" height="12" rx="6" fill="${light}" opacity="0.45"/>
              <!-- Shelf below -->
              <rect x="60" y="185" width="180" height="14" rx="6" fill="${dark}" opacity="0.35"/>
              <!-- Legs -->
              <rect x="54"  y="168" width="16" height="52" rx="7" fill="${dark}"/>
              <rect x="230" y="168" width="16" height="52" rx="7" fill="${dark}"/>
              <rect x="105" y="168" width="14" height="52" rx="6" fill="${dark}" opacity="0.7"/>
              <rect x="181" y="168" width="14" height="52" rx="6" fill="${dark}" opacity="0.7"/>
            ${svgClose}`;

        case 'armchair':
            return `${svgOpen}
              <!-- Back rest -->
              <rect x="75" y="88" width="150" height="100" rx="14" fill="${c}"/>
              <rect x="82" y="95" width="136" height="70" rx="8" fill="${light}" opacity="0.35"/>
              <!-- Seat -->
              <rect x="62" y="175" width="176" height="50" rx="12" fill="${c}"/>
              <rect x="68" y="178" width="164" height="20" rx="8" fill="${light}" opacity="0.4"/>
              <!-- Left arm -->
              <rect x="54"  y="138" width="28" height="70" rx="10" fill="${dark}"/>
              <!-- Right arm -->
              <rect x="218" y="138" width="28" height="70" rx="10" fill="${dark}"/>
              <!-- Feet -->
              <rect x="72"  y="220" width="16" height="24" rx="6" fill="${dark}"/>
              <rect x="212" y="220" width="16" height="24" rx="6" fill="${dark}"/>
            ${svgClose}`;

        case 'tv-stand':
            return `${svgOpen}
              <!-- Main body -->
              <rect x="30" y="130" width="240" height="80" rx="12" fill="${c}"/>
              <!-- Top surface highlight -->
              <rect x="36" y="133" width="228" height="16" rx="6" fill="${light}" opacity="0.42"/>
              <!-- Left door -->
              <rect x="38" y="144" width="96" height="60" rx="7" fill="${c}" opacity="0.7"/>
              <rect x="42" y="148" width="88" height="50" rx="4" fill="${dark}" opacity="0.15"/>
              <rect x="78" y="170" width="20" height="6" rx="3" fill="${dark}" opacity="0.5"/>
              <!-- Right door -->
              <rect x="166" y="144" width="96" height="60" rx="7" fill="${c}" opacity="0.7"/>
              <rect x="170" y="148" width="88" height="50" rx="4" fill="${dark}" opacity="0.15"/>
              <rect x="202" y="170" width="20" height="6" rx="3" fill="${dark}" opacity="0.5"/>
              <!-- Centre gap -->
              <rect x="136" y="144" width="28" height="60" rx="4" fill="${dark}" opacity="0.12"/>
              <!-- Legs -->
              <rect x="48"  y="208" width="16" height="18" rx="5" fill="${dark}"/>
              <rect x="236" y="208" width="16" height="18" rx="5" fill="${dark}"/>
            ${svgClose}`;

        case 'table-sm':
        case 'side-table':
            return `${svgOpen}
              <!-- Tabletop -->
              <rect x="75" y="118" width="150" height="20" rx="8" fill="${c}"/>
              <rect x="80" y="120" width="140" height="10" rx="5" fill="${light}" opacity="0.5"/>
              <!-- Shelf -->
              <rect x="90" y="178" width="120" height="12" rx="5" fill="${dark}" opacity="0.35"/>
              <!-- Legs -->
              <rect x="86"  y="138" width="14" height="90" rx="6" fill="${dark}"/>
              <rect x="200" y="138" width="14" height="90" rx="6" fill="${dark}"/>
              <rect x="86"  y="138" width="14" height="40" rx="6" fill="${dark}" opacity="0.5" transform="skewX(-4)"/>
            ${svgClose}`;

        case 'rug':
            return `${svgOpen}
              <!-- Rug base -->
              <rect x="35" y="100" width="230" height="140" rx="14" fill="${c}"/>
              <!-- Fringe left -->
              <rect x="30" y="108" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="120" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="132" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="144" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="156" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="168" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="180" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="30" y="192" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <!-- Fringe right -->
              <rect x="262" y="108" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="262" y="120" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="262" y="132" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="262" y="144" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="262" y="156" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <rect x="262" y="168" width="8" height="6" rx="2" fill="${dark}" opacity="0.5"/>
              <!-- Outer border -->
              <rect x="44" y="110" width="212" height="120" rx="8" fill="none" stroke="${light}" stroke-width="6" opacity="0.6"/>
              <!-- Inner pattern -->
              <rect x="62" y="126" width="176" height="88" rx="5" fill="none" stroke="${light}" stroke-width="4" opacity="0.4"/>
              <!-- Centre diamond -->
              <polygon points="150,138 172,170 150,202 128,170" fill="${light}" opacity="0.3"/>
              <polygon points="150,148 164,170 150,192 136,170" fill="${dark}" opacity="0.2"/>
            ${svgClose}`;

        default:
            // Generic box with legs fallback
            return `${svgOpen}
              <rect x="60" y="110" width="180" height="100" rx="10" fill="${c}"/>
              <rect x="66" y="114" width="168" height="30" rx="6" fill="${light}" opacity="0.4"/>
              <rect x="72"  y="210" width="16" height="60" rx="6" fill="${dark}"/>
              <rect x="212" y="210" width="16" height="60" rx="6" fill="${dark}"/>
            ${svgClose}`;
    }
}

// ---------------------------------------------------------------------------
// Small catalogue-card SVG (reused from CatalogueView pattern, scaled up slightly)
// ---------------------------------------------------------------------------

const RELATED_ICONS = {
    chair: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4H5v-4z"/><path d="M19 15v5M5 15v5"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/></svg>`,
    table: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="3" rx="1"/><path d="M4 10v10M20 10v10"/></svg>`,
    'table-sm': `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="2" rx="1"/><path d="M7 10v9M17 10v9"/></svg>`,
    sofa: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M4 19v2M20 19v2"/></svg>`,
    armchair: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9V7a5 5 0 0 0-10 0v2"/><path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a3 3 0 0 0-6 0H9a3 3 0 0 0-6 0z"/><path d="M5 19v2M19 19v2"/></svg>`,
    'coffee-table': `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="2" rx="1"/><path d="M5 12v6M19 12v6"/><path d="M3 18h18"/></svg>`,
    bookshelf: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="10" y1="2" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="14"/></svg>`,
    desk: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="3" rx="1"/><path d="M4 9v10M20 9v10"/><rect x="13" y="9" width="5" height="6" rx="0.5"/></svg>`,
    'tv-stand': `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6M18 8V6"/><rect x="4" y="10" width="7" height="4" rx="0.5"/></svg>`,
    bed: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    wardrobe: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="9" cy="12" r="0.5" fill="currentColor"/><circle cx="15" cy="12" r="0.5" fill="currentColor"/></svg>`,
    rug: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M18 6v12"/><path d="M2 12h20"/></svg>`
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters to prevent XSS
 * @param {*} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return String(text || '');
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

/**
 * Format a price in USD
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
    return `$${Number(price).toLocaleString('en-US')}`;
}

/**
 * Render star rating HTML
 * @param {number} rating - 0–5
 * @param {number} reviewCount
 * @returns {string}
 */
function buildStars(rating, reviewCount) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    const stars =
        '★'.repeat(full) +
        (half ? '⯨' : '') +
        '☆'.repeat(empty);
    return `<span class="pd-stars" aria-label="Rating: ${rating} out of 5">${stars}</span>
            <span class="pd-rating-score">${rating}</span>
            <span class="pd-review-count">(${reviewCount} reviews)</span>`;
}

/**
 * Render a stock status chip
 * @param {number} stock
 * @returns {string}
 */
function buildStockChip(stock) {
    if (stock <= 0) {
        return `<span class="pd-stock-chip pd-stock-chip--out"><span class="pd-stock-chip__dot"></span>Out of Stock</span>`;
    }
    if (stock <= 5) {
        return `<span class="pd-stock-chip pd-stock-chip--low"><span class="pd-stock-chip__dot"></span>Low Stock &bull; ${stock} left</span>`;
    }
    return `<span class="pd-stock-chip pd-stock-chip--in"><span class="pd-stock-chip__dot"></span>In Stock &bull; ${stock} available</span>`;
}

/**
 * Darken a hex colour by a given amount (0-255)
 * @param {string} hex
 * @param {number} amount
 * @returns {string}
 */
function darkenHex(hex, amount) {
    try {
        const n = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (n >> 16) - amount);
        const g = Math.max(0, ((n >> 8) & 0xff) - amount);
        const b = Math.max(0, (n & 0xff) - amount);
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    } catch (_) { return hex; }
}

/**
 * Lighten a hex colour by a given amount (0-255)
 * @param {string} hex
 * @param {number} amount
 * @returns {string}
 */
function lightenHex(hex, amount) {
    try {
        const n = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (n >> 16) + amount);
        const g = Math.min(255, ((n >> 8) & 0xff) + amount);
        const b = Math.min(255, (n & 0xff) + amount);
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    } catch (_) { return hex; }
}

/**
 * Build SVG dimension diagram showing a 3D-ish box with W×D×H labels
 * @param {Object} item - Furniture catalogue item
 * @returns {string} SVG markup
 */
function buildDimsDiagram(item) {
    const w = item.defaultWidth;
    const d = item.defaultDepth;
    const h = item.defaultHeight;

    return `
    <svg viewBox="0 0 220 180" width="220" height="180" xmlns="http://www.w3.org/2000/svg" aria-label="Dimension diagram">
        <!-- Front face -->
        <rect x="40" y="60" width="110" height="80" rx="3"
              fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5"/>
        <!-- Top face (parallelogram) -->
        <polygon points="40,60 80,36 190,36 150,60"
                 fill="#E0E7FF" stroke="#4F46E5" stroke-width="1.5"/>
        <!-- Right face -->
        <polygon points="150,60 190,36 190,116 150,140"
                 fill="#C7D2FE" stroke="#4F46E5" stroke-width="1.5"/>

        <!-- Width label (bottom) -->
        <line x1="40" y1="152" x2="150" y2="152" stroke="#6366F1" stroke-width="1" stroke-dasharray="3 2"/>
        <text x="95" y="167" text-anchor="middle" font-size="11" font-weight="600" fill="#4338CA" font-family="-apple-system,sans-serif">W ${w}m</text>
        <!-- Height label (left) -->
        <line x1="24" y1="60" x2="24" y2="140" stroke="#6366F1" stroke-width="1" stroke-dasharray="3 2"/>
        <text x="14" y="102" text-anchor="middle" font-size="11" font-weight="600" fill="#4338CA" font-family="-apple-system,sans-serif" transform="rotate(-90,14,102)">H ${h}m</text>
        <!-- Depth label (diagonal right) -->
        <line x1="155" y1="30" x2="196" y2="30" stroke="#6366F1" stroke-width="1" stroke-dasharray="3 2"/>
        <text x="176" y="24" text-anchor="middle" font-size="11" font-weight="600" fill="#4338CA" font-family="-apple-system,sans-serif">D ${d}m</text>

        <!-- Corner tick marks -->
        <line x1="40" y1="148" x2="40" y2="156" stroke="#6366F1" stroke-width="1.5"/>
        <line x1="150" y1="148" x2="150" y2="156" stroke="#6366F1" stroke-width="1.5"/>
        <line x1="20" y1="60"  x2="28" y2="60"  stroke="#6366F1" stroke-width="1.5"/>
        <line x1="20" y1="140" x2="28" y2="140" stroke="#6366F1" stroke-width="1.5"/>
    </svg>`;
}

// ---------------------------------------------------------------------------
// Related items helper
// ---------------------------------------------------------------------------

/**
 * Get up to 3 related items from the same category, excluding current item
 * @param {Object} currentItem
 * @returns {Array}
 */
function getRelatedItems(currentItem) {
    return furnitureCatalogue
        .filter(f => f.category === currentItem.category && f.type !== currentItem.type)
        .slice(0, 3);
}

// ---------------------------------------------------------------------------
// ProductDetailView
// ---------------------------------------------------------------------------

/**
 * ProductDetailView class
 * Renders a full product detail page for a single furniture catalogue item.
 */
class ProductDetailView {
    /**
     * Create a ProductDetailView instance.
     * @param {Object} options
     * @param {Function} [options.onBack] - Navigate back (to catalogue)
     * @param {Function} [options.onAddToCart] - Called with (item, selectedColour)
     * @param {Function} [options.onAddToWishlist] - Called with (item, isInWishlist)
     * @param {Function} [options.onUseInDesign] - Called with (furnitureType)
     * @param {Function} [options.onViewRelated] - Called with (furnitureType) to view another product
     * @param {Function} [options.onViewCart] - Navigate to cart
     * @param {string}   [options.username=''] - Current user's display name
     */
    constructor({
        onBack = () => {},
        onAddToCart = () => {},
        onAddToWishlist = () => {},
        onUseInDesign = () => {},
        onViewRelated = () => {},
        onViewCart = () => {},
        username = ''
    } = {}) {
        this.onBack = onBack;
        this.onAddToCart = onAddToCart;
        this.onAddToWishlist = onAddToWishlist;
        this.onUseInDesign = onUseInDesign;
        this.onViewRelated = onViewRelated;
        this.onViewCart = onViewCart;
        this.username = username;

        /** @type {HTMLElement|null} */
        this.container = null;
        /** @type {Object|null} */
        this._item = null;
        /** @type {string} */
        this._selectedColour = '';
        /** @type {string} */
        this._activeTab = 'details';
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Render the product detail view into a container element.
     * @param {HTMLElement} container - Target DOM element
     * @param {Object} furnitureItem - Catalogue item from furnitureCatalogue
     * @param {Object} [opts]
     * @param {number}  [opts.cartCount=0]
     * @param {boolean} [opts.isInWishlist=false]
     * @param {string}  [opts.userRole='user'] - 'user' | 'admin'
     */
    render(container, furnitureItem, { cartCount = 0, isInWishlist = false, userRole = 'user' } = {}) {
        if (!container || !furnitureItem) return;

        this.container = container;
        this._item = furnitureItem;
        this._selectedColour = (furnitureItem.colours && furnitureItem.colours.length > 0)
            ? furnitureItem.colours[0].hex
            : (furnitureItem.defaultColour || '#A0825A');
        this._activeTab = 'details';

        this._injectStyles();
        container.innerHTML = this._buildHTML(furnitureItem, cartCount, isInWishlist, userRole);
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // Private: HTML builder
    // -----------------------------------------------------------------------

    /**
     * Build the full page HTML string.
     * @param {Object}  item
     * @param {number}  cartCount
     * @param {boolean} isInWishlist
     * @param {string}  userRole
     * @returns {string}
     */
    _buildHTML(item, cartCount, isInWishlist, userRole) {
        const name       = escapeHtml(item.label);
        const sku        = escapeHtml(item.sku || '');
        const price      = formatPrice(item.price);
        const cartBadge  = cartCount > 0
            ? `<span class="pd-cart-badge" id="pd-cart-badge">${cartCount}</span>`
            : `<span class="pd-cart-badge" id="pd-cart-badge" style="display:none;">${cartCount}</span>`;
        const heroSvg    = buildHeroSvg(item.icon, this._selectedColour);
        const stars      = buildStars(item.rating || 0, item.reviewCount || 0);
        const stockChip  = buildStockChip(item.stock ?? 99);
        const relatedItems = getRelatedItems(item);

        // Colour swatches
        const swatchesHtml = (item.colours || []).map((col, i) => `
            <button type="button"
                class="pd-swatch${i === 0 ? ' pd-swatch--selected' : ''}"
                style="background-color:${escapeHtml(col.hex)};"
                data-hex="${escapeHtml(col.hex)}"
                data-name="${escapeHtml(col.name)}"
                aria-label="${escapeHtml(col.name)}"
                aria-pressed="${i === 0 ? 'true' : 'false'}"
                title="${escapeHtml(col.name)}">
                <span class="pd-swatch-tooltip">${escapeHtml(col.name)}</span>
            </button>
        `).join('');

        const selectedColourName = (item.colours && item.colours.length > 0)
            ? escapeHtml(item.colours[0].name) : '';

        // Action buttons
        const isAdmin = userRole === 'admin';
        const cartDisabled = (item.stock !== undefined && item.stock <= 0) ? ' disabled' : '';
        const actionButtons = isAdmin
            ? `<button type="button" class="pd-btn-design" id="pd-btn-design">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                   Use in Design
               </button>`
            : `<button type="button" class="pd-btn-cart" id="pd-btn-cart"${cartDisabled}>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                   ${item.stock <= 0 ? 'Unavailable' : 'Add to Cart'}
               </button>
               <button type="button" class="pd-btn-wishlist${isInWishlist ? ' pd-btn-wishlist--active' : ''}" id="pd-btn-wishlist" aria-pressed="${isInWishlist}">
                   <svg class="pd-heart-icon" width="18" height="18" viewBox="0 0 24 24" fill="${isInWishlist ? '#E11D48' : 'none'}" stroke="${isInWishlist ? '#E11D48' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                   ${isInWishlist ? 'Saved' : 'Wishlist'}
               </button>`;

        // Materials list
        const materials = (item.materials || '')
            .split(',')
            .map(m => m.trim())
            .filter(Boolean);
        const materialsListHtml = materials.map(m => `
            <li class="pd-material-item">
                <span class="pd-material-dot"></span>
                ${escapeHtml(m)}
            </li>
        `).join('');

        // Related items
        const relatedHtml = relatedItems.length > 0
            ? relatedItems.map(rel => {
                const icon = RELATED_ICONS[rel.icon] || RELATED_ICONS['chair'];
                return `
                <article class="pd-related-card" data-type="${escapeHtml(rel.type)}">
                    <div class="pd-related-card__img" style="color:${escapeHtml(rel.defaultColour || '#A0825A')};">
                        ${icon}
                    </div>
                    <div class="pd-related-card__body">
                        <h4 class="pd-related-card__name">${escapeHtml(rel.label)}</h4>
                        <span class="pd-related-card__price">${formatPrice(rel.price)}</span>
                        <button type="button" class="pd-related-card__btn pd-related-view-btn" data-type="${escapeHtml(rel.type)}">
                            View Product
                        </button>
                    </div>
                </article>`;
            }).join('')
            : '<p style="color:var(--text-muted);font-size:var(--text-sm);">No related items found.</p>';

        return `
<div class="pd-page" id="pd-page">

    <!-- Top Bar -->
    <header class="pd-topbar" role="banner">
        <div class="pd-topbar__left">
            <button type="button" class="pd-back-btn" id="pd-back-btn" aria-label="Back to catalogue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
            </button>
            <nav class="pd-breadcrumb" aria-label="Breadcrumb">
                <span>Catalogue</span>
                <span class="pd-breadcrumb__sep">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
                <span class="pd-breadcrumb__current">${name}</span>
            </nav>
        </div>
        <button type="button" class="pd-cart-btn" id="pd-cart-btn" aria-label="View cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ${cartBadge}
        </button>
    </header>

    <!-- Hero Section -->
    <main>
        <section class="pd-hero" aria-label="Product overview">
            <!-- Left: Illustration -->
            <div class="pd-illustration-card" id="pd-illustration-card" title="Click to zoom" role="button" tabindex="0" aria-label="View product image fullscreen">
                ${heroSvg}
                <div class="pd-zoom-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </div>
            </div>

            <!-- Right: Product Info -->
            <div class="pd-product-info">
                <span class="pd-sku-badge">SKU: ${sku}</span>
                <h1 class="pd-product-name">${name}</h1>

                <!-- Rating -->
                <div class="pd-rating-row">
                    ${stars}
                </div>

                <!-- Price + Stock -->
                <div class="pd-price-row">
                    <span class="pd-price">${price}</span>
                    ${stockChip}
                </div>

                <!-- Colour Swatches -->
                ${(item.colours && item.colours.length > 0) ? `
                <div class="pd-swatches-section">
                    <p class="pd-swatches-label">
                        Colour
                        <span id="pd-selected-colour-name">${selectedColourName}</span>
                    </p>
                    <div class="pd-swatches-row" id="pd-swatches-row" role="group" aria-label="Select colour">
                        ${swatchesHtml}
                    </div>
                </div>` : ''}

                <!-- Actions -->
                <div class="pd-actions">
                    ${actionButtons}
                </div>
            </div>
        </section>

        <!-- Tabs Section -->
        <section class="pd-tabs-section" aria-label="Product details">
            <div class="pd-tabs-nav" role="tablist" aria-label="Product information tabs">
                <button type="button" role="tab" class="pd-tab-btn pd-tab-btn--active" id="pd-tab-details" data-tab="details" aria-selected="true" aria-controls="pd-panel-details">Details</button>
                <button type="button" role="tab" class="pd-tab-btn" id="pd-tab-dimensions" data-tab="dimensions" aria-selected="false" aria-controls="pd-panel-dimensions">Dimensions</button>
                <button type="button" role="tab" class="pd-tab-btn" id="pd-tab-materials" data-tab="materials" aria-selected="false" aria-controls="pd-panel-materials">Materials</button>
            </div>

            <!-- Details Panel -->
            <div class="pd-tab-panel pd-tab-panel--active" id="pd-panel-details" role="tabpanel" aria-labelledby="pd-tab-details">
                <div class="pd-details-content">
                    <p class="pd-description">${escapeHtml(item.description || '')}</p>
                    <div class="pd-meta-chips">
                        ${item.leadTime ? `
                        <span class="pd-meta-chip">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Lead time: <strong>${escapeHtml(item.leadTime)}</strong>
                        </span>` : ''}
                        ${item.weight ? `
                        <span class="pd-meta-chip">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
                            Weight: <strong>${escapeHtml(item.weight)}</strong>
                        </span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Dimensions Panel -->
            <div class="pd-tab-panel" id="pd-panel-dimensions" role="tabpanel" aria-labelledby="pd-tab-dimensions">
                <div class="pd-dims-content">
                    <div class="pd-dims-diagram">
                        ${buildDimsDiagram(item)}
                    </div>
                    <div class="pd-dims-table" role="table" aria-label="Dimension values">
                        <div class="pd-dims-row" role="row">
                            <span class="pd-dims-label">Full Dimensions</span>
                            <span class="pd-dims-value">${escapeHtml(item.dimensions || '—')}</span>
                        </div>
                        <div class="pd-dims-row" role="row">
                            <span class="pd-dims-label">Width</span>
                            <span class="pd-dims-value">${item.defaultWidth}m</span>
                        </div>
                        <div class="pd-dims-row" role="row">
                            <span class="pd-dims-label">Depth</span>
                            <span class="pd-dims-value">${item.defaultDepth}m</span>
                        </div>
                        <div class="pd-dims-row" role="row">
                            <span class="pd-dims-label">Height</span>
                            <span class="pd-dims-value">${item.defaultHeight}m</span>
                        </div>
                        ${item.weight ? `
                        <div class="pd-dims-row" role="row">
                            <span class="pd-dims-label">Weight</span>
                            <span class="pd-dims-value">${escapeHtml(item.weight)}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>

            <!-- Materials Panel -->
            <div class="pd-tab-panel" id="pd-panel-materials" role="tabpanel" aria-labelledby="pd-tab-materials">
                <div class="pd-materials-content">
                    <ul class="pd-materials-list" aria-label="Materials used in this product">
                        ${materialsListHtml || '<li class="pd-material-item"><span class="pd-material-dot"></span>Information not available.</li>'}
                    </ul>
                </div>
            </div>
        </section>

        <!-- Related Items -->
        ${relatedItems.length > 0 ? `
        <section class="pd-related-section" aria-label="Related products">
            <h2 class="pd-related-heading">You may also like</h2>
            <div class="pd-related-scroll" role="list">
                ${relatedHtml}
            </div>
        </section>` : ''}
    </main>

</div>`;
    }

    // -----------------------------------------------------------------------
    // Private: Event binding
    // -----------------------------------------------------------------------

    /**
     * Attach all DOM event listeners after render.
     * @private
     */
    _bindEvents() {
        if (!this.container) return;

        // Back button
        this.container.querySelector('#pd-back-btn')
            ?.addEventListener('click', () => this.onBack());

        // Cart button (top bar)
        this.container.querySelector('#pd-cart-btn')
            ?.addEventListener('click', () => this.onViewCart());

        // Add to Cart
        this.container.querySelector('#pd-btn-cart')
            ?.addEventListener('click', () => {
                if (this._item) this.onAddToCart(this._item, this._selectedColour);
            });

        // Wishlist
        this.container.querySelector('#pd-btn-wishlist')
            ?.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const isNowActive = !btn.classList.contains('pd-btn-wishlist--active');
                this._updateWishlistBtn(isNowActive);
                if (this._item) this.onAddToWishlist(this._item, isNowActive);
            });

        // Use in Design (admin)
        this.container.querySelector('#pd-btn-design')
            ?.addEventListener('click', () => {
                if (this._item) this.onUseInDesign(this._item.type);
            });

        // Colour swatches
        const swatchRow = this.container.querySelector('#pd-swatches-row');
        if (swatchRow) {
            swatchRow.addEventListener('click', (e) => {
                const swatch = e.target.closest('.pd-swatch');
                if (!swatch) return;

                this._selectedColour = swatch.dataset.hex;
                const name = swatch.dataset.name;

                // Update selected state
                swatchRow.querySelectorAll('.pd-swatch').forEach(s => {
                    s.classList.toggle('pd-swatch--selected', s === swatch);
                    s.setAttribute('aria-pressed', s === swatch ? 'true' : 'false');
                });

                // Update colour name label
                const label = this.container.querySelector('#pd-selected-colour-name');
                if (label) label.textContent = name;

                // Update hero SVG
                this._updateHeroColour(this._selectedColour);
            });
        }

        // Tabs
        const tabBtns = this.container.querySelectorAll('.pd-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (!tab) return;

                this._activeTab = tab;

                // Update button states
                tabBtns.forEach(b => {
                    b.classList.toggle('pd-tab-btn--active', b.dataset.tab === tab);
                    b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
                });

                // Show/hide panels
                this.container.querySelectorAll('.pd-tab-panel').forEach(panel => {
                    panel.classList.toggle('pd-tab-panel--active', panel.id === `pd-panel-${tab}`);
                });
            });
        });

        // Hero image zoom / lightbox
        const illustrationCard = this.container.querySelector('#pd-illustration-card');
        if (illustrationCard) {
            const openZoom = () => {
                const heroSvgEl = illustrationCard.querySelector('svg');
                const svgContent = heroSvgEl ? heroSvgEl.outerHTML : '';

                const overlay = document.createElement('div');
                overlay.id = 'pd-zoom-overlay';
                overlay.className = 'pd-zoom-overlay';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('aria-label', 'Product image zoom');
                overlay.innerHTML = `
                    <button class="pd-zoom-close" aria-label="Close zoom view">✕</button>
                    <div class="pd-zoom-content" id="pd-zoom-content">${svgContent}</div>
                    <p class="pd-zoom-hint">Click outside to close • Press Esc to dismiss</p>
                `;
                document.body.appendChild(overlay);

                const close = () => overlay.remove();
                overlay.querySelector('.pd-zoom-close').addEventListener('click', close);
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
                const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
                document.addEventListener('keydown', escHandler);
                overlay.querySelector('.pd-zoom-close').focus();
            };

            illustrationCard.addEventListener('click', openZoom);
            illustrationCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(); }
            });
        }

        // Related items "View" buttons
        const relatedScroll = this.container.querySelector('.pd-related-scroll');
        if (relatedScroll) {
            relatedScroll.addEventListener('click', (e) => {
                const btn = e.target.closest('.pd-related-view-btn');
                if (btn) {
                    const type = btn.dataset.type;
                    if (type) this.onViewRelated(type);
                }
            });
        }
    }

    // -----------------------------------------------------------------------
    // Private: Update hero SVG colour
    // -----------------------------------------------------------------------

    /**
     * Rewrite the hero illustration with a new primary colour.
     * @param {string} hex - Hex colour string
     * @private
     */
    _updateHeroColour(hex) {
        if (!this.container || !this._item) return;
        const illustrationCard = this.container.querySelector('#pd-illustration-card');
        if (!illustrationCard) return;
        const newSvg = buildHeroSvg(this._item.icon, hex);
        // Replace only the SVG, preserving the zoom icon overlay
        const existingSvg = illustrationCard.querySelector('svg');
        const zoomIcon = illustrationCard.querySelector('.pd-zoom-icon');
        if (existingSvg) {
            const tmp = document.createElement('div');
            tmp.innerHTML = newSvg;
            const newSvgEl = tmp.querySelector('svg');
            if (newSvgEl) illustrationCard.replaceChild(newSvgEl, existingSvg);
        } else {
            illustrationCard.innerHTML = newSvg;
        }
        // Re-append zoom icon if it was removed
        if (zoomIcon && !illustrationCard.contains(zoomIcon)) {
            illustrationCard.appendChild(zoomIcon);
        }
    }

    // -----------------------------------------------------------------------
    // Private: Update wishlist button state
    // -----------------------------------------------------------------------

    /**
     * Toggle the wishlist button between active/inactive state.
     * @param {boolean} inWishlist
     * @private
     */
    _updateWishlistBtn(inWishlist) {
        const btn = this.container?.querySelector('#pd-btn-wishlist');
        if (!btn) return;

        btn.classList.toggle('pd-btn-wishlist--active', inWishlist);
        btn.setAttribute('aria-pressed', inWishlist ? 'true' : 'false');

        const heartIcon = btn.querySelector('.pd-heart-icon');
        if (heartIcon) {
            heartIcon.setAttribute('fill', inWishlist ? '#E11D48' : 'none');
            heartIcon.setAttribute('stroke', inWishlist ? '#E11D48' : 'currentColor');
        }

        const textNode = [...btn.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (textNode) {
            textNode.textContent = ` ${inWishlist ? 'Saved' : 'Wishlist'}`;
        }
    }

    // -----------------------------------------------------------------------
    // Private: Update cart count badge
    // -----------------------------------------------------------------------

    /**
     * Update the cart badge count in the top bar.
     * @param {number} count
     */
    updateCartCount(count) {
        const badge = this.container?.querySelector('#pd-cart-badge');
        if (!badge) return;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // -----------------------------------------------------------------------
    // Private: Style injection
    // -----------------------------------------------------------------------

    /**
     * Inject the view-scoped CSS into the document head (once per page).
     * @private
     */
    _injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = PD_CSS;
        document.head.appendChild(style);
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /**
     * Clean up the view and release all references.
     */
    destroy() {
        this.container = null;
        this._item = null;
    }
}

export { ProductDetailView };
export default ProductDetailView;
