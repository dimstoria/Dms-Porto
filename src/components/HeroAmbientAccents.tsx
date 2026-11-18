import {type RefObject} from 'react';
import {type MotionValue, motion, useReducedMotion, useTransform} from 'motion/react';
import {
  ChunkyArrowSticker,
  DraggableSticker,
  FigmaFrameSticker,
  SpinningStampBadge,
  StarburstSticker,
} from './MaximalismOrnaments';
import {CUBIC_EASE} from '../lib/motion';

interface HeroAmbientAccentsProps {
  heroScrollProgress: MotionValue<number>;
  constraintsRef?: RefObject<Element | null>;
}

/**
 * Interactive Playful Neo-Brutalist stickers & Figma frame badges arranged
 * around the Hero showcase. Users can grab and drag them within Hero bounds.
 */
export function HeroAmbientAccents({
  heroScrollProgress,
  constraintsRef,
}: HeroAmbientAccentsProps) {
  const shouldReduceMotion = useReducedMotion();
  const parallaxY = useTransform(heroScrollProgress, [0, 1], [0, 36]);

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.94}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.5, delay: 0.22, ease: CUBIC_EASE}}
      style={shouldReduceMotion ? undefined : {y: parallaxY}}
      className="hidden xl:block pointer-events-none absolute inset-0 z-20"
    >
      {/* Top-Left Figma Canvas Frame Badge */}
      <div className="pointer-events-auto absolute top-14 left-4 xl:left-10">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={-6}
          ariaLabel="Drag Figma Frame sticker"
        >
          <FigmaFrameSticker label="Frame 01 · Hero Cut" bg="#7C3AED" textColor="#FFFFFF" />
        </DraggableSticker>
      </div>

      {/* Top-Right Rotating Studio Stamp */}
      <div className="pointer-events-auto absolute top-10 right-6 xl:right-12">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={8}
          ariaLabel="Drag rotating studio stamp"
        >
          <SpinningStampBadge
            ringText="DMS PORTO · CINEMA · GRADE · CUT · "
            centerText="2026"
            bg="#FF4D8D"
            size={104}
          />
        </DraggableSticker>
      </div>

      {/* Mid-Left Starburst Spec Sticker */}
      <div className="pointer-events-auto absolute top-[54%] left-2 xl:left-6">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={-11}
          ariaLabel="Drag 24FPS RAW starburst sticker"
        >
          <StarburstSticker
            label="24FPS"
            sublabel="12-BIT"
            fill="#FFE600"
            textColor="#09090B"
            size={96}
          />
        </DraggableSticker>
      </div>

      {/* Mid-Right Chunky Directional Arrow & Lime Stamp */}
      <div className="pointer-events-auto absolute top-[48%] right-2 xl:right-6 flex flex-col items-end gap-3">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={7}
          ariaLabel="Drag chunky lime arrow sticker"
        >
          <ChunkyArrowSticker fill="#B8FF3B" direction="down-left" size={68} />
        </DraggableSticker>

        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={-4}
          ariaLabel="Drag DaVinci Wide Gamut sticker"
        >
          <div className="brutal-card rounded-xl px-3.5 py-2 bg-[#B8FF3B] text-[#09090B]">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider">
              Color Science
            </span>
            <span className="block font-display text-xs font-extrabold">
              Rec.709-A Finish
            </span>
          </div>
        </DraggableSticker>
      </div>
    </motion.div>
  );
}
