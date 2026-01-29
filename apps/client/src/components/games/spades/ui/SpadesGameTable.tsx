"use client";

import React, {
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
} from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { toast } from "sonner";
import {
    SpadesData,
    SpadesPlayerData,
    PlayingCard as PlayingCardType,
} from "@shared/types";
import {
    GameTable,
    TableCenter,
    EdgeRegion,
    CardHand,
    CardDeck,
    PlayerInfo,
    TrickPile,
    EdgePosition,
    ActionConfirmationBar,
    DealingOverlay,
    DealingItem,
} from "@/components/games/shared";
import { Badge } from "@/components/ui/badge";
import { Zap, Ban } from "lucide-react";
import { getUnplayableCardIndices } from "@/lib/spadesValidation";
import { useTurnTimer, usePrefersReducedMotion } from "@/hooks";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { playTimerStartSound, initializeAudioOnInteraction } from "@/lib/audio";
import { announceToScreenReader, gameAnnouncements } from "@/lib/accessibility";

interface SpadesGameTableProps {
    gameData: SpadesData;
    playerData: SpadesPlayerData;
    isMyTurn: boolean;
    onCardPlay: (card: PlayingCardType) => void;
    showHints?: boolean;
}

// Helper function to map player index to edge position
function getEdgePosition(index: number, playerCount: number): EdgePosition {
    if (playerCount === 2) {
        return index === 0 ? "bottom" : "top";
    }
    if (playerCount === 3) {
        if (index === 0) return "bottom";
        if (index === 1) return "left";
        return "right";
    }
    // 4 players (standard for Spades)
    if (index === 0) return "bottom";
    if (index === 1) return "left";
    if (index === 2) return "top";
    if (index === 3) return "right";
    return "top";
}

