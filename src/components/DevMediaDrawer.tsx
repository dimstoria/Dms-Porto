import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Download,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Power,
  RefreshCw,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {toast} from 'sonner';
import {CUBIC_TACTILE} from '../lib/motion';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {VerticalScrollFade} from './VerticalScrollFade';
import {HorizontalScrollFade} from './HorizontalScrollFade';
import {
  DEV_MEDIA_SLOTS,
  useDevMedia,
  type DevMediaSection,
  type DevMediaSlotMeta,
} from '../context/DevMediaContext';
import {DEFAULT_AVATAR_FRAME} from '../utils/devMediaStore';

interface ServerInquiry {
  id: string;
  name: string;
  email: string;
  scope: string;
  notes: string;
  status: 'new' | 'reviewed';
  createdAt: string;
}

const SECTION_TABS: Array<{id: 'all' | DevMediaSection | 'inbox'; label: string}> = [
  {id: 'all', label: 'Semua'},
  {id: 'hero', label: 'Profil & Hero'},
  {id: 'works', label: 'Works & Reels'},
  {id: 'color', label: 'Color Log'},
  {id: 'timeline', label: 'Timeline'},
  {id: 'inbox', label: 'Inbox Brief'},
];

function MediaDropPicker({
  title,
  slotKey,
  defaultSrc,
  isLogFallback = false,
}: {
  title: string;
  slotKey: string;
  defaultSrc: string;
  isLogFallback?: boolean;
}) {
  const {resolveSlot, replaceSlotWithFile, replaceSlotWithUrl, resetSlot} = useDevMedia();
  const resolved = resolveSlot(slotKey, defaultSrc);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await replaceSlotWithFile(slotKey, file);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      await replaceSlotWithFile(slotKey, file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlDraft.trim()) return;
    replaceSlotWithUrl(slotKey, urlDraft);
    setUrlDraft('');
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-[2.5px] border-[#09090B] p-3.5 space-y-3 transition-all ${
        isDragOver
          ? 'bg-[#FFE600] shadow-[5px_5px_0_#7C3AED]'
          : 'bg-white shadow-[4px_4px_0_#09090B]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-display font-bold text-[#09090B]">{title}</span>
        {resolved.isOverridden && (
          <button
            type="button"
            onClick={() => void resetSlot(slotKey)}
            className="brutal-button inline-flex items-center gap-1 rounded-lg bg-[#FF4D8D] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#09090B] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Calibrated dark neutral media preview frame */}
      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#09090B] border-2 border-[#09090B]">
        {resolved.kind === 'video' ? (
          <video
            src={resolved.src}
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover ${
              isLogFallback && !resolved.isOverridden ? 'grade-log-profile' : ''
            }`}
          />
        ) : (
          <img
            src={resolved.src}
            alt={title}
            className={`w-full h-full object-cover ${
              isLogFallback && !resolved.isOverridden ? 'grade-log-profile' : ''
            }`}
          />
        )}
        {resolved.isOverridden && (
          <span className="absolute top-2 left-2 rounded-lg bg-[#B8FF3B] border-2 border-[#09090B] px-2 py-0.5 text-[10px] font-mono font-bold text-[#09090B] uppercase">
            Custom
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#09090B] bg-[#FFFDF5] hover:bg-[#FEF9C3] py-2.5 px-3 text-xs font-sans font-bold text-[#09090B] transition-colors cursor-pointer"
      >
        <Upload className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2.25} />
        <span>Upload Foto / Video</span>
      </button>

      {resolved.fileName && (
        <p className="text-[11px] font-mono font-bold text-[#09090B] bg-[#B8FF3B] border-2 border-[#09090B] rounded-lg px-2.5 py-1 truncate">
          File: {resolved.fileName}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApplyUrl();
          }}
          placeholder="Paste URL foto / .mp4..."
          className="brutal-input flex-1 h-10 sm:h-8 px-3 rounded-xl text-base sm:text-xs font-sans focus:outline-none"
        />
        <button
          type="button"
          onClick={handleApplyUrl}
          className="brutal-cta h-10 sm:h-8 rounded-xl px-3.5 text-xs font-mono font-bold cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          URL
        </button>
      </div>
    </div>
  );
}

function SlotEditorCard({
  slot,
  isFocused,
  onSelectFocus,
}: {
  slot: DevMediaSlotMeta;
  isFocused: boolean;
  onSelectFocus: (key: string) => void;
}) {
  const {
    resolveSlot,
    replaceSlotWithFile,
    replaceSlotWithUrl,
    resetSlot,
    avatarFrame,
    setAvatarFrame,
    resetAvatarFrame,
    resolveFilmVideoMode,
    setFilmYouTube,
    clearFilmVideoOverride,
  } = useDevMedia();

  const isGradePair = Boolean(slot.gradeSceneId);
  const gradeBeforeKey = slot.gradeSceneId ? `grade:${slot.gradeSceneId}:before` : '';
  const gradeAfterKey = slot.gradeSceneId ? `grade:${slot.gradeSceneId}:after` : '';

  const resolved = resolveSlot(
    isGradePair ? gradeAfterKey : slot.slotKey,
    slot.defaultSrc,
  );
  const resolvedBefore = isGradePair
    ? resolveSlot(gradeBeforeKey, slot.defaultSrc)
    : null;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [urlDraft, setUrlDraft] = useState('');
  const [ytInput, setYtInput] = useState('');
  const [ytStartSec, setYtStartSec] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const film = slot.filmProject;
  const videoMode = film ? resolveFilmVideoMode(film.id) : null;

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }
  }, [isFocused]);

  const filmId = film?.id;
  const videoModeKind = videoMode?.mode;
  const videoModeYtId = videoMode?.youtubeId;
  const videoModeYtStart = videoMode?.youtubeStartSeconds;

  useEffect(() => {
    if (!filmId) return;
    if (videoModeKind !== 'youtube') {
      setYtInput('');
      setYtStartSec('');
      return;
    }
    setYtInput(videoModeYtId ?? '');
    setYtStartSec(String(videoModeYtStart ?? 0));
  }, [filmId, videoModeKind, videoModeYtId, videoModeYtStart]);

  const handleMediaFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await replaceSlotWithFile(slot.slotKey, file);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (isGradePair) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      await replaceSlotWithFile(slot.slotKey, file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlDraft.trim()) return;
    replaceSlotWithUrl(slot.slotKey, urlDraft);
    setUrlDraft('');
  };

  const handleApplyYouTube = () => {
    if (!film || !ytInput.trim()) return;
    const parsedStart = ytStartSec.trim() ? Number(ytStartSec.trim()) : undefined;
    const ok = setFilmYouTube(film.id, ytInput, parsedStart);
    if (ok) {
      setYtInput('');
    }
  };

  const isAvatar = slot.slotKey === 'asset:portraitAvatar';
  const hasAnyOverride =
    resolved.isOverridden ||
    Boolean(resolvedBefore?.isOverridden) ||
    Boolean(videoMode && videoMode.mode !== 'default');

  return (
    <div
      ref={cardRef}
      onDragOver={(e) => {
        if (isGradePair) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-[2.5px] border-[#09090B] transition-all duration-150 ${
        isFocused ? 'md:col-span-2 shadow-[6px_6px_0_#09090B] bg-[#FEF9C3]' : ''
      } ${
        isDragOver
          ? 'bg-[#FFE600] shadow-[6px_6px_0_#7C3AED]'
          : !isFocused
            ? 'bg-white shadow-[4px_4px_0_#09090B] hover:-translate-x-0.5 hover:-translate-y-0.5'
            : ''
      }`}
    >
      {/* Card Summary Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectFocus(isFocused ? '' : slot.slotKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectFocus(isFocused ? '' : slot.slotKey);
          }
        }}
        className="flex items-center gap-3.5 p-3.5 cursor-pointer select-none"
      >
        <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-[#09090B] border-2 border-[#09090B] shrink-0">
          {resolved.kind === 'video' ? (
            <video
              src={resolved.src}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={resolved.src}
              alt={slot.title}
              className="w-full h-full object-cover"
            />
          )}
          {resolved.kind === 'video' && (
            <span className="absolute bottom-1 right-1 rounded bg-[#FFE600] border border-[#09090B] px-1 py-0.5 text-[9px] font-mono font-bold text-[#09090B]">
              VID
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-display font-bold tracking-tight text-[#09090B] truncate">
              {slot.title}
            </p>
            {hasAnyOverride && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#B8FF3B] border border-[#09090B] text-[9px] font-mono font-bold text-[#09090B] uppercase shrink-0">
                Edited
              </span>
            )}
          </div>
          <p className="text-xs font-sans text-[#3F3F46] truncate mt-0.5">
            {slot.description}
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#09090B] shrink-0 transition-transform ${
            isFocused ? 'rotate-180 text-[#7C3AED]' : ''
          }`}
          strokeWidth={2.25}
        />
      </div>

      {/* Expanded Editor */}
      {isFocused && (
        <div className="px-4 pb-4 pt-3.5 border-t-[2.5px] border-[#09090B] bg-white rounded-b-2xl space-y-4">
          {isGradePair ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <MediaDropPicker
                title="1. Upload Log (Before)"
                slotKey={gradeBeforeKey}
                defaultSrc={slot.defaultSrc}
                isLogFallback
              />
              <MediaDropPicker
                title="2. Upload Graded (After)"
                slotKey={gradeAfterKey}
                defaultSrc={slot.defaultSrc}
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-[#09090B] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                  <span>Pilih 1 Foto atau 1 Video (.mp4 / .webm)</span>
                </span>
                {resolved.isOverridden && (
                  <button
                    type="button"
                    onClick={() => void resetSlot(slot.slotKey)}
                    className="brutal-button inline-flex items-center gap-1 rounded-lg bg-[#FF4D8D] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#09090B] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#09090B] bg-[#FFFDF5] hover:bg-[#FFE600] py-3 px-4 text-xs font-sans font-bold text-[#09090B] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2.25} />
                <span>Upload 1 Foto / Video dari perangkat atau drop ke sini</span>
              </button>

              {resolved.fileName && (
                <p className="text-xs font-mono font-bold text-[#09090B] bg-[#B8FF3B] border-2 border-[#09090B] rounded-lg px-2.5 py-1 truncate">
                  File aktif: {resolved.fileName}
                </p>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-[#52525B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyUrl();
                    }}
                    placeholder="Paste URL foto atau video .mp4..."
                    className="brutal-input w-full h-10 sm:h-9 pl-9 pr-3 rounded-xl text-base sm:text-xs font-sans focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="brutal-cta h-10 sm:h-9 rounded-xl px-4 text-xs font-mono font-bold cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  Pakai URL
                </button>
              </div>
            </div>
          )}

          {isAvatar && (
            <div className="brutal-subtle p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-[#09090B] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                  <span>Framing Foto Profil</span>
                </span>
                <button
                  type="button"
                  onClick={resetAvatarFrame}
                  className="brutal-button rounded-lg bg-white px-2.5 py-0.5 text-xs font-mono font-bold cursor-pointer"
                >
                  Reset posisi
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-mono font-bold text-[#3F3F46]">
                <label className="sm:col-span-6 space-y-1">
                  <span className="flex justify-between">
                    <span>Zoom</span>
                    <span className="text-[#09090B] tabular-nums">{avatarFrame.scale.toFixed(2)}x</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={2.6}
                    step={0.05}
                    value={avatarFrame.scale}
                    onChange={(e) =>
                      setAvatarFrame({...avatarFrame, scale: Number(e.target.value)})
                    }
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </label>

                <label className="sm:col-span-3 space-y-1">
                  <span className="flex justify-between">
                    <span>X</span>
                    <span className="text-[#09090B] tabular-nums">{avatarFrame.posX}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={avatarFrame.posX}
                    onChange={(e) =>
                      setAvatarFrame({...avatarFrame, posX: Number(e.target.value)})
                    }
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </label>

                <label className="sm:col-span-3 space-y-1">
                  <span className="flex justify-between">
                    <span>Y</span>
                    <span className="text-[#09090B] tabular-nums">{avatarFrame.posY}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={avatarFrame.posY}
                    onChange={(e) =>
                      setAvatarFrame({...avatarFrame, posY: Number(e.target.value)})
                    }
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => setAvatarFrame({scale: 1, posX: 50, posY: 50})}
                className="brutal-button w-full rounded-xl bg-white py-2 text-xs font-mono font-bold cursor-pointer"
              >
                Fit Standar ({DEFAULT_AVATAR_FRAME.scale}x default)
              </button>
            </div>
          )}

          {film && (
            <div className="brutal-subtle p-3.5 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-bold text-[#09090B] flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-[#FF4D8D]" strokeWidth={2.25} />
                  <span>Opsional: Link YouTube saat diputar</span>
                </span>
                {videoMode && videoMode.mode !== 'default' && (
                  <button
                    type="button"
                    onClick={() => void clearFilmVideoOverride(film.id)}
                    className="brutal-button inline-flex items-center gap-1 rounded-lg bg-[#FF4D8D] px-2.5 py-0.5 text-xs font-mono font-bold text-[#09090B] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2} />
                    <span>Reset YT</span>
                  </button>
                )}
              </div>

              {videoMode?.mode === 'youtube' && (
                <p className="text-xs font-mono font-bold text-[#09090B] bg-[#B8FF3B] border-2 border-[#09090B] rounded-lg px-2.5 py-1 truncate">
                  YouTube aktif: {videoMode.youtubeId} (mulai {videoMode.youtubeStartSeconds ?? 0}s)
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyYouTube();
                  }}
                  placeholder="Link YouTube atau Video ID..."
                  className="brutal-input flex-1 h-10 sm:h-9 px-3.5 rounded-xl text-base sm:text-xs font-sans focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={ytStartSec}
                  onChange={(e) => setYtStartSec(e.target.value)}
                  placeholder="Detik"
                  title="Mulai dari detik ke- (opsional)"
                  className="brutal-input w-20 h-10 sm:h-9 px-3 rounded-xl text-base sm:text-xs font-mono font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyYouTube}
                  className="brutal-cta-purple h-10 sm:h-9 rounded-xl px-4 text-xs font-mono font-bold cursor-pointer shrink-0"
                >
                  Set YT
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DevMediaDrawer() {
  const {
    accessRole,
    studioPin,
    devMode,
    setDevMode,
    drawerOpen,
    setDrawerOpen,
    focusedSlotKey,
    focusVersion,
    overrideCount,
    resetAll,
    exportConfigJson,
    importConfigJson,
  } = useDevMedia();

  const [activeTab, setActiveTab] = useState<'all' | DevMediaSection | 'inbox'>('all');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [inquiries, setInquiries] = useState<ServerInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchInquiries = async () => {
    if (!studioPin) return;
    setInquiriesLoading(true);
    try {
      const res = await fetch('/api/inquiries', {
        headers: {'x-studio-pin': studioPin},
      });
      if (res.ok) {
        const data = (await res.json()) as {inquiries?: ServerInquiry[]};
        setInquiries(data.inquiries ?? []);
      }
    } catch {
      // Silently ignore when offline
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    if (drawerOpen && accessRole === 'developer' && studioPin) {
      void fetchInquiries();
    }
  }, [drawerOpen, accessRole, studioPin]);

  useEffect(() => {
    if (focusedSlotKey) {
      setSelectedKey(focusedSlotKey);
      const slot = DEV_MEDIA_SLOTS.find((s) => s.slotKey === focusedSlotKey);
      if (slot) {
        setActiveTab(slot.section);
      }
    }
  }, [focusedSlotKey, focusVersion]);

  const visibleSlots = useMemo(() => {
    if (activeTab === 'inbox') return [];
    if (activeTab === 'all') return DEV_MEDIA_SLOTS;
    return DEV_MEDIA_SLOTS.filter((s) => s.section === activeTab);
  }, [activeTab]);

  if (accessRole !== 'developer') return null;

  const handleToggleInquiryStatus = async (item: ServerInquiry) => {
    if (!studioPin) return;
    const nextStatus = item.status === 'new' ? 'reviewed' : 'new';
    try {
      const res = await fetch(`/api/inquiries/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-pin': studioPin,
        },
        body: JSON.stringify({status: nextStatus}),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((row) => (row.id === item.id ? {...row, status: nextStatus} : row)),
        );
      }
    } catch {
      toast.error('Gagal memperbarui status brief');
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!studioPin) return;
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'DELETE',
        headers: {'x-studio-pin': studioPin},
      });
      if (res.ok) {
        setInquiries((prev) => prev.filter((row) => row.id !== id));
        toast.success('Brief dihapus dari inbox');
      }
    } catch {
      toast.error('Gagal menghapus brief');
    }
  };

  const handleExportJson = () => {
    const json = exportConfigJson();
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dimstoria-media-config.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleImportJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    importConfigJson(text);
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {devMode && !drawerOpen && (
          <motion.div
            key="dev-media-launcher"
            initial={{opacity: 0, y: 12, scale: 0.96}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 10, scale: 0.96}}
            transition={CUBIC_TACTILE}
            className="fixed bottom-[calc(4.6rem+env(safe-area-inset-bottom))] md:bottom-6 left-3 md:left-6 z-40 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="brutal-cta inline-flex items-center gap-1.5 sm:gap-2 min-h-[46px] sm:min-h-[42px] rounded-2xl px-3 sm:px-4 py-2 text-xs font-mono font-bold cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
              <span>
                <span className="hidden sm:inline">Media </span>Studio ({overrideCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setDevMode(false);
              }}
              aria-label="Matikan badge edit"
              title="Sembunyikan badge edit di UI"
              className="brutal-button inline-flex h-[46px] w-[46px] sm:h-[42px] sm:w-[42px] items-center justify-center rounded-2xl bg-[#FF4D8D] text-[#09090B] cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-4xl overflow-hidden p-0 rounded-3xl bg-[#FFFDF5] bg-brutal-grid border-[3px] border-[#09090B] shadow-[8px_8px_0_#09090B] text-[#09090B]"
        >
          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close Media Studio modal"
                className="brutal-button absolute top-3.5 right-3.5 z-20 inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer"
              />
            }
          >
            <X className="w-4 h-4" strokeWidth={2.25} />
          </DialogClose>

          <VerticalScrollFade className="max-h-[90dvh]">
            <div className="p-5 sm:p-8 space-y-6">
              <DialogHeader className="space-y-3 pr-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFE600] border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] text-xs font-mono font-bold text-[#09090B]">
                    Studio Owner · {overrideCount} Edited
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="brutal-button inline-flex items-center gap-1.5 h-10 sm:h-8 rounded-xl bg-white px-3.5 text-xs font-mono font-bold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                      <span>Export</span>
                    </button>

                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="brutal-button inline-flex items-center gap-1.5 h-10 sm:h-8 rounded-xl bg-white px-3.5 text-xs font-mono font-bold cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
                      <span>Import</span>
                    </button>

                    {overrideCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void resetAll()}
                        className="brutal-button inline-flex items-center gap-1.5 h-10 sm:h-8 rounded-xl bg-[#FF4D8D] px-3.5 text-xs font-mono font-bold text-[#09090B] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Reset Semua</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        setDevMode(false);
                      }}
                      className="brutal-button inline-flex items-center gap-1.5 h-10 sm:h-8 rounded-xl bg-[#FEF9C3] px-3.5 text-xs font-mono font-bold cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5 text-[#09090B]" strokeWidth={2} />
                      <span>Matikan Dev Mode</span>
                    </button>
                  </div>
                </div>

                <DialogTitle className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-[#09090B]">
                  Dev Mode Media Studio
                </DialogTitle>
                <DialogDescription className="text-sm font-sans text-[#3F3F46] max-w-2xl leading-relaxed">
                  Pilih slot di bawah untuk mengganti media. Khusus kartu Color Log sudah langsung berisi pilihan Upload Log (Before) dan Upload Graded (After) dalam satu kartu.
                </DialogDescription>
              </DialogHeader>

              <div className="border-t-[2.5px] border-[#09090B] pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <HorizontalScrollFade className="max-w-full">
                  <div
                    role="tablist"
                    aria-label="Filter slot media"
                    className="brutal-card inline-flex items-center gap-1.5 p-1.5 rounded-2xl w-max bg-white"
                  >
                    {SECTION_TABS.map((tab) => {
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-3.5 min-h-[44px] sm:min-h-[34px] rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#7C3AED] text-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B]'
                              : 'text-[#09090B] hover:bg-[#FEF9C3]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </HorizontalScrollFade>

                <span className="text-xs font-mono font-bold text-[#09090B] shrink-0 tabular-nums">
                  {activeTab === 'inbox'
                    ? `${inquiries.length} Brief Masuk`
                    : `${visibleSlots.length} Slot Tersedia`}
                </span>
              </div>

              {activeTab === 'inbox' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-sans font-medium text-[#3F3F46]">
                      Semua Project Brief dari pengunjung tersimpan otomatis di server.
                    </p>
                    <button
                      type="button"
                      onClick={() => void fetchInquiries()}
                      disabled={inquiriesLoading}
                      className="brutal-button inline-flex items-center gap-1.5 h-9 rounded-xl bg-white px-4 text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-[#7C3AED] ${inquiriesLoading ? 'animate-spin' : ''}`}
                        strokeWidth={2}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {inquiries.length === 0 ? (
                    <div className="brutal-card rounded-2xl bg-white p-8 text-center space-y-2">
                      <Inbox className="w-7 h-7 text-[#7C3AED] mx-auto" strokeWidth={2} />
                      <p className="text-sm font-display font-bold text-[#09090B]">
                        Belum ada brief masuk
                      </p>
                      <p className="text-xs font-sans text-[#3F3F46]">
                        Saat klien mengirim form Project Brief di bagian Contact, pesan akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inquiries.map((item) => (
                        <div
                          key={item.id}
                          className="brutal-card rounded-2xl bg-white p-4 sm:p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-display font-bold text-[#09090B]">
                                  {item.name}
                                </h3>
                                <span className="text-xs font-mono font-bold text-[#7C3AED]">
                                  · {item.scope}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-lg border-2 border-[#09090B] text-[10px] font-mono font-bold uppercase ${
                                    item.status === 'reviewed'
                                      ? 'bg-[#F3E8FF] text-[#7C3AED]'
                                      : 'bg-[#B8FF3B] text-[#09090B]'
                                  }`}
                                >
                                  {item.status === 'reviewed' ? 'Reviewed' : 'New'}
                                </span>
                              </div>
                              <p className="text-xs text-[#52525B] font-mono">
                                {item.email} · {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [dms porto] ${item.scope}`)}`}
                                className="brutal-cta inline-flex items-center gap-1 h-8 rounded-xl px-3.5 text-xs font-mono font-bold"
                              >
                                <Mail className="w-3 h-3" strokeWidth={2} />
                                <span>Reply</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => void handleToggleInquiryStatus(item)}
                                className="brutal-button inline-flex items-center gap-1 h-8 rounded-xl bg-white px-3 text-xs font-mono font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#7C3AED]" strokeWidth={2} />
                                <span>{item.status === 'new' ? 'Tandai Dibaca' : 'Tandai Baru'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteInquiry(item.id)}
                                aria-label="Hapus brief"
                                className="brutal-button inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm font-sans text-[#09090B] bg-[#FFFDF5] border-2 border-[#09090B] rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                            {item.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {visibleSlots.map((slot) => (
                    <SlotEditorCard
                      key={slot.slotKey}
                      slot={slot}
                      isFocused={selectedKey === slot.slotKey}
                      onSelectFocus={(key) => {
                        setSelectedKey(key);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </VerticalScrollFade>
        </DialogContent>
      </Dialog>
    </>
  );
}
