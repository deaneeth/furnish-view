/**
 * FurnishView — Auto-Arrange Algorithm (v4)
 *
 * Content-aware layout engine.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Analyse the items actually present in the canvas (any combination).
 * 2. Classify them into functional roles: sleeping anchors, seating anchors,
 *    dining anchors, wall items, accessories.
 * 3. Place items in a fixed priority order so large structural pieces claim
 *    their space first and smaller items fill in around them.
 * 4. Every placement is collision-checked (15 cm clearance + 8 cm wall margin).
 *    If preferred candidates fail, a zone-constrained scan finds the first
 *    available slot in the same functional area.  A whole-room fallback
 *    guarantees no item is ever lost.
 *
 * PRIORITY ORDER
 * ──────────────
 *  1. bed            → top wall
 *  2. wardrobe       → beside bed (same wall)
 *  3. sofa           → bottom wall          ← BEFORE desk/TV so it claims space
 *  4. dining-table   → remaining corner     ← BEFORE desk
 *  5. tv-stand       → facing sofa
 *  6. coffee-table   → between sofa & TV
 *  7. armchair       → beside sofa
 *  8. side-table     → flanking bed/sofa
 *  9. chair          → around dining table
 * 10. desk           → remaining wall corner ← AFTER anchors
 * 11. bookshelf      → remaining wall
 * 12. rug            → under seating area (floor level, no collision)
 * 13. anything else  → whole-room grid scan
 *
 * L-shaped rooms (bottom-right 40 % × 40 % cutout) are fully supported.
 *
 * @file js/utils/autoArrange.js
 * @module utils/autoArrange
 */

const GAP  = 0.15;   // clearance between items (m)
const WM   = 0.08;   // clearance from every wall (m)
const SCAN = 0.10;   // grid-scan resolution (m)

// ── L-shaped room helpers ─────────────────────────────────────────────────

function inLCutout(x, y, w, d, room) {
    if (room.shape !== 'l-shaped') return false;
    return (x + w > room.width * 0.6) && (y + d > room.depth * 0.6);
}

function availW(y, d, room) {
    if (room.shape !== 'l-shaped') return room.width;
    return (y + d > room.depth * 0.6) ? room.width * 0.6 : room.width;
}

// ── Collision helpers ─────────────────────────────────────────────────────

function rectsOverlap(ax, ay, aw, ad, bx, by, bw, bd, gap) {
    return (ax - gap) < (bx + bw) &&
           (ax + aw + gap) > bx   &&
           (ay - gap) < (by + bd) &&
           (ay + ad + gap) > by;
}

function hasCollision(x, y, w, d, type, placed) {
    if (type === 'rug') return false;
    for (const p of placed) {
        if (p.type === 'rug') continue;
        if (rectsOverlap(x, y, w, d, p.x, p.y, p.width, p.depth, GAP)) return true;
    }
    return false;
}

// ── Bounds clamping (enforces WM from every wall) ─────────────────────────

function clamp(x, y, w, d, room) {
    const rw = room.width, rd = room.depth;
    let cx = Math.max(WM, Math.min(Math.max(WM, rw - w - WM), x));
    let cy = Math.max(WM, Math.min(Math.max(WM, rd - d - WM), y));

    if (room.shape === 'l-shaped') {
        const cutL = rw * 0.6, cutT = rd * 0.6;
        if (cx + w > cutL && cy + d > cutT) {
            const overL = (cx + w) - cutL, overT = (cy + d) - cutT;
            if (overL <= overT && cutL - w >= WM) cx = cutL - w;
            else cy = Math.min(cy, cutT - d);
            cx = Math.max(WM, cx);
            cy = Math.max(WM, cy);
        }
    }
    return { x: cx, y: cy };
}

// ── Main export ───────────────────────────────────────────────────────────

