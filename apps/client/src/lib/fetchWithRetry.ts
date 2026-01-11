/**
 * Fetch wrapper with exponential backoff retry logic
 *
 * Features:
 * - Retries on network errors and 5xx server errors
 * - Does NOT retry on 4xx client errors (those are intentional failures)
 * - Exponential backoff: 1s, 2s, 4s (by default)
 * - Configurable max retries
 */

export interface FetchWithRetryOptions extends RequestInit {
    maxRetries?: number;
    baseDelay?: number; // Base delay in ms (default 1000)
}

export class FetchError extends Error {
    status: number;
    statusText: string;

    constructor(message: string, status: number, statusText: string) {
        super(message);
        this.name = "FetchError";
        this.status = status;
        this.statusText = statusText;
    }
}

export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const { maxRetries = 3, baseDelay = 1000, ...fetchOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, fetchOptions);

            // Success - return immediately
            if (response.ok) {
                return response;
            }

            // 4xx errors - don't retry (client error, intentional)
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // 5xx errors - retry
            if (response.status >= 500) {
                lastError = new FetchError(
                    `Server error: ${response.status} ${response.statusText}`,
                    response.status,
                    response.statusText
                );
                // Continue to retry logic below
            } else {
                // Other status codes - return as-is
                return response;
            }
        } catch (error) {
            // Network error - retry
            lastError =
                error instanceof Error ? error : new Error(String(error));
        }

        // Don't delay after the last attempt
        if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * baseDelay;
            console.log(
                `Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    // All retries exhausted
    throw lastError || new Error("Max retries exceeded");
}

/**
 * Convenience function for JSON API calls with retry
 */
export async function fetchJsonWithRetry<T>(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<T> {
    const response = await fetchWithRetry(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new FetchError(
            errorText || `HTTP ${response.status}`,
            response.status,
            response.statusText
        );
    }

    return response.json();
}
