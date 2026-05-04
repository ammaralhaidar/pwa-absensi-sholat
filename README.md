# 🕌 Absensi Sholat Al-Hamra

> Aplikasi PWA (Progressive Web App) untuk otomatisasi presensi sholat santri di lingkungan pesantren, dilengkapi pemindai barcode 1D, dashboard analitik, dan sistem manajemen kehadiran terpadu.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## 📋 Deskripsi

**Absensi Sholat Al-Hamra** adalah sistem presensi digital berbasis web yang dirancang khusus untuk pesantren. Aplikasi ini memungkinkan petugas/pengurus untuk mencatat kehadiran santri pada setiap waktu sholat wajib (Subuh, Dzuhur, Ashar, Maghrib, Isya) menggunakan pemindai barcode 1D melalui kamera perangkat mobile.

Aplikasi berjalan sebagai PWA — dapat dipasang (install) di beranda smartphone layaknya aplikasi native, bekerja secara responsif di berbagai ukuran layar, dan membutuhkan koneksi internet untuk sinkronisasi data ke database cloud (Supabase).

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📷 **Scanner Barcode 1D** | Pemindaian *continuous* menggunakan kamera perangkat. Mendukung seluruh area lensa (bukan hanya kotak tengah). Dilengkapi mekanisme *anti-spam* (jeda 2.5 detik) dan *anti-double entry*. |
| ⏳ **Countdown & Override** | Menampilkan hitung mundur menuju sesi sholat berikutnya. Tersedia tombol **"Buka Absen Lebih Awal"** untuk memulai absensi di luar jadwal (misal: Sholat Jumat, kajian). |
| 📊 **Dashboard Analitik** | Ringkasan statistik kehadiran: total santri aktif, rata-rata kehadiran, grafik bar per sesi sholat, daftar santri paling rajin / sering telat / sering ghoib. Filter berdasarkan hari atau bulan. |
| 📖 **Riwayat Pivot Table** | Tabel riwayat kehadiran seluruh santri per tanggal, dengan kolom dinamis berdasarkan sesi sholat. Tersedia filter kelas dan unduh rekapan ke **Excel (.xlsx)**. |
| 🩺 **Manajemen Udzur** | Formulir untuk mencatat izin/sakit santri. Dapat menimpa status "Ghoib" menjadi "Udzur" meskipun jam sholat sudah berlalu. |
| 🤖 **Otomatisasi Ghoib** | Cron Job API (`/api/cron/mark-ghoib`) yang secara otomatis menandai santri sebagai "Ghoib" jika tidak melakukan scan hingga batas waktu berakhir. |
| 🔐 **Autentikasi & Proteksi Rute** | Login pengurus via Supabase Auth. Seluruh halaman dilindungi — hanya pengguna yang sudah login yang bisa mengakses aplikasi. |
| ⚙️ **Pengaturan Jadwal** | Halaman konfigurasi untuk mengatur jam buka absen, batas terlambat, dan batas akhir (ghoib) untuk setiap sesi sholat secara mandiri. |
| 📱 **PWA & Mobile-First** | Dapat dipasang di beranda smartphone. Desain responsif dengan navigasi bawah untuk mobile dan sidebar untuk desktop. |

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Bahasa | [TypeScript 5](https://www.typescriptlang.org/) |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Barcode Scanner | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| PWA | [@ducanh2912/next-pwa](https://github.com/nicholaschangCS/next-pwa) |
| Excel Export | [SheetJS (xlsx)](https://sheetjs.com/) |

---

## 📦 Prasyarat

Sebelum memulai, pastikan Anda sudah memiliki:

- **Node.js** versi 18 atau lebih baru — [Download](https://nodejs.org/)
- **npm** (sudah termasuk dalam instalasi Node.js)
- **Akun Supabase** — [Daftar Gratis](https://supabase.com/)
- **Git** — [Download](https://git-scm.com/)

---

## 🚀 Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/<username-anda>/aplikasi-alhamra.git
cd aplikasi-alhamra
```

### 2. Install Dependensi

```bash
npm install
```

### 3. Setup Database Supabase

1. Buat proyek baru di [Supabase Dashboard](https://app.supabase.com/).
2. Masuk ke menu **SQL Editor** → **New Query**.
3. Salin seluruh isi file [`database_schema.sql`](./database_schema.sql) dan jalankan (*Run*).
4. Ini akan membuat tiga tabel utama:
   - `data_santri` — Data master santri (NIS, nama, kelas)
   - `sesi_sholat` — Jadwal 5 waktu sholat (jam mulai, batas terlambat, jam berakhir)
   - `log_absensi` — Log transaksional kehadiran harian

### 4. Konfigurasi Environment Variables

Buat file `.env.local` di root proyek (atau salin dari contoh):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Nilai-nilai ini dapat ditemukan di Supabase Dashboard → **Project Settings** → **API**.

### 5. Buat Akun Login Pengurus

1. Di Supabase Dashboard, masuk ke menu **Authentication** → **Users**.
2. Klik **Add User** → **Create New User**.
3. Masukkan email dan password yang akan digunakan pengurus untuk login ke aplikasi.

### 6. Import Data Santri

1. Siapkan file CSV dengan format kolom: `nis`, `nama_santri`, `kelas`.
2. Di Supabase Dashboard, masuk ke **Table Editor** → tabel `data_santri`.
3. Klik tombol **Import Data** → pilih file CSV Anda.

---

## 💻 Menjalankan Aplikasi

### Mode Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

> **Catatan:** PWA (Service Worker) sengaja dinonaktifkan di mode development agar tidak meng-*cache* file yang sedang diedit. Pesan `PWA support is disabled` di terminal adalah perilaku yang normal.

### Mode Production (Lokal)

```bash
npm run build
npm start
```

Buka [http://localhost:3000](http://localhost:3000) — PWA dan Service Worker akan aktif di mode ini.

---

## 🌐 Deployment ke Vercel

Agar fitur kamera (scanner) berfungsi di perangkat mobile, aplikasi **wajib** diakses melalui HTTPS. Cara termudah adalah deploy ke Vercel:

1. Push kode ke GitHub repository Anda.
2. Masuk ke [Vercel](https://vercel.com/) dengan akun GitHub.
3. Klik **Add New Project** → Import repository ini.
4. Pada bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CRON_SECRET` (password acak untuk mengamankan endpoint cron)
5. Klik **Deploy**.
6. Setelah berhasil, konfigurasi **Cron Job** di Vercel untuk memanggil `/api/cron/mark-ghoib` secara berkala (disarankan setiap jam).

### File `vercel.json` (opsional)

Jika Anda ingin mengatur cron job otomatis:

```json
{
  "crons": [
    {
      "path": "/api/cron/mark-ghoib?secret=<CRON_SECRET_ANDA>",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 📁 Struktur Proyek

```
aplikasi-alhamra/
├── public/
│   ├── icons/              # Ikon PWA (192x192, 512x512)
│   ├── manifest.json       # Manifest PWA
│   └── sw.js               # Service Worker (auto-generated)
├── src/
│   ├── app/
│   │   ├── page.tsx            # Halaman utama (Scanner + Countdown)
│   │   ├── login/page.tsx      # Halaman login pengurus
│   │   ├── dashboard/page.tsx  # Dashboard analitik
│   │   ├── riwayat/page.tsx    # Riwayat & pivot table kehadiran
│   │   ├── udzur/page.tsx      # Form pencatatan udzur
│   │   ├── settings/page.tsx   # Pengaturan jadwal sholat
│   │   └── api/
│   │       ├── scan/route.ts       # API pemrosesan scan barcode
│   │       ├── udzur/route.ts      # API pencatatan udzur
│   │       ├── test-db/route.ts    # API tes koneksi database
│   │       └── cron/
│   │           └── mark-ghoib/route.ts  # Cron job otomatisasi ghoib
│   ├── components/
│   │   ├── layout/NavigationWrapper.tsx  # Sidebar + Bottom Nav
│   │   ├── scanner/BarcodeScanner.tsx   # Komponen pemindai barcode
│   │   └── ui/                          # Komponen shadcn/ui
│   └── utils/
│       └── supabase/
│           ├── client.ts       # Supabase client (browser)
│           ├── server.ts       # Supabase client (server)
│           └── middleware.ts   # Logika proteksi rute
├── database_schema.sql     # SQL schema untuk setup database
├── next.config.ts          # Konfigurasi Next.js + PWA
└── package.json
```

---

## 🔐 Keamanan

- Seluruh rute aplikasi dilindungi oleh middleware autentikasi. Pengguna yang belum login akan dialihkan ke `/login`.
- Endpoint API cron (`/api/cron/mark-ghoib`) dilindungi oleh parameter `secret` yang harus cocok dengan `CRON_SECRET` di environment variable.
- Kredensial database (Supabase URL & Anon Key) disimpan di environment variable dan tidak di-commit ke repository.

---

## 📄 Lisensi

Proyek ini dikembangkan untuk kebutuhan internal Pesantren Al-Hamra.

---

<p align="center">
  Dibuat dengan ❤️ untuk Pesantren Al-Hamra
</p>