export function autoArrangeFurniture(room, items) {
    if (!room || !items?.length) return new Map();

    const rw = room.width, rd = room.depth;
    const placed = [];
    const result  = new Map();

    // Wall-mounted items (doors/windows) keep their current position — skip them
    const WALL_TYPES = new Set(['single-door', 'double-door', 'standard-window', 'tall-window', 'small-window']);
    const floorItems = [];
    for (const item of items) {
        if (WALL_TYPES.has(item.type)) {
            result.set(item.id, { x: item.x, y: item.y, rotation: item.rotation || 0 });
        } else {
            floorItems.push(item);
        }
    }

    // ── tryAt: place at (x,y) if collision-free. Returns pos or null. ─────
    function tryAt(item, x, y, rot = 0) {
        if (!item || result.has(item.id)) return null;
        const c = clamp(x, y, item.width, item.depth, room);
        if (inLCutout(c.x, c.y, item.width, item.depth, room)) return null;
        if (hasCollision(c.x, c.y, item.width, item.depth, item.type, placed)) return null;
        if (item.type !== 'rug') {
            placed.push({ x: c.x, y: c.y, width: item.width, depth: item.depth, type: item.type });
        }
        result.set(item.id, { x: c.x, y: c.y, rotation: rot });
        return { x: c.x, y: c.y };
    }

    /**
     * Try candidates in order. If all fail, scan within `zone` first,
     * then fall back to whole-room scan. Guarantees placement.
     *
     * zone = { x1, y1, x2, y2 } — preferred area for fallback scan.
     *        Pass null to scan whole room immediately.
     */
    function place(item, candidates, rot = 0, zone = null) {
        if (!item || result.has(item.id)) return null;

        // Try named candidates
        for (const [x, y] of candidates) {
            const r = tryAt(item, x, y, rot);
            if (r) return r;
        }

        // Zone-constrained scan (keeps item in its semantic area)
        const z = zone || { x1: WM, y1: WM, x2: rw - WM, y2: rd - WM };
        for (let sy = z.y1; sy + item.depth + WM <= Math.min(z.y2, rd - WM); sy += SCAN) {
            const aw = Math.min(availW(sy, item.depth, room) - WM, z.x2);
            for (let sx = z.x1; sx + item.width <= aw; sx += SCAN) {
                if (!inLCutout(sx, sy, item.width, item.depth, room)) {
                    const r = tryAt(item, sx, sy, rot);
                    if (r) return r;
                }
            }
        }

        // Whole-room fallback (only reached if zone is 100% occupied)
        if (zone) {
            for (let sy = WM; sy + item.depth + WM <= rd; sy += SCAN) {
                const aw = availW(sy, item.depth, room) - WM;
                for (let sx = WM; sx + item.width <= aw; sx += SCAN) {
                    if (!inLCutout(sx, sy, item.width, item.depth, room)) {
                        const r = tryAt(item, sx, sy, rot);
                        if (r) return r;
                    }
                }
            }
        }
        return null;
    }

    function placeRug(rug, x, y) {
        if (!rug || result.has(rug.id)) return;
        const c = clamp(x, y, rug.width, rug.depth, room);
        result.set(rug.id, { x: c.x, y: c.y, rotation: 0 });
    }

    // ── Index items by type ───────────────────────────────────────────────
    const byType = {};
    for (const i of floorItems) (byType[i.type] = byType[i.type] || []).push(i);
    const first = t => (byType[t] || [])[0];
    const all   = t =>  byType[t] || [];

    const bed       = first('bed');
    const wardrobe  = first('wardrobe');
    const sofa      = first('sofa');
    const dt        = first('dining-table');
    const tv        = first('tv-stand');
    const coffee    = first('coffee-table');
    const desk      = first('desk');
    const bs        = first('bookshelf');
    const rug       = first('rug');
    const sideTs    = all('side-table');
    const armchairs = all('armchair');
    const chairs    = all('chair');

    // Convenient helpers
    const cx = (w) => WM + Math.max(0, (rw - 2 * WM - w) / 2);   // horizontal centre
    const bot = (d) => rd - d - WM;                                 // bottom-wall Y

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 1 — BED  (top wall, centered or offset for wardrobe)
    // ═══════════════════════════════════════════════════════════════════
    let bedPos = null;
    let sleepZoneBot = WM;  // Y below which sleeping zone ends

    if (bed) {
        // If wardrobe fits beside bed on the same wall, offset bed
        const availTop = availW(WM, bed.depth, room) - 2 * WM;
        let bx;
        if (wardrobe && wardrobe.width + GAP + bed.width <= availTop) {
            // Pair: [wardrobe][GAP][bed], centred together
            const pairW = wardrobe.width + GAP + bed.width;
            bx = WM + Math.max(0, (availTop - pairW) / 2) + wardrobe.width + GAP;
        } else {
            bx = cx(bed.width);
        }

        const sleepZone = { x1: WM, y1: WM, x2: rw - WM, y2: bed.depth + WM * 3 };
        bedPos = place(bed, [[bx, WM], [cx(bed.width), WM], [WM, WM], [rw - bed.width - WM, WM]], 0, sleepZone);

        if (bedPos) sleepZoneBot = bedPos.y + bed.depth + GAP;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 2 — WARDROBE  (beside bed on top wall, or own row)
    // ═══════════════════════════════════════════════════════════════════
    let wardrobePos = null;
    if (wardrobe) {
        const sleepZone = { x1: WM, y1: WM, x2: rw - WM, y2: sleepZoneBot + wardrobe.depth };
        if (bedPos) {
            const BX = bedPos.x, BW = bed.width, BY = bedPos.y;
            wardrobePos = place(wardrobe, [
                [BX - wardrobe.width - GAP, BY],   // left of bed
                [BX + BW + GAP,             BY],   // right of bed
                [WM,            sleepZoneBot],      // below-bed, left wall
                [rw - wardrobe.width - WM, sleepZoneBot], // below-bed, right wall
            ], 0, sleepZone);
        } else {
            wardrobePos = place(wardrobe, [[WM, WM], [rw - wardrobe.width - WM, WM]], 0, sleepZone);
        }
        // Update sleepZoneBot to include wardrobe if it ended up below the bed
        if (wardrobePos && wardrobePos.y >= sleepZoneBot - GAP) {
            sleepZoneBot = Math.max(sleepZoneBot, wardrobePos.y + wardrobe.depth + GAP);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 3 — SOFA  (bottom wall)
    // When a dining table is also present, push sofa to the LEFT side
    // so the dining table can sit beside it on the RIGHT — this avoids
    // the dining table falling through to an unrelated zone.
    // ═══════════════════════════════════════════════════════════════════
    let sofaPos = null;
    if (sofa) {
        // Check if sofa + dining table fit side-by-side on the bottom wall.
        // Use actual available width at the sofa's Y (matters for L-shaped rooms
        // where the bottom wall may be narrower than room.width).
        const sofaBottomAvailW = availW(rd - sofa.depth - WM, sofa.depth, room) - 2 * WM;
        const sideBySlide = dt && (sofa.width + GAP + dt.width) <= sofaBottomAvailW;
        const sofaIdealX  = sideBySlide ? WM : cx(sofa.width);

        const sofaZone = { x1: WM, y1: sleepZoneBot, x2: rw - WM, y2: rd - WM };
        sofaPos = place(sofa, [
            [sofaIdealX,           bot(sofa.depth)],
            [cx(sofa.width),       bot(sofa.depth)],
            [WM,                   bot(sofa.depth)],
            [rw - sofa.width - WM, bot(sofa.depth)],
            [sofaIdealX,           sleepZoneBot + (rd - sleepZoneBot) * 0.55],
        ], 0, sofaZone);
    }

    // Compute the "lower zone" top — free space between sleeping and sofa
    const lowerTop = sleepZoneBot;
    const lowerBot = sofaPos ? sofaPos.y - GAP : rd - WM;

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 4 — DINING TABLE  (beside sofa or in best available corner)
    // ═══════════════════════════════════════════════════════════════════
    let dtPos = null;
    if (dt) {
        const chD = (chairs[0]?.depth ?? 0.5) + 0.05;  // chair clearance

        const diningZone = { x1: WM, y1: lowerTop, x2: rw - WM, y2: rd - WM };

        let dtCandidates;
        if (sofaPos) {
            // Primary: place dining table right beside sofa on the bottom wall
            const dtRightOfSofa = sofaPos.x + sofa.width + GAP;
            const dtLeftOfSofa  = sofaPos.x - dt.width - GAP;
            dtCandidates = [
                [dtRightOfSofa, sofaPos.y + (sofa.depth - dt.depth) / 2],  // right, sofa-aligned
                [dtRightOfSofa, bot(dt.depth)],                             // right, bottom wall
                [dtLeftOfSofa,  sofaPos.y + (sofa.depth - dt.depth) / 2],  // left, sofa-aligned
                [dtLeftOfSofa,  bot(dt.depth)],                             // left, bottom wall
                [rw - dt.width - WM, lowerTop + chD],                      // right wall top of lower
                [WM,                 lowerTop + chD],                       // left wall top of lower
                [rw - dt.width - WM, bot(dt.depth) - chD],                 // right wall, chairs above
                [WM,                 bot(dt.depth) - chD],                  // left wall, chairs above
            ];
        } else if (bed) {
            dtCandidates = [
                [rw - dt.width - WM, lowerTop + chD],
                [WM,                 lowerTop + chD],
                [rw - dt.width - WM, bot(dt.depth)],
                [WM,                 bot(dt.depth)],
            ];
        } else {
            // Pure dining room — centre
            dtCandidates = [
                [cx(dt.width), WM + Math.max(0, (rd - 2 * WM - dt.depth) / 2)],
                [WM, WM],
            ];
        }

        dtPos = place(dt, dtCandidates, 0, diningZone);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 5 — TV STAND  (facing sofa or bottom wall)
    // ═══════════════════════════════════════════════════════════════════
    let tvPos = null;
    if (tv) {
        if (sofaPos) {
            // Place TV in the space between sleeping zone and sofa.
            // If a coffee table will be placed in front of sofa, push TV back
            // far enough to leave room for it (coffee.depth + clearance).
            const tvStandoff = coffee ? coffee.depth + GAP * 2 : GAP * 3;
            const tvIdealY = sofaPos.y - tv.depth - tvStandoff;
            const tvY = Math.max(lowerTop, tvIdealY);
            const tvZone = { x1: WM, y1: lowerTop, x2: rw - WM, y2: sofaPos.y - GAP };
            tvPos = place(tv, [
                [cx(tv.width),         tvY],
                [WM,                   tvY],
                [rw - tv.width - WM,   tvY],
                [cx(tv.width),         lowerTop],
                [WM,                   lowerTop],
            ], 0, tvZone);
        } else {
            // No sofa: TV goes on bottom wall
            tvPos = place(tv, [
                [cx(tv.width), bot(tv.depth)],
                [WM, bot(tv.depth)],
            ], 0, null);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 6 — COFFEE TABLE  (between sofa & TV, in front of sofa)
    // ═══════════════════════════════════════════════════════════════════
    let coffeePos = null;
    if (coffee && !result.has(coffee.id)) {
        if (sofaPos) {
            const SX = sofaPos.x, SY = sofaPos.y, SW = sofa.width;
            const cfIdealY = SY - coffee.depth - GAP;
            const coffeeZone = { x1: WM, y1: lowerTop, x2: rw - WM, y2: sofaPos.y };
            coffeePos = place(coffee, [
                [SX + (SW - coffee.width) / 2,  Math.max(lowerTop, cfIdealY)],
                [SX,                             Math.max(lowerTop, cfIdealY)],
                [cx(coffee.width),               Math.max(lowerTop, cfIdealY)],
            ], 0, coffeeZone);
        } else {
            // No sofa: coffee table near armchair or centre
            place(coffee, [[cx(coffee.width), WM + Math.max(0, (rd - 2 * WM - coffee.depth) / 2)]], 0, null);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 7 — ARMCHAIRS  (beside sofa / reading corner)
    // ═══════════════════════════════════════════════════════════════════
    if (sofaPos) {
        const SX = sofaPos.x, SY = sofaPos.y, SW = sofa.width;
        const cfX = coffeePos?.x ?? SX + (SW - 1.2) / 2;
        const cfW = coffee?.width ?? 1.2;
        const acZone = { x1: WM, y1: lowerTop, x2: rw - WM, y2: rd - WM };

        armchairs.forEach((ac, i) => {
            if (result.has(ac.id)) return;
            if (i === 0) {
                place(ac, [
                    [SX + SW + GAP,        SY],
                    [cfX + cfW + GAP,      SY],
                    [SX - ac.width - GAP,  SY],
                    [SX + SW + GAP,        SY - ac.depth - GAP],
                ], 0, acZone);
            } else {
                place(ac, [
                    [SX - ac.width - GAP,  SY],
                    [cfX - ac.width - GAP, SY],
                    [SX + SW + GAP,        SY],
                ], 0, acZone);
            }
        });
    } else if (armchairs.length > 0) {
        // Reading corner: place armchair in lower part of room
        const ac = armchairs[0];
        const acZone = { x1: WM, y1: sleepZoneBot, x2: rw - WM, y2: rd - WM };
        const acPos = place(ac, [
            [rw - ac.width - WM, bot(ac.depth)],
            [WM,                 bot(ac.depth)],
            [rw - ac.width - WM, lowerTop + (rd - lowerTop) * 0.5],
            [WM,                 lowerTop + (rd - lowerTop) * 0.5],
        ], 0, acZone);

        // Coffee table in front of reading armchair (if not placed yet)
        if (acPos && coffee && !result.has(coffee.id)) {
            const acZone2 = { x1: WM, y1: sleepZoneBot, x2: rw - WM, y2: rd - WM };
            place(coffee, [
                [acPos.x + (ac.width - coffee.width) / 2, acPos.y - coffee.depth - GAP],
                [acPos.x - coffee.width - GAP,            acPos.y],
                [acPos.x + ac.width + GAP,                acPos.y],
            ], 0, acZone2);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 8 — SIDE TABLES  (flank bed headboard, or sofa arms)
    // ═══════════════════════════════════════════════════════════════════
    if (bedPos) {
        const BX = bedPos.x, BY = bedPos.y, BW = bed.width;
        const stZone = { x1: WM, y1: WM, x2: rw - WM, y2: sleepZoneBot };
        sideTs.slice(0, 2).forEach((st, i) => {
            if (result.has(st.id)) return;
            if (i === 0) {
                place(st, [
                    [BX - st.width - GAP, BY],
                    [BX + BW + GAP,       BY],
                    [WM,                  BY],
                ], 0, stZone);
            } else {
                place(st, [
                    [BX + BW + GAP,       BY],
                    [BX - st.width - GAP, BY],
                    [rw - st.width - WM,  BY],
                ], 0, stZone);
            }
        });
        // Any extra side tables: below sleep zone
        sideTs.slice(2).forEach(st => {
            if (!result.has(st.id)) place(st, [[WM, lowerTop], [rw - st.width - WM, lowerTop]], 0, null);
        });
    } else if (sofaPos) {
        const SX = sofaPos.x, SY = sofaPos.y, SW = sofa.width;
        const stZone = { x1: WM, y1: lowerTop, x2: rw - WM, y2: rd - WM };
        sideTs.slice(0, 2).forEach((st, i) => {
            if (result.has(st.id)) return;
            if (i === 0) {
                place(st, [[SX - st.width - GAP, SY], [SX + SW + GAP, SY]], 0, stZone);
            } else {
                place(st, [[SX + SW + GAP, SY], [SX - st.width - GAP, SY]], 0, stZone);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 9 — CHAIRS  (around dining table)
    // ═══════════════════════════════════════════════════════════════════
    if (dtPos) {
        const DX = dtPos.x, DY = dtPos.y, DW = dt.width, DD = dt.depth;
        const chW = chairs[0]?.width ?? 0.5, chD = chairs[0]?.depth ?? 0.5;
        const cg  = GAP;   // chair-to-table gap must match collision clearance

        [
            { ch: chairs[0], rot:   0, p: [DX + (DW - chW) / 2, DY - chD - cg],      fb: [[DX + (DW - chW) / 2, DY + DD + cg], [DX - chW - cg, DY + (DD - chD) / 2], [DX + DW + cg, DY + (DD - chD) / 2]] },
            { ch: chairs[1], rot: 180, p: [DX + (DW - chW) / 2, DY + DD + cg],        fb: [[DX + (DW - chW) / 2, DY - chD - cg], [DX - chW - cg, DY + (DD - chD) / 2], [DX + DW + cg, DY + (DD - chD) / 2]] },
            { ch: chairs[2], rot:  90, p: [DX - chW - cg, DY + (DD - chD) / 2],       fb: [[DX + DW + cg, DY + (DD - chD) / 2], [DX + (DW - chW) / 2, DY - chD - cg], [DX + (DW - chW) / 2, DY + DD + cg]] },
            { ch: chairs[3], rot: 270, p: [DX + DW + cg,   DY + (DD - chD) / 2],      fb: [[DX - chW - cg, DY + (DD - chD) / 2], [DX + (DW - chW) / 2, DY - chD - cg], [DX + (DW - chW) / 2, DY + DD + cg]] },
        ].forEach(({ ch, rot, p, fb }) => {
            if (!ch) return;
            place(ch, [p, ...fb], rot, null);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 10 — DESK  (remaining wall corner, AFTER anchors)
    // ═══════════════════════════════════════════════════════════════════
    if (desk) {
        // Prefer right wall in the lower zone; also try left wall
        const deskZone = { x1: WM, y1: sleepZoneBot, x2: rw - WM, y2: rd - WM };
        place(desk, [
            [rw - desk.width - WM, lowerTop],                 // right wall, top of lower zone
            [WM,                   lowerTop],                 // left wall, top of lower zone
            [rw - desk.width - WM, bot(desk.depth)],         // right wall, bottom
            [WM,                   bot(desk.depth)],         // left wall, bottom
            [rw - desk.width - WM, lowerTop + (lowerBot - lowerTop) * 0.4],
            [cx(desk.width),       lowerTop],
        ], 0, deskZone);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 11 — BOOKSHELF  (right wall, below/beside desk)
    // ═══════════════════════════════════════════════════════════════════
    if (bs) {
        const deskResult = result.get(desk?.id);
        const bsAboveDesk = deskResult ? deskResult.y - bs.depth - GAP : lowerTop;
        const bsZone = { x1: WM, y1: WM, x2: rw - WM, y2: rd - WM };
        place(bs, [
            [rw - bs.width - WM, bedPos?.y ?? WM],           // right wall, beside bed
            [rw - bs.width - WM, WM],                        // right wall, top
            [rw - bs.width - WM, lowerTop],                  // right wall, lower zone top
            [rw - bs.width - WM, Math.max(WM, bsAboveDesk)],// right wall, above desk
            [WM,                 bedPos?.y ?? WM],            // left wall, beside bed
            [WM,                 lowerTop],                  // left wall, lower zone top
        ], 0, bsZone);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 12 — RUG  (floor-level, under seating zone)
    // ═══════════════════════════════════════════════════════════════════
    if (rug && !result.has(rug.id)) {
        if (sofaPos) {
            const rugX = sofaPos.x + (sofa.width - rug.width) / 2;
            const rugY = coffeePos
                ? coffeePos.y - GAP * 0.3
                : sofaPos.y - rug.depth * 0.35;
            placeRug(rug, rugX, rugY);
        } else if (bedPos) {
            placeRug(rug, bedPos.x + (bed.width - rug.width) / 2, bedPos.y + bed.depth + GAP * 0.4);
        } else {
            placeRug(rug, WM, WM);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 13 — REMAINING (anything not placed above)
    // Sorted largest-footprint-first, then zone-aware grid scan.
    // ═══════════════════════════════════════════════════════════════════
    const unplaced = floorItems.filter(i => !result.has(i.id));
    unplaced.sort((a, b) => (b.width * b.depth) - (a.width * a.depth));

    for (const item of unplaced) {
        if (item.type === 'rug') {
            placeRug(item, WM, WM);
            continue;
        }
        place(item, [
            [WM,                   WM],
            [rw - item.width - WM, WM],
            [WM,                   rd - item.depth - WM],
            [rw - item.width - WM, rd - item.depth - WM],
            [cx(item.width),       WM + Math.max(0, (rd - 2 * WM - item.depth) / 2)],
        ], 0, null);
    }

    return result;
}
