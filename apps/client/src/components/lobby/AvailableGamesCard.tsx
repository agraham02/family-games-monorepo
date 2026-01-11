import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { GameTypeMetadata } from "@/types";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    Gamepad2Icon,
    SpadeIcon,
    DicesIcon,
    UsersIcon,
    CheckCircle2Icon,
    LockIcon,
} from "lucide-react";

// Map game types to icons
function getGameIcon(gameType: string) {
    switch (gameType.toLowerCase()) {
        case "spades":
            return SpadeIcon;
        case "dominoes":
            return DicesIcon;
        default:
            return Gamepad2Icon;
    }
}

// Map game types to gradient colors
function getGameGradient(gameType: string, isSelected: boolean) {
    if (!isSelected) return "";
    switch (gameType.toLowerCase()) {
        case "spades":
            return "from-indigo-500 to-purple-600";
        case "dominoes":
            return "from-amber-500 to-orange-600";
        default:
            return "from-blue-500 to-cyan-600";
    }
}

export default function AvailableGamesCard({
    availableGames,
    selectedGame,
    isPartyLeader,
}: {
    availableGames: GameTypeMetadata[];
    selectedGame: string | null;
    isPartyLeader: boolean;
}) {
    const { socket, connected } = useWebSocket();
    const { userId, roomId } = useSession();

    function handleSelectGame(gameType: string) {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }

        socket.emit("select_game", { roomId, userId, gameType });
    }

    return (
        <Card className="h-full backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Gamepad2Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        Select a Game
                    </CardTitle>
                    {!isPartyLeader && (
                        <Badge variant="outline" className="text-xs gap-1">
                            <LockIcon className="w-3 h-3" />
                            Leader only
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <AnimatePresence>
                    {availableGames.map((game) => {
                        const isSelected = selectedGame === game.type;
                        const Icon = getGameIcon(game.type);
                        const gradient = getGameGradient(game.type, isSelected);

                        return (
                            <motion.button
                                key={game.type}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                whileHover={
                                    isPartyLeader ? { scale: 1.02 } : {}
                                }
                                whileTap={isPartyLeader ? { scale: 0.98 } : {}}
                                onClick={
                                    isPartyLeader
                                        ? () => handleSelectGame(game.type)
                                        : undefined
                                }
                                disabled={!isPartyLeader}
                                className={cn(
                                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden",
                                    isSelected
                                        ? `bg-gradient-to-r ${gradient} border-transparent text-white shadow-lg`
                                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                                    !isPartyLeader &&
                                        "cursor-default opacity-80"
                                )}
                            >
                                {/* Selection indicator */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-3 right-3"
                                    >
                                        <CheckCircle2Icon className="w-5 h-5" />
                                    </motion.div>
                                )}

                                <div className="flex items-start gap-3">
                                    {/* Game Icon */}
                                    <div
                                        className={cn(
                                            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                                            isSelected
                                                ? "bg-white/20"
                                                : "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800"
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                "w-6 h-6",
                                                isSelected
                                                    ? "text-white"
                                                    : "text-zinc-600 dark:text-zinc-300"
                                            )}
                                        />
                                    </div>

                                    {/* Game Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={cn(
                                                    "font-semibold",
                                                    isSelected
                                                        ? "text-white"
                                                        : "text-zinc-900 dark:text-white"
                                                )}
                                            >
                                                {game.displayName}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-xs py-0",
                                                    isSelected
                                                        ? "bg-white/20 text-white border-0"
                                                        : "bg-zinc-200 dark:bg-zinc-700"
                                                )}
                                            >
                                                <UsersIcon className="w-3 h-3 mr-1" />
                                                {game.minPlayers ===
                                                game.maxPlayers
                                                    ? game.minPlayers
                                                    : `${game.minPlayers}-${game.maxPlayers}`}
                                            </Badge>
                                        </div>
                                        {game.description && (
                                            <p
                                                className={cn(
                                                    "text-sm line-clamp-2",
                                                    isSelected
                                                        ? "text-white/80"
                                                        : "text-zinc-500 dark:text-zinc-400"
                                                )}
                                            >
                                                {game.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>

                {availableGames.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        <Gamepad2Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Loading games...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
