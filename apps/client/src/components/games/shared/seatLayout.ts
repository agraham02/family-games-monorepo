import type { EdgePosition } from "./EdgeRegion";

/**
 * One seat at the table mapped to an edge position with optional stacking
 * information for layouts that put multiple players on the same edge.
 *
 * `cardRotation` overrides the default edge rotation so we can keep the same
 * 90°/-90° rotation across stacked side seats while still rendering them in
 * distinct slots.
 */
export interface SeatAssignment {
    /** Edge of the table this seat sits on. */
    edge: EdgePosition;
    /** 0-based index of this seat within the slots on its edge. */
    slotIndex: number;
    /** Total number of seats sharing this edge (1, 2, or 3). */
    slotCount: number;
    /** Final rotation in degrees applied to that seat's card hand. */
    cardRotation: number;
    /** True when this is the local hero player. */
    isHero: boolean;
}

export const MIN_SEAT_PLAYERS = 2;
export const MAX_SEAT_PLAYERS = 10;

/**
 * Edge slot counts (left, top, right) for each supported playerCount.
 * Bottom always holds exactly 1 seat (the hero).
 *
 * Layout (clockwise from bottom):
 *  - 2p:  L0 T1 R0   bottom, top
 *  - 3p:  L1 T0 R1   bottom, left, right
 *  - 4p:  L1 T1 R1   bottom, left, top, right
 *  - 5p:  L1 T2 R1   bottom, left, top×2, right
 *  - 6p:  L2 T1 R2   bottom, left×2, top, right×2
 *  - 7p:  L2 T2 R2   bottom, left×2, top×2, right×2
 *  - 8p:  L2 T3 R2   bottom, left×2, top×3, right×2
 *  - 9p:  L3 T2 R3   bottom, left×3, top×2, right×3
 *  - 10p: L3 T3 R3   bottom, left×3, top×3, right×3
 */
const EDGE_DISTRIBUTIONS: Record<
    number,
    { left: number; top: number; right: number }
> = {
    2: { left: 0, top: 1, right: 0 },
    3: { left: 1, top: 0, right: 1 },
    4: { left: 1, top: 1, right: 1 },
    5: { left: 1, top: 2, right: 1 },
    6: { left: 2, top: 1, right: 2 },
    7: { left: 2, top: 2, right: 2 },
    8: { left: 2, top: 3, right: 2 },
    9: { left: 3, top: 2, right: 3 },
    10: { left: 3, top: 3, right: 3 },
};

type SeatTemplate = Omit<SeatAssignment, "isHero">;

/**
 * Build the clockwise seat template for a given player count.
 *
 * Walk order from offset 0 (hero):
 *   bottom → left (slotIndex N-1 → 0, i.e. closest-to-hero first) →
 *   top (slotIndex 0 → N-1, left-to-right) →
 *   right (slotIndex 0 → N-1, top-to-bottom).
 *
 * Note: on the left edge `slotIndex 0` is the topmost seat (rendered first
 * top-to-bottom), so we walk `count-1 → 0` here so that offset 1 sits closest
 * to the hero (matches the existing 6p convention).
 */
function buildTemplate(playerCount: number): SeatTemplate[] {
    const dist = EDGE_DISTRIBUTIONS[playerCount];
    const slots: SeatTemplate[] = [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
    ];

    for (let i = dist.left - 1; i >= 0; i--) {
        slots.push({
            edge: "left",
            slotIndex: i,
            slotCount: dist.left,
            cardRotation: 90,
        });
    }

    for (let i = 0; i < dist.top; i++) {
        slots.push({
            edge: "top",
            slotIndex: i,
            slotCount: dist.top,
            cardRotation: 180,
        });
    }

    for (let i = 0; i < dist.right; i++) {
        slots.push({
            edge: "right",
            slotIndex: i,
            slotCount: dist.right,
            cardRotation: -90,
        });
    }

    return slots;
}

const SEAT_TEMPLATES: Record<number, SeatTemplate[]> = Object.fromEntries(
    Object.keys(EDGE_DISTRIBUTIONS).map((k) => [
        Number(k),
        buildTemplate(Number(k)),
    ]),
);

/**
 * Compute seat assignments for a table, ordered by player index.
 *
 * The result is `seats[i]` for `playOrder[i]`. The hero (local) player always
 * sits at the bottom; other players are placed clockwise from `hero+1`.
 */
export function getSeatAssignments(
    playerCount: number,
    heroIndex: number,
): SeatAssignment[] {
    if (playerCount < MIN_SEAT_PLAYERS || playerCount > MAX_SEAT_PLAYERS) {
        throw new Error(
            `getSeatAssignments: unsupported playerCount ${playerCount} (supported: ${MIN_SEAT_PLAYERS}-${MAX_SEAT_PLAYERS})`,
        );
    }
    const template = SEAT_TEMPLATES[playerCount];
    const seats: SeatAssignment[] = new Array(playerCount);
    for (let offset = 0; offset < playerCount; offset++) {
        const playerIdx = (heroIndex + offset) % playerCount;
        const slot = template[offset];
        seats[playerIdx] = { ...slot, isHero: offset === 0 };
    }
    return seats;
}

/**
 * Group seats by their edge while preserving slotIndex order. Convenient for
 * rendering one EdgeRegion per edge with its stacked seats in the right order.
 */
export function groupSeatsByEdge(
    seats: SeatAssignment[],
): Record<EdgePosition, SeatAssignment[]> {
    const out: Record<EdgePosition, SeatAssignment[]> = {
        top: [],
        bottom: [],
        left: [],
        right: [],
    };
    for (const seat of seats) out[seat.edge].push(seat);
    for (const edge of Object.keys(out) as EdgePosition[]) {
        out[edge].sort((a, b) => a.slotIndex - b.slotIndex);
    }
    return out;
}

/**
 * Per-edge slot counts for a given playerCount. Useful for grid sizing and
 * other layout decisions that need to know how crowded each edge is without
 * computing a full seat assignment.
 */
export function getEdgeSlotCounts(playerCount: number): {
    bottom: number;
    left: number;
    top: number;
    right: number;
} {
    if (playerCount < MIN_SEAT_PLAYERS || playerCount > MAX_SEAT_PLAYERS) {
        return { bottom: 0, left: 0, top: 0, right: 0 };
    }
    const dist = EDGE_DISTRIBUTIONS[playerCount];
    return { bottom: 1, left: dist.left, top: dist.top, right: dist.right };
}
