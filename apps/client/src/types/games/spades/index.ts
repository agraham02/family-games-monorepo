import { BaseGameData } from "..";

export interface PlayingCard {
    readonly rank: string;
    readonly suit: "Spades" | "Hearts" | "Diamonds" | "Clubs";
}

export interface SpadesSettings {
    allowNil: boolean;
    bagsPenalty: number;
    winTarget: number;
    blindNilEnabled: boolean;
    blindBidEnabled: boolean;
    jokersEnabled: boolean;
    deuceOfSpadesHigh: boolean;
    turnTimeLimit?: number; // seconds, 0 or undefined means no limit
}

export type SpadesData = BaseGameData & {
    hands: string[][];
    id: string;
    roomId: string;
    type: "spades";
    teams: {
        [teamId: string]: {
            players: string[];
            score: number;
            accumulatedBags: number;
        };
    };
    playOrder: string[];
    dealerIndex: number;
    currentTurnIndex: number;
    bids: Record<string, { amount: number; type: string; isBlind: boolean }>;
    spadesBroken: boolean;
    currentTrick: SpadesTrick | null;
    completedTricks: SpadesTrick[];
    phase:
        | "bidding"
        | "playing"
        | "trick-result"
        | "scoring"
        | "round-summary"
        | "finished";
    round: number;
    settings: SpadesSettings;
    history: string[];
    handsCounts: Record<string, number>;
    lastTrickWinnerId?: string;
    lastTrickWinningCard?: PlayingCard;

    roundTrickCounts: Record<string, number>;
    roundTeamScores: Record<number, number>; // scores for each team for the round.
    roundScoreBreakdown: Record<number, unknown>;
    teamEligibleForBlind: Record<number, boolean>; // which teams are eligible for blind bids
    turnStartedAt?: string; // ISO timestamp for turn timer
    // Add more spades fields
};

export type SpadesPlayerData = {
    localOrdering: string[];
    hand: PlayingCard[];
    // Add other player-specific data as needed
};

export type SpadesTrick = {
    plays: {
        playerId: string;
        card: PlayingCard;
    }[];
};
