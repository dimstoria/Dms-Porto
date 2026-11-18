import {useCallback, useRef, useState, type PointerEvent} from 'react';
import {
  Columns2,
  Eye,
  MoveHorizontal,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {FilmImage} from './FilmImage';
import {DevMediaSlotBadge} from './DevMediaSlotBadge';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {COLOR_GRADING_DEFAULT_SCENES, useDevMedia} from '../context/DevMediaContext';
import {CUBIC_EASE, CUBIC_INDICATOR, CUBIC_TACTILE, MOTION_DURATIONS} from '../lib/motion';

type CompareMode = 'split' | 'side-by-side' | 'raw' | 'graded';

const COMPARE_MODES: Array<{
  id: CompareMode;
  label: string;
  icon: typeof SplitSquareHorizontal;
}> = [
  {id: 'split', label: 'Split', icon: SplitSquareHorizontal},
  {id: 'side-by-side', label: 'Side-by-Side', icon: Columns2},
  {id: 'raw', label: 'RAW Log', icon: Eye},
  {id: 'graded', label: 'Graded', icon: Sparkles},
];

export function ColorGradingCompare() {
  const {resolveSlot, devMode} = useDevMedia();
  const [selectedId, setSelectedId] = useState<string>(COLOR_GRADING_DEFAULT_SCENES[0].id);
  const [compareMode, setCompareMode] = useState<CompareMode>('split');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeScene =
    COLOR_GRADING_DEFAULT_SCENES.find((scene) => scene.id === selectedId) ??
    COLOR_GRADING_DEFAULT_SCENES[0];

  const resolvedBefore = resolveSlot(`grade:${activeScene.id}:before`, activeScene.image);
  const resolvedAfter = resolveSlot(`grade:${activeScene.id}:after`, activeScene.image);
  const useSimulatedLogFilter = !resolvedBefore.isOverridden;

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const rawPercent = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, rawPercent));
    setSliderPosition(Math.round(clamped * 10) / 10);
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (compareMode !== 'split') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (compareMode !== 'split' || !isDragging) return;
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const roundedPos = Math.round(sliderPosition);

  return (
    <section
      id="color-grade"
      aria-labelledby="color-grade-heading"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 space-y-6 md:space-y-8"
    >
      {/* Neo-Brutalist Section Header Bar */}
      <div data-gsap="cg-head" className="flex items-center gap-3 pt-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold uppercase tracking-wider text-[#09090B] shrink-0">
          02. Color Science · DaVinci Resolve
        </span>
        <div className="h-[2.5px] flex-1 bg-[#09090B]" />
      </div>

      {/* Header + Scene Switcher */}
      <div
        data-gsap="cg-head"
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6"
      >
        <div className="space-y-2 max-w-xl">
          <h2
            id="color-grade-heading"
            className="font-display text-[clamp(1.75rem,3.2vw,2.6rem)] font-extrabold tracking-tight leading-[1.06] text-[#09090B]"
          >
            From Flat Log to Cinema Finish
          </h2>
          <p className="text-[clamp(0.875rem,1.05vw,1rem)] font-sans text-[#3F3F46] leading-[1.6] max-w-[52ch]">
            Drag full 0–100% across the calibrated screening frame or switch between Split, Side-by-Side, RAW Log, and Graded modes.
          </p>
        </div>

        {/* Scene Switcher Collage Tabs */}
        <HorizontalScrollFade className="max-w-full self-start md:self-auto">
          <div
            role="tablist"
            aria-label="Color grading scenes"
            className="brutal-card inline-flex items-center gap-1.5 p-1.5 rounded-2xl w-max bg-white"
          >
            {COLOR_GRADING_DEFAULT_SCENES.map((scene) => {
              const isSelected = scene.id === activeScene.id;
              return (
                <motion.button
                  key={scene.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  whileTap={{scale: 0.96}}
                  transition={CUBIC_TACTILE}
                  onClick={() => setSelectedId(scene.id)}
                  className={`relative px-4 min-h-[44px] md:min-h-[36px] text-xs font-mono font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                    isSelected ? 'text-white' : 'text-[#09090B] hover:bg-[#FEF9C3]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="active-grade-tab"
                      transition={CUBIC_INDICATOR}
                      className="absolute inset-0 rounded-xl bg-[#7C3AED] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                    />
                  )}
                  <span className="relative z-10">{scene.label}</span>
                </motion.button>
              );
            })}
          </div>
        </HorizontalScrollFade>
      </div>

      {/* Compare Mode Selector Toolbar */}
      <div
        data-gsap="cg-head"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <HorizontalScrollFade className="max-w-full">
          <div
            role="tablist"
            aria-label="Comparison view mode"
            className="brutal-card inline-flex items-center gap-1.5 p-1.5 rounded-2xl w-max bg-white"
          >
            {COMPARE_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = compareMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  whileTap={{scale: 0.96}}
                  transition={CUBIC_TACTILE}
                  onClick={() => setCompareMode(mode.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 min-h-[40px] md:min-h-[34px] text-xs font-mono font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                    isSelected ? 'text-[#09090B]' : 'text-[#3F3F46] hover:bg-[#F3E8FF]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="active-compare-mode"
                      transition={CUBIC_INDICATOR}
                      className="absolute inset-0 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5" strokeWidth={2.25} />
                  <span className="relative z-10">{mode.label}</span>
                </motion.button>
              );
            })}
          </div>
        </HorizontalScrollFade>

        {compareMode === 'split' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSliderPosition(0)}
              className={`min-h-[36px] rounded-xl px-3 text-[11px] font-mono font-bold cursor-pointer ${
                roundedPos === 0 ? 'brutal-cta-purple' : 'brutal-button bg-white'
              }`}
            >
              0% Graded
            </button>
            <button
              type="button"
              onClick={() => setSliderPosition(50)}
              className={`inline-flex items-center gap-1 min-h-[36px] rounded-xl px-3 text-[11px] font-mono font-bold cursor-pointer ${
                roundedPos === 50 ? 'brutal-cta' : 'brutal-button bg-white'
              }`}
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2.25} />
              <span>50/50</span>
            </button>
            <button
              type="button"
              onClick={() => setSliderPosition(100)}
              className={`min-h-[36px] rounded-xl px-3 text-[11px] font-mono font-bold cursor-pointer ${
                roundedPos === 100 ? 'brutal-cta-pink' : 'brutal-button bg-white'
              }`}
            >
              100% RAW
            </button>
          </div>
        )}
      </div>

      {/* Bright Yellow Brutalist Bezel Enclosing Calibrated Neutral #09090B Grading Canvas */}
      <div
        data-gsap="cg-stage"
        className={`relative rounded-3xl bg-[#FFE600] border-[3px] border-[#09090B] shadow-[8px_8px_0_#09090B] p-2 sm:p-3 ${
          devMode ? 'ring-4 ring-[#7C3AED]' : ''
        }`}
      >
        {compareMode === 'side-by-side' ? (
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            {/* LEFT: RAW LOG */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
              <FilmImage
                src={resolvedBefore.src}
                kind={resolvedBefore.kind}
                alt={`${activeScene.label} flat log original footage`}
                title={`${activeScene.filmTitle} (Log)`}
                className={useSimulatedLogFilter ? 'grade-log-profile' : ''}
              />
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 inline-flex items-center gap-1.5 rounded-xl bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B]">
                <span>RAW · {activeScene.colorSpace}</span>
              </div>
              <DevMediaSlotBadge
                slotKey={`grade:${activeScene.id}`}
                label="Upload Log & Graded"
                position="bottom-left"
              />
            </div>

            {/* RIGHT: GRADED */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
              <FilmImage
                src={resolvedAfter.src}
                kind={resolvedAfter.kind}
                alt={`${activeScene.label} final color grade`}
                title={activeScene.filmTitle}
              />
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B]">
                <SlidersHorizontal className="w-3 h-3 text-[#09090B]" strokeWidth={2.25} />
                <span>Graded · {activeScene.lutCurve}</span>
              </div>
            </div>
          </div>
        ) : compareMode === 'raw' ? (
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeScene.id}-raw`}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                className="absolute inset-0"
              >
                <FilmImage
                  src={resolvedBefore.src}
                  kind={resolvedBefore.kind}
                  alt={`${activeScene.label} flat log original footage`}
                  title={`${activeScene.filmTitle} (Log)`}
                  className={useSimulatedLogFilter ? 'grade-log-profile' : ''}
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 inline-flex items-center gap-1.5 rounded-xl bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B]">
              <span>RAW · {activeScene.colorSpace}</span>
            </div>
            <button
              type="button"
              onClick={() => setCompareMode('graded')}
              className="brutal-cta absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 inline-flex items-center gap-1.5 min-h-[38px] rounded-xl px-3.5 py-1 text-xs font-mono font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>View Graded</span>
            </button>
            <DevMediaSlotBadge
              slotKey={`grade:${activeScene.id}`}
              label="Upload Log & Graded"
              position="bottom-left"
            />
          </div>
        ) : compareMode === 'graded' ? (
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeScene.id}-graded`}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                className="absolute inset-0"
              >
                <FilmImage
                  src={resolvedAfter.src}
                  kind={resolvedAfter.kind}
                  alt={`${activeScene.label} final color grade`}
                  title={activeScene.filmTitle}
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 inline-flex items-center gap-1.5 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B]">
              <SlidersHorizontal className="w-3 h-3 text-[#09090B]" strokeWidth={2.25} />
              <span>Graded · {activeScene.lutCurve}</span>
            </div>
            <button
              type="button"
              onClick={() => setCompareMode('raw')}
              className="brutal-button absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-white px-3.5 py-1 text-xs font-mono font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2.25} />
              <span>View RAW Log</span>
            </button>
            <DevMediaSlotBadge
              slotKey={`grade:${activeScene.id}`}
              label="Upload Log & Graded"
              position="bottom-left"
            />
          </div>
        ) : (
          /* SPLIT WIPE SLIDER (Full 0%–100% range without clipping the handle) */
          <div
            ref={containerRef}
            role="slider"
            tabIndex={0}
            aria-label="Before and after color grading comparison slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedPos}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 4;
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSliderPosition((p) => Math.max(0, p - step));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSliderPosition((p) => Math.min(100, p + step));
              } else if (e.key === 'Home') {
                e.preventDefault();
                setSliderPosition(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setSliderPosition(100);
              }
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative aspect-[16/9] w-full select-none touch-none cursor-ew-resize group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED]"
          >
            {/* Inner overflow-hidden viewport so wipe handle remains grabbable even at 0% or 100% */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeScene.id}
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  exit={{opacity: 0}}
                  transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                  className="absolute inset-0"
                >
                  {/* FINAL GRADED LAYER (Underlying Right Side / Full at 0%) */}
                  <div className="absolute inset-0 bg-[#09090B]">
                    <FilmImage
                      src={resolvedAfter.src}
                      kind={resolvedAfter.kind}
                      alt={`${activeScene.label} final color grade`}
                      title={activeScene.filmTitle}
                    />
                    <div
                      className={`hidden sm:inline-flex items-center gap-1.5 absolute top-4 right-4 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B] transition-opacity duration-150 ${
                        sliderPosition > 86 ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[#09090B]" strokeWidth={2.25} />
                      <span>Graded · {activeScene.lutCurve}</span>
                    </div>
                  </div>

                  {/* CAMERA LOG LAYER (Left Clipped Side / Full at 100%) */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden bg-[#09090B]"
                    style={{clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`}}
                  >
                    <FilmImage
                      src={resolvedBefore.src}
                      kind={resolvedBefore.kind}
                      alt={`${activeScene.label} flat log original footage`}
                      title={`${activeScene.filmTitle} (Log)`}
                      className={useSimulatedLogFilter ? 'grade-log-profile' : ''}
                    />
                    <div
                      className={`hidden sm:inline-flex items-center gap-1.5 absolute top-4 left-4 rounded-xl bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B] transition-opacity duration-150 ${
                        sliderPosition < 14 ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <span>RAW · {activeScene.colorSpace}</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom Split Percentage Stamp */}
              <div
                className={`absolute left-3.5 sm:left-5 z-10 pointer-events-none inline-flex items-center gap-2 rounded-xl bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B] tabular-nums transition-all ${
                  devMode ? 'bottom-14 sm:bottom-16' : 'bottom-3.5 sm:bottom-5'
                }`}
              >
                <span>
                  {roundedPos === 0
                    ? '100% Graded'
                    : roundedPos === 100
                      ? '100% RAW Log'
                      : `RAW ${roundedPos}% / Graded ${100 - roundedPos}%`}
                </span>
              </div>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSliderPosition(50);
                }}
                className="brutal-button absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-20 inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl bg-white px-3.5 py-1 text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                <span>Reset 50/50</span>
              </button>

              <DevMediaSlotBadge
                slotKey={`grade:${activeScene.id}`}
                label="Upload Log & Graded"
                position="bottom-left"
              />
            </div>

            {/* Bold Yellow Wipe Divider & Unclipped Tactile Handle */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 z-30 w-[3px] -translate-x-1/2 bg-[#FFE600] shadow-[0_0_0_1px_#09090B] pointer-events-none"
              style={{left: `${sliderPosition}%`}}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE600] border-[2.5px] border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B] transition-transform duration-150 group-hover:scale-110">
                <MoveHorizontal className="w-4 h-4 text-[#09090B]" strokeWidth={2.25} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical LUT Metadata Collage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-gsap="cg-meta" className="brutal-card rounded-2xl bg-white p-4 space-y-1">
          <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
            Camera Color Space
          </span>
          <span className="block text-sm font-display font-bold text-[#09090B]">
            {activeScene.colorSpace}
          </span>
        </div>
        <div data-gsap="cg-meta" className="brutal-card rounded-2xl bg-[#FEF9C3] p-4 space-y-1">
          <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
            Finishing Emulation LUT
          </span>
          <span className="block text-sm font-display font-bold text-[#7C3AED]">
            {activeScene.lutCurve}
          </span>
        </div>
        <div data-gsap="cg-meta" className="brutal-card rounded-2xl bg-[#F3E8FF] p-4 space-y-1">
          <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
            Color Pipeline Notes
          </span>
          <span className="block text-xs font-sans font-medium text-[#09090B] leading-relaxed">
            {activeScene.notes}
          </span>
        </div>
      </div>
    </section>
  );
}
