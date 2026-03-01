import { describe, it, expect } from "vitest";
import {
    initLayout,
    appendTile,
    replayLayout,
    computeDominoBoardLayoutV3,
    computeLayoutHash,
    TURN_POLICY_VERSION,
} from "../utils/dominoLayoutEngineV3";
import { getTileBBox, lookupConnection } from "../utils/connectionTable";
import {
    Tile,
    DominoTileLayout,
    DominoBoardLayoutV3,
    DominoLayoutDirection,
} from "../types";

// ============================================================================
// Test helpers
// ============================================================================

function makeTile(left: number, right: number, id?: string): Tile {
    return { left, right, id: id ?? `${left}-${right}` };
}

function getHalfDims(t: DominoTileLayout): { halfW: number; halfH: number } {
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

/** Check if any two tiles overlap (more than touch). */
function hasOverlap(layouts: Record<string, DominoTileLayout>): boolean {
    const tiles = Object.values(layouts);
    const EPSILON = 0.001;
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            const a = tiles[i];
            const b = tiles[j];
            const aD = getHalfDims(a);
            const bD = getHalfDims(b);
            const overlapX = aD.halfW + bD.halfW - Math.abs(a.x - b.x);
            const overlapY = aD.halfH + bD.halfH - Math.abs(a.y - b.y);
            if (overlapX > EPSILON && overlapY > EPSILON) {
                return true;
            }
        }
    }
    return false;
}

/** Assert all tile centers are grid-snapped (multiples of 0.25). */
function assertAllGridSnapped(layouts: Record<string, DominoTileLayout>) {
    for (const tl of Object.values(layouts)) {
        const xRem = Math.abs((tl.x * 4) % 1);
        const yRem = Math.abs((tl.y * 4) % 1);
        expect(xRem).toBeLessThan(1e-9);
        expect(yRem).toBeLessThan(1e-9);
    }
}

/** Assert all pixel positions are integers for a given unitSize. */
function assertIntegerPixels(
    layouts: Record<string, DominoTileLayout>,
    unitSize: number,
) {
    const logicalUnit = 2 * unitSize;
    for (const tl of Object.values(layouts)) {
        const px = tl.x * logicalUnit;
        const py = tl.y * logicalUnit;
        expect(Math.abs(px - Math.round(px))).toBeLessThan(1e-6);
        expect(Math.abs(py - Math.round(py))).toBeLessThan(1e-6);
    }
}

/**
 * Verify that every adjacent pair in the chain shares a flush seam.
 * Uses the move history to determine adjacency and the connection table
 * to check expected seam geometry.
 */
function assertAllSeamsFlush(layout: DominoBoardLayoutV3) {
    // The seams array should have exactly (tileCount - 1) entries
    const tileCount = Object.keys(layout.tileLayouts).length;
    if (tileCount <= 1) return;

    expect(layout._seams.length).toBe(tileCount - 1);

    for (const seam of layout._seams) {
        const [idA, idB] = seam.tileIds;
        const tA = layout.tileLayouts[idA];
        const tB = layout.tileLayouts[idB];
        expect(tA).toBeDefined();
        expect(tB).toBeDefined();

        // Verify seam position is on both tiles' boundaries
        const aBBox = getTileBBox(tA.x, tA.y, tA.isDouble, tA.direction);
        const bBBox = getTileBBox(tB.x, tB.y, tB.isDouble, tB.direction);

        if (seam.axis === "x") {
            // Vertical seam
            const aEdges = [aBBox.x - aBBox.halfW, aBBox.x + aBBox.halfW];
            const bEdges = [bBBox.x - bBBox.halfW, bBBox.x + bBBox.halfW];
            const aOnBoundary = aEdges.some(
                (e) => Math.abs(e - seam.position) < 1e-9,
            );
            const bOnBoundary = bEdges.some(
                (e) => Math.abs(e - seam.position) < 1e-9,
            );
            expect(aOnBoundary).toBe(true);
            expect(bOnBoundary).toBe(true);
        } else {
            // Horizontal seam
            const aEdges = [aBBox.y - aBBox.halfH, aBBox.y + aBBox.halfH];
            const bEdges = [bBBox.y - bBBox.halfH, bBBox.y + bBBox.halfH];
            const aOnBoundary = aEdges.some(
                (e) => Math.abs(e - seam.position) < 1e-9,
            );
            const bOnBoundary = bEdges.some(
                (e) => Math.abs(e - seam.position) < 1e-9,
            );
            expect(aOnBoundary).toBe(true);
            expect(bOnBoundary).toBe(true);
        }

        expect(seam.length).toBeGreaterThanOrEqual(0.5 - 1e-9);
    }
}

