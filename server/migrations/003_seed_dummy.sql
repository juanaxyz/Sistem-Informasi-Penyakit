-- 003: Seed data dummy untuk demo (body map + sistem + penyakit)
--
-- body_parts.id SAMA dengan `id` di `src/assets/body-parts.ts` (0-72) agar
-- klik pada body map (id bagian tubuh) cocok dengan relasi disease_body_part.
--
-- PERHATIAN: data penyakit di bawah adalah DUMMY/placeholder untuk pengembangan.
-- Konten medis final harus divalidasi (WHO / Kemenkes RI / CDC) sebelum produksi.

-- Bersihkan data seed sebelumnya (002) lalu isi ulang dari nol.
TRUNCATE disease_body_part, disease_body_system, diseases, body_parts, body_systems RESTART IDENTITY;

-- ---------------------------------------------------------------------------
-- Sistem tubuh
-- ---------------------------------------------------------------------------
INSERT INTO body_systems (id, nama, deskripsi) VALUES
(1, 'Sistem Pernapasan', 'Organ dan saluran yang berperan dalam pernapasan.'),
(2, 'Sistem Pencernaan', 'Organ yang mencerna dan menyerap makanan.'),
(3, 'Sistem Saraf', 'Sistem yang mengatur koordinasi dan sinyal tubuh.'),
(4, 'Sistem Muskuloskeletal', 'Otot, tulang, dan sendi penopang tubuh.');

