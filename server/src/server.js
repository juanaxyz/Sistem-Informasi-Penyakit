require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 4000;

const RAG_API_URL = process.env.RAG_API_URL || "http://localhost:8000";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev"; // should be strong in prod

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// CORS — origin dari env (pisahkan dengan koma), default mengikuti request origin.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

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

// Authentication middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user; // { id, email, role }
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required" });
    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

// =========================
// AUTH ROUTES
// =========================

const handleRegister = async (req, res) => {
  const nama = String(req.body?.nama ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!nama || !email || !username || !password) {
    return res
      .status(400)
      .json({ error: "nama, email, username, dan password wajib diisi" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Format email tidak valid" });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: "Username minimal 3 karakter" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await db.rpc("register_user", {
    p_nama: nama,
    p_email: email,
    p_username: username,
    p_password: passwordHash,
  });

  if (error) {
    if (
      error.code === "23505" ||
      error.message?.includes("duplicate key") ||
      error.message?.includes("unique constraint")
    ) {
      return res
        .status(409)
        .json({ error: "Email atau username sudah terdaftar" });
    }
    throw error;
  }

  const user = data?.[0];
  if (!user) {
    throw new Error("Gagal membuat user");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      username: user.username,
      role: user.role,
      dibuat_pada: user.dibuat_pada,
    },
  });
};

const handleLogin = async (req, res) => {
  const identifier = String(
    req.body?.identifier ?? req.body?.email ?? req.body?.username ?? "",
  ).trim();
  const password = String(req.body?.password ?? "");

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: "Email/username dan password wajib diisi" });
  }

  const { data, error } = await db.rpc("get_user_for_auth", {
    p_identifier: identifier,
  });

  if (error) throw error;

  const user = data?.[0];
  if (!user) {
    return res
      .status(401)
      .json({ error: "Email/username atau password salah" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ error: "Email/username atau password salah" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
};

const handleGetMe = async (req, res) => {
  const { data, error } = await db.rpc("get_user_profile", {
    p_user_id: req.user.id,
  });

  if (error) throw error;

  const user = data?.[0];
  if (!user) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  res.json({ user });
};

// Register
app.post("/api/auth/register", handle(handleRegister));
app.post("/auth/register", handle(handleRegister));

// Login
app.post("/api/auth/login", handle(handleLogin));
app.post("/auth/login", handle(handleLogin));

// Logout (stateless token acknowledgment)
app.post("/api/auth/logout", (_req, res) => {
  res.json({ message: "Logout berhasil" });
});
app.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logout berhasil" });
});

// Current user profile
app.get("/api/auth/me", verifyToken, handle(handleGetMe));
app.get("/auth/me", verifyToken, handle(handleGetMe));

// AI Analysis Endpoints
const handleCreateRiwayat = async (req, res) => {
  const { user } = req;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const gambar = String(req.body?.gambar ?? "").trim();
  if (!gambar) return res.status(400).json({ error: "gambar wajib diisi" });
  const { data, error } = await db.rpc("create_riwayat", {
    p_user_id: user.id,
    p_gambar: gambar,
  });
  if (error) throw error;
  const riwayat = data?.[0];
  if (!riwayat) throw new Error("Gagal membuat riwayat");
  res.status(201).json({ id: riwayat.id, status: riwayat.status });
};

