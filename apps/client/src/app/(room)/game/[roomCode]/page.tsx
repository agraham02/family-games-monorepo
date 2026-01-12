"use client";

import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import React, { useEffect, useState, useCallback } from "react";
import GamePausedOverlay from "@/components/games/GamePausedOverlay";
import SpectatorBanner from "@/components/games/SpectatorBanner";
import { getGameComponent } from "@/components/games/registry";
import { GameSkeleton } from "@/components/skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameData, GameEventPayload, PlayerData, User } from "@shared/types";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { useRoomEvents } from "@/hooks/useRoomEvents";
import { useGameDirectURLRecovery } from "@/hooks/useGameDirectURLRecovery";
import { getSocket } from "@/lib/socket";
import { useOptimisticGameAction } from "@/hooks/useOptimisticGameAction";
import { optimisticGameReducer } from "@/lib/gameReducers";
import { NameEntryModal } from "@/components/NameEntryModal";

export default function GamePage() {
    const { roomId, userId } = useSession();
    const { socket, connected, emit } = useWebSocket();
    const { roomCode }: { roomCode: string } = useParams();
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [timeoutAt, setTimeoutAt] = useState<string | null>(null);
    const [disconnectedPlayers, setDisconnectedPlayers] = useState<User[]>([]);
    const [leaderId, setLeaderId] = useState<string | null>(null);
    const [isSpectator, setIsSpectator] = useState(false);
    // Track spectators for potential future UI display
    const [, setSpectators] = useState<string[]>([]);
    // Accessibility: Track announcements for screen readers
    const [announcement, setAnnouncement] = useState<string>("");
    const router = useRouter();

    // Handle direct game URL recovery (rejoin with name prompt if session lost)
    // This hook also validates that URL roomCode matches stored roomId
    const { isRecovering, showNameModal, onNameSubmit, onNameCancel } =
        useGameDirectURLRecovery({
            onSessionRestored: () => {
                // Session is now restored, component will re-render with roomId/userId
            },
            onRecoveryFailed: () => {
                // User redirected to lobby by the hook
            },
        });

    // Optimistic action handling
    const optimisticAction = useOptimisticGameAction({
        socket,
        connected,
        roomId: roomId ?? "",
        userId: userId ?? "",
        gameData,
        playerData,
        setGameData,
        setPlayerData,
        optimisticReducer: optimisticGameReducer,
        onRollback: (reason) => {
            toast.error(`Action reverted: ${reason}`);
        },
        actionTimeout: 5000,
    });

    // Use shared room events hook for common events
    useRoomEvents({
        roomCode,
        autoNavigateOnGameStart: false, // Already on game page
        isSpectator,
        onSync: (roomState) => {
            // Update leader from room state
            setLeaderId(roomState.leaderId);
            // Update spectators list
            setSpectators(roomState.spectators || []);
            // Check if current user is a spectator (and update the flag bidirectionally)
            const isUserSpectator =
                roomState.spectators?.includes(userId || "") ?? false;
            setIsSpectator(isUserSpectator);
            // Sync paused state from room (important for when joining a paused game)
            if (roomState.isPaused !== undefined) {
                setIsPaused(roomState.isPaused);
                // Use timeoutAt directly from server if available
                if (roomState.isPaused && roomState.timeoutAt) {
                    setTimeoutAt(roomState.timeoutAt);
                } else if (!roomState.isPaused) {
                    setTimeoutAt(null);
                }
                // Update disconnected players from room state
                if (roomState.isPaused) {
                    const disconnected = roomState.users.filter(
                        (u) =>
                            u.isConnected === false &&
                            !roomState.spectators?.includes(u.id)
                    );
                    setDisconnectedPlayers(disconnected);
                }
            }
            // If room is in lobby state, redirect back to lobby
            if (roomState.state === "lobby") {
                toast.info("Game ended. Returning to lobby.");
                router.push(`/lobby/${roomCode}`);
            }
        },
        onGameAborted: () => {
            setIsPaused(false);
            setTimeoutAt(null);
            setDisconnectedPlayers([]);
            router.push(`/lobby/${roomCode}`);
        },
        onGamePaused: (timeoutAt) => {
            setIsPaused(true);
            setTimeoutAt(timeoutAt);
        },
        onGameResumed: () => {
            setIsPaused(false);
            setTimeoutAt(null);
            setDisconnectedPlayers([]);
        },
    });

    // Handle game-specific events
    const handleGameEvent = useCallback(
        (payload: GameEventPayload<GameData, PlayerData>) => {
            console.log("📨 Game event:", payload);
            switch (payload.event) {
                case "sync":
                    setGameData(payload.gameState);
                    setLeaderId(payload.gameState.leaderId);
                    // Update disconnected players from game state
                    const disconnected = Object.values(
                        payload.gameState.players
                    ).filter((p) => p.isConnected === false);
                    setDisconnectedPlayers(disconnected);
                    // Request player-specific state
                    emit("get_player_state", { roomId, userId });
                    break;
                case "player_sync":
                    setPlayerData(payload.playerState);
                    break;
                case "player_left":
                    toast.info(`${payload.userName} has left the game.`);
                    break;
                case "game_paused":
                    setIsPaused(true);
                    setTimeoutAt(payload.timeoutAt);
                    toast.warning(
                        "Game paused: Waiting for players to reconnect..."
                    );
                    break;
                case "game_resumed":
                    setIsPaused(false);
                    setTimeoutAt(null);
                    setDisconnectedPlayers([]);
                    toast.success("Game resumed!");
                    break;
                case "user_disconnected":
                    // Add to disconnected list if not already there
                    setDisconnectedPlayers((prev) => {
                        if (prev.some((p) => p.id === payload.userId))
                            return prev;
                        return [
                            ...prev,
                            {
                                id: payload.userId,
                                name: payload.userName || "Unknown",
                                isConnected: false,
                            },
                        ];
                    });
                    break;
                case "user_reconnected":
                    // Remove from disconnected list
                    setDisconnectedPlayers((prev) =>
                        prev.filter((p) => p.id !== payload.userId)
                    );
                    break;
            }
        },
        [emit, roomId, userId]
    );

    // Set up game event listeners
    useEffect(() => {
        if (!roomId || !userId) return;

        const sock = getSocket();

        sock.on("game_event", handleGameEvent);

        // Handle turn timeout events
        function handleTurnTimeout(payload: {
            playerId: string;
            playerName: string;
            action: "auto-bid" | "auto-play";
            gameId: string;
            timestamp: string;
        }) {
            const actionText =
                payload.action === "auto-bid"
                    ? "auto-bidding"
                    : "auto-playing a card";
            toast.warning(
                `${payload.playerName} ran out of time - ${actionText}`,
                {
                    duration: 3000,
                }
            );
        }
        sock.on("turn_timeout", handleTurnTimeout);

        // Handle spectator state (separate from player state)
        function handleSpectatorState({
            gameState,
            isSpectator: spectatorFlag,
        }: {
            gameState: GameData;
            room: unknown;
            isSpectator: boolean;
        }) {
            setGameData(gameState);
            setLeaderId(gameState.leaderId);
            setIsSpectator(spectatorFlag);
            // Spectators don't get player-specific state
            setPlayerData(null);
        }
        sock.on("spectator_state", handleSpectatorState);

        // Request game state when connected
        const requestGameState = () => {
            sock.emit("get_game_state", { roomId, userId });
            // Only request player state if not a spectator
            if (!isSpectator) {
                sock.emit("get_player_state", { roomId, userId });
            }
        };

        if (sock.connected) {
            requestGameState();
        } else {
            sock.on("connect", requestGameState);
        }

        return () => {
            sock.off("game_event", handleGameEvent);
            sock.off("turn_timeout", handleTurnTimeout);
            sock.off("spectator_state", handleSpectatorState);
            sock.off("connect", requestGameState);
        };
    }, [roomId, userId, handleGameEvent, isSpectator]);

    // Separate effect for action acknowledgements to avoid re-subscriptions
    useEffect(() => {
        const sock = getSocket();

        const handleActionAck = ({
            actionId,
            success,
            error,
        }: {
            actionId: string;
            success: boolean;
            error?: string;
        }) => {
            if (success) {
                // Pass actionId to confirm the specific action (handles out-of-order acks)
                optimisticAction.confirm(actionId);
            } else if (error) {
                console.error(`Action ${actionId} failed:`, error);
                optimisticAction.rollback(error);
            }
        };

        sock.on("action_ack", handleActionAck);

        return () => {
            sock.off("action_ack", handleActionAck);
        };
    }, [optimisticAction]);

    function handleKickPlayer(targetUserId: string) {
        emit("kick_user", { roomId, userId, targetUserId });
    }

    function handleLeaveGame() {
        emit("leave_game", { roomId, userId });
        router.push(`/lobby/${roomCode}`);
    }

    function handleClaimSlot(targetSlotUserId: string) {
        emit("claim_player_slot", { roomId, userId, targetSlotUserId });
        toast.info("Claiming player slot...");
    }

    function handleReturnToLobby() {
        if (isSpectator) {
            // Spectators can just navigate back
            router.push(`/lobby/${roomCode}`);
        } else {
            // Active players use return_to_lobby to move to spectators
            emit("return_to_lobby", { roomId, userId });
        }
    }

    // Accessibility: Announce turn changes for screen readers
    useEffect(() => {
        if (!gameData || isSpectator) return;

        const currentPlayerId = gameData.playOrder?.[gameData.currentTurnIndex];
        if (currentPlayerId === userId) {
            setAnnouncement("It's your turn");
        }
    }, [
        gameData?.currentTurnIndex,
        gameData?.playOrder,
        userId,
        isSpectator,
        gameData,
    ]);

    // Error fallback for game component crashes
    const handleGameError = useCallback(() => {
        router.push(`/lobby/${roomCode}`);
    }, [router, roomCode]);

    if (!gameData || isRecovering) {
        return (
            <>
                <NameEntryModal
                    open={showNameModal}
                    onSubmit={onNameSubmit}
                    onCancel={onNameCancel}
                    title="Rejoin Game"
                    description="Enter your name to rejoin the game."
                />
                <GameSkeleton />
            </>
        );
    }

    const isLeader = leaderId === userId;

    return (
        <main
            className={`w-full min-h-[100dvh] overflow-hidden bg-zinc-50 dark:bg-zinc-950 ${
                isSpectator ? "pt-12" : ""
            }`}
        >
            {/* Spectator Banner */}
            {isSpectator && (
                <SpectatorBanner
                    disconnectedPlayers={disconnectedPlayers}
                    onClaimSlot={handleClaimSlot}
                    onReturnToLobby={handleReturnToLobby}
                />
            )}

            {/* Pending Action Indicator */}
            {optimisticAction.hasPendingAction && (
                <div
                    className={`fixed ${
                        isSpectator ? "top-20" : "top-16"
                    } right-4 z-50 bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium`}
                >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Processing...
                </div>
            )}

            {/* Game Paused Overlay - only show for active players */}
            {!isSpectator && (
                <GamePausedOverlay
                    isPaused={isPaused}
                    disconnectedPlayers={disconnectedPlayers}
                    timeoutAt={timeoutAt}
                    isLeader={isLeader}
                    onKickPlayer={handleKickPlayer}
                    onLeaveGame={handleLeaveGame}
                />
            )}

            {/* Accessibility: Screen reader announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>

            {/* Game UI */}
            {(() => {
                const GameComponent = getGameComponent(gameData.type);
                // Show game component for spectators even without playerData
                if (GameComponent && (playerData || isSpectator)) {
                    return (
                        <ErrorBoundary
                            onReset={handleGameError}
                            fallback={
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 dark:text-zinc-400">
                                    <p>
                                        Something went wrong loading the game.
                                    </p>
                                    <button
                                        onClick={handleGameError}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        Return to Lobby
                                    </button>
                                </div>
                            }
                        >
                            <GameComponent
                                gameData={gameData}
                                playerData={playerData}
                                dispatchOptimisticAction={
                                    isSpectator
                                        ? undefined
                                        : optimisticAction.dispatch
                                }
                                isSpectator={isSpectator}
                                roomCode={roomCode}
                            />
                        </ErrorBoundary>
                    );
                }
                return (
                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
                        No game UI available for &quot;{gameData.type}&quot;
                    </div>
                );
            })()}
        </main>
    );
}
