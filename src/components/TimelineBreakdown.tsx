import {useMemo, useState} from 'react';
import {Pause, Play, Scissors, Sliders} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {TIMELINE_STUDIES} from '../data/portfolio';
import {useDevMedia} from '../context/DevMediaContext';
import {FilmImage} from './FilmImage';
import {DevMediaSlotBadge} from './DevMediaSlotBadge';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {CUBIC_EASE, CUBIC_INDICATOR, CUBIC_TACTILE, MOTION_DURATIONS} from '../lib/motion';

const TRACK_ROW_STYLES: Record<
  'V2' | 'V1' | 'A1' | 'A2',
  {
    activeClass: string;
    idleClass: string;
    badgeBg: string;
  }
> = {
  V2: {
    activeClass:
      'bg-[#7C3AED] text-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B]',
    idleClass:
      'bg-[#F3E8FF] text-[#09090B] border-2 border-[#09090B] hover:bg-[#E9D5FF]',
    badgeBg: 'bg-[#7C3AED] text-white',
  },
  V1: {
    activeClass:
      'bg-[#FFE600] text-[#09090B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B]',
    idleClass:
      'bg-[#FEF9C3] text-[#09090B] border-2 border-[#09090B] hover:bg-[#FEF08A]',
    badgeBg: 'bg-[#FFE600] text-[#09090B]',
  },
  A1: {
    activeClass:
      'bg-[#B8FF3B] text-[#09090B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B]',
    idleClass:
      'bg-[#ECFCCB] text-[#09090B] border-2 border-[#09090B] hover:bg-[#D9F99D]',
    badgeBg: 'bg-[#B8FF3B] text-[#09090B]',
  },
  A2: {
    activeClass:
      'bg-[#FF4D8D] text-[#09090B] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B]',
    idleClass:
      'bg-[#FCE7F3] text-[#09090B] border-2 border-[#09090B] hover:bg-[#FBCFE8]',
    badgeBg: 'bg-[#FF4D8D] text-[#09090B]',
  },
};

