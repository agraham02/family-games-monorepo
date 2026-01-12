// packages/shared/src/utils/player.ts
// Player-related utility functions

// ============================================================================
// Avatar Colors
// ============================================================================

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
 * Generate a consistent avatar color from a name or ID string.
 * Uses a simple hash function to ensure the same input always returns the same color.
 * @param nameOrId The name or ID to hash
 * @returns Tailwind CSS gradient class
 */
export function getAvatarColor(nameOrId: string): string {
    const hash = nameOrId
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================================================
// Name Formatting
// ============================================================================

/**
 * Get initials from a player name (1-2 characters).
 * Handles single names, multi-word names, and edge cases.
 * @param name The player name
 * @returns Uppercase initials (1-2 characters)
 */
export function getInitials(name: string): string {
    if (!name || name.trim() === "") return "?";

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        // Single name: take first two characters
        return words[0].slice(0, 2).toUpperCase();
    }
    // Multi-word: take first character of first two words
    return words
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

/**
 * Truncate a player name to a maximum length with ellipsis.
 * @param name The player name
 * @param maxLength Maximum length (default: 12)
 * @returns Truncated name with ellipsis if needed
 */
export function truncateName(name: string, maxLength: number = 12): string {
    if (!name || name.length <= maxLength) return name;
    return name.slice(0, maxLength - 1).trim() + "…";
}

/**
 * Format a player name for display (trimmed and normalized).
 * @param name The raw player name
 * @returns Formatted name
 */
export function formatPlayerName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}
