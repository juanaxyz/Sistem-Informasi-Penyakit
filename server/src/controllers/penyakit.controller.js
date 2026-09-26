const { query } = require("../db/pg");
const { validateId, escapeLike } = require("../utils/validators");
const AppError = require("../utils/AppError");

const handleGetBagianTubuh = async (_req, res) => {
  const { rows } = await query(
    `SELECT id, nama, tampilan FROM bagian_tubuh ORDER BY id`,
  );
  res.json({ bagian_tubuh: rows });
};

const handleGetSistemTubuhByBody = async (req, res) => {
  const idBody = validateId(req.params.idBody);
  if (idBody === null) throw new AppError("id bagian tubuh tidak valid", 400);

  const { rows } = await query(
    `SELECT st.id, st.nama, COUNT(*)::int AS jumlah_penyakit
     FROM penyakit_bagian_tubuh pbt
     JOIN penyakit p ON p.id = pbt.id_penyakit
     JOIN sistem_tubuh st ON st.id = p.id_sistem_tubuh
     WHERE pbt.id_bagian_tubuh = $1
     GROUP BY st.id, st.nama
     ORDER BY st.nama`,
    [idBody],
  );
  res.json({ sistem_tubuh: rows });
};

const handleGetPenyakitBySystemAndBody = async (req, res) => {
  const idBody = validateId(req.params.idBody);
  const idSystem = validateId(req.params.idSystem);
  if (idBody === null || idSystem === null) throw new AppError("id tidak valid", 400);

  const { rows } = await query(
    `SELECT p.id, p.nama, p.slug, p.ringkasan, p.thumbnail, p.tingkat_urgensi,
            pbt.id_bagian_tubuh
     FROM penyakit p
     JOIN penyakit_bagian_tubuh pbt ON pbt.id_penyakit = p.id
     WHERE p.id_sistem_tubuh = $1 AND pbt.id_bagian_tubuh = $2
     ORDER BY p.nama`,
    [idSystem, idBody],
  );
  const penyakit = rows.map((r) => {
    const { id_bagian_tubuh, ...rest } = r;
    return { ...rest, penyakit_bagian_tubuh: [{ id_bagian_tubuh }] };
  });
  res.json({ penyakit });
};

const handleSearchPenyakit = async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ penyakit: [] });
  const pattern = `%${escapeLike(q)}%`;

  const { rows } = await query(
    `SELECT id, nama, slug, ringkasan, thumbnail, tingkat_urgensi
     FROM penyakit
     WHERE nama ILIKE $1 OR ringkasan ILIKE $1
     ORDER BY nama
     LIMIT 50`,
    [pattern],
  );
  res.json({ penyakit: rows });
};

const handleGetArtikelKonten = async (req, res) => {
  const idPenyakit = validateId(req.params.idPenyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const { rows } = await query(
    `SELECT id, konten FROM artikel WHERE id_penyakit = $1 ORDER BY id`,
    [idPenyakit],
  );
  res.json({ konten: rows });
};

const SELECT_DISEASE_COLUMNS = `
  p.id, p.id_sistem_tubuh, p.nama, p.slug, p.ringkasan, p.thumbnail,
  p.tingkat_urgensi, st.id AS sistem_id, st.nama AS sistem_nama
`;

const getDiseaseDetail = async (column, value) => {
  const allowed = { id: "p.id", slug: "p.slug" };
  const where = allowed[column];
  if (!where) throw new AppError("id atau slug penyakit tidak valid", 400);

  const { rows } = await query(
    `SELECT ${SELECT_DISEASE_COLUMNS}
     FROM penyakit p
     LEFT JOIN sistem_tubuh st ON st.id = p.id_sistem_tubuh
     WHERE ${where} = $1
     LIMIT 1`,
    [value],
  );
  return rows[0];
};

const handleGetPenyakitDetail = async (req, res) => {
  const raw = String(req.params.idOrSlug ?? "").trim();
  if (!raw) throw new AppError("id atau slug penyakit tidak valid", 400);

  const numericId = validateId(raw);
  const diseaseRow = numericId
    ? await getDiseaseDetail("id", numericId)
    : await getDiseaseDetail("slug", raw);
  if (!diseaseRow) throw new AppError("penyakit tidak ditemukan", 404);

  const idPenyakit = diseaseRow.id;

  const [artikelRes, bagianRes, referensiRes, patogenRes] = await Promise.all([
    query(
      `SELECT a.id, a.status, a.ditinjau_pada,
              ab.id AS bagian_id, ab.tipe, ab.judul, ab.urutan, ab.konten
       FROM artikel a
       LEFT JOIN artikel_bagian ab ON ab.id_artikel = a.id
       WHERE a.id_penyakit = $1
       ORDER BY a.id, ab.urutan`,
      [idPenyakit],
    ),
    query(
      `SELECT bt.id, bt.nama, bt.tampilan
       FROM penyakit_bagian_tubuh pbt
       JOIN bagian_tubuh bt ON bt.id = pbt.id_bagian_tubuh
       WHERE pbt.id_penyakit = $1
       ORDER BY bt.id`,
      [idPenyakit],
    ),
    query(
      `SELECT id, url FROM referensi WHERE id_penyakit = $1 ORDER BY id`,
      [idPenyakit],
    ),
    query(
      `SELECT pg.id, pg.nama, pg.jenis, pg.deskripsi
       FROM penyakit_patogen pp
       JOIN patogen pg ON pg.id = pp.id_patogen
       WHERE pp.id_penyakit = $1
       ORDER BY pg.nama`,
      [idPenyakit],
    ),
  ]);

  const artikelByArt = new Map();
  for (const row of artikelRes.rows) {
    if (!artikelByArt.has(row.id)) {
      artikelByArt.set(row.id, {
        id: row.id,
        status: row.status,
        ditinjau_pada: row.ditinjau_pada,
        bagian: [],
      });
    }
    if (row.bagian_id != null) {
      artikelByArt.get(row.id).bagian.push({
        id: row.bagian_id,
        tipe: row.tipe,
        judul: row.judul,
        urutan: row.urutan,
        konten: row.konten,
      });
    }
  }
  const artikel = [...artikelByArt.values()];

  const bagian_tubuh = bagianRes.rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    tampilan: r.tampilan,
  }));

  const referensi = referensiRes.rows.map((r) => ({ id: r.id, url: r.url }));

  const patogen = patogenRes.rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    jenis: r.jenis,
    deskripsi: r.deskripsi,
  }));

  const {
    sistem_id,
    sistem_nama,
    ...diseaseFields
  } = diseaseRow;

  res.json({
    penyakit: {
      ...diseaseFields,
      sistem_tubuh: sistem_id != null ? { id: sistem_id, nama: sistem_nama } : null,
      artikel,
      bagian_tubuh,
      referensi,
      patogen,
    },
  });
};

const handleGetPenyakitBySlug = async (req, res) => {
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) throw new AppError("slug penyakit tidak valid", 400);
  req.params.idOrSlug = slug;
  return handleGetPenyakitDetail(req, res);
};

module.exports = {
  handleGetBagianTubuh,
  handleGetSistemTubuhByBody,
  handleGetPenyakitBySystemAndBody,
  handleSearchPenyakit,
  handleGetArtikelKonten,
  handleGetPenyakitDetail,
  handleGetPenyakitBySlug,
};