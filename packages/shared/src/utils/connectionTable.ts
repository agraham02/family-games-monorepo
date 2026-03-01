/**
 * Connection Offset Table — Domino Layout Engine v3
 *
 * Precomputed, frozen lookup table for all valid tile-to-tile connection geometries.
 * Each entry defines the exact center-to-center offset when placing a new tile
 * next to an existing tile.
 *
 * Key: `"${prevDir}:${nextDir}:${prevIsDouble ? 'd' : 'r'}:${nextIsDouble ? 'd' : 'r'}"`
 * Value: { dx, dy, seamAxis, seamPos, seamLength }
 *
 * All offset values are exact multiples of 0.25, ensuring grid-snapped positions.
 * The table is the single source of truth for all geometry in the layout engine.
 */

import { DominoLayoutDirection } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ConnectionOffset {
    /** Center-to-center X offset: nextCenter.x = prevCenter.x + dx */
    dx: number;
    /** Center-to-center Y offset: nextCenter.y = prevCenter.y + dy */
    dy: number;
    /** Axis the seam lies on: 'x' means the seam is a vertical line at x=seamPos,
     *  'y' means the seam is a horizontal line at y=seamPos. */
    seamAxis: "x" | "y";
    /**
     * Seam offset from prevCenter. The seam position in world space is:
     *   seamAxis === 'x' ? prevCenter.x + seamPos : prevCenter.y + seamPos
     */
    seamPos: number;
    /** Length of the shared seam edge in logical units. */
    seamLength: number;
}

export type ConnectionKey = string;

/**
 * Build a canonical key for the connection table.
 */
export function connectionKey(
    prevDir: DominoLayoutDirection,
    nextDir: DominoLayoutDirection,
    prevIsDouble: boolean,
    nextIsDouble: boolean,
): ConnectionKey {
    return `${prevDir}:${nextDir}:${prevIsDouble ? "d" : "r"}:${nextIsDouble ? "d" : "r"}`;
}

// ============================================================================
// Tile bounding box helpers (re-exported for shared use)
// ============================================================================

export interface TileBBox {
    x: number;
    y: number;
    halfW: number;
    halfH: number;
}

/**
 * Compute the axis-aligned bounding box for a tile at (x, y).
 */
export function getTileBBox(
    x: number,
    y: number,
    isDouble: boolean,
    direction: DominoLayoutDirection,
): TileBBox {
    const isHorizontal = direction === "RIGHT" || direction === "LEFT";
    let halfW: number;
    let halfH: number;
    if (isHorizontal) {
        halfW = isDouble ? 0.25 : 0.5;
        halfH = isDouble ? 0.5 : 0.25;
    } else {
        halfW = isDouble ? 0.5 : 0.25;
        halfH = isDouble ? 0.25 : 0.5;
    }
    return { x, y, halfW, halfH };
}

// ============================================================================
// CSS rotation helper
// ============================================================================

/**
 * Compute the CSS rotation in degrees for rendering a tile.
 * Tiles are drawn in a "natural" vertical orientation (short side = width),
 * then rotated to their layout direction.
 */
export function getRotation(
    direction: DominoLayoutDirection,
    isDouble: boolean,
): number {
    if (direction === "RIGHT") return isDouble ? 90 : 0;
    if (direction === "LEFT") return isDouble ? 90 : 180;
    if (direction === "DOWN") return isDouble ? 0 : 90;
    if (direction === "UP") return isDouble ? 0 : 270;
    return 0;
}

// ============================================================================
// Direction helpers
// ============================================================================

export function reverseDirection(
    dir: DominoLayoutDirection,
): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "LEFT";
        case "LEFT":
            return "RIGHT";
        case "UP":
            return "DOWN";
        case "DOWN":
            return "UP";
    }
}

export function isHorizontalDir(dir: DominoLayoutDirection): boolean {
    return dir === "RIGHT" || dir === "LEFT";
}

export function perpendicularCW(
    dir: DominoLayoutDirection,
): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "DOWN";
        case "DOWN":
            return "LEFT";
        case "LEFT":
            return "UP";
        case "UP":
            return "RIGHT";
    }
}

