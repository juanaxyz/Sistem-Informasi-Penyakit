-- 006_renumber_body_parts.sql
-- ---------------------------------------------------------------------------
-- Renumber `bagian_tubuh.id` dari 0–72 menjadi 1–73 (menghilangkan id 0).
--
-- Latar belakang:
--   `src/assets/body-parts.ts` memakai id 0–72 yang harus identik dengan
--   `bagian_tubuh.id` di DB (lihat DESIGN.md). Id 0 menyulitkan frontend
--   karena falsy (mis. `selectedPartId ? ... : null` gagal untuk 0).
--   Shift semua id +1 menjaga pemetaan nama/geometri tetap sama.
--
-- Catatan teknis:
--   `bagian_tubuh.id` adalah INTEGER PRIMARY KEY tanpa sequence, jadi
--   renumber cukup via kolom sementara. `UPDATE ... SET id = id + 1`
--   langsung GAGAL karena constraint unik dicek per-baris. FK
--   `penyakit_bagian_tubuh` dilepas lalu dipasang kembali karena kolom id
--   di-drop, bukan sekadar di-update.
-- ---------------------------------------------------------------------------

-- 1) Lepas FK sementara
ALTER TABLE penyakit_bagian_tubuh DROP CONSTRAINT fk_pbt_bagian;
ALTER TABLE penyakit_bagian_tubuh DROP CONSTRAINT penyakit_bagian_tubuh_pkey;

-- 2) bagian_tubuh: shift id via kolom sementara
ALTER TABLE bagian_tubuh DROP CONSTRAINT bagian_tubuh_pkey;
ALTER TABLE bagian_tubuh ADD COLUMN id_baru INTEGER;
UPDATE bagian_tubuh SET id_baru = id + 1;

-- 3) penyakit_bagian_tubuh: remap referensi mengikuti id_baru
ALTER TABLE penyakit_bagian_tubuh ADD COLUMN id_bagian_baru INTEGER;
UPDATE penyakit_bagian_tubuh pbt
   SET id_bagian_baru = bt.id_baru
  FROM bagian_tubuh bt
 WHERE bt.id = pbt.id_bagian_tubuh;

-- 4) Bagian_tubuh: jadikan id_baru sebagai id baru
ALTER TABLE bagian_tubuh DROP COLUMN id;
ALTER TABLE bagian_tubuh RENAME COLUMN id_baru TO id;
ALTER TABLE bagian_tubuh ALTER COLUMN id SET NOT NULL;
ALTER TABLE bagian_tubuh ADD CONSTRAINT bagian_tubuh_pkey PRIMARY KEY (id);

-- 5) penyakit_bagian_tubuh: gunakan id_bagian_baru
ALTER TABLE penyakit_bagian_tubuh DROP COLUMN id_bagian_tubuh;
ALTER TABLE penyakit_bagian_tubuh RENAME COLUMN id_bagian_baru TO id_bagian_tubuh;
ALTER TABLE penyakit_bagian_tubuh ALTER COLUMN id_bagian_tubuh SET NOT NULL;
ALTER TABLE penyakit_bagian_tubuh ADD PRIMARY KEY (id_penyakit, id_bagian_tubuh);
ALTER TABLE penyakit_bagian_tubuh
  ADD CONSTRAINT fk_pbt_bagian
  FOREIGN KEY (id_bagian_tubuh)
  REFERENCES bagian_tubuh(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- 6) Kembalikan indeks pencarian
CREATE INDEX IF NOT EXISTS idx_pbt_bagian ON penyakit_bagian_tubuh(id_bagian_tubuh);
