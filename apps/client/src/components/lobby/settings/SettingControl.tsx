// src/components/lobby/settings/SettingControl.tsx
"use client";

import { BooleanSetting } from "./BooleanSetting";
import { NumberSetting } from "./NumberSetting";
import { NullableNumberSetting } from "./NullableNumberSetting";
import { SelectSetting } from "./SelectSetting";
import type { SettingDefinition, PartialGameSettings } from "@shared/types";

interface SettingControlProps {
    definition: SettingDefinition;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    disabled: boolean;
    allSettings: PartialGameSettings;
}

/**
 * Renders the appropriate setting control based on the definition type.
 * Also handles dependency checking - returns null if dependency is not met.
 */
export function SettingControl({
    definition,
    value,
    onChange,
    disabled,
    allSettings,
}: SettingControlProps) {
    // Check dependency
    if (definition.dependsOn) {
        const parentValue =
            allSettings[definition.dependsOn.key as keyof PartialGameSettings];
        if (parentValue !== definition.dependsOn.value) {
            // Dependency not met - don't render this control
            return null;
        }
    }

    // Get effective value (use default if undefined)
    const effectiveValue = value !== undefined ? value : definition.default;

    switch (definition.type) {
        case "boolean":
            return (
                <BooleanSetting
                    definition={definition}
                    value={Boolean(effectiveValue)}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case "number":
            return (
                <NumberSetting
                    definition={definition}
                    value={Number(effectiveValue)}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case "nullableNumber":
            return (
                <NullableNumberSetting
                    definition={definition}
                    value={effectiveValue as number | null}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case "select":
            return (
                <SelectSetting
                    definition={definition}
                    value={String(effectiveValue)}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        default:
            // Unknown type - render nothing
            console.warn(`Unknown setting type: ${definition.type}`);
            return null;
    }
}
