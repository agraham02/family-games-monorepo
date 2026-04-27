"use client";

import React, { useState } from "react";
import GameTable, { TableCenter } from "@/components/games/shared/GameTable";
import EdgeRegion from "@/components/games/shared/EdgeRegion";
import {
    getSeatAssignments,
    groupSeatsByEdge,
} from "@/components/games/shared/seatLayout";

/**
 * Debug page for the seat layout helper. Renders the GameTable with badge-
 * style seat markers per player so we can visually verify clockwise
 * placement and edge stacking at 2-6 players.
 */
export default function SeatLayoutDebugPage() {
    const [playerCount, setPlayerCount] = useState(5);
    const [heroIndex, setHeroIndex] = useState(0);

    const seats = getSeatAssignments(playerCount, heroIndex);
    const byEdge = groupSeatsByEdge(seats);

    return (
        <div className="w-screen h-screen flex flex-col bg-neutral-950 text-white">
            <div className="flex items-center gap-3 p-3 border-b border-white/10 text-sm">
                <label className="flex items-center gap-2">
                    Players:
                    <select
                        className="bg-neutral-800 px-2 py-1 rounded"
                        value={playerCount}
                        onChange={(e) => {
                            const n = Number(e.target.value);
                            setPlayerCount(n);
                            setHeroIndex((h) => Math.min(h, n - 1));
                        }}
                    >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2">
                    Hero index:
                    <select
                        className="bg-neutral-800 px-2 py-1 rounded"
                        value={heroIndex}
                        onChange={(e) => setHeroIndex(Number(e.target.value))}
                    >
                        {Array.from({ length: playerCount }, (_, i) => (
                            <option key={i} value={i}>
                                P{i}
                            </option>
                        ))}
                    </select>
                </label>
                <span className="text-white/50 ml-2">
                    Hero is always at the bottom; others are placed clockwise
                    from hero+1.
                </span>
            </div>

            <div className="flex-1 min-h-0">
                <GameTable playerCount={playerCount} showDebugGrid>
                    {(["top", "bottom", "left", "right"] as const).map(
                        (edge) => {
                            const slots = byEdge[edge];
                            if (slots.length === 0) return null;
                            // For multi-slot edges, lay slots out perpendicular
                            // to EdgeRegion's primary axis: top/bottom stack
                            // horizontally, left/right stack vertically.
                            const stackDirection =
                                edge === "top" || edge === "bottom"
                                    ? "flex-row"
                                    : "flex-col";
                            const isMultiSlot = slots.length > 1;
                            const containerCls = [
                                "flex items-center",
                                stackDirection,
                                isMultiSlot
                                    ? "justify-around"
                                    : "justify-center gap-3",
                                isMultiSlot &&
                                    (edge === "top" || edge === "bottom") &&
                                    "w-full",
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
                                    isHero={slots.some((s) => s.isHero)}
                                >
                                    <div className={containerCls}>
                                        {slots.map((slot) => {
                                            const playerIdx =
                                                seats.indexOf(slot);
                                            return (
                                                <SeatBadge
                                                    key={`${edge}-${slot.slotIndex}`}
                                                    playerIdx={playerIdx}
                                                    slot={slot}
                                                />
                                            );
                                        })}
                                    </div>
                                </EdgeRegion>
                            );
                        },
                    )}

                    <TableCenter>
                        <div className="px-4 py-3 rounded-lg bg-black/60 text-xs font-mono">
                            <div>
                                {playerCount} players, hero=P{heroIndex}
                            </div>
                            <div className="text-white/50 mt-1">
                                clockwise from bottom
                            </div>
                        </div>
                    </TableCenter>
                </GameTable>
            </div>
        </div>
    );
}

function SeatBadge({
    playerIdx,
    slot,
}: {
    playerIdx: number;
    slot: ReturnType<typeof getSeatAssignments>[number];
}) {
    const heroBadge = slot.isHero
        ? "bg-emerald-500/90 text-emerald-50"
        : "bg-sky-500/80 text-sky-50";
    return (
        <div
            className={`min-w-[64px] px-3 py-2 rounded-md text-center font-mono text-xs shadow-md ${heroBadge}`}
            style={{
                transform:
                    slot.cardRotation !== 0
                        ? `rotate(${slot.cardRotation}deg)`
                        : undefined,
            }}
        >
            <div className="text-sm font-bold">P{playerIdx}</div>
            <div className="opacity-80">
                {slot.edge}
                {slot.slotCount > 1 ? `[${slot.slotIndex}]` : ""}
            </div>
            <div className="opacity-60">{slot.cardRotation}°</div>
        </div>
    );
}
