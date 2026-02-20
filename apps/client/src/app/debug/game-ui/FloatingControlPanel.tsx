"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripHorizontal, Maximize2, Minimize2 } from "lucide-react";

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
}: FloatingControlPanelProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [jsonInput, setJsonInput] = useState(gameStateJson);

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
                <Button variant="default" onClick={() => setIsMinimized(false)} className="shadow-lg">
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Open Debug Panel
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="fixed top-4 right-4 z-50 w-96 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/50">
                    <div className="flex items-center gap-2 drag-handle cursor-grab active:cursor-grabbing">
                        <GripHorizontal className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-sm font-bold">Debug Engine</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
                        <Minimize2 className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
                            <TabsTrigger value="general" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2">General</TabsTrigger>
                            <TabsTrigger value="state" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2">State</TabsTrigger>
                            <TabsTrigger value="network" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2">Network</TabsTrigger>
                            <TabsTrigger value="log" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-2">Log</TabsTrigger>
                        </TabsList>
                        
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <TabsContent value="general" className="mt-0 space-y-4">
                                <div className="space-y-2">
                                    <Label>Game</Label>
                                    <Select value={selectedGame} onValueChange={onSelectGame}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select game" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {games.map(g => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Scenario</Label>
                                    <Select value={selectedScenario} onValueChange={onSelectScenario}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select scenario" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {scenarios.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Perspective (Player View)</Label>
                                    <Select value={selectedPlayerId} onValueChange={onSelectPlayer}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <Label htmlFor="auto-play" className="flex flex-col space-y-1">
                                        <span>Auto-Play</span>
                                        <span className="font-normal text-xs text-muted-foreground">Automatically dispatch random valid actions</span>
                                    </Label>
                                    <Switch id="auto-play" checked={autoPlay} onCheckedChange={onAutoPlayChange} />
                                </div>
                            </TabsContent>

                            <TabsContent value="state" className="mt-0 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Master Game State (JSON)</Label>
                                        <Button size="sm" variant="secondary" onClick={handleApplyJson}>Apply</Button>
                                    </div>
                                    <textarea 
                                        className="w-full h-64 p-2 font-mono text-xs border rounded-md bg-muted/50"
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="network" className="mt-0 space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Simulated Latency</Label>
                                            <span className="text-xs text-muted-foreground">{latency}ms</span>
                                        </div>
                                        <Slider 
                                            value={[latency]} 
                                            onValueChange={(v) => onLatencyChange(v[0])} 
                                            max={2000} 
                                            step={50} 
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <Label htmlFor="sim-error" className="flex flex-col space-y-1">
                                            <span>Simulate Error</span>
                                            <span className="font-normal text-xs text-muted-foreground">Next action will fail</span>
                                        </Label>
                                        <Switch id="sim-error" checked={simulateError} onCheckedChange={onSimulateErrorChange} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="log" className="mt-0 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Action Log</Label>
                                    <Button size="sm" variant="ghost" onClick={onClearLog}>Clear</Button>
                                </div>
                                <div className="space-y-2">
                                    {actionLog.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">No actions intercepted yet.</p>
                                    ) : (
                                        actionLog.map((log, i) => (
                                            <div key={i} className="text-xs p-2 rounded bg-muted/50 border font-mono break-all">
                                                <div className="font-bold text-primary">{log.event}</div>
                                                <div className="text-muted-foreground mt-1">{JSON.stringify(log.payload)}</div>
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
