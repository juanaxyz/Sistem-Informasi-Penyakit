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
}: ArtikelEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Range kursor saat tombol gambar ditekan — dipakai menyisipkan hasil upload. */
  const savedRangeRef = useRef<{ index: number; length: number } | null>(null);
  const internalSetRef = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // State untuk modal tautkan penyakit terkait
  const [showPenyakitModal, setShowPenyakitModal] = useState(false);
  const [searchPenyakitQuery, setSearchPenyakitQuery] = useState("");
  const [penyakitList, setPenyakitList] = useState<
    Array<{ id: number; nama: string; slug: string; sistem_tubuh_nama?: string }>
  >([]);
  const [loadingPenyakit, setLoadingPenyakit] = useState(false);
  const [selectedTextPreview, setSelectedTextPreview] = useState<string>("");

  const openTautkanPenyakit = async () => {
    const quill = quillRef.current;
    if (!quill) return;

    const range = quill.getSelection(true) ?? { index: quill.getLength(), length: 0 };
    savedRangeRef.current = range;

    const selectedText =
      range.length > 0 ? quill.getText(range.index, range.length).trim() : "";
    setSelectedTextPreview(selectedText);
    setSearchPenyakitQuery("");
    setShowPenyakitModal(true);

    if (penyakitList.length === 0) {
      setLoadingPenyakit(true);
      try {
        const res = await api.getAllPenyakit().catch(() => null);
        if (res?.penyakit) {
          setPenyakitList(
            res.penyakit.map((p) => ({
              id: p.id,
              nama: p.nama,
              slug: p.slug,
              sistem_tubuh_nama: p.sistem_tubuh_nama,
            })),
          );
        } else {
          const fallback = await api.searchDiseases("");
          setPenyakitList(
            fallback.penyakit.map((p) => ({
              id: p.id,
              nama: p.nama,
              slug: p.slug,
            })),
          );
        }
      } catch {
        // Gagal memuat data master
      } finally {
        setLoadingPenyakit(false);
      }
    }
  };

  const handleInsertPenyakitLink = (slug: string, namaPenyakit: string) => {
    const quill = quillRef.current;
    if (!quill) return;

    const range = savedRangeRef.current ?? { index: quill.getLength(), length: 0 };
    const url = `/penyakit/${slug}`;

    internalSetRef.current = true;
    if (range.length > 0) {
      // Ada teks yang diseleksi -> jadikan link
      quill.formatText(range.index, range.length, "link", url, "user");
      quill.setSelection(range.index + range.length, 0, "user");
    } else {
      // Tidak ada teks yang diseleksi -> sisipkan nama penyakit bertaut
      quill.insertText(range.index, namaPenyakit, "link", url, "user");
      quill.setSelection(range.index + namaPenyakit.length, 0, "user");
    }
    internalSetRef.current = false;
    onChange(quill.root.innerHTML);
    setShowPenyakitModal(false);
  };

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
    if (!wrapperRef.current) return;

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
          container: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote"],
            ["link", "image"],
          ],
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

  const filteredPenyakit = penyakitList.filter((p) => {
    if (!searchPenyakitQuery.trim()) return true;
    const q = searchPenyakitQuery.toLowerCase();
    return (
      p.nama.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.sistem_tubuh_nama && p.sistem_tubuh_nama.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Tip: Blok teks lalu klik <strong>Tautkan Penyakit</strong> untuk membuat rujukan silang.
        </span>
        <button
          type="button"
          onClick={openTautkanPenyakit}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-pine/30 bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine hover:bg-pine/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine disabled:opacity-50 transition"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Tautkan Penyakit Terkait
        </button>
      </div>

      <div
        ref={wrapperRef}
        style={{ minHeight: "400px" }}
        className="bg-background text-ink"
      />
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

      {/* Modal Sisipkan Link Penyakit Terkait */}
      {showPenyakitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowPenyakitModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-display text-base font-semibold text-ink">
                  Tautkan Penyakit Terkait
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTextPreview ? (
                    <>
                      Teks terpilih:{" "}
                      <span className="font-semibold text-ink">
                        "{selectedTextPreview}"
                      </span>
                    </>
                  ) : (
                    "Pilih penyakit untuk disisipkan sebagai tautan rujukan"
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPenyakitModal(false)}
                className="text-muted-foreground hover:text-ink text-sm p-1 rounded"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Cari nama penyakit..."
                value={searchPenyakitQuery}
                onChange={(e) => setSearchPenyakitQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {loadingPenyakit ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Memuat daftar penyakit…
                </div>
              ) : filteredPenyakit.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Tidak ada penyakit ditemukan.
                </div>
              ) : (
                filteredPenyakit.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleInsertPenyakitLink(p.slug, p.nama)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-pine/30 hover:bg-pine/5 text-left transition group"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink group-hover:text-pine">
                        {p.nama}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        /penyakit/{p.slug}
                      </div>
                    </div>
                    {p.sistem_tubuh_nama && (
                      <span className="text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground shrink-0">
                        {p.sistem_tubuh_nama}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPenyakitModal(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
