import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { RoomSettings, GameSettings } from "@/types/lobby";
import {
    SettingsIcon,
    PlayIcon,
    DoorOpenIcon,
    UsersIcon,
    LockIcon,
} from "lucide-react";

interface RoomControlsCardProps {
    selectedGame: string | null;
    isPartyLeader: boolean;
    roomSettings?: RoomSettings;
    gameSettings?: GameSettings;
}

export default function RoomControlsCard({
    selectedGame,
    isPartyLeader,
    roomSettings,
    gameSettings,
}: RoomControlsCardProps) {
    const { socket, connected } = useWebSocket();
    const { userId, roomId } = useSession();

    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [localMaxPlayers, setLocalMaxPlayers] = useState<number | undefined>(
        roomSettings?.maxPlayers ?? undefined
    );
    const [localIsPrivate, setLocalIsPrivate] = useState<boolean>(
        roomSettings?.isPrivate ?? false
    );

    function handleCloseRoom() {
        setShowCloseConfirm(true);
    }

    function confirmCloseRoom() {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }
        socket.emit("close_room", { roomId, userId });
        toast.warning("Room closed");
        setShowCloseConfirm(false);
    }

    function handleStartGame() {
        if (!socket || !connected) {
            toast.error("Not connected to the server");
            return;
        }

        socket.emit("start_game", {
            roomId,
            userId,
            gameType: selectedGame,
            gameSettings,
        });
    }

    const handleMaxPlayersChange = useCallback(
        (value: number | undefined) => {
            setLocalMaxPlayers(value);
            if (!socket || !connected || !isPartyLeader) return;
            socket.emit("update_room_settings", {
                roomId,
                userId,
                settings: { maxPlayers: value },
            });
        },
        [socket, connected, roomId, userId, isPartyLeader]
    );

    const handlePrivateChange = useCallback(
        (checked: boolean) => {
            setLocalIsPrivate(checked);
            if (!socket || !connected || !isPartyLeader) return;
            socket.emit("update_room_settings", {
                roomId,
                userId,
                settings: { isPrivate: checked },
            });
        },
        [socket, connected, roomId, userId, isPartyLeader]
    );

    return (
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <SettingsIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Room Controls
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {/* Room Settings - Max Players */}
                {isPartyLeader && (
                    <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <UsersIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                Room Settings
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="maxPlayers"
                                    className="text-sm text-zinc-600 dark:text-zinc-400"
                                >
                                    Max Players
                                </Label>
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    {localMaxPlayers ?? "Unlimited"}
                                </span>
                            </div>
                            <Slider
                                id="maxPlayers"
                                min={2}
                                max={10}
                                step={1}
                                value={[localMaxPlayers ?? 10]}
                                onValueChange={([value]) =>
                                    handleMaxPlayersChange(
                                        value === 10 ? undefined : value
                                    )
                                }
                                className="w-full"
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Limit how many players can join (slide to 10 for
                                unlimited)
                            </p>
                        </div>

                        {/* Private Room Toggle */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <LockIcon className="w-4 h-4 text-zinc-500" />
                                <div>
                                    <Label
                                        htmlFor="isPrivate"
                                        className="text-sm text-zinc-600 dark:text-zinc-400"
                                    >
                                        Private Room
                                    </Label>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Require approval to join
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="isPrivate"
                                checked={localIsPrivate}
                                onCheckedChange={handlePrivateChange}
                            />
                        </div>
                    </div>
                )}

                {/* Start Game Button */}
                {isPartyLeader && (
                    <Button
                        onClick={handleStartGame}
                        disabled={!selectedGame}
                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlayIcon className="w-5 h-5" />
                        {selectedGame ? "Start Game" : "Select a Game First"}
                    </Button>
                )}

                <Separator className="my-1" />

                {/* Close Room Button */}
                {isPartyLeader && (
                    <Button
                        variant="outline"
                        className="w-full h-10 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800"
                        onClick={handleCloseRoom}
                    >
                        <DoorOpenIcon className="w-4 h-4" />
                        Close Room
                    </Button>
                )}

                {/* Close Room Confirmation Dialog */}
                <ConfirmDialog
                    open={showCloseConfirm}
                    title="Close Room"
                    description="Are you sure you want to close this room? All players will be disconnected."
                    confirmText="Close Room"
                    cancelText="Cancel"
                    variant="destructive"
                    onConfirm={confirmCloseRoom}
                    onCancel={() => setShowCloseConfirm(false)}
                />
            </CardContent>
        </Card>
    );
}