const handleGetRiwayat = async (req, res) => {
  const { user } = req;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const { data, error } = await db.rpc("get_riwayat_by_user", {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  res.json({ riwayat: data ?? [] });
};

const handleGetRiwayatDetail = async (req, res) => {
  const { user } = req;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const id = parseInt(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ error: "ID riwayat tidak valid" });
  const { data, error } = await db.rpc("get_riwayat_detail", {
    p_riwayat_id: id,
  });
  if (error) throw error;
  const riwayat = data?.[0];
  if (!riwayat)
    return res.status(404).json({ error: "Riwayat tidak ditemukan" });
  // Ensure we have the user_id matches (or admin)
  if (riwayat.user_id !== user.id && user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Tidak diizinkan mengakses riwayat ini" });
  }
  res.json({ riwayat: riwayat });
};

const handleRunAnalisis = async (req, res) => {
  const { user } = req;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const id = parseInt(req.params.id);
  if (isNaN(id))
    return res.status(400).json({ error: "ID riwayat tidak valid" });
  // Get riwayat to verify ownership
  const { data: riwayatData, error: riwayatErr } = await db.rpc(
    "get_riwayat_detail",
    { p_riwayat_id: id },
  );
  if (riwayatErr) throw riwayatErr;
  const riwayat = riwayatData?.[0];
  if (!riwayat)
    return res.status(404).json({ error: "Riwayat tidak ditemukan" });
  if (riwayat.user_id !== user.id && user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Tidak diizinkan menganalisis riwayat ini" });
  }
  if (riwayat.status !== "processing") {
    return res
      .status(400)
      .json({ error: "Riwayat belum dalam status processing" });
  }
  // Get active models
  const { data: modelsData, error: modelsErr } =
    await db.rpc("get_active_models");
  if (modelsErr) throw modelsErr;
  const models = modelsData ?? [];
  if (models.length === 0) {
    return res.status(500).json({ error: "Tidak ada model aktif" });
  }
  // Get all penyakit for mapping
  const { data: penyakitData, error: penyakitErr } = await db
    .from("penyakit")
    .select("id, kode, nama")
    .order("kode");
  if (penyakitErr) throw penyakitErr;
  const penyakitList = penyakitData ?? [];
  if (penyakitList.length === 0) {
    return res.status(500).json({ error: "Tidak ada penyakit yang tersedia" });
  }
  // Simple hash function for deterministic pseudo-random
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };
  // Use gambar string as seed
  const seed = hashString(riwayat.gambar);
  // For each model, assign a penyakit and confidence
  const predictions = [];
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    // Determine penyakit index: (seed + i) % penyakitList.length
    const penyakitIndex =
      (((seed + i) % penyakitList.length) + penyakitList.length) %
      penyakitList.length;
    const penyakit = penyakitList[penyakitIndex];
    // Generate confidence between 0.7 and 0.99
    const confidence = 0.7 + ((Math.abs(seed + i) % 1000) / 1000) * 0.29; // 0.7 to 0.99
    // Insert prediksi
    const { data: predData, error: predErr } = await db.rpc("create_prediksi", {
      p_riwayat_id: id,
      p_model_id: model.id,
      p_id_penyakit: penyakit.id,
      p_confidence: confidence,
    });
    if (predErr) throw predErr;
    const prediksi = predData?.[0];
    if (!prediksi) throw new Error("Gagal membuat prediksi");
    predictions.push({
      id: prediksi.id,
      model: model.nama_model,
      versi: model.versi,
      penyakit: penyakit.nama,
      kode: penyakit.kode,
      confidence: prediksi.confidence,
    });
  }
  // Update riwayat status to completed
  const { data: updatedData, error: updateErr } = await db.rpc(
    "update_riwayat_status",
    { p_riwayat_id: id, p_status: "completed" },
  );
  if (updateErr) throw updateErr;
  // Return result similar to GET /riwayat/:id
  const { data: finalData, error: finalErr } = await db.rpc(
    "get_riwayat_detail",
    { p_riwayat_id: id },
  );
  if (finalErr) throw finalErr;
  const finalRiwayat = finalData?.[0];
  if (!finalRiwayat)
    throw new Error("Gagal mendapatkan riwayat setelah analisis");
  res.json({ riwayat: finalRiwayat });
};

const handleGetModels = async (req, res) => {
  const { data, error } = await db.rpc("get_active_models");
  if (error) throw error;
  res.json({ models: data ?? [] });
};

// AI Analysis Routes
app.post("/api/riwayat", verifyToken, handle(handleCreateRiwayat));
app.post("/riwayat", verifyToken, handle(handleCreateRiwayat));

app.post("/api/riwayat/:id/analisis", verifyToken, handle(handleRunAnalisis));
app.post("/riwayat/:id/analisis", verifyToken, handle(handleRunAnalisis));

app.get("/api/riwayat", verifyToken, handle(handleGetRiwayat));
app.get("/riwayat", verifyToken, handle(handleGetRiwayat));

app.get("/api/riwayat/:id", verifyToken, handle(handleGetRiwayatDetail));
app.get("/riwayat/:id", verifyToken, handle(handleGetRiwayatDetail));

