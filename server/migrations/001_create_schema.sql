CREATE TABLE diseases (
    id BIGSERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL UNIQUE,
    deskripsi TEXT NOT NULL,
    penyebab TEXT,
    pencegahan TEXT,
    pengobatan TEXT,
    kapan_ke_dokter TEXT,
    tingkat_urgensi VARCHAR(20) DEFAULT 'sedang' CHECK (tingkat_urgensi IN ('ringan', 'sedang', 'serius')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE body_parts (
    id BIGSERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    kode_svg VARCHAR(100) NOT NULL,
    side VARCHAR(20) NOT NULL CHECK (side IN ('depan', 'belakang')),
    gender VARCHAR(20) NOT NULL DEFAULT 'netral' CHECK (gender IN ('pria', 'wanita', 'netral')),
    deskripsi VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kode_svg, side, gender)
);

CREATE TABLE body_systems (
    id BIGSERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL UNIQUE,
    deskripsi VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disease_body_part (
    id BIGSERIAL PRIMARY KEY,
    disease_id BIGINT NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    body_part_id BIGINT NOT NULL REFERENCES body_parts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(disease_id, body_part_id)
);

CREATE TABLE disease_body_system (
    id BIGSERIAL PRIMARY KEY,
    disease_id BIGINT NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    body_system_id BIGINT NOT NULL REFERENCES body_systems(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(disease_id, body_system_id)
);

CREATE INDEX idx_diseases_nama ON diseases(nama);
CREATE INDEX idx_body_parts_side_gender ON body_parts(side, gender);
CREATE INDEX idx_dbp_disease_id ON disease_body_part(disease_id);
CREATE INDEX idx_dbp_body_part_id ON disease_body_part(body_part_id);
CREATE INDEX idx_dbs_disease_id ON disease_body_system(disease_id);
CREATE INDEX idx_dbs_system_id ON disease_body_system(body_system_id);

ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_body_part ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_body_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_diseases" ON diseases FOR SELECT USING (true);
CREATE POLICY "public_read_body_parts" ON body_parts FOR SELECT USING (true);
CREATE POLICY "public_read_body_systems" ON body_systems FOR SELECT USING (true);
CREATE POLICY "public_read_dbp" ON disease_body_part FOR SELECT USING (true);
CREATE POLICY "public_read_dbs" ON disease_body_system FOR SELECT USING (true);