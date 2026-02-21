import React from "react";
import { cn } from "@/lib/utils";
import { PlayingCard as PlayingCardType } from "@shared/types";

const SUIT_MAP = {
    Spades: "♠",
    Hearts: "♥",
    Diamonds: "♦",
    Clubs: "♣",
};

const SUIT_COLORS = {
    Spades: "text-slate-900",
    Hearts: "text-red-600",
    Diamonds: "text-red-600",
    Clubs: "text-slate-900",
};

function isJoker(rank: string): boolean {
    return rank === "LJ" || rank === "BJ";
}

interface CardFaceProps {
    card: PlayingCardType;
    cornerTextSizeClass?: string;
    centerTextSizeClass?: string;
}

export function CardFace({ card, cornerTextSizeClass = "text-xs", centerTextSizeClass = "text-2xl" }: CardFaceProps) {
    if (isJoker(card.rank)) {
        const isBig = card.rank === "BJ";
        return (
            <div className="absolute inset-0">
                {/* Top-left corner */}
                <div
                    className={cn(
                        "absolute top-1.5 left-1.5",
                        cornerTextSizeClass,
                        "font-bold leading-none flex flex-col items-center",
                        isBig ? "text-amber-600" : "text-slate-600"
                    )}
                >
                    <span>★</span>
                </div>

                {/* Center graphic */}
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center",
                        isBig
                            ? "bg-linear-to-br from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-sm"
                            : "bg-linear-to-br from-gray-400 via-slate-500 to-gray-600 bg-clip-text text-transparent drop-shadow-sm"
                    )}
                >
                    <span className="text-4xl">★</span>
                    <span className="text-[10px] font-bold tracking-widest mt-1">JOKER</span>
                </div>

                {/* Bottom-right corner (rotated) */}
                <div
                    className={cn(
                        "absolute bottom-1.5 right-1.5 rotate-180",
                        cornerTextSizeClass,
                        "font-bold leading-none flex flex-col items-center",
                        isBig ? "text-amber-600" : "text-slate-600"
                    )}
                >
                    <span>★</span>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0">
            {/* Top-left corner */}
            <div
                className={cn(
                    "absolute top-1.5 left-1.5",
                    cornerTextSizeClass,
                    "font-bold leading-none flex flex-col items-center",
                    SUIT_COLORS[card.suit]
                )}
            >
                <span>{card.rank}</span>
                <span>{SUIT_MAP[card.suit]}</span>
            </div>

            {/* Center suit */}
            <div
                className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    centerTextSizeClass,
                    SUIT_COLORS[card.suit]
                )}
            >
                {SUIT_MAP[card.suit]}
            </div>

            {/* Bottom-right corner (rotated) */}
            <div
                className={cn(
                    "absolute bottom-1.5 right-1.5 rotate-180",
                    cornerTextSizeClass,
                    "font-bold leading-none flex flex-col items-center",
                    SUIT_COLORS[card.suit]
                )}
            >
                <span>{card.rank}</span>
                <span>{SUIT_MAP[card.suit]}</span>
            </div>
        </div>
    );
}
