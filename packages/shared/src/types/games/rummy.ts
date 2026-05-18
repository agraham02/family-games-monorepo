// packages/shared/src/types/games/rummy.ts
// Rummy 500 (house rules) — types shared between client and API.
//
// Variant rules (locked-in v1):
//   - Card values: A=15, K/Q/J/10=10, 2-9=5
//   - Dealer picks any odd hand size in [dealSizeMin..dealSizeMax]
//   - Turn flow: must-draw → may-meld-or-discard → must-discard
//   - Take-discard: pick any card from the discard pile + take all cards above
//     it as a "tail". The picked card MUST be immediately played (lay-off
//     existing meld OR new meld). Hand cards may be combined.
//   - "Rummy!" call: short window after each discard; first valid call wins.
//   - Going out: discard last card OR play last card into meld
//     (cardless-waiting until next turn).
//   - Stock-exhaustion: round does NOT end. Players may PASS_DRAW or
//     take from the discard pile until someone goes out.
//   - Scoring: meldedPoints − deadwoodPoints (+ goingOutBonus on going out).

import { BaseGameData, BasePlayerData, GameState, TurnTimerInfo } from "./base";
import { RummySettings } from "../settings";
import { Card, PlayingCard } from "./cards";

// ============================================================================
// Meld types
// ============================================================================

export type MeldKind = "set" | "run";

/**
 * A meld on the table. Owned by the player who first laid it down,
 * but any player may lay-off cards onto it on their turn.
 */
export interface Meld {
    /** Stable identifier (server-assigned). */
    readonly id: string;
    /** "set" = 3+ same-rank cards across different suits.
     *  "run" = 3+ consecutive cards of same suit (Ace low only). */
    readonly kind: MeldKind;
    /** Cards in display order. For runs, low → high. For sets, dealt order. */
    cards: Card[];
    /** Player who originally laid the meld. */
    ownerId: string;
    /** Round number this meld was created in. */
    round: number;
    /**
     * Per-card lay-off attribution. Each entry maps a position in `cards`
     * to the player who added that card via lay-off (LAY_OFF, TAKE_DISCARD
     * intoMeldId, or CALL_RUMMY). Cards laid by the original owner do NOT
     * appear here. Used for client visualisation (showing whose card joined
     * a shared meld) and round scoring (ledger source of truth still lives
     * server-side on `_meldedByPlayer`).
     */
    layoffs?: MeldLayoff[];
}

export interface MeldLayoff {
    /** Index into `Meld.cards` after the lay-off was applied. */
    index: number;
    /** Player who laid this card. */
    playerId: string;
}

// ============================================================================
// Discard pile
// ============================================================================

/**
 * Discard pile: index 0 = bottom (oldest), last = top (most recent / face-up).
 * When a player takes from the discard pile, they pick at index `pickIndex`
 * and take everything from pickIndex..end as the "tail".
 */
export interface DiscardPile {
    cards: Card[];
}

// ============================================================================
// Turn state machine
// ============================================================================

/**
 * Substate within a single player's turn.
 *  - awaiting-draw: must draw from stock or take from discard (cannot end turn)
 *  - awaiting-discard-play: take-discard pending; the just-picked card MUST
 *    be played into a meld or lay-off before any other action.
 *  - may-meld: drew from stock, or finished discard-play. Free to meld/layoff
 *    or discard.
 *  - rummy-window: the just-discarded card opened a Rummy! call window.
 *    No player is actively taking a turn; opponents may CALL_RUMMY until
 *    the window expires, after which play advances to the next player.
 *  - cardless-waiting: laid last card into a meld; will go out at start of
 *    next turn unless stock empties first.
 */
export type RummyTurnSubstate =
    | "awaiting-draw"
    | "awaiting-discard-play"
    | "may-meld"
    | "rummy-window"
    | "cardless-waiting";

export type RummyPhase =
    | "deal-size-prompt" // dealer is selecting hand size
    | "playing"
    | "round-summary"
    | "finished";

// ============================================================================
// Actions (client → server)
// ============================================================================

/** Draw the top card from the stock pile. */
export interface DrawStockAction {
    type: "DRAW_STOCK";
    playerId: string;
}

/**
 * Skip the draw step entirely. Legal only when the stock pile is empty
 * (house rule: a player should not be forced to take an unwanted discard
 * simply because the stock ran out). Transitions the turn to the meld
 * substate with no card added to the hand.
 */
export interface PassDrawAction {
    type: "PASS_DRAW";
    playerId: string;
}

/**
 * Take the discard pile starting from `pickIndex` (0-based). The picked card
 * (cards[pickIndex]) MUST be immediately played, atomically:
 *   - via `intoMeldId` (lay-off onto an existing meld), OR
 *   - via `newMeld` (form a new meld using the picked card + optional
 *     additional cards from the player's hand).
 *
 * Server validates atomicity in a single transaction. Other cards in the
 * tail (pickIndex+1..end) join the player's hand.
 */
export interface TakeDiscardAction {
    type: "TAKE_DISCARD";
    playerId: string;
    pickIndex: number;
    /** Lay-off the picked card onto an existing meld. */
    intoMeldId?: string;
    /**
     * Form a new meld. Must include the picked card. Other cards must come
     * from the player's hand. Server re-validates the meld.
     */
    newMeld?: Card[];
}

/** Lay down a new meld from the player's hand. */
export interface LayMeldAction {
    type: "LAY_MELD";
    playerId: string;
    cards: Card[];
}

