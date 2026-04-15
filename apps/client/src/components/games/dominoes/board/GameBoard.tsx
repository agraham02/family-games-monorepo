"use client";

import {
    useRef,
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
    useMemo,
} from "react";
import { Stage, Layer, Rect, Circle } from "react-konva";
import type Konva from "konva";
import TileChain from "./TileChain";
import GhostTile from "./GhostTile";
import { useDominoesStore } from "../store";
import { GRID_CELL_SIZE, BOARD_COLS, BOARD_ROWS } from "../engine/types";
import { getTilePixelBounds } from "../engine/layout";

const BOARD_PX_W = BOARD_COLS * GRID_CELL_SIZE;
const BOARD_PX_H = BOARD_ROWS * GRID_CELL_SIZE;

const TABLE_COLOR = "#1a5c3a";

function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
    };
}

function FeltTexture() {
    const dots = useMemo(() => {
        const rng = seededRandom(42);
        const count = 300;
        const result: { x: number; y: number; r: number; o: number }[] = [];
        for (let i = 0; i < count; i++) {
            result.push({
                x: rng() * (BOARD_PX_W + 200) - 100,
                y: rng() * (BOARD_PX_H + 200) - 100,
                r: 1 + rng() * 2.5,
                o: 0.03 + rng() * 0.06,
            });
        }
        return result;
    }, []);

    return (
        <>
            {dots.map((d, i) => (
                <Circle
                    key={i}
                    x={d.x}
                    y={d.y}
                    radius={d.r}
                    fill="#0d4a2d"
                    opacity={d.o}
                    listening={false}
                />
            ))}
        </>
    );
}

