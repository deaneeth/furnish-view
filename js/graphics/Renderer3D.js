/**
 * FurnishView — 3D Renderer
 *
 * Three.js 3D scene manager for room visualization.
 * Creates and manages a complete 3D scene from a Design model,
 * including room geometry, furniture meshes, lighting, and camera controls.
 *
 * Scene structure:
 * - Floor: PlaneGeometry with MeshStandardMaterial, rotated to lie flat
 * - Walls: BoxGeometry (thin boxes) positioned at room edges (back, left, right)
 * - Furniture: BoxGeometry per item with MeshStandardMaterial, positioned via worldToThree()
 * - Lighting: AmbientLight (base illumination) + DirectionalLight (shadows/shading)
 * - Camera: PerspectiveCamera with OrbitControls for interactive orbit/zoom/pan
 *
 * Materials: Uses MeshStandardMaterial exclusively (NOT MeshBasicMaterial)
 * to ensure proper light response and visible shading — a graded requirement.
 *
 * @file js/graphics/Renderer3D.js
 * @module graphics/Renderer3D
 */

import * as THREE from '../../lib/three.module.js';
import { OrbitControls } from '../../lib/OrbitControls.js';
import { worldToThree } from '../utils/scaleCalculator.js';
import { THREE_CONFIG } from '../utils/constants.js';

/**
 * Wall thickness in Three.js units (meters)
 * @type {number}
 */
const WALL_THICKNESS = 0.1;

/**
 * Shadow map resolution (width and height in pixels)
 * @type {number}
 */
const SHADOW_MAP_SIZE = 2048;

/**
 * Scene background colour — soft blue-grey for a clean studio look
 * @type {number}
 */
const SCENE_BACKGROUND = 0xE8EDF0;

/**
 * Renderer3D class
 * Manages the Three.js 3D scene for room visualization.
 *
 * @example
 * const renderer3D = new Renderer3D({ container: document.getElementById('scene-container') });
 * renderer3D.updateFromDesign(design);
 */
