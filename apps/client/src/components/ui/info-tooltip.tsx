// src/components/ui/info-tooltip.tsx
"use client";

/**
 * InfoTooltip - A touch-friendly tooltip component for info icons.
 *
 * Uses Popover on mobile (click to show) and Tooltip on desktop (hover).
 * This solves the issue where hover tooltips don't work on touch devices.
 */

import * as React from "react";
import { InfoIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
    /** The content to display in the tooltip */
    content: React.ReactNode;
    /** Additional class names for the trigger button */
    triggerClassName?: string;
    /** Additional class names for the content */
    contentClassName?: string;
    /** Side to show the popover (default: top) */
    side?: "top" | "bottom" | "left" | "right";
}

/**
 * InfoTooltip renders an info icon that shows a popover on click/tap.
 * Works reliably on both mobile (touch) and desktop (mouse).
 */
export function InfoTooltip({
    content,
    triggerClassName,
    contentClassName,
    side = "top",
}: InfoTooltipProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full p-0.5",
                        triggerClassName,
                    )}
                    aria-label="More information"
                >
                    <InfoIcon className="w-3.5 h-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={side}
                className={cn("max-w-[200px] text-xs p-2", contentClassName)}
            >
                {content}
            </PopoverContent>
        </Popover>
    );
}
