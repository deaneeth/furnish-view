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
 * - Furniture: Composite THREE.Groups from FurnitureFactory3D with MeshStandardMaterial
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
import FurnitureFactory3D from './FurnitureFactory3D.js';
import gltfLoader from './GltfFurnitureLoader.js';
import { getFurnitureByType } from '../data/furnitureCatalogue.js';

/**
 * Furniture types that must be placed on a table surface
 * @type {Set<string>}
 */
const TABLETOP_ITEMS = new Set(['table-plant', 'table-lamp', 'bedside-lamp']);

/**
 * Furniture types that provide a surface for tabletop items
 * @type {Set<string>}
 */
const TABLE_SURFACES = new Set(['side-table', 'desk', 'tv-stand', 'coffee-table', 'dining-table']);

/**
 * Furniture types that are mounted on walls
 * @type {Set<string>}
 */
const WALL_ITEMS = new Set(['single-door', 'double-door', 'standard-window', 'tall-window', 'small-window']);

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
 * Scene background colour — warm off-white for interior atmosphere
 * @type {number}
 */
const SCENE_BACKGROUND = 0xF5F0EC;

/**
 * Skirting board height in meters
 * @type {number}
 */
const SKIRTING_HEIGHT = 0.08;

/**
 * Ceiling border strip height in meters
 * @type {number}
 */
