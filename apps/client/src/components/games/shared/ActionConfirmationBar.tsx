"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ActionConfirmationBarProps {
    /** Whether the bar is visible */
    isVisible: boolean;
    /** Handler for confirm action */
    onConfirm: () => void;
    /** Handler for cancel action */
    onCancel: () => void;
    /** Label for the confirm button (e.g., "Play Card", "Place Tile") */
    confirmLabel?: string;
    /** Label for the cancel button */
    cancelLabel?: string;
    /** Whether the confirm button is disabled */
    disabled?: boolean;
    /** Additional class name for the container */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionConfirmationBar Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActionConfirmationBar - A floating confirmation bar for game actions.
 *
 * Used when a player selects a card/tile and needs to confirm the action.
 * Displays at the bottom of the screen with confirm and cancel buttons.
 *
 * @example
 * ```tsx
 * <ActionConfirmationBar
 *     isVisible={selectedCardIndex !== null && isMyTurn}
 *     onConfirm={handlePlayCard}
 *     onCancel={handleCancelSelection}
 *     confirmLabel="Play Card"
 * />
 * ```
 */
function ActionConfirmationBar({
    isVisible,
    onConfirm,
    onCancel,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    disabled = false,
    className,
}: ActionConfirmationBarProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={cn(
                        "fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 md:gap-3",
                        className
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                >
                    <Button
                        onClick={onConfirm}
                        disabled={disabled}
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-lg text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 h-auto"
                    >
                        {confirmLabel}
                    </Button>
                    <Button
                        onClick={onCancel}
                        variant="secondary"
                        className="shadow-lg text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 h-auto"
                    >
                        {cancelLabel}
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ActionConfirmationBar;
