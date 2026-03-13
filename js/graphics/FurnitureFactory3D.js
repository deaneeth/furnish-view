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
            case 'desk-chair':
                group = FurnitureFactory3D.createDeskChair(dims, colour); break;
            case 'dining-table':
                group = FurnitureFactory3D.createDiningTable(dims, colour); break;
            case 'side-table':
                group = FurnitureFactory3D.createSideTable(dims, colour); break;
            case 'sofa':
                group = FurnitureFactory3D.createSofa(dims, colour); break;
            case 'armchair':
                group = FurnitureFactory3D.createArmchair(dims, colour); break;
            case 'chaise':
                group = FurnitureFactory3D.createChaise(dims, colour); break;
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
            case 'floor-plant':
                group = FurnitureFactory3D.createFloorPlant(dims, colour); break;
            case 'table-plant':
                group = FurnitureFactory3D.createTablePlant(dims, colour); break;
            case 'floor-lamp':
                group = FurnitureFactory3D.createFloorLamp(dims, colour); break;
            case 'table-lamp':
                group = FurnitureFactory3D.createTableLamp(dims, colour); break;
            case 'bedside-lamp':
                group = FurnitureFactory3D.createBedsideLamp(dims, colour); break;
            case 'single-door':
                group = FurnitureFactory3D.createSingleDoor(dims, colour); break;
            case 'double-door':
                group = FurnitureFactory3D.createDoubleDoor(dims, colour); break;
            case 'standard-window':
                group = FurnitureFactory3D.createStandardWindow(dims, colour); break;
            case 'tall-window':
                group = FurnitureFactory3D.createTallWindow(dims, colour); break;
            case 'small-window':
                group = FurnitureFactory3D.createSmallWindow(dims, colour); break;
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
        // Seat and backrest use fabric; legs use darker wood
        const mainMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.6), 'WOOD'
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
    //  1b. DESK CHAIR — tall ergonomic office chair
    // ─────────────────────────────────────────────

    /**
     * Build a tall desk/office chair from composed primitives.
     * Taller than the dining chair — designed to pair with desks and tables.
     *
     * Components:
     * - SEAT: wide cushion at ~45% height
     * - BACKREST: tall ergonomic panel with lumbar curve
     * - PEDESTAL: central cylinder column
     * - BASE STAR: 5 radial arms on floor level
     * - WHEELS: small spheres at arm tips
     * - ARMRESTS: horizontal bars on sides
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group}
     */
    static createDeskChair(dims, colour) {
        const group = new THREE.Group();

        const meshMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const frameMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.5), 'METAL'
        );
        const metalMat = FurnitureFactory3D._createMaterial('#555555', 'METAL');
        const wheelMat = FurnitureFactory3D._createMaterial('#222222', 'PLASTIC_MATTE');

        const seatHeight = dims.height * 0.42;
        const seatThickness = 0.06;

        // Seat cushion — wider and deeper than dining chair
        const seatGeo = new THREE.BoxGeometry(dims.width * 0.85, seatThickness, dims.depth * 0.8);
        const seat = new THREE.Mesh(seatGeo, meshMat);
        seat.position.y = seatHeight;
        FurnitureFactory3D._enableShadows(seat);
        group.add(seat);

        // Tall backrest — ergonomic shape (slightly curved via two overlapping panels)
        const backH = dims.height * 0.48;
        const backW = dims.width * 0.78;
        const backGeo = new THREE.BoxGeometry(backW, backH, 0.04);
        const backrest = new THREE.Mesh(backGeo, meshMat);
        backrest.position.set(0, seatHeight + backH / 2 + 0.02, -(dims.depth * 0.35));
        backrest.rotation.x = -0.06; // slight recline
        FurnitureFactory3D._enableShadows(backrest);
        group.add(backrest);

        // Lumbar support bump
        const lumbarGeo = new THREE.CylinderGeometry(backW * 0.35, backW * 0.35, 0.03, 12);
        lumbarGeo.rotateZ(Math.PI / 2);
        const lumbar = new THREE.Mesh(lumbarGeo, meshMat);
        lumbar.position.set(0, seatHeight + backH * 0.3, -(dims.depth * 0.33));
        FurnitureFactory3D._enableShadows(lumbar);
        group.add(lumbar);

        // 2 Armrests — horizontal bars with pads
        const armY = seatHeight + 0.12;
        const armLen = dims.depth * 0.55;
        const armGeo = new THREE.CylinderGeometry(0.012, 0.012, armLen, 8);
        armGeo.rotateX(Math.PI / 2);
        const armPadGeo = new THREE.BoxGeometry(0.06, 0.02, armLen * 0.6);

        const armXOffset = dims.width * 0.42;
        [[-armXOffset, armXOffset]].forEach(() => {
            [-1, 1].forEach(side => {
                const ax = side * armXOffset;
                // Arm support post (vertical)
                const postGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8);
                const post = new THREE.Mesh(postGeo, frameMat);
                post.position.set(ax, armY - 0.07, -dims.depth * 0.05);
                FurnitureFactory3D._enableShadows(post);
                group.add(post);

                // Arm bar (horizontal)
                const arm = new THREE.Mesh(armGeo, frameMat);
                arm.position.set(ax, armY, -dims.depth * 0.05);
                FurnitureFactory3D._enableShadows(arm);
                group.add(arm);

                // Arm pad (soft top)
                const pad = new THREE.Mesh(armPadGeo, meshMat);
                pad.position.set(ax, armY + 0.015, -dims.depth * 0.05);
                FurnitureFactory3D._enableShadows(pad);
                group.add(pad);
            });
        });

        // Central pedestal column
        const pedestalH = seatHeight - 0.04;
        const pedestalGeo = new THREE.CylinderGeometry(0.03, 0.035, pedestalH, 12);
        const pedestal = new THREE.Mesh(pedestalGeo, metalMat);
        pedestal.position.y = pedestalH / 2 + 0.04;
        FurnitureFactory3D._enableShadows(pedestal);
        group.add(pedestal);

        // 5-star base arms
        const baseRadius = dims.width * 0.42;
        const armBaseGeo = new THREE.BoxGeometry(baseRadius, 0.025, 0.035);
        for (let a = 0; a < 5; a++) {
            const angle = (a / 5) * Math.PI * 2 - Math.PI / 2;
            const armBase = new THREE.Mesh(armBaseGeo, metalMat);
            armBase.position.set(
                Math.cos(angle) * baseRadius / 2,
                0.025,
                Math.sin(angle) * baseRadius / 2
            );
            armBase.rotation.y = -angle;
            FurnitureFactory3D._enableShadows(armBase);
            group.add(armBase);

            // Wheel at arm tip
            const wheelGeo = new THREE.SphereGeometry(0.02, 8, 8);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(
                Math.cos(angle) * baseRadius,
                0.02,
                Math.sin(angle) * baseRadius
            );
            FurnitureFactory3D._enableShadows(wheel);
            group.add(wheel);
        }

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
        const apronHeight = 0.06;
        const apronThick  = 0.025;

        // Tabletop — wider box with bevelled profile (higher segment count)
        const topGeo = new THREE.BoxGeometry(dims.width, topThickness, dims.depth, 2, 1, 2);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(top);
        group.add(top);

        // Under-tabletop apron rails (front, back, left, right)
        const apronMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.88), 'WOOD'
        );
        const apronY = dims.height - topThickness - apronHeight / 2;
        const halfW = dims.width / 2 - 0.1;
        const halfD = dims.depth / 2 - 0.1;

        // Front & back apron
        const fbGeo = new THREE.BoxGeometry(dims.width - 0.18, apronHeight, apronThick);
        for (const zSign of [-1, 1]) {
            const apron = new THREE.Mesh(fbGeo, apronMat);
            apron.position.set(0, apronY, zSign * halfD);
            FurnitureFactory3D._enableShadows(apron);
            group.add(apron);
        }
        // Left & right apron
        const lrGeo = new THREE.BoxGeometry(apronThick, apronHeight, dims.depth - 0.18);
        for (const xSign of [-1, 1]) {
            const apron = new THREE.Mesh(lrGeo, apronMat);
            apron.position.set(xSign * halfW, apronY, 0);
            FurnitureFactory3D._enableShadows(apron);
            group.add(apron);
        }

        // 4 legs — tapered cylinders at inset corners
        const legTopR = 0.035;
        const legBotR = 0.025;
        const legHeight = dims.height - topThickness - apronHeight;
        const legGeo = new THREE.CylinderGeometry(legTopR, legBotR, legHeight, 12);
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );
        const inset = 0.09;
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

            // Foot cap — small sphere at base for realism
            const footGeo = new THREE.SphereGeometry(legBotR * 1.3, 8, 6);
            const foot = new THREE.Mesh(footGeo, legMat);
            foot.position.set(pos.x, legBotR * 0.3, pos.z);
            FurnitureFactory3D._enableShadows(foot);
            group.add(foot);
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
            FurnitureFactory3D._lightenColour(colour, 1.12), 'FABRIC'
        );
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.5), 'WOOD'
        );

        const footH = 0.06;
        const seatBase = dims.height * 0.38;
        const armW = 0.14;

        // Seat base - slightly raised on legs
        const seatGeo = new THREE.BoxGeometry(dims.width, seatBase, dims.depth * 0.85);
        const seat = new THREE.Mesh(seatGeo, cushionMat);
        seat.position.y = footH + seatBase / 2;
        FurnitureFactory3D._enableShadows(seat);
        group.add(seat);

        // Individual seat cushions (2-3 depending on sofa width)
        const cushionCount = dims.width > 1.5 ? 3 : 2;
        const cushionW = (dims.width - armW * 2 - 0.06) / cushionCount;
        const cushionH = 0.08;
        const cushionD = dims.depth * 0.6;
        for (let ci = 0; ci < cushionCount; ci++) {
            const cx = -dims.width / 2 + armW + 0.03 + cushionW * (ci + 0.5);
            const cushGeo = new THREE.BoxGeometry(cushionW - 0.02, cushionH, cushionD);
            const cush = new THREE.Mesh(cushGeo, cushionMat);
            cush.position.set(cx, footH + seatBase + cushionH / 2, dims.depth * 0.05);
            FurnitureFactory3D._enableShadows(cush);
            group.add(cush);
        }

        // Back cushion (one piece, taller)
        const backGeo = new THREE.BoxGeometry(
            dims.width - armW * 2 + 0.02,
            dims.height * 0.52,
            dims.depth * 0.22
        );
        const back = new THREE.Mesh(backGeo, baseMat);
        back.position.set(0, footH + dims.height * 0.45, -(dims.depth / 2 - dims.depth * 0.12));
        FurnitureFactory3D._enableShadows(back);
        group.add(back);

        // Left armrest — rounded top using cylinder cap
        const armGeo = new THREE.BoxGeometry(armW, dims.height * 0.42, dims.depth * 0.85);
        const leftArm = new THREE.Mesh(armGeo, baseMat);
        leftArm.position.set(-(dims.width / 2 - armW / 2), footH + dims.height * 0.32, 0);
        FurnitureFactory3D._enableShadows(leftArm);
        group.add(leftArm);

        // Arm top roll (cylinder for rounded look)
        const armRollGeo = new THREE.CylinderGeometry(armW / 2, armW / 2, dims.depth * 0.85, 8);
        armRollGeo.rotateX(Math.PI / 2);
        const leftArmRoll = new THREE.Mesh(armRollGeo, baseMat);
        leftArmRoll.position.set(-(dims.width / 2 - armW / 2), footH + dims.height * 0.53, 0);
        FurnitureFactory3D._enableShadows(leftArmRoll);
        group.add(leftArmRoll);

        // Right armrest
        const rightArm = new THREE.Mesh(armGeo, baseMat);
        rightArm.position.set(dims.width / 2 - armW / 2, footH + dims.height * 0.32, 0);
        FurnitureFactory3D._enableShadows(rightArm);
        group.add(rightArm);

        const rightArmRoll = new THREE.Mesh(armRollGeo, baseMat);
        rightArmRoll.position.set(dims.width / 2 - armW / 2, footH + dims.height * 0.53, 0);
        FurnitureFactory3D._enableShadows(rightArmRoll);
        group.add(rightArmRoll);

        // 4 wooden feet — tapered cylinders
        const footGeo = new THREE.CylinderGeometry(0.025, 0.03, footH, 8);
        const footOffsetX = dims.width / 2 - 0.08;
        const footOffsetZ = dims.depth * 0.85 / 2 - 0.08;
        [[-footOffsetX, -footOffsetZ], [footOffsetX, -footOffsetZ],
         [-footOffsetX, footOffsetZ], [footOffsetX, footOffsetZ]].forEach(([fx, fz]) => {
            const foot = new THREE.Mesh(footGeo, legMat);
            foot.position.set(fx, footH / 2, fz);
            FurnitureFactory3D._enableShadows(foot);
            group.add(foot);
        });

        // Throw pillows (2 smaller cushions, slightly tilted)
        const pillowMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.25), 'FABRIC'
        );
        const pillowGeo = new THREE.BoxGeometry(
            dims.width * 0.16, dims.height * 0.16, dims.depth * 0.16
        );
        const pillowY = footH + seatBase + cushionH + dims.height * 0.1;
        const pillowZ = -(dims.depth * 0.22);

        const leftPillow = new THREE.Mesh(pillowGeo, pillowMat);
        leftPillow.position.set(-(dims.width * 0.28), pillowY, pillowZ);
        leftPillow.rotation.set(0.1, 0.15, 0.05);
        FurnitureFactory3D._enableShadows(leftPillow);
        group.add(leftPillow);

        const rightPillow = new THREE.Mesh(pillowGeo, pillowMat);
        rightPillow.position.set(dims.width * 0.28, pillowY, pillowZ);
        rightPillow.rotation.set(0.08, -0.2, -0.05);
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
    //  5b. CHAISE LOUNGE — curved seat + single raised end + tapered legs
    // ─────────────────────────────────────────────

    /**
     * Build a chaise lounge from composed primitives.
     * Asymmetric seating — one raised end, one low arm, elongated seat.
     *
     * Components:
     * - SEAT BASE: long shallow box
     * - RAISED END: tall angled panel at one short end
     * - LOW ARM: short panel at the opposite end
     * - SEAT CUSHION: inset fabric slab
     * - BACK BOLSTER: cylindrical roll cushion at the raised end
     * - LEGS (×4): tapered cylinders
     *
     * @param {Object} dims - { width, depth, height } in meters
     * @param {string} colour - Hex colour string
     * @returns {THREE.Group}
     */
    static createChaise(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.7), 'WOOD'
        );
        const fabricMat = FurnitureFactory3D._createMaterial(colour, 'FABRIC');
        const cushionMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.12), 'FABRIC'
        );
        const legMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );

        const legH = 0.1;
        const baseH = height * 0.3;
        const cushionH = height * 0.18;

        // Seat base frame
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(width, baseH, depth), frameMat
        );
        base.position.y = legH + baseH / 2;
        FurnitureFactory3D._enableShadows(base);
        group.add(base);

        // Seat cushion (inset on top of base)
        const cushion = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.06, cushionH, depth - 0.08, 2, 2, 2), cushionMat
        );
        cushion.position.y = legH + baseH + cushionH / 2;
        FurnitureFactory3D._enableShadows(cushion);
        group.add(cushion);

        // Raised end (left) — tall angled back with slight recline
        const raisedH = height * 0.7;
        const raised = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, raisedH, depth - 0.04), fabricMat
        );
        raised.position.set(-(width / 2 - 0.05), legH + raisedH / 2, 0);
        raised.rotation.z = 0.12;
        FurnitureFactory3D._enableShadows(raised);
        group.add(raised);

        // Low arm (right) — short panel
        const lowArmH = height * 0.3;
        const lowArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, lowArmH, depth - 0.04), fabricMat
        );
        lowArm.position.set(width / 2 - 0.04, legH + lowArmH / 2, 0);
        FurnitureFactory3D._enableShadows(lowArm);
        group.add(lowArm);

        // Back rest along the depth (behind the seat)
        const backH = height * 0.45;
        const backRest = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.14, backH, 0.08), fabricMat
        );
        backRest.position.set(0, legH + backH / 2, -(depth / 2 - 0.04));
        FurnitureFactory3D._enableShadows(backRest);
        group.add(backRest);

        // Bolster roll cushion at the raised end
        const bolsterRadius = height * 0.1;
        const bolsterLen = depth * 0.6;
        const bolsterGeo = new THREE.CylinderGeometry(
            bolsterRadius, bolsterRadius, bolsterLen, 12
        );
        bolsterGeo.rotateX(Math.PI / 2);
        const bolster = new THREE.Mesh(bolsterGeo, cushionMat);
        bolster.position.set(
            -(width / 2 - 0.18),
            legH + baseH + cushionH + bolsterRadius * 0.6,
            0
        );
        FurnitureFactory3D._enableShadows(bolster);
        group.add(bolster);

        // 4 tapered legs
        const legGeo = new THREE.CylinderGeometry(0.018, 0.025, legH, 8);
        const legXIn = width / 2 - 0.08;
        const legZIn = depth / 2 - 0.08;
        [[-legXIn, -legZIn], [legXIn, -legZIn],
         [-legXIn, legZIn], [legXIn, legZIn]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, legH / 2, lz);
            FurnitureFactory3D._enableShadows(leg);
            group.add(leg);
        });

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

        const topThickness = 0.035;

        // Main wood frame top
        const frameW = dims.width;
        const frameD = dims.depth;
        const frameGeo = new THREE.BoxGeometry(frameW, topThickness, frameD);
        const frame = new THREE.Mesh(frameGeo, mat);
        frame.position.y = dims.height - topThickness / 2;
        FurnitureFactory3D._enableShadows(frame);
        group.add(frame);

        // Tempered glass inset on top (slightly recessed)
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xd8ece8,
            roughness: 0.02,
            metalness: 0.0,
            transparent: true,
            opacity: 0.25,
            envMapIntensity: 1.5
        });
        const glassGeo = new THREE.BoxGeometry(frameW - 0.08, 0.008, frameD - 0.08);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = dims.height + 0.002;
        FurnitureFactory3D._enableShadows(glass);
        group.add(glass);

        // 4 tapered legs
        const legTopR = 0.025;
        const legBotR = 0.02;
        const legHeight = dims.height - topThickness;
        const legGeo = new THREE.CylinderGeometry(legTopR, legBotR, legHeight, 10);
        const legOffsetX = dims.width / 2 - 0.05;
        const legOffsetZ = dims.depth / 2 - 0.05;
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
        const drawerW = dims.width * 0.3;
        const drawerH = dims.height * 0.3;
        const drawerD = dims.depth * 0.8;
        const drawerGeo = new THREE.BoxGeometry(drawerW, drawerH, drawerD);
        const drawer = new THREE.Mesh(drawerGeo, accentMat);
        const drawerX = dims.width * 0.25;
        const drawerY = dims.height * 0.55;
        drawer.position.set(drawerX, drawerY, 0);
        FurnitureFactory3D._enableShadows(drawer);
        group.add(drawer);

        // Drawer handle grooves (3 drawers)
        const handleMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._getMetalColour(colour), 'METAL'
        );
        const handleW = drawerW * 0.45;
        const drawerFrontZ = drawerD / 2 + 0.007;
        for (let di = 0; di < 3; di++) {
            const hGeo = new THREE.CylinderGeometry(0.006, 0.006, handleW, 6);
            const handle = new THREE.Mesh(hGeo, handleMat);
            handle.rotation.z = Math.PI / 2;
            const hy = drawerY - drawerH / 2 + drawerH * (0.2 + di * 0.3);
            handle.position.set(drawerX, hy, drawerFrontZ);
            FurnitureFactory3D._enableShadows(handle);
            group.add(handle);
        }

        // Cable management grommet on desktop (small cylinder)
        const grommetGeo = new THREE.CylinderGeometry(0.025, 0.025, topThickness + 0.002, 16);
        const grommetMat = FurnitureFactory3D._createMaterial('#333333', 'PLASTIC_MATTE');
        const grommet = new THREE.Mesh(grommetGeo, grommetMat);
        grommet.position.set(dims.width * 0.25, dims.height - topThickness / 2, -dims.depth * 0.3);
        FurnitureFactory3D._enableShadows(grommet);
        group.add(grommet);

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
        WOOD:          { roughness: 0.38, metalness: 0.02, envMapIntensity: 0.8  },
        WOOD_MATTE:    { roughness: 0.75, metalness: 0.02, envMapIntensity: 0.4  },
        FABRIC:        { roughness: 0.92, metalness: 0.0,  envMapIntensity: 0.15 },
        METAL:         { roughness: 0.15, metalness: 0.92, envMapIntensity: 1.4  },
        LEATHER:       { roughness: 0.55, metalness: 0.0,  envMapIntensity: 0.6  },
        PLASTIC_MATTE: { roughness: 0.5,  metalness: 0.0,  envMapIntensity: 0.4  }
    };

    /**
     * Create a MeshStandardMaterial using a named PBR profile (legacy API) OR
     * using the new type-keyed API for commercial-quality surfaces.
     *
     * TWO calling conventions are supported so existing code is unaffected:
     *
     *   Legacy:  _createMaterial('#8B4513', 'WOOD')
     *            first arg = hex colour, second = UPPERCASE profile key
     *
     *   New:     _createMaterial('wood', '#8B4513', { repeatX: 2, repeatY: 2 })
     *            first arg = lowercase material type word, second = hex colour
     *
     * The dispatcher detects which convention is used by checking whether the
     * first argument looks like a hex colour (starts with '#' or is 3/6 hex
     * digits) — if so, legacy; otherwise new type-keyed path.
     *
     * @param {string} firstArg  - Hex colour (legacy) OR lowercase type (new)
     * @param {string} secondArg - UPPERCASE profile (legacy) OR hex colour (new)
     * @param {Object} [options] - Only used with new API: { repeatX, repeatY }
     * @returns {THREE.MeshStandardMaterial} Material instance
     */
    static _createMaterial(firstArg, secondArg, options = {}) {
        // ── Detect calling convention ──────────────────────────────────────
        // Legacy: firstArg is a colour string (starts with '#', or bare hex)
        const isLegacyCall = (typeof firstArg === 'string') &&
            (/^#?[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/.test(firstArg) || firstArg.startsWith('#'));

        if (isLegacyCall) {
            // ── Legacy path: (baseColour, profile) ────────────────────────
            const baseColour = firstArg;
            const profile    = (typeof secondArg === 'string') ? secondArg : 'PLASTIC_MATTE';
            const p = FurnitureFactory3D.MATERIAL_PROFILES[profile]
                || FurnitureFactory3D.MATERIAL_PROFILES.PLASTIC_MATTE;

            const matOpts = {
                color:           baseColour,
                roughness:       p.roughness,
                metalness:       p.metalness,
                envMapIntensity: p.envMapIntensity || 0.4
            };

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
                if (textures.normalMap) {
                    matOpts.normalMap = textures.normalMap;
                    matOpts.normalScale = new THREE.Vector2(0.6, 0.6);
                }
            }

            return new THREE.MeshStandardMaterial(matOpts);
        }

        // ── New type-keyed path: (materialType, colour, options) ──────────
        const materialType = firstArg;
        const colour       = secondArg;
        const hex = (typeof colour === 'string')
            ? (colour.startsWith('#') ? colour : `#${colour}`)
            : `#${colour.toString(16).padStart(6, '0')}`;
        const threeColour = new THREE.Color(hex);

        switch (materialType) {
            case 'wood': {
                // Procedural wood grain colour + roughness + normal maps
                const textures = FurnitureFactory3D._createWoodTexture(hex);
                const tex = textures.map;
                if (options.repeatX || options.repeatY) {
                    tex.repeat.set(options.repeatX || 2, options.repeatY || 2);
                }
                const matParams = {
                    map:             tex,
                    roughnessMap:    textures.roughnessMap,
                    color:           threeColour,
                    roughness:       0.45,
                    metalness:       0.02,
                    envMapIntensity: 0.6
                };
                if (textures.normalMap) {
                    matParams.normalMap = textures.normalMap;
                    matParams.normalScale = new THREE.Vector2(0.6, 0.6);
                }
                return new THREE.MeshStandardMaterial(matParams);
            }
            case 'fabric': {
                const textures = FurnitureFactory3D._createFabricTexture(hex);
                const tex = textures.map;
                if (options.repeatX || options.repeatY) {
                    tex.repeat.set(options.repeatX || 4, options.repeatY || 4);
                }
                const matParams = {
                    map:             tex,
                    roughnessMap:    textures.roughnessMap,
                    color:           threeColour,
                    roughness:       0.85,
                    metalness:       0,
                    envMapIntensity: 0.2
                };
                if (textures.normalMap) {
                    matParams.normalMap = textures.normalMap;
                    matParams.normalScale = new THREE.Vector2(0.4, 0.4);
                }
                return new THREE.MeshStandardMaterial(matParams);
            }
            case 'metal': {
                const textures = FurnitureFactory3D._createMetalTexture(hex);
                const matParams = {
                    map:             textures.map,
                    roughnessMap:    textures.roughnessMap,
                    color:           threeColour,
                    roughness:       0.2,
                    metalness:       0.9,
                    envMapIntensity: 1.2
                };
                if (textures.normalMap) {
                    matParams.normalMap = textures.normalMap;
                    matParams.normalScale = new THREE.Vector2(0.3, 0.3);
                }
                return new THREE.MeshStandardMaterial(matParams);
            }
            case 'glass':
                return new THREE.MeshStandardMaterial({
                    color:           threeColour,
                    roughness:       0.0,
                    metalness:       0.0,
                    transparent:     true,
                    opacity:         0.25,
                    envMapIntensity: 1.5
                });
            case 'leather': {
                const textures = FurnitureFactory3D._createLeatherTexture(hex);
                const matParams = {
                    map:             textures.map,
                    roughnessMap:    textures.roughnessMap,
                    color:           threeColour,
                    roughness:       0.7,
                    metalness:       0.0,
                    envMapIntensity: 0.5
                };
                if (textures.normalMap) {
                    matParams.normalMap = textures.normalMap;
                    matParams.normalScale = new THREE.Vector2(0.5, 0.5);
                }
                return new THREE.MeshStandardMaterial(matParams);
            }
            case 'marble':
                return new THREE.MeshStandardMaterial({
                    color:           threeColour,
                    roughness:       0.15,
                    metalness:       0.05,
                    envMapIntensity: 1.0
                });
            case 'plastic':
                return new THREE.MeshStandardMaterial({
                    color:           threeColour,
                    roughness:       0.5,
                    metalness:       0.0,
                    envMapIntensity: 0.4
                });
            default:
                return new THREE.MeshStandardMaterial({
                    color:     threeColour,
                    roughness: 0.6,
                    metalness: 0.0
                });
        }
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
        // Anisotropic filtering — improves sharpness at grazing angles.
        // Capped at 4 for budget GPU safety; no renderer reference needed as
        // most WebGL2 implementations expose at least 4x anisotropy.
        tex.anisotropy = 4;
        return tex;
    }

    /**
     * Generate a normal map from a greyscale height canvas using Sobel gradients.
     *
     * Each pixel's normal is computed from the height differences with its
     * neighbours. The result is an RGB normal map in tangent space
     * (R = X, G = Y, B = Z with neutral = (128,128,255)).
     *
     * @param {HTMLCanvasElement} heightCanvas - Greyscale canvas (one channel used)
     * @param {number} [strength=1.5] - Bump strength multiplier
     * @param {number} [repeatX=1]
     * @param {number} [repeatY=1]
     * @returns {THREE.CanvasTexture} Tangent-space normal map
     * @private
     */
    static _generateNormalMap(heightCanvas, strength = 1.5, repeatX = 1, repeatY = 1) {
        const w = heightCanvas.width;
        const h = heightCanvas.height;
        const srcCtx = heightCanvas.getContext('2d');
        const srcData = srcCtx.getImageData(0, 0, w, h).data;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = w;
        outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d');
        const outImg = outCtx.createImageData(w, h);
        const out = outImg.data;

        // Read height at (x,y) from red channel (wrapping edges)
        const H = (x, y) => srcData[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Sobel-like gradient
                const dX = (H(x - 1, y) - H(x + 1, y)) * strength;
                const dY = (H(x, y - 1) - H(x, y + 1)) * strength;

                // Normalise
                const len = Math.sqrt(dX * dX + dY * dY + 1);
                const nx = (dX / len) * 0.5 + 0.5;
                const ny = (dY / len) * 0.5 + 0.5;
                const nz = (1  / len) * 0.5 + 0.5;

                const i = (y * w + x) * 4;
                out[i]     = Math.round(nx * 255);
                out[i + 1] = Math.round(ny * 255);
                out[i + 2] = Math.round(nz * 255);
                out[i + 3] = 255;
            }
        }

        outCtx.putImageData(outImg, 0, 0);
        return FurnitureFactory3D._finishTexture(outCanvas, repeatX, repeatY);
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
        const SIZE = 512;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        const intensity = lum < 0.35 ? 2.5 : (lum < 0.55 ? 1.6 : 1.0);

        // Simple seeded pseudo-random for deterministic results
        const _seed = (rgb.r * 256 + rgb.g) * 256 + rgb.b;
        const _rand = (n) => {
            const x = Math.sin(n * 127.1 + _seed * 0.0137) * 43758.5453123;
            return x - Math.floor(x);
        };

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

        const cData = cCtx.createImageData(SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.createImageData(SIZE, SIZE);
        const rd = rData.data;

        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const i = (y * SIZE + x) * 4;

                // Multi-frequency grain lines (horizontal)
                const grain1 = Math.sin(y * 0.08) * 12 * intensity;
                const grain2 = Math.sin(y * 0.25 + x * 0.01) * 5 * intensity;
                const grain3 = Math.sin(y * 0.6 + x * 0.005) * 2 * intensity;

                // Growth ring arcs — curved, not straight
                const ringPhase = y * 0.04 + Math.sin(x * 0.015) * 6;
                const ringBand = Math.sin(ringPhase) * 10 * intensity;

                // Per-pixel micro noise for pore-like detail
                const micro = (_rand(i * 0.001) - 0.5) * 8 * intensity;

                // Occasional dark streaks (medullary rays)
                const streak = (Math.abs(((x * 37 + y * 7) % 97) - 48) < 2) ? -12 * intensity : 0;

                const total = grain1 + grain2 + grain3 + ringBand + micro + streak;

                // Warm wood tint: red channel leads, blue channel trails
                cd[i]     = Math.max(0, Math.min(255, rgb.r + total * 1.3));
                cd[i + 1] = Math.max(0, Math.min(255, rgb.g + total * 0.9));
                cd[i + 2] = Math.max(0, Math.min(255, rgb.b + total * 0.45));
                cd[i + 3] = 255;

                // Roughness: grain grooves are rougher, smooth between
                const rv = Math.max(60, Math.min(220, 140 + total * 0.7 + micro * 0.5));
                rd[i] = rd[i + 1] = rd[i + 2] = Math.round(rv);
                rd[i + 3] = 255;
            }
        }

        // Paint multiple wavy knot-lines for realism
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        cCtx.lineWidth = 0.8;
        rCtx.lineWidth = 0.8;
        for (let y = 8; y < SIZE; y += 12 + (y % 11)) {
            const alpha = 0.06 + _rand(y) * 0.04;
            cCtx.strokeStyle = `rgba(0,0,0,${alpha * intensity})`;
            rCtx.strokeStyle = `rgba(255,255,255,${0.08 + _rand(y + 1) * 0.08})`;

            cCtx.beginPath();
            cCtx.moveTo(0, y);
            rCtx.beginPath();
            rCtx.moveTo(0, y);

            for (let x = 0; x <= SIZE; x += SIZE / 6) {
                const yOff = y + (_rand(y * 0.3 + x * 0.7) - 0.5) * 5;
                cCtx.lineTo(x, yOff);
                rCtx.lineTo(x, yOff);
            }
            cCtx.stroke();
            rCtx.stroke();
        }

        // Faint wood knot ellipses (1-2 per texture)
        const knotCount = 1 + Math.floor(_rand(42) * 2);
        for (let k = 0; k < knotCount; k++) {
            const kx = SIZE * 0.2 + _rand(k * 13 + 7) * SIZE * 0.6;
            const ky = SIZE * 0.15 + _rand(k * 17 + 3) * SIZE * 0.7;
            const kr = 8 + _rand(k * 23) * 14;
            const gradient = cCtx.createRadialGradient(kx, ky, 0, kx, ky, kr);
            gradient.addColorStop(0, `rgba(${Math.max(0, rgb.r - 50)},${Math.max(0, rgb.g - 50)},${Math.max(0, rgb.b - 40)},0.5)`);
            gradient.addColorStop(0.6, `rgba(${Math.max(0, rgb.r - 25)},${Math.max(0, rgb.g - 25)},${Math.max(0, rgb.b - 20)},0.25)`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            cCtx.fillStyle = gradient;
            cCtx.beginPath();
            cCtx.ellipse(kx, ky, kr, kr * 0.5, 0, 0, Math.PI * 2);
            cCtx.fill();
        }

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas),
            normalMap: FurnitureFactory3D._generateNormalMap(rCanvas, 2.0)
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
        const SIZE = 512;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        const contrast = lum < 0.3 ? 14 : (lum < 0.5 ? 9 : 6);

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
        rCtx.fillStyle = '#e8e8e8';
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const px = (i / 4) % SIZE;
            const py = Math.floor((i / 4) / SIZE);

            // Twill weave pattern — diagonal 3×3 repeat
            const twillPhase = ((px + py) >> 1) % 3;
            const warpWeft = twillPhase === 0 ? contrast : (twillPhase === 1 ? -contrast * 0.5 : contrast * 0.3);

            // Thread-level micro texture (fine horizontal + vertical lines)
            const threadH = (py % 2 === 0) ? 2 : -1.5;
            const threadV = (px % 2 === 0) ? 1.5 : -1;

            // Micro fuzz noise
            const fuzz = ((px * 13 + py * 7 + px * py) % 11 - 5) * 1.2;
            // Larger-scale fabric drape undulation
            const drape = Math.sin(px * 0.025) * Math.sin(py * 0.03) * 6;

            const total = warpWeft + threadH + threadV + fuzz + drape;

            cd[i]     = Math.max(0, Math.min(255, rgb.r + total));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + total));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + total));

            // Roughness — warp threads slightly rougher; drape areas vary
            const rv = twillPhase === 0 ? 238 : (twillPhase === 1 ? 218 : 228);
            rd[i] = rd[i + 1] = rd[i + 2] = Math.max(180, Math.min(255,
                rv + fuzz * 0.4 + drape * 0.3 + ((px * 7 + py * 3) % 5 - 2)
            ));
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas, 3, 3),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas, 3, 3),
            normalMap: FurnitureFactory3D._generateNormalMap(rCanvas, 1.2, 3, 3)
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
        const SIZE = 512;
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
        rCtx.fillStyle = '#404040';
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const py = Math.floor((i / 4) / SIZE);
            const px = (i / 4) % SIZE;

            // Directional brush strokes (horizontal dominant)
            const brushPrimary = ((py * 17 + 5) % 13 - 6) * 4.0;
            // Cross-hatch secondary (very subtle vertical)
            const brushSecondary = ((px * 11 + 3) % 9 - 4) * 1.2;
            // High-frequency micro sparkle
            const sparkle = ((px * 31 + py * 47) % 19 - 9) * 1.5;
            // Subtle anisotropic sheen — brighter towards center
            const sheen = Math.sin(py / SIZE * Math.PI) * 8;

            const total = brushPrimary + brushSecondary + sparkle + sheen;

            cd[i]     = Math.max(0, Math.min(255, rgb.r + total));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + total));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + total));

            // Roughness: stronger variation for visible brush marks
            const rv = Math.max(20, Math.min(100, 55 + brushPrimary * 0.6 + sparkle * 0.3));
            rd[i] = rd[i + 1] = rd[i + 2] = Math.round(rv);
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas),
            normalMap: FurnitureFactory3D._generateNormalMap(rCanvas, 1.0)
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
        const SIZE = 512;
        const rgb = FurnitureFactory3D._hexToRgb(baseColour);
        const lum = FurnitureFactory3D._luminance(rgb);
        const intensity = lum < 0.35 ? 2.2 : 1.0;

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
        rCtx.fillStyle = '#707070';
        rCtx.fillRect(0, 0, SIZE, SIZE);

        const cData = cCtx.getImageData(0, 0, SIZE, SIZE);
        const cd = cData.data;
        const rData = rCtx.getImageData(0, 0, SIZE, SIZE);
        const rd = rData.data;

        for (let i = 0; i < cd.length; i += 4) {
            const px = (i / 4) % SIZE;
            const py = Math.floor((i / 4) / SIZE);

            // Multi-scale pore pattern for realistic grain
            const hash1 = (px * 31 + py * 17) % 37;
            const hash2 = (px * 53 + py * 29 + 13) % 23;
            const hash3 = ((px >> 2) * 7 + (py >> 2) * 11) % 19;

            let noise = 0;
            let roughAdj = 0;

            // Fine pores (small, frequent)
            if (hash1 < 7) {
                noise = (-10 - hash1 * 1.8) * intensity;
                roughAdj = 30;
            } else if (hash1 > 31) {
                noise = 7 * intensity;
                roughAdj = -18;
            }

            // Medium grain (larger cell pattern like real leather)
            const cellNoise = Math.sin(px * 0.12) * Math.sin(py * 0.1) * 6 * intensity;
            noise += cellNoise;

            // Coarse grain undulation
            if (hash2 < 4) {
                noise += (-6 - hash2 * 1.2) * intensity;
                roughAdj += 15;
            } else if (hash2 > 19) {
                noise += 4 * intensity;
                roughAdj -= 8;
            }

            // Subtle crease lines (horizontal + diagonal)
            const crease = (py % 24 < 1 || (px + py) % 32 < 1) ? -8 * intensity : 0;
            noise += crease;
            if (crease !== 0) roughAdj += 20;

            // Large-scale colour variation (hide zones)
            const zoneVar = Math.sin(px * 0.01 + py * 0.008) * 5 * intensity;
            noise += zoneVar;

            // Subtle warm shift for realism
            cd[i]     = Math.max(0, Math.min(255, rgb.r + noise * 1.05));
            cd[i + 1] = Math.max(0, Math.min(255, rgb.g + noise * 0.95));
            cd[i + 2] = Math.max(0, Math.min(255, rgb.b + noise * 0.85));

            // Rough pores, smooth highlights
            rd[i] = rd[i + 1] = rd[i + 2] = Math.max(50, Math.min(210,
                112 + roughAdj + hash3 * 0.8
            ));
        }
        cCtx.putImageData(cData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        return {
            map: FurnitureFactory3D._finishTexture(cCanvas, 2, 2),
            roughnessMap: FurnitureFactory3D._finishTexture(rCanvas, 2, 2),
            normalMap: FurnitureFactory3D._generateNormalMap(rCanvas, 1.8, 2, 2)
        };
    }

    /**
     * Create a rounded rectangle THREE.Shape for use with ExtrudeGeometry.
     *
     * @param {number} w - Total width
     * @param {number} h - Total height (depth in top-down sense)
     * @param {number} r - Corner radius
     * @returns {THREE.Shape}
     * @private
     */
    static _roundedRectShape(w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        const shape = new THREE.Shape();
        shape.moveTo(r, 0);
        shape.lineTo(w - r, 0);
        shape.absarc(w - r, r, r, -Math.PI / 2, 0, false);
        shape.lineTo(w, h - r);
        shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
        shape.lineTo(r, h);
        shape.absarc(r, h - r, r, Math.PI / 2, Math.PI, false);
        shape.lineTo(0, r);
        shape.absarc(r, r, r, Math.PI, Math.PI * 1.5, false);
        return shape;
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
     * - FRAME: base box with side rails (darker wood)
     * - MATTRESS: rounded-corner extruded shape (main colour)
     * - BEDSHEET/DUVET: rounded-corner extruded shape (lighter)
     * - HEADBOARD: tall panel at one short end
     * - FOOTBOARD: shorter panel at opposite end
     * - PILLOWS (×2): squished spheres near headboard (soft white)
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
        const pillowMat = FurnitureFactory3D._createMaterial('#F5F0EB', 'FABRIC');
        const duvetMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._lightenColour(colour, 1.1), 'FABRIC'
        );

        const frameH = height * 0.3;
        const mattressH = height * 0.25;
        const duvetH = height * 0.1;

        // ── Bed frame base ──
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width, frameH, depth), frameMat);
        frame.position.y = frameH / 2;
        FurnitureFactory3D._enableShadows(frame);
        group.add(frame);

        // ── Side rails ──
        const railH = 0.04;
        const railMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.65), 'WOOD'
        );
        for (const xSign of [-1, 1]) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, railH, depth - 0.1), railMat
            );
            rail.position.set(xSign * (width / 2 - 0.02), frameH + railH / 2, 0);
            FurnitureFactory3D._enableShadows(rail);
            group.add(rail);
        }

        // ── Mattress (rounded corners via ExtrudeGeometry) ──
        const mW = width - 0.08;
        const mD = depth - 0.14;
        const mR = Math.min(mW, mD) * 0.06;
        const mattressShape = FurnitureFactory3D._roundedRectShape(mW, mD, mR);
        const mattressGeo = new THREE.ExtrudeGeometry(mattressShape, {
            depth: mattressH, bevelEnabled: true,
            bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3
        });
        mattressGeo.rotateX(-Math.PI / 2);
        const mattress = new THREE.Mesh(mattressGeo, mattressMat);
        mattress.position.set(-mW / 2, frameH, mD / 2);
        FurnitureFactory3D._enableShadows(mattress);
        group.add(mattress);

        // ── Duvet / bedsheet (covers lower 2/3, rounded corners + bevel) ──
        const dW = mW - 0.02;
        const dD = depth * 0.58;
        const dR = Math.min(dW, dD) * 0.08;
        const duvetShape = FurnitureFactory3D._roundedRectShape(dW, dD, dR);
        const duvetGeo = new THREE.ExtrudeGeometry(duvetShape, {
            depth: duvetH, bevelEnabled: true,
            bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4
        });
        duvetGeo.rotateX(-Math.PI / 2);
        const duvet = new THREE.Mesh(duvetGeo, duvetMat);
        duvet.position.set(-dW / 2, frameH + mattressH, depth / 2 - 0.06);
        FurnitureFactory3D._enableShadows(duvet);
        group.add(duvet);

        // ── Headboard ──
        const headboardH = height * 0.75;
        const headboard = new THREE.Mesh(
            new THREE.BoxGeometry(width, headboardH, 0.08), frameMat
        );
        headboard.position.set(0, headboardH / 2, -depth / 2 + 0.04);
        FurnitureFactory3D._enableShadows(headboard);
        group.add(headboard);

        // ── Footboard ──
        const footH = height * 0.35;
        const footboard = new THREE.Mesh(
            new THREE.BoxGeometry(width, footH, 0.06), frameMat
        );
        footboard.position.set(0, footH / 2, depth / 2 - 0.03);
        FurnitureFactory3D._enableShadows(footboard);
        group.add(footboard);

        // ── Pillows (×2) — squished spheres for puffy look ──
        const pillowRX = width * 0.17;
        const pillowRY = 0.055;
        const pillowRZ = 0.14;
        const pillowY = frameH + mattressH + pillowRY + 0.005;
        const pillowZ = -depth / 2 + 0.36;
        const pillowGeo = new THREE.SphereGeometry(1, 16, 12);
        pillowGeo.scale(pillowRX, pillowRY, pillowRZ);

        for (const xOff of [-width * 0.2, width * 0.2]) {
            const pillow = new THREE.Mesh(pillowGeo, pillowMat);
            pillow.position.set(xOff, pillowY, pillowZ);
            pillow.rotation.y = xOff > 0 ? 0.05 : -0.05;
            FurnitureFactory3D._enableShadows(pillow);
            group.add(pillow);
        }

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

    // ── Plants ────────────────────────────────────────────────────────

    /**
     * Create a floor plant — tall fiddle-leaf fig in a ceramic pot.
     * Built from a tapered pot, soil disc, trunk, branches, and
     * individual leaf shapes (extruded teardrops) at natural angles.
     */
    static createFloorPlant(dims, colour) {
        const { width, height } = dims;
        const group = new THREE.Group();

        const leafColour = colour || '#2D5A27';
        const leafDark = FurnitureFactory3D._darkenColour(leafColour, 0.8);
        const potColour = '#8B7355';
        const soilColour = '#3E2723';
        const trunkColour = '#5D4037';

        const potR = width * 0.38;
        const potH = height * 0.2;
        const potMat = FurnitureFactory3D._createMaterial(potColour, 'WOOD');
        const soilMat = FurnitureFactory3D._createMaterial(soilColour, 'WOOD');
        const trunkMat = FurnitureFactory3D._createMaterial(trunkColour, 'WOOD');

        // Leaf material — double-sided so leaves appear from any angle
        const leafMat = new THREE.MeshStandardMaterial({
            color: leafColour,
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const leafMatDark = new THREE.MeshStandardMaterial({
            color: leafDark,
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        // Pot — tapered cylinder
        const potGeo = new THREE.CylinderGeometry(potR, potR * 0.75, potH, 16);
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = potH / 2;
        pot.castShadow = true; pot.receiveShadow = true;
        group.add(pot);

        // Pot rim
        const rimGeo = new THREE.CylinderGeometry(potR + 0.012, potR + 0.012, 0.02, 16);
        const rim = new THREE.Mesh(rimGeo, potMat);
        rim.position.y = potH;
        rim.castShadow = true; rim.receiveShadow = true;
        group.add(rim);

        // Soil disc
        const soilGeo = new THREE.CylinderGeometry(potR * 0.88, potR * 0.88, 0.02, 16);
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = potH - 0.01;
        soil.castShadow = false; soil.receiveShadow = true;
        group.add(soil);

        // Main trunk
        const trunkR = width * 0.04;
        const trunkH = height * 0.5;
        const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = potH + trunkH / 2;
        trunk.castShadow = true; trunk.receiveShadow = true;
        group.add(trunk);

        // Helper: create a single leaf shape (elongated pointed oval)
        const leafW = width * 0.18;
        const leafH = width * 0.28;
        const createLeafGeo = () => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.bezierCurveTo(leafW * 0.6, leafH * 0.25, leafW * 0.55, leafH * 0.7, 0, leafH);
            shape.bezierCurveTo(-leafW * 0.55, leafH * 0.7, -leafW * 0.6, leafH * 0.25, 0, 0);
            return new THREE.ExtrudeGeometry(shape, {
                depth: 0.005, bevelEnabled: true,
                bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1
            });
        };

        // Helper: create a thin branch cylinder
        const createBranch = (len) => {
            const geo = new THREE.CylinderGeometry(trunkR * 0.3, trunkR * 0.4, len, 6);
            const mesh = new THREE.Mesh(geo, trunkMat);
            mesh.castShadow = true; mesh.receiveShadow = true;
            return mesh;
        };

        const leafGeo = createLeafGeo();

        // Leaf stem midrib — thin line on each leaf
        const midribGeo = new THREE.CylinderGeometry(0.001, 0.001, leafH * 0.85, 4);

        // Place leaves at different heights and angles around the trunk
        const leafData = [
            // [heightFrac, yRotDeg, tiltDeg, branchLen, useDark]
            [0.55, 0,    25,  0.08, false],
            [0.55, 120,  30,  0.09, true],
            [0.55, 240,  20,  0.07, false],
            [0.65, 60,   15,  0.10, true],
            [0.65, 180,  28,  0.08, false],
            [0.65, 300,  22,  0.10, true],
            [0.75, 30,   10,  0.11, false],
            [0.75, 150,  18,  0.09, true],
            [0.75, 270,  12,  0.10, false],
            [0.83, 90,    5,  0.07, false],
            [0.83, 210,   8,  0.06, true],
            [0.83, 330,  10,  0.08, false],
            [0.90, 0,    -5,  0.04, true],
            [0.90, 140,   0,  0.05, false],
            [0.90, 260,   3,  0.04, true],
        ];

        for (const [hFrac, yDeg, tiltDeg, brLen, dark] of leafData) {
            const stemY = potH + trunkH * hFrac;
            const yRad = (yDeg * Math.PI) / 180;
            const tiltRad = (tiltDeg * Math.PI) / 180;

            // Small branch
            const branch = createBranch(brLen);
            branch.position.set(0, stemY, 0);
            branch.rotation.set(0, 0, -Math.PI / 2 + tiltRad);
            branch.rotation.y = yRad;
            // Translate outward along branch direction
            const bx = Math.sin(yRad) * brLen * 0.5;
            const bz = Math.cos(yRad) * brLen * 0.5;
            branch.position.set(bx, stemY, bz);
            group.add(branch);

            // Leaf at end of branch
            const leaf = new THREE.Mesh(leafGeo, dark ? leafMatDark : leafMat);
            const lx = Math.sin(yRad) * (brLen + 0.01);
            const lz = Math.cos(yRad) * (brLen + 0.01);
            leaf.position.set(lx, stemY - leafH * 0.1, lz);
            leaf.rotation.set(-tiltRad, yRad, 0);
            leaf.castShadow = true; leaf.receiveShadow = true;
            group.add(leaf);

            // Midrib on leaf
            const midrib = new THREE.Mesh(midribGeo, trunkMat);
            midrib.position.copy(leaf.position);
            midrib.position.y += leafH * 0.4;
            midrib.rotation.copy(leaf.rotation);
            group.add(midrib);
        }

        return group;
    }

    /**
     * Create a table plant — compact succulent in a small ceramic pot.
     * Uses extruded petal shapes arranged in rosette spirals.
     */
    static createTablePlant(dims, colour) {
        const { width, height } = dims;
        const group = new THREE.Group();

        const leafColour = colour || '#3A7D44';
        const leafTip = FurnitureFactory3D._lightenColour(leafColour, 1.25);
        const potColour = '#E8DED0';
        const soilColour = '#3E2723';

        const potR = width * 0.38;
        const potH = height * 0.35;
        const potMat = FurnitureFactory3D._createMaterial(potColour, 'PLASTER');
        const soilMat = FurnitureFactory3D._createMaterial(soilColour, 'WOOD');

        const leafMat = new THREE.MeshStandardMaterial({
            color: leafColour,
            roughness: 0.7,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const leafMatTip = new THREE.MeshStandardMaterial({
            color: leafTip,
            roughness: 0.7,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        // Squat pot
        const potGeo = new THREE.CylinderGeometry(potR, potR * 0.85, potH, 16);
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = potH / 2;
        pot.castShadow = true; pot.receiveShadow = true;
        group.add(pot);

        // Soil
        const soilGeo = new THREE.CylinderGeometry(potR * 0.85, potR * 0.85, 0.015, 16);
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = potH - 0.008;
        soil.castShadow = false; soil.receiveShadow = true;
        group.add(soil);

        // Succulent leaf shape — chubby pointed petal
        const petalW = width * 0.1;
        const petalH = width * 0.16;
        const createPetalGeo = (pw, ph) => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.bezierCurveTo(pw * 0.7, ph * 0.2, pw * 0.5, ph * 0.8, 0, ph);
            shape.bezierCurveTo(-pw * 0.5, ph * 0.8, -pw * 0.7, ph * 0.2, 0, 0);
            return new THREE.ExtrudeGeometry(shape, {
                depth: pw * 0.5,
                bevelEnabled: true,
                bevelThickness: pw * 0.15,
                bevelSize: pw * 0.12,
                bevelSegments: 2
            });
        };

        const smallPetal = createPetalGeo(petalW, petalH);
        const medPetal = createPetalGeo(petalW * 1.3, petalH * 1.2);
        const lgPetal = createPetalGeo(petalW * 1.5, petalH * 1.4);

        // Rosette center — tiny sphere
        const centerGeo = new THREE.SphereGeometry(width * 0.04, 8, 8);
        const center = new THREE.Mesh(centerGeo, leafMatTip);
        center.position.y = potH + height * 0.12;
        center.castShadow = true; center.receiveShadow = true;
        group.add(center);

        const rosetteCenterY = potH + height * 0.05;

        // Inner ring — 5 small petals, steep angle
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petal = new THREE.Mesh(smallPetal, leafMatTip);
            const dist = width * 0.04;
            petal.position.set(
                Math.sin(angle) * dist,
                rosetteCenterY + 0.02,
                Math.cos(angle) * dist
            );
            petal.rotation.set(-0.4, angle, 0);
            petal.castShadow = true; petal.receiveShadow = true;
            group.add(petal);
        }

        // Middle ring — 7 medium petals, moderate outward lean
        for (let i = 0; i < 7; i++) {
            const angle = (i / 7) * Math.PI * 2 + 0.3;
            const petal = new THREE.Mesh(medPetal, leafMat);
            const dist = width * 0.1;
            petal.position.set(
                Math.sin(angle) * dist,
                rosetteCenterY,
                Math.cos(angle) * dist
            );
            petal.rotation.set(-0.7, angle, 0);
            petal.castShadow = true; petal.receiveShadow = true;
            group.add(petal);
        }

        // Outer ring — 9 large petals, gently drooping outward
        for (let i = 0; i < 9; i++) {
            const angle = (i / 9) * Math.PI * 2 + 0.15;
            const petal = new THREE.Mesh(lgPetal, leafMat);
            const dist = width * 0.17;
            petal.position.set(
                Math.sin(angle) * dist,
                rosetteCenterY - 0.01,
                Math.cos(angle) * dist
            );
            petal.rotation.set(-1.0, angle, 0);
            petal.castShadow = true; petal.receiveShadow = true;
            group.add(petal);
        }

        return group;
    }

    // ── Lights ────────────────────────────────────────────────────────

    /**
     * Create a floor lamp — tall arc lamp with drum shade.
     * Includes a real THREE.PointLight inside the shade for actual illumination.
     */
    static createFloorLamp(dims, colour) {
        const { width, height } = dims;
        const group = new THREE.Group();

        const metalColour = colour || '#2C2C2C';
        const shadeColour = '#F5ECD7';

        const metalMat = FurnitureFactory3D._createMaterial(metalColour, 'METAL');
        const shadeMat = new THREE.MeshStandardMaterial({
            color: shadeColour,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        // Weighted base disc
        const baseR = width * 0.4;
        const baseH = 0.03;
        const baseGeo = new THREE.CylinderGeometry(baseR, baseR, baseH, 20);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = baseH / 2;
        base.castShadow = true; base.receiveShadow = true;
        group.add(base);

        // Vertical pole
        const poleR = width * 0.025;
        const poleH = height * 0.75;
        const poleGeo = new THREE.CylinderGeometry(poleR, poleR, poleH, 8);
        const pole = new THREE.Mesh(poleGeo, metalMat);
        pole.position.y = baseH + poleH / 2;
        pole.castShadow = true; pole.receiveShadow = true;
        group.add(pole);

        // Arc arm (horizontal piece at top leading to shade)
        const armLen = width * 0.3;
        const armGeo = new THREE.CylinderGeometry(poleR * 0.8, poleR * 0.8, armLen, 8);
        const arm = new THREE.Mesh(armGeo, metalMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(armLen / 2, baseH + poleH, 0);
        arm.castShadow = true; arm.receiveShadow = true;
        group.add(arm);

        // Drum shade — open-bottom cylinder
        const shadeR = width * 0.25;
        const shadeH = height * 0.18;
        const shadeGeo = new THREE.CylinderGeometry(shadeR, shadeR * 1.08, shadeH, 20, 1, true);
        const shade = new THREE.Mesh(shadeGeo, shadeMat);
        shade.position.set(armLen, baseH + poleH - shadeH / 2, 0);
        shade.castShadow = true; shade.receiveShadow = false;
        group.add(shade);

        // Shade top cap
        const capGeo = new THREE.CylinderGeometry(shadeR, shadeR, 0.008, 20);
        const cap = new THREE.Mesh(capGeo, shadeMat);
        cap.position.set(armLen, baseH + poleH, 0);
        cap.castShadow = false; cap.receiveShadow = false;
        group.add(cap);

        // Real light inside the shade — no shadow casting to avoid blocky wall artifacts
        const light = new THREE.PointLight(0xFFE4B5, 0.8, 4, 2);
        light.position.set(armLen, baseH + poleH - shadeH * 0.4, 0);
        light.castShadow = false;
        group.add(light);

        // Small glow bulb sphere
        const bulbGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xFFE4B5,
            emissive: 0xFFE4B5,
            emissiveIntensity: 1.5,
            roughness: 0.3,
            metalness: 0.0
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.copy(light.position);
        group.add(bulb);

        return group;
    }

    /**
     * Create a table lamp — ceramic base with tapered shade.
     * Includes a real THREE.PointLight for illumination.
     */
    static createTableLamp(dims, colour) {
        const { width, height } = dims;
        const group = new THREE.Group();

        const baseColour = colour || '#C8A882';
        const shadeColour = '#FAF3E6';

        const baseMat = FurnitureFactory3D._createMaterial(baseColour, 'PLASTER');
        const shadeMat = new THREE.MeshStandardMaterial({
            color: shadeColour,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const metalMat = FurnitureFactory3D._createMaterial('#8E8E8E', 'METAL');

        // Ceramic base — vase shape (stacked cylinders)
        const baseR = width * 0.3;
        const baseH = height * 0.45;

        // Bottom disc
        const footGeo = new THREE.CylinderGeometry(baseR, baseR * 1.05, 0.015, 16);
        const foot = new THREE.Mesh(footGeo, baseMat);
        foot.position.y = 0.0075;
        foot.castShadow = true; foot.receiveShadow = true;
        group.add(foot);

        // Vase body — a sphere squeezed vertically
        const bodyGeo = new THREE.SphereGeometry(baseR * 0.85, 16, 12);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = baseH * 0.45;
        body.scale.y = baseH / (baseR * 1.7);
        body.castShadow = true; body.receiveShadow = true;
        group.add(body);

        // Neck
        const neckR = width * 0.06;
        const neckH = height * 0.08;
        const neckGeo = new THREE.CylinderGeometry(neckR, baseR * 0.35, neckH, 12);
        const neck = new THREE.Mesh(neckGeo, baseMat);
        neck.position.y = baseH;
        neck.castShadow = true; neck.receiveShadow = true;
        group.add(neck);

        // Shade — truncated cone (wider at bottom)
        const shadeTopR = width * 0.2;
        const shadeBotR = width * 0.35;
        const shadeH = height * 0.38;
        const shadeGeo = new THREE.CylinderGeometry(shadeTopR, shadeBotR, shadeH, 20, 1, true);
        const shade = new THREE.Mesh(shadeGeo, shadeMat);
        shade.position.y = baseH + neckH + shadeH / 2;
        shade.castShadow = true; shade.receiveShadow = false;
        group.add(shade);

        // Shade top ring
        const ringGeo = new THREE.CylinderGeometry(shadeTopR + 0.003, shadeTopR + 0.003, 0.006, 20);
        const ring = new THREE.Mesh(ringGeo, metalMat);
        ring.position.y = baseH + neckH + shadeH;
        ring.castShadow = false; ring.receiveShadow = false;
        group.add(ring);

        // Real light — no shadow casting to avoid blocky wall artifacts
        const lightY = baseH + neckH + shadeH * 0.3;
        const light = new THREE.PointLight(0xFFE4B5, 0.6, 3, 2);
        light.position.set(0, lightY, 0);
        light.castShadow = false;
        group.add(light);

        // Glow bulb
        const bulbGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xFFE4B5,
            emissive: 0xFFE4B5,
            emissiveIntensity: 1.5,
            roughness: 0.3,
            metalness: 0.0
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(0, lightY, 0);
        group.add(bulb);

        return group;
    }

    /**
     * Create a bedside lamp — compact wood-base lamp with frosted globe shade.
     * Includes a warm PointLight for soft glow.
     */
    static createBedsideLamp(dims, colour) {
        const { width, height } = dims;
        const group = new THREE.Group();

        const baseColour = colour || '#D4B896';
        const shadeColour = '#FFF8F0';

        const baseMat = FurnitureFactory3D._createMaterial(baseColour, 'WOOD');
        const shadeMat = new THREE.MeshStandardMaterial({
            color: shadeColour,
            roughness: 0.7,
            metalness: 0.0,
            transparent: true,
            opacity: 0.6
        });

        // Wooden base block (rounded box → using cylinder)
        const baseR = width * 0.3;
        const baseH = height * 0.15;
        const baseGeo = new THREE.CylinderGeometry(baseR, baseR * 1.05, baseH, 16);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = baseH / 2;
        base.castShadow = true; base.receiveShadow = true;
        group.add(base);

        // Short neck
        const neckR = width * 0.04;
        const neckH = height * 0.15;
        const neckGeo = new THREE.CylinderGeometry(neckR, neckR, neckH, 8);
        const neck = new THREE.Mesh(neckGeo, baseMat);
        neck.position.y = baseH + neckH / 2;
        neck.castShadow = true; neck.receiveShadow = true;
        group.add(neck);

        // Frosted globe shade
        const globeR = width * 0.32;
        const globeY = baseH + neckH + globeR * 0.6;
        const globeGeo = new THREE.SphereGeometry(globeR, 16, 14);
        const globe = new THREE.Mesh(globeGeo, shadeMat);
        globe.position.y = globeY;
        globe.castShadow = true; globe.receiveShadow = false;
        group.add(globe);

        // Real light inside the globe — no shadow casting to avoid blocky wall artifacts
        const light = new THREE.PointLight(0xFFDDB0, 0.5, 2.5, 2);
        light.position.set(0, globeY, 0);
        light.castShadow = false;
        group.add(light);

        // Emissive core
        const coreGeo = new THREE.SphereGeometry(globeR * 0.3, 8, 8);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xFFDDB0,
            emissive: 0xFFDDB0,
            emissiveIntensity: 2.0,
            roughness: 0.2,
            metalness: 0.0
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = globeY;
        group.add(core);

        return group;
    }

    // ── Door & Window 3D builders ────────────────────────────────────

    /**
     * Single door: frame + panel + handle.
     */
    static createSingleDoor(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.7), 'WOOD'
        );
        const panelMat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const handleMat = FurnitureFactory3D._createMaterial('#888888', 'METAL');

        const frameThick = 0.04;

        // Frame — four beams
        // Left post
        const postGeo = new THREE.BoxGeometry(frameThick, height, depth);
        const leftPost = new THREE.Mesh(postGeo, frameMat);
        leftPost.position.set(-width / 2 + frameThick / 2, height / 2, 0);
        leftPost.castShadow = true; leftPost.receiveShadow = true;
        group.add(leftPost);

        // Right post
        const rightPost = new THREE.Mesh(postGeo, frameMat);
        rightPost.position.set(width / 2 - frameThick / 2, height / 2, 0);
        rightPost.castShadow = true; rightPost.receiveShadow = true;
        group.add(rightPost);

        // Top beam
        const topGeo = new THREE.BoxGeometry(width, frameThick, depth);
        const topBeam = new THREE.Mesh(topGeo, frameMat);
        topBeam.position.set(0, height - frameThick / 2, 0);
        topBeam.castShadow = true; topBeam.receiveShadow = true;
        group.add(topBeam);

        // Door panel
        const panelW = width - frameThick * 2;
        const panelH = height - frameThick;
        const panelGeo = new THREE.BoxGeometry(panelW, panelH, depth * 0.6);
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, panelH / 2, 0);
        panel.castShadow = true; panel.receiveShadow = true;
        group.add(panel);

        // Panel inset detail (decorative rectangle)
        const insetMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.9), 'WOOD'
        );
        const insetW = panelW * 0.7;
        const insetH = panelH * 0.35;
        const insetGeo = new THREE.BoxGeometry(insetW, insetH, depth * 0.65);
        // Upper inset
        const insetUp = new THREE.Mesh(insetGeo, insetMat);
        insetUp.position.set(0, panelH * 0.65, 0);
        insetUp.castShadow = false; insetUp.receiveShadow = true;
        group.add(insetUp);
        // Lower inset
        const insetLo = new THREE.Mesh(insetGeo, insetMat);
        insetLo.position.set(0, panelH * 0.25, 0);
        insetLo.castShadow = false; insetLo.receiveShadow = true;
        group.add(insetLo);

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.10, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(panelW * 0.38, height * 0.45, depth * 0.35);
        handle.castShadow = true; handle.receiveShadow = true;
        group.add(handle);

        // Handle knob
        const knobGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const knob = new THREE.Mesh(knobGeo, handleMat);
        knob.position.set(panelW * 0.38, height * 0.45, depth * 0.42);
        knob.castShadow = true; knob.receiveShadow = true;
        group.add(knob);

        return group;
    }

    /**
     * Double door: frame + two panels + two handles + centre divider.
     */
    static createDoubleDoor(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial(
            FurnitureFactory3D._darkenColour(colour, 0.7), 'WOOD'
        );
        const panelMat = FurnitureFactory3D._createMaterial(colour, 'WOOD');
        const handleMat = FurnitureFactory3D._createMaterial('#888888', 'METAL');

        const frameThick = 0.04;
        const halfW = width / 2;

        // Frame — left, right posts + top beam
        const postGeo = new THREE.BoxGeometry(frameThick, height, depth);
        const leftPost = new THREE.Mesh(postGeo, frameMat);
        leftPost.position.set(-halfW + frameThick / 2, height / 2, 0);
        leftPost.castShadow = true; leftPost.receiveShadow = true;
        group.add(leftPost);

        const rightPost = new THREE.Mesh(postGeo, frameMat);
        rightPost.position.set(halfW - frameThick / 2, height / 2, 0);
        rightPost.castShadow = true; rightPost.receiveShadow = true;
        group.add(rightPost);

        const topGeo = new THREE.BoxGeometry(width, frameThick, depth);
        const topBeam = new THREE.Mesh(topGeo, frameMat);
        topBeam.position.set(0, height - frameThick / 2, 0);
        topBeam.castShadow = true; topBeam.receiveShadow = true;
        group.add(topBeam);

        // Centre divider
        const divGeo = new THREE.BoxGeometry(frameThick * 0.6, height - frameThick, depth);
        const divider = new THREE.Mesh(divGeo, frameMat);
        divider.position.set(0, (height - frameThick) / 2, 0);
        divider.castShadow = true; divider.receiveShadow = true;
        group.add(divider);

        // Two door panels
        const panelW = halfW - frameThick - frameThick * 0.3;
        const panelH = height - frameThick;
        const panelGeo = new THREE.BoxGeometry(panelW, panelH, depth * 0.6);

        const leftPanel = new THREE.Mesh(panelGeo, panelMat);
        leftPanel.position.set(-halfW / 2, panelH / 2, 0);
        leftPanel.castShadow = true; leftPanel.receiveShadow = true;
        group.add(leftPanel);

        const rightPanel = new THREE.Mesh(panelGeo, panelMat);
        rightPanel.position.set(halfW / 2, panelH / 2, 0);
        rightPanel.castShadow = true; rightPanel.receiveShadow = true;
        group.add(rightPanel);

        // Two handles
        const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.10, 8);
        for (const sign of [-1, 1]) {
            const h = new THREE.Mesh(handleGeo, handleMat);
            h.rotation.x = Math.PI / 2;
            h.position.set(sign * panelW * 0.4, height * 0.45, depth * 0.35);
            h.castShadow = true; h.receiveShadow = true;
            group.add(h);

            const kGeo = new THREE.SphereGeometry(0.018, 8, 8);
            const k = new THREE.Mesh(kGeo, handleMat);
            k.position.set(sign * panelW * 0.4, height * 0.45, depth * 0.42);
            k.castShadow = true; k.receiveShadow = true;
            group.add(k);
        }

        return group;
    }

    /**
     * Standard window: frame + 2×2 glass panes + mullion cross.
     */
    static createStandardWindow(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial('#EEEEEE', 'PLASTIC_MATTE');
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            roughness: 0.05,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const mullionMat = FurnitureFactory3D._createMaterial('#DDDDDD', 'PLASTIC_MATTE');

        const ft = 0.03; // frame thickness

        // Frame — four beams
        // Left
        const vGeo = new THREE.BoxGeometry(ft, height, depth);
        const left = new THREE.Mesh(vGeo, frameMat);
        left.position.set(-width / 2 + ft / 2, height / 2, 0);
        left.castShadow = true; left.receiveShadow = true;
        group.add(left);

        // Right
        const right = new THREE.Mesh(vGeo, frameMat);
        right.position.set(width / 2 - ft / 2, height / 2, 0);
        right.castShadow = true; right.receiveShadow = true;
        group.add(right);

        // Top
        const hGeo = new THREE.BoxGeometry(width, ft, depth);
        const top = new THREE.Mesh(hGeo, frameMat);
        top.position.set(0, height - ft / 2, 0);
        top.castShadow = true; top.receiveShadow = true;
        group.add(top);

        // Bottom (sill)
        const sill = new THREE.Mesh(hGeo, frameMat);
        sill.position.set(0, ft / 2, 0);
        sill.castShadow = true; sill.receiveShadow = true;
        group.add(sill);

        // Mullion cross (horizontal + vertical bars)
        const mhGeo = new THREE.BoxGeometry(width - ft * 2, ft * 0.5, depth * 0.6);
        const mh = new THREE.Mesh(mhGeo, mullionMat);
        mh.position.set(0, height / 2, 0);
        mh.castShadow = false; mh.receiveShadow = true;
        group.add(mh);

        const mvGeo = new THREE.BoxGeometry(ft * 0.5, height - ft * 2, depth * 0.6);
        const mv = new THREE.Mesh(mvGeo, mullionMat);
        mv.position.set(0, height / 2, 0);
        mv.castShadow = false; mv.receiveShadow = true;
        group.add(mv);

        // Glass panes (single sheet behind frame)
        const glassGeo = new THREE.BoxGeometry(width - ft * 2, height - ft * 2, depth * 0.1);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, height / 2, 0);
        glass.castShadow = false; glass.receiveShadow = false;
        group.add(glass);

        return group;
    }

    /**
     * Tall window: frame + 2×3 glass panes with mullion bars.
     */
    static createTallWindow(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial('#EEEEEE', 'PLASTIC_MATTE');
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            roughness: 0.05,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const mullionMat = FurnitureFactory3D._createMaterial('#DDDDDD', 'PLASTIC_MATTE');

        const ft = 0.03;

        // Frame
        const vGeo = new THREE.BoxGeometry(ft, height, depth);
        const left = new THREE.Mesh(vGeo, frameMat);
        left.position.set(-width / 2 + ft / 2, height / 2, 0);
        left.castShadow = true; left.receiveShadow = true;
        group.add(left);

        const right = new THREE.Mesh(vGeo, frameMat);
        right.position.set(width / 2 - ft / 2, height / 2, 0);
        right.castShadow = true; right.receiveShadow = true;
        group.add(right);

        const hGeo = new THREE.BoxGeometry(width, ft, depth);
        const top = new THREE.Mesh(hGeo, frameMat);
        top.position.set(0, height - ft / 2, 0);
        top.castShadow = true; top.receiveShadow = true;
        group.add(top);

        const sill = new THREE.Mesh(hGeo, frameMat);
        sill.position.set(0, ft / 2, 0);
        sill.castShadow = true; sill.receiveShadow = true;
        group.add(sill);

        // Vertical mullion (centre)
        const mvGeo = new THREE.BoxGeometry(ft * 0.5, height - ft * 2, depth * 0.6);
        const mv = new THREE.Mesh(mvGeo, mullionMat);
        mv.position.set(0, height / 2, 0);
        mv.castShadow = false; mv.receiveShadow = true;
        group.add(mv);

        // Two horizontal mullions (divide into 3 rows)
        const innerH = height - ft * 2;
        const rowH = innerH / 3;
        for (let i = 1; i <= 2; i++) {
            const mhGeo = new THREE.BoxGeometry(width - ft * 2, ft * 0.5, depth * 0.6);
            const mh = new THREE.Mesh(mhGeo, mullionMat);
            mh.position.set(0, ft + rowH * i, 0);
            mh.castShadow = false; mh.receiveShadow = true;
            group.add(mh);
        }

        // Glass
        const glassGeo = new THREE.BoxGeometry(width - ft * 2, height - ft * 2, depth * 0.1);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, height / 2, 0);
        glass.castShadow = false; glass.receiveShadow = false;
        group.add(glass);

        return group;
    }

    /**
     * Small window: frame + single glass pane.
     */
    static createSmallWindow(dims, colour) {
        const { width, depth, height } = dims;
        const group = new THREE.Group();

        const frameMat = FurnitureFactory3D._createMaterial('#EEEEEE', 'PLASTIC_MATTE');
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            roughness: 0.05,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const ft = 0.03;

        // Frame
        const vGeo = new THREE.BoxGeometry(ft, height, depth);
        const left = new THREE.Mesh(vGeo, frameMat);
        left.position.set(-width / 2 + ft / 2, height / 2, 0);
        left.castShadow = true; left.receiveShadow = true;
        group.add(left);

        const right = new THREE.Mesh(vGeo, frameMat);
        right.position.set(width / 2 - ft / 2, height / 2, 0);
        right.castShadow = true; right.receiveShadow = true;
        group.add(right);

        const hGeo = new THREE.BoxGeometry(width, ft, depth);
        const top = new THREE.Mesh(hGeo, frameMat);
        top.position.set(0, height - ft / 2, 0);
        top.castShadow = true; top.receiveShadow = true;
        group.add(top);

        const sill = new THREE.Mesh(hGeo, frameMat);
        sill.position.set(0, ft / 2, 0);
        sill.castShadow = true; sill.receiveShadow = true;
        group.add(sill);

        // Single glass pane
        const glassGeo = new THREE.BoxGeometry(width - ft * 2, height - ft * 2, depth * 0.1);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, height / 2, 0);
        glass.castShadow = false; glass.receiveShadow = false;
        group.add(glass);

        return group;
    }
}
