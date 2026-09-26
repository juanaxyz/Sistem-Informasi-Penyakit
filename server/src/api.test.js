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

    it("harus menggabungkan data penyakit, artikel, bagian tubuh, dan referensi", async () => {
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
              status: "published",
              ditinjau_pada: null,
              bagian_id: 1,
              tipe: "konten",
              judul: "Pengertian",
              urutan: 1,
              konten: "Konten Maag",
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
        artikel: [
          {
            id: 10,
            status: "published",
            ditinjau_pada: null,
            bagian: [
              { id: 1, tipe: "konten", judul: "Pengertian", urutan: 1, konten: "Konten Maag" },
            ],
          },
        ],
        bagian_tubuh: [{ id: 5, nama: "Lambung", tampilan: "depan" }],
        referensi: [{ id: 1, url: "https://example.com" }],
        patogen: [{ id: 7, nama: "Helicobacter pylori", jenis: "bakteri" }],
      });
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