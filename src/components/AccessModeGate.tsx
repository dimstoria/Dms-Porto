import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowUpRight, Code2, Eye, KeyRound, Lock, RotateCcw} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useDevMedia} from '../context/DevMediaContext';
import dmsPortoLogo from '../assets/dms-porto-logo.png';
import {
  CUBIC_EASE,
  CUBIC_EMPHASIS,
  CUBIC_MICRO,
  CUBIC_TACTILE,
  MOTION_DURATIONS,
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
}

export function AccessModeGate({
  entranceStage,
  entranceRunId,
  onSkipEntrance,
  onReplayEntrance,
}: AccessModeGateProps) {
  const {accessRole, enterGuestMode, unlockDeveloperMode} = useDevMedia();
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exitingRole, setExitingRole] = useState<'guest' | 'developer' | null>(null);
  const pinFieldRef = useRef<HTMLInputElement | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (step === 'pin') {
      const id = window.setTimeout(() => pinFieldRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [step]);

  useEffect(() => {
    if (accessRole === 'pending') {
      setStep('select');
      setPinInput('');
      setErrorMsg('');
      setExitingRole(null);
    }
  }, [accessRole]);

  useEffect(() => {
    if (accessRole !== 'pending' || step !== 'pin') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setStep('select');
        setPinInput('');
        setErrorMsg('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accessRole, step]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  if (accessRole !== 'pending') return null;

  const isGateVisible =
    entranceStage === 'container' ||
    entranceStage === 'cards' ||
    entranceStage === 'interactive';
  const areCardsVisible =
    entranceStage === 'cards' || entranceStage === 'interactive';
  const isInteractive = entranceStage === 'interactive';
  const isSettled = !exitingRole;

  const triggerEntranceTransition = (role: 'guest' | 'developer') => {
    if (exitingRole) return;
    setExitingRole(role);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      if (role === 'guest') {
        enterGuestMode();
      } else {
        setExitingRole(null);
      }
      return;
    }

    if (role === 'guest') {
      transitionTimerRef.current = window.setTimeout(() => {
        enterGuestMode();
      }, 420);
    }
  };

  const handleSelectGuest = () => {
    if (!isInteractive) {
      onSkipEntrance();
    }
    triggerEntranceTransition('guest');
  };

  const handleSelectDevMode = () => {
    if (!isInteractive) {
      onSkipEntrance();
    }
    setStep('pin');
  };

  const handleDigitPress = (digit: string) => {
    if (!isSettled) return;
    if (pinInput.length >= 8) return;
    setErrorMsg('');
    setPinInput((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (!isSettled) return;
    setErrorMsg('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleSubmitPin = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!pinInput.trim() || !isSettled || submitting) return;

    setSubmitting(true);
    setErrorMsg('');
    const ok = await unlockDeveloperMode(pinInput);
    setSubmitting(false);

    if (!ok) {
      setErrorMsg('PIN salah. Akses ditolak.');
      setPinInput('');
      return;
    }

    setStep('select');
  };

  const stageAtLeastLogo =
    entranceStage === 'logo' ||
    entranceStage === 'container' ||
    entranceStage === 'cards' ||
    entranceStage === 'interactive';

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Pilih mode akses website"
      initial={false}
      animate={{
        opacity: exitingRole ? 0 : 1,
      }}
      transition={{duration: 0.42, ease: CUBIC_EMPHASIS}}
      onClick={() => {
        if (!isInteractive && !exitingRole) {
          onSkipEntrance();
        }
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#FFFDF5]"
    >
      {/* Maximalist Graph Grid + Halftone Corner Patches */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-brutal-grid opacity-85" />
        <div className="hidden sm:block absolute -top-12 -left-12 h-52 w-52 rotate-12 rounded-3xl bg-[#FFE600] border-[3px] border-[#09090B]" />
        <div className="hidden sm:block absolute -bottom-16 -right-12 h-56 w-56 rounded-full bg-[#7C3AED] border-[3px] border-[#09090B]" />
        <div className="hidden md:block absolute top-16 right-14 h-36 w-36 bg-brutal-halftone opacity-75" />
        <div className="hidden md:block absolute bottom-20 left-12 px-4 py-2 -rotate-6 rounded-full bg-[#FF4D8D] border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] font-mono text-xs font-bold text-[#09090B]">
          DMS PORTO · 2026
        </div>
      </div>

      {/* Bright Yellow Brutalist Expansion Curtain on Guest Exit */}
      <AnimatePresence>
        {exitingRole && (
          <motion.div
            key={`entrance-curtain-${exitingRole}`}
            aria-hidden="true"
            initial={{scale: 0.2, opacity: 0.95}}
            animate={{scale: 4.5, opacity: 0}}
            transition={{duration: 0.44, ease: CUBIC_EMPHASIS}}
            className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-[#FFE600] border-4 border-[#09090B]"
          />
        )}
      </AnimatePresence>

      {/* Scene 2 Standalone Centered Brand Mark */}
      {!isGateVisible && (
        <div className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            key={`standalone-logo-${entranceRunId}`}
            initial={{opacity: 0, y: 18, scale: 0.94}}
            animate={
              stageAtLeastLogo
                ? {opacity: 1, y: 0, scale: 1}
                : {opacity: 0, y: 18, scale: 0.94}
            }
            transition={{duration: 0.42, ease: CUBIC_EMPHASIS}}
            className="brutal-card-elevated inline-flex items-center justify-center rounded-2xl bg-[#FFE600] px-7 py-5"
          >
            <img
              src={dmsPortoLogo}
              alt="dms porto"
              width={471}
              height={253}
              className="block h-11 sm:h-12 w-auto object-contain select-none"
            />
          </motion.div>
        </div>
      )}

      {/* Main Neo-Brutalist Access Container */}
      <motion.div
        key={`access-container-${entranceRunId}`}
        initial={false}
        animate={
          exitingRole
            ? {opacity: 0, y: -12, scale: 0.97}
            : isGateVisible
              ? {opacity: 1, y: 0, scale: 1}
              : {opacity: 0, y: 16, scale: 0.95}
        }
        transition={{duration: 0.36, ease: CUBIC_EMPHASIS}}
        className={`z-10 w-full max-w-lg ${
          isGateVisible
            ? 'relative my-auto pointer-events-auto'
            : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0'
        }`}
      >
        <div className="brutal-card-elevated relative rounded-3xl bg-[#FFFDF5] p-6 sm:p-8 flex flex-col gap-6">
          {/* Playful Top-Right Corner Tag */}
          <span
            aria-hidden="true"
            className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-[#B8FF3B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] font-mono text-[10px] font-bold uppercase text-[#09090B] rotate-3 absolute -top-3.5 right-6"
          >
            Access Gate
          </span>

          <div className="flex flex-col items-center text-center gap-3 pt-1">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] px-6 py-3">
              <img
                src={dmsPortoLogo}
                alt="dms porto"
                width={471}
                height={253}
                className="block h-8 sm:h-9 w-auto object-contain select-none"
              />
            </div>

            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-[1.85rem] font-extrabold tracking-tight text-[#09090B]">
                Pilih Mode Akses
              </h1>
              <p className="text-xs sm:text-sm font-sans text-[#3F3F46] max-w-sm mx-auto leading-relaxed">
                Masuk sebagai tamu untuk melihat karya film, atau masuk sebagai studio owner dengan PIN.
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'select' ? (
              <motion.div
                key="gate-select"
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -8}}
                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* Just Guest Card: Bright Yellow */}
                <motion.button
                  type="button"
                  initial={false}
                  animate={
                    areCardsVisible ? {opacity: 1, y: 0, scale: 1} : {opacity: 0, y: 12, scale: 0.96}
                  }
                  whileHover={{y: -3, x: -2}}
                  whileTap={{scale: 0.98, y: 2, x: 2}}
                  transition={CUBIC_TACTILE}
                  onClick={handleSelectGuest}
                  className="group relative rounded-2xl bg-[#FFE600] text-[#09090B] border-[2.5px] border-[#09090B] shadow-[5px_5px_0_#09090B] hover:shadow-[7px_7px_0_#09090B] p-5 text-left space-y-4 transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B]">
                      <Eye className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-[#09090B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.25} />
                  </div>

                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-white border border-[#09090B] text-[10px] font-mono font-bold text-[#09090B] uppercase tracking-wider">
                      Public Access
                    </span>
                    <h2 className="font-display text-lg font-extrabold tracking-tight text-[#09090B] pt-1">
                      Just Guest
                    </h2>
                    <p className="text-xs font-sans text-[#09090B]/85 leading-relaxed">
                      Jelajahi showreel, grading slider, timeline cutdown, dan The Agent 3D.
                    </p>
                  </div>
                </motion.button>

                {/* Dev Mode Card: Electric Purple */}
                <motion.button
                  type="button"
                  initial={false}
                  animate={
                    areCardsVisible ? {opacity: 1, y: 0, scale: 1} : {opacity: 0, y: 12, scale: 0.96}
                  }
                  whileHover={{y: -3, x: -2}}
                  whileTap={{scale: 0.98, y: 2, x: 2}}
                  transition={{...CUBIC_TACTILE, delay: areCardsVisible && !isInteractive ? 0.08 : 0}}
                  onClick={handleSelectDevMode}
                  className="group relative rounded-2xl bg-[#7C3AED] text-white border-[2.5px] border-[#09090B] shadow-[5px_5px_0_#09090B] hover:shadow-[7px_7px_0_#09090B] p-5 text-left space-y-4 transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600]"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B]">
                      <Code2 className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF4D8D] border-2 border-[#09090B] text-[10px] font-mono font-bold text-[#09090B]">
                      <Lock className="w-3 h-3" strokeWidth={2} />
                      <span>PIN</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#09090B] text-[10px] font-mono font-bold text-[#FFE600] uppercase tracking-wider">
                      Studio Owner
                    </span>
                    <h2 className="font-display text-lg font-extrabold tracking-tight text-white pt-1">
                      Dev Mode
                    </h2>
                    <p className="text-xs font-sans text-white/90 leading-relaxed">
                      Kelola slot foto/video portofolio dan inbox project brief dengan PIN.
                    </p>
                  </div>
                </motion.button>
              </motion.div>
            ) : (
              <motion.form
                key="gate-pin"
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -8}}
                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                onSubmit={handleSubmitPin}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('select');
                      setPinInput('');
                      setErrorMsg('');
                    }}
                    className="brutal-button inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-mono font-bold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Kembali</span>
                  </button>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C3AED] border-2 border-[#09090B] text-xs font-mono font-bold text-white">
                    <KeyRound className="w-3.5 h-3.5 text-[#FFE600]" strokeWidth={2} />
                    <span>PIN Owner</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    ref={pinFieldRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => {
                      setErrorMsg('');
                      setPinInput(e.target.value.replace(/\D/g, ''));
                    }}
                    placeholder="Masukkan 4 digit PIN"
                    aria-label="PIN Owner"
                    className="brutal-input w-full h-12 rounded-xl px-4 text-center font-mono font-bold text-lg tracking-[0.4em] focus:outline-none"
                  />
                  {errorMsg && (
                    <motion.p
                      role="alert"
                      initial={{opacity: 0, y: -4}}
                      animate={{opacity: 1, y: 0}}
                      transition={CUBIC_MICRO}
                      className="rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] px-3 py-1.5 text-xs font-mono font-bold text-[#09090B] text-center"
                    >
                      {errorMsg}
                    </motion.p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigitPress(digit)}
                      className="brutal-button h-11 rounded-xl font-mono text-sm font-bold cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="brutal-button h-11 rounded-xl bg-[#FCE7F3] font-mono text-xs font-bold cursor-pointer"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDigitPress('0')}
                    className="brutal-button h-11 rounded-xl font-mono text-sm font-bold cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="submit"
                    disabled={!pinInput.trim() || submitting}
                    className="brutal-cta h-11 rounded-xl font-mono text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {submitting ? '...' : 'Masuk'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="pt-3 border-t-[2.5px] border-[#09090B] flex items-center justify-between text-[11px] font-mono font-bold text-[#3F3F46]">
            <span>Dimstoria Studio · Jakarta</span>
            <button
              type="button"
              onClick={onReplayEntrance}
              className="inline-flex items-center gap-1 hover:text-[#7C3AED] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2} />
              <span>Replay intro</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
