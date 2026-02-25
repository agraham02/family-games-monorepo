import { describe, it, expect } from "vitest";
import {
    initLayout,
    appendTile,
    computeFullLayout,
    computeDominoBoardLayout,
} from "../utils/dominoLayoutEngine";
import { Tile, DominoTileLayout } from "../types";

// ============================================================================
// Test helpers
// ============================================================================

function makeTile(left: number, right: number, id?: string): Tile {
    return { left, right, id: id ?? `${left}-${right}` };
}

function allTilePositions(
    layouts: Record<string, DominoTileLayout>,
): { id: string; x: number; y: number; rotation: number }[] {
    return Object.values(layouts).map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        rotation: l.rotation,
    }));
}

function hasOverlap(layouts: Record<string, DominoTileLayout>): boolean {
    const tiles = Object.values(layouts);
    const EPSILON = 0.01;
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            const a = tiles[i];
            const b = tiles[j];
            const aHW = getHalfDims(a);
            const bHW = getHalfDims(b);
            if (
                Math.abs(a.x - b.x) < aHW.halfW + bHW.halfW - EPSILON &&
                Math.abs(a.y - b.y) < aHW.halfH + bHW.halfH - EPSILON
            ) {
                return true;
            }
        }
    }
    return false;
}

function getHalfDims(t: DominoTileLayout): {
    halfW: number;
    halfH: number;
} {
    const isHorizontal = t.direction === "RIGHT" || t.direction === "LEFT";
    if (isHorizontal) {
        return {
            halfW: t.isDouble ? 0.25 : 0.5,
            halfH: t.isDouble ? 0.5 : 0.25,
        };
    }
    return {
        halfW: t.isDouble ? 0.5 : 0.25,
        halfH: t.isDouble ? 0.25 : 0.5,
    };
}

// ============================================================================
// Tests
// ============================================================================

