import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ANTI_SLOP_AUDITS,
  THE_AGENTS,
  type AgentId,
  type TheAgentSpec,
} from '../data/theAgents';
import type {IdleSpot} from '../components/office3d/IsometricOfficeStage';
import {GAYA_OPTIONS, type GayaId} from '../components/office3d/styleKits';
import {GAYA} from '../config';
import {agentAudioManager} from '../utils/agentAudio';

export type AgentStatusState = 'active' | 'idle';

export type AgentGroupAction =
  | 'sync-wave'
  | 'toggle-all'
  | 'activate-all'
  | 'idle-all';

export type MissionActivityKind = 'install' | 'task' | 'briefing' | 'sync';

export interface MissionActivity {
  id: string;
  kind: MissionActivityKind;
  label: string;
  agentIds: AgentId[];
  startedAt: number;
  endsAt: number | null;
}

export interface StartMissionActivityOptions {
  kind: MissionActivityKind;
  label: string;
  agentIds?: AgentId[];
  /** Auto-clear after N milliseconds. Omit or pass <= 0 to stay active until cleared. */
  durationMs?: number;
  silent?: boolean;
}

export const STUDIO_ACTIVITY_EVENT = 'dimstoria:studio-activity';

export function emitStudioActivity(options: StartMissionActivityOptions): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STUDIO_ACTIVITY_EVENT, {detail: options}));
}

export interface TriggerGroupOptions {
  /** Override stagger step in milliseconds between each agent's pulse wave (default 95ms). */
  staggerMs?: number;
  /** Whether to skip playing the crew chord cue. */
  silent?: boolean;
}

const PULSE_DURATION_MS = 1350;
const SYNC_STEP_MS = 95;
const GAYA_STORAGE_KEY = 'dms-porto-agent-gaya';
const GAYA_BASE_STORAGE_KEY = 'dms-porto-agent-gaya-base';

const DEFAULT_BOARD_DISPATCH_IDS: AgentId[] = [
  'impeccable',
  'frontend',
  'uiux',
  'apple',
  'antislop',
  'design-dna',
  'genjutsu',
  'threejs',
  'gsap',
];

function createInitialAgentStates(): Record<AgentId, AgentStatusState> {
  return THE_AGENTS.reduce(
    (acc, agent) => {
      acc[agent.id] = agent.activity === 'siaga' ? 'idle' : 'active';
      return acc;
    },
    {} as Record<AgentId, AgentStatusState>,
  );
}

function resolveInitialGaya(): GayaId {
  if (typeof window === 'undefined') return GAYA;
  const validIds = GAYA_OPTIONS.map((opt) => opt.id);
  const fromUrl = new URLSearchParams(window.location.search).get('gaya');
  if (fromUrl && validIds.includes(fromUrl as GayaId)) {
    return fromUrl as GayaId;
  }
  try {
    const savedBase = window.localStorage.getItem(GAYA_BASE_STORAGE_KEY);
    if (savedBase !== GAYA) {
      window.localStorage.setItem(GAYA_BASE_STORAGE_KEY, GAYA);
      window.localStorage.removeItem(GAYA_STORAGE_KEY);
      return GAYA;
    }
    const saved = window.localStorage.getItem(GAYA_STORAGE_KEY);
    if (saved && validIds.includes(saved as GayaId)) {
      return saved as GayaId;
    }
  } catch {
    // Storage unavailable; keep config default
  }
  return GAYA;
}

export interface AgentContextValue {
  /** Live 'active' vs 'idle' state map across all 11 agents. */
  agentStates: Record<AgentId, AgentStatusState>;
  /** Ordered list of agent IDs currently in the 'active' state. */
  activeAgentIds: AgentId[];
  /** Ordered list of agent IDs currently in the 'idle' state. */
  idleAgentIds: AgentId[];
  activeCount: number;
  idleCount: number;

  selectedAgentId: AgentId | null;
  activeAgent: TheAgentSpec | null;
  hoveredAgentId: AgentId | null;
  boardSelected: boolean;
  antiSlopAuditIndex: number;

  pulseProgressMap: Partial<Record<AgentId, number>>;
  agentSpots: Partial<Record<AgentId, IdleSpot>>;
  setAgentSpots: (spots: Partial<Record<AgentId, IdleSpot>>) => void;

  gaya: GayaId;
  setGaya: (nextGaya: GayaId) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMuted: () => void;

