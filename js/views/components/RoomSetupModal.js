/**
 * FurnishView — Room Setup Modal
 * 
 * Modal component for creating new room designs with specifications.
 * Supports room presets (Innovation Feature 2) for quick setup.
 * 
 * Implements Nielsen Heuristics:
 * - #5 Error prevention (validation before submission)
 * - #9 Help users recognize and recover from errors (inline validation)
 * 
 * @file js/views/components/RoomSetupModal.js
 * @module views/components/RoomSetupModal
 */

import { roomPresets, getRoomPresetById } from '../../data/roomPresets.js';
import { 
    DEFAULT_WALL_COLOUR, 
    DEFAULT_FLOOR_COLOUR,
    MIN_ROOM_DIM,
    MAX_ROOM_DIM,
    MIN_ROOM_HEIGHT,
    MAX_ROOM_HEIGHT,
    ROOM_SHAPES
} from '../../utils/constants.js';

/**
 * Modal backdrop element reference
 * @type {HTMLElement|null}
 */
let modalBackdrop = null;

/**
 * Current modal element reference
 * @type {HTMLElement|null}
 */
let currentModal = null;

/**
 * Previously focused element for restoration
 * @type {HTMLElement|null}
 */
let previouslyFocusedElement = null;

/**
 * Flag to track if modal is currently closing (prevent race conditions)
 * @type {boolean}
 */
let isClosing = false;

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 * @private
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Room Setup Modal component
 * Displays a form for configuring new room designs
 */
