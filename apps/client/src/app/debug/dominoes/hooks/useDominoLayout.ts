/**
 * useDominoLayout - React hook for managing domino chain layout state.
 * Orchestrates the headless layout engine with React state management.
 */

import { useReducer, useCallback, useEffect, useRef, useMemo } from "react";
import type {
    Domino,
    ChainState,
    ChainEnd,
    LayoutConfig,
    LayoutSnapshot,
    CameraTransform,
    BoundingBox,
    Size,
    PlacementValidity,
    PlacedDomino,
} from "../engine";
import {
    EMPTY_CHAIN,
    createLayoutConfig,
    placeDomino,
    getPlacementValidity,
    canPlace,
    getOpenEnds,
    computeBoundingBox,
    computeCameraTransform,
    createInitialCamera,
    applyPanOffset,
    applyConstrainedPan,
    applyZoom,
    shouldEnablePan,
    generateGhostTile,
    createGhostPreviewState,
    switchGhostEnd,
    type GhostPreviewState,
} from "../engine";

// =============================================================================
// State Types
// =============================================================================

export interface DominoLayoutState {
    /** The current chain state */
    chain: ChainState;
    /** Layout configuration */
    config: LayoutConfig;
    /** Container size */
    containerSize: Size;
    /** Camera transform */
    camera: CameraTransform;
    /** Content bounding box */
    bounds: BoundingBox;
    /** Active ghost preview (if any) */
    ghostPreview: GhostPreviewState | null;
    /** Whether pan is enabled */
    isPanEnabled: boolean;
    /** Minimum zoom scale */
    minScale: number;
    /** Maximum zoom scale */
    maxScale: number;
    /** Whether the layout needs camera update */
    needsCameraUpdate: boolean;
}

// =============================================================================
// Actions
// =============================================================================

type DominoLayoutAction =
    | { type: "PLACE_DOMINO"; domino: Domino; end: ChainEnd }
    | { type: "CLEAR_CHAIN" }
    | { type: "SET_CHAIN"; chain: ChainState }
    | { type: "SET_CONTAINER_SIZE"; size: Size }
    | { type: "SET_GHOST"; domino: Domino; preferredEnd?: ChainEnd }
    | { type: "SWITCH_GHOST_END" }
    | { type: "CLEAR_GHOST" }
    | { type: "PAN"; delta: { x: number; y: number } }
    | { type: "ZOOM"; delta: number; center: { x: number; y: number } }
    | { type: "FIT_TO_VIEW" }
    | { type: "UPDATE_CAMERA" };

// =============================================================================
// Reducer
// =============================================================================

function createInitialState(
    config: LayoutConfig,
    containerSize: Size = { width: 800, height: 600 },
    minScale: number = 0.3,
    maxScale: number = 2,
): DominoLayoutState {
    const camera = createInitialCamera(containerSize);
    const bounds = computeBoundingBox([], config);

    return {
        chain: EMPTY_CHAIN,
        config,
        containerSize,
        camera,
        bounds,
        ghostPreview: null,
        isPanEnabled: false,
        minScale,
        maxScale,
        needsCameraUpdate: false,
    };
}

function reducer(
    state: DominoLayoutState,
    action: DominoLayoutAction,
): DominoLayoutState {
    switch (action.type) {
        case "PLACE_DOMINO": {
            const result = placeDomino(
                state.chain,
                action.domino,
                action.end,
                state.config,
            );

            if (!result.success) {
                console.warn(`Failed to place domino: ${result.reason}`);
                return state;
            }

            const newBounds = computeBoundingBox(
                result.chain.tiles,
                state.config,
            );

            return {
                ...state,
                chain: result.chain,
                bounds: newBounds,
                ghostPreview: null, // Clear ghost after placement
                needsCameraUpdate: true,
            };
        }

        case "CLEAR_CHAIN": {
            return {
                ...state,
                chain: EMPTY_CHAIN,
                bounds: computeBoundingBox([], state.config),
                ghostPreview: null,
                needsCameraUpdate: true,
            };
        }

        case "SET_CHAIN": {
            const newBounds = computeBoundingBox(
                action.chain.tiles,
                state.config,
            );
            return {
                ...state,
                chain: action.chain,
                bounds: newBounds,
                ghostPreview: null,
                needsCameraUpdate: true,
            };
        }

        case "SET_CONTAINER_SIZE": {
            return {
                ...state,
                containerSize: action.size,
                needsCameraUpdate: true,
            };
        }

        case "SET_GHOST": {
            const ghostPreview = createGhostPreviewState(
                state.chain,
                action.domino,
                action.preferredEnd ?? "head",
                state.config,
            );

            return {
                ...state,
                ghostPreview,
            };
        }

        case "SWITCH_GHOST_END": {
            if (!state.ghostPreview) return state;

            const newGhost = switchGhostEnd(
                state.ghostPreview,
                state.chain,
                state.config,
            );

            return {
                ...state,
                ghostPreview: newGhost ?? state.ghostPreview,
            };
        }

        case "CLEAR_GHOST": {
            return {
                ...state,
                ghostPreview: null,
            };
        }

        case "PAN": {
            if (!state.isPanEnabled) return state;

            const newCamera = applyConstrainedPan(
                state.camera,
                action.delta,
                state.bounds,
                state.containerSize,
                state.config.padding,
            );

            return {
                ...state,
                camera: newCamera,
            };
        }

        case "ZOOM": {
            const newCamera = applyZoom(
                state.camera,
                action.delta,
                action.center,
                state.minScale,
                state.maxScale,
            );

            const isPanEnabled = shouldEnablePan(
                newCamera,
                state.bounds,
                state.containerSize,
            );

            return {
                ...state,
                camera: newCamera,
                isPanEnabled,
            };
        }

        case "FIT_TO_VIEW":
        case "UPDATE_CAMERA": {
            const camera = computeCameraTransform(
                state.bounds,
                state.containerSize,
                state.minScale,
                state.maxScale,
            );

            const isPanEnabled = shouldEnablePan(
                camera,
                state.bounds,
                state.containerSize,
            );

            return {
                ...state,
                camera,
                isPanEnabled,
                needsCameraUpdate: false,
            };
        }

        default:
            return state;
    }
}