function CenterGlow() {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setPhase((p) => (p + 1) % 60);
        }, 33);
        return () => clearInterval(id);
    }, []);

    const t = Math.sin((phase / 60) * Math.PI * 2);
    const opacity = 0.15 + (t + 1) * 0.175;
    const radius = 22 + (t + 1) * 6.5;

    // Use the same focal point as the camera so the glow appears
    // at the visual center of the viewport, not the pixel midpoint.
    const cx = Math.floor(BOARD_COLS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
    const cy = Math.floor(BOARD_ROWS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

    return (
        <Circle
            x={cx}
            y={cy}
            radius={radius}
            fill="#3B82F6"
            opacity={opacity}
            shadowColor="#3B82F6"
            shadowBlur={30}
            shadowOpacity={0.6}
            listening={false}
        />
    );
}

interface GameBoardProps {
    onPlaceAtEnd: (end: "head" | "tail") => void;
}

export default function GameBoard({ onPlaceAtEnd }: GameBoardProps) {
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    const chain = useDominoesStore((s) => s.chain);
    const ghostPlacements = useDominoesStore((s) => s.ghostPlacements);
    const stageScale = useDominoesStore((s) => s.stageScale);
    const stagePosition = useDominoesStore((s) => s.stagePosition);
    const setStageScale = useDominoesStore((s) => s.setStageScale);
    const setStagePosition = useDominoesStore((s) => s.setStagePosition);
    const autoFit = useDominoesStore((s) => s.autoFit);
    const disableAutoFit = useDominoesStore((s) => s.disableAutoFit);

    const focalX =
        Math.floor(BOARD_COLS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
    const focalY =
        Math.floor(BOARD_ROWS / 2) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
    const centerBoard = useCallback(
        (w: number, h: number, scale: number) => {
            setStagePosition({
                x: w / 2 - focalX * scale,
                y: h / 2 - focalY * scale,
            });
        },
        [setStagePosition, focalX, focalY],
    );

    // ── Auto-fit: compute target scale/position to show all tiles ──
    const AUTOFIT_PADDING = 80; // px of padding around the chain

    const getAutoFitTarget = useCallback(
        (containerW: number, containerH: number) => {
            const segments = useDominoesStore.getState().chain.segments;
            if (segments.length === 0) {
                // No tiles yet — center on focal point at scale 1
                return {
                    scale: 1,
                    x: containerW / 2 - focalX,
                    y: containerH / 2 - focalY,
                };
            }

            // Compute bounding box of all placed tiles
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            for (const seg of segments) {
                const b = getTilePixelBounds(
                    seg.gridPos,
                    seg.direction,
                    seg.domino.isDouble,
                );
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            }

            const chainW = maxX - minX;
            const chainH = maxY - minY;
            const chainCx = (minX + maxX) / 2;
            const chainCy = (minY + maxY) / 2;

            // Scale to fit with padding, capped at 1.0 so early-game
            // tiles stay at normal zoom instead of being magnified.
            const availW = containerW - AUTOFIT_PADDING * 2;
            const availH = containerH - AUTOFIT_PADDING * 2;
            const scaleX = availW / Math.max(chainW, 1);
            const scaleY = availH / Math.max(chainH, 1);
            const scale = Math.max(0.3, Math.min(1, Math.min(scaleX, scaleY)));

            return {
                scale,
                x: containerW / 2 - chainCx * scale,
                y: containerH / 2 - chainCy * scale,
            };
        },
        [focalX, focalY],
    );

    // ── Smooth animation for auto-fit camera ──
    const animFrameRef = useRef<number>(0);

    const animateToTarget = useCallback(
        (targetScale: number, targetX: number, targetY: number) => {
            // Cancel any running animation
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }

            const duration = 400; // ms
            const start = performance.now();
            const startScale = useDominoesStore.getState().stageScale;
            const startPos = useDominoesStore.getState().stagePosition;

            const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); // cubic ease-out

            const tick = (now: number) => {
                const elapsed = now - start;
                const raw = Math.min(elapsed / duration, 1);
                const t = easeOut(raw);

                const s = startScale + (targetScale - startScale) * t;
                const x = startPos.x + (targetX - startPos.x) * t;
                const y = startPos.y + (targetY - startPos.y) * t;

                setStageScale(s);
                setStagePosition({ x, y });

                if (raw < 1) {
                    animFrameRef.current = requestAnimationFrame(tick);
                }
            };

            animFrameRef.current = requestAnimationFrame(tick);
        },
        [setStageScale, setStagePosition],
    );

    // Trigger auto-fit whenever the chain changes and autoFit is on
    const prevSegmentCountRef = useRef(chain.segments.length);
    useEffect(() => {
        if (!autoFit) {
            prevSegmentCountRef.current = chain.segments.length;
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        const target = getAutoFitTarget(w, h);

        // On first tile or initial load, animate; otherwise also animate
        animateToTarget(target.scale, target.x, target.y);
        prevSegmentCountRef.current = chain.segments.length;
    }, [chain.segments.length, autoFit, getAutoFitTarget, animateToTarget]);

    // Clean up animation on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    const initializedRef = useRef(false);
    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                setDimensions({ width: w, height: h });

                if (!initializedRef.current) {
                    initializedRef.current = true;
                    // If autoFit is on, let the auto-fit effect handle initial positioning
                    if (!useDominoesStore.getState().autoFit) {
                        centerBoard(w, h, stageScale);
                    }
                } else if (useDominoesStore.getState().autoFit) {
                    // Re-fit on resize when autoFit is active
                    const target = getAutoFitTarget(w, h);
                    setStageScale(target.scale);
                    setStagePosition({ x: target.x, y: target.y });
                }
            }
        };

        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleWheel = useCallback(
        (e: Konva.KonvaEventObject<WheelEvent>) => {
            e.evt.preventDefault();
            disableAutoFit();
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = 0;
            }
            const stage = stageRef.current;
            if (!stage) return;

            const scaleBy = 1.08;
            const oldScale = stage.scaleX();
            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
            };

            const direction = e.evt.deltaY > 0 ? -1 : 1;
            const newScale =
                direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            const clampedScale = Math.max(0.3, Math.min(3, newScale));

            setStageScale(clampedScale);
            setStagePosition({
                x: pointer.x - mousePointTo.x * clampedScale,
                y: pointer.y - mousePointTo.y * clampedScale,
            });
        },
        [setStageScale, setStagePosition, disableAutoFit],
    );

    const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
            disableAutoFit();
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = 0;
            }
            setStagePosition({ x: e.target.x(), y: e.target.y() });
        },
        [setStagePosition, disableAutoFit],
    );

    return (
        <div
            ref={containerRef}
            data-board
            className="flex-1 relative overflow-hidden rounded-xl"
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePosition.x}
                y={stagePosition.y}
                draggable
                onWheel={handleWheel}
                onDragEnd={handleDragEnd}
            >
                <Layer>
                    {/* Table surface — seamless with parent felt */}
                    <Rect
                        x={-500}
                        y={-500}
                        width={BOARD_PX_W + 1000}
                        height={BOARD_PX_H + 1000}
                        fill={TABLE_COLOR}
                        listening={false}
                    />
                    <FeltTexture />

                    {/* Center glow when board is empty */}
                    {chain.segments.length === 0 && <CenterGlow />}

                    {/* Placed tiles */}
                    <TileChain segments={chain.segments} />

                    {/* Ghost previews */}
                    {ghostPlacements.map((ghost) => (
                        <GhostTile
                            key={`ghost-${ghost.end}`}
                            segment={ghost.segment}
                            end={ghost.end}
                            onClick={() => onPlaceAtEnd(ghost.end)}
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
}
