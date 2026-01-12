import { useEffect, useState, useRef, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ShuffleIcon, XIcon, UserIcon, PlusIcon } from "lucide-react";
import { getInitials, truncateName } from "@shared/utils";
import { getTeamName } from "@shared/constants";
import { getAvatarColor, TEAM_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

type TeamAssignmentEditorProps = {
    users: { id: string; name: string }[];
    teams: string[][];
    numTeams: number;
    playersPerTeam: number;
    onUpdateTeams: (teams: string[][]) => void;
};

export default function TeamAssignmentEditor({
    users,
    teams,
    numTeams,
    playersPerTeam,
    onUpdateTeams,
}: TeamAssignmentEditorProps) {
    // Local teams state: array of arrays of user IDs
    const [localTeams, setLocalTeams] = useState<string[][]>(() =>
        initializeTeams(teams, numTeams, playersPerTeam)
    );

    // Selected player for assignment (null = no selection)
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
        null
    );

    // Track if this is the initial mount to prevent emitting on sync
    const isInitialMount = useRef(true);
    const lastEmittedTeams = useRef<string>(JSON.stringify(teams));

    // Stabilize onUpdateTeams reference to prevent unnecessary re-renders
    const onUpdateTeamsRef = useRef(onUpdateTeams);
    onUpdateTeamsRef.current = onUpdateTeams;

    // Socket/context for randomize
    const { socket, connected } = useWebSocket();
    const { roomId, userId } = useSession();

    // Compute assigned and unassigned users
    const assigned = new Set(localTeams.flat().filter(Boolean));
    const unassigned = users.filter((u) => !assigned.has(u.id));

    // Initialize teams with correct shape
    function initializeTeams(
        existingTeams: string[][],
        numTeams: number,
        playersPerTeam: number
    ): string[][] {
        const result: string[][] = [];
        for (let i = 0; i < numTeams; i++) {
            const team: string[] = [];
            const existing = existingTeams[i] || [];
            for (let j = 0; j < playersPerTeam; j++) {
                team.push(existing[j] || "");
            }
            result.push(team);
        }
        return result;
    }

    // Emit team changes to server
    const emitTeamChange = useCallback((newTeams: string[][]) => {
        const teamsJson = JSON.stringify(newTeams);
        // Only emit if teams actually changed
        if (teamsJson !== lastEmittedTeams.current) {
            lastEmittedTeams.current = teamsJson;
            onUpdateTeamsRef.current(newTeams);
        }
    }, []);

    // Handle clicking on a player chip (from unassigned pool)
    function handlePlayerClick(playerId: string) {
        if (selectedPlayerId === playerId) {
            // Deselect if already selected
            setSelectedPlayerId(null);
        } else {
            setSelectedPlayerId(playerId);
        }
    }

    // Handle clicking on a team slot
    function handleSlotClick(teamIdx: number, slotIdx: number) {
        const currentOccupant = localTeams[teamIdx][slotIdx];

        if (selectedPlayerId) {
            // We have a player selected - assign them to this slot
            const newTeams = localTeams.map((team) => [...team]);
            // Remove selected player from any existing slot
            for (let t = 0; t < newTeams.length; t++) {
                for (let s = 0; s < newTeams[t].length; s++) {
                    if (newTeams[t][s] === selectedPlayerId) {
                        newTeams[t][s] = "";
                    }
                }
            }
            // Assign to the clicked slot
            newTeams[teamIdx][slotIdx] = selectedPlayerId;
            setLocalTeams(newTeams);
            setSelectedPlayerId(null);
            // Emit change immediately
            emitTeamChange(newTeams);
        } else if (currentOccupant) {
            // No selection, but slot is occupied - select this player for move/swap
            setSelectedPlayerId(currentOccupant);
        }
    }

    // Handle removing a player from a slot
    function handleRemoveFromSlot(
        teamIdx: number,
        slotIdx: number,
        e: React.MouseEvent
    ) {
        e.stopPropagation();
        const newTeams = localTeams.map((team) => [...team]);
        newTeams[teamIdx][slotIdx] = "";
        setLocalTeams(newTeams);
        setSelectedPlayerId(null);
        // Emit change immediately
        emitTeamChange(newTeams);
    }

    // Randomize teams (server-side)
    function handleRandomize() {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }
        socket.emit("randomize_teams", { roomId, userId });
    }

    // Sync local state when props change (from server updates)
    useEffect(() => {
        const newTeams = initializeTeams(teams, numTeams, playersPerTeam);
        setLocalTeams(newTeams);
        // Update the last emitted ref to prevent re-emitting server updates
        lastEmittedTeams.current = JSON.stringify(newTeams);
        isInitialMount.current = false;
    }, [teams, numTeams, playersPerTeam]);

    // Clear selection when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-team-editor]")) {
                setSelectedPlayerId(null);
            }
        }
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col gap-4" data-team-editor>
            {/* Teams Grid */}
            <div className="grid grid-cols-2 gap-3">
                {localTeams.map((team, teamIdx) => {
                    const colors = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                    return (
                        <div
                            key={teamIdx}
                            className={cn(
                                "flex flex-col gap-2 p-3 rounded-xl border-2 min-h-[120px]",
                                colors.bg,
                                colors.border
                            )}
                        >
                            <div
                                className={cn(
                                    "font-semibold text-xs uppercase tracking-wide",
                                    colors.header
                                )}
                            >
                                {getTeamName(teamIdx)}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                {team.map((playerId, slotIdx) => {
                                    const player = users.find(
                                        (u) => u.id === playerId
                                    );
                                    const isEmpty = !playerId;
                                    const isSelected =
                                        selectedPlayerId === playerId;

                                    return (
                                        <div
                                            key={slotIdx}
                                            onClick={() =>
                                                handleSlotClick(
                                                    teamIdx,
                                                    slotIdx
                                                )
                                            }
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all min-h-[36px]",
                                                isEmpty
                                                    ? "border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                                                    : "bg-white/80 dark:bg-zinc-900/50 border border-transparent",
                                                isSelected &&
                                                    "ring-2 ring-offset-1",
                                                isSelected && colors.ring,
                                                selectedPlayerId &&
                                                    isEmpty &&
                                                    "border-solid border-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                                            )}
                                        >
                                            {isEmpty ? (
                                                <div className="flex items-center gap-2 text-zinc-400 text-xs w-full">
                                                    <PlusIcon className="w-3.5 h-3.5" />
                                                    <span className="truncate">
                                                        {selectedPlayerId
                                                            ? "Click to assign"
                                                            : "Empty slot"}
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Avatar
                                                        className={cn(
                                                            "w-6 h-6 flex-shrink-0",
                                                            getAvatarColor(
                                                                player?.name ||
                                                                    ""
                                                            )
                                                        )}
                                                    >
                                                        <AvatarFallback className="text-white text-[10px] font-semibold bg-transparent">
                                                            {getInitials(
                                                                player?.name ||
                                                                    "?"
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate flex-1 max-w-[80px]">
                                                                {truncateName(
                                                                    player?.name ||
                                                                        "Unknown",
                                                                    10
                                                                )}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>
                                                                {player?.name}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-5 w-5 ml-auto flex-shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                        onClick={(e) =>
                                                            handleRemoveFromSlot(
                                                                teamIdx,
                                                                slotIdx,
                                                                e
                                                            )
                                                        }
                                                        type="button"
                                                        title="Remove from team"
                                                    >
                                                        <XIcon className="w-3 h-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Unassigned Players */}
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium text-xs text-zinc-700 dark:text-zinc-200">
                        Unassigned Players
                    </span>
                    <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                    >
                        {unassigned.length}
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {unassigned.length === 0 ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            ✓ All players assigned!
                        </span>
                    ) : (
                        unassigned.map((u) => {
                            const isSelected = selectedPlayerId === u.id;
                            return (
                                <Tooltip key={u.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePlayerClick(u.id)
                                            }
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm border transition-all cursor-pointer",
                                                "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700",
                                                "hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md",
                                                isSelected &&
                                                    "ring-2 ring-blue-400 dark:ring-blue-500 border-blue-400 dark:border-blue-500"
                                            )}
                                        >
                                            <Avatar
                                                className={cn(
                                                    "w-5 h-5",
                                                    getAvatarColor(u.name)
                                                )}
                                            >
                                                <AvatarFallback className="text-white text-[9px] font-semibold bg-transparent">
                                                    {getInitials(u.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate max-w-[60px]">
                                                {truncateName(u.name, 8)}
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>
                                            {isSelected
                                                ? "Click a team slot to assign"
                                                : u.name}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleRandomize}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-300 dark:border-zinc-600"
                >
                    <ShuffleIcon className="w-3.5 h-3.5" />
                    Randomize Teams
                </Button>
            </div>
        </div>
    );
}
