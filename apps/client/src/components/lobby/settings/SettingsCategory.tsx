// src/components/lobby/settings/SettingsCategory.tsx
"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingCategory as SettingCategoryType } from "@/types/lobby";

interface SettingsCategoryProps {
    category: SettingCategoryType;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

const CATEGORY_LABELS: Record<SettingCategoryType, string> = {
    general: "General",
    scoring: "Scoring",
    rules: "Rules",
    advanced: "Advanced",
};

const CATEGORY_ORDER: SettingCategoryType[] = [
    "scoring",
    "rules",
    "general",
    "advanced",
];

export function getCategoryOrder(category: SettingCategoryType): number {
    return CATEGORY_ORDER.indexOf(category);
}

export function SettingsCategory({
    category,
    children,
    defaultExpanded = true,
}: SettingsCategoryProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const label = CATEGORY_LABELS[category] || category;
    const Icon = isExpanded ? ChevronDownIcon : ChevronRightIcon;

    return (
        <div className="border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "flex items-center justify-between w-full py-2 px-1 text-left",
                    "text-sm font-medium text-zinc-700 dark:text-zinc-300",
                    "hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                )}
            >
                <span>{label}</span>
                <Icon className="w-4 h-4 text-zinc-400" />
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    isExpanded
                        ? "max-h-[1000px] opacity-100 pb-3"
                        : "max-h-0 opacity-0"
                )}
            >
                <div className="space-y-3">{children}</div>
            </div>
        </div>
    );
}

export { CATEGORY_ORDER };
