"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, PlayCircleIcon, DoorOpenIcon } from "lucide-react";
import { User } from "@shared/types";

interface SpectatorBannerProps {
    disconnectedPlayers: User[];
    onClaimSlot?: (targetUserId: string) => void;
    onReturnToLobby?: () => void;
}

export default function SpectatorBanner({
    disconnectedPlayers,
    onClaimSlot,
    onReturnToLobby,
}: SpectatorBannerProps) {
    const hasOpenSlots = disconnectedPlayers.length > 0;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-purple-500/95 backdrop-blur-sm text-white px-4 py-2 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/20">
                        <EyeIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Spectator Mode</span>
                    {hasOpenSlots && (
                        <Badge
                            variant="secondary"
                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                            {disconnectedPlayers.length} slot
                            {disconnectedPlayers.length > 1 ? "s" : ""}{" "}
                            available
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Join Game Button - only if slots available */}
                    {hasOpenSlots && onClaimSlot && (
                        <Button
                            size="sm"
                            onClick={() =>
                                onClaimSlot(disconnectedPlayers[0].id)
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <PlayCircleIcon className="w-4 h-4 mr-1" />
                            Join Game
                        </Button>
                    )}

                    {/* Return to Lobby Button */}
                    {onReturnToLobby && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onReturnToLobby}
                            className="text-white hover:bg-white/20"
                        >
                            <DoorOpenIcon className="w-4 h-4 mr-1" />
                            Lobby
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
