export const CUBIC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const CUBIC_EMPHASIS: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const CUBIC_IN_OUT: [number, number, number, number] = [0.76, 0, 0.24, 1];
export const CUBIC_OVERSHOOT: [number, number, number, number] = [0.34, 1.45, 0.64, 1];

export const MOTION_DURATIONS = {
  micro: 0.16,
  standard: 0.24,
  macro: 0.36,
  choreo: 0.52,
} as const;

export const LIQUID_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 26,
  mass: 0.72,
};

export const LIQUID_SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 30,
  mass: 0.6,
};

export const LIQUID_SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 24,
  mass: 0.85,
};

export const CUBIC_TACTILE = LIQUID_SPRING_SNAPPY;

export const CUBIC_MICRO = {
  duration: MOTION_DURATIONS.micro,
  ease: CUBIC_EASE,
} as const;

export const CUBIC_INDICATOR = LIQUID_SPRING;
