"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "motion/react";
import { PlayingCard as PlayingCardType } from "@shared/types";

const SUIT_MAP = {
    Spades: "♠",
    Hearts: "♥",
    Diamonds: "♦",
    Clubs: "♣",
};

const SUIT_COLORS = {
    Spades: "text-slate-900",
    Hearts: "text-red-500",
    Diamonds: "text-red-500",
    Clubs: "text-slate-900",
};

// Joker display names
const JOKER_DISPLAY: Record<string, string> = {
    LJ: "Little Joker",
    BJ: "Big Joker",
};

// Check if a card is a joker
function isJoker(rank: string): boolean {
    return rank === "LJ" || rank === "BJ";
}

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
    xs: { width: 40, height: 56 },
    sm: { width: 52, height: 73 },
    md: { width: 70, height: 98 },
    lg: { width: 90, height: 126 },
    xl: { width: 110, height: 154 },
};

const TEXT_SIZES: Record<CardSize, { corner: string; center: string; cornerGap: string }> = {
    xs: { corner: "text-[8px]", center: "text-lg", cornerGap: "gap-0" },
    sm: { corner: "text-[10px]", center: "text-xl", cornerGap: "gap-0" },
    md: { corner: "text-xs", center: "text-2xl", cornerGap: "gap-0.5" },
    lg: { corner: "text-sm", center: "text-3xl", cornerGap: "gap-0.5" },
    xl: { corner: "text-base", center: "text-4xl", cornerGap: "gap-1" },
};

interface PlayingCardProps {
    card: PlayingCardType | null;
    hidden?: boolean;
    size?: CardSize;
    selected?: boolean;
    disabled?: boolean;
    highlighted?: boolean;
    interactive?: boolean;
    rotation?: number;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    layoutId?: string;
}

function PlayingCard({
    card,
    hidden = false,
    size = "md",
    selected = false,
    disabled = false,
    highlighted = false,
    interactive = false,
    rotation = 0,
    className,
    style,
    onClick,
    layoutId,
}: PlayingCardProps) {
    const showBack = card === null || hidden;
    const dimensions = SIZE_DIMENSIONS[size];
    const textSize = TEXT_SIZES[size];

    const cardContent = (
        <motion.div
            layoutId={layoutId}
            className={cn(
                "relative rounded-lg shadow-lg bg-white border border-gray-200 overflow-hidden select-none touch-manipulation",
                interactive && !disabled && "cursor-pointer",
                selected && "ring-2 ring-blue-500 ring-offset-2",
                highlighted && "ring-2 ring-yellow-400",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            style={{
                width: dimensions.width,
                height: dimensions.height,
                rotate: `${rotation}deg`,
                ...style,
            }}
            whileHover={
                interactive && !disabled
                    ? { y: -8, scale: 1.02, transition: { duration: 0.15 } }
                    : undefined
            }
            whileTap={interactive && !disabled ? { scale: 0.98 } : undefined}
            onClick={interactive && !disabled ? onClick : undefined}
            role={interactive ? "button" : "img"}
            aria-label={
                showBack
                    ? "Hidden card"
                    : card
                      ? `${card.rank} of ${card.suit}`
                      : "Hidden card"
            }
            tabIndex={interactive && !disabled ? 0 : undefined}
        >
            {/* Card Face */}
            {!showBack && card && (
                <div className="absolute inset-0">
                    {isJoker(card.rank) ? (
                        /* Joker card - special full-card design */
                        <div className="h-full flex flex-col items-center justify-center gap-1 p-1">
                            <div
                                className={cn(
                                    "text-4xl font-bold",
                                    card.rank === "BJ"
                                        ? "bg-linear-to-br from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent"
                                        : "bg-linear-to-br from-gray-300 via-slate-400 to-gray-500 bg-clip-text text-transparent"
                                )}
                            >
                                🃏
                            </div>
                            <div
                                className={cn(
                                    textSize.corner,
                                    "font-bold text-center",
                                    card.rank === "BJ"
                                        ? "text-amber-600"
                                        : "text-slate-600"
                                )}
                            >
                                {JOKER_DISPLAY[card.rank]}
                            </div>
                        </div>
                    ) : (
                        /* Standard card layout - corners positioned like real playing cards */
                        <>
                            {/* Top-left corner */}
                            <div
                                className={cn(
                                    "absolute top-0.5 left-0.5",
                                    textSize.corner,
                                    textSize.cornerGap,
                                    "font-bold leading-none flex flex-col items-center",
                                    SUIT_COLORS[card.suit]
                                )}
                            >
                                <span>{card.rank}</span>
                                <span>{SUIT_MAP[card.suit]}</span>
                            </div>

                            {/* Center suit - larger decorative suit symbol */}
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center",
                                    textSize.center,
                                    SUIT_COLORS[card.suit]
                                )}
                            >
                                {SUIT_MAP[card.suit]}
                            </div>

                            {/* Bottom-right corner (rotated 180°) */}
                            <div
                                className={cn(
                                    "absolute bottom-0.5 right-0.5 rotate-180",
                                    textSize.corner,
                                    textSize.cornerGap,
                                    "font-bold leading-none flex flex-col items-center",
                                    SUIT_COLORS[card.suit]
                                )}
                            >
                                <span>{card.rank}</span>
                                <span>{SUIT_MAP[card.suit]}</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Card Back */}
            {showBack && (
                <div className="absolute inset-0">
                    <Image
                        src="/images/card-back.png"
                        alt="Card Back"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}

            {/* Selection glow effect */}
            {selected && (
                <motion.div
                    className="absolute inset-0 bg-blue-500/10 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
            )}
        </motion.div>
    );

    return cardContent;
}

export default PlayingCard;
