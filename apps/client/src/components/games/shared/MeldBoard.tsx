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

/**
 * In `compact` mode, choose between:
 *  - `scroll` (default): all sections rendered in a vertically scrollable list
 *    so every player's melds are visible without paging through tabs.
 *    Best for narrow side columns.
 *  - `horizontal`: sections rendered side-by-side and scrolled horizontally.
 *    Best for wide rows where vertical space is tight.
 *  - `tabs`: legacy per-player tabbed view.
 */
export type MeldBoardCompactLayout = "scroll" | "horizontal" | "tabs";

export interface MeldBoardProps {
    melds: RummyMeldView[];
    players: MeldBoardPlayer[];
    /** Local hero id — their melds get a "You" highlight. */
    heroPlayerId?: string;
    mode?: MeldBoardMode;
    /** Layout to use when `mode === "compact"`. Defaults to `"scroll"`. */
    compactLayout?: MeldBoardCompactLayout;
    /** Currently active layoff target id (highlights the matching strip). */
    activeMeldId?: string | null;
    /**
     * Meld ids onto which the currently-selected hand card can be laid off.
     * These get a pulsing emerald glow to surface the affordance.
     */
    eligibleMeldIds?: readonly string[];
    /** Click handler for melds (used by tap-only layoff). */
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}

interface OwnerOwnedMeld {
    /** The original meld (for ids, ownership, book detection). */
    original: RummyMeldView;
    /** True iff the original meld is a 4+ same-rank book (face-down). */
    isBook: boolean;
}

interface PlayerSection {
    ownerId: string;
    ownerName: string;
    owned: OwnerOwnedMeld[];
}

function buildPlayerSections(
    melds: RummyMeldView[],
    players: MeldBoardPlayer[],
): PlayerSection[] {
    const nameOf: Record<string, string> = {};
    for (const p of players) nameOf[p.id] = p.name;

    const sections: Record<string, PlayerSection> = {};
    const ensure = (pid: string): PlayerSection => {
        if (!sections[pid]) {
            sections[pid] = {
                ownerId: pid,
                ownerName: nameOf[pid] ?? "Unknown",
                owned: [],
            };
        }
        return sections[pid];
    };

    // Layoffs render inline on the original meld strip (each card carries
    // its layer's initials via MeldStrip's badge layer), so we no longer
    // relocate them into a separate "LAY-OFFS" row per player. This keeps
    // the full set/run visually intact — important for hint affordances
    // like "your card lays off here" highlighting the actual attach point.
    for (const m of melds) {
        const isBook = m.kind === "set" && m.cards.length >= 4;
        ensure(m.ownerId).owned.push({ original: m, isBook });
    }

    // Preserve player order; only include sections that have content.
    return players
        .filter((p) => sections[p.id] && sections[p.id].owned.length > 0)
        .map((p) => sections[p.id]);
}

