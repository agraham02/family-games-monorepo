"use client";

import { useMemo } from "react";
import type { RummyData } from "@shared/types";

/**
 * High-level UI scene for the Rummy game. Derived from the combination of
 * (phase, isMyTurn, turnSubstate). The RummyStage orchestrator renders
 * exactly one scene component at a time and animates transitions.
 */
export type RummyScene =
    | "DEAL_PROMPT"
    | "ROUND_SUMMARY"
    | "DRAW"
    | "MELD"
    | "WAITING";

export interface UseRummySceneArgs {
    phase: RummyData["phase"];
    turnSubstate: RummyData["turnSubstate"];
    isMyTurn: boolean;
    isSpectator: boolean;
}

/**
 * Map game state → active scene.
 *
 *  - deal-size-prompt → DEAL_PROMPT (overlay above whichever scene, but we
 *    still return it so RummyStage can suppress the play scene if desired)
 *  - round-summary    → ROUND_SUMMARY
 *  - playing + myTurn + awaiting-draw         → DRAW
 *  - playing + myTurn + may-meld              → MELD
 *  - playing + myTurn + awaiting-discard-play → MELD (composer pre-seeded)
 *  - playing + myTurn + cardless-waiting      → WAITING (informational)
 *  - playing + !myTurn                        → WAITING
 *  - spectator                                → WAITING
 */
export function useRummyScene({
    phase,
    turnSubstate,
    isMyTurn,
    isSpectator,
}: UseRummySceneArgs): RummyScene {
    return useMemo<RummyScene>(() => {
        if (phase === "deal-size-prompt") return "DEAL_PROMPT";
        if (phase === "round-summary") return "ROUND_SUMMARY";
        if (isSpectator || !isMyTurn) return "WAITING";
        if (turnSubstate === "awaiting-draw") return "DRAW";
        if (
            turnSubstate === "may-meld" ||
            turnSubstate === "awaiting-discard-play"
        ) {
            return "MELD";
        }
        // cardless-waiting falls through to WAITING
        return "WAITING";
    }, [phase, turnSubstate, isMyTurn, isSpectator]);
}
