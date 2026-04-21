import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  /** 'left' → drag moves the left panel's right edge. 'right' → drag moves the right panel's left edge. */
  side: 'left' | 'right';
  width: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange: (next: number) => void;
}

/**
 * Thin vertical gutter that resizes an adjacent panel by dragging.
 * Uses pointer events so it works with mouse, touch, and pen with one API.
 */
export function ResizeHandle({
  side,
  width,
  minWidth,
  maxWidth,
  onWidthChange,
}: ResizeHandleProps) {
  const originRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const origin = originRef.current;
      if (!origin || e.pointerId !== origin.pointerId) return;
      const delta = e.clientX - origin.startX;
      const raw = side === 'left' ? origin.startWidth + delta : origin.startWidth - delta;
      const clamped = Math.max(minWidth, Math.min(maxWidth, raw));
      onWidthChange(clamped);
    },
    [side, minWidth, maxWidth, onWidthChange],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const origin = originRef.current;
      if (!origin || e.pointerId !== origin.pointerId) return;
      originRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [handlePointerMove],
  );

  const handlePointerDown = (e: React.PointerEvent): void => {
    originRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startWidth: width,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return <div className="resize-handle" onPointerDown={handlePointerDown} aria-hidden="true" />;
}
