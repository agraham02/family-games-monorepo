"use client";

import { useServerKeepAlive } from "@/hooks";

/**
 * Component that keeps the server alive by periodically pinging it.
 * Prevents Render's free tier from spinning down during active WebSocket sessions.
 */
export function ServerKeepAlive(): null {
    useServerKeepAlive(true);
    return null;
}