/** Add a single card from hand to an existing meld. */
export interface LayOffAction {
    type: "LAY_OFF";
    playerId: string;
    meldId: string;
    card: Card;
}

/** Discard a single card from hand, ending the turn. */
export interface DiscardAction {
    type: "DISCARD";
    playerId: string;
    card: Card;
}

/**
 * Call "Rummy!" on the most recent discard within the call window.
 * If valid (the discarded card could have been laid off onto an existing
 * meld), the caller takes the card and immediately plays it.
 */
export interface CallRummyAction {
    type: "CALL_RUMMY";
    playerId: string;
    /** The meld the caller will lay the card off onto. */
    meldId: string;
}

/** Dealer chooses the hand size for this round. */
export interface ChooseDealSizeAction {
    type: "CHOOSE_DEAL_SIZE";
    playerId: string;
    handSize: number;
}

export type RummyAction =
    | DrawStockAction
    | PassDrawAction
    | TakeDiscardAction
    | LayMeldAction
    | LayOffAction
    | DiscardAction
    | CallRummyAction
    | ChooseDealSizeAction;

// ============================================================================
// Round scoring
// ============================================================================

export interface RummyPlayerRoundScore {
    playerId: string;
    /** Sum of card values melded by this player this round. */
    meldedPoints: number;
    /** Sum of card values left in this player's hand at round end. */
    deadwoodPoints: number;
    /** Bonus for going out (0 unless this player went out). */
    goingOutBonus: number;
    /** Net delta added to the player's running total this round. */
    delta: number;
}

export interface RummyRoundSummary {
    round: number;
    perPlayer: Record<string, RummyPlayerRoundScore>;
    /** Player who emptied their hand (null if stock exhausted). */
    wentOut: string | null;
    /** Player who won the round (highest delta), null on tie. */
    winnerId: string | null;
}

// ============================================================================
// Game State (server-authoritative)
// ============================================================================

export interface RummyState extends GameState {
    settings: RummySettings;

    playOrder: string[]; // seat order, clockwise
    dealerIndex: number;
    currentTurnIndex: number;

    phase: RummyPhase;
    turnSubstate: RummyTurnSubstate;
    round: number;

    /** Server-side: real cards. Client receives counts via getPlayerView. */
    hands: Record<string, Card[]>;
    /** Cards taken via take-discard pending immediate play (transient). */
    pendingDiscardPick?: {
        playerId: string;
        pickedCard: Card;
        tail: Card[]; // cards above the picked card; will join hand on commit
    };

    stock: Card[]; // index 0 = top of stock
    discard: DiscardPile;

    melds: Meld[];

    /** Running totals across rounds. */
    scores: Record<string, number>;

    /** Round-level scoring (set on round end). */
    lastRoundSummary?: RummyRoundSummary;

    /** Open "Rummy!" call window after a discard. */
    rummyCall?: {
        /** The discarded card eligible for call. */
        card: Card;
        /** Player whose discard opened the window. */
        discardedById: string;
        /** Server timestamp (ms) when window opens. */
        openedAt: number;
        /** Server timestamp (ms) when window closes. */
        closesAt: number;
        /** Meld IDs the discarded card could lay off onto (deterministic ordering). */
        eligibleMeldIds: string[];
    };

    gameWinnerId?: string;
    history: string[];

    /** ISO timestamp when the current turn started (for turn timer). */
    turnStartedAt?: string;
}

// ============================================================================
// Client view types
// ============================================================================

/**
 * Client-facing meld (uses PlayingCard for render layer).
 */
export interface RummyMeldView {
    id: string;
    kind: MeldKind;
    cards: PlayingCard[];
    ownerId: string;
    round: number;
    /** Per-card lay-off attribution (mirrors `Meld.layoffs`). */
    layoffs?: MeldLayoff[];
}

export interface RummyDiscardView {
    cards: PlayingCard[];
}

export interface RummyClientSettings {
    winTarget: number;
    roundLimit: number | null;
    turnTimeLimit: number | null;
    goingOutBonus: number;
    rummyCallWindowMs: number;
    dealSizeMin: number;
    dealSizeMax: number;
}

/**
 * Public game data sent to all players.
 */
export type RummyData = BaseGameData & {
    id: string;
    roomId: string;
    type: "rummy";

    playOrder: string[];
    dealerIndex: number;
    currentTurnIndex: number;

    phase: RummyPhase;
    turnSubstate: RummyTurnSubstate;
    round: number;

    /** Public hand counts per player. */
    handCounts: Record<string, number>;
    stockCount: number;
    discard: RummyDiscardView;
    melds: RummyMeldView[];

    scores: Record<string, number>;

    lastRoundSummary?: RummyRoundSummary;

    rummyCall?: {
        card: PlayingCard;
        discardedById: string;
        openedAt: number;
        closesAt: number;
        eligibleMeldIds: string[];
    };

    gameWinnerId?: string;

    turnTimer?: TurnTimerInfo;

    settings: RummyClientSettings;
};

/**
 * Private per-player data (the player's hand + transient picked card).
 */
export type RummyPlayerData = BasePlayerData & {
    hand: PlayingCard[];
    /**
     * If set, this player has a take-discard in progress and must play
     * `pickedCard` (server enforces atomicity, but UI surfaces it).
     */
    pendingDiscardPick?: {
        pickedCard: PlayingCard;
        tail: PlayingCard[];
    };
};

// ============================================================================
// Constants
// ============================================================================

export const RUMMY_MIN_PLAYERS = 2;
export const RUMMY_MAX_PLAYERS = 6;
export const RUMMY_MIN_MELD_SIZE = 3;
