import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export type PenyakitLinkOption = { slug: string; nama: string };

type QuillEditorProps = {
  value: string;
  onChange: (html: string) => void;
  /** Daftar penyakit untuk link internal `/penyakit/{slug}`. */
  penyakitOptions?: PenyakitLinkOption[];
};

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  ["blockquote"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
];

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "link",
  "image",
];

type LinkDraft = {
  index: number;
  length: number;
  text: string;
  mode: "external" | "internal";
  url: string;
  slug: string;
};

/**
 * Normalkan URL eksternal: tambahkan skema bila admin hanya mengetik domain.
 * `https://` dipaksa sehingga input `javascript:...` tidak pernah lolos sebagai
 * skema berbahaya (pembersihan akhir tetap di sisi server).
 */
function normalizeExternalUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith("mailto:")) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function QuillEditor({
  value,
  onChange,
  penyakitOptions = [],
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);

  onChangeRef.current = onChange;
  valueRef.current = value;

  const uploadGambar = useCallback(async (file: File): Promise<string | null> => {
    setUploadError(null);
    try {
      const res = await api.uploadBagianGambar(file);
      return res.url;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
      return null;
    }
  }, []);

  const sisipkanGambar = useCallback((quill: Quill, url: string) => {
    const range = quill.getSelection() ?? { index: quill.getLength(), length: 0 };
    quill.insertEmbed(range.index, "image", url, "user");
  }, []);

  const handleImageButton = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void uploadGambar(file).then((url) => {
        if (url) sisipkanGambar(quill, url);
      });
    };
    input.click();
  }, [uploadGambar, sisipkanGambar]);

  const handleLinkButton = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const range = quill.getSelection() ?? { index: quill.getLength(), length: 0 };
    const text = range.length ? quill.getText(range) : "";
    const existing = (quill.getFormat(range).link as string | undefined) ?? "";
    const internal = existing.startsWith("/penyakit/");
    setLinkDraft({
      index: range.index,
      length: range.length,
      text,
      mode: internal ? "internal" : "external",
      url: internal ? "" : existing,
      slug: internal
        ? existing.slice("/penyakit/".length)
        : (penyakitOptions[0]?.slug ?? ""),
    });
  }, [penyakitOptions]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR_OPTIONS,
        handlers: { image: handleImageButton, link: handleLinkButton },
      },
      clipboard: { matchVisual: false },
    }),
    [handleImageButton, handleLinkButton],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || quillRef.current) return;

    const quill = new Quill(el, {
      theme: "snow",
      formats: FORMATS,
      modules,
      placeholder:
        "Tuliskan isi edukasi. Sisipkan gambar atau tautan lewat toolbar di atas.",
    });
    if (valueRef.current) quill.root.innerHTML = valueRef.current;
    quillRef.current = quill;

    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      // Editor kosong (hanya `<p><br></p>`) disimpan sebagai string kosong.
      onChangeRef.current(quill.getText().trim() ? html : "");
    });

    // ponytail: paste gambar murni (tanpa teks) diunggah ke server, bukan
    // menjadi data URI base64 yang membesarkan kolom konten. Drag-drop dan
    // paste gambar dari halaman web (ada teks/HTML-nya) belum ditangani —
    // tambah saat admin mulai membutuhkan.
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const list = Array.from(items);
      const imgItem = list.find((it) => it.type.startsWith("image/"));
      if (!imgItem || list.some((it) => it.type.startsWith("text/"))) return;
      const file = imgItem.getAsFile();
      if (!file) return;
      e.preventDefault();
      void uploadGambar(file).then((url) => {
        if (url) sisipkanGambar(quill, url);
      });
    };
    quill.root.addEventListener("paste", onPaste);

    return () => {
      quill.root.removeEventListener("paste", onPaste);
      quillRef.current = null;
    };
  }, [modules, uploadGambar, sisipkanGambar]);

  // Sinkronkan dari props saat editor tidak difokus (mis. artikel lain dibuka).
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || document.activeElement === quill.root) return;
    if (value !== quill.root.innerHTML) quill.root.innerHTML = value;
  }, [value]);

  const submitLink = () => {
    const quill = quillRef.current;
    if (!quill || !linkDraft) return;
    if (linkDraft.mode === "internal" && !linkDraft.slug) return;
    const url =
      linkDraft.mode === "internal"
        ? `/penyakit/${linkDraft.slug}`
        : normalizeExternalUrl(linkDraft.url);
    if (!url) return;
    const label = linkDraft.text.trim() || url;
    if (linkDraft.length > 0) quill.deleteText(linkDraft.index, linkDraft.length);
    quill.insertText(linkDraft.index, label, { link: url }, "user");
    quill.focus();
    quill.setSelection(linkDraft.index + label.length, 0);
    setLinkDraft(null);
  };

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine";

  return (
    <div className="space-y-1.5">
      {linkDraft && (
        <div className="space-y-2 rounded-md border border-pine/30 bg-pine/5 p-3">
          <p className="text-xs font-semibold text-ink">Sisipkan tautan</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="radio"
                name="link-mode"
                checked={linkDraft.mode === "external"}
                onChange={() => setLinkDraft({ ...linkDraft, mode: "external" })}
              />
              URL eksternal
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="radio"
                name="link-mode"
                checked={linkDraft.mode === "internal"}
                onChange={() => setLinkDraft({ ...linkDraft, mode: "internal" })}
              />
              Penyakit internal
            </label>
          </div>
          {linkDraft.mode === "external" ? (
            <input
              type="url"
              value={linkDraft.url}
              autoFocus
              onChange={(e) =>
                setLinkDraft({ ...linkDraft, url: e.target.value })
              }
              placeholder="https://www.who.int/..."
              className={inputCls}
            />
          ) : (
            <select
              value={linkDraft.slug}
              onChange={(e) =>
                setLinkDraft({ ...linkDraft, slug: e.target.value })
              }
              className={inputCls}
            >
              <option value="">— pilih penyakit —</option>
              {penyakitOptions.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nama}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={linkDraft.text}
            onChange={(e) => setLinkDraft({ ...linkDraft, text: e.target.value })}
            placeholder="Teks tautan (opsional, default: URL)"
            className={inputCls}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={submitLink}>
              Sisipkan
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLinkDraft(null);
                quillRef.current?.focus();
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
      <div ref={containerRef} className="quill-body" />
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
    </div>
  );
}
