/**
 * FurnishView — GLTF Furniture Loader
 *
 * Singleton loader that attempts to load real GLTF/GLB 3D models for
 * furniture items, falling back to the procedural FurnitureFactory3D
 * if no model is available (missing local file, network error, etc.).
 *
 * Load priority:
 *   1. Local GLB at ./models/${type}.glb  (served alongside the app)
 *   2. CDN fallback URL (hardcoded per type, e.g. KhronosGroup sample assets)
 *   3. FurnitureFactory3D procedural fallback (always succeeds)
 *
 * On successful GLTF load the group is post-processed:
 *   - All meshes get castShadow = true, receiveShadow = true
 *   - The bounding box is computed and the group is uniformly scaled so
 *     its extents match the requested dimensions (width × depth × height)
 *   - The group is translated so its base sits at y = 0
 *   - Each mesh material colour is lerped 25 % toward the requested colour
 *
 * Results are cached by type so each GLB is only fetched once per session.
 *
 * @file js/graphics/GltfFurnitureLoader.js
 * @module graphics/GltfFurnitureLoader
 */

import * as THREE from '../../lib/three.module.js';
import { GLTFLoader } from '../../lib/GLTFLoader.js';
import FurnitureFactory3D from './FurnitureFactory3D.js';

/**
 * CDN fallback URLs keyed by furniture type.
 * Only types listed here will attempt a CDN download if the local GLB is missing.
 * @type {Object.<string, string>}
 */
const CDN_FALLBACKS = {
    chair:    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SheenChair/glTF-Binary/SheenChair.glb',
    chaise:   'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb',
    armchair: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/ChairDamaskPurplegold/glTF-Binary/ChairDamaskPurplegold.glb'
};

/**
 * GltfFurnitureLoader
 *
 * Singleton class that wraps GLTFLoader with a per-type cache and a
 * three-tier fallback strategy (local → CDN → procedural).
 */
class GltfFurnitureLoader {

