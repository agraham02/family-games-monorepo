"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameTable } from "@/components/games/shared";
import { MeldBoard } from "@/components/games/shared/MeldBoard";
import DiscardPile from "../DiscardPile";
import MeldComposer from "../MeldComposer";
import type { RummySceneCommonProps } from "../types";

/**
 * MELD scene — full-viewport bento layout (3 rows):
 *
 *  Row 1  Discard pile fan — read-only, shows where your discard will land
 *  Row 2  MeldBoard — tap melds to lay off; MeldComposer slides in here
 *  Bottom controls (toolbar + hand) are hosted persistently in `RummyStage`
 *  to avoid remount flicker between DRAW and MELD transitions.
 */
export default function MeldScene({
    gameData,
    playerData,
    heroId,
    controller,
}: RummySceneCommonProps) {
    const { layoutMode } = useGameTable();

    const players = useMemo(
        () =>
            gameData.playOrder.map((id) => ({
                id,
                name: gameData.players[id]?.name ?? "Unknown",
            })),
        [gameData.playOrder, gameData.players],
    );

    const forceComposerOpen = gameData.turnSubstate === "awaiting-discard-play";
    const composerOpen = controller.meldComposerOpen || forceComposerOpen;
    const seedCard = forceComposerOpen
        ? (playerData.pendingDiscardPick?.pickedCard ?? null)
        : null;

    return (
        <motion.div
            className="flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Row 1: Discard fan strip. When the pile is empty we render
                a slim text chip instead of the bulky DiscardPile placeholder
                so the meld board below gets the vertical space. ── */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-black/20 overflow-x-auto">
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-white/40">
                    Discard · {gameData.discard.cards.length}
                </span>
                {gameData.discard.cards.length === 0 ? (
                    <span className="shrink-0 text-[10px] italic text-white/30">
                        empty
                    </span>
                ) : (
                    <DiscardPile
                        discard={gameData.discard}
                        layoutMode={layoutMode}
                        interactive={false}
                        topGlow={
                            controller.hintSettings.discardTop &&
                            (controller.hints.discardTop.canLayoff ||
                                controller.hints.discardTop.canFormMeldWithHand)
                        }
                    />
                )}
            </div>

            {/* ── Row 2: MeldBoard (flex-1, scrollable) ── */}
            <div className="flex-1 min-h-0 relative overflow-hidden px-2 md:px-4 py-2">
                <MeldBoard
                    melds={gameData.melds}
                    players={players}
                    heroPlayerId={heroId}
                    mode={layoutMode}
                    compactLayout="horizontal"
                    activeMeldId={controller.activeMeldId}
                    eligibleMeldIds={controller.eligibleLayoffMeldIds}
                    onSelectMeld={controller.onSelectMeld}
                />
                <AnimatePresence>
                    {!composerOpen &&
                        controller.eligibleLayoffMeldIds.length > 0 && (
                            <motion.div
                                key="layoff-hint"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.18 }}
                                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-emerald-600/90 text-white text-xs font-medium shadow-lg ring-1 ring-emerald-300/40 backdrop-blur-sm pointer-events-none"
                            >
                                Tap a glowing meld to lay off this card
                            </motion.div>
                        )}
                </AnimatePresence>
            </div>

            {/* MeldComposer slides in below the board; bottom hand/toolbar are
                rendered by the persistent stage-level host. */}
            <AnimatePresence initial={false}>
                {composerOpen && (
                    <motion.div
                        key="meld-composer"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 30, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 28,
                        }}
                        className="shrink-0 px-3 pb-1"
                    >
                        <MeldComposer
                            hand={playerData.hand}
                            selectedIndices={controller.selectedHandIndices}
                            onToggleSelect={controller.onSelectHandCard}
                            onClear={controller.onClearSelection}
                            onConfirm={controller.onConfirmMeld}
                            onCancel={controller.onCancelMeldComposer}
                            disabled={controller.isSubmitting}
                            seedCard={seedCard}
                            helpText={
                                forceComposerOpen
                                    ? "You picked this card from the discard. It must be played — add 2+ cards from your hand to form a set or run, or tap an existing meld below to lay it off."
                                    : undefined
                            }
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
