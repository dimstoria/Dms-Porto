import {useEffect, useState} from 'react';
import {motion, useMotionValue, useSpring} from 'motion/react';
import {LIQUID_SPRING_SNAPPY} from '../lib/motion';

export function EditorialCursor() {
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const x = useSpring(rawX, {stiffness: 460, damping: 32, mass: 0.35});
  const y = useSpring(rawY, {stiffness: 460, damping: 32, mass: 0.35});

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isFinePointer) return;

    const handleMove = (e: PointerEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);

      const target = e.target as HTMLElement | null;
      const cursorHost = target?.closest<HTMLElement>('[data-cursor]');
      const nextLabel = cursorHost?.getAttribute('data-cursor') ?? null;
      setLabel((prev) => (prev === nextLabel ? prev : nextLabel));
    };

    const handleLeaveWindow = () => {
      setLabel(null);
    };

    window.addEventListener('pointermove', handleMove, {passive: true});
    document.addEventListener('mouseleave', handleLeaveWindow);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('mouseleave', handleLeaveWindow);
    };
  }, [isFinePointer, rawX, rawY]);

  if (!isFinePointer) return null;

  const isVisible = Boolean(label);

  return (
    <motion.div
      aria-hidden="true"
      style={{x, y}}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.72,
      }}
      transition={LIQUID_SPRING_SNAPPY}
      className="pointer-events-none fixed top-0 left-0 z-50 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center rounded-xl bg-[#FFE600] border-[2.5px] border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B] px-3.5 py-1.5 text-[11px] font-mono font-bold tracking-tight whitespace-nowrap"
    >
      <span>{label}</span>
    </motion.div>
  );
}
