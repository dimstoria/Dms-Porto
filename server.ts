import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentResponse,
} from '@google/genai';
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

  const STUDIO_CHAT_SYSTEM_INSTRUCTION = [
    'Kamu adalah asisten AI studio untuk Dimstoria ("dms porto"), portofolio milik Dimas (Director of Photography, Lead Video Editor, & Finishing Colorist berbasis di Jakarta dan melayani proyek remote worldwide).',
    'Jawab pertanyaan pengunjung dengan ramah, langsung ke inti, ringkas, dan jelas dalam bahasa yang sama dengan pengguna (Indonesia atau Inggris). Hindari basa-basi panjang.',
    'Fakta penting studio Dimstoria:',
    '- Layanan utama: (01) Direction & Cinematography (commercials, music videos, brand monographs, 4K/8K RAW), (02) Narrative & Rhythm Editing (offline & online di Premiere Pro / DaVinci Resolve, multi-ratio cutdowns), (03) Color Grading & Sound Finish (ACEScct color pipeline, Kodak 2383 emulation, LUT craft, sound/Foley finish).',
    '- Kamera & pipeline: ARRI Alexa Mini LF, ARRI Alexa 35, RED V-Raptor 8K, Sony Venice 2, Sony FX6, DaVinci Resolve Studio (ACEScct).',
    '- Karya pilihan: Morning Geometry at Solis Pavilion (Kengo Architectural Press, Commercial, 01:32, 2.39:1), Zero Noise: Salt Flat Dynamics (Nordic Mobility Lab, Commercial, 01:15, 60fps), Monolith Sessions: Live in White (Nadia Tan & Verve Records, Music Video, 03:42, 4:3), Kiln & Patience (Sora Craft Collective, Documentary, 04:18), The Studio Behind the Lens (Dimstoria House Study, 01:10), dan Showreel 2026.',
    '- Turnaround & cara kerja: offline cut pertama umumnya siap dalam ~48 jam setelah wrap untuk proyek komersial standar; menerima syuting langsung di Jakarta/Asia Tenggara serta remote editing & color grading global.',
    '- Kontak resmi: dimstoria2@gmail.com atau melalui form Project Brief di bagian bawah halaman.',
    'Bantu pengunjung berdiskusi tentang konsep video, ide storyboard, tips sinematografi/editing/color grading, atau menyusun draf Project Brief yang siap dikirim.',
  ].join('\n');

  let cachedAiClient: {key: string; client: GoogleGenAI} | null = null;
  const getGeminiClient = (apiKey: string): GoogleGenAI => {
    if (cachedAiClient && cachedAiClient.key === apiKey) {
      return cachedAiClient.client;
    }
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedAiClient = {key: apiKey, client};
    return client;
  };

  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error:
          'GEMINI_API_KEY belum terpasang di server. Tambahkan GEMINI_API_KEY di panel Settings > Secrets.',
      });
      return;
    }

    const body = (req.body || {}) as {
      message?: unknown;
      history?: Array<{role?: unknown; text?: unknown}>;
    };

    const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (!userMessage) {
      res.status(400).json({ok: false, error: 'Pesan tidak boleh kosong.'});
      return;
    }

    if (userMessage.length > 4000) {
      res.status(400).json({ok: false, error: 'Pesan maksimal 4000 karakter.'});
      return;
    }

    const sanitizedHistory = Array.isArray(body.history)
      ? body.history
          .slice(-16)
          .filter(
            (item): item is {role: 'user' | 'model'; text: string} =>
              Boolean(item) &&
              (item.role === 'user' || item.role === 'model') &&
              typeof item.text === 'string' &&
              item.text.trim().length > 0,
          )
          .map((item) => ({
            role: item.role,
            parts: [{text: item.text.trim().slice(0, 4000)}],
          }))
      : [];

    const ai = getGeminiClient(apiKey);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const openChatStreamWithRetry = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const chat = ai.chats.create({
            model: 'gemini-3.1-flash-lite',
            history: sanitizedHistory,
            config: {
              systemInstruction: STUDIO_CHAT_SYSTEM_INSTRUCTION,
              thinkingConfig: {thinkingLevel: ThinkingLevel.MINIMAL},
            },
          });
          return await chat.sendMessageStream({message: userMessage});
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient = /500|503|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
          if (!isTransient || attempt === 1) throw err;
          await sleep(450 * (attempt + 1));
        }
      }
      throw lastError;
    };

    try {
      const stream = await openChatStreamWithRetry();

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      let closed = false;
      req.on('close', () => {
        closed = true;
      });

      for await (const chunk of stream) {
        if (closed) break;
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          res.write(`data: ${JSON.stringify({text: c.text})}\n\n`);
        }
      }

      if (!closed) {
        res.write(`data: ${JSON.stringify({done: true})}\n\n`);
        res.end();
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Gagal memproses respons Gemini.';
      let friendlyMessage = rawMessage;
      let statusCode = 500;

      if (/API_KEY_INVALID|PERMISSION_DENIED|403|401/i.test(rawMessage)) {
        statusCode = 403;
        friendlyMessage =
          'API key Gemini tidak valid atau belum memiliki akses. Periksa GEMINI_API_KEY di panel Settings > Secrets.';
      } else if (/RESOURCE_EXHAUSTED|429/i.test(rawMessage)) {
        statusCode = 429;
        friendlyMessage =
          'Kuota permintaan Gemini sementara penuh. Silakan tunggu beberapa detik lalu coba lagi.';
      } else if (/NOT_FOUND|404/i.test(rawMessage)) {
        statusCode = 404;
        friendlyMessage = 'Model Gemini tidak ditemukan atau tidak didukung.';
      }

      if (!res.headersSent) {
        res.status(statusCode).json({ok: false, error: friendlyMessage});
      } else {
        res.write(`data: ${JSON.stringify({error: friendlyMessage})}\n\n`);
        res.end();
      }
    }
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
