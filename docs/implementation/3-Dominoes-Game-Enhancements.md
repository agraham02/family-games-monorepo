# 3. Dominoes Game Enhancements

## Overview

This document provides precise implementation details for enhancing the Dominoes game with Partner (2v2) mode, improved tile placement UI, board layout visualization, and polished round/game summary screens.

## Implementation Status (Current Workspace)

The items below reflect what is now implemented in the current monorepo (apps/api, apps/client, packages/shared):

- Dominoes debug actions are normalized to production contract (`PLACE_TILE` with `side`), with backward compatibility for legacy debug payloads.
- Debug board state shape now matches renderer expectations, and debug play/autoplay correctly update `leftEnd`/`rightEnd`.
- Board layout metadata is server-authored and persisted in Dominoes board state as `board.layout`.
- Layout generation is seeded by game + round to keep per-session deterministic rendering while varying across sessions.
- Client Dominoes board rendering prefers authoritative `board.layout`, with fallback layout computation only when metadata is missing.
- Ghost-end previews were refined so orientation and placement previews match the selected side and end value.
- Layout algorithm duplication was removed by centralizing `computeDominoBoardLayout` in `packages/shared/src/utils/dominoLayout.ts` and consuming it from API/client/debug paths.

### Notes

- This section documents shipped behavior and should be considered the source of truth for current Dominoes board-rendering architecture.
- Remaining sections in this document include planned enhancements that may be partially implemented, superseded, or pending.

---

## Baseline Analysis (Historical Reference)

This section describes the pre-enhancement baseline and is kept for context only.

### Existing Implementation

**Game Configuration** (`src/games/dominoes/index.ts`):

```typescript
DOMINOES_METADATA = {
    requiresTeams: false, // Individual play only
    minPlayers: 4,
    maxPlayers: 4,
};
```

**Current Settings** (`DominoesSettings`):

- `winTarget: number` (default 100)
- `drawFromBoneyard: boolean` (default false - block style)

**Scoring System** (`src/games/dominoes/helpers/score.ts`):

- Winner gets sum of opponents' pip counts
- Blocked game: lowest pip count wins
- Tie (multiple lowest): no score, round is a tie
- Individual scoring only

**Board State** (`src/games/dominoes/helpers/board.ts`):

```typescript
interface BoardState {
    tiles: Tile[]; // Ordered list of placed tiles
    leftEnd: BoardEnd; // { value, tileId }
    rightEnd: BoardEnd; // { value, tileId }
}
```

**Current Limitations**:

1. No team play support
2. Simple linear board representation (no visual branching)
3. Tile placement UI requires specifying side explicitly
4. No tile selection animation or preview
5. Round summary lacks detail
6. No end-of-game summary

---

## Target Architecture

### 1. Game Mode Setting

**Status:** Planned

#### File: `src/models/Settings.ts`

**Updated DominoesSettings**:

| Property           | Type                     | Default        | Description              |
| ------------------ | ------------------------ | -------------- | ------------------------ |
| `winTarget`        | `number`                 | `100`          | Points to win            |
| `gameMode`         | `"individual" \| "team"` | `"individual"` | Play mode                |
| `drawFromBoneyard` | `boolean`                | `false`        | Allow drawing vs passing |
| `roundLimit`       | `number \| null`         | `null`         | Fixed number of rounds   |
| `turnTimeLimit`    | `number \| null`         | `null`         | Seconds per turn         |

### 2. Team Mode Support

**Status:** Planned

#### File: `src/games/dominoes/index.ts`

**Updated Metadata**:

```typescript
DOMINOES_METADATA = {
    type: "dominoes",
    displayName: "Dominoes",
    description: "...",
    requiresTeams: false, // Teams optional based on gameMode setting
    minPlayers: 4,
    maxPlayers: 4,
    // Dynamic team requirements based on settings
    getTeamRequirements: (settings: DominoesSettings) => {
        if (settings.gameMode === "team") {
            return { numTeams: 2, playersPerTeam: 2 };
        }
        return null; // No teams required
    },
};
```

