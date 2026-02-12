/**
 * FurnishView — Sidebar Component
 * 
 * Renders room settings, colour pickers, and furniture property editors.
 * Context-sensitive: shows room properties always, furniture properties when selected.
 * Includes colour contrast validation (Task 4B.1) — warns on extreme colours.
 * 
 * @file js/views/components/Sidebar.js
 * @module views/components/Sidebar
 */

import { ColourManager } from '../../graphics/ColourManager.js';
import { Toast } from './Toast.js';

/**
 * Sidebar component
 * Provides property editing panels for room and furniture
 */
class Sidebar {
    /**
     * Create a Sidebar instance
     * @param {Object} options - Configuration
     * @param {Function} options.onRoomChange - Callback when room properties change
     * @param {Function} options.onFurnitureChange - Callback when furniture properties change
     */
    constructor({
        onRoomChange = () => {},
        onFurnitureChange = () => {}
    } = {}) {
        this.onRoomChange = onRoomChange;
        this.onFurnitureChange = onFurnitureChange;
        
        this.container = null;
        this.design = null;
        this.selectedFurniture = null;
        
        // Section collapse states
        this.roomSectionCollapsed = false;
        this.furnitureSectionCollapsed = false;
        
        // Track colour warning state per surface to prevent toast spam
        // Only fire toast on safe → extreme transition, not every drag pixel
        this._colourWarningActive = { wall: false, floor: false };
    }
    
    /**
     * Render the sidebar into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} design - Current design with room data
     * @param {Object|null} selectedFurniture - Currently selected furniture item
     */
    render(container, design = null, selectedFurniture = null) {
        if (!container) return;
        
        this.container = container;
        this.design = design;
        this.selectedFurniture = selectedFurniture;
        
        const room = design?.room;
        
        container.innerHTML = `
            <div class="sidebar-content">
                <!-- Room Properties Section -->
                <section class="sidebar-section">
                    <button 
                        type="button" 
                        class="sidebar-section-header"
                        aria-expanded="${!this.roomSectionCollapsed}"
                        data-section="room"
                    >
                        <span class="sidebar-section-title">Room Properties</span>
                        <span class="sidebar-section-toggle">${this.roomSectionCollapsed ? '▶' : '▼'}</span>
                    </button>
                    <div class="sidebar-section-body ${this.roomSectionCollapsed ? 'collapsed' : ''}">
                        ${this._renderRoomProperties(room)}
                    </div>
                </section>
                
                <!-- Furniture Properties Section -->
                <section class="sidebar-section ${!selectedFurniture ? 'disabled' : ''}">
                    <button 
                        type="button" 
                        class="sidebar-section-header"
                        aria-expanded="${!this.furnitureSectionCollapsed}"
                        data-section="furniture"
                        ${!selectedFurniture ? 'disabled' : ''}
                    >
                        <span class="sidebar-section-title">Furniture Properties</span>
                        <span class="sidebar-section-toggle">${this.furnitureSectionCollapsed ? '▶' : '▼'}</span>
                    </button>
                    <div class="sidebar-section-body ${this.furnitureSectionCollapsed ? 'collapsed' : ''}">
                        ${this._renderFurnitureProperties(selectedFurniture)}
                    </div>
                </section>
            </div>
        `;
        
        this._bindEvents();
    }
    
    /**
     * Render room properties form fields
     * @param {Object} room - Room model data
     * @returns {string} HTML string
     * @private
     */
    _renderRoomProperties(room) {
        if (!room) {
            return '<p class="sidebar-empty">No room data available</p>';
        }
        
        return `
            <div class="property-group">
                <label class="property-label">Dimensions</label>
                <div class="property-value dimensions-display">
                    <span>${room.width || 0}m</span> × 
                    <span>${room.depth || 0}m</span> × 
                    <span>${room.height || 0}m</span>
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label" for="room-wall-colour">Wall Colour</label>
                <div class="colour-picker-row">
                    <input 
                        type="color" 
                        id="room-wall-colour"
                        class="colour-picker"
                        value="${room.wallColour || '#E8E0D4'}"
                        data-property="wallColour"
                        data-target="room"
                        data-surface="wall"
                    />
                    <span class="colour-value">${room.wallColour || '#E8E0D4'}</span>
                    <span class="colour-warning-icon" id="wall-colour-warning" aria-label="Colour warning">⚠️</span>
                </div>
                <button type="button" class="colour-suggest-btn" id="wall-colour-suggest" data-surface="wall">
                    Suggest better shade
                </button>
            </div>
            
            <div class="property-group">
                <label class="property-label" for="room-floor-colour">Floor Colour</label>
                <div class="colour-picker-row">
                    <input 
                        type="color" 
                        id="room-floor-colour"
                        class="colour-picker"
                        value="${room.floorColour || '#8B7355'}"
                        data-property="floorColour"
                        data-target="room"
                        data-surface="floor"
                    />
                    <span class="colour-value">${room.floorColour || '#8B7355'}</span>
                    <span class="colour-warning-icon" id="floor-colour-warning" aria-label="Colour warning">⚠️</span>
                </div>
                <button type="button" class="colour-suggest-btn" id="floor-colour-suggest" data-surface="floor">
                    Suggest better shade
                </button>
            </div>
            
            <div class="property-group">
                <label class="property-label">Room Shape</label>
                <div class="property-value">${this._formatShape(room.shape)}</div>
            </div>
        `;
    }
    
