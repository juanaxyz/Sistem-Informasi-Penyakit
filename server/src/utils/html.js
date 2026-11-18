const sanitizeHtml = require("sanitize-html");
const { Parser } = require("htmlparser2");
const config = require("../config");

/**
 * Allowlist HTML konten artikel hasil editor Quill (kontrak API Opsi A).
 *
 * Apapun di luar daftar dibuang sebelum masuk DB. Heading utama hanya h2/h3
 * (h1 dilarang); <a> dipaksa target=_blank + rel=noopener noreferrer;
 * <img src> hanya boleh dari direktori upload kita sendiri agar pelacak
 * eksternal / data: URI tidak bisa ditanam lewat konten.
 */
const SANITIZE_OPTIONS = {
  allowedTags: [
    "h2",
    "h3",
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
  exclusiveFilter: (frame) =>
    frame.tag === "img" && !isAllowedImageSrc(frame.attribs.src),
};

/**
 * Hanya gambar dari server sendiri yang lolos:
 *   - skema http/https saja (menolak data: dan javascript:)
 *   - path harus diawali /uploads/
 *   - bila absolut, host harus sama dengan PUBLIC_BASE_URL
 */
function isAllowedImageSrc(src) {
  if (!src || typeof src !== "string") return false;
  if (src.trim().toLowerCase().startsWith("data:")) return false;
  try {
    const base = new URL(config.publicBaseUrl);
    const url = new URL(src, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.host !== base.host) return false;
    return url.pathname.startsWith("/uploads/");
  } catch {
    return false;
  }
}

/** Sanitasi HTML dari Quill. Null/undefined dibaca sebagai string kosong. */
function sanitizeArtikelHtml(html) {
  return sanitizeHtml(String(html ?? ""), SANITIZE_OPTIONS);
}

// Tag yang menutup baris saat dikonversi ke teks polos.
const BLOCK_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "blockquote",
  "div",
  "ul",
  "ol",
  "table",
  "tr",
  "br",
]);

// Isi tag ini dibuang sepenuhnya dari teks polos.
const SKIP_TAGS = new Set(["script", "style", "iframe", "noscript", "template"]);

/**
 * Konversi HTML konten ke teks polos untuk `artikel.konten_teks`.
 * h2/h3/p/li/br menjadi baris baru (li diawali "- "), tag lain dibuang,
 * entitas didekode, spasi berlebih dirapikan.
 */
function htmlToPlainText(html) {
  const lines = [];
  let current = [];
  let pendingLi = false;
  let skipDepth = 0;

  const flush = () => {
    const line = current.join("").replace(/\s+/g, " ").trim();
    current = [];
    pendingLi = false;
    if (line) lines.push(line);
  };

  const parser = new Parser(
    {
      onopentag(name) {
        if (SKIP_TAGS.has(name)) {
          skipDepth += 1;
          return;
        }
        if (name === "li") {
          flush();
          pendingLi = true;
        } else if (BLOCK_TAGS.has(name)) {
          flush();
        }
      },
      onclosetag(name) {
        if (SKIP_TAGS.has(name) && skipDepth > 0) {
          skipDepth -= 1;
          return;
        }
        if (BLOCK_TAGS.has(name)) flush();
      },
      ontext(text) {
        if (!text || skipDepth > 0) return;
        if (pendingLi && current.length === 0) {
          current.push("- ");
          pendingLi = false;
        }
        current.push(text);
      },
    },
    { decodeEntities: true },
  );

  parser.parseComplete(String(html ?? ""));
  flush();
  return lines.join("\n");
}

/**
 * HTML dianggap kosong bila teks polosnya kosong — menangani kasus editor
 * "kosong" seperti `<p><br></p>`.
 */
function isEmptyArtikelHtml(html) {
  return htmlToPlainText(html).trim() === "";
}

module.exports = {
  sanitizeArtikelHtml,
  htmlToPlainText,
  isEmptyArtikelHtml,
  isAllowedImageSrc,
};
