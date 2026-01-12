// packages/shared/src/constants/teams.ts
// Team color and display constants

// ============================================================================
// Team Color Scheme
// ============================================================================

/**
 * Team color scheme interface.
 * All properties are Tailwind CSS classes.
 */
export interface TeamColorScheme {
    /** Background gradient for team container */
    bg: string;
    /** Border color for team container */
    border: string;
    /** Header/title text color */
    header: string;
    /** Accent color for highlights and selection */
    accent: string;
    /** Ring color for focus/selection states */
    ring: string;
}

/**
 * Team color schemes - supports up to 4 teams.
 * Each team has a consistent color scheme for light and dark modes.
 */
export const TEAM_COLORS: TeamColorScheme[] = [
    {
        bg: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
        border: "border-blue-300 dark:border-blue-700",
        header: "text-blue-700 dark:text-blue-300",
        accent: "bg-blue-500 dark:bg-blue-600",
        ring: "ring-blue-400 dark:ring-blue-500",
    },
    {
        bg: "bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
        border: "border-rose-300 dark:border-rose-700",
        header: "text-rose-700 dark:text-rose-300",
        accent: "bg-rose-500 dark:bg-rose-600",
        ring: "ring-rose-400 dark:ring-rose-500",
    },
    {
        bg: "bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30",
        border: "border-emerald-300 dark:border-emerald-700",
        header: "text-emerald-700 dark:text-emerald-300",
        accent: "bg-emerald-500 dark:bg-emerald-600",
        ring: "ring-emerald-400 dark:ring-emerald-500",
    },
    {
        bg: "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
        border: "border-amber-300 dark:border-amber-700",
        header: "text-amber-700 dark:text-amber-300",
        accent: "bg-amber-500 dark:bg-amber-600",
        ring: "ring-amber-400 dark:ring-amber-500",
    },
];

/**
 * Get team color scheme by index (0-based).
 * Falls back to first color if index is out of bounds.
 * @param teamIndex The team index (0-based)
 * @returns Team color scheme
 */
export function getTeamColor(teamIndex: number): TeamColorScheme {
    return TEAM_COLORS[teamIndex % TEAM_COLORS.length];
}

// ============================================================================
// Team Names
// ============================================================================

/**
 * Default team display names.
 */
export const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4"] as const;

/**
 * Get team display name by index (0-based).
 * Falls back to "Team N+1" for indices beyond predefined names.
 * @param teamIndex The team index (0-based)
 * @returns Team display name
 */
export function getTeamName(teamIndex: number): string {
    return TEAM_NAMES[teamIndex] ?? `Team ${teamIndex + 1}`;
}

// ============================================================================
// Team Utilities
// ============================================================================

/**
 * Get the number of predefined team colors available.
 */
export const MAX_TEAM_COLORS = TEAM_COLORS.length;

/**
 * Get the number of predefined team names available.
 */
export const MAX_TEAM_NAMES = TEAM_NAMES.length;
