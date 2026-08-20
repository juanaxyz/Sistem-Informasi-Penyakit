import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, X } from "lucide-react";
import { api } from "../lib/api";
import type { ChatTurn } from "../lib/types";

type ChatMessage = {
  from: "bot" | "user";
  text: string;
};

const GREETING =
  "Halo, saya asisten kesehatan Peta Kesehatan. Silakan tanyakan seputar penyakit atau bagian tubuh.";

const initialMessages: ChatMessage[] = [
  {
    from: "bot",
    text: GREETING,
  },
];

/** Render teks jawaban, ubah tautan `/penyakit/{id}` menjadi link navigasi. */
function renderAnswer(text: string) {
  const parts = text.split(/(\/penyakit\/\d+)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\/penyakit\/(\d+)$/);
    if (m) {
      return (
        <Link
          key={i}
          to={part}
          className="font-medium text-primary underline underline-offset-2"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Konteks percakapan: turn sebelum pesan ini (kecuali salam pembuka, maks 8 turn).
    const history: ChatTurn[] = messages
      .filter((m) => m.text !== GREETING)
      .slice(-8)
      .map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const result = await api.chat({
        question: text,
        session_id: sessionId,
        history,
      });
      if (result.session_id) setSessionId(result.session_id);
      setMessages((prev) => [...prev, { from: "bot", text: result.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Maaf, terjadi kendala saat memproses pertanyaan Anda. Silakan coba lagi.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-widget-panel"
        aria-label={open ? "Tutup chat" : "Buka chat"}
        className="fixed cursor-pointer bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {open && (
        <section
          id="chat-widget-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Chat asisten kesehatan"
          className="fixed bottom-20 right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">
                  Asisten Kesehatan
                </p>
                <p className="text-xs text-muted-foreground">
                  Informasi edukasi, bukan diagnosis
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Tutup chat"
              className="p-1 rounded hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.from === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <p
                  className={
                    m.from === "user"
                      ? "max-w-[80%] whitespace-pre-line rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "max-w-[80%] whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                  }
                >
                  {m.from === "user" ? m.text : renderAnswer(m.text)}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <p className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  Mengetik...
                </p>
              </div>
            )}
          </div>

          <footer className="border-t border-border p-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <label htmlFor="chat-input" className="sr-only">
                Ketik pesan
              </label>
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pertanyaan..."
                autoComplete="off"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <button
                type="submit"
                aria-label="Kirim pesan"
                disabled={loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </footer>
        </section>
      )}
    </>
  );
}
