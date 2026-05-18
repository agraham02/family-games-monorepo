"use client";

import React, { useCallback, useMemo } from "react";
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
 * Layout differs by `layoutMode` from `useGameTable`:
 *
 * **Comfortable / spacious** (legacy vertical stack):
 *   • Stock + Discard side-by-side, vertically centered in the slot
 *   • DrawToolbar immediately below (or MeldComposer when take-discard)
 *   • MeldBoard compact strip at the bottom for Rummy reference
 *
 * **Compact** (left/right horizontal split, no toolbar):
 *   • Left ~40%  : scrollable MeldBoard column (always visible reference)
 *   • Right ~60% : instruction pill + small Stock tap-target + fanned
 *     Discard. Tapping the discard's top card immediately opens the
 *     MeldComposer (one-tap commit). The composer slides over the right
 *     pane only, so the meld column remains visible for layoff selection.
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

    const isCompact = layoutMode === "compact";
    // Compact DRAW scene gives the action pane ~60% of the slot width.
    // Stock stays small (it's only a tap target) so the discard pile can
    // claim the rest of the horizontal room and show more of its fan
    // before the +N overflow chip appears.
    const stockSizeCls = isCompact ? "w-12 h-18" : "w-20 h-28 md:w-24 md:h-32";

    const pickedCard =
        controller.discardPickIndex != null
            ? gameData.discard.cards[controller.discardPickIndex]
            : null;

    /**
     * Bonus cards that come along with a deep discard pickup. Per Rummy
     * rules, picking discard[i] also takes everything above it (i+1…end)
     * into the hand. Those tail cards are usable in the immediate new
     * meld; the server treats them as a free pool sourced from the tail.
     */
    const bonusDiscardCards =
        controller.discardPickIndex != null
            ? gameData.discard.cards.slice(controller.discardPickIndex + 1)
            : [];

    const takeDiscardMode =
        controller.meldComposerOpen && controller.discardPickIndex != null;

    const handleTakeDiscard = () => {
        if (controller.discardPickIndex == null) return;
        controller.onOpenMeldComposer();
    };

    // Compact one-tap discard flow: tapping ANY card stages the pick *and*
    // opens the MeldComposer in a single gesture (the toolbar's "Take
    // discard" button is gone in compact mode). Picking a deeper card means
    // also taking every card above it into the hand per Rummy rules; the
    // composer surfaces all bonus cards via `seedCard` + the augmented hand.
    const handleCompactDiscardClick = useCallback(
        (pickIndex: number) => {
            if (controller.discardPickIndex !== pickIndex) {
                controller.onClickDiscardCard(pickIndex);
            }
            if (!controller.meldComposerOpen) {
                controller.onOpenMeldComposer();
            }
        },
        [controller],
    );

    // ─────────────────────────────────────────────────────────────────────
    // COMPACT: left/right horizontal split, no toolbar.
    // ─────────────────────────────────────────────────────────────────────
    if (isCompact) {
        // House rule: when the stock is empty a player isn't forced into
        // taking a discard — they may pass the draw and proceed straight
        // to the meld/discard phase. The round only ends when someone
        // actually goes out.
        const stockEmpty = gameData.stockCount === 0;
        const instructionText = takeDiscardMode
            ? "Form a meld with the picked card, or tap a meld to lay off."
            : stockEmpty
              ? "Stock empty — take a discard or tap the stock to pass."
              : "Tap stock to draw, or tap a discard card to take it.";

        return (
            <motion.div
                className="flex flex-row h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                {/* ── Left ~40%: scrollable melds reference column ── */}
                <div className="flex-2 min-w-0 min-h-0 overflow-y-auto border-r border-white/10 p-2">
                    {gameData.melds.length > 0 ? (
                        <MeldBoard
                            melds={gameData.melds}
                            players={players}
                            heroPlayerId={heroId}
                            mode="compact"
                            compactLayout="scroll"
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
                    ) : (
                        <div className="flex h-full items-center justify-center text-center text-[11px] text-white/40 italic px-2">
                            No melds laid yet
                        </div>
                    )}
                </div>

                {/* ── Right ~60%: action zone (stock+discard, swaps to composer
                    while taking from discard) ── */}
                <div className="flex-3 min-w-0 min-h-0 flex flex-col items-center px-2 py-2 gap-2 relative overflow-hidden">
                    {takeDiscardMode ? (
                        <motion.div
                            key="take-discard-composer-compact"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{
                                type: "spring",
                                stiffness: 320,
                                damping: 28,
                            }}
                            className="w-full h-full overflow-y-auto"
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
                                bonusCards={bonusDiscardCards}
                                helpText="Pick 2+ cards to form a set or run with the picked card, or tap a meld at left to lay it off."
                            />
                        </motion.div>
                    ) : (
                        <>
                            {/* Instruction pill */}
                            <motion.p
                                key={takeDiscardMode ? "take" : "draw"}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="px-2 py-0.5 rounded-full text-[10px] text-white bg-emerald-700/70 border border-emerald-400/60 text-center shrink-0"
                            >
                                {instructionText}
                            </motion.p>

                            {/* Stock + Discard centered, spread to fill the pane */}
                            <div className="flex-1 min-h-0 w-full flex items-center justify-evenly gap-3 px-1">
                                {/* Stock — small tap target. When empty,
                                    becomes a "Pass" affordance so the hero
                                    can skip the draw rather than being
                                    forced into a discard pickup. */}
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={
                                            stockEmpty
                                                ? controller.onPassDraw
                                                : controller.onDrawStock
                                        }
                                        disabled={
                                            controller.isSubmitting ||
                                            takeDiscardMode
                                        }
                                        className={`relative shrink-0 ${stockSizeCls} disabled:opacity-60`}
                                        aria-label={
                                            stockEmpty
                                                ? "Stock empty — pass the draw"
                                                : `Draw from stock (${gameData.stockCount} cards remaining)`
                                        }
                                    >
                                        {gameData.stockCount > 0 ? (
                                            <motion.div
                                                whileTap={{ scale: 0.95 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 28,
                                                }}
                                                className="absolute inset-0"
                                            >
                                                {Array.from({
                                                    length: Math.min(
                                                        gameData.stockCount,
                                                        3,
                                                    ),
                                                }).map((_, i, arr) => (
                                                    <div
                                                        key={i}
                                                        className="absolute rounded bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-500/40 shadow-md"
                                                        style={{
                                                            inset: 0,
                                                            transform: `translate(${i}px, ${i * -1}px)`,
                                                            zIndex:
                                                                arr.length - i,
                                                        }}
                                                    >
                                                        <div className="absolute inset-1 rounded-sm border border-blue-400/30" />
                                                    </div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <div className="absolute inset-0 rounded border-2 border-dashed border-amber-400/60 flex items-center justify-center text-amber-200/90 text-[9px] font-semibold">
                                                Pass
                                            </div>
                                        )}
                                    </button>
                                    <span className="text-[9px] font-mono text-white/60">
                                        {gameData.stockCount}
                                    </span>
                                </div>

                                {/* Discard — fanned, tap any card to commit */}
                                <div className="flex flex-col items-center gap-1 min-w-0">
                                    <DiscardPile
                                        discard={gameData.discard}
                                        layoutMode={layoutMode}
                                        cardSizeOverride="sm"
                                        maxFanCards={8}
                                        interactive={!takeDiscardMode}
                                        previewPickIndex={
                                            controller.discardPickIndex
                                        }
                                        onCardClick={handleCompactDiscardClick}
                                        cardGlow={
                                            controller.hintSettings.discardTop
                                                ? controller.hints.discardPicks.map(
                                                      (h) =>
                                                          h.canLayoff ||
                                                          h.canFormMeldWithHand,
                                                  )
                                                : undefined
                                        }
                                        topGlow={
                                            controller.hintSettings
                                                .discardTop &&
                                            (controller.hints.discardTop
                                                .canLayoff ||
                                                controller.hints.discardTop
                                                    .canFormMeldWithHand)
                                        }
                                    />
                                    <span className="text-[9px] font-mono text-white/60">
                                        Discard ·{" "}
                                        {gameData.discard.cards.length}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // COMFORTABLE / SPACIOUS: legacy vertical stack.
    // ─────────────────────────────────────────────────────────────────────
    return (
        <motion.div
            className="flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Main: stock + discard + toolbar centered ── */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 md:gap-4 px-4 py-3">
                {/* Instruction pill */}
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-1 rounded-full text-xs text-white bg-emerald-700/70 border border-emerald-400/60 text-center"
                >
                    {takeDiscardMode
                        ? "Form a meld with the picked card, or tap an existing meld to lay it off."
                        : gameData.stockCount === 0
                          ? "Stock empty — take a discard or pass the draw."
                          : "Draw from the stock, or tap a discard card then Take discard."}
                </motion.p>

                {/* Stock + Discard */}
                <div className="flex items-end justify-center gap-10 md:gap-16">
                    {/* Stock — inline stacked card-back affordance. */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            type="button"
                            onClick={
                                gameData.stockCount === 0
                                    ? controller.onPassDraw
                                    : controller.onDrawStock
                            }
                            disabled={
                                controller.isSubmitting || takeDiscardMode
                            }
                            className={`relative shrink-0 ${stockSizeCls} disabled:opacity-60`}
                            aria-label={
                                gameData.stockCount === 0
                                    ? "Stock empty — pass the draw"
                                    : `Draw from stock (${gameData.stockCount} cards remaining)`
                            }
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
                                <div className="absolute inset-0 rounded-lg border-2 border-dashed border-amber-400/60 flex items-center justify-center text-amber-200/90 text-[11px] font-semibold">
                                    Pass
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
                        onPassDraw={controller.onPassDraw}
                        onTakeDiscard={handleTakeDiscard}
                        compact={isCompact}
                        stockEmpty={gameData.stockCount === 0}
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
                                bonusCards={bonusDiscardCards}
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
