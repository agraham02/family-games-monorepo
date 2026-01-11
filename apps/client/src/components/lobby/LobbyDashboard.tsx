import { useEffect, useState, useCallback, useMemo } from "react";
import { getAvailableGames } from "@/services/lobby";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useJoinRequests } from "@/hooks";
import { toast } from "sonner";
import { GameTypeMetadata, LobbyData, GameSettings } from "@/types";
import { motion } from "framer-motion";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import PlayerListCard from "@/components/lobby/PlayerListCard";
import AvailableGamesCard from "@/components/lobby/AvailableGamesCard";
import TeamAssignmentCard from "@/components/lobby/TeamAssignmentCard";
import RoomControlsCard from "@/components/lobby/RoomControlsCard";
import GameSettingsCard from "@/components/lobby/GameSettingsCard";

export default function LobbyDashboard({
    lobbyData,
}: {
    lobbyData: LobbyData;
}) {
    const [availableGames, setAvailableGames] = useState<GameTypeMetadata[]>(
        []
    );
    const [selectedGame, setSelectedGame] = useState<string | null>(
        lobbyData.selectedGameType
    );
    const [gameSettings, setGameSettings] = useState<GameSettings>(
        lobbyData.gameSettings ?? {}
    );
    const selectedGameMetadata = availableGames.find(
        (g) => g.type === selectedGame
    );

    // Compute effective team configuration
    // For games like dominoes that conditionally require teams based on settings
    const effectiveTeamConfig = useMemo(() => {
        // Check if game requires teams statically
        if (selectedGameMetadata?.requiresTeams) {
            return {
                requiresTeams: true,
                numTeams: selectedGameMetadata.numTeams ?? 2,
                playersPerTeam: selectedGameMetadata.playersPerTeam ?? 2,
            };
        }
        // Check if dominoes is in team mode
        if (selectedGame === "dominoes" && gameSettings.gameMode === "team") {
            return {
                requiresTeams: true,
                numTeams: 2,
                playersPerTeam: 2,
            };
        }
        return { requiresTeams: false, numTeams: 0, playersPerTeam: 0 };
    }, [selectedGameMetadata, selectedGame, gameSettings.gameMode]);

    // Get session and socket context
    const { userId, roomId } = useSession();
    const { socket, connected } = useWebSocket();
    const users = lobbyData.users;
    const teams = lobbyData.teams ?? [];
    const leaderId = lobbyData.leaderId;
    const isPartyLeader = userId === leaderId;

    // Handle join requests for private rooms (leader only)
    useJoinRequests(isPartyLeader, roomId);

    useEffect(() => {
        async function fetchAvailableGames() {
            try {
                const { games } = await getAvailableGames();
                setAvailableGames(games);
            } catch (error) {
                if (error instanceof Error && error.message) {
                    toast.error(
                        "Failed to load available games: " + error.message
                    );
                } else {
                    toast.error("Failed to load available games");
                }
            }
        }
        fetchAvailableGames();
    }, []);

    useEffect(() => {
        setSelectedGame(lobbyData.selectedGameType);
    }, [lobbyData.selectedGameType]);

    useEffect(() => {
        setGameSettings(lobbyData.gameSettings ?? {});
    }, [lobbyData.gameSettings]);

    // Handle game settings changes
    const handleGameSettingsChange = useCallback(
        (newSettings: GameSettings) => {
            if (!socket || !connected || !isPartyLeader) return;
            setGameSettings(newSettings);
            socket.emit("update_game_settings", {
                roomId,
                userId,
                gameSettings: newSettings,
            });
        },
        [socket, connected, roomId, userId, isPartyLeader]
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 w-full max-w-6xl mx-auto mt-6 md:mt-8 px-0"
        >
            {/* Left Column - Players */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
                <PlayerListCard
                    users={lobbyData.users}
                    leaderId={lobbyData.leaderId}
                    readyStates={lobbyData.readyStates}
                    isPartyLeader={isPartyLeader}
                />
            </motion.div>

            {/* Middle Column - Games & Game Settings */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-4 flex flex-col gap-4 md:gap-6"
            >
                <AvailableGamesCard
                    availableGames={availableGames}
                    selectedGame={selectedGame}
                    isPartyLeader={isPartyLeader}
                />
                {selectedGame && (
                    <GameSettingsCard
                        gameType={selectedGame}
                        settings={gameSettings}
                        onSettingsChange={handleGameSettingsChange}
                        isLeader={isPartyLeader}
                    />
                )}
            </motion.div>

            {/* Right Column - Teams & Controls */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-4 flex flex-col gap-4 md:gap-6"
            >
                {!selectedGame && (
                    <Card className="backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
                        <CardHeader className="text-center pb-3">
                            <CardTitle className="text-lg font-semibold">
                                Choose a Game to Begin
                            </CardTitle>
                            <CardDescription className="text-zinc-500 dark:text-zinc-400">
                                Select a game from the list above to configure
                                settings and start playing
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {effectiveTeamConfig.requiresTeams && (
                    <TeamAssignmentCard
                        users={users}
                        teams={teams}
                        numTeams={effectiveTeamConfig.numTeams}
                        playersPerTeam={effectiveTeamConfig.playersPerTeam}
                        isPartyLeader={isPartyLeader}
                    />
                )}

                {isPartyLeader && (
                    <RoomControlsCard
                        selectedGame={selectedGame}
                        isPartyLeader={isPartyLeader}
                        roomSettings={lobbyData.settings}
                        gameSettings={gameSettings}
                    />
                )}
            </motion.div>
        </motion.div>
    );
}
