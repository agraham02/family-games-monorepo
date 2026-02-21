"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LRCData, LRCDiceFace } from "@shared/types";

interface DieProps {
    face: LRCDiceFace;
    className?: string;
}

/**
 * Visual representation of a single LRC die face.
 */
export function Die({ face, className }: DieProps) {
    const faceConfig: Record<LRCDiceFace, { label: string; bg: string; text: string }> = {
        L: { label: "L", bg: "bg-blue-500", text: "text-white" },
        R: { label: "R", bg: "bg-green-500", text: "text-white" },
        C: { label: "C", bg: "bg-red-500", text: "text-white" },
        "*": { label: "●", bg: "bg-zinc-200 dark:bg-zinc-700", text: "text-zinc-800 dark:text-zinc-200" },
    };

    const config = faceConfig[face];

    return (
        <div
            className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shadow-md",
                config.bg,
                config.text,
                className
            )}
        >
            {config.label}
        </div>
    );
}

interface ChipStackProps {
    count: number;
    playerId: string;
    players: LRCData["players"];
    isCurrentPlayer: boolean;
    isMe: boolean;
}

/**
 * Displays a player's chip count.
 */
export function ChipStack({ count, playerId, players, isCurrentPlayer, isMe }: ChipStackProps) {
    const player = players[playerId];

    return (
        <div
            className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                isCurrentPlayer && "ring-2 ring-primary ring-offset-2",
                isMe && "bg-primary/10"
            )}
        >
            <span className={cn("text-sm font-medium truncate max-w-20", isMe && "text-primary")}>
                {player?.name || "Unknown"}
            </span>
            <div className="flex items-center gap-1">
                {count > 0 ? (
                    Array.from({ length: Math.min(count, 10) }).map((_, i) => (
                        <div
                            key={i}
                            className="w-4 h-4 rounded-full bg-amber-400 border border-amber-500 shadow-sm"
                        />
                    ))
                ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600" />
                )}
                {count > 10 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">+{count - 10}</span>
                )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {count} chip{count !== 1 ? "s" : ""}
            </span>
            {isCurrentPlayer && (
                <span className="text-xs font-semibold text-primary">
                    Rolling...
                </span>
            )}
        </div>
    );
}

interface CenterPotProps {
    amount: number;
    chipValue: number;
}

/**
 * Displays the center pot.
 */
export function CenterPot({ amount, chipValue }: CenterPotProps) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl shadow-inner">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Center Pot
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-center">
                {amount > 0 ? (
                    Array.from({ length: Math.min(amount, 15) }).map((_, i) => (
                        <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-amber-400 border border-amber-500 shadow-sm"
                        />
                    ))
                ) : (
                    <div className="text-zinc-400 dark:text-zinc-600 text-sm">Empty</div>
                )}
                {amount > 15 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">+{amount - 15}</span>
                )}
            </div>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {amount} chip{amount !== 1 ? "s" : ""}
            </span>
            {chipValue > 0 && amount > 0 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    ≈ ${(amount * chipValue).toFixed(2)}
                </span>
            )}
        </div>
    );
}
