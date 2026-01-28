"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { DieFace, DIE_FACE_COLORS } from "@shared/types";
import { ArrowLeft, ArrowRight, Circle, Target, Sparkles } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DieProps {
    /** The face to display (L, C, R, DOT, WILD) */
    face: DieFace;
    /** Size of the die in pixels */
    size?: number;
    /** Whether the die is currently rolling */
    isRolling?: boolean;
    /** Delay before showing final face (for staggered reveals) */
    revealDelay?: number;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Face Icon Component
// ─────────────────────────────────────────────────────────────────────────────

function DieFaceIcon({ face, size }: { face: DieFace; size: number }) {
    const iconSize = Math.round(size * 0.45);
    const labelSize = Math.round(size * 0.22);

    // Get distinct background gradient for each face type
    const getFaceStyles = () => {
        switch (face) {
            case "L":
                return "drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"; // Blue glow
            case "R":
                return "drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"; // Green glow
            case "C":
                return "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"; // Red glow
            case "DOT":
                return "drop-shadow-[0_0_6px_rgba(147,51,234,0.8)]"; // Purple glow
            case "WILD":
                return "drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]"; // Amber glow
            default:
                return "";
        }
    };

    switch (face) {
        case "L":
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-0.5",
                        getFaceStyles(),
                    )}
                >
                    <ArrowLeft
                        size={iconSize}
                        strokeWidth={3.5}
                        className="drop-shadow-md"
                    />
                    <span
                        className="font-black tracking-wider drop-shadow-md"
                        style={{ fontSize: labelSize }}
                    >
                        LEFT
                    </span>
                </div>
            );
        case "R":
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-0.5",
                        getFaceStyles(),
                    )}
                >
                    <ArrowRight
                        size={iconSize}
                        strokeWidth={3.5}
                        className="drop-shadow-md"
                    />
                    <span
                        className="font-black tracking-wider drop-shadow-md"
                        style={{ fontSize: labelSize }}
                    >
                        RIGHT
                    </span>
                </div>
            );
        case "C":
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-0.5",
                        getFaceStyles(),
                    )}
                >
                    <Target
                        size={iconSize}
                        strokeWidth={3}
                        className="drop-shadow-md"
                    />
                    <span
                        className="font-black tracking-wider drop-shadow-md"
                        style={{ fontSize: labelSize }}
                    >
                        CENTER
                    </span>
                </div>
            );
        case "DOT":
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-1",
                        getFaceStyles(),
                    )}
                >
                    <Circle
                        size={iconSize * 0.8}
                        fill="currentColor"
                        strokeWidth={0}
                        className="drop-shadow-lg"
                    />
                    <span
                        className="font-bold tracking-wide opacity-80"
                        style={{ fontSize: labelSize * 0.9 }}
                    >
                        KEEP
                    </span>
                </div>
            );
        case "WILD":
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-0.5",
                        getFaceStyles(),
                    )}
                >
                    <Sparkles
                        size={iconSize}
                        strokeWidth={2.5}
                        className="drop-shadow-lg"
                    />
                    <span
                        className="font-black tracking-widest drop-shadow-md"
                        style={{ fontSize: labelSize }}
                    >
                        WILD
                    </span>
                </div>
            );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Die Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Die - A 3D animated LRC die component.
 *
 * Features:
 * - 3D cube appearance with CSS transforms
 * - Roll animation with tumbling effect
 * - Color-coded faces (L=blue, R=green, C=red, DOT=purple, WILD=amber)
 * - Bounce effect on reveal
 */
