import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  scope: string;
  notes: string;
  status: 'new' | 'reviewed';
  createdAt: string;
}

interface MediaConfigPayload {
  avatarFrame?: {
    scale: number;
    posX: number;
    posY: number;
  };
  slots: Record<
    string,
    {
      sourceType: 'url' | 'blob';
      url?: string;
      kind: 'image' | 'video';
      fileName?: string;
    }
  >;
  filmVideos: Record<
    string,
    {
      mode: 'youtube' | 'video-url' | 'video-blob' | 'cover-only';
      youtubeId?: string;
      youtubeStartSeconds?: number;
      videoUrl?: string;
      fileName?: string;
    }
  >;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '.data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const MEDIA_CONFIG_FILE = path.join(DATA_DIR, 'media-config.json');
const PORT = Number(process.env.PORT) || 3000;
const STUDIO_PIN = (process.env.STUDIO_DEV_PIN || '1225').trim();
const STUDIO_EMAIL = 'dimstoria2@gmail.com';

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sanitizePublicMediaConfig(raw: Partial<MediaConfigPayload>): MediaConfigPayload {
  const clean: MediaConfigPayload = {
    avatarFrame: raw.avatarFrame,
    slots: {},
    filmVideos: {},
  };

  if (raw.slots && typeof raw.slots === 'object') {
    for (const [key, val] of Object.entries(raw.slots)) {
      if (val && val.sourceType === 'url' && typeof val.url === 'string' && val.url.trim()) {
        clean.slots[key] = {
          sourceType: 'url',
          url: val.url.trim(),
          kind: val.kind === 'video' ? 'video' : 'image',
        };
      }
    }
  }

  if (raw.filmVideos && typeof raw.filmVideos === 'object') {
    for (const [key, val] of Object.entries(raw.filmVideos)) {
      if (
        val &&
        (val.mode === 'youtube' || val.mode === 'video-url' || val.mode === 'cover-only')
      ) {
        clean.filmVideos[key] = val;
      }
    }
  }

  return clean;
}

function requireStudioPin(req: Request, res: Response, next: NextFunction): void {
  const headerPin = String(req.headers['x-studio-pin'] || '').trim();
  if (!headerPin || headerPin !== STUDIO_PIN) {
    res.status(401).json({ok: false, error: 'Unauthorized: invalid studio PIN.'});
    return;
  }
  next();
}

function injectCanonicalMetadata(html: string, req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  const baseUrl = envUrl
    ? envUrl.replace(/\/+$/, '')
    : `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`;
  return html.replaceAll('https://dimstoria.studio/', `${baseUrl}/`);
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({limit: '2mb'}));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ok: true, service: 'dimstoria-studio'});
  });

  app.post('/api/auth/verify-pin', (req: Request, res: Response) => {
    const candidate = String((req.body as {pin?: string} | undefined)?.pin || '').trim();
    if (!candidate || candidate !== STUDIO_PIN) {
      res.status(401).json({ok: false, error: 'Incorrect PIN.'});
      return;
    }
    res.json({ok: true});
  });

  app.get('/api/media-config', (_req: Request, res: Response) => {
    const config = readJsonFile<MediaConfigPayload>(MEDIA_CONFIG_FILE, {
      slots: {},
      filmVideos: {},
    });
    res.json({ok: true, config});
  });

  app.put('/api/media-config', requireStudioPin, (req: Request, res: Response) => {
    const body = (req.body || {}) as Partial<MediaConfigPayload>;
    const sanitized = sanitizePublicMediaConfig(body);
    writeJsonFile(MEDIA_CONFIG_FILE, sanitized);
    res.json({ok: true, config: sanitized});
  });

  app.post('/api/inquiries', (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      name?: string;
      email?: string;
      scope?: string;
      notes?: string;
    };

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const scope = String(body.scope || 'Commercial / Brand Film').trim();
    const notes = String(body.notes || '').trim();

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !notes) {
      res.status(400).json({
        ok: false,
        error: 'Name, valid email address, and project notes are required.',
      });
      return;
    }

    const inquiry: InquiryRecord = {
      id: `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      scope,
      notes,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    const existing = readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, []);
    writeJsonFile(INQUIRIES_FILE, [inquiry, ...existing]);

    res.status(201).json({ok: true, inquiry});
  });

  app.get('/api/inquiries', requireStudioPin, (_req: Request, res: Response) => {
    const inquiries = readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, []);
    res.json({ok: true, inquiries});
  });

  app.patch('/api/inquiries/:id', requireStudioPin, (req: Request, res: Response) => {
    const {id} = req.params;
    const status = (req.body as {status?: string} | undefined)?.status;
    if (status !== 'new' && status !== 'reviewed') {
      res.status(400).json({ok: false, error: 'Invalid inquiry status.'});
      return;
    }

    const inquiries = readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, []);
    const idx = inquiries.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ok: false, error: 'Inquiry not found.'});
      return;
    }

    inquiries[idx] = {...inquiries[idx], status};
    writeJsonFile(INQUIRIES_FILE, inquiries);
    res.json({ok: true, inquiry: inquiries[idx]});
  });

  app.delete('/api/inquiries/:id', requireStudioPin, (req: Request, res: Response) => {
    const {id} = req.params;
    const inquiries = readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, []);
    const next = inquiries.filter((item) => item.id !== id);
    writeJsonFile(INQUIRIES_FILE, next);
    res.json({ok: true});
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const rawHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res
          .status(200)
          .set({'Content-Type': 'text/html; charset=utf-8'})
          .end(injectCanonicalMetadata(transformed, req));
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, {index: false}));

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexFile)) {
        res.status(404).send('Build output not found.');
        return;
      }
      const rawHtml = fs.readFileSync(indexFile, 'utf8');
      res
        .status(200)
        .set({'Content-Type': 'text/html; charset=utf-8'})
        .end(injectCanonicalMetadata(rawHtml, req));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dimstoria server running at http://0.0.0.0:${PORT}`);
  });
}

void startServer();