app.get("/api/model", handle(handleGetModels));
app.get("/model", handle(handleGetModels));

// Bagian tubuh untuk peta interaktif
app.get(
  "/api/bagian-tubuh",
  handle(async (_req, res) => {
    const { data, error } = await db
      .from("bagian_tubuh")
      .select("id, nama, tampilan")
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
      return res.status(400).json({
        error: "id bagian tubuh tidak valid",
      });
    }

    const { data, error } = await db
      .from("penyakit_bagian_tubuh")
      .select(
        `
        penyakit!inner (
          sistem_tubuh!inner (
            id,
            nama
          )
        )
      `,
      )
      .eq("id_bagian_tubuh", idBody);

    if (error) throw error;

    const systemById = new Map();

    for (const item of data ?? []) {
      const system = item.penyakit?.sistem_tubuh;

      if (!system) continue;

      const current = systemById.get(system.id);

      if (current) {
        current.jumlah_penyakit += 1;
      } else {
        systemById.set(system.id, {
          ...system,
          jumlah_penyakit: 1,
        });
      }
    }

    const sistemTubuh = [...systemById.values()];

    res.json({
      sistem_tubuh: sistemTubuh,
    });
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
        "id, nama, slug, ringkasan, thumbnail, tingkat_urgensi, penyakit_bagian_tubuh!inner (id_bagian_tubuh)",
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
        .select("id, nama, slug, ringkasan, thumbnail, tingkat_urgensi")
        .ilike("nama", pattern),
      db
        .from("penyakit")
        .select("id, nama, slug, ringkasan, thumbnail, tingkat_urgensi")
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

// Artikel satu penyakit (Markdown content)
app.get(
  "/api/penyakit/:idPenyakit/konten",
  handle(async (req, res) => {
    const idPenyakit = validateId(req.params.idPenyakit);
    if (idPenyakit === null) {
      return res.status(400).json({ error: "id penyakit tidak valid" });
    }

    const { data, error } = await db
      .from("artikel")
      .select("id, konten")
      .eq("id_penyakit", idPenyakit)
      .order("id", { ascending: true });
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

    const [diseaseRes, artikelRes, bagianRes, referensiRes] = await Promise.all(
      [
        db
          .from("penyakit")
          .select(
            "id, id_sistem_tubuh, nama, slug, ringkasan, thumbnail, tingkat_urgensi, sistem_tubuh (id, nama)",
          )
          .eq("id", idPenyakit)
          .maybeSingle(),
        db
          .from("artikel")
          .select("id, konten")
          .eq("id_penyakit", idPenyakit)
          .order("id", { ascending: true }),
        db
          .from("penyakit_bagian_tubuh")
          .select("bagian_tubuh (id, nama, tampilan)")
          .eq("id_penyakit", idPenyakit)
          .order("id", { referencedTable: "bagian_tubuh" }),
        db
          .from("referensi")
          .select("id, url")
          .eq("id_penyakit", idPenyakit)
          .order("id", { ascending: true }),
      ],
    );

    for (const r of [diseaseRes, artikelRes, bagianRes, referensiRes]) {
      if (r.error) throw r.error;
    }

    if (!diseaseRes.data) {
      return res.status(404).json({ error: "penyakit tidak ditemukan" });
    }

    const bagian_tubuh = (bagianRes.data ?? []).flatMap((r) =>
      r.bagian_tubuh ? [r.bagian_tubuh] : [],
    );

    res.json({
      penyakit: {
        ...diseaseRes.data,
        artikel: artikelRes.data ?? [],
        bagian_tubuh,
        referensi: referensiRes.data ?? [],
      },
    });
  }),
);

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

// Proxy chat RAG ke RAG API (FastAPI). Frontend tidak perlu tahu endpoint ini.
app.post(
  "/api/rag/chat",
  handle(async (req, res) => {
    const question = String(req.body?.question ?? "").trim();
    if (!question) {
      return res.status(400).json({ error: "question wajib diisi" });
    }

    const payload = { question };
    if (typeof req.body?.session_id === "string") {
      payload.session_id = req.body.session_id;
    }
    if (Array.isArray(req.body?.history)) {
      payload.history = req.body.history;
    }

    const ragRes = await fetch(`${RAG_API_URL}/api/rag/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await ragRes.json().catch(() => null);
    if (!ragRes.ok) {
      throw new Error(data?.detail ?? data?.error ?? "RAG API error");
    }

    res.json(data);
  }),
);

// Admin: List semua penyakit (untuk dashboard admin)
app.get(
  "/api/penyakit",
  verifyToken,
  requireRole("admin"),
  handle(async (_req, res) => {
    const { data, error } = await db
      .from("penyakit")
      .select("id, nama, slug, ringkasan, thumbnail, tingkat_urgensi, id_sistem_tubuh")
      .order("nama", { ascending: true });
    if (error) throw error;
    res.json({ penyakit: data ?? [] });
  }),
);

// Admin: Update penyakit
app.put(
  "/api/penyakit/:idPenyakit",
  verifyToken,
  requireRole("admin"),
  handle(async (req, res) => {
    const idPenyakit = validateId(req.params.idPenyakit);
    if (idPenyakit === null) {
      return res.status(400).json({ error: "id penyakit tidak valid" });
    }
    const {
      nama,
      slug,
      ringkasan,
      thumbnail,
      tingkat_urgensi,
      id_sistem_tubuh,
    } = req.body;
    // Validasi sederhana
    if (!nama || !slug || !tingkat_urgensi) {
      return res
        .status(400)
        .json({ error: "nama, slug, dan tingkat_urgensi wajib diisi" });
    }
    const { data, error } = await db
      .from("penyakit")
      .update({
        nama,
        slug,
        ringkasan: ringkasan ?? null,
        thumbnail: thumbnail ?? null,
        tingkat_urgensi,
        id_sistem_tubuh: id_sistem_tubuh ?? null,
        diperbarui_pada: new Date().toISOString(),
      })
      .eq("id", idPenyakit);
    if (error) throw error;
    // Return updated data
    const { data: updatedData, error: updatedError } = await db
      .from("penyakit")
      .select(
        "id, nama, slug, ringkasan, thumbnail, tingkat_urgensi, id_sistem_tubuh, dibuat_pada, diperbarui_pada"
      )
      .eq("id", idPenyakit)
      .single();
    if (updatedError) throw updatedError;
    res.json({ penyakit: updatedData });
  }),
);

// Admin: List semua artikel (untuk dashboard admin)
app.get(
  "/api/artikel",
  verifyToken,
  requireRole("admin"),
  handle(async (_req, res) => {
    const { data, error } = await db
      .from("artikel")
      .select("id, konten, id_penyakit, artikel_bagian(judul, urutan), penyakit!inner (nama)")
      .order("id_penyakit", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    // Process data to get the first judul from artikel_bagian (ordered by urutan)
    const artikelList = (data ?? []).map((artikel) => {
      // Sort the artikel_bagian by urutan (ascending) and take the first one's judul
      const sortedBagian = (artikel.artikel_bagian || []).sort((a, b) => a.urutan - b.urutan);
      const judul = sortedBagian.length > 0 ? sortedBagian[0].judul : "";
      return {
        id: artikel.id,
        judul: judul,
        konten: artikel.konten ?? "",
        penyakit_nama: artikel.penyakit?.nama ?? "",
      };
    });
    res.json({ artikel: artikelList });
  }),
);

// Admin: Update artikel
app.put(
  "/api/artikel/:idArtikel",
  verifyToken,
  requireRole("admin"),
  handle(async (req, res) => {
    const idArtikel = validateId(req.params.idArtikel);
    if (idArtikel === null) {
      return res.status(400).json({ error: "id artikel tidak valid" });
    }
    const { konten } = req.body;
    if (konten === undefined) {
      return res
        .status(400)
        .json({ error: "konten harus disediakan" });
    }
    const updateData = {
      konten,
      diperbarui_pada: new Date().toISOString(),
    };
    const { data, error } = await db
      .from("artikel")
      .update(updateData)
      .eq("id", idArtikel);
    if (error) throw error;
    // Return updated data
    const { data: updatedData, error: updatedError } = await db
      .from("artikel")
      .select("id, konten, diperbarui_pada")
      .eq("id", idArtikel)
      .single();
    if (updatedError) throw updatedError;
    res.json({ artikel: updatedData });
  }),
);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
