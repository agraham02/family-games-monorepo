import {
    DominoBoardLayout,
    DominoLayoutDirection,
    DominoTileLayout,
    Tile,
} from "../types";

const DEFAULT_MAX_WIDTH = 16;

function hashSeed(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
    let state = hashSeed(seed) || 1;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function getRotation(
    direction: DominoLayoutDirection,
    isDouble: boolean,
): number {
    if (direction === "RIGHT") return isDouble ? 90 : 0;
    if (direction === "LEFT") return isDouble ? 90 : 180;
    if (direction === "DOWN") return isDouble ? 0 : 90;
    if (direction === "UP") return isDouble ? 0 : 270;
    return 0;
}

function getExitSocketRelative(
    dir: DominoLayoutDirection,
    nextDir: DominoLayoutDirection,
    isDouble: boolean,
) {
    let dx = 0,
        dy = 0;
    if (dir === "RIGHT") {
        if (nextDir === "RIGHT") {
            dx = isDouble ? 0.25 : 0.5;
            dy = 0;
        } else if (nextDir === "DOWN") {
            dx = isDouble ? 0 : 0.25;
            dy = isDouble ? 0.5 : 0.25;
        } else if (nextDir === "UP") {
            dx = isDouble ? 0 : 0.25;
            dy = isDouble ? -0.5 : -0.25;
        }
    } else if (dir === "LEFT") {
        if (nextDir === "LEFT") {
            dx = isDouble ? -0.25 : -0.5;
            dy = 0;
        } else if (nextDir === "DOWN") {
            dx = isDouble ? 0 : -0.25;
            dy = isDouble ? 0.5 : 0.25;
        } else if (nextDir === "UP") {
            dx = isDouble ? 0 : -0.25;
            dy = isDouble ? -0.5 : -0.25;
        }
    } else if (dir === "DOWN") {
        if (nextDir === "DOWN") {
            dx = 0;
            dy = isDouble ? 0.25 : 0.5;
        } else if (nextDir === "RIGHT") {
            dx = isDouble ? 0.5 : 0.25;
            dy = isDouble ? 0 : 0.25;
        } else if (nextDir === "LEFT") {
            dx = isDouble ? -0.5 : -0.25;
            dy = isDouble ? 0 : 0.25;
        }
    } else if (dir === "UP") {
        if (nextDir === "UP") {
            dx = 0;
            dy = isDouble ? -0.25 : -0.5;
        } else if (nextDir === "RIGHT") {
            dx = isDouble ? 0.5 : 0.25;
            dy = isDouble ? 0 : -0.25;
        } else if (nextDir === "LEFT") {
            dx = isDouble ? -0.5 : -0.25;
            dy = isDouble ? 0 : -0.25;
        }
    }
    return { x: dx, y: dy };
}

function getEntrySocketRelative(dir: DominoLayoutDirection, isDouble: boolean) {
    let dx = 0,
        dy = 0;
    if (dir === "RIGHT") {
        dx = isDouble ? -0.25 : -0.5;
        dy = 0;
    } else if (dir === "LEFT") {
        dx = isDouble ? 0.25 : 0.5;
        dy = 0;
    } else if (dir === "DOWN") {
        dx = 0;
        dy = isDouble ? -0.25 : -0.5;
    } else if (dir === "UP") {
        dx = 0;
        dy = isDouble ? 0.25 : 0.5;
    }
    return { x: dx, y: dy };
}

function getNextDirection(
    prevDir: DominoLayoutDirection,
    prevPrevDir: DominoLayoutDirection | null,
    x: number,
    limit: number,
    verticalDir: DominoLayoutDirection,
): DominoLayoutDirection {
    if (prevDir === "RIGHT") return x >= limit ? verticalDir : "RIGHT";
    if (prevDir === "LEFT") return x <= -limit ? verticalDir : "LEFT";
    if (prevDir === "DOWN" || prevDir === "UP") {
        return prevPrevDir === "RIGHT" ? "LEFT" : "RIGHT";
    }
    return "RIGHT";
}

function getPrevDirection(
    nextDir: DominoLayoutDirection,
    nextNextDir: DominoLayoutDirection | null,
    x: number,
    limit: number,
    verticalDir: DominoLayoutDirection,
): DominoLayoutDirection {
    if (nextDir === "RIGHT") return x <= -limit ? verticalDir : "RIGHT";
    if (nextDir === "LEFT") return x >= limit ? verticalDir : "LEFT";
    if (nextDir === "DOWN" || nextDir === "UP") {
        return nextNextDir === "RIGHT" ? "LEFT" : "RIGHT";
    }
    return "LEFT";
}

function uniqueDirections(
    directions: DominoLayoutDirection[],
): DominoLayoutDirection[] {
    return Array.from(new Set(directions));
}

function getTileDimensions(rotation: number) {
    const isHorizontal = rotation === 0 || rotation === 180;
    return {
        width: isHorizontal ? 1 : 0.5,
        height: isHorizontal ? 0.5 : 1,
    };
}

function overlapsExistingTile(
    x: number,
    y: number,
    rotation: number,
    existingLayouts: Record<string, DominoTileLayout>,
): boolean {
    const EPSILON = 1e-4;
    const currentDimensions = getTileDimensions(rotation);

    for (const existing of Object.values(existingLayouts)) {
        const existingDimensions = getTileDimensions(existing.rotation);

        const horizontalOverlap =
            Math.abs(x - existing.x) <
            (currentDimensions.width + existingDimensions.width) / 2 - EPSILON;
        const verticalOverlap =
            Math.abs(y - existing.y) <
            (currentDimensions.height + existingDimensions.height) / 2 -
                EPSILON;

        if (horizontalOverlap && verticalOverlap) {
            return true;
        }
    }

    return false;
}

function getForwardDirectionCandidates(
    prevDir: DominoLayoutDirection,
    prevPrevDir: DominoLayoutDirection | null,
    x: number,
    limit: number,
    verticalDir: DominoLayoutDirection,
): DominoLayoutDirection[] {
    const base = getNextDirection(prevDir, prevPrevDir, x, limit, verticalDir);

    if (prevDir === "RIGHT" || prevDir === "LEFT") {
        return uniqueDirections([base, verticalDir]);
    }

    return uniqueDirections([
        base,
        prevPrevDir === "RIGHT" ? "LEFT" : "RIGHT",
        prevPrevDir === "LEFT" ? "RIGHT" : "LEFT",
    ]);
}

function getBackwardDirectionCandidates(
    nextDir: DominoLayoutDirection,
    nextNextDir: DominoLayoutDirection | null,
    x: number,
    limit: number,
    verticalDir: DominoLayoutDirection,
): DominoLayoutDirection[] {
    const base = getPrevDirection(nextDir, nextNextDir, x, limit, verticalDir);

    if (nextDir === "RIGHT" || nextDir === "LEFT") {
        return uniqueDirections([base, verticalDir]);
    }

    return uniqueDirections([
        base,
        nextNextDir === "RIGHT" ? "LEFT" : "RIGHT",
        nextNextDir === "LEFT" ? "RIGHT" : "LEFT",
    ]);
}

function calculateBounds(tileLayouts: Record<string, DominoTileLayout>) {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    for (const layout of Object.values(tileLayouts)) {
        const { width, height } = getTileDimensions(layout.rotation);

        minX = Math.min(minX, layout.x - width / 2);
        maxX = Math.max(maxX, layout.x + width / 2);
        minY = Math.min(minY, layout.y - height / 2);
        maxY = Math.max(maxY, layout.y + height / 2);
    }

    return { minX, maxX, minY, maxY };
}

function calculateEndPositions(
    tiles: Tile[],
    tileLayouts: Record<string, DominoTileLayout>,
    maxWidth: number,
    forwardVerticalBias: DominoLayoutDirection,
    backwardVerticalBias: DominoLayoutDirection,
) {
    const leftTile = tiles[0];
    const leftLayout = tileLayouts[leftTile.id];
    const leftPrevLayout = tiles.length > 1 ? tileLayouts[tiles[1].id] : null;
    const leftGhostDir = getPrevDirection(
        leftLayout.direction,
        leftPrevLayout?.direction ?? null,
        leftLayout.x,
        maxWidth / 2,
        backwardVerticalBias,
    );
    const leftEntry = getEntrySocketRelative(
        leftLayout.direction,
        leftLayout.isDouble,
    );
    const leftExit = getExitSocketRelative(
        leftGhostDir,
        leftLayout.direction,
        false,
    );
    const leftGhostX = leftLayout.x + leftEntry.x - leftExit.x;
    const leftGhostY = leftLayout.y + leftEntry.y - leftExit.y;

    const rightTile = tiles[tiles.length - 1];
    const rightLayout = tileLayouts[rightTile.id];
    const rightPrevLayout =
        tiles.length > 1 ? tileLayouts[tiles[tiles.length - 2].id] : null;
    const rightGhostDir = getNextDirection(
        rightLayout.direction,
        rightPrevLayout?.direction ?? null,
        rightLayout.x,
        maxWidth / 2,
        forwardVerticalBias,
    );
    const rightEntry = getEntrySocketRelative(rightGhostDir, false);
    const rightExit = getExitSocketRelative(
        rightLayout.direction,
        rightGhostDir,
        rightLayout.isDouble,
    );
    const rightGhostX = rightLayout.x + rightExit.x - rightEntry.x;
    const rightGhostY = rightLayout.y + rightExit.y - rightEntry.y;

    return {
        leftEndPos: { x: leftGhostX, y: leftGhostY, direction: leftGhostDir },
        rightEndPos: {
            x: rightGhostX,
            y: rightGhostY,
            direction: rightGhostDir,
        },
    };
}

function buildLinearFallbackLayout(
    tiles: Tile[],
    seed: string,
): DominoBoardLayout {
    const tileLayouts: Record<string, DominoTileLayout> = {};
    const maxWidth = DEFAULT_MAX_WIDTH;
    const forwardVerticalBias: DominoLayoutDirection = "DOWN";
    const backwardVerticalBias: DominoLayoutDirection = "UP";

    const first = tiles[0];
    const firstIsDouble = first.left === first.right;
    tileLayouts[first.id] = {
        id: first.id,
        x: 0,
        y: 0,
        rotation: getRotation("RIGHT", firstIsDouble),
        isDouble: firstIsDouble,
        direction: "RIGHT",
    };

    for (let i = 1; i < tiles.length; i++) {
        const prev = tileLayouts[tiles[i - 1].id];
        const tile = tiles[i];
        const isDouble = tile.left === tile.right;
        const dir: DominoLayoutDirection = "RIGHT";
        const entry = getEntrySocketRelative(dir, isDouble);
        const exit = getExitSocketRelative(prev.direction, dir, prev.isDouble);

        tileLayouts[tile.id] = {
            id: tile.id,
            x: prev.x + exit.x - entry.x,
            y: prev.y + exit.y - entry.y,
            rotation: getRotation(dir, isDouble),
            isDouble,
            direction: dir,
        };
    }

    const bounds = calculateBounds(tileLayouts);
    const endPositions = calculateEndPositions(
        tiles,
        tileLayouts,
        maxWidth,
        forwardVerticalBias,
        backwardVerticalBias,
    );

    return {
        seed,
        tileLayouts,
        bounds,
        leftEndPos: endPositions.leftEndPos,
        rightEndPos: endPositions.rightEndPos,
    };
}

function buildLayoutAttempt(
    tiles: Tile[],
    seed: string,
    previousLayout?: DominoBoardLayout,
): DominoBoardLayout | null {
    const tileLayouts: Record<string, DominoTileLayout> = {};

    const rng = createSeededRng(seed);
    const maxWidth = Math.max(
        12,
        Math.min(20, DEFAULT_MAX_WIDTH + Math.floor(rng() * 7) - 3),
    );
    const forwardVerticalBias: DominoLayoutDirection =
        rng() > 0.5 ? "DOWN" : "UP";
    const backwardVerticalBias: DominoLayoutDirection =
        forwardVerticalBias === "DOWN" ? "UP" : "DOWN";

    let anchorIndex = Math.floor(tiles.length / 2);
    let anchorDir: DominoLayoutDirection = "RIGHT";
    let anchorX = 0;
    let anchorY = 0;

    if (previousLayout && previousLayout.tileLayouts) {
        const previousCenterX =
            (previousLayout.bounds.minX + previousLayout.bounds.maxX) / 2;
        const previousCenterY =
            (previousLayout.bounds.minY + previousLayout.bounds.maxY) / 2;
        const existingIndices = tiles
            .map((tile, index) => ({
                index,
                hasLayout: !!previousLayout.tileLayouts[tile.id],
            }))
            .filter((entry) => entry.hasLayout)
            .map((entry) => entry.index);

        if (existingIndices.length > 0) {
            anchorIndex = existingIndices.reduce((best, current) => {
                const currentLayout =
                    previousLayout.tileLayouts[tiles[current].id];
                const bestLayout = previousLayout.tileLayouts[tiles[best].id];
                const currentDistance =
                    Math.abs(currentLayout.x - previousCenterX) +
                    Math.abs(currentLayout.y - previousCenterY);
                const bestDistance =
                    Math.abs(bestLayout.x - previousCenterX) +
                    Math.abs(bestLayout.y - previousCenterY);
                return currentDistance < bestDistance ? current : best;
            }, existingIndices[0]);

            const oldAnchor = previousLayout.tileLayouts[tiles[anchorIndex].id];
            anchorDir = oldAnchor.direction;
            anchorX = oldAnchor.x;
            anchorY = oldAnchor.y;
        }
    }

    const anchorTile = tiles[anchorIndex];
    const anchorIsDouble = anchorTile.left === anchorTile.right;

    tileLayouts[anchorTile.id] = {
        id: anchorTile.id,
        x: anchorX,
        y: anchorY,
        rotation: getRotation(anchorDir, anchorIsDouble),
        isDouble: anchorIsDouble,
        direction: anchorDir,
    };

    for (let i = anchorIndex + 1; i < tiles.length; i++) {
        const tile = tiles[i];
        const isDouble = tile.left === tile.right;
        const prev = tileLayouts[tiles[i - 1].id];
        const prevPrev =
            i - 2 >= anchorIndex ? tileLayouts[tiles[i - 2].id] : null;

        const directionCandidates = getForwardDirectionCandidates(
            prev.direction,
            prevPrev?.direction ?? null,
            prev.x,
            maxWidth / 2,
            forwardVerticalBias,
        );

        let selectedLayout: DominoTileLayout | null = null;

        for (const nextDir of directionCandidates) {
            const entry = getEntrySocketRelative(nextDir, isDouble);
            const exit = getExitSocketRelative(
                prev.direction,
                nextDir,
                prev.isDouble,
            );

            const x = prev.x + exit.x - entry.x;
            const y = prev.y + exit.y - entry.y;
            const rotation = getRotation(nextDir, isDouble);

            if (!overlapsExistingTile(x, y, rotation, tileLayouts)) {
                selectedLayout = {
                    id: tile.id,
                    x,
                    y,
                    rotation,
                    isDouble,
                    direction: nextDir,
                };
                break;
            }
        }

        if (!selectedLayout) {
            return null;
        }

        tileLayouts[tile.id] = selectedLayout;
    }

    for (let i = anchorIndex - 1; i >= 0; i--) {
        const tile = tiles[i];
        const isDouble = tile.left === tile.right;
        const prev = tileLayouts[tiles[i + 1].id];
        const prevPrev =
            i + 2 <= anchorIndex ? tileLayouts[tiles[i + 2].id] : null;

        const directionCandidates = getBackwardDirectionCandidates(
            prev.direction,
            prevPrev?.direction ?? null,
            prev.x,
            maxWidth / 2,
            backwardVerticalBias,
        );

        let selectedLayout: DominoTileLayout | null = null;

        for (const currDir of directionCandidates) {
            const entry = getEntrySocketRelative(prev.direction, prev.isDouble);
            const exit = getExitSocketRelative(
                currDir,
                prev.direction,
                isDouble,
            );

            const x = prev.x + entry.x - exit.x;
            const y = prev.y + entry.y - exit.y;
            const rotation = getRotation(currDir, isDouble);

            if (!overlapsExistingTile(x, y, rotation, tileLayouts)) {
                selectedLayout = {
                    id: tile.id,
                    x,
                    y,
                    rotation,
                    isDouble,
                    direction: currDir,
                };
                break;
            }
        }

        if (!selectedLayout) {
            return null;
        }

        tileLayouts[tile.id] = selectedLayout;
    }

    const bounds = calculateBounds(tileLayouts);
    const endPositions = calculateEndPositions(
        tiles,
        tileLayouts,
        maxWidth,
        forwardVerticalBias,
        backwardVerticalBias,
    );

    return {
        seed,
        tileLayouts,
        bounds,
        leftEndPos: endPositions.leftEndPos,
        rightEndPos: endPositions.rightEndPos,
    };
}

export function computeDominoBoardLayout(
    tiles: Tile[],
    seed: string,
    previousLayout?: DominoBoardLayout,
): DominoBoardLayout {
    if (tiles.length === 0) {
        return {
            seed,
            tileLayouts: {},
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            leftEndPos: null,
            rightEndPos: null,
        };
    }

    const attempts: Array<{ attemptSeed: string; prev?: DominoBoardLayout }> = [
        { attemptSeed: seed, prev: previousLayout },
        { attemptSeed: `${seed}:reset`, prev: undefined },
    ];

    for (let i = 1; i <= 24; i++) {
        attempts.push({ attemptSeed: `${seed}:retry-${i}`, prev: undefined });
    }

    for (const attempt of attempts) {
        const layout = buildLayoutAttempt(
            tiles,
            attempt.attemptSeed,
            attempt.prev,
        );
        if (layout) {
            return {
                ...layout,
                seed,
            };
        }
    }

    const fallback = buildLinearFallbackLayout(tiles, seed);
    return fallback;
}
