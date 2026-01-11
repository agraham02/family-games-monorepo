import { useCallback, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { GameData, PlayerData } from "@/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Optimistic action tracking with queue support.
 * Each action stores a snapshot of state BEFORE it was applied,
 * enabling rollback to any point in the queue.
 */
type PendingAction = {
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
    snapshot: {
        gameData: GameData;
        playerData: PlayerData;
    };
    timeoutId: NodeJS.Timeout;
};

type OptimisticUpdateResult = {
    gameData?: Partial<GameData>;
    playerData?: Partial<PlayerData>;
};

type OptimisticReducer = (
    gameData: GameData,
    playerData: PlayerData,
    action: { type: string; payload: unknown; userId: string }
) => OptimisticUpdateResult | null;

type UseOptimisticGameActionProps = {
    socket: Socket | null;
    connected: boolean;
    roomId: string;
    userId: string;
    gameData: GameData | null;
    playerData: PlayerData | null;
    setGameData: (data: GameData | null) => void;
    setPlayerData: (data: PlayerData | null) => void;
    optimisticReducer: OptimisticReducer;
    onRollback?: (reason: string) => void;
    actionTimeout?: number; // ms before considering action failed (default: 5000)
};

export function useOptimisticGameAction({
    socket,
    connected,
    roomId,
    userId,
    gameData,
    playerData,
    setGameData,
    setPlayerData,
    optimisticReducer,
    onRollback,
    actionTimeout = 5000,
}: UseOptimisticGameActionProps) {
    // Queue of pending actions - use ref to avoid stale closure issues
    const actionQueueRef = useRef<PendingAction[]>([]);
    // State for UI reactivity (derived from queue)
    const [hasPendingActions, setHasPendingActions] = useState(false);

    /**
     * Update the reactive state from the queue ref
     */
    const syncQueueState = useCallback(() => {
        setHasPendingActions(actionQueueRef.current.length > 0);
    }, []);

    /**
     * Rollback a specific action or all actions from a given point.
     * When rolling back, we restore to the snapshot of the FIRST action being rolled back,
     * since that represents the state before any of these actions were applied.
     */
    const rollback = useCallback(
        (actionId: string, reason: string) => {
            const queue = actionQueueRef.current;
            const actionIndex = queue.findIndex((a) => a.id === actionId);

            if (actionIndex === -1) return;

            const action = queue[actionIndex];
            console.warn(
                `[OptimisticAction] Rolling back action "${action.type}" and ${
                    queue.length - actionIndex - 1
                } subsequent actions: ${reason}`
            );

            // Clear timeouts for all actions being rolled back
            for (let i = actionIndex; i < queue.length; i++) {
                clearTimeout(queue[i].timeoutId);
            }

            // Restore to the snapshot of the failed action (state before it was applied)
            setGameData(action.snapshot.gameData);
            setPlayerData(action.snapshot.playerData);

            // Remove the failed action and all subsequent actions
            actionQueueRef.current = queue.slice(0, actionIndex);
            syncQueueState();

            // Notify caller
            onRollback?.(reason);
        },
        [setGameData, setPlayerData, onRollback, syncQueueState]
    );

    /**
     * Confirm a specific action (server acknowledged it).
     * Only removes the confirmed action from the queue.
     */
    const confirm = useCallback(
        (actionId?: string) => {
            const queue = actionQueueRef.current;

            if (queue.length === 0) return;

            // If no actionId provided, confirm the oldest action (FIFO)
            const targetId = actionId ?? queue[0]?.id;
            const actionIndex = queue.findIndex((a) => a.id === targetId);

            if (actionIndex === -1) return;

            const action = queue[actionIndex];
            console.log(
                `[OptimisticAction] Action "${action.type}" confirmed by server`
            );

            // Clear the timeout for this action
            clearTimeout(action.timeoutId);

            // Remove from queue
            actionQueueRef.current = [
                ...queue.slice(0, actionIndex),
                ...queue.slice(actionIndex + 1),
            ];
            syncQueueState();
        },
        [syncQueueState]
    );

    /**
     * Dispatch an action with optimistic update.
     * Actions are queued and processed in order, allowing multiple
     * actions to be in-flight simultaneously.
     */
    const dispatch = useCallback(
        (actionType: string, actionPayload: unknown) => {
            if (!socket || !connected || !gameData || !playerData) {
                console.warn(
                    "[OptimisticAction] Cannot dispatch: socket not connected or missing game data"
                );
                return;
            }

            // Generate unique action ID
            const actionId = `${userId}-${uuidv4()}`;

            // Deep clone the current state to create an immutable snapshot
            // This ensures rollback works correctly even if nested objects are mutated
            const snapshot = {
                gameData: JSON.parse(JSON.stringify(gameData)) as GameData,
                playerData: JSON.parse(
                    JSON.stringify(playerData)
                ) as PlayerData,
            };

            // Apply optimistic update
            const action = { type: actionType, payload: actionPayload, userId };
            const optimisticUpdate = optimisticReducer(
                gameData,
                playerData,
                action
            );

            if (optimisticUpdate) {
                if (optimisticUpdate.gameData) {
                    setGameData({
                        ...gameData,
                        ...optimisticUpdate.gameData,
                    } as GameData);
                }
                if (optimisticUpdate.playerData) {
                    setPlayerData({
                        ...playerData,
                        ...optimisticUpdate.playerData,
                    } as PlayerData);
                }
            }

            // Set timeout for rollback - capture actionId in closure
            const timeoutId = setTimeout(() => {
                rollback(actionId, "Action timed out");
            }, actionTimeout);

            // Track pending action in queue
            const pending: PendingAction = {
                id: actionId,
                type: actionType,
                payload: actionPayload,
                timestamp: Date.now(),
                snapshot,
                timeoutId,
            };
            actionQueueRef.current = [...actionQueueRef.current, pending];
            syncQueueState();

            // Emit action to server
            socket.emit("game_action", {
                roomId,
                action: { ...action, actionId },
            });

            console.log(
                `[OptimisticAction] Dispatched "${actionType}" optimistically with ID: ${actionId} (queue size: ${actionQueueRef.current.length})`
            );
        },
        [
            socket,
            connected,
            gameData,
            playerData,
            userId,
            roomId,
            optimisticReducer,
            setGameData,
            setPlayerData,
            rollback,
            actionTimeout,
            syncQueueState,
        ]
    );

    /**
     * Rollback all pending actions (e.g., on disconnect or error)
     */
    const rollbackAll = useCallback(
        (reason: string) => {
            const queue = actionQueueRef.current;
            if (queue.length === 0) return;

            // Rollback to the snapshot of the first action
            rollback(queue[0].id, reason);
        },
        [rollback]
    );

    return {
        dispatch,
        rollback: rollbackAll,
        confirm,
        hasPendingAction: hasPendingActions,
        pendingActionType: actionQueueRef.current[0]?.type ?? null,
        pendingActionCount: actionQueueRef.current.length,
    };
}