function SpadesGameTable({
    gameData,
    playerData,
    isMyTurn,
    onCardPlay,
    showHints = false,
}: SpadesGameTableProps) {
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
        null,
    );
    const [isHeroHandSpread, setIsHeroHandSpread] = useState(false);

    // Clock offset for turn timer synchronization - may not be available in debug mode
    let clockOffset = 0;
    try {
        const wsContext = useWebSocket();
        clockOffset = wsContext.clockOffset;
    } catch {
        // WebSocket context not available (debug mode)
    }

    // Deal animation state
    const [isDealing, setIsDealing] = useState(false);
    const [dealingCards, setDealingCards] = useState<DealingItem[]>([]);
    const [visibleCardCounts, setVisibleCardCounts] = useState<
        Record<string, number>
    >({});
    const previousRoundRef = useRef<number | null>(null);
    const hasDealtRef = useRef(false);

    const playerCount = playerData.localOrdering.length;
    const prefersReducedMotion = usePrefersReducedMotion();

    // Track previous state for announcements
    const previousPhaseRef = useRef<string | null>(null);
    const previousTrickCountRef = useRef<number>(0);
    const previousSpadesBrokenRef = useRef<boolean>(false);

    // Initialize audio on first user interaction
    useEffect(() => {
        initializeAudioOnInteraction();
    }, []);

    // Turn timer - use new turnTimer object with clock sync
    const turnTimeLimit = gameData.settings?.turnTimeLimit ?? 0;

    // Track isMyTurn in a ref so the callback always has the latest value
    const isMyTurnRef = useRef(isMyTurn);
    useEffect(() => {
        isMyTurnRef.current = isMyTurn;
    }, [isMyTurn]);

    // Only play audio cue when it's the local player's turn
    const handleTimerStart = useCallback(() => {
        // Use ref to get the latest value of isMyTurn
        if (isMyTurnRef.current) {
            console.log("🔊 Playing timer start sound (your turn)");
            playTimerStartSound();
        } else {
            console.log("🔇 Timer started but not your turn");
        }
    }, []);

    const { isActive: timerIsActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
        handleTimerStart,
    );

    // Memoize timer props to prevent unnecessary re-renders
    // Only create timer props object when timer is actually active
    // Don't show timer during trick-result phase or dealing
    // TurnTimer handles its own animation via direct DOM manipulation
    const timerPropsCache = useMemo(() => {
        if (
            turnTimeLimit <= 0 ||
            isDealing ||
            gameData.phase === "trick-result" ||
            !timerIsActive ||
            !gameData.turnTimer?.startedAt
        ) {
            return undefined;
        }
        return {
            totalMs: turnTimeLimit * 1000,
            startedAt: gameData.turnTimer.startedAt,
            clockOffset,
        };
    }, [
        turnTimeLimit,
        isDealing,
        gameData.phase,
        timerIsActive,
        gameData.turnTimer?.startedAt,
        clockOffset,
    ]);

    // Memoize unplayable card indices for performance
    const unplayableIndices = useMemo(
        () =>
            getUnplayableCardIndices(
                playerData.hand,
                gameData.currentTrick,
                gameData.spadesBroken,
            ),
        [playerData.hand, gameData.currentTrick, gameData.spadesBroken],
    );

    // Calculate which cards are unplayable when hints are enabled
    const disabledCardIndices =
        showHints && isMyTurn && gameData.phase === "playing"
            ? unplayableIndices
            : [];

    // Handle card selection (two-step: select, then confirm)
    const handleCardSelect = useCallback(
        (index: number, card: PlayingCardType) => {
            if (selectedCardIndex === index) {
                // Clear selection and spread FIRST to prevent visual glitch
                setSelectedCardIndex(null);
                setIsHeroHandSpread(false);
                // Then play the card
                onCardPlay(card);
            } else {
                // Select the card
                setSelectedCardIndex(index);
            }
        },
        [selectedCardIndex, onCardPlay],
    );

    // Handle play button click
    const handlePlayCard = useCallback(() => {
        if (selectedCardIndex !== null && playerData.hand[selectedCardIndex]) {
            const card = playerData.hand[selectedCardIndex];
            // Clear selection and spread FIRST
            setSelectedCardIndex(null);
            setIsHeroHandSpread(false);
            // Then play the card
            onCardPlay(card);
        }
    }, [selectedCardIndex, playerData.hand, onCardPlay]);

    // Handle cancel selection
    const handleCancelSelection = useCallback(() => {
        setSelectedCardIndex(null);
    }, []);

    // Track if we've shown the turn toast for this turn
    const turnToastShownRef = useRef<number | null>(null);

    // Deal animation effect - trigger when round changes
    useEffect(() => {
        const currentRound = gameData.round;
        const cardsPerPlayer = 13; // Standard spades deal

        // Detect new round (round changed or first load with cards)
        const isNewRound =
            previousRoundRef.current !== null &&
            previousRoundRef.current !== currentRound;
        const isFirstLoad =
            previousRoundRef.current === null &&
            playerData.hand.length === cardsPerPlayer &&
            !hasDealtRef.current;

        if (isNewRound || isFirstLoad) {
            hasDealtRef.current = true;

            // Announce dealing for screen readers
            announceToScreenReader(
                gameAnnouncements.dealingCards(cardsPerPlayer),
            );

            // Start deal animation
            const runDealAnimation = async () => {
                setIsDealing(true);
                setVisibleCardCounts({});
                setDealingCards([]);

                // Skip animation delay if user prefers reduced motion
                const initialDelay = prefersReducedMotion ? 50 : 300;
                await new Promise((resolve) =>
                    setTimeout(resolve, initialDelay),
                );

                // Build deal sequence - cycle through players like a real dealer
                const dealSequence: {
                    playerId: string;
                    position: EdgePosition;
                }[] = [];
                for (let round = 0; round < cardsPerPlayer; round++) {
                    for (let p = 0; p < playerCount; p++) {
                        const playerId = playerData.localOrdering[p];
                        dealSequence.push({
                            playerId,
                            position: getEdgePosition(p, playerCount),
                        });
                    }
                }

                // Deal cards with animation (faster if reduced motion preferred)
                const CARD_INTERVAL = prefersReducedMotion ? 5 : 25;
                for (let i = 0; i < dealSequence.length; i++) {
                    const { playerId, position } = dealSequence[i];
                    const dealingCardId = `deal-${currentRound}-${i}`;

                    // Show flying card
                    setDealingCards([
                        {
                            id: dealingCardId,
                            targetPosition: position,
                            delay: 0,
                        },
                    ]);

                    // Wait for animation
                    await new Promise((resolve) =>
                        setTimeout(resolve, CARD_INTERVAL - 8),
                    );

                    // Increment visible count for this player
                    setVisibleCardCounts((prev) => ({
                        ...prev,
                        [playerId]: (prev[playerId] || 0) + 1,
                    }));
                    setDealingCards([]);

                    // Small gap
                    await new Promise((resolve) => setTimeout(resolve, 8));
                }

                setIsDealing(false);
            };

            runDealAnimation();
        }

        previousRoundRef.current = currentRound;
    }, [
        gameData.round,
        playerData.hand.length,
        playerData.localOrdering,
        playerCount,
        prefersReducedMotion,
    ]);

    // Reset selection and spread when turn changes or phase changes
    useEffect(() => {
        setSelectedCardIndex(null);
        setIsHeroHandSpread(false);
    }, [gameData.currentTurnIndex, gameData.phase]);

    // Screen reader announcements for game events
    useEffect(() => {
        // Announce phase changes
        if (previousPhaseRef.current !== gameData.phase) {
            if (
                gameData.phase === "bidding" &&
                previousPhaseRef.current !== null
            ) {
                announceToScreenReader(gameAnnouncements.biddingPhaseStart());
            } else if (
                gameData.phase === "playing" &&
                previousPhaseRef.current === "bidding"
            ) {
                const leadPlayer =
                    gameData.players[
                        gameData.playOrder[gameData.currentTurnIndex]
                    ];
                announceToScreenReader(
                    gameAnnouncements.playingPhaseStart(
                        leadPlayer?.name || "Unknown",
                    ),
                );
            }
            previousPhaseRef.current = gameData.phase;
        }

        // Announce trick completion
        const currentTrickCount = gameData.completedTricks.length;
        if (
            currentTrickCount > previousTrickCountRef.current &&
            gameData.lastTrickWinnerId
        ) {
            const winnerName =
                gameData.players[gameData.lastTrickWinnerId]?.name || "Unknown";
            announceToScreenReader(
                gameAnnouncements.trickWon(winnerName, currentTrickCount),
            );
        }
        previousTrickCountRef.current = currentTrickCount;

        // Announce spades broken
        if (gameData.spadesBroken && !previousSpadesBrokenRef.current) {
            announceToScreenReader(
                gameAnnouncements.spadesBroken(),
                "assertive",
            );
        }
        previousSpadesBrokenRef.current = gameData.spadesBroken;
    }, [
        gameData.phase,
        gameData.completedTricks.length,
        gameData.lastTrickWinnerId,
        gameData.spadesBroken,
        gameData.players,
        gameData.playOrder,
        gameData.currentTurnIndex,
    ]);

    // Show toast when it's the player's turn
    useEffect(() => {
        if (
            isMyTurn &&
            gameData.phase === "playing" &&
            turnToastShownRef.current !== gameData.currentTurnIndex
        ) {
            turnToastShownRef.current = gameData.currentTurnIndex;
            // Announce turn change for screen readers
            announceToScreenReader(gameAnnouncements.turnChange("", true));
            toast.info("Your turn! Select a card to play", {
                id: "your-turn-toast",
                duration: 4000,
                dismissible: true,
            });
        }
    }, [isMyTurn, gameData.phase, gameData.currentTurnIndex]);

    // Handle table click to collapse spread hands
    const handleTableClick = useCallback(() => {
        if (isHeroHandSpread) {
            setIsHeroHandSpread(false);
        }
    }, [isHeroHandSpread]);

    // Get trick plays for display
    const trickPlays =
        gameData.currentTrick?.plays.map((play) => ({
            playerId: play.playerId,
            card: play.card,
            playerName: gameData.players[play.playerId]?.name,
        })) ?? [];

    // Calculate cards to show during dealing animation
    const getCardsToShow = (
        playerId: string,
        isLocal: boolean,
    ): PlayingCardType[] => {
        if (!isDealing) {
            return isLocal ? playerData.hand : [];
        }
        // During dealing, show cards up to the visible count
        const visibleCount = visibleCardCounts[playerId] || 0;
        if (isLocal) {
            return playerData.hand.slice(0, visibleCount);
        }
        return [];
    };

    const getCardCountToShow = (playerId: string): number => {
        if (!isDealing) {
            return gameData.handsCounts?.[playerId] ?? 0;
        }
        return visibleCardCounts[playerId] || 0;
    };

    // Build aria-label for the game table
    const gameTableAriaLabel = useMemo(() => {
        const parts = [`Spades game, round ${gameData.round}`];
        parts.push(`trick ${gameData.completedTricks.length + 1} of 13`);
        if (gameData.phase === "bidding") {
            parts.push("bidding phase");
        } else if (gameData.phase === "playing") {
            const currentPlayer =
                gameData.players[gameData.playOrder[gameData.currentTurnIndex]];
            parts.push(`${currentPlayer?.name || "Unknown"}'s turn to play`);
        }
        if (gameData.spadesBroken) {
            parts.push("spades are broken");
        }
        return parts.join(". ");
    }, [
        gameData.round,
        gameData.completedTricks.length,
        gameData.phase,
        gameData.players,
        gameData.playOrder,
        gameData.currentTurnIndex,
        gameData.spadesBroken,
    ]);

    return (
        <div
            className="h-full w-full"
            role="region"
            aria-label={gameTableAriaLabel}
        >
            <LayoutGroup>
                <GameTable
                    playerCount={playerCount}
                    isDealing={isDealing}
                    showDebugGrid={false}
                    onTableClick={handleTableClick}
                >
                    {/* Player Edge Regions */}
                    {playerData.localOrdering.map((playerId, index) => {
                        const isLocal = index === 0;
                        const player = gameData.players[playerId];
                        const isCurrentTurn =
                            gameData.playOrder[gameData.currentTurnIndex] ===
                            playerId;
                        const bidData = gameData.bids[playerId];
                        const bid = bidData?.amount ?? null;
                        const bidType = bidData?.type;
                        const tricksWon =
                            gameData.roundTrickCounts?.[playerId] ?? 0;
                        const edgePosition = getEdgePosition(
                            index,
                            playerCount,
                        );

                        // Get team color
                        let teamColor: string | undefined;
                        Object.entries(gameData.teams).forEach(
                            ([teamId, team]) => {
                                if (team.players.includes(playerId)) {
                                    teamColor =
                                        teamId === "0" ? "#3b82f6" : "#ef4444";
                                }
                            },
                        );

                        return (
                            <EdgeRegion
                                key={playerId}
                                position={edgePosition}
                                isHero={isLocal}
                                isDealing={isDealing}
                            >
                                <PlayerInfo
                                    playerId={playerId}
                                    playerName={player?.name || "Unknown"}
                                    isCurrentTurn={isCurrentTurn && !isDealing}
                                    isLocalPlayer={isLocal}
                                    seatPosition={edgePosition}
                                    teamColor={teamColor}
                                    turnTimer={
                                        isCurrentTurn && timerPropsCache
                                            ? timerPropsCache
                                            : undefined
                                    }
                                    customStats={() => (
                                        <div className="flex gap-1 items-center">
                                            {bid !== null && (
                                                <>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                                                    >
                                                        Bid: {bid}
                                                    </Badge>
                                                    {bidType === "nil" && (
                                                        <Badge className="text-[10px] px-1.5 py-0 bg-purple-600 text-white border-purple-400">
                                                            NIL
                                                        </Badge>
                                                    )}
                                                    {bidType === "blind" && (
                                                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-600 text-white border-amber-400 flex items-center gap-0.5">
                                                            <Zap className="w-2.5 h-2.5" />
                                                            BLIND
                                                        </Badge>
                                                    )}
                                                    {bidType ===
                                                        "blind-nil" && (
                                                        <Badge className="text-[10px] px-1.5 py-0 bg-red-600 text-white border-red-400 animate-pulse flex items-center gap-0.5">
                                                            <Ban className="w-2.5 h-2.5" />
                                                            BLIND NIL
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                            {tricksWon !== undefined &&
                                                bid !== null && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] px-1.5 py-0 border-white/20 ${
                                                            tricksWon >= bid
                                                                ? "bg-green-500/30 text-green-300"
                                                                : "bg-black/30 text-white/80"
                                                        }`}
                                                    >
                                                        Won: {tricksWon}
                                                    </Badge>
                                                )}
                                        </div>
                                    )}
                                />
                                <CardHand
                                    cards={getCardsToShow(playerId, isLocal)}
                                    cardCount={getCardCountToShow(playerId)}
                                    isLocalPlayer={isLocal}
                                    interactive={
                                        isLocal &&
                                        isMyTurn &&
                                        gameData.phase === "playing" &&
                                        !isDealing
                                    }
                                    selectedIndex={
                                        isLocal ? selectedCardIndex : null
                                    }
                                    disabledIndices={
                                        isLocal ? disabledCardIndices : []
                                    }
                                    onCardClick={
                                        isLocal ? handleCardSelect : undefined
                                    }
                                    playerId={playerId}
                                    isDealing={isDealing}
                                    isSpreadControlled={
                                        isLocal ? isHeroHandSpread : undefined
                                    }
                                    onSpreadChange={
                                        isLocal
                                            ? setIsHeroHandSpread
                                            : undefined
                                    }
                                />
                            </EdgeRegion>
                        );
                    })}

                    {/* Center Area */}
                    <TableCenter className="flex flex-col items-center gap-4">
                        {/* Deal animation - deck and flying cards */}
                        {isDealing && (
                            <>
                                <CardDeck
                                    cardCount={52 - dealingCards.length * 4}
                                />
                                <DealingOverlay dealingItems={dealingCards} />
                            </>
                        )}

                        {/* Round indicator - hide during dealing */}
                        {!isDealing && (
                            <motion.div
                                className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-1"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span className="text-white/80 text-sm font-medium">
                                    Round {gameData.round} • Trick{" "}
                                    {gameData.completedTricks.length + 1}
                                </span>
                            </motion.div>
                        )}

                        {/* Trick pile - hide during dealing */}
                        {!isDealing && (
                            <TrickPile
                                plays={trickPlays}
                                winningPlayerId={gameData.lastTrickWinnerId}
                                winningCard={
                                    gameData.phase === "trick-result"
                                        ? gameData.lastTrickWinningCard
                                        : undefined
                                }
                            />
                        )}

                        {/* Trick result message */}
                        <AnimatePresence>
                            {!isDealing &&
                                gameData.phase === "trick-result" &&
                                gameData.lastTrickWinnerId && (
                                    <motion.div
                                        className="bg-amber-500/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg"
                                        initial={{
                                            opacity: 0,
                                            scale: 0.8,
                                            y: 20,
                                        }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0.8,
                                            y: -20,
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                        }}
                                    >
                                        <span className="text-amber-900 font-semibold">
                                            {gameData.players[
                                                gameData.lastTrickWinnerId
                                            ]?.name || "Unknown"}{" "}
                                            won the trick!
                                        </span>
                                    </motion.div>
                                )}
                        </AnimatePresence>
                    </TableCenter>
                </GameTable>
            </LayoutGroup>

            {/* Play card confirmation bar */}
            <ActionConfirmationBar
                isVisible={
                    selectedCardIndex !== null &&
                    isMyTurn &&
                    gameData.phase === "playing"
                }
                onConfirm={handlePlayCard}
                onCancel={handleCancelSelection}
                confirmLabel="Play Card"
            />
        </div>
    );
}

export default SpadesGameTable;
