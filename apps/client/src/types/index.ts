export type User = {
    id: string;
    name: string;
    isConnected?: boolean;
};

export type GameTypeMetadata = {
    type: string;
    displayName: string;
    maxPlayers: number;
    minPlayers: number;
    requiresTeams: boolean;
    numTeams?: number;
    playersPerTeam?: number;
    description?: string;
};

export interface CreateAndJoinRoomResponse {
    roomId: string;
    userId: string;
    roomCode: string;
}

export * from "./games";
export * from "./lobby";