// =============================================================================
// Hook
// =============================================================================

export interface UseDominoLayoutOptions {
    /** Initial layout configuration */
    config?: Partial<LayoutConfig>;
    /** Initial container size */
    initialContainerSize?: Size;
    /** Minimum zoom scale */
    minScale?: number;
    /** Maximum zoom scale */
    maxScale?: number;
}

export interface UseDominoLayoutReturn {
    // State
    chain: ChainState;
    camera: CameraTransform;
    bounds: BoundingBox;
    ghostPreview: GhostPreviewState | null;
    isPanEnabled: boolean;

    // Computed values
    snapshot: LayoutSnapshot;
    openEnds: { head: number | null; tail: number | null };

    // Actions
    placeDomino: (domino: Domino, end: ChainEnd) => void;
    clearChain: () => void;
    setChain: (chain: ChainState) => void;
    setContainerSize: (size: Size) => void;
    setGhost: (domino: Domino, preferredEnd?: ChainEnd) => void;
    switchGhostEnd: () => void;
    clearGhost: () => void;
    pan: (delta: { x: number; y: number }) => void;
    zoom: (delta: number, center: { x: number; y: number }) => void;
    fitToView: () => void;

    // Validation helpers
    canPlaceDomino: (domino: Domino) => boolean;
    getPlacementValidity: (domino: Domino) => PlacementValidity;

    // Container ref for ResizeObserver
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useDominoLayout(
    options: UseDominoLayoutOptions = {},
): UseDominoLayoutReturn {
    const config = useMemo(
        () => createLayoutConfig(options.config),
        [options.config],
    );

    const initialState = useMemo(
        () =>
            createInitialState(
                config,
                options.initialContainerSize,
                options.minScale ?? 0.3,
                options.maxScale ?? 2,
            ),
        [
            config,
            options.initialContainerSize,
            options.minScale,
            options.maxScale,
        ],
    );

    const [state, dispatch] = useReducer(reducer, initialState);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle camera updates
    useEffect(() => {
        if (state.needsCameraUpdate) {
            dispatch({ type: "UPDATE_CAMERA" });
        }
    }, [state.needsCameraUpdate]);

    // ResizeObserver for container size changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                dispatch({
                    type: "SET_CONTAINER_SIZE",
                    size: { width, height },
                });
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Memoized snapshot
    const snapshot = useMemo<LayoutSnapshot>(
        () => ({
            chain: state.chain,
            bounds: state.bounds,
            camera: state.camera,
            ghost: state.ghostPreview?.ghost ?? null,
            ghostEnd: state.ghostPreview?.activeEnd ?? null,
        }),
        [state.chain, state.bounds, state.camera, state.ghostPreview],
    );

    const openEnds = useMemo(() => getOpenEnds(state.chain), [state.chain]);

    // Action creators
    const actions = useMemo(
        () => ({
            placeDomino: (domino: Domino, end: ChainEnd) =>
                dispatch({ type: "PLACE_DOMINO", domino, end }),
            clearChain: () => dispatch({ type: "CLEAR_CHAIN" }),
            setChain: (chain: ChainState) =>
                dispatch({ type: "SET_CHAIN", chain }),
            setContainerSize: (size: Size) =>
                dispatch({ type: "SET_CONTAINER_SIZE", size }),
            setGhost: (domino: Domino, preferredEnd?: ChainEnd) =>
                dispatch({ type: "SET_GHOST", domino, preferredEnd }),
            switchGhostEnd: () => dispatch({ type: "SWITCH_GHOST_END" }),
            clearGhost: () => dispatch({ type: "CLEAR_GHOST" }),
            pan: (delta: { x: number; y: number }) =>
                dispatch({ type: "PAN", delta }),
            zoom: (delta: number, center: { x: number; y: number }) =>
                dispatch({ type: "ZOOM", delta, center }),
            fitToView: () => dispatch({ type: "FIT_TO_VIEW" }),
        }),
        [],
    );

    // Validation helpers
    const canPlaceDomino = useCallback(
        (domino: Domino) => canPlace(state.chain, domino),
        [state.chain],
    );

    const getValidity = useCallback(
        (domino: Domino) => getPlacementValidity(state.chain, domino),
        [state.chain],
    );

    return {
        chain: state.chain,
        camera: state.camera,
        bounds: state.bounds,
        ghostPreview: state.ghostPreview,
        isPanEnabled: state.isPanEnabled,
        snapshot,
        openEnds,
        ...actions,
        canPlaceDomino,
        getPlacementValidity: getValidity,
        containerRef,
    };
}