const CEILING_TRIM_HEIGHT = 0.03;

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

        /** @type {THREE.GridHelper|null} Floor grid overlay */
        this.gridHelper = null;

        /** @type {THREE.PointLight|null} Warm ceiling fixture light */
        this.pointLight = null;

        /** @type {THREE.DirectionalLight|null} Cool fill light from opposite side */
        this.fillLight = null;

        /** @type {THREE.DirectionalLight|null} Rim/back edge highlight light */
        this.rimLight = null;

        /** @type {THREE.Raycaster} Raycaster used for 3D furniture drag interaction */
        this._raycaster = new THREE.Raycaster();

        /** @type {boolean} Whether furniture-move mode is active */
        this._moveMode = false;

        /** @type {{group: THREE.Group, itemId: string}|null} Currently dragged item */
        this._dragging = null;

        /** @type {Function|null} Callback fired with (itemId, x, z) when a drag ends */
        this._moveOnMoveEndCallback = null;

        /** @type {Function|null} Optional collision resolver for 3D drag */
        this._moveResolvePosition = null;

        // ── Roof / Translucent-walls toggle state ──

        /** @type {THREE.Mesh|null} Ceiling plane mesh */
        this._ceilingMesh = null;

        /** @type {boolean} Whether the ceiling is currently shown */
        this._roofVisible = false;

        /** @type {boolean} Whether translucent-walls mode is active */
        this._translucentWallsActive = false;

        /** @type {number} Current wall opacity when translucent (0.05–1.0) */
        this._wallOpacity = 0.35;

        /** @type {THREE.Mesh|null} The 4th (front/POV) wall mesh */
        this._frontWallMesh = null;

        /** @type {THREE.Material[]} All wall segment materials for bulk opacity changes */
        this._wallMaterials = [];

        /** @type {THREE.Material|null} Ceiling material reference */
        this._ceilingMaterial = null;

        /** @type {Object|null} Saved room dimensions for toggle methods */
        this._roomDims = null;

        // Bound event handler references (stored so they can be removed later)
        this._bound3dDragStart = this._on3dDragStart.bind(this);
        this._bound3dDragMove  = this._on3dDragMove.bind(this);
        this._bound3dDragEnd   = this._on3dDragEnd.bind(this);

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
        this.scene.fog = new THREE.FogExp2(SCENE_BACKGROUND, 0.04);

        // Procedural environment map for realistic PBR reflections.
        // Creates a warm interior-lit gradient so metal / shiny surfaces
        // have something to reflect, dramatically improving realism.
        // Must come after renderer init (PMREMGenerator needs WebGL context).

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

        // Shadow mapping — PCFSoft for realistic soft-edged shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // ACES Filmic tone mapping — cinematic warm colour grading
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // SRGB colour space for correct gamma (r160+), fallback for older builds
        if (THREE.SRGBColorSpace !== undefined) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if (THREE.sRGBEncoding !== undefined) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        // Append canvas to container
        this.container.appendChild(this.renderer.domElement);

        // Build environment map now that the renderer is ready
        this._buildEnvironmentMap();
    }

    /**
     * Configure scene lighting for commercial-quality interior rendering.
     *
     * Multi-light setup modelled on architectural visualisation practice:
     * - AmbientLight:    very low level, keeps shadow areas from going pitch-black
     * - HemisphereLight: sky/ground gradient for natural outdoor-light feel
     * - Key DirectionalLight: warm sun/window light, high-res shadow map
     * - Fill DirectionalLight: cool opposite-side bounce, no shadows
     * - Rim DirectionalLight: back-edge highlight to separate objects from bg
     * - Warm PointLight: interior ceiling fixture, casts shadows
     */
    setupLighting() {
        // Ambient — very low; just lifts pure shadow areas slightly
        this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.25);
        this.scene.add(this.ambientLight);

        // Hemisphere — warm sky / warm-brown ground for interior feel
        this.hemisphereLight = new THREE.HemisphereLight(0xfff5e0, 0x8B7355, 0.35);
        this.hemisphereLight.position.set(0, 10, 0);
        this.scene.add(this.hemisphereLight);

        // Key light — warm sun/window, casts high-resolution shadows
        this.directionalLight = new THREE.DirectionalLight(0xfff8dc, 1.6);
        this.directionalLight.position.set(5, 8, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 30;
        this.directionalLight.shadow.camera.left = -10;
        this.directionalLight.shadow.camera.right = 10;
        this.directionalLight.shadow.camera.top = 10;
        this.directionalLight.shadow.camera.bottom = -10;
        this.directionalLight.shadow.bias = -0.001;
        this.directionalLight.shadow.normalBias = 0.02;
        this.scene.add(this.directionalLight);

        // Fill light — cool, opposite side, no shadows (reduces harsh contrast)
        this.fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.45);
        this.fillLight.position.set(-4, 6, -3);
        this.scene.add(this.fillLight);

        // Rim / back light — edge highlight to separate furniture from walls
        this.rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
        this.rimLight.position.set(0, 8, -8);
        this.scene.add(this.rimLight);

        // Warm interior point light — simulates a ceiling fixture
        this.pointLight = new THREE.PointLight(0xffad60, 0.8, 8);
        this.pointLight.position.set(0, 2.5, 0);
        this.pointLight.castShadow = true;
        this.pointLight.shadow.mapSize.width = 1024;
        this.pointLight.shadow.mapSize.height = 1024;
        this.scene.add(this.pointLight);
    }

    /**
     * Generate a procedural environment map for PBR reflections.
     *
     * Creates a small data texture that simulates warm interior lighting
     * with a bright top (ceiling bounce), warm sides (wall reflections),
     * and dark bottom (floor). Processed through PMREMGenerator for
     * correct roughness-based reflections on MeshStandardMaterial.
     *
     * @private
     */
    _buildEnvironmentMap() {
        const size = 64;
        const data = new Float32Array(size * size * 4);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                // Normalised vertical position (0 = bottom, 1 = top)
                const v = y / (size - 1);

                // Warm interior gradient: floor dark → wall warm → ceiling bright
                const brightness = 0.1 + v * 0.4 + Math.pow(v, 3) * 0.25;
                // Warm golden tint (red > green > blue)
                data[i]     = brightness * 1.05;  // R
                data[i + 1] = brightness * 0.92;  // G
                data[i + 2] = brightness * 0.72;  // B
                data[i + 3] = 1.0;                // A

                // Subtle horizontal variation (brighter toward window side)
                const u = x / (size - 1);
                const windowGlow = Math.exp(-Math.pow((u - 0.7) * 3, 2)) * 0.12;
                data[i]     += windowGlow;
                data[i + 1] += windowGlow * 0.85;
                data[i + 2] += windowGlow * 0.6;
            }
        }

        const envTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        envTexture.needsUpdate = true;

        // PMREMGenerator creates pre-filtered mip levels for roughness-based reflections
        if (this.renderer) {
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            pmremGenerator.compileEquirectangularShader();
            const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
            this.scene.environment = envMap;
            pmremGenerator.dispose();
            envTexture.dispose();
        }
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

        // Store dimensions for toggle methods (roof, translucent walls)
        this._roomDims = { w: roomWidth, d: roomDepth, h: roomHeight, wallColour, isLShaped };

        // Hardwood floor material with procedural planks
        const floorMaterial = this._createHardwoodFloorMaterial(floorColour, roomWidth, roomDepth);

        // Plaster/paint wall material
        const wallMaterial = this._createWallMaterial(wallColour);

        if (isLShaped) {
            this._buildLShapedRoom(roomWidth, roomDepth, roomHeight, floorMaterial, wallMaterial);
        } else {
            this._buildRectangularRoom(roomWidth, roomDepth, roomHeight, floorMaterial, wallMaterial);
        }

        // --- Floor grid overlay for scale reference ---
        // Custom line grid clipped to exact room dimensions (GridHelper creates a
        // square that overflows the smaller dimension, so we draw our own lines).
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            if (this.gridHelper.geometry) this.gridHelper.geometry.dispose();
            if (this.gridHelper.material) this.gridHelper.material.dispose();
        }
        const gridGroup = this._buildRoomGrid(roomWidth, roomDepth);
        gridGroup.position.y = 0.002;
        this.gridHelper = gridGroup;
        this.scene.add(this.gridHelper);
        this.roomMeshes.add(this.gridHelper);

        // --- Extended ground plane (spatial context beyond the room) ---
        const groundSize = Math.max(roomWidth, roomDepth) * 5;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0xEAE4DC,
            roughness: 0.98,
            metalness: 0.0
        });
        const groundPlane = new THREE.Mesh(groundGeo, groundMat);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.005;
        groundPlane.receiveShadow = true;
        groundPlane.castShadow = false;
        this.scene.add(groundPlane);
        this.roomMeshes.add(groundPlane);

        // --- Subtle reference grid on extended ground ---
        const gridSpan = Math.max(roomWidth, roomDepth) * 4;
        const gridDiv = Math.round(gridSpan); // ~1 m per division
        const extGrid = new THREE.GridHelper(gridSpan, gridDiv, 0xCCCCCC, 0xDDDDDD);
        extGrid.position.y = -0.003;
        extGrid.material.opacity = 0.3;
        extGrid.material.transparent = true;
        this.scene.add(extGrid);
        this.roomMeshes.add(extGrid);

        // --- Room boundary outline (thin line at floor perimeter) ---
        const hw = roomWidth / 2;
        const hd = roomDepth / 2;
        const boundaryVerts = new Float32Array([
            -hw, 0.002, -hd,   hw, 0.002, -hd,
             hw, 0.002, -hd,   hw, 0.002,  hd,
             hw, 0.002,  hd,  -hw, 0.002,  hd,
            -hw, 0.002,  hd,  -hw, 0.002, -hd
        ]);
        const boundaryGeo = new THREE.BufferGeometry();
        boundaryGeo.setAttribute('position', new THREE.BufferAttribute(boundaryVerts, 3));
        const boundaryMat = new THREE.LineBasicMaterial({ color: 0x999999 });
        const boundaryLine = new THREE.LineSegments(boundaryGeo, boundaryMat);
        this.scene.add(boundaryLine);
        this.roomMeshes.add(boundaryLine);

        // --- Exponential fog for atmospheric depth ---
        this.scene.fog = new THREE.FogExp2(SCENE_BACKGROUND, 0.04);
        this.scene.background = new THREE.Color(SCENE_BACKGROUND);

        // --- Update key light to cover the room ---
        this.directionalLight.position.set(
            roomWidth * 0.7,
            roomHeight * 2.2,
            roomDepth * 0.9
        );
        this.directionalLight.target.position.set(0, 0, 0);
        this.directionalLight.target.updateMatrixWorld();
        // Tighten shadow camera to actual room size for best shadow quality
        const shadowPad = 2;
        this.directionalLight.shadow.camera.left = -(roomWidth / 2 + shadowPad);
        this.directionalLight.shadow.camera.right = roomWidth / 2 + shadowPad;
        this.directionalLight.shadow.camera.top = roomDepth / 2 + shadowPad;
        this.directionalLight.shadow.camera.bottom = -(roomDepth / 2 + shadowPad);
        this.directionalLight.shadow.camera.updateProjectionMatrix();

        // --- Reposition ceiling point light to room centre ---
        if (this.pointLight) {
            this.pointLight.position.set(0, roomHeight * 0.9, 0);
            // Scale range with room size
            this.pointLight.distance = Math.max(roomWidth, roomDepth) * 1.5;
        }

        // --- Camera: cinematic "standing at door" angle ---
        // Skip camera repositioning if a fly-in animation is in progress
        if (!this._flyInActive) {
            this.camera.fov = 55;
            this.camera.updateProjectionMatrix();
            this.camera.position.set(
                roomWidth * 0.8,
                roomHeight * 1.2,
                roomDepth * 1.4
            );
            this.camera.lookAt(0, roomHeight * 0.3, 0);
        }

        // Update orbit target and constraints
        if (this.controls) {
            if (!this._flyInActive) {
                this.controls.target.set(0, roomHeight * 0.3, 0);
            }
            this.controls.minDistance = 1;
            this.controls.maxDistance = 20;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.rotateSpeed = 0.7;
            this.controls.zoomSpeed = 0.8;
            if (!this._flyInActive) {
                this.controls.update();
            }
        }
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
        // Reset toggle-related references for clean rebuild
        this._wallMaterials = [];
        this._frontWallMesh = null;
        this._ceilingMesh = null;
        this._ceilingMaterial = null;

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

        // --- Architectural trim details ---
        this._addWallTrim(w, d, h, wallMat);
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
        // Reset toggle-related references for clean rebuild
        this._wallMaterials = [];
        this._frontWallMesh = null;
        this._ceilingMesh = null;
        this._ceilingMaterial = null;

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
        this._wallMaterials.push(wall.material);
        return wall;
    }

    /**
     * Add architectural trim details to a rectangular room.
     *
     * Creates skirting boards (SKIRTING_HEIGHT) at the base of each wall and
     * thin ceiling border strips (CEILING_TRIM_HEIGHT) at the top. Both use
     * a slightly darker shade of the wall colour for subtle visual definition.
     *
     * @param {number} w - Room width
     * @param {number} d - Room depth
     * @param {number} h - Room height
     * @param {THREE.Material} wallMat - Wall material (colour is darkened for trim)
     * @private
     */
    _addWallTrim(w, d, h, wallMat) {
        // Derive a slightly darker shade from the wall colour
        const wallColor = wallMat.color ? wallMat.color : new THREE.Color(0xccc0b0);
        const trimColor = wallColor.clone().multiplyScalar(0.82);

        const skirtMat = new THREE.MeshStandardMaterial({
            color: trimColor,
            roughness: 0.6,
            metalness: 0.05
        });

        const ceilTrimMat = new THREE.MeshStandardMaterial({
            color: trimColor,
            roughness: 0.6,
            metalness: 0.05
        });

        // Wall segments: [startX, startZ, endX, endZ] — same 3 walls as rectangular room
        const segments = [
            [-w / 2, -d / 2,  w / 2, -d / 2], // Back
            [-w / 2, -d / 2, -w / 2,  d / 2], // Left
            [ w / 2, -d / 2,  w / 2,  d / 2]  // Right
        ];

        for (const [x1, z1, x2, z2] of segments) {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.001) continue;

            const angle = Math.atan2(dx, dz);
            const cx = (x1 + x2) / 2;
            const cz = (z1 + z2) / 2;

            // Skirting board at wall base
            const skirtGeo = new THREE.BoxGeometry(
                WALL_THICKNESS + 0.02, SKIRTING_HEIGHT, length
            );
            const skirting = new THREE.Mesh(skirtGeo, skirtMat.clone());
            skirting.position.set(cx, SKIRTING_HEIGHT / 2, cz);
            skirting.rotation.y = angle;
            skirting.receiveShadow = true;
            this.scene.add(skirting);
            this.roomMeshes.add(skirting);

            // Ceiling border strip at wall top
            const ceilGeo = new THREE.BoxGeometry(
                WALL_THICKNESS + 0.01, CEILING_TRIM_HEIGHT, length
            );
            const ceilTrim = new THREE.Mesh(ceilGeo, ceilTrimMat.clone());
            ceilTrim.position.set(cx, h - CEILING_TRIM_HEIGHT / 2, cz);
            ceilTrim.rotation.y = angle;
            this.scene.add(ceilTrim);
            this.roomMeshes.add(ceilTrim);
        }
    }

    /**
     * Build composite furniture meshes from a furniture array.
     *
     * Uses FurnitureFactory3D to create recognisable multi-mesh furniture
     * (chairs with legs and backrests, tables with tops and legs, etc.)
     * instead of plain BoxGeometry cubes.
     *
     * Each furniture item becomes a THREE.Group containing multiple meshes,
     * positioned in 3D space using the worldToThree() coordinate mapper.
     * The factory builds furniture centered at origin with base at y=0,
     * so the group position.y is set to 0 (floor level).
     *
     * Each group stores its furniture ID and type in userData for
     * future click/raycasting detection.
     *
     * @param {Array<Object>} furnitureArray - Array of furniture item data
     */
    async buildFurniture(furnitureArray) {
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
            const itemDepth = item.depth || 0.5;
            const itemColour = item.colour || '#5C4033';

            // For left/right wall items, width/depth are swapped for the 2D bounding box.
            // Use the natural (unswapped) dimensions for the 3D model.
            const isVertWall = WALL_ITEMS.has(item.type) && (item.wall === 'left' || item.wall === 'right');
            const modelWidth = isVertWall ? itemDepth : itemWidth;
            const modelDepth = isVertWall ? itemWidth : itemDepth;

            // Create composite furniture group — try GLTF first, fall back to factory
            const furnitureGroup = await gltfLoader.createFurniture(
                item.type,
                { width: modelWidth, depth: modelDepth, height: item.height || 0.85 },
                itemColour
            );

            // Convert 2D layout position to 3D world position
            // item.x/item.y are in world meters from room origin (top-left in 2D)
            // worldToThree centres them around (0, 0, 0)
            const threePos = worldToThree(
                item.x + itemWidth / 2,  // Centre of furniture in X
                item.y + itemDepth / 2,  // Centre of furniture in Z
                roomWidth,
                roomDepth
            );

            // Position group — y=0 for floor items, elevated for tabletop items
            let yPos = 0;

            if (TABLETOP_ITEMS.has(item.type)) {
                // Find the table this item sits on by checking 2D overlap
                const tableHeight = this._findTableHeightForItem(item, furnitureArray);
                if (tableHeight > 0) {
                    yPos = tableHeight;
                }
            }

            // Wall items: position flush against wall at correct height
            if (WALL_ITEMS.has(item.type) && item.wall) {
                const catDef = getFurnitureByType(item.type);
                const wallHeight = catDef && catDef.wallHeight ? catDef.wallHeight : 0;
                yPos = wallHeight;

                // For wall items, the 2D position (item.x, item.y) is the top-left of the item's
                // bounding box on the wall. We need to position the 3D mesh at the correct
                // wall surface. The 3D model is built centred at origin facing +Z.
                const wallThickness = 0.1;
                const halfWT = wallThickness / 2;

                if (item.wall === 'top') {
                    // Top wall: item sits at z = -roomDepth/2 (in Three.js coords)
                    const cx = item.x + itemWidth / 2;
                    const tp = worldToThree(cx, 0, roomWidth, roomDepth);
                    furnitureGroup.position.set(tp.x, yPos, -roomDepth / 2 + halfWT);
                    // Face inward (+Z direction) — no rotation needed
                } else if (item.wall === 'bottom') {
                    const cx = item.x + itemWidth / 2;
                    const tp = worldToThree(cx, roomDepth, roomWidth, roomDepth);
                    furnitureGroup.position.set(tp.x, yPos, roomDepth / 2 - halfWT);
                    furnitureGroup.rotation.y = Math.PI; // face inward
                } else if (item.wall === 'left') {
                    // item.depth holds the along-wall span (swapped at placement)
                    const cy = item.y + itemDepth / 2;
                    const tp = worldToThree(0, cy, roomWidth, roomDepth);
                    furnitureGroup.position.set(-roomWidth / 2 + halfWT, yPos, tp.z);
                    furnitureGroup.rotation.y = Math.PI / 2; // face inward (+X)
                } else if (item.wall === 'right') {
                    const cy = item.y + itemDepth / 2;
                    const tp = worldToThree(roomWidth, cy, roomWidth, roomDepth);
                    furnitureGroup.position.set(roomWidth / 2 - halfWT, yPos, tp.z);
                    furnitureGroup.rotation.y = -Math.PI / 2; // face inward (-X)
                }

                furnitureGroup.userData.furnitureId = item.id || '';
                furnitureGroup.userData.furnitureType = item.type || 'unknown';
                this.scene.add(furnitureGroup);
                this.furnitureMeshes.set(item.id, furnitureGroup);
                continue; // skip default positioning below
            }

            furnitureGroup.position.set(threePos.x, yPos, threePos.z);

            // Apply rotation if present (convert degrees to radians, rotate around Y axis)
            // Negative because Canvas rotation is clockwise, Three.js is counter-clockwise
            if (item.rotation && item.rotation !== 0) {
                furnitureGroup.rotation.y = -(item.rotation * Math.PI) / 180;
            }

            // Store furniture ID and type for future click/raycasting detection
            furnitureGroup.userData.furnitureId = item.id || '';
            furnitureGroup.userData.furnitureType = item.type || 'unknown';


            this.scene.add(furnitureGroup);
            this.furnitureMeshes.set(item.id, furnitureGroup);
        }
    }

    /**
     * Find the table surface height for a tabletop item by checking 2D overlap
     * with table-type furniture in the same layout.
     *
     * @param {Object} item - The tabletop furniture item { x, y, width, depth, type }
     * @param {Array} furnitureArray - All furniture items in the design
     * @returns {number} Table height in meters, or 0 if no table found
     * @private
     */
    _findTableHeightForItem(item, furnitureArray) {
        for (const other of furnitureArray) {
            if (!TABLE_SURFACES.has(other.type)) continue;

            // Check 2D bounding-box overlap
            const overlaps =
                item.x < other.x + other.width &&
                item.x + item.width > other.x &&
                item.y < other.y + other.depth &&
                item.y + item.depth > other.y;

            if (overlaps) {
                // Use catalogue height for the table, falling back to item.height
                const def = getFurnitureByType(other.type);
                return def ? def.defaultHeight : (other.height || 0.75);
            }
        }
        return 0;
    }

    /**
     * Configure OrbitControls for interactive camera manipulation.
     *
     * Enables smooth orbit, zoom, and pan with damping.
     * Constrains polar angle to prevent disorienting camera angles,
     * and sets zoom/pan/rotate speeds for a fluid, professional feel.
     *
     * Room-relative zoom constraints are applied later in buildRoom()
     * where the actual room dimensions are known.
     */
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Smooth damping — lower = more inertia, glides longer after release
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;

        // Polar angle constraints — prevent going below floor or directly overhead
        this.controls.minPolarAngle = Math.PI * 0.05; // just below zenith
        this.controls.maxPolarAngle = Math.PI * 0.48; // just above horizon

        // Zoom speed and generic limits (overridden per-room in buildRoom)
        this.controls.zoomSpeed = 0.8;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 30;

        // Pan — slower, screen-space for intuitive feel
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.5;
        this.controls.screenSpacePanning = true;

        // Rotation — slightly slower for deliberate movement
        this.controls.rotateSpeed = 0.6;

        // Default target — slightly above floor
        this.controls.target.set(0, 0.5, 0);

        this.controls.update();
    }

    /**
     * Clear all room meshes from the scene and dispose their resources.
     * @private
     */
    _clearRoomMeshes() {
        for (const obj of this.roomMeshes) {
            this.scene.remove(obj);
            // Recursively dispose geometries, textures, and materials
            obj.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    const materials = Array.isArray(child.material)
                        ? child.material : [child.material];
                    for (const mat of materials) {
                        // Dispose texture maps to free GPU memory
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    }
                }
            });
        }
        this.roomMeshes.clear();

        // Clear toggle-related mesh references (they lived in roomMeshes and are now disposed)
        this._frontWallMesh = null;
        this._ceilingMesh = null;
        this._ceilingMaterial = null;
        this._wallMaterials = [];

        // Clear fog (rebuilt per-room in buildRoom)
        this.scene.fog = null;
    }

    /**
     * Clear all furniture meshes from the scene and dispose their resources.
     * Handles both single meshes and Groups (from FurnitureFactory3D) by
     * recursively traversing children to dispose all geometries and materials.
     * @private
     */
    _clearFurnitureMeshes() {
        for (const [, meshOrGroup] of this.furnitureMeshes) {
            this.scene.remove(meshOrGroup);
            // Recursively dispose all geometries and materials in the group
            meshOrGroup.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    // Skip map disposal for shared textures (e.g. contact shadow)
                    if (child.material.map && !child.material._sharedMap) {
                        child.material.map.dispose();
                    }
                    if (child.material.roughnessMap) child.material.roughnessMap.dispose();
                    child.material.dispose();
                }
                // Dispose shadow maps on furniture-attached lights (lamps)
                if (child.isLight && child.shadow && child.shadow.map) {
                    child.shadow.map.dispose();
                }
            });
        }
        this.furnitureMeshes.clear();
    }

    /**
     * Main render method — rebuilds the scene from the current design
     * and starts the animation loop.
     *
     * Clears existing room and furniture meshes (keeps lights),
     * then rebuilds from the current design state.
     *
     * @returns {Promise<void>} Resolves once all furniture has been loaded and placed
     */
    async render() {
        if (this.isDisposed || !this.currentDesign) {
            return;
        }

        // Clear existing scene objects (keep lights)
        this._clearRoomMeshes();
        this._clearFurnitureMeshes();

        // Rebuild from design
        this.buildRoom(this.currentDesign.room);
        await this.buildFurniture(this.currentDesign.furniture || []);

        // Re-apply toggle states after rebuild
        if (this._roofVisible) {
            this.setCeilingVisible(true);
        }
        if (this._translucentWallsActive) {
            this.setTranslucentWalls(true);
        }

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

        // Update controls (required for damping) — skip during fly-in
        // because animateCameraEntry manages position/target directly
        if (this.controls && !this._flyInActive) {
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
     * Animate the camera from a top-down view (matching the 2D perspective)
     * to the default isometric viewing angle.
     *
     * Called on 2D→3D toggle for a smooth fly-in transition.
     * Uses ease-out cubic for natural deceleration.
     *
     * @param {number} [duration=800] - Animation duration in milliseconds
     */
    animateCameraEntry(duration = 800) {
        if (this.isDisposed || !this.camera || !this.controls) return;

        // Prevent concurrent fly-in animations
        if (this._flyInActive) return;
        this._flyInActive = true;

        // Ensure cinematic FOV is set
        this.camera.fov = 55;
        this.camera.updateProjectionMatrix();

        const room = this.currentDesign?.room;
        const roomW = room?.width || 5;
        const roomD = room?.depth || 5;
        const roomH = room?.height || 2.8;

        // Start: top-down (mimicking the 2D bird's-eye view)
        const startPos = { x: 0, y: roomH * 5, z: 0.01 };
        const startTarget = { x: 0, y: 0, z: 0 };

        // End: the cinematic angle (matches buildRoom camera setup)
        const endPos = {
            x: roomW * 0.8,
            y: roomH * 1.2,
            z: roomD * 1.4
        };
        const endTarget = { x: 0, y: roomH * 0.3, z: 0 };

        // Set camera to start position immediately
        this.camera.position.set(startPos.x, startPos.y, startPos.z);
        this.controls.target.set(startTarget.x, startTarget.y, startTarget.z);
        this.controls.update();

        const startTime = performance.now();
        const self = this;

        function animateStep(currentTime) {
            if (self.isDisposed) {
                self._flyInActive = false;
                return;
            }

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic — fast start, smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);

            // Lerp camera position
            self.camera.position.set(
                startPos.x + (endPos.x - startPos.x) * eased,
                startPos.y + (endPos.y - startPos.y) * eased,
                startPos.z + (endPos.z - startPos.z) * eased
            );

            // Lerp controls target
            self.controls.target.set(
                startTarget.x + (endTarget.x - startTarget.x) * eased,
                startTarget.y + (endTarget.y - startTarget.y) * eased,
                startTarget.z + (endTarget.z - startTarget.z) * eased
            );

            self.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                self._flyInActive = false;
            }
        }

        requestAnimationFrame(animateStep);
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
     * Build a custom grid confined to the exact room width and depth.
     *
     * Unlike THREE.GridHelper (which always produces a square), this draws
     * lines only within the room footprint so nothing leaks outside the walls.
     *
     * @param {number} w - Room width
     * @param {number} d - Room depth
     * @returns {THREE.Group} Group containing grid line segments
     * @private
     */
    _buildRoomGrid(w, d) {
        const group = new THREE.Group();
        const material = new THREE.LineBasicMaterial({
            color: 0xb0a090,
            transparent: true,
            opacity: 0.35
        });

        const hw = w / 2;
        const hd = d / 2;

        // Lines along X (varying Z)
        for (let z = 0; z <= d; z++) {
            const points = [
                new THREE.Vector3(-hw, 0, -hd + z),
                new THREE.Vector3(hw, 0, -hd + z)
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geo, material));
        }

        // Lines along Z (varying X)
        for (let x = 0; x <= w; x++) {
            const points = [
                new THREE.Vector3(-hw + x, 0, -hd),
                new THREE.Vector3(-hw + x, 0, hd)
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            group.add(new THREE.Line(geo, material));
        }

        return group;
    }

    /**
     * Create a hardwood plank floor material with a procedural CanvasTexture.
     *
     * Draws staggered planks with grain lines, subtle per-plank colour variation,
     * and dark gap lines between planks. The resulting MeshStandardMaterial has
     * low roughness and a small metalness value to simulate a lacquered finish.
     *
     * @param {string} floorColour - Hex base colour (used as warmth tint on top of defaults)
     * @param {number} roomWidth - Room width in meters (used for texture repeat)
     * @param {number} roomDepth - Room depth in meters (used for texture repeat)
     * @returns {THREE.MeshStandardMaterial}
     * @private
     */
    _createHardwoodFloorMaterial(floorColour, roomWidth, roomDepth) {
        const texSize = 512;
        let canvas;
        try {
            canvas = new OffscreenCanvas(texSize, texSize);
        } catch (_) {
            canvas = document.createElement('canvas');
            canvas.width = texSize;
            canvas.height = texSize;
        }
        const ctx = canvas.getContext('2d');

        // Parse floor colour for tinting — fall back to warm oak if missing
        const hex = (floorColour || '#C8A06B').replace('#', '');
        const br = parseInt(hex.substring(0, 2), 16);
        const bg = parseInt(hex.substring(2, 4), 16);
        const bb = parseInt(hex.substring(4, 6), 16);

        // Wood plank base colour
        ctx.fillStyle = floorColour || '#C8A06B';
        ctx.fillRect(0, 0, texSize, texSize);

        // Draw staggered planks
        const plankHeight = 64;
        const numPlanks = Math.ceil(texSize / plankHeight);
        for (let row = 0; row < numPlanks; row++) {
            const y = row * plankHeight;
            const offset = (row % 2) * 80; // stagger every other row

            // Per-plank lightness variation
            const lightness = 0.9 + (Math.sin(row * 2.3) * 0.08);
            const pr = Math.max(0, Math.min(255, Math.round(br * lightness)));
            const pg = Math.max(0, Math.min(255, Math.round(bg * lightness)));
            const pb = Math.max(0, Math.min(255, Math.round(bb * lightness)));
            ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
            ctx.fillRect(0, y, texSize, plankHeight - 2);

            // Grain lines (deterministic, not random, for reproducibility)
            for (let g = 0; g < 8; g++) {
                const gx = ((g * 67 + row * 23 + offset) % texSize + texSize) % texSize;
                ctx.strokeStyle = 'rgba(80,50,20,0.06)';
                ctx.lineWidth = 0.5 + ((g + row) % 3) * 0.5;
                ctx.beginPath();
                ctx.moveTo(gx, y);
                ctx.bezierCurveTo(
                    gx + 10, y + 20,
                    gx - 5,  y + 40,
                    gx + 8,  y + plankHeight
                );
                ctx.stroke();
            }

            // Dark gap between planks
            ctx.fillStyle = 'rgba(60,40,20,0.4)';
            ctx.fillRect(0, y + plankHeight - 2, texSize, 2);
        }

        const floorTex = new THREE.CanvasTexture(canvas);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(roomWidth * 0.8, roomDepth * 0.8);
        floorTex.minFilter = THREE.LinearMipmapLinearFilter;
        floorTex.magFilter = THREE.LinearFilter;
        try {
            floorTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        } catch (_) { /* renderer not ready — skip */ }

        return new THREE.MeshStandardMaterial({
            map:             floorTex,
            roughness:       0.35,
            metalness:       0.05,
            envMapIntensity: 0.8,
            side:            THREE.FrontSide
        });
    }

    /**
     * Create a plaster/paint wall material with a procedural CanvasTexture.
     *
     * Adds subtle stochastic noise over the base colour to simulate
     * the micro-texture of a real painted wall.
     *
     * @param {string} colour - Hex colour for the wall
     * @returns {THREE.MeshStandardMaterial}
     * @private
     */
    _createWallMaterial(colour) {
        const texSize = 256;
        let canvas;
        try {
            canvas = new OffscreenCanvas(texSize, texSize);
        } catch (_) {
            canvas = document.createElement('canvas');
            canvas.width = texSize;
            canvas.height = texSize;
        }
        const ctx = canvas.getContext('2d');

        const wallHex = colour || '#F0EAE0';

        // Base colour fill
        ctx.fillStyle = wallHex;
        ctx.fillRect(0, 0, texSize, texSize);

        // Subtle plaster noise — 3 000 single-pixel specks at low opacity
        for (let i = 0; i < 3000; i++) {
            const x = ((i * 73 + 17) % texSize);
            const y = ((i * 43 + 91) % texSize);
            const alpha = ((i * 11) % 30) / 1000; // max ~0.03
            ctx.fillStyle = `rgba(200,180,160,${alpha.toFixed(3)})`;
            ctx.fillRect(x, y, 1, 1);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;

        return new THREE.MeshStandardMaterial({
            map:             tex,
            roughness:       0.9,
            metalness:       0,
            envMapIntensity: 0.2,
            side:            THREE.DoubleSide
        });
    }

    /**
     * Create a smooth plaster ceiling material.
     * Similar to wall material but smoother (fewer noise specks, lighter colour).
     *
     * @param {string} colour - Hex colour (defaults to near-white)
     * @returns {THREE.MeshStandardMaterial}
     * @private
     */
    _createCeilingMaterial(colour) {
        const texSize = 256;
        let canvas;
        try {
            canvas = new OffscreenCanvas(texSize, texSize);
        } catch (_) {
            canvas = document.createElement('canvas');
            canvas.width = texSize;
            canvas.height = texSize;
        }
        const ctx = canvas.getContext('2d');

        const ceilHex = colour || '#F5F0EC';
        ctx.fillStyle = ceilHex;
        ctx.fillRect(0, 0, texSize, texSize);

        // Very subtle noise — smoother than walls (800 specks vs 3000)
        for (let i = 0; i < 800; i++) {
            const x = ((i * 73 + 17) % texSize);
            const y = ((i * 43 + 91) % texSize);
            const alpha = ((i * 11) % 20) / 1000;
            ctx.fillStyle = `rgba(220,210,200,${alpha.toFixed(3)})`;
            ctx.fillRect(x, y, 1, 1);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;

        return new THREE.MeshStandardMaterial({
            map:             tex,
            roughness:       0.85,
            metalness:       0,
            envMapIntensity: 0.15,
            side:            THREE.DoubleSide
        });
    }

    /**
     *
     * Draws a realistic tile pattern with grout lines, subtle colour variation
     * per tile, and a gentle specular highlight in each tile center.
     * Returns a THREE.CanvasTexture that tiles across the floor surface.
     *
     * @param {string} baseColour - Hex colour for the floor
     * @param {number} roomWidth - Room width in meters
     * @param {number} roomDepth - Room depth in meters
     * @returns {THREE.CanvasTexture} Tiled floor texture
     * @private
     */
    _createTileTexture(baseColour, roomWidth, roomDepth) {
        const tileSize = 128; // px per tile in the texture
        const tilesX = Math.max(2, Math.round(roomWidth));
        const tilesZ = Math.max(2, Math.round(roomDepth));
        const canvasW = tilesX * tileSize;
        const canvasH = tilesZ * tileSize;

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');

        // Parse base colour to RGB
        const hex = baseColour.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Grout colour — slightly lighter than base
        const groutR = Math.min(255, r + 30);
        const groutG = Math.min(255, g + 25);
        const groutB = Math.min(255, b + 20);
        const groutWidth = 3;

        // Fill entire canvas with grout colour
        ctx.fillStyle = `rgb(${groutR},${groutG},${groutB})`;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Draw each tile with subtle colour variation
        for (let tx = 0; tx < tilesX; tx++) {
            for (let tz = 0; tz < tilesZ; tz++) {
                // Per-tile colour variation — seeded by position for consistency
                const seed = (tx * 7 + tz * 13) % 20;
                const variation = (seed - 10) * 1.5;
                const tileR = Math.max(0, Math.min(255, r + variation));
                const tileG = Math.max(0, Math.min(255, g + variation * 0.8));
                const tileB = Math.max(0, Math.min(255, b + variation * 0.6));

                const x = tx * tileSize + groutWidth;
                const y = tz * tileSize + groutWidth;
                const w = tileSize - groutWidth * 2;
                const h = tileSize - groutWidth * 2;

                // Tile base fill
                ctx.fillStyle = `rgb(${Math.round(tileR)},${Math.round(tileG)},${Math.round(tileB)})`;
                ctx.fillRect(x, y, w, h);

                // Subtle radial highlight in center (simulates lighting reflection)
                const gradient = ctx.createRadialGradient(
                    x + w / 2, y + h / 2, 0,
                    x + w / 2, y + h / 2, w * 0.6
                );
                gradient.addColorStop(0, `rgba(255, 248, 230, 0.12)`);
                gradient.addColorStop(1, `rgba(255, 248, 230, 0)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, w, h);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());

        return texture;
    }

    /**
     * Create a procedural wall paint/plaster texture using Canvas 2D.
     *
     * Generates subtle per-pixel noise (±2% lightness variation) over the
     * base colour to simulate a real painted wall surface. Faint horizontal
     * lines at 32px intervals add a subtle panel/plaster joint effect.
     *
     * @param {string} baseColour - Hex colour for the wall
     * @returns {THREE.CanvasTexture} Wall paint texture
     * @private
     */
    _createWallTexture(baseColour) {
        const SIZE = 128;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');

        // Parse base colour to RGB
        const hex = (baseColour || '#E8E0D4').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Fill with base colour
        ctx.fillStyle = baseColour || '#E8E0D4';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Subtle per-pixel noise — ±2% lightness variation
        // Uses deterministic seed per pixel position for consistency
        const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const px = (i / 4) % SIZE;
            const py = Math.floor((i / 4) / SIZE);
            // Simple deterministic noise from position
            const noise = ((px * 7 + py * 13) % 17 - 8) * 1.3;
            data[i]     = Math.max(0, Math.min(255, r + noise));       // R
            data[i + 1] = Math.max(0, Math.min(255, g + noise * 0.9)); // G
            data[i + 2] = Math.max(0, Math.min(255, b + noise * 0.7)); // B
        }
        ctx.putImageData(imageData, 0, 0);

        // Faint horizontal panel lines at ~32px intervals
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1;
        for (let y = 32; y < SIZE; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(SIZE, y);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        return texture;
    }

    // -------------------------------------------------------------------------
    // 3D Furniture drag / move support
    // -------------------------------------------------------------------------

    /**
     * Enter furniture-move mode.
     *
     * While active, clicking and dragging a furniture group in the 3D view
     * repositions it along the floor plane (y = 0).  OrbitControls are
     * suspended for the duration so the camera does not rotate during the drag.
     *
     * @param {Function} onMoveEnd - Callback invoked with (itemId, x, z) in
     *   Three.js world units when the user releases a dragged piece.
     * @param {Function} [resolvePosition] - Optional callback (itemId, x, z) => { x, z }
     *   that returns a collision-resolved position during drag.  If provided it is
     *   called every pointer-move to snap the dragged group to a valid spot.
     */
    enableFurnitureMove(onMoveEnd, resolvePosition) {
        this._moveOnMoveEndCallback = typeof onMoveEnd === 'function' ? onMoveEnd : null;
        this._moveResolvePosition = typeof resolvePosition === 'function' ? resolvePosition : null;
        this._moveMode = true;

        if (this.controls) {
            this.controls.enabled = false;
        }

        const el = this.renderer.domElement;
        el.addEventListener('pointerdown', this._bound3dDragStart);
        el.addEventListener('pointermove', this._bound3dDragMove);
        el.addEventListener('pointerup',   this._bound3dDragEnd);
    }

    /**
     * Exit furniture-move mode and restore OrbitControls.
     */
    disableFurnitureMove() {
        this._moveMode = false;
        this._dragging = null;
        this._moveResolvePosition = null;

        const el = this.renderer.domElement;
        el.removeEventListener('pointerdown', this._bound3dDragStart);
        el.removeEventListener('pointermove', this._bound3dDragMove);
        el.removeEventListener('pointerup',   this._bound3dDragEnd);

        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // ── Roof & translucent-wall toggles ─────────────────────────────

    /**
     * Show or hide the ceiling plane.
     * If translucent-walls mode is active, the ceiling inherits the current opacity.
     *
     * @param {boolean} visible
     */
    setCeilingVisible(visible) {
        this._roofVisible = visible;

        if (visible) {
            if (!this._roomDims) return;
            const { w, d, h, wallColour, isLShaped } = this._roomDims;

            if (!this._ceilingMesh) {
                // Lighten wall colour for ceiling
                const wallCol = new THREE.Color(wallColour || '#F0EAE0');
                const ceilColHex = '#' + wallCol.clone().lerp(new THREE.Color(0xffffff), 0.3)
                    .getHexString();

                this._ceilingMaterial = this._createCeilingMaterial(ceilColHex);

                let ceilGeo;
                if (isLShaped) {
                    // L-shaped ceiling matches the L-shaped floor polygon
                    const cutW = w * 0.4;
                    const cutD = d * 0.4;
                    const hw = w / 2, hd = d / 2;
                    const shape = new THREE.Shape();
                    shape.moveTo(-hw, hd);        // P0 back-left (z negated for XY→XZ rotation)
                    shape.lineTo( hw, hd);         // P1 back-right
                    shape.lineTo( hw, hd - (d - cutD));
                    shape.lineTo( hw - cutW, hd - (d - cutD));
                    shape.lineTo( hw - cutW, -hd);
                    shape.lineTo(-hw, -hd);        // P5 front-left
                    shape.closePath();
                    ceilGeo = new THREE.ShapeGeometry(shape);
                } else {
                    ceilGeo = new THREE.PlaneGeometry(w, d);
                }

                this._ceilingMesh = new THREE.Mesh(ceilGeo, this._ceilingMaterial);
                this._ceilingMesh.rotation.x = Math.PI / 2; // face downward
                this._ceilingMesh.position.y = h;
                this._ceilingMesh.receiveShadow = true;
            }

            // Apply translucent opacity if needed
            if (this._translucentWallsActive) {
                this._ceilingMaterial.transparent = true;
                this._ceilingMaterial.opacity = this._wallOpacity;
                this._ceilingMaterial.depthWrite = false;
            } else {
                this._ceilingMaterial.transparent = false;
                this._ceilingMaterial.opacity = 1.0;
                this._ceilingMaterial.depthWrite = true;
            }

            this.scene.add(this._ceilingMesh);
            this.roomMeshes.add(this._ceilingMesh);
        } else {
            if (this._ceilingMesh) {
                this.scene.remove(this._ceilingMesh);
                this.roomMeshes.delete(this._ceilingMesh);
                this._ceilingMesh.geometry.dispose();
                if (this._ceilingMaterial) {
                    if (this._ceilingMaterial.map) this._ceilingMaterial.map.dispose();
                    this._ceilingMaterial.dispose();
                }
                this._ceilingMesh = null;
                this._ceilingMaterial = null;
            }
        }
    }

    /**
     * Enter or exit translucent-walls mode.
     * When active: adds 4th wall, makes all walls (and ceiling if visible) translucent.
     * When off: removes 4th wall, restores opaque.
     *
     * @param {boolean} active
     */
    setTranslucentWalls(active) {
        this._translucentWallsActive = active;

        if (active) {
            // Add front (4th) wall
            if (!this._frontWallMesh && this._roomDims) {
                const { w, d, h, wallColour, isLShaped } = this._roomDims;
                const wallMat = this._createWallMaterial(wallColour);

                if (isLShaped) {
                    const hw = w / 2, hd = d / 2;
                    const cutW = w * 0.4;
                    // Front edge P4(hw-cutW, hd) → P5(-hw, hd)
                    this._frontWallMesh = this._addWallSegment(
                        -hw, hd, hw - cutW, hd, h, wallMat);
                } else {
                    // Rectangular: front wall at z = +d/2
                    this._frontWallMesh = this._addWallSegment(
                        -w / 2, d / 2, w / 2, d / 2, h, wallMat);
                }
            }

            // Make all walls translucent
            for (const mat of this._wallMaterials) {
                mat.transparent = true;
                mat.opacity = this._wallOpacity;
                mat.depthWrite = false;
                mat.needsUpdate = true;
            }

            // Ceiling too, if visible
            if (this._roofVisible && this._ceilingMaterial) {
                this._ceilingMaterial.transparent = true;
                this._ceilingMaterial.opacity = this._wallOpacity;
                this._ceilingMaterial.depthWrite = false;
                this._ceilingMaterial.needsUpdate = true;
            }
        } else {
            // Restore walls to opaque
            for (const mat of this._wallMaterials) {
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthWrite = true;
                mat.needsUpdate = true;
            }

            // Restore ceiling
            if (this._roofVisible && this._ceilingMaterial) {
                this._ceilingMaterial.transparent = false;
                this._ceilingMaterial.opacity = 1.0;
                this._ceilingMaterial.depthWrite = true;
                this._ceilingMaterial.needsUpdate = true;
            }

            // Remove front wall
            if (this._frontWallMesh) {
                this.scene.remove(this._frontWallMesh);
                this.roomMeshes.delete(this._frontWallMesh);
                const idx = this._wallMaterials.indexOf(this._frontWallMesh.material);
                if (idx !== -1) this._wallMaterials.splice(idx, 1);
                this._frontWallMesh.geometry.dispose();
                if (this._frontWallMesh.material.map) this._frontWallMesh.material.map.dispose();
                this._frontWallMesh.material.dispose();
                this._frontWallMesh = null;
            }
        }
    }

    /**
     * Update the opacity of translucent walls (and ceiling if visible).
     * Only effective when translucent-walls mode is active.
     *
     * @param {number} opacity - Value between 0.05 and 1.0
     */
    setWallOpacity(opacity) {
        this._wallOpacity = Math.max(0.05, Math.min(1.0, opacity));

        if (!this._translucentWallsActive) return;

        for (const mat of this._wallMaterials) {
            mat.opacity = this._wallOpacity;
            mat.needsUpdate = true;
        }

        if (this._roofVisible && this._ceilingMaterial) {
            this._ceilingMaterial.opacity = this._wallOpacity;
            this._ceilingMaterial.needsUpdate = true;
        }
    }

    /**
     * Pointer-down handler — detect which furniture group was hit.
     *
     * @param {PointerEvent} event
     * @private
     */
    _on3dDragStart(event) {
        if (!this._moveMode) return;

        const ndc = this._eventToNDC(event);
        this._raycaster.setFromCamera(ndc, this.camera);

        // Collect all meshes inside every furniture group for intersection test
        const allMeshes = [];
        this.furnitureMeshes.forEach((group) => {
            group.traverse((m) => {
                if (m.isMesh) allMeshes.push(m);
            });
        });

        const hits = this._raycaster.intersectObjects(allMeshes);
        if (hits.length === 0) return;

        // Walk up from the hit mesh to find the top-level furniture group
        let hitObject = hits[0].object;
        let group = null;
        let itemId = null;

        this.furnitureMeshes.forEach((g, id) => {
            // Check if the hit mesh is a descendant of this group
            let node = hitObject;
            while (node) {
                if (node === g) {
                    group  = g;
                    itemId = id;
                    break;
                }
                node = node.parent;
            }
        });

        if (group) {
            this._dragging = { group, itemId };
            // Capture the pointer so pointermove/up fire even outside the canvas
            this.renderer.domElement.setPointerCapture(event.pointerId);
        }
    }

    /**
     * Pointer-move handler — slide the dragged group along the floor plane.
     *
     * @param {PointerEvent} event
     * @private
     */
    _on3dDragMove(event) {
        if (!this._moveMode || !this._dragging) return;

        const ndc = this._eventToNDC(event);
        this._raycaster.setFromCamera(ndc, this.camera);

        // Intersect the infinite floor plane at y = 0
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        const hit = this._raycaster.ray.intersectPlane(floorPlane, target);

        if (hit) {
            let finalX = target.x;
            let finalZ = target.z;

            // Apply collision resolution if a resolver was provided
            if (this._moveResolvePosition) {
                const resolved = this._moveResolvePosition(
                    this._dragging.itemId, finalX, finalZ
                );
                if (resolved) {
                    finalX = resolved.x;
                    finalZ = resolved.z;
                }
            }

            this._dragging.group.position.x = finalX;
            this._dragging.group.position.z = finalZ;
        }
    }

    /**
     * Pointer-up handler — commit the move and notify the caller.
     *
     * @param {PointerEvent} event
     * @private
     */
    _on3dDragEnd(event) {
        if (!this._moveMode || !this._dragging) return;

        const { group, itemId } = this._dragging;

        if (this._moveOnMoveEndCallback) {
            this._moveOnMoveEndCallback(itemId, group.position.x, group.position.z);
        }

        this._dragging = null;

        try {
            this.renderer.domElement.releasePointerCapture(event.pointerId);
        } catch (_) { /* ignore if pointer was already released */ }
    }

    /**
     * Convert a PointerEvent to Normalised Device Coordinates (-1 to +1).
     *
     * @param {PointerEvent} event
     * @returns {THREE.Vector2}
     * @private
     */
    _eventToNDC(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width)  *  2 - 1,
            ((event.clientY - rect.top)  / rect.height) * -2 + 1
        );
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

        // Dispose shared contact shadow texture (cached across furniture pieces)
        if (FurnitureFactory3D._contactShadowTexture) {
            FurnitureFactory3D._contactShadowTexture.dispose();
            FurnitureFactory3D._contactShadowTexture = null;
        }

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

        // Dispose ceiling point light
        if (this.pointLight) {
            if (this.pointLight.shadow && this.pointLight.shadow.map) {
                this.pointLight.shadow.map.dispose();
            }
            this.scene.remove(this.pointLight);
            this.pointLight = null;
        }

        // Dispose fill light
        if (this.fillLight) {
            this.scene.remove(this.fillLight);
            this.fillLight = null;
        }

        // Dispose rim light
        if (this.rimLight) {
            this.scene.remove(this.rimLight);
            this.rimLight = null;
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
