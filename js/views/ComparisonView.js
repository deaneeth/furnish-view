/**
 * FurnishView — Comparison View
 * 
 * Split-screen 3D comparison of two saved designs.
 * Renders two independent Renderer3D instances side-by-side,
 * each with its own OrbitControls for independent camera manipulation.
 * 
 * Implements Nielsen Heuristics:
 * - #1 Visibility of system status (design labels, sync indicator)
 * - #3 User control and freedom (back button, independent/synced cameras)
 * - #4 Consistency (reuses existing Renderer3D component)
 * - #7 Flexibility (optional camera sync toggle)
 * 
 * @file js/views/ComparisonView.js
 * @module views/ComparisonView
 */

import { Renderer3D } from '../graphics/Renderer3D.js';

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
 * ComparisonView class
 * Manages the side-by-side 3D design comparison layout
 */
class ComparisonView {
    /**
     * Create a ComparisonView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onBack - Callback for returning to dashboard
     */
    constructor({ onBack = () => {} } = {}) {
        this.onBack = onBack;
        this.container = null;

        /** @type {Renderer3D|null} Left panel renderer */
        this.rendererA = null;

        /** @type {Renderer3D|null} Right panel renderer */
        this.rendererB = null;

        /** @type {Object|null} Design A data */
        this.designA = null;

        /** @type {Object|null} Design B data */
        this.designB = null;

        /** @type {boolean} Whether cameras are synced */
        this.cameraSynced = false;

        /** @type {Function|null} Bound resize handler for cleanup */
        this._boundResizeHandler = null;

        /** @type {number|null} Camera sync animation frame ID */
        this._syncFrameId = null;
    }

