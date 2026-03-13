/**
 * FurnishView — Event Bus
 *
 * A lightweight pub/sub wrapper around the browser's CustomEvent API.
 * All events are dispatched on `window` so any module can listen without
 * importing this file.  The `FV_` prefix prevents collisions.
 *
 * Events emitted by the app:
 *   FV_order_created   — { orderId, username, total }
 *   FV_order_updated   — { orderId, status }
 *   FV_inventory_changed — { type, newStock }
 *   FV_cart_changed    — { username }
 *   FV_wishlist_changed — { username, type, inWishlist }
 *
 * @file js/utils/eventBus.js
 * @module utils/eventBus
 */

const PREFIX = 'FV_';

/**
 * Emit an application event.
 * @param {string} event - Event name (without prefix)
 * @param {Object} [detail={}] - Event payload
 */
function emit(event, detail = {}) {
    window.dispatchEvent(new CustomEvent(PREFIX + event, { detail }));
}

/**
 * Subscribe to an application event.
 * @param {string} event - Event name (without prefix)
 * @param {Function} handler - Callback receiving (event.detail)
 * @returns {Function} Unsubscribe function
 */
function on(event, handler) {
    const wrapped = (e) => handler(e.detail);
    window.addEventListener(PREFIX + event, wrapped);
    return () => window.removeEventListener(PREFIX + event, wrapped);
}

/**
 * Subscribe to an event once.
 * @param {string} event - Event name (without prefix)
 * @param {Function} handler - Callback receiving (event.detail)
 */
function once(event, handler) {
    const off = on(event, (detail) => {
        handler(detail);
        off();
    });
}

export { emit, on, once };
