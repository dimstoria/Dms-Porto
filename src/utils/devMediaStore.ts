const DB_NAME = 'dimstoria-dev-media-db';
const DB_VERSION = 1;
const STORE_NAME = 'media-blobs';
const OVERRIDES_STORAGE_KEY = 'dimstoria-dev-media-overrides-v1';

export type MediaKind = 'image' | 'video';

export interface StoredBlobRecord {
  slotKey: string;
  blob: Blob;
  kind: MediaKind;
  fileName: string;
  updatedAt: number;
}

export interface AvatarFrameConfig {
  scale: number;
  posX: number; // 0..100 (%)
  posY: number; // 0..100 (%)
}

export interface SerializedMediaOverrides {
  avatarFrame?: AvatarFrameConfig;
  slots: Record<
    string,
    {
      sourceType: 'url' | 'blob';
      url?: string;
      kind: MediaKind;
      fileName?: string;
    }
  >;
  filmVideos: Record<
    string,
    {
      mode: 'default' | 'youtube' | 'video-url' | 'video-blob' | 'cover-only';
      youtubeId?: string;
      youtubeStartSeconds?: number;
      videoUrl?: string;
      fileName?: string;
    }
  >;
}

export const DEFAULT_AVATAR_FRAME: AvatarFrameConfig = {
  scale: 1.75,
  posX: 20,
  posY: 0,
};

export function createEmptyOverrides(): SerializedMediaOverrides {
  return {
    slots: {},
    filmVideos: {},
  };
}

export function loadSerializedOverrides(): SerializedMediaOverrides {
  if (typeof window === 'undefined') return createEmptyOverrides();
  try {
    const raw = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return createEmptyOverrides();
    const parsed = JSON.parse(raw) as Partial<SerializedMediaOverrides>;
    return {
      avatarFrame: parsed.avatarFrame,
      slots: parsed.slots && typeof parsed.slots === 'object' ? parsed.slots : {},
      filmVideos:
        parsed.filmVideos && typeof parsed.filmVideos === 'object' ? parsed.filmVideos : {},
    };
  } catch {
    return createEmptyOverrides();
  }
}

export function saveSerializedOverrides(data: SerializedMediaOverrides): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function inferMediaKindFromFile(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) return 'video';
  return 'image';
}

export function inferMediaKindFromUrl(url: string): MediaKind {
  const clean = url.trim().split('?')[0].split('#')[0];
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(clean)) return 'video';
  if (/^data:video\//i.test(url.trim())) return 'video';
  return 'image';
}

export function parseYouTubeInput(input: string): {
  youtubeId: string;
  startSeconds?: number;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {youtubeId: trimmed};
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? '';
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
          videoId = parts[1] ?? '';
        }
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    const rawTime = parsed.searchParams.get('t') || parsed.searchParams.get('start');
    let startSeconds: number | undefined;
    if (rawTime) {
      if (/^\d+$/.test(rawTime)) {
        startSeconds = Number(rawTime);
      } else {
        // Parse 1h2m30s / 3m30s / 90s format
        const match = rawTime.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
        if (match) {
          const hrs = Number(match[1] ?? 0);
          const mins = Number(match[2] ?? 0);
          const secs = Number(match[3] ?? 0);
          const total = hrs * 3600 + mins * 60 + secs;
          if (total > 0) startSeconds = total;
        }
      }
    }

    return {youtubeId: videoId, startSeconds};
  } catch {
    return null;
  }
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'slotKey'});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveMediaBlob(record: StoredBlobRecord): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save media blob'));
    };
  });
}

export async function getAllMediaBlobs(): Promise<StoredBlobRecord[]> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result as StoredBlobRecord[]) ?? []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Failed to load media blobs'));
    };
  });
}

export async function deleteMediaBlob(slotKey: string): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(slotKey);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete media blob'));
    };
  });
}

export async function clearAllMediaBlobs(): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to clear media blobs'));
    };
  });
}
