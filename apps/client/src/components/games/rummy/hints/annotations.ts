// apps/client/src/components/games/rummy/hints/annotations.ts
//
// Converts a `RummyHints` snapshot + active hint settings into a per-card
// annotation map keyed by **server hand index**. The renderer translates
// from server → display index when it builds the hand visual.
//
// Also computes which hand indices belong to which "color group" so the
// CardHand renderer can apply distinct ring colors per detected meld.

import type { RummyHints } from "@shared/hints/rummy";
import type { RummyHintSettings } from "./useRummyHintSettings";

/** Single-card visual annotation. Keyed by server hand index. */
export interface CardAnnotation {
    /** Tailwind ring color class (e.g. `ring-amber-400`). */
    ringClass?: string;
    /** Tailwind ring style class (e.g. `ring-2` or `ring-2 ring-dashed`). */
    ringStyleClass?: string;
    /** Apply `animate-pulse`. */
    pulse?: boolean;
    /** Optional small badge label ("set" / "run" / "lay"). */
    badge?: string;
    /** Optional badge color (Tailwind bg class), pairs with `badge`. */
    badgeColorClass?: string;
}

// Stable distinct ring palette for meld groups (cycled).
const GROUP_RING_CLASSES: readonly string[] = [
    "ring-emerald-400",
    "ring-sky-400",
    "ring-violet-400",
    "ring-rose-400",
    "ring-amber-400",
    "ring-cyan-400",
];

const LAYOFF_RING_CLASS = "ring-amber-400";
const NEAR_MELD_RING_CLASS = "ring-white/40";
const PICKED_MELD_RING_CLASS = "ring-cyan-300";

/**
 * Build per-card annotations for the hero's hand.
 *
 * Priority when a card matches multiple categories:
 *   1. Layoff candidate — amber pulse (always wins, most actionable hint).
 *   2. Composes with just-picked card — cyan pulse (contextual: only set
 *      when the player has a `pendingDiscardPick` they must meld).
 *   3. Complete meld group — solid colored ring (run = solid, set = solid+badge).
 *   4. Near-meld — faint dotted/dashed ring.
 */
export function buildHandAnnotations(
    hints: RummyHints,
    settings: RummyHintSettings,
): Record<number, CardAnnotation> {
    const out: Record<number, CardAnnotation> = {};

    if (settings.meldGroups) {
        hints.meldGroups.forEach((group, gi) => {
            const ringClass =
                GROUP_RING_CLASSES[gi % GROUP_RING_CLASSES.length];
            const ringStyleClass = group.kind === "run" ? "ring-2" : "ring-2";
            for (const idx of group.handIndices) {
                out[idx] = {
                    ringClass,
                    ringStyleClass,
                    badge: group.kind === "run" ? "run" : "set",
                    badgeColorClass:
                        group.kind === "run" ? "bg-sky-600" : "bg-emerald-600",
                };
            }
        });
    }

    if (settings.nearMelds) {
        for (const group of hints.nearMeldGroups) {
            for (const idx of group.handIndices) {
                if (out[idx]) continue; // don't override complete-meld annotation
                out[idx] = {
                    ringClass: NEAR_MELD_RING_CLASS,
                    ringStyleClass: "ring-1",
                };
            }
        }
    }

    // Contextual: only present while the player has a pending discard pick.
    // Gated on master-only (no separate sub-toggle): this hint is transient
    // and high-signal, and the user has already opted in by enabling hints.
    // Overrides complete/near meld groups so the "what fits with what I just
    // picked" answer is unambiguous, but still defers to layoff (below).
    if (hints.meldWithPickedIndices.size > 0) {
        for (const idx of hints.meldWithPickedIndices) {
            out[idx] = {
                ringClass: PICKED_MELD_RING_CLASS,
                ringStyleClass: "ring-2",
                pulse: true,
                badge: "fits",
                badgeColorClass: "bg-cyan-600",
            };
        }
    }

    if (settings.layoffs) {
        for (const idx of hints.layoffsByHandIndex.keys()) {
            // Layoff wins — overrides any prior annotation for this card.
            out[idx] = {
                ringClass: LAYOFF_RING_CLASS,
                ringStyleClass: "ring-2",
                pulse: true,
                badge: "lay",
                badgeColorClass: "bg-amber-500",
            };
        }
    }

    return out;
}
