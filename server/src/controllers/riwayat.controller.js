const { query } = require("../db/pg");
const AppError = require("../utils/AppError");

const handleCreateRiwayat = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  const gambar = String(req.body?.gambar ?? "").trim();
  if (!gambar) throw new AppError("gambar wajib diisi", 400);

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
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID riwayat tidak valid", 400);

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
  res.json({ riwayat });
};

const handleRunAnalisis = async (req, res) => {
  const { user } = req;
  if (!user) throw new AppError("Authentication required", 401);
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID riwayat tidak valid", 400);

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

  const { rows: modelRows } = await query(
    `SELECT id, nama_model, versi FROM model WHERE is_active = TRUE ORDER BY id`,
  );
  const models = modelRows;
  if (models.length === 0) {
    throw new AppError("Tidak ada model aktif", 500);
  }

  const { rows: penyakitRows } = await query(
    `SELECT id, code, nama FROM penyakit ORDER BY code`,
  );
  const penyakitList = penyakitRows;
  if (penyakitList.length === 0) {
    throw new AppError("Tidak ada penyakit yang tersedia", 500);
  }

  // Simulasi deterministik: hash gambar -> indeks penyakit + confidence.
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  };
  const seed = hashString(riwayat.gambar);
  const predictions = [];
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const penyakitIndex =
      (((seed + i) % penyakitList.length) + penyakitList.length) %
      penyakitList.length;
    const penyakit = penyakitList[penyakitIndex];
    const confidence = Number(
      (0.7 + ((Math.abs(seed + i) % 1000) / 1000) * 0.29).toFixed(4),
    );
    const { rows } = await query(
      `INSERT INTO prediksi (riwayat_id, model_id, id_penyakit, confidence)
       VALUES ($1, $2, $3, $4)
       RETURNING id, confidence`,
      [id, model.id, penyakit.id, confidence],
    );
    const prediksi = rows[0];
    if (!prediksi) throw new AppError("Gagal membuat prediksi", 500);
    predictions.push({
      id: prediksi.id,
      model: model.nama_model,
      versi: model.versi,
      penyakit: penyakit.nama,
      kode: penyakit.code,
      confidence: prediksi.confidence,
    });
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