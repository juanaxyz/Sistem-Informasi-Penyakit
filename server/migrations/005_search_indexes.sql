-- 005: Pencarian teks (pg_trgm) & trigger timestamp
--
-- Isi migrasi:
--   1. Aktifkan ekstensi `pg_trgm` untuk pencarian teks berbasis trigram,
--      yang mendukung pola ILIKE '%...%' memakai GIN index.
--   2. GIN index pg_trgm pada `penyakit(nama)` dan `penyakit(ringkasan)`
--      agar query pencarian di endpoint /api/search tetap cepat walau
--      menggunakan pola LIKE di awal string.
--   3. Fungsi `set_diperbarui_pada()` + trigger BEFORE UPDATE yang
--      memperbarui kolom `diperbarui_pada` secara otomatis pada tabel
--      yang memiliki kolom tersebut: `sistem_tubuh`, `bagian_tubuh`,
--      `penyakit`, `konten_penyakit`. (`gambar_konten` & `referensi`
--      tidak punya kolom `diperbarui_pada` sehingga tidak di-trigger.)
--
-- Idempotent: aman dijalankan ulang
-- (CREATE ... IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
--
-- Jalankan lewat: npm run db:setup (di folder server/).

-- ---------------------------------------------------------------------------
-- 1) Ekstensi pg_trgm
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2) GIN index pg_trgm untuk pencarian ILIKE '%...%'
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_penyakit_nama_trgm
    ON penyakit USING GIN (nama gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_penyakit_ringkasan_trgm
    ON penyakit USING GIN (ringkasan gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3) Trigger set_diperbarui_pada (BEFORE UPDATE)
-- ---------------------------------------------------------------------------

-- Fungsi bersama: set kolom `diperbarui_pada` ke waktu saat ini.
-- Dipakai oleh semua tabel yang memiliki kolom `diperbarui_pada`.
CREATE OR REPLACE FUNCTION set_diperbarui_pada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.diperbarui_pada := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- sistem_tubuh
DROP TRIGGER IF EXISTS set_diperbarui_pada_trigger ON sistem_tubuh;
CREATE TRIGGER set_diperbarui_pada_trigger
    BEFORE UPDATE ON sistem_tubuh
    FOR EACH ROW
    EXECUTE FUNCTION set_diperbarui_pada();

-- bagian_tubuh
DROP TRIGGER IF EXISTS set_diperbarui_pada_trigger ON bagian_tubuh;
CREATE TRIGGER set_diperbarui_pada_trigger
    BEFORE UPDATE ON bagian_tubuh
    FOR EACH ROW
    EXECUTE FUNCTION set_diperbarui_pada();

-- penyakit
DROP TRIGGER IF EXISTS set_diperbarui_pada_trigger ON penyakit;
CREATE TRIGGER set_diperbarui_pada_trigger
    BEFORE UPDATE ON penyakit
    FOR EACH ROW
    EXECUTE FUNCTION set_diperbarui_pada();

-- konten_penyakit
DROP TRIGGER IF EXISTS set_diperbarui_pada_trigger ON konten_penyakit;
CREATE TRIGGER set_diperbarui_pada_trigger
    BEFORE UPDATE ON konten_penyakit
    FOR EACH ROW
    EXECUTE FUNCTION set_diperbarui_pada();
