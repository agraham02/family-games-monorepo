"use client";

import { Group, Rect, Circle, Line } from "react-konva";
import type { PipValue } from "../engine/types";

const PIP_PATTERNS: Record<PipValue, [number, number][]> = {
    0: [],
    1: [[0.5, 0.5]],
    2: [
        [0.25, 0.25],
        [0.75, 0.75],
    ],
    3: [
        [0.25, 0.25],
        [0.5, 0.5],
        [0.75, 0.75],
    ],
    4: [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
    ],
    5: [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.5, 0.5],
        [0.25, 0.75],
        [0.75, 0.75],
    ],
    6: [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.5],
        [0.75, 0.5],
        [0.25, 0.75],
        [0.75, 0.75],
    ],
};

const TILE_W = 120;
const TILE_H = 60;
const CORNER_R = 6;
const PIP_R = 4.5;
const DIVIDER_WIDTH = 1.5;

const FACE_COLOR = "#FEFAE0";
const PIP_COLOR = "#1B1B1B";
const BORDER_COLOR = "#C2B280";
const DIVIDER_COLOR = "#A0926B";

interface DominoTileProps {
    pip1: PipValue;
    pip2: PipValue;
    isDouble: boolean;
    x: number;
    y: number;
    rotation?: number;
    opacity?: number;
    scale?: number;
    faceDown?: boolean;
    onClick?: () => void;
    glowColor?: string;
}

export default function DominoTile({
    pip1,
    pip2,
    isDouble: _isDouble,
    x,
    y,
    rotation = 0,
    opacity = 1,
    scale = 1,
    faceDown = false,
    onClick,
    glowColor,
}: DominoTileProps) {
    const w = TILE_W;
    const h = TILE_H;
    const halfW = w / 2;

    return (
        <Group
            x={x}
            y={y}
            rotation={rotation}
            opacity={opacity}
            scaleX={scale}
            scaleY={scale}
            offsetX={w / 2}
            offsetY={h / 2}
            onClick={onClick}
            onTap={onClick}
        >
            {/* Shadow */}
            <Rect
                x={3}
                y={3}
                width={w}
                height={h}
                cornerRadius={CORNER_R}
                fill="rgba(0,0,0,0.25)"
                shadowColor="rgba(0,0,0,0.4)"
                shadowBlur={6}
                shadowOffsetX={1}
                shadowOffsetY={1}
            />

            {/* Glow effect */}
            {glowColor && (
                <Rect
                    x={-4}
                    y={-4}
                    width={w + 8}
                    height={h + 8}
                    cornerRadius={CORNER_R + 2}
                    fill="transparent"
                    stroke={glowColor}
                    strokeWidth={3}
                    shadowColor={glowColor}
                    shadowBlur={12}
                    shadowOpacity={0.8}
                />
            )}

            {/* Tile body */}
            <Rect
                x={0}
                y={0}
                width={w}
                height={h}
                cornerRadius={CORNER_R}
                fill={faceDown ? "#2C5F7C" : FACE_COLOR}
                stroke={BORDER_COLOR}
                strokeWidth={1.5}
            />

            {faceDown ? (
                <>
                    <Line
                        points={[10, 10, w - 10, h - 10]}
                        stroke="#3A7A9A"
                        strokeWidth={1}
                    />
                    <Line
                        points={[w - 10, 10, 10, h - 10]}
                        stroke="#3A7A9A"
                        strokeWidth={1}
                    />
                </>
            ) : (
                <>
                    {/* Center divider */}
                    <Line
                        points={[halfW, 4, halfW, h - 4]}
                        stroke={DIVIDER_COLOR}
                        strokeWidth={DIVIDER_WIDTH}
                    />

                    {/* Pip1 (left half) */}
                    {PIP_PATTERNS[pip1].map(([px, py], i) => (
                        <Circle
                            key={`p1-${i}`}
                            x={px * halfW}
                            y={py * h}
                            radius={PIP_R}
                            fill={PIP_COLOR}
                        />
                    ))}

                    {/* Pip2 (right half) */}
                    {PIP_PATTERNS[pip2].map(([px, py], i) => (
                        <Circle
                            key={`p2-${i}`}
                            x={halfW + px * halfW}
                            y={py * h}
                            radius={PIP_R}
                            fill={PIP_COLOR}
                        />
                    ))}
                </>
            )}
        </Group>
    );
}
