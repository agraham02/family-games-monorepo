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
    /** Total number of seats sharing this edge (1, 2). */
    slotCount: number;
    /** Final rotation in degrees applied to that seat's card hand. */
    cardRotation: number;
    /** True when this is the local hero player. */
    isHero: boolean;
}

/**
 * Compute seat assignments for a table, ordered by player index.
 *
 * The result is `seats[i]` for `playOrder[i]`. The hero (local) player always
 * sits at the bottom; other players are placed clockwise from `hero+1`.
 *
 * Layouts (clockwise from bottom):
 *  - 2p: bottom, top
 *  - 3p: bottom, left, right
 *  - 4p: bottom, left, top, right
 *  - 5p: bottom, left, top-left, top-right, right
 *  - 6p: bottom, left-bottom, left-top, top, right-top, right-bottom
 */
export function getSeatAssignments(
    playerCount: number,
    heroIndex: number,
): SeatAssignment[] {
    if (playerCount < 2 || playerCount > 6) {
        throw new Error(
            `getSeatAssignments: unsupported playerCount ${playerCount}`,
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

type SeatTemplate = Omit<SeatAssignment, "isHero">;

/**
 * Templates indexed by clockwise offset from the hero (offset 0 = hero).
 * Each entry assigns the seat to an edge plus its stacking slot.
 */
const SEAT_TEMPLATES: Record<number, SeatTemplate[]> = {
    2: [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
        { edge: "top", slotIndex: 0, slotCount: 1, cardRotation: 180 },
    ],
    3: [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
        { edge: "left", slotIndex: 0, slotCount: 1, cardRotation: 90 },
        { edge: "right", slotIndex: 0, slotCount: 1, cardRotation: -90 },
    ],
    4: [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
        { edge: "left", slotIndex: 0, slotCount: 1, cardRotation: 90 },
        { edge: "top", slotIndex: 0, slotCount: 1, cardRotation: 180 },
        { edge: "right", slotIndex: 0, slotCount: 1, cardRotation: -90 },
    ],
    // 5p: hero, left, top-left, top-right, right.
    // Top edge stacks 2 seats; both keep 180° rotation.
    5: [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
        { edge: "left", slotIndex: 0, slotCount: 1, cardRotation: 90 },
        { edge: "top", slotIndex: 0, slotCount: 2, cardRotation: 180 },
        { edge: "top", slotIndex: 1, slotCount: 2, cardRotation: 180 },
        { edge: "right", slotIndex: 0, slotCount: 1, cardRotation: -90 },
    ],
    // 6p: hero, left-bottom, left-top, top, right-top, right-bottom.
    // Left and right edges each stack 2 seats; rotation stays uniform per side.
    6: [
        { edge: "bottom", slotIndex: 0, slotCount: 1, cardRotation: 0 },
        { edge: "left", slotIndex: 0, slotCount: 2, cardRotation: 90 },
        { edge: "left", slotIndex: 1, slotCount: 2, cardRotation: 90 },
        { edge: "top", slotIndex: 0, slotCount: 1, cardRotation: 180 },
        { edge: "right", slotIndex: 0, slotCount: 2, cardRotation: -90 },
        { edge: "right", slotIndex: 1, slotCount: 2, cardRotation: -90 },
    ],
};

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
