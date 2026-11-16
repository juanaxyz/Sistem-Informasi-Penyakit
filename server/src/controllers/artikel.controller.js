const { query } = require("../db/pg");
const { validateId } = require("../utils/validators");
const AppError = require("../utils/AppError");

const handleGetArtikelList = async (_req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.id_penyakit, p.nama AS penyakit_nama,
            ab.id AS first_bagian_id, ab.judul, ab.konten
     FROM artikel a
     JOIN penyakit p ON p.id = a.id_penyakit
     LEFT JOIN LATERAL (
       SELECT id, judul, konten
       FROM artikel_bagian
       WHERE id_artikel = a.id
       ORDER BY urutan ASC
       LIMIT 1
     ) ab ON TRUE
     ORDER BY a.id_penyakit, a.id`,
  );
  const artikelList = rows.map((a) => ({
    id: a.id,
    id_penyakit: a.id_penyakit,
    judul: a.judul ?? "",
    konten: a.konten ?? "",
    penyakit_nama: a.penyakit_nama ?? "",
    firstBagianId: a.first_bagian_id ?? null,
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
     RETURNING id, id_penyakit, status, dibuat_pada`,
    [idPenyakit],
  );
  const artikel = rows[0];

  res.status(201).json({
    artikel: {
      id: artikel.id,
      id_penyakit: artikel.id_penyakit,
      judul: "",
      konten: "",
      penyakit_nama: penyakit.nama,
    },
  });
};

const handleUpdateArtikel = async (req, res) => {
  const idArtikel = validateId(req.params.idArtikel);
  if (idArtikel === null) throw new AppError("id artikel tidak valid", 400);
  const { konten } = req.body;
  if (konten === undefined) throw new AppError("konten harus disediakan", 400);

  await query(
    `WITH first_bagian AS (
       SELECT id FROM artikel_bagian
       WHERE id_artikel = $1
       ORDER BY urutan ASC
       LIMIT 1
     )
     UPDATE artikel_bagian ab
     SET konten = $2, diperbarui_pada = CURRENT_TIMESTAMP
     FROM first_bagian fb
     WHERE ab.id = fb.id`,
    [idArtikel, konten],
  );

  const { rows } = await query(
    `SELECT a.id, a.id_penyakit, p.nama AS penyakit_nama,
            ab.judul, ab.konten
     FROM artikel a
     JOIN penyakit p ON p.id = a.id_penyakit
     LEFT JOIN artikel_bagian ab ON ab.id_artikel = a.id
     WHERE a.id = $1
     ORDER BY ab.urutan ASC
     LIMIT 1`,
    [idArtikel],
  );
  const artikelData = rows[0];
  if (!artikelData) throw new AppError("id artikel tidak valid", 400);

  const updatedArtikel = {
    id: artikelData.id,
    id_penyakit: artikelData.id_penyakit,
    judul: artikelData.judul ?? "",
    konten: artikelData.konten ?? "",
    penyakit_nama: artikelData.penyakit_nama ?? "",
  };
  res.json({ artikel: updatedArtikel });
};

const handleGetArtikelBagian = async (req, res) => {
  const idArtikel = validateId(req.params.idArtikel);
  if (idArtikel === null) throw new AppError("id artikel tidak valid", 400);

  const { rows } = await query(
    `SELECT id, id_artikel, tipe, judul, konten, urutan, dibuat_pada, diperbarui_pada
     FROM artikel_bagian
     WHERE id_artikel = $1
     ORDER BY urutan ASC`,
    [idArtikel],
  );
  res.json({ bagian: rows });
};

const handleSaveArtikelBagian = async (req, res) => {
  const idArtikel = validateId(req.params.idArtikel);
  if (idArtikel === null) throw new AppError("id artikel tidak valid", 400);
  const { bagian } = req.body;
  if (!Array.isArray(bagian)) throw new AppError("bagian harus berupa array", 400);

  const { rows: currentRows } = await query(
    `SELECT id FROM artikel_bagian WHERE id_artikel = $1`,
    [idArtikel],
  );
  const currentIds = currentRows.map((b) => b.id);
  const updatedIds = [];

  for (let i = 0; i < bagian.length; i++) {
    const b = bagian[i];
    const urutan = b.urutan ?? i + 1;
    const judul = b.judul ?? null;
    const konten = b.konten ?? "";
    const tipe = b.tipe ?? "lainnya";

    if (b.id && currentIds.includes(b.id)) {
      await query(
        `UPDATE artikel_bagian
         SET judul = $1, konten = $2, tipe = $3, urutan = $4,
             diperbarui_pada = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [judul, konten, tipe, urutan, b.id],
      );
      updatedIds.push(b.id);
    } else {
      const { rows } = await query(
        `INSERT INTO artikel_bagian (id_artikel, judul, konten, tipe, urutan)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [idArtikel, judul, konten, tipe, urutan],
      );
      if (rows[0]) updatedIds.push(rows[0].id);
    }
  }

  const toDeleteIds = currentIds.filter((id) => !updatedIds.includes(id));
  if (toDeleteIds.length > 0) {
    await query(`DELETE FROM artikel_bagian WHERE id = ANY($1::int[])`, [
      toDeleteIds,
    ]);
  }

  const { rows: finalRows } = await query(
    `SELECT id, id_artikel, tipe, judul, konten, urutan, dibuat_pada, diperbarui_pada
     FROM artikel_bagian
     WHERE id_artikel = $1
     ORDER BY urutan ASC`,
    [idArtikel],
  );
  res.json({ bagian: finalRows });
};

module.exports = {
  handleGetArtikelList,
  handleCreateArtikel,
  handleUpdateArtikel,
  handleGetArtikelBagian,
  handleSaveArtikelBagian,
};