-- 004: Redesign ke skema Indonesia (sesuai context/DATABASE.md)
--      + migrasi data dari skema Inggris lama (diseases/body_parts/body_systems).
--
-- Jalankan lewat: npm run db:setup (di folder server/).
--
-- Catatan:
-- - Skema baru mungkin sudah dibuat manual (DBeaver) — CREATE ... IF NOT EXISTS
--   membuat bagian yang belum ada, sisanya no-op.
-- - Data dipindahkan hanya bila tabel lama masih ada DAN tabel baru masih kosong.
-- - Tabel lama (Inggris) sengaja TIDAK dihapus, sebagai cadangan.

-- ---------------------------------------------------------------------------
-- 1) Skema baru (no-op bila sudah dibuat)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sistem_tubuh (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    deskripsi TEXT,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bagian_tubuh (
    id INTEGER PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    tampilan VARCHAR(10) NOT NULL
        CHECK (tampilan IN ('depan', 'belakang')),
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bagian_tampilan ON bagian_tubuh(tampilan);

CREATE TABLE IF NOT EXISTS penyakit (
    id SERIAL PRIMARY KEY,
    id_sistem_tubuh INTEGER NOT NULL
        REFERENCES sistem_tubuh(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    nama VARCHAR(150) NOT NULL,
    slug VARCHAR(170) NOT NULL UNIQUE,
    ringkasan TEXT,
    tingkat_urgensi VARCHAR(20)
        NOT NULL DEFAULT 'normal'
        CHECK (tingkat_urgensi IN ('normal', 'waspada', 'darurat')),
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_penyakit_sistem ON penyakit(id_sistem_tubuh);
CREATE INDEX IF NOT EXISTS idx_penyakit_slug ON penyakit(slug);

CREATE TABLE IF NOT EXISTS konten_penyakit (
    id SERIAL PRIMARY KEY,
    id_penyakit INTEGER NOT NULL
        REFERENCES penyakit(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    judul VARCHAR(150) NOT NULL,
    slug VARCHAR(170) NOT NULL,
    isi TEXT NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 1,
    tampilkan BOOLEAN NOT NULL DEFAULT TRUE,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_konten_slug UNIQUE(id_penyakit, slug)
);

CREATE INDEX IF NOT EXISTS idx_konten_penyakit ON konten_penyakit(id_penyakit);
CREATE INDEX IF NOT EXISTS idx_konten_urutan ON konten_penyakit(urutan);

CREATE TABLE IF NOT EXISTS gambar_konten (
    id SERIAL PRIMARY KEY,
    id_konten INTEGER NOT NULL
        REFERENCES konten_penyakit(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    url_gambar VARCHAR(255) NOT NULL,
    caption VARCHAR(255),
    urutan INTEGER NOT NULL DEFAULT 1,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gambar_konten ON gambar_konten(id_konten);

CREATE TABLE IF NOT EXISTS penyakit_bagian_tubuh (
    id_penyakit INTEGER NOT NULL
        REFERENCES penyakit(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    id_bagian_tubuh INTEGER NOT NULL
        REFERENCES bagian_tubuh(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    PRIMARY KEY (id_penyakit, id_bagian_tubuh)
);

CREATE INDEX IF NOT EXISTS idx_pbt_bagian ON penyakit_bagian_tubuh(id_bagian_tubuh);

CREATE TABLE IF NOT EXISTS referensi (
    id SERIAL PRIMARY KEY,
    id_penyakit INTEGER NOT NULL
        REFERENCES penyakit(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    sumber VARCHAR(255),
    url TEXT,
    tahun INTEGER,
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referensi_penyakit ON referensi(id_penyakit);

-- ---------------------------------------------------------------------------
-- 2) Migrasi data dari skema lama (hanya bila tabel lama ada & tabel baru kosong)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION _slugify(text) RETURNS text
AS $$
    SELECT lower(regexp_replace(regexp_replace(trim($1), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

DO $$
BEGIN
    -- sistem_tubuh ← body_systems
    IF to_regclass('public.body_systems') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sistem_tubuh) THEN
        INSERT INTO sistem_tubuh (id, nama, slug, deskripsi)
        SELECT id, nama, _slugify(nama), deskripsi
        FROM body_systems;
    END IF;

    -- bagian_tubuh ← body_parts (slug = kode_svg + sisi, contoh "kepala-depan")
    IF to_regclass('public.body_parts') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM bagian_tubuh) THEN
        INSERT INTO bagian_tubuh (id, nama, slug, tampilan)
        SELECT id, nama, kode_svg || '-' || side, side
        FROM body_parts;
    END IF;

    -- penyakit ← diseases (id tetap sama; urgensi disamakan: ringan/sedang/serius → normal/waspada/darurat)
    IF to_regclass('public.diseases') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM penyakit) THEN
        INSERT INTO penyakit (id, id_sistem_tubuh, nama, slug, ringkasan, tingkat_urgensi)
        SELECT d.id,
               (SELECT MIN(dbs.body_system_id)
                  FROM disease_body_system dbs
                 WHERE dbs.disease_id = d.id),
               d.nama,
               _slugify(d.nama),
               d.deskripsi,
               CASE d.tingkat_urgensi
                   WHEN 'ringan' THEN 'normal'
                   WHEN 'sedang' THEN 'waspada'
                   WHEN 'serius' THEN 'darurat'
                   ELSE 'normal'
               END
        FROM diseases d;
    END IF;

    -- konten_penyakit ← kolom detail di diseases
    IF to_regclass('public.diseases') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM konten_penyakit) THEN
        INSERT INTO konten_penyakit (id_penyakit, judul, slug, isi, urutan)
        SELECT id, 'Penyebab', 'penyebab', penyebab, 1 FROM diseases
        WHERE penyebab IS NOT NULL AND length(trim(penyebab)) > 0
        UNION ALL
        SELECT id, 'Pencegahan', 'pencegahan', pencegahan, 2 FROM diseases
        WHERE pencegahan IS NOT NULL AND length(trim(pencegahan)) > 0
        UNION ALL
        SELECT id, 'Pengobatan', 'pengobatan', pengobatan, 3 FROM diseases
        WHERE pengobatan IS NOT NULL AND length(trim(pengobatan)) > 0
        UNION ALL
        SELECT id, 'Kapan ke Dokter', 'kapan-ke-dokter', kapan_ke_dokter, 4 FROM diseases
        WHERE kapan_ke_dokter IS NOT NULL AND length(trim(kapan_ke_dokter)) > 0;
    END IF;

    -- penyakit_bagian_tubuh ← disease_body_part
    IF to_regclass('public.disease_body_part') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM penyakit_bagian_tubuh) THEN
        INSERT INTO penyakit_bagian_tubuh (id_penyakit, id_bagian_tubuh)
        SELECT disease_id, body_part_id
        FROM disease_body_part;
    END IF;
END $$;

DROP FUNCTION _slugify(text);

-- Lanjutkan sequence agar id baru tidak bentrok dengan data hasil migrasi.
SELECT setval(pg_get_serial_sequence('sistem_tubuh', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM sistem_tubuh), 1));
SELECT setval(pg_get_serial_sequence('penyakit', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM penyakit), 1));
SELECT setval(pg_get_serial_sequence('konten_penyakit', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM konten_penyakit), 1));
SELECT setval(pg_get_serial_sequence('referensi', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM referensi), 1));
SELECT setval(pg_get_serial_sequence('gambar_konten', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM gambar_konten), 1));

-- ---------------------------------------------------------------------------
-- 3) Row Level Security — public read (paralel dengan skema lama)
-- ---------------------------------------------------------------------------

ALTER TABLE sistem_tubuh ENABLE ROW LEVEL SECURITY;
ALTER TABLE bagian_tubuh ENABLE ROW LEVEL SECURITY;
ALTER TABLE penyakit ENABLE ROW LEVEL SECURITY;
ALTER TABLE konten_penyakit ENABLE ROW LEVEL SECURITY;
ALTER TABLE gambar_konten ENABLE ROW LEVEL SECURITY;
ALTER TABLE penyakit_bagian_tubuh ENABLE ROW LEVEL SECURITY;
ALTER TABLE referensi ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['sistem_tubuh', 'bagian_tubuh', 'penyakit', 'konten_penyakit', 'gambar_konten', 'penyakit_bagian_tubuh', 'referensi']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'public_read_' || tbl
        ) THEN
            EXECUTE format('CREATE POLICY "public_read_%s" ON %I FOR SELECT USING (true)', tbl, tbl);
        END IF;
    END LOOP;
END $$;
