import {type PointerEvent, type ReactNode, useRef} from 'react';
import {motion, useMotionValue, useSpring} from 'motion/react';
import {LIQUID_SPRING} from '../lib/motion';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.24,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, {stiffness: 360, damping: 20, mass: 0.42});
  const y = useSpring(rawY, {stiffness: 360, damping: 20, mass: 0.42});

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    rawX.set(Math.max(-9, Math.min(9, dx * strength)));
    rawY.set(Math.max(-7, Math.min(7, dy * strength)));
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{x, y}}
      whileHover={{scale: 1.025}}
      whileTap={{scale: 0.955}}
      transition={LIQUID_SPRING}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
