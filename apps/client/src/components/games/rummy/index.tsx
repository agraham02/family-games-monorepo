"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useTurnTimer, useWebSocketError } from "@/hooks";
import { playTimerStartSound, initializeAudioOnInteraction } from "@/lib/audio";
import {
    RummyData,
    RummyPlayerData,
    Suit,
    Rank,
    PlayingCard,
} from "@shared/types";
import { findAllLayoffTargets } from "@shared/validation/rummy";
import { computeRummyHints, sortHandRummy } from "@shared/hints/rummy";
import { GameMenu, GameSettingToggle } from "@/components/games/shared";
import {
    Lightbulb,
    Layers,
    PlusSquare,
    Sparkles,
    Calculator,
    ArrowDownToLine,
    Zap,
} from "lucide-react";
import RummyStage from "./ui/RummyStage";
import RummyCallToast from "./ui/RummyCallToast";
import DealSizePrompt from "./ui/DealSizePrompt";
import RoundRevealOverlay from "./ui/RoundRevealOverlay";
import GameSummaryModal from "./ui/GameSummaryModal";
import type { RummyController } from "./ui/types";
import { useRummyHintSettings } from "./hints/useRummyHintSettings";
import { useSortMode } from "./hints/useSortMode";
import { buildHandAnnotations } from "./hints/annotations";

const SUIT_TO_ENUM: Record<string, Suit> = {
    Hearts: Suit.Hearts,
    Diamonds: Suit.Diamonds,
    Clubs: Suit.Clubs,
    Spades: Suit.Spades,
};

const RANK_TO_ENUM: Record<string, Rank> = {
    A: Rank.Ace,
    "2": Rank.Two,
    "3": Rank.Three,
    "4": Rank.Four,
    "5": Rank.Five,
    "6": Rank.Six,
    "7": Rank.Seven,
    "8": Rank.Eight,
    "9": Rank.Nine,
    "10": Rank.Ten,
    J: Rank.Jack,
    Q: Rank.Queen,
    K: Rank.King,
    LJ: Rank.LittleJoker,
    BJ: Rank.BigJoker,
};

function toServerCard(c: PlayingCard) {
    return { suit: SUIT_TO_ENUM[c.suit], rank: RANK_TO_ENUM[c.rank] };
}

interface RummyProps {
    gameData: RummyData;
    /** Null when the viewer is a spectator. */
    playerData: RummyPlayerData | null;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    isSpectator?: boolean;
    roomCode?: string;
}

/** Empty-hand spectator stand-in so downstream code can read .hand/.localOrdering safely. */
const SPECTATOR_PLAYER_DATA: RummyPlayerData = {
    hand: [],
    localOrdering: [],
};

