/**
 * Input validation utilities for home page forms
 */

export interface ValidationError {
    field: string;
    message: string;
}

export function validatePlayerName(name: string): ValidationError | null {
    const trimmed = name.trim();

    if (!trimmed) {
        return { field: "name", message: "Name is required" };
    }

    if (trimmed.length < 2) {
        return { field: "name", message: "Name must be at least 2 characters" };
    }

    if (trimmed.length > 50) {
        return { field: "name", message: "Name must be 50 characters or less" };
    }

    // Allow letters, numbers, spaces, and hyphens only
    if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) {
        return {
            field: "name",
            message:
                "Name can only contain letters, numbers, spaces, hyphens, and apostrophes",
        };
    }

    return null;
}

export function validateRoomName(roomName: string): ValidationError | null {
    // Room name is optional
    if (!roomName) {
        return null;
    }

    const trimmed = roomName.trim();

    if (trimmed.length > 100) {
        return {
            field: "roomName",
            message: "Room name must be 100 characters or less",
        };
    }

    // Allow similar characters as player name
    if (!/^[a-zA-Z0-9\s\-'.&()]+$/.test(trimmed)) {
        return {
            field: "roomName",
            message: "Room name contains invalid characters",
        };
    }

    return null;
}

export function validateRoomCode(roomCode: string): ValidationError | null {
    const trimmed = roomCode.trim().toUpperCase();

    if (!trimmed) {
        return { field: "roomCode", message: "Room code is required" };
    }

    if (trimmed.length !== 6) {
        return {
            field: "roomCode",
            message: "Room code must be exactly 6 characters",
        };
    }

    // Allow alphanumeric only
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
        return {
            field: "roomCode",
            message: "Room code must contain only letters and numbers",
        };
    }

    return null;
}

export function sanitizePlayerName(name: string): string {
    return name.trim();
}

export function sanitizeRoomName(roomName: string): string {
    return roomName.trim();
}

export function sanitizeRoomCode(roomCode: string): string {
    return roomCode.trim().toUpperCase();
}
