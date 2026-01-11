"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FullscreenPromptProps {
    /** Whether to show the prompt */
    isOpen: boolean;
    /** Callback when user makes a choice */
    onChoice: (wantsFullscreen: boolean) => void;
    /** Game name for the prompt message */
    gameName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "game-fullscreen-preference";

export function getFullscreenPreference(): boolean | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return null;
}

export function setFullscreenPreference(value: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(value));
}

export function clearFullscreenPreference(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen API helpers
// ─────────────────────────────────────────────────────────────────────────────

// Vendor-prefixed fullscreen types for cross-browser compatibility
interface VendorDocument extends Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
}

interface VendorHTMLElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
}

export function isFullscreenSupported(): boolean {
    if (typeof document === "undefined") return false;
    const elem = document.documentElement as VendorHTMLElement;
    return !!(
        elem.requestFullscreen ||
        elem.webkitRequestFullscreen ||
        elem.mozRequestFullScreen ||
        elem.msRequestFullscreen
    );
}

export function isCurrentlyFullscreen(): boolean {
    if (typeof document === "undefined") return false;
    const doc = document as VendorDocument;
    return !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
    );
}

export async function requestFullscreen(): Promise<boolean> {
    if (typeof document === "undefined") return false;

    const elem = document.documentElement as VendorHTMLElement;

    try {
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
        } else {
            return false;
        }
        return true;
    } catch (err) {
        console.warn("Failed to enter fullscreen:", err);
        return false;
    }
}

export async function exitFullscreen(): Promise<boolean> {
    if (typeof document === "undefined") return false;

    const doc = document as VendorDocument;

    try {
        if (doc.exitFullscreen) {
            await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
        } else {
            return false;
        }
        return true;
    } catch (err) {
        console.warn("Failed to exit fullscreen:", err);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile detection
// ─────────────────────────────────────────────────────────────────────────────

export function isMobileDevice(): boolean {
    if (typeof window === "undefined") return false;

    // Check for touch capability and screen size
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 1024;

    // Also check user agent for mobile devices
    const mobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

    return (hasTouch && isSmallScreen) || mobileUA;
}

// ─────────────────────────────────────────────────────────────────────────────
// FullscreenPrompt Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FullscreenPrompt - A modal dialog asking if user wants to enter fullscreen.
 *
 * Shows on mobile devices when entering a game, remembers user preference.
 */
function FullscreenPrompt({
    isOpen,
    onChoice,
    gameName = "this game",
}: FullscreenPromptProps) {
    const handleYes = useCallback(async () => {
        setFullscreenPreference(true);
        const success = await requestFullscreen();
        onChoice(success);
    }, [onChoice]);

    const handleNo = useCallback(() => {
        setFullscreenPreference(false);
        onChoice(false);
    }, [onChoice]);

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">📱</span>
                        Fullscreen Mode
                    </DialogTitle>
                    <DialogDescription>
                        For the best experience playing {gameName}, we recommend
                        using fullscreen mode. This hides the browser UI and
                        gives you more room to play.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="text-3xl">🎮</div>
                        <div className="text-sm text-muted-foreground">
                            You can exit fullscreen anytime by pressing{" "}
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                Esc
                            </kbd>{" "}
                            or swiping down from the top of your screen.
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={handleNo}
                        className="sm:flex-1"
                    >
                        No, thanks
                    </Button>
                    <Button
                        onClick={handleYes}
                        className="sm:flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                        Enter Fullscreen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for managing fullscreen prompt
// ─────────────────────────────────────────────────────────────────────────────

export interface UseFullscreenPromptOptions {
    /** Only show prompt on mobile devices */
    mobileOnly?: boolean;
    /** Auto-apply saved preference without prompting */
    autoApplyPreference?: boolean;
}

export function useFullscreenPrompt(options: UseFullscreenPromptOptions = {}) {
    const { mobileOnly = true, autoApplyPreference = true } = options;
    const [showPrompt, setShowPrompt] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked) return;

        // Only run on client
        if (typeof window === "undefined") return;

        // Check if fullscreen is supported
        if (!isFullscreenSupported()) {
            setHasChecked(true);
            return;
        }

        // Only show on mobile if mobileOnly is true
        if (mobileOnly && !isMobileDevice()) {
            setHasChecked(true);
            return;
        }

        // Check for saved preference
        const preference = getFullscreenPreference();

        if (preference !== null && autoApplyPreference) {
            // Auto-apply saved preference
            if (preference && !isCurrentlyFullscreen()) {
                // Need a user gesture to enter fullscreen, so we still show prompt
                // but with a different message indicating their preference
                setShowPrompt(true);
            }
            setHasChecked(true);
        } else if (preference === null) {
            // No saved preference, show prompt
            setShowPrompt(true);
            setHasChecked(true);
        } else {
            setHasChecked(true);
        }
    }, [hasChecked, mobileOnly, autoApplyPreference]);

    const handleChoice = useCallback((_wantsFullscreen: boolean) => {
        setShowPrompt(false);
    }, []);

    const triggerPrompt = useCallback(() => {
        setShowPrompt(true);
    }, []);

    return {
        showPrompt,
        handleChoice,
        triggerPrompt,
        isFullscreenSupported: isFullscreenSupported(),
        isMobile: isMobileDevice(),
    };
}

export default FullscreenPrompt;
