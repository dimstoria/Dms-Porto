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
import {toast} from 'sonner';
import {emitStudioActivity} from './AgentContext';
import {MEDIA_ASSETS} from '../data/mediaAssets';
import {
  PORTFOLIO_FILMS,
  SHOWREEL_PROJECT,
  TIMELINE_STUDIES,
  type FilmProject,
} from '../data/portfolio';
import {
  clearAllMediaBlobs,
  createEmptyOverrides,
  DEFAULT_AVATAR_FRAME,
  deleteMediaBlob,
  getAllMediaBlobs,
  inferMediaKindFromFile,
  inferMediaKindFromUrl,
  loadSerializedOverrides,
  parseYouTubeInput,
  saveMediaBlob,
  saveSerializedOverrides,
  type AvatarFrameConfig,
  type MediaKind,
  type SerializedMediaOverrides,
} from '../utils/devMediaStore';

export type DevMediaSection = 'hero' | 'works' | 'color' | 'timeline';
export type AccessRole = 'pending' | 'guest' | 'developer';

const DEFAULT_FILM_VIDEO_MODE = {mode: 'default' as const};

export interface ResolvedMedia {
  src: string;
  kind: MediaKind;
  isOverridden: boolean;
  fileName?: string;
}

export interface DevMediaSlotMeta {
  slotKey: string;
  section: DevMediaSection;
  title: string;
  description: string;
  defaultSrc: string;
  filmProject?: FilmProject;
  gradeSceneId?: string;
}

export const COLOR_GRADING_DEFAULT_SCENES = [
  {
    id: 'solis',
    label: 'Solis Pavilion',
    filmTitle: 'Morning Geometry · Daylight Architecture',
    image: MEDIA_ASSETS.architecturalFilm,
    colorSpace: 'REDWideGamutRGB → Rec.709',
    lutCurve: 'Kodak 2383 Daylight Soft Roll-off',
    notes: 'Lifted shadow density in travertine stone while preserving crisp morning sky highlights.',
  },
  {
    id: 'saltflats',
    label: 'Salt Flats',
    filmTitle: 'Zero Noise · Automotive High-Key',
    image: MEDIA_ASSETS.automotiveMotion,
    colorSpace: 'ARRI LogC4 → ACEScct',
    lutCurve: 'Neutral Metallic + Cool Slate Split',
    notes: 'Protected specular reflections along brushed silver bodywork without clipping white salt crust.',
  },
  {
    id: 'ceramic',
    label: 'Sora Studio',
    filmTitle: 'Kiln & Patience · Natural Window Light',
    image: MEDIA_ASSETS.artisanDoc,
    colorSpace: 'Sony S-Gamut3.Cine → Rec.709',
    lutCurve: 'Warm Stone Skin-Tone Print Curve',
    notes: 'Balanced north-facing window spill with natural warm skin tones and matte clay texture.',
  },
] as const;

export const DEV_MEDIA_SLOTS: DevMediaSlotMeta[] = [
  {
    slotKey: 'asset:portraitAvatar',
    section: 'hero',
    title: 'Profile Avatar',
    description: 'Circular portrait photo above the hero headline',
    defaultSrc: MEDIA_ASSETS.portraitAvatar,
  },
  {
    slotKey: 'asset:showreelHero',
    section: 'hero',
    title: 'Hero Showreel & Video',
    description: 'Main showreel cover frame + playable YouTube / MP4 reel',
    defaultSrc: SHOWREEL_PROJECT.image,
    filmProject: SHOWREEL_PROJECT,
  },
  ...PORTFOLIO_FILMS.map((film) => ({
    slotKey: `film:${film.id}:cover`,
    section: 'works' as const,
    title: film.title,
    description: `${film.category} · ${film.client} · Cover + Playable Video`,
    defaultSrc: film.image,
    filmProject: film,
  })),
  ...COLOR_GRADING_DEFAULT_SCENES.map((scene) => ({
    slotKey: `grade:${scene.id}`,
    section: 'color' as const,
    title: `Color Log · ${scene.label}`,
    description: `Log (Before) & Graded (After): ${scene.filmTitle}`,
    defaultSrc: scene.image,
    gradeSceneId: scene.id,
  })),
  ...TIMELINE_STUDIES.flatMap((study) =>
    study.markers.map((marker) => ({
      slotKey: `timeline:${study.id}:${marker.id}`,
      section: 'timeline' as const,
      title: `Cut ${marker.timecode} · ${marker.title}`,
      description: `${study.title.split(':')[0].trim()} · ${marker.technique}`,
      defaultSrc: marker.previewImage,
    })),
  ),
];

