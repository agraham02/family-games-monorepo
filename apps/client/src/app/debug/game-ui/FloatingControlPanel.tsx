"use client";

import React, { useState } from "react";
import { motion, useDragControls } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { SettingDefinition } from "@shared/types";

interface FloatingControlPanelProps {
    games: { id: string; name: string }[];
    selectedGame: string;
    onSelectGame: (gameId: string) => void;

    players: { id: string; name: string }[];
    selectedPlayerId: string;
    onSelectPlayer: (playerId: string) => void;

    scenarios: { id: string; name: string }[];
    selectedScenario: string;
    onSelectScenario: (scenarioId: string) => void;

    actionLog: Array<{ event: string; payload: unknown; time: string }>;
    onClearLog: () => void;

    gameStateJson: string;
    onUpdateGameState: (json: string) => void;

    latency: number;
    onLatencyChange: (val: number) => void;

    simulateError: boolean;
    onSimulateErrorChange: (val: boolean) => void;

    autoPlay: boolean;
    onAutoPlayChange: (val: boolean) => void;

    autoSwitchPerspective: boolean;
    onAutoSwitchPerspectiveChange: (val: boolean) => void;

    settingsSchema?: SettingDefinition[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentSettings?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateSetting?: (key: string, value: any) => void;
    onRegenerateGame?: () => void;
    playerCountConfig?: {
        min: number;
        max: number;
        value: number;
        onChange: (n: number) => void;
    };
    handSizeConfig?: {
        min: number;
        max: number;
        /** Slider increment. e.g. 2 for odd-only values. */
        step: number;
        value: number;
        onChange: (n: number) => void;
    };
}

export function FloatingControlPanel({
    games,
    selectedGame,
    onSelectGame,
    players,
    selectedPlayerId,
    onSelectPlayer,
    scenarios,
    selectedScenario,
    onSelectScenario,
    actionLog,
    onClearLog,
    gameStateJson,
    onUpdateGameState,
    latency,
    onLatencyChange,
    simulateError,
    onSimulateErrorChange,
    autoPlay,
    onAutoPlayChange,
    autoSwitchPerspective,
    onAutoSwitchPerspectiveChange,
    settingsSchema = [],
    currentSettings = {},
    onUpdateSetting,
    onRegenerateGame,
    playerCountConfig,
    handSizeConfig,
}: FloatingControlPanelProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [jsonInput, setJsonInput] = useState(gameStateJson);
    const dragControls = useDragControls();

    // Update local json input when external state changes, but only if we aren't actively editing
    // For simplicity, we'll just update it when the tab is opened or game changes.
    React.useEffect(() => {
        setJsonInput(gameStateJson);
    }, [gameStateJson]);

    const handleApplyJson = () => {
        try {
            onUpdateGameState(jsonInput);
        } catch (_e) {
            alert("Invalid JSON");
        }
    };

    if (isMinimized) {
        return (
            <motion.div
                drag
                dragMomentum={false}
                className="fixed bottom-4 right-4 z-50"
            >
                <Button
                    variant="default"
                    onClick={() => setIsMinimized(false)}
                    className="shadow-lg"
                >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Open Debug Panel
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className="fixed top-4 right-4 z-50 w-96 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/50">
                    <div
                        className="flex items-center gap-2 drag-handle cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => dragControls.start(e.nativeEvent)}
                    >
                        <GripHorizontal className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-sm font-bold">
                            Debug Engine
                        </CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsMinimized(true)}
                    >
                        <Minimize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
                            <TabsTrigger
                                value="general"
                                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2"
                            >
                                General
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2"
                            >
                                Settings
                            </TabsTrigger>
                            <TabsTrigger
                                value="state"
                                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2"
                            >
                                State
                            </TabsTrigger>
                            <TabsTrigger
                                value="network"
                                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2"
                            >
                                Network
                            </TabsTrigger>
                            <TabsTrigger
                                value="log"
                                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2"
                            >
                                Log
                            </TabsTrigger>
                        </TabsList>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <TabsContent
                                value="general"
                                className="mt-0 space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label>Game</Label>
                                    <Select
                                        value={selectedGame}
                                        onValueChange={onSelectGame}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select game" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {games.map((g) => (
                                                <SelectItem
                                                    key={g.id}
                                                    value={g.id}
                                                >
                                                    {g.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Scenario</Label>
                                    <Select
                                        value={selectedScenario}
                                        onValueChange={onSelectScenario}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select scenario" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {scenarios.map((s) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={s.id}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {playerCountConfig && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="debug-player-count">
                                                Players
                                            </Label>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {playerCountConfig.value}
                                            </span>
                                        </div>
                                        <Slider
                                            id="debug-player-count"
                                            min={playerCountConfig.min}
                                            max={playerCountConfig.max}
                                            step={1}
                                            value={[playerCountConfig.value]}
                                            onValueChange={(v) =>
                                                playerCountConfig.onChange(v[0])
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {playerCountConfig.min}–
                                            {playerCountConfig.max} players
                                            supported
                                        </p>
                                    </div>
                                )}

                                {handSizeConfig && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="debug-hand-size">
                                                Cards per player
                                            </Label>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {handSizeConfig.value}
                                            </span>
                                        </div>
                                        <Slider
                                            id="debug-hand-size"
                                            min={handSizeConfig.min}
                                            max={handSizeConfig.max}
                                            step={handSizeConfig.step}
                                            value={[handSizeConfig.value]}
                                            onValueChange={(v) =>
                                                handSizeConfig.onChange(v[0])
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {handSizeConfig.min}–
                                            {handSizeConfig.max} in steps of{" "}
                                            {handSizeConfig.step}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Perspective (Player View)</Label>
                                    <Select
                                        value={selectedPlayerId}
                                        onValueChange={onSelectPlayer}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map((p) => (
                                                <SelectItem
                                                    key={p.id}
                                                    value={p.id}
                                                >
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <Label
                                        htmlFor="auto-switch-perspective"
                                        className="flex flex-col space-y-1"
                                    >
                                        <span>Follow Turn</span>
                                        <span className="font-normal text-xs text-muted-foreground">
                                            Auto-switch perspective to current
                                            player&apos;s turn
                                        </span>
                                    </Label>
                                    <Switch
                                        id="auto-switch-perspective"
                                        checked={autoSwitchPerspective}
                                        onCheckedChange={
                                            onAutoSwitchPerspectiveChange
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <Label
                                        htmlFor="auto-play"
                                        className="flex flex-col space-y-1"
                                    >
                                        <span>Auto-Play</span>
                                        <span className="font-normal text-xs text-muted-foreground">
                                            Automatically dispatch random valid
                                            actions
                                        </span>
                                    </Label>
                                    <Switch
                                        id="auto-play"
                                        checked={autoPlay}
                                        onCheckedChange={onAutoPlayChange}
                                    />
                                </div>

                                {onRegenerateGame && (
                                    <div className="pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={onRegenerateGame}
                                        >
                                            Regenerate Game
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent
                                value="settings"
                                className="mt-0 space-y-4"
                            >
                                {settingsSchema.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        No settings schema available for this
                                        game.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {settingsSchema.map((def) => {
                                            const value =
                                                currentSettings[def.key] ??
                                                def.default;

                                            if (def.type === "boolean") {
                                                return (
                                                    <div
                                                        key={def.key}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <Label
                                                            htmlFor={`setting-${def.key}`}
                                                            className="flex flex-col space-y-1"
                                                        >
                                                            <span>
                                                                {def.label}
                                                            </span>
                                                            <span className="font-normal text-xs text-muted-foreground">
                                                                {
                                                                    def.description
                                                                }
                                                            </span>
                                                        </Label>
                                                        <Switch
                                                            id={`setting-${def.key}`}
                                                            checked={Boolean(
                                                                value,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                onUpdateSetting?.(
                                                                    def.key,
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (
                                                def.type === "number" ||
                                                def.type === "nullableNumber"
                                            ) {
                                                return (
                                                    <div
                                                        key={def.key}
                                                        className="space-y-2"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <Label
                                                                htmlFor={`setting-${def.key}`}
                                                            >
                                                                {def.label}
                                                            </Label>
                                                            <span className="text-xs text-muted-foreground">
                                                                {value === null
                                                                    ? "None"
                                                                    : `${value}${def.suffix ? ` ${def.suffix}` : ""}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Slider
                                                                id={`setting-${def.key}`}
                                                                value={[
                                                                    value ===
                                                                    null
                                                                        ? (def.min ??
                                                                          0)
                                                                        : Number(
                                                                              value,
                                                                          ),
                                                                ]}
                                                                onValueChange={(
                                                                    v,
                                                                ) =>
                                                                    onUpdateSetting?.(
                                                                        def.key,
                                                                        v[0],
                                                                    )
                                                                }
                                                                min={def.min}
                                                                max={def.max}
                                                                step={def.step}
                                                                disabled={
                                                                    value ===
                                                                    null
                                                                }
                                                                className="flex-1"
                                                            />
                                                            {def.type ===
                                                                "nullableNumber" && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        // When the schema default is null (i.e. the setting
                                                                        // ships disabled), enabling it must seed a real number,
                                                                        // otherwise the button toggles null \u2194 null.
                                                                        const enableValue =
                                                                            typeof def.default ===
                                                                            "number"
                                                                                ? def.default
                                                                                : (def.min ??
                                                                                  0);
                                                                        onUpdateSetting?.(
                                                                            def.key,
                                                                            value ===
                                                                                null
                                                                                ? enableValue
                                                                                : null,
                                                                        );
                                                                    }}
                                                                >
                                                                    {value ===
                                                                    null
                                                                        ? "Enable"
                                                                        : "Disable"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {def.description}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            if (
                                                def.type === "select" &&
                                                def.options
                                            ) {
                                                return (
                                                    <div
                                                        key={def.key}
                                                        className="space-y-2"
                                                    >
                                                        <Label
                                                            htmlFor={`setting-${def.key}`}
                                                        >
                                                            {def.label}
                                                        </Label>
                                                        <Select
                                                            value={String(
                                                                value,
                                                            )}
                                                            onValueChange={(
                                                                v,
                                                            ) =>
                                                                onUpdateSetting?.(
                                                                    def.key,
                                                                    v,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                id={`setting-${def.key}`}
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {def.options.map(
                                                                    (opt) => (
                                                                        <SelectItem
                                                                            key={
                                                                                opt.value
                                                                            }
                                                                            value={
                                                                                opt.value
                                                                            }
                                                                        >
                                                                            {
                                                                                opt.label
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            {def.description}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return null;
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent
                                value="state"
                                className="mt-0 space-y-4"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Master Game State (JSON)</Label>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleApplyJson}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                    <textarea
                                        className="w-full h-64 p-2 font-mono text-xs border rounded-md bg-muted/50"
                                        value={jsonInput}
                                        onChange={(e) =>
                                            setJsonInput(e.target.value)
                                        }
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="network"
                                className="mt-0 space-y-4"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Simulated Latency</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {latency}ms
                                            </span>
                                        </div>
                                        <Slider
                                            value={[latency]}
                                            onValueChange={(v) =>
                                                onLatencyChange(v[0])
                                            }
                                            max={2000}
                                            step={50}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <Label
                                            htmlFor="sim-error"
                                            className="flex flex-col space-y-1"
                                        >
                                            <span>Simulate Error</span>
                                            <span className="font-normal text-xs text-muted-foreground">
                                                Next action will fail
                                            </span>
                                        </Label>
                                        <Switch
                                            id="sim-error"
                                            checked={simulateError}
                                            onCheckedChange={
                                                onSimulateErrorChange
                                            }
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="log" className="mt-0 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Action Log</Label>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={onClearLog}
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {actionLog.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            No actions intercepted yet.
                                        </p>
                                    ) : (
                                        actionLog.map((log, i) => (
                                            <div
                                                key={i}
                                                className="text-xs p-2 rounded bg-muted/50 border font-mono break-all"
                                            >
                                                <div className="font-bold text-primary">
                                                    {log.event}
                                                </div>
                                                <div className="text-muted-foreground mt-1">
                                                    {JSON.stringify(
                                                        log.payload,
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </motion.div>
    );
}
