// apps/api/src/games/rummy/index.ts
// Rummy 500 (house rules) — server-authoritative game module.
//
// See packages/shared/src/types/games/rummy.ts for the locked rule set.

import {
    Room,
    User,
    Card,
    PlayingCard,
    Meld,
    RummySettings,
    DEFAULT_RUMMY_SETTINGS,
    RUMMY_SETTINGS_DEFINITIONS,
    RUMMY_MIN_PLAYERS,
    RUMMY_MAX_PLAYERS,
    RUMMY_MIN_MELD_SIZE,
    RummyState,
    RummyData,
    RummyMeldView,
    RummyDiscardView,
    RummyPlayerData,
    RummyClientSettings,
    RummyAction,
    RummyTurnSubstate,
    isValidMeld,
    detectMeldKind,
    canLayOffCard,
    isRummyCallable,
    findAllLayoffTargets,
    isValidDealSize,
    TurnTimerInfo,
    PartialGameSettings,
} from "@family-games/shared";
import { GameModule, GameAction, GameState } from "../../services/GameManager";
import {
    handlePlayerReconnect,
    handlePlayerDisconnect,
    checkAllPlayersConnected,
} from "../shared";
import { v4 as uuidv4 } from "uuid";
import { produce } from "immer";
import { buildDeck, cardsEqual, removeCards } from "./helpers/deck";
import {
    buildRoundSummary,
    applyRoundSummary,
    findWinner,
    emptyMeldedLedger,
} from "./helpers/score";

export { getAutoAction, shouldTimerBeActive } from "./helpers/autoAction";

const RUMMY_NAME = "rummy";
const RUMMY_DISPLAY_NAME = "Rummy 500";

const RUMMY_METADATA = {
    type: RUMMY_NAME,
    displayName: RUMMY_DISPLAY_NAME,
    description:
        'Form sets and runs, lay them down, and be first to 500. House rules: dealer chooses hand size, take any discard with the tail, call "Rummy!" on missed lay-offs.',
    requiresTeams: false,
    minPlayers: RUMMY_MIN_PLAYERS,
    maxPlayers: RUMMY_MAX_PLAYERS,
    settingsDefinitions: RUMMY_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_RUMMY_SETTINGS,
};

// ============================================================================
// Internal extended state — keeps a melded-by-player ledger that isn't part
// of the public RummyState type but is needed for round scoring.
// We attach it via a Symbol-keyed field so it survives produce() calls but
// stays out of the public API.
// ============================================================================

interface InternalRummyState extends RummyState {
    /**
     * Cards each player has melded this round (their portion). Resets each
     * round. Used for end-of-round scoring.
     */
    _meldedByPlayer?: Record<string, Card[]>;
    /**
     * Round number in which each player last drew/discarded. Used for
     * cardless-waiting going-out check.
     */
    _wentOutPlayerId?: string | null;
}

function getMeldedLedger(state: InternalRummyState): Record<string, Card[]> {
    if (!state._meldedByPlayer) {
        state._meldedByPlayer = emptyMeldedLedger(state.playOrder);
    }
    return state._meldedByPlayer;
}

// ============================================================================
// Init
// ============================================================================

function init(room: Room, customSettings?: PartialGameSettings): RummyState {
    const settings: RummySettings = {
        ...DEFAULT_RUMMY_SETTINGS,
        ...(customSettings as Partial<RummySettings>),
    };

    const players: Record<string, User> = Object.fromEntries(
        room.users.map((u) => [u.id, u]),
    );
    const playOrder = room.users.map((u) => u.id);

    // Random first dealer
    const dealerIndex = Math.floor(Math.random() * playOrder.length);

    const state: InternalRummyState = {
        id: uuidv4(),
        roomId: room.id,
        type: RUMMY_NAME,
        settings,
        players,
        leaderId: room.leaderId,
        history: [`Game initialized with ${playOrder.length} players`],

        playOrder,
        dealerIndex,
        currentTurnIndex: (dealerIndex + 1) % playOrder.length, // start to dealer's left

        phase: "deal-size-prompt",
        turnSubstate: "awaiting-draw",
        round: 1,

        hands: Object.fromEntries(playOrder.map((id) => [id, [] as Card[]])),
        stock: [],
        discard: { cards: [] },
        melds: [],
        scores: Object.fromEntries(playOrder.map((id) => [id, 0])),

        _meldedByPlayer: emptyMeldedLedger(playOrder),
        turnStartedAt: new Date().toISOString(),
    };

    return state;
}