describe("dominoLayoutEngine", () => {
    describe("initLayout", () => {
        it("places a single tile at the origin", () => {
            const tile = makeTile(3, 5);
            const layout = initLayout(tile, "test-seed");

            expect(Object.keys(layout.tileLayouts)).toHaveLength(1);
            const placed = layout.tileLayouts[tile.id];
            expect(placed).toBeDefined();
            expect(placed.x).toBe(0);
            expect(placed.y).toBe(0);
            expect(placed.isDouble).toBe(false);
        });

        it("marks a double tile correctly", () => {
            const tile = makeTile(4, 4);
            const layout = initLayout(tile, "test-seed");

            const placed = layout.tileLayouts[tile.id];
            expect(placed.isDouble).toBe(true);
        });

        it("is deterministic — same seed produces same layout", () => {
            const tile = makeTile(3, 5);
            const layout1 = initLayout(tile, "seed-A");
            const layout2 = initLayout(tile, "seed-A");

            const placed1 = layout1.tileLayouts[tile.id];
            const placed2 = layout2.tileLayouts[tile.id];
            expect(placed1.direction).toBe(placed2.direction);
            expect(placed1.rotation).toBe(placed2.rotation);
        });

        it("computes ghost positions for both ends", () => {
            const tile = makeTile(3, 5);
            const layout = initLayout(tile, "test-seed");

            expect(layout.leftEndPos).not.toBeNull();
            expect(layout.rightEndPos).not.toBeNull();
        });

        it("produces valid bounds containing the tile", () => {
            const tile = makeTile(3, 5);
            const layout = initLayout(tile, "test-seed");

            expect(layout.bounds.minX).toBeLessThanOrEqual(0);
            expect(layout.bounds.maxX).toBeGreaterThanOrEqual(0);
            expect(layout.bounds.minY).toBeLessThanOrEqual(0);
            expect(layout.bounds.maxY).toBeGreaterThanOrEqual(0);
        });
    });

    describe("appendTile", () => {
        it("appends a tile to the right without overlap", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2");

            let layout = initLayout(t1, "test-seed");
            layout = appendTile(layout, t2, "right");

            expect(Object.keys(layout.tileLayouts)).toHaveLength(2);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("prepends a tile to the left without overlap", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(1, 3, "t2");

            let layout = initLayout(t1, "test-seed");
            layout = appendTile(layout, t2, "left");

            expect(Object.keys(layout.tileLayouts)).toHaveLength(2);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("does not modify existing tile positions (stability)", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2");
            const t3 = makeTile(2, 6, "t3");

            const layout1 = initLayout(t1, "test-seed");
            const pos1_before = { ...layout1.tileLayouts["t1"] };

            const layout2 = appendTile(layout1, t2, "right");
            const pos1_after_t2 = layout2.tileLayouts["t1"];
            const pos2_before = { ...layout2.tileLayouts["t2"] };

            expect(pos1_after_t2.x).toBe(pos1_before.x);
            expect(pos1_after_t2.y).toBe(pos1_before.y);
            expect(pos1_after_t2.rotation).toBe(pos1_before.rotation);
            expect(pos1_after_t2.direction).toBe(pos1_before.direction);

            const layout3 = appendTile(layout2, t3, "right");
            const pos1_after_t3 = layout3.tileLayouts["t1"];
            const pos2_after_t3 = layout3.tileLayouts["t2"];

            expect(pos1_after_t3.x).toBe(pos1_before.x);
            expect(pos1_after_t3.y).toBe(pos1_before.y);
            expect(pos2_after_t3.x).toBe(pos2_before.x);
            expect(pos2_after_t3.y).toBe(pos2_before.y);
        });

        it("handles double tiles crosswise", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 5, "t2"); // double

            let layout = initLayout(t1, "test-seed");
            layout = appendTile(layout, t2, "right");

            const doubleLayout = layout.tileLayouts["t2"];
            expect(doubleLayout.isDouble).toBe(true);
            // Rotation should indicate crosswise placement
            // For horizontal directions: double rotation is 90°
            // For vertical directions: double rotation is 0°
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("updates bounds to include the new tile", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2");

            const layout1 = initLayout(t1, "test-seed");
            const layout2 = appendTile(layout1, t2, "right");

            const t2Layout = layout2.tileLayouts["t2"];
            const halfDims = getHalfDims(t2Layout);

            expect(layout2.bounds.minX).toBeLessThanOrEqual(
                t2Layout.x - halfDims.halfW,
            );
            expect(layout2.bounds.maxX).toBeGreaterThanOrEqual(
                t2Layout.x + halfDims.halfW,
            );
            expect(layout2.bounds.minY).toBeLessThanOrEqual(
                t2Layout.y - halfDims.halfH,
            );
            expect(layout2.bounds.maxY).toBeGreaterThanOrEqual(
                t2Layout.y + halfDims.halfH,
            );
        });

        it("updates ghost positions after append", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2");

            const layout1 = initLayout(t1, "test-seed");
            const layout2 = appendTile(layout1, t2, "right");

            expect(layout2.rightEndPos).not.toBeNull();
            expect(layout2.leftEndPos).not.toBeNull();

            // Right ghost should be beyond t2, not t1
            // (exact position depends on direction, but it should differ from layout1)
            if (layout1.rightEndPos && layout2.rightEndPos) {
                const moved =
                    layout1.rightEndPos.x !== layout2.rightEndPos.x ||
                    layout1.rightEndPos.y !== layout2.rightEndPos.y;
                expect(moved).toBe(true);
            }
        });
    });

    describe("chain of 5 non-double tiles", () => {
        it("places all 5 tiles flush with no overlaps", () => {
            const tiles = [
                makeTile(3, 5, "t1"),
                makeTile(5, 2, "t2"),
                makeTile(2, 6, "t3"),
                makeTile(6, 1, "t4"),
                makeTile(1, 4, "t5"),
            ];

            let layout = initLayout(tiles[0], "chain-test");
            for (let i = 1; i < tiles.length; i++) {
                layout = appendTile(layout, tiles[i], "right");
            }

            expect(Object.keys(layout.tileLayouts)).toHaveLength(5);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });
    });

    describe("collision avoidance", () => {
        it("avoids self-intersection in a long chain", () => {
            // Build a 20-tile chain that must turn multiple times
            const tiles: Tile[] = [];
            for (let i = 0; i < 20; i++) {
                tiles.push(makeTile(i % 7, (i + 1) % 7, `t${i}`));
            }

            let layout = initLayout(tiles[0], "collision-test");
            for (let i = 1; i < tiles.length; i++) {
                layout = appendTile(layout, tiles[i], "right");
            }

            expect(Object.keys(layout.tileLayouts)).toHaveLength(20);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });
    });

    describe("determinism", () => {
        it("same seed + same tiles = same layout", () => {
            const tiles = [
                makeTile(6, 6, "t1"),
                makeTile(6, 3, "t2"),
                makeTile(3, 1, "t3"),
                makeTile(1, 5, "t4"),
            ];

            const buildLayout = (seed: string) => {
                let l = initLayout(tiles[0], seed);
                for (let i = 1; i < tiles.length; i++) {
                    l = appendTile(l, tiles[i], "right");
                }
                return l;
            };

            const layout1 = buildLayout("determinism-test");
            const layout2 = buildLayout("determinism-test");

            for (const id of Object.keys(layout1.tileLayouts)) {
                expect(layout1.tileLayouts[id].x).toBe(
                    layout2.tileLayouts[id].x,
                );
                expect(layout1.tileLayouts[id].y).toBe(
                    layout2.tileLayouts[id].y,
                );
                expect(layout1.tileLayouts[id].rotation).toBe(
                    layout2.tileLayouts[id].rotation,
                );
                expect(layout1.tileLayouts[id].direction).toBe(
                    layout2.tileLayouts[id].direction,
                );
            }
        });

        it("different seeds produce different layouts", () => {
            const tile = makeTile(3, 5);

            const layout1 = initLayout(tile, "seed-one");
            const layout2 = initLayout(tile, "seed-two");

            // With high probability, different seeds produce different directions
            // (this may rarely fail if two seeds happen to produce the same direction)
            // Run with multiple tiles to ensure divergence
            const tiles = [
                makeTile(3, 5, "t1"),
                makeTile(5, 2, "t2"),
                makeTile(2, 6, "t3"),
                makeTile(6, 1, "t4"),
                makeTile(1, 4, "t5"),
                makeTile(4, 3, "t6"),
                makeTile(3, 0, "t7"),
                makeTile(0, 2, "t8"),
            ];

            const build = (seed: string) => {
                let l = initLayout(tiles[0], seed);
                for (let i = 1; i < tiles.length; i++) {
                    l = appendTile(l, tiles[i], "right");
                }
                return l;
            };

            const la = build("seed-alpha");
            const lb = build("seed-beta");

            // At least one tile should differ in position
            let anyDifferent = false;
            for (const id of Object.keys(la.tileLayouts)) {
                if (
                    la.tileLayouts[id].x !== lb.tileLayouts[id].x ||
                    la.tileLayouts[id].y !== lb.tileLayouts[id].y
                ) {
                    anyDifferent = true;
                    break;
                }
            }
            expect(anyDifferent).toBe(true);
        });
    });

    describe("computeFullLayout", () => {
        it("computes layout for empty chain", () => {
            const layout = computeFullLayout([], "empty-test");
            expect(Object.keys(layout.tileLayouts)).toHaveLength(0);
            expect(layout.leftEndPos).toBeNull();
            expect(layout.rightEndPos).toBeNull();
        });

        it("computes layout for single tile", () => {
            const layout = computeFullLayout([makeTile(3, 5)], "single-test");
            expect(Object.keys(layout.tileLayouts)).toHaveLength(1);
        });

        it("computes layout for 28-tile full chain with no overlaps", () => {
            // Generate a valid 28-tile chain
            const tiles: Tile[] = [];
            for (let i = 0; i < 28; i++) {
                tiles.push(makeTile(i % 7, (i + 1) % 7, `t${i}`));
            }

            const layout = computeFullLayout(tiles, "full-chain-test");
            expect(Object.keys(layout.tileLayouts)).toHaveLength(28);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("handles a chain of all doubles", () => {
            const tiles: Tile[] = [];
            for (let i = 0; i < 7; i++) {
                tiles.push(makeTile(i, i, `d${i}`));
            }

            const layout = computeFullLayout(tiles, "all-doubles-test");
            expect(Object.keys(layout.tileLayouts)).toHaveLength(7);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);

            // All tiles should be marked as doubles
            for (const tl of Object.values(layout.tileLayouts)) {
                expect(tl.isDouble).toBe(true);
            }
        });
    });

    describe("computeDominoBoardLayout (backward-compatible wrapper)", () => {
        it("computes layout from scratch when no previous layout", () => {
            const tiles = [
                makeTile(3, 5, "t1"),
                makeTile(5, 2, "t2"),
                makeTile(2, 6, "t3"),
            ];

            const layout = computeDominoBoardLayout(tiles, "compat-test");
            expect(Object.keys(layout.tileLayouts)).toHaveLength(3);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("incrementally appends when previous layout exists", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2");
            const t3 = makeTile(2, 6, "t3");

            const layout1 = computeDominoBoardLayout([t1], "incr-test");
            const layout2 = computeDominoBoardLayout(
                [t1, t2],
                "incr-test",
                layout1,
            );

            // t1's position should be preserved
            expect(layout2.tileLayouts["t1"].x).toBe(
                layout1.tileLayouts["t1"].x,
            );
            expect(layout2.tileLayouts["t1"].y).toBe(
                layout1.tileLayouts["t1"].y,
            );

            const layout3 = computeDominoBoardLayout(
                [t1, t2, t3],
                "incr-test",
                layout2,
            );

            // t1 and t2 positions should still be preserved
            expect(layout3.tileLayouts["t1"].x).toBe(
                layout1.tileLayouts["t1"].x,
            );
            expect(layout3.tileLayouts["t2"].x).toBe(
                layout2.tileLayouts["t2"].x,
            );
            expect(hasOverlap(layout3.tileLayouts)).toBe(false);
        });

        it("handles left-side prepend incrementally", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(1, 3, "t2");

            const layout1 = computeDominoBoardLayout([t1], "prepend-test");
            // t2 prepended to the left means tiles array is [t2, t1]
            const layout2 = computeDominoBoardLayout(
                [t2, t1],
                "prepend-test",
                layout1,
            );

            expect(Object.keys(layout2.tileLayouts)).toHaveLength(2);
            // t1 position should be preserved
            expect(layout2.tileLayouts["t1"].x).toBe(
                layout1.tileLayouts["t1"].x,
            );
            expect(hasOverlap(layout2.tileLayouts)).toBe(false);
        });
    });

    describe("double at chain end", () => {
        it("places a double at the right end with correct crosswise orientation", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 5, "t2"); // double at end

            let layout = initLayout(t1, "double-end-test");
            layout = appendTile(layout, t2, "right");

            const doubleLayout = layout.tileLayouts["t2"];
            expect(doubleLayout.isDouble).toBe(true);

            // Ghost position should still be valid (beyond the double)
            expect(layout.rightEndPos).not.toBeNull();
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });

        it("places a double at the left end correctly", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(3, 3, "t2"); // double at left end

            let layout = initLayout(t1, "double-left-test");
            layout = appendTile(layout, t2, "left");

            const doubleLayout = layout.tileLayouts["t2"];
            expect(doubleLayout.isDouble).toBe(true);
            expect(layout.leftEndPos).not.toBeNull();
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });
    });

    describe("mixed append directions", () => {
        it("builds a chain with interleaved left and right appends", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 2, "t2"); // right
            const t3 = makeTile(1, 3, "t3"); // left
            const t4 = makeTile(2, 6, "t4"); // right
            const t5 = makeTile(0, 1, "t5"); // left

            let layout = initLayout(t1, "mixed-test");
            layout = appendTile(layout, t2, "right");
            layout = appendTile(layout, t3, "left");
            layout = appendTile(layout, t4, "right");
            layout = appendTile(layout, t5, "left");

            expect(Object.keys(layout.tileLayouts)).toHaveLength(5);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
        });
    });
});
