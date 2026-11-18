import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  Eye,
  EyeOff,
  Lock,
  Play,
  RotateCcw,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useDevMedia} from '../context/DevMediaContext';
import dmsPortoLogo from '../assets/dms-porto-logo.png';
import {
  CUBIC_EASE,
  CUBIC_EMPHASIS,
  CUBIC_OVERSHOOT,
  LIQUID_SPRING,
  LIQUID_SPRING_SNAPPY,
} from '../lib/motion';

export type EntranceStage =
  | 'backdrop'
  | 'logo'
  | 'container'
  | 'cards'
  | 'interactive';

interface AccessModeGateProps {
  entranceStage: EntranceStage;
  entranceRunId: number;
  onSkipEntrance: () => void;
  onReplayEntrance: () => void;
  onEnterComplete?: () => void;
}

type GuestStage = 'idle' | 'select' | 'expand' | 'exit-frame' | 'dark-cover';

interface ExpansionMetrics {
  cardInset: string;
  containerInset: string;
}

export function AccessModeGate({
  entranceStage,
  entranceRunId,
  onSkipEntrance,
  onReplayEntrance,
  onEnterComplete,
}: AccessModeGateProps) {
  const {accessRole, enterGuestMode, unlockDeveloperMode} = useDevMedia();

  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [pinValue, setPinValue] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  const [guestHovered, setGuestHovered] = useState(false);
  const [devHovered, setDevHovered] = useState(false);
  const [guestStage, setGuestStage] = useState<GuestStage>('idle');
  const [expansionMetrics, setExpansionMetrics] = useState<ExpansionMetrics | null>(
    null,
  );

  const [logoCenterOffsetY, setLogoCenterOffsetY] = useState(145);

  const gateRootRef = useRef<HTMLDivElement | null>(null);
  const logoAnchorRef = useRef<HTMLDivElement | null>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const guestCardRef = useRef<HTMLButtonElement | null>(null);
  const guestTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (accessRole === 'pending') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [accessRole]);

  useLayoutEffect(() => {
    if (accessRole !== 'pending') return;

    const measure = () => {
      const rootEl = gateRootRef.current;
      const anchorEl = logoAnchorRef.current;
      if (!rootEl || !anchorEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const rootCenterY = rootRect.top + rootRect.height / 2;
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      setLogoCenterOffsetY(Math.max(0, Math.round(rootCenterY - anchorCenterY)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (gateRootRef.current) ro.observe(gateRootRef.current);
    if (logoAnchorRef.current) ro.observe(logoAnchorRef.current);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [accessRole, step]);

  useEffect(() => {
    if (entranceStage === 'backdrop') {
      setGuestHovered(false);
      setDevHovered(false);
    }
  }, [entranceStage]);

  useEffect(() => {
    if (step === 'pin' && accessRole === 'pending') {
      const timer = window.setTimeout(() => {
        pinInputRef.current?.focus();
      }, 160);
      return () => window.clearTimeout(timer);
    }
  }, [step, accessRole]);

  useEffect(() => {
    return () => {
      guestTimersRef.current.forEach((id) => window.clearTimeout(id));
      guestTimersRef.current = [];
    };
  }, []);

  const handleChooseGuest = (_event?: MouseEvent<HTMLButtonElement>) => {
    if (guestStage !== 'idle') return;
    if (step === 'select' && !showCards) return;

    if (step !== 'select') {
      enterGuestMode();
      onEnterComplete?.();
      return;
    }

    const cardEl = guestCardRef.current;
    const boxEl = containerRef.current;
    if (!cardEl || !boxEl) {
      enterGuestMode();
      onEnterComplete?.();
      return;
    }

    const cardRect = cardEl.getBoundingClientRect();
    const boxRect = boxEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const toInset = (rect: DOMRect, radius: number) =>
      `inset(${Math.max(0, Math.round(rect.top))}px ${Math.max(
        0,
        Math.round(vw - rect.right),
      )}px ${Math.max(0, Math.round(vh - rect.bottom))}px ${Math.max(
        0,
        Math.round(rect.left),
      )}px round ${radius}px)`;

    setExpansionMetrics({
      cardInset: toInset(cardRect, 22),
      containerInset: toInset(boxRect, 30),
    });

    setGuestStage('select');

    const tExpand = window.setTimeout(() => {
      setGuestStage('expand');
    }, 150);

    const tExitFrame = window.setTimeout(() => {
      setGuestStage('exit-frame');
    }, 420);

    const tDarkCover = window.setTimeout(() => {
      setGuestStage('dark-cover');
    }, 560);

    const tEnter = window.setTimeout(() => {
      enterGuestMode();
      onEnterComplete?.();
    }, 1240);

    guestTimersRef.current = [tExpand, tExitFrame, tDarkCover, tEnter];
  };

  const attemptUnlock = async (candidate: string) => {
    if (isVerifyingPin) return;
    setIsVerifyingPin(true);
    try {
      const ok = await unlockDeveloperMode(candidate);
      if (ok) {
        setPinError(false);
        onEnterComplete?.();
        return;
      }
      setPinError(true);
      setShakeCount((c) => c + 1);
      setPinValue('');
      pinInputRef.current?.focus();
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handlePinChange = (raw: string) => {
    if (isVerifyingPin) return;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 4);
    setPinError(false);
    setPinValue(digitsOnly);
    if (digitsOnly.length === 4) {
      window.setTimeout(() => {
        void attemptUnlock(digitsOnly);
      }, 90);
    }
  };

  const handleSubmitPin = (e: FormEvent) => {
    e.preventDefault();
    if (pinValue.length === 0 || isVerifyingPin) return;
    void attemptUnlock(pinValue);
  };

  const showLogo = entranceStage !== 'backdrop';
  const showContainer =
    entranceStage === 'container' ||
    entranceStage === 'cards' ||
    entranceStage === 'interactive';
  const showCards =
    entranceStage === 'cards' || entranceStage === 'interactive';
  const isSequencePlaying = !showCards;
  const isLeavingFrame = guestStage === 'exit-frame' || guestStage === 'dark-cover';
  const isExpanding =
    guestStage === 'expand' ||
    guestStage === 'exit-frame' ||
    guestStage === 'dark-cover';

  return (
    <AnimatePresence>
      {accessRole === 'pending' && (
        <motion.div
          ref={gateRootRef}
          key="access-mode-gate"
          initial={{opacity: 1}}
          animate={{opacity: 1}}
          exit={{
            opacity: 0,
            transition: {duration: 0.42, ease: CUBIC_EASE},
          }}
          transition={{duration: 0.3, ease: CUBIC_EASE}}
          onClick={isSequencePlaying ? onSkipEntrance : undefined}
          role="dialog"
          aria-modal="true"
          aria-label="Dimstoria Portofolio entry mode selector"
          className={`fixed inset-0 z-[100] bg-[#FFFDF5] text-[#09090B] flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto overflow-x-hidden ${
            isSequencePlaying ? 'cursor-pointer' : ''
          }`}
        >
          {/* Scene 1: Warm Cream Graph-Grid & Halftone Collage Backdrop */}
          <motion.div
            key={`scene-backdrop-${entranceRunId}`}
            aria-hidden="true"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.45, ease: CUBIC_EASE}}
            className="pointer-events-none fixed inset-0 bg-[#FFFDF5] bg-brutal-grid"
          />

          {/* Scene 3: Playful Neo-Brutalist Collage Corner Patches */}
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{opacity: showContainer ? 1 : 0.35}}
            transition={{duration: 0.5, ease: CUBIC_EASE}}
            className="pointer-events-none fixed inset-0 overflow-hidden"
          >
            <div className="hidden sm:block absolute -top-20 -left-16 h-64 w-64 rounded-full bg-[#FFE600] border-[3px] border-[#09090B] bg-brutal-halftone" />
            <div className="hidden sm:block absolute -bottom-24 -right-16 h-72 w-72 rotate-12 rounded-3xl bg-[#FF4D8D] border-[3px] border-[#09090B] bg-brutal-halftone" />
            <div className="hidden lg:block absolute top-16 right-12 px-3 py-1.5 rotate-6 bg-[#B8FF3B] border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] font-mono text-xs font-bold text-[#09090B]">
              24FPS · CINEMA STUDIO
            </div>
            <div className="hidden lg:block absolute bottom-14 left-12 px-3 py-1.5 -rotate-6 bg-[#7C3AED] text-white border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] font-mono text-xs font-bold">
              REEL &apos;26 · JAKARTA
            </div>
          </motion.div>

          <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-8">
            <div ref={logoAnchorRef} className="mb-5 sm:mb-6 flex justify-center">
              <motion.div
                initial={false}
                animate={
                  isLeavingFrame
                    ? {opacity: 0, y: -32, scale: 0.96}
                    : showContainer
                      ? {opacity: 1, y: 0, scale: 1}
                      : showLogo
                        ? {opacity: 1, y: logoCenterOffsetY, scale: 1}
                        : {opacity: 0, y: logoCenterOffsetY + 26, scale: 1}
                }
                transition={{
                  duration: isLeavingFrame ? 0.24 : 0.36,
                  ease: CUBIC_EASE,
                }}
                className="relative text-center select-none"
              >
                <div className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-white border-[3px] border-[#09090B] shadow-[5px_5px_0_#09090B]">
                  <img
                    src={dmsPortoLogo}
                    alt="dms porto"
                    width={471}
                    height={253}
                    draggable={false}
                    className="h-12 sm:h-16 w-auto object-contain"
                  />
                </div>
              </motion.div>
            </div>

            <div className="w-full">
              <AnimatePresence mode="wait" initial={false}>
                {step === 'select' ? (
                  <motion.div
                    ref={containerRef}
                    key="dominant-tabs"
                    initial={false}
                    animate={
                      isLeavingFrame
                        ? {opacity: 0, y: -24, scale: 0.98}
                        : showContainer
                          ? {opacity: 1, y: 0, scale: 1}
                          : {opacity: 0, y: 24, scale: 0.95}
                    }
                    exit={{opacity: 0, y: -8, transition: {duration: 0.24, ease: CUBIC_EASE}}}
                    transition={
                      isLeavingFrame
                        ? {duration: 0.24, ease: CUBIC_EASE}
                        : {duration: 0.36, ease: CUBIC_OVERSHOOT}
                    }
                    className="brutal-card-elevated rounded-3xl p-4 sm:p-6 space-y-5"
                  >
                    <motion.div
                      initial={false}
                      animate={
                        isExpanding
                          ? {opacity: 0, y: -6}
                          : showContainer
                            ? {opacity: 1, y: 0}
                            : {opacity: 0, y: 6}
                      }
                      transition={{
                        duration: 0.24,
                        delay: showContainer && !isExpanding ? 0.1 : 0,
                        ease: CUBIC_EASE,
                      }}
                      className="flex flex-wrap items-center justify-between gap-2 px-1"
                    >
                      <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#09090B]">
                        <span className="inline-block h-2.5 w-2.5 bg-[#FF4D8D] border border-[#09090B]" />
                        Select Studio Access
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="hidden sm:inline text-xs font-medium text-zinc-600">
                          Choose a mode to continue
                        </span>
                        <motion.button
                          type="button"
                          whileHover={{scale: 1.03}}
                          whileTap={{scale: 0.95}}
                          transition={LIQUID_SPRING_SNAPPY}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReplayEntrance();
                          }}
                          disabled={guestStage !== 'idle'}
                          aria-label="Replay opening animation"
                          title="Replay opening animation"
                          className="brutal-button inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[30px] px-3 rounded-xl text-[11px] font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Replay</span>
                        </motion.button>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Card 1: Just Guest (Bright Dopamine Yellow) */}
                      <motion.div
                        initial={false}
                        animate={
                          showCards
                            ? {opacity: 1, y: 0}
                            : {opacity: 0, y: 20}
                        }
                        transition={{duration: 0.36, ease: CUBIC_EASE}}
                        className="relative"
                      >
                        <motion.button
                          ref={guestCardRef}
                          type="button"
                          onMouseEnter={() => setGuestHovered(true)}
                          onMouseLeave={() => setGuestHovered(false)}
                          onFocus={() => setGuestHovered(true)}
                          onBlur={() => setGuestHovered(false)}
                          onClick={(e) => handleChooseGuest(e)}
                          disabled={guestStage !== 'idle'}
                          animate={
                            guestStage === 'select'
                              ? {scale: 0.975, y: 2}
                              : isExpanding
                                ? {opacity: 0, scale: 1}
                                : guestHovered && guestStage === 'idle'
                                  ? {y: -3, rotate: -0.6}
                                  : {y: 0, rotate: 0}
                          }
                          transition={
                            guestStage === 'select'
                              ? LIQUID_SPRING_SNAPPY
                              : LIQUID_SPRING
                          }
                          className="group relative overflow-hidden w-full h-full flex flex-col justify-between min-h-[168px] sm:min-h-[200px] rounded-2xl bg-[#FFE600] border-[3px] border-[#09090B] text-[#09090B] p-5 sm:p-6 text-left shadow-[6px_6px_0_#09090B] hover:shadow-[8px_8px_0_#09090B] transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                        >
                          <motion.div
                            initial={false}
                            animate={
                              showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 10}
                            }
                            transition={{
                              duration: 0.24,
                              delay: showCards ? 0.06 : 0,
                              ease: CUBIC_EASE,
                            }}
                            className="relative z-10 flex items-center justify-between w-full"
                          >
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white border-[2.5px] border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B]">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </span>

                            <motion.span
                              aria-hidden="true"
                              animate={
                                guestHovered && guestStage === 'idle'
                                  ? {x: 3, y: -3, scale: 1.08}
                                  : {x: 0, y: 0, scale: 1}
                              }
                              transition={LIQUID_SPRING}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#09090B] text-[#FFE600]"
                            >
                              <ArrowUpRight className="w-5 h-5" />
                            </motion.span>
                          </motion.div>

                          <div className="relative z-10 space-y-1.5 pt-6">
                            <motion.div
                              initial={false}
                              animate={
                                showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 10}
                              }
                              transition={{
                                duration: 0.24,
                                delay: showCards ? 0.12 : 0,
                                ease: CUBIC_EASE,
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#09090B]">
                                Just Guest
                              </span>
                            </motion.div>
                            <motion.p
                              initial={false}
                              animate={
                                showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 8}
                              }
                              transition={{
                                duration: 0.24,
                                delay: showCards ? 0.18 : 0,
                                ease: CUBIC_EASE,
                              }}
                              className="text-xs sm:text-[13px] font-medium text-[#09090B]/90 leading-relaxed"
                            >
                              Watch the showreel, selected films, color grading &amp;
                              timeline edit breakdowns.
                            </motion.p>
                          </div>
                        </motion.button>
                      </motion.div>

                      {/* Card 2: Dev Mode (Electric Purple with Yellow PIN Badge) */}
                      <motion.div
                        initial={false}
                        animate={
                          isExpanding
                            ? {opacity: 0, y: 22, scale: 0.96}
                            : showCards
                              ? {opacity: 1, y: 0, scale: 1}
                              : {opacity: 0, y: 20, scale: 1}
                        }
                        transition={{
                          duration: isExpanding ? 0.24 : 0.36,
                          delay: isExpanding ? 0 : showCards ? 0.15 : 0,
                          ease: CUBIC_EASE,
                        }}
                        className="relative"
                      >
                        <motion.button
                          type="button"
                          onMouseEnter={() => setDevHovered(true)}
                          onMouseLeave={() => setDevHovered(false)}
                          onFocus={() => setDevHovered(true)}
                          onBlur={() => setDevHovered(false)}
                          whileTap={guestStage === 'idle' && showCards ? {scale: 0.975} : undefined}
                          disabled={guestStage !== 'idle'}
                          onClick={() => {
                            if (!showCards) return;
                            setPinError(false);
                            setPinValue('');
                            setStep('pin');
                          }}
                          animate={
                            devHovered && guestStage === 'idle'
                              ? {y: -3, rotate: 0.6}
                              : {y: 0, rotate: 0}
                          }
                          transition={LIQUID_SPRING}
                          className="group relative w-full h-full flex flex-col justify-between min-h-[168px] sm:min-h-[200px] rounded-2xl bg-[#7C3AED] border-[3px] border-[#09090B] text-white p-5 sm:p-6 text-left shadow-[6px_6px_0_#09090B] hover:shadow-[8px_8px_0_#09090B] transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600]"
                        >
                          <motion.div
                            initial={false}
                            animate={
                              showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 10}
                            }
                            transition={{
                              duration: 0.24,
                              delay: showCards ? 0.21 : 0,
                              ease: CUBIC_EASE,
                            }}
                            className="flex items-center justify-between w-full"
                          >
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white border-[2.5px] border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B]">
                              <motion.span
                                aria-hidden="true"
                                animate={
                                  devHovered && guestStage === 'idle'
                                    ? {rotate: 12, scale: 1.06}
                                    : {rotate: 0, scale: 1}
                                }
                                transition={LIQUID_SPRING}
                                className="inline-flex items-center justify-center"
                              >
                                <Code2 className="w-4 h-4" />
                              </motion.span>
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] px-2.5 py-1 text-[10px] font-mono font-bold text-[#09090B]">
                              <Lock className="w-3 h-3" />
                              <span>PIN</span>
                            </span>
                          </motion.div>

                          <div className="space-y-1.5 pt-6">
                            <motion.span
                              initial={false}
                              animate={
                                showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 10}
                              }
                              transition={{
                                duration: 0.24,
                                delay: showCards ? 0.27 : 0,
                                ease: CUBIC_EASE,
                              }}
                              className="block font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white"
                            >
                              Dev Mode
                            </motion.span>
                            <motion.p
                              initial={false}
                              animate={
                                showCards ? {opacity: 1, y: 0} : {opacity: 0, y: 8}
                              }
                              transition={{
                                duration: 0.24,
                                delay: showCards ? 0.33 : 0,
                                ease: CUBIC_EASE,
                              }}
                              className="text-xs sm:text-[13px] font-medium text-white/95 leading-relaxed"
                            >
                              Studio owner access to swap photos, showreel, &amp;
                              review client briefs.
                            </motion.p>
                          </div>
                        </motion.button>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="pin-panel"
                    onSubmit={handleSubmitPin}
                    initial={{opacity: 0, y: 12, scale: 0.98}}
                    animate={{opacity: 1, y: 0, scale: 1}}
                    exit={{opacity: 0, y: -8, scale: 0.98}}
                    transition={LIQUID_SPRING}
                    className="brutal-card-elevated max-w-md mx-auto rounded-3xl p-6 sm:p-8 space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setPinError(false);
                          setPinValue('');
                          setStep('select');
                        }}
                        className="brutal-button inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 rounded-xl text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <span className="px-2.5 py-1 rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B]">
                        Studio PIN
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#09090B]">
                        Unlock Dev Mode
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-700 font-medium">
                        Enter the 4-digit studio PIN to enable live media &amp; inbox access.
                      </p>
                    </div>

                    <motion.div
                      key={shakeCount}
                      animate={
                        shakeCount > 0 && pinError
                          ? {x: [0, -8, 8, -5, 5, 0]}
                          : {x: 0}
                      }
                      transition={{duration: 0.36, ease: CUBIC_EASE}}
                      className="space-y-2.5"
                    >
                      <div
                        onClick={() => pinInputRef.current?.focus()}
                        className="relative grid grid-cols-4 gap-3 cursor-text"
                      >
                        {[0, 1, 2, 3].map((slotIdx) => {
                          const char = pinValue[slotIdx] ?? '';
                          const isCurrent = pinValue.length === slotIdx;
                          return (
                            <div
                              key={slotIdx}
                              className={`h-14 rounded-xl border-[2.5px] border-[#09090B] flex items-center justify-center text-lg font-mono font-bold transition-all ${
                                pinError
                                  ? 'bg-[#FF4D8D] text-[#09090B] shadow-[3px_3px_0_#09090B]'
                                  : char
                                    ? 'bg-[#FFE600] text-[#09090B] shadow-[4px_4px_0_#09090B]'
                                    : isCurrent
                                      ? 'bg-[#EDE9FE] text-[#09090B] shadow-[4px_4px_0_#7C3AED]'
                                      : 'bg-white text-zinc-400 shadow-[3px_3px_0_#09090B]'
                              }`}
                            >
                              {char ? (showPin ? char : '•') : ''}
                            </div>
                          );
                        })}

                        <input
                          ref={pinInputRef}
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={4}
                          value={pinValue}
                          onChange={(e) => handlePinChange(e.target.value)}
                          aria-label="Enter 4-digit Dev Mode PIN"
                          className="absolute inset-0 opacity-0 w-full h-full text-base cursor-text"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs min-h-[20px]">
                        {pinError ? (
                          <span role="alert" className="font-mono font-bold text-[#E11D48]">
                            Incorrect PIN. Please try again.
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-zinc-600">
                            Enter 4-digit studio PIN
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          className="inline-flex items-center gap-1 min-h-[44px] px-2 -mr-2 rounded-lg text-[11px] font-mono font-bold text-[#09090B] hover:text-[#7C3AED] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                        >
                          {showPin ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Show</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>

                    <div className="flex flex-col gap-2.5 pt-1">
                      <motion.button
                        type="submit"
                        whileTap={{scale: 0.975}}
                        transition={LIQUID_SPRING_SNAPPY}
                        disabled={pinValue.length < 4 || isVerifyingPin}
                        className="brutal-cta w-full h-12 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wide cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        {isVerifyingPin ? 'Verifying PIN...' : 'Unlock Dev Mode'}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => handleChooseGuest()}
                        className="w-full min-h-[44px] py-2 rounded-xl text-xs font-mono font-bold text-zinc-700 hover:text-[#09090B] underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Or continue as Just Guest
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {isExpanding && expansionMetrics && (
            <motion.div
              aria-hidden="true"
              initial={{clipPath: expansionMetrics.cardInset}}
              animate={{
                clipPath:
                  guestStage === 'dark-cover'
                    ? 'inset(0px 0px 0px 0px round 0px)'
                    : expansionMetrics.containerInset,
              }}
              transition={{
                duration: guestStage === 'dark-cover' ? 0.36 : 0.24,
                ease: CUBIC_EMPHASIS,
              }}
              className="pointer-events-none fixed inset-0 z-40 bg-[#FFE600] bg-brutal-grid flex items-center justify-center"
            >
              <motion.div
                initial={{opacity: 0, scale: 0.92, y: 8}}
                animate={
                  guestStage === 'dark-cover'
                    ? {opacity: 1, scale: 1, y: 0}
                    : {opacity: 0, scale: 0.92, y: 8}
                }
                transition={{
                  duration: 0.24,
                  delay: guestStage === 'dark-cover' ? 0.1 : 0,
                  ease: CUBIC_EASE,
                }}
                className="flex flex-col items-center gap-5 select-none"
              >
                <div className="h-6 w-6 rounded-full border-[3px] border-[#09090B] border-t-white animate-spin" />
                <div className="px-6 py-3 rounded-2xl bg-white border-[3px] border-[#09090B] shadow-[6px_6px_0_#09090B]">
                  <img
                    src={dmsPortoLogo}
                    alt=""
                    width={471}
                    height={253}
                    draggable={false}
                    className="h-12 sm:h-14 w-auto object-contain"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
