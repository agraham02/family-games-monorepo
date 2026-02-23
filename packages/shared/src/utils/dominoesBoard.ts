import { Tile } from "../types";

export interface OrientedDominoTile {
    orientedTile: Tile;
    newEndValue: number;
}

export function orientDominoTileForEnd(
    tile: Tile,
    endValue: number,
): OrientedDominoTile {
    if (tile.left === endValue) {
        return {
            orientedTile: tile,
            newEndValue: tile.right,
        };
    }

    if (tile.right === endValue) {
        return {
            orientedTile: {
                ...tile,
                left: tile.right,
                right: tile.left,
            },
            newEndValue: tile.left,
        };
    }

    throw new Error("Tile does not match board end");
}