export function perpendicularCCW(
    dir: DominoLayoutDirection,
): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "UP";
        case "UP":
            return "LEFT";
        case "LEFT":
            return "DOWN";
        case "DOWN":
            return "RIGHT";
    }
}

// ============================================================================
// Connection Offset Table
// ============================================================================

/**
 * The canonical Connection Offset Table.
 *
 * Naming convention: prevDir:nextDir:prevType:nextType
 *   prevDir/nextDir: RIGHT, LEFT, DOWN, UP
 *   prevType/nextType: 'r' = regular, 'd' = double
 *
 * STRAIGHT connections: prevDir === nextDir
 * TURN connections: nextDir ⊥ prevDir (90° only)
 * REVERSE connections: NOT SUPPORTED (excluded by design)
 *
 * Each offset is verified by the unit test suite to produce:
 * - Zero gap between adjacent tiles (shared seam edge)
 * - Zero overlap (touching at edge only)
 * - All values multiples of 0.25
 */
const TABLE: Record<ConnectionKey, ConnectionOffset> = {
    // ========================================================================
    // STRAIGHT — RIGHT
    // ========================================================================
    // reg→reg: two 1.0×0.5 tiles side by side, both horizontal
    "RIGHT:RIGHT:r:r": {
        dx: 1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    // reg→dbl: regular (1.0×0.5) then double (0.5×1.0), horizontal
    "RIGHT:RIGHT:r:d": {
        dx: 0.75,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    // dbl→reg: double (0.5×1.0) then regular (1.0×0.5), horizontal
    "RIGHT:RIGHT:d:r": {
        dx: 0.75,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    // dbl→dbl: would require two consecutive doubles — impossible in valid play but included for completeness
    "RIGHT:RIGHT:d:d": {
        dx: 0.5,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 1.0,
    },

    // ========================================================================
    // STRAIGHT — LEFT
    // ========================================================================
    "LEFT:LEFT:r:r": {
        dx: -1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "LEFT:LEFT:r:d": {
        dx: -0.75,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "LEFT:LEFT:d:r": {
        dx: -0.75,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "LEFT:LEFT:d:d": {
        dx: -0.5,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 1.0,
    },

    // ========================================================================
    // STRAIGHT — DOWN
    // ========================================================================
    "DOWN:DOWN:r:r": {
        dx: 0,
        dy: 1.0,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "DOWN:DOWN:r:d": {
        dx: 0,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "DOWN:DOWN:d:r": {
        dx: 0,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "DOWN:DOWN:d:d": {
        dx: 0,
        dy: 0.5,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 1.0,
    },

    // ========================================================================
    // STRAIGHT — UP
    // ========================================================================
    "UP:UP:r:r": {
        dx: 0,
        dy: -1.0,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "UP:UP:r:d": {
        dx: 0,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "UP:UP:d:r": {
        dx: 0,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "UP:UP:d:d": {
        dx: 0,
        dy: -0.5,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 1.0,
    },

    // ========================================================================
    // TURN — RIGHT → DOWN / RIGHT → UP
    // ========================================================================
    // reg→reg turn
    "RIGHT:DOWN:r:r": {
        dx: 0.25,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "RIGHT:UP:r:r": {
        dx: 0.25,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    // reg→dbl turn (double at turn is wider, center shifted to prev's far edge)
    "RIGHT:DOWN:r:d": {
        dx: 0.5,
        dy: 0.5,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "RIGHT:UP:r:d": {
        dx: 0.5,
        dy: -0.5,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    // dbl→reg turn (turn AFTER double — double is taller, larger dy)
    "RIGHT:DOWN:d:r": {
        dx: 0,
        dy: 1.0,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "RIGHT:UP:d:r": {
        dx: 0,
        dy: -1.0,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    // dbl→dbl turn (impossible in practice)
    "RIGHT:DOWN:d:d": {
        dx: 0.25,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "RIGHT:UP:d:d": {
        dx: 0.25,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },

    // ========================================================================
    // TURN — LEFT → DOWN / LEFT → UP
    // ========================================================================
    "LEFT:DOWN:r:r": {
        dx: -0.25,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "LEFT:UP:r:r": {
        dx: -0.25,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "LEFT:DOWN:r:d": {
        dx: -0.5,
        dy: 0.5,
        seamAxis: "y",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "LEFT:UP:r:d": {
        dx: -0.5,
        dy: -0.5,
        seamAxis: "y",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "LEFT:DOWN:d:r": {
        dx: 0,
        dy: 1.0,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "LEFT:UP:d:r": {
        dx: 0,
        dy: -1.0,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "LEFT:DOWN:d:d": {
        dx: -0.25,
        dy: 0.75,
        seamAxis: "y",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "LEFT:UP:d:d": {
        dx: -0.25,
        dy: -0.75,
        seamAxis: "y",
        seamPos: -0.5,
        seamLength: 0.5,
    },

    // ========================================================================
    // TURN — DOWN → RIGHT / DOWN → LEFT
    // ========================================================================
    "DOWN:RIGHT:r:r": {
        dx: 0.75,
        dy: 0.25,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "DOWN:LEFT:r:r": {
        dx: -0.75,
        dy: 0.25,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "DOWN:RIGHT:r:d": {
        dx: 0.5,
        dy: 0.5,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "DOWN:LEFT:r:d": {
        dx: -0.5,
        dy: 0.5,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "DOWN:RIGHT:d:r": {
        dx: 1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "DOWN:LEFT:d:r": {
        dx: -1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "DOWN:RIGHT:d:d": {
        dx: 0.75,
        dy: 0.25,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "DOWN:LEFT:d:d": {
        dx: -0.75,
        dy: 0.25,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },

    // ========================================================================
    // TURN — UP → RIGHT / UP → LEFT
    // ========================================================================
    "UP:RIGHT:r:r": {
        dx: 0.75,
        dy: -0.25,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "UP:LEFT:r:r": {
        dx: -0.75,
        dy: -0.25,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "UP:RIGHT:r:d": {
        dx: 0.5,
        dy: -0.5,
        seamAxis: "x",
        seamPos: 0.25,
        seamLength: 0.5,
    },
    "UP:LEFT:r:d": {
        dx: -0.5,
        dy: -0.5,
        seamAxis: "x",
        seamPos: -0.25,
        seamLength: 0.5,
    },
    "UP:RIGHT:d:r": {
        dx: 1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "UP:LEFT:d:r": {
        dx: -1.0,
        dy: 0,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },
    "UP:RIGHT:d:d": {
        dx: 0.75,
        dy: -0.25,
        seamAxis: "x",
        seamPos: 0.5,
        seamLength: 0.5,
    },
    "UP:LEFT:d:d": {
        dx: -0.75,
        dy: -0.25,
        seamAxis: "x",
        seamPos: -0.5,
        seamLength: 0.5,
    },
};

// Freeze the table to prevent runtime mutation
Object.freeze(TABLE);
for (const v of Object.values(TABLE)) Object.freeze(v);

// ============================================================================
// Public API
// ============================================================================

/**
 * Look up a connection offset. Returns undefined for invalid direction pairs
 * (e.g., reverse directions like RIGHT→LEFT).
 */
export function lookupConnection(
    prevDir: DominoLayoutDirection,
    nextDir: DominoLayoutDirection,
    prevIsDouble: boolean,
    nextIsDouble: boolean,
): ConnectionOffset | undefined {
    const key = connectionKey(prevDir, nextDir, prevIsDouble, nextIsDouble);
    return TABLE[key];
}

/**
 * Get all valid next directions for a given previous direction.
 * Always returns [straight, perpCW, perpCCW] — never reverse.
 */
export function validNextDirections(
    prevDir: DominoLayoutDirection,
): [DominoLayoutDirection, DominoLayoutDirection, DominoLayoutDirection] {
    return [prevDir, perpendicularCW(prevDir), perpendicularCCW(prevDir)];
}

/**
 * Returns the full frozen table for testing/introspection.
 */
export function getConnectionTable(): Readonly<
    Record<ConnectionKey, ConnectionOffset>
> {
    return TABLE;
}
