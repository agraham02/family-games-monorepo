import { WebSocketProvider } from "@/contexts/WebSocketContext";
import ReconnectingBanner from "@/components/ReconnectingBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServerKeepAlive } from "@/components/ServerKeepAlive";

export default function RoomLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WebSocketProvider>
            <ErrorBoundary>
                <ServerKeepAlive />
                <ReconnectingBanner />
                {children}
            </ErrorBoundary>
        </WebSocketProvider>
    );
}
