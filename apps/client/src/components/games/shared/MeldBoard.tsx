"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MeldStrip } from "./MeldStrip";
import PlayingCardComponent from "@/components/games/shared/PlayingCard";
import type {
    RummyMeldView,
    PlayingCard as PlayingCardType,
} from "@shared/types";

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
    /** Synthetic meld with layoff cards filtered out (those moved to layers). */
    display: RummyMeldView;
    /** True iff the original meld is a 4+ same-rank book (face-down). */
    isBook: boolean;
}

interface OwnerLayoffContribution {
    /** Stable key for React. */
    key: string;
    /** The card that was laid off. */
    card: PlayingCardType;
    /** Id of the meld it was laid on (for tap-to-jump in the future). */
    targetMeldId: string;
    /** True iff the target meld is a book (render face-down). */
    faceDown: boolean;
}

interface PlayerSection {
    ownerId: string;
    ownerName: string;
    owned: OwnerOwnedMeld[];
    layoffs: OwnerLayoffContribution[];
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
                layoffs: [],
            };
        }
        return sections[pid];
    };

    for (const m of melds) {
        const isBook = m.kind === "set" && m.cards.length >= 4;
        const layoffByIndex = new Map<number, string>();
        for (const l of m.layoffs ?? []) layoffByIndex.set(l.index, l.playerId);

        // Owner's display meld: drop cards laid off by other players. (A
        // layoff by the meld's owner would be unusual but treat as kept.)
        const displayCards: PlayingCardType[] = [];
        m.cards.forEach((c, i) => {
            const layerId = layoffByIndex.get(i);
            if (!layerId || layerId === m.ownerId) {
                displayCards.push(c as PlayingCardType);
            }
        });
        const display: RummyMeldView = {
            ...m,
            cards: displayCards,
            layoffs: [],
        };
        ensure(m.ownerId).owned.push({ original: m, display, isBook });

        // Per-layoff contributions go to the laying player's section.
        (m.layoffs ?? []).forEach((l, idx) => {
            if (l.playerId === m.ownerId) return;
            const card = m.cards[l.index];
            if (!card) return;
            ensure(l.playerId).layoffs.push({
                key: `${m.id}-${l.index}-${idx}`,
                card: card as PlayingCardType,
                targetMeldId: m.id,
                faceDown: isBook,
            });
        });
    }

    // Preserve player order; only include sections that have content.
    return players
        .filter(
            (p) =>
                sections[p.id] &&
                (sections[p.id].owned.length > 0 ||
                    sections[p.id].layoffs.length > 0),
        )
        .map((p) => sections[p.id]);
}

export function MeldBoard({
    melds,
    players,
    heroPlayerId,
    mode = "spacious",
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
                            meld={o.display}
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
            {section.layoffs.length > 0 && (
                <LayoffStrip
                    contributions={section.layoffs}
                    size={size}
                    label="Lay-offs"
                />
            )}
        </div>
    );
}

function LayoffStrip({
    contributions,
    size,
    label,
}: {
    contributions: OwnerLayoffContribution[];
    size: "xs" | "sm" | "md";
    label: string;
}) {
    const overlapPx = size === "xs" ? 24 : 18;
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-white/50 font-mono">
                {label}
            </span>
            <div className="flex items-center rounded-md ring-1 ring-white/5 p-1">
                {contributions.map((c, i) => (
                    <div
                        key={c.key}
                        className="relative"
                        style={{
                            marginLeft: i === 0 ? 0 : `-${overlapPx}px`,
                            zIndex: i,
                        }}
                        title={c.faceDown ? "Laid on a book" : "Lay-off"}
                    >
                        <PlayingCardComponent
                            card={c.card}
                            size={size}
                            hidden={c.faceDown}
                        />
                    </div>
                ))}
            </div>
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
                    const count = s.owned.length + s.layoffs.length;
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
