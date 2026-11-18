"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Client } = require("pg");
const { sanitizeArtikelHtml, htmlToPlainText } = require("../src/utils/html");

const pgConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "capstone_paru",
};

function cleanMarkdownInHtml(html) {
  if (!html) return html;

  let res = html;

  // 1. Ubah <p># Judul</p>, <p>## Judul</p>, <p>### Judul</p>
  res = res.replace(/<p>\s*###\s+(.*?)<\/p>/gi, "<h3>$1</h3>");
  res = res.replace(/<p>\s*##\s+(.*?)<\/p>/gi, "<h2>$1</h2>");
  res = res.replace(/<p>\s*#\s+(.*?)<\/p>/gi, "<h2>$1</h2>");

  // 2. Ubah bold **text** dan italic _text_
  res = res.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  res = res.replace(/_([^_]+)_/g, "<em>$1</em>");

  // 3. Ubah blockquote: <p>&gt; ...</p> atau <p>> ...</p>
  res = res.replace(
    /<p>\s*(?:&gt;|>)\s*(.*?)<\/p>/gi,
    "<blockquote><p>$1</p></blockquote>",
  );

  // 4. Ubah serangkaian <p>- item</p> menjadi <ul><li>item</li></ul>
  res = res.replace(/((?:<p>\s*-\s+.*?<\/p>\s*)+)/gi, (match) => {
    const rawItems = match.match(/<p>\s*-\s+(.*?)<\/p>/gi) || [];
    const items = rawItems
      .map((item) => item.replace(/<p>\s*-\s+(.*?)<\/p>/i, "<li>$1</li>"))
      .join("");
    return `<ul>${items}</ul>`;
  });

  return res;
}

async function run() {
  const client = new Client(pgConfig);
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, id_penyakit, konten FROM artikel WHERE konten IS NOT NULL AND TRIM(konten) <> ''`,
  );

  console.log(`Memproses ${rows.length} artikel...`);

  let count = 0;
  for (const row of rows) {
    const cleaned = cleanMarkdownInHtml(row.konten);
    if (cleaned !== row.konten) {
      const sanitized = sanitizeArtikelHtml(cleaned);
      const plainText = htmlToPlainText(sanitized);

      await client.query(
        `UPDATE artikel SET konten = $1, konten_teks = $2, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = $3`,
        [sanitized, plainText, row.id],
      );
      count++;
      console.log(`✓ Artikel ID ${row.id} berhasil dirapikan`);
    }
  }

  console.log(`Selesai! ${count} artikel telah diperbarui dan dirapikan.`);
  await client.end();
}

run().catch((err) => {
  console.error("Gagal merapikan artikel:", err);
  process.exit(1);
});
