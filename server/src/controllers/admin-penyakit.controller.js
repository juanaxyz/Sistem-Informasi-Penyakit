const { query } = require("../db/pg");
const { validateId, normalizeUrl } = require("../utils/validators");
const { replaceManyToMany } = require("../utils/many-to-many");
const AppError = require("../utils/AppError");

/** Batas jumlah referensi per penyakit agar payload tidak membengkak. */
const MAX_REFERENSI = 50;

/** Kosongkan nilai opsional menjadi NULL agar tidak bentrok dengan unique index. */
function normalizeOptional(value) {
  const s = value == null ? "" : String(value).trim();
  return s.length === 0 ? null : s;
}

/**
 * Bersihkan daftar URL referensi dari payload: buang entri kosong, normalisasi
 * ke bentuk kanonik, tolak yang tidak valid, dan hilangkan duplikat.
 * Nilai non-array diperlakukan sebagai daftar kosong.
 */
function parseReferensi(input) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  for (const raw of input) {
    const value = raw == null ? "" : String(raw).trim();
    if (value.length === 0) continue;
    // `normalizeUrl` mengembalikan null untuk nilai tidak valid maupun kelewat
    // panjang, jadi emptiness harus disaring lebih dulu seperti di atas.
    const url = normalizeUrl(value);
    if (url === null) {
      throw new AppError(`referensi tidak valid: ${value.slice(0, 200)}`, 400);
    }
    seen.add(url);
  }

  if (seen.size > MAX_REFERENSI) {
    throw new AppError(`maksimal ${MAX_REFERENSI} referensi per penyakit`, 400);
  }
  return [...seen];
}

/**
 * Simpan daftar referensi satu penyakit (replace semua baris).
 *
 * Berbeda dari pivot many-to-many, `referensi` adalah tabel anak satu-ke-banyak
 * dengan nilai berupa URL, jadi tidak memakai `replaceManyToMany`.
 * Tabel `referensi` tidak punya kolom `diperbarui_pada`, jadi pembaruan dilakukan
 * dengan menghapus lalu menyisipkan ulang.
 */
async function replacePenyakitReferences(idPenyakit, urls) {
  await query(`DELETE FROM referensi WHERE id_penyakit = $1`, [idPenyakit]);
  if (urls.length === 0) return;

  const placeholders = urls.map((_, i) => `($1, $${i + 2})`);
  // `dibuat_pada` sengaja tidak dicantumkan agar `DEFAULT CURRENT_TIMESTAMP`
  // yang dipakai. Kalau ikut ditulis, setiap tuple harus punya placeholder
  // tambahan dan mudah salah saat jumlah URL berubah-ubah.
  await query(
    `INSERT INTO referensi (id_penyakit, url)
     VALUES ${placeholders.join(", ")}`,
    [idPenyakit, ...urls],
  );
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
    referensi,
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
  const referensiUrls = parseReferensi(referensi);

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
    bagianTubuhIds: bagian_tubuhIds,
    patogenIds,
  });
  await replacePenyakitReferences(penyakitData.id, referensiUrls);

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
    referensi,
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
  // Hanya sentuh tabel referensi bila klien benar-benar mengirim array-nya,
  // supaya klien lama tidak ikut menghapus referensi yang sudah ada.
  const referensiUrls = Array.isArray(referensi)
    ? parseReferensi(referensi)
    : null;

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
    bagianTubuhIds: bagian_tubuhIds,
    patogenIds,
  });
  if (referensiUrls !== null) {
    await replacePenyakitReferences(idPenyakit, referensiUrls);
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

/**
 * Endpoint khusus referensi (`PUT /admin/penyakit/:id/referensi`).
 *
 * Dipisah dari `handleAdminUpdatePenyakit` karena form penyakit mewajibkan
 * `nama`, `slug`, `tingkat_urgensi`, `id_sistem_tubuh`, dan `bagian_tubuhIds`.
 * Referensi kini dikelola dari editor artikel, yang tidak memegang data penyakit
 * tersebut. Endpoint ini hanya menyentuh tabel `referensi` sehingga edit
 * sumber tidak pernah menimpa field penyakit lain.
 */
const handleAdminUpdateReferensi = async (req, res) => {
  const idPenyakit = validateId(req.params.idPenyakit);
  if (idPenyakit === null) throw new AppError("id penyakit tidak valid", 400);

  const { referensi } = req.body;
  if (!Array.isArray(referensi)) {
    throw new AppError("referensi harus berupa array URL", 400);
  }
  const urls = parseReferensi(referensi);

  const { rows } = await query(
    `SELECT 1 FROM penyakit WHERE id = $1 LIMIT 1`,
    [idPenyakit],
  );
  if (rows.length === 0) throw new AppError("id penyakit tidak valid", 400);

  await replacePenyakitReferences(idPenyakit, urls);
  res.json({ referensi: urls });
};

module.exports = {
  handleAdminUpdateReferensi,
  handleAdminListPenyakit,
  handleAdminCreatePenyakit,
  handleAdminUpdatePenyakit,
};