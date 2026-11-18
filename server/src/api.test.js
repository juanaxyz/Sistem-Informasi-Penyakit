const request = require("supertest");
const jwt = require("jsonwebtoken");

const mockQuery = jest.fn();

jest.mock("./db/pg", () => ({
  query: mockQuery,
  pool: {},
}));

global.fetch = jest.fn();

const app = require("./app");
const config = require("./config");

const signToken = (overrides = {}) =>
  jwt.sign(
    { id: 1, email: "user@example.com", username: "user1", role: "user", ...overrides },
    config.jwt.secret,
    { expiresIn: "1h" },
  );

const ok = (rows) => ({ rows: rows ?? [], rowCount: rows?.length ?? 0 });

describe("API Test Suite", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // --- HEALTH CHECK ---
  describe("GET /", () => {
    it("harus mengembalikan status 200 dan { ok: true }", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe("GET /health", () => {
    it("harus mengembalikan status OK", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "OK");
    });
  });

  // --- 404 HANDLER ---
  describe("GET /api/tidak-ada", () => {
    it("harus 404 untuk route yang tidak dikenal", async () => {
      const res = await request(app).get("/api/tidak-ada");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Route not found");
    });
  });

  // --- BAGIAN TUBUH ---
  describe("GET /api/bagian-tubuh", () => {
    it("harus mengembalikan daftar bagian tubuh", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([{ id: 1, nama: "Kepala", tampilan: "depan" }]),
      );

      const res = await request(app).get("/api/bagian-tubuh");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        bagian_tubuh: [{ id: 1, nama: "Kepala", tampilan: "depan" }],
      });
    });

    it("harus mengembalikan 500 jika query gagal", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).get("/api/bagian-tubuh");
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Database error");
    });
  });

  // --- SISTEM TUBUH BY BODY ID ---
  describe("GET /api/sistem-tubuh/byBody/:idBody", () => {
    it("harus mengembalikan status 400 jika idBody tidak valid", async () => {
      const res = await request(app).get("/api/sistem-tubuh/byBody/abc");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id bagian tubuh tidak valid" });
    });

    it("harus menghitung `jumlah_penyakit` per sistem tubuh", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([{ id: 10, nama: "Saraf", jumlah_penyakit: 2 }]),
      );

      const res = await request(app).get("/api/sistem-tubuh/byBody/1");
      expect(res.status).toBe(200);
      expect(res.body.sistem_tubuh).toEqual([
        { id: 10, nama: "Saraf", jumlah_penyakit: 2 },
      ]);
    });
  });

  // --- JENIS ANALISIS BY BODY ID ---
  describe("GET /api/jenis-analisis/byBody/:idBody", () => {
    it("harus mengembalikan status 400 jika idBody tidak valid", async () => {
      const res = await request(app).get("/api/jenis-analisis/byBody/abc");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id bagian tubuh tidak valid" });
    });

    it("harus mengembalikan jenis analisis aktif untuk bagian tubuh", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([
          {
            id: 1,
            nama: "Klasifikasi Penyakit Paru",
            slug: "klasifikasi-penyakit-paru",
            deskripsi: "Analisis citra X-ray pada bagian dada.",
            tipe_input: "xray",
            icon: "scan-line",
          },
        ]),
      );

      const res = await request(app).get("/api/jenis-analisis/byBody/1");
      expect(res.status).toBe(200);
      expect(res.body.jenis_analisis).toEqual([
        expect.objectContaining({ id: 1, slug: "klasifikasi-penyakit-paru" }),
      ]);
    });

    it("harus mengembalikan array kosong jika bagian tidak punya analisis", async () => {
      mockQuery.mockResolvedValueOnce(ok([]));

      const res = await request(app).get("/api/jenis-analisis/byBody/20");
      expect(res.status).toBe(200);
      expect(res.body.jenis_analisis).toEqual([]);
    });
  });

  // --- PENYAKIT BY SYSTEM AND BODY ---
  describe("GET /api/penyakit/bySystemAndBody/:idBody/:idSystem", () => {
    it("harus 400 jika salah satu ID tidak valid", async () => {
      const res = await request(app).get("/api/penyakit/bySystemAndBody/1/-5");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id tidak valid" });
    });

    it("harus mengembalikan daftar penyakit sesuai filter", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([
          {
            id: 1,
            nama: "Migrain",
            slug: "migrain",
            ringkasan: null,
            thumbnail: null,
            tingkat_urgensi: "normal",
            id_bagian_tubuh: 2,
          },
        ]),
      );

      const res = await request(app).get("/api/penyakit/bySystemAndBody/1/2");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        penyakit: [
          {
            id: 1,
            nama: "Migrain",
            slug: "migrain",
            ringkasan: null,
            thumbnail: null,
            tingkat_urgensi: "normal",
            penyakit_bagian_tubuh: [{ id_bagian_tubuh: 2 }],
          },
        ],
      });
    });
  });

  // --- PENCARIAN PENYAKIT ---
  describe("GET /api/penyakit/cari", () => {
    it("harus mengembalikan array kosong jika query 'q' tidak diisi", async () => {
      const res = await request(app).get("/api/penyakit/cari");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ penyakit: [] });
    });

    it("harus meng-escape karakter wildcard dan mengurutkan hasil", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([
          { id: 2, nama: "Batuk" },
          { id: 1, nama: "Flu" },
        ]),
      );

      const res = await request(app).get("/api/penyakit/cari?q=Fl*u%");
      expect(res.status).toBe(200);
      expect(res.body.penyakit.length).toBe(2);
      expect(res.body.penyakit[0].nama).toBe("Batuk");
      expect(res.body.penyakit[1].nama).toBe("Flu");
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE $1"),
        ["%Fl\\*u\\%%"],
      );
    });
  });

  // --- KONTEN ARTIKEL PENYAKIT ---
  describe("GET /api/penyakit/:idPenyakit/konten", () => {
    it("harus 400 jika idPenyakit bernilai 0 atau negatif", async () => {
      const res = await request(app).get("/api/penyakit/0/konten");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id penyakit tidak valid" });
    });

    it("harus mengembalikan artikel konten penyakit", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([{ id: 100, konten: "Penjelasan penyakit..." }]),
      );

      const res = await request(app).get("/api/penyakit/1/konten");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ konten: [{ id: 100, konten: "Penjelasan penyakit..." }] });
    });
  });

  // --- DETAIL LENGKAP PENYAKIT ---
  describe("GET /api/penyakit/:idOrSlug", () => {
    it("harus 404 jika detail penyakit tidak ditemukan", async () => {
      mockQuery.mockResolvedValueOnce(ok([]));

      const res = await request(app).get("/api/penyakit/999");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "penyakit tidak ditemukan" });
    });

    it("harus menggabungkan data penyakit, artikel (HTML), bagian tubuh, dan referensi", async () => {
      mockQuery
        .mockResolvedValueOnce(
          ok([
            {
              id: 1,
              id_sistem_tubuh: 2,
              nama: "Maag",
              slug: "maag",
              ringkasan: null,
              thumbnail: null,
              tingkat_urgensi: "normal",
              sistem_id: 2,
              sistem_nama: "Pencernaan",
            },
          ]),
        ) // disease
        .mockResolvedValueOnce(
          ok([
            {
              id: 10,
              status: "terbit",
              konten: "<h2>Pengertian</h2><p>Konten Maag</p>",
              ditinjau_pada: null,
              diperbarui_pada: "2026-11-16T00:00:00.000Z",
            },
          ]),
        ) // artikel
        .mockResolvedValueOnce(
          ok([{ id: 5, nama: "Lambung", tampilan: "depan" }]),
        ) // bagian_tubuh
        .mockResolvedValueOnce(ok([{ id: 1, url: "https://example.com" }])) // referensi
        .mockResolvedValueOnce(
          ok([{ id: 7, nama: "Helicobacter pylori", jenis: "bakteri" }]),
        ); // patogen

      const res = await request(app).get("/api/penyakit/1");
      expect(res.status).toBe(200);
      expect(res.body.penyakit).toEqual({
        id: 1,
        id_sistem_tubuh: 2,
        nama: "Maag",
        slug: "maag",
        ringkasan: null,
        thumbnail: null,
        tingkat_urgensi: "normal",
        sistem_tubuh: { id: 2, nama: "Pencernaan" },
        artikel: {
          id: 10,
          status: "terbit",
          konten: "<h2>Pengertian</h2><p>Konten Maag</p>",
          ditinjau_pada: null,
          diperbarui_pada: "2026-11-16T00:00:00.000Z",
        },
        bagian_tubuh: [{ id: 5, nama: "Lambung", tampilan: "depan" }],
        referensi: [{ id: 1, url: "https://example.com" }],
        patogen: [{ id: 7, nama: "Helicobacter pylori", jenis: "bakteri" }],
      });
    });

    it("harus mengembalikan artikel null jika penyakit tidak punya artikel", async () => {
      mockQuery
        .mockResolvedValueOnce(
          ok([{ id: 3, nama: "Asma", slug: "asma", sistem_id: 1, sistem_nama: "Pernapasan" }]),
        )
        .mockResolvedValueOnce(ok([])) // artikel tidak ada
        .mockResolvedValueOnce(ok([])) // bagian_tubuh
        .mockResolvedValueOnce(ok([])) // referensi
        .mockResolvedValueOnce(ok([])); // patogen

      const res = await request(app).get("/api/penyakit/3");
      expect(res.status).toBe(200);
      expect(res.body.penyakit.artikel).toBeNull();
    });

    it("harus 404 jika slug tidak dikenal (query tidak mengembalikan baris)", async () => {
      mockQuery.mockResolvedValueOnce(ok([]));
      const res = await request(app).get("/api/penyakit/slug/tidak-ada");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "penyakit tidak ditemukan" });
    });
  });

  // --- PROXY RAG CHAT ---
  describe("POST /api/rag/chat", () => {
    it("harus 400 jika 'question' kosong", async () => {
      const res = await request(app)
        .post("/api/rag/chat")
        .send({ question: "   " });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "question wajib diisi" });
    });

    it("harus berhasil meneruskan request ke RAG API dan mengembalikan hasilnya", async () => {
      const mockRagResponse = {
        answer: "Gejala maag meliputi nyeri ulu hati.",
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRagResponse,
      });

      const res = await request(app)
        .post("/api/rag/chat")
        .send({ question: "Apa gejala maag?", session_id: "sess-123" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockRagResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rag/chat"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            question: "Apa gejala maag?",
            session_id: "sess-123",
          }),
        }),
      );
    });

    it("harus mengembalikan 500 jika RAG API mengembalikan error response", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "RAG Service Unavailable" }),
      });

      const res = await request(app)
        .post("/api/rag/chat")
        .send({ question: "Halo" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "RAG Service Unavailable");
    });
  });

  // --- PROXY SINKRONISASI KNOWLEDGE BASE (admin only) ---
  describe("POST /api/admin/rag/load-knowledge", () => {
    const url = "/api/admin/rag/load-knowledge";

    it("harus 401 tanpa token JWT", async () => {
      const res = await request(app).post(url);
      expect(res.status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("harus 403 untuk role user (bukan admin)", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`);

      expect(res.status).toBe(403);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("harus meneruskan sinkronisasi untuk role admin", async () => {
      const ringkasan = {
        total: 10,
        per_source: { disease: 2, faq: 8 },
        sumber_berubah: 3,
        chunk_terembed: 10,
        durasi_detik: 1.2,
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ringkasan,
      });

      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${signToken({ role: "admin" })}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(ringkasan);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/load-knowledge"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("harus meneruskan status error dari service (400)", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Tidak ada konten sumber." }),
      });

      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${signToken({ role: "admin" })}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Tidak ada konten sumber.");
    });

    it("harus 502 jika service RAG tidak terjangkau", async () => {
      fetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${signToken({ role: "admin" })}`);

      expect(res.status).toBe(502);
    });
  });

  // --- AUTH ---
  describe("AUTH Endpoints", () => {
    describe("POST /api/auth/register", () => {
      it("harus 400 jika field ada yang kosong", async () => {
        const res = await request(app)
          .post("/api/auth/register")
          .send({ nama: "Test", email: "test@example.com" });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("harus 201 dan kembalikan token jika register valid", async () => {
        const mockUser = {
          id: 1,
          nama: "Budi",
          email: "budi@example.com",
          username: "budi123",
          role: "user",
          dibuat_pada: "2026-09-13T00:00:00.000Z",
        };
        mockQuery.mockResolvedValueOnce(ok([mockUser]));

        const res = await request(app)
          .post("/api/auth/register")
          .send({
            nama: "Budi",
            email: "budi@example.com",
            username: "budi123",
            password: "password123",
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user).toEqual(mockUser);
      });

      it("harus 409 jika email/username sudah terdaftar", async () => {
        mockQuery.mockRejectedValueOnce({
          code: "23505",
          message: 'duplicate key value violates unique constraint "users_email_key"',
        });

        const res = await request(app)
          .post("/api/auth/register")
          .send({
            nama: "Budi",
            email: "budi@example.com",
            username: "budi123",
            password: "password123",
          });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Email atau username sudah terdaftar" });
      });
    });

    describe("POST /api/auth/login", () => {
      it("harus 400 jika identifier/password kosong", async () => {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ identifier: "" });
        expect(res.status).toBe(400);
      });

      it("harus 401 jika user tidak ditemukan", async () => {
        mockQuery.mockResolvedValueOnce(ok([]));
        const res = await request(app)
          .post("/api/auth/login")
          .send({ identifier: "unknown@example.com", password: "password123" });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Email/username atau password salah");
      });
    });

    describe("POST /api/auth/logout", () => {
      it("harus 200 dengan pesan logout berhasil", async () => {
        const res = await request(app).post("/api/auth/logout");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Logout berhasil" });
      });
    });

    describe("GET /api/auth/me", () => {
      it("harus 401 jika token tidak disertakan", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
      });

      it("harus 200 dengan profil user jika token valid", async () => {
        mockQuery.mockResolvedValueOnce(
          ok([{ id: 1, nama: "Budi", email: "budi@example.com", username: "budi123", role: "user" }]),
        );
        const res = await request(app)
          .get("/api/auth/me")
          .set("Authorization", `Bearer ${signToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.user).toHaveProperty("nama", "Budi");
      });

      it("harus 403 jika token tidak valid", async () => {
        const res = await request(app)
          .get("/api/auth/me")
          .set("Authorization", "Bearer token-palsu");
        expect(res.status).toBe(403);
      });
    });
  });

  // --- AUTH PROTECTION PADA ROUTE TERPROTEKSI ---
  describe("Proteksi route (verifyToken & requireRole)", () => {
    it("harus 401 pada GET /api/riwayat tanpa token", async () => {
      const res = await request(app).get("/api/riwayat");
      expect(res.status).toBe(401);
    });

    it("harus 401 pada GET /api/penyakit (admin) tanpa token", async () => {
      const res = await request(app).get("/api/penyakit");
      expect(res.status).toBe(401);
    });

    it("harus 403 pada GET /api/penyakit (admin) dengan token role user", async () => {
      const res = await request(app)
        .get("/api/penyakit")
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`);
      expect(res.status).toBe(403);
    });

    it("harus 200 pada GET /api/penyakit (admin) dengan token role admin", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([
          {
            id: 1,
            nama: "Maag",
            slug: "maag",
            ringkasan: null,
            thumbnail: null,
            tingkat_urgensi: "normal",
            id_sistem_tubuh: 2,
            sistem_nama: "Pencernaan",
          },
        ]),
      );
      const res = await request(app)
        .get("/api/penyakit")
        .set("Authorization", `Bearer ${signToken({ role: "admin" })}`);
      expect(res.status).toBe(200);
      expect(res.body.penyakit[0]).toHaveProperty("sistem_tubuh_nama", "Pencernaan");
    });

    it("harus 200 pada GET /api/sistem-tubuh (admin) dengan token admin", async () => {
      mockQuery.mockResolvedValueOnce(ok([{ id: 1, nama: "Saraf" }]));
      const res = await request(app)
        .get("/api/sistem-tubuh")
        .set("Authorization", `Bearer ${signToken({ role: "admin" })}`);
      expect(res.status).toBe(200);
      expect(res.body.sistem_tubuh).toEqual([{ id: 1, nama: "Saraf" }]);
    });
  });

  // --- RIWAYAT (terproteksi) ---
  describe("Route riwayat", () => {
    it("GET /api/riwayat mengembalikan daftar riwayat user", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([{ id: 5, user_id: 1, gambar: "url", status: "completed" }]),
      );
      const res = await request(app)
        .get("/api/riwayat?limit=10&offset=0")
        .set("Authorization", `Bearer ${signToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.riwayat).toHaveLength(1);
    });

    it("POST /api/riwayat membuat riwayat baru", async () => {
      mockQuery.mockResolvedValueOnce(ok([{ id: 6, status: "processing" }]));
      const res = await request(app)
        .post("/api/riwayat")
        .set("Authorization", `Bearer ${signToken()}`)
        .attach("gambar", Buffer.from("iVBORw0KGgoAAAANSUhEUg=="), "gambar.png");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 6, status: "processing" });
    });
  });

  // --- REFERENSI PENYAKIT (disimpan lewat form admin) ---
  describe("Referensi pada form admin penyakit", () => {
    const adminAuth = { Authorization: `Bearer ${signToken({ role: "admin" })}` };
    const basePayload = {
      nama: "Maag",
      slug: "maag",
      tingkat_urgensi: "normal",
      id_sistem_tubuh: 2,
      bagian_tubuhIds: [],
      patogenIds: [],
    };

    // Semua query dibalas baris yang sama; urutan panggilan dicek lewat
    // `mockQuery.mock.calls` supaya tes tidak bergantung pada urutan internals
    // `Promise.all` milik replacePenyakitRelations.
    const stubAllQueries = () => mockQuery.mockResolvedValue(ok([{ id: 7, nama: "Maag" }]));

    const callsMatching = (pattern) =>
      mockQuery.mock.calls.filter(([sql]) => pattern.test(sql));

    it("harus menyimpan referensi pada POST /api/penyakit", async () => {
      stubAllQueries();
      const res = await request(app)
        .post("/api/penyakit")
        .set(adminAuth)
        .send({
          ...basePayload,
          referensi: ["https://www.who.int/news-room/fact-sheets/detail/gastro-oesophageal-reflux-disease-(gerd)"],
        });

      expect(res.status).toBe(201);
      const del = callsMatching(/DELETE FROM referensi/);
      const ins = callsMatching(/INSERT INTO referensi/);
      expect(del).toHaveLength(1);
      expect(del[0][1]).toEqual([7]);
      expect(ins).toHaveLength(1);
      expect(ins[0][1]).toEqual([7, expect.stringContaining("https://www.who.int/")]);
    });

    it("harus menormalkan dan membuang URL duplikat serta entri kosong", async () => {
      stubAllQueries();
      await request(app)
        .post("/api/penyakit")
        .set(adminAuth)
        .send({
          ...basePayload,
          referensi: [
            "https://who.int",
            "https://who.int/",
            "  https://who.int/  ",
            "",
            "   ",
          ],
        });

      const ins = callsMatching(/INSERT INTO referensi/);
      expect(ins).toHaveLength(1);
      // `https://who.int` dinormalisasi menjadi `https://who.int/` lalu
      // collapse jadi satu baris; entri kosong tidak menghasilkan apa pun.
      expect(ins[0][1]).toEqual([7, "https://who.int/"]);
    });

    it("harus menolak URL yang bukan http/https dengan 400", async () => {
      stubAllQueries();
      const res = await request(app)
        .post("/api/penyakit")
        .set(adminAuth)
        .send({ ...basePayload, referensi: ["javascript:alert(1)"] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/referensi tidak valid/);
      // Validasi terjadi sebelum query apa pun yang mengubah data.
      expect(callsMatching(/INSERT INTO referensi/)).toHaveLength(0);
    });

    it("harus menolak string yang bukan URL dengan 400", async () => {
      stubAllQueries();
      const res = await request(app)
        .post("/api/penyakit")
        .set(adminAuth)
        .send({ ...basePayload, referensi: ["bukan url"] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/referensi tidak valid/);
    });

    it("harus menolak lebih dari 50 referensi dengan 400", async () => {
      stubAllQueries();
      const referensi = Array.from(
        { length: 51 },
        (_, i) => `https://example.com/sumber/${i}`,
      );
      const res = await request(app)
        .post("/api/penyakit")
        .set(adminAuth)
        .send({ ...basePayload, referensi });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/maksimal 50 referensi/);
    });

    it("harus menghapus semua referensi tanpa insert saat dikirim array kosong", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7")
        .set(adminAuth)
        .send({ ...basePayload, referensi: [] });

      expect(res.status).toBe(200);
      expect(callsMatching(/DELETE FROM referensi/)).toHaveLength(1);
      expect(callsMatching(/INSERT INTO referensi/)).toHaveLength(0);
    });

    it("harus tidak menyentuh tabel referensi saat field tidak dikirim", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7")
        .set(adminAuth)
        .send(basePayload);

      expect(res.status).toBe(200);
      expect(callsMatching(/FROM referensi/)).toHaveLength(0);
    });

    it("harus menyimpan referensi baru pada PUT /api/penyakit/:id", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7")
        .set(adminAuth)
        .send({ ...basePayload, referensi: ["https://id.wikipedia.org/wiki/Maag"] });

      expect(res.status).toBe(200);
      const ins = callsMatching(/INSERT INTO referensi/);
      expect(ins).toHaveLength(1);
      expect(ins[0][1]).toEqual([7, "https://id.wikipedia.org/wiki/Maag"]);
    });

    // Mock `query` tidak memvalidasi SQL, jadi bentuk kalimatnya diuji di sini:
    // jumlah kolom harus sama dengan jumlah nilai per tuple, dan placeholder
    // harus berurutan $1..$n sesuai panjang array parameter.
    it("harus menghasilkan SQL referensi yang jumlah kolomnya cocok", async () => {
      stubAllQueries();
      await request(app)
        .put("/api/penyakit/7")
        .set(adminAuth)
        .send({
          ...basePayload,
          referensi: ["https://a.example.com", "https://b.example.com", "https://c.example.com"],
        });

      const ins = callsMatching(/INSERT INTO referensi/);
      expect(ins).toHaveLength(1);
      const [sql, params] = ins[0];

      const columns = sql.match(/\(([^)]*)\)\s*VALUES/i)[1].split(",").map((c) => c.trim());
      expect(columns).toEqual(["id_penyakit", "url"]);

      const tuples = sql.slice(sql.indexOf("VALUES")).replace(/^VALUES/i, "").trim();
      const rows = tuples.split(/\),\s*\(/);
      rows.forEach((row) => {
        // Setiap tuple harus berisi tepat 2 placeholder, sama dengan 2 kolom.
        const found = row.match(/\$\d+/g);
        expect(found).toHaveLength(columns.length);
        // `id_penyakit` ($1) boleh dan harus muncul di setiap tuple.
        expect(found[0]).toBe("$1");
      });

      // Setiap parameter harus terpakai dan tidak ada placeholder di luar jangkauan.
      const used = [...new Set(tuples.match(/\$\d+/g))];
      expect(used).toEqual(params.map((_, i) => `$${i + 1}`));
    });

    it("harus 403 saat menyimpan referensi sebagai role user", async () => {
      stubAllQueries();
      const res = await request(app)
        .post("/api/penyakit")
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`)
        .send({ ...basePayload, referensi: ["https://example.com"] });

      expect(res.status).toBe(403);
      expect(callsMatching(/FROM referensi/)).toHaveLength(0);
    });

    it("harus 401 tanpa token JWT", async () => {
      stubAllQueries();
      const res = await request(app)
        .post("/api/penyakit")
        .send({ ...basePayload, referensi: ["https://example.com"] });

      expect(res.status).toBe(401);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  // --- REFERENSI VIA ENDPOINT KHUSUS (dari editor artikel) ---
  describe("Referensi pada endpoint khusus /penyakit/:id/referensi", () => {
    const adminAuth = { Authorization: `Bearer ${signToken({ role: "admin" })}` };

    const stubAllQueries = () => mockQuery.mockResolvedValue(ok([{ id: 7 }]));
    const callsMatching = (pattern) =>
      mockQuery.mock.calls.filter(([sql]) => pattern.test(sql));

    it("harus menyimpan referensi tanpa menanyakan field penyakit", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: ["https://id.wikipedia.org/wiki/Maag"] });

      expect(res.status).toBe(200);
      expect(res.body.referensi).toEqual(["https://id.wikipedia.org/wiki/Maag"]);
      const ins = callsMatching(/INSERT INTO referensi/);
      expect(ins).toHaveLength(1);
      expect(ins[0][1]).toEqual([7, "https://id.wikipedia.org/wiki/Maag"]);
    });

    // Ini regresi untuk desain endpoint: form penyakit mewajibkan nama/slug/
    // tingkat_urgensi/id_sistem_tubuh/bagian_tubuhIds, sedangkan editor
    // artikel tidak memegang data itu.
    it("harus tidak menolak payload yang hanya berisi referensi", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: [] });

      expect(res.status).toBe(200);
    });

    it("harus tidak menimpa kolom penyakit apa pun", async () => {
      stubAllQueries();
      await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: ["https://example.com"] });

      expect(callsMatching(/UPDATE penyakit/i)).toHaveLength(0);
    });

    it("harus menghapus semua referensi saat dikirim array kosong", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: [] });

      expect(res.status).toBe(200);
      expect(res.body.referensi).toEqual([]);
      expect(callsMatching(/DELETE FROM referensi/)).toHaveLength(1);
      expect(callsMatching(/INSERT INTO referensi/)).toHaveLength(0);
    });

    it("harus menolak referensi yang bukan array dengan 400", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: "https://example.com" });

      expect(res.status).toBe(400);
      expect(callsMatching(/FROM referensi/)).toHaveLength(0);
    });

    it("harus menolak URL bukan http/https dengan 400 tanpa menulis apa pun", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({ referensi: ["javascript:alert(1)"] });

      expect(res.status).toBe(400);
      expect(callsMatching(/DELETE FROM referensi/)).toHaveLength(0);
      expect(callsMatching(/INSERT INTO referensi/)).toHaveLength(0);
    });

    it("harus menolak lebih dari 50 referensi dengan 400", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set(adminAuth)
        .send({
          referensi: Array.from({ length: 51 }, (_, i) => `https://example.com/s/${i}`),
        });

      expect(res.status).toBe(400);
      expect(callsMatching(/INSERT INTO referensi/)).toHaveLength(0);
    });

    it("harus 400 saat id penyakit tidak ada", async () => {
      mockQuery.mockResolvedValue(ok([]));
      const res = await request(app)
        .put("/api/penyakit/9999/referensi")
        .set(adminAuth)
        .send({ referensi: ["https://example.com"] });

      expect(res.status).toBe(400);
      expect(callsMatching(/DELETE FROM referensi/)).toHaveLength(0);
    });

    it("harus 400 saat id penyakit bukan angka", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/abc/referensi")
        .set(adminAuth)
        .send({ referensi: ["https://example.com"] });

      expect(res.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 403 saat role user", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`)
        .send({ referensi: ["https://example.com"] });

      expect(res.status).toBe(403);
      expect(callsMatching(/FROM referensi/)).toHaveLength(0);
    });

    it("harus 401 tanpa token JWT", async () => {
      stubAllQueries();
      const res = await request(app)
        .put("/api/penyakit/7/referensi")
        .send({ referensi: ["https://example.com"] });

      expect(res.status).toBe(401);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  // --- ENDPOINT ARTIKEL (Opsi A: satu HTML Quill per penyakit) ---
  describe("GET /api/artikel/:idPenyakit", () => {
    it("harus 400 jika idPenyakit tidak valid", async () => {
      const res = await request(app).get("/api/artikel/0");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "id penyakit tidak valid" });
    });

    it("harus 200 tanpa auth (publik) dan mengembalikan konten HTML", async () => {
      mockQuery.mockResolvedValueOnce(
        ok([
          {
            id: 10,
            id_penyakit: 1,
            status: "terbit",
            konten: "<h2>Gejala</h2><p>batuk</p>",
            ditinjau_pada: null,
            diperbarui_pada: "2026-11-16T00:00:00.000Z",
          },
        ]),
      );

      const res = await request(app).get("/api/artikel/1");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 10,
        id_penyakit: 1,
        status: "terbit",
        konten: "<h2>Gejala</h2><p>batuk</p>",
        ditinjau_pada: null,
        diperbarui_pada: "2026-11-16T00:00:00.000Z",
      });
    });

    it("harus 404 jika penyakit belum punya artikel", async () => {
      mockQuery.mockResolvedValueOnce(ok([]));

      const res = await request(app).get("/api/artikel/999");
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tidak ditemukan/);
    });
  });

  describe("PUT /api/artikel/:idPenyakit (admin only)", () => {
    const url = "/api/artikel/1";
    const adminToken = () => signToken({ role: "admin" });
    const payload = {
      konten: "<h2>Gejala</h2><p>batuk <script>alert(1)</script><strong>berat</strong></p>",
    };

    it("harus 401 tanpa token", async () => {
      const res = await request(app).put(url).send(payload);
      expect(res.status).toBe(401);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 403 untuk role user", async () => {
      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`)
        .send(payload);
      expect(res.status).toBe(403);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 422 bila konten kosong setelah strip HTML", async () => {
      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ konten: "<p><br></p>" });
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: expect.any(String), field: "konten" });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 422 bila konten melebihi 200 KB", async () => {
      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ konten: "<p>" + "a".repeat(210 * 1024) + "</p>" });
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: expect.any(String), field: "konten" });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 422 bila status di luar draft/terbit", async () => {
      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ ...payload, status: "published" });
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: expect.any(String), field: "status" });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("harus 422 bila konten bukan string", async () => {
      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ konten: 123 });
      expect(res.status).toBe(422);
      expect(res.body.field).toBe("konten");
    });

    it("harus 404 bila penyakit tidak ada", async () => {
      mockQuery.mockResolvedValueOnce(ok([])); // SELECT penyakit

      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send(payload);
      expect(res.status).toBe(404);
    });

    it("harus update artikel yang ada, mengembalikan konten tersanitasi, dan picu re-embed", async () => {
      mockQuery
        .mockResolvedValueOnce(ok([{ id: 1 }])) // penyakit ada
        .mockResolvedValueOnce(ok([{ id: 10 }])) // artikel sudah ada
        .mockResolvedValueOnce(
          ok([{ id: 10, diperbarui_pada: "2026-11-16T01:00:00.000Z" }]),
        ); // UPDATE ... RETURNING

      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(10);
      // <script> dibuang, <strong> dipertahankan.
      expect(res.body.konten).toBe(
        "<h2>Gejala</h2><p>batuk <strong>berat</strong></p>",
      );
      expect(res.body.diperbarui_pada).toBe("2026-11-16T01:00:00.000Z");

      const updateCall = mockQuery.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.includes("UPDATE artikel"),
      );
      expect(updateCall[1]).toEqual([
        "<h2>Gejala</h2><p>batuk <strong>berat</strong></p>",
        // konten_teks: teks polos hasil htmlToPlainText
        "Gejala\nbatuk berat",
        10,
      ]);

      // Re-embedding dijalankan setelah respons dikirim (fire-and-forget).
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/ingest-article"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id_artikel: 10 }),
        }),
      );
    });

    it("harus insert artikel baru bila penyakit belum punya artikel", async () => {
      mockQuery
        .mockResolvedValueOnce(ok([{ id: 1 }])) // penyakit ada
        .mockResolvedValueOnce(ok([])) // artikel belum ada
        .mockResolvedValueOnce(
          ok([{ id: 11, diperbarui_pada: "2026-11-16T02:00:00.000Z" }]),
        ); // INSERT ... RETURNING

      const res = await request(app)
        .put(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ ...payload, status: "terbit" });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(11);
      const insertCall = mockQuery.mock.calls.find(
        ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO artikel"),
      );
      expect(insertCall[1]).toEqual([
        1,
        "terbit",
        "<h2>Gejala</h2><p>batuk <strong>berat</strong></p>",
        "Gejala\nbatuk berat",
      ]);
    });
  });

  describe("POST /api/artikel/upload-gambar (admin only)", () => {
    const url = "/api/artikel/upload-gambar";
    const adminToken = () => signToken({ role: "admin" });
    const PNG_HEADER = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("harus 401 tanpa token", async () => {
      const res = await request(app).post(url);
      expect(res.status).toBe(401);
    });

    it("harus 403 untuk role user", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${signToken({ role: "user" })}`);
      expect(res.status).toBe(403);
    });

    it("harus 400 ketika tidak ada file terlampir", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${adminToken()}`);
      expect(res.status).toBe(400);
    });

    it("harus 415 untuk file palsu ber-ekstensi .jpg (magic bytes bukan gambar)", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .attach("gambar", Buffer.from("bukan gambar sama sekali"), {
          filename: "peluru.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(415);
    });

    it("harus 413 untuk file di atas 2 MB", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .attach("gambar", Buffer.alloc(2 * 1024 * 1024 + 1, 0xff), {
          filename: "besar.png",
          contentType: "image/png",
        });
      expect(res.status).toBe(413);
    });

    it("harus 201 dan URL publik untuk png valid (nama file UUID)", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .attach("gambar", PNG_HEADER, { filename: "asli.png", contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(
        /^http:\/\/localhost:4000\/uploads\/artikel\/[0-9a-f-]{36}\.png$/,
      );

      const fs = require("fs");
      const path = require("path");
      const filename = res.body.url.split("/").pop();
      const filepath = path.join(config.uploadsDir, "artikel", filename);
      expect(fs.existsSync(filepath)).toBe(true);
      fs.rmSync(filepath, { force: true });
    });

    it("harus 415 untuk webp palsu (header RIFF tanpa WEBP)", async () => {
      const res = await request(app)
        .post(url)
        .set("Authorization", `Bearer ${adminToken()}`)
        .attach("gambar", Buffer.concat([Buffer.from("RIFF\u0000\u0000\u0000\u0000XXXX"), Buffer.alloc(16)]), {
          filename: "palsu.webp",
          contentType: "image/webp",
        });
      expect(res.status).toBe(415);
    });
  });

  // --- ROUTE DUPLIKAT TANPA PREFIX SUDAH DIHAPUS ---
  describe("Route tanpa prefix /api", () => {
    it("harus 404 pada /auth/register (prefix tidak lagi dilayani di path root)", async () => {
      const res = await request(app).post("/auth/register");
      expect(res.status).toBe(404);
    });

    it("harus 404 pada /riwayat", async () => {
      const res = await request(app).get("/riwayat");
      expect(res.status).toBe(404);
    });
  });
});