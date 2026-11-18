import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import type { QuillOptions } from "quill";
import "quill/dist/quill.snow.css";
import { api, ApiError } from "@/lib/api";
import { validateImageFile } from "@/lib/artikel";

/**
 * Editor Quill untuk satu artikel (Opsi A).
 *
 * Output: HTML (`root.innerHTML`) — bukan Delta. Format dibatasi ke daftar
 * tag yang diizinkan kontrak (h2, h3, p, br, strong, em, u, s, ul, ol, li,
 * blockquote, a, img) supaya tidak ada format yang dibuang backend.
 *
 * Gambar tidak pernah base64: klik tombol image, paste, maupun drag-drop
 * semuanya lewat handler yang sama -> POST /api/artikel/upload-gambar.
 */
type ArtikelEditorProps = {
  /** HTML dari backend / state form. */
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

const EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "blockquote",
  "link",
  "image",
];

export function ArtikelEditor({
  value,
  onChange,
  disabled = false,
}: ArtikelEditorProps) {  const toolbarRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Range kursor saat tombol gambar ditekan — dipakai menyisipkan hasil upload. */
  const savedRangeRef = useRef<{ index: number; length: number } | null>(null);
  const internalSetRef = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Upload satu file gambar lalu sisipkan <img src=url> di kursor.
   * Satu-satunya jalan masuk gambar ke editor (klik tombol, paste, drop).
   */
  const uploadAndInsert = async (file: File) => {
    const quill = quillRef.current;
    if (!quill) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await api.uploadGambarArtikel(file);
      // getSelection(true) pada editor belum fokus bisa memberi range aneh
      // (addRange error) — fallback ke akhir dokumen.
      const selection = savedRangeRef.current ?? quill.getSelection();
      const range =
        selection && selection.index <= quill.getLength()
          ? selection
          : { index: quill.getLength(), length: 0 };
      /**
       * SetContents dari value luar (effect [value]) bisa menimpa sisipan
       * baru bila state parent belum diperbarui. Kunci internal + emit html
       * baru manual supaya state selalu sejalan dengan editor.
       */
      internalSetRef.current = true;
      quill.insertEmbed(range.index, "image", url, "user");
      quill.setSelection(range.index + 1, 0, "user");
      internalSetRef.current = false;
      onChange(quill.root.innerHTML);
    } catch (err) {
      if (err instanceof ApiError) {
        // 413 / 415 sudah membawa pesan dari backend; 401/403 juga.
        setUploadError(err.message);
      } else {
        setUploadError(
          "Gagal mengunggah gambar. Periksa koneksi internet lalu coba lagi.",
        );
      }
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!wrapperRef.current || !toolbarRef.current) return;

    /**
     * Buat node container baru tiap kali effect jalan (StrictMode
     * double-mount / remount): menghapus node lama juga melepas Quill
     * sebelumnya. Kalau Quill dibuat dua kali pada node yang sama, editor
     * akan bersarang dan handler/fire upload tidak konsisten.
     */
    const wrapper = wrapperRef.current;
    wrapper.innerHTML = "";
    const container = document.createElement("div");
    wrapper.appendChild(container);

    const quill = new Quill(container, {
      theme: "snow",
      placeholder: "Tulis artikel di sini…",
      formats: EDITOR_FORMATS,
      modules: {
        toolbar: {
          container: toolbarRef.current,
          handlers: {
            // Ganti handler bawaan (base64) dengan pilih file -> upload.
            image: () => {
              const q = quillRef.current;
              if (!q) return;
              savedRangeRef.current = q.getSelection(true);
              fileInputRef.current?.click();
            },
          },
        },
      },
    } satisfies QuillOptions);
    quillRef.current = quill;

    if (value) quill.clipboard.dangerouslyPasteHTML(value);

    quill.on("text-change", () => {
      if (internalSetRef.current) return;
      onChange(quill.root.innerHTML);
    });


    /**
     * Intercept paste/drop FILE gambar di fase capture (sebelum handler
     * bawaan Quill yang akan menanam base64). HTML yang dipaste tetap lewat
     * clipboard Quill dan otomatis difilter ke format terdaftar di atas.
     */
    const onPasteFile = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      savedRangeRef.current = quill.getSelection(true);
      void uploadAndInsert(images[0]);
    };
    const onDropFile = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []);
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      savedRangeRef.current = quill.getSelection(true);
      void uploadAndInsert(images[0]);
    };
    // Guard: gambar base64 dari HTML luar (mis. paste dari web) dibuang.
    const Delta = Quill.import("delta");
    quill.clipboard.addMatcher("img", (node, delta) => {
      const src = (node as HTMLElement).getAttribute("src") ?? "";
      return src.startsWith("data:") ? new Delta().insert("\n") : delta;
    });

    wrapper.addEventListener("paste", onPasteFile, true);
    wrapper.addEventListener("drop", onDropFile, true);

    return () => {
      wrapper.removeEventListener("paste", onPasteFile, true);
      wrapper.removeEventListener("drop", onDropFile, true);
      quill.disable();
      quillRef.current = null;
      // Lepas DOM editor lama supaya remount tidak menumpuk Quill.
      wrapper.innerHTML = "";
    };
    // Editor dibuat satu kali; value dikontrol lewat effect di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronisasi value luar (mis. respons PUT tersanitasi) tanpa lompat kursor.
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || value === quill.root.innerHTML) return;
    internalSetRef.current = true;
    const delta = quill.clipboard.convert({ html: value || "" });
    quill.setContents(delta, "silent");
    internalSetRef.current = false;
  }, [value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (disabled) quill.disable();
    else quill.enable();
  }, [disabled]);

  return (
    <div className="w-full">
      <div ref={toolbarRef} className="border border-border rounded-t-lg bg-card" />
      {/* `article-prose` membungkus editor agar styling di editor sama dengan
          tampilan publik; max-width 65ch-nya ditim supaya editor melebar penuh. */}
      <div className="article-prose" style={{ maxWidth: "none" }}>
        <div
          ref={wrapperRef}
          style={{ minHeight: "400px" }}
          className="border border-t-0 border-border rounded-b-lg bg-background text-ink"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadAndInsert(file);
        }}
      />
      {uploading && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 align-middle mr-1.5 rounded-full border-2 border-pine border-t-transparent animate-spin" />
          Mengunggah gambar…
        </p>
      )}
      {uploadError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {uploadError}
        </p>
      )}
    </div>
  );
}
