# Knowledge Base — Chatbot Bantuan Sistem Informasi Penyakit Tubuh

> Dokumen ini adalah sumber pengetahuan (knowledge base) untuk chatbot bantuan di website. Setiap entri ditulis **self-contained** (bisa dipahami tanpa perlu baca entri lain) supaya cocok untuk retrieval per-chunk dalam sistem RAG. Setiap entri punya format konsisten: topik, pertanyaan yang mungkin diajukan pengguna, dan jawaban.

---

## ENTRI 1: Apa itu website ini

**Topik:** Pengenalan umum sistem

**Pertanyaan terkait:** "Ini web apa?", "Fungsinya untuk apa?", "Apa yang bisa saya lakukan di sini?"

**Jawaban:**
Sistem Informasi Penyakit Tubuh adalah website yang membantu pengguna mencari informasi penyakit dengan cara yang mudah dan visual. Pengguna dapat menjelajahi informasi kesehatan melalui tiga cara: mengklik bagian tubuh pada peta tubuh interaktif (body map), memilih kategori sistem tubuh (seperti sistem pencernaan atau pernapasan), atau menggunakan pencarian teks langsung. Website ini bersifat informasional dan edukatif, bukan alat diagnosis medis.

---

## ENTRI 2: Cara menggunakan body map (peta tubuh)

**Topik:** Panduan fitur body map

**Pertanyaan terkait:** "Gimana cara pakai peta tubuh?", "Kenapa saya harus klik bagian tubuh?", "Body map itu apa?"

**Jawaban:**
Body map adalah ilustrasi tubuh manusia yang bisa diklik. Caranya: pilih tampilan depan atau belakang tubuh, pilih tampilan pria atau wanita menggunakan tombol toggle, lalu klik bagian tubuh yang ingin diketahui (misalnya kepala, dada, atau perut). Setelah diklik, akan muncul daftar penyakit yang berkaitan dengan area tubuh tersebut. Klik salah satu penyakit di daftar itu untuk melihat informasi lengkapnya.

---

## ENTRI 3: Cara mencari penyakit lewat pencarian teks

**Topik:** Panduan fitur search

**Pertanyaan terkait:** "Gimana cara cari penyakit tanpa body map?", "Ada fitur search tidak?", "Saya sudah tahu nama penyakitnya, bisa langsung cari?"

**Jawaban:**
Ya, tersedia kotak pencarian di bagian atas halaman. Ketik nama penyakit atau kata kunci terkait gejala, lalu hasil pencarian akan muncul secara otomatis. Fitur ini cocok digunakan jika pengguna sudah punya perkiraan nama penyakit yang dicari, sebagai alternatif dari menjelajah lewat body map.

---

## ENTRI 4: Cara mencari lewat kategori sistem tubuh

**Topik:** Panduan fitur kategori sistem tubuh

**Pertanyaan terkait:** "Apa itu sistem tubuh di menu?", "Bedanya body map dengan kategori sistem tubuh apa?"

**Jawaban:**
Selain body map, tersedia juga kategori berdasarkan sistem fungsional tubuh, seperti sistem pencernaan, sistem pernapasan, atau sistem kardiovaskular. Fitur ini berguna untuk penyakit yang tidak terikat pada satu lokasi fisik saja (misalnya penyakit yang mempengaruhi seluruh sistem pencernaan dari mulut hingga usus). Pengguna bisa memilih kategori sistem tubuh, lalu melihat daftar semua penyakit yang termasuk dalam kategori tersebut.

---

## ENTRI 5: Isi halaman detail penyakit

**Topik:** Struktur informasi detail penyakit

**Pertanyaan terkait:** "Apa saja yang dijelaskan di halaman penyakit?", "Informasi apa yang saya dapat setelah klik penyakit?"

**Jawaban:**
Setiap halaman detail penyakit berisi: ringkasan singkat, deskripsi umum penyakit, penyebab, faktor risiko, cara pencegahan, pengobatan umum, kemungkinan komplikasi, kapan sebaiknya berkonsultasi ke dokter, serta indikator tingkat urgensi (ringan, sedang, atau serius). Beberapa halaman juga dilengkapi gambar pendukung serta sumber referensi medis yang digunakan.

