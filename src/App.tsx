import {
  Component,
  lazy,
  Suspense,
  type ErrorInfo,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Lenis from 'lenis';
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  Clapperboard,
  Code2,
  Copy,
  ExternalLink,
  Film,
  Handshake,
  Layers,
  Mail,
  Play,
  Scissors,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import {toast} from 'sonner';
import {Button} from './components/ui/button';
import {Toaster} from './components/ui/sonner';
import {AccessModeGate, type EntranceStage} from './components/AccessModeGate';
import {AmbientLiquidBackground} from './components/AmbientLiquidBackground';
import {ColorGradingCompare} from './components/ColorGradingCompare';
import {DevMediaSlotBadge} from './components/DevMediaSlotBadge';
import {EditorialCursor} from './components/EditorialCursor';
import {FilmImage} from './components/FilmImage';
import {HeroAmbientAccents} from './components/HeroAmbientAccents';
import {HorizontalScrollFade} from './components/HorizontalScrollFade';
import {MagneticButton} from './components/MagneticButton';
import {MarqueeStrip} from './components/MaximalismOrnaments';
import {MobileBookingSheet} from './components/MobileBookingSheet';
import {OfflineBanner} from './components/OfflineBanner';
import {TimelineBreakdown} from './components/TimelineBreakdown';
import {DevMediaProvider, useDevMedia} from './context/DevMediaContext';
import {AgentProvider} from './context/AgentContext';

const FilmLightboxModal = lazy(() =>
  import('./components/FilmLightboxModal').then((m) => ({default: m.FilmLightboxModal})),
);
const DevMediaDrawer = lazy(() =>
  import('./components/DevMediaDrawer').then((m) => ({default: m.DevMediaDrawer})),
);
const TheAgentTab = lazy(() =>
  import('./components/TheAgentTab').then((m) => ({default: m.TheAgentTab})),
);
import {
  CAPABILITIES,
  CLIENT_TESTIMONIALS,
  type FilmCategory,
  type FilmProject,
  PROJECT_SCOPES,
  STUDIO_EMAIL,
  STUDIO_FAQ,
  STUDIO_SOCIALS,
  STUDIO_TECHNICAL_SPECS,
} from './data/portfolio';
import {MEDIA_ASSETS} from './data/mediaAssets';
import dmsPortoLogo from './assets/dms-porto-logo.png';
import {
  CUBIC_EASE,
  CUBIC_EMPHASIS,
  CUBIC_INDICATOR,
  CUBIC_MICRO,
  CUBIC_TACTILE,
  MOTION_DURATIONS,
} from './lib/motion';
import {
  ensureGsapRegistered,
  GSAP_MEDIA,
  gsap,
  scheduleScrollTriggerRefresh,
  syncLenisWithGsap,
} from './lib/gsapCoordinator';

type SectionId = 'top' | 'works' | 'color-grade' | 'timeline' | 'capabilities' | 'contact';

const CATEGORIES: FilmCategory[] = ['All', 'Commercial', 'Music Video', 'Documentary', 'Color & Edit'];

const CAPABILITY_ICONS = [Camera, Scissors, SlidersHorizontal];

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{children: ReactNode}, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Portfolio render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFDF5] bg-brutal-grid text-[#09090B] flex items-center justify-center p-6">
          <div className="brutal-card-elevated max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#FFE600] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B]">
              dms porto
            </span>
            <h1 className="text-xl font-display font-extrabold tracking-tight text-[#09090B]">
              Tampilan perlu dimuat ulang
            </h1>
            <p className="text-sm font-sans text-[#27272A] leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="brutal-cta inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm font-mono font-bold cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <DevMediaProvider>
        <AgentProvider>
          <PortfolioApp />
        </AgentProvider>
      </DevMediaProvider>
    </AppErrorBoundary>
  );
}

