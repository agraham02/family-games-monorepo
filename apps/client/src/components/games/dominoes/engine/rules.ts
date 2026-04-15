import type { Domino, DominoChainState, ChainEnd, PipValue } from "./types";

/**
 * Check if a domino can be played at a specific end of the chain.
 * Returns the pip that would connect (or null if invalid).
 */
export function canPlayAt(
    domino: Domino,
    chain: DominoChainState,
    end: ChainEnd,
): PipValue | null {
    if (chain.segments.length === 0) return domino.pip1;

    const openPip = end === "head" ? chain.headOpenPip : chain.tailOpenPip;
    if (openPip === null) return null;

    if (domino.pip1 === openPip) return domino.pip1;
    if (domino.pip2 === openPip) return domino.pip2;
    return null;
}

/**
 * Get all valid ends where a domino can be played.
 */
export function getPlayableEnds(
    domino: Domino,
    chain: DominoChainState,
): { end: ChainEnd; connectingPip: PipValue }[] {
    const results: { end: ChainEnd; connectingPip: PipValue }[] = [];

    if (chain.segments.length === 0) {
        results.push({ end: "tail", connectingPip: domino.pip1 });
        return results;
    }

    const headMatch = canPlayAt(domino, chain, "head");
    if (headMatch !== null) {
        results.push({ end: "head", connectingPip: headMatch });
    }

    const tailMatch = canPlayAt(domino, chain, "tail");
    if (tailMatch !== null) {
        results.push({ end: "tail", connectingPip: tailMatch });
    }

    return results;
}

/**
 * Determine the open pip at each end of a tile when placed.
 * connectingPip = the pip that touches the chain.
 */
export function getOrientedPips(
    domino: Domino,
    connectingPip: PipValue,
): { inwardPip: PipValue; outwardPip: PipValue } {
    if (domino.isDouble) {
        return { inwardPip: domino.pip1, outwardPip: domino.pip1 };
    }
    if (domino.pip1 === connectingPip) {
        return { inwardPip: domino.pip1, outwardPip: domino.pip2 };
    }
    return { inwardPip: domino.pip2, outwardPip: domino.pip1 };
}