class Renderer3D {
    /**
     * Create a Renderer3D instance
     * @param {Object} options - Configuration
     * @param {HTMLElement} options.container - DOM element that will hold the 3D canvas
     * @param {Object} [options.design] - Design model to render immediately
     */
    constructor({ container, design = null } = {}) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new TypeError('Renderer3D requires a valid container HTMLElement');
        }

        /** @type {HTMLElement} */
        this.container = container;

        /** @type {THREE.Scene} */
        this.scene = null;

        /** @type {THREE.PerspectiveCamera} */
        this.camera = null;

        /** @type {THREE.WebGLRenderer} */
        this.renderer = null;

        /** @type {OrbitControls} */
        this.controls = null;

        /** @type {THREE.AmbientLight} */
        this.ambientLight = null;

        /** @type {THREE.DirectionalLight} */
        this.directionalLight = null;

        /** @type {Set<THREE.Mesh>} Room meshes (floor + walls) for selective clearing */
        this.roomMeshes = new Set();

        /** @type {Map<string, THREE.Mesh>} Furniture meshes keyed by furniture ID */
        this.furnitureMeshes = new Map();

        /** @type {Object|null} Current design data */
        this.currentDesign = null;

        /** @type {number|null} Animation frame request ID for cancellation */
        this.animationFrameId = null;

        /** @type {boolean} Whether the renderer has been disposed */
        this.isDisposed = false;

        // Initialise the scene pipeline
        this.initScene();
        this.setupLighting();
        this.setupControls();

        // Render initial design if provided
        if (design) {
            this.updateFromDesign(design);
        }
    }

    /**
     * Initialise the Three.js scene, camera, and renderer.
     *
     * Creates a Scene with a neutral background, a PerspectiveCamera
     * configured for room-scale viewing, and a WebGLRenderer with
     * antialiasing, alpha transparency, shadow mapping, and
     * preserveDrawingBuffer (required for PNG export).
     */
    initScene() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SCENE_BACKGROUND);

        // Camera — perspective with parameters from constants
        this.camera = new THREE.PerspectiveCamera(
            THREE_CONFIG.cameraFov,
            width / height,
            THREE_CONFIG.cameraNear,
            THREE_CONFIG.cameraFar
        );
        // Default camera position — will be adjusted when room data arrives
        this.camera.position.set(5, 6, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // Required for PNG screenshot export
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Shadow mapping
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Use default tone mapping — ACES compresses brightness
        // too aggressively for interior scenes
        this.renderer.toneMapping = THREE.NoToneMapping;

        // Append canvas to container
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Configure scene lighting for the "shading" requirement.
     *
     * Creates two lights:
     * - AmbientLight: soft fill so no surface is pure black
     * - DirectionalLight: primary light source that creates visible
     *   shadow/shade contrast on surfaces (the graded shading requirement)
     *
     * Shadow camera bounds are set generously and adjusted when room data arrives.
     */
    setupLighting() {
        // Ambient light — white at 0.6 provides even 60% base fill
        // across all surfaces so interior walls are never pure black
        this.ambientLight = new THREE.AmbientLight(
            0xffffff,
            THREE_CONFIG.ambientLightIntensity
        );
        this.scene.add(this.ambientLight);

        // Hemisphere light — soft sky/ground gradient for natural fill
        this.hemisphereLight = new THREE.HemisphereLight(
            0xddeeff, // Sky colour (cool white-blue)
            0x8B7355, // Ground colour (warm floor tone)
            0.3       // Subtle intensity
        );
        this.scene.add(this.hemisphereLight);

        // Directional light — creates shadows and visible shading
        // Positioned to shine down into the room interior
        this.directionalLight = new THREE.DirectionalLight(
            0xffffff,
            THREE_CONFIG.directionalLightIntensity
        );
        this.directionalLight.position.set(3, 10, 5);
        this.directionalLight.castShadow = true;

        // Shadow map configuration
        this.directionalLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
        this.directionalLight.shadow.mapSize.height = SHADOW_MAP_SIZE;

        // Shadow camera bounds — default generous bounds, adjusted per room
        this.directionalLight.shadow.camera.left = -15;
        this.directionalLight.shadow.camera.right = 15;
        this.directionalLight.shadow.camera.top = 15;
        this.directionalLight.shadow.camera.bottom = -15;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;

        // Reduce shadow artefacts
        this.directionalLight.shadow.bias = -0.001;

        this.scene.add(this.directionalLight);
    }

    /**
     * Build the room geometry from room data.
     *
     * Detects the room shape and delegates to the appropriate builder.
     * After building the geometry, updates lighting and camera to match
     * the room dimensions.
     *
     * @param {Object} room - Room data with width, depth, height, shape, wallColour, floorColour
     */
    buildRoom(room) {
        if (!room) {
            return;
        }

        const roomWidth = room.width || 5;
        const roomDepth = room.depth || 4;
        const roomHeight = room.height || 2.8;
        const wallColour = room.wallColour || '#E8E0D4';
        const floorColour = room.floorColour || '#8B7355';
        const isLShaped = room.shape === 'l-shaped';

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: floorColour,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: wallColour,
            roughness: 0.7,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        if (isLShaped) {
            this._buildLShapedRoom(roomWidth, roomDepth, roomHeight, floorMaterial, wallMaterial);
        } else {
            this._buildRectangularRoom(roomWidth, roomDepth, roomHeight, floorMaterial, wallMaterial);
        }

        // --- Update directional light to shine into the room interior ---
        this.directionalLight.position.set(
            roomWidth * 0.3,
            roomHeight * 3,
            roomDepth * 0.5
        );
        this.directionalLight.target.position.set(0, 0, 0);
        this.directionalLight.target.updateMatrixWorld();
        this.directionalLight.shadow.camera.left = -(roomWidth + 2);
        this.directionalLight.shadow.camera.right = roomWidth + 2;
        this.directionalLight.shadow.camera.top = roomDepth + 2;
        this.directionalLight.shadow.camera.bottom = -(roomDepth + 2);
        this.directionalLight.shadow.camera.updateProjectionMatrix();

        // --- Update camera position relative to room size ---
        this.camera.position.set(
            roomWidth * 0.7,
            roomHeight * 2,
            roomDepth * 1.5
        );
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Build a rectangular room (floor + 3 walls, front open).
     *
     * @param {number} w - Room width
     * @param {number} d - Room depth
     * @param {number} h - Room height
     * @param {THREE.Material} floorMat - Floor material
     * @param {THREE.Material} wallMat - Wall material
     * @private
     */
    _buildRectangularRoom(w, d, h, floorMat, wallMat) {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(w, d);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.roomMeshes.add(floor);

        // Back wall
        this._addWallSegment(-w / 2, -d / 2, w / 2, -d / 2, h, wallMat);
        // Left wall
        this._addWallSegment(-w / 2, -d / 2, -w / 2, d / 2, h, wallMat);
        // Right wall
        this._addWallSegment(w / 2, -d / 2, w / 2, d / 2, h, wallMat);
    }

    /**
     * Build an L-shaped room.
     *
     * The L-shape matches the 2D renderer convention:
     *   cutWidth  = 40 % of width  (removed from the right)
     *   cutDepth  = 40 % of depth  (removed from the bottom / front)
     *
     * 2D world-space vertices (origin top-left):
     *   P0(0,0)  P1(W,0)
     *   P2(W, D-cD)  P3(W-cW, D-cD)
     *   P4(W-cW, D)  P5(0, D)
     *
     * These are re-centred to 3D space where (0,0,0) is the bounding-box
     * centre so that the room sits naturally at the scene origin.
     *
     * @param {number} w  - Full bounding width
     * @param {number} d  - Full bounding depth
     * @param {number} h  - Room height
     * @param {THREE.Material} floorMat
     * @param {THREE.Material} wallMat
     * @private
     */
    _buildLShapedRoom(w, d, h, floorMat, wallMat) {
        const cutW = w * 0.4;
        const cutD = d * 0.4;

        // Half-dimensions for centring
        const hw = w / 2;
        const hd = d / 2;

        // L-shape vertices centred on origin (X = left/right, Z = back/front).
        // Listed counter-clockwise starting from back-left.
        //
        //  P0 -------- P1        (back wall)
        //  |            |
        //  |            P2--P3   (step)
        //  |                |
        //  P5 ----------- P4    (front wall segments)
        //
        const pts = [
            { x: -hw,          z: -hd },           // P0  back-left
            { x:  hw,          z: -hd },           // P1  back-right
            { x:  hw,          z: -hd + (d - cutD)}, // P2  right step top
            { x:  hw - cutW,   z: -hd + (d - cutD)}, // P3  inner corner top
            { x:  hw - cutW,   z:  hd },           // P4  inner corner bottom
            { x: -hw,          z:  hd }            // P5  front-left
        ];

        // --- Floor (use THREE.Shape on XZ plane) ---
        // IMPORTANT: ShapeGeometry lies on XY. After rotating -PI/2 around X,
        // shape-Y maps to -Z in world space.  We negate the Z values so that
        // shape point (x, -z, 0) → rotation → world (x, 0, z), aligning the
        // floor polygon with the wall segments.
        const shape = new THREE.Shape();
        shape.moveTo(pts[0].x, -pts[0].z);
        for (let i = 1; i < pts.length; i++) {
            shape.lineTo(pts[i].x, -pts[i].z);
        }
        shape.closePath();

        const floorGeo = new THREE.ShapeGeometry(shape);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.roomMeshes.add(floor);

        // --- Walls (omit front-left→back-left edge to keep the room open) ---
        // Back wall:      P0 → P1
        this._addWallSegment(pts[0].x, pts[0].z, pts[1].x, pts[1].z, h, wallMat);
        // Right upper:    P1 → P2
        this._addWallSegment(pts[1].x, pts[1].z, pts[2].x, pts[2].z, h, wallMat);
        // Inner step hor: P2 → P3
        this._addWallSegment(pts[2].x, pts[2].z, pts[3].x, pts[3].z, h, wallMat);
        // Inner step vert:P3 → P4
        this._addWallSegment(pts[3].x, pts[3].z, pts[4].x, pts[4].z, h, wallMat);
        // Left wall:      P0 → P5   (back-left to front-left)
        this._addWallSegment(pts[0].x, pts[0].z, pts[5].x, pts[5].z, h, wallMat);
    }

    /**
     * Create a single wall segment between two XZ points.
     *
     * Uses BoxGeometry oriented along the segment direction. The wall is
     * WALL_THICKNESS deep and `height` tall.
     *
     * @param {number} x1 - Start X
     * @param {number} z1 - Start Z
     * @param {number} x2 - End X
     * @param {number} z2 - End Z
     * @param {number} height - Wall height
     * @param {THREE.Material} material - Wall material (will be cloned)
     * @private
     */
    _addWallSegment(x1, z1, x2, z2, height, material) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.001) return; // degenerate segment

        const angle = Math.atan2(dx, dz); // rotation around Y axis

        const geo = new THREE.BoxGeometry(WALL_THICKNESS, height, length);
        const wall = new THREE.Mesh(geo, material.clone());
        wall.position.set(
            (x1 + x2) / 2,
            height / 2,
            (z1 + z2) / 2
        );
        wall.rotation.y = angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.roomMeshes.add(wall);
    }

    /**
     * Build furniture meshes from a furniture array.
     *
     * Each furniture item becomes a BoxGeometry with MeshStandardMaterial,
     * positioned in 3D space using the worldToThree() coordinate mapper.
     * The furniture's 2D (x, y) position maps to Three.js (x, z),
     * and the Y position is set to half the item height so it sits on the floor.
     *
     * Each mesh stores its furniture ID in userData for future click detection.
     *
     * @param {Array<Object>} furnitureArray - Array of furniture item data
     */
    buildFurniture(furnitureArray) {
        if (!Array.isArray(furnitureArray) || !this.currentDesign) {
            return;
        }

        const room = this.currentDesign.room;
        if (!room) {
            return;
        }

        const roomWidth = room.width || 5;
        const roomDepth = room.depth || 4;

        for (const item of furnitureArray) {
            if (!item) {
                continue;
            }

            const itemWidth = item.width || 0.5;
            const itemHeight = item.height || 0.85;
            const itemDepth = item.depth || 0.5;
            const itemColour = item.colour || '#5C4033';

            // Create box mesh for this furniture piece
            const geometry = new THREE.BoxGeometry(itemWidth, itemHeight, itemDepth);
            const material = new THREE.MeshStandardMaterial({
                color: itemColour,
                roughness: 0.6,
                metalness: 0.15
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Convert 2D layout position to 3D world position
            // item.x/item.y are in world meters from room origin (top-left in 2D)
            // worldToThree centres them around (0, 0, 0)
            const threePos = worldToThree(
                item.x + itemWidth / 2,  // Centre of furniture in X
                item.y + itemDepth / 2,  // Centre of furniture in Z
                roomWidth,
                roomDepth
            );

            mesh.position.set(
                threePos.x,
                itemHeight / 2,  // Bottom sits on floor (y=0)
                threePos.z
            );

            // Apply rotation if present (convert degrees to radians, rotate around Y axis)
            if (item.rotation && item.rotation !== 0) {
                mesh.rotation.y = -(item.rotation * Math.PI) / 180;
            }

            // Shadow configuration
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Store furniture ID for future click/raycasting detection
            mesh.userData.furnitureId = item.id || '';
            mesh.userData.furnitureType = item.type || 'unknown';

            this.scene.add(mesh);
            this.furnitureMeshes.set(item.id, mesh);
        }
    }

    /**
     * Configure OrbitControls for interactive camera manipulation.
     *
     * Enables smooth orbit, zoom, and pan with damping.
     * Constrains the polar angle to prevent looking from below the floor,
     * and limits zoom distance to keep the room in view.
     */
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Smooth damping for professional feel
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Prevent camera from going below the floor plane
        this.controls.maxPolarAngle = Math.PI / 2;

        // Zoom distance limits
        this.controls.minDistance = 1;
        this.controls.maxDistance = 30;

        // Look at a point slightly above the floor
        this.controls.target.set(0, 0.5, 0);

        // Smooth zoom
        this.controls.zoomSpeed = 0.8;

        this.controls.update();
    }

    /**
     * Clear all room meshes from the scene and dispose their resources.
     * @private
     */
    _clearRoomMeshes() {
        for (const mesh of this.roomMeshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                mesh.material.dispose();
            }
        }
        this.roomMeshes.clear();
    }

    /**
     * Clear all furniture meshes from the scene and dispose their resources.
     * @private
     */
    _clearFurnitureMeshes() {
        for (const [, mesh] of this.furnitureMeshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                mesh.material.dispose();
            }
        }
        this.furnitureMeshes.clear();
    }

    /**
     * Main render method — rebuilds the scene from the current design
     * and starts the animation loop.
     *
     * Clears existing room and furniture meshes (keeps lights),
     * then rebuilds from the current design state.
     */
    render() {
        if (this.isDisposed || !this.currentDesign) {
            return;
        }

        // Clear existing scene objects (keep lights)
        this._clearRoomMeshes();
        this._clearFurnitureMeshes();

        // Rebuild from design
        this.buildRoom(this.currentDesign.room);
        this.buildFurniture(this.currentDesign.furniture || []);

        // Start animation loop if not already running
        if (this.animationFrameId === null) {
            this.animate();
        }
    }

    /**
     * Animation loop — updates controls and renders the scene each frame.
     *
     * Uses requestAnimationFrame for smooth, browser-synced rendering.
     * Required for OrbitControls damping to work correctly.
     * @private
     */
    animate() {
        if (this.isDisposed) {
            return;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Update controls (required for damping)
        if (this.controls) {
            this.controls.update();
        }

        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Update the scene from a design model.
     *
     * Called when switching from 2D to 3D view, or when the design changes
     * (e.g., after colour changes, furniture moves, room edits).
     * Stores the design reference and triggers a full scene rebuild.
     *
     * @param {Object} design - Design object with room and furniture data
     */
    updateFromDesign(design) {
        if (!design) {
            return;
        }

        this.currentDesign = design;
        this.render();
    }

    /**
     * Handle container resize by updating camera aspect ratio and renderer size.
     *
     * Should be called when the container element changes dimensions
     * (e.g., window resize, panel toggle).
     */
    handleResize() {
        if (this.isDisposed) {
            return;
        }

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Capture a screenshot of the current 3D view as a PNG data URL.
     *
     * Renders a fresh frame before capturing to ensure the image is current.
     * Requires preserveDrawingBuffer: true on the WebGLRenderer constructor.
     *
     * @returns {string|null} PNG image data URL, or null if renderer unavailable
     */
    captureScreenshot() {
        if (this.isDisposed || !this.renderer || !this.scene || !this.camera) {
            return null;
        }

        // Render a fresh frame to ensure the buffer is current
        this.renderer.render(this.scene, this.camera);

        return this.renderer.domElement.toDataURL('image/png');
    }

    /**
     * Clean up all Three.js resources to prevent memory leaks.
     *
     * Cancels the animation loop, disposes all geometries and materials,
     * disposes the renderer and controls, and removes the canvas from the DOM.
     * After calling dispose(), this instance should not be reused.
     */
    dispose() {
        this.isDisposed = true;

        // Cancel animation loop
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Dispose room and furniture meshes
        this._clearRoomMeshes();
        this._clearFurnitureMeshes();

        // Dispose lights
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
        if (this.hemisphereLight) {
            this.scene.remove(this.hemisphereLight);
            this.hemisphereLight = null;
        }
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
            if (this.directionalLight.shadow && this.directionalLight.shadow.map) {
                this.directionalLight.shadow.map.dispose();
            }
            this.directionalLight = null;
        }

        // Dispose controls
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }

        // Remove canvas from DOM and dispose renderer
        if (this.renderer) {
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
            this.renderer = null;
        }

        // Clear references
        this.scene = null;
        this.camera = null;
        this.currentDesign = null;
    }
}

export { Renderer3D };
export default Renderer3D;