// ============================================================================
// Helpers
// ============================================================================

function dealRound(state: InternalRummyState, handSize: number): void {
    const deck = buildDeck();
    const playOrder = state.playOrder;

    // Deal handSize to each player, round-robin style starting from
    // dealer's left.
    const hands: Record<string, Card[]> = Object.fromEntries(
        playOrder.map((id) => [id, [] as Card[]]),
    );
    let cursor = 0;
    for (let r = 0; r < handSize; r++) {
        for (let p = 0; p < playOrder.length; p++) {
            const seat = (state.dealerIndex + 1 + p) % playOrder.length;
            hands[playOrder[seat]].push(deck[cursor++]);
        }
    }
    // Flip top card to start discard pile.
    const flip = deck[cursor++];
    const stock = deck.slice(cursor);

    state.hands = hands;
    state.discard = { cards: [flip] };
    state.stock = stock;
    state.melds = [];
    state._meldedByPlayer = emptyMeldedLedger(playOrder);
    state._wentOutPlayerId = null;
    state.lastRoundSummary = undefined;
    state.rummyCall = undefined;
    state.pendingDiscardPick = undefined;
    state.turnSubstate = "awaiting-draw";
    state.phase = "playing";
    state.currentTurnIndex = (state.dealerIndex + 1) % playOrder.length;
    state.turnStartedAt = new Date().toISOString();
}

function advanceTurn(state: InternalRummyState): void {
    state.currentTurnIndex =
        (state.currentTurnIndex + 1) % state.playOrder.length;
    state.turnSubstate = "awaiting-draw";
    state.turnStartedAt = new Date().toISOString();
    state.pendingDiscardPick = undefined;
    state.rummyCall = undefined;
}

function endRound(
    state: InternalRummyState,
    wentOutPlayerId: string | null,
): void {
    const summary = buildRoundSummary({
        round: state.round,
        playOrder: state.playOrder,
        hands: state.hands,
        meldedByPlayer: getMeldedLedger(state),
        wentOutPlayerId,
        goingOutBonus: state.settings.goingOutBonus,
    });
    state.scores = applyRoundSummary(state.scores, summary);
    state.lastRoundSummary = summary;

    const winner = findWinner(state.scores, state.settings.winTarget);
    const roundLimitReached =
        state.settings.roundLimit !== null &&
        state.round >= state.settings.roundLimit;

    if (winner || roundLimitReached) {
        state.phase = "finished";
        state.gameWinnerId = winner ?? findHighestScorer(state.scores);
    } else {
        state.phase = "round-summary";
    }
    state.history.push(
        `Round ${state.round} ended. ` +
            (wentOutPlayerId
                ? `${wentOutPlayerId} went out.`
                : `Stock exhausted.`),
    );
}

function findHighestScorer(scores: Record<string, number>): string {
    let bestId = "";
    let bestScore = -Infinity;
    for (const [pid, s] of Object.entries(scores)) {
        if (s > bestScore) {
            bestScore = s;
            bestId = pid;
        }
    }
    return bestId;
}

function startNextRound(state: InternalRummyState): void {
    state.round += 1;
    state.dealerIndex = (state.dealerIndex + 1) % state.playOrder.length;
    state.phase = "deal-size-prompt";
    state.turnStartedAt = new Date().toISOString();
}

/** Return ids of melds the picked card can be played onto, deterministic. */
function pickedCardLayoffTargets(card: Card, melds: Meld[]): string[] {
    return findAllLayoffTargets(card, melds);
}

function attributeMeldedCards(
    state: InternalRummyState,
    playerId: string,
    cards: readonly Card[],
): void {
    const ledger = getMeldedLedger(state);
    const cur = ledger[playerId] ?? [];
    ledger[playerId] = [...cur, ...cards];
}

/** True if the given hand is empty (player went out). */
function isHandEmpty(state: InternalRummyState, playerId: string): boolean {
    return (state.hands[playerId] ?? []).length === 0;
}

function checkGoingOut(
    state: InternalRummyState,
    playerId: string,
    cameFromDiscard: boolean,
): boolean {
    if (!isHandEmpty(state, playerId)) return false;
    if (cameFromDiscard) {
        // Standard: discarded the last card → goes out immediately.
        state._wentOutPlayerId = playerId;
        endRound(state, playerId);
        return true;
    }
    // Played last card into a meld → cardless-waiting until next turn.
    state.turnSubstate = "cardless-waiting";
    state.history.push(`${playerId} is cardless; will go out next turn.`);
    return false;
}

