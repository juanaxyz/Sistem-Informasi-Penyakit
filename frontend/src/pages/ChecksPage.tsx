import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleProse } from "@/components/ArticleProse";
import { ArtikelEditor } from "@/components/ArtikelEditor";
import { isEmptyKonten, validateImageFile } from "@/lib/artikel";

type Hasil = { nama: string; lolos: boolean; catatan?: string };

const XSS_PAYLOAD = [
  '<h2>Gejala</h2>',
  '<p>Deskripsi <strong>aman</strong></p>',
  '<script>alert("xss")</script>',
  '<p><img src="x" onerror="alert(1)" alt="jebakan"></p>',
  '<p><a href="javascript:alert(1)" target="_blank">link jebakan</a></p>',
  '<iframe src="https://evil.test"></iframe>',
].join("");

/**
 * Halaman pengecekan mandiri (dev only): buka /checks saat `npm run dev`.
 * Menguji render HTML sanitizer (DOMPurify) dan alur upload gambar Quill
 * dengan fetch di-mock. Tidak butuh backend.
 */
export function ChecksPage() {
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const cekSudah = useRef(false);
  const tambah = useCallback(
    (h: Hasil) => setHasil((prev) => [...prev, h]),
    [],
  );
  const xssRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // StrictMode double-invoke -> hanya catat sekali.
    if (cekSudah.current) return;
    cekSudah.current = true;
    // 1. isEmptyKonten + validateImageFile (di browser, file asli)
    tambah({ nama: "isEmptyKonten <p><br></p>", lolos: isEmptyKonten("<p><br></p>") });
    tambah({ nama: "isEmptyKonten teks", lolos: !isEmptyKonten("<p>Demam</p>") });
    tambah({
      nama: "validateImageFile >2MB",
      lolos: validateImageFile({ type: "image/png", size: 3 * 1024 * 1024 }) !== null,
    });
    tambah({
      nama: "validateImageFile gif",
      lolos: validateImageFile({ type: "image/gif", size: 10 }) !== null,
    });
    tambah({
      nama: "validateImageFile webp",
      lolos: validateImageFile({ type: "image/webp", size: 10 }) === null,
    });
  }, [tambah]);

  useEffect(() => {
    // 2. Render XSS payload — cek setelah DOM terbentuk.
    const timer = setTimeout(() => {
      const el = xssRef.current;
      if (!el) return;
      const script = el.querySelector("script");
      const iframe = el.querySelector("iframe");
      const imgJebakan = Array.from(el.querySelectorAll("img")).find((i) =>
        i.hasAttribute("onerror"),
      );
      const linkJebakan = Array.from(el.querySelectorAll("a")).find(
        (a) => a.getAttribute("href") === "javascript:alert(1)",
      );
      const h2 = el.querySelector("h2");
      const strong = el.querySelector("strong");
      tambah({
        nama: "XSS: <script> & onerror tidak tereksekusi",
        lolos: !script && !iframe && !imgJebakan && !linkJebakan,
        catatan: script ? script.outerHTML : undefined,
      });
      tambah({
        nama: "XSS: konten aman tetap dirender + id heading",
        lolos:
          !!h2 &&
          !!h2.id &&
          !!strong &&
          el.textContent?.includes("aman") === true,
        catatan: h2 ? `id="${h2.id}"` : undefined,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [tambah]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Pengecekan Artikel Editor (dev)
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Jalankan juga `node src/lib/artikel.checks.ts` untuk cek fungsi murni.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-ink">1. Render aman (DOMPurify)</h2>
        <div ref={xssRef} className="rounded-lg border border-border p-4">
          <ArticleProse>{XSS_PAYLOAD}</ArticleProse>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-ink">2. Editor Quill + upload gambar</h2>
        <EditorCheck onResult={tambah} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Hasil</h2>
        <ul className="space-y-1">
          {hasil.map((h, i) => (
            <li key={i} className={h.lolos ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {h.lolos ? "PASS" : "FAIL"} — {h.nama}
              {h.catatan ? <span className="ml-2 font-mono text-xs text-muted-foreground">{h.catatan}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Render editor, lalu simulasikan pilih file gambar dengan fetch di-mock. */
function EditorCheck({ onResult }: { onResult: (h: Hasil) => void }) {
  const [html, setHtml] = useState("<p>konten awal</p>");

  useEffect(() => {
    /**
     * Tunggu StrictMode selesai double-invoke effect (editor pertama sengaja
     * dilepas). Dispatch dilakukan setelah editor termount stabil.
     */
    const timer = setTimeout(() => {
      const root = document.querySelector(".ql-editor") as HTMLElement | null;
      if (!root) {
        onResult({
          nama: "render editor",
          lolos: false,
          catatan: ".ql-editor tidak ditemukan",
        });
        return;
      }
      onResult({
        nama: "render editor (value awal)",
        lolos: root.textContent?.includes("awal") === true,
      });

      const input = document.querySelector(
        '.artikel-editor-wrap input[type="file"]',
      ) as HTMLInputElement | null;
      if (!input) {
        onResult({ nama: "input file editor", lolos: false });
        return;
      }

      // Mock POST /api/artikel/upload-gambar
      const fetchAsli = globalThis.fetch;
      let terkirim: string | null = null;
      globalThis.fetch = async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        terkirim = String(url);
        const form = init?.body as FormData | undefined;
        const file = form?.get("gambar") as File | null;
        return new Response(
          JSON.stringify({
            url: "https://cdn.test/uploads/gambar.webp",
            terima: file?.name,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      };

      const file = new File(["dummy"], "foto.png", { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      setTimeout(() => {
        globalThis.fetch = fetchAsli;
        const img = root.querySelector("img");
        onResult({
          nama: "upload gambar: POST ke endpoint yang benar",
          lolos: terkirim?.includes("/api/artikel/upload-gambar") === true,
          catatan: terkirim ?? undefined,
        });
        onResult({
          nama: "upload gambar: sisip <img src=url> (bukan base64)",
          lolos:
            !!img &&
            img.getAttribute("src") === "https://cdn.test/uploads/gambar.webp",
          catatan: img?.outerHTML,
        });

        // Kasus gagal: tipe salah & ukuran kebesaran — ditolak di klien,
        // tidak boleh memanggil endpoint.
        const salah = new File(["x"], "anim.gif", { type: "image/gif" });
        const dt2 = new DataTransfer();
        dt2.items.add(salah);
        input.files = dt2.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));

        setTimeout(() => {
          const pesan = document.querySelector(
            ".artikel-editor-wrap p[role=alert]",
          )?.textContent;
          onResult({
            nama: "upload gambar: file gif ditolak di klien",
            lolos: !!pesan && pesan.includes("tidak didukung"),
            catatan: pesan,
          });

          const besar = new File(
            [new Uint8Array(3 * 1024 * 1024)],
            "besar.png",
            { type: "image/png" },
          );
          const dt3 = new DataTransfer();
          dt3.items.add(besar);
          input.files = dt3.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));

          setTimeout(() => {
            const pesan2 = document.querySelector(
              ".artikel-editor-wrap p[role=alert]",
            )?.textContent;
            onResult({
              nama: "upload gambar: file >2 MB ditolak di klien",
              lolos: !!pesan2 && pesan2.includes("terlalu besar"),
              catatan: pesan2,
            });
          }, 200);
        }, 200);
      }, 600);
    }, 400);
    return () => clearTimeout(timer);
  }, [onResult]);

  return (
    <div className="artikel-editor-wrap">
      <ArtikelEditor value={html} onChange={setHtml} />
      <p className="mt-2 text-xs text-muted-foreground">
        html state: <code className="font-mono">{html.length} karakter</code>
      </p>
    </div>
  );
}
