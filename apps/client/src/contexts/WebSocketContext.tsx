// src/contexts/WebSocketContext.tsx
// Simplified WebSocket context using singleton socket pattern

"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import { useSession } from "./SessionContext";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";

interface WebSocketContextValue {
    socket: Socket | null;
    connected: boolean;
    reconnecting: boolean;
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
    const { roomId, userId } = useSession();

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
        }

        function onReconnectFailed() {
            setReconnecting(false);
        }

        // Register event listeners
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.io.on("reconnect_attempt", onReconnecting);
        socket.io.on("reconnect", onReconnect);
        socket.io.on("reconnect_failed", onReconnectFailed);

        // Connect with credentials
        connectSocket(roomId, userId);

        // Set initial connected state
        setConnected(socket.connected);

        // Cleanup - only remove listeners, don't disconnect
        // Socket will be cleaned up when leaving room pages (layout unmount)
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.io.off("reconnect_attempt", onReconnecting);
            socket.io.off("reconnect", onReconnect);
            socket.io.off("reconnect_failed", onReconnectFailed);
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
            value={{ socket, connected, reconnecting, emit }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}
