/**
 * FurnishView — Cart View
 *
 * Shopping cart page with item list, quantity controls, order summary,
 * and checkout CTA. Reads cart data from storage and renders a two-column
 * layout (items + summary) with responsive fallback to single-column.
 *
 * Layout:
 *  - Header: "My Cart" title, Continue Shopping link
 *  - Cart items list: icon, name, dimensions, colour swatch, quantity +/-, price, remove
 *  - Order Summary panel: subtotal, delivery, total, Proceed to Checkout
 *  - Empty state when cart has zero items
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility of system status (item count, totals update in real time)
 *  - #3 User control and freedom (remove item, change quantity, continue shopping)
 *  - #5 Error prevention (min quantity = 1, confirm before clear)
 *  - #7 Flexibility (direct quantity +/-, remove per item, clear all)
 *  - #8 Aesthetic and minimalist design (clean list, clear hierarchy)
 *
 * @file js/views/CartView.js
 * @module views/CartView
 */

import { getFurnitureByType, furnitureCatalogue } from '../data/furnitureCatalogue.js';
import { Toast } from './components/Toast.js';
import { Modal } from './components/Modal.js';

/** Delivery fee in USD */
const DELIVERY_FEE = 49.99;

/** Free delivery threshold in USD */
const FREE_DELIVERY_THRESHOLD = 500;

/**
 * Furniture icon SVGs for cart item display.
 * Smaller 24×24 versions for the compact cart row layout.
 * @type {Object<string, string>}
 * @private
 */
