// src/components/lobby/settings/SelectSetting.tsx
"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import type { SettingDefinition } from "@/types/lobby";

interface SelectSettingProps {
    definition: SettingDefinition;
    value: string;
    onChange: (key: string, value: string) => void;
    disabled: boolean;
}

export function SelectSetting({
    definition,
    value,
    onChange,
    disabled,
}: SelectSettingProps) {
    const id = `setting-${definition.key}`;
    const options = definition.options ?? [];

    return (
        <div className="space-y-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
                <Label htmlFor={id} className="text-sm font-medium">
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
            <Select
                value={value}
                onValueChange={(newValue) => onChange(definition.key, newValue)}
                disabled={disabled}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
