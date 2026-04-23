"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameTable } from "@/components/games/shared";
import { MeldBoard } from "@/components/games/shared/MeldBoard";
import DiscardPile from "../DiscardPile";
import DrawToolbar from "../DrawToolbar";
import MeldComposer from "../MeldComposer";
import type { RummySceneCommonProps } from "../types";

/**
 * DRAW scene — renders in the GameTable center slot with opponent seats
 * visible around the edges.
 *
 * Layout (flex-col, h-full):
 *   • Stock + Discard side-by-side, vertically centered in the slot
 *   • DrawToolbar immediately below (or MeldComposer when take-discard)
 *   • MeldBoard compact strip at the bottom for Rummy reference
 */
export default function DrawScene({
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

    const pickedCard =
        controller.discardPickIndex != null
            ? gameData.discard.cards[controller.discardPickIndex]
            : null;

    const takeDiscardMode =
        controller.meldComposerOpen && controller.discardPickIndex != null;

    const handleTakeDiscard = () => {
        if (controller.discardPickIndex == null) return;
        controller.onOpenMeldComposer();
    };

    return (
        <motion.div
            className="flex flex-col h-full w-full overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Main: stock + discard + toolbar centered ── */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-4 py-3">
                {/* Instruction pill */}
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-1 rounded-full text-xs text-white bg-emerald-700/70 border border-emerald-400/60 text-center"
                >
                    {takeDiscardMode
                        ? "Form a meld with the picked card, or tap an existing meld to lay it off."
                        : "Draw from the stock, or tap a discard card then Take discard."}
                </motion.p>

                {/* Stock + Discard */}
                <div className="flex items-end justify-center gap-10 md:gap-16">
                    {/* Stock — inline stacked card-back affordance. */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            type="button"
                            onClick={controller.onDrawStock}
                            disabled={
                                controller.isSubmitting ||
                                gameData.stockCount === 0 ||
                                takeDiscardMode
                            }
                            className="relative shrink-0 w-20 h-28 md:w-24 md:h-32 disabled:opacity-60"
                            aria-label={`Draw from stock (${gameData.stockCount} cards remaining)`}
                        >
                            {gameData.stockCount > 0 ? (
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 28,
                                    }}
                                    className="absolute inset-0"
                                >
                                    {/* Stacked card-back layers (max 4
                                        visible). Offsets stay within the
                                        button bounds so nothing overlaps. */}
                                    {Array.from({
                                        length: Math.min(
                                            gameData.stockCount,
                                            4,
                                        ),
                                    }).map((_, i, arr) => (
                                        <div
                                            key={i}
                                            className="absolute rounded-lg bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-500/40 shadow-md"
                                            style={{
                                                inset: 0,
                                                transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
                                                zIndex: arr.length - i,
                                            }}
                                        >
                                            <div className="absolute inset-1.5 rounded border border-blue-400/30" />
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/40">
                                    Empty
                                </div>
                            )}
                        </button>
                        <span className="text-[10px] font-mono text-white/60">
                            Stock · {gameData.stockCount}
                        </span>
                    </div>

                    {/* Discard */}
                    <div className="flex flex-col items-center gap-1.5">
                        <DiscardPile
                            discard={gameData.discard}
                            layoutMode={layoutMode}
                            interactive={!takeDiscardMode}
                            previewPickIndex={controller.discardPickIndex}
                            onCardClick={controller.onClickDiscardCard}
                            topGlow={
                                controller.hintSettings.discardTop &&
                                (controller.hints.discardTop.canLayoff ||
                                    controller.hints.discardTop
                                        .canFormMeldWithHand)
                            }
                        />
                        <span className="text-[10px] font-mono text-white/60">
                            Discard · {gameData.discard.cards.length}
                        </span>
                    </div>
                </div>

                {/* DrawToolbar (hidden while composing) */}
                {!takeDiscardMode && (
                    <DrawToolbar
                        stagedDiscardPickIndex={controller.discardPickIndex}
                        disabled={controller.isSubmitting}
                        onDrawStock={controller.onDrawStock}
                        onTakeDiscard={handleTakeDiscard}
                    />
                )}

                {/* Take-discard MeldComposer slides in */}
                <AnimatePresence initial={false}>
                    {takeDiscardMode && (
                        <motion.div
                            key="take-discard-composer"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 320,
                                damping: 28,
                            }}
                            className="w-full max-w-2xl"
                        >
                            <MeldComposer
                                hand={playerData.hand}
                                selectedIndices={controller.selectedHandIndices}
                                onToggleSelect={controller.onSelectHandCard}
                                onClear={controller.onClearSelection}
                                onConfirm={controller.onConfirmMeld}
                                onCancel={controller.onCancelMeldComposer}
                                disabled={controller.isSubmitting}
                                seedCard={pickedCard ?? null}
                                helpText="Pick 2+ cards from your hand to form a set or run containing the picked card."
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Compact MeldBoard at the bottom for rummy-check ── */}
            {gameData.melds.length > 0 && (
                <div className="shrink-0 px-2 pb-3 pt-1 border-t border-white/10">
                    <MeldBoard
                        melds={gameData.melds}
                        players={players}
                        heroPlayerId={heroId}
                        mode="compact"
                        activeMeldId={controller.activeMeldId}
                        eligibleMeldIds={
                            takeDiscardMode
                                ? controller.eligibleLayoffMeldIds
                                : undefined
                        }
                        onSelectMeld={
                            takeDiscardMode
                                ? controller.onSelectMeld
                                : undefined
                        }
                    />
                </div>
            )}
        </motion.div>
    );
}
