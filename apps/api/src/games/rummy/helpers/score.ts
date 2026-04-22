// apps/api/src/games/rummy/helpers/score.ts
// Round scoring for Rummy.

import {
    Card,
    Meld,
    RummyPlayerRoundScore,
    RummyRoundSummary,
    scoreHand,
} from "@family-games/shared";

/**
 * For each player, gather all cards they melded this round (across all
 * melds they originated + all lay-offs they performed). For v1 we attribute
 * meld points to the meld OWNER for original cards, and to the LAYER for
 * lay-offs. To keep this simple in v1, we attribute all cards in a meld
 * to the meld's owner. (Lay-offs by other players become their melded cards
 * via a per-player melded ledger maintained separately.)
 *
 * Caller must pass `meldedByPlayer` already maintained by the reducer.
 */
export function buildRoundSummary(args: {
    round: number;
    playOrder: readonly string[];
    hands: Record<string, Card[]>;
    meldedByPlayer: Record<string, Card[]>;
    wentOutPlayerId: string | null;
    goingOutBonus: number;
}): RummyRoundSummary {
    const perPlayer: Record<string, RummyPlayerRoundScore> = {};
    let bestDelta = -Infinity;
    let winnerId: string | null = null;
    let tied = false;

    for (const pid of args.playOrder) {
        const result = scoreHand({
            hand: args.hands[pid] ?? [],
            melded: args.meldedByPlayer[pid] ?? [],
            wentOut: pid === args.wentOutPlayerId,
            goingOutBonus: args.goingOutBonus,
        });
        perPlayer[pid] = {
            playerId: pid,
            meldedPoints: result.meldedPoints,
            deadwoodPoints: result.deadwoodPoints,
            goingOutBonus: result.bonus,
            delta: result.delta,
        };
        if (result.delta > bestDelta) {
            bestDelta = result.delta;
            winnerId = pid;
            tied = false;
        } else if (result.delta === bestDelta) {
            tied = true;
        }
    }

    return {
        round: args.round,
        perPlayer,
        wentOut: args.wentOutPlayerId,
        winnerId: tied ? null : winnerId,
    };
}

/** Apply round summary deltas to running scores. */
export function applyRoundSummary(
    scores: Record<string, number>,
    summary: RummyRoundSummary,
): Record<string, number> {
    const next = { ...scores };
    for (const pid in summary.perPlayer) {
        next[pid] = (next[pid] ?? 0) + summary.perPlayer[pid].delta;
    }
    return next;
}

/**
 * Determine if any player has reached the win target.
 * Returns the winner id (highest score ≥ target) or null.
 */
export function findWinner(
    scores: Record<string, number>,
    winTarget: number,
): string | null {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const [pid, s] of Object.entries(scores)) {
        if (s >= winTarget && s > bestScore) {
            bestScore = s;
            bestId = pid;
        }
    }
    return bestId;
}

/** Identity helper used for ledger initialization. */
export function emptyMeldedLedger(
    playOrder: readonly string[],
): Record<string, Card[]> {
    return Object.fromEntries(playOrder.map((id) => [id, [] as Card[]]));
}
