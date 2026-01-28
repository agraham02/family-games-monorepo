"use client";

/**
 * Debug Layout
 *
 * Provides the WebSocketProvider context needed by game components.
 * This mirrors the (room) layout structure so game components work properly.
 */

import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function DebugLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WebSocketProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
        </WebSocketProvider>
    );
}
