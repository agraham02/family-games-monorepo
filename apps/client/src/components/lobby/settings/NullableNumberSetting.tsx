// src/components/lobby/settings/NullableNumberSetting.tsx
"use client";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import type { SettingDefinition } from "@shared/types";

interface NullableNumberSettingProps {
    definition: SettingDefinition;
    value: number | null;
    onChange: (key: string, value: number | null) => void;
    disabled: boolean;
}

export function NullableNumberSetting({
    definition,
    value,
    onChange,
    disabled,
}: NullableNumberSettingProps) {
    const id = `setting-${definition.key}`;
    const min = definition.min ?? 1;
    const max = definition.max ?? 100;
    const step = definition.step ?? 1;
    const suffix = definition.suffix ?? "";

    const isEnabled = value !== null;
    const numericValue = value ?? (definition.default as number) ?? min;

    // Format display value
    const displayValue = isEnabled
        ? suffix
            ? `${numericValue} ${suffix}`
            : String(numericValue)
        : "Disabled";

    function handleToggle(enabled: boolean) {
        if (enabled) {
            onChange(definition.key, (definition.default as number) ?? min);
        } else {
            onChange(definition.key, null);
        }
    }

    function handleSliderChange(newValue: number) {
        onChange(definition.key, newValue);
    }

    return (
        <div className="space-y-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label
                        htmlFor={`${id}-toggle`}
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
                            <TooltipContent
                                side="top"
                                className="max-w-[200px]"
                            >
                                <p className="text-xs">
                                    {definition.description}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {displayValue}
                    </span>
                    <Switch
                        id={`${id}-toggle`}
                        checked={isEnabled}
                        onCheckedChange={handleToggle}
                        disabled={disabled}
                    />
                </div>
            </div>
            {isEnabled && (
                <Slider
                    id={id}
                    min={min}
                    max={max}
                    step={step}
                    value={[numericValue]}
                    onValueChange={([newValue]) => handleSliderChange(newValue)}
                    disabled={disabled}
                    className="w-full"
                />
            )}
        </div>
    );
}
