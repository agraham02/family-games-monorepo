"use client";

/**
 * Debug Layout
 *
 * Independent layout for debug routes that bypasses the server health check.
 * Provides all necessary context providers without requiring server connectivity.
 */

import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { SoundToggle } from "@/components/sound-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export default function DebugLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <TooltipProvider delayDuration={300}>
                <WebSocketProvider>
                    <div className="w-full flex justify-end gap-2 p-4 fixed top-0 left-0 z-50 pointer-events-none">
                        <div className="pointer-events-auto flex gap-2">
                            <SoundToggle />
                            <DarkModeToggle />
                        </div>
                    </div>
                    <ErrorBoundary>
                        <main>{children}</main>
                    </ErrorBoundary>
                    <Toaster richColors position="top-right" />
                </WebSocketProvider>
            </TooltipProvider>
        </SessionProvider>
    );
}
