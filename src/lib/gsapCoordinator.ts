import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';

let pluginsRegistered = false;

export function ensureGsapRegistered(): void {
  if (pluginsRegistered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({
    ignoreMobileResize: true,
  });
  pluginsRegistered = true;
}

export const GSAP_MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  desktopFine: '(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Bind Lenis smooth scroll frames directly into GSAP's central ticker so
 * ScrollTrigger markers and scrubbed timelines never drift by 1 frame.
 */
export function syncLenisWithGsap(lenis: Lenis): () => void {
  ensureGsapRegistered();

  const onLenisScroll = () => {
    ScrollTrigger.update();
  };

  const onGsapTick = (timeSeconds: number) => {
    lenis.raf(timeSeconds * 1000);
  };

  lenis.on('scroll', onLenisScroll);
  gsap.ticker.add(onGsapTick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    lenis.off('scroll', onLenisScroll);
    gsap.ticker.remove(onGsapTick);
    gsap.ticker.lagSmoothing(500, 33);
  };
}

export function scheduleScrollTriggerRefresh(): number {
  ensureGsapRegistered();
  return window.requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

export {gsap, ScrollTrigger};
