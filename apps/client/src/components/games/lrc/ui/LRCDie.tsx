"use client";

import React from "react";
import { LRCDiceFace } from "@shared/types";
import { cn } from "@/lib/utils";

interface LRCDieProps {
    face: LRCDiceFace;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const SIZE_CLASSES = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
};

const FACE_CONFIG: Record<
    LRCDiceFace,
    { label: string; bgClass: string; textClass: string; symbol: string }
> = {
    L: {
        label: "Left",
        bgClass: "bg-blue-500 dark:bg-blue-600",
        textClass: "text-white",
        symbol: "L",
    },
    R: {
        label: "Right",
        bgClass: "bg-orange-500 dark:bg-orange-600",
        textClass: "text-white",
        symbol: "R",
    },
    C: {
        label: "Center",
        bgClass: "bg-red-500 dark:bg-red-600",
        textClass: "text-white",
        symbol: "C",
    },
    dot: {
        label: "Keep",
        bgClass: "bg-zinc-200 dark:bg-zinc-700",
        textClass: "text-zinc-600 dark:text-zinc-300",
        symbol: "•",
    },
};

export default function LRCDie({ face, size = "md", className }: LRCDieProps) {
    const config = FACE_CONFIG[face];
    return (
        <div
            title={config.label}
            className={cn(
                "flex items-center justify-center rounded-xl font-bold shadow-md select-none",
                SIZE_CLASSES[size],
                config.bgClass,
                config.textClass,
                className
            )}
        >
            {config.symbol}
        </div>
    );
}
