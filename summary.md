Berikut adalah Dokumen Spesifikasi Teknis (Technical Requirements Document) yang merangkum seluruh hasil *brainstorming* kita. Dokumen ini disusun secara terstruktur agar siap dieksekusi langsung oleh *developer* maupun AI lain untuk memulai proses *coding*.

---

# DOKUMEN SPESIFIKASI TEKNIS (TRD)
**Proyek:** Aplikasi Absensi Sholat Santri & Absensi Musyrif (PWA Barcode Scanner)
**Fase:** Tahap 1 (Fokus Pemindaian Sholat Santri & Pendataan Absensi Musyrif)

## 1. Ringkasan Proyek
Membangun sebuah aplikasi absensi berbasis *Progressive Web App (PWA)* untuk kebutuhan pesantren. Aplikasi ini memiliki 2 modul utama dalam 1 website, yaitu:

1. **Absensi Sholat Santri**
   - Digunakan oleh Pengurus untuk mencatat kehadiran sholat santri.
   - Sistem menggunakan kamera HP/Tablet untuk memindai barcode 1D pada kartu pelajar santri.
   - Fokus utama modul ini adalah kecepatan pemindaian agar proses absensi tidak menimbulkan antrean panjang.

2. **Absensi Musyrif**
   - Digunakan oleh Musyrif untuk mencatat aktivitas harian dan pembinaan santri.
   - Sistem menggunakan form input, checklist aktivitas, upload foto bukti, dashboard monitoring, dan log absensi.
   - Modul ini berfungsi sebagai alat monitoring kedisiplinan, keterlambatan, dan dokumentasi aktivitas musyrif.

Aplikasi tetap dirancang agar struktur database menggunakan format yang rapi dan kompatibel untuk kemungkinan integrasi atau migrasi ke environment lain seperti Odoo 16 di masa depan.

## 2. Role Pengguna 
Pengurus adalah user yang mengakses modul **Absensi Sholat Santri**.

Fitur utama Pengurus:

- Melakukan absensi sholat santri menggunakan barcode scanner.
- Memilih sesi sholat.
- Melakukan input manual untuk status Udzur.
- Melihat data kehadiran santri.
- Mengelola status Hadir, Terlambat, Udzur, dan Ghoib.

### 2.2 Musyrif

Musyrif adalah user yang mengakses modul **Absensi Musyrif**.

Fitur utama Musyrif:

- Membuat absensi aktivitas melalui menu **Buat Absen**.
- Memilih aktivitas.
- Mengisi checklist aktivitas.
- Mengunggah foto bukti kegiatan.
- Mengisi keterangan terlambat jika diperlukan.
- Melihat dashboard status harian, ringkasan harian, statistik keterlambatan, dan live monitoring foto.
- Melihat log absensi dan detail aktivitas yang sudah dibuat.

## 3. Arsitektur Teknologi (Tech Stack)
*   **Frontend:** Next.js (React) + Tailwind CSS.
*   **Akses Hardware (Kamera):** *Library* `html5-qrcode` atau `@zxing/browser` (dioptimasi untuk pemindaian *barcode* 1D dan resolusi kamera tinggi).
*   **Backend & Database:** Supabase (PostgreSQL) – Dipilih karena DNA *database* yang identik dengan Odoo.
*   **Otomatisasi:** Vercel Cron Jobs atau Supabase `pg_cron`.
*   **Deployment:** Vercel (mendukung HTTPS bawaan untuk akses *WebRTC* kamera).
*   **Format Aplikasi:** PWA (*Progressive Web App*) agar dapat diinstal di *homescreen* gawai petugas.

## 4. Modul 1 - Absensi Sholat Santri
### 4.1 Tujuan Modul

Modul Absensi Sholat Santri digunakan untuk mencatat kehadiran sholat santri secara real-time menggunakan pemindaian barcode 1D pada kartu pelajar santri.

Modul ini dirancang untuk menangani ±150 santri dengan proses scan cepat dan berkelanjutan.

### 4.2 Status Kehadiran Santri

Sistem menggunakan 4 status kehadiran:

1. **Hadir**
   - Diberikan otomatis ketika santri melakukan scan sebelum batas waktu sholat.

2. **Terlambat**
   - Diberikan otomatis ketika santri melakukan scan melewati batas waktu sholat.

3. **Udzur**
   - Diberikan secara manual oleh Pengurus jika santri sakit, izin, atau memiliki alasan yang valid.

4. **Ghoib**
   - Diberikan otomatis oleh sistem jika santri tidak melakukan scan dan tidak diinput sebagai Udzur sampai batas waktu sesi sholat berakhir.

### 4.3 Alur Pengguna Modul Absensi Sholat Santri

