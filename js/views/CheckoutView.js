/**
 * FurnishView — Checkout View
 *
 * Multi-step checkout flow: Delivery Details → Payment → Order Confirmation.
 * Front-end only mock — no real payment processing.
 *
 * Steps:
 *  1. Delivery Details — name, email, address, city, postcode, phone
 *  2. Payment Details — card number, cardholder, expiry, CVV, visual card preview
 *  3. Order Confirmation — success animation, order ref, receipt download
 *
 * Implements Nielsen Heuristics:
 *  - #1 Visibility (step indicator, field validation, order totals)
 *  - #3 User control (back to previous step, edit fields)
 *  - #5 Error prevention (inline validation, disabled submit until valid)
 *  - #9 Help users recognise & recover (field-level error messages)
 *  - #10 Help and documentation (input hints, expected formats)
 *
 * @file js/views/CheckoutView.js
 * @module views/CheckoutView
 */

import { getFurnitureByType } from '../data/furnitureCatalogue.js';
import { Toast } from './components/Toast.js';

/** Delivery fee in USD */
const DELIVERY_FEE = 49.99;

/** Free delivery threshold in USD */
const FREE_DELIVERY_THRESHOLD = 500;

/** Step identifiers */
const STEPS = ['delivery', 'payment', 'confirmation'];

/**
 * Escape HTML to prevent XSS
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
 * Format a price in USD
 * @param {number} price
 * @returns {string} e.g., "$599.00"
 * @private
 */
