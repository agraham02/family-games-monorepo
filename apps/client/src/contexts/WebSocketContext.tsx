// src/contexts/WebSocketContext.tsx
// Simplified WebSocket context using singleton socket pattern

"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
    ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import { useSession } from "./SessionContext";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";

/** Clock sync interval in milliseconds (re-sync every 60 seconds) */
const CLOCK_SYNC_INTERVAL_MS = 60000;

interface WebSocketContextValue {
    socket: Socket | null;
    connected: boolean;
    reconnecting: boolean;
    /** Offset in ms between server and client clocks (serverTime - clientTime) */
    clockOffset: number;
    emit: <T>(event: string, payload: T) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(
    undefined
);

export function useWebSocket() {
    const ctx = useContext(WebSocketContext);
    if (!ctx) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return ctx;
}

interface WebSocketProviderProps {
    children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [clockOffset, setClockOffset] = useState(0);
    const clockSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { roomId, userId } = useSession();

    /** Send a clock sync request to the server */
    const performClockSync = useCallback(() => {
        const socket = getSocket();
        if (socket.connected) {
            socket.emit("clock_sync", { clientTime: Date.now() });
        }
    }, []);

    useEffect(() => {
        // Don't connect until we have both roomId and userId
        if (!roomId || !userId) {
            return;
        }

        const socket = getSocket();

        // Event handlers
        function onConnect() {
            console.log("WebSocketContext: connected");
            setConnected(true);
            setReconnecting(false);
            // Perform initial clock sync on connection
            socket.emit("clock_sync", { clientTime: Date.now() });
        }

        function onDisconnect() {
            console.log("WebSocketContext: disconnected");
            setConnected(false);
        }

        function onReconnecting() {
            setReconnecting(true);
        }

        function onReconnect() {
            setReconnecting(false);
            // Re-sync clock on reconnection
            socket.emit("clock_sync", { clientTime: Date.now() });
        }

        function onReconnectFailed() {
            setReconnecting(false);
        }

        function onClockSyncResponse({
            clientTime,
            serverTime,
        }: {
            clientTime: number;
            serverTime: number;
        }) {
            const now = Date.now();
            const roundTripTime = now - clientTime;
            // Estimate one-way latency as half of RTT
            const latency = roundTripTime / 2;
            // Calculate offset: how far ahead the server is from the client
            const offset = serverTime - clientTime - latency;
            setClockOffset(offset);
            console.log(
                `🕐 Clock sync: RTT=${roundTripTime}ms, latency=${latency.toFixed(1)}ms, offset=${offset.toFixed(1)}ms`
            );
        }

        // Register event listeners
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("clock_sync_response", onClockSyncResponse);
        socket.io.on("reconnect_attempt", onReconnecting);
        socket.io.on("reconnect", onReconnect);
        socket.io.on("reconnect_failed", onReconnectFailed);

        // Connect with credentials
        connectSocket(roomId, userId);

        // Set initial connected state
        setConnected(socket.connected);

        // Set up periodic clock sync
        clockSyncIntervalRef.current = setInterval(() => {
            if (socket.connected) {
                socket.emit("clock_sync", { clientTime: Date.now() });
            }
        }, CLOCK_SYNC_INTERVAL_MS);

        // Cleanup - only remove listeners, don't disconnect
        // Socket will be cleaned up when leaving room pages (layout unmount)
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("clock_sync_response", onClockSyncResponse);
            socket.io.off("reconnect_attempt", onReconnecting);
            socket.io.off("reconnect", onReconnect);
            socket.io.off("reconnect_failed", onReconnectFailed);
            if (clockSyncIntervalRef.current) {
                clearInterval(clockSyncIntervalRef.current);
                clockSyncIntervalRef.current = null;
            }
        };
    }, [roomId, userId]);

    // Cleanup socket when provider unmounts (leaving room layout)
    useEffect(() => {
        return () => {
            disconnectSocket();
        };
    }, []);

    const emit = useCallback(<T,>(event: string, payload: T) => {
        const socket = getSocket();
        if (socket.connected) {
            socket.emit(event, payload);
        }
    }, []);

    const socket = roomId && userId ? getSocket() : null;

    return (
        <WebSocketContext.Provider
            value={{ socket, connected, reconnecting, clockOffset, emit }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}
