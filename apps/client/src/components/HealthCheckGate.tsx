"use client";
import { useEffect, useState } from "react";
import { SessionProvider } from "@/contexts/SessionContext";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { API_BASE } from "@/services";

export default function HealthCheckGate({
    children,
}: {
    children: React.ReactNode;
}) {
    const [serverUp, setServerUp] = useState<boolean | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/healthz`)
            .then((res) => {
                if (res.ok) {
                    setServerUp(true);
                } else {
                    setServerUp(false);
                }
            })
            .catch(() => setServerUp(false));
    }, []);

    return (
        <SessionProvider>
            <TooltipProvider delayDuration={300}>
                <div className="w-full flex justify-end p-4 fixed top-0 left-0 z-50 pointer-events-none">
                    <div className="pointer-events-auto">
                        <DarkModeToggle />
                    </div>
                </div>
                {serverUp === null && (
                    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
                        <span className="text-lg dark:text-white">
                            Checking server status...
                        </span>
                    </div>
                )}
                {serverUp === false && (
                    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
                        <span className="text-lg text-red-600 dark:text-red-400">
                            Server is down. Please try again later.
                        </span>
                    </div>
                )}
                {serverUp && <main>{children}</main>}
                <Toaster richColors position="top-right" />
            </TooltipProvider>
        </SessionProvider>
    );
}
