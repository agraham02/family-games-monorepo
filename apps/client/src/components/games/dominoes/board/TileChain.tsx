"use client";

import { useEffect, useState } from "react";
import { Group } from "react-konva";
import DominoTile from "./DominoTile";
import type { ChainSegment, PipValue } from "../engine/types";
import {
    gridToPixel,
    tileRotationDegrees,
    boardCenter,
} from "../engine/layout";
import { GRID_CELL_SIZE } from "../engine/types";
import { useDominoesStore } from "../store";
import { usePrefersReducedMotion } from "@/hooks";

function AnimatedChainTile({
    seg,
    cx,
    cy,
    rotation,
    displayPip1,
    displayPip2,
    isNew,
    reducedMotion,
}: {
    seg: ChainSegment;
    cx: number;
    cy: number;
    rotation: number;
    displayPip1: PipValue;
    displayPip2: PipValue;
    isNew: boolean;
    reducedMotion: boolean;
}) {
    const flyingTile = useDominoesStore((s) => s.flyingTile);
    const [animScale, setAnimScale] = useState(isNew ? 0 : 1);
    const [animOpacity, setAnimOpacity] = useState(isNew ? 0 : 1);
    const clearLastPlaced = useDominoesStore((s) => s.clearLastPlaced);

    const shouldAnimate = isNew && !flyingTile;

    useEffect(() => {
        if (!shouldAnimate) return;

        if (reducedMotion) {
            setAnimScale(1);
            setAnimOpacity(1);
            clearLastPlaced();
            return;
        }

        let cancelled = false;
        const duration = 300;
        const start = performance.now();

        const tick = (now: number) => {
            if (cancelled) return;
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);

            const s = 1.70158;
            const t2 = t - 1;
            const eased = t2 * t2 * ((s + 1) * t2 + s) + 1;

            setAnimScale(eased);
            setAnimOpacity(Math.min(t * 3, 1));

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                setAnimScale(1);
                setAnimOpacity(1);
                clearLastPlaced();
            }
        };

        requestAnimationFrame(tick);

        return () => {
            cancelled = true;
        };
    }, [shouldAnimate, clearLastPlaced, reducedMotion]);

    return (
        <DominoTile
            pip1={displayPip1}
            pip2={displayPip2}
            isDouble={seg.domino.isDouble}
            x={cx}
            y={cy}
            rotation={rotation}
            scale={animScale}
            opacity={animOpacity}
        />
    );
}

interface TileChainProps {
    segments: ChainSegment[];
}

export default function TileChain({ segments }: TileChainProps) {
    const lastPlacedTileId = useDominoesStore((s) => s.lastPlacedTileId);
    const reducedMotion = usePrefersReducedMotion();

    const center = boardCenter();
    const centerIdx = segments.findIndex(
        (s) => s.gridPos.row === center.row && s.gridPos.col === center.col,
    );
    const renderOrder =
        centerIdx > 0
            ? [
                  ...segments.slice(0, centerIdx).reverse(),
                  ...segments.slice(centerIdx),
              ]
            : segments;

    return (
        <Group>
            {renderOrder.map((seg) => {
                const pixel = gridToPixel(seg.gridPos);
                const rotation = tileRotationDegrees(
                    seg.direction,
                    seg.domino.isDouble,
                );

                let cx: number;
                let cy: number;

                if (seg.domino.isDouble) {
                    cx = pixel.x + GRID_CELL_SIZE / 2;
                    cy = pixel.y + GRID_CELL_SIZE / 2;
                } else {
                    if (seg.direction === 0) {
                        cx = pixel.x + GRID_CELL_SIZE;
                        cy = pixel.y + GRID_CELL_SIZE / 2;
                    } else if (seg.direction === 90) {
                        cx = pixel.x + GRID_CELL_SIZE / 2;
                        cy = pixel.y + GRID_CELL_SIZE;
                    } else if (seg.direction === 180) {
                        cx = pixel.x;
                        cy = pixel.y + GRID_CELL_SIZE / 2;
                    } else {
                        cx = pixel.x + GRID_CELL_SIZE / 2;
                        cy = pixel.y;
                    }
                }

                const displayPip1 = seg.flipped
                    ? seg.domino.pip2
                    : seg.domino.pip1;
                const displayPip2 = seg.flipped
                    ? seg.domino.pip1
                    : seg.domino.pip2;

                const isNew = seg.domino.id === lastPlacedTileId;

                return (
                    <AnimatedChainTile
                        key={seg.domino.id}
                        seg={seg}
                        cx={cx}
                        cy={cy}
                        rotation={rotation}
                        displayPip1={displayPip1}
                        displayPip2={displayPip2}
                        isNew={isNew}
                        reducedMotion={reducedMotion}
                    />
                );
            })}
        </Group>
    );
}
