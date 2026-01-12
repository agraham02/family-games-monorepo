// apps/client/src/lib/colors/avatarColors.ts
// Avatar color utilities for consistent player avatar styling

/**
 * Consistent avatar color palette with gradients.
 * Uses Tailwind CSS gradient classes.
 */
export const AVATAR_COLORS = [
    "bg-gradient-to-br from-rose-400 to-pink-600",
    "bg-gradient-to-br from-violet-400 to-purple-600",
    "bg-gradient-to-br from-blue-400 to-indigo-600",
    "bg-gradient-to-br from-cyan-400 to-teal-600",
    "bg-gradient-to-br from-emerald-400 to-green-600",
    "bg-gradient-to-br from-amber-400 to-orange-600",
    "bg-gradient-to-br from-red-400 to-rose-600",
] as const;

/**
 * Get the number of available avatar colors.
 */
export const AVATAR_COLOR_COUNT = AVATAR_COLORS.length;

/**
 * Generate a consistent color index from a name or ID string.
 * Uses a simple hash function to ensure the same input always returns the same index.
 * @param nameOrId The name or ID to hash
 * @returns Color index (0 to AVATAR_COLOR_COUNT - 1)
 */
export function getAvatarColorIndex(nameOrId: string): number {
    const hash = nameOrId
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % AVATAR_COLORS.length;
}

/**
 * Generate a consistent avatar color from a name or ID string.
 * Uses a simple hash function to ensure the same input always returns the same color.
 * @param nameOrId The name or ID to hash
 * @returns Tailwind CSS gradient class
 */
export function getAvatarColor(nameOrId: string): string {
    return AVATAR_COLORS[getAvatarColorIndex(nameOrId)];
}
