import { describe, it, expect } from "vitest";
import {
    getConnectionTable,
    lookupConnection,
    connectionKey,
    validNextDirections,
    getTileBBox,
    reverseDirection,
    isHorizontalDir,
    ConnectionOffset,
    TileBBox,
} from "../utils/connectionTable";
import { DominoLayoutDirection } from "../types";

// ============================================================================
// Helpers
// ============================================================================

function bboxEdges(bbox: TileBBox) {
    return {
        left: bbox.x - bbox.halfW,
        right: bbox.x + bbox.halfW,
        top: bbox.y - bbox.halfH,
        bottom: bbox.y + bbox.halfH,
    };
}

/**
 * Verify that two tiles connected by an offset share a flush seam:
 * - The shared edge has the expected length
 * - Tiles touch but do not overlap (zero gap, zero overlap)
 */
function verifyFlushSeam(
    prevCenter: { x: number; y: number },
    prevIsDouble: boolean,
    prevDir: DominoLayoutDirection,
    nextCenter: { x: number; y: number },
    nextIsDouble: boolean,
    nextDir: DominoLayoutDirection,
    offset: ConnectionOffset,
) {
    const prevBBox = getTileBBox(
        prevCenter.x,
        prevCenter.y,
        prevIsDouble,
        prevDir,
    );
    const nextBBox = getTileBBox(
        nextCenter.x,
        nextCenter.y,
        nextIsDouble,
        nextDir,
    );

    const prev = bboxEdges(prevBBox);
    const next = bboxEdges(nextBBox);

    if (offset.seamAxis === "x") {
        // Vertical seam line at x = prevCenter.x + offset.seamPos
        const seamX = prevCenter.x + offset.seamPos;

        // The seam X must be on the boundary of both tiles
        const prevOnBoundary =
            Math.abs(seamX - prev.left) < 1e-9 ||
            Math.abs(seamX - prev.right) < 1e-9;
        const nextOnBoundary =
            Math.abs(seamX - next.left) < 1e-9 ||
            Math.abs(seamX - next.right) < 1e-9;

        expect(prevOnBoundary).toBe(true);
        expect(nextOnBoundary).toBe(true);

        // Shared Y range
        const overlapTop = Math.max(prev.top, next.top);
        const overlapBottom = Math.min(prev.bottom, next.bottom);
        const sharedLength = overlapBottom - overlapTop;

        expect(sharedLength).toBeCloseTo(offset.seamLength, 9);
        expect(sharedLength).toBeGreaterThanOrEqual(0.5 - 1e-9);

        // No horizontal overlap (touching only)
        const xOverlap =
            Math.min(prev.right, next.right) - Math.max(prev.left, next.left);
        expect(xOverlap).toBeCloseTo(0, 9);
    } else {
        // Horizontal seam line at y = prevCenter.y + offset.seamPos
        const seamY = prevCenter.y + offset.seamPos;

        const prevOnBoundary =
            Math.abs(seamY - prev.top) < 1e-9 ||
            Math.abs(seamY - prev.bottom) < 1e-9;
        const nextOnBoundary =
            Math.abs(seamY - next.top) < 1e-9 ||
            Math.abs(seamY - next.bottom) < 1e-9;

        expect(prevOnBoundary).toBe(true);
        expect(nextOnBoundary).toBe(true);

        // Shared X range
        const overlapLeft = Math.max(prev.left, next.left);
        const overlapRight = Math.min(prev.right, next.right);
        const sharedLength = overlapRight - overlapLeft;

        expect(sharedLength).toBeCloseTo(offset.seamLength, 9);
        expect(sharedLength).toBeGreaterThanOrEqual(0.5 - 1e-9);

        // No vertical overlap (touching only)
        const yOverlap =
            Math.min(prev.bottom, next.bottom) - Math.max(prev.top, next.top);
        expect(yOverlap).toBeCloseTo(0, 9);
    }
}

/** Assert a value is an exact multiple of 0.25 */
function assertGridSnapped(val: number, label: string) {
    const remainder = Math.abs((val * 4) % 1);
    expect(remainder).toBeLessThan(1e-9);
}

