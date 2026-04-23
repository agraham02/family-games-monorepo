import type {
    Domino,
    Direction,
    GridPosition,
    ChainSegment,
    DominoChainState,
    ChainEnd,
    PipValue,
    PlacementResult,
    Rectangle,
} from "./types";
import {
    directionVector,
    turnLeft,
    turnRight,
    reverseDirection,
    getTilePixelBounds,
    rectanglesOverlap,
    isWithinBoard,
    effectiveRunway,
    boardCenter,
} from "./layout";
import { getOrientedPips } from "./rules";

// ─── Chain operations ───────────────────────────────────────

/** Create an empty chain state. */
export function createEmptyChain(): DominoChainState {
    return {
        segments: [],
        headOpenPip: null,
        tailOpenPip: null,
    };
}

/**
 * Place the very first tile (usually the starting double) at the board center.
 */
export function placeFirstTile(
    chain: DominoChainState,
    domino: Domino,
): DominoChainState {
    const center = boardCenter();
    const direction: Direction = 0; // Start horizontal

    const segment: ChainSegment = {
        domino,
        gridPos: center,
        direction,
        openPipHead: domino.pip1,
        openPipTail: domino.pip2,
        flipped: false,
    };

    return {
        segments: [segment],
        headOpenPip: domino.pip1,
        tailOpenPip: domino.pip2,
        snakeSeed: chain.snakeSeed,
    };
}

/**
 * Find the anchor's open-edge cell — the last cell the anchor occupies
 * in the growth direction.
 */
function calcOpenEdge(
    anchor: ChainSegment,
    growthDir: Direction,
): GridPosition {
    const { dRow, dCol } = directionVector(growthDir);
    const extent =
        !anchor.domino.isDouble && anchor.direction === growthDir ? 1 : 0;
    return {
        row: anchor.gridPos.row + dRow * extent,
        col: anchor.gridPos.col + dCol * extent,
    };
}

/**
 * Build a complete bounding rect for collision checking.
 */
function getSegmentBounds(seg: ChainSegment): Rectangle {
    return getTilePixelBounds(seg.gridPos, seg.direction, seg.domino.isDouble);
}

/**
 * Check if placing a tile at the given position would collide with existing segments.
 */
function hasCollision(
    chain: DominoChainState,
    newBounds: Rectangle,
    skipIndex: number,
): boolean {
    for (let i = 0; i < chain.segments.length; i++) {
        if (i === skipIndex) continue;
        const existingBounds = getSegmentBounds(chain.segments[i]);
        if (rectanglesOverlap(newBounds, existingBounds)) {
            return true;
        }
    }
    return false;
}

/**
 * Try placing a domino at the specified end with a given direction.
 * Returns null if invalid, or the new ChainSegment if valid.
 */
function tryPlacement(
    chain: DominoChainState,
    domino: Domino,
    end: ChainEnd,
    gridPos: GridPosition,
    direction: Direction,
    connectingPip: PipValue,
): ChainSegment | null {
    const newBounds = getTilePixelBounds(gridPos, direction, domino.isDouble);

    if (!isWithinBoard(newBounds)) return null;

    const skipIndex = end === "head" ? 0 : chain.segments.length - 1;
    if (hasCollision(chain, newBounds, skipIndex)) return null;

    const { inwardPip, outwardPip } = getOrientedPips(domino, connectingPip);

    return {
        domino,
        gridPos,
        direction,
        openPipHead: end === "head" ? outwardPip : inwardPip,
        openPipTail: end === "tail" ? outwardPip : inwardPip,
        flipped: !domino.isDouble && connectingPip === domino.pip2,
    };
}

/** Minimum effective runway before proactively triggering a turn. */
const TURN_THRESHOLD = 3;

/**
 * When turning from a double, the turn position may need an extra offset.
 */
function calcTurnPos(
    openEdge: GridPosition,
    turnDir: Direction,
    anchor: ChainSegment,
    _growthDir: Direction,
): GridPosition {
    const { dRow, dCol } = directionVector(turnDir);
    let offset = 1;

    if (anchor.domino.isDouble) {
        offset = 1.5;
    }

    return {
        row: openEdge.row + dRow * offset,
        col: openEdge.col + dCol * offset,
    };
}

/**
 * Auto-place a domino at the specified end of the chain.
 * Tries inline first (if enough runway), then turns (preferring the direction
 * with the most effective runway, breaking ties by distance from opposite end).
 */
