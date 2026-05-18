"use client";

/**
 * LRC (Left Right Center) Game Component
 *
 * Main orchestration component for the LRC dice game.
 * Handles game phases, player interactions, and animations.
 */

import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
    useEffect,
} from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { LRCData, LRCPlayerData, LRCPlayer } from "@shared/types";
import {
    GameMenu,
    GameSettingToggle,
    PlayerInfo,
    GameTable,
    TableCenter,
    EdgeRegion,
    type PlayerAvatarTurnTimer,
    RotateDeviceOverlay,
    useGameSetting,
} from "@/components/games/shared";
import {
    getSeatAssignments,
    groupSeatsByEdge,
} from "@/components/games/shared/seatLayout";
import type { EdgePosition } from "@/components/games/shared";
import { DiceTray, RollButton } from "./ui/Die";
import { ChipStack, ChipAnimationManager } from "./ui/ChipStack";
import { CenterPot } from "./ui/CenterPot";
import { PassDirectionIndicator } from "./ui/PassDirectionIndicator";
import {
    RoundSummaryModal,
    WildTargetModal,
    LastChipChallengeBanner,
} from "./ui/RoundSummaryModal";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
    playDiceRollSound,
    playChipPassSound,
    playWinnerFanfareSound,
    playTimerStartSound,
    initializeAudioOnInteraction,
} from "@/lib/audio";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LRCProps {
    gameData: LRCData;
    playerData: LRCPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}

