import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Scissors, Volume2} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {TIMELINE_STUDIES, type TimelineClip} from '../data/portfolio';
import {FilmImage} from './FilmImage';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {DevMediaSlotBadge} from './DevMediaSlotBadge';
import {useDevMedia} from '../context/DevMediaContext';
import {CUBIC_EASE, LIQUID_SPRING, LIQUID_SPRING_SNAPPY} from '../lib/motion';

const TRACK_ORDER: Array<TimelineClip['track']> = ['V2', 'V1', 'A1', 'A2'];

const TRACK_LABELS: Record<TimelineClip['track'], string> = {
  V2: 'B-Roll',
  V1: 'Picture',
  A1: 'Foley',
  A2: 'Score',
};

function TrackKindIcon({isAudio}: {isAudio: boolean}) {
  if (!isAudio) return null;
  return <Volume2 className="w-3 h-3" aria-hidden="true" />;
}

function clipClasses(track: TimelineClip['track']): string {
  switch (track) {
    case 'V1':
      return 'bg-[#FFE600] text-[#09090B] border-[#09090B] shadow-[2px_2px_0_#09090B]';
    case 'V2':
      return 'bg-[#38BDF8] text-[#09090B] border-[#09090B] shadow-[2px_2px_0_#09090B]';
    case 'A1':
      return 'bg-[#B8FF3B] text-[#09090B] border-[#09090B] shadow-[2px_2px_0_#09090B]';
    case 'A2':
      return 'bg-[#FF4D8D] text-[#09090B] border-[#09090B] shadow-[2px_2px_0_#09090B]';
  }
}

