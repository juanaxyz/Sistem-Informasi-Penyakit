-- !!! JALANKAN SETELAH VERIFIKASI (lihat urutan migrasi di docs/DATABASE.md) !!!
--
-- Setelah migrasi 001 + backfill konten_teks terverifikasi:
--   1. periksa beberapa artikel: konten berisi HTML, konten_teks berisi teks
--      polos yang sesuai, knowledge_embeddings sudah di-embed ulang;
--   2. backup database;
--   3. baru jalankan migrasi ini.
--
-- Tabel artikel_bagian sudah tidak dipakai aplikasi. Data di dalamnya tidak
-- bisa dipulihkan setelah DROP.

DROP TABLE IF EXISTS artikel_bagian;
