/**
 * Accessibility Utilities for Game Components
 *
 * Provides:
 * - Screen reader live announcements
 * - Focus management utilities
 * - Keyboard navigation helpers
 * - ARIA attribute generators
 */

// ============================================================================
// Constants
// ============================================================================

/** Selector for focusable elements (DRY - used in multiple places) */
const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ============================================================================
// Screen Reader Announcements
// ============================================================================

type AriaLivePolite = "polite" | "assertive" | "off";

/** Container ID for consistent DOM queries */
const ANNOUNCEMENT_CONTAINER_ID = "sr-announcements";

/** Track pending timeouts per container to allow cleanup */
const pendingTimeouts = new Map<
    HTMLDivElement,
    ReturnType<typeof setTimeout>
>();

/**
 * Get or create the screen reader announcement container.
 * Uses DOM query to avoid stale module-level references.
 */
function getOrCreateAnnouncementContainer(): HTMLDivElement {
    if (typeof document === "undefined") {
        throw new Error("announceToScreenReader can only be used in browser");
    }

    // Check for existing container first (handles HMR and concurrent React)
    let container = document.getElementById(
        ANNOUNCEMENT_CONTAINER_ID,
    ) as HTMLDivElement | null;

    if (!container) {
        container = document.createElement("div");
        container.id = ANNOUNCEMENT_CONTAINER_ID;
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");
        container.setAttribute("role", "status");
        container.className = "sr-only";
        // Visually hidden but accessible to screen readers
        Object.assign(container.style, {
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: "0",
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: "0",
        });
        document.body.appendChild(container);
    }

    return container;
}

/**
 * Announce a message to screen readers.
 *
 * @param message - The message to announce
 * @param priority - "polite" waits for user idle, "assertive" interrupts
 * @param clearDelay - Time in ms before clearing the message (default: 1000)
 *
 * @example
 * ```ts
 * // Announce turn change
 * announceToScreenReader("It's now Player 2's turn");
 *
 * // Urgent announcement
 * announceToScreenReader("Time is running out!", "assertive");
 * ```
 */
export function announceToScreenReader(
    message: string,
    priority: AriaLivePolite = "polite",
    clearDelay: number = 1000,
): void {
    if (typeof document === "undefined") return;

    const container = getOrCreateAnnouncementContainer();

    // Cancel any pending clear timeout for this container
    const existingTimeout = pendingTimeouts.get(container);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
        pendingTimeouts.delete(container);
    }

    // Update aria-live based on priority
    container.setAttribute("aria-live", priority);

    // Clear and set message (force re-announcement)
    // Use queueMicrotask for simpler async without RAF overhead
    container.textContent = "";
    queueMicrotask(() => {
        // Guard against container being removed during microtask
        if (!container.isConnected) return;

        container.textContent = message;

        // Clear message after delay to allow multiple announcements
        const timeoutId = setTimeout(() => {
            if (container.isConnected) {
                container.textContent = "";
            }
            pendingTimeouts.delete(container);
        }, clearDelay);

        pendingTimeouts.set(container, timeoutId);
    });
}

/**
 * Cleanup the announcement container (call on unmount if needed).
 * Also cancels any pending announcement timeouts.
 */
export function cleanupAnnouncements(): void {
    if (typeof document === "undefined") return;

    const container = document.getElementById(
        ANNOUNCEMENT_CONTAINER_ID,
    ) as HTMLDivElement | null;

    if (container) {
        const existingTimeout = pendingTimeouts.get(container);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            pendingTimeouts.delete(container);
        }
        container.remove();
    }
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Move focus to the next/previous focusable element within a container.
 *
 * @param container - The container element
 * @param direction - "next" or "previous"
 * @param wrap - Whether to wrap around at boundaries (default: true)
 */
export function moveFocusWithinContainer(
    container: HTMLElement,
    direction: "next" | "previous",
    wrap: boolean = true,
): void {
    const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );

    if (focusables.length === 0) return;

    const currentIndex = focusables.findIndex(
        (el) => el === document.activeElement,
    );

    let nextIndex: number;

    if (direction === "next") {
        nextIndex = currentIndex + 1;
        if (nextIndex >= focusables.length) {
            nextIndex = wrap ? 0 : focusables.length - 1;
        }
    } else {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
            nextIndex = wrap ? focusables.length - 1 : 0;
        }
    }

    focusables[nextIndex]?.focus();
}

/**
 * Trap focus within a container (for modals/dialogs).
 * Dynamically queries focusables on each Tab to handle DOM changes.
 *
 * @param container - The container element
 * @returns Cleanup function to remove the trap
 */
export function trapFocus(container: HTMLElement): () => void {
    /** Get current focusable elements (dynamic to handle DOM changes) */
    const getFocusables = () =>
        Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        // Query focusables dynamically to handle DOM changes
        const focusables = getFocusables();
        if (focusables.length === 0) return;

        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        if (e.shiftKey) {
            // Shift + Tab: if on first element, go to last
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable?.focus();
            }
        } else {
            // Tab: if on last element, go to first
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable?.focus();
            }
        }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Focus first element
    const initialFocusables = getFocusables();
    initialFocusables[0]?.focus();

    return () => {
        container.removeEventListener("keydown", handleKeyDown);
    };
}

/**
 * Save and restore focus (for when overlays open/close).
 */
export function createFocusGuard(): {
    save: () => void;
    restore: () => void;
} {
    let savedElement: Element | null = null;

    return {
        save: () => {
            savedElement = document.activeElement;
        },
        restore: () => {
            if (savedElement instanceof HTMLElement) {
                savedElement.focus();
            }
        },
    };
}

