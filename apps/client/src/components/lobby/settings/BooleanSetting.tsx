// src/components/lobby/settings/BooleanSetting.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { SettingDefinition } from "@shared/types";

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
                    <InfoTooltip content={definition.description} />
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