// ============================================================================
// Tests
// ============================================================================

describe("Connection Table", () => {
    const table = getConnectionTable();

    describe("table structure", () => {
        it("contains entries for all straight connections", () => {
            const dirs: DominoLayoutDirection[] = [
                "RIGHT",
                "LEFT",
                "DOWN",
                "UP",
            ];
            const types: [boolean, boolean][] = [
                [false, false],
                [false, true],
                [true, false],
                [true, true],
            ];
            for (const dir of dirs) {
                for (const [pD, nD] of types) {
                    const key = connectionKey(dir, dir, pD, nD);
                    expect(table[key]).toBeDefined();
                }
            }
        });

        it("contains entries for all perpendicular turns", () => {
            const turns: [DominoLayoutDirection, DominoLayoutDirection][] = [
                ["RIGHT", "DOWN"],
                ["RIGHT", "UP"],
                ["LEFT", "DOWN"],
                ["LEFT", "UP"],
                ["DOWN", "RIGHT"],
                ["DOWN", "LEFT"],
                ["UP", "RIGHT"],
                ["UP", "LEFT"],
            ];
            const types: [boolean, boolean][] = [
                [false, false],
                [false, true],
                [true, false],
                [true, true],
            ];
            for (const [pDir, nDir] of turns) {
                for (const [pD, nD] of types) {
                    const key = connectionKey(pDir, nDir, pD, nD);
                    expect(table[key]).toBeDefined();
                }
            }
        });

        it("does NOT contain reverse direction entries", () => {
            const reverses: [DominoLayoutDirection, DominoLayoutDirection][] = [
                ["RIGHT", "LEFT"],
                ["LEFT", "RIGHT"],
                ["DOWN", "UP"],
                ["UP", "DOWN"],
            ];
            for (const [pDir, nDir] of reverses) {
                const key = connectionKey(pDir, nDir, false, false);
                expect(table[key]).toBeUndefined();
            }
        });

        it("is frozen", () => {
            expect(Object.isFrozen(table)).toBe(true);
            for (const v of Object.values(table)) {
                expect(Object.isFrozen(v)).toBe(true);
            }
        });
    });

    describe("all offsets are grid-snapped (multiples of 0.25)", () => {
        for (const [key, offset] of Object.entries(table)) {
            it(`${key} has grid-snapped dx, dy, seamPos`, () => {
                assertGridSnapped(offset.dx, `${key}.dx`);
                assertGridSnapped(offset.dy, `${key}.dy`);
                assertGridSnapped(offset.seamPos, `${key}.seamPos`);
            });
        }
    });

    describe("every entry produces flush seam (zero gap, zero overlap)", () => {
        for (const [key, offset] of Object.entries(table)) {
            it(`${key} produces flush seam`, () => {
                // Parse the key to get directions and types
                const [prevDirStr, nextDirStr, prevTypeStr, nextTypeStr] =
                    key.split(":");
                const prevDir = prevDirStr as DominoLayoutDirection;
                const nextDir = nextDirStr as DominoLayoutDirection;
                const prevIsDouble = prevTypeStr === "d";
                const nextIsDouble = nextTypeStr === "d";

                const prevCenter = { x: 0, y: 0 };
                const nextCenter = {
                    x: prevCenter.x + offset.dx,
                    y: prevCenter.y + offset.dy,
                };

                verifyFlushSeam(
                    prevCenter,
                    prevIsDouble,
                    prevDir,
                    nextCenter,
                    nextIsDouble,
                    nextDir,
                    offset,
                );
            });
        }
    });

    describe("seam length is at least 0.5 for all entries", () => {
        for (const [key, offset] of Object.entries(table)) {
            it(`${key} seamLength >= 0.5`, () => {
                expect(offset.seamLength).toBeGreaterThanOrEqual(0.5);
            });
        }
    });

    describe("straight connections have zero perpendicular offset", () => {
        const dirs: DominoLayoutDirection[] = ["RIGHT", "LEFT", "DOWN", "UP"];
        for (const dir of dirs) {
            for (const pD of [false, true]) {
                for (const nD of [false, true]) {
                    const key = connectionKey(dir, dir, pD, nD);
                    it(`${key} has zero perpendicular offset`, () => {
                        const offset = table[key];
                        if (isHorizontalDir(dir)) {
                            expect(offset.dy).toBe(0);
                        } else {
                            expect(offset.dx).toBe(0);
                        }
                    });
                }
            }
        }
    });

    describe("turn connections have correct axis alignment", () => {
        it("horizontal→vertical turns have Y-axis seams", () => {
            const hDirs: DominoLayoutDirection[] = ["RIGHT", "LEFT"];
            const vDirs: DominoLayoutDirection[] = ["DOWN", "UP"];
            for (const h of hDirs) {
                for (const v of vDirs) {
                    const offset = lookupConnection(h, v, false, false)!;
                    expect(offset.seamAxis).toBe("y");
                }
            }
        });

        it("vertical→horizontal turns have X-axis seams", () => {
            const hDirs: DominoLayoutDirection[] = ["RIGHT", "LEFT"];
            const vDirs: DominoLayoutDirection[] = ["DOWN", "UP"];
            for (const v of vDirs) {
                for (const h of hDirs) {
                    const offset = lookupConnection(v, h, false, false)!;
                    expect(offset.seamAxis).toBe("x");
                }
            }
        });
    });

    describe("symmetry checks", () => {
        it("RIGHT:RIGHT and LEFT:LEFT are mirror images", () => {
            for (const pD of [false, true]) {
                for (const nD of [false, true]) {
                    const r = lookupConnection("RIGHT", "RIGHT", pD, nD)!;
                    const l = lookupConnection("LEFT", "LEFT", pD, nD)!;
                    expect(r.dx).toBe(-l.dx);
                    expect(r.dy).toBe(l.dy);
                    expect(r.seamLength).toBe(l.seamLength);
                }
            }
        });

        it("DOWN:DOWN and UP:UP are mirror images", () => {
            for (const pD of [false, true]) {
                for (const nD of [false, true]) {
                    const d = lookupConnection("DOWN", "DOWN", pD, nD)!;
                    const u = lookupConnection("UP", "UP", pD, nD)!;
                    expect(d.dx).toBe(u.dx);
                    expect(d.dy).toBe(-u.dy);
                    expect(d.seamLength).toBe(u.seamLength);
                }
            }
        });
    });

    describe("double centering", () => {
        it("doubles stay centered on the chain axis (straight)", () => {
            // A double going RIGHT should be centered on the same Y as prev tile
            const offset = lookupConnection("RIGHT", "RIGHT", false, true)!;
            // dy should be 0 (same axis)
            expect(offset.dy).toBe(0);
        });

        it("doubles at turns remain centered on new axis", () => {
            // reg→dbl turn RIGHT→DOWN
            const offset = lookupConnection("RIGHT", "DOWN", false, true)!;
            // The double going DOWN is wider — offset to prev's far edge so
            // shared seam = 0.5 (half the prev face)
            expect(offset.dx).toBe(0.5);
        });
    });

    describe("lookupConnection", () => {
        it("returns undefined for reverse directions", () => {
            expect(
                lookupConnection("RIGHT", "LEFT", false, false),
            ).toBeUndefined();
            expect(
                lookupConnection("UP", "DOWN", false, false),
            ).toBeUndefined();
        });

        it("returns correct offset for known connections", () => {
            const offset = lookupConnection("RIGHT", "RIGHT", false, false)!;
            expect(offset.dx).toBe(1.0);
            expect(offset.dy).toBe(0);
        });
    });

    describe("validNextDirections", () => {
        it("returns straight + 2 perpendiculars", () => {
            const dirs = validNextDirections("RIGHT");
            expect(dirs).toEqual(["RIGHT", "DOWN", "UP"]);
        });

        it("never includes reverse", () => {
            const allDirs: DominoLayoutDirection[] = [
                "RIGHT",
                "LEFT",
                "DOWN",
                "UP",
            ];
            for (const dir of allDirs) {
                const result = validNextDirections(dir);
                expect(result).not.toContain(reverseDirection(dir));
            }
        });
    });
});
