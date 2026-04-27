"use client";

import React, { useCallback, useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
    GameTable,
    EdgeRegion,
    CardHand,
    PlayerAvatar,
    type PlayerAvatarTurnTimer,
} from "@/components/games/shared";
import {
    getSeatAssignments,
    groupSeatsByEdge,
} from "@/components/games/shared/seatLayout";
import { useRummyScene } from "../hooks/useRummyScene";
import WaitingScene from "./scenes/WaitingScene";
import DrawScene from "./scenes/DrawScene";
import MeldScene from "./scenes/MeldScene";
import MeldToolbar from "./MeldToolbar";
import TurnIndicator from "./TurnIndicator";
import HandPeek from "./HandPeek";
import RummyOpponentTile from "./RummyOpponentTile";
import type { RummySceneCommonProps } from "./types";

export interface RummyStageProps extends RummySceneCommonProps {
    /** Viewer is a spectator (read-only everywhere). */
    isSpectator: boolean;
    /** Active turn timer state; only renders when phase==='playing' on the active seat. */
    turnTimer?: PlayerAvatarTurnTimer;
}

/**
 * Top-level orchestrator for Rummy. Uses the shared getSeatAssignments /
 * EdgeRegion seat-layout engine to position opponents clockwise around the
 * table, matching the /debug/seat-layout reference. Scene-specific content
 * (MeldBoard, draw controls, etc.) is rendered in the center grid area.
 *
 * The deal-size prompt and round-summary overlays are rendered by the
 * parent `<Rummy />` component — see
 * `apps/client/src/components/games/rummy/index.tsx`.
 */
