"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import {
    PlayCircleIcon,
    EyeIcon,
    UsersIcon,
    AlertCircleIcon,
    XCircleIcon,
} from "lucide-react";
import { LobbyData } from "@shared/types";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { attemptDirectGameRejoin } from "@/services/lobby";

interface GameInProgressBannerProps {
    lobbyData: LobbyData;
}

export default function GameInProgressBanner({
    lobbyData,
}: GameInProgressBannerProps) {
    const { socket, connected } = useWebSocket();
    const { userId, userName } = useSession();
    const router = useRouter();

    // Check if this user is the leader
    const isLeader = lobbyData.leaderId === userId;

    // Check if this user is a spectator
    const isSpectator = lobbyData.spectators?.includes(userId || "");

    // Check if this user is a player in the game (not a spectator)
    const isActivePlayer =
        lobbyData.users.some((u) => u.id === userId) && !isSpectator;

    // Find disconnected players (available slots)
    const disconnectedPlayers = lobbyData.users.filter(
        (u) => u.isConnected === false && !lobbyData.spectators?.includes(u.id)
    );
    const hasOpenSlots = disconnectedPlayers.length > 0;

    async function handleJoinGame() {
        // If already a player, trigger rejoin to ensure server reconnection
        if (isActivePlayer) {
            try {
                // Call rejoin to trigger server-side socket re-registration and resume logic
                await attemptDirectGameRejoin(
                    lobbyData.code,
                    userName || "Player",
                    userId
                );
                router.push(`/game/${lobbyData.code}`);
            } catch (error) {
                console.error("Error rejoining game:", error);
                toast.error("Failed to rejoin game");
            }
            return;
        }

        // If there are open slots and user is spectator, claim first available
        if (hasOpenSlots && isSpectator && disconnectedPlayers[0]) {
            socket?.emit("claim_player_slot", {
                roomId: lobbyData.roomId,
                userId,
                targetSlotUserId: disconnectedPlayers[0].id,
            });
            toast.success(`Claiming ${disconnectedPlayers[0].name}'s slot...`);
        }
    }

    function handleSpectate() {
        socket?.emit("spectate_game", {
            roomCode: lobbyData.code,
            userId,
            userName: userName || "Spectator",
        });
        router.push(`/game/${lobbyData.code}?spectate=true`);
    }

    function handleEndGame() {
        if (!isLeader) return;

        const confirmed = confirm(
            "Are you sure you want to end the game and return all players to the lobby?"
        );

        if (confirmed) {
            socket?.emit("abort_game", {
                roomId: lobbyData.roomId,
                userId,
            });
            toast.info("Ending game...");
        }
    }

    // Don't show if not in-game
    if (lobbyData.state !== "in-game") {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto mt-4"
        >
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                <AlertCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                                    Game in Progress
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-amber-700 dark:text-amber-300">
                                    <Badge
                                        variant="outline"
                                        className="border-amber-500/50"
                                    >
                                        {lobbyData.selectedGameType}
                                    </Badge>
                                    <span className="flex items-center gap-1">
                                        <UsersIcon className="w-3 h-3" />
                                        {
                                            lobbyData.users.filter(
                                                (u) =>
                                                    u.isConnected !== false &&
                                                    !lobbyData.spectators?.includes(
                                                        u.id
                                                    )
                                            ).length
                                        }{" "}
                                        active players
                                    </span>
                                    {lobbyData.isPaused && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        >
                                            PAUSED
                                        </Badge>
                                    )}
                                    {hasOpenSlots && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                        >
                                            {disconnectedPlayers.length} slot
                                            {disconnectedPlayers.length > 1
                                                ? "s"
                                                : ""}{" "}
                                            available
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* End Game button - leader only */}
                            {isLeader && (
                                <Button
                                    variant="destructive"
                                    onClick={handleEndGame}
                                    disabled={!connected}
                                    className="flex-1 sm:flex-none"
                                >
                                    <XCircleIcon className="w-4 h-4 mr-2" />
                                    End Game
                                </Button>
                            )}

                            {/* Join button - for active players or spectators with open slots */}
                            {(isActivePlayer ||
                                (isSpectator && hasOpenSlots)) && (
                                <Button
                                    onClick={handleJoinGame}
                                    disabled={!connected}
                                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <PlayCircleIcon className="w-4 h-4 mr-2" />
                                    {isActivePlayer
                                        ? "Return to Game"
                                        : "Join Game"}
                                </Button>
                            )}

                            {/* Spectate button - for non-players */}
                            {!isActivePlayer && (
                                <Button
                                    variant="outline"
                                    onClick={handleSpectate}
                                    disabled={!connected}
                                    className="flex-1 sm:flex-none border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                >
                                    <EyeIcon className="w-4 h-4 mr-2" />
                                    Spectate
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