function PortfolioApp() {
  const {
    accessRole,
    devMode,
    drawerOpen,
    toggleDevMode,
    avatarFrame,
    resolveSlot,
    resolveShowreel,
    resolveFilms,
  } = useDevMedia();

  const [selectedCategory, setSelectedCategory] = useState<FilmCategory>('All');
  const [activeFilmId, setActiveFilmId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('top');
  const [expandedCapIndex, setExpandedCapIndex] = useState<string>('01');
  const [expandedFaqId, setExpandedFaqId] = useState<string>('turnaround');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'the-agent'>('portfolio');
  const [emailCopied, setEmailCopied] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formScope, setFormScope] = useState('Commercial / Brand Film');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingBrief, setIsSubmittingBrief] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    notes?: string;
  }>({});
  const [submittedBrief, setSubmittedBrief] = useState<{
    id?: string;
    savedOnServer?: boolean;
    name: string;
    email: string;
    scope: string;
    notes: string;
    mailtoHref: string;
    summaryText: string;
  } | null>(null);

  const lenisRef = useRef<Lenis | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const portfolioRootRef = useRef<HTMLDivElement | null>(null);
  const didCheckDeepLinkRef = useRef(false);
  const entranceTimersRef = useRef<number[]>([]);
  const [isDesktopMotion, setIsDesktopMotion] = useState(false);
  const [entranceStage, setEntranceStage] = useState<EntranceStage>('backdrop');
  const [entranceRunId, setEntranceRunId] = useState(0);
  const heroRevealed = accessRole !== 'pending';

  const clearEntranceTimers = useCallback(() => {
    entranceTimersRef.current.forEach((id) => window.clearTimeout(id));
    entranceTimersRef.current = [];
  }, []);

  // Unified Phase 1 & Phase 2 storyboard entrance orchestrator:
  // 0.00s ('backdrop')    : Scene 1 light background fade-in (0.5s)
  // 0.50s ('logo')        : Scene 2 dead-center "dms porto" slide-up & fade-in (0.4s)
  // 0.95s ('container')   : Scene 3 background warmth transition, logo glide up, white container overshoot
  // 1.35s ('cards')       : Scene 4 staggered Just Guest -> Dev Mode (+0.15s) + micro-delays
  // 1.85s ('interactive') : Phase 2 idle / hover & focus states settled
  useEffect(() => {
    clearEntranceTimers();

    if (accessRole !== 'pending') {
      setEntranceStage('interactive');
      return;
    }

    setEntranceStage('backdrop');
    const tLogo = window.setTimeout(() => setEntranceStage('logo'), 120);
    const tContainer = window.setTimeout(() => setEntranceStage('container'), 520);
    const tCards = window.setTimeout(() => setEntranceStage('cards'), 880);
    const tInteractive = window.setTimeout(
      () => setEntranceStage('interactive'),
      1350,
    );

    entranceTimersRef.current = [tLogo, tContainer, tCards, tInteractive];

    return () => {
      clearEntranceTimers();
    };
  }, [accessRole, entranceRunId, clearEntranceTimers]);

  const skipEntrance = useCallback(() => {
    clearEntranceTimers();
    setEntranceStage('interactive');
  }, [clearEntranceTimers]);

  const replayEntrance = useCallback(() => {
    clearEntranceTimers();
    setEntranceStage('backdrop');
    setEntranceRunId((id) => id + 1);
  }, [clearEntranceTimers]);

  const resolvedAvatar = resolveSlot('asset:portraitAvatar', MEDIA_ASSETS.portraitAvatar);
  const resolvedShowreel = useMemo(() => resolveShowreel(), [resolveShowreel]);
  const resolvedFilms = useMemo(() => resolveFilms(), [resolveFilms]);

  const lightboxQueue = useMemo(
    () => [resolvedShowreel, ...resolvedFilms],
    [resolvedShowreel, resolvedFilms],
  );

  const activeFilm: FilmProject | null = useMemo(() => {
    if (!activeFilmId) return null;
    return lightboxQueue.find((f) => f.id === activeFilmId) ?? null;
  }, [activeFilmId, lightboxQueue]);

  const activeFilmIndex = useMemo(() => {
    if (!activeFilm) return -1;
    return lightboxQueue.findIndex((f) => f.id === activeFilm.id);
  }, [activeFilm, lightboxQueue]);

  const prevFilm = activeFilmIndex > 0 ? lightboxQueue[activeFilmIndex - 1] : null;
  const nextFilm =
    activeFilmIndex >= 0 && activeFilmIndex < lightboxQueue.length - 1
      ? lightboxQueue[activeFilmIndex + 1]
      : null;

  const {scrollY, scrollYProgress} = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 45,
    stiffness: 380,
    mass: 0.5,
  });

  const thumbnailKineticScale = useTransform(
    smoothVelocity,
    [-2600, 0, 2600],
    [1.025, 1, 1.025],
  );

  const {scrollYProgress: heroScrollProgress} = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });

  const headerFadeOpacity = useTransform(scrollY, [0, 36], [0, 1]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (pointer: fine)');
    const syncDesktopMotion = () => setIsDesktopMotion(mq.matches);
    syncDesktopMotion();
    mq.addEventListener('change', syncDesktopMotion);
    return () => mq.removeEventListener('change', syncDesktopMotion);
  }, []);

  useEffect(() => {
    ensureGsapRegistered();
    if (!isDesktopMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    const detachTicker = syncLenisWithGsap(lenis);

    return () => {
      detachTicker();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isDesktopMotion]);

  // GSAP Hero staggered entrance + Showreel parallax + Portfolio ScrollTrigger choreography
  useEffect(() => {
    if (activeTab !== 'portfolio') return;
    const root = portfolioRootRef.current;
    if (!root) return;

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isMotion: GSAP_MEDIA.motion,
          isDesktopFine: GSAP_MEDIA.desktopFine,
          isReduce: GSAP_MEDIA.reduce,
        },
        (matchCtx) => {
          const conditions = matchCtx.conditions as {
            isMotion?: boolean;
            isDesktopFine?: boolean;
            isReduce?: boolean;
          };

          if (conditions.isReduce || !conditions.isMotion) {
            gsap.set('[data-gsap]', {
              clearProps: 'all',
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
            });
            return;
          }

          if (!heroRevealed) {
            gsap.set(
              '[data-gsap="hero-avatar"], [data-gsap="hero-word"], [data-gsap="hero-sub"], [data-gsap="hero-cta"], [data-gsap="hero-showreel"], [data-gsap="hero-spec"]',
              {opacity: 0},
            );
            return;
          }

          // 1. Hero Staggered Entrance (runs as soon as AccessModeGate reveals portfolio)
          const heroTl = gsap.timeline({defaults: {ease: 'power3.out'}});
          heroTl
            .fromTo(
              '[data-gsap="hero-avatar"]',
              {opacity: 0, y: 16},
              {
                opacity: 1,
                y: 0,
                duration: MOTION_DURATIONS.choreo,
                clearProps: 'transform,opacity',
              },
            )
            .fromTo(
              '[data-gsap="hero-word"]',
              {opacity: 0, y: 20},
              {
                opacity: 1,
                y: 0,
                duration: MOTION_DURATIONS.choreo,
                stagger: 0.032,
                clearProps: 'transform,opacity',
              },
              '-=0.36',
            )
            .fromTo(
              '[data-gsap="hero-sub"]',
              {opacity: 0, y: 14},
              {
                opacity: 1,
                y: 0,
                duration: MOTION_DURATIONS.macro,
                clearProps: 'transform,opacity',
              },
              '-=0.28',
            )
            .fromTo(
              '[data-gsap="hero-cta"]',
              {opacity: 0, y: 12},
              {
                opacity: 1,
                y: 0,
                duration: MOTION_DURATIONS.macro,
                clearProps: 'transform,opacity',
              },
              '-=0.26',
            )
            .fromTo(
              '[data-gsap="hero-showreel"]',
              {opacity: 0, y: 22, scale: 0.985},
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: MOTION_DURATIONS.choreo,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
              },
              '-=0.24',
            )
            .fromTo(
              '[data-gsap="hero-spec"]',
              {opacity: 0, y: 12},
              {
                opacity: 1,
                y: 0,
                duration: MOTION_DURATIONS.macro,
                stagger: 0.055,
                clearProps: 'transform,opacity',
              },
              '-=0.32',
            );

          // 2. Desktop Showreel scrubbed parallax (registered first in top-to-bottom DOM order)
          if (conditions.isDesktopFine) {
            const heroEl = heroSectionRef.current;
            const showreelMedia = root.querySelector('[data-gsap="hero-showreel-media"]');
            if (heroEl && showreelMedia) {
              gsap
                .timeline({
                  scrollTrigger: {
                    trigger: heroEl,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.55,
                  },
                })
                .fromTo(
                  showreelMedia,
                  {scale: 1, y: 0},
                  {
                    scale: 1.055,
                    y: -14,
                    ease: 'none',
                  },
                );
            }
          }

          // 3. Section 01: Selected Works staggered grid entrance
          const worksSection = root.querySelector('#works');
          if (worksSection) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: worksSection,
                  start: 'top 84%',
                  toggleActions: 'play none none none',
                },
              })
              .from('[data-gsap="works-head"]', {
                opacity: 0,
                y: 18,
                duration: MOTION_DURATIONS.choreo,
                stagger: 0.07,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              })
              .from(
                '[data-gsap="work-card"]',
                {
                  opacity: 0,
                  y: 22,
                  scale: 0.98,
                  duration: MOTION_DURATIONS.choreo,
                  stagger: 0.06,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.32',
              );
          }

          // 4. Section 02: Color Grading Compare staggered reveal
          const cgSection = root.querySelector('#color-grade');
          if (cgSection) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: cgSection,
                  start: 'top 84%',
                  toggleActions: 'play none none none',
                },
              })
              .from('[data-gsap="cg-head"]', {
                opacity: 0,
                y: 18,
                duration: MOTION_DURATIONS.choreo,
                stagger: 0.07,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              })
              .from(
                '[data-gsap="cg-stage"]',
                {
                  opacity: 0,
                  y: 22,
                  scale: 0.988,
                  duration: MOTION_DURATIONS.choreo,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.28',
              )
              .from(
                '[data-gsap="cg-meta"]',
                {
                  opacity: 0,
                  y: 12,
                  duration: MOTION_DURATIONS.macro,
                  stagger: 0.065,
                  ease: 'power2.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.30',
              );
          }

          // 5. Section 03: Cut Architecture NLE Timeline reveal
          const tlSection = root.querySelector('#timeline');
          if (tlSection) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: tlSection,
                  start: 'top 84%',
                  toggleActions: 'play none none none',
                },
              })
              .from('[data-gsap="tl-head"]', {
                opacity: 0,
                y: 18,
                duration: MOTION_DURATIONS.choreo,
                stagger: 0.07,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              })
              .from(
                '[data-gsap="tl-inspector"]',
                {
                  opacity: 0,
                  y: 20,
                  duration: MOTION_DURATIONS.choreo,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.30',
              )
              .from(
                '[data-gsap="tl-nle"]',
                {
                  opacity: 0,
                  y: 18,
                  duration: MOTION_DURATIONS.choreo,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.32',
              )
              .from(
                '[data-gsap="tl-track"]',
                {
                  opacity: 0,
                  x: -10,
                  duration: MOTION_DURATIONS.macro,
                  stagger: 0.05,
                  ease: 'power2.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.30',
              );
          }

          // 6. Section 04: Capabilities staggered ledger rows
          const capSection = root.querySelector('#capabilities');
          if (capSection) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: capSection,
                  start: 'top 84%',
                  toggleActions: 'play none none none',
                },
              })
              .from('[data-gsap="cap-head"]', {
                opacity: 0,
                y: 16,
                duration: MOTION_DURATIONS.choreo,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              })
              .from(
                '[data-gsap="cap-sticky"]',
                {
                  opacity: 0,
                  y: 18,
                  duration: MOTION_DURATIONS.choreo,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.32',
              )
              .from(
                '[data-gsap="cap-row"]',
                {
                  opacity: 0,
                  y: 18,
                  duration: MOTION_DURATIONS.choreo,
                  stagger: 0.085,
                  ease: 'power3.out',
                  clearProps: 'transform,opacity',
                },
                '-=0.34',
              );
          }

          // 7. Contact & Brief section staggered arrival
          const contactSection = root.querySelector('#contact');
          if (contactSection) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: contactSection,
                  start: 'top 86%',
                  toggleActions: 'play none none none',
                },
              })
              .from('[data-gsap="contact-item"]', {
                opacity: 0,
                y: 18,
                duration: MOTION_DURATIONS.choreo,
                stagger: 0.065,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              });
          }
        },
      );

      return () => mm.revert();
    }, portfolioRootRef);

    const rafId = heroRevealed ? scheduleScrollTriggerRefresh() : 0;
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ctx.revert();
    };
  }, [activeTab, heroRevealed]);

  // Recalibrate ScrollTrigger positions whenever category filtering alters document height
  useEffect(() => {
    if (activeTab !== 'portfolio' || !heroRevealed) return;
    const rafId = scheduleScrollTriggerRefresh();
    return () => window.cancelAnimationFrame(rafId);
  }, [selectedCategory, activeTab, heroRevealed]);

  // Keep canonical & og:url tags synchronized with runtime origin/pathname
  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    }
    const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    if (ogUrlMeta) {
      ogUrlMeta.setAttribute('content', canonicalUrl);
    }
  }, []);

  // Pause Lenis smooth wheel capture whenever a modal or entry gate is open
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const isOverlayActive =
      accessRole === 'pending' ||
      activeFilmId !== null ||
      drawerOpen ||
      mobileSheetOpen;
    if (isOverlayActive) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [accessRole, activeFilmId, drawerOpen, mobileSheetOpen]);

  // Read ?work= / ?tab=the-agent on initial mount and keep URL synchronized
  useEffect(() => {
    if (!didCheckDeepLinkRef.current) {
      didCheckDeepLinkRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const workParam = params.get('work');
      if (workParam && lightboxQueue.some((f) => f.id === workParam)) {
        setActiveFilmId(workParam);
      }
      if (params.get('tab') === 'the-agent') {
        setActiveTab('the-agent');
      }
      return;
    }

    const url = new URL(window.location.href);
    if (activeFilmId) {
      url.searchParams.set('work', activeFilmId);
    } else {
      url.searchParams.delete('work');
    }
    if (activeTab === 'the-agent') {
      url.searchParams.set('tab', 'the-agent');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activeFilmId, activeTab, lightboxQueue]);

  useEffect(() => {
    if (activeTab !== 'portfolio') return;
    const sectionIds: SectionId[] = [
      'top',
      'works',
      'color-grade',
      'timeline',
      'capabilities',
      'contact',
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id as SectionId);
        }
      },
      {rootMargin: '-25% 0px -45% 0px', threshold: [0.1, 0.35, 0.6]},
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeTab]);

  const filteredFilms = useMemo(() => {
    if (selectedCategory === 'All') return resolvedFilms;
    return resolvedFilms.filter((film) => film.category === selectedCategory);
  }, [selectedCategory, resolvedFilms]);

  const scrollToSection = (sectionId: SectionId) => {
    const performScroll = () => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      setActiveSection(sectionId);
      const isDesktop = window.innerWidth >= 768;
      const offset = isDesktop ? -72 : -12;

      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, {offset});
      } else {
        el.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    };

    if (activeTab !== 'portfolio') {
      setActiveTab('portfolio');
      window.setTimeout(performScroll, 60);
      return;
    }

    performScroll();
  };

  const openTheAgentTab = () => {
    setActiveTab('the-agent');
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, {immediate: true});
    } else {
      window.scrollTo({top: 0});
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(STUDIO_EMAIL);
      setEmailCopied(true);
      toast.success('Email copied to clipboard', {
        description: STUDIO_EMAIL,
      });
      window.setTimeout(() => setEmailCopied(false), 1800);
    } catch {
      toast.info(`Contact email: ${STUDIO_EMAIL}`);
    }
  };

  const handleSelectCapabilityScope = (capIndex: string) => {
    const scopeMap: Record<string, (typeof PROJECT_SCOPES)[number]> = {
      '01': 'Commercial / Brand Film',
      '02': 'Offline & Online Video Editing',
      '03': 'Color Grading Only',
    };
    const nextScope = scopeMap[capIndex] ?? PROJECT_SCOPES[0];
    setFormScope(nextScope);
    setSubmittedBrief(null);
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true);
    } else {
      scrollToSection('contact');
      window.setTimeout(() => {
        document.getElementById('inquiry-name')?.focus();
      }, 420);
    }
  };

  const handleSubmitInquiry = async (e: FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (isSubmittingBrief) return false;

    const nextErrors: {name?: string; email?: string; notes?: string} = {};
    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedNotes = formNotes.trim();

    if (!trimmedName) {
      nextErrors.name = 'Please enter your name.';
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!trimmedNotes) {
      nextErrors.notes = 'Please share a brief overview or timeline.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toast.error('Please review the highlighted fields below.');
      return false;
    }

    setFormErrors({});
    setIsSubmittingBrief(true);

    const subject = `[dms porto Brief] ${formScope} - ${trimmedName}`;
    const summaryText = [
      `Project Scope: ${formScope}`,
      `Client Name: ${trimmedName}`,
      `Reply Email: ${trimmedEmail}`,
      '',
      'Brief & Timeline:',
      trimmedNotes,
    ].join('\n');
    const mailtoHref = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(summaryText)}`;

    let savedOnServer = false;
    let briefId: string | undefined;

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          scope: formScope,
          notes: trimmedNotes,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {ok?: boolean; inquiry?: {id?: string}};
        savedOnServer = Boolean(data.ok);
        briefId = data.inquiry?.id;
      }
    } catch {
      savedOnServer = false;
    } finally {
      setIsSubmittingBrief(false);
    }

    setSubmittedBrief({
      id: briefId,
      savedOnServer,
      name: trimmedName,
      email: trimmedEmail,
      scope: formScope,
      notes: trimmedNotes,
      mailtoHref,
      summaryText,
    });

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(summaryText).catch(() => undefined);
    }

    if (savedOnServer) {
      toast.success('Project brief sent & saved', {
        description: 'Your brief has been logged to Dimstoria Studio and copied to clipboard.',
      });
    } else {
      toast.success('Project brief prepared', {
        description: 'Brief copied to clipboard. Open your email draft below to dispatch.',
      });
    }

    setFormName('');
    setFormEmail('');
    setFormNotes('');
    return true;
  };

  const mobileActiveSection: SectionId =
    activeSection === 'color-grade' || activeSection === 'timeline' ? 'works' : activeSection;

  const mobileTabs: Array<{id: SectionId; label: string; icon: typeof Clapperboard}> = [
    {id: 'top', label: 'Reel', icon: Clapperboard},
    {id: 'works', label: 'Works', icon: Film},
    {id: 'capabilities', label: 'Services', icon: Layers},
    {id: 'contact', label: 'Contact', icon: Mail},
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`relative min-h-screen flex flex-col bg-[#FFFDF5] text-[#09090B] ${
          activeTab === 'portfolio'
            ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'pb-0'
        }`}
      >
        <AmbientLiquidBackground />
        <a
          href="#main-content"
          className="brutal-cta sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] focus:px-4 focus:py-2.5 focus:rounded-xl focus:text-xs focus:font-mono focus:font-bold"
        >
          Skip to main content
        </a>
        <AccessModeGate
          entranceStage={entranceStage}
          entranceRunId={entranceRunId}
          onSkipEntrance={skipEntrance}
          onReplayEntrance={replayEntrance}
        />
        <OfflineBanner />
        {/* Subtle Tactile Print-Grain Overlay (desktop only) */}
        <div
          aria-hidden="true"
          className="hidden md:block film-grain-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        />
        <EditorialCursor />

        {/* Top Bar: Floating Retro Neo-Brutalist Navbar */}
        <motion.header
          initial={{opacity: 0, y: -10}}
          animate={heroRevealed ? {opacity: 1, y: 0} : {opacity: 0, y: -10}}
          transition={{duration: MOTION_DURATIONS.choreo, delay: 0.04, ease: CUBIC_EASE}}
          className="sticky top-3 z-30 px-3 sm:px-6 pt-[env(safe-area-inset-top)] pointer-events-none"
        >
          <div className="pointer-events-auto relative max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 rounded-2xl bg-[#FFFDF5] border-[2.5px] border-[#09090B] shadow-[5px_5px_0_#09090B] overflow-hidden flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => scrollToSection('top')}
                aria-label="Back to top"
                className="inline-flex items-center shrink-0 min-h-[44px] px-1 -ml-1 rounded-lg select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <img
                  src={dmsPortoLogo}
                  alt="dms porto"
                  width={471}
                  height={253}
                  draggable={false}
                  className="h-7 md:h-8 w-auto object-contain"
                />
              </button>

              {accessRole === 'developer' && (
                <button
                  type="button"
                  onClick={toggleDevMode}
                  aria-pressed={devMode}
                  title="Open Dev Mode Media Studio (Ctrl+Shift+D)"
                  className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-mono font-bold cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                    devMode
                      ? 'brutal-cta-purple'
                      : 'brutal-button'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Dev Mode</span>
                </button>
              )}
            </div>

            {/* Desktop Navigation (single-line high-contrast chunky blocks) */}
            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-[#09090B]"
            >
              {(
                [
                  {id: 'works', label: 'Works'},
                  {id: 'color-grade', label: 'Color Grade'},
                  {id: 'timeline', label: 'Timeline'},
                  {id: 'capabilities', label: 'Services'},
                  {id: 'contact', label: 'Contact'},
                ] as Array<{id: SectionId; label: string}>
              ).map((item) => {
                const isActive = activeTab === 'portfolio' && activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                      isActive
                        ? 'bg-[#FFE600] text-[#09090B] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]'
                        : 'border-2 border-transparent hover:bg-[#FEF9C3] hover:border-[#09090B]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={openTheAgentTab}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                  activeTab === 'the-agent'
                    ? 'bg-[#FF4D8D] text-[#09090B] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]'
                    : 'bg-[#7C3AED] text-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] hover:bg-[#6D28D9]'
                }`}
              >
                The Agent
              </button>
            </nav>

            {/* Mobile Quick Actions (>=44px touch targets) */}
            <div className="md:hidden flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileTap={{scale: 0.95}}
                transition={CUBIC_TACTILE}
                onClick={() =>
                  activeTab === 'the-agent' ? scrollToSection('top') : openTheAgentTab()
                }
                className={`inline-flex items-center h-11 px-3 rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                  activeTab === 'the-agent'
                    ? 'brutal-cta-pink'
                    : 'brutal-button'
                }`}
              >
                <span>{activeTab === 'the-agent' ? 'Works' : 'Agent'}</span>
              </motion.button>
              {accessRole === 'developer' && (
                <motion.button
                  type="button"
                  whileTap={{scale: 0.95}}
                  transition={CUBIC_TACTILE}
                  onClick={toggleDevMode}
                  aria-pressed={devMode}
                  className={`inline-flex items-center gap-1 h-11 px-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                    devMode
                      ? 'brutal-cta-purple'
                      : 'brutal-button'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Dev</span>
                </motion.button>
              )}
              <motion.button
                type="button"
                whileTap={{scale: 0.95}}
                transition={CUBIC_TACTILE}
                onClick={() => setActiveFilmId(resolvedShowreel.id)}
                className="brutal-cta inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Reel</span>
              </motion.button>
            </div>

            <motion.div
              aria-hidden="true"
              style={{scaleX: scrollYProgress}}
              className="pointer-events-none absolute bottom-0 inset-x-0 h-[3px] origin-left bg-[#7C3AED]"
            />
          </div>
          <motion.div
            aria-hidden="true"
            style={{opacity: headerFadeOpacity}}
            className="hidden"
          />
        </motion.header>

        {activeTab === 'the-agent' ? (
          <main id="main-content" className="relative z-10 flex-1 bg-transparent">
            <Suspense fallback={null}>
              <TheAgentTab />
            </Suspense>
          </main>
        ) : (
          <div ref={portfolioRootRef} className="relative z-10">
            {/* BAND 1: Collage Maximalism Hero */}
            <section
              id="top"
              ref={heroSectionRef}
              className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-14 md:pt-14 md:pb-20 overflow-x-clip"
            >
              <HeroAmbientAccents
                heroScrollProgress={heroScrollProgress}
                constraintsRef={heroSectionRef}
              />

              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                {/* Portrait & Direct Studio Identity */}
                <div
                  data-gsap="hero-avatar"
                  className="inline-flex flex-col items-center gap-3"
                >
                  <div
                    className={`relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-[3px] border-[#09090B] bg-[#09090B] ${
                      devMode
                        ? 'shadow-[5px_5px_0_#7C3AED]'
                        : 'shadow-[5px_5px_0_#FFE600]'
                    }`}
                  >
                    {resolvedAvatar.kind === 'video' ? (
                      <video
                        src={resolvedAvatar.src}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          transform: `scale(${avatarFrame.scale})`,
                          transformOrigin: `${avatarFrame.posX}% ${avatarFrame.posY}%`,
                        }}
                        className="w-full h-full object-cover grayscale contrast-110"
                      />
                    ) : (
                      <img
                        src={resolvedAvatar.src}
                        alt="Dimas, Video Editor and Cinematographer"
                        width={192}
                        height={192}
                        fetchPriority="high"
                        style={{
                          transform: `scale(${avatarFrame.scale})`,
                          transformOrigin: `${avatarFrame.posX}% ${avatarFrame.posY}%`,
                        }}
                        className="w-full h-full object-cover grayscale contrast-110"
                      />
                    )}
                    <DevMediaSlotBadge
                      slotKey="asset:portraitAvatar"
                      label="Edit"
                      position="center"
                      compact
                    />
                  </div>
                  <p className="inline-flex items-center px-3.5 py-1 rounded-full bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold tracking-tight text-[#09090B]">
                    Dimas · Director of Photography &amp; Editor · Jakarta
                  </p>
                </div>

                {/* Expressive Maximalist Syne Display Headline */}
                <h1
                  aria-label="Shaping quiet rhythm and kinetic clarity in every frame."
                  className="font-display text-[clamp(2.25rem,5.2vw,4.2rem)] font-extrabold tracking-[-0.03em] leading-[1.06] text-[#09090B] text-balance"
                >
                  {[
                    'Shaping',
                    'quiet',
                    'rhythm',
                    'and',
                    'kinetic',
                    'clarity',
                    'in',
                    'every',
                    'frame.',
                  ].map((word, idx) => {
                    const isYellowStamp = word === 'rhythm';
                    const isPurpleStamp = word === 'frame.';
                    return (
                      <span
                        key={`${word}-${idx}`}
                        data-gsap="hero-word"
                        aria-hidden="true"
                        className={`inline-block mr-[0.22em] last:mr-0 ${
                          isYellowStamp
                            ? 'bg-[#FFE600] text-[#09090B] px-2.5 py-0.5 rounded-xl border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] -rotate-1'
                            : isPurpleStamp
                              ? 'bg-[#7C3AED] text-white px-2.5 py-0.5 rounded-xl border-[2.5px] border-[#09090B] shadow-[4px_4px_0_#09090B] rotate-1'
                              : ''
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </h1>

                <p
                  data-gsap="hero-sub"
                  className="text-sm sm:text-base font-sans font-medium text-[#27272A] leading-[1.65] max-w-xl mx-auto"
                >
                  Crafting commercial films, minimalist music videos, and tactile brand documentaries, from camera choreography on set to final color and cut.
                </p>

                {/* Dual Chunky Neo-Brutalist CTAs */}
                <div
                  data-gsap="hero-cta"
                  className="flex flex-wrap items-center justify-center gap-3.5 pt-1"
                >
                  <MagneticButton>
                    <Button
                      type="button"
                      onClick={() => setActiveFilmId(resolvedShowreel.id)}
                      className="brutal-cta h-12 px-6 rounded-xl text-[#09090B] text-xs sm:text-sm font-mono font-bold gap-2 cursor-pointer"
                    >
                      <span>Watch 2026 Showreel</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </MagneticButton>

                  <MagneticButton strength={0.18}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => scrollToSection('works')}
                      className="brutal-button h-12 px-5 rounded-xl text-[#09090B] text-xs sm:text-sm font-mono font-bold cursor-pointer"
                    >
                      Browse Works
                    </Button>
                  </MagneticButton>
                </div>
              </div>

              {/* Neo-Brutalist Bright Yellow Frame enclosing Calibrated Dark Neutral Showreel */}
              <div
                data-gsap="hero-showreel"
                className="relative mt-10 md:mt-12 max-w-4xl mx-auto"
              >
                <div
                  className={`rounded-3xl bg-[#FFE600] p-2 sm:p-2.5 border-[3px] border-[#09090B] shadow-[8px_8px_0_#09090B] ${
                    devMode ? 'ring-4 ring-[#7C3AED]/45' : ''
                  }`}
                >
                  <motion.button
                    type="button"
                    data-cursor="Watch Reel ↗"
                    whileTap={{scale: 0.99}}
                    transition={CUBIC_TACTILE}
                    onClick={() => setActiveFilmId(resolvedShowreel.id)}
                    aria-label="Play 2026 Showreel"
                    className="group relative block w-full aspect-video rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B] text-left cursor-pointer md:cursor-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED]"
                  >
                    <div className="w-full h-full transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]">
                      <div
                        data-gsap="hero-showreel-media"
                        className={`w-full h-full ${isDesktopMotion ? 'will-change-transform' : ''}`}
                      >
                        <FilmImage
                          src={resolvedShowreel.image}
                          kind={resolvedShowreel.imageKind}
                          alt="Minimalist daylight film studio set with cinema camera on slider dolly"
                          title="2026 Director Showreel"
                          priority
                        />
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/85 via-black/15 to-transparent pointer-events-none" />

                    <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 flex items-end justify-between gap-4 text-white">
                      <div>
                        <p className="inline-flex items-center px-2 py-0.5 rounded bg-[#FFE600] border border-[#09090B] text-[10px] sm:text-xs font-mono font-bold text-[#09090B] tabular-nums mb-1">
                          {['Showreel 2026', resolvedShowreel.duration, resolvedShowreel.fps]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="text-sm sm:text-lg font-display font-extrabold tracking-tight text-white">
                          Director of Photography &amp; Lead Editor
                        </p>
                      </div>

                      <span className="brutal-cta inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-[180ms] group-hover:scale-110 shrink-0">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </span>
                    </div>
                  </motion.button>
                </div>

                <DevMediaSlotBadge
                  slotKey="asset:showreelHero"
                  label="Ganti Cover & Video Reel"
                  position="top-left"
                />
              </div>

              {/* Collage Studio Production Specs Cards */}
              <div className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
                {STUDIO_TECHNICAL_SPECS.map((spec, idx) => {
                  const bgColors = ['bg-white', 'bg-[#FEF9C3]', 'bg-[#F3E8FF]', 'bg-[#FCE7F3]'];
                  return (
                    <div
                      key={spec.label}
                      data-gsap="hero-spec"
                      className={`brutal-card ${bgColors[idx % bgColors.length]} rounded-xl p-4 space-y-1`}
                    >
                      <p className="text-[11px] font-mono font-bold uppercase text-[#52525B]">
                        {spec.label}
                      </p>
                      <p className="text-sm font-display font-extrabold tracking-tight text-[#09090B]">
                        {spec.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Infinite Marquee Divider 1 */}
            <MarqueeStrip
              variant="yellow"
              items={[
                'CINEMATOGRAPHY',
                'COLOR GRADING',
                'DIRECTING',
                'NARRATIVE CUT',
                '24FPS LOG',
                'JAKARTA STUDIO',
              ]}
            />

            {/* BAND 2: Portfolio Sections */}
            <main id="main-content" className="flex-1 bg-transparent">
              {/* SECTION 01: Selected Works */}
              <section
                id="works"
                className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 space-y-6 md:space-y-10"
              >
                <div data-gsap="works-head" className="flex items-center gap-4 pb-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold text-[#09090B] tracking-wide shrink-0">
                    01. Selected Works
                  </span>
                  <div className="h-[2.5px] flex-1 bg-[#09090B]" />
                </div>

                <div
                  data-gsap="works-head"
                  className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6"
                >
                  <div className="space-y-2 max-w-xl">
                    <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#09090B]">
                      Filmography &amp; Cutdowns
                    </h2>
                    <p className="text-[clamp(0.875rem,1.05vw,1rem)] font-sans text-[#27272A] leading-[1.6] max-w-[52ch]">
                      Tap any film card to open the full viewer, playable cut, and camera notes.
                    </p>
                  </div>

                  <HorizontalScrollFade className="max-w-full self-start md:self-auto">
                    <div
                      role="tablist"
                      aria-label="Filter films by category"
                      className="brutal-card bg-white inline-flex items-center gap-1 p-1.5 rounded-xl w-max"
                    >
                      {CATEGORIES.map((category) => {
                        const isActive = selectedCategory === category;
                        return (
                          <motion.button
                            key={category}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            whileTap={{scale: 0.95}}
                            transition={CUBIC_TACTILE}
                            onClick={() => setSelectedCategory(category)}
                            className={`relative px-3.5 min-h-[44px] md:min-h-[36px] text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                              isActive ? 'text-[#09090B]' : 'text-[#3F3F46] hover:text-[#09090B]'
                            }`}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="active-category-tab"
                                transition={CUBIC_INDICATOR}
                                className="absolute inset-0 rounded-lg bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                              />
                            )}
                            <span className="relative z-10">{category}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </HorizontalScrollFade>
                </div>

                {/* Mobile Tap Rows */}
                <div className="brutal-card bg-white relative md:hidden divide-y-2 divide-[#09090B] rounded-2xl overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredFilms.map((film, idx) => (
                      <motion.div
                        key={film.id}
                        layout="position"
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.98}}
                        transition={{
                          duration: MOTION_DURATIONS.standard,
                          delay: idx * 0.035,
                          ease: CUBIC_EASE,
                        }}
                        className="relative"
                      >
                        <motion.button
                          type="button"
                          whileTap={{scale: 0.985}}
                          transition={CUBIC_TACTILE}
                          onClick={() => setActiveFilmId(film.id)}
                          className="w-full flex items-center gap-3.5 p-3 text-left active:bg-[#FEF9C3] transition-colors min-h-[88px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#7C3AED]"
                        >
                          <div className="relative w-28 aspect-[16/10] rounded-xl overflow-hidden bg-[#09090B] border-2 border-[#09090B] shrink-0">
                            <div className="w-full h-full">
                              <FilmImage
                                src={film.image}
                                kind={film.imageKind}
                                alt={film.title}
                                title={film.title}
                                compactFallback
                              />
                            </div>
                            <span className="brutal-cta absolute right-1.5 bottom-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md">
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[10px] font-mono font-bold text-[#7C3AED] tabular-nums truncate">
                              {[film.category, film.aspect, film.duration].filter(Boolean).join(' · ')}
                            </p>
                            <h3 className="text-sm font-display font-extrabold tracking-tight text-[#09090B] truncate">
                              {film.title}
                            </h3>
                            <p className="text-xs font-sans font-medium text-[#3F3F46] truncate">
                              {film.client}
                            </p>
                          </div>
                        </motion.button>

                        <DevMediaSlotBadge
                          slotKey={`film:${film.id}:cover`}
                          label="Edit"
                          position="top-left"
                          compact
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop Bento Grid with Playful Collage Card Bases + Neutral Dark Film Thumbnails */}
                <LayoutGroup id="desktop-film-grid">
                  <motion.div
                    layout
                    transition={{layout: {duration: MOTION_DURATIONS.macro, ease: CUBIC_EASE}}}
                    className="relative hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {filteredFilms.map((film, idx) => {
                        const isFeaturedSpan = selectedCategory === 'All' && idx === 0;
                        const staggerDelay = Math.min(idx, 6) * 0.055;
                        const layoutTransition = {
                          duration: MOTION_DURATIONS.choreo,
                          delay: staggerDelay,
                          ease: CUBIC_EMPHASIS,
                        };
                        const cardColors = [
                          'bg-white',
                          'bg-[#FEF9C3]',
                          'bg-[#F3E8FF]',
                          'bg-[#FCE7F3]',
                          'bg-[#ECFCCB]',
                        ];
                        const cardBg = cardColors[idx % cardColors.length];

                        return (
                          <motion.article
                            key={film.id}
                            id={`work-${film.id}`}
                            data-gsap="work-card"
                            layout
                            initial={{opacity: 0, y: 18, scale: 0.965}}
                            animate={{opacity: 1, y: 0, scale: 1}}
                            exit={{
                              opacity: 0,
                              scale: 0.95,
                              y: 10,
                              transition: {duration: MOTION_DURATIONS.micro, ease: CUBIC_EASE},
                            }}
                            transition={{
                              layout: layoutTransition,
                              opacity: {
                                duration: MOTION_DURATIONS.standard,
                                delay: staggerDelay * 0.8,
                                ease: CUBIC_EASE,
                              },
                              y: {duration: MOTION_DURATIONS.macro, delay: staggerDelay, ease: CUBIC_EASE},
                              scale: {
                                duration: MOTION_DURATIONS.macro,
                                delay: staggerDelay,
                                ease: CUBIC_EASE,
                              },
                            }}
                            className={`relative ${isFeaturedSpan ? 'md:col-span-2' : ''}`}
                          >
                            <motion.button
                              type="button"
                              data-cursor="Watch Film ↗"
                              whileHover={{y: -4, x: -2}}
                              whileTap={{scale: 0.985}}
                              transition={CUBIC_TACTILE}
                              onClick={() => setActiveFilmId(film.id)}
                              className={`brutal-card ${cardBg} group w-full text-left rounded-3xl overflow-hidden hover:shadow-[8px_8px_0_#09090B] transition-shadow duration-200 cursor-pointer md:cursor-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED] ${
                                devMode ? 'ring-4 ring-[#7C3AED]/45' : ''
                              }`}
                            >
                              {/* Neutral calibrated dark media slot for accurate cinematography color */}
                              <motion.div
                                layout
                                transition={{layout: layoutTransition}}
                                className={`relative w-full overflow-hidden bg-[#09090B] border-b-[2.5px] border-[#09090B] ${
                                  isFeaturedSpan ? 'aspect-[16/9]' : 'aspect-[4/3]'
                                }`}
                              >
                                <motion.div
                                  style={
                                    !isDesktopMotion
                                      ? undefined
                                      : {scale: thumbnailKineticScale}
                                  }
                                  className={`w-full h-full ${isDesktopMotion ? 'will-change-transform' : ''}`}
                                >
                                  <FilmImage
                                    src={film.image}
                                    kind={film.imageKind}
                                    alt={`${film.title} for ${film.client}`}
                                    title={film.title}
                                    className="transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                                  />
                                </motion.div>

                                {/* Viewfinder Corner Reticles on Hover */}
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-3.5 opacity-0 scale-[0.97] group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                                >
                                  <span className="absolute top-0 left-0 w-4 h-4 border-t-[2.5px] border-l-[2.5px] border-[#FFE600]" />
                                  <span className="absolute top-0 right-0 w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#FFE600]" />
                                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b-[2.5px] border-l-[2.5px] border-[#FFE600]" />
                                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b-[2.5px] border-r-[2.5px] border-[#FFE600]" />
                                </div>

                                {/* Aspect Ratio Readout */}
                                <span className="pointer-events-none absolute top-3.5 right-3.5 inline-flex items-center rounded-md bg-[#09090B] border-2 border-[#FFE600] px-2 py-0.5 text-[10px] font-mono font-bold text-[#FFE600] tabular-nums">
                                  {film.aspect}
                                </span>

                                <span className="brutal-cta absolute right-4 bottom-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-[180ms] group-hover:scale-110">
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </span>
                              </motion.div>

                              <motion.div
                                layout="position"
                                transition={{layout: layoutTransition}}
                                className="p-6 space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
                                  <span className="px-2 py-0.5 rounded bg-white border border-[#09090B] font-mono font-bold text-[11px] text-[#09090B]">
                                    {[film.category, film.client].filter(Boolean).join(' · ')}
                                  </span>
                                  <span className="font-mono font-bold text-[#7C3AED]">
                                    {[film.duration, film.fps].filter(Boolean).join(' · ')}
                                  </span>
                                </div>

                                <h3 className="font-display text-xl font-extrabold tracking-tight text-[#09090B] group-hover:text-[#7C3AED] transition-colors">
                                  {film.title}
                                </h3>

                                <p className="text-sm font-sans text-[#27272A] leading-relaxed line-clamp-2">
                                  {film.summary}
                                </p>

                                <div className="pt-2.5 border-t-2 border-[#09090B] flex items-center justify-between gap-3 text-[11px] font-mono font-bold text-[#52525B]">
                                  <span className="truncate">{film.cameraSpec}</span>
                                  <span className="shrink-0 tabular-nums text-[#09090B]">{film.year}</span>
                                </div>
                              </motion.div>
                            </motion.button>

                            <DevMediaSlotBadge
                              slotKey={`film:${film.id}:cover`}
                              label="Ganti Media & Video"
                              position="top-left"
                            />
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </LayoutGroup>
              </section>

              {/* SECTION 02: Color Grading Compare Slider */}
              <ColorGradingCompare />

              {/* SECTION 03: Interactive Editing Timeline Breakdown */}
              <TimelineBreakdown />

              {/* Infinite Marquee Divider 2 */}
              <MarqueeStrip
                variant="pink"
                reverse
                items={[
                  'CAMERA PACKAGE',
                  'OFFLINE EDIT',
                  'ONLINE FINISH',
                  'DAVINCI RESOLVE',
                  'SOUND DESIGN',
                  'COMMERCIAL CUT',
                ]}
              />

              {/* SECTION 04: Asymmetric Practice & Production Scope */}
              <section
                id="capabilities"
                className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24 space-y-8 md:space-y-12"
              >
                <div data-gsap="cap-head" className="flex items-center gap-4 pb-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold text-[#09090B] tracking-wide shrink-0">
                    04. Studio Practice
                  </span>
                  <div className="h-[2.5px] flex-1 bg-[#09090B]" />
                </div>

                {/* Mobile Accordion */}
                <div className="md:hidden space-y-4">
                  <h2
                    data-gsap="cap-head"
                    className="font-display text-[clamp(1.75rem,4vw,2.1rem)] font-extrabold tracking-[-0.03em] leading-[1.1] text-[#09090B]"
                  >
                    From camera package on set to final color and cut.
                  </h2>

                  <div className="brutal-card bg-white divide-y-2 divide-[#09090B] rounded-2xl px-4">
                    {CAPABILITIES.map((cap) => {
                      const isOpen = expandedCapIndex === cap.index;
                      return (
                        <div key={cap.index} data-gsap="cap-row" className="py-1">
                          <motion.button
                            type="button"
                            aria-expanded={isOpen}
                            whileTap={{scale: 0.99}}
                            transition={CUBIC_TACTILE}
                            onClick={() => setExpandedCapIndex(isOpen ? '' : cap.index)}
                            className="w-full flex items-center justify-between gap-4 min-h-[54px] py-2 text-left rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                          >
                            <div className="flex items-baseline gap-3">
                              <span className="text-xs font-mono font-bold text-[#7C3AED] tabular-nums">
                                {cap.index}.
                              </span>
                              <span className="text-base font-display font-extrabold tracking-tight text-[#09090B]">
                                {cap.title}
                              </span>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-[#09090B] transition-transform duration-[240ms] shrink-0 ${
                                isOpen ? 'rotate-180 text-[#7C3AED]' : ''
                              }`}
                            />
                          </motion.button>

                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{opacity: 0, y: -4}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: -4}}
                                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                                className="pb-4 pl-7 space-y-3"
                              >
                                <p className="text-sm font-sans text-[#27272A] leading-relaxed">
                                  {cap.description}
                                </p>
                                <p className="text-[11px] font-mono font-bold text-[#52525B]">
                                  {cap.deliverables}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCapabilityScope(cap.index)}
                                  className="brutal-cta inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                                >
                                  <span>Book this discipline</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop 2-Zone Asymmetric Practice Ledger */}
                <div className="hidden md:grid md:grid-cols-12 gap-10 lg:gap-14 items-start">
                  <div className="md:col-span-5 md:sticky md:top-28">
                    <div
                      data-gsap="cap-sticky"
                      className="brutal-card bg-[#FEF9C3] rounded-3xl p-7 space-y-4"
                    >
                      <h2 className="font-display text-[clamp(1.85rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#09090B]">
                        From camera package on set to final color and cut.
                      </h2>
                      <p className="text-sm sm:text-base font-sans text-[#27272A] leading-[1.65] max-w-[42ch]">
                        Every production runs on a single unified pipeline so pacing, natural light, and color temperature stay cohesive through delivery.
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    {CAPABILITIES.map((cap, idx) => {
                      const Icon = CAPABILITY_ICONS[idx] ?? Camera;
                      const iconColors = ['bg-[#FFE600]', 'bg-[#FF4D8D]', 'bg-[#B8FF3B]'];
                      return (
                        <div
                          key={cap.index}
                          data-gsap="cap-row"
                          className="brutal-card bg-white rounded-2xl p-6 flex flex-col gap-3.5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-[#09090B] shrink-0 ${iconColors[idx % iconColors.length]}`}
                              >
                                <Icon className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="block text-[11px] font-mono font-bold text-[#7C3AED] tabular-nums">
                                  Discipline {cap.index}
                                </span>
                                <h3 className="text-lg font-display font-extrabold tracking-tight text-[#09090B]">
                                  {cap.title}
                                </h3>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectCapabilityScope(cap.index)}
                              className="brutal-button inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl text-xs font-mono font-bold cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                            >
                              <span>Select Scope</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-sm font-sans text-[#27272A] leading-relaxed max-w-[60ch]">
                            {cap.description}
                          </p>
                          <p className="text-[11px] font-mono font-bold text-[#52525B] pt-1 border-t border-[#09090B]/20">
                            {cap.deliverables}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* SECTION 05: Client Notes & Production FAQ */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 space-y-12 md:space-y-16">
                <div className="flex items-center gap-4 pb-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#B8FF3B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold text-[#09090B] tracking-wide shrink-0">
                    05. Client Proof &amp; Studio FAQ
                  </span>
                  <div className="h-[2.5px] flex-1 bg-[#09090B]" />
                </div>

                {/* Client Testimonials Grid */}
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2 max-w-xl">
                      <h2 className="font-display text-[clamp(1.65rem,2.9vw,2.35rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#09090B] text-balance">
                        Trusted by directors, labels, and design houses.
                      </h2>
                    </div>
                    <p className="text-xs font-mono font-bold text-[#52525B]">
                      Selected client feedback · Commercial &amp; Music Video
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {CLIENT_TESTIMONIALS.map((item, idx) => {
                      const cardBgs = ['bg-white', 'bg-[#FEF9C3]', 'bg-[#F3E8FF]'];
                      return (
                        <blockquote
                          key={item.id}
                          className={`brutal-card ${cardBgs[idx % cardBgs.length]} rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6`}
                        >
                          <p className="text-sm sm:text-[15px] font-sans font-medium text-[#09090B] leading-relaxed">
                            &ldquo;{item.quote}&rdquo;
                          </p>
                          <footer className="pt-4 border-t-2 border-[#09090B] space-y-1">
                            <p className="text-sm font-display font-extrabold text-[#09090B]">
                              {item.author}
                            </p>
                            <p className="text-xs font-sans text-[#3F3F46]">
                              {item.role} · {item.organization}
                            </p>
                            <p className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-[#09090B] text-[11px] font-mono font-bold text-[#7C3AED] mt-1">
                              {item.projectRef}
                            </p>
                          </footer>
                        </blockquote>
                      );
                    })}
                  </div>
                </div>

                {/* Studio FAQ Accordion */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start pt-4">
                  <div className="md:col-span-5 space-y-3">
                    <h3 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold tracking-[-0.03em] leading-[1.1] text-[#09090B] text-balance">
                      Workflow, turnaround, and remote delivery.
                    </h3>
                    <p className="text-sm font-sans text-[#27272A] leading-relaxed max-w-[40ch]">
                      Practical details on how shoots, remote assemblies, and DaVinci Resolve passes are scheduled.
                    </p>
                    <p className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FFE600] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B]">
                      Booking Window · Jakarta &amp; Worldwide Remote
                    </p>
                  </div>

                  <div className="md:col-span-7 brutal-card bg-white rounded-3xl divide-y-2 divide-[#09090B] px-5 sm:px-6">
                    {STUDIO_FAQ.map((faq) => {
                      const isOpen = expandedFaqId === faq.id;
                      return (
                        <div key={faq.id} className="py-1">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setExpandedFaqId(isOpen ? '' : faq.id)}
                            className="w-full flex items-center justify-between gap-4 min-h-[54px] py-3 text-left cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                          >
                            <span className="text-sm sm:text-base font-display font-extrabold tracking-tight text-[#09090B]">
                              {faq.question}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-[#09090B] transition-transform duration-[240ms] shrink-0 ${
                                isOpen ? 'rotate-180 text-[#7C3AED]' : ''
                              }`}
                            />
                          </button>

                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{opacity: 0, y: -4}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: -4}}
                                transition={{duration: MOTION_DURATIONS.standard, ease: CUBIC_EASE}}
                                className="pb-4 space-y-2"
                              >
                                <p className="text-sm font-sans text-[#27272A] leading-relaxed">
                                  {faq.answer}
                                </p>
                                <p className="text-[11px] font-mono font-bold text-[#7C3AED]">
                                  {faq.detail}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Infinite Marquee Divider 3 */}
              <MarqueeStrip
                variant="purple"
                items={[
                  'BOOKINGS OPEN 2026',
                  'COMMERCIAL FILMS',
                  'MUSIC VIDEOS',
                  'REMOTE COLOR GRADE',
                  'JAKARTA & WORLDWIDE',
                ]}
              />

              {/* BAND 4: Neo-Brutalist Checkerboard Contact & Footer Section */}
              <section
                id="contact"
                className="bg-[#FFFDF5] bg-brutal-checker pt-14 md:pt-24 pb-8"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-12">
                  {/* Centered Handshake Circle + Availability Tag + Headline + Dual Pill Actions + Socials */}
                  <div className="max-w-xl mx-auto text-center space-y-5">
                    <div
                      data-gsap="contact-item"
                      className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED] text-white border-[3px] border-[#09090B] shadow-[5px_5px_0_#09090B]"
                    >
                      <Handshake className="w-7 h-7 stroke-[2]" />
                    </div>

                    <div>
                      <p
                        data-gsap="contact-item"
                        className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold text-[#09090B]"
                      >
                        Bookings Open · Jakarta &amp; Worldwide Remote
                      </p>
                    </div>

                    <h2
                      data-gsap="contact-item"
                      className="font-display text-[clamp(1.9rem,3.8vw,2.9rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#09090B] text-balance"
                    >
                      Tell me about your next project
                    </h2>

                    <p
                      data-gsap="contact-item"
                      className="text-sm sm:text-base font-sans font-medium text-[#27272A] leading-relaxed"
                    >
                      Available for commercial shoots, remote narrative editing, and DaVinci Resolve
                      color grading across Southeast Asia and worldwide.
                    </p>

                    <div
                      data-gsap="contact-item"
                      className="flex flex-wrap items-center justify-center gap-3 pt-1"
                    >
                      <MagneticButton>
                        <Button
                          type="button"
                          onClick={handleCopyEmail}
                          className="brutal-cta h-12 px-6 rounded-xl text-[#09090B] text-xs sm:text-sm font-mono font-bold gap-2 cursor-pointer"
                        >
                          {emailCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          <span>{emailCopied ? 'Copied Email' : 'Email Me'}</span>
                        </Button>
                      </MagneticButton>

                      <MagneticButton strength={0.18}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setMobileSheetOpen(true);
                            } else {
                              setSubmittedBrief(null);
                              document.getElementById('inquiry-name')?.focus();
                            }
                          }}
                          className="brutal-button h-12 px-5 rounded-xl text-[#09090B] text-xs sm:text-sm font-mono font-bold gap-2 cursor-pointer"
                        >
                          <Clapperboard className="w-4 h-4 text-[#7C3AED]" />
                          <span>Start Project Brief</span>
                        </Button>
                      </MagneticButton>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      {STUDIO_SOCIALS.map((social) => (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brutal-button inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-xl text-xs font-mono font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                        >
                          <span>{social.label}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Prepared Brief Confirmation Banner */}
                  {submittedBrief && (
                    <div className="brutal-card-elevated md:hidden rounded-2xl p-5 space-y-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#B8FF3B] border border-[#09090B] text-[11px] font-mono font-bold text-[#09090B]">
                          {submittedBrief.savedOnServer ? 'Brief Sent & Logged' : 'Brief Ready to Dispatch'}
                        </span>
                        <h3 className="text-base font-display font-extrabold text-[#09090B]">
                          {submittedBrief.scope} for {submittedBrief.name}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        <a
                          href={submittedBrief.mailtoHref}
                          className="brutal-cta inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl text-xs font-mono font-bold"
                        >
                          <span>Open Draft in Email App</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setSubmittedBrief(null)}
                          className="brutal-button min-h-[44px] px-4 rounded-xl text-xs font-mono font-bold"
                        >
                          Send Another Brief
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Desktop Brief Form nested inside elevated Cream Brutalist Card */}
                  <div
                    data-gsap="contact-item"
                    className="brutal-card-elevated hidden md:block max-w-3xl mx-auto rounded-3xl p-8"
                  >
                    {submittedBrief ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-mono font-bold text-[#7C3AED]">
                              {submittedBrief.savedOnServer
                                ? `Brief Logged (${submittedBrief.id ?? 'Studio Inbox'}) & Copied`
                                : 'Brief Copied & Ready to Send'}
                            </p>
                            <h3 className="text-xl font-display font-extrabold tracking-tight text-[#09090B]">
                              {submittedBrief.scope} for {submittedBrief.name}
                            </h3>
                            <p className="text-xs font-sans text-[#3F3F46]">
                              Reply address: {submittedBrief.email}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#B8FF3B] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] px-3 py-1 text-xs font-mono font-bold text-[#09090B]">
                            <Check className="w-3.5 h-3.5" />
                            <span>{submittedBrief.savedOnServer ? 'Sent' : 'Prepared'}</span>
                          </span>
                        </div>

                        <div className="brutal-subtle rounded-2xl p-4 text-sm font-sans text-[#09090B] whitespace-pre-wrap leading-relaxed">
                          {submittedBrief.notes}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <a
                              href={submittedBrief.mailtoHref}
                              className="brutal-cta inline-flex items-center gap-2 h-11 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                            >
                              <span>Open Draft in Email App</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(submittedBrief.summaryText);
                                  toast.success('Brief summary copied to clipboard');
                                } catch {
                                  toast.info(`Email direct: ${STUDIO_EMAIL}`);
                                }
                              }}
                              className="brutal-button inline-flex items-center gap-1.5 h-11 px-5 rounded-xl text-xs sm:text-sm font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Brief</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSubmittedBrief(null)}
                            className="brutal-button h-11 px-4 rounded-xl text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                          >
                            Send Another Brief
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitInquiry} noValidate className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label htmlFor="inquiry-name" className="block text-xs font-mono font-bold uppercase text-[#09090B]">
                              Your Name
                            </label>
                            <input
                              id="inquiry-name"
                              type="text"
                              autoComplete="name"
                              value={formName}
                              onChange={(e) => {
                                setFormName(e.target.value);
                                if (formErrors.name) {
                                  setFormErrors((prev) => ({...prev, name: undefined}));
                                }
                              }}
                              aria-invalid={Boolean(formErrors.name)}
                              aria-describedby={formErrors.name ? 'inquiry-name-error' : undefined}
                              placeholder="Your name"
                              className={`brutal-input w-full h-11 rounded-xl px-3.5 text-base md:text-sm focus:outline-none ${
                                formErrors.name ? 'border-[#E11D48] bg-[#FFF1F2]' : ''
                              }`}
                            />
                            {formErrors.name && (
                              <p id="inquiry-name-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                                {formErrors.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="inquiry-email" className="block text-xs font-mono font-bold uppercase text-[#09090B]">
                              Email Address
                            </label>
                            <input
                              id="inquiry-email"
                              type="email"
                              autoComplete="email"
                              value={formEmail}
                              onChange={(e) => {
                                setFormEmail(e.target.value);
                                if (formErrors.email) {
                                  setFormErrors((prev) => ({...prev, email: undefined}));
                                }
                              }}
                              aria-invalid={Boolean(formErrors.email)}
                              aria-describedby={formErrors.email ? 'inquiry-email-error' : undefined}
                              placeholder="you@studio.com"
                              className={`brutal-input w-full h-11 rounded-xl px-3.5 text-base md:text-sm focus:outline-none ${
                                formErrors.email ? 'border-[#E11D48] bg-[#FFF1F2]' : ''
                              }`}
                            />
                            {formErrors.email && (
                              <p id="inquiry-email-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                                {formErrors.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <span id="desktop-scope-label" className="block text-xs font-mono font-bold uppercase text-[#09090B]">
                            Project Scope
                          </span>
                          <div
                            role="radiogroup"
                            aria-labelledby="desktop-scope-label"
                            className="flex flex-wrap gap-2"
                          >
                            {PROJECT_SCOPES.map((scope) => {
                              const selected = formScope === scope;
                              return (
                                <motion.button
                                  key={scope}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  whileTap={{scale: 0.96}}
                                  transition={CUBIC_TACTILE}
                                  onClick={() => setFormScope(scope)}
                                  className={`inline-flex items-center gap-1.5 min-h-[44px] md:min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                                    selected ? 'brutal-cta' : 'brutal-button'
                                  }`}
                                >
                                  <AnimatePresence initial={false}>
                                    {selected && (
                                      <motion.span
                                        key="scope-check"
                                        initial={{opacity: 0, scale: 0.7}}
                                        animate={{opacity: 1, scale: 1}}
                                        exit={{opacity: 0, scale: 0.7}}
                                        transition={CUBIC_MICRO}
                                        className="inline-flex"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                  <span>{scope}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="inquiry-notes" className="block text-xs font-mono font-bold uppercase text-[#09090B]">
                            Project Brief &amp; Timeline
                          </label>
                          <textarea
                            id="inquiry-notes"
                            rows={3}
                            value={formNotes}
                            onChange={(e) => {
                              setFormNotes(e.target.value);
                              if (formErrors.notes) {
                                setFormErrors((prev) => ({...prev, notes: undefined}));
                              }
                            }}
                            aria-invalid={Boolean(formErrors.notes)}
                            aria-describedby={formErrors.notes ? 'inquiry-notes-error' : undefined}
                            placeholder="Share shoot dates, deliverables, or visual references..."
                            className={`brutal-input w-full rounded-xl px-3.5 py-3 text-base md:text-sm focus:outline-none ${
                              formErrors.notes ? 'border-[#E11D48] bg-[#FFF1F2]' : ''
                            }`}
                          />
                          {formErrors.notes && (
                            <p id="inquiry-notes-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                              {formErrors.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                          <span className="text-xs font-mono font-bold text-[#52525B]">
                            {STUDIO_EMAIL} · Typical response within 24 hours
                          </span>
                          <MagneticButton>
                            <Button
                              type="submit"
                              disabled={isSubmittingBrief}
                              className="brutal-cta h-11 px-6 rounded-xl font-mono font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmittingBrief ? 'Sending Project Brief...' : 'Send Project Brief'}
                            </Button>
                          </MagneticButton>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Clean Neo-Brutalist Footer */}
                  <footer className="brutal-card bg-white rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono font-bold text-[#27272A]">
                    <div className="inline-flex items-center gap-2.5">
                      <img
                        src={dmsPortoLogo}
                        alt="dms porto"
                        width={471}
                        height={253}
                        draggable={false}
                        className="h-5 w-auto object-contain shrink-0"
                      />
                      <span>© 2026 dms porto · All rights reserved.</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveFilmId(resolvedShowreel.id)}
                        className="inline-flex items-center min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Showreel
                      </button>
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection('works')}
                        className="inline-flex items-center min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Works
                      </button>
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection('color-grade')}
                        className="inline-flex items-center min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Color Grade
                      </button>
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection('timeline')}
                        className="inline-flex items-center min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Timeline
                      </button>
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection('capabilities')}
                        className="inline-flex items-center min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Services
                      </button>
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="inline-flex items-center gap-1 min-h-[44px] md:min-h-0 rounded-sm px-2 py-2 md:px-1.5 md:py-1 hover:bg-[#FFE600] hover:text-[#09090B] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{STUDIO_EMAIL}</span>
                      </button>
                    </div>
                  </footer>
                </div>
              </section>
            </main>

            {/* Mobile Bottom Thumb-Zone Neo-Brutalist Navigation */}
            <nav
              aria-label="Mobile bottom navigation"
              className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[calc(3.75rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#FFFDF5] border-t-[3px] border-[#09090B] shadow-[0_-4px_0_#09090B] grid grid-cols-4 items-center px-2"
            >
              {mobileTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = mobileActiveSection === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    whileTap={{scale: 0.92}}
                    transition={CUBIC_TACTILE}
                    onClick={() => scrollToSection(tab.id)}
                    className={`relative flex flex-col items-center justify-center h-11 min-h-[44px] gap-0.5 rounded-xl transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#7C3AED] ${
                      isActive
                        ? 'bg-[#FFE600] text-[#09090B] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]'
                        : 'text-[#3F3F46]'
                    }`}
                  >
                    <Icon className="w-[17px] h-[17px]" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-mono font-bold tracking-tight">
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        )}

        <MobileBookingSheet
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          formName={formName}
          formEmail={formEmail}
          formScope={formScope}
          formNotes={formNotes}
          formErrors={formErrors}
          isSubmitting={isSubmittingBrief}
          onNameChange={(val) => {
            setFormName(val);
            if (formErrors.name) {
              setFormErrors((prev) => ({...prev, name: undefined}));
            }
          }}
          onEmailChange={(val) => {
            setFormEmail(val);
            if (formErrors.email) {
              setFormErrors((prev) => ({...prev, email: undefined}));
            }
          }}
          onScopeChange={setFormScope}
          onNotesChange={(val) => {
            setFormNotes(val);
            if (formErrors.notes) {
              setFormErrors((prev) => ({...prev, notes: undefined}));
            }
          }}
          onSubmit={handleSubmitInquiry}
        />

        <Suspense fallback={null}>
          {activeFilm !== null && (
            <FilmLightboxModal
              project={activeFilm}
              open={activeFilm !== null}
              onOpenChange={(open) => {
                if (!open) setActiveFilmId(null);
              }}
              hasPrev={Boolean(prevFilm)}
              hasNext={Boolean(nextFilm)}
              prevTitle={prevFilm?.title}
              nextTitle={nextFilm?.title}
              onPrev={prevFilm ? () => setActiveFilmId(prevFilm.id) : undefined}
              onNext={nextFilm ? () => setActiveFilmId(nextFilm.id) : undefined}
            />
          )}

          {accessRole === 'developer' && <DevMediaDrawer />}
        </Suspense>

        <Toaster theme="light" position="bottom-right" />
      </div>
    </MotionConfig>
  );
}
