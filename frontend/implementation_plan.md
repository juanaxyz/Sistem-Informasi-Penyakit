# Implementation Plan — Desain Ulang "Peta Kesehatan"

> Prinsip: **modern tapi tetap terasa kredibel**. Fokus pada hierarki visual,
> feedback interaksi, dan pengurangan beban kognitif. **Palet warna dipakai
> seperti sekarang** (clinical paper + deep pine green) — tidak diganti.

---

## 0. Palet (dipakai apa adanya, hanya direferensikan ulang)

| Token | Nilai saat ini | Fungsi |
|---|---|---|
| `--background` | `oklch(0.965 0.015 150)` `#F2F6F4` | alas halaman |
| `--card` | `oklch(0.99 0.005 150)` `#FBFDFC` | surface |
| `--primary` / `--color-pine` | `oklch(0.32 0.08 165)` `#0E5E50` | aksi utama, seleksi |
| `--color-mint` | `oklch(0.93 0.03 160)` | primary-soft / hover |
| `--color-paper` | `oklch(0.97 0.01 150)` | alas kartu editorial |
| `--color-ink` | `oklch(0.15 0.01 160)` | teks utama |
| `--muted-foreground` | `oklch(0.42 0.02 160)` `#5A6B66` | teks sekunder |

Aturan warna: warna **hanya punya satu makna**. Pine = interaksi/aksi,
urgensi (`--urgency-*`) hanya untuk badge tingkat bahaya. Tidak ada warna
per-navigasi.

---

## 1. Body Map sebagai focal point

- Tetap `lg:sticky` untuk body map kiri + `max-h + overflow-y-auto` untuk
  panel kanan (perubahan dari sesi sebelumnya).

## 2. Panel kanan = contextual cards, bukan "form"

- `ResultsPanel.tsx` State 2: card sistem dibuat lebih "kartu":
  - ikon di tile `bg-mint`/`text-pine`
  - nama sistem
  - baris kedua = **jumlah penyakit** (`12 penyakit`) bila tersedia, fallback
    ke `deskripsi`
  - sudut kanan `→` yang bergeser saat hover
- Header card pakai pola anchor: `BAGIAN TUBUH` (eyebrow mono) + nama bagian.

## 3. Progressive disclosure (sudah ada, dirapikan)

State tetap: `Bagian → Sistem → Penyakit → Detail`.

- State 1: `Pilih bagian tubuh` — sederhana, tanpa card kosong.
- State 2: `Pilih sistem tubuh` — daftar sistem sebagai kartu.
- State 3: `Sistem X — N penyakit` — daftar `DiseaseCard`, breadcrumb bagian
  dapat diklik untuk kembali.
- Tidak ada perubahan alur; memastikan hanya **satu keputusan per layar**.

## 4. Feedback SVG lebih jelas

- `index.css` token `--part-*` disesuaikan agar kontras antar state jelas:
  - Default: redup (`opacity`/fill ringan)
  - Hover: fill medium + `scale(1.02)` via CSS (SVG `transform-box: fill-box`)
  - Selected: fill pine pekat + **stroke** dark-green
- `BodyMap.tsx`/`index.css`: tambah `transition` untuk fill, opacity, transform
  (`200ms ease`) pada kelas `.body-part`.
- Pastikan kontras `--part-selected` vs `--part-default` jelas secara visual.

## 5. Label kecil saat hover

- `BodyMap.tsx`: di atas peta, tampilkan label nama bagian saat `hoveredPartId`
  atau bagian yang dipilih (`selectedPartId`), misal:
  - hover → `Dada`
  - terpilih → `Dada · 3 sistem` (jumlah sistem bila mudah didapat, jika tidak
    cukup nama bagian)
- Implementasi: blok label kecil (font-mono) yang dirender di `BodyMap`
  (bukan `<title>` saja), tanpa membanjiri SVG dengan teks.

## 6. Selected context di panel kanan

- `ResultsPanel.tsx` State 2 & 3 sudah menampilkan nama bagian sebagai anchor.
- Pastikan selalu terlihat nyata: eyebrow `BAGIAN TUBUH` + judul tebal nama
  bagian di State 2; breadcrumb `Dada / Sistem Pernapasan` di State 3.

