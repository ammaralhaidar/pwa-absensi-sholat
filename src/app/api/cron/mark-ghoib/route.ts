import { NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Vercel Cron akan mengirimkan Authorization Header khusus
// Jika kita mendefinisikan CRON_SECRET di .env.local, Vercel akan mencocokkannya
// Untuk keamanan, kita validasi ini. Jika di environment lokal (development), kita bypass sementara.

export async function GET(req: Request) {
  try {
    // 1. Otorisasi Sederhana (Khusus Vercel Cron)
    const authHeader = req.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' && 
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new Response('Unauthorized', { status: 401 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // 2. Ambil waktu saat ini (konversi ke WIB / UTC+7)
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayDate = wibNow.toISOString().split('T')[0];
    const nowTime = `${wibNow.getUTCHours().toString().padStart(2, '0')}:${wibNow.getUTCMinutes().toString().padStart(2, '0')}:${wibNow.getUTCSeconds().toString().padStart(2, '0')}`;

    // 3. Ambil semua sesi sholat yang jam berakhirnya SUDAH LEWAT
    const { data: sesiList, error: sesiError } = await supabase
      .from('sesi_sholat')
      .select('id, nama_sesi, jam_berakhir')
      .lte('jam_berakhir', nowTime);

    if (sesiError) throw sesiError;
    if (!sesiList || sesiList.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada sesi sholat yang baru saja berakhir." });
    }

    // 4. Ambil semua santri aktif
    const { data: santriList, error: santriError } = await supabase
      .from('data_santri')
      .select('id')
      .eq('status_aktif', true);

    if (santriError) throw santriError;
    if (!santriList || santriList.length === 0) {
      return NextResponse.json({ success: true, message: "Tidak ada data santri aktif." });
    }

    let totalGhoibDitambahkan = 0;

    // 5. Untuk setiap sesi yang sudah lewat, cek absensi santri hari ini
    for (const sesi of sesiList) {
      // Ambil daftar santri_id yang SUDAH absen di sesi ini hari ini (apapun statusnya)
      const { data: absenHariIni, error: absenError } = await supabase
        .from('log_absensi')
        .select('santri_id')
        .eq('sesi_id', sesi.id)
        .eq('tanggal', todayDate);

      if (absenError) throw absenError;

      // Kumpulkan array ID santri yang sudah absen
      const idSudahAbsen = absenHariIni ? absenHariIni.map(a => a.santri_id) : [];

      // Saring santri yang BELUM absen
      const santriBelumAbsen = santriList.filter(s => !idSudahAbsen.includes(s.id));

      if (santriBelumAbsen.length > 0) {
        // Siapkan payload untuk bulk insert
        const ghoibPayload = santriBelumAbsen.map(s => ({
          santri_id: s.id,
          sesi_id: sesi.id,
          tanggal: todayDate,
          status: 'Ghoib'
        }));

        // Insert santri yang tidak hadir sebagai Ghoib
        const { error: insertError } = await supabase
          .from('log_absensi')
          .insert(ghoibPayload);

        if (insertError) {
          console.error(`Gagal menandai ghoib pada sesi ${sesi.nama_sesi}:`, insertError);
        } else {
          totalGhoibDitambahkan += ghoibPayload.length;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Proses sinkronisasi otomatis selesai", 
      ditambahkan: totalGhoibDitambahkan 
    });

  } catch (error: any) {
    console.error("Cron API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Kesalahan server" }, { status: 500 });
  }
}