function formatPrice(price) {
    return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format card number with spaces for display (XXXX XXXX XXXX XXXX)
 * @param {string} raw - Digits-only card number
 * @returns {string} Formatted card number
 * @private
 */
function formatCardNumber(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * CheckoutView class
 * Multi-step checkout with delivery, payment, and confirmation
 */
class CheckoutView {
    /**
     * @param {Object} options
     * @param {Function} options.onBack - Navigate back to cart
     * @param {Function} options.onPlaceOrder - Callback: (deliveryDetails) => { success, orderId }
     * @param {Function} options.onContinueDesigning - Navigate back to dashboard after order
     */
    constructor({
        onBack = () => {},
        onPlaceOrder = () => {},
        onContinueDesigning = () => {}
    } = {}) {
        this.onBack = onBack;
        this.onPlaceOrder = onPlaceOrder;
        this.onContinueDesigning = onContinueDesigning;
        this.container = null;
        this._cartItems = [];
        this._currentStep = 0; // 0=delivery, 1=payment, 2=confirmation
        this._deliveryData = {};
        this._orderId = null;
        this._prefill = {};
    }

    /**
     * Render the checkout view
     * @param {HTMLElement} container
     * @param {Array} cartItems - Cart items from storage
     * @param {Object} [prefill] - Pre-filled user data
     * @param {string} [prefill.fullName]
     * @param {string} [prefill.email]
     */
    render(container, cartItems = [], prefill = {}) {
        if (!container) return;
        this.container = container;
        this._cartItems = Array.isArray(cartItems) ? cartItems : [];
        this._prefill = prefill || {};
        this._currentStep = 0;
        this._buildDOM();
    }

    /**
     * Build the full checkout DOM for the current step
     * @private
     */
    _buildDOM() {
        const subtotal = this._getSubtotal();
        const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const total = subtotal + delivery;
        const step = STEPS[this._currentStep];

        this.container.innerHTML = `
            <div class="checkout-view">
                <header class="ck-header">
                    <div class="ck-header__left">
                        ${step !== 'confirmation' ? `
                        <button type="button" class="ck-back-btn" id="ck-back-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            ${this._currentStep === 0 ? 'Back to Cart' : 'Back'}
                        </button>` : '<span></span>'}
                    </div>
                    <div class="ck-header__center">
                        <h1 class="ck-title">Checkout</h1>
                    </div>
                    <div class="ck-header__right"></div>
                </header>

                <!-- Step Indicator -->
                <nav class="ck-steps" aria-label="Checkout progress">
                    ${STEPS.map((s, i) => `
                        <div class="ck-step ${i < this._currentStep ? 'ck-step--done' : ''} ${i === this._currentStep ? 'ck-step--active' : ''}">
                            <span class="ck-step__num">${i < this._currentStep ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : (i + 1)}</span>
                            <span class="ck-step__label">${s === 'delivery' ? 'Delivery' : s === 'payment' ? 'Payment' : 'Confirmation'}</span>
                        </div>
                        ${i < STEPS.length - 1 ? '<div class="ck-step__line' + (i < this._currentStep ? ' ck-step__line--done' : '') + '"></div>' : ''}
                    `).join('')}
                </nav>

                <div class="ck-body">
                    ${step === 'delivery' ? this._renderDeliveryStep() : ''}
                    ${step === 'payment' ? this._renderPaymentStep(subtotal, delivery, total) : ''}
                    ${step === 'confirmation' ? this._renderConfirmationStep(total) : ''}
                </div>
            </div>
        `;

        this._attachEventListeners();
    }

    // =========================================================================
    // STEP 1: DELIVERY DETAILS
    // =========================================================================

    /**
     * @private
     * @returns {string}
     */
    _renderDeliveryStep() {
        const d = this._deliveryData;
        const fn = d.fullName || this._prefill.fullName || '';
        const em = d.email || this._prefill.email || '';

        return `
            <div class="ck-content ck-content--delivery">
                <div class="ck-form">
                    <h2 class="ck-form__title">Delivery Details</h2>
                    <p class="ck-form__subtitle">Where should we deliver your furniture?</p>

                    <div class="ck-field-row">
                        <div class="ck-field">
                            <label class="ck-label" for="ck-fullname">Full Name <span class="ck-required">*</span></label>
                            <input type="text" id="ck-fullname" class="ck-input" value="${escapeHtml(fn)}" autocomplete="name" required />
                            <span class="ck-field-error" id="ck-err-fullname"></span>
                        </div>
                        <div class="ck-field">
                            <label class="ck-label" for="ck-email">Email <span class="ck-required">*</span></label>
                            <input type="email" id="ck-email" class="ck-input" value="${escapeHtml(em)}" autocomplete="email" required />
                            <span class="ck-field-error" id="ck-err-email"></span>
                        </div>
                    </div>

                    <div class="ck-field">
                        <label class="ck-label" for="ck-address">Delivery Address <span class="ck-required">*</span></label>
                        <input type="text" id="ck-address" class="ck-input" value="${escapeHtml(d.address || '')}" autocomplete="street-address" placeholder="123 Main Street, Apt 4B" required />
                        <span class="ck-field-error" id="ck-err-address"></span>
                    </div>

                    <div class="ck-field-row ck-field-row--3">
                        <div class="ck-field">
                            <label class="ck-label" for="ck-city">City <span class="ck-required">*</span></label>
                            <input type="text" id="ck-city" class="ck-input" value="${escapeHtml(d.city || '')}" autocomplete="address-level2" required />
                            <span class="ck-field-error" id="ck-err-city"></span>
                        </div>
                        <div class="ck-field">
                            <label class="ck-label" for="ck-postcode">Postcode <span class="ck-required">*</span></label>
                            <input type="text" id="ck-postcode" class="ck-input" value="${escapeHtml(d.postcode || '')}" autocomplete="postal-code" required />
                            <span class="ck-field-error" id="ck-err-postcode"></span>
                        </div>
                        <div class="ck-field">
                            <label class="ck-label" for="ck-phone">Phone <span class="ck-required">*</span></label>
                            <input type="tel" id="ck-phone" class="ck-input" value="${escapeHtml(d.phone || '')}" autocomplete="tel" placeholder="+1 (555) 123-4567" required />
                            <span class="ck-field-error" id="ck-err-phone"></span>
                        </div>
                    </div>

                    <button type="button" class="btn btn-primary ck-submit-btn" id="ck-delivery-submit">
                        Continue to Payment
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // STEP 2: PAYMENT DETAILS
    // =========================================================================

    /**
     * @private
     * @param {number} subtotal
     * @param {number} delivery
     * @param {number} total
     * @returns {string}
     */
    _renderPaymentStep(subtotal, delivery, total) {
        return `
            <div class="ck-content ck-content--payment">
                <div class="ck-payment-grid">
                    <!-- Payment Form -->
                    <div class="ck-form">
                        <h2 class="ck-form__title">Payment Details</h2>
                        <p class="ck-form__subtitle">Enter your card information below</p>

                        <!-- Visual Card Preview (3D flip) -->
                        <div class="ck-card-scene" id="ck-card-scene">
                            <div class="ck-card-flipper" id="ck-card-flipper">
                                <!-- Front Face -->
                                <div class="ck-card-face ck-card-face--front">
                                    <div class="ck-card-preview__chip"></div>
                                    <div class="ck-card-preview__number" id="ck-card-display">•••• •••• •••• ••••</div>
                                    <div class="ck-card-preview__bottom">
                                        <div>
                                            <span class="ck-card-preview__label">Card Holder</span>
                                            <span class="ck-card-preview__name" id="ck-card-name-display">YOUR NAME</span>
                                        </div>
                                        <div>
                                            <span class="ck-card-preview__label">Expires</span>
                                            <span class="ck-card-preview__expiry" id="ck-card-expiry-display">MM/YY</span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Back Face -->
                                <div class="ck-card-face ck-card-face--back">
                                    <div class="ck-card-back__strip"></div>
                                    <div class="ck-card-back__cvv-area">
                                        <span class="ck-card-back__cvv-label">CVV</span>
                                        <div class="ck-card-back__cvv-box">
                                            <span class="ck-card-back__cvv-value" id="ck-card-cvv-display">•••</span>
                                        </div>
                                    </div>
                                    <div class="ck-card-back__footer">
                                        <span class="ck-card-back__brand">FurnishView</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="ck-field">
                            <label class="ck-label" for="ck-cardnumber">Card Number <span class="ck-required">*</span></label>
                            <input type="text" id="ck-cardnumber" class="ck-input ck-input--mono" placeholder="1234 5678 9012 3456" maxlength="19" autocomplete="cc-number" inputmode="numeric" required />
                            <span class="ck-field-error" id="ck-err-cardnumber"></span>
                        </div>

                        <div class="ck-field">
                            <label class="ck-label" for="ck-cardholder">Cardholder Name <span class="ck-required">*</span></label>
                            <input type="text" id="ck-cardholder" class="ck-input" placeholder="As shown on card" autocomplete="cc-name" required />
                            <span class="ck-field-error" id="ck-err-cardholder"></span>
                        </div>

                        <div class="ck-field-row">
                            <div class="ck-field">
                                <label class="ck-label" for="ck-expiry">Expiry Date <span class="ck-required">*</span></label>
                                <input type="text" id="ck-expiry" class="ck-input ck-input--mono" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp" inputmode="numeric" required />
                                <span class="ck-field-error" id="ck-err-expiry"></span>
                            </div>
                            <div class="ck-field">
                                <label class="ck-label" for="ck-cvv">CVV <span class="ck-required">*</span></label>
                                <input type="password" id="ck-cvv" class="ck-input ck-input--mono" placeholder="•••" maxlength="3" autocomplete="cc-csc" inputmode="numeric" required />
                                <span class="ck-field-error" id="ck-err-cvv"></span>
                            </div>
                        </div>

                        <button type="button" class="btn btn-primary ck-submit-btn" id="ck-payment-submit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                            Place Order - ${formatPrice(total)}
                        </button>
                    </div>

                    <!-- Order Summary Sidebar -->
                    <aside class="ck-order-summary">
                        <h3 class="ck-order-summary__title">Order Summary</h3>
                        <div class="ck-order-summary__items">
                            ${this._cartItems.map(item => {
                                const cat = getFurnitureByType(item.type);
                                const name = cat ? escapeHtml(cat.label) : escapeHtml(item.type);
                                return `
                                <div class="ck-order-item">
                                    <span class="ck-order-item__name">${name} <span class="ck-order-item__qty">×${item.quantity}</span></span>
                                    <span class="ck-order-item__price">${formatPrice(item.price * item.quantity)}</span>
                                </div>`;
                            }).join('')}
                        </div>
                        <div class="ck-order-summary__divider"></div>
                        <div class="ck-order-summary__row">
                            <span>Subtotal</span><span>${formatPrice(subtotal)}</span>
                        </div>
                        <div class="ck-order-summary__row">
                            <span>Delivery</span><span>${delivery === 0 ? '<span class="cart-free-delivery">Free</span>' : formatPrice(delivery)}</span>
                        </div>
                        <div class="ck-order-summary__divider"></div>
                        <div class="ck-order-summary__row ck-order-summary__row--total">
                            <span>Total</span><span>${formatPrice(total)}</span>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // STEP 3: ORDER CONFIRMATION
    // =========================================================================

    /**
     * @private
     * @param {number} total
     * @returns {string}
     */
    _renderConfirmationStep(total) {
        const itemCount = this._cartItems.reduce((s, i) => s + i.quantity, 0);

        return `
            <div class="ck-content ck-content--confirmation">
                <div class="ck-confirmation">
                    <div class="ck-confirmation__icon">
                        <svg class="ck-checkmark" viewBox="0 0 52 52" width="72" height="72">
                            <circle class="ck-checkmark__circle" cx="26" cy="26" r="25" fill="none" stroke="#16A34A" stroke-width="2"/>
                            <path class="ck-checkmark__check" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>

                    <h2 class="ck-confirmation__title">Order Confirmed!</h2>
                    <p class="ck-confirmation__ref">Order Reference: <strong>${escapeHtml(this._orderId || 'FV-0000-00000')}</strong></p>

                    <div class="ck-confirmation__summary">
                        <div class="ck-confirmation__row">
                            <span>Items</span><span>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
                        </div>
                        <div class="ck-confirmation__row">
                            <span>Delivery to</span><span>${escapeHtml(this._deliveryData.fullName || '')}</span>
                        </div>
                        <div class="ck-confirmation__row">
                            <span>Address</span><span>${escapeHtml(this._deliveryData.address || '')}, ${escapeHtml(this._deliveryData.city || '')}</span>
                        </div>
                        <div class="ck-confirmation__divider"></div>
                        <div class="ck-confirmation__row ck-confirmation__row--total">
                            <span>Total Paid</span><span>${formatPrice(total)}</span>
                        </div>
                    </div>

                    <p class="ck-confirmation__delivery-note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        Your furniture will be delivered in 5–7 business days.
                    </p>

                    <div class="ck-confirmation__actions">
                        <button type="button" class="btn btn-primary" id="ck-continue-designing">
                            Continue Designing
                        </button>
                        <button type="button" class="btn btn-secondary" id="ck-download-receipt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Receipt
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /** @private */
    _getSubtotal() {
        return this._cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================

    /** @private */
    _attachEventListeners() {
        if (!this.container) return;
        const step = STEPS[this._currentStep];

        // Back button
        this.container.querySelector('#ck-back-btn')?.addEventListener('click', () => {
            if (this._currentStep === 0) {
                this.onBack();
            } else {
                this._currentStep--;
                this._buildDOM();
            }
        });

        if (step === 'delivery') this._attachDeliveryListeners();
        if (step === 'payment') this._attachPaymentListeners();
        if (step === 'confirmation') this._attachConfirmationListeners();
    }

    /** @private */
    _attachDeliveryListeners() {
        const btn = this.container.querySelector('#ck-delivery-submit');
        if (!btn) return;

        btn.addEventListener('click', () => {
            if (this._validateDelivery()) {
                this._currentStep = 1;
                this._buildDOM();
            }
        });
    }

    /** @private */
    _attachPaymentListeners() {
        const cardInput = this.container.querySelector('#ck-cardnumber');
        const holderInput = this.container.querySelector('#ck-cardholder');
        const expiryInput = this.container.querySelector('#ck-expiry');
        const cvvInput = this.container.querySelector('#ck-cvv');
        const cardDisplay = this.container.querySelector('#ck-card-display');
        const nameDisplay = this.container.querySelector('#ck-card-name-display');
        const expiryDisplay = this.container.querySelector('#ck-card-expiry-display');
        const cvvDisplay = this.container.querySelector('#ck-card-cvv-display');
        const flipper = this.container.querySelector('#ck-card-flipper');

        // Live card preview updates
        cardInput?.addEventListener('input', () => {
            let raw = cardInput.value.replace(/\D/g, '').slice(0, 16);
            cardInput.value = formatCardNumber(raw);
            if (cardDisplay) {
                cardDisplay.textContent = raw.length > 0
                    ? formatCardNumber(raw.padEnd(16, '•'))
                    : '•••• •••• •••• ••••';
            }
        });

        holderInput?.addEventListener('input', () => {
            if (nameDisplay) {
                nameDisplay.textContent = holderInput.value.trim().toUpperCase() || 'YOUR NAME';
            }
        });

        expiryInput?.addEventListener('input', () => {
            let raw = expiryInput.value.replace(/\D/g, '').slice(0, 4);
            if (raw.length >= 3) {
                raw = raw.slice(0, 2) + '/' + raw.slice(2);
            }
            expiryInput.value = raw;
            if (expiryDisplay) {
                expiryDisplay.textContent = raw || 'MM/YY';
                // Highlight animation on update
                expiryDisplay.classList.remove('ck-expiry-flash');
                void expiryDisplay.offsetWidth; // force reflow to restart animation
                expiryDisplay.classList.add('ck-expiry-flash');
            }
        });

        // CVV input — restrict to digits and update back-face preview
        cvvInput?.addEventListener('input', () => {
            cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 3);
            if (cvvDisplay) {
                const len = cvvInput.value.length;
                cvvDisplay.textContent = len > 0 ? '•'.repeat(len) : '•••';
            }
        });

        // CVV focus → flip card to back
        cvvInput?.addEventListener('focus', () => {
            flipper?.classList.add('ck-card-flipper--flipped');
        });

        // CVV blur → flip card back to front
        cvvInput?.addEventListener('blur', () => {
            flipper?.classList.remove('ck-card-flipper--flipped');
        });

        // Also flip back if any other input gets focus
        [cardInput, holderInput, expiryInput].forEach(input => {
            input?.addEventListener('focus', () => {
                flipper?.classList.remove('ck-card-flipper--flipped');
            });
        });

        // Submit
        const btn = this.container.querySelector('#ck-payment-submit');
        btn?.addEventListener('click', () => {
            if (this._validatePayment()) {
                this._handlePlaceOrder();
            }
        });
    }

    /** @private */
    _attachConfirmationListeners() {
        this.container.querySelector('#ck-continue-designing')?.addEventListener('click', () => {
            this.onContinueDesigning();
        });

        this.container.querySelector('#ck-download-receipt')?.addEventListener('click', () => {
            this._downloadReceipt();
        });
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    /** @private */
    _validateDelivery() {
        const fields = {
            fullname: this.container.querySelector('#ck-fullname'),
            email: this.container.querySelector('#ck-email'),
            address: this.container.querySelector('#ck-address'),
            city: this.container.querySelector('#ck-city'),
            postcode: this.container.querySelector('#ck-postcode'),
            phone: this.container.querySelector('#ck-phone')
        };

        let valid = true;

        // Full name
        if (!fields.fullname?.value.trim()) {
            this._showFieldError('fullname', 'Full name is required');
            valid = false;
        } else {
            this._clearFieldError('fullname');
        }

        // Email
        const emailVal = fields.email?.value.trim() || '';
        if (!emailVal) {
            this._showFieldError('email', 'Email is required');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            this._showFieldError('email', 'Please enter a valid email');
            valid = false;
        } else {
            this._clearFieldError('email');
        }

        // Address
        if (!fields.address?.value.trim()) {
            this._showFieldError('address', 'Address is required');
            valid = false;
        } else {
            this._clearFieldError('address');
        }

        // City
        if (!fields.city?.value.trim()) {
            this._showFieldError('city', 'City is required');
            valid = false;
        } else {
            this._clearFieldError('city');
        }

        // Postcode
        if (!fields.postcode?.value.trim()) {
            this._showFieldError('postcode', 'Postcode is required');
            valid = false;
        } else {
            this._clearFieldError('postcode');
        }

        // Phone
        const phoneVal = fields.phone?.value.trim() || '';
        if (!phoneVal) {
            this._showFieldError('phone', 'Phone number is required');
            valid = false;
        } else if (phoneVal.replace(/\D/g, '').length < 7) {
            this._showFieldError('phone', 'Please enter a valid phone number');
            valid = false;
        } else {
            this._clearFieldError('phone');
        }

        if (valid) {
            this._deliveryData = {
                fullName: fields.fullname.value.trim(),
                email: fields.email.value.trim(),
                address: fields.address.value.trim(),
                city: fields.city.value.trim(),
                postcode: fields.postcode.value.trim(),
                phone: fields.phone.value.trim()
            };
        }

        return valid;
    }

    /** @private */
    _validatePayment() {
        const cardInput = this.container.querySelector('#ck-cardnumber');
        const holderInput = this.container.querySelector('#ck-cardholder');
        const expiryInput = this.container.querySelector('#ck-expiry');
        const cvvInput = this.container.querySelector('#ck-cvv');

        let valid = true;

        // Card number — 16 digits
        const cardDigits = (cardInput?.value || '').replace(/\D/g, '');
        if (cardDigits.length !== 16) {
            this._showFieldError('cardnumber', 'Card number must be 16 digits');
            valid = false;
        } else {
            this._clearFieldError('cardnumber');
        }

        // Cardholder
        if (!(holderInput?.value.trim())) {
            this._showFieldError('cardholder', 'Cardholder name is required');
            valid = false;
        } else {
            this._clearFieldError('cardholder');
        }

        // Expiry — MM/YY, must be in future
        const expiryVal = (expiryInput?.value || '').trim();
        const expiryMatch = expiryVal.match(/^(\d{2})\/(\d{2})$/);
        if (!expiryMatch) {
            this._showFieldError('expiry', 'Use format MM/YY');
            valid = false;
        } else {
            const month = parseInt(expiryMatch[1], 10);
            const year = 2000 + parseInt(expiryMatch[2], 10);
            const now = new Date();
            const expDate = new Date(year, month); // First day of month AFTER expiry
            if (month < 1 || month > 12) {
                this._showFieldError('expiry', 'Invalid month');
                valid = false;
            } else if (expDate <= now) {
                this._showFieldError('expiry', 'Card has expired');
                valid = false;
            } else {
                this._clearFieldError('expiry');
            }
        }

        // CVV — 3 digits
        const cvvVal = (cvvInput?.value || '').replace(/\D/g, '');
        if (cvvVal.length !== 3) {
            this._showFieldError('cvv', 'CVV must be 3 digits');
            valid = false;
        } else {
            this._clearFieldError('cvv');
        }

        return valid;
    }

    /** @private */
    _showFieldError(fieldName, message) {
        const el = this.container?.querySelector(`#ck-err-${fieldName}`);
        const input = this.container?.querySelector(`#ck-${fieldName}`);
        if (el) el.textContent = message;
        if (input) input.classList.add('ck-input--error');
    }

    /** @private */
    _clearFieldError(fieldName) {
        const el = this.container?.querySelector(`#ck-err-${fieldName}`);
        const input = this.container?.querySelector(`#ck-${fieldName}`);
        if (el) el.textContent = '';
        if (input) input.classList.remove('ck-input--error');
    }

    // =========================================================================
    // ORDER PLACEMENT
    // =========================================================================

    /** @private */
    _handlePlaceOrder() {
        const result = this.onPlaceOrder(this._deliveryData);

        if (result && result.success) {
            this._orderId = result.orderId;
            Toast.success('Order placed successfully!');
            this._currentStep = 2;
            this._buildDOM();
        } else {
            Toast.error('Failed to place order. Please try again.');
        }
    }

    // =========================================================================
    // RECEIPT DOWNLOAD
    // =========================================================================

    /** @private */
    _downloadReceipt() {
        const subtotal = this._getSubtotal();
        const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const total = subtotal + delivery;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let lines = [
            '═══════════════════════════════════════════',
            '           FURNISHVIEW RECEIPT             ',
            '═══════════════════════════════════════════',
            '',
            `Order Reference:  ${this._orderId || 'N/A'}`,
            `Date:             ${date}`,
            '',
            '───────────────────────────────────────────',
            'DELIVERY TO',
            '───────────────────────────────────────────',
            `${this._deliveryData.fullName || ''}`,
            `${this._deliveryData.address || ''}`,
            `${this._deliveryData.city || ''} ${this._deliveryData.postcode || ''}`,
            `Phone: ${this._deliveryData.phone || ''}`,
            `Email: ${this._deliveryData.email || ''}`,
            '',
            '───────────────────────────────────────────',
            'ORDER ITEMS',
            '───────────────────────────────────────────',
        ];

        for (const item of this._cartItems) {
            const cat = getFurnitureByType(item.type);
            const name = cat ? cat.label : item.type;
            const lineTotal = item.price * item.quantity;
            lines.push(`${name} (x${item.quantity})`.padEnd(30) + formatPrice(lineTotal));
        }

        lines.push('');
        lines.push('───────────────────────────────────────────');
        lines.push('Subtotal'.padEnd(30) + formatPrice(subtotal));
        lines.push('Delivery'.padEnd(30) + (delivery === 0 ? 'Free' : formatPrice(delivery)));
        lines.push('═══════════════════════════════════════════');
        lines.push('TOTAL'.padEnd(30) + formatPrice(total));
        lines.push('═══════════════════════════════════════════');
        lines.push('');
        lines.push('Thank you for shopping with FurnishView!');
        lines.push('Your furniture will arrive in 5-7 business days.');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FurnishView-Receipt-${this._orderId || 'order'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('Receipt downloaded');
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    destroy() {
        this.container = null;
        this._cartItems = [];
        this._deliveryData = {};
    }
}

export { CheckoutView };
export default CheckoutView;
