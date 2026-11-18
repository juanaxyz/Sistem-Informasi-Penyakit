-- Rollback 001: kolom konten_teks dihapus.
-- konten HTML hasil konversi TIDAK ditarik balik — selama migrasi 002 belum
-- dijalankan, data artikel_bagian lama masih utuh di tabel tersebut.

DROP INDEX IF EXISTS idx_artikel_konten_teks_trgm;

ALTER TABLE artikel DROP COLUMN IF EXISTS konten_teks;
