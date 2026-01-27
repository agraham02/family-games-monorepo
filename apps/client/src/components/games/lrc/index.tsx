"use client";

/**
 * LRC (Left Right Center) Game Component
 *
 * Main orchestration component for the LRC dice game.
 * Handles game phases, player interactions, and animations.
 */

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { LRCData, LRCPlayerData, LRCPlayer } from "@shared/types";
import {
    GameMenu,
    GameSettingToggle,
    useGameSetting,
} from "@/components/games/shared";
import {
    CircularPlayerLayout,
    CircularPlayerSlot,
    CircularCenter,
    DirectionArrows,
} from "@/components/games/shared/CircularPlayerLayout";
import { DiceTray, RollButton } from "./ui/Die";
import { ChipStack, ChipAnimationManager } from "./ui/ChipStack";
import { CenterPot } from "./ui/CenterPot";
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

interface PlayerSlotProps {
    player: LRCPlayer;
    isCurrentTurn: boolean;
    isHero: boolean;
    isWinner: boolean;
    chipValue: number;
    showMoney: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Slot Component (for CircularPlayerLayout)
// ─────────────────────────────────────────────────────────────────────────────

function PlayerSlot({
    player,
    isCurrentTurn,
    isHero,
    isWinner,
    chipValue,
    showMoney,
}: PlayerSlotProps) {
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
            className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                isCurrentTurn && "ring-2 ring-amber-400 bg-amber-500/20",
                isWinner && "ring-2 ring-green-400 bg-green-500/20",
                !player.isConnected && "opacity-50",
            )}
            layout
        >
            {/* Player name */}
            <div
                className={cn(
                    "text-sm font-medium truncate max-w-20",
                    isHero ? "text-amber-400" : "text-white",
                )}
            >
                {player.name}
                {isHero && " (You)"}
            </div>

            {/* Chip stack */}
            <ChipStack
                count={player.chips}
                chipValue={chipValue}
                showMoney={showMoney}
                size="sm"
            />

            {/* Money value */}
            {moneyValue && (
                <div className="text-xs text-green-400">{moneyValue}</div>
            )}

            {/* Current turn indicator */}
            {isCurrentTurn && (
                <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
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

    // Turn timer
    const { remainingSeconds, isActive: timerActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
        () => {
            // Timer start callback - could play a sound
        },
    );

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

    // Handle return to lobby
    const handleReturnToLobby = useCallback(() => {
        if (!socket || !connected) return;
        socket.emit("return_to_lobby", { roomId });
    }, [socket, connected, roomId]);

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

    return (
        <div className="h-screen w-full overflow-hidden bg-linear-to-b from-emerald-900 to-emerald-950">
            {/* Circular player layout */}
            <CircularPlayerLayout
                playerCount={gameData.lrcPlayers.length}
                heroPlayerIndex={heroIndex >= 0 ? heroIndex : 0}
            >
                {/* Player slots */}
                {gameData.lrcPlayers.map((player, idx) => (
                    <CircularPlayerSlot key={player.id} playerIndex={idx}>
                        <PlayerSlot
                            player={player}
                            isCurrentTurn={player.id === currentPlayer?.id}
                            isHero={player.id === userId}
                            isWinner={player.id === gameData.winnerId}
                            chipValue={gameData.settings.chipValue}
                            showMoney={showMoney}
                        />
                    </CircularPlayerSlot>
                ))}

                {/* Center content */}
                <CircularCenter>{renderCenterContent()}</CircularCenter>

                {/* Direction arrows during chip passing */}
                <DirectionArrows show={gameData.phase === "passing-chips"} />
            </CircularPlayerLayout>

            {/* Chip animations */}
            {gameData.chipMovements && gameData.phase === "passing-chips" && (
                <ChipAnimationManager
                    movements={gameData.chipMovements}
                    onComplete={() => {
                        // Animations complete - could trigger next phase
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
