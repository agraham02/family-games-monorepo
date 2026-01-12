import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import TeamAssignmentEditor from "./TeamAssignmentEditor";
import TeamAssignmentView from "./TeamAssignmentView";
import { User } from "@shared/types";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { UsersRoundIcon, LockIcon } from "lucide-react";

interface TeamAssignmentCardProps {
    users: User[];
    teams: string[][];
    numTeams: number;
    playersPerTeam: number;
    isPartyLeader: boolean;
}

export default function TeamAssignmentCard({
    users,
    teams,
    numTeams,
    playersPerTeam,
    isPartyLeader,
}: TeamAssignmentCardProps) {
    const { socket, connected } = useWebSocket();
    const { userId, roomId } = useSession();

    if (numTeams === 0) {
        return null;
    }

    return (
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <UsersRoundIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        Team Assignment
                    </CardTitle>
                    {!isPartyLeader && (
                        <Badge variant="outline" className="text-xs gap-1">
                            <LockIcon className="w-3 h-3" />
                            View only
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isPartyLeader ? (
                    <TeamAssignmentEditor
                        users={users}
                        teams={
                            teams ?? Array.from({ length: numTeams }, () => [])
                        }
                        numTeams={numTeams}
                        playersPerTeam={playersPerTeam}
                        onUpdateTeams={(newTeams) => {
                            if (!socket || !connected) {
                                toast.error("Not connected to the server");
                                return;
                            }
                            socket.emit("set_teams", {
                                roomId,
                                userId,
                                teams: newTeams,
                            });
                        }}
                    />
                ) : (
                    <TeamAssignmentView
                        users={users}
                        teams={
                            teams ?? Array.from({ length: numTeams }, () => [])
                        }
                    />
                )}
            </CardContent>
        </Card>
    );
}
