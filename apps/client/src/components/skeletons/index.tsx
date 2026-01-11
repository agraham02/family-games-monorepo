"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the game page
 * Shows a loading state while game data is being fetched
 */
export function GameSkeleton() {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
            {/* Game table area */}
            <div className="relative w-full max-w-4xl aspect-square">
                {/* Center area (card table) */}
                <Skeleton className="absolute inset-[20%] rounded-full" />

                {/* Player positions */}
                {/* Top */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
                {/* Right */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
                {/* Bottom */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
                {/* Left */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>

            {/* Hand area */}
            <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="h-24 w-16 rounded-lg"
                        style={{
                            transform: `rotate(${(i - 3) * 5}deg)`,
                        }}
                    />
                ))}
            </div>

            {/* Game info sidebar */}
            <div className="fixed top-4 right-4 w-64 space-y-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
            </div>
        </main>
    );
}

/**
 * Skeleton loader for the lobby page
 * Shows a loading state while lobby data is being fetched
 */
export function LobbySkeleton() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <div className="px-4 py-6 md:py-8">
                {/* Header Skeleton */}
                <div className="max-w-6xl mx-auto">
                    <div className="p-4 md:p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-48" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-24 rounded-full" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-12 w-48 rounded-xl" />
                                <Skeleton className="h-10 w-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 w-full max-w-6xl mx-auto mt-6 md:mt-8">
                    {/* Player List Card */}
                    <div className="lg:col-span-4 bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-lg p-4 space-y-3 border border-zinc-200/50 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="h-9 w-9 rounded-lg" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                            >
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-8 w-16 rounded-md" />
                            </div>
                        ))}
                    </div>

                    {/* Available Games Card */}
                    <div className="lg:col-span-4 bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-lg p-4 space-y-3 border border-zinc-200/50 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="h-9 w-9 rounded-lg" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-20 w-full rounded-xl"
                            />
                        ))}
                    </div>

                    {/* Room Controls Card */}
                    <div className="lg:col-span-4 bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-lg p-4 space-y-4 border border-zinc-200/50 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Skeleton className="h-9 w-9 rounded-lg" />
                            <Skeleton className="h-6 w-28" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-1 w-full" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </main>
    );
}