---

## ENTRI 6: Tingkat urgensi penyakit

**Topik:** Penjelasan label tingkat urgensi

**Pertanyaan terkait:** "Apa arti warna hijau/oranye/merah di daftar penyakit?", "Tingkat urgensi itu maksudnya apa?"

**Jawaban:**
Setiap penyakit memiliki label tingkat urgensi yang ditandai dengan warna: hijau berarti ringan, oranye berarti sedang, dan merah berarti serius. Label ini membantu pengguna memahami seberapa penting suatu kondisi untuk segera ditangani atau diperiksakan ke dokter. Label ini bersifat panduan umum, bukan penilaian medis personal terhadap kondisi kesehatan pengguna tertentu.

---

## ENTRI 7: Apakah website ini bisa mendiagnosis penyakit saya

**Topik:** Batasan fungsi sistem (disclaimer)

**Pertanyaan terkait:** "Apakah web ini bisa tahu saya sakit apa?", "Kalau saya masukkan gejala, bisa ketahuan penyakitnya?", "Ini kayak dokter online?"

**Jawaban:**
Tidak. Website ini bukan alat diagnosis dan tidak dapat menentukan penyakit yang dialami pengguna secara personal. Sistem ini murni menyediakan informasi edukatif tentang berbagai penyakit berdasarkan bagian tubuh atau kategori yang dipilih pengguna, bukan menganalisis gejala spesifik pengguna untuk memberikan kesimpulan diagnosis. Untuk mengetahui kondisi kesehatan yang sebenarnya, pengguna harus berkonsultasi langsung dengan dokter atau tenaga medis profesional.

---

## ENTRI 8: Sumber informasi penyakit

**Topik:** Kredibilitas dan sumber data

**Pertanyaan terkait:** "Informasinya dari mana?", "Apakah bisa dipercaya?", "Sumbernya valid tidak?"

**Jawaban:**
Informasi penyakit di website ini disusun berdasarkan referensi dari sumber kesehatan resmi seperti WHO (World Health Organization), Kementerian Kesehatan Republik Indonesia, dan CDC (Centers for Disease Control and Prevention). Setiap halaman detail penyakit mencantumkan sumber referensi dan, jika tersedia, tanggal terakhir konten tersebut ditinjau ulang.

---

## ENTRI 9: Apakah perlu daftar akun untuk menggunakan website

**Topik:** Kebutuhan akun/login

**Pertanyaan terkait:** "Harus login dulu?", "Perlu daftar akun tidak?", "Bisa dipakai tanpa akun?"

**Jawaban:**
Tidak, seluruh fitur pencarian informasi penyakit — baik melalui body map, maupun pencarian teks — dapat digunakan tanpa perlu membuat akun atau login. Website ini bersifat terbuka untuk umum.

---

## ENTRI 10: Apakah website ini berbayar

**Topik:** Biaya penggunaan

**Pertanyaan terkait:** "Gratis tidak?", "Ada biayanya?", "Perlu bayar untuk akses informasi?"

**Jawaban:**
Website ini gratis digunakan untuk mencari dan membaca informasi penyakit. Tidak ada biaya untuk mengakses fitur body map, pencarian, maupun halaman detail penyakit.

---

## ENTRI 11: Apa yang harus dilakukan jika penyakit yang dicari tidak ditemukan

**Topik:** Penanganan hasil kosong

**Pertanyaan terkait:** "Kenapa penyakit yang saya cari tidak muncul?", "Datanya belum lengkap ya?"

**Jawaban:**
Basis data penyakit di website ini terus dikembangkan dan mungkin belum mencakup seluruh jenis penyakit yang ada. Jika penyakit yang dicari belum ditemukan, pengguna dapat mencoba kata kunci lain yang lebih umum, menjelajah lewat body map atau kategori sistem tubuh, atau mencari informasi tambahan dari sumber kesehatan resmi lain seperti situs Kementerian Kesehatan.

