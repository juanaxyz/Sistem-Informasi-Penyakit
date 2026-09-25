const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const AppError = require("../utils/AppError");

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
      ringkasan ?? null,
      thumbnail ?? null,
      tingkat_urgensi,
      id_sistem_tubuh,
      code ?? null,
    ],
  );
  const penyakitData = rows[0];
  if (!penyakitData) throw new AppError("Gagal membuat penyakit", 500);

  if (bagian_tubuhIds.length > 0) {
    const params = [];
    const values = [];
    bagian_tubuhIds.forEach((id_b, i) => {
      params.push(`($1, $${i + 2})`);
      values.push(id_b);
    });
    await query(
      `INSERT INTO penyakit_bagian_tubuh (id_penyakit, id_bagian_tubuh)
       VALUES ${params.join(", ")}`,
      [penyakitData.id, ...values],
    );
  }

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
      ringkasan ?? null,
      thumbnail ?? null,
      tingkat_urgensi,
      id_sistem_tubuh,
      code ?? null,
      idPenyakit,
    ],
  );

  await query(`DELETE FROM penyakit_bagian_tubuh WHERE id_penyakit = $1`, [
    idPenyakit,
  ]);
  if (bagian_tubuhIds.length > 0) {
    const params = [];
    const values = [];
    bagian_tubuhIds.forEach((id_b, i) => {
      params.push(`($1, $${i + 2})`);
      values.push(id_b);
    });
    await query(
      `INSERT INTO penyakit_bagian_tubuh (id_penyakit, id_bagian_tubuh)
       VALUES ${params.join(", ")}`,
      [idPenyakit, ...values],
    );
  }

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