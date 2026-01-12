import { CreateAndJoinRoomResponse, GameTypeMetadata } from "@shared/types";
import type { CreateRoomRequest, JoinRoomRequest } from "@shared/validation";
import { API_BASE } from ".";
import { fetchWithRetry, FetchError } from "@/lib/fetchWithRetry";

// Custom error for private room access
export class PrivateRoomError extends Error {
    constructor(
        message: string = "This room is private. Please request to join."
    ) {
        super(message);
        this.name = "PrivateRoomError";
    }
}

/**
 * Helper to extract error message from response.
 * Server returns JSON: { error: "message", code?: "ERROR_CODE" }
 * Logs parsing failures for debugging.
 */
async function extractErrorMessage(
    res: Response,
    fallback: string
): Promise<{ message: string; code?: string }> {
    try {
        const data = await res.json();
        return {
            message: data.error || fallback,
            code: data.code,
        };
    } catch (jsonError) {
        // If JSON parsing fails, try text
        console.warn(
            `Failed to parse error response as JSON (status ${res.status}):`,
            jsonError
        );
        try {
            const text = await res.text();
            if (text) {
                console.warn(`Error response text: ${text}`);
                return { message: text };
            }
            return { message: fallback };
        } catch (textError) {
            console.warn("Failed to read error response as text:", textError);
            return { message: fallback };
        }
    }
}

/**
 * Get room ID from room code.
 * Returns null if room not found.
 */
export async function getRoomIdByCode(
    roomCode: string
): Promise<string | null> {
    try {
        const res = await fetchWithRetry(
            `${API_BASE}/rooms/code/${roomCode.toUpperCase()}`,
            {
                method: "GET",
            }
        );
        if (res.status === 404) {
            return null;
        }
        if (!res.ok) {
            const { message } = await extractErrorMessage(
                res,
                "Failed to lookup room code"
            );
            throw new Error(message);
        }
        const data = await res.json();
        return data.roomId;
    } catch (err) {
        console.error("Error looking up room code:", err);
        return null;
    }
}

export async function createRoom(
    playerName: string,
    roomName: string
): Promise<CreateAndJoinRoomResponse> {
    const requestBody: CreateRoomRequest = { playerName, roomName };
    const res = await fetchWithRetry(`${API_BASE}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
        const { message } = await extractErrorMessage(
            res,
            "Failed to create room"
        );
        throw new FetchError(message, res.status, res.statusText);
    }
    return res.json();
}

export async function joinRoom(
    playerName: string,
    roomCode: string,
    userId?: string
): Promise<CreateAndJoinRoomResponse> {
    const requestBody: JoinRoomRequest = { playerName, roomCode };
    const res = await fetchWithRetry(`${API_BASE}/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, userId }),
    });
    if (!res.ok) {
        const { message, code } = await extractErrorMessage(
            res,
            "Failed to join room"
        );

        // Check for private room error (403 with PRIVATE_ROOM code)
        if (res.status === 403 && code === "PRIVATE_ROOM") {
            throw new PrivateRoomError();
        }

        throw new FetchError(message, res.status, res.statusText);
    }
    return res.json();
}

export async function getAvailableGames(): Promise<{
    games: GameTypeMetadata[];
}> {
    const res = await fetchWithRetry(`${API_BASE}/games`);
    if (!res.ok) {
        const { message } = await extractErrorMessage(
            res,
            "Failed to fetch games"
        );
        throw new FetchError(message, res.status, res.statusText);
    }
    return res.json();
}

/**
 * Attempt to rejoin a game when navigating directly to a game URL without session data.
 * Supports both 6-char room codes and full room IDs.
 * Returns null if rejoin is not possible (e.g., game is active and not paused, room not found).
 */
export async function attemptDirectGameRejoin(
    roomCodeOrId: string,
    userName: string,
    userId?: string
): Promise<CreateAndJoinRoomResponse | null> {
    try {
        // Try to join; will fail if game is active and not paused
        return await joinRoom(userName, roomCodeOrId, userId);
    } catch (error) {
        // If join fails, the game is likely active and not paused
        console.log(
            "Direct game rejoin failed (game may be active or room not found):",
            error
        );
        return null;
    }
}
