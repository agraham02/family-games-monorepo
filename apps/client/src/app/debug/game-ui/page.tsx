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
 * - Per-game action buttons (bid, play card, roll dice, etc.)
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
import {
    GameData,
    PlayerData,
    SpadesData,
    SpadesPlayerData,
    DominoesData,
    DominoesPlayerData,
    LRCData,
    LRCPlayerData,
    TurnTimerInfo,
    PlayingCard,
    Tile,
} from "@shared/types";
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
    Timer,
    User,
    Dices,
    Square,
    Hand,
    SkipForward,
    FastForward,
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

// Phase options for each game type
const GAME_PHASES: Record<string, string[]> = {
    spades: [
        "bidding",
        "playing",
        "trick-result",
        "scoring",
        "round-summary",
        "finished",
    ],
    dominoes: ["first-move", "playing", "round-summary", "finished"],
    lrc: [
        "waiting-for-roll",
        "showing-results",
        "wild-target-selection",
        "last-chip-challenge",
        "round-over",
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Debug Game State Reducers
// These functions apply game actions to the mock state, simulating server behavior
// ─────────────────────────────────────────────────────────────────────────────

interface GameStateUpdate {
    gameData: GameData;
    playerData: PlayerData | null;
}

/**
 * Apply a Spades action to the game state
 */
function applySpadesAction(
    gameData: SpadesData,
    playerData: SpadesPlayerData | null,
    actionType: string,
    payload: unknown,
): GameStateUpdate {
    const updated = { ...gameData };
    let updatedPlayerData = playerData
        ? { ...playerData, hand: [...playerData.hand] }
        : null;

    switch (actionType) {
        case "PLAY_CARD": {
            const { card } = payload as { card: PlayingCard };
            if (!card || !updatedPlayerData) break;

            // Remove card from player's hand
            const cardIndex = updatedPlayerData.hand.findIndex(
                (c) => c.suit === card.suit && c.rank === card.rank,
            );
            if (cardIndex >= 0) {
                updatedPlayerData.hand.splice(cardIndex, 1);
            }

            // Add card to current trick
            const currentPlayerId = updated.playOrder[updated.currentTurnIndex];
            if (!updated.currentTrick) {
                updated.currentTrick = { plays: [] };
            }
            updated.currentTrick.plays.push({
                playerId: currentPlayerId,
                card: card,
            });

            // Update hand counts
            if (updated.handsCounts) {
                updated.handsCounts[currentPlayerId] =
                    (updated.handsCounts[currentPlayerId] || 0) - 1;
            }

            // If spade was played, mark spades broken
            if (card.suit === "Spades" && !updated.spadesBroken) {
                updated.spadesBroken = true;
            }

            // Check if trick is complete (all players played)
            if (updated.currentTrick.plays.length >= updated.playOrder.length) {
                // Move to trick-result phase briefly, then back to playing
                // For simplicity in debug, just award the trick to the first spade player or highest card
                const trickWinner =
                    updated.currentTrick.plays[0]?.playerId || currentPlayerId;
                if (!updated.roundTrickCounts) {
                    updated.roundTrickCounts = {};
                }
                updated.roundTrickCounts[trickWinner] =
                    (updated.roundTrickCounts[trickWinner] || 0) + 1;

                // Clear trick and set leader to winner
                updated.completedTricks.push(updated.currentTrick);
                updated.currentTrick = null;
                updated.currentTurnIndex =
                    updated.playOrder.indexOf(trickWinner);
            } else {
                // Advance to next player
                updated.currentTurnIndex =
                    (updated.currentTurnIndex + 1) % updated.playOrder.length;
            }
            break;
        }

        case "PLACE_BID": {
            const { amount } = payload as { amount: number };
            const currentPlayerId = updated.playOrder[updated.currentTurnIndex];

            if (!updated.bids) {
                updated.bids = {};
            }
            updated.bids[currentPlayerId] = {
                amount: amount ?? 3,
                type: "normal",
                isBlind: false,
            };

            // Check if all players have bid
            const allBid = updated.playOrder.every((pid) => updated.bids[pid]);
            if (allBid) {
                updated.phase = "playing";
                updated.currentTurnIndex =
                    (updated.dealerIndex + 1) % updated.playOrder.length;
            } else {
                updated.currentTurnIndex =
                    (updated.currentTurnIndex + 1) % updated.playOrder.length;
            }
            break;
        }

        default:
            // For unhandled actions, just advance turn
            updated.currentTurnIndex =
                (updated.currentTurnIndex + 1) % updated.playOrder.length;
    }

    return { gameData: updated, playerData: updatedPlayerData };
}

/**
 * Apply a Dominoes action to the game state
 */
function applyDominoesAction(
    gameData: DominoesData,
    playerData: DominoesPlayerData | null,
    actionType: string,
    payload: unknown,
): GameStateUpdate {
    const updated = {
        ...gameData,
        board: { ...gameData.board, tiles: [...gameData.board.tiles] },
    };
    let updatedPlayerData = playerData
        ? { ...playerData, hand: [...playerData.hand] }
        : null;

    switch (actionType) {
        case "PLACE_TILE": {
            const { tile, placement } = payload as {
                tile: Tile;
                placement: { end: string; flipped: boolean };
            };
            if (!tile || !updatedPlayerData) break;

            // Remove tile from player's hand
            const tileIndex = updatedPlayerData.hand.findIndex(
                (t) => t.id === tile.id,
            );
            if (tileIndex >= 0) {
                updatedPlayerData.hand.splice(tileIndex, 1);
            }

            // Add tile to board
            const placedTile = {
                ...tile,
                flipped: placement?.flipped ?? false,
            };
            if (placement?.end === "left" && updated.board.tiles.length > 0) {
                updated.board.tiles.unshift(placedTile);
            } else {
                updated.board.tiles.push(placedTile);
            }

            // Update board ends
            if (updated.board.tiles.length === 1) {
                updated.board.leftEnd = { value: tile.left, tileId: tile.id };
                updated.board.rightEnd = { value: tile.right, tileId: tile.id };
            } else if (placement?.end === "left") {
                updated.board.leftEnd = {
                    value: placement.flipped ? tile.right : tile.left,
                    tileId: tile.id,
                };
            } else {
                updated.board.rightEnd = {
                    value: placement?.flipped ? tile.left : tile.right,
                    tileId: tile.id,
                };
            }

            // Advance turn
            updated.currentTurnIndex =
                (updated.currentTurnIndex + 1) % updated.playOrder.length;
            break;
        }

        case "PASS":
        case "DRAW_TILE":
            // Just advance turn for these
            updated.currentTurnIndex =
                (updated.currentTurnIndex + 1) % updated.playOrder.length;
            break;

        default:
            updated.currentTurnIndex =
                (updated.currentTurnIndex + 1) % updated.playOrder.length;
    }

    return { gameData: updated, playerData: updatedPlayerData };
}

/**
 * Apply an LRC action to the game state
 */
function applyLRCAction(
    gameData: LRCData,
    playerData: LRCPlayerData | null,
    actionType: string,
    _payload: unknown,
): GameStateUpdate {
    const updated = {
        ...gameData,
        lrcPlayers: [...gameData.lrcPlayers.map((p) => ({ ...p }))],
    };

    switch (actionType) {
        case "ROLL_DICE": {
            // Generate random dice results
            const faces: Array<"L" | "R" | "C" | "DOT"> = [
                "L",
                "R",
                "C",
                "DOT",
                "DOT",
                "DOT",
            ];
            const currentPlayer =
                updated.lrcPlayers[updated.currentPlayerIndex];
            const numDice = Math.min(currentPlayer.chips, 3);
            const diceResults = Array.from({ length: numDice }, () => ({
                face: faces[Math.floor(Math.random() * 6)],
                rawValue: Math.floor(Math.random() * 6) + 1,
            }));
            updated.currentRoll = diceResults;
            updated.phase = "showing-results";
            break;
        }

        case "CONFIRM_RESULTS": {
            // Apply dice results and advance turn
            updated.phase = "waiting-for-roll";
            updated.currentRoll = null;
            updated.currentPlayerIndex =
                (updated.currentPlayerIndex + 1) % updated.lrcPlayers.length;
            // Skip players with no chips
            let attempts = 0;
            while (
                updated.lrcPlayers[updated.currentPlayerIndex].chips === 0 &&
                attempts < updated.lrcPlayers.length
            ) {
                updated.currentPlayerIndex =
                    (updated.currentPlayerIndex + 1) %
                    updated.lrcPlayers.length;
                attempts++;
            }
            break;
        }

        default:
            // Advance turn for unhandled actions
            updated.currentPlayerIndex =
                (updated.currentPlayerIndex + 1) % updated.lrcPlayers.length;
    }

    // Sync currentTurnIndex with currentPlayerIndex for LRC
    updated.currentTurnIndex = updated.currentPlayerIndex;

    return { gameData: updated, playerData };
}

/**
 * Main dispatcher that routes to the appropriate game reducer
 */
function applyGameAction(
    gameType: string,
    gameData: GameData,
    playerData: PlayerData | null,
    actionType: string,
    payload: unknown,
): GameStateUpdate {
    switch (gameType) {
        case "spades":
            return applySpadesAction(
                gameData as SpadesData,
                playerData as SpadesPlayerData | null,
                actionType,
                payload,
            );
        case "dominoes":
            return applyDominoesAction(
                gameData as DominoesData,
                playerData as DominoesPlayerData | null,
                actionType,
                payload,
            );
        case "lrc":
            return applyLRCAction(
                gameData as LRCData,
                playerData as LRCPlayerData | null,
                actionType,
                payload,
            );
        default:
            return { gameData, playerData };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Action Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface GameActionDef {
    label: string;
    icon: React.ReactNode;
    actionType: string;
    phases: string[];
    getPayload: (
        gameData: GameData,
        playerData: PlayerData | null,
        currentPlayerId: string,
    ) => unknown;
}

/**
 * Get available actions for each game type based on current phase
 */
function getGameActions(gameType: string): GameActionDef[] {
    switch (gameType) {
        case "spades":
            return [
                {
                    label: "Place Bid",
                    icon: <Hand className="w-4 h-4" />,
                    actionType: "PLACE_BID",
                    phases: ["bidding"],
                    getPayload: () => ({
                        bid: {
                            amount: Math.floor(Math.random() * 4) + 1,
                            type: "normal",
                            isBlind: false,
                        },
                    }),
                },
                {
                    label: "Play Card",
                    icon: <Square className="w-4 h-4" />,
                    actionType: "PLAY_CARD",
                    phases: ["playing"],
                    getPayload: (gameData, playerData) => {
                        const spadesPlayer =
                            playerData as SpadesPlayerData | null;
                        if (
                            spadesPlayer?.hand &&
                            spadesPlayer.hand.length > 0
                        ) {
                            return { card: spadesPlayer.hand[0] };
                        }
                        return { card: { suit: "Spades", rank: "A" } };
                    },
                },
                {
                    label: "Continue After Trick",
                    icon: <SkipForward className="w-4 h-4" />,
                    actionType: "CONTINUE_AFTER_TRICK_RESULT",
                    phases: ["trick-result"],
                    getPayload: () => ({}),
                },
                {
                    label: "Score Round",
                    icon: <FastForward className="w-4 h-4" />,
                    actionType: "SCORE_ROUND",
                    phases: ["scoring"],
                    getPayload: () => ({}),
                },
                {
                    label: "Continue After Summary",
                    icon: <SkipForward className="w-4 h-4" />,
                    actionType: "CONTINUE_AFTER_ROUND_SUMMARY",
                    phases: ["round-summary"],
                    getPayload: () => ({}),
                },
            ];

        case "dominoes":
            return [
                {
                    label: "Place Tile",
                    icon: <Square className="w-4 h-4" />,
                    actionType: "PLACE_TILE",
                    phases: ["playing", "first-move"],
                    getPayload: (gameData, playerData) => {
                        const dominoesPlayer =
                            playerData as DominoesPlayerData | null;
                        const dominoesGame = gameData as DominoesData;
                        if (
                            dominoesPlayer?.hand &&
                            dominoesPlayer.hand.length > 0
                        ) {
                            const tile = dominoesPlayer.hand[0];
                            return {
                                tile,
                                placement: {
                                    end:
                                        dominoesGame.board?.tiles?.length > 0
                                            ? "right"
                                            : "first",
                                    flipped: false,
                                },
                            };
                        }
                        return {
                            tile: { left: 6, right: 6, id: "debug-tile" },
                            placement: { end: "first", flipped: false },
                        };
                    },
                },
                {
                    label: "Pass Turn",
                    icon: <SkipForward className="w-4 h-4" />,
                    actionType: "PASS",
                    phases: ["playing"],
                    getPayload: () => ({}),
                },
                {
                    label: "Draw Tile",
                    icon: <Hand className="w-4 h-4" />,
                    actionType: "DRAW_TILE",
                    phases: ["playing"],
                    getPayload: () => ({}),
                },
                {
                    label: "Continue After Summary",
                    icon: <SkipForward className="w-4 h-4" />,
                    actionType: "CONTINUE_AFTER_ROUND_SUMMARY",
                    phases: ["round-summary"],
                    getPayload: () => ({}),
                },
            ];

        case "lrc":
            return [
                {
                    label: "Roll Dice",
                    icon: <Dices className="w-4 h-4" />,
                    actionType: "ROLL_DICE",
                    phases: ["waiting-for-roll"],
                    getPayload: () => ({}),
                },
                {
                    label: "Confirm Results",
                    icon: <SkipForward className="w-4 h-4" />,
                    actionType: "CONFIRM_RESULTS",
                    phases: ["showing-results"],
                    getPayload: () => ({}),
                },
                {
                    label: "Choose Wild Target",
                    icon: <User className="w-4 h-4" />,
                    actionType: "CHOOSE_WILD_TARGET",
                    phases: ["wild-target-selection"],
                    getPayload: (gameData) => {
                        const lrcGame = gameData as LRCData;
                        const targets =
                            lrcGame.lrcPlayers?.filter((p) => p.chips > 0) ||
                            [];
                        return { targetPlayerId: targets[0]?.id || "player-1" };
                    },
                },
                {
                    label: "Last Chip Challenge Roll",
                    icon: <Dices className="w-4 h-4" />,
                    actionType: "LAST_CHIP_CHALLENGE_ROLL",
                    phases: ["last-chip-challenge"],
                    getPayload: () => ({}),
                },
                {
                    label: "Play Again",
                    icon: <RefreshCw className="w-4 h-4" />,
                    actionType: "PLAY_AGAIN",
                    phases: ["round-over"],
                    getPayload: () => ({}),
                },
            ];

        default:
            return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Actions Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface GameActionsPanelProps {
    selectedGame: string;
    gameData: GameData | null;
    playerData: PlayerData | null;
    isSpectator: boolean;
    onAction: (actionType: string, payload: unknown) => void;
    onAutoProgress: () => void;
}

function GameActionsPanel({
    selectedGame,
    gameData,
    playerData,
    isSpectator,
    onAction,
    onAutoProgress,
}: GameActionsPanelProps) {
    const actions = getGameActions(selectedGame);
    const currentPhase = gameData?.phase || "";
    const currentPlayerId =
        gameData?.playOrder?.[
            (gameData as SpadesData | DominoesData | LRCData)
                ?.currentTurnIndex ?? 0
        ] || "player-0";

    // Filter actions available for current phase
    const availableActions = actions.filter((a) =>
        a.phases.includes(currentPhase),
    );

    if (isSpectator) {
        return (
            <div className="text-sm text-slate-400 italic">
                Spectator mode - actions disabled
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {availableActions.length === 0 ? (
                <span className="text-sm text-slate-400">
                    No actions available for phase: {currentPhase || "unknown"}
                </span>
            ) : (
                availableActions.map((action) => (
                    <Button
                        key={action.actionType}
                        onClick={() => {
                            const payload = action.getPayload(
                                gameData!,
                                playerData,
                                currentPlayerId,
                            );
                            onAction(action.actionType, payload);
                        }}
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                    >
                        {action.icon}
                        {action.label}
                    </Button>
                ))
            )}
            <Button
                onClick={onAutoProgress}
                variant="outline"
                size="sm"
                className="gap-2 ml-auto"
            >
                <FastForward className="w-4 h-4" />
                Auto Progress
            </Button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn Timer Controls Component
// ─────────────────────────────────────────────────────────────────────────────

interface TurnTimerControlsProps {
    turnTimerEnabled: boolean;
    onTurnTimerToggle: (enabled: boolean) => void;
    turnTimeLimit: number;
    onTurnTimeLimitChange: (seconds: number) => void;
    currentTimerInfo: TurnTimerInfo | null;
    onResetTimer: () => void;
}

function TurnTimerControls({
    turnTimerEnabled,
    onTurnTimerToggle,
    turnTimeLimit,
    onTurnTimeLimitChange,
    currentTimerInfo,
    onResetTimer,
}: TurnTimerControlsProps) {
    const remainingTime = useMemo(() => {
        if (!currentTimerInfo) return null;
        const elapsed =
            currentTimerInfo.serverTime - currentTimerInfo.startedAt;
        const remaining = Math.max(0, currentTimerInfo.duration - elapsed);
        return Math.ceil(remaining / 1000);
    }, [currentTimerInfo]);

    return (
        <Card className="flex-1 min-w-48 max-w-xs bg-slate-800 border-slate-700">
            <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Turn Timer
                    <Switch
                        checked={turnTimerEnabled}
                        onCheckedChange={onTurnTimerToggle}
                        className="ml-auto"
                    />
                </CardTitle>
            </CardHeader>
            {turnTimerEnabled && (
                <CardContent className="py-2 px-4 space-y-3">
                    <div className="flex items-center gap-4">
                        <Label className="text-slate-400 text-sm whitespace-nowrap">
                            Time Limit:
                        </Label>
                        <Slider
                            value={[turnTimeLimit]}
                            onValueChange={(value) =>
                                onTurnTimeLimitChange(value[0])
                            }
                            min={10}
                            max={120}
                            step={5}
                            className="flex-1"
                        />
                        <Badge
                            variant="secondary"
                            className="w-12 justify-center"
                        >
                            {turnTimeLimit}s
                        </Badge>
                    </div>
                    {currentTimerInfo && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Remaining: {remainingTime}s
                            </span>
                            <Button
                                onClick={onResetTimer}
                                variant="outline"
                                size="sm"
                            >
                                Reset Timer
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Current Player Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface CurrentPlayerSelectorProps {
    gameData: GameData | null;
    onPlayerChange: (playerIndex: number) => void;
}

function CurrentPlayerSelector({
    gameData,
    onPlayerChange,
}: CurrentPlayerSelectorProps) {
    if (!gameData?.playOrder) return null;

    const currentTurnIndex =
        (gameData as SpadesData | DominoesData | LRCData)?.currentTurnIndex ??
        0;
    const players = gameData.playOrder.map((id) => ({
        id,
        name: gameData.players[id]?.name || id,
    }));

    return (
        <Card className="flex-1 min-w-40 max-w-48 bg-slate-800 border-slate-700">
            <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Current Turn
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
                <Select
                    value={String(currentTurnIndex)}
                    onValueChange={(val) => onPlayerChange(Number(val))}
                >
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {players.map((player, idx) => (
                            <SelectItem key={player.id} value={String(idx)}>
                                {player.name} {idx === 0 && "(You)"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    );
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
    // New props for game actions and timer
    gameData: GameData | null;
    playerData: PlayerData | null;
    onAction: (actionType: string, payload: unknown) => void;
    onAutoProgress: () => void;
    turnTimerEnabled: boolean;
    onTurnTimerToggle: (enabled: boolean) => void;
    turnTimeLimit: number;
    onTurnTimeLimitChange: (seconds: number) => void;
    currentTimerInfo: TurnTimerInfo | null;
    onResetTimer: () => void;
    onCurrentPlayerChange: (playerIndex: number) => void;
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
    // New props
    gameData,
    playerData,
    onAction,
    onAutoProgress,
    turnTimerEnabled,
    onTurnTimerToggle,
    turnTimeLimit,
    onTurnTimeLimitChange,
    currentTimerInfo,
    onResetTimer,
    onCurrentPlayerChange,
}: DebugControlsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showActionLog, setShowActionLog] = useState(false);

    return (
        <>
            {/* Floating toggle button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outline"
                size="sm"
                className="fixed top-4 left-4 z-50 gap-2 bg-slate-900/95 border-slate-700 text-white hover:bg-slate-800"
            >
                <Settings className="w-4 h-4" />
                Debug
                <Badge variant="outline" className="text-xs ml-1">
                    {getGameDisplayName(selectedGame)}
                </Badge>
            </Button>

            {/* Floating overlay panel */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="fixed top-14 left-4 right-4 max-w-4xl z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-white">
                                    Debug Controls
                                </span>
                                <Badge variant="outline" className="text-xs">
                                    {getGameDisplayName(selectedGame)}
                                </Badge>
                            </div>
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="ghost"
                                size="sm"
                                className="text-slate-400"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Row 1: Game selector, Players, Spectator, Actions */}
                            <div className="flex flex-wrap gap-3">
                                <Card className="flex-1 min-w-44 bg-slate-800 border-slate-700">
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-xs text-white">
                                            Game Type
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2 px-3">
                                        <Select
                                            value={selectedGame}
                                            onValueChange={onGameChange}
                                        >
                                            <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {gameTypes.map((type) => (
                                                    <SelectItem
                                                        key={type}
                                                        value={type}
                                                    >
                                                        {getGameDisplayName(
                                                            type,
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                <Card className="flex-1 min-w-40 bg-slate-800 border-slate-700">
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-xs text-white">
                                            Players
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2 px-3">
                                        <div className="flex items-center gap-3">
                                            <Slider
                                                value={[playerCount]}
                                                onValueChange={(value) =>
                                                    onPlayerCountChange(
                                                        value[0],
                                                    )
                                                }
                                                min={minPlayers}
                                                max={maxPlayers}
                                                step={1}
                                                className="flex-1"
                                            />
                                            <Badge
                                                variant="secondary"
                                                className="w-7 justify-center text-xs"
                                            >
                                                {playerCount}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="min-w-32 bg-slate-800 border-slate-700">
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-xs text-white flex items-center justify-between gap-2">
                                            <span>Spectator</span>
                                            <Switch
                                                checked={isSpectator}
                                                onCheckedChange={
                                                    onSpectatorToggle
                                                }
                                            />
                                        </CardTitle>
                                    </CardHeader>
                                </Card>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={onRegenerate}
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-xs"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Regenerate
                                    </Button>
                                    <Button
                                        onClick={onReset}
                                        variant="destructive"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>

                            {/* Row 2: Mock Options */}
                            {Object.keys(mockOptions).length > 0 && (
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-xs text-white">
                                            Mock Data Options
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2 px-3">
                                        <div className="flex flex-wrap gap-3 text-sm">
                                            {Object.entries(mockOptions).map(
                                                ([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Label className="text-slate-400 text-xs capitalize">
                                                            {key
                                                                .replace(
                                                                    /([A-Z])/g,
                                                                    " $1",
                                                                )
                                                                .trim()}
                                                            :
                                                        </Label>
                                                        {key === "phase" &&
                                                        typeof value ===
                                                            "string" ? (
                                                            <Select
                                                                value={value}
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    onMockOptionsChange(
                                                                        {
                                                                            ...mockOptions,
                                                                            [key]: v,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="w-36 h-8 bg-slate-700 border-slate-600 text-white text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(
                                                                        GAME_PHASES[
                                                                            selectedGame
                                                                        ] || []
                                                                    ).map(
                                                                        (
                                                                            phase,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    phase
                                                                                }
                                                                                value={
                                                                                    phase
                                                                                }
                                                                            >
                                                                                {
                                                                                    phase
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : typeof value ===
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
                                                                className="w-16 h-8 px-2 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                                            />
                                                        ) : typeof value ===
                                                          "string" ? (
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                onChange={(e) =>
                                                                    onMockOptionsChange(
                                                                        {
                                                                            ...mockOptions,
                                                                            [key]: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                className="w-24 h-8 px-2 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                                            />
                                                        ) : (
                                                            <span className="text-white text-xs">
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

                            {/* Row 3: Turn Timer & Current Player */}
                            <div className="flex flex-wrap gap-3">
                                <TurnTimerControls
                                    turnTimerEnabled={turnTimerEnabled}
                                    onTurnTimerToggle={onTurnTimerToggle}
                                    turnTimeLimit={turnTimeLimit}
                                    onTurnTimeLimitChange={
                                        onTurnTimeLimitChange
                                    }
                                    currentTimerInfo={currentTimerInfo}
                                    onResetTimer={onResetTimer}
                                />
                                <CurrentPlayerSelector
                                    gameData={gameData}
                                    onPlayerChange={onCurrentPlayerChange}
                                />
                            </div>

                            {/* Row 4: Game Actions */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="py-2 px-3">
                                    <CardTitle className="text-xs text-white flex items-center gap-2">
                                        <Dices className="w-3 h-3" />
                                        Game Actions
                                        <Badge
                                            variant="outline"
                                            className="text-xs ml-2"
                                        >
                                            Phase:{" "}
                                            {gameData?.phase || "unknown"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2 px-3">
                                    <GameActionsPanel
                                        selectedGame={selectedGame}
                                        gameData={gameData}
                                        playerData={playerData}
                                        isSpectator={isSpectator}
                                        onAction={onAction}
                                        onAutoProgress={onAutoProgress}
                                    />
                                </CardContent>
                            </Card>

                            {/* Action Log (collapsible) */}
                            <Collapsible
                                open={showActionLog}
                                onOpenChange={setShowActionLog}
                            >
                                <CollapsibleTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 gap-2 text-xs"
                                    >
                                        <Play className="w-3 h-3" />
                                        Action Log ({actionLog.length})
                                        {showActionLog ? (
                                            <ChevronUp className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="mt-2 max-h-24 overflow-auto bg-slate-950 rounded p-2 font-mono text-xs">
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
                    </div>
                </div>
            )}
        </>
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

    // Turn timer state
    const [turnTimerEnabled, setTurnTimerEnabled] = useState(false);
    const [turnTimeLimit, setTurnTimeLimit] = useState(30);
    const [timerStartTime, setTimerStartTime] = useState<number>(Date.now());

    // Computed turn timer info
    const currentTimerInfo: TurnTimerInfo | null = useMemo(() => {
        if (!turnTimerEnabled) return null;
        return {
            startedAt: timerStartTime,
            duration: turnTimeLimit * 1000,
            serverTime: Date.now(),
        };
    }, [turnTimerEnabled, turnTimeLimit, timerStartTime]);

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

        // Add turn timer info if enabled
        if (turnTimerEnabled && currentTimerInfo) {
            (newGameData as SpadesData | DominoesData | LRCData).turnTimer =
                currentTimerInfo;
        }

        setGameData(newGameData);
        setPlayerData(isSpectator ? null : newPlayerData);
        setActionLog([]);
        setTimerStartTime(Date.now()); // Reset timer on regenerate
    }, [
        selectedGame,
        mockOptions,
        playerCount,
        isSpectator,
        turnTimerEnabled,
        currentTimerInfo,
    ]);

    // Initialize on mount and when game/options change
    useEffect(() => {
        generateData();
    }, [generateData]);

    // Update turn timer on game data when timer settings change
    useEffect(() => {
        if (!gameData) return;

        setGameData((prev) => {
            if (!prev) return prev;
            const updated = { ...prev } as SpadesData | DominoesData | LRCData;
            if (turnTimerEnabled) {
                updated.turnTimer = {
                    startedAt: timerStartTime,
                    duration: turnTimeLimit * 1000,
                    serverTime: Date.now(),
                };
            } else {
                updated.turnTimer = undefined;
            }
            return updated;
        });
    }, [turnTimerEnabled, turnTimeLimit, timerStartTime]);

    // Helper to advance to next player's turn
    const advanceToNextPlayer = useCallback(() => {
        setGameData((prev) => {
            if (!prev) return prev;
            const numPlayers = prev.playOrder?.length ?? 4;
            const currentIndex =
                (prev as SpadesData | DominoesData | LRCData)
                    .currentTurnIndex ?? 0;
            const nextIndex = (currentIndex + 1) % numPlayers;

            const updated = { ...prev } as SpadesData | DominoesData | LRCData;
            updated.currentTurnIndex = nextIndex;
            if (updated.type === "lrc") {
                (updated as LRCData).currentPlayerIndex = nextIndex;
            }
            return updated as GameData;
        });
    }, []);

    // Mock action dispatcher - applies game actions using proper reducers
    const dispatchOptimisticAction = useCallback(
        (actionType: string, actionPayload: unknown) => {
            const action: DebugAction = {
                type: actionType,
                payload: actionPayload,
                timestamp: Date.now(),
            };

            setActionLog((prev) => [...prev, action]);
            toast.info(`Action: ${actionType}`, {
                description: JSON.stringify(actionPayload).slice(0, 100),
                duration: 2000,
            });

            console.log("🎮 Debug action dispatched:", action);

            // Apply the action using proper game state reducers
            if (!gameData) return;

            const result = applyGameAction(
                selectedGame,
                gameData,
                playerData,
                actionType,
                actionPayload,
            );

            setGameData(result.gameData);
            if (result.playerData !== null) {
                setPlayerData(result.playerData);
            }
        },
        [gameData, playerData, selectedGame],
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
        setTurnTimerEnabled(false);
        setTurnTimeLimit(30);
        generateData();
        toast.success("Reset to defaults");
    }, [selectedGame, generateData]);

    // Handle current player change
    const handleCurrentPlayerChange = useCallback(
        (playerIndex: number) => {
            if (!gameData) return;

            setGameData((prev) => {
                if (!prev) return prev;
                const updated = { ...prev } as
                    | SpadesData
                    | DominoesData
                    | LRCData;
                updated.currentTurnIndex = playerIndex;
                if (updated.type === "lrc") {
                    (updated as LRCData).currentPlayerIndex = playerIndex;
                }
                return updated;
            });
            setTimerStartTime(Date.now()); // Reset timer on player change
            toast.info(`Changed turn to player ${playerIndex}`);
        },
        [gameData],
    );

    // Handle reset timer
    const handleResetTimer = useCallback(() => {
        setTimerStartTime(Date.now());
        toast.info("Timer reset");
    }, []);

    // Handle auto progress - perform the next logical action
    const handleAutoProgress = useCallback(() => {
        if (!gameData || !playerData || isSpectator) return;

        const phase = gameData.phase;
        const actions = getGameActions(selectedGame);
        const availableActions = actions.filter((a) =>
            a.phases.includes(phase as string),
        );

        if (availableActions.length === 0) {
            toast.warning("No actions available for current phase");
            return;
        }

        // Get current player info
        const typedGameData = gameData as SpadesData | DominoesData | LRCData;
        const currentPlayerId =
            gameData.playOrder?.[typedGameData.currentTurnIndex ?? 0] ||
            "player-0";

        // Execute the first available action
        const action = availableActions[0];
        const payload = action.getPayload(
            gameData,
            playerData,
            currentPlayerId,
        );

        dispatchOptimisticAction(action.actionType, payload);

        // Simulate progression by advancing turn
        setGameData((prev) => {
            if (!prev) return prev;
            const updated = { ...prev } as SpadesData | DominoesData | LRCData;
            const currentIdx = updated.currentTurnIndex ?? 0;
            const nextIdx = (currentIdx + 1) % (prev.playOrder?.length || 4);
            updated.currentTurnIndex = nextIdx;
            if (updated.type === "lrc") {
                (updated as LRCData).currentPlayerIndex = nextIdx;
            }
            return updated;
        });
        setTimerStartTime(Date.now()); // Reset timer after action
    }, [
        gameData,
        playerData,
        isSpectator,
        selectedGame,
        dispatchOptimisticAction,
    ]);

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
                // New props
                gameData={gameData}
                playerData={playerData}
                onAction={dispatchOptimisticAction}
                onAutoProgress={handleAutoProgress}
                turnTimerEnabled={turnTimerEnabled}
                onTurnTimerToggle={setTurnTimerEnabled}
                turnTimeLimit={turnTimeLimit}
                onTurnTimeLimitChange={setTurnTimeLimit}
                currentTimerInfo={currentTimerInfo}
                onResetTimer={handleResetTimer}
                onCurrentPlayerChange={handleCurrentPlayerChange}
            />

            {/* Game Component - uses the ACTUAL component */}
            <div>
                {GameComponent &&
                gameData &&
                gameData.type === selectedGame &&
                (playerData || isSpectator) ? (
                    <ErrorBoundary
                        onReset={generateData}
                        fallback={
                            <div className="flex flex-col items-center justify-center h-screen gap-4 text-zinc-400">
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
                    <div className="flex items-center justify-center h-screen text-zinc-400">
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
