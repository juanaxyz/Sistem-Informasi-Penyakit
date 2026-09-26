-- Skema tambahan untuk BFF web-paru-paru (PostgreSQL lokal).
-- Aman dijalankan ulang (idempotent). Tabel inti (penyakit, bagian_tubuh,
-- sistem_tubuh, model, dll.) diasumsikan sudah ada.
--
-- Pengecualian: `referensi` ikut didefinisikan di sini karena kini dikelola
-- BFF (form penyakit di panel admin menyimpan daftar URL), jadi harus bisa
-- dibuat ulang dari repo ini.

CREATE TABLE IF NOT EXISTS users (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama            varchar NOT NULL,
    email           varchar NOT NULL UNIQUE,
    username        varchar NOT NULL UNIQUE,
    password        varchar NOT NULL,
    role            varchar NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    dibuat_pada     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riwayat (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gambar          text NOT NULL,
    status          varchar NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    dibuat_pada     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS riwayat_user_id_idx ON riwayat(user_id);

CREATE TABLE IF NOT EXISTS prediksi (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    riwayat_id   integer NOT NULL REFERENCES riwayat(id) ON DELETE CASCADE,
    model_id     integer NOT NULL REFERENCES model(id),
    id_penyakit  integer NOT NULL REFERENCES penyakit(id),
    confidence   numeric(5, 4) NOT NULL,
    dibuat_pada  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS prediksi_riwayat_id_idx ON prediksi(riwayat_id);

CREATE TABLE IF NOT EXISTS artikel (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_penyakit    integer NOT NULL REFERENCES penyakit(id) ON DELETE CASCADE,
    status         varchar,
    konten         text,
    ditinjau_pada  timestamp,
    dibuat_pada    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS artikel_id_penyakit_idx ON artikel(id_penyakit);

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

-- Daftar URL sumber per penyakit, ditampilkan di halaman detail penyakit.
-- Mengikuti bentuk tabel yang sudah ada di capstone_paru: `id_penyakit` tanpa
-- ON DELETE CASCADE dan tanpa `diperbarui_pada` (sinkronisasi_admin memakai
-- pola delete + insert ulang, lihat admin-penyakit.controller.js).
-- `url` sengaja boleh NULL dan tidak unik supaya baris lama yang tidak punya
-- tautan tidak menghalangi, meski normalisasi di controller menolak URL invalid.
CREATE TABLE IF NOT EXISTS referensi (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_penyakit  integer NOT NULL REFERENCES penyakit(id),
    url          text,
    dibuat_pada  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS referensi_id_penyakit_idx ON referensi(id_penyakit);
