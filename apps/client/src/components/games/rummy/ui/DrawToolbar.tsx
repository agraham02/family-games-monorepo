"use client";

import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface DrawToolbarProps {
    /** Pre-staged take-discard pickIndex (enables Take Discard btn). */
    stagedDiscardPickIndex: number | null;
    disabled?: boolean;
    onDrawStock: () => void;
    onTakeDiscard: () => void;
    /** Skip the draw entirely (only valid when stock is empty). */
    onPassDraw?: () => void;
    /** Compact viewport: render smaller buttons. */
    compact?: boolean;
    /** When true, the primary action passes the draw instead of drawing. */
    stockEmpty?: boolean;
}

/**
 * Toolbar rendered in the DRAW scene. Two actions:
 *
 *  - Draw stock (always enabled when stock > 0). When the stock is empty
 *    the button instead dispatches PASS_DRAW (house rule: no forced
 *    discard pickup just because the deck ran out).
 *  - Take discard (enabled only after tapping a card in the pile to stage
 *    a pickIndex; commit requires a target meld via onTakeDiscard)
 */
export default function DrawToolbar({
    stagedDiscardPickIndex,
    disabled = false,
    onDrawStock,
    onTakeDiscard,
    onPassDraw,
    compact = false,
    stockEmpty = false,
}: DrawToolbarProps) {
    const btnCls = compact ? "h-7 px-2 text-xs" : "";
    return (
        <motion.div
            className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
        >
            <Button
                size="sm"
                onClick={stockEmpty ? onPassDraw : onDrawStock}
                disabled={disabled || (stockEmpty && !onPassDraw)}
                className={btnCls}
                variant={stockEmpty ? "outline" : "default"}
            >
                {stockEmpty ? "Pass draw" : "Draw stock"}
            </Button>
            <Button
                size="sm"
                variant="secondary"
                disabled={disabled || stagedDiscardPickIndex == null}
                onClick={onTakeDiscard}
                className={btnCls}
            >
                Take discard
                {stagedDiscardPickIndex != null && (
                    <Badge className="ml-2 text-[10px] bg-amber-500 text-black">
                        idx {stagedDiscardPickIndex}
                    </Badge>
                )}
            </Button>
        </motion.div>
    );
}
