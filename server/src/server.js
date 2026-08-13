require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 4000;

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// CORS — origin dari env (pisahkan dengan koma), default mengikuti request origin.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins }));

// Bungkus handler: error apa pun (termasuk dari Supabase) → 500 JSON konsisten.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const validateId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Bagian tubuh untuk peta interaktif
app.get(
  "/api/bagian-tubuh",
  handle(async (_req, res) => {
    const { data, error } = await db
      .from("bagian_tubuh")
      .select("id, nama, slug, tampilan")
      .order("id", { ascending: true });
    if (error) throw error;

    res.json({ bagian_tubuh: data ?? [] });
  }),
);

// Sistem tubuh yang punya penyakit di satu bagian tubuh (dedup by id)
app.get(
  "/api/sistem-tubuh/byBody/:idBody",
  handle(async (req, res) => {
    const idBody = validateId(req.params.idBody);
    if (idBody === null) {
      return res.status(400).json({ error: "id bagian tubuh tidak valid" });
    }

    const { data, error } = await db
      .from("penyakit_bagian_tubuh")
      .select("penyakit!inner (sistem_tubuh!inner (*))")
      .eq("id_bagian_tubuh", idBody);
    if (error) throw error;

    const systemById = new Map();
    for (const item of data) {
      const system = item.penyakit.sistem_tubuh;
      const current = systemById.get(system.id);
      if (current) {
        current.jumlah_penyakit += 1;
      } else {
        systemById.set(system.id, { ...system, jumlah_penyakit: 1 });
      }
    }

    const sistemTubuh = [...systemById.values()];

    res.json({ sistem_tubuh: sistemTubuh });
  }),
);

// Penyakit di bagian tubuh + sistem tubuh sekaligus
app.get(
  "/api/penyakit/bySystemAndBody/:idBody/:idSystem",
  handle(async (req, res) => {
    const idBody = validateId(req.params.idBody);
    const idSystem = validateId(req.params.idSystem);
    if (idBody === null || idSystem === null) {
      return res.status(400).json({ error: "id tidak valid" });
    }

    const { data, error } = await db
      .from("penyakit")
      .select(
        "id, nama, slug, ringkasan, tingkat_urgensi, penyakit_bagian_tubuh!inner (id_bagian_tubuh)",
      )
      .eq("id_sistem_tubuh", idSystem)
      .eq("penyakit_bagian_tubuh.id_bagian_tubuh", idBody)
      .order("nama", { ascending: true });
    if (error) throw error;

    res.json({ penyakit: data ?? [] });
  }),
);

// Pencarian penyakit (nama/ringkasan, ILIKE) — `*` wildcard PostgREST diescape
// agar input user dicari literal. Hasil di-dedup, diurutkan, dibatasi 50.
const escapeLike = (input) => input.replace(/[\\*?%_]/g, "\\$&");

app.get(
  "/api/penyakit/cari",
  handle(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ penyakit: [] });

    const pattern = `*${escapeLike(q)}*`;

    const [namaRes, ringkasanRes] = await Promise.all([
      db
        .from("penyakit")
        .select("id, nama, slug, ringkasan, tingkat_urgensi")
        .ilike("nama", pattern),
      db
        .from("penyakit")
        .select("id, nama, slug, ringkasan, tingkat_urgensi")
        .ilike("ringkasan", pattern),
    ]);
    if (namaRes.error) throw namaRes.error;
    if (ringkasanRes.error) throw ringkasanRes.error;

    const byId = new Map();
    for (const row of [...(namaRes.data ?? []), ...(ringkasanRes.data ?? [])]) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }

    const penyakit = [...byId.values()]
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .slice(0, 50);

    res.json({ penyakit });
  }),
);

// Blok konten satu penyakit (ringkas — judul, isi, urutan)
app.get(
  "/api/penyakit/:idPenyakit/konten",
  handle(async (req, res) => {
    const idPenyakit = validateId(req.params.idPenyakit);
    if (idPenyakit === null) {
      return res.status(400).json({ error: "id penyakit tidak valid" });
    }

    const { data, error } = await db
      .from("konten_penyakit")
      .select("judul, isi, urutan")
      .eq("id_penyakit", idPenyakit)
      .eq("tampilkan", true)
      .order("urutan", { ascending: true });
    if (error) throw error;

    res.json({ konten: data ?? [] });
  }),
);

// Detail lengkap satu penyakit: header, sistem_tubuh, konten (+gambar),
// bagian_tubuh (relasi many-to-many), referensi.
app.get(
  "/api/penyakit/:idPenyakit",
  handle(async (req, res) => {
    const idPenyakit = validateId(req.params.idPenyakit);
    if (idPenyakit === null) {
      return res.status(400).json({ error: "id penyakit tidak valid" });
    }

    const [diseaseRes, kontenRes, bagianRes, referensiRes] = await Promise.all([
      db
        .from("penyakit")
        .select(
          "id, id_sistem_tubuh, nama, slug, ringkasan, tingkat_urgensi, sistem_tubuh (id, nama, slug, deskripsi)",
        )
        .eq("id", idPenyakit)
        .maybeSingle(),
      db
        .from("konten_penyakit")
        .select("id, judul, slug, isi, urutan, gambar_konten (id, url_gambar, caption, urutan)")
        .eq("id_penyakit", idPenyakit)
        .eq("tampilkan", true)
        .order("urutan", { ascending: true }),
      db
        .from("penyakit_bagian_tubuh")
        .select("bagian_tubuh (id, nama, slug, tampilan)")
        .eq("id_penyakit", idPenyakit)
        .order("id", { referencedTable: "bagian_tubuh" }),
      db
        .from("referensi")
        .select("id, judul, sumber, url, tahun")
        .eq("id_penyakit", idPenyakit)
        .order("id", { ascending: true }),
    ]);

    for (const r of [diseaseRes, kontenRes, bagianRes, referensiRes]) {
      if (r.error) throw r.error;
    }

    if (!diseaseRes.data) {
      return res.status(404).json({ error: "penyakit tidak ditemukan" });
    }

    const konten = (kontenRes.data ?? []).map((k) => ({
      ...k,
      gambar_konten: k.gambar_konten ?? [],
    }));

    const bagian_tubuh = (bagianRes.data ?? []).flatMap((r) =>
      r.bagian_tubuh ? [r.bagian_tubuh] : [],
    );

    res.json({
      penyakit: {
        ...diseaseRes.data,
        konten,
        bagian_tubuh,
        referensi: referensiRes.data ?? [],
      },
    });
  }),
);

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
