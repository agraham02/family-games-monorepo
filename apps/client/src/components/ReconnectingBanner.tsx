"use client";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Loader2, WifiOff } from "lucide-react";

export default function ReconnectingBanner() {
    const { connected, reconnecting } = useWebSocket();

    if (connected && !reconnecting) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2">
            {reconnecting ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Reconnecting...</span>
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        Disconnected from server
                    </span>
                </>
            )}
        </div>
    );
}
