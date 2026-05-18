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
import type { ChainSegment } from "../engine/types";
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
    // We use *per-side insets* rather than uniform padding so the autofit
    // can reserve space for overlay UI that lives inside the board container
    // (notably BoardControls in the bottom-right corner). Without this, the
    // chain ends up clipping under the zoom buttons once the snake grows
    // large. We measure overlay elements live (any descendant flagged with
    // `data-board-overlay`) instead of hard-coding sizes, so the reservation
    // stays correct if controls move or resize.
    const getAutoFitInsets = useCallback(
        (containerW: number, containerH: number) => {
            const minDim = Math.min(containerW, containerH);
            // Bumped from 6%/56 cap to 10%/96 cap so the chain never sits
            // flush against the edge. The visual `getTilePixelBounds` is the
            // tile body — but tiles have rounded corners + a subtle drop
            // shadow that visually extends a few px beyond the bbox. Generous
            // padding also leaves room for the ghost-placement preview at
            // either chain end without re-fitting jarringly.
            const base = Math.max(32, Math.min(96, Math.round(minDim * 0.1)));
            let top = base,
                right = base,
                bottom = base,
                left = base;

            const container = containerRef.current;
            if (container) {
                const cRect = container.getBoundingClientRect();
                const overlays = container.querySelectorAll<HTMLElement>(
                    "[data-board-overlay]",
                );
                const SAFETY = 16; // px of breathing room around overlays
                for (const el of overlays) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) continue;
                    const fromTop = r.top - cRect.top;
                    const fromLeft = r.left - cRect.left;
                    const fromRight = cRect.right - r.right;
                    const fromBottom = cRect.bottom - r.bottom;
                    // Pick the *single* container edge the overlay is closest
                    // to and inflate only that inset. Reserving multiple
                    // sides for a corner overlay (e.g. BoardControls
                    // bottom-right) would over-shrink the chain.
                    const min = Math.min(
                        fromTop,
                        fromRight,
                        fromBottom,
                        fromLeft,
                    );
                    if (min === fromRight) {
                        right = Math.max(right, r.width + fromRight + SAFETY);
                    } else if (min === fromLeft) {
                        left = Math.max(left, r.width + fromLeft + SAFETY);
                    } else if (min === fromBottom) {
                        bottom = Math.max(
                            bottom,
                            r.height + fromBottom + SAFETY,
                        );
                    } else {
                        top = Math.max(top, r.height + fromTop + SAFETY);
                    }
                }
            }

            return { top, right, bottom, left };
        },
        [],
    );

    // Cap auto-fit zoom. Allowing >1 lets small chains fill the available
    // space instead of leaving large empty margins. 1.75 keeps tiles
    // readable without rendering at >2x source resolution. The lower bound
    // is kept very small so a near-full board (chain spanning most of the
    // grid + ghost previews extending past it) can always fit without
    // clipping — readability degrades gracefully but no tile is hidden.
    const AUTOFIT_MAX_SCALE = 1.75;
    const AUTOFIT_MIN_SCALE = 0.1;

    const getAutoFitTarget = useCallback(
        (containerW: number, containerH: number) => {
            const state = useDominoesStore.getState();
            const segments = state.chain.segments;
            const ghosts = state.ghostPlacements;
            const insets = getAutoFitInsets(containerW, containerH);
            const availW = Math.max(1, containerW - insets.left - insets.right);
            const availH = Math.max(1, containerH - insets.top - insets.bottom);

            // Visual center of the available area (offset by the insets so
            // the chain centers in the *visible* region, not the raw
            // container midpoint).
            const viewCx = insets.left + availW / 2;
            const viewCy = insets.top + availH / 2;

            if (segments.length === 0 && ghosts.length === 0) {
                // No tiles yet — center on focal point at a calm scale so
                // the leap to a multi-tile chain isn't jarring.
                const initialScale = Math.min(AUTOFIT_MAX_SCALE, 1.1);
                return {
                    scale: initialScale,
                    x: viewCx - focalX * initialScale,
                    y: viewCy - focalY * initialScale,
                };
            }

            // Compute bounding box of placed tiles AND any active ghost
            // previews so selecting a tile near an end keeps the preview on
            // screen instead of clipping off the edge.
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            const accumulate = (seg: ChainSegment) => {
                const b = getTilePixelBounds(
                    seg.gridPos,
                    seg.direction,
                    seg.domino.isDouble,
                );
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            };
            for (const seg of segments) accumulate(seg);
            for (const ghost of ghosts) accumulate(ghost.segment);

            const chainW = maxX - minX;
            const chainH = maxY - minY;
            const chainCx = (minX + maxX) / 2;
            const chainCy = (minY + maxY) / 2;

            const scaleX = availW / Math.max(chainW, 1);
            const scaleY = availH / Math.max(chainH, 1);
            const scale = Math.max(
                AUTOFIT_MIN_SCALE,
                Math.min(AUTOFIT_MAX_SCALE, Math.min(scaleX, scaleY)),
            );

            return {
                scale,
                x: viewCx - chainCx * scale,
                y: viewCy - chainCy * scale,
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

    // Trigger auto-fit whenever the chain OR active ghost previews change
    // and autoFit is on. Including ghosts ensures that selecting a tile near
    // the head/tail of the chain expands the camera to keep the preview on
    // screen instead of clipping it. Also depends on container dimensions so
    // a re-fit happens once the grid layout settles (matters on rejoin where
    // the container starts at 0×0 then grows).
    const prevSegmentCountRef = useRef(chain.segments.length);
    const ghostSignature = ghostPlacements
        .map(
            (g) =>
                `${g.end}:${g.segment.gridPos.row},${g.segment.gridPos.col},${g.segment.direction}`,
        )
        .join("|");
    useEffect(() => {
        if (!autoFit) {
            prevSegmentCountRef.current = chain.segments.length;
            return;
        }

        // Skip until container has real dimensions — otherwise we'd compute
        // a fit against the 800×600 default and lock the camera at a tiny
        // scale that never recovers.
        if (dimensions.width <= 0 || dimensions.height <= 0) return;

        const target = getAutoFitTarget(dimensions.width, dimensions.height);

        // On first tile or initial load, animate; otherwise also animate
        animateToTarget(target.scale, target.x, target.y);
        prevSegmentCountRef.current = chain.segments.length;
    }, [
        chain.segments.length,
        ghostSignature,
        autoFit,
        getAutoFitTarget,
        animateToTarget,
        dimensions.width,
        dimensions.height,
    ]);

    // Clean up animation on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    // Track container size with ResizeObserver so we react to actual
    // container resizes (grid layout settling, sibling mounts, rejoin
    // re-mount, sidebar/menu open). `window.resize` alone misses these and
    // leaves the camera locked at a stale scale — the cause of the
    // "tiny board after rejoin" bug.
    const initializedRef = useRef(false);
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = (w: number, h: number) => {
            if (w <= 0 || h <= 0) return;
            setDimensions({ width: w, height: h });

            if (!initializedRef.current) {
                initializedRef.current = true;
                // If autoFit is on, let the auto-fit effect handle initial
                // positioning (it will fire because dimensions changed).
                if (!useDominoesStore.getState().autoFit) {
                    centerBoard(w, h, stageScale);
                }
            } else if (useDominoesStore.getState().autoFit) {
                // Re-fit immediately on resize when autoFit is active so
                // the chain stays framed as the available space changes.
                const target = getAutoFitTarget(w, h);
                setStageScale(target.scale);
                setStagePosition({ x: target.x, y: target.y });
            }
        };

        updateSize(container.clientWidth, container.clientHeight);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            updateSize(width, height);
        });
        observer.observe(container);

        return () => observer.disconnect();
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
