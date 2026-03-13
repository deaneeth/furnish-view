/**
 * FurnishView — Dashboard View
 *
 * Renders the design portfolio/dashboard showing saved designs with
 * canvas-generated thumbnail previews for each design card.
 * Admin users also get Orders, Customers, and Analytics management tabs.
 *
 * Implements Nielsen Heuristics:
 * - #1 Visibility of system status (design count, thumbnails, empty state, order status chips)
 * - #5 Error prevention (delete confirmation via Modal)
 * - #7 Flexibility (multiple ways to access designs, tab navigation for admin)
 * - #8 Aesthetic and minimalist design (clean card layout)
 *
 * @file js/views/DashboardView.js
 * @module views/DashboardView
 */

import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';
import { loadSampleData, getAllDesigns, getAllOrders, getUsers, getInventory } from '../utils/storage.js';
import { furnitureCatalogue } from '../data/furnitureCatalogue.js';
import { on } from '../utils/eventBus.js';

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

/** Furniture type -> label lookup built from catalogue */
const FURNITURE_LABEL_MAP = Object.fromEntries(
    furnitureCatalogue.map(f => [f.type, f.label])
);

/** Order status display config */
const ORDER_STATUS_CONFIG = {
    confirmed:  { label: 'Confirmed',  colour: '#2563EB', bg: '#EFF6FF' },
    processing: { label: 'Processing', colour: '#D97706', bg: '#FFFBEB' },
    shipped:    { label: 'Shipped',    colour: '#7C3AED', bg: '#F5F3FF' },
    delivered:  { label: 'Delivered',  colour: '#059669', bg: '#ECFDF5' },
    cancelled:  { label: 'Cancelled',  colour: '#DC2626', bg: '#FEF2F2' }
};

const VALID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

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
 * Format a currency value as $X,XXX.XX
 * @param {number} value
 * @returns {string}
 * @private
 */
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '$0.00';
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Get initials from a full name (up to 2 chars)
 * @param {string} name
 * @returns {string}
 * @private
 */
