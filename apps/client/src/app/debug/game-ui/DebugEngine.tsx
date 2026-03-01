"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { GAME_REGISTRY } from "@/components/games/registry";
import { MockSessionProvider, MockWebSocketProvider } from "./MockProviders";
import { FloatingControlPanel } from "./FloatingControlPanel";
import { DominoesData, GameData, PlayerData } from "@shared/types";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { useOptimisticGameAction } from "@/hooks/useOptimisticGameAction";
import { useGameSettingsSchema } from "@/hooks/useGameSettingsSchema";
import { optimisticGameReducer } from "@/lib/gameReducers";
import { computeDominoBoardLayoutV3 } from "@shared/utils";
import type { DominoBoardLayoutV3 } from "@shared/types";
import { toast } from "sonner";

function withDominoesLayout(gameData: GameData): GameData {
    if (gameData.type !== "dominoes") {
        return gameData;
    }

    const dominoesData = gameData as DominoesData;
    const board = dominoesData.board ?? {
        tiles: [],
        leftEnd: null,
        rightEnd: null,
    };

    const seed = `${dominoesData.id}-r${dominoesData.round}`;
    const prevLayoutV3 = board.layout as DominoBoardLayoutV3 | undefined;
    const result = computeDominoBoardLayoutV3(board.tiles, seed, prevLayoutV3);
    const layout = result.ok ? result.layout : result.previousLayout;

    return {
        ...dominoesData,
        board: {
            ...board,
            layout,
        },
    } as GameData;
}

