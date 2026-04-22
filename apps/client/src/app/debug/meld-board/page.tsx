"use client";

import React, { useState } from "react";
import {
    MeldBoard,
    MeldBoardMode,
    MeldBoardPlayer,
} from "@/components/games/shared/MeldBoard";
import type { RummyMeldView, PlayingCard } from "@shared/types";
import { Suit, Rank } from "@shared/types";

const PLAYERS: MeldBoardPlayer[] = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Carla" },
    { id: "p4", name: "Dan" },
];

function card(suit: Suit, rank: Rank, hidden = false): PlayingCard {
    return { suit, rank, hidden } as PlayingCard;
}

const MELDS: RummyMeldView[] = [
    {
        id: "m1",
        kind: "set",
        ownerId: "p1",
        round: 1,
        cards: [
            card(Suit.Hearts, Rank.Seven),
            card(Suit.Clubs, Rank.Seven),
            card(Suit.Diamonds, Rank.Seven),
        ],
    },
    {
        id: "m2",
        kind: "run",
        ownerId: "p1",
        round: 1,
        cards: [
            card(Suit.Spades, Rank.Four),
            card(Suit.Spades, Rank.Five),
            card(Suit.Spades, Rank.Six),
            card(Suit.Spades, Rank.Seven),
        ],
    },
    {
        id: "m3",
        kind: "set",
        ownerId: "p2",
        round: 1,
        cards: [
            card(Suit.Hearts, Rank.King),
            card(Suit.Clubs, Rank.King),
            card(Suit.Spades, Rank.King),
            card(Suit.Diamonds, Rank.King),
        ],
    },
    {
        id: "m4",
        kind: "run",
        ownerId: "p3",
        round: 1,
        cards: [
            card(Suit.Hearts, Rank.Nine),
            card(Suit.Hearts, Rank.Ten),
            card(Suit.Hearts, Rank.Jack),
            card(Suit.Hearts, Rank.Queen),
        ],
    },
    {
        id: "m5",
        kind: "set",
        ownerId: "p4",
        round: 1,
        cards: [
            card(Suit.Clubs, Rank.Ace),
            card(Suit.Hearts, Rank.Ace),
            card(Suit.Diamonds, Rank.Ace),
        ],
    },
];

export default function MeldBoardDebugPage() {
    const [mode, setMode] = useState<MeldBoardMode>("spacious");
    const [activeId, setActiveId] = useState<string | null>(null);

    return (
        <div className="w-screen h-screen flex flex-col bg-neutral-950 text-white">
            <div className="flex items-center gap-3 p-3 border-b border-white/10 text-sm">
                <label className="flex items-center gap-2">
                    Mode:
                    <select
                        className="bg-neutral-800 px-2 py-1 rounded"
                        value={mode}
                        onChange={(e) =>
                            setMode(e.target.value as MeldBoardMode)
                        }
                    >
                        <option value="spacious">spacious</option>
                        <option value="comfortable">comfortable</option>
                        <option value="compact">compact</option>
                    </select>
                </label>
                <span className="text-white/50">
                    Click a meld to highlight (simulates layoff target). Active:{" "}
                    {activeId ?? "none"}
                </span>
                {activeId && (
                    <button
                        onClick={() => setActiveId(null)}
                        className="ml-2 px-2 py-1 rounded bg-white/10 text-xs"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-emerald-900/40">
                <MeldBoard
                    melds={MELDS}
                    players={PLAYERS}
                    heroPlayerId="p1"
                    mode={mode}
                    activeMeldId={activeId}
                    onSelectMeld={(id) =>
                        setActiveId((cur) => (cur === id ? null : id))
                    }
                />
            </div>
        </div>
    );
}
