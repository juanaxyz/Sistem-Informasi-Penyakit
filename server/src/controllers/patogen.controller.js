const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const { replaceManyToMany } = require("../utils/many-to-many");
const AppError = require("../utils/AppError");

const handleListPatogen = async (_req, res) => {
  const { rows } = await query(
    `SELECT pg.id, pg.nama, pg.jenis, pg.deskripsi,
            COUNT(pp.id_penyakit)::int AS jumlah_penyakit
     FROM patogen pg
     LEFT JOIN penyakit_patogen pp ON pp.id_patogen = pg.id
     GROUP BY pg.id
     ORDER BY pg.nama`,
  );
  res.json({ patogen: rows });
};

const handleGetPatogenDetail = async (req, res) => {
  const idPatogen = validateId(req.params.idPatogen);
  if (idPatogen === null) throw new AppError("id patogen tidak valid", 400);

  const { rows: patogenRows } = await query(
    `SELECT pg.id, pg.nama, pg.jenis, pg.deskripsi,
            COUNT(pp.id_penyakit)::int AS jumlah_penyakit
     FROM patogen pg
     LEFT JOIN penyakit_patogen pp ON pp.id_patogen = pg.id
     WHERE pg.id = $1
     GROUP BY pg.id
     LIMIT 1`,
    [idPatogen],
  );
  const patogen = patogenRows[0];
  if (!patogen) throw new AppError("patogen tidak ditemukan", 404);

  const { rows: penyakitRows } = await query(
    `SELECT p.id, p.nama, p.slug, p.ringkasan, p.thumbnail, p.tingkat_urgensi
     FROM penyakit_patogen pp
     JOIN penyakit p ON p.id = pp.id_penyakit
     WHERE pp.id_patogen = $1
     ORDER BY p.nama`,
    [idPatogen],
  );

  res.json({ patogen: { ...patogen, penyakit: penyakitRows } });
};

/** Simpan relasi many-to-many patogen <-> penyakit (replace semua baris). */
function replaceDiseaseRelations(idPatogen, penyakitIds) {
  return replaceManyToMany({
    table: "penyakit_patogen",
    parentColumn: "id_patogen",
    childColumn: "id_penyakit",
    parentId: idPatogen,
    childIds: penyakitIds,
  });
}

const handleCreatePatogen = async (req, res) => {
  const nama = String(req.body?.nama ?? "").trim();
  const jenis = String(req.body?.jenis ?? "").trim();
  const deskripsi = String(req.body?.deskripsi ?? "").trim();
  const penyakitIds = req.body?.penyakitIds;

  if (!nama || !jenis) {
    throw new AppError("nama dan jenis patogen wajib diisi", 400);
  }

  const { rows } = await query(
    `INSERT INTO patogen (nama, jenis, deskripsi)
     VALUES ($1, $2, $3)
     RETURNING id, nama, jenis, deskripsi`,
    [nama, jenis, deskripsi || null],
  );
  const patogenData = rows[0];

  await replaceDiseaseRelations(patogenData.id, penyakitIds);

  res.status(201).json({ patogen: patogenData });
};

const handleUpdatePatogen = async (req, res) => {
  const idPatogen = validateId(req.params.idPatogen);
  if (idPatogen === null) throw new AppError("id patogen tidak valid", 400);

  const { rows: currentRows } = await query(
    `SELECT id, nama, jenis, deskripsi FROM patogen WHERE id = $1 LIMIT 1`,
    [idPatogen],
  );
  const current = currentRows[0];
  if (!current) throw new AppError("patogen tidak ditemukan", 404);

  const nama = String(req.body?.nama ?? current.nama).trim();
  const jenis = String(req.body?.jenis ?? current.jenis).trim();
  const deskripsi = String(req.body?.deskripsi ?? current.deskripsi ?? "").trim();
  const penyakitIds = req.body?.penyakitIds;

  if (!nama || !jenis) {
    throw new AppError("nama dan jenis patogen wajib diisi", 400);
  }

  const { rows } = await query(
    `UPDATE patogen
     SET nama = $1, jenis = $2, deskripsi = $3, diperbarui_pada = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, nama, jenis, deskripsi`,
    [nama, jenis, deskripsi || null, idPatogen],
  );
  const patogenData = rows[0];

  if (Array.isArray(penyakitIds)) {
    await replaceDiseaseRelations(idPatogen, penyakitIds);
  }

  res.json({ patogen: patogenData });
};

const handleDeletePatogen = async (req, res) => {
  const idPatogen = validateId(req.params.idPatogen);
  if (idPatogen === null) throw new AppError("id patogen tidak valid", 400);

  await query(`DELETE FROM penyakit_patogen WHERE id_patogen = $1`, [idPatogen]);
  const { rowCount } = await query(`DELETE FROM patogen WHERE id = $1`, [
    idPatogen,
  ]);
  if (rowCount === 0) throw new AppError("patogen tidak ditemukan", 404);

  res.json({ message: "Patogen dihapus" });
};

module.exports = {
  handleListPatogen,
  handleGetPatogenDetail,
  handleCreatePatogen,
  handleUpdatePatogen,
  handleDeletePatogen,
};