/**
 * FurnishView — 3D Composite Furniture Factory
 *
 * Factory class that builds recognisable 3D furniture from composed Three.js
 * primitives. Replaces plain BoxGeometry cubes with multi-mesh groups that
 * look like real furniture — chairs have legs and backrests, tables have
 * tabletops on cylindrical legs, sofas have cushions and armrests, etc.
 *
 * Every furniture type returns a THREE.Group containing multiple meshes,
 * all using MeshStandardMaterial for correct lighting and shading response.
 * Dimensions are parametric — they scale from the item's width, depth, and
 * height values in the data model, not hardcoded absolute sizes.
 *
 * Constraints:
 * - NO external 3D models (no GLTF, OBJ, etc.)
 * - NO MeshBasicMaterial (does not respond to lighting)
 * - NO CapsuleGeometry (compatibility issues with r128–r141)
 * - ONLY BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry
 * - Every mesh: castShadow = true, receiveShadow = true
 *
 * @file js/graphics/FurnitureFactory3D.js
 * @module graphics/FurnitureFactory3D
 */

import * as THREE from '../../lib/three.module.js';

/**
 * FurnitureFactory3D — static factory for composite 3D furniture.
 *
 * Usage:
 *   const group = FurnitureFactory3D.createFurniture('chair', { width: 0.5, depth: 0.5, height: 0.9 }, '#8B4513');
 *   scene.add(group);
 */
export default class FurnitureFactory3D {

    /**
     * Cached contact shadow texture — generated once, reused for all pieces.
     * @type {THREE.CanvasTexture|null}
     * @private
     */
    static _contactShadowTexture = null;

    /**
     * Main factory method — dispatches to the correct builder based on type.
     * After building, adds a contact shadow disc beneath the furniture
     * to ground it visually (skipped for rugs which lie flat on the floor).
     *
     * @param {string} type - Furniture type ID from the catalogue (e.g. 'chair', 'dining-table')
     * @param {Object} dimensions - Item dimensions in meters
     * @param {number} dimensions.width - Width (X axis)
     * @param {number} dimensions.depth - Depth (Z axis)
     * @param {number} dimensions.height - Height (Y axis)
     * @param {string} colour - Hex colour string (e.g. '#5C4033')
     * @returns {THREE.Group} Group containing all component meshes for this furniture piece
     */
    static createFurniture(type, dimensions, colour) {
        const dims = {
            width: dimensions.width || 0.5,
            depth: dimensions.depth || 0.5,
            height: dimensions.height || 0.85
        };

        let group;
        switch (type) {
            case 'chair':
                group = FurnitureFactory3D.createChair(dims, colour); break;
            case 'dining-table':
                group = FurnitureFactory3D.createDiningTable(dims, colour); break;
            case 'side-table':
                group = FurnitureFactory3D.createSideTable(dims, colour); break;
            case 'sofa':
                group = FurnitureFactory3D.createSofa(dims, colour); break;
            case 'armchair':
                group = FurnitureFactory3D.createArmchair(dims, colour); break;
            case 'coffee-table':
                group = FurnitureFactory3D.createCoffeeTable(dims, colour); break;
            case 'bookshelf':
                group = FurnitureFactory3D.createBookshelf(dims, colour); break;
            case 'desk':
                group = FurnitureFactory3D.createDesk(dims, colour); break;
            case 'tv-stand':
                group = FurnitureFactory3D.createTvStand(dims, colour); break;
            case 'bed':
                group = FurnitureFactory3D.createBed(dims, colour); break;
            case 'wardrobe':
                group = FurnitureFactory3D.createWardrobe(dims, colour); break;
            case 'rug':
                group = FurnitureFactory3D.createRug(dims, colour); break;
            default:
                group = FurnitureFactory3D._createFallbackBox(dims, colour); break;
        }

        // Add contact shadow disc (skip for rugs — they're flat on the floor)
        if (type !== 'rug') {
            const scale = type === 'bed' ? 1.15 : 1.1;
            const shadow = FurnitureFactory3D._createContactShadow(
                dims.width * scale, dims.depth * scale
            );
            group.add(shadow);
        }

        return group;
    }

