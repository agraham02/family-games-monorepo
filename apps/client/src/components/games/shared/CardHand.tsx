"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { PlayingCard as PlayingCardType } from "@shared/types";
import { useGameTable } from "./GameTable";
import { useEdgeRegion } from "./EdgeRegion";
import { CardSize } from "./PlayingCard";
import { CardFace } from "./CardFace";
import CardBadge from "./CardBadge";
import { usePrefersReducedMotion, useKeyboardNavigation } from "@/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FanOrientation = "horizontal" | "vertical";

interface CardHandProps {
    /** Cards to display (for local player) */
    cards: PlayingCardType[];
    /** Number of cards (for opponents showing backs) */
    cardCount?: number;
    /** Whether this is the local player's hand */
    isLocalPlayer?: boolean;
    /** Orientation of the fan */
    orientation?: FanOrientation;
    /** Card size */
    size?: CardSize;
    /** Is this hand interactive? */
    interactive?: boolean;
    /** Currently selected card index (single-select). */
    selectedIndex?: number | null;
    /**
     * Indices of multiple selected cards. Use for multi-select flows like
     * meld composition. Cards at these indices get the same lifted /
     * highlighted treatment as `selectedIndex` would.
     */
    selectedIndices?: number[];
    /** Indices of disabled cards */
    disabledIndices?: number[];
    /**
     * Per-card visual annotations (rings, badges, pulse). Keyed by the
     * **same index space** that `cards` uses — i.e. display index, not any
     * underlying server hand index. The renderer only consumes these
     * non-interactively; they never affect click handling.
     */
    cardAnnotations?: Record<
        number,
        {
            /** Tailwind ring color class (e.g. `ring-amber-400`). */
            ringClass?: string;
            /** Tailwind ring style class (e.g. `ring-2`). */
            ringStyleClass?: string;
            /** Apply Tailwind `animate-pulse` to the card. */
            pulse?: boolean;
            /** Optional small badge label. */
            badge?: string;
            /** Optional Tailwind background class for the badge. */
            badgeColorClass?: string;
        }
    >;
    /** Callback when a card is clicked */
    onCardClick?: (index: number, card: PlayingCardType) => void;
    /** Player ID for layoutId animations */
    playerId?: string;
    /** Additional class names */
    className?: string;
    /** Whether cards are being dealt */
    isDealing?: boolean;
    /** Rotation in degrees (overrides EdgeRegion context) */
    rotation?: number;
    /** Enable tap-to-spread on cramped screens (auto-enabled on compact layout) */
    enableTapToSpread?: boolean;
    /**
     * How the hand reacts when the user wants to see overlapping cards.
     *
     * - `"hover-zoom"`: Mouse hover (or touch press-and-drag) expands a small
     *   "lens" of cards around the cursor while the rest stay packed. Mimics
     *   how UNO on PC handles big hands.
     * - `"tap-spread"`: A single tap spreads ALL cards (legacy behaviour used
     *   by the meld scene). Use when you want a deliberate spread gesture.
     * - `"off"`: No expansion behaviour.
     *
     * Default: `"hover-zoom"` for the local player, `"off"` for opponents.
     */
    expansionMode?: "hover-zoom" | "tap-spread" | "off";
    /**
     * Number of cards on each side of the hovered card that share the
     * expansion (the "lens" radius). Default 2 → 5-card lens.
     */
    expandRadius?: number;
    /** Duration in ms before auto-collapsing spread (default: 3000) */
    spreadAutoCollapseMs?: number;
    /** Controlled spread state (optional - for outside click handling) */
    isSpreadControlled?: boolean;
    /** Callback when spread state changes */
    onSpreadChange?: (isSpread: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card dimension constants
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
    xs: { width: 40, height: 56 },
    sm: { width: 52, height: 73 },
    md: { width: 70, height: 98 },
    lg: { width: 90, height: 126 },
    xl: { width: 110, height: 154 },
};

// Calculate card spacing based on count, size, and available width
function getCardSpacing(
    cardCount: number,
    size: CardSize,
    isHorizontal: boolean,
    availableWidth?: number,
): number {
    const cardWidth = isHorizontal
        ? SIZE_DIMENSIONS[size].width
        : SIZE_DIMENSIONS[size].height;

    // Base overlap: show about 30-40% of each card
    const baseOverlap = cardWidth * 0.35;

    // Reduce overlap as card count increases
    const overlapMultiplier = Math.max(0.5, 1 - (cardCount - 5) * 0.05);
    const baseSpacing = Math.max(15, baseOverlap * overlapMultiplier);

    // If available width is provided, calculate the minimum spacing needed to fit
    if (availableWidth && cardCount > 1) {
        // Total hand width = cardWidth + (cardCount - 1) * (cardWidth - spacing)
        // Solving for spacing when totalHandWidth = availableWidth:
        // spacing = cardWidth - (availableWidth - cardWidth) / (cardCount - 1)
        const minSpacingToFit =
            cardWidth - (availableWidth - cardWidth) / (cardCount - 1);

        // Use the larger of base spacing or the minimum needed to fit
        // But cap the overlap at 60% of card width (cards should still be recognizable)
        const maxAllowedSpacing = cardWidth * 0.6;
        return Math.min(
            maxAllowedSpacing,
            Math.max(baseSpacing, minSpacingToFit),
        );
    }

    return baseSpacing;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface CardInHandProps {
    card: PlayingCardType | null;
    index: number;
    isHidden: boolean;
    isSelected: boolean;
    isDisabled: boolean;
    isInteractive: boolean;
    isFocused: boolean;
    isHorizontal: boolean;
    size: CardSize;
    spacing: number;
    isHovered: boolean;
    playerId?: string;
    annotation?: {
        ringClass?: string;
        ringStyleClass?: string;
        pulse?: boolean;
        badge?: string;
        badgeColorClass?: string;
    };
    onClick?: () => void;
    onHoverChange?: (index: number | null) => void;
    /** Whether to release pointer capture on touch so pointerenter fires on neighbours. */
    enableTouchHoverDrag?: boolean;
    prefersReducedMotion: boolean;
}

function CardInHand({
    card,
    index,
    isHidden,
    isSelected,
    isDisabled,
    isInteractive,
    isFocused,
    isHorizontal,
    size,
    spacing,
    isHovered,
    playerId,
    annotation,
    onClick,
    onHoverChange,
    enableTouchHoverDrag,
    prefersReducedMotion,
}: CardInHandProps) {
    const dimensions = SIZE_DIMENSIONS[size];
    const showBack = card === null || isHidden;

    // Keep stable stacking order in fanned hands so selecting/lifting a card
    // does not cover neighboring cards in unnatural ways.
    const zIndex = index;

    // Selection lift - different direction for vertical vs horizontal
    const yOffset = isHorizontal ? (isSelected ? -20 : 0) : 0;
    const xOffset = isHorizontal ? 0 : isSelected ? -20 : 0;

    // Animation props that respect reduced motion
    const hoverAnimation =
        isInteractive && !isDisabled && !prefersReducedMotion
            ? {
                  y: isHorizontal ? yOffset - 15 : yOffset,
                  x: isHorizontal ? xOffset : xOffset - 15,
                  scale: 1.08,
                  transition: {
                      type: "spring" as const,
                      stiffness: 400,
                      damping: 20,
                  },
              }
            : undefined;

    const tapAnimation =
        isInteractive && !isDisabled && !prefersReducedMotion
            ? { scale: 0.95, transition: { duration: 0.1 } }
            : undefined;

    return (
        <motion.div
            layoutId={
                playerId
                    ? `${playerId}-card-${
                          card ? `${card.suit}-${card.rank}` : index
                      }`
                    : undefined
            }
            layout={!prefersReducedMotion}
            className="relative cursor-default"
            style={{
                // Use marginLeft for horizontal, marginTop for vertical
                marginLeft: isHorizontal ? (index === 0 ? 0 : -spacing) : 0,
                marginTop: isHorizontal ? 0 : index === 0 ? 0 : -spacing,
                zIndex,
            }}
            initial={
                prefersReducedMotion
                    ? false
                    : {
                          opacity: 0,
                          scale: 0.3,
                          y: isHorizontal ? -30 : 0,
                          x: 0,
                      }
            }
            animate={{
                opacity: 1,
                scale: 1,
                y: yOffset,
                x: xOffset,
            }}
            exit={
                prefersReducedMotion
                    ? { opacity: 0 }
                    : {
                          opacity: 0,
                          scale: 0.5,
                          y: isHorizontal ? -50 : 0,
                          x: isHorizontal ? 0 : -50,
                      }
            }
            transition={
                prefersReducedMotion
                    ? { duration: 0.1 }
                    : {
                          type: "spring" as const,
                          stiffness: 400,
                          damping: 25,
                      }
            }
            whileHover={hoverAnimation}
            whileTap={tapAnimation}
            onPointerEnter={
                onHoverChange ? () => onHoverChange(index) : undefined
            }
            onPointerDown={
                onHoverChange
                    ? (e) => {
                          // On touch, the browser implicitly captures the pointer
                          // to the original target so pointerenter on sibling cards
                          // never fires while dragging. Releasing the capture lets
                          // the lens follow the finger across cards.
                          if (
                              enableTouchHoverDrag &&
                              e.pointerType === "touch" &&
                              e.currentTarget.hasPointerCapture(e.pointerId)
                          ) {
                              e.currentTarget.releasePointerCapture(
                                  e.pointerId,
                              );
                          }
                          onHoverChange(index);
                      }
                    : undefined
            }
            onPointerLeave={
                onHoverChange
                    ? (e) => {
                          // Only mouse pointers should clear on leave — touch
                          // sliding through cards constantly enters/leaves and we
                          // want the lens to track the finger, not collapse.
                          if (e.pointerType === "mouse") {
                              onHoverChange(null);
                          }
                      }
                    : undefined
            }
            onClick={
                isInteractive && !isDisabled
                    ? (e) => {
                          e.stopPropagation();
                          onClick?.();
                      }
                    : undefined
            }
        >
            <div
                className={cn(
                    "relative rounded-lg shadow-lg bg-linear-to-br from-white to-gray-50 border border-gray-200 overflow-hidden select-none",
                    prefersReducedMotion ? "transition-none" : "duration-300",
                    isInteractive && !isDisabled && "cursor-pointer",
                    isInteractive &&
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected &&
                        "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent",
                    isFocused &&
                        !isSelected &&
                        "ring-2 ring-blue-400 ring-offset-1",
                    // Hint annotation ring (only when not selected/focused so
                    // selection always wins visually).
                    !isSelected &&
                        !isFocused &&
                        annotation?.ringClass &&
                        annotation.ringClass,
                    !isSelected &&
                        !isFocused &&
                        annotation?.ringStyleClass &&
                        annotation.ringStyleClass,
                    annotation?.pulse &&
                        !prefersReducedMotion &&
                        "animate-pulse",
                    isDisabled && "grayscale brightness-75 cursor-not-allowed",
                )}
                style={{
                    width: dimensions.width,
                    height: dimensions.height,
                }}
            >
                {/* Card Face */}
                {!showBack && card && (
                    <CardFace
                        card={card}
                        cornerTextSizeClass="text-[10px]"
                        centerTextSizeClass="text-xl"
                    />
                )}

                {/* Card Back */}
                {showBack && (
                    <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
                        <div
                            className="w-3/4 h-3/4 rounded border-2 border-blue-400/50"
                            style={{
                                backgroundImage: `
                                    repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent 3px,
                                        rgba(255,255,255,0.1) 3px,
                                        rgba(255,255,255,0.1) 6px
                                    )
                                `,
                            }}
                        />
                    </div>
                )}

                {/* Hint badge — small label in top-right corner. */}
                {annotation?.badge && !showBack && (
                    <span
                        className={cn(
                            "absolute top-0.5 right-0.5 px-1 py-0 rounded text-[8px] font-bold uppercase text-white tracking-wide leading-tight",
                            annotation.badgeColorClass ?? "bg-emerald-600",
                        )}
                    >
                        {annotation.badge}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardHand Component
// ─────────────────────────────────────────────────────────────────────────────

function CardHand({
    cards,
    cardCount,
    isLocalPlayer = false,
    orientation,
    size,
    interactive = false,
    selectedIndex = null,
    selectedIndices,
    disabledIndices = [],
    cardAnnotations,
    onCardClick,
    playerId,
    className,
    isDealing = false,
    rotation: rotationProp,
    enableTapToSpread,
    expansionMode,
    expandRadius = 2,
    spreadAutoCollapseMs = 3000,
    isSpreadControlled,
    onSpreadChange,
}: CardHandProps) {
    const { dimensions, layoutConfig } = useGameTable();
    const edgeContext = useEdgeRegion();
    const prefersReducedMotion = usePrefersReducedMotion();

    // Keyboard navigation state
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Hover-zoom "lens" state — index of the card currently under the pointer
    // (or focused via keyboard). Drives the per-card spacing computation below.
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Tap-to-spread state
    const [isSpreadInternal, setIsSpreadInternal] = useState(false);
    const [spreadTappedIndex, setSpreadTappedIndex] = useState<number | null>(
        null,
    );

    // Use controlled state if provided, otherwise use internal
    // When controlled, the parent manages spread state for outside click handling
    const isSpread =
        isSpreadControlled !== undefined
            ? isSpreadControlled
            : isSpreadInternal;

    // Collapse spread (used internally and by parent via controlled state)
    const collapseSpread = useCallback(() => {
        setIsSpreadInternal(false);
        setSpreadTappedIndex(null);
        onSpreadChange?.(false);
    }, [onSpreadChange]);

    // Expand spread
    const expandSpread = useCallback(() => {
        setIsSpreadInternal(true);
        onSpreadChange?.(true);
    }, [onSpreadChange]);

    // Sync with controlled prop when parent collapses
    useEffect(() => {
        if (isSpreadControlled === false && isSpreadInternal) {
            setIsSpreadInternal(false);
            setSpreadTappedIndex(null);
        }
    }, [isSpreadControlled, isSpreadInternal]);

    // Determine if tap-to-spread should be enabled
    const shouldEnableTapToSpread =
        enableTapToSpread ??
        (isLocalPlayer && layoutConfig.layoutMode === "compact");

    // Resolve which expansion mode is active. Tap-to-spread takes precedence
    // when explicitly enabled (legacy meld scene); otherwise hover-zoom is the
    // default for the local player. Opponents never get any expansion.
    const resolvedExpansionMode: "hover-zoom" | "tap-spread" | "off" =
        expansionMode ??
        (shouldEnableTapToSpread
            ? "tap-spread"
            : isLocalPlayer
              ? "hover-zoom"
              : "off");

    const hoverZoomActive = resolvedExpansionMode === "hover-zoom";

    // Auto-collapse spread after timeout
    useEffect(() => {
        if (isSpread && spreadAutoCollapseMs > 0) {
            const timer = setTimeout(() => {
                collapseSpread();
            }, spreadAutoCollapseMs);
            return () => clearTimeout(timer);
        }
    }, [isSpread, spreadAutoCollapseMs, collapseSpread]);

    // Keyboard navigation for card selection
    const handleKeyboardConfirm = useCallback(
        (index: number) => {
            const card = cards[index];
            if (card && !disabledIndices.includes(index)) {
                onCardClick?.(index, card);
            }
        },
        [cards, disabledIndices, onCardClick],
    );

    const handleKeyboardCancel = useCallback(() => {
        setFocusedIndex(-1);
    }, []);

    useKeyboardNavigation({
        items: cards,
        selectedIndex: focusedIndex >= 0 ? focusedIndex : (selectedIndex ?? -1),
        onSelect: setFocusedIndex,
        onConfirm: handleKeyboardConfirm,
        onCancel: handleKeyboardCancel,
        enabled: isLocalPlayer && interactive && cards.length > 0,
        wrap: true,
    });

    // Mirror keyboard focus into the hover lens so arrow-key navigation also
    // expands the same neighbourhood as a mouse hover would.
    useEffect(() => {
        if (!hoverZoomActive) return;
        if (focusedIndex >= 0) {
            setHoveredIndex(focusedIndex);
        }
    }, [focusedIndex, hoverZoomActive]);

    // Handle tap on card area (for spread)
    const handleSpreadTap = useCallback(
        (index: number, card: PlayingCardType) => {
            if (!shouldEnableTapToSpread) {
                // Normal click behavior
                onCardClick?.(index, card);
                return;
            }

            if (!isSpread) {
                // First tap: spread cards AND select the tapped card
                expandSpread();
                setSpreadTappedIndex(index);
                onCardClick?.(index, card);
            } else {
                // Already spread - just select the tapped card
                // Cards stay spread until outside tap or timer
                setSpreadTappedIndex(index);
                onCardClick?.(index, card);
            }
        },
        [shouldEnableTapToSpread, isSpread, onCardClick, expandSpread],
    );

    // For opponents in badge mode, the card count already rides on the
    // player's avatar via PlayerInfo's `countBadge`. A second CardBadge here
    // would duplicate the same number and steal vertical space, so we drop
    // the badge-mode opponent rendering entirely.
    const effectiveCardCount = cardCount ?? cards.length;
    if (!isLocalPlayer && layoutConfig.useBadgeMode && effectiveCardCount > 0) {
        return null;
    }

    // Get rotation from prop, EdgeRegion context, or default to 0
    const rotation = rotationProp ?? edgeContext?.cardRotation ?? 0;

    // Determine orientation - always horizontal (cards laid out side by side)
    // The rotation will handle the visual orientation for side players
    const effectiveOrientation: FanOrientation = orientation ?? "horizontal";

    // Determine responsive card size based on layout config
    const responsiveSize: CardSize =
        size ??
        (isLocalPlayer
            ? layoutConfig.heroCardSize
            : layoutConfig.opponentCardSize);

    // For opponents, show card backs based on cardCount
    // For local player during dealing (cards empty but cardCount > 0), also show card backs
    const displayCards: (PlayingCardType | null)[] =
        cards.length > 0 ? cards : Array(cardCount || 0).fill(null);

    const isHorizontal = effectiveOrientation === "horizontal";

    // Calculate the card dimensions first (needed for spacing calculations)
    const cardDimensions = SIZE_DIMENSIONS[responsiveSize];

    // On compact layouts the hero hand must fit the remaining viewport width
    // after side-seat reservations. Allow the bottom-hand padding to breathe.
    const heroWidthReservation =
        layoutConfig.layoutMode === "compact" ? 16 : 32;
    // Calculate available width for the hero's hand (account for some padding)
    const availableWidth = isLocalPlayer
        ? dimensions.width - heroWidthReservation
        : undefined;

    // Layout count: during the deal, `cards` grows incrementally 1→N but we
    // want the fan to keep its FINAL width so revealed cards slot into their
    // end positions instead of visibly spreading outward on each new arrival.
    // When the caller passes a `cardCount` that exceeds `cards.length` (which
    // happens while dealing), use the larger value for spacing/width only.
    const layoutNumCards = Math.max(displayCards.length, cardCount ?? 0);

    // Normal spacing (auto-calculated to fit available width)
    const normalSpacing = getCardSpacing(
        layoutNumCards,
        responsiveSize,
        isHorizontal,
        availableWidth,
    );

    // Spread spacing: minimal overlap to show most of each card
    // Lower spacing = less overlap = more card visible
    // Use ~15% of card width as spacing (showing ~85% of each card)
    const spreadSpacing = Math.max(5, cardDimensions.width * 0.15);

    const spacing = isSpread ? spreadSpacing : normalSpacing;

    // Per-card spacing for the hover-zoom "lens". `marginLeft[i]` controls the
    // gap between card `i-1` and card `i`, so a gap should open whenever
    // either neighbour is close to the hovered index. Using
    // `min(dist(i-1), dist(i))` makes the lens symmetric around the hover.
    const perCardSpacing: number[] = (() => {
        if (
            isSpread ||
            !hoverZoomActive ||
            hoveredIndex == null ||
            displayCards.length === 0
        ) {
            return new Array(displayCards.length).fill(spacing);
        }
        const radius = Math.max(0, expandRadius);
        return displayCards.map((_, i) => {
            const distLeft = Math.abs(i - 1 - hoveredIndex);
            const distRight = Math.abs(i - hoveredIndex);
            const dist = Math.min(distLeft, distRight);
            if (dist > radius) return normalSpacing;
            // Linear blend: dist 0 → spreadSpacing, dist == radius → normalSpacing.
            const t = radius === 0 ? 0 : dist / radius;
            return spreadSpacing + (normalSpacing - spreadSpacing) * t;
        });
    })();

    // Calculate if the hand container needs different sizing based on rotation
    // For 90/-90 degree rotations, the hand will appear vertical
    const isRotatedSideways = Math.abs(rotation) === 90;

    // Calculate the actual width/height of the fanned card hand.
    // Uses layoutNumCards (max of displayed + reserved) so the container
    // stays at its final size during the deal, preventing visible shift.
    const numCards = layoutNumCards;
    // First card full width + (remaining cards * spacing)
    const totalHandWidth = isHorizontal
        ? cardDimensions.width +
          Math.max(0, numCards - 1) * (cardDimensions.width - spacing)
        : cardDimensions.width;
    const totalHandHeight = isHorizontal
        ? cardDimensions.height
        : cardDimensions.height +
          Math.max(0, numCards - 1) * (cardDimensions.height - spacing);

    return (
        <div
            className={cn(
                "flex items-center justify-center duration-300",
                isLocalPlayer && !interactive && "brightness-60",
                className,
            )}
            style={{
                // Set explicit dimensions so the container centers properly
                width: isRotatedSideways ? totalHandHeight : totalHandWidth,
                height: isRotatedSideways ? totalHandWidth : totalHandHeight,
                // Only cap on compact — desktop/tablet allow fans to bleed
                // into the center cell so full hands render at natural size.
                maxWidth:
                    layoutConfig.layoutMode === "compact" ? "100%" : undefined,
                maxHeight:
                    layoutConfig.layoutMode === "compact" ? "100%" : undefined,
            }}
        >
            <div
                className={cn(
                    "flex",
                    isHorizontal ? "flex-row" : "flex-col",
                    // Disable pointer events when not interactive (not player's turn)
                    isLocalPlayer && !interactive && "pointer-events-none",
                )}
                style={{
                    transform:
                        rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
                    transformOrigin: "center center",
                    // Stop touch sliding from triggering page scroll while the
                    // user drags through their hand to inspect cards.
                    touchAction: hoverZoomActive ? "none" : undefined,
                }}
                onPointerLeave={
                    hoverZoomActive
                        ? (e) => {
                              // Mouse leaving the hand collapses the lens.
                              // Touch sliding through cards constantly
                              // crosses card edges; rely on pointer-up
                              // (handled below) to clear instead.
                              if (e.pointerType === "mouse") {
                                  setHoveredIndex(null);
                              }
                          }
                        : undefined
                }
                onPointerUp={
                    hoverZoomActive
                        ? (e) => {
                              if (e.pointerType !== "mouse") {
                                  setHoveredIndex(null);
                              }
                          }
                        : undefined
                }
                onPointerCancel={
                    hoverZoomActive ? () => setHoveredIndex(null) : undefined
                }
            >
                <AnimatePresence mode="popLayout">
                    {displayCards.map((card, index) => {
                        // In spread mode, the tapped card is highlighted
                        const isHighlighted =
                            isSpread && spreadTappedIndex === index;
                        // Multi-select (meld composer) takes precedence,
                        // then spread-tap highlight, then single-select.
                        const isMultiSelected =
                            !!selectedIndices &&
                            selectedIndices.includes(index);
                        const effectivelySelected =
                            isMultiSelected ||
                            isHighlighted ||
                            selectedIndex === index;

                        return (
                            <CardInHand
                                key={
                                    card
                                        ? `${card.suit}-${card.rank}`
                                        : `back-${index}`
                                }
                                card={card}
                                index={index}
                                isHidden={!isLocalPlayer}
                                isSelected={effectivelySelected}
                                isDisabled={disabledIndices.includes(index)}
                                isInteractive={
                                    interactive && isLocalPlayer && !isDealing
                                }
                                isFocused={focusedIndex === index}
                                size={responsiveSize}
                                spacing={perCardSpacing[index] ?? spacing}
                                isHovered={
                                    hoverZoomActive && hoveredIndex === index
                                }
                                playerId={playerId}
                                isHorizontal={isHorizontal}
                                annotation={cardAnnotations?.[index]}
                                prefersReducedMotion={prefersReducedMotion}
                                onHoverChange={
                                    hoverZoomActive
                                        ? setHoveredIndex
                                        : undefined
                                }
                                enableTouchHoverDrag={hoverZoomActive}
                                onClick={
                                    card
                                        ? () => handleSpreadTap(index, card)
                                        : undefined
                                }
                            />
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default CardHand;