const RoomSetupModal = {
    /**
     * Current form values
     * @type {Object}
     * @private
     */
    formData: {
        designName: '',
        presetId: '',
        width: 5,
        depth: 4,
        height: 2.8,
        shape: ROOM_SHAPES.RECTANGULAR,
        wallColour: DEFAULT_WALL_COLOUR,
        floorColour: DEFAULT_FLOOR_COLOUR
    },
    
    /**
     * Form validation errors
     * @type {Object}
     * @private
     */
    errors: {},
    
    /**
     * Callback for form submission
     * @type {Function|null}
     * @private
     */
    onSubmit: null,
    
    /**
     * Callback for modal cancel
     * @type {Function|null}
     * @private
     */
    onCancel: null,
    
    /**
     * Show the room setup modal
     * @param {Object} options - Modal options
     * @param {Function} options.onSubmit - Callback with form data when submitted
     * @param {Function} [options.onCancel] - Callback when cancelled
     */
    show({ onSubmit, onCancel = () => {} } = {}) {
        // If currently closing, wait for it to complete
        if (isClosing) {
            setTimeout(() => this.show({ onSubmit, onCancel }), 250);
            return;
        }
        
        // Close any existing modal only if one exists
        if (currentModal || modalBackdrop) {
            this.closeImmediate();
        }
        
        // Store callbacks
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
        
        // Reset form data to defaults
        this.formData = {
            designName: '',
            presetId: '',
            width: 5,
            depth: 4,
            height: 2.8,
            shape: ROOM_SHAPES.RECTANGULAR,
            wallColour: DEFAULT_WALL_COLOUR,
            floorColour: DEFAULT_FLOOR_COLOUR
        };
        this.errors = {};
        
        // Store previously focused element
        previouslyFocusedElement = document.activeElement;
        
        // Create backdrop
        modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        modalBackdrop.setAttribute('aria-hidden', 'true');
        // Inline styles for guaranteed positioning
        modalBackdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0);z-index:300;transition:background 0.2s ease;';
        
        // Create modal
        currentModal = document.createElement('div');
        currentModal.className = 'modal room-setup-modal';
        currentModal.setAttribute('role', 'dialog');
        currentModal.setAttribute('aria-modal', 'true');
        currentModal.setAttribute('aria-labelledby', 'room-setup-title');
        // Inline styles for guaranteed centering
        currentModal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;z-index:400;opacity:0;pointer-events:none;transition:opacity 0.2s ease;padding:1rem;box-sizing:border-box;';
        
        currentModal.innerHTML = this.renderModalContent();
        
        // Add to DOM
        document.body.appendChild(modalBackdrop);
        document.body.appendChild(currentModal);
        document.body.classList.add('modal-open');
        
        // Trigger animations via inline styles
        requestAnimationFrame(() => {
            modalBackdrop.style.background = 'rgba(0,0,0,0.5)';
            currentModal.style.opacity = '1';
            currentModal.style.pointerEvents = 'auto';
            currentModal.classList.add('modal-visible');
        });
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Focus on first input
        const firstInput = currentModal.querySelector('#design-name');
        if (firstInput) {
            firstInput.focus();
        }
    },
    
    /**
     * Render the modal content HTML
     * @returns {string} Modal HTML
     * @private
     */
    renderModalContent() {
        const presetOptions = roomPresets.map(preset => 
            `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`
        ).join('');
        
        return `
            <div class="modal-card room-setup-card">
                <header class="modal-header">
                    <h2 class="modal-title" id="room-setup-title">Create New Design</h2>
                    <button type="button" class="modal-close" aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </header>
                
                <form id="room-setup-form" class="room-setup-form" novalidate>
                    <div class="modal-body">
                        <!-- Design Name -->
                        <div class="form-group">
                            <label for="design-name" class="form-label">Design Name <span class="required">*</span></label>
                            <input 
                                type="text" 
                                id="design-name" 
                                name="designName"
                                class="form-input" 
                                placeholder="e.g., Living Room Concept"
                                maxlength="100"
                                required
                            >
                            <div class="form-error" id="design-name-error"></div>
                        </div>
                        
                        <!-- Room Preset -->
                        <div class="form-group">
                            <label for="room-preset" class="form-label">Room Preset</label>
                            <select id="room-preset" name="presetId" class="form-input form-select">
                                <option value="">Custom Room</option>
                                ${presetOptions}
                            </select>
                            <div class="form-hint">Select a preset to auto-fill dimensions and colours</div>
                        </div>
                        
                        <!-- Measurement Guide (collapsible) -->
                        <details class="measure-guide">
                            <summary class="measure-guide__toggle">📐 Room Measurement Guide</summary>
                            <div class="measure-guide__body">
                                <p class="measure-guide__intro">Use a tape measure from wall to wall. Here's what fits in your space:</p>
                                <ul class="measure-guide__list" id="measure-guide-list">
                                    <!-- dynamically filled -->
                                </ul>
                            </div>
                        </details>

                        <!-- Dimensions Row -->
                        <div class="form-row form-row-3">
                            <div class="form-group">
                                <label for="room-width" class="form-label">Width (m) <span class="required">*</span></label>
                                <input 
                                    type="number" 
                                    id="room-width" 
                                    name="width"
                                    class="form-input" 
                                    min="${MIN_ROOM_DIM}" 
                                    max="${MAX_ROOM_DIM}" 
                                    step="0.1"
                                    value="5"
                                    required
                                >
                                <div class="form-error" id="room-width-error"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="room-depth" class="form-label">Depth (m) <span class="required">*</span></label>
                                <input 
                                    type="number" 
                                    id="room-depth" 
                                    name="depth"
                                    class="form-input" 
                                    min="${MIN_ROOM_DIM}" 
                                    max="${MAX_ROOM_DIM}" 
                                    step="0.1"
                                    value="4"
                                    required
                                >
                                <div class="form-error" id="room-depth-error"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="room-height" class="form-label">Height (m) <span class="required">*</span></label>
                                <input 
                                    type="number" 
                                    id="room-height" 
                                    name="height"
                                    class="form-input" 
                                    min="${MIN_ROOM_HEIGHT}" 
                                    max="${MAX_ROOM_HEIGHT}" 
                                    step="0.1"
                                    value="2.8"
                                    required
                                >
                                <div class="form-error" id="room-height-error"></div>
                            </div>
                        </div>
                        
                        <!-- Room Shape -->
                        <div class="form-group">
                            <label class="form-label">Room Shape <span class="required">*</span></label>
                            <div class="shape-toggle">
                                <input
                                    type="radio"
                                    id="shape-rectangular"
                                    name="shape"
                                    value="${ROOM_SHAPES.RECTANGULAR}"
                                    checked
                                >
                                <label for="shape-rectangular" class="shape-option">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" stroke-width="1.5"/>
                                    </svg>
                                    Rectangular
                                </label>

                                <input
                                    type="radio"
                                    id="shape-square"
                                    name="shape"
                                    value="${ROOM_SHAPES.SQUARE}"
                                >
                                <label for="shape-square" class="shape-option">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.5"/>
                                    </svg>
                                    Square
                                </label>

                                <input
                                    type="radio"
                                    id="shape-l-shaped"
                                    name="shape"
                                    value="${ROOM_SHAPES.L_SHAPED}"
                                >
                                <label for="shape-l-shaped" class="shape-option">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M3 5h18v8h-10v6H3V5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                                    </svg>
                                    L-Shaped
                                </label>
                            </div>
                        </div>
                        
                        <!-- Colours Row -->
                        <div class="form-row form-row-2">
                            <div class="form-group">
                                <label for="wall-colour" class="form-label">Wall Colour</label>
                                <div class="colour-input-wrapper">
                                    <input 
                                        type="color" 
                                        id="wall-colour" 
                                        name="wallColour"
                                        class="form-colour" 
                                        value="${DEFAULT_WALL_COLOUR}"
                                    >
                                    <span class="colour-value" id="wall-colour-value">${DEFAULT_WALL_COLOUR}</span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="floor-colour" class="form-label">Floor Colour</label>
                                <div class="colour-input-wrapper">
                                    <input 
                                        type="color" 
                                        id="floor-colour" 
                                        name="floorColour"
                                        class="form-colour" 
                                        value="${DEFAULT_FLOOR_COLOUR}"
                                    >
                                    <span class="colour-value" id="floor-colour-value">${DEFAULT_FLOOR_COLOUR}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="create-design-btn" disabled>
                            Create Design
                        </button>
                    </footer>
                </form>
            </div>
        `;
    },
    
    /**
     * Inject CSS for measure guide (once per page)
     * @private
     */
    _injectMeasureGuideStyles() {
        if (document.getElementById('measure-guide-styles')) return;
        const style = document.createElement('style');
        style.id = 'measure-guide-styles';
        style.textContent = `
            .measure-guide {
                margin: 0 0 16px;
                border: 1px solid #e8e8ed;
                border-radius: 10px;
                overflow: hidden;
                background: #f9f9fb;
            }
            .measure-guide__toggle {
                padding: 10px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                color: #1d1d1f;
                list-style: none;
                display: flex;
                align-items: center;
                gap: 6px;
                user-select: none;
            }
            .measure-guide__toggle::-webkit-details-marker { display: none; }
            .measure-guide__body {
                padding: 0 14px 12px;
            }
            .measure-guide__intro {
                font-size: 12px;
                color: #666;
                margin: 0 0 8px;
            }
            .measure-guide__list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .measure-guide__list li {
                font-size: 12px;
                padding: 4px 0;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #333;
            }
            .measure-guide__fit { color: #16a34a; font-weight: 600; }
            .measure-guide__tight { color: #d97706; font-weight: 600; }
        `;
        document.head.appendChild(style);
    },

    /**
     * Update measurement guide hints based on room width
     * @private
     */
    _updateMeasureGuide() {
        if (!currentModal) return;
        const list = currentModal.querySelector('#measure-guide-list');
        if (!list) return;
        const width = parseFloat(currentModal.querySelector('#room-width')?.value) || 5;

        const hints = [
            { name: 'Sofa', min: 1.8, max: 2.5 },
            { name: 'Dining table', min: 1.2, max: 1.8 },
            { name: 'Bed (double)', min: 1.4, max: 1.4 },
            { name: 'Desk', min: 1.2, max: 1.6 },
            { name: 'Wardrobe', min: 0.8, max: 1.2 }
        ];

        list.innerHTML = hints.map(h => {
            const fits = width >= h.min;
            const tight = fits && width < h.max + 0.3;
            const icon = fits ? (tight ? '⚠️' : '✅') : '⚠️';
            const cls = fits ? (tight ? 'measure-guide__tight' : 'measure-guide__fit') : 'measure-guide__tight';
            const note = fits
                ? (tight ? `fits (tight — ${h.min}–${h.max}m typical)` : `fits comfortably`)
                : `may be too wide (${h.min}–${h.max}m typical)`;
            return `<li>${icon} <strong>${h.name}</strong>: <span class="${cls}">${note}</span></li>`;
        }).join('');
    },

    /**
     * Attach all event listeners
     * @private
     */
    attachEventListeners() {
        if (!currentModal) return;
        this._injectMeasureGuideStyles();

        const form = currentModal.querySelector('#room-setup-form');
        const closeBtn = currentModal.querySelector('.modal-close');
        const cancelBtn = currentModal.querySelector('.modal-cancel');
        const presetSelect = currentModal.querySelector('#room-preset');
        const wallColour = currentModal.querySelector('#wall-colour');
        const floorColour = currentModal.querySelector('#floor-colour');
        
        // Close handlers
        closeBtn?.addEventListener('click', () => this.handleCancel());
        cancelBtn?.addEventListener('click', () => this.handleCancel());
        modalBackdrop?.addEventListener('click', () => this.handleCancel());
        
        // Close when clicking outside modal-card (backdrop click on modal container)
        currentModal?.addEventListener('click', (e) => {
            // Only close if clicking directly on the modal container, not on modal-card or its children
            if (e.target === currentModal) {
                this.handleCancel();
            }
        });
        
        // Escape key handler
        this.keydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.handleCancel();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
        
        // Form submission
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // Input validation on change
        const inputs = currentModal.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateFormData();
                this.validateForm();
            });
            input.addEventListener('change', () => {
                this.updateFormData();
                this.validateForm();
            });
        });
        
        // Preset selection
        presetSelect?.addEventListener('change', (e) => {
            this.applyPreset(e.target.value);
        });
        
        // Colour value display
        wallColour?.addEventListener('input', (e) => {
            const valueEl = currentModal.querySelector('#wall-colour-value');
            if (valueEl) valueEl.textContent = e.target.value.toUpperCase();
        });

        floorColour?.addEventListener('input', (e) => {
            const valueEl = currentModal.querySelector('#floor-colour-value');
            if (valueEl) valueEl.textContent = e.target.value.toUpperCase();
        });

        // Square shape: sync depth to width and disable depth input
        const shapeRadios = currentModal.querySelectorAll('input[name="shape"]');
        const depthInput = currentModal.querySelector('#room-depth');
        const widthInputForSync = currentModal.querySelector('#room-width');

        const syncSquare = () => {
            const selectedShape = currentModal.querySelector('input[name="shape"]:checked')?.value;
            if (selectedShape === ROOM_SHAPES.SQUARE && depthInput && widthInputForSync) {
                depthInput.value = widthInputForSync.value;
                depthInput.disabled = true;
                depthInput.style.opacity = '0.5';
            } else if (depthInput) {
                depthInput.disabled = false;
                depthInput.style.opacity = '1';
            }
            this.updateFormData();
            this.validateForm();
        };

        shapeRadios.forEach(radio => {
            radio.addEventListener('change', syncSquare);
        });

        // When width changes and square is selected, sync depth
        widthInputForSync?.addEventListener('input', () => {
            const selectedShape = currentModal.querySelector('input[name="shape"]:checked')?.value;
            if (selectedShape === ROOM_SHAPES.SQUARE && depthInput) {
                depthInput.value = widthInputForSync.value;
                this.updateFormData();
                this.validateForm();
            }
        });
        
        // Wire width input to measurement guide
        const widthInput = currentModal.querySelector('#room-width');
        if (widthInput) {
            widthInput.addEventListener('input', () => this._updateMeasureGuide());
            widthInput.addEventListener('change', () => this._updateMeasureGuide());
        }
        // Initial guide render
        this._updateMeasureGuide();

        // Initial validation
        this.validateForm();
    },
    
    /**
     * Update form data from inputs
     * @private
     */
    updateFormData() {
        if (!currentModal) return;

        const shape = currentModal.querySelector('input[name="shape"]:checked')?.value || ROOM_SHAPES.RECTANGULAR;
        const width = parseFloat(currentModal.querySelector('#room-width')?.value) || 5;

        this.formData = {
            designName: currentModal.querySelector('#design-name')?.value.trim() || '',
            presetId: currentModal.querySelector('#room-preset')?.value || '',
            width,
            depth: shape === ROOM_SHAPES.SQUARE ? width : (parseFloat(currentModal.querySelector('#room-depth')?.value) || 4),
            height: parseFloat(currentModal.querySelector('#room-height')?.value) || 2.8,
            shape,
            wallColour: currentModal.querySelector('#wall-colour')?.value || DEFAULT_WALL_COLOUR,
            floorColour: currentModal.querySelector('#floor-colour')?.value || DEFAULT_FLOOR_COLOUR
        };
    },
    
    /**
     * Apply preset values to form
     * @param {string} presetId - ID of preset to apply
     * @private
     */
    applyPreset(presetId) {
        if (!currentModal || !presetId) return;
        
        const preset = getRoomPresetById(presetId);
        if (!preset) return;
        
        // Update form inputs
        const widthInput = currentModal.querySelector('#room-width');
        const depthInput = currentModal.querySelector('#room-depth');
        const heightInput = currentModal.querySelector('#room-height');
        const wallColourInput = currentModal.querySelector('#wall-colour');
        const floorColourInput = currentModal.querySelector('#floor-colour');
        const rectangularRadio = currentModal.querySelector('#shape-rectangular');
        const lShapedRadio = currentModal.querySelector('#shape-l-shaped');
        
        if (widthInput) widthInput.value = preset.width;
        if (depthInput) depthInput.value = preset.depth;
        if (heightInput) heightInput.value = preset.height;
        if (wallColourInput) {
            wallColourInput.value = preset.wallColour;
            const valueEl = currentModal.querySelector('#wall-colour-value');
            if (valueEl) valueEl.textContent = preset.wallColour.toUpperCase();
        }
        if (floorColourInput) {
            floorColourInput.value = preset.floorColour;
            const valueEl = currentModal.querySelector('#floor-colour-value');
            if (valueEl) valueEl.textContent = preset.floorColour.toUpperCase();
        }
        
        // Set shape radio
        const squareRadio = currentModal.querySelector('#shape-square');
        if (preset.shape === ROOM_SHAPES.L_SHAPED && lShapedRadio) {
            lShapedRadio.checked = true;
        } else if (preset.shape === ROOM_SHAPES.SQUARE && squareRadio) {
            squareRadio.checked = true;
        } else if (rectangularRadio) {
            rectangularRadio.checked = true;
        }
        
        this.updateFormData();
        this.validateForm();
    },
    
    /**
     * Validate the form and update UI
     * @returns {boolean} True if form is valid
     * @private
     */
    validateForm() {
        if (!currentModal) return false;
        
        const errors = {};
        
        // Validate design name
        if (!this.formData.designName || this.formData.designName.length === 0) {
            errors.designName = 'Design name is required';
        } else if (this.formData.designName.length > 100) {
            errors.designName = 'Design name must be 100 characters or less';
        }
        
        // Validate width
        if (isNaN(this.formData.width) || this.formData.width < MIN_ROOM_DIM || this.formData.width > MAX_ROOM_DIM) {
            errors.width = `Width must be between ${MIN_ROOM_DIM} and ${MAX_ROOM_DIM} meters`;
        }
        
        // Validate depth
        if (isNaN(this.formData.depth) || this.formData.depth < MIN_ROOM_DIM || this.formData.depth > MAX_ROOM_DIM) {
            errors.depth = `Depth must be between ${MIN_ROOM_DIM} and ${MAX_ROOM_DIM} meters`;
        }
        
        // Validate height
        if (isNaN(this.formData.height) || this.formData.height < MIN_ROOM_HEIGHT || this.formData.height > MAX_ROOM_HEIGHT) {
            errors.height = `Height must be between ${MIN_ROOM_HEIGHT} and ${MAX_ROOM_HEIGHT} meters`;
        }
        
        this.errors = errors;
        this.updateErrorDisplay();
        
        // Enable/disable submit button
        const submitBtn = currentModal.querySelector('#create-design-btn');
        const isValid = Object.keys(errors).length === 0;
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
        
        return isValid;
    },
    
    /**
     * Update error message display
     * @private
     */
    updateErrorDisplay() {
        if (!currentModal) return;
        
        // Design name error
        const nameError = currentModal.querySelector('#design-name-error');
        const nameInput = currentModal.querySelector('#design-name');
        if (nameError) {
            nameError.textContent = this.errors.designName || '';
            nameInput?.classList.toggle('form-input-error', !!this.errors.designName);
        }
        
        // Width error
        const widthError = currentModal.querySelector('#room-width-error');
        const widthInput = currentModal.querySelector('#room-width');
        if (widthError) {
            widthError.textContent = this.errors.width || '';
            widthInput?.classList.toggle('form-input-error', !!this.errors.width);
        }
        
        // Depth error
        const depthError = currentModal.querySelector('#room-depth-error');
        const depthInput = currentModal.querySelector('#room-depth');
        if (depthError) {
            depthError.textContent = this.errors.depth || '';
            depthInput?.classList.toggle('form-input-error', !!this.errors.depth);
        }
        
        // Height error
        const heightError = currentModal.querySelector('#room-height-error');
        const heightInput = currentModal.querySelector('#room-height');
        if (heightError) {
            heightError.textContent = this.errors.height || '';
            heightInput?.classList.toggle('form-input-error', !!this.errors.height);
        }
    },
    
    /**
     * Handle form submission
     * @private
     */
    handleSubmit() {
        this.updateFormData();
        
        if (!this.validateForm()) {
            return;
        }
        
        // Call submit callback with form data
        if (typeof this.onSubmit === 'function') {
            this.onSubmit({
                name: this.formData.designName,
                room: {
                    width: this.formData.width,
                    depth: this.formData.depth,
                    height: this.formData.height,
                    shape: this.formData.shape,
                    wallColour: this.formData.wallColour,
                    floorColour: this.formData.floorColour
                }
            });
        }
        
        this.close();
    },
    
    /**
     * Handle modal cancel
     * @private
     */
    handleCancel() {
        if (typeof this.onCancel === 'function') {
            this.onCancel();
        }
        this.close();
    },
    
    /**
     * Close the modal with animation
     */
    close() {
        if (!currentModal && !modalBackdrop) return;
        if (isClosing) return;
        
        isClosing = true;
        
        // Remove keydown handler
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        // Animate out
        if (modalBackdrop) {
            modalBackdrop.classList.remove('modal-backdrop-visible');
        }
        if (currentModal) {
            currentModal.classList.remove('modal-visible');
            currentModal.classList.add('modal-hiding');
        }
        
        // Remove from DOM after animation
        setTimeout(() => {
            this.cleanupDOM();
            isClosing = false;
        }, 200);
    },
    
    /**
     * Close the modal immediately without animation
     * @private
     */
    closeImmediate() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        this.cleanupDOM();
    },
    
    /**
     * Clean up DOM elements
     * @private
     */
    cleanupDOM() {
        if (modalBackdrop && modalBackdrop.parentNode) {
            modalBackdrop.parentNode.removeChild(modalBackdrop);
        }
        if (currentModal && currentModal.parentNode) {
            currentModal.parentNode.removeChild(currentModal);
        }
        
        modalBackdrop = null;
        currentModal = null;
        
        document.body.classList.remove('modal-open');
        
        // Restore focus
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
            previouslyFocusedElement.focus();
        }
        previouslyFocusedElement = null;
    }
};

export { RoomSetupModal };
export default RoomSetupModal;
