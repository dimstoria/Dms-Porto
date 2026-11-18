import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  ClipboardList,
  Power,
  RefreshCw,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import {
  ANTI_SLOP_AUDITS,
  STUDIO_ROOMS,
  THE_AGENTS,
  type AgentId,
  type TheAgentSpec,
} from '../data/theAgents';
import {
  useAgentContext,
  type AgentStatusState,
  type MissionActivity,
} from '../context/AgentContext';
import {AgentCharacterIcon} from './AgentCharacterIcon';
import {
  AgentStoryboardSprite,
  type StoryboardState,
} from './AgentStoryboardSprite';
import {
  IDLE_SPOT_LABEL,
  IsometricOfficeStage,
  type IdleSpot,
} from './office3d/IsometricOfficeStage';
import {GAYA_OPTIONS} from './office3d/styleKits';
import {CUBIC_EASE, CUBIC_MICRO, CUBIC_TACTILE, MOTION_DURATIONS} from '../lib/motion';
import {ensureGsapRegistered, GSAP_MEDIA, gsap} from '../lib/gsapCoordinator';

const HOVER_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 24,
  mass: 0.7,
};

type AgentLiveState = 'Active' | 'Idle';

function getAgentLiveTelemetry(
  agent: TheAgentSpec,
  agentStatus: AgentStatusState,
  currentSpot: IdleSpot,
  isPulsing: boolean,
  missionActivity: MissionActivity | null,
  isBoardDispatched: boolean,
): {state: AgentLiveState; statusText: string} {
  if (isPulsing) {
    return {state: 'Active', statusText: 'Sync pulse aktif'};
  }
  if (isBoardDispatched) {
    if (missionActivity) {
      return {
        state: 'Active',
        statusText:
          currentSpot === 'papan'
            ? missionActivity.label
            : 'menuju Mission Board',
      };
    }
    return {
      state: 'Active',
      statusText:
        currentSpot === 'papan'
          ? 'koordinasi Mission Board'
          : 'menuju Mission Board',
    };
  }
  if (agentStatus === 'idle') {
    if (currentSpot !== 'meja') {
      return {state: 'Idle', statusText: IDLE_SPOT_LABEL[currentSpot]};
    }
    return {
      state: 'Idle',
      statusText: agent.activity === 'siaga' ? agent.activityLabel : 'mode siaga',
    };
  }
  return {state: 'Active', statusText: agent.activityLabel};
}

interface AgentHoverTooltipProps {
  agent: TheAgentSpec;
  liveState: AgentLiveState;
  statusText: string;
  align?: 'start' | 'center' | 'end';
}

