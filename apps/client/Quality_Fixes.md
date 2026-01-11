# Quality Improvements & Future Enhancements

This document tracks optional quality improvements identified during PR code review that were deferred for future work.

---

## 1. "Processing..." Indicator Enhancement

**Location:** `src/app/(room)/game/[roomCode]/page.tsx` (lines ~325-333)

**Current Behavior:**

```tsx
{
    optimisticAction.hasPendingAction && (
        <div className="...">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Processing...
        </div>
    );
}
```

**Suggested Improvement:**
Show the specific action type being processed for better user feedback:

-   "Playing card..."
-   "Placing bid..."
-   "Passing turn..."

**Implementation Notes:**

-   Use `optimisticAction.pendingActionType` to determine the message
-   Create a mapping of action types to user-friendly messages
-   Consider adding estimated time or progress indication

**Priority:** Low | **Effort:** Small

---

## 2. Spectator Slot Claiming Flow

**Location:** `src/app/(room)/game/[roomCode]/page.tsx` - `handleClaimSlot` function

**Current Behavior:**
When a spectator claims a disconnected player's slot, they only see a generic toast: "Claiming player slot..."

**Suggested Improvement:**

-   Show which player's slot is being claimed
-   Add confirmation dialog before claiming
-   Show success/failure feedback with player name
-   Consider animation or visual transition when becoming an active player

**Implementation Notes:**

-   Enhance the `SpectatorBanner` component to show player names
-   Add a confirmation modal using `ConfirmDialog` component
-   Update socket event handlers to provide richer feedback

**Priority:** Low | **Effort:** Medium

---

## 3. Socket Event Type Safety

**Locations:**

-   `src/contexts/WebSocketContext.tsx`
-   `src/hooks/useRoomEvents.ts`
-   `src/app/(room)/game/[roomCode]/page.tsx`

**Current Behavior:**
Socket events use `any` types in many places, reducing type safety:

```typescript
socket.on("game_event", (payload: any) => { ... });
```

**Suggested Improvement:**
Create shared type definitions between client and server:

1. Create a `shared-types` package or folder
2. Define event payload interfaces for each event type
3. Use discriminated unions for event handling
4. Consider using `zod` for runtime validation

**Example:**

```typescript
// types/socket-events.ts
interface GameEventPayload {
    event: "sync" | "player_sync" | "game_paused" | ...;
    gameState: GameData;
    timestamp: string;
}

interface RoomEventPayload {
    event: "user_joined" | "user_left" | ...;
    // ...
}

// Usage
socket.on("game_event", (payload: GameEventPayload) => {
    switch (payload.event) {
        case "sync": // TypeScript now knows the shape
    }
});
```

**Priority:** Medium | **Effort:** Large (requires coordinating with API)

---

## 4. Data Fetching Library Integration

**Location:** `src/services/` directory

**Current Behavior:**
REST API calls are made with plain `fetch` wrapped in custom retry logic:

-   `src/services/lobby.ts`
-   `src/services/gameSettings.ts`
-   `src/lib/fetchWithRetry.ts`

**Suggested Improvement:**
Consider adopting React Query (TanStack Query) or SWR for:

-   Automatic caching and cache invalidation
-   Built-in retry logic with exponential backoff
-   Stale-while-revalidate patterns
-   Request deduplication
-   Optimistic updates with automatic rollback
-   DevTools for debugging

**Benefits:**

-   Reduced boilerplate code
-   Better loading/error states
-   Improved performance with intelligent caching
-   Automatic background refetching

**Implementation Notes:**

```typescript
// Example with React Query
const {
    data: gameSettings,
    isLoading,
    error,
} = useQuery({
    queryKey: ["gameSettings", roomId],
    queryFn: () => fetchGameSettings(roomId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
});
```

**Priority:** Medium | **Effort:** Large (significant refactor)

---

## Implementation Priority

| Item                  | Priority | Effort | Dependencies     |
| --------------------- | -------- | ------ | ---------------- |
| Processing Indicator  | Low      | Small  | None             |
| Spectator Flow        | Low      | Medium | None             |
| Socket Type Safety    | Medium   | Large  | API coordination |
| Data Fetching Library | Medium   | Large  | None             |

---

## Notes

These improvements were identified during the PR review for:

-   **Client PR:** [#9](https://github.com/agraham02/family-gr-client/pull/9)
-   **API PR:** [#9](https://github.com/agraham02/family-gr-api/pull/9)

All critical and important issues from the review have been addressed. These items represent optional enhancements to improve code quality, type safety, and user experience.
