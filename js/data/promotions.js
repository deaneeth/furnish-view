/**
 * FurnishView — Promotions & Discount Codes
 */
export const PROMO_CODES = [
    { code: 'WELCOME10', type: 'percent', value: 10, description: '10% off your first order', minOrder: 0 },
    { code: 'SUMMER20', type: 'percent', value: 20, description: '20% summer sale discount', minOrder: 200 },
    { code: 'FURNISH50', type: 'fixed', value: 50, description: '$50 off orders over $500', minOrder: 500 },
    { code: 'DESIGN15', type: 'percent', value: 15, description: '15% off for designers', minOrder: 100 },
    { code: 'NEWROOM', type: 'fixed', value: 25, description: '$25 off any order', minOrder: 0 }
];

export function validatePromoCode(code, orderTotal) {
    if (!code || typeof code !== 'string') return null;
    const promo = PROMO_CODES.find(p => p.code === code.trim().toUpperCase());
    if (!promo) return { valid: false, message: 'Invalid promo code' };
    if (orderTotal < promo.minOrder) return { valid: false, message: `Minimum order $${promo.minOrder} required` };
    return { valid: true, promo };
}

export function calculateDiscount(promo, subtotal) {
    if (!promo) return 0;
    if (promo.type === 'percent') return Math.round(subtotal * promo.value / 100 * 100) / 100;
    if (promo.type === 'fixed') return Math.min(promo.value, subtotal);
    return 0;
}
