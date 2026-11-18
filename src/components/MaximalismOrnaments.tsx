import {type ReactNode, type RefObject} from 'react';
import {motion, useReducedMotion} from 'motion/react';

interface MarqueeStripProps {
  items: string[];
  variant?: 'yellow' | 'purple' | 'pink' | 'ink';
  speedSeconds?: number;
  reverse?: boolean;
  tiltClassName?: string;
}

const VARIANT_CLASSES: Record<NonNullable<MarqueeStripProps['variant']>, string> = {
  yellow: 'bg-[#FFE600] text-[#09090B]',
  purple: 'bg-[#7C3AED] text-white',
  pink: 'bg-[#FF4D8D] text-[#09090B]',
  ink: 'bg-[#09090B] text-[#FFE600]',
};

export function MarqueeStrip({
  items,
  variant = 'yellow',
  speedSeconds = 26,
  reverse = false,
  tiltClassName = '',
}: MarqueeStripProps) {
  const prefersReducedMotion = useReducedMotion();
  const track = [...items, ...items, ...items, ...items];

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden border-y-[3px] border-[#09090B] py-3 select-none ${VARIANT_CLASSES[variant]} ${tiltClassName}`}
    >
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {x: reverse ? ['-50%', '0%'] : ['0%', '-50%']}
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                repeat: Infinity,
                repeatType: 'loop',
                duration: speedSeconds,
                ease: 'linear',
              }
        }
        className="flex w-max items-center gap-6 pr-6 will-change-transform"
      >
        {track.map((text, idx) => (
          <div key={`${text}-${idx}`} className="inline-flex items-center gap-6 shrink-0">
            <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider whitespace-nowrap">
              {text}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M12 0L14.9 9.1L24 12L14.9 14.9L12 24L9.1 14.9L0 12L9.1 9.1L12 0Z" />
            </svg>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

interface DraggableStickerProps {
  children: ReactNode;
  constraintsRef?: RefObject<Element | null>;
  className?: string;
  initialRotate?: number;
  ariaLabel?: string;
}

export function DraggableSticker({
  children,
  constraintsRef,
  className = '',
  initialRotate = -6,
  ariaLabel = 'Draggable studio sticker',
}: DraggableStickerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      drag={!prefersReducedMotion}
      dragConstraints={constraintsRef}
      dragElastic={0.22}
      dragMomentum={false}
      initial={{rotate: initialRotate}}
      whileHover={{scale: 1.07, rotate: initialRotate + 4}}
      whileDrag={{scale: 1.12, rotate: 0, zIndex: 40}}
      transition={{type: 'spring', stiffness: 360, damping: 22}}
      aria-label={ariaLabel}
      title="Drag sticker"
      className={`cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StarburstSticker({
  label = '24FPS',
  sublabel = 'RAW',
  fill = '#FFE600',
  textColor = '#09090B',
  size = 92,
}: {
  label?: string;
  sublabel?: string;
  fill?: string;
  textColor?: string;
  size?: number;
}) {
  return (
    <div
      className="relative inline-flex items-center justify-center drop-shadow-[4px_4px_0_#09090B]"
      style={{width: size, height: size}}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full"
        aria-hidden="true"
      >
        <polygon
          points="50,3 60,20 79,11 76,30 96,35 83,50 96,65 76,70 79,89 60,80 50,97 40,80 21,89 24,70 4,65 17,50 4,35 24,30 21,11 40,20"
          fill={fill}
          stroke="#09090B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none"
        style={{color: textColor}}
      >
        <span className="font-mono text-[11px] font-bold tracking-tight">{label}</span>
        {sublabel && (
          <span className="font-display text-[9px] font-extrabold uppercase mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function SpinningStampBadge({
  ringText = 'DMS PORTO · CINEMA · GRADE · CUT · ',
  centerText = '2026',
  bg = '#FF4D8D',
  size = 98,
}: {
  ringText?: string;
  centerText?: string;
  bg?: string;
  size?: number;
}) {
  const pathId = `stamp-circle-${centerText.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full border-[3px] border-[#09090B] shadow-[4px_4px_0_#09090B]"
      style={{width: size, height: size, backgroundColor: bg}}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="stamp-spin-slow w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <path
            id={pathId}
            d="M 60, 60 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0"
          />
        </defs>
        <text
          fill="#09090B"
          fontSize="10.5"
          fontWeight="700"
          fontFamily="Space Mono, monospace"
          letterSpacing="1.6"
        >
          <textPath href={`#${pathId}`}>{ringText}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600] border-2 border-[#09090B] font-mono text-[11px] font-bold text-[#09090B]">
          {centerText}
        </span>
      </div>
    </div>
  );
}

export function ChunkyArrowSticker({
  fill = '#B8FF3B',
  direction = 'down-right',
  size = 64,
}: {
  fill?: string;
  direction?: 'down-right' | 'down-left';
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className={`drop-shadow-[4px_4px_0_#09090B] ${
        direction === 'down-left' ? '-scale-x-100' : ''
      }`}
    >
      <path
        d="M14 16 C34 14, 50 28, 54 52 L66 44 L58 68 L36 60 L44 52 C41 35, 29 26, 14 27 Z"
        fill={fill}
        stroke="#09090B"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FigmaFrameSticker({
  label = 'Frame 01 · Hero',
  bg = '#7C3AED',
  textColor = '#FFFFFF',
}: {
  label?: string;
  bg?: string;
  textColor?: string;
}) {
  return (
    <div className="relative inline-flex items-center px-3 py-1.5 border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] rounded-lg" style={{backgroundColor: bg, color: textColor}}>
      {/* 4 Figma corner resize squares */}
      <span className="absolute -top-1 -left-1 h-2 w-2 bg-white border border-[#09090B]" />
      <span className="absolute -top-1 -right-1 h-2 w-2 bg-white border border-[#09090B]" />
      <span className="absolute -bottom-1 -left-1 h-2 w-2 bg-white border border-[#09090B]" />
      <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-white border border-[#09090B]" />
      <span className="font-mono text-[11px] font-bold tracking-tight whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
