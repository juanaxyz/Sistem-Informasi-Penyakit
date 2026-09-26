# Referensi API (BFF)

Base URL: `http://localhost:4000` (override lewat `VITE_API_URL`/`PORT`).
Seluruh endpoint berada di bawah prefix `/api`.

## Konvensi

### Autentikasi

Endpoint bertanda 🔒 membutuhkan header:

```
Authorization: Bearer <token-JWT>
```

Dapatkan token dari `POST /api/auth/login` (atau `register`).

### Bentuk Respons

- Sukses: objek JSON dengan key per domain, contoh `{ "penyakit": [...] }`.
- Error: `{ "error": "pesan" }`, opsional `{ "details": {...} }`.
- Status umum: `400` validasi, `401` belum login, `403` tidak diizinkan,
  `404` tidak ditemukan, `409` bentrok unik, `500` kesalahan server.

### Status Role

- `public` — tanpa token
- `user` — token role apa pun
- `admin` — token role `admin`

---

## Ringkasan Endpoint

| Method | Path                                   | Akses    | Keterangan                                   |
| ------ | -------------------------------------- | -------- | -------------------------------------------- |
| GET    | `/`                                    | public   | Health check singkat `{ ok: true }`          |
| GET    | `/health`                              | public   | Status + timestamp server                    |
| POST   | `/api/auth/register`                   | public   | Buat akun baru                               |
| POST   | `/api/auth/login`                      | public   | Login (email/username + password)            |
| POST   | `/api/auth/logout`                     | public   | Logout (tak ada state server)                |
| GET    | `/api/auth/me`                         | user     | Profil pengguna terautentikasi               |
| PUT    | `/api/auth/me`                         | user     | Perbarui profil (nama/email/username/password) |
| GET    | `/api/bagian-tubuh`                    | public   | Daftar bagian tubuh (peta)                   |
| GET    | `/api/sistem-tubuh`                    | public   | Daftar sistem organ                          |
| GET    | `/api/sistem-tubuh/byBody/:idBody`     | public   | Sistem organ untuk satu bagian tubuh          |
| GET    | `/api/jenis-analisis/byBody/:idBody`   | public   | Jenis analisis tersedia untuk satu bagian tubuh (hanya `is_active`) |
| GET    | `/api/penyakit/bySystemAndBody/:idBody/:idSystem` | public | Penyakit terfilter                           |
| GET    | `/api/penyakit/cari?q=...`             | public   | Pencarian penyakit (ILIKE, escape wildcard) |
| GET    | `/api/penyakit`                        | admin    | Daftar master penyakit (untuk panel admin)   |
| POST   | `/api/penyakit`                        | admin    | Buat penyakit + relasi bagian_tubuh/patogen  |
| PUT    | `/api/penyakit/:idPenyakit`            | admin    | Perbarui penyakit + relasi                   |
| GET    | `/api/penyakit/:idOrSlug`              | public   | Detail lengkap (id atau slug)                |
| GET    | `/api/penyakit/slug/:slug`             | public   | Detail lengkap via slug                      |
| GET    | `/api/penyakit/:idPenyakit/konten`     | public   | Konten artikel polos per penyakit            |
| GET    | `/api/patogen`                         | public   | Daftar patogen + jumlah penyakit terkait     |
| GET    | `/api/patogen/:idPatogen`              | public   | Detail patogen + daftar penyakit             |
| POST   | `/api/patogen`                         | admin    | Buat patogen (+ `penyakitIds`)               |
| PUT    | `/api/patogen/:idPatogen`              | admin    | Perbarui patogen (+ `penyakitIds`)           |
| DELETE | `/api/patogen/:idPatogen`              | admin    | Hapus patogen (relasi ikut terhapus)         |
| GET    | `/api/artikel`                         | admin    | Daftar artikel ringkas per penyakit          |
| POST   | `/api/artikel`                         | admin    | Buat artikel `draft` untuk penyakit          |
| PUT    | `/api/artikel/:idArtikel`              | admin    | Perbarui konten bagian pertama               |
| GET    | `/api/artikel/:idArtikel/bagian`       | admin    | Ambil seluruh bagian artikel                 |
| PUT    | `/api/artikel/:idArtikel/bagian`       | admin    | Simpan seluruh bagian artikel (upsert+delete)|
| GET    | `/api/dashboard`                       | admin    | Statistik dashboard                          |
| GET    | `/api/model`                           | public   | Daftar model AI aktif                        |
| POST   | `/api/riwayat`                         | user     | Buat riwayat (upload gambar `multipart`) |
| GET    | `/api/riwayat?limit=&offset=`          | user     | Daftar riwayat milik user (max 100)          |
| GET    | `/api/riwayat/:id`                     | user     | Detail riwayat + prediksi (pemilik/admin)    |
| POST   | `/api/riwayat/:id/analisis`            | user     | Jalankan analisis via service Python           |
| POST   | `/api/rag/chat`                        | public   | Proxy ke RAG API (pertanyaan edukasi)        |

---

## Contoh Permintaan

### Login & Registrasi