    /**
     * Render furniture properties form fields
     * @param {Object} furniture - Furniture item data
     * @returns {string} HTML string
     * @private
     */
    _renderFurnitureProperties(furniture) {
        if (!furniture) {
            return '<p class="sidebar-empty">Select a furniture item to edit its properties</p>';
        }
        
        return `
            <div class="property-group">
                <label class="property-label">Type</label>
                <div class="property-value furniture-type-display">
                    ${this._escapeHtml(furniture.type || 'Unknown')}
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label" for="furniture-width">Width (m)</label>
                <input 
                    type="number" 
                    id="furniture-width"
                    class="property-input"
                    value="${furniture.width || 0}"
                    min="0.1"
                    max="10"
                    step="0.1"
                    data-property="width"
                    data-target="furniture"
                />
            </div>
            
            <div class="property-group">
                <label class="property-label" for="furniture-depth">Depth (m)</label>
                <input 
                    type="number" 
                    id="furniture-depth"
                    class="property-input"
                    value="${furniture.depth || 0}"
                    min="0.1"
                    max="10"
                    step="0.1"
                    data-property="depth"
                    data-target="furniture"
                />
            </div>
            
            <div class="property-group">
                <label class="property-label" for="furniture-height">Height (m)</label>
                <input 
                    type="number" 
                    id="furniture-height"
                    class="property-input"
                    value="${furniture.height || 0}"
                    min="0.1"
                    max="5"
                    step="0.1"
                    data-property="height"
                    data-target="furniture"
                />
            </div>
            
            <div class="property-group">
                <label class="property-label" for="furniture-colour">Colour</label>
                <div class="colour-picker-row">
                    <input 
                        type="color" 
                        id="furniture-colour"
                        class="colour-picker"
                        value="${furniture.colour || '#5C4033'}"
                        data-property="colour"
                        data-target="furniture"
                    />
                    <span class="colour-value">${furniture.colour || '#5C4033'}</span>
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label" for="furniture-rotation">Rotation (°)</label>
                <div class="rotation-input-row">
                    <input 
                        type="range" 
                        id="furniture-rotation-slider"
                        class="rotation-slider"
                        value="${furniture.rotation || 0}"
                        min="0"
                        max="360"
                        step="15"
                        data-property="rotation"
                        data-target="furniture"
                    />
                    <input 
                        type="number" 
                        id="furniture-rotation"
                        class="rotation-input"
                        value="${furniture.rotation || 0}"
                        min="0"
                        max="360"
                        step="1"
                        data-property="rotation"
                        data-target="furniture"
                    />
                </div>
                <div class="quick-rotate-row">
                    <button type="button" class="quick-rotate-btn" data-degrees="0">0°</button>
                    <button type="button" class="quick-rotate-btn" data-degrees="90">90°</button>
                    <button type="button" class="quick-rotate-btn" data-degrees="180">180°</button>
                    <button type="button" class="quick-rotate-btn" data-degrees="270">270°</button>
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Position</label>
                <div class="property-value position-display">
                    X: ${(furniture.x || 0).toFixed(2)}m, Y: ${(furniture.y || 0).toFixed(2)}m
                </div>
            </div>
        `;
    }
    
    /**
     * Format room shape for display
     * @param {string} shape - Room shape type
     * @returns {string} Formatted display text
     * @private
     */
    _formatShape(shape) {
        if (!shape) return 'Unknown';
        return shape.charAt(0).toUpperCase() + shape.slice(1).replace('-', ' ');
    }
    
