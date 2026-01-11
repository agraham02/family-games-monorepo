import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { User } from "@/types";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { toast } from "sonner";
import { getAvatarColor, getInitials } from "@/lib/playerUtils";
import {
    CrownIcon,
    CheckCircle2Icon,
    CircleIcon,
    UserXIcon,
    ShieldPlusIcon,
    UsersIcon,
} from "lucide-react";

export default function PlayerListCard({
    users,
    leaderId,
    readyStates,
    isPartyLeader,
}: {
    users: User[];
    leaderId: string;
    readyStates: Record<string, boolean>;
    isPartyLeader: boolean;
}) {
    const { socket, connected } = useWebSocket();
    const { userId, roomId } = useSession();
    const [isReady, setIsReady] = useState(!!readyStates[userId]);
    const [kickTarget, setKickTarget] = useState<User | null>(null);

    // Sync local ready state with server state when readyStates changes
    useEffect(() => {
        setIsReady(!!readyStates[userId]);
    }, [readyStates, userId]);

    function handleToggleReady() {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }

        socket.emit("toggle_ready", { roomId, userId });
        setIsReady((prev) => !prev);
    }

    function handleKick(user: User) {
        setKickTarget(user);
    }

    function confirmKick() {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }
        if (kickTarget) {
            socket.emit("kick_user", {
                roomId,
                userId,
                targetUserId: kickTarget.id,
            });
            setKickTarget(null);
        }
    }

    function handlePromote(newLeaderId: string) {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }
        socket.emit("promote_leader", { roomId, userId, newLeaderId });
        toast(
            `Promoted ${
                users.find((u) => u.id === newLeaderId)?.name
            } to leader`
        );
    }

    return (
        <Card className="h-full backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Players
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {users.length} online
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                    {users.map((user) => {
                        const ready = readyStates[user.id];
                        const isCurrentUser = user.id === userId;
                        const isLeader = user.id === leaderId;

                        return (
                            <motion.div
                                key={user.id}
                                initial={{ x: -30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -30, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                                    isCurrentUser
                                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ring-1 ring-blue-200 dark:ring-blue-800"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <Avatar
                                        className={`w-10 h-10 ${getAvatarColor(
                                            user.name
                                        )}`}
                                    >
                                        <AvatarFallback className="text-white font-semibold text-sm bg-transparent">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isLeader && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-zinc-900">
                                            <CrownIcon className="w-3 h-3 text-amber-900" />
                                        </div>
                                    )}
                                </div>

                                {/* Name and Status */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate text-zinc-900 dark:text-white">
                                            {user.name}
                                        </span>
                                        {isCurrentUser && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs py-0 px-1.5 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                                            >
                                                You
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {ready ? (
                                            <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <CircleIcon className="w-3.5 h-3.5 text-zinc-400" />
                                        )}
                                        <span
                                            className={`text-xs ${
                                                ready
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-zinc-500 dark:text-zinc-400"
                                            }`}
                                        >
                                            {ready ? "Ready" : "Not ready"}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5">
                                    {isCurrentUser && (
                                        <Button
                                            size="sm"
                                            onClick={handleToggleReady}
                                            className={
                                                isReady
                                                    ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                                                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                                            }
                                        >
                                            {isReady ? "Unready" : "Ready"}
                                        </Button>
                                    )}
                                    {!isCurrentUser && isPartyLeader && (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                                        onClick={() =>
                                                            handlePromote(
                                                                user.id
                                                            )
                                                        }
                                                    >
                                                        <ShieldPlusIcon className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Promote to leader
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                                                        onClick={() =>
                                                            handleKick(user)
                                                        }
                                                    >
                                                        <UserXIcon className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Kick player
                                                </TooltipContent>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </CardContent>

            {/* Kick Confirmation Dialog */}
            <ConfirmDialog
                open={!!kickTarget}
                title="Kick Player"
                description={`Are you sure you want to kick ${
                    kickTarget?.name || "this player"
                } from the room?`}
                confirmText="Kick"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={confirmKick}
                onCancel={() => setKickTarget(null)}
            />
        </Card>
    );
}
