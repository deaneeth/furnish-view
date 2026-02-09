/**
 * FurnishView — Design Controller
 * 
 * Orchestrates create, save, load, edit, and delete operations for designs.
 * Bridges between views and storage, coordinating state changes.
 * 
 * @file js/controllers/DesignController.js
 * @module controllers/DesignController
 */

import { Design } from '../models/Design.js';
import { Room } from '../models/Room.js';
import { saveDesign, loadDesign, getAllDesigns, deleteDesign as storageDeleteDesign, exportDesignJSON } from '../utils/storage.js';
import { Toast } from '../views/components/Toast.js';
import { Modal } from '../views/components/Modal.js';

/**
 * Auto-save interval ID
 * @type {number|null}
 * @private
 */
let autoSaveIntervalId = null;

/**
 * Auto-save interval in milliseconds (30 seconds)
 * @type {number}
 */
const AUTO_SAVE_INTERVAL = 30000;

/**
 * DesignController
 * Manages design CRUD operations and state coordination
 */
const DesignController = {
    /**
     * Current design being edited
     * @type {Object|null}
     */
    currentDesign: null,
    
    /**
     * Original design JSON for change detection
     * @type {string|null}
     * @private
     */
    _originalDesignJSON: null,
    
    /**
     * Create a new design with the given room configuration
     * @param {string} name - Design name
     * @param {Object} roomConfig - Room configuration
     * @param {string} designerName - Designer's username
     * @returns {Design|null} The created design or null on failure
     */
    createDesign(name, roomConfig, designerName) {
        if (!name || !roomConfig || !designerName) {
            Toast.error('Missing required design information');
            return null;
        }
        
        try {
            // Create Room from config
            const room = new Room(roomConfig);
            
            // Create Design with Room
            const design = new Design({
                name: name,
                designerName: designerName,
                room: room,
                furniture: []
            });
            
            // Save to storage
            const success = saveDesign(design.toJSON());
            
            if (success) {
                this.currentDesign = design;
                this._originalDesignJSON = JSON.stringify(design.toJSON());
                Toast.success(`Design "${name}" created`);
                return design;
            } else {
                Toast.error('Failed to save design');
                return null;
            }
        } catch (error) {
            Toast.error('Error creating design');
            return null;
        }
    },
    
    /**
     * Save the current design to storage
     * @param {Object} design - Design to save (Design instance or plain object)
     * @returns {boolean} Success status
     */
    saveCurrentDesign(design) {
        if (!design) {
            Toast.error('No design to save');
            return false;
        }
        
        try {
            // Convert to JSON if needed
            const designJSON = typeof design.toJSON === 'function' 
                ? design.toJSON() 
                : design;
            
            const success = saveDesign(designJSON);
            
            if (success) {
                this.currentDesign = design;
                this._originalDesignJSON = JSON.stringify(designJSON);
                Toast.success('Design saved successfully');
                return true;
            } else {
                Toast.error('Failed to save design');
                return false;
            }
        } catch (error) {
            Toast.error('Error saving design');
            return false;
        }
    },
    
    /**
     * Load a design by ID
     * @param {string} designId - Design ID to load
     * @returns {Design|null} The loaded design or null if not found
     */
    loadDesign(designId) {
        if (!designId) {
            return null;
        }
        
        const design = loadDesign(designId);
        
        if (design) {
            this.currentDesign = design;
            this._originalDesignJSON = JSON.stringify(design.toJSON());
            return design;
        }
        
        return null;
    },
    
    /**
     * Get all designs for a user
     * @param {string} designerName - Designer's username
     * @returns {Array<Design>} Array of designs
     */
    getUserDesigns(designerName) {
        if (!designerName) {
            return [];
        }
        return getAllDesigns(designerName);
    },
    
    /**
     * Delete a design by ID with confirmation modal
     * @param {string} designId - Design ID to delete
     * @param {string} designName - Design name for confirmation message
     * @param {Function} onSuccess - Callback on successful deletion
     */
    deleteDesign(designId, designName, onSuccess = () => {}) {
        if (!designId) {
            Toast.error('Invalid design ID');
            return;
        }
        
        Modal.confirmDelete(designName || 'this design', () => {
            const success = storageDeleteDesign(designId);
            
            if (success) {
                Toast.success('Design deleted successfully');
                
                // Clear current design if it was the deleted one
                if (this.currentDesign?.id === designId) {
                    this.currentDesign = null;
                    this._originalDesignJSON = null;
                }
                
                onSuccess();
            } else {
                Toast.error('Failed to delete design');
            }
        });
    },
    
    /**
     * Check if design has unsaved changes
     * @param {Object} currentDesign - Current design state
     * @returns {boolean} True if there are unsaved changes
     */
    hasUnsavedChanges(currentDesign) {
        if (!currentDesign || !this._originalDesignJSON) {
            return false;
        }
        
        try {
            const currentJSON = typeof currentDesign.toJSON === 'function'
                ? JSON.stringify(currentDesign.toJSON())
                : JSON.stringify(currentDesign);
            
            return currentJSON !== this._originalDesignJSON;
        } catch {
            return false;
        }
    },
    
    /**
     * Export design as downloadable JSON file
     * @param {Object} design - Design to export
     */
    exportAsJSON(design) {
        if (!design) {
            Toast.error('No design to export');
            return;
        }
        
        try {
            // Get formatted JSON
            const designJSON = typeof design.toJSON === 'function'
                ? design.toJSON()
                : design;
            
            const jsonString = JSON.stringify(designJSON, null, 2);
            const designName = designJSON.name || 'design';
            
            // Sanitize filename
            const safeName = designName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${safeName}_${Date.now()}.json`;
            
            // Create download blob
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create and click download link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            URL.revokeObjectURL(url);
            
            Toast.success('Design exported successfully');
        } catch (error) {
            Toast.error('Failed to export design');
        }
    },
    
    /**
     * Start auto-save interval
     * @param {Function} getDesign - Function returning current design state
     * @param {number} [interval=30000] - Interval in milliseconds
     */
    startAutoSave(getDesign, interval = AUTO_SAVE_INTERVAL) {
        // Clear existing interval
        this.stopAutoSave();
        
        autoSaveIntervalId = setInterval(() => {
            const design = getDesign();
            if (design && this.hasUnsavedChanges(design)) {
                const designJSON = typeof design.toJSON === 'function'
                    ? design.toJSON()
                    : design;
                
                const success = saveDesign(designJSON);
                if (success) {
                    this._originalDesignJSON = JSON.stringify(designJSON);
                    Toast.info('Auto-saved');
                }
            }
        }, interval);
    },
    
    /**
     * Stop auto-save interval
     */
    stopAutoSave() {
        if (autoSaveIntervalId !== null) {
            clearInterval(autoSaveIntervalId);
            autoSaveIntervalId = null;
        }
    },
    
    /**
     * Set the original design state for change tracking
     * @param {Object} design - Design to set as original
     */
    setOriginalDesign(design) {
        if (design) {
            const json = typeof design.toJSON === 'function'
                ? design.toJSON()
                : design;
            this._originalDesignJSON = JSON.stringify(json);
        }
    },
    
    /**
     * Clear controller state
     */
    clear() {
        this.stopAutoSave();
        this.currentDesign = null;
        this._originalDesignJSON = null;
    }
};

export { DesignController };
export default DesignController;
