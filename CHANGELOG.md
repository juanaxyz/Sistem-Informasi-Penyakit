# Changelog

Catatan perubahan penting pada project.

## [2026-09-26] — Service Python terpadu + analisis per bagian tubuh

### Struktur monorepo (BREAKING)

- `RAG/` dan `Analisis/` digabung menjadi satu folder **`service/`**
  (FastAPI, port `8000`).
- Satu perintah run melayani chat RAG (`POST /api/rag/chat`) dan analisis
  citra (`POST /api/prediksi`).
- Konfigurasi `server`: `MODEL_API_URL` default sekarang mengikuti
  `RAG_API_URL` (`http://localhost:8000`) — cukup satu service.
- Referensi path di `README.md`, `docs/*`, dan `.gitignore` diperbarui.
- `service/.env.example` baru: `GEMINI_API_KEY`, `SUPABASE_URL/KEY`,
  `ALLOW_STUB`, `MODELS_DIR`, dll.

### server

- Alur analisis riwayat nyata: upload multipart → `server/uploads/` →
  BFF memanggil service `/api/prediksi` → 3 prediksi disimpan
  (auto-sync tabel `model`, alias label→penyakit di `riwayat.controller.js`).
- Endpoint baru `GET /api/jenis-analisis/byBody/:idBody` — daftar jenis
  analisis aktif untuk satu bagian tubuh via `jenis_analisis_bagian_tubuh`.
- `confidence` dikirim sebagai angka (`::float8`); memperbaiki
  `confidence.toFixed(...)` yang gagal di frontend karena `numeric`
  Postgres dibaca `pg` sebagai string.
- Admin: dashboard, manajemen patogen, dan util many-to-many.

### frontend

- Halaman analisis baru: klik bagian tubuh → modal menampilkan hanya jenis
  analisis yang tersedia untuk bagian tersebut (kini dada kiri & dada kanan)
  — `AnalysisPage.tsx` + hook `useAnalysesByBodyPart`.
- `XRayAnalysisPage.tsx` direname menjadi `AnalysisPage.tsx` dengan route
  `/analisis`; label "Analisis" di dock, menu, dan home.
- Halaman admin dashboard dan detail patogen; menu pengguna overlay.

### service

- FastAPI gabungan: endpoint chat (`/api/rag/chat`) + prediksi
  (`/api/prediksi`) + `/health` (status RAG + tiap model citra).
- Modul prediksi dipindah dari `Analisis/` (`model_loader.py`,
  `predictions.py`) dengan registri `MODELS` di `app/config.py`.
- Client Gemini/Supabase dibuat **lazy** agar service tetap bisa dinyalakan
  tanpa key (prediksi tetap jalan).
- Tanpa file `.onnx` dan `ALLOW_STUB=1`, prediksi memakai fallback
  deterministik (ditandai `stub: true`).