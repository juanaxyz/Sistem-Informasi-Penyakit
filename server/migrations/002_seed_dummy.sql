INSERT INTO body_parts (nama, kode_svg, side, gender, deskripsi) VALUES
('Kepala', 'head', 'depan', 'pria', 'Termasuk mata, telinga, hidung, mulut'),
('Dada', 'chest', 'depan', 'pria', 'Rongga toraks: jantung, paru-paru'),
('Perut', 'abdomen', 'depan', 'pria', 'Lambung, usus, hati, ginjal');

INSERT INTO body_systems (nama, deskripsi) VALUES
('Sistem Pernapasan', 'Organ dan saluran yang berperan dalam pernapasan'),
('Sistem Pencernaan', 'Organ yang mencerna dan menyerap makanan');

INSERT INTO diseases (nama, deskripsi, penyebab, pencegahan, pengobatan, kapan_ke_dokter, tingkat_urgensi) VALUES
('Migrain', 'Sakit kepala berdenyut intensif di satu sisi.', 'Genetik, stres, kurang tidur', 'Istirahat cukup, hindari pemicu', 'Paracetamol, istirahat di tempat gelap', 'Jika berlangsung lebih dari 72 jam', 'sedang');

INSERT INTO disease_body_part (disease_id, body_part_id) VALUES (1, 1);
INSERT INTO disease_body_system (disease_id, body_system_id) VALUES (1, 1);