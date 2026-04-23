// apps/client/src/components/games/rummy/hints/useRummyHintSettings.ts
//
// Reads the rummy hint preferences from localStorage and exposes the
// effective on/off state for each granular toggle. A sub-toggle is
// "effective" only when both itself AND the master are enabled.
//
// Storage keys (all booleans, "true"/"false"):
//   rummy.showHints              — master
//   rummy.hints.meldGroups       — color-ring groupings on detected sets/runs
//   rummy.hints.layoffs          — pulse cards that can lay off onto a meld
//   rummy.hints.nearMelds        — fainter ring on pairs / 2-card straights
//   rummy.hints.deadwood         — show deadwood badge on toolbar
//   rummy.hints.discardTop       — glow top of discard when relevant
//   rummy.hints.meldButtonPulse  — pulse "Confirm meld" when valid
//
// Defaults (when storage entry missing): master OFF; all sub-toggles ON
// EXCEPT `nearMelds` which defaults OFF (noisier signal).

"use client";

import { useGameSetting } from "@/components/games/shared";

export interface RummyHintSettings {
    readonly master: boolean;
    readonly meldGroups: boolean;
    readonly layoffs: boolean;
    readonly nearMelds: boolean;
    readonly deadwood: boolean;
    readonly discardTop: boolean;
    readonly meldButtonPulse: boolean;
}

export const RUMMY_HINT_KEYS = {
    master: "rummy.showHints",
    meldGroups: "rummy.hints.meldGroups",
    layoffs: "rummy.hints.layoffs",
    nearMelds: "rummy.hints.nearMelds",
    deadwood: "rummy.hints.deadwood",
    discardTop: "rummy.hints.discardTop",
    meldButtonPulse: "rummy.hints.meldButtonPulse",
} as const;

export function useRummyHintSettings(): RummyHintSettings {
    const master = useGameSetting(RUMMY_HINT_KEYS.master, false);
    const meldGroups = useGameSetting(RUMMY_HINT_KEYS.meldGroups, true);
    const layoffs = useGameSetting(RUMMY_HINT_KEYS.layoffs, true);
    const nearMelds = useGameSetting(RUMMY_HINT_KEYS.nearMelds, false);
    const deadwood = useGameSetting(RUMMY_HINT_KEYS.deadwood, true);
    const discardTop = useGameSetting(RUMMY_HINT_KEYS.discardTop, true);
    const meldButtonPulse = useGameSetting(
        RUMMY_HINT_KEYS.meldButtonPulse,
        true,
    );

    return {
        master,
        meldGroups: master && meldGroups,
        layoffs: master && layoffs,
        nearMelds: master && nearMelds,
        deadwood: master && deadwood,
        discardTop: master && discardTop,
        meldButtonPulse: master && meldButtonPulse,
    };
}