  /** Live Mission Board / install task currently pulling agents to the board. */
  missionActivity: MissionActivity | null;
  /** Agent IDs currently dispatched to gather around the Mission Board. */
  boardAgentIds: AgentId[];
  startMissionActivity: (options: StartMissionActivityOptions) => string;
  clearMissionActivity: () => void;

  /** Trigger the 3D/2D pulse animation for a single agent. */
  triggerAgentPulse: (id: AgentId) => void;
  /** Toggle (or set) one agent between 'active' and 'idle' and trigger its animation + cue. */
  toggleAgentState: (id: AgentId, targetState?: AgentStatusState) => AgentStatusState;
  /**
   * Unified handler to update states across the 11-agent crew ('toggle-all', 'activate-all',
   * 'idle-all', or 'sync-wave') and trigger the synchronized staggered group animation.
   */
  triggerGroupAction: (action: AgentGroupAction, options?: TriggerGroupOptions) => void;

  hoverAgent: (id: AgentId | null) => void;
  selectAgent: (id: AgentId) => void;
  selectBoard: () => void;
  clearSelection: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({children}: {children: ReactNode}) {
  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentStatusState>>(
    () => createInitialAgentStates(),
  );
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [boardSelected, setBoardSelected] = useState<boolean>(false);
  const [antiSlopAuditIndex, setAntiSlopAuditIndex] = useState<number>(-1);

  const [pulseProgressMap, setPulseProgressMap] = useState<
    Partial<Record<AgentId, number>>
  >({});
  const [agentSpots, setAgentSpots] = useState<Partial<Record<AgentId, IdleSpot>>>({});
  const [missionActivity, setMissionActivity] = useState<MissionActivity | null>(null);

  const [gaya, setGayaState] = useState<GayaId>(() => resolveInitialGaya());
  const [isMuted, setIsMutedState] = useState<boolean>(false);

  const agentStatesRef = useRef(agentStates);
  agentStatesRef.current = agentStates;

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    agentAudioManager.setMuted(isMuted);
  }, [isMuted]);

  const pulseStartsRef = useRef<Partial<Record<AgentId, number>>>({});
  const pulseRafRef = useRef<number | null>(null);
  const syncTimerIdsRef = useRef<number[]>([]);
  const hoverClearTimerRef = useRef<number | null>(null);
  const missionTimerRef = useRef<number | null>(null);
  const lastHoveredIdRef = useRef<AgentId | null>(null);

  const clearSyncTimers = useCallback(() => {
    syncTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    syncTimerIdsRef.current = [];
  }, []);

  const clearMissionActivity = useCallback(() => {
    if (missionTimerRef.current !== null) {
      window.clearTimeout(missionTimerRef.current);
      missionTimerRef.current = null;
    }
    setMissionActivity(null);
  }, []);

  const startMissionActivity = useCallback(
    (options: StartMissionActivityOptions): string => {
      if (missionTimerRef.current !== null) {
        window.clearTimeout(missionTimerRef.current);
        missionTimerRef.current = null;
      }

      const now = Date.now();
      const id = `mission-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const agents =
        options.agentIds && options.agentIds.length > 0
          ? options.agentIds
          : DEFAULT_BOARD_DISPATCH_IDS;
      const durationMs = options.durationMs ?? 4800;

      setMissionActivity({
        id,
        kind: options.kind,
        label: options.label,
        agentIds: agents,
        startedAt: now,
        endsAt: durationMs > 0 ? now + durationMs : null,
      });

      if (!options.silent) {
        agentAudioManager.playControlCue('in');
      }

      if (durationMs > 0) {
        missionTimerRef.current = window.setTimeout(() => {
          missionTimerRef.current = null;
          setMissionActivity((prev) => (prev?.id === id ? null : prev));
        }, durationMs);
      }

      return id;
    },
    [],
  );

  const ensurePulseLoop = useCallback(() => {
    if (pulseRafRef.current !== null) return;

    const step = (frameNow: number) => {
      const starts = pulseStartsRef.current;
      const activeKeys = Object.keys(starts) as AgentId[];

      if (activeKeys.length === 0) {
        pulseRafRef.current = null;
        setPulseProgressMap({});
        return;
      }

      const nextMap: Partial<Record<AgentId, number>> = {};
      activeKeys.forEach((key) => {
        const startedAt = starts[key];
        if (startedAt === undefined) return;
        const elapsed = frameNow - startedAt;
        if (elapsed >= PULSE_DURATION_MS) {
          delete starts[key];
        } else {
          nextMap[key] = elapsed / PULSE_DURATION_MS;
        }
      });

      setPulseProgressMap(nextMap);

      if (Object.keys(starts).length > 0) {
        pulseRafRef.current = requestAnimationFrame(step);
      } else {
        pulseRafRef.current = null;
      }
    };

    pulseRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseRafRef.current !== null) {
        cancelAnimationFrame(pulseRafRef.current);
        pulseRafRef.current = null;
      }
      if (hoverClearTimerRef.current !== null) {
        window.clearTimeout(hoverClearTimerRef.current);
      }
      if (missionTimerRef.current !== null) {
        window.clearTimeout(missionTimerRef.current);
      }
      clearSyncTimers();
    };
  }, [clearSyncTimers]);

  // Listen for studio-wide task/install broadcasts & PWA service-worker updates
  useEffect(() => {
    const onStudioActivity = (event: Event) => {
      const detail = (event as CustomEvent<StartMissionActivityOptions>).detail;
      if (detail && detail.label) {
        startMissionActivity(detail);
      }
    };
    window.addEventListener(STUDIO_ACTIVITY_EVENT, onStudioActivity);

    let cleanupSw: (() => void) | undefined;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!reg) return;
          const handleUpdateFound = () => {
            const installing = reg.installing;
            if (!installing) return;
            startMissionActivity({
              kind: 'install',
              label: 'Menginstal pembaruan aset',
              agentIds: ['frontend', 'apple', 'antislop', 'threejs', 'gsap'],
              durationMs: 6500,
              silent: true,
            });
            const onStateChange = () => {
              if (installing.state === 'installed' || installing.state === 'redundant') {
                installing.removeEventListener('statechange', onStateChange);
              }
            };
            installing.addEventListener('statechange', onStateChange);
          };
          reg.addEventListener('updatefound', handleUpdateFound);
          cleanupSw = () => reg.removeEventListener('updatefound', handleUpdateFound);
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener(STUDIO_ACTIVITY_EVENT, onStudioActivity);
      cleanupSw?.();
    };
  }, [startMissionActivity]);

  const setGaya = useCallback(
    (nextGaya: GayaId) => {
      setGayaState(nextGaya);
      const optName =
        GAYA_OPTIONS.find((opt) => opt.id === nextGaya)?.nama ?? nextGaya;
      startMissionActivity({
        kind: 'install',
        label: `Memasang mode ${optName}`,
        agentIds: ['impeccable', 'frontend', 'design-dna', 'threejs'],
        durationMs: 4400,
      });
      try {
        window.localStorage.setItem(GAYA_STORAGE_KEY, nextGaya);
      } catch {
        // Ignore storage failures
      }
      const q = new URLSearchParams(window.location.search);
      q.set('gaya', nextGaya);
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    },
    [startMissionActivity],
  );

  const setIsMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    agentAudioManager.setMuted(muted);
    setIsMutedState(muted);
    if (!muted) {
      agentAudioManager.playControlCue('in');
    }
  }, []);

  const toggleMuted = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    setIsMuted(nextMuted);
  }, [setIsMuted]);

  const triggerAgentPulse = useCallback(
    (id: AgentId) => {
      pulseStartsRef.current[id] = performance.now();
      setPulseProgressMap((prev) => ({...prev, [id]: 0.001}));
      ensurePulseLoop();
    },
    [ensurePulseLoop],
  );

  const toggleAgentState = useCallback(
    (id: AgentId, targetState?: AgentStatusState): AgentStatusState => {
      const current = agentStatesRef.current[id] ?? 'idle';
      const next: AgentStatusState =
        targetState ?? (current === 'active' ? 'idle' : 'active');

      setAgentStates((prev) => {
        if (prev[id] === next) return prev;
        const updated = {...prev, [id]: next};
        agentStatesRef.current = updated;
        return updated;
      });

      triggerAgentPulse(id);
      agentAudioManager.playStateToggleCue(next);
      return next;
    },
    [triggerAgentPulse],
  );

  const triggerGroupAction = useCallback(
    (action: AgentGroupAction, options?: TriggerGroupOptions) => {
      const staggerMs = options?.staggerMs ?? SYNC_STEP_MS;
      clearSyncTimers();

      if (action !== 'sync-wave') {
        setAgentStates((prev) => {
          const next = {...prev};
          for (const agent of THE_AGENTS) {
            if (action === 'toggle-all') {
              next[agent.id] = prev[agent.id] === 'active' ? 'idle' : 'active';
            } else if (action === 'activate-all') {
              next[agent.id] = 'active';
            } else {
              next[agent.id] = 'idle';
            }
          }
          agentStatesRef.current = next;
          return next;
        });
      }

      if (!options?.silent) {
        agentAudioManager.playGroupWaveCue(action);
      }

      THE_AGENTS.forEach((agent, idx) => {
        const tid = window.setTimeout(() => {
          triggerAgentPulse(agent.id);
        }, idx * staggerMs);
        syncTimerIdsRef.current.push(tid);
      });

      if (action === 'sync-wave') {
        startMissionActivity({
          kind: 'sync',
          label: 'Sinkronisasi misi 11 kru',
          agentIds: THE_AGENTS.map((a) => a.id),
          durationMs: 5600,
          silent: true,
        });
      }
    },
    [clearSyncTimers, startMissionActivity, triggerAgentPulse],
  );

  const hoverAgent = useCallback((id: AgentId | null) => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }

    if (id === null) {
      hoverClearTimerRef.current = window.setTimeout(() => {
        lastHoveredIdRef.current = null;
        setHoveredAgentId(null);
      }, 45);
      return;
    }

    const changed = lastHoveredIdRef.current !== id;
    lastHoveredIdRef.current = id;
    setHoveredAgentId(id);
    if (changed && pulseStartsRef.current[id] === undefined) {
      agentAudioManager.playHoverCue();
    }
  }, []);

  const selectAgent = useCallback(
    (id: AgentId) => {
      setBoardSelected(false);

      if (id === 'antislop' && selectedAgentId === 'antislop') {
        setAntiSlopAuditIndex((prev) => (prev + 1) % ANTI_SLOP_AUDITS.length);
        triggerAgentPulse(id);
        agentAudioManager.playAuditStampCue();
        return;
      }

      setAntiSlopAuditIndex(-1);
      setSelectedAgentId(id);
      triggerAgentPulse(id);
      agentAudioManager.playAgentSelectCue(id);
    },
    [selectedAgentId, triggerAgentPulse],
  );

  const selectBoard = useCallback(() => {
    setSelectedAgentId(null);
    setAntiSlopAuditIndex(-1);
    setBoardSelected((prev) => {
      const next = !prev;
      agentAudioManager.playControlCue(next ? 'in' : 'out');
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAgentId(null);
    setBoardSelected(false);
    setAntiSlopAuditIndex(-1);
    agentAudioManager.playControlCue('out');
  }, []);

  const activeAgentIds = useMemo(
    () => THE_AGENTS.filter((a) => agentStates[a.id] === 'active').map((a) => a.id),
    [agentStates],
  );

  const idleAgentIds = useMemo(
    () => THE_AGENTS.filter((a) => agentStates[a.id] === 'idle').map((a) => a.id),
    [agentStates],
  );

  const activeAgent: TheAgentSpec | null = useMemo(() => {
    if (!selectedAgentId) return null;
    return THE_AGENTS.find((a) => a.id === selectedAgentId) ?? null;
  }, [selectedAgentId]);

  const boardAgentIds: AgentId[] = useMemo(() => {
    if (missionActivity) {
      return missionActivity.agentIds;
    }
    if (boardSelected) {
      return DEFAULT_BOARD_DISPATCH_IDS;
    }
    return [];
  }, [missionActivity, boardSelected]);

  const value = useMemo<AgentContextValue>(
    () => ({
      agentStates,
      activeAgentIds,
      idleAgentIds,
      activeCount: activeAgentIds.length,
      idleCount: idleAgentIds.length,
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
      setIsMuted,
      toggleMuted,
      missionActivity,
      boardAgentIds,
      startMissionActivity,
      clearMissionActivity,
      triggerAgentPulse,
      toggleAgentState,
      triggerGroupAction,
      hoverAgent,
      selectAgent,
      selectBoard,
      clearSelection,
    }),
    [
      agentStates,
      activeAgentIds,
      idleAgentIds,
      selectedAgentId,
      activeAgent,
      hoveredAgentId,
      boardSelected,
      antiSlopAuditIndex,
      pulseProgressMap,
      agentSpots,
      gaya,
      setGaya,
      isMuted,
      setIsMuted,
      toggleMuted,
      missionActivity,
      boardAgentIds,
      startMissionActivity,
      clearMissionActivity,
      triggerAgentPulse,
      toggleAgentState,
      triggerGroupAction,
      hoverAgent,
      selectAgent,
      selectBoard,
      clearSelection,
    ],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgentContext must be used inside AgentProvider');
  }
  return ctx;
}