interface DevMediaContextValue {
  accessRole: AccessRole;
  studioPin: string | null;
  enterGuestMode: () => void;
  unlockDeveloperMode: (pin: string) => Promise<boolean>;
  lockToGuestMode: () => void;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  toggleDevMode: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  focusedSlotKey: string | null;
  focusVersion: number;
  openSlotEditor: (slotKey: string) => void;
  overrides: SerializedMediaOverrides;
  overrideCount: number;
  avatarFrame: AvatarFrameConfig;
  setAvatarFrame: (frame: AvatarFrameConfig) => void;
  resetAvatarFrame: () => void;
  resolveSlot: (slotKey: string, fallbackSrc: string) => ResolvedMedia;
  resolveShowreel: () => FilmProject;
  resolveFilms: () => FilmProject[];
  resolveFilmVideoMode: (filmId: string) => {
    mode: 'default' | 'youtube' | 'video-url' | 'video-blob' | 'cover-only';
    youtubeId?: string;
    youtubeStartSeconds?: number;
    videoUrl?: string;
    fileName?: string;
  };
  replaceSlotWithFile: (slotKey: string, file: File) => Promise<void>;
  replaceSlotWithUrl: (slotKey: string, url: string) => void;
  setFilmYouTube: (filmId: string, input: string, explicitStartSeconds?: number) => boolean;
  setFilmVideoUrl: (filmId: string, url: string) => void;
  setFilmVideoFile: (filmId: string, file: File) => Promise<void>;
  clearFilmVideoOverride: (filmId: string) => Promise<void>;
  resetSlot: (slotKey: string) => Promise<void>;
  resetAll: () => Promise<void>;
  exportConfigJson: () => string;
  importConfigJson: (jsonText: string) => boolean;
}

const DevMediaContext = createContext<DevMediaContextValue | null>(null);

