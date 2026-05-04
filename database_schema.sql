-- Skema Database untuk Aplikasi Absensi Sholat Santri
-- Kompatibel dengan PostgreSQL (Supabase) dan Odoo 16

-- 1. Create ENUM type untuk status absensi
CREATE TYPE absensi_status AS ENUM ('Hadir', 'Terlambat', 'Udzur', 'Ghoib');

-- 2. Tabel `data_santri` (Master Data Santri)
CREATE TABLE data_santri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis VARCHAR(50) UNIQUE NOT NULL, -- Diisi dari nilai Barcode 1D
    nama_santri VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    status_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel `sesi_sholat` (Master Sesi Waktu)
CREATE TABLE sesi_sholat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sesi VARCHAR(50) NOT NULL UNIQUE, -- 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'
    jam_mulai TIME NOT NULL,
    jam_batas_hadir TIME NOT NULL,
    jam_berakhir TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel `log_absensi` (Tabel Transaksional / Log Pindaian)
CREATE TABLE log_absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    santri_id UUID REFERENCES data_santri(id) ON DELETE CASCADE NOT NULL,
    sesi_id UUID REFERENCES sesi_sholat(id) ON DELETE RESTRICT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_scan TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status absensi_status NOT NULL,
    keterangan TEXT, -- Diisi jika status = Udzur (e.g. Sakit, Izin)
    
    -- Constraint: Seorang santri hanya bisa absen 1 kali pada sesi dan tanggal yang sama
    UNIQUE(santri_id, sesi_id, tanggal)
);

-- 5. Indexing untuk optimasi kueri (Scanner butuh respon sangat cepat)
CREATE INDEX idx_data_santri_nis ON data_santri(nis);
CREATE INDEX idx_log_absensi_tanggal_sesi ON log_absensi(tanggal, sesi_id);
CREATE INDEX idx_log_absensi_santri_tanggal ON log_absensi(santri_id, tanggal);

-- 6. Insert Data Dummy untuk Sesi Sholat (Bisa diubah via UI Konfigurasi nanti)
INSERT INTO sesi_sholat (nama_sesi, jam_mulai, jam_batas_hadir, jam_berakhir) VALUES
('Subuh', '04:00:00', '04:30:00', '05:00:00'),
('Dzuhur', '11:45:00', '12:15:00', '12:45:00'),
('Ashar', '15:00:00', '15:30:00', '16:00:00'),
('Maghrib', '17:45:00', '18:15:00', '18:45:00'),
('Isya', '19:00:00', '19:30:00', '20:00:00');
