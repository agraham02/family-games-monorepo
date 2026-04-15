"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

/**
 * RotateDeviceOverlay - Shows a full-screen overlay asking the user to rotate
 * their device to landscape when in portrait on a mobile device.
 *
 * Only renders on viewports where width < height AND width < 768px.
 * Uses CSS media queries + JS for robust detection.
 */
export default function RotateDeviceOverlay() {
    return (
        <>
            {/* CSS-only approach using media queries + Tailwind */}
            <div
                className={
                    "fixed inset-0 z-9999 bg-black/95 flex-col items-center justify-center gap-6 text-white " +
                    // Show only in portrait on small screens
                    "hidden portrait:flex portrait:sm:hidden"
                }
            >
                <div className="animate-bounce">
                    <RotateCcw className="w-16 h-16 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-center px-8">
                    Please Rotate Your Device
                </h2>
                <p className="text-white/70 text-center px-8 text-sm max-w-xs">
                    This game is best played in landscape mode. Please rotate
                    your device to continue.
                </p>
            </div>
        </>
    );
}
