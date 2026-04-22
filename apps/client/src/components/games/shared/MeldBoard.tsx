"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MeldStrip } from "./MeldStrip";
import type { RummyMeldView } from "@shared/types";

/**
 * Visual presentation mode for the MeldBoard. Driven by parent layoutMode but
 * exposed as its own prop so the board can also be embedded in non-table
 * contexts (round summary, debug page).
 *
 *  - spacious   : grouped by owner, large cards, generous spacing.
 *  - comfortable: single wrapping flow, medium cards.
 *  - compact    : tabbed by owner, small cards (mobile).
 */
export type MeldBoardMode = "spacious" | "comfortable" | "compact";

export interface MeldBoardPlayer {
    id: string;
    name: string;
    /** Optional short label (e.g. seat colour) shown in tabs. */
    initials?: string;
}

export interface MeldBoardProps {
    melds: RummyMeldView[];
    players: MeldBoardPlayer[];
    /** Local hero id — their melds get a "You" highlight. */
    heroPlayerId?: string;
    mode?: MeldBoardMode;
    /** Currently active layoff target id (highlights the matching strip). */
    activeMeldId?: string | null;
    /** Click handler for melds (used by tap-only layoff). */
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}

interface GroupedMelds {
    ownerId: string;
    ownerName: string;
    melds: RummyMeldView[];
}

function groupMeldsByOwner(
    melds: RummyMeldView[],
    players: MeldBoardPlayer[],
): GroupedMelds[] {
    const nameOf: Record<string, string> = {};
    for (const p of players) nameOf[p.id] = p.name;
    const groups: Record<string, GroupedMelds> = {};
    for (const m of melds) {
        if (!groups[m.ownerId]) {
            groups[m.ownerId] = {
                ownerId: m.ownerId,
                ownerName: nameOf[m.ownerId] ?? "Unknown",
                melds: [],
            };
        }
        groups[m.ownerId].melds.push(m);
    }
    // Preserve player order from `players` array
    return players.filter((p) => groups[p.id]).map((p) => groups[p.id]);
}

export function MeldBoard({
    melds,
    players,
    heroPlayerId,
    mode = "spacious",
    activeMeldId,
    onSelectMeld,
    className,
}: MeldBoardProps) {
    const grouped = useMemo(
        () => groupMeldsByOwner(melds, players),
        [melds, players],
    );

    if (melds.length === 0) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center text-white/40 text-sm italic p-3",
                    className,
                )}
            >
                No melds yet.
            </div>
        );
    }

    if (mode === "compact") {
        return (
            <CompactTabbed
                grouped={grouped}
                heroPlayerId={heroPlayerId}
                activeMeldId={activeMeldId}
                onSelectMeld={onSelectMeld}
                className={className}
            />
        );
    }

    if (mode === "comfortable") {
        return (
            <div
                className={cn(
                    "flex flex-wrap gap-3 items-start p-2",
                    className,
                )}
            >
                {melds.map((m) => (
                    <MeldStrip
                        key={m.id}
                        meld={m}
                        size="sm"
                        compact
                        highlighted={m.id === activeMeldId}
                        onSelect={
                            onSelectMeld ? () => onSelectMeld(m.id) : undefined
                        }
                        ownerLabel={
                            m.ownerId === heroPlayerId
                                ? "You"
                                : players.find((p) => p.id === m.ownerId)?.name
                        }
                    />
                ))}
            </div>
        );
    }

    // spacious — grouped by owner
    return (
        <div className={cn("flex flex-col gap-4 p-3", className)}>
            {grouped.map((g) => (
                <div key={g.ownerId} className="flex flex-col gap-2">
                    <div className="text-xs uppercase tracking-wide font-mono text-white/60">
                        {g.ownerId === heroPlayerId
                            ? `You (${g.ownerName})`
                            : g.ownerName}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {g.melds.map((m) => (
                            <MeldStrip
                                key={m.id}
                                meld={m}
                                size="md"
                                highlighted={m.id === activeMeldId}
                                onSelect={
                                    onSelectMeld
                                        ? () => onSelectMeld(m.id)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CompactTabbed({
    grouped,
    heroPlayerId,
    activeMeldId,
    onSelectMeld,
    className,
}: {
    grouped: GroupedMelds[];
    heroPlayerId?: string;
    activeMeldId?: string | null;
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}) {
    // Default tab: hero if they have melds, else first.
    const defaultId = useMemo(() => {
        const heroGroup = grouped.find((g) => g.ownerId === heroPlayerId);
        return heroGroup?.ownerId ?? grouped[0]?.ownerId ?? null;
    }, [grouped, heroPlayerId]);

    const [activeTab, setActiveTab] = useState<string | null>(defaultId);

    // Reset if active tab no longer exists (e.g. owner removed).
    const validTab = grouped.some((g) => g.ownerId === activeTab)
        ? activeTab
        : defaultId;

    const activeGroup = grouped.find((g) => g.ownerId === validTab);

    return (
        <div className={cn("flex flex-col gap-2 p-2", className)}>
            <div className="flex gap-1 overflow-x-auto pb-1">
                {grouped.map((g) => (
                    <button
                        key={g.ownerId}
                        onClick={() => setActiveTab(g.ownerId)}
                        className={cn(
                            "px-2 py-1 rounded text-xs font-mono whitespace-nowrap shrink-0 transition-colors",
                            g.ownerId === validTab
                                ? "bg-amber-400 text-black"
                                : "bg-white/10 text-white/70 hover:bg-white/20",
                        )}
                    >
                        {g.ownerId === heroPlayerId ? "You" : g.ownerName} (
                        {g.melds.length})
                    </button>
                ))}
            </div>
            {activeGroup && (
                <div className="flex flex-wrap gap-2">
                    {activeGroup.melds.map((m) => (
                        <MeldStrip
                            key={m.id}
                            meld={m}
                            size="xs"
                            compact
                            highlighted={m.id === activeMeldId}
                            onSelect={
                                onSelectMeld
                                    ? () => onSelectMeld(m.id)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
