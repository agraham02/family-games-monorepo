"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useParams, useRouter } from "next/navigation";
import { joinRoom, PrivateRoomError, getRoomIdByCode } from "@/services/lobby";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { LobbyData } from "@/types";
import LobbyDashboard from "@/components/lobby/LobbyDashboard";
import GameInProgressBanner from "@/components/lobby/GameInProgressBanner";
import { LobbySkeleton } from "@/components/skeletons";
import {
    ClipboardIcon,
    CheckIcon,
    WifiIcon,
    WifiOffIcon,
    UsersIcon,
    Loader2Icon,
    AlertCircleIcon,
} from "lucide-react";
import { useRoomEvents } from "@/hooks/useRoomEvents";
import { validatePlayerName, sanitizePlayerName } from "@/lib/validation";

export default function LobbyPage() {
    const { connected } = useWebSocket();
    const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
    const { roomCode }: { roomCode: string } = useParams();
    const {
        roomId,
        userId,
        userName,
        setRoomId,
        setUserId,
        setUserName,
        initializing,
        clearRoomSession,
    } = useSession();
    const [showModal, setShowModal] = useState(false);
    const [pendingName, setPendingName] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const router = useRouter();

    // Use the shared room events hook
    useRoomEvents({
        roomCode,
        onSync: (roomState) => {
            setLobbyData(roomState);
        },
        // Don't auto-navigate from lobby - let the hook handle game_started
        autoNavigateOnGameStart: true,
    });

    // Track if we've already attempted to join to prevent infinite loops
    const hasAttemptedJoin = useRef(false);
    const hasValidatedURL = useRef(false);

    // Reset validation state when roomCode changes (client-side navigation to different room)
    useEffect(() => {
        hasValidatedURL.current = false;
    }, [roomCode]);

    // Validate URL matches stored roomId on mount
    useEffect(() => {
        if (!roomCode || !roomId || hasValidatedURL.current || initializing) {
            return;
        }

        const validateURL = async () => {
            const actualRoomId = await getRoomIdByCode(roomCode);
            if (actualRoomId && actualRoomId !== roomId) {
                console.log(
                    `Room mismatch: URL roomCode=${roomCode} → roomId=${actualRoomId}, ` +
                        `but session has roomId=${roomId}. Clearing session to rejoin.`
                );
                clearRoomSession();
                hasAttemptedJoin.current = false; // Allow rejoin
            }
            hasValidatedURL.current = true;
        };

        validateURL();
    }, [roomCode, roomId, initializing, clearRoomSession]);

    // Handle joining room via REST API when we have userName but no roomId
    const handleJoinRoom = useCallback(async () => {
        if (!userName || !roomCode) return;

        setIsJoining(true);
        try {
            const res = await joinRoom(userName, roomCode, userId);
            if (res.roomId !== roomId) {
                setRoomId(res.roomId);
            }
            if (res.userId !== userId) {
                setUserId(res.userId);
            }
        } catch (error) {
            if (error instanceof PrivateRoomError) {
                // Private room - redirect to home page with a message
                toast.error(
                    "This room is private. Please request to join from the home page."
                );
            } else {
                toast.error(
                    "Failed to join room: " +
                        (error instanceof Error
                            ? error.message
                            : "Unknown error")
                );
            }
            router.push("/");
        } finally {
            setIsJoining(false);
        }
    }, [userName, roomCode, userId, roomId, setUserId, setRoomId, router]);

    // Show name modal if no userName
    useEffect(() => {
        if (!initializing && !userName) {
            setShowModal(true);
        }
    }, [userName, initializing]);

    // Join room when we have userName but no roomId (only once)
    useEffect(() => {
        if (
            !initializing &&
            userName &&
            !roomId &&
            roomCode &&
            !hasAttemptedJoin.current
        ) {
            hasAttemptedJoin.current = true;
            handleJoinRoom();
        }
    }, [initializing, userName, roomId, roomCode, handleJoinRoom]);

    function handleNameSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validate name
        const validationError = validatePlayerName(pendingName);
        if (validationError) {
            setNameError(validationError.message);
            return;
        }

        setNameError(null);
        const sanitizedName = sanitizePlayerName(pendingName);
        setUserName(sanitizedName);
        setShowModal(false);
    }

    // Show skeleton while initializing, joining, or waiting for lobby data
    const isLoading = initializing || isJoining || !lobbyData;
    const [copied, setCopied] = useState(false);

    function handleCopyCode() {
        if (!lobbyData) return;
        navigator.clipboard.writeText(lobbyData.code);
        setCopied(true);
        toast.success("Room code copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    }

    if (isLoading) {
        return (
            <>
                <LobbySkeleton />
                <Dialog open={showModal}>
                    <DialogContent className="sm:max-w-md">
                        <motion.form
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleNameSubmit}
                            className="flex flex-col gap-4 items-center p-2"
                        >
                            <DialogHeader className="text-center">
                                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <UsersIcon className="w-8 h-8 text-white" />
                                </div>
                                <DialogTitle className="text-xl">
                                    Join the Game
                                </DialogTitle>
                                <DialogDescription>
                                    Enter your name to join the lobby
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                autoFocus
                                placeholder="Your Name"
                                value={pendingName}
                                onChange={(e) => {
                                    setPendingName(e.target.value);
                                    // Clear error when user starts typing
                                    if (nameError) {
                                        setNameError(null);
                                    }
                                }}
                                className={`h-11 text-center text-lg ${
                                    nameError
                                        ? "border-red-500 dark:border-red-400 focus:ring-red-500/20 focus:border-red-500"
                                        : ""
                                }`}
                                maxLength={50}
                            />
                            {nameError && (
                                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 w-full">
                                    <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{nameError}</span>
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold"
                                disabled={!pendingName.trim() || !!nameError}
                            >
                                {pendingName.trim() && !nameError ? (
                                    "Join Lobby"
                                ) : (
                                    <>
                                        <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                                        Enter your name
                                    </>
                                )}
                            </Button>
                        </motion.form>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_40%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 px-4 py-6 md:py-8">
                {/* Header Section */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-6xl mx-auto"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
                        {/* Room Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                                    {lobbyData.name || "Game Lobby"}
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                        variant="secondary"
                                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                    >
                                        <UsersIcon className="w-3 h-3 mr-1" />
                                        {lobbyData.users.length} player
                                        {lobbyData.users.length !== 1
                                            ? "s"
                                            : ""}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={
                                            connected
                                                ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                                : "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                                        }
                                    >
                                        {connected ? (
                                            <>
                                                <WifiIcon className="w-3 h-3 mr-1" />
                                                Connected
                                            </>
                                        ) : (
                                            <>
                                                <WifiOffIcon className="w-3 h-3 mr-1 animate-pulse" />
                                                Reconnecting...
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Room Code */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Room Code:
                                </span>
                                <span className="text-xl md:text-2xl font-mono font-bold tracking-wider text-zinc-900 dark:text-white">
                                    {lobbyData.code}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyCode}
                                className="h-10 w-10 rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                title="Copy room code"
                            >
                                {copied ? (
                                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <ClipboardIcon className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.header>

                {/* Game in Progress Banner */}
                <GameInProgressBanner lobbyData={lobbyData} />

                <LobbyDashboard lobbyData={lobbyData} />
            </div>
        </main>
    );
}