    constructor() {
        /**
         * Shared GLTFLoader instance.
         * @type {GLTFLoader}
         * @private
         */
        this._loader = new GLTFLoader();

        /**
         * Per-type group cache.  Each entry is a cloned THREE.Group ready to
         * be added to the scene (after scaling / positioning by the caller).
         * We cache the *raw* loaded group (before dimension-fitting) because
         * the same model may be requested at different dimensions.
         *
         * Key:   furniture type string  (e.g. 'chair')
         * Value: Promise<THREE.Group>   resolved with the raw loaded root group,
         *        or null if load failed (triggers fallback on every call).
         *
         * @type {Map<string, Promise<THREE.Group|null>>}
         * @private
         */
        this._cache = new Map();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Create a furniture group for the given type, dimensions, and colour.
     *
     * Tries GLTF load (local then CDN) and falls back to FurnitureFactory3D
     * on any error.  The returned group has its base at y=0 and its extents
     * matched to the requested dimensions.
     *
     * @param {string} type       - Furniture type id (e.g. 'chair', 'sofa')
     * @param {Object} dimensions - Target dimensions in Three.js units (metres)
     * @param {number} dimensions.width
     * @param {number} dimensions.depth
     * @param {number} dimensions.height
     * @param {string} colour     - CSS hex colour string (e.g. '#8B4513')
     * @returns {Promise<THREE.Group>} Resolved with the ready-to-add group
     */
    async createFurniture(type, dimensions, colour) {
        try {
            const rawGroup = await this._loadModel(type);
            if (rawGroup) {
                // Clone so we can apply independent transforms per instance
                const group = rawGroup.clone(true);
                this._postProcess(group, dimensions, colour);
                return group;
            }
        } catch (_err) {
            // Swallow — fall through to procedural factory
        }

        // Procedural fallback
        return FurnitureFactory3D.createFurniture(type, dimensions, colour);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Load (or return cached) raw model for the given furniture type.
     *
     * Returns a Promise that resolves with the raw THREE.Group from the GLTF
     * scene, or null if every load attempt failed.
     *
     * @param {string} type
     * @returns {Promise<THREE.Group|null>}
     * @private
     */
    _loadModel(type) {
        if (this._cache.has(type)) {
            return this._cache.get(type);
        }

        const promise = this._tryLoadUrl(`./models/${type}.glb`)
            .catch(() => {
                // Local load failed — try CDN fallback if one exists
                const cdnUrl = CDN_FALLBACKS[type];
                if (cdnUrl) {
                    return this._tryLoadUrl(cdnUrl);
                }
                return null;
            })
            .catch(() => null); // CDN also failed — resolve with null

        this._cache.set(type, promise);
        return promise;
    }

    /**
     * Attempt to load a GLB/GLTF from a URL.
     *
     * Rejects the returned Promise if the load fails.
     *
     * @param {string} url
     * @returns {Promise<THREE.Group>}
     * @private
     */
    _tryLoadUrl(url) {
        return new Promise((resolve, reject) => {
            this._loader.load(
                url,
                (gltf) => {
                    resolve(gltf.scene);
                },
                undefined, // onProgress — not needed
                (error) => {
                    reject(error);
                }
            );
        });
    }

    /**
     * Post-process a cloned GLTF group to match requested dimensions and colour.
     *
     * Steps:
     *   1. Enable shadows on every mesh
     *   2. Compute bounding box and derive current extents
     *   3. Scale group uniformly so largest axis matches the target dimension
     *      (preserves model proportions while fitting within the design footprint)
     *   4. Translate group downward so its base sits at y = 0
     *   5. Apply a subtle colour tint (lerp original material colour 25 % toward
     *      the requested colour) to give visual variety between instances
     *
     * @param {THREE.Group}  group      - Cloned GLTF root group (modified in-place)
     * @param {Object}       dimensions - { width, depth, height } in metres
     * @param {string}       colour     - Hex colour string
     * @private
     */
    _postProcess(group, dimensions, colour) {
        const { width = 0.5, depth = 0.5, height = 0.85 } = dimensions;

        // --- 1. Shadows + material clamping ---
        group.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        // --- 2. Bounding box in current (un-scaled) space ---
        const box = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Guard against degenerate models
        if (size.x < 0.0001 || size.y < 0.0001 || size.z < 0.0001) {
            return;
        }

        // --- 3. Scale to fit target dimensions ---
        // Compute per-axis scale factors, then use the minimum so the model
        // fits *inside* the requested footprint without exceeding any axis.
        const scaleX = width  / size.x;
        const scaleY = height / size.y;
        const scaleZ = depth  / size.z;
        const uniformScale = Math.min(scaleX, scaleY, scaleZ);
        group.scale.setScalar(uniformScale);

        // --- 4. Move base to y = 0 ---
        // After scaling, recompute the box to get the new world min.y
        box.setFromObject(group);
        group.position.y -= box.min.y;

        // --- 5. Colour tint + clamp PBR properties ---
        // GLTF models often have high metalness/reflectivity that causes
        // extreme brightness swings under our multi-light interior setup.
        // Clamp metalness and envMapIntensity to keep lighting stable.
        const targetColour = new THREE.Color(colour || '#8B4513');
        group.traverse((node) => {
            if (!node.isMesh || !node.material) {
                return;
            }

            const clampPBR = (mat) => {
                if (mat.color) {
                    const tinted = mat.clone();
                    tinted.color.lerp(targetColour, 0.25);
                    // Clamp metalness to avoid mirror-like reflections
                    if (tinted.metalness !== undefined) {
                        tinted.metalness = Math.min(tinted.metalness, 0.35);
                    }
                    // Reduce env map contribution to prevent brightness spikes
                    if (tinted.envMapIntensity !== undefined) {
                        tinted.envMapIntensity = Math.min(tinted.envMapIntensity, 0.5);
                    }
                    // Ensure minimum roughness so specular highlights stay soft
                    if (tinted.roughness !== undefined) {
                        tinted.roughness = Math.max(tinted.roughness, 0.4);
                    }
                    return tinted;
                }
                return mat;
            };

            if (Array.isArray(node.material)) {
                node.material = node.material.map((m) => m ? clampPBR(m) : m);
            } else {
                const result = clampPBR(node.material);
                if (result !== node.material) {
                    node.material = result;
                }
            }
        });
    }
}

export default new GltfFurnitureLoader();
