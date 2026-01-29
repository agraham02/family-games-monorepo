// hooks/useDraggableViewport.ts
import { useState, useRef, useCallback } from "react";

export const useDraggableViewport = () => {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        setIsDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        },
        [isDragging],
    );

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        setIsDragging(false);
        if (e.target)
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    return {
        offset,
        setOffset, // Exposed if you need to manually reset
        eventHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerLeave: onPointerUp,
        },
        isDragging,
    };
};
