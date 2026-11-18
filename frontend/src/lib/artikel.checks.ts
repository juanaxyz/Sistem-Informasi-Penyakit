/**
 * Pengecekan mandiri untuk logika artikel (tanpa framework test).
 * Jalankan: `node src/lib/artikel.checks.ts`
 *
 * DOMPurify + render HTML dites di halaman /checks (butuh DOM browser).
 */
import {
  isEmptyKonten,
  validateImageFile,
  slugifyAnchor,
  extractToc,
  MAKS_GAMBAR,
  MAKS_KONTEN,
} from "./artikel.ts";

declare const process: { exit(code: number): void };

let failed = 0;
function check(name: string, cond: boolean, note = "") {
  if (!cond) failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${note ? ` — ${note}` : ""}`);
}

// --- isEmptyKonten: Quill kosong = "<p><br></p>" ---
check('"<p><br></p>" dianggap kosong', isEmptyKonten("<p><br></p>"));
check('"<p></p>" dianggap kosong', isEmptyKonten("<p></p>"));
check('"" dianggap kosong', isEmptyKonten(""));
check('null dianggap kosong', isEmptyKonten(null));
check("whitespace saja dianggap kosong", isEmptyKonten("<p>   <br>&nbsp;</p>"));
check("teks tidak kosong", !isEmptyKonten("<p>Demam</p>"));
check("img saja tidak kosong", !isEmptyKonten('<p><img src="https://a.test/x.webp"></p>'));

// --- validateImageFile ---
check(
  "png 1 MB lolos",
  validateImageFile({ type: "image/png", size: 1024 * 1024 }) === null,
);
check(
  "webp lolos",
  validateImageFile({ type: "image/webp", size: 100 }) === null,
);
check(
  "jpg lolos",
  validateImageFile({ type: "image/jpeg", size: 100 }) === null,
);
const salahTipe = validateImageFile({ type: "image/gif", size: 100 });
check(
  "gif ditolak",
  salahTipe !== null && salahTipe.includes("tidak didukung"),
  salahTipe ?? "",
);
const kebesaran = validateImageFile({ type: "image/png", size: MAKS_GAMBAR + 1 });
check(
  ">2 MB ditolak",
  kebesaran !== null && kebesaran.includes("terlalu besar"),
  kebesaran ?? "",
);
check("tepat 2 MB lolos", validateImageFile({ type: "image/png", size: MAKS_GAMBAR }) === null);

// --- batas kontrak ---
check("MAKS_KONTEN 200 KB", MAKS_KONTEN === 200 * 1024);
check("MAKS_GAMBAR 2 MB", MAKS_GAMBAR === 2 * 1024 * 1024);

// --- slug & TOC (id harus sama dengan yang ditanam sanitizeArtikelHtml) ---
check(
  "slugify sederhana",
  slugifyAnchor("Gejala & Tanda!") === "gejala-tanda",
);
const toc = extractToc(
  '<h2 id="gejala">Gejala</h2><p>x</p><h3 id="demam">Demam</h3>',
);
check(
  "TOC 2 item level benar",
  toc.length === 2 && toc[0].level === 2 && toc[0].id === "gejala" &&
    toc[1].level === 3 && toc[1].id === "demam",
  JSON.stringify(toc),
);
check("TOC abaikan heading tanpa id", extractToc("<h2>tanpa id</h2>").length === 0);

console.log(failed === 0 ? "\nSEMUA CHECKS LULUS" : `\n${failed} CHECKS GAGAL`);
process.exit(failed === 0 ? 0 : 1);
