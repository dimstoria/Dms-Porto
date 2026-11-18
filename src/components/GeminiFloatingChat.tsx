import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {toast} from 'sonner';
import {CUBIC_EASE, LIQUID_SPRING, LIQUID_SPRING_SNAPPY} from '../lib/motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

interface GeminiFloatingChatProps {
  visible: boolean;
  onJumpToContact?: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Halo! Saya Gemini Assistant untuk studio Dimstoria (dms porto). Tanyakan apa saja tentang portofolio film, color grading DaVinci Resolve, paket kamera, estimasi timeline, atau minta bantuan menyusun project brief.',
};

const QUICK_PROMPTS = [
  'Rekomendasi paket syuting iklan?',
  'Kamera & color pipeline yang dipakai?',
  'Berapa lama turnaround edit?',
  'Bantu susun brief video pendek',
];

function createMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function GeminiFloatingChat({
  visible,
  onJumpToContact,
}: GeminiFloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    listEndRef.current?.scrollIntoView({
      behavior: isStreaming ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, isOpen, isStreaming]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!visible) return null;

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isStreaming) return;

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome' && !m.isError && m.text.trim().length > 0)
      .slice(-14)
      .map((m) => ({role: m.role, text: m.text}));

    const userMsg: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      text: trimmed,
    };
    const modelMsgId = createMessageId();
    const assistantPlaceholder: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInputValue('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
        }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorMessage = `Gagal terhubung ke Gemini (${response.status}).`;
        if (contentType.includes('application/json')) {
          const payload = (await response.json()) as {error?: string};
          if (payload.error) errorMessage = payload.error;
        }
        throw new Error(errorMessage);
      }

      if (!response.body || contentType.includes('application/json')) {
        const data = (await response.json()) as {text?: string; error?: string};
        if (data.error) throw new Error(data.error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {...m, text: data.text || 'Maaf, tidak ada respons teks.'}
              : m,
          ),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr) as {
                text?: string;
                error?: string;
                done?: boolean;
              };
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMsgId ? {...m, text: accumulatedText} : m,
                  ),
                );
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message && !jsonStr.startsWith('{')) {
                continue;
              }
              if (parseErr instanceof Error && jsonStr.includes('"error"')) {
                throw parseErr;
              }
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  text: 'Respons selesai tanpa teks tambahan. Silakan ajukan pertanyaan lain.',
                }
              : m,
          ),
        );
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Terjadi gangguan koneksi saat menghubungi Gemini.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId
            ? {...m, text: errMsg, isError: true}
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(inputValue);
    }
  };

  const handleResetChat = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages([WELCOME_MESSAGE]);
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Jawaban disalin ke clipboard');
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1600);
    } catch {
      toast.error('Gagal menyalin teks');
    }
  };

  const showQuickStarters = messages.length <= 1;

  return (
    <>
      {/* Floating Gemini Chat Window (Playful Neo-Brutalism) */}
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="gemini-floating-panel"
            role="dialog"
            aria-label="Gemini Studio Chat"
            aria-modal="false"
            initial={{opacity: 0, y: 18, scale: 0.95}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 14, scale: 0.96}}
            transition={LIQUID_SPRING}
            className="fixed z-40 inset-x-3 bottom-[calc(8.2rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-[5.25rem] md:w-[410px] h-[min(66dvh,530px)] md:h-[min(560px,calc(100dvh-7.5rem))] brutal-card-elevated rounded-3xl overflow-hidden flex flex-col bg-[#FFFDF5]"
          >
            {/* Bright Yellow Brutalist Header Bar */}
            <div className="border-b-[3px] border-[#09090B] bg-[#FFE600] px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] text-white border-2 border-[#09090B] shadow-[2px_2px_0_#09090B] shrink-0">
                  <Sparkles className="w-4 h-4 text-[#FFE600]" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-[15px] font-extrabold tracking-tight text-[#09090B] leading-tight truncate">
                    Gemini Studio Chat
                  </h2>
                  <p className="text-[10px] font-mono font-bold text-[#09090B]/80 truncate">
                    Fast Mode · Dimstoria Studio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Mulai obrolan baru"
                    aria-label="Reset percakapan"
                    className="brutal-button inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-white text-[#09090B] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup tab Gemini"
                  className="brutal-button inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-[#FF4D8D] text-[#09090B] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>

            {/* Chat Message Thread with Graph Grid Backdrop */}
            <div className="relative flex-1 min-h-0 overflow-y-auto bg-[#FFFDF5] bg-brutal-grid p-3.5 sm:p-4 space-y-3">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isWaitingFirstChunk =
                  !isUser && !msg.isError && msg.text.length === 0 && isStreaming;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{opacity: 0, y: 6}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.18, ease: CUBIC_EASE}}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl border-2 border-[#09090B] px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-[3px_3px_0_#09090B] ${
                        isUser
                          ? 'bg-[#7C3AED] text-white rounded-br-sm font-sans font-medium'
                          : msg.isError
                            ? 'bg-[#FF4D8D] text-[#09090B] rounded-bl-sm font-mono font-bold'
                            : msg.id === 'welcome'
                              ? 'bg-[#FEF9C3] text-[#09090B] rounded-bl-sm font-sans'
                              : 'bg-white text-[#09090B] rounded-bl-sm font-sans'
                      }`}
                    >
                      {isWaitingFirstChunk ? (
                        <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[#7C3AED]">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FFE600] border border-[#09090B] animate-bounce" />
                          <span>Gemini sedang berpikir...</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      )}
                    </div>

                    {!isUser && !msg.isError && msg.id !== 'welcome' && msg.text && !isStreaming && (
                      <div className="mt-1.5 flex items-center gap-2 pl-1">
                        <button
                          type="button"
                          onClick={() => void handleCopyText(msg.id, msg.text)}
                          className="brutal-button inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-mono font-bold text-[#09090B] cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-[#7C3AED]" strokeWidth={2.25} />
                          ) : (
                            <Copy className="w-3 h-3" strokeWidth={2} />
                          )}
                          <span>{copiedId === msg.id ? 'Tersalin' : 'Salin'}</span>
                        </button>

                        {onJumpToContact && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              onJumpToContact();
                            }}
                            className="brutal-button inline-flex items-center gap-1 rounded-lg bg-[#B8FF3B] px-2.5 py-1 text-[10px] font-mono font-bold text-[#09090B] cursor-pointer"
                          >
                            <span>Kirim Brief</span>
                            <ArrowUpRight className="w-3 h-3" strokeWidth={2.25} />
                          </button>
                        )}
                      </div>
                    )}

                    {msg.isError && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastUser = [...messages]
                            .reverse()
                            .find((m) => m.role === 'user');
                          if (lastUser) {
                            setMessages((prev) =>
                              prev.filter((m) => m.id !== msg.id && m.id !== lastUser.id),
                            );
                            void sendMessage(lastUser.text);
                          }
                        }}
                        className="brutal-cta mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-mono font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" strokeWidth={2} />
                        <span>Coba Lagi</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}

              {/* Quick Starter Prompts */}
              {showQuickStarters && (
                <div className="pt-1.5 space-y-2">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#3F3F46]">
                    Quick Prompts
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isStreaming}
                        onClick={() => void sendMessage(prompt)}
                        className="brutal-button rounded-xl bg-white hover:bg-[#FFE600] px-3 py-1.5 text-[11px] font-sans font-medium text-[#09090B] text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={listEndRef} />
            </div>

            {/* Composer Form */}
            <form
              onSubmit={handleSubmit}
              className="border-t-[3px] border-[#09090B] bg-[#F5F0E1] p-2.5 sm:p-3 flex items-end gap-2 shrink-0"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya Gemini di sini..."
                aria-label="Tulis pesan untuk Gemini"
                className="brutal-input flex-1 min-h-[44px] max-h-24 resize-none rounded-xl px-3 py-2.5 text-base md:text-xs font-sans focus:outline-none"
              />
              <motion.button
                type="submit"
                whileTap={{scale: 0.94}}
                transition={LIQUID_SPRING_SNAPPY}
                disabled={isStreaming || !inputValue.trim()}
                aria-label="Kirim pesan"
                className="brutal-cta inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <Send className="w-4 h-4" strokeWidth={2.25} />
              </motion.button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Dedicated Floating Trigger Tab */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{y: -2, x: -1}}
        whileTap={{scale: 0.95, y: 2, x: 2}}
        transition={LIQUID_SPRING_SNAPPY}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Tutup tab chat Gemini' : 'Buka tab chat Gemini'}
        className={`fixed z-40 right-3 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-6 inline-flex items-center gap-2 min-h-[46px] px-4 rounded-2xl border-[3px] border-[#09090B] shadow-[5px_5px_0_#09090B] font-mono text-xs font-bold cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
          isOpen
            ? 'bg-[#FF4D8D] text-[#09090B]'
            : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
        }`}
      >
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#09090B] ${
            isOpen ? 'bg-white text-[#09090B]' : 'bg-[#FFE600] text-[#09090B]'
          }`}
        >
          {isOpen ? (
            <X className="w-4 h-4" strokeWidth={2.25} />
          ) : (
            <MessageSquare className="w-4 h-4" strokeWidth={2.25} />
          )}
        </span>
        <span className="whitespace-nowrap">
          {isOpen ? 'Tutup Gemini' : 'Tanya Gemini'}
        </span>
      </motion.button>
    </>
  );
}