---

## ENTRI 12: Apakah website ini bisa diakses lewat HP

**Topik:** Kompatibilitas perangkat

**Pertanyaan terkait:** "Bisa dibuka di HP?", "Ada aplikasinya tidak?", "Support mobile tidak?"

**Jawaban:**
Ya, website ini dirancang responsif dan dapat diakses melalui browser di HP, tablet, maupun komputer/laptop. Saat ini belum tersedia dalam bentuk aplikasi mobile terpisah — akses dilakukan melalui browser.

---

## ENTRI 13: Kenapa organ reproduksi tidak ada di body map utama

**Topik:** Batasan cakupan body map

**Pertanyaan terkait:** "Kok area itu tidak bisa diklik?", "Informasi kesehatan reproduksi ada di mana?"

**Jawaban:**
Untuk menjaga kenyamanan dan sensitivitas tampilan, organ reproduksi tidak dijadikan area yang bisa diklik langsung pada body map utama. Informasi terkait kesehatan reproduksi (baik pria maupun wanita) disediakan melalui kategori atau menu terpisah yang dapat diakses dari halaman utama.

---

## ENTRI 14: Kenapa satu penyakit bisa muncul di beberapa bagian tubuh berbeda

**Topik:** Penjelasan relasi penyakit-lokasi (penyakit sistemik)

**Pertanyaan terkait:** "Kenapa diabetes muncul saat saya klik mata dan kaki juga?", "Apakah ini bug?"

**Jawaban:**
Ini bukan kesalahan sistem. Beberapa penyakit, seperti diabetes, bersifat sistemik dan dapat memengaruhi atau menimbulkan komplikasi di berbagai bagian tubuh sekaligus (misalnya mata, ginjal, dan kaki). Oleh karena itu, satu penyakit yang sama bisa muncul ketika pengguna mengklik beberapa bagian tubuh yang berbeda, sesuai dengan area yang benar-benar terkait secara medis.

---

## ENTRI 15: Kontak atau cara memberi masukan untuk website

**Topik:** Feedback dan kontak

**Pertanyaan terkait:** "Mau kasih saran, kemana?", "Ada kontak yang bisa dihubungi?", "Mau lapor kalau ada info yang salah"

**Jawaban:**

Kalau mau memberikan saran, melaporkan informasi yang kurang tepat, atau menyampaikan masukan tentang website, silakan hubungi kami melalui:

- **Email:** [feedback@example.com](mailto:feedback@example.com)
- **Form kontak:** https://example.com/contact
- **Instagram:** @examplewebsite

Untuk laporan informasi yang salah, sebaiknya sertakan **tautan halaman yang dimaksud, bagian yang perlu diperbaiki, dan informasi yang benar** agar tim kami dapat menindaklanjutinya dengan lebih cepat.

---

## Catatan untuk Implementasi RAG

- Setiap "ENTRI" di atas dirancang sebagai satu chunk retrieval yang berdiri sendiri — saat melakukan chunking dokumen ini, pisahkan berdasarkan heading `## ENTRI` agar konteks setiap jawaban tidak terpotong.
- Field **Topik** dan **Pertanyaan terkait** membantu meningkatkan relevansi retrieval berbasis embedding karena mengandung variasi kalimat yang mendekati cara pengguna asli bertanya.
- Setiap entri di dokumen ini di-embed sebagai baris terpisah di tabel `knowledge_embeddings` dengan `source_type = 'faq'`, lewat proses seeding satu kali (lihat `RAG_ARCHITECTURE.md`). Konten FAQ diperlakukan sebagai fixed content — kalau ada revisi, jalankan ulang script seeding secara manual.
- Dokumen ini tetap khusus untuk pertanyaan seputar cara kerja/navigasi website. Pertanyaan medis tentang penyakit tertentu dijawab dari baris `source_type = 'disease'` di tabel `knowledge_embeddings` yang sama (bersumber dari tabel `diseases`), bukan dari dokumen ini — retrieval keduanya lewat satu jalur vector search yang sama, tidak dipisah tool/logic berbeda.
