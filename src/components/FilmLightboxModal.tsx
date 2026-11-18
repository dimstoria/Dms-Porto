import {useEffect, useRef, useState} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Play,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import {VerticalScrollFade} from './VerticalScrollFade';
import {useDevMedia, DEV_MEDIA_SLOTS} from '../context/DevMediaContext';
import {type FilmProject} from '../data/portfolio';
import {FilmImage} from './FilmImage';

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
  const {devMode, openSlotEditor} = useDevMedia();
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPlaybackActive(false);
  }, [project?.id, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (!project) return null;

  const isYoutube = Boolean(project.youtubeId);
  const directVideoSrc =
    project.videoUrl ?? (project.imageKind === 'video' ? project.image : undefined);
  const isPlayableCut = isYoutube || Boolean(directVideoSrc);
  const youtubeEmbedSrc =
    isYoutube && project.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${project.youtubeId}?autoplay=1&rel=0&modestbranding=1${
          project.youtubeStartSeconds ? `&start=${project.youtubeStartSeconds}` : ''
        }`
      : '';

  const matchingSlot = DEV_MEDIA_SLOTS.find(
    (s) => s.filmProject?.id === project.id,
  );

  const handleCopyWorkLink = async () => {
    try {
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.delete('tab');
      shareUrl.searchParams.set('work', project.id);
      await navigator.clipboard.writeText(shareUrl.toString());
      setLinkCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl p-0 overflow-hidden rounded-3xl bg-[#FFFDF5] border-[3px] border-[#09090B] shadow-[8px_8px_0_#09090B] text-[#09090B]"
      >
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close screening lightbox"
              className="brutal-button absolute top-3.5 right-3.5 z-30 inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            />
          }
        >
          <X className="w-4 h-4" strokeWidth={2.25} />
        </DialogClose>

        <VerticalScrollFade className="max-h-[90dvh]">
          <div className="p-4 sm:p-7 space-y-6">
            {/* Neutral #09090B Screening Viewport inside Brutalist Frame */}
            <div className="brutal-film-frame relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#09090B]">
              {isPlaybackActive && isYoutube && youtubeEmbedSrc ? (
                <iframe
                  src={youtubeEmbedSrc}
                  title={`${project.title} video player`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : isPlaybackActive && directVideoSrc ? (
                <video
                  src={directVideoSrc}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  <FilmImage
                    src={project.image}
                    kind={project.imageKind}
                    alt={`${project.title} still frame`}
                    title={project.title}
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090B]/75 via-transparent to-transparent" />

                  {isPlayableCut && (
                    <button
                      type="button"
                      onClick={() => setIsPlaybackActive(true)}
                      aria-label={`Play ${project.title}`}
                      className="brutal-cta absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2.5 h-12 rounded-2xl px-6 text-xs sm:text-sm font-mono font-bold cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" strokeWidth={2} />
                      <span>Play Full Cut</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Metadata Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b-[2.5px] border-[#09090B] pb-5">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#FFE600] border-2 border-[#09090B] text-xs font-mono font-bold text-[#09090B] tabular-nums">
                  {[project.category, project.client, project.year, project.duration]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <DialogTitle className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#09090B]">
                  {project.title}
                </DialogTitle>
                <DialogDescription className="text-sm font-sans text-[#3F3F46] leading-relaxed">
                  {project.summary}
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {devMode && matchingSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      window.setTimeout(() => {
                        openSlotEditor(matchingSlot.slotKey);
                      }, 80);
                    }}
                    className="brutal-button inline-flex items-center gap-1.5 h-10 rounded-xl bg-[#B8FF3B] px-4 text-xs font-mono font-bold cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#09090B]" strokeWidth={2} />
                    <span>Edit Slot</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyWorkLink}
                  className="brutal-button inline-flex items-center gap-1.5 h-10 rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer"
                >
                  {linkCopied ? (
                    <Check className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2.25} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                  <span>{linkCopied ? 'Link Copied' : 'Share Link'}</span>
                </button>
              </div>
            </div>

            {/* Technical Breakdown Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="brutal-card rounded-2xl bg-white p-4 space-y-1">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
                  Camera &amp; Optics
                </span>
                <span className="block font-mono font-bold text-[#09090B]">{project.cameraSpec}</span>
              </div>
              <div className="brutal-card rounded-2xl bg-[#FEF9C3] p-4 space-y-1">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
                  Role &amp; Credit
                </span>
                <span className="block font-sans font-bold text-[#09090B]">{project.role}</span>
              </div>
              <div className="brutal-card rounded-2xl bg-[#F3E8FF] p-4 space-y-1">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#52525B]">
                  Delivery Format
                </span>
                <span className="block font-mono font-bold text-[#7C3AED] tabular-nums">
                  {project.aspect} · {project.fps}
                </span>
              </div>
            </div>

            {/* Prev / Next Navigation Footer */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between gap-3 pt-4 border-t-[2.5px] border-[#09090B]">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrev}
                  className="brutal-button inline-flex items-center gap-2 min-h-[44px] rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-[#7C3AED]" strokeWidth={2.25} />
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">
                    {prevTitle ?? 'Previous'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNext}
                  className="brutal-button inline-flex items-center gap-2 min-h-[44px] rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">
                    {nextTitle ?? 'Next'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#7C3AED]" strokeWidth={2.25} />
                </button>
              </div>
            )}
          </div>
        </VerticalScrollFade>
      </DialogContent>
    </Dialog>
  );
}