**Updated DominoesState**:

| Property       | Type                                                   | Description                         |
| -------------- | ------------------------------------------------------ | ----------------------------------- |
| `gameMode`     | `"individual" \| "team"`                               | Copied from settings                |
| `teams`        | `Record<number, { players: string[]; score: number }>` | Team data (team mode only)          |
| `teamScores`   | `Record<number, number>`                               | Team scores (team mode)             |
| `playerScores` | `Record<string, number>`                               | Individual scores (individual mode) |

#### Seating Arrangement (Team Mode)

Partners sit across from each other:

```
       Player 1 (Team 0)
           ↑
Player 3 ←   → Player 2 (Team 1)
(Team 1)
           ↓
       Player 0 (Team 0)
```

**Play Order**: `[team0_player0, team1_player0, team0_player1, team1_player1]`

This ensures alternating team play while partners are opposite.

#### Init Function Update

```typescript
function init(
    room: Room,
    customSettings?: Partial<DominoesSettings>,
): DominoesState {
    const settings = { ...DEFAULT_SETTINGS, ...customSettings };

    if (settings.gameMode === "team") {
        // Validate teams are set up
        if (!room.teams || room.teams.length !== 2) {
            throw new Error("Team mode requires 2 teams of 2 players each");
        }

        // Create alternating play order: Team0P0, Team1P0, Team0P1, Team1P1
        const playOrder = [
            room.teams[0][0],
            room.teams[1][0],
            room.teams[0][1],
            room.teams[1][1],
        ];

        // Initialize team scores
        const teams = {
            0: { players: room.teams[0], score: 0 },
            1: { players: room.teams[1], score: 0 },
        };

        // ... rest of init
        return { ...state, teams, gameMode: "team", playOrder };
    }

    // Individual mode (existing logic)
    return { ...state, gameMode: "individual" };
}
```

### 3. Team Scoring Rules

**Status:** Planned

#### Caribbean Partner Dominoes Rules

**Win Condition** (team mode):

- Player goes out: their team wins the round
- Blocked game: team of player with lowest pip count wins
- Tie (opponents tie for lowest): round is a tie, no points

**Point Calculation** (team mode):

- Winner: sum of ALL opponents' pip counts (not partner's)
- Example: Team 0 wins. Team 0 gets (Team1_P0_pips + Team1_P1_pips)

#### File: `src/games/dominoes/helpers/score.ts`

**Updated calculateRoundScores Function**:

Parameters:

```typescript
function calculateRoundScores(
    hands: Record<string, Tile[]>,
    currentScores: Record<string, number> | Record<number, number>,
    winnerId: string | null,
    gameMode: "individual" | "team",
    teams?: Record<number, { players: string[] }>,
): RoundScoreResult;
```

Logic for team mode:

1. Calculate pip counts for all players
2. If clear winner (went out):
    - Find winner's team
    - Sum opponents' (other team's) pip counts
    - Add to winning team's score
3. If blocked:
    - Find player with lowest pip count
    - If from one team only: that team wins, gets opponent pips
    - If tied across teams: round is tie, no score change

**Updated RoundScoreResult**:

```typescript
interface RoundScoreResult {
    scores: Record<string, number> | Record<number, number>; // Individual or team scores
    pipCounts: Record<string, number>;
    roundWinner: string | null; // Player who won (individual) or null
    winningTeam: number | null; // Team that won (team mode) or null
    roundPoints: number; // Points scored this round
    isTie: boolean;
}
```

### 4. Enhanced Board Visualization

**Status:** Partial (core board layout metadata and rendering path delivered)

#### Current Issue

The board is stored as a linear array of tiles with left/right ends. The UI renders this as a simple horizontal line, which doesn't handle the visual complexity of a real domino layout.

#### Board Layout Algorithm

**Goal**: Render the domino chain with proper visual layout including:

- Doubles displayed perpendicular to the line
- Chain bends when approaching edge of container
- Tiles visually connect at matching pips

**Approach**: Transform linear tile array into positioned layout objects.