function AgentHoverTooltip({
  agent,
  liveState,
  statusText,
  align = 'center',
}: AgentHoverTooltipProps) {
  const isActive = liveState === 'Active';
  const edgeShiftClass =
    align === 'start'
      ? 'translate-x-10 sm:translate-x-0'
      : align === 'end'
        ? '-translate-x-10 sm:translate-x-0'
        : '';

  return (
    <motion.div
      id={`agent-tooltip-${agent.id}`}
      role="tooltip"
      initial={{opacity: 0, y: 4, scale: 0.97}}
      animate={{opacity: 1, y: 0, scale: 1}}
      exit={{opacity: 0, y: 2, scale: 0.97}}
      transition={{duration: MOTION_DURATIONS.micro, ease: CUBIC_EASE}}
      className={`pointer-events-none ${edgeShiftClass} brutal-card-elevated w-[236px] sm:w-[258px] rounded-2xl bg-white px-3.5 py-2.5 text-left`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-display font-bold text-xs text-[#09090B] truncate">
          <AgentCharacterIcon
            agentId={agent.id}
            color={agent.colors.armorMid}
            accent={agent.colors.chestRim}
            size={18}
          />
          <span className="truncate">{agent.name}</span>
        </span>
        <span
          className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wide shrink-0 border-2 border-[#09090B] ${
            isActive
              ? 'bg-[#B8FF3B] text-[#09090B]'
              : 'bg-[#F5F0E1] text-[#3F3F46]'
          }`}
        >
          {liveState}
        </span>
      </div>

      <p className="mt-1 text-[11px] font-sans font-medium text-[#3F3F46] leading-snug">
        Lantai {agent.floor} · {agent.roleTitle}
      </p>

      <div className="mt-1.5 pt-1.5 border-t-2 border-[#09090B] flex items-center justify-between gap-2 text-[11px] leading-snug text-[#09090B]">
        <span className="shrink-0 font-mono font-bold text-[10px] text-[#7C3AED] uppercase">Status</span>
        <span className="truncate font-sans font-medium">{statusText}</span>
      </div>
    </motion.div>
  );
}

export function TheAgentTab() {
  const {
    agentStates,
    activeCount,
    idleCount,
    selectedAgentId,
    activeAgent,
    hoveredAgentId,
    boardSelected,
    antiSlopAuditIndex,
    pulseProgressMap,
    agentSpots,
    setAgentSpots,
    gaya,
    setGaya,
    isMuted,
    toggleMuted,
    missionActivity,
    boardAgentIds,
    startMissionActivity,
    toggleAgentState,
    triggerGroupAction,
    hoverAgent,
    selectAgent,
    selectBoard,
    clearSelection,
  } = useAgentContext();

  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);
  const [fallbackClockSec, setFallbackClockSec] = useState<number>(0);

  const stageRootRef = useRef<HTMLElement | null>(null);
  const anchorsMapRef = useRef<Map<AgentId, HTMLElement>>(new Map());
  const boardAnchorRef = useRef<HTMLElement | null>(null);
  const anchorButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const spotCallbackRef = useRef<((spots: Partial<Record<AgentId, IdleSpot>>) => void) | null>(
    null,
  );

  spotCallbackRef.current = (nextSpots) => {
    setAgentSpots(nextSpots);
  };

  useEffect(() => {
    const root = stageRootRef.current;
    if (!root) return;

    ensureGsapRegistered();
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isMotion: GSAP_MEDIA.motion,
          isReduce: GSAP_MEDIA.reduce,
        },
        (matchCtx) => {
          const conditions = matchCtx.conditions as {
            isMotion?: boolean;
            isReduce?: boolean;
          };

          if (conditions.isReduce || !conditions.isMotion) {
            gsap.set('[data-gsap]', {
              clearProps: 'all',
              opacity: 1,
              y: 0,
              scale: 1,
            });
            return;
          }

          const tl = gsap.timeline({defaults: {ease: 'power3.out'}});
          tl.from('[data-gsap="agent-header"]', {
            opacity: 0,
            y: 14,
            duration: MOTION_DURATIONS.macro,
            stagger: 0.06,
            clearProps: 'transform,opacity',
          })
            .from(
              '[data-gsap="agent-control"]',
              {
                opacity: 0,
                y: 10,
                scale: 0.96,
                duration: MOTION_DURATIONS.standard,
                stagger: 0.04,
                clearProps: 'transform,opacity',
              },
              '-=0.24',
            )
            .from(
              '[data-gsap="agent-stage"]',
              {
                opacity: 0,
                y: 16,
                scale: 0.988,
                duration: MOTION_DURATIONS.choreo,
                clearProps: 'transform,opacity',
              },
              '-=0.20',
            )
            .from(
              '[data-gsap="agent-bottom-slot"]',
              {
                opacity: 0,
                y: 10,
                duration: MOTION_DURATIONS.macro,
                clearProps: 'transform,opacity',
              },
              '-=0.28',
            );
        },
      );

      return () => mm.revert();
    }, stageRootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!webglUnavailable) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const startTime = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      setFallbackClockSec((now - startTime) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [webglUnavailable]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % THE_AGENTS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectedAgentId || boardSelected)) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAgentId, boardSelected, clearSelection]);

  const handleAnchorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (currentIndex + 1) % THE_AGENTS.length;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (currentIndex - 1 + THE_AGENTS.length) % THE_AGENTS.length;
      }
      if (nextIdx !== null && nextIdx !== currentIndex) {
        e.preventDefault();
        const target = THE_AGENTS[nextIdx];
        anchorButtonsRef.current[target.id]?.focus();
      }
    },
    [],
  );

  const isHologram = gaya === 'hologram';

  const activeDescription = useMemo(() => {
    if (!activeAgent) return '';
    if (activeAgent.id === 'antislop' && antiSlopAuditIndex >= 0) {
      return ANTI_SLOP_AUDITS[antiSlopAuditIndex];
    }
    return activeAgent.functionText;
  }, [activeAgent, antiSlopAuditIndex]);

  const spotlightAgentId =
    hoveredAgentId ?? selectedAgentId ?? THE_AGENTS[spotlightIndex]?.id ?? null;

  const upperFloorAgents = useMemo(
    () => THE_AGENTS.filter((a) => a.floor === 2),
    [],
  );
  const lowerFloorAgents = useMemo(
    () => THE_AGENTS.filter((a) => a.floor === 1),
    [],
  );

  return (
    <section
      ref={stageRootRef}
      aria-label="The Agent"
      className="relative min-h-[calc(100svh-4.5rem)] w-full px-4 sm:px-8 pt-6 pb-16 flex flex-col justify-between text-[#09090B]"
    >
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 sm:gap-5">
        {/* Neo-Brutalist Section Header */}
        <div data-gsap="agent-header" className="flex items-center gap-3 pt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#B8FF3B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold uppercase tracking-wider text-[#09090B] shrink-0">
            05. Live 3D Studio · Multi-Agent Crew
          </span>
          <div className="h-[2.5px] flex-1 bg-[#09090B]" />
        </div>

        {/* Subheader & Tactile Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-[2.5px] border-[#09090B] pb-4">
          <div className="space-y-1.5">
            <h1
              data-gsap="agent-header"
              className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#09090B]"
            >
              The Agent
            </h1>
            <p
              data-gsap="agent-header"
              className="text-xs sm:text-sm font-sans font-medium text-[#3F3F46]"
            >
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFE600] border-2 border-[#09090B] font-mono font-bold text-[#09090B] tabular-nums mr-2">
                {activeCount}/{THE_AGENTS.length} Active · {idleCount} Idle
              </span>
              {missionActivity
                ? `${missionActivity.label} di Mission Board.`
                : 'Amati aktivitas 11 agen di studio 2 lantai, kelola status kru, atau picu Sync Pulse.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync Pulse Action */}
            <button
              type="button"
              data-gsap="agent-control"
              onClick={() => triggerGroupAction('sync-wave')}
              className="brutal-cta inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl px-4 text-xs font-mono font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Waves className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden="true" />
              <span>Sync Pulse</span>
            </button>

            {/* Toggle Crew */}
            <button
              type="button"
              data-gsap="agent-control"
              onClick={() => triggerGroupAction('toggle-all')}
              title="Alihkan status Active/Idle seluruh 11 kru & picu animasi gelombang"
              className="brutal-button inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2.25} aria-hidden="true" />
              <span>Toggle Crew</span>
            </button>

            {/* Dispatch Crew to Mission Board */}
            <button
              type="button"
              data-gsap="agent-control"
              onClick={() =>
                startMissionActivity({
                  kind: 'install',
                  label: 'Memasang aset & sinkronisasi misi',
                  agentIds: [
                    'impeccable',
                    'frontend',
                    'uiux',
                    'apple',
                    'antislop',
                    'design-dna',
                    'genjutsu',
                    'threejs',
                    'gsap',
                  ],
                  durationMs: 6000,
                })
              }
              title="Kirim kru lantai 1 & 2 ke Mission Board untuk memproses tugas"
              className="brutal-cta-pink inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl px-4 text-xs font-mono font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardList className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden="true" />
              <span>Proses Misi</span>
            </button>

            {/* Office Mode Switcher */}
            <div
              data-gsap="agent-control"
              role="group"
              aria-label="Mode kantor 3D"
              className="brutal-card inline-flex items-center gap-1 p-1 rounded-xl bg-white"
            >
              {GAYA_OPTIONS.map((opt) => {
                const active = gaya === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.ket}
                    aria-pressed={active}
                    onClick={() => setGaya(opt.id)}
                    className={`inline-flex items-center min-h-[36px] sm:min-h-[30px] px-3 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#7C3AED] text-white border-2 border-[#09090B]'
                        : 'text-[#09090B] hover:bg-[#FEF9C3]'
                    }`}
                  >
                    {opt.nama}
                  </button>
                );
              })}
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              data-gsap="agent-control"
              onClick={toggleMuted}
              aria-pressed={isMuted}
              aria-label={isMuted ? 'Nyalakan suara agen' : 'Bisukan suara agen'}
              className="brutal-button inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#52525B]" strokeWidth={2} aria-hidden="true" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} aria-hidden="true" />
                  <span>Sound On</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Studio Viewport (2-Story 3D Office OR Automatic 2-Tier 2D Fallback) */}
        {!webglUnavailable ? (
          <div
            data-gsap="agent-stage"
            className={`brutal-card-elevated relative w-full h-[460px] sm:h-[540px] lg:h-[600px] rounded-3xl overflow-hidden transition-colors duration-[240ms] ${
              isHologram ? 'bg-[#09090B]' : 'bg-[#FFFDF5]'
            }`}
          >
            <IsometricOfficeStage
              gaya={gaya}
              agentStates={agentStates}
              boardAgentIds={boardAgentIds}
              boardSelected={boardSelected}
              hoveredAgentId={hoveredAgentId}
              selectedAgentId={selectedAgentId}
              pulseProgressMap={pulseProgressMap}
              anchorsRef={anchorsMapRef}
              boardAnchorRef={boardAnchorRef}
              spotCallbackRef={spotCallbackRef}
              onHoverAgent={hoverAgent}
              onSelectAgent={selectAgent}
              onSelectBoard={selectBoard}
              onWebGLUnavailable={() => setWebglUnavailable(true)}
            />

            {/* Projected Semantic DOM Overlays above 11 3D Characters & Mission Board */}
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              {/* Mission Board Wall Pin */}
              <div
                ref={(el) => {
                  boardAnchorRef.current = el;
                }}
                className="absolute top-0 left-0 will-change-transform"
              >
                <button
                  type="button"
                  onClick={selectBoard}
                  aria-pressed={boardSelected}
                  className={`pointer-events-auto -translate-x-1/2 -translate-y-full inline-flex items-center min-h-[32px] px-3 py-1 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap cursor-pointer ${
                    boardSelected
                      ? 'brutal-cta'
                      : 'brutal-button bg-white text-[#09090B]'
                  }`}
                >
                  Mission Board
                </button>
              </div>

              {/* 11 Projected Agent Anchors with Bespoke Character Icons */}
              {THE_AGENTS.map((agent, idx) => {
                const isSelected = selectedAgentId === agent.id;
                const isHovered = hoveredAgentId === agent.id;
                const isPulsing = pulseProgressMap[agent.id] !== undefined;
                const currentSpot = agentSpots[agent.id] ?? 'meja';
                const agentStatus = agentStates[agent.id];
                const isBoardDispatched = boardAgentIds.includes(agent.id);
                const telemetry = getAgentLiveTelemetry(
                  agent,
                  agentStatus,
                  currentSpot,
                  isPulsing,
                  missionActivity,
                  isBoardDispatched,
                );
                const showSpotlightBubble =
                  !isHovered && spotlightAgentId === agent.id;
                const tooltipAlign =
                  agent.deskX < -3.0
                    ? 'start'
                    : agent.deskX > 3.0
                      ? 'end'
                      : 'center';

                return (
                  <div
                    key={agent.id}
                    ref={(el) => {
                      if (el) anchorsMapRef.current.set(agent.id, el);
                      else anchorsMapRef.current.delete(agent.id);
                    }}
                    className="group/anchor absolute top-0 left-0 will-change-transform"
                    style={{zIndex: isHovered ? 35 : isSelected ? 25 : 15}}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center">
                      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 group-data-[flip-y=down]/anchor:bottom-auto group-data-[flip-y=down]/anchor:top-full group-data-[flip-y=down]/anchor:mb-0 group-data-[flip-y=down]/anchor:mt-1.5 z-20">
                        <AnimatePresence mode="wait">
                          {isHovered ? (
                            <AgentHoverTooltip
                              key={`tooltip-${agent.id}`}
                              agent={agent}
                              liveState={telemetry.state}
                              statusText={telemetry.statusText}
                              align={tooltipAlign}
                            />
                          ) : showSpotlightBubble ? (
                            <motion.p
                              key={`spotlight-${agent.id}`}
                              initial={{opacity: 0, y: 4, scale: 0.96}}
                              animate={{opacity: 1, y: 0, scale: 1}}
                              exit={{opacity: 0, y: 2, scale: 0.96}}
                              transition={{duration: MOTION_DURATIONS.micro, ease: CUBIC_EASE}}
                              className="hidden sm:block max-w-[220px] px-3 py-1.5 rounded-xl bg-[#FEF9C3] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-[11px] font-sans font-bold leading-snug text-[#09090B] text-center"
                            >
                              {agent.id === 'antislop' &&
                              isSelected &&
                              antiSlopAuditIndex >= 0
                                ? ANTI_SLOP_AUDITS[antiSlopAuditIndex]
                                : agent.summaryBubble}
                            </motion.p>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <button
                        ref={(el) => {
                          anchorButtonsRef.current[agent.id] = el;
                        }}
                        type="button"
                        onPointerEnter={() => hoverAgent(agent.id)}
                        onPointerLeave={() => {
                          if (hoveredAgentId === agent.id) hoverAgent(null);
                        }}
                        onFocus={() => hoverAgent(agent.id)}
                        onBlur={() => {
                          if (hoveredAgentId === agent.id) hoverAgent(null);
                        }}
                        onKeyDown={(e) => handleAnchorKeyDown(e, idx)}
                        onClick={() => selectAgent(agent.id)}
                        aria-label={`${agent.name} (${agent.colorTag}, Lantai ${agent.floor})`}
                        aria-describedby={isHovered ? `agent-tooltip-${agent.id}` : undefined}
                        aria-pressed={isSelected}
                        className={`pointer-events-auto inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-transform duration-150 cursor-pointer ${
                          isHovered || isSelected ? 'scale-105' : 'scale-100'
                        } ${
                          isSelected
                            ? 'brutal-cta'
                            : 'brutal-button bg-white text-[#09090B]'
                        }`}
                      >
                        <AgentCharacterIcon
                          agentId={agent.id}
                          color={agent.colors.armorMid}
                          accent={agent.colors.chestRim}
                          size={15}
                        />
                        <span className="font-mono font-bold">{agent.shortName}</span>
                        <span
                          className={`hidden xl:inline text-[10px] font-sans font-medium ${
                            isSelected ? 'text-[#09090B]' : 'text-[#52525B]'
                          }`}
                        >
                          {telemetry.statusText}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Automatic 2-Tier Pixel Storyboard Fallback when WebGL is unavailable */
          <div className="w-full max-w-4xl mx-auto pt-2 pb-2 space-y-5">
            {[
              {title: 'Tingkat 2 Mezzanine · 5 Agen Spesialis', list: upperFloorAgents},
              {title: 'Lantai 1 Utama · 6 Agen Inti', list: lowerFloorAgents},
            ].map((tier) => (
              <div
                key={tier.title}
                className="brutal-card-cream rounded-3xl p-4 sm:p-5"
              >
                <p className="inline-block px-2.5 py-0.5 rounded-lg bg-[#FFE600] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B] mb-3">
                  {tier.title}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-4 place-items-center items-end">
                  {tier.list.map((agent, idx) => {
                    const activePulseProgress = pulseProgressMap[agent.id];
                    const isPulsing = activePulseProgress !== undefined;
                    const isHovered = hoveredAgentId === agent.id;
                    const agentStatus = agentStates[agent.id];
                    const isBoardDispatched = boardAgentIds.includes(agent.id);
                    const telemetry = getAgentLiveTelemetry(
                      agent,
                      agentStatus,
                      isBoardDispatched ? 'papan' : 'meja',
                      isPulsing,
                      missionActivity,
                      isBoardDispatched,
                    );
                    const state: StoryboardState = isPulsing
                      ? 'pulse'
                      : isHovered
                        ? 'hover'
                        : 'idle';
                    const isSelected = selectedAgentId === agent.id;

                    return (
                      <div key={agent.id} className="relative flex flex-col items-center">
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              key={`fallback-tooltip-${agent.id}`}
                              initial={{opacity: 0, y: 4}}
                              animate={{opacity: 1, y: 0}}
                              exit={{opacity: 0, y: 2}}
                              transition={{duration: MOTION_DURATIONS.micro, ease: CUBIC_EASE}}
                              className="absolute -top-2 -translate-y-full z-30 pointer-events-none"
                            >
                              <AgentHoverTooltip
                                agent={agent}
                                liveState={telemetry.state}
                                statusText={telemetry.statusText}
                                align={idx === 0 ? 'start' : idx === tier.list.length - 1 ? 'end' : 'center'}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.button
                          type="button"
                          initial={{opacity: 0, y: 12}}
                          animate={{opacity: 1, y: 0}}
                          whileHover={{scale: 1.05, y: -4}}
                          whileTap={{scale: 0.96, y: 1}}
                          transition={{
                            opacity: {duration: MOTION_DURATIONS.macro, delay: idx * 0.045, ease: CUBIC_EASE},
                            default: HOVER_SPRING,
                          }}
                          onPointerEnter={() => hoverAgent(agent.id)}
                          onPointerLeave={() => {
                            if (hoveredAgentId === agent.id) hoverAgent(null);
                          }}
                          onFocus={() => hoverAgent(agent.id)}
                          onBlur={() => {
                            if (hoveredAgentId === agent.id) hoverAgent(null);
                          }}
                          onClick={() => selectAgent(agent.id)}
                          aria-label={`${agent.name} (${agent.colorTag}, Lantai ${agent.floor})`}
                          aria-describedby={isHovered ? `agent-tooltip-${agent.id}` : undefined}
                          aria-pressed={isSelected}
                          className="relative flex flex-col items-center justify-end gap-1.5 p-1.5 rounded-2xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED]"
                        >
                          <AgentStoryboardSprite
                            agent={agent}
                            state={state}
                            clockSec={fallbackClockSec}
                            pulseProgress={activePulseProgress ?? 0}
                            isSelected={isSelected}
                            darkSurface={false}
                          />
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border-2 border-[#09090B] text-[11px] font-mono font-bold ${
                              isSelected
                                ? 'bg-[#FFE600] text-[#09090B] shadow-[2px_2px_0_#09090B]'
                                : 'bg-white text-[#09090B]'
                            }`}
                          >
                            <AgentCharacterIcon
                              agentId={agent.id}
                              color={agent.colors.armorMid}
                              accent={agent.colors.chestRim}
                              size={14}
                            />
                            <span>{agent.shortName}</span>
                          </span>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fixed-Height Detail Slot */}
        <div data-gsap="agent-bottom-slot" className="min-h-[96px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {activeAgent && (
              <motion.div
                key={`${activeAgent.id}-${antiSlopAuditIndex}`}
                role="region"
                aria-live="polite"
                initial={{opacity: 0, y: -6, scale: 0.98}}
                animate={{opacity: 1, y: 0, scale: 1}}
                exit={{opacity: 0, y: -4, scale: 0.98}}
                transition={CUBIC_TACTILE}
                className="brutal-card-elevated w-full max-w-3xl rounded-2xl bg-white px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <AgentCharacterIcon
                      agentId={activeAgent.id}
                      color={activeAgent.colors.armorMid}
                      accent={activeAgent.colors.chestRim}
                      size={24}
                    />
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#09090B]">
                      {activeAgent.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-[#FFE600] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B]">
                      Lantai {activeAgent.floor}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#52525B]">
                      · {activeAgent.id === 'antislop' && antiSlopAuditIndex >= 0
                        ? 'Portfolio Audit'
                        : activeAgent.roleTitle}{' '}
                      ({activeAgent.colorTag})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border-2 border-[#09090B] ${
                        agentStates[activeAgent.id] === 'active'
                          ? 'bg-[#B8FF3B] text-[#09090B]'
                          : 'bg-[#F5F0E1] text-[#3F3F46]'
                      }`}
                    >
                      {agentStates[activeAgent.id] === 'active' ? 'Active' : 'Idle'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-sans font-medium leading-relaxed text-[#3F3F46]">
                    {activeDescription}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleAgentState(activeAgent.id)}
                    aria-pressed={agentStates[activeAgent.id] === 'active'}
                    className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl px-4 text-xs font-mono font-bold cursor-pointer whitespace-nowrap ${
                      agentStates[activeAgent.id] === 'active'
                        ? 'brutal-cta'
                        : 'brutal-button bg-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden="true" />
                    <span>
                      {agentStates[activeAgent.id] === 'active' ? 'Set Idle' : 'Set Active'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label="Tutup detail agen"
                    className="brutal-button inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" strokeWidth={2.25} />
                  </button>
                </div>
              </motion.div>
            )}

            {!activeAgent && boardSelected && (
              <motion.div
                key="studio-mission-board"
                role="region"
                aria-live="polite"
                initial={{opacity: 0, y: -6, scale: 0.98}}
                animate={{opacity: 1, y: 0, scale: 1}}
                exit={{opacity: 0, y: -4, scale: 0.98}}
                transition={CUBIC_TACTILE}
                className="brutal-card-elevated w-full max-w-3xl rounded-2xl bg-[#FEF9C3] px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#09090B]">
                      Studio Mission Board
                    </h2>
                    <span className="text-xs font-mono font-bold text-[#7C3AED]">
                      {STUDIO_ROOMS.map((r) => r.label).join(' · ')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-sans font-medium leading-relaxed text-[#3F3F46]">
                    Kantor 2 lantai menyatukan 6 agen inti di Lantai 1 dan 5 agen spesialis di Tingkat 2 Mezzanine (Design DNA, Motion, Genjutsu, Three.js, GSAP). Klik karakter mana saja untuk meninjau peran lengkapnya.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Tutup Mission Board"
                  className="brutal-button inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </motion.div>
            )}

            {!activeAgent && !boardSelected && (
              <motion.p
                key="studio-hint"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={CUBIC_MICRO}
                className="brutal-card inline-flex items-center px-4 py-2 rounded-2xl bg-white text-xs font-mono font-bold text-[#09090B] text-center"
              >
                Klik salah satu dari 11 karakter di Lantai 1 atau Tingkat 2 untuk melihat peran. Klik ulang Anti-Slop untuk audit antarmuka.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
