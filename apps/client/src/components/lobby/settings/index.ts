// Settings Control Components
export { SettingControl } from "./SettingControl";
export { BooleanSetting } from "./BooleanSetting";
export { NumberSetting } from "./NumberSetting";
export { NullableNumberSetting } from "./NullableNumberSetting";
export { SelectSetting } from "./SelectSetting";
export { SettingsCategory } from "./SettingsCategory";

import type { SettingCategory } from "@/types/lobby";

// Category display order
export const CATEGORY_ORDER: SettingCategory[] = [
    "general",
    "scoring",
    "rules",
    "advanced",
];

// Category display names
export const CATEGORY_LABELS: Record<SettingCategory, string> = {
    general: "General",
    scoring: "Scoring",
    rules: "Rules",
    advanced: "Advanced",
};

/**
 * Get the sort order for a category
 */
export function getCategoryOrder(category: SettingCategory): number {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
}
