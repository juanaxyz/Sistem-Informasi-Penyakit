import DOMPurify from "dompurify";

/** Satu entri daftar isi (h2/h3 artikel). */
export type TocItem = {
  id: string;
  text: string;
  level: number;
};

/** Batas atas konten sesuai kontrak: 200 KB. */
export const MAKS_KONTEN = 200 * 1024;

/** Ukuran maksimum file gambar: 2 MB. */
export const MAKS_GAMBAR = 2 * 1024 * 1024;

export const GAMBAR_DIIZINKAN = ["image/jpeg", "image/png", "image/webp"];

/**
 * Tag & atribut yang diizinkan kontrak. Frontend cuma pertahanan berlapis:
 * backend tetap sumber kebenaran saat menyimpan.
 */
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "p", "br", "strong", "em", "u", "s",
  "ul", "ol", "li", "blockquote", "a", "img",
];
const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "id"];

let purifyConfigured = false;

function configurePurify() {
  if (purifyConfigured || typeof window === "undefined") return;
  purifyConfigured = true;
  // <a target="_blank"> wajib rel noopener; Quill sudah menambahkannya saat
  // membuat link, ini menutup celah dari HTML hasil paste/manual.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/**
 * Sanitasi HTML artikel untuk dirender aman di halaman publik. Sekaligus
 * memberi id anchor pada <h2>/<h3> untuk daftar isi.
 *
 * ponytail: DOMParser + innerHTML dipakai karena struktur heading hasil
 * Quill bisa diberi id sebelum sanitize; jika nanti butuh keterangan gambar
 * (<figcaption>) atau tabel, tambahkan ke ALLOWED_TAGS saat backend membuka.
 */
export function sanitizeArtikelHtml(raw: string): { html: string; toc: TocItem[] } {
  configurePurify();
  const html = sanitize.assignHeadingIds(raw);
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
  return { html: sanitized, toc: extractToc(sanitized) };
}

const sanitize = {
  /** Beri id anchor pada h2/h3, dedupe nama ganda. */
  assignHeadingIds(raw: string): string {
    if (typeof window === "undefined" || !raw) return raw ?? "";
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const used = new Set<string>();
    doc.querySelectorAll("h1, h2, h3").forEach((el) => {
      const id = uniqueAnchor(slugifyAnchor(el.textContent ?? ""), used);
      el.id = id;
    });
    return doc.body.innerHTML;
  },
};

/** Slug id anchor: huruf kecil, spasi jadi tanda hubung, buang selain [a-z0-9-]. */
export function slugifyAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function uniqueAnchor(base: string, used: Set<string>): string {
  let id = base || "bagian";
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** Ekstrak daftar isi dari <h2>/<h3> HTML (sudah ber-id). */
export function extractToc(html: string): TocItem[] {
  const re = /<h([23])\s+id="([^"]*)"[^>]*>(.*?)<\/h\1>/gis;
  const toc: TocItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[3].replace(/<[^>]*>/g, "").trim();
    if (text) toc.push({ id: m[2], text, level: Number(m[1]) });
  }
  return toc;
}

const IMG_DENGAN_SRC = /<img\s[^>]*src\s*=/i;
const LINK_DENGAN_HREF = /<a\s[^>]*href\s*=/i;

/**
 * Editor kosong: string kosong atau hanya whitespace/<br>/<p> tanpa teks.
 * "<p><br></p>" adalah output Quill untuk dokumen kosong. Gambar tetap dihitung
 * sebagai konten.
 */
export function isEmptyKonten(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, "").replace(/\s|&nbsp;/g, "");
  return (
    text.length === 0 &&
    !IMG_DENGAN_SRC.test(html) &&
    !LINK_DENGAN_HREF.test(html)
  );
}

/** Validasi klien untuk file gambar sebelum diunggah. */
export function validateImageFile(
  file: { type: string; size: number },
): string | null {
  if (!GAMBAR_DIIZINKAN.includes(file.type))
    return "Tipe file tidak didukung. Hanya JPG, PNG, atau WebP.";
  if (file.size > MAKS_GAMBAR)
    return `Ukuran file terlalu besar (maksimal 2 MB, file ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  return null;
}
