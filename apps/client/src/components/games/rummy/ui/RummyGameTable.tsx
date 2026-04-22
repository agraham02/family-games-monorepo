"use client";

import React, { useMemo, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { RummyData, RummyPlayerData, PlayingCard } from "@shared/types";
import {
    GameTable,
    TableCenter,
    EdgeRegion,
    CardHand,
    CardDeck,
    PlayerInfo,
    useGameTable,
} from "@/components/games/shared";
import { MeldBoard } from "@/components/games/shared/MeldBoard";
import {
    getSeatAssignments,
    groupSeatsByEdge,
} from "@/components/games/shared/seatLayout";
import type { EdgePosition } from "@/components/games/shared/EdgeRegion";
import DiscardPile from "./DiscardPile";

export interface RummyGameTableProps {
    gameData: RummyData;
    playerData: RummyPlayerData;
    isMyTurn: boolean;
    selectedHandIndices: number[];
    onSelectHandCard: (index: number) => void;
    onClickDiscardCard: (pickIndex: number) => void;
    onSelectMeld: (meldId: string) => void;
    activeMeldId: string | null;
    discardPickIndex: number | null;
    /** Handler for when the local player taps the stock pile (draws). */
    onDrawStock: () => void;
    /** Whether interactivity should be disabled (submitting / spectator). */
    disabledHand?: boolean;
}

/**
 * Main playing-phase layout for Rummy. Reuses `GameTable` + `EdgeRegion` and
 * the `getSeatAssignments` helper to support 2–6 players. Center area renders
 * Stock + DiscardPile + MeldBoard horizontally on spacious, vertically on
 * compact.
 */
export default function RummyGameTable({
    gameData,
    playerData,
    isMyTurn,
    selectedHandIndices,
    onSelectHandCard,
    onClickDiscardCard,
    onSelectMeld,
    activeMeldId,
    discardPickIndex,
    onDrawStock,
    disabledHand,
}: RummyGameTableProps) {
    const playerCount = playerData.localOrdering.length;
    const heroIndex = 0; // playerData.localOrdering is rotated so hero is first

    const seats = useMemo(
        () => getSeatAssignments(playerCount, heroIndex),
        [playerCount, heroIndex],
    );
    const byEdge = useMemo(() => groupSeatsByEdge(seats), [seats]);

    return (
        <div className="h-full w-full">
            <LayoutGroup>
                <GameTable playerCount={playerCount}>
                    {(["top", "bottom", "left", "right"] as const).map(
                        (edge) => {
                            const slots = byEdge[edge];
                            if (slots.length === 0) return null;
                            return (
                                <EdgeRegion
                                    key={edge}
                                    position={edge}
                                    isHero={slots.some((s) => s.isHero)}
                                >
                                    <EdgeSlots
                                        edge={edge}
                                        slots={slots}
                                        seats={seats}
                                        gameData={gameData}
                                        playerData={playerData}
                                        isMyTurn={isMyTurn}
                                        selectedHandIndices={
                                            selectedHandIndices
                                        }
                                        onSelectHandCard={onSelectHandCard}
                                        disabledHand={disabledHand}
                                    />
                                </EdgeRegion>
                            );
                        },
                    )}

                    <TableCenter className="flex flex-col items-center justify-center gap-3">
                        <CenterArea
                            gameData={gameData}
                            isMyTurn={isMyTurn}
                            discardPickIndex={discardPickIndex}
                            activeMeldId={activeMeldId}
                            onClickDiscardCard={onClickDiscardCard}
                            onSelectMeld={onSelectMeld}
                            onDrawStock={onDrawStock}
                        />
                    </TableCenter>
                </GameTable>
            </LayoutGroup>
        </div>
    );
}

// ---------------------------------------------------------------------------
// EdgeSlots — render one or more PlayerInfo + CardHand stacks per edge.
// ---------------------------------------------------------------------------

function EdgeSlots({
    edge,
    slots,
    seats,
    gameData,
    playerData,
    isMyTurn,
    selectedHandIndices,
    onSelectHandCard,
    disabledHand,
}: {
    edge: EdgePosition;
    slots: ReturnType<typeof groupSeatsByEdge>[EdgePosition];
    seats: ReturnType<typeof getSeatAssignments>;
    gameData: RummyData;
    playerData: RummyPlayerData;
    isMyTurn: boolean;
    selectedHandIndices: number[];
    onSelectHandCard: (index: number) => void;
    disabledHand?: boolean;
}) {
    // Stack multiple slots perpendicular to the edge axis.
    const stackDirection =
        edge === "top" || edge === "bottom" ? "flex-row" : "flex-col";

    const content = slots.map((slot) => {
        const playerIdx = seats.indexOf(slot);
        const playerId = playerData.localOrdering[playerIdx];
        const player = gameData.players[playerId];
        const isLocal = slot.isHero;
        const isCurrentTurn =
            gameData.playOrder[gameData.currentTurnIndex] === playerId;
        const handCount = isLocal
            ? playerData.hand.length
            : (gameData.handCounts[playerId] ?? 0);

        return (
            <div key={playerId} className="flex flex-col items-center gap-1">
                <PlayerInfo
                    playerId={playerId}
                    playerName={player?.name ?? "Unknown"}
                    isCurrentTurn={isCurrentTurn}
                    isLocalPlayer={isLocal}
                    seatPosition={slot.edge}
                    customStats={() => (
                        <span className="text-[10px] text-white/70 font-mono">
                            {gameData.scores[playerId] ?? 0} pts • {handCount}{" "}
                            cards
                        </span>
                    )}
                />
                <CardHand
                    cards={isLocal ? playerData.hand : []}
                    cardCount={handCount}
                    isLocalPlayer={isLocal}
                    interactive={isLocal && isMyTurn && !disabledHand}
                    selectedIndex={
                        isLocal && selectedHandIndices.length === 1
                            ? selectedHandIndices[0]
                            : null
                    }
                    onCardClick={
                        isLocal
                            ? (idx: number, _card: PlayingCard) =>
                                  onSelectHandCard(idx)
                            : undefined
                    }
                    playerId={playerId}
                    enableTapToSpread={isLocal}
                />
            </div>
        );
    });

    if (slots.length === 1) return <>{content}</>;
    return (
        <div
            className={`flex ${stackDirection} gap-3 items-center justify-center w-full`}
        >
            {content}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Center: stock + discard + meld board, layout-mode aware.
// ---------------------------------------------------------------------------

function CenterArea({
    gameData,
    isMyTurn,
    discardPickIndex,
    activeMeldId,
    onClickDiscardCard,
    onSelectMeld,
    onDrawStock,
}: {
    gameData: RummyData;
    isMyTurn: boolean;
    discardPickIndex: number | null;
    activeMeldId: string | null;
    onClickDiscardCard: (i: number) => void;
    onSelectMeld: (id: string) => void;
    onDrawStock: () => void;
}) {
    const { layoutMode } = useGameTable();
    const meldBoardMode = layoutMode; // same names, same intent

    const interactiveDiscard =
        isMyTurn && gameData.turnSubstate === "awaiting-draw";
    const [sheetOpen, setSheetOpen] = useState(false);

    const players = useMemo(
        () =>
            gameData.playOrder.map((id) => ({
                id,
                name: gameData.players[id]?.name ?? "Unknown",
            })),
        [gameData.playOrder, gameData.players],
    );

    return (
        <div
            className={`flex ${
                layoutMode === "compact" ? "flex-col" : "flex-row"
            } items-center justify-center gap-4 w-full max-w-full px-2`}
        >
            <div className="flex items-end gap-3">
                {/* Stock */}
                <button
                    type="button"
                    onClick={() => isMyTurn && onDrawStock()}
                    disabled={!isMyTurn || gameData.stockCount === 0}
                    className={`relative ${
                        isMyTurn && gameData.stockCount > 0
                            ? "cursor-pointer hover:scale-105"
                            : "opacity-60 cursor-not-allowed"
                    } transition-transform`}
                    aria-label={`Stock pile (${gameData.stockCount} cards)`}
                >
                    {gameData.stockCount > 0 ? (
                        <CardDeck cardCount={gameData.stockCount} />
                    ) : (
                        <div className="w-16 h-24 md:w-20 md:h-28 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/40">
                            Empty
                        </div>
                    )}
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/70 bg-black/60 px-1.5 py-0.5 rounded">
                        {gameData.stockCount}
                    </span>
                </button>

                {/* Discard pile */}
                <DiscardPile
                    discard={gameData.discard}
                    layoutMode={layoutMode}
                    interactive={interactiveDiscard}
                    previewPickIndex={discardPickIndex}
                    onCardClick={onClickDiscardCard}
                    onExpandClick={() => setSheetOpen(true)}
                />
            </div>

            {/* MeldBoard */}
            <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
                <MeldBoard
                    melds={gameData.melds}
                    players={players}
                    heroPlayerId={gameData.playOrder[0]}
                    mode={meldBoardMode}
                    activeMeldId={activeMeldId}
                    onSelectMeld={onSelectMeld}
                />
            </div>

            {/* Round indicator (top-right corner area) */}
            <motion.div
                className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-mono text-white/80 pointer-events-none"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                Round {gameData.round} • {gameData.turnSubstate}
            </motion.div>

            {/* TODO(v2): inline DiscardPileSheetContent inside a Dialog when sheetOpen */}
            {sheetOpen && layoutMode === "compact" && (
                <button
                    type="button"
                    aria-label="Close discard pile sheet"
                    onClick={() => setSheetOpen(false)}
                    className="fixed inset-0 z-40 bg-black/60"
                />
            )}
        </div>
    );
}
