const request = require("supertest");

// 1. Mock Supabase sebelum server di-require
const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// 2. Mock global fetch untuk pengujian endpoint RAG Chat
global.fetch = jest.fn();

const app = require("./server");

// Helper untuk membuat chaining mock Supabase Query Builder
const createQueryBuilder = (result) => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    // Menangani kueri async yang langsung di-await tanpa method akhiran
    then: (resolve) => resolve(result),
  };
  return builder;
};

describe("API Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- HEALTH CHECK ---
  describe("GET /", () => {
    it("harus mengembalikan status 200 dan { ok: true }", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  // --- BAGIAN TUBUH ---
  describe("GET /api/bagian-tubuh", () => {
    it("harus mengembalikan daftar bagian tubuh", async () => {
      const mockData = [{ id: 1, nama: "Kepala", tampilan: "front" }];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: mockData, error: null }),
      );

      const res = await request(app).get("/api/bagian-tubuh");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ bagian_tubuh: mockData });
    });

    it("harus mengembalikan 500 jika Supabase mengalami error", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: null, error: new Error("Database error") }),
      );

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

    it("harus menghitung `jumlah_penyakit` dan me-deduplikasi sistem tubuh", async () => {
      const mockRawData = [
        { penyakit: { sistem_tubuh: { id: 10, nama: "Saraf" } } },
        { penyakit: { sistem_tubuh: { id: 10, nama: "Saraf" } } }, // Duplikat sistem
      ];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: mockRawData, error: null }),
      );

      const res = await request(app).get("/api/sistem-tubuh/byBody/1");
      expect(res.status).toBe(200);
      expect(res.body.sistem_tubuh).toEqual([
        { id: 10, nama: "Saraf", jumlah_penyakit: 2 },
      ]);
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
      const mockPenyakit = [{ id: 1, nama: "Migrain" }];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: mockPenyakit, error: null }),
      );

      const res = await request(app).get("/api/penyakit/bySystemAndBody/1/2");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ penyakit: mockPenyakit });
    });
  });

  // --- PENCARIAN PENYAKIT ---
  describe("GET /api/penyakit/cari", () => {
    it("harus mengembalikan array kosong jika query 'q' tidak diisi", async () => {
      const res = await request(app).get("/api/penyakit/cari");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ penyakit: [] });
    });

    it("harus meng-escape karakter khusus dan me-deduplikasi hasil pencarian", async () => {
      const mockDataNama = [{ id: 1, nama: "Flu" }];
      const mockDataRingkasan = [
        { id: 1, nama: "Flu" },
        { id: 2, nama: "Batuk" },
      ];

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({ data: mockDataNama, error: null }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: mockDataRingkasan, error: null }),
        );

      const res = await request(app).get("/api/penyakit/cari?q=Fl*u%");
      expect(res.status).toBe(200);
      expect(res.body.penyakit.length).toBe(2);
      expect(res.body.penyakit[0].nama).toBe("Batuk"); // Terurut secara alfabetis
      expect(res.body.penyakit[1].nama).toBe("Flu");
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
      const mockArtikel = [{ id: 100, konten: "Penjelasan penyakit..." }];
      mockFrom.mockReturnValue(
        createQueryBuilder({ data: mockArtikel, error: null }),
      );

      const res = await request(app).get("/api/penyakit/1/konten");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ konten: mockArtikel });
    });
  });

  // --- DETAIL LENGKAP PENYAKIT ---
  describe("GET /api/penyakit/:idPenyakit", () => {
    it("harus 404 jika detail penyakit tidak ditemukan", async () => {
      mockFrom
        .mockReturnValueOnce(createQueryBuilder({ data: null, error: null })) // diseaseRes
        .mockReturnValueOnce(createQueryBuilder({ data: [], error: null })) // artikelRes
        .mockReturnValueOnce(createQueryBuilder({ data: [], error: null })) // bagianRes
        .mockReturnValueOnce(createQueryBuilder({ data: [], error: null })); // referensiRes

      const res = await request(app).get("/api/penyakit/999");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "penyakit tidak ditemukan" });
    });

    it("harus menggabungkan data penyakit, artikel, bagian tubuh, dan referensi", async () => {
      const diseaseData = { id: 1, nama: "Maag" };
      const artikelData = [{ id: 10, konten: "Konten Maag" }];
      const bagianData = [{ bagian_tubuh: { id: 5, nama: "Lambung" } }];
      const refData = [{ id: 1, url: "https://example.com" }];

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({ data: diseaseData, error: null }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: artikelData, error: null }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: bagianData, error: null }),
        )
        .mockReturnValueOnce(
          createQueryBuilder({ data: refData, error: null }),
        );

      const res = await request(app).get("/api/penyakit/1");
      expect(res.status).toBe(200);
      expect(res.body.penyakit).toEqual({
        ...diseaseData,
        artikel: artikelData,
        bagian_tubuh: [{ id: 5, nama: "Lambung" }],
        referensi: refData,
      });
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
          dibuat_pada: "2026-09-13T00:00:00Z",
        };
        mockRpc.mockResolvedValueOnce({ data: [mockUser], error: null });

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
    });

    describe("POST /api/auth/login", () => {
      it("harus 400 jika identifier/password kosong", async () => {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ identifier: "" });
        expect(res.status).toBe(400);
      });

      it("harus 401 jika user tidak ditemukan", async () => {
        mockRpc.mockResolvedValueOnce({ data: [], error: null });
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
    });
  });
});