// ============================================================================
// Reducer
// ============================================================================

function reducer(state: GameState, action: GameAction): GameState {
    const s = state as unknown as InternalRummyState;
    return produce(s, (draft) => {
        try {
            applyAction(
                draft,
                action as unknown as RummyAction & { userId: string },
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            draft.history.push(`[ERROR] ${msg}`);
        }
    }) as InternalRummyState;
}

function applyAction(
    draft: InternalRummyState,
    action: RummyAction & { userId?: string },
): void {
    const actorId = action.playerId ?? action.userId ?? "";

    switch (action.type) {
        case "CHOOSE_DEAL_SIZE":
            return handleChooseDealSize(draft, actorId, action.handSize);
        case "DRAW_STOCK":
            return handleDrawStock(draft, actorId);
        case "TAKE_DISCARD":
            return handleTakeDiscard(
                draft,
                actorId,
                action.pickIndex,
                action.intoMeldId,
                action.newMeld,
            );
        case "LAY_MELD":
            return handleLayMeld(draft, actorId, action.cards);
        case "LAY_OFF":
            return handleLayOff(draft, actorId, action.meldId, action.card);
        case "DISCARD":
            return handleDiscard(draft, actorId, action.card);
        case "CALL_RUMMY":
            return handleCallRummy(draft, actorId, action.meldId);
        default: {
            // Settings-driven game flow control (e.g., next round)
            const t = (action as unknown as { type: string }).type;
            if (t === "NEXT_ROUND") {
                if (draft.phase !== "round-summary") {
                    throw new Error(
                        "Cannot start next round outside round-summary",
                    );
                }
                startNextRound(draft);
                return;
            }
            throw new Error(`Unknown action: ${t}`);
        }
    }
}

// ============================================================================
// Action handlers
// ============================================================================

function assertCurrentPlayer(
    state: InternalRummyState,
    playerId: string,
): void {
    const expected = state.playOrder[state.currentTurnIndex];
    if (expected !== playerId) throw new Error(`Not your turn (${playerId})`);
}

function handleChooseDealSize(
    state: InternalRummyState,
    playerId: string,
    handSize: number,
): void {
    if (state.phase !== "deal-size-prompt") {
        throw new Error("Deal size already chosen");
    }
    const dealerId = state.playOrder[state.dealerIndex];
    if (dealerId !== playerId)
        throw new Error("Only the dealer may choose deal size");

    if (
        !isValidDealSize(handSize, {
            min: state.settings.dealSizeMin,
            max: state.settings.dealSizeMax,
            deckSize: 52,
            playerCount: state.playOrder.length,
        })
    ) {
        throw new Error(`Invalid deal size: ${handSize}`);
    }

    dealRound(state, handSize);
    state.history.push(`Dealer ${dealerId} chose hand size ${handSize}`);
}

function handleDrawStock(state: InternalRummyState, playerId: string): void {
    assertCurrentPlayer(state, playerId);
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (state.turnSubstate === "cardless-waiting") {
        // Cardless player at the start of their turn → they go out now.
        state._wentOutPlayerId = playerId;
        endRound(state, playerId);
        return;
    }
    if (state.turnSubstate !== "awaiting-draw") {
        throw new Error(`Cannot draw in substate: ${state.turnSubstate}`);
    }

    if (state.stock.length === 0) {
        // Stock exhausted → round ends immediately.
        endRound(state, null);
        return;
    }

    const top = state.stock[0];
    state.stock = state.stock.slice(1);
    state.hands[playerId] = [...state.hands[playerId], top];
    state.turnSubstate = "may-meld";
    state.history.push(`${playerId} drew from stock`);

    if (state.stock.length === 0) {
        // Drawing the last card still allows the rest of the turn,
        // but next player can't draw → they'll trigger end on next draw.
    }
}

function handleTakeDiscard(
    state: InternalRummyState,
    playerId: string,
    pickIndex: number,
    intoMeldId: string | undefined,
    newMeld: Card[] | undefined,
): void {
    assertCurrentPlayer(state, playerId);
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (state.turnSubstate === "cardless-waiting") {
        state._wentOutPlayerId = playerId;
        endRound(state, playerId);
        return;
    }
    if (state.turnSubstate !== "awaiting-draw") {
        throw new Error(
            `Cannot take discard in substate: ${state.turnSubstate}`,
        );
    }
    if (pickIndex < 0 || pickIndex >= state.discard.cards.length) {
        throw new Error("pickIndex out of range");
    }
    if (!intoMeldId && !newMeld) {
        throw new Error("Must specify intoMeldId or newMeld");
    }
    if (intoMeldId && newMeld) {
        throw new Error("Specify only one of intoMeldId / newMeld");
    }

    const picked = state.discard.cards[pickIndex];
    const tail = state.discard.cards.slice(pickIndex + 1);

    // Atomic validation:
    if (intoMeldId) {
        const meld = state.melds.find((m) => m.id === intoMeldId);
        if (!meld) throw new Error("Meld not found");
        if (!canLayOffCard(picked, meld)) {
            throw new Error("Picked card cannot lay off onto that meld");
        }
        // Commit: shrink discard, lay off, hand absorbs tail.
        state.discard.cards = state.discard.cards.slice(0, pickIndex);
        meld.cards = [...meld.cards, picked];
        meld.layoffs = [
            ...(meld.layoffs ?? []),
            { index: meld.cards.length - 1, playerId },
        ];
        state.hands[playerId] = [...state.hands[playerId], ...tail];
        attributeMeldedCards(state, playerId, [picked]);
        state.history.push(
            `${playerId} took ${picked.rank}${picked.suit[0]} (+${tail.length} tail) → laid off on ${intoMeldId}`,
        );
    } else if (newMeld) {
        // The picked card MUST be part of newMeld.
        if (!newMeld.some((c) => cardsEqual(c, picked))) {
            throw new Error("newMeld must include the picked card");
        }
        if (!isValidMeld(newMeld)) {
            throw new Error("newMeld is not a valid set or run");
        }
        // All other cards must come from the player's hand.
        const otherCards = newMeld.filter((c) => !cardsEqual(c, picked));
        const handAfter = removeCards(state.hands[playerId], otherCards);
        if (!handAfter)
            throw new Error("newMeld references cards not in your hand");

        state.discard.cards = state.discard.cards.slice(0, pickIndex);
        const meld: Meld = {
            id: uuidv4(),
            kind: detectMeldKind(newMeld)!,
            cards: [...newMeld],
            ownerId: playerId,
            round: state.round,
        };
        state.melds.push(meld);
        // Player gains tail, loses any used hand cards.
        state.hands[playerId] = [...handAfter, ...tail];
        attributeMeldedCards(state, playerId, newMeld);
        state.history.push(
            `${playerId} took ${picked.rank}${picked.suit[0]} (+${tail.length} tail) → new ${meld.kind} ${meld.id}`,
        );
    }

    state.turnSubstate = "may-meld";

    // Going-out check (player may have used last hand card forming new meld;
    // tail prevents going out unless tail.length === 0).
    if (isHandEmpty(state, playerId)) {
        // From discard pickup, if hand is now empty, treat as cardless-waiting
        // (per house rules: take-discard is not a "discard" so we use the
        // play-into-meld path).
        checkGoingOut(state, playerId, false);
    }
}

function handleLayMeld(
    state: InternalRummyState,
    playerId: string,
    cards: Card[],
): void {
    assertCurrentPlayer(state, playerId);
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (state.turnSubstate !== "may-meld") {
        throw new Error(`Cannot lay meld in substate: ${state.turnSubstate}`);
    }
    if (cards.length < RUMMY_MIN_MELD_SIZE) {
        throw new Error(`Meld must have at least ${RUMMY_MIN_MELD_SIZE} cards`);
    }
    if (!isValidMeld(cards)) throw new Error("Cards do not form a valid meld");

    const handAfter = removeCards(state.hands[playerId], cards);
    if (!handAfter) throw new Error("Meld references cards not in your hand");

    const meld: Meld = {
        id: uuidv4(),
        kind: detectMeldKind(cards)!,
        cards: [...cards],
        ownerId: playerId,
        round: state.round,
    };
    state.melds.push(meld);
    state.hands[playerId] = handAfter;
    attributeMeldedCards(state, playerId, cards);
    state.history.push(
        `${playerId} laid down ${meld.kind} (${cards.length} cards)`,
    );

    if (isHandEmpty(state, playerId)) {
        checkGoingOut(state, playerId, false);
    }
}

function handleLayOff(
    state: InternalRummyState,
    playerId: string,
    meldId: string,
    card: Card,
): void {
    assertCurrentPlayer(state, playerId);
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (state.turnSubstate !== "may-meld") {
        throw new Error(`Cannot lay off in substate: ${state.turnSubstate}`);
    }
    const meld = state.melds.find((m) => m.id === meldId);
    if (!meld) throw new Error("Meld not found");
    if (!canLayOffCard(card, meld))
        throw new Error("Card cannot lay off onto that meld");

    const handAfter = removeCards(state.hands[playerId], [card]);
    if (!handAfter) throw new Error("Card not in your hand");
    state.hands[playerId] = handAfter;
    meld.cards = [...meld.cards, card];
    meld.layoffs = [
        ...(meld.layoffs ?? []),
        { index: meld.cards.length - 1, playerId },
    ];
    attributeMeldedCards(state, playerId, [card]);
    state.history.push(
        `${playerId} laid off ${card.rank}${card.suit[0]} on ${meldId}`,
    );

    if (isHandEmpty(state, playerId)) {
        checkGoingOut(state, playerId, false);
    }
}

function handleDiscard(
    state: InternalRummyState,
    playerId: string,
    card: Card,
): void {
    assertCurrentPlayer(state, playerId);
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (state.turnSubstate !== "may-meld") {
        throw new Error(`Cannot discard in substate: ${state.turnSubstate}`);
    }

    const handAfter = removeCards(state.hands[playerId], [card]);
    if (!handAfter) throw new Error("Card not in your hand");
    state.hands[playerId] = handAfter;
    state.discard.cards = [...state.discard.cards, card];
    state.history.push(`${playerId} discarded ${card.rank}${card.suit[0]}`);

    // Going-out via discard
    if (isHandEmpty(state, playerId)) {
        checkGoingOut(state, playerId, true);
        return;
    }

    // Open "Rummy!" call window if the discard could have been laid off.
    if (isRummyCallable(card, state.melds)) {
        const now = Date.now();
        state.rummyCall = {
            card,
            discardedById: playerId,
            openedAt: now,
            closesAt: now + state.settings.rummyCallWindowMs,
            eligibleMeldIds: pickedCardLayoffTargets(card, state.melds),
        };
        state.history.push(
            `Rummy! window opened on ${card.rank}${card.suit[0]} for ${state.settings.rummyCallWindowMs}ms`,
        );
        // Defer turn advancement until the window expires (handled by a timer
        // in the calling layer). For now, advance turn immediately so the
        // game doesn't stall — call-rummy will steal back from next player
        // if it lands. Simpler v1: advance, allow CALL_RUMMY only while
        // window is open.
    }

    advanceTurn(state);
}

function handleCallRummy(
    state: InternalRummyState,
    callerId: string,
    meldId: string,
): void {
    if (state.phase !== "playing") throw new Error("Game not in playing phase");
    if (!state.rummyCall) throw new Error("No open Rummy! window");
    const now = Date.now();
    if (now > state.rummyCall.closesAt) {
        state.rummyCall = undefined;
        throw new Error("Rummy! window closed");
    }
    if (callerId === state.rummyCall.discardedById) {
        throw new Error("Cannot call Rummy! on your own discard");
    }
    const meld = state.melds.find((m) => m.id === meldId);
    if (!meld) throw new Error("Meld not found");
    if (!canLayOffCard(state.rummyCall.card, meld)) {
        throw new Error("Card cannot lay off onto that meld");
    }

    // Caller takes the card off the discard pile (it's the top, since it
    // was just discarded) and lays it off.
    const top = state.discard.cards[state.discard.cards.length - 1];
    if (!top || !cardsEqual(top, state.rummyCall.card)) {
        throw new Error("Discard pile state inconsistent with Rummy! window");
    }
    state.discard.cards = state.discard.cards.slice(0, -1);
    meld.cards = [...meld.cards, state.rummyCall.card];
    meld.layoffs = [
        ...(meld.layoffs ?? []),
        { index: meld.cards.length - 1, playerId: callerId },
    ];
    attributeMeldedCards(state, callerId, [state.rummyCall.card]);
    state.history.push(
        `${callerId} called Rummy! on ${state.rummyCall.card.rank}${state.rummyCall.card.suit[0]}`,
    );
    state.rummyCall = undefined;
    // Caller does NOT take a turn; play continues with whoever's turn it
    // currently is (we already advanced after the discard).
}

// ============================================================================
// View serialization
// ============================================================================

function toClientCard(card: Card): PlayingCard {
    return {
        rank: card.rank as string,
        suit: card.suit as PlayingCard["suit"],
    };
}

function toClientMeld(meld: Meld): RummyMeldView {
    return {
        id: meld.id,
        kind: meld.kind,
        cards: meld.cards.map(toClientCard),
        ownerId: meld.ownerId,
        round: meld.round,
        layoffs: meld.layoffs ? meld.layoffs.map((l) => ({ ...l })) : undefined,
    };
}

function toClientDiscard(d: { cards: Card[] }): RummyDiscardView {
    return { cards: d.cards.map(toClientCard) };
}

function toClientSettings(s: RummySettings): RummyClientSettings {
    return {
        winTarget: s.winTarget,
        roundLimit: s.roundLimit,
        turnTimeLimit: s.turnTimeLimit,
        goingOutBonus: s.goingOutBonus,
        rummyCallWindowMs: s.rummyCallWindowMs,
        dealSizeMin: s.dealSizeMin,
        dealSizeMax: s.dealSizeMax,
    };
}

function buildTurnTimer(state: InternalRummyState): TurnTimerInfo | undefined {
    const limit = state.settings.turnTimeLimit;
    if (!limit || limit <= 0) return undefined;
    if (!state.turnStartedAt) return undefined;
    if (state.phase !== "playing") return undefined;
    const startedAt = new Date(state.turnStartedAt).getTime();
    return {
        startedAt,
        duration: limit * 1000,
        serverTime: Date.now(),
    };
}

function getState(state: GameState): RummyData {
    const s = state as unknown as InternalRummyState;
    const handCounts: Record<string, number> = Object.fromEntries(
        s.playOrder.map((id) => [id, (s.hands[id] ?? []).length]),
    );
    const view: RummyData = {
        type: "rummy",
        players: s.players,
        leaderId: s.leaderId,
        id: s.id,
        roomId: s.roomId,
        playOrder: s.playOrder,
        dealerIndex: s.dealerIndex,
        currentTurnIndex: s.currentTurnIndex,
        phase: s.phase,
        turnSubstate: s.turnSubstate,
        round: s.round,
        handCounts,
        stockCount: s.stock.length,
        discard: toClientDiscard(s.discard),
        melds: s.melds.map(toClientMeld),
        scores: s.scores,
        lastRoundSummary: s.lastRoundSummary,
        rummyCall: s.rummyCall
            ? {
                  card: toClientCard(s.rummyCall.card),
                  discardedById: s.rummyCall.discardedById,
                  openedAt: s.rummyCall.openedAt,
                  closesAt: s.rummyCall.closesAt,
                  eligibleMeldIds: s.rummyCall.eligibleMeldIds,
              }
            : undefined,
        gameWinnerId: s.gameWinnerId,
        turnTimer: buildTurnTimer(s),
        settings: toClientSettings(s.settings),
    };
    return view;
}

function getPlayerState(state: GameState, playerId: string): RummyPlayerData {
    const s = state as unknown as InternalRummyState;
    const idx = s.playOrder.indexOf(playerId);
    const localOrdering =
        idx === -1
            ? [...s.playOrder]
            : [...s.playOrder.slice(idx), ...s.playOrder.slice(0, idx)];
    return {
        hand: (s.hands[playerId] ?? []).map(toClientCard),
        localOrdering,
        pendingDiscardPick:
            s.pendingDiscardPick && s.pendingDiscardPick.playerId === playerId
                ? {
                      pickedCard: toClientCard(s.pendingDiscardPick.pickedCard),
                      tail: s.pendingDiscardPick.tail.map(toClientCard),
                  }
                : undefined,
    };
}

function checkMinimumPlayers(state: GameState): boolean {
    return checkAllPlayersConnected(state, RUMMY_MIN_PLAYERS);
}

// ============================================================================
// Module export
// ============================================================================

export const rummyModule: GameModule = {
    metadata: RUMMY_METADATA,
    init,
    reducer,
    getState,
    getPlayerState,
    checkMinimumPlayers,
    handlePlayerReconnect,
    handlePlayerDisconnect,
};
