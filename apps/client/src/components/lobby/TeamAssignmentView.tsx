import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { UserIcon } from "lucide-react";
import { getAvatarColor, getInitials } from "@/lib/playerUtils";
import { TEAM_COLORS, getTeamName } from "@/lib/teamColors";

type TeamAssignmentViewProps = {
    users: { id: string; name: string }[];
    teams: string[][];
};

export default function TeamAssignmentView({
    users,
    teams,
}: TeamAssignmentViewProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team, teamIdx) => {
                const colors = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                return (
                    <div
                        key={teamIdx}
                        className={`flex flex-col gap-3 p-4 rounded-xl border-2 ${colors.bg} ${colors.border}`}
                    >
                        <div className="flex items-center justify-between">
                            <span
                                className={`font-semibold text-sm uppercase tracking-wide ${colors.header}`}
                            >
                                {getTeamName(teamIdx)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                {team.length} player
                                {team.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                        {team.length === 0 ? (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                                <UserIcon className="w-4 h-4" />
                                No players assigned
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {team.filter(Boolean).map((playerId, idx) => {
                                    const user = users.find(
                                        (u) => u.id === playerId
                                    );
                                    const name = user?.name || "Unknown";
                                    return (
                                        <div
                                            key={playerId || `empty-${idx}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-zinc-900/50 rounded-lg"
                                        >
                                            <Avatar
                                                className={`w-7 h-7 ${getAvatarColor(
                                                    name
                                                )}`}
                                            >
                                                <AvatarFallback className="text-white text-xs font-semibold bg-transparent">
                                                    {getInitials(name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                                {name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