interface LrcSeatProps {
    player: LRCPlayer;
    isConnected: boolean;
    isCurrentTurn: boolean;
    isHero: boolean;
    isWinner: boolean;
    chipValue: number;
    showMoney: boolean;
    seatPosition: EdgePosition;
    /** Active turn timer state — only renders ring when this is the active seat. */
    turnTimer?: PlayerAvatarTurnTimer;
    /** Ref-callback to register this seat's DOM node for chip-pass animation positions. */
    seatRef: (node: HTMLDivElement | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// LRC Seat (PlayerInfo wrapper with chip stack + winner crown)
// ─────────────────────────────────────────────────────────────────────────────

function LrcSeat({
    player,
    isConnected,
    isCurrentTurn,
    isHero,
    isWinner,
    chipValue,
    showMoney,
    seatPosition,
    turnTimer,
    seatRef,
}: LrcSeatProps) {
    const moneyValue = useMemo(() => {
        if (!showMoney || chipValue <= 0) return null;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(player.chips * chipValue);
    }, [player.chips, chipValue, showMoney]);

    return (
        <motion.div
            ref={seatRef}
            data-player-id={player.id}
            className={cn(
                "relative flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-lg transition-all duration-300",
                isCurrentTurn &&
                    "ring-2 ring-amber-400/70 bg-amber-500/10 shadow-lg shadow-amber-500/10",
                isWinner &&
                    "ring-2 ring-green-400/70 bg-green-500/10 shadow-lg shadow-green-500/10",
                !isConnected && "opacity-40 grayscale",
            )}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <PlayerInfo
                playerId={player.id}
                playerName={player.name}
                isCurrentTurn={isCurrentTurn}
                isLocalPlayer={isHero}
                seatPosition={seatPosition}
                connected={isConnected}
                turnTimer={turnTimer}
                countBadge={{
                    value: player.chips,
                    tone: "chip",
                    ariaLabel: `${player.chips} chips`,
                }}
                customStats={(ctxOrAlign) => {
                    // Narrow the union: legacy callers may receive just the
                    // text-align string, modern callers receive the context.
                    const ctx =
                        typeof ctxOrAlign === "string"
                            ? {
                                  textAlign: ctxOrAlign,
                                  density: "spacious" as const,
                                  isLocalPlayer: isHero,
                              }
                            : ctxOrAlign;
                    const isCompact = ctx.density === "compact";
                    // Hero: show a real chip-stack so chips remain tactile.
                    if (ctx.isLocalPlayer) {
                        return (
                            <div className="mt-0.5 flex flex-col items-center gap-0.5">
                                <ChipStack
                                    count={player.chips}
                                    chipValue={chipValue}
                                    showMoney={false}
                                    size={isCompact ? "sm" : "md"}
                                />
                                {moneyValue && (
                                    <div className="text-[10px] text-green-400 font-medium bg-green-500/20 px-1.5 py-0.5 rounded-full">
                                        {moneyValue}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    // Opponents: count is on the avatar badge; only print
                    // the money on comfortable+ to avoid cluttering compact.
                    if (moneyValue && !isCompact) {
                        return (
                            <span className="text-[10px] text-green-400 font-medium">
                                {moneyValue}
                            </span>
                        );
                    }
                    return null;
                }}
            />

            {/* Winner crown */}
            {isWinner && (
                <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 text-base"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                    👑
                </motion.div>
            )}

            {/* Disconnected indicator */}
            {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
                    <span className="text-[10px] text-white/60">Offline</span>
                </div>
            )}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LRC Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LRC({
    gameData,
    playerData: _playerData,
    dispatchOptimisticAction,
    roomCode,
}: LRCProps) {
    const { socket, connected, clockOffset } = useWebSocket();
    const { roomId, userId } = useSession();

    // Local state for UI
    const [isRolling, setIsRolling] = useState(false);
    const [wildCountdown, setWildCountdown] = useState(3);
    const [autoSelectedWildTarget, setAutoSelectedWildTarget] = useState<
        string | null
    >(null);

    // Game settings
    const soundEnabled = useGameSetting("lrc.soundEnabled", true);
    const showMoney = gameData.settings.chipValue > 0;

    // Derived state
    const currentPlayer = gameData.lrcPlayers[gameData.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === userId;
    const isLeader = userId === gameData.lrcPlayers[0]?.id; // First player is leader
    const heroPlayer = gameData.lrcPlayers.find((p) => p.id === userId);
    const winner = gameData.winnerId
        ? gameData.lrcPlayers.find((p) => p.id === gameData.winnerId)
        : null;

    // ── Turn timer wiring (mirrors Spades) ──────────────────────────────────
    useEffect(() => {
        initializeAudioOnInteraction();
    }, []);

    const turnTimeLimit = gameData.settings?.turnTimeLimit ?? 0;

    const isMyTurnRef = useRef(isMyTurn);
    useEffect(() => {
        isMyTurnRef.current = isMyTurn;
    }, [isMyTurn]);

    const handleTimerStart = useCallback(() => {
        if (isMyTurnRef.current && soundEnabled) {
            playTimerStartSound();
        }
    }, [soundEnabled]);

    const { remainingSeconds, isActive: timerActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
        handleTimerStart,
    );

    // Memoized timer props for the active player's slot.
    // Gated on phase === "waiting-for-roll" — the only phase the active
    // player owns the action — so the ring hides during chip-pass / round-over.
    const turnTimerProps = useMemo<PlayerAvatarTurnTimer | undefined>(() => {
        if (
            turnTimeLimit <= 0 ||
            gameData.phase !== "waiting-for-roll" ||
            !timerActive ||
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
        gameData.phase,
        timerActive,
        gameData.turnTimer?.startedAt,
        clockOffset,
    ]);

    // Send game action helper
    const sendGameAction = useCallback(
        (type: string, payload: unknown = {}) => {
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction(type, payload);
            } else if (socket && connected) {
                socket.emit("game_action", {
                    roomId,
                    action: { type, payload, userId },
                });
            }
        },
        [dispatchOptimisticAction, socket, connected, roomId, userId],
    );

    // Handle rolling dice
    const handleRollDice = useCallback(() => {
        if (!isMyTurn || gameData.phase !== "waiting-for-roll") return;
        setIsRolling(true);
        if (soundEnabled) playDiceRollSound();
        sendGameAction("ROLL_DICE");
        // Reset rolling state after animation
        setTimeout(() => setIsRolling(false), 1500);
    }, [isMyTurn, gameData.phase, soundEnabled, sendGameAction]);

    // Handle confirming results (manual or auto)
    const handleConfirmResults = useCallback(() => {
        if (!isMyTurn || gameData.phase !== "showing-results") return;
        sendGameAction("CONFIRM_RESULTS");
    }, [isMyTurn, gameData.phase, sendGameAction]);

    // Handle choosing wild target
    const handleChooseWildTarget = useCallback(
        (targetPlayerId: string) => {
            if (!isMyTurn || gameData.phase !== "wild-target-selection") return;
            sendGameAction("CHOOSE_WILD_TARGET", { targetPlayerId });
        },
        [isMyTurn, gameData.phase, sendGameAction],
    );

    // Handle Last Chip Challenge roll
    const handleLastChipChallengeRoll = useCallback(() => {
        sendGameAction("LAST_CHIP_CHALLENGE_ROLL");
    }, [sendGameAction]);

    // Handle play again
    const handlePlayAgain = useCallback(() => {
        if (!isLeader) return;
        sendGameAction("PLAY_AGAIN");
    }, [isLeader, sendGameAction]);

    // Handle return to lobby. Leader fully tears down the game (everyone
    // returns to lobby); non-leaders quietly demote themselves to spectator
    // while the game stays finished until the leader ends it or the
    // server-side auto-cleanup elapses.
    const handleReturnToLobby = useCallback(() => {
        if (!socket || !connected) return;
        if (isLeader) {
            socket.emit("abort_game", { roomId, userId });
        } else {
            socket.emit("return_to_lobby", { roomId, userId });
        }
    }, [socket, connected, roomId, isLeader, userId]);

    // Auto-select richest player for Wild targets
    useEffect(() => {
        if (
            gameData.phase === "wild-target-selection" &&
            gameData.pendingWildTargets.length > 0 &&
            isMyTurn
        ) {
            // Find richest player (excluding current player)
            const validTargets = gameData.lrcPlayers.filter(
                (p) => p.id !== userId && p.chips > 0,
            );
            if (validTargets.length > 0) {
                const richest = validTargets.reduce((a, b) =>
                    a.chips > b.chips ? a : b,
                );
                setAutoSelectedWildTarget(richest.id);
                setWildCountdown(3);
            }
        } else {
            setAutoSelectedWildTarget(null);
        }
    }, [
        gameData.phase,
        gameData.pendingWildTargets,
        isMyTurn,
        gameData.lrcPlayers,
        userId,
    ]);

    // Wild target countdown
    useEffect(() => {
        if (!autoSelectedWildTarget || wildCountdown <= 0) return;

        const timer = setInterval(() => {
            setWildCountdown((prev) => {
                if (prev <= 1) {
                    // Auto-confirm on countdown end
                    handleChooseWildTarget(autoSelectedWildTarget);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [autoSelectedWildTarget, wildCountdown, handleChooseWildTarget]);

    // Play sounds on phase changes
    useEffect(() => {
        if (!soundEnabled) return;

        if (
            gameData.phase === "passing-chips" &&
            gameData.chipMovements?.length
        ) {
            playChipPassSound();
        } else if (gameData.phase === "round-over" && gameData.winnerId) {
            playWinnerFanfareSound();
        }
    }, [
        gameData.phase,
        gameData.chipMovements,
        gameData.winnerId,
        soundEnabled,
    ]);

    // Valid targets for wild mode
    const wildTargets = useMemo(() => {
        return gameData.lrcPlayers.filter(
            (p) => p.id !== userId && p.chips > 0,
        );
    }, [gameData.lrcPlayers, userId]);

    // Render dice
    const renderDice = () => {
        if (!gameData.currentRoll) return null;

        return (
            <DiceTray
                dice={gameData.currentRoll.map((roll) => roll.face)}
                isRolling={isRolling}
            />
        );
    };

    // Render center content (pot + dice + roll button)
    const renderCenterContent = () => {
        const showRollButton =
            isMyTurn && gameData.phase === "waiting-for-roll" && !isRolling;
        const diceCount = Math.min(3, heroPlayer?.chips ?? 0);

        return (
            <div className="flex flex-col items-center gap-4">
                {/* Center pot */}
                <CenterPot
                    chipCount={gameData.centerPot}
                    chipValue={showMoney ? gameData.settings.chipValue : 0}
                    showGlow={gameData.centerPot > 0}
                />

                {/* Dice tray */}
                {gameData.currentRoll && renderDice()}

                {/* Roll button */}
                {showRollButton && (
                    <RollButton
                        onClick={handleRollDice}
                        disabled={!isMyTurn || diceCount === 0}
                        diceCount={diceCount}
                    />
                )}

                {/* Confirm button (for showing-results phase) */}
                {isMyTurn && gameData.phase === "showing-results" && (
                    <motion.button
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg"
                        onClick={handleConfirmResults}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Confirm
                    </motion.button>
                )}

                {/* Last Chip Challenge roll button */}
                {gameData.phase === "last-chip-challenge" &&
                    gameData.lastChipChallengeActive &&
                    !gameData.lastChipChallengeRoll && (
                        <motion.button
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg"
                            onClick={handleLastChipChallengeRoll}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🎲 Take the Challenge!
                        </motion.button>
                    )}

                {/* Turn indicator for non-active players */}
                {!isMyTurn &&
                    gameData.phase === "waiting-for-roll" &&
                    currentPlayer && (
                        <div className="text-amber-300 text-sm">
                            Waiting for {currentPlayer.name} to roll...
                        </div>
                    )}

                {/* Timer display */}
                {timerActive && remainingSeconds > 0 && (
                    <div className="text-amber-400 text-sm font-mono">
                        {remainingSeconds}s remaining
                    </div>
                )}
            </div>
        );
    };

    // Find hero index in the player array
    const heroIndex = useMemo(() => {
        return gameData.lrcPlayers.findIndex((p) => p.id === userId);
    }, [gameData.lrcPlayers, userId]);

    // ── Seat assignments via shared engine (2–10 players) ───────────────────
    const playerCount = gameData.lrcPlayers.length;
    const seatAssignments = useMemo(
        () => getSeatAssignments(playerCount, heroIndex >= 0 ? heroIndex : 0),
        [playerCount, heroIndex],
    );
    // Enrich each seat with its player index BEFORE grouping so we can map
    // back to `lrcPlayers[i]` when rendering each edge.
    const seatsWithIndex = useMemo(
        () =>
            seatAssignments.map((seat, playerIndex) => ({
                ...seat,
                playerIndex,
            })),
        [seatAssignments],
    );
    const seatsByEdge = useMemo(
        () => groupSeatsByEdge(seatsWithIndex),
        [seatsWithIndex],
    ) as Record<EdgePosition, Array<(typeof seatsWithIndex)[number]>>;

    // ── Ref registry for chip-pass animation positions ──────────────────────
    // Each LrcSeat registers its outer DOM node so we can read its viewport
    // rect on demand. The center pot ref is captured the same way.
    const seatRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const centerRef = useRef<HTMLDivElement | null>(null);
    const registerSeat = useCallback(
        (playerId: string) => (node: HTMLDivElement | null) => {
            if (node) {
                seatRefs.current.set(playerId, node);
            } else {
                seatRefs.current.delete(playerId);
            }
        },
        [],
    );

    // Compute live positions only when entering the chip-pass phase. Stored
    // in state so ChipAnimationManager re-renders once positions are ready.
    const [animationPositions, setAnimationPositions] = useState<{
        playerPositions: Record<string, { x: number; y: number }>;
        centerPosition: { x: number; y: number };
    } | null>(null);

    useEffect(() => {
        if (
            gameData.phase !== "passing-chips" ||
            !gameData.chipMovements?.length
        ) {
            setAnimationPositions(null);
            return;
        }
        // Defer one frame so any layout shift settles before measuring.
        const raf = requestAnimationFrame(() => {
            const playerPositions: Record<string, { x: number; y: number }> =
                {};
            seatRefs.current.forEach((node, playerId) => {
                const r = node.getBoundingClientRect();
                playerPositions[playerId] = {
                    x: r.left + r.width / 2,
                    y: r.top + r.height / 2,
                };
            });
            const centerNode = centerRef.current;
            const centerRect = centerNode?.getBoundingClientRect();
            const centerPosition = centerRect
                ? {
                      x: centerRect.left + centerRect.width / 2,
                      y: centerRect.top + centerRect.height / 2,
                  }
                : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            setAnimationPositions({ playerPositions, centerPosition });
        });
        return () => cancelAnimationFrame(raf);
    }, [gameData.phase, gameData.chipMovements]);

    return (
        <div className="h-dvh w-full overflow-hidden bg-linear-to-b from-emerald-900 to-emerald-950">
            <RotateDeviceOverlay />

            <GameTable
                playerCount={playerCount}
                feltGradient="from-amber-900 via-amber-800 to-yellow-900"
            >
                {/* Top edge */}
                {seatsByEdge.top.length > 0 && (
                    <EdgeRegion position="top">
                        <div className="flex flex-row items-end justify-around w-full gap-2">
                            {seatsByEdge.top.map((seat) => {
                                const player =
                                    gameData.lrcPlayers[seat.playerIndex];
                                if (!player) return null;
                                return (
                                    <LrcSeat
                                        key={player.id}
                                        player={player}
                                        isConnected={
                                            gameData.players[player.id]
                                                ?.isConnected ?? true
                                        }
                                        isCurrentTurn={
                                            player.id === currentPlayer?.id
                                        }
                                        isHero={false}
                                        isWinner={
                                            player.id === gameData.winnerId
                                        }
                                        chipValue={gameData.settings.chipValue}
                                        showMoney={showMoney}
                                        seatPosition="top"
                                        turnTimer={
                                            player.id === currentPlayer?.id
                                                ? turnTimerProps
                                                : undefined
                                        }
                                        seatRef={registerSeat(player.id)}
                                    />
                                );
                            })}
                        </div>
                    </EdgeRegion>
                )}

                {/* Left edge */}
                {seatsByEdge.left.length > 0 && (
                    <EdgeRegion position="left">
                        <div className="flex flex-col items-start justify-around h-full gap-2">
                            {seatsByEdge.left.map((seat) => {
                                const player =
                                    gameData.lrcPlayers[seat.playerIndex];
                                if (!player) return null;
                                return (
                                    <LrcSeat
                                        key={player.id}
                                        player={player}
                                        isConnected={
                                            gameData.players[player.id]
                                                ?.isConnected ?? true
                                        }
                                        isCurrentTurn={
                                            player.id === currentPlayer?.id
                                        }
                                        isHero={false}
                                        isWinner={
                                            player.id === gameData.winnerId
                                        }
                                        chipValue={gameData.settings.chipValue}
                                        showMoney={showMoney}
                                        seatPosition="left"
                                        turnTimer={
                                            player.id === currentPlayer?.id
                                                ? turnTimerProps
                                                : undefined
                                        }
                                        seatRef={registerSeat(player.id)}
                                    />
                                );
                            })}
                        </div>
                    </EdgeRegion>
                )}

                {/* Right edge */}
                {seatsByEdge.right.length > 0 && (
                    <EdgeRegion position="right">
                        <div className="flex flex-col items-end justify-around h-full gap-2">
                            {seatsByEdge.right.map((seat) => {
                                const player =
                                    gameData.lrcPlayers[seat.playerIndex];
                                if (!player) return null;
                                return (
                                    <LrcSeat
                                        key={player.id}
                                        player={player}
                                        isConnected={
                                            gameData.players[player.id]
                                                ?.isConnected ?? true
                                        }
                                        isCurrentTurn={
                                            player.id === currentPlayer?.id
                                        }
                                        isHero={false}
                                        isWinner={
                                            player.id === gameData.winnerId
                                        }
                                        chipValue={gameData.settings.chipValue}
                                        showMoney={showMoney}
                                        seatPosition="right"
                                        turnTimer={
                                            player.id === currentPlayer?.id
                                                ? turnTimerProps
                                                : undefined
                                        }
                                        seatRef={registerSeat(player.id)}
                                    />
                                );
                            })}
                        </div>
                    </EdgeRegion>
                )}

                {/* Bottom edge — hero */}
                {seatsByEdge.bottom.length > 0 &&
                    (() => {
                        const seat = seatsByEdge.bottom[0];
                        const player = gameData.lrcPlayers[seat.playerIndex];
                        if (!player) return null;
                        return (
                            <EdgeRegion position="bottom" isHero>
                                <LrcSeat
                                    player={player}
                                    isConnected={
                                        gameData.players[player.id]
                                            ?.isConnected ?? true
                                    }
                                    isCurrentTurn={
                                        player.id === currentPlayer?.id
                                    }
                                    isHero
                                    isWinner={player.id === gameData.winnerId}
                                    chipValue={gameData.settings.chipValue}
                                    showMoney={showMoney}
                                    seatPosition="bottom"
                                    turnTimer={
                                        player.id === currentPlayer?.id
                                            ? turnTimerProps
                                            : undefined
                                    }
                                    seatRef={registerSeat(player.id)}
                                />
                            </EdgeRegion>
                        );
                    })()}

                {/* Center: pot, dice, action buttons, pass-direction indicator */}
                <TableCenter>
                    <div
                        ref={centerRef}
                        className="flex flex-col items-center gap-2"
                    >
                        <PassDirectionIndicator
                            show={gameData.phase === "passing-chips"}
                        />
                        {renderCenterContent()}
                    </div>
                </TableCenter>
            </GameTable>

            {/* Chip animations — fed live positions from refs */}
            {gameData.chipMovements && gameData.phase === "passing-chips" && (
                <ChipAnimationManager
                    movements={gameData.chipMovements}
                    playerPositions={animationPositions?.playerPositions}
                    centerPosition={animationPositions?.centerPosition}
                    onComplete={() => {
                        // Animations complete - server drives next phase
                    }}
                />
            )}

            {/* Last Chip Challenge banner */}
            <LastChipChallengeBanner
                isActive={gameData.lastChipChallengeActive}
                challengerName={
                    gameData.lrcPlayers.find(
                        (p) =>
                            p.chips === 1 &&
                            gameData.phase === "last-chip-challenge",
                    )?.name ?? "Player"
                }
                diceCount={1}
            />

            {/* Wild Target Modal */}
            <WildTargetModal
                isOpen={
                    gameData.phase === "wild-target-selection" &&
                    isMyTurn &&
                    gameData.pendingWildTargets.length > 0
                }
                targets={wildTargets}
                autoSelectedId={autoSelectedWildTarget}
                countdown={wildCountdown}
                onSelectTarget={handleChooseWildTarget}
                onConfirmAuto={() => {
                    if (autoSelectedWildTarget) {
                        handleChooseWildTarget(autoSelectedWildTarget);
                    }
                }}
            />

            {/* Round Summary Modal */}
            <RoundSummaryModal
                isOpen={gameData.phase === "round-over"}
                winner={winner ?? null}
                players={gameData.lrcPlayers}
                potChips={gameData.centerPot}
                chipValue={gameData.settings.chipValue}
                startingChips={gameData.settings.startingChips}
                roundNumber={gameData.roundNumber}
                isLeader={isLeader}
                lastChipChallengeSuccess={gameData.lastChipChallengeSuccess}
                onPlayAgain={handlePlayAgain}
                onReturnToLobby={handleReturnToLobby}
            />

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId}>
                <GameSettingToggle
                    storageKey="lrc.soundEnabled"
                    label="Sound Effects"
                    icon={
                        soundEnabled ? (
                            <Volume2 className="h-4 w-4" />
                        ) : (
                            <VolumeX className="h-4 w-4" />
                        )
                    }
                    defaultValue={true}
                />
            </GameMenu>
        </div>
    );
}
