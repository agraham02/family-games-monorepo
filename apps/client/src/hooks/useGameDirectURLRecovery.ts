/**
 * Hook to handle rejoin/recovery when navigating directly to a game URL.
 * If no session exists, attempts to rejoin with a name prompt.
 * Validates that URL roomCode matches stored roomId to prevent navigation bugs.
 */

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/contexts/SessionContext";
import { useRouter, useParams } from "next/navigation";
import { attemptDirectGameRejoin, getRoomIdByCode } from "@/services/lobby";
import { toast } from "sonner";

interface UseGameDirectURLRecoveryOptions {
    onSessionRestored?: () => void;
    onRecoveryFailed?: () => void;
}

interface UseGameDirectURLRecoveryResult {
    isRecovering: boolean;
    showNameModal: boolean;
    onNameSubmit: (name: string) => void;
    onNameCancel: () => void;
}

export function useGameDirectURLRecovery(
    options?: UseGameDirectURLRecoveryOptions
): UseGameDirectURLRecoveryResult {
    const { roomId, userId, userName, setSessionData, clearRoomSession } =
        useSession();
    const router = useRouter();
    const { roomCode } = useParams<{ roomCode: string }>();
    const [isRecovering, setIsRecovering] = useState(false);
    const [hasValidated, setHasValidated] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingName, setPendingName] = useState<string | null>(null);

    /**
     * Perform the actual rejoin attempt with the given name
     */
    const performRejoin = useCallback(
        async (nameToUse: string) => {
            if (!roomCode) return;

            setIsRecovering(true);

            try {
                // Attempt to rejoin with existing userId (if available)
                const result = await attemptDirectGameRejoin(
                    roomCode,
                    nameToUse,
                    userId
                );

                if (result) {
                    // Successfully rejoined, update session
                    setSessionData({
                        roomId: result.roomId,
                        userId: result.userId,
                        userName: nameToUse,
                    });
                    toast.success(
                        "Rejoined! Connecting to game... You may need to wait for other players."
                    );
                    options?.onSessionRestored?.();
                } else {
                    // Rejoin failed, redirect to lobby
                    toast.error(
                        "Could not rejoin game. It may be in progress. Going to lobby..."
                    );
                    router.push(`/lobby/${roomCode}`);
                    options?.onRecoveryFailed?.();
                }
            } catch (error) {
                console.error("Error during game rejoin recovery:", error);
                toast.error("Failed to rejoin game. Redirecting to lobby...");
                router.push(`/lobby/${roomCode}`);
                options?.onRecoveryFailed?.();
            } finally {
                setIsRecovering(false);
                setHasValidated(true);
            }
        },
        [roomCode, userId, router, setSessionData, options]
    );

    /**
     * Handle name submission from modal
     */
    const onNameSubmit = useCallback((name: string) => {
        setShowNameModal(false);
        setPendingName(name);
    }, []);

    /**
     * Handle modal cancellation
     */
    const onNameCancel = useCallback(() => {
        setShowNameModal(false);
        setHasValidated(true); // Prevent effect from re-running
        if (roomCode) {
            router.push(`/lobby/${roomCode}`);
        }
        options?.onRecoveryFailed?.();
    }, [roomCode, router, options]);

    // Effect to validate and trigger recovery flow
    useEffect(() => {
        if (!roomCode || hasValidated) {
            return;
        }

        async function validateAndRecover() {
            // If we have a roomId, validate it matches the URL's roomCode
            if (roomId) {
                const actualRoomId = await getRoomIdByCode(roomCode).catch(
                    (error) => {
                        console.error("Error getting room ID by code:", error);
                        return null;
                    }
                );
                if (actualRoomId && actualRoomId !== roomId) {
                    console.log(
                        `Room mismatch detected: URL roomCode=${roomCode} → roomId=${actualRoomId}, ` +
                            `but session has roomId=${roomId}. Clearing session.`
                    );
                    clearRoomSession();
                    // Will trigger recovery on next effect run
                }
                setHasValidated(true);
                return;
            }

            // No roomId in session, check if we have a name
            if (userName) {
                // We have a name, proceed with rejoin
                await performRejoin(userName);
            } else {
                // Show modal to get name from user
                setShowNameModal(true);
                // Mark as validated so effect doesn't re-run while modal is open
                setHasValidated(true);
            }
        }

        validateAndRecover().catch((error) => {
            console.error("Unexpected error during recovery:", error);
            setHasValidated(true);
        });
    }, [
        roomCode,
        roomId,
        userName,
        clearRoomSession,
        hasValidated,
        performRejoin,
    ]);

    // Effect to handle name submission from modal
    useEffect(() => {
        if (pendingName) {
            performRejoin(pendingName).catch((error) => {
                console.error("Error during rejoin with name:", error);
            });
            setPendingName(null);
        }
    }, [pendingName, performRejoin]);

    return {
        isRecovering,
        showNameModal,
        onNameSubmit,
        onNameCancel,
    };
}