```http
POST /api/auth/login
Content-Type: application/json

{ "identifier": "admin@example.com", "password": "rahasia123" }
```

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 2, "nama": "Admin", "email": "admin@example.com", "username": "admin", "role": "admin" }
}
```

### Detail Penyakit

```http
GET /api/penyakit/tbc
```

```json
{
  "penyakit": {
    "id": 13,
    "nama": "Tuberkulosis",
    "slug": "tbc",
    "ringkasan": "...",
    "thumbnail": null,
    "tingkat_urgensi": "waspada",
    "sistem_tubuh": { "id": 1, "nama": "Paru" },
    "artikel": [ { "id": 1, "status": "published", "bagian": [ { "id": 1, "tipe": "ringkasan", "judul": "Pengertian", "urutan": 1, "konten": "..." } ] } ],
    "bagian_tubuh": [ { "id": 1, "nama": "Dada" } ],
    "referensi": [ { "id": 1, "url": "..." } ],
    "patogen": [ { "id": 1, "nama": "Mycobacterium tuberculosis", "jenis": "bakteri", "deskripsi": "..." } ]
  }
}
```

### Admin — Buat/Perbarui Penyakit (dengan relasi)

```http
PUT /api/penyakit/1
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "nama": "COVID-19",
  "slug": "covid-19",
  "ringkasan": "Penyakit saluran napas ...",
  "thumbnail": "",
  "tingkat_urgensi": "waspada",
  "id_sistem_tubuh": 1,
  "code": "COVID_19",
  "bagian_tubuhIds": [1, 21],
  "patogenIds": [1]
}
```

Nilai kosong untuk `ringkasan` / `thumbnail` / `code` otomatis disimpan sebagai
`NULL`, sehingga tidak melanggar unique index (`penyakit_code_key`, dst.).

### Admin — Patogen & Relasi ke Penyakit

```http
POST /api/patogen
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "nama": "SARS-CoV-2", "jenis": "virus", "deskripsi": "...", "penyakitIds": [1] }
```

Respons: `201` → `{ "patogen": { "id": ..., "nama": ..., "jenis": ..., "deskripsi": ... } }`

### Riwayat → Analisis

Upload gambar sebagai `multipart/form-data` (field `gambar`, maks 10 MB). File
disimpan di `server/uploads/` dan dilayani statis di `/uploads/<file>`.

```http
POST /api/riwayat
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

```json
{ "id": 12, "status": "processing" }
```

```http
POST /api/riwayat/12/analisis
Authorization: Bearer <token>
```

BFF membaca gambar tersimpan lalu memanggil **service Python**
(`${MODEL_API_URL}/api/prediksi`): 1 endpoint, 1 input gambar → **3 hasil dari
3 model berbeda**. Setiap hasil dipetakan ke tabel `model` (auto-sync bila
belum ada) dan `prediksi` (label → `penyakit`, confidence < 1), lalu status
riwayat menjadi `completed`.

```http
GET /api/riwayat/12
Authorization: Bearer <token>
```

```json
{
  "riwayat": {
    "id": 12,
    "gambar": "/uploads/1718xxxx-gambar.png",
    "status": "completed",
    "predictions": [
      { "id": 1, "model": "DenseNet121", "versi": "v1", "penyakit": "Tuberkulosis", "kode": null, "confidence": 0.95 },
      { "id": 2, "model": "ResNet50", "versi": "v1", "penyakit": "Lung Opacity", "kode": null, "confidence": 0.73 },
      { "id": 3, "model": "EfficientNetB0", "versi": "v1", "penyakit": "Pneumonia", "kode": null, "confidence": 0.84 }
    ]
  }
}
```

Catatan: selama file `.onnx` model belum dipasang, jalankan `service/` dengan
`ALLOW_STUB=1` agar alur tetap bisa diuji (hasil **deterministik, bukan
inferensi nyata**, ditandai `stub: true`).

### Chat RAG (proxy)

```http
POST /api/rag/chat
Content-Type: application/json

{ "question": "Apa gejala maag?", "session_id": "sess-123", "history": [] }
```

```json
{
  "question": "Apa gejala maag?",
  "answer": "Gejala maag meliputi nyeri ulu hati.",
  "sources": [],
  "session_id": "sess-123"
}
```

### Dashboard (admin)

```http
GET /api/dashboard
Authorization: Bearer <token-admin>
```

```json
{
  "dashboard": {
    "counts": { "penyakit": 14, "sistem_tubuh": 8, "bagian_tubuh": 22, "artikel": 6, "artikel_bagian": 30, "users": 3, "riwayat": 4, "prediksi": 0 },
    "urgensi": [ { "tingkat_urgensi": "normal", "jumlah": 8 } ],
    "per_sistem": [ { "id": 1, "nama": "Paru", "jumlah_penyakit": 6 } ],
    "artikel_coverage": { "total": 14, "punya_artikel": 6 },
    "users_role": [ { "role": "admin", "jumlah": 1 } ],
    "riwayat_status": [ { "status": "processing", "jumlah": 1 } ],
    "prediksi_penyakit": [ { "nama": "Pneumonia", "jumlah": 2 } ]
  }
}
```

---

## Catatan Teknis

- **ID path** harus bilangan bulat positif; selain itu `400`.
- **Pencarian** `ILIKE` memakai peng-escape wildcard (`%`, `_`, `*`, `?`) untuk
  mencegah pola pencarian tak terduga.
- **`/api/penyakit`** (publik vs admin): endpoint *tanpa param* adalah admin-only;
  varian publik selalu memiliki param path/query (`/cari`, `/:idOrSlug`).
- Tes otomasi yang merekam kontrak endpoint berada di `server/src/api.test.js`.