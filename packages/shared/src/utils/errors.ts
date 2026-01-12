// packages/shared/src/utils/errors.ts
// HTTP error utilities for consistent error handling

/**
 * Custom HTTP error class with status code and optional error code.
 * Use this for throwing errors that should be returned as HTTP responses.
 */
export class HttpError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
    }
}

// ============================================================================
// Common Error Factories
// ============================================================================

/**
 * Create a 404 Not Found error.
 * @param message Custom error message
 */
export function notFound(message: string = "Resource not found"): HttpError {
    return new HttpError(message, 404);
}

/**
 * Create a 400 Bad Request error.
 * @param message Custom error message
 */
export function badRequest(message: string = "Bad request"): HttpError {
    return new HttpError(message, 400);
}

/**
 * Create a 403 Forbidden error.
 * @param message Custom error message
 * @param code Optional error code for client handling
 */
export function forbidden(
    message: string = "Forbidden",
    code?: string
): HttpError {
    return new HttpError(message, 403, code);
}

/**
 * Create a 409 Conflict error.
 * @param message Custom error message
 */
export function conflict(message: string = "Conflict"): HttpError {
    return new HttpError(message, 409);
}

/**
 * Create a 429 Too Many Requests error.
 * @param message Custom error message
 */
export function tooManyRequests(
    message: string = "Too many requests"
): HttpError {
    return new HttpError(message, 429);
}

/**
 * Create a 401 Unauthorized error.
 * @param message Custom error message
 */
export function unauthorized(message: string = "Unauthorized"): HttpError {
    return new HttpError(message, 401);
}

/**
 * Create a 500 Internal Server Error.
 * @param message Custom error message
 */
export function internalError(
    message: string = "Internal server error"
): HttpError {
    return new HttpError(message, 500);
}

/**
 * Type guard to check if an error is an HttpError.
 * @param error The error to check
 */
export function isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError;
}
