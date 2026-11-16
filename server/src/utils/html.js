const sanitizeHtml = require("sanitize-html");

/**
 * Allowlist HTML konten artikel hasil editor Quill.
 *
 * Apapun di luar daftar dibuang sebelum masuk DB. `exclusiveFilter` memaksa
 * <img> hanya boleh dari server sendiri (`/uploads/...`) agar pelacak
 * eksternal tidak bisa ditanam lewat konten. `data-list` pada <li> dipertahankan
 * supaya list bersarang Quill tetap utuh saat dibuka ulang di editor.
 */
const SANITIZE_OPTIONS = {
  allowedTags: [
    "p",
    "br",
    "h1",
    "h2",
    "h3",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "ol",
    "ul",
    "li",
    "a",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title"],
    li: ["data-list", "data-value"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, rel: "noopener noreferrer" },
    }),
  },
  exclusiveFilter: (frame) =>
    frame.tag === "img" && !(frame.attribs.src || "").startsWith("/uploads/"),
};

/**
 * Sanitasi HTML konten masuk dari admin. Null/undefined dibaca sebagai string
 * kosong agar kolom NOT tidak pernah menerima `undefined`.
 */
function sanitizeKonten(html) {
  return sanitizeHtml(String(html ?? ""), SANITIZE_OPTIONS);
}

module.exports = { sanitizeKonten };