    /**
     * Create a contact shadow disc — a semi-transparent dark oval placed
     * at floor level beneath furniture to ground it visually.
     *
     * Uses MeshBasicMaterial (not MeshStandardMaterial) because the shadow
     * itself should not respond to scene lighting. MultiplyBlending makes
     * the dark gradient blend naturally with whatever floor colour is beneath.
     *
     * The texture is an elliptical radial gradient (stretched in depth to
     * simulate light coming from above-front) and is cached for reuse.
     *
     * @param {number} width - Shadow width in meters
     * @param {number} depth - Shadow depth in meters
     * @returns {THREE.Mesh} Shadow plane mesh
     * @private
     */
    static _createContactShadow(width, depth) {
        // Generate and cache the gradient texture on first call
        if (!FurnitureFactory3D._contactShadowTexture) {
            const SIZE = 64;
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');

            // Elliptical stretch — elongates shadow toward the back
            ctx.save();
            ctx.translate(SIZE / 2, SIZE / 2);
            ctx.scale(1, 0.75);
            ctx.translate(-SIZE / 2, -SIZE / 2);

            const gradient = ctx.createRadialGradient(
                SIZE / 2, SIZE / 2, 0,
                SIZE / 2, SIZE / 2, SIZE / 2
            );
            gradient.addColorStop(0,   'rgba(0, 0, 0, 0.3)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
            gradient.addColorStop(1,   'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, SIZE, SIZE);
            ctx.restore();

            FurnitureFactory3D._contactShadowTexture = new THREE.CanvasTexture(canvas);
        }

        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshBasicMaterial({
            map: FurnitureFactory3D._contactShadowTexture,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });
        material._sharedMap = true; // prevent per-furniture disposal of cached texture

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.003;
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        return mesh;
    }

    // ─────────────────────────────────────────────
    //  1. CHAIR — seat slab + 4 cylindrical legs + backrest panel
    // ─────────────────────────────────────────────

    /**
     * Build a recognisable chair from composed primitives.
     *
     * Components (6 meshes):
     * - SEAT: thin BoxGeometry slab at ~55% of total height
     * - LEGS (×4): thin CylinderGeometry from floor to seat underside
     * - BACKREST: thin upright BoxGeometry panel at the rear
     *
     * Legs use a slightly darker shade for visual depth.
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Chair group with 6 child meshes
     */
    static createChair(dims, colour) {
        const group = new THREE.Group();
        const mainMat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );

        const seatHeight = dims.height * 0.55; // Y position of seat top surface
        const seatThickness = 0.05;

        // Seat slab
        const seatGeo = new THREE.BoxGeometry(dims.width, seatThickness, dims.depth);
        const seat = new THREE.Mesh(seatGeo, mainMat);
        seat.position.y = seatHeight;
        FurnitureFactory3D._enableShadows(seat);
        group.add(seat);

        // 4 legs — thin cylinders from floor to seat underside
        const legRadius = 0.025;
        const legHeight = seatHeight - seatThickness / 2;
        const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8);
        const legOffsetX = dims.width / 2 - 0.06;
        const legOffsetZ = dims.depth / 2 - 0.06;
        const legPositions = [
            { x: -legOffsetX, z: -legOffsetZ },
            { x:  legOffsetX, z: -legOffsetZ },
            { x: -legOffsetX, z:  legOffsetZ },
            { x:  legOffsetX, z:  legOffsetZ }
        ];

        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x, legHeight / 2, pos.z);
            FurnitureFactory3D._enableShadows(leg);
            group.add(leg);
        }

        // Backrest — thin upright panel at rear edge
        const backrestHeight = dims.height * 0.4;
        const backrestGeo = new THREE.BoxGeometry(dims.width * 0.9, backrestHeight, 0.04);
        const backrest = new THREE.Mesh(backrestGeo, mainMat);
        backrest.position.set(0, dims.height * 0.75, -(dims.depth / 2 - 0.04));
        FurnitureFactory3D._enableShadows(backrest);
        group.add(backrest);

        return group;
    }

    // ─────────────────────────────────────────────
    //  2. DINING TABLE — tabletop slab + 4 cylindrical legs
    // ─────────────────────────────────────────────

    /**
     * Build a dining table from composed primitives.
     *
     * Components (5 meshes):
     * - TABLETOP: thin BoxGeometry slab at top
     * - LEGS (×4): CylinderGeometry at inset corners
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Dining table group with 5 child meshes
     */
    static createDiningTable(dims, colour) {
        const group = new THREE.Group();
        const mat = FurnitureFactory3D._createMaterial(colour, 'WOOD');

        const topThickness = 0.05;

        // Tabletop
        const topGeo = new THREE.BoxGeometry(dims.width, topThickness, dims.depth);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // 4 legs — cylindrical, at inset corners
        const legRadius = 0.04;
        const legHeight = dims.height - topThickness;
        const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8);
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );
        const inset = 0.08;
        const legPositions = [
            { x: -(dims.width / 2 - inset), z: -(dims.depth / 2 - inset) },
            { x:  (dims.width / 2 - inset), z: -(dims.depth / 2 - inset) },
            { x: -(dims.width / 2 - inset), z:  (dims.depth / 2 - inset) },
            { x:  (dims.width / 2 - inset), z:  (dims.depth / 2 - inset) }
        ];

        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x, legHeight / 2, pos.z);
            FurnitureFactory3D._enableShadows(leg);
            group.add(leg);
        }

        return group;
    }

    // ─────────────────────────────────────────────
    //  3. SIDE TABLE — tabletop + pedestal cylinder + circular base
    // ─────────────────────────────────────────────

    /**
     * Build a side table with pedestal leg from composed primitives.
     *
     * Components (3 meshes):
     * - TABLETOP: BoxGeometry slab
     * - PEDESTAL LEG: single CylinderGeometry (tapers slightly from 0.06 top to 0.08 bottom)
     * - BASE: flat CylinderGeometry disc
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Side table group with 3 child meshes
     */
    static createSideTable(dims, colour) {
        const group = new THREE.Group();
        const mat = FurnitureFactory3D._createMaterial(colour, 'WOOD');

        const topThickness = 0.04;

        // Tabletop
        const topGeo = new THREE.BoxGeometry(dims.width, topThickness, dims.depth);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // Pedestal leg — slightly tapered cylinder
        const legHeight = dims.height - topThickness;
        const legGeo = new THREE.CylinderGeometry(0.06, 0.08, legHeight, 12);
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.y = legHeight / 2;
        FurnitureFactory3D._enableShadows(leg);
        group.add(leg);

        // Circular base disc
        const baseRadius = dims.width * 0.4;
        const baseThickness = 0.03;
        const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseThickness, 16);
        const base = new THREE.Mesh(baseGeo, legMat);
        base.position.y = baseThickness / 2;
        FurnitureFactory3D._enableShadows(base);
        group.add(base);

        return group;
    }

    // ─────────────────────────────────────────────
    //  4. SOFA — seat base + back cushion + 2 armrests + 4 feet
    // ─────────────────────────────────────────────

    /**
     * Build a sofa from composed primitives.
     *
     * Components (8 meshes):
     * - SEAT BASE: wide BoxGeometry
     * - BACK CUSHION: tall BoxGeometry at rear (lighter shade)
     * - LEFT ARMREST: BoxGeometry on left side
     * - RIGHT ARMREST: BoxGeometry on right side
     * - FEET (×4): small BoxGeometry cubes at corners
     *
     * Seat cushion uses a slightly lighter shade than back cushion for depth.
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Sofa group with 8 child meshes
     */
    static createSofa(dims, colour) {
        const group = new THREE.Group();
        const baseMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const cushionMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.15), 'FABRIC'
        );

        // Seat base
        const seatGeo = new THREE.BoxGeometry(dims.width, dims.height * 0.4, dims.depth * 0.85);
        const seat = new THREE.Mesh(seatGeo, cushionMat);
        seat.position.y = dims.height * 0.2;
        FurnitureFactory3D._enableShadows(seat);
        group.add(seat);

        // Back cushion
        const backGeo = new THREE.BoxGeometry(
            dims.width - 0.05,
            dims.height * 0.55,
            dims.depth * 0.2
        );
        const back = new THREE.Mesh(backGeo, baseMat);
        back.position.set(0, dims.height * 0.5, -(dims.depth / 2 - dims.depth * 0.1));
        FurnitureFactory3D._enableShadows(back);
        group.add(back);

        // Left armrest
        const armGeo = new THREE.BoxGeometry(0.12, dims.height * 0.45, dims.depth * 0.85);
        const leftArm = new THREE.Mesh(armGeo, baseMat);
        leftArm.position.set(-(dims.width / 2 - 0.06), dims.height * 0.35, 0);
        FurnitureFactory3D._enableShadows(leftArm);
        group.add(leftArm);

        // Right armrest
        const rightArm = new THREE.Mesh(armGeo, baseMat);
        rightArm.position.set(dims.width / 2 - 0.06, dims.height * 0.35, 0);
        FurnitureFactory3D._enableShadows(rightArm);
        group.add(rightArm);

        // 4 feet — small cubes at corners
        const footGeo = new THREE.BoxGeometry(0.06, 0.04, 0.06);
        const footMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.7), 'WOOD_MATTE'
        );
        const footOffsetX = dims.width / 2 - 0.08;
        const footOffsetZ = dims.depth * 0.85 / 2 - 0.08;
        const footPositions = [
            { x: -footOffsetX, z: -footOffsetZ },
            { x:  footOffsetX, z: -footOffsetZ },
            { x: -footOffsetX, z:  footOffsetZ },
            { x:  footOffsetX, z:  footOffsetZ }
        ];

        for (const pos of footPositions) {
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(pos.x, 0.02, pos.z);
            FurnitureFactory3D._enableShadows(foot);
            group.add(foot);
        }

        // Throw pillows — two small cushions on seat corners for realism
        const pillowMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.25), 'FABRIC'
        );
        const pillowGeo = new THREE.BoxGeometry(
            dims.width * 0.18, dims.height * 0.18, dims.depth * 0.18
        );
        const pillowY = dims.height * 0.48;
        const pillowZ = -(dims.depth * 0.25);

        const leftPillow = new THREE.Mesh(pillowGeo, pillowMat);
        leftPillow.position.set(-(dims.width * 0.3), pillowY, pillowZ);
        leftPillow.rotation.y = 0.15;
        FurnitureFactory3D._enableShadows(leftPillow);
        group.add(leftPillow);

        const rightPillow = new THREE.Mesh(pillowGeo, pillowMat);
        rightPillow.position.set(dims.width * 0.3, pillowY, pillowZ);
        rightPillow.rotation.y = -0.2;
        FurnitureFactory3D._enableShadows(rightPillow);
        group.add(rightPillow);

        return group;
    }

    // ─────────────────────────────────────────────
    //  5. ARMCHAIR — single-seat sofa proportions
    // ─────────────────────────────────────────────

    /**
     * Build an armchair from composed primitives.
     * Similar structure to sofa but single-seat proportions.
     *
     * Components (8 meshes):
     * - SEAT BASE: BoxGeometry
     * - BACK CUSHION: BoxGeometry (narrower proportional to seat)
     * - LEFT/RIGHT ARMRESTS: BoxGeometry
     * - FEET (×4): small BoxGeometry cubes
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Armchair group with 8 child meshes
     */
    static createArmchair(dims, colour) {
        const group = new THREE.Group();
        const baseMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const cushionMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.15), 'FABRIC'
        );

        // Seat base
        const seatGeo = new THREE.BoxGeometry(dims.width, dims.height * 0.4, dims.depth * 0.85);
        const seat = new THREE.Mesh(seatGeo, cushionMat);
        seat.position.y = dims.height * 0.2;
        FurnitureFactory3D._enableShadows(seat);
        group.add(seat);

        // Back cushion — narrower than seat
        const backGeo = new THREE.BoxGeometry(
            dims.width * 0.85,
            dims.height * 0.55,
            dims.depth * 0.18
        );
        const back = new THREE.Mesh(backGeo, baseMat);
        back.position.set(0, dims.height * 0.5, -(dims.depth / 2 - dims.depth * 0.09));
        FurnitureFactory3D._enableShadows(back);
        group.add(back);

        // Left armrest
        const armMat = FurnitureFactory3D._createMaterial(colour, 'LEATHER');
        const armGeo = new THREE.BoxGeometry(0.1, dims.height * 0.4, dims.depth * 0.75);
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-(dims.width / 2 - 0.05), dims.height * 0.3, 0);
        FurnitureFactory3D._enableShadows(leftArm);
        group.add(leftArm);

        // Right armrest
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(dims.width / 2 - 0.05, dims.height * 0.3, 0);
        FurnitureFactory3D._enableShadows(rightArm);
        group.add(rightArm);

        // 4 feet — small cubes
        const footGeo = new THREE.BoxGeometry(0.06, 0.04, 0.06);
        const footMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.7), 'WOOD_MATTE'
        );
        const footOffsetX = dims.width / 2 - 0.08;
        const footOffsetZ = dims.depth * 0.85 / 2 - 0.06;
        const footPositions = [
            { x: -footOffsetX, z: -footOffsetZ },
            { x:  footOffsetX, z: -footOffsetZ },
            { x: -footOffsetX, z:  footOffsetZ },
            { x:  footOffsetX, z:  footOffsetZ }
        ];

        for (const pos of footPositions) {
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(pos.x, 0.02, pos.z);
            FurnitureFactory3D._enableShadows(foot);
            group.add(foot);
        }

        return group;
    }

    // ─────────────────────────────────────────────
    //  6. COFFEE TABLE — tabletop + 4 square legs + lower shelf
    // ─────────────────────────────────────────────

    /**
     * Build a coffee table from composed primitives.
     *
     * Components (6 meshes):
     * - TABLETOP: BoxGeometry slab at top
     * - LEGS (×4): square BoxGeometry at corners
     * - LOWER SHELF: thin BoxGeometry connecting the legs
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Coffee table group with 6 child meshes
     */
    static createCoffeeTable(dims, colour) {
        const group = new THREE.Group();
        const mat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.85), 'WOOD'
        );

        const topThickness = 0.04;

        // Tabletop
        const topGeo = new THREE.BoxGeometry(dims.width, topThickness, dims.depth);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // 4 square legs
        const legSize = 0.04;
        const legHeight = dims.height - topThickness;
        const legGeo = new THREE.BoxGeometry(legSize, legHeight, legSize);
        const legOffsetX = dims.width / 2 - legSize / 2 - 0.02;
        const legOffsetZ = dims.depth / 2 - legSize / 2 - 0.02;
        const legPositions = [
            { x: -legOffsetX, z: -legOffsetZ },
            { x:  legOffsetX, z: -legOffsetZ },
            { x: -legOffsetX, z:  legOffsetZ },
            { x:  legOffsetX, z:  legOffsetZ }
        ];

        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x, legHeight / 2, pos.z);
            FurnitureFactory3D._enableShadows(leg);
            group.add(leg);
        }

        // Lower shelf
        const shelfGeo = new THREE.BoxGeometry(dims.width - 0.1, 0.02, dims.depth - 0.1);
        const shelf = new THREE.Mesh(shelfGeo, mat);
        shelf.position.y = dims.height * 0.25;
        FurnitureFactory3D._enableShadows(shelf);
        group.add(shelf);

        return group;
    }

    // ─────────────────────────────────────────────
    //  7. BOOKSHELF — 2 sides + back panel + top + 4 shelves
    // ─────────────────────────────────────────────

    /**
     * Build a bookshelf from composed primitives.
     *
     * Components (8 meshes):
     * - LEFT SIDE: tall BoxGeometry panel
     * - RIGHT SIDE: tall BoxGeometry panel (mirrored)
     * - BACK PANEL: thin BoxGeometry covering rear (darker shade)
     * - TOP: BoxGeometry cap
     * - SHELVES (×4): thin BoxGeometry slabs evenly spaced at 20%, 40%, 60%, 80% height
     *
     * The back panel uses a darker shade for visual depth when looking into the unit.
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Bookshelf group with 8 child meshes
     */
    static createBookshelf(dims, colour) {
        const group = new THREE.Group();
        const mat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const backMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.75), 'WOOD_MATTE'
        );

        const panelThickness = 0.03;

        // Left side panel
        const sideGeo = new THREE.BoxGeometry(panelThickness, dims.height, dims.depth);
        const leftSide = new THREE.Mesh(sideGeo, mat);
        leftSide.position.set(-(dims.width / 2 - panelThickness / 2), dims.height / 2, 0);
        FurnitureFactory3D._enableShadows(leftSide);
        group.add(leftSide);

        // Right side panel
        const rightSide = new THREE.Mesh(sideGeo, mat);
        rightSide.position.set(dims.width / 2 - panelThickness / 2, dims.height / 2, 0);
        FurnitureFactory3D._enableShadows(rightSide);
        group.add(rightSide);

        // Back panel — darker shade for depth
        const backGeo = new THREE.BoxGeometry(dims.width - panelThickness * 2, dims.height, 0.02);
        const backPanel = new THREE.Mesh(backGeo, backMat);
        backPanel.position.set(0, dims.height / 2, -(dims.depth / 2 - 0.01));
        FurnitureFactory3D._enableShadows(backPanel);
        group.add(backPanel);

        // Top cap
        const topGeo = new THREE.BoxGeometry(dims.width, panelThickness, dims.depth);
        const topCap = new THREE.Mesh(topGeo, mat);
        topCap.position.y = dims.height - panelThickness / 2;
        FurnitureFactory3D._enableShadows(topCap);
        group.add(topCap);

        // 4 shelves — evenly spaced at 20%, 40%, 60%, 80% of height
        const shelfGeo = new THREE.BoxGeometry(
            dims.width - panelThickness * 2,
            0.02,
            dims.depth - 0.03
        );
        const shelfPositions = [0.2, 0.4, 0.6, 0.8];
        for (const fraction of shelfPositions) {
            const shelf = new THREE.Mesh(shelfGeo, mat);
            shelf.position.set(0, dims.height * fraction, 0);
            FurnitureFactory3D._enableShadows(shelf);
            group.add(shelf);
        }

        // Books on shelves — small coloured blocks in clusters
        const bookColours = ['#8B4513', '#2F4F4F', '#800020', '#1C3A5F', '#5C4033', '#4A3728'];
        const innerWidth = dims.width - panelThickness * 2 - 0.04;
        for (let si = 0; si < shelfPositions.length; si++) {
            const shelfY = dims.height * shelfPositions[si] + 0.01;
            // Place 3–5 books per shelf
            const bookCount = 3 + (si % 3);
            const clusterWidth = innerWidth * 0.7;
            const startX = -(clusterWidth / 2) + (si % 2) * (innerWidth * 0.15);

            for (let bi = 0; bi < bookCount; bi++) {
                const bookW = 0.02 + Math.random() * 0.015;
                const bookH = dims.height * 0.12 + Math.random() * dims.height * 0.05;
                const bookD = dims.depth * 0.55 + Math.random() * dims.depth * 0.15;
                const bookGeo = new THREE.BoxGeometry(bookW, bookH, bookD);
                const bookMat = FurnitureFactory3D._createMaterial(
                    bookColours[(si * 3 + bi) % bookColours.length], 'PLASTIC_MATTE'
                );
                const book = new THREE.Mesh(bookGeo, bookMat);
                book.position.set(
                    startX + bi * (clusterWidth / bookCount),
                    shelfY + bookH / 2,
                    0
                );
                // Slight tilt for realism
                book.rotation.z = (bi % 3 === 1) ? 0.05 : 0;
                FurnitureFactory3D._enableShadows(book);
                group.add(book);
            }
        }

        return group;
    }

    // ─────────────────────────────────────────────
    //  8. DESK — desktop + 2 side panels + modesty panel + drawer unit
    // ─────────────────────────────────────────────

    /**
     * Build a desk from composed primitives.
     *
     * Components (5 meshes):
     * - DESKTOP: thin BoxGeometry slab at top
     * - LEFT PANEL: tall BoxGeometry support
     * - RIGHT PANEL: tall BoxGeometry support (mirrored)
     * - MODESTY PANEL: thin BoxGeometry at rear (lower portion)
     * - DRAWER UNIT: BoxGeometry block on right side under desktop
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Desk group with 5 child meshes
     */
    static createDesk(dims, colour) {
        const group = new THREE.Group();
        const mat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const accentMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.85), 'WOOD_MATTE'
        );

        const topThickness = 0.04;

        // Desktop surface
        const topGeo = new THREE.BoxGeometry(dims.width, topThickness, dims.depth);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // Left side panel
        const panelThickness = 0.03;
        const panelHeight = dims.height - topThickness;
        const panelGeo = new THREE.BoxGeometry(panelThickness, panelHeight, dims.depth * 0.9);
        const leftPanel = new THREE.Mesh(panelGeo, mat);
        leftPanel.position.set(
            -(dims.width / 2 - panelThickness / 2),
            panelHeight / 2,
            0
        );
        FurnitureFactory3D._enableShadows(leftPanel);
        group.add(leftPanel);

        // Right side panel
        const rightPanel = new THREE.Mesh(panelGeo, mat);
        rightPanel.position.set(
            dims.width / 2 - panelThickness / 2,
            panelHeight / 2,
            0
        );
        FurnitureFactory3D._enableShadows(rightPanel);
        group.add(rightPanel);

        // Modesty panel (back, lower portion)
        const modestyHeight = dims.height * 0.4;
        const modestyGeo = new THREE.BoxGeometry(dims.width - panelThickness * 2, modestyHeight, 0.02);
        const modesty = new THREE.Mesh(modestyGeo, accentMat);
        modesty.position.set(0, dims.height * 0.5, -(dims.depth / 2 - 0.01));
        FurnitureFactory3D._enableShadows(modesty);
        group.add(modesty);

        // Drawer unit — block on right side under desktop
        const drawerGeo = new THREE.BoxGeometry(
            dims.width * 0.3,
            dims.height * 0.3,
            dims.depth * 0.8
        );
        const drawer = new THREE.Mesh(drawerGeo, accentMat);
        drawer.position.set(
            dims.width * 0.25,
            dims.height * 0.55,
            0
        );
        FurnitureFactory3D._enableShadows(drawer);
        group.add(drawer);

        return group;
    }

    // ─────────────────────────────────────────────
    //  FALLBACK — simple box for unknown types
    // ─────────────────────────────────────────────

    /**
     * Create a simple box mesh as fallback for unknown furniture types.
     * Ensures backwards compatibility — any type not in the switch statement
     * still renders as a coloured box rather than disappearing.
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group} Group containing a single box mesh
     * @private
     */
    static _createFallbackBox(dims, colour) {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
        const mat = FurnitureFactory3D._createMaterial(colour, 'PLASTIC_MATTE');
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = dims.height / 2;
        FurnitureFactory3D._enableShadows(mesh);
        group.add(mesh);
        return group;
    }

    // ─────────────────────────────────────────────
    //  HELPER METHODS
    // ─────────────────────────────────────────────

    /**
     * PBR material profiles — named presets for roughness/metalness
     * so each furniture sub-component looks like its real-world material.
     * @private
     */
    static MATERIAL_PROFILES = {
        WOOD:          { roughness: 0.75, metalness: 0.05 },
        WOOD_MATTE:    { roughness: 0.9,  metalness: 0.02 },
        FABRIC:        { roughness: 1.0,  metalness: 0.0  },
        METAL:         { roughness: 0.35, metalness: 0.85 },
        LEATHER:       { roughness: 0.5,  metalness: 0.1  },
        PLASTIC_MATTE: { roughness: 0.7,  metalness: 0.1  }
    };

    /**
     * Create a MeshStandardMaterial using a named PBR profile.
     * Generates procedural CanvasTextures (colour map + roughness map)
     * per profile type for realistic surface detail.
     * PLASTIC_MATTE is left untextured.
     *
     * @param {string} baseColour - Hex colour string
     * @param {string} [profile='PLASTIC_MATTE'] - Profile key from MATERIAL_PROFILES
     * @returns {THREE.MeshStandardMaterial} Material instance
     */
    static _createMaterial(baseColour, profile = 'PLASTIC_MATTE') {
        const p = FurnitureFactory3D.MATERIAL_PROFILES[profile]
            || FurnitureFactory3D.MATERIAL_PROFILES.PLASTIC_MATTE;

        const matOpts = {
            color: baseColour,
            roughness: p.roughness,
            metalness: p.metalness
        };

        // Generate procedural texture maps for supported profiles
        const textureFn = {
            WOOD:       FurnitureFactory3D._createWoodTexture,
            WOOD_MATTE: FurnitureFactory3D._createWoodTexture,
            FABRIC:     FurnitureFactory3D._createFabricTexture,
            METAL:      FurnitureFactory3D._createMetalTexture,
            LEATHER:    FurnitureFactory3D._createLeatherTexture
        }[profile];

        if (textureFn) {
            const textures = textureFn(baseColour);
            matOpts.map = textures.map;
            if (textures.roughnessMap) {
                matOpts.roughnessMap = textures.roughnessMap;
            }
        }

        return new THREE.MeshStandardMaterial(matOpts);
    }

    /**
     * Return a metal-appropriate colour based on the furniture's base colour.
     * Light furniture → silver-grey (#888888); dark furniture → dark chrome (#555555).
     *
     * @param {string} baseColour - Furniture hex colour string
     * @returns {string} Metal hex colour string
     * @private
     */
    static _getMetalColour(baseColour) {
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#888888' : '#555555';
    }

    // ─────────────────────────────────────────────
    //  PROCEDURAL TEXTURE GENERATORS
    // ─────────────────────────────────────────────

    /**
     * Compute the relative luminance of a colour (0–1).
     * Used to scale texture contrast for dark base colours.
     *
     * @param {{ r: number, g: number, b: number }} rgb
     * @returns {number} Luminance 0 (black) to 1 (white)
     * @private
     */
    static _luminance(rgb) {
        return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    }

    /**
     * Build a CanvasTexture with standard wrapping/filtering settings.
     *
     * @param {HTMLCanvasElement} canvas
     * @param {number} [repeatX=1]
     * @param {number} [repeatY=1]
     * @returns {THREE.CanvasTexture}
     * @private
     */
    static _finishTexture(canvas, repeatX = 1, repeatY = 1) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if (repeatX !== 1 || repeatY !== 1) tex.repeat.set(repeatX, repeatY);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }

    /**
     * Create a procedural wood grain texture with roughness map.
     *
     * Generates horizontal grain streaks with colour warmth variation
     * (red channel leads), wide growth-ring bands, and wavy knot lines.
     * The roughness map makes grain grooves catch light differently
     * from the smooth surface between them.
     *
     * @param {string} baseColour - Hex colour string
     * @returns {{ map: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }}
     * @private
     */
    static _createWoodTexture(baseColour) {
        const SIZE = 128;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        // Dark colours get stronger contrast so grain stays visible
        const intensity = lum < 0.35 ? 2.2 : (lum < 0.55 ? 1.4 : 1.0);

        // ── Colour map ──
        const cCanvas = document.createElement('canvas');
        cCanvas.width = SIZE;
        cCanvas.height = SIZE;
        const cCtx = cCanvas.getContext('2d');

        // ── Roughness map (greyscale) ──
        const rCanvas = document.createElement('canvas');
        rCanvas.width = SIZE;
        rCanvas.height = SIZE;
        const rCtx = rCanvas.getContext('2d');
        rCtx.fillStyle = '#b3b3b3'; // base roughness ~0.7
        rCtx.fillRect(0, 0, SIZE, SIZE);

        // Horizontal grain lines with warmth separation
        for (let y = 0; y < SIZE; y++) {
            const grainNoise = ((y * 7 + 3) % 11 - 5) * 2.4 * intensity;
            // Wide growth-ring bands (~32px period)
            const ringNoise = Math.sin(y * 0.1) * 8 * intensity;
            const total = grainNoise + ringNoise;

            // Red channel leads for warm wood tint
            const r = Math.max(0, Math.min(255, rgb.r + total * 1.2));
            const g = Math.max(0, Math.min(255, rgb.g + total * 0.85));
            const b = Math.max(0, Math.min(255, rgb.b + total * 0.5));

            cCtx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
            cCtx.fillRect(0, y, SIZE, 1);

            // Roughness varies with grain — grooves are rougher
            const rv = Math.max(0, Math.min(255, 178 + total * 0.6));
            rCtx.fillStyle = `rgb(${Math.round(rv)},${Math.round(rv)},${Math.round(rv)})`;
            rCtx.fillRect(0, y, SIZE, 1);
        }

        // Prominent wavy knot-lines
        cCtx.strokeStyle = `rgba(0,0,0,${0.08 * intensity})`;
        cCtx.lineWidth = 1;
        rCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        rCtx.lineWidth = 1;
        for (let y = 10; y < SIZE; y += 18 + (y % 7)) {
            cCtx.beginPath();
            cCtx.moveTo(0, y);
            cCtx.quadraticCurveTo(SIZE * 0.3, y + ((y * 3) % 7 - 3), SIZE * 0.6, y + 1);
            cCtx.quadraticCurveTo(SIZE * 0.8, y - ((y * 2) % 5 - 2), SIZE, y);
            cCtx.stroke();

            rCtx.beginPath();
            rCtx.moveTo(0, y);
            rCtx.quadraticCurveTo(SIZE * 0.3, y + ((y * 3) % 7 - 3), SIZE * 0.6, y + 1);
            rCtx.quadraticCurveTo(SIZE * 0.8, y - ((y * 2) % 5 - 2), SIZE, y);
            rCtx.stroke();
        }

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas)
        };
    }

    /**
     * Create a procedural fabric weave texture with roughness map.
     *
     * Generates a cross-hatch micro-pattern with scale-aware contrast.
     * The roughness map creates uneven matte quality so light catches
     * differently on warp vs weft threads.
     *
     * @param {string} baseColour - Hex colour string
     * @returns {{ map: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }}
     * @private
     */
    static _createFabricTexture(baseColour) {
        const SIZE = 64;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        // Dark colours need much stronger contrast
        const contrast = lum < 0.3 ? 10 : (lum < 0.5 ? 7 : 5);

        const cCanvas = document.createElement('canvas');
        cCanvas.width = SIZE;
        cCanvas.height = SIZE;
        const cCtx = cCanvas.getContext('2d');
        cCtx.fillStyle = baseColour;
        cCtx.fillRect(0, 0, SIZE, SIZE);

        const rCanvas = document.createElement('canvas');
        rCanvas.width = SIZE;
        rCanvas.height = SIZE;
        const rCtx = rCanvas.getContext('2d');
        rCtx.fillStyle = '#e6e6e6'; // base roughness ~0.9
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const px = (i / 4) % SIZE;
            const py = Math.floor((i / 4) / SIZE);

            // 2×2 checkerboard = warp/weft thread
            const isWarp = ((px >> 1) + (py >> 1)) % 2 === 0;
            const threadNoise = isWarp ? contrast : -contrast;
            // Micro-fuzz
            const fuzz = ((px * 13 + py * 7) % 5 - 2) * 1.2;

            cd[i]     = Math.max(0, Math.min(255, rgb.r + threadNoise + fuzz));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + threadNoise + fuzz));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + threadNoise + fuzz));

            // Roughness: warp threads slightly rougher than weft
            const rv = isWarp ? 240 : 220;
            rd[i] = rd[i + 1] = rd[i + 2] = rv + ((px * 7 + py * 3) % 5 - 2);
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas, 2, 2),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas, 2, 2)
        };
    }

    /**
     * Create a procedural brushed metal texture with roughness map.
     *
     * Generates directional horizontal brush marks. The roughness map
     * creates visible streaks where some rows are shinier than others.
     *
     * @param {string} baseColour - Hex colour string
     * @returns {{ map: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }}
     * @private
     */
    static _createMetalTexture(baseColour) {
        const SIZE = 64;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);

        const cCanvas = document.createElement('canvas');
        cCanvas.width = SIZE;
        cCanvas.height = SIZE;
        const cCtx = cCanvas.getContext('2d');
        cCtx.fillStyle = baseColour;
        cCtx.fillRect(0, 0, SIZE, SIZE);

        const rCanvas = document.createElement('canvas');
        rCanvas.width = SIZE;
        rCanvas.height = SIZE;
        const rCtx = rCanvas.getContext('2d');
        rCtx.fillStyle = '#595959'; // base roughness ~0.35
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const py = Math.floor((i / 4) / SIZE);
            const px = (i / 4) % SIZE;

            // Per-row brush stroke brightness
            const brushNoise = ((py * 17 + 5) % 13 - 6) * 3.5;
            const micro = ((px * 3 + py * 11) % 7 - 3) * 0.8;

            cd[i]     = Math.max(0, Math.min(255, rgb.r + brushNoise + micro));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + brushNoise + micro));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + brushNoise + micro));

            // Roughness streaks — some rows shinier, some duller
            const rv = Math.max(30, Math.min(120, 89 + brushNoise * 0.5));
            rd[i] = rd[i + 1] = rd[i + 2] = Math.round(rv);
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas)
        };
    }

    /**
     * Create a procedural leather stipple texture with roughness map.
     *
     * Generates pore dots with scale-aware contrast. The roughness map
     * makes pores slightly rougher than smooth areas for depth.
     *
     * @param {string} baseColour - Hex colour string
     * @returns {{ map: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }}
     * @private
     */
    static _createLeatherTexture(baseColour) {
        const SIZE = 64;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        const intensity = lum < 0.35 ? 2.0 : 1.0;

        const cCanvas = document.createElement('canvas');
        cCanvas.width = SIZE;
        cCanvas.height = SIZE;
        const cCtx = cCanvas.getContext('2d');
        cCtx.fillStyle = baseColour;
        cCtx.fillRect(0, 0, SIZE, SIZE);

        const rCanvas = document.createElement('canvas');
        rCanvas.width = SIZE;
        rCanvas.height = SIZE;
        const rCtx = rCanvas.getContext('2d');
        rCtx.fillStyle = '#808080'; // base roughness ~0.5
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const px = (i / 4) % SIZE;
            const py = Math.floor((i / 4) / SIZE);

            const hash = (px * 31 + py * 17) % 37;
            let noise = 0;
            let roughAdj = 0;
            if (hash < 7) {
                // Dark pore
                noise = (-8 - hash * 1.8) * intensity;
                roughAdj = 25; // pores are rougher
            } else if (hash > 31) {
                // Slight highlight between pores
                noise = 6 * intensity;
                roughAdj = -15; // highlights are smoother
            }

            cd[i]     = Math.max(0, Math.min(255, rgb.r + noise));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + noise));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + noise));

            rd[i] = rd[i + 1] = rd[i + 2] = Math.max(0, Math.min(255, 128 + roughAdj));
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas)
        };
    }

    /**
     * Darken a hex colour by multiplying each RGB channel by a factor.
     * Used for legs, accents, and back panels to add visual depth
     * between components of the same furniture piece.
     *
     * @param {string} hex - Hex colour string (e.g. '#5C4033')
     * @param {number} [factor=0.85] - Darkening factor (0–1, lower = darker)
     * @returns {string} Darkened hex colour string
     */
    static _darkenColour(hex, factor = 0.85) {
        const rgb = FurnitureFactory3D._hexToRgb(hex);
        const r = Math.round(rgb.r * factor);
        const g = Math.round(rgb.g * factor);
        const b = Math.round(rgb.b * factor);
        return FurnitureFactory3D._rgbToHex(r, g, b);
    }

    /**
     * Lighten a hex colour by multiplying each RGB channel by a factor.
     * Each channel is clamped to 255 to prevent overflow.
     * Used for seat cushions vs backrests to add visual depth.
     *
     * @param {string} hex - Hex colour string (e.g. '#5C4033')
     * @param {number} [factor=1.15] - Lightening factor (>1 = lighter)
     * @returns {string} Lightened hex colour string
     */
    static _lightenColour(hex, factor = 1.15) {
        const rgb = FurnitureFactory3D._hexToRgb(hex);
        const r = Math.min(255, Math.round(rgb.r * factor));
        const g = Math.min(255, Math.round(rgb.g * factor));
        const b = Math.min(255, Math.round(rgb.b * factor));
        return FurnitureFactory3D._rgbToHex(r, g, b);
    }

    /**
     * Enable shadow casting and receiving on a mesh.
     * Called on every mesh in every furniture group to ensure
     * proper shadow rendering in the 3D scene.
     *
     * @param {THREE.Mesh} mesh - Mesh to configure shadows on
     * @private
     */
    static _enableShadows(mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    /**
     * Convert a hex colour string to RGB components.
     *
     * @param {string} hex - Hex colour string (e.g. '#5C4033' or '#abc')
     * @returns {Object} { r, g, b } values 0–255
     * @private
     */
    static _hexToRgb(hex) {
        // Remove # prefix if present
        let cleaned = hex.replace(/^#/, '');

        // Expand 3-digit hex to 6-digit
        if (cleaned.length === 3) {
            cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
        }

        const num = parseInt(cleaned, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    /**
     * Convert RGB values to a hex colour string.
     *
     * @param {number} r - Red channel (0–255)
     * @param {number} g - Green channel (0–255)
     * @param {number} b - Blue channel (0–255)
     * @returns {string} Hex colour string (e.g. '#5C4033')
     * @private
     */
    static _rgbToHex(r, g, b) {
        const toHex = (n) => {
            const clamped = Math.max(0, Math.min(255, n));
            return clamped.toString(16).padStart(2, '0');
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // ─────────────────────────────────────────────
    //  9. TV STAND — cabinet body + top + door panels + shelf + legs
    // ─────────────────────────────────────────────

    /**
     * Build a TV stand / media unit from composed primitives.
     *
     * Components:
     * - BODY: main cabinet box
     * - TOP: slightly overhanging surface slab
     * - DOORS: two front panels (lighter colour)
     * - SHELF OPENING: dark recessed area in centre top
     * - LEGS: 4 short cylinders
     *
     * @param {{ width: number, depth: number, height: number }} dims
     * @param {string} colour - Hex colour
     * @returns {THREE.Group}
     */
    static createTvStand(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const mainMat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const darkMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.75), 'WOOD_MATTE'
        );
        const lightMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.12), 'WOOD'
        );

        const legH = 0.08;
        const bodyH = height * 0.7;
        const topH = 0.03;

        // Cabinet body
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyH, depth), mainMat);
        body.position.y = legH + bodyH / 2;
        FurnitureFactory3D._enableShadows(body);
        group.add(body);

        // Top surface
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.02, topH, depth + 0.02), mainMat
        );
        top.position.y = legH + bodyH + topH / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // Two door panels on front face
        const doorW = width * 0.46;
        const doorH = bodyH * 0.75;
        const doorGap = width * 0.02;
        const doorZ = depth / 2 + 0.005;

        const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.02), lightMat);
        leftDoor.position.set(-doorGap / 2 - doorW / 2, legH + bodyH * 0.4, doorZ);
        FurnitureFactory3D._enableShadows(leftDoor);
        group.add(leftDoor);

        const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.02), lightMat);
        rightDoor.position.set(doorGap / 2 + doorW / 2, legH + bodyH * 0.4, doorZ);
        FurnitureFactory3D._enableShadows(rightDoor);
        group.add(rightDoor);

        // Open shelf recess in centre top
        const shelfW = width * 0.3;
        const shelfH = bodyH * 0.2;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, shelfH, depth * 0.8), darkMat);
        shelf.position.set(0, legH + bodyH - shelfH / 2, 0);
        FurnitureFactory3D._enableShadows(shelf);
        group.add(shelf);

        // 4 short legs
        const legGeo = new THREE.CylinderGeometry(0.02, 0.02, legH, 8);
        const inX = width / 2 - 0.06;
        const inZ = depth / 2 - 0.06;
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );
        [[-inX, -inZ], [inX, -inZ], [-inX, inZ], [inX, inZ]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, legH / 2, lz);
            FurnitureFactory3D._enableShadows(leg);
            group.add(leg);
        });

        return group;
    }

    // ─────────────────────────────────────────────
    //  10. BED — frame + mattress + headboard + pillows
    // ─────────────────────────────────────────────

    /**
     * Build a bed from composed primitives.
     *
     * Components:
     * - FRAME: base box (darker colour)
     * - MATTRESS: slightly inset box on top (main colour)
     * - HEADBOARD: tall panel at one short end (frame colour)
     * - PILLOWS (×2): small boxes near headboard (white)
     *
     * @param {{ width: number, depth: number, height: number }} dims
     * @param {string} colour - Hex colour
     * @returns {THREE.Group}
     */
    static createBed(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.75), 'WOOD'
        );
        const mattressMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const pillowMat = FurnitureFactory3D._createMaterial('#FFFFFF', 'FABRIC');

        const frameH = height * 0.3;
        const mattressH = height * 0.35;

        // Bed frame base
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width, frameH, depth), frameMat);
        frame.position.y = frameH / 2;
        FurnitureFactory3D._enableShadows(frame);
        group.add(frame);

        // Mattress (slightly inset)
        const mattress = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.05, mattressH, depth - 0.1), mattressMat
        );
        mattress.position.y = frameH + mattressH / 2;
        FurnitureFactory3D._enableShadows(mattress);
        group.add(mattress);

        // Headboard (tall panel at one short end, –Z side)
        const headboardH = height * 0.7;
        const headboard = new THREE.Mesh(
            new THREE.BoxGeometry(width, headboardH, 0.08), frameMat
        );
        headboard.position.set(0, headboardH / 2, -depth / 2 + 0.04);
        FurnitureFactory3D._enableShadows(headboard);
        group.add(headboard);

        // 2 Pillows near headboard
        const pillowW = width * 0.35;
        const pillowH = 0.1;
        const pillowD = 0.3;
        const pillowY = frameH + mattressH + pillowH / 2;
        const pillowZ = -depth / 2 + 0.35;

        const leftPillow = new THREE.Mesh(
            new THREE.BoxGeometry(pillowW, pillowH, pillowD), pillowMat
        );
        leftPillow.position.set(-width * 0.2, pillowY, pillowZ);
        FurnitureFactory3D._enableShadows(leftPillow);
        group.add(leftPillow);

        const rightPillow = new THREE.Mesh(
            new THREE.BoxGeometry(pillowW, pillowH, pillowD), pillowMat
        );
        rightPillow.position.set(width * 0.2, pillowY, pillowZ);
        FurnitureFactory3D._enableShadows(rightPillow);
        group.add(rightPillow);

        return group;
    }

    // ─────────────────────────────────────────────
    //  11. WARDROBE — body + doors + handles + plinth + cornice
    // ─────────────────────────────────────────────

    /**
     * Build a wardrobe from composed primitives.
     *
     * Components:
     * - BODY: main box
     * - DOORS (×2): front panels (lighter colour)
     * - HANDLES (×2): vertical cylinder bars
     * - PLINTH: darker base strip
     * - CORNICE: slight overhang at top
     *
     * @param {{ width: number, depth: number, height: number }} dims
     * @param {string} colour - Hex colour
     * @returns {THREE.Group}
     */
    static createWardrobe(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const mainMat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const darkMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.8), 'WOOD_MATTE'
        );
        const lightMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.08), 'WOOD'
        );
        const handleMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );

        const plinthH = 0.06;
        const corniceH = 0.05;

        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mainMat);
        body.position.y = height / 2;
        FurnitureFactory3D._enableShadows(body);
        group.add(body);

        // Two door panels
        const doorW = width * 0.48;
        const doorH = height * 0.9;
        const doorZ = depth / 2 + 0.012;
        const doorGap = width * 0.01;

        const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.025), lightMat);
        leftDoor.position.set(-doorGap - doorW / 2, height * 0.48, doorZ);
        FurnitureFactory3D._enableShadows(leftDoor);
        group.add(leftDoor);

        const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.025), lightMat);
        rightDoor.position.set(doorGap + doorW / 2, height * 0.48, doorZ);
        FurnitureFactory3D._enableShadows(rightDoor);
        group.add(rightDoor);

        // Handle bars (vertical cylinders on each door)
        const handleH = height * 0.15;
        const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, handleH, 8);

        const leftHandle = new THREE.Mesh(handleGeo, handleMat);
        leftHandle.position.set(-doorGap - 0.03, height * 0.48, doorZ + 0.02);
        FurnitureFactory3D._enableShadows(leftHandle);
        group.add(leftHandle);

        const rightHandle = new THREE.Mesh(handleGeo, handleMat);
        rightHandle.position.set(doorGap + 0.03, height * 0.48, doorZ + 0.02);
        FurnitureFactory3D._enableShadows(rightHandle);
        group.add(rightHandle);

        // Base plinth
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(width, plinthH, depth), darkMat);
        plinth.position.y = plinthH / 2;
        FurnitureFactory3D._enableShadows(plinth);
        group.add(plinth);

        // Top cornice (slight overhang) — WOOD like body
        const corniceMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.85), 'WOOD'
        );
        const cornice = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.04, corniceH, depth + 0.02), corniceMat
        );
        cornice.position.y = height + corniceH / 2;
        FurnitureFactory3D._enableShadows(cornice);
        group.add(cornice);

        return group;
    }

    // ─────────────────────────────────────────────
    //  12. RUG — flat box with border strips
    // ─────────────────────────────────────────────

    /**
     * Build a rug from composed primitives.
     *
     * Essentially flat on the floor. Does NOT cast shadows (it is on the floor)
     * but DOES receive shadows (furniture shadows appear on it).
     *
     * Components:
     * - MAIN SURFACE: very thin box (height = 0.02)
     * - BORDER STRIPS (×4): thin darker-coloured edges
     *
     * @param {{ width: number, depth: number, height: number }} dims
     * @param {string} colour - Hex colour
     * @returns {THREE.Group}
     */
    static createRug(dims, colour) {
        const { width, depth } = dims;
        const group = new THREE.Group();

        const rugH = 0.02;
        const mainMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const borderMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.75), 'FABRIC'
        );

        // Main rug surface
        const surface = new THREE.Mesh(new THREE.BoxGeometry(width, rugH, depth), mainMat);
        surface.position.y = rugH / 2;
        surface.castShadow = false;
        surface.receiveShadow = true;
        group.add(surface);

        // Border strips (4 thin edges creating a frame pattern)
        const borderW = 0.04;

        // Front and back border strips (along width)
        const fbGeo = new THREE.BoxGeometry(width, rugH + 0.002, borderW);
        const frontBorder = new THREE.Mesh(fbGeo, borderMat);
        frontBorder.position.set(0, rugH / 2, depth / 2 - borderW / 2);
        frontBorder.castShadow = false;
        frontBorder.receiveShadow = true;
        group.add(frontBorder);

        const backBorder = new THREE.Mesh(fbGeo, borderMat);
        backBorder.position.set(0, rugH / 2, -depth / 2 + borderW / 2);
        backBorder.castShadow = false;
        backBorder.receiveShadow = true;
        group.add(backBorder);

        // Left and right border strips (along depth)
        const lrGeo = new THREE.BoxGeometry(borderW, rugH + 0.002, depth);
        const leftBorder = new THREE.Mesh(lrGeo, borderMat);
        leftBorder.position.set(-width / 2 + borderW / 2, rugH / 2, 0);
        leftBorder.castShadow = false;
        leftBorder.receiveShadow = true;
        group.add(leftBorder);

        const rightBorder = new THREE.Mesh(lrGeo, borderMat);
        rightBorder.position.set(width / 2 - borderW / 2, rugH / 2, 0);
        rightBorder.castShadow = false;
        rightBorder.receiveShadow = true;
        group.add(rightBorder);

        return group;
    }
}