    /**
     * Bind event listeners
     * @private
     */
    _bindEvents() {
        if (!this.container) return;
        
        // Section collapse toggles
        const headers = this.container.querySelectorAll('.sidebar-section-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.dataset.section;
                this._toggleSection(section);
            });
        });
        
        // Colour pickers — apply immediately, then validate for extremes
        const colourPickers = this.container.querySelectorAll('.colour-picker');
        colourPickers.forEach(picker => {
            picker.addEventListener('input', (e) => {
                // Apply colour immediately (Nielsen #3: user control)
                this._handlePropertyChange(e.target);
                // Update adjacent colour value display
                const valueEl = e.target.parentElement?.querySelector('.colour-value');
                if (valueEl) {
                    valueEl.textContent = e.target.value;
                }
                // Run contrast validation for room colour pickers
                if (e.target.dataset.target === 'room') {
                    this._validateColourPicker(e.target);
                }
            });
        });
        
        // "Suggest better shade" buttons
        const suggestBtns = this.container.querySelectorAll('.colour-suggest-btn');
        suggestBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const surface = btn.dataset.surface;
                const pickerId = surface === 'wall' ? 'room-wall-colour' : 'room-floor-colour';
                const picker = this.container.querySelector(`#${pickerId}`);
                if (!picker) return;
                
                const suggested = ColourManager.suggestBetterColour(picker.value, surface);
                picker.value = suggested;
                
                // Trigger the same flow as manual colour change
                const inputEvent = new Event('input', { bubbles: true });
                picker.dispatchEvent(inputEvent);
                
                Toast.success('Applied suggested colour');
            });
        });
        
        // Number inputs
        const numberInputs = this.container.querySelectorAll('.property-input');
        numberInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this._handlePropertyChange(e.target);
            });
        });
        
        // Rotation slider + input sync
        const rotationSlider = this.container.querySelector('#furniture-rotation-slider');
        const rotationInput = this.container.querySelector('#furniture-rotation');
        
        if (rotationSlider && rotationInput) {
            rotationSlider.addEventListener('input', (e) => {
                rotationInput.value = e.target.value;
                this._handlePropertyChange(e.target);
            });
            
            rotationInput.addEventListener('change', (e) => {
                rotationSlider.value = e.target.value;
                this._handlePropertyChange(e.target);
            });
        }
        
        // Quick-rotate preset buttons (Task 4B.2)
        const quickRotateBtns = this.container.querySelectorAll('.quick-rotate-btn');
        quickRotateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const degrees = parseInt(btn.dataset.degrees, 10);
                if (Number.isNaN(degrees)) return;
                
                // Update slider + input to match
                if (rotationSlider) rotationSlider.value = degrees;
                if (rotationInput) rotationInput.value = degrees;
                
                // Fire change via the rotation input element
                if (rotationInput) {
                    this._handlePropertyChange(rotationInput);
                }
            });
        });
    }
    
    /**
     * Toggle section collapse state
     * @param {string} section - Section identifier ('room' or 'furniture')
     * @private
     */
    _toggleSection(section) {
        if (section === 'room') {
            this.roomSectionCollapsed = !this.roomSectionCollapsed;
        } else if (section === 'furniture') {
            this.furnitureSectionCollapsed = !this.furnitureSectionCollapsed;
        }
        
        // Re-render to apply toggle
        this.render(this.container, this.design, this.selectedFurniture);
    }
    
    /**
     * Handle property change from form input
     * @param {HTMLElement} input - Input element that changed
     * @private
     */
    _handlePropertyChange(input) {
        const property = input.dataset.property;
        const target = input.dataset.target;
        let value = input.value;
        
        // Parse numeric values
        if (input.type === 'number' || input.type === 'range') {
            value = parseFloat(value);
            if (isNaN(value)) return;
        }
        
        // Trigger appropriate callback
        if (target === 'room') {
            this.onRoomChange(property, value);
        } else if (target === 'furniture') {
            this.onFurnitureChange(property, value);
        }
    }
    
    /**
     * Validate a room colour picker value and show/hide warnings
     * Checks if colour is too extreme and toggles warning icon + suggest button.
     * Shows a non-blocking toast warning (Nielsen #3, #5).
     * 
     * @param {HTMLInputElement} picker - The colour picker input element
     * @private
     */
    _validateColourPicker(picker) {
        const surface = picker.dataset.surface;
        if (!surface) return;
        
        const warningIconId = `${surface}-colour-warning`;
        const suggestBtnId = `${surface}-colour-suggest`;
        const warningIcon = this.container.querySelector(`#${warningIconId}`);
        const suggestBtn = this.container.querySelector(`#${suggestBtnId}`);
        
        const result = ColourManager.isColourTooExtreme(picker.value);
        const isExtreme = result.tooDark || result.tooLight;
        const wasExtreme = this._colourWarningActive[surface] || false;
        
        if (isExtreme) {
            // Show warning indicators
            if (warningIcon) warningIcon.classList.add('colour-warning--active');
            if (suggestBtn) suggestBtn.classList.add('colour-warning--active');
            
            // Only fire toast on transition from safe → extreme (prevents spam)
            if (!wasExtreme) {
                Toast.warning(result.warning);
            }
            this._colourWarningActive[surface] = true;
        } else {
            // Clear warning indicators
            if (warningIcon) warningIcon.classList.remove('colour-warning--active');
            if (suggestBtn) suggestBtn.classList.remove('colour-warning--active');
            this._colourWarningActive[surface] = false;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export { Sidebar };
export default Sidebar;
