"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import {
    Menu,
    Sun,
    Moon,
    Maximize,
    Minimize,
    LogOut,
    Users,
    Settings,
} from "lucide-react";
import {
    requestFullscreen,
    exitFullscreen,
    isCurrentlyFullscreen,
    isFullscreenSupported,
} from "./FullscreenPrompt";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GameMenuProps {
    /** Whether current user is the room leader */
    isLeader?: boolean;
    /** Room code for navigation */
    roomCode: string;
    /** Optional game-specific settings to render */
    children?: ReactNode;
    /** Optional class name for styling */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function getStoredTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return getSystemTheme();
}

// ─────────────────────────────────────────────────────────────────────────────
// GameMenu Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GameMenu - A collapsible menu for universal game controls.
 *
 * Features:
 * - Theme toggle (dark/light mode)
 * - Fullscreen toggle
 * - Leave game (individual player)
 * - End game for all (leader only)
 * - Game-specific settings slot via children
 *
 * Uses Sheet on mobile (left side) and DropdownMenu on desktop (top-left corner)
 */
export default function GameMenu({
    isLeader = false,
    roomCode,
    children,
    className,
}: GameMenuProps) {
    const router = useRouter();
    const { socket } = useWebSocket();
    const { roomId, userId, clearRoomSession } = useSession();

    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
    const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);

    // Initialize theme and fullscreen state
    useEffect(() => {
        setTheme(getStoredTheme());
        setIsFullscreen(isCurrentlyFullscreen());

        // Listen for fullscreen changes
        function handleFullscreenChange() {
            setIsFullscreen(isCurrentlyFullscreen());
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener(
            "webkitfullscreenchange",
            handleFullscreenChange
        );
        document.addEventListener(
            "mozfullscreenchange",
            handleFullscreenChange
        );
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "webkitfullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "mozfullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "MSFullscreenChange",
                handleFullscreenChange
            );
        };
    }, []);

    // Toggle theme
    const toggleTheme = useCallback(() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        localStorage.setItem("theme", next);
    }, [theme]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await requestFullscreen();
        }
    }, [isFullscreen]);

    // Leave game (individual player) - returns to lobby, game pauses for replacement
    const handleLeaveGame = useCallback(() => {
        if (socket && roomId && userId) {
            socket.emit("leave_game", { roomId, userId });
        }
        // Clear room session to force proper rejoin flow when returning
        clearRoomSession();
        // Navigate to lobby - player leaves game but can rejoin room
        router.push(`/lobby/${roomCode}`);
    }, [socket, roomId, userId, router, roomCode, clearRoomSession]);

    // End game for all (leader only) - returns everyone to lobby
    const handleEndGameForAll = useCallback(() => {
        if (socket && isLeader && roomId && userId) {
            socket.emit("abort_game", { roomId, userId });
        }
        setEndGameDialogOpen(false);
        // Navigation happens via game_aborted event handler in useRoomEvents
    }, [socket, isLeader, roomId, userId]);

    // Menu content (shared between mobile sheet and desktop dropdown)
    const menuItems = (
        <>
            {/* Theme Toggle */}
            <MenuItemButton
                icon={
                    theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )
                }
                label={theme === "dark" ? "Light Mode" : "Dark Mode"}
                onClick={toggleTheme}
            />

            {/* Fullscreen Toggle */}
            {isFullscreenSupported() && (
                <MenuItemButton
                    icon={
                        isFullscreen ? (
                            <Minimize className="h-4 w-4" />
                        ) : (
                            <Maximize className="h-4 w-4" />
                        )
                    }
                    label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    onClick={toggleFullscreen}
                />
            )}

            <Separator className="my-2" />

            {/* Game-specific settings */}
            {children && (
                <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Game Settings
                    </div>
                    {children}
                    <Separator className="my-2" />
                </>
            )}

            {/* End Game for All (leader only) */}
            {isLeader && (
                <MenuItemButton
                    icon={<Users className="h-4 w-4" />}
                    label="Return All to Lobby"
                    onClick={() => {
                        setSheetOpen(false);
                        setEndGameDialogOpen(true);
                    }}
                    variant="warning"
                />
            )}

            {/* Leave Game */}
            <MenuItemButton
                icon={<LogOut className="h-4 w-4" />}
                label="Leave Game"
                onClick={() => {
                    setSheetOpen(false);
                    setLeaveDialogOpen(true);
                }}
                variant="destructive"
            />
        </>
    );

    return (
        <>
            {/* Desktop: Dropdown Menu */}
            <div
                className={cn(
                    "fixed top-4 left-4 z-50 hidden md:block",
                    className
                )}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 bg-background/80 backdrop-blur-sm border-border/50 shadow-lg hover:bg-accent"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Game Menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Game Menu</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Theme Toggle */}
                        <DropdownMenuItem onClick={toggleTheme}>
                            {theme === "dark" ? (
                                <Sun className="mr-2 h-4 w-4" />
                            ) : (
                                <Moon className="mr-2 h-4 w-4" />
                            )}
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </DropdownMenuItem>

                        {/* Fullscreen Toggle */}
                        {isFullscreenSupported() && (
                            <DropdownMenuItem onClick={toggleFullscreen}>
                                {isFullscreen ? (
                                    <Minimize className="mr-2 h-4 w-4" />
                                ) : (
                                    <Maximize className="mr-2 h-4 w-4" />
                                )}
                                {isFullscreen
                                    ? "Exit Fullscreen"
                                    : "Fullscreen"}
                            </DropdownMenuItem>
                        )}

                        {/* Game-specific settings */}
                        {children && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Game Settings
                                </DropdownMenuLabel>
                                {children}
                            </>
                        )}

                        <DropdownMenuSeparator />

                        {/* End Game for All (leader only) */}
                        {isLeader && (
                            <DropdownMenuItem
                                onClick={() => setEndGameDialogOpen(true)}
                                className="text-amber-600 dark:text-amber-400 focus:text-amber-600 dark:focus:text-amber-400"
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Return All to Lobby
                            </DropdownMenuItem>
                        )}

                        {/* Leave Game */}
                        <DropdownMenuItem
                            onClick={() => setLeaveDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Leave Game
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Mobile: Sheet (left side) */}
            <div className={cn("fixed top-4 left-4 z-50 md:hidden", className)}>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 bg-background/80 backdrop-blur-sm border-border/50 shadow-lg"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Game Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 flex flex-col">
                        <SheetHeader className="flex-shrink-0">
                            <SheetTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Game Menu
                            </SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 flex flex-col gap-1 overflow-y-auto flex-1">
                            {menuItems}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Leave Game Confirmation Dialog */}
            <AlertDialog
                open={leaveDialogOpen}
                onOpenChange={setLeaveDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Game?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave the game? You&apos;ll
                            return to the lobby. The game will pause until
                            another player joins.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveGame}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Leave Game
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* End Game for All Confirmation Dialog */}
            <AlertDialog
                open={endGameDialogOpen}
                onOpenChange={setEndGameDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Return Everyone to Lobby?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will end the current game and return all
                            players to the lobby. You can start a new game from
                            there.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleEndGameForAll}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            Return to Lobby
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

