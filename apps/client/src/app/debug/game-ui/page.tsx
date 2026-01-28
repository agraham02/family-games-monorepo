"use client";

/**
 * Game UI Debug Page
 *
 * This page uses the ACTUAL game components (Spades, Dominoes, LRC) for debugging.
 * Any changes to the real game UI are automatically reflected here.
 *
 * The debug page adds:
 * - Game type selection
 * - Mock data generation with configurable options
 * - Debug action dispatcher to simulate game actions
 * - Player count adjustment
 * - Turn timer simulation
 * - Game state manipulation helpers
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
    getGameComponent,
    getRegisteredGameTypes,
    getGameDisplayName,
    getMockDataGenerator,
    getDefaultMockOptions,
} from "@/components/games/registry";
import { GameData, PlayerData } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Play,
    Settings,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DebugAction {
    type: string;
    payload: unknown;
    timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug Controls Component
// ─────────────────────────────────────────────────────────────────────────────

interface DebugControlsProps {
    selectedGame: string;
    onGameChange: (game: string) => void;
    gameTypes: string[];
    playerCount: number;
    onPlayerCountChange: (count: number) => void;
    minPlayers: number;
    maxPlayers: number;
    onReset: () => void;
    onRegenerate: () => void;
    isSpectator: boolean;
    onSpectatorToggle: (value: boolean) => void;
    actionLog: DebugAction[];
    mockOptions: Record<string, unknown>;
    onMockOptionsChange: (options: Record<string, unknown>) => void;
}

function DebugControls({
    selectedGame,
    onGameChange,
    gameTypes,
    playerCount,
    onPlayerCountChange,
    minPlayers,
    maxPlayers,
    onReset,
    onRegenerate,
    isSpectator,
    onSpectatorToggle,
    actionLog,
    mockOptions,
    onMockOptionsChange,
}: DebugControlsProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showActionLog, setShowActionLog] = useState(false);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-white">
                            Debug Controls
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {getGameDisplayName(selectedGame)}
                        </Badge>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400"
                        >
                            {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                    <div className="p-4 space-y-4">
                        <div className="flex flex-wrap gap-4">
                            {/* Game Selector */}
                            <Card className="flex-1 min-w-[200px] bg-slate-800 border-slate-700">
                                <CardHeader className="py-2 px-4">
                                    <CardTitle className="text-sm text-white">
                                        Game Type
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2 px-4">
                                    <Select
                                        value={selectedGame}
                                        onValueChange={onGameChange}
                                    >
                                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gameTypes.map((type) => (
                                                <SelectItem
                                                    key={type}
                                                    value={type}
                                                >
                                                    {getGameDisplayName(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Player Count */}
                            <Card className="flex-1 min-w-[200px] bg-slate-800 border-slate-700">
                                <CardHeader className="py-2 px-4">
                                    <CardTitle className="text-sm text-white">
                                        Players
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2 px-4">
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            value={[playerCount]}
                                            onValueChange={(value) =>
                                                onPlayerCountChange(value[0])
                                            }
                                            min={minPlayers}
                                            max={maxPlayers}
                                            step={1}
                                            className="flex-1"
                                        />
                                        <Badge
                                            variant="secondary"
                                            className="w-8 justify-center"
                                        >
                                            {playerCount}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Spectator Mode Toggle */}
                            <Card className="flex-1 min-w-[180px] bg-slate-800 border-slate-700">
                                <CardHeader className="py-2 px-4">
                                    <CardTitle className="text-sm text-white flex items-center justify-between">
                                        <span>Spectator Mode</span>
                                        <Switch
                                            checked={isSpectator}
                                            onCheckedChange={onSpectatorToggle}
                                        />
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={onRegenerate}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={onReset}
                                    variant="destructive"
                                    size="sm"
                                >
                                    Reset All
                                </Button>
                            </div>
                        </div>

                        {/* Mock Options (game-specific) */}
                        {Object.keys(mockOptions).length > 0 && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="py-2 px-4">
                                    <CardTitle className="text-sm text-white">
                                        Mock Data Options
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2 px-4">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        {Object.entries(mockOptions).map(
                                            ([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Label className="text-slate-400 capitalize">
                                                        {key
                                                            .replace(
                                                                /([A-Z])/g,
                                                                " $1",
                                                            )
                                                            .trim()}
                                                        :
                                                    </Label>
                                                    {typeof value ===
                                                    "boolean" ? (
                                                        <Switch
                                                            checked={value}
                                                            onCheckedChange={(
                                                                v,
                                                            ) =>
                                                                onMockOptionsChange(
                                                                    {
                                                                        ...mockOptions,
                                                                        [key]: v,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    ) : typeof value ===
                                                      "number" ? (
                                                        <input
                                                            type="number"
                                                            value={value}
                                                            onChange={(e) =>
                                                                onMockOptionsChange(
                                                                    {
                                                                        ...mockOptions,
                                                                        [key]: Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    },
                                                                )
                                                            }
                                                            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
                                                        />
                                                    ) : (
                                                        <span className="text-white">
                                                            {String(value)}
                                                        </span>
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Log */}
                        <Collapsible
                            open={showActionLog}
                            onOpenChange={setShowActionLog}
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 gap-2"
                                >
                                    <Play className="w-4 h-4" />
                                    Action Log ({actionLog.length})
                                    {showActionLog ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-2 max-h-32 overflow-auto bg-slate-950 rounded p-2 font-mono text-xs">
                                    {actionLog.length === 0 ? (
                                        <div className="text-slate-500">
                                            No actions dispatched yet
                                        </div>
                                    ) : (
                                        actionLog
                                            .slice(-10)
                                            .map((action, i) => (
                                                <div
                                                    key={i}
                                                    className="text-slate-300 py-0.5"
                                                >
                                                    <span className="text-blue-400">
                                                        {action.type}
                                                    </span>
                                                    <span className="text-slate-500 ml-2">
                                                        {JSON.stringify(
                                                            action.payload,
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Debug Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GameUIDebugPage() {
    // Game selection
    const [selectedGame, setSelectedGame] = useState<string>("spades");
    const gameTypes = getRegisteredGameTypes();

    // Game state
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);

    // Debug options
    const [playerCount, setPlayerCount] = useState(4);
    const [isSpectator, setIsSpectator] = useState(false);
    const [mockOptions, setMockOptions] = useState<Record<string, unknown>>({});
    const [actionLog, setActionLog] = useState<DebugAction[]>([]);

    // Get player count constraints based on game type
    const playerConstraints = useMemo(() => {
        switch (selectedGame) {
            case "spades":
                return { min: 2, max: 4 };
            case "dominoes":
                return { min: 2, max: 6 };
            case "lrc":
                return { min: 3, max: 8 };
            default:
                return { min: 2, max: 8 };
        }
    }, [selectedGame]);

    // Initialize mock options when game changes
    useEffect(() => {
        const defaults = getDefaultMockOptions(selectedGame);
        setMockOptions(defaults);
        // Reset player count if out of bounds
        const { min, max } = playerConstraints;
        if (playerCount < min) setPlayerCount(min);
        if (playerCount > max) setPlayerCount(max);
    }, [selectedGame, playerConstraints, playerCount]);

    // Generate mock data
    const generateData = useCallback(() => {
        const generator = getMockDataGenerator(selectedGame);
        if (!generator) {
            toast.error(`No mock data generator for ${selectedGame}`);
            return;
        }

        const { gameData: newGameData, playerData: newPlayerData } = generator({
            ...mockOptions,
            playerCount,
        });

        // Validate that generated data matches expected game type
        if (newGameData.type !== selectedGame) {
            console.error(
                `Mock data type mismatch: expected ${selectedGame}, got ${newGameData.type}`,
            );
            return;
        }

        setGameData(newGameData);
        setPlayerData(isSpectator ? null : newPlayerData);
        setActionLog([]);
    }, [selectedGame, mockOptions, playerCount, isSpectator]);

    // Initialize on mount and when game/options change
    useEffect(() => {
        generateData();
    }, [generateData]);

    // Mock action dispatcher - logs actions and applies them to game state
    const dispatchOptimisticAction = useCallback(
        (actionType: string, actionPayload: unknown) => {
            const action: DebugAction = {
                type: actionType,
                payload: actionPayload,
                timestamp: Date.now(),
            };

            setActionLog((prev) => [...prev, action]);
            toast.info(`Action: ${actionType}`, {
                description: JSON.stringify(actionPayload),
                duration: 2000,
            });

            // TODO: In future, could apply action to game state using a reducer
            // For now, just log it
            console.log("🎮 Debug action dispatched:", action);
        },
        [],
    );

    // Handle game change
    const handleGameChange = useCallback((game: string) => {
        setSelectedGame(game);
        setActionLog([]);
        // Clear game data to prevent type mismatch during transition
        setGameData(null);
        setPlayerData(null);
    }, []);

    // Handle reset
    const handleReset = useCallback(() => {
        const defaults = getDefaultMockOptions(selectedGame);
        setMockOptions(defaults);
        setPlayerCount(4);
        setIsSpectator(false);
        setActionLog([]);
        generateData();
        toast.success("Reset to defaults");
    }, [selectedGame, generateData]);

    // Get the actual game component
    const GameComponent = useMemo(
        () => getGameComponent(selectedGame),
        [selectedGame],
    );

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Debug Controls */}
            <DebugControls
                selectedGame={selectedGame}
                onGameChange={handleGameChange}
                gameTypes={gameTypes}
                playerCount={playerCount}
                onPlayerCountChange={setPlayerCount}
                minPlayers={playerConstraints.min}
                maxPlayers={playerConstraints.max}
                onReset={handleReset}
                onRegenerate={generateData}
                isSpectator={isSpectator}
                onSpectatorToggle={setIsSpectator}
                actionLog={actionLog}
                mockOptions={mockOptions}
                onMockOptionsChange={setMockOptions}
            />

            {/* Game Component - uses the ACTUAL component */}
            <div className="pt-[60px]">
                {GameComponent && gameData && gameData.type === selectedGame ? (
                    <ErrorBoundary
                        onReset={generateData}
                        fallback={
                            <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] gap-4 text-zinc-400">
                                <p>Something went wrong loading the game UI.</p>
                                <Button
                                    onClick={generateData}
                                    variant="outline"
                                >
                                    Regenerate
                                </Button>
                            </div>
                        }
                    >
                        <GameComponent
                            gameData={gameData}
                            playerData={playerData}
                            dispatchOptimisticAction={
                                isSpectator
                                    ? undefined
                                    : dispatchOptimisticAction
                            }
                            isSpectator={isSpectator}
                            roomCode="DEBUG"
                        />
                    </ErrorBoundary>
                ) : (
                    <div className="flex items-center justify-center h-[calc(100vh-60px)] text-zinc-400">
                        {!GameComponent ? (
                            <p>
                                No component registered for &quot;{selectedGame}
                                &quot;
                            </p>
                        ) : (
                            <p>Loading...</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
