const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const {
  sanitizeArtikelHtml,
  htmlToPlainText,
  isEmptyArtikelHtml,
} = require("../utils/html");
const AppError = require("../utils/AppError");
const config = require("../config");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_KONTEN_BYTES = 200 * 1024;
const STATUS_ALLOWED = ["draft", "terbit"];

/**
 * Deteksi tipe gambar dari magic bytes buffer, bukan dari ekstensi nama file
 * atau header Content-Type (keduanya mudah dipalsukan).
 */
const IMAGE_SIGNATURES = [
  {
    ext: ".png",
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: ".jpg",
    match: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: ".webp",
    match: (b) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

const detectImageType = (buffer) =>
  IMAGE_SIGNATURES.find((sig) => sig.match(buffer)) ?? null;

/**
 * Picu re-embedding satu artikel di service Python. Dijalankan SETELAH
 * respons dikirim (fire-and-forget) agar PUT tidak lambat; kegagalan hanya
 * dicatat — admin tetap bisa sinkronisasi penuh lewat dashboard.
 */
const triggerReembed = (idArtikel) => {
  if (!config.ragAdminToken) {
    console.warn(
      "[artikel] RAG_ADMIN_TOKEN belum diatur, re-embedding dilewati",
    );
    return;
  }
  fetch(`${config.ragApiUrl}/api/ingest-article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Rag-Admin-Token": config.ragAdminToken,
    },
    body: JSON.stringify({ id_artikel: idArtikel }),
  }).catch((err) => {
    console.error(`[artikel] re-embedding artikel ${idArtikel} gagal:`, err.message);
  });
};

const handleGetArtikelList = async (_req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.id_penyakit, p.nama AS penyakit_nama, a.status,
            a.diperbarui_pada,
            LEFT(
              BTRIM(
                COALESCE(
                  NULLIF(BTRIM(a.konten_teks), ''),
                  -- Baris legacy yang belum di-backfill belum punya konten_teks;
                  -- strip tag sebagai jaring pengaman agar card tidak kosong.
                  regexp_replace(COALESCE(a.konten, ''), '<[^>]+>', ' ', 'g')
                )
              ),
              140
            ) AS ringkasan
     FROM artikel a
     JOIN penyakit p ON p.id = a.id_penyakit
     ORDER BY a.id_penyakit, a.id`,
  );
  const artikelList = rows.map((a) => ({
    id: a.id,
    id_penyakit: a.id_penyakit,
    status: a.status,
    penyakit_nama: a.penyakit_nama ?? "",
    diperbarui_pada: a.diperbarui_pada,
    // Cuplikan teks polos untuk kartu daftar; HTML penuh hanya lewat
    // GET /artikel/:idPenyakit agar payload daftar tetap ringan.
    ringkasan: a.ringkasan ?? "",
  }));
  res.json({ artikel: artikelList });
};

const handleCreateArtikel = async (req, res) => {
  const idPenyakit = validateId(req.body?.id_penyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const { rows: penyakitRows } = await query(
    `SELECT id, nama FROM penyakit WHERE id = $1 LIMIT 1`,
    [idPenyakit],
  );
  const penyakit = penyakitRows[0];
  if (!penyakit) throw new AppError("Penyakit tidak ditemukan", 404);

  const { rows: existing } = await query(
    `SELECT id FROM artikel WHERE id_penyakit = $1 LIMIT 1`,
    [idPenyakit],
  );
  if (existing[0]) {
    throw new AppError("Penyakit ini sudah memiliki artikel", 409);
  }

  const { rows } = await query(
    `INSERT INTO artikel (id_penyakit, status)
     VALUES ($1, 'draft')
     RETURNING id, id_penyakit, status, diperbarui_pada`,
    [idPenyakit],
  );
  const artikel = rows[0];

  res.status(201).json({
    artikel: {
      id: artikel.id,
      id_penyakit: artikel.id_penyakit,
      status: artikel.status,
      penyakit_nama: penyakit.nama,
    },
  });
};

const handleGetArtikelByPenyakit = async (req, res) => {
  const idPenyakit = validateId(req.params.idPenyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const { rows } = await query(
    `SELECT id, id_penyakit, status, konten, ditinjau_pada, diperbarui_pada
     FROM artikel
     WHERE id_penyakit = $1
     ORDER BY id DESC
     LIMIT 1`,
    [idPenyakit],
  );
  const artikel = rows[0];
  if (!artikel) throw new AppError("artikel untuk penyakit ini tidak ditemukan", 404);

  res.json(artikel);
};

const handleUpdateArtikelByPenyakit = async (req, res) => {
  const idPenyakit = validateId(req.params.idPenyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const { konten, status } = req.body ?? {};
  if (typeof konten !== "string") {
    throw new AppError("konten harus disediakan", 422, { field: "konten" });
  }
  if (
    status !== undefined &&
    (typeof status !== "string" || !STATUS_ALLOWED.includes(status))
  ) {
    throw new AppError(`status harus salah satu dari ${STATUS_ALLOWED.join(", ")}`, 422, {
      field: "status",
    });
  }

  if (Buffer.byteLength(konten, "utf8") > MAX_KONTEN_BYTES) {
    throw new AppError(
      `konten melebihi batas ${MAX_KONTEN_BYTES} byte`,
      422,
      { field: "konten" },
    );
  }

  const sanitized = sanitizeArtikelHtml(konten);
  if (isEmptyArtikelHtml(sanitized)) {
    throw new AppError("konten tidak boleh kosong", 422, { field: "konten" });
  }
  const kontenTeks = htmlToPlainText(sanitized);

  const { rows: penyakitRows } = await query(
    `SELECT id FROM penyakit WHERE id = $1 LIMIT 1`,
    [idPenyakit],
  );
  if (!penyakitRows[0]) throw new AppError("Penyakit tidak ditemukan", 404);

  const { rows: existing } = await query(
    `SELECT id FROM artikel WHERE id_penyakit = $1 ORDER BY id DESC LIMIT 1`,
    [idPenyakit],
  );

  let idArtikel;
  let diperbaruiPada;
  if (existing[0]) {
    idArtikel = existing[0].id;
    const { rows } = await query(
      `UPDATE artikel
       SET konten = $1, konten_teks = $2${status !== undefined ? ", status = $4" : ""},
           diperbarui_pada = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, diperbarui_pada`,
      status !== undefined
        ? [sanitized, kontenTeks, idArtikel, status]
        : [sanitized, kontenTeks, idArtikel],
    );
    diperbaruiPada = rows[0].diperbarui_pada;
  } else {
    const { rows } = await query(
      `INSERT INTO artikel (id_penyakit, status, konten, konten_teks)
       VALUES ($1, $2, $3, $4)
       RETURNING id, diperbarui_pada`,
      [idPenyakit, status ?? "draft", sanitized, kontenTeks],
    );
    idArtikel = rows[0].id;
    diperbaruiPada = rows[0].diperbarui_pada;
  }

  res.json({ id: idArtikel, konten: sanitized, diperbarui_pada: diperbaruiPada });
  triggerReembed(idArtikel);
};

/** Unggah gambar sisipan konten artikel (lihat routes/artikel.routes.js). */
const handleUploadGambar = async (req, res) => {
  if (!req.file) {
    throw new AppError("file gambar pada field 'gambar' wajib diunggah", 400);
  }

  // MIME dari header Content-Type mudah dipalsukan — verifikasi magic bytes
  // buffer sebelum file ditulis ke disk.
  const detected = detectImageType(req.file.buffer);
  if (!detected) {
    throw new AppError("format gambar tidak didukung (hanya jpg/png/webp)", 415);
  }

  const dir = path.join(config.uploadsDir, "artikel");
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}${detected.ext}`;
  await fs.promises.writeFile(path.join(dir, filename), req.file.buffer);

  res.status(201).json({
    url: `${config.publicBaseUrl}/uploads/artikel/${filename}`,
  });
};

module.exports = {
  handleGetArtikelList,
  handleCreateArtikel,
  handleGetArtikelByPenyakit,
  handleUpdateArtikelByPenyakit,
  handleUploadGambar,
};