interface MenuItemButtonProps {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "warning";
}

function MenuItemButton({
    icon,
    label,
    onClick,
    variant = "default",
}: MenuItemButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent",
                variant === "destructive" &&
                    "text-destructive hover:bg-destructive/10",
                variant === "warning" &&
                    "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Setting Toggle Component (for game-specific settings)
// ─────────────────────────────────────────────────────────────────────────────

interface GameSettingToggleProps {
    /** Storage key for localStorage persistence */
    storageKey: string;
    /** Label for the setting */
    label: string;
    /** Icon to display */
    icon?: ReactNode;
    /** Default value if not stored */
    defaultValue?: boolean;
    /** Callback when value changes */
    onChange?: (value: boolean) => void;
}

export function GameSettingToggle({
    storageKey,
    label,
    icon,
    defaultValue = false,
    onChange,
}: GameSettingToggleProps) {
    const [enabled, setEnabled] = useState(defaultValue);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
            setEnabled(stored === "true");
        }
    }, [storageKey]);

    const toggle = useCallback(() => {
        const next = !enabled;
        setEnabled(next);
        localStorage.setItem(storageKey, String(next));
        // Dispatch custom event for same-tab sync (storage events only fire cross-tab)
        window.dispatchEvent(
            new CustomEvent("game-setting-change", {
                detail: { key: storageKey, value: next },
            })
        );
        onChange?.(next);
    }, [storageKey, onChange, enabled]);

    return (
        <button
            onClick={toggle}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:bg-accent"
        >
            <div className="flex items-center gap-3">
                {icon}
                {label}
            </div>
            <div
                className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    enabled ? "bg-primary" : "bg-muted"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                />
            </div>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook to read game settings
// ─────────────────────────────────────────────────────────────────────────────

export function useGameSetting(
    storageKey: string,
    defaultValue = false
): boolean {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
            setValue(stored === "true");
        }

        // Listen for storage changes (cross-tab sync)
        function handleStorage(e: StorageEvent) {
            if (e.key === storageKey) {
                setValue(e.newValue === "true");
            }
        }

        // Listen for custom event (same-tab sync)
        function handleGameSettingChange(e: Event) {
            const detail = (e as CustomEvent<{ key: string; value: boolean }>)
                .detail;
            if (detail.key === storageKey) {
                setValue(detail.value);
            }
        }

        window.addEventListener("storage", handleStorage);
        window.addEventListener("game-setting-change", handleGameSettingChange);
        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(
                "game-setting-change",
                handleGameSettingChange
            );
        };
    }, [storageKey, defaultValue]);

    return value;
}