export function TimelineBreakdown() {
  const {resolveSlot, devMode} = useDevMedia();
  const [selectedStudyId, setSelectedStudyId] = useState(TIMELINE_STUDIES[0].id);
  const activeStudy =
    TIMELINE_STUDIES.find((s) => s.id === selectedStudyId) ?? TIMELINE_STUDIES[0];

  const [selectedMarkerId, setSelectedMarkerId] = useState(activeStudy.markers[0].id);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const activeMarker =
    activeStudy.markers.find((m) => m.id === selectedMarkerId) ?? activeStudy.markers[0];

  const resolvedMarkerMedia = resolveSlot(
    `timeline:${activeStudy.id}:${activeMarker.id}`,
    activeMarker.previewImage,
  );

  const handleSelectStudy = (studyId: string) => {
    const study = TIMELINE_STUDIES.find((s) => s.id === studyId);
    if (!study) return;
    setSelectedStudyId(study.id);
    setSelectedMarkerId(study.markers[0].id);
    setSelectedClipId(null);
  };

  const trackRows = useMemo(
    () =>
      (['V2', 'V1', 'A1', 'A2'] as const).map((track) => ({
        track,
        clips: activeStudy.clips.filter((c) => c.track === track),
      })),
    [activeStudy.clips],
  );

  const currentIndex = activeStudy.markers.findIndex((m) => m.id === activeMarker.id);

  const handleStepCut = () => {
    const nextIdx = (currentIndex + 1) % activeStudy.markers.length;
    setSelectedMarkerId(activeStudy.markers[nextIdx].id);
    setSelectedClipId(null);
  };

  return (
    <section
      id="timeline"
      aria-labelledby="timeline-heading"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 space-y-6 md:space-y-8"
    >
      {/* Neo-Brutalist Section Header Bar */}
      <div data-gsap="tl-head" className="flex items-center gap-3 pt-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#7C3AED] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold uppercase tracking-wider text-white shrink-0">
          03. Cut Architecture · NLE Sequence
        </span>
        <div className="h-[2.5px] flex-1 bg-[#09090B]" />
      </div>

      {/* Header Row */}
      <div
        data-gsap="tl-head"
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6"
      >
        <div className="space-y-2 max-w-xl">
          <h2
            id="timeline-heading"
            className="font-display text-[clamp(1.75rem,3.2vw,2.6rem)] font-extrabold tracking-tight leading-[1.06] text-[#09090B]"
          >
            Interactive Editing Timeline
          </h2>
          <p className="text-[clamp(0.875rem,1.05vw,1rem)] font-sans text-[#3F3F46] leading-[1.6] max-w-[52ch]">
            Step through cut markers, J/L-cut audio stems, and visual tracks to inspect editorial pacing.
          </p>
        </div>

        {/* Study Switcher & Step Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <HorizontalScrollFade className="max-w-full">
            <div
              role="tablist"
              aria-label="Editing timeline studies"
              className="brutal-card inline-flex items-center gap-1.5 p-1.5 rounded-2xl w-max bg-white"
            >
              {TIMELINE_STUDIES.map((study) => {
                const active = study.id === activeStudy.id;
                return (
                  <motion.button
                    key={study.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    whileTap={{scale: 0.96}}
                    transition={CUBIC_TACTILE}
                    onClick={() => handleSelectStudy(study.id)}
                    className={`relative px-4 min-h-[44px] md:min-h-[36px] text-xs font-mono font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                      active ? 'text-[#09090B]' : 'text-[#3F3F46] hover:bg-[#F3E8FF]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-timeline-study"
                        transition={CUBIC_INDICATOR}
                        className="absolute inset-0 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                      />
                    )}
                    <span className="relative z-10">{study.title.split(':')[0].trim()}</span>
                  </motion.button>
                );
              })}
            </div>
          </HorizontalScrollFade>

          <motion.button
            type="button"
            whileTap={{scale: 0.96}}
            transition={CUBIC_TACTILE}
            onClick={handleStepCut}
            className="brutal-cta-pink inline-flex items-center gap-1.5 min-h-[44px] md:min-h-[40px] rounded-xl px-4 text-xs font-mono font-bold cursor-pointer"
          >
            {currentIndex === activeStudy.markers.length - 1 ? (
              <Pause className="w-3.5 h-3.5 fill-current" strokeWidth={2} />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" strokeWidth={2} />
            )}
            <span>Next Marker</span>
          </motion.button>
        </div>
      </div>

      {/* Main Split: Neon Pink Outer Preview Bezel + Cut Inspector Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div
          data-gsap="tl-inspector"
          className={`lg:col-span-7 rounded-3xl bg-[#FF4D8D] border-[3px] border-[#09090B] shadow-[8px_8px_0_#09090B] p-2.5 flex flex-col justify-between ${
            devMode ? 'ring-4 ring-[#7C3AED]' : ''
          }`}
        >
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B] border-[2.5px] border-[#09090B]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeStudy.id}-${activeMarker.id}`}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: MOTION_DURATIONS.micro, ease: CUBIC_EASE}}
                className="absolute inset-0"
              >
                <FilmImage
                  src={resolvedMarkerMedia.src}
                  kind={resolvedMarkerMedia.kind}
                  alt={activeMarker.title}
                  title={activeMarker.title}
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B] tabular-nums">
              <span>{activeMarker.timecode}</span>
              <span>· {activeStudy.fps}</span>
            </div>

            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl bg-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] px-3 py-1 text-[11px] font-mono font-bold text-[#09090B]">
              <span>
                {activeMarker.technique} · {activeMarker.title}
              </span>
            </div>

            <DevMediaSlotBadge
              slotKey={`timeline:${activeStudy.id}:${activeMarker.id}`}
              label="Edit Frame"
              position="top-right"
              compact
            />
          </div>
        </div>

        {/* Active Cut Inspector Card */}
        <div
          data-gsap="tl-inspector"
          className="lg:col-span-5 brutal-card-elevated rounded-3xl bg-white p-6 flex flex-col justify-between gap-5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold text-[#09090B]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B8FF3B] border-2 border-[#09090B]">
                <Scissors className="w-3.5 h-3.5" strokeWidth={2.25} />
                <span>Cut {activeMarker.timecode}</span>
              </span>
              <span className="tabular-nums text-[#52525B]">{activeStudy.duration}</span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#09090B]">
              {activeMarker.title}
            </h3>

            <p className="text-sm font-sans text-[#3F3F46] leading-relaxed">
              {activeMarker.rationale}
            </p>
          </div>

          <div className="border-t-[2.5px] border-[#09090B] pt-4 space-y-2.5">
            <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
              Select Marker Cue
            </span>
            <div className="flex flex-wrap gap-2">
              {activeStudy.markers.map((marker) => {
                const active = marker.id === activeMarker.id;
                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={() => {
                      setSelectedMarkerId(marker.id);
                      setSelectedClipId(null);
                    }}
                    className={`min-h-[38px] rounded-xl px-3 text-[11px] font-mono font-bold cursor-pointer ${
                      active ? 'brutal-cta' : 'brutal-button'
                    }`}
                  >
                    {marker.timecode} · {marker.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Track NLE Timeline Deck */}
      <div data-gsap="tl-nle" className="brutal-card-elevated rounded-3xl overflow-hidden bg-white">
        <div className="bg-[#FFE600] border-b-[2.5px] border-[#09090B] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono font-bold text-[#09090B]">
          <span className="inline-flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#09090B]" strokeWidth={2.25} />
            <span>{activeStudy.subtitle}</span>
          </span>
          <div className="hidden sm:flex items-center gap-4 tabular-nums">
            {activeStudy.rulerMarks.map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>
        </div>

        <HorizontalScrollFade className="w-full">
          <div className="relative min-w-[600px] bg-[#FFFDF5] p-3 sm:p-4">
            <div className="flex flex-col gap-2.5">
              {trackRows.map(({track, clips}) => {
                const style = TRACK_ROW_STYLES[track];
                return (
                  <div
                    key={track}
                    data-gsap="tl-track"
                    className="grid grid-cols-12 items-center gap-2 min-h-[44px]"
                  >
                    <div
                      className={`col-span-1 text-[11px] font-mono font-bold text-center py-1.5 rounded-xl border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] ${style.badgeBg}`}
                    >
                      {track}
                    </div>

                    <div className="col-span-11 relative h-10 rounded-xl bg-white border-2 border-[#09090B]/25">
                      {clips.map((clip) => {
                        const isCurrent =
                          selectedClipId === clip.id ||
                          (!selectedClipId &&
                            activeMarker.percent >= clip.startPercent &&
                            activeMarker.percent <= clip.startPercent + clip.widthPercent);
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onClick={() => {
                              setSelectedClipId(clip.id);
                              const nearestMarker = activeStudy.markers.reduce((best, m) =>
                                Math.abs(m.percent - clip.startPercent) <
                                Math.abs(best.percent - clip.startPercent)
                                  ? m
                                  : best,
                              );
                              setSelectedMarkerId(nearestMarker.id);
                            }}
                            style={{
                              left: `${clip.startPercent}%`,
                              width: `${clip.widthPercent}%`,
                            }}
                            className={`absolute top-1 bottom-1 rounded-lg px-2.5 text-left text-[11px] font-mono font-bold truncate transition-all cursor-pointer ${
                              isCurrent ? style.activeClass : style.idleClass
                            }`}
                          >
                            {clip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Electric Purple Playhead Indicator */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 sm:inset-x-4 inset-y-0 z-20 grid grid-cols-12 gap-2"
            >
              <div className="col-start-2 col-span-11 relative h-full">
                <div
                  data-timeline-playhead
                  className="absolute top-0 bottom-0 w-[3px] -translate-x-1/2 bg-[#7C3AED] transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{left: `${activeMarker.percent}%`}}
                >
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#FFE600] border-2 border-[#09090B]" />
                </div>
              </div>
            </div>
          </div>
        </HorizontalScrollFade>
      </div>
    </section>
  );
}
