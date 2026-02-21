"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "motion/react";
import { PlayingCard as PlayingCardType } from "@shared/types";
import { usePrefersReducedMotion } from "@/hooks";
import { CardFace } from "./CardFace";

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
    xs: { width: 40, height: 56 },
    sm: { width: 52, height: 73 },
    md: { width: 70, height: 98 },
    lg: { width: 90, height: 126 },
    xl: { width: 110, height: 154 },
};

const TEXT_SIZES: Record<
    CardSize,
    { corner: string; center: string; cornerGap: string }
> = {
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
    const prefersReducedMotion = usePrefersReducedMotion();
    const showBack = card === null || hidden;
    const dimensions = SIZE_DIMENSIONS[size];
    const textSize = TEXT_SIZES[size];

    // Animation props that respect reduced motion
    const hoverAnimation =
        interactive && !disabled && !prefersReducedMotion
            ? { y: -8, scale: 1.02, transition: { duration: 0.15 } }
            : undefined;

    const tapAnimation =
        interactive && !disabled && !prefersReducedMotion
            ? { scale: 0.98 }
            : undefined;

    const cardContent = (
        <motion.div
            layoutId={layoutId}
            layout={!prefersReducedMotion}
            className={cn(
                "relative rounded-lg shadow-lg bg-linear-to-br from-white to-gray-50 border border-gray-200 overflow-hidden select-none touch-manipulation",
                interactive && !disabled && "cursor-pointer",
                selected && "ring-2 ring-blue-500 ring-offset-2",
                highlighted && "ring-2 ring-yellow-400",
                disabled && "opacity-50 cursor-not-allowed",
                interactive &&
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                prefersReducedMotion && "transition-none",
                className,
            )}
            style={{
                width: dimensions.width,
                height: dimensions.height,
                rotate: `${rotation}deg`,
                ...style,
            }}
            whileHover={hoverAnimation}
            whileTap={tapAnimation}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
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
                <CardFace
                    card={card}
                    cornerTextSizeClass={cn(
                        textSize.corner,
                        textSize.cornerGap,
                    )}
                    centerTextSizeClass={textSize.center}
                />
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
