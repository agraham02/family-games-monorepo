// apps/client/src/components/games/rummy/hints/useSortMode.ts
//
// Persisted sort-mode state for the hero's hand. Stored in localStorage
// under `rummy.sort.mode`. Default: "smart".

"use client";

import { useCallback, useEffect, useState } from "react";
import type { RummySortMode } from "@shared/hints/rummy";

const STORAGE_KEY = "rummy.sort.mode";
const VALID: readonly RummySortMode[] = [
    "smart",
    "by-suit",
    "by-rank",
    "original",
];

function isValid(value: string | null): value is RummySortMode {
    return value !== null && (VALID as readonly string[]).includes(value);
}

export function useSortMode(): readonly [
    RummySortMode,
    (mode: RummySortMode) => void,
] {
    const [mode, setMode] = useState<RummySortMode>("smart");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isValid(stored)) setMode(stored);
    }, []);

    const update = useCallback((next: RummySortMode) => {
        setMode(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore quota / SSR
        }
    }, []);

    return [mode, update] as const;
}