export function DevMediaProvider({children}: {children: ReactNode}) {
  const [accessRole, setAccessRole] = useState<AccessRole>('pending');
  const [studioPin, setStudioPin] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedSlotKey, setFocusedSlotKey] = useState<string | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const [overrides, setOverrides] = useState<SerializedMediaOverrides>(() =>
    loadSerializedOverrides(),
  );
  const [blobUrls, setBlobUrls] = useState<Record<string, {url: string; kind: MediaKind; fileName: string}>>({});
  const blobUrlsRef = useRef<Record<string, string>>({});
  const hydratedServerConfigRef = useRef(false);

  // Hydrate stored binary media blobs from IndexedDB on mount
  useEffect(() => {
    let active = true;
    void getAllMediaBlobs()
      .then((records) => {
        if (!active) return;
        const map: Record<string, {url: string; kind: MediaKind; fileName: string}> = {};
        const urlLookup: Record<string, string> = {};
        records.forEach((rec) => {
          const objUrl = URL.createObjectURL(rec.blob);
          map[rec.slotKey] = {url: objUrl, kind: rec.kind, fileName: rec.fileName};
          urlLookup[rec.slotKey] = objUrl;
        });
        blobUrlsRef.current = urlLookup;
        setBlobUrls(map);
      })
      .catch(() => {
        // IndexedDB might be unavailable in restricted contexts; URL overrides still work
      });

    return () => {
      active = false;
      Object.values(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = {};
    };
  }, []);

  // Hydrate shared media URL/YouTube config from server so edits persist across devices
  useEffect(() => {
    let active = true;
    void fetch('/api/media-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {ok?: boolean; config?: Partial<SerializedMediaOverrides>} | null) => {
        if (!active || !data?.ok || !data.config) {
          hydratedServerConfigRef.current = true;
          return;
        }
        const remote = data.config;
        setOverrides((prev) => ({
          avatarFrame: remote.avatarFrame ?? prev.avatarFrame,
          slots: {...(remote.slots ?? {}), ...prev.slots},
          filmVideos: {...(remote.filmVideos ?? {}), ...prev.filmVideos},
        }));
        hydratedServerConfigRef.current = true;
      })
      .catch(() => {
        hydratedServerConfigRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist lightweight metadata to localStorage & sync public URL/YouTube config to server
  useEffect(() => {
    saveSerializedOverrides(overrides);
    if (!hydratedServerConfigRef.current || accessRole !== 'developer' || !studioPin) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch('/api/media-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-pin': studioPin,
        },
        body: JSON.stringify(overrides),
      }).catch(() => undefined);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [overrides, accessRole, studioPin]);

  // Keyboard shortcut Ctrl+Shift+D / Cmd+Shift+D to toggle Dev Mode (only available for authenticated Developer role)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (accessRole !== 'developer') return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (!devMode) {
          setDevMode(true);
          setDrawerOpen(true);
        } else {
          setDrawerOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accessRole, devMode]);

  const enterGuestMode = useCallback(() => {
    setStudioPin(null);
    setDevMode(false);
    setDrawerOpen(false);
    setAccessRole('guest');
  }, []);

  const unlockDeveloperMode = useCallback(async (pin: string): Promise<boolean> => {
    const candidate = pin.trim();
    if (!candidate) return false;

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pin: candidate}),
      });
      if (!res.ok) {
        return false;
      }
      setStudioPin(candidate);
      setAccessRole('developer');
      setDevMode(false);
      setDrawerOpen(false);
      toast.success('Dev Mode unlocked. Open Media Studio from the header anytime.');
      return true;
    } catch {
      return false;
    }
  }, []);

  const lockToGuestMode = useCallback(() => {
    setStudioPin(null);
    setDevMode(false);
    setDrawerOpen(false);
    setAccessRole('guest');
  }, []);

  const toggleDevMode = useCallback(() => {
    if (accessRole !== 'developer') return;
    if (!devMode) {
      setDevMode(true);
      setDrawerOpen(true);
      return;
    }
    setDrawerOpen((prev) => !prev);
  }, [accessRole, devMode]);

  const openSlotEditor = useCallback(
    (slotKey: string) => {
      if (accessRole !== 'developer') return;
      const normalizedKey = slotKey.replace(/^grade:([^:]+):(before|after)$/, 'grade:$1');
      setDevMode(true);
      setFocusedSlotKey(normalizedKey);
      setFocusVersion((v) => v + 1);
      setDrawerOpen(true);
    },
    [accessRole],
  );

  const setBlobRecordInState = useCallback(
    (slotKey: string, blob: Blob, kind: MediaKind, fileName: string) => {
      const oldUrl = blobUrlsRef.current[slotKey];
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      const nextUrl = URL.createObjectURL(blob);
      blobUrlsRef.current[slotKey] = nextUrl;
      setBlobUrls((prev) => ({
        ...prev,
        [slotKey]: {url: nextUrl, kind, fileName},
      }));
    },
    [],
  );

  const removeBlobRecordFromState = useCallback((slotKey: string) => {
    const oldUrl = blobUrlsRef.current[slotKey];
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
      delete blobUrlsRef.current[slotKey];
    }
    setBlobUrls((prev) => {
      if (!(slotKey in prev)) return prev;
      const copy = {...prev};
      delete copy[slotKey];
      return copy;
    });
  }, []);

  const replaceSlotWithFile = useCallback(
    async (slotKey: string, file: File) => {
      const kind = inferMediaKindFromFile(file);
      try {
        await saveMediaBlob({
          slotKey,
          blob: file,
          kind,
          fileName: file.name,
          updatedAt: Date.now(),
        });
      } catch {
        // Continue with in-memory ObjectURL even if IndexedDB fails
      }

      setBlobRecordInState(slotKey, file, kind, file.name);
      setOverrides((prev) => ({
        ...prev,
        slots: {
          ...prev.slots,
          [slotKey]: {
            sourceType: 'blob',
            kind,
            fileName: file.name,
          },
        },
      }));
      toast.success(`Media diperbarui (${file.name})`);
      emitStudioActivity({
        kind: 'install',
        label: `Memasang media ${file.name}`,
        agentIds: ['impeccable', 'frontend', 'tastes'],
        durationMs: 4800,
        silent: true,
      });
    },
    [setBlobRecordInState],
  );

  const replaceSlotWithUrl = useCallback(
    (slotKey: string, url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      const kind = inferMediaKindFromUrl(trimmed);
      removeBlobRecordFromState(slotKey);
      void deleteMediaBlob(slotKey).catch(() => {});

      setOverrides((prev) => ({
        ...prev,
        slots: {
          ...prev.slots,
          [slotKey]: {
            sourceType: 'url',
            url: trimmed,
            kind,
          },
        },
      }));
      toast.success('URL media berhasil diterapkan');
      emitStudioActivity({
        kind: 'task',
        label: 'Menyinkronkan slot media',
        agentIds: ['frontend', 'uiux'],
        durationMs: 4200,
        silent: true,
      });
    },
    [removeBlobRecordFromState],
  );

  const setFilmYouTube = useCallback(
    (filmId: string, input: string, explicitStartSeconds?: number): boolean => {
      const parsed = parseYouTubeInput(input);
      if (!parsed) {
        toast.error('Link atau ID YouTube tidak valid.');
        return false;
      }

      const blobKey = `film-video:${filmId}`;
      removeBlobRecordFromState(blobKey);
      void deleteMediaBlob(blobKey).catch(() => {});

      const startSec =
        explicitStartSeconds !== undefined && !Number.isNaN(explicitStartSeconds)
          ? Math.max(0, Math.floor(explicitStartSeconds))
          : parsed.startSeconds ?? 0;

      setOverrides((prev) => ({
        ...prev,
        filmVideos: {
          ...prev.filmVideos,
          [filmId]: {
            mode: 'youtube',
            youtubeId: parsed.youtubeId,
            youtubeStartSeconds: startSec,
          },
        },
      }));
      toast.success(`Video YouTube diperbarui (${parsed.youtubeId})`);
      return true;
    },
    [removeBlobRecordFromState],
  );

  const setFilmVideoUrl = useCallback(
    (filmId: string, url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      const blobKey = `film-video:${filmId}`;
      removeBlobRecordFromState(blobKey);
      void deleteMediaBlob(blobKey).catch(() => {});

      setOverrides((prev) => ({
        ...prev,
        filmVideos: {
          ...prev.filmVideos,
          [filmId]: {
            mode: 'video-url',
            videoUrl: trimmed,
          },
        },
      }));
      toast.success('URL video reel berhasil diterapkan');
    },
    [removeBlobRecordFromState],
  );

  const setFilmVideoFile = useCallback(
    async (filmId: string, file: File) => {
      const blobKey = `film-video:${filmId}`;
      try {
        await saveMediaBlob({
          slotKey: blobKey,
          blob: file,
          kind: 'video',
          fileName: file.name,
          updatedAt: Date.now(),
        });
      } catch {
        // Fallback to in-memory ObjectURL
      }
      setBlobRecordInState(blobKey, file, 'video', file.name);

      setOverrides((prev) => ({
        ...prev,
        filmVideos: {
          ...prev.filmVideos,
          [filmId]: {
            mode: 'video-blob',
            fileName: file.name,
          },
        },
      }));
      toast.success(`Video reel diupload (${file.name})`);
      emitStudioActivity({
        kind: 'install',
        label: `Memasang video ${file.name}`,
        agentIds: ['frontend', 'tastes', 'apple'],
        durationMs: 5000,
        silent: true,
      });
    },
    [setBlobRecordInState],
  );

  const clearFilmVideoOverride = useCallback(
    async (filmId: string) => {
      const blobKey = `film-video:${filmId}`;
      removeBlobRecordFromState(blobKey);
      await deleteMediaBlob(blobKey).catch(() => {});
      setOverrides((prev) => {
        const nextVideos = {...prev.filmVideos};
        delete nextVideos[filmId];
        return {...prev, filmVideos: nextVideos};
      });
      toast.success('Sumber video dikembalikan ke default');
    },
    [removeBlobRecordFromState],
  );

  const resetSlot = useCallback(
    async (slotKey: string) => {
      removeBlobRecordFromState(slotKey);
      await deleteMediaBlob(slotKey).catch(() => {});

      setOverrides((prev) => {
        const nextSlots = {...prev.slots};
        delete nextSlots[slotKey];

        // Also reset avatar frame if resetting portraitAvatar
        const nextAvatarFrame =
          slotKey === 'asset:portraitAvatar' ? undefined : prev.avatarFrame;

        return {
          ...prev,
          avatarFrame: nextAvatarFrame,
          slots: nextSlots,
        };
      });
      toast.success('Slot media dikembalikan ke default');
    },
    [removeBlobRecordFromState],
  );

  const resetAll = useCallback(async () => {
    Object.values(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = {};
    setBlobUrls({});
    await clearAllMediaBlobs().catch(() => {});
    setOverrides(createEmptyOverrides());
    toast.success('Semua foto & video dikembalikan ke default asli');
  }, []);

  const setAvatarFrame = useCallback((frame: AvatarFrameConfig) => {
    setOverrides((prev) => ({
      ...prev,
      avatarFrame: frame,
    }));
  }, []);

  const resetAvatarFrame = useCallback(() => {
    setOverrides((prev) => ({
      ...prev,
      avatarFrame: undefined,
    }));
  }, []);

  const resolveSlot = useCallback(
    (slotKey: string, fallbackSrc: string): ResolvedMedia => {
      const slot = overrides.slots[slotKey];
      if (!slot) {
        return {
          src: fallbackSrc,
          kind: inferMediaKindFromUrl(fallbackSrc),
          isOverridden: false,
        };
      }
      if (slot.sourceType === 'blob') {
        const blobRec = blobUrls[slotKey];
        if (blobRec) {
          return {
            src: blobRec.url,
            kind: blobRec.kind,
            isOverridden: true,
            fileName: blobRec.fileName,
          };
        }
        return {
          src: fallbackSrc,
          kind: inferMediaKindFromUrl(fallbackSrc),
          isOverridden: false,
        };
      }
      if (slot.url) {
        return {
          src: slot.url,
          kind: slot.kind,
          isOverridden: true,
        };
      }
      return {
        src: fallbackSrc,
        kind: inferMediaKindFromUrl(fallbackSrc),
        isOverridden: false,
      };
    },
    [overrides.slots, blobUrls],
  );

  const resolveFilm = useCallback(
    (film: FilmProject, coverSlotKey: string): FilmProject => {
      const resolvedCover = resolveSlot(coverSlotKey, film.image);
      const vidOverride = overrides.filmVideos[film.id];
      const videoBlobRec = blobUrls[`film-video:${film.id}`];

      let youtubeId = film.youtubeId;
      let youtubeStartSeconds = film.youtubeStartSeconds;
      let videoUrl = film.videoUrl;

      if (vidOverride) {
        if (vidOverride.mode === 'youtube' && vidOverride.youtubeId) {
          youtubeId = vidOverride.youtubeId;
          youtubeStartSeconds = vidOverride.youtubeStartSeconds ?? 0;
          videoUrl = undefined;
        } else if (vidOverride.mode === 'video-url' && vidOverride.videoUrl) {
          youtubeId = undefined;
          youtubeStartSeconds = undefined;
          videoUrl = vidOverride.videoUrl;
        } else if (vidOverride.mode === 'video-blob' && videoBlobRec) {
          youtubeId = undefined;
          youtubeStartSeconds = undefined;
          videoUrl = videoBlobRec.url;
        } else if (vidOverride.mode === 'cover-only') {
          youtubeId = undefined;
          youtubeStartSeconds = undefined;
          videoUrl = undefined;
        }
      } else if (resolvedCover.kind === 'video') {
        // If user dropped a video directly on the cover slot without setting separate playback source,
        // automatically play that video inside the lightbox too!
        youtubeId = undefined;
        youtubeStartSeconds = undefined;
        videoUrl = resolvedCover.src;
      }

      return {
        ...film,
        image: resolvedCover.src,
        imageKind: resolvedCover.kind,
        videoUrl,
        youtubeId,
        youtubeStartSeconds,
      };
    },
    [resolveSlot, overrides.filmVideos, blobUrls],
  );

  const resolveShowreel = useCallback(
    () => resolveFilm(SHOWREEL_PROJECT, 'asset:showreelHero'),
    [resolveFilm],
  );

  const resolveFilms = useCallback(
    () => PORTFOLIO_FILMS.map((film) => resolveFilm(film, `film:${film.id}:cover`)),
    [resolveFilm],
  );

  const resolveFilmVideoMode = useCallback(
    (filmId: string) => {
      const ov = overrides.filmVideos[filmId];
      if (!ov) {
        return DEFAULT_FILM_VIDEO_MODE;
      }
      return ov;
    },
    [overrides.filmVideos],
  );

  const overrideCount = useMemo(() => {
    const slotCount = Object.keys(overrides.slots).length;
    const vidCount = Object.keys(overrides.filmVideos).length;
    return slotCount + vidCount;
  }, [overrides.slots, overrides.filmVideos]);

  const avatarFrame = useMemo(() => {
    if (overrides.avatarFrame) return overrides.avatarFrame;
    // If avatar image was replaced by user and no custom frame was explicitly saved, center the new portrait nicely!
    if (overrides.slots['asset:portraitAvatar']) {
      return {scale: 1, posX: 50, posY: 50};
    }
    return DEFAULT_AVATAR_FRAME;
  }, [overrides.avatarFrame, overrides.slots]);

  const exportConfigJson = useCallback(() => {
    return JSON.stringify(overrides, null, 2);
  }, [overrides]);

  const importConfigJson = useCallback((jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<SerializedMediaOverrides>;
      if (!parsed || typeof parsed !== 'object') return false;

      // Only restore URL-based overrides safely; keep existing blobs if matching
      const next: SerializedMediaOverrides = {
        avatarFrame: parsed.avatarFrame,
        slots: {},
        filmVideos: {},
      };

      if (parsed.slots && typeof parsed.slots === 'object') {
        Object.entries(parsed.slots).forEach(([k, v]) => {
          if (v && v.sourceType === 'url' && v.url) {
            next.slots[k] = v;
          }
        });
      }

      if (parsed.filmVideos && typeof parsed.filmVideos === 'object') {
        Object.entries(parsed.filmVideos).forEach(([k, v]) => {
          if (v && (v.mode === 'youtube' || v.mode === 'video-url' || v.mode === 'cover-only')) {
            next.filmVideos[k] = v;
          }
        });
      }

      setOverrides(next);
      toast.success('Konfigurasi URL media berhasil di-import');
      emitStudioActivity({
        kind: 'install',
        label: 'Menginstal konfigurasi media',
        agentIds: ['impeccable', 'frontend', 'uiux', 'apple', 'antislop'],
        durationMs: 5200,
        silent: true,
      });
      return true;
    } catch {
      toast.error('Format JSON tidak valid');
      return false;
    }
  }, []);

  const value = useMemo<DevMediaContextValue>(
    () => ({
      accessRole,
      studioPin,
      enterGuestMode,
      unlockDeveloperMode,
      lockToGuestMode,
      devMode,
      setDevMode,
      toggleDevMode,
      drawerOpen,
      setDrawerOpen,
      focusedSlotKey,
      focusVersion,
      openSlotEditor,
      overrides,
      overrideCount,
      avatarFrame,
      setAvatarFrame,
      resetAvatarFrame,
      resolveSlot,
      resolveShowreel,
      resolveFilms,
      resolveFilmVideoMode,
      replaceSlotWithFile,
      replaceSlotWithUrl,
      setFilmYouTube,
      setFilmVideoUrl,
      setFilmVideoFile,
      clearFilmVideoOverride,
      resetSlot,
      resetAll,
      exportConfigJson,
      importConfigJson,
    }),
    [
      accessRole,
      studioPin,
      enterGuestMode,
      unlockDeveloperMode,
      lockToGuestMode,
      devMode,
      toggleDevMode,
      drawerOpen,
      focusedSlotKey,
      focusVersion,
      openSlotEditor,
      overrides,
      overrideCount,
      avatarFrame,
      setAvatarFrame,
      resetAvatarFrame,
      resolveSlot,
      resolveShowreel,
      resolveFilms,
      resolveFilmVideoMode,
      replaceSlotWithFile,
      replaceSlotWithUrl,
      setFilmYouTube,
      setFilmVideoUrl,
      setFilmVideoFile,
      clearFilmVideoOverride,
      resetSlot,
      resetAll,
      exportConfigJson,
      importConfigJson,
    ],
  );

  return <DevMediaContext.Provider value={value}>{children}</DevMediaContext.Provider>;
}

export function useDevMedia(): DevMediaContextValue {
  const ctx = useContext(DevMediaContext);
  if (!ctx) {
    throw new Error('useDevMedia must be used within a DevMediaProvider');
  }
  return ctx;
}
