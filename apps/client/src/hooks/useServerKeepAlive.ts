// src/hooks/useServerKeepAlive.ts
// Prevents Render free tier from spinning down during active sessions
// by sending periodic HTTP requests (WebSocket connections don't count as "activity")

import { useEffect, useRef } from "react";
import { API_BASE } from "@/services";

// Ping every 10 minutes (Render spins down after 15 minutes of inactivity)
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Hook that keeps the server alive by periodically pinging the health endpoint.
 * This prevents Render's free tier from spinning down the server during active
 * WebSocket sessions (which don't count as "inbound traffic" for Render).
 *
 * @param enabled - Whether to enable the keep-alive ping (e.g., only when in a room)
 */
export function useServerKeepAlive(enabled: boolean = true): void {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(
        function setupKeepAlive() {
            if (!enabled || !API_BASE) {
                return;
            }

            async function pingServer(): Promise<void> {
                try {
                    // Use the health endpoint - it's lightweight and already exists
                    await fetch(`${API_BASE}/api/healthz`, {
                        method: "GET",
                        // Don't need to wait for response, just need to trigger inbound traffic
                        signal: AbortSignal.timeout(5000),
                    });
                    console.debug("[KeepAlive] Server pinged successfully");
                } catch (error) {
                    // Silently fail - if the server is down, the WebSocket will handle reconnection
                    console.debug("[KeepAlive] Ping failed:", error);
                }
            }

            // Ping immediately on mount
            pingServer();

            // Then ping at regular intervals
            intervalRef.current = setInterval(
                pingServer,
                KEEP_ALIVE_INTERVAL_MS
            );

            return function cleanup() {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        },
        [enabled]
    );
}
