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
}

/**
 * Toolbar rendered in the DRAW scene. Two actions:
 *
 *  - Draw stock (always enabled when stock > 0)
 *  - Take discard (enabled only after tapping a card in the pile to stage
 *    a pickIndex; commit requires a target meld via onTakeDiscard)
 */
export default function DrawToolbar({
    stagedDiscardPickIndex,
    disabled = false,
    onDrawStock,
    onTakeDiscard,
}: DrawToolbarProps) {
    return (
        <motion.div
            className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
        >
            <Button size="sm" onClick={onDrawStock} disabled={disabled}>
                Draw stock
            </Button>
            <Button
                size="sm"
                variant="secondary"
                disabled={disabled || stagedDiscardPickIndex == null}
                onClick={onTakeDiscard}
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
