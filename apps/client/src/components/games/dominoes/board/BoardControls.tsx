"use client";

import { motion } from "motion/react";
import { ZoomIn, ZoomOut, ScanEye } from "lucide-react";
import { useDominoesStore } from "../store";

export default function BoardControls() {
    const stageScale = useDominoesStore((s) => s.stageScale);
    const setStageScale = useDominoesStore((s) => s.setStageScale);
    const autoFit = useDominoesStore((s) => s.autoFit);
    const setAutoFit = useDominoesStore((s) => s.setAutoFit);
    const disableAutoFit = useDominoesStore((s) => s.disableAutoFit);

    const btnBase =
        "w-8 h-8 md:w-10 md:h-10 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-card transition-colors text-foreground";

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
            data-board-overlay
            className="absolute bottom-2 right-2 flex flex-col gap-1.5 z-30"
        >
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                    disableAutoFit();
                    setStageScale(Math.min(3, stageScale * 1.2));
                }}
                className={btnBase}
                aria-label="Zoom in"
            >
                <ZoomIn size={18} />
            </motion.button>
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                    disableAutoFit();
                    setStageScale(Math.max(0.3, stageScale / 1.2));
                }}
                className={btnBase}
                aria-label="Zoom out"
            >
                <ZoomOut size={18} />
            </motion.button>
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setAutoFit(!autoFit)}
                className={`${btnBase} ${autoFit ? "bg-blue-600/80! border-blue-500! text-white!" : ""}`}
                aria-label={
                    autoFit
                        ? "Disable auto-fit camera"
                        : "Enable auto-fit camera"
                }
                title={autoFit ? "Auto-fit: ON" : "Auto-fit: OFF"}
            >
                <ScanEye size={18} />
            </motion.button>
        </motion.div>
    );
}
