// packages/shared/src/validation/schemas/utils.ts
// Zod utility functions for parsing and error formatting

import { z, ZodError, type ZodSchema } from "zod";
import type { ValidationError } from "../room";

// ============================================================================
// Error Formatting Utilities
// ============================================================================

/**
 * Formats a ZodError into an array of ValidationError objects.
 * Useful for API responses that need structured error information.
 *
 * @param error The ZodError to format
 * @returns Array of ValidationError objects with field paths and messages
 *
 * @example
 * const result = PlayerNameSchema.safeParse("");
 * if (!result.success) {
 *   const errors = formatZodError(result.error);
 *   // [{ field: "name", message: "Name must be at least 2 characters" }]
 * }
 */
export function formatZodError(error: ZodError): ValidationError[] {
    return error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "value",
        message: issue.message,
    }));
}

/**
 * Gets the first error message from a ZodError.
 * Useful when you only need to display one error at a time.
 *
 * @param error The ZodError to extract from
 * @returns The first error message, or a default message if none found
 */
export function getFirstZodError(error: ZodError): string {
    return error.issues[0]?.message ?? "Validation failed";
}

// ============================================================================
// Safe Parse Utilities
// ============================================================================

/**
 * Result type for safeParseWithErrors.
 * Either success with data, or failure with formatted errors.
 */
export type SafeParseResult<T> =
    | { success: true; data: T; errors: null }
    | { success: false; data: null; errors: ValidationError[] };

/**
 * Parses data with a Zod schema and returns formatted errors on failure.
 * Provides a consistent API for validation that's ready for API responses.
 *
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns SafeParseResult with either parsed data or formatted errors
 *
 * @example
 * const result = safeParseWithErrors(PlayerNameSchema, userInput);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * // result.data is now typed and validated
 */
export function safeParseWithErrors<T>(
    schema: ZodSchema<T>,
    data: unknown
): SafeParseResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data,
            errors: null,
        };
    }

    return {
        success: false,
        data: null,
        errors: formatZodError(result.error),
    };
}

/**
 * Parses data and returns either the parsed value or throws with formatted errors.
 * Useful in contexts where you want to throw on validation failure.
 *
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @throws Error with JSON-stringified validation errors
 * @returns The parsed and validated data
 *
 * @example
 * try {
 *   const name = parseOrThrow(PlayerNameSchema, userInput);
 * } catch (err) {
 *   // err.message contains JSON array of ValidationError
 * }
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = safeParseWithErrors(schema, data);

    if (!result.success) {
        const error = new Error(JSON.stringify(result.errors));
        error.name = "ValidationError";
        throw error;
    }

    return result.data;
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the output type from a Zod schema.
 * Re-exported for convenience.
 */
export type Infer<T extends ZodSchema> = z.infer<T>;

/**
 * Extract the input type from a Zod schema.
 * Useful when the schema transforms the input (e.g., trim, toUpperCase).
 */
export type InferInput<T extends ZodSchema> = z.input<T>;