-- ---------------------------------------------------------------------------
-- Bagian tubuh (body map) — mapping dari src/assets/body-parts.ts
-- face 'ant' -> side 'depan', face 'post' -> side 'belakang'
-- ---------------------------------------------------------------------------
INSERT INTO body_parts (id, nama, kode_svg, side, gender, deskripsi) VALUES
(0, 'Dada kanan', 'dada-kanan', 'depan', 'netral', 'Area tubuh dada kanan pada tampilan depan.'),
(1, 'Rusuk kanan', 'rusuk-kanan', 'depan', 'netral', 'Area tubuh rusuk kanan pada tampilan depan.'),
(2, 'Bahu kanan', 'bahu-kanan', 'depan', 'netral', 'Area tubuh bahu kanan pada tampilan depan.'),
(3, 'Siku kanan', 'siku-kanan', 'depan', 'netral', 'Area tubuh siku kanan pada tampilan depan.'),
(4, 'Perut samping kanan', 'perut-samping-kanan', 'depan', 'netral', 'Area tubuh perut samping kanan pada tampilan depan.'),
(5, 'Lengan bawah kanan', 'lengan-bawah-kanan', 'depan', 'netral', 'Area tubuh lengan bawah kanan pada tampilan depan.'),
(6, 'Pergelangan tangan kanan', 'pergelangan-tangan-kanan', 'depan', 'netral', 'Area tubuh pergelangan tangan kanan pada tampilan depan.'),
(7, 'Lutut kanan', 'lutut-kanan', 'depan', 'netral', 'Area tubuh lutut kanan pada tampilan depan.'),
(8, 'Tulang kering kanan', 'tulang-kering-kanan', 'depan', 'netral', 'Area tubuh tulang kering kanan pada tampilan depan.'),
(9, 'Perut kanan', 'perut-kanan', 'depan', 'netral', 'Area tubuh perut kanan pada tampilan depan.'),
(10, 'Leher kanan', 'leher-kanan', 'depan', 'netral', 'Area tubuh leher kanan pada tampilan depan.'),
(11, 'Paha kanan', 'paha-kanan', 'depan', 'netral', 'Area tubuh paha kanan pada tampilan depan.'),
(12, 'Pundak kanan', 'pundak-kanan', 'depan', 'netral', 'Area tubuh pundak kanan pada tampilan depan.'),
(13, 'Pergelangan kaki kanan', 'pergelangan-kaki-kanan', 'depan', 'netral', 'Area tubuh pergelangan kaki kanan pada tampilan depan.'),
(14, 'Kaki kanan', 'kaki-kanan', 'depan', 'netral', 'Area tubuh kaki kanan pada tampilan depan.'),
(15, 'Paha dalam kanan', 'paha-dalam-kanan', 'depan', 'netral', 'Area tubuh paha dalam kanan pada tampilan depan.'),
(16, 'Pinggul kanan', 'pinggul-kanan', 'depan', 'netral', 'Area tubuh pinggul kanan pada tampilan depan.'),
(17, 'Bisep kanan', 'bisep-kanan', 'depan', 'netral', 'Area tubuh bisep kanan pada tampilan depan.'),
(18, 'Tangan kanan', 'tangan-kanan', 'depan', 'netral', 'Area tubuh tangan kanan pada tampilan depan.'),
(19, 'Kepala', 'kepala', 'depan', 'netral', 'Area tubuh kepala pada tampilan depan.'),
(20, 'Dada kiri', 'dada-kiri', 'depan', 'netral', 'Area tubuh dada kiri pada tampilan depan.'),
(21, 'Rusuk kiri', 'rusuk-kiri', 'depan', 'netral', 'Area tubuh rusuk kiri pada tampilan depan.'),
(22, 'Bahu kiri', 'bahu-kiri', 'depan', 'netral', 'Area tubuh bahu kiri pada tampilan depan.'),
(23, 'Siku kiri', 'siku-kiri', 'depan', 'netral', 'Area tubuh siku kiri pada tampilan depan.'),
(24, 'Perut samping kiri', 'perut-samping-kiri', 'depan', 'netral', 'Area tubuh perut samping kiri pada tampilan depan.'),
(25, 'Lengan bawah kiri', 'lengan-bawah-kiri', 'depan', 'netral', 'Area tubuh lengan bawah kiri pada tampilan depan.'),
(26, 'Pergelangan tangan kiri', 'pergelangan-tangan-kiri', 'depan', 'netral', 'Area tubuh pergelangan tangan kiri pada tampilan depan.'),
(27, 'Lutut kiri', 'lutut-kiri', 'depan', 'netral', 'Area tubuh lutut kiri pada tampilan depan.'),
(28, 'Tulang kering kiri', 'tulang-kering-kiri', 'depan', 'netral', 'Area tubuh tulang kering kiri pada tampilan depan.'),
(29, 'Perut kiri', 'perut-kiri', 'depan', 'netral', 'Area tubuh perut kiri pada tampilan depan.'),
(30, 'Leher kiri', 'leher-kiri', 'depan', 'netral', 'Area tubuh leher kiri pada tampilan depan.'),
(31, 'Paha kiri', 'paha-kiri', 'depan', 'netral', 'Area tubuh paha kiri pada tampilan depan.'),
(32, 'Pundak kiri', 'pundak-kiri', 'depan', 'netral', 'Area tubuh pundak kiri pada tampilan depan.'),
(33, 'Pergelangan kaki kiri', 'pergelangan-kaki-kiri', 'depan', 'netral', 'Area tubuh pergelangan kaki kiri pada tampilan depan.'),
(34, 'Kaki kiri', 'kaki-kiri', 'depan', 'netral', 'Area tubuh kaki kiri pada tampilan depan.'),
(35, 'Paha dalam kiri', 'paha-dalam-kiri', 'depan', 'netral', 'Area tubuh paha dalam kiri pada tampilan depan.'),
(36, 'Pinggul kiri', 'pinggul-kiri', 'depan', 'netral', 'Area tubuh pinggul kiri pada tampilan depan.'),
(37, 'Bisep kiri', 'bisep-kiri', 'depan', 'netral', 'Area tubuh bisep kiri pada tampilan depan.'),
(38, 'Tangan kiri', 'tangan-kiri', 'depan', 'netral', 'Area tubuh tangan kiri pada tampilan depan.'),
(39, 'Tulang belakang', 'tulang-belakang', 'belakang', 'netral', 'Area tubuh tulang belakang pada tampilan belakang.'),
(40, 'Kepala', 'kepala', 'belakang', 'netral', 'Area tubuh kepala pada tampilan belakang.'),
(41, 'Punggung kiri', 'punggung-kiri', 'belakang', 'netral', 'Area tubuh punggung kiri pada tampilan belakang.'),
(42, 'Bahu kiri', 'bahu-kiri', 'belakang', 'netral', 'Area tubuh bahu kiri pada tampilan belakang.'),
(43, 'Siku kiri', 'siku-kiri', 'belakang', 'netral', 'Area tubuh siku kiri pada tampilan belakang.'),
(44, 'Lengan bawah kiri', 'lengan-bawah-kiri', 'belakang', 'netral', 'Area tubuh lengan bawah kiri pada tampilan belakang.'),
(45, 'Pergelangan tangan kiri', 'pergelangan-tangan-kiri', 'belakang', 'netral', 'Area tubuh pergelangan tangan kiri pada tampilan belakang.'),
(46, 'Paha belakang kiri', 'paha-belakang-kiri', 'belakang', 'netral', 'Area tubuh paha belakang kiri pada tampilan belakang.'),
(47, 'Betis kiri', 'betis-kiri', 'belakang', 'netral', 'Area tubuh betis kiri pada tampilan belakang.'),
(48, 'Pundak kiri', 'pundak-kiri', 'belakang', 'netral', 'Area tubuh pundak kiri pada tampilan belakang.'),
(49, 'Pergelangan kaki kiri', 'pergelangan-kaki-kiri', 'belakang', 'netral', 'Area tubuh pergelangan kaki kiri pada tampilan belakang.'),
(50, 'Tangan kiri', 'tangan-kiri', 'belakang', 'netral', 'Area tubuh tangan kiri pada tampilan belakang.'),
(51, 'Trisep kiri', 'trisep-kiri', 'belakang', 'netral', 'Area tubuh trisep kiri pada tampilan belakang.'),
(52, 'Bokong kiri', 'bokong-kiri', 'belakang', 'netral', 'Area tubuh bokong kiri pada tampilan belakang.'),
(53, 'Tulang belikat kiri', 'tulang-belikat-kiri', 'belakang', 'netral', 'Area tubuh tulang belikat kiri pada tampilan belakang.'),
(54, 'Kaki kiri', 'kaki-kiri', 'belakang', 'netral', 'Area tubuh kaki kiri pada tampilan belakang.'),
(55, 'Pinggang kiri', 'pinggang-kiri', 'belakang', 'netral', 'Area tubuh pinggang kiri pada tampilan belakang.'),
(56, 'Lutut kiri', 'lutut-kiri', 'belakang', 'netral', 'Area tubuh lutut kiri pada tampilan belakang.'),
(57, 'Punggung kanan', 'punggung-kanan', 'belakang', 'netral', 'Area tubuh punggung kanan pada tampilan belakang.'),
(58, 'Bahu kanan', 'bahu-kanan', 'belakang', 'netral', 'Area tubuh bahu kanan pada tampilan belakang.'),
(59, 'Siku kanan', 'siku-kanan', 'belakang', 'netral', 'Area tubuh siku kanan pada tampilan belakang.'),
(60, 'Lengan bawah kanan', 'lengan-bawah-kanan', 'belakang', 'netral', 'Area tubuh lengan bawah kanan pada tampilan belakang.'),
(61, 'Pergelangan tangan kanan', 'pergelangan-tangan-kanan', 'belakang', 'netral', 'Area tubuh pergelangan tangan kanan pada tampilan belakang.'),
(62, 'Paha belakang kanan', 'paha-belakang-kanan', 'belakang', 'netral', 'Area tubuh paha belakang kanan pada tampilan belakang.'),
(63, 'Betis kanan', 'betis-kanan', 'belakang', 'netral', 'Area tubuh betis kanan pada tampilan belakang.'),
(64, 'Pundak kanan', 'pundak-kanan', 'belakang', 'netral', 'Area tubuh pundak kanan pada tampilan belakang.'),
(65, 'Pergelangan kaki kanan', 'pergelangan-kaki-kanan', 'belakang', 'netral', 'Area tubuh pergelangan kaki kanan pada tampilan belakang.'),
(66, 'Tangan kanan', 'tangan-kanan', 'belakang', 'netral', 'Area tubuh tangan kanan pada tampilan belakang.'),
(67, 'Trisep kanan', 'trisep-kanan', 'belakang', 'netral', 'Area tubuh trisep kanan pada tampilan belakang.'),
(68, 'Bokong kanan', 'bokong-kanan', 'belakang', 'netral', 'Area tubuh bokong kanan pada tampilan belakang.'),
(69, 'Tulang belikat kanan', 'tulang-belikat-kanan', 'belakang', 'netral', 'Area tubuh tulang belikat kanan pada tampilan belakang.'),
(70, 'Kaki kanan', 'kaki-kanan', 'belakang', 'netral', 'Area tubuh kaki kanan pada tampilan belakang.'),
(71, 'Pinggang kanan', 'pinggang-kanan', 'belakang', 'netral', 'Area tubuh pinggang kanan pada tampilan belakang.'),
(72, 'Lutut kanan', 'lutut-kanan', 'belakang', 'netral', 'Area tubuh lutut kanan pada tampilan belakang.');

