"use strict";

/**
 * Isi artikel penyakit dari file Markdown (workflow agent / CI).
 *
 * Pakai:
 *   node scripts/isi-artikel.js <file.md> --penyakit="Efusi Pleura" [--status=draft] [--dry-run]
 *
 * Kredensial admin (salah satu):
 *   --password=...           atau   ADMIN_PASSWORD=... di .env / lingkungan
 *   identifier default "admin", bisa diganti --identifier=...
 *
 * Alur:
 *   Markdown -> konversi HTML (subset Quill) -> POST /auth/login ->
 *   PUT /api/artikel/:idPenyakit -> server men-sanitasi + konten_teks +
 *   memicu re-embedding RAG otomatis (lihat artikel.controller.js).
 *
 * Target dasar API: http://127.0.0.1:4000 (PORT di .env), bisa diganti
 * lewat --base-url.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
}

const dryRun = args.includes("--dry-run");
const baseUrl = getArg("base-url", `http://127.0.0.1:${process.env.PORT || 4000}`);
const status = getArg("status", "draft");
const penyakitArg = getArg("penyakit", "");
const identifier = getArg("identifier", "admin");
const password = getArg("password", process.env.ADMIN_PASSWORD || "");

const mdFile = args.find((a) => !a.startsWith("--"));

// --- Konversi Markdown -> HTML (subset Quill: h1-h3, p, ul/ol, strong, em, blockquote)
function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let list = null; // {tag, items:[]}

  const flushList = () => {
    if (!list) return;
    out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushList();
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushList();
      out.push(`<h${h[1].length}>${inline(h[2].trim())}</h${h[1].length}>`);
      continue;
    }

    const quote = line.match(/^>\s*(.*)$/);
    if (quote) {
      flushList();
      out.push(`<blockquote><p>${inline(quote[1].trim())}</p></blockquote>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul || ol) {
      const item = (ul ?? ol)[1];
      const tag = ol ? "ol" : "ul";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(inline(item.trim()));
      continue;
    }

    flushList();
    out.push(`<p>${inline(line.trim())}</p>`);
  }
  flushList();
  return out.join("");
}

// --- Validasi ringan terhadap kontrak template (server/docs/artikel-template.md)
function validate(md) {
  const warnings = [];
  const plain = md.replace(/[#>*_`-]/g, "").replace(/\s+/g, " ").trim();
  const heads = [...md.matchAll(/^#{1,2}\s+(.+)$/gm)].map((m) => m[1].trim());

  if (!heads[0] || !heads[0].toLowerCase().startsWith("pengertian")) {
    warnings.push('seksi pertama harus "# Pengertian & Ringkasan"');
  }
  if (plain.length < 2000) warnings.push(`teks hanya ~${plain.length} karakter (target 2.000-10.000)`);
  if (plain.length > 12000) warnings.push(`teks ~${plain.length} karakter (melebihi target 10.000)`);
  const wajib = ["ejala", "enyebab", "engobatan", "encegahan", "okter"];
  const ok = wajib.filter((w) => heads.some((h) => h.toLowerCase().includes(w)));
  if (ok.length < 3) warnings.push(`hanya ${ok.length}/5 seksi wajib (Gejala/Penyebab/Pengobatan/Pencegahan/Kapan ke Dokter)`);
  if (/\[.*?\]\(http/.test(md)) warnings.push("ada link keluar — sumber seharusnya di tabel referensi");
  if (/!\[/.test(md)) warnings.push("ada gambar — unggah lewat /api/artikel/upload-gambar, bukan tempel di markdown");
  return warnings;
}

async function main() {
  if (!mdFile || !penyakitArg) {
    console.error('Penggunaan: node scripts/isi-artikel.js <file.md> --penyakit="<nama atau id>" [--status=draft] [--dry-run] [--password=...] [--identifier=admin] [--base-url=...]');
    process.exit(1);
  }
  if (!dryRun && !password) {
    console.error("Password admin wajib: --password=... atau ADMIN_PASSWORD di .env");
    process.exit(1);
  }

  const md = fs.readFileSync(mdFile, "utf8");
  const warnings = validate(md);
  for (const w of warnings) console.warn(`  ! ${w}`);

  const html = mdToHtml(md);
  if (dryRun) {
    console.log("\n--- HTML hasil konversi (dry-run) ---\n");
    console.log(html);
    console.log(`\n  panjang: ${html.length} byte`);
    return;
  }
  if (warnings.length && !process.env.FORCE) {
    console.error("\nAda validasi yang gagal. Perbaiki markdown, atau jalankan ulang dengan FORCE=1 untuk tetap menyimpan.");
    process.exit(1);
  }

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!loginRes.ok) {
    console.error(`Login gagal (${loginRes.status}): ${await loginRes.text()}`);
    process.exit(1);
  }
  const { token } = await loginRes.json();

  // id numerik dipakai langsung; selain itu cari nama penyakit via endpoint publik.
  let idPenyakit = /^\d+$/.test(penyakitArg) ? penyakitArg : null;
  if (!idPenyakit) {
    const cariRes = await fetch(`${baseUrl}/api/penyakit/cari?q=${encodeURIComponent(penyakitArg)}`);
    if (!cariRes.ok) {
      console.error(`Pencarian penyakit gagal (${cariRes.status}): ${await cariRes.text()}`);
      process.exit(1);
    }
    const { penyakit = [] } = await cariRes.json();
    const cocok = penyakit.find((p) => p.nama.toLowerCase() === penyakitArg.toLowerCase()) ?? penyakit[0];
    if (!cocok) {
      console.error(`Penyakit "${penyakitArg}" tidak ditemukan`);
      process.exit(1);
    }
    idPenyakit = String(cocok.id);
    console.log(`Penyakit ditemukan: ${cocok.nama} (id ${idPenyakit})`);
  }

  const putRes = await fetch(`${baseUrl}/api/artikel/${idPenyakit}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ konten: html, status }),
  });

  if (!putRes.ok) {
    console.error(`PUT artikel gagal (${putRes.status}): ${await putRes.text()}`);
    process.exit(1);
  }
  const body = await putRes.json();
  console.log(`\nOK: artikel ${body.id} tersimpan (status: ${status}, diperbarui ${body.diperbarui_pada})`);
  console.log("Re-embedding RAG dipicu otomatis oleh server (fire-and-forget).");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = { mdToHtml, validate };

