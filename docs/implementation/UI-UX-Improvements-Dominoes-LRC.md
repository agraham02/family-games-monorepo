# UI/UX Improvements for Dominoes & Left Right Center (LRC)

## Overview

This document outlines comprehensive UI/UX improvements for Dominoes and LRC games, focusing on layout, player visibility, interactions, animations, and responsive design for both laptop and mobile devices.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Dominoes UI/UX Improvements](#dominoes-uiux-improvements)
3. [LRC UI/UX Improvements](#lrc-uiux-improvements)
4. [Shared Improvements](#shared-improvements)
5. [Responsive Design Strategy](#responsive-design-strategy)
6. [Animation & Motion Guidelines](#animation--motion-guidelines)
7. [Accessibility Considerations](#accessibility-considerations)
8. [Implementation Priority](#implementation-priority)

---

## Design Principles

### Core UX Principles

1. **Clarity First**: Every game state should be immediately understandable
2. **Touch-Friendly**: All interactive elements ≥44px minimum touch target
3. **Progressive Disclosure**: Show essential info first, details on demand
4. **Consistent Feedback**: Every action gets visual + optional audio feedback
5. **Reduced Cognitive Load**: Minimize decisions required per action

### Visual Design Principles

1. **High Contrast**: Ensure 4.5:1 contrast ratio for all text
2. **Spatial Hierarchy**: Use size, color, and position to show importance
3. **Motion with Purpose**: Animate to guide attention, not distract
4. **Respect User Preferences**: Honor `prefers-reduced-motion`

---

## Dominoes UI/UX Improvements

### 1. Layout Enhancements

#### Current Issues

- Board takes up fixed height, limiting tile visibility
- Player hand at bottom can overlap with board on small screens
- No clear visual hierarchy between players

#### Proposed Layout

**Desktop (≥1024px)**

```
┌─────────────────────────────────────────────────┐
│  ┌─────────┐                     ┌─────────┐   │
│  │ Player 2│     Round: 1        │ Player 3│   │
│  │ 🎯 5 pts│                     │   7 pts │   │
│  │ █████   │                     │ ███████ │   │
│  └─────────┘                     └─────────┘   │
│                                                 │
│          ┌───────────────────────┐              │
│          │                       │              │
│          │    DOMINOES BOARD     │              │
│          │  (Scrollable Chain)   │              │
│          │                       │              │
│          └───────────────────────┘              │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │         YOUR HAND (7 tiles)            │    │
│  │  [🁢] [🁣] [🁤] [🁥] [🁦] [🁧] [🁨]       │    │
│  │         ↑ Tap to select                │    │
│  └────────────────────────────────────────┘    │
│           ┌─────────────────┐                   │
│           │  YOU: 12 pts 🎯 │                   │
│           └─────────────────┘                   │
└─────────────────────────────────────────────────┘
```

**Mobile Portrait (<500px)**

```
┌─────────────────────────────┐
│  P2: 5pts    R1    P3: 7pts │  <- Compact header
├─────────────────────────────┤
│                             │
│      BOARD (70% height)     │
│      Auto-scroll to ends    │
│                             │
├─────────────────────────────┤
│  ▸ YOUR HAND (30% height)   │
│  [🁢][🁣][🁤][🁥][🁦][🁧][🁨]  │
│  ─────────────────────────  │
│  You: 12pts          [Pass] │
└─────────────────────────────┘
```

#### Specific Improvements

##### A. Board Visualization

| Improvement           | Current          | Proposed                                                    |
| --------------------- | ---------------- | ----------------------------------------------------------- |
| **Board sizing**      | Fixed min-height | Dynamic: `max(35vh, 140px)` to `50vh`                       |
| **Tile scaling**      | Single size      | Responsive: `sm` on mobile, `md` on tablet, `lg` on desktop |
| **Scroll indicators** | Arrows only      | Arrows + gradient fade + scroll position indicator          |
| **Empty state**       | Plain text       | Animated placeholder with pulsing center dot                |
| **Double tiles**      | Subtle ring      | Perpendicular orientation + amber glow                      |

##### B. Tile Component Enhancements

```typescript
// Enhanced Tile sizing based on viewport
const TILE_SIZES = {
  xs: { width: 20, height: 40, pip: 3 },   // Opponent indicator
  sm: { width: 28, height: 56, pip: 4 },   // Mobile board
  md: { width: 40, height: 80, pip: 6 },   // Tablet/hand
  lg: { width: 56, height: 112, pip: 8 },  // Desktop
};

// Add isDouble visual treatment
- Doubles should render perpendicular (rotated 90°)
- Add subtle golden glow ring around doubles
- Animate doubles with gentle "breathing" scale effect
```

##### C. Player Hand Improvements

| Feature              | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| **Smart overflow**   | Fan tiles like real hand when >5 tiles on mobile                     |
| **Tile grouping**    | Optional: group by playable/unplayable                               |
| **Selection states** | Selected: lift + glow, Playable: subtle pulse, Unplayable: grayscale |
| **Quick actions**    | Long-press/right-click for tile info (pip counts)                    |
| **Gesture support**  | Swipe left/right to scroll, tap to select                            |

##### D. Placement Interaction Flow

**Current Flow:**

1. Tap tile → Select
2. Tap "Place Left" or "Place Right" button

**Improved Flow:**

1. Tap tile → Animate tile lifting
2. If only 1 valid side → Auto-place with animation
3. If 2 valid sides → Show ghost previews on BOTH ends simultaneously
4. Tap board end → Place with satisfying snap animation
5. Tap anywhere else → Cancel selection with return animation

**Ghost Preview Design:**

```
┌──────────────────────────────────────────────┐
│                                              │
│  [👻🁢]← Place                  Place →[👻🁢] │
│         ↓ Tap here to place     Tap here ↓   │
│  ════════════════════════════════════════   │
│  │ Board tiles │                             │
│  ════════════════════════════════════════   │
│                                              │
└──────────────────────────────────────────────┘

Ghost tile styles:
- 50% opacity
- Pulsing yellow/gold border
- Scale animation: 1.0 → 1.05 → 1.0 (1s loop)
- Label: "Tap to place" (mobile) or "Click to place" (desktop)
```

### 2. Player Info Display

#### Opponent Tiles Indicator

Instead of showing actual tiles for opponents (they're hidden), show:

```
┌────────────────────────────┐
│  Player Name              │
│  Score: 42 / 100          │
│  ████████░░░░░░ (7 tiles) │  <- Progress bar style
│  🎯 Current turn          │
└────────────────────────────┘
```

**Visual elements:**

- Avatar/initials circle with turn indicator ring
- Score as progress bar toward win target
- Tile count as horizontal bar (filled squares)
- Current turn: Pulsing amber ring around player card

### 3. Turn & Phase Indicators

| Phase             | Visual Indicator                             |
| ----------------- | -------------------------------------------- |
| **Your turn**     | Bottom bar glows amber + toast notification  |
| **Opponent turn** | Subtle highlight on opponent's panel         |
| **Must pass**     | Red "Pass" button pulses + toast explanation |
| **Round summary** | Modal with confetti for winner               |
| **Game over**     | Full-screen celebration + stats              |

### 4. Board End Value Display

Add floating badges showing current end values:

```
         [6]
    ═════════════════
    │ Board tiles   │
    ═════════════════
         [3]

Badges:
- Circular, semi-transparent background
- Large clear numbers
- Pulse when they change
```

### 5. Team Mode Enhancements (for 2v2)

When in team mode:

- Color-code teammates (e.g., Team 1 = Blue, Team 2 = Orange)
- Show team score prominently
- Partner sits across (visual line connecting teammates)
- Shared celebration animations when team scores

---

## LRC UI/UX Improvements

### 1. Layout Restructure

#### Current Layout Issues

- Circular layout can feel cramped on mobile
- Center content (pot + dice + buttons) competes for space
- Player chips are small and hard to count

#### Proposed Layout

**Desktop (≥768px): Circular Layout**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           ┌─────────┐                           │
│           │ Player 2│                           │
│           │ 🔴🔴🔴  │                           │
│           │ $1.50   │                           │
│           └─────────┘                           │
│                                                 │
│  ┌─────────┐             ┌─────────┐           │
│  │ Player 3│             │ Player 4│           │
│  │ 🔴      │             │ 🔴🔴    │           │
│  │ $0.50   │             │ $1.00   │           │
│  └─────────┘             └─────────┘           │
│                                                 │
│           ┌─────────────────────┐               │
│           │    CENTER POT       │               │
│           │   🔴🔴🔴🔴🔴 = $2.50│               │
│           │                     │               │
│           │   [🎲] [🎲] [🎲]   │               │
│           │                     │               │
│           │   [ ROLL DICE ]     │               │
│           └─────────────────────┘               │
│                                                 │
│           ┌─────────────────┐                   │
│           │ YOU (Player 1)  │                   │
│           │ 🔴🔴🔴           │                   │
│           │ $1.50           │                   │
│           └─────────────────┘                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Mobile Portrait: Stacked Layout**

```
┌─────────────────────────────┐
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐   │  <- Opponents row
│  │P2 │ │P3 │ │P4 │ │P5 │   │
│  │🔴2│ │🔴1│ │🔴0│ │🔴3│   │
│  └───┘ └───┘ └───┘ └───┘   │
├─────────────────────────────┤
│                             │
│        CENTER POT           │
│      🔴🔴🔴🔴🔴🔴🔴        │
│         $3.50               │
│                             │
│     [🎲C] [🎲L] [🎲R]       │
│                             │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │    YOUR CHIPS       │    │
│  │   🔴🔴🔴 = $1.50   │    │
│  │                     │    │
│  │  [ 🎲 ROLL DICE ]   │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### 2. Chip Stack Visualization

#### Enhanced Chip Component

**Visual Design:**

```
Chip Stack (3 chips):
    ╭──────╮
   ╭┤  $   ├╮
  ╭┤│  $   │├╮
  ││╰──────╯││
  │╰────────╯│
  ╰──────────╯

- 3D stacking effect with shadows
- Each chip slightly offset (2-4px up and right)
- Shine/highlight gradient on top chip
- Edge detailing (white/silver dashes)
```

**Size Variations:**

| Size | Chip Diameter | Max Stack Height | Use Case                    |
| ---- | ------------- | ---------------- | --------------------------- |
| `xs` | 24px          | 3 chips          | Opponent indicator (mobile) |
| `sm` | 32px          | 5 chips          | Opponent display            |
| `md` | 44px          | 6 chips          | Player's own chips          |
| `lg` | 60px          | 8 chips          | Center pot                  |

**Chip Count Badge:**

```
When chips > max visible:
  ╭──────╮
  │ 🔴12 │  <- Number badge overlay
  ╰──────╯
```

### 3. Dice Improvements

#### Current Issues

- Dice are static after reveal
- No anticipation during roll
- Face icons could be clearer

#### Enhanced Dice Design

**Roll Animation Sequence:**

1. **Anticipation** (0-200ms): Dice shake in place
2. **Roll** (200-800ms): 3D tumble animation with blur
3. **Bounce** (800-1000ms): Spring bounce on reveal
4. **Highlight** (1000-1500ms): Dice glow their action color

**Die Face Redesign:**

| Face           | Current       | Proposed                                  |
| -------------- | ------------- | ----------------------------------------- |
| **L (Left)**   | Arrow + "L"   | Large "←" arrow, blue background          |
| **R (Right)**  | Arrow + "R"   | Large "→" arrow, green background         |
| **C (Center)** | Target + "C"  | Circle/bullseye, red background           |
| **DOT**        | Filled circle | Three dots (like dice), purple background |
| **WILD**       | Sparkles      | Star burst, amber/gold background         |

**Face Colors (for colorblind accessibility):**

```
L: Blue (#3B82F6) + Left arrow icon
R: Green (#22C55E) + Right arrow icon
C: Red (#EF4444) + Bullseye icon
DOT: Purple (#A855F7) + Dots pattern
WILD: Amber (#F59E0B) + Star icon
```

### 4. Chip Movement Animations

#### Current State

- `ChipAnimationManager` exists but movements could be smoother

#### Enhanced Animation

**Movement Path:**

```
                    Arc trajectory
Player A  ●─────────╭─────────╮──────────●  Player B
          (from)    │    ↑    │          (to)
                    │    │    │
                    │    │    │
                    ╰────┴────╯

Animation: Bezier curve with slight arc
Duration: 500-800ms
Easing: ease-out (fast start, slow landing)
```

**Animation Details:**

1. **Departure**: Chip lifts from stack with small pop
2. **Travel**: Arc path following L/R/C direction
3. **Arrival**: Chip lands with subtle bounce
4. **Stack**: Chip settles into new stack position

**Sound Effects (optional):**

- Roll: Dice clatter sound
- L/R: Chip slide sound
- C: Chip drop into pot sound
- Win: Celebration sound

### 5. Turn Flow & Actions

#### Phase Indicators

| Phase                     | Visual State                            |
| ------------------------- | --------------------------------------- |
| **waiting-for-roll**      | Roll button pulsing, player highlighted |
| **showing-results**       | Dice glowing, movement preview arrows   |
| **passing-chips**         | Chip animations in progress             |
| **wild-target-selection** | Target selection modal overlay          |
| **last-chip-challenge**   | Dramatic banner + special roll button   |
| **round-over**            | Winner celebration modal                |

#### Roll Button States

```tsx
// Default (can roll)
<Button variant="primary" size="lg" pulse>
  🎲 Roll ({diceCount} {diceCount === 1 ? 'die' : 'dice'})
</Button>

// Rolling
<Button disabled>
  <Spinner /> Rolling...
</Button>

// Not your turn
<Button disabled variant="ghost">
  Waiting for {playerName}...
</Button>

// No chips (skipped)
<Button disabled variant="outline">
  No chips - Turn skipped
</Button>
```

### 6. Wild Target Selection

**Current**: Modal with list of players

**Improved Design:**

```
┌─────────────────────────────────────────────┐
│           🌟 WILD DIE! 🌟                   │
│                                             │
│  Choose who to steal a chip from:          │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Player 2   │  │  Player 3   │          │
│  │   🔴🔴🔴   │  │    🔴🔴    │          │
│  │  3 chips    │  │  2 chips    │          │
│  │   [$1.50]   │  │   [$1.00]   │          │
│  └─────────────┘  └─────────────┘          │
│  ⭐ Recommended                             │
│                                             │
│       Auto-selecting richest in 3s...      │
│       ━━━━━━━━━━━━━━━░░░░░░ [Cancel]       │
└─────────────────────────────────────────────┘

- Cards for each valid target
- Visual chip count comparison
- Auto-select countdown with progress bar
- "Recommended" badge on richest player
```

### 7. Last Chip Challenge

**Special UX for dramatic moment:**

1. **Banner Appearance**: Dramatic slide-in with sound
2. **Explanation**: Clear text: "Roll to keep your last chip!"
3. **Roll Button**: Extra large, dramatic styling
4. **Outcome Animation**:
    - **Success**: Confetti + chip stays
    - **Failure**: Chip dramatically moves to pot

---

## Shared Improvements

### 1. Turn Timer Component

Both games use `TurnTimer`. Enhancements:

| Feature      | Current           | Proposed                            |
| ------------ | ----------------- | ----------------------------------- |
| **Position** | Inside PlayerInfo | Encircles player avatar             |
| **Color**    | Green→Amber→Red   | Same, with smoother transitions     |
| **Low time** | Pulses            | Pulses + subtle audio tick          |
| **Expired**  | Just stops        | Brief flash + auto-action indicator |

### 2. Game Menu Consistency

Ensure both games have consistent menu with:

- Sound toggle
- Show hints toggle (Dominoes)
- Room code display
- Return to lobby option
- Fullscreen toggle (mobile)

### 3. Round/Game Summary Modals

**Unified Design:**

```
┌─────────────────────────────────────────────┐
│               🏆 ROUND COMPLETE 🏆           │
├─────────────────────────────────────────────┤
│                                             │
│           Winner: Player Name               │
│           Points earned: +42                │
│                                             │
├─────────────────────────────────────────────┤
│  Standings:                                 │
│  1. Player A .......... 142 pts ▲12        │
│  2. Player B .......... 130 pts ▲18        │
│  3. You ............... 98 pts  ▲42        │
│  4. Player D .......... 85 pts  ▲0         │
├─────────────────────────────────────────────┤
│                                             │
│      Next round starting in 8s...          │
│      ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░         │
│                                             │
│         [Continue Now]                      │
└─────────────────────────────────────────────┘
```

### 4. Connection Status

Both games should show:

- Player online/offline status (gray out disconnected)
- Reconnecting banner (shared `ReconnectingBanner` component)
- "Waiting for player..." overlay when someone disconnects

---

## Responsive Design Strategy

### Breakpoint System

```css
/* Mobile Portrait */
@media (max-width: 499px) {
    /* Compact layout */
}

/* Mobile Landscape / Small Tablet */
@media (min-width: 500px) and (max-width: 767px) {
    /* Comfortable */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
    /* Spacious */
}

/* Desktop */
@media (min-width: 1024px) {
    /* Full experience */
}
```

### Dominoes Responsive Behavior

| Viewport         | Board                    | Hand                          | Players           |
| ---------------- | ------------------------ | ----------------------------- | ----------------- |
| Mobile Portrait  | 50% height, small tiles  | Bottom 35%, horizontal scroll | Top compact bar   |
| Mobile Landscape | 60% width, medium tiles  | Right 40%, vertical stack     | Left/top compact  |
| Tablet           | Center 60%, medium tiles | Bottom, fan layout            | Edge regions      |
| Desktop          | Center, large tiles      | Bottom, spread fan            | Full edge regions |

### LRC Responsive Behavior

| Viewport         | Layout                             | Pot              | Players                                      |
| ---------------- | ---------------------------------- | ---------------- | -------------------------------------------- |
| Mobile Portrait  | Stacked (opponents → pot → you)    | Center medium    | Horizontal row (opponents), large card (you) |
| Mobile Landscape | 2-column (players left, pot right) | Right side large | Left column stacked                          |
| Tablet+          | Circular                           | Center large     | Around the circle                            |

### Touch Target Sizes

Minimum sizes (per Apple/Google guidelines):

| Element | Min Size | Recommended |
| ------- | -------- | ----------- |
| Buttons | 44×44px  | 48×48px     |
| Tiles   | 28×56px  | 40×80px     |
| Chips   | 32×32px  | 44×44px     |
| Dice    | 60×60px  | 80×80px     |

---

## Animation & Motion Guidelines

### Respect User Preferences

```tsx
// Hook for reduced motion preference
function usePrefersReducedMotion() {
    const [prefersReduced, setPrefersReduced] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReduced(query.matches);

        const handler = (e: MediaQueryListEvent) =>
            setPrefersReduced(e.matches);
        query.addEventListener("change", handler);
        return () => query.removeEventListener("change", handler);
    }, []);

    return prefersReduced;
}

// Usage in Framer Motion
const prefersReduced = usePrefersReducedMotion();

<motion.div
    animate={{ x: 100 }}
    transition={{
        duration: prefersReduced ? 0 : 0.3,
    }}
/>;
```

### Animation Timing Guidelines

| Animation Type                        | Duration    | Easing             |
| ------------------------------------- | ----------- | ------------------ |
| Micro-interactions (hover, focus)     | 100-200ms   | ease-out           |
| State transitions (selection, toggle) | 200-300ms   | ease-in-out        |
| Movement (chips, tiles)               | 400-600ms   | spring or ease-out |
| Modal enter/exit                      | 200-300ms   | ease-out / ease-in |
| Celebration effects                   | 1000-2000ms | custom bounce      |

### Specific Animations

**Dominoes:**

- Tile selection: Lift 8px with shadow increase
- Tile placement: Snap to position with slight overshoot
- Pass action: Float "Pass!" bubble above player
- Round end: Winner's tiles glow gold, radiate outward

**LRC:**

- Dice roll: Tumble → bounce → glow
- Chip transfer: Arc path with 3D rotation
- Player elimination: Grayscale fade + chip scatter
- Win celebration: Confetti + pot chips explode toward winner

---

## Accessibility Considerations

### Color & Contrast

| Element      | Foreground  | Background    | Ratio  |
| ------------ | ----------- | ------------- | ------ |
| Player names | White       | Dark felt     | ≥7:1   |
| Scores       | Amber/White | Dark          | ≥4.5:1 |
| Buttons      | White       | Primary color | ≥4.5:1 |
| Tile pips    | Near-black  | White tile    | ≥7:1   |

### Focus Management

```tsx
// Ensure focus is trapped in modals
<Dialog onOpenChange={setOpen}>
    <DialogContent>{/* Focus automatically trapped here */}</DialogContent>
</Dialog>;

// Return focus after modal closes
useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
    }
}, [isOpen]);
```

### Screen Reader Support

- All game actions should have aria-labels
- Live regions for turn changes and scores
- Meaningful alt text for visual-only elements

```tsx
// Example for LRC dice
<div role="img" aria-label={`Rolled ${dice.map(d => d.face).join(', ')}`}>
  {/* Visual dice display */}
</div>

// Turn announcements
<div role="status" aria-live="polite">
  {isMyTurn ? "Your turn to roll" : `Waiting for ${currentPlayer.name}`}
</div>
```

### Keyboard Navigation

| Action             | Key                                 |
| ------------------ | ----------------------------------- |
| Select tile/target | Enter or Space                      |
| Navigate tiles     | Arrow keys                          |
| Cancel selection   | Escape                              |
| Roll dice          | Enter (when focused on roll button) |
| Continue/Confirm   | Enter                               |

---

## Implementation Priority

### Phase 1: Critical UX Fixes (Week 1)

1. **Dominoes**
    - [ ] Responsive tile sizing
    - [ ] Board scroll improvements (gradient fades)
    - [ ] Smart tile placement (auto-place single option)
    - [ ] Pass button visibility

2. **LRC**
    - [ ] Mobile stacked layout
    - [ ] Improved chip stack visualization
    - [ ] Die face clarity (icons + colors)

### Phase 2: Enhanced Interactions (Week 2)

1. **Dominoes**
    - [ ] Ghost tile previews on both ends
    - [ ] Tile selection animation
    - [ ] Opponent tile count indicators

2. **LRC**
    - [ ] Enhanced dice roll animation
    - [ ] Smooth chip transfer animations
    - [ ] Wild target selection UI

### Phase 3: Polish & Delight (Week 3)

1. **Both Games**
    - [ ] Reduced motion support
    - [ ] Sound effects integration
    - [ ] Celebration animations
    - [ ] Keyboard navigation

2. **Dominoes**
    - [ ] Doubles perpendicular rendering
    - [ ] Board end value badges

3. **LRC**
    - [ ] Last Chip Challenge drama
    - [ ] Money value display polish

### Phase 4: Testing & Refinement (Week 4)

- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Device testing (iOS Safari, Android Chrome)
- [ ] Performance optimization (60fps animations)
- [ ] Accessibility audit

---

## Technical Implementation Notes

### Recommended Libraries/Patterns

| Feature          | Recommendation                |
| ---------------- | ----------------------------- |
| Animations       | Framer Motion (already using) |
| Gestures         | @use-gesture/react for swipes |
| Audio            | Howler.js or Web Audio API    |
| Confetti         | canvas-confetti               |
| Focus management | Focus Trap React              |

### Performance Considerations

1. **Memoize expensive calculations** (tile playability checks)
2. **Use `layoutId` for smooth Framer Motion transitions**
3. **Debounce resize handlers** for responsive updates
4. **Lazy load celebration assets** (confetti, sounds)
5. **Use CSS transforms over position changes** for 60fps

### File Structure for New Components

```
apps/client/src/components/games/
├── dominoes/
│   ├── ui/
│   │   ├── Board.tsx (enhanced)
│   │   ├── Tile.tsx (enhanced)
│   │   ├── TileHand.tsx (enhanced)
│   │   ├── GhostTilePreview.tsx (new)
│   │   ├── BoardEndBadge.tsx (new)
│   │   └── ...
│   └── hooks/
│       └── useTilePlacement.ts (new)
├── lrc/
│   ├── ui/
│   │   ├── Die.tsx (enhanced)
│   │   ├── ChipStack.tsx (enhanced)
│   │   ├── DiceTray.tsx (enhanced)
│   │   ├── ChipAnimation.tsx (new)
│   │   └── WildTargetSelector.tsx (enhanced)
│   └── hooks/
│       └── useChipAnimations.ts (new)
└── shared/
    ├── hooks/
    │   └── usePrefersReducedMotion.ts (new)
    └── ...
```

---

## Success Metrics

| Metric               | Target                          |
| -------------------- | ------------------------------- |
| Time to first action | < 2 seconds after load          |
| Animation frame rate | 60fps (no drops below 30)       |
| Touch accuracy       | < 5% mis-taps on mobile         |
| Accessibility score  | WCAG 2.1 AA compliant           |
| User satisfaction    | Positive feedback on smoothness |

---

_Last updated: January 27, 2026_