export function autoPlace(
    chain: DominoChainState,
    domino: Domino,
    end: ChainEnd,
    connectingPip: PipValue,
): PlacementResult {
    if (chain.segments.length === 0) {
        const newChain = placeFirstTile(chain, domino);
        return { success: true, segment: newChain.segments[0] };
    }

    const anchor =
        end === "tail"
            ? chain.segments[chain.segments.length - 1]
            : chain.segments[0];

    let growthDir: Direction;
    if (end === "tail") {
        growthDir = anchor.direction;
    } else {
        const center = boardCenter();
        const anchorIsOpening =
            anchor.gridPos.row === center.row &&
            anchor.gridPos.col === center.col;
        growthDir = anchorIsOpening
            ? reverseDirection(anchor.direction)
            : anchor.direction;
    }

    const openEdge = calcOpenEdge(anchor, growthDir);
    const { dRow: gRow, dCol: gCol } = directionVector(growthDir);
    const skipIndex = end === "head" ? 0 : chain.segments.length - 1;

    // Inline position: 1 cell past the open edge in growth direction
    const inlinePos: GridPosition = {
        row: openEdge.row + gRow,
        col: openEdge.col + gCol,
    };

    // Check effective runway in the growth direction (segment-aware)
    const inlineRunway = effectiveRunway(
        openEdge,
        growthDir,
        chain.segments,
        skipIndex,
    );

    // Attempt 1: inline — only if there's enough runway
    if (inlineRunway >= TURN_THRESHOLD) {
        const inlineResult = tryPlacement(
            chain,
            domino,
            end,
            inlinePos,
            growthDir,
            connectingPip,
        );
        if (inlineResult) {
            return { success: true, segment: inlineResult };
        }
    }

    // Attempt 2: Turn 90° — use effective runway for scoring
    const leftDir = turnLeft(growthDir);
    const rightDir = turnRight(growthDir);

    const leftRunway = effectiveRunway(
        openEdge,
        leftDir,
        chain.segments,
        skipIndex,
    );
    const rightRunway = effectiveRunway(
        openEdge,
        rightDir,
        chain.segments,
        skipIndex,
    );

    // Tiebreaker: when runways are similar, decide which way to snake.
    // For the FIRST corner (growth is still horizontal), use a per-chain
    // seed to pick which end goes up vs down — head and tail always snake
    // into opposite vertical halves of the board so the layout stays
    // balanced. For SUBSEQUENT corners (growth already vertical), fall back
    // to the original distance-based heuristic, which routes back across
    // the board away from the opposite end of the chain.
    let firstTurn: Direction;
    let secondTurn: Direction;

    if (Math.abs(leftRunway - rightRunway) <= 2) {
        const isHorizontalGrowth = growthDir === 0 || growthDir === 180;

        if (isHorizontalGrowth) {
            // 90 = down (dRow +1), 270 = up (dRow -1).
            // flip=false preserves the historical "head down, tail up" look;
            // flip=true mirrors it to "head up, tail down".
            const flip = ((chain.snakeSeed ?? 0) & 1) === 1;
            const headTargetDir: Direction = flip ? 270 : 90;
            const tailTargetDir: Direction = flip ? 90 : 270;
            const targetDir =
                end === "head" ? headTargetDir : tailTargetDir;

            const preferLeft = leftDir === targetDir;
            [firstTurn, secondTurn] = preferLeft
                ? [leftDir, rightDir]
                : [rightDir, leftDir];
        } else {
            const oppositeEnd =
                end === "tail"
                    ? chain.segments[0]
                    : chain.segments[chain.segments.length - 1];
            const oppPos = oppositeEnd.gridPos;

            const { dRow: lRow, dCol: lCol } = directionVector(leftDir);
            const { dRow: rRow, dCol: rCol } = directionVector(rightDir);

            const leftDist =
                Math.abs(openEdge.row + lRow - oppPos.row) +
                Math.abs(openEdge.col + lCol - oppPos.col);
            const rightDist =
                Math.abs(openEdge.row + rRow - oppPos.row) +
                Math.abs(openEdge.col + rCol - oppPos.col);

            [firstTurn, secondTurn] =
                leftDist >= rightDist
                    ? [leftDir, rightDir]
                    : [rightDir, leftDir];
        }
    } else {
        [firstTurn, secondTurn] =
            leftRunway >= rightRunway
                ? [leftDir, rightDir]
                : [rightDir, leftDir];
    }

    // Try first turn direction
    const turn1Pos = calcTurnPos(openEdge, firstTurn, anchor, growthDir);
    const turn1Result = tryPlacement(
        chain,
        domino,
        end,
        turn1Pos,
        firstTurn,
        connectingPip,
    );
    if (turn1Result) {
        return { success: true, segment: turn1Result };
    }

    // Try second turn direction
    const turn2Pos = calcTurnPos(openEdge, secondTurn, anchor, growthDir);
    const turn2Result = tryPlacement(
        chain,
        domino,
        end,
        turn2Pos,
        secondTurn,
        connectingPip,
    );
    if (turn2Result) {
        return { success: true, segment: turn2Result };
    }

    // Fallback: try inline anyway (in case threshold was too aggressive)
    if (inlineRunway < TURN_THRESHOLD) {
        const inlineResult = tryPlacement(
            chain,
            domino,
            end,
            inlinePos,
            growthDir,
            connectingPip,
        );
        if (inlineResult) {
            return { success: true, segment: inlineResult };
        }
    }

    return { success: false, error: "No valid placement found" };
}

/**
 * Add a segment to the chain, returning the updated chain state.
 */
export function addSegmentToChain(
    chain: DominoChainState,
    segment: ChainSegment,
    end: ChainEnd,
): DominoChainState {
    const newSegments = [...chain.segments];

    if (end === "tail") {
        newSegments.push(segment);
        return {
            segments: newSegments,
            headOpenPip: chain.headOpenPip,
            tailOpenPip: segment.openPipTail,
            snakeSeed: chain.snakeSeed,
        };
    } else {
        newSegments.unshift(segment);
        return {
            segments: newSegments,
            headOpenPip: segment.openPipHead,
            tailOpenPip: chain.tailOpenPip,
            snakeSeed: chain.snakeSeed,
        };
    }
}

/**
 * Compute ghost (preview) placements for a domino at a given end.
 * Returns the ChainSegment that would result, or null if impossible.
 */
export function computeGhostPlacement(
    chain: DominoChainState,
    domino: Domino,
    end: ChainEnd,
    connectingPip: PipValue,
): ChainSegment | null {
    const result = autoPlace(chain, domino, end, connectingPip);
    return result.success ? result.segment! : null;
}