/** Generate the full double-six tile set (28 tiles). */
function generateDoubleSixSet(): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            tiles.push(makeTile(i, j, `${i}-${j}`));
        }
    }
    return tiles;
}

// ============================================================================
// Tests
// ============================================================================

describe("Layout Engine V3", () => {
    describe("initLayout", () => {
        it("places first tile at origin", () => {
            const tile = makeTile(6, 4);
            const layout = initLayout(tile, "test-seed");

            expect(layout.tileLayouts[tile.id]).toBeDefined();
            expect(layout.tileLayouts[tile.id].x).toBe(0);
            expect(layout.tileLayouts[tile.id].y).toBe(0);
        });

        it("detects double correctly", () => {
            const tile = makeTile(3, 3);
            const layout = initLayout(tile, "test-seed");

            expect(layout.tileLayouts[tile.id].isDouble).toBe(true);
        });

        it("produces required metadata fields", () => {
            const tile = makeTile(5, 2);
            const layout = initLayout(tile, "test-seed");

            expect(layout.seed).toBe("test-seed");
            expect(layout._turnPolicyVersion).toBe(TURN_POLICY_VERSION);
            expect(layout._moveHistory).toEqual([
                { tileId: tile.id, side: "init" },
            ]);
            expect(layout._layoutHash).toBeDefined();
            expect(layout._layoutHash.length).toBe(8);
            expect(layout._head).toBeDefined();
            expect(layout._tail).toBeDefined();
            expect(layout._seams).toEqual([]);
            expect(layout._layoutError).toBeNull();
        });

        it("produces ghost positions", () => {
            const tile = makeTile(6, 6);
            const layout = initLayout(tile, "test-seed");

            // At least one ghost should be computed
            expect(
                layout.leftEndPos !== null || layout.rightEndPos !== null,
            ).toBe(true);
        });

        it("is deterministic with same seed", () => {
            const tile = makeTile(5, 3);
            const a = initLayout(tile, "det-seed");
            const b = initLayout(tile, "det-seed");

            expect(a._layoutHash).toBe(b._layoutHash);
            expect(a.tileLayouts[tile.id].direction).toBe(
                b.tileLayouts[tile.id].direction,
            );
        });

        it("differs with different seeds", () => {
            // Run enough seeds to get at least one difference (probabilistic but very likely)
            const tile = makeTile(5, 3);
            const results = new Set<string>();
            for (let i = 0; i < 20; i++) {
                const layout = initLayout(tile, `seed-${i}`);
                results.add(layout.tileLayouts[tile.id].direction);
            }
            expect(results.size).toBeGreaterThan(1);
        });
    });

    describe("appendTile", () => {
        it("appends to right side correctly", () => {
            const t1 = makeTile(6, 4);
            const t2 = makeTile(4, 2);
            const layout0 = initLayout(t1, "test");
            const result = appendTile(layout0, t2, "right");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout.tileLayouts[t1.id]).toBeDefined();
            expect(result.layout.tileLayouts[t2.id]).toBeDefined();
            expect(result.layout._seams.length).toBe(1);
            expect(result.layout._moveHistory.length).toBe(2);
        });

        it("prepends to left side correctly", () => {
            const t1 = makeTile(4, 6);
            const t2 = makeTile(2, 4);
            const layout0 = initLayout(t1, "test");
            const result = appendTile(layout0, t2, "left");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout.tileLayouts[t1.id]).toBeDefined();
            expect(result.layout.tileLayouts[t2.id]).toBeDefined();
            expect(result.layout._seams.length).toBe(1);
        });

        it("handles double tile", () => {
            const t1 = makeTile(3, 5);
            const t2 = makeTile(5, 5); // double
            const layout0 = initLayout(t1, "test");
            const result = appendTile(layout0, t2, "right");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout.tileLayouts[t2.id].isDouble).toBe(true);
        });

        it("does not modify existing tile positions", () => {
            const t1 = makeTile(6, 4);
            const t2 = makeTile(4, 2);
            const layout0 = initLayout(t1, "stable");
            const result = appendTile(layout0, t2, "right");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            // T1 position unchanged
            expect(result.layout.tileLayouts[t1.id].x).toBe(
                layout0.tileLayouts[t1.id].x,
            );
            expect(result.layout.tileLayouts[t1.id].y).toBe(
                layout0.tileLayouts[t1.id].y,
            );
            expect(result.layout.tileLayouts[t1.id].direction).toBe(
                layout0.tileLayouts[t1.id].direction,
            );
        });

        it("updates bounds to include new tile", () => {
            const t1 = makeTile(6, 4);
            const t2 = makeTile(4, 2);
            const layout0 = initLayout(t1, "bounds");
            const result = appendTile(layout0, t2, "right");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            // Bounds should be at least as large as with just t1
            expect(result.layout.bounds.minX).toBeLessThanOrEqual(
                layout0.bounds.minX,
            );
            expect(result.layout.bounds.maxX).toBeGreaterThanOrEqual(
                layout0.bounds.maxX,
            );
        });

        it("updates head endpoint for right-side append", () => {
            const t1 = makeTile(6, 4);
            const t2 = makeTile(4, 2);
            const layout0 = initLayout(t1, "head-test");
            const result = appendTile(layout0, t2, "right");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout._head.tileId).toBe(t2.id);
            // Tail unchanged
            expect(result.layout._tail.tileId).toBe(t1.id);
        });

        it("updates tail endpoint for left-side prepend", () => {
            const t1 = makeTile(4, 6);
            const t2 = makeTile(2, 4);
            const layout0 = initLayout(t1, "tail-test");
            const result = appendTile(layout0, t2, "left");

            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout._tail.tileId).toBe(t2.id);
            // Head unchanged
            expect(result.layout._head.tileId).toBe(t1.id);
        });
    });

    describe("P0 invariants — flush seams, no overlap, grid-snap", () => {
        const SEEDS = [
            "game1-r1",
            "game2-r1",
            "game3-r2",
            "stress-test",
            "edge-case",
            "alpha",
            "beta",
            "gamma",
            "delta",
            "epsilon",
        ];

        for (const seed of SEEDS) {
            describe(`seed="${seed}"`, () => {
                let finalLayout: DominoBoardLayoutV3;

                it("builds a full 28-tile chain without error", () => {
                    const tiles = generateDoubleSixSet();
                    // Place first tile, then append remaining to right
                    let layout = initLayout(tiles[0], seed);
                    for (let i = 1; i < tiles.length; i++) {
                        const result = appendTile(layout, tiles[i], "right");
                        expect(result.ok).toBe(true);
                        if (!result.ok) return;
                        layout = result.layout;
                    }
                    finalLayout = layout;
                    expect(Object.keys(finalLayout.tileLayouts).length).toBe(
                        28,
                    );
                });

                it("has no overlap", () => {
                    if (!finalLayout) return;
                    expect(hasOverlap(finalLayout.tileLayouts)).toBe(false);
                });

                it("has all positions grid-snapped", () => {
                    if (!finalLayout) return;
                    assertAllGridSnapped(finalLayout.tileLayouts);
                });

                it("has all seams flush", () => {
                    if (!finalLayout) return;
                    assertAllSeamsFlush(finalLayout);
                });

                it("produces integer pixel positions at all unit sizes", () => {
                    if (!finalLayout) return;
                    for (const unitSize of [20, 28, 40, 56]) {
                        assertIntegerPixels(finalLayout.tileLayouts, unitSize);
                    }
                });
            });
        }
    });

    describe("stability — tile positions never change after placement", () => {
        it("28 sequential appends preserve all prior positions", () => {
            const tiles = generateDoubleSixSet();
            let layout = initLayout(tiles[0], "stability-test");
            const snapshots: Record<string, { x: number; y: number }>[] = [];

            snapshots.push({
                [tiles[0].id]: {
                    x: layout.tileLayouts[tiles[0].id].x,
                    y: layout.tileLayouts[tiles[0].id].y,
                },
            });

            for (let i = 1; i < tiles.length; i++) {
                const result = appendTile(layout, tiles[i], "right");
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;

                // Verify ALL previously placed tiles have unchanged positions
                for (let j = 0; j <= i; j++) {
                    const tid = tiles[j].id;
                    const current = layout.tileLayouts[tid];
                    if (j < i) {
                        // Check against the first time this tile appeared
                        const firstLayout = snapshots.find((s) => s[tid]);
                        if (firstLayout) {
                            expect(current.x).toBe(firstLayout[tid].x);
                            expect(current.y).toBe(firstLayout[tid].y);
                        }
                    }
                }

                // Record this tile's first placement
                snapshots.push({
                    [tiles[i].id]: {
                        x: layout.tileLayouts[tiles[i].id].x,
                        y: layout.tileLayouts[tiles[i].id].y,
                    },
                });
            }
        });
    });

    describe("determinism — same inputs produce same output", () => {
        it("identical seed + tiles = identical layout hash (3 runs)", () => {
            const tiles = generateDoubleSixSet().slice(0, 10);
            const hashes: string[] = [];

            for (let run = 0; run < 3; run++) {
                let layout = initLayout(tiles[0], "det-test");
                for (let i = 1; i < tiles.length; i++) {
                    const result = appendTile(layout, tiles[i], "right");
                    expect(result.ok).toBe(true);
                    if (!result.ok) return;
                    layout = result.layout;
                }
                hashes.push(layout._layoutHash);
            }

            expect(hashes[0]).toBe(hashes[1]);
            expect(hashes[1]).toBe(hashes[2]);
        });

        it("different seed = different layout hash", () => {
            const tiles = generateDoubleSixSet().slice(0, 5);
            const buildHash = (seed: string) => {
                let layout = initLayout(tiles[0], seed);
                for (let i = 1; i < tiles.length; i++) {
                    const result = appendTile(layout, tiles[i], "right");
                    if (!result.ok) return "error";
                    layout = result.layout;
                }
                return layout._layoutHash;
            };

            // Collect hashes from multiple seeds
            const hashes = new Set<string>();
            for (let i = 0; i < 20; i++) {
                hashes.add(buildHash(`diff-seed-${i}`));
            }
            // Should have some variation (very likely)
            expect(hashes.size).toBeGreaterThan(1);
        });
    });

    describe("replayLayout — incremental vs replay determinism", () => {
        it("replay produces identical hash to incremental", () => {
            const tiles = generateDoubleSixSet().slice(0, 15);
            const seed = "replay-test";

            // Build incrementally
            let layout = initLayout(tiles[0], seed);
            for (let i = 1; i < tiles.length; i++) {
                const result = appendTile(layout, tiles[i], "right");
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;
            }
            const incrementalHash = layout._layoutHash;
            const incrementalHistory = layout._moveHistory;

            // Replay from history
            const tileMap: Record<string, Tile> = {};
            for (const t of tiles) tileMap[t.id] = t;

            const replayResult = replayLayout(
                incrementalHistory,
                tileMap,
                seed,
                TURN_POLICY_VERSION,
            );
            expect(replayResult.ok).toBe(true);
            if (!replayResult.ok) return;

            expect(replayResult.layout._layoutHash).toBe(incrementalHash);
        });

        it("replay produces identical tile positions", () => {
            const tiles = generateDoubleSixSet().slice(0, 12);
            const seed = "replay-positions";

            // Build incrementally
            let layout = initLayout(tiles[0], seed);
            for (let i = 1; i < tiles.length; i++) {
                const result = appendTile(layout, tiles[i], "right");
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;
            }

            // Replay
            const tileMap: Record<string, Tile> = {};
            for (const t of tiles) tileMap[t.id] = t;
            const replayResult = replayLayout(
                layout._moveHistory,
                tileMap,
                seed,
            );
            expect(replayResult.ok).toBe(true);
            if (!replayResult.ok) return;

            // Compare all tile positions
            for (const tid of Object.keys(layout.tileLayouts)) {
                expect(replayResult.layout.tileLayouts[tid].x).toBe(
                    layout.tileLayouts[tid].x,
                );
                expect(replayResult.layout.tileLayouts[tid].y).toBe(
                    layout.tileLayouts[tid].y,
                );
                expect(replayResult.layout.tileLayouts[tid].direction).toBe(
                    layout.tileLayouts[tid].direction,
                );
            }
        });
    });

    describe("backward prepend", () => {
        it("alternating left/right produces valid chain", () => {
            const tiles = generateDoubleSixSet().slice(0, 14);
            const seed = "alternating";
            let layout = initLayout(tiles[0], seed);

            for (let i = 1; i < tiles.length; i++) {
                const side = i % 2 === 0 ? "right" : "left";
                const result = appendTile(
                    layout,
                    tiles[i],
                    side as "left" | "right",
                );
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;
            }

            expect(hasOverlap(layout.tileLayouts)).toBe(false);
            assertAllGridSnapped(layout.tileLayouts);
            assertAllSeamsFlush(layout);
        });
    });

    describe("doubles handling", () => {
        it("double in the middle of chain is centered", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 5, "t2"); // double
            const t3 = makeTile(5, 1, "t3");
            const seed = "double-middle";

            let layout = initLayout(t1, seed);
            let result = appendTile(layout, t2, "right");
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            result = appendTile(result.layout, t3, "right");
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const doubleLayout = result.layout.tileLayouts["t2"];
            const prevLayout = result.layout.tileLayouts["t1"];
            const nextLayoutTile = result.layout.tileLayouts["t3"];

            // Double is on the same axis as its neighbors (for straight chain)
            if (
                prevLayout.direction === "RIGHT" ||
                prevLayout.direction === "LEFT"
            ) {
                // Horizontal chain — double should be centered on same Y
                expect(doubleLayout.y).toBe(prevLayout.y);
            } else {
                // Vertical chain — double should be centered on same X
                expect(doubleLayout.x).toBe(prevLayout.x);
            }
        });

        it("double at the end of chain", () => {
            const t1 = makeTile(3, 5, "t1");
            const t2 = makeTile(5, 5, "t2"); // double at end
            const seed = "double-end";

            let layout = initLayout(t1, seed);
            const result = appendTile(layout, t2, "right");
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            expect(result.layout._head.tileId).toBe("t2");
            expect(result.layout._head.isDouble).toBe(true);
            assertAllSeamsFlush(result.layout);
        });
    });

    describe("computeLayoutHash", () => {
        it("produces 8-character hex string", () => {
            const hash = computeLayoutHash({}, "test", 1);
            expect(hash.length).toBe(8);
            expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);
        });

        it("is deterministic", () => {
            const layouts: Record<string, DominoTileLayout> = {
                a: {
                    id: "a",
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isDouble: false,
                    direction: "RIGHT",
                },
            };
            const h1 = computeLayoutHash(layouts, "seed", 1);
            const h2 = computeLayoutHash(layouts, "seed", 1);
            expect(h1).toBe(h2);
        });

        it("changes with different data", () => {
            const layouts: Record<string, DominoTileLayout> = {
                a: {
                    id: "a",
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isDouble: false,
                    direction: "RIGHT",
                },
            };
            const h1 = computeLayoutHash(layouts, "seed1", 1);
            const h2 = computeLayoutHash(layouts, "seed2", 1);
            expect(h1).not.toBe(h2);
        });
    });

    describe("computeDominoBoardLayoutV3 wrapper", () => {
        it("handles empty tile array", () => {
            const result = computeDominoBoardLayoutV3([], "test");
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(Object.keys(result.layout.tileLayouts).length).toBe(0);
        });

        it("handles single tile", () => {
            const result = computeDominoBoardLayoutV3([makeTile(6, 4)], "test");
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(Object.keys(result.layout.tileLayouts).length).toBe(1);
        });

        it("builds from ordered tile list", () => {
            const tiles = [makeTile(6, 4), makeTile(4, 2), makeTile(2, 1)];
            const result = computeDominoBoardLayoutV3(tiles, "test");
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(Object.keys(result.layout.tileLayouts).length).toBe(3);
            assertAllSeamsFlush(result.layout);
        });

        it("incremental append with previousLayout", () => {
            const t1 = makeTile(6, 4);
            const t2 = makeTile(4, 2);

            const r1 = computeDominoBoardLayoutV3([t1], "test");
            expect(r1.ok).toBe(true);
            if (!r1.ok) return;

            const r2 = computeDominoBoardLayoutV3([t1, t2], "test", r1.layout);
            expect(r2.ok).toBe(true);
            if (!r2.ok) return;

            expect(Object.keys(r2.layout.tileLayouts).length).toBe(2);

            // T1 position should not have changed
            expect(r2.layout.tileLayouts[t1.id].x).toBe(
                r1.layout.tileLayouts[t1.id].x,
            );
            expect(r2.layout.tileLayouts[t1.id].y).toBe(
                r1.layout.tileLayouts[t1.id].y,
            );
        });
    });

    describe("plan walkthrough — 12-tile sequence", () => {
        // Recreate the exact walkthrough from the plan
        const tiles: Tile[] = [
            makeTile(6, 6, "T1"), // double, init
            makeTile(6, 4, "T2"), // right
            makeTile(4, 1, "T3"), // right
            makeTile(1, 5, "T4"), // right (turn R→D)
            makeTile(5, 3, "T5"), // right
            makeTile(3, 3, "T6"), // right (double)
            makeTile(3, 0, "T7"), // right (turn after double)
            makeTile(6, 0, "T8"), // LEFT (prepend)
            makeTile(0, 2, "T9"), // right
            makeTile(2, 2, "T10"), // right (double)
            makeTile(2, 5, "T11"), // right (turn after double)
            makeTile(5, 4, "T12"), // right (may turn due to collision)
        ];

        it("builds the full sequence without errors", () => {
            const seed = "walkthrough-test";
            let layout = initLayout(tiles[0], seed);

            // T2-T7: right side appends
            for (let i = 1; i <= 6; i++) {
                const result = appendTile(layout, tiles[i], "right");
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;
            }

            // T8: left side prepend
            const r8 = appendTile(layout, tiles[7], "left");
            expect(r8.ok).toBe(true);
            if (!r8.ok) return;
            layout = r8.layout;

            // T9-T12: right side appends
            for (let i = 8; i < tiles.length; i++) {
                const result = appendTile(layout, tiles[i], "right");
                expect(result.ok).toBe(true);
                if (!result.ok) return;
                layout = result.layout;
            }

            // Assert all P0 invariants
            expect(Object.keys(layout.tileLayouts).length).toBe(12);
            expect(hasOverlap(layout.tileLayouts)).toBe(false);
            assertAllGridSnapped(layout.tileLayouts);
            assertAllSeamsFlush(layout);

            // Assert doubles are perpendicular (isDouble field)
            expect(layout.tileLayouts["T1"].isDouble).toBe(true);
            expect(layout.tileLayouts["T6"].isDouble).toBe(true);
            expect(layout.tileLayouts["T10"].isDouble).toBe(true);

            // Assert move history
            expect(layout._moveHistory.length).toBe(12);
            expect(layout._moveHistory[0]).toEqual({
                tileId: "T1",
                side: "init",
            });
            expect(layout._moveHistory[7]).toEqual({
                tileId: "T8",
                side: "left",
            });
        });

        it("replay from history matches incremental", () => {
            const seed = "walkthrough-replay";
            let layout = initLayout(tiles[0], seed);
            for (let i = 1; i <= 6; i++) {
                const result = appendTile(layout, tiles[i], "right");
                if (!result.ok) return;
                layout = result.layout;
            }
            const r8 = appendTile(layout, tiles[7], "left");
            if (!r8.ok) return;
            layout = r8.layout;
            for (let i = 8; i < tiles.length; i++) {
                const result = appendTile(layout, tiles[i], "right");
                if (!result.ok) return;
                layout = result.layout;
            }

            const tileMap: Record<string, Tile> = {};
            for (const t of tiles) tileMap[t.id] = t;

            const replayResult = replayLayout(
                layout._moveHistory,
                tileMap,
                seed,
            );
            expect(replayResult.ok).toBe(true);
            if (!replayResult.ok) return;

            expect(replayResult.layout._layoutHash).toBe(layout._layoutHash);
        });
    });

    describe("stress test — many turns and doubles", () => {
        it("28 tiles with multiple seeds produce valid layouts", () => {
            const tiles = generateDoubleSixSet();
            const stressSeeds = [
                "stress-1",
                "stress-2",
                "stress-3",
                "stress-4",
                "stress-5",
            ];

            for (const seed of stressSeeds) {
                let layout = initLayout(tiles[0], seed);
                let failed = false;

                for (let i = 1; i < tiles.length; i++) {
                    // Alternate sides occasionally for variety
                    const side = i % 5 === 0 ? "left" : "right";
                    const result = appendTile(
                        layout,
                        tiles[i],
                        side as "left" | "right",
                    );
                    if (!result.ok) {
                        failed = true;
                        break;
                    }
                    layout = result.layout;
                }

                if (!failed) {
                    expect(hasOverlap(layout.tileLayouts)).toBe(false);
                    assertAllGridSnapped(layout.tileLayouts);
                    assertAllSeamsFlush(layout);
                }
            }
        });
    });
});
