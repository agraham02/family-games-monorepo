"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { MeldBoard } from "@/components/games/shared/MeldBoard";
import DiscardPile from "../DiscardPile";
import { useGameTable } from "@/components/games/shared";
import type { RummySceneCommonProps } from "../types";

/**
 * Shown when it's NOT the hero's turn (or they're a spectator / cardless-
 * waiting). Focus is on opponents and public melds. Hero's hand is
 * collapsed into a tap-to-expand peek strip. Discard is a chip.
 */
export default function WaitingScene({
    gameData,
    playerData,
    heroId,
    isSpectator,
}: RummySceneCommonProps) {
    const players = useMemo(
        () =>
            gameData.playOrder.map((id) => ({
                id,
                name: gameData.players[id]?.name ?? "Unknown",
            })),
        [gameData.playOrder, gameData.players],
    );

    const { layoutMode } = useGameTable();

    const isCardlessWaiting =
        !isSpectator &&
        gameData.turnSubstate === "cardless-waiting" &&
        gameData.playOrder[gameData.currentTurnIndex] === heroId;

    return (
        <motion.div
            className="flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* Center: full-bleed MeldBoard */}
            <div className="flex-1 min-h-0 relative flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4">
                    <MeldBoard
                        melds={gameData.melds}
                        players={players}
                        heroPlayerId={heroId}
                        mode="comfortable"
                    />
                </div>

                {/* Floating status pills */}
                {isCardlessWaiting && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs text-white border backdrop-blur-sm bg-purple-600/80 border-purple-400"
                    >
                        Empty hand — waiting to go out next turn.
                    </motion.div>
                )}

                {/* Compact discard fan bottom-right */}
                <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4">
                    <div className="flex flex-col items-end gap-1">
                        <DiscardPile
                            discard={gameData.discard}
                            layoutMode={layoutMode}
                            interactive={false}
                        />
                        <span className="text-[10px] font-mono text-white/50">
                            Discard · {gameData.discard.cards.length}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
