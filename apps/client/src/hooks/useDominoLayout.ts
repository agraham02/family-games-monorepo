import { useMemo } from "react";
import {
    DominoLayoutDirection,
    DominoTileLayout,
    Tile as TileType,
} from "@shared/types";
import { computeDominoBoardLayout } from "@shared/utils";

export type Direction = DominoLayoutDirection;

export type TileLayout = DominoTileLayout;

export interface LayoutResult {
    layouts: Map<string, TileLayout>;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    leftEndPos: { x: number; y: number; direction: Direction } | null;
    rightEndPos: { x: number; y: number; direction: Direction } | null;
}

export function useDominoLayout(
    tiles: TileType[],
    layoutSeed?: string,
): LayoutResult {
    return useMemo(() => {
        const layout = computeDominoBoardLayout(
            tiles,
            layoutSeed ?? "dominoes-fallback",
        );

        return {
            layouts: new Map(
                Object.values(layout.tileLayouts).map((tileLayout) => [
                    tileLayout.id,
                    tileLayout,
                ]),
            ),
            bounds: layout.bounds,
            leftEndPos: layout.leftEndPos,
            rightEndPos: layout.rightEndPos,
        };
    }, [tiles, layoutSeed]);
}
