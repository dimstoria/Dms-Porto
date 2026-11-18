import {useEffect, useRef, useState} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {toast} from 'sonner';
import {Button} from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type {FilmProject} from '../data/portfolio';
import {FilmImage} from './FilmImage';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {VerticalScrollFade} from './VerticalScrollFade';
import {CUBIC_MICRO, CUBIC_TACTILE} from '../lib/motion';

interface FilmLightboxModalProps {
  project: FilmProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  prevTitle?: string;
  nextTitle?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 24);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

function formatMinuteSecond(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function FilmLightboxModal({
  project,
  open,
  onOpenChange,
  hasPrev = false,
  hasNext = false,
  prevTitle,
  nextTitle,
  onPrev,
  onNext,
}: FilmLightboxModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ytReloadKey, setYtReloadKey] = useState(0);
  const [ytCueSeconds, setYtCueSeconds] = useState<number>(project?.youtubeStartSeconds ?? 0);
  const [timecodeCopied, setTimecodeCopied] = useState(false);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setYtReloadKey(0);
    setYtCueSeconds(project?.youtubeStartSeconds ?? 0);
    setTimecodeCopied(false);
    lastFrameRef.current = null;
  }, [project?.id, project?.youtubeStartSeconds, open]);

  useEffect(() => {
    if (!isPlaying || !project || !open || project.youtubeId || project.videoUrl) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastFrameRef.current !== null) {
        const dt = (now - lastFrameRef.current) / 1000;
        setProgress((prev) => {
          const next = prev + dt / Math.max(project.durationSeconds, 1);
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }
      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, project, open]);

  useEffect(() => {
    if (!open || !project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'VIDEO') {
          return;
        }
        if (project.videoUrl && videoRef.current) {
          e.preventDefault();
          if (videoRef.current.paused) {
            void videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
          return;
        }
        if (!project.youtubeId) {
          e.preventDefault();
          setProgress((prev) => (prev >= 1 ? 0 : prev));
          setIsPlaying((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, project, hasPrev, hasNext, onPrev, onNext]);

  if (!project) return null;

  const hasDirectVideo = Boolean(project.videoUrl);
  const hasYoutube = !hasDirectVideo && Boolean(project.youtubeId);
  const startSeconds = project.youtubeStartSeconds ?? 0;
  const activeYtStart = ytCueSeconds;
  const youtubeEmbedUrl = project.youtubeId
    ? `https://www.youtube.com/embed/${project.youtubeId}?start=${activeYtStart}&autoplay=1&rel=0&playsinline=1`
    : '';
  const youtubeWatchUrl = project.youtubeId
    ? `https://youtu.be/${project.youtubeId}${activeYtStart > 0 ? `?t=${activeYtStart}` : ''}`
    : '';

  const currentSeconds = progress * project.durationSeconds;
  const activeChapter =
    [...project.chapters].reverse().find((ch) => progress >= ch.ratio) ?? project.chapters[0];

  const handleTogglePlay = () => {
    if (progress >= 1) {
      setProgress(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    if (hasDirectVideo) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        void videoRef.current.play();
      } else {
        setYtReloadKey((k) => k + 1);
      }
      return;
    }
    if (hasYoutube) {
      setYtCueSeconds(startSeconds);
      setYtReloadKey((k) => k + 1);
      return;
    }
    setProgress(0);
    setIsPlaying(true);
  };

  const handleCopyTimecode = async () => {
    const tc = formatTimecode(currentSeconds);
    try {
      await navigator.clipboard.writeText(tc);
      setTimecodeCopied(true);
      toast.success(`Timecode copied: ${tc}`);
      window.setTimeout(() => setTimecodeCopied(false), 1600);
    } catch {
      toast.info(`Current timecode: ${tc}`);
    }
  };

  const handleShare = async () => {
    const deepLink = `${window.location.origin}${window.location.pathname}?work=${encodeURIComponent(project.id)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${project.title} | dms porto`,
          text: project.summary,
          url: deepLink,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(deepLink);
      toast.success(`Link copied for "${project.title}"`, {
        description: 'Ready to share. Opening this link jumps straight to this film.',
      });
    } catch {
      toast.info(`Share link ready: ${deepLink}`);
    }
  };

  const zoomScale = 1 + progress * 0.06;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl overflow-hidden p-0 rounded-3xl text-[#09090B] bg-[#FFFDF5]"
      >
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close modal"
              className="brutal-button absolute top-3.5 right-3.5 z-20 inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-[#09090B] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            />
          }
        >
          <X className="w-4 h-4" />
        </DialogClose>

        <VerticalScrollFade className="max-h-[90dvh]">
          {/* Neutral Dark Calibrated Film Stage framed by heavy pitch-black border */}
          <div className="relative aspect-video w-full bg-[#09090B] overflow-hidden select-none shrink-0 border-b-[3px] border-[#09090B]">
          {hasDirectVideo ? (
            <video
              ref={videoRef}
              key={`${project.id}-${project.videoUrl}-${ytReloadKey}`}
              src={project.videoUrl}
              poster={project.imageKind !== 'video' ? project.image : undefined}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          ) : hasYoutube ? (
            <iframe
              key={`${project.id}-${activeYtStart}-${ytReloadKey}`}
              src={youtubeEmbedUrl}
              title={project.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
            />
          ) : (
            <>
              <FilmImage
                src={project.image}
                kind={project.imageKind}
                alt={project.title}
                title={project.title}
                priority
                style={{
                  transform: `scale(${zoomScale.toFixed(4)})`,
                }}
                className="transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/85 via-black/15 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 right-16 flex items-center justify-between text-[11px] sm:text-xs font-mono">
                <span className="bg-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-[#09090B] font-bold px-2.5 py-1 rounded-lg">
                  {project.aspect} · {project.fps} · Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopyTimecode}
                  title="Copy current timecode"
                  className="brutal-button inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg tabular-nums font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600]"
                >
                  {timecodeCopied ? (
                    <Check className="w-3 h-3 text-[#09090B]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#7C3AED]" />
                  )}
                  <span>
                    {formatTimecode(currentSeconds)} / {project.duration}:00
                  </span>
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 space-y-2.5 sm:space-y-3 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold bg-[#09090B]/80 border border-white/25 px-2.5 py-0.5 rounded-md text-white">
                    Scene: {activeChapter?.label ?? 'Main Sequence'}
                  </span>
                  <span className="font-mono font-bold bg-[#FFE600] text-[#09090B] border-2 border-[#09090B] px-2 py-0.5 rounded-md tabular-nums">
                    {Math.round(progress * 100)}% played
                  </span>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3">
                  <motion.button
                    type="button"
                    whileTap={{scale: 0.92}}
                    transition={CUBIC_TACTILE}
                    onClick={handleTogglePlay}
                    aria-label={isPlaying ? 'Pause sequence preview' : 'Play sequence preview'}
                    className="brutal-cta inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isPlaying ? (
                        <motion.span
                          key="pause-icon"
                          aria-hidden="true"
                          initial={{opacity: 0, scale: 0.75}}
                          animate={{opacity: 1, scale: 1}}
                          exit={{opacity: 0, scale: 0.75}}
                          transition={CUBIC_MICRO}
                          className="inline-flex"
                        >
                          <Pause className="w-4 h-4" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="play-icon"
                          aria-hidden="true"
                          initial={{opacity: 0, scale: 0.75}}
                          animate={{opacity: 1, scale: 1}}
                          exit={{opacity: 0, scale: 0.75}}
                          transition={CUBIC_MICRO}
                          className="inline-flex"
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={Math.round(progress * 1000)}
                    aria-label="Scrub reel timeline"
                    onChange={(e) => {
                      setProgress(Number(e.target.value) / 1000);
                    }}
                    className="flex-1 h-2.5 accent-[#FFE600] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFE600] rounded"
                  />

                  <motion.button
                    type="button"
                    whileTap={{scale: 0.92}}
                    transition={CUBIC_MICRO}
                    onClick={handleRestart}
                    aria-label="Restart sequence"
                    className="brutal-button inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600]"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                </div>

                <HorizontalScrollFade className="flex items-center gap-2 pt-0.5">
                  {project.chapters.map((ch) => {
                    const isActive = activeChapter?.label === ch.label;
                    return (
                      <motion.button
                        key={ch.label}
                        type="button"
                        whileTap={{scale: 0.95}}
                        transition={CUBIC_TACTILE}
                        onClick={() => {
                          setProgress(ch.ratio);
                          setIsPlaying(true);
                        }}
                        className={`px-3 sm:px-2.5 min-h-[44px] sm:min-h-[32px] py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FFE600] ${
                          isActive
                            ? 'bg-[#FFE600] text-[#09090B] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]'
                            : 'bg-white text-[#09090B] border-2 border-[#09090B] hover:bg-[#FEF9C3]'
                        }`}
                      >
                        {ch.timecode} {ch.label}
                      </motion.button>
                    );
                  })}
                </HorizontalScrollFade>
              </div>
            </>
          )}
        </div>

        <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 bg-[#FFFDF5]">
          {hasYoutube && (
            <div className="space-y-3 pb-4 border-b-2 border-[#09090B] text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono font-bold text-[#09090B] tabular-nums">
                  YouTube Embed · Cued at {formatMinuteSecond(activeYtStart)} ({activeYtStart}s)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestart}
                    className="brutal-button min-h-[44px] sm:min-h-0 sm:h-9 gap-1.5 rounded-xl font-mono font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay from {formatMinuteSecond(startSeconds)}</span>
                  </Button>
                  <a
                    href={youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutal-cta inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-xl font-mono font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                  >
                    <span>Open YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {project.chapters.length > 0 && (
                <HorizontalScrollFade className="flex items-center gap-1.5 pt-0.5">
                  {project.chapters.map((ch) => {
                    const targetSeconds = startSeconds + Math.round(ch.ratio * project.durationSeconds);
                    const isActive = activeYtStart === targetSeconds;
                    return (
                      <motion.button
                        key={ch.label}
                        type="button"
                        whileTap={{scale: 0.95}}
                        transition={CUBIC_TACTILE}
                        onClick={() => {
                          setYtCueSeconds(targetSeconds);
                          setYtReloadKey((k) => k + 1);
                        }}
                        className={`px-3 sm:px-2.5 min-h-[44px] sm:min-h-[32px] py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7C3AED] ${
                          isActive ? 'brutal-cta' : 'brutal-button'
                        }`}
                      >
                        {ch.timecode} {ch.label}
                      </motion.button>
                    );
                  })}
                </HorizontalScrollFade>
              )}
            </div>
          )}

          {hasDirectVideo && project.chapters.length > 0 && (
            <div className="space-y-2 pb-4 border-b-2 border-[#09090B] text-xs">
              <span className="font-mono font-bold text-[#09090B]">Jump to Chapter</span>
              <HorizontalScrollFade className="flex items-center gap-1.5">
                {project.chapters.map((ch) => (
                  <motion.button
                    key={ch.label}
                    type="button"
                    whileTap={{scale: 0.95}}
                    transition={CUBIC_TACTILE}
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      const dur = Number.isFinite(video.duration) && video.duration > 0
                        ? video.duration
                        : project.durationSeconds;
                      video.currentTime = ch.ratio * dur;
                      void video.play();
                    }}
                    className="brutal-button px-3 sm:px-2.5 min-h-[44px] sm:min-h-[32px] py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7C3AED]"
                  >
                    {ch.timecode} {ch.label}
                  </motion.button>
                ))}
              </HorizontalScrollFade>
            </div>
          )}

          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="font-mono text-xs font-bold text-zinc-700 tabular-nums">
                {[project.category, project.client, project.year].filter(Boolean).join(' · ')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="brutal-button rounded-xl px-3.5 h-9 font-mono text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Share Reel</span>
              </Button>
            </div>
            <DialogTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#09090B]">
              {project.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-700 max-w-2xl">
              {project.summary}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 border-t-2 border-[#09090B] pt-5 text-sm">
            <div className="sm:col-span-3 brutal-subtle rounded-xl p-3 space-y-1">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Role</p>
              <p className="font-semibold text-[#09090B]">{project.role}</p>
            </div>
            <div className="sm:col-span-5 brutal-subtle rounded-xl p-3 space-y-1">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Camera &amp; Optics</p>
              <p className="font-semibold text-[#09090B]">{project.cameraSpec}</p>
            </div>
            <div className="sm:col-span-4 brutal-subtle rounded-xl p-3 space-y-1">
              <p className="text-[11px] font-mono font-bold text-zinc-600">Color &amp; Finish</p>
              <p className="font-semibold text-[#09090B]">{project.colorSuite}</p>
            </div>
          </div>

          <div className="border-t-2 border-[#09090B] pt-4">
            <p className="text-xs font-mono font-bold text-zinc-600 mb-1">Editorial &amp; Cut Approach</p>
            <p className="text-sm text-[#09090B] leading-relaxed">{project.editNotes}</p>
          </div>

          {(hasPrev || hasNext) && (
            <div className="border-t-2 border-[#09090B] pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={onPrev}
                className="brutal-button inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed max-w-[46%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">{prevTitle ? `Prev: ${prevTitle}` : 'Prev Film'}</span>
              </button>

              <button
                type="button"
                disabled={!hasNext}
                onClick={onNext}
                className="brutal-button inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed max-w-[46%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <span className="truncate">{nextTitle ? `Next: ${nextTitle}` : 'Next Film'}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
          </div>
        </VerticalScrollFade>
      </DialogContent>
    </Dialog>
  );
}
