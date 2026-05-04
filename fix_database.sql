-- 1. Matikan RLS (Row Level Security) agar akses Anon Key dari aplikasi kita bisa langsung membaca & menulis data
-- Ini sangat krusial jika Anda membuat tabel dari Dashboard yang kadang menyalakan RLS otomatis.
ALTER TABLE public.data_santri DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesi_sholat DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_absensi DISABLE ROW LEVEL SECURITY;

-- 2. Pastikan tabel sesi_sholat tidak kosong (Jadwal Default)
-- Jika tabel sudah ada isinya, abaikan ini (atau hapus dulu isinya agar bersih).
-- Kita insert jadwal default untuk testing jika belum ada:
INSERT INTO public.sesi_sholat (nama_sesi, jam_mulai, jam_batas_hadir, jam_berakhir)
VALUES
  ('Subuh', '04:00:00', '04:30:00', '05:00:00'),
  ('Dzuhur', '11:45:00', '12:15:00', '12:45:00'),
  ('Ashar', '15:00:00', '15:30:00', '16:00:00'),
  ('Maghrib', '17:45:00', '18:15:00', '18:45:00'),
  ('Isya', '19:00:00', '19:30:00', '20:00:00')
ON CONFLICT (nama_sesi) DO NOTHING;

-- 3. Pastikan Santri Dummy tersedia (Pastikan NIS sesuai dengan barcode yang di-scan)
INSERT INTO public.data_santri (nis, nama_santri, kelas)
VALUES
  ('12345', 'Santri Dummy 1', '10 A'),
  ('123456', 'Santri Dummy 2', '10 B'),
  ('1234567', 'Santri Dummy 3', '11 A')
ON CONFLICT (nis) DO NOTHING;
