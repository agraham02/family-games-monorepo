import { create } from "zustand";
import type {
    ChainEnd,
    ChainSegment,
    PipValue,
    Domino,
    DominoChainState,
} from "./engine/types";
import { GRID_CELL_SIZE, BOARD_COLS, BOARD_ROWS } from "./engine/types";
import { getPlayableEnds } from "./engine/rules";
import { computeGhostPlacement } from "./engine/chain";
import { createEmptyChain } from "./engine/chain";

export interface GhostPlacement {
    end: ChainEnd;
    segment: ChainSegment;
    connectingPip: PipValue;
}

interface DominoesVisualStore {
    // Chain state (replayed from server board data)
    chain: DominoChainState;

    // Selection & ghost previews
    selectedTile: Domino | null;
    ghostPlacements: GhostPlacement[];

    // Animation
    lastPlacedTileId: string | null;
    flyingTile: {
        pip1: PipValue;
        pip2: PipValue;
        isDouble: boolean;
        fromX: number;
        fromY: number;
    } | null;

    // View state (Konva stage)
    stageScale: number;
    stagePosition: { x: number; y: number };

    // Auto-fit camera: when true, the camera automatically adjusts to show all tiles
    autoFit: boolean;

    // Actions
    setChain: (chain: DominoChainState) => void;
    selectTile: (domino: Domino | null) => void;
    clearSelection: () => void;
    setLastPlacedTileId: (id: string | null) => void;
    clearLastPlaced: () => void;
    setFlyingTile: (tile: DominoesVisualStore["flyingTile"]) => void;
    clearFlyingTile: () => void;
    setStageScale: (scale: number) => void;
    setStagePosition: (pos: { x: number; y: number }) => void;
    resetView: () => void;
    setAutoFit: (on: boolean) => void;
    /** Disable auto-fit (called on manual pan/zoom) */
    disableAutoFit: () => void;
}

const FOCAL_X =
    Math.floor(BOARD_COLS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
const FOCAL_Y =
    Math.floor(BOARD_ROWS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

function getCenteredPosition(scale = 1): { x: number; y: number } {
    const board = document.querySelector("[data-board]");
    if (board) {
        return {
            x: board.clientWidth / 2 - FOCAL_X * scale,
            y: board.clientHeight / 2 - FOCAL_Y * scale,
        };
    }
    return { x: 0, y: 0 };
}

export const useDominoesStore = create<DominoesVisualStore>((set, get) => ({
    chain: createEmptyChain(),
    selectedTile: null,
    ghostPlacements: [],
    lastPlacedTileId: null,
    flyingTile: null,
    stageScale: 1,
    stagePosition: { x: 0, y: 0 },
    autoFit: true,

    setChain: (chain) => {
        const { selectedTile } = get();
        // Recompute ghost placements if a tile is selected
        if (selectedTile) {
            const ghosts = computeGhosts(selectedTile, chain);
            set({ chain, ghostPlacements: ghosts });
        } else {
            set({ chain });
        }
    },

    selectTile: (domino) => {
        if (!domino) {
            set({ selectedTile: null, ghostPlacements: [] });
            return;
        }
        const { chain } = get();
        const ghosts = computeGhosts(domino, chain);
        set({ selectedTile: domino, ghostPlacements: ghosts });
    },

    clearSelection: () => set({ selectedTile: null, ghostPlacements: [] }),

    setLastPlacedTileId: (id) => set({ lastPlacedTileId: id }),
    clearLastPlaced: () => set({ lastPlacedTileId: null }),
    setFlyingTile: (tile) => set({ flyingTile: tile }),
    clearFlyingTile: () => set({ flyingTile: null }),

    setStageScale: (scale) => set({ stageScale: scale }),
    setStagePosition: (pos) => set({ stagePosition: pos }),
    resetView: () =>
        set({ stageScale: 1, stagePosition: getCenteredPosition(1) }),
    setAutoFit: (on) => set({ autoFit: on }),
    disableAutoFit: () => set({ autoFit: false }),
}));

function computeGhosts(
    domino: Domino,
    chain: DominoChainState,
): GhostPlacement[] {
    const ends = getPlayableEnds(domino, chain);
    const ghosts: GhostPlacement[] = [];

    for (const { end, connectingPip } of ends) {
        const segment = computeGhostPlacement(
            chain,
            domino,
            end,
            connectingPip,
        );
        if (segment) {
            ghosts.push({ end, segment, connectingPip });
        }
    }

    return ghosts;
}