1. Pengurus membuka aplikasi.
2. Pengurus memilih sesi sholat, misalnya Subuh, Dzuhur, Ashar, Maghrib, atau Isya.
3. Kamera menyala dalam mode continuous scanning.
4. Santri A menempelkan kartu $\rightarrow$ Kamera membaca 1D *barcode* $\rightarrow$ Aplikasi mengirim ID ke Supabase di latar belakang $\rightarrow$ Terdengar bunyi *beep* dan layar berkedip hijau.
5. Tanpa perlu menekan layar, Santri B langsung menempelkan kartu (kembali ke poin 4).

## 5. Modul 2 - Absensi Musyrif
### 5.1 Tujuan Modul

Modul Absensi Musyrif digunakan untuk mencatat aktivitas harian musyrif, termasuk waktu pelaksanaan, jenis aktivitas, checklist kegiatan, foto bukti, dan keterangan terlambat.

Modul ini bertujuan untuk membantu monitoring kegiatan musyrif secara harian, memastikan aktivitas tercatat, serta menyediakan bukti visual melalui foto kegiatan.
### 5.2 Navigasi Modul Musyrif

Berdasarkan tampilan frontend, modul Musyrif memiliki bottom navigation berikut:

1. **Buat Absen**
   - Halaman untuk membuat absensi aktivitas baru.

2. **Dashboard**
   - Halaman untuk memantau status hari ini, ringkasan harian, statistik keterlambatan, dan live monitoring foto.

3. **Log Absen**
   - Halaman untuk melihat daftar riwayat absensi musyrif.

## 6. Struktur Database (Schema PostgreSQL)
Penamaan kolom menggunakan *snake_case* agar mempermudah migrasi ke *backend* Odoo di masa depan.

**Tabel 1: `data_santri`** (Master Data)
*   `id` (UUID, Primary Key)
*   `nis` (String/Varchar, Unique) -> *Ini adalah nilai yang direpresentasikan oleh Barcode 1D.*
*   `nama_santri` (String)
*   `kelas` (String)
*   `status_aktif` (Boolean, Default: True)

**Tabel 2: `sesi_sholat`** (Master Waktu)
*   `id` (UUID, Primary Key)
*   `nama_sesi` (String) -> *Contoh: Subuh, Dzuhur, Ashar.*
*   `jam_mulai` (Time)
*   `jam_batas_hadir` (Time) -> *Batas penentuan Hadir vs Terlambat.*
*   `jam_berakhir` (Time) -> *Trigger untuk Cron Job "Ghoib".*

**Tabel 3: `log_absensi`** (Tabel Transaksional)
*   `id` (UUID, Primary Key)
*   `santri_id` (UUID, Foreign Key ke `data_santri.id`)
*   `sesi_id` (UUID, Foreign Key ke `sesi_sholat.id`)
*   `tanggal` (Date)
*   `waktu_scan` (Timestamp)
*   `status` (Enum: 'Hadir', 'Terlambat', 'Udzur', 'Ghoib')
*   `keterangan` (Text, Nullable) -> *Diisi jika status Udzur.*

**Tabel 4: `musyrif`** (Tabel Data Musyrif)
*   `id` (UUID, Primary Key)
*   `nama` (String)
*   `email` (String, Unique)
*   `password` (String, MD5 Hash)
*   `status_subuh` (Boolean, Default: False)
*   `status_pagi` (Boolean, Default: False)
*   `status_ashar` (Boolean, Default: False)
*   `status_maghrib` (Boolean, Default: False)
*   `status_tarbiyah` (Boolean, Default: False)

## 6. Rencana Eksekusi (Development Phases)

*   **Fase 1: Setup Supabase & Skema Data**
    Membuat *project* di Supabase, mengeksekusi SQL untuk pembuatan 3 tabel di atas, dan melakukan *import* data 150 santri dari format CSV ke tabel `data_santri`.
*   **Fase 2: Inisialisasi PWA Next.js**
    Membuat *repository*, mengatur *routing*, mendesain UI/UX dasar dengan Tailwind CSS, dan mengonfigurasi *file* `manifest.json` agar terbaca sebagai PWA.
*   **Fase 3: Pengembangan Mesin Scanner (Core)**
    Mengintegrasikan `html5-qrcode`, mengaktifkan mode *continuous*, menyetel parameter kamera ke kamera belakang resolusi tinggi (`environment`), dan memberikan *feedback* visual/audio.
*   **Fase 4: Antarmuka Input Manual (Udzur)**
    Membangun *form* pencarian santri (dilengkapi *debounce/search filter* ringan) bagi petugas untuk menginput status "Udzur".
*   **Fase 5: Otomatisasi Ghoib (Cron Job)**
    Menulis *API route* di Next.js untuk mengecek selisih data antara `data_santri` dan `log_absensi` hari ini, lalu mengonfigurasi jadwal pemicunya di Vercel Cron.
*   **Fase 6: Testing & Deployment**
    Uji coba kecepatan *scan* 1D *barcode* di kondisi pencahayaan rendah (simulasi Subuh/Maghrib), optimasi latensi, dan *deploy* ke produksi via Vercel.

---