import { useMemo, useRef } from "react";
import { Tile as TileType } from "@shared/types";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface TileLayout {
    id: string;
    x: number; // Center X in grid units (1 unit = half a tile length)
    y: number; // Center Y in grid units
    rotation: number; // Degrees (0, 90, 180, 270)
    isDouble: boolean;
    direction: Direction; // The direction the board is growing at this tile
}

export interface LayoutResult {
    layouts: Map<string, TileLayout>;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    leftEndPos: { x: number; y: number; direction: Direction } | null;
    rightEndPos: { x: number; y: number; direction: Direction } | null;
}

const MAX_WIDTH = 12; // Maximum logical width before snaking

function getExitPoint(layout: TileLayout): { x: number; y: number } {
    const { x, y, direction, isDouble } = layout;
    const l = isDouble ? 0.5 : 1;
    switch (direction) {
        case "RIGHT":
            return { x: x + l, y };
        case "LEFT":
            return { x: x - l, y };
        case "DOWN":
            return { x, y: y + l };
        case "UP":
            return { x, y: y - l };
    }
}

function getEntryPoint(layout: TileLayout): { x: number; y: number } {
    const { x, y, direction, isDouble } = layout;
    const l = isDouble ? 0.5 : 1;
    switch (direction) {
        case "RIGHT":
            return { x: x - l, y };
        case "LEFT":
            return { x: x + l, y };
        case "DOWN":
            return { x, y: y - l };
        case "UP":
            return { x, y: y + l };
    }
}

function getRotation(direction: Direction, isDouble: boolean): number {
    if (direction === "RIGHT") return isDouble ? 90 : 0;
    if (direction === "LEFT") return isDouble ? 90 : 0;
    if (direction === "DOWN") return isDouble ? 0 : 90;
    if (direction === "UP") return isDouble ? 0 : 90;
    return 0;
}

