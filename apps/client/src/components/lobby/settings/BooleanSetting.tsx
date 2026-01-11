// src/components/lobby/settings/BooleanSetting.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import type { SettingDefinition } from "@/types/lobby";

interface BooleanSettingProps {
    definition: SettingDefinition;
    value: boolean;
    onChange: (key: string, value: boolean) => void;
    disabled: boolean;
}

export function BooleanSetting({
    definition,
    value,
    onChange,
    disabled,
}: BooleanSettingProps) {
    const id = `setting-${definition.key}`;

    return (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
                <Label
                    htmlFor={id}
                    className="text-sm font-medium cursor-pointer"
                >
                    {definition.label}
                </Label>
                {definition.description && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <InfoIcon className="w-3.5 h-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs">{definition.description}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <Switch
                id={id}
                checked={value}
                onCheckedChange={(checked: boolean) =>
                    onChange(definition.key, checked)
                }
                disabled={disabled}
            />
        </div>
    );
}
