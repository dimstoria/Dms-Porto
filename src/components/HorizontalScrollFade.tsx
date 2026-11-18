import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface HorizontalScrollFadeProps {
  children: ReactNode;
  className?: string;
  fadeSize?: number;
}

export function HorizontalScrollFade({
  children,
  className = '',
  fadeSize = 28,
}: HorizontalScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({left: false, right: false});
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    didDrag: boolean;
  }>({active: false, startX: 0, startScrollLeft: 0, didDrag: false});

  const syncScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 2) {
      setEdges((prev) => (prev.left || prev.right ? {left: false, right: false} : prev));
      return;
    }

    const nextLeft = el.scrollLeft > 4;
    const nextRight = el.scrollLeft < maxScroll - 4;
    setEdges((prev) =>
      prev.left === nextLeft && prev.right === nextRight
        ? prev
        : {left: nextLeft, right: nextRight},
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    syncScrollEdges();

    const resizeObserver = new ResizeObserver(() => {
      syncScrollEdges();
    });
    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    const handleWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 2) return;

      const isHorizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const rawDelta = isHorizontalIntent ? e.deltaX : e.deltaY;
      if (rawDelta === 0) return;

      const delta = e.deltaMode === 1 ? rawDelta * 32 : rawDelta;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= maxScroll - 1;

      if (!isHorizontalIntent && ((delta < 0 && atStart) || (delta > 0 && atEnd))) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + delta));
      syncScrollEdges();
    };

    el.addEventListener('wheel', handleWheel, {passive: false});
    window.addEventListener('resize', syncScrollEdges);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncScrollEdges);
    };
  }, [syncScrollEdges, children]);

  useEffect(() => {
    const handleWindowPointerMove = (e: globalThis.PointerEvent) => {
      const drag = dragStateRef.current;
      const el = scrollRef.current;
      if (!drag.active || !el) return;

      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 5) {
        drag.didDrag = true;
      }
      if (drag.didDrag) {
        el.scrollLeft = drag.startScrollLeft - dx;
        syncScrollEdges();
      }
    };

    const handleWindowPointerUp = () => {
      if (!dragStateRef.current.active) return;
      dragStateRef.current.active = false;
      window.setTimeout(() => {
        dragStateRef.current.didDrag = false;
      }, 0);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [syncScrollEdges]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollRef.current;
    if (!el || el.scrollWidth - el.clientWidth <= 2) return;

    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      didDrag: false,
    };
  };

  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.didDrag) {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current.didDrag = false;
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={syncScrollEdges}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
      style={
        {
          '--mask-x-start': edges.left ? `${fadeSize}px` : '0px',
          '--mask-x-end': edges.right ? `${fadeSize}px` : '0px',
        } as CSSProperties
      }
      className={`overflow-x-auto no-scrollbar scroll-fade-x ${className}`}
    >
      {children}
    </div>
  );
}
