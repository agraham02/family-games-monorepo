/**
 * Celebration - Reusable celebration animation component
 *
 * Provides confetti, sparkle, and winner effects for game endings.
 * Respects reduced motion preferences.
 */

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    rotation: number;
    size: number;
}

interface CelebrationProps {
    /** Whether to show the celebration */
    show: boolean;
    /** Type of celebration effect */
    type?: "confetti" | "sparkle" | "winner";
    /** Duration in milliseconds before auto-hiding */
    duration?: number;
    /** Callback when celebration ends */
    onComplete?: () => void;
    /** Custom message to display */
    message?: string;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confetti Colors
// ─────────────────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
    "#FFD700", // Gold
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Sky blue
    "#96CEB4", // Sage
    "#FFEAA7", // Cream
    "#DDA0DD", // Plum
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
];

// ─────────────────────────────────────────────────────────────────────────────
// Confetti Piece Component
// ─────────────────────────────────────────────────────────────────────────────

function ConfettiPieceComponent({ piece }: { piece: ConfettiPiece }) {
    const prefersReducedMotion = usePrefersReducedMotion();

    if (prefersReducedMotion) return null;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: `${piece.x}%`,
                top: -20,
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                borderRadius: 2,
            }}
            initial={{
                y: -20,
                rotate: piece.rotation,
                opacity: 1,
            }}
            animate={{
                y: "120vh",
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0.8, 0],
            }}
            transition={{
                duration: 3,
                delay: piece.delay,
                ease: "linear",
            }}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle Component
// ─────────────────────────────────────────────────────────────────────────────

interface SparkleProps {
    x: number;
    y: number;
    delay: number;
    size: number;
}

function Sparkle({ x, y, delay, size }: SparkleProps) {
    const prefersReducedMotion = usePrefersReducedMotion();

    if (prefersReducedMotion) return null;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: `${x}%`,
                top: `${y}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
            }}
            transition={{
                duration: 0.8,
                delay,
                repeat: 2,
            }}
        >
            <svg width={size} height={size} viewBox="0 0 24 24">
                <path
                    d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                    fill="#FFD700"
                />
            </svg>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Winner Crown Component
// ─────────────────────────────────────────────────────────────────────────────

function WinnerCrown({ className }: { className?: string }) {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <motion.div
            className={cn("text-6xl", className)}
            initial={{ scale: 0, rotate: -45, y: 50 }}
            animate={{
                scale: prefersReducedMotion ? 1 : [0, 1.2, 1],
                rotate: prefersReducedMotion ? 0 : [-45, 10, 0],
                y: 0,
            }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                duration: prefersReducedMotion ? 0.1 : undefined,
            }}
        >
            👑
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Celebration Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Celebration - Shows celebratory animations for game events
 */
export function Celebration({
    show,
    type = "confetti",
    duration = 3000,
    onComplete,
    message,
    className,
}: CelebrationProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [isVisible, setIsVisible] = useState(show);

    // Generate confetti pieces
    const confettiPieces = useMemo(() => {
        if (type !== "confetti" || prefersReducedMotion) return [];

        return Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            color: CONFETTI_COLORS[
                Math.floor(Math.random() * CONFETTI_COLORS.length)
            ],
            delay: Math.random() * 0.5,
            rotation: Math.random() * 360,
            size: 8 + Math.random() * 8,
        }));
    }, [type, prefersReducedMotion]);

    // Generate sparkles
    const sparkles = useMemo(() => {
        if (type !== "sparkle" || prefersReducedMotion) return [];

        return Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60,
            delay: i * 0.1,
            size: 20 + Math.random() * 20,
        }));
    }, [type, prefersReducedMotion]);

    // Auto-hide after duration
    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [show, duration, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={cn(
                        "fixed inset-0 pointer-events-none z-[100] overflow-hidden",
                        className,
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Confetti Effect */}
                    {type === "confetti" &&
                        confettiPieces.map((piece) => (
                            <ConfettiPieceComponent
                                key={piece.id}
                                piece={piece}
                            />
                        ))}

                    {/* Sparkle Effect */}
                    {type === "sparkle" &&
                        sparkles.map((sparkle) => (
                            <Sparkle key={sparkle.id} {...sparkle} />
                        ))}

                    {/* Winner Effect */}
                    {type === "winner" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <WinnerCrown />
                            {!prefersReducedMotion && (
                                <>
                                    {confettiPieces
                                        .slice(0, 30)
                                        .map((piece) => (
                                            <ConfettiPieceComponent
                                                key={piece.id}
                                                piece={piece}
                                            />
                                        ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* Message overlay */}
                    {message && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="bg-black/60 backdrop-blur-sm text-white text-3xl font-bold px-8 py-4 rounded-2xl shadow-2xl">
                                {message}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Winner Announcement Component
// ─────────────────────────────────────────────────────────────────────────────

interface WinnerAnnouncementProps {
    show: boolean;
    winnerName: string;
    score?: number;
    onDismiss?: () => void;
}

/**
 * WinnerAnnouncement - Full-screen winner celebration
 */
export function WinnerAnnouncement({
    show,
    winnerName,
    score,
    onDismiss,
}: WinnerAnnouncementProps) {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onDismiss}
                >
                    {/* Confetti background */}
                    <Celebration show={show} type="confetti" />

                    {/* Winner card */}
                    <motion.div
                        className="relative bg-gradient-to-br from-amber-500 to-yellow-600 p-8 rounded-3xl shadow-2xl text-center"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{
                            scale: 1,
                            rotate: 0,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                            duration: prefersReducedMotion ? 0.1 : undefined,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <WinnerCrown className="mx-auto mb-4" />
                        <h2 className="text-4xl font-bold text-white mb-2">
                            {winnerName} Wins!
                        </h2>
                        {score !== undefined && (
                            <p className="text-2xl text-white/90">
                                Final Score: {score}
                            </p>
                        )}
                        <motion.button
                            className="mt-6 px-6 py-3 bg-white text-amber-600 font-bold rounded-xl shadow-lg"
                            whileHover={{
                                scale: prefersReducedMotion ? 1 : 1.05,
                            }}
                            whileTap={{
                                scale: prefersReducedMotion ? 1 : 0.95,
                            }}
                            onClick={onDismiss}
                        >
                            Continue
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default Celebration;