export function TimelineBreakdown() {
  const {resolveSlot} = useDevMedia();
  const [studyIndex, setStudyIndex] = useState(0);
  const [selectedMarkerId, setSelectedMarkerId] = useState(TIMELINE_STUDIES[0].markers[0].id);
  const markerButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const didMountMarkerRef = useRef(false);

  const study = TIMELINE_STUDIES[studyIndex];
  const activeMarker =
    study.markers.find((m) => m.id === selectedMarkerId) ?? study.markers[0];
  const markerSlotKey = `timeline:${study.id}:${activeMarker.id}`;
  const resolvedPreview = resolveSlot(markerSlotKey, activeMarker.previewImage);

  useEffect(() => {
    if (!didMountMarkerRef.current) {
      didMountMarkerRef.current = true;
      return;
    }
    const activeBtn = markerButtonRefs.current[activeMarker.id];
    const scrollContainer = activeBtn?.parentElement;
    if (!activeBtn || !scrollContainer) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const btnLeft = btnRect.left - containerRect.left + scrollContainer.scrollLeft;
    const btnRight = btnLeft + btnRect.width;
    const viewLeft = scrollContainer.scrollLeft;
    const viewRight = viewLeft + scrollContainer.clientWidth;

    if (btnLeft < viewLeft + 16) {
      scrollContainer.scrollTo({left: Math.max(0, btnLeft - 16), behavior: 'smooth'});
    } else if (btnRight > viewRight - 16) {
      scrollContainer.scrollTo({
        left: btnRight - scrollContainer.clientWidth + 16,
        behavior: 'smooth',
      });
    }
  }, [activeMarker.id]);

  const handleSelectStudy = (idx: number) => {
    setStudyIndex(idx);
    setSelectedMarkerId(TIMELINE_STUDIES[idx].markers[0].id);
  };

  const activeMarkerIdx = Math.max(
    0,
    study.markers.findIndex((m) => m.id === activeMarker.id),
  );

  const stepMarker = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(study.markers.length - 1, activeMarkerIdx + delta));
    const target = study.markers[nextIdx];
    if (target) setSelectedMarkerId(target.id);
  };

  const handleSelectClip = (clip: TimelineClip) => {
    const clipStart = clip.startPercent;
    const clipEnd = clip.startPercent + clip.widthPercent;
    const clipMid = clipStart + clip.widthPercent / 2;

    const insideClip = study.markers.filter(
      (m) => m.percent >= clipStart - 2 && m.percent <= clipEnd + 2,
    );
    const pool = insideClip.length > 0 ? insideClip : study.markers;

    let best = pool[0];
    let bestDist = Infinity;
    for (const m of pool) {
      const dist = Math.abs(m.percent - clipMid);
      if (dist < bestDist) {
        best = m;
        bestDist = dist;
      }
    }
    if (best) setSelectedMarkerId(best.id);
  };

  return (
    <section
      id="timeline"
      aria-labelledby="timeline-heading"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-22 space-y-6 md:space-y-8"
    >
      <div data-gsap="tl-head" className="flex items-center gap-4 pb-1">
        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#7C3AED] text-white border-2 border-[#09090B] shadow-[3px_3px_0_#09090B] text-xs font-mono font-bold tracking-wide shrink-0">
          03. Cut Architecture
        </span>
        <div className="h-[2.5px] flex-1 bg-[#09090B]" />
      </div>

      <div data-gsap="tl-head" className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2 max-w-xl">
          <h2
            id="timeline-heading"
            className="font-display text-[clamp(1.75rem,3.2vw,2.65rem)] font-extrabold tracking-tight leading-[1.08] text-[#09090B]"
          >
            Inside the Edit Timeline
          </h2>
          <p className="text-[clamp(0.875rem,1.05vw,1rem)] text-zinc-700 font-medium leading-[1.6] max-w-[52ch]">
            Select any cut marker across video and audio tracks to inspect why each transition lands where it does.
          </p>
        </div>

        <HorizontalScrollFade className="max-w-full self-start md:self-auto">
          <div
            role="tablist"
            aria-label="Select edit timeline study"
            className="brutal-card inline-flex items-center gap-1 p-1.5 rounded-2xl w-max"
          >
            {TIMELINE_STUDIES.map((item, idx) => {
              const isActive = idx === studyIndex;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  whileTap={{scale: 0.95}}
                  transition={LIQUID_SPRING_SNAPPY}
                  onClick={() => handleSelectStudy(idx)}
                  className={`relative px-3.5 min-h-[44px] md:min-h-[36px] text-xs font-mono font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                    isActive ? 'text-[#09090B]' : 'text-zinc-600 hover:text-[#09090B]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-timeline-study"
                      transition={LIQUID_SPRING}
                      className="absolute inset-0 rounded-xl bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]"
                    />
                  )}
                  <span className="relative z-10">{item.title.split(':')[0].trim()}</span>
                </motion.button>
              );
            })}
          </div>
        </HorizontalScrollFade>
      </div>

      {/* Top Inspector: Neutral Dark Film Frame Preview + Cut Rationale */}
      <div data-gsap="tl-inspector" className="brutal-card-elevated grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-3xl p-4 sm:p-6">
        <div className="brutal-film-frame lg:col-span-5 relative aspect-[16/10] rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMarker.id}
              initial={{opacity: 0.35}}
              animate={{opacity: 1}}
              exit={{opacity: 0.35}}
              transition={{duration: 0.24, ease: CUBIC_EASE}}
              className="w-full h-full"
            >
              <FilmImage
                src={resolvedPreview.src}
                kind={resolvedPreview.kind}
                alt={activeMarker.title}
                title={activeMarker.title}
                priority
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="inline-block bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg tabular-nums">
              {activeMarker.timecode} · {activeMarker.technique}
            </span>
          </div>

          <DevMediaSlotBadge
            slotKey={markerSlotKey}
            label="Ganti Frame Cut"
            position="bottom-left"
          />
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between gap-5 py-1">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-zinc-700 tabular-nums">
              <span>{study.subtitle}</span>
              <span className="px-2 py-0.5 rounded-md bg-[#EDE9FE] border border-[#09090B] text-[#09090B]">
                Total {study.duration}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#09090B]">
              {activeMarker.title}
            </h3>
            <p className="text-sm sm:text-base text-zinc-800 leading-relaxed max-w-2xl">
              {activeMarker.rationale}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Jump to Cut Marker</p>
              <div className="inline-flex items-center gap-1.5">
                <motion.button
                  type="button"
                  whileTap={{scale: 0.92}}
                  transition={LIQUID_SPRING_SNAPPY}
                  disabled={activeMarkerIdx <= 0}
                  onClick={() => stepMarker(-1)}
                  aria-label="Previous cut marker"
                  className="brutal-button inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>
                <span className="text-[11px] font-mono font-bold text-[#09090B] tabular-nums px-1.5">
                  {activeMarkerIdx + 1}/{study.markers.length}
                </span>
                <motion.button
                  type="button"
                  whileTap={{scale: 0.92}}
                  transition={LIQUID_SPRING_SNAPPY}
                  disabled={activeMarkerIdx >= study.markers.length - 1}
                  onClick={() => stepMarker(1)}
                  aria-label="Next cut marker"
                  className="brutal-button inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
            <HorizontalScrollFade className="flex items-center gap-2 pb-1 select-none">
              {study.markers.map((marker) => {
                const isSelected = marker.id === activeMarker.id;
                return (
                  <motion.button
                    key={marker.id}
                    ref={(el) => {
                      markerButtonRefs.current[marker.id] = el;
                    }}
                    type="button"
                    whileTap={{scale: 0.95}}
                    transition={LIQUID_SPRING_SNAPPY}
                    onClick={() => setSelectedMarkerId(marker.id)}
                    className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] md:min-h-[40px] rounded-xl text-xs font-mono font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                      isSelected ? 'brutal-cta' : 'brutal-button'
                    }`}
                  >
                    <Scissors className="w-3 h-3" />
                    <span>{marker.timecode}</span>
                    <span className="font-sans font-semibold">{marker.title}</span>
                  </motion.button>
                );
              })}
            </HorizontalScrollFade>
          </div>
        </div>
      </div>

      {/* Interactive Multi-Track NLE Timeline */}
      <div
        data-gsap="tl-nle"
        tabIndex={0}
        aria-label="Interactive multi-track edit timeline. Use Left and Right arrow keys to step between cut markers."
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepMarker(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepMarker(1);
          }
        }}
        className="brutal-card-elevated rounded-3xl overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
      >
        <HorizontalScrollFade>
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[96px_1fr] border-b-[2.5px] border-[#09090B] bg-[#FFE600]">
              <div className="px-3 py-2.5 text-[11px] font-mono font-bold text-[#09090B] border-r-[2.5px] border-[#09090B] flex items-center">
                Tracks
              </div>
              <div className="relative px-3 py-2.5 flex items-center justify-between text-[11px] font-mono font-bold text-[#09090B] tabular-nums">
                {study.rulerMarks.map((mark) => (
                  <span key={mark}>{mark}</span>
                ))}
              </div>
            </div>

            <div className="relative divide-y-2 divide-[#09090B] bg-white">
              {TRACK_ORDER.map((trackName) => {
                const trackClips = study.clips.filter((c) => c.track === trackName);
                const isAudio = trackName.startsWith('A');
                return (
                  <div
                    key={trackName}
                    data-gsap="tl-track"
                    className="grid grid-cols-[96px_1fr] min-h-[52px]"
                  >
                    <div className="px-3 py-2 border-r-[2.5px] border-[#09090B] flex items-center justify-between text-xs bg-[#FFFDF5]">
                      <span className="font-mono font-bold text-[#09090B]">{trackName}</span>
                      <span className="text-[11px] font-medium text-zinc-700 flex items-center gap-1">
                        <TrackKindIcon isAudio={isAudio} />
                        {TRACK_LABELS[trackName]}
                      </span>
                    </div>

                    <div className="px-3 py-2 flex items-center bg-[#FFFDF5]/50">
                      <div className="relative w-full h-8">
                        {trackClips.map((clip) => {
                          const isUnderPlayhead =
                            activeMarker.percent >= clip.startPercent &&
                            activeMarker.percent <= clip.startPercent + clip.widthPercent;
                          return (
                            <motion.button
                              key={clip.id}
                              type="button"
                              whileTap={{scale: 0.985}}
                              transition={LIQUID_SPRING_SNAPPY}
                              onClick={() => handleSelectClip(clip)}
                              aria-label={`Inspect ${trackName} clip: ${clip.label}`}
                              style={{
                                left: `${clip.startPercent}%`,
                                width: `${clip.widthPercent}%`,
                              }}
                              className={`absolute inset-y-0 rounded-lg border-2 px-2.5 flex items-center text-[11px] font-mono font-bold truncate text-left transition-all duration-[180ms] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7C3AED] ${clipClasses(
                                clip.track,
                              )} ${
                                isUnderPlayhead
                                  ? 'ring-2 ring-[#7C3AED] ring-offset-1 opacity-100'
                                  : 'opacity-85 hover:opacity-100'
                              }`}
                            >
                              <span className="truncate">{clip.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pointer-events-none absolute inset-y-0 left-[96px] right-0 px-3">
                <div className="relative w-full h-full">
                  {study.markers.map((marker) => {
                    const isSelected = marker.id === activeMarker.id;
                    return (
                      <button
                        key={marker.id}
                        type="button"
                        onClick={() => setSelectedMarkerId(marker.id)}
                        aria-label={`Inspect ${marker.timecode} ${marker.title}`}
                        style={{left: `${marker.percent}%`}}
                        className="pointer-events-auto absolute top-0 bottom-0 -translate-x-1/2 w-11 flex flex-col items-center group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7C3AED]"
                      >
                        <span
                          className={`mt-1 h-3 w-3 rotate-45 rounded-[2px] border-2 border-[#09090B] transition-transform ${
                            isSelected
                              ? 'bg-[#7C3AED] scale-125'
                              : 'bg-white group-hover:bg-[#FFE600] group-hover:scale-110'
                          }`}
                        />
                        <span
                          className={`w-[2px] flex-1 transition-colors ${
                            isSelected ? 'bg-[#7C3AED]' : 'bg-[#09090B]/20 group-hover:bg-[#7C3AED]/60'
                          }`}
                        />
                      </button>
                    );
                  })}

                  <motion.div
                    aria-hidden="true"
                    animate={{x: `${activeMarker.percent}%`}}
                    transition={LIQUID_SPRING}
                    className="absolute inset-0 pointer-events-none"
                  >
                    <div className="h-full w-[3px] -translate-x-1/2 bg-[#7C3AED]" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </HorizontalScrollFade>
      </div>
    </section>
  );
}
