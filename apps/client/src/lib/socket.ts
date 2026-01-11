// src/lib/socket.ts
// Singleton Socket.IO client following official React best practices
// See: https://socket.io/how-to/use-with-react

import { io, Socket } from "socket.io-client";
import { SOCKET_BASE } from "@/services";

// Singleton socket instance - survives React re-renders and Strict Mode
let socket: Socket | null = null;

/**
 * Get or create the Socket.IO client instance.
 * The socket is created with autoConnect: false to allow manual connection control.
 */
export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_BASE, {
            autoConnect: false,
            transports: ["websocket", "polling"],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        // Log connection events for debugging
        socket.on("connect", () => {
            console.log("🔌 Socket connected:", socket?.id);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 Socket disconnected:", reason);
        });

        socket.on("connect_error", (error) => {
            console.error("🔌 Socket connection error:", error.message);
        });
    }

    return socket;
}

/**
 * Connect to the server with the given room and user credentials.
 * Updates the socket query parameters and initiates connection.
 */
export function connectSocket(roomId: string, userId: string): Socket {
    const sock = getSocket();

    // Update query parameters for this connection
    sock.io.opts.query = { roomId, userId };

    // Connect if not already connected
    if (!sock.connected) {
        sock.connect();
    }

    return sock;
}

/**
 * Disconnect the socket and clean up.
 * Removes all event listeners to prevent memory leaks and stale handlers.
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}

/**
 * Emit join_room event to register with the server.
 * Should be called after socket connects and event listeners are set up.
 */
export function emitJoinRoom(roomId: string, userId: string): void {
    const sock = getSocket();
    if (sock.connected) {
        sock.emit("join_room", { roomId, userId });
    }
}

/**
 * Check if socket is currently connected.
 */
export function isSocketConnected(): boolean {
    return socket?.connected ?? false;
}

export { socket };