#### File: `src/components/games/dominoes/ui/Board.tsx`

**Enhanced BoardTile Interface**:

```typescript
interface PositionedTile {
    tile: Tile;
    x: number; // Position in layout grid
    y: number;
    rotation: number; // 0, 90, 180, 270 degrees
    isDouble: boolean;
    connectingSide: "left" | "right" | null; // Which side connects to previous
}
```

**Layout Algorithm**:

```
Constants:
- TILE_WIDTH = 60px (horizontal tile)
- TILE_HEIGHT = 30px
- DOUBLE_WIDTH = 30px (perpendicular double)
- DOUBLE_HEIGHT = 60px
- CONTAINER_PADDING = 20px

Algorithm generateBoardLayout(tiles: Tile[], containerWidth: number):
    1. Start from center of container
    2. For each tile in order:
       a. Determine if double (left === right)
       b. Calculate rotation based on chain direction
       c. Check if next position exceeds container bounds
       d. If exceeded, bend the chain (change direction)
       e. Add to positioned tiles array
    3. Return array of PositionedTile
```

**Direction Bending Logic**:

```
Directions: RIGHT → DOWN → LEFT → UP → RIGHT (snake pattern)

When tile would exceed bounds:
1. Place a "corner" tile rotated 90°
2. Change direction to next in sequence
3. Continue placing tiles in new direction
```

**Simplified Approach** (recommended for v1):

Since the board is typically short (28 tiles max, usually fewer played), use a simpler approach:

1. Always render horizontally with overflow scroll
2. Doubles rendered perpendicular
3. Smooth horizontal scroll to track play

#### File: `src/components/games/dominoes/ui/Tile.tsx`

**Enhanced Tile Component**:

Props:

```typescript
interface TileProps {
    tile: Tile;
    isDouble: boolean;
    isHighlighted: boolean; // Valid move highlight
    isPlayable: boolean; // Can be played
    isSelected: boolean; // Currently selected
    onClick?: () => void;
    orientation: "horizontal" | "vertical";
    size: "small" | "medium" | "large";
}
```

Visual Elements:

- Pip dots rendered as circles in standard domino pattern
- Dividing line between left/right halves
- Glow effect when highlighted/selected
- Subtle shadow for depth

### 5. Tile Placement Interaction

**Status:** Partial (smart side selection and ghost-end previews delivered)

#### Current Flow

1. Player taps tile in hand → tile selected
2. Player must specify "left" or "right" side
3. Tile placed on selected side

#### Enhanced Flow

**Smart Placement**:

1. Player taps tile in hand → tile selected
2. System checks valid placements:
    - If tile can only be placed on ONE side → auto-place
    - If tile can be placed on BOTH sides → show placement preview on both ends
3. Player taps desired end on board → tile placed

**Placement Preview**:

- Ghost tile appears at each valid end
- Ghost has reduced opacity (0.5)
- Ghost pulses gently to indicate interactivity
- Tapping ghost confirms placement

#### File: `src/components/games/dominoes/ui/DominoesGameTable.tsx`

**State Additions**:

```typescript
const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
const [validPlacements, setValidPlacements] = useState<{
    left: boolean;
    right: boolean;
}>({ left: false, right: false });
```

**Placement Logic**:

```typescript
function handleTileSelect(tile: Tile) {
    const canPlaceLeft = canPlaceTile(tile, board, "left");
    const canPlaceRight = canPlaceTile(tile, board, "right");

    if (canPlaceLeft && !canPlaceRight) {
        // Auto-place on left
        onPlaceTile(tile, "left");
        setSelectedTile(null);
    } else if (canPlaceRight && !canPlaceLeft) {
        // Auto-place on right
        onPlaceTile(tile, "right");
        setSelectedTile(null);
    } else if (canPlaceLeft && canPlaceRight) {
        // Show both options
        setSelectedTile(tile);
        setValidPlacements({ left: true, right: true });
    }
    // If neither, tile is not playable (shouldn't happen with proper hint system)
}

function handleBoardEndClick(side: "left" | "right") {
    if (selectedTile && validPlacements[side]) {
        onPlaceTile(selectedTile, side);
        setSelectedTile(null);
        setValidPlacements({ left: false, right: false });
    }
}
```

