const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const { replaceManyToMany } = require("../utils/many-to-many");
const AppError = require("../utils/AppError");

/** Kosongkan nilai opsional menjadi NULL agar tidak bentrok dengan unique index. */
function normalizeOptional(value) {
  const s = value == null ? "" : String(value).trim();
  return s.length === 0 ? null : s;
}

/** Simpan relasi banyak-ke-banyak pada tabel pivot penyakit (replace semua baris). */
function replacePenyakitRelations(idPenyakit, { bagianTubuhIds, patogenIds }) {
  return Promise.all([
    replaceManyToMany({
      table: "penyakit_bagian_tubuh",
      parentColumn: "id_penyakit",
      childColumn: "id_bagian_tubuh",
      parentId: idPenyakit,
      childIds: bagianTubuhIds,
    }),
    replaceManyToMany({
      table: "penyakit_patogen",
      parentColumn: "id_penyakit",
      childColumn: "id_patogen",
      parentId: idPenyakit,
      childIds: patogenIds,
    }),
  ]);
}

const handleAdminListPenyakit = async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.nama, p.slug, p.ringkasan, p.thumbnail, p.tingkat_urgensi,
            p.id_sistem_tubuh, st.nama AS sistem_nama
     FROM penyakit p
     JOIN sistem_tubuh st ON st.id = p.id_sistem_tubuh
     ORDER BY p.nama`,
  );
  const penyakitList = rows.map((p) => ({
    id: p.id,
    nama: p.nama,
    slug: p.slug,
    ringkasan: p.ringkasan ?? "",
    thumbnail: p.thumbnail ?? "",
    tingkat_urgensi: p.tingkat_urgensi,
    id_sistem_tubuh: p.id_sistem_tubuh,
    sistem_tubuh_nama: p.sistem_nama ?? "",
  }));
  res.json({ penyakit: penyakitList });
};

const handleAdminCreatePenyakit = async (req, res) => {
  const {
    nama,
    slug,
    ringkasan,
    thumbnail,
    tingkat_urgensi,
    id_sistem_tubuh,
    code,
    bagian_tubuhIds,
    patogenIds,
  } = req.body;
  if (
    !nama ||
    !slug ||
    !tingkat_urgensi ||
    !id_sistem_tubuh ||
    !Array.isArray(bagian_tubuhIds)
  ) {
    throw new AppError(
      "nama, slug, tingkat_urgensi, id_sistem_tubuh, dan bagian_tubuhIds wajib diisi",
      400,
    );
  }

  const { rows } = await query(
    `INSERT INTO penyakit (nama, slug, ringkasan, thumbnail, tingkat_urgensi,
                           id_sistem_tubuh, code, dibuat_pada, diperbarui_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      nama,
      slug,
      normalizeOptional(ringkasan),
      normalizeOptional(thumbnail),
      tingkat_urgensi,
      id_sistem_tubuh,
      normalizeOptional(code),
    ],
  );
  const penyakitData = rows[0];
  if (!penyakitData) throw new AppError("Gagal membuat penyakit", 500);

  await replacePenyakitRelations(penyakitData.id, {
    bagianTubuhIds,
    patogenIds,
  });

  res.status(201).json({ penyakit: penyakitData });
};

const handleAdminUpdatePenyakit = async (req, res) => {
  const idPenyakit = validateId(req.params.idPenyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const {
    nama,
    slug,
    ringkasan,
    thumbnail,
    tingkat_urgensi,
    id_sistem_tubuh,
    code,
    bagian_tubuhIds,
    patogenIds,
  } = req.body;
  if (
    !nama ||
    !slug ||
    !tingkat_urgensi ||
    !id_sistem_tubuh ||
    !Array.isArray(bagian_tubuhIds)
  ) {
    throw new AppError(
      "nama, slug, tingkat_urgensi, id_sistem_tubuh, dan bagian_tubuhIds wajib diisi",
      400,
    );
  }

  await query(
    `UPDATE penyakit
     SET nama = $1, slug = $2, ringkasan = $3, thumbnail = $4,
         tingkat_urgensi = $5, id_sistem_tubuh = $6, code = $7,
         diperbarui_pada = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      nama,
      slug,
      normalizeOptional(ringkasan),
      normalizeOptional(thumbnail),
      tingkat_urgensi,
      id_sistem_tubuh,
      normalizeOptional(code),
      idPenyakit,
    ],
  );

  await replacePenyakitRelations(idPenyakit, {
    bagianTubuhIds,
    patogenIds,
  });

  const { rows } = await query(
    `SELECT id, nama, slug, ringkasan, thumbnail, tingkat_urgensi,
            id_sistem_tubuh, dibuat_pada, diperbarui_pada, code
     FROM penyakit
     WHERE id = $1
     LIMIT 1`,
    [idPenyakit],
  );
  const updatedData = rows[0];
  if (!updatedData) throw new AppError("id penyakit tidak valid", 400);

  res.json({ penyakit: updatedData });
};

module.exports = {
  handleAdminListPenyakit,
  handleAdminCreatePenyakit,
  handleAdminUpdatePenyakit,
};