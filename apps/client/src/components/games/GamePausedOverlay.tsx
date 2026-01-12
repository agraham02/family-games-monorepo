"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { User } from "@shared/types";
import { Loader2, UserX, Clock } from "lucide-react";

interface GamePausedOverlayProps {
    isPaused: boolean;
    disconnectedPlayers: User[];
    timeoutAt: string | null;
    isLeader: boolean;
    onKickPlayer?: (userId: string) => void;
    onLeaveGame?: () => void;
}

export default function GamePausedOverlay({
    isPaused,
    disconnectedPlayers,
    timeoutAt,
    isLeader,
    onKickPlayer,
    onLeaveGame,
}: GamePausedOverlayProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [kickTarget, setKickTarget] = useState<User | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    useEffect(() => {
        if (!isPaused || !timeoutAt) {
            setTimeRemaining("");
            return;
        }

        function updateCountdown() {
            const now = new Date().getTime();
            const timeout = new Date(timeoutAt!).getTime();
            const diff = timeout - now;

            if (diff <= 0) {
                setTimeRemaining("0:00");
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeRemaining(
                `${minutes}:${seconds.toString().padStart(2, "0")}`
            );
        }

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [isPaused, timeoutAt]);

    return (
        <Dialog open={isPaused}>
            <DialogContent className="flex flex-col items-center gap-3 sm:gap-6 max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogTitle className="sr-only">Game Paused</DialogTitle>
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-amber-500 animate-spin" />
                    <h2 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                        Game Paused
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 text-center">
                        Waiting for disconnected players to rejoin...
                    </p>
                </div>

                {/* Countdown Timer */}
                {timeRemaining && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                            Auto-abort in{" "}
                            <span className="font-bold text-base sm:text-lg">
                                {timeRemaining}
                            </span>
                        </span>
                    </div>
                )}

                {/* Disconnected Players List */}
                {disconnectedPlayers.length > 0 && (
                    <div className="w-full">
                        <h3 className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                            Disconnected Players
                        </h3>
                        <div className="flex flex-col gap-2">
                            {disconnectedPlayers.map((player) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                                        <span className="text-sm sm:text-base font-medium text-red-700 dark:text-red-300">
                                            {player.name}
                                        </span>
                                    </div>
                                    {isLeader && onKickPlayer && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                setKickTarget(player)
                                            }
                                            className="text-xs sm:text-sm"
                                        >
                                            Kick
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Leave Game Button */}
                {onLeaveGame && (
                    <Button
                        variant="outline"
                        className="w-full mt-1 sm:mt-2 h-9 sm:h-10 text-sm"
                        onClick={() => setShowLeaveConfirm(true)}
                    >
                        Leave Game
                    </Button>
                )}

                {/* Kick Confirmation Dialog */}
                <ConfirmDialog
                    open={!!kickTarget}
                    title="Kick Player"
                    description={`Are you sure you want to kick ${
                        kickTarget?.name || "this player"
                    }? They will be removed from the game.`}
                    confirmText="Kick"
                    cancelText="Cancel"
                    variant="destructive"
                    onConfirm={() => {
                        if (kickTarget && onKickPlayer) {
                            onKickPlayer(kickTarget.id);
                            setKickTarget(null);
                        }
                    }}
                    onCancel={() => setKickTarget(null)}
                />

                {/* Leave Game Confirmation Dialog */}
                <ConfirmDialog
                    open={showLeaveConfirm}
                    title="Leave Game"
                    description="Are you sure you want to leave the game? You may not be able to rejoin."
                    confirmText="Leave"
                    cancelText="Stay"
                    variant="destructive"
                    onConfirm={() => {
                        setShowLeaveConfirm(false);
                        onLeaveGame?.();
                    }}
                    onCancel={() => setShowLeaveConfirm(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
