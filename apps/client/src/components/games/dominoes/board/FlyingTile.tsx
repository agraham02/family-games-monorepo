"use client";

import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useDominoesStore } from "../store";

const PIP_LAYOUTS: Record<number, [number, number][]> = {
    0: [],
    1: [[50, 50]],
    2: [
        [25, 25],
        [75, 75],
    ],
    3: [
        [25, 25],
        [50, 50],
        [75, 75],
    ],
    4: [
        [25, 25],
        [75, 25],
        [25, 75],
        [75, 75],
    ],
    5: [
        [25, 25],
        [75, 25],
        [50, 50],
        [25, 75],
        [75, 75],
    ],
    6: [
        [25, 25],
        [75, 25],
        [25, 50],
        [75, 50],
        [25, 75],
        [75, 75],
    ],
};

function PipHalf({ value }: { value: number }) {
    return (
        <div className="relative w-full h-full">
            {PIP_LAYOUTS[value]?.map(([x, y], i) => (
                <div
                    key={i}
                    className="absolute w-1.75 h-1.75 rounded-full bg-[#1B1B1B]"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                />
            ))}
        </div>
    );
}

const TILE_W = 52;
const TILE_H = 100;

export default function FlyingTile() {
    const flyingTile = useDominoesStore((s) => s.flyingTile);
    const clearFlyingTile = useDominoesStore((s) => s.clearFlyingTile);

    const dest = useMemo(() => {
        if (!flyingTile) return { x: 0, y: 0 };
        const boardEl = document.querySelector("[data-board]");
        if (boardEl) {
            const rect = boardEl.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        }
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }, [flyingTile]);

    useEffect(() => {
        if (!flyingTile) return;
        const timeout = setTimeout(() => clearFlyingTile(), 600);
        return () => clearTimeout(timeout);
    }, [flyingTile, clearFlyingTile]);

    if (!flyingTile) return null;

    return (
        <motion.div
            key={`fly-${flyingTile.pip1}-${flyingTile.pip2}-${flyingTile.fromX}`}
            className="fixed pointer-events-none z-50"
            initial={{
                left: flyingTile.fromX - TILE_W / 2,
                top: flyingTile.fromY - TILE_H / 2,
                scale: 1.08,
                opacity: 1,
            }}
            animate={{
                left: dest.x - TILE_W / 2,
                top: dest.y - TILE_H / 2,
                scale: 0.5,
                opacity: 0,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => clearFlyingTile()}
        >
            <div className="flex flex-col w-13 h-25 rounded-lg border-2 border-[var(--tile-selected)] shadow-[0_0_16px_var(--tile-selected)] bg-[var(--tile-face)]">
                <div className="flex-1 border-b border-[#A0926B]">
                    <PipHalf value={flyingTile.pip1} />
                </div>
                <div className="flex-1">
                    <PipHalf value={flyingTile.pip2} />
                </div>
            </div>
        </motion.div>
    );
}