    /**
     * Render the comparison view into a container
     * @param {HTMLElement} container - The DOM element to render into
     * @param {Object} designA - First design object (from Design.fromJSON)
     * @param {Object} designB - Second design object (from Design.fromJSON)
     */
    render(container, designA, designB) {
        if (!container || !designA || !designB) return;

        this.container = container;
        this.designA = designA;
        this.designB = designB;

        const nameA = escapeHtml(designA.name || 'Design A');
        const nameB = escapeHtml(designB.name || 'Design B');

        container.innerHTML = `
            <div class="comparison-layout">
                <!-- Top Bar -->
                <header class="comparison-top-bar">
                    <button type="button" id="comparison-back-btn" class="btn btn-secondary btn-sm">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Back to Dashboard
                    </button>
                    <h1 class="comparison-title">Design Comparison</h1>
                    <div class="comparison-controls">
                        <button type="button" id="sync-cameras-btn" class="btn btn-secondary btn-sm" aria-pressed="false">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M9 10l1.5-1.5a2.12 2.12 0 0 0 0-3l0 0a2.12 2.12 0 0 0-3 0L6 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M7 6L5.5 7.5a2.12 2.12 0 0 0 0 3l0 0a2.12 2.12 0 0 0 3 0L10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            Sync Cameras
                        </button>
                    </div>
                </header>

                <!-- Comparison Panels -->
                <div class="comparison-panels">
                    <!-- Panel A -->
                    <div class="comparison-panel">
                        <div class="comparison-label">
                            <span class="comparison-label-badge comparison-label-a">A</span>
                            <span class="comparison-label-name">${nameA}</span>
                        </div>
                        <div class="comparison-3d-container" id="comparison-container-a"></div>
                    </div>

                    <!-- Divider -->
                    <div class="comparison-divider"></div>

                    <!-- Panel B -->
                    <div class="comparison-panel">
                        <div class="comparison-label">
                            <span class="comparison-label-badge comparison-label-b">B</span>
                            <span class="comparison-label-name">${nameB}</span>
                        </div>
                        <div class="comparison-3d-container" id="comparison-container-b"></div>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        this._attachEventListeners();

        // Initialise 3D renderers after DOM elements are available
        // Use requestAnimationFrame to ensure containers have dimensions
        requestAnimationFrame(() => {
            this._initRenderers();
        });
    }

    /**
     * Initialise the two Renderer3D instances
     * @private
     */
    _initRenderers() {
        const containerA = this.container.querySelector('#comparison-container-a');
        const containerB = this.container.querySelector('#comparison-container-b');

        if (!containerA || !containerB) return;

        try {
            // Create Renderer3D for Design A
            this.rendererA = new Renderer3D({ container: containerA });
            this.rendererA.updateFromDesign(this.designA);

            // Create Renderer3D for Design B
            this.rendererB = new Renderer3D({ container: containerB });
            this.rendererB.updateFromDesign(this.designB);
        } catch (error) {
            // WebGL context creation can fail on some devices
            const errorMsg = 'Failed to initialise 3D renderers. Your browser may not support WebGL.';
            if (containerA) containerA.innerHTML = `<p class="comparison-error">${errorMsg}</p>`;
            if (containerB) containerB.innerHTML = `<p class="comparison-error">${errorMsg}</p>`;
        }

        // Set up window resize handler
        this._boundResizeHandler = () => this._handleResize();
        window.addEventListener('resize', this._boundResizeHandler);
    }

    /**
     * Handle window resize — update both renderers
     * @private
     */
    _handleResize() {
        if (this.rendererA) this.rendererA.handleResize();
        if (this.rendererB) this.rendererB.handleResize();
    }

    /**
     * Attach event listeners for UI controls
     * @private
     */
    _attachEventListeners() {
        if (!this.container) return;

        // Back button
        const backBtn = this.container.querySelector('#comparison-back-btn');
        backBtn?.addEventListener('click', () => this.onBack());

        // Sync cameras toggle
        const syncBtn = this.container.querySelector('#sync-cameras-btn');
        syncBtn?.addEventListener('click', () => this._toggleCameraSync());
    }

    /**
     * Toggle camera synchronisation between the two 3D panels.
     * When enabled, orbiting one panel mirrors the camera in the other.
     * @private
     */
    _toggleCameraSync() {
        this.cameraSynced = !this.cameraSynced;

        const syncBtn = this.container?.querySelector('#sync-cameras-btn');
        if (syncBtn) {
            syncBtn.setAttribute('aria-pressed', String(this.cameraSynced));
            if (this.cameraSynced) {
                syncBtn.classList.add('btn-primary');
                syncBtn.classList.remove('btn-secondary');
            } else {
                syncBtn.classList.remove('btn-primary');
                syncBtn.classList.add('btn-secondary');
            }
        }

        if (this.cameraSynced) {
            this._startCameraSync();
        } else {
            this._stopCameraSync();
        }
    }

    /**
     * Start the camera sync loop.
     * Copies camera position/rotation from whichever renderer the user
     * interacted with last (detected via controls change events).
     * @private
     */
    _startCameraSync() {
        if (!this.rendererA || !this.rendererB) return;

        // Track which panel was last interacted with
        let lastActive = 'a';

        // Listen for control changes
        this._onControlChangeA = () => { lastActive = 'a'; };
        this._onControlChangeB = () => { lastActive = 'b'; };

        if (this.rendererA.controls) {
            this.rendererA.controls.addEventListener('change', this._onControlChangeA);
        }
        if (this.rendererB.controls) {
            this.rendererB.controls.addEventListener('change', this._onControlChangeB);
        }

        // Sync loop
        const syncLoop = () => {
            if (!this.cameraSynced) return;

            if (lastActive === 'a' && this.rendererA?.camera && this.rendererB?.camera) {
                this.rendererB.camera.position.copy(this.rendererA.camera.position);
                this.rendererB.camera.rotation.copy(this.rendererA.camera.rotation);
                if (this.rendererB.controls && this.rendererA.controls) {
                    this.rendererB.controls.target.copy(this.rendererA.controls.target);
                    this.rendererB.controls.update();
                }
            } else if (lastActive === 'b' && this.rendererA?.camera && this.rendererB?.camera) {
                this.rendererA.camera.position.copy(this.rendererB.camera.position);
                this.rendererA.camera.rotation.copy(this.rendererB.camera.rotation);
                if (this.rendererA.controls && this.rendererB.controls) {
                    this.rendererA.controls.target.copy(this.rendererB.controls.target);
                    this.rendererA.controls.update();
                }
            }

            this._syncFrameId = requestAnimationFrame(syncLoop);
        };

        this._syncFrameId = requestAnimationFrame(syncLoop);
    }

    /**
     * Stop the camera sync loop and remove control listeners
     * @private
     */
    _stopCameraSync() {
        if (this._syncFrameId !== null) {
            cancelAnimationFrame(this._syncFrameId);
            this._syncFrameId = null;
        }

        // Remove control change listeners
        if (this.rendererA?.controls && this._onControlChangeA) {
            this.rendererA.controls.removeEventListener('change', this._onControlChangeA);
        }
        if (this.rendererB?.controls && this._onControlChangeB) {
            this.rendererB.controls.removeEventListener('change', this._onControlChangeB);
        }

        this._onControlChangeA = null;
        this._onControlChangeB = null;
    }

    /**
     * Clean up all resources to prevent memory leaks.
     * Disposes both Renderer3D instances, removes event listeners,
     * and cancels any active animation loops.
     */
    destroy() {
        // Stop camera sync
        this._stopCameraSync();

        // Remove window resize listener
        if (this._boundResizeHandler) {
            window.removeEventListener('resize', this._boundResizeHandler);
            this._boundResizeHandler = null;
        }

        // Dispose both 3D renderers
        if (this.rendererA) {
            this.rendererA.dispose();
            this.rendererA = null;
        }
        if (this.rendererB) {
            this.rendererB.dispose();
            this.rendererB = null;
        }

        // Clear references
        this.designA = null;
        this.designB = null;
        this.container = null;
    }
}

export { ComparisonView };
export default ComparisonView;