export function Die({
    face,
    size = 80,
    isRolling = false,
    revealDelay = 0,
    className,
}: DieProps) {
    const [_showFace, setShowFace] = useState(!isRolling);
    const [rollComplete, setRollComplete] = useState(!isRolling);

    // Handle rolling animation
    useEffect(() => {
        if (isRolling) {
            setShowFace(false);
            setRollComplete(false);

            // Show face after roll animation + reveal delay
            const timer = setTimeout(() => {
                setShowFace(true);
                setRollComplete(true);
            }, 800 + revealDelay);

            return () => clearTimeout(timer);
        } else {
            setShowFace(true);
            setRollComplete(true);
        }
    }, [isRolling, revealDelay]);

    const faceColor = DIE_FACE_COLORS[face];

    return (
        <div
            className={cn("relative perspective-500", className)}
            style={{ width: size, height: size }}
        >
            <AnimatePresence mode="wait">
                {isRolling && !rollComplete ? (
                    // Rolling animation
                    <motion.div
                        key="rolling"
                        className="absolute inset-0 rounded-xl bg-white shadow-lg"
                        style={{
                            transformStyle: "preserve-3d",
                        }}
                        animate={{
                            rotateX: [0, 360, 720, 1080],
                            rotateY: [0, 180, 360, 540],
                            rotateZ: [0, 90, 180, 270],
                        }}
                        transition={{
                            duration: 0.8,
                            ease: "easeOut",
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-xl flex items-center justify-center"
                            style={{
                                background:
                                    "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
                            }}
                        >
                            <Circle
                                size={size * 0.4}
                                className="text-gray-400"
                            />
                        </div>
                    </motion.div>
                ) : (
                    // Final face
                    <motion.div
                        key="face"
                        className="absolute inset-0 rounded-xl shadow-lg overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${faceColor} 0%, ${faceColor}cc 100%)`,
                        }}
                        initial={
                            isRolling
                                ? { scale: 0.5, opacity: 0, rotateY: 180 }
                                : { scale: 1, opacity: 1 }
                        }
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                        }}
                    >
                        {/* Die face content */}
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            <DieFaceIcon face={face} size={size} />
                        </div>

                        {/* Shine effect */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                            }}
                        />

                        {/* Edge highlight */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                                boxShadow:
                                    "inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.2)",
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dice Tray Component
// ─────────────────────────────────────────────────────────────────────────────

interface DiceTrayProps {
    /** Array of die faces to display */
    dice: DieFace[];
    /** Size of each die */
    dieSize?: number;
    /** Whether dice are currently rolling */
    isRolling?: boolean;
    /** Gap between dice */
    gap?: number;
    /** Additional class names */
    className?: string;
}

/**
 * DiceTray - Container for multiple dice with staggered reveal animation.
 */
export function DiceTray({
    dice,
    dieSize = 70,
    isRolling = false,
    gap = 12,
    className,
}: DiceTrayProps) {
    return (
        <motion.div
            className={cn("flex items-center justify-center", className)}
            style={{ gap }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {dice.map((face, idx) => (
                <Die
                    key={idx}
                    face={face}
                    size={dieSize}
                    isRolling={isRolling}
                    revealDelay={idx * 150} // Staggered reveal
                />
            ))}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Roll Button Component
// ─────────────────────────────────────────────────────────────────────────────

interface RollButtonProps {
    /** Click handler */
    onClick: () => void;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether a roll is in progress */
    isRolling?: boolean;
    /** Number of dice to roll */
    diceCount?: number;
    /** Additional class names */
    className?: string;
}

/**
 * RollButton - Animated button for rolling dice.
 */
export function RollButton({
    onClick,
    disabled = false,
    isRolling = false,
    diceCount = 3,
    className,
}: RollButtonProps) {
    return (
        <motion.button
            className={cn(
                "px-8 py-4 rounded-full font-bold text-lg",
                "bg-linear-to-br from-amber-500 to-orange-600",
                "text-white shadow-lg",
                "hover:from-amber-400 hover:to-orange-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors",
                className,
            )}
            onClick={onClick}
            disabled={disabled || isRolling}
            whileHover={!disabled && !isRolling ? { scale: 1.05 } : {}}
            whileTap={!disabled && !isRolling ? { scale: 0.95 } : {}}
        >
            {isRolling ? (
                <span className="flex items-center gap-2">
                    <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        🎲
                    </motion.span>
                    Rolling...
                </span>
            ) : (
                <span className="flex items-center gap-2">
                    🎲 Roll {diceCount} {diceCount === 1 ? "Die" : "Dice"}
                </span>
            )}
        </motion.button>
    );
}

export default Die;
