// src/components/lobby/GameSettingsCard.tsx
// Dynamic game settings component that renders controls based on settings definitions
"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { SettingsIcon, AlertCircleIcon } from "lucide-react";
import { useGameSettingsSchema } from "@/hooks/useGameSettingsSchema";
import {
    SettingControl,
    SettingsCategory,
    CATEGORY_ORDER,
    getCategoryOrder,
} from "./settings";
import type {
    PartialGameSettings,
    SettingDefinition,
    SettingCategory as SettingCategoryType,
} from "@shared/types";

interface GameSettingsCardProps {
    gameType: string | null;
    settings: PartialGameSettings;
    onSettingsChange: (settings: PartialGameSettings) => void;
    isLeader: boolean;
}

/**
 * Groups settings definitions by category and sorts them.
 */
function groupSettingsByCategory(
    definitions: SettingDefinition[]
): Map<SettingCategoryType, SettingDefinition[]> {
    const groups = new Map<SettingCategoryType, SettingDefinition[]>();

    // Initialize groups in order
    for (const category of CATEGORY_ORDER) {
        groups.set(category, []);
    }

    // Populate groups
    for (const def of definitions) {
        const category = def.category || "general";
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category)!.push(def);
    }

    // Remove empty groups
    for (const [category, defs] of groups) {
        if (defs.length === 0) {
            groups.delete(category);
        }
    }

    return groups;
}

/**
 * Get display name for game type
 */
function getGameDisplayName(gameType: string): string {
    const names: Record<string, string> = {
        dominoes: "Dominoes",
        spades: "Spades",
        lrc: "Left Right Center",
    };
    return names[gameType] || gameType;
}

export default function GameSettingsCard({
    gameType,
    settings,
    onSettingsChange,
    isLeader,
}: GameSettingsCardProps) {
    const { definitions, defaults, isLoading, error } =
        useGameSettingsSchema(gameType);

    // Local state for immediate UI updates
    const [localSettings, setLocalSettings] =
        useState<PartialGameSettings>(settings);

    // Sync local settings when external settings change
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Merge defaults with current local settings
    const mergedSettings = useMemo(() => {
        if (!defaults) return localSettings;
        return { ...defaults, ...localSettings };
    }, [defaults, localSettings]);

    // Debounce only the backend call, not the UI update
    const debouncedSettingsChange = useDebouncedCallback(
        (newSettings: PartialGameSettings) => {
            onSettingsChange(newSettings);
        },
        500 // Wait 500ms after last change
    );

    const handleChange = useCallback(
        (key: string, value: unknown) => {
            if (!isLeader) return;
            const newSettings = { ...mergedSettings, [key]: value };
            // Update local state immediately for responsive UI
            setLocalSettings(newSettings);
            // Debounce the backend call
            debouncedSettingsChange(newSettings);
        },
        [isLeader, mergedSettings, debouncedSettingsChange]
    );

    // Group definitions by category
    const groupedSettings = useMemo(
        () => groupSettingsByCategory(definitions),
        [definitions]
    );

    // Don't render if no game type selected
    if (!gameType) {
        return null;
    }

    // Loading state
    if (isLoading) {
        return (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <SettingsIcon className="w-4 h-4 text-amber-500" />
                        {getGameDisplayName(gameType)} Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <SettingsIcon className="w-4 h-4 text-amber-500" />
                        {getGameDisplayName(gameType)} Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-red-500">
                        <AlertCircleIcon className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No settings available
    if (definitions.length === 0) {
        return (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <SettingsIcon className="w-4 h-4 text-amber-500" />
                        {getGameDisplayName(gameType)} Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-500">
                        No configurable settings for this game.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Sort categories
    const sortedCategories = Array.from(groupedSettings.entries()).sort(
        ([a], [b]) => getCategoryOrder(a) - getCategoryOrder(b)
    );

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <SettingsIcon className="w-4 h-4 text-amber-500" />
                    {getGameDisplayName(gameType)} Settings
                    {!isLeader && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                            View only
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                {sortedCategories.map(([category, categoryDefinitions]) => (
                    <SettingsCategory
                        key={category}
                        category={category}
                        defaultExpanded={category === "scoring"}
                    >
                        {categoryDefinitions.map((definition) => (
                            <SettingControl
                                key={definition.key}
                                definition={definition}
                                value={
                                    mergedSettings[
                                        definition.key as keyof PartialGameSettings
                                    ]
                                }
                                onChange={handleChange}
                                disabled={!isLeader}
                                allSettings={mergedSettings}
                            />
                        ))}
                    </SettingsCategory>
                ))}
            </CardContent>
        </Card>
    );
}