const CART_ICONS = {
    chair: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4H5v-4z"/><path d="M19 15v5M5 15v5"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/></svg>`,
    table: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="3" rx="1"/><path d="M4 10v10M20 10v10"/></svg>`,
    'table-sm': `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="2" rx="1"/><path d="M7 10v9M17 10v9"/></svg>`,
    sofa: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M4 19v2M20 19v2"/></svg>`,
    armchair: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9V7a5 5 0 0 0-10 0v2"/><path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a3 3 0 0 0-6 0H9a3 3 0 0 0-6 0z"/><path d="M5 19v2M19 19v2"/></svg>`,
    'coffee-table': `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="2" rx="1"/><path d="M5 12v6M19 12v6"/><path d="M3 18h18"/></svg>`,
    bookshelf: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="10" y1="2" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="14"/></svg>`,
    desk: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="3" rx="1"/><path d="M4 9v10M20 9v10"/><rect x="13" y="9" width="5" height="6" rx="0.5"/></svg>`,
    'tv-stand': `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6M18 8V6"/><rect x="4" y="10" width="7" height="4" rx="0.5"/></svg>`,
    bed: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    wardrobe: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="12" y1="2" x2="12" y2="22"/><circle cx="9" cy="12" r="0.5" fill="currentColor"/><circle cx="15" cy="12" r="0.5" fill="currentColor"/></svg>`,
    rug: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6v12M18 6v12"/><path d="M2 12h20"/></svg>`
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
 * @returns {string} Formatted price string (e.g., "$599.00")
 * @private
 */
function formatPrice(price) {
    return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * CartView class
 * Manages the shopping cart with item list, quantity controls, and order summary
 */
class CartView {
    /**
     * Create a CartView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onBack - Callback to navigate back to dashboard
     * @param {Function} options.onContinueShopping - Callback to navigate to catalogue
     * @param {Function} options.onUpdateQuantity - Callback: (furnitureType, newQuantity) => void
     * @param {Function} options.onRemoveItem - Callback: (furnitureType) => void
     * @param {Function} options.onClearCart - Callback: () => void
     * @param {Function} options.onCheckout - Callback: () => void
     */
    constructor({
        onBack = () => {},
        onContinueShopping = () => {},
        onUpdateQuantity = () => {},
        onRemoveItem = () => {},
        onClearCart = () => {},
        onCheckout = () => {},
        onAddToCart = () => {},
        username = ''
    } = {}) {
        this.onBack = onBack;
        this.onContinueShopping = onContinueShopping;
        this.onUpdateQuantity = onUpdateQuantity;
        this.onRemoveItem = onRemoveItem;
        this.onClearCart = onClearCart;
        this.onCheckout = onCheckout;
        this.onAddToCart = onAddToCart;
        this.username = username;
        this.container = null;
        this._cartItems = [];
    }

    /**
     * Render the cart view
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array<{type: string, quantity: number, price: number}>} cartItems - Cart items from storage
     */
    render(container, cartItems = []) {
        if (!container) return;

        this.container = container;
        this._cartItems = Array.isArray(cartItems) ? cartItems : [];

        this._injectUpsellStyles();
        this._buildDOM();
        this._attachEventListeners();
    }

    /** @private */
    _injectUpsellStyles() {
        if (document.getElementById('cart-upsell-styles')) return;
        const style = document.createElement('style');
        style.id = 'cart-upsell-styles';
        style.textContent = `
            .cart-upsell {
                padding: 24px 20px;
                max-width: 760px;
                margin: 0 auto;
            }
            .cart-upsell__heading {
                font-size: 16px;
                font-weight: 700;
                color: #1d1d1f;
                margin: 0 0 14px;
            }
            .cart-upsell__row {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
            }
            .cart-upsell-card {
                background: #fff;
                border: 1px solid #e8e8ed;
                border-radius: 14px;
                padding: 16px;
                min-width: 160px;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .cart-upsell-card__icon {
                color: #555;
            }
            .cart-upsell-card__name {
                font-size: 13px;
                font-weight: 600;
                color: #1d1d1f;
            }
            .cart-upsell-card__price {
                font-size: 14px;
                font-weight: 700;
                color: #0071e3;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Build the full cart DOM
     * @private
     */
    _buildDOM() {
        const hasItems = this._cartItems.length > 0;
        const totalItems = this._cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const countLabel = totalItems === 1 ? '1 item' : `${totalItems} items`;

        this.container.innerHTML = `
            <div class="cart-view">
                <!-- Header -->
                <header class="cart-header">
                    <div class="cart-header__left">
                        <button type="button" class="cart-back-btn" id="cart-back-btn" aria-label="Back to dashboard">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            Dashboard
                        </button>
                    </div>
                    <div class="cart-header__center">
                        <h1 class="cart-title">My Cart</h1>
                        ${hasItems ? `<span class="cart-count">${countLabel}</span>` : ''}
                    </div>
                    <div class="cart-header__right">
                        <button type="button" class="cart-continue-btn" id="cart-continue-btn">
                            Continue Shopping
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </header>

                ${hasItems ? this._renderCartContent() : this._renderEmptyState()}
            </div>
        `;
    }

    /**
     * Render the cart content (items list + order summary)
     * @returns {string} HTML string
     * @private
     */
    _renderCartContent() {
        const subtotal = this._getSubtotal();
        const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const total = subtotal + delivery;

        return `
            <div class="cart-content">
                <!-- Items Column -->
                <div class="cart-items">
                    <div class="cart-items__header">
                        <span class="cart-items__label">Product</span>
                        <span class="cart-items__label cart-items__label--qty">Qty</span>
                        <span class="cart-items__label cart-items__label--price">Price</span>
                        <span class="cart-items__label cart-items__label--total">Total</span>
                        <span class="cart-items__label cart-items__label--action"></span>
                    </div>
                    <div class="cart-items__list" id="cart-items-list">
                        ${this._cartItems.map(item => this._renderCartItem(item)).join('')}
                    </div>
                    <div class="cart-items__footer">
                        <button type="button" class="btn btn-sm btn-danger-outline" id="cart-clear-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Clear Cart
                        </button>
                    </div>
                </div>

                <!-- Order Summary -->
                <aside class="cart-summary">
                    <h2 class="cart-summary__title">Order Summary</h2>
                    <div class="cart-summary__rows">
                        <div class="cart-summary__row">
                            <span>Subtotal</span>
                            <span id="cart-subtotal">${formatPrice(subtotal)}</span>
                        </div>
                        <div class="cart-summary__row">
                            <span>Delivery</span>
                            <span id="cart-delivery">${delivery === 0 ? '<span class="cart-free-delivery">Free</span>' : formatPrice(delivery)}</span>
                        </div>
                        ${subtotal < FREE_DELIVERY_THRESHOLD && subtotal > 0 ? `
                        <div class="cart-summary__hint">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Spend ${formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery
                        </div>` : ''}
                        <div class="cart-summary__divider"></div>
                        <div class="cart-summary__row cart-summary__row--total">
                            <span>Total</span>
                            <span id="cart-total">${formatPrice(total)}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary cart-checkout-btn" id="cart-checkout-btn">
                        Proceed to Checkout
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <button type="button" class="cart-continue-link" id="cart-continue-link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Continue Shopping
                    </button>
                </aside>
            </div>
        `;
    }

    /**
     * Render a single cart item row
     * @param {Object} item - Cart item { type, quantity, price }
     * @returns {string} HTML string
     * @private
     */
    _renderCartItem(item) {
        const catalogueItem = getFurnitureByType(item.type);
        const name = catalogueItem ? escapeHtml(catalogueItem.label) : escapeHtml(item.type);
        const icon = catalogueItem ? (CART_ICONS[catalogueItem.icon] || CART_ICONS['chair']) : CART_ICONS['chair'];
        const colour = catalogueItem ? catalogueItem.defaultColour : '#999';
        const dims = catalogueItem
            ? `${catalogueItem.defaultWidth}m × ${catalogueItem.defaultDepth}m × ${catalogueItem.defaultHeight}m`
            : '';
        const unitPrice = item.price || 0;
        const lineTotal = unitPrice * item.quantity;

        return `
            <div class="cart-item" data-type="${escapeHtml(item.type)}">
                <div class="cart-item__product">
                    <span class="cart-item__icon" aria-hidden="true">${icon}</span>
                    <div class="cart-item__info">
                        <span class="cart-item__name">${name}</span>
                        <span class="cart-item__dims">${dims}</span>
                        <span class="cart-item__swatch" style="background-color: ${escapeHtml(colour)}" aria-label="Colour: ${escapeHtml(colour)}"></span>
                    </div>
                </div>
                <div class="cart-item__qty">
                    <div class="cart-qty-control">
                        <button type="button" class="cart-qty-btn cart-qty-dec" data-type="${escapeHtml(item.type)}" aria-label="Decrease quantity" ${item.quantity <= 1 ? 'disabled' : ''}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <span class="cart-qty-value">${item.quantity}</span>
                        <button type="button" class="cart-qty-btn cart-qty-inc" data-type="${escapeHtml(item.type)}" aria-label="Increase quantity">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>
                </div>
                <div class="cart-item__price">${formatPrice(unitPrice)}</div>
                <div class="cart-item__total">${formatPrice(lineTotal)}</div>
                <div class="cart-item__action">
                    <button type="button" class="cart-remove-btn" data-type="${escapeHtml(item.type)}" aria-label="Remove ${name} from cart">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get recommended items for upsell: wishlist-based or first 3 catalogue items.
     * @returns {Array} up to 3 catalogue items
     * @private
     */
    _getRecommendedItems() {
        try {
            const wishlistKey = `fv_wishlist_${this.username}`;
            const wishlistRaw = localStorage.getItem(wishlistKey);
            if (wishlistRaw) {
                const wishlist = JSON.parse(wishlistRaw);
                if (Array.isArray(wishlist) && wishlist.length > 0) {
                    const items = wishlist.slice(0, 3).map(type => furnitureCatalogue.find(c => c.type === type)).filter(Boolean);
                    if (items.length > 0) return items;
                }
            }
        } catch (e) { /* fallback */ }
        return furnitureCatalogue.slice(0, 3);
    }

    /**
     * Render the empty cart state with product upsell cards
     * @returns {string} HTML string
     * @private
     */
    _renderEmptyState() {
        const recommended = this._getRecommendedItems();
        const cardsHtml = recommended.map(item => {
            const icon = CART_ICONS[item.icon] || CART_ICONS['chair'];
            return `
                <div class="cart-upsell-card">
                    <div class="cart-upsell-card__icon" aria-hidden="true">${icon}</div>
                    <div class="cart-upsell-card__name">${escapeHtml(item.label)}</div>
                    <div class="cart-upsell-card__price">$${Number(item.price).toLocaleString('en-US')}</div>
                    <button type="button" class="btn btn-sm btn-primary cart-upsell-add-btn"
                        data-type="${escapeHtml(item.type)}"
                        data-price="${item.price}">
                        Add to Cart
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="cart-empty">
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                            <circle cx="21" cy="49" r="3" stroke="currentColor" stroke-width="2.5"/>
                            <circle cx="46" cy="49" r="3" stroke="currentColor" stroke-width="2.5"/>
                            <path d="M2 2h8l5.36 26.78a4 4 0 0 0 3.98 3.22h19.44a4 4 0 0 0 3.98-3.22L46 12H12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M24 20h8M28 16v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">Your cart is empty</h3>
                    <p class="empty-description">Browse our furniture catalogue and add items to get started.</p>
                    <button type="button" class="btn btn-primary" id="cart-empty-browse-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Browse Catalogue
                    </button>
                </div>
                ${recommended.length > 0 ? `
                <div class="cart-upsell">
                    <h3 class="cart-upsell__heading">You might like</h3>
                    <div class="cart-upsell__row">${cardsHtml}</div>
                </div>` : ''}
            </div>
        `;
    }

    /**
     * Calculate subtotal from cart items
     * @returns {number} Subtotal
     * @private
     */
    _getSubtotal() {
        return this._cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    /**
     * Attach event listeners
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;

        // Header navigation
        this.container.querySelector('#cart-back-btn')?.addEventListener('click', () => this.onBack());
        this.container.querySelector('#cart-continue-btn')?.addEventListener('click', () => this.onContinueShopping());
        this.container.querySelector('#cart-continue-link')?.addEventListener('click', () => this.onContinueShopping());
        this.container.querySelector('#cart-empty-browse-btn')?.addEventListener('click', () => this.onContinueShopping());

        // Upsell add-to-cart buttons (empty state)
        this.container.querySelectorAll('.cart-upsell-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const price = Number(btn.dataset.price) || 0;
                this.onAddToCart(type, price);
                Toast.success('Added to cart');
            });
        });

        // Checkout
        this.container.querySelector('#cart-checkout-btn')?.addEventListener('click', () => this.onCheckout());

        // Clear cart
        this.container.querySelector('#cart-clear-btn')?.addEventListener('click', () => {
            Modal.show({
                title: 'Clear Cart',
                content: '<p>Are you sure you want to remove all items from your cart?</p>',
                confirmText: 'Clear All',
                cancelText: 'Keep Items',
                variant: 'danger',
                onConfirm: () => this.onClearCart()
            });
        });

        // Item actions (event delegation on item list)
        const itemList = this.container.querySelector('#cart-items-list');
        if (itemList) {
            itemList.addEventListener('click', (event) => {
                const decBtn = event.target.closest('.cart-qty-dec');
                if (decBtn && !decBtn.disabled) {
                    const type = decBtn.dataset.type;
                    const item = this._cartItems.find(i => i.type === type);
                    if (item && item.quantity > 1) {
                        this.onUpdateQuantity(type, item.quantity - 1);
                    }
                    return;
                }

                const incBtn = event.target.closest('.cart-qty-inc');
                if (incBtn) {
                    const type = incBtn.dataset.type;
                    const item = this._cartItems.find(i => i.type === type);
                    if (item) {
                        this.onUpdateQuantity(type, item.quantity + 1);
                    }
                    return;
                }

                const removeBtn = event.target.closest('.cart-remove-btn');
                if (removeBtn) {
                    const type = removeBtn.dataset.type;
                    this.onRemoveItem(type);
                }
            });
        }
    }

    /**
     * Refresh the cart with updated items (re-renders the full view)
     * @param {Array<{type: string, quantity: number, price: number}>} cartItems - Updated cart items
     */
    refresh(cartItems) {
        if (!this.container) return;
        this._cartItems = Array.isArray(cartItems) ? cartItems : [];
        this._buildDOM();
        this._attachEventListeners();
    }

    /**
     * Clean up the view and release references
     */
    destroy() {
        this.container = null;
        this._cartItems = [];
    }
}

export { CartView };
export default CartView;
