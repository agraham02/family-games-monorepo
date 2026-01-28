"use client";

import React from "react";
import { DominoesData, DominoesPlayerData } from "@shared/types";

interface DominoesProps {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}

/**
 * Dominoes game component - placeholder for future implementation.
 */
export default function Dominoes(_props: DominoesProps) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-green-900">
            <div className="text-center text-white">
                <h1 className="text-2xl font-bold mb-4">Dominoes</h1>
                <p className="text-white/70">Coming soon...</p>
            </div>
        </div>
    );
}
