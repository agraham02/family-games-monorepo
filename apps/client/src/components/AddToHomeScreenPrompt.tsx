"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

function isIosSafari(): boolean {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isChromeIos = /crios/i.test(ua);
    const isFirefoxIos = /fxios/i.test(ua);
    // All iOS browsers use WebKit; treat Chrome/Firefox iOS the same
    return isIos && (isChromeIos || isFirefoxIos || /safari/i.test(ua));
}

function isStandaloneMode(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari's legacy flag
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
            true
    );
}

export function AddToHomeScreenPrompt() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isIosSafari()) return;
        if (isStandaloneMode()) return;

        const dismissed =
            typeof window !== "undefined" &&
            window.localStorage.getItem("a2hs_prompt_dismissed") === "true";
        if (dismissed) return;

        setVisible(true);
    }, []);

    function handleDismiss() {
        setVisible(false);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("a2hs_prompt_dismissed", "true");
        }
    }

    if (!visible) return null;

    return (
        <div className="fixed inset-x-3 bottom-4 z-50 rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:bg-zinc-900/90 text-white">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/10 p-2">
                    <Download className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1 text-sm">
                    <p className="font-semibold">Add to Home Screen</p>
                    <p className="text-white/70 leading-5">
                        For fullscreen play, tap the Share button, then choose
                        <span className="font-semibold">
                            {" "}
                            Add to Home Screen
                        </span>
                        .
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss Add to Home Screen instructions"
                    className="h-8 w-8 text-white/70 hover:text-white"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default AddToHomeScreenPrompt;
