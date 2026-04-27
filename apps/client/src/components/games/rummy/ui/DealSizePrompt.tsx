"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export interface DealSizePromptProps {
    isOpen: boolean;
    isDealer: boolean;
    dealerName: string;
    /** Inclusive odd bounds. */
    minSize: number;
    maxSize: number;
    onConfirm: (handSize: number) => void;
    /**
     * Seconds before the dealer's current selection is auto-submitted to keep
     * the round moving when no one is paying attention. Defaults to 20s.
     */
    autoConfirmSeconds?: number;
}

function clampOdd(v: number, min: number, max: number): number {
    let n = Math.round(v);
    if (n < min) n = min;
    if (n > max) n = max;
    if (n % 2 === 0) n = n + 1 <= max ? n + 1 : n - 1;
    return n;
}

/**
 * Modal shown at the start of each round. Dealer sees a stepper bounded by
 * [minSize..maxSize] (odd values). Non-dealer players see a waiting overlay.
 *
 * If the dealer doesn't confirm within `autoConfirmSeconds`, the currently
 * displayed value is auto-submitted so the round isn't blocked.
 */
export default function DealSizePrompt({
    isOpen,
    isDealer,
    dealerName,
    minSize,
    maxSize,
    onConfirm,
    autoConfirmSeconds = 20,
}: DealSizePromptProps) {
    const initial = clampOdd(
        Math.floor((minSize + maxSize) / 2),
        minSize,
        maxSize,
    );
    const [value, setValue] = useState<number>(initial);
    const [secondsLeft, setSecondsLeft] = useState<number>(autoConfirmSeconds);
    const valueRef = useRef(value);
    const confirmedRef = useRef(false);

    // Keep latest value available to the timer callback.
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // Reset value + countdown whenever the prompt opens or bounds change.
    useEffect(() => {
        if (isOpen) {
            setValue(clampOdd(initial, minSize, maxSize));
            setSecondsLeft(autoConfirmSeconds);
            confirmedRef.current = false;
        }
    }, [isOpen, initial, minSize, maxSize, autoConfirmSeconds]);

    // Countdown tick — only the dealer needs to auto-submit.
    useEffect(() => {
        if (!isOpen || !isDealer) return;
        const interval = setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, isDealer]);

    // Fire auto-confirm when countdown hits zero.
    useEffect(() => {
        if (!isOpen || !isDealer) return;
        if (secondsLeft > 0) return;
        if (confirmedRef.current) return;
        confirmedRef.current = true;
        onConfirm(clampOdd(valueRef.current, minSize, maxSize));
    }, [isOpen, isDealer, secondsLeft, onConfirm, minSize, maxSize]);

    const handleConfirm = () => {
        if (confirmedRef.current) return;
        confirmedRef.current = true;
        onConfirm(value);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-white"
            >
                {isDealer ? (
                    <>
                        <h2 className="text-lg font-semibold mb-1">
                            Choose hand size
                        </h2>
                        <p className="text-sm text-white/60 mb-4">
                            Odd values between {minSize} and {maxSize}.
                        </p>
                        <div className="flex items-center justify-center gap-4 my-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() =>
                                    setValue((v) =>
                                        clampOdd(v - 2, minSize, maxSize),
                                    )
                                }
                                disabled={value <= minSize}
                                aria-label="Decrease"
                            >
                                −
                            </Button>
                            <span className="text-4xl font-mono font-semibold w-16 text-center">
                                {value}
                            </span>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() =>
                                    setValue((v) =>
                                        clampOdd(v + 2, minSize, maxSize),
                                    )
                                }
                                disabled={value >= maxSize}
                                aria-label="Increase"
                            >
                                +
                            </Button>
                        </div>
                        <Button className="w-full" onClick={handleConfirm}>
                            Deal {value} cards
                        </Button>
                        <p
                            className="text-xs text-white/50 text-center mt-3"
                            aria-live="polite"
                        >
                            Auto-dealing in {secondsLeft}s…
                        </p>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <div className="animate-pulse text-3xl mb-3">🎴</div>
                        <h2 className="text-lg font-semibold mb-1">
                            Waiting for {dealerName}
                        </h2>
                        <p className="text-sm text-white/60">
                            Choosing this round&apos;s hand size…
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
