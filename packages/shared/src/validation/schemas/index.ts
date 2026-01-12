// packages/shared/src/validation/schemas/index.ts
// Central export for all Zod schemas

import { z } from "zod";

// Re-export Zod types for convenience
export { z };
export type { ZodError, ZodIssue } from "zod";

// Re-export room schemas
export {
    PlayerNameSchema,
    type PlayerName,
    RoomNameSchema,
    type RoomName,
    RoomCodeSchema,
    type RoomCode,
    CreateRoomRequestSchema,
    type CreateRoomRequest,
    JoinRoomRequestSchema,
    type JoinRoomRequest,
} from "./room";

// Re-export settings schemas
export {
    RoomSettingsSchema,
    type RoomSettingsInput,
    BaseGameSettingsSchema,
    type BaseGameSettingsInput,
    SpadesSettingsSchema,
    type SpadesSettingsInput,
    PartialSpadesSettingsSchema,
    type PartialSpadesSettingsInput,
    DominoesGameModeSchema,
    DominoesSettingsSchema,
    type DominoesSettingsInput,
    PartialDominoesSettingsSchema,
    type PartialDominoesSettingsInput,
    LRCSettingsSchema,
    type LRCSettingsInput,
    PartialLRCSettingsSchema,
    type PartialLRCSettingsInput,
    GameSettingsZodSchema,
    type GameSettingsInput,
    PartialGameSettingsSchema,
    type PartialGameSettingsInput,
} from "./settings";

// Re-export teams schemas
export {
    TeamSchema,
    type Team,
    TeamsSchema,
    type Teams,
    TeamRequirementsSchema,
    type TeamRequirements,
    UpdateTeamsRequestSchema,
    type UpdateTeamsRequest,
    UserIdSchema,
    type UserId,
    UserIdsSchema,
    type UserIds,
} from "./teams";

// Re-export utility functions and types
export {
    formatZodError,
    getFirstZodError,
    safeParseWithErrors,
    parseOrThrow,
    type SafeParseResult,
    type Infer,
    type InferInput,
} from "./utils";
