import { User } from "..";
import { DominoesData, DominoesPlayerData } from "./dominoes";
import { SpadesData, SpadesPlayerData } from "./spades";

export type BaseGameEvent = {
    event: string;
};

export type GameEventPayload =
    | (BaseGameEvent & { event: "sync"; gameState: GameData })
    | { event: "player_sync"; playerState: PlayerData }
    | { event: "player_left"; userName: string }
    | { event: "game_aborted"; reason: string }
    | { event: "game_paused"; reason: string; timeoutAt: string }
    | { event: "game_resumed" }
    | { event: "user_disconnected"; userName?: string; userId: string }
    | { event: "user_reconnected"; userName?: string; userId: string };

export type Players = Record<string, User>;

export type BaseGameData = {
    type: string;
    players: Players;
    leaderId: string;
    // Add other shared fields here if needed
};

export type BasePlayerData = {
    localOrdering: string[];
    // Add other shared fields here if needed
};

export type GameData = DominoesData | SpadesData;
export type PlayerData = SpadesPlayerData | DominoesPlayerData;

export * from "./dominoes";
export * from "./spades";
