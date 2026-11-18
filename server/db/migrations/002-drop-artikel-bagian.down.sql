-- Rollback 002: buat ulang struktur tabel artikel_bagian (KOSONG — data lama
-- tidak dapat dipulihkan; ini hanya mengembalikan bentuk skema).

CREATE TABLE IF NOT EXISTS artikel_bagian (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_artikel     integer NOT NULL REFERENCES artikel(id) ON DELETE CASCADE,
    tipe           varchar NOT NULL DEFAULT 'lainnya',
    judul          varchar,
    konten         text NOT NULL DEFAULT '',
    urutan         integer NOT NULL DEFAULT 0,
    dibuat_pada    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS artikel_bagian_id_artikel_idx ON artikel_bagian(id_artikel);