export default function RummyStage(props: RummyStageProps) {
    const { gameData, playerData, heroId, isSpectator, controller, turnTimer } =
        props;
    const isMyTurn =
        !isSpectator &&
        !!heroId &&
        gameData.playOrder[gameData.currentTurnIndex] === heroId;

    const scene = useRummyScene({
        phase: gameData.phase,
        turnSubstate: gameData.turnSubstate,
        isMyTurn,
        isSpectator,
    });

    const playOrder = gameData.playOrder;
    const playerCount = playOrder.length;
    const rawHeroIndex = heroId ? playOrder.indexOf(heroId) : -1;
    const heroIndex = rawHeroIndex < 0 ? 0 : rawHeroIndex;

    const seats = getSeatAssignments(playerCount, heroIndex);
    const byEdge = groupSeatsByEdge(seats);

    const isDrawScene = scene === "DRAW";
    const isMeldScene = scene === "MELD";
    const isActiveTurnScene = isDrawScene || isMeldScene;

    // MELD only: full-viewport bento hides opponent seats so the player
    // can focus on melding. During DRAW the normal table (with seats) is
    // kept so opponents are visible and stock/discard feel natural in the
    // center slot.
    const bentoMode = isMeldScene;

    // Hero hand exists whenever the local player has cards.
    const heroHasHand = !isSpectator && playerData.hand.length > 0;

    // During DRAW + take-discard composer, the hand must be interactive so the
    // player can pick cards to form a meld with the picked discard card.
    const drawComposerOpen =
        isDrawScene &&
        controller.meldComposerOpen &&
        controller.discardPickIndex != null;

    const forceMeldComposerOpen =
        gameData.turnSubstate === "awaiting-discard-play";
    const meldComposerOpen =
        isMeldScene && (controller.meldComposerOpen || forceMeldComposerOpen);
    const canDiscard = controller.selectedHandIndices.length === 1;

    const handIsInteractive =
        !controller.isSubmitting && (isMeldScene || drawComposerOpen);
    const handSelectedIndex =
        isMeldScene && !meldComposerOpen && canDiscard
            ? controller.selectedHandIndices[0]
            : null;
    const handSelectedIndices =
        handIsInteractive && controller.selectedHandIndices.length > 0
            ? controller.selectedHandIndices
            : undefined;

    // ---- Display-order layer (client-only sort) ---------------------------
    // The controller exposes `displayOrder: displayIndex -> serverHandIndex`.
    // We render `orderedCards` for `CardHand`, then translate every index
    // back to server-space when bubbling clicks / selections.
    const displayOrder = controller.displayOrder;
    const orderedCards = useMemo(
        () => displayOrder.map((i) => playerData.hand[i]).filter(Boolean),
        [displayOrder, playerData.hand],
    );

    const serverToDisplay = useMemo(() => {
        const map = new Map<number, number>();
        displayOrder.forEach((serverIdx, dispIdx) =>
            map.set(serverIdx, dispIdx),
        );
        return map;
    }, [displayOrder]);

    const orderedSelectedIndex =
        handSelectedIndex != null
            ? (serverToDisplay.get(handSelectedIndex) ?? null)
            : null;
    const orderedSelectedIndices = handSelectedIndices
        ? handSelectedIndices
              .map((i) => serverToDisplay.get(i))
              .filter((i): i is number => i != null)
        : undefined;

    const handAnnotations = controller.handAnnotations;
    const orderedAnnotations = useMemo(() => {
        const out: Record<number, (typeof handAnnotations)[number]> = {};
        displayOrder.forEach((serverIdx, dispIdx) => {
            const ann = handAnnotations[serverIdx];
            if (ann) out[dispIdx] = ann;
        });
        return out;
    }, [displayOrder, handAnnotations]);

    const handleHeroCardClick = useCallback(
        (dispIdx: number) => {
            const serverIdx = displayOrder[dispIdx];
            if (serverIdx == null) return;
            controller.onSelectHandCard(serverIdx);
        },
        [displayOrder, controller],
    );

    const showPersistentBottomHost = heroHasHand && isActiveTurnScene;
    const showWaitingBottomEdge = !bentoMode && !isActiveTurnScene;
    const centerBottomPaddingClass = showPersistentBottomHost
        ? drawComposerOpen || meldComposerOpen
            ? "pb-64 md:pb-72"
            : "pb-40 md:pb-44"
        : "";

    return (
        <div className="relative w-full h-full">
            <GameTable
                playerCount={playerCount}
                feltGradient="from-emerald-950 via-emerald-900 to-stone-900"
                bentoMode={bentoMode}
            >
                {/* ── Opponent edge regions — hidden in bento mode ── */}
                {!bentoMode &&
                    (["top", "left", "right"] as const).map((edge) => {
                        const slots = byEdge[edge];
                        if (slots.length === 0) return null;

                        const isMultiSlot = slots.length > 1;
                        const stackDir =
                            edge === "top" ? "flex-row" : "flex-col";
                        const containerCls = [
                            "flex items-center",
                            stackDir,
                            isMultiSlot
                                ? "justify-around"
                                : "justify-center gap-2",
                            isMultiSlot && edge === "top" && "w-full",
                            isMultiSlot &&
                                (edge === "left" || edge === "right") &&
                                "self-stretch",
                        ]
                            .filter(Boolean)
                            .join(" ");

                        return (
                            <EdgeRegion
                                key={edge}
                                position={edge}
                                isHero={false}
                            >
                                <div className={containerCls}>
                                    {slots.map((slot) => {
                                        const playerIdx = seats.indexOf(slot);
                                        const pid = playOrder[playerIdx];
                                        return (
                                            <RummyOpponentTile
                                                key={pid}
                                                playerId={pid}
                                                gameData={gameData}
                                                seatPosition={edge}
                                                turnTimer={turnTimer}
                                            />
                                        );
                                    })}
                                </div>
                            </EdgeRegion>
                        );
                    })}

                {/* ── Hero bottom region — only in non-bento (WAITING/spectator) ── */}
                {showWaitingBottomEdge && (
                    <EdgeRegion position="bottom" isHero>
                        <AnimatePresence mode="wait" initial={false}>
                            {heroHasHand ? (
                                <motion.div
                                    key="hand-waiting"
                                    className="w-full flex flex-col items-center gap-2 px-2"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <CardHand
                                        cards={orderedCards}
                                        isLocalPlayer
                                        interactive={false}
                                        playerId={heroId}
                                        expansionMode="hover-zoom"
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="hand-peek"
                                    className="w-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <HandPeek
                                        hand={orderedCards}
                                        spectator={
                                            isSpectator ||
                                            playerData.hand.length === 0
                                        }
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </EdgeRegion>
                )}

                {/* ── Center: scene-specific content ── */}
                <LayoutGroup id="rummy-stage">
                    <div
                        className={`relative z-10 flex flex-col min-h-0 w-full h-full ${centerBottomPaddingClass}`}
                        style={{ gridArea: "center" }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {scene === "DRAW" && (
                                <DrawScene key="draw" {...props} />
                            )}
                            {scene === "MELD" && (
                                <MeldScene key="meld" {...props} />
                            )}
                            {(scene === "WAITING" ||
                                scene === "DEAL_PROMPT" ||
                                scene === "ROUND_SUMMARY") && (
                                <WaitingScene key="waiting" {...props} />
                            )}
                        </AnimatePresence>
                    </div>
                </LayoutGroup>

                {/* Persistent bottom host for active-turn scenes.
                    Keeping this mounted in one place prevents hand remount
                    flicker between DRAW and MELD transitions. */}
                {showPersistentBottomHost && (
                    <div className="absolute left-0 right-0 bottom-0 z-25 px-2 pb-2 pointer-events-none">
                        <div className="pointer-events-auto w-full flex flex-col items-center gap-2 px-2 pt-2 pb-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
                            {/* Hero avatar with active turn timer ring */}
                            <div className="self-start flex items-center gap-2">
                                <PlayerAvatar
                                    playerId={heroId}
                                    playerName={
                                        gameData.players[heroId]?.name ?? "You"
                                    }
                                    size={36}
                                    isCurrentTurn={isMyTurn}
                                    isLocalPlayer
                                    connected={
                                        gameData.players[heroId]?.isConnected ??
                                        true
                                    }
                                    turnTimer={isMyTurn ? turnTimer : undefined}
                                />
                                <span className="text-xs font-medium text-amber-200">
                                    {gameData.players[heroId]?.name ?? "You"}
                                    <span className="text-amber-300/70 ml-1">
                                        (You)
                                    </span>
                                </span>
                            </div>

                            {isMeldScene && (
                                <MeldToolbar
                                    turnSubstate={gameData.turnSubstate}
                                    isMeldComposerOpen={meldComposerOpen}
                                    canDiscard={canDiscard}
                                    disabled={controller.isSubmitting}
                                    onOpenMeldComposer={
                                        controller.onOpenMeldComposer
                                    }
                                    onCancelMeldComposer={
                                        controller.onCancelMeldComposer
                                    }
                                    onDiscard={controller.onDiscard}
                                    sortMode={controller.sortMode}
                                    onSetSortMode={controller.onSetSortMode}
                                    deadwoodPoints={
                                        controller.hintSettings.deadwood
                                            ? controller.hints.deadwoodPoints
                                            : undefined
                                    }
                                    meldPulse={
                                        controller.hintSettings
                                            .meldButtonPulse &&
                                        !meldComposerOpen &&
                                        controller.hints.meldGroups.length > 0
                                    }
                                />
                            )}

                            <CardHand
                                cards={orderedCards}
                                isLocalPlayer
                                interactive={handIsInteractive}
                                selectedIndex={orderedSelectedIndex}
                                selectedIndices={orderedSelectedIndices}
                                cardAnnotations={orderedAnnotations}
                                onCardClick={
                                    handIsInteractive
                                        ? handleHeroCardClick
                                        : undefined
                                }
                                playerId={heroId}
                                expansionMode="hover-zoom"
                            />
                        </div>
                    </div>
                )}
            </GameTable>

            {/* Turn indicator — whose turn + countdown (always visible). */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <TurnIndicator
                    gameData={gameData}
                    heroId={heroId}
                    isMyTurn={isMyTurn}
                />
            </div>

            {/* Subtle emerald glow around the viewport when it IS your turn. */}
            {isMyTurn && (
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-20 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        boxShadow:
                            "inset 0 0 0 2px rgba(16,185,129,0.45), inset 0 0 40px rgba(16,185,129,0.25)",
                    }}
                />
            )}
        </div>
    );
}
