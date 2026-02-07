/**
 * FurnishView — Dashboard View
 * 
 * Renders the design portfolio/dashboard showing saved designs.
 * Provides actions for creating, opening, and deleting designs.
 * 
 * Implements Nielsen Heuristics:
 * - #1 Visibility of system status (design count, empty state)
 * - #5 Error prevention (delete confirmation via Modal)
 * - #7 Flexibility (multiple ways to access designs)
 * 
 * @file js/views/DashboardView.js
 * @module views/DashboardView
 */

import { Modal } from './components/Modal.js';
import { Toast } from './components/Toast.js';

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
 * Format date for display
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
        
        // Relative time for recent dates
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        
        // Formatted date for older dates
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
 * @returns {string} Formatted dimensions
 * @private
 */
function formatRoomDimensions(room) {
    if (!room) return 'No room data';
    
    const width = room.width || 0;
    const depth = room.depth || 0;
    const shape = room.shape || 'rectangular';
    
    // Format shape name nicely
    const shapeName = shape.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    return `${width}m × ${depth}m ${shapeName}`;
}

/**
 * DashboardView class
 * Manages the design portfolio grid and actions
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
     */
    constructor({
        onNewDesign = () => {},
        onOpenDesign = () => {},
        onDeleteDesign = () => {},
        onLogout = () => {},
        onCompareDesigns = () => {}
    } = {}) {
        this.onNewDesign = onNewDesign;
        this.onOpenDesign = onOpenDesign;
        this.onDeleteDesign = onDeleteDesign;
        this.onLogout = onLogout;
        this.onCompareDesigns = onCompareDesigns;
        this.container = null;
        this.designs = [];
        this.username = '';
    }
    
    /**
     * Render the dashboard view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Array} designs - Array of saved designs to display
     * @param {string} username - Current user's name
     */
    render(container, designs = [], username = '') {
        if (!container) return;
        
        this.container = container;
        this.designs = Array.isArray(designs) ? designs : [];
        this.username = escapeHtml(username || 'User');
        
        const hasDesigns = this.designs.length > 0;
        const canCompare = this.designs.length >= 2;
        
        container.innerHTML = `
            <div class="dashboard">
                <!-- Header Bar -->
                <header class="dashboard-header">
                    <div class="dashboard-brand">
                        <h1 class="dashboard-logo">FurnishView</h1>
                    </div>
                    <div class="dashboard-user">
                        <span class="dashboard-username">Welcome, <strong>${this.username}</strong></span>
                        <button type="button" id="logout-btn" class="btn btn-outline btn-sm">Logout</button>
                    </div>
                </header>
                
                <!-- Main Content -->
                <main class="dashboard-main">
                    <!-- Action Bar -->
                    <div class="dashboard-actions">
                        <h2 class="dashboard-title">My Designs</h2>
                        <div class="dashboard-buttons">
                            <button type="button" id="compare-btn" class="btn btn-secondary" ${canCompare ? '' : 'disabled'}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M2 4h5M2 8h5M2 12h5M9 4h5M9 8h5M9 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                Compare Designs
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
                    ${hasDesigns ? this.renderDesignsGrid() : this.renderEmptyState()}
                </main>
            </div>
        `;
        
        // Attach event listeners
        this.attachEventListeners();
    }
    
    /**
     * Render the designs grid
     * @returns {string} HTML string for designs grid
     * @private
     */
    renderDesignsGrid() {
        const designCards = this.designs.map(design => this.renderDesignCard(design)).join('');
        
        return `
            <div class="designs-grid" role="list" aria-label="Saved designs">
                ${designCards}
            </div>
        `;
    }
    
    /**
     * Render a single design card
     * @param {Object} design - Design object
     * @returns {string} HTML string for design card
     * @private
     */
    renderDesignCard(design) {
        const id = escapeHtml(design.id || '');
        const name = escapeHtml(design.name || 'Untitled Design');
        const roomDimensions = formatRoomDimensions(design.room);
        const createdDate = formatDate(design.createdAt);
        const furnitureCount = Array.isArray(design.furniture) ? design.furniture.length : 0;
        
        return `
            <article class="design-card" role="listitem" data-design-id="${id}">
                <div class="design-card-preview">
                    <svg class="design-card-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                        <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M14 30h8M26 30h8M14 24h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="design-card-content">
                    <h3 class="design-card-name">${name}</h3>
                    <p class="design-card-dimensions">${roomDimensions}</p>
                    <div class="design-card-meta">
                        <span class="design-card-date">${createdDate}</span>
                        <span class="design-card-items">${furnitureCount} items</span>
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
     * Render empty state
     * @returns {string} HTML string for empty state
     * @private
     */
    renderEmptyState() {
        return `
            <div class="dashboard-empty">
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                            <rect x="12" y="16" width="40" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                            <path d="M20 36h10M34 36h10M20 28h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M32 20v6M29 23h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">No Designs Yet</h3>
                    <p class="empty-description">Create your first room design to get started.</p>
                    <button type="button" id="empty-new-design-btn" class="btn btn-primary">
                        Create First Design
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     * @private
     */
    attachEventListeners() {
        if (!this.container) return;
        
        // Logout button
        const logoutBtn = this.container.querySelector('#logout-btn');
        logoutBtn?.addEventListener('click', () => this.onLogout());
        
        // New design buttons
        const newDesignBtn = this.container.querySelector('#new-design-btn');
        newDesignBtn?.addEventListener('click', () => this.onNewDesign());
        
        const emptyNewDesignBtn = this.container.querySelector('#empty-new-design-btn');
        emptyNewDesignBtn?.addEventListener('click', () => this.onNewDesign());
        
        // Compare designs button
        const compareBtn = this.container.querySelector('#compare-btn');
        compareBtn?.addEventListener('click', () => {
            if (this.designs.length >= 2) {
                this.onCompareDesigns();
            } else {
                Toast.info('You need at least 2 designs to compare');
            }
        });
        
        // Design card actions (using event delegation)
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
                    if (designId) this.handleDeleteDesign(designId, designName);
                }
            });
        }
    }
    
    /**
     * Handle delete design with confirmation
     * @param {string} designId - ID of design to delete
     * @param {string} designName - Name of design for confirmation message
     * @private
     */
    handleDeleteDesign(designId, designName) {
        Modal.confirmDelete(designName, () => {
            // Call the delete callback
            this.onDeleteDesign(designId);
        });
    }
    
    /**
     * Refresh the design list
     * @param {Array} designs - Updated designs array
     */
    refreshDesigns(designs) {
        if (!this.container) return;
        this.render(this.container, designs, this.username);
    }
    
    /**
     * Clean up the view
     */
    destroy() {
        this.container = null;
        this.designs = [];
    }
}

export { DashboardView };
export default DashboardView;
