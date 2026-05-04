Berikut adalah Dokumen Spesifikasi Teknis (Technical Requirements Document) yang merangkum seluruh hasil *brainstorming* kita. Dokumen ini disusun secara terstruktur agar siap dieksekusi langsung oleh *developer* maupun AI lain untuk memulai proses *coding*.

---

# DOKUMEN SPESIFIKASI TEKNIS (TRD)
**Proyek:** Aplikasi Absensi Sholat Santri (PWA Barcode Scanner)
**Fase:** Tahap 1 (Fokus Pemindaian Sholat Santri)

## 1. Ringkasan Proyek
Membangun sebuah aplikasi absensi berbasis *Progressive Web App* (PWA) untuk mencatat kehadiran sholat ±150 santri secara *real-time*. Aplikasi dirancang khusus untuk kecepatan pemrosesan data (*high throughput*) menggunakan kamera gawai (HP/Tablet) untuk memindai *barcode* fisik (1D) pada kartu pelajar santri guna mencegah antrean panjang di gerbang masjid. Sistem ini dirancang sebagai fondasi (*blueprint*) yang *database*-nya 100% kompatibel untuk kelak diintegrasikan atau dimigrasikan ke *environment* Odoo 16.

## 2. Arsitektur Teknologi (Tech Stack)
*   **Frontend:** Next.js (React) + Tailwind CSS.
*   **Akses Hardware (Kamera):** *Library* `html5-qrcode` atau `@zxing/browser` (dioptimasi untuk pemindaian *barcode* 1D dan resolusi kamera tinggi).
*   **Backend & Database:** Supabase (PostgreSQL) – Dipilih karena DNA *database* yang identik dengan Odoo.
*   **Otomatisasi:** Vercel Cron Jobs atau Supabase `pg_cron`.
*   **Deployment:** Vercel (mendukung HTTPS bawaan untuk akses *WebRTC* kamera).
*   **Format Aplikasi:** PWA (*Progressive Web App*) agar dapat diinstal di *homescreen* gawai petugas.

## 3. Logika Bisnis & Status Kehadiran
Sistem menggunakan 4 status kehadiran dengan *trigger* (pemicu) yang berbeda:

*   **Hadir (Otomatis via Scan):** Santri memindai *barcode* sebelum batas waktu sholat yang ditentukan.
*   **Terlambat (Otomatis via Scan):** Santri memindai *barcode* melewati batas waktu sholat yang ditentukan.
*   **Udzur (Manual via Petugas):** Santri berhalangan hadir (sakit/izin). Petugas menginput status ini melalui antarmuka pencarian nama secara manual beserta keterangannya.
*   **Ghoib (Otomatis via Cron Job):** Santri tidak melakukan *scan* dan tidak diinput "Udzur" hingga batas waktu sholat berakhir. Sistem otomatis menembakkan skrip ke *database* untuk memberikan status "Ghoib" pada sisa santri yang tidak memiliki riwayat *log* pada sesi sholat tersebut.

## 4. Alur Pengguna (User Flow) Utama
Aplikasi mengutamakan **Continuous Scanning Mode** untuk mencegah *bottleneck* antrean.
1.  Petugas membuka aplikasi dan memilih sesi sholat (misal: Subuh).
2.  Kamera menyala secara permanen (*continuous*).
3.  Santri A menempelkan kartu $\rightarrow$ Kamera membaca 1D *barcode* $\rightarrow$ Aplikasi mengirim ID ke Supabase di latar belakang $\rightarrow$ Terdengar bunyi *beep* dan layar berkedip hijau.
4.  Tanpa perlu menekan layar, Santri B langsung menempelkan kartu (kembali ke poin 3).

## 5. Struktur Database (Schema PostgreSQL)
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