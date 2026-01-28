// src/components/lobby/settings/NumberSetting.tsx
"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { SettingDefinition } from "@shared/types";

interface NumberSettingProps {
    definition: SettingDefinition;
    value: number;
    onChange: (key: string, value: number) => void;
    disabled: boolean;
}

export function NumberSetting({
    definition,
    value,
    onChange,
    disabled,
}: NumberSettingProps) {
    const id = `setting-${definition.key}`;
    const min = definition.min ?? 0;
    const max = definition.max ?? 100;
    const step = definition.step ?? 1;
    const suffix = definition.suffix ?? "";

    // Format display value
    const displayValue = suffix ? `${value} ${suffix}` : String(value);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                        {definition.label}
                    </Label>
                    {definition.description && (
                        <InfoTooltip content={definition.description} />
                    )}
                </div>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {displayValue}
                </span>
            </div>
            <Slider
                id={id}
                min={min}
                max={max}
                step={step}
                value={[value]}
                onValueChange={([newValue]) =>
                    onChange(definition.key, newValue)
                }
                disabled={disabled}
                className="w-full"
            />
        </div>
    );
}