### 6. Tile Hand Display

**Status:** Planned

#### File: `src/components/games/dominoes/ui/TileHand.tsx`

**Current Implementation**: Horizontal row of tiles

**Enhancements**:

1. **Responsive Layout**:
    - Desktop: Single row, horizontal scroll if needed
    - Mobile: Two rows if hand is large

2. **Valid Move Highlighting**:
    - When `showHints` enabled, playable tiles have green glow
    - Unplayable tiles are slightly dimmed

3. **Tile Sorting**:
    - Sort by pip total (lowest first)
    - Group doubles together
    - Option to sort by left pip value

4. **Selection Animation**:
    - Selected tile lifts up with scale transform
    - Subtle bounce animation

**Props Update**:

```typescript
interface TileHandProps {
    tiles: Tile[];
    onTileSelect: (tile: Tile) => void;
    selectedTile: Tile | null;
    showHints: boolean;
    playableTiles: Set<string>; // Set of tile IDs that can be played
    disabled: boolean;
}
```

### 7. Round Summary Modal

**Status:** Planned

#### File: `src/components/games/dominoes/ui/RoundSummaryModal.tsx`

**Current Display**:

- Basic winner announcement
- Player scores

**Enhanced Display**:

```
┌─────────────────────────────────────────────┐
│         🎯 Round 3 Complete                 │
├─────────────────────────────────────────────┤
│                                             │
│  Winner: PlayerName (went out!)             │
│  OR                                         │
│  Winner: PlayerName (lowest: 5 pips)        │
│  OR                                         │
│  Round Tied! (PlayerA and PlayerB: 8 pips)  │
│                                             │
├─────────────────────────────────────────────┤
│  Remaining Tiles                            │
│  ┌──────────────┬──────────────────────┐    │
│  │ PlayerName   │ [3|4] [2|2] = 11 pips│    │
│  │ PlayerName   │ [5|6] [1|1] = 13 pips│    │
│  │ PlayerName   │ (went out!)          │    │
│  │ PlayerName   │ [0|3] = 3 pips       │    │
│  └──────────────┴──────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  Points Scored: +27                         │
│                                             │
│  ── Scores ──────────────────────────────   │
│  PlayerName: 45 (+27)                       │
│  PlayerName: 32                             │
│  PlayerName: 28                             │
│  PlayerName: 15                             │
│                                             │
│  Target: 100 points                         │
│                                             │
├─────────────────────────────────────────────┤
│           [Continue to Next Round]          │
│           (Auto-continue in 10s)            │
└─────────────────────────────────────────────┘
```

**Team Mode Variant**:

```
│  ── Team Scores ─────────────────────────   │
│  Team 1 (Player1 & Player3): 72 (+27)       │
│  Team 2 (Player2 & Player4): 45             │
```

**Visual Tile Display**:

- Show actual tile graphics for remaining tiles
- Small size, inline with player name

### 8. Game Summary Modal

**Status:** Planned

#### File: `src/components/games/dominoes/ui/GameSummaryModal.tsx` (NEW)

**Trigger**: `phase === "finished"`

**Display Sections**:

```
┌─────────────────────────────────────────────┐
│         🏆 Game Over!                       │
├─────────────────────────────────────────────┤
│                                             │
│  🥇 WINNER: PlayerName                      │
│     Final Score: 108 points                 │
│                                             │
│  ── Final Standings ─────────────────────   │
│  1. PlayerName: 108 pts 🏆                  │
│  2. PlayerName: 89 pts                      │
│  3. PlayerName: 67 pts                      │
│  4. PlayerName: 45 pts                      │
│                                             │
├─────────────────────────────────────────────┤
│  ── Game Statistics ─────────────────────   │
│  Rounds Played: 7                           │
│  Tied Rounds: 1                             │
│  Biggest Win: PlayerName (+42 in Round 4)   │
│                                             │
├─────────────────────────────────────────────┤
│  [Return to Lobby]    [Play Again]          │
└─────────────────────────────────────────────┘
```

