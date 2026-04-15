"use client";

import { useRef, useEffect } from "react";
import { Group } from "react-konva";
import type Konva from "konva";
import DominoTile from "./DominoTile";
import type { ChainSegment, ChainEnd } from "../engine/types";
import { gridToPixel, tileRotationDegrees } from "../engine/layout";
import { GRID_CELL_SIZE } from "../engine/types";
import { usePrefersReducedMotion } from "@/hooks";

interface GhostTileProps {
    segment: ChainSegment;
    end: ChainEnd;
    onClick: () => void;
}

export default function GhostTile({ segment, end, onClick }: GhostTileProps) {
    const groupRef = useRef<Konva.Group>(null);
    const reducedMotion = usePrefersReducedMotion();
    const pixel = gridToPixel(segment.gridPos);
    const rotation = tileRotationDegrees(
        segment.direction,
        segment.domino.isDouble,
    );

    let cx: number;
    let cy: number;

    if (segment.domino.isDouble) {
        cx = pixel.x + GRID_CELL_SIZE / 2;
        cy = pixel.y + GRID_CELL_SIZE / 2;
    } else {
        if (segment.direction === 0) {
            cx = pixel.x + GRID_CELL_SIZE;
            cy = pixel.y + GRID_CELL_SIZE / 2;
        } else if (segment.direction === 90) {
            cx = pixel.x + GRID_CELL_SIZE / 2;
            cy = pixel.y + GRID_CELL_SIZE;
        } else if (segment.direction === 180) {
            cx = pixel.x;
            cy = pixel.y + GRID_CELL_SIZE / 2;
        } else {
            cx = pixel.x + GRID_CELL_SIZE / 2;
            cy = pixel.y;
        }
    }

    useEffect(() => {
        const node = groupRef.current;
        if (!node || reducedMotion) return;

        node.opacity(0);
        node.scaleX(0.85);
        node.scaleY(0.85);

        let cancelled = false;

        const waitForLayer = () => {
            if (cancelled) return;
            if (!node.getLayer()) {
                requestAnimationFrame(waitForLayer);
                return;
            }
            node.to({
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 0.2,
            });
        };
        requestAnimationFrame(waitForLayer);

        return () => {
            cancelled = true;
        };
    }, [segment.domino.id, end, reducedMotion]);

    return (
        <Group ref={groupRef} x={cx} y={cy}>
            <DominoTile
                pip1={
                    segment.flipped ? segment.domino.pip2 : segment.domino.pip1
                }
                pip2={
                    segment.flipped ? segment.domino.pip1 : segment.domino.pip2
                }
                isDouble={segment.domino.isDouble}
                x={0}
                y={0}
                rotation={rotation}
                opacity={0.45}
                glowColor="#3B82F6"
                onClick={onClick}
            />
        </Group>
    );
}