## 7. Card penyakit lebih editorial

- `DiseaseCard.tsx`:
  - whitespace lebih lega (`gap`), ringkasan `line-clamp` tetap
  - badge urgensi di baris terakhir (bukan mepet judul)
  - arrow `→` di kanan atas yang muncul/bergeser saat hover
  - kurangi border: pakai `bg-paper`/`bg-card` + hover `bg-mint/50`

## 8. Dok — ringkas, bukan "gaming"

`react-bits/components/Dock.tsx` (disesuaikan, bukan dihapus):

- Ganti gaya item: swap gaya magic-mirror ke **light pill**:
  - normal: latar putih/`bg-card`, border tipis, shadow lembut, ikon pine
  - hover: naik sedikit + scale halus (pertahankan magnification — ini
    memang bagian dari Dock, tapi redup spring/jarak agar tidak berlebihan)
  - label tooltip di atas (tetap ada, gaya ringan)
- Jaga aksesibilitas: `tabIndex`, `role`, keydown Enter/Spasi.

## 9. Active state Dock

- `App.tsx`: deteksi rute aktif (`location.pathname`) → tandai item aktif.
- `Dock.tsx`: dukung per-item `active`:
  - aktif: `bg-pine` + ikon putih (label tampil)
  - non-aktif: transparan + ikon pine
- Hasil akhir: pengguna selalu tahu halaman saat ini.

## 10. X-Ray — hierarki visual berbeda

`XRayAnalysisPage.tsx` (frontend-only, belum ada endpoint server):

- Alur progressive disclosure: **Upload → Preview → Analyze → Result**.
- Zone upload (drag & drop / browse) via `<input type="file" accept="image/*">`
  + preview `<img>`.
- Tombol `Analisis Gambar` → state "memproses…" (skeleton/spinner).
- Hasil dalam bentuk placeholder (daftar label + persen) karena endpoint
  belum ada — beri label eksplisit "demo/hasil contoh".

## 11. Home — landing minimal

`HomePage.tsx` (saat ini masih placeholder):

- Hero: jawab "Apa ini / Apa yang bisa saya lakukan / Mulai dari mana".
- Dua kartu aksi besar: **Body Map** dan **Analisis X-Ray** (ikon + satu baris
  deskripsi + `→`).
- Section "Cara kerja": 3 langkah bernomor (`01 Pilih bagian tubuh → ...`).
- Tetap konsisten heading `PETA KESEHATAN` + `document.title`.

## 12. Animasi — hanya untuk feedback

- Micro interaction hover: 150–250ms.
- State transition panel: 200–300ms (`transition` di card/panel).
- Tidak ada: parallax berlebihan, floating terus-menerus, bounce, gradient anim,
  blur berlebih. **Ketenangan visual = kredibilitas.**
- gunakan package motion untuk membuat animasi, jangan pernah gunakan vanila css untuk animasi kecuali sudah tidak bisa menggunakan package motion  

---

## Urutan implementasi

1. `index.css` (token `--part-*`, `.body-part` transition) — sesi ini **tanpa
   mengganti palet**.
2. `Dock.tsx` + `App.tsx` (active state, gaya ringan).
3. `BodyMap.tsx` (label hover + state visual).
4. `ResultsPanel.tsx` + server `jumlah_penyakit` (card kontekstual).
5. `DiseaseCard.tsx` (editorial).
6. `BodyMapPage.tsx` (proporsi 55:45).
7. `HomePage.tsx` (landing).
8. `XRayAnalysisPage.tsx` (alur upload/preview/analyze/result).
9. Lint + `tsc -b` + log ke `logs/`.

## Batasan

- UI bahasa Indonesia.
- Tidak ada operasi tulis dari client (X-Ray hasil = placeholder).
- Jangan ubah data `d` di `src/assets/body-parts.ts`.
- `BodyMap.tsx` tetap memenuhi aksesibilitas (tabIndex, role, aria, Enter/Spasi).