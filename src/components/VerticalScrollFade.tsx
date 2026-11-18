import {type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState} from 'react';

interface VerticalScrollFadeProps {
  children: ReactNode;
  className?: string;
  fadeSize?: number;
}

export function VerticalScrollFade({
  children,
  className = '',
  fadeSize = 28,
}: VerticalScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({top: false, bottom: false});

  const syncScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 2) {
      setEdges((prev) => (prev.top || prev.bottom ? {top: false, bottom: false} : prev));
      return;
    }

    const nextTop = el.scrollTop > 4;
    const nextBottom = el.scrollTop < maxScroll - 4;
    setEdges((prev) =>
      prev.top === nextTop && prev.bottom === nextBottom
        ? prev
        : {top: nextTop, bottom: nextBottom},
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

    window.addEventListener('resize', syncScrollEdges);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncScrollEdges);
    };
  }, [syncScrollEdges, children]);

  return (
    <div
      ref={scrollRef}
      data-lenis-prevent
      onScroll={syncScrollEdges}
      style={
        {
          '--mask-y-start': edges.top ? `${fadeSize}px` : '0px',
          '--mask-y-end': edges.bottom ? `${fadeSize}px` : '0px',
        } as CSSProperties
      }
      className={`overflow-y-auto no-scrollbar scroll-fade-y ${className}`}
    >
      {children}
    </div>
  );
}