export default function Rummy({
    gameData,
    playerData: rawPlayerData,
    dispatchOptimisticAction,
    isSpectator,
    roomCode,
}: RummyProps) {
    const playerData = rawPlayerData ?? SPECTATOR_PLAYER_DATA;
    const { socket, connected, clockOffset } = useWebSocket();
    const { roomId, userId } = useSession();
    useWebSocketError();

    // ---- Action dispatch ------------------------------------------------------
    const sendAction = useCallback(
        (type: string, payload: unknown) => {
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction(type, payload);
                return;
            }
            if (!socket || !connected) return;
            socket.emit("game_action", {
                roomId,
                action: { type, payload, userId },
            });
        },
        [dispatchOptimisticAction, socket, connected, roomId, userId],
    );

    const handleReturnToLobby = useCallback(() => {
        if (!socket || !connected) return;
        socket.emit("abort_game", { roomId, userId });
    }, [socket, connected, roomId, userId]);

    // ---- Local UI state --------------------------------------------------------
    const [selectedHandIndices, setSelectedHandIndices] = useState<number[]>(
        [],
    );
    const [meldComposerOpen, setMeldComposerOpen] = useState(false);
    const [activeMeldId, setActiveMeldId] = useState<string | null>(null);
    const [discardPickIndex, setDiscardPickIndex] = useState<number | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ---- Hint + sort settings (client-only, persisted to localStorage) ---------
    const hintSettings = useRummyHintSettings();
    const [sortMode, setSortMode] = useSortMode();

    // ---- Hints + display order (memoized off the hand snapshot) ----------------
    const hints = useMemo(() => {
        const handCards = playerData.hand.map(toServerCard);
        const meldsCards = gameData.melds.map((m) => ({
            id: m.id,
            kind: m.kind,
            ownerId: m.ownerId,
            round: m.round,
            cards: m.cards.map(toServerCard),
        }));
        const top = gameData.discard.cards.length
            ? toServerCard(
                  gameData.discard.cards[gameData.discard.cards.length - 1],
              )
            : null;
        return computeRummyHints({
            hand: handCards,
            melds: meldsCards,
            discardTop: top,
        });
    }, [playerData.hand, gameData.melds, gameData.discard.cards]);

    const displayOrder = useMemo<readonly number[]>(() => {
        const handCards = playerData.hand.map(toServerCard);
        return sortHandRummy({ hand: handCards, mode: sortMode, hints });
    }, [playerData.hand, sortMode, hints]);

    const handAnnotations = useMemo(
        () => buildHandAnnotations(hints, hintSettings),
        [hints, hintSettings],
    );

    // ---- Derived flags ---------------------------------------------------------
    // For spectators (no playerData), heroId is empty -> isMyTurn naturally false.
    const heroId = playerData.localOrdering[0] ?? "";
    const isMyTurn =
        !!heroId &&
        gameData.playOrder[gameData.currentTurnIndex] === heroId &&
        !isSpectator;
    const dealerId = gameData.playOrder[gameData.dealerIndex];
    const isDealer = dealerId === heroId;

    // ── Turn timer wiring (mirrors Spades) ──────────────────────────────────
    useEffect(() => {
        initializeAudioOnInteraction();
    }, []);

    const turnTimeLimit = gameData.settings?.turnTimeLimit ?? 0;

    const isMyTurnRef = useRef(isMyTurn);
    useEffect(() => {
        isMyTurnRef.current = isMyTurn;
    }, [isMyTurn]);

    const handleTimerStart = useCallback(() => {
        if (isMyTurnRef.current) {
            playTimerStartSound();
        }
    }, []);

    const { isActive: timerIsActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
        handleTimerStart,
    );

    const turnTimerProps = useMemo(() => {
        if (
            turnTimeLimit <= 0 ||
            gameData.phase !== "playing" ||
            !timerIsActive ||
            !gameData.turnTimer?.startedAt
        ) {
            return undefined;
        }
        return {
            totalMs: turnTimeLimit * 1000,
            startedAt: gameData.turnTimer.startedAt,
            clockOffset,
        };
    }, [
        turnTimeLimit,
        gameData.phase,
        timerIsActive,
        gameData.turnTimer?.startedAt,
        clockOffset,
    ]);

    const rummyCallActive = Boolean(
        gameData.rummyCall &&
        gameData.rummyCall.discardedById !== heroId &&
        !isSpectator,
    );

    const canCallRummy = useMemo(() => {
        if (!gameData.rummyCall) return false;
        const card = toServerCard(gameData.rummyCall.card);
        const serverMelds = gameData.melds.map((m) => ({
            id: m.id,
            kind: m.kind,
            ownerId: m.ownerId,
            round: m.round,
            cards: m.cards.map(toServerCard),
        }));
        return findAllLayoffTargets(card, serverMelds).length > 0;
    }, [gameData.rummyCall, gameData.melds]);

    /**
     * When the hero has exactly one hand card selected and is in `may-meld`,
     * compute the meld ids that card can lay off onto. Drives the pulsing
     * "tap to lay off" affordance on MeldBoard so non-tech-savvy players can
     * see the move is available.
     */
    const eligibleLayoffMeldIds = useMemo<readonly string[]>(() => {
        if (
            isSpectator ||
            !isMyTurn ||
            gameData.turnSubstate !== "may-meld" ||
            meldComposerOpen ||
            selectedHandIndices.length !== 1
        ) {
            return [];
        }
        const card = playerData.hand[selectedHandIndices[0]];
        if (!card) return [];
        const serverCard = toServerCard(card);
        const serverMelds = gameData.melds.map((m) => ({
            id: m.id,
            kind: m.kind,
            ownerId: m.ownerId,
            round: m.round,
            cards: m.cards.map(toServerCard),
        }));
        return findAllLayoffTargets(serverCard, serverMelds);
    }, [
        isSpectator,
        isMyTurn,
        gameData.turnSubstate,
        gameData.melds,
        meldComposerOpen,
        selectedHandIndices,
        playerData.hand,
    ]);

    // ---- Handlers --------------------------------------------------------------
    const resetSelection = useCallback(() => {
        setSelectedHandIndices([]);
        setActiveMeldId(null);
        setDiscardPickIndex(null);
        setMeldComposerOpen(false);
    }, []);

    const handleSelectHandCard = useCallback(
        (idx: number) => {
            if (meldComposerOpen) {
                setSelectedHandIndices((prev) =>
                    prev.includes(idx)
                        ? prev.filter((i) => i !== idx)
                        : [...prev, idx],
                );
                return;
            }
            // Single-select for lay-off / discard intent
            setSelectedHandIndices((prev) => (prev[0] === idx ? [] : [idx]));
        },
        [meldComposerOpen],
    );

    const handleDrawStock = useCallback(() => {
        if (!isMyTurn || gameData.turnSubstate !== "awaiting-draw") return;
        setIsSubmitting(true);
        sendAction("DRAW_STOCK", { playerId: heroId });
        setIsSubmitting(false);
    }, [isMyTurn, gameData.turnSubstate, sendAction, heroId]);

    const handleClickDiscardCard = useCallback(
        (pickIndex: number) => {
            if (!isMyTurn || gameData.turnSubstate !== "awaiting-draw") return;
            // Stage the pick — actual TAKE_DISCARD requires intoMeldId or newMeld
            // (atomic). We just toggle the staged pick here; the UI surfaces
            // available targets next.
            setDiscardPickIndex((prev) =>
                prev === pickIndex ? null : pickIndex,
            );
        },
        [isMyTurn, gameData.turnSubstate],
    );

    const handleSelectMeld = useCallback(
        (meldId: string) => {
            // If a hand card is selected → lay-off intent.
            if (
                isMyTurn &&
                gameData.turnSubstate === "may-meld" &&
                selectedHandIndices.length === 1
            ) {
                const card = playerData.hand[selectedHandIndices[0]];
                if (card) {
                    setIsSubmitting(true);
                    sendAction("LAY_OFF", {
                        playerId: heroId,
                        meldId,
                        card: toServerCard(card),
                    });
                    setIsSubmitting(false);
                    setSelectedHandIndices([]);
                    return;
                }
            }
            // If a discard pick is staged → commit TAKE_DISCARD via lay-off.
            if (
                isMyTurn &&
                gameData.turnSubstate === "awaiting-draw" &&
                discardPickIndex != null
            ) {
                setIsSubmitting(true);
                sendAction("TAKE_DISCARD", {
                    playerId: heroId,
                    pickIndex: discardPickIndex,
                    intoMeldId: meldId,
                });
                setIsSubmitting(false);
                resetSelection();
                return;
            }
            // In awaiting-discard-play, allow laying the picked card off onto
            // an existing meld. Server already has pendingDiscardPick; it
            // resolves the play atomically when intoMeldId is provided.
            if (
                isMyTurn &&
                gameData.turnSubstate === "awaiting-discard-play" &&
                playerData.pendingDiscardPick
            ) {
                setIsSubmitting(true);
                sendAction("TAKE_DISCARD", {
                    playerId: heroId,
                    pickIndex: 0,
                    intoMeldId: meldId,
                });
                setIsSubmitting(false);
                resetSelection();
                return;
            }
            setActiveMeldId((prev) => (prev === meldId ? null : meldId));
        },
        [
            isMyTurn,
            gameData.turnSubstate,
            selectedHandIndices,
            playerData.hand,
            playerData.pendingDiscardPick,
            sendAction,
            heroId,
            discardPickIndex,
            resetSelection,
        ],
    );

    const handleConfirmMeld = useCallback(
        (cards: PlayingCard[], _kind: "set" | "run") => {
            setIsSubmitting(true);
            // If a discard pick is staged (DRAW scene), commit TAKE_DISCARD
            // with a freshly-formed meld containing the picked card.
            if (
                gameData.turnSubstate === "awaiting-draw" &&
                discardPickIndex != null
            ) {
                sendAction("TAKE_DISCARD", {
                    playerId: heroId,
                    pickIndex: discardPickIndex,
                    newMeld: cards.map(toServerCard),
                });
            } else {
                sendAction("LAY_MELD", {
                    playerId: heroId,
                    cards: cards.map(toServerCard),
                });
            }
            setIsSubmitting(false);
            resetSelection();
        },
        [
            sendAction,
            heroId,
            resetSelection,
            gameData.turnSubstate,
            discardPickIndex,
        ],
    );

    const handleDiscard = useCallback(() => {
        if (selectedHandIndices.length !== 1) {
            toast.error("Select a card to discard");
            return;
        }
        const card = playerData.hand[selectedHandIndices[0]];
        if (!card) return;
        setIsSubmitting(true);
        sendAction("DISCARD", {
            playerId: heroId,
            card: toServerCard(card),
        });
        setIsSubmitting(false);
        resetSelection();
    }, [
        selectedHandIndices,
        playerData.hand,
        sendAction,
        heroId,
        resetSelection,
    ]);

    const handleCallRummy = useCallback(() => {
        if (!gameData.rummyCall) return;
        const meldId = gameData.rummyCall.eligibleMeldIds[0];
        if (!meldId) return;
        sendAction("CALL_RUMMY", { playerId: heroId, meldId });
    }, [gameData.rummyCall, sendAction, heroId]);

    const handleConfirmDealSize = useCallback(
        (handSize: number) => {
            sendAction("CHOOSE_DEAL_SIZE", { playerId: heroId, handSize });
        },
        [sendAction, heroId],
    );

    // ---- Controller bundle for stage -----------------------------------------
    const controller: RummyController = useMemo(
        () => ({
            selectedHandIndices,
            activeMeldId,
            eligibleLayoffMeldIds,
            discardPickIndex,
            meldComposerOpen,
            isSubmitting,
            displayOrder,
            sortMode,
            onSetSortMode: setSortMode,
            hintSettings,
            hints,
            handAnnotations,
            onSelectHandCard: handleSelectHandCard,
            onClearSelection: () => setSelectedHandIndices([]),
            onDrawStock: handleDrawStock,
            onClickDiscardCard: handleClickDiscardCard,
            onSelectMeld: handleSelectMeld,
            onOpenMeldComposer: () => {
                setMeldComposerOpen(true);
                setSelectedHandIndices([]);
            },
            onCancelMeldComposer: () => {
                setMeldComposerOpen(false);
                setSelectedHandIndices([]);
            },
            onConfirmMeld: handleConfirmMeld,
            onDiscard: handleDiscard,
        }),
        [
            selectedHandIndices,
            activeMeldId,
            eligibleLayoffMeldIds,
            discardPickIndex,
            meldComposerOpen,
            isSubmitting,
            displayOrder,
            sortMode,
            setSortMode,
            hintSettings,
            hints,
            handAnnotations,
            handleSelectHandCard,
            handleDrawStock,
            handleClickDiscardCard,
            handleSelectMeld,
            handleConfirmMeld,
            handleDiscard,
        ],
    );

    // ---- Render ---------------------------------------------------------------
    return (
        <div className="relative w-full h-full flex flex-col bg-linear-to-br from-emerald-950 via-emerald-900 to-stone-900">
            <div className="absolute top-2 left-2 z-40">
                <GameMenu roomCode={roomCode ?? ""}>
                    {/* Master hint toggle. Disabling hides every visual hint
                        (rings, badges, deadwood, discard glow, meld pulse). */}
                    <GameSettingToggle
                        storageKey="rummy.showHints"
                        label="Show Hints"
                        icon={<Lightbulb className="h-4 w-4" />}
                        defaultValue={false}
                    />

                    {hintSettings.master && (
                        <div className="ml-2 pl-2 border-l border-border/60 flex flex-col gap-0.5">
                            <GameSettingToggle
                                storageKey="rummy.hints.meldGroups"
                                label="Highlight meld groups"
                                icon={<Layers className="h-3.5 w-3.5" />}
                                defaultValue={true}
                            />
                            <GameSettingToggle
                                storageKey="rummy.hints.layoffs"
                                label="Highlight layoffs"
                                icon={<PlusSquare className="h-3.5 w-3.5" />}
                                defaultValue={true}
                            />
                            <GameSettingToggle
                                storageKey="rummy.hints.nearMelds"
                                label="Show near-melds"
                                icon={<Sparkles className="h-3.5 w-3.5" />}
                                defaultValue={false}
                            />
                            <GameSettingToggle
                                storageKey="rummy.hints.deadwood"
                                label="Show deadwood"
                                icon={<Calculator className="h-3.5 w-3.5" />}
                                defaultValue={true}
                            />
                            <GameSettingToggle
                                storageKey="rummy.hints.discardTop"
                                label="Glow useful discard"
                                icon={
                                    <ArrowDownToLine className="h-3.5 w-3.5" />
                                }
                                defaultValue={true}
                            />
                            <GameSettingToggle
                                storageKey="rummy.hints.meldButtonPulse"
                                label="Pulse meld button"
                                icon={<Zap className="h-3.5 w-3.5" />}
                                defaultValue={true}
                            />
                        </div>
                    )}
                </GameMenu>
            </div>

            <div className="flex-1 min-h-0 relative">
                <RummyStage
                    gameData={gameData}
                    playerData={playerData}
                    heroId={heroId}
                    isSpectator={!!isSpectator}
                    controller={controller}
                    turnTimer={turnTimerProps}
                />
            </div>

            {/* Rummy-window toast (non-blocking). */}
            <RummyCallToast
                isOpen={rummyCallActive}
                card={gameData.rummyCall?.card ?? null}
                closesAt={gameData.rummyCall?.closesAt ?? null}
                canCall={canCallRummy}
                onCall={handleCallRummy}
            />

            {/* Deal-size prompt (round start). */}
            <DealSizePrompt
                isOpen={gameData.phase === "deal-size-prompt"}
                isDealer={isDealer}
                dealerName={gameData.players[dealerId]?.name ?? "Dealer"}
                minSize={gameData.settings.dealSizeMin}
                maxSize={gameData.settings.dealSizeMax}
                onConfirm={handleConfirmDealSize}
            />

            {/* Round reveal overlay. */}
            <RoundRevealOverlay
                isOpen={
                    gameData.phase === "round-summary" &&
                    Boolean(gameData.lastRoundSummary)
                }
                summary={gameData.lastRoundSummary ?? null}
                melds={gameData.melds}
                players={gameData.players}
                totals={gameData.scores}
                isLeader={userId === gameData.leaderId}
                onContinue={() => {
                    sendAction("NEXT_ROUND", { playerId: heroId });
                }}
            />

            {/* Game summary modal (shows when phase === "finished"). */}
            <GameSummaryModal
                gameData={gameData}
                onReturnToLobby={handleReturnToLobby}
            />
        </div>
    );
}
