-- 001: artikel.konten_teks + konversi data lama (artikel_bagian / konten plain) ke HTML
-- Bisa di-rollback dengan 001-artikel-konten-html.down.sql.
-- Urutan: (1) migrasi ini, (2) node scripts/backfill-konten-teks.js, (3) verifikasi,
--         (4) 002-drop-artikel-bagian.up.sql.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE artikel ADD COLUMN IF NOT EXISTS konten_teks text;

-- Konversi teks polos lama menjadi HTML:
--   escape &, <, >, " lalu pecah per baris kosong menjadi <p> dan
--   sisa baris tunggal menjadi <br>.
CREATE OR REPLACE FUNCTION migration_001_plain_to_html(plain text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    esc text;
    parts text[];
    section text;
    i int;
BEGIN
    IF plain IS NULL OR btrim(plain) = '' THEN
        RETURN '';
    END IF;

    esc := replace(plain, E'\r\n', E'\n');
    esc := replace(esc, '&', '&amp;');
    esc := replace(esc, '<', '&lt;');
    esc := replace(esc, '>', '&gt;');
    esc := replace(esc, '"', '&quot;');

    parts := regexp_split_to_array(esc, '\n\s*\n');
    FOR i IN 1 .. array_length(parts, 1) LOOP
        section := btrim(parts[i]);
        IF section <> '' THEN
            section := replace(section, E'\n', '<br>');
            parts[i] := '<p>' || section || '</p>';
        ELSE
            parts[i] := NULL;
        END IF;
    END LOOP;

    RETURN array_to_string(parts, E'\n');
END;
$$;

-- 1. Artikel dengan bagian: gabungkan artikel_bagian (urut urutan) menjadi
--    satu HTML per artikel: <h2>{judul atau tipe}</h2> + paragraf.
UPDATE artikel a
SET konten = (
    SELECT string_agg(
        '<h2>' || migration_001_plain_to_html(COALESCE(b.judul, b.tipe)) || '</h2>'
        || E'\n'
        || migration_001_plain_to_html(b.konten),
        E'\n'
        ORDER BY b.urutan
    )
    FROM artikel_bagian b
    WHERE b.id_artikel = a.id
      AND COALESCE(btrim(b.konten), '') <> ''
)
WHERE EXISTS (
    SELECT 1 FROM artikel_bagian b
    WHERE b.id_artikel = a.id AND COALESCE(btrim(b.konten), '') <> ''
);

-- 2. Artikel tanpa bagian tapi konten lama terisi: konversi sama.
UPDATE artikel a
SET konten = migration_001_plain_to_html(a.konten)
WHERE COALESCE(btrim(a.konten), '') <> ''
  AND NOT EXISTS (
      SELECT 1 FROM artikel_bagian b
      WHERE b.id_artikel = a.id AND COALESCE(btrim(b.konten), '') <> ''
  );

CREATE INDEX IF NOT EXISTS idx_artikel_konten_teks_trgm
    ON artikel USING gin (konten_teks gin_trgm_ops);

DROP FUNCTION IF EXISTS migration_001_plain_to_html(text);