-- ---------------------------------------------------------------------------
-- Penyakit dummy (id 1-19) + mapping ke bagian tubuh & sistem tubuh
-- ---------------------------------------------------------------------------
INSERT INTO diseases (id, nama, deskripsi, penyebab, pencegahan, pengobatan, kapan_ke_dokter, tingkat_urgensi) VALUES
(1, 'Asma', 'Penyakit paru kronis yang membuat saluran napas menyempit dan meradang, sehingga susah bernapas.', 'Alergen, asap rokok, udara dingin', 'Hindari pemicu, rutin kontrol', 'Inhaler pelega dan pengontrol', 'Sesak yang tidak membaik setelah pakai inhaler', 'sedang'),
(2, 'Bronkitis', 'Peradangan pada saluran bronkus yang biasanya ditandai batuk berdahak.', 'Infeksi virus, asap rokok', 'Tidak merokok, hindari polusi', 'Istirahat, minum air hangat', 'Batuk lebih dari 3 minggu', 'sedang'),
(3, 'Sinusitis', 'Peradangan rongga sinus yang menyebabkan hidung tersumbat dan nyeri di wajah.', 'Infeksi, alergi', 'Menjaga kebersihan hidung', 'Uap hangat, dekongestan', 'Demam tinggi atau nyeri wajah hebat', 'ringan'),
(4, 'Migrain', 'Sakit kepala berdenyut intensif, sering di satu sisi kepala.', 'Stres, kurang tidur, makanan pemicu', 'Tidur cukup, hindari pemicu', 'Istirahat di tempat gelap, obat pereda nyeri', 'Jika berlangsung lebih dari 72 jam', 'sedang'),
(5, 'Sakit Kepala Tegang', 'Nyeri kepala terasa menekan di kedua sisi, biasanya karena stres atau kelelahan.', 'Stres, kurang tidur', 'Kelola stres, istirahat', 'Istirahat, kompres dingin', 'Jika disertai gejala lain yang mengkhawatirkan', 'ringan'),
(6, 'Nyeri Leher', 'Rasa nyeri atau kaku di area leher, sering karena posisi tidur atau bekerja.', 'Postur buruk, tegang otot', 'Perbaiki postur, stretching', 'Kompres hangat, istirahat', 'Nyeri menjalar ke lengan atau berlangsung lama', 'ringan'),
(7, 'Frozen Shoulder', 'Sendi bahu kaku dan sulit digerakkan, disertai nyeri.', 'Radang jaringan sendi bahu', 'Gerakkan bahu secara rutin', 'Fisioterapi, obat antiradang', 'Kaku bahu mengganggu aktivitas sehari-hari', 'ringan'),
(8, 'Tendinitis Siku', 'Peradangan tendon di area siku akibat gerakan berulang.', 'Gerakan berulang, beban berlebih', 'Istirahatkan siku, perbaiki teknik', 'Kompres es, istirahat', 'Nyeri tidak membaik setelah beberapa hari', 'ringan'),
(9, 'Carpal Tunnel Syndrome', 'Saraf di pergelangan tangan tertekan sehingga tangan kesemutan dan nyeri.', 'Gerakan tangan berulang', 'Istirahatkan tangan, perbaiki posisi', 'Splint pergelangan tangan', 'Kesemutan terus-menerus atau mati rasa', 'sedang'),
(10, 'Gastritis', 'Peradangan lapisan lambung yang menimbulkan nyeri di ulu hati.', 'Pola makan tidak teratur, stres', 'Makan teratur, hindari makanan pedas', 'Obat penurun asam lambung', 'Nyeri hebat atau muntah darah', 'ringan'),
(11, 'GERD', 'Asam lambung naik ke kerongkongan sehingga dada terasa panas.', 'Makanan berlemak, makan sebelum tidur', 'Hindari pemicu, jangan tidur setelah makan', 'Antasida, perubahan pola makan', 'Gejala sering kambuh atau sulit menelan', 'sedang'),
(12, 'Apendisitis', 'Peradangan usus buntu yang menimbulkan nyeri perut kanan bawah.', 'Penyumbatan usus buntu', 'Tidak ada pencegahan khusus', 'Operasi pengangkatan usus buntu', 'Nyeri perut kanan bawah yang memburuk — segera ke UGD', 'serius'),
(13, 'Nyeri Punggung Bawah', 'Nyeri di punggung bagian bawah, sering karena postur atau mengangkat beban.', 'Postur buruk, angkat beban salah', 'Perbaiki postur, olahraga ringan', 'Kompres hangat, istirahat', 'Nyeri disertai kesemutan di kaki', 'ringan'),
(14, 'HNP', 'Bantalan tulang belakang bergeser dan menekan saraf, menyebabkan nyeri menjalar.', 'Degenerasi, cedera', 'Perkuat otot punggung', 'Fisioterapi, obat pereda nyeri', 'Mati rasa atau kelemahan di kaki', 'sedang'),
(15, 'Osteoartritis Lutut', 'Kerusakan tulang rawan sendi lutut yang menyebabkan nyeri dan kaku.', 'Penuaan, beban berlebih', 'Jaga berat badan, olahraga teratur', 'Kompres, obat antiradang', 'Lutut bengkak atau sulit ditekuk', 'ringan'),
(16, 'Asam Urat', 'Penumpukan kristal asam urat di sendi, nyeri hebat terutama di kaki.', 'Kadar asam urat tinggi, makanan tinggi purin', 'Batasi jeroan dan seafood', 'Obat penurun asam urat', 'Bengkak dan nyeri sendi yang hebat', 'sedang'),
(17, 'Keseleo Pergelangan Kaki', 'Ligamen pergelangan kaki terkilir karena gerakan mendadak.', 'Gerakan mendadak, salah melangkah', 'Pemanasan sebelum olahraga', 'Istirahat, kompres es, elevasi', 'Tidak bisa menumpu berat badan', 'ringan'),
(18, 'Cedera Betis', 'Tarik otot betis atau nyeri tulang kering akibat aktivitas fisik.', 'Aktivitas mendadak, kurang pemanasan', 'Pemanasan dan pendinginan', 'Kompres es, istirahat', 'Nyeri hebat atau pembengkakan', 'ringan'),
(19, 'Skoliosis', 'Kelengkungan tulang belakang ke samping yang tidak normal.', 'Idiopatik, bawaan', 'Deteksi dini, postur baik', 'Fisioterapi, kontrol rutin', 'Kurva memburuk atau nyeri bertambah', 'ringan');

