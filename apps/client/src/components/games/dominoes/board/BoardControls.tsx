"use client";

import { motion } from "motion/react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useDominoesStore } from "../store";

export default function BoardControls() {
    const stageScale = useDominoesStore((s) => s.stageScale);
    const setStageScale = useDominoesStore((s) => s.setStageScale);
    const resetView = useDominoesStore((s) => s.resetView);

    return (
        <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
            }}
            className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10"
        >
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setStageScale(Math.min(3, stageScale * 1.2))}
                className="w-10 h-10 rounded-lg bg-card/80 backdrop-blur border border-border
                   flex items-center justify-center hover:bg-card transition-colors
                   text-foreground"
                aria-label="Zoom in"
            >
                <ZoomIn size={18} />
            </motion.button>
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setStageScale(Math.max(0.3, stageScale / 1.2))}
                className="w-10 h-10 rounded-lg bg-card/80 backdrop-blur border border-border
                   flex items-center justify-center hover:bg-card transition-colors
                   text-foreground"
                aria-label="Zoom out"
            >
                <ZoomOut size={18} />
            </motion.button>
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={resetView}
                className="w-10 h-10 rounded-lg bg-card/80 backdrop-blur border border-border
                   flex items-center justify-center hover:bg-card transition-colors
                   text-foreground"
                aria-label="Reset view"
            >
                <Maximize2 size={18} />
            </motion.button>
        </motion.div>
    );
}