**Team Mode Variant**:

```
│  🥇 WINNERS: Team 1                         │
│     (Player1 & Player3)                     │
│     Final Score: 108 points                 │
```

### 9. Animation System

**Status:** Planned

#### Tile Play Animation

**Flow**:

1. Player confirms tile placement
2. Tile animates from hand to board position
3. Board scrolls to show new tile
4. Next player's turn indicator activates

**Implementation** (Framer Motion):

```typescript
// In DominoesGameTable.tsx
const [animatingTile, setAnimatingTile] = useState<{
    tile: Tile;
    from: { x: number; y: number };
    to: { x: number; y: number };
} | null>(null);

// When tile is placed optimistically:
function handlePlaceTileWithAnimation(tile: Tile, side: "left" | "right") {
    const fromRect = handTileRef.current.getBoundingClientRect();
    const toRect = boardEndRef.current.getBoundingClientRect();

    setAnimatingTile({
        tile,
        from: { x: fromRect.x, y: fromRect.y },
        to: { x: toRect.x, y: toRect.y },
    });

    // Call actual placement
    onPlaceTile(tile, side);

    // Clear animation after completion
    setTimeout(() => setAnimatingTile(null), 300);
}
```

#### Pass Animation

When player passes:

1. Show "Pass" text bubble above player
2. Bubble fades after 1.5 seconds
3. Turn indicator moves to next player

### 10. Real-Time Tile Selection

**Status:** Planned (simplified random deal model remains preferred)

#### Current Issue

Current implementation deals tiles instantly. The TODO mentions "Players draw/choose tiles from shuffled set shown in real time with websockets, avoiding race conditions."

#### Simplified Approach (Recommended)

For Caribbean-style dominoes, tiles are dealt face-down and players simply receive them. The "real-time" aspect refers to:

1. All players see the deal happening simultaneously
2. Deal animation plays for all players
3. No tile "choosing" - pure random deal

**Implementation**:

1. Server shuffles and assigns tiles
2. Server emits `tiles_dealt` event to all players
3. Client shows deal animation (tiles flying to each player)
4. After animation, each player sees their own tiles

This avoids the complexity of synchronized tile selection.

#### If Interactive Selection is Desired (Future Enhancement)

More complex approach:

1. Server places shuffled tiles in "pool"
2. Players take turns selecting one tile at a time
3. Server broadcasts each selection in real-time
4. Locking mechanism prevents race conditions

---

## Delivery Status

### Delivered (in this branch)

1. Debug play/autoplay contract parity with production Dominoes action shape.
2. Debug board state normalization so placed tile chains render correctly.
3. Server-authored Dominoes board layout metadata in game state.
4. Seeded layout generation based on game/round identity for deterministic session rendering.
5. Client board rendering updated to prefer authoritative `board.layout`.
6. Ghost-end previews updated to reflect actual selected side/end orientation.
7. Layout algorithm centralized in shared utility and consumed by API/client/debug.

### Remaining Roadmap

#### Phase 1: Team Mode Backend

- [ ] Update DominoesSettings with gameMode
- [ ] Update init() for team play order
- [ ] Update scoring for team mode
- [ ] Update metadata for dynamic team requirements

#### Phase 2: Team Mode Frontend

- [ ] Update client types
- [ ] Update GameSettingsCard with mode toggle
- [ ] Update RoundSummaryModal for teams
- [ ] Update score displays

#### Phase 3: Remaining Board & Interaction Polish

- [ ] Valid move highlighting in hand/board UI
- [ ] Tile selection animations and pass feedback polish
- [ ] Additional responsive refinements for long chains/hands

#### Phase 4: Summary Screens

- [ ] Enhanced RoundSummaryModal details and visuals
- [ ] Create GameSummaryModal
- [ ] Add tile graphics to summary views

