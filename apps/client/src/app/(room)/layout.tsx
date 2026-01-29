import { WebSocketProvider } from "@/contexts/WebSocketContext";
import ReconnectingBanner from "@/components/ReconnectingBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServerKeepAlive } from "@/components/ServerKeepAlive";
import HealthCheckGate from "@/components/HealthCheckGate";
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";

export default function RoomLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AddToHomeScreenPrompt />
            <HealthCheckGate>
                <WebSocketProvider>
                    <ErrorBoundary>
                        <ServerKeepAlive />
                        <ReconnectingBanner />
                        {children}
                    </ErrorBoundary>
                </WebSocketProvider>
            </HealthCheckGate>
        </>
    );
}
