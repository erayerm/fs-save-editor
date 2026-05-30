import { useEffect, useState } from 'react';
import type React from 'react';

export function windowedRange(
  scrollLeft: number,
  viewportW: number,
  itemW: number,
  count: number,
  overscan: number,
): { start: number; end: number } {
  const firstVisible = Math.floor(scrollLeft / itemW);
  const start = Math.max(0, firstVisible - overscan);
  const visibleCount = Math.ceil(viewportW / itemW);
  const end = Math.min(count, firstVisible + visibleCount + overscan);
  return { start, end };
}

export function useWindowedRange(
  ref: React.RefObject<HTMLElement | null>,
  itemW: number,
  count: number,
  overscan: number,
): { start: number; end: number } {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setViewportW(entry.contentRect.width);
      });
      ro.observe(el);
    }
    // Initialize
    setScrollLeft(el.scrollLeft);
    setViewportW(el.clientWidth);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [ref, itemW]);

  return windowedRange(scrollLeft, viewportW, itemW, count, overscan);
}