export function MeldBoard({
    melds,
    players,
    heroPlayerId,
    mode = "spacious",
    compactLayout = "scroll",
    activeMeldId,
    eligibleMeldIds,
    onSelectMeld,
    className,
}: MeldBoardProps) {
    const sections = useMemo(
        () => buildPlayerSections(melds, players),
        [melds, players],
    );

    const playerInitials = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of players) {
            const src = p.initials ?? p.name ?? "?";
            map[p.id] =
                p.id === heroPlayerId
                    ? "You"
                    : src
                          .trim()
                          .split(/\s+/)
                          .map((part) => part.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
        }
        return map;
    }, [players, heroPlayerId]);

    const eligibleSet = useMemo(
        () => new Set(eligibleMeldIds ?? []),
        [eligibleMeldIds],
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
        if (compactLayout === "tabs") {
            return (
                <CompactTabbed
                    sections={sections}
                    heroPlayerId={heroPlayerId}
                    activeMeldId={activeMeldId}
                    eligibleSet={eligibleSet}
                    playerInitials={playerInitials}
                    onSelectMeld={onSelectMeld}
                    className={className}
                />
            );
        }
        if (compactLayout === "horizontal") {
            return (
                <CompactHorizontal
                    sections={sections}
                    heroPlayerId={heroPlayerId}
                    activeMeldId={activeMeldId}
                    eligibleSet={eligibleSet}
                    playerInitials={playerInitials}
                    onSelectMeld={onSelectMeld}
                    className={className}
                />
            );
        }
        return (
            <CompactScroll
                sections={sections}
                heroPlayerId={heroPlayerId}
                activeMeldId={activeMeldId}
                eligibleSet={eligibleSet}
                playerInitials={playerInitials}
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
                        eligible={eligibleSet.has(m.id)}
                        playerInitials={playerInitials}
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

    // spacious — grouped by owner with relocated lay-offs
    return (
        <div className={cn("flex flex-col gap-4 p-3", className)}>
            {sections.map((s) => (
                <PlayerSectionView
                    key={s.ownerId}
                    section={s}
                    isHero={s.ownerId === heroPlayerId}
                    activeMeldId={activeMeldId}
                    eligibleSet={eligibleSet}
                    playerInitials={playerInitials}
                    onSelectMeld={onSelectMeld}
                    size="md"
                />
            ))}
        </div>
    );
}

function PlayerSectionView({
    section,
    isHero,
    activeMeldId,
    eligibleSet,
    playerInitials,
    onSelectMeld,
    size,
}: {
    section: PlayerSection;
    isHero: boolean;
    activeMeldId?: string | null;
    eligibleSet: Set<string>;
    playerInitials: Record<string, string>;
    onSelectMeld?: (meldId: string) => void;
    size: "xs" | "sm" | "md";
}) {
    const heading = isHero ? `You (${section.ownerName})` : section.ownerName;
    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide font-mono text-white/60">
                {heading}
            </div>
            {section.owned.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {section.owned.map((o) => (
                        <MeldStrip
                            key={o.original.id}
                            meld={o.original}
                            size={size}
                            highlighted={o.original.id === activeMeldId}
                            eligible={eligibleSet.has(o.original.id)}
                            playerInitials={playerInitials}
                            forceFaceDown={o.isBook}
                            onSelect={
                                onSelectMeld
                                    ? () => onSelectMeld(o.original.id)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CompactTabbed({
    sections,
    heroPlayerId,
    activeMeldId,
    eligibleSet,
    playerInitials,
    onSelectMeld,
    className,
}: {
    sections: PlayerSection[];
    heroPlayerId?: string;
    activeMeldId?: string | null;
    eligibleSet: Set<string>;
    playerInitials: Record<string, string>;
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}) {
    // Default tab: hero if they have content, else first.
    const defaultId = useMemo(() => {
        const hero = sections.find((s) => s.ownerId === heroPlayerId);
        return hero?.ownerId ?? sections[0]?.ownerId ?? null;
    }, [sections, heroPlayerId]);

    const [activeTab, setActiveTab] = useState<string | null>(defaultId);

    const validTab = sections.some((s) => s.ownerId === activeTab)
        ? activeTab
        : defaultId;

    const active = sections.find((s) => s.ownerId === validTab);

    return (
        <div className={cn("flex flex-col gap-2 p-2", className)}>
            <div className="flex gap-1 overflow-x-auto pb-1">
                {sections.map((s) => {
                    const count = s.owned.length;
                    return (
                        <button
                            key={s.ownerId}
                            onClick={() => setActiveTab(s.ownerId)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-mono whitespace-nowrap shrink-0 transition-colors",
                                s.ownerId === validTab
                                    ? "bg-amber-400 text-black"
                                    : "bg-white/10 text-white/70 hover:bg-white/20",
                            )}
                        >
                            {s.ownerId === heroPlayerId ? "You" : s.ownerName} (
                            {count})
                        </button>
                    );
                })}
            </div>
            {active && (
                <PlayerSectionView
                    section={active}
                    isHero={active.ownerId === heroPlayerId}
                    activeMeldId={activeMeldId}
                    eligibleSet={eligibleSet}
                    playerInitials={playerInitials}
                    onSelectMeld={onSelectMeld}
                    size="xs"
                />
            )}
        </div>
    );
}

/**
 * Compact scrollable layout — every player's section stacked vertically in a
 * single scrollable column. Each section renders its meld strips with the
 * smallest card size. Designed to replace the legacy tabbed compact view so
 * players never have to switch tabs to see other players' progress.
 */
function CompactHorizontal({
    sections,
    heroPlayerId,
    activeMeldId,
    eligibleSet,
    playerInitials,
    onSelectMeld,
    className,
}: {
    sections: PlayerSection[];
    heroPlayerId?: string;
    activeMeldId?: string | null;
    eligibleSet: Set<string>;
    playerInitials: Record<string, string>;
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-row gap-4 p-2 overflow-x-auto overflow-y-hidden items-start",
                className,
            )}
        >
            {sections.map((s) => (
                <div key={s.ownerId} className="shrink-0">
                    <PlayerSectionView
                        section={s}
                        isHero={s.ownerId === heroPlayerId}
                        activeMeldId={activeMeldId}
                        eligibleSet={eligibleSet}
                        playerInitials={playerInitials}
                        onSelectMeld={onSelectMeld}
                        size="xs"
                    />
                </div>
            ))}
        </div>
    );
}

function CompactScroll({
    sections,
    heroPlayerId,
    activeMeldId,
    eligibleSet,
    playerInitials,
    onSelectMeld,
    className,
}: {
    sections: PlayerSection[];
    heroPlayerId?: string;
    activeMeldId?: string | null;
    eligibleSet: Set<string>;
    playerInitials: Record<string, string>;
    onSelectMeld?: (meldId: string) => void;
    className?: string;
}) {
    return (
        <div
            className={cn("flex flex-col gap-3 p-2 overflow-y-auto", className)}
        >
            {sections.map((s) => (
                <PlayerSectionView
                    key={s.ownerId}
                    section={s}
                    isHero={s.ownerId === heroPlayerId}
                    activeMeldId={activeMeldId}
                    eligibleSet={eligibleSet}
                    playerInitials={playerInitials}
                    onSelectMeld={onSelectMeld}
                    size="xs"
                />
            ))}
        </div>
    );
}