function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * DashboardView class
 * Manages the design portfolio grid with canvas-generated thumbnails.
 * Admin users also see Orders, Customers, and Analytics tabs.
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
     * @param {Function} options.onViewAllOrders - Callback for view all orders action
     * @param {Function} options.onManageInventory - Callback for manage inventory action
     * @param {Function} options.onUpdateOrderStatus - Callback when order status changes (orderId, newStatus)
     */
    constructor({
        onNewDesign = () => {},
        onOpenDesign = () => {},
        onDeleteDesign = () => {},
        onLogout = () => {},
        onCompareDesigns = () => {},
        onViewAllOrders = () => {},
        onManageInventory = () => {},
        onUpdateOrderStatus = () => {}
    } = {}) {
        this.onNewDesign = onNewDesign;
        this.onOpenDesign = onOpenDesign;
        this.onDeleteDesign = onDeleteDesign;
        this.onLogout = onLogout;
        this.onCompareDesigns = onCompareDesigns;
        this.onViewAllOrders = onViewAllOrders;
        this.onManageInventory = onManageInventory;
        this.onUpdateOrderStatus = onUpdateOrderStatus;
        this.container = null;
        this.designs = [];
        this.username = '';
        this._extraData = {};
    }

    /**
     * Render the dashboard view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} designs - Array of saved designs to display
     * @param {string} username - Current user's name
     * @param {Object} extraData - Extra data for admin tabs: { orders, allUsers, inventory, isAdmin }
     */
    render(container, designs = [], username = '', extraData = {}) {
        if (!container) return;

        this.container = container;
        this.designs = Array.isArray(designs) ? designs : [];
        this.username = escapeHtml(username || 'User');
        this._extraData = extraData || {};

        const isAdmin = !!extraData.isAdmin;

        const hasDesigns = this.designs.length > 0;
        const canCompare = this.designs.length >= 2;
        const designCountText = this.designs.length === 1
            ? '1 design'
            : `${this.designs.length} designs`;

        this._injectStyles();

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
                    ${isAdmin ? this._renderTabBar() : ''}

                    <!-- Designs Tab Panel -->
                    <div id="tab-designs" class="adm-tab-panel${isAdmin ? ' adm-tab-panel--active' : ''}">
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
                    </div>

                    ${isAdmin ? this._renderOrdersPanel(extraData.orders) : ''}
                    ${isAdmin ? this._renderCustomersPanel(extraData.allUsers) : ''}
                    ${isAdmin ? this._renderAnalyticsPanel(extraData.orders, extraData.allUsers) : ''}
                </main>
            </div>
        `;

        this._attachEventListeners();
        if (isAdmin) this._bindTabEvents();

        // Generate thumbnails after DOM is ready
        if (hasDesigns) {
            requestAnimationFrame(() => this._generateThumbnails());
        }
    }

    // =========================================================================
    // TAB NAVIGATION
    // =========================================================================

    /**
     * Render the admin tab bar
     * @returns {string} HTML string
     * @private
     */
    _renderTabBar() {
        const tabs = [
            { id: 'designs',   label: 'Designs',   icon: '🗂' },
            { id: 'orders',    label: 'Orders',     icon: '📦' },
            { id: 'customers', label: 'Customers',  icon: '👥' },
            { id: 'analytics', label: 'Analytics',  icon: '📊' }
        ];

        const tabButtons = tabs.map(t => `
            <button
                type="button"
                class="adm-tab-btn${t.id === 'designs' ? ' adm-tab-btn--active' : ''}"
                data-tab="${t.id}"
                aria-selected="${t.id === 'designs'}"
            >
                <span aria-hidden="true">${t.icon}</span>
                ${t.label}
            </button>
        `).join('');

        return `<nav class="adm-tab-bar" role="tablist" aria-label="Admin sections">${tabButtons}</nav>`;
    }

    /**
     * Bind tab click events — show/hide panels
     * @private
     */
    _bindTabEvents() {
        const tabBar = this.container.querySelector('.adm-tab-bar');
        if (!tabBar) return;

        tabBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.adm-tab-btn');
            if (!btn) return;

            const targetTab = btn.dataset.tab;

            // Update button states
            tabBar.querySelectorAll('.adm-tab-btn').forEach(b => {
                b.classList.toggle('adm-tab-btn--active', b.dataset.tab === targetTab);
                b.setAttribute('aria-selected', b.dataset.tab === targetTab ? 'true' : 'false');
            });

            // Show/hide panels
            this.container.querySelectorAll('.adm-tab-panel').forEach(panel => {
                panel.classList.toggle('adm-tab-panel--active', panel.id === `tab-${targetTab}`);
            });
        });

        // Wire real-time events
        this._bindRealtimeEvents();
    }

    /**
     * Subscribe to storage events and refresh affected panels live.
     * Unsubscribers are stored so destroy() can clean them up.
     * @private
     */
    _bindRealtimeEvents() {
        this._realtimeUnsubs = this._realtimeUnsubs || [];

        const refresh = () => this._refreshLiveData();

        // ── Same-tab events (CustomEvent bus) ──
        // Fired when mutations happen within this tab
        this._realtimeUnsubs.push(on('order_created',    refresh));
        this._realtimeUnsubs.push(on('order_updated',    refresh));
        this._realtimeUnsubs.push(on('inventory_changed', refresh));
        this._realtimeUnsubs.push(on('user_registered',  refresh));

        // ── Cross-tab events (native browser storage event) ──
        // The browser fires `storage` on every OTHER open tab whenever localStorage
        // is written. This is the standard zero-server alternative to WebSockets
        // for multi-tab synchronisation.
        const WATCHED_KEYS = new Set([
            'furnishview_orders',
            'furnishview_users',
            'furnishview_inventory'
        ]);

        const storageHandler = (e) => {
            // e.key === null means localStorage.clear() was called
            if (e.key === null || WATCHED_KEYS.has(e.key)) {
                refresh();
            }
        };

        window.addEventListener('storage', storageHandler);
        this._realtimeUnsubs.push(() => window.removeEventListener('storage', storageHandler));
    }

    /**
     * Pull fresh data from storage and re-render all live panels in-place.
     * Only replaces panel innerHTML — does not re-render the whole view.
     * @private
     */
    _refreshLiveData() {
        if (!this.container) return;

        const freshOrders = getAllOrders();
        const freshUsers  = getUsers();
        const freshInv    = getInventory();

        // Update stored extraData so refreshDesigns() keeps it
        this._extraData = { ...this._extraData, orders: freshOrders, allUsers: freshUsers, inventory: freshInv };

        // Replace a panel element with new HTML while preserving the --active class.
        // Using replaceWith avoids the nested-wrapper bug caused by setting innerHTML
        // when the render methods already return a full <div id="tab-*"> wrapper.
        const replacePanel = (id, html) => {
            const el = this.container.querySelector(`#${id}`);
            if (!el) return;
            const wasActive = el.classList.contains('adm-tab-panel--active');
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            const newEl = tmp.firstElementChild;
            if (!newEl) return;
            if (wasActive) newEl.classList.add('adm-tab-panel--active');
            el.replaceWith(newEl);
        };

        replacePanel('tab-orders',    this._renderOrdersPanel(freshOrders));
        replacePanel('tab-customers', this._renderCustomersPanel(freshUsers));
        replacePanel('tab-analytics', this._renderAnalyticsPanel(freshOrders, freshUsers));

        // Re-bind status dropdowns on the newly inserted orders panel
        this._bindOrderStatusEvents();
    }

    /**
     * Bind the order status <select> change events inside the orders panel.
     * Called after every live refresh of the orders panel.
     * @private
     */
    _bindOrderStatusEvents() {
        const tbody = this.container.querySelector('#orders-table-body');
        if (!tbody) return;

        tbody.addEventListener('change', (e) => {
            const sel = e.target.closest('.adm-status-select');
            if (!sel) return;
            const orderId = sel.dataset.orderId;
            const newStatus = sel.value;
            if (orderId && newStatus && typeof this.onUpdateOrderStatus === 'function') {
                this.onUpdateOrderStatus(orderId, newStatus);
                // Update the adjacent status chip optimistically
                const chip = sel.closest('tr')?.querySelector('.adm-status-chip');
                if (chip) {
                    const cfg = ORDER_STATUS_CONFIG[newStatus] || ORDER_STATUS_CONFIG.confirmed;
                    chip.textContent = cfg.label;
                    chip.style.color = cfg.color;
                    chip.style.background = cfg.bg;
                }
            }
        }, { once: false });
    }

    // =========================================================================
    // ORDERS TAB
    // =========================================================================

    /**
     * Render the Orders tab panel
     * @param {Array} orders - All orders array
     * @returns {string} HTML string
     * @private
     */
    _renderOrdersPanel(orders) {
        const list = Array.isArray(orders) ? orders : [];

        const totalOrders = list.length;
        const totalRevenue = list.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const statsHtml = `
            <div class="adm-stats-row">
                <div class="adm-stat-card">
                    <span class="adm-stat-label">Total Orders</span>
                    <span class="adm-stat-value">${totalOrders}</span>
                </div>
                <div class="adm-stat-card">
                    <span class="adm-stat-label">Revenue</span>
                    <span class="adm-stat-value">${formatCurrency(totalRevenue)}</span>
                </div>
                <div class="adm-stat-card">
                    <span class="adm-stat-label">Avg Order Value</span>
                    <span class="adm-stat-value">${formatCurrency(avgOrderValue)}</span>
                </div>
            </div>
        `;

        let tableBodyHtml;
        if (list.length === 0) {
            tableBodyHtml = `
                <tr>
                    <td colspan="7" class="adm-table-empty">No orders found</td>
                </tr>
            `;
        } else {
            tableBodyHtml = list.map(order => {
                const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.confirmed;
                const itemsText = Array.isArray(order.items)
                    ? order.items.map(i => {
                        const label = FURNITURE_LABEL_MAP[i.type] || i.type;
                        return `${i.quantity}× ${label}`;
                    }).join(', ')
                    : '—';

                const statusOptions = VALID_STATUSES.map(s => {
                    const cfg = ORDER_STATUS_CONFIG[s];
                    return `<option value="${s}" ${order.status === s ? 'selected' : ''}>${cfg.label}</option>`;
                }).join('');

                return `
                    <tr class="adm-table-row" data-order-id="${escapeHtml(order.orderId)}">
                        <td class="adm-td adm-td--id">${escapeHtml(order.orderId)}</td>
                        <td class="adm-td">${escapeHtml(order.username || '—')}</td>
                        <td class="adm-td adm-td--date">${formatDate(order.createdAt)}</td>
                        <td class="adm-td adm-td--items" title="${escapeHtml(itemsText)}">${escapeHtml(itemsText)}</td>
                        <td class="adm-td adm-td--total">${formatCurrency(Number(order.total) || 0)}</td>
                        <td class="adm-td">
                            <span class="adm-status-chip" style="color:${statusCfg.colour};background:${statusCfg.bg}">
                                ${statusCfg.label}
                            </span>
                        </td>
                        <td class="adm-td adm-td--actions">
                            <select class="adm-status-select" data-order-id="${escapeHtml(order.orderId)}" aria-label="Change status for ${escapeHtml(order.orderId)}">
                                ${statusOptions}
                            </select>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <div id="tab-orders" class="adm-tab-panel">
                <div class="adm-panel-header">
                    <h2 class="adm-panel-title">Orders</h2>
                </div>
                ${statsHtml}
                <div class="adm-table-wrapper">
                    <table class="adm-table" aria-label="All orders">
                        <thead>
                            <tr>
                                <th class="adm-th">Order ID</th>
                                <th class="adm-th">Customer</th>
                                <th class="adm-th">Date</th>
                                <th class="adm-th">Items</th>
                                <th class="adm-th">Total</th>
                                <th class="adm-th">Status</th>
                                <th class="adm-th">Change Status</th>
                            </tr>
                        </thead>
                        <tbody id="orders-table-body">
                            ${tableBodyHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // CUSTOMERS TAB
    // =========================================================================

    /**
     * Render the Customers tab panel
     * @param {Array} allUsers - All user objects from storage
     * @returns {string} HTML string
     * @private
     */
    _renderCustomersPanel(allUsers) {
        const users = Array.isArray(allUsers) ? allUsers : [];
        const customers = users.filter(u => u.role === 'user');

        // Build order stats per username
        let allOrders = [];
        try { allOrders = getAllOrders(); } catch { /* ignore */ }

        const ordersByUser = {};
        allOrders.forEach(o => {
            const key = (o.username || '').toLowerCase();
            if (!ordersByUser[key]) ordersByUser[key] = { count: 0, spent: 0 };
            ordersByUser[key].count++;
            ordersByUser[key].spent += Number(o.total) || 0;
        });

        let cardsHtml;
        if (customers.length === 0) {
            cardsHtml = `<p class="adm-empty-msg">No customers registered yet.</p>`;
        } else {
            cardsHtml = `<div class="adm-customer-grid">` + customers.map(u => {
                const key = (u.username || '').toLowerCase();
                const stats = ordersByUser[key] || { count: 0, spent: 0 };
                const initials = getInitials(u.fullName || u.username);
                return `
                    <div class="adm-customer-card">
                        <div class="adm-customer-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
                        <div class="adm-customer-info">
                            <p class="adm-customer-name">${escapeHtml(u.fullName || u.username)}</p>
                            <p class="adm-customer-meta">@${escapeHtml(u.username)}</p>
                            <p class="adm-customer-meta">${escapeHtml(u.email || '—')}</p>
                            <p class="adm-customer-meta">Joined: ${formatDate(u.createdAt)}</p>
                        </div>
                        <div class="adm-customer-stats">
                            <div class="adm-cstat">
                                <span class="adm-cstat-value">${stats.count}</span>
                                <span class="adm-cstat-label">Orders</span>
                            </div>
                            <div class="adm-cstat">
                                <span class="adm-cstat-value">${formatCurrency(stats.spent)}</span>
                                <span class="adm-cstat-label">Spent</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') + `</div>`;
        }

        return `
            <div id="tab-customers" class="adm-tab-panel">
                <div class="adm-panel-header">
                    <h2 class="adm-panel-title">Customers</h2>
                    <span class="adm-panel-subtitle">${customers.length} registered customer${customers.length !== 1 ? 's' : ''}</span>
                </div>
                ${cardsHtml}
            </div>
        `;
    }

    // =========================================================================
    // ANALYTICS TAB
    // =========================================================================

    /**
     * Render the Analytics tab panel
     * @param {Array} orders - All orders
     * @param {Array} allUsers - All users
     * @returns {string} HTML string
     * @private
     */
    _renderAnalyticsPanel(orders, allUsers) {
        const list = Array.isArray(orders) ? orders : [];
        const users = Array.isArray(allUsers) ? allUsers : [];

        const totalRevenue = list.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const totalOrders = list.length;
        const totalCustomers = users.filter(u => u.role === 'user').length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const statCards = [
            { label: 'Total Revenue',    value: formatCurrency(totalRevenue) },
            { label: 'Total Orders',     value: String(totalOrders) },
            { label: 'Total Customers',  value: String(totalCustomers) },
            { label: 'Avg Order Value',  value: formatCurrency(avgOrderValue) }
        ].map(s => `
            <div class="adm-stat-card adm-stat-card--lg">
                <span class="adm-stat-label">${s.label}</span>
                <span class="adm-stat-value">${s.value}</span>
            </div>
        `).join('');

        const barChartSvg = this._buildMonthlyBarChart(list);
        const topItemsSvg = this._buildTopItemsChart(list);

        return `
            <div id="tab-analytics" class="adm-tab-panel">
                <div class="adm-panel-header">
                    <h2 class="adm-panel-title">Analytics</h2>
                </div>

                <div class="adm-stats-row adm-stats-row--4">${statCards}</div>

                <div class="adm-chart-section">
                    <h3 class="adm-chart-title">Orders by Month (last 6 months)</h3>
                    ${barChartSvg}
                </div>

                <div class="adm-chart-section">
                    <h3 class="adm-chart-title">Top Selling Items</h3>
                    ${topItemsSvg}
                </div>
            </div>
        `;
    }

    /**
     * Build an SVG bar chart of orders per month for the last 6 months
     * @param {Array} orders
     * @returns {string} SVG HTML string
     * @private
     */
    _buildMonthlyBarChart(orders) {
        // Generate last 6 month labels
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                count: 0
            });
        }

        orders.forEach(o => {
            if (!o.createdAt) return;
            const d = new Date(o.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const m = months.find(m => m.key === key);
            if (m) m.count++;
        });

        const maxCount = Math.max(...months.map(m => m.count), 1);

        const svgW = 540;
        const svgH = 180;
        const padL = 36;
        const padR = 12;
        const padT = 12;
        const padB = 36;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;
        const barW = Math.floor(chartW / months.length * 0.55);
        const gap = chartW / months.length;

        let bars = '';
        let labels = '';
        let values = '';

        months.forEach((m, i) => {
            const barH = maxCount > 0 ? Math.round((m.count / maxCount) * chartH) : 0;
            const x = padL + i * gap + (gap - barW) / 2;
            const y = padT + chartH - barH;

            bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="#2563EB" opacity="0.82"/>`;
            labels += `<text x="${x + barW / 2}" y="${svgH - padB + 16}" text-anchor="middle" font-size="10" fill="#64748B">${m.label}</text>`;
            if (m.count > 0) {
                values += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#1E3A8A">${m.count}</text>`;
            }
        });

        // Y-axis gridlines
        let gridlines = '';
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
            const yPos = padT + (chartH / steps) * (steps - s);
            const val = Math.round((maxCount / steps) * s);
            gridlines += `<line x1="${padL}" y1="${yPos}" x2="${svgW - padR}" y2="${yPos}" stroke="#E2E8F0" stroke-width="1"/>`;
            gridlines += `<text x="${padL - 4}" y="${yPos + 4}" text-anchor="end" font-size="9" fill="#94A3B8">${val}</text>`;
        }

        return `
            <div class="adm-chart-wrap">
                <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" aria-label="Bar chart of orders by month">
                    ${gridlines}
                    ${bars}
                    ${labels}
                    ${values}
                </svg>
            </div>
        `;
    }

    /**
     * Build an SVG horizontal bar chart of top 5 selling items
     * @param {Array} orders
     * @returns {string} SVG HTML string
     * @private
     */
    _buildTopItemsChart(orders) {
        const counts = {};
        orders.forEach(o => {
            if (!Array.isArray(o.items)) return;
            o.items.forEach(item => {
                const type = item.type || 'unknown';
                counts[type] = (counts[type] || 0) + (item.quantity || 1);
            });
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length === 0) {
            return `<p class="adm-empty-msg" style="margin-top:8px">No order data available yet.</p>`;
        }

        const maxVal = sorted[0][1] || 1;
        const rowH = 34;
        const padL = 110;
        const padR = 48;
        const padT = 8;
        const svgW = 540;
        const svgH = padT + sorted.length * rowH;
        const barAreaW = svgW - padL - padR;

        let rows = '';
        sorted.forEach(([type, qty], i) => {
            const label = FURNITURE_LABEL_MAP[type] || type;
            const barW = Math.round((qty / maxVal) * barAreaW);
            const y = padT + i * rowH;
            rows += `
                <text x="${padL - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="12" fill="#374151">${escapeHtml(label)}</text>
                <rect x="${padL}" y="${y + 6}" width="${barW}" height="${rowH - 12}" rx="3" fill="#7C3AED" opacity="0.80"/>
                <text x="${padL + barW + 6}" y="${y + rowH / 2 + 4}" font-size="11" fill="#4B5563">${qty}</text>
            `;
        });

        return `
            <div class="adm-chart-wrap">
                <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" aria-label="Horizontal bar chart of top selling items">
                    ${rows}
                </svg>
            </div>
        `;
    }

    // =========================================================================
    // DESIGNS TAB (existing logic, unchanged)
    // =========================================================================

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

    // =========================================================================
    // THUMBNAIL GENERATION (unchanged)
    // =========================================================================

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

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================

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

        // Order status change (event delegation on orders table body)
        const ordersBody = this.container.querySelector('#orders-table-body');
        if (ordersBody) {
            ordersBody.addEventListener('change', (e) => {
                const select = e.target.closest('.adm-status-select');
                if (!select) return;
                const orderId = select.dataset.orderId;
                const newStatus = select.value;
                if (orderId && newStatus) {
                    this._handleOrderStatusChange(orderId, newStatus, select);
                }
            });
        }
    }

    /**
     * Handle order status change: update chip colour in the row optimistically
     * and call the callback.
     * @param {string} orderId
     * @param {string} newStatus
     * @param {HTMLSelectElement} selectEl
     * @private
     */
    _handleOrderStatusChange(orderId, newStatus, selectEl) {
        const row = this.container.querySelector(`.adm-table-row[data-order-id="${orderId}"]`);
        if (row) {
            const chip = row.querySelector('.adm-status-chip');
            if (chip) {
                const cfg = ORDER_STATUS_CONFIG[newStatus] || ORDER_STATUS_CONFIG.confirmed;
                chip.textContent = cfg.label;
                chip.style.color = cfg.colour;
                chip.style.background = cfg.bg;
            }
        }
        this.onUpdateOrderStatus(orderId, newStatus);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

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
     * Inject admin-specific CSS once per page load.
     * Uses a <style id="adm-styles"> guard to avoid duplicate injection.
     * @private
     */
    _injectStyles() {
        if (document.getElementById('adm-styles')) return;

        const style = document.createElement('style');
        style.id = 'adm-styles';
        style.textContent = `
            /* ===== Admin Tab Bar ===== */
            .adm-tab-bar {
                display: flex;
                gap: 2px;
                padding: 0 0 0 0;
                border-bottom: 2px solid #E2E8F0;
                margin-bottom: 24px;
                background: transparent;
            }
            .adm-tab-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 20px;
                border: none;
                background: none;
                font-size: 14px;
                font-weight: 500;
                color: #64748B;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                margin-bottom: -2px;
                border-radius: 6px 6px 0 0;
                transition: color 0.15s, border-color 0.15s, background 0.15s;
                white-space: nowrap;
            }
            .adm-tab-btn:hover {
                color: #1E293B;
                background: #F1F5F9;
            }
            .adm-tab-btn--active {
                color: #2563EB;
                border-bottom-color: #2563EB;
                background: #EFF6FF;
            }

            /* ===== Tab Panels ===== */
            .adm-tab-panel {
                display: none;
            }
            .adm-tab-panel--active {
                display: block;
            }

            /* ===== Panel Header ===== */
            .adm-panel-header {
                display: flex;
                align-items: baseline;
                gap: 12px;
                margin-bottom: 20px;
            }
            .adm-panel-title {
                font-size: 20px;
                font-weight: 700;
                color: #1E293B;
                margin: 0;
            }
            .adm-panel-subtitle {
                font-size: 13px;
                color: #94A3B8;
            }

            /* ===== Stat Cards ===== */
            .adm-stats-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 24px;
            }
            .adm-stats-row--4 {
                grid-template-columns: repeat(4, 1fr);
            }
            @media (max-width: 700px) {
                .adm-stats-row,
                .adm-stats-row--4 {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            .adm-stat-card {
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                padding: 16px 20px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .adm-stat-card--lg {
                padding: 20px 24px;
            }
            .adm-stat-label {
                font-size: 12px;
                color: #64748B;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .adm-stat-value {
                font-size: 22px;
                font-weight: 700;
                color: #1E293B;
            }

            /* ===== Orders Table ===== */
            .adm-table-wrapper {
                overflow-x: auto;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
            }
            .adm-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                min-width: 680px;
            }
            .adm-th {
                padding: 10px 14px;
                background: #F8FAFC;
                color: #64748B;
                font-weight: 600;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1px solid #E2E8F0;
                white-space: nowrap;
            }
            .adm-table-row {
                transition: background 0.1s;
            }
            .adm-table-row:hover {
                background: #F8FAFC;
            }
            .adm-table-row + .adm-table-row {
                border-top: 1px solid #F1F5F9;
            }
            .adm-td {
                padding: 10px 14px;
                color: #374151;
                vertical-align: middle;
            }
            .adm-td--id {
                font-family: monospace;
                font-size: 12px;
                color: #6366F1;
                white-space: nowrap;
            }
            .adm-td--date {
                white-space: nowrap;
                color: #64748B;
            }
            .adm-td--items {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .adm-td--total {
                font-weight: 600;
                white-space: nowrap;
            }
            .adm-td--actions {
                white-space: nowrap;
            }
            .adm-table-empty {
                text-align: center;
                padding: 32px;
                color: #94A3B8;
                font-style: italic;
            }

            /* ===== Status Chip ===== */
            .adm-status-chip {
                display: inline-block;
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
            }

            /* ===== Status Select ===== */
            .adm-status-select {
                font-size: 12px;
                padding: 4px 8px;
                border: 1px solid #D1D5DB;
                border-radius: 6px;
                background: #fff;
                color: #374151;
                cursor: pointer;
                outline: none;
                transition: border-color 0.15s;
            }
            .adm-status-select:focus {
                border-color: #2563EB;
                box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
            }

            /* ===== Customer Cards ===== */
            .adm-customer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 16px;
            }
            .adm-customer-card {
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                padding: 16px 20px;
                display: flex;
                align-items: flex-start;
                gap: 14px;
            }
            .adm-customer-avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366F1, #2563EB);
                color: #fff;
                font-size: 16px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .adm-customer-info {
                flex: 1;
                min-width: 0;
            }
            .adm-customer-name {
                font-weight: 600;
                color: #1E293B;
                font-size: 14px;
                margin: 0 0 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .adm-customer-meta {
                font-size: 12px;
                color: #64748B;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .adm-customer-stats {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 6px;
                flex-shrink: 0;
            }
            .adm-cstat {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            .adm-cstat-value {
                font-size: 14px;
                font-weight: 700;
                color: #1E293B;
                line-height: 1.1;
            }
            .adm-cstat-label {
                font-size: 10px;
                color: #94A3B8;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            /* ===== Charts ===== */
            .adm-chart-section {
                margin-bottom: 28px;
            }
            .adm-chart-title {
                font-size: 15px;
                font-weight: 600;
                color: #374151;
                margin: 0 0 12px;
            }
            .adm-chart-wrap {
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                padding: 16px;
                overflow: hidden;
            }

            /* ===== Misc ===== */
            .adm-empty-msg {
                color: #94A3B8;
                font-style: italic;
                font-size: 14px;
                padding: 16px 0;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Refresh the design list with new data
     * @param {Array} designs - Updated designs array
     */
    refreshDesigns(designs) {
        if (!this.container) return;
        this.render(this.container, designs, this.username, this._extraData);
    }

    /**
     * Clean up the view and release references
     */
    destroy() {
        // Unsubscribe all real-time event listeners
        if (Array.isArray(this._realtimeUnsubs)) {
            this._realtimeUnsubs.forEach(unsub => unsub());
            this._realtimeUnsubs = [];
        }
        this.container = null;
        this.designs = [];
        this._extraData = {};
    }
}

export { DashboardView };
export default DashboardView;