// ============================================================================
// ARIA Attribute Generators
// ============================================================================

/**
 * Generate ARIA attributes for a player slot in a game.
 * Returns only defined values to avoid spreading undefined into JSX.
 */
export function getPlayerSlotAriaProps(options: {
    playerName: string;
    isCurrentTurn: boolean;
    isLocalPlayer: boolean;
    position?: string;
    chips?: number;
    score?: number;
}): Record<string, string> {
    const { playerName, isCurrentTurn, isLocalPlayer, position, chips, score } =
        options;

    const parts: string[] = [playerName];

    if (isLocalPlayer) {
        parts.push("(You)");
    }

    if (isCurrentTurn) {
        parts.push("- Current turn");
    }

    if (position) {
        parts.push(`- ${position}`);
    }

    if (chips !== undefined) {
        parts.push(`- ${chips} chips`);
    }

    if (score !== undefined) {
        parts.push(`- Score: ${score}`);
    }

    // Build props object, only including defined values
    const props: Record<string, string> = {
        "aria-label": parts.join(" "),
        role: "listitem",
    };

    if (isCurrentTurn) {
        props["aria-current"] = "true";
    }

    return props;
}

/**
 * Generate ARIA attributes for a game tile/card.
 * Returns only defined values to avoid spreading undefined into JSX.
 */
export function getTileAriaProps(options: {
    tileDescription: string;
    isSelected: boolean;
    isPlayable: boolean;
    index?: number;
    total?: number;
}): Record<string, string> {
    const { tileDescription, isSelected, isPlayable, index, total } = options;

    const parts: string[] = [tileDescription];

    if (isSelected) {
        parts.push("- Selected");
    }

    if (!isPlayable) {
        parts.push("- Cannot be played");
    }

    const props: Record<string, string> = {
        "aria-label": parts.join(" "),
        "aria-selected": isSelected ? "true" : "false",
        role: "option",
    };

    if (!isPlayable) {
        props["aria-disabled"] = "true";
    }

    if (index !== undefined && total !== undefined) {
        props["aria-posinset"] = String(index + 1);
        props["aria-setsize"] = String(total);
    }

    return props;
}

/**
 * Generate ARIA attributes for the game board.
 */
export function getBoardAriaProps(options: {
    gameType: string;
    tileCount: number;
    leftEnd?: number;
    rightEnd?: number;
}): Record<string, string> {
    const { gameType, tileCount, leftEnd, rightEnd } = options;

    let description = `${gameType} board with ${tileCount} tiles`;

    if (leftEnd !== undefined && rightEnd !== undefined) {
        description += `. Left end: ${leftEnd}, Right end: ${rightEnd}`;
    }

    return {
        role: "region",
        "aria-label": description,
        "aria-live": "polite",
    };
}

// ============================================================================
// Game-Specific Announcements
// ============================================================================

/**
 * Pre-built announcement messages for common game events.
 * All functions use arrow syntax for consistency.
 */
export const gameAnnouncements = {
    // General
    turnChange: (playerName: string, isYourTurn: boolean): string =>
        isYourTurn ? "It's your turn" : `It's ${playerName}'s turn`,

    gameOver: (winnerName: string): string => `Game over! ${winnerName} wins!`,

    roundComplete: (roundNumber: number, winnerName?: string): string =>
        winnerName
            ? `Round ${roundNumber} complete. ${winnerName} wins the round`
            : `Round ${roundNumber} complete`,

    timerWarning: (secondsLeft: number): string =>
        `${secondsLeft} seconds remaining`,

    cannotPlay: (reason: string): string => `Cannot play: ${reason}`,

    // Dominoes
    tilePlaced: (
        playerName: string,
        tileDescription: string,
        side: string,
    ): string => `${playerName} placed ${tileDescription} on the ${side}`,

    playerPassed: (playerName: string): string => `${playerName} passed`,

    mustPass: (): string => "No playable tiles. You must pass",

    // LRC
    diceRolled: (playerName: string, results: string[]): string =>
        `${playerName} rolled: ${results.join(", ")}`,

    chipsTransferred: (
        from: string,
        to: string,
        count: number,
        direction: string,
    ): string =>
        `${count} chip${count > 1 ? "s" : ""} moved from ${from} to ${to} (${direction})`,

    // Spades
    cardPlayed: (playerName: string, cardDescription: string): string =>
        `${playerName} played ${cardDescription}`,

    trickWon: (playerName: string, trickNumber: number): string =>
        `${playerName} won trick ${trickNumber}`,

    bidPlaced: (
        playerName: string,
        bidAmount: number,
        bidType?: string,
    ): string =>
        bidType === "blind-nil"
            ? `${playerName} bid Blind Nil`
            : bidType === "blind"
              ? `${playerName} placed a blind bid of ${bidAmount}`
              : bidType === "nil"
                ? `${playerName} bid Nil`
                : `${playerName} bid ${bidAmount}`,

    spadesRoundStart: (roundNumber: number): string =>
        `Round ${roundNumber} starting. Cards are being dealt.`,

    spadesRoundSummary: (
        roundNumber: number,
        team1Score: number,
        team2Score: number,
    ): string =>
        `Round ${roundNumber} complete. Team 1: ${team1Score} points. Team 2: ${team2Score} points.`,

    biddingPhaseStart: (): string => "Bidding phase started. Place your bid.",

    playingPhaseStart: (leadPlayerName: string): string =>
        `Playing phase started. ${leadPlayerName} leads.`,

    spadesBroken: (): string => "Spades have been broken!",

    dealingCards: (cardCount: number): string =>
        `Dealing ${cardCount} cards to each player.`,
};
