const fs = require("fs");
const path = require("path");
const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const AppError = require("../utils/AppError");
const config = require("../config");

const clampConfidence = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(Math.min(1, Math.max(0, num)) * 10000) / 10000;
};

// Alias label model (Inggris/umum) -> nama penyakit di basis data. Nama
// penyakit yang sudah sama tidak perlu didaftarkan di sini.
const PENYAKIT_ALIASES = {
  tb: "Tuberkulosis",
  tbc: "Tuberkulosis",
  tuberculosis: "Tuberkulosis",
  covid: "COVID-19",
  covid19: "COVID-19",
  "covid-19": "COVID-19",
  mass: "Massa Paru",
  masse: "Massa Paru",
  nodule: "Nodul Paru",
  pneumonia: "Pneumonia",
  "lung opacity": "Lung Opacity",
  opacity: "Lung Opacity",
};

// Pastikan baris model ada di tabel `model` (auto-sync dari respons model API).
const ensureModelId = async (namaModel, versi) => {
  const model = String(namaModel ?? "").trim();
  const versiModel = String(versi ?? "").trim();
  if (!model) return null;

  const { rows: existing } = await query(
    `SELECT id FROM model
     WHERE LOWER(nama_model) = LOWER($1) AND LOWER(versi) = LOWER($2)
     LIMIT 1`,
    [model, versiModel],
  );
  if (existing[0]) return existing[0].id;

  const { rows: inserted } = await query(
    `INSERT INTO model (nama_model, versi, is_active)
     VALUES ($1, $2, TRUE)
     RETURNING id`,
    [model, versiModel],
  );
  if (!inserted[0]) throw new AppError("Gagal menyimpan model", 500);
  return inserted[0].id;
};

// Petakan label hasil model ke `penyakit`. Mengembalikan null bila tidak ada
// kecocokan (mis. label "Normal" yang memang bukan penyakit).
const resolvePenyakitId = async (label) => {
  const match = String(label ?? "").trim();
  if (!match) return null;
  const candidate = PENYAKIT_ALIASES[match.toLowerCase()] || match;
  const { rows } = await query(
    `SELECT id FROM penyakit
     WHERE LOWER(code) = LOWER($1) OR LOWER(nama) = LOWER($2)
     LIMIT 1`,
    [match, candidate],
  );
  return rows[0]?.id ?? null;
};

const getRiwayatFile = (riwayat) => {
  const fileName = path.basename(riwayat.gambar);
  const filePath = path.join(config.uploadsDir, fileName);
  if (!fs.existsSync(filePath)) return null;
  return { filePath, name: fileName };
};

const handleCreateRiwayat = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  if (!req.file) throw new AppError("gambar wajib diisi (form-data, field 'gambar')", 400);

  const gambar = `/uploads/${req.file.filename}`;
  const { rows } = await query(
    `INSERT INTO riwayat (user_id, gambar, status)
     VALUES ($1, $2, 'processing')
     RETURNING id, status`,
    [user.id, gambar],
  );
  const riwayat = rows[0];
  if (!riwayat) throw new AppError("Gagal membuat riwayat", 500);
  res.status(201).json({ id: riwayat.id, status: riwayat.status });
};

const handleGetRiwayat = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const { rows } = await query(
    `SELECT id, user_id, gambar, status, dibuat_pada, diperbarui_pada
     FROM riwayat
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT $2 OFFSET $3`,
    [user.id, limit, offset],
  );
  res.json({ riwayat: rows });
};

const handleGetRiwayatDetail = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  const id = validateId(req.params.id);
  if (id === null) throw new AppError("ID riwayat tidak valid", 400);

  const { rows } = await query(
    `SELECT id, user_id, gambar, status, dibuat_pada, diperbarui_pada
     FROM riwayat
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  const riwayat = rows[0];
  if (!riwayat) throw new AppError("Riwayat tidak ditemukan", 404);
  if (riwayat.user_id !== user.id && user.role !== "admin") {
    throw new AppError("Tidak diizinkan mengakses riwayat ini", 403);
  }

  const { rows: predictionRows } = await query(
    `SELECT pr.id,
            m.nama_model AS model,
            m.versi AS versi,
            p.nama AS penyakit,
            p.code AS kode,
            pr.confidence::float8 AS confidence
     FROM prediksi pr
     JOIN model m ON m.id = pr.model_id
     JOIN penyakit p ON p.id = pr.id_penyakit
     WHERE pr.riwayat_id = $1
     ORDER BY pr.id`,
    [id],
  );
  res.json({ riwayat: { ...riwayat, predictions: predictionRows } });
};

const handleRunAnalisis = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  const id = validateId(req.params.id);
  if (id === null) throw new AppError("ID riwayat tidak valid", 400);

  const { rows: riwayatRows } = await query(
    `SELECT id, user_id, gambar, status FROM riwayat WHERE id = $1 LIMIT 1`,
    [id],
  );
  const riwayat = riwayatRows[0];
  if (!riwayat) throw new AppError("Riwayat tidak ditemukan", 404);
  if (riwayat.user_id !== user.id && user.role !== "admin") {
    throw new AppError("Tidak diizinkan menganalisis riwayat ini", 403);
  }
  if (riwayat.status !== "processing") {
    throw new AppError("Riwayat belum dalam status processing", 400);
  }

  const file = getRiwayatFile(riwayat);
  if (!file) throw new AppError("File gambar riwayat tidak ditemukan", 400);
  const bytes = fs.readFileSync(file.filePath);

  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "application/octet-stream" }), file.name);

  let mlData;
  try {
    const mlRes = await fetch(`${config.modelApiUrl}/api/prediksi`, {
      method: "POST",
      body: form,
    });
    mlData = await mlRes.json().catch(() => null);
    if (!mlRes.ok) {
      throw new AppError(mlData?.detail ?? mlData?.error ?? "Model API error", 500);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Model API tidak dapat dijangkau (${config.modelApiUrl}): ${err.message}`, 500);
  }

  const predictions = Array.isArray(mlData?.predictions) ? mlData.predictions : [];
  if (predictions.length === 0) {
    throw new AppError("Model API tidak mengembalikan prediksi", 500);
  }

  for (const pred of predictions) {
    const modelId = await ensureModelId(pred?.nama_model, pred?.versi);
    if (modelId === null) continue;
    const penyakitId = await resolvePenyakitId(pred?.label);
    if (penyakitId === null) continue;
    await query(
      `INSERT INTO prediksi (riwayat_id, model_id, id_penyakit, confidence)
       VALUES ($1, $2, $3, $4)`,
      [id, modelId, penyakitId, clampConfidence(pred?.confidence)],
    );
  }

  await query(
    `UPDATE riwayat SET status = $2, diperbarui_pada = CURRENT_TIMESTAMP WHERE id = $1`,
    [id, "completed"],
  );

  const { rows: finalRows } = await query(
    `SELECT id, user_id, gambar, status, dibuat_pada, diperbarui_pada
     FROM riwayat WHERE id = $1 LIMIT 1`,
    [id],
  );
  const finalRiwayat = finalRows[0];
  if (!finalRiwayat) {
    throw new AppError("Gagal mendapatkan riwayat setelah analisis", 500);
  }
  res.json({ riwayat: finalRiwayat });
};

module.exports = {
  handleCreateRiwayat,
  handleGetRiwayat,
  handleGetRiwayatDetail,
  handleRunAnalisis,
};