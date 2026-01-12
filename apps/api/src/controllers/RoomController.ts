import { Request, Response, NextFunction } from "express";
import * as RoomService from "../services/RoomService";
import { getIO, hasIO } from "../utils/socketIO";
import { badRequest } from "@shared/utils";
import {
    CreateRoomRequestSchema,
    JoinRoomRequestSchema,
    PlayerNameSchema,
    RoomCodeSchema,
    safeParseWithErrors,
} from "@shared/validation";

export async function createRoom(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result = safeParseWithErrors(CreateRoomRequestSchema, req.body);

        if (!result.success) {
            res.status(400).json({ errors: result.errors });
            return;
        }

        const { playerName, roomName } = result.data;
        const finalRoomName =
            roomName || `Room-${Math.floor(Math.random() * 10000)}`;

        const { room, user } = await RoomService.createRoom(
            finalRoomName,
            playerName
        );
        res.status(201).json({
            roomId: room.id,
            userId: user.id,
            roomCode: room.code,
        });
    } catch (err) {
        next(err);
    }
}

export async function joinRoom(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result = safeParseWithErrors(JoinRoomRequestSchema, req.body);

        if (!result.success) {
            res.status(400).json({ errors: result.errors });
            return;
        }

        const { playerName, roomCode } = result.data;
        const userId = req.body.userId as string | undefined;

        const { room, user } = RoomService.joinRoom(
            roomCode,
            playerName,
            userId
        );
        res.status(200).json({
            roomId: room.id,
            userId: user.id,
            roomCode: room.code,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Request to join a private room.
 * Notifies the room leader via socket and returns success.
 */
export async function requestJoinRoom(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { roomCode: rawRoomCode, requesterId, requesterName } = req.body;

        // Validate room code
        const roomCodeResult = RoomCodeSchema.safeParse(rawRoomCode);
        if (!roomCodeResult.success) {
            res.status(400).json({
                errors: [
                    {
                        field: "roomCode",
                        message:
                            roomCodeResult.error.issues[0]?.message ??
                            "Invalid room code",
                    },
                ],
            });
            return;
        }

        // Validate requester name
        const nameResult = PlayerNameSchema.safeParse(requesterName);
        if (!nameResult.success) {
            res.status(400).json({
                errors: [
                    {
                        field: "requesterName",
                        message:
                            nameResult.error.issues[0]?.message ??
                            "Invalid name",
                    },
                ],
            });
            return;
        }

        if (!requesterId) {
            throw badRequest("requesterId is required.");
        }

        const roomCode = roomCodeResult.data;
        const validatedName = nameResult.data;

        // This will throw if rate-limited or room not found
        const { roomId } = RoomService.requestToJoinRoom(
            roomCode,
            requesterId,
            validatedName
        );

        // Emit join_request to the room so the leader receives it
        if (hasIO()) {
            const io = getIO();
            io.to(roomId).emit("join_request", {
                requesterId,
                requesterName: validatedName,
                roomCode,
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            message: "Join request sent to room leader.",
        });
    } catch (err) {
        next(err);
    }
}

export async function getRoomIdByCode(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const rawRoomCode = req.params.roomCode;

        // Validate room code
        const roomCodeResult = RoomCodeSchema.safeParse(rawRoomCode);
        if (!roomCodeResult.success) {
            res.status(400).json({
                errors: [
                    {
                        field: "roomCode",
                        message:
                            roomCodeResult.error.issues[0]?.message ??
                            "Invalid room code",
                    },
                ],
            });
            return;
        }

        const roomCode = roomCodeResult.data;
        const roomId = RoomService.getRoomIdByCode(roomCode);

        if (!roomId) {
            res.status(404).json({ error: "Room not found." });
            return;
        }

        res.status(200).json({ roomId });
    } catch (err) {
        next(err);
    }
}