// Wrapper to use hooks that require context providers
function GameComponentWrapper({
    GameComponent,
    gameData: initialGameData,
    playerData: initialPlayerData,
    selectedPlayerId,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GameComponent: any;
    gameData: GameData;
    playerData: PlayerData | null;
    selectedPlayerId: string;
}) {
    const { socket, connected } = useWebSocket();
    const { roomId, userId } = useSession();

    const [localGameData, setLocalGameData] = useState(initialGameData);
    const [localPlayerData, setLocalPlayerData] = useState(initialPlayerData);

    // Sync with master state when it changes (simulating server updates)
    useEffect(() => {
        setLocalGameData(initialGameData);
        // In debug mode, when the master state updates, we assume our action was confirmed
        if (optimisticAction.hasPendingAction) {
            optimisticAction.confirm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialGameData]);

    useEffect(() => {
        setLocalPlayerData(initialPlayerData);
    }, [initialPlayerData]);

    const optimisticAction = useOptimisticGameAction({
        socket,
        connected,
        roomId: roomId ?? "debug-room",
        userId: userId ?? selectedPlayerId,
        gameData: localGameData,
        playerData: localPlayerData,
        setGameData: (newData) => {
            if (newData) setLocalGameData(newData);
        },
        setPlayerData: (newData) => {
            if (newData) setLocalPlayerData(newData);
        },
        optimisticReducer: optimisticGameReducer,
        onRollback: (reason) => {
            toast.error(`Action reverted: ${reason}`);
        },
        actionTimeout: 5000,
    });

    // Listen for server confirmation to clear optimistic queue
    useEffect(() => {
        if (!socket) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleGameUpdate = (_payload: any) => {
            // In a real app, we'd check if this update confirms our action
            // For debug, we just confirm the oldest action when we get an update
            if (optimisticAction.hasPendingAction) {
                optimisticAction.confirm();
            }
        };

        socket.on("game_update", handleGameUpdate);
        return () => {
            socket.off("game_update", handleGameUpdate);
        };
    }, [socket, optimisticAction]);

    return (
        <GameComponent
            gameData={localGameData}
            playerData={localPlayerData}
            debugMode={true}
            dispatchOptimisticAction={optimisticAction.dispatch}
        />
    );
}

export function DebugEngine() {
    const [selectedGameId, setSelectedGameId] = useState<string>("spades");
    const [selectedScenarioId, setSelectedScenarioId] =
        useState<string>("default");
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

    const [masterGameState, setMasterGameState] = useState<{
        gameData: GameData | null;
        playerDataMap: Record<string, PlayerData>;
    }>({ gameData: null, playerDataMap: {} });

    const [actionLog, setActionLog] = useState<
        Array<{ event: string; payload: unknown; time: string }>
    >([]);
    const [latency, setLatency] = useState<number>(0);
    const [simulateError, setSimulateError] = useState<boolean>(false);
    const [autoPlay, setAutoPlay] = useState<boolean>(false);

    const { definitions: settingsSchema, defaults: defaultSettings } =
        useGameSettingsSchema(selectedGameId);
    const [currentSettings, setCurrentSettings] = useState<
        Record<string, unknown>
    >({});
    const [settingsGameId, setSettingsGameId] =
        useState<string>(selectedGameId);
    const [regenerateTrigger, setRegenerateTrigger] = useState<number>(0);

    // Initialize settings when defaults change or game changes
    useEffect(() => {
        if (defaultSettings) {
            setCurrentSettings(
                defaultSettings as unknown as Record<string, unknown>,
            );
            setSettingsGameId(selectedGameId);
            setRegenerateTrigger((prev) => prev + 1);
        }
    }, [defaultSettings, selectedGameId]);

    const handleUpdateSetting = useCallback((key: string, value: unknown) => {
        setCurrentSettings((prev) => {
            const newSettings = { ...prev, [key]: value };

            // Also update the master game state so the game component sees the new settings
            setMasterGameState((prevState) => {
                if (!prevState.gameData) return prevState;
                return {
                    ...prevState,
                    gameData: {
                        ...prevState.gameData,
                        settings: newSettings,
                    } as unknown as GameData,
                };
            });

            return newSettings;
        });
    }, []);

    // Load game and scenario
    useEffect(() => {
        const gameEntry = GAME_REGISTRY[selectedGameId];
        if (!gameEntry || !gameEntry.generateMockData) return;

        const shouldUseCurrentSettings =
            Object.keys(currentSettings).length > 0 &&
            settingsGameId === selectedGameId;

        // For now, we just use default options. We could expand this to have predefined scenarios.
        const options = {
            ...(gameEntry.defaultMockOptions || {}),
            settings: shouldUseCurrentSettings ? currentSettings : undefined,
        };

        const mockData = gameEntry.generateMockData(options) as unknown as {
            gameData: GameData;
            playerDataMap: Record<string, PlayerData>;
        };

        // Apply current settings if we have them and they belong to the current game,
        // otherwise use the mock data's settings
        const gameDataWithSettings = {
            ...mockData.gameData,
            settings: shouldUseCurrentSettings
                ? currentSettings
                : mockData.gameData.settings,
        } as GameData;

        const gameDataWithLayout = withDominoesLayout(gameDataWithSettings);

        setMasterGameState({
            gameData: gameDataWithLayout,
            playerDataMap: mockData.playerDataMap || {},
        });

        // Select first player by default
        if (mockData.gameData?.playOrder?.length > 0) {
            setSelectedPlayerId(mockData.gameData.playOrder[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGameId, selectedScenarioId, regenerateTrigger]);

    const handleEmit = useCallback(
        (event: string, payload: unknown) => {
            setActionLog((prev) => [
                { event, payload, time: new Date().toISOString() },
                ...prev,
            ]);

            const payloadRecord = payload as Record<string, unknown>;
            if (event === "game_action" && payloadRecord?.action) {
                const action = payloadRecord.action as {
                    type: string;
                    payload: Record<string, unknown>;
                    userId?: string;
                };

                setMasterGameState((prevState) => {
                    if (!prevState.gameData) return prevState;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newGameData = { ...prevState.gameData } as any;
                    const newPlayerDataMap = {
                        ...prevState.playerDataMap,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any;

                    // Basic reducer for Spades PLAY_CARD
                    if (
                        action.type === "PLAY_CARD" &&
                        selectedGameId === "spades"
                    ) {
                        const card = action.payload.card as {
                            suit: string;
                            rank: string;
                        };
                        const playerId = action.userId || selectedPlayerId;

                        // Remove card from player's hand
                        if (
                            newPlayerDataMap[playerId] &&
                            newPlayerDataMap[playerId].hand
                        ) {
                            newPlayerDataMap[playerId] = {
                                ...newPlayerDataMap[playerId],
                                hand: newPlayerDataMap[playerId].hand.filter(
                                    (c: { suit: string; rank: string }) =>
                                        !(
                                            c.suit === card.suit &&
                                            c.rank === card.rank
                                        ),
                                ),
                            };
                        }

                        // Add to current trick
                        if (!newGameData.currentTrick) {
                            newGameData.currentTrick = {
                                plays: [],
                                suit: card.suit,
                            };
                        }

                        newGameData.currentTrick = {
                            ...newGameData.currentTrick,
                            plays: [
                                ...newGameData.currentTrick.plays,
                                { playerId, card },
                            ],
                        };

                        // Advance turn
                        const playOrder = newGameData.playOrder;
                        const currentIndex = newGameData.currentTurnIndex;
                        newGameData.currentTurnIndex =
                            (currentIndex + 1) % playOrder.length;

                        // If trick is full (4 plays), we should ideally resolve it, but for debug UI
                        // just showing the card played is the main goal.
                        if (newGameData.currentTrick.plays.length === 4) {
                            // Simple trick resolution for debug
                            setTimeout(() => {
                                setMasterGameState((s) => {
                                    if (!s.gameData) return s;
                                    const nextState = { ...s };
                                    const nextGameData = {
                                        ...s.gameData,
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    } as any;

                                    // Move trick to completed
                                    nextGameData.completedTricks = [
                                        ...(nextGameData.completedTricks || []),
                                        nextGameData.currentTrick,
                                    ];

                                    // Clear current trick
                                    nextGameData.currentTrick = {
                                        plays: [],
                                        suit: null,
                                    };

                                    // Winner leads next trick (just pick random for debug)
                                    nextGameData.currentTurnIndex = Math.floor(
                                        Math.random() * 4,
                                    );

                                    return {
                                        ...nextState,
                                        gameData: nextGameData as GameData,
                                    };
                                });
                            }, 1500);
                        }
                    }

                    // Basic reducer for Spades PLACE_BID
                    if (
                        action.type === "PLACE_BID" &&
                        selectedGameId === "spades"
                    ) {
                        const bid = action.payload.bid;
                        const playerId = action.userId || selectedPlayerId;

                        newGameData.bids = {
                            ...newGameData.bids,
                            [playerId]: bid,
                        };

                        // Advance turn
                        const playOrder = newGameData.playOrder;
                        const currentIndex = newGameData.currentTurnIndex;
                        newGameData.currentTurnIndex =
                            (currentIndex + 1) % playOrder.length;

                        // If all 4 players have bid, move to playing phase
                        if (Object.keys(newGameData.bids || {}).length === 4) {
                            newGameData.phase = "playing";
                            // Reset turn to leader (or whoever should start)
                            newGameData.currentTurnIndex = 0;
                        }
                    }

                    // Basic reducer for Dominoes PLACE_TILE (with PLAY_TILE fallback for debug parity)
                    if (
                        (action.type === "PLACE_TILE" ||
                            action.type === "PLAY_TILE") &&
                        selectedGameId === "dominoes"
                    ) {
                        const tile = action.payload.tile as {
                            id: string;
                            left: number;
                            right: number;
                        };
                        const side =
                            (action.payload.side as "left" | "right") ||
                            ((action.payload.end as "left" | "right") ??
                                "right");
                        const playerId = action.userId || selectedPlayerId;

                        // Remove tile from player's hand
                        if (
                            newPlayerDataMap[playerId] &&
                            newPlayerDataMap[playerId].hand
                        ) {
                            newPlayerDataMap[playerId] = {
                                ...newPlayerDataMap[playerId],
                                hand: newPlayerDataMap[playerId].hand.filter(
                                    (t: {
                                        id?: string;
                                        left: number;
                                        right: number;
                                    }) =>
                                        t.id
                                            ? t.id !== tile.id
                                            : !(
                                                  t.left === tile.left &&
                                                  t.right === tile.right
                                              ),
                                ),
                            };
                        }

                        // Add to board
                        if (!newGameData.board) {
                            newGameData.board = {
                                tiles: [],
                                leftEnd: null,
                                rightEnd: null,
                            };
                        }

                        const previousLayout = newGameData.board.layout;

                        const existingTiles = Array.isArray(
                            newGameData.board.tiles,
                        )
                            ? [...newGameData.board.tiles]
                            : [];

                        const isFirstTile = existingTiles.length === 0;

                        if (isFirstTile) {
                            existingTiles.push(tile);
                            newGameData.board = {
                                ...newGameData.board,
                                tiles: existingTiles,
                                leftEnd: { value: tile.left, tileId: tile.id },
                                rightEnd: {
                                    value: tile.right,
                                    tileId: tile.id,
                                },
                            };
                        } else {
                            if (side === "left") {
                                existingTiles.unshift(tile);
                                const leftValue =
                                    tile.left ===
                                    newGameData.board.leftEnd?.value
                                        ? tile.right
                                        : tile.left;

                                newGameData.board = {
                                    ...newGameData.board,
                                    tiles: existingTiles,
                                    leftEnd: {
                                        value: leftValue,
                                        tileId: tile.id,
                                    },
                                };
                            } else {
                                existingTiles.push(tile);
                                const rightValue =
                                    tile.right ===
                                    newGameData.board.rightEnd?.value
                                        ? tile.left
                                        : tile.right;

                                newGameData.board = {
                                    ...newGameData.board,
                                    tiles: existingTiles,
                                    rightEnd: {
                                        value: rightValue,
                                        tileId: tile.id,
                                    },
                                };
                            }
                        }

                        const layoutSeed = `${newGameData.id}-r${newGameData.round}`;
                        const prevV3 = previousLayout as
                            | DominoBoardLayoutV3
                            | undefined;
                        const layoutResult = computeDominoBoardLayoutV3(
                            newGameData.board.tiles,
                            layoutSeed,
                            prevV3,
                        );
                        newGameData.board = {
                            ...newGameData.board,
                            layout: layoutResult.ok
                                ? layoutResult.layout
                                : layoutResult.previousLayout,
                        };

                        // Advance turn
                        const playOrder = newGameData.playOrder;
                        const currentIndex = newGameData.currentTurnIndex;
                        newGameData.currentTurnIndex =
                            (currentIndex + 1) % playOrder.length;
                    }

                    // Basic reducer for LRC ROLL_DICE
                    if (
                        action.type === "ROLL_DICE" &&
                        selectedGameId === "lrc"
                    ) {
                        const playOrder = newGameData.playOrder;
                        const currentIndex = newGameData.currentTurnIndex;
                        newGameData.currentTurnIndex =
                            (currentIndex + 1) % playOrder.length;
                    }

                    return {
                        gameData: newGameData as GameData,
                        playerDataMap: newPlayerDataMap as Record<
                            string,
                            PlayerData
                        >,
                    };
                });
            }
        },
        [selectedGameId, selectedPlayerId],
    );

    const handleUpdateGameState = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json);
            if (parsed?.gameData) {
                parsed.gameData = withDominoesLayout(
                    parsed.gameData as GameData,
                );
            }
            setMasterGameState(parsed);
        } catch (e) {
            console.error("Failed to parse game state JSON", e);
            throw e;
        }
    }, []);

    // Auto-play logic (very basic, just logs intent for now)
    useEffect(() => {
        if (!autoPlay || !masterGameState.gameData) return;

        const interval = setInterval(() => {
            const gameData = masterGameState.gameData;
            if (!gameData) return;

            const currentTurnPlayerId =
                gameData.playOrder[gameData.currentTurnIndex];

            // Only auto-play if it's the selected player's turn, or if we want to auto-play for everyone
            // For now, let's auto-play for whoever's turn it is
            console.log(
                `[AutoPlay] Attempting to play for ${currentTurnPlayerId}`,
            );

            if (selectedGameId === "spades" && gameData.phase === "playing") {
                const playerData = masterGameState.playerDataMap[
                    currentTurnPlayerId
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ] as any;
                if (
                    playerData &&
                    playerData.hand &&
                    playerData.hand.length > 0
                ) {
                    // Just pick the first card for now
                    const cardToPlay = playerData.hand[0];

                    handleEmit("game_action", {
                        roomId: "debug-room",
                        action: {
                            type: "PLAY_CARD",
                            payload: { card: cardToPlay },
                            userId: currentTurnPlayerId,
                        },
                    });
                }
            } else if (
                selectedGameId === "spades" &&
                gameData.phase === "bidding"
            ) {
                // Auto-bid
                handleEmit("game_action", {
                    roomId: "debug-room",
                    action: {
                        type: "PLACE_BID",
                        payload: {
                            bid: { amount: 3, type: "normal", isBlind: false },
                        },
                        userId: currentTurnPlayerId,
                    },
                });
            } else if (
                selectedGameId === "dominoes" &&
                gameData.phase === "playing"
            ) {
                const playerData = masterGameState.playerDataMap[
                    currentTurnPlayerId
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ] as any;
                if (
                    playerData &&
                    playerData.hand &&
                    playerData.hand.length > 0
                ) {
                    const tileToPlay = playerData.hand[0];
                    handleEmit("game_action", {
                        roomId: "debug-room",
                        action: {
                            type: "PLACE_TILE",
                            payload: { tile: tileToPlay, side: "right" },
                            userId: currentTurnPlayerId,
                        },
                    });
                }
            } else if (
                selectedGameId === "lrc" &&
                gameData.phase === "playing"
            ) {
                handleEmit("game_action", {
                    roomId: "debug-room",
                    action: {
                        type: "ROLL_DICE",
                        payload: {},
                        userId: currentTurnPlayerId,
                    },
                });
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [autoPlay, masterGameState, selectedGameId, handleEmit]);

    const gameEntry = GAME_REGISTRY[selectedGameId];
    const GameComponent = gameEntry?.component;

    const players = useMemo(() => {
        if (!masterGameState.gameData?.players) return [];
        return Object.values(masterGameState.gameData.players).map(
            (p: { id: string; name: string }) => ({
                id: p.id,
                name: p.name,
            }),
        );
    }, [masterGameState.gameData]);

    const gamesList = Object.keys(GAME_REGISTRY).map((id) => ({
        id,
        name: GAME_REGISTRY[id].displayName,
    }));

    const scenariosList = [
        { id: "default", name: "Default Scenario" },
        // We can add more scenarios here later
    ];

    const currentPlayerData = useMemo(() => {
        const data = masterGameState.playerDataMap[selectedPlayerId];
        if (!data || !masterGameState.gameData) return null;

        // When switching perspectives, we need to update the localOrdering
        // so the selected player is always at index 0 (the bottom of the screen)
        const playOrder = masterGameState.gameData.playOrder;
        const playerIndex = playOrder.indexOf(selectedPlayerId);

        if (playerIndex === -1) return data;

        const newLocalOrdering = [
            ...playOrder.slice(playerIndex),
            ...playOrder.slice(0, playerIndex),
        ];

        return {
            ...data,
            localOrdering: newLocalOrdering,
        };
    }, [masterGameState, selectedPlayerId]);

    if (!GameComponent || !masterGameState.gameData) {
        return <div>Loading...</div>;
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-background">
            <MockSessionProvider
                initialUserId={selectedPlayerId}
                initialRoomId="debug-room"
            >
                <MockWebSocketProvider
                    onEmit={handleEmit}
                    latency={latency}
                    simulateError={simulateError}
                >
                    <div className="w-full h-full">
                        <GameComponentWrapper
                            GameComponent={GameComponent}
                            gameData={masterGameState.gameData}
                            playerData={currentPlayerData}
                            selectedPlayerId={selectedPlayerId}
                        />
                    </div>
                </MockWebSocketProvider>
            </MockSessionProvider>

            <FloatingControlPanel
                games={gamesList}
                selectedGame={selectedGameId}
                onSelectGame={setSelectedGameId}
                players={players}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                scenarios={scenariosList}
                selectedScenario={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
                actionLog={actionLog}
                onClearLog={() => setActionLog([])}
                gameStateJson={JSON.stringify(masterGameState, null, 2)}
                onUpdateGameState={handleUpdateGameState}
                latency={latency}
                onLatencyChange={setLatency}
                simulateError={simulateError}
                onSimulateErrorChange={setSimulateError}
                autoPlay={autoPlay}
                onAutoPlayChange={setAutoPlay}
                settingsSchema={settingsSchema}
                currentSettings={currentSettings}
                onUpdateSetting={handleUpdateSetting}
                onRegenerateGame={() =>
                    setRegenerateTrigger((prev) => prev + 1)
                }
            />
        </div>
    );
}
