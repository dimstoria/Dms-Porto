import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {MoveHorizontal} from 'lucide-react';
import {motion} from 'motion/react';
import {FilmImage} from './FilmImage';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {DevMediaSlotBadge} from './DevMediaSlotBadge';
import {
  COLOR_GRADING_DEFAULT_SCENES,
  useDevMedia,
} from '../context/DevMediaContext';
import {LIQUID_SPRING, LIQUID_SPRING_SNAPPY} from '../lib/motion';

export function ColorGradingCompare() {
  const {resolveSlot} = useDevMedia();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [splitPercent, setSplitPercent] = useState(52);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeScene = COLOR_GRADING_DEFAULT_SCENES[sceneIndex];
  const beforeMedia = resolveSlot(`grade:${activeScene.id}:before`, activeScene.image);
  const afterMedia = resolveSlot(`grade:${activeScene.id}:after`, activeScene.image);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
    setSplitPercent(clamped);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: globalThis.PointerEvent) => {
      updateFromClientX(e.clientX);
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback handled by window pointer listeners
    }
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <section
      id="color-grade"
      aria-labelledby="color-grade-heading"
      className="relative border-b-[3px] border-[#09090B] bg-[#F5F0FF] bg-brutal-halftone"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-24 space-y-6 md:space-y-8">
        <div data-gsap="cg-head" className="flex items-center gap-4 pb-1">
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold text-[#09090B] tracking-wide shrink-0">
            02. Color Science
          </span>
          <div className="h-[2.5px] flex-1 bg-[#09090B]" />
        </div>

        <div data-gsap="cg-head" className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-2 max-w-xl">
            <h2
              id="color-grade-heading"
              className="font-display text-[clamp(1.75rem,3.2vw,2.65rem)] font-extrabold tracking-tight leading-[1.08] text-[#09090B]"
            >
              Log to Final Grade
            </h2>
            <p className="text-[clamp(0.875rem,1.05vw,1rem)] text-zinc-700 font-medium leading-[1.6] max-w-[50ch]">
              Drag across the frame to compare ungraded camera Log footage against the finished theatrical grade.
            </p>
          </div>

          <HorizontalScrollFade className="max-w-full self-start md:self-auto">
            <div
              role="tablist"
              aria-label="Select color grading scene"
              className="brutal-card inline-flex items-center gap-1 p-1.5 rounded-2xl w-max"
            >
              {COLOR_GRADING_DEFAULT_SCENES.map((scene, idx) => {
                const isActive = idx === sceneIndex;
                return (
                  <motion.button
                    key={scene.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    whileTap={{scale: 0.95}}
                    transition={LIQUID_SPRING_SNAPPY}
                    onClick={() => setSceneIndex(idx)}
                    className={`relative px-3.5 min-h-[44px] md:min-h-[36px] text-xs font-mono font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                      isActive ? 'text-[#09090B]' : 'text-zinc-600 hover:text-[#09090B]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-grade-scene"
                        transition={LIQUID_SPRING}
                        className="absolute inset-0 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                      />
                    )}
                    <span className="relative z-10">{scene.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </HorizontalScrollFade>
        </div>

        <div data-gsap="cg-stage" className="space-y-5">
          {/* Outer Neo-Brutalist Bezel isolating the calibrated Neutral #09090B Screening Viewport */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={() => setIsDragging(false)}
            onDragStart={(e) => e.preventDefault()}
            role="slider"
            aria-label="Compare Camera Log before and Final Grade after"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(splitPercent)}
            aria-valuetext={`${Math.round(splitPercent)}% Camera Log, ${Math.round(100 - splitPercent)}% Final Grade`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSplitPercent((p) => Math.max(0, p - 4));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSplitPercent((p) => Math.min(100, p + 4));
              } else if (e.key === 'PageDown') {
                e.preventDefault();
                setSplitPercent((p) => Math.max(0, p - 12));
              } else if (e.key === 'PageUp') {
                e.preventDefault();
                setSplitPercent((p) => Math.min(100, p + 12));
              } else if (e.key === 'Home') {
                e.preventDefault();
                setSplitPercent(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setSplitPercent(100);
              }
            }}
            className="brutal-film-frame relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden select-none touch-none cursor-ew-resize focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED]"
          >
            <div className="absolute inset-0 pointer-events-none select-none">
              <FilmImage
                src={afterMedia.src}
                kind={afterMedia.kind}
                alt={`${activeScene.filmTitle}: Final color grade`}
                title={activeScene.filmTitle}
                priority
              />
            </div>

            <div
              className={`absolute inset-0 pointer-events-none select-none ${
                isDragging ? '' : 'transition-[clip-path] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
              style={{
                clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
              }}
            >
              <FilmImage
                src={beforeMedia.src}
                kind={beforeMedia.kind}
                alt={`${activeScene.filmTitle}: Ungraded Camera Log`}
                title={activeScene.filmTitle}
                priority
                className={beforeMedia.isOverridden ? '' : 'grade-log-profile'}
              />
            </div>

            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none">
              <span className="inline-block bg-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                Before · Camera Log
              </span>
            </div>

            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none">
              <span className="inline-block bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                After · Final Grade
              </span>
            </div>

            <DevMediaSlotBadge
              slotKey={`grade:${activeScene.id}`}
              label="Edit Log & Graded"
              position="bottom-left"
            />

            <div
              aria-hidden="true"
              className={`absolute inset-0 pointer-events-none ${
                isDragging ? '' : 'transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
              style={{transform: `translate3d(${splitPercent}%, 0, 0)`}}
            >
              <div className="relative h-full w-0 flex items-center justify-center">
                <div className="w-[3px] h-full bg-[#FFE600] shadow-[0_0_0_1px_#09090B]" />
                <div
                  className={`absolute flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE600] border-[2.5px] border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B] transition-transform duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isDragging ? 'scale-110' : 'scale-100'
                  }`}
                >
                  <MoveHorizontal className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                whileTap={{scale: 0.95}}
                transition={LIQUID_SPRING_SNAPPY}
                onClick={() => setSplitPercent(100)}
                className={`px-3.5 min-h-[44px] md:min-h-[38px] text-xs font-mono font-bold rounded-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                  Math.round(splitPercent) === 100 ? 'brutal-cta' : 'brutal-button'
                }`}
              >
                View Log
              </motion.button>
              <motion.button
                type="button"
                whileTap={{scale: 0.95}}
                transition={LIQUID_SPRING_SNAPPY}
                onClick={() => setSplitPercent(50)}
                className={`px-3.5 min-h-[44px] md:min-h-[38px] text-xs font-mono font-bold rounded-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                  Math.round(splitPercent) === 50 ? 'brutal-cta' : 'brutal-button'
                }`}
              >
                50 / 50 Split
              </motion.button>
              <motion.button
                type="button"
                whileTap={{scale: 0.95}}
                transition={LIQUID_SPRING_SNAPPY}
                onClick={() => setSplitPercent(0)}
                className={`px-3.5 min-h-[44px] md:min-h-[38px] text-xs font-mono font-bold rounded-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                  Math.round(splitPercent) === 0 ? 'brutal-cta' : 'brutal-button'
                }`}
              >
                View Graded
              </motion.button>
            </div>

            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B] tabular-nums">
              Wipe position: {Math.round(splitPercent)}% Log · {Math.round(100 - splitPercent)}% Graded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 text-sm">
            <div data-gsap="cg-meta" className="brutal-card rounded-2xl p-4 md:col-span-3 space-y-1">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Input / Output Space</p>
              <p className="font-semibold text-[#09090B]">{activeScene.colorSpace}</p>
            </div>
            <div data-gsap="cg-meta" className="brutal-card rounded-2xl p-4 md:col-span-3 space-y-1">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Look Development</p>
              <p className="font-semibold text-[#09090B]">{activeScene.lutCurve}</p>
            </div>
            <div data-gsap="cg-meta" className="brutal-card rounded-2xl p-4 md:col-span-6 space-y-1 bg-[#FFFDF5]">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Grading Notes</p>
              <p className="text-[#09090B] leading-relaxed max-w-[62ch]">{activeScene.notes}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
