import { useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { toast } from "sonner";

/**
 * Hook to automatically handle WebSocket error events with toast notifications
 */
export function useWebSocketError() {
    const { socket } = useWebSocket();

    useEffect(() => {
        if (!socket) return;

        const handleGameError = (data: { message: string }) => {
            toast.error(data.message);
        };

        const handleActionError = (data: {
            message: string;
            action: string;
        }) => {
            toast.error(`${data.action}: ${data.message}`);
        };

        socket.on("game_error", handleGameError);
        socket.on("action_error", handleActionError);

        return () => {
            socket.off("game_error", handleGameError);
            socket.off("action_error", handleActionError);
        };
    }, [socket]);
}
