import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { nis } = body;

    if (!nis) {
      return NextResponse.json({ success: false, message: "NIS tidak boleh kosong" }, { status: 400 });
    }
    
    nis = nis.trim();

    const supabase = await createClient();

    // 1. Cari Santri berdasarkan NIS
    const { data: santri, error: santriError } = await supabase
      .from('data_santri')
      .select('id, nama_santri, kelas')
      .eq('nis', nis)
      .single();

    if (santriError || !santri) {
      return NextResponse.json({ success: false, message: "Santri tidak ditemukan" }, { status: 404 });
    }

    // 2. Tentukan Sesi Sholat yang sedang aktif secara dinamis
    // Mendapatkan waktu saat ini dalam format HH:mm:ss untuk perbandingan konsisten
    const now = new Date();
    const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const { data: allSesi, error: sesiError } = await supabase
      .from('sesi_sholat')
      .select('*')
      .order('jam_mulai', { ascending: true });

    let activeSesi = null;
    
    if (allSesi && !sesiError) {
      // Cari sesi yang waktunya sedang berlangsung (jam_mulai <= now <= jam_berakhir)
      activeSesi = allSesi.find(s => nowTime >= s.jam_mulai && nowTime <= s.jam_berakhir);
      
      // Fallback untuk testing: Jika diluar semua sesi, jadikan sesi pertama sebagai yang aktif
      // Hapus bagian fallback ini di produksi jika ingin membatasi scan hanya saat jam sholat
      if (!activeSesi && allSesi.length > 0) {
        activeSesi = allSesi[0];
      }
    }

    if (!activeSesi) {
      return NextResponse.json({ success: false, message: "Tidak ada data sesi sholat di database." }, { status: 400 });
    }

    // 3. Tentukan Status (Hadir vs Terlambat)
    // Asumsi: jika sekarang < jam_batas_hadir -> 'Hadir', else 'Terlambat'
    const status = nowTime <= activeSesi.jam_batas_hadir ? 'Hadir' : 'Terlambat';

    // 4. Cek apakah sudah absen hari ini di sesi ini
    const { data: existingLog } = await supabase
      .from('log_absensi')
      .select('id')
      .eq('santri_id', santri.id)
      .eq('sesi_id', activeSesi.id)
      .eq('tanggal', new Date().toISOString().split('T')[0])
      .single();

    if (existingLog) {
      return NextResponse.json({ success: false, message: "Sudah absen pada sesi ini" }, { status: 400 });
    }

    // 5. Insert ke log_absensi
    const { data: insertData, error: insertError } = await supabase
      .from('log_absensi')
      .insert({
        santri_id: santri.id,
        sesi_id: activeSesi.id,
        tanggal: new Date().toISOString().split('T')[0], // YYYY-MM-DD (UTC base)
        status: status,
      })
      .select();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ success: false, message: "Gagal menyimpan data absensi" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Absen berhasil dicatat",
      data: {
        nama: santri.nama_santri,
        kelas: santri.kelas,
        sesi: activeSesi.nama_sesi,
        status: status
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: "Terjadi kesalahan internal server.",
      error: error.message 
    }, { status: 500 });
  }
}
