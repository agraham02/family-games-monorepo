"use client";

import React, { ReactNode, useState, useCallback, useRef } from "react";
import { SessionContext } from "@/contexts/SessionContext";
import { WebSocketContext } from "@/contexts/WebSocketContext";

export function MockSessionProvider({
    children,
    initialUserId = "player-0",
    initialRoomId = "debug-room",
}: {
    children: ReactNode;
    initialUserId?: string;
    initialRoomId?: string;
}) {
    const [userId, setUserId] = useState(initialUserId);
    const [roomId, setRoomId] = useState(initialRoomId);
    const [userName, setUserName] = useState("Debug User");

    const value = {
        roomId,
        setRoomId,
        userId,
        setUserId,
        userName,
        setUserName,
        setSessionData: (data: { roomId?: string; userId?: string; userName?: string }) => {
            if (data.roomId) setRoomId(data.roomId);
            if (data.userId) setUserId(data.userId);
            if (data.userName) setUserName(data.userName);
        },
        initializing: false,
        clearSession: () => {},
        clearRoomSession: () => {},
        clearUserSession: () => {},
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}

export function MockWebSocketProvider({
    children,
    onEmit,
    latency = 0,
    simulateError = false,
}: {
    children: ReactNode;
    onEmit?: (event: string, payload: unknown) => void;
    latency?: number;
    simulateError?: boolean;
}) {
    const [connected] = useState(true);

    const listeners = useRef<Record<string, Array<(payload: unknown) => void>>>({});

    const emit = useCallback(
        (event: string, payload: { action?: { type: string } } | unknown) => {
            if (simulateError) {
                console.error("[MockWebSocket] Simulated Error for event:", event);
                // Emit an error back to the client
                setTimeout(() => {
                    const errorListeners = listeners.current["action_error"] || [];
                    const actionType = (payload as { action?: { type: string } })?.action?.type || event;
                    errorListeners.forEach(cb => cb({ message: "Simulated network error", action: actionType }));
                }, 100);
                return;
            }

            if (latency > 0) {
                setTimeout(() => {
                    console.log(`[MockWebSocket] Emitted (delayed ${latency}ms):`, event, payload);
                    onEmit?.(event, payload);
                }, latency);
            } else {
                console.log("[MockWebSocket] Emitted:", event, payload);
                onEmit?.(event, payload);
            }
        },
        [latency, simulateError, onEmit]
    );

    // Create a fake socket object that matches the Socket.io interface enough for our components
    const mockSocket = {
        id: "mock-socket-id",
        connected,
        emit,
        on: (event: string, callback: (payload: unknown) => void) => {
            console.log("[MockWebSocket] Subscribed to:", event);
            if (!listeners.current[event]) listeners.current[event] = [];
            listeners.current[event].push(callback);
        },
        off: (event: string, callback: (payload: unknown) => void) => {
            console.log("[MockWebSocket] Unsubscribed from:", event);
            if (listeners.current[event]) {
                listeners.current[event] = listeners.current[event].filter(cb => cb !== callback);
            }
        },
    };

    const value = {
        socket: mockSocket as unknown as import("socket.io-client").Socket,
        connected,
        reconnecting: false,
        clockOffset: 0,
        emit,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}