export function useDominoLayout(tiles: TileType[]): LayoutResult {
    const anchorRef = useRef<{
        id: string;
        x: number;
        y: number;
        direction: Direction;
    } | null>(null);

    return useMemo(() => {
        const layouts = new Map<string, TileLayout>();
        let minX = 0,
            maxX = 0,
            minY = 0,
            maxY = 0;

        if (tiles.length === 0) {
            anchorRef.current = null;
            return {
                layouts,
                bounds: { minX, maxX, minY, maxY },
                leftEndPos: null,
                rightEndPos: null,
            };
        }

        // Find anchor
        let anchorIndex = -1;
        if (anchorRef.current) {
            anchorIndex = tiles.findIndex(
                (t) => t.id === anchorRef.current!.id,
            );
        }

        if (anchorIndex === -1 || !anchorRef.current) {
            // If no anchor found, pick the middle tile
            anchorIndex = Math.floor(tiles.length / 2);
            anchorRef.current = {
                id: tiles[anchorIndex].id,
                x: 0,
                y: 0,
                direction: "RIGHT",
            };
        }

        const anchorTile = tiles[anchorIndex];
        const anchorIsDouble = anchorTile.left === anchorTile.right;

        const anchorLayout: TileLayout = {
            id: anchorTile.id,
            x: anchorRef.current.x,
            y: anchorRef.current.y,
            rotation: getRotation(anchorRef.current.direction, anchorIsDouble),
            isDouble: anchorIsDouble,
            direction: anchorRef.current.direction,
        };

        layouts.set(anchorTile.id, anchorLayout);

        // Calculate forward (right side of array)
        let prevLayout = anchorLayout;
        let prevPrevLayout: TileLayout | null = null;

        for (let i = anchorIndex + 1; i < tiles.length; i++) {
            const tile = tiles[i];
            const isDouble = tile.left === tile.right;
            const entry = getExitPoint(prevLayout);

            let dir: Direction = prevLayout.direction;
            if (dir === "DOWN" || dir === "UP") {
                dir = prevPrevLayout?.direction === "RIGHT" ? "LEFT" : "RIGHT";
            } else {
                if (dir === "RIGHT" && entry.x >= MAX_WIDTH / 2) dir = "DOWN";
                else if (dir === "LEFT" && entry.x <= -MAX_WIDTH / 2)
                    dir = "DOWN";
            }

            const l = isDouble ? 0.5 : 1;
            let x = entry.x;
            let y = entry.y;

            switch (dir as Direction) {
                case "RIGHT":
                    x += l;
                    break;
                case "LEFT":
                    x -= l;
                    break;
                case "DOWN":
                    y += l;
                    break;
                case "UP":
                    y -= l;
                    break;
            }

            const layout: TileLayout = {
                id: tile.id,
                x,
                y,
                rotation: getRotation(dir, isDouble),
                isDouble,
                direction: dir,
            };

            layouts.set(tile.id, layout);
            prevPrevLayout = prevLayout;
            prevLayout = layout;
        }

        // Calculate backward (left side of array)
        let nextLayout = anchorLayout;
        let nextNextLayout: TileLayout | null =
            anchorIndex + 1 < tiles.length
                ? layouts.get(tiles[anchorIndex + 1].id)!
                : null;

        for (let i = anchorIndex - 1; i >= 0; i--) {
            const tile = tiles[i];
            const isDouble = tile.left === tile.right;
            const exit = getEntryPoint(nextLayout);

            let dir: Direction = nextLayout.direction;
            if (dir === "UP" || dir === "DOWN") {
                dir = nextNextLayout?.direction === "RIGHT" ? "LEFT" : "RIGHT";
            } else {
                if (dir === "RIGHT" && exit.x <= -MAX_WIDTH / 2) dir = "UP";
                else if (dir === "LEFT" && exit.x >= MAX_WIDTH / 2) dir = "UP";
            }

            const l = isDouble ? 0.5 : 1;
            let x = exit.x;
            let y = exit.y;

            switch (dir as Direction) {
                case "RIGHT":
                    x -= l;
                    break;
                case "LEFT":
                    x += l;
                    break;
                case "DOWN":
                    y -= l;
                    break;
                case "UP":
                    y += l;
                    break;
            }

            const layout: TileLayout = {
                id: tile.id,
                x,
                y,
                rotation: getRotation(dir, isDouble),
                isDouble,
                direction: dir,
            };

            layouts.set(tile.id, layout);
            nextNextLayout = nextLayout;
            nextLayout = layout;
        }

        // Calculate bounds
        layouts.forEach((layout) => {
            const l = layout.isDouble ? 0.5 : 1;
            const w = layout.rotation === 0 ? l : 0.5;
            const h = layout.rotation === 0 ? 0.5 : l;

            minX = Math.min(minX, layout.x - w);
            maxX = Math.max(maxX, layout.x + w);
            minY = Math.min(minY, layout.y - h);
            maxY = Math.max(maxY, layout.y + h);
        });

        // Calculate end positions for ghost tiles
        let leftEndPos = null;
        let rightEndPos = null;

        if (tiles.length > 0) {
            const leftTile = layouts.get(tiles[0].id)!;
            const rightTile = layouts.get(tiles[tiles.length - 1].id)!;
            const ghostL = 1; // Assume ghost tile is regular

            // For the left end, the ghost tile will be prepended.
            const leftExit = getEntryPoint(leftTile);
            let leftDir: Direction = leftTile.direction;
            const leftNextDir =
                tiles.length > 1 ? layouts.get(tiles[1].id)!.direction : null;

            if (leftDir === "UP" || leftDir === "DOWN") {
                leftDir = leftNextDir === "RIGHT" ? "LEFT" : "RIGHT";
            } else {
                if (leftDir === "RIGHT" && leftExit.x <= -MAX_WIDTH / 2)
                    leftDir = "UP";
                else if (leftDir === "LEFT" && leftExit.x >= MAX_WIDTH / 2)
                    leftDir = "UP";
            }

            let leftGhostX = leftExit.x;
            let leftGhostY = leftExit.y;
            switch (leftDir as Direction) {
                case "RIGHT":
                    leftGhostX -= ghostL;
                    break;
                case "LEFT":
                    leftGhostX += ghostL;
                    break;
                case "DOWN":
                    leftGhostY -= ghostL;
                    break;
                case "UP":
                    leftGhostY += ghostL;
                    break;
            }
            leftEndPos = { x: leftGhostX, y: leftGhostY, direction: leftDir };

            // For the right end, the ghost tile will be appended.
            const rightEntry = getExitPoint(rightTile);
            let rightDir: Direction = rightTile.direction;
            const rightPrevDir =
                tiles.length > 1
                    ? layouts.get(tiles[tiles.length - 2].id)!.direction
                    : null;

            if (rightDir === "DOWN" || rightDir === "UP") {
                rightDir = rightPrevDir === "RIGHT" ? "LEFT" : "RIGHT";
            } else {
                if (rightDir === "RIGHT" && rightEntry.x >= MAX_WIDTH / 2)
                    rightDir = "DOWN";
                else if (rightDir === "LEFT" && rightEntry.x <= -MAX_WIDTH / 2)
                    rightDir = "DOWN";
            }

            let rightGhostX = rightEntry.x;
            let rightGhostY = rightEntry.y;
            switch (rightDir as Direction) {
                case "RIGHT":
                    rightGhostX += ghostL;
                    break;
                case "LEFT":
                    rightGhostX -= ghostL;
                    break;
                case "DOWN":
                    rightGhostY += ghostL;
                    break;
                case "UP":
                    rightGhostY -= ghostL;
                    break;
            }
            rightEndPos = {
                x: rightGhostX,
                y: rightGhostY,
                direction: rightDir,
            };
        }

        return {
            layouts,
            bounds: { minX, maxX, minY, maxY },
            leftEndPos,
            rightEndPos,
        };
    }, [tiles]);
}
