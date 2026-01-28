/**
 * useKeyboardNavigation - Hook for keyboard navigation in games
 *
 * Provides keyboard shortcuts for common game actions like tile selection,
 * confirmation, and cancellation.
 */

import { useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KeyboardNavigationConfig<T> {
    /** Array of items that can be navigated */
    items: T[];
    /** Currently selected item index (-1 for none) */
    selectedIndex: number;
    /** Callback when selection changes */
    onSelect: (index: number) => void;
    /** Callback when item is confirmed (Enter/Space) */
    onConfirm?: (index: number) => void;
    /** Callback when selection is cancelled (Escape) */
    onCancel?: () => void;
    /** Whether navigation is enabled */
    enabled?: boolean;
    /** Orientation of items (affects arrow key behavior) */
    orientation?: "horizontal" | "vertical";
    /** Whether to wrap around at ends */
    wrap?: boolean;
    /** Custom key handlers */
    customKeys?: Record<string, () => void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for keyboard navigation through a list of items
 *
 * @example
 * ```tsx
 * useKeyboardNavigation({
 *   items: tiles,
 *   selectedIndex: selectedTileIndex,
 *   onSelect: setSelectedTileIndex,
 *   onConfirm: handlePlayTile,
 *   onCancel: () => setSelectedTileIndex(-1),
 * });
 * ```
 */
export function useKeyboardNavigation<T>({
    items,
    selectedIndex,
    onSelect,
    onConfirm,
    onCancel,
    enabled = true,
    orientation = "horizontal",
    wrap = true,
    customKeys = {},
}: KeyboardNavigationConfig<T>): void {
    const itemsLengthRef = useRef(items.length);
    itemsLengthRef.current = items.length;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled || itemsLengthRef.current === 0) return;

            // Check for custom key handlers first
            if (customKeys[event.key]) {
                event.preventDefault();
                customKeys[event.key]();
                return;
            }

            switch (event.key) {
                case "ArrowLeft":
                case "ArrowUp": {
                    event.preventDefault();
                    const prevKey =
                        orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
                    if (event.key !== prevKey) return;

                    let nextIndex = selectedIndex - 1;
                    if (nextIndex < 0) {
                        nextIndex = wrap ? itemsLengthRef.current - 1 : 0;
                    }
                    onSelect(nextIndex);
                    break;
                }

                case "ArrowRight":
                case "ArrowDown": {
                    event.preventDefault();
                    const nextKey =
                        orientation === "horizontal"
                            ? "ArrowRight"
                            : "ArrowDown";
                    if (event.key !== nextKey) return;

                    let nextIndex = selectedIndex + 1;
                    if (nextIndex >= itemsLengthRef.current) {
                        nextIndex = wrap ? 0 : itemsLengthRef.current - 1;
                    }
                    onSelect(nextIndex);
                    break;
                }

                case "Enter":
                case " ": // Space
                    event.preventDefault();
                    if (selectedIndex >= 0 && onConfirm) {
                        onConfirm(selectedIndex);
                    }
                    break;

                case "Escape":
                    event.preventDefault();
                    onCancel?.();
                    break;

                case "Home":
                    event.preventDefault();
                    onSelect(0);
                    break;

                case "End":
                    event.preventDefault();
                    onSelect(itemsLengthRef.current - 1);
                    break;

                default:
                    // Number keys 1-9 for quick selection
                    if (/^[1-9]$/.test(event.key)) {
                        const index = parseInt(event.key, 10) - 1;
                        if (index < itemsLengthRef.current) {
                            event.preventDefault();
                            onSelect(index);
                        }
                    }
                    break;
            }
        },
        [
            enabled,
            selectedIndex,
            onSelect,
            onConfirm,
            onCancel,
            orientation,
            wrap,
            customKeys,
        ],
    );

    useEffect(() => {
        if (enabled) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [enabled, handleKeyDown]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Game-Specific Keyboard Shortcuts Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface GameKeyboardConfig {
    /** Whether keyboard controls are enabled */
    enabled?: boolean;
    /** Callback for pass action (Dominoes) */
    onPass?: () => void;
    /** Callback for roll action (LRC) */
    onRoll?: () => void;
    /** Callback for confirm action */
    onConfirm?: () => void;
    /** Callback for cancel action */
    onCancel?: () => void;
    /** Callback for place left (Dominoes) */
    onPlaceLeft?: () => void;
    /** Callback for place right (Dominoes) */
    onPlaceRight?: () => void;
    /** Callback for showing help/hints */
    onShowHelp?: () => void;
}

/**
 * Hook for game-specific keyboard shortcuts
 */
export function useGameKeyboard({
    enabled = true,
    onPass,
    onRoll,
    onConfirm,
    onCancel,
    onPlaceLeft,
    onPlaceRight,
    onShowHelp,
}: GameKeyboardConfig): void {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't handle if user is typing in an input
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case "p":
                    if (onPass) {
                        event.preventDefault();
                        onPass();
                    }
                    break;

                case "r":
                    if (onRoll) {
                        event.preventDefault();
                        onRoll();
                    }
                    break;

                case "enter":
                case " ":
                    if (onConfirm) {
                        event.preventDefault();
                        onConfirm();
                    }
                    break;

                case "escape":
                    if (onCancel) {
                        event.preventDefault();
                        onCancel();
                    }
                    break;

                case "l":
                case "arrowleft":
                    if (onPlaceLeft) {
                        event.preventDefault();
                        onPlaceLeft();
                    }
                    break;

                case "r":
                case "arrowright":
                    if (onPlaceRight) {
                        event.preventDefault();
                        onPlaceRight();
                    }
                    break;

                case "?":
                case "h":
                    if (onShowHelp) {
                        event.preventDefault();
                        onShowHelp();
                    }
                    break;
            }
        },
        [
            enabled,
            onPass,
            onRoll,
            onConfirm,
            onCancel,
            onPlaceLeft,
            onPlaceRight,
            onShowHelp,
        ],
    );

    useEffect(() => {
        if (enabled) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [enabled, handleKeyDown]);
}

export default useKeyboardNavigation;