-- Mapping penyakit -> bagian tubuh (id mengikuti body-parts.ts)
INSERT INTO disease_body_part (disease_id, body_part_id) VALUES
-- Asma & Bronkitis: dada
(1, 0), (1, 20),
(2, 0), (2, 20),
-- Sinusitis, Migrain, Sakit Kepala Tegang: kepala
(3, 19), (3, 40),
(4, 19), (4, 40),
(5, 19), (5, 40),
-- Nyeri leher
(6, 10), (6, 30),
-- Frozen shoulder: bahu & pundak (depan + belakang)
(7, 2), (7, 22), (7, 12), (7, 32), (7, 42), (7, 58), (7, 48), (7, 64),
-- Tendinitis siku
(8, 3), (8, 23), (8, 43), (8, 59),
-- CTS: pergelangan tangan & tangan
(9, 6), (9, 26), (9, 45), (9, 61), (9, 18), (9, 38), (9, 50), (9, 66),
-- Gastritis & apendisitis: perut
(10, 9), (10, 29),
(12, 9), (12, 29), (12, 4), (12, 24),
-- GERD: perut + dada
(11, 9), (11, 29), (11, 0), (11, 20),
-- Nyeri punggung bawah & HNP: pinggang, punggung, tulang belakang, paha belakang
(13, 55), (13, 71), (13, 39), (13, 41), (13, 57),
(14, 39), (14, 55), (14, 71), (14, 46), (14, 62),
-- Osteoartritis lutut & asam urat
(15, 7), (15, 27), (15, 56), (15, 72),
(16, 14), (16, 34), (16, 54), (16, 70), (16, 13), (16, 33), (16, 7), (16, 27),
-- Keseleo pergelangan kaki
(17, 13), (17, 33), (17, 49), (17, 65),
-- Cedera betis & tulang kering
(18, 47), (18, 63), (18, 8), (18, 28),
-- Skoliosis
(19, 39);

-- Mapping penyakit -> sistem tubuh
INSERT INTO disease_body_system (disease_id, body_system_id) VALUES
(1, 1), (2, 1), (3, 1),
(4, 3), (5, 3),
(6, 4), (7, 4), (8, 4), (9, 3),
(10, 2), (11, 2), (12, 2),
(13, 4), (14, 4), (15, 4), (16, 4), (17, 4), (18, 4), (19, 4);

-- Lanjutkan sequence setelah insert id eksplisit
SELECT setval(pg_get_serial_sequence('body_parts', 'id'), (SELECT MAX(id) FROM body_parts));
SELECT setval(pg_get_serial_sequence('diseases', 'id'), (SELECT MAX(id) FROM diseases));
SELECT setval(pg_get_serial_sequence('body_systems', 'id'), (SELECT MAX(id) FROM body_systems));
