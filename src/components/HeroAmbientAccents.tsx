import {type RefObject} from 'react';
import {type MotionValue, motion, useTransform} from 'motion/react';
import {CUBIC_EASE} from '../lib/motion';
import {
  ChunkyArrowSticker,
  DraggableSticker,
  FigmaFrameSticker,
  SpinningStampBadge,
  StarburstSticker,
} from './MaximalismOrnaments';

interface HeroAmbientAccentsProps {
  heroScrollProgress: MotionValue<number>;
  constraintsRef?: RefObject<Element | null>;
}

export function HeroAmbientAccents({
  heroScrollProgress,
  constraintsRef,
}: HeroAmbientAccentsProps) {
  const stickerY = useTransform(heroScrollProgress, [0, 1], [0, 36]);

  return (
    <motion.div
      aria-hidden="false"
      initial={{opacity: 0, scale: 0.94}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.45, delay: 0.25, ease: CUBIC_EASE}}
      style={{y: stickerY}}
      className="hidden md:block pointer-events-none absolute inset-0 z-20"
    >
      {/* Top-left draggable Figma selection badge */}
      <div className="pointer-events-auto absolute top-8 left-4 xl:left-10">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={-5}
          ariaLabel="Drag studio frame sticker"
        >
          <FigmaFrameSticker label="Frame 01 · Drag Me" bg="#7C3AED" textColor="#FFFFFF" />
        </DraggableSticker>
      </div>

      {/* Top-right draggable bright yellow starburst */}
      <div className="pointer-events-auto absolute top-6 right-4 xl:right-12">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={10}
          ariaLabel="Drag 24FPS RAW starburst sticker"
        >
          <StarburstSticker label="24FPS" sublabel="LOG·RAW" fill="#FFE600" size={96} />
        </DraggableSticker>
      </div>

      {/* Mid-left spinning stamp badge */}
      <div className="pointer-events-auto hidden lg:block absolute top-[44%] left-3 xl:left-8">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={-8}
          ariaLabel="Drag spinning reel stamp sticker"
        >
          <SpinningStampBadge
            ringText="DMS PORTO · FILM · GRADE · CUT · "
            centerText="REEL"
            bg="#FF4D8D"
            size={96}
          />
        </DraggableSticker>
      </div>

      {/* Mid-right chunky pointing arrow sticker */}
      <div className="pointer-events-auto hidden lg:block absolute top-[41%] right-6 xl:right-14">
        <DraggableSticker
          constraintsRef={constraintsRef}
          initialRotate={8}
          ariaLabel="Drag chunky arrow sticker"
        >
          <ChunkyArrowSticker fill="#B8FF3B" direction="down-left" size={68} />
        </DraggableSticker>
      </div>
    </motion.div>
  );
}
