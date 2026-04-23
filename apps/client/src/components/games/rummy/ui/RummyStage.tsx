"use client";

import React from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { GameTable, EdgeRegion, CardHand } from "@/components/games/shared";
import {
    getSeatAssignments,
    groupSeatsByEdge,
} from "@/components/games/shared/seatLayout";
import { useRummyScene } from "../hooks/useRummyScene";
import WaitingScene from "./scenes/WaitingScene";
import DrawScene from "./scenes/DrawScene";
import MeldScene from "./scenes/MeldScene";
import TurnIndicator from "./TurnIndicator";
import HandPeek from "./HandPeek";
import RummyOpponentTile from "./RummyOpponentTile";
import type { RummySceneCommonProps } from "./types";

export interface RummyStageProps extends RummySceneCommonProps {
    /** Viewer is a spectator (read-only everywhere). */
    isSpectator: boolean;
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
    const { gameData, playerData, heroId, isSpectator, controller } = props;
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

    // MELD only: full-viewport bento hides opponent seats so the player
    // can focus on melding. During DRAW the normal table (with seats) is
    // kept so opponents are visible and stock/discard feel natural in the
    // center slot.
    const bentoMode = scene === "MELD";

    // Show hero hand in the bottom edge for DRAW + WAITING; hidden in MELD
    // (hand lives inside MeldScene rows).
    const heroHasHand = !isSpectator && playerData.hand.length > 0;

    // During DRAW + take-discard composer, the hand must be interactive so
    // the player can pick cards to form a meld with the picked discard card.
    const drawComposerOpen =
        scene === "DRAW" &&
        controller.meldComposerOpen &&
        controller.discardPickIndex != null;
    const handIsInteractive = !controller.isSubmitting && drawComposerOpen;

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
                                            />
                                        );
                                    })}
                                </div>
                            </EdgeRegion>
                        );
                    })}

                {/* ── Hero bottom region — only in non-bento (WAITING/spectator) ── */}
                {!bentoMode && (
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
                                        cards={playerData.hand}
                                        isLocalPlayer
                                        interactive={handIsInteractive}
                                        selectedIndices={
                                            handIsInteractive
                                                ? controller.selectedHandIndices
                                                : undefined
                                        }
                                        onCardClick={
                                            handIsInteractive
                                                ? (idx) =>
                                                      controller.onSelectHandCard(
                                                          idx,
                                                      )
                                                : undefined
                                        }
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
                                        hand={playerData.hand}
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
                        className="relative z-10 flex flex-col min-h-0 w-full h-full"
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
