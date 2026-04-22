"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useWebSocketError } from "@/hooks";
import {
    RummyData,
    RummyPlayerData,
    Suit,
    Rank,
    PlayingCard,
} from "@shared/types";
import { findAllLayoffTargets } from "@shared/validation/rummy";
import { GameMenu, RotateDeviceOverlay } from "@/components/games/shared";
import { Button } from "@/components/ui/button";
import RummyGameTable from "./ui/RummyGameTable";
import HandToolbar from "./ui/HandToolbar";
import MeldComposer from "./ui/MeldComposer";
import RummyCallToast from "./ui/RummyCallToast";
import DealSizePrompt from "./ui/DealSizePrompt";
import RoundRevealOverlay from "./ui/RoundRevealOverlay";

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
    playerData: RummyPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    isSpectator?: boolean;
    roomCode?: string;
}

export default function Rummy({
    gameData,
    playerData,
    dispatchOptimisticAction,
    isSpectator,
    roomCode,
}: RummyProps) {
    const { socket, connected } = useWebSocket();
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

    // ---- Derived flags ---------------------------------------------------------
    const heroId = playerData.localOrdering[0];
    const isMyTurn =
        gameData.playOrder[gameData.currentTurnIndex] === heroId &&
        !isSpectator;
    const dealerId = gameData.playOrder[gameData.dealerIndex];
    const isDealer = dealerId === heroId;

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
            setActiveMeldId((prev) => (prev === meldId ? null : meldId));
        },
        [
            isMyTurn,
            gameData.turnSubstate,
            selectedHandIndices,
            playerData.hand,
            sendAction,
            heroId,
            discardPickIndex,
            resetSelection,
        ],
    );

    const handleConfirmMeld = useCallback(
        (cards: PlayingCard[], _kind: "set" | "run") => {
            setIsSubmitting(true);
            sendAction("LAY_MELD", {
                playerId: heroId,
                cards: cards.map(toServerCard),
            });
            setIsSubmitting(false);
            resetSelection();
        },
        [sendAction, heroId, resetSelection],
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

    // ---- Render ---------------------------------------------------------------
    return (
        <>
            <RotateDeviceOverlay />
            <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900">
                <div className="absolute top-2 left-2 z-30">
                    <GameMenu roomCode={roomCode ?? ""} />
                </div>

                <div className="flex-1 min-h-0 relative">
                    <RummyGameTable
                        gameData={gameData}
                        playerData={playerData}
                        isMyTurn={isMyTurn}
                        selectedHandIndices={selectedHandIndices}
                        onSelectHandCard={handleSelectHandCard}
                        onClickDiscardCard={handleClickDiscardCard}
                        onSelectMeld={handleSelectMeld}
                        activeMeldId={activeMeldId}
                        discardPickIndex={discardPickIndex}
                        onDrawStock={handleDrawStock}
                        disabledHand={isSubmitting}
                    />
                </div>

                {/* Meld composer (shown above toolbar when active). */}
                {isMyTurn &&
                    gameData.turnSubstate === "may-meld" &&
                    meldComposerOpen && (
                        <div className="px-3 pb-1">
                            <MeldComposer
                                hand={playerData.hand}
                                selectedIndices={selectedHandIndices}
                                onToggleSelect={handleSelectHandCard}
                                onClear={() => setSelectedHandIndices([])}
                                onConfirm={handleConfirmMeld}
                                onCancel={() => {
                                    setMeldComposerOpen(false);
                                    setSelectedHandIndices([]);
                                }}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                {/* Toolbar — substate-driven actions. */}
                <div className="px-3 pb-3 flex items-center justify-center gap-2">
                    <HandToolbar
                        turnSubstate={gameData.turnSubstate}
                        isMyTurn={isMyTurn}
                        stagedDiscardPickIndex={discardPickIndex}
                        isMeldComposerOpen={meldComposerOpen}
                        disabled={isSubmitting}
                        onDrawStock={handleDrawStock}
                        onTakeDiscard={() => {
                            // Without a target meld we can't commit TAKE_DISCARD.
                            // Surface a hint so the user knows to tap a meld.
                            toast.info(
                                "Tap a meld to lay the picked card off, or pick a card you can immediately use in a new set/run.",
                            );
                        }}
                        onOpenMeldComposer={() => {
                            setMeldComposerOpen(true);
                            setSelectedHandIndices([]);
                        }}
                        onCancelMeldComposer={() => {
                            setMeldComposerOpen(false);
                            setSelectedHandIndices([]);
                        }}
                    />
                    {isMyTurn &&
                        gameData.turnSubstate === "may-meld" &&
                        !meldComposerOpen &&
                        selectedHandIndices.length === 1 && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDiscard}
                                disabled={isSubmitting}
                            >
                                Discard selected
                            </Button>
                        )}
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
                    onContinue={() => {
                        sendAction("CONTINUE_AFTER_ROUND_SUMMARY", {
                            playerId: heroId,
                        });
                    }}
                />
            </div>
        </>
    );
}