#### Phase 5: Animation & UX Polish

- [ ] Tile play animations (hand to board)
- [ ] Pass animations
- [ ] Turn indicator improvements

---

## File Change Summary

### Implemented in Current Workspace

| Area   | File                                                                 | Action | Notes                                                       |
| ------ | -------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| API    | `apps/api/src/games/dominoes/index.ts`                               | MODIFY | Seeded board layout generation wired into state lifecycle   |
| API    | `apps/api/src/games/dominoes/helpers/board.ts`                       | MODIFY | Uses shared layout utility for authoritative `board.layout` |
| Shared | `packages/shared/src/types/games/dominoes.ts`                        | MODIFY | Adds board layout metadata types                            |
| Shared | `packages/shared/src/utils/dominoLayout.ts`                          | ADD    | Canonical Dominoes layout computation                       |
| Shared | `packages/shared/src/utils/index.ts`                                 | MODIFY | Exports shared layout utility                               |
| Client | `apps/client/src/components/games/dominoes/ui/Board.tsx`             | MODIFY | Prefers server layout + improved ghost-end preview behavior |
| Client | `apps/client/src/components/games/dominoes/ui/DominoesGameTable.tsx` | MODIFY | Removes stale board plumbing and aligns placement flow      |
| Client | `apps/client/src/hooks/useDominoLayout.ts`                           | MODIFY | Wraps shared layout utility as fallback path                |
| Debug  | `apps/client/src/app/debug/game-ui/DebugEngine.tsx`                  | MODIFY | Action/state parity and board layout hydration              |

### Planned / Not Yet Implemented

| Area   | File                                                                 | Planned Work                                |
| ------ | -------------------------------------------------------------------- | ------------------------------------------- |
| API    | `apps/api/src/games/dominoes/helpers/score.ts`                       | Team scoring logic and output model updates |
| API    | `apps/api/src/games/dominoes/index.ts`                               | Team mode init/play-order support           |
| Shared | `packages/shared/src/types`                                          | Team-mode settings/state contracts          |
| Client | `apps/client/src/components/lobby/GameSettingsCard.tsx`              | Team mode toggle and setting wiring         |
| Client | `apps/client/src/components/games/dominoes/ui/TileHand.tsx`          | Hinting/sorting/selection polish            |
| Client | `apps/client/src/components/games/dominoes/ui/RoundSummaryModal.tsx` | Rich round summary UX                       |
| Client | `apps/client/src/components/games/dominoes/ui/GameSummaryModal.tsx`  | End-of-game summary modal                   |

---

## Edge Cases

### Team Mode

1. **Partner communication (Caribbean style)**
    - In traditional partner dominoes, partners can use gestures
    - For digital: no special communication allowed
    - Players must infer partner's holdings from plays

2. **Blocked game scoring**
    - Find lowest pip count player
    - That player's TEAM wins
    - Team gets sum of opponent team's pips

3. **Tie in blocked game (team mode)**
    - If players from DIFFERENT teams tie for lowest → round tie
    - If players from SAME team tie for lowest → that team still wins

### Tile Placement

1. **First tile placement**
    - Any tile can be placed
    - Traditionally, double-six holder starts
    - No side selection needed for first tile

2. **Double placement**
    - Doubles can be placed on matching end
    - Rendered perpendicular to chain
    - Still only creates one new open end (same number on both ends of double)

3. **Board full**
    - Very rare but possible
    - Handle gracefully (auto-pass if no moves possible)

### Scoring

1. **Score exactly at target**
    - Player reaches exactly 100 → wins
    - If multiple reach 100+ same round → highest wins
    - Tie at exactly same score → play additional round

2. **Round limit reached**
    - Highest score wins
    - Tie → game is a tie (no additional rounds)

### Real-Time Synchronization

1. **Late joiner during deal animation**
    - Player receives their tiles immediately
    - Animation skipped or played quickly

2. **Disconnect during tile play**
    - Turn timer expires → auto-pass
    - Or game pauses per existing reconnection logic
