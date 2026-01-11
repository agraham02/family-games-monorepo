import React from "react";
import { Card } from "@/components/ui/card";
import { Players } from "@/types";

interface Team {
    players: string[];
    score: number;
}

interface SpadesGameInfoProps {
    players: Players;
    teams: Record<string, Team>;
    bids: Record<string, { amount: number }>;
    playOrder: string[];
    roundTrickCounts?: Record<string, number>;
    phase?: string;
}

export default function SpadesGameInfo({
    players,
    teams,
    bids,
    playOrder,
    roundTrickCounts = {},
    phase,
}: SpadesGameInfoProps) {
    // Helper to get player name by id
    const getPlayerName = (id: string) => players[id]?.name || id;

    // Show tricks during playing, trick-result, or round-summary phases
    const showTricks =
        phase === "playing" ||
        phase === "trick-result" ||
        phase === "round-summary";

    return (
        <div className="w-full flex flex-col md:flex-row gap-4 md:gap-8 p-2 md:p-4">
            {/* Teams and scores */}
            <div className="flex-1 flex flex-col gap-2">
                <div className="text-lg font-bold mb-2">Teams</div>
                <div className="flex flex-col gap-2">
                    {Object.entries(teams).map(([teamId, team]) => {
                        // Calculate team's total tricks
                        const teamTricks = team.players.reduce(
                            (sum, pid) => sum + (roundTrickCounts[pid] || 0),
                            0
                        );
                        // Calculate team's total bid
                        const teamBid = team.players.reduce(
                            (sum, pid) => sum + (bids[pid]?.amount || 0),
                            0
                        );

                        return (
                            <Card
                                key={teamId}
                                className="p-2 flex flex-col md:flex-row md:items-center gap-2"
                            >
                                <div className="font-semibold">
                                    Team {Number(teamId) + 1}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.players.map((pid) => (
                                        <span
                                            key={pid}
                                            className="bg-blue-700/80 text-white rounded px-2 py-1 text-xs md:text-sm shadow"
                                        >
                                            {getPlayerName(pid)}
                                        </span>
                                    ))}
                                </div>
                                <div className="ml-auto flex items-center gap-4">
                                    {showTricks && (
                                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                            Tricks:{" "}
                                            <span className="font-bold">
                                                {teamTricks}
                                            </span>
                                            <span className="text-zinc-400">
                                                /{teamBid}
                                            </span>
                                        </span>
                                    )}
                                    <span className="font-bold text-sm md:text-lg">
                                        Score: {team.score}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
            {/* Player bids and tricks */}
            <div className="flex-1 flex flex-col gap-2">
                <div className="text-lg font-bold mb-2">
                    {showTricks ? "Bids & Tricks" : "Bids"}
                </div>
                <div className="flex flex-col gap-2">
                    {playOrder.map((pid) => (
                        <Card
                            key={pid}
                            className="p-2 flex flex-row items-center gap-2"
                        >
                            <span className="font-semibold w-20 md:w-28 truncate">
                                {getPlayerName(pid)}
                            </span>
                            <span className="ml-2 text-sm md:text-base">
                                Bid:{" "}
                                <span className="font-bold">
                                    {bids[pid]?.amount ?? "-"}
                                </span>
                            </span>
                            {showTricks && (
                                <span className="ml-4 text-sm md:text-base text-emerald-600 dark:text-emerald-400">
                                    Tricks:{" "}
                                    <span className="font-bold">
                                        {roundTrickCounts[pid] ?? 0}
                                    </span>
                                </span>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
