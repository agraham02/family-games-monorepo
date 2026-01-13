// src/hooks/useJoinRequests.ts
"use client";

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { getSocket } from "@/lib/socket";
import { API_BASE } from "@/services";

interface JoinRequest {
    requesterId: string;
    requesterName: string;
    roomCode: string;
    timestamp: string;
}

interface JoinRequestResponse {
    requesterId: string;
    accepted: boolean;
    roomCode?: string;
    roomId?: string;
    message?: string;
}

// Track active toast IDs to dismiss them
const activeToasts = new Map<string, string | number>();

// Toast auto-dismiss timeout (60 seconds)
const TOAST_TIMEOUT_MS = 60 * 1000;

/**
 * Hook to handle join requests for private rooms.
 * Shows toasts with Accept/Reject buttons for the room leader.
 *
 * @param isLeader - Whether the current user is the room leader
 * @param roomId - The current room ID
 */
export function useJoinRequests(isLeader: boolean, roomId: string | null) {
    const { connected } = useWebSocket();
    const { userId } = useSession();
    const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Handle responding to a join request
    const respondToRequest = useCallback(
        function respondToRequest(
            requesterId: string,
            requesterName: string,
            accepted: boolean
        ) {
            if (!connected || !roomId || !userId) return;

            const socket = getSocket();
            socket.emit("respond_join_request", {
                roomId,
                leaderId: userId,
                requesterId,
                requesterName,
                accepted,
            });

            // Dismiss the toast
            const toastId = activeToasts.get(requesterId);
            if (toastId) {
                toast.dismiss(toastId);
                activeToasts.delete(requesterId);
            }

            // Clear timeout
            const timeout = timeoutsRef.current.get(requesterId);
            if (timeout) {
                clearTimeout(timeout);
                timeoutsRef.current.delete(requesterId);
            }
        },
        [connected, roomId, userId]
    );

    // Handle incoming join request (leader only)
    useEffect(() => {
        if (!isLeader || !connected) return;

        const socket = getSocket();

        function handleJoinRequest(data: JoinRequest) {
            const { requesterId, requesterName } = data;

            // Show toast with action buttons
            const toastId = toast(`${requesterName} wants to join the room`, {
                description: "Accept or reject their request",
                duration: TOAST_TIMEOUT_MS,
                action: {
                    label: "Accept",
                    onClick: () =>
                        respondToRequest(requesterId, requesterName, true),
                },
                cancel: {
                    label: "Reject",
                    onClick: () =>
                        respondToRequest(requesterId, requesterName, false),
                },
                onDismiss: () => {
                    // Auto-reject on dismiss/timeout
                    if (activeToasts.has(requesterId)) {
                        respondToRequest(requesterId, requesterName, false);
                    }
                },
            });

            activeToasts.set(requesterId, toastId);

            // Set up auto-dismiss timeout
            const timeout = setTimeout(() => {
                if (activeToasts.has(requesterId)) {
                    toast.dismiss(toastId);
                    respondToRequest(requesterId, requesterName, false);
                }
            }, TOAST_TIMEOUT_MS);

            timeoutsRef.current.set(requesterId, timeout);
        }

        socket.on("join_request", handleJoinRequest);

        // Capture current ref value for cleanup
        const currentTimeouts = timeoutsRef.current;

        return () => {
            socket.off("join_request", handleJoinRequest);
            // Clear all timeouts on cleanup
            for (const timeout of currentTimeouts.values()) {
                clearTimeout(timeout);
            }
            currentTimeouts.clear();
        };
    }, [isLeader, connected, respondToRequest]);

    // Cleanup active toasts on unmount
    useEffect(() => {
        return () => {
            for (const toastId of activeToasts.values()) {
                toast.dismiss(toastId);
            }
            activeToasts.clear();
        };
    }, []);
}

/**
 * Hook to handle join request responses (for requesters).
 * Connects to socket if needed and shows success/error messages when request is accepted/rejected.
 *
 * @param onAccepted - Callback when request is accepted (receives roomCode, roomId)
 * @param onRejected - Callback when request is rejected
 * @param waitingForApproval - Whether we're currently waiting for a response
 */
export function useJoinRequestResponse(
    onAccepted?: (roomCode: string, roomId: string) => void,
    onRejected?: () => void,
    waitingForApproval: boolean = false
) {
    const { userId } = useSession();

    useEffect(() => {
        // Only listen if we're waiting for approval
        if (!waitingForApproval || !userId) return;

        const socket = getSocket();

        // Connect to socket if not already connected (just to receive global events)
        const wasConnected = socket.connected;
        if (!wasConnected) {
            // Connect without joining a room - just to receive the response
            socket.io.opts.query = { userId, waitingForJoinApproval: "true" };
            socket.connect();
        }

        function handleResponse(data: JoinRequestResponse) {
            // Only handle responses for this user
            if (data.requesterId !== userId) return;

            if (data.accepted && data.roomCode && data.roomId) {
                toast.success("Your request was accepted! Joining room...");
                onAccepted?.(data.roomCode, data.roomId);
            } else {
                toast.error(
                    data.message || "Your request to join was declined."
                );
                onRejected?.();
            }
        }

        socket.on("join_request_response", handleResponse);

        return () => {
            socket.off("join_request_response", handleResponse);
            // Disconnect if we connected just for this
            if (!wasConnected && socket.connected) {
                socket.disconnect();
            }
        };
    }, [userId, onAccepted, onRejected, waitingForApproval]);
}

/**
 * Function to send a join request for a private room via REST API.
 * This is used from the home page where the user isn't connected to a socket yet.
 */
export async function sendJoinRequest(
    roomCode: string,
    requesterId: string,
    requesterName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/api/rooms/request-join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomCode, requesterId, requesterName }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return {
                success: false,
                error: data.error || `Request failed: ${response.statusText}`,
            };
        }

        return { success: true };
    } catch (err) {
        return {
            success: false,
            error:
                err instanceof Error ? err.message : "Failed to send request",
        };
    }
}
